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
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
# disposition du depot jocly2, conservee comme dernier recours seulement
REL_DEPOT = os.path.join('src', 'games', 'chessbase', 'res', 'fairy')
TROIS_JS = ('three.js', 'GLTFLoader.js', 'BufferGeometryUtils.js')


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


def trouve_three(explicite, pieces):
    def complet(c):
        return all(os.path.isfile(os.path.join(c, f)) for f in TROIS_JS)
    if explicite:
        d = os.path.abspath(explicite)
        if not complet(d):
            sys.exit(f'{d} ne contient pas ' + ', '.join(TROIS_JS))
        return d
    for depart in (HERE, pieces):
        d = remonte(depart, 'third-party', 'lib', '.', test=complet)
        if d:
            return d
    return None


def scan(fairy_dir, up):
    """[{folder, pieces: [{name, gltf, diffuse, normal, ko, tris}]}, ...]"""
    groups = []
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
  <div id="scene"><div id="etat">Chargement de three.js…</div></div>
</main>

<script>
/* Inventaire releve par make-fairy-viewer.py : une page statique ne peut pas
   lister un dossier. Relancer le script apres ajout ou regeneration. */
const GROUPES = __GROUPES__;
/* Dossier de three.js, relatif a cette page ; null si le script ne l'a pas
   trouve a la generation (relancer avec --three). */
const TROIS = __TROIS__;

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
  for (const f of ['BufferGeometryUtils.js', 'GLTFLoader.js'])
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
  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const cle = new THREE.DirectionalLight(0xffffff, 2.2);
  cle.position.set(3, 5, 4);
  scene.add(cle);
  const appoint = new THREE.DirectionalLight(0xffffff, 0.7);
  appoint.position.set(-4, 2, -2);
  scene.add(appoint);
  socle = new THREE.Group();
  scene.add(socle);
  redimensionne();
  addEventListener('resize', redimensionne);
  souris();
  boucle();
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

  let gltf;
  try {
    gltf = await new THREE.GLTFLoader().loadAsync(p.gltf);
  } catch (e) {
    dit('Impossible de lire ' + p.gltf + ' : ' + e.message, true);
    return;
  }
  const [diff, norm] = await Promise.all([
    p.diffuse ? carte(p.diffuse, true) : null,
    p.normal ? carte(p.normal, false) : null,
  ]);

  socle.clear();
  const objet = gltf.scene;
  objet.traverse(o => {
    if (!o.isMesh) return;
    o.material = new THREE.MeshPhongMaterial({
      color: 0xffffff, shininess: 18, specular: 0x1a1a1a,
      map: diff || null, normalMap: norm || null,
    });
    o.userData.diff = diff;
  });
  /* centrer sur l'axe et poser le pied a y=0, comme sur un plateau */
  const boite = new THREE.Box3().setFromObject(objet);
  const c = boite.getCenter(new THREE.Vector3());
  objet.position.set(-c.x, -boite.min.y, -c.z);
  socle.add(objet);
  courant = objet;
  appliqueOptions();
  dit('');
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


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--pieces', help='dossier des pieces (celui qui contient '
                    'un sous-dossier par piece). Defaut : res/fairy a cote de '
                    'ce script, sinon au-dessus, sinon la disposition du depot')
    ap.add_argument('--three', help='dossier contenant three.js, GLTFLoader.js '
                    'et BufferGeometryUtils.js. Defaut : third-party/ ou lib/ '
                    'trouve en remontant depuis le script ou les pieces')
    ap.add_argument('--out', default=os.path.join(HERE, 'fairy-viewer.html'),
                    help='page a ecrire (defaut : fairy-viewer.html a cote du script)')
    a = ap.parse_args()

    pieces = trouve_pieces(a.pieces)
    three = trouve_three(a.three, pieces)
    out = os.path.abspath(a.out)
    dossier_page = os.path.dirname(out) or '.'

    # les URL de la page sont relatives a la page elle-meme
    up = os.path.relpath(pieces, dossier_page).replace(os.sep, '/')
    trois = (os.path.relpath(three, dossier_page).replace(os.sep, '/')
             if three else None)

    groups = scan(pieces, up)
    if not groups:
        sys.exit(f'aucun .gltf trouve dans {pieces}')
    data = [{'folder': g['folder'],
             'pieces': [{k: v for k, v in p.items() if not k.startswith('_')}
                        for p in g['pieces']]} for g in groups]
    html = (HTML.replace('__GROUPES__', json.dumps(data, ensure_ascii=False, indent=1))
                .replace('__TROIS__', json.dumps(trois)))
    os.makedirs(dossier_page, exist_ok=True)
    with open(out, 'w') as fh:
        fh.write(html)

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
