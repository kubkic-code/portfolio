/**
 * gsap-animations.js — GSAP ScrollTrigger animace portfolia
 * TypeWriter efekt, kamera dolly-in, card entrance, parallax
 * Autor: Jakub Sedlák | kubkic-code
 *
 * Závislosti: GSAP 3.12.x + ScrollTrigger plugin (CDN)
 */

"use strict";

(function GSAPAnimations() {

  // -----------------------------------------------------------------------
  // Init — počkáme na GSAP
  // -----------------------------------------------------------------------
  function init() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.warn("[GSAP] Knihovny nejsou dostupné. Animace přeskočeny.");
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    document.body.classList.add("has-gsap");

    initTypeWriter();
    initHeroEntrance();
    initCameraDolly();
    initCardEntrance();
    initSectionReveals();
    initDualDriveCounters();
    initNavScroll();
  }

  // -----------------------------------------------------------------------
  // 1. TypeWriter efekt — střídání titulků
  // -----------------------------------------------------------------------
  function initTypeWriter() {
    const el = document.getElementById("typewriter-text");
    if (!el) return;

    const texts = [
      "Python Developer",
      "Automation Engineer",
      "AI Integrator",
      "Web Scraping Expert",
      "IoT Hardware Builder",
    ];

    let textIndex = 0;
    let charIndex  = 0;
    let isDeleting = false;
    let typingTimer;

    function type() {
      const current = texts[textIndex];

      if (isDeleting) {
        el.textContent = current.slice(0, charIndex - 1);
        charIndex--;
      } else {
        el.textContent = current.slice(0, charIndex + 1);
        charIndex++;
      }

      // Přepínání směru
      if (!isDeleting && charIndex === current.length) {
        // Pauza na konci slova
        isDeleting = true;
        typingTimer = setTimeout(type, 1800);
        return;
      }
      if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % texts.length;
        typingTimer = setTimeout(type, 300);
        return;
      }

      // Rychlost psaní
      const speed = isDeleting ? 40 : 75;
      typingTimer = setTimeout(type, speed);
    }

    // Startovní zpoždění
    setTimeout(type, 800);
  }

  // -----------------------------------------------------------------------
  // 2. Hero entrance — jméno + CTA vyjede při načtení
  // -----------------------------------------------------------------------
  function initHeroEntrance() {
    const tl = gsap.timeline({ delay: 0.2 });

    // Tagline
    tl.fromTo(
      "#hero-tagline",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
    );

    // Jméno — split na řádky
    tl.fromTo(
      "#hero-name",
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, ease: "power3.out" },
      "-=0.4"
    );

    // Bio
    tl.fromTo(
      "#hero-bio",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
      "-=0.5"
    );

    // TypeWriter wrapper
    tl.fromTo(
      "#hero-motto",
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" },
      "-=0.4"
    );

    // CTA tlačítka
    tl.fromTo(
      ".hero-cta .btn",
      { y: 25, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.12, duration: 0.7, ease: "back.out(1.5)" },
      "-=0.3"
    );
  }

  // -----------------------------------------------------------------------
  // 3. Camera Dolly-In — při scrollu dolů kamera letí do sféry
  // -----------------------------------------------------------------------
  function initCameraDolly() {
    const heroSection = document.getElementById("hero");
    if (!heroSection) return;

    // ScrollTrigger + Three.js kamera
    ScrollTrigger.create({
      trigger: heroSection,
      start: "top top",
      end: "bottom top",
      scrub: 1.5,
      onUpdate: (self) => {
        if (window.ThreeScene && window.ThreeScene.isReady()) {
          const defaultZ = window.ThreeScene.getDefaultZ();
          const targetZ  = window.ThreeScene.getCameraZ === undefined
            ? defaultZ
            : defaultZ;
          // Progress 0..1: kamera jde z defaultZ → CAMERA_Z_MIN (2.0)
          const newZ = defaultZ - self.progress * (defaultZ - 2.0);
          window.ThreeScene.setCameraZ(newZ);
        }

        // Canvas fade-out při opuštění Hero
        const heroCanvas = document.getElementById("hero-canvas");
        if (heroCanvas) {
          const opacity = Math.max(0, 1 - self.progress * 1.5);
          heroCanvas.style.opacity = opacity;
          heroCanvas.style.pointerEvents = "none";
          heroCanvas.style.visibility = opacity <= 0.01 ? "hidden" : "visible";
        }
      },
    });
  }

  // -----------------------------------------------------------------------
  // 4. Project Cards — vstup ze Z osy (translateZ) s stagger
  //
  // OPRAVA: Použití gsap.fromTo explicitně animuje do opacity: 1 a y: 0,
  // což zaručuje bezpečné a spolehlivé zobrazení karet po odscrollování.
  // -----------------------------------------------------------------------
  function initCardEntrance() {
    const cards = document.querySelectorAll(".project-card");
    if (!cards.length) return;

    // Perspektiva na grid kontejner
    const grid = document.getElementById("projects-grid");
    if (grid) {
      gsap.set(grid, { perspective: 1200 });
    }

    // Explicitní gsap.fromTo — bezpečné vyjetí z opacity 0 do opacity 1
    gsap.fromTo(
      ".project-card",
      {
        opacity: 0,
        y: 60,
        rotationX: 12,
      },
      {
        scrollTrigger: {
          trigger: "#projects",
          start: "top 85%",
          toggleActions: "play none none none",
        },
        opacity: 1,
        y: 0,
        rotationX: 0,
        stagger: {
          amount: 0.6,
          from: "start",
          ease: "power1.in",
        },
        duration: 0.85,
        ease: "power3.out",
        clearProps: "transform,rotationX",
        overwrite: "auto",
      }
    );
  }

  // -----------------------------------------------------------------------
  // 5. Reveal ostatních sekcí — všechny používají gsap.fromTo
  //    (explicitně animují do opacity: 1, y: 0 atd.)
  // -----------------------------------------------------------------------
  function initSectionReveals() {
    // 1. Stats karty (.stat-card)
    if (document.querySelectorAll(".stat-card").length) {
      gsap.fromTo(
        ".stat-card",
        {
          opacity: 0,
          y: 50,
        },
        {
          scrollTrigger: {
            trigger: "#stats",
            start: "top 85%",
            toggleActions: "play none none none",
          },
          opacity: 1,
          y: 0,
          stagger: 0.12,
          duration: 0.7,
          ease: "power3.out",
          overwrite: "auto",
        }
      );
    }

    // 2. Filter bar (.filter-bar)
    if (document.querySelector(".filter-bar")) {
      gsap.fromTo(
        ".filter-bar",
        {
          opacity: 0,
          y: 30,
        },
        {
          scrollTrigger: {
            trigger: "#projects",
            start: "top 88%",
            toggleActions: "play none none none",
          },
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: "power2.out",
          overwrite: "auto",
        }
      );
    }

    // 3. About sekce (.reveal v #about)
    if (document.querySelectorAll("#about .reveal").length) {
      gsap.fromTo(
        "#about .reveal",
        {
          opacity: 0,
          y: 40,
        },
        {
          scrollTrigger: {
            trigger: "#about",
            start: "top 80%",
            toggleActions: "play none none none",
          },
          opacity: 1,
          y: 0,
          stagger: 0.15,
          duration: 0.8,
          ease: "power3.out",
          overwrite: "auto",
        }
      );
    }

    // 4. Skill pills (.skill-pill)
    if (document.querySelectorAll(".skill-pill").length) {
      gsap.fromTo(
        ".skill-pill",
        {
          opacity: 0,
          scale: 0.8,
        },
        {
          scrollTrigger: {
            trigger: "#about",
            start: "top 65%",
            toggleActions: "play none none none",
          },
          opacity: 1,
          scale: 1,
          stagger: 0.04,
          duration: 0.5,
          ease: "back.out(2)",
          overwrite: "auto",
        }
      );
    }

    // 5. Dual Drive — nadpis sekce
    if (document.querySelector("#dual-drive .section-heading")) {
      gsap.fromTo(
        "#dual-drive .section-heading",
        {
          opacity: 0,
          y: 40,
        },
        {
          scrollTrigger: {
            trigger: "#dual-drive",
            start: "top 80%",
            toggleActions: "play none none none",
          },
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          overwrite: "auto",
        }
      );
    }

    // 6. Dual Drive karty (.dual-drive-card)
    if (document.querySelectorAll(".dual-drive-card").length) {
      gsap.fromTo(
        ".dual-drive-card",
        {
          opacity: 0,
          y: 50,          // Y offset místo X — neruší grid layout
          immediateRender: false,
        },
        {
          scrollTrigger: {
            trigger: "#dual-drive",
            start: "top 100%",
            once: true,
            toggleActions: "play none none none",
          },
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.2,
          ease: "power3.out",
          overwrite: "auto",
        }
      );
    }

    // 7. Dual Drive — VS blesk (.dual-drive-vs)
    if (document.querySelector(".dual-drive-vs")) {
      gsap.fromTo(
        ".dual-drive-vs",
        {
          opacity: 0,
          scale: 0,
          immediateRender: false,  // nepokatát opacity:0 okamžitě
        },
        {
          scrollTrigger: {
            trigger: "#dual-drive",
            start: "top 100%",
            once: true,
            toggleActions: "play none none none",
          },
          opacity: 1,
          scale: 1,
          duration: 0.7,
          delay: 0.4,
          ease: "back.out(2)",
          overwrite: "auto",
        }
      );
    }

    // 8. Dual Drive — citát
    const quoteEl = document.querySelector("#dual-drive blockquote");
    if (quoteEl) {
      const quoteWrap = quoteEl.closest(".reveal") || quoteEl;
      gsap.fromTo(
        [quoteWrap, quoteEl],
        {
          opacity: 0,
          y: 30,
        },
        {
          scrollTrigger: {
            trigger: quoteWrap,
            start: "top 85%",
            toggleActions: "play none none none",
          },
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          overwrite: "auto",
        }
      );
    }

    // 9. Contact — nadpis sekce
    if (document.querySelector("#contact .section-heading")) {
      gsap.fromTo(
        "#contact .section-heading",
        {
          opacity: 0,
          y: 40,
        },
        {
          scrollTrigger: {
            trigger: "#contact",
            start: "top 80%",
            toggleActions: "play none none none",
          },
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          overwrite: "auto",
        }
      );
    }

    // 10. Contact — levý sloupec (kontaktní info)
    if (document.querySelector(".contact-grid > div:first-child")) {
      gsap.fromTo(
        ".contact-grid > div:first-child",
        {
          opacity: 0,
          x: -60,
        },
        {
          scrollTrigger: {
            trigger: "#contact",
            start: "top 80%",
            toggleActions: "play none none none",
          },
          opacity: 1,
          x: 0,
          duration: 0.9,
          ease: "power3.out",
          overwrite: "auto",
        }
      );
    }

    // 11. Contact — pravý sloupec (formulář i jeho .reveal obal)
    if (document.querySelector(".contact-grid > div:last-child")) {
      gsap.fromTo(
        [".contact-grid > div:last-child", ".contact-form-wrapper"],
        {
          opacity: 0,
          x: 60,
        },
        {
          scrollTrigger: {
            trigger: "#contact",
            start: "top 80%",
            toggleActions: "play none none none",
          },
          opacity: 1,
          x: 0,
          duration: 0.9,
          ease: "power3.out",
          overwrite: "auto",
        }
      );
    }

    // 12. Generický fallback pro jakékoliv zbývající prvky s .reveal
    document.querySelectorAll(".reveal").forEach((el) => {
      // Pokud už prvek byl inicializován GSAPem, přeskočíme ho
      if (el._gsap) return;
      gsap.fromTo(
        el,
        {
          opacity: 0,
          y: 35,
        },
        {
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
          opacity: 1,
          y: 0,
          duration: 0.75,
          ease: "power2.out",
          overwrite: "auto",
        }
      );
    });
  }

  // -----------------------------------------------------------------------
  // 6. Dual Drive — Counter animace (GSAP ticker)
  // -----------------------------------------------------------------------
  function initDualDriveCounters() {
    const counters = document.querySelectorAll("[data-target]");
    if (!counters.length) return;

    counters.forEach((el) => {
      const target = parseInt(el.dataset.target, 10);
      const suffix = el.dataset.suffix || "";
      if (isNaN(target)) return;

      ScrollTrigger.create({
        trigger: el,
        start: "top 85%",
        once: true,
        onEnter: () => {
          gsap.to({ val: 0 }, {
            val: target,
            duration: 2,
            ease: "power2.out",
            onUpdate: function () {
              el.textContent = Math.round(this.targets()[0].val) + suffix;
            },
            onComplete: () => {
              el.textContent = target + suffix;
            },
          });
        },
      });
    });
  }

  // -----------------------------------------------------------------------
  // 7. Nav scrolled class (GSAP ScrollTrigger verze)
  // -----------------------------------------------------------------------
  function initNavScroll() {
    const nav = document.querySelector(".site-nav");
    if (!nav) return;

    ScrollTrigger.create({
      start: "top -60",
      end: 99999,
      toggleClass: { targets: nav, className: "site-nav--scrolled" },
    });
  }

  // -----------------------------------------------------------------------
  // Bootstrap
  // -----------------------------------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Exportujeme pro FLIP (volá project-grid.js)
  window.GSAPAnimations = { reinitCards: initCardEntrance };

})();
