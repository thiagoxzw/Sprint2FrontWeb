require("dotenv").config();

const path = require("path");
const fs = require("fs");
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { initDb } = require("./db");
const { authMiddleware } = require("./middleware/auth");
const { imageUpload, audioUpload } = require("./middleware/upload");
const { uploadsDir, uploadUrlToFilePath } = require("./runtime-paths");

const app = express();
const PORT = process.env.PORT || 3000;

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function normalizeEntry(row) {
  return {
    id: row.id,
    subjectId: row.subject_id,
    title: row.title,
    note: row.note,
    imagePath: row.image_path,
    audioPath: row.audio_path,
    ocrText: row.ocr_text,
    ai: row.ai_json ? JSON.parse(row.ai_json) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function main() {
  const db = await initDb();

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static(uploadsDir));
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, date: new Date().toISOString() });
  });

  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nome, email e senha sao obrigatorios." });
    }

    const existing = await db.get("SELECT id FROM users WHERE email = ?", email);
    if (existing) {
      return res.status(409).json({ error: "Email ja cadastrado." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.run(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, passwordHash]
    );

    await db.run(
      "INSERT INTO subjects (user_id, name, color, icon) VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)",
      [
        result.lastID, "Matematica", "#2563EB", "M",
        result.lastID, "Historia", "#0EA5E9", "H",
        result.lastID, "Portugues", "#F59E0B", "P"
      ]
    );

    const user = { id: result.lastID, name, email };
    return res.json({ token: makeToken(user), user });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await db.get("SELECT * FROM users WHERE email = ?", email);

    if (!user) {
      return res.status(401).json({ error: "Credenciais invalidas." });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Credenciais invalidas." });
    }

    return res.json({
      token: makeToken(user),
      user: { id: user.id, name: user.name, email: user.email }
    });
  });

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    const user = await db.get("SELECT id, name, email, created_at FROM users WHERE id = ?", req.user.id);
    return res.json({ user });
  });

  app.get("/api/subjects", authMiddleware, async (req, res) => {
    const subjects = await db.all(
      `
        SELECT s.*, COUNT(e.id) AS entry_count
        FROM subjects s
        LEFT JOIN entries e ON e.subject_id = s.id
        WHERE s.user_id = ?
        GROUP BY s.id
        ORDER BY s.created_at DESC
      `,
      req.user.id
    );

    return res.json({
      subjects: subjects.map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        icon: row.icon,
        entryCount: row.entry_count
      }))
    });
  });

  app.post("/api/subjects", authMiddleware, async (req, res) => {
    const { name, color, icon } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Nome da materia obrigatorio." });
    }

    const result = await db.run(
      "INSERT INTO subjects (user_id, name, color, icon) VALUES (?, ?, ?, ?)",
      [req.user.id, name, color || "#2563EB", icon || name.charAt(0).toUpperCase()]
    );

    const subject = await db.get("SELECT * FROM subjects WHERE id = ?", result.lastID);
    return res.status(201).json({ subject });
  });

  app.put("/api/subjects/:id", authMiddleware, async (req, res) => {
    const { name, color, icon } = req.body;
    await db.run(
      "UPDATE subjects SET name = ?, color = ?, icon = ? WHERE id = ? AND user_id = ?",
      [name, color, icon, req.params.id, req.user.id]
    );
    const subject = await db.get("SELECT * FROM subjects WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    return res.json({ subject });
  });

  app.delete("/api/subjects/:id", authMiddleware, async (req, res) => {
    await db.run("DELETE FROM subjects WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    return res.json({ ok: true });
  });

  app.get("/api/entries", authMiddleware, async (req, res) => {
    const search = (req.query.search || "").trim();
    let rows;

    if (search) {
      const q = "%" + search + "%";
      rows = await db.all(
        `
          SELECT e.*, s.name AS subject_name, s.color AS subject_color
          FROM entries e
          JOIN subjects s ON s.id = e.subject_id
          WHERE e.user_id = ?
            AND (e.title LIKE ? OR e.note LIKE ? OR e.ocr_text LIKE ? OR s.name LIKE ?)
          ORDER BY e.created_at DESC
        `,
        [req.user.id, q, q, q, q]
      );
    } else {
      rows = await db.all(
        `
          SELECT e.*, s.name AS subject_name, s.color AS subject_color
          FROM entries e
          JOIN subjects s ON s.id = e.subject_id
          WHERE e.user_id = ?
          ORDER BY e.created_at DESC
        `,
        req.user.id
      );
    }

    return res.json({
      entries: rows.map((row) => ({
        ...normalizeEntry(row),
        subjectName: row.subject_name,
        subjectColor: row.subject_color
      }))
    });
  });

  app.post("/api/entries", authMiddleware, imageUpload.single("image"), async (req, res) => {
    const { subjectId, title, note, ocrText, aiJson } = req.body;

    if (!subjectId || !title) {
      return res.status(400).json({ error: "Materia e titulo sao obrigatorios." });
    }

    const imagePath = req.file ? "/uploads/images/" + req.file.filename : "";
    const result = await db.run(
      `
        INSERT INTO entries (user_id, subject_id, title, note, image_path, ocr_text, ai_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.user.id,
        subjectId,
        title,
        note || "",
        imagePath,
        ocrText || "",
        aiJson || ""
      ]
    );

    const entry = await db.get("SELECT * FROM entries WHERE id = ?", result.lastID);
    return res.status(201).json({ entry: normalizeEntry(entry) });
  });

  app.post("/api/entries/:id/audio", authMiddleware, audioUpload.single("audio"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Arquivo de audio obrigatorio." });
    }

    const audioPath = "/uploads/audio/" + req.file.filename;
    await db.run(
      "UPDATE entries SET audio_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      [audioPath, req.params.id, req.user.id]
    );

    const entry = await db.get("SELECT * FROM entries WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    return res.json({ entry: normalizeEntry(entry) });
  });

  app.put("/api/entries/:id", authMiddleware, async (req, res) => {
    const { subjectId, title, note, ocrText, aiJson } = req.body;

    await db.run(
      `
        UPDATE entries
        SET subject_id = ?, title = ?, note = ?, ocr_text = ?, ai_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `,
      [subjectId, title, note || "", ocrText || "", aiJson || "", req.params.id, req.user.id]
    );

    const entry = await db.get("SELECT * FROM entries WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    return res.json({ entry: normalizeEntry(entry) });
  });

  app.delete("/api/entries/:id", authMiddleware, async (req, res) => {
    const entry = await db.get("SELECT * FROM entries WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    if (entry) {
      [entry.image_path, entry.audio_path].forEach((assetPath) => {
        if (!assetPath) {
          return;
        }
        const fullPath = uploadUrlToFilePath(assetPath);
        if (fullPath && fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }

    await db.run("DELETE FROM entries WHERE id = ? AND user_id = ?", [req.params.id, req.user.id]);
    return res.json({ ok: true });
  });

  app.post("/api/ai/analyze", authMiddleware, async (req, res) => {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY nao configurada no backend." });
    }

    const { imageBase64, mimeType, ocrText, note } = req.body;
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: "Imagem obrigatoria para analise." });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    "Analise a foto de aula enviada por um estudante. " +
                    "Responda em JSON valido com detected_content, summary, study_suggestions, image_quality e next_step. " +
                    "study_suggestions deve ter exatamente 3 itens curtos. " +
                    "OCR: " + (ocrText || "Nao informado.") +
                    " Nota do aluno: " + (note || "Nao informada.")
                },
                {
                  inlineData: {
                    mimeType,
                    data: imageBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: {
              type: "object",
              properties: {
                detected_content: { type: "string" },
                summary: { type: "string" },
                study_suggestions: { type: "array", items: { type: "string" } },
                image_quality: { type: "string" },
                next_step: { type: "string" }
              },
              required: [
                "detected_content",
                "summary",
                "study_suggestions",
                "image_quality",
                "next_step"
              ]
            }
          }
        })
      }
    );

    if (!response.ok) {
      return res.status(500).json({ error: "Falha ao consultar Gemini." });
    }

    const data = await response.json();
    const text =
      data &&
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0]
        ? data.candidates[0].content.parts[0].text
        : "{}";

    return res.json({ result: JSON.parse(text) });
  });

  app.get("/*rest", (_req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "index.html"));
  });

  app.listen(PORT, () => {
    console.log("JOVI Modo Aula app em http://localhost:" + PORT);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
