"use strict";
/* Tsunami per zona (Silang Sumber F2, SS-13 dan SS-14): tingkat resmi tiap zona BMKG dipetakan ke kabupaten/kota, eksposur, pengukuran muka air,
   garis waktu buletin, dan pemutar ulang 5 kejadian arsip. Data: data/tsunami_zona.json dan zona_tsunami_kamus.json (scripts/gempa/tsunami_zona.py).
   Tingkat zona = pernyataan resmi BMKG apa adanya; pemetaan ke kabupaten dan eksposur = hasil turunan Centurisk97. Tanpa klaim keselamatan:
   tanpa zona hanya ditulis "buletin ini tidak memuat zona". Pemutar SELALU berlabel latihan dengan tanggal kejadian aslinya.
   Peta waktu tiba tetap gambar utuh BMKG. Bagian atas murni tanpa DOM (diuji tests/gempa/silang_tsunami.test.mjs). */
const TsunamiZona = {
  CDN: "https://cdn.bmkg.go.id/",
  TINGKAT: {AWAS: ["Awas", "#d64545", 3], SIAGA: ["Siaga", "#e8743b", 2], WASPADA: ["Waspada", "#e0b400", 1]},
  BELUM: "belum ada data",
  st: {id: null, k: 0, main: false},
  d: null,
  /* ---------------------------------------------------------------- murni */
  urut: t => (TsunamiZona.TINGKAT[t] || [0, 0, 0])[2],
  /* kejadian terbaru dulu */
  daftar(d) { return Object.entries(d?.kejadian || {}).map(([id, k]) => ({id, ...k})).sort((a, b) => b.t - a.t); },
  tglKejadian: t => new Date(t * 1e3).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"}),
  /* baris kabupaten pada buletin b: tingkat tertinggi dulu, lalu penduduk. Eksposur seluruh kabupaten (bukan zona rendah). */
  barisKab(kej, b) {
    return Object.entries(b.kab || {}).map(([id, v]) => ({id, nama: (kej.kab[id]?.nama || id).replace(/^Kab\. /, ""), tingkat: v.tingkat, zona: v.zona, sebagian: v.sebagian, st: v.sebagian_tingkat ?? v.sebagian, eks: kej.kab[id]?.eksposur || null}))
      .sort((x, y) => this.urut(y.tingkat) - this.urut(x.tingkat) || (x.st - y.st) || (x.st || y.st ? 0 : (y.eks?.penduduk ?? -1) - (x.eks?.penduduk ?? -1)) || (x.nama < y.nama ? -1 : 1));
  },
  belumDipetakan: b => (b.zona || []).filter(z => !z.dipetakan),
  /* null = belum ada data (bukan nol) */
  sel: v => v == null ? TsunamiZona.BELUM : fmt(v),
  /* kabupaten yang tingkat tertingginya ditentukan zona sebagian pantai: angka seluruh kabupaten ditulis batas atas, bukan angka polos */
  selEks: (v, st) => v == null ? TsunamiZona.BELUM : st ? `sampai ${fmt(v)} (seluruh kab.)` : fmt(v),
  selFaskes: (v, st) => v == null ? TsunamiZona.BELUM : `≥ ${fmt(v)} (perkiraan)${st ? ", seluruh kab." : ""}`,
  ringkas(kej, b) { const kab = Object.keys(b.kab || {}).length, zn = (b.zona || []).length;
    return {zona: zn, kab, belum: this.belumDipetakan(b).length, maks: (b.zona || []).reduce((m, z) => this.urut(z.tingkat) > this.urut(m) ? z.tingkat : m, ""), }; },
  /* perubahan terhadap buletin sebelumnya, satu kalimat pendek */
  teksUbah(b) { const c = b.perubahan || {}, o = [];
    if (c.zona_baru) o.push(`${fmt(c.zona_baru)} zona baru`); if (c.zona_hilang) o.push(`${fmt(c.zona_hilang)} zona hilang`); if (c.naik_tingkat) o.push(`${fmt(c.naik_tingkat)} zona naik tingkat`);
    if (c.m_sebelum != null && c.m_sebelum !== b.m) o.push(`M ${fmt(c.m_sebelum)} ke ${fmt(b.m)}`); if (c.ukur_baru) o.push(`${fmt(c.ukur_baru)} pengukuran baru`);
    return o.join(", ") || "tanpa perubahan"; },
  /* gambar produk BMKG terbaru sampai buletin k */
  produk(kej, k, jenis) { for (let i = k; i >= 0; i--) { const b = kej.buletin[i]; if ((b.produk || []).includes(jenis + ".png")) return this.CDN + b.id + "." + jenis + ".png"; } return null; },
  waktuLengkap: ep => TsunamiZona.tglKejadian(ep) + " pukul " + new Date(ep * 1e3).toLocaleTimeString("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit"}).replace(":", ".") + " WIB",
  jam: ep => new Date(ep * 1e3).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "").replace(/:/g, ".") + " WIB",
  pil: (t, w) => `<span class="pill pm" style="--w:${w}">${esc(t)}</span>`,
  pilTingkat(t) { const l = this.TINGKAT[t]; return l ? this.pil(l[0], l[1]) : `<span class="pill pm" style="--w:#5b6575">${esc(t || "tidak disebut")}</span>`; },

  /* ---------------------------------------------------------------- tampilan */
  ik: {mundur: '<path d="M15 6l-6 6 6 6"/>', maju: '<path d="M9 6l6 6-6 6"/>', putar: '<path d="M8 5v14l11-7z"/>', jeda: '<path d="M8 5v14M16 5v14"/>'},
  tombol: (a, ik, label) => `<button type="button" class="iconbtn tz-b" data-a="${a}" aria-label="${label}" title="${label}"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TsunamiZona.ik[ik]}</svg></button>`,
  kartu(ey, judul, isi, ctl = "") {
    return Kartu.ex(judul, "", "", isi, "", ctl).replace('<article class="ex">', '<article class="ex ex-std">').replace('<span class="ex-ey"></span>', `<span class="ex-ey">${ey}</span>`); },
  gbr: (url, alt) => `<figure class="ina-f"><a href="${esc(url)}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(url)}" alt="${esc(alt)}"></a><figcaption>${esc(alt)}</figcaption></figure>`,

  async muat() { if (!this.d) this.d = await muatJSON("data/tsunami_zona.json"); return this.d; },
  async render() {
    const el = $("#tsunamiZona"); if (!el) return;
    if (!el.dataset.siap) { el.dataset.siap = 1; el.innerHTML = '<div id="tzKtl"></div><div id="tzIsi"></div>'; this.pasang(el); }
    let d; try { d = await this.muat(); } catch (e) { el.innerHTML = this.kartu("Tsunami per zona", `Data tsunami per zona <span class="hl">belum tersedia</span>`, `<div class="kosong">Arsip buletin tsunami belum dimuat.</div>`); return; }
    const L = this.daftar(d); if (!L.length) { el.replaceChildren(); return; }
    if (!this.st.id || !d.kejadian[this.st.id]) this.mulaiKejadian(L[0].id, d);
    this.gambarKtl(el); this.gambar(el);
  },
  mulaiKejadian(id, d) { const kej = (d || this.d).kejadian[id], i = kej.buletin.map(b => b.zona.length > 0).lastIndexOf(true); this.st = {id, k: i < 0 ? kej.buletin.length - 1 : i, main: false}; },
  pasang(el) {
    el.addEventListener("click", e => {
      const kj = e.target.closest("[data-kj]"); if (kj) { this.henti(); this.mulaiKejadian(kj.dataset.kj); this.gambarKtl(el); return this.segar(el); }
      const a = e.target.closest("[data-a]")?.dataset.a, kej = this.d?.kejadian[this.st.id]; if (!kej) return;
      if (a === "mundur") { this.henti(); this.st.k = Math.max(0, this.st.k - 1); return this.segar(el); }
      if (a === "maju") { this.henti(); this.st.k = Math.min(kej.buletin.length - 1, this.st.k + 1); return this.segar(el); }
      if (a === "putar") return this.st.main ? (this.henti(), this.segar(el)) : this.putar(el);
      const r = e.target.closest("tr[data-b]"); if (r) { this.henti(); this.st.k = +r.dataset.b; this.segar(el); } });
    el.addEventListener("input", e => { if (e.target.id !== "tzGeser") return; this.henti(); this.st.k = +e.target.value; this.label(el); clearTimeout(this._dq); this._dq = setTimeout(() => this.segar(el), 120); });
  },
  putar(el) { const kej = this.d.kejadian[this.st.id]; if (this.st.k >= kej.buletin.length - 1) this.st.k = 0; this.st.main = true;
    this._iv = setInterval(() => { if (!$("#p-katalog")?.classList.contains("on")) return this.henti(); if (this.st.k >= kej.buletin.length - 1) { this.henti(); return this.segar(el); } this.st.k++; this.segar(el); }, 1800); this.segar(el); },
  henti() { clearInterval(this._iv); this.st.main = false; },
  /* chrome (label, penggeser, tombol) urgent; kartu berat ditunda setelah paint */
  segar(el) { this.label(el); nanti(() => this.gambar(el)); },
  label(el) { const kej = this.d.kejadian[this.st.id], b = kej.buletin[this.st.k], t = el.querySelector("#tzLabel"), g = el.querySelector("#tzGeser"), p = el.querySelector('[data-a="putar"]');
    if (t) t.textContent = `Buletin ${this.st.k + 1} dari ${kej.buletin.length}: ${b.subjek}, ${this.jam(b.terbit)}`; if (g && +g.value !== this.st.k) g.value = this.st.k;
    if (p) { p.innerHTML = this.tombol("putar", this.st.main ? "jeda" : "putar", this.st.main ? "Jeda" : "Putar ulang").replace(/^<button[^>]*>|<\/button>$/g, ""); p.setAttribute("aria-label", this.st.main ? "Jeda" : "Putar ulang"); p.title = p.getAttribute("aria-label"); } },
  /* kartu pemutar: dibuat ulang hanya saat kejadian berganti, supaya penggeser tidak diganti saat ditarik */
  gambarKtl(el) {
    const d = this.d, kej = d.kejadian[this.st.id], N = kej.buletin.length, tgl = this.tglKejadian(kej.t);
    const pilih = `<div class="seg penuh ina-seg" role="group" aria-label="Kejadian arsip">${this.daftar(d).map(k => `<button data-kj="${esc(k.id)}" aria-pressed="${k.id === this.st.id}" title="${esc(k.area)}">${esc(this.tglKejadian(k.t))}, M ${fmt(k.m)}</button>`).join("")}</div>`;
    const pemutar = `<div class="tz-pm" role="group" aria-label="Pemutar ulang buletin">${this.tombol("mundur", "mundur", "Buletin sebelumnya")}${this.tombol("putar", "putar", "Putar ulang")}${this.tombol("maju", "maju", "Buletin berikutnya")}
      <input id="tzGeser" type="range" min="0" max="${N - 1}" value="${this.st.k}" aria-label="Pilih buletin"><span id="tzLabel" translate="no"></span></div>`;
    el.querySelector("#tzKtl").innerHTML = this.kartu("Tsunami per zona", `Pemutaran ulang <span class="hl">${fmt(this.daftar(d).length)}</span> kejadian arsip BMKG`,
      `<p class="tz-lb">${this.pil("Latihan: pemutaran ulang arsip", "#6b7280")} ${this.pil("Kejadian asli " + tgl, "#3f6fa8")} ${this.pil("Resmi BMKG", "#0b2545")}</p>${pemutar}`, pilih);
    this.label(el); },

  gambar(el) {
    const d = this.d, kej = d.kejadian[this.st.id], b = kej.buletin[this.st.k], N = kej.buletin.length, r = this.ringkas(kej, b), tgl = this.tglKejadian(kej.t);
    const jd = r.zona
      ? `<span class="hl">${fmt(r.zona)}</span> zona peringatan BMKG mencakup <span class="hl">${fmt(r.kab)}</span> kabupaten/kota pada buletin ke-${this.st.k + 1}, kejadian ${esc(tgl)}${r.belum ? `; <span class="hl">${fmt(r.belum)}</span> zona belum dipetakan ke kabupaten` : ""}`
      : `Buletin ke-${this.st.k + 1} kejadian ${esc(tgl)} tidak memuat zona peringatan`;
    const B = this.barisKab(kej, b), bd = this.belumDipetakan(b);
    const tabel = B.length ? `<div class="tw ex-tabel ina-tb"><table><thead><tr><th>Kabupaten/kota</th><th title="Tingkat resmi tertinggi dari zona BMKG yang mencakupnya">Tingkat BMKG</th><th title="Zona BMKG yang mencakup kabupaten ini">Zona</th>
        <th class="n" title="Penduduk seluruh kabupaten (WorldPop 2026), bukan penduduk di zona rendah">Penduduk</th><th class="n" title="Sekolah Dapodik/EMIS, seluruh kabupaten">Sekolah</th><th class="n" title="Rumah sakit dan puskesmas OSM, dipasang lewat pusat kecamatan terdekat (perkiraan)">Faskes</th><th class="n" title="Titik evakuasi BNPB (TES, rambu, sirine); hanya 4 wilayah rintisan">Titik evakuasi</th></tr></thead>
        <tbody>${B.map(x => `<tr><td>${esc(x.nama)}${x.sebagian ? ' <small title="Zona menunjuk sebagian garis pantai kabupaten">(sebagian pantai)</small>' : ""}</td><td>${this.pilTingkat(x.tingkat)}</td><td><small translate="no">${x.zona.map(esc).join(", ")}</small></td>
        <td class="n">${this.selEks(x.eks?.penduduk, x.st)}</td><td class="n">${this.selEks(x.eks?.sekolah, x.st)}</td><td class="n">${this.selFaskes(x.eks?.faskes, x.st)}</td><td class="n">${this.selEks(x.eks?.evakuasi, x.st)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="kosong">Buletin ini tidak memuat zona.</div>`;
    const sisa = bd.length ? `<h5 class="ina-h5">Zona yang belum terhubung ke kabupaten (${fmt(bd.length)})</h5><div class="ina-pil">${bd.map(z => `<span class="ina-w"><b translate="no">${esc(z.nama)}</b> <small translate="no">${esc(z.provinsi)}</small> ${this.pilTingkat(z.tingkat)}</span>`).join("")}</div>` : "";
    const k1 = this.kartu("Tsunami per zona", jd, `<p class="tz-lb">${this.pil("Latihan, kejadian asli " + tgl, "#6b7280")}</p>${tabel}${sisa}<p class="fnd ina-atr">Eksposur = seluruh kabupaten/kota. ${this.BELUM[0].toUpperCase() + this.BELUM.slice(1)} berarti berkas sumbernya tidak memuat kabupaten itu, bukan nol. Pemetaan zona ke kabupaten dibuat dari nama zona (Centurisk97) dan belum ditinjau manusia; tingkat zona adalah pernyataan BMKG. Sumber: <a href="https://www.bmkg.go.id/gempabumi/berpotensi-tsunami" target="_blank" rel="noopener">BMKG</a> (InaTEWS), WorldPop, Dapodik/EMIS, OSM, BNPB.</p>`);
    const U = b.ukur || [], umax = U.reduce((m, u) => u.tinggi_m > (m?.tinggi_m ?? -1) ? u : m, null);
    const k2 = this.kartu("Muka air terukur", U.length ? `<span class="hl">${fmt(U.length)}</span> stasiun melaporkan muka air, tertinggi <span class="hl">${fmt(umax.tinggi_m)} m</span> di ${esc(umax.stasiun)}` : `Buletin ke-${this.st.k + 1} belum memuat pengukuran muka air`,
      U.length ? `<div class="tw ex-tabel ina-tb"><table><thead><tr><th>Stasiun</th><th class="n">Jam WIB</th><th class="n">Tinggi (m)</th></tr></thead><tbody>${[...U].sort((x, y) => y.tinggi_m - x.tinggi_m).map(u => `<tr><td translate="no">${esc(u.stasiun)}</td><td class="n">${esc(u.jam.replace(":", "."))}</td><td class="n">${fmt(u.tinggi_m)}</td></tr>`).join("")}</tbody></table></div>`
        + (b.tidak_terurai ? `<p class="fnd">Bagian yang tidak terurai, teks asli BMKG: <span translate="no">${esc(b.tidak_terurai)}</span></p>` : "") : `<div class="kosong">Tidak ada pengukuran pada buletin ini.</div>`);
    const gw = kej.buletin.map((x, i) => `<tr class="klik${i === this.st.k ? " on" : ""}" data-b="${i}" tabindex="0"><td class="n">${i + 1}</td><td translate="no">${esc(x.subjek)}${x.berakhir ? " (berakhir)" : ""}</td><td class="n">${esc(this.jam(x.terbit))}</td><td class="n">${fmt(x.m)}</td><td class="n">${fmt(x.n_zona)}</td><td>${esc(this.teksUbah(x))}</td></tr>`).join("");
    const k3 = this.kartu("Garis waktu buletin", `<span class="hl">${fmt(N)}</span> buletin BMKG untuk gempa ${esc(this.waktuLengkap(kej.t))}, M <span class="hl">${fmt(kej.m)}</span>`,
      `<div class="tw ex-tabel ina-tb"><table><thead><tr><th class="n">Ke</th><th>Subjek</th><th class="n">Terbit</th><th class="n">M</th><th class="n">Zona</th><th>Perubahan</th></tr></thead><tbody>${gw}</tbody></table></div>`);
    const tt = this.produk(kej, this.st.k, "tt"), wz = this.produk(kej, this.st.k, "wz");
    const k4 = tt || wz ? this.kartu("Peta BMKG", `Peta waktu tiba dan zona peringatan resmi BMKG, <span class="hl">gambar utuh</span>`, `<div class="ina-fg">${tt ? this.gbr(tt, "Peta waktu tiba tsunami BMKG") : ""}${wz ? this.gbr(wz, "Peta zona peringatan BMKG") : ""}</div><p class="fnd ina-atr">Gambar milik BMKG, ditampilkan utuh tanpa diubah. Sumber: <a href="https://www.bmkg.go.id/gempabumi/berpotensi-tsunami" target="_blank" rel="noopener">BMKG</a> (InaTEWS).</p>`) : "";
    const isi = el.querySelector("#tzIsi"); isi.innerHTML = k1 + k2 + k3 + k4;
    isi.querySelectorAll("figure.ina-f img").forEach(i => i.addEventListener("error", () => i.closest("figure")?.remove(), {once: true}));
  },
};
