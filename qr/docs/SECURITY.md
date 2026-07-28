# QR — security & hygiene audit

**Date:** 2026-07-28  
**Scope:** `pushthrugames-hub` (public Pages) + QR Supabase project `iqeshszhcumphrnjvsoq`  
**Not in scope:** Push Thru (`jp_*` / pushthrugame.com) except isolation checks  

**Disclaimer:** Engineering review, not a formal pen-test or legal opinion.

---

## Architecture (public surface)

| Surface | Host | Notes |
|---------|------|--------|
| Studio hub | `https://www.pushthrugames.com/` | Static HTML/CSS |
| QR game | `https://www.pushthrugames.com/qr/` | Static HTML/JS/CSS |
| QR legal | `/qr/privacy.html`, `terms`, `cookies`, `privacy-choices`, `privacy-stance`, `contact` | All 200 OK |
| OG images | `/assets/og-hub.jpg`, `/assets/og-qr.jpg` | Public by design |
| QR API | `https://iqeshszhcumphrnjvsoq.supabase.co` | Separate from Push Thru |
| Push Thru | `https://www.pushthrugame.com/` | Separate domain + `jp_*` |

**GitHub:** public repo `PolicySnapAdmin/pushthrugames-hub` (expected for free Pages).  
**No separate GitHub required** for QR legal/game path hosting.

---

## File overview (hub)

```
pushthrugames-hub/
  index.html, styles.css, CNAME, .nojekyll
  assets/og-*.jpg
  qr/
    index.html, game.js, styles.css, config.js, online.js
    legal*.html, legal.css, legal-consent.js, contact.html
    docs/ (BACKEND, LEGAL, VISION, SECURITY)
```

Local dev twin: `C:\Users\conor\qr-game` (+ `supabase/migrations`).  
**Drift risk:** ship by copying into `hub/qr/` when releasing.

---

## Secrets & credentials

| Item | Status | Risk |
|------|--------|------|
| Supabase **anon** key in `config.js` | Public in client | **Expected** — must stay RLS-bound |
| Supabase **service_role** | **Not** in client/repo | Good |
| DB password / pooler URL | Only in local `supabase/.temp` (gitignored) | Keep out of git |
| Support email in `contact.html` | `atob(...)` only | **Info** — trivially reversible; same pattern as Push Thru |
| FormSubmit | Client → formsubmit.co | Support messages; rate/spam is FormSubmit’s side |

**Action:** Never put service_role in `config.js` or any static file.  
**Action:** Ensure `supabase/.temp` never committed (`.gitignore` added under `qr-game`).

---

## Live URL sanity (checked 200)

- Hub, `/qr/`, all legal pages, OG images, `config.js`, `game.js`  
- Push Thru apex still live (isolation)

---

## Supabase / RLS (QR project)

| Control | Status |
|---------|--------|
| Separate project from Push Thru | Yes (`QR Game` vs `CleetUnlimited`) |
| Tables `qr_*` only | Yes |
| RLS on `qr_profiles` | Enabled |
| `anon` table access | Revoked (no direct table use without JWT user) |
| `authenticated` SELECT | All profiles (leaderboard-style) |
| `authenticated` UPDATE/INSERT | Own row only (`id = auth.uid()`) |
| `qr_ensure_my_profile` / progress / meta / delete | `SECURITY DEFINER` + `auth.uid()` checks |
| Execute grants | Hardened migration: **authenticated only**, not `public`/`anon` |

**RE / trust model (accepted for casual web game):**

- Client can lie about scores/XP when calling `qr_report_*` (capped deltas; still client-trusted).  
- Any signed-in user can **read** other profiles’ public fields (name, friend code, bests) — no email column.  
- Full game logic is downloadable (`game.js`) — cannot hide algorithms on static web.

**Do not treat leaderboard as competitive integrity** without server-side validation later.

---

## Client / XSS / injection

| Area | Assessment |
|------|------------|
| `innerHTML` for UI | Profile fields, logs, chips use `esc()` for untrusted strings |
| Contact form | Length limits; sent to FormSubmit (not your DB) |
| Auth | Supabase client SDK; session key `qr-purpose-auth` (isolated from Push Thru storage) |
| Privacy keys | `qr-*` prefixes (no collision with `push-thru-*` on same eTLD+1) |

No `eval`, no remote script except pinned CDN `supabase-js@2` and Google Fonts.

---

## Reverse-engineering surface

**Publicly visible by design:**

- Full client game (movement, combat, module IDs, rarity weights)  
- Anon key + project URL  
- Legal/contact flows  

**Not exposed:**

- Service role, DB password  
- Push Thru `jp_*` schema via this client  

**RE takeaway:** Treat client as untrusted. Protect data with RLS + least privilege; don’t put secrets in static assets.

---

## Privacy / compliance hygiene

| Item | Status |
|------|--------|
| Privacy, Terms, Cookies, Choices, Stance | Present under `/qr/` |
| Consent banner + GPC | `legal-consent.js` |
| Never-sell stance | Documented |
| Age 13+ | Terms |
| Desktop / not mobile disclaimer | UI + Terms |
| Contact for deletion | `contact.html` |

Not a substitute for legal review before paid IAP / app stores.

---

## Isolation from Push Thru

| Layer | Isolated? |
|-------|-----------|
| Domain path vs game domain | Yes |
| Supabase project | Yes |
| Table prefix | `qr_*` vs `jp_*` |
| Auth storage key | `qr-purpose-auth` |
| Privacy localStorage | `qr-*` |

---

## Findings summary

| ID | Severity | Finding | Status / action |
|----|----------|---------|-----------------|
| S1 | **Info** | Anon key public | By design |
| S2 | **Info** | Support email obfuscation weak | Accept or move server-side later |
| S3 | **Low** | Client-trusted progress RPCs | Accept for casual; harden if ranked competitive |
| S4 | **Low** | Authenticated users can list all profiles | Needed for leaderboards; no emails stored |
| S5 | **Info** | Full game JS reverse-engineerable | Inherent to web |
| S6 | **Med if committed** | `supabase/.temp` pooler host | **Mitigated** with `.gitignore` |
| S7 | **Info** | Dual folders (local `qr-game` vs hub `qr/`) | Document deploy copy step |
| S8 | **Low** | No custom security headers on GitHub Pages | Limited by host; optional Cloudflare later |

---

## Cleanup performed with this pass

1. Added `qr-game/.gitignore` (`.temp`, env secrets)  
2. Migration `20260728200000_qr_security_harden.sql` — revoke RPC/table rights from `public`/`anon`  
3. This SECURITY.md checked into hub for operator reference  

---

## Operator checklist (you)

- [x] Separate Supabase project  
- [x] Migrations applied (core + meta + harden)  
- [ ] Auth URL allowlist includes `https://www.pushthrugames.com/qr/**`  
- [ ] Anonymous + Email providers ON  
- [ ] FormSubmit inbox confirmed for contact form  
- [ ] No service_role in any public file (re-check after deploys)  
- [ ] When releasing game code: copy `qr-game` → `pushthrugames-hub/qr` then push hub  

---

## Bottom line

QR is in **good shape for a free static web game**: isolated backend, legal package, no service_role in client, RLS on profiles, public URLs healthy. Remaining risks are **normal web-game risks** (client-trusted scores, public anon key, readable JS), not “open database” issues.
