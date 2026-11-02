#!/usr/bin/env python3
"""Tablier a cases carrees a imprimer sur tapis (SVG en millimetres).

Deux familles :

* les damiers (echecs et variantes, dames, shogi, Rococo, Rocaille) : cases
  claires et foncees en alternance, anneau de bord eventuel ;
* les tabliers a cases unies et quadrillees (Reversi, Tafl) : --uni, avec
  cases mortes, cases marquees (trone, refuges), cases de depart et points
  aux intersections. Les tabliers Reversi et Tafl de jocly sont lus dans leur
  manifeste (src/games/reversi|tafl/index.js, via Node) : dimensions, cases
  mortes, coins hors jeu, trone, positions de depart.

    python3 tablier-grille.py --jeu echecs --pdf
    python3 tablier-grille.py --jeu rococo --pdf
    python3 tablier-grille.py --jeu reversi --pdf
    python3 tablier-grille.py --jeu hnefatafl --pdf
    python3 tablier-grille.py --lignes 10 --colonnes 12 --clair '#FECA66' \\
        --fonce '#C89264' --anneau --sans-notation --png 4096

--jeu donne les couleurs et les dimensions ; toute option explicite
l'emporte. Cases de 4 cm ; le tapis ne depasse pas --taille-max (70 cm), la
case est reduite au-dela. Le shogi se joue sur un echiquier ordinaire.
"""
import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tablier_commun import (BOIS, ENCRE, JEUX, Svg, ajuste, assombrit,  # noqa: E402
                            couleur, ecrit, jocly_options, lettres, mm,
                            options_sortie, plus_lisible)

# Reversi : feutre vert de jocly (reversi-xd-view.js, mediane de la vue 2D)
REVERSI = ('reversi', 'reversi4', 'reversi6', 'reversi10', 'reversicross',
           'reversicross10', 'reversiturnover')
# Tafl : nom court -> nom du jeu jocly
TAFL = {'tablut': 'tafl-tablut', 'ardri': 'tafl-ardri', 'hnefatafl': 'tafl-hnefatafl',
        'tawlbwrdd': 'tawlbwrdd', 'brandubh': 'tafl-brandubh',
        'alea-evangelii': 'alea-evangelii'}


def nom(c, r):
    return f'{lettres(c)}{r + 1}'


def preset_jocly(jeu):
    """Reglages d'un tablier Reversi ou Tafl lus dans jocly ; {} sinon."""
    if jeu in REVERSI:
        o = jocly_options('reversi')[jeu]
        n, l = o['width'], o['height']
        # deadCells « r:c » ; les formes (croix, octogone) sont symetriques
        mortes = [nom(int(k.split(':')[1]), int(k.split(':')[0]))
                  for k in o.get('deadCells', {})]
        points = '2:2,2:6,6:2,6:6' if (n, l) == (8, 8) else ''   # les 4 points de l'othello
        return {'lignes': l, 'colonnes': n, 'uni': '#217822', 'trait': '#0E3B0F',
                'mortes': ','.join(mortes), 'points': points, 'rang1': 'haut'}
    if jeu in TAFL:
        o = jocly_options('tafl')[TAFL[jeu]]
        t = 2 * o['centerDistance'] + 1
        def case(pos):
            return nom(pos % t, pos // t)
        ini = o['initial']
        departs = ini['attackers'] + ini['defenders']['soldiers']
        return {'lignes': t, 'colonnes': t, 'uni': BOIS, 'trait': ENCRE,
                # coins exclus : hors jeu dans jocly ; trone : la case du roi
                'mortes': ','.join(case(p) for p in o['exclude']),
                'speciales': case(ini['defenders']['king']),
                'departs': ','.join(case(p) for p in departs)}
    return {}


def options():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--jeu', choices=sorted(list(JEUX) + list(REVERSI) + list(TAFL)),
                    help='tablier d\'un jeu de jocly (couleurs, dimensions, marques)')
    ap.add_argument('--lignes', type=int, help='nombre de rangees (defaut 8)')
    ap.add_argument('--colonnes', type=int, help='nombre de colonnes (defaut 8)')
    ap.add_argument('--clair', help='couleur des cases claires (#rrggbb)')
    ap.add_argument('--fonce', help='couleur des cases foncees (#rrggbb)')
    ap.add_argument('--uni', metavar='COULEUR',
                    help='cases unies de cette couleur, quadrillees (Reversi, Tafl)')
    ap.add_argument('--trait', help='couleur du cadre, du quadrillage et des marques '
                    '(defaut : la couleur foncee assombrie)')
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--anneau', dest='anneau', action='store_true', default=None,
                   help='tracer la demarcation d\'un anneau de bord')
    g.add_argument('--sans-anneau', dest='anneau', action='store_false')
    ap.add_argument('--anneau-largeur', type=int, default=1,
                    help='epaisseur de l\'anneau, en cases (defaut 1)')
    ap.add_argument('--mortes', metavar='CASES', help='cases hors jeu, ex. a1,a2,b1')
    ap.add_argument('--speciales', metavar='CASES',
                    help='cases marquees d\'une croix (trone du tafl...)')
    ap.add_argument('--departs', metavar='CASES',
                    help='cases de depart, legerement teintees (tafl)')
    ap.add_argument('--sans-departs', action='store_true',
                    help='ne pas teinter les cases de depart donnees par --jeu')
    ap.add_argument('--points', metavar='C:L,...',
                    help='points aux intersections, comptees depuis le coin en bas '
                    'a gauche (othello : 2:2,2:6,6:2,6:6)')
    g = ap.add_mutually_exclusive_group()
    g.add_argument('--notation', dest='notation', action='store_true', default=True,
                   help='reperes a-z / 1-N dans les cases de bord (defaut)')
    g.add_argument('--sans-notation', dest='notation', action='store_false')
    ap.add_argument('--rang1', choices=('bas', 'haut'),
                    help='ou est la rangee 1 (defaut bas ; haut pour le reversi, '
                    'comme dans jocly)')
    ap.add_argument('--coin', choices=('fonce', 'clair'), default='fonce',
                    help='couleur de la case a1, en bas a gauche (damiers)')
    ap.add_argument('--cadre', type=float, help='largeur du cadre en mm '
                    '(defaut 12 %% de la case ; 0 pour aucun)')
    options_sortie(ap)
    a = ap.parse_args()

    # --jeu fournit des valeurs par defaut, les options explicites l'emportent
    j = dict(JEUX.get(a.jeu, {}))
    j.update(preset_jocly(a.jeu))
    for k in ('lignes', 'colonnes', 'uni', 'mortes', 'speciales', 'departs',
              'points', 'rang1'):
        if getattr(a, k) is None:
            setattr(a, k, j.get(k))
    if a.sans_departs:
        a.departs = None
    a.lignes = a.lignes or 8
    a.colonnes = a.colonnes or 8
    a.rang1 = a.rang1 or 'bas'
    a.clair = couleur(a.clair or j.get('clair', '#F1D9B3'))
    a.fonce = couleur(a.fonce or j.get('fonce', '#C7885D'))
    if a.uni:
        a.uni = couleur(a.uni)
    a.trait = couleur(a.trait or j.get('trait') or assombrit(a.uni or a.fonce))
    if a.anneau is None:
        a.anneau = j.get('anneau', False)
    if a.lignes < 1 or a.colonnes < 1:
        sys.exit('il faut au moins une ligne et une colonne')
    k = a.anneau_largeur
    if a.anneau and (k < 1 or 2 * k >= min(a.lignes, a.colonnes)):
        sys.exit(f'--anneau-largeur {k} : il ne resterait aucune case interieure')
    a.mortes, a.speciales, a.departs = (lit_cases(x, a) for x in (a.mortes, a.speciales,
                                                                     a.departs))
    a.points = lit_points(a.points, a)

    cadre_fixe = a.cadre

    def dims(c):
        f = cadre_fixe if cadre_fixe is not None else c * 0.12
        return a.colonnes * c + 2 * f, a.lignes * c + 2 * f
    a.case = ajuste(a.case, dims, a.taille_max)
    if a.cadre is None:
        a.cadre = round(a.case * 0.12, 1)
    if not a.out:
        a.out = f'{a.jeu or "tablier"}-{a.lignes}x{a.colonnes}.svg'
    return a


def lit_cases(texte, a):
    """« a1,b2 » -> {(colonne, rangee)} comptees depuis 0."""
    cases = set()
    for t in (texte or '').replace(' ', '').split(','):
        if not t:
            continue
        m = re.fullmatch(r'([a-z]+)(\d+)', t)
        if not m:
            sys.exit(f'case invalide : {t} (attendu par exemple c3)')
        c = 0
        for ch in m.group(1):
            c = c * 26 + ord(ch) - 96
        c, r = c - 1, int(m.group(2)) - 1
        if not (0 <= c < a.colonnes and 0 <= r < a.lignes):
            sys.exit(f'case {t} hors du tablier {a.colonnes}x{a.lignes}')
        cases.add((c, r))
    return cases


def lit_points(texte, a):
    pts = []
    for t in (texte or '').replace(' ', '').split(','):
        if t:
            m = re.fullmatch(r'(\d+):(\d+)', t)
            if not m:
                sys.exit(f'point invalide : {t} (attendu C:L, par exemple 2:2)')
            c, l = int(m.group(1)), int(m.group(2))
            if not (0 <= c <= a.colonnes and 0 <= l <= a.lignes):
                sys.exit(f'point {t} hors du tablier (intersections 0:0 a '
                         f'{a.colonnes}:{a.lignes})')
            pts.append((c, l))
    return pts


def dessine(a):
    C, L, N, F = a.case, a.lignes, a.colonnes, a.cadre
    largeur, hauteur = N * C + 2 * F, L * C + 2 * F
    svg = Svg(largeur, hauteur, f'Tablier {L}x{N}, cases de {mm(C)} mm')
    svg.rect(0, 0, largeur, hauteur, a.trait)
    pair = a.fonce if a.coin == 'fonce' else a.clair      # couleur de a1
    impair = a.clair if pair == a.fonce else a.fonce

    def y_rangee(r):                    # haut de la case de la rangee r
        return F + ((L - 1 - r) if a.rang1 == 'bas' else r) * C

    def teinte(c, r):
        if (c, r) in a.mortes:
            return a.trait
        if a.uni:
            if (c, r) in a.speciales:
                return assombrit(a.uni, 0.72)
            if (c, r) in a.departs:
                return assombrit(a.uni, 0.88)
            return a.uni
        return pair if (r + c) % 2 == 0 else impair

    for r in range(L):
        for c in range(N):
            svg.rect(F + c * C, y_rangee(r), C, C, teinte(c, r))

    if a.uni:
        # quadrillage, puis croix des cases marquees et des cases mortes
        fin = round(C * 0.025, 2)
        for c in range(1, N):
            svg.ligne(F + c * C, F, F + c * C, F + L * C, a.trait, fin, cap='butt')
        for r in range(1, L):
            svg.ligne(F, F + r * C, F + N * C, F + r * C, a.trait, fin, cap='butt')
        for (c, r) in a.speciales:
            x, y, e = F + c * C, y_rangee(r), C * 0.18
            svg.ligne(x + e, y + e, x + C - e, y + C - e, a.trait, fin * 1.4)
            svg.ligne(x + C - e, y + e, x + e, y + C - e, a.trait, fin * 1.4)
        for (c, r) in a.mortes:
            x, y, e = F + c * C, y_rangee(r), C * 0.22
            clair = a.uni
            svg.ligne(x + e, y + e, x + C - e, y + C - e, clair, fin)
            svg.ligne(x + C - e, y + e, x + e, y + C - e, clair, fin)
        for (c, l) in a.points:
            ly = F + ((L - l) if a.rang1 == 'bas' else l) * C
            svg.cercle(F + c * C, ly, C * 0.07, fill=a.trait)

    if a.anneau:
        # contour des cases interieures, centre sur la limite : discret
        k = a.anneau_largeur
        svg.rect(F + k * C, F + k * C, (N - 2 * k) * C, (L - 2 * k) * C,
                 stroke=a.trait, sw=round(C * 0.03, 2))

    if a.notation:
        # chiffres en haut a droite de la colonne a, lettres en bas a droite de
        # la rangee du bas ; le repere prend, du clair ou du trait, celui qui
        # se lit le mieux sur sa case
        taille, retrait = C * 0.17, C * 0.07

        def contraste(fond):
            return plus_lisible(fond, a.trait, a.clair if not a.uni else '#FFFFFF')

        for r in range(L):
            if (0, r) not in a.mortes:
                svg.texte(F + C - retrait, y_rangee(r) + retrait + taille * 0.78,
                          r + 1, taille, contraste(teinte(0, r)))
        r_bas = 0 if a.rang1 == 'bas' else L - 1
        for c in range(N):
            if (c, r_bas) not in a.mortes:
                svg.texte(F + (c + 1) * C - retrait, F + L * C - retrait,
                          lettres(c), taille, contraste(teinte(c, r_bas)))
    return svg, largeur, hauteur


def main():
    a = options()
    svg, largeur, hauteur = dessine(a)
    ecrit(a, svg, largeur, hauteur, f'{a.lignes}x{a.colonnes} cases de {mm(a.case)} mm'
          + (', anneau' if a.anneau else '') + (', cases unies' if a.uni else ''))


if __name__ == '__main__':
    main()
