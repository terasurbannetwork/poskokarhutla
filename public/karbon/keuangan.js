/* Tab Keuangan: arus kas per tahun, NPV/IRR/balik modal, dan kisi sensitivitas harga × volume untuk satu proyek.
   Asumsi di sini hanya untuk coba-coba; simpan lewat tab Proyek. */
import * as AK from "./akuntansi.js";
import {S, h, ganti, ang, T, judul, kosong, tabel, segmen, pilihan, hias, nanti, kabar, pesanGalat, uang, ribuan} from "./alat.js";
import {statDari, proyeksi, kas, ringkasKeuangan, formAsumsi, sumberGfw} from "./ranah.js";
import {muatDetail, asumsiProyek} from "./proyek.js";

const HARGA = [4, 6, 8, 10, 12, 15, 20], VOLUME = [.5, .75, 1, 1.25, 1.5];
const K = {id: "", uang: "USD"};

export async function render(panel) {
  const L = S.proyek.filter(p => p.stat_diambil);
  if (!L.length) { ganti(panel, judul("Keuangan"), kosong("Belum ada proyek dengan data satelit. Tarik data satelit di tab Proyek dulu.")); return; }
  if (!L.some(p => p.id === K.id)) K.id = L[0].id;
  ganti(panel, judul("Keuangan", "Arus kas dan kepekaan nilai proyek terhadap harga dan volume kredit."), h("p", {class: "kb-st"}, "Memuat proyek…"));
  let p;
  try { p = await muatDetail(K.id); } catch (e) { ganti(panel, judul("Keuangan"), kosong(pesanGalat(e, "memuat proyek"))); return; }
  const st = statDari(p);
  let a = asumsiProyek(p);
  const hasil = h("div");
  const hitung = () => nanti(() => gambar(hasil, st, a));
  ganti(panel,
    judul("Keuangan", "Arus kas dan kepekaan nilai proyek terhadap harga dan volume kredit."),
    h("div", {class: "kb-saring"},
      h("label", {class: "kb-f"}, h("span", null, "Proyek"), pilihan(L.map(x => [x.id, x.nama]), K.id, {"aria-label": "Proyek", onchange: e => { K.id = e.target.value; nanti(() => render(panel)); }})),
      h("div", {class: "kb-f"}, h("span", null, "Mata uang"), segmen([["USD", "USD"], ["Rp", "Rupiah"]], K.uang, v => { K.uang = v; hitung(); }, "Mata uang"))),
    h("details", {class: "lipat kb-lipat"}, h("summary", null, "Asumsi (coba-coba, tidak disimpan)"), h("div", {class: "isi"}, formAsumsi(a, st, b => { a = b; hitung(); }))),
    hasil);
  hias(panel); gambar(hasil, st, a);
}

function gambar(el, st, a) {
  const pr = proyeksi(st, a); if (pr.galat) return ganti(el, h("p", {class: "kb-galat"}, pr.galat));
  const k = kas(pr, a); if (k.galat) return ganti(el, h("p", {class: "kb-galat"}, k.galat));
  const f = K.uang === "Rp" ? a.kurs : 1, u = v => uang(v * f, K.uang);
  const sumber = sumberGfw([st]);
  let grid;
  try { grid = AK.sensitivitas(st, a, HARGA, VOLUME, S.frl); } catch (e) { kabar(e.message); grid = []; }
  const semua = grid.flat().filter(v => v >= 0).sort((x, y) => x - y), q = [.25, .5, .75].map(p => semua[Math.floor(p * (semua.length - 1))] ?? 0);
  const kelas = v => v < 0 ? "neg" : "n" + q.filter(x => v > x).length;
  const C = [["terbit_t", `Estimasi kredit terbit (${T})`, 0], ["harga_usd", `Harga (${K.uang}/${T})`, 2], ["pendapatan_usd", "Pendapatan"], ["capex_usd", "Biaya awal"], ["opex_usd", "Operasi"], ["verifikasi_usd", "Verifikasi"],
    ["pnbp_usd", "PNBP"], ["bagi_hasil_usd", "Bagi hasil"], ["komunitas_usd", "Komunitas"], ["pajak_usd", "Pajak"], ["arus_usd", "Arus kas"]];
  ganti(el,
    h("p", {class: "kb-cat"}, `Kurs ${ang(a.kurs)} Rp/USD (asumsi)${K.uang === "Rp" ? ", dipakai untuk semua angka rupiah di bawah" : ""}.`),
    ringkasKeuangan(st, a, pr, K.uang),
    h("h3", null, `Arus kas per tahun (${K.uang})`),
    tabel([{t: "Tahun", f: r => r.tahun}, ...C.map(([kk, t, d]) => ({t, n: 1, f: r => d != null ? ang(kk === "harga_usd" ? r[kk] * f : r[kk], kk === "harga_usd" && f > 1 ? 0 : d) : u(r[kk])}))], k.baris,
      {kaki: (_, i) => i === 0 ? "Total" : C[i - 1][2] != null ? (i === 1 ? ang(k.baris.reduce((s, r) => s + r.terbit_t, 0)) : "") : u(k.baris.reduce((s, r) => s + r[C[i - 1][0]], 0))}),
    h("h3", null, `NPV menurut harga dan volume (${K.uang})`),
    h("p", {class: "kb-cat"}, `Baris = harga per ${T} (USD), kolom = volume estimasi kredit dibanding perkiraan. Merah = NPV negatif. Dibulatkan ke ribuan.`),
    tabel([{t: `Harga (USD/${T})`, f: r => ang(r.h)}, ...VOLUME.map((v, j) => ({t: `Volume ${ang(v * 100)}%`, n: 1, f: r => h("span", {class: "kb-sens " + kelas(r.v[j])}, ribuan(r.v[j] * f))}))],
      grid.map((v, i) => ({h: HARGA[i], v}))),
    h("p", {class: "kb-cat"}, sumber));
}
