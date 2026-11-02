/* Bagian bersama layar petugas dan panel: tema, panggilan API, kode di sessionStorage. */
import {bacaKode, RE_KODE} from "./murni.js";

export const $ = id => document.getElementById(id);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
export const angka = n => Number(n || 0).toLocaleString("id-ID");

/* tombol tema: sama dengan halaman lain (kunci pk-tema, nilai JSON) */
export function pasangTema() {
  $("tema")?.addEventListener("click", () => {
    const gelap = document.documentElement.dataset.theme !== "dark";
    document.documentElement.dataset.theme = gelap ? "dark" : "light";
    try { localStorage.setItem("pk-tema", JSON.stringify(gelap ? "dark" : "light")); } catch (e) {}
  });
}

/* kode pribadi: fragmen dibaca sekali, disimpan di sessionStorage, lalu dihapus dari address bar */
const KUNCI = "lp.kode";
export function ambilKode() {
  const dariHash = bacaKode(location.hash);
  if (dariHash) {
    try { sessionStorage.setItem(KUNCI, dariHash); } catch (e) {}
    history.replaceState(null, "", location.pathname + location.search);
    return dariHash;
  }
  try { const k = sessionStorage.getItem(KUNCI); return RE_KODE.test(k || "") ? k : null; } catch (e) { return null; }
}
export const simpanKode = k => { try { sessionStorage.setItem(KUNCI, k); } catch (e) {} };

/* panggilan API: {ok, status, data}; galat jaringan -> status 0. POST/DELETE selalu membawa x-pb. */
export async function api(url, {metode = "GET", badan, kode, cookie = false} = {}) {
  const h = {};
  if (kode) h["x-kode"] = kode;
  if (metode !== "GET") h["x-pb"] = "1";
  if (badan !== undefined) h["content-type"] = "application/json";
  try {
    const r = await fetch(url, {method: metode, headers: h, body: badan === undefined ? undefined : JSON.stringify(badan), credentials: cookie ? "same-origin" : "omit"});
    const data = await r.json().catch(() => ({}));
    return {ok: r.ok, status: r.status, data};
  } catch (e) { return {ok: false, status: 0, data: {}}; }
}

/* kiriman multipart (foto): FormData dibangun pemanggil; content-type diisi peramban (batas bagian). Kode pribadi di x-kode. */
export async function kirimForm(url, form, {kode, cookie = false} = {}) {
  const h = {"x-pb": "1"};
  if (kode) h["x-kode"] = kode;
  try {
    const r = await fetch(url, {method: "POST", headers: h, body: form, credentials: cookie ? "same-origin" : "omit"});
    const data = await r.json().catch(() => ({}));
    return {ok: r.ok, status: r.status, data};
  } catch (e) { return {ok: false, status: 0, data: {}}; }
}

/* konstanta publik (sudut, mutu, tantangan, GPS) dibaca sekali dari server; klien tidak menyimpan angka sendiri */
let _konst = null;
export async function ambilKonst() {
  if (_konst) return _konst;
  const r = await api("/api/petugas/konst");
  if (!r.ok || !r.data?.syarat_sudut) throw new Error("konstanta tidak termuat");
  return _konst = r.data;
}

/* satu rAF + timeout cadangan: klik berubah keadaan dulu, kerja berat sesudahnya (INP) */
export const nanti = f => { let s = 0; const go = () => { if (!s++) f(); }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };

/* Super Admin = probe daftar staf (hanya Super Admin yang boleh 200); satu kali per muat halaman */
let _super = null;
export const adalahSuper = () => _super ??= api("/api/staf/admin/daftar", {cookie: true}).then(r => r.ok);

/* tombol dummy dua ikon, Super Admin saja. Super Admin = probe daftar staf (hanya Super Admin yang boleh 200). */
export async function pasangDummy(bukaKode = false) {
  const kotak = $("lpDummy"); if (!kotak) return;
  const probe = await api("/api/staf/admin/daftar", {cookie: true});
  if (!probe.ok) return;
  kotak.hidden = false;
  const pesan = t => { $("lpDummyPesan").textContent = t; };
  kotak.addEventListener("click", e => {
    const b = e.target.closest("[data-dummy]"); if (!b || b.disabled) return;
    const isi = b.dataset.dummy === "isi";
    kotak.querySelectorAll("button").forEach(x => { x.disabled = true; });
    pesan(isi ? "Mengisi data contoh..." : "Menghapus data contoh...");
    nanti(async () => {
      const r = await api("/api/petugas/dummy", {metode: isi ? "POST" : "DELETE", cookie: true, badan: isi ? {} : undefined});
      if (!r.ok) { pesan("Gagal. Ulangi."); kotak.querySelectorAll("button").forEach(x => { x.disabled = false; }); return; }
      if (isi && bukaKode && r.data?.kode) simpanKode(r.data.kode);
      if (!isi) { try { sessionStorage.removeItem(KUNCI); } catch (e) {} }
      location.replace(isi && bukaKode && r.data?.kode ? `${location.pathname}#k=${r.data.kode}` : location.pathname);
      location.reload();   // muat ulang PENUH (DUMMY.md syarat 6)
    });
  });
}
