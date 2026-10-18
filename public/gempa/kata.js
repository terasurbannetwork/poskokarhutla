"use strict";
/* Kosakata gempa (COPYWRITING.md §5 kolom gempa): satu tempat, dipakai peta dan modul berikutnya.
   Dua kosakata terpisah: (A) status tsunami resmi BMKG (TSUNAMI) dan (B) bentuk gempa (kekuatan, kedalaman). */
/* arsip D1 gempa baru mulai 16 Okt 2026 (migrasi diterapkan hari itu): jendela waktu yang lebih panjang ditulis "sejak 16 Okt", bukan "N hari terakhir" */
const ARSIP = Date.parse("2026-10-16T00:00:00+07:00");
/* jendela waktu jujur untuk kelompok gempa A (hasil saring dari S.gempa): awal data = yang lebih lama antara ARSIP dan gempa tertua di A
   (daftar M5+ BMKG menjangkau sekitar sebulan; daftar Dirasakan hanya beberapa hari). Mulai sebelum awal itu = "sejak <tanggal>", bukan "N hari terakhir". */
const jendelaGempa = (hari, A) => { const mulai = Date.now() - hari * 864e5, awal = Math.min(ARSIP, ...A.map(g => g.t));
  return {mulai, teks: awal > mulai + 36e5 * 12 ? `sejak ${KG.tgl(awal)}` : `dalam ${hari} hari terakhir`}; };
const mTulis = m => "M " + Number(m).toLocaleString("id-ID", {minimumFractionDigits: 1, maximumFractionDigits: 1});
/* kelas kekuatan: warna pil (A3) dan batas; teks pil memakai warna tegas supaya terbaca di latar putih */
const KELAS_M = [[7, "#c9503a"], [6, "#d4702a"], [5, "#a8780c"], [0, "#3f6fa8"]];
const warnaM = m => (KELAS_M.find(k => m >= k[0]) || KELAS_M[3])[1];
const pilM = m => `<span class="pill pm" style="--w:${warnaM(m)}">${mTulis(m)}</span>`;
/* kedalaman: dangkal < 60 km, menengah 60 sampai 300, dalam > 300 */
const KELAS_DALAM = [["Dangkal", "#d4572f", "< 60 km"], ["Menengah", "#e8a33c", "60 sampai 300 km"], ["Dalam", "#3a5fa8", "> 300 km"]];
const WARNA_DALAM_NA = "#9aa8b8";
const kelasDalam = d => d == null ? -1 : d < 60 ? 0 : d <= 300 ? 1 : 2;
/* status tsunami resmi: kode dari BMKG (src/gempa.js); null = BMKG tidak menyebut tsunami, bukan "aman" */
const TSUNAMI = {1: ["Tsunami Waspada", "#e0b400"], 2: ["Tsunami Siaga", "#e8743b"], 3: ["Tsunami Awas", "#d64545"]};
/* teks wilayah BMKG "Pusat gempa berada di darat 21 km Barat Daya Kota Bogor" -> "Darat 21 km Barat Daya Kota Bogor" */
const ARAH_EN = {utara: "N", timurlaut: "NE", timur: "E", tenggara: "SE", selatan: "S", baratdaya: "SW", barat: "W", baratlaut: "NW"};
const wilayahPendek = t => { const s = String(t || "").replace(/^Pusat gempa berada di\s*/i, "").trim(); if (!s) return window.BAHASA === "en" ? "Indonesian waters" : "Perairan Indonesia";
  /* EN: "darat 21 km Barat Daya Kota Bogor" -> "21 km SW of Kota Bogor (onshore)"; nama tempat BMKG tetap apa adanya */
  const m = window.BAHASA === "en" && s.match(/^(darat|laut)?\s*(\d+)\s*km\s+(utara|timur\s?laut|timur|tenggara|selatan|barat\s?daya|barat\s?laut|barat)\s+(.+)$/i);
  if (m) return `${m[2]} km ${ARAH_EN[m[3].toLowerCase().replace(/\s/g, "")]} of ${m[4]}${m[1] ? (/^d/i.test(m[1]) ? " (onshore)" : " (offshore)") : ""}`;
  return s[0].toUpperCase() + s.slice(1); };
const ROMAWI = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
/* waktu gempa: "12 Okt 04.34 WIB" (jamWIB dari inti/format.js) */
const waktuGempa = iso => jamWIB(iso);

/* ================================================================ peluang susulan dan paparan guncangan (dipakai Sapa, Laci, Insight, Dampak) */
/* peluang tampil sebagai angka langsung + rentang (A17); r = {p, lo, hi} pecahan 0..1 dari Susulan.peluang */
const pctTeks = p => p < .005 ? "<1%" : p > .995 ? ">99%" : Math.round(p * 100) + "%";
const peluangTeks = r => !r ? "" : `${pctTeks(r.p)}${r.lo != null && r.hi != null ? ` (${Math.round(r.lo * 100)} sampai ${Math.round(r.hi * 100)}%)` : ""}`;
const Sus = {
  _m: null, _kej: {}, _daftar: null,
  siap() { if (typeof Susulan === "undefined") return Promise.resolve(false); return this._m ||= Susulan.muat().then(() => true, () => false); },
  /* kejadian G aktif 30 hari; null bila tabel belum ada */
  async daftar() { if (this._daftar && Date.now() - this._daftar.t < 120e3) return this._daftar.v;
    const v = await fetch("/api/gempa/kejadian").then(r => r.ok ? r.json() : null).then(d => d?.kejadian || null).catch(() => null); this._daftar = {t: Date.now(), v}; return v; },
  async kej(kode) { const c = this._kej[kode]; if (c && Date.now() - c.t < 120e3) return c.v;
    const v = await fetch("/api/gempa/kejadian/" + encodeURIComponent(kode)).then(r => r.ok ? r.json() : null).catch(() => null); this._kej[kode] = {t: Date.now(), v}; return v; },
  /* {m, n (susulan teramati), baris: [{label, r}]}; peluang M>=5 dan M>=Mutama-1 dalam 7 hari ke depan, disesuaikan dengan susulan teramati. null bila model/kejadian belum ada */
  async peluang(kode) {
    const k = await this.kej(kode); if (!k?.gempa || !(await this.siap())) return null;
    const t0 = Date.parse(k.mulai), kini = Math.max(0, (Date.now() - t0) / 864e5), M = k.m;
    const sus = k.gempa.filter(x => x.id !== k.utama_id).map(x => ({t_hari: (Date.parse(x.waktu) - t0) / 864e5, m: x.m})).filter(x => x.t_hari > 0);
    /* hanya target yang terbit (Susulan.terbit, dari terbit_target model_susulan.json); target yang kalah dari pembanding dibuang (A18) */
    try { /* penyesuaian hanya bila model menyatakan terbit_sesuaikan === true */ const P = Susulan.model?.terbit_sesuaikan === true ? Susulan.sesuaikan(M, sus, kini) : undefined, T = Susulan.terbit || {}, mm = Math.round((M - 1) * 10) / 10, baris = [];
      if (T.m5) baris.push(["M 5 atau lebih", Susulan.peluang(M, kini, 7, 5, P)]);
      if (T.m6) baris.push(["M 6 atau lebih", Susulan.peluang(M, kini, 7, 6, P)]);
      if (T.m_1 && mm >= Susulan.param.mc && mm !== 5 && mm !== 6) baris.push([`${mTulis(mm)} atau lebih`, Susulan.peluang(M, kini, 7, mm, P)]);
      /* rentang 10-90% (keragaman antar-rangkaian) hanya sampai rentang_maks_mu; di atasnya angka tengah saja */
      if (M > (Susulan.model?.rentang_maks_mu ?? 5.5)) baris.forEach(b => { b[1] = {p: b[1].p}; });
      if (!baris.length) return null;
      return {m: M, n: sus.length, baris, m5: baris.find(b => b[0] === "M 5 atau lebih")?.[1] || null, k}; } catch (e) { console.error(e); return null; } },
};
const Guncang = {
  _p: null, _c: new Map(),
  /* paparan + fasilitas satu gempa, dihitung sekali per g.id dan di luar tugas klik (nanti); dipakai laci dan Dampak */
  hitung(g) { let c = this._c.get(g.id); if (c) return c;
    c = new Promise(res => nanti(async () => { const P = await this.paparan(g); await new Promise(r => nanti(r));
      const b = typeof Bukti !== "undefined" ? await Bukti.muat().catch(() => null) : null; res({P, F: b ? await this.fasilitas(g, b) : null}); }));
    this._c.set(g.id, c); if (this._c.size > 30) this._c.delete(this._c.keys().next().value); return c; },
  muat() { return this._p ||= Promise.all([muatJSON("data/model_guncangan.json"), muatJSON("../banjir/data/pusat_kec.json"), muatJSON("../data/penduduk.json")])
    .then(([m, pusat, d]) => ({M: GempaGuncangan.pasang(m), pusat, pend: d.kec})).catch(() => { this._p = null; return null; }); },
  /* {per: {kelasMMI: jiwa}, total, tanpa} untuk satu gempa */
  async paparan(g) { const X = await this.muat(); if (!X) return null;
    try { return GempaGuncangan.paparan(X.M.kecamatan({lat: g.lat, lon: g.lon, m: g.m, dalam: g.dalam ?? 10}, X.pusat), X.pend); } catch (e) { console.error(e); return null; } },
  async fasilitas(g, bukti) { const X = await this.muat(); if (!X || !bukti?.fasilitas?.length) return null;
    try { return X.M.fasilitas({lat: g.lat, lon: g.lon, m: g.m, dalam: g.dalam ?? 10}, bukti, 6); } catch (e) { console.error(e); return null; } },
};
const jiwaTeks = v => rb(v).replace(" rb", " ribu").replace(" jt", " juta") + " jiwa";
