#!/usr/bin/env python3
"""
WCAG contrast check for the THRIVE palette.

Run before changing any colour token:

    python3 scripts/check-contrast.py

Exits non-zero if any pair fails, so it can go straight into CI once there is
one. No dependencies.

This exists because a calm palette drifts toward unreadable one token at a
time. Two regressions on 2026-08-12 were introduced *while deliberately making
things quieter*: --thrive-faint shipped at 2.36:1, under even the 3:1 a non-text
icon needs, and was then used for count text, which needs 4.5:1. Neither was
visible by eye. Both were caught here.

Values below must match :root in src/app/globals.css. If you change a token
there, change it here, and let the failures pick the replacement hex.
"""

import sys

# --- tokens, mirroring :root in globals.css --------------------------------
# Updated 2026-08-15 for the soft cream / hairline / mono-accent direction.
PAPER = "#faf9f5"  # --thrive-bg
WHITE = "#ffffff"  # --thrive-surface
SUNKEN = "#f1efea"  # --thrive-sunken   ALSO the row hover fill now

INK = "#17181c"  # --thrive-ink
BODY = "#3a3b42"  # --thrive-body
MUTED = "#6b6c72"  # --thrive-muted     ALL secondary and metadata text
FAINT = "#85868c"  # --thrive-faint     decorative text + control boundaries

PRIMARY = "#3f6b4f"  # --thrive-primary
PRIMARY_SOFT = "#e7eee9"  # --thrive-primary-soft
MINT = "#6aab84"  # --thrive-mint
ON_MINT = "#0f2117"  # --thrive-on-mint

INDIGO = "#4c5bd4"  # --thrive-indigo   RESERVED: "you are here"

ON_TRACK = "#3d6fb0"
WATCH = "#8f6220"
NEEDS_HELP = "#6a5fb0"
URGENT = "#b8462f"
CIVIC = "#8a5f8f"
LATER = "#64748b"

# Lines. The 2026-08-12 direction made the border the structural device and its
# ratio load-bearing. This direction reverses that: hairlines are decorative and
# are deliberately NOT checked, because nothing depends on seeing them.
#
# The exception that IS checked: control boundaries. A checkbox edge is the only
# thing marking where the control is, so it owes 3:1 under WCAG 1.4.11 -- and it
# owes it on the sunken hover fill too, not just on paper and card.
HAIRLINE = "#e6e3dc"  # --thrive-hairline        decorative, unchecked
HAIRLINE_SOFT = "#efece6"  # --thrive-hairline-soft   decorative, unchecked
CONTROL_LINE = FAINT  # --thrive-control-line    checked below

AA_TEXT = 4.5
AA_NON_TEXT = 3.0


def _linear(channel: int) -> float:
    c = channel / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_colour: str) -> float:
    h = hex_colour.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _linear(r) + 0.7152 * _linear(g) + 0.0722 * _linear(b)


def ratio(foreground: str, background: str) -> float:
    a, b = luminance(foreground), luminance(background)
    high, low = max(a, b), min(a, b)
    return (high + 0.05) / (low + 0.05)


# (foreground, background, label, required ratio)
CHECKS = [
    # --- Every ink tier against every surface ------------------------------
    # All three surfaces, not just two. The gap that shipped a bug last time
    # was checking paper and card and stopping, when sunken is where the
    # failure lived -- and sunken now matters more, not less, because it is
    # the row hover fill rather than an occasional well.
    (INK, PAPER, "ink on cream", AA_TEXT),
    (INK, WHITE, "ink on card", AA_TEXT),
    (INK, SUNKEN, "ink on sunken", AA_TEXT),
    (BODY, PAPER, "body on cream", AA_TEXT),
    (BODY, WHITE, "body on card", AA_TEXT),
    (BODY, SUNKEN, "body on sunken", AA_TEXT),
    (MUTED, PAPER, "muted on cream", AA_TEXT),
    (MUTED, WHITE, "muted on card", AA_TEXT),
    (MUTED, SUNKEN, "muted on sunken", AA_TEXT),
    # --- The accent --------------------------------------------------------
    (PRIMARY, WHITE, "forest text on card", AA_TEXT),
    (PRIMARY, PAPER, "forest text on cream", AA_TEXT),
    (WHITE, PRIMARY, "white on forest fill", AA_TEXT),
    (PRIMARY, PRIMARY_SOFT, "forest on primary-soft", AA_TEXT),
    (ON_MINT, MINT, "ink on mint fill", AA_TEXT),
    # --- Indigo, the reserved "you are here" -------------------------------
    (INDIGO, WHITE, "indigo marker text on card", AA_TEXT),
    (INDIGO, PAPER, "indigo marker text on cream", AA_TEXT),
    (WHITE, INDIGO, "white on indigo fill", AA_TEXT),
    # --- Status and categorical text ---------------------------------------
    (ON_TRACK, WHITE, "on-track blue text", AA_TEXT),
    (WATCH, WHITE, "watch amber text", AA_TEXT),
    (NEEDS_HELP, WHITE, "needs-help violet text", AA_TEXT),
    (URGENT, WHITE, "urgent coral text", AA_TEXT),
    (CIVIC, WHITE, "civic plum text", AA_TEXT),
    (LATER, WHITE, "later slate text", AA_TEXT),
    # --- Solid chip fills --------------------------------------------------
    (WHITE, URGENT, "white on urgent fill", AA_TEXT),
    (WHITE, WATCH, "white on watch fill", AA_TEXT),
    (WHITE, ON_TRACK, "white on on-track fill", AA_TEXT),
    (WHITE, NEEDS_HELP, "white on needs-help fill", AA_TEXT),
    (WHITE, CIVIC, "white on civic fill", AA_TEXT),
    (WHITE, LATER, "white on later fill", AA_TEXT),
    # --- Non-text graphics -------------------------------------------------
    (PRIMARY, PAPER, "focus ring on cream", AA_NON_TEXT),
    (PRIMARY, WHITE, "ring around mint fill", AA_NON_TEXT),
    (WATCH, WHITE, "amber dot", AA_NON_TEXT),
    (URGENT, WHITE, "coral dot", AA_NON_TEXT),
    (INDIGO, WHITE, "indigo marker dot", AA_NON_TEXT),
    # --- Control boundaries: the one exception to "hairlines are decorative"
    # WCAG 1.4.11. A checkbox, radio, input, select or resize grip edge is the
    # only thing saying where the control is, so it owes 3:1 on every surface
    # it can sit on -- including the sunken row-hover fill.
    (CONTROL_LINE, PAPER, "control boundary on cream", AA_NON_TEXT),
    (CONTROL_LINE, WHITE, "control boundary on card", AA_NON_TEXT),
    (CONTROL_LINE, SUNKEN, "control boundary on sunken", AA_NON_TEXT),
    # --- faint as decorative text ------------------------------------------
    (FAINT, PAPER, "faint on cream", AA_NON_TEXT),
    (FAINT, WHITE, "faint on card", AA_NON_TEXT),
    (FAINT, SUNKEN, "faint on sunken", AA_NON_TEXT),
]

# Ceilings, not floors. These assert a token stays BELOW a ratio, which is how
# "decorative only" stops being a comment nobody reads: if faint ever clears the
# text bar, someone will put words in it and get away with it.
# (foreground, background, label, must stay under)
CEILINGS = [
    (FAINT, PAPER, "faint stays decorative on cream", AA_TEXT),
    (FAINT, WHITE, "faint stays decorative on card", AA_TEXT),
    (FAINT, SUNKEN, "faint stays decorative on sunken", AA_TEXT),
]


def main() -> int:
    print(f"{'pair':<38}{'ratio':>9}{'need':>8}   result")
    print("-" * 68)

    failures = 0
    for foreground, background, label, required in CHECKS:
        measured = ratio(foreground, background)
        passed = measured >= required
        failures += not passed
        print(
            f"{label:<38}{measured:>8.2f}:1{required:>7.1f}+   "
            f"{'PASS' if passed else 'FAIL'}"
        )

    print("-" * 68)
    for foreground, background, label, ceiling in CEILINGS:
        measured = ratio(foreground, background)
        passed = measured < ceiling
        failures += not passed
        print(
            f"{label:<38}{measured:>8.2f}:1{ceiling:>7.1f}-   "
            f"{'PASS' if passed else 'FAIL'}"
        )

    total = len(CHECKS) + len(CEILINGS)
    print("-" * 68)
    print(f"{total - failures}/{total} pass")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
