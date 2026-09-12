#!/usr/bin/env python3
"""IRON PRICE: Kingsmoot — Remix CC0 source WAVs into game clips.

Standard library only (wave/struct/math/array). Reads PCM WAV sources
downloaded per references/sources.md and writes small mono 16-bit clips
to web/assets/sounds/.

Three remix modes:
  ship — naval ship horn sting: blast head crossfaded to natural release tail.
  horn — full-file sting (e.g. war horn): normalize + fades.
  sea  — loudest-window ambience excerpt (e.g. sail splash): scan the
         source for the highest-energy window, downmix to mono.

Examples (run from the project root):
  python .agents/skills/ironprice-sound/scripts/remix_sounds.py ship \\
      --src <downloaded ship horn wav> --dst web/assets/sounds/end_turn.wav
  python .agents/skills/ironprice-sound/scripts/remix_sounds.py sea \\
      --src <downloaded sea wav> --dst web/assets/sounds/sail.wav
"""
import argparse
import array
import math
import struct
import wave
from pathlib import Path


def read_float_frames(path):
    """Read a PCM WAV file, return (samples_per_channel, n_channels, rate).

    Samples are floats in [-1.0, 1.0]; one list per channel.
    Supports 8/16/24/32-bit PCM (the formats CC0 libraries ship).
    """
    with wave.open(str(path), "rb") as w:
        n_channels = w.getnchannels()
        sampwidth = w.getsampwidth()
        rate = w.getframerate()
        n_frames = w.getnframes()
        raw = w.readframes(n_frames)
    if sampwidth == 1:  # unsigned 8-bit
        ints = [b - 128 for b in raw]
        scale = 128.0
    elif sampwidth == 2:
        ints = struct.unpack(f"<{len(raw) // 2}h", raw)
        scale = 32768.0
    elif sampwidth == 3:
        ints = [
            int.from_bytes(raw[i * 3:(i + 1) * 3], "little", signed=True)
            for i in range(len(raw) // 3)
        ]
        scale = 8388608.0
    elif sampwidth == 4:
        ints = struct.unpack(f"<{len(raw) // 4}i", raw)
        scale = 2147483648.0
    else:
        raise ValueError(f"Unsupported sample width: {sampwidth}")
    channels = [
        [ints[f * n_channels + c] / scale for f in range(n_frames)]
        for c in range(n_channels)
    ]
    return channels, n_channels, rate


def write_mono_16bit(path, samples, rate):
    """Write float mono samples as 16-bit PCM WAV."""
    pcm = array.array("h", (
        int(max(-1.0, min(1.0, s)) * 32767) for s in samples
    ))
    with wave.open(str(path), "wb") as w:
        w.setparams((1, 2, rate, len(samples), "NONE", "not compressed"))
        w.writeframes(pcm.tobytes())


def normalize(samples, peak_target):
    peak = max((abs(s) for s in samples), default=0.0)
    if peak <= 0.0:
        return list(samples)
    gain = peak_target / peak
    return [s * gain for s in samples]


def apply_linear_fades(samples, rate, fade_in_s, fade_out_s):
    out = list(samples)
    n = len(out)
    fi = min(int(rate * fade_in_s), n)
    fo = min(int(rate * fade_out_s), n)
    for i in range(fi):
        out[i] *= i / fi
    for i in range(n - fo, n):
        out[i] *= max(0.0, (n - i) / fo)
    return out


def apply_raised_cosine_fades(samples, rate, fade_in_s, fade_out_s):
    out = list(samples)
    n = len(out)
    fi = min(int(rate * fade_in_s), n)
    fo = min(int(rate * fade_out_s), n)
    for i in range(fi):
        out[i] *= 0.5 - 0.5 * math.cos(math.pi * i / fi)
    for i in range(n - fo, n):
        out[i] *= 0.5 - 0.5 * math.cos(math.pi * (n - i) / fo)
    return out


def remix_horn(src, dst, peak=0.7, fade_in_s=0.06, fade_out_s=0.6):
    """Full-file sting remix: mixdown, normalize, short fades."""
    channels, _, rate = read_float_frames(src)
    mono = [sum(frame) / len(frame) for frame in zip(*channels)]
    mono = normalize(mono, peak)
    mono = apply_linear_fades(mono, rate, fade_in_s, fade_out_s)
    write_mono_16bit(dst, mono, rate)
    return rate, len(mono)


def remix_sea(src, dst, window_s=2.2, peak=0.45,
              fade_in_s=0.35, fade_out_s=0.45, start_s=None):
    """Excerpt ambience remix: window excerpt, mono mixdown, soft fades."""
    channels, _, rate = read_float_frames(src)
    mono_src = [sum(frame) / len(frame) for frame in zip(*channels)]
    win = int(rate * window_s)
    hop = int(rate * 0.5)
    if start_s is not None:
        start = int(rate * start_s)
    elif len(mono_src) <= win:
        start = 0
    else:
        best_start, best_energy = 0, -1.0
        for st in range(0, len(mono_src) - win, hop):
            energy = sum(mono_src[st + k] ** 2 for k in range(0, win, 7))
            if energy > best_energy:
                best_energy, best_start = energy, st
        start = best_start
    seg = mono_src[start:start + win]
    seg = normalize(seg, peak)
    seg = apply_raised_cosine_fades(seg, rate, fade_in_s, fade_out_s)
    write_mono_16bit(dst, seg, rate)
    return rate, len(seg), start / rate


def remix_ship_horn(src, dst, peak=0.45, blast_s=1.8, release_start_s=5.5,
                    release_end_s=7.6, xfade_s=0.35, fade_in_s=0.08,
                    fade_out_s=0.5):
    """Naval ship horn sting: blast head crossfaded to natural release tail."""
    channels, _, rate = read_float_frames(src)
    mono_src = [sum(frame) / len(frame) for frame in zip(*channels)]

    xfade_len = int(rate * xfade_s)
    head_len = int(rate * blast_s)
    tail_start = int(rate * release_start_s)
    tail_end = min(int(rate * release_end_s), len(mono_src))

    head = mono_src[:head_len]
    tail = mono_src[tail_start:tail_end]

    res = head[:-xfade_len]
    for i in range(xfade_len):
        w_head = 0.5 + 0.5 * math.cos(math.pi * i / xfade_len)
        w_tail = 0.5 - 0.5 * math.cos(math.pi * i / xfade_len)
        res.append(head[len(head) - xfade_len + i] * w_head + tail[i] * w_tail)
    res.extend(tail[xfade_len:])

    res = normalize(res, peak)
    fi = min(int(rate * fade_in_s), len(res))
    fo = min(int(rate * fade_out_s), len(res))
    for i in range(fi):
        res[i] *= (i / fi)
    for i in range(len(res) - fo, len(res)):
        pos = (len(res) - i) / fo
        res[i] *= (pos ** 1.5)

    write_mono_16bit(dst, res, rate)
    return rate, len(res)


def main():
    parser = argparse.ArgumentParser(
        description="Remix CC0 source WAVs into Kingsmoot game clips.")
    parser.add_argument("mode", choices=["horn", "sea", "ship"],
                        help="Remix recipe to apply.")
    parser.add_argument("--src", required=True,
                        help="Downloaded CC0 source WAV file.")
    parser.add_argument("--dst", required=True,
                        help="Output game clip (mono 16-bit WAV).")
    parser.add_argument("--window", type=float, default=2.2,
                        help="Sea mode: excerpt length in seconds.")
    parser.add_argument("--start", type=float, default=None,
                        help="Sea mode: optional start offset in seconds.")
    parser.add_argument("--peak", type=float, default=None,
                        help="Normalize peak (default 0.45 soft mastering).")
    args = parser.parse_args()

    src, dst = Path(args.src), Path(args.dst)
    if not src.exists():
        raise SystemExit(f"Source not found: {src}")
    dst.parent.mkdir(parents=True, exist_ok=True)

    if args.mode == "ship":
        rate, n = remix_ship_horn(src, dst,
                                  peak=args.peak if args.peak else 0.45)
        print(f"Ship horn sting: {dst} ({n / rate:.2f}s @ {rate}Hz, "
              f"{dst.stat().st_size} bytes)")
    elif args.mode == "horn":
        rate, n = remix_horn(src, dst,
                             peak=args.peak if args.peak else 0.45)
        print(f"Horn sting: {dst} ({n / rate:.2f}s @ {rate}Hz, "
              f"{dst.stat().st_size} bytes)")
    else:
        rate, n, start = remix_sea(
            src, dst, window_s=args.window,
            start_s=args.start,
            peak=args.peak if args.peak else 0.45)
        print(f"Sea excerpt @{start:.2f}s: {dst} ({n / rate:.2f}s @ "
              f"{rate}Hz, {dst.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
