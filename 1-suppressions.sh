#!/bin/sh
# A lancer a la racine de jocly2, sur la branche pean (192b923), AVANT le patch.
set -e
git rm -q \
  "src/games/pean/extra/0ad/terrain/bridge_wood_b.png" \
  "src/games/pean/extra/0ad/terrain/bridge_wood_c.png" \
  "src/games/pean/extra/0ad/terrain/clay_02.png" \
  "src/games/pean/extra/0ad/terrain/cliff4.png" \
  "src/games/pean/extra/0ad/terrain/decal_farmland.png" \
  "src/games/pean/extra/0ad/terrain/farmland_01.png" \
  "src/games/pean/extra/0ad/terrain/farmland_a.png" \
  "src/games/pean/extra/0ad/terrain/grass1.png" \
  "src/games/pean/extra/0ad/terrain/grass_dirt_03.png" \
  "src/games/pean/extra/0ad/terrain/grass_dirt_04.png" \
  "src/games/pean/extra/0ad/terrain/grass_field.png" \
  "src/games/pean/extra/0ad/terrain/medit_city_pavement.png" \
  "src/games/pean/extra/0ad/terrain/medit_cliff_greek_norm.png" \
  "src/games/pean/extra/0ad/terrain/medit_grass_wild_2.png" \
  "src/games/pean/extra/0ad/terrain/medit_plants_dirt.png" \
  "src/games/pean/extra/0ad/terrain/medit_road_broken.png" \
  "src/games/pean/extra/0ad/terrain/ocean_coral_01.png" \
  "src/games/pean/extra/0ad/terrain/ocean_coral_01_norm.png" \
  "src/games/pean/extra/0ad/terrain/paving_02.png" \
  "src/games/pean/extra/0ad/terrain/rocks_plants_01.png" \
  "src/games/pean/extra/0ad/terrain/sand_01.png" \
  "src/games/pean/extra/0ad/terrain/shore_wave.png" \
  "src/games/pean/extra/0ad/terrain/temp_dirt_gravel_plants.png" \
  "src/games/pean/extra/0ad/terrain/temp_dirt_mod_08.png" \
  "src/games/pean/extra/0ad/terrain/temp_forestfloor_pine.png" \
  "src/games/pean/extra/0ad/terrain/temp_grass_mossy.png" \
  "src/games/pean/extra/0ad/terrain/temp_plants_bog_aut.png" \
  "src/games/pean/extra/0ad/terrain/temp_sea_weed.png" \
  "src/games/pean/extra/0ad/units/athen/ship_arrow.png" \
  "src/games/pean/extra/0ad/units/athen/ship_ram.png" \
  "src/games/pean/extra/0ad/units/athen/ship_scout.png" \
  "src/games/pean/extra/0ad/units/athen/siege_ram.png" \
  "src/games/pean/extra/0ad/units/pers/champion_elephant.png" \
  "src/games/pean/extra/0ad/units/pers/chariot_archer.png" \
  "src/games/pean/extra/0ad/units/pers/ship_arrow.png" \
  "src/games/pean/extra/0ad/units/pers/ship_fishing.png" \
  "src/games/pean/extra/0ad/units/pers/ship_merchant.png" \
  "src/games/pean/extra/0ad/units/pers/ship_ram.png" \
  "src/games/pean/extra/0ad/units/pers/ship_scout.png" \
  "src/games/pean/extra/0ad/units/pers/siege_ram.png" \
  "src/games/pean/extra/0ad/units/pers/support_female_citizen.png" \
  "src/games/pean/extra/0ad/units/pers/support_healer.png" \
  "src/games/pean/extra/0ad/units/pers/support_trader.png" \
  "src/games/pean/extra/0ad/units/spart/ship_arrow.png" \
  "src/games/pean/extra/0ad/units/spart/ship_ram.png" \
  "src/games/pean/extra/0ad/units/spart/ship_scout.png" \
  "src/games/pean/extra/0ad/units/spart/siege_ram.png" \
  "src/games/pean/extra/0ad/units/theb/siege_fireraiser.png" \
  && true
git commit -q -F - <<'MSG'
Péan : suppression des images 0 A.D. lourdes ou sans usage

Textures de terrain (0,5 à 10 Mo pièce, cartes de normales), navires,
engins de siège, civils, éléphant, char : hors du périmètre du jeu.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01GLvZagNfy4H923UaB9sjwH

MSG
