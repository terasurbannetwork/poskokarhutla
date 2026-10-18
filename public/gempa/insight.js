"use strict";
/* ================================================================ insight gempa */
/* Kartu Insight gempa: rupa dan anatomi sama dengan karhutla dan banjir (pil kategori, judul satu kalimat berangka merah, grafik berangka, kaki legenda + "Sumber:",
   ikon bagikan). Mesin dari public/inti (Kartu.ex lewat KG.kartu). Data hidup: /api/gempa/terbaru?jam=720 (hanya baca, D1 milik warga-api); riwayat: data/riwayat_*.json.
   Tanpa data hidup, kartu yang menyatakan "tidak ada gempa" DIBUANG (A18): tabel kosong bukan bukti tak ada gempa. Arsip D1 mulai 16 Okt 2026: jendela 7/30 hari ditulis "sejak <tanggal>" (lihat jendela()).
   Model guncangan (guncangan.js) belum dipakai di layar: koefisiennya belum diverifikasi. */
Tip.polaSatu = /^([\d.,]+(?:\s?(?:rb|jt))?\s+(?:gempa|berita|jiwa|kecamatan))$/;
const MMI_WARNA = ["", "#d8d2b8", "#d8d2b8", "#e3c77a", "#e0a64f", "#d4802f", "#c9503a", "#a83a2a", "#8f2a1e", "#8f2a1e", "#6e1d14", "#6e1d14", "#6e1d14"];
const WARNA_M_STACK = ["#d9a441", "#d4702a", "#a8321f"];
const NAMA_M_STACK = ["M 5,0 sampai 5,9", "M 6,0 sampai 6,9", "M 7 atau lebih"];

const Insight = {
  st: {terkini: "7", dirasakan: "7", prov: "2000", riwayat: "dasawarsa"},
  EX: ["terkini", "dirasakan", "susulan", "provinsi", "riwayat", "tsunami", "bsesar", "bmmi", "bpesisir", "bevakuasi", "bbnpb", "btabel"],
  LABEL: {terkini: "Gempa terkini", dirasakan: "Dirasakan", provinsi: "Paling sering diguncang", riwayat: "Riwayat sejak 1900", tsunami: "Status tsunami BMKG", susulan: "Susulan"},
  d: undefined, dMuat: 0, R: undefined, P: undefined,
  /* data hidup 30 hari, disegarkan paling cepat tiap 5 menit */
  async muatHidup() {
    if (this.d !== undefined && Date.now() - this.dMuat < 300e3) return this.d;
    this.d = await fetch("/api/gempa/terbaru?jam=720").then(r => r.ok ? r.json() : null).catch(() => null); this.dMuat = Date.now();
    if (this.d) this.d.gempa = this.d.gempa.map(g => ({...g, t: Date.parse(g.waktu)}));
    return this.d; },
  /* jendela waktu: arsip D1 baru mulai 16 Okt 2026 (migrasi); sebelum itu hanya sisa daftar BMKG (15 butir terbaru per daftar) yang ikut terserap.
     Jadi awal data yang jujur = yang lebih lama antara ARSIP dan gempa tertua DALAM KELOMPOK kartu itu (daftar M5+ BMKG menjangkau ~sebulan,
     daftar Dirasakan hanya beberapa hari). Jendela yang mulai sebelum awal itu ditulis "sejak <tanggal>", bukan "N hari terakhir". */
  jendela: jendelaGempa,
  hidupAda: d => !!d && d.gempa.length > 0,
  tglPendek: t => KG.tgl(t, {day: "numeric", month: "short"}),
  nmU: k => k === "-" ? "Perairan lepas" : esc(innerWidth < 640 ? KG.pendek(namaProv(k)) : namaProv(k)),
  /* kelompok per provinsi: {kode: {n, m (terbesar), mmi (terkuat)}}; titik di perairan jauh (prov kosong) = "-" */
  kelompok(A) { const o = {}; for (const g of A) { const p = o[g.prov || "-"] ||= {n: 0, m: 0, mmi: 0}; p.n++; p.m = Math.max(p.m, g.m); p.mmi = Math.max(p.mmi, g.mmi_maks || 0); } return o; },
  seg: (key, opsi) => Kartu.seg(key, opsi, Insight.st),

  /* 1. gempa M 5+ terkini per provinsi */
  exTerkini() {
    if (!this.hidupAda(this.d)) return "";
    const hari = +this.st.terkini, w = this.jendela(hari, this.d.gempa.filter(g => g.m >= 5)), A = this.d.gempa.filter(g => g.m >= 5 && g.t >= w.mulai), ctl = this.seg("terkini", [["7", "7 hari"], ["30", "30 hari"]]);
    const jd = A.length ? "" : `Tidak ada gempa M 5+ di Indonesia ${w.teks}`;
    if (!A.length) return Kartu.kartu(this.LABEL.terkini, jd, "", "BMKG, USGS", ctl);
    const K = this.kelompok(A), P = Object.entries(K).sort((a, b) => b[1].n - a[1].n || b[1].m - a[1].m), np = P.filter(([k]) => k !== "-").length;
    const rows = P.slice(0, 12).map(([k, o]) => ({nama: this.nmU(k), v: o.n, warna: KG.TANAH, pil: [[mTulis(o.m), warnaM(o.m)]],
      tip: `<b>${this.nmU(k)}</b><br>Gempa M 5+: ${fmt(o.n)}<br>Terbesar: ${mTulis(o.m)}`}));
    const judul = np ? `${KG.awal(A.length, "gempa")} M 5+ mengguncang ${Kartu.hl(fmt(np) + " provinsi")} ${w.teks}` : `${KG.awal(A.length, "gempa")} M 5+ terjadi di perairan Indonesia ${w.teks}`;
    return Kartu.kartu(this.LABEL.terkini, judul, KG.mendatar(rows, {akhir: 130}), "BMKG, USGS", ctl); },

  /* 2. gempa yang dirasakan warga (BMKG Dirasakan, skala MMI) */
  exDirasakan() {
    if (!this.hidupAda(this.d)) return "";
    const hari = +this.st.dirasakan, w = this.jendela(hari, this.d.gempa.filter(g => g.mmi_maks > 0)), A = this.d.gempa.filter(g => g.mmi_maks > 0 && g.t >= w.mulai), ctl = this.seg("dirasakan", [["7", "7 hari"], ["30", "30 hari"]]);
    if (!A.length) return Kartu.kartu(this.LABEL.dirasakan, `Tidak ada gempa yang dirasakan warga ${w.teks}`, "", "BMKG", ctl);
    const K = this.kelompok(A), P = Object.entries(K).sort((a, b) => b[1].mmi - a[1].mmi || b[1].n - a[1].n), np = P.filter(([k]) => k !== "-").length;
    const top = [...A].sort((a, b) => b.mmi_maks - a.mmi_maks || b.m - a.m)[0], rom = v => ROMAWI[Math.min(12, Math.max(1, Math.round(v)))];
    const rows = P.slice(0, 12).map(([k, o]) => ({nama: this.nmU(k), v: o.n, warna: KG.TANAH, pil: [["MMI " + rom(o.mmi), MMI_WARNA[Math.round(o.mmi)] || MMI_WARNA[1], o.mmi <= 3 ? "#3b3320" : "#fff"]],
      tip: `<b>${this.nmU(k)}</b><br>Gempa dirasakan: ${fmt(o.n)}<br>Terkuat: MMI ${rom(o.mmi)}`}));
    const judul = `${KG.awal(A.length, "gempa")} dirasakan warga${np ? ` di ${Kartu.hl(fmt(np) + " provinsi")}` : ""} ${w.teks}, terkuat MMI ${Kartu.hl(rom(top.mmi_maks))} di <span translate="no">${esc(wilayahPendek(top.wilayah))}</span>`;
    return Kartu.kartu(this.LABEL.dirasakan, judul, KG.mendatar(rows, {akhir: 150}), "BMKG", ctl); },

  /* 3. provinsi paling sering diguncang: gempa M 5+ menurut kelas, sejak 2000 atau 1900 (USGS) */
  exProvinsi() {
    const P = this.P; if (!P) return "";
    const dari = +this.st.prov, ctl = this.seg("prov", [["2000", "Sejak 2000"], ["1900", "Sejak 1900"]]);
    const baris = Object.entries(P.prov).filter(([k]) => k !== "ID").map(([k, o]) => { const c = [0, 0, 0]; for (const [th, v] of Object.entries(o.th)) if (+th >= dari) { c[0] += v[1]; c[1] += v[2]; c[2] += v[3]; } return {k, c, n: c[0] + c[1] + c[2]}; })
      .filter(r => r.n).sort((a, b) => b.n - a.n).slice(0, 12);
    if (!baris.length) return "";
    const rows = baris.map(r => ({nama: this.nmU(r.k), v: r.c, warna: WARNA_M_STACK, tip: `<b>${this.nmU(r.k)}</b><br>Gempa M 5+ sejak ${dari}: ${fmt(r.n)}<br>${NAMA_M_STACK.map((n, i) => `${n}: ${fmt(r.c[i])}`).join("<br>")}`}));
    return Kartu.kartu(this.LABEL.provinsi, `${Kartu.hl(this.nmU(baris[0].k))} paling sering diguncang: ${Kartu.hl(fmt(baris[0].n) + " gempa")} M 5+ tercatat sejak ${dari}`,
      KG.mendatar(rows, {akhir: 60}), "USGS (data sebelum 2000 tidak lengkap)", ctl, NAMA_M_STACK.map((n, i) => [WARNA_M_STACK[i], n])); },

  /* 4. riwayat gempa M 5+ sejak 1900: per dasawarsa atau per tahun sejak 2000 */
  exRiwayat() {
    const R = this.R; if (!R) return "";
    const per = {}; for (const b of R.baris) { const th = +b[0].slice(0, 4); per[th] = (per[th] || 0) + 1; }
    const akhir = Math.max(...Object.keys(per).map(Number)), dasa = this.st.riwayat === "dasawarsa", total = R.baris.length;
    const kunci = dasa ? Array.from({length: Math.floor(akhir / 10) - 190 + 1}, (_, i) => 1900 + i * 10) : Array.from({length: akhir - 2000 + 1}, (_, i) => 2000 + i);
    const nilai = kunci.map(k => [dasa ? Array.from({length: 10}, (_, i) => per[k + i] || 0).reduce((a, b) => a + b, 0) : per[k] || 0]);
    const cat = kunci.map(k => dasa ? `${k}-an` : String(k).slice(2)), pk = nilai.map(v => v[0]).indexOf(Math.max(...nilai.map(v => v[0])));
    const jml = dasa ? total : nilai.reduce((a, v) => a + v[0], 0), dr = dasa ? 1900 : 2000;
    const gr = KG.kolom({cat, seri: [["Gempa M 5+", KG.TANAH]], nilai, ber: true, aria: "Gempa M 5+ per " + (dasa ? "dasawarsa" : "tahun"),
      tip: i => `<b>${dasa ? `Tahun ${kunci[i]}-an` : kunci[i]}${i === kunci.length - 1 ? " (berjalan)" : ""}</b><br>Gempa M 5+: ${fmt(nilai[i][0])}`});
    return Kartu.kartu(this.LABEL.riwayat, `${Kartu.hl(fmt(jml) + " gempa")} M 5+ tercatat di Indonesia sejak ${dr}, terbanyak pada ${dasa ? "tahun " : ""}${Kartu.hl(dasa ? kunci[pk] + "-an" : String(kunci[pk]))}: ${fmt(nilai[pk][0])} gempa`,
      gr, "USGS (catatan awal tidak lengkap, termasuk susulan)", this.seg("riwayat", [["dasawarsa", "Per dasawarsa"], ["tahun", "Per tahun sejak 2000"]]), [[KG.TANAH, "gempa M 5+"], ["#b07a3c8c", `${akhir} (berjalan)`]]); },

  /* 5. status tsunami resmi BMKG: ditampilkan apa adanya; "BMKG tidak menyebut tsunami" BUKAN "aman" */
  exTsunami() {
    if (!this.hidupAda(this.d)) return "";
    const w = this.jendela(30, this.d.gempa.filter(g => g.m >= 5 && g.sumber !== "usgs")), B = this.d.gempa.filter(g => g.t >= w.mulai && g.sumber !== "usgs");
    if (!B.length) return "";
    const ada = B.filter(g => (g.tsunami?.kode ?? 0) >= 1).sort((a, b) => b.t - a.t), tidak = B.filter(g => g.tsunami?.kode === 0), diam = B.filter(g => g.tsunami?.kode == null);
    const lv = [1, 2, 3].map(k => ada.filter(g => g.tsunami.kode === k).length);
    const judul = ada.length ? `${KG.awal(ada.length, "gempa")} dinyatakan BMKG berpotensi tsunami ${w.teks}, terakhir di <span translate="no">${esc(wilayahPendek(ada[0].wilayah))}</span> pada ${waktuGempa(ada[0].t)}`
      : `Tidak ada gempa yang dinyatakan BMKG berpotensi tsunami ${w.teks}`;
    const M = innerWidth < 640, rows = [{nama: M ? "Berpotensi" : "Berpotensi tsunami", v: ada.length, warna: "#d64545", tip: `<b>Berpotensi tsunami</b><br>${[1, 2, 3].map(k => `${TSUNAMI[k][0]}: ${fmt(lv[k - 1])}`).join("<br>")}`},
      {nama: M ? "Tidak berpotensi" : "Tidak berpotensi tsunami", v: tidak.length, warna: "#9aa4b2", tip: `<b>Tidak berpotensi tsunami</b><br>Gempa: ${fmt(tidak.length)}`},
      {nama: M ? "Tidak disebut" : "BMKG tidak menyebut tsunami", v: diam.length, warna: "#c3cad4", tip: `<b>BMKG tidak menyebut tsunami</b><br>Gempa: ${fmt(diam.length)}`}];
    return Kartu.kartu(this.LABEL.tsunami, judul, KG.mendatar(rows, {akhir: 50}), "BMKG (status resmi, apa adanya)"); },

  /* 6. susulan: kejadian utama yang masih aktif (D1) + peluang susulan M 5+ 7 hari (model susulan; tanpa model hanya cacah). Kosong = dibuang. */
  async exSusulan() {
    const kej = ((await Sus.daftar()) || []).filter(k => k.aktif).sort((a, b) => b.m - a.m).slice(0, 8); if (!kej.length) return "";
    const pel = await Promise.all(kej.map(k => Sus.peluang(k.kode).catch(() => null))), jml = kej.reduce((a, k) => a + Math.max(0, (k.jumlah || 1) - 1), 0);
    const rows = kej.map((k, i) => { const n = Math.max(0, (k.jumlah || 1) - 1), r = pel[i]?.m5, nm0 = wilayahPendek(k.nama || ""), nm = esc(nm0);
      return {nama: esc(nm0.length > (innerWidth < 640 ? 15 : 24) ? nm0.slice(0, innerWidth < 640 ? 14 : 23) + "…" : nm0), v: n, teks: fmt(n) + " susulan", warna: KG.TANAH, pil: [[mTulis(k.m), warnaM(k.m)], ...(r ? [[peluangTeks(r), "#3f6fa8"]] : [])],
        tip: `<b>${nm}</b><br>Gempa utama: ${mTulis(k.m)}<br>Susulan tercatat: ${fmt(n)}${r ? `<br>Peluang susulan M 5+ dalam 7 hari: ${peluangTeks(r)}` : ""}`}; });
    const judul = jml ? `${Kartu.hl(fmt(jml) + " susulan")} tercatat dari ${Kartu.hl(fmt(kej.length) + " gempa utama")} yang masih aktif` : `${KG.awal(kej.length, "gempa utama")} M 5+ masih dipantau, belum ada susulan tercatat`;
    return Kartu.kartu(this.LABEL.susulan, judul, KG.mendatar(rows, {akhir: pel.some(Boolean) ? 190 : 60}), "BMKG, USGS, model susulan Reasenberg-Jones (peluang perkiraan, bukan prakiraan resmi)"); },

  /* 7. fasilitas rawan dari data/bukti.json (lewat bukti.js); data belum ada = dibuang */
  exBsesar: () => Bukti.kartu("sesar"), exBmmi: () => Bukti.kartu("mmi"), exBpesisir: () => Bukti.kartu("pesisir"), exBevakuasi: () => Bukti.kartu("evakuasi"), exBbnpb: () => Bukti.kartu("bnpb"), exBtabel: () => Bukti.tabel(),

  /* sinkron atau janji (kartu yang butuh data tambahan) */
  gambar(id) { Kartu._leg = null;
    try { const h = this["ex" + id[0].toUpperCase() + id.slice(1)](); return h?.then ? h.catch(e => { console.error(e); return ""; }) : h || ""; } catch (e) { console.error(e); return ""; } },
  isi(box) { const h = this.gambar(box.dataset.ex), pasang = t => { box.innerHTML = t; KG.gulir(box); if (box.dataset.ex === "btabel") Bukti.hubung(box, () => this.ulang(box)); };
    if (h?.then) h.then(pasang); else pasang(h); },
  ulang(box) { nanti(() => this.isi(box)); },
  async render() {
    const el = $("#insight"); if (!el) return;
    if (!el.dataset.siap) { el.dataset.siap = 1;
      el.addEventListener("click", e => { const s = e.target.closest("[data-set]"); if (s) { this.st[s.dataset.set] = s.dataset.v; s.parentElement.querySelectorAll("[data-set]").forEach(b => b.setAttribute("aria-pressed", b === s)); this.ulang(s.closest("[data-ex]")); } }); }
    if (!el.children.length) el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat insight gempa…</div>`;
    const [, R, P] = await Promise.all([this.muatHidup(), this.R ?? muatJSON("data/riwayat_m5.json").catch(() => null), this.P ?? muatJSON("data/riwayat_prov.json").catch(() => null)]);
    this.R = R; this.P = P;
    el.innerHTML = this.EX.map(id => `<div data-ex="${id}"></div>`).join("");
    el.querySelectorAll("[data-ex]").forEach(b => this.isi(b));
    /* semua kartu kosong (tanpa data hidup, riwayat, dan tabel) = satu pesan */
    setTimeout(() => { if (el.isConnected && ![...el.children].some(c => c.innerHTML)) el.innerHTML = `<div class="kosong">Data gempa belum tersedia.</div>`; }, 4000); },
};
