/*
 * Serves this directory with the two headers the bundled Fairy-Stockfish needs.
 *
 *   node examples/browser/serve.js [port]      then open the printed URL
 *
 * The wasm build is multi-threaded, so it needs SharedArrayBuffer, which
 * browsers only expose to pages that are cross-origin isolated:
 *
 *   Cross-Origin-Opener-Policy: same-origin
 *   Cross-Origin-Embedder-Policy: require-corp
 *
 * These are HTTP response headers on the HTML DOCUMENT. They cannot be set
 * from inside the page - <meta http-equiv> does not work for either of them -
 * which is why opening fairy-check.html from the filesystem, or from a plain
 * static server, always reports SharedArrayBuffer as missing. That is a
 * property of the server, not a fault in the page or the engine.
 *
 * Nothing here is needed in production; the .htaccess next to this file does
 * the same job under Apache. This exists so the check can be run without one.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const ROOT = path.join(__dirname, "..", "..");     // repository root
const PORT = parseInt(process.argv[2] || "8422", 10);

const TYPES = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".wasm": "application/wasm",          // needed for instantiateStreaming
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".svg": "image/svg+xml",
	".nnue": "application/octet-stream",
	".gltf": "model/gltf+json",
	".bin": "application/octet-stream",
};

http.createServer(function (request, response) {
	const pathname = decodeURIComponent(url.parse(request.url).pathname);
	// serve the whole repository, so the page can reach dist/ as well
	let file = path.join(ROOT, path.normalize(pathname).replace(/^(\.\.[\/\\])+/, ""));
	if(file.indexOf(ROOT) !== 0)
		return respond(response, 403, "text/plain", "forbidden");
	fs.stat(file, function (error, stat) {
		if(!error && stat.isDirectory())
			file = path.join(file, "index.html");
		fs.readFile(file, function (readError, content) {
			if(readError)
				return respond(response, 404, "text/plain", "not found: " + pathname);
			respond(response, 200, TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", content);
		});
	});
}).listen(PORT, function () {
	console.log("serving " + ROOT + " cross-origin isolated");
	console.log("  http://localhost:" + PORT + "/examples/browser/fairy-check.html");
});

function respond(response, status, type, body) {
	response.writeHead(status, {
		"Content-Type": type,
		// the two that matter
		"Cross-Origin-Opener-Policy": "same-origin",
		"Cross-Origin-Embedder-Policy": "require-corp",
		// COEP: require-corp would otherwise block same-origin subresources
		// loaded without CORS, which includes the wasm and the worker
		"Cross-Origin-Resource-Policy": "cross-origin",
		"Cache-Control": "no-store",
	});
	response.end(body);
}
