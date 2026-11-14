# Péan

Module Jocly `pean` : wargame tactique à hexagones, deux joueurs, sans hasard, à information complète, dans la
Grèce antique. Inspiré d'*Heraklios* (François Marcela-Froideval, *Jeux & Stratégie*, 1980) pour le genre
seulement : règles, carte, tables et valeurs sont propres au module (voir `credits*.html`). Vue 2D uniquement.

Un seul jeu Jocly, `pean`, plusieurs batailles : la partie commence par un **prélude**, le choix de la bataille
(une vignette par scénario, son nom en grec dessous), comme le choix des règles au go ou aux dames 8 x 8. Le choix est le
premier coup de la partie (« #k »), suivi d'une étape vide (« -- ») qui rend la main au premier camp ; il s'enregistre,
se rejoue et s'annule comme un autre coup. Contre l'ordinateur qui joue en premier, c'est lui qui choisit, au hasard.

| prélude | scénario | intérêt |
|---|---|---|
| ΜΑΡΑΘΩΝ | `scenarios/marathon-490.json` | phalange athénienne et Platéens contre l'armée de Datis, entre collines, Charadra, grand marais et plage de Schinias : navires perses à prendre, route d'Athènes à garder |
| ΘΕΡΜΟΠΥΛΑΙ | `scenarios/thermopyles-480.json` | le défilé entre montagne et mer, le mur des Phocidiens ; les Immortels tournent la position par le sentier de l'Anopée |
| ΠΛΑΤΑΙΑΙ | `scenarios/platees-479.json` | ligne grecque sur les contreforts du Cithéron, l'Asopos et ses gués, cavalerie et archers montés perses |
| ΛΑΥΡΙΟΝ | `scenarios/laurion-413.json` | raid asymétrique sur les mines d'argent : tenir une mine quatre tours, renforts athéniens échelonnés |
| ΛΕΥΚΤΡΑ | `scenarios/leuctres-371.json` | colonne thébaine profonde face aux Spartiates, aile droite refusée : l'ordre oblique |
| ΕΛΛΗΝΕΣ | `scenarios/bataille-libre.json` | chaque camp achète (200 points) et déploie son armée, puis se bat pour un village et deux hauteurs |

| fichier | rôle |
|---|---|
| `pean-rules.js` | moteur de règles pur : aucune globale Jocly, fonctions sur un état sérialisable, chargeable seul (`require`). Tout ce qui varie vient du scénario |
| `pean-ai.js` | heuristiques, pures elles aussi : déploiements, tours candidats, évaluation à traits nommés (`WEIGHTS`) |
| `pean-model.js` | habillage Jocly (`Model.Game`, `Model.Board`, `Model.Move`) |
| `pean-xd-view.js`, `pean.css` | vue 2D hexagonale et saisie, dessinée au canvas ; quatre skins : « Tuiles » (tuiles de terrain de Wesnoth, par défaut), « Wargame » (mêmes tuiles, pions carrés), « Insignes » (pictogrammes de Wesnoth), avec les emblèmes de 0 A.D., et « Carte », entièrement dessinée |
| `res/images/` | emblèmes et bannières de 0 A.D. (CC BY-SA 3.0), pictogrammes et tuiles de terrain de Wesnoth (GPL v2+) ; `extra/0ad/`, `extra/wesnoth/` : réserves d'images non embarquées, voir leurs README |
| `index.js` | manifeste : la liste des scénarios (ordre du prélude, noms grecs), les niveaux d'IA. Il lit les JSON au build et les embarque dans `gameOptions.scenarios` |
| `scenarios/*.json` | les batailles |
| `thumbnail.png`, `res/images/batailles/` | la vignette du jeu (les emblèmes des quatre batailles) et celles du prélude, une par scénario : portion de la carte en tuiles, emblèmes des camps ; refaites par `extra/vignettes.py` |
| `extra/riviere.py` | aide à l'écriture des scénarios : les côtés d'hexagone d'une rivière le long d'une ligne |

Tests : `npm test -- pean` (voir `tests/pean/`). Équilibre : `node src/games/pean/extra/lab.js SCENARIO` (auto-jeu
glouton, rapide) ou `--mode uct --level 0` (l'IA Jocly, après `npx gulp build`) ; accepte un fichier JSON pour essayer une
variante.

## Ajouter une bataille

Écrire `scenarios/ma-bataille.json`, ajouter une ligne à `SCENARIOS` dans `index.js` (fichier, vignette, nom en grec)
et une à `VIGNETTES` dans `extra/vignettes.py`. Aucun code à toucher tant que la bataille se contente du vocabulaire du
noyau. `PeanRules.validateScenario(json)` dit ce qui ne va pas.

```jsonc
{
  "id": "leuctres-371",
  "titre": { "fr": "...", "en": "..." }, "resume": { "fr": "...", "en": "..." },
  "regles": { "fr": "...", "en": "..." },   // conditions de victoire, rappelées dans le panneau
  "carte": {
    "cols": 24, "rows": 16,               // 4 à 60 ; hexagones à sommet plat, colonnes impaires décalées
    "lignes": ["....cc..", ...],          // une lettre par hexagone (légende ci-dessous), ou :
    "defaut": "plaine", "terrain": { "colline": ["10,2", "rect:3-5,4-6"] },
    "cotes": { "riviere": [["5,7", "5,8"]], "gue": [...], "mur": [...] },   // côtés d'hexagone : paires de voisins
    "decors": [{ "hex": "11,12", "image": "tumulus" }],   // res/images/decors/, skins à tuiles, sans effet sur le jeu
    "tuiles": { "foret": ["pinede1", "pinede2"] }       // habillage propre à la bataille (skins à tuiles)
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
  "objectifs": [{ "hex": "11,0", "points": 30, "camp": "B", "pour": "A", "immediat": false, "tenir": 1, "decor": "temple" }],
  "tours": 12, "rupture": 0.5, "nulle": 10, "chargeMin": 3,
  "options": ["orientation", "profondeur", "charge"],
  "table": [{ "rapport": "1:1", "resultat": "echange" }, ...]   // facultatif : table de combat propre
}
```

- Hexagones : `"col,ligne"` (base 0) ; zones : `"rows:a-b"`, `"cols:a-b"`, `"rect:c0-c1,r0-r1"` ou liste.
- Légende des cartes en texte : `.` plaine, `=` route, `c` colline, `f` forêt, `m` marais, `v` ville, `k` camp, `x` mine,
  `s` sentier (de montagne : à la file, sans charge ni profondeur), `p` plage, `M` montagne, `~` mer
  (`carte.legende` pour en ajouter). La vue pose d'elle-même un liseré de sable sur la mer au contact de la terre, et des
  nénuphars sur un marais sur trois (skins à tuiles).
- Traits (vocabulaire fermé, implémenté une fois dans le noyau) : `phalange`, `leger`, `tir`, `monte`,
  `desengage`, `charge`, `general`. Un trait inconnu est une erreur : en ajouter un est une évolution du noyau.
- Types par défaut : `hoplite`, `peltaste`, `archer`, `frondeur`, `cavlegere`, `cavlourde`, `general`.
- Apparence (la vue seule s'en sert) : `icone` d'un type (`aspis`, `lance`, `pavois`, `javelots`, `fronde`, `arc`,
  `cheval`, `cheval-lance`, `cheval-arc`, `casque` ; sinon déduite des traits).
- Objectifs : `camp` = contrôle initial ; `pour` = seul camp qui marque ; `immediat` + `tenir` = victoire
  immédiate après N tours de tenue ; `decor` = image de `res/images/decors/` posée sur la case par les skins à
  tuiles (le temple de Déméter à Platées).

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

Auto-jeu, IA Jocly niveau Enomotarchos (ex-Caporal) des deux côtés, 10 parties par scénario (`extra/lab.js --mode uct`). Cible du
cadrage : entre 35 et 65 % pour chaque camp (nulles comptées pour moitié).

| scénario | résultat | durée moyenne | réglages |
|---|---|---|---|
| Bataille libre | Athéniens 60 % / Spartiates 40 % | 4,5 tours sur 12 | — |
| Leuctres | Thébains 60 % / Spartiates 40 % | 4,7 tours sur 12 | profondeur comptée une fois par combat (règle) |
| Platées | Grecs 60 % / Perses 40 % | 10,7 tours sur 14 | Perses renforcés (+4 sparabara, +1 Immortels, +1 cavalerie lourde, +1 archers montés) ; camp perse à 30 points |
| Laurion | Péloponnésiens 50 % / Athéniens 50 % (20 parties, 40 itérations) | 5,9 tours sur 10 | renforts athéniens du tour 2 au tour 4 ; tenir une mine 4 tours ; hoplites aux postes des mines |
| Marathon | Athéniens 55 % / Perses 45 % (20 parties, 40 itérations) | 5,4 tours sur 10 | Perses portés à 13 sparabara et Immortels, 6 archers, 3 cavaliers ; Athéniens 10 hoplites (dont 2 platéens) |
| Thermopyles | Perses 55 % / Grecs 45 % (20 parties, 40 itérations) | 11 tours sur 12 | renforts perses (4 sparabara) aux tours 3 et 5 ; Immortels par l'Anopée |

Le niveau Enomotarchos s'arrête au bout d'une seconde : sur une machine chargée, il cherche moins, et deux séries du même
scénario ont donné 20 % et 80 %. Pour comparer des variantes, `lab.js --loops 40` borne la recherche à un nombre
d'itérations fixe ; le Laurion a été remesuré ainsi (avec la route continue et la garnison face au nord, il était passé
à 35 / 65 pour les Athéniens). Dix parties ne donnent qu'une tendance (± 15 points) ; le niveau Taxiarchos, que vise le cadrage, reste à mesurer. Les
batailles en plaine se décident vite, par rupture : la durée visée par le cadrage (12 à 20 tours) n'est atteinte qu'à
Platées.

## Niveaux

Les niveaux portent les grades de l'armée grecque : **Enomotarchos** (Ἐνωμοτάρχης, chef d'énomotie : caporal, sergent),
**Lochagos** (Λοχαγός, capitaine), **Taxiarchos** (Ταξίαρχος, général de brigade) — l'IA UCT de jocly, de plus en plus
longue — et **Strategos** (Στρατηγός, général en chef), le moteur natif.

## Niveau Strategos (moteur natif)

Le quatrième niveau, « Strategos » (`"ai": "pean"`), est un moteur Rust lié à Tabulon (crate `pean` de Tabulon,
`src-tauri/crates/pean`). jocly lui parle à travers `jocly.peanworker.js` (voir `src/core/jocly.pean.js`) : il envoie le
contexte compilé du scénario (`PeanRules.exportContext`) et l'état (`Model.Board.ExportEngineRequest`), et valide le
tour rendu (`IsValidMove`). Le moteur ne lit jamais les scénarios : une nouvelle bataille n'y demande rien.

- **règles** : portage de `pean-rules.js`, qui reste la référence ; un test différentiel compare destinations,
  combats, verdicts et codes d'erreur, états, issues, évaluation et tours candidats, position par position ;
- **recherche** : alpha-bêta à approfondissement itératif sur les tours candidats de `pean-ai.js` (40 à la racine,
  puis 18, 12...), l'arbre gardé d'une itération à l'autre ; profondeur 3 à 4 tours en 2,5 s ;
- **sans moteur** (jocly seul, navigateur) : le tour est joué par « Taxiarchos » et le repli est annoncé ; le
  déploiement libre est toujours joué par l'IA du jeu.

Mesure (novembre 2026, `tools/duel.cjs` de la crate), contre « Taxiarchos » tel quel (5 s par tour), 13 parties par
scénario, camps alternés :

| scénario | Strategos | remarque |
|---|---|---|
| Bataille libre | 11 V / 0 N / 2 D | |
| Leuctres | 9 V / 0 N / 4 D | 7 sur 7 avec les Thébains, 2 sur 6 avec les Spartiates |
| Platées | 6 V / 2 N / 5 D | 5 sur 6 avec les Grecs, 1 sur 7 avec les Perses |
| Laurion | 9 V / 0 N / 4 D | 7 sur 7 avec les Péloponnésiens, 2 sur 6 avec les Athéniens |
| **total** | **35 V / 2 N / 15 D, 69 %** | tour le plus long : 2,56 s |

Avant la correction de l'IA de jocly (orientation qui passait d'un ordre au suivant, `buildTurn`), le même match
donnait 40 V / 1 N / 11 D (78 %) : « Taxiarchos » corrigé est plus fort, surtout avec le camp le plus faible du scénario.

## Limites de cette version

- l'IA de jocly (UCT sur tours candidats) joue des coups sensés mais reste faible ; le Strategos n'existe que dans
  Tabulon ;
- la skin « Tuiles » pose les tuiles de terrain de Wesnoth ; la skin « Insignes » emprunte à 0 A.D. les emblèmes et les bannières, à Wesnoth les pictogrammes de forêt, marais,
  montagne, mer, colline, ville et camp ; plaine, route, rivières et icônes d'unités restent dessinés.
