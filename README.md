# 🚀 Jakub Sedlák — 3D Developer Portfolio

<div align="center">

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Three.js](https://img.shields.io/badge/Three.js-r128-049EF4?style=for-the-badge&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![GSAP](https://img.shields.io/badge/GSAP-3.12-88CE02?style=for-the-badge&logo=greensock&logoColor=white)](https://greensock.com/gsap/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare_Tunnel-Protected-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://www.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

**Interaktivní osobní portfolio s 3D vizuální scénou, REST API a produkčním Docker nasazením.**

🌐 **Live Demo:** [https://kubkic.fun](https://kubkic.fun)

</div>

---

## 🌟 Klíčové vlastnosti

- 🌌 **Deep Space OLED 3D Canvas:** Interaktivní Three.js vizualizace na pozadí reagující na pohyb myši a scrollování s particle efekty.
- ⚡ **GSAP Micro-animations:** Plynulé přechody, animace textů a projektových karet s důrazem na 60 FPS výkon.
- 💎 **Glassmorphic UI Design System:** Moderní temný design s neonovými akcenty (Cyan / Emerald), OLED kontrastem a plnou responzivitou pro mobily, tablety i 4K monitory.
- 🔌 **RESTful Backend API:** Flask server poskytující filtrované API endpointy pro projekty, analytické metriky a kontakt.
- 🛡️ **Bezpečnost na prvním místě:** Žádné hardcoded klíče v repozitáři, podpora `.env` souborů, neoprávněný non-root uživatel v Dockeru a Zero-Trust Cloudflare Tunnel bez otevírání portů do internetu.
- 🐳 **Produkční kontejnerizace:** Optimalizovaný multi-stage Dockerfile s Gunicorn WSGI serverem a integrovaným healthcheckem.

---

## 📂 Struktura projektu

```text
portfolio/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI (testy & syntax check)
├── static/
│   ├── assets/                  # Ikony a obrázky projektů
│   ├── css/
│   │   ├── base.css             # Resety a základní layout
│   │   ├── components.css       # Tlačítka, karty, štítky
│   │   ├── glassmorphism.css    # Průsvitné panely a neonové záře
│   │   ├── responsive.css       # Media queries pro mobilní zařízení
│   │   ├── terminal.css         # Styl interaktivního terminálu
│   │   └── variables.css        # Design tokens (barvy, spacing)
│   └── js/
│       ├── gsap-animations.js   # Animace rozhraní a ScrollTrigger
│       ├── main.js              # Inicializace aplikace a obsluha API
│       ├── modal.js             # Modální okna pro detaily projektů
│       ├── project-grid.js      # Filtrování a dynamické vykreslování karet
│       └── three-scene.js       # 3D částicová scéna Three.js
├── templates/
│   └── index.html               # Hlavní sémantická šablona
├── tests/
│   └── test_portfolio.py        # Automatizované unit testy (Flask Test Client)
├── .dockerignore                # Pravidla pro vyloučení souborů z Docker image
├── .env.example                 # Vzorový konfigurační soubor pro prostředí
├── .gitignore                   # Pravidla pro vyloučení citlivých souborů z Gitu
├── app.py                       # Hlavní Flask aplikace a REST API
├── ARCHITECTURE.md              # Podrobná technická dokumentace architektury
├── DEPLOYMENT.md                # Návod na produkční nasazení (Portainer + Cloudflare)
├── docker-compose.yml           # Konfigurace pro Docker Compose
├── Dockerfile                   # Produkční Dockerfile (Python 3.12-slim, non-root)
├── LICENSE                      # MIT Licence
├── portfolio_data.json          # Datový zdroj (projekty, autor, dovednosti)
├── requirements.txt             # Python závislosti
└── test_api.py                  # Integrační testovací skript proti běžícímu serveru
```

---

## 🚀 Rychlý start

### Možnost A: Lokální spuštění (Python venv)

#### 1. Klonování repozitáře
```bash
git clone https://github.com/kubkic-code/portfolio.git
cd portfolio
```

#### 2. Vytvoření a aktivace virtuálního prostředí
```bash
# Linux / macOS
python3 -m venv venv
source venv/bin/activate

# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1
```

#### 3. Instalace závislostí
```bash
pip install -r requirements.txt
```

#### 4. Příprava konfigurace `.env`
```bash
# Zkopírujte šablonu
cp .env.example .env     # Linux / macOS
copy .env.example .env   # Windows
```
*(Upravte hodnoty v `.env` dle potřeby. Výchozí hodnoty postačí pro lokální běh.)*

#### 5. Spuštění vývojového serveru
```bash
python app.py
```
Aplikace poběží na: **`http://localhost:5000`**

---

### Možnost B: Spuštění v Dockeru

Pokud máte nainstalovaný Docker a Docker Compose:

```bash
docker compose up --build
```
Aplikace se spustí v izolovaném kontejneru a bude dostupná na portu `5050` (nebo dle nastavení v `docker-compose.yml`):
👉 **`http://localhost:5050`**

---

## ⚙️ Proměnné prostředí (`.env`)

Aplikace využívá pro bezpečné oddělení konfigurace knihovnu `python-dotenv`. Soubor `.env` je chráněn v `.gitignore` a nikdy se nenahrává do repozitáře.

| Proměnná | Typ | Výchozí hodnota | Popis |
|---|---|---|---|
| `PORT` | int | `5000` | Port, na kterém aplikace naslouchá |
| `FLASK_ENV` | string | `production` | Režim Flasku (`development` / `production`) |
| `FLASK_DEBUG` | bool | `false` | Povolení ladicího režimu |
| `TELEGRAM_BOT_TOKEN` | string | *volitelné* | Token pro zasílání notifikací z kontaktního formuláře |
| `TELEGRAM_CHAT_ID` | string | *volitelné* | Cílové ID chatu na Telegramu |

---

## 📡 REST API Dokumentace

| Metoda | Endpoint | Popis | Příklad odpovědi |
|---|---|---|---|
| `GET` | `/` | Hlavní webová stránka (HTML šablona) | HTML dokument |
| `GET` | `/api/metrics` | Agregované statistiky (počet projektů, technologie, stav) | `{"status": "operational", "total_projects": 8, ...}` |
| `GET` | `/api/projects` | Seznam všech projektů (volitelné filtry `?category=...`, `?featured=true`) | `{"count": 8, "projects": [...]}` |
| `GET` | `/api/projects/<id>` | Detail konkrétního projektu podle ID | `{"id": "valuation-pro", "title": "...", ...}` |
| `GET` | `/api/data` | Kompletní struktura databáze `portfolio_data.json` | `{"author": {...}, "projects": [...]}` |
| `POST` | `/api/contact` | Příjem zprávy z kontaktního formuláře | `{"success": true, "message": "Zpráva přijata."}` |

---

## 🧪 Testování

V repozitáři jsou k dispozici automatizované testy ověřující jak integritu JSON dat, tak chování všech REST endpointů:

```bash
# Spuštění unit testů přes Flask Test Client (nevyžaduje běžící server)
python -m unittest discover -s tests -p "test_*.py"

# Spuštění integračního testu proti běžícímu serveru
python test_api.py
```

Testy jsou automaticky spouštěny v GitHub Actions CI při každém `push` a `pull_request`.

---

## 🌐 Produkční nasazení

Podrobný průvodce nasazením do produkce pomocí **Portaineru** a zabezpečeného **Cloudflare Tunnelu** naleznete v samostatném souboru:
👉 **[DEPLOYMENT.md](DEPLOYMENT.md)**

Kompletní architektura systému a komponenty jsou popsány v:
👉 **[ARCHITECTURE.md](ARCHITECTURE.md)**

---

## 👤 Autor

**Jakub Sedlák**
- 🐙 GitHub: [@kubkic-code](https://github.com/kubkic-code)
- 💼 LinkedIn: [Jakub Sedlák](https://www.linkedin.com/in/jakub-sedl%C3%A1k-22861541a)
- ✉️ Email: [sedlak.jaku11@gmail.com](mailto:sedlak.jaku11@gmail.com)

---

## 📄 Licence

Tento projekt je licencován pod licencí MIT — podrobnosti viz soubor [LICENSE](LICENSE).
