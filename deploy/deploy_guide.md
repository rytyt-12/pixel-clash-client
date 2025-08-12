# Déploiement rapide (GitHub Pages client + Render server)

## Client -> GitHub Pages
1. Crée un dépôt GitHub et pousse le dossier `client/` dans une branche `gh-pages`, ou configure GitHub Pages pour servir le dossier `client/`.
Simple méthode:
  - Place tout le contenu de `client/` à la racine d'un repo (ou configure `gh-pages` branch).
  - Dans les Settings > Pages, sélectionne la branche et le dossier root.
2. Après push, ton site sera disponible à `https://<username>.github.io/<repo>/`.

## Server -> Render (gratuit pour petits projets)
1. Crée un compte sur Render.com.
2. New -> Web Service -> Connect repo (server folder). Build Command: `npm install` ; Start Command: `npm start`.
3. Render fournit automatiquement la variable `PORT`. Une fois actif, récupère l'URL (ex: `https://yourserver.onrender.com`).
4. Si le server est sur une URL différente que le client, lance le client avec `client/index.html?server=ws://yourserver.onrender.com` ou modifie `client.js` pour pointer vers `wss://yourserver.onrender.com`.

## Alternative server hosts
- Railway.app, Fly.io, Glitch (note: Glitch may sleep), Heroku (deprecated free), DigitalOcean App Platform (paid tiers).

## Notes
- Assure-toi d'ajouter `ADMIN_TOKEN` env var sur Render pour sécuriser `/admin/info` endpoint.
- Pour TLS/WSS, utilise `wss://` when server supports TLS (Render provides HTTPS).
