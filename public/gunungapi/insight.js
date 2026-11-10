"use strict";
/* Insight gunung api: kartu bergaya karhutla/banjir (pil kategori, judul satu kalimat berangka merah, grafik berangka, legenda + "Sumber:").
   Mesin kartu dari public/inti (Kartu.ex/leg/pil, paginasi, pengurutKepala); di sini hanya data dan gambar SVG gunung api.
   Kartu tanpa data tidak digambar (A18). Level resmi PVMBG ditampilkan apa adanya; tidak ada tingkat buatan Centurisk97. */
Tip.polaSatu = /^([\d.,]+(?:\s?(?:rb|jt))?\s+(?:gunung|erupsi|jiwa))$/;
if (!window.__pilihPasang) { window.__pilihPasang = 1; PilihCantik.pasang(); }
const SUMBER = "Sumber: MAGMA Indonesia, PVMBG (Badan Geologi, KESDM)";
const NAVY = "oklch(25.5% .075 256)", BATA = "#b5523b";

const Insight = {
  EX: ["status", "cerita", "letusan", "perubahan", "rezim", "arahabu", "cakupan", "pantau", "paparan", "bandara", "peluang", "krb", "arahan", "tambang", "kinerja", "daftar"],
  LABEL: {status: "Status", cerita: "Cerita", letusan: "Erupsi", perubahan: "Perubahan level", bandara: "Bandara di jalur abu", peluang: "Peluang abu", krb: "Paparan KRB III", arahan: "Arahan per KRB", tambang: "Izin tambang", kinerja: "Uji", daftar: "Daftar gunung", rezim: "Rezim letusan", arahabu: "Arah abu per musim", cakupan: "Cakupan VONA", pantau: "Pantau kegempaan", paparan: "Paparan lawan aktivitas"},
  /* kartu yang bergantung pada berkas turunan (abu, paparan): digambar sesudah berkasnya tiba, dibuang bila datanya tak ada (A18) */
  LAMBAT: ["cerita", "perubahan", "rezim", "arahabu", "cakupan", "pantau", "paparan", "bandara", "peluang", "krb", "arahan", "tambang", "kinerja"],
  T: {rezim: {urut: "n", turun: true, hal: 0}, pantau: {urut: "rs", turun: true, hal: 0}, paparan: {urut: "jw", turun: true, hal: 0}, daftar: {urut: "_", turun: true, hal: 0}, arahan: {urut: "_", turun: true, hal: 0}, bandara: {urut: "jam", turun: false, hal: 0}, tambang: {urut: "zona", turun: true, hal: 0}},
  st: {},
  ex: (...a) => Kartu.ex(...a),
  hl: Kartu.hl,
  p: (x, y, t, bg, fg = "#fff", fs = 12) => Kartu.pil(x, y, t, bg, fg, fs),
  nm: n => `<span translate="no">${esc(n)}</span>`,
  pl: (t, w) => `<span class="pl" style="--w:${w}">${t}</span>`,
  tgl: t => { const d = new Date(t); return d.toLocaleDateString("id-ID", {...WIB, day: "numeric", month: "short", ...(d.getFullYear() !== new Date().getFullYear() ? {year: "numeric"} : {})}); },
  /* viewBox dirapatkan di layar sempit supaya huruf tetap terbaca */
  uk() { const M = innerWidth < 640; return M ? {W: 520, L: 110, rh: 32, fs: 13} : {W: 940, L: 170, rh: 34, fs: 13}; },
  skor: g => g.level * 1e6 + (g.radius_km || 0) * 1e3,

  /* 1. berapa gunung per level */
  exStatus() {
    const U = this.uk(), G = S.st.gunung, n = S.n, sa = n[3] + n[4], mx = Math.max(...[1, 2, 3, 4].map(l => n[l])), X = v => v / mx * (U.W - U.L - 140);
    const baris = [4, 3, 2, 1].filter(l => n[l] || l >= 2);
    const g = baris.map((l, i) => { const y = i * (U.rh + 14), nm = G.filter(x => x.level === l).map(x => x.nama), tip = `<b>Level ${LEVEL[l][0]} ${LEVEL[l][1]}</b><br>Jumlah: ${fmt(n[l])} gunung${l >= 2 && nm.length ? "<br>" + esc(nm.join(", ")) : ""}`;
      return `<g><text x="${U.L - 10}" y="${y + 21}" text-anchor="end" font-size="${U.fs}" font-weight="700">${LEVEL[l][1]}</text>
        ${n[l] ? `<rect class="gx" x="${U.L}" y="${y + 5}" width="${Math.max(3, X(n[l]))}" height="${U.rh - 8}" rx="6" fill="${WARNA_LV[l]}" data-tip="${tip}"/>` : ""}
        <g class="gf">${this.p(U.L + (n[l] ? Math.max(3, X(n[l])) : 0) + 8, y + 7, fmt(n[l]) + " gunung", WARNA_LV[l], FG_LV[l])[0]}</g>
        ${l >= 2 && nm.length ? `<text x="${U.L + 4}" y="${y + U.rh + 9}" font-size="11" opacity=".7">${esc(nm.slice(0, innerWidth < 640 ? 3 : 8).join(", "))}${nm.length > (innerWidth < 640 ? 3 : 8) ? "…" : ""}</text>` : ""}</g>`; }).join("");
    Kartu.leg([[WARNA_LV[4], "Awas"], [WARNA_LV[3], "Siaga"], [WARNA_LV[2], "Waspada"], [WARNA_LV[1], "Normal"]]);
    return this.ex(sa ? `${this.hl(fmt(sa) + " gunung")} berstatus Siaga atau Awas ${labelHari(S.st.dibuat)}, ${fmt(n[2])} gunung lainnya Waspada` : `Tidak ada gunung berstatus Siaga atau Awas ${labelHari(S.st.dibuat)}; ${this.hl(fmt(n[2]) + " gunung")} Waspada`, "", "",
      `<svg viewBox="0 0 ${U.W} ${baris.length * (U.rh + 14) + 4}" role="img" aria-label="Gunung api per level">${g}</svg>`, SUMBER); },

  /* 1b. cerita satu gunung (C16): gunung berstatus tertinggi hari ini, dirangkai dari status MAGMA, factsheet letusan, indeks risiko riwayat, dan uji tren BNPB; baris tanpa data dibuang */
  exCerita() { return Cerita.kartu("gunungapi"); },
  dataCerita() {
    const G = [...S.st.gunung].sort((a, b) => this.skor(b) - this.skor(a)); if (!G[0] || G[0].level < 2 || !this.cr) return "";
    const { fs, rk, dm } = this.cr, adaKasus = n => (fs?.kasus || []).filter(k => k.meninggal > 0 && idGn(k.gunung) === idGn(n)).sort((a, b) => b.meninggal - a.meninggal)[0];
    /* di antara gunung berlevel tertinggi, utamakan yang punya letusan terkurasi (cerita lebih utuh) */
    const g = G.filter(x => x.level === G[0].level).find(x => adaKasus(x.nama)) || G[0], kasus = adaKasus(g.nama);
    const risiko = rk?.gunung?.[g.nama], urut = risiko ? Object.values(rk.gunung).filter(v => v[0] > risiko[0]).length + 1 : 0, T = dm?.tren?.kejadian, hari = labelHari(S.st.dibuat);
        const p3 = x => x < .001 ? "< 0,001" : x.toLocaleString("id-ID", {maximumFractionDigits: 3}), baris = [[WARNA_LV[g.level], "Status", `${this.nm(g.nama)} berstatus ${LEVEL[g.level][1]} (Level ${LEVEL[g.level][0]}) ${hari}.`]];
    if (kasus) baris.push([BATA, "Pernah terjadi", `Letusan paling mematikan di ${this.nm(g.nama)} yang dikurasi terjadi pada ${kasus.tanggal.slice(0, 4)}: ${fmt(kasus.meninggal)} orang meninggal${kasus.vei != null ? `, kekuatan VEI ${kasus.vei}` : ""}.`]);
    if (risiko) baris.push(["#6b7fa3", "Riwayat", `Indeks risiko riwayat letusan ${this.nm(g.nama)} ${fmt(risiko[0])} dari 100 (${rk.kelas[risiko[1]]}), peringkat ${fmt(urut)} dari ${fmt(Object.keys(rk.gunung).length)} gunung. Ini catatan masa lalu, bukan prakiraan.`]);
    if (T) baris.push(["#2f8f83", "Tren", T.vonis === "tidak bermakna" ? `Jumlah kejadian erupsi di seluruh Indonesia ${T.dari} sampai ${T.sampai} tidak menunjukkan tren naik atau turun yang bermakna (p = ${p3(T.p)}).` : `Jumlah kejadian erupsi di seluruh Indonesia ${T.dari} sampai ${T.sampai} menunjukkan tren ${T.vonis} (p = ${p3(T.p)}).`]);
    if (baris.length < 2) return "";
    if (g.radius_km) baris.push(["#e8743b", "Untuk kamu", `Kalau kamu tinggal dalam radius ${fmt(g.radius_km)} km dari ${this.nm(g.nama)}, ikuti rekomendasi PVMBG dan arahan BPBD setempat.`]);
    return {judul: `${this.hl(this.nm(g.nama))} termasuk gunung berstatus tertinggi ${hari}: ${this.hl("Level " + LEVEL[g.level][0] + " " + LEVEL[g.level][1])}`, baris,
      sumber: SUMBER.replace("Sumber: ", "") + "; Smithsonian GVP, NOAA NCEI, BNPB"}; },

  /* 2. erupsi 24 jam terakhir per gunung (daftar informasi letusan MAGMA) */
  exLetusan() {
    const E = S.st.letusan || []; if (!E.length) return "";
    const akhir = new Date(S.st.dibuat), mulai = akhir - 864e5, dlm = E.filter(e => new Date(e.waktu) >= mulai), per = {};
    /* daftar MAGMA dibaca mundur paling banyak 8 halaman: bila gunung yang sering erupsi memenuhinya, jendela lebih pendek dari 24 jam dan judul menyebut jam sebenarnya */
    const jam = Math.min(24, Math.max(1, Math.ceil((akhir - new Date(E.at(-1).waktu)) / 36e5)));
    dlm.forEach(e => { per[e.gunung] = (per[e.gunung] || 0) + 1; });
    const T = Object.entries(per).map(([nm, n]) => ({nm, n, tinggi: Math.max(0, ...dlm.filter(e => e.gunung === nm).map(e => e.tinggi_m || 0)), lv: S.st.gunung.find(g => g.nama === nm)?.level || 1})).sort((a, b) => b.n - a.n).slice(0, 12);
    const U = this.uk(), mx = Math.max(1, ...T.map(x => x.n)), X = v => v / mx * (U.W - U.L - 270);
    const g = T.map((x, i) => { const y = i * U.rh, tip = `<b>${esc(x.nm)}</b><br>Erupsi ${jam} jam: ${fmt(x.n)}${x.tinggi ? `<br>Kolom abu tertinggi: ${fmt(x.tinggi)} m` : ""}`;
      return `<g><text x="${U.L - 10}" y="${y + 21}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(x.nm)}</text>
        <rect class="gx" x="${U.L}" y="${y + 6}" width="${Math.max(3, X(x.n))}" height="${U.rh - 12}" rx="5" fill="${WARNA_LV[x.lv]}" data-tip="${tip}"/>
        <g class="gf">${this.p(U.L + Math.max(3, X(x.n)) + 8, y + 7, fmt(x.n) + " erupsi", WARNA_LV[x.lv], FG_LV[x.lv])[0]}${x.tinggi ? this.p(U.L + Math.max(3, X(x.n)) + 8 + (fmt(x.n) + " erupsi").length * 7.2 + 22, y + 7, "abu " + fmt(x.tinggi) + " m", BATA)[0] : ""}</g></g>`; }).join("");
    const terakhir = E[0];
    Kartu.leg([[WARNA_LV[4], "Awas"], [WARNA_LV[3], "Siaga"], [WARNA_LV[2], "Waspada"], [WARNA_LV[1], "Normal"]]);
    return this.ex(dlm.length ? `${this.hl(fmt(dlm.length) + " erupsi")} tercatat dalam ${jam} jam terakhir di ${fmt(T.length)} gunung; ${this.nm(T[0].nm)} terbanyak` : `Erupsi terakhir tercatat pada ${tglJam(terakhir.waktu)} di ${this.nm(terakhir.gunung)}`, "", "",
      T.length ? `<svg viewBox="0 0 ${U.W} ${T.length * U.rh + 4}" role="img" aria-label="Erupsi per gunung">${g}</svg>` : `<p class="kosong">${esc(terakhir.ket)}</p>`, SUMBER + " (informasi letusan)"); },

  /* 3. perubahan level yang dicatat Centurisk97 tiap kali data diperbarui */
  exPerubahan() {
    /* riwayat permanen (data/perubahan_level.json, tidak dipotong) digabung dengan 90 hari terakhir dari status; kunci gunung-tanggal-dari-ke menghapus ganda */
    const gab = new Map(); [...(this.prb?.baris || []).filter(b => b.jenis === "perubahan").map(b => ({nama: b.gunung, dari: b.dari, ke: b.ke, tgl: b.tanggal})), ...(S.st.perubahan || [])].forEach(p => gab.set([p.nama, p.tgl, p.dari, p.ke].join("|"), p));
    const P = [...gab.values()].filter(p => LEVEL[p.dari] && LEVEL[p.ke]).sort((a, b) => b.tgl.localeCompare(a.tgl)); if (!P.length) return "";
    const p0 = P[0], naik = p0.ke > p0.dari, U = this.uk();
    const g = P.slice(0, 10).map((p, i) => { const y = i * U.rh;
      return `<g><text x="${U.L - 10}" y="${y + 21}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(p.nama)}</text>
        ${this.p(U.L, y + 7, LEVEL[p.dari][1], WARNA_LV[p.dari], FG_LV[p.dari])[0]}<text x="${U.L + 100}" y="${y + 21}" font-size="14" font-weight="700">${p.ke > p.dari ? "↑" : "↓"}</text>
        ${this.p(U.L + 124, y + 7, LEVEL[p.ke][1], WARNA_LV[p.ke], FG_LV[p.ke])[0]}<text x="${U.L + 240}" y="${y + 21}" font-size="12" opacity=".7">${this.tgl(p.tgl + "T12:00:00+07:00")}</text></g>`; }).join("");
    return this.ex(`${this.hl(this.nm(p0.nama))} ${naik ? "naik" : "turun"} dari Level ${LEVEL[p0.dari][0]} ${LEVEL[p0.dari][1]} ke Level ${LEVEL[p0.ke][0]} ${LEVEL[p0.ke][1]} pada ${this.tgl(p0.tgl + "T12:00:00+07:00")}`, "", "",
      `<svg viewBox="0 0 ${U.W} ${Math.min(P.length, 10) * U.rh + 4}" role="img" aria-label="Perubahan level">${g}</svg>`, "Sumber: perbandingan status MAGMA Indonesia (PVMBG) dari pembaruan ke pembaruan"); },

  /* 4. bandara di jalur abu (skenario 72 jam, ambang penerbangan 2 mg/m3) */
  exBandara() {
    const B = (this.abu?.bandara_terdampak || []).filter(b => b.jam_tiba != null); if (!B.length) return "";
    const nmG = id => S.st.gunung.find(g => idGn(g.nama) === id), pilih = this.T.bandara;
    const kol = [{k: "nm", n: "Bandara", v: r => r.nama, h: r => `<b translate="no">${esc(r.nama)}</b>`}, {k: "kd", n: "Kode", v: r => r.iata || r.icao, h: r => `<span translate="no">${esc(r.iata || r.icao)}</span>`},
      {k: "gn", n: "Gunung", v: r => nmG(r.gunung)?.nama || r.gunung, h: r => { const g = nmG(r.gunung); return g ? `<span translate="no">${esc(g.nama)}</span> ${pilLv(g.level, true)}${g.vona ? " " + pilVona(g.vona) : ""}` : esc(r.gunung); }},
      {k: "jam", n: "Abu tiba", num: 1, v: r => r.jam_tiba ?? 99, h: r => r.jam_tiba != null ? `jam ke-${fmt(r.jam_tiba)}` : "–"}];
    const cepat = [...B].sort((a, b) => a.jam_tiba - b.jam_tiba)[0], gn = new Set(B.map(b => b.gunung)).size;
    return this.ex(`${this.hl(fmt(B.length) + " bandara")} berada di jalur abu skenario 72 jam dari ${fmt(gn)} gunung; tercepat ${this.nm(cepat.iata || cepat.icao)} dalam ${this.hl(fmt(cepat.jam_tiba) + " jam")}`, "", "",
      this.tabel("bandara", kol, B, r => `data-gn="${esc(nmG(r.gunung)?.nama || "")}"`, 10, "bandara", r => -r.jam_tiba), "Skenario jika meletus sekarang, bukan prakiraan letusan dan bukan advisory VAAC. Sumber: model abu Centurisk97 (angin ECMWF IFS via Open-Meteo), OurAirports"); },

  /* 5. penduduk di KRB III per gunung */
  exKrb() {
    const P = (this.pap?.gunung || []).filter(g => g.zona_sumber === "KRB PVMBG" && g.zona?.III?.penduduk > 0).map(g => ({...g, nm: S.st.gunung.find(x => idGn(x.nama) === g.id), jiwa: g.zona.III.penduduk}))
      .filter(g => g.nm).sort((a, b) => b.jiwa - a.jiwa); if (!P.length) return "";
    const T = P.slice(0, 10), tot = P.reduce((a, g) => a + g.jiwa, 0), U = this.uk(), mx = T[0].jiwa, X = v => v / mx * (U.W - U.L - 330);
    const g = T.map((x, i) => { const y = i * U.rh, w = Math.max(3, X(x.jiwa)), sek = x.zona.III.sekolah, tip = `<b>${esc(x.nama)}</b><br>KRB III: ${jiwaTxt(x.jiwa)} jiwa<br>${fmt(x.zona.III.desa)} desa, ${fmt(sek)} sekolah, ${fmt(x.zona.III.faskes)} faskes`;
      return `<g><text x="${U.L - 10}" y="${y + 21}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(x.nama)}</text>
        <rect class="gx" x="${U.L}" y="${y + 6}" width="${w}" height="${U.rh - 12}" rx="5" fill="${WARNA_LV[x.nm.level]}" data-tip="${tip}"/>
        <g class="gf">${this.p(U.L + w + 8, y + 7, jiwaTxt(x.jiwa) + " jiwa", WARNA_LV[x.nm.level], FG_LV[x.nm.level])[0]}${sek ? this.p(U.L + w + 8 + (jiwaTxt(x.jiwa) + " jiwa").length * 7.2 + 22, y + 7, fmt(sek) + " sekolah", "#3b82f6")[0] : ""}</g></g>`; }).join("");
    Kartu.leg([[WARNA_LV[4], "Awas"], [WARNA_LV[3], "Siaga"], [WARNA_LV[2], "Waspada"], [WARNA_LV[1], "Normal"]]);
    return this.ex(`Sekitar ${this.hl(jiwaAngka(tot) + " jiwa")} tinggal di KRB III ${fmt(P.length)} gunung api; terbanyak di ${this.nm(P[0].nama)} (${jiwaTxt(P[0].jiwa)} jiwa)`, "", "",
      `<svg viewBox="0 0 ${U.W} ${T.length * U.rh + 4}" role="img" aria-label="Penduduk di KRB III per gunung">${g}</svg>`, "Sumber: KRB PVMBG 2018 (ESDM), perkiraan WorldPop 2026 1 km, OpenStreetMap"); },

  /* 5b. arahan Permen ESDM 15/2011 per KRB untuk level gunung saat ini (data/pedoman_krb.json); hanya gunung Waspada ke atas dengan zona KRB PVMBG (zona proksi tidak disebut KRB). Sistem tidak memerintah. */
  exArahan() {
    const ped = this.ped; if (!ped?.krb) return "";
    const R = [], G = S.st.gunung.filter(g => g.level >= 2).map(g => ({g, pg: (this.pap?.gunung || []).find(x => x.id === idGn(g.nama))})).filter(x => x.pg?.zona_sumber === "KRB PVMBG");
    G.forEach(({g, pg}, gi) => { const tot = ["I", "II", "III"].reduce((a, z) => a + (pg.zona?.[z]?.penduduk || 0), 0);
      ["III", "II", "I"].forEach((z, zi) => { if (ped.krb[z]?.[g.level] && pg.zona?.[z]) R.push({g, z, jiwa: pg.zona[z].penduduk || 0, tk: ped.krb[z][g.level], key: g.level * 1e12 + tot * 1e3 + (99 - gi) * 10 + (3 - zi)}); }); });
    if (!R.length) return "";
    const ng = G.filter(x => R.some(r => r.g === x.g)).length, tot = R.reduce((a, r) => a + r.jiwa, 0);
    const kol = [{k: "gn", n: "Gunung", v: r => r.g.nama, h: r => `<span translate="no">${esc(r.g.nama)}</span> ${pilLv(r.g.level, true)}`}, {k: "zn", n: "KRB", v: r => r.z.length, h: r => pilZona(r.z)},
      {k: "tk", n: "Arahan", t: "Permen ESDM No. 15 Tahun 2011, sebagaimana ditayangkan MAGMA Indonesia", v: r => r.tk, h: r => esc(r.tk)}, {k: "jw", n: "Jiwa", t: "Perkiraan penduduk WorldPop 1 km, bukan sensus", num: 1, v: r => r.jiwa, h: r => r.jiwa > 0 ? jiwaTxt(r.jiwa) : "0"}];
    return this.ex(`${this.hl(fmt(ng) + " gunung")} berstatus Waspada ke atas punya arahan resmi per KRB; sekitar ${this.hl(jiwaAngka(tot) + " jiwa")} tinggal di KRB gunung-gunung itu, dan perintah mengungsi datang dari pemerintah daerah`, "", "",
      this.tabel("arahan", kol, R, r => `data-gn="${esc(r.g.nama)}"`, 9, "arahan", r => r.key), ""); },

  /* 6. izin tambang di zona KRB */
  exTambang() {
    const R = []; (this.pap?.gunung || []).forEach(g => (g.tambang || []).forEach(t => { if (t.zona && WARNA_ZONA[t.zona]) R.push({...t, gn: g.nama, lv: S.st.gunung.find(x => idGn(x.nama) === g.id)?.level}); })); if (!R.length) return "";
    const ZN = {III: 3, II: 2, I: 1}, kol = [{k: "nm", n: "Pemegang izin", v: r => r.nama, h: r => `<b translate="no">${esc(r.nama)}</b>`}, {k: "kom", n: "Komoditas", v: r => r.komoditas || "", h: r => esc(r.komoditas || "–")},
      {k: "gn", n: "Gunung", v: r => r.gn, h: r => `<span translate="no">${esc(r.gn)}</span>`}, {k: "zona", n: "Zona", v: r => ZN[r.zona], h: r => pilZona(r.zona)},
      {k: "keg", n: "Kegiatan", v: r => r.kegiatan || "", h: r => esc(r.kegiatan || "–")}];
    const n3 = R.filter(r => r.zona === "III").length, gn = new Set(R.map(r => r.gn)).size;
    return this.ex(`${this.hl(fmt(R.length) + " izin tambang")} berada di KRB ${fmt(gn)} gunung api, ${this.hl(fmt(n3))} di antaranya di KRB III`, "", "",
      this.tabel("tambang", kol, R, r => `data-gn="${esc(r.gn)}"`, 10, "izin", r => ZN[r.zona] * 1e3 + (r.lv || 0)), "Sumber: WIUP ESDM (badan usaha), KRB PVMBG 2018"); },

  /* 7. kinerja arah abu: kedua angka dengan n jujur; kartu ini tidak disembunyikan walau angkanya sederhana */
  exKinerja() {
    const a = this.abu?.uji_balik, b = this.abu?.uji_balik_tipis; if (!a?.n) return "";
    const R = [[`Berambang (n = ${fmt(a.n)})`, a, "#c9503a"], ...(b?.n ? [[`Tanpa ambang (n = ${fmt(b.n)})`, b, "#e58a45"]] : [])], U = this.uk(), M = U.W < 600, L = U.L + 30, X = v => v / 100 * (U.W - L - (M ? 40 : 520)), pw = t => t.length * 7.2 + 22, rowH = M ? U.rh * 2 + 8 : U.rh + 8;
    const cocok = d => Math.round(d.persen_dalam_45deg * d.n / 100), acak = d => d.acak_persen ?? 25, kecil = d => (d.p_binomial ?? 1) >= .05;
    const rel = (v, ref) => v > ref + 1 ? "di atas" : v < ref - 1 ? "di bawah" : "setara";
    /* pembanding bahasa awam: tebakan acak dan arah angin musiman (klimatologi); bila belum ada, hanya acak */
    const ket = d => { const kl = d.klimatologi_persen, v = d.persen_dalam_45deg, t = `${rel(v, acak(d))} tebakan acak (${fmt(acak(d))}%${kecil(d) ? `, peluang kebetulan sekitar ${dariB(d.p_binomial ?? 1)}` : ""})`;
      return kl != null ? `${t} dan ${rel(v, kl)} arah angin musiman (${fmt(kl)}%)` : t; };
    const g = R.map(([nm, d, w], i) => { const y = i * rowH, x = Math.max(3, X(d.persen_dalam_45deg)), kl = d.klimatologi_persen,
        P = [`${fmt(cocok(d))} dari ${fmt(d.n)} cocok`, "median " + fmt(d.median_selisih_deg) + "°", "acak " + fmt(acak(d)) + "%", ...(kl != null ? ["angin musiman " + fmt(kl) + "%"] : [])], W4 = [w, "#6b7a90", "#8a6d1f", "#2f7d4f"],
        tip = `<b>${nm}</b><br>${fmt(cocok(d))} dari ${fmt(d.n)} kejadian dalam 45° dari laporan PVMBG<br>Median selisih ${fmt(d.median_selisih_deg)}°<br>${ket(d)}`;
      let px = M ? L : L + x + 8; const py = M ? y + U.rh - 2 : y + 7;
      return `<g><text x="${L - 10}" y="${y + 21}" text-anchor="end" font-size="${U.fs}" font-weight="600">${nm}</text><rect class="gx" x="${L}" y="${y + 6}" width="${x}" height="${U.rh - 12}" rx="5" fill="${w}" data-tip="${tip}"/>
        <g class="gf">${P.map((t, q) => { const o = this.p(px, py, t, W4[q])[0]; px += pw(t); return o; }).join("")}</g></g>`; }).join("");
    const H = R.length * rowH + 4, xa = L + X(acak(a));
    const garis = `<line x1="${xa}" x2="${xa}" y1="0" y2="${H - 4}" stroke="currentColor" stroke-dasharray="4 3" opacity=".55"/><text x="${xa}" y="${H + 10}" text-anchor="middle" font-size="11" opacity=".7">acak ${fmt(acak(a))}%</text>`;
    return this.ex(`Arah awan abu skenario cocok dalam 45° dengan laporan PVMBG pada ${this.hl(fmt(cocok(a)) + " dari " + fmt(a.n) + " kejadian")} berambang, ${ket(a)}${b?.n ? `; ${this.hl(fmt(cocok(b)) + " dari " + fmt(b.n))} kejadian tanpa ambang cocok, ${ket(b)}${b.klimatologi_persen != null ? ", tetapi belum terbukti lebih baik dari arah angin musiman" : ""}` : ""}`, "", "",
      `<svg viewBox="0 0 ${U.W} ${H + 16}" role="img" aria-label="Uji balik arah abu">${g}${garis}</svg>`, `Arah angin musiman = tebakan memakai arah angin rata-rata bulan itu. Hanya arah yang bisa diuji (laporan PVMBG 8 mata angin, tanpa jarak); sampel kecil. Uji balik memakai tinggi kolom dari VONA kejadian itu sendiri, bukan tinggi yang tersedia sebelum kejadian. Sumber: VONA PVMBG vs angin ECMWF IFS, ${esc(a.periode || "")}`); },

  /* ---- kartu dari arsip MAGMA 2018-2026 (data/rezim_letusan.json: SNAPSHOT dari data lokal pemilik, tanggal data tertulis di judul). Kartu standar .ex-std tanpa kaki (AGENTS.md 3.5). ---- */
  std: (ey, judul, isi) => `<article class="ex ex-std"><header class="ex-hd"><span class="ex-ey">${ey}</span><div class="ex-jd"><h3>${judul}</h3></div></header><div class="ex-bd">${isi}</div></article>`,
  tabelStd(...a) { return this.tabel(...a).replace('<div class="tw">', '<div class="tw ex-tabel">'); },
  ket: t => `<p style="margin:0;font-size:12.5px;line-height:1.55;opacity:.8;text-align:justify">${t}</p>`,
  pilHip: t => `<span class="pl" style="--w:#8a6d1f" title="${esc(t)}">Hipotesis</span>`,
  d: (v, n = 1) => v.toLocaleString("id-ID", {maximumFractionDigits: n}),
  gabung: a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " dan " + a.at(-1),
  lvG: nm => S.st.gunung.find(g => g.nama === nm)?.level || 1,
  tglArsip(d) { return this.tgl(d + "T12:00:00+07:00"); },
  /* batang mendatar ber-tooltip: rows [{nm, v, w, pil: [[teks, latar, huruf]], tip}] */
  batang(rows, aria) {
    const U = this.uk(), M = U.W < 600, kanan = M ? 150 : 330, mx = Math.max(...rows.map(r => r.v), 1e-9), X = v => v / mx * (U.W - U.L - kanan);
    const g = rows.map((r, i) => { const y = i * U.rh, w = Math.max(3, X(r.v)); let px = U.L + w + 8;
      const ps = r.pil.slice(0, M ? 1 : 9).map(([t, bg, fg]) => { const o = this.p(px, y + 7, t, bg, fg || "#fff")[0]; px += t.length * 7.2 + 22; return o; }).join("");
      return `<g><text x="${U.L - 10}" y="${y + 21}" text-anchor="end" font-size="${U.fs}" font-weight="600">${esc(M && r.nm.length > 15 ? r.nm.slice(0, 14) + "…" : r.nm)}</text>
        <rect class="gx" x="${U.L}" y="${y + 6}" width="${w}" height="${U.rh - 12}" rx="5" fill="${r.w}" data-tip="${r.tip}"/><g class="gf">${ps}</g></g>`; }).join("");
    return `<svg viewBox="0 0 ${U.W} ${rows.length * U.rh + 4}" role="img" aria-label="${aria}">${g}</svg>`; },

  /* 9. rezim letusan per gunung sejak 1 Jan 2024. Sebelum 2024 tidak dibandingkan: lompat 457 ke 6.241 letusan per tahun mengikuti cara mencatat, bukan alam. */
  exRezim() {
    const R = this.rz?.rezim; if (!R?.length) return "";
    const tot = R.reduce((a, r) => a + r.n, 0), dua = Math.round(100 * (R[0].n + (R[1]?.n || 0)) / tot);
    const rows = R.slice(0, 10).map(r => { const lv = this.lvG(r.gunung);
      return {nm: r.gunung, v: r.n, w: WARNA_LV[lv], pil: [[fmt(r.n) + " letusan", WARNA_LV[lv], FG_LV[lv]], ...(r.kolom_median ? [["kolom median " + fmt(r.kolom_median) + " m", BATA]] : [])],
        tip: `<b>${esc(r.gunung)}</b><br>Letusan sejak 1 Jan 2024: ${fmt(r.n)}<br>Hari aktif: ${this.d(r.hari_aktif_pct)}%${r.kolom_median ? `<br>Kolom abu: median ${fmt(r.kolom_median)} m, p90 ${fmt(r.kolom_p90)} m, maks ${fmt(r.kolom_maks)} m (dari ${fmt(r.kolom_n)} letusan yang menyebut tinggi)` : ""}<br>Laju: ${this.d(r.per_hari_90, 2)} per hari (90 hari terakhir) lawan ${this.d(r.per_hari_365_sebelumnya, 2)} (365 hari sebelumnya)`}; });
    const n2 = v => v == null ? "–" : this.d(v, 2), m = v => v ? fmt(v) : "–";
    const kol = [{k: "nm", n: "Gunung", v: r => r.gunung, h: r => `<b translate="no">${esc(r.gunung)}</b> ${pilLv(this.lvG(r.gunung), true)}`},
      {k: "n", n: "Letusan", t: "Jumlah letusan di daftar informasi letusan MAGMA sejak 1 Jan 2024", num: 1, v: r => r.n, h: r => fmt(r.n)},
      {k: "ha", n: "Hari aktif", t: "Persen hari sejak 1 Jan 2024 yang punya sedikitnya satu letusan", num: 1, v: r => r.hari_aktif_pct, h: r => this.d(r.hari_aktif_pct) + "%"},
      {k: "km", n: "Kolom median", t: "Tinggi kolom abu di atas puncak (m), median dari letusan yang menyebut tinggi. Sekitar 63% letusan tidak menyebut tinggi (malam atau berawan), jadi angkanya condong ke letusan yang terlihat", num: 1, v: r => r.kolom_median ?? -1, h: r => m(r.kolom_median)},
      {k: "k9", n: "Kolom p90", t: "Persentil 90 tinggi kolom abu (m): 9 dari 10 letusan yang menyebut tinggi tidak lebih tinggi dari ini", num: 1, v: r => r.kolom_p90 ?? -1, h: r => m(r.kolom_p90)},
      {k: "kx", n: "Kolom maks", t: "Tinggi kolom abu tertinggi di atas puncak (m) sejak 1 Jan 2024", num: 1, v: r => r.kolom_maks ?? -1, h: r => m(r.kolom_maks)},
      {k: "l9", n: "Per hari, 90 hari", t: "Rata-rata letusan per hari dalam 90 hari terakhir arsip", num: 1, v: r => r.per_hari_90, h: r => n2(r.per_hari_90)},
      {k: "l3", n: "Per hari, 365 hari sebelumnya", t: "Rata-rata letusan per hari dalam 365 hari sebelum 90 hari terakhir", num: 1, v: r => r.per_hari_365_sebelumnya, h: r => n2(r.per_hari_365_sebelumnya)}];
    return this.std(this.LABEL.rezim, `Arsip MAGMA per ${this.tglArsip(this.rz.akhir)}: ${this.hl(fmt(tot) + " letusan")} di ${fmt(R.length)} gunung sejak 1 Jan 2024, ${this.hl(dua + "%")} dari ${this.nm(R[0].gunung)} dan ${this.nm(R[1].gunung)}`,
      this.batang(rows, "Letusan per gunung") + this.tabelStd("rezim", kol, R, r => `data-gn="${esc(r.gunung)}"`, 10, "gunung", r => -r.n)
      + this.ket("Snapshot arsip, tidak diperbarui otomatis. Jumlah letusan sebelum 2024 tidak dibandingkan: pencatatan berubah dari sekitar 450 menjadi lebih dari 6.000 letusan per tahun, jadi lompat itu bukan tren alam.")); },

  /* 10. arah abu per musim (kebiasaan dari laporan erupsi, bukan prakiraan angin); musim dengan n < 50 ditandai, tidak disimpulkan */
  SM: {DJF: "Desember sampai Februari", MAM: "Maret sampai Mei", JJA: "Juni sampai Agustus", SON: "September sampai November"},
  exArahabu() {
    const A = this.rz?.arah_musim; if (!A || !Object.keys(A).length) return "";
    const m = [, "DJF", "DJF", "MAM", "MAM", "MAM", "JJA", "JJA", "JJA", "SON", "SON", "SON", "DJF"][+hariWIB(Date.now()).slice(5, 7)], pc = (n, t) => Math.round(100 * n / t);
    const ada = Object.entries(A).filter(([, s]) => s[m]).map(([g, s]) => ({g, s, a: s[m], tot: s[m].at(-1)})).sort((x, y) => y.tot - x.tot); if (!ada.length) return "";
    const rows = ada.map(({g, s, a, tot}) => { const kecil = tot < 50, [a1, a2] = a, tipM = Object.keys(this.SM).filter(k => s[k]).map(k => { const t = s[k].at(-1); return `<br>${k}${k === m ? " (musim ini)" : ""}: ${s[k].slice(0, 2).filter(Array.isArray).map(([ar, n]) => `${ar} ${pc(n, t)}%`).join(", ")} dari ${fmt(t)} penyebutan${t < 50 ? ", n kecil, jangan disimpulkan" : ""}`; }).join("");
      return {nm: g, v: a1[1] / tot, w: kecil ? "#b8c0cc" : "#4f8fc0",
        pil: [...(kecil ? [["n kecil (" + fmt(tot) + "), jangan disimpulkan", "#8a6d1f"]] : []), [a1[0] + " " + pc(a1[1], tot) + "%", "#4f8fc0"], ...(Array.isArray(a2) ? [[a2[0] + " " + pc(a2[1], tot) + "%", "#6b7a90"]] : []), ...(kecil ? [] : [["n = " + fmt(tot), "#9aa4b2"]])],
        tip: `<b>${esc(g)}</b>, arah abu per musim${tipM}`}; });
    const sah = ada.filter(x => x.tot >= 50).slice(0, 3);
    const judul = sah.length ? `Musim ${this.SM[m].toLowerCase()}: abu ${this.gabung(sah.map(x => `${this.hl(this.nm(x.g))} paling sering ke ${x.a[0][0]}`))}` : `Musim ${this.SM[m].toLowerCase()} belum punya gunung dengan arah abu yang cukup untuk disimpulkan (kurang dari 50 penyebutan)`;
    return this.std(this.LABEL.arahabu, judul, this.batang(rows, "Arah abu musim ini") + this.ket("Arah dari laporan erupsi MAGMA (8 mata angin) sejak 1 Jan 2024, gunung dengan sedikitnya 200 penyebutan arah. Persen = bagian dari penyebutan arah pada musim itu; arahkan kursor ke batang untuk keempat musim. Ini kebiasaan, bukan prakiraan angin hari ini.")); },

  /* 11. cakupan VONA: letusan dengan VONA gunung yang sama dalam 30 menit. Selisih antar gunung belum tentu kelalaian (satu VONA bisa mewakili letusan menerus). */
  exCakupan() {
    const C = Object.entries(this.rz?.cakupan_vona || {}).filter(([, c]) => c[1] >= 50).map(([g, [a, n]]) => ({g, a, n, p: 100 * a / n})).sort((x, y) => y.p - x.p); if (C.length < 2) return "";
    const rows = C.map(x => ({nm: x.g, v: x.p, w: "#4f8fc0", pil: [[fmt(Math.round(x.p)) + "%", "#4f8fc0"], [fmt(x.a) + " dari " + fmt(x.n) + " letusan", "#6b7a90"]],
      tip: `<b>${esc(x.g)}</b><br>${fmt(x.a)} dari ${fmt(x.n)} letusan sejak 1 Jan 2024 punya VONA gunung yang sama dalam 30 menit (${this.d(x.p)}%)`})), [a, z] = [C[0], C.at(-1)], all = this.rz.cakupan_vona_semua;
    return this.std(this.LABEL.cakupan, `VONA terbit dalam 30 menit dari ${this.hl(fmt(Math.round(a.p)) + "%")} letusan ${this.nm(a.g)} dan ${this.hl(fmt(Math.round(z.p)) + "%")} letusan ${this.nm(z.g)}; selisih bisa berarti satu VONA mewakili letusan yang berlangsung menerus, bukan kelalaian`,
      this.batang(rows, "Cakupan VONA per gunung") + this.ket(`Letusan dihitung tercakup bila ada VONA gunung yang sama dalam 30 menit sebelum atau sesudahnya. Gunung dengan sedikitnya 50 letusan sejak 1 Jan 2024; seluruh gunung ${fmt(Math.round(100 * all[0] / all[1]))}% (${fmt(all[0])} dari ${fmt(all[1])}). Arsip VONA ${this.tglArsip(this.rz.vona_rentang[0])} sampai ${this.tglArsip(this.rz.vona_rentang[1])}.`)); },

  /* 12. daftar pantau kegempaan: Hipotesis, bukan prediksi. Hitungan dari data/kegempaan.json yang bertambah tiap pembaruan; hasil uji dari arsip. */
  anomali() {
    const kg = this.kg; if (!kg?.gunung) return null;
    const VT = ["harmonik", "tremor_non_harmonik", "low_frequency", "hybrid", "vulkanik_dangkal", "vulkanik_dalam"], idx = kg.jenis.map((j, i) => VT.includes(j.k) ? i : -1).filter(i => i >= 0), out = [];
    for (const [nm, o] of Object.entries(kg.gunung)) {
      const hs = Object.keys(o.hari).sort().slice(0, -1); if (hs.length < 60) continue;   /* hari terakhir belum penuh */
      const v = hs.map(h => idx.reduce((a, i) => a + (o.hari[h][i] || 0), 0)), w = []; for (let i = 6; i < v.length; i++) { let s = 0; for (let j = i - 6; j <= i; j++) s += v[j]; w.push(s); }
      const now = w.at(-1), dulu = w.slice(0, -7); if (!dulu.length) continue;
      const mean = dulu.reduce((a, b) => a + b, 0) / dulu.length, rs = (now + 1) / (mean + 1), pct = dulu.filter(a => a < now).length / dulu.length;
      if (now >= 10 && rs >= 1.5 && pct >= .9) out.push({nm, now, mean, rs, pct: Math.round(pct * 100)});
    }
    return out.sort((a, b) => b.rs - a.rs); },
  exPantau() {
    const A = this.anomali(), U = this.rz?.uji_kegempaan; if (!A || !U) return "";
    const [a, na] = U.alarm, [t, nt] = U.tenang, pa = this.d(100 * a / na), pt = this.d(100 * t / nt);
    const uji = `Hasil uji balik pada gunung yang sedang tidak meletus: ${fmt(a)} dari ${fmt(na)} hari alarm diikuti letusan dalam 7 hari (${pa}%) lawan ${fmt(t)} dari ${fmt(nt)} hari tenang (${pt}%). Selisihnya kecil dan jendela riwayat kegempaan baru 90 hari, jadi daftar ini bukan prediksi letusan.`;
    const kol = [{k: "nm", n: "Gunung", v: r => r.nm, h: r => `<b translate="no">${esc(r.nm)}</b>`}, {k: "lv", n: "Level", t: "Level resmi PVMBG saat ini", v: r => this.lvG(r.nm), h: r => pilLv(this.lvG(r.nm), true)},
      {k: "nw", n: "7 hari terakhir", t: "Jumlah gempa vulkanik (harmonik, tremor non-harmonik, low frequency, hybrid, vulkanik dangkal, vulkanik dalam) dalam 7 hari terakhir tanpa hari berjalan", num: 1, v: r => r.now, h: r => fmt(r.now)},
      {k: "mn", n: "Rata-rata 7 hari", t: "Rata-rata jumlah gempa vulkanik per jendela 7 hari pada riwayat gunung itu sendiri", num: 1, v: r => r.mean, h: r => this.d(r.mean)},
      {k: "rs", n: "Kelipatan", t: "7 hari terakhir dibagi rata-rata riwayatnya sendiri (masing-masing ditambah 1)", num: 1, v: r => r.rs, h: r => this.d(r.rs) + " kali"},
      {k: "pc", n: "Persentil", t: "Persen jendela 7 hari riwayatnya yang lebih rendah dari 7 hari terakhir", num: 1, v: r => r.pct, h: r => fmt(r.pct)}];
    const judul = A.length ? `${this.hl(fmt(A.length) + " gunung")} punya gempa vulkanik 7 hari terakhir jauh di atas kebiasaannya sendiri; ${this.hl(this.nm(A[0].nm))} tertinggi, ${this.hl(this.d(A[0].rs) + " kali")} rata-ratanya` : `Tidak ada gunung yang gempa vulkaniknya 7 hari terakhir memenuhi ketiga syarat daftar pantau`;
    return this.std(this.LABEL.pantau, judul, `<div class="ex-pl">${this.pilHip(uji)}</div>` + (A.length ? this.tabelStd("pantau", kol, A, r => `data-gn="${esc(r.nm)}"`, 10, "gunung", r => -r.rs) : "")
      + this.ket("Syarat masuk daftar: gempa vulkanik 7 hari terakhir sedikitnya 10, sedikitnya 1,5 kali rata-rata 7 harinya sendiri, dan di atas persentil 90 riwayatnya. " + uji)); },

  /* 13. paparan KRB lawan aktivitas: gunung berpenduduk besar di KRB III dan II, level terkini, dan rezim letusannya */
  exPaparan() {
    const Z = this.rz?.rezim; if (!Z || !this.pap?.gunung) return "";
    const P = this.pap.gunung.filter(g => g.zona_sumber === "KRB PVMBG").map(g => { const z = g.zona || {}, r = Z.find(x => x.gunung === g.nama), s = S.st.gunung.find(x => idGn(x.nama) === g.id);
      return s && {nm: g.nama, lv: s.level, j3: z.III?.penduduk || 0, jw: (z.III?.penduduk || 0) + (z.II?.penduduk || 0), n: r?.n || 0, l9: r?.per_hari_90 || 0}; }).filter(Boolean).sort((a, b) => b.jw - a.jw).slice(0, 15); if (P.length < 3) return "";
    const sepi = P.slice(0, 8).filter(x => x.lv === 1 && x.n <= 5).slice(0, 3);
    const kol = [{k: "nm", n: "Gunung", v: r => r.nm, h: r => `<b translate="no">${esc(r.nm)}</b>`}, {k: "lv", n: "Level", t: "Level resmi PVMBG saat ini", v: r => r.lv, h: r => pilLv(r.lv, true)},
      {k: "jw", n: "Jiwa KRB III dan II", t: "Perkiraan penduduk (WorldPop 1 km, bukan sensus) di Kawasan Rawan Bencana III dan II PVMBG", num: 1, v: r => r.jw, h: r => jiwaTxt(r.jw)},
      {k: "j3", n: "Jiwa KRB III", t: "Perkiraan penduduk di KRB III saja", num: 1, v: r => r.j3, h: r => r.j3 > 0 ? jiwaTxt(r.j3) : "0"},
      {k: "n", n: "Letusan sejak 2024", t: "Jumlah letusan di daftar informasi letusan MAGMA sejak 1 Jan 2024; guguran atau aktivitas tanpa letusan tidak terhitung", num: 1, v: r => r.n, h: r => fmt(r.n)},
      {k: "l9", n: "Per hari, 90 hari", t: "Rata-rata letusan per hari dalam 90 hari terakhir arsip", num: 1, v: r => r.l9, h: r => this.d(r.l9, 2)}];
    const judul = sepi.length >= 2 ? `${this.gabung(sepi.map(x => this.hl(this.nm(x.nm))))} berstatus Normal (Level I) dan nyaris tanpa letusan sejak 2024, padahal ${this.hl(jiwaTxt(sepi.reduce((a, x) => a + x.jw, 0)) + " jiwa")} tinggal di KRB III dan II-nya` : `${this.hl(this.nm(P[0].nm))} berpenduduk KRB III dan II terbesar (${this.hl(jiwaTxt(P[0].jw) + " jiwa")}), ${fmt(P[0].n)} letusan sejak 2024`;
    return this.std(this.LABEL.paparan, judul, this.tabelStd("paparan", kol, P, r => `data-gn="${esc(r.nm)}"`, 10, "gunung", r => -r.jw) + this.ket("Level I Normal bukan jaminan tanpa bahaya; ikuti rekomendasi PVMBG dan BPBD. Penduduk perkiraan WorldPop 1 km. Letusan dari daftar informasi letusan MAGMA, snapshot arsip " + this.tglArsip(this.rz.akhir) + ".")); },

  /* 8. tabel standar. Penduduk dalam radius pindah ke tab Dampak (Insight karhutla tidak memuatnya) */
  /* peluang abu di bandara/kota (../banjir/data/abu_peluang.json, kontrak peluang/1; mesin public/inti/peluang.js). Wilayah awal = pasangan gunung-titik
     yang paling mungkin tertimpa abu. Tanpa mesin atau berkas = dibuang. SKENARIO "jika meletus sekarang", bukan ramalan letusan. */
  exPeluang() {
    const d = this.pel; if (typeof Peluang === "undefined" || !d) return "";
    if (!this.st.pelW) { const skor = w => (w.hari || []).reduce((a, h) => a + (h.p || []).reduce((x, y) => x + (y || 0), 0), 0);
      this.st.pelW = Object.keys(d.wilayah).sort((a, b) => skor(d.wilayah[b]) - skor(d.wilayah[a]) || (d.wilayah[b].jenis === "bandara") - (d.wilayah[a].jenis === "bandara"))[0]; }
    return Peluang.kartu(d, {ey: this.LABEL.peluang, st: this.st, kunci: "pel", kejadian: "abu gunung api", sumber: "Skenario jika meletus sekarang, bukan prakiraan letusan atau advisory VAAC (Open-Meteo, MAGMA PVMBG)"}); },
  exDaftar() {
    const G = S.st.gunung, kol = [{k: "nm", n: "Gunung", v: r => r.nama, h: r => `<b>${esc(r.nama)}</b>`}, {k: "pv", n: "Provinsi", v: r => r.prov, h: r => esc(r.prov)},
      {k: "lv", n: "Level", v: r => r.level, h: r => pilLv(r.level, true)},
      {k: "rd", n: "Radius", num: 1, v: r => r.radius_km ?? -1, h: r => r.radius_km ? fmt(r.radius_km) + " km" : "–"},
      {k: "pd", n: "Jiwa dalam radius", num: 1, v: r => r.penduduk_radius ?? -1, h: r => r.penduduk_radius > 0 ? jiwaTxt(r.penduduk_radius) : "–"},
      {k: "tg", n: "Tinggi puncak", num: 1, v: r => r.tinggi ?? -1, h: r => r.tinggi > 0 ? fmt(r.tinggi) + " m" : "–"}];
    return this.ex(`${this.hl(fmt(G.length) + " gunung api")} dipantau PVMBG, ${fmt(S.n[2] + S.n[3] + S.n[4])} di atas Level I`, "", "",
      this.tabel("daftar", kol, G, r => `data-gn="${esc(r.nama)}"`, 10, "gunung", r => this.skor(r) + (r.penduduk_radius || 0) / 1e9), SUMBER); },

  /* tabel standar inti: kepala gelap, kolom bisa diurut, paginasi */
  tabel(id, kol, baris, atribut, per, satuan, awal) {
    const st = this.T[id], s = st.turun ? -1 : 1, kk = kol.find(c => c.k === st.urut), f = kk ? kk.v : awal;
    const R = [...baris].sort((a, b) => { const x = f(a), y = f(b); return (typeof x === "string" ? x.localeCompare(y) : x - y) * s; });
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(R.length / per) - 1));
    const hal = R.slice(st.hal * per, (st.hal + 1) * per);
    return `<div class="tw"><table><thead><tr>${kol.map(c => `<th${c.t ? ` title="${esc(c.t)}"` : ""} class="${c.num ? "n" : ""}" aria-sort="${c === kk ? (st.turun ? "descending" : "ascending") : "none"}"><button data-k="${c.k}">${c.n}<i>${c === kk ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>
      <tbody>${hal.map(r => `<tr class="klik" ${atribut(r)}>${kol.map(c => `<td${c.num ? ' class="n"' : ""}>${c.h(r)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${kol.length}" class="kosong">Tidak ada data.</td></tr>`}</tbody></table></div>${paginasi(st.hal, R.length, per, satuan)}`; },

  gambar(id) { const f = this["ex" + id[0].toUpperCase() + id.slice(1)]; Kartu._leg = null;
    try { return f.call(this).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${this.LABEL[id] || ""}</span>`); } catch (e) { console.error(e); return ""; } },
  pasangUrut(box) { const th = box.querySelector("thead"), st = this.T[box.dataset.ex]; if (th && st) pengurutKepala(st, th, () => this.ulang(box)); },
  ulang(box) { nanti(() => { box.innerHTML = this.gambar(box.dataset.ex); this.pasangUrut(box); }); },
  render() {
    const el = $("#insight"); if (el._siap) return; el._siap = 1;
    el.innerHTML = this.EX.map(id => `<div data-ex="${id}">${this.LAMBAT.includes(id) ? "" : this.gambar(id)}</div>`).join("");
    /* berkas turunan: digambar sesudah tiba; kartu tanpa data dibuang */
    Promise.all([Data.abu(), Data.pap(), typeof Peluang === "undefined" ? null : Peluang.muat("../banjir/data/abu_peluang.json"), Data.fs(), Data.risiko(), Data.dampak(), Data.ped(), Data.rezim(), Data.keg(), Data.pl()]).then(([a, p, pl, fs, rk, dm, ped, rz, kg, perub]) => { this.rz = rz; this.kg = kg; this.prb = perub; this.abu = a; this.pap = p; this.ped = ped; this.pel = pl; this.cr = {fs, rk, dm};
      this.LAMBAT.forEach(id => { const box = el.querySelector(`[data-ex="${id}"]`); if (!box) return; const h = this.gambar(id); if (h) { box.innerHTML = h; this.pasangUrut(box); } else box.remove(); }); });
    el.querySelectorAll("[data-ex]").forEach(b => this.pasangUrut(b));
    el.onchange = e => { const s = e.target.closest("select[data-set]"); if (s) { this.st[s.dataset.set] = s.value; this.ulang(s.closest("[data-ex]")); } };
    el.onclick = e => {
      const s = e.target.closest("[data-set]:not(select)"); if (s) { this.st[s.dataset.set] = s.dataset.v; s.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === s)); return this.ulang(s.closest("[data-ex]")); }
      const pg = e.target.closest(".pgn-b[data-h]"); if (pg) { if (!pg.disabled) { const box = pg.closest("[data-ex]"); this.T[box.dataset.ex].hal = +pg.dataset.h; box.querySelectorAll(".pgn-b[data-h]").forEach(x => { const on = x === pg; if (!x.textContent.match(/[‹›]/)) { x.classList.toggle("on", on); on ? x.setAttribute("aria-current", "page") : x.removeAttribute("aria-current"); } }); this.ulang(box); } return; }
      const gn = e.target.closest("[data-gn]"); if (gn) { const g = S.st.gunung.find(x => x.nama === gn.dataset.gn); if (g) { bukaTab("peta"); nanti(() => { Peta.terbang(g); Detail.buka(g); }); } } };
  },
};
Cerita.daftar("gunungapi", () => Insight.dataCerita());
