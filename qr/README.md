# QR — Purpose Unknown

You are a QR code. Endless sectors. Random modules. Decode ??? into **Memory / RAM**.

## Play locally

```powershell
cd C:\Users\conor\qr-game
npx --yes serve .
```

## Controls

| Key | Action |
|-----|--------|
| WASD / arrows | Move (sets facing) |
| Space / E | Scan / sword |
| **F** | Bolt (needs Bolt/Rail/…) |
| **C** | Join-Us (convert enemy) |
| **G** | Drop bomb |
| **V** | Drop decoy |
| **B** | Rupture soft wall |
| Esc | Pause · Memory · Save/Load · Account |
| Enter / Space | Continue dialogs |

## What’s in

- **~40 modules** with unique **letter + shape + color**; rarity-weighted **random every run** (not fixed by level)
- **???** until first pickup → **Memory / RAM** forever (browser)
- **Mazes**: rooms, corridors, scatter, arena, braid, islands
- Soft walls, ice slides, hazards
- **Moving modules** on some drops
- Enemies: grunt, zig, patrol, elite · mini-boss /3 · major /10
- Abilities: Hulk, Ghost, Warp, Join-Us, Blade, Aegis, bombs, decoys, magnet, thorns…
- Pause: save/load, RAM codex, status, **Lifetime & Account LV**, QR cloud (`qr_*`)
- **Account level** (meta XP) survives runs; soft bonuses at run start
- Lifetime stats: kills, modules, bosses, mazes, damage, tools…

## Cloud (optional)

Separate Supabase project — see `docs/BACKEND.md` + `config.js`.
