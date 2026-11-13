/*    Copyright 2017 Jocly
 *
 *    This program is free software: you can redistribute it and/or  modify
 *    it under the terms of the GNU Affero General Public License, version 3,
 *    as published by the Free Software Foundation.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU Affero General Public License for more details.
 *
 *    You should have received a copy of the GNU Affero General Public License
 *    along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*
 * Worker du moteur de Péan (voir src/core/jocly.pean.js pour le protocole).
 *
 * jocly ne livre PAS de moteur pour ce jeu : ce worker repond "Error" a
 * l'Init, et jocly.pean.js joue alors avec l'IA uct du jeu en l'annoncant.
 * Un hote qui a un moteur substitue ce Worker par le sien : Tabulon le
 * reconnait a son nom de fichier (app/content/engine-native.js) et repond a
 * sa place avec son moteur Rust (crate `pean`).
 */
onmessage = function (e) {
	var message = e.data || {};
	switch (message.type) {
		case "Init":
			postMessage({ type: "Error", error: "no Pean engine in this build (the uct AI plays instead)" });
			break;
		case "Search":
			postMessage({ type: "Error", error: "no Pean engine in this build" });
			break;
		case "Stop":
			postMessage({ type: "Aborted" });
			break;
	}
};
