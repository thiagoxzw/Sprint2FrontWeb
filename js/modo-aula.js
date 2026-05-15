(function () {
  var screenRoot = document.getElementById("prototype-screen");
  var screenTitle = document.getElementById("screen-title");
  var screenDescription = document.getElementById("screen-description");
  var jumpButtons = document.querySelectorAll("[data-jump]");
  var imageInput = document.getElementById("ocr-file-input");
  var audioInput = document.getElementById("audio-file-input");
  var geminiApiKeyInput = document.getElementById("gemini-api-key");
  var saveGeminiKeyButton = document.getElementById("save-gemini-key");
  var clearGeminiKeyButton = document.getElementById("clear-gemini-key");
  var geminiKeyStatus = document.getElementById("gemini-key-status");
  var newSubjectNameInput = document.getElementById("new-subject-name");
  var createSubjectButton = document.getElementById("create-subject-btn");
  var entryTitleInput = document.getElementById("entry-title");
  var entryNoteInput = document.getElementById("entry-note");
  var timelineSearchInput = document.getElementById("timeline-search");
  var saveNoteButton = document.getElementById("save-note-btn");
  var exportDataButton = document.getElementById("export-data-btn");
  var clearDemoButton = document.getElementById("clear-demo-btn");
  var appDataStatus = document.getElementById("app-data-status");

  if (
    !screenRoot ||
    !screenTitle ||
    !screenDescription ||
    !imageInput ||
    !audioInput ||
    !geminiApiKeyInput ||
    !saveGeminiKeyButton ||
    !clearGeminiKeyButton ||
    !geminiKeyStatus ||
    !newSubjectNameInput ||
    !createSubjectButton ||
    !entryTitleInput ||
    !entryNoteInput ||
    !timelineSearchInput ||
    !saveNoteButton ||
    !exportDataButton ||
    !clearDemoButton ||
    !appDataStatus
  ) {
    return;
  }

  var STORAGE_KEY = "joviModoAulaAppState";
  var GEMINI_KEY_STORAGE = "geminiApiKeyDemo";
  var recorder = null;
  var recorderStream = null;
  var recorderChunks = [];
  var recorderTimer = null;

  var metadata = {
    main: {
      title: "Camera principal",
      description: "Entrada de camera com foco no fluxo rapido de captura e estudo."
    },
    folders: {
      title: "Pastas por materia",
      description: "A organizacao por disciplina ja fica pronta para um uso real."
    },
    capture: {
      title: "Captura e recursos",
      description: "Imagem, OCR, Gemini, notas e audio funcionando em uma mesma experiencia."
    },
    captured: {
      title: "Registro atual",
      description: "A imagem vira um registro de aula que pode receber texto, audio e resumo."
    },
    ocr: {
      title: "OCR demonstrativo",
      description: "Extracao simulada em JavaScript puro para demonstrar o fluxo de estudo."
    },
    ia: {
      title: "Analise com Gemini",
      description: "Resumo e orientacao gerados pela API real do Gemini."
    },
    timeline: {
      title: "Timeline multimidia",
      description: "Uma linha do tempo de registros com nota, imagem, OCR e audio vinculados."
    }
  };

  function createDefaultState() {
    return {
      currentScreen: "main",
      selectedFolderId: "mat",
      subjects: [
        { id: "mat", nome: "Matematica", icone: "M", cor: "#2563EB", count: 12 },
        { id: "his", nome: "Historia", icone: "H", cor: "#0EA5E9", count: 8 },
        { id: "fis", nome: "Fisica", icone: "F", cor: "#10B981", count: 5 },
        { id: "por", nome: "Portugues", icone: "P", cor: "#F59E0B", count: 15 }
      ],
      currentImage: {
        dataUrl: "",
        fileName: ""
      },
      currentAudio: {
        dataUrl: "",
        fileName: ""
      },
      draft: {
        title: "",
        note: "",
        timelineSearch: ""
      },
      ocr: {
        text: "",
        progress: 0,
        isProcessing: false,
        error: ""
      },
      ia: {
        result: null,
        isProcessing: false,
        error: ""
      },
      timelineItems: [],
      messages: {
        app: "Os dados da demo ficam salvos neste navegador.",
        gemini: "A chave fica salva apenas neste navegador para esta demo."
      },
      recorder: {
        supported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder),
        isRecording: false,
        durationSec: 0
      }
    };
  }

  var state = loadState();
  var geminiApiKey = localStorage.getItem(GEMINI_KEY_STORAGE) || "";

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved) {
        return createDefaultState();
      }

      var base = createDefaultState();
      return {
        currentScreen: saved.currentScreen || base.currentScreen,
        selectedFolderId: saved.selectedFolderId || base.selectedFolderId,
        subjects: Array.isArray(saved.subjects) && saved.subjects.length ? saved.subjects : base.subjects,
        currentImage: saved.currentImage || base.currentImage,
        currentAudio: saved.currentAudio || base.currentAudio,
        draft: {
          title: (saved.draft && saved.draft.title) || "",
          note: (saved.draft && saved.draft.note) || "",
          timelineSearch: (saved.draft && saved.draft.timelineSearch) || ""
        },
        ocr: {
          text: "",
          progress: 0,
          isProcessing: false,
          error: ""
        },
        ia: {
          result: saved.ia && saved.ia.result ? saved.ia.result : null,
          isProcessing: false,
          error: ""
        },
        timelineItems: Array.isArray(saved.timelineItems) ? saved.timelineItems : [],
        messages: {
          app: (saved.messages && saved.messages.app) || base.messages.app,
          gemini: base.messages.gemini
        },
        recorder: {
          supported: base.recorder.supported,
          isRecording: false,
          durationSec: 0
        }
      };
    } catch (error) {
      return createDefaultState();
    }
  }

  function persistState() {
    var persistable = {
      currentScreen: state.currentScreen,
      selectedFolderId: state.selectedFolderId,
      subjects: state.subjects,
      currentImage: state.currentImage,
      currentAudio: state.currentAudio,
      draft: state.draft,
      ia: {
        result: state.ia.result
      },
      timelineItems: state.timelineItems,
      messages: {
        app: state.messages.app
      }
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  }

  function setAppMessage(message) {
    state.messages.app = message;
    appDataStatus.textContent = message;
    persistState();
  }

  function setGeminiMessage(message) {
    state.messages.gemini = message;
    geminiKeyStatus.textContent = message;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatTimestamp(dateIso) {
    try {
      return new Date(dateIso).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (error) {
      return dateIso;
    }
  }

  function selectedSubject() {
    for (var i = 0; i < state.subjects.length; i++) {
      if (state.subjects[i].id === state.selectedFolderId) {
        return state.subjects[i];
      }
    }
    return state.subjects[0];
  }

  function setScreen(screen) {
    state.currentScreen = screen;
    persistState();
    render();
  }

  function updateJumpButtons() {
    for (var i = 0; i < jumpButtons.length; i++) {
      var btn = jumpButtons[i];
      btn.classList.toggle("active", btn.getAttribute("data-jump") === state.currentScreen);
    }
  }

  function syncSidebar() {
    geminiApiKeyInput.value = geminiApiKey;
    newSubjectNameInput.value = "";
    entryTitleInput.value = state.draft.title;
    entryNoteInput.value = state.draft.note;
    timelineSearchInput.value = state.draft.timelineSearch;
    geminiKeyStatus.textContent = geminiApiKey
      ? "Chave salva neste navegador. Para producao, o ideal e usar backend."
      : "A chave fica salva apenas neste navegador para esta demo.";
    appDataStatus.textContent = state.messages.app;
  }

  function updateDraftFromSidebar() {
    state.draft.title = entryTitleInput.value.trim();
    state.draft.note = entryNoteInput.value.trim();
    state.draft.timelineSearch = timelineSearchInput.value.trim();
    persistState();
  }

  function resetOCRState() {
    state.ocr.text = "";
    state.ocr.progress = 0;
    state.ocr.isProcessing = false;
    state.ocr.error = "";
  }

  function resetIAState() {
    state.ia.result = null;
    state.ia.isProcessing = false;
    state.ia.error = "";
  }

  function triggerImagePicker() {
    imageInput.value = "";
    imageInput.click();
  }

  function triggerAudioPicker() {
    audioInput.value = "";
    audioInput.click();
  }

  function imageToInlineData(dataUrl) {
    if (!dataUrl || dataUrl.indexOf(",") === -1) {
      return null;
    }

    var parts = dataUrl.split(",");
    var mimeMatch = parts[0].match(/data:(.*?);base64/);
    if (!mimeMatch) {
      return null;
    }

    return {
      mimeType: mimeMatch[1],
      data: parts[1]
    };
  }

  function nextSubjectColor(index) {
    var colors = ["#2563EB", "#0EA5E9", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];
    return colors[index % colors.length];
  }

  function createSubject() {
    var name = newSubjectNameInput.value.trim();
    if (!name) {
      setAppMessage("Digite um nome de materia antes de criar.");
      return;
    }

    var id = "sub-" + Date.now();
    state.subjects.push({
      id: id,
      nome: name,
      icone: name.charAt(0).toUpperCase(),
      cor: nextSubjectColor(state.subjects.length),
      count: 0
    });
    state.selectedFolderId = id;
    persistState();
    setAppMessage("Materia criada com sucesso: " + name + ".");
    setScreen("folders");
  }

  function incrementCurrentSubjectCount() {
    var folder = selectedSubject();
    folder.count += 1;
  }

  function renderPreviewArea() {
    if (state.currentImage.dataUrl) {
      return [
        '<div class="mock-image-frame">',
        '  <img src="' + state.currentImage.dataUrl + '" alt="Imagem enviada para OCR" class="mock-preview-image">',
        '</div>'
      ].join("");
    }

    return [
      '<div class="mock-upload-guide">',
      '  <div class="mock-upload-title"><span class="mock-camera-badge">&#128247;</span><span>Envie uma foto real da aula</span></div>',
      '  <p>Use uma imagem da galeria ou dos arquivos para testar o fluxo completo.</p>',
      '  <p>Depois adicione nota, OCR, Gemini e audio para formar um registro real da aula.</p>',
      '</div>'
    ].join("");
  }

  function renderStatsGrid() {
    return [
      '<div class="mock-stats-grid">',
      '  <div class="mock-stat-card"><strong>' + state.subjects.length + '</strong><span>Materias</span></div>',
      '  <div class="mock-stat-card"><strong>' + state.timelineItems.length + '</strong><span>Registros</span></div>',
      '  <div class="mock-stat-card"><strong>' + (state.ocr.text ? "1" : "0") + '</strong><span>OCR atual</span></div>',
      '  <div class="mock-stat-card"><strong>' + (state.currentAudio.dataUrl ? "1" : "0") + '</strong><span>Audio atual</span></div>',
      '</div>'
    ].join("");
  }

  function renderCurrentNoteBox() {
    return [
      '<div class="mock-note-box">',
      '  <strong>Rascunho do registro</strong>',
      '  <p>Titulo: ' + escapeHtml(state.draft.title || "Sem titulo definido") + '</p>',
      '  <div class="mock-note-preview">' + escapeHtml(state.draft.note || "Nenhuma nota adicionada ainda.") + '</div>',
      '</div>'
    ].join("");
  }

  function createTimelineItem(type, extra) {
    var folder = selectedSubject();
    var now = new Date().toISOString();
    var item = {
      id: "item-" + Date.now(),
      type: type,
      title: state.draft.title || (type === "audio" ? "Explicacao gravada da aula" : "Registro de aula"),
      note: state.draft.note,
      folderId: folder.id,
      folderName: folder.nome,
      folderColor: folder.cor,
      imageUrl: state.currentImage.dataUrl,
      imageName: state.currentImage.fileName,
      audioUrl: extra && extra.audioUrl ? extra.audioUrl : state.currentAudio.dataUrl,
      audioName: extra && extra.audioName ? extra.audioName : state.currentAudio.fileName,
      ocrText: state.ocr.text,
      createdAt: now,
      iaResult: state.ia.result
    };

    state.timelineItems.unshift(item);
    persistState();
    setAppMessage("Registro salvo na timeline da materia " + folder.nome + ".");
  }

  function saveNoteEntry() {
    updateDraftFromSidebar();

    if (!state.draft.title && !state.draft.note && !state.currentImage.dataUrl && !state.ocr.text) {
      setAppMessage("Adicione pelo menos uma nota, titulo ou imagem antes de salvar um registro.");
      return;
    }

    createTimelineItem("note");
    setScreen("timeline");
  }

  function exportData() {
    var payload = {
      exportedAt: new Date().toISOString(),
      subjects: state.subjects,
      currentImage: state.currentImage.fileName,
      currentAudio: state.currentAudio.fileName,
      currentDraft: state.draft,
      timelineItems: state.timelineItems
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "jovi-modo-aula-export.json";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setAppMessage("Exportacao concluida em JSON.");
  }

  function clearDemoData() {
    if (recorder && state.recorder.isRecording) {
      stopRecording();
    }

    localStorage.removeItem(STORAGE_KEY);
    state = createDefaultState();
    syncSidebar();
    render();
    setAppMessage("Dados da demo limpos com sucesso.");
  }

  function buildMockOcrText(file) {
    var fileName = (file && file.name ? file.name : state.currentImage.fileName || "imagem-da-aula")
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .trim();

    var title = state.draft.title || "Registro da aula";
    var note = state.draft.note || "Resumo gerado em modo demonstrativo.";
    var subject = selectedSubject();

    return [
      "Materia: " + subject.nome,
      "Arquivo analisado: " + fileName,
      "Titulo identificado: " + title,
      "Observacao principal: " + note
    ].join("\n");
  }

  function runOCR(file) {
    if (!file && state.currentImage.dataUrl) {
      file = { name: state.currentImage.fileName || "imagem-da-aula" };
    }

    if (!file) {
      state.ocr.error = "Envie uma imagem primeiro para testar o OCR demonstrativo.";
      setScreen("ocr");
      return;
    }

    state.ocr.isProcessing = true;
    state.ocr.progress = 0;
    state.ocr.error = "";
    state.ocr.text = "";
    render();
    setScreen("ocr");

    var progress = 0;
    var interval = setInterval(function () {
      progress += 20;
      state.ocr.progress = progress;
      render();

      if (progress >= 100) {
        clearInterval(interval);
        state.ocr.isProcessing = false;
        state.ocr.text = buildMockOcrText(file);
        persistState();
        render();
      }
    }, 180);
  }

  function runGeminiAnalysis() {
    var inlineData = imageToInlineData(state.currentImage.dataUrl);

    if (!geminiApiKey) {
      state.ia.error = "Adicione sua Gemini API Key na lateral para liberar a analise real.";
      setScreen("ia");
      return;
    }

    if (!inlineData) {
      state.ia.error = "Envie uma imagem primeiro para a IA analisar.";
      setScreen("ia");
      return;
    }

    state.ia.isProcessing = true;
    state.ia.result = null;
    state.ia.error = "";
    render();
    setScreen("ia");

    fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey
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
                  "Texto OCR disponivel: " + (state.ocr.text || "Nao disponivel.") + ". " +
                  "Notas do aluno: " + (state.draft.note || "Nao adicionadas.")
              },
              { inlineData: inlineData }
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
            required: ["detected_content", "summary", "study_suggestions", "image_quality", "next_step"]
          }
        }
      })
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      return response.json();
    }).then(function (data) {
      var text = "";
      if (
        data &&
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts[0]
      ) {
        text = data.candidates[0].content.parts[0].text || "";
      }

      state.ia.result = JSON.parse(text);
      state.ia.isProcessing = false;
      persistState();
      render();
    }).catch(function () {
      state.ia.isProcessing = false;
      state.ia.error = "Nao foi possivel analisar com Gemini agora. Verifique a chave ou a internet.";
      render();
    });
  }

  function createAudioEntry(audioDataUrl, audioName) {
    state.currentAudio.dataUrl = audioDataUrl;
    state.currentAudio.fileName = audioName;
    createTimelineItem("audio", {
      audioUrl: audioDataUrl,
      audioName: audioName
    });
    persistState();
    setScreen("timeline");
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (event) {
        resolve(event.target.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function startRecording() {
    if (!state.recorder.supported) {
      setAppMessage("Gravacao por microfone nao e suportada neste navegador.");
      return;
    }

    if (!state.currentImage.dataUrl) {
      setAppMessage("Adicione uma imagem antes de gravar audio para vincular os dois.");
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      recorderStream = stream;
      recorder = new MediaRecorder(stream);
      recorderChunks = [];

      recorder.ondataavailable = function (event) {
        if (event.data && event.data.size > 0) {
          recorderChunks.push(event.data);
        }
      };

      recorder.onstop = function () {
        var blob = new Blob(recorderChunks, { type: recorder.mimeType || "audio/webm" });
        readFileAsDataUrl(blob).then(function (dataUrl) {
          var fileName = "gravacao-aula-" + Date.now() + ".webm";
          createAudioEntry(dataUrl, fileName);
        });

        if (recorderStream) {
          var tracks = recorderStream.getTracks();
          for (var i = 0; i < tracks.length; i++) {
            tracks[i].stop();
          }
        }

        state.recorder.isRecording = false;
        state.recorder.durationSec = 0;
        clearInterval(recorderTimer);
        recorderTimer = null;
        render();
      };

      recorder.start();
      state.recorder.isRecording = true;
      state.recorder.durationSec = 0;
      setAppMessage("Gravacao iniciada. Ao parar, o audio sera vinculado ao registro atual.");

      recorderTimer = setInterval(function () {
        state.recorder.durationSec += 1;
        render();
      }, 1000);

      render();
    }).catch(function () {
      setAppMessage("Nao foi possivel acessar o microfone neste navegador.");
    });
  }

  function stopRecording() {
    if (recorder && state.recorder.isRecording) {
      recorder.stop();
    }
  }

  function recorderStatusLabel() {
    if (!state.recorder.supported) {
      return { text: "Microfone indisponivel", idle: true };
    }
    if (!state.recorder.isRecording) {
      return { text: "Pronto para gravar audio", idle: true };
    }
    return { text: "Gravando: " + state.recorder.durationSec + "s", idle: false };
  }

  function renderRecorderBox() {
    var status = recorderStatusLabel();
    return [
      '<div class="mock-recorder-box">',
      '  <span class="mock-recorder-status' + (status.idle ? ' is-idle' : '') + '">' + escapeHtml(status.text) + '</span>',
      '  <div class="mock-resource-bar">',
      (state.recorder.isRecording
        ? '    <button type="button" class="mock-resource-pill" data-action="stop-recording">Parar gravacao</button>'
        : '    <button type="button" class="mock-resource-pill" data-action="start-recording">Gravar pelo microfone</button>'),
      '    <button type="button" class="mock-resource-pill" data-action="pick-audio">Enviar audio</button>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function filterTimelineItems() {
    var query = state.draft.timelineSearch.toLowerCase();
    if (!query) {
      return state.timelineItems;
    }

    return state.timelineItems.filter(function (item) {
      var haystack = [
        item.title,
        item.note,
        item.folderName,
        item.audioName,
        item.imageName,
        item.ocrText
      ].join(" ").toLowerCase();
      return haystack.indexOf(query) !== -1;
    });
  }

  function buildTimelineHtml() {
    var filtered = filterTimelineItems();

    if (!filtered.length) {
      return '<div class="mock-timeline-empty">Nenhum registro encontrado. Adicione imagem, nota ou audio para alimentar a timeline.</div>';
    }

    return filtered.map(function (item) {
      var suggestions = "";
      if (item.iaResult && item.iaResult.study_suggestions) {
        suggestions = item.iaResult.study_suggestions.slice(0, 2).map(function (suggestion) {
          return '<span>' + escapeHtml(suggestion) + '</span>';
        }).join("");
      }

      return [
        '<article class="mock-timeline-card">',
        '  <div class="mock-timeline-top">',
        '    <div class="mock-timeline-meta">',
        '      <strong>' + escapeHtml(item.title || "Registro de aula") + '</strong>',
        '      <span>' + escapeHtml(item.folderName) + ' • ' + formatTimestamp(item.createdAt) + '</span>',
        '    </div>',
        '    <span class="mock-file-tag">' + escapeHtml(item.type.toUpperCase()) + '</span>',
        '  </div>',
        '  <div class="mock-timeline-tags">',
        (item.imageUrl ? '    <span>Imagem vinculada</span>' : ''),
        (item.audioUrl ? '    <span>Audio associado</span>' : ''),
        (item.ocrText ? '    <span>OCR disponivel</span>' : ''),
              suggestions,
        '  </div>',
        (item.note ? '  <div class="mock-note-preview">' + escapeHtml(item.note) + '</div>' : ''),
        (item.audioUrl ? '  <audio controls class="mock-audio-player" src="' + item.audioUrl + '"></audio>' : ''),
        (item.imageUrl
          ? '  <div class="mock-linked-preview"><img src="' + item.imageUrl + '" alt="Imagem associada"><div class="mock-linked-preview-text"><strong>Imagem do registro</strong><p>' +
            escapeHtml(item.imageName || "Imagem da aula") +
            '</p>' +
            (item.ocrText ? '<p>Trecho OCR: ' + escapeHtml(item.ocrText.substring(0, 110)) + (item.ocrText.length > 110 ? "..." : "") + '</p>' : '') +
            '</div></div>'
          : ''),
        '</article>'
      ].join("");
    }).join("");
  }

  function renderMain() {
    return [
      '<div class="mock-screen camera-screen">',
      '  <div class="mock-topbar">',
      '    <button type="button" class="mock-icon-btn">&#9776;</button>',
      '    <span>JOVI V70 Camera</span>',
      '    <button type="button" class="mock-icon-btn">&#9881;</button>',
      '  </div>',
      '  <div class="mock-viewfinder">',
      '    <div class="mock-viewfinder-note">Cena pronta para captura</div>',
      '    <div class="mock-focus-box"></div>',
      '    <div class="mock-zoom-row"><span>0.6x</span><span>1x</span><span>2x</span></div>',
      '  </div>',
      '  <div class="mock-bottom-panel">',
      '    <div class="mock-mode-row">',
      '      <button type="button">Noite</button>',
      '      <button type="button">Retrato</button>',
      '      <button type="button" class="active">Foto</button>',
      '      <button type="button">Video</button>',
      '      <button type="button">Mais</button>',
      '    </div>',
      '    <div class="mock-capture-row">',
      '      <div class="mock-thumb"></div>',
      '      <button type="button" class="mock-capture-btn" aria-label="Capturar"></button>',
      '      <button type="button" class="mock-icon-circle">&#8635;</button>',
      '    </div>',
      '    <button type="button" class="mock-mode-aula-btn" data-action="go-folders">Entrar no Modo Aula</button>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderFolders() {
    var items = state.subjects.map(function (subject) {
      return [
        '<button type="button" class="mock-folder-item" data-folder="' + subject.id + '">',
        '  <span class="mock-folder-left">',
        '    <span class="mock-folder-icon" style="background:' + subject.cor + ';">' + escapeHtml(subject.icone) + '</span>',
        '    <span>',
        '      <strong>' + escapeHtml(subject.nome) + '</strong>',
        '      <small class="mock-folder-meta">' + subject.count + ' registros</small>',
        '    </span>',
        '  </span>',
        '  <span>&rsaquo;</span>',
        '</button>'
      ].join("");
    }).join("");

    return [
      '<div class="mock-screen">',
      '  <div class="mock-subheader">',
      '    <button type="button" class="mock-icon-btn" data-action="go-main">&larr;</button>',
      '    <div>',
      '      <h3>Modo Aula</h3>',
      '      <p>Organize registros por materia com persistencia local.</p>',
      '    </div>',
      '  </div>',
      '  <div class="mock-screen-body">',
      '    <div class="mock-status-card">Cada registro pode combinar imagem, OCR, Gemini, nota e audio.</div>',
             renderStatsGrid(),
      '    <div class="mock-folder-list">' + items + '</div>',
      '    <div class="mock-create-folder">Use o painel lateral para criar novas materias.</div>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderCapture() {
    var subject = selectedSubject();

    return [
      '<div class="mock-screen capture-active-screen camera-screen">',
      '  <div class="mock-screen-body">',
      '    <div class="mock-viewfinder">',
      '      <div class="mock-topbar">',
      '        <button type="button" class="mock-icon-circle" data-action="go-folders">&larr;</button>',
      '        <span class="mock-folder-badge">' + escapeHtml(subject.nome) + '</span>',
      '        <button type="button" class="mock-icon-circle">&#9889;</button>',
      '      </div>',
      '      <div class="mock-ia-hint">IA: centralize o conteudo para reduzir corte e reflexo</div>',
             renderPreviewArea(),
      '    </div>',
      '    <div class="mock-bottom-actions">',
      '      <button type="button" class="mock-action-chip mock-action-chip--primary" data-action="pick-image">Imagem</button>',
      '      <button type="button" class="mock-action-chip" data-action="start-ocr">OCR</button>',
      '      <button type="button" class="mock-action-chip" data-action="start-ia">Gemini</button>',
      '      <button type="button" class="mock-action-chip" data-action="pick-audio">Audio</button>',
      '    </div>',
      '    <div class="mock-bottom-panel">',
      '      <div class="mock-resource-bar">',
      '        <button type="button" class="mock-resource-pill" data-action="pick-image">Abrir galeria</button>',
      '        <button type="button" class="mock-resource-pill" data-action="start-recording">Gravar audio</button>',
      '        <button type="button" class="mock-resource-pill" data-action="go-timeline">Ver timeline</button>',
      '      </div>',
             renderRecorderBox(),
             renderCurrentNoteBox(),
      (state.currentImage.fileName ? '      <span class="mock-file-tag">Imagem atual: ' + escapeHtml(state.currentImage.fileName) + '</span>' : ''),
      (state.currentAudio.fileName ? '      <span class="mock-file-tag">Audio atual: ' + escapeHtml(state.currentAudio.fileName) + '</span>' : ''),
      '    </div>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderCaptured() {
    var subject = selectedSubject();
    return [
      '<div class="mock-screen">',
      '  <div class="mock-header-row">',
      '    <button type="button" class="mock-text-btn" data-action="go-capture">&larr; Voltar</button>',
      '    <span class="mock-folder-badge">' + escapeHtml(subject.nome) + '</span>',
      '  </div>',
      '  <div class="mock-screen-body">',
             renderPreviewArea(),
      '    <div class="mock-save-pill">Imagem vinculada a ' + escapeHtml(subject.nome) + '</div>',
      '    <div class="result-actions">',
      '      <button type="button" class="mock-primary-btn" data-action="start-ocr">Extrair texto</button>',
      '      <button type="button" class="mock-secondary-btn" data-action="start-ia">Analisar com Gemini</button>',
      '    </div>',
      '    <div class="mock-resource-bar">',
      '      <button type="button" class="mock-resource-pill" data-action="pick-audio">Adicionar audio</button>',
      '      <button type="button" class="mock-resource-pill" data-action="start-recording">Gravar audio</button>',
      '      <button type="button" class="mock-resource-pill" data-action="go-timeline">Abrir timeline</button>',
      '    </div>',
             renderCurrentNoteBox(),
      (state.currentAudio.fileName ? '    <span class="mock-file-tag">Audio ligado: ' + escapeHtml(state.currentAudio.fileName) + '</span>' : ''),
      '    <button type="button" class="mock-outline-btn" data-action="pick-image">Escolher outra imagem</button>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderOCR() {
    var contentBlock = "";

    if (state.ocr.isProcessing) {
      contentBlock = [
        '<div class="mock-loading-block">',
        '  <div class="mock-processing-pill">Processando OCR em tempo real</div>',
        '  <div class="mock-progress-bar"><div class="mock-progress-fill" style="width:' + state.ocr.progress + '%;"></div></div>',
        '  <p class="mock-helper-text">Lendo a imagem enviada. Progresso: ' + state.ocr.progress + '%.</p>',
        '</div>'
      ].join("");
    } else if (state.ocr.text) {
      contentBlock = [
        '<div class="mock-processing-pill">OCR demonstrativo concluido</div>',
        '<div class="mock-result-card">' + escapeHtml(state.ocr.text) + '</div>'
      ].join("");
    } else if (state.ocr.error) {
      contentBlock = [
        '<div class="mock-warning-pill">' + escapeHtml(state.ocr.error) + '</div>',
        '<div class="mock-ocr-empty">Tente enviar uma imagem mais nitida, frontal e com boa iluminacao.</div>'
      ].join("");
    } else {
      contentBlock = [
        '<div class="mock-warning-pill">Nenhuma imagem enviada ainda</div>',
        '<div class="mock-ocr-empty">Selecione uma imagem para testar o OCR demonstrativo.</div>'
      ].join("");
    }

    return [
      '<div class="mock-screen">',
      '  <div class="mock-header-row">',
      '    <button type="button" class="mock-text-btn" data-action="go-captured">&larr;</button>',
      '    <h3>Texto extraido</h3>',
      '    <span></span>',
      '  </div>',
      '  <div class="mock-screen-body">',
      (state.currentImage.fileName ? '    <span class="mock-file-tag">Imagem atual: ' + escapeHtml(state.currentImage.fileName) + '</span>' : ''),
             contentBlock,
      '    <div class="result-actions">',
      '      <button type="button" class="mock-primary-btn" data-action="start-ocr">Executar OCR</button>',
      '      <button type="button" class="mock-outline-btn" data-action="pick-image">Trocar imagem</button>',
      '    </div>',
      '    <button type="button" class="mock-secondary-btn" data-action="start-ia">Enviar para Gemini</button>',
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderIA() {
    var iaContent = "";

    if (state.ia.isProcessing) {
      iaContent = [
        '<div class="mock-loading-block">',
        '  <div class="mock-processing-pill">Analisando com Gemini</div>',
        '  <p class="mock-helper-text">A IA esta lendo a imagem, o OCR e suas notas para montar um resumo real.</p>',
        '  <div class="mock-progress-bar"><div class="mock-progress-fill" style="width:72%;"></div></div>',
        '</div>'
      ].join("");
    } else if (state.ia.result) {
      var suggestions = (state.ia.result.study_suggestions || []).map(function (item) {
        return '<li>' + escapeHtml(item) + '</li>';
      }).join("");

      iaContent = [
        '<div class="mock-ia-list">',
        '  <article class="mock-ia-card"><h4>Conteudo detectado</h4><p>' + escapeHtml(state.ia.result.detected_content) + '</p></article>',
        '  <article class="mock-ia-card"><h4>Resumo inteligente</h4><p>' + escapeHtml(state.ia.result.summary) + '</p></article>',
        '  <article class="mock-ia-card"><h4>Sugestoes de estudo</h4><ul class="prototype-side-list">' + suggestions + '</ul></article>',
        '  <article class="mock-ia-card"><h4>Qualidade da imagem</h4><p>' + escapeHtml(state.ia.result.image_quality) + '</p></article>',
        '  <article class="mock-ia-card"><h4>Proximo passo</h4><p>' + escapeHtml(state.ia.result.next_step) + '</p></article>',
        '</div>'
      ].join("");
    } else if (state.ia.error) {
      iaContent = [
        '<div class="mock-warning-pill">' + escapeHtml(state.ia.error) + '</div>',
        '<div class="mock-ocr-empty">Configure a chave do Gemini e envie uma imagem para ativar a analise real.</div>'
      ].join("");
    } else {
      iaContent = [
        '<div class="mock-warning-pill">Analise aguardando configuracao</div>',
        '<div class="mock-ocr-empty">Depois de enviar a imagem e salvar a chave da API, toque em "Executar Gemini".</div>'
      ].join("");
    }

    return [
      '<div class="mock-screen">',
      '  <div class="mock-header-row">',
      '    <button type="button" class="mock-text-btn" data-action="go-captured">&larr;</button>',
      '    <h3>Analise com Gemini</h3>',
      '    <span></span>',
      '  </div>',
      '  <div class="mock-screen-body">',
      (state.currentImage.fileName ? '    <span class="mock-file-tag">Imagem atual: ' + escapeHtml(state.currentImage.fileName) + '</span>' : ''),
             iaContent,
      '    <div class="mock-stack-actions">',
      '      <button type="button" class="mock-primary-btn" data-action="start-ia">Executar Gemini</button>',
      '      <button type="button" class="mock-outline-btn" data-action="pick-image">Trocar imagem</button>',
      '    </div>',
      '</div>',
      '</div>'
    ].join("");
  }

  function renderTimeline() {
    return [
      '<div class="mock-screen">',
      '  <div class="mock-header-row">',
      '    <button type="button" class="mock-text-btn" data-action="go-capture">&larr;</button>',
      '    <h3>Timeline da aula</h3>',
      '    <span></span>',
      '  </div>',
      '  <div class="mock-screen-body">',
      '    <div class="mock-status-card">Uma base mais real: registros persistentes, busca, nota, OCR, audio e resumo inteligente.</div>',
             renderStatsGrid(),
      '    <div class="mock-resource-bar">',
      '      <button type="button" class="mock-resource-pill" data-action="pick-audio">Adicionar audio</button>',
      '      <button type="button" class="mock-resource-pill" data-action="start-recording">Gravar audio</button>',
      '      <button type="button" class="mock-resource-pill" data-action="save-note-entry">Salvar nota na timeline</button>',
      '    </div>',
             buildTimelineHtml(),
      '  </div>',
      '</div>'
    ].join("");
  }

  function renderScreen() {
    var html = "";

    if (state.currentScreen === "main") html = renderMain();
    if (state.currentScreen === "folders") html = renderFolders();
    if (state.currentScreen === "capture") html = renderCapture();
    if (state.currentScreen === "captured") html = renderCaptured();
    if (state.currentScreen === "ocr") html = renderOCR();
    if (state.currentScreen === "ia") html = renderIA();
    if (state.currentScreen === "timeline") html = renderTimeline();

    screenRoot.innerHTML = html;
    screenTitle.textContent = metadata[state.currentScreen].title;
    screenDescription.textContent = metadata[state.currentScreen].description;
    updateJumpButtons();
    bindDynamicEvents();
  }

  function bindDynamicEvents() {
    var actionButtons = screenRoot.querySelectorAll("[data-action]");
    var folderButtons = screenRoot.querySelectorAll("[data-folder]");

    for (var i = 0; i < actionButtons.length; i++) {
      actionButtons[i].addEventListener("click", function () {
        var action = this.getAttribute("data-action");

        if (action === "go-main") setScreen("main");
        if (action === "go-folders") setScreen("folders");
        if (action === "go-capture") setScreen("capture");
        if (action === "go-captured") setScreen("captured");
        if (action === "go-timeline") setScreen("timeline");
        if (action === "pick-image") triggerImagePicker();
        if (action === "pick-audio") triggerAudioPicker();
        if (action === "start-ocr") runOCR(imageInput.files && imageInput.files[0] ? imageInput.files[0] : null);
        if (action === "start-ia") runGeminiAnalysis();
        if (action === "start-recording") startRecording();
        if (action === "stop-recording") stopRecording();
        if (action === "save-note-entry") saveNoteEntry();
      });
    }

    for (var j = 0; j < folderButtons.length; j++) {
      folderButtons[j].addEventListener("click", function () {
        state.selectedFolderId = this.getAttribute("data-folder");
        persistState();
        setScreen("capture");
      });
    }
  }

  function handleImageSelected(file) {
    if (!file) {
      return;
    }

    resetOCRState();
    resetIAState();

    readFileAsDataUrl(file).then(function (dataUrl) {
      state.currentImage.dataUrl = dataUrl;
      state.currentImage.fileName = file.name;
      incrementCurrentSubjectCount();
      persistState();
      setAppMessage("Imagem vinculada ao registro atual.");
      setScreen("captured");
      runOCR(file);
    });
  }

  function handleAudioSelected(file) {
    if (!file) {
      return;
    }

    if (!state.currentImage.dataUrl) {
      setAppMessage("Envie uma imagem antes de anexar um audio.");
      return;
    }

    readFileAsDataUrl(file).then(function (dataUrl) {
      createAudioEntry(dataUrl, file.name);
    });
  }

  function bindStaticEvents() {
    for (var i = 0; i < jumpButtons.length; i++) {
      jumpButtons[i].addEventListener("click", function () {
        var target = this.getAttribute("data-jump");
        state.currentScreen = target;
        persistState();
        render();
      });
    }

    imageInput.addEventListener("change", function (event) {
      var file = event.target.files && event.target.files[0];
      handleImageSelected(file);
    });

    audioInput.addEventListener("change", function (event) {
      var file = event.target.files && event.target.files[0];
      handleAudioSelected(file);
    });

    saveGeminiKeyButton.addEventListener("click", function () {
      geminiApiKey = geminiApiKeyInput.value.trim();
      localStorage.setItem(GEMINI_KEY_STORAGE, geminiApiKey);
      setGeminiMessage(
        geminiApiKey
          ? "Chave salva neste navegador. Para producao, o ideal e usar backend."
          : "A chave fica salva apenas neste navegador para esta demo."
      );
    });

    clearGeminiKeyButton.addEventListener("click", function () {
      geminiApiKey = "";
      localStorage.removeItem(GEMINI_KEY_STORAGE);
      syncSidebar();
    });

    createSubjectButton.addEventListener("click", createSubject);
    saveNoteButton.addEventListener("click", saveNoteEntry);
    exportDataButton.addEventListener("click", exportData);
    clearDemoButton.addEventListener("click", clearDemoData);

    entryTitleInput.addEventListener("input", updateDraftFromSidebar);
    entryNoteInput.addEventListener("input", updateDraftFromSidebar);
    timelineSearchInput.addEventListener("input", function () {
      updateDraftFromSidebar();
      if (state.currentScreen === "timeline") {
        render();
      }
    });
  }

  function render() {
    syncSidebar();
    renderScreen();
  }

  bindStaticEvents();
  render();
})();
