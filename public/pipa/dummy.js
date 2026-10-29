/* SIPPA: tombol dummy Super Admin (DS §3.19, PRD §9.14, ~/.claude/DUMMY.md). Dua ikon di tempat yang sama tiap layar:
   🧪 mengisi dummy untuk layar yang sedang dibuka, 🧹 menghapus SELURUH dummy SIPPA. Sesudah keduanya: muat ulang penuh.
   Tidak ada data di berkas ini; logika (jalankan, kalimat) murni dan diuji tanpa DOM. Teks galat server hanya lewat textContent. */

const AKSI = {isi: "/api/sippa/dummy/isi", hapus: "/api/sippa/dummy/hapus"};
const RE_LAYAR = /^[a-z0-9]{1,16}$/;
const KUNCI_PESAN = "sp-dummy-pesan";
const angka = n => typeof fmt === "function" ? fmt(n) : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});
const jumlah = o => Object.values(o && typeof o === "object" ? o : {}).reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0);

/* hanya Super Admin: data-super dari cangkang halamanSippa ("1" persis) */
export const bolehDummy = data => data?.super === "1";

const GALAT = {
  409: "Dummy layar ini sudah ada untuk periode itu. Hapus dulu lewat 🧹 bila ingin mengisi ulang.",
  429: "Terlalu sering. Tunggu sebentar lalu coba lagi.",
  401: "Hanya Super Admin yang boleh mengisi atau menghapus dummy.",
  403: "Hanya Super Admin yang boleh mengisi atau menghapus dummy.",
  503: "Migrasi SIPPA belum diterapkan di basis data.",
  0: "Tidak bisa terhubung ke server.",
};

/* kalimat hasil dari balasan {ok, status, j} */
export function kalimat(aksi, h) {
  if (!h.ok) return GALAT[h.status] ?? (typeof h.j?.galat === "string" && h.j.galat ? h.j.galat : "Gagal. Coba lagi.");
  if (aksi === "isi") {
    const n = jumlah(h.j?.dibuat);
    return n ? `Dummy terisi: ${angka(n)} baris.` : "Tidak ada baris dummy untuk layar ini: datanya dari berkas turunan, bukan dari tabel dummy.";
  }
  return `${angka(jumlah(h.j?.dihapus))} baris dummy dihapus. Data nyata tidak tersentuh.`;
}

/* kirim(url, body) -> {ok, status, j}; melempar hanya untuk aksi atau layar liar, sebelum jaringan disentuh */
export async function jalankan(aksi, layar, kirim) {
  if (!Object.hasOwn(AKSI, aksi)) throw new Error(`aksi dummy tidak dikenal: ${aksi}`);
  if (aksi === "isi" && !RE_LAYAR.test(layar ?? "")) throw new Error("layar dummy tidak sah");
  const h = await kirim(AKSI[aksi], aksi === "isi" ? {layar} : {});
  return {ok: h.ok, status: h.status, pesan: kalimat(aksi, h)};
}

/* ---------- DOM ---------- */
const el = (tag, kelas, teks, atribut = {}) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; for (const [k, v] of Object.entries(atribut)) e.setAttribute(k, v); return e; };

/* pesan sesudah muat ulang: dibaca sekali oleh cangkang, lalu dibuang */
export function ambilPesan() { try { const p = sessionStorage.getItem(KUNCI_PESAN); sessionStorage.removeItem(KUNCI_PESAN); return p; } catch { return null; } }
const titip = p => { try { sessionStorage.setItem(KUNCI_PESAN, p); } catch { /* penyimpanan diblokir: muat ulang tetap jalan */ } };

function konfirmasiHapus() {
  return new Promise(ok => {
    const d = el("dialog", "sp-dialog sp-dialog-sempit"), kepala = el("div", "dh"), h = el("h3", "", "Hapus seluruh data dummy SIPPA?"), badan = el("div", "db"), aksi = el("div", "sp-dialog-aksi");
    const batal = el("button", "ad-tombol", "Batal", {type: "button"}), ya = el("button", "ad-tombol sp-tombol-bahaya", "Hapus dummy", {type: "button"});
    h.tabIndex = -1; kepala.append(h);
    badan.append(el("p", "", "Semua baris dummy di kit, tugas, gerak, log, probe, dan BBM ikut terhapus, termasuk foto dummy. Data nyata tidak tersentuh."), aksi);
    aksi.append(batal, ya); d.append(kepala, badan);
    let hasil = false;
    ya.addEventListener("click", () => { hasil = true; d.close(); });
    batal.addEventListener("click", () => d.close());
    d.addEventListener("close", () => { d.remove(); ok(hasil); });
    document.body.append(d); d.showModal(); batal.focus();
  });
}

/* tempat = kontainer di header; layar = layar yang sedang dibuka (dibaca ulang tiap klik lewat fungsi); kirim = konteks.kirim */
export function pasangDummy(tempat, {layar, kirim, pesan}) {
  const wadah = el("div", "sp-dummy", null, {role: "group", "aria-label": "Data dummy"});
  const tombol = (aksi, ikon, judul, label) => { const b = el("button", "ad-tombol ad-bulat", ikon, {type: "button", title: judul, "aria-label": label, "data-dummy": aksi}); return b; };
  const bIsi = tombol("isi", "🧪", "Isi data dummy untuk layar ini", "Isi data dummy untuk layar ini");
  const bHapus = tombol("hapus", "🧹", "Hapus seluruh data dummy SIPPA", "Hapus seluruh data dummy SIPPA");
  wadah.append(bIsi, bHapus); tempat.append(wadah);
  let sibuk = false;
  async function kerja(aksi, b) {
    if (sibuk) return;
    if (aksi === "hapus" && !await konfirmasiHapus()) return;
    sibuk = true; wadah.setAttribute("aria-busy", "true"); bIsi.disabled = bHapus.disabled = true;   // pixel urgen dulu, jaringan sesudahnya
    let h;
    try { h = await jalankan(aksi, layar(), kirim); }
    catch { h = {ok: false, pesan: "Gagal. Coba lagi."}; }
    if (h.ok) { titip(h.pesan); location.reload(); return; }
    sibuk = false; wadah.removeAttribute("aria-busy"); bIsi.disabled = bHapus.disabled = false;
    pesan(h.pesan); b.focus();
  }
  bIsi.addEventListener("click", () => kerja("isi", bIsi));
  bHapus.addEventListener("click", () => kerja("hapus", bHapus));
  return wadah;
}
