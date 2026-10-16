"use strict";
/* ================================================================ keputusan (banjir) */
/* Model satu musim hujan per provinsi, meniru tab Keputusan Posko Karhutla.
   Dampak dasar: kejadian banjir + bandang + rob BNPB/DIBI per tahun (kejadian.json, tahun penuh s.d. 2025). Simulasi mengundi satu
   tahun historis (bootstrap), jadi tahun berat seperti Aceh 2025 ikut terbawa apa adanya. Parameter [tengah, rendah, tinggi] dari
   param_banjir.json ditambah PAR_B (asumsi halaman ini), diundi dengan sebaran segitiga.
   Uang:  rumah rusak x campuran dana stimulan (+ huntara untuk rusak berat) = biaya pemulihan rumah, BUKAN nilai ekonomi rumah;
          pengungsi x hari mengungsi x biaya per orang per hari;
          meninggal x nilai nyawa statistik = PILIHAN KEBIJAKAN, baris terpisah, bisa dinolkan.
   Tidak dihitung (manfaat cenderung terlalu rendah): isi rumah, usaha, infrastruktur, kesehatan, longsor.
   B: k kabupaten prioritas (terbanyak kejadian) mendapat sirene+AWLR, posko lapangan siaga, latihan evakuasi.
      nyawa dihindari = cakupan x (meninggal banjir & rob x ews_kurangi_kematian + meninggal bandang x ef_ews_bandang)
      hari-pengungsi dihindari = cakupan x pengungsi x hari x ews_kurangi_hari_mengungsi (tengah 0)
   C: B + pompa mobile, perawatan drainase & pintu air, sarana rob di kota/pesisir sasaran:
      rumah rusak & hari-pengungsi di sasaran x ef_pompa_drainase
   D: B + set perahu & tim SAR siaga + logistik pengungsi 3 hari pra-posisi: sisa kematian di cakupan x ef_sar_kematian
   Biaya per tahun: alat x faktor anuitas (bunga, umur) + operasional. */
const rp = v => v < 0 ? "−" + rp(-v) : "Rp" + (v >= 1e12 ? fmt(Math.round(v / 1e11) / 10) + " T" : v >= 1e9 ? fmt(Math.round(v / 1e8) / 10) + " M" : v >= 1e6 ? fmt(Math.round(v / 1e5) / 10) + " jt" : fmt(Math.round(v)));
const rpc = v => `<span class="rp"><i>${v < 0 ? "−Rp" : "Rp"}</i><span>${rp(Math.abs(v)).slice(2)}</span></span>`;
const anuitas = (i, n) => i / (1 - (1 + i) ** -n);
const normal = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
function gamma(a) { if (a < 1) return gamma(a + 1) * Math.random() ** (1 / a);
  const d = a - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) { let x, v; do { x = normal(); v = 1 + c * x; } while (v <= 0); v = v * v * v; const u = Math.random();
    if (Math.log(u) < .5 * x * x + d - d * v + d * Math.log(v)) return d * v; } }
const persentil = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(p * (s.length - 1))]; };
const tautan = s => esc(s).replace(/https?:\/\/[^\s;,)]+/g, u => `<a href="${u}" target="_blank" rel="noopener">tautan</a>`);
const OPSI_B = [["A", "Respons seperti biasa", "Tanggap darurat setelah banjir terjadi, tanpa tambahan", 1],
  ["B", "Peringatan dini & posko siaga", "Sirene + alat ukur tinggi air (AWLR), posko lapangan siaga, latihan evakuasi di kabupaten prioritas", .35],
  ["C", "B + pompa & drainase", "B ditambah pompa mobile, perawatan saluran dan pintu air, sarana rob di kota dan pesisir", .2],
  ["D", "B + kesiapan SAR & logistik", "B ditambah perahu dan tim SAR siaga, logistik pengungsi 3 hari disiapkan sebelum musim", .2]];
/* asumsi halaman ini, format sama dengan param_banjir.json: [tengah, rendah, tinggi, satuan, sumber, catatan] */
const PAR_B = {
  ef_ews_bandang: [.1, 0, .3, "porsi kematian banjir bandang yang dihindari", "ASUMSI: RISET-PARAMETER.md butir 1 (bandang lead time menit sampai 1–3 jam, pakai rendah)", "lemah: tidak ada studi"],
  ef_pompa_drainase: [.15, 0, .43, "porsi rumah rusak & hari-pengungsi dihindari di kota/pesisir sasaran", "ASUMSI; batas atas = genangan Kota Pekalongan turun 43% 2020→2022 (tanggul + pompa + drainase sekaligus)", "lemah: efek pompa dan drainase saja belum pernah diukur"],
  ef_sar_kematian: [.1, 0, .25, "porsi sisa kematian dihindari oleh SAR siaga", "ASUMSI", "lemah: tidak ada data waktu respons SAR banjir"],
  harga_sirene: [150e6, 75e6, 300e6, "Rp/titik", "harga 'Sirene EWS banjir + AWLR (paket per titik)' di param_banjir (estimasi; SoW Mercy Corps tanpa nilai)", "lemah: belum ada HPS/e-katalog"],
  harga_pompa_mobile: [600e6, 300e6, 1.2e9, "Rp/unit", "harga 'Pompa mobile 250 L/detik (trailer diesel)' di param_banjir (estimasi kasar)", "lemah: cari HPS LPSE"],
  umur_ews: [8, 5, 12, "tahun", "ASUMSI (sirene, AWLR, panel surya; baterai lebih cepat)", "lemah"],
  om_ews: [.1, .05, .2, "porsi harga per tahun", "ASUMSI: perawatan, pulsa data, ganti baterai", "lemah"],
  biaya_latihan_kab: [75e6, 25e6, 150e6, "Rp/kabupaten/tahun", "ASUMSI: sosialisasi + 2 simulasi evakuasi per kabupaten", "lemah"],
  drainase_kab: [1e9, 5e8, 3e9, "Rp/kota/tahun", "ASUMSI: normalisasi saluran dan perawatan pintu air (swakelola)", "lemah"],
  l_pompa_mobile_jam: [25, 15, 40, "L solar/jam", "ASUMSI: mesin diesel ±100 kW", "lemah"],
  jam_pompa_tahun: [240, 100, 500, "jam operasi/tahun", "ASUMSI", "lemah"],
  simpan_logistik: [.3, .15, .5, "porsi nilai stok per tahun", "ASUMSI: rotasi dan kedaluwarsa logistik pra-posisi", "lemah"],
};
/* jumlah orang & alat per kabupaten: pilihan desain, bukan ketidakpastian */
const DESAIN_B = {posko: 6, sar: 8, pompa: 2, setSar: 2, hariStok: 3};
const NM_B = {D: "Dampak tahunan (tahun yang terjadi)", ews_kurangi_kematian: "Efek peringatan dini pada kematian", ef_ews_bandang: "Efek peringatan dini pada kematian bandang",
  ews_kurangi_hari_mengungsi: "Efek peringatan dini pada lama mengungsi", ef_pompa_drainase: "Efek pompa & drainase", ef_sar_kematian: "Efek SAR siaga pada kematian",
  hari_mengungsi: "Lama mengungsi", biaya_pengungsi_hari: "Biaya pengungsi per orang per hari", porsi_rumah_rb: "Porsi rumah rusak berat", porsi_rumah_rs: "Porsi rumah rusak sedang",
  stimulan_rumah_rb: "Stimulan rumah rusak berat", stimulan_rumah_rs: "Stimulan rumah rusak sedang", stimulan_rumah_rr: "Stimulan rumah rusak ringan", huntara_per_rumah: "Huntara per rumah rusak berat",
  nilai_nyawa_statistik: "Nilai nyawa statistik", harga_sirene: "Harga sirene + AWLR", harga_pompa_mobile: "Harga pompa mobile", umur_ews: "Umur sirene & AWLR", om_ews: "Perawatan sirene per tahun",
  biaya_latihan_kab: "Biaya latihan evakuasi", drainase_kab: "Perawatan drainase per kota", l_pompa_mobile_jam: "Solar pompa per jam", jam_pompa_tahun: "Jam operasi pompa", simpan_logistik: "Biaya simpan logistik",
  konsumsi_petugas: "Konsumsi petugas", uh_dalam_kota: "Uang harian petugas", bbm_solar: "Harga solar", bunga: "Tingkat diskonto", umur_alat: "Umur alat"};
const PAKAI_B = Object.keys(NM_B).filter(k => k !== "D");
const Keputusan = {
  d: null, kj: null, prov: "32", tahun: "harapan", k: 5, ews: 3, hari: 90, nyawa: "tengah", n: 2000, pagu: null,
  bobot: {bersih: 40, nyawa: 30, bukti: 30},
  JENIS: ["banjir", "bandang", "rob"], AKHIR: 2025,
  par(k, mode, acak) {
    const v = this.d.param[k] || PAR_B[k], [t, r, ti] = v;
    if (k === "nilai_nyawa_statistik") return {nol: 0, rendah: r, tengah: t, tinggi: ti}[this.nyawa]; /* pilihan kebijakan, bukan ketidakpastian */
    if (!acak) return mode === "rendah" ? r : mode === "tinggi" ? ti : t;
    /* sebaran segitiga (rendah, tengah, tinggi) */
    const u = Math.random(), c = (t - r) / ((ti - r) || 1);
    return ti === r ? t : u < c ? r + Math.sqrt(u * (ti - r) * (t - r)) : ti - Math.sqrt((1 - u) * (ti - r) * (ti - t)); },
  /* riwayat satu provinsi: dampak per tahun, kejadian per kabupaten, kabupaten prioritas & sasaran C */
  siap(kode) {
    const p = this.kj.prov[kode] || {}, J = this.JENIS, ada = J.flatMap(j => Object.keys(p[j] || {})).map(Number).filter(y => y <= this.AKHIR);
    const awal = ada.length ? Math.min(...ada) : this.AKHIR, th = [];
    for (let y = awal; y <= this.AKHIR; y++) { const g = (j, f) => p[j]?.[y]?.[f] || 0, s = f => J.reduce((a, j) => a + g(j, f), 0);
      th.push({th: y, mB: g("banjir", "meninggal") + g("rob", "meninggal"), mD: g("bandang", "meninggal"), u: s("mengungsi"), t: s("terdampak"), r: s("rumah_rusak"), k: s("kejadian")}); }
    const kab = Object.entries(this.kj.kab).filter(([k]) => k.startsWith(kode + "|")).map(([k, v]) => {
      const n = j => Object.entries(v[j] || {}).reduce((a, [y, x]) => a + (+y <= this.AKHIR ? x : 0), 0), nama = k.split("|")[1];
      return {nama, n: J.reduce((a, j) => a + n(j), 0), rob: n("rob"), kota: /^Kota/.test(nama)}; }).filter(x => x.n > 0).sort((a, b) => b.n - a.n);
    const tot = kab.reduce((a, x) => a + x.n, 0) || 1, prior = kab.slice(0, this.k), sasaran = kab.filter(x => x.kota || x.rob > 0).slice(0, this.k);
    const rasio = th.filter(y => y.k > 0).map(y => y.u / y.k);
    return {kode, nama: namaProv(kode), th, kab, prior, sasaran, cakupan: prior.reduce((a, x) => a + x.n, 0) / tot, cakupanC: sasaran.reduce((a, x) => a + x.n, 0) / tot,
      uPerK: th.reduce((a, y) => a + y.u, 0) / Math.max(1, th.reduce((a, y) => a + y.k, 0)), rasio}; },
  /* biaya per tahun (Rp) dari dampak tahun itu, parameter tengah: dipakai untuk mengurutkan tahun berat */
  rugi(Y, q) { const rb = q("porsi_rumah_rb"), rs = q("porsi_rumah_rs");
    const r1 = rb * (q("stimulan_rumah_rb") + q("huntara_per_rumah")) + rs * q("stimulan_rumah_rs") + Math.max(0, 1 - rb - rs) * q("stimulan_rumah_rr");
    return {r1, rumah: Y.r * r1, ungsi: Y.u * q("hari_mengungsi") * q("biaya_pengungsi_hari"), nyawa: (Y.mB + Y.mD) * q("nilai_nyawa_statistik")}; },
  tahunPakai(P) {
    const q = k => this.par(k, "tengah"), skor = y => { const r = this.rugi(y, k => k === "nilai_nyawa_statistik" ? this.d.param[k][0] : q(k)); return r.rumah + r.ungsi + r.nyawa; };
    const urut = [...P.th].sort((a, b) => skor(b) - skor(a)), berat = urut.slice(0, 3).map(y => y.th);
    return {harapan: P.th, biasa: P.th.length > 6 ? P.th.filter(y => !berat.includes(y.th)) : P.th, berat: P.th.filter(y => berat.includes(y.th)),
      2025: P.th.filter(y => y.th === 2025)}[this.tahun] || P.th; },
  rata(ys, f = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)) { return Object.fromEntries(["mB", "mD", "u", "t", "r", "k"].map(v => [v, f(ys.map(y => y[v]))])); },
  sarana(grup) { return grup.reduce((a, [nama, , n]) => a + n * (this.d.harga[nama]?.[0] || 0), 0); },
  hitung(P, q, Y) {
    const g = this.rugi(Y, q), hariU = q("hari_mengungsi"), cU = q("biaya_pengungsi_hari"), vsl = q("nilai_nyawa_statistik");
    const crf = anuitas(q("bunga"), q("umur_alat")), crfE = anuitas(q("bunga"), q("umur_ews")), oh = q("konsumsi_petugas") + q("uh_dalam_kota");
    const k = P.prior.length, kc = P.sasaran.length, cak = P.cakupan, M = Y.mB + Y.mD, D = DESAIN_B, A = this.alat;
    const bB = k * (this.ews * q("harga_sirene") * (crfE + q("om_ews")) + A.posko * crf + D.posko * this.hari * oh + q("biaya_latihan_kab"));
    const nB = cak * (Y.mB * q("ews_kurangi_kematian") + Y.mD * q("ef_ews_bandang")), hB = cak * Y.u * hariU * q("ews_kurangi_hari_mengungsi");
    const ef = q("ef_pompa_drainase");
    const bC = bB + kc * (D.pompa * q("harga_pompa_mobile") * crf + D.pompa * q("l_pompa_mobile_jam") * q("jam_pompa_tahun") * q("bbm_solar") + q("drainase_kab") + A.rob * crf);
    const rC = P.cakupanC * Y.r * ef, hC = hB + P.cakupanC * Y.u * hariU * (1 - q("ews_kurangi_hari_mengungsi")) * ef;
    const nD = nB + q("ef_sar_kematian") * Math.max(0, cak * M - nB);
    const bD = bB + k * (D.setSar * A.evak * crf + D.sar * this.hari * oh + P.uPerK * D.hariStok * cU * q("simpan_logistik"));
    this._g = g;
    return [[0, 0, 0, 0], [bB, nB, hB, 0], [bC, nB, hC, rC], [bD, nD, hB, 0]].map(([b, n, h, r]) => { const uang = h * cU + r * g.r1, mn = n * vsl;
      return {biaya: b, nyawa: n, hariU: h, rumah: r, uang, mNyawa: mn, manfaat: uang + mn, bersih: uang + mn - b, bersihUang: uang - b}; }); },
  simulasi(P, ys) {
    const hasil = OPSI_B.map(() => []), rank = OPSI_B.map(() => OPSI_B.map(() => 0)), inkr = [[], [], [], []], inkr0 = [[], [], [], []];
    for (let i = 0; i < this.n; i++) {
      const cache = {}, Y = ys[Math.floor(Math.random() * ys.length)], r = this.hitung(P, k => cache[k] ??= this.par(k, null, true), Y);
      r.forEach((x, j) => hasil[j].push(x.bersih));
      [[inkr, "bersih"], [inkr0, "bersihUang"]].forEach(([a, f]) => { a[1].push(r[1][f]); a[2].push(r[2][f] - r[1][f]); a[3].push(r[3][f] - r[1][f]); });
      /* SMAA: bobot ~ Dirichlet(20 x bobot pilihan), lewat sampel Gamma */
      const w = Object.fromEntries(Object.entries(this.bobot).map(([k, v]) => [k, gamma(Math.max(.05, 20 * v / 100))]));
      const sk = this.skor(r, w); [...sk.keys()].sort((a, b) => sk[b] - sk[a]).forEach((j, pos) => rank[j][pos]++);
    }
    const pos = a => a.length ? a.filter(x => x > 0).length / this.n : 0;
    return {p10: hasil.map(a => persentil(a, .1)), p90: hasil.map(a => persentil(a, .9)), positif: hasil.map(pos), rank: rank.map(r => r.map(x => x / this.n)),
      inkrPos: inkr.map(pos), inkrPos0: inkr0.map(pos), inkrP10: inkr.map(a => a.length ? persentil(a, .1) : 0), inkrP90: inkr.map(a => a.length ? persentil(a, .9) : 0)}; },
  /* tiga kriteria yang tidak saling turunan: manfaat bersih TANPA nilai nyawa (uang), nyawa terselamatkan (jiwa), kekuatan bukti */
  skor(r, w = this.bobot) {
    const kr = {bersih: r.map(x => x.bersihUang), nyawa: r.map(x => x.nyawa), bukti: OPSI_B.map(o => o[3])};
    const tot = Object.values(w).reduce((a, b) => a + b, 0) || 1;
    return OPSI_B.map((_, j) => Object.entries(kr).reduce((a, [k, v]) => { const mn = Math.min(...v), mx = Math.max(...v); return a + (w[k] || 0) / tot * (mx > mn ? (v[j] - mn) / (mx - mn) : 1); }, 0)); },
  lemah(k) { if (k === "D") return false; const v = this.d.param[k] || PAR_B[k]; return !!PAR_B[k] || /^(lemah|PILIHAN)/.test(v[5] || "") || /^(ASUMSI|TURUNAN)/.test(v[4] || ""); },
  /* hitung satu provinsi tanpa render (dipakai juga untuk perbandingan antarprovinsi) */
  nilai(kode) {
    const P = this.siap(kode), ys = this.tahunPakai(P), Y = this.rata(ys), q = k => this.par(k, "tengah");
    const tengah = this.hitung(P, q, Y), mc = this.simulasi(P, ys);
    const pakaiB = mc.inkrPos[1] >= .7, pakaiC = pakaiB && mc.inkrPos[2] >= .7, pakaiD = pakaiB && mc.inkrPos[3] >= .7;
    const terbaik = !pakaiB ? 0 : pakaiD && (!pakaiC || tengah[3].bersih - tengah[1].bersih >= tengah[2].bersih - tengah[1].bersih) ? 3 : pakaiC ? 2 : 1;
    return {P, ys, Y, tengah, mc, pakaiB, pakaiC, pakaiD, terbaik}; },
  async render() {
    const el = $("#keputusan");
    if (!this.d) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat model…</div>`;
      try { [this.d, this.kj] = await Promise.all([muatJSON("data/param_banjir.json"), S.kejadian || muatJSON("data/kejadian.json")]); }
      catch (e) { el.innerHTML = `<div class="kosong">Data keputusan belum tersedia.</div>`; return; }
      const sr = this.d.sarana, grup = (t, n) => (sr[t].find(g => g[0] === n) || [, []])[1];
      this.alat = {posko: this.sarana(grup("lapangan", "Posko")), evak: this.sarana(grup("lapangan", "Evakuasi air")), rob: this.sarana(sr.rob[0][1].filter(x => !/^Sirene/.test(x[0])))}; }
    const kode = this.prov, {P, ys, Y, tengah, mc, pakaiB, pakaiC, pakaiD, terbaik} = this.nilai(kode), sk = this.skor(tengah), q = k => this.par(k, "tengah");
    const g0 = this.rugi(Y, q), pr = this.d.param, prm = k => pr[k] || PAR_B[k];
    const pagu = this.pagu ?? Math.ceil(tengah[1].biaya * 1.2 / 1e8) * 1e8;
    const muat = OPSI_B.map((_, j) => j).filter(j => tengah[j].biaya <= pagu).sort((a, b) => sk[b] - sk[a])[0];
    /* sensitivitas: parameter mana yang paling menggeser manfaat bersih opsi terbaik (atau B bila A terbaik) */
    const acuan = terbaik || 1, bt = tengah[acuan].bersih;
    const Yr = this.rata(ys, a => persentil(a, .1)), Yt = this.rata(ys, a => persentil(a, .9));
    const sens = ["D", ...PAKAI_B].map(k => { const f = m => k === "D" ? this.hitung(P, q, m === "rendah" ? Yr : Yt)[acuan].bersih : this.hitung(P, kk => this.par(kk, kk === k ? m : "tengah"), Y)[acuan].bersih;
      return [k, f("rendah"), f("tinggi")]; }).filter(x => Math.abs(x[2] - x[1]) > 0).sort((a, b) => Math.abs(b[2] - b[1]) - Math.abs(a[2] - a[1])).slice(0, 8);
    const sMax = Math.max(1, ...sens.map(x => Math.max(Math.abs(x[1] - bt), Math.abs(x[2] - bt))));
    const badge = k => this.lemah(k) ? ` <span class="pill l3" style="height:17px;font-size:9.5px">${(prm(k)[5] || "").startsWith("PILIHAN") ? "kebijakan" : PAR_B[k] || /^ASUMSI/.test(prm(k)[4]) ? "asumsi" : "lemah"}</span>` : "";
    const provs = Object.keys(S.meta?.provinsi || this.kj.prov).filter(k => this.kj.prov[k]);
    const tb = tengah[terbaik], M = Y.mB + Y.mD, bcr = tengah[1].manfaat / Math.max(1, tengah[1].biaya), [bcrT, bcrR, bcrTi] = pr.ews_bcr_rujukan;
    const lbTahun = {harapan: `rata-rata ${ys.length} tahun (${ys[0]?.th}–${ys.at(-1)?.th})`, biasa: `tanpa 3 tahun terberat (${ys.length} tahun)`, berat: `3 tahun terberat: ${ys.map(y => y.th).join(", ")}`, 2025: "tahun 2025"}[this.tahun];
    const e = pr.ews_kurangi_kematian, ff = x => fmt(x);
    const statT = v => { const a = ys.map(y => y[v]); return [a.reduce((x, y) => x + y, 0) / Math.max(1, a.length), persentil(a, .5), persentil(a, .9), Math.max(...a)]; };
    const terburuk = v => { const y = ys.reduce((b, y) => y[v] > b[v] ? y : b, ys[0]); return y ? y.th : "–"; };
    const nyawaTeks = {nol: "tidak diberi nilai uang", rendah: `Rp${ff(pr.nilai_nyawa_statistik[1] / 1e9)} M per jiwa (transfer Bank Dunia)`, tengah: `Rp${ff(pr.nilai_nyawa_statistik[0] / 1e9)} M per jiwa (Viscusi & Masterman, diskalakan)`, tinggi: `Rp${ff(pr.nilai_nyawa_statistik[2] / 1e9)} M per jiwa (studi hedonik)`}[this.nyawa];
    el.innerHTML = `<div class="head"><div><h2>Keputusan musim banjir · ${esc(P.nama)}</h2><p>Bandingkan empat paket kesiapsiagaan untuk satu musim hujan. Dampak dasar dari riwayat BNPB, uang dari parameter bersumber, ketidakpastian dari ${fmt(this.n)} simulasi.</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select id="kbProv" class="btn sec" aria-label="Provinsi">${provs.map(k => `<option value="${k}" ${k === kode ? "selected" : ""}>${esc(namaProv(k))}</option>`).join("")}</select>
      <div class="seg" id="kbTahun">${[["harapan", "Tahun rata-rata"], ["biasa", "Tahun biasa"], ["berat", "Tahun berat"], ["2025", "Kilas balik 2025"]].map(([v, n]) => `<button data-v="${v}" aria-pressed="${this.tahun === v}">${n}</button>`).join("")}</div></div></div>
    ${!P.prior.length ? `<div class="card pad kosong">Belum ada kejadian banjir tercatat per kabupaten untuk provinsi ini.</div>` : `
    <div class="card pad" style="margin-bottom:14px;border-left:4px solid var(--brand2)"><div class="lbl">Keputusan yang diminta</div>
      <h3 style="font-size:18px;margin:4px 0 8px">${pakaiB ? "Setujui B: peringatan dini & posko siaga" : "Tetap A: belum ada bukti cukup untuk tambahan"}</h3>
      <table style="font-size:13px" class="tb3"><tbody>
        ${[[1, `B. Sirene + AWLR (${this.ews} titik), posko siaga, latihan evakuasi di ${P.prior.length} kabupaten`, "dibanding A", pakaiB], [2, `Tambahan pompa & drainase di ${P.sasaran.length} kota/pesisir`, "dibanding B", pakaiC], [3, "Tambahan perahu, tim SAR & logistik pra-posisi", "dibanding B", pakaiD]].map(([j, n, b, ok]) => {
          const d = f => j === 1 ? tengah[1][f] : tengah[j][f] - tengah[1][f];
          return `<tr><td><span class="pill ${ok ? "l0" : "l3"}">${ok ? "Setujui" : "Tunda"}</span></td><td style="white-space:normal"><b>${n}</b><br><small>${b}: biaya +${rp(d("biaya"))}/tahun, nyawa +${fmt(Math.round(d("nyawa") * 10) / 10)} jiwa, manfaat bersih ${d("bersih") >= 0 ? "+" : ""}${rp(d("bersih"))} (rentang 80% ${rp(mc.inkrP10[j])} sampai ${rp(mc.inkrP90[j])})</small></td>
            <td class="n num"><b>${Math.round(mc.inkrPos[j] * 100)}%</b><small>peluang positif</small><small>${Math.round(mc.inkrPos0[j] * 100)}% tanpa nilai nyawa</small></td></tr>`; }).join("")}</tbody></table>
      <p style="margin:8px 0 0;font-size:12.5px;color:var(--ink2)">Dampak dasar ${lbTahun}: ${fmt(Math.round(M * 10) / 10)} meninggal, ${fmt(Math.round(Y.u))} mengungsi, ${fmt(Math.round(Y.r))} rumah rusak per tahun. Suatu langkah disetujui bila manfaat bersihnya positif di ≥ 70% dari ${fmt(this.n)} simulasi. Nilai nyawa: ${nyawaTeks}. Kolom "tanpa nilai nyawa" hanya menghitung biaya rumah dan pengungsi yang terhindar.</p></div>
    <div class="card pad" style="margin-bottom:14px;border-left:4px solid #e58a45"><div class="lbl">Bukti lemah: baca sebelum memutuskan</div>
      <ul style="margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.55">
        <li><b>Efek peringatan dini pada kematian ${ff(e[0])} (${ff(e[1])}–${ff(e[2])})</b> belum punya studi kausal untuk banjir di Indonesia. Angkanya dipinjam dari siklon Bangladesh, simulasi banjir di Jerman, dan perbandingan antarnegara. Keputusan B hampir seluruhnya bergantung pada angka ini dan pada nilai nyawa.</li>
        <li><b>Lama mengungsi ${ff(pr.hari_mengungsi[0])} hari (${ff(pr.hari_mengungsi[1])}–${ff(pr.hari_mengungsi[2])})</b> murni asumsi; BNPB hanya mencatat jumlah pengungsi.</li>
        <li><b>Pecahan rumah rusak berat/sedang/ringan ${Math.round(pr.porsi_rumah_rb[0] * 100)}/${Math.round(pr.porsi_rumah_rs[0] * 100)}/${Math.round((1 - pr.porsi_rumah_rb[0] - pr.porsi_rumah_rs[0]) * 100)}%</b> diasumsikan; data hanya memberi total.</li>
        <li><b>Efek pompa & drainase</b> (opsi C) dan <b>efek SAR siaga</b> (opsi D) belum pernah diukur; manfaat tanggul tidak dihitung sama sekali.</li>
        <li>Harga sirene + AWLR dan pompa mobile masih estimasi. Kerugian isi rumah, usaha, infrastruktur, dan longsor tidak dihitung, jadi manfaat cenderung terlalu rendah.</li></ul></div>
    <div class="grid g4" style="margin-bottom:14px">${[["Meninggal per tahun", fmt(Math.round(M * 10) / 10), `median ${fmt(statT("mB")[1] + statT("mD")[1])}, terburuk ${terburuk("mB")}`],
      ["Mengungsi per tahun", rb(Y.u), `P90 ${rb(statT("u")[2])} · ${fmt(Math.round(P.uPerK))} per kejadian`], ["Rumah rusak per tahun", rb(Y.r), `P90 ${rb(statT("r")[2])}`],
      ["Cakupan kabupaten prioritas", Math.round(P.cakupan * 100) + "%", `kejadian 2008–${this.AKHIR} di ${P.prior.length} dari ${P.kab.length} kabupaten`]].map(([l, v, s]) => kot(l, v, s)).join("")}</div>
    <div class="grid g2" style="margin-bottom:14px">
      <div class="card pad"><h3 style="font-size:15px">Dampak dasar per tahun (A, tanpa tambahan)</h3>
        <div style="overflow-x:auto"><table class="tb3" style="margin-top:6px"><thead><tr><th></th><th class="n">Rata-rata</th><th class="n">Median</th><th class="n">P90</th><th class="n">Terburuk</th></tr></thead><tbody>
        ${[["Meninggal (banjir & rob)", "mB"], ["Meninggal (bandang)", "mD"], ["Mengungsi", "u"], ["Terdampak", "t"], ["Rumah rusak", "r"], ["Kejadian", "k"]].map(([n, v]) => { const s = statT(v);
          return `<tr><td>${n}</td>${s.map(x => `<td class="n num">${x < 100 ? fmt(Math.round(x * 10) / 10) : rb(x)}</td>`).join("")}</tr>`; }).join("")}</tbody></table></div>
        <div style="overflow-x:auto"><table class="tb2" style="margin-top:10px"><tbody>
          <tr><td>Biaya pemulihan rumah (dana stimulan)<br><small style="color:var(--ink2)">${fmt(Math.round(Y.r))} rumah × ${rp(g0.r1)} campuran RB/RS/RR + huntara</small></td><td class="n">${rpc(g0.rumah)}</td></tr>
          <tr><td>Biaya pengungsi<br><small style="color:var(--ink2)">${fmt(Math.round(Y.u))} orang × ${ff(q("hari_mengungsi"))} hari × ${rp(q("biaya_pengungsi_hari"))}</small></td><td class="n">${rpc(g0.ungsi)}</td></tr>
          <tr><td>Nilai nyawa statistik <span class="pill l2" style="height:17px;font-size:9.5px">pilihan kebijakan</span><br><small style="color:var(--ink2)">${fmt(Math.round(M * 10) / 10)} jiwa × ${this.nyawa === "nol" ? "Rp0" : rp(q("nilai_nyawa_statistik"))}; bukan uang yang dibelanjakan</small></td><td class="n">${rpc(g0.nyawa)}</td></tr></tbody></table></div>
        <p class="fnd" style="margin-top:8px">Banjir + bandang + rob, BNPB/DIBI. DIBI mencatat per kabupaten, jadi satu banjir lintas kabupaten bisa terhitung lebih dari sekali; pencatatan makin lengkap di tahun-tahun akhir.</p></div>
      <div class="card pad"><h3 style="font-size:15px">Kabupaten prioritas</h3>
        <table class="tb3" style="margin-top:6px"><thead><tr><th>Kabupaten/kota</th><th class="n">Kejadian 2008–${this.AKHIR}</th><th>Paket</th></tr></thead><tbody>
        ${[...new Set([...P.prior, ...P.sasaran])].map(x => `<tr><td>${esc(x.nama)}</td><td class="n num">${fmt(x.n)}${x.rob ? `<small>${fmt(x.rob)} rob</small>` : ""}</td><td>${[P.prior.includes(x) && "B, D", P.sasaran.includes(x) && "C"].filter(Boolean).join(" · ")}</td></tr>`).join("")}</tbody></table>
        <p class="fnd" style="margin-top:8px">B dan D di ${P.prior.length} kabupaten dengan kejadian terbanyak (${Math.round(P.cakupan * 100)}% kejadian). C di kota atau kabupaten berriwayat rob (${Math.round(P.cakupanC * 100)}% kejadian).</p></div></div>
    <div class="tw" style="margin-bottom:8px"><table><thead><tr><th>Pilihan</th><th class="n">Biaya tambahan</th><th class="n">Nyawa diselamatkan</th><th class="n">Rumah terhindar</th><th class="n">Manfaat uang</th><th class="n">Nilai nyawa</th><th class="n">Manfaat bersih</th><th class="n">Rentang 80%</th><th class="n">Peluang positif</th><th class="n">Peringkat 1 (multikriteria)</th><th>Bukti</th></tr></thead><tbody>
      ${OPSI_B.map((o, j) => { const x = tengah[j]; return `<tr${j === terbaik ? ' style="background:oklch(42% .11 255 / .08)"' : ""}><td style="white-space:normal;min-width:220px"><b>${o[0]}</b> ${esc(o[1])}<br><small style="color:var(--ink2)">${esc(o[2])}</small></td>
        <td class="n num">${rpc(x.biaya)}</td><td class="n num">${fmt(Math.round(x.nyawa * 10) / 10)}</td><td class="n num">${fmt(Math.round(x.rumah))}</td><td class="n num">${rpc(x.uang)}</td><td class="n num">${rpc(x.mNyawa)}</td><td class="n num"><b>${j ? rpc(x.bersih) : "–"}</b></td>
        <td class="n num" style="white-space:nowrap">${j ? rp(mc.p10[j]) + " – " + rp(mc.p90[j]) : "–"}</td><td class="n num">${j ? Math.round(mc.positif[j] * 100) + "%" : "–"}</td><td class="n num">${Math.round(mc.rank[j][0] * 100)}%</td>
        <td><span class="pill ${o[3] >= .7 ? "l0" : o[3] >= .35 ? "l2" : "l3"}">${o[3] >= 1 ? "pembanding" : o[3] >= .7 ? "terukur" : o[3] >= .35 ? "lemah" : "sangat lemah"}</span></td></tr>`; }).join("")}</tbody></table></div>
    <p style="font-size:12px;color:var(--ink2);margin:0 0 18px">Biaya per tahun. B per kabupaten: ${this.ews} sirene + AWLR (dicicil ${ff(q("umur_ews"))} tahun + perawatan ${Math.round(q("om_ews") * 100)}%/tahun), sarana posko lapangan ${rp(this.alat.posko)} dicicil ${ff(q("umur_alat"))} tahun, ${DESAIN_B.posko} petugas × ${fmt(this.hari)} hari, latihan evakuasi. C per kota: ${DESAIN_B.pompa} pompa mobile + solar, perawatan drainase, sarana rob ${rp(this.alat.rob)}. D per kabupaten: ${DESAIN_B.setSar} set perahu (${rp(this.alat.evak)}/set), ${DESAIN_B.sar} petugas SAR × ${fmt(this.hari)} hari, stok logistik ${DESAIN_B.hariStok} hari untuk ${fmt(Math.round(P.uPerK))} pengungsi. Rasio manfaat/biaya B = ${fmt(Math.round(bcr * 10) / 10)}; rujukan internasional ${ff(bcrR)}–${ff(bcrTi)} (Hallegatte 2012)${bcr < bcrR || bcr > bcrTi ? ", <b>di luar rentang: periksa asumsinya</b>" : ""}.</p>
    <div class="grid g2" style="margin-bottom:18px">
      <div class="card pad"><h3 style="font-size:15px">Atur skenario</h3>
        ${[["k", "Kabupaten prioritas (paket B, C, D)", this.k, 1], ["ews", "Titik sirene + AWLR per kabupaten", this.ews, 1], ["hari", "Hari siaga per musim", this.hari, 10]].map(([k, n, v, st]) => `<label class="fld"><span class="lbl">${n}</span><input type="number" min="${k === "hari" ? 10 : 1}" step="${st}" data-kb="${k}" value="${v}"></label>`).join("")}
        <label class="fld"><span class="lbl">Nilai nyawa statistik (pilihan kebijakan)</span><select data-kb="nyawa">${[["nol", "Tidak diberi nilai uang"], ["rendah", `Rendah (Rp${ff(pr.nilai_nyawa_statistik[1] / 1e9)} M)`], ["tengah", `Tengah (Rp${ff(pr.nilai_nyawa_statistik[0] / 1e9)} M)`], ["tinggi", `Tinggi (Rp${ff(pr.nilai_nyawa_statistik[2] / 1e9)} M)`]].map(([v, n]) => `<option value="${v}" ${this.nyawa === v ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="fld"><span class="lbl">Pagu anggaran tambahan per tahun (Rp)</span><input type="number" min="0" step="100000000" data-kb="pagu" value="${pagu}"></label>
        <p style="font-size:13px;margin:6px 0 0">Dalam pagu ${rp(pagu)}, skor multikriteria tertinggi (bobot di samping): <b>${muat != null ? OPSI_B[muat][0] + " " + OPSI_B[muat][1] : "tidak ada pilihan selain A"}</b>.</p></div>
      <div class="card pad"><h3 style="font-size:15px">Bobot kriteria dan ketahanan peringkat</h3>
        ${[["bersih", "Manfaat bersih (uang, tanpa nilai nyawa)"], ["nyawa", "Nyawa diselamatkan"], ["bukti", "Kekuatan bukti"]].map(([k, n]) =>
          `<div style="display:grid;grid-template-columns:150px 1fr 36px;gap:8px;align-items:center;font-size:12.5px"><span>${n}</span><input type="range" min="0" max="50" value="${this.bobot[k]}" data-bobot="${k}" aria-label="Bobot ${n}"><span class="num">${this.bobot[k]}</span></div>`).join("")}
        <div class="lbl" style="margin-top:10px">Peluang tiap pilihan di peringkat 1 bila bobot dan parameter diacak</div>
        <p style="font-size:11.5px;color:var(--ink2);margin:2px 0 4px">Pembanding saja; keputusan di atas memakai analisis tambahan biaya-manfaat. Nilai nyawa tidak masuk kriteria uang supaya nyawa tidak terhitung dua kali.</p>
        ${OPSI_B.map((o, j) => `<div class="hbar" style="grid-template-columns:150px 1fr 44px"><span>${o[0]} ${esc(o[1])}</span><div><i style="width:${mc.rank[j][0] * 100}%;background:${j === terbaik ? "var(--brand2)" : "var(--accent)"}"></i></div><span class="num">${Math.round(mc.rank[j][0] * 100)}%</span></div>`).join("")}</div></div>
    <div class="head"><div><h2>Sensitivitas</h2><p>Parameter yang paling menggeser manfaat bersih pilihan ${OPSI_B[acuan][0]} (${OPSI_B[acuan][1]}), dari nilai rendah ke tinggi.</p></div></div>
    <div class="card pad" style="margin-bottom:18px">${sens.map(([k, lo, hi]) => { const a1 = (Math.min(lo, hi) - bt) / sMax * 50, a2 = (Math.max(lo, hi) - bt) / sMax * 50;
      return `<div class="sens"><span>${NM_B[k] || k}${badge(k)}</span>
        <div style="position:relative;height:14px;background:var(--surface);border-radius:4px"><i style="position:absolute;left:${50 + a1}%;width:${a2 - a1}%;top:0;bottom:0;background:linear-gradient(90deg,#c9503a,#5a9e74);border-radius:4px"></i><i style="position:absolute;left:50%;top:-2px;bottom:-2px;width:2px;background:var(--ink)"></i></div>
        <span class="num" style="color:var(--ink2)">${rp(lo)} … ${rp(hi)}</span></div>`; }).join("")}
      <p class="fnd" style="margin-top:8px">Dampak tahunan: P10 sampai P90 tahun-tahun riwayat. Nilai nyawa tidak diuji di sini karena itu pilihan kebijakan; ubah di "Atur skenario".</p></div>
    <div class="grid g2" style="margin-bottom:18px">
      <div class="card pad"><h3 style="font-size:15px">Rencana bertahap 2027–2031</h3><table class="tb3" style="margin-top:6px"><tbody>
        ${[["2027", `Pasang ${fmt(this.ews * Math.min(2, P.prior.length))} sirene + AWLR di 2 kabupaten teratas (${esc(P.prior.slice(0, 2).map(x => x.nama).join(", "))}); posko siaga dan latihan evakuasi; catat lama mengungsi dan rumah rusak per tingkat di tiap kejadian`],
           ["2028", `Perluas ke ${P.prior.length} kabupaten prioritas bila sirene berfungsi ≥ 90% saat uji bulanan; ukur waktu dari peringatan ke evakuasi`],
           ["2029", pakaiC ? `Pompa mobile dan perawatan drainase di ${esc(P.sasaran.slice(0, 2).map(x => x.nama).join(", ") || "kota sasaran")}` : `Uji coba pompa mobile di 1 kota (${esc(P.sasaran[0]?.nama || "kota sasaran")}) dengan pengukuran luas dan lama genangan`],
           ["2030", "Evaluasi independen: bandingkan kematian dan pengungsian di kecamatan bersirene dengan kecamatan pembanding"],
           ["2031", "Lembagakan anggaran kesiapsiagaan di APBD dan RKPD; perbarui parameter model dengan data 2027–2030"]].map(([t, x]) => `<tr><td><b>${t}</b></td><td style="white-space:normal">${x}</td></tr>`).join("")}</tbody></table></div>
      <div class="card pad"><h3 style="font-size:15px">Siapa untung, siapa menanggung</h3><table class="tb3" style="margin-top:6px"><tbody>
        ${[["Warga bantaran sungai & pesisir", "untung: peringatan dan evakuasi lebih awal; menanggung: ikut latihan, mengungsi juga saat peringatan ternyata tidak terjadi"], ["Kelompok rentan (lansia, difabel, anak)", "untung: dievakuasi lebih dulu saat Siaga"],
           ["BPBD kabupaten", "menanggung: posko siaga, latihan, perawatan sirene"], ["Pemda (APBD)", "menanggung: biaya B; C bila drainase & pompa"], ["BBWS / Dinas SDA", "berbagi data AWLR, operasi pintu air (C)"],
           ["BMKG", "prakiraan hujan dan peringatan dini berbasis dampak"], ["Basarnas, SAR daerah, relawan", "menanggung: tim siaga (D)"], ["Dinas Sosial", "menanggung: logistik pengungsi, jaminan hidup"]].map(([a, b]) => `<tr><td>${a}</td><td style="white-space:normal">${b}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="head"><div><h2>Target pemantauan</h2><p>Diukur tiap musim untuk menguji dan mengganti asumsi model.</p></div></div>
    <div class="tw" style="margin-bottom:18px"><table><thead><tr><th>Indikator</th><th>Target</th><th>Sumber data</th></tr></thead><tbody>
      ${[["Meninggal karena banjir per tahun", `turun ${fmt(Math.round(tb.nyawa * 10) / 10)} jiwa dari rata-rata ${fmt(Math.round(M * 10) / 10)}`, "DIBI BNPB, BPBD"],
         ["Sirene + AWLR berfungsi saat uji bulanan", "≥ 90%", "laporan BPBD"], ["Jeda dari peringatan ke mulai evakuasi", "dicatat tiap kejadian; target ≥ 3 jam untuk banjir sungai", "catatan posko"],
         ["Lama mengungsi per kejadian (hari)", `dicatat; menggantikan asumsi ${ff(pr.hari_mengungsi[0])} hari`, "posko pengungsian, Dinas Sosial"],
         ["Rumah rusak berat / sedang / ringan", "dicatat per tingkat; menggantikan asumsi pecahan", "DIBI, Jitupasna"],
         ["Luas dan lama genangan di kota sasaran", pakaiC ? `turun ≥ ${Math.round(q("ef_pompa_drainase") * 100)}%` : "diukur sebelum memutuskan C", "BPBD, Dinas PU"],
         ["Warga ikut latihan evakuasi", "≥ 1 kali setahun di kecamatan bersirene", "BPBD"]].map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join("")}</tbody></table></div>
    <div class="head"><div><h2>Asumsi dan sumber</h2><p>Bertanda asumsi atau lemah: belum ada bukti terukur di Indonesia. Bertanda kebijakan: angka pilihan, bukan hasil ukur.</p></div></div>
    <div class="tw"><table><thead><tr><th>Parameter</th><th class="n">Tengah</th><th class="n">Rendah</th><th class="n">Tinggi</th><th>Satuan</th><th>Sumber</th></tr></thead><tbody>
      ${PAKAI_B.map(k => [k, prm(k)]).map(([k, v]) => `<tr><td>${NM_B[k] || k}${badge(k)}</td>
        ${v.slice(0, 3).map(x => `<td class="n num">${x >= 1e5 ? rp(x) : fmt(x)}</td>`).join("")}<td style="white-space:normal;min-width:140px">${esc(v[3])}</td><td style="white-space:normal;min-width:260px">${tautan(v[4])}${v[5] ? ` · <span style="color:var(--ink2)">${esc(v[5])}</span>` : ""}</td></tr>`).join("")}
      <tr><td>Desain paket</td><td colspan="5" style="white-space:normal">${DESAIN_B.posko} petugas posko, ${DESAIN_B.sar} petugas SAR, ${DESAIN_B.setSar} set perahu per kabupaten; ${DESAIN_B.pompa} pompa mobile per kota; stok ${DESAIN_B.hariStok} hari. Harga sarana dari param_banjir.json (Perka BNPB 10/2008 dan 17/2009, harga pasar; sebagian estimasi).</td></tr></tbody></table></div>`}`;
    $("#kbProv").onchange = e => { this.prov = e.target.value; this.pagu = null; nanti(() => this.render()); };
    $("#kbTahun").onclick = e => { const b = e.target.closest("button"); if (!b) return; this.tahun = b.dataset.v; $("#kbTahun").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); nanti(() => this.render()); };
    el.querySelectorAll("[data-kb]").forEach(i => i.onchange = () => { const k = i.dataset.kb; this[k] = k === "nyawa" ? i.value : Math.max(k === "pagu" ? 0 : 1, +i.value || 0); nanti(() => this.render()); });
    el.querySelectorAll("[data-bobot]").forEach(i => i.onchange = () => { this.bobot[i.dataset.bobot] = +i.value; nanti(() => this.render()); });
  },
};
