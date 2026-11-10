"""Génère les planches SVG du Jeu de la guerre (jocly2).
Unités : infanterie, cavalerie, artillerie, artillerie à cheval, transmission, estafette.
Cellule = 200 unités. Sorties : svg/<nom>.svg (une pièce par fichier) et sheets/<planche>.svg.
"""
import os

C = 200  # taille d'une case
OUT = os.path.dirname(os.path.abspath(__file__))

SIDES = {
    # Nord : cadre plein sombre, symbole clair. Sud : fond clair, cadre et symbole sombres.
    # L'inversion clair/sombre distingue les camps sans dépendre de la couleur.
    "N": dict(fill="#2c5a96", stroke="#14304f", sym="#ffffff"),
    "S": dict(fill="#f6ead2", stroke="#9a4f12", sym="#7a3d0c"),
}

UNITS = ["infanterie", "cavalerie", "artillerie", "artillerie-a-cheval", "transmission", "estafette"]

# Cadre militaire : rectangle 150x100 centré (unités combattantes), cercle (relais)
FX, FY, FW, FH = 16, 46, 168, 112


def chevrons(col):
    # marque « rapide » : double chevron en haut à droite, hors du cadre
    return (f'<g fill="none" stroke="{col}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">'
            f'<polyline points="128,6 146,22 128,38"/><polyline points="154,6 172,22 154,38"/></g>')


def unit_svg(kind, side):
    s = SIDES[side]
    sw = 10
    out = []
    swift = kind.endswith("-a-cheval") or kind == "estafette"
    base = "transmission" if kind == "estafette" else kind.replace("-a-cheval", "")
    if base == "transmission":
        out.append(f'<circle cx="100" cy="106" r="74" fill="{s["fill"]}" stroke="{s["stroke"]}" stroke-width="{sw}"/>')
        out.append(f'<polygon points="112,52 66,114 98,114 86,160 136,94 104,94" fill="{s["sym"]}" '
                   f'stroke="{s["sym"]}" stroke-width="4" stroke-linejoin="round"/>')
    else:
        out.append(f'<rect x="{FX}" y="{FY}" width="{FW}" height="{FH}" rx="6" fill="{s["fill"]}" '
                   f'stroke="{s["stroke"]}" stroke-width="{sw}"/>')
        x0, y0, x1, y1 = FX + 5, FY + 5, FX + FW - 5, FY + FH - 5
        line = f'stroke="{s["sym"]}" stroke-width="11" stroke-linecap="round"'
        if base == "infanterie":
            out.append(f'<line x1="{x0}" y1="{y0}" x2="{x1}" y2="{y1}" {line}/>')
            out.append(f'<line x1="{x0}" y1="{y1}" x2="{x1}" y2="{y0}" {line}/>')
        elif base == "cavalerie":
            out.append(f'<line x1="{x0}" y1="{y1}" x2="{x1}" y2="{y0}" {line}/>')
        elif base == "artillerie":
            out.append(f'<circle cx="100" cy="102" r="26" fill="{s["sym"]}"/>')
    if swift:
        out.append(chevrons(s["stroke"]))
    return "".join(out)


TERRAIN = ["montagne", "col", "forteresse", "arsenal-nord", "arsenal-sud", "arsenal-detruit"]


def mountain_shape(gap=False):
    rock = "#8a7f72"
    dark = "#5c544b"
    snow = "#f2efe9"
    g = [f'<rect x="0" y="0" width="{C}" height="{C}" fill="#b9ad9b"/>']
    peaks = [(15, 160, 75, 45, 135, 160), (70, 175, 125, 70, 185, 175)]
    for (ax, ay, bx, by, cx, cy) in peaks:
        g.append(f'<polygon points="{ax},{ay} {bx},{by} {cx},{cy}" fill="{rock}" stroke="{dark}" stroke-width="6" stroke-linejoin="round"/>')
        g.append(f'<polygon points="{bx},{by} {bx-14},{by+24} {bx},{by+16} {bx+14},{by+24}" fill="{snow}"/>')
    if gap:
        # col : chemin clair qui traverse la chaîne
        g.append('<path d="M100,200 C88,150 118,120 100,90 C86,60 108,30 100,0" fill="none" stroke="#e8dcc0" stroke-width="30"/>')
        g.append('<path d="M100,200 C88,150 118,120 100,90 C86,60 108,30 100,0" fill="none" stroke="#6b5a3e" stroke-width="5" stroke-dasharray="12 10"/>')
    return "".join(g)


def fortress():
    # bastion « à la Vauban » : étoile à 5 pointes basse, neutre (sert les deux camps)
    import math
    pts = []
    for i in range(10):
        r = 96 if i % 2 == 0 else 64
        a = -math.pi / 2 + i * math.pi / 5
        pts.append(f"{100 + r * math.cos(a):.1f},{104 + r * math.sin(a):.1f}")
    inner = []
    for i in range(10):
        r = 74 if i % 2 == 0 else 48
        a = -math.pi / 2 + i * math.pi / 5
        inner.append(f"{100 + r * math.cos(a):.1f},{104 + r * math.sin(a):.1f}")
    return (f'<polygon points="{" ".join(pts)}" fill="#a8a29a" stroke="#4a4540" stroke-width="7" stroke-linejoin="round"/>'
            f'<polygon points="{" ".join(inner)}" fill="#d7d2c9" stroke="#4a4540" stroke-width="4" stroke-linejoin="round"/>')


def arsenal(color, stroke, destroyed=False):
    g = [f'<rect x="4" y="4" width="192" height="192" rx="14" fill="{color}" opacity="0.35" stroke="{stroke}" stroke-width="8"/>']
    # bâtiment à fronton + pile de boulets
    g.append(f'<polygon points="30,85 100,35 170,85" fill="{color}" stroke="{stroke}" stroke-width="8" stroke-linejoin="round"/>')
    g.append(f'<rect x="40" y="85" width="120" height="80" fill="{color}" stroke="{stroke}" stroke-width="8"/>')
    g.append(f'<rect x="85" y="115" width="30" height="50" fill="{stroke}"/>')
    ball = "#2b2b2b"
    for (x, y) in [(58, 150), (142, 150), (58, 128), (142, 128)]:
        pass
    if destroyed:
        g.append('<line x1="25" y1="30" x2="175" y2="180" stroke="#b3261e" stroke-width="16" stroke-linecap="round"/>')
        g.append('<line x1="175" y1="30" x2="25" y2="180" stroke="#b3261e" stroke-width="16" stroke-linecap="round"/>')
    return "".join(g)


def terrain_svg(kind):
    if kind == "montagne":
        return mountain_shape()
    if kind == "col":
        return mountain_shape(gap=True)
    if kind == "forteresse":
        return fortress()
    if kind == "arsenal-nord":
        return arsenal(SIDES["N"]["fill"], SIDES["N"]["stroke"])
    if kind == "arsenal-sud":
        return arsenal(SIDES["S"]["fill"], SIDES["S"]["stroke"])
    if kind == "arsenal-detruit":
        return arsenal("#9b9b9b", "#555555", destroyed=True)


MARKERS = ["deplacee", "isolee", "retraite-obligatoire", "cible-destruction", "cible-retraite",
           "selection", "destination-communication", "destination-isolee"]


def marker_svg(kind):
    if kind == "deplacee":
        # pastille « déjà bougé » coin bas droit
        return ('<circle cx="168" cy="168" r="24" fill="#ffffff" stroke="#333" stroke-width="5"/>'
                '<polyline points="156,168 165,178 182,157" fill="none" stroke="#2e7d32" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>')
    if kind == "isolee":
        # voile gris hachuré + maillon brisé
        hatch = "".join(f'<line x1="{x}" y1="0" x2="{x-200}" y2="200" stroke="#3a3a3a" stroke-width="6" opacity="0.45"/>'
                        for x in range(20, 420, 36))
        return (f'<rect x="0" y="0" width="{C}" height="{C}" fill="#9e9e9e" opacity="0.45"/>'
                f'<clipPath id="cl"><rect x="0" y="0" width="{C}" height="{C}"/></clipPath><g clip-path="url(#cl)">{hatch}</g>'
                )
    if kind == "retraite-obligatoire":
        return ('<circle cx="168" cy="32" r="26" fill="#ef8a17" stroke="#7a3d0c" stroke-width="5"/>'
                '<path d="M180,32 H156 M166,20 L154,32 L166,44" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>')
    if kind == "cible-destruction":
        return ('<circle cx="100" cy="100" r="84" fill="none" stroke="#d32f2f" stroke-width="14"/>'
                '<path d="M100,0 V40 M100,160 V200 M0,100 H40 M160,100 H200" stroke="#d32f2f" stroke-width="12"/>')
    if kind == "cible-retraite":
        return ('<circle cx="100" cy="100" r="84" fill="none" stroke="#ef8a17" stroke-width="14" stroke-dasharray="30 16"/>')
    if kind == "selection":
        return '<rect x="8" y="8" width="184" height="184" rx="10" fill="none" stroke="#ffd600" stroke-width="16"/>'
    if kind == "destination-communication":
        return '<circle cx="100" cy="100" r="30" fill="#2e7d32" opacity="0.85"/>'
    if kind == "destination-isolee":
        return '<circle cx="100" cy="100" r="30" fill="none" stroke="#757575" stroke-width="10" stroke-dasharray="14 9"/>'


def wrap(body, w, h):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'{body}</svg>\n')


def cell(body, col, row, uid):
    # chaque case isolée (ids de clipPath uniques)
    body = body.replace('id="cl"', f'id="cl{uid}"').replace("url(#cl)", f"url(#cl{uid})")
    return f'<g transform="translate({col*C},{row*C})">{body}</g>'


def write(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)


def main():
    # pièces individuelles
    for side in "NS":
        for u in UNITS:
            write(f"{OUT}/svg/unites/{u}-{side}.svg", wrap(unit_svg(u, side), C, C))
    for t in TERRAIN:
        write(f"{OUT}/svg/terrain/{t}.svg", wrap(terrain_svg(t), C, C))
    for m in MARKERS:
        write(f"{OUT}/svg/marqueurs/{m}.svg", wrap(marker_svg(m).replace('id="cl"', 'id="cl0"').replace("url(#cl)", "url(#cl0)"), C, C))
    # planches
    body = "".join(cell(unit_svg(u, side), i, r, f"u{r}{i}")
                   for r, side in enumerate("NS") for i, u in enumerate(UNITS))
    write(f"{OUT}/sheets/unites.svg", wrap(body, C * 6, C * 2))
    body = "".join(cell(terrain_svg(t), i, 0, f"t{i}") for i, t in enumerate(TERRAIN))
    write(f"{OUT}/sheets/terrain.svg", wrap(body, C * len(TERRAIN), C))
    body = "".join(cell(marker_svg(m), i, 0, f"m{i}") for i, m in enumerate(MARKERS))
    write(f"{OUT}/sheets/marqueurs.svg", wrap(body, C * len(MARKERS), C))


if __name__ == "__main__":
    main()
