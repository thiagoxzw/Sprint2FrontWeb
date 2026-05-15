const state = {
  token: localStorage.getItem("joviToken") || "",
  user: null,
  authMode: "login",
  subjects: [],
  entries: [],
  selectedSubjectId: null,
  selectedEntryId: null,
  recordedAudioBlob: null,
  mediaRecorder: null,
  mediaStream: null,
  ocrBusy: false
};

const els = {
  authCard: document.getElementById("auth-card"),
  userCard: document.getElementById("user-card"),
  subjectCard: document.getElementById("subject-card"),
  entryFormCard: document.getElementById("entry-form-card"),
  toolsCard: document.getElementById("tools-card"),
  authForm: document.getElementById("auth-form"),
  authName: document.getElementById("auth-name"),
  authEmail: document.getElementById("auth-email"),
  authPassword: document.getElementById("auth-password"),
  authFeedback: document.getElementById("auth-feedback"),
  userSummary: document.getElementById("user-summary"),
  logoutBtn: document.getElementById("logout-btn"),
  subjectForm: document.getElementById("subject-form"),
  subjectName: document.getElementById("subject-name"),
  subjectColor: document.getElementById("subject-color"),
  subjectIcon: document.getElementById("subject-icon"),
  entryForm: document.getElementById("entry-form"),
  entrySubject: document.getElementById("entry-subject"),
  entryTitle: document.getElementById("entry-title"),
  entryNote: document.getElementById("entry-note"),
  entryImage: document.getElementById("entry-image"),
  entryAudio: document.getElementById("entry-audio"),
  entryOcr: document.getElementById("entry-ocr"),
  entryFeedback: document.getElementById("entry-feedback"),
  runOcrBtn: document.getElementById("run-ocr-btn"),
  recordAudioBtn: document.getElementById("record-audio-btn"),
  stopAudioBtn: document.getElementById("stop-audio-btn"),
  attachAudioBtn: document.getElementById("attach-audio-btn"),
  analyzeAiBtn: document.getElementById("analyze-ai-btn"),
  toolFeedback: document.getElementById("tool-feedback"),
  timelineSearch: document.getElementById("timeline-search"),
  statsGrid: document.getElementById("stats-grid"),
  subjectsStrip: document.getElementById("subjects-strip"),
  timelineList: document.getElementById("timeline-list"),
  authTabs: document.querySelectorAll("[data-auth-mode]")
};

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (state.token) {
    headers.set("Authorization", "Bearer " + state.token);
  }

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Erro na requisicao.");
  }
  return data;
}

function setAuthMode(mode) {
  state.authMode = mode;
  els.authName.classList.toggle("hidden", mode !== "register");
  els.authTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.authMode === mode);
  });
}

function setFeedback(target, text) {
  target.textContent = text;
}

function currentEntry() {
  return state.entries.find((entry) => entry.id === state.selectedEntryId) || null;
}

function dataUrlParts(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const [prefix, data] = reader.result.split(",");
      const match = prefix.match(/data:(.*?);base64/);
      resolve({ base64: data, mimeType: match ? match[1] : "image/jpeg" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderStats() {
  const stats = [
    { label: "Materias", value: state.subjects.length },
    { label: "Registros", value: state.entries.length },
    {
      label: "Com OCR",
      value: state.entries.filter((entry) => entry.ocrText).length
    },
    {
      label: "Com audio",
      value: state.entries.filter((entry) => entry.audioPath).length
    }
  ];

  els.statsGrid.innerHTML = stats
    .map(
      (stat) => `
        <article class="stat-card">
          <strong>${stat.value}</strong>
          <span>${stat.label}</span>
        </article>
      `
    )
    .join("");
}

function renderSubjects() {
  els.entrySubject.innerHTML = state.subjects
    .map(
      (subject) => `<option value="${subject.id}">${subject.name}</option>`
    )
    .join("");

  if (!state.selectedSubjectId && state.subjects[0]) {
    state.selectedSubjectId = state.subjects[0].id;
  }

  els.entrySubject.value = state.selectedSubjectId || "";

  els.subjectsStrip.innerHTML = state.subjects
    .map(
      (subject) => `
        <button class="subject-chip ${state.selectedSubjectId === subject.id ? "active" : ""}" data-subject-id="${subject.id}">
          <span class="subject-icon" style="background:${subject.color}">${subject.icon}</span>
          <span>
            <strong>${subject.name}</strong><br>
            <small class="helper-text">${subject.entryCount || 0} registros</small>
          </span>
        </button>
      `
    )
    .join("");

  els.subjectsStrip.querySelectorAll("[data-subject-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSubjectId = Number(button.dataset.subjectId);
      renderSubjects();
      renderTimeline();
    });
  });
}

function matchesSearch(entry) {
  const query = els.timelineSearch.value.trim().toLowerCase();
  if (!query) return true;
  const text = [
    entry.title,
    entry.note,
    entry.ocrText,
    entry.subjectName
  ]
    .join(" ")
    .toLowerCase();
  return text.includes(query);
}

function renderTimeline() {
  const filtered = state.entries.filter((entry) => {
    const matchesSubject = !state.selectedSubjectId || entry.subjectId === state.selectedSubjectId;
    return matchesSubject && matchesSearch(entry);
  });

  if (!filtered.length) {
    els.timelineList.innerHTML = `<article class="timeline-card"><p class="helper-text">Nenhum registro encontrado.</p></article>`;
    return;
  }

  els.timelineList.innerHTML = filtered
    .map((entry) => {
      const aiTags = entry.ai && Array.isArray(entry.ai.study_suggestions)
        ? entry.ai.study_suggestions.slice(0, 2).map((item) => `<span>${item}</span>`).join("")
        : "";

      return `
        <article class="timeline-card">
          <div class="timeline-top">
            <div>
              <h3>${entry.title}</h3>
              <p class="timeline-meta">${entry.subjectName} • ${new Date(entry.createdAt).toLocaleString("pt-BR")}</p>
            </div>
            <div class="timeline-tags">
              ${entry.imagePath ? "<span>Imagem</span>" : ""}
              ${entry.audioPath ? "<span>Áudio</span>" : ""}
              ${entry.ocrText ? "<span>OCR</span>" : ""}
              ${aiTags}
            </div>
          </div>
          <div class="timeline-content">
            <div class="preview-card">
              ${entry.imagePath ? `<img src="${entry.imagePath}" alt="Imagem do registro">` : `<p class="helper-text">Sem imagem</p>`}
            </div>
            <div class="stack-form">
              <div class="card-note">${entry.note || "Sem notas."}</div>
              ${entry.audioPath ? `<audio controls class="audio-player" src="${entry.audioPath}"></audio>` : ""}
              ${entry.ocrText ? `<div class="card-note">${entry.ocrText}</div>` : ""}
              ${
                entry.ai
                  ? `<div class="card-note"><strong>Resumo IA:</strong><br>${entry.ai.summary || ""}</div>`
                  : ""
              }
              <div class="timeline-actions">
                <button class="secondary-btn" data-edit-entry="${entry.id}">Editar</button>
                <button class="secondary-btn" data-select-entry="${entry.id}">Selecionar</button>
                <button class="danger-btn" data-delete-entry="${entry.id}">Excluir</button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  els.timelineList.querySelectorAll("[data-delete-entry]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/entries/${button.dataset.deleteEntry}`, { method: "DELETE" });
      await loadEntries();
      setFeedback(els.entryFeedback, "Registro removido com sucesso.");
    });
  });

  els.timelineList.querySelectorAll("[data-select-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedEntryId = Number(button.dataset.selectEntry);
      setFeedback(els.toolFeedback, "Registro selecionado para anexar áudio ou usar IA.");
    });
  });

  els.timelineList.querySelectorAll("[data-edit-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = state.entries.find((item) => item.id === Number(button.dataset.editEntry));
      if (!entry) return;
      state.selectedEntryId = entry.id;
      els.entrySubject.value = entry.subjectId;
      els.entryTitle.value = entry.title;
      els.entryNote.value = entry.note;
      els.entryOcr.value = entry.ocrText;
      setFeedback(els.entryFeedback, "Registro carregado no formulário para edição.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

async function loadSubjects() {
  const data = await api("/api/subjects");
  state.subjects = data.subjects;
  renderSubjects();
  renderStats();
}

async function loadEntries() {
  const search = encodeURIComponent(els.timelineSearch.value.trim());
  const data = await api(`/api/entries?search=${search}`);
  state.entries = data.entries;
  renderTimeline();
  renderStats();
}

async function loadSession() {
  if (!state.token) {
    updateAuthUI(false);
    return;
  }

  try {
    const data = await api("/api/auth/me");
    state.user = data.user;
    updateAuthUI(true);
    await loadSubjects();
    await loadEntries();
  } catch (_error) {
    localStorage.removeItem("joviToken");
    state.token = "";
    updateAuthUI(false);
  }
}

function updateAuthUI(isLogged) {
  els.authCard.classList.toggle("hidden", isLogged);
  els.userCard.classList.toggle("hidden", !isLogged);
  els.subjectCard.classList.toggle("hidden", !isLogged);
  els.entryFormCard.classList.toggle("hidden", !isLogged);
  els.toolsCard.classList.toggle("hidden", !isLogged);
  if (isLogged && state.user) {
    els.userSummary.textContent = `${state.user.name} • ${state.user.email}`;
  }
}

async function submitAuth(event) {
  event.preventDefault();
  const payload = {
    email: els.authEmail.value,
    password: els.authPassword.value
  };
  if (state.authMode === "register") {
    payload.name = els.authName.value;
  }

  const endpoint = state.authMode === "register" ? "/api/auth/register" : "/api/auth/login";

  try {
    const data = await api(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem("joviToken", data.token);
    setFeedback(els.authFeedback, "Acesso realizado com sucesso.");
    updateAuthUI(true);
    await loadSubjects();
    await loadEntries();
  } catch (error) {
    setFeedback(els.authFeedback, error.message);
  }
}

async function submitSubject(event) {
  event.preventDefault();
  try {
    await api("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: els.subjectName.value,
        color: els.subjectColor.value,
        icon: els.subjectIcon.value || els.subjectName.value.charAt(0).toUpperCase()
      })
    });
    els.subjectForm.reset();
    els.subjectColor.value = "#2563EB";
    await loadSubjects();
    setFeedback(els.entryFeedback, "Matéria criada com sucesso.");
  } catch (error) {
    setFeedback(els.entryFeedback, error.message);
  }
}

async function submitEntry(event) {
  event.preventDefault();
  try {
    const form = new FormData();
    form.append("subjectId", els.entrySubject.value);
    form.append("title", els.entryTitle.value);
    form.append("note", els.entryNote.value);
    form.append("ocrText", els.entryOcr.value);
    const current = currentEntry();
    if (current && current.ai) {
      form.append("aiJson", JSON.stringify(current.ai));
    }

    if (els.entryImage.files[0]) {
      form.append("image", els.entryImage.files[0]);
    }

    if (state.selectedEntryId) {
      await api(`/api/entries/${state.selectedEntryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: Number(els.entrySubject.value),
          title: els.entryTitle.value,
          note: els.entryNote.value,
          ocrText: els.entryOcr.value,
          aiJson: current && current.ai ? JSON.stringify(current.ai) : ""
        })
      });
      setFeedback(els.entryFeedback, "Registro atualizado com sucesso.");
    } else {
      await fetch("/api/entries", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${state.token}`
        },
        body: form
      }).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro ao salvar.");
      });
      setFeedback(els.entryFeedback, "Registro criado com sucesso.");
    }

    state.selectedEntryId = null;
    els.entryForm.reset();
    await loadSubjects();
    await loadEntries();
  } catch (error) {
    setFeedback(els.entryFeedback, error.message);
  }
}

async function runOCR() {
  const file = els.entryImage.files[0];
  if (!file || state.ocrBusy) {
    setFeedback(els.entryFeedback, "Selecione uma imagem antes de rodar o OCR.");
    return;
  }

  state.ocrBusy = true;
  setFeedback(els.entryFeedback, "Processando OCR...");

  try {
    const result = await Tesseract.recognize(file, "por+eng");
    els.entryOcr.value = (result.data && result.data.text ? result.data.text : "").trim();
    setFeedback(els.entryFeedback, "OCR concluído.");
  } catch (_error) {
    setFeedback(els.entryFeedback, "Falha no OCR.");
  } finally {
    state.ocrBusy = false;
  }
}

async function startRecording() {
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    setFeedback(els.toolFeedback, "Seu navegador não suporta gravação.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.mediaStream = stream;
    state.recordedAudioBlob = null;
    const chunks = [];
    const recorder = new MediaRecorder(stream);
    state.mediaRecorder = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onstop = () => {
      state.recordedAudioBlob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      els.attachAudioBtn.disabled = false;
      els.stopAudioBtn.disabled = true;
      els.recordAudioBtn.disabled = false;
      setFeedback(els.toolFeedback, "Áudio gravado. Agora você pode anexar ao registro selecionado.");
      stream.getTracks().forEach((track) => track.stop());
    };

    recorder.start();
    els.recordAudioBtn.disabled = true;
    els.stopAudioBtn.disabled = false;
    setFeedback(els.toolFeedback, "Gravação iniciada.");
  } catch (_error) {
    setFeedback(els.toolFeedback, "Não foi possível acessar o microfone.");
  }
}

function stopRecording() {
  if (state.mediaRecorder) {
    state.mediaRecorder.stop();
  }
}

async function attachAudio(file) {
  const entry = currentEntry();
  if (!entry) {
    setFeedback(els.toolFeedback, "Selecione um registro na timeline primeiro.");
    return;
  }

  const form = new FormData();
  form.append("audio", file);

  const response = await fetch(`/api/entries/${entry.id}/audio`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${state.token}`
    },
    body: form
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Erro ao anexar áudio.");
  }

  setFeedback(els.toolFeedback, "Áudio anexado ao registro.");
  await loadEntries();
}

async function attachRecordedAudio() {
  if (!state.recordedAudioBlob) {
    setFeedback(els.toolFeedback, "Grave um áudio primeiro.");
    return;
  }

  const file = new File([state.recordedAudioBlob], `gravacao-${Date.now()}.webm`, {
    type: state.recordedAudioBlob.type || "audio/webm"
  });
  await attachAudio(file);
}

async function analyzeWithAI() {
  const file = els.entryImage.files[0];
  const entry = currentEntry();

  if (!file && !(entry && entry.imagePath)) {
    setFeedback(els.toolFeedback, "Selecione uma imagem no formulário ou um registro com imagem.");
    return;
  }

  try {
    let base64Payload;

    if (file) {
      base64Payload = await dataUrlParts(file);
    } else {
      const response = await fetch(entry.imagePath);
      const blob = await response.blob();
      base64Payload = await dataUrlParts(new File([blob], "entry-image", { type: blob.type }));
    }

    const data = await api("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: base64Payload.base64,
        mimeType: base64Payload.mimeType,
        ocrText: els.entryOcr.value || (entry ? entry.ocrText : ""),
        note: els.entryNote.value || (entry ? entry.note : "")
      })
    });

    const targetEntry = entry || state.entries.find((item) => item.id === state.selectedEntryId);
    if (targetEntry) {
      await api(`/api/entries/${targetEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: targetEntry.subjectId,
          title: targetEntry.title,
          note: targetEntry.note,
          ocrText: targetEntry.ocrText,
          aiJson: JSON.stringify(data.result)
        })
      });
    }

    setFeedback(els.toolFeedback, "Análise do Gemini concluída.");
    await loadEntries();
  } catch (error) {
    setFeedback(els.toolFeedback, error.message);
  }
}

function bindEvents() {
  els.authTabs.forEach((tab) => {
    tab.addEventListener("click", () => setAuthMode(tab.dataset.authMode));
  });

  els.authForm.addEventListener("submit", submitAuth);
  els.logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("joviToken");
    state.token = "";
    state.user = null;
    state.entries = [];
    state.subjects = [];
    updateAuthUI(false);
  });

  els.subjectForm.addEventListener("submit", submitSubject);
  els.entryForm.addEventListener("submit", submitEntry);
  els.runOcrBtn.addEventListener("click", runOCR);
  els.timelineSearch.addEventListener("input", loadEntries);
  els.recordAudioBtn.addEventListener("click", startRecording);
  els.stopAudioBtn.addEventListener("click", stopRecording);
  els.attachAudioBtn.addEventListener("click", attachRecordedAudio);
  els.entryAudio.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      try {
        await attachAudio(file);
      } catch (error) {
        setFeedback(els.toolFeedback, error.message);
      }
    }
  });
  els.analyzeAiBtn.addEventListener("click", analyzeWithAI);
}

bindEvents();
setAuthMode("login");
loadSession();
