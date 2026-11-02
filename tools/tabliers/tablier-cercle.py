#!/usr/bin/env python3
"""Tablier circulaire a imprimer sur tapis (SVG en millimetres).

Anneaux concentriques decoupes en secteurs, en damier, autour d'un moyeu.
Par defaut, le plateau des echecs byzantins et des echecs circulaires
modernes de jocly : 4 anneaux x 16 secteurs (cbBoardGeometryCylinder(16,4))
autour d'un moyeu de 4 cases de diametre (CENTER dans circular-board-view.js),
rangee 1 a l'exterieur, colonne a juste sous l'horizontale droite, les
colonnes tournant dans le sens des aiguilles d'une montre - comme a l'ecran.

    python3 tablier-cercle.py --pdf                         # byzantin, cases de 4 cm
    python3 tablier-cercle.py --anneaux 6 --secteurs 24 --moyeu 60 --case 30 \\
        --clair '#DDB07A' --fonce '#062440' --moyeu-couleur '#747474'   # le modele 50x50

--case est la profondeur d'un anneau. Les diagonales (courbes passant par
les coins des cases, comme sur le modele) aident a lire les deplacements en
diagonale, peu intuitifs sur un cercle ; --sans-diagonales les retire.
"""
import argparse
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tablier_commun import (JEUX, Svg, ajuste, assombrit, couleur, ecrit,  # noqa: E402
                            lettres, mm, options_sortie, plus_lisible)


def options():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--anneaux', type=int, default=4, help='nombre d\'anneaux (defaut 4)')
    ap.add_argument('--secteurs', type=int, default=16, help='nombre de secteurs (defaut 16)')
    ap.add_argument('--moyeu', type=float, metavar='MM',
                    help='rayon du moyeu central (defaut : 2 cases, comme jocly)')
    ap.add_argument('--clair', default=JEUX['echecs']['clair'])
    ap.add_argument('--fonce', default=JEUX['echecs']['fonce'])
    ap.add_argument('--trait', help='contour, demarcations (defaut : le fonce assombri)')
    ap.add_argument('--moyeu-couleur', default='#A89F94', help='couleur du moyeu')
    ap.add_argument('--fond', default='#FFFFFF', help='fond autour du cercle')
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--diagonales', dest='diagonales', action='store_true', default=True)
    g.add_argument('--sans-diagonales', dest='diagonales', action='store_false')
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--notation', dest='notation', action='store_true', default=True)
    g.add_argument('--sans-notation', dest='notation', action='store_false')
    options_sortie(ap)
    a = ap.parse_args()
    if a.anneaux < 1 or a.secteurs < 2 or a.secteurs % 2:
        sys.exit('il faut au moins un anneau et un nombre pair de secteurs (damier)')
    a.clair, a.fonce = couleur(a.clair), couleur(a.fonce)
    a.trait = couleur(a.trait or assombrit(a.fonce))
    a.moyeu_couleur, a.fond = couleur(a.moyeu_couleur), couleur(a.fond)
    if not a.out:
        a.out = f'cercle-{a.anneaux}x{a.secteurs}.svg'
    return a


def main():
    a = options()
    moyeu_fixe = a.moyeu
    marge = 0.25                                    # en cases, autour du cercle

    def rayon_moyeu(c):
        return moyeu_fixe if moyeu_fixe is not None else 2 * c

    def dims(c):
        d = 2 * (rayon_moyeu(c) + a.anneaux * c + marge * c)
        return d, d
    a.case = ajuste(a.case, dims, a.taille_max, 'la profondeur d\'anneau')
    C, A, S = a.case, a.anneaux, a.secteurs
    r0 = rayon_moyeu(C)
    cote, _ = dims(C)
    cx = cy = cote / 2
    pas = 2 * math.pi / S

    def point(r, t):
        # t : angle ecran, sens horaire depuis 3 h (y vers le bas en SVG)
        return cx + r * math.cos(t), cy + r * math.sin(t)

    svg = Svg(cote, cote, f'Tablier circulaire {A}x{S}, anneaux de {mm(C)} mm')
    svg.rect(0, 0, cote, cote, a.fond)
    trait = round(C * 0.025, 2)

    # rangee 1 = anneau exterieur ; colonne a = premier secteur sous 3 h, comme jocly
    def teinte(rangee, col):
        return a.fonce if (rangee + col) % 2 == 0 else a.clair

    for k in range(A):                              # k = 0 : anneau interieur
        ri, re_ = r0 + k * C, r0 + (k + 1) * C
        rangee = A - 1 - k
        for s in range(S):
            t0, t1 = s * pas, (s + 1) * pas
            p = [point(re_, t0), point(re_, t1), point(ri, t1), point(ri, t0)]
            d = (f'M{mm(p[0][0])} {mm(p[0][1])} A{mm(re_)} {mm(re_)} 0 0 1 {mm(p[1][0])} '
                 f'{mm(p[1][1])} L{mm(p[2][0])} {mm(p[2][1])} A{mm(ri)} {mm(ri)} 0 0 0 '
                 f'{mm(p[3][0])} {mm(p[3][1])} Z')
            # contour de la couleur de la case : referme les jointures sans trait visible
            col = teinte(rangee, s)
            svg.chemin(d, fill=col, stroke=col, sw=0.2)

    if a.diagonales:
        # dans chaque case, deux courbes d'un coin a l'autre : spirales
        # logarithmiques, qui se raccordent d'une case a la suivante
        fin = round(C * 0.012, 2)
        teinte_diag = '#8a8a8a'
        for k in range(A):
            ri, re_ = r0 + k * C, r0 + (k + 1) * C
            for s in range(S):
                for sens in (1, -1):
                    pts = []
                    for i in range(13):
                        u = i / 12
                        r = ri * (re_ / ri) ** u if ri > 0 else re_ * u
                        t = (s + (u if sens > 0 else 1 - u)) * pas
                        pts.append(point(r, t))
                    d = 'M' + ' L'.join(f'{mm(x)} {mm(y)}' for x, y in pts)
                    svg.chemin(d, stroke=teinte_diag, sw=fin,
                               extra=' stroke-linecap="round" opacity="0.7"')

    # moyeu, puis cercles de contour
    svg.cercle(cx, cy, r0, fill=a.moyeu_couleur, stroke=a.trait, sw=trait)
    svg.cercle(cx, cy, r0 + A * C, stroke=a.trait, sw=trait * 1.6)

    if a.notation:
        taille = C * 0.17
        # lettres dans l'anneau exterieur, pres du bord
        r_l = r0 + A * C - C * 0.2
        for s in range(S):
            x, y = point(r_l, (s + 0.5) * pas)
            svg.texte(x, y, lettres(s), taille,
                      plus_lisible(teinte(0, s), a.trait, a.clair), ancre='middle',
                      base='central')
        # chiffres dans les cases de la colonne a, cote debut de secteur
        for k in range(A):
            rangee = A - 1 - k
            x, y = point(r0 + (k + 0.5) * C, pas * 0.22)
            svg.texte(x, y, rangee + 1, taille,
                      plus_lisible(teinte(rangee, 0), a.trait, a.clair), ancre='middle',
                      base='central')

    ecrit(a, svg, cote, cote, f'{A} anneaux x {S} secteurs, anneaux de {mm(C)} mm, '
          f'moyeu de {mm(r0)} mm de rayon')


if __name__ == '__main__':
    main()
