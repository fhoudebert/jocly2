# Le Jeu de la guerre (Guy Debord)

Module Jocly `kriegspiel`, jeu `jeu-de-la-guerre`. Vue 2D uniquement.

Deux skins 2D, même grammaire de cadres (rectangle pour les unités combattantes, rond pour les transmissions,
double chevron pour les unités rapides, Nord sombre / Sud clair) :

- `carte` : symboles OTAN stricts ;
- `pictos` : pictogrammes d'époque posés sur la géométrie OTAN (fusils croisés en X, sabre en diagonale,
  canon, artillerie attelée, tambour, cor de poste ; arsenal dessiné). Planches dans `res/images/pictos/`,
  générées par `extra/sprites/pictos/gen.py` à partir de `extra/sprites/pictos/src/`. Les marqueurs, et la
  montagne, le col et la forteresse, sont ceux de `carte`.

| fichier | rôle |
|---|---|
| `kriegspiel-rules.js` | moteur de règles pur : aucune globale Jocly, fonctions sur un état sérialisable. Chargeable seul (`require`), réutilisable hors Jocly |
| `kriegspiel-ai.js` | heuristiques, pures elles aussi : déploiements, tours candidats, évaluation |
| `kriegspiel-model.js` | habillage Jocly (`Model.Game`, `Model.Board`, `Model.Move`) |
| `kriegspiel-xd-view.js`, `kriegspiel.css` | vue 2D et saisie |
| `index.js` | manifeste : carte et coefficients (`gameOptions`), niveaux d'IA |
| `res/images/` | planches de la skin `carte` (cases de 200 px) ; `res/images/pictos/` pour la skin `pictos` ; sources dans `extra/sprites/` |

Tests : `npm test -- kriegspiel` (voir `tests/kriegspiel/`).

## Un coup Jocly = un tour complet

```js
{ p: { I:[..9], C:[..4], A:[.], AC:[.], T:[.], E:[.] } }       // placement
{ r: [de,vers], m: [[de,vers]...], a: cible, d: caseArsenal }  // tour de jeu
```

`r` est la retraite forcée, `m` les déplacements (cinq au plus, retraite comprise, dans l'ordre), `a` la case
attaquée, `d` la case de l'arsenal détruit pendant le tour (obligatoire quand il y en a un : c'est ce qui permet
la notation `G7-T3!`). Une case est `ligne*25 + colonne-1`, ligne A = 0.

`GenerateMoves` ne renvoie qu'un échantillon de tours, ceux que l'IA envisage. `IsValidMove` est donc un vrai
validateur : il rejoue le tour pas à pas sur une copie, avec le même objet `Turn` que l'IA et la saisie.

## Options (`gameOptions`)

- `map`, `units` : la carte et les coefficients, en une seule table ;
- `maxTurns` (400) : nulle après ce nombre de coups Jocly, 0 pour ne pas limiter ;
- `isolationVictory` (oui) : victoire quand l'adversaire n'a plus d'unité de transmission et que toutes ses
  unités sont isolées (règle de RSG, absente chez Debord) ;
- `blindDeployment` (non) : masque le déploiement du Nord pendant celui du Sud. Aussi disponible par le bouton
  « À l'aveugle » du panneau. Simple masquage d'affichage : le modèle reste à information complète.

## Interprétations retenues

Les règles suivent Debord ; RSG tranche ce que Debord laisse ouvert. Points qui méritent d'être signalés :

- une ligne de communication traverse les unités de transmission adverses, et s'arrête devant toute autre unité
  adverse ; les unités ne bloquent pas les tirs ;
- le contact ne relie que des unités combattantes : une unité de transmission hors ligne reste isolée ;
- la charge accepte une colonne de un à quatre cavaliers ;
- une retraite forcée impossible (unité isolée, ou sans case libre) détruit l'unité. Comme rien ne bouge entre
  l'attaque et le tour suivant de son camp, la destruction est appliquée dès l'attaque : l'état ne porte un
  ordre de retraite que s'il est exécutable ;
- la destruction d'un arsenal tient lieu d'attaque : pas d'attaque ensuite, et pas de seconde destruction dans
  le même tour ; les autres unités peuvent encore se déplacer. Une unité combattante s'arrête dans l'arsenal
  qu'elle détruit ;
- une unité de transmission peut entrer dans un arsenal adverse sans le détruire ; l'arsenal continue d'émettre.

## Limites de cette version

- pas de vue 3D ;
- le déploiement secret de Debord n'existe que comme masquage d'affichage ;
- l'IA cherche peu profond (tours candidats heuristiques + UCT) : elle joue des coups sensés mais reste faible ;
- l'exemple chiffré de RSG (défense 24, attaque 30) est testé sur une position reconstituée : le texte de RSG ne
  donne que les sommes, les cases sont sur sa figure.
