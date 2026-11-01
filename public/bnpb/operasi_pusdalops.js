/* Fungsi MURNI layar /bnpb/operasi (pemulihan, Laporan Khusus, roll call): persen, penanda basi, pohon operasi, ketaatan, teks WA. Tanpa DOM dan tanpa fetch.
   Angka dasar dihitung server (src/pemulihan.js, lapsus.js, rollcall.js); di sini hanya penyajian. Dimuat peramban (window.OperasiPusdalops) dan node untuk uji
   (tests/bnpb/operasi_pusdalops.test.mjs). Basi = lebih dari 24 jam dari waktu_data (sama dengan BASI_MS di src/lapsus.js). */
(g => {
  "use strict";
  const JAM = 36e5, WIB = 7 * JAM, BASI_MS = 24 * JAM;
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const LAYANAN = ["bbm", "sinyal", "listrik", "air"], NAMA_LAYANAN = {bbm: "BBM", sinyal: "Sinyal", listrik: "Listrik", air: "Air"};
  const KONDISI = ["normal", "terganggu", "padam"], NAMA_KONDISI = {normal: "Normal", terganggu: "Terganggu", padam: "Padam"};
  const KELOMPOK = ["dana", "sdm", "sarpras", "logistik", "peralatan"], NAMA_KELOMPOK = {dana: "Dana", sdm: "SDM", sarpras: "Sarana prasarana", logistik: "Logistik", peralatan: "Peralatan"};
  const NAMA_JENIS_PEMULIHAN = {huntara: "Hunian sementara", huntap: "Hunian tetap", dana_tunggu_hunian: "Dana tunggu hunian", jembatan_gantung: "Jembatan gantung", sumur_bor: "Sumur bor", lainnya: "Lainnya"};
  const NAMA_STATUS = {rencana: "Rencana", berjalan: "Berjalan", selesai: "Selesai", terhenti: "Terhenti"};
  const NAMA_KATEGORI = {bpbd_prov: "BPBD provinsi", bpbd_kab: "BPBD kabupaten/kota", komunitas: "Komunitas"};
  const NAMA_HASIL = {hadir: "Hadir", tidak: "Tidak hadir", gangguan: "Gangguan"};
  const NAMA_SLOT = {pagi: "Pagi", siang: "Siang", malam: "Malam"};

  const fmt = n => n == null || Number.isNaN(Number(n)) ? "–" : (Math.round(Number(n) * 10) / 10).toString().replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const persen = (a, b) => b > 0 ? Math.round(a / b * 1000) / 10 : null;   // sama dengan persen() di src/pusdalops_umum.js
  const fmtPersen = p => p == null ? "–" : fmt(Math.round(p)) + "%";   // persen ditampilkan bulat
  /* angka gaya Indonesia: "1.234,5" atau "3,5" atau "2400"; titik hanya pemisah ribuan. Selain itu NaN ("3.5" bukan 3,5 dan bukan 35) */
  const angka = s => { const t = String(s).trim(); return /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) || /^\d+(,\d+)?$/.test(t) ? Number(t.replace(/\./g, "").replace(",", ".")) : NaN; };
  /* ponytail: ambang warna ketaatan 80/50 sementara (belum ada keputusan pemilik); ubah di sini saja */
  const toneKetaatan = p => p == null ? "info" : p >= 80 ? "ok" : p >= 50 ? "tunggu" : "bahaya";
  const tonePemulihan = s => ({selesai: "ok", berjalan: "info", rencana: "tunggu", terhenti: "bahaya"})[s] || "info";
  /* status satu baris ringkasan (per kab/jenis/satuan): terhenti paling menonjol, lalu berjalan, lalu rencana; selesai hanya bila semua selesai */
  const statusRingkas = x => x.terhenti > 0 ? "terhenti" : x.berjalan > 0 ? "berjalan" : x.item > 0 && x.selesai === x.item ? "selesai" : "rencana";

  const basi = (waktu, kini) => kini - waktu > BASI_MS;
  const umurJam = (waktu, kini) => Math.max(0, Math.floor((kini - waktu) / JAM));
  const umurTeksJam = j => j < 1 ? "kurang dari 1 jam lalu" : j < 48 ? `${fmt(j)} jam lalu` : `${fmt(Math.floor(j / 24))} hari lalu`;
  const umurTeks = (waktu, kini) => umurTeksJam(umurJam(waktu, kini));
  /* flag server (basi, umur_jam, jumlah_basi) menang; jam klien hanya cadangan bila flag tidak ada */
  const basiK = (k, kini) => typeof k.basi === "boolean" ? k.basi : basi(k.waktu_data, kini);
  const umurK = (k, kini) => umurTeksJam(Number.isFinite(k.umur_jam) ? k.umur_jam : umurJam(k.waktu_data, kini));
  const tglIndo = t => { const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(t || ""); return m ? `${Number(m[3])} ${BLN[Number(m[2]) - 1]} ${m[1]}` : (t || ""); };
  const pad = n => String(n).padStart(2, "0");
  const wibTeks = ms => { const d = new Date(ms + WIB); return `${d.getUTCDate()} ${BLN[d.getUTCMonth()]} ${d.getUTCFullYear()} ${pad(d.getUTCHours())}.${pad(d.getUTCMinutes())} WIB`; };
  const tglWIB = ms => new Date(ms + WIB).toISOString().slice(0, 10);
  const sumber = (nama, diambil) => `Sumber: ${nama}, diambil ${wibTeks(diambil == null ? Date.now() : diambil)}`;
  /* slot bawaan roll call dari jam dinding WIB: pagi sampai 11.59, siang sampai 17.59, selebihnya malam */
  const slotBawaan = ms => { const j = new Date(ms + WIB).getUTCHours(); return j < 12 ? "pagi" : j < 18 ? "siang" : "malam"; };

  /* satu provinsi dari rincian lapsus -> {tim: [{id, nama, kejadian}], tanpaTim: [kejadian]} (operasi > provinsi > tim > kejadian) */
  function pohon(p) {
    const ada = new Set(p.tim.map(t => t.id));
    return {tim: p.tim.map(t => ({...t, kejadian: p.kejadian.filter(k => k.tim_id === t.id)})), tanpaTim: p.kejadian.filter(k => !k.tim_id || !ada.has(k.tim_id))};
  }
  const kebutuhanTeks = k => `${k.barang} ${fmt(k.jumlah)} ${k.satuan}`;
  const layananTeks = l => l ? LAYANAN.filter(k => l[k]).map(k => `${NAMA_LAYANAN[k]} ${NAMA_KONDISI[l[k].status].toLowerCase()}`).join(", ") : "";
  const hitungBasi = (r, kini) => Number.isFinite(r.jumlah_basi) ? r.jumlah_basi : r.provinsi.reduce((a, p) => a + p.kab.filter(k => basiK(k, kini)).length, 0);

  /* teks WA Laporan Khusus; tanpa nomor telepon dan tanpa data pribadi (server sudah menolaknya) */
  function teksWa(r, kini, diambil, nj = j => j.replace(/_/g, " ")) {
    const o = r.operasi, nb = hitungBasi(r, kini), l = [];
    if (o.dummy) l.push("DATA DUMMY, BUKAN LAPORAN NYATA");
    l.push(`*LAPORAN KHUSUS ${o.nama.toUpperCase()}*`, `Jenis ${nj(o.jenis)}, mulai ${tglIndo(o.mulai)}, status ${o.status}`, `Dibuat ${wibTeks(kini)}`);
    if (nb) l.push(`PERHATIAN: ${fmt(nb)} kabupaten/kota datanya lebih dari 24 jam (BASI), perlu pembaruan.`);
    for (const p of r.provinsi) {
      l.push("", `*${p.nama || p.prov}*`);
      if (p.tim.length) l.push(`Tim: ${p.tim.map(t => t.nama).join(", ")}`);
      if (!p.kab.length) l.push("Belum ada entri harian.");
      for (const k of p.kab) {
        l.push(`- ${k.kab}${basiK(k, kini) ? " (BASI)" : ""}, data ${umurK(k, kini)}`);
        if (k.kebutuhan?.length) l.push(`  Kebutuhan mendesak: ${k.kebutuhan.map(kebutuhanTeks).join("; ")}`);
        if (k.layanan) l.push(`  Layanan dasar: ${layananTeks(k.layanan)}`);
        if (k.catatan) l.push(`  Catatan: ${k.catatan}`);
      }
    }
    l.push("", sumber("Pusdalops BNPB, Laporan Khusus", diambil == null ? kini : diambil));
    return l.join("\n");
  }

  /* ketaatan per bulan dari per_peserta (GET /rollcall/ringkasan): tiga daftar berlabel, terendah dulu; persen null di akhir */
  function ketaatan(rows, namaProv) {
    const np = k => namaProv[k] || k, out = {bpbd_prov: [], bpbd_kab: [], komunitas: []};
    for (const x of rows) {
      const label = x.kategori === "bpbd_prov" ? np(x.prov) : x.kategori === "bpbd_kab" ? `${x.kab} (${np(x.prov)})` : `${x.nama} (${np(x.prov)})`;
      out[x.kategori]?.push({label, dipanggil: x.dipanggil, hadir: x.hadir, gangguan: x.gangguan, tidak: x.tidak, persen: x.persen ?? persen(x.hadir, x.dipanggil)});
    }
    for (const k of Object.keys(out)) out[k].sort((a, b) => (a.persen ?? 101) - (b.persen ?? 101) || a.label.localeCompare(b.label, "id"));
    return out;
  }
  const bulanIni = ms => tglWIB(ms).slice(0, 7);
  const bulanTeks = b => { const [y, m] = b.split("-").map(Number); return `${["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][m - 1]} ${y}`; };

  /* ---------- Gelombang 3: SK aktif, peringatan berantai, antrean medsos (hanya penyajian; angka dihitung server) ---------- */
  const fmt2 = n => n == null || !Number.isFinite(Number(n)) ? "–" : String(Math.round(Number(n) * 100) / 100).replace(".", ",");
  const sisaHariTeks = d => d == null ? "TMT selesai belum diisi" : d < 0 ? `lewat ${fmt(-d)} hari` : d === 0 ? "berakhir hari ini" : `${fmt(d)} hari`;
  const skTone = x => x.perlu_cek ? "bahaya" : x.sisa_hari != null && x.sisa_hari <= 7 ? "tunggu" : "ok";
  /* alasan perlu cek: kejadian selesai, atau tanpa entri lebih dari 7 hari (aturan server); "" bila tidak perlu */
  const alasanCek = x => !x.perlu_cek ? "" : x.kejadian_selesai ? "Kejadian sudah selesai" : x.tanpa_entri_hari != null ? `Tanpa entri ${fmt(x.tanpa_entri_hari)} hari` : "Perlu dicek";
  /* peringatan berantai: urut sisa waktu (paling cepat habis dulu), BUKAN menurut lift; salinan, tidak mengubah masukan */
  const urutSisaJam = a => [...a].sort((x, y) => x.sisa_jam - y.sisa_jam || String(x.kab).localeCompare(String(y.kab), "id") || String(x.susulan).localeCompare(String(y.susulan)));
  const sisaJamTeks = j => j < 1 ? "kurang dari 1 jam lagi" : j < 48 ? `${fmt(Math.round(j))} jam lagi` : `${fmt(Math.floor(j / 24))} hari lagi`;
  const liftTeks = p => `lift ${fmt(p.lift)} kali, ci95 ${Array.isArray(p.ci95) ? fmt(p.ci95[0]) + " sampai " + fmt(p.ci95[1]) : "–"}, n ${fmt(p.n)}`;
  const menitTeks = m => m == null ? "–" : m < 60 ? `${fmt(Math.round(m))} menit` : m < 1440 ? `${fmt(Math.round(m / 6) / 10)} jam` : `${fmt(Math.round(m / 144) / 10)} hari`;
  const bulanSingkat = b => { const [y, m] = String(b).split("-").map(Number); return m ? `${BLN[m - 1]} ${y}` : String(b); };
  const SUMBER_MEDSOS = {medsos: "Media sosial", tv: "Televisi"};

  g.OperasiPusdalops = {LAYANAN, NAMA_LAYANAN, KONDISI, NAMA_KONDISI, KELOMPOK, NAMA_KELOMPOK, NAMA_JENIS_PEMULIHAN, NAMA_STATUS, NAMA_KATEGORI, NAMA_HASIL, NAMA_SLOT,
    fmt, angka, tglIndo, basiK, umurK, umurTeksJam, persen, fmtPersen, toneKetaatan, tonePemulihan, statusRingkas, basi, umurJam, umurTeks, wibTeks, tglWIB, sumber, slotBawaan, pohon, kebutuhanTeks, layananTeks, hitungBasi, teksWa, ketaatan, bulanIni, bulanTeks, BASI_MS,
    fmt2, sisaHariTeks, skTone, alasanCek, urutSisaJam, sisaJamTeks, liftTeks, menitTeks, bulanSingkat, SUMBER_MEDSOS};
})(globalThis);
