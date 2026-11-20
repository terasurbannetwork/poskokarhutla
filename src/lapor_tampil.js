/* Bentuk jawaban Lapor Bencana BNPB (murni, tanpa D1 dan tanpa fetch): isian untuk layar, jawaban lacak, rincian meja, bahan dokumen PDF/Word, baris alun-alun.
   Port dari scripts/lapor/lokal.mjs (acuan perilaku yang disetujui pemilik 19 Nov 2026); src/lapor_ai.js memuat sesi lalu memanggil fungsi di sini.
   Objek sesi yang masuk = sesi mesin (isian, foto, transkrip) + s.tiket {status, riwayat}, s.balasan [{teks, waktu, oleh}], s.token (tautan lacak) bila perlu. */
import {lengkap, nilaiTampil, waktuLapor, KELOMPOK} from "./lapor_mesin.js";
import {berlakuSesi, JENIS} from "./lapor_spek.js";
import {BAHASA} from "./lapor_bahasa.js";

/* alamat berkas foto atau video: video memuat ekstensi (D77), foto dan sampul video tanpa ekstensi */
export const urlMedia = (f, q) => f.jenis === "video" ? `/api/lapor/foto/${f.id}.${f.eks}${q}` : `/api/lapor/foto/${f.id}${q}`;

export const PERAN = {warga: "Warga", bpbd_klaim: "Petugas BPBD (belum dikonfirmasi)", bpbd: "Petugas BPBD"};
/* status tiket (pemilik 19 Nov 2026: "bisa tau laporan lu sudah dilihat atau sudah ditanggapi, persis kaya tiket") */
export const STATUS = {baru: "Laporan diterima", dilihat: "Sudah dilihat petugas", ditelaah: "Sedang ditelaah", diteruskan: "Diteruskan ke BPBD setempat",
  ditindaklanjuti: "Ditindaklanjuti", selesai: "Selesai ditangani", tidak_valid: "Tidak dapat ditindaklanjuti"};
export const URUTAN = ["baru", "dilihat", "ditelaah", "diteruskan", "ditindaklanjuti", "selesai"];
export const PINDAH = {baru: ["dilihat"], dilihat: ["ditelaah", "tidak_valid"], ditelaah: ["diteruskan", "ditindaklanjuti", "tidak_valid"], diteruskan: ["ditindaklanjuti"],
  ditindaklanjuti: ["selesai"], selesai: ["ditelaah"], tidak_valid: ["ditelaah"]}; // ALGORITMA A8 + "dilihat" otomatis saat petugas membuka
/* susulan (F-28, Q26): 72 jam sejak terkirim, tiket belum selesai/tidak_valid, kurang dari 10 versi; s.jumlahVersi dipasang pemuat */
export const JENDELA_SUSULAN = 72 * 3600e3, KUNCI_SUSULAN = ["jenis", "subjenis", "lokasi", "waktu", "rtrw"];
export const bolehSusulan = (s, kini = Date.now()) => !!s?.nomor && kini - s.terkirim <= JENDELA_SUSULAN && !["selesai", "tidak_valid"].includes(s.tiket?.status) && (s.jumlahVersi || 1) < 10;
export const TAMPIL_ALUN = new Set(["ditindaklanjuti", "selesai"]);

export const nomorWa = s => { const d = String(s || "").replace(/\D/g, ""); const n = d.startsWith("0") ? "62" + d.slice(1) : d; return /^628\d{7,12}$/.test(n) ? n : null; };
export const tglWib = t => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
export const waSamar = wa => `0${wa.slice(2, 5)}****${wa.slice(-4)}`;
export const km = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return 6371 * Math.hypot(x, y); };
export const labelJenis = id => JENIS.find(j => j.id === id)?.label || null;

export function isianTampil(sesi) {
  return berlakuSesi(sesi).map(i => {
    const x = sesi.isian[i.nama];
    return {nama: i.nama, label: i.label, kelompok: KELOMPOK.find(k => k.id === i.kelompok).label, wajib: !!i.wajib,
      status: !x ? "kosong" : x.nihil ? "nihil" : x.belum ? (x.tidakTahu ? "tidaktahu" : "belum") : "isi", tampil: x ? nilaiTampil(i, x) : "", asal: x?.asal?.sumber || null};
  });
}
export const keluaran = (h, sesi) => ({balasan: h.inti, pilihan: h.pilihan, ket: h.pilihanKet || null, minta: h.minta || null, isiAwal: h.isiAwal || null, form: h.form || null,
  banyak: !!h.banyak, grup: h.grup || null, kunci: h.kunci || null, saran: h.saran || 0, status: sesi.status, lengkap: lengkap(sesi), isian: isianTampil(sesi), foto: (sesi.foto || []).length, bisaKembali: !!sesi.jejak?.length, kembali: !!h.kembali});
/* bagian jawaban yang sama untuk sesi yang sedang berjalan (cek status, GET /sesi) */
export const lanjutan = lanjut => ({pilihan: lanjut.pilihan, ket: lanjut.pilihanKet, minta: lanjut.minta, form: lanjut.form, banyak: lanjut.banyak, grup: lanjut.grup, kunci: lanjut.kunci, saran: lanjut.saran, isiAwal: lanjut.isiAwal,
  lengkap: lengkap(lanjut), isian: isianTampil(lanjut)});
export function sesiTampil(s) {
  if (!s) return {transkrip: []};
  return {transkrip: s.transkrip, nomor: s.nomor || null, pilihan: s.pilihan || null, ket: s.pilihanKet || null, minta: s.minta || null, isiAwal: s.isiAwal || null,
    form: s.form || null, banyak: !!s.banyak, grup: s.grup || null, kunci: s.kunci || null, saran: s.saran || 0, status: s.status, lengkap: lengkap(s), isian: isianTampil(s), foto: (s.foto || []).length,
    balasan: s.akhir?.inti || [...(s.transkrip || [])].reverse().find(t => t.dari === "bot")?.teks || null, bisaKembali: !!s.jejak?.length};
}

/* jawaban perintah "status": laporan milik nomor ini; milik = [{nomor, token, jenisLabel, terkirim, provKode, status}] */
export function jawabStatus(milik) {
  const balasan = milik.length ? `*Status laporan Anda*${milik.map(s => `\n\n*${s.nomor}*\n${s.jenisLabel || "Kejadian"}, dilaporkan ${waktuLapor(s.terkirim, s.provKode)}\nStatus: ${STATUS[s.status]}`).join("")}`
    : "*Belum ada laporan*\nNomor ini belum pernah mengirim laporan.";
  return {balasan, unduhan: milik.map(s => ({label: `Lacak ${s.nomor}`, url: `/lapor/lacak.html?t=${s.token}`, lacak: true}))};
}

/* ---------- dokumen PDF dan Word (KEPUTUSAN K8, D21): masukan scripts/lapor/dokumen.py ---------- */
export function bahanDokumen(s, p, fotoUrl) {
  const prov = s.isian.lokasi?.nilai?.wilayah?.provKode;
  const kelompok = KELOMPOK.map(k => ({judul: k.label, baris: berlakuSesi(s).filter(i => i.kelompok === k.id && i.nama !== "kronologi")
    .map(i => [i.label, nilaiTampil(i, s.isian[i.nama])])})).filter(g => g.baris.length);
  kelompok.push({judul: "Foto dan video", baris: (s.foto || []).length ? s.foto.map((f, n) => [`${f.jenis === "video" ? "Video" : "Foto"} ${n + 1}`, `${f.lencanaTeks}${f.lat != null ? `, ${f.lat.toFixed(5)}, ${f.lon.toFixed(5)}` : ""}${f.waktuAmbil ? `, diambil ${waktuLapor(f.waktuAmbil, prov)}` : ""}`]) : [["Foto", "Tidak ada"]]});
  // narasi gaya laporan pemantauan Koordalops (public/laporan_koordalops.js): judul, waktu, kronologis, dampak bernomor, kebutuhan
  const v = n => s.isian[n], ada = n => v(n) && !v(n).belum && !v(n).nihil, angka = n => ada(n) ? v(n).nilai : 0;
  const w = s.isian.lokasi?.nilai?.wilayah, jenis = labelJenis(v("jenis")?.nilai) || "Kejadian";
  const tempat = w ? `Desa/Kel. ${w.desa}${s.isian.lokasi.nilai.rt ? ` RT ${s.isian.lokasi.nilai.rt} RW ${s.isian.lokasi.nilai.rw}` : ""}, Kec. ${w.kec}, ${w.kab}, Prov. ${w.prov}` : "lokasi belum terbaca";
  const korban = [["meninggal", "meninggal dunia"], ["hilang", "hilang"], ["luka", "luka-luka"]].filter(([n]) => angka(n)).map(([n, t]) => `${angka(n).toLocaleString("id-ID")} orang ${t}`);
  const rumah = [["rumah_berat", "rusak berat"], ["rumah_sedang", "rusak sedang"], ["rumah_ringan", "rusak ringan"], ["rumah_terendam", "terendam"]].filter(([n]) => angka(n)).map(([n, t]) => `${angka(n).toLocaleString("id-ID")} unit ${t}`);
  const fas = [["fasilitas_sekolah", "sekolah", "nama_sekolah"], ["fasilitas_kesehatan", "fasilitas kesehatan", "nama_faskes"], ["fasilitas_ibadah", "tempat ibadah", "nama_ibadah"], ["jalan_jembatan", "titik jalan atau jembatan", "nama_jalan"]]
    .filter(([n]) => angka(n)).map(([n, t, nm]) => `${angka(n).toLocaleString("id-ID")} ${t}${ada(nm) ? ` (${v(nm).nilai})` : ""}`);
  const khusus = berlakuSesi(s).filter(i => i.kelompok === "khusus" && ada(i.nama)).map(i => `${i.label}: ${nilaiTampil(i, v(i.nama))}`);
  const narasi = {judul: `Bencana Alam ${jenis}${ada("subjenis") && v("subjenis").nilai !== "Belum diketahui" ? ` (${v("subjenis").nilai.toLowerCase()})` : ""} di ${w ? `${w.kab}, Prov. ${w.prov}` : "lokasi belum terbaca"}`,
    butir: [["Lokasi", tempat], ["Waktu kejadian", v("waktu")?.nilai || "belum didata"], ["Kronologis", v("kronologi")?.nilai || "belum didata"],
      ["Dampak", [`Korban jiwa: ${korban.length ? korban.join(", ") : v("meninggal")?.nihil ? "nihil" : "belum didata"}${angka("luka_inap") ? `, ${angka("luka_inap")} orang dirawat inap` : ""}.`,
        `Pengungsi: ${angka("mengungsi_jiwa") ? `${angka("mengungsi_jiwa").toLocaleString("id-ID")} jiwa${angka("mengungsi_kk") ? ` (${angka("mengungsi_kk").toLocaleString("id-ID")} KK)` : ""}${ada("titik_pengungsian") ? ` di ${v("titik_pengungsian").nilai}` : ""}` : v("mengungsi_jiwa")?.nihil ? "nihil" : "belum didata"}.`,
        `Kerusakan rumah: ${rumah.length ? rumah.join(", ") : "belum didata atau nihil"}.`, `Fasilitas umum: ${fas.length ? fas.join("; ") : "belum didata atau nihil"}.`, ...khusus.map(k => `${k}.`)]],
      ["Kebutuhan mendesak", ada("kebutuhan") ? v("kebutuhan").nilai : "belum didata"],
      ["Sumber", `Laporan ${s.tingkat === "bpbd" ? "petugas BPBD" : "warga"} melalui Lapor Bencana BNPB, ${waktuLapor(s.terkirim, prov)}${s.tingkat === "bpbd" ? "" : ", belum terverifikasi"}.`]]};
  // foto: url bertoken (mesin mengunduh sendiri), bukan berkas lokal
  const foto = (s.foto || []).map(f => ({url: fotoUrl(f), ket: `${f.jenis === "video" ? `Video ${f.durasi ?? "?"} detik, ` : ""}${f.lencanaTeks}${f.waktuAmbil ? `, ${waktuLapor(f.waktuAmbil, prov)}` : ""}`}));
  return {narasi, foto, nomor: s.nomor, tingkat_label: s.tingkat === "bpbd" ? "" : "Laporan warga, belum terverifikasi",
    pelapor: {nama: p.nama, peran: PERAN[p.peran], instansi: p.kab ? `BPBD ${p.kab}${p.jabatan ? `, ${p.jabatan}` : ""}` : null, wa_samar: waSamar(s.wa)},
    waktu_kejadian: s.isian.waktu?.nilai || "belum didata", waktu_lapor: waktuLapor(s.terkirim, prov),
    kelompok, kronologi: s.isian.kronologi?.nilai || ""};
}

/* ---------- lacak tanpa login: tanpa nomor WA, nama depan saja ---------- */
export function lacakTampil(s, p, t) {
  const w = s.isian.lokasi?.nilai?.wilayah, prov = w?.provKode;
  const sudah = new Map(s.tiket.riwayat.map(r => [r.ke, r]));
  return {nomor: s.nomor, status: s.tiket.status, statusLabel: STATUS[s.tiket.status], jenis: labelJenis(s.isian.jenis?.nilai) || "Kejadian",
    subjenis: s.isian.subjenis?.nilai || null, lokasi: w ? `Desa/Kel. ${w.desa}, Kec. ${w.kec}, ${w.kab}` : null, waktuKejadian: s.isian.waktu?.nilai || null,
    waktuLapor: waktuLapor(s.terkirim, prov), pelapor: (p?.nama || "").split(" ")[0], foto: (s.foto || []).length, terkirimMs: s.terkirim || null, bisaSusulan: bolehSusulan(s), versi: s.jumlahVersi || 1, fotoPertama: s.foto?.[0] ? `/api/lapor/foto/${s.foto[0].id}?t=${t}` : null,
    tahap: s.tiket.status === "tidak_valid" ? [...URUTAN.filter(k => sudah.has(k)), "tidak_valid"].map(k => ({kunci: k, label: STATUS[k], selesai: true, waktu: waktuLapor(sudah.get(k)?.waktu, prov), catatan: sudah.get(k)?.catatan || null}))
      : URUTAN.filter(k => k !== "diteruskan" || sudah.has(k)).map(k => ({kunci: k, label: STATUS[k], selesai: sudah.has(k), waktu: sudah.has(k) ? waktuLapor(sudah.get(k).waktu, prov) : null, catatan: sudah.get(k)?.catatan || null})),
    balasan: (s.balasan || []).map(b => ({teks: b.teks, waktu: waktuLapor(b.waktu, prov)})),
    bukti: (s.bukti || []).map(b => ({url: `/api/lapor/bukti/${b.id}?t=${t}`, waktu: waktuLapor(b.waktu, prov)})),   // foto penanganan petugas (K60, D88)
    unduhan: [{label: "Unduh PDF", url: `/api/lapor/unduh/${s.nomor}.pdf?t=${t}`}, {label: "Unduh Word", url: `/api/lapor/unduh/${s.nomor}.docx?t=${t}`}]};
}

/* angka dampak ringkas untuk peta dan kepala rincian; null = belum didata (kosong tidak pernah jadi nol); sama dengan lokal.mjs */
export const dampakRingkas = s => { const a = n => { const x = s.isian[n]; return !x || x.belum ? null : x.nihil ? 0 : Number(x.nilai) || 0; };
  const rumah = ["rumah_berat", "rumah_sedang", "rumah_ringan"].map(a), adaRumah = rumah.some(v => v != null);
  return {meninggal: a("meninggal"), hilang: a("hilang"), luka: a("luka"), mengungsi: a("mengungsi_jiwa"), rumah: adaRumah ? rumah.reduce((t, v) => t + (v || 0), 0) : null}; };

/* ---------- ringkasan beku saat terkirim (kolom lapor_sesi.ringkas): meja dan alun-alun tidak perlu mengurai sesi utuh ---------- */
export function ringkasSesi(s) {
  const w = s.isian.lokasi?.nilai?.wilayah, angka = n => { const x = s.isian[n]; return x && !x.belum && !x.nihil ? x.nilai : 0; };
  return {waktuKejadian: s.isian.waktu?.nilai || null, waktuMs: s.isian.waktu?.ms || null, subjenis: s.isian.subjenis?.nilai || null,
    wilayah: w ? {kode: w.kode, desa: w.desa, kec: w.kec, kab: w.kab, kabKode: w.kabKode, prov: w.prov, provKode: w.provKode} : null,
    lengkap: lengkap(s), foto: (s.foto || []).length, dampakMeja: dampakRingkas(s), darurat: s.darurat ? {korban: s.darurat.korban || null} : null,   // K68
    dampak: {meninggal: angka("meninggal"), hilang: angka("hilang"), luka: angka("luka"), mengungsi: angka("mengungsi_jiwa"),
      rumah: ["rumah_berat", "rumah_sedang", "rumah_ringan"].reduce((t, n) => t + angka(n), 0), terendam: angka("rumah_terendam")}};
}
export function barisMeja(r) {
  const k = r.ringkas ? JSON.parse(r.ringkas) : {}, prov = k.wilayah?.provKode;
  return {nomor: r.nomor, status: r.status, statusLabel: STATUS[r.status], waktuLapor: waktuLapor(r.terkirim, prov), terkirim: r.terkirim,
    waktuKejadian: k.waktuKejadian || null, wa: r.wa, nama: r.nama || null, peran: PERAN[r.peran] || null, instansi: r.pkab ? `BPBD ${r.pkab}` : null,
    jenis: labelJenis(r.jenis), jenisId: r.jenis || null, subjenis: k.subjenis || null, lat: r.lat ?? null, lon: r.lon ?? null, wilayah: k.wilayah || null,
    lengkap: k.lengkap ?? 0, foto: k.foto || 0, darurat: k.darurat || null, balasan: r.balasan || 0, versi: r.versi || 1, adaSusulan: !!r.ada_susulan, dampak: k.dampakMeja || null};
}
export function barisAlun(r) {
  const k = r.ringkas ? JSON.parse(r.ringkas) : {}, w = k.wilayah || {};
  return {ms: k.waktuMs || r.terkirim, id: r.id, jenisId: r.jenis || null, jenis: labelJenis(r.jenis) || "Kejadian", subjenis: k.subjenis && k.subjenis !== "Belum diketahui" ? k.subjenis : null, waktu: k.waktuKejadian || null,
    lokasi: {desa: w.desa || null, kec: w.kec || null, kab: w.kab || null, prov: w.prov || null, provKode: w.provKode || null}, dampak: k.dampak || {},
    status: r.status, statusLabel: STATUS[r.status], tingkat: r.tingkat === "bpbd" ? "Petugas BPBD" : "Warga"};
}

/* rincian meja untuk staf; foto dan unduhan membawa token lacak t */
export function mejaRinciTampil(s, p, t) {
  const prov = s.isian.lokasi?.nilai?.wilayah?.provKode, nomor = s.nomor;
  return {nomor, token: t, status: s.tiket.status, pindah: PINDAH[s.tiket.status], statusLabel: STATUS,
    pelapor: {nama: p?.nama, wa: s.wa, peran: PERAN[p?.peran], kab: p?.kab || null, jabatan: p?.jabatan || null}, nomorTerverifikasi: s.verifikasi !== "ketik",   // D101: nomor ketikan tanpa kode belum terbukti milik pelapor
    waktuLapor: waktuLapor(s.terkirim, prov), waktuKejadian: s.isian.waktu?.nilai || null, isian: isianTampil(s), lengkap: lengkap(s), dampak: dampakRingkas(s), versi: s.jumlahVersi || 1, adaSusulan: !!s.adaSusulan, jenisId: s.isian.jenis?.nilai || null, wilayah: s.isian.lokasi?.nilai?.wilayah || null,
    lat: s.isian.lokasi?.nilai?.lat ?? null, lon: s.isian.lokasi?.nilai?.lon ?? null,
    foto: (s.foto || []).map(f => ({url: urlMedia(f, `?t=${t}`), sampul: `/api/lapor/foto/${f.id}?t=${t}`, jenis: f.jenis || "foto", durasi: f.durasi ?? null, lencana: f.lencanaTeks, waktu: f.waktuAmbil ? waktuLapor(f.waktuAmbil, prov) : null})),
    bukti: (s.bukti || []).map(b => ({id: b.id, url: `/api/lapor/bukti/${b.id}?t=${t}`, publik: !!b.publik, waktu: waktuLapor(b.waktu, prov), lokasi: b.lat != null})),
    riwayat: s.tiket.riwayat.map(r => ({...r, pelaku: pelakuLabel(r.pelaku), label: STATUS[r.ke], waktu: waktuLapor(r.waktu, prov)})), balasan: (s.balasan || []).map(b => ({teks: b.teks, oleh: pelakuLabel(b.oleh), waktu: waktuLapor(b.waktu, prov)})),
    unduhan: [{label: "PDF", url: `/api/lapor/unduh/${nomor}.pdf?t=${t}`}, {label: "Word", url: `/api/lapor/unduh/${nomor}.docx?t=${t}`}],
    bahasa: BAHASA.find(([k]) => k === (s.bahasa || "id"))?.[1] || null,
    transkrip: s.transkrip.map(x => ({dari: x.dari, teks: x.teks || (x.lokasi ? "Lokasi dibagikan" : ""), asli: x.asli || null, waktu: waktuLapor(x.waktu, prov)}))};
}
/* kode pelaku di D1 ("admin:<awalan>", "staf:<id>", "Sistem") tidak ditampilkan ke layar */
export const pelakuLabel = k => String(k || "").startsWith("staf:") ? "Staf BNPB" : String(k || "").startsWith("admin:") ? "Admin BNPB" : k || "Sistem";
