/* Laphar dan Sitrep dari logbook (G6, docs/superpowers/specs/2026-11-01-pusdalops-standar.md): fungsi MURNI, tanpa DOM dan tanpa fetch.
   Butuh dokumen_pusdalops.js (window.DokumenPusdalops) untuk hari laporan, pengelompokan kejadian, format angka.
   Laphar: teksLaphar() menghasilkan bentuk laphar Koordalops 2022-2026 ("A. Kejadian Bencana", label ➢) yang dapat diurai LaporanUrai.urai (public/laporan_urai.js);
   uji menyusun lalu mengurai kembali. Sitrep: satu kejadian, kronologi dari semua entri + data instansi (PVMBG gunung api, katalog gempa).
   Medan juklak (korban terpilah, prasarana, kebutuhan_rinci, posko, kib) datang dari GET /api/logbook/hari; SK dari GET /api/logbook/kejadian/:id/sk. */
(g => {
  "use strict";
  const D = g.DokumenPusdalops, {fmt, fmt0, tglIndo, tglISO, awalHari, tambahHari, namaProv} = D, HARI = 864e5, WIB = 7 * 36e5;
  const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const hariTgl = tgl => `${NAMA_HARI[new Date(awalHari(tgl)).getUTCDay()]}, ${tglIndo(tgl)}`;
  const jamWib = ms => { const d = new Date(ms + WIB); return `${String(d.getUTCHours()).padStart(2, "0")}.${String(d.getUTCMinutes()).padStart(2, "0")}`; };
  const waktuWib = ms => `${tglIndo(tglISO(ms + WIB))} pukul ${jamWib(ms)} WIB`;
  const rapi = s => String(s ?? "").replace(/[​-‏‪-‮⁠﻿]/g, "").replace(/\s+/g, " ").replace(/^[➢>»•●\-\s]+/, "").trim();   // satu baris; penanda butir di depan dibuang agar tak dikira label/entri
  const ada = v => v != null && v > 0;
  const kode = s => String(s).replace(/_/g, " ");
  const jam = s => String(s || "").replace(/\b(\d{1,2}):(\d{2})\b/g, "$1.$2");   // teks MAGMA mentah memakai 03:29, dokumen memakai 03.29

  /* judul entri harus dibuka kata jenis yang dikenal pengurai (RE_JUDUL_ENTRI), jadi jenis tanpa kata itu diawali "Bencana" */
  const JUDUL = {banjir: "Banjir", longsor: "Tanah Longsor", cuaca: "Cuaca Ekstrem", karhutla: "Kebakaran Hutan dan Lahan", kebakaran_permukiman: "Kebakaran Permukiman", gempabumi: "Gempa Bumi",
    gunungapi: "Aktivitas Gunung Api", kekeringan: "Kekeringan", gelombang_pasang: "Gelombang Pasang dan Abrasi", tsunami: "Bencana Tsunami"};
  const judulJenis = j => JUDUL[j] || "Bencana " + (D.NAMA[j] || kode(j));
  const wilayahJudul = k => {
    const kab = k.kab ? (/^(kab\.?|kabupaten|kota)\b/i.test(k.kab) ? k.kab : "Kab. " + k.kab) : "";
    return [kab, k.kec && `Kec. ${k.kec}`, k.desa && `Desa ${k.desa}`, `Provinsi ${namaProv(k.prov)}`].filter(Boolean).join(", ");
  };
  const judulKejadian = k => `${judulJenis(k.jenis)} di ${wilayahJudul(k)}`;

  /* ---------- medan dampak dari satu entri (dipakai laphar dan sitrep) ---------- */
  const TINGKAT = {rb: "rusak berat", rs: "rusak sedang", rr: "rusak ringan", terendam: "terendam"};
  const HA = new Set(["sawah", "lahan", "kebun", "hutan", "kolam"]);   // satuan tetap per kode, sama dengan PRASARANA di src/logbook.js
  const satuanPras = k => HA.has(k) ? "ha" : k === "jalan" ? "km" : "unit";
  const terpilah = o => Object.entries(o || {}).map(([u, s]) => `${u} tahun (laki-laki ${fmt(s.L)}, perempuan ${fmt(s.P)})`).join("; ");
  function medanDampak(e) {
    const m = {korban: [], pengungsi: [], kerugian: [], kebutuhan: [], kendala: [], upaya: []};
    if (!e) return m;
    const dilapor = ["md", "hilang", "luka"].some(c => e[c] != null), p = [];
    for (const [c, t] of [["md", "meninggal"], ["hilang", "hilang"], ["luka", "luka"]]) if (ada(e[c])) p.push(`${fmt(e[c])} ${t}`);
    m.korban.push(p.length ? p.join(", ") : dilapor ? "nihil" : "belum dilaporkan");
    if (e.korban && ada(e.korban.terdampak_jiwa)) m.korban.push(`Terdampak ${fmt(e.korban.terdampak_jiwa)} jiwa`);
    for (const [c, t] of [["md", "Meninggal"], ["hilang", "Hilang"], ["luka", "Luka"], ["terdampak", "Terdampak"]]) if (e.korban && e.korban[c]) m.korban.push(`${t} menurut umur: ${terpilah(e.korban[c])}`);
    const jiwa = ada(e.mengungsi_jiwa), kk = ada(e.mengungsi_kk);
    m.pengungsi.push(jiwa || kk ? `${jiwa ? fmt(e.mengungsi_jiwa) + " jiwa" : ""}${kk ? (jiwa ? ` (${fmt(e.mengungsi_kk)} KK)` : fmt(e.mengungsi_kk) + " KK") : ""}` : e.mengungsi_jiwa != null || e.mengungsi_kk != null ? "nihil" : "belum dilaporkan");
    if (e.korban && e.korban.mengungsi) m.pengungsi.push(`Menurut umur: ${terpilah(e.korban.mengungsi)}`);
    if (e.rentan) { const r = Object.entries(e.rentan).filter(([, v]) => ada(v)).map(([c, v]) => `${kode(c)} ${fmt(v)} jiwa`); if (r.length) m.pengungsi.push(`Kelompok rentan: ${r.join(", ")}`); }
    const rm = [["rumah_rb", "rusak berat"], ["rumah_rs", "rusak sedang"], ["rumah_rr", "rusak ringan"], ["rumah_terendam", "terendam"]].filter(([c]) => ada(e[c])).map(([c, t]) => `${fmt(e[c])} rumah ${t}`);
    if (ada(e.luas_ha)) rm.push(`${fmt0(e.luas_ha)} ha terbakar`);
    m.kerugian.push(rm.length ? rm.join(", ") : "belum dilaporkan");
    if (Array.isArray(e.prasarana) && e.prasarana.length) m.kerugian.push("Prasarana: " + e.prasarana.map(x => `${kode(x.kode)}${x.tingkat ? " " + TINGKAT[x.tingkat] : ""} ${(satuanPras(x.kode) === "km" ? fmt : fmt0)(x.jumlah)} ${satuanPras(x.kode)}`).join(", "));
    if (ada(e.kerugian_juta)) m.kerugian.push(`Nilai kerugian Rp${fmt(e.kerugian_juta)} juta`);
    m.kebutuhan.push((e.kebutuhan || []).length ? e.kebutuhan.map(kode).join(", ") : "belum dilaporkan");
    if (Array.isArray(e.kebutuhan_rinci)) {
      const per = new Map(); for (const x of e.kebutuhan_rinci) { if (!per.has(x.kelompok)) per.set(x.kelompok, []); per.get(x.kelompok).push(`${x.barang} ${fmt(x.jumlah)} ${x.satuan}`); }
      for (const [kel, l] of per) m.kebutuhan.push(`${kel[0].toUpperCase() + kel.slice(1)}: ${l.join(", ")}`);
    }
    m.kendala.push((e.kendala || []).length ? e.kendala.map(kode).join(", ") : "belum dilaporkan");
    if (Array.isArray(e.pemberi) && e.pemberi.length) m.upaya.push("Penanganan oleh " + e.pemberi.join(", "));
    const ps = poskoTeks(e.posko); if (ps) m.upaya.push(ps);
    if (e.sumber_instansi) m.upaya.push("Sumber instansi: " + rapi(e.sumber_instansi));
    if (!m.upaya.length) m.upaya.push("belum dilaporkan");
    return m;
  }
  function poskoTeks(p) {
    if (!p || p.ada == null) return "";
    if (!p.ada) return "Posko belum didirikan";
    return "Posko berdiri" + (p.sk ? `, SK ${p.sk}` : "") + (p.berlaku_mulai ? `, berlaku ${tglIndo(p.berlaku_mulai)}${p.berlaku_sampai ? " s.d. " + tglIndo(p.berlaku_sampai) : ""}` : "");
  }

  /* SK status: baris pertama harus berbentuk "Tanggap Darurat TMT 31/10/2026 s.d 14/11/2026," supaya ringkasStatus() pengurai laphar membacanya */
  const TINGKAT_SK = {siaga: "Siaga Darurat", tanggap: "Tanggap Darurat", transisi: "Transisi Darurat"};
  const skTeks = s => `${TINGKAT_SK[s.tingkat] || kode(s.tingkat)} TMT ${tglIndo(s.tmt_mulai)}${s.tmt_selesai ? " s/d " + tglIndo(s.tmt_selesai) : ""}, SK ${s.wilayah === "prov" ? "Provinsi" : "Kabupaten"} No. ${s.nomor}${s.perpanjangan_ke ? `, perpanjangan ke-${s.perpanjangan_ke}` : ""}${s.tmt_selesai ? "." : ""}`;

  /* ---------- 1. Laphar ---------- */
  const statusBaris = l => l.length ? l.map(skTeks) : ["Tidak ada SK status tercatat."];
  /* SK datang dari fetch terpisah: model dihitung sekali, SK dipasang kemudian */
  const pasangSk = (m, sk) => ({...m, kejadian: m.kejadian.map(k => { const l = (sk || {})[k.id] || []; return {...k, sk: l, medan: k.medan.map(r => r[0] === "Status" ? ["Status", statusBaris(l)] : r)}; })});
  /* opsi: {sk: {kejadianId: [sk]}, manual: Set, semua: bool (default hanya yang menonjol)} */
  function laphar(entri, tgl, opsi = {}) {
    const hr = D.hariData(entri, tgl, opsi.manual), sampai = awalHari(tgl) + HARI, dari = awalHari(tgl), grup = D.kelompokKejadian(entri), sk = opsi.sk || {};
    const pilih = (opsi.semua ? hr.semua : hr.daftar).slice().sort((a, b) => String(a.prov).localeCompare(String(b.prov)) || String(a.kab).localeCompare(String(b.kab)) || String(a.jenis).localeCompare(String(b.jenis)));
    const kejadian = pilih.map((v, i) => {
      const k = grup.get(v.id), dalam = k.entri.filter(x => x.waktu >= dari && x.waktu < sampai), e = dalam.at(-1), m = medanDampak(e), daftarSk = sk[v.id] || [];
      const tutup = k.status === "tutup";
      const kondisi = [tutup ? "Kejadian telah ditutup di logbook, penanganan selesai." : "Kejadian masih dalam penanganan."]; if (e.catatan) kondisi.push(rapi(e.catatan));
      return {no: i + 1, id: v.id, jenis: v.jenis, judul: judulKejadian(k), kib: v.kib || null, menonjol: v.menonjol, alasan: v.alasan, sk: daftarSk, medan: [
        ["Update", [waktuWib(e.waktu)]],
        ["Kronologis", ["", ...dalam.map(x => `${jamWib(x.waktu)} WIB: ${rapi(x.catatan) || D.dampakTeks(x) || "pembaruan data"}`)]],
        ["Lokasi", [[k.desa && `Desa ${k.desa}`, k.kec && `Kecamatan ${k.kec}`, k.kab, `Provinsi ${namaProv(k.prov)}`].filter(Boolean).join(", ") + (v.kib ? `. KIB ${v.kib}` : "")]],
        ["Korban Jiwa", m.korban], ["Pengungsi", m.pengungsi], ["Kerugian Materil", m.kerugian], ["Upaya", m.upaya], ["Kebutuhan", m.kebutuhan], ["Kendala", m.kendala],
        ["Status", statusBaris(daftarSk)], ["Kondisi Mutakhir", kondisi]]};
    });
    return {tgl, selesai: tambahHari(tgl, 1), dummy: D.adaDummy(entri), semua: !!opsi.semua, total: hr.total, nMenonjol: hr.daftar.length, kejadian};
  }
  const periodeTeks = (m) => `sejak hari ${hariTgl(m.tgl)} pukul 07.00 WIB sampai dengan hari ${hariTgl(m.selesai)} pukul 07.00 WIB`;
  /* teks inilah yang diurai LaporanUrai.urai; juga teks WA */
  function teksLaphar(m, diambil) {
    const l = [];
    if (m.dummy) l.push("[DATA DUMMY, BUKAN LAPORAN NYATA]");
    l.push("BADAN NASIONAL PENANGGULANGAN BENCANA", "DIREKTORAT KOORDINASI DAN PELAKSANAAN OPERASI (PUSDALOPS)", "LAPORAN HARIAN", hariTgl(m.selesai), "",
      `Pemantauan kejadian bencana ${periodeTeks(m)}.`, `Jumlah kejadian ${m.semua ? "yang tercatat" : "menonjol"}: ${fmt(m.kejadian.length)} dari ${fmt(m.total)} kejadian periode ini.`, "", "A. Kejadian Bencana");
    if (!m.kejadian.length) l.push("Tidak ada kejadian yang memenuhi ambang menonjol pada periode ini.");
    for (const k of m.kejadian) {
      l.push("", `${k.no}. ${k.judul}`);
      for (const [lab, baris] of k.medan) { l.push(`➢ ${lab}: ${rapi(baris[0])}`); for (const b of baris.slice(1)) l.push(`   • ${rapi(b)}`); }
    }
    l.push("", "B. Rekapitulasi berdasarkan SK Darurat");
    const bersk = m.kejadian.filter(k => k.sk.length);
    if (!bersk.length) l.push("Tidak ada SK status darurat tercatat untuk kejadian pada laporan ini.");
    for (const k of bersk) l.push(`${k.no}. ${k.judul}`, ...k.sk.map(s => `   • ${skTeks(s)}`));
    l.push("", D.sumber(diambil));
    return l.join("\n");
  }

  /* ---------- 2. Sitrep per kejadian ---------- */
  const PRIORITAS = {gunungapi: 0, gempabumi: 1, tsunami: 1};
  /* kejadian besar yang ditawarkan: gunung api, gempa, tsunami, dan yang menonjol; urut jenis lalu terbaru */
  function kandidatSitrep(entri, tglAkhir) {
    const sampai = awalHari(tglAkhir) + HARI, hasil = [];
    for (const k of D.kelompokKejadian(entri).values()) {
      const e = k.entri.filter(x => x.waktu < sampai).at(-1); if (!e) continue;
      const besar = k.jenis in PRIORITAS || D.menonjol(k.jenis, e).ya;
      if (besar) hasil.push({id: k.id, jenis: k.jenis, judul: judulKejadian(k), terakhir: e.waktu, nEntri: k.entri.length});
    }
    return hasil.sort((a, b) => (PRIORITAS[a.jenis] ?? 9) - (PRIORITAS[b.jenis] ?? 9) || b.terakhir - a.terakhir);
  }
  const LEVEL = {1: "Level I (Normal)", 2: "Level II (Waspada)", 3: "Level III (Siaga)", 4: "Level IV (Awas)"};
  const kecil = s => String(s || "").toLowerCase();
  /* gunung yang cocok: namanya disebut di catatan/lokasi dulu, lalu gunung di provinsi yang sama; data = gunungapi_status.json */
  function kandidatGunung(k, data) {
    const teks = kecil([k.desa, k.kec, k.kab, ...k.entri.map(e => e.catatan)].join(" ")), pv = kecil(namaProv(k.prov)), semua = (data && data.gunung) || [];
    const sebut = semua.filter(x => teks.includes(kecil(x.nama))), serumpun = semua.filter(x => !sebut.includes(x) && pv && kecil(x.prov).includes(pv));
    return [...sebut, ...serumpun];
  }
  const gunungModel = (x, data) => x && ({nama: x.nama, prov: x.prov, level: LEVEL[x.level] || `Level ${x.level}`, radius: x.radius_km != null ? `${fmt(x.radius_km)} km` : "belum dilaporkan", periode: jam(x.periode), rekomendasi: jam(rapi(x.rekomendasi)), laporan: x.laporan || "",
    penduduk: x.penduduk_radius != null ? `${fmt0(x.penduduk_radius)} jiwa (${x.penduduk_sumber || "perkiraan"})` : "", sumber: data.sumber || "MAGMA Indonesia, PVMBG", tgl: data.dibuat ? tglIndo(String(data.dibuat).slice(0, 10)) : "belum dilaporkan",
    letusan: ((data.letusan || []).filter(l => l.gunung === x.nama).slice(0, 3)).map(l => jam(rapi(l.ket)))});
  /* gempa: baris katalog M5+ (laporan gempa tambahan id "m5") yang wilayahnya menyebut kabupaten atau provinsi kejadian */
  /* katalog menulis "29 Okt 02.56 WIB" tanpa tahun: tahun dari tanggal berkas (`dibuat`), mundur satu tahun bila bulannya lebih akhir dari bulan berkas */
  const BLN3 = ["jan", "feb", "mar", "apr", "mei", "jun", "jul", "agu", "sep", "okt", "nov", "des"];
  const waktuGempa = (w, dibuat) => {
    const m = String(w).match(/^(\d{1,2}) (\w{3}) (.+)$/), d = String(dibuat || "").match(/^(\d{4})-(\d\d)/); if (!m || !d) return w;
    const bl = BLN3.indexOf(m[2].toLowerCase()); return bl < 0 ? w : `${m[1]} ${m[2]} ${bl + 1 > Number(d[2]) ? Number(d[1]) - 1 : d[1]} ${m[3]}`;
  };
  const perGempa = lap => lap && lap.dibuat ? tglIndo(String(lap.dibuat).slice(0, 10)) : "belum dilaporkan";
  function kandidatGempa(k, lap) {
    const t = ((lap && lap.tambahan) || []).find(x => x.id === "m5"); if (!t) return [];
    const kab = kecil(String(k.kab || "").replace(/^(kab\.?|kabupaten|kota)\s+/i, "")), pv = kecil(namaProv(k.prov));
    const sebut = nama => t.baris.filter(b => nama && kecil(b[3]).includes(nama));   // kabupaten dulu; satu provinsi penuh terlalu longgar, dipakai hanya bila kejadian tak punya kabupaten
    return (kab ? sebut(kab) : sebut(pv)).slice(0, 5).map(b => ({waktu: waktuGempa(b[0], lap.dibuat), magnitudo: b[1], kedalaman: b[2], wilayah: b[3]}));
  }

  /* inst: {gunung: objek terpilih dari gunungapi_status.json, data: berkas itu, gempa: [baris kandidatGempa], tglData} */
  function sitrep(entri, id, tglAkhir, sk, inst = {}) {
    const k = D.kelompokKejadian(entri).get(id); if (!k) return null;
    const sampai = awalHari(tglAkhir) + HARI, semuaE = k.entri.filter(x => x.waktu < sampai), e = semuaE.at(-1); if (!e) return null;
    const m = medanDampak(e), daftarSk = sk || [];
    return {id, jenis: k.jenis, judul: judulKejadian(k), kib: e.kib || null, dummy: !!k.dummy, status: k.status, sampai: e.waktu, mulai: semuaE[0].waktu, nEntri: semuaE.length,
      ringkas: [["Kejadian", judulKejadian(k)], ["Korban jiwa", m.korban[0]], ["Pengungsi", m.pengungsi[0]], ["Kerusakan", m.kerugian[0]], ["Status kejadian", k.status === "tutup" ? "Ditutup" : "Masih berjalan"]],
      kronologi: semuaE.map(x => ({waktu: waktuWib(x.waktu), teks: rapi(x.catatan) || "pembaruan data", dampak: D.dampakTeks(x)})),
      dampak: [["Korban jiwa", m.korban], ["Pengungsi", m.pengungsi], ["Kerugian materil", m.kerugian]], kebutuhan: m.kebutuhan, kendala: m.kendala, upaya: m.upaya,
      sk: daftarSk.map(s => [TINGKAT_SK[s.tingkat] || s.tingkat, s.wilayah === "prov" ? "Provinsi" : "Kabupaten", s.nomor, `${tglIndo(s.tmt_mulai)}${s.tmt_selesai ? " s.d. " + tglIndo(s.tmt_selesai) : ""}`, s.perpanjangan_ke ? `ke-${s.perpanjangan_ke}` : "awal", s.tautan || ""]),
      posko: poskoTeks(e.posko) || "belum dilaporkan", gunung: inst.gunung ? gunungModel(inst.gunung, inst.data || {}) : null, gempa: inst.gempa || null, gempaPer: inst.gempaPer || ""};
  }
  function teksSitrep(s, diambil) {
    const l = [];
    if (s.dummy) l.push("[DATA DUMMY, BUKAN LAPORAN NYATA]");
    l.push(`*SITUASI TERKINI: ${s.judul.toUpperCase()}*`, `Data dilaporkan sampai ${waktuWib(s.sampai)}`, "", ...s.ringkas.map(([a, b]) => `${a}: ${b}`));
    l.push("", "*Kronologis*", ...s.kronologi.map(x => `- ${x.waktu}: ${x.teks}${x.dampak ? ` (${x.dampak})` : ""}`));
    l.push("", "*Dampak terkini*"); for (const [a, b] of s.dampak) l.push(`- ${a}: ${b.join("; ")}`);
    l.push("", "*Upaya*", ...s.upaya.map(x => `- ${x}`), "", "*Kebutuhan*", ...s.kebutuhan.map(x => `- ${x}`), "", `*Kendala*: ${s.kendala.join("; ")}`);
    l.push("", "*Status kedaruratan*"); if (s.sk.length) s.sk.forEach(r => l.push(`- ${r[0]} ${r[1]}, SK ${r[2]}, ${r[3]} (${r[4]})`)); else l.push("- Tidak ada SK status tercatat.");
    l.push(`Posko: ${s.posko}`);
    if (s.gunung) { const x = s.gunung; l.push("", `*Data PVMBG: Gunung ${x.nama}*`, `${x.level}, radius bahaya ${x.radius}`, x.periode ? `Periode ${x.periode}` : null, x.penduduk ? `Penduduk dalam radius: ${x.penduduk}` : null, x.rekomendasi ? `Rekomendasi: ${x.rekomendasi}` : null, ...x.letusan.map(t => `- ${t}`), `Sumber: ${x.sumber}, per ${x.tgl}`); }
    if (s.gempa && s.gempa.length) l.push("", "*Gempa M 5 atau lebih di sekitar lokasi*", ...s.gempa.map(x => `- ${x.waktu}: M ${fmt(x.magnitudo)}, kedalaman ${fmt(x.kedalaman)} km, ${x.wilayah}`), `Sumber: USGS dan BMKG, arsip Centurisk97, per ${s.gempaPer || "belum dilaporkan"}`);
    l.push("", D.sumber(diambil));
    return l.filter(x => x != null && x !== false).join("\n");
  }

  g.DokumenLaphar = {judulKejadian, medanDampak, skTeks, laphar, teksLaphar, kandidatSitrep, kandidatGunung, kandidatGempa, perGempa, pasangSk, sitrep, teksSitrep, hariTgl, waktuWib, LEVEL};
})(globalThis);
