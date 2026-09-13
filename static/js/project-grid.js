/**
 * project-grid.js — GSAP FLIP filtrování projektů
 * Plynulé přeskupení karet bez "skoku" pomocí GSAP FLIP plugin
 * Autor: Jakub Sedlák | kubkic-code
 *
 * Závislosti: GSAP 3.12.x + Flip plugin (CDN)
 */

"use strict";

(function ProjectGrid() {

  function init() {
    // Ověříme GSAP + Flip
    const hasFlip = typeof gsap !== "undefined" && typeof Flip !== "undefined";
    if (!hasFlip) {
      console.warn("[ProjectGrid] GSAP Flip plugin není dostupný. Fallback na fade.");
      initFallbackFilter();
      initShowMore();
      initCardClickHandler();
      return;
    }

    gsap.registerPlugin(Flip);
    initFlipFilter();
    initSpecularHighlight();
    initShowMore();
    initCardClickHandler();
  }

  // -----------------------------------------------------------------------
  // GSAP FLIP filtrování
  // -----------------------------------------------------------------------
  function initFlipFilter() {
    const filterBtns = document.querySelectorAll("[data-filter]");
    const grid = document.getElementById("projects-grid");
    if (!filterBtns.length || !grid) return;

    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (grid.classList.contains("is-flipping")) return;
        const target = btn.dataset.filter;

        // Aktualizace aktivního tlačítka
        filterBtns.forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");

        const cards = grid.querySelectorAll("[data-category]");

        // ---------------------------------------------------------------
        // OPRAVA Layout Collapse: Zamkneme výšku gridu PŘED skrytím karet
        // Tím zabráníme smrsknutí kontejneru a posunu sekcí pod ním.
        // ---------------------------------------------------------------
        const currentHeight = grid.getBoundingClientRect().height;
        grid.style.minHeight = currentHeight + "px";
        grid.classList.add("is-flipping");

        // 1. Zafixujeme aktuální šířku i výšku každé karty před vytržením přes absolute: true
        // Tím zabráníme vertikálnímu natahování a reflow textu během FLIP animace.
        const sampleCard = grid.querySelector(".project-card:not(.card--hidden)") || cards[0];
        const cardWidth = sampleCard ? sampleCard.getBoundingClientRect().width : null;

        cards.forEach((card) => {
          const rect = card.getBoundingClientRect();
          if (cardWidth) {
            card.style.width = cardWidth + "px";
          }
          if (rect.height > 0) {
            card.style.height = rect.height + "px";
          }
        });

        // 2. Zachytit aktuální stav (polohy a rozměry karet)
        const state = Flip.getState(cards, { props: "width,height" });

        // 3. Aktualizovat viditelnost karet
        cards.forEach((card) => {
          const match = target === "all" || card.dataset.category === target;
          card.classList.toggle("card--hidden", !match);
        });

        // 4. FLIP animace se zapnutým scale: true pro zachování proporcí
        Flip.from(state, {
          duration: 0.55,
          ease: "power2.inOut",
          stagger: 0.04,
          absolute: true,     // absolutní pozicování karet během animace → žádný layout shift
          scale: true,        // zabrání deformacím a skákání proporcí karet
          onEnter: (elements) => {
            gsap.fromTo(
              elements,
              { opacity: 0, scale: 0.85 },
              { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.4)" }
            );
          },
          onLeave: (elements) => {
            gsap.to(elements, {
              opacity: 0,
              scale: 0.85,
              duration: 0.25,
              ease: "power1.in",
            });
          },
          onComplete: () => {
            grid.classList.remove("is-flipping");
            // Po dokončení animace odstraníme zámek výšky gridu i inline rozměrů karet
            grid.style.minHeight = "";
            cards.forEach((card) => {
              card.style.width = "";
              card.style.height = "";
            });

            // OPRAVA ScrollTrigger: donutíme GSAP přepočítat spouštěče podle nové výšky stránky
            if (typeof ScrollTrigger !== "undefined") {
              ScrollTrigger.refresh();
            }
          },
          onInterrupt: () => {
            grid.classList.remove("is-flipping");
            grid.style.minHeight = "";
            cards.forEach((card) => {
              card.style.width = "";
              card.style.height = "";
            });
            if (typeof ScrollTrigger !== "undefined") {
              ScrollTrigger.refresh();
            }
          },
        });
      });
    });
  }

  // -----------------------------------------------------------------------
  // Fallback filtrování (bez Flip)
  // -----------------------------------------------------------------------
  function initFallbackFilter() {
    const filterBtns = document.querySelectorAll("[data-filter]");
    const cards = document.querySelectorAll("[data-category]");

    filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.filter;
        filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        cards.forEach((card) => {
          const match = target === "all" || card.dataset.category === target;
          card.classList.toggle("card--hidden", !match);
        });

        if (typeof ScrollTrigger !== "undefined") {
          ScrollTrigger.refresh();
        }
      });
    });
  }

  // -----------------------------------------------------------------------
  // Specular Highlight — odraz světla sleduje kurzor
  // Na dotykových zařízeních je 3D tilt VYPNUT (jezdilo to špatně a sekalo se)
  // -----------------------------------------------------------------------
  function initSpecularHighlight() {
    // Detekce dotykového zařízení — matchMedia je spolehlivější než 'ontouchstart'
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
    const cards = document.querySelectorAll(".project-card");

    cards.forEach((card) => {
      // Vytvoříme overlay pro specular efekt
      const specular = document.createElement("div");
      specular.className = "card-specular";
      specular.style.cssText = `
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
        background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 60%);
        mix-blend-mode: screen;
      `;
      card.style.position = "relative";
      card.style.overflow = "hidden";
      card.appendChild(specular);

      // Na dotykových zařízeních tilt úplně přeskočíme — karty zuštanou statické
      if (isTouchDevice) return;

      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1);
        const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1);

        // 3D tilt
        const tiltX = ((e.clientY - rect.top)  / rect.height - 0.5) * -14;
        const tiltY = ((e.clientX - rect.left) / rect.width  - 0.5) * 14;

        card.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(4px)`;

        // Specular highlight sleduje kurzor
        specular.style.opacity = "1";
        specular.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(255,255,255,0.12) 0%, rgba(99,102,241,0.06) 30%, transparent 65%)`;
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
        specular.style.opacity = "0";
      });
    });
  }

  // -----------------------------------------------------------------------
  // Kliknutí na kartu — otevřít modal (delegace na modal.js)
  // -----------------------------------------------------------------------
  function initCardClickHandler() {
    const grid = document.getElementById("projects-grid");
    if (!grid) return;

    grid.addEventListener("click", (e) => {
      // Neklikat přes GitHub link
      if (e.target.closest("a")) return;

      const card = e.target.closest(".project-card");
      if (!card) return;

      const projectId = card.dataset.projectId;
      if (projectId && window.HoloModal) {
        window.HoloModal.open(projectId, card);
      }
    });

    // Keyboard přístupnost
    grid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest(".project-card");
      if (!card) return;
      e.preventDefault();
      const projectId = card.dataset.projectId;
      if (projectId && window.HoloModal) {
        window.HoloModal.open(projectId, card);
      }
    });
  }

  // -----------------------------------------------------------------------
  // Show More — tlačítko pro zobrazení zbývajících karet
  // Na mobilu jsou od začátku zobrazeny jen první 3 karty
  // -----------------------------------------------------------------------
  function initShowMore() {
    const btn     = document.getElementById("show-more-btn");
    const wrapper = document.getElementById("show-more-wrapper");
    const fade    = document.getElementById("show-more-fade");
    const label   = document.getElementById("show-more-label");
    const icon    = document.getElementById("show-more-icon");
    const countEl = document.getElementById("show-more-count");
    if (!btn || !wrapper) return;

    const extraCards = Array.from(document.querySelectorAll(".project-card--extra"));
    const total = extraCards.length;

    // Pokud není co skrýt, tlačítko nezobrazujeme
    if (total === 0) {
      wrapper.style.display = "none";
      return;
    }

    // Zobraz počet skrytých karet
    if (countEl) countEl.textContent = `(${total} dalších projektů)`;

    let isExpanded = false;

    btn.addEventListener("click", () => {
      if (isExpanded) {
        // Skrýt zpět — vzcácně používané, ale implementujeme pro úplnost
        extraCards.forEach((card) => {
          if (typeof gsap !== "undefined") {
            gsap.to(card, {
              opacity: 0, y: -16, duration: 0.25, ease: "power1.in",
              onComplete: () => { card.style.display = "none"; }
            });
          } else {
            card.style.display = "none";
          }
        });
        isExpanded = false;
        btn.setAttribute("aria-expanded", "false");
        label.textContent = "Zobrazit další projekty";
        icon.style.transform = "";
        if (fade) fade.style.display = "";
        if (countEl) countEl.textContent = `(${total} dalších projektů)`;
      } else {
        // Zobrazit všechny skryté karty s plynulou animací
        extraCards.forEach((card, i) => {
          card.style.display = "";
          if (typeof gsap !== "undefined") {
            gsap.fromTo(card,
              { opacity: 0, y: 24 },
              { opacity: 1, y: 0, duration: 0.45, delay: i * 0.06, ease: "power2.out" }
            );
          } else {
            // CSS fallback
            card.style.opacity = "0";
            card.style.transform = "translateY(24px)";
            requestAnimationFrame(() => {
              card.style.transition = "opacity 0.4s ease, transform 0.4s ease";
              card.style.transitionDelay = `${i * 0.06}s`;
              card.style.opacity = "1";
              card.style.transform = "";
            });
          }
        });

        isExpanded = true;
        btn.setAttribute("aria-expanded", "true");
        label.textContent = "Skrýt projekty";
        icon.style.transform = "rotate(180deg)";
        // Fade overlay odstranit — už není co naznačovat
        if (fade) fade.style.display = "none";
        if (countEl) countEl.textContent = `Zobrazeny všechny projekty (${total + 3})`;

        // Refresh GSAP ScrollTrigger po přidání karet
        if (typeof ScrollTrigger !== "undefined") {
          setTimeout(() => ScrollTrigger.refresh(), 500);
        }
      }
    });

    // Když uživatel používá filtr, tlačítko zavříme (filtr překrývá logiku skrývání)
    document.querySelectorAll("[data-filter]").forEach((filterBtn) => {
      filterBtn.addEventListener("click", () => {
        const isAll = filterBtn.dataset.filter === "all";
        // Pokud není "vše", tlačítko schováme (filtry nahrazují show-more)
        if (!isAll) {
          wrapper.style.display = "none";
          // Zobrazit všechny extra karty, aby je filtr mohl pracovat s nimi
          extraCards.forEach((c) => { c.style.display = ""; });
        } else {
          // Vrátit zpět: schovat extra karty a zobrazit tlačítko
          if (!isExpanded) {
            extraCards.forEach((c) => { c.style.display = "none"; });
            wrapper.style.display = "";
          }
        }
      });
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

})();
