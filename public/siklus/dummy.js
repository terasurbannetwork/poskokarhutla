/* Siklus Bencana: tombol dummy dua ikon, Super Admin saja (DS 2.11, ~/.claude/DUMMY.md). inti.js hanya memanggil pasangDummy bila peran SA terbukti; DOM-nya tidak dibuat untuk peran lain.
   Ikon labu: isi dummy untuk HALAMAN yang dibuka (periode dibaca dari window.SK.periode(), didaftarkan layar). Ikon sapu: hapus SELURUH dummy modul Siklus.
   Sesudah isi atau hapus: muat ulang PENUH; toast "N baris dummy dibuat" memakai jumlah nyata dari rute. Rute dan penghapusan milik warga-api (POST /api/siklus/dummy). */
import {h, ik, api, tanya, toast, angka} from "./inti.js";

const KUNCI = "sk-dummy-pesan";
const GALAT = {409: "Dummy untuk halaman ini sudah ada. Hapus dulu dengan ikon sapu bila ingin mengisi ulang.", 429: "Terlalu sering. Tunggu sebentar lalu coba lagi.", 401: "Hanya Super Admin yang boleh mengisi atau menghapus dummy.", 403: "Hanya Super Admin yang boleh mengisi atau menghapus dummy.",
  503: "Migrasi Siklus belum diterapkan di basis data.", 0: "Tidak bisa terhubung ke server."};
const jumlah = o => Object.values(o && typeof o === "object" ? o : {}).reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0);

/* kalimat hasil dari balasan {ok, status, j}; jumlah nyata dari per_tabel atau dibuat/dihapus */
export function kalimat(aksi, r) {
  if (!r.ok) return GALAT[r.status] ?? (typeof r.j?.galat === "string" && r.j.galat ? r.j.galat : "Gagal. Coba lagi.");
  const n = typeof r.j?.[aksi === "isi" ? "dibuat" : "dihapus"] === "number" ? r.j[aksi === "isi" ? "dibuat" : "dihapus"] : jumlah(r.j?.per_tabel);
  return aksi === "isi" ? (n ? `${angka(n)} baris dummy dibuat` : "Tidak ada baris dummy untuk halaman ini: datanya dari berkas contoh, bukan dari tabel dummy.") : `${angka(n)} baris dummy dihapus. Data nyata tidak tersentuh.`;
}
export async function jalankan(aksi, sk, kirim = api) {
  if (aksi !== "isi" && aksi !== "hapus") throw new Error(`aksi dummy tidak dikenal: ${aksi}`);
  const per = aksi === "isi" ? sk?.periode?.() ?? null : null, kab4 = per && typeof per.kab4 === "string" ? per.kab4 : null;
  const badan = {aksi, halaman: sk?.halaman ?? "kejadian", ...(per ? {periode: per} : {}), ...(kab4 ? {kab4} : {})};
  const r = await kirim("/api/siklus/dummy", {metode: "POST", badan});
  return {ok: r.ok, pesan: kalimat(aksi, r)};
}
export function ambilPesan() { try { const p = sessionStorage.getItem(KUNCI); sessionStorage.removeItem(KUNCI); return p; } catch (e) { return null; } }

export function pasangDummy(sk) {
  const tempat = document.getElementById("sk-kepala"); if (!tempat || tempat.querySelector(".sk-dummy")) return null;
  const mk = (aksi, ikon, judul) => { const b = h("button", {type: "button", title: judul, "aria-label": judul, "data-dummy": aksi}, ik(ikon, 20)); return b; };
  const bIsi = mk("isi", "labu", "Isi data dummy untuk halaman ini"), bHapus = mk("hapus", "sapu", "Hapus seluruh data dummy Siklus");
  const wadah = h("div", {class: "sk-dummy", role: "group", "aria-label": "Data dummy"}, bIsi, bHapus);
  tempat.prepend(wadah);
  let sibuk = false;
  async function kerja(aksi, b) {
    if (sibuk) return;
    if (aksi === "hapus" && !await tanya({judul: "Hapus seluruh data dummy Siklus?", teks: "Semua baris dummy modul Siklus ikut terhapus. Data nyata tidak tersentuh.", ya: "Hapus dummy", bahaya: true})) return;
    sibuk = true; wadah.setAttribute("aria-busy", "true"); bIsi.disabled = bHapus.disabled = true;   // chrome urgent dulu
    globalThis.nanti(async () => {
      let r; try { r = await jalankan(aksi, sk); } catch (e) { r = {ok: false, pesan: "Gagal. Coba lagi."}; }
      if (r.ok) { try { sessionStorage.setItem(KUNCI, r.pesan); } catch (e) { /* diblokir: muat ulang tetap jalan */ } location.reload(); return; }
      sibuk = false; wadah.removeAttribute("aria-busy"); bIsi.disabled = bHapus.disabled = false; toast(r.pesan); b.focus();
    });
  }
  bIsi.addEventListener("click", () => kerja("isi", bIsi)); bHapus.addEventListener("click", () => kerja("hapus", bHapus));
  const p = ambilPesan(); if (p) toast(p);
  return wadah;
}
