"""
app.py -- Portfolio Flask Backend
Autor: Jakub Sedlak (kubkic-code)

Hlavni Flask aplikace pro osobni 3D portfolio.
Nacita data z portfolio_data.json a vystavuje REST API endpointy.
"""

import sys
import io
import json
import os
from pathlib import Path
from flask import Flask, render_template, jsonify, request, abort
from dotenv import load_dotenv

# Force UTF-8 stdout na Windows (jinak padne pri tisku cestiny/emoji)
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ('utf-8', 'utf8'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# --- Konfigurace ---
load_dotenv()  # Načte .env soubor (pro TELEGRAM_TOKEN atd.)

BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / "portfolio_data.json"

app = Flask(__name__)
app.config["JSON_ENSURE_ASCII"] = False  # Správné kódování češtiny

# -------------------------------------------------------------------------
# Načtení dat do paměťové cache při startu (data_manager logika)
# -------------------------------------------------------------------------

_portfolio_cache: dict = {}


def load_portfolio_data() -> dict:
    """Bezpečně načte a validuje portfolio_data.json do cache."""
    global _portfolio_cache
    if _portfolio_cache:
        return _portfolio_cache

    try:
        with open(DATA_FILE, encoding="utf-8") as f:
            data = json.load(f)

        # Základní validace struktury
        required_keys = {"author", "categories", "projects"}
        if not required_keys.issubset(data.keys()):
            raise ValueError(f"portfolio_data.json chybí klíče: {required_keys - data.keys()}")

        _portfolio_cache = data
        print(f"[OK] Nacteno {len(data['projects'])} projektu z {DATA_FILE.name}")
        return _portfolio_cache

    except FileNotFoundError:
        print(f"[ERR] Soubor {DATA_FILE} nebyl nalezen!")
        raise
    except json.JSONDecodeError as e:
        print(f"[ERR] Chyba parsovani JSON: {e}")
        raise


def get_all_projects(category: str = None, featured_only: bool = False) -> list:
    """Vrátí projekty, volitelně filtrované podle kategorie nebo featured příznak."""
    data = load_portfolio_data()
    projects = data.get("projects", [])

    if category:
        projects = [p for p in projects if p.get("category") == category]
    if featured_only:
        projects = [p for p in projects if p.get("featured", False)]

    return projects


def get_project_by_id(project_id: str) -> dict | None:
    """Vrátí konkrétní projekt podle jeho ID."""
    data = load_portfolio_data()
    for project in data.get("projects", []):
        if project.get("id") == project_id:
            return project
    return None


# -------------------------------------------------------------------------
# Routy
# -------------------------------------------------------------------------

@app.route("/")
def index():
    """Hlavní stránka — servíruje HTML šablonu s daty z JSON."""
    data = load_portfolio_data()
    return render_template(
        "index.html",
        author=data["author"],
        categories=data["categories"],
        projects=data["projects"],
        featured_projects=[p for p in data["projects"] if p.get("featured")],
    )


@app.route("/api/data")
def api_data():
    """GET /api/data — Kompletní portfolio JSON."""
    data = load_portfolio_data()
    return jsonify(data)


@app.route("/api/projects")
def api_projects():
    """GET /api/projects — Seznam projektů s volitelným filtrem ?category=... nebo ?featured=true."""
    category = request.args.get("category")
    featured = request.args.get("featured", "").lower() == "true"
    projects = get_all_projects(category=category, featured_only=featured)
    return jsonify({"count": len(projects), "projects": projects})


@app.route("/api/projects/<project_id>")
def api_project_detail(project_id: str):
    """GET /api/projects/<id> — Detail konkrétního projektu."""
    project = get_project_by_id(project_id)
    if not project:
        abort(404)
    return jsonify(project)


@app.route("/api/metrics")
def api_metrics():
    """GET /api/metrics — Agregované statistiky pro healthcheck a Hero sekci."""
    data = load_portfolio_data()
    projects = data.get("projects", [])

    # Sběr unikátních technologií
    all_techs = set()
    for p in projects:
        all_techs.update(p.get("technologies", []))

    metrics = {
        "total_projects": len(projects),
        "featured_projects": sum(1 for p in projects if p.get("featured")),
        "categories": len(data.get("categories", [])),
        "unique_technologies": len(all_techs),
        "status": "operational",
    }
    return jsonify(metrics)


@app.route("/api/contact", methods=["POST"])
def api_contact():
    """
    POST /api/contact — Příjem zprávy z kontaktního formuláře.
    Placeholder pro budoucí Telegram dispatcher.
    """
    payload = request.get_json(silent=True) or {}
    name = payload.get("name", "").strip()
    email = payload.get("email", "").strip()
    message = payload.get("message", "").strip()

    if not all([name, email, message]):
        return jsonify({"error": "Vyplňte prosím všechna pole (name, email, message)."}), 400

    # TODO: Fáze 3 — odeslat na Telegram přes telegram_notifier.py
    print(f"[MAIL] Nova zprava od {name} <{email}>: {message[:80]}...")

    return jsonify({"success": True, "message": "Zpráva přijata. Brzy se ozvu!"}), 200


# -------------------------------------------------------------------------
# Spuštění
# -------------------------------------------------------------------------

if __name__ == "__main__":
    # Načteme data při startu, aby se chyby v JSON odhalily okamžitě
    load_portfolio_data()
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", 5000)),
        debug=debug_mode,
    )
