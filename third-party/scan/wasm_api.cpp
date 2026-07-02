
// wasm_api.cpp
//
// Couche d'API pour piloter Scan depuis JavaScript (Emscripten),
// en remplacement du protocole Hub (stdin/stdout) utilisé par main.cpp.
//
// Toutes les fonctions sont exposees en "extern C" pour un usage simple
// via ccall/cwrap cote JS (voir EXPORTED_FUNCTIONS au lien).

#include <cstring>
#include <string>

#include "bb_base.hpp"
#include "bb_comp.hpp"
#include "bb_index.hpp"
#include "bit.hpp"
#include "book.hpp"
#include "common.hpp"
#include "eval.hpp"
#include "fen.hpp"
#include "game.hpp"
#include "gen.hpp"
#include "hash.hpp"
#include "libmy.hpp"
#include "list.hpp"
#include "move.hpp"
#include "pos.hpp"
#include "score.hpp"
#include "search.hpp"
#include "tt.hpp"
#include "util.hpp"
#include "var.hpp"

// etat global (un seul moteur/une seule partie a la fois, suffisant pour Jocly)

static Game   G_Game;
static bool   G_Ready = false;

// tampon de retour pour les fonctions qui renvoient une chaine a JS
// (ccall avec returnType "string" lit un pointeur char* ; un buffer
// statique evite d'avoir a gerer malloc/free cote JS pour ce cas simple)

static std::string G_Out_Buffer;

static const char * to_js_string(const std::string & s) {
   G_Out_Buffer = s;
   return G_Out_Buffer.c_str();
}

extern "C" {

// scan_init: a appeler une seule fois au demarrage.
// use_book: 1 pour charger le livre d'ouverture (data/book, doit avoir ete
//           preload dans le systeme de fichiers virtuel Emscripten), 0 sinon.
// tt_size_log2: taille de la table de transposition = 2^tt_size_log2 entrees
//           de 16 octets (ex: 20 -> 16 Mo, 22 -> 64 Mo). Rester modeste
//           en environnement navigateur/mobile.
//
// Retourne 1 en cas de succes, 0 sinon.

int scan_init(int use_book, int tt_size_log2) {

   if (G_Ready) return 1;

   bit::init();
   hash::init();
   pos::init();
   var::init(); // charge les valeurs par defaut (variant=normal, threads=1, ...)

   bb::index_init();
   bb::comp_init();

   ml::rand_init();

   // surcharge des valeurs par defaut pour un usage WASM :
   // - pas de bitbases (fichiers volumineux non embarques)
   // - pas de multi-threading (un seul thread wasm, pas de Web Worker)
   // - TT plus petite que la valeur par defaut (2^24 = 256 Mo)
   var::set("bb-size", "0");
   var::set("threads", "1");
   var::set("tt-size", std::to_string(tt_size_log2));
   var::set("book", use_book ? "true" : "false");
   var::update();

   try {
      if (var::Book) book::init(); // lit data/book depuis le FS virtuel
      if (var::BB)   bb::init();   // inactif ici (bb-size=0)
   } catch (...) {
      return 0;
   }

   eval_init(); // lit data/eval depuis le FS virtuel
   G_TT.set_size(var::TT_Size);

   G_Game.clear();
   G_Ready = true;

   return 1;
}

// scan_new_game: reinitialise la partie a la position de depart standard
// et vide la table de transposition.

void scan_new_game() {
   G_Game.clear();
   G_TT.clear();
}

// scan_set_position_fen: positionne le plateau a partir d'une chaine FEN
// Scan (voir fen.cpp / le fichier protocol.txt de Scan pour le format).
// Retourne 1 en cas de succes, 0 si le FEN est invalide.

int scan_set_position_fen(const char * fen) {

   try {
      Pos pos = pos_from_fen(std::string(fen));
      G_Game.init(pos);
      return 1;
   } catch (const Bad_Input &) {
      return 0;
   }
}

// scan_get_position_fen: renvoie la position courante au format FEN.

const char * scan_get_position_fen() {
   return to_js_string(pos_fen(G_Game.pos()));
}

// scan_legal_moves: renvoie la liste des coups legaux de la position
// courante, en notation standard Scan ("33-28", "34x23", ...),
// separes par des espaces.

const char * scan_legal_moves() {

   List list;
   gen_moves(list, G_Game.pos());

   std::string out;
   for (int i = 0; i < list.size(); i++) {
      if (i != 0) out += " ";
      out += move::to_string(list[i], G_Game.pos());
   }

   return to_js_string(out);
}

// scan_play_move: joue un coup (notation standard, ex "33-28") dans la
// partie en cours. Retourne 1 si le coup est legal et a ete joue, 0 sinon.

int scan_play_move(const char * move_string) {

   try {

      Move mv = move::from_string(std::string(move_string), G_Game.pos());

      if (!move::is_legal(mv, G_Game.pos())) return 0;

      G_Game.add_move(mv);
      return 1;

   } catch (const Bad_Input &) {
      return 0;
   }
}

// scan_is_game_over: renvoie 1 si la partie est terminee (plus de coup
// legal pour le trait), 0 sinon.

int scan_is_game_over() {
   return G_Game.is_end() ? 1 : 0;
}

// scan_turn: renvoie 0 pour White (blanc), 1 pour Black (noir).

int scan_turn() {
   return int(G_Game.turn());
}

// scan_go: lance une recherche synchrone sur la position courante et
// renvoie le meilleur coup trouve, en notation standard ("33-28").
// move_time_sec: temps de reflexion en secondes (ex 1.0).
// depth_max: profondeur max (0 = pas de limite explicite -> Depth_Max).
// use_book: 1 pour autoriser l'utilisation du livre d'ouverture.
//
// Ne joue PAS le coup automatiquement : c'est a l'appelant JS de decider
// (afficher le coup, puis appeler scan_play_move si le coup est accepte).
// Renvoie une chaine vide si aucun coup n'est trouve (position terminale).

const char * scan_go(double move_time_sec, int depth_max, int use_book) {

   if (G_Game.is_end()) return to_js_string("");

   Search_Input si;
   si.move  = true;
   si.book  = (use_book != 0) && var::Book;
   si.input = false;           // pas d'ecoute stdin : pas d'interruption possible
   si.output = Output_None;    // pas d'affichage console
   si.depth = (depth_max > 0) ? Depth(depth_max) : Depth_Max;
   si.time  = move_time_sec;

   Search_Output so;
   search(so, G_Game.node(), si);

   Move mv = so.move;
   if (mv == move::None) mv = quick_move(G_Game.node());
   if (mv == move::None) return to_js_string("");

   return to_js_string(move::to_string(mv, G_Game.pos()));
}

// scan_set_param: equivalent de la commande Hub "set-param".
// Utile par exemple pour changer "variant" (normal/killer/bt/frisian/losing)
// -- necessite alors de recharger le livre/bitbases adaptes si disponibles.

void scan_set_param(const char * name, const char * value) {
   var::set(std::string(name), std::string(value));
   var::update();
}

} // extern "C"
