"""
build_static.py -- Generátor statické verze portfolia pro GitHub Pages.
Zkompiluje templates/index.html a data z portfolio_data.json do standalone složky dist/.
"""

import json
import shutil
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

BASE_DIR = Path(__file__).resolve().parent
DIST_DIR = BASE_DIR / "dist"
DATA_FILE = BASE_DIR / "portfolio_data.json"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"


def build():
    print("[1/5] Příprava cílové složky dist/...")
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_DIR.mkdir(parents=True)

    print("[2/5] Kopírování statických souborů (CSS, JS, Assets)...")
    shutil.copytree(STATIC_DIR, DIST_DIR / "static")

    print("[3/5] Načítání portfolio_data.json...")
    with open(DATA_FILE, encoding="utf-8") as f:
        data = json.load(f)

    print("[4/5] Renderování šablony index.html přes Jinja2...")
    env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))

    # Statická verze url_for — používá relativní cesty pro kompatibilitu s GitHub Pages podsložkou
    def static_url_for(endpoint, filename=None):
        if endpoint == "static" and filename:
            return f"./static/{filename}"
        return f"./{endpoint}"

    env.globals["url_for"] = static_url_for

    template = env.get_template("index.html")
    rendered_html = template.render(
        author=data["author"],
        categories=data["categories"],
        projects=data["projects"],
        featured_projects=[p for p in data["projects"] if p.get("featured")],
        data_json=json.dumps(data, ensure_ascii=False),
    )

    # Zápis hlavní stránky
    (DIST_DIR / "index.html").write_text(rendered_html, encoding="utf-8")

    # Kopie jako 404.html pro správné směrování na GitHub Pages
    (DIST_DIR / "404.html").write_text(rendered_html, encoding="utf-8")

    # .nojekyll zajistí, že GitHub Pages nebude filtrovat složky začínající podtržítkem
    (DIST_DIR / ".nojekyll").write_text("", encoding="utf-8")

    print(f"[5/5] Hotovo! Statický build je připraven v: {DIST_DIR}")


if __name__ == "__main__":
    build()
