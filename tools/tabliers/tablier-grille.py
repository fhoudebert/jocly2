#!/usr/bin/env python3
"""Tablier a cases carrees (damier) a imprimer sur tapis.

Le SVG est en millimetres, a la taille reelle. Le damier est continu, y
compris sur l'anneau de bord quand il y en a un : seul un trait discret
separe l'anneau des cases interieures, le tapis sert donc aussi a tout autre
jeu de memes dimensions.

    # Rococo, cases de 5 cm, avec PDF a la taille reelle
    python3 tablier-grille.py --jeu rococo --pdf

    # echecs 8x8 aux couleurs 2D de jocly, cases de 4 cm
    python3 tablier-grille.py --jeu echecs --case 40

    # tout a la main : 10 lignes, 12 colonnes, anneau, sans notation
    python3 tablier-grille.py --lignes 10 --colonnes 12 --clair '#FECA66' \\
        --fonce '#C89264' --anneau --sans-notation --png 4096

--jeu donne les couleurs (et les dimensions pour rococo/rocaille) ; toute
option explicite l'emporte. Sortie par defaut : tablier-<L>x<C>.svg, ou
<jeu>-<L>x<C>.svg.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tablier_commun import (JEUX, Svg, assombrit, couleur, exporte, lettres, mm,  # noqa: E402
                            plus_lisible)


def options():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--jeu', choices=sorted(JEUX), help='couleurs (et dimensions) d\'un '
                    'tablier de jocly')
    ap.add_argument('--lignes', type=int, help='nombre de rangees (defaut 8)')
    ap.add_argument('--colonnes', type=int, help='nombre de colonnes (defaut 8)')
    ap.add_argument('--clair', help='couleur des cases claires (#rrggbb)')
    ap.add_argument('--fonce', help='couleur des cases foncees (#rrggbb)')
    ap.add_argument('--trait', help='couleur du cadre et de la demarcation de '
                    'l\'anneau (defaut : la couleur foncee assombrie)')
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--anneau', dest='anneau', action='store_true', default=None,
                   help='tracer la demarcation d\'un anneau de bord')
    g.add_argument('--sans-anneau', dest='anneau', action='store_false')
    ap.add_argument('--anneau-largeur', type=int, default=1,
                    help='epaisseur de l\'anneau, en cases (defaut 1)')
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--notation', dest='notation', action='store_true', default=True,
                   help='reperes a-z / 1-N dans les cases de bord (defaut)')
    g.add_argument('--sans-notation', dest='notation', action='store_false')
    ap.add_argument('--coin', choices=('fonce', 'clair'), default='fonce',
                    help='couleur de la case a1, en bas a gauche (defaut fonce, '
                    'comme aux echecs et aux dames internationales)')
    ap.add_argument('--case', type=float, default=50,
                    help='cote d\'une case en mm (defaut 50 : pieces t5 ; 40 pour t4)')
    ap.add_argument('--cadre', type=float, help='largeur du cadre en mm '
                    '(defaut 12 %% de la case ; 0 pour aucun)')
    ap.add_argument('--out', help='fichier SVG a ecrire')
    ap.add_argument('--pdf', nargs='?', const=True, metavar='FICHIER',
                    help='ecrire aussi le PDF a la taille reelle (defaut : nom du SVG)')
    ap.add_argument('--png', type=int, metavar='PIXELS',
                    help='ecrire aussi un PNG de cette largeur')
    a = ap.parse_args()

    # --jeu fournit des valeurs par defaut, les options explicites l'emportent
    j = JEUX.get(a.jeu, {})
    a.lignes = a.lignes or j.get('lignes', 8)
    a.colonnes = a.colonnes or j.get('colonnes', 8)
    a.clair = couleur(a.clair or j.get('clair', '#F1D9B3'))
    a.fonce = couleur(a.fonce or j.get('fonce', '#C7885D'))
    a.trait = couleur(a.trait or j.get('trait') or assombrit(a.fonce))
    if a.anneau is None:
        a.anneau = j.get('anneau', False)
    if a.cadre is None:
        a.cadre = round(a.case * 0.12, 1)
    if a.lignes < 1 or a.colonnes < 1:
        sys.exit('il faut au moins une ligne et une colonne')
    k = a.anneau_largeur
    if a.anneau and (k < 1 or 2 * k >= min(a.lignes, a.colonnes)):
        sys.exit(f'--anneau-largeur {k} : il ne resterait aucune case interieure')
    if not a.out:
        a.out = f'{a.jeu or "tablier"}-{a.lignes}x{a.colonnes}.svg'
    if a.pdf is True:
        a.pdf = os.path.splitext(a.out)[0] + '.pdf'
    return a


def dessine(a):
    C, L, N, F = a.case, a.lignes, a.colonnes, a.cadre
    largeur, hauteur = N * C + 2 * F, L * C + 2 * F
    svg = Svg(largeur, hauteur, f'Tablier {L}x{N}, cases de {mm(C)} mm')
    svg.rect(0, 0, largeur, hauteur, a.trait)
    pair = a.fonce if a.coin == 'fonce' else a.clair      # couleur de a1
    impair = a.clair if pair == a.fonce else a.fonce

    def teinte(r, c):
        return pair if (r + c) % 2 == 0 else impair

    for r in range(L):                  # r = 0 : rangee 1, en bas
        for c in range(N):
            svg.rect(F + c * C, F + (L - 1 - r) * C, C, C, teinte(r, c))

    if a.anneau:
        # contour des cases interieures, centre sur la limite : discret
        k = a.anneau_largeur
        svg.rect(F + k * C, F + k * C, (N - 2 * k) * C, (L - 2 * k) * C,
                 stroke=a.trait, sw=round(C * 0.03, 2))

    if a.notation:
        # comme le modele Rocaille : chiffres en haut a droite de la colonne a,
        # lettres en bas a droite de la rangee 1 ; le repere prend, du clair ou
        # du trait, celui qui se lit le mieux sur sa case (une case foncee
        # moyenne, comme l'argile de Rocaille, se lit mieux en trait qu'en clair)
        taille, retrait = C * 0.17, C * 0.07

        def contraste(fond):
            return plus_lisible(fond, a.trait, a.clair) if fond == a.fonce else a.trait

        for r in range(L):
            svg.texte(F + C - retrait, F + (L - 1 - r) * C + retrait + taille * 0.78,
                      r + 1, taille, contraste(teinte(r, 0)))
        for c in range(N):
            svg.texte(F + (c + 1) * C - retrait, F + L * C - retrait,
                      lettres(c), taille, contraste(teinte(0, c)))
    return svg, largeur, hauteur


def main():
    a = options()
    svg, largeur, hauteur = dessine(a)
    with open(a.out, 'w', encoding='utf-8') as fh:
        fh.write(str(svg))
    print(f'{a.out} : {mm(largeur)} x {mm(hauteur)} mm, {a.lignes}x{a.colonnes} '
          f'cases de {mm(a.case)} mm' + (', anneau' if a.anneau else ''))
    exporte(a.out, largeur, hauteur, pdf=a.pdf, png=a.png)


if __name__ == '__main__':
    main()
