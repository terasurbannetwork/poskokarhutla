/* Penyusun dokumen Pusdalops (L1, docs/superpowers/specs/2026-11-01-pusdalops-standar.md): fungsi MURNI, tanpa DOM dan tanpa fetch.
   Masukan = baris entri dari GET /api/logbook/hari (satu baris = satu entri + jenis/prov/kab/kec/desa/status/dummy kejadiannya).
   Dimuat peramban (window.DokumenPusdalops) dan node untuk uji (tests/bnpb/dokumen_pusdalops.test.mjs).
   Jendela hari laporan 07.00-07.00 WIB = hari UTC (07.00 WIB = 00.00 UTC), jadi tanggal laporan = tanggal UTC.
   Baru vs pengkinian: sebuah kejadian "baru" di sebuah ember (hari/shift/minggu) bila entri PERTAMA yang kita kenal jatuh di ember itu, selain itu pengkinian.
   ponytail: "entri pertama yang kita kenal" = batas mundur yang dimuat layar (LOOKBACK_HARI); kejadian lebih tua dari itu salah terhitung baru. API tidak memuat kejadian.mulai. */
(g => {
  "use strict";
  const JAM = 36e5, HARI = 864e5, WIB = 7 * JAM, LOOKBACK_HARI = 7;
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];   // singkatan, keputusan 2 Nov 2026 (semua tab)
  const NAMA = {banjir: "Banjir", longsor: "Tanah longsor", cuaca: "Cuaca ekstrem", karhutla: "Karhutla", kebakaran_permukiman: "Kebakaran permukiman", gempabumi: "Gempa bumi", gunungapi: "Gunung api",
    kekeringan: "Kekeringan", kecelakaan: "Kecelakaan", konflik_sosial: "Konflik sosial", lainnya: "Lainnya", gelombang_pasang: "Gelombang pasang dan abrasi", tsunami: "Tsunami", wabah: "Epidemi dan wabah penyakit"};
  /* 3 shift piket; katalog Drive (Laporan Shift 2026) menulis Shift 1 06.30-15.00 dan Shift 3 21.00-07.00, Shift 2 tidak tertulis. Di sini 07.00-15.00, 15.00-21.00, 21.00-07.00
     supaya tiap entri jatuh di tepat satu shift (06.30 itu jam hadir, bukan serah terima). */
  const SHIFT = [{no: 1, dari: 7, sampai: 15}, {no: 2, dari: 15, sampai: 21}, {no: 3, dari: 21, sampai: 31}];
  /* Ambang laporan menonjol per jenis logbook. Sumber: scripts/wa/panduan_resmi.json, jenis[].menonjol (Panduan Lapjol 02/PO.02/07/2025, h2 G.2.a-i); uji menyamakannya dengan berkas itu.
     kk/orang = mengungsi (KK atau jiwa); korban: md_hilang = ada MD atau hilang, md = hanya MD; ha = luas_ha; rumah_rusak = RB+RS+RR; ada_dampak = ada akibat manusia/rumah; ha_saja = karhutla.
     Jenis tanpa kriteria (kebakaran permukiman, kecelakaan, wabah, konflik, lainnya) tidak pernah menonjol otomatis; pimpinan memilih manual. */
  const AMBANG = {banjir: {kk: 50, orang: 200, korban: "md_hilang", ha: 10}, longsor: {kk: 10, orang: 40, korban: "md_hilang", rumah_rusak: 10}, gelombang_pasang: {kk: 10, orang: 40, korban: "md_hilang"},
    cuaca: {kk: 10, orang: 40, korban: "md_hilang", rumah_rusak: 10}, kekeringan: {kk: 200, orang: 800, korban: "md", ha: 10}, karhutla: {ha_saja: 2}, gempabumi: {ada_dampak: true}, tsunami: {ada_dampak: true}, gunungapi: {ada_dampak: true}};

  const n0 = v => Number(v) || 0;
  const fmt = n => n == null || Number.isNaN(n) ? "–" : (Math.round(n * 10) / 10).toString().replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fmt0 = n => fmt(n == null ? n : Math.round(n));
  const tglISO = ms => new Date(ms).toISOString().slice(0, 10);
  const awalHari = tgl => Date.parse(tgl + "T00:00:00Z");
  const tambahHari = (tgl, n) => tglISO(awalHari(tgl) + n * HARI);
  const tglIndo = tgl => { const d = new Date(awalHari(tgl)); return `${d.getUTCDate()} ${BLN[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
  const hariLaporan = ms => tglISO(ms);
  const jamWIB = ms => ((ms + WIB) % HARI) / JAM;
  const shiftDari = ms => { const j = jamWIB(ms); return j >= 7 && j < 15 ? 1 : j >= 15 && j < 21 ? 2 : 3; };
  const bataShift = (tgl, no) => { const s = SHIFT[no - 1], a = awalHari(tgl); return [a + (s.dari - 7) * JAM, a + (s.sampai - 7) * JAM]; };

  /* Kamis 18.00 WIB = Kamis 11.00 UTC. akhirKamis(ms) = Kamis 18.00 WIB terakhir yang sudah lewat (atau tepat) pada ms */
  const akhirKamis = ms => { const a = awalHari(tglISO(ms)), mundur = (new Date(a).getUTCDay() - 4 + 7) % 7; let t = a - mundur * HARI + 11 * JAM; if (t > ms) t -= 7 * HARI; return t; };
  const periodeMinggu = akhir => ({dari: akhir - 7 * HARI, sampai: akhir});
  const akhirDariTgl = tgl => { const t = awalHari(tgl); return new Date(t).getUTCDay() === 4 ? t + 11 * JAM : null; };   // null = bukan hari Kamis
  const hariUntuk = (dari, sampai) => { const out = []; for (let t = awalHari(tglISO(dari)); t < sampai; t += HARI) out.push(tglISO(t)); return out; };

  const kelompokKejadian = entri => {
    const peta = new Map();
    for (const e of entri) { let k = peta.get(e.kejadian_id); if (!k) peta.set(e.kejadian_id, k = {id: e.kejadian_id, jenis: e.jenis, prov: e.prov, kab: e.kab, kec: e.kec, desa: e.desa, status: e.status, dummy: !!e.dummy, entri: []}); k.entri.push(e); }
    for (const k of peta.values()) k.entri.sort((a, b) => a.waktu - b.waktu);
    return peta;
  };
  /* ember -> {baru: [kejadian], pengkinian: [kejadian]} untuk entri di [dari, sampai); tiap kejadian sekali per ember */
  function ringkas(entri, dari, sampai, ember) {
    const out = new Map(), ada = (b) => { let o = out.get(b); if (!o) out.set(b, o = {baru: [], pengkinian: []}); return o; };
    for (const k of kelompokKejadian(entri).values()) {
      const awal = ember(k.entri[0].waktu), lihat = new Set();
      for (const e of k.entri) { if (e.waktu < dari || e.waktu >= sampai) continue; const b = ember(e.waktu); if (lihat.has(b)) continue; lihat.add(b); ada(b)[b === awal ? "baru" : "pengkinian"].push(k); }
    }
    return out;
  }
  const terkini = (k, sampai) => { let r = null; for (const e of k.entri) if (e.waktu < sampai) r = e; return r; };

  function menonjol(jenis, e) {
    const a = AMBANG[jenis], alasan = [];
    if (!a || !e) return {ya: false, alasan};
    const rr = n0(e.rumah_rb) + n0(e.rumah_rs) + n0(e.rumah_rr);
    if (a.ha_saja != null) { if (n0(e.luas_ha) >= a.ha_saja) alasan.push(`luas ${fmt0(e.luas_ha)} ha`); return {ya: alasan.length > 0, alasan}; }
    if (a.ada_dampak) { if (n0(e.md) + n0(e.hilang) + n0(e.luka) + n0(e.mengungsi_jiwa) + n0(e.mengungsi_kk) + rr > 0) alasan.push("ada dampak"); return {ya: alasan.length > 0, alasan}; }
    if (a.korban === "md_hilang" && n0(e.md) + n0(e.hilang) > 0) alasan.push("korban jiwa");
    if (a.korban === "md" && n0(e.md) > 0) alasan.push("korban jiwa");
    if (a.kk != null && n0(e.mengungsi_kk) >= a.kk) alasan.push(`${fmt(e.mengungsi_kk)} KK mengungsi`);
    if (a.orang != null && n0(e.mengungsi_jiwa) >= a.orang) alasan.push(`${fmt(e.mengungsi_jiwa)} jiwa mengungsi`);
    if (a.rumah_rusak != null && rr >= a.rumah_rusak) alasan.push(`${fmt(rr)} rumah rusak`);
    if (a.ha != null && n0(e.luas_ha) >= a.ha) alasan.push(`luas ${fmt0(e.luas_ha)} ha`);
    return {ya: alasan.length > 0, alasan};
  }

  const lokasi = k => [k.desa && `Desa ${k.desa}`, k.kec && `Kec. ${k.kec}`, k.kab].filter(Boolean).join(", ");
  function dampakTeks(e) {
    if (!e) return "";
    const p = [], ada = v => v != null && v > 0;
    if (ada(e.md)) p.push(`${fmt(e.md)} meninggal`);
    if (ada(e.hilang)) p.push(`${fmt(e.hilang)} hilang`);
    if (ada(e.luka)) p.push(`${fmt(e.luka)} luka`);
    if (ada(e.mengungsi_jiwa) || ada(e.mengungsi_kk)) p.push(`${ada(e.mengungsi_jiwa) ? fmt(e.mengungsi_jiwa) + " jiwa" : ""}${ada(e.mengungsi_kk) ? (ada(e.mengungsi_jiwa) ? ` (${fmt(e.mengungsi_kk)} KK)` : fmt(e.mengungsi_kk) + " KK") : ""} mengungsi`);
    for (const [k, t] of [["rumah_rb", "rusak berat"], ["rumah_rs", "rusak sedang"], ["rumah_rr", "rusak ringan"]]) if (ada(e[k])) p.push(`${fmt(e[k])} rumah ${t}`);
    if (ada(e.rumah_terendam)) p.push(`${fmt(e.rumah_terendam)} rumah terendam`);
    if (ada(e.luas_ha)) p.push(`${fmt0(e.luas_ha)} ha terbakar`);
    return p.join(", ");
  }
  const lihat = (k, sampai, baru, manual) => {
    const e = terkini(k, sampai) || k.entri.at(-1), m = menonjol(k.jenis, e), paksa = !!(manual && manual.has(k.id));
    return {id: k.id, ref: String(k.id).slice(0, 6), jenis: k.jenis, prov: k.prov, kab: k.kab, kec: k.kec, desa: k.desa, status: k.status, dummy: k.dummy, e, baru, lokasi: lokasi(k), dampak: dampakTeks(e),
      menonjol: m.ya || paksa, alasan: paksa && !m.ya ? ["dipilih manual"] : m.alasan, kib: e && (e.kib || null)};
  };
  const urutProv = (a, b) => String(a.prov).localeCompare(String(b.prov)) || String(a.kab).localeCompare(String(b.kab)) || String(a.jenis).localeCompare(String(b.jenis));
  const perProv = daftar => { const m = new Map(); for (const v of [...daftar].sort(urutProv)) { if (!m.has(v.prov)) m.set(v.prov, []); m.get(v.prov).push(v); } return [...m]; };
  const bullet = v => `- ${NAMA[v.jenis] || v.jenis}, ${v.lokasi}${v.dampak ? ": " + v.dampak : ": dampak belum dilaporkan"}`;
  const namaProv = p => (g.Wilayah && g.Wilayah.PROV && g.Wilayah.PROV[p]) || `Provinsi ${p}`;
  const adaDummy = entri => entri.some(e => e.dummy);
  const jamTglWib = ms => `pukul ${String(new Date(ms + WIB).getUTCHours()).padStart(2, "0")}.${String(new Date(ms + WIB).getUTCMinutes()).padStart(2, "0")} WIB, ${tglIndo(tglISO(ms + WIB))}`;
  const sumber = diambil => `Sumber: logbook Pusdalops (input piket), diambil ${jamTglWib(diambil == null ? Date.now() : diambil)}`;
  const tanda = (dummy) => dummy ? "[DATA DUMMY, BUKAN LAPORAN NYATA]\n" : "";

  /* ---------- 1. Laporan Menonjol: hari laporan tgl (tgl 07.00 s.d. tgl+1 07.00 WIB) ---------- */
  function hariData(entri, tgl, manual) {
    const dari = awalHari(tgl), sampai = dari + HARI, r = ringkas(entri, dari, sampai, hariLaporan).get(tgl) || {baru: [], pengkinian: []};
    const semua = [...r.baru.map(k => lihat(k, sampai, true, manual)), ...r.pengkinian.map(k => lihat(k, sampai, false, manual))];
    return {tgl, baru: r.baru.length, pengkinian: r.pengkinian.length, total: semua.length, semua, daftar: semua.filter(v => v.menonjol).sort(urutProv)};
  }
  function teksMenonjol(h, dummy, diambil) {
    const l = [tanda(dummy) + "*LAPORAN MENONJOL*", "Yth. Bapak Kepala BNPB", `Pemantauan ${tglIndo(h.tgl)} pukul 07.00 WIB s.d. ${tglIndo(tambahHari(h.tgl, 1))} pukul 07.00 WIB`, `Laporan kejadian bencana sejumlah ${fmt(h.daftar.length)}`];
    if (!h.daftar.length) l.push("", "Tidak ada kejadian yang memenuhi ambang menonjol pada periode ini.");
    for (const [p, ds] of perProv(h.daftar)) l.push("", `*${namaProv(p)}*`, ...ds.map(bullet));
    l.push("", sumber(diambil));
    return l.join("\n");
  }

  /* ---------- 2. BAST Piket: n hari laporan berturut sejak tglAwal ---------- */
  function bast(entri, tglAwal, n, manual) {
    const hari = Array.from({length: n}, (_, i) => hariData(entri, tambahHari(tglAwal, i), manual));
    return {tglAwal, tglAkhir: tambahHari(tglAwal, n - 1), hari, total: hari.reduce((a, h) => a + h.total, 0), baru: hari.reduce((a, h) => a + h.baru, 0), pengkinian: hari.reduce((a, h) => a + h.pengkinian, 0)};
  }
  const nomorSurat = (pola, urut) => { const m = /N+/.exec(pola || ""); if (!m) return String(pola || ""); const u = Number.parseInt(urut, 10); return pola.replace(m[0], Number.isFinite(u) && u > 0 ? String(u).padStart(m[0].length, "0") : "_".repeat(m[0].length)); };
  function teksBast(b, nomor, dummy, diambil) {
    const l = [tanda(dummy) + "*BERITA ACARA SERAH TERIMA PIKET PUSDALOPS*", nomor ? `Nomor ${nomor}` : "", `Periode ${tglIndo(b.tglAwal)} s.d. ${tglIndo(b.tglAkhir)} (tiap hari 07.00 s.d. 07.00 WIB)`, ""].filter((x, i) => x || i > 2);
    for (const h of b.hari) l.push(`${tglIndo(h.tgl)}: ${fmt(h.total)} kejadian (${fmt(h.baru)} baru, ${fmt(h.pengkinian)} pengkinian), ${fmt(h.daftar.length)} menonjol`);
    l.push(`Jumlah: ${fmt(b.total)} kejadian (${fmt(b.baru)} baru, ${fmt(b.pengkinian)} pengkinian)`, "", sumber(diambil));
    return l.join("\n");
  }

  /* ---------- 3. Laporan Shift ---------- */
  function shift(entri, tgl) {
    const ember = ms => hariLaporan(ms) + "#" + shiftDari(ms), r = ringkas(entri, awalHari(tgl), awalHari(tgl) + HARI, ember);
    return {tgl, shift: SHIFT.map(s => {
      const [dari, sampai] = bataShift(tgl, s.no), o = r.get(tgl + "#" + s.no) || {baru: [], pengkinian: []};
      const daftar = [...o.baru.map(k => lihat(k, sampai, true)), ...o.pengkinian.map(k => lihat(k, sampai, false))].sort(urutProv);
      for (const v of daftar) v.tuntas = v.status === "tutup";
      return {no: s.no, dari, sampai, jam: `${String(s.dari).padStart(2, "0")}.00 s.d. ${String(s.sampai % 24).padStart(2, "0")}.00 WIB`, daftar, baru: o.baru.length, pengkinian: o.pengkinian.length, tuntas: daftar.filter(v => v.tuntas).length};
    })};
  }
  function teksShift(s, dummy, diambil) {
    const l = [tanda(dummy) + `*LAPORAN SHIFT PIKET PUSDALOPS ${tglIndo(s.tgl).toUpperCase()}*`];
    for (const x of s.shift) {
      l.push("", `*Shift ${x.no} (${x.jam})*: ${fmt(x.daftar.length)} kejadian (${fmt(x.baru)} baru, ${fmt(x.pengkinian)} pengkinian)`);
      if (!x.daftar.length) l.push("Tidak ada laporan masuk.");
      x.daftar.forEach(v => l.push(`${bullet(v)} [${v.baru ? "Baru" : "Pengkinian"}, ${v.tuntas ? "Tuntas" : "Lanjut"}]`));
    }
    l.push("", sumber(diambil));
    return l.join("\n");
  }

  /* ---------- 4. Rekap Mingguan: akhir = Kamis 18.00 WIB (ms) ---------- */
  function mingguan(entri, akhir) {
    const {dari, sampai} = periodeMinggu(akhir), r = ringkas(entri, dari, sampai, () => "minggu").get("minggu") || {baru: [], pengkinian: []};
    const semua = [...r.baru.map(k => lihat(k, sampai, true)), ...r.pengkinian.map(k => lihat(k, sampai, false))].sort(urutProv);
    const hitung = kunci => { const m = new Map(); for (const v of semua) { const k = kunci(v); const o = m.get(k) || {kunci: k, total: 0, baru: 0, pengkinian: 0}; o.total++; o[v.baru ? "baru" : "pengkinian"]++; m.set(k, o); } return [...m.values()].sort((a, b) => b.total - a.total || String(a.kunci).localeCompare(String(b.kunci))); };
    const luas = new Map();
    for (const v of semua) if (v.jenis === "karhutla") { const o = luas.get(v.prov) || {prov: v.prov, kejadian: 0, ha: 0, tanpaLuas: 0}; o.kejadian++; if (v.e && v.e.luas_ha != null) o.ha += v.e.luas_ha; else o.tanpaLuas++; luas.set(v.prov, o); }
    return {dari, sampai, akhir, total: semua.length, baru: r.baru.length, pengkinian: r.pengkinian.length, semua, perJenis: hitung(v => v.jenis), perProv: hitung(v => v.prov),
      luas: [...luas.values()].sort((a, b) => b.ha - a.ha), luasTotal: [...luas.values()].reduce((a, o) => a + o.ha, 0), adaKib: semua.some(v => v.kib)};
  }
  const jamTgl = ms => `${tglIndo(tglISO(ms + WIB))} pukul ${String(new Date(ms + WIB).getUTCHours()).padStart(2, "0")}.00 WIB`;
  function teksMingguan(m, dummy, diambil) {
    const l = [tanda(dummy) + "*REKAPITULASI MINGGUAN BENCANA PUSDALOPS*", `Periode ${jamTgl(m.dari)} s.d. ${jamTgl(m.sampai)}`, `Jumlah kejadian ${fmt(m.total)} (${fmt(m.baru)} baru, ${fmt(m.pengkinian)} pengkinian)`, "", "*Per jenis*"];
    m.perJenis.forEach(o => l.push(`- ${NAMA[o.kunci] || o.kunci}: ${fmt(o.total)} kejadian`));
    l.push("", "*Per provinsi*"); m.perProv.forEach(o => l.push(`- ${namaProv(o.kunci)}: ${fmt(o.total)} kejadian`));
    if (m.luas.length) { l.push("", "*Luas karhutla per provinsi (perkiraan dari entri piket)*"); m.luas.forEach(o => l.push(`- ${namaProv(o.prov)}: ${fmt0(o.ha)} ha dari ${fmt(o.kejadian)} kejadian`)); l.push(`Jumlah: ${fmt0(m.luasTotal)} ha`); }
    l.push("", sumber(diambil));
    return l.join("\n");
  }

  g.DokumenPusdalops = {LOOKBACK_HARI, SHIFT, AMBANG, NAMA, fmt, tglISO, tglIndo, awalHari, tambahHari, hariLaporan, shiftDari, bataShift, akhirKamis, periodeMinggu, akhirDariTgl, hariUntuk, jamTgl, kelompokKejadian,
    ringkas, menonjol, dampakTeks, hariData, teksMenonjol, bast, teksBast, nomorSurat, shift, teksShift, mingguan, teksMingguan, adaDummy, perProv, namaProv, sumber, fmt0};
})(globalThis);
