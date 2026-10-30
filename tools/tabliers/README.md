# tools/tabliers — tapis de jeu à imprimer

Générateurs de tabliers en **SVG à la taille réelle** (unité : le millimètre),
avec export PDF (police intégrée) et PNG. L'export passe par Playwright
(`pip install playwright && playwright install chromium`), ou par cairosvg
à défaut.

| Fichier | Tabliers |
|---|---|
| `tablier-grille.py` | cases carrées : échecs et variantes, Rococo, Rocaille, dames, shogi… |
| `tablier-hex.py` | hexagonaux : Glinski, McCooey, Shafran, Brusky, Devasa, hexagone générique |
| `tablier-cercle.py` | circulaires : échecs byzantins, échecs circulaires modernes, anneaux quelconques |
| `tablier-lignes.py` | intersections : go 9/13/19, échecs chinois (xiangqi) et coréens (janggi) |
| `tablier_commun.py` | SVG en mm, couleurs jocly, contraste des repères, taille maxi, export PDF/PNG |

## Règles communes

- **cases de 4 cm** par défaut (pièces t4) ; `--case 50` pour les pièces t5 ;
- **70 cm au plus** (`--taille-max 700`, la largeur des laizes courantes
  d'impression textile) : au-delà, la case est réduite pour tenir, et le
  script le signale ;
- `--notation` / `--sans-notation`, `--out`, `--pdf [FICHIER]`, `--png PIXELS`
  partout ;
- couleurs : celles des tabliers 2D de jocly ; les repères prennent, entre
  deux teintes, celle qui contraste le plus avec la case (rapport WCAG).

## tablier-grille.py — cases carrées

```
python3 tablier-grille.py --jeu rococo --pdf                 # 10x10 + anneau
python3 tablier-grille.py --jeu rocaille --png 4096          # 10x12 + anneau
python3 tablier-grille.py --jeu echecs --case 50             # 8x8, pièces t5
python3 tablier-grille.py --lignes 9 --colonnes 9            # shogi
python3 tablier-grille.py --lignes 10 --colonnes 10 \
    --clair '#F1D9B3' --fonce '#C7885D' --anneau --sans-notation
```

| Option | Effet | Défaut |
|---|---|---|
| `--lignes`, `--colonnes` | dimensions | 8 × 8 (ou celles de `--jeu`) |
| `--clair`, `--fonce` | couleurs des cases | couleurs 2D des échecs jocly |
| `--trait` | cadre et démarcation de l'anneau | la couleur foncée assombrie |
| `--anneau` / `--sans-anneau`, `--anneau-largeur K` | démarcation discrète d'un anneau de bord de K cases | sans |
| `--coin fonce\|clair` | couleur de a1 | foncé |
| `--cadre MM` | largeur du cadre, 0 pour aucun | 12 % de la case |
| `--jeu` | `echecs`, `rococo`, `rocaille` | — |

Le damier est continu, anneau compris : seul un trait fin sépare l'anneau,
le tapis sert donc à tout jeu de mêmes dimensions. Le shogi se joue sur un
échiquier classique : rien de particulier à prévoir.

## tablier-hex.py — hexagonaux

```
python3 tablier-hex.py --jeu glinski --pdf
python3 tablier-hex.py --jeu mccooey --palette modele --sans-notation
python3 tablier-hex.py --jeu devasa
python3 tablier-hex.py --rayon 6 --couleurs '#eee,#bbb,#888'
```

La forme du plateau, la couleur de chaque case et les noms des cases sont
**lus dans le modèle jocly** (`src/games/chessbase/hex/<jeu>-model.js` :
`boardLayout` et `posNames`) : le tapis est le plateau du jeu, sans recopie.
L'orientation s'en déduit : colonnes verticales et hexagones à plat pour
Glinski, McCooey et Shafran, rangées horizontales et hexagones en pointe pour
Brusky et Devasa. `--case` est la largeur d'un hexagone entre côtés opposés.
Palettes : `jocly` (vue 2D) ou `modele` (sable, gris, marine, comme
`echiquierhexagonal-42_50.pdf`) ; `--couleurs` pour une autre. Repères : la
lettre dans la case la plus basse de chaque colonne, le chiffre dans la case
la plus à gauche de chaque rangée.

Glinski et McCooey : 42 × 47 cm en cases de 4 cm.

## tablier-cercle.py — circulaires

```
python3 tablier-cercle.py --pdf                              # byzantin / circulaire moderne
python3 tablier-cercle.py --anneaux 6 --secteurs 24 --moyeu 60 --case 30 \
    --clair '#DDB07A' --fonce '#062440' --moyeu-couleur '#747474'   # le modèle 50x50
```

Par défaut, le plateau des échecs byzantins et circulaires de jocly :
4 anneaux × 16 secteurs (`cbBoardGeometryCylinder(16,4)`), moyeu de 4 cases
de diamètre (`CENTER` de `circular-board-view.js`), rangée 1 à l'extérieur,
colonne a juste sous l'horizontale droite, colonnes dans le sens horaire,
comme à l'écran : 50 cm de diamètre en anneaux de 4 cm. `--case` est la
profondeur d'un anneau, `--moyeu` le rayon du moyeu. Les **diagonales**
(courbes d'un coin à l'autre de chaque case, comme sur le modèle) aident à
lire les déplacements en diagonale ; `--sans-diagonales` les retire.

## tablier-lignes.py — intersections

```
python3 tablier-lignes.py --jeu go19 --pdf
python3 tablier-lignes.py --jeu xiangqi --pdf
python3 tablier-lignes.py --jeu janggi
python3 tablier-lignes.py --colonnes 7 --lignes 7 --pas 40
```

- **go** 9, 13, 19 : pas de 22 × 23,7 mm (pierres de 22 mm ; un goban est un
  peu plus haut que large pour paraître carré au joueur assis), hoshi,
  repères A–T sans I ; go19 : 44 × 47 cm ;
- **xiangqi** : 9 × 10 lignes au pas de 4 cm, rivière (verticales
  interrompues sauf aux bords) avec 楚河 漢界 (police CJK, Noto CJK par
  exemple ; `--sans-riviere-texte` sinon), palais, « fleurs » aux places des
  canons et des soldats, double cadre ; 40 × 44 cm ;
- **janggi** : 9 × 10 lignes continues, palais ; 40 × 44 cm.

Fond : le bois des tabliers jocly (`wood2.jpg`, médiane `#ba7f4e`)
éclairci en `#D9AE78`, pour que les lignes restent lisibles une fois
imprimées ; lignes `#2b1d0e`, la couleur du go de jocly.

## Ce qui reste possible

| Tabliers | Ce qu'il manque | Effort |
|---|---|---|
| Reversi, Tafl | cases unies quadrillées et points (reversi), trône et refuges marqués (tafl) dans `tablier-grille.py` | ~1/2 journée |
| Rollerball (7x7 percé d'un 3x3) | `--trou` dans `tablier-grille.py` | 1 h |
| Alquerque, moulins, jeux de chasse (Renard et oies, Coyote…) | `tablier-lignes.py` avec un graphe de points et de segments, extrait des modèles jocly (`hunt/`, `mills/`) | ~1/2 journée |
| Plateaux 3D ou superposés (Cubic, Multiplan, Margo) | hors de portée d'un tapis plat ; Space Spartan : 3 grilles 6x8 côte à côte avec `tablier-grille.py` | — |
