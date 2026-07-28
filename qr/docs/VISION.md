# QR — vision

## One-line

You are a QR code. You don’t know why you exist. Explore the grid and learn your purpose.

## Fantasy

You wake as a black-and-white pattern in an endless lattice of signals, scanners, and corrupted codes. Nothing explains itself. Clues are fragments — headers, error strings, half-decoded payloads. Bosses are hostile readers and broken protocols. Skills are how you *parse* the world. The long endgame is an open world where many codes walk the same grid (MMORPG).

## Pillars

1. **Mystery first** — never dump a full tutorial lore dump; reveal purpose through discovery.
2. **QR as identity** — player, enemies, loot, and UI all feel “code-shaped” (modules, quiet zones, alignment patterns, scanlines).
3. **Explore → understand** — movement and curiosity beat pure grind early.
4. **Simple now, layered later** — ship a solo loop before multiplayer, inventory, or economies.

## Domain / product placement

| Piece | Where |
|-------|--------|
| Studio hub | pushthrugames.com (card + Play link) |
| This game | Own repo + own deploy (e.g. GitHub Pages; domain later: `qr.pushthrugames.com` or dedicated) |
| Backend | None for v0; optional Supabase later (separate from `jp_*`) |

## Evolution ladder (don’t skip rungs)

| Phase | Name | Player loop | Tech |
|-------|------|-------------|------|
| **0** | Awakening | Explore small map, find fragments, short ending | Static HTML/JS, local save |
| **1** | Protocol | Levels + 2–3 skills + first boss | Same + more content |
| **2** | Variants | QR skins/modules change abilities | Content + light meta |
| **3** | Archive | Quests, regions, lore codex | Still mostly client |
| **4** | Multi | Shared world / parties | Realtime backend |
| **5** | Open MMORPG | Persistent world, many players | Full stack |

## Content vocabulary (QR-flavored)

| Fantasy | Game meaning |
|---------|----------------|
| Quiet zone | Safe hub / rest |
| Finder pattern | Landmark / waypoint |
| Module | Skill point / ability cell |
| Payload | Quest item / memory |
| Scan | Interaction / combat “read” |
| Checksum | Puzzle / verification mini-challenge |
| Error 404 | Hazard / void |
| Corrupt block | Debuff / enemy type |
| Reader / Scanner | Boss archetype |
| Version | Progression tier |

## Combat & skills (later phases)

Keep combat readable and thematic:

- **Scan** — reveal weak point / stun
- **Reflect** — bounce a read back
- **Encode** — temporary shield pattern
- **Corrupt** — DoT / area mess
- **Align** — buff when standing on grid marks

Bosses: rogue scanners, malformed versions of yourself, “Purpose” guardians that only open after enough fragments.

## Combat loop (v1 — in game.js)

- **Levels** scale density, enemy count/HP, soft walls, module drops
- **Mini-boss** every **3** levels (Hardened Reader)
- **Major boss** every **10** levels (named protocol, scales by decade)
- **Modules (powerups):** Swift (move), Rupture (break soft walls), Spike (damage), Nullify (boss damage), Repair, Fortify, Expand (scan range), Overclock
- Clear all threats → exit opens → next sector (modules persist for the run)
- Death = run reset (best sector remembered)

## Success metrics

- Feels like *you are the code*
- Level 1 readable; level 10+ scary
- Modules change decisions (break path vs fight, boss prep)

Not yet: accounts, multiplayer, cash shop, full map editor.
