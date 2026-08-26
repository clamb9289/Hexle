# NOTE: colors-data.json's order has since been manually refined (via the
# app's reorder mode + "Export order") beyond what this script produces on
# its own. Re-running this script will overwrite that manual work with the
# raw algorithmic order below — don't run it unless you mean to discard the
# approved arrangement, and if you do, re-apply the latest export afterward.

import re, json, colorsys

HEX_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')

def is_hex(tok):
    return bool(HEX_RE.match(tok.strip()))

pairs = []
seen_hex = set()

with open('raw_colors.txt', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.rstrip('\n')
        if not line.strip():
            continue
        tokens = [t for t in line.split('\t')]
        for i, tok in enumerate(tokens):
            tok = tok.strip()
            if is_hex(tok):
                name = None
                if i > 0 and not is_hex(tokens[i-1].strip()) and tokens[i-1].strip():
                    name = tokens[i-1].strip()
                elif i + 1 < len(tokens) and not is_hex(tokens[i+1].strip()) and tokens[i+1].strip():
                    name = tokens[i+1].strip()
                if name:
                    hex_norm = tok.upper()
                    # strip "(W3C)" marker, note it separately
                    is_w3c = '(W3C)' in name
                    clean_name = name.replace('(W3C)', '').strip()
                    # Handle "X or Y" -> take first as primary, keep both as aliases
                    aliases = [a.strip() for a in re.split(r'\bor\b', clean_name)]
                    primary = aliases[0]
                    if hex_norm in seen_hex:
                        continue
                    seen_hex.add(hex_norm)
                    pairs.append({
                        'name': primary,
                        'aliases': aliases[1:],
                        'hex': hex_norm,
                        'w3c': is_w3c
                    })

def hls_of(hex_code):
    r = int(hex_code[1:3], 16) / 255.0
    g = int(hex_code[3:5], 16) / 255.0
    b = int(hex_code[5:7], 16) / 255.0
    return colorsys.rgb_to_hls(r, g, b)

def chroma_of(hex_code):
    r = int(hex_code[1:3], 16)
    g = int(hex_code[3:5], 16)
    b = int(hex_code[5:7], 16)
    return (max(r, g, b) - min(r, g, b)) / 255.0

NEUTRAL_CHROMA_THRESH = 0.12

def is_neutral(hex_code):
    h, l, s = hls_of(hex_code)
    # HSL's saturation formula inflates near L=0 or L=1 — a color that's
    # genuinely near-neutral (tiny spread between its R/G/B channels) can
    # still report high HSL saturation once lightness is close to black or
    # white. Raw chroma (max channel - min channel) doesn't have that blind
    # spot, so use it (plus an outright lightness cutoff) to catch true
    # neutrals like "Charcoal" or "White Chocolate".
    return chroma_of(hex_code) < NEUTRAL_CHROMA_THRESH or l > 0.93 or l < 0.14

def label_of(hex_code):
    # human-readable category, informational only — does NOT drive sort order
    h, l, s = hls_of(hex_code)
    h_deg = h * 360
    if is_neutral(hex_code):
        if l > 0.9:
            return 'White'
        if l < 0.18:
            return 'Black'
        return 'Gray'
    if h_deg < 15 or h_deg >= 345:
        return 'Red'
    if h_deg < 45:
        return 'Orange'
    if h_deg < 65:
        return 'Yellow'
    if h_deg < 170:
        return 'Green'
    if h_deg < 200:
        return 'Cyan'
    if h_deg < 255:
        return 'Blue'
    if h_deg < 290:
        return 'Purple'
    return 'Pink'

for p in pairs:
    p['group'] = label_of(p['hex'])

def rgb_of(p):
    h = p['hex']
    return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))

def redmean_sq(c1, c2):
    r1, g1, b1 = c1
    r2, g2, b2 = c2
    rmean = (r1 + r2) / 2
    dr, dg, db = r1 - r2, g1 - g2, b1 - b2
    return (2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db

def nn_chain(members, start_element=None, end_element=None):
    """Order `members` by repeatedly hopping to the closest remaining color
    (by redmean distance). Optionally force a specific start and/or end."""
    pool = [p for p in members if p is not start_element and p is not end_element]
    if start_element is not None:
        chain = [start_element]
        current = rgb_of(start_element)
    else:
        chain = [pool.pop(0)]
        current = rgb_of(chain[0])
    while pool:
        best_i = min(range(len(pool)), key=lambda i: redmean_sq(current, rgb_of(pool[i])))
        nxt = pool.pop(best_i)
        chain.append(nxt)
        current = rgb_of(nxt)
    if end_element is not None:
        chain.append(end_element)
    return chain

def two_opt(chain, max_passes=30):
    """2-opt local search: reverse any segment that shortens the total path.
    Fixes the classic nearest-neighbor artifact where a handful of leftover
    colors get stranded and force one big leap near the end. Keeps both
    endpoints of `chain` fixed in place."""
    n = len(chain)
    if n < 4:
        return chain

    def d(a, b):
        return redmean_sq(rgb_of(a), rgb_of(b)) ** 0.5

    for _ in range(max_passes):
        improved = False
        for i in range(1, n - 2):
            a, b = chain[i - 1], chain[i]
            d_ab = d(a, b)
            for j in range(i + 1, n - 1):
                c, e = chain[j], chain[j + 1]
                if d_ab + d(c, e) - d(a, c) - d(b, e) > 1e-9:
                    chain[i:j + 1] = chain[i:j + 1][::-1]
                    b = chain[i]
                    d_ab = d(a, b)
                    improved = True
        if not improved:
            break
    return chain

# The actual display order: every color is placed into exactly one
# contiguous hue band (Red, Orange, Yellow, Green, Cyan, Blue, Purple, Pink),
# bookended by a dark-neutral band anchored at pure Black and a light-neutral
# band anchored at pure White. This is a hard partition — a hue can never
# get split into two separate pockets of the grid the way a pure
# nearest-neighbor walk allowed (it only optimizes local step distance, so
# it would happily leave a hue, wander off, and double back to a different
# patch of that same hue later).
#
# Within each band, colors are still ordered by a nearest-neighbor chain +
# 2-opt cleanup so the band itself reads smoothly from color to color,
# rather than being sorted by a single blunt axis like lightness. Bands are
# stitched together by finding the single closest actual pair of colors
# across each adjacent boundary.
#
# (Also tried: slicing each band into narrow hue sub-bins and sorting each
# by lightness in a serpentine sweep — it gave perfectly clean single-run
# categories but measurably worse local smoothness, avg jump 82 / worst 592
# vs this method's 40 / 191, so it was not kept.)
CATEGORY_ORDER = ['DarkNeutral', 'Red', 'Orange', 'Yellow', 'Green', 'Cyan',
                   'Blue', 'Purple', 'Pink', 'LightNeutral']

by_cat = {}
for p in pairs:
    if is_neutral(p['hex']):
        cat = 'DarkNeutral' if hls_of(p['hex'])[1] < 0.5 else 'LightNeutral'
    else:
        cat = label_of(p['hex'])
    by_cat.setdefault(cat, []).append(p)

black_anchor = next((p for p in by_cat.get('DarkNeutral', []) if p['hex'] == '#000000'), None)
white_anchor = next((p for p in by_cat.get('LightNeutral', []) if p['hex'] == '#FFFFFF'), None)

bands = [(cat, by_cat[cat]) for cat in CATEGORY_ORDER if by_cat.get(cat)]

# Pick each seam between adjacent bands by brute-force search for the single
# closest pair of colors, one from each band — rather than only choosing
# where the next band starts (based on wherever the previous band happened
# to end up), also choose where the previous band should end so the two
# meet at their closest actual point.
forced_start = {0: black_anchor} if bands and bands[0][0] == 'DarkNeutral' else {}
forced_end = {}
if bands and bands[-1][0] == 'LightNeutral':
    forced_end[len(bands) - 1] = white_anchor

for k in range(len(bands) - 1):
    membersA, membersB = bands[k][1], bands[k + 1][1]
    best = min(
        ((redmean_sq(rgb_of(x), rgb_of(y)), x, y) for x in membersA for y in membersB),
        key=lambda t: t[0]
    )
    forced_end[k] = best[1]
    forced_start[k + 1] = best[2]

final = []
for k, (cat, members) in enumerate(bands):
    chain = two_opt(nn_chain(members, start_element=forced_start.get(k), end_element=forced_end.get(k)))
    final.extend(chain)

pairs = final

print(f"Total unique colors: {len(pairs)}")
from collections import Counter
print(Counter(p['group'] for p in pairs))

with open('colors-data.json', 'w', encoding='utf-8') as f:
    json.dump(pairs, f, indent=2)
