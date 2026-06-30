"""
render_card.py — The Hard Win card renderer (LOCKED DESIGN — do not redesign).

Renders a 1080x1350 Instagram card: dark background, cream text, amber accent,
HW seal (top-left), VERIFIED pill (top-right), subject name, serif hook, sans body,
a "DO THIS TODAY" block with an accent left-rule, and the receipt in mono pinned
to the bottom, with the THE HARD WIN wordmark bottom-right.

Six approved background palettes are defined in PALETTES. All hold cream text + amber.
Rotate through ROTATION so the feed never repeats two days running.

Usage:
    from render_card import render_card
    render_card(card_dict, palette="navy", out_path="output/hardwin-name.png")

CLI:
    python render_card.py worked_example.json            # render that card (uses its palette)
    python render_card.py --swatch                       # render one sample per palette

FONTS: For output identical to the approved design, place these TTFs in ./fonts/ :
    DejaVuSerif-Bold.ttf, LiberationSans-Regular.ttf, LiberationSans-Bold.ttf, DejaVuSansMono.ttf
Otherwise the script falls back to Windows fonts (Georgia/Arial/Consolas), which look close.
Requires: Pillow  (pip install pillow)
"""
import os, sys, json
from PIL import Image, ImageDraw, ImageFont

# ---- colors ----
CREAM  = (244, 243, 238)
CREAM2 = (214, 211, 202)
AMBER  = (227, 169, 74)
MUTE   = (150, 147, 139)

# ---- six approved dark palettes: name -> (background, footer_rule) ----
PALETTES = {
    "teal":   ((20, 32, 28), (70, 82, 77)),
    "navy":   ((19, 26, 46), (64, 72, 98)),
    "plum":   ((30, 16, 36), (76, 52, 84)),    # deep red-purple (replaces old oxblood)
    "violet": ((40, 24, 54), (88, 64, 104)),   # lighter blue-purple
    "forest": ((23, 35, 19), (72, 86, 66)),
    "black":  ((16, 16, 17), (58, 58, 60)),
}
ROTATION = ["teal", "navy", "plum", "violet", "forest", "black"]

def palette_for_index(i):
    """Pick the next palette by position so the feed cycles through all six."""
    return ROTATION[i % len(ROTATION)]

# ---- geometry ----
S = 2                      # supersample factor (rendered at 2x, downscaled for crisp edges)
W, H = 1080 * S, 1350 * S
M = 90 * S
MIN_GAP_OVER_RECEIPT = 48 * S   # hard minimum clearance between flowing text and the receipt rule

# ---- font resolution (cross-platform) ----
_FONT_FILES = {
    "serif_bold": ["DejaVuSerif-Bold.ttf", "georgiab.ttf", "timesbd.ttf", "DejaVuSerif.ttf"],
    "sans":       ["LiberationSans-Regular.ttf", "arial.ttf", "DejaVuSans.ttf"],
    "sans_bold":  ["LiberationSans-Bold.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"],
    "mono":       ["DejaVuSansMono.ttf", "consola.ttf", "cour.ttf"],
}
_SEARCH_DIRS = [
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts"),
    "./fonts",
    "C:/Windows/Fonts",
    "/usr/share/fonts/truetype/dejavu",
    "/usr/share/fonts/truetype/liberation",
    "/usr/share/fonts",
    "/Library/Fonts", "/System/Library/Fonts",
]
_font_cache = {}
def _font(role, size):
    key = (role, size)
    if key in _font_cache:
        return _font_cache[key]
    px = size * S
    for fname in _FONT_FILES[role]:
        for d in _SEARCH_DIRS:
            path = os.path.join(d, fname)
            if os.path.exists(path):
                f = ImageFont.truetype(path, px)
                _font_cache[key] = f
                return f
        try:                                  # let PIL resolve by name if on the font path
            f = ImageFont.truetype(fname, px)
            _font_cache[key] = f
            return f
        except Exception:
            pass
    f = ImageFont.load_default()
    _font_cache[key] = f
    return f

# ---- drawing helpers ----
def _wrap(d, text, font, maxw):
    out, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=font) <= maxw:
            cur = t
        else:
            if cur:
                out.append(cur)
            cur = w
    if cur:
        out.append(cur)
    return out

def _block(d, x, y, text, font, fill, maxw, lh):
    for ln in _wrap(d, text, font, maxw):
        d.text((x, y), ln, font=font, fill=fill)
        y += lh
    return y

def _check(d, x, y, sz, col):
    d.line([(x, y + sz * 0.5), (x + sz * 0.4, y + sz * 0.9)], fill=col, width=3 * S)
    d.line([(x + sz * 0.4, y + sz * 0.9), (x + sz * 1.0, y)], fill=col, width=3 * S)

def _seal(d, cx, cy, r, bg):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=AMBER)
    f = _font("serif_bold", int(r / S * 0.7))
    b = d.textbbox((0, 0), "HW", font=f)
    d.text((cx - (b[2] - b[0]) / 2 - b[0], cy - (b[3] - b[1]) / 2 - b[1]), "HW", font=f, fill=bg)

def _fit_hook(d, text, maxw, maxlines):
    sz = 58
    while sz > 38:
        f = _font("serif_bold", sz)
        if len(_wrap(d, text, f, maxw)) <= maxlines:
            return f, sz
        sz -= 2
    return _font("serif_bold", 38), 38

def render_card(card, palette="teal", out_path="card.png"):
    """
    card: dict with keys subject_name, hook, body, copy_today, receipt.
    palette: one of PALETTES keys.
    """
    if palette not in PALETTES:
        raise ValueError("Unknown palette %r. Choose from: %s" % (palette, ", ".join(PALETTES)))
    bg, rule = PALETTES[palette]
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)

    # seal + verified pill  (top row nudged up slightly to reclaim vertical space)
    _seal(d, M + 38 * S, M + 24 * S, 40 * S, bg)
    pf = _font("mono", 22); pill = "VERIFIED"; pw = d.textlength(pill, font=pf)
    x2 = W - M; x1 = x2 - pw - 70 * S
    d.rounded_rectangle([x1, M + 2 * S, x2, M + 48 * S], radius=23 * S, outline=AMBER, width=2 * S)
    _check(d, x1 + 22 * S, M + 17 * S, 18 * S, AMBER)
    d.text((x1 + 50 * S, M + 13 * S), pill, font=pf, fill=AMBER)

    # subject name (also nudged up)
    d.text((M, M + 74 * S), str(card.get("subject_name", "")).upper(), font=_font("mono", 30), fill=AMBER)
    hook_start = M + 150 * S

    # ---- pin the bottom block FIRST: the receipt rule defines a hard ceiling ----
    fy = H - M - 160 * S                       # receipt rule y (unchanged position)
    floor_y = fy                               # receipt rule = HARD FLOOR
    limit_y = floor_y - MIN_GAP_OVER_RECEIPT   # the flowing stack must end at/above this

    # _compose is the SINGLE SOURCE OF TRUTH: it computes the full geometry of the
    # hook+body+copy stack at given font sizes. The fit loop, the draw, and the final
    # assert all read from one composition, so a measurement can never disagree with
    # what is actually drawn (that mismatch is what let cards silently overlap before).
    def _compose(hook_fs, body_fs, copy_fs):
        maxw, cmaxw = W - 2 * M, W - 2 * M - 28 * S
        hf = _font("serif_bold", hook_fs); bf = _font("sans", body_fs); cf = _font("sans_bold", copy_fs)
        hl = _wrap(d, card.get("hook", ""), hf, maxw)
        bl = _wrap(d, card.get("body", ""), bf, maxw)
        cl = _wrap(d, card.get("copy_today", ""), cf, cmaxw)
        hook_lh = int(round(hook_fs * 1.42)) * S
        body_lh = int(round(body_fs * 1.60)) * S
        copy_lh = int(round(copy_fs * 1.50)) * S
        gap_hb, gap_bc, label_lh = 30 * S, 42 * S, 52 * S
        y_hook_end = hook_start + len(hl) * hook_lh
        y_body0    = y_hook_end + gap_hb
        y_body_end = y_body0 + len(bl) * body_lh
        y_label    = y_body_end + gap_bc           # top of the "DO THIS TODAY" block
        y_copy0    = y_label + label_lh
        y_copy_end = y_copy0 + len(cl) * copy_lh    # true bottom of all flowing content
        return {"hf": hf, "bf": bf, "cf": cf, "hook_lh": hook_lh, "body_lh": body_lh,
                "copy_lh": copy_lh, "y_body0": y_body0, "y_label": y_label, "y_copy0": y_copy0,
                "bottom": y_copy_end, "sizes": (hook_fs, body_fs, copy_fs)}

    # Start at full design sizes (hook first capped to <=3 lines), then shrink the hook
    # AND body AND copy_today TOGETHER, 1px per pass, re-measuring every pass, until the
    # whole stack clears the floor by MIN_GAP. The hook (H1) is allowed to shrink too.
    HOOK_MIN, BODY_MIN, COPY_MIN = 44, 22, 23
    _, hook_fs = _fit_hook(d, card.get("hook", ""), W - 2 * M, 3)
    body_fs, copy_fs = 34, 36
    comp = _compose(hook_fs, body_fs, copy_fs)
    while comp["bottom"] > limit_y:
        if hook_fs <= HOOK_MIN and body_fs <= BODY_MIN and copy_fs <= COPY_MIN:
            break                                   # hit all floors; the assert below fires
        hook_fs = max(HOOK_MIN, hook_fs - 1)
        body_fs = max(BODY_MIN, body_fs - 1)
        copy_fs = max(COPY_MIN, copy_fs - 1)
        comp = _compose(hook_fs, body_fs, copy_fs)

    # ---- draw the flowing content EXACTLY where _compose measured it ----
    _block(d, M, hook_start, card.get("hook", ""), comp["hf"], CREAM, W - 2 * M, comp["hook_lh"])
    _block(d, M, comp["y_body0"], card.get("body", ""), comp["bf"], CREAM2, W - 2 * M, comp["body_lh"])
    top = comp["y_label"]
    d.text((M + 28 * S, top), "DO THIS TODAY", font=_font("mono", 29), fill=AMBER)
    y = _block(d, M + 28 * S, comp["y_copy0"], card.get("copy_today", ""), comp["cf"], CREAM, W - 2 * M - 28 * S, comp["copy_lh"])
    d.line([(M, top - 4 * S), (M, y - 4 * S)], fill=AMBER, width=4 * S)

    # ---- HARD ASSERT: refuse to save rather than ever silently overlap the receipt ----
    render_card.last_fit = {"subject": card.get("subject_name", "?"), "sizes": comp["sizes"],
                            "bottom_px": comp["bottom"] // S, "floor_px": floor_y // S,
                            "gap_px": (floor_y - comp["bottom"]) // S}
    if comp["bottom"] > limit_y:
        raise ValueError(
            "render_card: %r still overflows the receipt floor by %dpx at minimum sizes "
            "(hook=%d body=%d copy=%d) — shorten the text." % (
                card.get("subject_name", "?"), (comp["bottom"] - limit_y) // S,
                comp["sizes"][0], comp["sizes"][1], comp["sizes"][2]))

    # receipt footer pinned near bottom (unchanged)
    d.line([(M, fy), (W - M, fy)], fill=rule, width=2 * S)
    _check(d, M, fy + 26 * S, 20 * S, AMBER)
    _block(d, M + 40 * S, fy + 24 * S, card.get("receipt", ""), _font("mono", 20), MUTE, W - 2 * M - 40 * S, 30 * S)

    # wordmark
    wm = "THE HARD WIN"; wf = _font("mono", 24)
    d.text((W - M - d.textlength(wm, font=wf), H - M - 30 * S), wm, font=wf, fill=AMBER)

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    img.resize((1080, 1350), Image.LANCZOS).save(out_path)
    return out_path

_SAMPLE = {
    "subject_name": "Madam C.J. Walker",
    "hook": "Orphaned at 7 and a washerwoman for 20 years, she built her first product at 37.",
    "body": "Sarah Breedlove was orphaned young and washed laundry for about a dollar a day. At 37 she mixed her own hair-care formula and sold it door to door, becoming the first self-made female millionaire in America.",
    "copy_today": "It is not too late to start the thing at the age you are now. Make the first small version of it today.",
    "receipt": "Created her hair-care line at 37 (b.1867); first self-made female millionaire (Guinness). Confirmed: Library of Congress, History.com, Britannica.",
}

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--swatch":
        for name in ROTATION:
            render_card(_SAMPLE, palette=name, out_path="output/sample_%s.png" % name)
            print("rendered output/sample_%s.png" % name)
    elif len(sys.argv) > 1 and sys.argv[1].endswith(".json"):
        with open(sys.argv[1], "r", encoding="utf-8") as fh:
            card = json.load(fh)
        pal = card.get("palette", "teal")
        name = str(card.get("subject_name", "card")).lower().replace(" ", "-").replace(".", "")
        out = render_card(card, palette=pal, out_path="output/hardwin-%s.png" % name)
        print("rendered", out)
    else:
        render_card(_SAMPLE, palette="navy", out_path="output/sample_navy.png")
        print("rendered output/sample_navy.png  (use --swatch for all six, or pass a .json)")
