#!/usr/bin/env python3
"""Tablier hexagonal a imprimer sur tapis (SVG en millimetres).

La forme du plateau, la couleur de chaque case et les noms des cases sont lus
dans le modele jocly du jeu (src/games/chessbase/hex/<jeu>-model.js) : le
boardLayout passe a cbBoardGeometryHex et la table posNames. Le tapis est
donc exactement le plateau du jeu.

    python3 tablier-hex.py --jeu glinski --pdf
    python3 tablier-hex.py --jeu mccooey --palette modele --sans-notation
    python3 tablier-hex.py --jeu devasa --case 35
    python3 tablier-hex.py --rayon 6                    # hexagone generique, 91 cases

--case est la largeur d'un hexagone entre deux cotes opposes (defaut 40 mm).
L'orientation suit le jeu : chez Glinski, McCooey et Shafran les colonnes
sont verticales (hexagones a plat), chez Brusky et Devasa ce sont les
rangees qui sont horizontales (hexagones en pointe).
"""
import argparse
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tablier_commun import (Svg, ajuste, assombrit, couleur, ecrit, mm,  # noqa: E402
                            options_sortie, plus_lisible)

HEX_DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                        '..', '..', 'src', 'games', 'chessbase', 'hex'))
JEUX = ('glinski', 'mccooey', 'shafran', 'brusky', 'devasa')

# couleur de chaque type de case du boardLayout : '.', '+', '#'
PALETTES = {
    # cbHexBoardClassic2D (hex-board-view.js)
    'jocly': {'.': '#FFCE9E', '+': '#E8AB6F', '#': '#D18B47'},
    # le modele echiquierhexagonal-42_50 : marine en f1, gris au centre, sable en f11
    'modele': {'.': '#062440', '+': '#747474', '#': '#DDB07A'},
}


def lit_modele(jeu):
    """(lignes du boardLayout, {pos: nom}) lus dans le modele jocly."""
    chemin = os.path.join(HEX_DIR, f'{jeu}-model.js')
    if not os.path.isfile(chemin):
        sys.exit(f'{chemin} introuvable')
    src = open(chemin, encoding='utf-8').read()
    m = re.search(r'cbBoardGeometryHex\(\s*\[(.*?)\]', src, re.S)
    if not m:
        sys.exit(f'{chemin} : boardLayout introuvable')
    lignes = re.findall(r'''["']([^"'\n]*)["']''', m.group(1))
    m = re.search(r'var\s+posNames\s*=\s*\{(.*?)\}', src, re.S)
    noms = {int(p): n for p, n in re.findall(r'''(\d+)\s*:\s*['"]([^'"]+)['"]''',
                                             m.group(1))} if m else {}
    return lignes, noms


def hexagone_generique(n):
    """boardLayout d'un hexagone de cote n, colorie comme celui de Glinski."""
    lignes = []
    for i in range(2 * n - 1):
        d = abs(n - 1 - i)
        k = 2 * n - 1 - d                   # cases sur la ligne
        cases = ['.#+'[(j + 2 * d) % 3] for j in range(k)]
        lignes.append(' ' * d + ' '.join(cases) + ' ' * (d + 1))
    return lignes, {}


def cases_du_layout(lignes):
    """[(pos, ligne, caractere, type)] comme cbBoardGeometryHex les numerote."""
    largeur = max(math.ceil(len(l) / 2) for l in lignes)
    cases = []
    for r, ligne in enumerate(lignes):
        for x, ch in enumerate(ligne):
            if ch != ' ':
                cases.append((r * largeur + x // 2, r, x, ch))
    return cases


def options():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--jeu', choices=JEUX, help='plateau d\'un jeu hexagonal de jocly')
    g.add_argument('--rayon', type=int, help='hexagone generique de ce cote (6 : 91 cases)')
    ap.add_argument('--palette', choices=sorted(PALETTES), default='jocly',
                    help='couleurs des trois types de case (defaut jocly)')
    ap.add_argument('--couleurs', metavar='C1,C2,C3',
                    help='couleurs des cases de type . + # (remplace --palette)')
    ap.add_argument('--trait', help='contour des cases (defaut : la plus foncee assombrie)')
    ap.add_argument('--fond', default='#FFFFFF', help='fond du tapis (defaut blanc)')
    ap.add_argument('--orientation', choices=('auto', 'plat', 'pointe'), default='auto',
                    help='hexagones a plat (colonnes verticales) ou en pointe ; '
                    'auto : selon les noms de cases du jeu')
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--notation', dest='notation', action='store_true', default=True)
    g.add_argument('--sans-notation', dest='notation', action='store_false')
    options_sortie(ap)
    a = ap.parse_args()
    if not a.jeu and not a.rayon:
        a.jeu = 'glinski'
    if a.couleurs:
        c = [couleur(x.strip()) for x in a.couleurs.split(',')]
        if len(c) != 3:
            sys.exit('--couleurs : trois couleurs attendues')
        a.teintes = dict(zip('.+#', c))
    else:
        a.teintes = dict(PALETTES[a.palette])
    sombre = min(a.teintes.values(), key=lambda c: sum(int(c[i:i + 2], 16) for i in (1, 3, 5)))
    a.trait = couleur(a.trait or assombrit(sombre, 0.6))
    if not a.out:
        a.out = f'{a.jeu or "hexagone-" + str(a.rayon)}-hex.svg'
    return a


def place(cases, noms, orientation):
    """Centres des cases (unite : rayon R = 1) et orientation retenue."""
    s3 = math.sqrt(3)
    if orientation == 'auto':
        # une ligne du layout ou toutes les cases portent la meme lettre est
        # une colonne : on la dresse a la verticale (hexagones a plat)
        par_ligne = {}
        for pos, r, x, t in cases:
            if pos in noms:
                par_ligne.setdefault(r, set()).add(re.match(r'[a-z]+', noms[pos]).group())
        # sans noms (hexagone generique) : a plat, comme Glinski ; a la
        # majorite, pour qu'un nom errone ne fasse pas basculer le plateau
        uniques = sum(len(v) == 1 for v in par_ligne.values())
        colonnes = not par_ligne or uniques >= 0.8 * len(par_ligne)
        orientation = 'plat' if colonnes else 'pointe'
    centres = {}
    for pos, r, x, t in cases:
        if orientation == 'plat':
            centres[pos] = (r * 1.5, -x * s3 / 2)
        else:
            centres[pos] = (x * s3 / 2, r * 1.5)
    # rangee 1 en bas, colonne a a gauche, d'apres les noms quand il y en a
    if noms:
        def moyenne(cle, axe):
            v = [centres[p][axe] for p in centres if p in noms and cle(noms[p])]
            return sum(v) / len(v) if v else 0
        rang = lambda n: int(re.search(r'\d+', n).group())       # noqa: E731
        lettre = lambda n: re.match(r'[a-z]+', n).group()        # noqa: E731
        maxi = max(rang(n) for n in noms.values())
        if moyenne(lambda n: rang(n) == 1, 1) < moyenne(lambda n: rang(n) == maxi, 1):
            centres = {p: (x, -y) for p, (x, y) in centres.items()}
        if moyenne(lambda n: lettre(n) == 'a', 0) > moyenne(lambda n: lettre(n) != 'a', 0):
            centres = {p: (-x, y) for p, (x, y) in centres.items()}
    return centres, orientation


def sommets(cx, cy, R, orientation):
    d = 0 if orientation == 'plat' else 30
    return [(cx + R * math.cos(math.radians(d + 60 * k)),
             cy + R * math.sin(math.radians(d + 60 * k))) for k in range(6)]


def main():
    a = options()
    lignes, noms = lit_modele(a.jeu) if a.jeu else hexagone_generique(a.rayon)
    cases = cases_du_layout(lignes)
    centres, orient = place(cases, noms, a.orientation)
    types = {pos: t for pos, r, x, t in cases}

    # emprise en unites de R, puis taille reelle
    pts = [p for c in centres.values() for p in sommets(c[0], c[1], 1, orient)]
    x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts)
    y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
    marge = 0.35                        # en largeurs de case, autour du plateau

    def dims(case):
        R = case / math.sqrt(3)
        return (x1 - x0) * R + 2 * marge * case, (y1 - y0) * R + 2 * marge * case
    a.case = ajuste(a.case, dims, a.taille_max)
    R = a.case / math.sqrt(3)
    largeur, hauteur = dims(a.case)
    ox, oy = marge * a.case - x0 * R, marge * a.case - y0 * R

    svg = Svg(largeur, hauteur, f'Tablier hexagonal {a.jeu or a.rayon}, cases de {mm(a.case)} mm')
    svg.rect(0, 0, largeur, hauteur, a.fond)
    trait = round(a.case * 0.025, 2)
    for pos, (cx, cy) in centres.items():
        pts = sommets(ox + cx * R, oy + cy * R, R, orient)
        d = 'M' + ' L'.join(f'{mm(x)} {mm(y)}' for x, y in pts) + ' Z'
        svg.chemin(d, fill=a.teintes[types[pos]], stroke=a.trait, sw=trait,
                   extra=' stroke-linejoin="round"')

    if a.notation and noms:
        # la lettre dans la case la plus basse de chaque colonne, le chiffre
        # dans la case la plus a gauche de chaque rangee
        taille = a.case * 0.17
        par_lettre, par_rang = {}, {}
        for pos, n in noms.items():
            if pos not in centres:
                continue
            l, r = re.match(r'([a-z]+)(\d+)', n).groups()
            if l not in par_lettre or centres[pos][1] > centres[par_lettre[l]][1]:
                par_lettre[l] = pos
            if r not in par_rang or centres[pos][0] < centres[par_rang[r]][0]:
                par_rang[r] = pos
        for l, pos in par_lettre.items():
            cx, cy = ox + centres[pos][0] * R, oy + centres[pos][1] * R
            fond = a.teintes[types[pos]]
            svg.texte(cx, cy + R * 0.78, l, taille, plus_lisible(fond, a.trait, '#FFFFFF'),
                      ancre='middle')
        for r, pos in par_rang.items():
            cx, cy = ox + centres[pos][0] * R, oy + centres[pos][1] * R
            fond = a.teintes[types[pos]]
            svg.texte(cx - R * 0.62, cy + taille * 0.35, r, taille,
                      plus_lisible(fond, a.trait, '#FFFFFF'), ancre='start')

    ecrit(a, svg, largeur, hauteur, f'{len(centres)} cases de {mm(a.case)} mm '
          f'(hexagones {"a plat" if orient == "plat" else "en pointe"})')


if __name__ == '__main__':
    main()
