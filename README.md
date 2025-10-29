# ANDIO Downloader – Final Build

Features
- 📥 Download-Manager mit Fortschritt & Status
- 🧩 Addon-Mediathek: aktivieren/deaktivieren/löschen
- 🪄 Wizard: Addon-Dateien erzeugen & speichern
- 🤖 KI-Chat via Ollama (Mistral/Qwen/Llama/CodeLlama)
- 🟢 Globaler Status-Monitor, Splitter-Persistenz

## Start
```bash
npm install
npm start
```

> Optional: Installiere [Ollama](https://ollama.com) und lade ein Modell, z. B. `ollama pull mistral`

## Struktur
- `renderer.html` – UI (Downloads, Wizard, Mediathek, Chat)
- `main.js` – IPC-Backend
- `preload.js` – sichere Bridge (window.api)
- `addons/` – hier speichert der Wizard deine Addons
- `assets/logo.png` – App-Icon
