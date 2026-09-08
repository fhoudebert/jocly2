// Web Worker hosting the THREADED kataeval (kataeval-mt.js) — KataGo's REAL Search.
//
// Why a worker: kgeSearchKata runs KataGo's Search, which spawns its own pthreads
// (1 NN-server thread that owns the WebGPU device + N search threads) and BLOCKS the
// caller until the search finishes. Blocking is forbidden on the page's main thread
// (Atomics.wait throws there) but fine on a worker — so the engine lives here and the
// UI thread stays responsive. Requires cross-origin isolation (COOP/COEP) for threads.
importScripts('kataeval-mt.js');

// Surface errors that would otherwise be swallowed (pthread pool spawn, rejections).
const diag = (m) => { try { postMessage({ diag: m }); } catch (_) {} };
self.onerror = (e) => diag('worker.onerror: ' + ((e && e.message) || e));
self.addEventListener('unhandledrejection', (e) => diag('unhandledrejection: ' + ((e.reason && (e.reason.stack || e.reason.message)) || e.reason)));

const MAXMV = 2048, PVCAP = 32, MAXCAND = 8;   // MAXMV matches the page (analyze.html) so long games aren't truncated
let M = null, N = 19, ready = false;

// Net caching (Cache API), shared with the page — a net downloads once across both
// contexts and survives refreshes. The page may have already cached it on load.
async function cachedNet(url) {
  let cache = null;
  try { cache = await caches.open('saigo-nets-v1'); } catch (_) { cache = null; }
  if (cache) { const hit = await cache.match(url); if (hit) return await hit.arrayBuffer(); }
  const res = await fetch(url);
  if (!res.ok) throw new Error('fetch ' + url + ' -> ' + res.status);
  if (cache) { try { await cache.put(url, res.clone()); } catch (_) {} }
  return await res.arrayBuffer();
}
let mlPtr, mcPtr;                                      // move-list buffers (persistent heap, written in place)
let scalPtr, valPtr, pvPtr, pvVisPtr;                 // kgePollAll: 7 ints, 8 floats, pv, pvVisits
let candLocPtr, candVisPtr, candWrPtr, candScPtr, candPrPtr, candLcbPtr, candRadPtr, candStdPtr;  // candidate-move buffers
let ownPtr;                                           // tree-ownership buffer
let bPtr, pPtr, vPtr, oPtr;                           // analysis (kgeEvalSeqKata) buffers

async function init(netFile, boardSize, wasmBinary, jsText, forceCpu, fp16, optimism) {
  // The module is loaded via importScripts INTO this worker, so emscripten's
  // _scriptName would point at kata-worker.js — it would then spawn pthread workers
  // as new Worker('kata-worker.js') (re-running THIS file) instead of the pthread
  // bootstrap. mainScriptUrlOrBlob tells it the real module URL so pthread + wasm
  // loading resolve correctly.
  // Spawn pthread workers from a blob: URL (built from the page-fetched JS text), not
  // the https URL — a nested new Worker(https-url) fails over a self-signed/overridden
  // cert. The blob is same-origin and in-memory, so no cert is involved.
  const moduleBlob = new Blob([jsText], { type: 'text/javascript' });
  diag('createKata: spawning thread pool…');
  M = await createKata({
    // The page fetched the wasm for us (a worker's fetch() also fails over the cert);
    // use those bytes directly so the worker never fetches the wasm.
    wasmBinary,
    mainScriptUrlOrBlob: moduleBlob,
    locateFile: (p) => new URL(p, self.location.href).href,
  });
  diag('createKata: runtime + thread pool ready');
  N = boardSize;
  if (forceCpu) M.ccall('kgeSetForceCpu', null, ['number'], [1]);  // ?cpu — Eigen fallback
  if (fp16) M.ccall('kgeSetFp16', null, ['number'], [1]);          // ?fp16 — opt-in fp16 (~2x, fp16-stable nets only)
  if (optimism > 0) M.ccall('kgeSetPolicyOptimism', null, ['number'], [optimism]);  // ?optimism — v>=12 policy-optimism blend
  M.FS.writeFile('/model.bin.gz', new Uint8Array(await cachedNet(netFile)));
  const ok = await M.ccall('kgeLoad', 'number', ['string', 'number'], ['/model.bin.gz', N], { async: true });
  if (!ok) throw new Error('kgeLoad: ' + M.ccall('kgeError', 'string', [], []));
  mlPtr = M._malloc(MAXMV * 4); mcPtr = M._malloc(MAXMV * 4);
  scalPtr = M._malloc(7 * 4); valPtr = M._malloc(8 * 4);
  pvPtr = M._malloc(PVCAP * 4); pvVisPtr = M._malloc(PVCAP * 4);
  const HW = N * N;
  bPtr = M._malloc(HW * 4); pPtr = M._malloc((HW + 1) * 4); vPtr = M._malloc(5 * 4); oPtr = M._malloc(HW * 4);
  candLocPtr = M._malloc(MAXCAND * 4); candVisPtr = M._malloc(MAXCAND * 4);
  candWrPtr = M._malloc(MAXCAND * 4); candScPtr = M._malloc(MAXCAND * 4); candPrPtr = M._malloc(MAXCAND * 4);
  candLcbPtr = M._malloc(MAXCAND * 4); candRadPtr = M._malloc(MAXCAND * 4); candStdPtr = M._malloc(MAXCAND * 4);
  ownPtr = M._malloc(HW * 4);
  ready = true;
  const backend = M.ccall('kgeBackendIsGpu', 'number', [], []) ? 'WebGPU' : 'CPU (Eigen)';
  return { backend, version: M.ccall('kgeModelVersion', 'number', [], []) };
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pollToken = 0;  // bumped on every new request; a running stream exits when it changes

// Write a move list straight into the persistent heap buffers (no staging TypedArrays).
// Returns the number written (capped at MAXMV). loc = y*N+x or -1 pass; col = 1|2.
function writeMoves(moves) {
  const n = Math.min(moves.length, MAXMV);
  const mi = mlPtr >> 2, ci = mcPtr >> 2;
  for (let i = 0; i < n; i++) { M.HEAP32[mi + i] = moves[i].loc; M.HEAP32[ci + i] = moves[i].col; }
  return n;
}

// ONE ccall per poll (kgePollAll) instead of four separate ones. 16 pointer/int args.
const POLLALL_SIG = ['number','number','number','number','number','number','number','number',
                     'number','number','number','number','number','number','number','number'];
function pollStats() {
  const ok = M.ccall('kgePollAll', 'number', POLLALL_SIG,
    [scalPtr, valPtr, pvPtr, pvVisPtr, PVCAP,
     candLocPtr, candVisPtr, candWrPtr, candScPtr, candPrPtr, candLcbPtr, candRadPtr, candStdPtr, MAXCAND,
     ownPtr, N * N]);
  if (!ok) throw new Error('kgePollAll: ' + M.ccall('kgeError', 'string', [], []));
  const S = scalPtr >> 2, V = valPtr >> 2;
  const plen = M.HEAP32[S + 4], ncand = M.HEAP32[S + 5], nOwn = M.HEAP32[S + 6];
  const cand = new Array(ncand);
  for (let i = 0; i < ncand; i++) cand[i] = {
    loc: M.HEAP32[(candLocPtr >> 2) + i], visits: M.HEAP32[(candVisPtr >> 2) + i],
    wr: M.HEAPF32[(candWrPtr >> 2) + i], score: M.HEAPF32[(candScPtr >> 2) + i],
    prior: M.HEAPF32[(candPrPtr >> 2) + i],
    lcb: M.HEAPF32[(candLcbPtr >> 2) + i], radius: M.HEAPF32[(candRadPtr >> 2) + i],
    stdev: M.HEAPF32[(candStdPtr >> 2) + i],
  };
  const pv = new Array(plen), pvVisits = new Array(plen);
  for (let i = 0; i < plen; i++) { pv[i] = M.HEAP32[(pvPtr >> 2) + i]; pvVisits[i] = M.HEAP32[(pvVisPtr >> 2) + i]; }
  return {
    best: M.HEAP32[S + 0], done: !!M.HEAP32[S + 1], reused: !!M.HEAP32[S + 2], nv: M.HEAP32[S + 3],
    wr: M.HEAPF32[V + 0], score: M.HEAPF32[V + 1], scoreStdev: M.HEAPF32[V + 2],
    rawWr: M.HEAPF32[V + 3], rawScore: M.HEAPF32[V + 4],
    surprise: M.HEAPF32[V + 5], searchEntropy: M.HEAPF32[V + 6], policyEntropy: M.HEAPF32[V + 7],
    pv, pvVisits, cand,
    ownership: nOwn > 0 ? M.HEAPF32.slice(ownPtr >> 2, (ownPtr >> 2) + nOwn) : null,  // Float32Array
    mem: M.HEAP32.buffer.byteLength,   // total wasm memory (HEAP8 isn't exported)
  };
}

// Async search: start ONE continuous search (genMoveAsync, non-blocking), poll live as
// visits climb, then start a real background ponder and keep polling. A pollToken
// supersedes a running stream when a newer request arrives.
async function search(req, token) {
  if (!ready) throw new Error('engine not initialized');
  const moves = req.moves || [];
  const n = writeMoves(moves);   // straight into the persistent heap — no staging Int32Arrays
  const threads = (req.threads | 0) || 1;
  M.ccall('kgeStopSearch', 'number', [], []);  // halt any prior search/ponder
  const ok = await M.ccall('kgeSearchBegin', 'number',
    ['number','number','number','number','number','number','number','number'],
    [mlPtr, mcPtr, n, req.toPlay, req.komi ?? 7.5, req.visits | 0, req.ms | 0, threads], { async: true });
  if (!ok) throw new Error('kgeSearchBegin: ' + M.ccall('kgeError', 'string', [], []));

  const t0 = performance.now();
  const post = (s, state, t) => {
    const el = performance.now() - t;   // one clock read per post
    postMessage({ progress: true, state, threads, ms: Math.round(el),
      nps: el > 0 ? Math.round(s.nv / (el / 1000)) : 0, ...s });
  };

  // search phase: poll the running search until it finishes
  let s = pollStats();
  while (!s.done && token === pollToken) {
    post(s, 'searching', t0);
    await sleep(90);
    if (token !== pollToken) return null;
    s = pollStats();
  }
  if (token !== pollToken) return null;
  post(s, 'searching', t0);
  const elapsed = performance.now() - t0;
  const final = { ...s, threads, ms: Math.round(elapsed),
    nps: elapsed > 0 ? Math.round(s.nv / (elapsed / 1000)) : 0 };

  // ponder phase: real background ponder, polled live (detached so search() resolves now).
  // Skipped for scans (req.noPonder) — a whole-game sweep wants each position's final
  // number, not a trailing ponder that would spam progress and burn cycles.
  if (req.noPonder) return final;
  M.ccall('kgePonderBegin', 'number', [], []);
  (async () => {
    const pt0 = performance.now();
    while (token === pollToken) {
      await sleep(160);
      if (token !== pollToken) break;
      let ps; try { ps = pollStats(); } catch (_) { break; }
      post(ps, 'pondering', pt0);
    }
  })();

  return final;
}

// Instant per-move analysis (raw NN policy/value/ownership) — same NNEvaluator-backed
// net as search, so it's one net load and the analysis warms the cache search reuses.
async function evalPos(req) {
  if (!ready) throw new Error('engine not initialized');
  const n = writeMoves(req.moves || []);
  const HW = N * N;
  const ok = await M.ccall('kgeEvalSeqKata', 'number',
    ['number','number','number','number','number','number','number','number','number'],
    [mlPtr, mcPtr, n, req.toPlay, req.komi ?? 7.5, bPtr, pPtr, vPtr, req.owner ? oPtr : 0], { async: true });
  if (!ok) throw new Error('kgeEvalSeqKata: ' + M.ccall('kgeError', 'string', [], []));
  // Copy HEAP slices into standalone buffers we can transfer back to the page.
  return {
    board: M.HEAP32.slice(bPtr >> 2, (bPtr >> 2) + HW),
    policy: M.HEAPF32.slice(pPtr >> 2, (pPtr >> 2) + HW + 1),
    value: M.HEAPF32.slice(vPtr >> 2, (vPtr >> 2) + 5),
    owner: req.owner ? M.HEAPF32.slice(oPtr >> 2, (oPtr >> 2) + HW) : null,
  };
}

async function handleMessage(e) {
  const { id, type } = e.data;
  try {
    if (type === 'init') postMessage({ id, ok: true, ...(await init(e.data.netFile, e.data.boardSize, e.data.wasmBinary, e.data.jsText, e.data.forceCpu, e.data.fp16, e.data.optimism)) });
    else if (type === 'eval') {          // pollToken already bumped in onmessage (supersede)
      const r = await evalPos(e.data);
      const xfer = [r.board.buffer, r.policy.buffer, r.value.buffer]; if (r.owner) xfer.push(r.owner.buffer);
      postMessage({ id, ok: true, ...r }, xfer);
    }
    else if (type === 'search') {
      const token = pollToken;           // onmessage already bumped it; capture the current value
      const r = await search(e.data, token);
      postMessage({ id, ok: true, superseded: r === null, ...(r || {}) });
    }
    else if (type === 'strength') {      // limit playing strength for the next search
      M.ccall('kgeSetStrength', null, ['number','number','number'],
        [e.data.visits | 0, e.data.temp || 0, e.data.policyTemp || 1]);
      postMessage({ id, ok: true });
    }
    else throw new Error('unknown message type: ' + type);
  } catch (err) {
    postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
}

// SERIALIZE all engine access. The module is built with -sASYNCIFY, which allows only ONE
// suspended async call at a time — two overlapping messages (e.g. an eval placed while a
// search is mid-flight) would each enter a ccall and corrupt the asyncify stack -> a bare
// "Aborted()". onmessage is async, so without this the JS event loop could interleave two
// handlers. Chaining them through one promise guarantees strictly-one-at-a-time execution.
// (The detached ponder poll-loop stays outside this, but it only makes SYNC ccalls and is
// already gated by pollToken, which is bumped before any handler suspends.)
let engineChain = Promise.resolve();
onmessage = (e) => {
  // Bump pollToken NOW (synchronously) for eval/search so a running search/ponder yields
  // its chain link immediately — the queued handler then runs without waiting out the full
  // search budget. Soundness (one async ccall at a time) still comes from the chain below.
  const t = e.data.type;
  if (t === 'eval' || t === 'search') pollToken++;
  engineChain = engineChain.then(() => handleMessage(e));
};
