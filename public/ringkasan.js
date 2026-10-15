/* ringkasan.js — tab "Ringkasan" untuk pimpinan (halaman pertama).
   Skrip klasik, dimuat SETELAH skrip utama index.html. Global yang dipakai: S, PRIO, Kp, ASUMSI, UH, anggaran, reguPosko, angkaID,
   namaProv, fmt, rb, rp, esc, muatJSON, jamWIB, bukaTab, turun, Laci, Berita (dlg, negaraMedia), $.
   Semua angka dihitung dari berkas data yang sama dengan tab lain; aturan tingkat & kartu keputusan tertulis di RINGKASAN.md
   dan di dialog "Aturan" di halaman. Tidak ada angka yang diketik tangan selain asumsi bernama di ATURAN. */
"use strict";
const Ringkasan = (() => {
  /* ---------- aturan (satu tempat; dikutip apa adanya di dialog Aturan) ---------- */
  const ATURAN = {
    jamTiba: 6,          /* regu darat dianggap menjangkau bila tiba <= 6 jam (akses.json) */
    garisRegu: .15 * 8,  /* km garis kendali per regu per hari: 150 m/jam (Simulasi) x 8 jam kerja efektif */
    hariKurung: 3,       /* target front terkurung dalam 3 hari */
    haPiksel: .14,       /* km2 per piksel VIIRS aktif (14 ha, sama dengan laci kompleks) */
    hariHeli: 7, hariOMC: 7, hariBKO: 14,
  };
  const TINGKAT = ["Normal", "Waspada", "Siaga", "Darurat"];
  const WARNA_T = ["#5a9e74", "#e3b94e", "#e58a45", "#7a2b2b"];
  const KOREM = {"14": "031/Wira Bima", "15": "042/Garuda Putih", "16": "044/Garuda Dempo", "61": "121/Alambhana Wanawai", "62": "102/Panju Panjung",
    "63": "101/Antasari", "64": "091/Aji Surya Natakesuma", "53": "161/Wira Sakti", "93": "174/Anim Ti Waninggap"};
  const JENIS = {resmi: "Resmi", satelit: "Satelit", model: "Model", berita: "Berita"};
  const SUMBER = {
    titik: "NASA FIRMS (MODIS, VIIRS S-NPP, NOAA-20), dihitung setara SiPongi",
    kompleks: "Kompleks kebakaran: titik panas 7 hari digabung DBSCAN 1,5 km, status dari aturan keparahan + cuaca (tab Metode)",
    asap: "CAMS (Copernicus) via Open-Meteo × penduduk WorldPop; hanya sel dengan kompleks api searah angin ≤ 300 km (dampak.json)",
    ansambel: "Ansambel ECMWF 51 anggota (fwi_ansambel.json), rata-rata sel 0,5° per provinsi",
    luas: "Titik MODIS sejak 1 Juni × rasio ha/titik GWIS MCD64A1 per provinsi (dampak.json)",
    bnpb: "Laporan harian BNPB (bnpb.json), 6 provinsi pantauan",
    pesawat: "Kejadian dari judul berita Google News + METAR (penerbangan.json); batas bawah, bukan data resmi bandara",
    berita: "Judul Google News 120 hari, dinilai bot berita (berita.json)",
    akses: "Waktu tempuh regu lewat jalan & sungai OpenStreetMap (akses.json)",
  };

  /* ---------- pembantu tampilan ---------- */
  const n = (v, sumber, jenis) => `<span class="rk-n" tabindex="0" data-tip="${esc(`<b>${JENIS[jenis]}</b> · ${sumber}`)}">${v}</span>`;
  const tag = jenis => `<span class="rk-j">${JENIS[jenis].toLowerCase()}</span>`;
  const pct = p => p == null ? "–" : Math.round(p * 100) + "%";
  const lencana = lv => `<span class="rk-lv lv${lv}">${TINGKAT[lv]}</span>`;
  const KATA = ["Tidak ada", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh"];
  const kata = v => KATA[v] || fmt(v);
  const desimal = v => fmt(Math.round(v * 10) / 10);
  /* "naik 52% dari" / "turun 8% dari" / "sama dengan" — kalimat diakhiri pembandingnya ("kemarin") */
  /* bagian bergaya tab Metode: kepala <header class="rk-sh"> diubah jadi summary details.mt-sek (ikon, "N. judul", keterangan) */
  const sek = (no, ik, h) => h.replace(/^<header class="rk-sh"><h2 id="(\w+)">([\s\S]*?)<\/h2>\s*(?:<p>([\s\S]*?)<\/p>)?<\/header>([\s\S]*)$/,
    (_, id, j, sub, isi) => `<summary><span class="mt-nom">${mtIkon(ik)}</span><span class="mt-jd"><b id="${id}">${no}. ${j}</b>${sub ? `<small>${sub}</small>` : ""}</span></summary><div class="mt-isi">${isi}</div>`);
  const ubahKata = d => Math.abs(d) < .005 ? "sama dengan" : `${d > 0 ? "naik" : "turun"} ${fmt(Math.abs(Math.round(d * 100)))}% dari`;
  const tglPanjang = d => new Date(d).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric"});
  const hariN = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "short", day: "numeric", month: "short"});
  const daftar = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " dan " + a.at(-1);
  const segar = (t, jam) => { if (!t) return [2, "tidak ada"]; const u = (Date.now() - new Date(t)) / 36e5; return [u <= jam ? 0 : u <= 2 * jam ? 1 : 2, u < 1 ? "< 1 jam" : Math.round(u) + " jam"]; };

  const R = {
    D: null, B: null, dinding: null,

    async siap() { for (let i = 0; i < 400 && !(S.meta && S.kluster && S.wilayah && S.titik?.length && S.posko); i++) await new Promise(r => setTimeout(r, 150)); return !!S.meta; },
    async muat() {
      const j = u => muatJSON(u).catch(() => null);
      /* ringkasan.json (scripts/data/ringkasan.py): potongan berita/penerbangan/musim_awal yang dibaca di sini saja; kunci hilang -> berkas asli */
      const rk = this.rk = await j("data/ringkasan.json") || {};
      const [dp, ans, kp, ak, ud, pn, ma, ls] = await Promise.all([j("data/dampak.json"), j("data/fwi_ansambel.json"), Kp.d || j("data/keputusan.json"), j("data/akses.json"),
        Lapis.cache?.udara || j("data/udara_rekom.json"), rk.penerbangan || j("data/penerbangan.json"), rk.musim_awal || j("data/musim_awal.json"), j("data/luas_satelit.json")]);
      this.ops = typeof Operasi !== "undefined" && await Operasi.siap().catch(() => false);
      if (kp) Kp.d ||= kp; if (ud && Lapis.cache) Lapis.cache.udara = ud;
      this.raw = {dp, ans, kp, ak, ud, pn, ma, ls};
    },

    /* ================= semua angka halaman dihitung di sini ================= */
    hitung() {
      const {dp, ans, ak, ud, pn, ma, ls} = this.raw, kp = Kp.d;
      const P = {}, PROV = Object.keys(S.meta.provinsi);
      const tglData = S.meta.hari_wib, d0 = new Date(tglData + "T00:00:00Z"), doy = Math.floor((d0 - Date.UTC(d0.getUTCFullYear(), 0, 1)) / 864e5);
      for (const k of PROV) {
        const u = dp?.udara?.prov?.[k], j0 = u?.jiwa?.[0] || [0, 0, 0, 0, 0], j1 = u?.jiwa?.[1] || j0, amb = ma?.prov?.[k]?.ambang?.[doy];
        P[k] = {k, p3: 0, p2: 0, kom3: [], h24: 0, hKmr: 0, snpp: 0, norm: amb != null ? amb / 2 / 7 : null,
          jiwa: j0[2] + j0[3] + j0[4], jiwaSTS: j0[3] + j0[4], jiwaBesok: j1[2] + j1[3] + j1[4], ispa: u?.ispa?.[0]?.[1] || 0,
          fwi: S.wilayah[k]?.fwi_maks, dc: S.wilayah[k]?.dc_maks, pE: null, pT: null, pH: null};
      }
      /* titik panas: 24 jam terakhir vs 24 jam sebelumnya, dari lintasan terakhir (S.acuan) */
      const kab24 = {};
      for (const b of S.titik) { const w = S.wilKunci[b[6]], x = w && P[w[0]]; if (!x || b[2] < -48) continue; const utama = S.utama.has(b[3]);
        if (b[2] >= -24) { if (utama) { x.h24++; kab24[w[1]] = (kab24[w[1]] || 0) + 1; } if (b[3] === "N" && b[5] >= 1) x.snpp++; } else if (utama) x.hKmr++; }
      for (const f of S.kluster.features) { const p = f.properties, x = P[p.prov]; if (!x) continue; if (p.level === 3) { x.p3++; x.kom3.push(p); } else if (p.level === 2) x.p2++; }
      for (const x of Object.values(P)) x.kom3.sort((a, b) => b.px24 - a.px24);
      /* ansambel: per provinsi = rata-rata sel, lalu maksimum 3 hari pertama (72 jam) */
      const ansHari = ans?.hari?.slice(0, 3) || [];
      if (ans) { const g = {}; for (const c of ans.grid) (g[c.prov] ||= []).push(c);
        for (const [k, cs] of Object.entries(g)) { if (!P[k]) continue; const m = key => Math.max(...ansHari.map((_, i) => cs.reduce((a, c) => a + (c[key]?.[i] ?? 0), 0) / cs.length));
          P[k].pE = m("ps"); P[k].pT = m("pt"); P[k].pH = m("ph"); } }
      /* akses darat & kebutuhan regu per kompleks prioritas */
      const reguDari = s => s.jenis === "daops" ? (S.daops.find(d => d.kode === s.kode)?.regu || 1) : (() => { const x = S.semuaPosko.get(s.kode); return x?.kompleks ? reguPosko(x) : 1; })();
      for (const x of Object.values(P)) for (const p of x.kom3) {
        const dari = (ak?.[p.id]?.dari || []).filter(s => s.jam != null);
        p._tiba = dari.length ? Math.min(...dari.map(s => s.jam)) : null;
        p._dekat = dari.filter(s => s.jam <= ATURAN.jamTiba).map(s => ({...s, regu: reguDari(s)}));
        p._keliling = 2 * Math.sqrt(Math.PI * p.px24 * ATURAN.haPiksel);
        p._butuh = Math.ceil(p._keliling / (ATURAN.garisRegu * ATURAN.hariKurung));
        p._ada = p._dekat.reduce((a, s) => a + s.regu, 0);
      }
      /* BNPB per provinsi */
      const bnRow = new Map((S.bnpb?.rows || []).map(r => [r.Provinsi, r])), bn = k => S.meta.bnpb[k] ? bnRow.get(S.meta.bnpb[k]) : null;
      /* tingkat per provinsi */
      for (const x of Object.values(P)) {
        const rasio = x.norm ? x.snpp / x.norm : null; x.rasio = rasio;
        const al = [];
        if (x.p3 >= 25) al.push(`${fmt(x.p3)} kompleks prioritas (≥ 25)`);
        else if (x.p3 >= 10 && x.jiwa >= 1e6) al.push(`${fmt(x.p3)} kompleks prioritas dan ${rb(x.jiwa)} jiwa terpapar asap tidak sehat`);
        else if (x.p3 >= 10 && x.pE >= .5) al.push(`${fmt(x.p3)} kompleks prioritas dan peluang cuaca sangat berbahaya ${pct(x.pE)}`);
        if (al.length) { x.lv = 3; x.alasan = al[0]; continue; }
        if (x.p3 >= 3) al.push(`${fmt(x.p3)} kompleks prioritas (≥ 3)`);
        if (x.jiwa >= 1e6) al.push(`${rb(x.jiwa)} jiwa terpapar asap karhutla tidak sehat (≥ 1 jt)`);
        if (rasio >= 3 && x.h24 >= 300) al.push(`titik panas ${fmt(Math.round(rasio * 10) / 10)}× normal`);
        if (al.length) { x.lv = 2; x.alasan = al[0]; continue; }
        if (x.p3 >= 1) al.push(`${fmt(x.p3)} kompleks prioritas`);
        if (x.p2 >= 5) al.push(`${fmt(x.p2)} kompleks siaga (≥ 5)`);
        if (x.pE >= .3) al.push(`peluang cuaca sangat berbahaya ${pct(x.pE)}`);
        if (x.jiwa >= 1e5) al.push(`${rb(x.jiwa)} jiwa terpapar asap tidak sehat`);
        x.lv = al.length ? 1 : 0; x.alasan = al[0] || "tidak ada pemicu";
      }
      const L = Object.values(P), hit = lv => L.filter(x => x.lv === lv).sort((a, b) => b.p3 - a.p3 || b.jiwa - a.jiwa);
      const nD = hit(3).length, nS = hit(2).length, nW = hit(1).length;
      const lvNas = nD >= 3 ? 3 : nD >= 1 || nS >= 3 ? 2 : nS + nW >= 1 ? 1 : 0;

      /* KPI */
      const sum = f => L.reduce((a, x) => a + (f(x) || 0), 0);
      const h24 = sum(x => x.h24), hKmr = sum(x => x.hKmr), snpp = sum(x => x.snpp), norm = sum(x => x.norm);
      const k3 = L.flatMap(x => x.kom3), naik = k3.filter(p => p.ini > p.kmrn).length;
      const jiwaPrio = PRIO.reduce((a, k) => a + P[k].jiwa, 0), jiwaBesok = PRIO.reduce((a, k) => a + P[k].jiwaBesok, 0), jiwaNas = sum(x => x.jiwa);
      const tahunLs = ls ? ls.tahun.map((t, i) => [t, Object.values(ls.ha).reduce((a, v) => a + (v[i] || 0), 0)]).filter(([t]) => +t < +ls.tahun.at(-1)).map(x => x[1]).sort((a, b) => a - b) : [];
      const luasNormal = tahunLs.length ? tahunLs[Math.floor(tahunLs.length / 2)] : null;
      const bnpbHa = dp?.musim?.bnpb ? Object.values(dp.musim.bnpb).reduce((a, b) => a + (angkaID(b) || 0), 0) : null;
      const hariIni = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10), mundur = h => new Date(Date.parse(hariIni) - h * 864e5).toISOString().slice(0, 10);
      const kj = pn?.kejadian || [], kj7 = kj.filter(x => x.tgl > mundur(7)), kjL = kj.filter(x => x.tgl > mundur(14) && x.tgl <= mundur(7));

      /* sumber daya per provinsi prioritas (dipakai kartu & tabel akuntabilitas) */
      const AK = PRIO.map(k => { const x = P[k], b = bn(k), pk = S.posko.filter(p => p.prov === k && p.kompleks.length);
        const tanpaAkses = x.kom3.filter(p => p._tiba == null || p._tiba > ATURAN.jamTiba);
        const heliButuh = Math.max(x.p3 ? ASUMSI.heliUnit : 0, Math.ceil(tanpaAkses.length * (kp?.param?.jam_heli_per_api?.[0] ?? 3) / ASUMSI.heliJamHari));
        const wb = b ? (angkaID(b["WB unit"]) || 0) + (angkaID(b["unit WB standby"]) || 0) : null;
        const reguButuh = pk.reduce((a, p) => a + reguPosko(p), 0), reguMA = S.daops.filter(d => d.prov === k).reduce((a, d) => a + (d.regu || 0), 0);
        const personel = b ? angkaID(b["Total Personel"]) : null;
        const pusat = S.pusat.find(p => p.prov === k);
        return {k, x, b, tanpaAkses, heliButuh, wb, reguButuh, reguMA, personel, setara: personel != null ? Math.floor(personel / 15) : null, pusat,
          omc: b ? angkaID(b["OMC unit"]) || 0 : null, dsp: pusat ? anggaran({...pusat, tingkat: 0, prioritas: x.p3}).dsp : 0}; });

      const segarSumber = [["Titik panas (deteksi terakhir)", S.acuan, 14], ["Kompleks & status", S.meta.dibuat, 26], ["Asap & paparan", dp?.udara?.dibuat, 30],
        ["Cuaca ansambel", ans?.dibuat, 30], ["Laporan BNPB", S.bnpb?.updatedAt, 30], ["Penerbangan", pn?.dibuat, 30]];

      this.D = {adaAsap: !!dp?.udara?.prov, P, L, PROV, lvNas, nD, nS, nW, hit, AK, bn, kab24, ansHari, dp, ud, kp,
        kpi: {h24, hKmr, snpp, titikHari: this.hariTitik(), norm, rasio: norm ? snpp / norm : null, k3: k3.length, k2: sum(x => x.p2), naik, turun: k3.length - naik,
          jiwaPrio, jiwaBesok, jiwaNas, luas: dp?.musim?.ha, luasNormal, bnpbHa, kj7, kjL, bandara7: new Set(kj7.map(x => x.bandara)).size},
        segar: segarSumber, asOf: S.acuan || S.meta.dibuat};
      this.D.kartu = this.keputusan(this.D);
      return this.D;
    },

    /* titik panas per 24 jam ke belakang (garis kecil KPI): hanya jendela yang tercakup penuh oleh berkas yang sudah dimuat (48 jam dulu, 7 hari menyusul) */
    hariTitik() {
      if (!S.titikPenuh && this.rk?.titik_hari?.v.length >= 3) return this.rk.titik_hari.v;   // dihitung di Actions dari hotspot.json 7 hari
      const per = []; let jMin = 0;
      for (const b of S.titik) { if (b[2] < jMin) jMin = b[2]; const w = S.wilKunci[b[6]]; if (!w || !S.meta.provinsi[w[0]] || !S.utama.has(b[3])) continue; const i = Math.max(0, Math.ceil(-b[2] / 24) - 1); per[i] = (per[i] || 0) + 1; }
      const nH = Math.min(14, Math.floor(-jMin / 24)); return Array.from({length: nH}, (_, i) => per[nH - 1 - i] || 0);
    },
    spark(th) {
      if (th.length < 3) return "";
      const mx = Math.max(...th, 1), x = i => (i / (th.length - 1) * 196 + 2).toFixed(1), y = v => (30 - v / mx * 26).toFixed(1);
      return `<svg viewBox="0 0 200 32" preserveAspectRatio="none" aria-hidden="true"><polyline points="${th.map((v, i) => x(i) + "," + y(v)).join(" ")}" vector-effect="non-scaling-stroke"/><circle cx="${x(th.length - 1)}" cy="${y(th.at(-1))}" r="3"/></svg><span>${fmt(th.length)} hari terakhir</span>`;
    },
    tungguTitik() {
      if (S.titikPenuh || this._tt || this.rk?.titik_hari) return;
      this._tt = setInterval(() => { if (!S.titikPenuh) return; clearInterval(this._tt); this._tt = null; if (!this.D) return;
        this.D.kpi.titikHari = this.hariTitik(); const v = $("#ringkasan .rk-k .rk-viz"); if (v) v.innerHTML = this.spark(this.D.kpi.titikHari); }, 1000);
    },

    /* ================= kartu keputusan dari data ================= */
    keputusan(D) {
      const {P, AK, kp} = D, C = [], par = (k, i = 0, cad) => kp?.param?.[k]?.[i] ?? cad;
      const tanda = s => s >= 3 ? ["Tinggi", "tiga sumber atau lebih saling menguatkan"] : s === 2 ? ["Sedang", "dua sumber saling menguatkan"] : ["Rendah", "baru satu sumber"];
      const basi = (Date.now() - new Date(S.meta.dibuat)) / 36e5 > 26;
      const turunkan = y => basi ? (y[0] === "Tinggi" ? ["Sedang", y[1] + "; data kompleks lebih tua dari 26 jam"] : ["Rendah", y[1] + "; data kompleks lebih tua dari 26 jam"]) : y;
      const darurat = D.hit(3);
      /* A. Presiden: >= 3 provinsi darurat */
      if (D.lvNas === 3) {
        const p3 = darurat.reduce((a, x) => a + x.p3, 0), jw = darurat.reduce((a, x) => a + x.jiwa, 0);
        const dsp = AK.filter(a => a.x.lv === 3).reduce((s, a) => s + a.dsp, 0);
        C.push({skor: 100, jenis: "status", siapa: "Presiden", apa: `Pimpin rapat terbatas dan perintahkan operasi terpadu karhutla di ${daftar(darurat.map(x => namaProv(x.k)))}`,
          kenapa: [[`${n(fmt(p3), SUMBER.kompleks, "satelit")} kompleks api berstatus prioritas di ${fmt(darurat.length)} provinsi tersebut`, "satelit"],
            D.adaAsap ? [`${n(rb(jw) + " jiwa", SUMBER.asap, "model")} menghirup udara tidak sehat akibat asap karhutla hari ini`, "model"]
              : [`Peluang bahaya cuaca kebakaran sangat tinggi 72 jam hingga ${n(pct(Math.max(...darurat.map(x => x.pE || 0))), SUMBER.ansambel, "model")}`, "model"]],
          biaya: dsp ? `Dana Siap Pakai BNPB ± ${n(rp(dsp), `${ASUMSI.heliUnit} heli × ${ASUMSI.heliJamHari} jam × ${ASUMSI.hariDarurat} hari per provinsi berprioritas (asumsi tab Posko)`, "model")}` : "–",
          waktu: "Hari ini", yakin: turunkan(tanda(2 + (darurat.some(x => x.pE >= .5) ? 1 : 0))),
          bukti: {judul: "Provinsi berstatus darurat", isi: () => this.tabelTingkat(D, 3), prov: darurat[0]?.k}});
      }
      /* B. Gubernur: status tanggap darurat provinsi darurat terbesar */
      if (darurat.length) { const x = darurat[0], a = AK.find(a => a.k === x.k), top = x.kom3[0];
        const s = 1 + (x.jiwa >= 1e6 ? 1 : 0) + (x.pE >= .5 ? 1 : 0) + (a?.b && angkaID(a.b["Total Hotspot"]) > 0 ? 1 : 0);
        C.push({skor: 90, op: x.k, jenis: "status", siapa: `Gubernur ${namaProv(x.k)}`, apa: `Tetapkan atau perpanjang status tanggap darurat karhutla ${namaProv(x.k)}`,
          kenapa: [[`${n(fmt(x.p3), SUMBER.kompleks, "satelit")} kompleks prioritas; terbesar ${esc(top.id)} ${esc(top.kab)} dengan ${n(fmt(top.px24) + " piksel aktif", SUMBER.titik, "satelit")}`, "satelit"],
            x.jiwa >= 1e5 ? [`${n(rb(x.jiwa) + " jiwa", SUMBER.asap, "model")} terpapar asap tidak sehat`, "model"] : [`Peluang bahaya cuaca kebakaran sangat tinggi 72 jam: ${n(pct(x.pE), SUMBER.ansambel, "model")}`, "model"]],
          biaya: a?.dsp ? `Membuka Dana Siap Pakai BNPB ± ${n(rp(a.dsp), `${ASUMSI.heliUnit} heli × ${ASUMSI.heliJamHari} jam × ${ASUMSI.hariDarurat} hari (asumsi tab Posko)`, "model")}` : "Membuka akses Dana Siap Pakai BNPB",
          waktu: `Hari ini; berlaku ${ASUMSI.hariDarurat} hari`, yakin: turunkan(tanda(s)),
          bukti: {judul: `${namaProv(x.k)}: dasar status`, isi: () => this.buktiProv(D, x), prov: x.k}}); }
      /* C. Kepala BNPB: heli untuk kompleks prioritas tanpa akses darat <= 6 jam */
      { const a = [...AK].sort((p, q) => q.tanpaAkses.length - p.tanpaAkses.length)[0];
        const jamApi = par("jam_heli_per_api", 0, 3), perlu = a ? Math.ceil(a.tanpaAkses.length * jamApi / ASUMSI.heliJamHari) : 0, tambah = Math.max(0, perlu - (a?.wb || 0));
        if (a && a.tanpaAkses.length >= 2 && tambah > 0) {
          const kab = [...new Set(a.tanpaAkses.map(p => p.kab))].slice(0, 2), basis = (D.ud?.heli || []).filter(h => h.prov === a.k).sort((p, q) => q.prioritas - p.prioritas)[0];
          C.push({skor: 80 + a.tanpaAkses.length, op: a.k, jenis: "heli", siapa: "Kepala BNPB", apa: `Kerahkan ${fmt(tambah)} helikopter water bombing ke ${kab.map(esc).join("–")} (${namaProv(a.k)})${basis ? `, berpangkalan di ${esc(basis.nama.replace(/ (International )?Airport$/, ""))}` : ""}`,
            kenapa: [[`${n(fmt(a.tanpaAkses.length) + " kompleks prioritas", SUMBER.akses, "model")} tidak terjangkau regu darat dalam ${ATURAN.jamTiba} jam`, "model"],
              [`Heli water bombing yang beroperasi di provinsi ini: ${a.wb == null ? n("tidak dilaporkan", "Provinsi ini di luar pantauan harian BNPB", "resmi") : n(fmt(a.wb) + " unit", SUMBER.bnpb, "resmi")}`, "resmi"]],
            biaya: `± ${n(rp(tambah * ASUMSI.heliJamHari * ASUMSI.heliJam * ATURAN.hariHeli), `${fmt(tambah)} heli × ${ASUMSI.heliJamHari} jam/hari × ${rp(ASUMSI.heliJam)}/jam × ${ATURAN.hariHeli} hari`, "model")} untuk ${ATURAN.hariHeli} hari`,
            waktu: `Mulai besok pagi, ${ATURAN.hariHeli} hari`, yakin: ["Sedang", `water bombing menahan api kecil–sedang; peluang api besar tertahan hanya ± ${pct(par("p_padam_heli", 0, .2))} (BNPB)`],
            bukti: {judul: `${namaProv(a.k)}: kompleks tanpa akses darat`, isi: () => this.tabelKompleks(a.tanpaAkses, true), prov: a.k}}); } }
      /* D. Panglima TNI & Kapolri: tambah regu ke kompleks dengan celah terbesar */
      { const cal = D.L.flatMap(x => x.kom3).filter(p => p._tiba != null && p._tiba <= ATURAN.jamTiba).map(p => ({p, celah: p._butuh - p._ada})).sort((a, b) => b.celah - a.celah)[0];
        if (cal && cal.celah >= 3) { const p = cal.p, orang = ASUMSI.porsiBKO * (UH[p.prov] || 380e3) + ASUMSI.porsiMPA * ASUMSI.honorMPA + ASUMSI.konsumsi;
          C.push({skor: 70 + cal.celah, op: p.prov, jenis: "regu", siapa: "Panglima TNI & Kapolri", apa: `Tambah ${fmt(cal.celah)} regu darat (BKO) ke ${esc(p.id)} ${esc(p.kec)}, ${esc(p.kab)}`,
            kenapa: [[`Keliling front api ± ${n(fmt(Math.round(p._keliling)) + " km", `${fmt(p.px24)} piksel VIIRS aktif 24 jam × 14 ha, dianggap lingkaran`, "satelit")}; perlu ${fmt(p._butuh)} regu agar terkurung ${ATURAN.hariKurung} hari`, "satelit"],
              [`Regu yang bisa tiba ≤ ${ATURAN.jamTiba} jam: ${n(fmt(p._ada), SUMBER.akses + "; regu posko menurut aturan tab Posko, regu Daops dari SiPongi", "model")}`, "model"]],
            biaya: `± ${n(rp(cal.celah * 15 * orang * ATURAN.hariBKO), `${fmt(cal.celah)} regu × 15 orang × ${rp(orang)}/orang/hari (uang harian SBM, honor MPA, konsumsi) × ${ATURAN.hariBKO} hari`, "model")} untuk ${ATURAN.hariBKO} hari`,
            waktu: `Tiba ± ${fmt(Math.round(p._tiba * 10) / 10)} jam setelah berangkat`, yakin: ["Sedang", "laju 150 m garis api per regu per jam adalah asumsi Simulasi; waktu tempuh dari OpenStreetMap"],
            bukti: {judul: `${p.id}: kebutuhan regu`, isi: () => this.buktiRegu(p), kom: p.id}}); } }
      /* E. OMC: provinsi dengan cuaca sangat berbahaya, gambut kering, banyak kompleks prioritas */
      { const ok = PRIO.map(k => P[k]).filter(x => x.pE >= .5 && x.p3 >= 5 && x.dc >= 350).sort((a, b) => b.p3 - a.p3).slice(0, 2);
        if (ok.length) { const awan = Math.max(...ok.map(x => x.pH || 0)), pos = ok.map(x => (D.ud?.omc || []).find(o => o.prov === x.k)).filter(Boolean);
          C.push({skor: 60 + ok[0].p3 / 10, jenis: "omc", siapa: "Kepala BNPB (pelaksana BMKG & TNI AU)", apa: `Siagakan operasi modifikasi cuaca di ${ok.map(x => namaProv(x.k)).join("–")} selama ${ATURAN.hariOMC} hari`,
            kenapa: [[`Peluang bahaya cuaca kebakaran sangat tinggi dalam 72 jam: ${ok.map(x => `${esc(namaProv(x.k))} ${n(pct(x.pE), SUMBER.ansambel, "model")}`).join(", ")}`, "model"],
              [`Peluang hujan alami ≥ 5 mm hanya ${ok.map(x => n(pct(x.pH), SUMBER.ansambel, "model")).join(" dan ")}; kekeringan gambut (DC) hingga ${n(fmt(Math.max(...ok.map(x => x.dc))), "Indeks kekeringan Kanada (DC), FWI hari ini; > 350 = gambut bisa membara", "model")}`, "model"]],
            biaya: `± ${n(rp(ok.length * ATURAN.hariOMC * par("biaya_omc_hari", 0, 220e6)), `${ok.length} posko × ${ATURAN.hariOMC} hari × ${rp(par("biaya_omc_hari", 0, 220e6))}/hari (Kemenhut 2026)`, "model")}${pos.length ? `; pangkalan ${pos.map(o => esc(o.nama.replace(/ (International )?Airport$/, ""))).join(", ")}` : ""}`,
            waktu: `Siaga mulai besok; semai hanya saat ada awan potensial`, yakin: awan >= .1 && awan <= .6 ? ["Sedang", "ada peluang awan hujan untuk disemai; efek ke luas terbakar lemah buktinya"] : ["Rendah", `peluang awan hujan kecil (${pct(awan)}); efek ke luas terbakar lemah buktinya`],
            bukti: {judul: "Cuaca 72 jam provinsi terpilih", isi: () => this.tabelCuaca(D, ok.map(x => x.k)), prov: ok[0].k}}); } }
      /* F. Gubernur: kesehatan & sekolah di kota berasap */
      { const x = PRIO.map(k => P[k]).filter(x => x.jiwaSTS >= 1e5 || x.jiwa >= 1e6).sort((a, b) => b.jiwaSTS - a.jiwaSTS || b.jiwa - a.jiwa)[0];
        if (x) { const kota = (D.dp?.udara?.kota || []).filter(c => c.prov === x.k && c.karhutla !== false && c.pm[0] > 55.4).sort((a, b) => b.pm[0] - a.pm[0]).slice(0, 3);
          C.push({skor: 65 + Math.min(9, x.jiwaSTS / 1e6), jenis: "kesehatan", siapa: `Gubernur ${namaProv(x.k)}`, apa: `Berlakukan belajar dari rumah dan buka posko kesehatan${kota.length ? " di " + daftar(kota.map(c => esc(c.nama))) : ""}`,
            kenapa: [[`${n(rb(x.jiwa) + " jiwa", SUMBER.asap, "model")} menghirup udara tidak sehat, ${n(rb(x.jiwaSTS), SUMBER.asap, "model")} di antaranya sangat tidak sehat atau berbahaya`, "model"],
              kota.length ? [`PM2.5 tertinggi ${esc(kota[0].nama)} ${n(fmt(kota[0].pm[0]) + " µg/m³", "CAMS via Open-Meteo, maksimum per jam hari ini; ambang ISPU tidak sehat 55,4", "model")}; tambahan kunjungan ISPA ± ${n(fmt(x.ispa) + "/hari", "Riskesdas 2018 × risiko relatif PM2.5 asap (dampak.json)", "model")}`, "model"]
                : [`Tambahan kunjungan ISPA ± ${n(fmt(x.ispa) + "/hari", "Riskesdas 2018 × risiko relatif PM2.5 asap (dampak.json)", "model")}`, "model"]],
            biaya: `Rendah: masker N95 ± ${rp(15e3)}/buah; posko memakai puskesmas`, waktu: "Mulai besok, selama PM2.5 > 150", yakin: ["Sedang", "prakiraan CAMS dan atribusi arah angin; belum diukur stasiun di semua kota"],
            bukti: {judul: `${namaProv(x.k)}: paparan asap`, isi: () => this.buktiAsap(D, x), prov: x.k}}); } }
      /* G. Kapolri & Menteri LH: areal konsesi (jenis x provinsi, tanpa nama pemegang) dengan >= 3 kompleks prioritas */
      { const id3 = new Set(D.L.flatMap(x => x.kom3.map(p => p.id)));
        const JK = {sawit: "Konsesi sawit", hti: "Konsesi HTI (hutan tanaman industri)", hph: "Konsesi HPH (hutan alam)", tambang: "Izin tambang", lain: "Konsesi lain"};
        const pt = (D.dp?.lahan?.konsesi || []).map(c => ({...c, nama: `${JK[c.jenis] || c.jenis} di ${namaProv(c.prov)}`, k3: c.kompleks.filter(id => id3.has(id))})).filter(c => c.k3.length >= 3).sort((a, b) => b.k3.length - a.k3.length);
        if (pt.length) C.push({skor: 40 + pt.length, jenis: "hukum", siapa: "Kapolri & Menteri LH", apa: `Periksa kepatuhan pemegang izin dan segel sementara lahan terbakar di areal konsesi yang memuat ≥ 3 kompleks api prioritas (${fmt(pt.length)} jenis areal × provinsi)`,
          kenapa: [[`Terbanyak: ${pt.slice(0, 2).map(c => `${esc(c.nama)} ${n(fmt(c.k3.length) + " kompleks", SUMBER.kompleks + "; batas konsesi: sawit/HPH ± 2014, HTI 2020–2022, tambang 2026", "satelit")}`).join("; ")}`, "satelit"],
            [`Membuka lahan dengan membakar dilarang UU 32/2009 Pasal 69 dan UU 39/2014 Pasal 56`, "resmi"]],
          biaya: "Dalam anggaran rutin Polri & KLH", waktu: "Mulai minggu ini", yakin: ["Rendah", "batas konsesi dari peta ± 2014; wajib dicek ke ATR/BPN dan KLH sebelum tindakan"],
          bukti: {judul: "Konsesi dengan api prioritas", isi: () => `<table class="tb3"><thead><tr><th>Jenis areal</th><th>Provinsi</th><th class="n">Kompleks prioritas</th></tr></thead><tbody>${pt.slice(0, 15).map(c => `<tr><td><b>${esc(JK[c.jenis] || c.jenis)}</b></td><td>${esc(namaProv(c.prov))}</td><td class="n">${c.k3.map(id => `<button class="link" data-kom="${esc(id)}">${esc(id)}</button>`).join(" ")}</td></tr>`).join("")}</tbody></table>`}}); }
      /* paling sedikit tiga kartu: lengkapi dengan langkah baku */
      if (C.length < 3) C.push({skor: 10, jenis: "status", siapa: "Kepala BNPB", apa: "Pertahankan patroli terpadu dan pencegahan di provinsi berstatus waspada", kenapa: [[`${n(fmt(D.nW) + " provinsi", "Aturan tingkat (lihat Aturan)", "model")} berstatus waspada`, "model"]], biaya: "Anggaran rutin", waktu: "Berjalan", yakin: ["Tinggi", "langkah baku SOP"], bukti: {judul: "Tingkat provinsi", isi: () => this.tabelTingkat(D, 1)}});
      /* bukti tambahan dari tab Operasi: kekurangan sumber daya provinsi kartu itu (model) */
      if (this.ops) for (const c of C) { const t = c.op && Operasi.kalimat(c.op); if (t) c.kenapa.push([`Rencana operasi ${esc(namaProv(c.op))}: ${n(esc(t), "Tab Operasi: kebutuhan regu, pompa, titik bor, dan heli per kompleks prioritas dikurangi yang sudah dilaporkan (operasi.json)", "model")}`, "model"]); }
      const per = {}; return C.sort((a, b) => b.skor - a.skor).filter(c => (per[c.jenis] = (per[c.jenis] || 0) + 1) <= 2).slice(0, 5);
    },

    /* ================= isi dialog bukti ================= */
    tabelTingkat(D, min = 0) {
      const rows = D.L.filter(x => x.lv >= min).sort((a, b) => b.lv - a.lv || b.p3 - a.p3);
      return `<div class="rk-tw"><table class="tb3"><thead><tr><th>Provinsi</th><th>Tingkat</th><th class="n">Kompleks prioritas</th><th class="n">Terpapar asap</th><th class="n">Cuaca sangat berbahaya 72 j</th><th>Pemicu</th></tr></thead><tbody>
        ${rows.map(x => `<tr><td><button class="link" data-rk-prov="${x.k}">${esc(namaProv(x.k))}</button></td><td>${lencana(x.lv)}</td><td class="n">${fmt(x.p3)}</td><td class="n">${rb(x.jiwa)}</td><td class="n">${pct(x.pE)}</td><td>${esc(x.alasan)}</td></tr>`).join("")}</tbody></table></div>`;
    },
    tabelKompleks(ks, akses) {
      return `<div class="rk-tw"><table class="tb3"><thead><tr><th>Kompleks</th><th>Lokasi</th><th class="n">Piksel aktif 24 j</th>${akses ? `<th class="n">Regu darat tercepat</th>` : ""}</tr></thead><tbody>
        ${ks.slice(0, 20).map(p => `<tr><td><button class="link" data-kom="${esc(p.id)}">${esc(p.id)}</button></td><td>${esc(p.kec)}, ${esc(p.kab)}</td><td class="n">${fmt(p.px24)}</td>${akses ? `<td class="n">${p._tiba == null ? "tidak ada rute ≤ 18 jam" : "± " + fmt(Math.round(p._tiba * 10) / 10) + " jam"}</td>` : ""}</tr>`).join("")}</tbody></table></div>
        <p class="fnd">Waktu tempuh dari jaringan jalan dan sungai OpenStreetMap; kondisi jalan, banjir, dan portal perusahaan tidak dimodelkan.</p>`;
    },
    tabelCuaca(D, ks) {
      return `<div class="rk-tw"><table class="tb3"><thead><tr><th>Provinsi</th><th class="n">FWI maks hari ini</th><th class="n">Peluang FWI ≥ 14</th><th class="n">Peluang FWI ≥ 7</th><th class="n">Peluang hujan ≥ 5 mm</th><th class="n">DC maks</th></tr></thead><tbody>
        ${ks.map(k => { const x = D.P[k]; return `<tr><td><button class="link" data-rk-prov="${k}">${esc(namaProv(k))}</button></td><td class="n">${fmt(x.fwi)}</td><td class="n">${pct(x.pE)}</td><td class="n">${pct(x.pT)}</td><td class="n">${pct(x.pH)}</td><td class="n">${fmt(x.dc)}</td></tr>`; }).join("")}</tbody></table></div>
        <p class="fnd">Peluang = porsi 51 skenario ECMWF, rata-rata sel provinsi, nilai tertinggi ${D.ansHari.map(hariN).join(", ")}. FWI = indeks bahaya cuaca kebakaran; ≥ 14 = sangat tinggi.</p>`;
    },
    buktiProv(D, x) {
      return `${this.tabelTingkat({...D, L: [x]})}<div class="lbl">Kompleks prioritas terbesar</div>${this.tabelKompleks(x.kom3, false)}`;
    },
    buktiRegu(p) {
      return `<table class="tb3"><tbody><tr><td>Piksel aktif 24 jam</td><td class="n">${fmt(p.px24)}</td></tr><tr><td>Luas front (× 14 ha)</td><td class="n">± ${fmt(Math.round(p.px24 * 14))} ha</td></tr>
        <tr><td>Keliling bila lingkaran</td><td class="n">± ${fmt(Math.round(p._keliling * 10) / 10)} km</td></tr><tr><td>Garis kendali per regu</td><td class="n">${fmt(ATURAN.garisRegu)} km/hari (150 m/jam × 8 jam)</td></tr>
        <tr><td>Regu dibutuhkan (terkurung ${ATURAN.hariKurung} hari)</td><td class="n"><b>${fmt(p._butuh)}</b></td></tr></tbody></table>
        <div class="lbl">Regu yang tiba ≤ ${ATURAN.jamTiba} jam</div><table class="tb3"><tbody>${p._dekat.map(s => `<tr><td>${esc(s.dari)}</td><td class="n">${fmt(s.regu)} regu</td><td class="n">± ${fmt(s.jam)} jam</td></tr>`).join("") || `<tr><td>Tidak ada</td></tr>`}</tbody></table>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec" data-kom="${esc(p.id)}">Buka kompleks di peta</button><button class="btn sec" data-rk-sim="${esc(p.id)}">Bandingkan perlakuan (Simulasi)</button></div>`;
    },
    buktiAsap(D, x) {
      const kota = (D.dp?.udara?.kota || []).filter(c => c.prov === x.k).sort((a, b) => b.pm[0] - a.pm[0]), H = D.dp?.udara?.hari || [];
      return `<table class="tb3"><thead><tr><th>Kota</th>${H.map(t => `<th class="n">${hariN(t)}</th>`).join("")}<th>Asap karhutla?</th></tr></thead><tbody>
        ${kota.map(c => `<tr><td>${esc(c.nama)}</td>${c.pm.map(v => `<td class="n">${fmt(v)}</td>`).join("")}<td>${c.karhutla === false ? "tidak, polusi lain" : "ya"}</td></tr>`).join("")}</tbody></table>
        <p class="fnd">PM2.5 maksimum per jam (µg/m³), prakiraan CAMS. Ambang ISPU: 55,4 tidak sehat, 150,4 sangat tidak sehat.</p>`;
    },
    bukaBukti(i) {
      const c = this.D.kartu[i]; if (!c) return; const b = c.bukti;
      Berita.dlg(esc(b.judul), `${esc(c.siapa)} · ${c.apa}`, b.isi() + (b.prov ? `<div><button class="btn sec" data-rk-prov="${b.prov}">Buka ${esc(namaProv(b.prov))} di peta</button></div>` : "")
        + (b.kom && !/data-kom/.test(b.isi()) ? `<button class="btn sec" data-kom="${esc(b.kom)}">Buka kompleks di peta</button>` : ""));
      this.ikatDlg();
    },
    ikatDlg() { const d = $("#dlg");
      d.querySelectorAll("[data-rk-prov]").forEach(b => b.onclick = () => { d.close(); this.keProv(b.dataset.rkProv); });
      d.querySelectorAll("[data-rk-sim]").forEach(b => b.onclick = () => { d.close(); S.pilihK = b.dataset.rkSim; bukaTab("sim"); }); },
    keProv(k) { bukaTab("peta"); setTimeout(() => turun(k), 60); },

    /* ================= tampilan ================= */
    async render() {
      const el = $("#ringkasan"); if (!el) return;
      if (this.D && this._acuan !== +S.acuan) this.D = null;
      if (!this.D) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Menyiapkan ringkasan…</div>`;
        if (!await this.siap()) { el.innerHTML = `<div class="kosong">Data belum tersedia.</div>`; return; }
        if (!this.raw) await this.muat(); try { this.hitung(); this._acuan = +S.acuan; if (this.B) this.S = this.olahBerita(); } catch (e) { console.error(e); el.innerHTML = `<div class="kosong">Ringkasan gagal dihitung: ${esc(e.message)}</div>`; return; } }
      const D = this.D;
      el.innerHTML = this.hHero(D)
        + `<section class="rk-p rk-kpis" data-p="0" aria-label="Angka utama"><span class="mt-lbl rk-lblsek">Angka utama hari ini</span><div class="rk-kpi">${this.hKPI(D)}</div><div class="rk-sek">${this.hSek(D)}</div></section>
        <details class="mt-sek rk-p rk-sec rk-kartu" data-p="1" open>${sek(1, "centang", this.hKeputusan(D))}</details>
        <div class="rk-kanan"><details class="mt-sek rk-p rk-sec rk-petab" data-p="2" open>${sek(2, "pin", this.hPeta(D))}</details>
          <details class="mt-sek rk-p rk-sec rk-72" data-p="2" open>${sek(3, "awan", this.h72(D))}</details></div>
        <details class="mt-sek rk-p rk-sec rk-akb" data-p="4" open>${sek(4, "jenjang", this.hAkun(D))}</details>
        <details class="mt-sek rk-p rk-sec rk-sen" data-p="3" id="rkSent" open>${sek(5, "teks", this.hSentimen())}</details>
        <p class="rk-kaki">Tingkat kewaspadaan di halaman ini adalah indeks pemantauan Posko, bukan status hukum. Status siaga dan tanggap darurat ditetapkan kepala daerah atau Presiden. Sumber: NASA FIRMS, ECMWF, CAMS/Copernicus, WorldPop, OpenStreetMap, BNPB, Google News.</p>`;
      this.ikat(el);
      this.petaMini(); this.tungguTitik();
      if (this.dinding) this.tampilPanel();
      if (!this.B) this.muatBerita();
    },
    hHero(D) {
      const K = D.kpi, sg = D.segar.map(([nm, t, j]) => [nm, t, j, ...segar(t, j)]), buruk = Math.max(...sg.map(x => x[3]));
      const lead = D.nD ? `${kata(D.nD)} provinsi berstatus darurat` : D.nS ? `${kata(D.nS)} provinsi berstatus siaga` : D.nW ? `${kata(D.nW)} provinsi berstatus waspada` : "Tidak ada provinsi di atas tingkat normal";
      const dk = K.hKmr ? K.h24 / K.hKmr - 1 : null;
      const kal = `${lead}; titik panas ${K.rasio != null ? desimal(K.rasio) + " kali normal" : fmt(K.h24) + " dalam 24 jam"}${dk == null ? "" : ` dan ${ubahKata(dk)} kemarin`}.`;
      const dar = D.hit(3).map(x => namaProv(x.k));
      const sub = `${dar.length ? `Darurat: ${esc(daftar(dar))}. ` : ""}${fmt(D.nS)} provinsi siaga, ${fmt(D.nW)} waspada.`;
      return `<header class="rk-hero">
        <div class="rk-hero-l"><p class="mt-lbl rk-eb">Situasi nasional · ${esc(tglPanjang(Date.now()))}</p>
          <p class="rk-st"><span class="rk-tag lv${D.lvNas}">${TINGKAT[D.lvNas]}</span><span>tingkat kewaspadaan nasional</span></p>
          <h1 class="rk-lead">${kal}</h1><p class="rk-sub">${sub}</p>
          <details class="mt-tek rk-why-st"><summary>Mengapa ${TINGKAT[D.lvNas].toLowerCase()}? Lihat hitungannya</summary><div class="mt-tekisi mt-contoh">${mtTangga(`Tingkat nasional hari ini: ${TINGKAT[D.lvNas]}`, "Dihitung dari tingkat tiap provinsi; ambang lengkap di Aturan status.", [
            ["in", "Provinsi berstatus darurat", "≥ 25 kompleks prioritas, atau ≥ 10 disertai asap atau cuaca berat", fmt(D.nD)],
            ["in", "Provinsi berstatus siaga", "≥ 3 kompleks prioritas, ≥ 1 juta jiwa terpapar, atau titik panas ≥ 3× normal", fmt(D.nS)],
            ["in", "Provinsi berstatus waspada", "", fmt(D.nW)],
            mtCek(D.nD >= 3, "Ada 3 provinsi darurat atau lebih?", "syarat tingkat nasional Darurat"),
            D.lvNas < 3 ? mtCek(D.nD >= 1 || D.nS >= 3, "Ada provinsi darurat, atau 3 provinsi siaga atau lebih?", "syarat tingkat nasional Siaga") : null,
            ["hasil", "Tingkat kewaspadaan nasional", "indeks pemantauan Posko, bukan status hukum", TINGKAT[D.lvNas]]]).replace("Contoh dengan data hari ini", "Hitungan dengan data hari ini")}</div></details></div>
        <div class="rk-hero-r">
          <details class="rk-segar"><summary><i class="rk-dot s${buruk}" aria-hidden="true"></i>Data per <b>${esc(jamWIB(D.asOf))}</b><span class="sr"> · ${["semua sumber segar", "ada sumber terlambat", "ada sumber basi"][buruk]}; buka rincian</span></summary>
            <div class="rk-pop"><p>Kesegaran data per sumber</p><ul>${sg.map(([nm, t, j, s, u]) => `<li><i class="rk-dot s${s}" aria-hidden="true"></i><span>${nm}<small>${t ? esc(jamWIB(t)) : "–"} · diharapkan ≤ ${j} jam</small></span><b>${u}</b></li>`).join("")}</ul></div></details>
          <div class="rk-aksi"><button class="btn pri" data-rk="cetak">Unduh brief</button><button class="btn sec" data-rk="dinding" aria-pressed="${!!this.dinding}">Layar besar</button></div>
          <button class="rk-lnk" data-rk="aturan">Aturan status</button></div></header>`;
    },
    hKPI(D) {
      const K = D.kpi, L = K.luas, dk = K.hKmr ? K.h24 / K.hKmr - 1 : null, jb = K.jiwaPrio ? K.jiwaBesok / K.jiwaPrio - 1 : null;
      const kp = (ik, judul, nilai, unit, jenis, sumber, konteks, viz) => `<article class="rk-k"><header><h3><i class="rk-ki">${mtIkon(ik)}</i>${judul}</h3>${tag(jenis)}</header>
        <p class="rk-kv">${n(nilai, sumber, jenis)}${unit ? `<small>${unit}</small>` : ""}</p><p class="rk-kc">${konteks}</p><div class="rk-viz">${viz || ""}</div></article>`;
      const spark = this.spark(K.titikHari);
      const H = D.dp?.udara?.hari || [], aj = H.map((_, i) => PRIO.reduce((a, k) => { const j = D.dp.udara.prov?.[k]?.jiwa?.[i]; return a + (j ? j[2] + j[3] + j[4] : 0); }, 0)), am = Math.max(...aj, 1);
      const asap = D.adaAsap && aj.length ? `<div class="rk-cols" aria-hidden="true">${aj.map((v, i) => `<i style="--h:${Math.max(4, v / am * 100)}%" title="${hariN(H[i])}: ${rb(v)}"></i>`).join("")}</div><span>prakiraan ${fmt(aj.length)} hari</span>` : "";
      const tot = K.naik + K.turun, split = tot ? `<div class="rk-split" aria-hidden="true"><i style="flex:${K.naik}"></i><i style="flex:${K.turun}"></i></div><span>membesar · mengecil</span>` : "";
      const sk = L ? Math.max(L[2], (K.luasNormal || 0) * 1.15) : 1, rng = L ? `<div class="rk-rng" aria-hidden="true"><i style="left:${L[0] / sk * 100}%;width:${(L[2] - L[0]) / sk * 100}%"></i><b style="left:${L[1] / sk * 100}%"></b>${K.luasNormal ? `<u style="left:${K.luasNormal / sk * 100}%"></u>` : ""}</div><span>rentang perkiraan${K.luasNormal ? " · garis = median tahunan" : ""}</span>` : "";
      return [
        kp("sensor", "Titik panas 24 jam", fmt(K.h24), "", "satelit", `${SUMBER.titik}; 24 jam s.d. ${jamWIB(D.asOf)}; normal = median VIIRS 2015–2025`, [K.rasio != null ? `${desimal(K.rasio)}× normal` : "", dk != null ? `${ubahKata(dk)} kemarin` : ""].filter(Boolean).join(" · "), spark),
        kp("kelompok", "Kompleks prioritas", fmt(K.k3), "", "satelit", SUMBER.kompleks, `front membesar di ${fmt(K.naik)}, mengecil di ${fmt(K.turun)}`, split),
        kp("awan", "Terpapar asap karhutla", D.adaAsap ? rb(K.jiwaPrio) : "–", D.adaAsap ? "jiwa" : "", "model", `${SUMBER.asap}; 9 provinsi prioritas; seluruh Indonesia ${rb(K.jiwaNas)}`,
          D.adaAsap ? `9 provinsi prioritas${jb != null ? ` · besok ${Math.abs(jb) < .005 ? "tetap" : (jb > 0 ? "naik " : "turun ") + pct(Math.abs(jb))}` : ""}` : "data asap belum tersedia", asap),
        kp("grafik", "Luas terbakar musim ini", L ? rb(L[1]) : "–", L ? "ha" : "", "model", SUMBER.luas, L ? `${rb(L[0])}–${rb(L[2])} ha${K.luasNormal ? ` · ${desimal(L[1] / K.luasNormal)}× median tahunan` : ""}` : "", rng),
      ].join("");
    },
    hSek(D) {
      const K = D.kpi, s = (v, t, sub) => `<div class="rk-s"><b>${v}</b><span>${t}${sub ? `<small>${sub}</small>` : ""}</span></div>`, dp = K.kjL.length ? K.kj7.length / K.kjL.length - 1 : null;
      return [
        s(n(fmt(D.nD + D.nS), "Aturan tingkat Posko (lihat Aturan status) dari kompleks, asap, dan cuaca", "model"), "provinsi siaga atau darurat", `${fmt(D.nD)} darurat · ${fmt(D.nS)} siaga · ${fmt(D.nW)} waspada`),
        s(n(fmt(K.k2), SUMBER.kompleks, "satelit"), "kompleks siaga", "di luar kompleks prioritas"),
        s(n(fmt(K.kj7.length), SUMBER.pesawat, "berita"), "gangguan penerbangan, 7 hari", `${fmt(K.bandara7)} bandara${dp != null ? ` · ${ubahKata(dp)} pekan sebelumnya` : ""}`),
        s(n(K.bnpbHa != null ? rb(K.bnpbHa) : "–", SUMBER.bnpb + ", lahan terbakar indikatif", "resmi"), "ha terbakar menurut BNPB", "laporan resmi, 6 provinsi"),
      ].join("");
    },
    hKeputusan(D) {
      return `<header class="rk-sh"><h2 id="rkKpJ">Keputusan hari ini</h2><p>${kata(D.kartu.length)} keputusan, diurutkan dari yang paling mendesak</p></header>
        <ol class="rk-kps">${D.kartu.map((c, i) => `<li class="rk-kp${i ? "" : " utama"}"><span class="mt-tt rk-no" aria-hidden="true">${i + 1}</span>
          <div class="rk-kp-isi"><p class="rk-siapa">${esc(c.siapa)}</p><p class="rk-apa">${c.apa}</p>
            <ul class="rk-why">${c.kenapa.map(([t]) => `<li>${t}</li>`).join("")}</ul>
            <button class="rk-lnk" data-bukti="${i}">Lihat bukti <span aria-hidden="true">→</span></button></div>
          <dl class="rk-fakta"><div><dt>Biaya</dt><dd>${c.biaya}</dd></div><div><dt>Waktu</dt><dd>${esc(c.waktu)}</dd></div>
            <div><dt>Keyakinan</dt><dd><span class="rk-yk" tabindex="0" data-tip="${esc("Keyakinan " + c.yakin[0].toLowerCase() + ": " + c.yakin[1])}">${c.yakin[0]}</span></dd></div></dl></li>`).join("")}</ol>`;
    },
    /* peta mini MapLibre: hanya 9 provinsi prioritas diwarnai paparan asap (4 kelas satu warna), titik = kompleks prioritas */
    RAMP: ["#f3d5c8", "#e49a7e", "#c9503a", "#7a2b2b"],
    hPeta(D) {
      const pr = PRIO.map(k => D.P[k]).filter(x => x.jiwa >= 1e5).sort((a, b) => b.jiwa - a.jiwa), ks = D.L.flatMap(x => x.kom3).sort((a, b) => b.px24 - a.px24);
      const banyak = [...D.L].sort((a, b) => b.p3 - a.p3)[0];
      const judul = D.adaAsap && pr.length ? `Asap tidak sehat paling luas di ${daftar(pr.slice(0, 2).map(x => namaProv(x.k)))}` : `Kompleks prioritas terbanyak di ${namaProv(banyak.k)}`;
      const tg = (D.dp?.udara?.tetangga || []).filter(c => c.karhutla && Math.max(...c.pm) > 55.4);
      return `<header class="rk-sh"><h2 id="rkPetaJ">${esc(judul)}</h2><p>${fmt(ks.length)} kompleks prioritas; warna provinsi = penduduk yang menghirup udara tidak sehat akibat asap karhutla</p></header>
        <div class="rk-kartu-p"><div class="rk-peta" id="rkPeta" role="img" aria-label="Peta Indonesia: ${fmt(ks.length)} kompleks prioritas; provinsi prioritas diwarnai jumlah penduduk terpapar asap karhutla${tg.length ? "; asap mencapai " + esc(tg.map(c => c.nama).join(", ")) : ""}"></div>
        <div class="rk-pleg"><span class="rk-ramp">Terpapar asap ${tag("model")}${["10 rb", "500 rb", "2 jt", "5 jt"].map((t, i) => `<i style="--c:${this.RAMP[i]}"></i>${t}`).join("")}</span>
          <span><i class="o"></i>kompleks prioritas, besar = front aktif ${tag("satelit")}</span>${tg.length ? `<span><i class="q"></i>kota tetangga berasap</span>` : ""}</div>
        <p class="rk-top"><span>Terbesar</span> ${ks.slice(0, 5).map(p => `<button class="rk-lnk" data-kom="${esc(p.id)}">${esc(p.id)} ${esc(p.kab)}</button>`).join(" ")}</p></div>`;
    },
    petaMini() {
      const el = $("#rkPeta"); if (!el || typeof maplibregl === "undefined") return;
      const D = this.D, gl = gelap() || !!this.dinding, tip = $("#tip"); if (this.peta) this.peta.remove();
      const m = this.peta = new maplibregl.Map({container: el, style: this.dinding ? "https://tiles.openfreemap.org/styles/dark" : DASAR(), bounds: [[95, -11], [141.2, 6]], fitBoundsOptions: {padding: 10}, attributionControl: {compact: true},
        dragPan: false, scrollZoom: false, boxZoom: false, dragRotate: false, keyboard: false, doubleClickZoom: false, touchZoomRotate: false, touchPitch: false});
      const fc = features => ({type: "FeatureCollection", features}), pt = (lon, lat, properties) => ({type: "Feature", geometry: {type: "Point", coordinates: [lon, lat]}, properties});
      const ks = D.L.flatMap(x => x.kom3).sort((a, b) => b.px24 - a.px24), top = ks.slice(0, 5);
      const tg = (D.dp?.udara?.tetangga || []).filter(c => c.karhutla && Math.max(...c.pm) > 55.4);
      const halo = gl ? "rgba(10,20,40,.85)" : "rgba(255,255,255,.92)", teks = gl ? "#e8edf4" : "#0b2545";
      m.on("load", () => {
        /* wadah bisa belum berukuran saat peta dibuat (panel layar besar baru tampil): ukur ulang lalu bingkai ulang */
        m.resize(); m.fitBounds([[95, -11], [141.2, 6]], {padding: 10, animate: false});
        for (const l of m.getStyle().layers) if (l.type === "symbol") m.setLayoutProperty(l.id, "visibility", "none");
        m.addSource("rkProv", {type: "geojson", data: fc((S.geo.prov?.features || []).filter(f => PRIO.includes(f.properties.kode)).map(f => ({type: "Feature", geometry: f.geometry, properties: {k: f.properties.kode, j: D.P[f.properties.kode]?.jiwa || 0}})))});
        m.addLayer({id: "rkProv", type: "fill", source: "rkProv", paint: {"fill-color": ["step", ["get", "j"], gl ? "rgba(255,255,255,.05)" : "rgba(11,37,69,.04)", 1e4, this.RAMP[0], 5e5, this.RAMP[1], 2e6, this.RAMP[2], 5e6, this.RAMP[3]], "fill-opacity": gl ? .78 : .9}});
        m.addLayer({id: "rkProvG", type: "line", source: "rkProv", paint: {"line-color": gl ? "#fff" : "#0b2545", "line-opacity": gl ? .3 : .22, "line-width": .7}});
        m.addSource("rkKom", {type: "geojson", data: fc(ks.map(p => pt(p.lon, p.lat, {id: p.id, kab: p.kab, kec: p.kec, px: p.px24})))});
        m.addLayer({id: "rkKom", type: "circle", source: "rkKom", layout: {"circle-sort-key": ["-", 0, ["get", "px"]]}, paint: {"circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "px"]], 1, 2.5, 20, 11],
          "circle-color": gl ? "#f2c879" : "#0b2545", "circle-opacity": .78, "circle-stroke-color": gl ? "#0b1830" : "#fff", "circle-stroke-width": 1}});
        m.addSource("rkLbl", {type: "geojson", data: fc([...top.map(p => pt(p.lon, p.lat, {t: p.id})), ...tg.map(c => pt(c.lon, c.lat, {t: c.nama, q: 1}))])});
        m.addLayer({id: "rkTg", type: "circle", source: "rkLbl", filter: ["==", ["get", "q"], 1], paint: {"circle-radius": 3.5, "circle-color": "#5f6fb0", "circle-stroke-color": gl ? "#0b1830" : "#fff", "circle-stroke-width": 1.2}});
        m.addLayer({id: "rkLbl", type: "symbol", source: "rkLbl", layout: {"text-field": ["get", "t"], "text-font": ["Noto Sans Bold"], "text-size": 11.5, "text-anchor": "left", "text-offset": [.8, 0],
          "text-variable-anchor": ["left", "right", "top", "bottom"], "text-radial-offset": .8, "text-justify": "auto"}, paint: {"text-color": ["case", ["==", ["get", "q"], 1], gl ? "#b9c3ff" : "#3f4d94", teks], "text-halo-color": halo, "text-halo-width": 1.6}});
        const taruh = (e, h) => { tip.innerHTML = h; tip.classList.add("on"); tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, e.originalEvent.clientX + 14) + "px"; tip.style.top = Math.max(8, e.originalEvent.clientY - tip.offsetHeight - 12) + "px"; m.getCanvas().style.cursor = "pointer"; };
        m.on("mousemove", "rkProv", e => { if (m.queryRenderedFeatures(e.point, {layers: ["rkKom"]}).length) return; const x = D.P[e.features[0].properties.k];
          taruh(e, `<b>${esc(namaProv(x.k))}</b> · ${TINGKAT[x.lv]}<br>${fmt(x.p3)} kompleks prioritas<br>${rb(x.jiwa)} jiwa udara tidak sehat (model)<br><small>klik untuk buka di peta</small>`); });
        m.on("mousemove", "rkKom", e => { const p = e.features[0].properties; taruh(e, `<b>${esc(p.id)}</b> · ${esc(p.kec)}, ${esc(p.kab)}<br>${fmt(p.px)} piksel aktif 24 jam (satelit)<br><small>klik untuk rincian</small>`); });
        ["rkProv", "rkKom"].forEach(l => m.on("mouseleave", l, () => { tip.classList.remove("on"); m.getCanvas().style.cursor = ""; }));
        m.on("click", e => { tip.classList.remove("on"); const k = m.queryRenderedFeatures(e.point, {layers: ["rkKom"]})[0]; if (k) { bukaTab("peta"); return Laci.buka(k.properties.id); }
          const p = m.queryRenderedFeatures(e.point, {layers: ["rkProv"]})[0]; if (p) this.keProv(p.properties.k); });
      });
    },
    h72(D) {
      const H = D.ansHari, bar = (p, c) => `<span class="rk-bar ${c}" style="--p:${Math.round((p || 0) * 100)}%"><i></i><b>${pct(p)}</b></span>`;
      const rows = PRIO.map(k => D.P[k]).sort((a, b) => (b.pE || 0) - (a.pE || 0)), besar = rows.filter(x => x.pE >= .5);
      const tg = (D.dp?.udara?.tetangga || []).filter(c => c.karhutla && Math.max(...c.pm.slice(0, 3)) > 55.4);
      return `<header class="rk-sh"><h2 id="rk72J">${besar.length ? `Cuaca sangat berbahaya berpeluang besar di ${esc(daftar(besar.map(x => namaProv(x.k))))}` : "Tidak ada provinsi prioritas dengan peluang cuaca sangat berbahaya ≥ 50%"}</h2>
          <p>Prakiraan 72 jam${H.length ? `, ${hariN(H[0])}–${hariN(H.at(-1))}` : ""}; peluang dari 51 skenario cuaca ECMWF ${tag("model")}</p></header>
        <div class="rk-kartu-p"><div class="rk-tw"><table class="rk-t"><thead><tr><th>Provinsi</th><th>Cuaca sangat berbahaya</th><th>Hujan ≥ 5 mm</th><th class="n">Terpapar asap, hari ini → hari ke-4</th></tr></thead><tbody>
        ${rows.map(x => { const v = (D.dp?.udara?.prov?.[x.k]?.jiwa || []).map(a => a[2] + a[3] + a[4]), a0 = v[0] || 0, akhir = v.at(-1) ?? 0;
          return `<tr><td><button class="link" data-rk-prov="${x.k}">${esc(namaProv(x.k))}</button></td><td>${bar(x.pE, x.pE >= .5 ? "tinggi" : "")}</td><td>${bar(x.pH, "hujan")}</td>
            <td class="n">${!D.adaAsap ? "–" : `${n(rb(a0), SUMBER.asap, "model")} <span class="rk-ar">→</span> ${n(rb(akhir), SUMBER.asap + "; prakiraan hari ke-4", "model")}${akhir > a0 * 1.1 ? ` <span class="rk-arah naik">naik</span>` : akhir < a0 * .9 ? ` <span class="rk-arah">turun</span>` : ""}`}</td></tr>`; }).join("")}</tbody></table></div>
        <p class="rk-cat">${tg.length ? `Asap diperkirakan mencapai ${tg.map(c => `${esc(c.nama)} (${n(fmt(Math.max(...c.pm.slice(0, 3))) + " µg/m³", "PM2.5 maksimum per jam, CAMS; tetangga dihitung bila ada kompleks api searah angin", "model")})`).join(", ")}.` : "Asap belum diperkirakan mencapai negara tetangga pada tingkat tidak sehat."}
          Cuaca sangat berbahaya = indeks FWI ≥ 14: api mudah menyala dan cepat menjalar.</p></div>`;
    },
    hAkun(D) {
      const R = D.AK.map(a => { const ada = a.reguMA + (a.setara || 0), kr = a.setara == null ? null : a.reguButuh - ada, hk = a.wb == null ? null : a.heliButuh - a.wb;
        const celah = [kr > 0 ? `kurang ${fmt(kr)} regu` : "", hk > 0 ? `kurang ${fmt(hk)} heli` : ""].filter(Boolean), belum = [kr == null && a.reguButuh > a.reguMA ? "personel gabungan" : "", a.wb == null && a.heliButuh ? "heli" : ""].filter(Boolean);
        return {a, ada, celah, belum}; });
      const nk = R.filter(r => r.celah.length).length, nb = R.filter(r => !r.celah.length && r.belum.length).length;
      const judul = nk ? `Regu atau heli kurang di ${kata(nk).toLowerCase()} dari ${fmt(R.length)} provinsi prioritas` : `Tidak ada kekurangan yang terlapor di ${fmt(R.length)} provinsi prioritas`;
      return `<header class="rk-sh"><h2 id="rkAkJ">${judul}</h2><p>Kebutuhan ${tag("model")} menurut aturan tab Posko; yang ada ${tag("resmi")} dari laporan BNPB dan SiPongi${nb ? `; ${fmt(nb)} provinsi belum melaporkan sebagian sumber daya` : ""}</p></header>
        <div class="rk-kartu-p"><div class="rk-tw"><table class="rk-t rk-akun"><thead><tr><th>Provinsi</th><th>Dansatgas</th><th class="n">Regu perlu / ada</th><th class="n">Heli perlu / ada</th><th>Celah</th></tr></thead><tbody>
        ${R.map(({a, ada, celah, belum}) => `<tr><td><button class="link" data-rk-prov="${a.k}">${esc(namaProv(a.k))}</button> ${lencana(a.x.lv)}</td>
            <td><span tabindex="0" data-tip="${esc(`Gubernur menetapkan status · Dansatgas: Danrem ${KOREM[a.k] || "–"}${a.pusat ? ` · posko provinsi ${a.pusat.nama}` : ""}`)}">Danrem ${esc(KOREM[a.k] || "–")}</span></td>
            <td class="n">${n(fmt(a.reguButuh), "Jumlah regu posko lapangan yang direkomendasikan (aturan tab Posko)", "model")} / ${n(a.setara == null ? fmt(ada) + "+" : fmt(ada), `Manggala Agni ${fmt(a.reguMA)} regu (SiPongi)${a.setara != null ? ` + personel gabungan BNPB ${fmt(a.personel)} orang ÷ 15` : "; personel gabungan tidak dilaporkan"}`, "resmi")}</td>
            <td class="n">${n(fmt(a.heliButuh), `≥ ${ASUMSI.heliUnit} per provinsi berprioritas, atau 1 heli per 2 kompleks tanpa akses darat ≤ ${ATURAN.jamTiba} jam`, "model")} / ${a.wb == null ? n("–", "Di luar pantauan harian BNPB", "resmi") : n(fmt(a.wb), SUMBER.bnpb + ": WB beroperasi + siaga", "resmi")}</td>
            <td>${[celah.length ? `<b class="rk-gap">${celah.join(", ")}</b>` : "", belum.length ? `<span class="rk-mute">${belum.join(" dan ")} belum dilaporkan</span>` : ""].filter(Boolean).join("<br>") || `<span class="rk-mute">cukup</span>`}</td></tr>`).join("")}</tbody></table></div>
        <p class="rk-cat">Dansatgas provinsi = Danrem, wakil Wakapolda dan Kalaksa BPBD; status ditetapkan Gubernur. Regu = 15 orang. Personel gabungan BNPB mencakup TNI, Polri, BPBD, MPA, dan regu perusahaan.</p></div>`;
    },

    /* ================= sentimen publik (berita.json dimuat terpisah: ± 4,5 MB) ================= */
    muatBerita() { return this._pb ||= this._muatBerita(); },
    async _muatBerita() {
      /* berita.json utuh (± 1,7 MB gzip) hanya bila tab Berita sudah memuatnya atau ringkasan.json tidak memuat potongannya */
      try { this.B = Berita.d || this.rk?.berita || await muatJSON("data/berita.json"); if (!this.rk?.berita) Berita.d ||= this.B; this.S = this.olahBerita(); } catch (e) { this.B = false; }
      const el = $("#rkSent"); if (el) el.innerHTML = sek(5, "teks", this.hSentimen());
      const s = this.D?.segar; if (s && this.B && !s.some(x => x[0] === "Berita")) { s.push(["Berita", this.B.dibuat, 26]); const st = $("#ringkasan .rk-hero"); if (st) st.outerHTML = this.hHero(this.D); }
    },
    olahBerita() {
      const B = this.B, hari = Object.keys(B.harian).sort(), h3 = hari.slice(-3), h7 = hari.slice(-7), sum = (hs, f) => hs.reduce((a, t) => a + (f(B.harian[t]) || 0), 0);
      const n3 = sum(h3, x => x.n), topik = {}; for (const t of h3) for (const [k, v] of Object.entries(B.harian[t].per_topik || {})) topik[k] = (topik[k] || 0) + v;
      const emo = k => sum(h3, x => x.emosi?.[k]);
      const t7 = h7[0], art7 = B.artikel.filter(a => a.tgl.slice(0, 10) >= t7), intl = art7.filter(a => a.asal === "internasional"), intlL = sum(hari.slice(-14, -7), x => x.n_int);
      const neg = {}; for (const a of intl) { const c = negaraMedia(a.domain, a.sumber) || "lainnya"; neg[c] = (neg[c] || 0) + 1; }
      const DESAK = /\b(desak|mendesak|minta|meminta|tuntut|menuntut|harap|berharap|perlu|butuh|imbau|mengimbau|usul|mengusulkan)\b/i;
      const MINTA = [["Status darurat dan penanganan cepat", /status (siaga|tanggap )?darurat|tanggap darurat|percepat/i], ["Pemadaman udara dan hujan buatan", /water ?bombing|heli|hujan buatan|\btmc\b|\bomc\b|modifikasi cuaca/i],
        ["Perlindungan kesehatan (masker, posko)", /masker|ispa|posko kesehatan|oksigen|kesehatan/i], ["Sekolah libur atau belajar dari rumah", /sekolah|libur|daring|\bpjj\b|belajar dari rumah/i],
        ["Penegakan hukum terhadap pembakar", /tangkap|pidana|hukum|cabut izin|sanksi|gugat|segel|pelaku|tersangka/i], ["Bantuan dan anggaran", /bantuan|anggaran|\bdana\b|logistik/i]];
      const tuntut = art7.filter(a => a.asal !== "internasional" && DESAK.test(a.judul));
      const minta = MINTA.map(([nm, re]) => { const a = tuntut.filter(x => re.test(x.judul)); return {nm, n: a.length, contoh: a[0]}; }).filter(x => x.n).sort((a, b) => b.n - a.n);
      /* pantauan misinformasi: klaim padam/terkendali di wilayah yang satelit masih melihat api */
      const KLAIM = /\b((sudah|telah|berhasil) (padam|dipadamkan|terkendali|dikendalikan)|api (sudah )?padam|padam total|padam seluruhnya|terkendali sepenuhnya|nihil titik|bebas (asap|titik)|tidak ada (lagi )?titik( panas| api)?|sudah aman)\b/i,
        KECUALI = /\b(belum|masih|tak|tidak kunjung|sulit|gagal|kembali|lagi|upaya|berupaya|terus|meluas)\b|\?/i;
      const P = this.D.P, k24 = this.D.kab24, kom3 = new Map(); for (const x of this.D.L) for (const p of x.kom3) kom3.set(p.prov + "|" + p.kab, (kom3.get(p.prov + "|" + p.kab) || 0) + 1);
      const mis = B.artikel.filter(a => a.tgl.slice(0, 10) >= h3[0] && a.asal !== "internasional" && KLAIM.test(a.judul) && !KECUALI.test(a.judul)).map(a => {
        const kb = a.kab?.[0], pv = a.prov?.[0];
        if (kb && ((k24[kb] || 0) >= 20 || kom3.get(kb))) return {a, wil: kb.split("|")[1], h: k24[kb] || 0, k: kom3.get(kb) || 0};
        if (!kb && pv && P[pv]?.h24 >= 100 && P[pv].p3) return {a, wil: namaProv(pv), h: P[pv].h24, k: P[pv].p3};
        return null; }).filter(Boolean);
      const sudah = new Set(), misU = mis.filter(m => !sudah.has(m.a.cerita) && sudah.add(m.a.cerita)).slice(0, 3);
      return {n3, h3, topik: Object.entries(topik).sort((a, b) => b[1] - a[1]).slice(0, 4), marah: emo("marah"), cemas: emo("cemas"), nInt: intl.length, intlL, neg: Object.entries(neg).filter(([c]) => c !== "lainnya").sort((a, b) => b[1] - a[1]).slice(0, 3),
        minta: minta.slice(0, 4), nTuntut: tuntut.length, mis: misU, sorot: (B.sorotan_nas || B.sorotan || [])[0]};
    },
    poinKomunikasi() {
      const D = this.D, rows = S.bnpb?.rows || [], per = rows.reduce((a, r) => a + (angkaID(r["Total Personel"]) || 0), 0), udara = rows.reduce((a, r) => a + (angkaID(r["Total Unit Udara Hari Ini"]) || 0), 0);
      const kota = (D.dp?.udara?.kota || []).filter(c => c.karhutla !== false && c.pm[0] > 150.4).sort((a, b) => b.pm[0] - a.pm[0]).slice(0, 4).map(c => c.nama);
      const kering = PRIO.filter(k => D.P[k].pE >= .5).map(namaProv);
      return [
        per ? `Pemerintah mengerahkan ${fmt(per)} personel gabungan (TNI, Polri, BPBD, Manggala Agni, Masyarakat Peduli Api, dan regu perusahaan) serta ${fmt(udara)} unit pesawat dan helikopter di ${fmt(rows.length)} provinsi pantauan BNPB.` : "",
        `Pemadaman diprioritaskan pada ${fmt(D.kpi.k3)} kompleks api terbesar yang dipantau satelit setiap 3 jam; daftar dan lokasinya terbuka di Posko Karhutla.`,
        kota.length ? `Warga ${daftar(kota.map(esc))} diimbau memakai masker N95, mengurangi kegiatan di luar ruang, dan melindungi anak, lansia, ibu hamil, serta penderita penyakit paru. Keadaan darurat: hubungi 112.` : "Warga di wilayah berasap diimbau memakai masker N95 dan mengurangi kegiatan di luar ruang. Keadaan darurat: hubungi 112.",
        kering.length ? `Cuaca 3 hari ke depan sangat mendukung api di ${daftar(kering.map(esc))}; masyarakat diminta tidak membakar dalam bentuk apa pun.` : "",
        "Membuka lahan dengan membakar dilarang (UU 32/2009 Pasal 69; UU 39/2014 Pasal 56) dan pelakunya diproses hukum.",
      ].filter(Boolean);
    },
    hSentimen() {
      const X = this.S, J = s => `<h3 class="rk-h3">${s}</h3>`;
      if (this.B === false) return `<header class="rk-sh"><h2 id="rkSentJ">Sentimen dan narasi publik</h2><p>Data berita belum tersedia.</p></header>`;
      if (!X) return `<header class="rk-sh"><h2 id="rkSentJ">Sentimen dan narasi publik</h2></header><div class="rk-kartu-p"><div class="kosong"><div class="spin"></div>Membaca berita…</div></div>`;
      const tot = Math.max(1, X.n3), src = `${SUMBER.berita}; ${X.h3[0]} s.d. ${X.h3.at(-1)}`, mm = Math.max(1, ...X.minta.map(m => m.n));
      const baris = (nama, nilai, p, ekstra = "") => `<li><span class="rk-bl"><span>${nama}</span>${nilai}</span><span class="rk-hb" style="--p:${Math.round(p * 100)}%"></span>${ekstra}</li>`;
      const di = X.intlL ? X.nInt / X.intlL - 1 : null;
      return `<header class="rk-sh"><h2 id="rkSentJ">${X.minta.length ? `Publik paling banyak meminta ${esc(X.minta[0].nm.toLowerCase())}` : "Sentimen dan narasi publik"}</h2>
          <p>${fmt(X.n3)} berita karhutla dalam 3 hari terakhir ${tag("berita")}</p></header>
        <div class="rk-kartu-p rk-sg">
          <div>${J("Yang diminta publik, 7 hari")}<ul class="rk-bars">${X.minta.map(m => baris(esc(m.nm), n(fmt(m.n), `${fmt(X.nTuntut)} judul memuat kata desak/minta/tuntut/harap/perlu`, "berita"), m.n / mm,
              m.contoh ? `<a href="${escUrl(m.contoh.url)}" target="_blank" rel="noopener" class="rk-con">${esc(m.contoh.judul)} · ${esc(m.contoh.sumber)}</a>` : "")).join("") || "<li>Tidak ada tuntutan yang menonjol.</li>"}</ul></div>
          <div>${J("Topik utama, 3 hari")}<ul class="rk-bars">${X.topik.map(([k, v]) => baris(esc(TOPIK_B[k] || k), n(pct(v / tot), src, "berita"), v / tot)).join("")}</ul>
            <div class="rk-duo"><div>${J("Nada judul")}<p>Marah ${n(pct(X.marah / tot), src + "; kamus kata (kecam, desak, lamban…)", "berita")} · cemas ${n(pct(X.cemas / tot), src + "; kamus kata (ancam, waspada, bahaya…)", "berita")}</p></div>
              <div>${J("Media luar negeri, 7 hari")}<p>${n(fmt(X.nInt) + " berita", SUMBER.berita + "; media luar negeri", "berita")}${di != null ? `, ${ubahKata(di)} pekan sebelumnya` : ""}${X.neg.length ? `<small>terbanyak ${X.neg.map(([c, v]) => `${esc(c)} ${fmt(v)}`).join(", ")}</small>` : ""}</p></div></div></div>
          <div>${J("Usulan bahan komunikasi publik")}<ol class="rk-kom">${this.poinKomunikasi().map(t => `<li>${t}</li>`).join("")}</ol>
            ${J("Perlu diklarifikasi")}${X.mis.length ? `<ul class="rk-mis">${X.mis.map(m => `<li><a href="${escUrl(m.a.url)}" target="_blank" rel="noopener">${esc(m.a.judul)}</a> <small>${esc(m.a.sumber)} · ${m.a.tgl.slice(8, 10)}/${m.a.tgl.slice(5, 7)}</small><br>Satelit masih mendeteksi ${n(fmt(m.h) + " titik", SUMBER.titik + "; 24 jam terakhir", "satelit")} dalam 24 jam di ${esc(m.wil)}${m.k ? ` dan ${fmt(m.k)} kompleks prioritas` : ""}.</li>`).join("")}</ul>
              <p class="rk-cat">Bukan berarti berita keliru: api lokal yang diberitakan bisa memang padam sementara api lain di wilayah yang sama masih menyala. Perlu klarifikasi ke posko setempat.</p>` : `<p class="rk-cat">Tidak ada berita 3 hari terakhir yang menyatakan api padam di wilayah yang satelitnya masih mendeteksi api.</p>`}</div>
        </div>`;
    },

    /* ================= interaksi ================= */
    ikat(el) {
      el.onclick = e => {
        const b = e.target.closest("[data-rk]"); if (b) return this[{aturan: "aturan", cetak: "cetak", dinding: "togDinding"}[b.dataset.rk]]();
        const bk = e.target.closest("[data-bukti]"); if (bk) return this.bukaBukti(+bk.dataset.bukti);
        const pv = e.target.closest("[data-rk-prov]"); if (pv) return this.keProv(pv.dataset.rkProv);
        const km = e.target.closest("[data-kom]"); if (km) { bukaTab("peta"); return Laci.buka(km.dataset.kom); } };
    },
    aturan() {
      Berita.dlg("Aturan tingkat kewaspadaan dan kartu keputusan", "Dihitung otomatis dari data; angka ambang bisa diubah di ringkasan.js (ATURAN) dan didokumentasikan di RINGKASAN.md",
        `<div class="lbl">Tingkat provinsi (dicek berurutan)</div><ol class="rk-li"><li><b>Darurat</b>: ≥ 25 kompleks prioritas; atau ≥ 10 kompleks prioritas dan (≥ 1 juta jiwa terpapar asap karhutla tidak sehat atau peluang FWI ≥ 14 dalam 72 jam ≥ 50%).</li>
          <li><b>Siaga</b>: ≥ 3 kompleks prioritas; atau ≥ 1 juta jiwa terpapar asap karhutla tidak sehat; atau titik panas VIIRS S-NPP 24 jam ≥ 3× normal dan ≥ 300 titik.</li>
          <li><b>Waspada</b>: ≥ 1 kompleks prioritas; atau ≥ 5 kompleks siaga; atau peluang FWI ≥ 14 ≥ 30%; atau ≥ 100 ribu jiwa terpapar.</li><li><b>Normal</b>: selain itu.</li></ol>
        <div class="lbl">Tingkat nasional</div><p class="rk-p0">Darurat bila ≥ 3 provinsi darurat; Siaga bila ≥ 1 provinsi darurat atau ≥ 3 provinsi siaga; Waspada bila ada provinsi siaga atau waspada.</p>
        <div class="lbl">Kartu keputusan</div><ol class="rk-li"><li>Presiden: bila tingkat nasional darurat.</li><li>Gubernur, status tanggap darurat: provinsi darurat dengan kompleks prioritas terbanyak.</li>
          <li>Kepala BNPB, helikopter: provinsi dengan kompleks prioritas terbanyak yang tidak terjangkau regu darat ≤ ${ATURAN.jamTiba} jam; 1 heli per ${fmt(ASUMSI.heliJamHari / (Kp.d?.param?.jam_heli_per_api?.[0] ?? 3))} kompleks (${ASUMSI.heliJamHari} jam terbang/hari ÷ ${fmt(Kp.d?.param?.jam_heli_per_api?.[0] ?? 3)} jam per api), dikurangi heli yang dilaporkan BNPB.</li>
          <li>Panglima TNI & Kapolri, regu: kompleks prioritas terjangkau dengan selisih terbesar antara regu perlu (keliling front ÷ ${fmt(ATURAN.garisRegu)} km/regu/hari ÷ ${ATURAN.hariKurung} hari) dan regu yang tiba ≤ ${ATURAN.jamTiba} jam; tampil bila selisih ≥ 3.</li>
          <li>Kepala BNPB, modifikasi cuaca: provinsi prioritas dengan peluang FWI ≥ 14 ≥ 50%, ≥ 5 kompleks prioritas, dan DC ≥ 350 (gambut kering).</li>
          <li>Gubernur, kesehatan: provinsi prioritas dengan ≥ 100 ribu jiwa sangat tidak sehat atau ≥ 1 juta jiwa tidak sehat.</li><li>Kapolri & Menteri LH: konsesi yang memuat ≥ 3 kompleks prioritas.</li></ol>
        <p class="fnd">Maksimal 5 kartu, maksimal 2 per jenis, diurutkan menurut bobot tetap (Presiden > status > heli > regu > kesehatan > modifikasi cuaca > hukum). Keyakinan: Tinggi bila ≥ 3 sumber independen saling menguatkan, Sedang 2, Rendah 1; turun satu tingkat bila data kompleks lebih tua dari 26 jam.</p>
        ${this.tabelTingkat(this.D, 1)}`);
      this.ikatDlg();
    },

    /* ================= brief harian 2 halaman (window.print + lembar gaya cetak) ================= */
    async cetak(tanpaPrint) {
      if (!this.D) return; const tb = $('[data-rk="cetak"]'); if (tb) { tb.disabled = true; tb.textContent = "Menyiapkan…"; }
      await this.muatBerita();
      let c = $("#rk-cetak"); if (!c) { c = document.createElement("div"); c.id = "rk-cetak"; document.body.appendChild(c); }
      c.innerHTML = this.hCetak(); document.documentElement.classList.add("rk-mencetak");
      if (tb) { tb.disabled = false; tb.textContent = "Unduh brief"; }
      if (tanpaPrint) return;
      const lepas = () => { document.documentElement.classList.remove("rk-mencetak"); removeEventListener("afterprint", lepas); };
      addEventListener("afterprint", lepas); setTimeout(() => print(), 50);
    },
    hCetak() {
      const D = this.D, K = D.kpi, X = this.S, tgl = tglPanjang(Date.now()), tt = s => s.replace(/<[^>]+>/g, "");
      const kp = D.kartu.map((c, i) => `<li><b>${esc(c.siapa)}:</b> ${tt(c.apa)}. <i>Dasar:</i> ${c.kenapa.map(([t]) => tt(t)).join("; ")}. <i>Biaya:</i> ${tt(c.biaya)}. <i>Waktu:</i> ${esc(c.waktu)}. <i>Keyakinan:</i> ${c.yakin[0].toLowerCase()}.</li>`).join("");
      const darurat = D.hit(3).map(x => namaProv(x.k)), siaga = D.hit(2).map(x => namaProv(x.k));
      return `<section class="rk-hal">
        <header class="rk-ckop"><div><b>KARHUTLA INDONESIA</b><span>Ringkasan Harian Kebakaran Hutan dan Lahan</span></div><div class="rk-cr">${esc(tgl)}<br>Data per ${esc(jamWIB(D.asOf))}</div></header>
        <h1>Tingkat kewaspadaan nasional: ${TINGKAT[D.lvNas].toUpperCase()}</h1>
        <p>${darurat.length ? `Provinsi berstatus darurat: ${esc(daftar(darurat))}. ` : ""}${siaga.length ? `Provinsi berstatus siaga: ${esc(daftar(siaga))}. ` : ""}Tingkat ini adalah indeks pemantauan Posko, bukan status hukum; aturan penetapannya tercantum pada bagian sumber.</p>
        <h2>I. Situasi</h2>
        <table><tbody>
          <tr><td>Titik panas 24 jam (satelit)</td><td>${fmt(K.h24)}; ${K.hKmr ? (K.h24 >= K.hKmr ? "naik " : "turun ") + fmt(Math.abs(Math.round((K.h24 / K.hKmr - 1) * 100))) + "% dari kemarin" : ""}${K.rasio != null ? `; ${fmt(Math.round(K.rasio * 10) / 10)} kali normal` : ""}</td></tr>
          <tr><td>Kompleks api prioritas (satelit)</td><td>${fmt(K.k3)}; front membesar di ${fmt(K.naik)} kompleks; ditambah ${fmt(K.k2)} kompleks siaga</td></tr>
          <tr><td>Provinsi siaga dan darurat (model)</td><td>${fmt(D.nD)} darurat, ${fmt(D.nS)} siaga, ${fmt(D.nW)} waspada</td></tr>
          <tr><td>Penduduk terpapar asap karhutla (model)</td><td>${D.adaAsap ? `${rb(K.jiwaPrio)} jiwa menghirup udara tidak sehat di 9 provinsi prioritas (${rb(K.jiwaNas)} seluruh Indonesia)` : "data belum tersedia"}</td></tr>
          <tr><td>Luas terbakar sejak 1 Juni</td><td>perkiraan satelit ${K.luas ? `${rb(K.luas[1])} ha (rentang ${rb(K.luas[0])}–${rb(K.luas[2])} ha)` : "–"}; angka resmi indikatif BNPB ${K.bnpbHa != null ? rb(K.bnpbHa) + " ha (6 provinsi)" : "–"}</td></tr>
          <tr><td>Gangguan penerbangan 7 hari (berita)</td><td>${fmt(K.kj7.length)} kejadian di ${fmt(K.bandara7)} bandara</td></tr></tbody></table>
        <h2>II. Keputusan yang dibutuhkan hari ini</h2><ol class="rk-ckp">${kp}</ol>
        <p class="rk-cket">Angka bertanda satelit berasal dari pengamatan; model adalah perkiraan; resmi dari laporan BNPB; berita dari judul media.</p></section>
      <section class="rk-hal">
        <h2>III. Prakiraan 72 jam (${D.ansHari.length ? hariN(D.ansHari[0]) + "–" + hariN(D.ansHari.at(-1)) : ""})</h2>
        <table><thead><tr><th>Provinsi</th><th>Tingkat</th><th>Peluang cuaca sangat berbahaya</th><th>Peluang hujan ≥ 5 mm</th><th>Terpapar asap hari ini</th></tr></thead><tbody>
          ${PRIO.map(k => D.P[k]).sort((a, b) => b.lv - a.lv || b.p3 - a.p3).map(x => `<tr><td>${esc(namaProv(x.k))}</td><td>${TINGKAT[x.lv]}</td><td>${pct(x.pE)}</td><td>${pct(x.pH)}</td><td>${D.adaAsap ? rb(x.jiwa) : "–"}</td></tr>`).join("")}</tbody></table>
        <h2>IV. Sentimen publik dan komunikasi</h2>
        ${X ? `<p>Dalam 3 hari terakhir terbit ${fmt(X.n3)} berita. Topik utama: ${esc(X.topik.map(([k, v]) => `${(TOPIK_B[k] || k).toLowerCase()} ${pct(v / Math.max(1, X.n3))}`).join(", "))}. Emosi marah ${pct(X.marah / Math.max(1, X.n3))}, cemas ${pct(X.cemas / Math.max(1, X.n3))}. Liputan internasional 7 hari: ${fmt(X.nInt)} berita${X.neg.length ? ` (terbanyak ${esc(X.neg.map(([c]) => c).join(", "))})` : ""}.${X.minta.length ? ` Yang paling banyak diminta publik: ${esc(X.minta.slice(0, 3).map(m => m.nm.toLowerCase()).join("; "))}.` : ""}</p>
          <p><b>Bahan komunikasi:</b></p><ol class="rk-ckp">${this.poinKomunikasi().slice(0, 4).map(t => `<li>${t}</li>`).join("")}</ol>
          ${X.mis.length ? `<p><b>Perlu klarifikasi:</b> ${X.mis.slice(0, 1).map(m => `"${esc(m.a.judul)}" (${esc(m.a.sumber)}), padahal satelit masih mendeteksi ${fmt(m.h)} titik dalam 24 jam di ${esc(m.wil)}`).join("; ")}.</p>` : ""}` : "<p>Data berita belum tersedia.</p>"}
        <h2>V. Penanggung jawab dan sumber daya</h2>
        <table><thead><tr><th>Provinsi</th><th>Dansatgas (Danrem)</th><th>Regu perlu / ada</th><th>Heli perlu / ada</th></tr></thead><tbody>
          ${D.AK.map(a => `<tr><td>${esc(namaProv(a.k))}</td><td>${esc(KOREM[a.k] || "–")}</td><td>${fmt(a.reguButuh)} / ${a.setara == null ? fmt(a.reguMA) + " (gabungan belum dilaporkan)" : fmt(a.reguMA + a.setara)}</td><td>${fmt(a.heliButuh)} / ${a.wb == null ? "tidak dilaporkan" : fmt(a.wb)}</td></tr>`).join("")}</tbody></table>
        <h2>VI. Sumber dan catatan</h2>
        <p class="rk-cket">Titik panas: NASA FIRMS (MODIS, VIIRS S-NPP, NOAA-20); normal = median VIIRS S-NPP 2015–2025. Cuaca: ansambel ECMWF 51 anggota; FWI ≥ 14 = bahaya cuaca kebakaran sangat tinggi. Asap: CAMS/Copernicus × WorldPop, hanya yang searah angin dari kompleks api. Luas: titik MODIS × rasio GWIS. Akses regu: OpenStreetMap. Resmi: laporan harian BNPB ${S.bnpb?.updatedAt ? jamWIB(S.bnpb.updatedAt) : ""}. Berita: Google News. Aturan tingkat: provinsi darurat bila ≥ 25 kompleks prioritas, atau ≥ 10 dan (≥ 1 juta jiwa terpapar atau peluang cuaca sangat berbahaya ≥ 50%); siaga bila ≥ 3 kompleks prioritas, ≥ 1 juta jiwa terpapar, atau titik panas ≥ 3× normal; nasional darurat bila ≥ 3 provinsi darurat. Biaya adalah perkiraan perencanaan, bukan pagu anggaran.</p></section>`;
    },

    /* ================= mode layar besar: panel bergiliran 20 detik ================= */
    PANEL: ["Angka utama", "Keputusan", "Peta dan 72 jam", "Sentimen publik", "Penanggung jawab"],
    togDinding() { this.dinding ? this.keluarDinding() : this.masukDinding(); },
    masukDinding() {
      bukaTab("ringkasan"); this.dinding = {i: 0, jeda: false}; document.documentElement.classList.add("rk-dinding");
      document.documentElement.requestFullscreen?.().catch(() => {});
      let bar = $("#rk-dbar"); if (!bar) { bar = document.createElement("div"); bar.id = "rk-dbar"; bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "Kendali layar besar"); document.body.appendChild(bar); }
      bar.onclick = e => { const b = e.target.closest("button"); if (!b) return; const a = b.dataset.d; if (a === "x") return this.keluarDinding(); if (a === "j") { this.dinding.jeda = !this.dinding.jeda; return this.tampilPanel(); } this.geser(a === "n" ? 1 : -1); };
      this._kunci = e => { if (!this.dinding) return; if (e.key === "Escape") this.keluarDinding(); else if (e.key === "ArrowRight") this.geser(1); else if (e.key === "ArrowLeft") this.geser(-1); else if (e.key === " " && !e.target.closest("button")) { e.preventDefault(); this.dinding.jeda = !this.dinding.jeda; this.tampilPanel(); } };
      addEventListener("keydown", this._kunci);
      this._jam = setInterval(() => { if (this.dinding && !this.dinding.jeda) this.geser(1); }, 20000);
      this.tampilPanel(); $('[data-rk="dinding"]')?.setAttribute("aria-pressed", "true");
    },
    geser(d) { if (!this.dinding) return; this.dinding.i = (this.dinding.i + d + this.PANEL.length) % this.PANEL.length; clearInterval(this._jam); this._jam = setInterval(() => { if (this.dinding && !this.dinding.jeda) this.geser(1); }, 20000); this.tampilPanel(); },
    tampilPanel() {
      const i = this.dinding.i; document.querySelectorAll("#ringkasan .rk-p").forEach(p => p.classList.toggle("rk-aktif", +p.dataset.p === i)); if (i === 2 && this._petaD !== i) { this._petaD = i; this.petaMini(); } else if (i !== 2) this._petaD = null;
      $("#rk-dbar").innerHTML = `<span class="rk-dprog${this.dinding.jeda ? " jeda" : ""}" key="${Date.now()}"></span><b aria-live="polite">${i + 1}/${this.PANEL.length} · ${this.PANEL[i]}</b>
        <button class="btn sec" data-d="p" aria-label="Panel sebelumnya">‹</button><button class="btn sec" data-d="j">${this.dinding.jeda ? "Lanjut" : "Jeda"}</button><button class="btn sec" data-d="n" aria-label="Panel berikutnya">›</button><button class="btn sec" data-d="x">Keluar</button>`;
    },
    keluarDinding() {
      this.dinding = null; clearInterval(this._jam); removeEventListener("keydown", this._kunci); document.documentElement.classList.remove("rk-dinding");
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      $("#rk-dbar")?.remove(); document.querySelectorAll("#ringkasan .rk-aktif").forEach(p => p.classList.remove("rk-aktif")); this._petaD = null; this.petaMini(); $('[data-rk="dinding"]')?.setAttribute("aria-pressed", "false");
    },
  };

  /* tooltip juga untuk keyboard (fokus) dan sentuhan: letakkan di atas elemen */
  const tip = () => $("#tip"), dekat = x => { const t = tip(), r = x.getBoundingClientRect(); t.innerHTML = x.dataset.tip; t.classList.add("on");
    t.style.left = Math.max(8, Math.min(innerWidth - t.offsetWidth - 8, r.left)) + "px"; t.style.top = (r.top - t.offsetHeight - 8 < 8 ? r.bottom + 8 : r.top - t.offsetHeight - 8) + "px"; };
  document.addEventListener("focusin", e => { const x = e.target.closest?.("#ringkasan [data-tip]"); if (x) dekat(x); });
  document.addEventListener("focusout", e => { if (e.target.closest?.("#ringkasan [data-tip]")) tip()?.classList.remove("on"); });
  document.addEventListener("pointerup", e => { if (e.pointerType !== "touch") return; const x = e.target.closest?.("#ringkasan [data-tip]"); if (x) dekat(x); });
  /* ganti tema: peta mini ikut berganti gaya dasar */
  new MutationObserver(() => { if (R.peta && $("#rkPeta")) R.petaMini(); }).observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]});
  /* popover kesegaran data: tutup bila klik di luar */
  document.addEventListener("click", e => { const d = $("#ringkasan .rk-segar[open]"); if (d && !d.contains(e.target)) d.open = false; });
  /* tab pertama: tampil tanpa menunggu klik; ?brief menyiapkan lembar cetak langsung (untuk tautan dan uji PDF) */
  if (document.querySelector("#p-ringkasan.on")) R.render().then(() => { if (new URLSearchParams(location.search).has("brief")) R.cetak(true); });
  return R;
})();
