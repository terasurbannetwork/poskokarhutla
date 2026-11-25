/* Menu halaman petugas dari pintu "petugas" GET /api/peta-situs (paket data/kajian-bnpb/peta-situs D4, D8; tiket PS-07). Worker sudah menyaring per sesi,
   jadi /petugas/panel hanya muncul bila sesi boleh membukanya. CADANGAN digambar dulu tanpa menunggu jaringan; luring, galat, atau sesi tanpa pintu
   petugas (pemegang kode saja, staf) tetap memakai cadangan. Diminta sekali per muat halaman; tanpa handler klik (tautan polos). */
import {esc} from "./umum.js";
import {tautanAman} from "./murni.js";
import {ik} from "./ikon.js";

/* halaman tamu pintu petugas (akses "tamu" di src/peta_situs.js): terbuka tanpa sesi, jadi aman ditunjuk sebelum API menjawab */
export const CADANGAN = [["/petugas", "Pegawai dan relawan lapangan", "orang"], ["/lapangan", "Lapor lapangan", "pin"]];
/* kunci ikon registri -> ikon garis lokal ikon.js */
const IKON = {personel: "orang", grafik: "grafik", pin: "pin", daftar: "daftar", simpan: "simpan", banjir: "air"};

/* [[rute, nama, ikon]] dari jawaban API; null bila tidak ada pintu petugas yang bisa dipakai. Rute berpola (:id) dan rute tidak aman dibuang. */
export function butirPetugas(peta) {
  const p = Array.isArray(peta) ? peta.find(x => x?.pintu === "petugas") : null;
  const b = (p?.grup || []).flatMap(g => g?.butir || []).filter(x => tautanAman(x?.rute) && x.rute.startsWith("/") && !x.rute.includes(":"))
    .map(x => [x.rute, String(x.nama || x.rute), Object.hasOwn(IKON, x.ikon) ? IKON[x.ikon] : "daftar"]);
  return b.length ? b : null;
}

export const htmlMenu = (butir, kini) => butir.map(([r, n, i]) =>
  `<a class="lp-menu-a" href="${esc(r)}"${r === kini ? ' aria-current="page"' : ""}>${ik(i, 20)}<span>${esc(n)}</span></a>`).join("");

/* el = <nav>; ambil = fetch (disuntik di uji). Mengembalikan janji yang selesai sesudah menu akhir tergambar. */
export function pasangMenu(el, {kini = globalThis.location?.pathname || "/petugas", ambil = globalThis.fetch} = {}) {
  if (!el) return Promise.resolve();
  kini = kini.replace(/\/$/, "").replace(/\.html$/, "").replace(/\/index$/, "") || "/";
  const cad = kini === "/petugas/panel" ? [...CADANGAN, ["/petugas/panel", "Panel lapangan", "grafik"]] : CADANGAN;   // panel dibuka staf: tandai halamannya sendiri
  el.innerHTML = htmlMenu(cad, kini);
  return Promise.resolve().then(() => ambil("/api/peta-situs", {credentials: "same-origin", signal: AbortSignal.timeout(9000)}))
    .then(r => r.ok ? r.json() : null).catch(() => null)
    .then(m => { const b = butirPetugas(m); if (b) el.innerHTML = htmlMenu(b, kini); });
}
