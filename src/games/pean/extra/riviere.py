#!/usr/bin/env python3
"""
Aide a l'ecriture des scenarios de Péan : les cotes d'hexagone d'une riviere.

Une riviere qui suit la frontiere entre les lignes `row` et `row + 1` d'une
carte « odd-q » (sommet plat, colonnes impaires decalees vers le bas) coupe :
  - pour toute colonne c : le cote sud de (c, row) ;
  - pour une colonne impaire c : en plus ses cotes sud-est et sud-ouest,
    vers (c+1, row+1) et (c-1, row+1).

Usage :
  python3 riviere.py COLS ROW [c0-c1] [--gues c,c,...]
Imprime un fragment JSON pour carte.cotes : {"riviere": [...], "gue": [...]}
Un gue remplace tous les cotes de la riviere qui touchent la colonne donnee.
"""
import json
import sys


def pairs(cols, row, c0=0, c1=None):
    c1 = cols - 1 if c1 is None else c1
    out = []
    for c in range(c0, c1 + 1):
        out.append((c, row, c, row + 1))
        if c % 2 == 1:
            if c + 1 < cols and c + 1 <= c1:
                out.append((c, row, c + 1, row + 1))
            if c - 1 >= 0 and c - 1 >= c0:
                out.append((c, row, c - 1, row + 1))
    return out


def main(argv):
    cols, row = int(argv[1]), int(argv[2])
    c0, c1 = 0, cols - 1
    fords = set()
    rest = argv[3:]
    while rest:
        a = rest.pop(0)
        if a == "--gues":
            fords = {int(x) for x in rest.pop(0).split(",")}
        else:
            c0, c1 = (int(x) for x in a.split("-"))
    river, ford = [], []
    for (a, b, c, d) in pairs(cols, row, c0, c1):
        item = ["%d,%d" % (a, b), "%d,%d" % (c, d)]
        (ford if (a in fords or c in fords) else river).append(item)
    print(json.dumps({"riviere": river, "gue": ford}))


if __name__ == "__main__":
    main(sys.argv)
