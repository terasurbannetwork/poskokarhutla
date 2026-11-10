"use strict";
/* Katalog BMKG / InaTEWS: lima pilihan yang sama dengan bmkg.go.id/gempabumi (Terkini, M 5,0+, Dirasakan, Berpotensi Tsunami, Real-time),
   laci detail satu kejadian, peringatan tsunami aktif, dan lapisan peta semua magnitudo.
   Data dibaca LANGSUNG dari cdn.bmkg.go.id (CORS *) tanpa Worker/D1; bila gagal, mundur ke arsip scripts/gempa/inatews.py
   (data/inatews_*.json, append-only karena BMKG hanya menyimpan 30 buletin terakhir). Status tsunami BMKG tampil apa adanya, tidak pernah ditafsir ulang.
   Bagian atas (pengurai, pencocokan, aktif) murni tanpa DOM supaya bisa diuji di Node (tests/gempa/inatews.test.mjs). */
const Ina = {
  CDN: "https://cdn.bmkg.go.id/",
  PRODUK_URL: "https://www.bmkg.go.id/gempabumi",
  LEVEL: {AWAS: ["Awas", "#d64545", 3], SIAGA: ["Siaga", "#e8743b", 2], WASPADA: ["Waspada", "#e0b400", 1]},
  /* ---------------------------------------------------------------- pengurai murni */
  ent: s => String(s ?? "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&").trim(),
  /* produksi: DOMParser text/xml (parsererror = lempar); tanpa DOMParser (uji Node) jatuh ke regex. Simpul = Element atau string. */
  raiz(teks) { if (typeof DOMParser === "undefined") return teks; const d = new DOMParser().parseFromString(teks, "text/xml"); if (d.getElementsByTagName("parsererror").length) throw new Error("xml rusak"); return d.documentElement; },
  /* hasil urai dipakai ulang bila teks sama (polling tidak mengurai ulang); paling banyak 8 teks */
  memo(k, teks, f) { const m = this._m ||= new Map(), kk = k + teks; if (m.has(kk)) return m.get(kk); const v = f(); if (m.size >= 8) m.delete(m.keys().next().value); m.set(kk, v); return v; },
  idok: s => /^[\w.-]{1,40}$/.test(s || ""),
  semua(t, tag) { if (typeof t !== "string") return [...t.getElementsByTagNameNS("*", tag)]; const o = [], re = new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "g"); let m; while ((m = re.exec(t))) o.push(m[1]); return o; },
  satu(t, tag) { const m = this.semua(t, tag)[0]; return m == null ? "" : typeof m === "string" ? this.ent(m.replace(/<[^>]+>/g, "")) : m.textContent.trim(); },
  angka: s => { const m = String(s ?? "").match(/-?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : null; },
  /* '10-11-26' atau '15-08-2026' + '15:34:04 WIB' atau '05:41 WIB' -> epoch ms UTC */
  wib(tgl, jam) { const [d, m, y] = String(tgl).trim().split("-").map(Number), h = String(jam).replace("WIB", "").trim().split(":").map(Number);
    return Date.UTC(y + (y < 100 ? 2000 : 0), m - 1, d, (h[0] || 0) - 7, h[1] || 0, h[2] || 0); },
  utc(s) { const m = String(s).trim().replace(/\//g, "-").match(/(\d{4})-(\d\d)-(\d\d)\s+(\d\d):(\d\d):(\d\d)/); return m ? Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : NaN; },
  jenisBuletin: s => /tsunami/i.test(s) ? "tsunami" : /dirasakan/i.test(s) ? "dirasakan" : "m5",
  /* live30event.xml -> kejadian semua magnitudo */
  live(teks) { return this.memo("live", teks, () => this.semua(this.raiz(teks), "gempa").map(g => { const v = t => this.satu(g, t);
      return {id: v("eventid"), t: this.utc(v("waktu")), lat: parseFloat(v("lintang")), lon: parseFloat(v("bujur")), dalam: this.angka(v("dalam")), m: Math.round(parseFloat(v("mag")) * 10) / 10, tempat: v("area"), status: v("status"), fokal: v("fokal")}; })
    .filter(k => this.idok(k.id) && isFinite(k.t) && isFinite(k.lat) && isFinite(k.m))); },
  /* last30event / last30feltevent / last30tsunamievent (CAP) -> buletin */
  cap(teks) { return this.memo("cap", teks, () => this.cap0(teks)); },
  cap0(teks) { const o = [];
    for (const info of this.semua(this.raiz(teks), "info")) { try { const v = t => this.satu(info, t), pt = v("coordinates").split(",").map(parseFloat);
      if (!this.idok(v("eventid")) || pt.length < 2 || !isFinite(pt[0]) || !isFinite(parseFloat(v("magnitude")))) continue;
      const ts = v("timesent").match(/(\d\d)\/(\d\d)\/(\d{4}) (\d\d:\d\d:\d\d)/), t = this.wib(v("date"), v("time"));
      o.push({id: v("eventid"), jenis: this.jenisBuletin(v("subject")), subjek: v("subject"), t, lat: pt[1], lon: pt[0], m: Math.round(parseFloat(v("magnitude")) * 10) / 10, dalam: this.angka(v("depth")), area: v("area"), potensi: v("potential"),
        judul: v("headline"), deskripsi: v("description"), instruksi: v("instruction"), felt: v("felt"), berakhir: /berakhir/i.test(v("headline")), terbit: ts ? this.wib(ts[1] + "-" + ts[2] + "-" + ts[3], ts[4]) : t,
        peta: Object.fromEntries(["shakemap", "wzmap", "ttmap", "sshmap"].map(k => [k, v(k)]).filter(x => x[1])),
        zona: this.semua(info, "wzarea").map(z => [this.satu(z, "province"), this.satu(z, "district"), this.satu(z, "level"), this.wib(this.satu(z, "date"), this.satu(z, "time"))]),
        pantau: this.semua(info, "obsarea").map(z => [this.satu(z, "location"), parseFloat(this.satu(z, "loclatitude")), parseFloat(this.satu(z, "loclongitude")), parseFloat(this.satu(z, "height")), this.wib(this.satu(z, "date"), this.satu(z, "time"))])}); } catch (e) { /* satu buletin rusak dibuang, sisanya lanjut */ } }
    return o; },
  /* tabel stasiun stationlist_MMI.txt -> [id, nama, lat, lon, jarak km, mmi, ew, ns, ud] */
  stasiun(teks) { const o = [], re = /\|\s*(\d+)\s*\|\s*([A-Z0-9]+)\s*\|\s*([^|]+)\|\s*(-?\d+(?:\.\d+)?)\s*\|\s*(-?\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(X\+|[IVX]+)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)\s*\|\s*(\d+(?:\.\d+)?)/g;
    let m; const s = String(teks).replace(/\r?\n/g, " "); while ((m = re.exec(s))) o.push([m[2], m[3].trim(), +m[4], +m[5], +m[6], m[7], +m[8], +m[9], +m[10]]); return o; },
  ROM: "XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I",
  /* '<II - III Manokwari>' atau 'III Darajat, III Pasirwangi' -> [{mmi:'II - III', nilai:3, wilayah}] */
  felt(s) { const re = new RegExp("^(" + this.ROM + ")(?:\\s*-\\s*(" + this.ROM + "))?\\s+(.+)$"), r = x => this.ROM.split("|").reverse().indexOf(x) + 1;
    return String(s || "").split(/[,;]/).map(x => x.trim().match(re)).filter(Boolean).map(m => ({mmi: m[2] ? m[1] + " - " + m[2] : m[1], nilai: r(m[2] || m[1]), wilayah: m[3].trim()})); },
  /* status tsunami resmi apa adanya: BMKG menulis 'tidak berpotensi TSUNAMI' / 'Potensi TSUNAMI ...'; selain itu BMKG tidak menyebut tsunami (null, tidak ditafsir) */
  potensi(p) { const s = String(p || ""); return /tidak\s+berpotensi\s+tsunami/i.test(s) ? ["Tidak berpotensi tsunami", "#5b6575"] : /tsunami/i.test(s) ? ["Potensi tsunami", "#d64545"] : null; },
  jarak(a, b, c, d) { const p = Math.PI / 180, h = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); },
  /* kejadian terdekat dengan asal x: selisih waktu <= dt detik dan jarak <= dj km; skor kecil menang. Sama dengan cocok() di inatews.py */
  cocok(x, daftar, dt = 90, dj = 100) { let pilih = null, skor = 9;
    for (const k of daftar) { const w = Math.abs(k.t - x.t) / 1e3; if (w > dt) continue; const j = this.jarak(k.lat, k.lon, x.lat, x.lon); if (j <= dj && w / dt + j / dj < skor) { pilih = k; skor = w / dt + j / dj; } }
    return pilih; },
  /* kelompok tsunami: buletin dengan asal sama; terbaru dulu */
  kelompok(bul) { const G = [];
    for (const b of bul.filter(x => x.jenis === "tsunami").sort((x, y) => x.id < y.id ? -1 : 1)) { const g = G.find(q => Math.abs(q[0].t - b.t) <= 90e3 && this.jarak(q[0].lat, q[0].lon, b.lat, b.lon) <= 100); g ? g.push(b) : G.push([b]); }
    return G.map(bs => { const r = bs[bs.length - 1]; return {key: "bul" + bs[0].id, t: r.t, lat: r.lat, lon: r.lon, m: r.m, area: r.area, buletin: bs}; }).sort((a, b) => b.t - a.t); },
  /* aktif = buletin terbaru belum menyatakan berakhir dan terbit belum lewat 12 jam. Hanya membaca pernyataan BMKG. */
  aktif(g, kini = Date.now(), jam = 12) { const b = g.buletin[g.buletin.length - 1]; return !!b && !b.berakhir && kini - b.terbit >= -6e4 && kini - b.terbit < jam * 36e5; },

  /* ---------------------------------------------------------------- jaringan dan arsip */
  _c: new Map(),
  async teks(nama, ms = 12000) { const a = new AbortController(), h = setTimeout(() => a.abort(), ms);
    try { const r = await fetch(this.CDN + nama, {signal: a.signal}); if (!r.ok) throw new Error(nama + " " + r.status); return await r.text(); } finally { clearTimeout(h); } },
  /* cache pendek per kunci supaya klik berulang tidak memukul BMKG */
  ingat(k, detik, f) { const c = this._c.get(k); if (c && Date.now() - c.t < detik * 1e3) return c.v; const v = f(); this._c.set(k, {t: Date.now(), v}); v.catch(() => this._c.delete(k)); return v; },
  arsip: n => Ina.ingat("a:" + n, 300, () => muatJSON("data/" + n)),
  async arsipOpsi(n) { return this.arsip(n).catch(() => null); },
  ym: t => new Date(t).toISOString().slice(0, 7),
  /* katalog semua magnitudo: arsip digabung live30event (live menang) */
  katalog() { return this.ingat("katalog", 60, async () => {
    const [a, l] = await Promise.all([this.arsipOpsi("inatews_katalog.json"), this.ingat("live", 30, () => this.teks("live30event.xml")).then(t => this.live(t), () => null)]);
    const d = new Map(); const kol = a?.kolom || [];
    for (const r of a?.baris || []) { const k = Object.fromEntries(kol.map((c, i) => [c, r[i]])); k.t *= 1e3; d.set(k.id, k); }
    for (const k of l || []) d.set(k.id, {...d.get(k.id), ...k});
    return {daftar: [...d.values()].sort((x, y) => y.t - x.t), langsung: !!l, dibuat: a?.dibuat || null}; }); },
  /* buletin CAP: langsung dari BMKG, mundur ke arsip detail dan tsunami */
  async buletin(jenis) { const f = {m5: "last30event.xml", dirasakan: "last30feltevent.xml", tsunami: "last30tsunamievent.xml"}[jenis];
    return this.ingat("b:" + jenis, jenis === "tsunami" ? 120 : 60, async () => {
      try { return {daftar: this.cap(await this.teks(f)), langsung: true}; }
      catch (e) { return {daftar: await this.buletinArsip(jenis), langsung: false}; } }); },
  async buletinArsip(jenis) { const kini = new Date(), bulan = [0, 1, 2].map(i => new Date(Date.UTC(kini.getUTCFullYear(), kini.getUTCMonth() - i, 1)).toISOString().slice(0, 7)), o = [];
    if (jenis === "tsunami") { const t = await this.arsipOpsi("inatews_tsunami.json"); for (const g of Object.values(t?.kejadian || {})) for (const b of g.buletin) o.push({...b, jenis, t: g.t * 1e3, terbit: b.terbit * 1e3, lat: g.lat, lon: g.lon, m: g.m, area: g.area, zona: (b.zona || []).map(z => [z[0], z[1], z[2], z[3] * 1e3]), pantau: (b.pantau || []).map(z => [z[0], z[1], z[2], z[3], z[4] * 1e3])}); return o; }
    for (const ym of bulan) { const d = await this.arsipOpsi("inatews_detail_" + ym + ".json"); for (const k of Object.values(d?.kejadian || {})) for (const b of k.buletin) if (b.jenis === jenis) o.push({...b, t: b.t * 1e3, terbit: (b.terbit || b.t) * 1e3, area: b.area || k.tempat}); }
    return o; },
  grupTsunami() { return this.buletin("tsunami").then(r => ({grup: this.kelompok(r.daftar), langsung: r.langsung})); },

  /* ---------------------------------------------------------------- tampilan: format */
  waktu: t => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit"}).replace(",", "") + " WIB",
  jam: t => new Date(t).toLocaleTimeString("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit"}) + " WIB",
  /* teks BMKG apa adanya: KAPITAL dijadikan huruf judul (singkatan sampai 4 huruf, mis. NTT, tetap), tanda hubung jadi koma */
  tempat: s => { const r = String(s || "").trim().replace(/\b[A-Z]{2,}(?:-[A-Z]{2,})*\b/g, t => t.split("-").map(x => x.length <= 4 ? x : x[0] + x.slice(1).toLowerCase()).join(", ")); return r ? (typeof wilayahPendek === "function" ? wilayahPendek(r) : r) : "–"; },
  dalam: d => d == null || !isFinite(d) ? "–" : fmt(d) + " km",
  pilLevel: l => { const v = Ina.LEVEL[String(l).toUpperCase()]; return `<span class="pill pm" style="--w:${v ? v[1] : "#5b6575"}">${v ? v[0] : esc(l)}</span>`; },
  pilMMI: (s, n) => `<span class="lc-mmi" style="--w:${typeof MMI_WARNA !== "undefined" ? MMI_WARNA[Math.min(12, Math.max(1, n))] : "#c9961a"};color:${n <= 3 ? "#3b3320" : "#fff"}">MMI ${esc(s)}</span>`,
  ik: d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`,
  JENIS: [["terkini", "Terkini", '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'], ["m5", "M 5,0+", '<circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="9.5"/>'],
    ["dirasakan", "Dirasakan", '<path d="M2 12h4l2-5 3 10 3-12 2 7h6"/>'], ["tsunami", "Berpotensi Tsunami", '<path d="M2 12c2.5-6 4.5-6 7 0s4.5 6 7 0 3.5-4 6-3"/><path d="M2 19h20"/>'],
    ["riwayat", "Riwayat", '<path d="M4 5h16M4 12h16M4 19h10"/><path d="M18 15v4l2 1"/>'], ["realtime", "Real-time", '<path d="M5 12a7 7 0 0 1 14 0M8 12a4 4 0 0 1 8 0"/><circle cx="12" cy="12" r="1.2"/><path d="M12 14v6"/>']],

  /* ---------------------------------------------------------------- daftar tab Katalog */
  st: {jenis: "terkini", urut: "t", turun: true, hal: 0, rw: "merusak", q: ""}, PER: 15, baris: [],
  pd: s => (String(s).match(/PD-[\d.]+/i) || [""])[0].toUpperCase(),
  /* warna pil P.D. menurut nomor di subject BMKG; PD-4 = pengakhiran (abu), tidak ada tafsir lain */
  pilPD(b) { const p = this.pd(b.subjek), w = p === "PD-4" ? "#5b6575" : p.startsWith("PD-3") ? "#d64545" : p === "PD-2" ? "#e8743b" : "#e0b400"; return `<span class="pill pm" style="--w:${w}">${esc(p || b.subjek)}</span>`; },
  d2: v => Math.abs(v).toLocaleString("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2}),
  koord(la, lo) { return la == null || lo == null ? "–" : `${this.d2(la)}° ${la < 0 ? "LS" : "LU"}, ${this.d2(lo)}° ${lo < 0 ? "BB" : "BT"}`; },
  BLN: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
  tglID(iso) { const m = String(iso || "").match(/^(\d{4})-(\d\d)-(\d\d)$/); return m ? `${+m[3]} ${this.BLN[m[2] - 1]} ${m[1]}` : "–"; },
  jamID: s => { const m = String(s || "").match(/^(\d\d):(\d\d)/); return m ? m[1] + "." + m[2] : "–"; },
  async muatRiwayat() { const R = this.RW[this.st.rw], j = await this.arsip(R.f.replace("data/", "")), L = j[R.kunci || "baris"] || [], dash = v => v == null || v === "" ? "–" : esc(v);
    const rows = L.map(x => { const v = {}; for (const [c] of R.kol) v[c] = c === "koor" ? [this.koord(x.lintang, x.bujur), x.lintang ?? -99] : c === "korban_meninggal" ? [dash(x.korban_meninggal ?? x.korban_meninggal_teks), x.korban_meninggal ?? -1]
        : c === "tanggal" ? [x.tanggal_teks ? esc(x.tanggal_teks) : this.tglID(x.tanggal), x.tanggal || ""] : c === "jam" ? [this.jamID(x.jam), x.jam || ""] : c === "tsunami" ? [x.tsunami == null ? "–" : x.tsunami ? "Ya" : "Tidak", x.tsunami == null ? -1 : +x.tsunami] : ["magnitudo", "kedalaman_km", "magnitudo_gempa", "tinggi_maks_m"].includes(c) ? [dash(x[c] == null ? null : fmt(x[c])), x[c] ?? -1]
        : ["dirasakan", "korban_kerusakan", "catatan", "catatan_pengamatan"].includes(c) ? [x[c] ? `<span class="ina-ln" title="${esc(x[c])}">${esc(x[c])}</span>` : "–", x[c] || ""] : [dash(x[c]), x[c] ?? ""];
      return {tak: true, v, teks: Object.values(x).filter(y => typeof y === "string").join(" ").toLowerCase(), t: Date.parse(x.tanggal) || 0, m: 0}; });
    return {langsung: false, riwayat: j, rows}; },
  KOL0: [["t", "Waktu"], ["m", "Kekuatan", 1], ["dalam", "Kedalaman", 1], ["tempat", "Wilayah"], ["info", "Keterangan"]],
  KOLT: [["pd", "P.D. Tsunami"], ["t", "Waktu"], ["m", "Kekuatan", 1], ["dalam", "Kedalaman", 1], ["koor", "Koordinat"], ["tempat", "Wilayah"], ["lagi", ""]],
  /* katalog PDF BMKG (scripts/gempa/katalog_pdf.py): nilai null tampil strip, tidak ditebak */
  RW: {merusak: {n: "Gempa merusak", f: "data/katalog_merusak.json", kol: [["tanggal", "Tanggal"], ["jam", "Jam (UTC)"], ["magnitudo", "Kekuatan", 1], ["kedalaman_km", "Kedalaman", 1], ["koor", "Koordinat"], ["lokasi", "Lokasi"], ["tsunami", "Tsunami"], ["dirasakan", "Dirasakan"], ["korban_kerusakan", "Korban dan kerusakan"]]},
    tsunami: {n: "Tsunami", f: "data/katalog_tsunami.json", kol: [["tanggal", "Tanggal"], ["pukul_utc", "Pukul (UTC)"], ["magnitudo_gempa", "Kekuatan", 1], ["koor", "Koordinat"], ["sumber_tsunami", "Sumber tsunami"], ["jenis_sumber", "Jenis"], ["tinggi_maks_m", "Tinggi maks. (m)", 1], ["korban_meninggal", "Meninggal", 1], ["referensi", "Rujukan"], ["catatan", "Catatan"]]},
    wilayah: {n: "Tsunami per wilayah", f: "data/katalog_tsunami.json", kunci: "baris_wilayah", kol: [["wilayah", "Wilayah"], ["tanggal", "Tanggal"], ["magnitudo_gempa", "Kekuatan", 1], ["sumber_tsunami", "Sumber tsunami"], ["tinggi_maks_m", "Tinggi maks. (m)", 1], ["korban_meninggal", "Meninggal", 1], ["referensi", "Rujukan"], ["catatan_pengamatan", "Catatan pengamatan"]]}},
  get KOL() { return this.st.jenis === "tsunami" ? this.KOLT : this.st.jenis === "riwayat" ? this.RW[this.st.rw].kol : this.KOL0; },
  /* baris seragam: {key, bids, t, lat, lon, m, dalam, tempat, info:[html, nilaiUrut]} */
  async muatBaris(j) {
    const kat = async () => (await this.katalog());
    if (j === "terkini" || j === "realtime") { const k = await kat(), dari = Date.now() - (j === "terkini" ? 864e5 : 5 * 864e5), s = k.daftar.filter(x => x.t >= dari);
      return {langsung: k.langsung, rows: s.map(x => ({key: x.id, bids: [], t: x.t, lat: x.lat, lon: x.lon, m: x.m, dalam: x.dalam, tempat: x.tempat,
        info: [x.fokal === "mt_yes" ? "Mekanisme sumber tersedia" : esc(x.status || "–"), x.fokal === "mt_yes" ? 1 : 0]}))}; }
    if (j === "riwayat") return this.muatRiwayat();
    if (j === "tsunami") { const {grup, langsung} = await this.grupTsunami();
      return {langsung, rows: grup.flatMap(g => g.buletin.map(b => ({key: g.key, bid: b.id, bids: [b.id], tsu: g, t: b.t, lat: b.lat, lon: b.lon, m: b.m, dalam: b.dalam, tempat: b.area, b}))).sort((x, y) => x.bid < y.bid ? 1 : -1)}; }
    const r = await this.buletin(j), k = await kat().catch(() => ({daftar: []}));
    return {langsung: r.langsung, rows: r.daftar.map(b => { const kj = this.cocok(b, k.daftar), pot = this.potensi(b.potensi), mm = j === "dirasakan" ? this.felt(b.felt) : [];
      return {key: kj?.id || "bul" + b.id, bids: [b.id], t: b.t, lat: b.lat, lon: b.lon, m: b.m, dalam: b.dalam, tempat: b.area,
        info: [j === "dirasakan" ? (mm.length ? mm.map(x => this.pilMMI(x.mmi, x.nilai) + " " + esc(x.wilayah)).join(" ") : esc(b.felt || "–")) : pot ? `<span class="pill pm" style="--w:${pot[1]}">${pot[0]}</span> <small>menurut BMKG</small>` : "BMKG tidak menyebut tsunami", mm.length ? Math.max(...mm.map(x => x.nilai)) : 0]}; })}; },
  tp: r => r.tp ??= Ina.tempat(r.tempat),
  sel(r, c) { if (r.v) return r.v[c][0]; if (c === "pd") return this.pilPD(r.b); if (c === "koor") return `<span translate="no">${this.koord(r.lat, r.lon)}</span>`; if (c === "lagi") return `<span class="ina-lg">Selengkapnya ›</span>`;
    return c === "t" ? `<span translate="no">${esc(Ina.waktu(r.t))}</span>` : c === "m" ? pilM(r.m) : c === "dalam" ? Ina.dalam(r.dalam) : c === "tempat" ? `<span translate="no">${esc(Ina.tp(r))}</span>` : r.info[0]; },
  nilai: (r, c) => r.v ? r.v[c][1] : c === "pd" ? r.bid : c === "koor" ? r.lat : c === "lagi" ? 0 : c === "tempat" ? Ina.tp(r) : c === "info" ? r.info[1] : c === "dalam" ? (r.dalam ?? -1) : r[c],
  judul(j, R, langsung) { const n = R.length, mx = R.reduce((a, r) => r.m > a ? r.m : a, 0), hl = x => `<span class="hl">${x}</span>`, kuat = n ? `, terkuat ${hl(mTulis(mx))}` : "";
    if (j === "riwayat") return `${hl(fmt(n))} ${{merusak: "gempa signifikan dan merusak Indonesia 1821 sampai 2025", tsunami: "kejadian tsunami Indonesia 416 sampai 2025", wilayah: "catatan tsunami per wilayah, 416 sampai 2025"}[this.st.rw]} (katalog BMKG)`;
    if (!n) return j === "tsunami" ? "Tidak ada buletin tsunami BMKG dalam 30 buletin terakhir" : "Tidak ada gempa pada daftar ini";
    return { terkini: `${hl(fmt(n))} gempa tercatat BMKG dalam 24 jam terakhir${kuat}`, m5: `${hl(fmt(n))} buletin gempa M 5,0 atau lebih dari BMKG${kuat}`, dirasakan: `${hl(fmt(n))} gempa dirasakan menurut BMKG${kuat}`,
      tsunami: `${hl(fmt(n))} buletin peringatan dini tsunami BMKG terakhir, ${hl(fmt(new Set(this.baris.map(r => r.key)).size))} kejadian${kuat}`, realtime: `${hl(fmt(n))} gempa semua magnitudo dalam 5 hari terakhir${kuat}` }[j]; },
  /* hasil saring+urut disimpan per (baris, jenis, urut, arah, q): ganti halaman tidak mengurut ulang */
  urutan() { const st = this.st, s = st.turun ? -1 : 1, q = st.jenis === "riwayat" ? (st.q || "").toLowerCase().trim() : "", k = [st.jenis, st.rw, st.urut, st.turun, q].join("|"), c = this._so;
    if (c && c.b === this.baris && c.k === k) return c.R;
    const R = this.baris.filter(r => !q || r.teks.includes(q)).sort((a, b) => { const x = this.nilai(a, st.urut), y = this.nilai(b, st.urut); return (typeof x === "string" ? x.localeCompare(y) : x - y) * s || b.t - a.t; });
    this._so = {b: this.baris, k, R}; return R; },
  tabel() { const st = this.st, s = st.turun ? -1 : 1, R = this.urutan();
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(R.length / this.PER) - 1));
    return `<div class="tw ex-tabel ina-tb"><table><thead><tr>${this.KOL.map(([c, n, num]) => `<th class="${num ? "n" : ""}" aria-sort="${st.urut === c ? (st.turun ? "descending" : "ascending") : "none"}"><button data-k="${c}">${n}<i>${st.urut === c ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>
      <tbody>${R.slice(st.hal * this.PER, (st.hal + 1) * this.PER).map(r => `<tr ${r.tak ? "" : `class="klik" tabindex="0" `}data-i="${r.i}">${this.KOL.map(([c, , num]) => `<td${num ? ' class="n"' : ""}>${this.sel(r, c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${R.length ? "" : `<p class="kosong">Tidak ada baris yang cocok.</p>`}${paginasi(st.hal, R.length, this.PER, st.jenis === "riwayat" ? "baris" : "gempa")}`; },
  gambarTabel() { const el = $("#inaTabel"); if (!el) return; el.innerHTML = this.tabel(); pengurutKepala(this.st, el.querySelector("thead"), () => nanti(() => this.gambarTabel())); },
  /* chrome (pilihan, judul) urgent; isi tabel ditunda lewat nanti() */
  async render(segar) {
    const el = $("#katalog"); if (!el) return;
    if (!el.dataset.siap) { el.dataset.siap = 1;
      el.addEventListener("click", e => { const b = e.target.closest("[data-j]"); if (b) return this.pilih(b.dataset.j);
        const h = e.target.closest("[data-h]"); if (h) { if (h.disabled) return; this.st.hal = +h.dataset.h; el.querySelectorAll(".pgn-b").forEach(b => { b.classList.toggle("on", b === h); if (b === h) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); }); return nanti(() => { this.gambarTabel(); el.querySelector(`.pgn-b[data-h="${this.st.hal}"]`)?.focus(); }); }
        const r = e.target.closest("tr[data-i]"); if (r && !this.baris[+r.dataset.i]?.tak) this.buka(this.baris[+r.dataset.i]); });
      el.addEventListener("input", e => { if (e.target.id !== "inaCari") return; this.st.q = e.target.value; this.st.hal = 0; clearTimeout(this._dq); this._dq = setTimeout(() => nanti(() => this.gambarTabel()), 200); });
      el.addEventListener("change", e => { if (e.target.id === "inaRw") { this.st.rw = e.target.value; this.st.hal = 0; this.st.q = ""; this.st.urut = this.RW[this.st.rw].kol[1][0]; this.st.turun = true; nanti(() => this.render(true)); } });
      el.addEventListener("keydown", e => { const r = e.target.closest("tr[data-i]"); if (r && !this.baris[+r.dataset.i]?.tak && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); this.buka(this.baris[+r.dataset.i]); } });
      setInterval(() => { this.segarkan(); }, 60e3); }
    const j = this.st.jenis, seg = `<div class="seg penuh ina-seg" role="group" aria-label="Jenis katalog BMKG">${this.JENIS.map(([k, n, ik]) => `<button data-j="${k}" aria-pressed="${k === j}">${this.ik(ik)}${n}</button>`).join("")}</div>`;
    if (!segar || !el.children.length) el.innerHTML = Kartu.ex(`<span class="hl">…</span> memuat katalog BMKG`, "", "", `<div class="kosong"><div class="spin"></div>Memuat katalog gempa BMKG…</div>`, "", seg).replace('<article class="ex">', '<article class="ex ex-std">').replace('<span class="ex-ey"></span>', '<span class="ex-ey">Katalog BMKG</span>');
    let d; try { d = await this.muatBaris(j); } catch (e) { d = {rows: [], langsung: false, galat: true}; }
    if (j !== this.st.jenis) return;
    d.rows.forEach((r, i) => r.i = i); this.baris = d.rows; this.st.hal = segar ? this.st.hal : 0;
    const rw = j === "riwayat" ? `<div class="ina-rw"><label>Katalog <select id="inaRw" aria-label="Katalog riwayat">${Object.entries(this.RW).map(([k, v]) => `<option value="${k}"${k === this.st.rw ? " selected" : ""}>${v.n}</option>`).join("")}</select></label><input id="inaCari" type="search" placeholder="Cari lokasi, tahun, atau kata kunci" value="${esc(this.st.q)}" aria-label="Cari di katalog"></div>` : "";
    const gl = j === "riwayat" ? (Array.isArray(d.riwayat?.gagal_urai) ? d.riwayat.gagal_urai.length : +d.riwayat?.gagal_urai || 0) : 0;
    const st = j === "riwayat" ? `<p class="ina-st">Diurai dari katalog PDF resmi BMKG; nilai yang tidak terbaca ditampilkan strip.${gl ? ` ${fmt(gl)} baris tidak terbaca dan tidak ditampilkan.` : ""} <a href="${esc(d.riwayat?.sumber || this.PRODUK_URL)}" target="_blank" rel="noopener">PDF BMKG ↗</a></p>` + rw : `<p class="ina-st">${d.galat ? "Katalog BMKG belum bisa dibaca." : d.langsung ? "Dibaca langsung dari BMKG, " + esc(this.jam(Date.now())) : "BMKG tidak terjangkau dari peramban ini, ditampilkan arsip Centurisk97 dari data BMKG."} <a href="${this.PRODUK_URL}" target="_blank" rel="noopener">bmkg.go.id/gempabumi ↗</a></p>`;
    el.innerHTML = Kartu.ex(this.judul(j, d.rows, d.langsung), "", "", st + `<div id="inaTabel"></div>`, "", seg).replace('<article class="ex">', '<article class="ex ex-std">').replace('<span class="ex-ey"></span>', '<span class="ex-ey">Katalog BMKG</span>');
    this.gambarTabel(); },
  /* Real-time: hanya baris dan tabel diperbarui; kartu, pilihan, dan fokus tidak disentuh, dan dilewati bila laci terbuka atau fokus di kartu */
  async segarkan() { const el = $("#katalog"); if (document.hidden || !el || this.st.jenis !== "realtime" || !$("#p-katalog")?.classList.contains("on") || $("#inaDetail")?.classList.contains("on") || el.contains(document.activeElement)) return;
    const d = await this.muatBaris("realtime").catch(() => null); if (!d || this.st.jenis !== "realtime") return;
    d.rows.forEach((r, i) => r.i = i); this.baris = d.rows; nanti(() => this.gambarTabel()); },
  pilih(j) { this.st = {jenis: j, urut: j === "tsunami" ? "pd" : j === "riwayat" ? "tanggal" : "t", turun: true, hal: 0, rw: this.st.rw || "merusak", q: ""}; document.querySelectorAll("#katalog [data-j]").forEach(b => b.setAttribute("aria-pressed", b.dataset.j === j)); nanti(() => this.render(true)); },
  async bukaJenis(j, kunci) { bukaTab("katalog"); this.st = {jenis: j, urut: j === "tsunami" ? "pd" : "t", turun: true, hal: 0, rw: "merusak", q: ""}; await this.render(); if (kunci) { const r = this.baris.find(x => x.key === kunci); if (r) this.buka(r); } },

  /* ---------------------------------------------------------------- laci detail */
  _n: 0,
  tutup() { $("#inaDetail")?.classList.remove("on"); this._n++; },
  gbr(url, alt) { return `<figure class="ina-f"><a href="${esc(url)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(url)}" alt="${esc(alt)}"></a><figcaption>${esc(alt)}</figcaption></figure>`; },
  /* narasi BMKG: DOMParser, hanya p, strong, em, dibangun ulang dengan textContent (tanpa innerHTML mentah) */
  narasi(raw) { const doc = new DOMParser().parseFromString(String(raw), "text/html"), out = document.createDocumentFragment();
    const salin = (dari, ke) => { for (const n of dari.childNodes) { if (n.nodeType === 3) ke.append(n.textContent.replace(/\u00a0/g, " ")); else if (n.nodeType === 1 && ["STRONG", "EM"].includes(n.tagName)) { const e = document.createElement(n.tagName.toLowerCase()); salin(n, e); ke.append(e); } else if (n.nodeType === 1 && n.tagName === "BR") ke.append(document.createElement("br")); else if (n.nodeType === 1 && n.tagName !== "SCRIPT" && n.tagName !== "STYLE") salin(n, ke); } };
    doc.querySelectorAll("p").forEach(p => { if (!p.textContent.trim()) return; const e = document.createElement("p"); salin(p, e); out.append(e); });
    return out; },
  async buka(r) {
    if (!r) return; const n = ++this._n, el = this.laci();
    el.innerHTML = this.kepala(r) + `<div class="bd ina-bd" id="inaIsi"><div class="kosong"><div class="spin"></div>Memuat detail kejadian…</div></div>`; el.classList.add("on");
    el.querySelector(".tutup").onclick = () => this.tutup();
    nanti(async () => { const d = await this.rakit(r).catch(() => null); if (n !== this._n) return;
      const isi = $("#inaIsi"); if (!isi) return; const a = d?.fl?.area || d?.m5?.area, h = $("#inaJudul"); if (h && a) h.textContent = this.tempat(a);
      isi.innerHTML = this.isi(r, d); this.pasangIsi(isi, r, d, n); });
  },
  laci() { let el = $("#inaDetail"); if (!el) { el = document.createElement("aside"); el.id = "inaDetail"; el.className = "card laci ina-laci"; el.setAttribute("aria-label", "Detail kejadian gempa BMKG"); document.body.append(el); } return el; },
  kepala: r => `<div class="hd"><div class="hd-isi"><span class="hd-ey">Gempa ${esc(mTulis(r.m))}</span><h2 id="inaJudul" translate="no">${esc(Ina.tempat(r.tempat))}</h2><div class="hd-meta"><span translate="no">${esc(Ina.waktu(r.t))}</span></div></div>
    <div class="hd-aksi"><button class="ik-btn tutup" aria-label="Tutup" title="Tutup"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>`,
  /* gabungkan arsip + langsung: {arsip, bul:[...], tsu:grup, produk, focal, narasi, stasiun} */
  async rakit(r) {
    const ym = this.ym(r.t), a = await this.arsipOpsi("inatews_detail_" + ym + ".json"), kej = a?.kejadian || {};
    let d = kej[r.key] || Object.values(kej).find(k => k.buletin?.some(b => r.bids.includes(b.id))) || null;
    const bul = [...(d?.buletin || []).map(b => ({...b, t: b.t * 1e3, terbit: (b.terbit || b.t) * 1e3}))];
    /* pasangkan buletin langsung (M5 dan Dirasakan) yang belum ada di arsip */
    if (r.key.startsWith("bmg") || r.key.startsWith("bul")) for (const j of ["m5", "dirasakan"]) { const L = await this.buletin(j).catch(() => null);
      for (const b of L?.daftar || []) if (!bul.some(x => x.id === b.id) && (r.bids.includes(b.id) || (r.key.startsWith("bmg") && Math.abs(b.t - r.t) <= 90e3 && this.jarak(b.lat, b.lon, r.lat, r.lon) <= 100))) bul.push(b); }
    let tsu = r.tsu || null;
    if (!tsu) { const T = await this.arsipOpsi("inatews_tsunami.json"), g = T?.kejadian?.[r.key]; if (g) tsu = {key: g.id, t: g.t * 1e3, lat: g.lat, lon: g.lon, m: g.m, area: g.area, buletin: g.buletin.map(b => ({...b, jenis: "tsunami", t: g.t * 1e3, terbit: b.terbit * 1e3, zona: (b.zona || []).map(z => [z[0], z[1], z[2], z[3] * 1e3]), pantau: (b.pantau || []).map(z => [z[0], z[1], z[2], z[3], z[4] * 1e3])}))}; }
    const o = {arsip: !!d, bul: bul.sort((x, y) => x.terbit - y.terbit), tsu, focal: d?.focal || null, narasi: d?.narasi || null, stasiun: d?.stasiun || null, produk: d?.produk || {}, diakses: d?.diakses || null, kat: d && d.m != null ? {m: d.m, dalam: d.dalam} : null};
    /* produk yang belum diarsip diambil langsung dari BMKG (gagal-lunak) */
    const m5 = bul.find(b => b.jenis === "m5") || tsu?.buletin?.[tsu.buletin.length - 1], fl = bul.find(b => b.jenis === "dirasakan");
    const ambil = (nama, f) => this.teks(nama).then(f, () => null);
    await Promise.all([!o.narasi && m5 ? ambil(m5.id + "_narasi.txt", t => { o.narasi = t; }) : 0, !o.focal && m5 ? ambil(m5.id + "_focal.json", t => { try { const j = JSON.parse(t); o.focal = {np1: [j.np1.strike1, j.np1.dip1, j.np1.rake1].map(Number), np2: [j.np2.strike2, j.np2.dip2, j.np2.rake2].map(Number), mw: +j.mw, m0: +j.m0, dalam: +j.focaldepth}; } catch (e) {} }) : 0,
      !o.stasiun && fl ? ambil(fl.id + "_rev/stationlist_MMI.txt", t => { o.stasiun = this.stasiun(t); }) : 0]);
    if (r.bid && tsu) { const nb = tsu.buletin.find(x => x.id === r.bid); o.nb = nb; o.narasi = null; await ambil(r.bid + "_narasi.txt", t => { o.narasi = t; }); o.narasi ||= nb?.narasi || null; }
    o.m5 = m5; o.fl = fl; o.diakses ||= new Date().toISOString().slice(0, 10); return o; },
  baru: (b, k) => `<tr><td>${k}</td><td class="n" translate="no">${b}</td></tr>`,
  isi(r, d) {
    if (!d) return `<div class="kosong">Detail kejadian belum bisa dimuat.</div>`;
    const sek = (h, x) => x ? `<section class="lc-sek"><h4 class="lc-h">${h}</h4>${x}</section>` : "", C = this.CDN, kes = [];
    /* 1. parameter apa adanya per buletin, berlabel; tidak dirata-rata */
    const jn = {m5: "Gempa M 5,0+", dirasakan: "Gempa dirasakan", tsunami: "Peringatan dini tsunami"}, par = [...d.bul.filter(b => b.jenis !== "tsunami")];
    if (d.tsu) par.push(d.tsu.buletin[0], ...(d.tsu.buletin.length > 1 ? [d.tsu.buletin[d.tsu.buletin.length - 1]] : []));
    const kat = d.kat ? `<tr><td>Katalog BMKG (pemutakhiran)</td><td class="n" translate="no">${esc(mTulis(d.kat.m))}, ${esc(this.dalam(d.kat.dalam))}</td></tr>` : "";
    kes.push(sek("Parameter menurut BMKG", `<div class="tw"><table class="tb2"><thead><tr><th>Buletin</th><th>Rilis</th><th class="n">Kekuatan</th><th class="n">Kedalaman</th></tr></thead><tbody>${par.map(b => `<tr><td>${jn[b.jenis]}<br><small translate="no">${esc(b.id)}${b.subjek && b.jenis === "tsunami" ? ", " + esc(b.subjek) : ""}</small></td><td translate="no">${esc(this.waktu(b.terbit))}</td><td class="n">${esc(mTulis(b.m))}</td><td class="n">${esc(this.dalam(b.dalam))}</td></tr>`).join("")}</tbody></table></div>${kat ? `<table class="tb2"><tbody>${kat}</tbody></table>` : ""}
      <p class="fnd">Setiap buletin ditulis seperti yang dirilis BMKG. Parameter awal bisa berbeda dari pemutakhiran, keduanya tidak dirata-rata.</p>`));
    if (d.nb) { const b = d.nb; kes.unshift(sek("Informasi BMKG", `<p>${this.pilPD(b)} <span class="pill pm" style="--w:${b.berakhir ? "#5b6575" : "#d64545"}">${b.berakhir ? "Dinyatakan berakhir" : "Belum dinyatakan berakhir"}</span></p><p class="fnd" translate="no">${esc(b.deskripsi || b.judul || "")}</p>
      <table class="tb2"><tbody>${this.baru(esc(this.waktu(b.terbit)), "Waktu rilis")}${b.instruksi ? this.baru(esc(b.instruksi), "Imbauan") : ""}${this.baru(esc(b.id), "Nomor buletin")}</tbody></table>`)); }
    /* 2. status tsunami resmi (tidak pernah ditafsir ulang) */
    const pot = d.bul.map(b => this.potensi(b.potensi)).find(Boolean) || (d.tsu ? ["Potensi tsunami", "#d64545"] : null);
    kes.push(sek("Status tsunami, BMKG", `<p><span class="pill pm" style="--w:${pot ? pot[1] : "#5b6575"}">${pot ? pot[0] : "BMKG tidak menyebut tsunami"}</span></p><p class="fnd">${pot ? "Status resmi BMKG apa adanya." : "BMKG tidak menyebut tsunami pada buletin ini; ketiadaan pernyataan tidak kami tafsirkan."}</p>`));
    /* 3. peta guncangan utuh */
    const mmi = (d.fl || d.m5 || d.bul[0]); const idm = mmi?.id;
    kes.push(sek("Peta guncangan", idm ? `<div class="ina-fg">${this.gbr(C + idm + ".mmi.jpg", "Peta guncangan (shakemap) BMKG")}</div>` : ""));
    /* 4. MMI per wilayah sebagai pil */
    const mm = this.felt(d.fl?.felt || d.bul.map(b => b.felt).find(Boolean) || "");
    kes.push(sek("Dirasakan per wilayah", mm.length ? `<div class="ina-pil">${mm.map(x => `<span class="ina-w">${this.pilMMI(x.mmi, x.nilai)}<b translate="no">${esc(x.wilayah)}</b></span>`).join("")}</div><p class="fnd">Intensitas MMI menurut laporan masyarakat yang dihimpun BMKG.</p>` : ""));
    /* 5. siaran pers, dibangun ulang dari DOM di pasangIsi */
    kes.push(sek("Siaran pers BMKG", d.narasi ? `<div class="ina-narasi" id="inaNarasi"></div>` : ""));
    /* 6. mekanisme sumber */
    const f = d.focal; kes.push(sek("Mekanisme sumber", f ? `<table class="tb2"><tbody>${this.baru(`${fmt(f.np1[0])}°, ${fmt(f.np1[1])}°, ${fmt(f.np1[2])}°`, "Bidang 1 (strike, dip, rake)")}${this.baru(`${fmt(f.np2[0])}°, ${fmt(f.np2[1])}°, ${fmt(f.np2[2])}°`, "Bidang 2 (strike, dip, rake)")}${f.mw ? this.baru("Mw " + fmt(Math.round(f.mw * 100) / 100), "Magnitudo momen") : ""}${f.m0 ? this.baru(f.m0.toExponential(2).replace(".", ",").replace("e+", " x 10^") + " Nm", "Momen seismik (M0)") : ""}${f.dalam ? this.baru(fmt(f.dalam) + " km", "Kedalaman fokal") : ""}</tbody></table>
      ${d.m5 ? `<div class="ina-fg">${this.gbr(C + d.m5.id + "_focal.png", "Mekanisme sumber (beachball) BMKG")}</div>` : ""}` : ""));
    /* 7. stasiun, diisi bertahap di pasangIsi */
    kes.push(sek("Stasiun percepatan tanah (PGA)", d.stasiun?.length ? `<div id="inaStasiun"></div>` : ""));
    /* 8. tsunami */
    if (d.tsu) kes.push(this.htmlTsunami(d.tsu, sek, d.nb?.id));
    /* 9. produk dirasakan lain */
    if (d.fl) kes.push(sek("Laporan dirasakan", `<div class="ina-fg">${["intensity_logo.jpg:Peta intensitas laporan", "impact_list.jpg:Daftar dampak", "reports-1.jpg:Laporan masyarakat", "loc_map.png:Peta lokasi"].map(s => { const [n, a] = s.split(":"); return this.gbr(C + d.fl.id + "_rev/" + n, a + " BMKG"); }).join("")}</div>`));
    if (d.m5 || d.tsu) { const id = d.tsu ? d.tsu.buletin[d.tsu.buletin.length - 1].id : d.m5.id; kes.push(sek("Waktu tiba tsunami", d.tsu ? `<div class="ina-fg">${this.gbr(C + id + ".gif", "Animasi waktu tiba tsunami BMKG")}</div>` : "")); }
    kes.push(`<p class="fnd ina-atr">Sumber: <a href="${this.PRODUK_URL}" target="_blank" rel="noopener">BMKG</a> (InaTEWS, cdn.bmkg.go.id), diakses ${esc(this.tglAkses(d.diakses))}. Gambar milik BMKG, ditampilkan utuh.${d.arsip ? "" : " Detail ini belum masuk arsip Centurisk97 dan dibaca langsung dari BMKG."}</p>`);
    return kes.join(""); },
  tglAkses: s => new Date(s + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric"}),
  htmlTsunami(g, sek, bid) {
    const bs = g.buletin, sl = bid && bs.find(x => x.id === bid), akhir = sl || bs[bs.length - 1], zb = sl?.zona?.length ? sl : [...bs].reverse().find(b => b.zona?.length), ak = this.aktif(g);
    const per = {AWAS: [], SIAGA: [], WASPADA: []}; for (const z of zb?.zona || []) (per[String(z[2]).toUpperCase()] ||= []).push(z);
    const zona = zb ? Object.entries(per).filter(([, v]) => v.length).sort((a, b) => this.LEVEL[b[0]][2] - this.LEVEL[a[0]][2]).map(([l, v]) => `<div class="ina-zn"><div>${this.pilLevel(l)} <small>${fmt(v.length)} wilayah</small></div><div class="ina-pil">${v.map(z => `<span class="ina-w"><b translate="no">${esc(z[1])}</b> <small translate="no">${esc(z[0])}, ${esc(this.jam(z[3]))}</small></span>`).join("")}</div></div>`).join("") : "";
    const ob = new Map(); for (const b of bs) for (const o of b.pantau || []) if (!ob.has(o[0]) || ob.get(o[0])[3] < o[3]) ob.set(o[0], o);
    const O = [...ob.values()].sort((a, b) => b[3] - a[3]);
    const peta = [["wz", "Peta zona peringatan"], ["tt", "Peta waktu tiba"], ["ssh", "Peta tinggi muka laut"]].map(([k, a]) => { const b = (sl ? [sl] : [...bs].reverse()).find(x => x.produk?.length ? x.produk.some(p => p.startsWith(k + ".")) : x.peta?.[k + "map"]); return b ? this.gbr(this.CDN + b.id + "." + k + ".png", a + " BMKG") : ""; }).join("");
    return sek("Peringatan dini tsunami, BMKG", `<p><span class="pill pm" style="--w:${ak ? "#d64545" : "#5b6575"}">${ak ? "Peringatan aktif" : "Peringatan berakhir"}</span> <small translate="no">${esc(akhir.subjek)}, buletin terakhir ${esc(this.waktu(akhir.terbit))}</small></p>
      <p class="fnd" translate="no">${esc(akhir.judul || akhir.deskripsi || "")}</p>${zb ? `<h5 class="ina-h5">Tingkat per zona${zb !== akhir ? ` (buletin ${esc(zb.subjek)}, ${esc(this.jam(zb.terbit))})` : ""}</h5>${zona}` : ""}
      ${O.length ? `<h5 class="ina-h5">Tinggi muka laut terukur</h5><div class="tw"><table class="tb2"><thead><tr><th>Lokasi</th><th class="n">Tinggi</th><th class="n">Waktu</th></tr></thead><tbody>${O.map(o => `<tr><td translate="no">${esc(o[0])}</td><td class="n">${esc(fmt(o[3]))} m</td><td class="n" translate="no">${esc(this.jam(o[4]))}</td></tr>`).join("")}</tbody></table></div>` : ""}
      ${peta ? `<div class="ina-fg">${peta}</div>` : ""}
      <h5 class="ina-h5">Urutan buletin</h5><div class="tw"><table class="tb2"><thead><tr><th>Buletin</th><th class="n">Terbit</th></tr></thead><tbody>${bs.map(b => `<tr><td translate="no">${esc(b.subjek)}${b.berakhir ? " (berakhir)" : ""}</td><td class="n" translate="no">${esc(this.waktu(b.terbit))}</td></tr>`).join("")}</tbody></table></div>`); },
  /* sesudah isi masuk DOM: narasi (DOMParser), stasiun (bertahap), gambar yang 404 dibuang */
  pasangIsi(isi, r, d, n) {
    if (d.narasi) $("#inaNarasi")?.append(this.narasi(d.narasi));
    const st = $("#inaStasiun"); if (st && d.stasiun?.length) { const S = d.stasiun, gambar = semua => { const A = semua ? S : S.slice(0, 12);
      st.innerHTML = `<div class="tw"><table class="tb2"><thead><tr><th>Stasiun</th><th class="n">Jarak</th><th class="n">MMI</th><th class="n">PGA EW/NS/UD (gal)</th></tr></thead><tbody>${A.map(s => `<tr><td translate="no">${esc(s[1])}<br><small>${esc(s[0])}</small></td><td class="n">${esc(fmt(s[4]))} km</td><td class="n">${esc(s[5])}</td><td class="n" translate="no">${esc(fmt(s[6]))} / ${esc(fmt(s[7]))} / ${esc(fmt(s[8]))}</td></tr>`).join("")}</tbody></table></div>${!semua && S.length > 12 ? `<button class="btn sec" data-semua>Tampilkan semua ${fmt(S.length)} stasiun</button>` : ""}`;
      st.querySelector("[data-semua]")?.addEventListener("click", () => nanti(() => gambar(true))); }; gambar(false); }
    isi.querySelectorAll("figure.ina-f img").forEach(i => i.addEventListener("error", () => { const f = i.closest("figure"), g = f?.parentElement; f?.remove(); if (g && !g.children.length) g.closest(".lc-sek")?.remove(); }, {once: true})); },

  /* ---------------------------------------------------------------- hubungan dari laci peta (penyocokan waktu dan jarak) */
  async untukLaci(g) { const k = await this.katalog().catch(() => null); if (!k) return null; const x = {t: g.t ?? Date.parse(g.waktu), lat: g.lat, lon: g.lon};
    const c = this.cocok(x, k.daftar.filter(y => Math.abs(y.m - g.m) <= 1.2), 120, 100); return c ? {key: c.id, bids: [], t: c.t, lat: c.lat, lon: c.lon, m: c.m, dalam: c.dalam, tempat: c.tempat} : null; },

  /* ---------------------------------------------------------------- peringatan tsunami aktif (paling atas) */
  async pita() {
    const g = await this.grupTsunami().catch(() => null), A = (g?.grup || []).filter(x => this.aktif(x));
    for (const id of ["inaPita", "inaTsu"]) { const el = $("#" + id); if (!el) continue;
      if (!A.length) { el.hidden = true; el.replaceChildren(); continue; }
      el.hidden = false; const x = A[0], b = x.buletin[x.buletin.length - 1], zb = [...x.buletin].reverse().find(y => y.zona?.length), cnt = {};
      for (const z of zb?.zona || []) cnt[String(z[2]).toUpperCase()] = (cnt[String(z[2]).toUpperCase()] || 0) + 1;
      const tk = Object.keys(this.LEVEL).filter(l => cnt[l]).map(l => `${this.LEVEL[l][0]} ${fmt(cnt[l])}`).join(", ");
      el.style.setProperty("--w", "#d64545"); el.setAttribute("role", "alert");
      el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c2.5-6 4.5-6 7 0s4.5 6 7 0 3.5-4 6-3"/><path d="M2 19h20"/></svg><b>Peringatan dini tsunami, BMKG</b><span translate="no">${esc(b.subjek)}, ${esc(mTulis(x.m))}, ${esc(Ina.tempat(x.area))}, terbit ${esc(this.jam(b.terbit))}${tk ? ", zona: " + esc(tk) + " wilayah" : ""}</span>`;
      el.onclick = () => this.buka({key: x.key, bids: x.buletin.map(y => y.id), tsu: x, t: x.t, lat: x.lat, lon: x.lon, m: x.m, dalam: b.dalam, tempat: x.area}); } },

  /* ---------------------------------------------------------------- lapisan peta semua magnitudo */
  async lapisPeta() {
    const k = await this.katalog(), fit = {type: "FeatureCollection", features: k.daftar.map((x, i) => ({type: "Feature", geometry: {type: "Point", coordinates: [x.lon, x.lat]}, properties: {i, id: x.id, m: x.m, d: kelasDalam(x.dalam)}}))};
    this.fit = k.daftar;
    if (peta.getSource("katalog")) return peta.getSource("katalog").setData(fit);
    peta.addSource("katalog", {type: "geojson", data: fit});
    Peta.taruh({id: "katalog", type: "circle", source: "katalog", layout: {...Peta.vis(Peta.lihat("katalog")), "circle-sort-key": ["-", 0, ["get", "m"]]}, paint: {"circle-radius": radius(.55), "circle-color": warnaDalam, "circle-opacity": .6, "circle-stroke-color": "#fff", "circle-stroke-width": .5}});
    peta.on("click", "katalog", e => { if (peta.queryRenderedFeatures(e.point, {layers: ["gempa", "riwayat", "pilih"].filter(l => peta.getLayer(l))}).length) return;
      const x = this.fit[e.features[0].properties.i]; if (x) this.buka({key: x.id, bids: [], t: x.t, lat: x.lat, lon: x.lon, m: x.m, dalam: x.dalam, tempat: x.tempat}); });
    peta.on("mouseenter", "katalog", () => peta.getCanvas().style.cursor = "pointer"); peta.on("mouseleave", "katalog", () => peta.getCanvas().style.cursor = ""); },
  mulai() { this.pita(); setInterval(() => { if (!document.hidden) this.pita(); }, 120e3); },
};
