# Writes two MIDI files for the Vesuvius world, rendered later with a sampled GM soundfont.
#  bay.mid  - dreamy 1950s-style Italian lounge, guitars only (nylon fingerpicking + a second guitar singing the tune)
#  tar.mid  - a Neapolitan tarantella in 6/8: accordion + picked "mandolin" tremolo, nylon guitar oom-pah, tambourine
# Original melodies; only the style follows Maclain's references.
import random, mido
random.seed(7)
TPB = 480
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}
NOTE.update({'Db': 1, 'Eb': 3, 'Gb': 6, 'Ab': 8, 'Bb': 10})
def n(s):  # 'A4' -> midi
    name, octv = s[:-1], int(s[-1]); return 12 * (octv + 1) + NOTE[name]

class Track:
    def __init__(self, ch, prog, vol=100, pan=64, rev=60, cho=0):
        self.ch, self.ev = ch, []
        self.setup = [mido.Message('program_change', channel=ch, program=prog, time=0),
                      mido.Message('control_change', channel=ch, control=7, value=vol, time=0),
                      mido.Message('control_change', channel=ch, control=10, value=pan, time=0),
                      mido.Message('control_change', channel=ch, control=91, value=rev, time=0),
                      mido.Message('control_change', channel=ch, control=93, value=cho, time=0)]
    def note(self, t, pitch, dur, vel, human=12):
        j = random.randint(-human, human) if human else 0
        t = max(0, int(t + j)); v = max(1, min(127, int(vel + random.randint(-8, 8))))
        self.ev.append((t, 1, pitch, v)); self.ev.append((t + max(10, int(dur)), 0, pitch, 0))
    def midi(self):
        tr = mido.MidiTrack(); tr.extend(self.setup); last = 0
        for t, on, p, v in sorted(self.ev, key=lambda e: (e[0], e[1])):
            tr.append(mido.Message('note_on' if on else 'note_off', channel=self.ch, note=p, velocity=v, time=t - last)); last = t
        return tr

def save(path, bpm, tracks, total, num=4, den=4):
    mf = mido.MidiFile(ticks_per_beat=TPB); meta = mido.MidiTrack()
    meta.append(mido.MetaMessage('set_tempo', tempo=mido.bpm2tempo(bpm), time=0))
    meta.append(mido.MetaMessage('time_signature', numerator=num, denominator=den, time=0))
    meta.append(mido.MetaMessage('end_of_track', time=total)); mf.tracks.append(meta)
    for t in tracks: mf.tracks.append(t.midi())
    mf.save(path)

# ---------------- BAY: lounge, 4/4, swung eighths, ~76 bpm, F major ----------------
CH = {  # chord tones (low to high) for the fingerpicking
 'Fmaj7': ['F2', 'C3', 'E3', 'A3', 'C4'], 'Dm9': ['D2', 'A2', 'F3', 'C4', 'E4'], 'Gm7': ['G2', 'D3', 'F3', 'Bb3', 'D4'],
 'C9': ['C2', 'G2', 'E3', 'Bb3', 'D4'], 'Bbmaj7': ['Bb1', 'F2', 'D3', 'A3', 'D4'], 'Am7': ['A1', 'E2', 'G3', 'C4', 'E4'],
 'D7b9': ['D2', 'A2', 'F#3', 'C4', 'Eb4'], 'G9': ['G1', 'D2', 'F3', 'B3', 'A4'], 'F6': ['F2', 'C3', 'D3', 'A3', 'C4'],
 'Ebmaj7': ['Eb2', 'Bb2', 'D3', 'G3', 'Bb3'], 'C7sus': ['C2', 'G2', 'F3', 'Bb3', 'C4'], 'Gm9': ['G1', 'D2', 'F3', 'A3', 'Bb3'],
 'E7b9': ['E2', 'B2', 'G#3', 'D4', 'F4'], 'A7': ['A1', 'E2', 'G3', 'C#4', 'E4'],
}
form = (['Fmaj7', 'Dm9', 'Gm7', 'C9', 'Fmaj7', 'Bbmaj7', 'Gm7', 'C9'] +
        ['Fmaj7', 'Dm9', 'Gm7', 'C9', 'Am7', 'D7b9', 'Gm9', 'C7sus'] +
        ['Bbmaj7', 'Ebmaj7', 'Am7', 'D7b9', 'Gm7', 'E7b9', 'A7', 'C7sus'] +
        ['Fmaj7', 'Dm9', 'Gm7', 'C9', 'Bbmaj7', 'Gm9', 'C7sus', 'F6'])
# tune (my own): (pitch or None, beats) per bar, 4 beats each
tune = [
 [('C5', 1.5), ('A4', .5), ('G4', 1), ('A4', 1)], [('F5', 2), ('E5', 1), ('D5', 1)], [('D5', 1.5), ('Bb4', .5), ('A4', 1), ('Bb4', 1)], [('E5', 3), (None, 1)],
 [('C5', 1.5), ('A4', .5), ('G4', 1), ('A4', 1)], [('D5', 1.5), ('F5', .5), ('A5', 2)], [('G5', 1), ('F5', 1), ('E5', 1), ('D5', 1)], [('C5', 3), (None, 1)],
 [('A4', .5), ('C5', .5), ('F5', 2), ('E5', 1)], [('D5', .5), ('E5', .5), ('F5', 1), ('A5', 2)], [('G5', 1.5), ('F5', .5), ('D5', 1), ('Bb4', 1)], [('E5', 2), ('D5', 1), ('C5', 1)],
 [('C5', 1), ('E5', 1), ('G5', 1.5), ('E5', .5)], [('F#5', 2), ('Eb5', 1), ('D5', 1)], [('D5', 1.5), ('Bb4', .5), ('A4', 1), ('G4', 1)], [('F4', 3), (None, 1)],
 [('D5', 1.5), ('F5', .5), ('A5', 2)], [('G5', 1.5), ('Eb5', .5), ('Bb4', 2)], [('C5', 1), ('E5', 1), ('G5', 1), ('E5', 1)], [('F#5', 3), (None, 1)],
 [('Bb4', 1), ('D5', 1), ('F5', 1), ('A5', 1)], [('G#5', 2), ('F5', 1), ('D5', 1)], [('E5', 1.5), ('C#5', .5), ('A4', 2)], [('Bb4', 2), ('C5', 2)],
 [('C5', 1.5), ('A4', .5), ('G4', 1), ('A4', 1)], [('F5', 2), ('E5', 1), ('D5', 1)], [('D5', 1.5), ('Bb4', .5), ('A4', 1), ('Bb4', 1)], [('E5', 3), (None, 1)],
 [('D5', 1.5), ('F5', .5), ('A5', 1.5), ('G5', .5)], [('F5', 1), ('D5', 1), ('Bb4', 1), ('A4', 1)], [('G4', 1), ('Bb4', 1), ('D5', 2)], [('F5', 3), (None, 1)],
]
BAR = 4 * TPB
def swing(b):  # swung eighths: the off-beat eighth lands a bit late
    whole, frac = int(b), b - int(b)
    return whole + (.58 if abs(frac - .5) < 1e-6 else frac)
def bay():
    pick = Track(0, 24, vol=92, pan=50, rev=70, cho=20)   # nylon guitar, fingerpicking
    lead = Track(1, 24, vol=110, pan=78, rev=80, cho=30)  # second nylon guitar sings the tune
    passes = 2
    for p in range(passes):
        for i, ch in enumerate(form):
            t0 = (p * len(form) + i) * BAR; c = [n(x) for x in CH[ch]]
            # travis-ish pattern: bass on 1 & 3, chord tones rolling between
            pat = [(0, 0, 1.4, 74), (.5, 3, .9, 52), (1, 2, .9, 50), (1.5, 4, .9, 48), (2, 1, 1.4, 66), (2.5, 3, .9, 50), (3, 2, .9, 48), (3.5, 4, .9, 46)]
            if i % 8 == 7: pat = [(0, 0, 3, 70), (.02, 1, 3, 50), (.05, 2, 3, 48), (.08, 3, 3, 46), (.11, 4, 3, 46)]  # strum-roll to close a phrase
            for b, k, d, v in pat:
                pick.note(t0 + swing(b) * TPB, c[k], d * TPB, v * (0.9 if p else 1))
            t = 0
            for pitch, beats in tune[i]:
                if pitch:
                    lead.note(t0 + swing(t) * TPB, n(pitch), beats * TPB * .95, 84 if beats >= 1 else 72, human=18)
                t += beats
    save('bay.mid', 76, [pick, lead], passes * len(form) * BAR)

# ---------------- TARANTELLA: 6/8, A minor, fast ----------------
E8 = TPB // 2          # an eighth note; a 6/8 bar = 6 eighths = 3 beats of TPB
TBAR = 6 * E8
tchords = (['Am', 'Am', 'E7', 'E7', 'E7', 'E7', 'Am', 'Am', 'Dm', 'Am', 'E7', 'Am', 'Dm', 'Am', 'E7', 'Am'] +
           ['C', 'C', 'G7', 'G7', 'G7', 'G7', 'C', 'C', 'F', 'C', 'G7', 'C', 'Dm', 'Am', 'E7', 'Am'])
TCH = {'Am': ('A2', ['A3', 'C4', 'E4']), 'E7': ('E2', ['G#3', 'B3', 'D4']), 'Dm': ('D2', ['A3', 'D4', 'F4']),
       'C': ('C3', ['G3', 'C4', 'E4']), 'G7': ('G2', ['B3', 'D4', 'F4']), 'F': ('F2', ['A3', 'C4', 'F4'])}
# melody: 6 eighths per bar (None = rest, '-' = hold previous)
tmel = [
 'E5 A5 A5 G#5 A5 B5', 'C6 B5 A5 E5 - -', 'D5 E5 F5 E5 D5 C5', 'B4 C5 D5 B4 G#4 E4',
 'B4 D5 F5 E5 D5 B4', 'G#4 B4 D5 F5 E5 D5', 'C5 E5 A5 G#5 A5 B5', 'A5 - - E5 - -',
 'F5 E5 D5 F5 A5 D6', 'C6 B5 A5 E5 C5 A4', 'B4 G#4 B4 D5 E5 G#5', 'A5 - E5 A4 - -',
 'D5 F5 A5 F5 D5 A4', 'C5 E5 A5 E5 C5 A4', 'G#4 B4 E5 D5 C5 B4', 'A4 - - A5 - -',
 'E5 G5 C6 B5 C6 E6', 'D6 C6 G5 E5 - -', 'D5 F5 B5 A5 B5 D6', 'C6 B5 G5 F5 D5 B4',
 'B4 D5 G5 F5 D5 B4', 'G4 B4 D5 F5 E5 D5', 'E5 G5 C6 B5 C6 D6', 'C6 - - G5 - -',
 'A5 C6 F6 E6 C6 A5', 'G5 C6 E6 C6 G5 E5', 'F5 D5 B4 G5 F5 D5', 'E5 - - C5 - -',
 'D5 F5 A5 D6 C6 A5', 'C5 E5 A5 C6 B5 A5', 'G#5 B5 E6 D6 B5 G#5', 'A5 - - A4 - -',
]
def tar():
    acc = Track(0, 21, vol=96, pan=44, rev=50, cho=20)     # accordion: the tune
    man = Track(1, 25, vol=78, pan=88, rev=55, cho=10)     # steel-string picked fast = mandolin-ish tremolo
    gtr = Track(2, 24, vol=100, pan=64, rev=40)             # nylon guitar: bass + chord (oom-pah)
    drum = Track(9, 0, vol=96, pan=72, rev=30)              # tambourine
    passes = 2
    for p in range(passes):
        for i, ch in enumerate(tchords):
            t0 = (p * len(tchords) + i) * TBAR; bass, chord = TCH[ch]
            # oom-pah in 6/8: bass on 1 and 4, chord on 3 and 6 (and a light 2 & 5)
            gtr.note(t0, n(bass), 2 * E8, 82, human=6); gtr.note(t0 + 3 * E8, n(bass) + (7 if i % 2 else 0), 2 * E8, 74, human=6)
            for k in (2, 5):
                for j, c in enumerate(chord): gtr.note(t0 + k * E8 + j * 8, n(c), E8 * .8, 62, human=4)
            # tambourine: shake on every eighth, accents on 1 and 4
            for k in range(6): drum.note(t0 + k * E8, 54, E8 // 2, 92 if k in (0, 3) else 54, human=8)
            # tune
            prev = None; notes = tmel[i].split()
            k = 0
            while k < 6:
                tok = notes[k]; ln = 1
                while k + ln < 6 and notes[k + ln] == '-': ln += 1
                if tok not in ('-', 'None'):
                    acc.note(t0 + k * E8, n(tok), ln * E8 * .92, 88 if k in (0, 3) else 74, human=8)
                    # mandolin doubles the tune an octave down... in tremolo (fast repeated picks) on long notes
                    if p == 1 or i >= 16:
                        reps = max(1, ln * 3); step = ln * E8 // reps
                        for r in range(reps): man.note(t0 + k * E8 + r * step, n(tok), step * .9, 70 if r == 0 else 52, human=4)
                k += ln
    save('tar.mid', 138, [acc, man, gtr, drum], passes * len(tchords) * TBAR, num=6, den=8)

bay(); tar(); print('ok')
