# QR — backend & accounts

## Recommendation: **new Supabase project** (not Push Thru’s)

| Approach | Verdict |
|----------|---------|
| **New project for QR** | **Preferred** — separate Auth users, keys, backups, rate limits, RLS blast radius |
| Same project + `qr_*` tables | OK short-term; Auth pool still shared with Push Thru / PolicySnap |

Push Thru stays on project **`jpnaotxkcpnwgqkzxdue`** with `jp_*` only.  
QR should use its **own** project with **`qr_*`** tables only.

Same *rules* as Push Thru (guest → email, friend code, RLS, ensure-profile RPC).  
**Different** database, anon key, Site URL, and users.

### Why not share Auth?

- Guest accounts and synthetic `@login.*` emails would collide in one pool  
- “Delete account” / hygiene jobs could touch the wrong product  
- MMORPG growth wants its own limits and schema evolution  

You can still brand both under Push Thru Games; isolation is infrastructure, not marketing.

---

## Create the project (you)

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**  
   - Name: `qr-purpose` (or similar)  
   - Region: same as you prefer  
   - Save the **database password**  
2. **Project Settings → API**  
   - Copy **Project URL**  
   - Copy **anon public** key  
3. Paste into `config.js` (`supabaseUrl`, `supabaseAnonKey`, `enabled: true`)  
4. **SQL Editor** → run  
   `supabase/migrations/20260728000000_qr_core.sql`  
   (then later files in order)  
5. **Authentication → Providers**  
   - **Anonymous** ON  
   - **Email** ON  
   - Confirm email: OFF for smooth web guests (or ON if you have SMTP)  
6. **Authentication → URL configuration**  
   - Site URL: your QR play URL (local or future domain)  
   - Redirects: that origin + `/**`, plus `http://localhost:3000/**`  

Do **not** put the service role key in the client or this repo.

---

## Namespace

| Prefix | Product |
|--------|---------|
| `jp_*` | Push Thru only |
| `qr_*` | QR only |

Never query `jp_*` from QR or `qr_*` from Push Thru.

---

## Synthetic login emails (optional, same pattern as Push Thru)

`{CODE}@login.qr.pushthrugames.com` or `{CODE}@login.qrgame.local`  

Configured in `config.js` as `loginEmailDomain`.  
If you enable auto-confirm for that domain, use a **QR-only** trigger in the QR project (see migration comments). Do not reuse Push Thru’s trigger on the wrong project.

---

## What ships in v1 backend

| Feature | Table / RPC |
|---------|-------------|
| Profile + friend code | `qr_profiles` |
| Bootstrap profile | `qr_ensure_my_profile` |
| Report best sector / lifetime stats | `qr_report_progress` |
| Leaderboard read | select on `qr_profiles` (authenticated) |
| Delete account | `qr_delete_my_account` |

**Not in v1:** cloud full-run inventory saves, multiplayer, friends graph (can copy later as `qr_friendships`).

Local play still works with `enabled: false` or offline.

---

## Checklist

- [ ] New Supabase project created  
- [ ] Core SQL migration applied  
- [ ] `config.js` filled + `enabled: true`  
- [ ] Anonymous + Email auth ON  
- [ ] Site URL / redirects set  
- [ ] Guest play creates `qr_profiles` row  
- [ ] Best sector syncs after a run  
- [ ] Push Thru project untouched  
