/* Pemuat MapLibre bersama (vendor lokal /vendor/maplibre), dipakai layar SIPPA peta dan kunjungan.
   Sekali muat per halaman; gagal = janji dibuang supaya bisa dicoba lagi. */
let pustaka = null;
export function muatMapLibre() {
  if (globalThis.maplibregl) return Promise.resolve();
  return pustaka ??= new Promise((ok, gagal) => {
    const c = document.createElement("link"); c.rel = "stylesheet"; c.href = "/vendor/maplibre/maplibre-gl.css"; document.head.append(c);
    const s = document.createElement("script"); s.src = "/vendor/maplibre/maplibre-gl.js"; s.onload = ok; s.onerror = () => gagal(new Error("Pustaka peta tidak bisa dimuat.")); document.head.append(s);
  }).catch(e => { pustaka = null; throw e; });
}
