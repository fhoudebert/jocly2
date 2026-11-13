#!/usr/bin/env python3
"""
Péan - les vignettes, 200 x 200 : celle du jeu (thumbnail.png, les quatre
emblèmes des batailles) et une par scénario, montrées par le prélude
(res/images/batailles/).

Fond : une portion de la vraie carte du scénario, rendue avec les tuiles de la
skin « Tuiles » (res/images/tuiles/) ; par-dessus, l'emblème du premier camp, et
celui de l'adversaire en retrait quand il y a la place.

  python3 src/games/pean/extra/vignettes.py
"""
import json
import math
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(HERE)
S = 200                      # cote de la vignette
SQ3 = math.sqrt(3)

# vignette -> scenario, coin de la carte (col, ligne), emblemes (devant, derriere)
VIGNETTES = [
    ("res/images/batailles/libre.png", "bataille-libre", (8, 4), ["hellenes"]),
    ("res/images/batailles/platees.png", "platees-479", (2, 6), ["persians", "spartans"]),
    ("res/images/batailles/leuctres.png", "leuctres-371", (13, 4), ["thebans", "spartans"]),
    ("res/images/batailles/laurion.png", "laurion-413", (6, 5), ["athenians", "spartans"]),
]

TILES = {"plaine": ["plaine1", "plaine2", "plaine3"], "route": ["route"], "colline": ["colline1", "colline2", "colline3"],
         "foret": ["foret1", "foret2", "foret3"], "marais": ["marais1", "marais2"], "montagne": ["montagne1", "montagne2"],
         "mer": ["mer"], "ville": ["ville"], "camp": ["camp"], "mine": ["mine"]}
LEGEND = {".": "plaine", "=": "route", "c": "colline", "f": "foret", "m": "marais", "v": "ville", "k": "camp",
          "x": "mine", "M": "montagne", "~": "mer"}


def tile(name):
    return Image.open(os.path.join(GAME, "res", "images", "tuiles", name + ".png")).convert("RGBA")


def hexagon(cx, cy, r):
    return [(cx + r * math.cos(math.pi / 3 * k), cy + r * math.sin(math.pi / 3 * k)) for k in range(6)]


def terrain_map(sc):
    rows = sc["carte"]["lignes"]
    return lambda c, r: LEGEND[rows[r][c]] if 0 <= r < len(rows) and 0 <= c < len(rows[0]) else "plaine"


def background(sc, corner):
    """Une portion de la carte, hexagones de rayon R, a sommet plat (odd-q)."""
    R = 30
    img = Image.new("RGBA", (S, S), (210, 170, 120, 255))
    at = terrain_map(sc)
    c0, r0 = corner
    for dc in range(-1, 6):
        for dr in range(-1, 5):
            c, r = c0 + dc, r0 + dr
            x = R + dc * 1.5 * R - R * 0.4
            y = R * SQ3 * (0.5 + dr + 0.5 * (c & 1)) - R * 0.6
            name = at(c, r)
            for layer in (TILES["plaine"][(c * 7 + r * 3) % 3], None if name == "plaine" else TILES[name][(c + r) % len(TILES[name])]):
                if not layer:
                    continue
                t = tile(layer).resize((int(2 * R) + 1, int(R * SQ3) + 1), Image.LANCZOS)
                mask = Image.new("L", (S, S), 0)
                ImageDraw.Draw(mask).polygon(hexagon(x, y, R), fill=255)
                layer_img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
                layer_img.paste(t, (int(x - R), int(y - R * SQ3 / 2)), t)
                img.paste(layer_img, (0, 0), Image.composite(layer_img, Image.new("RGBA", (S, S)), mask).split()[3])
            ImageDraw.Draw(img).polygon(hexagon(x, y, R), outline=(60, 40, 20, 90))
    # un voile chaud pour que les emblemes ressortent
    veil = Image.new("RGBA", (S, S), (40, 25, 12, 70))
    return Image.alpha_composite(img, veil)


def emblem(name, size):
    e = Image.open(os.path.join(GAME, "res", "images", "emblemes", name + ".png")).convert("RGBA")
    return e.resize((size, size), Image.LANCZOS)


def shadowed(base, e, x, y):
    sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
    a = e.split()[3].point(lambda v: v * 0.6)
    sh.paste((0, 0, 0, 255), (x + 5, y + 7), a)
    base = Image.alpha_composite(base, sh.filter(ImageFilter.GaussianBlur(4)))
    base.alpha_composite(e, (x, y))
    return base


def frame(img):
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, S - 1, S - 1], outline=(42, 26, 18, 255), width=8)
    d.rectangle([5, 5, S - 6, S - 6], outline=(200, 118, 63, 255), width=2)
    return img


# la vignette du jeu : les emblemes des batailles, un par quart
JEU = ("thumbnail.png", "bataille-libre", (8, 4), ["persians", "athenians", "thebans", "spartans"])


def save(img, out):
    # 256 couleurs : la vignette pese le tiers
    frame(img).convert("RGB").quantize(256, method=Image.Quantize.MEDIANCUT).save(os.path.join(GAME, out), optimize=True)
    print(out)


def main():
    out, name, corner, emblems = JEU
    sc = json.load(open(os.path.join(GAME, "scenarios", name + ".json"), encoding="utf-8"))
    img = background(sc, corner)
    E = 80
    for k, e in enumerate(emblems):
        x = 16 + (k % 2) * (S - 32 - E)
        y = 16 + (k // 2) * (S - 32 - E)
        img = shadowed(img, emblem(e, E), x, y)
    save(img, out)
    for out, name, corner, emblems in VIGNETTES:
        sc = json.load(open(os.path.join(GAME, "scenarios", name + ".json"), encoding="utf-8"))
        img = background(sc, corner)
        if len(emblems) == 1:
            e = emblem(emblems[0], 150)
            img = shadowed(img, e, (S - 150) // 2, (S - 150) // 2)
        else:
            back, front = emblem(emblems[1], 112), emblem(emblems[0], 136)
            img = shadowed(img, back, S - 112 - 14, 14)
            img = shadowed(img, front, 14, S - 136 - 14)
        save(img, out)


if __name__ == "__main__":
    main()
