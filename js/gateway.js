/**
 * Gateway - ASH BORDERS V2
 * Auto-detects button positions, no hardcoded coordinates
 */

(function () {
  "use strict";

  const canvas = document.getElementById("particleCanvas");
  const ctx = canvas.getContext("2d");
  const btnDev = document.getElementById("btnDev");
  const btnEditor = document.getElementById("btnEditor");
  const contentDev = document.getElementById("contentDev");
  const contentEditor = document.getElementById("contentEditor");
  const sideDev = document.getElementById("sideDev");
  const sideEditor = document.getElementById("sideEditor");

  let W, H, isMobile;
  let particles = [];
  let borderParticles = [];
  let phase = "waiting";
  let buttonsRevealed = false;

  const SETTINGS = {
    lineRows: 3,
    lineStartY: -100,
    lineMinSize: 3,
    lineMaxSize: 7,
    lineMinSpeed: 5,
    lineMaxSpeed: 11,
    spreadMinForce: 8,
    spreadMaxForce: 30,
    cardRatio: 4,
    buttonRatio: 1,
    cardInsetX: 0.4, // ← Width inset (0.18 = 18% from each edge)
    cardInsetY: 0.2, // ← Height inset (0.2 = 20% from top/bottom)
    cardMaxInsetX: 250, // ← Max width inset in pixels
    cardMaxInsetY: 200, // ← Max height inset in pixels
  };

  // ============================================
  // RESIZE
  // ============================================
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    isMobile = W < 769;
    canvas.width = W;
    canvas.height = H;
    Object.assign(canvas.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      zIndex: "5",
      pointerEvents: "none",
    });
    if (phase === "done") {
      updateAllBounds();
    }
  }

  // ============================================
  // AUTO-DETECT BUTTON BOUNDS
  // ============================================
  function getButtonBounds(side) {
    const btn = side === "dev" ? btnDev : btnEditor;
    const rect = btn.getBoundingClientRect();

    // If button is visible, use its real position
    if (rect.width > 0 && rect.height > 0) {
      return {
        l: rect.left,
        t: rect.top,
        r: rect.right,
        b: rect.bottom,
        w: rect.width,
        h: rect.height,
      };
    }

    // Fallback: estimate from side panel (only used during animation)
    const sideEl = side === "dev" ? sideDev : sideEditor;
    const sr = sideEl.getBoundingClientRect();
    const bw = isMobile ? Math.min(W * 0.48, 210) : 210;
    const bh = isMobile ? 46 : 60;
    const by = sr.top + sr.height * (isMobile ? 0.725 : 0.645);
    const cx = sr.left + sr.width / 2;

    return {
      l: cx - bw / 2,
      t: by - bh / 2,
      r: cx + bw / 2,
      b: by + bh / 2,
      w: bw,
      h: bh,
    };
  }

  // ============================================
  // AUTO-DETECT CARD BOUNDS
  // ============================================
  function getCardBounds(side) {
    const el = side === "dev" ? sideDev : sideEditor;
    const rect = el.getBoundingClientRect();
    const ix = Math.min(
      rect.width * SETTINGS.cardInsetX,
      SETTINGS.cardMaxInsetX,
    );
    const iy = Math.min(
      rect.height * SETTINGS.cardInsetY,
      SETTINGS.cardMaxInsetY,
    );

    return {
      l: rect.left + ix,
      t: rect.top + iy,
      r: rect.right - ix,
      b: rect.bottom - iy,
      w: rect.width - ix * 2,
      h: rect.height - iy * 2,
    };
  }

  // ============================================
  // UPDATE ALL BORDER PARTICLE POSITIONS
  // ============================================
  function updateAllBounds() {
    const devCard = getCardBounds("dev");
    const editorCard = getCardBounds("editor");
    const devBtn = getButtonBounds("dev");
    const editorBtn = getButtonBounds("editor");

    borderParticles.forEach((p) => {
      if (p.type === "card") {
        p.bounds = p.side === "dev" ? devCard : editorCard;
      } else {
        p.bounds = p.side === "dev" ? devBtn : editorBtn;
      }
    });
  }

  // ============================================
  // EDGE POINTS
  // ============================================
  const edgeFns = {
    top: (b) => ({ x: b.l + Math.random() * b.w, y: b.t }),
    bottom: (b) => ({ x: b.l + Math.random() * b.w, y: b.b }),
    left: (b) => ({ x: b.l, y: b.t + Math.random() * b.h }),
    right: (b) => ({ x: b.r, y: b.t + Math.random() * b.h }),
  };

  function pillPoint(b) {
    const r = b.h / 2,
      sl = b.w - 2 * r,
      al = Math.PI * r,
      tot = 2 * sl + 2 * al;
    let p = Math.random() * tot;
    if (p < sl) return { x: b.l + r + p, y: b.t };
    p -= sl;
    if (p < al) {
      const a = -Math.PI / 2 + (p / al) * Math.PI;
      return { x: b.r - r + Math.cos(a) * r, y: b.t + r + Math.sin(a) * r };
    }
    p -= al;
    if (p < sl) return { x: b.r - r - p, y: b.b };
    p -= sl;
    const a = Math.PI / 2 + (p / al) * Math.PI;
    return { x: b.l + r + Math.cos(a) * r, y: b.t + r + Math.sin(a) * r };
  }

  // ============================================
  // PARTICLE
  // ============================================
  class Particle {
    constructor(x, y, color, size, side) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.size = size;
      this.vx = 0;
      this.vy = 0;
      this.alpha = 0.5;
      this.onGround = false;
      this.gathering = false;
      this.tx = 0;
      this.ty = 0;
      this.gProg = 0;
      this.gSpd = 0.02 + Math.random() * 0.04;
      this.onBorder = false;
      this.type = null;
      this.bounds = null;
      this.wTimer = 0;
      this.edge = null;
      this.side = side;
    }

    update() {
      if (this.onBorder && this.bounds) {
        if (++this.wTimer > 30 + Math.random() * 60) {
          this.wTimer = 0;
          const pt =
            this.type === "card" && this.edge
              ? edgeFns[this.edge](this.bounds)
              : pillPoint(this.bounds);
          this.tx = pt.x;
          this.ty = pt.y;
        }
        this.x += (this.tx - this.x) * 0.06;
        this.y += (this.ty - this.y) * 0.06;
        this.alpha = 0.35 + Math.sin(Date.now() * 0.003 + this.x * 0.1) * 0.1;
      } else if (this.gathering) {
        this.gProg += this.gSpd;
        const dx = this.tx - this.x,
          dy = this.ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1.5 && this.gProg < 1) {
          const s = Math.min(dist * 0.1, 8);
          this.x += (dx / dist) * s;
          this.y += (dy / dist) * s;
          this.alpha = 0.5;
        } else {
          if (this.type === "card" && this.bounds) {
            const b = this.bounds;
            const d = [
              Math.abs(this.y - b.t),
              Math.abs(this.y - b.b),
              Math.abs(this.x - b.l),
              Math.abs(this.x - b.r),
            ];
            const m = Math.min(...d);
            this.edge =
              d[0] === m
                ? "top"
                : d[1] === m
                  ? "bottom"
                  : d[2] === m
                    ? "left"
                    : "right";
          }
          this.onBorder = true;
          this.gathering = false;
          this.tx = this.x;
          this.ty = this.y;
        }
      } else if (phase === "falling") {
        this.vy += 0.8;
        this.y += this.vy;
        if (this.y >= H - 15) {
          this.y = H - 15;
          this.onGround = true;
        }
      } else if (phase === "spreading") {
        this.vx *= 0.994;
        this.vy *= 0.994;
        this.x += this.vx;
        this.y += this.vy;
        if (Math.abs(this.vx) + Math.abs(this.vy) < 0.25) this.alpha -= 0.003;
        if (this.x < 0) {
          this.x = 0;
          this.vx *= -0.5;
        }
        if (this.x > W) {
          this.x = W;
          this.vx *= -0.5;
        }
        if (this.y < 0) {
          this.y = 0;
          this.vy *= -0.5;
        }
        if (this.y > H) {
          this.y = H;
          this.vy *= -0.5;
        }
      }
      if (this.alpha < 0) this.alpha = 0;
    }

    draw() {
      if (this.alpha < 0.01 || this.size < 0.3) return;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.globalAlpha = this.alpha;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.size * 3;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ============================================
  // CREATE LINE
  // ============================================
  function createLine() {
    particles = [];
    const cols = Math.floor(W / 4),
      rows = SETTINGS.lineRows;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = (col / (cols - 1)) * W;
        const y = SETTINGS.lineStartY + row * 6 + (Math.random() - 0.5) * 3;
        const side = x < W / 2 ? "dev" : "editor";
        const color = side === "dev" ? "#000000" : "#ffffff";
        const size =
          SETTINGS.lineMinSize +
          Math.random() * (SETTINGS.lineMaxSize - SETTINGS.lineMinSize);
        const p = new Particle(x, y, color, size, side);
        p.vy =
          SETTINGS.lineMinSpeed +
          Math.random() * (SETTINGS.lineMaxSpeed - SETTINGS.lineMinSpeed);
        particles.push(p);
      }
    }
    phase = "falling";
  }

  // ============================================
  // SPREAD
  // ============================================
  function spreadOut() {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const a = Math.random() * Math.PI * 2;
      const f =
        SETTINGS.spreadMinForce +
        Math.random() * (SETTINGS.spreadMaxForce - SETTINGS.spreadMinForce);
      p.vx = Math.cos(a) * f;
      p.vy = Math.sin(a) * f;
      p.alpha = 0.5;
      p.onGround = false;
    }
    phase = "spreading";
  }

  // ============================================
  // GATHER
  // ============================================
  function gather() {
    const devCard = getCardBounds("dev");
    const editorCard = getCardBounds("editor");
    const devBtnBounds = getButtonBounds("dev");
    const editorBtnBounds = getButtonBounds("editor");
    const edges = ["top", "bottom", "left", "right"];

    if (isMobile) {
      const half = Math.floor(particles.length / 2);
      particles.forEach((p, i) => {
        const isDev = i < half;
        const bounds = isDev ? devBtnBounds : editorBtnBounds;
        const pt = pillPoint(bounds);
        p.tx = pt.x;
        p.ty = pt.y;
        p.gathering = true;
        p.gProg = 0;
        p.vx = 0;
        p.vy = 0;
        p.type = "button";
        p.bounds = bounds;
        p.side = isDev ? "dev" : "editor";
      });
    } else {
      const cardTargets = [
        { b: devCard, t: "card", s: "dev" },
        { b: editorCard, t: "card", s: "editor" },
      ];
      const buttonTargets = [
        { b: devBtnBounds, t: "button", s: "dev" },
        { b: editorBtnBounds, t: "button", s: "editor" },
      ];

      const totalRatio = SETTINGS.cardRatio * 2 + SETTINGS.buttonRatio * 2;
      const cardCount = Math.floor(
        particles.length * ((SETTINGS.cardRatio * 2) / totalRatio),
      );
      const shuffled = [...particles].sort(() => Math.random() - 0.5);
      const cardGroup = shuffled.slice(0, cardCount);
      const buttonGroup = shuffled.slice(cardCount);

      cardGroup.forEach((p) => {
        const t = cardTargets[Math.random() < 0.5 ? 0 : 1];
        const pt = edgeFns[edges[(Math.random() * 4) | 0]](t.b);
        p.tx = pt.x;
        p.ty = pt.y;
        p.gathering = true;
        p.gProg = 0;
        p.vx = 0;
        p.vy = 0;
        p.type = t.t;
        p.bounds = t.b;
        p.side = t.s;
      });

      const halfBtn = Math.floor(buttonGroup.length / 2);
      buttonGroup.forEach((p, i) => {
        const t = i < halfBtn ? buttonTargets[0] : buttonTargets[1];
        const pt = pillPoint(t.b);
        p.tx = pt.x;
        p.ty = pt.y;
        p.gathering = true;
        p.gProg = 0;
        p.vx = 0;
        p.vy = 0;
        p.type = t.t;
        p.bounds = t.b;
        p.side = t.s;
      });
    }
    phase = "gathering";
  }

  // ============================================
  // DONE
  // ============================================
  function done() {
    if (buttonsRevealed) return;
    buttonsRevealed = true;
    phase = "done";

    // Use real button positions now that they're visible
    updateAllBounds();

    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].onBorder) borderParticles.push(particles[i]);
    }
    particles = [];
    btnDev.classList.add("built");
    btnEditor.classList.add("built");
    setTimeout(() => {
      contentDev.classList.add("visible");
      contentEditor.classList.add("visible");
    }, 150);
    [btnDev, btnEditor].forEach((b) => {
      b.addEventListener(
        "mouseenter",
        () => (b.style.transform = "scale(1.05)"),
      );
      b.addEventListener("mouseleave", () => (b.style.transform = "scale(1)"));
    });

    // Re-update bounds after buttons are visible
    setTimeout(updateAllBounds, 200);
  }

  // ============================================
  // LOOP
  // ============================================
  function loop() {
    ctx.clearRect(0, 0, W, H);
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw();
      if (particles[i].alpha < 0.01) particles.splice(i, 1);
    }
    if (phase === "gathering") {
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].onBorder) {
          borderParticles.push(particles[i]);
          particles.splice(i, 1);
        }
      }
    }
    for (let i = 0; i < borderParticles.length; i++) {
      borderParticles[i].update();
      borderParticles[i].draw();
    }
    if (
      phase === "falling" &&
      particles.length &&
      particles.every((p) => p.onGround)
    )
      setTimeout(spreadOut, 30);
    if (phase === "spreading" && particles.length) {
      let sum = 0;
      for (let i = 0; i < particles.length; i++)
        sum += Math.abs(particles[i].vx) + Math.abs(particles[i].vy);
      if (sum / particles.length < 5) gather();
    }
    if (phase === "gathering" && !particles.length && borderParticles.length)
      setTimeout(done, 500);
    requestAnimationFrame(loop);
  }

  // ============================================
  // INIT
  // ============================================
  window.addEventListener("resize", resize);
  window.addEventListener("fullscreenchange", () => setTimeout(resize, 100));
  window.addEventListener("webkitfullscreenchange", () =>
    setTimeout(resize, 100),
  );
  window.addEventListener("load", () => {
    resize();
    loop();
    setTimeout(() => {
      resize();
      createLine();
    }, 500);
  });
  setTimeout(() => {
    if (!buttonsRevealed) {
      particles = [];
      phase = "done";
      buttonsRevealed = true;
      btnDev.classList.add("built");
      btnEditor.classList.add("built");
      contentDev.classList.add("visible");
      contentEditor.classList.add("visible");
    }
  }, 15000);
  document.addEventListener("touchmove", (e) => e.preventDefault(), {
    passive: false,
  });
})();
