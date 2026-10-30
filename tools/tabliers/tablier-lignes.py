#!/usr/bin/env python3
"""Tablier a intersections a imprimer sur tapis (SVG en millimetres).

On joue sur les points, pas dans les cases : jeu de go, echecs chinois
(xiangqi) et coreens (janggi), ou grille quelconque.

    python3 tablier-lignes.py --jeu go19 --pdf
    python3 tablier-lignes.py --jeu go13
    python3 tablier-lignes.py --jeu xiangqi --pdf           # pas de 4 cm
    python3 tablier-lignes.py --jeu janggi --sans-notation
    python3 tablier-lignes.py --colonnes 7 --lignes 7 --pas 40   # grille quelconque

Le pas est l'ecart entre deux lignes. Go : 22 x 23,7 mm, les dimensions
d'un goban (pierres de 22 mm ; la grille est un peu plus haute que large
pour paraitre carree au joueur assis). Xiangqi et janggi : 40 mm, comme les
cases des echiquiers. Couleurs : le bois des tabliers jocly eclairci, lignes
couleur encre ; --fond et --trait les changent.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tablier_commun import (BOIS, CASE, ENCRE, POLICE_CJK, Svg, ajuste, couleur,  # noqa: E402
                            ecrit, lettres, mm, options_sortie)

JEUX = {
    'go19': {'colonnes': 19, 'lignes': 19, 'pas': 22, 'pas_y': 23.7, 'style': 'go'},
    'go13': {'colonnes': 13, 'lignes': 13, 'pas': 22, 'pas_y': 23.7, 'style': 'go'},
    'go9': {'colonnes': 9, 'lignes': 9, 'pas': 22, 'pas_y': 23.7, 'style': 'go'},
    'xiangqi': {'colonnes': 9, 'lignes': 10, 'style': 'xiangqi'},
    'janggi': {'colonnes': 9, 'lignes': 10, 'style': 'janggi'},
}

# hoshi des gobans (colonne, ligne), comptes depuis 0
HOSHI = {
    19: [(c, l) for c in (3, 9, 15) for l in (3, 9, 15)],
    13: [(c, l) for c in (3, 9) for l in (3, 9)] + [(6, 6)],
    9: [(c, l) for c in (2, 6) for l in (2, 6)] + [(4, 4)],
}


def options():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--jeu', choices=sorted(JEUX), help='go9, go13, go19, xiangqi, janggi')
    ap.add_argument('--colonnes', type=int, help='nombre de lignes verticales')
    ap.add_argument('--lignes', type=int, help='nombre de lignes horizontales')
    ap.add_argument('--pas', type=float, help=f'ecart entre deux lignes, mm (defaut '
                    f'{CASE} ; go : 22)')
    ap.add_argument('--pas-y', type=float, help='ecart vertical s\'il differe (go : 23,7)')
    ap.add_argument('--fond', default=BOIS, help=f'couleur du tapis (defaut {BOIS})')
    ap.add_argument('--trait', default=ENCRE, help=f'couleur des lignes (defaut {ENCRE})')
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--notation', dest='notation', action='store_true', default=True)
    g.add_argument('--sans-notation', dest='notation', action='store_false')
    ap.add_argument('--sans-riviere-texte', dest='riviere_texte', action='store_false',
                    default=True, help='xiangqi : ne pas ecrire 楚河 漢界 dans la riviere '
                    '(demande une police CJK, Noto CJK par exemple)')
    options_sortie(ap)
    a = ap.parse_args()
    j = JEUX.get(a.jeu, {})
    a.style = j.get('style', 'grille')
    a.colonnes = a.colonnes or j.get('colonnes', 9)
    a.lignes = a.lignes or j.get('lignes', 9)
    a.pas = a.pas or j.get('pas', CASE)
    a.pas_y = a.pas_y or (j.get('pas_y', a.pas) * a.pas / j.get('pas', a.pas))
    if a.style in ('xiangqi', 'janggi') and (a.colonnes, a.lignes) != (9, 10):
        sys.exit(f'{a.jeu} : 9 colonnes x 10 lignes')
    if a.colonnes < 2 or a.lignes < 2:
        sys.exit('au moins deux lignes dans chaque sens')
    a.fond, a.trait = couleur(a.fond), couleur(a.trait)
    if not a.out:
        a.out = f'{a.jeu or "lignes"}-{a.colonnes}x{a.lignes}.svg'
    return a


def main():
    a = options()
    N, L = a.colonnes, a.lignes
    ratio = a.pas_y / a.pas
    marge = 1.0 if a.notation else 0.7             # en pas, autour de la grille

    def dims(p):
        return (N - 1 + 2 * marge) * p, (L - 1 + 2 * marge) * p * ratio
    a.pas = ajuste(a.pas, dims, a.taille_max, 'le pas')
    p, py = a.pas, a.pas * ratio
    largeur, hauteur = dims(p)
    x0, y0 = marge * p, marge * py

    def X(c):
        return x0 + c * p

    def Y(l):                                       # l = 0 : ligne du bas
        return y0 + (L - 1 - l) * py

    svg = Svg(largeur, hauteur, f'Tablier {a.jeu or "a lignes"} {N}x{L}, pas de {mm(p)} mm')
    svg.rect(0, 0, largeur, hauteur, a.fond)
    fin = round(min(p, py) * (0.045 if a.style == 'go' else 0.03), 2)
    epais = fin * 2

    # horizontales
    for l in range(L):
        svg.ligne(X(0), Y(l), X(N - 1), Y(l), a.trait, fin, cap='square')
    # verticales, interrompues par la riviere du xiangqi (sauf les bords)
    for c in range(N):
        if a.style == 'xiangqi' and 0 < c < N - 1:
            svg.ligne(X(c), Y(0), X(c), Y(4), a.trait, fin, cap='square')
            svg.ligne(X(c), Y(5), X(c), Y(9), a.trait, fin, cap='square')
        else:
            svg.ligne(X(c), Y(0), X(c), Y(L - 1), a.trait, fin, cap='square')
    # bord de la grille, plus appuye
    svg.rect(X(0), Y(L - 1), (N - 1) * p, (L - 1) * py, stroke=a.trait, sw=epais)

    if a.style in ('xiangqi', 'janggi'):
        # palais : diagonales du carre 3x3 central de chaque camp
        for (c0, l0), (c1, l1) in (((3, 0), (5, 2)), ((5, 0), (3, 2)),
                                   ((3, 7), (5, 9)), ((5, 7), (3, 9))):
            svg.ligne(X(c0), Y(l0), X(c1), Y(l1), a.trait, fin)
        # cadre exterieur, a distance, comme sur les tabliers traditionnels
        e = 0.22 * p
        svg.rect(X(0) - e, Y(L - 1) - e, (N - 1) * p + 2 * e, (L - 1) * py + 2 * e,
                 stroke=a.trait, sw=epais * 1.3)

    if a.style == 'xiangqi':
        # « fleurs » aux places de depart des canons et des soldats
        fleurs = [(1, 2), (7, 2), (1, 7), (7, 7)] + \
                 [(c, l) for c in (0, 2, 4, 6, 8) for l in (3, 6)]
        g, b = 0.1 * p, 0.22 * p                    # ecart au point, longueur des branches
        for c, l in fleurs:
            for dx in (-1, 1):
                if (dx < 0 and c == 0) or (dx > 0 and c == N - 1):
                    continue                        # pas de branche hors du tablier
                for dy in (-1, 1):
                    x, y = X(c) + dx * g, Y(l) + dy * g
                    svg.chemin(f'M{mm(x + dx * b)} {mm(y)} L{mm(x)} {mm(y)} '
                               f'L{mm(x)} {mm(y + dy * b)}', stroke=a.trait, sw=fin,
                               extra=' stroke-linecap="square"')
        if a.riviere_texte:
            t = 0.55 * py
            ym = (Y(4) + Y(5)) / 2
            for texte, xc in (('楚 河', (X(1) + X(3)) / 2), ('漢 界', (X(5) + X(7)) / 2)):
                svg.texte(xc, ym, texte, t, a.trait, ancre='middle', police=POLICE_CJK,
                          gras=False, base='central')

    if a.style == 'go':
        for c, l in HOSHI.get(N, []) if N == L else []:
            svg.cercle(X(c), Y(l), min(p, py) * 0.09, fill=a.trait)

    if a.notation:
        # go : A..T sans I, la convention des diagrammes ; sinon a, b, c...
        if a.style == 'go':
            noms = [ch for ch in 'ABCDEFGHJKLMNOPQRSTUVWXYZ'][:N]
        else:
            noms = [lettres(c) for c in range(N)]
        taille = min(p, py) * (0.32 if a.style == 'go' else 0.2)
        dist = 0.62 * min(p, py)
        for c in range(N):
            svg.texte(X(c), Y(0) + dist, noms[c], taille, a.trait, ancre='middle',
                      base='central', gras=a.style != 'go')
        for l in range(L):
            svg.texte(X(0) - dist, Y(l), l + 1, taille, a.trait, ancre='middle',
                      base='central', gras=a.style != 'go')

    ecrit(a, svg, largeur, hauteur, f'{N}x{L} lignes, pas de {mm(p)}'
          + (f' x {mm(py)}' if py != p else '') + ' mm')


if __name__ == '__main__':
    main()
