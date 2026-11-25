/* Menu halaman petugas dari pintu "petugas" GET /api/peta-situs (paket data/kajian-bnpb/peta-situs D4, D8; tiket PS-07, PS-09). Worker sudah menyaring per sesi,
   jadi /petugas/panel hanya muncul bila sesi boleh membukanya. Tanpa daftar tulisan tangan (PS-09): menu digambar dulu dari jawaban terakhir yang
   disimpan di HP (localStorage "pt-menu", hanya rute, nama, ikon; tetap jalan luring), lalu dari API bila berubah. Luring tanpa simpanan: satu pesan
   polos dan tautan ke beranda /petugas. 401 menghapus simpanan. Diminta sekali per muat halaman; tautan polos, satu pendengar klik fase tangkap hanya membuang simpanan saat Keluar. */
import {esc} from "./umum.js";
import {tautanAman} from "./murni.js";
import {ik} from "./ikon.js";

/* kunci ikon registri -> ikon garis lokal ikon.js */
const IKON = {personel: "orang", grafik: "grafik", pin: "pin", daftar: "daftar", simpan: "simpan", banjir: "air"};

/* [[rute, nama, ikon]] dari jawaban API; null bila tidak ada pintu petugas yang bisa dipakai. Rute berpola (:id) dan rute tidak aman dibuang. */
export function butirPetugas(peta) {
  const p = Array.isArray(peta) ? peta.find(x => x?.pintu === "petugas") : null;
  const b = (p?.grup || []).flatMap(g => g?.butir || []).filter(x => tautanAman(x?.rute) && x.rute.startsWith("/") && !x.rute.includes(":"))
    .map(x => [x.rute, String(x.nama || x.rute), Object.hasOwn(IKON, x.ikon) ? IKON[x.ikon] : "daftar"]);
  return b.length ? b : null;
}

const KUNCI = "pt-menu", IKON_LOKAL = new Set([...Object.values(IKON), "daftar"]);
const ruteAman = r => !!tautanAman(r) && r.startsWith("/") && !r.includes(":");
/* simpanan dibaca ulang dengan saringan yang sama (localStorage bisa diubah tangan) */
export function bacaSimpan(simpan) {
  try { const b = JSON.parse(simpan?.getItem(KUNCI));
    const ok = Array.isArray(b) ? b.filter(x => Array.isArray(x) && ruteAman(x[0]) && typeof x[1] === "string" && IKON_LOKAL.has(x[2])) : [];
    return ok.length ? ok : null; } catch (e) { return null; }
}
const GAGAL = "Menu belum bisa dimuat. Muat ulang halaman.";

export const htmlMenu = (butir, kini) => butir.map(([r, n, i]) =>
  `<a class="lp-menu-a" href="${esc(r)}"${r === kini ? ' aria-current="page"' : ""}>${ik(i, 20)}<span>${esc(n)}</span></a>`).join("");

export const htmlGagal = kini => `<span class="lp-menu-a">${esc(GAGAL)}</span>` + htmlMenu([["/petugas", "Beranda petugas", "orang"]], kini);

/* el = <nav>; ambil = fetch, simpan = localStorage (keduanya disuntik di uji). Mengembalikan janji yang selesai sesudah menu akhir tergambar. */
export function pasangMenu(el, {kini = globalThis.location?.pathname || "/petugas", ambil = globalThis.fetch, simpan = globalThis.localStorage} = {}) {
  if (!el) return Promise.resolve();
  kini = kini.replace(/\/$/, "").replace(/\.html$/, "").replace(/\/index$/, "") || "/";
  const lama = bacaSimpan(simpan);
  /* keluar (tombol #keluar dari /inti/keluar.js, atau form /admin/keluar): simpanan menu dibuang sebelum sesi dicabut */
  const buangKeluar = e => { if (e.target?.closest?.('#keluar, [data-staf-keluar], .ad-keluar, form[action="/admin/keluar"]')) try { simpan?.removeItem(KUNCI); } catch (x) {} };
  globalThis.document?.addEventListener("click", buangKeluar, true); globalThis.document?.addEventListener("submit", buangKeluar, true);
  el.innerHTML = lama ? htmlMenu(lama, kini) : "";
  let status = 0;
  return Promise.resolve().then(() => ambil("/api/peta-situs", {credentials: "same-origin", signal: AbortSignal.timeout(9000)}))
    .then(r => { status = r.status; return r.ok ? r.json() : null; }).catch(() => null)
    .then(m => { const b = butirPetugas(m);
      const buang = !b && (status === 401 || status === 403 || (status >= 200 && status < 300));   // jawaban tanpa butir petugas: simpanan dibuang (privasi); luring atau 5xx: simpanan tetap
      if (buang) try { simpan?.removeItem(KUNCI); } catch (e) {}
      if (b) { const t = JSON.stringify(b); if (t === JSON.stringify(lama)) return;   // sama dengan yang tergambar: tanpa gambar ulang
        try { simpan?.setItem(KUNCI, t); } catch (e) {} el.innerHTML = htmlMenu(b, kini); return; }
      if (!lama || buang) el.innerHTML = htmlGagal(kini); });
}
