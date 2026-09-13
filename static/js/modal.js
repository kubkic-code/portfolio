/**
 * modal.js — Holo-Inspector: Project Detail Modal
 * Karta se 3D expanduje a zaujme viewport s glassmorphism detailem
 * Autor: Jakub Sedlák | kubkic-code
 *
 * Závislosti: GSAP 3.12.x (CDN), portfolio_data přes /api/projects/<id>
 */

"use strict";

(function HoloModal() {

  // -----------------------------------------------------------------------
  // Cache dat projektů (lazy load)
  // -----------------------------------------------------------------------
  const projectCache = {};

  async function fetchProject(id) {
    if (projectCache[id]) return projectCache[id];

    // 1. Zkusit načíst z vložených globálních dat (okamžité a funguje i na GitHub Pages)
    if (window.__PORTFOLIO_DATA__ && Array.isArray(window.__PORTFOLIO_DATA__.projects)) {
      const match = window.__PORTFOLIO_DATA__.projects.find((p) => p.id === id);
      if (match) {
        projectCache[id] = match;
        return match;
      }
    }

    // 2. Fallback na REST API backend
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      projectCache[id] = data;
      return data;
    } catch (e) {
      console.error("[HoloModal] Nepodařilo se načíst projekt:", e);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // HTML modal struktura (vložena do DOMu jednou)
  // -----------------------------------------------------------------------
  function createModalDOM() {
    if (document.getElementById("holo-modal")) return;

    const overlay = document.createElement("div");
    overlay.id = "holo-modal-overlay";
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 5000;
      background: rgba(0,0,0,0);
      backdrop-filter: blur(0px);
      -webkit-backdrop-filter: blur(0px);
      display: flex; align-items: center; justify-content: center;
      pointer-events: none;
      transition: background 0.4s ease;
    `;

    const modal = document.createElement("div");
    modal.id = "holo-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "modal-title");
    modal.style.cssText = `
      background: rgba(15,19,28,0.92);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(99,102,241,0.25);
      border-radius: 20px;
      width: min(900px, 94vw);
      max-height: 88vh;
      overflow-y: auto;
      padding: 0;
      opacity: 0;
      transform: scale(0.85) translateY(30px);
      box-shadow: 0 0 80px rgba(99,102,241,0.2), 0 40px 80px rgba(0,0,0,0.6);
      scrollbar-width: thin;
      scrollbar-color: rgba(99,102,241,0.3) transparent;
      position: relative;
    `;

    modal.innerHTML = `
      <!-- Neon top border -->
      <div style="position:absolute;top:0;left:0;right:0;height:2px;
                  background:linear-gradient(90deg,transparent,#6366F1,#06B6D4,transparent);
                  box-shadow:0 0 20px rgba(99,102,241,0.6);border-radius:20px 20px 0 0;"></div>

      <!-- Header -->
      <div id="modal-header" style="
        display:flex;align-items:flex-start;justify-content:space-between;
        padding:2rem 2rem 1.5rem;
        border-bottom:1px solid rgba(255,255,255,0.07);
        gap:1rem;
      ">
        <div style="flex:1;">
          <div id="modal-badge" style="margin-bottom:0.75rem;"></div>
          <h2 id="modal-title" style="
            font-family:'Space Grotesk',sans-serif;font-size:clamp(1.5rem,4vw,2.2rem);
            font-weight:800;letter-spacing:-0.03em;color:#F1F5F9;margin:0 0 0.4rem;
          "></h2>
          <p id="modal-subtitle" style="
            font-family:'JetBrains Mono',monospace;font-size:0.875rem;
            color:#06B6D4;margin:0;
          "></p>
        </div>
        <button id="modal-close" aria-label="Zavřít detail projektu"
          style="
            background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);
            border-radius:50%;width:40px;height:40px;color:#94A3B8;font-size:1.25rem;
            cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;
            transition:all 0.2s ease;
          "
          onmouseenter="this.style.background='rgba(99,102,241,0.2)';this.style.color='#fff';"
          onmouseleave="this.style.background='rgba(255,255,255,0.06)';this.style.color='#94A3B8';"
        >&times;</button>
      </div>

      <!-- Body -->
      <div style="padding:1.5rem 2rem 2rem;display:flex;flex-direction:column;gap:1.5rem;">

        <!-- Popis -->
        <p id="modal-desc" style="
          color:#CBD5E1;font-size:1rem;line-height:1.75;margin:0;
        "></p>

        <!-- Metriky / Highlights -->
        <div>
          <h3 style="
            font-family:'Space Grotesk',sans-serif;font-size:0.75rem;letter-spacing:0.12em;
            text-transform:uppercase;color:#6366F1;margin:0 0 0.75rem;
          ">◆ Klíčové vlastnosti</h3>
          <ul id="modal-highlights" style="
            list-style:none;padding:0;margin:0;
            display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:0.6rem;
          "></ul>
        </div>

        <!-- Tech stack -->
        <div>
          <h3 style="
            font-family:'Space Grotesk',sans-serif;font-size:0.75rem;letter-spacing:0.12em;
            text-transform:uppercase;color:#06B6D4;margin:0 0 0.75rem;
          ">⚙ Technologický stack</h3>
          <div id="modal-techs" style="display:flex;flex-wrap:wrap;gap:0.5rem;"></div>
        </div>

        <!-- Akce -->
        <div id="modal-actions" style="
          display:flex;gap:1rem;flex-wrap:wrap;padding-top:0.5rem;
          border-top:1px solid rgba(255,255,255,0.07);
        "></div>

      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close tlačítko
    document.getElementById("modal-close").addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    // Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.style.pointerEvents === "all") closeModal();
    });
  }

  // -----------------------------------------------------------------------
  // Otevření modalu
  // -----------------------------------------------------------------------
  async function openModal(projectId, sourceCard) {
    createModalDOM();

    const overlay = document.getElementById("holo-modal-overlay");
    const modal   = document.getElementById("holo-modal");

    // Načíst data
    const project = await fetchProject(projectId);
    if (!project) return;

    // Naplnit obsah
    fillModalContent(project);

    // Zobrazit overlay
    overlay.style.pointerEvents = "all";

    // Animace — expand ze sourceCard (pokud je definován)
    if (typeof gsap !== "undefined") {
      // Blur overlay
      gsap.to(overlay, {
        backgroundColor: "rgba(0,0,0,0.75)",
        duration: 0.35,
        ease: "power2.out",
        onStart: () => {
          overlay.style.backdropFilter = "blur(12px)";
          overlay.style.webkitBackdropFilter = "blur(12px)";
        },
      });

      // Modal entrance
      gsap.fromTo(modal,
        { opacity: 0, scale: 0.88, y: 40 },
        { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: "back.out(1.4)" }
      );
    } else {
      overlay.style.background = "rgba(0,0,0,0.75)";
      modal.style.opacity = "1";
      modal.style.transform = "none";
    }

    // Focus management
    modal.scrollTop = 0;
    setTimeout(() => document.getElementById("modal-close")?.focus(), 100);

    // Body scroll lock
    document.body.style.overflow = "hidden";
  }

  // -----------------------------------------------------------------------
  // Naplnění obsahu
  // -----------------------------------------------------------------------
  function fillModalContent(project) {
    // Badge
    const badgeColors = {
      "ai-data":            { bg: "rgba(6,182,212,0.15)",   color: "#22D3EE", border: "rgba(6,182,212,0.3)" },
      "scraping-arbitrage": { bg: "rgba(245,158,11,0.15)",  color: "#FCD34D", border: "rgba(245,158,11,0.3)" },
      "automation-bots":    { bg: "rgba(99,102,241,0.15)",  color: "#818CF8", border: "rgba(99,102,241,0.3)" },
      "iot-hardware":       { bg: "rgba(16,185,129,0.15)",  color: "#34D399", border: "rgba(16,185,129,0.3)" },
      "web-creative":       { bg: "rgba(99,102,241,0.15)",  color: "#818CF8", border: "rgba(99,102,241,0.3)" },
    };
    const bc = badgeColors[project.category] || badgeColors["web-creative"];
    const badgeEl = document.getElementById("modal-badge");
    if (badgeEl && project.badge) {
      badgeEl.innerHTML = `
        <span style="
          display:inline-flex;align-items:center;padding:0.2rem 0.75rem;
          border-radius:999px;font-family:'JetBrains Mono',monospace;font-size:0.7rem;
          letter-spacing:0.08em;text-transform:uppercase;
          background:${bc.bg};color:${bc.color};border:1px solid ${bc.border};
        ">${project.badge}</span>
      `;
    }

    // Texty
    setText("modal-title",    project.title    || "");
    setText("modal-subtitle", project.subtitle || "");
    setText("modal-desc",     project.full_description || project.short_description || "");

    // Highlights
    const hlEl = document.getElementById("modal-highlights");
    if (hlEl) {
      hlEl.innerHTML = (project.highlights || []).map((hl) => `
        <li style="
          display:flex;gap:0.6rem;align-items:flex-start;
          font-size:0.875rem;color:#94A3B8;line-height:1.5;
          background:rgba(99,102,241,0.05);border:1px solid rgba(99,102,241,0.12);
          border-radius:8px;padding:0.6rem 0.75rem;
        ">
          <span style="color:#06B6D4;flex-shrink:0;margin-top:2px;">◆</span>
          <span>${hl}</span>
        </li>
      `).join("");
    }

    // Technologie
    const techEl = document.getElementById("modal-techs");
    if (techEl) {
      techEl.innerHTML = (project.technologies || []).map((tech) => `
        <span style="
          display:inline-flex;align-items:center;padding:0.25rem 0.6rem;
          border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:0.7rem;
          background:rgba(99,102,241,0.08);color:#94A3B8;
          border:1px solid rgba(99,102,241,0.15);
        ">${tech}</span>
      `).join("");
    }

    // Akce
    const actEl = document.getElementById("modal-actions");
    if (actEl) {
      actEl.innerHTML = "";
      if (project.github_url) {
        actEl.innerHTML += `
          <a href="${project.github_url}" target="_blank" rel="noopener noreferrer"
             style="
               display:inline-flex;align-items:center;gap:0.5rem;
               padding:0.6rem 1.25rem;border-radius:10px;
               background:linear-gradient(135deg,#6366F1,#4F46E5);
               color:#fff;font-family:'Space Grotesk',sans-serif;
               font-weight:600;font-size:0.875rem;text-decoration:none;
               transition:all 0.2s ease;
               box-shadow:0 0 20px rgba(99,102,241,0.3);
             "
             onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 0 30px rgba(99,102,241,0.5)';"
             onmouseleave="this.style.transform='';this.style.boxShadow='0 0 20px rgba(99,102,241,0.3)';"
          >GitHub ↗</a>
        `;
      }
      actEl.innerHTML += `
        <button onclick="window.HoloModal.close()" style="
          padding:0.6rem 1.25rem;border-radius:10px;
          background:transparent;border:1px solid rgba(99,102,241,0.4);
          color:#94A3B8;font-family:'Space Grotesk',sans-serif;
          font-size:0.875rem;cursor:pointer;transition:all 0.2s ease;
        "
        onmouseenter="this.style.borderColor='#6366F1';this.style.color='#fff';"
        onmouseleave="this.style.borderColor='rgba(99,102,241,0.4)';this.style.color='#94A3B8';"
        >Zavřít</button>
      `;
    }
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // -----------------------------------------------------------------------
  // Zavření modalu
  // -----------------------------------------------------------------------
  function closeModal() {
    const overlay = document.getElementById("holo-modal-overlay");
    const modal   = document.getElementById("holo-modal");
    if (!overlay) return;

    if (typeof gsap !== "undefined") {
      gsap.to(modal, {
        opacity: 0, scale: 0.9, y: 20,
        duration: 0.3, ease: "power2.in",
      });
      gsap.to(overlay, {
        backgroundColor: "rgba(0,0,0,0)",
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          overlay.style.pointerEvents = "none";
          overlay.style.backdropFilter = "blur(0px)";
          overlay.style.webkitBackdropFilter = "blur(0px)";
        },
      });
    } else {
      overlay.style.pointerEvents = "none";
    }

    document.body.style.overflow = "";
  }

  // -----------------------------------------------------------------------
  // Veřejné API
  // -----------------------------------------------------------------------
  window.HoloModal = {
    open:  openModal,
    close: closeModal,
  };

  // -----------------------------------------------------------------------
  // Bootstrap
  // -----------------------------------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createModalDOM);
  } else {
    createModalDOM();
  }

})();
