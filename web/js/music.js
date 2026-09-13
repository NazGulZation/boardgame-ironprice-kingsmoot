/**
 * IRON PRICE: Kingsmoot — Background Ambient Music Player
 *
 * Sources (all CC0 Public Domain by Eldritch Grim, https://opengameart.org):
 * - Track 1: "Vikings at Shore" (ambient coastal swell & Nordic strings)
 * - Track 2: "Something Approaches" (dark atmospheric percussion & low drone)
 * - Track 3: "Ditty at the Viking Camp" (acoustic harbor & camp melody)
 * - Track 4: "Pirates Incoming" (rhythmic tribal war drums loop)
 */

class MusicPlayer {
  static tracks = [
    { id: 'shore', title: 'Vikings at Shore', file: 'assets/music/track1_vikings_at_shore.mp3' },
    { id: 'approaches', title: 'Something Approaches', file: 'assets/music/track2_something_approaches.mp3' },
    { id: 'camp', title: 'Ditty at the Viking Camp', file: 'assets/music/track3_ditty_at_camp.mp3' },
    { id: 'drums', title: 'Pirates Incoming', file: 'assets/music/track4_pirates_incoming.mp3' }
  ];

  static BASE_VOLUME = 0.22;
  static _audio = null;
  static _currentIndex = -1;
  static _unlocked = false;
  static _muted = null;

  static isMuted() {
    if (MusicPlayer._muted === null) {
      try {
        MusicPlayer._muted = localStorage.getItem('ironprice_music_muted') === '1';
      } catch (e) {
        MusicPlayer._muted = false;
      }
    }
    return MusicPlayer._muted;
  }

  static setMuted(muted) {
    MusicPlayer._muted = Boolean(muted);
    try {
      localStorage.setItem('ironprice_music_muted', MusicPlayer._muted ? '1' : '0');
    } catch (e) { /* private mode: stay in memory */ }

    MusicPlayer.updateToggleLabel();

    if (MusicPlayer._audio) {
      if (MusicPlayer._muted) {
        MusicPlayer._audio.pause();
      } else {
        const p = MusicPlayer._audio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } else if (!MusicPlayer._muted && MusicPlayer._unlocked) {
      MusicPlayer.playNext();
    }
  }

  static unlock() {
    if (MusicPlayer._unlocked || typeof Audio === 'undefined') return;
    MusicPlayer._unlocked = true;
    if (!MusicPlayer.isMuted() && (!MusicPlayer._audio || MusicPlayer._audio.paused)) {
      MusicPlayer.playNext();
    }
  }

  static playNext() {
    if (MusicPlayer.isMuted() || typeof Audio === 'undefined') return;
    const len = MusicPlayer.tracks.length;
    if (len === 0) return;

    let nextIdx;
    if (len === 1) {
      nextIdx = 0;
    } else {
      do {
        nextIdx = Math.floor(Math.random() * len);
      } while (nextIdx === MusicPlayer._currentIndex);
    }
    MusicPlayer._currentIndex = nextIdx;
    const track = MusicPlayer.tracks[nextIdx];

    try {
      if (!MusicPlayer._audio) {
        MusicPlayer._audio = new Audio();
        MusicPlayer._audio.addEventListener('ended', () => MusicPlayer.playNext());
      }
      MusicPlayer._audio.src = track.file;
      MusicPlayer._audio.volume = MusicPlayer.BASE_VOLUME;
      const p = MusicPlayer._audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { /* never break gameplay for audio */ }
  }

  static updateToggleLabel() {
    const btn = (typeof document !== 'undefined')
      ? document.getElementById('btn-music-toggle') : null;
    if (btn) {
      btn.textContent = MusicPlayer.isMuted() ? '✕ Music' : '♫ Music';
      btn.title = MusicPlayer.isMuted() ? 'Unmute background music' : 'Mute background music';
    }
  }

  static bindToggle() {
    MusicPlayer.updateToggleLabel();
    const btn = (typeof document !== 'undefined')
      ? document.getElementById('btn-music-toggle') : null;
    if (btn) btn.onclick = () => MusicPlayer.setMuted(!MusicPlayer.isMuted());

    if (typeof document !== 'undefined') {
      const arm = () => MusicPlayer.unlock();
      document.addEventListener('pointerdown', arm, { once: true });
      document.addEventListener('keydown', arm, { once: true });
    }
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = MusicPlayer;
