# Agent Patch – Bestätigung & Auto-Speichern

## Neu
- **Agent-Auswahl** (Dev / Downloader / Designer / Wardrobe) mit vordefiniertem *System-Prompt*.
- **„genau so“** im Chat = Speichern des letzten `andio:scaffold` (oder Auto-Addon bauen).
- **Speichern-Button** neben „Modell installieren“ – speichert dasselbe ohne Texteingabe.

## Nutzung
1. Dev.Chat → Agent wählen → Modell wählen → Nachricht senden.
2. Antwort passt? Schreibe **„genau so“** *oder* klicke **„Speichern“**.
3. Dateien landen unter `addons/...`.

> Hinweis: Für das `agents.json`-Thema sind die Prompts derzeit **im Code** (`renderer.js`) hinterlegt, damit keine CSP/File-Loading-Probleme auftreten. Auf Wunsch kann ich das auf eine extern editierbare `agents.json` umstellen.