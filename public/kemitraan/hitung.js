/* Kemitraan Kampus, hitungan murni sisi layar (KM-C02): generator pertanyaan ALGORITMA.md §6. Kembaran scripts/kemitraan/pertanyaan.py
   (susun_panduan, syarat, nilai_dari_profil, panduan) dan masalah.idn; paritas dijaga tests/kemitraan/paritas.test.mjs (20 kombinasi).
   Syarat = `<kunci> <op> <angka|true|false>` digabung `and`, diurai dengan regex, tidak pernah dijalankan sebagai kode (ALG §6.1).
   Bobot dan ambang tidak ada di sini: hanya dibaca dari KM_KONST (konst.js = konst.py). Skrip klasik: ekspor lewat module.exports (uji) atau window.KM_HITUNG (peramban). */
(() => {
  "use strict";
  const K = typeof KM_KONST !== "undefined" ? KM_KONST : window.KM_KONST;
  const ARAH = K.ARAH, PD = K.PANDUAN, NARASUMBER = Object.keys(K.NARASUMBER);
  const RISET_MAKS = 8;   // PRD F-M6: 3-8 pertanyaan riset (sama dengan pertanyaan.py)
  const SLOT_SAH = ["wilayah", "prov", "bahaya", "n_kejadian", "periode", "tren_kata", "kec_teratas", "dokumen_kurang", "jiwa_rentan", "skor_irbi", "kelas_irbi", "dampak_12bln", "kampus_terdekat", "model_status"];
  const KUNCI_SYARAT = ["rpb", "renkon", "perda_pb", "perda_bpbd", "bpbd", "H", "F", "T", "D", "P", "K", "skor", "gambut_pct", "tren_naik", "tren_turun", "model_gagal"];
  const NAMA = {banjir: "banjir", longsor: "longsor", gempa: "gempa bumi", tsunami: "tsunami", gunungapi: "gunung api", kekeringan: "kekeringan", karhutla: "karhutla", cuaca_ekstrem: "cuaca ekstrem", abrasi_rob: "abrasi dan rob", udara: "kualitas udara", multi: "beberapa bahaya sekaligus"};
  const JENIS_F = {banjir: ["banjir"], longsor: ["longsor"], cuaca_ekstrem: ["cuaca"], kekeringan: ["kering"], abrasi_rob: ["rob", "gelombang"]};
  const JENIS_T = {banjir: "banjir", longsor: "longsor", cuaca_ekstrem: "cuaca", kekeringan: "kering"};
  const UJI_BAHAYA = {banjir: ["banjir_longsor"], longsor: ["longsor"], gempa: ["gempa"], kekeringan: ["kekeringan"], karhutla: ["karhutla_sebaran_sel", "karhutla_sebaran_luas", "karhutla_jejak_api", "karhutla_peluang"]};
  const INARISK = {banjir: "banjir", longsor: "longsor", gempa: "gempa", gunungapi: "gunungapi", kekeringan: "kekeringan", karhutla: "karhutla", cuaca_ekstrem: "cuaca", abrasi_rob: "gelombang", multi: "multi"};
  const DOK = [["perda_pb", "perda penanggulangan bencana"], ["perda_bpbd", "perda pembentukan BPBD"], ["rpb", "rencana penanggulangan bencana (RPB)"], ["renkon", "rencana kontinjensi"]];
  const RE_SLOT = /\{(\w+)\}/g, RE_SYARAT = /^\s*([A-Za-z_]\w*)\s*(==|!=|>=|<=|>|<)\s*(true|false|-?\d+(?:\.\d+)?)\s*$/, RE_AND = /\s+and\s+/;
  const OPS = {"==": (a, b) => a === b, "!=": (a, b) => a !== b, ">=": (a, b) => a >= b, "<=": (a, b) => a <= b, ">": (a, b) => a > b, "<": (a, b) => a < b};
  const ada = (o, k) => o != null && Object.hasOwn(o, k);
  const kosong = o => !o || (typeof o === "object" && !Object.keys(o).length);   // sama dengan `not d` Python untuk dict/list
  const urut = (a, b) => a < b ? -1 : a > b ? 1 : 0;

  /* Format Indonesia = masalah.idn: pembulatan setengah-genap atas nilai biner tepat (Python format), beda dari toLocaleString yang setengah-menjauh */
  function idn(x, d = 1) {
    if (x == null || x === "" || !Number.isFinite(+x)) return "–";   // null/NaN/Infinity tampil en dash, bukan 'NaN'
    x = +x;
    const eks = Math.abs(x).toPrecision(60);   // 60 digit signifikan = ekspansi desimal tepat dari double
    if (eks.includes("e")) return Math.abs(x) < 1 ? idn(0, d) : (x < 0 ? "-" : "") + Math.abs(x).toLocaleString("id-ID", {maximumFractionDigits: 0});
    const [ent, frac = ""] = eks.split("."), sisa = frac.slice(d), pas = ent + frac.slice(0, d);
    const naik = sisa[0] > "5" || (sisa[0] === "5" && (/[1-9]/.test(sisa.slice(1)) || +pas.slice(-1) % 2 === 1));   // setengah-genap
    const s = (BigInt(pas) + (naik ? 1n : 0n)).toString().padStart(d + 1, "0"), ip = d ? s.slice(0, -d) : s;
    return (x < 0 ? "-" : "") + BigInt(ip).toLocaleString("id-ID") + (d ? "," + s.slice(-d) : "");
  }

  /* ---------------- syarat (ALG §6.1) ---------------- */
  function urai(ekspr) {
    if (ekspr == null || !String(ekspr).trim()) return [];
    return String(ekspr).split(RE_AND).map(bag => {
      const m = RE_SYARAT.exec(bag);
      if (!m) throw new Error(`syarat salah bentuk: ${JSON.stringify(bag)} dalam ${JSON.stringify(ekspr)}`);
      const v = m[3] === "true" ? true : m[3] === "false" ? false : parseFloat(m[3]);
      if (typeof v === "boolean" && m[2] !== "==" && m[2] !== "!=") throw new Error(`operator ${m[2]} tidak berlaku untuk true/false: ${ekspr}`);
      return [m[1], m[2], v];
    });
  }
  /* true bila semua bagian benar; kunci hilang/null atau beda jenis (boolean vs angka) = salah, bukan galat */
  function syarat(ekspr, nilai) {
    for (const [k, op, v] of urai(ekspr)) {
      const x = ada(nilai, k) ? nilai[k] : null;
      if (x == null || typeof x !== typeof v || (typeof x !== "boolean" && typeof x !== "number")) return false;
      if (!OPS[op](x, v)) return false;
    }
    return true;
  }

  /* ---------------- slot dari profil (ALG §6.2) ---------------- */
  const daftar = xs => xs.length === 1 ? xs[0] : xs.length === 2 ? xs.join(" dan ") : xs.slice(0, -1).join(", ") + ", dan " + xs[xs.length - 1];
  function dampak(d) {
    if (kosong(d) || ["meninggal", "mengungsi", "rr_berat"].some(k => d[k] == null)) return null;
    return `${idn(d.meninggal, 0)} meninggal, ${idn(d.mengungsi, 0)} mengungsi, dan ${idn(d.rr_berat, 0)} rumah rusak berat`;
  }
  function statusModel(p, b) {
    const sub = ada(UJI_BAHAYA, b) ? UJI_BAHAYA[b] : null, u = (p.model || {}).uji || {};
    if (!sub || kosong(u)) return null;
    const s = sub.map(x => u[x]);
    return s.every(x => x === "gagal") ? "gagal uji balik nasional" : s.every(x => x === "lolos") ? "lolos uji balik nasional" : "belum teruji lengkap";
  }
  /* bagian masalah.mentah yang dipakai slot: jumlah kejadian (F) dan kata tren (T) */
  function mentah(p, b) {
    const kj = p.kejadian || {}, kh = p.karhutla || {}, gm = p.gempa || {};
    let F = null, kata = null;
    if (ada(JENIS_F, b)) {
      const tot = kj.total_2015_2025 || {}, js = JENIS_F[b].filter(j => ada(tot, j));
      F = [js.length ? js.reduce((a, j) => a + tot[j], 0) : null, js];
    } else if (b === "karhutla") {
      const ty = (kh.titik_tahun || []).filter(([y]) => y >= 2015 && y <= 2025).map(x => x[1]);
      F = [ty.length ? ty.reduce((a, c) => a + c, 0) : null, ["viirs"]];
    } else if (b === "gempa") F = [(gm.risiko || {}).n_2000_2025_100km ?? null, ["gempa100"]];
    if (ada(JENIS_T, b)) kata = (kj.tren || {})[JENIS_T[b]] ?? null;
    else if (b === "karhutla") kata = kh.tren_viirs ?? null;
    return {F, kata};
  }
  function nilaiDariProfil(p, m, ctx) {
    const b = (m || {}).B, v = {};
    for (const k of [...SLOT_SAH, ...KUNCI_SYARAT]) v[k] = null;
    const kp = p.kapasitas || {}, kj = p.kejadian || {}, pd = p.penduduk || {}, ir = p.irbi || {};
    v.wilayah = p.nama ?? null;
    v.prov = (ctx || {}).prov_nama ?? null;
    v.periode = b === "gempa" ? "2000-2025" : "2015-2025";
    if (b) {
      v.bahaya = ada(NAMA, b) ? NAMA[b] : null;
      const {F, kata} = mentah(p, b);
      if (F && F[0] != null) {
        const js = F[1], satuan = js.length === 1 && js[0] === "viirs" ? "titik panas" : js.length === 1 && js[0] === "gempa100" ? "gempa M5+ dalam radius 100 km" : `kejadian ${NAMA[b]}`;
        v.n_kejadian = `${idn(F[0], 0)} ${satuan}`;
      }
      if (kata === "naik" || kata === "turun" || kata === "datar") { v.tren_kata = kata; v.tren_naik = kata === "naik"; v.tren_turun = kata === "turun"; }
      v.dampak_12bln = dampak((kj.dampak_12bln_bahaya || {})[b]);
      v.model_status = statusModel(p, b);
      if (v.model_status) v.model_gagal = v.model_status.startsWith("gagal");
      for (const [k, x] of Object.entries(((p.masalah_skor || {})[b]) || {})) if (["H", "F", "T", "D", "P", "K", "skor"].includes(k) && x != null) v[k] = x;
    } else v.dampak_12bln = dampak(kj.dampak_12bln);
    const ter = (((p.inarisk_kec || {})[ada(INARISK, b) ? INARISK[b] : "multi"]) || {}).teratas;
    if (ter && ter.length) v.kec_teratas = daftar(ter.slice(0, 3).map(x => x[0]));
    const kurang = DOK.filter(([k]) => kp[k] === false).map(x => x[1]);
    v.dokumen_kurang = kurang.length ? daftar(kurang) : null;
    if (pd.balita != null && pd.lansia != null) v.jiwa_rentan = idn(pd.balita + pd.lansia, 0);
    if (ir.seri && ir.seri.length) { const s = ir.seri[ir.seri.length - 1]; v.skor_irbi = idn(s[1], 1); v.kelas_irbi = s[2] === 1 ? "Tinggi" : s[2] === 0 ? "Sedang" : null; }
    if (kp.kampus_terdekat && kp.kampus_terdekat.length) { const t = kp.kampus_terdekat[0]; v.kampus_terdekat = t.nama + (t.km != null ? ` (${idn(t.km, 0)} km)` : ""); }
    for (const k of ["rpb", "renkon", "perda_pb", "perda_bpbd"]) v[k] = kp[k] ?? null;
    if (!kosong(kp.bpbd)) v.bpbd = kp.bpbd.status === "Terbentuk";
    v.gambut_pct = (p.karhutla || {}).gambut_pct ?? null;
    return v;
  }

  /* ---------------- penyusunan (ALG §6.2) ---------------- */
  /* teks templat terisi, atau null bila slot kosong atau syarat salah; keluaran tak pernah memuat kurung kurawal */
  function isi(t, nilai) {
    const slot = new Set([...(t.isian || []), ...[...t.teks.matchAll(RE_SLOT)].map(m => m[1])]);
    if ([...slot].some(s => !ada(nilai, s) || nilai[s] == null) || !syarat(t.syarat, nilai)) return null;
    const teks = t.teks.replace(RE_SLOT, (_, s) => String(nilai[s]));
    return teks.includes("{") || teks.includes("}") ? null : teks;
  }
  function susunPanduan(templat, nilai, mengapa, maks) {
    maks = maks == null ? PD.MAKS_PER_NARASUMBER : maks;
    let ok = templat.map(t => [t, isi(t, nilai)]).filter(x => x[1] !== null);
    if (ok.length > maks) ok = ok.sort((a, b) => ((a[0].prioritas ?? 2) - (b[0].prioritas ?? 2)) || (ARAH.indexOf(a[0].arah) - ARAH.indexOf(b[0].arah)) || urut(a[0].id, b[0].id)).slice(0, maks);
    ok.sort((a, b) => (ARAH.indexOf(a[0].arah) - ARAH.indexOf(b[0].arah)) || urut(a[0].id, b[0].id));
    const sub = (mengapa || []).slice(0, PD.MAKS_MENGAPA);
    return ok.map(([t, s]) => ({id: t.id, teks: s, arah: t.arah, sub: t.arah === "akar" ? [...sub] : []}));
  }
  const polos = (templat, nilai) => [...templat].sort((a, b) => urut(a.id, b.id)).map(t => [t, isi(t, nilai)]).filter(x => x[1] !== null).map(([t, s]) => ({id: t.id, teks: s}));
  const dari = (o, k) => ada(o, k) ? o[k] : [];
  /* -> {narasumber: {<ns>: {<arah>: [{id, teks, sub}]}}, data_diminta: [{id, teks}], riset: [{id, teks}]}; tanpa masalah: umum + narasumber, riset kosong */
  function panduan(bank, p, m, narasumber, ctx) {
    const v = nilaiDariProfil(p, m, ctx), b = (m || {}).B, a = (m || {}).A, pilih = narasumber && narasumber.length ? narasumber : NARASUMBER;
    for (const n of pilih) if (!NARASUMBER.includes(n)) throw new Error(`narasumber tak dikenal: ${JSON.stringify(n)}`);
    const out = {};
    for (const n of pilih) {
      const g = {};
      for (const it of susunPanduan([...bank.umum, ...dari(bank.B, b), ...dari(bank.A, a), ...bank.narasumber[n]], v, bank.mengapa)) (g[it.arah] ||= []).push({id: it.id, teks: it.teks, sub: it.sub});
      out[n] = g;
    }
    const aspek = a ? [a] : [...new Set((p.masalah || []).map(x => x.A))].sort((x, y) => +x.slice(1) - +y.slice(1));
    return {narasumber: out, data_diminta: aspek.flatMap(s => polos(dari(bank.data_diminta, s), v)), riset: m ? polos([...dari(bank.riset, a), ...bank.riset.model], v).slice(0, RISET_MAKS) : []};
  }

  /* ---------------- tampilan (DS §5.5): semua teks dari data lewat esc ---------------- */
  const LABEL_ARAH = {konfirmasi: "Konfirmasi keadaan", akar: "Akar masalah", kapasitas: "Kapasitas daerah", upaya: "Upaya yang sudah ada", kebutuhan: "Kebutuhan", harapan: "Harapan"};
  const ol = (xs, esc) => `<ol class="km-tanya">${xs.map(x => `<li>${esc(x.teks)}${x.sub && x.sub.length ? `<ol>${x.sub.map(s => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}</li>`).join("")}</ol>`;
  /* hasil panduan() -> HTML: satu <details> per narasumber (pertama terbuka), h4 per arah, lalu data diminta dan riset. esc dipasok pemanggil */
  function panduanHtml(h, esc) {
    const ns = Object.entries(h.narasumber).map(([n, g], i) => `<details class="ak-dbagian km-tanya-bag"${i === 0 ? " open" : ""}><summary><h3>${esc(K.NARASUMBER[n])}</h3><small>${esc(Object.values(g).reduce((a, x) => a + x.length, 0))} pertanyaan</small></summary><div class="ak-disi">${ARAH.filter(a => g[a]).map(a => `<h4>${esc(LABEL_ARAH[a])}</h4>${ol(g[a], esc)}`).join("")}</div></details>`).join("");
    const tambah = (judul, xs) => xs.length ? `<section class="ak-dbagian"><div class="ak-disi"><h3 class="km-t">${esc(judul)}</h3>${ol(xs, esc)}</div></section>` : "";
    return ns + tambah("Data yang diminta dari daerah", h.data_diminta) + tambah("Pertanyaan riset", h.riset);
  }

  const pub = {syarat, susunPanduan, nilaiDariProfil, panduan, panduanHtml, idn, statusModel, UJI_BAHAYA};
  if (typeof module !== "undefined" && module.exports) module.exports = pub;
  else if (typeof window !== "undefined") { window.KM_HITUNG = pub; if (window.KM) window.KM.hitung = pub; }
})();
