#!/usr/bin/env python3
"""Ecrit fairy-viewer.html : une page d'apercu des pieces generees par
gltf-make-textures.py.

Le dossier des pieces est cherche tout seul, dans cet ordre :

  1. --pieces si l'option est donnee ;
  2. res/fairy a cote de ce script (la disposition de travail de
     gltf-make-textures.py) ;
  3. res/fairy dans le dossier parent ;
  4. src/games/chessbase/res/fairy en remontant l'arborescence (depot jocly2).

Le dossier de three.js (three.js, GLTFLoader.js, BufferGeometryUtils.js) est
cherche de la meme facon : --three, puis third-party/ ou lib/ en remontant
depuis le script et depuis les pieces.

    python3 make-fairy-viewer.py
    python3 make-fairy-viewer.py --pieces res/fairy
    python3 make-fairy-viewer.py --pieces ~/travail/gltf/res/fairy

    python3 make-fairy-viewer.py --out ~/public/pieces.html

Les chemins ecrits dans la page sont relatifs a la page elle-meme, calcules
par le script : la page marche donc ou qu'elle soit posee, du moment que les
pieces et three.js restent accessibles par le meme serveur.

Une page statique ne peut pas lister un dossier : l'inventaire est releve
ici, a la generation, et incorpore a la page. Relancer le script apres avoir
ajoute, retire ou regenere une piece.

Servir par HTTP -- les fetch() de three.js et des .gltf sont bloques en
file:// :

    python3 -m http.server 8000        # dans le dossier commun
    http://localhost:8000/...../fairy-viewer.html

VIGNETTES POUR L'AIDE EN LIGNE (res/rules/fairy/*.png)

Les images des pages de regles font 200x120 sur fond blanc : l'icone 2D a
gauche, la piece 3D a droite. La page sait les fabriquer :

  * bouton « Vignette » : rend la piece affichee, sous l'angle choisi a la
    souris, et propose le PNG au telechargement ;
  * l'icone 2D est trouvee seule si res/fairy/icons/w-<piece>.png existe ;
    sinon la choisir dans la page (un PNG, ou une planche de sprites et sa
    colonne), ou la donner au script :

        --icone frog=src/games/chessbase/res/ultima/baroque-picto-sprites.png:10

    (planche : cellules carrees, ligne du haut = Blancs, colonne comptee
    depuis 0). Sans icone, la moitie gauche reste blanche.

    --icone vise le NOM DE LA PIECE 3D. Quand un jeu habille un maillage
    existant (l'Immobilisateur est omega/wizard), --alias lui donne un nom
    propre, donc une icone et un fichier a lui :

        --alias immobilizer=wizard \
        --icone immobilizer=.../baroque-picto-sprites.png:5

Ou toutes d'un coup, sans navigateur a ouvrir (Playwright requis :
pip install playwright && playwright install chromium) :

    python3 make-3dpieces-viewer.py --vignettes /tmp/vignettes
    python3 make-3dpieces-viewer.py --vignettes /tmp/v --seulement baroque/ \
        --icone frog=.../baroque-picto-sprites.png:10 --angle 0.6 --hauteur 0.35

--angle et --hauteur (radians) sont ceux que la page affiche pour la vue
courante : regler l'orientation a la souris, puis les recopier.
"""
import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# disposition du depot jocly2, conservee comme dernier recours seulement
REL_DEPOT = os.path.join('src', 'games', 'chessbase', 'res', 'fairy')
# three.js seul est evalue a part (build CommonJS) ; les modules complementaires
# sont soit regroupes (three-addons.js, depuis r186 dans jocly2), soit separes
TROIS_ADDONS = (('three-addons.js',), ('BufferGeometryUtils.js', 'GLTFLoader.js'))


def remonte(depart, *relatifs, test=os.path.isdir, niveaux=6):
    """Cherche l'un des chemins relatifs en remontant depuis un dossier."""
    d = os.path.abspath(depart)
    for _ in range(niveaux):
        for rel in relatifs:
            c = os.path.join(d, rel)
            if test(c):
                return os.path.abspath(c)
        parent = os.path.dirname(d)
        if parent == d:
            break
        d = parent
    return None


def trouve_pieces(explicite):
    if explicite:
        d = os.path.abspath(explicite)
        if not os.path.isdir(d):
            sys.exit(f'{d} introuvable')
        return d
    # res/fairy a cote du script, puis au-dessus, puis la disposition du depot
    d = remonte(HERE, os.path.join('res', 'fairy'), REL_DEPOT)
    if not d:
        sys.exit('dossier des pieces introuvable — le passer avec --pieces '
                 '(par exemple --pieces ./res/fairy)')
    return d


def addons(c):
    """Modules complementaires presents a cote de three.js, ou None."""
    if not os.path.isfile(os.path.join(c, 'three.js')):
        return None
    for jeu in TROIS_ADDONS:
        if all(os.path.isfile(os.path.join(c, f)) for f in jeu):
            return list(jeu)
    return None


def trouve_three(explicite, pieces):
    if explicite:
        d = os.path.abspath(explicite)
        if not addons(d):
            sys.exit(f'{d} ne contient pas three.js accompagne de '
                     + ' ou '.join(' + '.join(j) for j in TROIS_ADDONS))
        return d
    for depart in (HERE, pieces):
        d = remonte(depart, 'third-party', 'lib', '.', test=addons)
        if d:
            return d
    return None


def scan(fairy_dir, up):
    """[{folder, pieces: [{name, gltf, diffuse, normal, ko, tris, icone}]}, ...]"""
    groups = []
    icones = os.path.join(fairy_dir, 'icons')
    for folder in sorted(os.listdir(fairy_dir)):
        d = os.path.join(fairy_dir, folder)
        if not os.path.isdir(d):
            continue
        pieces = []
        for f in sorted(os.listdir(d)):
            if not f.endswith('.gltf'):
                continue
            name = f[:-5]
            base = f'{up}/{folder}'

            # Les cartes ne sont pas referencees par le glTF (jocly les
            # applique depuis fairy-set-view.js) : on les retrouve par
            # convention de nommage, et on n'annonce que celles qui existent.
            def side(suffix):
                p = os.path.join(d, f'{name}-{suffix}.jpg')
                return f'{base}/{name}-{suffix}.jpg' if os.path.exists(p) else None

            total = os.path.getsize(os.path.join(d, f))
            for s in ('diffusemap', 'normalmap'):
                p = os.path.join(d, f'{name}-{s}.jpg')
                if os.path.exists(p):
                    total += os.path.getsize(p)
            try:
                with open(os.path.join(d, f)) as fh:
                    g = json.load(fh)
                acc = g['accessors'][g['meshes'][0]['primitives'][0]['indices']]
                tris = acc['count'] // 3
            except Exception:
                tris = None
            pieces.append({
                'name': name,
                'folder': folder,
                'gltf': f'{base}/{f}',
                'diffuse': side('diffusemap'),
                'normal': side('normalmap'),
                'ko': round(total / 1024),
                'tris': tris,
                # icone 2D de l'aide : res/fairy/icons/w-<piece>.png si elle existe
                'icone': ({'src': f'{up}/icons/w-{name}.png', 'col': None}
                          if os.path.isfile(os.path.join(icones, f'w-{name}.png'))
                          else None),
            })
        if pieces:
            groups.append({'folder': folder, 'pieces': pieces})
    return groups


HTML = r"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pieces fairy - apercu</title>
<style>
  :root {
    --encre: #2b2621;
    --papier: #e8e2d6;
    --papier-fonce: #d8d0c0;
    --trait: #b8ad98;
    --buis: #b28a52;
    --actif: #6d4f2a;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font: 15px/1.5 "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    color: var(--encre);
    background: var(--papier);
    display: flex;
    min-height: 100vh;
  }
  aside {
    width: 250px;
    flex: none;
    border-right: 1px solid var(--trait);
    overflow-y: auto;
    max-height: 100vh;
    padding: 18px 0 40px;
  }
  h1 {
    font-size: 15px;
    letter-spacing: .14em;
    text-transform: uppercase;
    margin: 0 18px 4px;
    font-weight: 600;
  }
  .compte { margin: 0 18px 18px; font-size: 12px; color: #7a7065; }
  .groupe { margin: 0 0 2px; }
  .groupe > h2 {
    font-size: 11px;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: #8b8172;
    margin: 14px 18px 3px;
    font-weight: 600;
  }
  a.piece {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 18px;
    color: inherit;
    text-decoration: none;
    cursor: pointer;
  }
  a.piece:hover { background: var(--papier-fonce); }
  a.piece.actif { background: var(--actif); color: var(--papier); }
  a.piece .ko { font-size: 11px; opacity: .6; font-variant-numeric: tabular-nums; }
  a.piece:focus-visible { outline: 2px solid var(--buis); outline-offset: -2px; }
  main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
  header {
    padding: 14px 22px;
    border-bottom: 1px solid var(--trait);
    display: flex;
    align-items: baseline;
    gap: 18px;
    flex-wrap: wrap;
  }
  header h2 { margin: 0; font-size: 20px; font-weight: 600; }
  header .meta { font-size: 12px; color: #7a7065; font-variant-numeric: tabular-nums; }
  header .options { margin-left: auto; display: flex; gap: 14px; font-size: 13px; }
  label { user-select: none; cursor: pointer; }
  .vig-barre {
    padding: 8px 22px;
    border-bottom: 1px solid var(--trait);
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    font-size: 13px;
  }
  .vig-barre input[type=number] { width: 4em; }
  .vig-barre input[type=file] { max-width: 15em; font-size: 12px; }
  .vig-sortie { display: flex; align-items: center; gap: 10px; margin-left: auto; }
  #vig-apercu { border: 1px solid var(--trait); background: #fff; }
  #scene { flex: 1; position: relative; min-height: 320px; }
  canvas { display: block; width: 100%; height: 100%; }
  #etat {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px;
    color: #7a7065;
    pointer-events: none;
  }
  #etat.erreur { color: #8c2f1d; }
  @media (max-width: 700px) {
    body { flex-direction: column; }
    aside { width: auto; max-height: 38vh; border-right: 0; border-bottom: 1px solid var(--trait); }
  }
</style>
</head>
<body>
<aside>
  <h1>Pieces fairy</h1>
  <p class="compte" id="compte"></p>
  <nav id="liste"></nav>
</aside>
<main>
  <header>
    <h2 id="titre">Choisir une piece</h2>
    <span class="meta" id="meta"></span>
    <span class="options">
      <label><input type="checkbox" id="opt-maps" checked> cartes</label>
      <label><input type="checkbox" id="opt-noir"> camp noir</label>
      <label><input type="checkbox" id="opt-rot" checked> rotation</label>
    </span>
  </header>
  <div class="vig-barre">
    <button id="vig-btn" disabled>Vignette</button>
    <label title="PNG d'une icone, ou planche de sprites (ligne du haut = Blancs)">icône
      <input type="file" id="vig-fichier" accept="image/png,image/*"></label>
    <label title="colonne dans la planche (depuis 0) ; vide = image entiere">col.
      <input type="number" id="vig-col" min="0" step="1"></label>
    <span class="meta" id="vig-vue"></span>
    <span class="vig-sortie" id="vig-sortie" hidden>
      <canvas id="vig-apercu" width="200" height="120"></canvas>
      <a id="vig-lien" download>enregistrer</a>
    </span>
  </div>
  <div id="scene"><div id="etat">Chargement de three.js…</div></div>
</main>

<script>
/* Inventaire releve par make-fairy-viewer.py : une page statique ne peut pas
   lister un dossier. Relancer le script apres ajout ou regeneration. */
const GROUPES = __GROUPES__;
/* Dossier de three.js, relatif a cette page ; null si le script ne l'a pas
   trouve a la generation (relancer avec --three). */
const TROIS = __TROIS__;
/* Modules complementaires a charger apres three.js, dans cet ordre. */
const TROIS_ADDONS = __TROIS_ADDONS__;

const etat = document.getElementById('etat');
const scene3d = document.getElementById('scene');
let THREE, renderer, scene, camera, courant = null, socle;
let rotation = true, angle = 0.6, hauteur = 0.35, distance = 1;

function dit(msg, erreur) {
  etat.textContent = msg || '';
  etat.classList.toggle('erreur', !!erreur);
  etat.style.display = msg ? 'flex' : 'none';
}

/* three.js du depot est le build CommonJS (exports.X = X) : il ne s'attache
   pas tout seul a window. On l'evalue dans un wrapper, exactement comme le
   fait src/browser/browser-script-loader.js. */
async function chargeThree() {
  if (!TROIS)
    throw new Error('dossier de three.js inconnu — regenerer la page avec '
                    + '--three /chemin/vers/third-party');
  const src = await (await fetch(TROIS + '/three.js')).text();
  THREE = new Function('exports', src + '\n;return exports;')({});
  window.THREE = THREE;
  /* Jocly desactive la gestion des couleurs (jocly.game.js) : ses teintes ont
     ete reglees sans elle. Meme choix ici pour un rendu comparable au jeu. */
  THREE.ColorManagement.enabled = false;
  for (const f of TROIS_ADDONS)
    await new Promise((ok, ko) => {
      const s = document.createElement('script');
      s.src = TROIS + '/' + f;
      s.onload = ok;
      s.onerror = () => ko(new Error(f + ' introuvable'));
      document.head.appendChild(s);
    });
}

function construitScene() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  scene3d.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  eclaire(scene);
  socle = new THREE.Group();
  scene.add(socle);
  redimensionne();
  addEventListener('resize', redimensionne);
  souris();
  boucle();
}

/* Memes lumieres pour l'apercu et les vignettes : elles sont fixes dans la
   scene, la camera tourne autour - la vignette montre donc l'eclairage vu. */
function eclaire(sc) {
  sc.add(new THREE.AmbientLight(0xffffff, 1.1));
  const cle = new THREE.DirectionalLight(0xffffff, 2.2);
  cle.position.set(3, 5, 4);
  sc.add(cle);
  const appoint = new THREE.DirectionalLight(0xffffff, 0.7);
  appoint.position.set(-4, 2, -2);
  sc.add(appoint);
}

function redimensionne() {
  const r = scene3d.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / Math.max(r.height, 1);
  camera.updateProjectionMatrix();
}

function souris() {
  let tire = false, x0 = 0, y0 = 0;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', e => {
    tire = true; x0 = e.clientX; y0 = e.clientY; el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointerup', e => { tire = false; el.releasePointerCapture(e.pointerId); });
  el.addEventListener('pointermove', e => {
    if (!tire) return;
    angle -= (e.clientX - x0) * 0.01;
    hauteur = Math.max(-0.2, Math.min(1.2, hauteur + (e.clientY - y0) * 0.006));
    x0 = e.clientX; y0 = e.clientY;
  });
  el.addEventListener('wheel', e => {
    e.preventDefault();
    distance = Math.max(0.45, Math.min(3, distance * (1 + Math.sign(e.deltaY) * 0.12)));
  }, { passive: false });
}

function boucle() {
  requestAnimationFrame(boucle);
  if (rotation && courant) angle += 0.005;
  const r = 4.2 * distance;
  camera.position.set(Math.sin(angle) * r * Math.cos(hauteur),
                      Math.sin(hauteur) * r + 1.4,
                      Math.cos(angle) * r * Math.cos(hauteur));
  camera.lookAt(0, 1.4, 0);
  renderer.render(scene, camera);
}

/* jocly peint ses atlas dans un canvas puis THREE.Texture(canvas), dont flipY
   vaut true ; les cartes sont ecrites retournees pour cela. TextureLoader a le
   meme flipY par defaut : le placage est donc identique a celui du jeu. */
function carte(url, srgb) {
  return new Promise(ok => {
    new THREE.TextureLoader().load(url, t => {
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      ok(t);
    }, undefined, () => ok(null));
  });
}

async function affiche(p, lien) {
  document.querySelectorAll('a.piece').forEach(a => a.classList.remove('actif'));
  if (lien) lien.classList.add('actif');
  document.getElementById('titre').textContent = p.name;
  document.getElementById('meta').textContent =
    [p.folder + '/', p.tris ? p.tris + ' triangles' : null, p.ko + ' Ko',
     p.diffuse ? null : 'sans diffuse', p.normal ? null : 'sans normale']
    .filter(Boolean).join('  ·  ');
  dit('Chargement de ' + p.name + '…');
  location.hash = p.folder + '/' + p.name;

  let objet;
  try {
    objet = await chargePiece(p);
  } catch (e) {
    dit('Impossible de lire ' + p.gltf + ' : ' + e.message, true);
    return;
  }
  socle.clear();
  socle.add(objet);
  courant = objet;
  pieceCourante = p;
  appliqueOptions();
  dit('');
  document.getElementById('vig-btn').disabled = false;
  document.getElementById('vig-sortie').hidden = true;
}

/* La piece texturee, centree sur l'axe et le pied a y=0, comme sur un plateau. */
async function chargePiece(p) {
  const gltf = await new THREE.GLTFLoader().loadAsync(p.gltf);
  const [diff, norm] = await Promise.all([
    p.diffuse ? carte(p.diffuse, true) : null,
    p.normal ? carte(p.normal, false) : null,
  ]);
  const objet = gltf.scene;
  objet.traverse(o => {
    if (!o.isMesh) return;
    o.material = new THREE.MeshPhongMaterial({
      color: 0xffffff, shininess: 18, specular: 0x1a1a1a,
      map: diff || null, normalMap: norm || null,
    });
    o.userData.diff = diff;
  });
  const boite = new THREE.Box3().setFromObject(objet);
  const c = boite.getCenter(new THREE.Vector3());
  objet.position.set(-c.x, -boite.min.y, -c.z);
  return objet;
}

/* ------------------------------------------------------------ vignettes

   Format des images de res/rules/fairy : 200x120, fond blanc opaque, icone 2D
   dans la moitie gauche, piece 3D dans la moitie droite, cadree au plus juste
   a VIG.marge pixels pres. Le rendu se fait a VIG.sur fois la taille puis est
   reduit par moities successives : aretes nettes sans escalier. */
const VIG = { l: 200, h: 120, marge: 4, sur: 4, fov: 20 };
let pieceCourante = null, iconeChoisie = null, rendeur = null;

/* Un seul contexte WebGL pour toutes les vignettes : un navigateur n'en garde
   qu'une quinzaine, et le lot en enchaine des dizaines. */
function rendeurVignette() {
  if (!rendeur) {
    rendeur = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    rendeur.setPixelRatio(1);
    rendeur.setClearColor(0xffffff, 1);
  }
  return rendeur;
}

/* La piece seule sur fond blanc, w x h, vue depuis (angle, hauteur) comme
   dans l'apercu, cadree sur ses sommets reels et non sur sa boite englobante. */
function rendu3D(objet, angle, hauteur, w, h) {
  const W = w * VIG.sur, H = h * VIG.sur;
  const r = rendeurVignette();
  r.setSize(W, H, false);
  const sc = new THREE.Scene();
  eclaire(sc);
  const parent = objet.parent;
  sc.add(objet);
  objet.updateMatrixWorld(true);

  const pts = [];
  objet.traverse(o => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    const pas = Math.max(1, Math.floor(pos.count / 6000));
    for (let i = 0; i < pos.count; i += pas)
      pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld));
  });

  const cam = new THREE.PerspectiveCamera(VIG.fov, W / H, 0.01, 1000);
  const dir = new THREE.Vector3(Math.sin(angle) * Math.cos(hauteur), Math.sin(hauteur),
                                Math.cos(angle) * Math.cos(hauteur));
  const boite = new THREE.Box3().setFromObject(objet);
  const cible = boite.getCenter(new THREE.Vector3());
  const t = Math.tan(VIG.fov * Math.PI / 360);
  let dist = boite.getSize(new THREE.Vector3()).length() / t;
  const limX = 1 - 2 * VIG.marge / w, limY = 1 - 2 * VIG.marge / h;
  const q = new THREE.Vector3(), droite = new THREE.Vector3(), haut = new THREE.Vector3();
  /* perspective : quelques passes suffisent pour converger au pixel pres */
  for (let k = 0; k < 6; k++) {
    cam.position.copy(cible).addScaledVector(dir, dist);
    cam.lookAt(cible);
    cam.updateMatrixWorld();
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of pts) {
      q.copy(p).project(cam);
      x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x);
      y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
    }
    const hh = dist * t, hw = hh * cam.aspect;
    droite.setFromMatrixColumn(cam.matrixWorld, 0);
    haut.setFromMatrixColumn(cam.matrixWorld, 1);
    cible.addScaledVector(droite, (x0 + x1) / 2 * hw).addScaledVector(haut, (y0 + y1) / 2 * hh);
    dist *= Math.max((x1 - x0) / 2 / limX, (y1 - y0) / 2 / limY);
  }
  cam.position.copy(cible).addScaledVector(dir, dist);
  cam.lookAt(cible);
  r.render(sc, cam);
  if (parent) parent.add(objet); else sc.remove(objet);

  let src = r.domElement, sw = W, sh = H;
  while (sw > w) {
    sw = Math.max(w, sw / 2); sh = Math.max(h, sh / 2);
    const c = document.createElement('canvas');
    c.width = sw; c.height = sh;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, sw, sh);
    src = c;
  }
  return src;
}

function chargeImage(url) {
  return new Promise((ok, ko) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => ko(new Error(url + ' introuvable'));
    i.src = url;
  });
}

/* icone = { img, col } : col null = image entiere ; sinon cellule carree de
   la ligne du haut (Blancs) d'une planche de sprites a deux lignes. */
function composeVignette(rendu, icone) {
  const c = document.createElement('canvas');
  c.width = VIG.l; c.height = VIG.h;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, VIG.l, VIG.h);
  g.imageSmoothingQuality = 'high';
  if (icone && icone.img) {
    const im = icone.img;
    let sx = 0, sy = 0, sw = im.naturalWidth, sh = im.naturalHeight;
    /* meme place que les icones res/fairy/icons des images existantes ; une
       cellule de planche est dessinee bord a bord, on la reduit d'autant */
    let dx = 5, dy = 12, dw = 100;
    if (icone.col !== null && icone.col !== undefined && icone.col !== '') {
      sw = sh = im.naturalHeight / 2;
      sx = Number(icone.col) * sw;
      dx = 5; dy = 15; dw = 90;
    }
    /* les planches ont souvent un fond noir presque transparent (alpha ~5),
       invisible en jeu mais qui fait un voile gris sur du blanc : l'effacer */
    const t = document.createElement('canvas');
    t.width = t.height = dw;
    const tg = t.getContext('2d');
    tg.imageSmoothingQuality = 'high';
    tg.drawImage(im, sx, sy, sw, sh, 0, 0, dw, dw);
    const px = tg.getImageData(0, 0, dw, dw);
    for (let i = 3; i < px.data.length; i += 4)
      if (px.data[i] < 24) px.data[i] = 0;
    tg.putImageData(px, 0, 0);
    g.drawImage(t, dx, dy);
  }
  g.drawImage(rendu, VIG.l / 2, 0);
  return c;
}

async function iconeDe(p) {
  if (iconeChoisie && iconeChoisie.img)
    return iconeChoisie;
  if (p.icone)
    try {
      return { img: await chargeImage(p.icone.src), col: p.icone.col };
    } catch (e) { console.warn(e.message); }
  return null;
}

/* Point d'entree du lot (--vignettes) : PNG en data URL, ou null. */
window.vignette = async function (dossier, nom, a, h) {
  const g = GROUPES.find(x => x.folder === dossier);
  const p = g && g.pieces.find(x => x.name === nom);
  if (!p) return null;
  const objet = await chargePiece(p);
  const icone = p.icone ? { img: await chargeImage(p.icone.src), col: p.icone.col } : null;
  return composeVignette(rendu3D(objet, a, h, VIG.l / 2, VIG.h), icone).toDataURL('image/png');
};

async function fabriqueVignette() {
  if (!courant) return;
  const p = pieceCourante;
  const col = document.getElementById('vig-col').value;
  if (iconeChoisie) iconeChoisie.col = col === '' ? null : col;
  const c = composeVignette(rendu3D(courant, angle, hauteur, VIG.l / 2, VIG.h),
                            await iconeDe(p));
  const ap = document.getElementById('vig-apercu');
  ap.getContext('2d').drawImage(c, 0, 0);
  const lien = document.getElementById('vig-lien');
  lien.href = c.toDataURL('image/png');
  lien.download = p.name + '.png';
  document.getElementById('vig-sortie').hidden = false;
}

function initVignettes() {
  document.getElementById('vig-btn').addEventListener('click', fabriqueVignette);
  document.getElementById('vig-fichier').addEventListener('change', async e => {
    const f = e.target.files[0];
    iconeChoisie = f ? { img: await chargeImage(URL.createObjectURL(f)), col: null } : null;
    /* une planche est bien plus large que haute : proposer la colonne 0 */
    if (iconeChoisie && iconeChoisie.img.naturalWidth > 1.5 * iconeChoisie.img.naturalHeight
        && document.getElementById('vig-col').value === '')
      document.getElementById('vig-col').value = 0;
  });
  setInterval(() => {
    document.getElementById('vig-vue').textContent =
      'angle ' + angle.toFixed(2) + '  ·  hauteur ' + hauteur.toFixed(2);
  }, 250);
}

/* Camp noir : fairy-set-view.js redessine l'image trois fois en multiply
   (donc v^3) puis fond une teinte noire. Approximation ici par la couleur du
   materiau, suffisante pour juger du contraste entre les deux camps. */
function appliqueOptions() {
  if (!courant) return;
  const maps = document.getElementById('opt-maps').checked;
  const noir = document.getElementById('opt-noir').checked;
  courant.traverse(o => {
    if (!o.isMesh) return;
    o.material.map = maps ? (o.userData.diff || null) : null;
    o.material.color.setHex(noir ? 0x2e2318 : 0xffffff);
    o.material.needsUpdate = true;
  });
}

function construitListe() {
  const nav = document.getElementById('liste');
  let n = 0;
  for (const g of GROUPES) {
    const bloc = document.createElement('div');
    bloc.className = 'groupe';
    const h = document.createElement('h2');
    h.textContent = g.folder;
    bloc.appendChild(h);
    for (const p of g.pieces) {
      n++;
      const a = document.createElement('a');
      a.className = 'piece';
      a.href = '#' + g.folder + '/' + p.name;
      a.innerHTML = '<span></span><span class="ko"></span>';
      a.firstChild.textContent = p.name;
      a.lastChild.textContent = p.ko + ' Ko';
      a.addEventListener('click', e => { e.preventDefault(); affiche(p, a); });
      bloc.appendChild(a);
      p._lien = a;
    }
    nav.appendChild(bloc);
  }
  document.getElementById('compte').textContent =
    n + ' pieces dans ' + GROUPES.length + ' dossiers';
}

function depuisAdresse() {
  const cle = decodeURIComponent(location.hash.slice(1));
  for (const g of GROUPES)
    for (const p of g.pieces)
      if (g.folder + '/' + p.name === cle) return [p, p._lien];
  return [null, null];
}

(async function () {
  construitListe();
  for (const o of ['opt-maps', 'opt-noir'])
    document.getElementById(o).addEventListener('change', appliqueOptions);
  document.getElementById('opt-rot').addEventListener('change', e => {
    rotation = e.target.checked;
  });
  try {
    await chargeThree();
  } catch (e) {
    dit('three.js n\'a pas pu etre charge : ' + e.message
        + '. Servir les fichiers par HTTP (python3 -m http.server 8000) depuis '
        + 'un dossier qui contient a la fois la page, les pieces et three.js.', true);
    return;
  }
  construitScene();
  initVignettes();
  window.pret = true;
  const [p, lien] = depuisAdresse();
  if (p) affiche(p, lien);
  else dit('Choisir une piece dans la liste.');
  addEventListener('hashchange', () => {
    const [p2, l2] = depuisAdresse();
    if (p2 && (!courant || document.getElementById('titre').textContent !== p2.name))
      affiche(p2, l2);
  });
})();
</script>
</body>
</html>
"""


def parse_icone(spec):
    """nom=chemin.png ou nom=planche.png:colonne"""
    if '=' not in spec:
        sys.exit(f'--icone {spec} : attendu nom=fichier.png[:colonne]')
    nom, chemin = spec.split('=', 1)
    col = None
    m = re.match(r'^(.*):(\d+)$', chemin)
    if m and not os.path.isfile(chemin):
        chemin, col = m.group(1), int(m.group(2))
    chemin = os.path.abspath(os.path.expanduser(chemin))
    if not os.path.isfile(chemin):
        sys.exit(f'--icone {spec} : {chemin} introuvable')
    return nom.strip(), chemin, col


def selection(groups, seulement):
    """[(dossier, nom)] des pieces retenues par --seulement (dossier/ ou nom)."""
    filtres = [f.strip() for f in (seulement or '').split(',') if f.strip()]
    for g in groups:
        for p in g['pieces']:
            if not filtres or any(
                    (f.endswith('/') and g['folder'] == f[:-1])
                    or f in (p['name'], g['folder'] + '/' + p['name'])
                    for f in filtres):
                yield g['folder'], p['name']


def ajoute_alias(groups, alias):
    """--alias NOM=PIECE : la meme piece 3D sous un autre nom, pour lui donner
    une autre icone et ecrire NOM.png (ex. immobilizer=wizard : le maillage du
    magicien, mais le chapeau de la planche baroque et non l'icone w-wizard)."""
    for spec in alias:
        if '=' not in spec:
            sys.exit(f'--alias {spec} : attendu nom=piece ou nom=dossier/piece')
        nom, cible = (x.strip() for x in spec.split('=', 1))
        trouve = None
        for g in groups:
            for p in g['pieces']:
                if cible in (p['name'], g['folder'] + '/' + p['name']):
                    trouve = (g, p)
        if not trouve:
            sys.exit(f'--alias {spec} : piece {cible} introuvable')
        g, p = trouve
        copie = dict(p, name=nom, icone=None)
        g['pieces'].append(copie)


def ecrit_page(out, pieces, three, icones, alias=()):
    """Ecrit la page ; retourne (groups, up, trois)."""
    dossier_page = os.path.dirname(out) or '.'
    rel = lambda c: os.path.relpath(c, dossier_page).replace(os.sep, '/')
    up = rel(pieces)
    trois = rel(three) if three else None
    groups = scan(pieces, up)
    if not groups:
        sys.exit(f'aucun .gltf trouve dans {pieces}')
    ajoute_alias(groups, alias)
    connus = {p['name'] for g in groups for p in g['pieces']}
    for nom, chemin, col in icones:
        if nom not in connus:
            print(f'  attention : --icone {nom} ne correspond a aucune piece 3D '
                  '(--icone vise le nom du .gltf ; sinon --alias ' + nom + '=<piece>)')
        for g in groups:
            for p in g['pieces']:
                if p['name'] == nom:
                    p['icone'] = {'src': rel(chemin), 'col': col}
    data = [{'folder': g['folder'],
             'pieces': [{k: v for k, v in p.items() if not k.startswith('_')}
                        for p in g['pieces']]} for g in groups]
    html = (HTML.replace('__GROUPES__', json.dumps(data, ensure_ascii=False, indent=1))
                .replace('__TROIS_ADDONS__', json.dumps(addons(three) if three else []))
                .replace('__TROIS__', json.dumps(trois)))
    os.makedirs(dossier_page, exist_ok=True)
    with open(out, 'w') as fh:
        fh.write(html)
    return groups, up, trois


def vignettes(a, pieces, three, icones):
    """Rend chaque piece retenue en PNG 200x120 dans a.vignettes, par un
    Chromium sans fenetre qui charge la page servie en local."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit('--vignettes demande Playwright : pip install playwright '
                 '&& playwright install chromium')
    if not three:
        sys.exit('three.js introuvable — le passer avec --three')
    import base64
    import functools
    import http.server
    import threading

    # une racine commune pour servir la page, les pieces, three.js et les icones
    racine = os.path.commonpath([pieces, three] + [c for _, c, _ in icones])
    page = os.path.join(racine, '.vignettes-tmp.html')
    sortie = os.path.abspath(a.vignettes)
    os.makedirs(sortie, exist_ok=True)

    class Muet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    serveur = http.server.ThreadingHTTPServer(
        ('127.0.0.1', 0), functools.partial(Muet, directory=racine))
    threading.Thread(target=serveur.serve_forever, daemon=True).start()
    try:
        groups, _, _ = ecrit_page(page, pieces, three, icones, a.alias)
        retenues = list(selection(groups, a.seulement))
        if not retenues:
            sys.exit(f'--seulement {a.seulement} : aucune piece retenue')
        noms = [n for _, n in retenues]
        url = f'http://127.0.0.1:{serveur.server_port}/.vignettes-tmp.html'
        with sync_playwright() as pw:
            nav = pw.chromium.launch(args=['--use-angle=swiftshader',
                                           '--enable-unsafe-swiftshader'])
            onglet = nav.new_page()
            erreurs = []
            onglet.on('pageerror', lambda e: erreurs.append(str(e)))
            onglet.goto(url)
            try:
                onglet.wait_for_function('window.pret === true', timeout=30000)
            except Exception:
                sys.exit('la page ne s\'est pas initialisee : '
                         + ('; '.join(erreurs) or 'WebGL indisponible ?'))
            sans_icone = []
            for dossier, nom in retenues:
                # deux pieces de meme nom dans deux dossiers : prefixer le dossier
                fichier = (f'{dossier}-{nom}.png' if noms.count(nom) > 1
                           else f'{nom}.png')
                donnees = onglet.evaluate(
                    'async ([d, n, a, h]) => await window.vignette(d, n, a, h)',
                    [dossier, nom, a.angle, a.hauteur])
                if not donnees:
                    print(f'  {dossier}/{nom} : echec')
                    continue
                with open(os.path.join(sortie, fichier), 'wb') as fh:
                    fh.write(base64.b64decode(donnees.split(',', 1)[1]))
                p = next(p for g in groups if g['folder'] == dossier
                         for p in g['pieces'] if p['name'] == nom)
                if not p['icone']:
                    sans_icone.append(nom)
                print(f'  {fichier}')
            nav.close()
        print(f'{len(retenues)} vignettes dans {sortie}')
        if sans_icone:
            print('  sans icone 2D (moitie gauche blanche) : ' + ', '.join(sans_icone))
            print('  -> --icone nom=fichier.png ou nom=planche.png:colonne')
    finally:
        serveur.shutdown()
        if os.path.exists(page):
            os.remove(page)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pieces', help='dossier des pieces (celui qui contient '
                    'un sous-dossier par piece). Defaut : res/fairy a cote de '
                    'ce script, sinon au-dessus, sinon la disposition du depot')
    ap.add_argument('--three', help='dossier contenant three.js et '
                    'three-addons.js (ou GLTFLoader.js + BufferGeometryUtils.js). '
                    'Defaut : third-party/ ou lib/ trouve en remontant depuis '
                    'le script ou les pieces')
    ap.add_argument('--out', default=os.path.join(HERE, 'fairy-viewer.html'),
                    help='page a ecrire (defaut : fairy-viewer.html a cote du script)')
    ap.add_argument('--icone', action='append', default=[], metavar='NOM=PNG[:COL]',
                    help='icone 2D d\'une piece pour sa vignette : un PNG, ou une '
                    'planche de sprites et sa colonne (depuis 0). Repetable. '
                    'Par defaut : res/fairy/icons/w-<nom>.png si elle existe')
    ap.add_argument('--alias', action='append', default=[], metavar='NOM=PIECE',
                    help='ajoute la piece 3D PIECE (nom ou dossier/nom) sous le nom '
                    'NOM, pour lui donner une autre icone et ecrire NOM.png. '
                    'Repetable. Ex. : --alias immobilizer=wizard '
                    '--icone immobilizer=.../baroque-picto-sprites.png:5')
    ap.add_argument('--vignettes', metavar='DOSSIER',
                    help='au lieu d\'ecrire la page, rendre les vignettes 200x120 '
                    'de l\'aide en ligne dans ce dossier (Playwright requis)')
    ap.add_argument('--seulement', metavar='LISTE',
                    help='avec --vignettes : pieces a rendre, separees par des '
                    'virgules - nom, dossier/nom ou dossier/ (tout le dossier)')
    ap.add_argument('--angle', type=float, default=0.6,
                    help='avec --vignettes : angle de vue, en radians (defaut 0.6, '
                    'celui de la page a l\'ouverture ; la page affiche la valeur courante)')
    ap.add_argument('--hauteur', type=float, default=0.35,
                    help='avec --vignettes : elevation de la vue, en radians (defaut 0.35)')
    a = ap.parse_args()

    pieces = trouve_pieces(a.pieces)
    three = trouve_three(a.three, pieces)
    icones = [parse_icone(s) for s in a.icone]

    if a.vignettes:
        vignettes(a, pieces, three, icones)
        return

    out = os.path.abspath(a.out)
    dossier_page = os.path.dirname(out) or '.'
    groups, up, trois = ecrit_page(out, pieces, three, icones, a.alias)

    n = sum(len(g['pieces']) for g in groups)
    print(f'{out}')
    print(f'  {n} pieces dans {len(groups)} dossiers')
    print(f'  pieces  : {pieces}   (depuis la page : {up}/)')
    if three:
        print(f'  three.js: {three}   (depuis la page : {trois}/)')
    else:
        print('  three.js: INTROUVABLE — la page le dira aussi. Le passer avec '
              '--three /chemin/vers/third-party')
    if os.path.relpath(pieces, dossier_page).startswith('..' + os.sep) or \
       (three and os.path.relpath(three, dossier_page).startswith('..' + os.sep)):
        print('  note : la page, les pieces et three.js doivent etre servis par '
              'le meme serveur HTTP (racine commune).')


if __name__ == '__main__':
    main()
