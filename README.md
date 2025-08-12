# Pixel Clash.io — Pack complet (client + server + deployment)

Contenu :
- client/ (HTML/CSS/JS)
- server/ (Node.js WebSocket server with rooms + highscores)
- assets/ (placeholder images for itch.io)
- deploy/ (guides & git setup)

## Nouveautés ajoutées
- Persistance des highscores dans `server/scores.json`.
- Endpoint HTTP `/highscores` pour récupérer le top scores.
- Endpoint admin `/admin/info` protégé par `ADMIN_TOKEN` env var.
- Fichiers `.gitignore`, `git_setup.txt` et `deploy/deploy_guide.md`.
