# 🚀 Návod na produkční nasazení — kubkic-portfolio

Tento návod popisuje nasazení webového portfolia v Dockeru spravovaném přes **Portainer** a jeho bezpečné zpřístupnění do internetu přes **Cloudflare Tunnel** na doméně `kubkic.fun`.

---

## 📋 Přehled architektury
- **Aplikace:** Python 3.12, Flask, Gunicorn (3 workery, 2 thready)
- **Kontejner:** Běží pod neprivilegovaným uživatelem `appuser` (Security best-practice)
- **Port na serveru:** `5050` (namapováno z interního portu kontejneru `5000`)
- **Healthcheck:** Automatický test dostupnosti (`http://localhost:5000/`) každých 30s
- **Veřejná doména:** `https://kubkic.fun` (skrze Cloudflare Tunnel)

---

## 🛠️ Krok 1: Nasazení v Portaineru

1. Otevři webové rozhraní **Portaineru** na svém serveru.
2. V levém menu přejdi do sekce **Stacks** a klikni na modré tlačítko **+ Add stack**.
3. Zadej název stacku, např.:
   ```text
   portfolio
   ```
4. Jako **Build method** zvol **Web editor**.
5. Do textového pole vlož kompletní obsah ze souboru [`docker-compose.yml`](docker-compose.yml):

```yaml
services:
  portfolio_web:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: portfolio_web
    restart: unless-stopped
    ports:
      - "5050:5000"
    environment:
      - FLASK_ENV=production
      - FLASK_DEBUG=false
      - PORT=5000
      - PYTHONUNBUFFERED=1
    env_file:
      - path: .env
        required: false
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          memory: 128M
```

> **Poznámka k repozitáři:** Pokud nasazuješ přímo z Git repozitáře (GitHub), zvol v Portaineru záložku **Repository**, vlož URL repozitáře a cestu k `docker-compose.yml`.

6. Klikni na **Deploy the stack** dole na stránce.
7. Po sestavení image zkontroluj v sekci **Containers**, že u kontejneru `portfolio_web` svítí zelený stav **healthy**.

---

## 🌐 Krok 2: Vystrčení na internet přes Cloudflare Tunnel

1. Přihlas se do [Cloudflare One / Zero Trust Dashboard](https://one.dash.cloudflare.com/).
2. V levém menu přejdi do **Networks** -> **Tunnels**.
3. Vyber svůj aktivní tunel a klikni na **Configure**.
4. Přejdi na záložku **Public Hostnames** a klikni na **Add a public hostname**.
5. Vyplň formulář následovně:
   - **Subdomain:** *(ponech prázdné nebo zadej subdoménu dle potřeby)*
   - **Domain:** `kubkic.fun`
   - **Path:** *(ponech prázdné)*
6. V sekci **Service** zadej propojení na lokální server:
   - **Type:** `HTTP`
   - **URL:** `http://<LOKALNI_IP_SERVERU>:5050`
     *(např. `http://192.168.1.100:5050` nebo `http://localhost:5050`, pokud Cloudflared běží na stejném hostiteli)*
7. Klikni na **Save hostname**.

---

## ✅ Ověření funkčnosti

- **Lokálně:** Otevři v prohlížeči `http://<LOKALNI_IP_SERVERU>:5050`
- **Z internetu:** Otevři v prohlížeči `https://kubkic.fun`
- **Metriky / Healthcheck:** `http://<LOKALNI_IP_SERVERU>:5050/api/metrics`

Aplikace je nyní plně zabezpečená, izolovaná v Dockeru, běží pod neprivilegovaným uživatelem a je vystavena přes šifrovaný Cloudflare Tunnel bez nutnosti otevírat porty v routeru.
