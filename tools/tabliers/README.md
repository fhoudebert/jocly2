# tools/tabliers — tapis de jeu à imprimer

Générateurs de tabliers en **SVG à la taille réelle** (unité : le millimètre),
avec export PDF (police intégrée) et PNG. L'export passe par Playwright
(`pip install playwright && playwright install chromium`), ou par cairosvg
à défaut.

| Fichier | Rôle |
|---|---|
| `tablier-grille.py` | tabliers à cases carrées : échecs, Rococo, Rocaille, dames… |
| `tablier_commun.py` | SVG en mm, couleurs des jeux jocly (`JEUX`), contraste des repères, export PDF/PNG |

## tablier-grille.py

```
python3 tablier-grille.py --jeu rococo --pdf                 # 10x10 + anneau, cases de 5 cm
python3 tablier-grille.py --jeu rococo --case 40 --pdf       # même tapis, cases de 4 cm
python3 tablier-grille.py --jeu rocaille --png 4096          # 10x12 + anneau
python3 tablier-grille.py --jeu echecs --sans-notation       # 8x8 aux couleurs 2D de jocly
python3 tablier-grille.py --lignes 10 --colonnes 10 \
    --clair '#F1D9B3' --fonce '#C7885D' --anneau --pdf       # tout à la main
```

| Option | Effet | Défaut |
|---|---|---|
| `--lignes`, `--colonnes` | dimensions | 8 × 8 (ou celles de `--jeu`) |
| `--clair`, `--fonce` | couleurs des cases | couleurs 2D des échecs jocly |
| `--trait` | cadre et démarcation de l'anneau | la couleur foncée assombrie |
| `--anneau` / `--sans-anneau` | démarcation discrète d'un anneau de bord | sans (ou selon `--jeu`) |
| `--anneau-largeur K` | anneau de K cases d'épaisseur | 1 |
| `--notation` / `--sans-notation` | repères a… / 1… dans les cases de bord | avec |
| `--coin fonce\|clair` | couleur de a1 (en bas à gauche) | foncé |
| `--case MM` | côté d'une case | 50 (pièces t5) ; 40 pour t4 |
| `--cadre MM` | largeur du cadre, 0 pour aucun | 12 % de la case |
| `--jeu` | `echecs`, `rococo`, `rocaille` : couleurs (et dimensions) | — |
| `--out`, `--pdf [F]`, `--png PX` | sorties | `<jeu>-<L>x<C>.svg` |

Choix communs à tous les tapis :

- **le damier est continu, anneau compris** : seul un trait fin (3 % de la
  case) sépare l'anneau, donc le tapis sert aussi à tout autre jeu de mêmes
  dimensions ;
- les repères suivent le modèle Rocaille (chiffres en haut à droite de la
  colonne a, lettres en bas à droite de la rangée 1) ; leur couleur est, du
  clair ou du trait, **celle qui contraste le plus** avec la case (rapport
  WCAG) : sur l'argile de Rocaille le clair se lisait mal ;
- couleurs : celles des tabliers 2D de jocly ; les tons moyens et non
  saturés s'impriment bien sur tissu et vieillissent mieux qu'un blanc pur.

`--jeu rococo` reproduit au pixel près l'ancien `make-tapis.py`, qu'il
remplace.

## Les autres tabliers — analyse

Jocly décrit chaque tablier dans un modèle (géométrie) et une vue (dessin 2D
sur canvas). Les deux sont réutilisables, à des degrés divers.

### 1. Variantes de la grille — extensions de `tablier-grille.py` (peu de travail)

| Tabliers | Ce qu'il manque | Effort |
|---|---|---|
| Dames 8x8 / 10x10, échecs de toutes tailles, Cylindre (grille 16x4 vue à plat) | rien : `--lignes/--colonnes/--coin` suffisent | fait |
| Shogi (et variantes jusqu'à 16x16 : chu, tenjiku…), Makruk, Reversi, Tafl | **cases unies** quadrillées (`--uni COULEUR`), **points** aux intersections (`--points 3,6` : hoshi du shogi, 4 points du reversi), case centrale / coins marqués (tafl : trône et refuges) | ~1/2 journée |
| Rollerball (7x7 percé d'un 3x3) et autres plateaux troués | `--trou` : cases non jouables laissées en couleur de cadre | 1 h |
| Courier (12x8), Grant Acedrex (12x12), Capablanca (10x8)… | rien | fait |

Le **format physique** devient la contrainte : 16x16 en cases de 5 cm donne
81 cm. Une option `--largeur-max MM` qui calcule la case la plus grande
possible serait utile pour Tenjiku, Terachess, Bigorra.

### 2. Intersections — nouveau script `tablier-lignes.py` (moyen)

On joue **sur les points**, pas dans les cases : Go (9, 13, 19), Xiangqi
(rivière, palais en diagonales), Janggi (palais), Alquerque, Moulins, jeux de
chasse (Renard et oies, Coyote, Aadu Puli Attam…). Un même moteur suffit :
une liste de **points** et de **segments**, plus des décorations (hoshi,
texte de la rivière). Go et Xiangqi se décrivent en quelques lignes. Pour les
jeux de chasse et les moulins, les graphes existent déjà dans les modèles
jocly (`hunt/*-model.js`, `mills/`) : les extraire avec Node, comme les
harnais de `tests/` chargent les modèles, plutôt que de les recopier.
Effort : ~1 journée, dont la moitié pour l'extraction des graphes.

### 3. Hexagonaux — `tablier-hex.py` (moyen)

Glinski, McCooey, Shafran, Brusky, Devasa (`chessbase/hex/`). Trois
couleurs par tablier (`cbHexBoardClassic2D` : `#FFCE9E`, `#D18B47`,
`#E8AB6F`) ; la forme du plateau (hexagone de 91 cases, rectangles d'hexagones
de Brusky et Devasa, forme irrégulière de Shafran) est déjà décrite par le
`boardLayout` que chaque modèle passe à `cbBoardGeometryHex`. Le script la
lirait dans le modèle, puis placerait les hexagones (pointe en haut ou à
plat), coloriés selon `(q - r) mod 3`. Repères : les noms de cases que donne le
modèle (`posNames`), pour rester d'accord avec la notation du jeu. Taille donnée par le **diamètre entre plats** de
l'hexagone (≈ 5 cm pour t5). Effort : ~1 journée.

### 4. Circulaires — `tablier-cercle.py` (moyen)

Échecs byzantins (`cbBoardGeometryCylinder(16,4)` : 4 anneaux × 16
secteurs), échecs circulaires (`circular/`). Secteurs d'anneau en arcs SVG,
damier sur (anneau + secteur), citadelles éventuelles, repères sur le
pourtour. La difficulté est physique : les cases intérieures sont bien plus
petites que les extérieures, il faut fixer la **case intérieure** à la taille
du socle des pièces (≥ 4 cm pour t4), ce qui donne un tapis d'environ 70 cm
de diamètre. Effort : ~1/2 journée.

### 5. Hors de portée d'un tapis plat

- Plateaux **3D ou superposés** (Cubic, Space Spartan, Multiplan, Margo) :
  on peut imprimer chaque plateau à plat côte à côte (Space Spartan :
  3 grilles 6x8 avec `tablier-grille.py`), mais les liaisons entre niveaux ne
  se dessinent pas — c'est un support, pas le jeu.
- **Smess** (flèches imposées par case) : faisable comme une grille avec un
  pictogramme par case, à condition d'extraire la table des directions du
  modèle (`smess-geo-model.js`).

### Ordre suggéré

1. extensions de la grille (cases unies, points, trous, `--largeur-max`) :
   couvre Shogi, Reversi, Tafl, Rollerball pour peu de code ;
2. `tablier-lignes.py` : Go et Xiangqi à la main, puis graphes extraits ;
3. `tablier-hex.py` ;
4. `tablier-cercle.py`.
