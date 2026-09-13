# Vetted CC0 Sound Sources (verified September 2026)

Use **only** CC0 / public-domain sources for game assets. No login-walled
downloads for final assets (Freesound requires login — inspiration only).
Record every shipped clip's source URL, author, and license in the
`sound.js` header comment when wiring it in.

## Shipped clips

| Game clip | Source | Author | License | Remix |
|---|---|---|---|---|
| `sail.wav` (2.2 s wave spray) | "Sea: Waves" (#0266), https://bigsoundbank.com/sea-waves-s0266.html | DenisChardonnet | CC0 | `sea` mode: wave spray window (@27.0 s), mono, peak 0.45, cosine fades |
| `sail2.wav` (2.2 s rolling surf) | "Sea Waves" (#0698), https://bigsoundbank.com/sea-waves-s0698.html | Joseph SARDIN | CC0 | `sea` mode: rolling surf window (@11.0 s), mono, peak 0.45, cosine fades |
| `sail3.wav` (2.2 s bow wave whoosh) | "Sea Waves" (#0698), https://bigsoundbank.com/sea-waves-s0698.html | Joseph SARDIN | CC0 | `sea` mode: bow wave whoosh window (@31.0 s), mono, peak 0.45, cosine fades |
| `end_turn.wav` (2.60 s war horn) | "War Horns", https://opengameart.org/content/war-horns | Eldritch Grim | CC0 | `slice` mode: deep resonant war horn (@24.6 s), mono, peak 0.45, soft ease-in/out |
| `dice.wav` (1.60 s dice roll) | "Four dice on wooden table" (#0582), https://bigsoundbank.com/four-dice-on-wooden-table-s0582.html | Joseph SARDIN | CC0 | `slice` mode: dice throw window (@4.9 s), mono, peak 0.45, natural tumble |
| `clash.wav` (0.92 s naval clash) | "Broken twigs #1" (#1299) + "Sword" (#0129) | Joseph SARDIN | CC0 | `mix` mode: timber fracture + metallic blade clash, mono, peak 0.45 |
| `sink.wav` (2.35 s ship sinking) | "Broken twigs #1" (#1299) + "Splash, Big #3" (#1521) | Joseph SARDIN | CC0 | `mix` mode: hull fracture + heavy water plunge, mono, peak 0.45 |
| `reave.wav` (1.80 s reave plunder) | "Coins #2" (#0194) + "Sword" (#0129) | Joseph SARDIN | CC0 | `mix` mode: cascading coins + iron blade strike, mono, peak 0.45 |
| `storm.wav` (3.20 s storm call) | "Thunder #3" (#3114) + "Sea: Waves" (#0266) | Joseph SARDIN / DenisChardonnet | CC0 | `mix` mode: low thunderclap + ocean gale surge, mono, peak 0.45 |
| `favor.wav` (2.20 s drowned favor) | "Sea: Waves" (#0266), https://bigsoundbank.com/sea-waves-s0266.html | DenisChardonnet | CC0 | `slice` mode: eerie deep water murmur (@26.5 s), mono, peak 0.38, raised-cosine fades |
| `card.wav` (1.10 s card play) | "Great Page that Turns #1" (#0362), https://bigsoundbank.com/great-page-that-turns-1-s0362.html | Joseph SARDIN | CC0 | `slice` mode: heavy parchment flutter (@0.55 s), mono, peak 0.40 |
| `victory.wav` (3.00 s war horn fanfare) | "War Horns", https://opengameart.org/content/war-horns | Eldritch Grim | CC0 | `slice` mode: triumphant war horn flourish (@35.8 s), mono, peak 0.45 |
| `defeat.wav` (2.80 s somber war horn) | "War Horns", https://opengameart.org/content/war-horns | Eldritch Grim | CC0 | `slice` mode: somber low horn drone (@40.8 s), mono, peak 0.42 |
| `click.wav` (0.16 s tactile click) | "Switch #5" (#0321), https://bigsoundbank.com/switch-5-s0321.html | Joseph SARDIN | CC0 | `slice` mode: mechanical iron/wood switch click (@0.18 s), mono, peak 0.35 |

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
