#!/usr/bin/env node
/*
 * Runs the test suites.
 *
 *   node tests/run.js                 everything
 *   node tests/run.js fairy           one category
 *   node tests/run.js shogi core      several
 *   node tests/run.js fairy/khans     a subfolder
 *
 * or through npm:  npm test  /  npm test -- fairy
 *
 * Each suite is a standalone script that prints its own tally, so this only
 * starts them, reads the verdict and adds up. A suite counts as failed when it
 * exits non-zero - which every harness here does on failure - or when its
 * output carries a failure marker anyway, because a few of the older scripts
 * print "N ECHEC" or "CRASH" and still exit 0.
 *
 * Suites that need `npx gulp build` say so and skip; a skip is not a failure.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = __dirname;

// harnesses and notes are not suites
const NOT_A_SUITE = /^(run\.js|harness\.js|.*-harness\.js|README\.md)$/;

function suites(dir) {
	const found = [];
	for(const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
			a.name.localeCompare(b.name))) {
		const full = path.join(dir, entry.name);
		if(entry.isDirectory())
			found.push(...suites(full));
		else if(/\.(js|mjs)$/.test(entry.name) && !NOT_A_SUITE.test(entry.name))
			found.push(full);
	}
	return found;
}

const wanted = process.argv.slice(2);
const targets = wanted.length ? wanted : ["."];
let files = [];
for(const target of targets) {
	const dir = path.join(ROOT, target);
	if(!fs.existsSync(dir)) {
		console.error("no such folder: tests/" + target);
		process.exit(2);
	}
	files = files.concat(fs.statSync(dir).isDirectory() ? suites(dir) : [dir]);
}

if(files.length === 0) {
	console.error("nothing to run");
	process.exit(2);
}

const FAILURE = /\bFAILED\b|[1-9]\d* failed|[1-9]\d* ECHEC|CRASH|ERREUR/;
const SKIP = /^SKIP\b/m;

let failed = [], skipped = [], passed = 0;
const started = Date.now();

for(const file of files) {
	const label = path.relative(ROOT, file);
	process.stdout.write("  " + label.padEnd(42));
	const run = spawnSync(process.execPath, [file], { encoding: "utf8", timeout: 600000 });
	const output = (run.stdout || "") + (run.stderr || "");
	const lines = output.trim().split("\n");
	const verdict = lines[lines.length - 1] || "(no output)";

	if(SKIP.test(output)) {
		skipped.push(label);
		console.log("skipped  " + verdict.replace(/^SKIP\s*-?\s*/, ""));
	} else if(run.status !== 0 || FAILURE.test(output)) {
		failed.push({ label, output });
		console.log("FAILED   " + verdict);
	} else {
		passed++;
		console.log("ok       " + verdict);
	}
}

console.log("\n" + passed + " suite" + (passed === 1 ? "" : "s") + " passed"
	+ (skipped.length ? ", " + skipped.length + " skipped" : "")
	+ (failed.length ? ", " + failed.length + " FAILED" : "")
	+ "   (" + Math.round((Date.now() - started) / 1000) + "s)");

if(skipped.length)
	console.log("skipped, needing a build: " + skipped.join(", "));

// the output of a failing suite, so the run says what went wrong on its own
for(const failure of failed) {
	console.log("\n----- " + failure.label + " -----");
	console.log(failure.output.trim().split("\n").slice(-25).join("\n"));
}

process.exit(failed.length ? 1 : 0);
