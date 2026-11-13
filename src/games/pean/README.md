# Péan

Module Jocly `pean` : wargame tactique à hexagones, deux joueurs, sans hasard, à information complète, dans la
Grèce antique. Inspiré d'*Heraklios* (François Marcela-Froideval, *Jeux & Stratégie*, 1980) pour le genre
seulement : règles, carte, tables et valeurs sont propres au module (voir `credits*.html`). Vue 2D uniquement.

Un module, plusieurs jeux : **un jeu Jocly par scénario**, tous servis par le même moteur.

| jeu | scénario | intérêt |
|---|---|---|
| `pean-bataille-libre` | `scenarios/bataille-libre.json` | chaque camp achète (200 points) et déploie son armée, puis se bat pour un village et deux hauteurs |
| `pean-leuctres` | `scenarios/leuctres-371.json` | colonne thébaine profonde face aux Spartiates, aile droite refusée : l'ordre oblique |
| `pean-platees` | `scenarios/platees-479.json` | ligne grecque sur les contreforts du Cithéron, l'Asopos et ses gués, cavalerie et archers montés perses |
| `pean-laurion` | `scenarios/laurion-413.json` | raid asymétrique sur les mines d'argent : tenir une mine trois tours, renforts athéniens échelonnés |

| fichier | rôle |
|---|---|
| `pean-rules.js` | moteur de règles pur : aucune globale Jocly, fonctions sur un état sérialisable, chargeable seul (`require`). Tout ce qui varie vient du scénario |
| `pean-ai.js` | heuristiques, pures elles aussi : déploiements, tours candidats, évaluation à traits nommés (`WEIGHTS`) |
| `pean-model.js` | habillage Jocly (`Model.Game`, `Model.Board`, `Model.Move`) |
| `pean-xd-view.js`, `pean.css` | vue 2D hexagonale et saisie, dessinée au canvas ; quatre skins : « Tuiles » (tuiles de terrain de Wesnoth, par défaut), « Wargame » (mêmes tuiles, pions carrés), « Insignes » (pictogrammes de Wesnoth), avec les emblèmes de 0 A.D., et « Carte », entièrement dessinée |
| `res/images/` | emblèmes et bannières de 0 A.D. (CC BY-SA 3.0), pictogrammes et tuiles de terrain de Wesnoth (GPL v2+) ; `extra/0ad/`, `extra/wesnoth/` : réserves d'images non embarquées, voir leurs README |
| `index.js` | manifeste : la liste des scénarios, les niveaux d'IA. Il lit les JSON au build et les embarque dans `gameOptions.scenario` |
| `scenarios/*.json` | les batailles |
| `thumbnail-*.png` | les vignettes, une par jeu : portion de la carte en tuiles, emblèmes des camps ; refaites par `extra/vignettes.py` |
| `extra/riviere.py` | aide à l'écriture des scénarios : les côtés d'hexagone d'une rivière le long d'une ligne |

Tests : `npm test -- pean` (voir `tests/pean/`). Équilibre : `node src/games/pean/extra/lab.js SCENARIO` (auto-jeu
glouton, rapide) ou `--mode uct --level 0` (l'IA Jocly, après `npx gulp build`) ; accepte un fichier JSON pour essayer une
variante.

## Ajouter une bataille

Écrire `scenarios/ma-bataille.json`, ajouter une ligne à `SCENARIOS` dans `index.js`. Aucun code à toucher tant que
la bataille se contente du vocabulaire du noyau. `PeanRules.validateScenario(json)` dit ce qui ne va pas.

```jsonc
{
  "id": "leuctres-371",
  "titre": { "fr": "...", "en": "..." }, "resume": { "fr": "...", "en": "..." },
  "regles": { "fr": "...", "en": "..." },   // conditions de victoire, rappelées dans le panneau
  "carte": {
    "cols": 24, "rows": 16,               // 4 à 60 ; hexagones à sommet plat, colonnes impaires décalées
    "lignes": ["....cc..", ...],          // une lettre par hexagone (légende ci-dessous), ou :
    "defaut": "plaine", "terrain": { "colline": ["10,2", "rect:3-5,4-6"] },
    "cotes": { "riviere": [["5,7", "5,8"]], "gue": [...] }   // côtés d'hexagone : paires de voisins
  },
  "terrains": { "colline": { "def": 2 } },  // facultatif : surcharge ou nouveaux terrains
  "types": {                                // facultatif : surcharge ou nouveaux types
    "spartiate": { "code": "Sp", "force": 7, "mvt": 3, "pas": 2, "cout": 30, "traits": ["phalange"],
                   "nom": { "fr": "Spartiates", "en": "Spartiates" } }
  },
  "camps": {
    "A": { "nom": {...}, "bord": "sud", "zone": "rows:12-15",
           "embleme": "thebans", "banniere": "thebans",   // res/images/emblemes/, res/images/bannieres/
           "unites": [{ "type": "hoplite", "hex": "3,10", "face": "N", "nom": "Pélopidas", "embleme": "poleis" }],
           "renforts": [{ "type": "cavlegere", "hex": "0,15", "tour": 3 }] },
    "B": { ... }
  },
  "premierJoueur": "A",
  "deploiement": { "libre": true, "budget": 200 },          // facultatif : achat et déploiement libres
  "ordres": { "base": 4, "parGeneral": 1 },
  "objectifs": [{ "hex": "11,0", "points": 30, "camp": "B", "pour": "A", "immediat": false, "tenir": 1 }],
  "tours": 12, "rupture": 0.5, "nulle": 10, "chargeMin": 3,
  "options": ["orientation", "profondeur", "charge"],
  "table": [{ "rapport": "1:1", "resultat": "echange" }, ...]   // facultatif : table de combat propre
}
```

- Hexagones : `"col,ligne"` (base 0) ; zones : `"rows:a-b"`, `"cols:a-b"`, `"rect:c0-c1,r0-r1"` ou liste.
- Légende des cartes en texte : `.` plaine, `=` route, `c` colline, `f` forêt, `m` marais, `v` ville, `k` camp, `x` mine,
  `M` montagne, `~` mer (`carte.legende` pour en ajouter).
- Traits (vocabulaire fermé, implémenté une fois dans le noyau) : `phalange`, `leger`, `tir`, `monte`,
  `desengage`, `charge`, `general`. Un trait inconnu est une erreur : en ajouter un est une évolution du noyau.
- Types par défaut : `hoplite`, `peltaste`, `archer`, `frondeur`, `cavlegere`, `cavlourde`, `general`.
- Apparence (la vue seule s'en sert) : `icone` d'un type (`aspis`, `lance`, `pavois`, `javelots`, `fronde`, `arc`,
  `cheval`, `cheval-lance`, `cheval-arc`, `casque` ; sinon déduite des traits).
- Objectifs : `camp` = contrôle initial ; `pour` = seul camp qui marque ; `immediat` + `tenir` = victoire
  immédiate après N tours de tenue.

## Un coup Jocly = un tour complet

```js
{ p: [[type, hex], ...] }                         // déploiement libre
{ o: [{ u: [ids], c: [hexes], f: dir }, ...],     // ordres : unité ou groupe, chemin du meneur, orientation
  k: [{ a: [ids], t: id, h: hex, v: id }, ...] }  // combats : attaquants, cible, hexagone, unité qui avance
```

Les unités sont désignées par leur indice dans `state.u` (stable de toute la partie). `GenerateMoves` ne renvoie
qu'un échantillon de tours (ceux que l'IA envisage) ; `IsValidMove` rejoue le tour pas à pas avec le même objet
`Turn` que l'IA et la saisie. Notation : `D11-D8` ordre, `9:C11-F9` groupe de 9, `D9/NE` pivot, `3xE7+` trois
attaquants sur E7, avec avance.

## Interprétations retenues

Le cadrage laisse quelques points ouverts ; voici ce qui a été tranché :

- **recul** automatique, vers le bord du camp, sur un hexagone libre hors zone de contrôle ennemie (le plus
  défensif à égalité) ; sinon perte d'un pas. Un recul choisi par le défenseur demanderait un demi-coup de plus ;
- **échange** : la perte de l'attaquant est subie par le premier attaquant au contact de la liste (la saisie et
  l'IA y mettent le moins précieux) ;
- **tir seul** : 1:1 est sans effet, toute colonne supérieure donne un recul ; les tireurs ne combattent pas au
  contact ;
- **charge** : toute la course est droite, d'au moins `chargeMin` hexagones, sans franchir de rivière ;
- **profondeur** : une seule colonne pousse par combat. L'attaque compte le meilleur bonus parmi ses phalanges (le
  compter pour chacune donnait +4 à deux phalanges et faisait de 3:1 la norme), la défense le sien, dans l'axe du
  premier attaquant au contact ;
- **flanc** : défense d'une phalange prise de flanc ou de dos multipliée par `flanc` (½ par défaut, réglable par
  scénario) ;
- **groupe** : même type, contigu, aucune unité dans une zone ennemie ; il se déplace par translation, s'arrête
  dès qu'un membre entre dans une zone ennemie ;
- **engagée** : une unité qui commence dans une zone ennemie ne bouge pas (sauf `desengage`) ; une phalange
  engagée peut pivoter si l'option `orientation` est active ;
- **renforts** : ils arrivent au début du tour de leur camp, sur leur hexagone d'entrée, ou à côté s'il est
  occupé, et peuvent bouger aussitôt.

## Pions

« Tuiles » et « Insignes » : le bouclier à emblème entier, l'arme du type sur son bord gauche, la force et le
mouvement dans une plaquette dessous ; « Wargame » : le pion carré aux couleurs du camp. L'arme ou les chiffres peuvent
couvrir le bord du bouclier, jamais son centre. La pointe claire sur le bord d'une phalange marque son front (option
« orientation »).

## Équilibre mesuré (novembre 2026)

Auto-jeu, IA Jocly niveau Caporal des deux côtés, 10 parties par scénario (`extra/lab.js --mode uct`). Cible du
cadrage : entre 35 et 65 % pour chaque camp (nulles comptées pour moitié).

| scénario | résultat | durée moyenne | réglages |
|---|---|---|---|
| Bataille libre | Athéniens 60 % / Spartiates 40 % | 4,5 tours sur 12 | — |
| Leuctres | Thébains 60 % / Spartiates 40 % | 4,7 tours sur 12 | profondeur comptée une fois par combat (règle) |
| Platées | Grecs 60 % / Perses 40 % | 10,7 tours sur 14 | Perses renforcés (+4 sparabara, +1 Immortels, +1 cavalerie lourde, +1 archers montés) ; camp perse à 30 points |
| Laurion | Péloponnésiens 50 % / Athéniens 50 % (20 parties, 40 itérations) | 5,9 tours sur 10 | renforts athéniens du tour 2 au tour 4 ; tenir une mine 4 tours ; hoplites aux postes des mines |

Le niveau Caporal s'arrête au bout d'une seconde : sur une machine chargée, il cherche moins, et deux séries du même
scénario ont donné 20 % et 80 %. Pour comparer des variantes, `lab.js --loops 40` borne la recherche à un nombre
d'itérations fixe ; le Laurion a été remesuré ainsi (avec la route continue et la garnison face au nord, il était passé
à 35 / 65 pour les Athéniens). Dix parties ne donnent qu'une tendance (± 15 points) ; le niveau Général, que vise le cadrage, reste à mesurer. Les
batailles en plaine se décident vite, par rupture : la durée visée par le cadrage (12 à 20 tours) n'est atteinte qu'à
Platées.

## Limites de cette version

- pas de moteur natif (niveau Maréchal) ni d'intégration Tabulon : ce sont les étapes 4 à 6 du cadrage. Le
  modèle exporte déjà l'état en JSON (`ExportBoardState`) ;
- l'IA (UCT jocly sur tours candidats) joue des coups sensés mais reste faible, et l'équilibre des scénarios n'est
  pas encore réglé (étape 3 du cadrage) ;
- la skin « Tuiles » pose les tuiles de terrain de Wesnoth ; la skin « Insignes » emprunte à 0 A.D. les emblèmes et les bannières, à Wesnoth les pictogrammes de forêt, marais,
  montagne, mer, colline, ville et camp ; plaine, route, rivières et icônes d'unités restent dessinés.
