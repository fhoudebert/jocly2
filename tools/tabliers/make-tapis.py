#!/usr/bin/env python3
"""Tablier Rococo 10x10 a imprimer sur tapis (SVG en millimetres).

Damier continu sur les 100 cases : l'anneau de bord garde les couleurs du
damier, le tapis sert donc a n'importe quel jeu en 10x10. Seul un trait
discret separe l'anneau des 8x8 cases centrales. Couleurs de Rococo dans
jocly (rococo-view.js) : clair #DDDDD0, fonce #559933, anneau #2f5320.

    python3 make-tapis.py --case 50 --out rococo-tapis-t5.svg   # cases de 5 cm
    python3 make-tapis.py --case 40 --out rococo-tapis-t4.svg   # cases de 4 cm
"""
import argparse

ap = argparse.ArgumentParser(description=__doc__,
                             formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('--case', type=float, default=50, help='cote d\'une case, mm (defaut 50)')
ap.add_argument('--n', type=int, default=10, help='cases par cote (defaut 10)')
ap.add_argument('--clair', default='#DDDDD0')
ap.add_argument('--fonce', default='#559933')
ap.add_argument('--trait', default='#2f5320', help='cadre et demarcation de l\'anneau')
ap.add_argument('--out', default='rococo-tapis.svg')
a = ap.parse_args()

C, N = a.case, a.n
cadre = round(C * 0.12, 1)          # cadre exterieur (6 mm pour des cases de 5 cm)
ligne = round(C * 0.03, 2)          # demarcation de l'anneau, discrete (1,5 mm)
cote = N * C + 2 * cadre
police = C * 0.17                   # reperes : ~8,5 mm pour des cases de 5 cm
retrait = C * 0.07

out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{cote:g}mm" height="{cote:g}mm" '
       f'viewBox="0 0 {cote:g} {cote:g}">',
       f'<title>Rococo 10x10 - tapis, cases de {C:g} mm</title>',
       f'<rect width="{cote:g}" height="{cote:g}" fill="{a.trait}"/>']
# damier : a1 (en bas a gauche) est une case foncee, comme aux echecs
for r in range(N):                  # r = 0 : rangee 1, en bas
    for c in range(N):
        x, y = cadre + c * C, cadre + (N - 1 - r) * C
        coul = a.fonce if (r + c) % 2 == 0 else a.clair
        out.append(f'<rect x="{x:g}" y="{y:g}" width="{C:g}" height="{C:g}" fill="{coul}"/>')
# demarcation : le contour des 8x8 cases centrales, centre sur la limite
out.append(f'<rect x="{cadre + C:g}" y="{cadre + C:g}" width="{(N - 2) * C:g}" '
           f'height="{(N - 2) * C:g}" fill="none" stroke="{a.trait}" stroke-width="{ligne:g}"/>')
# reperes dans les cases de bord, comme le modele : chiffres en haut a droite de
# la colonne a, lettres en bas a droite de la rangee 1 ; teinte opposee a la case
style = (f'font-family:\'DejaVu Serif\',Georgia,serif;font-weight:bold;'
         f'font-size:{police:.2f}px')
for r in range(N):
    fond = a.fonce if r % 2 == 0 else a.clair
    teinte = a.clair if fond == a.fonce else a.trait
    x, y = cadre + C - retrait, cadre + (N - 1 - r) * C + retrait + police * 0.78
    out.append(f'<text x="{x:.2f}" y="{y:.2f}" text-anchor="end" fill="{teinte}" '
               f'style="{style}">{r + 1}</text>')
for c in range(N):
    fond = a.fonce if c % 2 == 0 else a.clair
    teinte = a.clair if fond == a.fonce else a.trait
    x, y = cadre + (c + 1) * C - retrait, cadre + N * C - retrait
    out.append(f'<text x="{x:.2f}" y="{y:.2f}" text-anchor="end" fill="{teinte}" '
               f'style="{style}">{"abcdefghijklmnopqrstuvwxyz"[c]}</text>')
out.append('</svg>')
open(a.out, 'w').write('\n'.join(out) + '\n')
print(f'{a.out} : {cote:g} x {cote:g} mm, cases de {C:g} mm')
