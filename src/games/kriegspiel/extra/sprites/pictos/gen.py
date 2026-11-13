"""Planches de la skin « Pictogrammes » du Jeu de la guerre (jocly2).

Même grammaire que la skin « Carte » (extra/sprites/gen.py) : cadre rectangulaire
pour les unités combattantes, cadre rond pour les unités de transmission, double
chevron pour les unités rapides, Nord sombre à symbole clair, Sud clair à symbole
sombre. Seul le symbole change : un pictogramme d'époque, réduit à une silhouette
ou à un trait d'une seule couleur, pour que des images de styles différents
forment une série.

Sources : pictos/src/*.png. Sorties : ../../res/images/pictos/unites.png (6 x 2
cases) et terrain.png (6 cases ; montagne, col et forteresse sont repris de la
planche « Carte » ; l'arsenal vient de src/arsenal-tuile.png). Les marqueurs
restent communs aux deux skins.

    python3 gen.py
"""
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
RES = os.path.normpath(os.path.join(HERE, "..", "..", "..", "res", "images"))
OUT = os.path.join(RES, "pictos")

C = 200     # case d'une planche
K = 4       # suréchantillonnage du dessin
CK = C * K

SIDES = {
    "N": dict(fill="#2c5a96", stroke="#14304f", sym="#ffffff"),
    "S": dict(fill="#f6ead2", stroke="#9a4f12", sym="#7a3d0c"),
}

# Ordre de la planche = types 1..6 du modèle : I, C, A, AC, T, E.
#   mode "silhouette" : toute la forme opaque ; "trait" : seulement l'encre
#   sombre du dessin (pour les images en couleur à modelé intérieur) ;
#   "medaillon" : médaillon rond à deux tons (fond clair, dessin foncé) dont
#   on ne garde que le dessin à l'intérieur de l'anneau.
#   grow : épaississement en pixels de la case finale (traits trop fins).
#   box : place disponible (largeur, hauteur) dans la case de 200.
#   rotate : rotation en degrés (sens trigonométrique) avant mise à l'échelle.
#   stretch : remplit exactement la boîte (déformation légère acceptée), pour
#   que les diagonales tombent dans les coins du cadre comme sur l'OTAN.
UNITS = [
    # infanterie : fusils croisés tendus d'un coin à l'autre, le X de l'OTAN
    dict(src="infanterie.png", mode="silhouette", grow=2.5, box=(152, 98), stretch=True),
    # cavalerie : un sabre sur la diagonale montante, le « / » de l'OTAN
    dict(src="sabre.png", mode="silhouette", grow=0.5, box=(150, 98), stretch=True),
    # artillerie : canon de profil (l'OTAN met un rond : la roue en tient lieu),
    # tracé repris d'un médaillon
    dict(src="artillerie.png", mode="medaillon", disc=(297, 285, 183), grow=0.5, box=(146, 100)),
    dict(src="artillerie-a-cheval.png", mode="silhouette", grow=0.5, box=(148, 104), swift=True),
    # transmission : tambour d'un médaillon dessiné à part ; seul le dessin
    # intérieur est repris, le cadre rond est celui de la skin
    dict(src="tambour.png", mode="medaillon", grow=0, box=(108, 108), round=True),
    # estafette : cor de poste, tracé repris d'un médaillon (les couleurs sont
    # celles de la skin) ; disc : l'anneau du médaillon, chevrons hors champ
    dict(src="cor.png", mode="medaillon", disc=(99.5, 103, 49.5), grow=0.5, box=(118, 100),
         round=True, swift=True),
]

# cadre : identique à la skin « Carte »
FX, FY, FW, FH = 16, 46, 168, 112
RCX, RCY, RR = 100, 106, 74
SW = 10


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def load_mask(name, mode, disc=None):
    """Masque L (255 = encre) recadré sur le dessin, depuis une image quelconque."""
    im = Image.open(os.path.join(SRC, name))
    if mode == "medaillon":
        return medallion_mask(im.convert("RGBA"), disc)
    if im.mode == "RGBA" and im.split()[3].getextrema()[0] < 250:
        rgba = im
    else:
        # fond uni opaque (blanc, beige...) : sa couleur est celle du coin,
        # le dessin est ce qui s'en écarte
        rgb = im.convert("RGB")
        bg = Image.new("RGB", rgb.size, rgb.getpixel((0, 0)))
        dist = ImageChops.difference(rgb, bg).convert("L")
        alpha = dist.point(lambda v: 0 if v < 25 else 255 if v > 70 else int((v - 25) * 255 / 45))
        rgba = rgb.convert("RGBA")
        rgba.putalpha(alpha)
    if rgba.width < 400:   # petites images : agrandir avant de seuiller
        f = -(-400 // rgba.width)
        rgba = rgba.resize((rgba.width * f, rgba.height * f), Image.LANCZOS)
    alpha = rgba.split()[3]
    if mode == "trait":
        lum = rgba.convert("L")
        ink = lum.point(lambda v: 255 if v < 70 else 0 if v > 110 else int((110 - v) * 255 / 40))
        mask = ImageChops.multiply(ink, alpha.point(lambda v: 255 if v > 128 else 0))
    else:
        mask = alpha
    # recadrage sur l'encre franche : ignore les traces pâles (bordure, JPEG)
    return mask.crop(mask.point(lambda v: 255 if v > 100 else 0).getbbox())


def medallion_mask(rgba, disc=None):
    """Dessin intérieur d'un médaillon, en masque, quelles que soient ses couleurs.

    L'encre est l'écart de couleur au fond clair du médaillon, ramené à
    l'écart du trait le plus franc : un dessin brun foncé et un dessin orange
    pâle donnent le même masque. disc = (cx, cy, r) dans l'image source, le
    bord intérieur de l'anneau ; par défaut, déduit du contour de l'image
    (médaillon seul, sans chevrons qui dépassent).
    """
    f = 1
    if rgba.width < 400:
        f = -(-400 // rgba.width)
        rgba = rgba.resize((rgba.width * f, rgba.height * f), Image.LANCZOS)
    if disc:
        cx, cy, inner = (v * f for v in disc)
    else:
        x0, y0, x1, y1 = rgba.split()[3].point(lambda v: 255 if v > 128 else 0).getbbox()
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        inner = (x1 - x0) / 2 * 0.80      # bord intérieur de l'anneau, avec une marge
    rgb = rgba.convert("RGB")
    bg = rgb.getpixel((round(cx), round(cy - inner * 0.95)))   # fond, sous l'anneau
    dist = ImageChops.difference(rgb, Image.new("RGB", rgb.size, bg)).convert("L")
    disc_mask = Image.new("L", rgba.size, 0)
    ImageDraw.Draw(disc_mask).ellipse([(cx - inner, cy - inner), (cx + inner, cy + inner)], fill=255)
    dist = ImageChops.multiply(dist, disc_mask)
    hist = dist.histogram()
    total, acc, peak = sum(hist[1:]), 0, 255
    for v in range(255, 0, -1):          # 98e centile : le trait franc
        acc += hist[v]
        if acc >= total * 0.02:
            peak = v
            break
    lo, hi = peak * 0.15, peak * 0.6
    mask = dist.point(lambda v: 0 if v <= lo else 255 if v >= hi else int((v - lo) * 255 / (hi - lo)))
    return mask.crop(mask.point(lambda v: 255 if v > 100 else 0).getbbox())


def symbol_layer(spec, color):
    """Calque RGBA CK x CK : le pictogramme en une couleur, centré dans le cadre."""
    mask = load_mask(spec["src"], spec["mode"], spec.get("disc"))
    if spec.get("rotate"):
        mask = mask.rotate(spec["rotate"], resample=Image.BICUBIC, expand=True)
        mask = mask.crop(mask.point(lambda v: 255 if v > 100 else 0).getbbox())
    bw, bh = spec["box"]
    if spec.get("stretch"):
        size = (round(bw * K), round(bh * K))
    else:
        s = min(bw * K / mask.width, bh * K / mask.height)
        size = (max(1, round(mask.width * s)), max(1, round(mask.height * s)))
    mask = mask.resize(size, Image.LANCZOS)
    grow = round(spec.get("grow", 0) * K)
    if grow:
        pad = grow + 2
        big = Image.new("L", (mask.width + 2 * pad, mask.height + 2 * pad), 0)
        big.paste(mask, (pad, pad))
        mask = big.filter(ImageFilter.MaxFilter(2 * grow + 1))
    # bords nets : léger flou puis seuil doux
    mask = mask.filter(ImageFilter.GaussianBlur(K * 0.4)).point(
        lambda v: 0 if v < 70 else 255 if v > 150 else int((v - 70) * 255 / 80))
    cy = RCY if spec.get("round") else FY + FH / 2
    layer = Image.new("RGBA", (CK, CK), (0, 0, 0, 0))
    solid = Image.new("RGBA", mask.size, hexrgb(color) + (255,))
    layer.paste(solid, (round(100 * K - mask.width / 2), round(cy * K - mask.height / 2)), mask)
    return layer


def chevrons(d, col):
    w = 11 * K
    for x in (128, 154):
        d.line([(x * K, 6 * K), ((x + 18) * K, 22 * K), (x * K, 38 * K)], fill=col, width=w, joint="curve")
        for px, py in ((x, 6), (x + 18, 22), (x, 38)):
            d.ellipse([(px * K - w / 2, py * K - w / 2), (px * K + w / 2, py * K + w / 2)], fill=col)


def unit_tile(spec, side):
    s = SIDES[side]
    img = Image.new("RGBA", (CK, CK), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if spec.get("round"):
        d.ellipse([((RCX - RR) * K, (RCY - RR) * K), ((RCX + RR) * K, (RCY + RR) * K)],
                  fill=s["fill"], outline=s["stroke"], width=SW * K)
    else:
        d.rounded_rectangle([((FX - SW / 2) * K, (FY - SW / 2) * K), ((FX + FW + SW / 2) * K, (FY + FH + SW / 2) * K)],
                            radius=(6 + SW / 2) * K, fill=s["stroke"])
        d.rounded_rectangle([((FX + SW / 2) * K, (FY + SW / 2) * K), ((FX + FW - SW / 2) * K, (FY + FH - SW / 2) * K)],
                            radius=2 * K, fill=s["fill"])
    img.alpha_composite(symbol_layer(spec, s["sym"]))
    if spec.get("swift"):
        chevrons(ImageDraw.Draw(img), s["stroke"])
    return img.resize((C, C), Image.LANCZOS)


# Arsenal : tuile dessinée à part (src/arsenal-tuile.png, version Nord, coins
# transparents). Le Sud et l'arsenal détruit en sont des recolorations : le
# dessin n'a que trois tons (encre marine, fond bleu clair, façade blanche),
# lus sur le canal rouge, qui les sépare le mieux.
ARSENAL_TONES = {        # encre, fond, façade
    "S": ("#6e3608", "#ead8b6", "#fbf5e8"),
    "X": ("#4a4a4a", "#d2d2d2", "#f2f2f2"),
}


def arsenal_tile(kind):
    src = Image.open(os.path.join(SRC, "arsenal-tuile.png")).convert("RGBA")
    if kind != "N":
        ink, bg, light = ARSENAL_TONES[kind]
        red = src.split()[0]
        tinted = ImageOps.colorize(red, black=ink, mid=bg, white=light,
                                   blackpoint=10, midpoint=193, whitepoint=222).convert("RGBA")
        tinted.putalpha(src.split()[3])
        src = tinted
    img = src.resize((CK, CK), Image.LANCZOS)
    if kind == "X":
        d = ImageDraw.Draw(img)
        for a, b in (((22, 26), (178, 176)), ((178, 26), (22, 176))):
            d.line([(a[0] * K, a[1] * K), (b[0] * K, b[1] * K)], fill="#b3261e", width=14 * K)
            for p in (a, b):
                d.ellipse([(p[0] * K - 7 * K, p[1] * K - 7 * K), (p[0] * K + 7 * K, p[1] * K + 7 * K)], fill="#b3261e")
    return img.resize((C, C), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    sheet = Image.new("RGBA", (6 * C, 2 * C), (0, 0, 0, 0))
    for row, side in enumerate("NS"):
        for col, spec in enumerate(UNITS):
            sheet.paste(unit_tile(spec, side), (col * C, row * C))
    sheet.save(os.path.join(OUT, "unites.png"), optimize=True)

    carte = Image.open(os.path.join(RES, "terrain.png")).convert("RGBA")
    terrain = Image.new("RGBA", (6 * C, C), (0, 0, 0, 0))
    terrain.paste(carte.crop((0, 0, 3 * C, C)), (0, 0))   # montagne, col, forteresse
    for col, kind in ((3, "N"), (4, "S"), (5, "X")):
        terrain.paste(arsenal_tile(kind), (col * C, 0))
    terrain.save(os.path.join(OUT, "terrain.png"), optimize=True)


if __name__ == "__main__":
    main()
