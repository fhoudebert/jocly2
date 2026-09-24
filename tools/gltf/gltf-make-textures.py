#!/usr/bin/env python3
"""gltf-make-textures.py — transforme un modele glTF/glb (typiquement sorti de
Blender) en piece d'echecs prete pour la lib Jocly : maillage redimensionne et
allege, socle tourne optionnel, atlas UV par ilots, puis cuisson d'une
diffusemap et d'une normalmap au rendu bois parametrable.

    python3 gltf-make-textures.py modele.glb --name griffon --out res/fairy/griffon --height 2.97 --wood buis --match-median auto

Sorties : <name>.gltf, <name>-diffusemap.jpg, <name>-normalmap.jpg, plus
l'extrait de configuration a coller dans fairy-set-view.js.

Ce que le rendu bois reproduit : la palette et le pas de fil releves sur les
pieces existantes du set (dame, pion, tour, fou). Le bois est evalue comme
texture SOLIDE 3D (cernes autour d'un coeur d'arbre volontairement decentre),
si bien que le fil reste juste d'un ilot a l'autre et qu'aucune couture
n'apparait, contrairement a un motif peint dans l'espace UV.

Dependances : numpy, pillow, trimesh, fast-simplification.
params :
seuil de maillage  : --tris, avec 6000 par défaut. --tris 4000
--base-seg pour descendre le socle tourné de 48 à 24 ou 32 segments
Et pour un modèle Blender dépourvu de base, il faut donner --cut Y


"""
import argparse
import base64
import json
import os
import sys

import numpy as np
from PIL import Image

try:
    import trimesh
except ImportError:                                    # pragma: no cover
    sys.exit('trimesh manquant :  pip install trimesh fast-simplification')


# ---------------------------------------------------------------- palette bois
# Rampe relevee sur les zones planes des atlas dame / pion / tour / fou :
# du plus clair au plus sombre. --wood-from permet d'en relever une autre.
WOOD_LUT_DEFAULT = np.array([
    [226, 174, 122], [214, 163, 112], [208, 158, 108], [205, 157, 107],
    [202, 153, 103], [197, 149, 101], [195, 146,  97], [190, 142,  94],
    [186, 139,  92], [186, 139,  88], [185, 139,  87], [185, 139,  87],
    [184, 138,  87], [184, 138,  86], [181, 136,  87], [180, 135,  87],
    [179, 133,  87], [177, 130,  86], [174, 129,  87], [175, 127,  84],
    [171, 126,  85], [169, 124,  85], [167, 122,  86], [166, 122,  84],
    [168, 120,  77], [163, 119,  76], [160, 117,  74], [157, 114,  73],
    [153, 112,  71], [148, 107,  66], [137,  98,  61], [115,  83,  51],
    [87,   60,  33]], float) / 255


def lut_from_image(path, steps=33, win=64):
    """Releve une rampe de bois sur une diffusemap existante : on ne garde que
    les carres entierement couverts (donc du bois, pas du fond noir), puis on
    echantillonne la distribution triee par luminance."""
    a = np.asarray(Image.open(path).convert('RGB'), float)
    mask = (a.max(2) > 40)
    integ = np.cumsum(np.cumsum(mask.astype(int), 0), 1)

    def full(y, x, s):
        y2, x2 = y + s - 1, x + s - 1
        t = integ[y2, x2]
        if y:
            t -= integ[y - 1, x2]
        if x:
            t -= integ[y2, x - 1]
        if y and x:
            t += integ[y - 1, x - 1]
        return t == s * s

    px = []
    h, w = mask.shape
    for y in range(0, h - win, win // 2):
        for x in range(0, w - win, win // 2):
            if full(y, x, win):
                px.append(a[y:y + win, x:x + win].reshape(-1, 3))
    if not px:
        raise SystemExit(f'{path} : aucune zone de bois pleine trouvee')
    P = np.concatenate(px)
    P = P[np.argsort(P.mean(1))]
    idx = (np.linspace(0.01, 0.99, steps) * (len(P) - 1)).astype(int)
    lut = np.stack([P[max(0, i - 200):i + 200].mean(0) for i in idx])[::-1]
    print(f'  palette relevee sur {os.path.basename(path)} '
          f'({len(P)} px) : clair {lut[0].round(0)} -> sombre {lut[-1].round(0)}')
    return lut / 255


# ---------------------------------------------------------------- bruit solide
_G = 64


def _grid(seed):
    return np.random.default_rng(seed).random((_G, _G, _G))


def noise3(p, freq, grid):
    q = p * freq
    i = np.floor(q).astype(np.int64)
    f = q - i
    f = f * f * (3 - 2 * f)
    i0, i1 = i % _G, (i + 1) % _G
    n = grid
    c = [n[a[:, 0], b[:, 1], c_[:, 2]] for a, b, c_ in
         ((i0, i0, i0), (i1, i0, i0), (i0, i1, i0), (i1, i1, i0),
          (i0, i0, i1), (i1, i0, i1), (i0, i1, i1), (i1, i1, i1))]
    x00 = c[0] + (c[1] - c[0]) * f[:, 0]
    x10 = c[2] + (c[3] - c[2]) * f[:, 0]
    x01 = c[4] + (c[5] - c[4]) * f[:, 0]
    x11 = c[6] + (c[7] - c[6]) * f[:, 0]
    y0 = x00 + (x10 - x00) * f[:, 1]
    y1 = x01 + (x11 - x01) * f[:, 1]
    return y0 + (y1 - y0) * f[:, 2] - 0.5


def turbulence(p, freq, grid, octaves=4):
    s, a, f = 0.0, 1.0, freq
    for _ in range(octaves):
        s = s + a * noise3(p, f, grid)
        a *= 0.5
        f *= 2.07
    return s


# ---------------------------------------------------------------- geometrie
PROFILE = [                      # socle tourne, releve sur les pieces du set
    (0.000, 0.000), (0.000, 0.908), (0.036, 1.000), (0.167, 1.000),
    (0.394, 0.946), (0.537, 0.843), (0.657, 0.731), (0.752, 0.676),
    (0.836, 0.659), (0.902, 0.714), (0.991, 0.688), (1.000, 0.669),
    (1.000, 0.000),
]
HARD = {1, 11}                   # rangees dedoublees -> aretes vives


def load_mesh(path):
    obj = trimesh.load(path, process=False, force='mesh')
    if not isinstance(obj, trimesh.Trimesh):
        obj = trimesh.util.concatenate(list(obj.geometry.values()))
    m = trimesh.Trimesh(vertices=np.asarray(obj.vertices, float),
                        faces=np.asarray(obj.faces), process=False)
    m.merge_vertices()           # les exports Blender/trimesh dupliquent
    # Faces d'aire nulle (deux sommets confondus, ou trois sommets alignes) :
    # trimesh leur donne une normale (0,0,0). Un ilot compose de ces seules
    # faces a donc un axe de projection dont la norme est nulle ; le
    # ax / norm(ax) de unwrap() renvoie alors NaN, et split_folded plante sur
    # int(np.floor(NaN)). Ces faces ne portent aucune surface : on les retire.
    keep = m.area_faces > 1e-12
    if not keep.all():
        print(f'  {int((~keep).sum())} face(s) d\'aire nulle retiree(s) '
              f'(sommets confondus ou alignes)')
        m.update_faces(keep)
        m.remove_unreferenced_vertices()
    return m


def normalize(m, height, up):
    if up == 'z':                # Blender natif : Z vers le haut
        R = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], float)
        m.vertices = m.vertices @ R.T
    v = m.vertices
    s = height / (v[:, 1].max() - v[:, 1].min())
    v = v * s
    lo = v[:, 1].min()
    keep = v[:, 1] < lo + 0.12 * height          # empreinte au sol
    cx, cz = v[keep, 0].mean(), v[keep, 2].mean()
    m.vertices = np.stack([v[:, 0] - cx, v[:, 1] - lo, v[:, 2] - cz], 1)
    return m


def split_body(m, mode, height, forced_cut=None):
    """Renvoie (corps, plan de coupe). En mode auto, le socle ne remplace que
    ce qui se trouve sous la base de la composante principale, et seulement si
    cette base est franchement au-dessus du sol : un modele qui porte deja son
    propre socle est laisse tel quel."""
    if mode == 'none':
        return m, None
    if forced_cut is not None:
        cut = float(forced_cut)
    else:
        comps = m.split(only_watertight=False)
        if len(comps) == 1:
            print('  socle : le modele est d\'un seul tenant, conserve tel quel')
            return m, None
        big = max(comps, key=lambda c: len(c.faces))
        cut = float(big.vertices[:, 1].min())
        if cut < 0.05 * height:
            print(f'  socle : base du corps a y={cut:.3f}, trop bas pour un socle '
                  f'-> modele conserve tel quel')
            return m, None
    keep = []
    dropped = 0
    for c in m.split(only_watertight=False):
        if c.vertices[:, 1].min() >= cut - 1e-4:
            keep.append(c)
        else:
            dropped += len(c.faces)
    if not keep:
        raise SystemExit(f'coupe a y={cut} : il ne reste rien du modele')
    print(f'  socle : coupe a y={cut:.3f}, {dropped} triangles remplaces')
    return trimesh.util.concatenate(keep), cut


def decimate(m, target):
    if not target:
        return m
    if len(m.faces) <= target:
        print(f'  decimation : {len(m.faces)} triangles <= budget {target}, '
              f'aucune reduction (baisser --tris pour alleger)')
        return m
    import fast_simplification
    red = 1.0 - target / len(m.faces)
    v, f = fast_simplification.simplify(np.asarray(m.vertices, np.float32),
                                        np.asarray(m.faces, np.int32),
                                        target_reduction=red)
    out = trimesh.Trimesh(vertices=v, faces=f, process=False)
    out.merge_vertices()
    print(f'  decimation : {len(m.faces)} -> {len(out.faces)} triangles')
    return out


def pedestal(top_y, radius, seg=48):
    """seg = nombre de segments : 48 par defaut, 24 suffit pour un petit rendu
    et divise par deux le cout en triangles du socle."""
    th = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    cs, sn = np.cos(th), np.sin(th)
    verts, up_rows, lo_rows = [], [], []

    def add(y, r):
        idx = len(verts)
        if r < 1e-9:
            verts.append([0.0, y, 0.0])
            return ('pole', idx)
        verts.extend(np.stack([r * cs, np.full(seg, y), r * sn], 1))
        return ('ring', idx)

    for i, (fy, fr) in enumerate(PROFILE):
        a = add(fy * top_y, fr * radius)
        b = add(fy * top_y, fr * radius) if i in HARD else a
        up_rows.append(a)
        lo_rows.append(b)

    faces = []
    for i in range(len(PROFILE) - 1):
        (ta, ia), (tb, ib) = lo_rows[i], up_rows[i + 1]
        for k in range(seg):
            k1 = (k + 1) % seg
            if ta == 'pole':
                faces.append([ia, ib + k, ib + k1])
            elif tb == 'pole':
                faces.append([ib, ia + k1, ia + k])
            else:
                faces.append([ia + k, ib + k, ib + k1])
                faces.append([ia + k, ib + k1, ia + k1])
    m = trimesh.Trimesh(vertices=np.array(verts, float), faces=np.array(faces),
                        process=False)
    v = m.vertices
    side = np.hypot(v[:, 0], v[:, 2]) > 0.3 * radius
    rad = np.stack([v[:, 0], np.zeros(len(v)), v[:, 2]], 1)
    if (m.vertex_normals[side] * rad[side]).sum(1).mean() < 0:
        m.invert()
    print(f'  socle tourne : {len(m.faces)} triangles, rayon {radius:.3f}, '
          f'plateau y={top_y:.3f}')
    return m


# ---------------------------------------------------------------- atlas
def charts(m, cone_deg=46):
    cone = np.cos(np.radians(cone_deg))
    fn, area = m.face_normals, m.area_faces
    adj = [[] for _ in range(len(m.faces))]
    for a, b in m.face_adjacency:
        adj[a].append(b)
        adj[b].append(a)
    label = np.full(len(m.faces), -1)
    out = []
    for seed in np.argsort(-area):
        if label[seed] >= 0:
            continue
        cid = len(out)
        acc, label[seed] = fn[seed] * area[seed], cid
        stack, members = [seed], [seed]
        while stack:
            for nb in adj[stack.pop()]:
                if label[nb] >= 0:
                    continue
                axis = acc / max(np.linalg.norm(acc), 1e-12)
                if fn[nb] @ axis < cone:
                    continue
                label[nb] = cid
                acc = acc + fn[nb] * area[nb]
                stack.append(nb)
                members.append(nb)
        out.append((np.array(members), acc / max(np.linalg.norm(acc), 1e-12)))
    return out, label


def merge_small(m, ch, label, min_frac=0.012, cone_deg=78, maxang_deg=60):
    cone, maxang = np.cos(np.radians(cone_deg)), np.cos(np.radians(maxang_deg))
    area, fn = m.area_faces, m.face_normals
    total = area.sum()
    members = [list(c[0]) for c in ch]
    axes = [c[1] for c in ch]
    alive = [True] * len(ch)
    lab = label.copy()

    def neighbours(cid):
        nb = set()
        for a, b in m.face_adjacency:
            if lab[a] == cid and lab[b] != cid:
                nb.add(lab[b])
            elif lab[b] == cid and lab[a] != cid:
                nb.add(lab[a])
        return nb

    changed = True
    while changed:
        changed = False
        sizes = sorted((sum(area[members[i]]) if alive[i] else 1e9, i)
                       for i in range(len(ch)))
        for a_i, i in sizes:
            if not alive[i] or a_i > min_frac * total:
                break
            best, bestdot = None, cone
            for j in neighbours(i):
                if j == i or not alive[j]:
                    continue
                d = float(axes[i] @ axes[j])
                if d <= bestdot:
                    continue
                w_i, w_j = sum(area[members[i]]), sum(area[members[j]])
                ax = axes[i] * w_i + axes[j] * w_j
                ax = ax / np.linalg.norm(ax)
                if (fn[members[i] + members[j]] @ ax).min() < maxang:
                    continue
                best, bestdot = j, d
            if best is None:
                continue
            w_i, w_j = sum(area[members[i]]), sum(area[members[best]])
            ax = axes[i] * w_i + axes[best] * w_j
            axes[best] = ax / np.linalg.norm(ax)
            members[best] += members[i]
            for f in members[i]:
                lab[f] = best
            alive[i] = False
            changed = True
            break
    return [(np.array(members[i]), axes[i]) for i in range(len(ch)) if alive[i]], lab


def project(m, faces_idx, axis):
    up = np.array([0.0, 1.0, 0.0])
    if abs(axis @ up) > 0.95:
        up = np.array([1.0, 0.0, 0.0])
    t = np.cross(up, axis); t /= np.linalg.norm(t)
    b = np.cross(axis, t)
    vids = np.unique(m.faces[faces_idx].ravel())
    p = m.vertices[vids]
    return vids, np.stack([p @ t, p @ b], 1)


def connected_groups(m, faces_idx):
    fset = set(faces_idx.tolist())
    adj = {}
    for a, b in m.face_adjacency:
        if a in fset and b in fset:
            adj.setdefault(a, []).append(b)
            adj.setdefault(b, []).append(a)
    seen, groups = set(), []
    for f in faces_idx:
        if f in seen:
            continue
        stack, grp = [f], []
        seen.add(f)
        while stack:
            cur = stack.pop()
            grp.append(cur)
            for nb in adj.get(cur, ()):
                if nb not in seen:
                    seen.add(nb)
                    stack.append(nb)
        groups.append(np.array(grp))
    return groups


def split_folded(m, ch, scale=90.0, res=1024):
    """Un ilot dont la projection se recouvre est replie : on le coupe par la
    profondeur puis par connexite. Sans cette garantie, l'AO cuite melange deux
    couches de surface dans le meme texel."""
    out, todo, guard = [], list(ch), 0
    while todo:
        members, axis = todo.pop()
        guard += 1
        if guard > 4000:
            out.append((members, axis))
            continue
        vids, xy = project(m, members, axis)
        idx = {v: k for k, v in enumerate(vids)}
        xy = xy - xy.min(0)
        n = np.zeros((res, res), np.int16)
        ok = True
        for f in m.faces[members]:
            t = np.array([xy[idx[f[0]]], xy[idx[f[1]]], xy[idx[f[2]]]]) * scale
            x0, x1 = int(np.floor(t[:, 0].min())), min(int(np.ceil(t[:, 0].max())), res - 1)
            y0, y1 = int(np.floor(t[:, 1].min())), min(int(np.ceil(t[:, 1].max())), res - 1)
            if x1 < x0 or y1 < y0:
                continue
            gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + .5, np.arange(y0, y1 + 1) + .5)
            det = ((t[1, 1] - t[2, 1]) * (t[0, 0] - t[2, 0]) +
                   (t[2, 0] - t[1, 0]) * (t[0, 1] - t[2, 1]))
            if abs(det) < 1e-9:
                continue
            w0 = ((t[1, 1] - t[2, 1]) * (gx - t[2, 0]) + (t[2, 0] - t[1, 0]) * (gy - t[2, 1])) / det
            w1 = ((t[2, 1] - t[0, 1]) * (gx - t[2, 0]) + (t[0, 0] - t[2, 0]) * (gy - t[2, 1])) / det
            msk = (w0 >= 0) & (w1 >= 0) & (w0 + w1 <= 1)
            yy, xx = np.nonzero(msk)
            if len(yy) == 0:
                continue
            sel = (yy + y0, xx + x0)
            if (n[sel] > 0).any():
                ok = False
                break
            n[sel] += 1
        if ok:
            out.append((members, axis))
            continue
        depth = m.triangles_center[members] @ axis
        med = np.median(depth)
        for side in (depth <= med, depth > med):
            sub = members[side]
            if len(sub) == 0 or len(sub) == len(members):
                out.append((members, axis))
                break
            for grp in connected_groups(m, sub):
                ax = (m.face_normals[grp] * m.area_faces[grp][:, None]).sum(0)
                nrm = np.linalg.norm(ax)
                if not np.isfinite(nrm) or nrm < 1e-12:
                    # ilot dont les normales s'annulent (surface repliee sur
                    # elle-meme, ou faces degeneres residuelles) : sans ce
                    # repli, l'axe vaudrait NaN et split_folded planterait.
                    ax = m.face_normals[grp[np.argmax(m.area_faces[grp])]]
                    nrm = np.linalg.norm(ax)
                    if not np.isfinite(nrm) or nrm < 1e-12:
                        ax, nrm = np.array([0.0, 1.0, 0.0]), 1.0
                todo.append((grp, ax / nrm))
    return out


def pack(boxes, scale, res, pad):
    dims = [(min(w, h), max(w, h), w > h) for w, h in boxes]
    pos = [None] * len(boxes)
    x = y = shelf = 0
    for i in np.argsort([-d[1] for d in dims]):
        w, h, rot = dims[i]
        pw, ph = int(np.ceil(w * scale)) + pad, int(np.ceil(h * scale)) + pad
        if pw + pad > res or ph + pad > res:
            return None
        if x + pw > res:
            x, y, shelf = 0, y + shelf, 0
        if y + ph > res:
            return None
        pos[i] = (x + pad // 2, y + pad // 2, rot)
        x += pw
        shelf = max(shelf, ph)
    return pos


def unwrap(m, res, pad):
    ch, label = charts(m)
    ch, label = merge_small(m, ch, label)
    ch = split_folded(m, ch)
    vn = np.asarray(m.vertex_normals)
    projected = []
    for members, axis in ch:
        vids, xy = project(m, members, axis)
        projected.append((members, vids, xy - xy.min(0)))
    boxes = [(xy[:, 0].max(), xy[:, 1].max()) for _, _, xy in projected]
    lo, hi = 1.0, 4000.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if pack(boxes, mid, res, pad) is not None:
            lo = mid
        else:
            hi = mid
    scale, pos = lo, pack(boxes, lo, res, pad)
    verts, norms, uvs, faces, off = [], [], [], [], 0
    for (members, vids, xy), (px, py, rot) in zip(projected, pos):
        if rot:
            xy = xy[:, ::-1]
        remap = {v: i + off for i, v in enumerate(vids)}
        off += len(vids)
        verts.append(m.vertices[vids])
        norms.append(vn[vids])
        uvs.append(np.stack([(xy[:, 0] * scale + px) / res,
                             (xy[:, 1] * scale + py) / res], 1))
        for f in m.faces[members]:
            faces.append([remap[f[0]], remap[f[1]], remap[f[2]]])
    print(f'  atlas : {len(ch)} ilots, {scale:.1f} px/unite')
    return (np.concatenate(verts), np.concatenate(norms),
            np.concatenate(uvs), np.array(faces))


# ---------------------------------------------------------------- cuisson
def rasterize(V, N, UV, F, res):
    pos = np.zeros((res, res, 3)); nrm = np.zeros((res, res, 3))
    tan = np.zeros((res, res, 3)); bit = np.zeros((res, res, 3))
    mask = np.zeros((res, res), bool)
    for f in F:
        t, p3, n3 = UV[f] * res, V[f], N[f]
        x0 = max(0, int(np.floor(t[:, 0].min()) - 1)); x1 = min(res - 1, int(np.ceil(t[:, 0].max()) + 1))
        y0 = max(0, int(np.floor(t[:, 1].min()) - 1)); y1 = min(res - 1, int(np.ceil(t[:, 1].max()) + 1))
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + .5, np.arange(y0, y1 + 1) + .5)
        det = ((t[1, 1] - t[2, 1]) * (t[0, 0] - t[2, 0]) +
               (t[2, 0] - t[1, 0]) * (t[0, 1] - t[2, 1]))
        if abs(det) < 1e-12:
            continue
        w0 = ((t[1, 1] - t[2, 1]) * (gx - t[2, 0]) + (t[2, 0] - t[1, 0]) * (gy - t[2, 1])) / det
        w1 = ((t[2, 1] - t[0, 1]) * (gx - t[2, 0]) + (t[0, 0] - t[2, 0]) * (gy - t[2, 1])) / det
        w2 = 1 - w0 - w1
        eps = -0.6 / max(abs(det) ** 0.5, 1e-6)
        msk = (w0 >= eps) & (w1 >= eps) & (w2 >= eps)
        if not msk.any():
            continue
        yy, xx = np.nonzero(msk)
        yy, xx = yy + y0, xx + x0
        s = np.clip(np.stack([w0[msk], w1[msk], w2[msk]], 1), 0, 1)
        s = s / s.sum(1, keepdims=True)
        pos[yy, xx] = s @ p3
        nn = s @ n3
        nrm[yy, xx] = nn / np.maximum(np.linalg.norm(nn, axis=1, keepdims=True), 1e-9)
        du, dv = t[1] - t[0], t[2] - t[0]
        e1, e2 = p3[1] - p3[0], p3[2] - p3[0]
        d = du[0] * dv[1] - dv[0] * du[1] or 1e-12
        T, B = (e1 * dv[1] - e2 * du[1]) / d, (e2 * du[0] - e1 * dv[0]) / d
        tan[yy, xx] = T / max(np.linalg.norm(T), 1e-9)
        bit[yy, xx] = B / max(np.linalg.norm(B), 1e-9)
        mask[yy, xx] = True
    return pos, nrm, tan, bit, mask


def depth_map(V, F, axis, res=768):
    up = np.array([0.0, 1.0, 0.0])
    if abs(axis @ up) > 0.95:
        up = np.array([1.0, 0.0, 0.0])
    t = np.cross(up, axis); t /= np.linalg.norm(t)
    M = np.stack([t, np.cross(axis, t), axis], 0)
    P = V @ M.T
    lo, hi = P[:, :2].min(0) - 0.05, P[:, :2].max(0) + 0.05
    sc = (res - 2) / max((hi - lo).max(), 1e-6)
    XY, Z = (P[:, :2] - lo) * sc + 1, P[:, 2]
    buf = np.full((res, res), -1e9)
    for f in F:
        x, y, z = XY[f, 0], XY[f, 1], Z[f]
        x0, x1 = max(0, int(np.floor(x.min()))), min(res - 1, int(np.ceil(x.max())))
        y0, y1 = max(0, int(np.floor(y.min()))), min(res - 1, int(np.ceil(y.max())))
        if x1 < x0 or y1 < y0:
            continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + .5, np.arange(y0, y1 + 1) + .5)
        det = (y[1] - y[2]) * (x[0] - x[2]) + (x[2] - x[1]) * (y[0] - y[2])
        if abs(det) < 1e-12:
            continue
        w0 = ((y[1] - y[2]) * (gx - x[2]) + (x[2] - x[1]) * (gy - y[2])) / det
        w1 = ((y[2] - y[0]) * (gx - x[2]) + (x[0] - x[2]) * (gy - y[2])) / det
        msk = (w0 >= 0) & (w1 >= 0) & (w0 + w1 <= 1)
        if not msk.any():
            continue
        zz = (w0 * z[0] + w1 * z[1] + (1 - w0 - w1) * z[2])[msk]
        yy, xx = np.nonzero(msk)
        yy, xx = yy + y0, xx + x0
        cur = buf[yy, xx]
        buf[yy, xx] = np.where(zz > cur, zz, cur)
    return M, lo, sc, buf


def ambient_occlusion(V, F, P, Nrm, ndir, bias=0.004):
    """Visibilite par cartes de profondeur orthographiques.

    Le biais doit suivre la PENTE : une carte de profondeur a un pas fini, et
    sur une surface vue de biais l'ecart de profondeur d'un texel a l'autre
    depasse vite un biais constant. On voyait alors la grille de la carte se
    projeter sur la piece en taches sombres a bords en escalier (rhinoceros :
    sous l'oeil, milieu du socle). Le biais vaut donc maintenant quelques
    texels de la carte, divises par le cosinus entre normale et direction.
    """
    i = np.arange(ndir) + 0.5
    phi = np.arccos(1 - 2 * i / ndir)
    th = np.pi * (1 + 5 ** 0.5) * i
    dirs = np.stack([np.cos(th) * np.sin(phi), np.cos(phi), np.sin(th) * np.sin(phi)], 1)
    vis, wsum = np.zeros(len(P)), np.zeros(len(P))
    for k, d in enumerate(dirs):
        M, lo, sc, buf = depth_map(V, F, d)
        Q = P @ M.T
        xy = (Q[:, :2] - lo) * sc + 1
        xi = np.clip(np.round(xy[:, 0]).astype(int), 0, buf.shape[0] - 1)
        yi = np.clip(np.round(xy[:, 1]).astype(int), 0, buf.shape[0] - 1)
        cos = Nrm @ d
        w = np.maximum(cos, 0)
        texel = 1.0 / sc                      # taille monde d'un texel de la carte
        eff = bias + 1.5 * texel / np.maximum(cos, 0.30)
        vis += (Q[:, 2] >= buf[yi, xi] - eff) * w
        wsum += w
        if (k + 1) % 24 == 0:
            print(f'    AO {k + 1}/{ndir}')
    return np.clip(vis / np.maximum(wsum, 1e-9), 0, 1)


def dilate(img, mask, n, fill):
    """Etale les ilots puis remplit le reste : un fond noir baverait dans les
    ilots des que WebGL genere les mipmaps."""
    out, m = img.copy(), mask.copy()
    for _ in range(n):
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            sh = np.roll(np.roll(out, dy, 0), dx, 1)
            sm = np.roll(np.roll(m, dy, 0), dx, 1)
            f = (~m) & sm
            out[f] = sh[f]
            m = m | f
    out[~m] = fill
    return out


def rank_uniform(x):
    r = np.empty(len(x))
    r[np.argsort(x)] = np.arange(len(x))
    return r / max(len(x) - 1, 1)


def bake(V, N, UV, F, a):
    res = a.res * a.ss
    print('  rasterisation de l\'atlas...')
    pos, nrm, tan, bit, mask = rasterize(V, N, UV, F, res)
    idx = np.nonzero(mask)
    P, Nr, T, B = pos[idx], nrm[idx], tan[idx], bit[idx]
    print(f'  {len(P)} texels couverts ({mask.mean() * 100:.1f} %)')
    print('  occlusion ambiante...')
    ao = ambient_occlusion(V, F, P + Nr * 0.004, Nr, a.ao_dirs)

    gw, gp, gt = _grid(7), _grid(11), _grid(23)
    height = V[:, 1].max() - V[:, 1].min()
    heart = np.array([a.heart, 0.0, a.heart * 0.49])   # coeur d'arbre decentre

    def fields(p):
        d = p - heart
        r = np.hypot(d[:, 0], d[:, 2])
        t = (a.wander * turbulence(p, 1.3, gw, 4) +
             0.3 * a.wander * turbulence(p, 5.0, gw, 3))
        saw = (r + t) * a.rings
        saw = saw - np.floor(saw)
        ring = (0.5 - 0.5 * np.cos(2 * np.pi * saw)) ** 3.0
        per = np.stack([p[:, 0] * 6.0, p[:, 1] * 1.0, p[:, 2] * 6.0], 1)
        pores = np.clip(0.5 + 1.2 * noise3(per, 12.0, gp), 0, 1)
        tone = np.clip(0.5 + 1.4 * turbulence(p * (3.0 / max(height, 1e-6)),
                                              0.9, gt, 3), 0, 1)
        return ring, pores, tone

    ring, pores, tone = fields(P)
    k = rank_uniform(a.w_ring * ring + a.w_tone * (1 - tone) +
                     a.w_pore * (1 - pores)) * a.contrast
    p = k * (len(a.lut) - 1)
    i0 = np.floor(p).astype(int)
    i1 = np.minimum(i0 + 1, len(a.lut) - 1)
    fr = (p - i0)[:, None]
    col = a.lut[i0] * (1 - fr) + a.lut[i1] * fr
    col = col * (a.ao_min + (1 - a.ao_min) * ao ** a.ao_gamma)[:, None]

    if getattr(a, 'match_median', None):
        # rank_uniform garantit la distribution de couleurs AVANT l'AO ; apres,
        # la mediane derive selon la geometrie (une piece tres creusee a plus de
        # texels ombres). Gain scalaire -> la teinte et la saturation bougent a
        # peine, seule la valeur est recalee sur la cible du set.
        target = np.asarray(a.match_median, float) / 255
        cur = np.median(col, 0)
        gain = float(target.mean() / max(cur.mean(), 1e-6))
        gain = min(max(gain, 0.88), 1.15)
        col = col * gain
        print(f'  homogeneisation : mediane cuite '
              f'({cur[0]*255:.0f},{cur[1]*255:.0f},{cur[2]*255:.0f}) '
              f'-> gain {gain:.3f}')

    diffuse = np.zeros((res, res, 3))
    diffuse[idx] = np.clip(col, 0, 1)

    def height_field(p):
        r, po, _ = fields(p)
        return -(0.55 * r) + 0.15 * (po - 0.5)

    g = np.zeros((len(P), 3))
    for ax in range(3):
        e = np.zeros(3); e[ax] = 0.02
        g[:, ax] = (height_field(P + e) - height_field(P - e)) / 0.04
    g = g - Nr * (g * Nr).sum(1, keepdims=True)
    nx = -(g * T).sum(1) * a.normal_strength
    ny = -(g * B).sum(1) * a.normal_strength
    ln = np.sqrt(nx ** 2 + ny ** 2 + 1)
    nmap = np.zeros((res, res, 3))
    nmap[..., 2] = 1.0
    nmap[idx] = np.stack([nx / ln, ny / ln, 1 / ln], 1)

    diffuse = dilate(diffuse, mask, a.dilate * a.ss, np.clip(col, 0, 1).mean(0))
    nmap = dilate(nmap, mask, a.dilate * a.ss, np.array([0.0, 0.0, 1.0]))

    # flipY : jocly peint la texture dans un canvas puis new THREE.Texture(...),
    # dont flipY vaut true -> la ligne 0 se retrouve en v=1.
    flip = Image.FLIP_TOP_BOTTOM
    di = Image.fromarray((np.clip(diffuse, 0, 1) * 255 + .5).astype(np.uint8)) \
        .resize((a.res, a.res), Image.LANCZOS).transpose(flip)
    no = Image.fromarray((np.clip(nmap * .5 + .5, 0, 1) * 255 + .5).astype(np.uint8)) \
        .resize((a.res, a.res), Image.LANCZOS).transpose(flip)
    return di, no


# ---------------------------------------------------------------- ecriture
def write_gltf(path, V, N, UV, F, external_bin=False):
    V, UV = np.asarray(V, np.float32), np.asarray(UV, np.float32)
    N = np.asarray(N, np.float32)
    bad = np.nonzero(np.linalg.norm(N, axis=1) < 1e-6)[0]
    for b in bad:
        inc = np.nonzero((F == b).any(1))[0]
        p = V[F[inc]]
        acc = np.cross(p[:, 1] - p[:, 0], p[:, 2] - p[:, 0]).sum(0)
        N[b] = acc / max(np.linalg.norm(acc), 1e-9)
    N = N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-9)
    # indices sur 16 bits des que possible : 6 octets de moins par triangle,
    # soit ~35 Ko sur une piece de 6000 triangles (support universel, aucune
    # extension glTF requise)
    if len(V) < 65536:
        Fi, ctype = np.asarray(F, np.uint16), 5123
    else:
        Fi, ctype = np.asarray(F, np.uint32), 5125
    blobs = [Fi.ravel().tobytes(), V.tobytes(), UV.tobytes(), N.tobytes()]
    views, off, buf = [], 0, b''
    for b in blobs:
        views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(b)})
        pad = (-len(b)) % 4
        buf += b + b'\0' * pad
        off += len(b) + pad
    acc = [
        {'componentType': ctype, 'type': 'SCALAR', 'bufferView': 0,
         'count': int(Fi.size), 'max': [int(Fi.max())], 'min': [int(Fi.min())]},
        {'componentType': 5126, 'type': 'VEC3', 'byteOffset': 0, 'bufferView': 1,
         'count': len(V), 'max': V.max(0).tolist(), 'min': V.min(0).tolist()},
        {'componentType': 5126, 'type': 'VEC2', 'byteOffset': 0, 'bufferView': 2,
         'count': len(UV), 'max': UV.max(0).tolist(), 'min': UV.min(0).tolist()},
        {'componentType': 5126, 'type': 'VEC3', 'byteOffset': 0, 'bufferView': 3,
         'count': len(N), 'max': N.max(0).tolist(), 'min': N.min(0).tolist()},
    ]
    gltf = {
        'scene': 0, 'scenes': [{'nodes': [0]}],
        'asset': {'version': '2.0', 'generator': 'gltf-make-textures.py'},
        'accessors': acc,
        'meshes': [{'name': 'geometry_0', 'extras': {}, 'primitives': [
            {'attributes': {'POSITION': 1, 'TEXCOORD_0': 2, 'NORMAL': 3},
             'indices': 0, 'mode': 4, 'material': 0}]}],
        'materials': [{'pbrMetallicRoughness': {
            'baseColorFactor': [0.8, 0.8, 0.8, 1.0],
            'roughnessFactor': 1.0, 'metallicFactor': 0.0}, 'doubleSided': False}],
        'nodes': [{'name': 'world', 'children': [1]},
                  {'name': 'geometry_0', 'mesh': 0}],
        'buffers': [{'byteLength': len(buf), 'uri': None}],
        'bufferViews': views,
    }
    if external_bin:
        # le buffer sort du JSON : on economise les 33 % du base64. Le .bin doit
        # rester a cote du .gltf (le repertoire res/ est copie tel quel par gulp)
        binname = os.path.basename(path).replace('.gltf', '.bin')
        with open(os.path.join(os.path.dirname(path) or '.', binname), 'wb') as fh:
            fh.write(buf)
        gltf['buffers'][0]['uri'] = binname
    else:
        gltf['buffers'][0]['uri'] = ('data:application/octet-stream;base64,'
                                     + base64.b64encode(buf).decode())
    with open(path, 'w') as fh:
        json.dump(gltf, fh)
    idx_kb = len(blobs[0]) / 1024
    att_kb = sum(len(b) for b in blobs[1:]) / 1024
    print(f'  gltf : {len(V)} sommets / {len(F)} triangles, '
          f'indices {idx_kb:.0f} Ko ({"16" if ctype == 5123 else "32"} bits) + '
          f'attributs {att_kb:.0f} Ko = {len(buf) / 1024:.0f} Ko de donnees')


SNIPPET = '''
        "fr-{name}": {{
            mesh: {{
                jsFile:"{res}/{name}.js",
                keepNormals: true,
            }},
            materials: {{
                mat0: {{
                    channels: {{
                        diffuse: {{
                            texturesImg: {{
                                diffImg : "{res}/{name}-diffusemap.jpg",
                            }}
                        }},
                        normal: {{
                            texturesImg: {{
                                normalImg: "{res}/{name}-normalmap.jpg",
                            }}
                        }}
                    }}
                }}
            }}
        }},'''


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('model', help='fichier .gltf / .glb source (Blender)')
    ap.add_argument('--name', required=True, help='nom de la piece (fr-<name>)')
    ap.add_argument('--out', default='.', help='repertoire de sortie')
    g = ap.add_argument_group('geometrie')
    g.add_argument('--height', type=float, default=3.30,
                   help='hauteur cible en unites jocly (pion 2,17 / dame 3,26)')
    g.add_argument('--up', choices=('y', 'z'), default='y',
                   help='axe vertical du fichier source (Blender brut : z)')
    g.add_argument('--tris', type=int, default=6000, help='budget de triangles (0 = aucun)')
    g.add_argument('--pedestal', choices=('auto', 'none'), default='auto')
    g.add_argument('--base-radius', type=float, default=0.84)
    g.add_argument('--base-seg', type=int, default=48,
                   help='segments du socle tourne (24 = deux fois moins de triangles)')
    g.add_argument('--cut', type=float, default=None,
                   help='hauteur du plan de coupe (force le socle a cette cote)')
    a_ = ap.add_argument_group('atlas')
    a_.add_argument('--res', type=int, default=512)
    a_.add_argument('--pad', type=int, default=6)
    a_.add_argument('--dilate', type=int, default=9)
    a_.add_argument('--ss', type=int, default=2, help='sur-echantillonnage de cuisson')
    g.add_argument('--bin', action='store_true',
                   help='buffer dans un .bin externe au lieu du base64 (-25 %% de poids)')
    w = ap.add_argument_group('bois')
    w.add_argument('--wood-from', help='diffusemap existante dont relever la palette')
    w.add_argument('--rings', type=float, default=4.3, help='cernes par unite (set : 4,3)')
    w.add_argument('--wander', type=float, default=0.075, help='ondulation des cernes')
    w.add_argument('--heart', type=float, default=2.35,
                   help='distance du coeur de l\'arbre a l\'axe (grand = fil vertical)')
    w.add_argument('--w-ring', type=float, default=0.22)
    w.add_argument('--w-tone', type=float, default=0.68)
    w.add_argument('--w-pore', type=float, default=0.10)
    w.add_argument('--contrast', type=float, default=0.80,
                   help='part de la rampe utilisee (1 = jusqu\'au plus sombre)')
    w.add_argument('--normal-strength', type=float, default=0.0032)
    o = ap.add_argument_group('occlusion')
    o.add_argument('--ao-dirs', type=int, default=96)
    o.add_argument('--ao-min', type=float, default=0.42)
    o.add_argument('--ao-gamma', type=float, default=1.6)
    w.add_argument('--wood', help='essence a charger depuis le fichier de bois '
                   '(ex : buis, charme, erable)')
    w.add_argument('--wood-file', help='fichier JSON des essences '
                   '(defaut : woods.json a cote du script)')
    w.add_argument('--match-median', metavar='R,G,B',
                   help='homogeneisation : gain scalaire (borne 0,88-1,15) pour '
                   'amener la mediane des texels couverts (AO comprise) sur la '
                   'cible - corrige la derive de valeur due a la geometrie '
                   '(une piece creusee cuit plus sombre), sans toucher la teinte')
    a = ap.parse_args()
    a.lut = lut_from_image(a.wood_from) if a.wood_from else WOOD_LUT_DEFAULT
    if a.wood:
        wf = a.wood_file or os.path.join(
            os.path.dirname(os.path.abspath(__file__)), 'woods.json')
        with open(wf) as fh:
            woods = json.load(fh)
        if a.wood not in woods:
            sys.exit(f'essence "{a.wood}" absente de {wf} '
                     f'(disponibles : {", ".join(sorted(woods))})')
        wd = woods[a.wood]
        # le fichier d'essence ne s'applique qu'aux parametres restes a leur
        # valeur par defaut : un drapeau explicite sur la ligne de commande
        # garde la priorite
        for k, dflt in (('rings', 4.3), ('wander', 0.075), ('heart', 2.35),
                        ('w_ring', 0.22), ('w_tone', 0.68), ('w_pore', 0.10),
                        ('contrast', 0.80), ('normal_strength', 0.0032)):
            if getattr(a, k) == dflt and k in wd:
                setattr(a, k, wd[k])
        if 'rampe' in wd and not a.wood_from:
            a.lut = np.asarray(wd['rampe'], float) / 255
        print(f'essence : {wd.get("titre", a.wood)}')
    if a.match_median:
        if a.match_median == 'auto':
            if not a.wood:
                sys.exit('--match-median auto exige --wood')
            a.match_median = wd['mediane_cible']
        else:
            a.match_median = [float(x) for x in a.match_median.split(',')]
    a.res_path = f'/res/fairy/{a.name}'

    print(f'{a.model} :')
    m = load_mesh(a.model)
    print(f'  charge : {len(m.faces)} triangles, {len(m.vertices)} sommets')
    m = normalize(m, a.height, a.up)
    body, cut = split_body(m, a.pedestal, a.height, a.cut)
    ped = None
    if cut is not None:
        # le plateau depasse legerement le plan de coupe : il ferme le dessous
        # creux du corps au lieu de laisser voir l'interieur
        ped = pedestal(cut + 0.012 * a.height, a.base_radius, a.base_seg)
    budget = max(a.tris - (len(ped.faces) if ped is not None else 0), 200) if a.tris else 0
    body = decimate(body, budget)
    if ped is not None:
        body = trimesh.util.concatenate([body, ped])
    print(f'  maillage final : {len(body.faces)} triangles')

    V, N, UV, F = unwrap(body, a.res, a.pad)
    di, no = bake(V, N, UV, F, a)

    os.makedirs(a.out, exist_ok=True)
    write_gltf(os.path.join(a.out, f'{a.name}.gltf'), V, N, UV, F, a.bin)
    di.save(os.path.join(a.out, f'{a.name}-diffusemap.jpg'), quality=93, subsampling=0)
    no.save(os.path.join(a.out, f'{a.name}-normalmap.jpg'), quality=94, subsampling=0)
    poids = 0
    for f in os.listdir(a.out):
        if f.startswith(a.name + '.') or f.startswith(a.name + '-'):
            k = os.path.getsize(os.path.join(a.out, f)) / 1024
            poids += k
            print(f'  {f:34s} {k:7.0f} Ko')
    print(f'  {"total":34s} {poids:7.0f} Ko '
          f'(mediane des pieces fairy existantes : 155 Ko de gltf + 2 x 52 Ko)')
    print('\nA coller dans fairy-set-view.js :')
    print(SNIPPET.format(name=a.name, res=a.res_path))


if __name__ == '__main__':
    main()
