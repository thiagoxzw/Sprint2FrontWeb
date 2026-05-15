// =============================================
// JOVI MODO AULA - Slideshow de Funcionalidades
// Sprint 2 - Web Development
// Equipe NextStage
// Manipulação de imagens (slideshow) + DOM Events
// =============================================

// Dados do slideshow
var slides = [
  {
    icon: "📂",
    title: "Organização por Matéria",
    desc: "Selecione a disciplina e todas as fotos são salvas automaticamente na pasta correta."
  },
  {
    icon: "📝",
    title: "OCR Inteligente com Gemini",
    desc: "Extraia texto de lousas e livros com um toque. Resultado editável e compartilhável."
  },
  {
    icon: "🧠",
    title: "IA Assistente de Captura",
    desc: "Alertas em tempo real sobre reflexo, foco e iluminação antes de você fotografar."
  },
  {
    icon: "📊",
    title: "Captura Automática de Slides",
    desc: "A câmera detecta mudanças de slide projetado e captura automaticamente para você."
  }
];

var currentSlide = 0;
var autoPlayInterval = null;

// Função para atualizar o slide exibido
function updateSlide() {
  var slide = slides[currentSlide];
  var iconEl = document.getElementById("slide-icon");
  var titleEl = document.getElementById("slide-title");
  var descEl = document.getElementById("slide-desc");
  var counterEl = document.getElementById("slide-counter");

  if (iconEl && titleEl && descEl && counterEl) {
    // Efeito de fade
    iconEl.style.opacity = "0";
    titleEl.style.opacity = "0";
    descEl.style.opacity = "0";

    setTimeout(function() {
      iconEl.textContent = slide.icon;
      titleEl.textContent = slide.title;
      descEl.textContent = slide.desc;
      counterEl.textContent = (currentSlide + 1) + " / " + slides.length;

      iconEl.style.opacity = "1";
      titleEl.style.opacity = "1";
      descEl.style.opacity = "1";
    }, 200);
  }
}

// Navegar para o próximo slide
function nextSlide() {
  currentSlide = (currentSlide + 1) % slides.length;
  updateSlide();
  resetAutoPlay();
}

// Navegar para o slide anterior
function prevSlide() {
  currentSlide = (currentSlide - 1 + slides.length) % slides.length;
  updateSlide();
  resetAutoPlay();
}

// Auto-play: troca de slide a cada 4 segundos
function startAutoPlay() {
  autoPlayInterval = setInterval(function() {
    nextSlide();
  }, 4000);
}

function resetAutoPlay() {
  if (autoPlayInterval) {
    clearInterval(autoPlayInterval);
  }
  startAutoPlay();
}

// Navegação por teclado (setas esquerda/direita)
document.addEventListener("keydown", function(event) {
  if (event.key === "ArrowRight") {
    nextSlide();
  } else if (event.key === "ArrowLeft") {
    prevSlide();
  }
});

// Adicionar transição CSS via JS
document.addEventListener("DOMContentLoaded", function() {
  var fadeElements = ["slide-icon", "slide-title", "slide-desc"];
  for (var i = 0; i < fadeElements.length; i++) {
    var el = document.getElementById(fadeElements[i]);
    if (el) {
      el.style.transition = "opacity 0.2s ease";
    }
  }
  // Iniciar auto-play
  startAutoPlay();
});
