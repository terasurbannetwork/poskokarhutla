"use strict";
/* inti/profil_kab.js (PB-74, F-37, D15, D16): SATU pintu profil kab/kota untuk bencana selain karhutla dan banjir (keduanya memuat
   profil_wilayah.js langsung). Mesin ini hanya (1) menjaga gerbang registri kemampuan.layar.profil_kab di /bencana.json,
   (2) mengubah id hasil cari (kab "11.01", desa "11.01.01.2001", atau "1101") jadi kode BPS 4 digit, dan (3) memuat malas
   /inti/profil_wilayah.js lalu memanggil ProfilWilayah.buka(kode). Dialog, data (/data/wilayah/NN.json), dan isinya tetap milik
   profil_wilayah.js; tidak ada data baru, rute baru, atau salinan dialog (D16).

   Pemakaian: ProfilKab.pasang("gempa") sekali; ProfilKab.buka(id) mengembalikan Promise<boolean> (true = dialog dibuka).
   Registri gagal dimuat, id tak terdaftar, atau profil_kab bukan true = tidak membuka apa pun. */
(() => {
/* ---------- model murni (diuji di tests/layar/pb_profil_kab.test.mjs) ---------- */
/* kode BPS 4 digit dari id kab ("11.01"), id desa ("11.01.01.2001"), atau kode ("1101", "110101..."); null bila bukan kode wilayah */
const kode4 = id => { const s = String(id ?? "").trim(); if (!s) return null;
  const p = s.split(".");
  if (p.length >= 2 && /^\d{2}$/.test(p[0]) && /^\d{2}$/.test(p[1])) return p[0] + p[1];
  return /^\d{4}(\d*)$/.test(s) ? s.slice(0, 4) : null; };
const izinReg = (daftar, id) => id !== "karhutla" && id !== "banjir" && (daftar || []).find(b => b.id === id)?.kemampuan?.layar?.profil_kab === true;

/* ---------- tampilan ---------- */
const SRC = (document.currentScript && document.currentScript.src) || "/inti/profil_kab.js";
const PROFIL = new URL("profil_wilayah.js", SRC).href;
let REG = null, ID = null, MUAT = null;
const registri = () => REG ||= typeof fetch === "function" ? fetch("/bencana.json").then(r => r.ok ? r.json() : Promise.reject(new Error("registri " + r.status))).then(j => j.bencana || [], () => []) : Promise.resolve([]);
/* profil_wilayah.js dimuat sekali, hanya saat pertama dibutuhkan (jalur kritis halaman tidak bertambah) */
/* ProfilWilayah adalah const global (bukan properti window), jadi dirujuk lewat typeof */
const ada = () => typeof ProfilWilayah !== "undefined" ? ProfilWilayah : null;
const muatProfil = () => MUAT ||= new Promise((ok, gagal) => {
  if (ada()) return ok(ada());
  const s = document.createElement("script"); s.src = PROFIL; s.async = true;
  s.onload = () => ada() ? ok(ada()) : gagal(new Error("profil_wilayah")); s.onerror = () => { MUAT = null; gagal(new Error("profil_wilayah")); };
  document.head.appendChild(s); });
const diizinkan = async () => !!ID && izinReg(await registri(), ID);
async function buka(id) {
  const k = kode4(id); if (!k || !(await diizinkan())) return false;
  try { const P = await muatProfil(); P.buka(k); return true; } catch (e) { console.warn("profil kab", e); return false; } }

window.ProfilKab = {pasang: id => { ID = id; return window.ProfilKab; }, diizinkan, buka, registri, model: {kode4, izinReg}};
})();
