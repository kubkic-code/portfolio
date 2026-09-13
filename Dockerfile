# ==============================================================================
# Dockerfile — Produkční kontejner pro portfolio Jakuba Sedláka
# kubkic-portfolio v2.0 | Python 3.12 · Flask · Gunicorn
# ==============================================================================

FROM python:3.12-slim AS base

# Nastavení Python runtime proměnných
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=5000

# Instalace nezbytných systémových utilit (curl pro healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Vytvoření neprivilegovaného uživatele a skupiny (Security best-practice)
RUN groupadd -r -g 10001 appuser && \
    useradd -r -u 10001 -g appuser -d /app -s /sbin/nologin -c "Portfolio App User" appuser

WORKDIR /app

# Nejprve zkopírujeme závislosti pro využití Docker cache vrstev
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Zkopírování zdrojového kódu a assetů aplikace
COPY . .

# Nastavení vlastnictví pro neprivilegovaného uživatele
RUN chown -R appuser:appuser /app

# Přepnutí na neprivilegovaného uživatele
USER appuser

# Expozice portu
EXPOSE 5000

# Healthcheck kontrolující dostupnost aplikace (Portainer healthy status)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/ || exit 1

# Spuštění produkčního WSGI serveru Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "3", "--threads", "2", "--access-logfile", "-", "--error-logfile", "-", "app:app"]
