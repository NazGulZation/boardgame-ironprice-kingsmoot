---
name: ironprice-sound
description: >-
  Sound-effects workflow for IRON PRICE: Kingsmoot — sourcing CC0 sounds
  (horn, sea, battle), remixing them to mono 16-bit WAV clips, and wiring
  playback with mute toggle. Use when adding or changing game sounds,
  web/assets/sounds clips, or web/js/sound.js SoundFX hooks.
---

# IRON PRICE: Sound Sourcing & Remix Skill

This skill covers the full lifecycle of a game sound effect: finding a
CC0 source on the internet, remixing it into a small game clip with the
Python standard library only, and wiring it into the vanilla Web UI.

---

## 1. Rules (Non-Negotiable)

1. **CC0 / public domain only**: every shipped clip must come from a
   CC0 or public-domain source. Never ship CC-BY / CC-BY-SA / NC audio
   (attribution chains don't belong in a shipped game).
2. **No login-walled sources for final assets**: Freesound needs login —
   inspiration only. Primary: BigSoundBank (CC0, static direct links).
   See `references/sources.md` for the vetted catalog and URL patterns.
3. **Standard library only**: remixing uses `wave`/`struct`/`math`/`array`
   (see `scripts/remix_sounds.py` with 5 modes: `ship`/`horn`/`sea`/`slice`/`mix`).
   Never add audio packages (`pydub`, `librosa`, `ffmpeg` wrappers) — same
   zero-dependency rule as the game engine.
4. **Small clips only**: mono 16-bit WAV, 44.1/48 kHz, ≤ ~5 s, ≤ ~450 KB per clip
   (enforced by `tests/test_sound.py`). Ship excerpts, never full-length ambience beds.
5. **Attribution in code**: record source URL + author + license in the
   `web/js/sound.js` header comment for every shipped clip.
6. **Temp for sources, repo for clips**: download multi-MB sources to
   the system temp dir (`C:\Users\fidy7\AppData\Local\Temp\opencode`),
   commit only the remixed clips under `web/assets/sounds/`.
7. **Project quotas still apply**: new JS stays out of `web/js/app.js`
   (~627 lines — keep sound logic in `web/js/sound.js` ~211 lines); bump `?v=` in
   `web/index.html` when touching JS; binary audio is exempt from
   `tests/test_file_size.py` (`.wav/.mp3/.ogg/...` in
   `IGNORED_EXTENSIONS`).

---

## 2. Sourcing Runbook

1. Pick a CC0 candidate from `references/sources.md` (or vet a new one:
   confirm the license on the sound page, confirm a static direct link
   exists — grep the page HTML for `/UPLOAD/` on BigSoundBank).
2. Download the **WAV source** (PCM — the only format stdlib can remix)
   to temp, e.g.:
   ```powershell
   Invoke-WebRequest -Uri "https://bigsoundbank.com/UPLOAD/bwf-en/0266.wav" `
     -OutFile "C:\Users\fidy7\AppData\Local\Temp\opencode/sea_source.wav"
   ```
3. Inspect it (channels / width / rate / duration):
   ```powershell
   python -c "import wave; w=wave.open('<src>','rb'); print(w.getparams())"
   ```

---

## 3. Remix Runbook (`scripts/remix_sounds.py`)

Run from the project root. 5 stdlib-only modes: `ship` (horn blast + release tail),
`horn` (full-file sting), `sea` (loudest-window ambience excerpt), `slice`
(offset excerpt), `mix` (two-layer blend with gains/offsets). Soft mastering ~0.45 peak.

```powershell
# Sting (end-turn ship horn): blast crossfaded to natural release tail
python .agents/skills/ironprice-sound/scripts/remix_sounds.py ship `
  --src "C:\Users\fidy7\AppData\Local\Temp\opencode/0261.wav" `
  --dst web/assets/sounds/end_turn.wav

# Ambience excerpts (sailing movement variations):
# 1. Wave spray (0266 @27.0s)
python .agents/skills/ironprice-sound/scripts/remix_sounds.py sea `
  --src "C:\Users\fidy7\AppData\Local\Temp\opencode/sea_source.wav" `
  --dst web/assets/sounds/sail.wav --window 2.2 --start 27.0

# 2. Rolling surf (0698 @11.0s)
python .agents/skills/ironprice-sound/scripts/remix_sounds.py sea `
  --src "C:\Users\fidy7\AppData\Local\Temp\opencode/0698.wav" `
  --dst web/assets/sounds/sail2.wav --window 2.2 --start 11.0

# 3. Bow wave whoosh (0698 @31.0s)
python .agents/skills/ironprice-sound/scripts/remix_sounds.py sea `
  --src "C:\Users\fidy7\AppData\Local\Temp\opencode/0698.wav" `
  --dst web/assets/sounds/sail3.wav --window 2.2 --start 31.0

# Single-layer excerpt (dice / favor / card / horns / click):
python .agents/skills/ironprice-sound/scripts/remix_sounds.py slice `
  --src "C:\Users\fidy7\AppData\Local\Temp\opencode/0582.wav" `
  --dst web/assets/sounds/dice.wav --start 4.9 --window 1.6

# Two-layer blend (clash / sink / reave / storm):
python .agents/skills/ironprice-sound/scripts/remix_sounds.py mix `
  --src "C:\Users\fidy7\AppData\Local\Temp\opencode/1299.wav" `
  --src2 "C:\Users\fidy7\AppData\Local\Temp\opencode/0129.wav" `
  --dst web/assets/sounds/clash.wav --window 0.9 --window2 0.9
```

- Full 14-clip catalog + per-clip source/author/recipe: see `references/sources.md`
  (shipped table: `sail/sail2/sail3`, `end_turn`, `dice`, `clash`, `sink`, `reave`,
  `storm`, `favor`, `card`, `victory`, `defeat`, `click`).
- Naming: JS key `endTurn` → file `end_turn.wav`; `sail` key randomizes 3 files.
  Keep `SoundFX.files` keys stable — `tests/test_sound.py` asserts all 12 keys
  and all 14 files exist.

---

## 4. Wiring Runbook (`web/js/sound.js` + `web/js/app.js`)

- Playback goes through `SoundFX.play('<key>')` with 12 keys from
  `SoundFX.files`: `sail` (randomized 3-file array), `endTurn`, `dice`, `clash`,
  `sink`, `reave`, `storm`, `favor`, `card`, `victory`, `defeat`, `click`.
  Guard browser-only calls:
  `if (typeof SoundFX !== 'undefined') SoundFX.play('sail');`
- Voice pooling: `MAX_VOICES=4` per file, idle-voice reuse else oldest-steal;
  per-key base volumes + ±10% jitter; `sail/dice/click` get ±5% playback-rate wobble.
- Hook points: sail animations, dice reveals (`dice_gate.js` plays `dice` + per-die
  `click`), naval clash (`clash`), sink animations (`sink`), reave victory (`reave`),
  storm hazard/miracle (`storm`), favor gains (`favor`), victory/defeat fanfares via
  `playBattleResolution(battle, humanFaction)`, tactile button clicks via delegated
  `click` listener in `bindToggle()` (excludes the mute toggle itself).
- Mute toggle: `#btn-sound-toggle` in `web/index.html` header, bound in
  `bindEvents` via `SoundFX.bindToggle()` (persists to `localStorage`
  `ironprice_muted` as `1/0`; label `♪ Sound` / `✕ Sound`). `unlock()` preloads
  ALL keys on first pointerdown/keydown (autoplay policy).
- New clips need: file in `web/assets/sounds/`, key in
  `SoundFX.files` + `SoundFX.volumes`, header attribution comment, preload via
  `unlock()` (automatic), hook call, `?v=` bump, and updates to
  `tests/test_sound.py` expected lists + `references/sources.md`.

---

## 5. Validation Runbook

```powershell
node -c web/js/sound.js
python -m unittest discover -s tests   # 51 tests incl. file-size + web-UI + sound
python -m unittest tests.test_sound -v # 4 sound tests: existence / mono-16bit / keys / MIME
```

- In-process serve check (proves MIME + bytes without a live server):
  ```powershell
  python -c "
  import threading, urllib.request
  from server import KingsmootHandler
  from http.server import HTTPServer
  srv = HTTPServer(('127.0.0.1', 8124), KingsmootHandler)
  threading.Thread(target=srv.serve_forever, daemon=True).start()
  for p in ['/assets/sounds/sail.wav', '/assets/sounds/end_turn.wav']:
      with urllib.request.urlopen('http://127.0.0.1:8124' + p) as r:
          print(p, r.status, r.headers.get_content_type(), len(r.read()), 'bytes')
      assert r.status == 200
  srv.shutdown()"
  ```
- Headless `SoundFX` logic (mock `Audio`/`document`/`localStorage`):
  unlock preloads both clips, `play` fires correct files, toggle flips
  `ironprice_muted` and silences playback while muted.
