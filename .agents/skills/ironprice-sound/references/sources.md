# Vetted CC0 Sound Sources (verified September 2026)

Use **only** CC0 / public-domain sources for game assets. No login-walled
downloads for final assets (Freesound requires login — inspiration only).
Record every shipped clip's source URL, author, and license in the
`sound.js` header comment when wiring it in.

## Shipped clips

| Game clip | Source | Author | License | Remix |
|---|---|---|---|---|
| `sail.wav` (2.2 s wave spray) | "Sea: Waves" (#0266), https://bigsoundbank.com/sea-waves-s0266.html | DenisChardonnet | CC0 | `sea` mode: wave spray window (@27.0 s), mono, −7 dB peak (0.45), cosine fades |
| `sail2.wav` (2.2 s rolling surf) | "Sea Waves" (#0698), https://bigsoundbank.com/sea-waves-s0698.html | Joseph SARDIN | CC0 | `sea` mode: rolling surf window (@11.0 s), mono, −7 dB peak (0.45), cosine fades |
| `sail3.wav` (2.2 s bow wave whoosh) | "Sea Waves" (#0698), https://bigsoundbank.com/sea-waves-s0698.html | Joseph SARDIN | CC0 | `sea` mode: bow wave whoosh window (@31.0 s), mono, −7 dB peak (0.45), cosine fades |
| `end_turn.wav` (3.55 s ship horn) | "Ocean Liner Horn #1" (#0261), https://bigsoundbank.com/horn-of-a-ship-1-s0261.html | Joseph SARDIN | CC0 | `ship` mode: 1.8 s blast crossfaded (350 ms) to natural release tail (5.5–7.6 s), −7 dB peak (0.45), 80 ms soft ease-in |

## BigSoundBank (primary — CC0, no login, static direct links)

Base for direct preview/download URLs (replace `<id>`; old sounds are
zero-padded, e.g. `0266`; newer ones are plain, e.g. `2526`):

- MP3 preview: `https://bigsoundbank.com/UPLOAD/mp3/<id>.mp3`
- OGG preview: `https://bigsoundbank.com/UPLOAD/ogg/<id>.ogg`
- WAV source: `https://bigsoundbank.com/UPLOAD/bwf-en/<id>.wav`
- Verify the pattern against the sound page HTML first: the `<audio>`
  tag lists the exact `/UPLOAD/...` paths (grep for `/UPLOAD/`).
- The `/download.php` form (POST) is **not** script-friendly — use the
  `/UPLOAD/` static links above with `Invoke-WebRequest`.
- WAV downloads are large (10 MB for a 58 s sea). Download to the
  system temp dir (`C:\Users\fidy7\AppData\Local\Temp\opencode`), never
  into the repo — only remixed clips are committed.

Useful alternates on the same site (all CC0, same URL scheme):

- "Horn #7" (#2526) — high-frequency vehicle horn (previous end-turn sting).
- "Ocean Liner Horn #4" (#3508) — two-blast ocean horn, 5 s.
- "Sea Waves" (#0698) — Atlantic surf, 2:46 (sail ambience alternate).
- "Sea Waves with Tern Calls" (#0267) — avoid for clips (gull calls).

## Wikimedia Commons (fallback — check license per file)

- `File:Waves.ogg` — Lake Ontario water compilation, **public domain**
  (PD-self, user Dsw4). 4:47 / 16.6 MB — too long to ship; excerpt only.
  Direct: `https://upload.wikimedia.org/wikipedia/commons/1/1f/Waves.ogg`
  (confirm the hash path on the file page; it can change per revision).
- Always confirm `Licensing` = public domain / CC0 on the file page.
  Avoid CC-BY / CC-BY-SA files (attribution chain in a shipped game).

## OpenGameArt (fallback — filter License = CC0)

- "War Horns" by Eldritch Grim (CC0): battle-horn stings.
- "Water Waves" (2012, CC0): short ocean splash.
- Requires account for some downloads — prefer BigSoundBank when equal.

## Freesound (inspiration only — login required to download)

- "Ocean Waves.wav" by Noted451 (CC0), "Viking Horn in D" by
  roemergruft (CC0), "Battle_horn_1" by kirmm (CC0).
- Do not depend on these for reproducible builds; use them to judge
  what a good horn/surf reference sounds like, then source the
  equivalent from BigSoundBank.
