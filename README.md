
# System Zamówień — backend + API frontend

To repo zawiera:
- **backend**: Node.js + Express + SQLite (better-sqlite3)
- **frontend (API)**: prosty plik `index.html`, który korzysta z endpointów API

## Szybki start (lokalnie)

```bash
# 1) Zainstaluj zależności
npm install

# 2) Zainicjalizuj bazę z danymi startowymi
npm run init:db

# 3) Uruchom serwer (domyślnie :3000)
npm run dev
```

Opcjonalnie skonfiguruj `.env` (zawarty w .gitignore) z treścią:
```
PORT=3000
ADMIN_PASS=admin123
DB_FILE=app.sqlite
```

## Endpointy (skrót)
- `POST /login` — podaj `{ "password": "admin123" }` aby otrzymać `token` (tu: po prostu to samo hasło). Używaj jako `Authorization: Bearer <token>` dla akcji admina.
- `GET /items` — lista przedmiotów
- `POST /items` — (admin) dodaj przedmiot
- `PUT /items/:id` — (admin) edytuj
- `DELETE /items/:id` — (admin) usuń
- `GET /orders` — lista zamówień (z pozycjami)
- `POST /orders` — utwórz zamówienie `{ tier: "H" | "S", lines: [ { id, qty } ] }`

## Frontend (API)
Otwórz `index.html` **z serwera plików** (np. VS Code Live Server) lub hostuj go razem z backendem (ustaw `API_BASE` jeśli inny port/host).

## GitHub — tworzenie repo
```bash
git init
git branch -M main
git add .
git commit -m "init: backend + api frontend"
git remote add origin https://github.com/<twoj_login>/system-zamowien.git
git push -u origin main
```
