/* laporan_bnpb.js: halaman /laporan-bnpb. Tim mengetik angka laporan -> pratinjau slide langsung -> Simpan (D1, /api/laporan-bnpb) -> Unduh PPTX/PDF.
   Dua jenis: "harian" (Laporan Kejadian Bencana Harian) dan "presiden" (Paparan Kepala BNPB kepada Presiden, karhutla).
   Isian = satu objek JSON per (jenis, tanggal); bentuknya ditentukan BENTUK di bawah dan digambar laporan_bnpb_slide.js.
   Draf yang belum disimpan ditahan di localStorage peramban ini (per jenis+tanggal). Klik tidak membekukan layar: pratinjau ditunda. */
(() => {
const LB = window.LaporanBnpbSlide, PS = window.PaparanSlide, $ = s => document.querySelector(s);
const LIB = {
  pdf: ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", () => window.jspdf],   // sama dengan paparan.js
  pptx: ["https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js", () => window.PptxGenJS],
};
const _lib = {};
const muatLib = k => { const [url, ada] = LIB[k]; if (ada()) return Promise.resolve();
  return (_lib[k] ||= new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = url; s.crossOrigin = "anonymous"; s.async = true;
    s.onload = () => ada() ? ok() : gagal(new Error("Pustaka tidak lengkap")); s.onerror = () => { delete _lib[k]; gagal(new Error("Gagal memuat pustaka")); }; document.head.appendChild(s); })); };
const jeda = () => new Promise(r => setTimeout(r, 0));
const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const kini = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);   // tanggal WIB
const geser = LB.tambahHari;
const salin = o => JSON.parse(JSON.stringify(o));

/* ---------------------------------------------------------------- bentuk isian */
const BNPB6 = ["Kalimantan Tengah", "Sumatera Selatan", "Jambi", "Kalimantan Selatan", "Kalimantan Barat", "Riau"];
const UNSUR = ["TNI", "Perusahaan", "Polri", "Relawan", "Pemda", "MPA", "BPBD", "Polhut", "M. Agni"];
const LABEL_KES = ["Situasi", "Wilayah", "Tren", "Prioritas terkini", "Efektivitas", "Dampak dan kendala", "Konsesi", "OMC dan luar prioritas"];
const kosong = n => Array(n).fill(null);
const BARU = {
  harian: t => ({mulai: geser(t, -1), jam: "07.00", laporan_masuk: null, penyaji: "", jabatan: "", instansi: "Badan Nasional Penanggulangan Bencana", singkatan: "BNPB",
    kejadian: [], perhatian_tambahan: [], tindak: Array.from({length: 4}, () => ({judul: "", isi: ""})), judul_ringkasan: "", judul_rincian: ""}),
  presiden: t => ({judul: "Penanganan dan Pengendalian Kebakaran Hutan dan Lahan di Provinsi Prioritas", kepada: "Presiden Republik Indonesia", kepada_nama: "", penyaji: "", jabatan: "",
    instansi: "Badan Nasional Penanggulangan Bencana", hari: [-4, -3, -2].map(n => geser(t, n)), fs: kosong(3), sub_catatan: "",
    prov: BNPB6.map(nama => ({nama, hotspot: kosong(3), luas: kosong(3), belum: kosong(3), status: "", personel: null, heli: null, heli_ket: "heli WB", omc: null, wb_ha: null, kendala: ""})),
    penanganan: {personel: null, heli: null, pesawat: null, tanggal_unsur: "", unsur: UNSUR.map(nama => ({nama, n: null}))},
    omc: {judul: "", ket: "hujan setelah OMC", hujan: "", tanpa: ""},
    prioritas: {judul: "", pola: "pola El Niño", hari: Array.from({length: 7}, (_, i) => geser(t, i - 7)), periode: ["Okt tengah", "Okt akhir", "Nov awal", "Nov tengah", "Nov akhir"], sumber: "", baris: []},
    konsesi: {judul: "", sumber: "", kpi: {areal: null, areal_total: null, titik: null, titik7: null, ha: null, ha_konsesi: null, gambut: null, aktif: null},
      prov: [], jenis: ["Sawit", "HTI", "HPH", "Tambang"].map(nama => ({nama, ha: null, n: null, total: null}))},
    kesimpulan: LABEL_KES.map(label => ({label, judul: "", isi: ""})), arahan: "", judul_situasi: "", judul_efektivitas: ""}),
};
const JENIS_OPSI = Object.entries(LB.JENIS).map(([k, v]) => [k, v.nama]);
const STATUS_OPSI = [["berjalan", "Berjalan"], ["selesai", "Selesai/terkendali"], ["belum", "Belum selesai"]];
let PROV_OPSI = [];   // [kode, nama] dari /data/laporan.json

/* Formulir: tiap bagian = daftar medan. Medan: [jalur, label, jenis, opsi]. Jenis: t (teks), n (angka), d (tanggal), p (pilihan), a (teks panjang).
   Tabel: {tabel: jalur, kolom: [[kunci, label, jenis, lebar|opsi], ...]}; kolom angka berderet: [kunci, label, "n", lebar, jumlah]. */
const FORM = {
  harian: [
    {judul: "Umum", medan: [["mulai", "Periode mulai", "d"], ["jam", "Jam potong (WIB)", "t"], ["laporan_masuk", "Jumlah laporan kejadian masuk", "n"],
      ["penyaji", "Disampaikan oleh", "t"], ["jabatan", "Jabatan", "t"], ["instansi", "Instansi", "t"], ["singkatan", "Singkatan instansi", "t"]]},
    {judul: "Kejadian menonjol", ket: "Satu baris per kejadian. Baris berprovinsi sama dikelompokkan. Kolom keterangan: pisah dua pil dengan | (contoh: padam 95,93 | sisa 401,16).",
      tabel: "kejadian", kolom: [["jenis", "Jenis", "p", JENIS_OPSI], ["prov", "Provinsi", "p", "prov"], ["lokasi", "Kab/lokasi", "t", 9], ["utama", "Angka utama", "t", 11], ["kedua", "Angka kedua", "t", 8],
        ["ket", "Keterangan (pil)", "t", 11], ["catatan", "Catatan kecil", "t", 8], ["status", "Status", "p", STATUS_OPSI], ["perhatian", "Teks perlu perhatian", "t", 12]]},
    {judul: "Perlu perhatian tambahan", ket: "Kejadian berstatus belum selesai otomatis masuk. Tambahkan butir ringkasan di sini (maks. 6 tampil).",
      tabel: "perhatian_tambahan", kolom: [["jenis", "Jenis", "p", JENIS_OPSI], ["judul", "Judul", "t", 14], ["isi", "Isi", "t", 18], ["status", "Status", "p", STATUS_OPSI]]},
    {judul: "Yang akan dilakukan", tabel: "tindak", tetap: true, kolom: [["judul", "Judul", "t", 12], ["isi", "Isi", "t", 30]]},
    {judul: "Judul slide (opsional)", ket: "Kosong = judul dihitung otomatis dari angka.", lipat: true, medan: [["judul_ringkasan", "Judul slide ringkasan", "a"], ["judul_rincian", "Judul slide rincian", "a"]]},
  ],
  presiden: [
    {judul: "Sampul", medan: [["judul", "Judul paparan", "a"], ["kepada", "Disampaikan kepada", "t"], ["kepada_nama", "Nama penerima", "t"], ["penyaji", "Dipresentasikan oleh", "t"], ["jabatan", "Jabatan", "t"], ["instansi", "Instansi", "t"]]},
    {judul: "Situasi provinsi prioritas", ket: "Tiga tanggal data (kolom 1–3). Tombol Geser hari di atas memindahkan angka satu hari ke kiri untuk laporan berikutnya.",
      medan: [["hari.0", "Tanggal data 1", "d"], ["hari.1", "Tanggal data 2", "d"], ["hari.2", "Tanggal data 3", "d"], ["fs.0", "Fire spot 1", "n"], ["fs.1", "Fire spot 2", "n"], ["fs.2", "Fire spot 3", "n"], ["sub_catatan", "Catatan sub-judul", "t"]]},
    {judul: "Angka per provinsi", tabel: "prov", kolom: [["nama", "Provinsi", "t", 11], ["hotspot", "Hotspot", "n", 5, 3], ["luas", "Luas terbakar (ha)", "n", 5, 3], ["belum", "Belum padam (ha)", "n", 5, 3],
      ["status", "Penilaian", "t", 9], ["personel", "Personel", "n", 6], ["heli", "Heli", "n", 3], ["heli_ket", "Ket. heli", "t", 9], ["omc", "Sortie OMC", "n", 3], ["wb_ha", "Ha padam WB", "n", 4], ["kendala", "Kendala (pisah ;)", "t", 18]]},
    {judul: "Penanganan dan OMC", medan: [["penanganan.personel", "Personel darat", "n"], ["penanganan.heli", "Helikopter WB", "n"], ["penanganan.pesawat", "Pesawat patroli/OMC", "n"], ["penanganan.tanggal_unsur", "Tanggal data unsur", "t"],
      ["omc.judul", "OMC: angka besar", "t"], ["omc.ket", "OMC: keterangan", "t"], ["omc.hujan", "Hujan setelah OMC (pisah ;)", "t"], ["omc.tanpa", "Tanpa OMC (pisah ;)", "t"]]},
    {judul: "Personel per unsur", tabel: "penanganan.unsur", kolom: [["nama", "Unsur", "t", 10], ["n", "Personel", "n", 7]]},
    {judul: "Prioritas provinsi", ket: "Hotspot 7 hari dan peringkat bisa diisi dari satelit (laporan.json situs).", tombol: [["isiSatelit", "Isi hotspot 7 hari dari satelit"]],
      medan: [["prioritas.hari.0", "Hari pertama hotspot", "d"], ["prioritas.pola", "Pola peluang", "t"], ["prioritas.periode", "Periode peluang (pisah ,)", "t"], ["prioritas.sumber", "Sumber", "a"], ["prioritas.judul", "Judul (opsional)", "a"]]},
    {tabel: "prioritas.baris", judul: "Baris prioritas", kolom: [["peringkat", "Peringkat", "n", 3], ["nama", "Provinsi", "t", 11], ["status", "Status", "p", [["tetap", "Tetap"], ["masuk", "Masuk"], ["keluar", "Keluar"]]],
      ["total", "Total hotspot", "n", 6], ["luas", "Pil luas", "t", 7], ["titik", "Hotspot 7 hari", "n", 4, 7], ["peluang", "Peluang % (5 periode)", "n", 3, 5]]},
    {judul: "Konsesi", medan: [["konsesi.kpi.areal", "Areal konsesi terbakar", "n"], ["konsesi.kpi.areal_total", "Konsesi di peta", "n"], ["konsesi.kpi.titik", "Titik panas", "n"], ["konsesi.kpi.titik7", "Titik 7 hari terakhir", "n"],
      ["konsesi.kpi.ha", "Ha indikasi terbakar", "n"], ["konsesi.kpi.ha_konsesi", "Luas areal konsesi (ha)", "n"], ["konsesi.kpi.gambut", "Ha di gambut", "n"], ["konsesi.kpi.aktif", "Konsesi masih ada api", "n"],
      ["konsesi.sumber", "Sumber", "a"], ["konsesi.judul", "Judul (opsional)", "a"]]},
    {tabel: "konsesi.prov", judul: "Konsesi per provinsi (ha)", kolom: [["nama", "Provinsi", "t", 11], ["sawit", "Sawit", "n", 6], ["hti", "HTI", "n", 6], ["hph", "HPH", "n", 6], ["tambang", "Tambang", "n", 6], ["n", "Terbakar", "n", 4], ["total", "Total", "n", 4]]},
    {tabel: "konsesi.jenis", judul: "Konsesi per jenis usaha", tetap: true, kolom: [["nama", "Jenis", "t", 7], ["ha", "Ha", "n", 7], ["n", "Konsesi terbakar", "n", 5], ["total", "Total konsesi", "n", 5]]},
    {tabel: "kesimpulan", judul: "Kesimpulan", tetap: true, kolom: [["label", "Label", "t", 9], ["judul", "Judul", "t", 14], ["isi", "Isi", "t", 26]], medan: [["arahan", "Arahan", "a"]]},
    {judul: "Judul slide (opsional)", lipat: true, medan: [["judul_situasi", "Judul slide situasi", "a"], ["judul_efektivitas", "Judul slide efektivitas", "a"]]},
  ],
};

/* jalur "a.b.0.c" */
const ambil = (o, p) => p.split(".").reduce((x, k) => x == null ? x : x[k], o);
function pasang(o, p, v) { const ks = p.split("."); let x = o; for (let i = 0; i < ks.length - 1; i++) { if (x[ks[i]] == null) x[ks[i]] = /^\d+$/.test(ks[i + 1]) ? [] : {}; x = x[ks[i]]; } x[ks.at(-1)] = v; }
/* angka gaya Indonesia: "1.462" = 1462, "665,07" = 665.07; kosong = null */
const uraiAngka = s => { s = String(s).trim().replace(/\s/g, ""); if (!s) return null; const v = Number(s.replace(/\./g, "").replace(",", ".")); return Number.isFinite(v) ? v : NaN; };
const tulisAngka = v => v == null || v === "" ? "" : Number(v).toLocaleString("id-ID", {maximumFractionDigits: 3});

/* ---------------------------------------------------------------- keadaan */
const S = {jenis: "harian", tanggal: kini(), isi: null, daftar: [], ubah: false, gen: 0, sibuk: false, aset: {}, prov: {}, laporan: null, geo: null, tunda: 0};
const KUNCI_DRAF = () => `pk-lbnpb-${S.jenis}-${S.tanggal}`;
const simpanDraf = () => { try { localStorage.setItem(KUNCI_DRAF(), JSON.stringify(S.isi)); } catch (e) {} };
const bacaDraf = () => { try { return JSON.parse(localStorage.getItem(KUNCI_DRAF()) || "null"); } catch (e) { return null; } };
const hapusDraf = () => { try { localStorage.removeItem(KUNCI_DRAF()); } catch (e) {} };
const status = t => { $("#lbSt").textContent = t; };

/* ---------------------------------------------------------------- formulir */
function inputMedan(p, label, jenis, opsi) {
  const v = ambil(S.isi, p), id = "f-" + p.replace(/\./g, "-");
  if (jenis === "a") return `<label class="lb-m lebar" for="${id}">${esc(label)}<textarea id="${id}" data-p="${p}" data-j="t" rows="2">${esc(v)}</textarea></label>`;
  if (jenis === "p") return `<label class="lb-m" for="${id}">${esc(label)}<select id="${id}" data-p="${p}" data-j="t">${opsiHtml(opsi, v)}</select></label>`;
  const val = jenis === "n" ? tulisAngka(v) : Array.isArray(v) ? v.join(", ") : v ?? "";
  return `<label class="lb-m" for="${id}">${esc(label)}<input id="${id}" data-p="${p}" data-j="${p === "prioritas.periode" ? "l" : jenis}" ${jenis === "d" ? 'type="date"' : jenis === "n" ? 'inputmode="decimal"' : ""} value="${esc(val)}"></label>`;
}
const opsiHtml = (o, v) => (o === "prov" ? [["", "—"], ...PROV_OPSI] : o).map(([k, n]) => `<option value="${esc(k)}"${k === (v ?? "") ? " selected" : ""}>${esc(n)}</option>`).join("");
function tabelHtml(b) {
  const rows = ambil(S.isi, b.tabel) || [];
  const kep = b.kolom.map(([, l, , , n]) => `<th${n ? ` colspan="${n}"` : ""}>${esc(l)}</th>`).join("");
  const sel = (p, j, o, w) => j === "p" ? `<select data-p="${p}" data-j="t">${opsiHtml(o, ambil(S.isi, p))}</select>`
    : `<input data-p="${p}" data-j="${j}" ${j === "n" ? 'inputmode="decimal"' : ""} style="width:${w || 8}em" value="${esc(j === "n" ? tulisAngka(ambil(S.isi, p)) : ambil(S.isi, p) ?? "")}">`;
  const isi = rows.map((_, i) => `<tr data-i="${i}">${b.kolom.map(([k, , j, o, n]) => n ? Array.from({length: n}, (_, x) => `<td>${sel(`${b.tabel}.${i}.${k}.${x}`, j, o, o)}</td>`).join("")
    : `<td>${sel(`${b.tabel}.${i}.${k}`, j, o, typeof o === "number" ? o : 0)}</td>`).join("")}${b.tetap ? "" : `<td class="lb-aksi"><button type="button" data-a="naik" data-t="${b.tabel}" aria-label="Naikkan">&#9650;</button><button type="button" data-a="hapus" data-t="${b.tabel}" aria-label="Hapus baris">&#10005;</button></td>`}</tr>`).join("");
  return `<div class="lb-tabel"><table><thead><tr>${kep}${b.tetap ? "" : "<th></th>"}</tr></thead><tbody>${isi}</tbody></table></div>${b.tetap ? "" : `<button type="button" class="pp-btn kecil ke2" data-a="tambah" data-t="${b.tabel}">+ Tambah baris</button>`}`;
}
function gambarForm() {
  $("#lbForm").innerHTML = FORM[S.jenis].map(b => `<details class="lb-bag"${b.lipat ? "" : " open"}><summary>${esc(b.judul)}${b.tabel ? ` <small>${(ambil(S.isi, b.tabel) || []).length} baris</small>` : ""}</summary>
    ${b.ket ? `<p class="lb-ket">${esc(b.ket)}</p>` : ""}${(b.tombol || []).map(([a, l]) => `<button type="button" class="pp-btn kecil ke2" data-a="${a}">${esc(l)}</button>`).join("")}
    ${b.medan ? `<div class="lb-grid">${b.medan.map(m => inputMedan(...m)).join("")}</div>` : ""}${b.tabel ? tabelHtml(b) : ""}</details>`).join("");
}
$("#lbForm").addEventListener("input", e => {
  const el = e.target.closest("[data-p]"); if (!el) return;
  const j = el.dataset.j; let v = el.value;
  if (j === "n") { v = uraiAngka(v); el.classList.toggle("salah", Number.isNaN(v)); if (Number.isNaN(v)) return; }
  if (j === "l") v = v.split(",").map(s => s.trim()).filter(Boolean);
  pasang(S.isi, el.dataset.p, v);
  if (el.dataset.p === "prioritas.hari.0" && v) S.isi.prioritas.hari = Array.from({length: 7}, (_, i) => geser(v, i));
  tandaUbah();
});
$("#lbForm").addEventListener("click", e => {
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const a = b.dataset.a, t = b.dataset.t, arr = t && ambil(S.isi, t);
  if (a === "tambah") arr.push(barisBaru(t));
  else if (a === "hapus") arr.splice(+b.closest("tr").dataset.i, 1);
  else if (a === "naik") { const i = +b.closest("tr").dataset.i; if (!i) return; [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; }
  else if (a === "isiSatelit") return isiSatelit();
  else return;
  gambarForm(); tandaUbah();
});
function barisBaru(t) {
  const blok = FORM[S.jenis].find(b => b.tabel === t), o = {};
  for (const [k, , j, opsi, n] of blok.kolom) o[k] = n ? kosong(n) : j === "p" ? (opsi === "prov" ? "" : opsi[0][0]) : j === "n" ? null : "";
  return o;
}
function tandaUbah() { S.ubah = true; simpanDraf(); $("#lbSimpan").classList.add("perlu"); jadwalkan(); }

/* hotspot 7 hari dari satelit: laporan.json (titik per provinsi per hari WIB, deret L.hari). Peringkat = urutan jumlah 7 hari di 38 provinsi. */
function isiSatelit() {
  const L = S.laporan; if (!L) return status("Data satelit belum termuat.");
  const pz = S.isi.prioritas, akhir = L.hari.filter(h => h <= geser(S.tanggal, -1)).at(-1); if (!akhir) return status("Tidak ada data satelit sebelum tanggal laporan.");
  const ia = L.hari.indexOf(akhir), hr = L.hari.slice(Math.max(0, ia - 6), ia + 1); pz.hari = hr;
  const deret = k => hr.map(h => L.prov[k].titik[L.hari.indexOf(h)] ?? 0);
  const rank = Object.keys(L.prov).map(k => [k, deret(k).reduce((a, b) => a + b, 0)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const kodeDari = nama => Object.keys(L.prov).find(k => L.prov[k].nama.toLowerCase() === String(nama).trim().toLowerCase());
  if (!pz.baris.length) rank.slice(0, 7).forEach(k => pz.baris.push({...barisBaru("prioritas.baris"), nama: L.prov[k].nama}));
  let n = 0;
  for (const b of pz.baris) { const k = kodeDari(b.nama); if (!k) continue; b.titik = deret(k); b.peringkat = rank.indexOf(k) + 1; n++; }
  pz.baris.sort((a, b) => (/keluar/i.test(a.status) - /keluar/i.test(b.status)) || (a.peringkat ?? 99) - (b.peringkat ?? 99));
  gambarForm(); tandaUbah(); status(`Hotspot ${LB.tglK(hr[0])}–${LB.tglK(hr.at(-1))} diisi untuk ${n} provinsi dari satelit (laporan.json).`);
}
/* Geser hari: angka tiga hari pindah satu kolom ke kiri, kolom terakhir dikosongkan untuk hari baru */
function geserHari() {
  const i = S.isi;
  if (S.jenis === "presiden") {
    i.hari = [...i.hari.slice(1), geser(i.hari.at(-1), 1)]; i.fs = [...i.fs.slice(1), null];
    for (const p of i.prov) for (const k of ["hotspot", "luas", "belum"]) p[k] = [...(p[k] || kosong(3)).slice(1), null];
  } else i.mulai = geser(i.mulai, 1);
  gambarForm(); tandaUbah(); status("Hari digeser satu: isi kolom terakhir dengan angka hari baru.");
}

/* ---------------------------------------------------------------- server */
const api = async (u, o) => { const r = await fetch(u, {credentials: "same-origin", ...o}); const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.galat || r.status), {status: r.status}); return j; };
async function muatDaftar() {
  try { S.daftar = (await api(`/api/laporan-bnpb?jenis=${S.jenis}`)).daftar; }
  catch (e) { S.daftar = []; if (e.status === 403) status("Belum masuk: laporan tidak bisa disimpan. Masuk lewat /admin/masuk."); }
  $("#lbDaftar").innerHTML = `<option value="">Laporan tersimpan…</option>` + S.daftar.map(d => `<option value="${d.tanggal}"${d.tanggal === S.tanggal ? " selected" : ""}>${LB.tglP(d.tanggal)}</option>`).join("");
}
async function buka(tanggal, {dariTerakhir = false} = {}) {
  S.tanggal = tanggal; $("#lbTgl").value = tanggal;
  let isi = bacaDraf(), asal = isi ? "draf lokal (belum disimpan)" : "";
  if (!isi) try { isi = (await api(`/api/laporan-bnpb?jenis=${S.jenis}&tanggal=${tanggal}`)).isi; asal = "tersimpan di server"; } catch (e) { if (e.status !== 404 && e.status !== 403) console.warn(e); }
  if (!isi && dariTerakhir && S.daftar.length) {
    const lama = S.daftar.find(d => d.tanggal < tanggal) || S.daftar[0];
    try { isi = (await api(`/api/laporan-bnpb?jenis=${S.jenis}&tanggal=${lama.tanggal}`)).isi; asal = `salinan laporan ${LB.tglP(lama.tanggal)}; ubah angkanya lalu Simpan`; } catch (e) {}
  }
  S.isi = {...BARU[S.jenis](tanggal), ...(isi || {})}; S.ubah = !!asal && asal !== "tersimpan di server";
  $("#lbSimpan").classList.toggle("perlu", S.ubah);
  gambarForm(); status(asal ? `Laporan ${LB.tglP(tanggal)}: ${asal}.` : `Laporan baru ${LB.tglP(tanggal)}. Isi angkanya, pratinjau berubah langsung.`); jadwalkan();
}
async function simpan() {
  const b = $("#lbSimpan"); b.disabled = true; status("Menyimpan…");
  try { await api("/api/laporan-bnpb", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({jenis: S.jenis, tanggal: S.tanggal, isi: S.isi})});
    S.ubah = false; hapusDraf(); b.classList.remove("perlu"); await muatDaftar(); status(`Tersimpan: ${S.jenis === "harian" ? "Laporan Harian" : "Paparan Presiden"} ${LB.tglP(S.tanggal)}.`); }
  catch (e) { status(e.status === 403 ? "Gagal menyimpan: sesi masuk habis. Buka /admin/masuk di tab baru, lalu Simpan lagi (isian tetap aman di peramban ini)." : "Gagal menyimpan: " + e.message); }
  finally { b.disabled = false; }
}

/* ---------------------------------------------------------------- aset gambar */
const keDataUrl = (u, tipe = "image/png", w, h, q) => new Promise(r => { const im = new Image(); im.onload = () => { try { const c = document.createElement("canvas"); c.width = w || im.naturalWidth; c.height = h || im.naturalHeight;
  const sw = w ? Math.min(im.naturalWidth, im.naturalHeight * w / h) : im.naturalWidth, sh = w ? sw * h / w : im.naturalHeight;
  c.getContext("2d").drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, 0, 0, c.width, c.height); r(c.toDataURL(tipe, q)); } catch (e) { r(null); } }; im.onerror = () => r(null); im.src = u; });
async function muatAset() {
  const kr = await fetch("/img/kredit.json").then(r => r.json()).catch(() => []), k = f => kr.find(x => x.file === f);
  const fw = Math.round((PS.W - 6.95) * 150), fh = Math.round(PS.H * 150);
  const [logo, berakhlak, foto, penutup] = await Promise.all([keDataUrl("/img/lembaga/sumber-bnpb.png"), keDataUrl("/img/laporan-bnpb/berakhlak.png"),
    keDataUrl("/img/foto-pemadam.jpg", "image/jpeg", fw, fh, 0.82), keDataUrl("/img/laporan-bnpb/penutup.jpg", "image/jpeg", 1600, 900, 0.8)]);
  const kf = k("foto-pemadam.jpg"), kh = k("foto-heli.jpg");
  S.aset = {logo, berakhlak, foto: foto && {data: foto, kredit: kf ? `Foto: ${kf.penulis}, ${kf.lisensi}` : ""}, penutup, kreditPenutup: kh ? `Foto: ${kh.penulis}, ${kh.lisensi}` : ""};
}

/* peta kejadian harian: provinsi berwarna + gelembung jumlah per provinsi, digambar ke PNG (sama di pratinjau, PPTX, PDF) */
const BB = {lon0: 94.6, lon1: 141.2, lat0: -11.2, lat1: 6.3};
function petaPng(ks) {
  if (!S.geo) return null;
  const cw = 1750, ch = 732, c = document.createElement("canvas"); c.width = cw; c.height = ch; const g = c.getContext("2d");
  const sx = cw / (BB.lon1 - BB.lon0), sy = ch / (BB.lat1 - BB.lat0), s = Math.min(sx, sy), ox = (cw - (BB.lon1 - BB.lon0) * s) / 2, oy = (ch - (BB.lat1 - BB.lat0) * s) / 2;
  const P = ([x, y]) => [ox + (x - BB.lon0) * s, oy + (BB.lat1 - y) * s];
  const per = new Map(); for (const x of ks) if (x.prov) { if (!per.has(x.prov)) per.set(x.prov, []); per.get(x.prov).push(x); }
  const JS = LB.JENIS, dom = xs => Object.keys(JS).map(j => [j, xs.filter(x => x.jenis === j).length]).sort((a, b) => b[1] - a[1])[0][0];
  const pusat = {};
  for (const f of S.geo.features) {
    const kode = f.properties.kode, xs = per.get(kode), polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    g.fillStyle = xs ? "#" + (JS[dom(xs)]?.m || "F6D9BF") : "#E4E7EB"; g.strokeStyle = "#FFFFFF"; g.lineWidth = 1.2;
    let besar = 0;
    for (const poly of polys) { g.beginPath(); for (const ring of poly) ring.forEach((pt, i) => { const [x, y] = P(pt); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.fill("evenodd"); g.stroke();
      const r = poly[0]; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const a = (x1 - x0) * (y1 - y0); if (a > besar) { besar = a; pusat[kode] = [(x0 + x1) / 2, (y0 + y1) / 2]; } }
  }
  /* gelembung: yang bertumpuk didorong mendatar; label: coba kanan, kiri, atas, bawah, ambil posisi pertama yang tidak menabrak */
  const gb = [];
  for (const [kode, xs] of per) {
    if (!pusat[kode]) continue; let [x, y] = P(pusat[kode]); const r = 20 + Math.min(14, xs.length * 2);
    for (let t = 0; t < 8; t++) { const o = gb.find(q => Math.hypot(q.x - x, q.y - y) < q.r + r + 4); if (!o) break; x += (x >= o.x ? 1 : -1) * (o.r + r + 6 - Math.abs(o.x - x)); }
    gb.push({kode, xs, x, y, r, j: JS[dom(xs)] || JS.lainnya});
  }
  g.textBaseline = "middle";
  for (const b of gb) {
    g.fillStyle = "#" + b.j.w; g.strokeStyle = "#FFFFFF"; g.lineWidth = 4; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#FFFFFF"; g.font = "700 24px Roboto, Arial, sans-serif"; g.textAlign = "center"; g.fillText(String(b.xs.length), b.x, b.y + 1);
    if (b.xs.some(z => z.status === "belum")) { g.fillStyle = "#C8102E"; g.beginPath(); g.arc(b.x + b.r * 0.8, b.y - b.r * 0.8, 12, 0, 7); g.fill(); g.fillStyle = "#FFF"; g.font = "700 17px Roboto, Arial"; g.fillText("!", b.x + b.r * 0.8, b.y - b.r * 0.8 + 1); }
  }
  const kotak = gb.map(b => [b.x - b.r, b.y - b.r, b.x + b.r, b.y + b.r]), tabrak = q => kotak.some(o => q[0] < o[2] && q[2] > o[0] && q[1] < o[3] && q[3] > o[1]) || q[0] < 0 || q[2] > cw || q[1] < 0 || q[3] > ch;
  g.textAlign = "left";
  for (const b of gb) {
    const nama = S.prov[b.kode] || b.kode, ring = Object.keys(JS).map(k => [k, b.xs.filter(z => z.jenis === k).length]).filter(z => z[1]).map(([k, n]) => `${n} ${JS[k].nama.toLowerCase()}`).join(", ");
    g.font = "700 21px Roboto, Arial, sans-serif"; const w1 = g.measureText(nama).width; g.font = "500 17px Roboto, Arial, sans-serif"; const w2 = g.measureText(ring).width + 14, lw = Math.max(w1, w2), lh = 52;
    const calon = [[b.x + b.r + 8, b.y - 24], [b.x - b.r - 8 - lw, b.y - 24], [b.x - lw / 2, b.y - b.r - 6 - lh], [b.x - lw / 2, b.y + b.r + 6]];
    const [lx, ly] = calon.find(([x, y]) => !tabrak([x, y, x + lw, y + lh])) || calon[0];
    kotak.push([lx, ly, lx + lw, ly + lh]);
    g.font = "700 21px Roboto, Arial, sans-serif"; g.fillStyle = "#1A1A1A"; g.fillText(nama, lx, ly + 12);
    g.font = "500 17px Roboto, Arial, sans-serif"; g.fillStyle = "#" + b.j.m; g.beginPath(); g.roundRect(lx - 2, ly + 26, w2, 24, 12); g.fill(); g.fillStyle = "#" + b.j.w; g.fillText(ring, lx + 5, ly + 39);
  }
  return c.toDataURL("image/png");
}

/* ---------------------------------------------------------------- pratinjau & unduh */
const DECK = () => LB.DECK[S.jenis];
function konteks(no) { return {isi: S.isi, tanggal: S.tanggal, tahun: S.tanggal.slice(0, 4), prov: S.prov, aset: S.aset, no}; }
function siapkanPeta() { if (S.jenis === "harian") S.aset.peta = petaPng(S.isi.kejadian || []); }
function skala() { document.querySelectorAll(".sl-wrap").forEach(w => { w.firstChild.style.transform = `scale(${w.clientWidth / 1333})`; }); }
async function pratinjau() {
  if (!S.isi) return; const id = ++S.gen, grid = $("#lbGrid"); siapkanPeta(); grid.textContent = "";
  const d = DECK();
  for (let i = 0; i < d.length; i++) {
    if (id !== S.gen) return;
    const s = d[i], fig = document.createElement("figure"), w = document.createElement("div"), st = document.createElement("div");
    w.className = "sl-wrap"; st.className = "sl-stage"; w.append(st); fig.append(w);
    const cap = document.createElement("figcaption"); cap.textContent = `${i + 1}. ${s.judul}`; fig.append(cap); grid.append(fig);
    st.style.transform = `scale(${w.clientWidth / 1333})`;
    try { s.buat(konteks(i + 1)).html(st); } catch (e) { console.error("slide", s.id, e); st.innerHTML = `<div style="padding:40px;font:28px sans-serif">Slide gagal digambar: ${esc(s.id)} (${esc(e.message)})</div>`; }
    await jeda();
  }
}
const jadwalkan = () => { clearTimeout(S.tunda); S.tunda = setTimeout(pratinjau, 350); };
let robotoB64 = null;
async function muatRoboto() {   // sama dengan paparan.js: Roboto ditanam supaya PDF = PPTX
  if (robotoB64) return robotoB64;
  const b64 = async u => { const a = new Uint8Array(await (await fetch(u)).arrayBuffer()); let s = ""; for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode(...a.subarray(i, i + 8192)); return btoa(s); };
  try { robotoB64 = {n: await b64("/vendor/roboto/Roboto-Regular.ttf"), b: await b64("/vendor/roboto/Roboto-Bold.ttf")}; } catch (e) { robotoB64 = {}; }
  return robotoB64;
}
function unduhBlob(blob, nama) { const a = document.createElement("a"), u = URL.createObjectURL(blob); a.href = u; a.download = nama; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); }
const ukuran = b => b > 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.round(b / 1024) + " KB";
function namaBerkas(ext) {
  const t = S.tanggal, i = S.isi;
  if (S.jenis === "harian") return `Laporan-Kejadian-Bencana-Harian-${+i.mulai.slice(8)}-${+t.slice(8)}-${LB.tglK(t).split(" ")[1]}-${t.slice(0, 4)}.${ext}`;
  return `Paparan-Kepala-BNPB-kepada-Presiden-Karhutla-${LB.tglK(t).replace(" ", "-")}-${t.slice(0, 4)}.${ext}`;
}
async function unduh(jenis) {
  if (S.sibuk || !S.isi) return; S.sibuk = true; S.gen++;
  const tombol = [$("#lbPptx"), $("#lbPdf")]; tombol.forEach(b => b.disabled = true);
  try {
    status("Memuat pustaka…"); await muatLib(jenis); siapkanPeta(); await jeda();
    const d = DECK(), n = d.length, nama = namaBerkas(jenis); let blob;
    if (jenis === "pptx") {
      const P = new window.PptxGenJS(); P.layout = "LAYOUT_WIDE"; P.title = nama.replace(/\.pptx$/, "").replace(/-/g, " "); P.company = S.isi.instansi || "BNPB";
      for (let i = 0; i < n; i++) { status(`Menyusun slide ${i + 1}/${n}…`); await jeda(); d[i].buat(konteks(i + 1)).pptx(P.addSlide()); }
      status("Mengemas PPTX…"); await jeda(); blob = await P.write({outputType: "blob"});
    } else {
      const rb = await muatRoboto(), doc = new window.jspdf.jsPDF({orientation: "landscape", unit: "in", format: [PS.W, PS.H], compress: true});
      if (rb.n) { doc.addFileToVFS("Roboto-Regular.ttf", rb.n); doc.addFont("Roboto-Regular.ttf", "Roboto", "normal"); doc.addFileToVFS("Roboto-Bold.ttf", rb.b); doc.addFont("Roboto-Bold.ttf", "Roboto", "bold"); doc.__roboto = true; }
      for (let i = 0; i < n; i++) { status(`Menyusun slide ${i + 1}/${n}…`); await jeda(); if (i) doc.addPage([PS.W, PS.H], "landscape"); d[i].buat(konteks(i + 1)).pdf(doc); }
      status("Mengemas PDF…"); await jeda(); blob = doc.output("blob");
    }
    unduhBlob(blob, nama); status(`${nama}: ${n} slide, ${ukuran(blob.size)}.`); window.__lbTerakhir = {jenis, slide: n, bytes: blob.size, nama};
  } catch (e) { console.error(e); status("Gagal menyusun berkas: " + (e.message || e)); }
  finally { S.sibuk = false; tombol.forEach(b => b.disabled = false); }
}

/* ---------------------------------------------------------------- kontrol */
document.querySelectorAll("#lbJenis button").forEach(b => b.onclick = async () => {
  if (b.dataset.j === S.jenis) return;
  document.querySelectorAll("#lbJenis button").forEach(x => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
  S.jenis = b.dataset.j; await muatDaftar(); await buka(S.daftar[0]?.tanggal || kini());
});
$("#lbDaftar").onchange = e => { if (e.target.value) buka(e.target.value); };
$("#lbTgl").onchange = e => { if (e.target.value) buka(e.target.value, {dariTerakhir: true}); };
$("#lbSimpan").onclick = simpan;
$("#lbGeser").onclick = geserHari;
$("#lbPptx").onclick = () => unduh("pptx");
$("#lbPdf").onclick = () => unduh("pdf");
$("#lbEks").onclick = () => unduhBlob(new Blob([JSON.stringify({jenis: S.jenis, tanggal: S.tanggal, isi: S.isi}, null, 2)], {type: "application/json"}), `laporan-bnpb-${S.jenis}-${S.tanggal}.json`);
$("#lbImp").onchange = async e => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  try { const o = JSON.parse(await f.text()); if (!o || !LB.DECK[o.jenis] || !/^\d{4}-\d\d-\d\d$/.test(o.tanggal) || typeof o.isi !== "object") throw new Error("bukan berkas laporan");
    if (o.jenis !== S.jenis) document.querySelector(`#lbJenis button[data-j="${o.jenis}"]`).click();
    S.jenis = o.jenis; S.tanggal = o.tanggal; $("#lbTgl").value = o.tanggal; S.isi = {...BARU[o.jenis](o.tanggal), ...o.isi}; gambarForm(); tandaUbah(); status(`Diimpor dari ${f.name}. Tekan Simpan untuk menyimpan ke server.`); }
  catch (err) { status("Impor gagal: " + err.message); }
};
$("#lbBuang").onclick = () => { if (!confirm("Buang perubahan yang belum disimpan di peramban ini?")) return; hapusDraf(); buka(S.tanggal); };
window.addEventListener("resize", () => requestAnimationFrame(skala));
window.addEventListener("beforeunload", e => { if (S.ubah) e.preventDefault(); });
$("#tema").onclick = () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {} };

(async () => {
  const [L, geo] = await Promise.all([fetch("/data/laporan.json").then(r => r.json()).catch(() => null), fetch("/geo/provinsi.json").then(r => r.json()).catch(() => null), muatAset()]);
  S.laporan = L; S.geo = geo;
  if (L) { for (const [k, v] of Object.entries(L.prov)) S.prov[k] = v.nama; PROV_OPSI = Object.entries(S.prov).sort((a, b) => a[1].localeCompare(b[1], "id")); }
  $("#upd").textContent = "Laporan BNPB";
  await muatDaftar(); await buka(S.daftar[0]?.tanggal || kini());
})().catch(e => { console.error(e); status("Halaman gagal dimuat: " + e.message); });
window.__lb = S;
})();
