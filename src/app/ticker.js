// One shared ticker. Hero subscribes at 1000 ms, cards at 60000 ms. Pauses while the tab is hidden and
// fires immediately on return, so numbers are always recomputed from Date.now() (no accumulated drift).
export function createTicker({
  now = () => Date.now(),
  set = setInterval,
  clear = clearInterval,
  isHidden = () => typeof document !== "undefined" && document.hidden,
} = {}) {
  const subs = new Map(); // fn -> { every, last }
  let handle = null;
  const run = (force) => {
    if (isHidden() && !force) return;
    const t = now();
    for (const [fn, s] of subs)
      if (force || t - s.last >= s.every - 5) {
        s.last = t;
        fn(t);
      }
  };
  const start = () => {
    if (!handle && subs.size) handle = set(() => run(false), 1000);
  };
  const stop = () => {
    if (handle && !subs.size) {
      clear(handle);
      handle = null;
    }
  };
  return {
    subscribe(fn, every = 1000) {
      subs.set(fn, { every, last: 0 });
      start();
      fn(now());
      return () => {
        subs.delete(fn);
        stop();
      };
    },
    onVisible() {
      run(true);
    }, // call from a 'visibilitychange' listener when document.hidden === false
    size: () => subs.size,
  };
}
