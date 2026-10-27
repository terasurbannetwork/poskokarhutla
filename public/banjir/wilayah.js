"use strict";
/* Tabel wilayah panel Peta /banjir (pola panel Real Time karhutla): per provinsi, bisa dibuka ke kabupaten/kota.
   Kolom: Status (pil Awas/Siaga/Waspada, status Aman hijau bila 0, "–" bila null), WS gugus wilayah Siaga (prakiraan; kunci data kejadian_aktif), RB titik rob Waspada atau lebih, H3 hujan 3 hari (mm), TP terpapar (jiwa).
   Data dari kontrak pipeline: data/wilayah_hari.json (hari terbaru), data/hari/<YYYY-MM-DD>.json, data/hari/indeks.json = {dibuat, hari:[...]}.
   null = data tidak ada, ditulis "–" (bukan 0). Periode > sehari dijumlah dari arsip harian: kejadian aktif = gabungan kode unik, terpapar = puncak,
   status = tertinggi, rob dan hujan 3 hari = puncak (menjumlah titik/curah yang sama berkali-kali akan menggandakan).
   Bagian murni (st, agregat, periodeHari, kalender, labelHari, ...) diuji di tests/banjir/wilayah.test.mjs; bagian DOM hanya jalan di peramban.
   Skrip klasik, dimuat SEBELUM peta.js; peta.renderDaftar memanggil Wilayah.html(j) lalu terapkanUrut(). Global dipakai: S, $, fmt, esc, nanti, LEVEL, renderDaftar. */
(akar => {
  const HARI3 = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"], BLN3 = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const BLN_PJG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const d0 = t => new Date(t + "T00:00:00Z"), iso = d => d.toISOString().slice(0, 10), geser = (t, n) => iso(new Date(d0(t).getTime() + n * 864e5));
  const wibHariIni = () => iso(new Date(Date.now() + 7 * 36e5));
  const tglLain = t => { const d = d0(t); return `${HARI3[d.getUTCDay()]} ${d.getUTCDate()} ${BLN3[d.getUTCMonth()]}`; };
  const namaBln = b => `${BLN3[+b.slice(5) - 1]} ${b.slice(0, 4)}`;

  /* status: angka 0-3 atau kata (aman/normal, waspada, siaga, awas); null/tak dikenal = null */
  const NAMA_ST = {aman: 0, normal: 0, waspada: 1, siaga: 2, awas: 3};
  const st = s => s == null ? null : typeof s === "number" ? s : NAMA_ST[String(s).toLowerCase()] ?? null;
  const jml = (a, b) => a == null ? b : b == null ? a : a + b, mks = (a, b) => a == null ? b : b == null ? a : Math.max(a, b);

  /* kejadian_aktif = banyak kode unik (himpunan), jadi periode = gabungan himpunan kode, bukan jumlah harian (kejadian yang sama di dua hari terhitung satu).
     terpapar_jiwa, rob, hujan 3 hari = puncak; status = tertinggi. Arsip lama tanpa kejadian_kode: WS null ("–") di periode > sehari. */
  const GABUNG = {status: mks, rob: mks, hujan3_mm: mks, terpapar_jiwa: mks};
  const kosong = (kode, nama) => ({kode, nama, status: null, kejadian_aktif: null, rob: null, hujan3_mm: null, terpapar_jiwa: null, kejadian_kode: new Set(), lama: false});
  function lebur(o, r) {
    for (const k in GABUNG) o[k] = GABUNG[k](o[k] ?? null, k === "status" ? st(r[k]) : r[k] ?? null);
    if (Array.isArray(r.kejadian_kode)) r.kejadian_kode.forEach(c => o.kejadian_kode.add(c)); else o.lama = true;
    return o;
  }
  const tutup = o => { const kode = [...o.kejadian_kode].sort(); const {lama, kejadian_kode, ...r} = o; return {...r, kejadian_aktif: lama ? null : kode.length, kejadian_kode: lama ? null : kode}; };
  const urutBaris = (a, b) => (st(b.status) ?? -1) - (st(a.status) ?? -1) || (b.kejadian_aktif ?? -1) - (a.kejadian_aktif ?? -1) || a.nama.localeCompare(b.nama, "id");

  /* gabung satu atau beberapa dokumen harian jadi satu dokumen berbentuk sama (total: kejadian_aktif unik nasional, kejadian_kode, rob, terpapar_jiwa,
     per_status per kabupaten dengan kunci Awas/Siaga/Waspada/Aman); satu dokumen dikembalikan apa adanya */
  function agregat(docs) {
    docs = docs.filter(Boolean);
    if (docs.length <= 1) return docs[0] || null;
    const P = new Map();
    for (const d of docs) for (const p of d.provinsi || []) {
      const o = P.get(p.kode) || P.set(p.kode, {...kosong(p.kode, p.nama), kab: new Map()}).get(p.kode);
      lebur(o, p);
      for (const k of p.kab || []) lebur(o.kab.get(k.kode) || o.kab.set(k.kode, kosong(k.kode, k.nama)).get(k.kode), k);
    }
    const provinsi = [...P.values()].map(o => { const {kab, ...r} = o; return {...tutup(r), kab: [...kab.values()].map(tutup).sort(urutBaris)}; }).sort(urutBaris);
    const T = {kejadian_aktif: null, kejadian_kode: null, rob: null, terpapar_jiwa: null, per_status: {Awas: 0, Siaga: 0, Waspada: 0, Aman: 0}};
    const kode = new Set(); let lama = false;
    for (const d of docs) {
      const t = d.total || {};
      if (Array.isArray(t.kejadian_kode)) t.kejadian_kode.forEach(c => kode.add(c)); else lama = true;
      T.rob = mks(T.rob, t.rob ?? null); T.terpapar_jiwa = mks(T.terpapar_jiwa, t.terpapar_jiwa ?? null);
    }
    if (!lama) { T.kejadian_kode = [...kode].sort(); T.kejadian_aktif = kode.size; }
    for (const p of provinsi) for (const k of p.kab) if (k.status != null) T.per_status[["Aman", "Waspada", "Siaga", "Awas"][k.status]]++;
    return {hari: docs.map(d => d.hari).sort().at(-1), sumber: [...new Set(docs.flatMap(d => d.sumber || []))], provinsi, total: T};
  }

  /* tanggal yang dipakai periode. ada = daftar hari berarsip; akhir = hari terakhir periode */
  function periodeHari(mode, ada, akhir, bulan = []) {
    const a = [...new Set(ada)].sort();
    if (mode === "hari") return [akhir];
    if (mode === "bln") return a.filter(t => bulan.includes(t.slice(0, 7)));
    const awal = mode === "7" ? geser(akhir, -6) : mode === "30" ? geser(akhir, -29) : akhir.slice(0, 4) + "-01-01";
    return a.filter(t => t >= awal && t <= akhir);
  }
  const hariAwal = (ada, hariIni) => [...ada].filter(t => t <= hariIni).sort().at(-1) || null;

  /* kalender satu bulan, Senin di kolom pertama; hari tanpa arsip terkunci. sebelum/sesudah = bulan berarsip terdekat atau null */
  function kalender(bulan, ada, hariIni) {
    const A = new Set(ada), [y, m] = bulan.split("-").map(Number), n = new Date(Date.UTC(y, m, 0)).getUTCDate(), awal = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
    const bl = [...new Set([...A].map(t => t.slice(0, 7)))].sort();
    return {bulan, judul: `${BLN_PJG[m - 1]} ${y}`, kosongAwal: awal, sebelum: bl.filter(b => b < bulan).at(-1) || null, sesudah: bl.find(b => b > bulan) || null,
      sel: Array.from({length: n}, (_, i) => { const t = `${bulan}-${String(i + 1).padStart(2, "0")}`; return {t, d: i + 1, terkunci: !A.has(t) || t > hariIni}; })};
  }

  /* "Kemarin, Sen 26 Okt (hari utuh terakhir)": akhiran hanya pada hari terbaru yang belum hari ini */
  function labelHari(t, hariIni, terbaru) {
    const rel = t === hariIni ? "Hari ini" : t === geser(hariIni, -1) ? "Kemarin" : "";
    return `${rel ? rel + ", " : ""}${tglLain(t)}${t === terbaru && t < hariIni && t >= geser(hariIni, -1) ? " (hari utuh terakhir)" : ""}`;
  }
  function labelPeriode(mode, hari, akhir, bulan, hariIni, terbaru, termuat) {
    if (mode === "hari") return labelHari(akhir, hariIni, terbaru);
    const n = hari.length, ket = !n ? "belum ada arsip" : termuat != null && termuat < n ? `${termuat} dari ${n} hari` : `${n} hari berarsip`;
    if (mode === "bln") return `${[...bulan].sort().map(namaBln).join(", ")}, ${ket}`;
    if (mode === "th") return `Tahun ${akhir.slice(0, 4)}, ${ket}`;
    return `${tglLain(geser(akhir, mode === "7" ? -6 : -29))} sampai ${tglLain(akhir)}, ${ket}`;
  }

  const API = {st, agregat, periodeHari, hariAwal, kalender, labelHari, labelPeriode, tglLain, namaBln, urutBaris};
  if (typeof module !== "undefined" && module.exports) module.exports = API; else akar.Wilayah = API;
  if (typeof document === "undefined") return;

  /* ------------------------------------------------------------ bagian DOM */
  const W = {file: null, ada: [], per: "hari", pilih: null, bulan: [], kalBln: null, kalBuka: false, cache: new Map(), kunci: "", muat: "", agg: null, hari: [], n: 0};
  const PERIODE = [["hari", "Sehari"], ["7", "7 hari"], ["30", "30 hari"], ["th", "Tahun ini"]];
  const IK = {kej: '<path d="M12 2.5s-6 6.7-6 11a6 6 0 0 0 12 0c0-4.3-6-11-6-11Z"/>', rob: '<path d="M3 8c3 0 3-2 6-2s3 2 6 2 3-2 6-2M3 14c3 0 3-2 6-2s3 2 6 2 3-2 6-2"/>',
    h3: '<path d="M7 14a4 4 0 0 1-.5-8A6 6 0 0 1 18 5a4 4 0 0 1-1 9"/><path d="M8 17v3M12 16v4M16 17v3"/>', td: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/>',
    kal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'};
  const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK[k]}</svg>`;
  const chip = (k, w, s, l, t) => `<span class="lg-c" style="--w:${w}" title="${t}">${svg(k)}<b>${s}</b>${l}</span>`;   // label pendek; arti lengkap di title
  const G = "grid-template-columns:20px minmax(0,1.5fr) 64px 34px 34px 42px 72px";
  const akhir = () => W.pilih || W.file?.hari;
  const pilSt = s => s == null ? "–" : `<span class="pill l${s}">${s ? LEVEL[s] : "Aman"}</span>`;
  const n = v => v == null ? "–" : fmt(v);

  /* satu dokumen harian; hari terbaru dari wilayah_hari.json, lainnya dari hari/<tanggal>.json; gagal = null */
  function ambil(t) {
    if (t === W.file?.hari) return Promise.resolve(W.file);
    if (!W.cache.has(t)) W.cache.set(t, muatJSON(`data/hari/${t}.json`).catch(() => null));
    return W.cache.get(t);
  }
  async function kolam(daftar, fn, lebar = 6) {
    const hasil = new Array(daftar.length); let i = 0;
    await Promise.all(Array.from({length: Math.min(lebar, daftar.length)}, async () => { while (i < daftar.length) { const k = i++; hasil[k] = await fn(daftar[k]); } }));
    return hasil;
  }
  const kunciKini = () => [W.per, akhir(), W.bulan.join(",")].join("|");

  /* menghitung agregat periode terpilih; selesai -> gambar ulang daftar bila keadaannya belum berubah */
  function hitung() {
    const k = kunciKini(); if (k === W.kunci || k === W.muat) return;
    const hari = periodeHari(W.per, W.ada, akhir(), W.bulan);
    if (hari.length <= 1 && hari[0] === W.file?.hari || !hari.length) { W.termuat = null; W.kunci = k; W.hari = hari; W.agg = hari.length ? W.file : null; return; }
    W.kunci = ""; W.agg = null; W.hari = hari; W.muat = k;
    kolam(hari, ambil).then(docs => { if (kunciKini() !== k) return; W.muat = ""; W.termuat = docs.filter(Boolean).length; W.agg = agregat(docs); W.kunci = k; if (typeof renderDaftar === "function" && S.jalur.length < 2) renderDaftar(); });
  }

  function kontrol() {
    const blnAda = [...new Set(W.ada.map(t => t.slice(0, 7)))].sort().reverse(), a = akhir();
    const seg = `<div class="seg penuh" role="group" aria-label="Periode tabel wilayah" id="wlPeriode">${PERIODE.map(([v, nm]) => `<button type="button" data-wp="${v}" aria-pressed="${W.per === v}">${nm}</button>`).join("")}
      <details class="wl-bln${W.per === "bln" ? " on" : ""}"><summary aria-label="Pilih bulan">${W.per === "bln" && W.bulan.length ? (W.bulan.length === 1 ? namaBln(W.bulan[0]) : W.bulan.length + " bulan") : "Bulan"}</summary>
      <div class="wl-pop">${blnAda.map(b => `<label><input type="checkbox" value="${b}"${W.bulan.includes(b) ? " checked" : ""}>${namaBln(b)}</label>`).join("")}<button type="button" data-wbln>Terapkan</button></div></details></div>`;
    const label = labelPeriode(W.per, W.hari, a, W.bulan, wibHariIni(), W.file?.hari, W.termuat);
    const baris = `<div class="tr-baris"><div class="tr-hari"><b>${esc(label)}</b></div><button type="button" class="wl-lain" id="wlLain" aria-expanded="${W.kalBuka}" aria-controls="wlKal"${W.ada.length ? "" : " disabled"}>${svg("kal")}Tanggal lain</button></div>`;
    return seg + baris + `<div class="wl-kal" id="wlKal"${W.kalBuka ? "" : " hidden"}>${W.kalBuka ? kalenderHtml() : ""}</div>`;
  }
  function kalenderHtml() {
    const kb = W.kalBln || akhir().slice(0, 7), K = kalender(kb, W.ada, wibHariIni());
    return `<div class="wl-kh"><button type="button" data-wk="${K.sebelum || ""}" aria-label="Bulan sebelumnya"${K.sebelum ? "" : " disabled"}>&lsaquo;</button><b>${K.judul}</b><button type="button" data-wk="${K.sesudah || ""}" aria-label="Bulan berikutnya"${K.sesudah ? "" : " disabled"}>&rsaquo;</button></div>
      <div class="wl-kg">${HARI3.slice(1).concat(HARI3[0]).map(h => `<i>${h}</i>`).join("")}${"<span></span>".repeat(K.kosongAwal)}${K.sel.map(c =>
        `<button type="button" data-wt="${c.t}"${c.terkunci ? " disabled" : ""} aria-label="${tglLain(c.t)}"${c.t === akhir() && W.per === "hari" ? ' aria-pressed="true"' : ""}>${c.d}</button>`).join("")}</div>`;
  }

  /* isi daftar untuk jalur provinsi (j kosong) atau kabupaten/kota (j = [provinsi]); "" bila data belum ada sehingga peta.js memakai tabel lama */
  function html(j) {
    if (!W.file) return "";
    hitung();
    const kep = kontrol(), D = W.agg;
    if (!D) return kep + `<div class="kosong">${W.hari.length ? "Memuat arsip harian…" : "Belum ada arsip untuk periode ini."}</div>`;
    let baris, kunciDari;
    if (j.length === 1) {
      const p = (D.provinsi || []).find(x => x.kode === j[0] || x.nama === namaProv(j[0]));
      baris = p?.kab || []; kunciDari = r => String(r.kode).includes("|") ? r.kode : `${j[0]}|${r.nama}`;
    } else { baris = D.provinsi || []; kunciDari = r => r.kode; }
    const urut = [...baris].sort(urutBaris), T = D.total || {};
    const legenda = `<div class="lg-hs">${chip("kej", "#1d4e89", "WS", "Wilayah Siaga", "Wilayah Siaga (prakiraan model), jumlah gugus")}${chip("rob", "#2b8c86", "RB", "Rob", "Titik rob berstatus Waspada atau lebih")}${chip("h3", "#4f8fc4", "H3", "Hujan 3 hari", "Hujan 3 hari terbesar, mm")}${chip("td", "#c9503a", "PD", "Penduduk", "Penduduk semua kecamatan berstatus Siaga atau Awas (WorldPop), jiwa; bukan jumlah korban atau yang tergenang")}</div>`;
    const kepala = `<div class="tb kepala" style="${G}" title="Sumber: BMKG (prakiraan dan peringatan), Open-Meteo (hujan), GloFAS (sungai), InaRISK (bahaya), WorldPop (penduduk)"><span></span><span>${j.length ? "Kabupaten / kota" : "Provinsi"}</span><span style="text-align:right">Status</span><span class="n" title="Wilayah Siaga (prakiraan), gugus">WS</span><span class="n" title="Rob, titik Waspada+">RB</span><span class="n" title="Hujan 3 hari, mm">H3 mm</span><span class="n" title="Penduduk semua kecamatan berstatus Siaga atau Awas (WorldPop), bukan jumlah korban atau yang tergenang">PD jiwa</span></div>`;
    const total = j.length ? "" : `<div class="tb tb-total" style="${G}"><span></span><span>Grand total</span><span></span><span class="n">${n(T.kejadian_aktif)}</span><span class="n">${n(T.rob)}</span><span class="n">–</span><span class="n">${n(T.terpapar_jiwa)}</span></div>`;
    return kep + legenda + kepala + total + (urut.length ? urut.map((r, i) => `<button class="tb${(st(r.status) ?? 0) >= 2 ? " hl" + st(r.status) : ""}" style="${G}" role="listitem" data-k="${esc(kunciDari(r))}">
      <span class="rk">${i + 1}</span><span style="font-weight:600">${esc(r.nama)}</span><span style="text-align:right" data-sort="${st(r.status) ?? -1}">${pilSt(st(r.status))}</span>
      <span class="n" data-sort="${r.kejadian_aktif ?? -1}">${n(r.kejadian_aktif)}</span><span class="n" data-sort="${r.rob ?? -1}">${n(r.rob)}</span>
      <span class="n" data-sort="${r.hujan3_mm ?? -1}">${r.hujan3_mm == null ? "–" : fmt(Math.round(r.hujan3_mm))}</span><span class="n" data-sort="${r.terpapar_jiwa ?? -1}">${n(r.terpapar_jiwa)}</span></button>`).join("") : `<div class="kosong">Tidak ada wilayah di tingkat ini.</div>`);
  }

  /* klik kontrol: chrome (pil aktif, buka-tutup kalender) urgent di tempat; tabel berat digambar ulang sesudah satu frame lewat nanti() */
  const gambarUlang = () => { const r = $("#rows"); r?.classList.add("wl-redup"); nanti(() => { if (typeof renderDaftar === "function") renderDaftar(); r?.classList.remove("wl-redup"); }); };
  function klik(e) {
    const rows = $("#rows"), pr = e.target.closest("[data-wp]"), bl = e.target.closest("[data-wbln]"), ln = e.target.closest("#wlLain"), tg = e.target.closest("[data-wt]"), nv = e.target.closest("[data-wk]");
    if (pr) { W.per = pr.dataset.wp; rows.querySelectorAll("#wlPeriode>button").forEach(b => b.setAttribute("aria-pressed", b === pr)); rows.querySelector(".wl-bln")?.classList.remove("on"); return gambarUlang(); }
    if (bl) { const v = [...bl.closest(".wl-pop").querySelectorAll("input:checked")].map(x => x.value).sort(); if (!v.length) return; W.per = "bln"; W.bulan = v;
      rows.querySelectorAll("#wlPeriode>button").forEach(b => b.setAttribute("aria-pressed", "false")); const d = bl.closest("details"); d.open = false; d.classList.add("on");
      d.querySelector("summary").textContent = v.length === 1 ? namaBln(v[0]) : v.length + " bulan"; return gambarUlang(); }
    if (ln) { W.kalBuka = !W.kalBuka; ln.setAttribute("aria-expanded", W.kalBuka); const k = $("#wlKal"); k.hidden = !W.kalBuka; if (W.kalBuka) k.innerHTML = kalenderHtml(); return; }
    if (nv) { if (!nv.dataset.wk) return; W.kalBln = nv.dataset.wk; $("#wlKal").innerHTML = kalenderHtml(); return; }
    if (tg && !tg.disabled) { W.pilih = tg.dataset.wt; W.per = "hari"; W.kalBuka = false; W.kalBln = null; $("#wlKal").hidden = true; $("#wlLain").setAttribute("aria-expanded", "false");
      rows.querySelectorAll("#wlPeriode>button").forEach(b => b.setAttribute("aria-pressed", b.dataset.wp === "hari")); return gambarUlang(); }
  }

  async function muat() {
    const [file, idx] = await Promise.all([muatJSON("data/wilayah_hari.json").catch(() => null), muatJSON("data/hari/indeks.json").catch(() => null)]);
    if (!file) return;                                               // pipeline belum menulis: panel tetap tabel lama
    W.file = file; W.ada = [...new Set([...(idx?.hari || []), file.hari])].sort();
    if (S.fiturWil && typeof renderDaftar === "function" && S.jalur.length < 2) renderDaftar();
  }
  addEventListener("DOMContentLoaded", () => { $("#rows")?.addEventListener("click", klik); muat(); });
  akar.Wilayah = Object.assign(API, {html, W});
})(typeof self !== "undefined" ? self : globalThis);
