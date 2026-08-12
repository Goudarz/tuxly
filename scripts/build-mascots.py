#!/usr/bin/env python3
"""Generate the Tuxly mascot set.

Every mascot is the brand mark in a different pose, built from the same
geometry — same body curve, same eye positions, same amber beak — so the set
reads as one character rather than eight unrelated drawings.

Body, belly and eyes stay a single path with fill-rule=evenodd, exactly like
the mark: the belly and eyes are holes, so the background shows through and
the mascot sits on any surface. Only the beak and props are painted.

Two colour variants per pose:
    <name>.svg        ink body, for light backgrounds
    <name>-light.svg  snow body, for dark backgrounds

Run:  python3 scripts/build-mascots.py
"""

import os
import subprocess

OUT = "public/brand/mascots"

INK = "#0F141C"
SNOW = "#FAFAF7"
AMBER = "#FFB020"
EMBER = "#E07C10"

# ── base geometry, lifted from the mark ────────────────────────────────
BODY = (
    "M 100 26 A 45 45 0 0 0 60 92 C 52 114, 24 136, 21 158 "
    "C 18 170, 26 177, 40 177 L 160 177 C 174 177, 182 170, 179 158 "
    "C 176 136, 148 114, 140 92 A 45 45 0 0 0 100 26 Z"
)
BELLY = (
    "M 64 150 C 64 124, 80 108, 100 108 C 120 108, 136 124, 136 150 "
    "C 136 162, 134 171, 132 177 L 68 177 C 66 171, 64 162, 64 150 Z"
)
BEAK = "M 100 76 Q 111 81 114 90 Q 109 100 100 103 Q 91 100 86 90 Q 89 81 100 76 Z"

LEFT_EYE_X, RIGHT_EYE_X, EYE_Y = 83.0, 117.0, 68.0


# ── eyes ───────────────────────────────────────────────────────────────
def circle(cx, cy, r):
    return (
        f"M {cx} {cy} m -{r} 0 a {r} {r} 0 1 0 {2 * r} 0 "
        f"a {r} {r} 0 1 0 -{2 * r} 0 Z"
    )


def happy(cx, cy):
    """Upward crescent — a smiling, closed eye."""
    return f"M {cx - 9} {cy + 3} Q {cx} {cy - 11} {cx + 9} {cy + 3} Q {cx} {cy - 4} {cx - 9} {cy + 3} Z"


def closed(cx, cy):
    """Downward crescent — a shut, sleeping eye."""
    return f"M {cx - 9} {cy - 2} Q {cx} {cy + 10} {cx + 9} {cy - 2} Q {cx} {cy + 3} {cx - 9} {cy - 2} Z"


def cross(cx, cy):
    """Two crossed bars, for the error pose."""
    a, t = 8.0, 2.6
    return (
        f"M {cx - a} {cy - a + t} L {cx - a + t} {cy - a} L {cx + a} {cy + a - t} "
        f"L {cx + a - t} {cy + a} Z "
        f"M {cx + a} {cy - a + t} L {cx + a - t} {cy - a} L {cx - a} {cy + a - t} "
        f"L {cx - a + t} {cy + a} Z"
    )


EYES = {
    "open": lambda: circle(LEFT_EYE_X, EYE_Y, 8.5) + circle(RIGHT_EYE_X, EYE_Y, 8.5),
    "wide": lambda: circle(LEFT_EYE_X, EYE_Y, 11) + circle(RIGHT_EYE_X, EYE_Y, 11),
    "happy": lambda: happy(LEFT_EYE_X, EYE_Y) + happy(RIGHT_EYE_X, EYE_Y),
    "wink": lambda: happy(LEFT_EYE_X, EYE_Y) + circle(RIGHT_EYE_X, EYE_Y, 8.5),
    "closed": lambda: closed(LEFT_EYE_X, EYE_Y) + closed(RIGHT_EYE_X, EYE_Y),
    "cross": lambda: cross(LEFT_EYE_X, EYE_Y) + cross(RIGHT_EYE_X, EYE_Y),
    "look-down": lambda: circle(LEFT_EYE_X, EYE_Y + 4, 7) + circle(RIGHT_EYE_X, EYE_Y + 4, 7),
    "look-side": lambda: circle(LEFT_EYE_X + 6, EYE_Y, 7.5) + circle(RIGHT_EYE_X + 6, EYE_Y, 7.5),
}


# ── flippers ───────────────────────────────────────────────────────────
def mirror(d):
    """Mirror a path across the body's vertical axis (x = 100)."""
    out, nums, i = [], [], 0
    token = ""
    for ch in d:
        if ch.isalpha():
            out.append(token)
            token = ""
            out.append(ch)
        else:
            token += ch
    out.append(token)

    result = []
    for part in out:
        if part.isalpha():
            result.append(part)
            continue
        vals = part.replace(",", " ").split()
        flipped = []
        for idx, v in enumerate(vals):
            f = float(v)
            flipped.append(f"{200 - f:g}" if idx % 2 == 0 else f"{f:g}")
        result.append(" " + " ".join(flipped) + " ")
    return "".join(result)


FLIPPER_UP = "M 138 104 C 156 96, 172 74, 170 52 C 169 44, 158 43, 155 51 C 148 70, 141 86, 132 96 Z"
FLIPPER_OUT = "M 140 108 C 160 108, 178 118, 184 132 C 187 139, 179 146, 173 141 C 160 130, 148 124, 136 120 Z"
FLIPPER_CHIN = "M 138 106 C 150 100, 156 88, 150 80 C 146 75, 138 78, 138 85 C 138 92, 134 98, 128 100 Z"
FLIPPER_DOWN = "M 139 106 C 154 114, 162 132, 158 148 C 156 156, 146 155, 145 147 C 143 132, 140 118, 133 110 Z"
# Held out to the sides — reads as a shrug, and stays clear of the body.
FLIPPER_SHRUG = "M 134 110 C 156 104, 178 108, 191 121 C 196 126, 190 136, 183 132 C 168 124, 150 122, 132 125 Z"


# ── props, painted in amber ────────────────────────────────────────────
def prop_magnifier():
    return (
        f'<g transform="translate(150,120) rotate(-20)">'
        f'<circle cx="0" cy="0" r="26" fill="none" stroke="{AMBER}" stroke-width="9"/>'
        f'<path d="M 18 18 L 40 40" stroke="{AMBER}" stroke-width="11" stroke-linecap="round"/>'
        f"</g>"
    )


def prop_book():
    return (
        f'<g transform="translate(100,148)">'
        f'<path d="M -46 -18 C -30 -26, -10 -26, 0 -18 C 10 -26, 30 -26, 46 -18 '
        f'L 46 20 C 30 12, 10 12, 0 20 C -10 12, -30 12, -46 20 Z" fill="{AMBER}"/>'
        f'<path d="M 0 -18 L 0 20" stroke="{EMBER}" stroke-width="4"/>'
        f"</g>"
    )


def prop_terminal():
    return (
        f'<g transform="translate(154,126)">'
        f'<rect x="-42" y="-32" width="84" height="64" rx="9" fill="{AMBER}"/>'
        f'<path d="M -26 -8 L -14 2 L -26 12" fill="none" stroke="{INK}" '
        f'stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
        f'<path d="M -6 12 L 20 12" stroke="{INK}" stroke-width="6" stroke-linecap="round"/>'
        f"</g>"
    )


def prop_zzz():
    out = []
    for i, (x, y, s) in enumerate([(146, 60, 1.0), (172, 40, 0.72), (191, 24, 0.5)]):
        out.append(
            f'<g transform="translate({x},{y}) scale({s})" opacity="{1 - i * 0.18:g}">'
            f'<path d="M -13 -13 L 13 -13 L -13 13 L 13 13" fill="none" stroke="{AMBER}" '
            f'stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g>'
        )
    return "".join(out)


def prop_question():
    return (
        f'<g transform="translate(158,52)">'
        f'<path d="M -13 -14 C -13 -27, 14 -29, 14 -13 C 14 -2, 0 0, 0 11" fill="none" '
        f'stroke="{AMBER}" stroke-width="9" stroke-linecap="round"/>'
        f'<circle cx="0" cy="27" r="5.5" fill="{AMBER}"/>'
        f"</g>"
    )


def prop_sparks():
    out = []
    for x, y, s in [(30, 86, 0.85), (168, 40, 1.0), (186, 88, 0.6)]:
        out.append(
            f'<g transform="translate({x},{y}) scale({s})">'
            f'<path d="M 0 -16 Q 3 -3 16 0 Q 3 3 0 16 Q -3 3 -16 0 Q -3 -3 0 -16 Z" fill="{AMBER}"/>'
            f"</g>"
        )
    return "".join(out)


def prop_heart():
    return (
        f'<g transform="translate(152,74)">'
        f'<path d="M 0 22 C -26 6, -26 -12, -13 -18 C -6 -21, 0 -16, 0 -10 '
        f'C 0 -16, 6 -21, 13 -18 C 26 -12, 26 6, 0 22 Z" fill="{AMBER}"/>'
        f"</g>"
    )


# ── the set ────────────────────────────────────────────────────────────
# One viewBox for the whole set. Mascots get used side by side, so they have
# to share a scale — per-pose cropping would make the character grow and
# shrink from screen to screen.
VIEWBOX = "-8 6 216 182"

MASCOTS = [
    # name, eyes, flippers, prop, what it is for
    ("wave", "happy", [FLIPPER_UP], None, "greeting, hero, onboarding"),
    ("search", "look-side", [], prop_magnifier, "empty search results"),
    ("read", "look-down", [], prop_book, "articles, guides"),
    ("code", "open", [], prop_terminal, "code samples, docs"),
    ("sleep", "closed", [], prop_zzz, "no content yet, offline"),
    ("oops", "cross", [FLIPPER_SHRUG, mirror(FLIPPER_SHRUG)], None, "404 and error pages"),
    ("cheer", "happy", [FLIPPER_UP, mirror(FLIPPER_UP)], prop_sparks, "success, published"),
    ("think", "look-side", [], prop_question, "FAQ, help"),
    ("love", "happy", [], prop_heart, "thanks, sponsor, community"),
]


def build(name, eyes, flippers, prop, viewbox, body_colour, accent=AMBER):
    holes = BELLY + EYES[eyes]()
    parts = [
        f'<path fill="{body_colour}" fill-rule="evenodd" d="{BODY} {holes}"/>',
        *[f'<path fill="{body_colour}" d="{d}"/>' for d in flippers],
        f'<path fill="{accent}" d="{BEAK}"/>',
    ]
    if prop:
        parts.append(prop())
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" '
        f'role="img" aria-label="Tuxly mascot: {name}">'
        f"<title>Tuxly mascot: {name}</title>"
        + "".join(parts)
        + "</svg>"
    )


os.makedirs(OUT, exist_ok=True)
index = []

for name, eyes, flippers, prop, use in MASCOTS:
    for suffix, colour in (("", INK), ("-light", SNOW)):
        path = os.path.join(OUT, f"tuxly-{name}{suffix}.svg")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(build(name, eyes, flippers, prop, VIEWBOX, colour))
    index.append((name, use))
    print(f"  ✓ tuxly-{name}.svg  +  tuxly-{name}-light.svg   {use}")

print(f"\n  {len(MASCOTS) * 2} files in {OUT}/")
