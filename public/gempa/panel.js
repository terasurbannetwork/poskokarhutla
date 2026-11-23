"use strict";
/* ================================================================ panel kiri: tiruan panel Real Time karhutla (public/index.html)
   Mode atas (Terkini, Riwayat), baris pil + tombol unduh CSV + label hari, tabel provinsi dengan Grand total, lalu kartu
   "Gempa per tahun" dan "Tren gempa". Kelas CSS sama dengan karhutla (salinan aturannya ada di gempa.css).
   Status tsunami: kolom Tsunami hanya menghitung gempa yang dinyatakan BMKG berpotensi tsunami (kode 1 sampai 3); kosong "–", bukan penilaian aman.
   Riwayat per provinsi hanya dari riwayat_prov.json (USGS M 5+); katalog merusak dan tsunami BMKG tidak punya kunci provinsi, jadi tidak ada pilnya.
   Fitur paritas F4 dipasang di sini (bukan di peta.js): tanggal terpilih (PB-73, S.tanggal lewat dalamRentang), segmen ukuran provinsi (PB-76,
   segmenUkuran, gerbang kemampuan.layar.ukuran_provinsi), tombol unduh mesin bersama (PB-71, UnduhTabel; CSV lama hanya cadangan bila registri
   mematikannya), dan ringkasan, baris rinci, serta riwayat provinsi di daftar satu provinsi (ringkasProv, rinciGempa, riwayatSingkat di peta.js). */
const ikP = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const SARING = {semua: () => true, dirasakan: g => !!g.mmi_maks, m5: g => g.m >= 5};
const PIL_KINI = [["semua", "Semua", '<path d="M4 6h16M4 12h16M4 18h16"/>'], ["dirasakan", "Dirasakan", IKON_GEMPA.getar], ["m5", "M 5+", IKON_GEMPA.gempa]];
const PIL_RIW = [["tahun", "Per tahun", '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'], ["m5", "M 5+", IKON_GEMPA.gempa]];
const TREN_G = [["7h", "1 mg", "1 minggu", 7, "h"], ["14h", "2 mg", "2 minggu", 14, "h"], ["21h", "3 mg", "3 minggu", 21, "h"], ["4m", "4 mg", "4 minggu", 4, "m"], ["8m", "8 mg", "8 minggu", 8, "m"],
  ["12m", "12 mg", "12 minggu", 12, "m"], ["24m", "24 mg", "24 minggu", 24, "m"], ["12b", "1 thn", "1 tahun", 12, "b"]];
const TAHUN_KARTU = 12;   /* 2015 sampai tahun berjalan */
const geserHariG = (t, n) => new Date(Date.parse(t + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const tglG = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short"});
const ubahPersenG = (kini, lalu) => kini == null || !lalu || lalu < 10 ? null : Math.round((kini - lalu) / lalu * 100);
const teksPersenG = (d, x, y) => d == null ? "" : `<text x="${x}" y="${y}" text-anchor="middle" font-size="7" font-weight="700" fill="${d > 0 ? "#c9503a" : d < 0 ? "#2b8c86" : "currentColor"}">${d > 0 ? "+" : d < 0 ? "−" : ""}${fmt(Math.abs(d))}%</text>`;
/* persen hanya bila pembanding >= 10 gempa (ubahPersenG); di bawah itu tulis angka mentahnya */
const tipPersenG = (kini, lalu, satuan) => { if (lalu == null) return ""; const d = ubahPersenG(kini, lalu); return d == null ? `<br>${satuan} sebelumnya: ${fmt(lalu)}` : `<br>${d > 0 ? "naik" : d < 0 ? "turun" : "sama dengan"}${d ? " " + fmt(Math.abs(d)) + "% dari" : ""} ${satuan} sebelumnya`; };
const csvG = rows => rows.map(r => r.map(v => { const s = String(v ?? ""); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(",")).join("\n");

const Panel = {
  mode: "kini", pil: {kini: "semua", riw: "tahun"}, trenV: "7h", csv: null, R: null, _rm: null, hari: null, akhir: null, ytd: null, _gagal: false, _kc: null, _ag: null, _agD: null,
  /* ---------- helper kecil ---------- */
  seg(aria, daftar, aktif) { return `<div class="tr-sw"><div class="seg penuh" role="group" aria-label="${aria}">${daftar.map(([v, n, d]) => `<button data-pil="${v}" aria-pressed="${aktif === v}">${ikP(d)}${n}</button>`).join("")}</div>`
    + (window.UnduhTabel?.tombol() || `<button type="button" class="ud-btn" data-csv aria-label="Unduh tabel CSV" title="Unduh tabel (CSV)">${ikP('<path d="M12 4v11m0 0-4-4m4 4 4-4M5 19h14"/>')}</button>`) + `</div>`; },
  baris: label => `<div class="tr-baris"><div class="tr-hari"><b>${label}</b></div></div>`,
  kepala(g, kol) { const u = S.urut; return `<div class="tb kepala" style="grid-template-columns:${g}"><span></span>${kol.map(([k, n, c, tip]) => `<span class="${[c, k && u.k === k ? "urut" : ""].join(" ").trim()}"${k ? ` data-s="${k}"` : ""}${k && u.k === k ? ` data-arah="${u.turun ? 0 : 1}"` : ""}${tip ? ` title="${esc(tip)}"` : ""}>${n}</span>`).join("")}</div>`; },
  hariIni: () => new Date().toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", weekday: "short", day: "numeric", month: "short"}).replace(",", ""),
  urutkan(daftar, kunci, nama) { const u = S.urut, arah = u.turun ? -1 : 1; return daftar.sort((a, b) => arah * ((u.k === "nama" ? a.nama.localeCompare(b.nama) : (a[u.k] || 0) - (b[u.k] || 0)) || (b[kunci] || 0) - (a[kunci] || 0) || a.nama.localeCompare(b.nama))); },
  /* ---------- render utama ---------- */
  render() {
    const box = $("#rows"), j = S.jalur;
    if (this.mode === "riw") { box.innerHTML = j.length ? this.kartu(j[0]) : this.tabelRiw(); return; }
    const d = dalamRentang(), pil = this.pil.kini, dF = d.filter(SARING[pil]), rentang = S.rentang === 168 ? "7 hari" : S.rentang + " jam";
    const label = S.tanggal ? new Date(S.tanggal + "T12:00:00+07:00").toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", weekday: "short", day: "numeric", month: "short", year: "numeric"}).replace(",", "")
      : `${S.rentang * 36e5 > Date.now() - ARSIP ? "sejak " + KG.tgl(ARSIP) : rentang + " terakhir"}, ${this.hariIni()}`;
    const uk = !j.length && typeof segmenUkuran === "function" ? segmenUkuran(S.ukuranIzin || [], ukAktif().slug) : "";
    const atas = this.seg("Saringan gempa", PIL_KINI, pil) + (uk ? `<div class="tr-sw">${uk}</div>` : "") + this.baris(label);
    if (!dF.length) { this.csv = null; box.innerHTML = atas + `<div class="kosong">${S.tersedia && S.tanggal ? `Tidak ada gempa ${pil === "semua" ? "" : "dengan saringan ini "}${esc(periodeTeks())}.` : S.tersedia ? `Tidak ada gempa ${pil === "semua" ? "" : "dengan saringan ini "}${S.rentang * 36e5 > Date.now() - ARSIP ? "sejak " + KG.tgl(ARSIP) : "dalam " + rentang + " terakhir"}.` : "Data gempa belum tersedia."}</div>`; return; }
    box.innerHTML = j.length ? this.kartu(j[0]) + atas + this.daftarProv(dF, j[0]) : atas + this.tabelKini(dF) + this.kartu(null);
  },
  tabelKini(d) {
    const G = "20px minmax(0,2fr) minmax(40px,.7fr) minmax(64px,1fr) minmax(56px,1fr) minmax(52px,.8fr)", ag = agregat(d), u = S.urut;
    const isi = this.urutkan(Object.entries(ag).map(([k, a]) => ({k, nama: namaProv(k), ...a})), "n");
    const tot = isi.reduce((a, p) => ({n: a.n + p.n, mmi: a.mmi + p.mmi, ts: a.ts + (p.ts || 0), m: Math.max(a.m, p.m)}), {n: 0, mmi: 0, ts: 0, m: 0}), f = v => v ? fmt(v) : "–";
    this.csv = {nama: "provinsi", baris: [["Provinsi", "Gempa", "Dirasakan", "Terbesar (M)", "Berpotensi tsunami menurut BMKG"], ...isi.map(p => [p.nama, p.n, p.mmi, p.m, p.ts || 0]), ["Grand total", tot.n, tot.mmi, tot.m, tot.ts]]};
    return this.kepala(G, [["nama", "Provinsi"], ["n", "Gempa", "n"], ["mmi", "Dirasakan", "n"], ["m", "Terbesar"], ["ts", "Tsunami", "n", "Jumlah gempa yang dinyatakan BMKG berpotensi tsunami. Tanda – berarti BMKG tidak menyatakannya."]])
      + `<div class="tb tb-total" style="grid-template-columns:${G}"><span></span><span>Grand total</span><span class="n">${fmt(tot.n)}</span><span class="n">${f(tot.mmi)}</span><span>${pilM(tot.m)}</span><span class="n">${f(tot.ts)}</span></div>`
      + isi.map((p, i) => `<button class="tb" data-k="${esc(p.k)}" style="grid-template-columns:${G}"><span class="rk">${i + 1}</span><span class="kom"><b>${esc(p.nama)}</b></span><span class="n"><b>${fmt(p.n)}</b></span><span class="n">${f(p.mmi)}</span><span>${pilM(p.m)}</span><span class="n">${f(p.ts)}</span></button>`).join("");
  },
  daftarProv(d, k) {
    const G = "20px minmax(0,2.4fr) minmax(64px,.8fr) minmax(84px,1fr)", per = 20, u = S.urut, arah = u.turun ? -1 : 1;
    const isi = d.filter(g => (g.prov || "-") === k).sort((a, b) => arah * (u.k === "m" ? a.m - b.m : a.t - b.t) || b.t - a.t);
    S.hal = Math.min(S.hal, Math.max(0, Math.ceil(isi.length / per) - 1));
    this.csv = {nama: namaProv(k), baris: [["Lokasi", "Kekuatan (M)", "Waktu"], ...isi.map(g => [wilayahPendek(g.wilayah), g.m, jamPendek(g.waktu)])]};
    /* nama kab BMKG ("HALMAHERASELATAN") baru rapi sesudah kamus NamaWil dimuat: muat sekali saat daftar provinsi dibuka, lalu gambar ulang */
    if (typeof NamaWil !== "undefined" && !NamaWil.kamus && !this._kamus) { this._kamus = 1; NamaWil.siap().then(() => { if (S.jalur.length) nanti(renderDaftar); }); }
    return ringkasProv(k, isi) + this.kepala(G, [[null, "Lokasi"], ["m", "Kekuatan"], ["t", "Waktu"]])
      + isi.slice(S.hal * per, S.hal * per + per).map((g, i) => { const r = rinciGempa(g); return `<button class="tb tb-g" data-g="${esc(g.id)}" style="grid-template-columns:${G}"><span class="rk">${S.hal * per + i + 1}</span><span class="kom gk"><span class="gk-t">${esc(wilayahPendek(g.wilayah))}</span>${r ? `<small class="gk-s">${esc(r)}</small>` : ""}</span><span>${pilM(g.m)}</span><span class="n">${esc(jamPendek(g.waktu))}</span></button>`; }).join("")
      + (isi.length > per ? paginasi(S.hal, isi.length, per, "gempa") : "") + riwayatSingkat(k);
  },
  /* ---------- Riwayat: satu sumber, riwayat_prov.json (USGS) ---------- */
  ringkas() { const D = S.rwProv; if (!D) return null; if (this._ag && this._agD === D) return this._ag;
    const th = Object.keys(D.prov.ID.th).map(Number), ini = Math.max(...th), r = [];
    for (const [k, P] of Object.entries(D.prov)) { if (k === "ID") continue; const n = y => { const a = P.th[y]; return a ? a[1] + a[2] + a[3] : 0; };
      let tot = 0, m6 = 0, m7 = 0, mm = 0; for (const a of Object.values(P.th)) { tot += a[1] + a[2] + a[3]; m6 += a[2] + a[3]; m7 += a[3]; mm = Math.max(mm, a[4] || 0); }
      let s = 0; for (let y = ini - TAHUN_KARTU + 1; y < ini; y++) s += n(y);
      r.push({k, nama: namaProv(k), th: n(ini), t1: n(ini - 1), rata: s / (TAHUN_KARTU - 1), tot, m6, m7, mm}); }
    this._agD = D; return this._ag = {ini, r}; },
  tabelRiw() {
    const A = this.ringkas(); if (!A) return this.seg("Isi riwayat", PIL_RIW, this.pil.riw) + `<div class="kosong">Data riwayat belum tersedia.</div>`;
    const pil = this.pil.riw, G = pil === "tahun" ? "20px minmax(0,2fr) minmax(52px,.8fr) minmax(52px,.8fr) minmax(64px,1fr)" : "20px minmax(0,2fr) minmax(52px,.8fr) minmax(46px,.7fr) minmax(46px,.7fr) minmax(64px,1fr)";
    const isi = this.urutkan(A.r.slice(), pil === "tahun" ? "th" : "tot"), f = v => v ? fmt(v) : "–", jm = x => isi.reduce((a, p) => a + x(p), 0);
    const a0 = A.ini - TAHUN_KARTU + 1;
    let kep, tot, bar, csvK, csvB, csvT, label;
    if (pil === "tahun") {
      label = `Gempa M 5+ per tahun, USGS, ${a0}–${A.ini}`; csvK = ["Provinsi", String(A.ini), String(A.ini - 1), `Rata-rata ${a0}–${A.ini - 1}`];
      kep = [["nama", "Provinsi"], ["th", String(A.ini), "n", "Tahun berjalan, belum penuh"], ["t1", String(A.ini - 1), "n"], ["rata", "Rata-rata", "n", `Rata-rata per tahun ${a0}–${A.ini - 1}`]];
      tot = `<span class="n">${fmt(jm(p => p.th))}</span><span class="n">${fmt(jm(p => p.t1))}</span><span class="n">${fmt(Math.round(jm(p => p.rata)))}</span>`;
      bar = p => `<span class="n"><b>${f(p.th)}</b></span><span class="n">${f(p.t1)}</span><span class="n">${f(Math.round(p.rata))}</span>`;
      csvB = p => [p.nama, p.th, p.t1, Math.round(p.rata)]; csvT = ["Grand total", jm(p => p.th), jm(p => p.t1), Math.round(jm(p => p.rata))];
    } else {
      label = "Gempa M 5+ sejak 1900, USGS"; csvK = ["Provinsi", "M 5+", "M 6+", "M 7+", "Terbesar (M)"];
      kep = [["nama", "Provinsi"], ["tot", "M 5+", "n"], ["m6", "M 6+", "n"], ["m7", "M 7+", "n"], ["mm", "Terbesar"]];
      const mx = Math.max(0, ...isi.map(p => p.mm));
      tot = `<span class="n">${fmt(jm(p => p.tot))}</span><span class="n">${fmt(jm(p => p.m6))}</span><span class="n">${f(jm(p => p.m7))}</span><span>${mx ? pilM(mx) : "–"}</span>`;
      bar = p => `<span class="n"><b>${fmt(p.tot)}</b></span><span class="n">${fmt(p.m6)}</span><span class="n">${f(p.m7)}</span><span>${p.mm ? pilM(p.mm) : "–"}</span>`;
      csvB = p => [p.nama, p.tot, p.m6, p.m7, p.mm]; csvT = ["Grand total", jm(p => p.tot), jm(p => p.m6), jm(p => p.m7), mx];
    }
    this.csv = {nama: "riwayat-" + pil, baris: [csvK, ...isi.map(csvB), csvT]};
    return this.seg("Isi riwayat", PIL_RIW, pil) + this.baris(label) + this.kepala(G, kep) + `<div class="tb tb-total" style="grid-template-columns:${G}"><span></span><span>Grand total</span>${tot}</div>`
      + isi.map((p, i) => `<button class="tb" data-k="${esc(p.k)}" style="grid-template-columns:${G}"><span class="rk">${i + 1}</span><span class="kom"><b>${esc(p.nama)}</b></span>${bar(p)}</button>`).join("");
  },
  /* ---------- kartu di bawah tabel ---------- */
  /* HTML kartu di-cache per kunci supaya sortir dan paginasi tidak membangunnya ulang */
  kartu(k) { k = k || "ID"; const D = S.rwProv, kunci = [k, this.trenV, this.hari ? 1 : 0, this._gagal ? 1 : 0].join("|");
    if (this._kc && this._kc.D === D && this._kc.kunci === kunci) return this._kc.html;
    const html = this.tahun(k) + this.tren(k); this._kc = {D, kunci, html}; return html; },
  /* tahun berjalan dibandingkan pada periode yang sama (1 Jan sampai tanggal data terakhir) dengan tahun 2015 sampai tahun penuh terakhir, dihitung dari riwayat_m5.json */
  tahun(k) { const D = S.rwProv; if (!D?.prov?.[k]) return "";
    const ini = D.tahun_penuh_terakhir + 1, a = ini - TAHUN_KARTU + 1;
    return `<div class="tm kotak-p tahun-gempa" data-prov="${esc(k)}"><div class="lbl" style="display:flex;justify-content:space-between"><span>Gempa per tahun ${a}–${ini}</span><span>M 5+, USGS</span></div><div class="tahun-gempa-isi">${this.isiTahun(k)}</div></div>`; },
  isiTahun(k) { const D = S.rwProv, P = D.prov[k]; if (!this.ytd) return this.tunggu();
    const ini = D.tahun_penuh_terakhir + 1, th = Array.from({length: TAHUN_KARTU}, (_, i) => ini - TAHUN_KARTU + 1 + i), n = th.length, tg = tglG(this.akhir);
    const sama = th.map(y => this.ytd[y]?.[k] || 0), x0 = sama[n - 1], rataS = sama.slice(0, -1).reduce((a, b) => a + b, 0) / (n - 1);
    const v = th.map((y, i) => { if (i === n - 1) return x0; const q = P.th[y]; return q ? q[1] + q[2] + q[3] : 0; }), rata = v.slice(0, -1).reduce((a, b) => a + b, 0) / (n - 1);
    const rank = [...sama].sort((p, q) => q - p).indexOf(x0) + 1, W = 360, H = 102, B = 74, m = Math.max(1, ...v, rata), bw = W / n, Y = q => B - q / m * 58;
    const g = v.map((q, i) => { const h = Math.max(1, q / m * 58), berjalan = i === n - 1, atas = q > rata, lalu = i ? (berjalan ? sama[i - 1] : v[i - 1]) : null, d = lalu == null ? null : ubahPersenG(q, lalu);
      const tip = `<b>${th[i]}</b>${berjalan ? ` (sampai ${tg})` : ""}<br>${fmt(q)} gempa M 5+${berjalan && rataS ? `<br>${fmt(Math.round(q / rataS * 10) / 10)}× rata-rata periode sama` : ""}${tipPersenG(q, lalu, berjalan ? "periode sama tahun" : "tahun")}`;
      return `<g class="tm-b" data-tip="${esc(tip)}"><rect x="${i * bw}" y="0" width="${bw}" height="${H}" fill="transparent"/>
        <rect x="${i * bw + 2}" y="${B - h}" width="${bw - 4}" height="${h}" rx="2.5" fill="${berjalan ? "#c9503a" : atas ? "#e58a45" : "#f3c79a"}"/>
        ${berjalan || atas ? `<text x="${i * bw + bw / 2}" y="${B - h - 3}" text-anchor="middle" font-size="8.5" font-weight="700" fill="currentColor">${fmt(q)}</text>` : ""}
        ${teksPersenG(d, i * bw + bw / 2, B + 10)}
        <text x="${i * bw + bw / 2}" y="${H - 6}" text-anchor="middle" font-size="8" fill="currentColor" opacity=".55">'${String(th[i]).slice(2)}</text></g>`; }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gempa M 5+ per tahun">${g}<line x1="0" x2="${W}" y1="${Y(rata)}" y2="${Y(rata)}" stroke="#d9692f" stroke-width="1.3" stroke-dasharray="4 3" opacity=".85"/></svg>
      <div class="tm-leg"><span><i style="border-color:#d9692f"></i>rata-rata tahun penuh ${th[0]}–${th[n - 2]} <b>${fmt(Math.round(rata))}</b></span></div>
      ${rataS ? `<div class="tm-ring" style="--w:${x0 >= rataS ? "#c9503a" : "#2b8c86"}"><div class="tm-ring-k"><span>${th[n - 1]} (sampai ${tg})</span><b>${fmt(Math.round(x0 / rataS * 10) / 10)}× rata-rata</b></div>
        <div class="tm-ring-r"><span><b>${fmt(x0)}</b> gempa, peringkat ${rank} dari ${n} tahun pada periode sama</span><span>Rata-rata periode sama (1 Jan sampai ${tg}) ${th[0]}–${th[n - 2]}: <b>${fmt(Math.round(rataS))}</b> gempa</span></div></div>` : ""}`; },
  tunggu() { if (this._gagal) return `<p class="tr-pesan">Riwayat gagal dimuat. Pilih periode tren untuk mencoba lagi.</p>`; this.minta(); return `<p class="tr-pesan">Memuat riwayat…</p>`; },
  /* satu kali muat; gagal ditandai dan tidak diulang otomatis (ulang hanya lewat klik pil tren) */
  minta() { if (this._gagal || this._rm) return; this.muatR().then(() => this.segarSemua(), () => { this._gagal = true; this.segarSemua(); }); },
  segarSemua() { document.querySelectorAll(".tren-gempa").forEach(w => this.segar(w)); document.querySelectorAll(".tahun-gempa").forEach(w => { const i = w.querySelector(".tahun-gempa-isi"); if (i) i.innerHTML = this.isiTahun(w.dataset.prov); }); },
  /* tren: gempa M 5+ USGS per hari, minggu, atau bulan, berakhir di hari penuh terakhir arsip (riwayat_m5.json) */
  muatR() { return this._rm ||= (Insight.R ? Promise.resolve(Insight.R) : muatJSON("data/riwayat_m5.json")).then(R => { Insight.R = R; this.R = R; this.bangun(R); return R; }).catch(() => { this._rm = null; this._gagal = true; throw 0; }); },
  bangun(R) { const w = t => new Date(Date.parse(t + "Z") + 7 * 36e5).toISOString().slice(0, 10), b = R.baris, akhirHari = w(b[b.length - 1][0]), batas = geserHariG(akhirHari, -400), h = new Map();
    for (let i = b.length - 1; i >= 0; i--) { const d = w(b[i][0]); if (d < batas) break; if (d >= akhirHari) continue; const o = h.get(d) || h.set(d, {ID: 0}).get(d); o.ID++; o[b[i][5]] = (o[b[i][5]] || 0) + 1; }
    this.hari = h; this.akhir = geserHariG(akhirHari, -1);
    const md = this.akhir.slice(5), y0 = +this.akhir.slice(0, 4) - TAHUN_KARTU + 1, Y = {};   /* ytd[tahun][kunci]: 1 Jan sampai tanggal data terakhir */
    for (let i = b.length - 1; i >= 0; i--) { const d = w(b[i][0]), y = +d.slice(0, 4); if (y < y0) break; if (d.slice(5) > md) continue; const o = Y[y] ||= {ID: 0}; o.ID++; o[b[i][5]] = (o[b[i][5]] || 0) + 1; }
    this.ytd = Y; },
  jml(k, dari, n) { let a = 0; for (let i = 0; i < n; i++) a += this.hari.get(geserHariG(dari, i))?.[k] || 0; return a; },
  batang(k, v) { const r = TREN_G.find(x => x[0] === v), N = r[3], hi = this.akhir, out = [];
    if (r[4] === "b") { const y0 = +hi.slice(0, 4), m0 = +hi.slice(5, 7) - 1;
      for (let i = N - 1; i >= 0; i--) { const d = new Date(Date.UTC(y0, m0 - i, 1)), dari = d.toISOString().slice(0, 10), bln = new Date(Date.UTC(y0, m0 - i + 1, 1)), hb = Math.min(Math.round((bln - d) / 864e5), Math.round((Date.parse(hi + "T00:00:00Z") - d) / 864e5) + 1);
        const dLalu = new Date(Date.UTC(y0, m0 - i - 1, 1)), lalu = !i && hb > 0 ? (hb <= Math.round((d - dLalu) / 864e5) ? this.jml(k, dLalu.toISOString().slice(0, 10), hb) : null) : undefined;
        out.push({x: d.toLocaleDateString("id-ID", {month: "short", timeZone: "UTC"}), tip: d.toLocaleDateString("id-ID", {month: "long", year: "numeric", timeZone: "UTC"}) + (i ? "" : " (berjalan)"), n: hb > 0 ? this.jml(k, dari, hb) : 0, ...lalu === undefined ? {} : {lalu}}); }
      return out; }
    const lebar = r[4] === "h" ? 1 : 7;
    for (let i = N - 1; i >= 0; i--) { const z = geserHariG(hi, -i * lebar), a = geserHariG(z, 1 - lebar);
      out.push({x: tglG(lebar === 1 ? z : a), tip: lebar === 1 ? new Date(z + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long"}) : `${tglG(a)} sampai ${tglG(z)}`, n: this.jml(k, a, lebar)}); }
    return out; },
  isiTren(k) { if (!this.hari) return this.tunggu();
    const v = this.trenV, r = TREN_G.find(x => x[0] === v), b = this.batang(k, v), n = b.length, nl = b.map(x => x.n), tot = nl.reduce((a, c) => a + c, 0), m = Math.max(1, ...nl), W = 360, H = n > 14 ? 116 : 106, B = 78, bw = W / n, iP = nl.indexOf(Math.max(...nl));
    const tiapLabel = n <= 12 ? 1 : n <= 16 ? 2 : n <= 21 ? 3 : 4, satuan = r[4] === "h" ? "hari" : r[4] === "m" ? "minggu" : "bulan";
    const g = b.map((x, i) => { const h = x.n ? Math.max(1.5, x.n / m * 60) : 0, puncak = i === iP && x.n > 0, ang = n <= 14 || puncak, d = ubahPersenG(x.n, x.lalu !== undefined ? x.lalu : b[i - 1]?.n), cx = Math.min(W - 12, Math.max(12, i * bw + bw / 2));
      return `<g class="tm-b" data-tip="${esc(`<b>${x.tip}</b><br>${fmt(x.n)} gempa M 5+${tipPersenG(x.n, x.lalu !== undefined ? x.lalu : b[i - 1]?.n, satuan)}`)}"><rect x="${i * bw}" y="0" width="${bw}" height="${H}" fill="transparent"/>
        <rect x="${i * bw + Math.min(2, bw * .12)}" y="${B - h}" width="${bw - 2 * Math.min(2, bw * .12)}" height="${h}" rx="2" fill="${puncak ? "#c9503a" : "#e58a45"}"/>
        ${ang && x.n ? `<text x="${cx}" y="${B - h - 3}" text-anchor="middle" font-size="8.5" font-weight="700" fill="currentColor">${fmt(x.n)}</text>` : ""}
        ${teksPersenG(d, cx, B + 10 + (n > 14 && (n - 1 - i) % 2 ? 9 : 0))}
        ${(n - 1 - i) % tiapLabel === 0 ? `<text x="${Math.min(W - 14, Math.max(14, i * bw + bw / 2))}" y="${H - 6}" text-anchor="middle" font-size="8" fill="currentColor" opacity=".55">${x.x}</text>` : ""}</g>`; }).join("");
    let banding = "";
    if (r[4] === "h" || (r[4] === "m" && r[3] <= 8)) { const lebar = r[4] === "h" ? 1 : 7, hari = r[3] * lebar, lalu = this.jml(k, geserHariG(this.akhir, -2 * hari + 1), hari);
      if (lalu) { const d = ubahPersenG(tot, lalu); banding = d == null ? ` (${r[2]} sebelumnya: ${fmt(lalu)})` : ` <span style="color:${d > 0 ? "#c9503a" : d < 0 ? "#2b8c86" : "inherit"}">${d > 0 ? "naik" : d < 0 ? "turun" : "sama dengan"} ${d ? fmt(Math.abs(d)) + "% dari" : ""} ${r[2]} sebelumnya</span>`; } }
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Tren gempa M 5+ ${r[2]} terakhir, per ${satuan}">${g}</svg>
      <p class="tr-pesan"><b>${fmt(tot)}</b> gempa M 5+, ${r[2]} terakhir per ${satuan}, data USGS sampai ${tglG(this.akhir)}.${banding}</p>`; },
  tren(k) { return `<div class="tm kotak-p tren-gempa" data-prov="${esc(k)}"><div class="lbl">Tren gempa</div>
    <div class="seg penuh tr-seg" role="group" aria-label="Rentang tren">${TREN_G.map(([v, n, p]) => `<button type="button" data-tren="${v}" title="${p}" aria-label="${p}" aria-pressed="${this.trenV === v}">${n}</button>`).join("")}</div>
    <div class="tren-gempa-isi">${this.isiTren(k)}</div></div>`; },
  segar(w) { const i = w?.querySelector(".tren-gempa-isi"); if (i) i.innerHTML = this.isiTren(w.dataset.prov); },
  /* ---------- unduh CSV tabel yang sedang tampil ---------- */
  unduh() { const c = this.csv; if (!c) return; const a = document.createElement("a"), iso = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
    a.href = URL.createObjectURL(new Blob(["﻿" + csvG(c.baris)], {type: "text/csv;charset=utf-8"})); a.download = `gempa-${c.nama.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${iso}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); },
};

/* ---------- penggerak: tiap klik cuma menandai tombol, gambar ulang menyusul satu frame kemudian (INP) ---------- */
$("#panelMode").addEventListener("click", e => { const b = e.target.closest("button"); if (!b || b.dataset.m === Panel.mode) return; Panel.mode = b.dataset.m;
  $("#panelMode").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b)); S.hal = 0; S.urut = {k: Panel.mode === "riw" ? "th" : "n", turun: true};
  if (S.jalur.length) { naik(0); S.urut = {k: Panel.mode === "riw" ? "th" : "n", turun: true}; return; } nanti(renderDaftar); });
$("#rows").addEventListener("click", e => {
  if (e.target.closest("[data-csv]")) return Panel.unduh();
  const p = e.target.closest("[data-pil]"); if (p) { const m = Panel.mode === "riw" ? "riw" : "kini"; if (Panel.pil[m] === p.dataset.pil) return; Panel.pil[m] = p.dataset.pil; S.hal = 0;
    S.urut = {k: m === "riw" ? (p.dataset.pil === "tahun" ? "th" : "tot") : "n", turun: true}; p.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === p)); nanti(renderDaftar); } });
document.addEventListener("click", e => { const t = e.target.closest(".tren-gempa [data-tren]"); if (!t) return; const v = t.dataset.tren;
  if (Panel.trenV === v && !Panel._gagal) return; Panel.trenV = v; if (Panel._gagal) { Panel._gagal = false; Panel._rm = null; }
  t.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === t)); nanti(() => Panel.segarSemua()); });
