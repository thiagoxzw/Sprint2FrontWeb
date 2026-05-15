// =============================================
// JOVI MODO AULA - Validação de Formulários
// Sprint 2 - Web Development
// Equipe NextStage
// Validação de formulários, login, alertas,
// prompts e manipulação de eventos DOM
// =============================================

// ---- VARIÁVEIS GLOBAIS ----
var loginAttempts = 0;
var maxLoginAttempts = 3;
var isLoggedIn = false;
var userName = "";

// ---- FUNÇÕES UTILITÁRIAS ----

// Validar formato de e-mail usando manipulação de strings
function isValidEmail(email) {
  email = email.trim();
  if (email.length === 0) return false;

  var atIndex = email.indexOf("@");
  var dotIndex = email.lastIndexOf(".");

  // Deve ter @ e . após o @
  if (atIndex < 1) return false;
  if (dotIndex <= atIndex + 1) return false;
  if (dotIndex >= email.length - 1) return false;

  // Não pode ter espaços
  if (email.indexOf(" ") !== -1) return false;

  return true;
}

// Mostrar erro no campo
function showError(fieldId) {
  var errorEl = document.getElementById(fieldId);
  if (errorEl) {
    errorEl.classList.add("show");
  }
}

// Esconder erro no campo
function hideError(fieldId) {
  var errorEl = document.getElementById(fieldId);
  if (errorEl) {
    errorEl.classList.remove("show");
  }
}

// Limpar todos os erros de um formulário
function clearErrors(errorIds) {
  for (var i = 0; i < errorIds.length; i++) {
    hideError(errorIds[i]);
  }
}

// ---- LOGIN ----
function handleLogin() {
  var emailInput = document.getElementById("login-email");
  var senhaInput = document.getElementById("login-senha");

  if (!emailInput || !senhaInput) return;

  var email = emailInput.value.trim();
  var senha = senhaInput.value;
  var isValid = true;

  // Limpar erros anteriores
  clearErrors(["login-email-error", "login-senha-error"]);

  // Validar e-mail
  if (!isValidEmail(email)) {
    showError("login-email-error");
    isValid = false;
  }

  // Validar senha (mínimo 6 caracteres)
  if (senha.length < 6) {
    showError("login-senha-error");
    isValid = false;
  }

  if (!isValid) {
    alert("Por favor, corrija os campos destacados em vermelho.");
    return;
  }

  // Simular verificação de credenciais
  loginAttempts++;

  if (loginAttempts > maxLoginAttempts) {
    alert("Você excedeu o número máximo de tentativas (" + maxLoginAttempts + "). Tente novamente mais tarde.");
    var btnLogin = document.getElementById("btn-login");
    if (btnLogin) {
      btnLogin.disabled = true;
      btnLogin.textContent = "Bloqueado";
      btnLogin.style.background = "#64748B";
    }
    return;
  }

  // Login "demo" - aceita qualquer e-mail válido + senha >= 6 chars
  isLoggedIn = true;
  userName = email.substring(0, email.indexOf("@"));

  // Capitalizar primeira letra do nome
  userName = userName.charAt(0).toUpperCase() + userName.substring(1);

  alert("Bem-vindo(a) ao JOVI Modo Aula, " + userName + "!\n\nSeu login foi realizado com sucesso.");

  // Atualizar interface
  var btnLogin = document.getElementById("btn-login");
  if (btnLogin) {
    btnLogin.textContent = "Conectado ✓";
    btnLogin.style.background = "#10B981";
    btnLogin.disabled = true;
  }
}

// ---- FORMULÁRIO DE CONTATO ----
function handleContact() {
  var nomeInput = document.getElementById("contact-nome");
  var emailInput = document.getElementById("contact-email");
  var assuntoInput = document.getElementById("contact-assunto");
  var msgInput = document.getElementById("contact-msg");

  if (!nomeInput || !emailInput || !assuntoInput || !msgInput) return;

  var nome = nomeInput.value.trim();
  var email = emailInput.value.trim();
  var assunto = assuntoInput.value;
  var msg = msgInput.value.trim();
  var isValid = true;

  // Limpar erros anteriores
  clearErrors([
    "contact-nome-error",
    "contact-email-error",
    "contact-assunto-error",
    "contact-msg-error"
  ]);

  // Validar nome
  if (nome.length < 2) {
    showError("contact-nome-error");
    isValid = false;
  }

  // Validar e-mail
  if (!isValidEmail(email)) {
    showError("contact-email-error");
    isValid = false;
  }

  // Validar assunto
  if (assunto === "" || assunto === null) {
    showError("contact-assunto-error");
    isValid = false;
  }

  // Validar mensagem
  if (msg.length < 10) {
    showError("contact-msg-error");
    isValid = false;
  }

  if (!isValid) {
    alert("Por favor, preencha todos os campos corretamente.");
    return;
  }

  // Confirmação antes de enviar
  var confirmMsg = "Confirma o envio?\n\n";
  confirmMsg += "Nome: " + nome + "\n";
  confirmMsg += "E-mail: " + email + "\n";
  confirmMsg += "Assunto: " + assunto + "\n";
  confirmMsg += "Mensagem: " + msg.substring(0, 50) + "...";

  var confirmou = confirm(confirmMsg);

  if (confirmou) {
    alert("Mensagem enviada com sucesso, " + nome + "!\n\nEntraremos em contato em até 48 horas pelo e-mail " + email + ".");

    // Limpar formulário
    nomeInput.value = "";
    emailInput.value = "";
    assuntoInput.value = "";
    msgInput.value = "";
  }
}

// ---- EVENTOS DOM ----

// Adicionar feedback visual em tempo real nos campos
document.addEventListener("DOMContentLoaded", function() {

  // Feedback em tempo real: login email
  var loginEmail = document.getElementById("login-email");
  if (loginEmail) {
    loginEmail.addEventListener("input", function() {
      if (isValidEmail(this.value)) {
        this.style.borderColor = "#10B981";
        hideError("login-email-error");
      } else {
        this.style.borderColor = "";
      }
    });

    loginEmail.addEventListener("blur", function() {
      if (this.value.length > 0 && !isValidEmail(this.value)) {
        showError("login-email-error");
        this.style.borderColor = "#EF4444";
      }
    });
  }

  // Feedback em tempo real: login senha
  var loginSenha = document.getElementById("login-senha");
  if (loginSenha) {
    loginSenha.addEventListener("input", function() {
      if (this.value.length >= 6) {
        this.style.borderColor = "#10B981";
        hideError("login-senha-error");
      } else {
        this.style.borderColor = "";
      }
    });
  }

  // Feedback em tempo real: contact nome
  var contactNome = document.getElementById("contact-nome");
  if (contactNome) {
    contactNome.addEventListener("input", function() {
      if (this.value.trim().length >= 2) {
        hideError("contact-nome-error");
      }
    });
  }

  // Feedback em tempo real: contact email
  var contactEmail = document.getElementById("contact-email");
  if (contactEmail) {
    contactEmail.addEventListener("input", function() {
      if (isValidEmail(this.value)) {
        hideError("contact-email-error");
      }
    });
  }

  // Permitir Enter para submit no login
  var loginFields = document.querySelectorAll("#login-email, #login-senha");
  for (var i = 0; i < loginFields.length; i++) {
    loginFields[i].addEventListener("keydown", function(event) {
      if (event.key === "Enter") {
        handleLogin();
      }
    });
  }

  // Prompt de boas-vindas ao visitar a página (apenas uma vez)
  if (!sessionStorage.getItem("welcomed")) {
    var nomeVisitante = prompt("Bem-vindo ao JOVI Modo Aula! Qual é o seu nome?");
    if (nomeVisitante && nomeVisitante.trim().length > 0) {
      alert("Olá, " + nomeVisitante.trim() + "! Explore nossas funcionalidades ou faça login.");
    }
    sessionStorage.setItem("welcomed", "true");
  }
});
