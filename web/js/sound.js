/**
 * IRON PRICE: Kingsmoot — Sound Effects (Vanilla Web Audio)
 *
 * Sources (all CC0 public domain, remixed locally with the Python
 * standard library only — trim/normalize/fade, mono 16-bit WAV):
 * - Sailing splash 1 (breaking wave spray): "Sea: Waves" (#0266) by DenisChardonnet,
 *   https://bigsoundbank.com/sea-waves-s0266.html (2.2 s swell excerpt).
 * - Sailing splash 2 (rolling surf surge): "Sea Waves" (#0698),
 *   https://bigsoundbank.com/sea-waves-s0698.html (2.2 s Atlantic surf).
 * - Sailing splash 3 (rushing bow wave whoosh): "Sea Waves" (#0698),
 *   https://bigsoundbank.com/sea-waves-s0698.html (2.2 s ocean bow wave surge).
 * - End turn ship horn: "Ocean Liner Horn #1" (#0261) by Joseph SARDIN,
 *   https://bigsoundbank.com/horn-of-a-ship-1-s0261.html (3.55 s ship sting).
 * Clips live in web/assets/sounds/ (sail.wav, sail2.wav, sail3.wav, end_turn.wav).
 */

class SoundFX {
  static files = {
    sail: [
      'assets/sounds/sail.wav',
      'assets/sounds/sail2.wav',
      'assets/sounds/sail3.wav'
    ],
    endTurn: 'assets/sounds/end_turn.wav'
  };

  static volumes = {
    sail: 0.35,
    endTurn: 0.35
  };

  static _audio = {};
  static _lastIndex = {};
  static _unlocked = false;
  static _muted = null;

  static isMuted() {
    if (SoundFX._muted === null) {
      try {
        SoundFX._muted = localStorage.getItem('ironprice_muted') === '1';
      } catch (e) {
        SoundFX._muted = false;
      }
    }
    return SoundFX._muted;
  }

  static setMuted(muted) {
    SoundFX._muted = Boolean(muted);
    try {
      localStorage.setItem('ironprice_muted', SoundFX._muted ? '1' : '0');
    } catch (e) { /* private mode: stay in memory */ }
    SoundFX.updateToggleLabel();
  }

  // Browsers block audio before any user gesture: arm playback on first input.
  static unlock() {
    if (SoundFX._unlocked || typeof Audio === 'undefined') return;
    SoundFX._unlocked = true;
    for (const key of Object.keys(SoundFX.files)) {
      const entry = SoundFX.files[key];
      const paths = Array.isArray(entry) ? entry : [entry];
      for (const p of paths) {
        try {
          const el = new Audio(p);
          el.preload = 'auto';
          el.load();
          SoundFX._audio[p] = el;
        } catch (e) { /* headless: ignore */ }
      }
    }
  }

  static play(name) {
    if (SoundFX.isMuted() || typeof Audio === 'undefined') return;
    try {
      const entry = SoundFX.files[name];
      if (!entry) return;

      let file;
      if (Array.isArray(entry)) {
        if (entry.length === 1) {
          file = entry[0];
        } else {
          const lastIdx = SoundFX._lastIndex[name] ?? -1;
          let idx;
          do {
            idx = Math.floor(Math.random() * entry.length);
          } while (idx === lastIdx && entry.length > 1);
          SoundFX._lastIndex[name] = idx;
          file = entry[idx];
        }
      } else {
        file = entry;
      }

      let el = SoundFX._audio[file];
      if (!el) {
        el = new Audio(file);
        SoundFX._audio[file] = el;
      }

      // Soft volume with subtle organic variance (+/- 10%)
      const baseVol = SoundFX.volumes[name] ?? 0.35;
      const jitterVol = baseVol * (0.90 + Math.random() * 0.20);
      el.volume = Math.max(0.05, Math.min(1.0, jitterVol));

      // Subtle playback rate variation (+/- 4%) for natural sea movement
      if (name === 'sail') {
        el.playbackRate = 0.96 + Math.random() * 0.08;
      } else {
        el.playbackRate = 1.0;
      }

      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { /* never break gameplay for audio */ }
  }

  static updateToggleLabel() {
    const btn = (typeof document !== 'undefined')
      ? document.getElementById('btn-sound-toggle') : null;
    if (btn) btn.textContent = SoundFX.isMuted() ? '✕ Sound' : '♪ Sound';
  }

  static bindToggle() {
    SoundFX.updateToggleLabel();
    const btn = (typeof document !== 'undefined')
      ? document.getElementById('btn-sound-toggle') : null;
    if (btn) btn.onclick = () => SoundFX.setMuted(!SoundFX.isMuted());
    if (typeof document !== 'undefined') {
      const arm = () => SoundFX.unlock();
      document.addEventListener('pointerdown', arm, { once: true });
      document.addEventListener('keydown', arm, { once: true });
    }
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = SoundFX;
