"""Outils communs aux generateurs de tabliers (tapis a imprimer).

Les tabliers sont dessines en SVG avec le millimetre pour unite : le fichier
a directement la taille reelle, et reste net a n'importe quelle echelle.
L'export PDF (taille reelle, police integree) et PNG passe par un Chromium
sans fenetre (Playwright) ; a defaut, par cairosvg.

    pip install playwright && playwright install chromium
"""
import os
import re
import sys

# Couleurs 2D des tabliers de jocly, pour --jeu. clair / fonce / trait (cadre,
# demarcation de l'anneau). Sources : chessbase/grid-board-view.js
# (cbGridBoardClassic2D), ultima/rococo-view.js, ultima/rocaille-view.js.
JEUX = {
    'echecs': {'clair': '#F1D9B3', 'fonce': '#C7885D', 'trait': '#6B4226'},
    'rococo': {'clair': '#DDDDD0', 'fonce': '#559933', 'trait': '#2f5320',
               'lignes': 10, 'colonnes': 10, 'anneau': True},
    'rocaille': {'clair': '#FECA66', 'fonce': '#C89264', 'trait': '#6E5037',
                 'lignes': 10, 'colonnes': 12, 'anneau': True},
}

POLICE = "'DejaVu Serif',Georgia,serif"
POLICE_CJK = "'Noto Serif CJK SC','Noto Serif CJK TC','Noto Sans CJK SC',serif"

# Valeurs par defaut communes : cases de 4 cm (pieces t4) et tapis de 70 cm au
# plus, la largeur des laizes courantes d'impression textile.
CASE = 40
TAILLE_MAX = 700

# Bois des tabliers « a lignes » de jocly (res/xiangqi/wood2.jpg, mediane
# #ba7f4e), eclairci pour que les lignes restent lisibles une fois imprimees ;
# lignes : la couleur du Go de jocly (go-xd-view.js).
BOIS = '#D9AE78'
ENCRE = '#2b1d0e'


def ajuste(case, dimensions, maxi, nom='la case'):
    """Plus grande taille de case <= `case` dont le tapis tient dans `maxi` mm.

    `dimensions(case)` rend (largeur, hauteur) ; elles sont affines en la case
    (cadre et marges en proportion, ou fixes), on resout donc exactement."""
    l1, h1 = dimensions(case)
    if max(l1, h1) <= maxi + 1e-6:
        return case
    l2, h2 = dimensions(case / 2)
    pentes = [(l1 - l2) / (case / 2), (h1 - h2) / (case / 2)]
    fixes = [l1 - pentes[0] * case, h1 - pentes[1] * case]
    nouveau = min((maxi - f) / p for f, p in zip(fixes, pentes) if p > 0)
    nouveau = int(nouveau * 10) / 10            # au dixieme de mm, vers le bas
    if nouveau <= 0:
        sys.exit(f'impossible de tenir dans {maxi:g} mm')
    print(f'  {nom} passe de {case:g} a {nouveau:g} mm pour tenir dans {maxi:g} mm '
          f'(--taille-max)')
    return nouveau


def couleur(c):
    """#rgb, #rrggbb ou nom CSS simple -> chaine acceptee par SVG ; sort sinon."""
    if re.fullmatch(r'#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})', c) or re.fullmatch(r'[a-zA-Z]+', c):
        return c
    sys.exit(f'couleur invalide : {c} (attendu #rrggbb)')


def assombrit(c, k=0.55):
    """#rrggbb multiplie par k : un trait assorti a la couleur foncee."""
    c = c.lstrip('#')
    if len(c) == 3:
        c = ''.join(x * 2 for x in c)
    r, g, b = (int(c[i:i + 2], 16) for i in (0, 2, 4))
    return '#%02x%02x%02x' % tuple(round(v * k) for v in (r, g, b))


def luminance(c):
    """Luminance relative WCAG d'une couleur #rgb / #rrggbb."""
    c = c.lstrip('#')
    if len(c) == 3:
        c = ''.join(x * 2 for x in c)
    def lin(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(int(c[i:i + 2], 16)) for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def plus_lisible(fond, *candidates):
    """La candidate de plus fort contraste (rapport WCAG) avec le fond."""
    lf = luminance(fond)
    def rapport(c):
        a, b = sorted((lf, luminance(c)))
        return (b + 0.05) / (a + 0.05)
    return max(candidates, key=rapport)


def mm(v):
    """Nombre court pour le SVG (pas de 512.0 ni de 12.000000001)."""
    return f'{round(v, 3):g}'


class Svg:
    def __init__(self, largeur, hauteur, titre):
        self.l, self.h = largeur, hauteur
        self.parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{mm(largeur)}mm" '
                      f'height="{mm(hauteur)}mm" viewBox="0 0 {mm(largeur)} {mm(hauteur)}">',
                      f'<title>{titre}</title>']

    def rect(self, x, y, w, h, fill='none', stroke=None, sw=None):
        s = f' stroke="{stroke}" stroke-width="{mm(sw)}"' if stroke else ''
        self.parts.append(f'<rect x="{mm(x)}" y="{mm(y)}" width="{mm(w)}" '
                          f'height="{mm(h)}" fill="{fill}"{s}/>')

    def texte(self, x, y, t, taille, fill, ancre='end', police=POLICE, gras=True,
              base=None):
        b = f' dominant-baseline="{base}"' if base else ''
        g = 'font-weight:bold;' if gras else ''
        self.parts.append(f'<text x="{mm(x)}" y="{mm(y)}" text-anchor="{ancre}"{b} '
                          f'fill="{fill}" style="font-family:{police};{g}'
                          f'font-size:{mm(taille)}px">{t}</text>')

    def ligne(self, x1, y1, x2, y2, stroke, sw, cap='round'):
        self.parts.append(f'<line x1="{mm(x1)}" y1="{mm(y1)}" x2="{mm(x2)}" y2="{mm(y2)}" '
                          f'stroke="{stroke}" stroke-width="{mm(sw)}" stroke-linecap="{cap}"/>')

    def chemin(self, d, fill='none', stroke=None, sw=None, extra=''):
        s = f' stroke="{stroke}" stroke-width="{mm(sw)}"' if stroke else ''
        self.parts.append(f'<path d="{d}" fill="{fill}"{s}{extra}/>')

    def cercle(self, cx, cy, r, fill='none', stroke=None, sw=None):
        s = f' stroke="{stroke}" stroke-width="{mm(sw)}"' if stroke else ''
        self.parts.append(f'<circle cx="{mm(cx)}" cy="{mm(cy)}" r="{mm(r)}" fill="{fill}"{s}/>')

    def brut(self, s):
        self.parts.append(s)

    def __str__(self):
        return '\n'.join(self.parts + ['</svg>']) + '\n'


def options_sortie(ap, case=CASE):
    """Options communes : taille de case, taille maxi, sorties."""
    ap.add_argument('--case', type=float, default=case,
                    help=f'taille d\'une case en mm (defaut {case:g} : pieces t4 ; 50 pour t5)')
    ap.add_argument('--taille-max', type=float, default=TAILLE_MAX, metavar='MM',
                    help=f'plus grand cote du tapis ; la case est reduite pour y tenir '
                    f'(defaut {TAILLE_MAX})')
    ap.add_argument('--out', help='fichier SVG a ecrire')
    ap.add_argument('--pdf', nargs='?', const=True, metavar='FICHIER',
                    help='ecrire aussi le PDF a la taille reelle (defaut : nom du SVG)')
    ap.add_argument('--png', type=int, metavar='PIXELS',
                    help='ecrire aussi un PNG de cette largeur')


def ecrit(a, svg, largeur, hauteur, resume):
    """Ecrit le SVG, annonce ses dimensions, exporte PDF/PNG si demande."""
    if a.pdf is True:
        a.pdf = os.path.splitext(a.out)[0] + '.pdf'
    with open(a.out, 'w', encoding='utf-8') as fh:
        fh.write(str(svg))
    print(f'{a.out} : {mm(largeur)} x {mm(hauteur)} mm, {resume}')
    exporte(a.out, largeur, hauteur, pdf=a.pdf, png=a.png)


def lettres(i):
    """0 -> a, 25 -> z, 26 -> aa : colonnes au-dela de 26."""
    s = ''
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(97 + r) + s
    return s


def exporte(svg_path, largeur_mm, hauteur_mm, pdf=None, png=None):
    """PDF a la taille reelle et/ou PNG de `png` pixels de large."""
    if not pdf and not png:
        return
    svg = open(svg_path, encoding='utf-8').read()
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sync_playwright = None
    if sync_playwright:
        with sync_playwright() as pw:
            nav = pw.chromium.launch()
            page = nav.new_page()
            if pdf:
                page.set_content(
                    f'<html><head><style>@page{{size:{mm(largeur_mm)}mm {mm(hauteur_mm)}mm;'
                    f'margin:0}}html,body{{margin:0}}svg{{display:block}}</style></head>'
                    f'<body>{svg}</body></html>')
                page.pdf(path=pdf, width=f'{mm(largeur_mm)}mm', height=f'{mm(hauteur_mm)}mm',
                         print_background=True, page_ranges='1')
                print(f'  {pdf}')
            if png:
                h = round(png * hauteur_mm / largeur_mm)
                pix = re.sub(r'width="[^"]+mm" height="[^"]+mm"',
                             f'width="{png}" height="{h}"', svg, count=1)
                page.set_viewport_size({'width': png, 'height': h})
                page.set_content(f'<html><body style="margin:0">{pix}</body></html>')
                page.screenshot(path=png_nom(svg_path, png))
                print(f'  {png_nom(svg_path, png)}')
            nav.close()
        return
    try:
        import cairosvg
    except ImportError:
        sys.exit('export PDF/PNG : installer playwright (pip install playwright && '
                 'playwright install chromium) ou cairosvg')
    if pdf:
        cairosvg.svg2pdf(url=svg_path, write_to=pdf)
        print(f'  {pdf}')
    if png:
        cairosvg.svg2png(url=svg_path, write_to=png_nom(svg_path, png), output_width=png)
        print(f'  {png_nom(svg_path, png)}')


def png_nom(svg_path, px):
    return os.path.splitext(svg_path)[0] + f'-{px}.png'
