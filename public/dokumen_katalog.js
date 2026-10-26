/* dokumen_katalog.js: katalog generator dokumen (/dokumen). Meniru registri dataset pangantara (lib/export/datasets.ts) tapi semua jalan di peramban
   dari JSON pipeline yang sudah ada, tanpa server. Tiap entri: {id, kelompok, judul, ket, bencana, sumber: [url], bangun(json[]) -> Dok}.
   Dok = {judul, sub, per, angka: [{label, nilai, satuan}], bagian: [Bagian], sumber: [{nama, url?, catatan?}]}
   Bagian = {judul, teks?: [kalimat], angka?: [...], kolom: [{label, jenis: teks|angka|persen}], baris: [[nilai]], prov?: [kode BPS per baris], catatan?}
   Satu Dok, empat perender di dokumen.js. Angka diambil apa adanya dari berkas sumber; sumber kosong = bagian tanpa baris, bukan nol. */
"use strict";
window.KatalogDok = (() => {
  const W = window.Wilayah, P = k => (k ? W.prov(k) : ""), NAMA = Object.fromEntries(Object.entries(W.PROV).map(([k, v]) => [v.toLowerCase(), k]));
  NAMA["kep. bangka belitung"] = "19"; NAMA["di yogyakarta"] = "34"; NAMA["daerah istimewa yogyakarta"] = "34";
  const kodeDari = nama => NAMA[String(nama ?? "").trim().toLowerCase()] || "";
  const K = (label, jenis = "teks") => ({label, jenis});
  const tgl = s => s ? new Date(s.length === 10 ? s + "T12:00+07:00" : s).toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"}) : "";
  const tglPendek = s => new Date(s + "T12:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"});
  const jam = s => s ? new Date(s).toLocaleString("id-ID", {day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"}).replace(" pukul", ",") + " WIB" : "";
  const kap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());
  const bulat = (v, d = 0) => v == null || !isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d;
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  /* ---------- kontrak laporan/1 (scripts/umum/laporan.py): banjir, cuaca, gempa, gunung api, kekeringan, udara ---------- */
  const AGR = {jumlah: a => a.reduce((s, v) => s + (v || 0), 0), maks: a => Math.max(...a.map(v => v || 0)),
    rerata: a => { const b = a.filter(v => v != null); return b.length ? b.reduce((s, v) => s + v, 0) / b.length : null; }};
  const AGR_LABEL = {jumlah: "jumlah 7 hari", maks: "tertinggi 7 hari", rerata: "rata-rata 7 hari"};
  function dariLaporan(d) {
    const H = d.hari, i = Math.max(0, H.indexOf(d.hari_lengkap)), M = d.metrik, u = M.find(m => m.utama) || M[0];
    const pada = (o, m) => bulat(o?.[m.k]?.[i] ?? null, m.desimal || 0);
    const pekan = (o, m) => { const a = (o?.[m.k] || []).slice(Math.max(0, i - 6), i + 1); return a.some(v => v != null) ? bulat(AGR[m.agregat || "jumlah"](a), m.desimal || 0) : null; };
    const bagian = [];
    if (d.sorot?.length) bagian.push({judul: "Sorotan", kolom: [K("Tingkat"), K("Temuan"), K("Keterangan"), K("Provinsi")],
      baris: d.sorot.map(s => [kap(s.tingkat), s.judul, s.teks || "", P(s.prov)]), prov: d.sorot.map(s => s.prov || "")});
    const pv = Object.entries(d.prov || {}).map(([k, o]) => ({k, o, a: pada(o, u) || 0, b: pekan(o, u) || 0}));
    const ada = pv.filter(x => x.a || x.b).sort((x, y) => y.a - x.a || y.b - x.b);
    bagian.push({judul: `Per provinsi, ${tgl(d.hari_lengkap)}`,
      kolom: [K("Provinsi"), ...M.map(m => K(`${m.label} (${m.satuan})`, "angka")), K(`${u.label}, ${AGR_LABEL[u.agregat || "jumlah"]}`, "angka")],
      baris: ada.map(x => [x.o.nama || P(x.k), ...M.map(m => pada(x.o, m)), x.b]), prov: ada.map(x => x.k),
      catatan: ada.length < pv.length ? `${pv.length - ada.length} provinsi lain nihil untuk ${u.label.toLowerCase()} dalam 7 hari terakhir.` : null});
    const kb = (d.kab || []).map(o => ({o, a: pada(o, u) || 0})).filter(x => x.a).sort((x, y) => y.a - x.a).slice(0, 50);
    if (kb.length) bagian.push({judul: `Kabupaten/kota teratas, ${tgl(d.hari_lengkap)}`, kolom: [K("Kabupaten/kota"), K("Provinsi"), ...M.map(m => K(`${m.label} (${m.satuan})`, "angka"))],
      baris: kb.map(x => [W.kab(x.o.nama), P(x.o.prov), ...M.map(m => pada(x.o, m))]), prov: kb.map(x => x.o.prov),
      catatan: (d.kab || []).length > 50 ? "Hanya 50 kabupaten/kota dengan nilai tertinggi." : null});
    const awal = Math.max(0, i - 13);
    bagian.push({judul: "Tren nasional 14 hari", kolom: [K("Tanggal"), ...M.map(m => K(`${m.label} (${m.satuan})`, "angka"))],
      baris: H.slice(awal, i + 1).map((h, j) => [tgl(h), ...M.map(m => bulat(d.nasional?.[m.k]?.[awal + j] ?? null, m.desimal || 0))]).reverse()});
    if (d.prakiraan?.baris?.length) bagian.push({judul: "Prakiraan", teks: [d.prakiraan.judul], kolom: [K("Wilayah"), ...d.prakiraan.hari.map(h => K(tglPendek(h), "angka"))],
      baris: d.prakiraan.baris.map(b => [b.label, ...b.nilai.map(v => bulat(v, 1))]), prov: d.prakiraan.baris.map(b => b.prov || kodeDari(b.label)),
      catatan: d.prakiraan.baris[0]?.satuan ? `Satuan ${d.prakiraan.baris[0].satuan}.` : null});
    for (const t of d.tambahan || []) if (t.baris?.length) bagian.push({judul: t.judul, kolom: t.kolom.map((c, j) => K(c, typeof t.baris[0][j] === "number" ? "angka" : "teks")),
      baris: t.baris, prov: t.baris.map(r => kodeDari(r[0])), catatan: t.catatan || null});
    return {judul: d.judul, sub: `Data sampai ${tgl(d.hari_lengkap)}, dibuat ${jam(d.dibuat)}`, per: d.dibuat,
      angka: M.map(m => ({label: m.label, nilai: pada(d.nasional, m), satuan: m.satuan})), bagian, sumber: d.sumber || []};
  }

  /* ---------- panel karhutla (public/data/presiden/semua.json, kontrak docs/presiden/KONTRAK.md) ---------- */
  const tanpaSorot = t => String(t ?? "").replace(/\[\[|\]\]/g, "");
  function dariPresiden(d) {
    const situasi = d.widget.find(w => w.id === "situasi"), sumber = [];
    const bagian = d.widget.filter(w => w.id !== "kesegaran").map(w => {
      if (w.sumber && !sumber.some(s => s.nama === w.sumber)) sumber.push({nama: w.sumber});
      const kol = w.kolom || [], ip = kol.findIndex(c => c.k === "prov");
      return {judul: w.label, angka: w.angka || [],
        teks: [tanpaSorot(w.judul), ...(w.tindak_lanjut || []).map(t => `Tindak lanjut ${t.siapa}: ${t.apa}`)].filter(Boolean),
        kolom: kol.map(c => K(c.label, c.jenis === "angka" || c.jenis === "persen" ? c.jenis : "teks")),
        baris: (w.baris || []).map(r => kol.map(c => r[c.k] ?? null)),
        prov: ip < 0 ? undefined : (w.baris || []).map(r => /^\d\d$/.test(r.prov) ? r.prov : kodeDari(r.prov)),
        catatan: [w.status === "basi" ? "Sumber data lebih tua dari jadwal pembaruannya." : w.status === "kosong" ? "Sumber data kosong saat dokumen dibuat." : "", w.catatan || ""].filter(Boolean).join(" ") || null};
    });
    return {judul: "Laporan Situasi Karhutla", sub: `Data per ${jam(d.dibuat)}`, per: d.dibuat, angka: situasi?.angka || [], bagian, sumber};
  }

  const tabelDok = (judul, sub, per, bagian, sumber, angka = []) => ({judul, sub, per, angka, bagian: [].concat(bagian), sumber});

  const L = (id, bencana, judul, url) => ({id, kelompok: "Laporan harian", bencana, judul, sumber: [url],
    ket: "Angka nasional, sorotan, per provinsi, kabupaten/kota teratas, tren 14 hari, prakiraan, dan tabel tambahan.", bangun: ([d]) => dariLaporan(d)});

  const DAFTAR = [
    {id: "lintas", kelompok: "Laporan pimpinan", bencana: "semua", judul: "Ringkasan lintas bencana",
      ket: "Satu halaman untuk pimpinan: indikator utama tiap bencana dan sorotan teratasnya.",
      sumber: ["/data/presiden/semua.json", "/banjir/data/laporan.json", "/banjir/data/cuaca_laporan.json", "/gempa/data/laporan.json", "/banjir/data/laporan_gunungapi.json", "/data/kekeringan_laporan.json", "/udara/data/laporan.json"],
      bangun([pr, ...lap]) {
        const s = pr.widget.find(w => w.id === "situasi"), a0 = s?.angka?.[0];
        const baris = [["Karhutla", a0?.label || "", a0?.nilai ?? null, a0?.satuan || "", jam(s?.per || pr.dibuat), tanpaSorot(s?.judul)]], sorot = [], prov = [];
        for (const d of lap) { const D = dariLaporan(d), u = d.metrik.findIndex(m => m.utama), a = D.angka[u < 0 ? 0 : u], nm = d.judul.replace(/^Laporan Harian /, "");
          baris.push([nm, a.label, a.nilai, a.satuan, tgl(d.hari_lengkap), d.sorot?.[0]?.judul || ""]);
          for (const x of (d.sorot || []).slice(0, 3)) { sorot.push([nm, kap(x.tingkat), x.judul, P(x.prov)]); prov.push(x.prov || ""); } }
        return {judul: "Ringkasan Lintas Bencana", sub: `Dibuat ${jam(new Date().toISOString())} dari laporan harian tiap bencana`, per: pr.dibuat,
          angka: baris.map(r => ({label: `${r[0]}: ${r[1]}`, nilai: r[2], satuan: r[3]})),
          bagian: [{judul: "Indikator utama per bencana", kolom: [K("Bencana"), K("Indikator"), K("Nilai", "angka"), K("Satuan"), K("Per"), K("Temuan teratas")], baris},
            {judul: "Sorotan tiap bencana", kolom: [K("Bencana"), K("Tingkat"), K("Temuan"), K("Provinsi")], baris: sorot, prov}],
          sumber: [{nama: "Laporan harian tiap bencana di Centurisk97", catatan: "angka asli tiap laporan, tanggal datanya bisa berbeda per bencana"}]};
      }},
    {id: "karhutla", kelompok: "Laporan harian", bencana: "karhutla", judul: "Laporan situasi karhutla", sumber: ["/data/presiden/semua.json"],
      ket: "Situasi, provinsi mendesak, kejadian api, konsesi, gambut, cuaca, asap, penerbangan, sumber daya, dampak, luas, dan pencegahan.", bangun: ([d]) => dariPresiden(d)},
    L("banjir", "banjir", "Laporan harian banjir, longsor, dan rob", "/banjir/data/laporan.json"),
    L("cuaca", "cuaca", "Laporan harian cuaca ekstrem", "/banjir/data/cuaca_laporan.json"),
    L("gempa", "gempa", "Laporan harian gempa bumi", "/gempa/data/laporan.json"),
    L("gunungapi", "gunungapi", "Laporan harian gunung api", "/banjir/data/laporan_gunungapi.json"),
    L("kekeringan", "kekeringan", "Laporan harian kekeringan", "/data/kekeringan_laporan.json"),
    L("udara", "udara", "Laporan harian kualitas udara", "/udara/data/laporan.json"),

    {id: "titik-bulanan", kelompok: "Data", bencana: "karhutla", judul: "Titik panas bulanan per provinsi", sumber: ["/data/titik_tahun.json"],
      ket: "Jumlah titik panas tiap bulan tahun berjalan, semua provinsi.",
      bangun([d]) { const r = Object.entries(d.prov).map(([k, v]) => ({k, v, t: v.reduce((s, x) => s + x, 0)})).filter(x => x.t).sort((a, b) => b.t - a.t);
        return tabelDok(`Titik Panas Bulanan ${d.tahun}`, `Data sampai ${tgl(d.sd)}`, d.dibuat,
          {judul: `Titik panas per bulan, ${d.tahun}`, kolom: [K("Provinsi"), ...BULAN.map(b => K(b, "angka")), K("Total", "angka")], baris: r.map(x => [P(x.k), ...x.v, x.t]), prov: r.map(x => x.k)},
          [{nama: d.sumber}], [{label: "Titik panas tahun ini", nilai: r.reduce((s, x) => s + x.t, 0), satuan: "titik"}]); }},
    {id: "luas-resmi", kelompok: "Data", bencana: "karhutla", judul: "Luas terbakar resmi per provinsi", sumber: ["/data/luas_resmi.json"],
      ket: "Indikasi luas kebakaran SiPongi KLHK per tahun, per provinsi.",
      bangun([d]) { const th = d.tahun, n = th.length - 1, r = Object.entries(d.ha).sort((a, b) => (b[1][n] || 0) - (a[1][n] || 0) || b[1].reduce((s, x) => s + x, 0) - a[1].reduce((s, x) => s + x, 0));
        return tabelDok("Luas Terbakar Resmi SiPongi", `Tahun ${th[0]} sampai ${th[n]}${d.sampai?.[th[n]] ? `, ${th[n]} sampai ${tgl(d.sampai[th[n]])}` : ""}`, null,
          {judul: "Luas indikasi terbakar (ha)", kolom: [K("Provinsi"), ...th.map(t => K(t, "angka"))], baris: r.map(([k, v]) => [P(k), ...v.map(x => bulat(x, 1))]), prov: r.map(([k]) => k)},
          [{nama: d.sumber}], [{label: `Luas ${th[n]}`, nilai: bulat(r.reduce((s, [, v]) => s + (v[n] || 0), 0)), satuan: "ha"}]); }},
    {id: "khg", kelompok: "Data", bencana: "karhutla", judul: "Prioritas kesatuan hidrologis gambut", sumber: ["/data/khg_prioritas.json"],
      ket: "KHG dengan titik panas 7 hari, 30 hari, dan musim ini, plus panjang kanal.",
      bangun([d]) { const r = d.khg.filter(k => k.titik_musim).sort((a, b) => b.titik_7h - a.titik_7h || b.titik_musim - a.titik_musim);
        return tabelDok("Prioritas KHG", `Data per ${tgl(d.per)}`, d.dibuat,
          {judul: "KHG dengan titik panas musim ini", kolom: [K("Kode"), K("Nama KHG"), K("Provinsi"), K("Kabupaten/kota"), K("Luas (ha)", "angka"), K("Titik 7 hari", "angka"), K("Titik 30 hari", "angka"), K("Titik musim", "angka"), K("Cluster aktif", "angka"), K("Kanal (km)", "angka")],
            baris: r.map(k => [k.kode, k.nama, k.prov_nama || P(k.prov), (k.kab || []).map(W.kab).join(", "), k.luas_ha, k.titik_7h, k.titik_30h, k.titik_musim, k.kompleks_aktif, k.kanal_km]), prov: r.map(k => k.prov),
            catatan: d.catatan}, [{nama: d.sumber}], [{label: "KHG bertitik panas 7 hari", nilai: r.filter(k => k.titik_7h).length, satuan: "KHG"}]); }},
    {id: "posko-karhutla", kelompok: "Data", bencana: "karhutla", judul: "Daftar posko karhutla", sumber: ["/data/posko.json"],
      ket: "Posko pusat, menengah, dan lapangan beserta koordinat, cakupan, dan Daops terdekat.",
      bangun([d]) { const r = [...(d.pusat || []).map(x => ["Pusat", x]), ...(d.menengah || []).map(x => ["Menengah", x]), ...(d.posko || []).map(x => ["Lapangan", x])];
        return tabelDok("Daftar Posko Karhutla", `Radius layanan posko lapangan ${fmtId(d.radius_km)} km`, null,
          {judul: "Posko", kolom: [K("ID"), K("Tingkat"), K("Provinsi"), K("Kabupaten/kota"), K("Nama / lokasi"), K("Lintang", "angka"), K("Bujur", "angka"), K("Titik panas riwayat", "angka"), K("Prioritas", "angka"), K("Daops terdekat"), K("Induk")],
            baris: r.map(([t, x]) => [x.id, t, P(x.prov), W.kab(x.kab || ""), x.nama, x.lat, x.lon, x.titik ?? null, x.prioritas ?? null, x.daops ? `${x.daops.nama} (${x.daops.km} km)` : "", x.induk || ""]), prov: r.map(([, x]) => x.prov)},
          [{nama: "Penempatan posko Centurisk97 dari riwayat titik panas NASA FIRMS", catatan: "usulan perencanaan, bukan posko resmi"}],
          [{label: "Posko lapangan", nilai: (d.posko || []).length, satuan: "posko"}, {label: "Posko menengah", nilai: (d.menengah || []).length, satuan: "posko"}, {label: "Posko pusat", nilai: (d.pusat || []).length, satuan: "posko"}]); }},
    {id: "posko-banjir", kelompok: "Data", bencana: "banjir", judul: "Daftar posko banjir dan longsor", sumber: ["/banjir/data/posko.json"],
      ket: "Posko lapangan banjir dan longsor dengan riwayat kejadian dan jarak ke induk.",
      bangun([d]) { const r = d.lapangan || [];
        return tabelDok("Daftar Posko Banjir dan Longsor", `Dibuat ${tgl(d.dibuat)}`, d.dibuat,
          {judul: "Posko lapangan", kolom: [K("ID"), K("Jenis"), K("Bahaya"), K("Provinsi"), K("Kabupaten/kota"), K("Kecamatan"), K("Lintang", "angka"), K("Bujur", "angka"), K("Kejadian tercatat", "angka"), K("Induk"), K("Jarak induk (km)", "angka")],
            baris: r.map(x => [x.id, kap(x.jenis), kap(x.bahaya), P(x.prov), W.kab(x.kab), x.kec, x.lat, x.lon, x.kejadian ?? null, x.induk || "", x.km_induk ?? null]), prov: r.map(x => x.prov)},
          [{nama: "Penempatan posko Centurisk97 dari riwayat kejadian BNPB", catatan: "usulan perencanaan, bukan posko resmi"}], [{label: "Posko lapangan", nilai: r.length, satuan: "posko"}]); }},
    {id: "gunungapi-status", kelompok: "Data", bencana: "gunungapi", judul: "Status gunung api", sumber: ["/banjir/data/gunungapi_status.json"],
      ket: "Level aktivitas tiap gunung api, radius bahaya, periode laporan, dan rekomendasi PVMBG.",
      bangun([d]) { const LV = ["", "Normal", "Waspada", "Siaga", "Awas"], r = [...d.gunung].sort((a, b) => b.level - a.level || a.nama.localeCompare(b.nama));
        return tabelDok("Status Gunung Api", `Data per ${jam(d.dibuat)}`, d.dibuat,
          {judul: "Gunung api", kolom: [K("Gunung"), K("Provinsi"), K("Level"), K("Radius bahaya (km)", "angka"), K("Periode laporan"), K("Rekomendasi"), K("Laporan")],
            baris: r.map(g => [g.nama, g.prov, `${LV[g.level] || g.level} (level ${g.level})`, g.radius_km ?? null, g.periode || "", String(g.rekomendasi || "").replace(/\s+/g, " ").slice(0, 400), g.laporan || ""]),
            prov: r.map(g => kodeDari(g.prov))},
          [{nama: d.sumber}], [4, 3, 2].map(l => ({label: `Level ${LV[l]}`, nilai: d.jumlah_level?.[l] ?? null, satuan: "gunung"}))); }},
    {id: "gempa-m5", kelompok: "Data", bencana: "gempa", judul: "Gempa M 5 atau lebih, 12 bulan", sumber: ["/gempa/data/riwayat_m5.json"],
      ket: "Daftar gempa magnitudo 5 ke atas setahun terakhir: waktu, provinsi, magnitudo, kedalaman.",
      bangun([d]) { const c = Object.fromEntries(d.kolom.map((k, i) => [k, i])), akhir = d.baris.reduce((m, b) => b[c.waktu_utc] > m ? b[c.waktu_utc] : m, ""),
          batas = new Date(new Date(akhir + "Z").getTime() - 365 * 864e5).toISOString().slice(0, 16), r = d.baris.filter(b => b[c.waktu_utc] >= batas).sort((a, b) => b[c.waktu_utc] < a[c.waktu_utc] ? -1 : 1);
        return tabelDok("Gempa M 5 atau Lebih", `12 bulan sampai ${jam(akhir + "Z")}`, null,
          {judul: "Kejadian gempa", kolom: [K("Waktu (WIB)"), K("Provinsi"), K("Magnitudo", "angka"), K("Kedalaman (km)", "angka"), K("Lintang", "angka"), K("Bujur", "angka")],
            baris: r.map(b => [jam(b[c.waktu_utc] + "Z"), P(b[c.prov]) || "Laut / luar provinsi", b[c.m], b[c.dalam_km], b[c.lat], b[c.lon]]), prov: r.map(b => b[c.prov] || "")},
          [{nama: d.sumber}], [{label: "Gempa M 5 atau lebih", nilai: r.length, satuan: "kejadian"}, {label: "Magnitudo terbesar", nilai: Math.max(...r.map(b => b[c.m])), satuan: "M"}]); }},
  ];
  function fmtId(v) { return Number(v).toLocaleString("id-ID"); }
  return {DAFTAR, dariLaporan, dariPresiden, kodeDari};
})();
