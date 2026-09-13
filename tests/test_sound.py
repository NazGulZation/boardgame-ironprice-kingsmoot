"""IRON PRICE: Kingsmoot — Sound Effects Test Suite
Validates audio clip integrity, formats, file sizes, and server MIME delivery.
"""
import unittest
import wave
import re
from pathlib import Path
from http.server import HTTPServer
import threading
import urllib.request

from server import KingsmootHandler


class TestSoundEffects(unittest.TestCase):
    def setUp(self):
        self.project_root = Path(__file__).resolve().parent.parent
        self.sounds_dir = self.project_root / "web" / "assets" / "sounds"
        self.expected_keys = {
            "sail", "endTurn", "dice", "clash", "sink", "reave",
            "storm", "favor", "card", "victory", "defeat", "click"
        }

    def test_all_expected_audio_files_exist(self):
        """Verifies all required sound effect files exist on disk."""
        expected_files = [
            "sail.wav", "sail2.wav", "sail3.wav", "end_turn.wav",
            "dice.wav", "clash.wav", "sink.wav", "reave.wav",
            "storm.wav", "favor.wav", "card.wav", "victory.wav",
            "defeat.wav", "click.wav"
        ]
        for fname in expected_files:
            fpath = self.sounds_dir / fname
            self.assertTrue(fpath.exists(), f"Missing sound clip: {fname}")
            self.assertGreater(fpath.stat().st_size, 1000, f"File too small or empty: {fname}")

    def test_audio_format_mono_16bit(self):
        """Ensures all shipped audio clips are valid mono 16-bit PCM WAVs."""
        for wav_path in self.sounds_dir.glob("*.wav"):
            with wave.open(str(wav_path), "rb") as w:
                n_channels = w.getnchannels()
                sampwidth = w.getsampwidth()
                framerate = w.getframerate()
                n_frames = w.getnframes()
                duration = n_frames / framerate

                self.assertEqual(n_channels, 1, f"{wav_path.name} must be mono (got {n_channels} channels)")
                self.assertEqual(sampwidth, 2, f"{wav_path.name} must be 16-bit PCM (got {sampwidth * 8}-bit)")
                self.assertIn(framerate, [44100, 48000], f"{wav_path.name} unexpected rate: {framerate}")
                self.assertLess(duration, 5.0, f"{wav_path.name} duration exceeds 5s: {duration:.2f}s")
                self.assertLess(wav_path.stat().st_size, 450 * 1024, f"{wav_path.name} exceeds 450 KB")

    def test_sound_js_has_all_keys(self):
        """Verifies sound.js registers all expected sound keys."""
        sound_js = self.project_root / "web" / "js" / "sound.js"
        self.assertTrue(sound_js.exists())
        content = sound_js.read_text(encoding="utf-8")

        for key in self.expected_keys:
            pattern = rf"\b{key}\s*:"
            self.assertTrue(re.search(pattern, content), f"Key '{key}' not found in SoundFX.files")

    def test_server_delivers_audio_mime(self):
        """Verifies the Kingsmoot HTTP server delivers .wav files with correct MIME type."""
        srv = HTTPServer(("127.0.0.1", 8199), KingsmootHandler)
        t = threading.Thread(target=srv.serve_forever, daemon=True)
        t.start()
        try:
            for p in ["/assets/sounds/dice.wav", "/assets/sounds/clash.wav", "/assets/sounds/end_turn.wav"]:
                url = f"http://127.0.0.1:8199{p}"
                with urllib.request.urlopen(url) as resp:
                    self.assertEqual(resp.status, 200)
                    content_type = resp.headers.get_content_type()
                    self.assertIn("audio/", content_type)
        finally:
            srv.shutdown()
            srv.server_close()


if __name__ == "__main__":
    unittest.main()
