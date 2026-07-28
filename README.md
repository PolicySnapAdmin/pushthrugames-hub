# Push Thru Games — studio hub

**Domain:** https://www.pushthrugames.com/  
**Role:** Catalog / front door for all studio games.  
**Does not host** the Push Thru game itself.

| Game | Live URL |
|------|----------|
| Push Thru | https://www.pushthrugame.com/ (own domain) |
| QR | https://www.pushthrugames.com/qr/ (this repo, `/qr` folder) |

QR is embedded on the studio domain to avoid a second custom domain. Source of truth for development can still be `C:\Users\conor\qr-game` — copy into `qr/` when shipping.

## Deploy (GitHub Pages)

1. Create public repo e.g. `PolicySnapAdmin/pushthrugames-hub`
2. Push this folder to `main`
3. Settings → Pages → Deploy from `main` / root
4. Custom domain: `www.pushthrugames.com` · Enforce HTTPS
5. DNS (GoDaddy):

| Type | Name | Value |
|------|------|--------|
| CNAME | `www` | `policysnapadmin.github.io` |
| A | `@` | `185.199.108.153` (and `.109`, `.110`, `.111`) |

**Note:** Only one Pages site per org username host works with multiple repos via different custom domains — each repo sets its own CNAME. Game repo uses `www.pushthrugame.com`; this repo uses `www.pushthrugames.com`.

## Adding a game

1. Ship the game on its own domain (or path later)
2. Add a card in `index.html` with Play link
3. Keep legal/store on the game domain when the game owns accounts/data
