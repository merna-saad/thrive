#!/usr/bin/env python3
"""
WCAG contrast check for the THRIVE palette.

Run before changing any colour token:

    python3 scripts/check-contrast.py

Exits non-zero if any pair fails, so it can go straight into CI once there is
one. No dependencies.

This exists because a calm palette drifts toward unreadable one token at a time.
Two regressions on 2026-08-12 were introduced *while deliberately making things
quieter*: --thrive-faint shipped at 2.36:1, under even the 3:1 a non-text icon
needs, and was then used for count text, which needs 4.5:1. Neither was visible
by eye. Both were caught here.

## It reads app.css now (2026-08-22)

Until this pass the token values were mirrored here by hand, and the docstring
said "if you change a token there, change it here" -- which is a process, not a
guarantee. A repalette is exactly the moment that process fails: 43 assertions
were checking the green palette while the app rendered navy, and the gate would
have reported 43/43 the whole time.

So the tokens are now PARSED from frontend/src/app.css. A token edited there is
checked here, and the two cannot drift. The checks below name tokens by their
CSS custom-property name, so a rename or a typo fails loudly instead of being
silently skipped.

Known limit, stated rather than hidden: `color-mix()` values are not evaluated.
Resolving them faithfully means reimplementing oklab mixing and hoping it
matches the browser's rounding -- a gate that checks a colour nobody sees is
worse than no gate. Unresolved tokens are listed in the output, and none of them
is a pair this file checks in that theme. If a checked token ever becomes a
color-mix, the lookup raises instead of guessing.

## It checks BOTH THEMES now (2026-08-21)

THRIVE gained a dark theme, and every colour token in app.css became a
`light-dark(light, dark)` pair. So every check below runs TWICE, once per theme,
against that theme's own surfaces. A dark theme whose contrast was never
measured would be a second palette with none of the guarantees the first one has
-- and "dark is dimmer so it needs less" is the exact reasoning this file exists
to refuse.

Parsing a `light-dark()` is EXACT, which is worth noting next to the color-mix
limit above: both values are literals in one declaration, so there is no mixing
to reimplement and no rounding to guess at. That is most of why the palette is
expressed that way rather than as a second `:root` block -- a gate that can read
both arms of one declaration cannot be fooled by a theme somebody forgot to
update, because there is nowhere for a token to exist in one theme only.

Three kinds of check are DELIBERATELY NOT symmetric between the themes, and each
says so at its own definition:

  - yellow, whose ceiling is a light-theme fact and whose floor is a dark-theme
    fact. The same colour, measuring 1.43:1 and 9.06:1.
  - the yellow/navy pairing, which inverts outright.
  - the soft tints, which are literals on dark and color-mix on light, so only
    the dark half can be measured at all.

Anything else that differs between the themes is a bug in the palette, not a
property of it.

## The rule that matters when this fails

If a pair fails, THE COLOUR CHANGES, NOT THE THRESHOLD. The thresholds are WCAG,
not preference. Where a brand colour cannot meet the bar for a role -- as UC San
Diego Yellow cannot, at 1.50:1 on white -- the ROLE changes: yellow is
decoration on light surfaces and carries meaning only against navy. That is
enforced below as a ceiling, not waived.

That rule is not relaxed for dark. A dark value that fails gets retuned, and the
retune is done in oklch at fixed hue so the token keeps its meaning -- which is
how every dark value in app.css was arrived at in the first place.

## Verified to fail

The third property every gate in this repo owes. Each was broken on purpose and
the reds counted, with the file restored after:

    dark `muted` dimmed one step               1 red  (muted on sunken, the floor)
    dark `faint` lifted past its ceiling       3 red  (all three ceilings)
    `on-primary` left white on dark            9 red  (every solid fill)
    navy left at the brand value on dark       7 red
    a soft tint pointed at the wrong hue       1 red  (the coupling check)
    `color-scheme` back to light-only          1 red  (structure)
    the variant's media arm deleted            1 red  (structure)

Exit code 1 on any of them, 0 restored.

The two structural ones are the entries worth having, because they are the
failures with NO visual symptom for whoever is testing: delete the variant's
media arm and every student whose OS is dark but who never touched the toggle
silently gets the light theme, which looks perfectly correct on a light machine.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

CSS_PATH = Path(__file__).resolve().parent.parent / "frontend" / "src" / "app.css"

AA_TEXT = 4.5
AA_NON_TEXT = 3.0

_HEX = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
_VAR = re.compile(r"^var\(\s*(--[A-Za-z0-9-]+)\s*\)$")
# `light-dark(a, b)`, where either arm may itself be a function call with its own
# commas -- `light-dark(color-mix(in oklab, #abc 9%, white), #123456)` is real.
# So the split is by PAREN DEPTH rather than by the comma, which a naive
# `split(",")` gets wrong on exactly the tokens that matter most.
_LIGHT_DARK = re.compile(r"^light-dark\((.*)\)$", re.DOTALL)

LIGHT, DARK = "light", "dark"
THEMES = (LIGHT, DARK)


def split_light_dark(inner: str) -> tuple[str, str]:
    """The two arms of a `light-dark()`, split at depth zero."""
    depth, cut = 0, None
    for index, character in enumerate(inner):
        if character == "(":
            depth += 1
        elif character == ")":
            depth -= 1
        elif character == "," and depth == 0:
            cut = index
            break
    if cut is None:
        raise SystemExit(f"light-dark() with one arm: light-dark({inner})")
    return inner[:cut].strip(), inner[cut + 1 :].strip()


# --- reading the tokens out of app.css -------------------------------------


def _root_block(source: str) -> str:
    """The text inside the first `:root { ... }`, comments already stripped."""
    match = re.search(r":root\s*\{", source)
    if match is None:
        raise SystemExit(f"no :root block found in {CSS_PATH}")

    start = match.end()
    depth, index = 1, start
    while depth and index < len(source):
        if source[index] == "{":
            depth += 1
        elif source[index] == "}":
            depth -= 1
        index += 1
    if depth:
        raise SystemExit(f"unterminated :root block in {CSS_PATH}")
    return source[start : index - 1]


def load_declarations() -> dict[str, str]:
    source = CSS_PATH.read_text()
    # Comments first. They contain both ':' and ';' -- several of them quote
    # ratios like "3.45 cream / 3.63 card" -- so splitting before stripping
    # would invent tokens out of prose.
    source = re.sub(r"/\*.*?\*/", "", source, flags=re.DOTALL)

    declarations: dict[str, str] = {}
    for declaration in _root_block(source).split(";"):
        name, separator, value = declaration.partition(":")
        if not separator:
            continue
        name = name.strip()
        if name.startswith("--"):
            declarations[name] = " ".join(value.split())
    return declarations


DECLARATIONS = load_declarations()


def _expand(hex_colour: str) -> str:
    digits = hex_colour.lstrip("#")
    if len(digits) == 3:
        digits = "".join(character * 2 for character in digits)
    return f"#{digits.lower()}"


def colour(token: str, theme: str, _seen: tuple[str, ...] = ()) -> str:
    """Resolve a custom property to a literal hex, in one theme.

    Follows `var()` chains and picks the requested arm of any `light-dark()`.
    The theme is threaded through rather than resolved once, because a chain can
    pass through a token that is a pair and one that is not -- `--input` is
    `var(--thrive-control-line)` is `var(--thrive-faint)` is a pair.
    """
    if token in _seen:
        raise SystemExit(f"circular var() chain at {token}")
    if token not in DECLARATIONS:
        raise SystemExit(
            f"{token} is checked here but not declared in {CSS_PATH.name} -- "
            "renamed or deleted?"
        )
    return resolve(DECLARATIONS[token], theme, _seen + (token,), token)


def resolve(value: str, theme: str, _seen: tuple[str, ...], token: str) -> str:
    """One value, in one theme, down to a hex."""
    if _HEX.match(value):
        return _expand(value)
    if value in ("white", "#fff"):
        return "#ffffff"

    pair = _LIGHT_DARK.match(value)
    if pair:
        light, dark = split_light_dark(pair.group(1))
        return resolve(light if theme == LIGHT else dark, theme, _seen, token)

    indirect = _VAR.match(value)
    if indirect:
        return colour(indirect.group(1), theme, _seen)

    raise SystemExit(
        f"{token} resolves to `{value}` in the {theme} theme, which this gate "
        "cannot evaluate. color-mix() is deliberately not implemented -- see the "
        "module docstring. Give the token a literal hex if it needs checking."
    )


def resolvable(token: str, theme: str) -> bool:
    """Whether `colour()` would succeed, without exiting if it would not.

    Needed because the soft tints are a literal on dark and a color-mix on light,
    so a check over them is legitimately one-sided. Everything else that is
    unresolvable is reported in the footer.
    """
    try:
        colour(token, theme)
    except SystemExit:
        return False
    return True


def unresolved_colour_tokens(theme: str) -> list[str]:
    """Tokens that look like colours but cannot be resolved in this theme."""
    unresolved = []
    for name, value in DECLARATIONS.items():
        if "color-mix" not in value:
            continue
        if not resolvable(name, theme):
            unresolved.append(name)
    return sorted(unresolved)


# --- the maths --------------------------------------------------------------


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


# --- what gets checked ------------------------------------------------------
#
# Named by CSS custom property, so this list is coupled to app.css by more than
# convention. Same relationships the green palette was checked on, plus the
# yellow constraints the brand colour brought with it.

PAPER = "--thrive-bg"
WHITE = "--thrive-surface"
SUNKEN = "--thrive-sunken"

INK = "--thrive-ink"
BODY = "--thrive-body"
MUTED = "--thrive-muted"
FAINT = "--thrive-faint"

PRIMARY = "--thrive-primary"
PRIMARY_SOFT = "--thrive-primary-soft"
PRIMARY_FILL = "--thrive-primary-fill"
ON_PRIMARY_FILL = "--thrive-on-primary-fill"
ON_PRIMARY = "--thrive-on-primary"
YELLOW = "--thrive-yellow"

INDIGO = "--thrive-indigo"

ON_TRACK = "--thrive-on-track"
WATCH = "--thrive-watch"
NEEDS_HELP = "--thrive-needs-help"
URGENT = "--thrive-urgent"
CIVIC = "--thrive-civic"
LATER = "--thrive-later"

# Hairlines are decorative in this direction and deliberately NOT checked --
# nothing depends on seeing them. The exception that IS checked: control
# boundaries. A checkbox edge is the only thing saying where the control is, so
# it owes 3:1 on every surface it can sit on, including the sunken row-hover
# fill.
CONTROL_LINE = "--thrive-control-line"

# The soft tints. Each is the background for TEXT in its own hue -- `bg-*-soft
# text-*` -- and until the dark theme nothing measured that pair, because every
# one of them was a color-mix and this gate does not evaluate those. The dark
# values are literals precisely so they can be checked; the light ones still
# cannot be, and the footer says which.
SOFT = {
    ON_TRACK: "--thrive-on-track-soft",
    WATCH: "--thrive-watch-soft",
    NEEDS_HELP: "--thrive-needs-help-soft",
    URGENT: "--thrive-urgent-soft",
    CIVIC: "--thrive-civic-soft",
    LATER: "--thrive-later-soft",
    INDIGO: "--thrive-indigo-soft",
}

# (foreground, background, label, required ratio)
CHECKS = [
    # --- Every ink tier against every surface ------------------------------
    # All three surfaces, not just two. The gap that shipped a bug last time
    # was checking paper and card and stopping, when sunken is where the
    # failure lived -- and sunken matters more, not less, because it is the row
    # hover fill rather than an occasional well.
    (INK, PAPER, "ink on cream", AA_TEXT),
    (INK, WHITE, "ink on card", AA_TEXT),
    (INK, SUNKEN, "ink on sunken", AA_TEXT),
    (BODY, PAPER, "body on cream", AA_TEXT),
    (BODY, WHITE, "body on card", AA_TEXT),
    (BODY, SUNKEN, "body on sunken", AA_TEXT),
    (MUTED, PAPER, "muted on cream", AA_TEXT),
    (MUTED, WHITE, "muted on card", AA_TEXT),
    (MUTED, SUNKEN, "muted on sunken", AA_TEXT),
    # --- The accent: UC San Diego navy --------------------------------------
    (PRIMARY, WHITE, "navy text on card", AA_TEXT),
    (PRIMARY, PAPER, "navy text on cream", AA_TEXT),
    (PRIMARY, SUNKEN, "navy text on sunken", AA_TEXT),
    (ON_PRIMARY, PRIMARY, "white on navy fill", AA_TEXT),
    (PRIMARY, PRIMARY_SOFT, "navy on primary-soft", AA_TEXT),
    (ON_PRIMARY_FILL, PRIMARY_FILL, "ink on primary-fill", AA_TEXT),
    # --- Indigo, the reserved "you are here" -------------------------------
    (INDIGO, WHITE, "indigo marker text on card", AA_TEXT),
    (INDIGO, PAPER, "indigo marker text on cream", AA_TEXT),
    (ON_PRIMARY, INDIGO, "white on indigo fill", AA_TEXT),
    # --- Status and categorical text ---------------------------------------
    (ON_TRACK, WHITE, "on-track teal text", AA_TEXT),
    (WATCH, WHITE, "watch amber text", AA_TEXT),
    (NEEDS_HELP, WHITE, "needs-help violet text", AA_TEXT),
    (URGENT, WHITE, "urgent coral text", AA_TEXT),
    (CIVIC, WHITE, "civic plum text", AA_TEXT),
    (LATER, WHITE, "later slate text", AA_TEXT),
    # --- Solid chip fills --------------------------------------------------
    (ON_PRIMARY, URGENT, "white on urgent fill", AA_TEXT),
    (ON_PRIMARY, WATCH, "white on watch fill", AA_TEXT),
    (ON_PRIMARY, ON_TRACK, "white on on-track fill", AA_TEXT),
    (ON_PRIMARY, NEEDS_HELP, "white on needs-help fill", AA_TEXT),
    (ON_PRIMARY, CIVIC, "white on civic fill", AA_TEXT),
    (ON_PRIMARY, LATER, "white on later fill", AA_TEXT),
    # The neutral fill, and it had no check until the dark theme went looking.
    # `schedule.ts` paints the `custom` and `ucsd` streams `bg-muted-ink` with
    # on-primary lettering, which is a solid chip exactly like the six above and
    # was simply missing from this list.
    (ON_PRIMARY, MUTED, "on-primary on muted fill", AA_TEXT),
    # --- Non-text graphics -------------------------------------------------
    (PRIMARY, PAPER, "focus ring on cream", AA_NON_TEXT),
    (PRIMARY, WHITE, "ring around primary-fill", AA_NON_TEXT),
    (WATCH, WHITE, "amber dot", AA_NON_TEXT),
    (URGENT, WHITE, "coral dot", AA_NON_TEXT),
    (INDIGO, WHITE, "indigo marker dot", AA_NON_TEXT),
    # --- Control boundaries: the one exception to "hairlines are decorative"
    # WCAG 1.4.11.
    (CONTROL_LINE, PAPER, "control boundary on cream", AA_NON_TEXT),
    (CONTROL_LINE, WHITE, "control boundary on card", AA_NON_TEXT),
    (CONTROL_LINE, SUNKEN, "control boundary on sunken", AA_NON_TEXT),
    # --- faint as decorative text ------------------------------------------
    (FAINT, PAPER, "faint on cream", AA_NON_TEXT),
    (FAINT, WHITE, "faint on card", AA_NON_TEXT),
    (FAINT, SUNKEN, "faint on sunken", AA_NON_TEXT),
]

# --- checks that hold in ONE theme only -------------------------------------
#
# THE YELLOW/NAVY PAIRING INVERTS, which is the one genuinely asymmetric fact in
# the palette rather than a gap in it.
#
# On light, yellow's only legible home is against navy: 9.45:1, the campus
# pairing. On dark, `primary` is a light steel, so yellow on it collapses to
# 1.39:1 -- worse than yellow on cream -- while yellow on the dark SURFACE is
# 10.98:1. The colour did not change. The surface it works against swapped ends.
#
# So each theme asserts its own pairing. Running the light assertion against dark
# would fail on correct colours, and dropping it would stop guarding the light
# theme's one legible use of the brand yellow.
THEME_CHECKS = {
    LIGHT: [
        (YELLOW, PRIMARY, "yellow accent on navy", AA_NON_TEXT),
    ],
    DARK: [
        (YELLOW, WHITE, "yellow accent on the dark card", AA_NON_TEXT),
        (YELLOW, PAPER, "yellow accent on the dark page", AA_NON_TEXT),
    ],
}

# Ceilings, not floors. These assert a token stays BELOW a ratio, which is how
# "decorative only" stops being a comment nobody reads.
#
# faint: if it ever clears the text bar, someone will put words in it and get
# away with it. Applies in BOTH themes -- the tier means the same thing in each,
# and the dark value is the tightest token in the system precisely because it is
# squeezed between this ceiling and the 3:1 floor above.
# (foreground, background, label, must stay under)
CEILINGS = [
    (FAINT, PAPER, "faint stays decorative on page", AA_TEXT),
    (FAINT, WHITE, "faint stays decorative on card", AA_TEXT),
    (FAINT, SUNKEN, "faint stays decorative on sunken", AA_TEXT),
]

# YELLOW'S CEILING IS A LIGHT-THEME FACT, and this is the asymmetry that took the
# most thought, so it is written down rather than left to the diff.
#
# The brand colour is 1.50:1 on the light card. It is held under the NON-TEXT bar,
# not just the text bar, because the tempting misuse is not a yellow word -- it is
# a yellow indicator.
#
# ON DARK THE MEASUREMENT ARGUES THE OTHER WAY: 10.98 card, 12.16 page, 9.06
# sunken. Yellow could carry meaning there. The ROLE still does not change, and
# the reason is not a ratio: a colour whose meaning holds in one theme and reads
# at 1.43:1 in the other would need a second carrier for the same meaning in the
# other theme, and "the meaning has two colours depending on your OS" is worse
# than "yellow is decoration".
#
# The light ceilings are what enforce that, and they still bind -- a promotion
# would have to be legible in LIGHT to be worth making. Dark gets FLOORS instead,
# which pin the fact the note above rests on: if a future pass lightened the dark
# surfaces far enough to drag yellow under 3:1, the claim would silently stop
# being true. This is what would say so.
LIGHT_CEILINGS = [
    (YELLOW, PAPER, "yellow stays decorative on cream", AA_NON_TEXT),
    (YELLOW, WHITE, "yellow stays decorative on card", AA_NON_TEXT),
    (YELLOW, SUNKEN, "yellow stays decorative on sunken", AA_NON_TEXT),
]

# The soft tints, as backgrounds for text in their own hue. DARK ONLY, because
# the light values are `color-mix()` and this gate does not evaluate those -- so
# these seven pairs are measured in exactly one theme, and the footer names the
# light ones it could not reach. That is the honest shape: it is the LIGHT theme
# that has unmeasured colours here, and it always did.
def soft_pairs() -> list[tuple[str, str, str, float]]:
    return [
        (hue, tint, f"{hue.removeprefix('--thrive-')} on its own soft tint", AA_TEXT)
        for hue, tint in SOFT.items()
    ]


# --- structural assertions --------------------------------------------------
#
# Not contrast, but the same job: things components depend on that nothing else
# checks. The Svelte-side guard in src/lib/designSystem.spec.ts enforces that no
# component names a font directly and that every `.thrive-*` class it uses is in
# the known vocabulary -- but it cannot read app.css, because Vite's CSS pipeline
# processes the file before `?raw` sees it and the glob comes back empty.
# Probed and confirmed, not assumed. So the "does app.css actually define it"
# half lands here, in the one checker that already parses this file.

# (pattern, description)
REQUIRED_CSS = [
    (r"\.thrive-numeric\s*\{", "`.thrive-numeric` is declared"),
    (r"\.thrive-eyebrow\s*\{", "`.thrive-eyebrow` is declared"),
    (
        r"\.thrive-numeric\s*\{[^}]*var\(--font-mono\)",
        "`.thrive-numeric` uses the mono face",
    ),
    (
        r"\.thrive-numeric\s*\{[^}]*tabular-nums",
        "`.thrive-numeric` sets tabular figures",
    ),
    (
        r"\.thrive-eyebrow\s*\{[^}]*var\(--font-sans\)",
        "`.thrive-eyebrow` uses the sans face",
    ),
    # The fit-on-one-screen contract. Each of these is a property Home's grid
    # depends on, and each is silent when broken: the page still renders, it just
    # stops fitting or starts moving when a card expands.
    (r"--thrive-card-body-cap:", "the card height cap is a token"),
    (
        r"\.thrive-card-body\s*\{",
        "`.thrive-card-body` is declared",
    ),
    (
        r"@media\s*\(width\s*>=\s*64rem\)\s*\{\s*\.thrive-card-body\s*\{[^}]*height:\s*var\(--thrive-card-body-cap\)",
        "the cap applies as a FIXED height at 64rem, so the grid cannot move",
    ),
    (
        r"@media\s*\(width\s*>=\s*64rem\)\s*\{\s*\.thrive-card-body\s*\{[^}]*overflow-y:\s*auto",
        "the capped card scrolls inside rather than clipping",
    ),
    # A browser-free backstop for the bug `scripts/check-layout.mjs` measures.
    # That gate is the real one -- it drives a browser and would catch a NEW
    # source of phantom scroll, which a regex cannot. This catches the specific
    # regression of someone deleting the containment while tidying, on a machine
    # with no browser installed, which is the likeliest way it would come back.
    (
        r"@media\s*\(width\s*>=\s*64rem\)\s*\{\s*\.thrive-card-body\s*\{[^}]*contain:\s*paint",
        "the capped card contains its paint, so overflow cannot leak to the page",
    ),
    # THE THEME MECHANISM, and every one of these is silent when broken -- the
    # page renders in one theme and simply never reaches the other.
    (
        r":root\s*\{[^}]*color-scheme:\s*light\s+dark",
        "`:root` declares `color-scheme: light dark`, so light-dark() resolves",
    ),
    (
        r":root\[data-theme='light'\]\s*\{[^}]*color-scheme:\s*only\s+light",
        "an explicit light choice pins the scheme with `only`",
    ),
    (
        r":root\[data-theme='dark'\]\s*\{[^}]*color-scheme:\s*only\s+dark",
        "an explicit dark choice pins the scheme with `only`",
    ),
    # Without this the OS preference is never consulted and `system` silently
    # means light for everybody -- which looks exactly like a working app to
    # anyone whose machine is set to light, i.e. to whoever is testing it.
    # `[^}]*` will not do here, and that is worth a line: the variant is the one
    # block in this file with NESTED braces, so a pattern that cannot cross a `}`
    # stops at the first arm and reports a miss on correct CSS. This allows one
    # level of nesting before the match, which is the shape the block actually
    # has. Caught by the check failing on a file that was already right.
    (
        r"@custom-variant\s+dark\s*\{(?:[^{}]|\{[^{}]*\})*prefers-color-scheme:\s*dark",
        "the `dark:` variant covers the system preference, not just the attribute",
    ),
]


def check_soft_tint_coupling() -> int:
    """Each light `color-mix()` must name the light arm of the token it tints.

    THE PROPERTY THIS REPLACES. The soft tints used to read
    `color-mix(in oklab, var(--thrive-urgent) 9%, white)`, and that `var()` is
    what made them unable to drift from the base hue -- the comment in app.css
    said so, and it was true by construction.

    `light-dark()` cannot nest inside another `light-dark()`, so the light arm has
    to name the light hex outright, and a repeated hex is a hex that can fall out
    of step. A repalette would move `--thrive-urgent` and leave its tint tinting
    the old colour: a wrong-but-plausible pale wash that no contrast check would
    catch, because the tint and the hue would both still pass their own pairs.

    So the guarantee moved from "by construction" to "by gate". It did not go, and
    this is the gate.
    """
    print()
    print("soft tints still name the hue they claim to tint")
    print("-" * 68)
    failures = 0
    for hue, tint in SOFT.items():
        declaration = DECLARATIONS.get(tint, "")
        pair = _LIGHT_DARK.match(declaration)
        name = tint.removeprefix("--thrive-")
        if not pair:
            print(f"{name + ': not a light-dark() pair':<55}{'FAIL':>13}")
            failures += 1
            continue

        light_arm, _ = split_light_dark(pair.group(1))
        found = re.findall(r"#[0-9a-fA-F]{3,6}", light_arm)
        expected = colour(hue, LIGHT)
        passed = len(found) == 1 and _expand(found[0]) == expected
        failures += not passed
        detail = f"{name} tints {found[0] if found else '?'}, hue is {expected}"
        print(f"{detail:<55}{'PASS' if passed else 'FAIL':>13}")
    return failures


def check_structure(source: str) -> int:
    print()
    print("type treatments")
    print("-" * 68)
    failures = 0
    for pattern, description in REQUIRED_CSS:
        passed = re.search(pattern, source) is not None
        failures += not passed
        print(f"{description:<55}{'PASS' if passed else 'FAIL':>13}")
    return failures


def run_floors(pairs, theme: str) -> tuple[int, int]:
    """Assertions of the form "at least this much". Returns (failures, count)."""
    failures = 0
    for foreground, background, label, required in pairs:
        measured = ratio(colour(foreground, theme), colour(background, theme))
        passed = measured >= required
        failures += not passed
        print(
            f"{label:<38}{measured:>8.2f}:1{required:>7.1f}+   "
            f"{'PASS' if passed else 'FAIL'}"
        )
    return failures, len(pairs)


def run_ceilings(pairs, theme: str) -> tuple[int, int]:
    """Assertions of the form "and no more than this"."""
    failures = 0
    for foreground, background, label, ceiling in pairs:
        measured = ratio(colour(foreground, theme), colour(background, theme))
        passed = measured < ceiling
        failures += not passed
        print(
            f"{label:<38}{measured:>8.2f}:1{ceiling:>7.1f}-   "
            f"{'PASS' if passed else 'FAIL'}"
        )
    return failures, len(pairs)


def check_theme(theme: str) -> tuple[int, int]:
    """Every colour assertion, in one theme."""
    print()
    print(f"══ {theme.upper()} " + "═" * (66 - len(theme)))
    print(f"{'pair':<38}{'ratio':>9}{'need':>8}   result")
    print("-" * 68)

    failures, total = run_floors(CHECKS + THEME_CHECKS[theme], theme)

    # The soft tints, where they can be measured at all. See `soft_pairs`.
    measurable = [
        pair for pair in soft_pairs() if resolvable(pair[1], theme)
    ]
    if measurable:
        print("-" * 68)
        extra_failures, extra_total = run_floors(measurable, theme)
        failures += extra_failures
        total += extra_total

    print("-" * 68)
    ceilings = CEILINGS + (LIGHT_CEILINGS if theme == LIGHT else [])
    ceiling_failures, ceiling_total = run_ceilings(ceilings, theme)
    failures += ceiling_failures
    total += ceiling_total

    # Yellow's dark FLOORS: the other half of the light ceilings above. Asserting
    # that on dark it IS legible, which is the fact the role note rests on.
    if theme == DARK:
        floor_failures, floor_total = run_floors(
            [
                (YELLOW, PAPER, "yellow IS legible on the dark page", AA_NON_TEXT),
                (YELLOW, WHITE, "yellow IS legible on the dark card", AA_NON_TEXT),
                (YELLOW, SUNKEN, "yellow IS legible on dark sunken", AA_NON_TEXT),
            ],
            theme,
        )
        failures += floor_failures
        total += floor_total

    return failures, total


def main() -> int:
    print(f"reading tokens from {CSS_PATH.relative_to(CSS_PATH.parents[2])}")
    print("checking BOTH themes -- dark is not an excuse for lower contrast")

    failures = total = 0
    for theme in THEMES:
        theme_failures, theme_total = check_theme(theme)
        failures += theme_failures
        total += theme_total

    print()
    print("══ STRUCTURE " + "═" * 55)
    coupling_failures = check_soft_tint_coupling()
    failures += coupling_failures
    total += len(SOFT)

    structure_failures = check_structure(
        re.sub(r"/\*.*?\*/", "", CSS_PATH.read_text(), flags=re.DOTALL)
    )
    failures += structure_failures
    total += len(REQUIRED_CSS)

    print("-" * 68)
    print(f"{total - failures}/{total} pass")

    # Per theme, because the answer differs: the soft tints are literals on dark
    # and mixes on light, so the light theme has seven colours this gate cannot
    # reach and the dark theme has none. Printed rather than buried -- a reader
    # should be able to see which half of the palette is measured.
    for theme in THEMES:
        skipped = unresolved_colour_tokens(theme)
        print()
        if not skipped:
            print(f"{theme}: every colour token resolved and every pair measured")
            continue
        print(f"{theme}: not evaluated ({len(skipped)} color-mix tokens):")
        for name in skipped:
            print(f"  {name}")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
