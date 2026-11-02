# tools/tabliers — tapis de jeu à imprimer

Générateurs de tabliers en **SVG à la taille réelle** (unité : le millimètre),
avec export PDF (polices intégrées) et PNG. L'export passe par Playwright
(`pip install playwright && playwright install chromium`), ou par cairosvg
à défaut. Node lit les manifestes jocly des jeux Reversi et Tafl.

| Fichier | Tabliers |
|---|---|
| `tablier-grille.py` | cases carrées : échecs et variantes, dames, shogi, Rococo, Rocaille, **Reversi**, **Tafl** |
| `tablier-hex.py` | hexagonaux : Glinski, McCooey, Shafran, Brusky, Devasa |
| `tablier-cercle.py` | circulaires : échecs byzantins, échecs circulaires modernes |
| `tablier-lignes.py` | intersections : go, xiangqi, janggi, **Alquerque**, **moulins** |
| `tablier_commun.py` | SVG en mm, couleurs, contraste des repères, taille maxi, lecture de jocly, export |

## Jeux courants

Toutes les commandes se lancent depuis `tools/tabliers` ; ajouter `--pdf`
pour le fichier à envoyer à l'imprimeur, `--png 4096` pour un aperçu.

| Jeu | Commande | Tapis |
|---|---|---|
| Échecs | `python3 tablier-grille.py --jeu echecs --pdf` | 33 × 33 cm |
| Échecs, pièces t5 | `python3 tablier-grille.py --jeu echecs --case 50 --pdf` | 41 × 41 cm |
| Dames internationales (10x10) | `python3 tablier-grille.py --lignes 10 --colonnes 10 --pdf` | 41 × 41 cm |
| Dames 8x8 | `python3 tablier-grille.py --pdf` | 33 × 33 cm |
| Shogi | `python3 tablier-grille.py --lignes 9 --colonnes 9 --pdf` | 37 × 37 cm |
| Capablanca, Gothic (10x8) | `python3 tablier-grille.py --lignes 8 --colonnes 10 --pdf` | 41 × 33 cm |
| Grande Acedrex, Métamachie (12x12) | `python3 tablier-grille.py --lignes 12 --colonnes 12 --pdf` | 49 × 49 cm |
| Rococo | `python3 tablier-grille.py --jeu rococo --pdf` | 41 × 41 cm |
| Rocaille | `python3 tablier-grille.py --jeu rocaille --pdf` | 49 × 41 cm |
| Reversi / Othello | `python3 tablier-grille.py --jeu reversi --pdf` | 33 × 33 cm |
| Hnefatafl (11x11) | `python3 tablier-grille.py --jeu hnefatafl --pdf` | 45 × 45 cm |
| Tablut (9x9) | `python3 tablier-grille.py --jeu tablut --pdf` | 37 × 37 cm |
| Brandubh (7x7) | `python3 tablier-grille.py --jeu brandubh --pdf` | 29 × 29 cm |
| Échecs hexagonaux de Glinski | `python3 tablier-hex.py --jeu glinski --pdf` | 42 × 47 cm |
| Échecs hexagonaux de McCooey | `python3 tablier-hex.py --jeu mccooey --pdf` | 42 × 47 cm |
| Échecs byzantins / circulaires | `python3 tablier-cercle.py --pdf` | ⌀ 50 cm |
| Go 19x19 | `python3 tablier-lignes.py --jeu go19 --pdf` | 44 × 47 cm |
| Go 13x13 / 9x9 | `python3 tablier-lignes.py --jeu go13 --pdf` (`go9`) | 31 × 33 / 22 × 24 cm |
| Échecs chinois (xiangqi) | `python3 tablier-lignes.py --jeu xiangqi --pdf` | 40 × 44 cm |
| Échecs coréens (janggi) | `python3 tablier-lignes.py --jeu janggi --pdf` | 40 × 44 cm |
| Alquerque | `python3 tablier-lignes.py --jeu alquerque --pdf` | 24 × 24 cm |
| Jeu du moulin (9 pions) | `python3 tablier-lignes.py --jeu moulin9 --pdf` | 32 × 32 cm |
| Moulin à 6, 7 ou 12 pions | `python3 tablier-lignes.py --jeu moulin6 --pdf` (`moulin7`, `moulin12`) | 24 / 24 / 32 cm |

Autres jeux disponibles par `--jeu` : `reversi4`, `reversi6`, `reversi10`,
`reversicross`, `reversicross10`, `reversiturnover`, `ardri`, `tawlbwrdd`,
`alea-evangelii` (grille) ; `shafran`, `brusky`, `devasa` (hex).

## Règles communes

- **cases de 4 cm** par défaut (pièces t4) ; `--case 50` pour les pièces t5 ;
- **70 cm au plus** (`--taille-max 700`, la largeur des laizes courantes
  d'impression textile) : au-delà, la case est réduite pour tenir, et le
  script le signale (Alea Evangelii, 19x19 : cases de 3,6 cm) ;
- `--notation` / `--sans-notation`, `--out`, `--pdf [FICHIER]`, `--png PIXELS`
  partout ;
- couleurs : celles des tabliers 2D de jocly ; les repères prennent, entre
  deux teintes, celle qui contraste le plus avec la case (rapport WCAG).

## tablier-grille.py — cases carrées

| Option | Effet | Défaut |
|---|---|---|
| `--lignes`, `--colonnes` | dimensions | 8 × 8 (ou celles de `--jeu`) |
| `--clair`, `--fonce` | couleurs des cases (damier) | couleurs 2D des échecs jocly |
| `--uni COULEUR` | cases unies et quadrillées, au lieu du damier | — |
| `--trait` | cadre, quadrillage, marques, anneau | la couleur des cases assombrie |
| `--anneau`, `--anneau-largeur K` | démarcation discrète d'un anneau de bord | sans |
| `--mortes a1,b1…` | cases hors jeu (foncées, barrées) | — |
| `--speciales d4…` | cases marquées d'une croix (trône) | — |
| `--departs …`, `--sans-departs` | cases de départ légèrement teintées | — |
| `--points 2:2,2:6…` | points aux intersections, comptées depuis le coin bas gauche | — |
| `--coin fonce\|clair` | couleur de a1 (damiers) | foncé |
| `--rang1 bas\|haut` | côté de la rangée 1 | bas (haut pour le reversi, comme jocly) |
| `--cadre MM` | largeur du cadre, 0 pour aucun | 12 % de la case |

**Damiers.** Le damier est continu, anneau compris : seul un trait fin
sépare l'anneau, le tapis sert donc à tout jeu de mêmes dimensions. Le shogi
se joue sur un échiquier ordinaire.

**Reversi.** Lu dans `src/games/reversi/index.js` : dimensions et cases
mortes des variantes en croix et en octogone. Feutre vert de jocly
(`#217822`), les quatre points de l'othello sur le 8x8, rangée 1 en haut.

**Tafl.** Lu dans `src/games/tafl/index.js` : taille (`centerDistance`),
coins exclus (hors jeu dans jocly : Ard Rí, Hnefatafl, Tawlbwrdd, Brandubh,
Alea Evangelii ; pas dans le Tablut), trône (la case du roi, marquée d'une
croix), cases de départ des deux camps teintées, pour la mise en place.
Fond : le bois de jocly éclairci.

## tablier-hex.py — hexagonaux

La forme du plateau, la couleur de chaque case et les noms des cases sont
**lus dans le modèle jocly** (`src/games/chessbase/hex/<jeu>-model.js` :
`boardLayout`, `posNames`) ; l'orientation s'en déduit (colonnes verticales
et hexagones à plat pour Glinski, McCooey, Shafran ; rangées horizontales et
hexagones en pointe pour Brusky, Devasa). `--case` est la largeur entre
côtés opposés. `--palette jocly|modele` (sable, gris, marine), ou
`--couleurs c1,c2,c3`. `--rayon N` : hexagone générique.

## tablier-cercle.py — circulaires

Par défaut le plateau byzantin et circulaire de jocly : 4 anneaux × 16
secteurs, moyeu de 4 cases de diamètre, rangée 1 à l'extérieur, colonne a
sous l'horizontale droite, sens horaire. `--anneaux`, `--secteurs`,
`--moyeu MM` (rayon), `--case` (profondeur d'un anneau),
`--sans-diagonales`. Le modèle 50x50 :

```
python3 tablier-cercle.py --anneaux 6 --secteurs 24 --moyeu 60 --case 30 \
    --clair '#DDB07A' --fonce '#062440' --moyeu-couleur '#747474'
```

## tablier-lignes.py — intersections

- **go** 9, 13, 19 : pas de 22 × 23,7 mm (pierres de 22 mm ; un goban est un
  peu plus haut que large), hoshi, repères A–T sans I ;
- **xiangqi** : rivière avec 楚河 漢界 (police CJK ; `--sans-riviere-texte`
  sinon), palais, « fleurs » des canons et des soldats, double cadre ;
- **janggi** : lignes continues, palais ;
- **alquerque** : 5 × 5, diagonales depuis les points de même parité, comme
  le graphe d'`alquerque-model.js` ;
- **moulins** 6, 7, 9, 12 : points et segments lus dans
  `src/games/mills/<n>-men-morris-model.js` (`Coord`, `Graph`) ; repères
  a1–g7, la notation usuelle du moulin ;
- toute grille : `--colonnes`, `--lignes`, `--pas`, `--pas-y`.

Fond : le bois des tabliers jocly éclairci (`#D9AE78`), lignes `#2b1d0e`.
