/*
 * Seven Kingdoms MOD — fair initial independent town distribution.
 *
 * Original Battle::create_pregame_object chooses each initial neutral town's
 * race with race_random_list[i % race_random_list_max]. With 18 races but only
 * 7 or 15 starting towns, civilizations near the list's end are systematically
 * skipped. Shuffle the list once, after C++ initialization and before New Game.
 *
 * The original WASM bytes are unchanged. The guard identifies a unique,
 * validated ConfigAdv region and performs no write if the layout changes.
 */
(function () {
  'use strict';
  const TOTAL = 18;
  const IDS = Array.from({length: TOTAL}, (_, i) => i + 1);
  const state = {
    applied: false, count: TOTAL, locationFound: false,
    original: IDS.slice(), order: null, reason: 'waiting for game initialization'
  };
  window.__raceSpawnFixState = state;
  let address = -1, attempts = 0, started = false;

  function getHeap() {
    return (typeof HEAPU8 !== 'undefined' && HEAPU8 instanceof Uint8Array)
      ? HEAPU8 : null;
  }

  // Observed in MOD WASM: char race_random_list[18], 1 pad byte,
  // then an aligned little-endian int32 race_random_list_max=18.
  function isConfig(h, i) {
    if ((i + 19) % 4 !== 0 || i + 23 >= h.length) return false;
    for (let k = 0; k < TOTAL; k++) {
      if (h[i + k] !== k + 1) return false;
    }
    return h[i + 18] === 0 && h[i + 19] === 18 &&
      h[i + 20] === 0 && h[i + 21] === 0 && h[i + 22] === 0;
  }

  function findRaceList(h) {
    const matches = [];
    let i = 0;
    while ((i = h.indexOf(1, i)) !== -1) {
      if (i + 23 >= h.length) break;
      if (isConfig(h, i)) {
        matches.push(i);
        if (matches.length > 1) break; // refuse ambiguous writes
      }
      i++;
    }
    return matches.length === 1 ? matches[0] : -1;
  }

  function valid(h, p) {
    if (p < 0 || p + 23 >= h.length || (p + 19) % 4 !== 0 ||
        h[p + 19] !== 18 || h[p + 20] !== 0 ||
        h[p + 21] !== 0 || h[p + 22] !== 0) return false;
    const seen = new Set();
    for (let k = 0; k < TOTAL; k++) seen.add(h[p + k]);
    return seen.size === TOTAL && IDS.every(x => seen.has(x));
  }

  function pick(n) {
    if (window.crypto && window.crypto.getRandomValues) {
      const x = new Uint32Array(1);
      const limit = Math.floor(0x100000000 / n) * n;
      do { window.crypto.getRandomValues(x); } while (x[0] >= limit);
      return x[0] % n;
    }
    return Math.floor(Math.random() * n);
  }

  function shuffle(h, p) {
    const order = IDS.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = pick(i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (let i = 0; i < TOTAL; i++) h[p + i] = order[i];
    state.order = order;
    state.applied = true;
    state.reason = 'all 18 civilizations eligible for initial neutral towns';
    console.info('[7kaa MOD] Initial neutral-town civilization order:', order.join(','));
  }

  function attempt() {
    const h = getHeap();
    if (!h) return;
    if (address < 0) {
      address = findRaceList(h);
      attempts++;
      if (address < 0) {
        state.reason = 'ConfigAdv not uniquely identified — no memory changed';
        if (attempts >= 8) clearInterval(timer);
        return;
      }
      state.locationFound = true;
    }
    if (!valid(h, address)) {
      state.reason = 'race list changed or invalid — no memory changed';
      return;
    }
    // Reapply only if the engine itself restores the original sequential list.
    if (IDS.every((id, k) => h[address + k] === id)) shuffle(h, address);
  }

  const button = document.getElementById('start');
  if (button) button.addEventListener('click', function () {
    started = true;
    setTimeout(attempt, 120);
    setTimeout(attempt, 600);
  });
  const timer = setInterval(function () {
    if (!started) return;
    if (address < 0 && attempts >= 8) {
      clearInterval(timer);
      return;
    }
    attempt();
  }, 1400);
})();
