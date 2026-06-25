const { Readable } = require('stream');

// Drop-in replacement for merge-stream's default export, but processes each
// input stream to completion *before* starting the next one, rather than
// piping all of them into a shared destination concurrently. merge-stream
// (independent of its major version) was found to occasionally lose files
// entirely when merging several concurrent babel/browserify streams here —
// reproduced reliably with 5-6 streams of uneven duration. Processing them
// sequentially avoids the race entirely, at the cost of some parallelism
// that isn't meaningful for this gulpfile's small number of JS files anyway.
module.exports = function mergeSequential() {
	var streams = Array.prototype.slice.call(arguments);
	var output = new Readable({ objectMode: true, read: function () {} });
	var idx = 0;
	function next() {
		if (idx >= streams.length) {
			output.push(null);
			return;
		}
		var s = streams[idx++];
		s.on('data', function (f) { output.push(f); });
		s.on('end', next);
		s.on('error', function (e) { output.emit('error', e); });
	}
	next();
	return output;
};
