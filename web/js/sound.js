/**
 * IRON PRICE: Kingsmoot — Sound Effects (Vanilla Web Audio)
 *
 * Sources (all CC0 public domain, remixed locally with the Python
 * standard library only — mono 16-bit WAV, soft-mastered <= 0.45 peak):
 * - Sailing splash 1 (breaking wave spray): "Sea: Waves" (#0266) by DenisChardonnet,
 *   https://bigsoundbank.com/sea-waves-s0266.html (2.2 s swell excerpt).
 * - Sailing splash 2 (rolling surf surge): "Sea Waves" (#0698) by Joseph SARDIN,
 *   https://bigsoundbank.com/sea-waves-s0698.html (2.2 s Atlantic surf).
 * - Sailing splash 3 (rushing bow wave whoosh): "Sea Waves" (#0698) by Joseph SARDIN,
 *   https://bigsoundbank.com/sea-waves-s0698.html (2.2 s ocean bow surge).
 * - End turn war horn: "War Horns" by Eldritch Grim (CC0),
 *   https://opengameart.org/content/war-horns (2.60 s resonant steer horn blast).
 * - Dice roll: "Four dice on wooden table" (#0582) by Joseph SARDIN,
 *   https://bigsoundbank.com/four-dice-on-wooden-table-s0582.html (1.60 s tumble).
 * - Naval clash: "Broken twigs #1" (#1299) + "Sword" (#0129) by Joseph SARDIN,
 *   https://bigsoundbank.com (0.92 s timber fracture & metal blade clash).
 * - Ship sinking: "Broken twigs #1" (#1299) + "Thunder #3" (#3114) + "Sea: Waves" (#0266),
 *   https://bigsoundbank.com (2.40 s violent hull fracture, deep bass rumble & ocean surge).
 * - Reave plunder: "Coins #2" (#0194) + "Sword" (#0129) by Joseph SARDIN,
 *   https://bigsoundbank.com (1.80 s cascading iron coins & blade strike).
 * - Storm call / hazard: "Thunder #3" (#3114) + "Sea: Waves" (#0266),
 *   https://bigsoundbank.com (3.20 s low thunderclap & ocean gale surge).
 * - Drowned favor: "Sea: Waves" (#0266) by DenisChardonnet,
 *   https://bigsoundbank.com/sea-waves-s0266.html (2.20 s eerie murmuring depths).
 * - Card play: "Great Page that Turns #1" (#0362) by Joseph SARDIN,
 *   https://bigsoundbank.com/great-page-that-turns-1-s0362.html (1.10 s parchment flutter).
 * - Victory fanfare: "War Horns" by Eldritch Grim (CC0),
 *   https://opengameart.org/content/war-horns (3.00 s triumphant war horn flourish).
 * - Defeat somber tone: "War Horns" by Eldritch Grim (CC0),
 *   https://opengameart.org/content/war-horns (2.80 s somber low horn drone).
 * - Tactile click: "Switch #5" (#0321) by Joseph SARDIN,
 *   https://bigsoundbank.com/switch-5-s0321.html (0.16 s iron/wood switch click).
 * - Ship click: "Boat: foredeck" (#0694) + "Rowing slowly" (#1514) by Joseph SARDIN,
 *   https://bigsoundbank.com (0.52 s timber creak & oar water lap).
 * - Muster crew: "Sword" (#0129) + "Broken twigs #1" (#1299) by Joseph SARDIN + "War Horns" by Eldritch Grim,
 *   (1.75 s shield strike, steel draw & rally horn call).
 *
 * All clips live under web/assets/sounds/.
 */

class SoundFX {
  static MAX_VOICES = 4;

  static files = {
    sail: [
      'assets/sounds/sail.wav',
      'assets/sounds/sail2.wav',
      'assets/sounds/sail3.wav'
    ],
    endTurn: 'assets/sounds/end_turn.wav',
    dice: 'assets/sounds/dice.wav',
    clash: 'assets/sounds/clash.wav',
    sink: 'assets/sounds/sink.wav',
    reave: 'assets/sounds/reave.wav',
    storm: 'assets/sounds/storm.wav',
    favor: 'assets/sounds/favor.wav',
    card: 'assets/sounds/card.wav',
    victory: 'assets/sounds/victory.wav',
    defeat: 'assets/sounds/defeat.wav',
    click: 'assets/sounds/click.wav',
    shipClick: 'assets/sounds/ship_click.wav',
    muster: 'assets/sounds/muster.wav'
  };

  static volumes = {
    sail: 0.35,
    endTurn: 0.40,
    dice: 0.38,
    clash: 0.40,
    sink: 0.40,
    reave: 0.40,
    storm: 0.42,
    favor: 0.35,
    card: 0.35,
    victory: 0.42,
    defeat: 0.40,
    click: 0.28,
    shipClick: 0.36,
    muster: 0.42
  };

  static _pools = {};
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
          if (!SoundFX._pools[p]) SoundFX._pools[p] = [];
          const el = new Audio(p);
          el.preload = 'auto';
          el.load();
          SoundFX._pools[p].push(el);
        } catch (e) { /* headless: ignore */ }
      }
    }
  }

  static _getVoice(file) {
    if (!SoundFX._pools[file]) SoundFX._pools[file] = [];
    const pool = SoundFX._pools[file];

    // Find an idle voice
    for (const el of pool) {
      if (el.paused || el.ended) return el;
    }

    // If pool is not full, allocate new voice
    if (pool.length < SoundFX.MAX_VOICES) {
      try {
        const el = new Audio(file);
        pool.push(el);
        return el;
      } catch (e) { /* headless: fallback */ }
    }

    // If all voices are busy, steal the oldest (highest currentTime)
    let oldest = pool[0];
    let maxTime = -1;
    for (const el of pool) {
      if (el.currentTime > maxTime) {
        maxTime = el.currentTime;
        oldest = el;
      }
    }
    return oldest || pool[0];
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

      const el = SoundFX._getVoice(file);
      if (!el) return;

      // Soft volume with subtle organic variance (+/- 10%)
      const baseVol = SoundFX.volumes[name] ?? 0.35;
      const jitterVol = baseVol * (0.90 + Math.random() * 0.20);
      el.volume = Math.max(0.05, Math.min(1.0, jitterVol));

      // Subtle playback rate variation for natural organic feel
      if (name === 'sail' || name === 'dice' || name === 'click' || name === 'shipClick') {
        el.playbackRate = 0.95 + Math.random() * 0.10;
      } else {
        el.playbackRate = 1.0;
      }

      el.currentTime = 0;
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { /* never break gameplay for audio */ }
  }

  static playBattleResolution(battle, humanFaction) {
    if (!battle || battle.state !== 'finished' || !humanFaction) return;
    const isAtt = battle.attacker_faction === humanFaction;
    const isDef = battle.defender_faction === humanFaction;
    if (!isAtt && !isDef) return; // AI vs AI battles remain neutral

    if (battle.winner_faction === humanFaction) {
      SoundFX.play('victory');
    } else if (battle.winner_faction) {
      SoundFX.play('defeat');
    }
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

      // Delegated tactile feedback on tactical buttons & modals
      document.body.addEventListener('click', (e) => {
        const target = e.target && e.target.closest(
          'button, .btn-action, .modal-close, .battle-action-btn, .choice-btn, .card-action-btn'
        );
        if (target && target.id !== 'btn-sound-toggle' && target.id !== 'btn-music-toggle') {
          SoundFX.play('click');
        }
      }, { passive: true });
    }
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = SoundFX;
