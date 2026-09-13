/**
 * main.js — Hlavní vstupní bod JS
 * Inicializuje všechny moduly portfolia.
 * Autor: Jakub Sedlák | kubkic-code
 */

"use strict";

// -------------------------------------------------------------------------
// Nav scroll efekt
// -------------------------------------------------------------------------

function initNav() {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;

  const onScroll = () => {
    nav.classList.toggle("site-nav--scrolled", window.scrollY > 40);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
}

// -------------------------------------------------------------------------
// Hamburger menu (mobil)
// -------------------------------------------------------------------------

function initHamburger() {
  const btn = document.getElementById("hamburger-btn");
  const links = document.querySelector(".site-nav__links");
  if (!btn || !links) return;

  btn.addEventListener("click", () => {
    const isOpen = links.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", isOpen);
    btn.querySelector(".hamburger__line:nth-child(1)").style.transform = isOpen ? "translateY(7px) rotate(45deg)" : "";
    btn.querySelector(".hamburger__line:nth-child(2)").style.opacity = isOpen ? "0" : "";
    btn.querySelector(".hamburger__line:nth-child(3)").style.transform = isOpen ? "translateY(-7px) rotate(-45deg)" : "";
  });

  // Zavřít po kliknutí na odkaz
  links.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      links.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    });
  });
}

// -------------------------------------------------------------------------
// Project filtering (kategorie)
// -------------------------------------------------------------------------

function initProjectFilter() {
  const filterBtns = document.querySelectorAll("[data-filter]");
  const cards = document.querySelectorAll("[data-category]");

  if (!filterBtns.length || !cards.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.filter;

      // Aktualizace aktivního tlačítka
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Filtrování karet s plynulou animací
      cards.forEach(card => {
        const match = target === "all" || card.dataset.category === target;

        if (match) {
          card.style.display = "";
          // Micro-animation při zobrazení
          requestAnimationFrame(() => {
            card.style.opacity = "0";
            card.style.transform = "translateY(16px)";
            requestAnimationFrame(() => {
              card.style.transition = "opacity 300ms ease, transform 300ms ease";
              card.style.opacity = "1";
              card.style.transform = "translateY(0)";
            });
          });
        } else {
          card.style.opacity = "0";
          card.style.transform = "translateY(8px)";
          setTimeout(() => { card.style.display = "none"; }, 300);
        }
      });
    });
  });
}

// -------------------------------------------------------------------------
// Animace při scrollování (Intersection Observer — bez GSAP)
// -------------------------------------------------------------------------

function initScrollReveal() {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
  );

  targets.forEach(el => observer.observe(el));
}

// -------------------------------------------------------------------------
// Dynamické počítadlo statistik (animace čísel)
// -------------------------------------------------------------------------

function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  if (isNaN(target)) return;

  const duration = 1800;
  const start = performance.now();

  const step = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + (el.dataset.suffix || "");
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

function initCounters() {
  const counters = document.querySelectorAll("[data-target]");
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach(el => observer.observe(el));
}

// -------------------------------------------------------------------------
// Terminal drawer (klávesa ~ nebo tlačítko)
// -------------------------------------------------------------------------

function initTerminal() {
  const trigger = document.getElementById("terminal-trigger");
  const drawer  = document.getElementById("terminal-drawer");
  const overlay = document.getElementById("terminal-overlay");
  const closeBtn = document.getElementById("terminal-close");
  const input    = document.getElementById("terminal-input");
  const output   = document.getElementById("terminal-output");

  if (!drawer) return;

  const COMMANDS = {
    help: () => [
      "Dostupné příkazy:",
      "  help                — zobrazí tento text",
      "  projects            — vypíše všechny projekty",
      "  projects --cat ai   — filtruje AI projekty",
      "  cat author.md       — zobrazí bio autora",
      "  contact             — přesměruje na kontakt",
      "  easteregg           — odhalí tajné systémové příkazy",
      "  clear               — vymaže terminál",
    ],
    easteregg: () => [
      "⚡ [CLASSIFIED PROTOCOLS DETECTED]",
      "Dostupné tajné systémové příkazy:",
      "  suplex   — Seismický otřes obrazovky a explozivní rozpad/složení 3D sféry",
      "  esp32    — Celostránková bootovací sekvence MicroPythonu (ESP32 IoT hardware)",
      "  matrix   — Matrix digital rain + neonově zelený overdrive 3D sféry (5s)",
      "Napište libovolný z nich a stiskněte Enter.",
    ],
    suplex: () => {
      closeTerminal();
      if (window.scrollY > 50) {
        document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
      }
      if (window.ThreeScene && typeof window.ThreeScene.triggerSuplex === "function") {
        window.ThreeScene.triggerSuplex();
      }
      return [
        "💥 [SUPLEX PROTOCOL ENGAGED]",
        "Aktivuji seismický body shake a drtivě tříštím 3D sféru...",
        "Gravitační chaos spuštěn.",
      ];
    },
    esp32: () => {
      closeTerminal();
      runEsp32BootSequence();
      return ["📟 [HARDWARE RESET] Inicializuji UART0 MicroPython konzoli..."];
    },
    matrix: () => {
      closeTerminal();
      if (window.scrollY > 50) {
        document.getElementById("hero")?.scrollIntoView({ behavior: "smooth" });
      }
      runMatrixRain();
      return [
        "🟢 [NEURAL OVERRIDE] Jacking into Matrix stream...",
        "3D sféra přetaktována na 25x rychlost, digitální déšť aktivní (stiskněte ENTER pro ukončení).",
      ];
    },
    "cat author.md": () => [
      "# Jakub Sedlák — kubkic-code",
      "Vícenásobný mistr ČR v řecko-římském zápase.",
      "Stavbu vysoce efektivní Python nástroje.",
      "Stack: Python · Flask · Playwright · Groq AI · ESP32 · Docker",
      'Motto: "Automate everything. Compete in everything. Go all out."',
    ],
    clear: () => { output.innerHTML = ""; return []; },
    contact: () => {
      document.getElementById("contact").scrollIntoView({ behavior: "smooth" });
      closeTerminal();
      return ["Přesměrování na Contact Beacon..."];
    },
  };

  // -----------------------------------------------------------------------
  // Easter Egg Pomocné Funkce: ESP32 Bootloader & Matrix Digital Rain (Infinite do stisku Enter)
  // -----------------------------------------------------------------------
  function runEsp32BootSequence() {
    document.getElementById("esp32-boot-overlay")?.remove();

    const overlay = document.createElement("div");
    overlay.id = "esp32-boot-overlay";
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 100000;
      background: #030712;
      color: #10b981;
      font-family: 'Courier New', Courier, monospace;
      font-size: clamp(12px, 1.5vw, 15px);
      line-height: 1.6;
      padding: clamp(1.2rem, 3vw, 2.5rem);
      overflow-y: auto;
      box-sizing: border-box;
      pointer-events: all;
      opacity: 0;
      transition: opacity 0.3s ease;
      text-shadow: 0 0 8px rgba(16,185,129,0.7);
    `;

    const scanlines = document.createElement("div");
    scanlines.style.cssText = `
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.35) 3px);
      pointer-events: none;
      z-index: 2;
    `;
    overlay.appendChild(scanlines);

    const logContainer = document.createElement("pre");
    logContainer.style.cssText = `
      position: relative;
      z-index: 3;
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
    `;
    overlay.appendChild(logContainer);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
    });

    const lines = [
      "rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)",
      "configsip: 0, SPIWP:0xee",
      "clk_drv:0x00,q_drv:0x00,d_drv:0x00,cs0_drv:0x00,hd_drv:0x00,wp_drv:0x00",
      "mode:DIO, clock div:1",
      "load:0x3fff0030,len:1184",
      "load:0x40078000,len:13104",
      "entry 0x40080458",
      "I (32) boot: ESP-IDF v5.1-beta1 2nd stage bootloader",
      "I (46) boot: chip: ESP32-D0WD-V3 (240MHz dual core, 520KB SRAM)",
      "",
      "MicroPython v1.22.0 on 2024-02-14; ESP32 module with ESP32",
      'Type "help()" for more information.',
      "",
      ">>> import machine, network, uasyncio as asyncio",
      ">>> [BOOT] Loading kernel and FreeRTOS dual-core tasks... [OK]",
      ">>> [FS] Mounting SPIFFS filesystem on /flash... [OK] (1,482 KB free)",
      ">>> [PERIPH] Initializing SPI, I2C & GPIO pins... [OK]",
      ">>> [WIFI] Connecting to SSID: 'KUBKIC_LAB_IOT'...",
      ">>> [WIFI] Connected! IP: 192.168.1.137, GW: 192.168.1.1, DNS: 1.1.1.1",
      ">>> [SENSOR] Calibrating HX711 Load Cell & BME280 telemetry... [CALIBRATED]",
      ">>> [MQTT] Handshake with mqtt.kubkic-code.internal:1883... [CONNECTED]",
      ">>> [TELEGRAM] Starting webhook asynchronous polling daemon...",
      ">>> [SYSTEM READY] Executing main.py: Wrestling Bot online.",
      ">>> ⚡ All systems operational.",
      "",
      ">>> [SYSTEM READY] Stiskněte [ENTER] pro návrat do portfolia...",
    ];

    let isEspClosed = false;
    const closeEsp = () => {
      if (isEspClosed) return;
      isEspClosed = true;
      window.removeEventListener("keydown", onEspKey);
      clearInterval(interval);
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 350);
    };

    const onEspKey = (e) => {
      if (e.key === "Enter") {
        closeEsp();
      }
    };
    // Zpozdit připojení listeneru o 150ms, aby původní Enter z terminálu nebublal a nezavřel overlay
    setTimeout(() => {
      window.addEventListener("keydown", onEspKey);
    }, 150);

    let lineIdx = 0;
    const interval = setInterval(() => {
      if (lineIdx < lines.length) {
        logContainer.textContent += lines[lineIdx] + "\n";
        overlay.scrollTop = overlay.scrollHeight;
        lineIdx++;
      } else {
        clearInterval(interval);
      }
    }, 60);
  }

  function runMatrixRain() {
    if (window.ThreeScene && typeof window.ThreeScene.triggerMatrix === "function") {
      window.ThreeScene.triggerMatrix();
    }

    document.getElementById("matrix-rain-canvas")?.remove();
    document.getElementById("matrix-hint-badge")?.remove();

    const canvas = document.createElement("canvas");
    canvas.id = "matrix-rain-canvas";
    canvas.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 100001;
      opacity: 0;
      transition: opacity 0.35s ease;
    `;
    document.body.appendChild(canvas);

    // Pulzující nápověda pro ukončení stiskem Enter
    const hint = document.createElement("div");
    hint.id = "matrix-hint-badge";
    hint.style.cssText = `
      position: fixed;
      bottom: 2.5rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100002;
      background: rgba(3, 7, 18, 0.94);
      border: 1px solid #00ff66;
      color: #00ff66;
      font-family: monospace;
      font-size: clamp(11px, 1.2vw, 13px);
      font-weight: 600;
      padding: 10px 22px;
      border-radius: 9999px;
      box-shadow: 0 0 25px rgba(0,255,102,0.45);
      letter-spacing: 0.08em;
      pointer-events: none;
      transition: opacity 0.3s ease;
    `;
    hint.textContent = "⚡ MATRIX OVERDRIVE AKTIVNÍ — STISKNĚTE [ENTER] PRO UKONČENÍ";
    document.body.appendChild(hint);

    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const chars = "0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜXYZ";
    const fontSize = 16;
    const columns = Math.ceil(width / fontSize);
    const drops = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * -50);
    }

    let isRunning = true;
    let animId;

    const draw = () => {
      if (!isRunning) return;
      ctx.fillStyle = "rgba(3, 7, 18, 0.08)";
      ctx.fillRect(0, 0, width, height);

      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillStyle = "#ffffff";
        ctx.fillText(text, x, y);

        ctx.fillStyle = "#00ff66";
        ctx.fillText(text, x, y - fontSize);

        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animId = requestAnimationFrame(draw);
    };

    requestAnimationFrame(() => {
      canvas.style.opacity = "0.92";
      draw();
    });

    // Nekonečný běh — ukončení výhradně klávesou Enter
    let isMatrixTerminated = false;
    const onMatrixKey = (e) => {
      if (e.key === "Enter" && !isMatrixTerminated) {
        isMatrixTerminated = true;
        window.removeEventListener("keydown", onMatrixKey);
        if (window.ThreeScene && typeof window.ThreeScene.stopMatrix === "function") {
          window.ThreeScene.stopMatrix();
        }
        canvas.style.opacity = "0";
        hint.style.opacity = "0";
        setTimeout(() => {
          isRunning = false;
          cancelAnimationFrame(animId);
          window.removeEventListener("resize", onResize);
          canvas.remove();
          hint.remove();
        }, 350);
      }
    };
    // Zpozdit připojení listeneru o 150ms, aby původní Enter z terminálu nebublal a nezavřel matrix
    setTimeout(() => {
      window.addEventListener("keydown", onMatrixKey);
    }, 150);
  }

  function printLines(lines, cls = "terminal-line--output") {
    lines.forEach(text => {
      const div = document.createElement("div");
      div.className = `terminal-line ${cls}`;
      div.textContent = text;
      output.appendChild(div);
    });
    output.scrollTop = output.scrollHeight;
  }

  function runCommand(raw) {
    const cmd = raw.trim().toLowerCase();

    // Přidat echo vstupu
    const echo = document.createElement("div");
    echo.className = "terminal-line terminal-line--input";
    echo.innerHTML = `<span class="terminal-prompt">➜ kubkic ~/portfolio</span><span>${raw}</span>`;
    output.appendChild(echo);

    // Nalezení příkazu
    let handler = COMMANDS[cmd];

    // Podpora projects --cat X
    if (!handler && cmd.startsWith("projects")) {
      const catMatch = cmd.match(/--cat\s+(\S+)/);
      handler = () => {
        const catFilter = catMatch ? catMatch[1] : null;
        // Filtrování v UI
        if (catFilter) {
          document.querySelector(`[data-filter="${catFilter}"]`)?.click();
        } else {
          document.querySelector('[data-filter="all"]')?.click();
        }
        document.getElementById("projects").scrollIntoView({ behavior: "smooth" });
        closeTerminal();
        return [`Filtruji projekty: ${catFilter || "all"}...`];
      };
    }

    if (handler) {
      const lines = handler();
      if (lines && lines.length) printLines(lines);
    } else {
      printLines([`Příkaz '${raw}' nebyl nalezen. Zadejte 'help'.`], "terminal-line--error");
    }
  }

  function openTerminal() {
    drawer.classList.add("open");
    overlay.classList.add("open");
    setTimeout(() => input?.focus(), 350);
  }

  function closeTerminal() {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
  }

  // Otevření
  trigger?.addEventListener("click", openTerminal);
  overlay?.addEventListener("click", closeTerminal);
  closeBtn?.addEventListener("click", closeTerminal);
  drawer.querySelector(".terminal-input-line")?.addEventListener("click", () => input?.focus());

  // Klávesa ~
  window.addEventListener("keydown", (e) => {
    if (e.key === "`" || e.key === "~") {
      e.preventDefault();
      drawer.classList.contains("open") ? closeTerminal() : openTerminal();
    }
    if (e.key === "Escape" && drawer.classList.contains("open")) {
      closeTerminal();
    }
  });

  // Odeslání příkazu
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.stopPropagation();
      const val = input.value;
      input.value = "";
      if (val.trim()) runCommand(val);
    }
  });

  // Úvodní zpráva
  printLines([
    "kubkic-portfolio v2.0 | Python · Flask · Three.js",
    'Pro seznam příkazů zadejte: help',
  ], "terminal-line--info");
}

// -------------------------------------------------------------------------
// 3D Card Tilt efekt (bez Three.js)
// -------------------------------------------------------------------------

function initCardTilt() {
  const cards = document.querySelectorAll(".project-card");

  cards.forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rotX = ((y - cy) / cy) * -8;
      const rotY = ((x - cx) / cx) * 8;

      card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

// -------------------------------------------------------------------------
// Contact form (AJAX odeslání)
// -------------------------------------------------------------------------

function initContactForm() {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("contact-status");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = {
      name: form.name.value,
      email: form.email.value,
      message: form.message.value,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (status) {
        status.textContent = json.success ? json.message : json.error;
        status.className = `contact-status ${json.success ? "success" : "error"}`;
        setTimeout(() => { status.textContent = ""; status.className = ""; }, 5000);
      }

      if (json.success) form.reset();
    } catch (err) {
      if (status) {
        status.innerHTML = 'Nepodařilo se kontaktovat server. Napište mi prosím přímo na <a href="mailto:sedlak.jaku11@gmail.com" style="color: var(--color-cyan); text-decoration: underline;">sedlak.jaku11@gmail.com</a>.';
        status.className = "contact-status error";
      }
    }
  });
}

// -------------------------------------------------------------------------
// Custom magnetický kurzor
// -------------------------------------------------------------------------

function initCustomCursor() {
  const cursor = document.getElementById("custom-cursor");
  if (!cursor || window.matchMedia("(pointer: coarse)").matches) {
    cursor?.remove();
    return;
  }

  let mouseX = 0, mouseY = 0;
  let curX = 0, curY = 0;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  const interactives = document.querySelectorAll("a, button, .project-card, .filter-btn, .btn");
  interactives.forEach(el => {
    el.addEventListener("mouseenter", () => cursor.classList.add("cursor--hover"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("cursor--hover"));
  });

  function animateCursor() {
    curX += (mouseX - curX) * 0.28;
    curY += (mouseY - curY) * 0.28;
    cursor.style.transform = `translate(${curX - 20}px, ${curY - 20}px)`;
    requestAnimationFrame(animateCursor);
  }

  animateCursor();
}

// -------------------------------------------------------------------------
// Bootstrap
// -------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // Nav hamburger (mobil)
  initNav();
  initHamburger();

  // Terminal drawer (klávesa ~)
  initTerminal();

  // Contact form AJAX
  initContactForm();

  // Custom kurzor (magnetický)
  initCustomCursor();

  // POZNÁMKA: Následující funkce jsou nyní řízeny GSAP moduly:
  // - initProjectFilter()  → project-grid.js (GSAP FLIP)
  // - initScrollReveal()   → gsap-animations.js (ScrollTrigger)
  // - initCounters()       → gsap-animations.js (GSAP ticker)
  // - initCardTilt()       → project-grid.js (specular highlight)

  // CSS fallback reveal pro případ, že GSAP selže
  if (typeof gsap === "undefined") {
    initScrollReveal();
    initCounters();
    initProjectFilter();
    initCardTilt();
  }

  console.log(
    "%c kubkic-portfolio v2.0 | THREE.js + GSAP ",
    "background:#6366F1;color:#fff;font-size:14px;font-family:monospace;padding:4px 8px;border-radius:4px;"
  );
});
