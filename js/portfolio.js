(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!prefersReduced) {
    const canvas = document.getElementById("particleCanvas");
    const color = canvas?.dataset.particleColor || "#ffffff";
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let W, H;
    let particles = [];

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    }

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.alpha = Math.random() * 0.4 + 0.1;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) {
          this.reset();
        }
      }

      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function initParticles() {
      const count = Math.min(Math.floor((W * H) / 12000), 100);
      particles = Array.from({ length: count }, () => new Particle());
    }

    function loop() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(loop);
    }

    window.addEventListener("resize", () => {
      resize();
      initParticles();
    });

    resize();
    initParticles();
    loop();
  }

  const skillCards = document.querySelectorAll(".skill-card");
  if (skillCards.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15 }
    );
    skillCards.forEach((card) => observer.observe(card));
  }

  const workCards = document.querySelectorAll(".work-card");
  if (workCards.length) {
    const workObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15 }
    );
    workCards.forEach((card) => workObserver.observe(card));
  }

  const filters = document.querySelectorAll(".works-filter");
  if (filters.length) {
    filters.forEach((btn) => {
      btn.addEventListener("click", () => {
        const filter = btn.dataset.filter;
        filters.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        workCards.forEach((card) => {
          if (filter === "all" || card.dataset.category === filter) {
            card.classList.remove("hidden");
          } else {
            card.classList.add("hidden");
          }
        });
      });
    });
  }

  const nav = document.querySelector(".nav");
  let lastScroll = 0;
  window.addEventListener("scroll", () => {
    const sy = window.scrollY;
    if (sy > lastScroll && sy > 100) {
      nav.style.transform = "translateY(-100%)";
    } else {
      nav.style.transform = "translateY(0)";
    }
    lastScroll = sy;
  });
})();
