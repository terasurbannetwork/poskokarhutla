"use strict";
/* Kartu Cerita bersama (gempa, gunung api, banjir, kekeringan, cuaca, udara): satu bingkai, isi dipasok adaptor yang didaftarkan tiap bencana dari berkasnya sendiri.
   Adaptor mengembalikan {judul, baris: [[warna, label pil, kalimat]], sumber, ey?} atau {judul, grafik, sumber, leg?} (kartu bergrafik); null/"" = kartu dibuang.
   Hanya data bersumber yang sudah ada di berkas bencana itu. Butuh format.js dan kartu.js. Gaya baris di cerita.css (dimuat halaman).
   Pakai: Cerita.daftar("gempa", () => ({...})); sisip di render: Cerita.sisip(el, "gempa") (async, kartu ditambahkan di akhir); atau Cerita.kartu("gempa") untuk string/janji,
   Cerita.kartu("gempa", {seksi: true}) untuk kepala nama seksi. */
const Cerita = {
  A: {},
  daftar(id, fn) { this.A[id] = fn; },
  bingkai(c, ey = "Cerita") {
    const isi = c.grafik || `<div class="cr">${c.baris.map(([w, t, x]) => `<div><span class="pl" style="--w:${w}">${esc(t)}</span><p>${x}</p></div>`).join("")}</div>`;
    return Kartu.kartu(c.ey || ey, c.judul, isi, c.sumber, "", c.leg || null); },
  /* episode terberat dari rekap tahunan BNPB/DIBI {tahun: {kejadian, terdampak, mengungsi, rumah_rusak}}: kunci = ukuran pemeringkat, kata = "banjir".
     Mengembalikan {judul, baris} (baris "Pernah terjadi" + "Terbaru"); null bila kurang dari 2 tahun. Adaptor menambah baris Status di depan. */
  /* jumlah dalam kata (bukan singkatan): kalimat dan judul memakai "7,4 juta", "812 ribu"; singkatan rb/jt hanya untuk label sempit */
  kata: v => rb(v).replace(" rb", " ribu").replace(" jt", " juta"),
  dibi(T, kunci, kata) {
    const th = Object.keys(T || {}).sort(); if (th.length < 2) return null;
    /* nilai 0 pada ukuran pemeringkat = tidak tercatat (BNPB), bukan nol: tidak ikut peringkat */
    const urut = th.filter(t => T[t][kunci] > 0).sort((a, b) => T[b][kunci] - T[a][kunci]), y = urut[0], o = T[y], z = th.at(-1), n = urut.indexOf(z) + 1;
    if (!y) return null;
    const U = {kejadian: [v => `${fmt(v)} kejadian`, "jumlah kejadian"], terdampak: [v => `${this.kata(v)} jiwa terdampak`, "jiwa terdampak"], rumah_rusak: [v => `${fmt(v)} rumah rusak`, "rumah rusak"]},
      bag = ["kejadian", "terdampak", "mengungsi", "rumah_rusak"].filter(k => o[k]).map(k => k === "mengungsi" ? `${this.kata(o[k])} mengungsi` : U[k][0](o[k])).join(", ");
    return {judul: `${Kartu.hl(U[kunci][0](o[kunci]))} pada ${y}, tahun ${kunci === "rumah_rusak" ? kata + " dengan rumah rusak terbanyak" : kata + " terberat"} dalam catatan BNPB ${th[0]} sampai ${z}`,
      baris: [["#b5651d", "Pernah terjadi", `Tahun ${y} tercatat ${bag} akibat ${kata}.`],
        ["#6b7fa3", "Terbaru", `Tahun ${z} tercatat ${fmt(T[z].kejadian)} kejadian ${kata}, ${n ? `peringkat ${fmt(n)} dari ${fmt(urut.length)} tahun menurut ${U[kunci][1]}` : `${U[kunci][1]} tidak tercatat`}.`]]}; },
  /* o.seksi = true: kepala nama seksi (Kartu.seksi): ikon + nama ey di h3, kalimat temuan .hl dan "Sumber:" ke title h3, kaki hanya legenda.
     Tanpa opsi, string mentah tetap dipakai pembungkus laman (kepalaKartu cuaca, kepalaSeksi kekeringan, rapiKartu gunung api) yang memberi nama sendiri. */
  kartu(id, o = {}) { const a = this.A[id]; if (!a) return "";
    const h = c => { const x = c && (c.grafik || c.baris?.length) ? this.bingkai(c) : ""; return o.seksi ? Kartu.seksi(x) : x; }, c = a();
    return c?.then ? c.then(h).catch(e => { console.error(e); return ""; }) : h(c); },
  /* di laman bencana baru (Kartu.SEKSI) kartu yang disisipkan langsung berkepala nama seksi */
  async sisip(el, id) {
    const h = await this.kartu(id, {seksi: Kartu.SEKSI}); if (!h || !el.isConnected || el.querySelector(".ex-cerita")) return;
    const t = document.createElement("div"); t.className = "ex-cerita"; t.innerHTML = h; el.append(t); },

  /* ===== F-28 (PB-54a): kartu bukti model untuk halaman metode dan cerita semua bencana. Tanpa DOM, tanpa handler klik:
     tooltip lewat [data-tip] (inti/tip.js, pasangTip sekali per halaman). Butuh format.js, kartu.js, gerbang.js, cerita.css.
       Cerita.galat(peta, o)             B05 galat: peta = await Gerbang.muat(id); o.keluaran [kunci] (bawaan semua kunci peta),
                                         o.nama {kunci: label}, o.sumber (ke title kepala kolom Status). Tabel model lawan pembanding + batang bertooltip.
                                         Kunci tanpa entri tetap tampil "belum terukur" berpil hipotesis (gagal-tertutup). "" bila tak ada kunci.
       Cerita.pendorong(baris, o)        B05 pendorong: baris [{nama, nilai, tip?}] (mis. rasio laju; negatif ke kiri garis nol), o.satuan, o.sumber,
                                         o.peta + o.keluaran: pil hipotesis di kepala bila keluaran itu belum lolos gerbang. "" bila kosong.
       Cerita.metode(nama, bab, o)       C22: bab {singkatnya, alur, contoh, rincian, batasan} (HTML tepercaya dari kode halaman);
                                         batasan kosong tertulis "Batasan belum ditulis.", bab lain kosong dibuang. o.peta + o.keluaran = pil.
     Kepala kartu = nama seksi berikon (Kartu.ikonSeksi), tanpa kalimat temuan, tanpa kaki "Sumber:" (AGENTS 3.5, 11 Nov 2026).
     C16 cerita tetap Cerita.daftar/kartu/sisip di atas. */
  /* angka skor: tiga angka bermakna di semua besaran, pemisah ribuan id-ID (0,0304 tidak jadi 0; 1234,5 jadi 1.230); kosong tidak pernah 0 */
  _ada: v => typeof v === "number" && isFinite(v),
  _skor: v => typeof v !== "number" || !isFinite(v) ? "belum terukur" : v.toLocaleString("id-ID", {maximumSignificantDigits: 3}),
  /* satuan dibaca dari metrik gerbang, hanya yang memang satuan: "(µg/m³)", "(m)"; Brier, POD, CSI, ln tanpa satuan */
  _satuan: m => String(m || "").match(/\((µg\/m³|mm|m|km|%|jam|hari)\)/)?.[1] || "",
  _std(nama, isi, o = {}) {
    const pil = o.keluaran && typeof Gerbang !== "undefined" ? [].concat(o.keluaran).map(k => Gerbang.pil(o.peta, k)).find(Boolean) || "" : "";
    return `<article class="ex ex-std" data-kp="1"><header class="ex-hd">${pil}<div class="ex-jd"><h3${o.sumber ? ` title="${esc(o.sumber)}"` : ""}>${Kartu.ikonSeksi(nama)}${esc(nama)}</h3></div></header><div class="ex-bd">${isi}</div></article>`; },
  /* pil status di sel tabel: .pl (insight.css, sama dengan baris Cerita), bukan .ex-ey kepala kartu; alasan gagal-tertutup tetap dari Gerbang.pil */
  _status(peta, k, alasan) {
    const h = Gerbang.pil(peta, k);
    return h ? h.replace('class="ex-ey"', 'class="pl" style="--w:var(--warn)"') : `<span class="pl" style="--w:var(--ok)" title="${esc(alasan || "")}">Lolos uji</span>`; },
  galat(peta, o = {}) {
    peta = peta && typeof peta === "object" ? peta : {};
    const K = o.keluaran || Object.keys(peta); if (!K.length) return "";
    const S = this._skor, nm = k => o.nama?.[k] || String(k).replace(/_/g, " ");
    const baris = K.map(k => { const e = peta[k] || {}, u = this._satuan(e.metrik), su = v => S(v) + (u && this._ada(v) ? " " + u : ""),
      sl = Array.isArray(e.selang95) ? `${S(e.selang95[0])} sampai ${S(e.selang95[1])}` : "tidak dihitung",
      /* n di bawah 30: kasus uji sedikit, selang ditulis langsung di samping selisih supaya tidak dibaca sebagai angka pasti */
      kecil = this._ada(e.n) && e.n < 30, ket = [e.metrik, kecil ? `n kecil: ${fmt(e.n)} kasus uji` : ""].filter(Boolean).join(", ");
      return `<tr${ket ? ` title="${esc(ket)}"` : ""}><td>${esc(nm(k))}</td><td>${esc(e.metrik || "belum terukur")}</td><td>${su(e.skor_model)}</td><td title="${esc(e.pembanding || "")}">${su(e.skor_pembanding)}</td><td>${su(e.selisih)}${kecil && Array.isArray(e.selang95) ? ` (selang 95% ${sl})` : ""}</td><td>${sl}</td><td>${e.n == null ? "belum terukur" : fmt(e.n)}${kecil ? ", n kecil" : ""}</td><td>${this._status(peta, k, e.alasan)}</td></tr>`; }).join("");
    /* batang dari garis nol: tiap keluaran diskalakan sendiri (metriknya berbeda), skor negatif ke kiri garis nol; hanya yang kedua skornya terukur */
    const bt = K.filter(k => this._ada(peta[k]?.skor_model) && this._ada(peta[k]?.skor_pembanding)).map(k => { const e = peta[k], u = this._satuan(e.metrik),
      lo = Math.min(0, e.skor_model, e.skor_pembanding), rg = Math.max(0, e.skor_model, e.skor_pembanding) - lo || 1, z = -lo / rg * 100,
      arah = e.arah === "tinggi" ? "makin besar makin baik" : "makin kecil makin baik",
      b = (lb, v, c) => `<i class="${c}" style="--k:${((Math.min(0, v) - lo) / rg * 100).toFixed(1)};--p:${(Math.abs(v) / rg * 100).toFixed(1)}" data-tip="${esc(`<b>${esc(nm(k))}</b><br>${lb}: ${S(v)}${u ? " " + u : ""}${v < 0 ? "<br>Nilai negatif, digambar ke kiri garis nol" : ""}<br>Ukuran: ${esc(e.metrik || "-")}<br>Arah: ${arah}`)}"></i>`;
      return `<div class="cr-bt"><span>${esc(nm(k))}</span><div>${lo < 0 ? `<span class="cr-nol" style="--k:${z.toFixed(1)}"></span>` : ""}${b("Model", e.skor_model, "md")}${b(`Pembanding ${esc(e.pembanding || "")}`, e.skor_pembanding, "pb")}</div></div>`; }).join("");
    const leg = bt ? `<div class="cr-leg"><span><i class="md"></i>Model</span><span><i class="pb"></i>Pembanding sederhana</span></div>` : "";
    return this._std(o.judul || "Galat model", `<table class="ex-tabel"><thead><tr><th>Keluaran</th><th title="Ukuran galat atau keahlian; satuan di dalam kurung">Ukuran</th><th title="Skor model pada data uji">Model</th><th title="Skor pembanding sederhana terkuat (persistensi atau klimatologi)">Pembanding</th><th title="Selisih lebih dari 0 berarti model lebih baik dari pembanding">Selisih</th><th title="Selang kepercayaan 95 persen dari selisih">Selang 95%</th><th title="Jumlah kasus uji; di bawah 30 ditandai n kecil">Kasus uji</th><th title="${esc(["Gerbang tampil public/data/gerbang", o.sumber].filter(Boolean).join(", "))}">Status</th></tr></thead><tbody>${baris}</tbody></table>${bt ? `<div class="cr-bts">${bt}${leg}</div>` : ""}`, {...o, sumber: ""}); },
  pendorong(baris, o = {}) {
    const B = (baris || []).filter(r => r && this._ada(r.nilai)); if (!B.length) return "";
    const V = B.map(r => r.nilai), lo = Math.min(0, ...V), rg = Math.max(0, ...V) - lo || 1, sat = o.satuan ? " " + esc(o.satuan) : "",
      nol = lo < 0 ? `<span class="cr-nol" style="--k:${(-lo / rg * 100).toFixed(1)}"></span>` : "";
    const isi = B.map(r => `<div class="cr-bt"><span>${esc(r.nama)}</span><div>${nol}<i class="md" style="--k:${((Math.min(0, r.nilai) - lo) / rg * 100).toFixed(1)};--p:${(Math.abs(r.nilai) / rg * 100).toFixed(1)}" data-tip="${esc(`<b>${esc(r.nama)}</b><br>${this._skor(r.nilai)}${sat}${r.nilai < 0 ? "<br>Nilai negatif, digambar ke kiri garis nol" : ""}${r.tip ? "<br>" + esc(r.tip) : ""}`)}"></i></div></div>`).join("");
    return this._std(o.judul || "Pendorong", `<div class="cr-bts">${isi}</div>`, o); },
  metode(nama, bab = {}, o = {}) {
    const L = [["singkatnya", "Singkatnya"], ["alur", "Alur"], ["contoh", "Contoh hitung"], ["rincian", "Rincian teknis"], ["batasan", "Batasan"]];
    const rows = L.map(([k, lb]) => [lb, bab[k] || (k === "batasan" ? "Batasan belum ditulis." : "")]).filter(([, x]) => x)
      .map(([lb, x]) => `<div><span class="pl" style="--w:var(--brand2)">${lb}</span><p>${x}</p></div>`).join("");
    return this._std(nama || "Metode", `<div class="cr">${rows}</div>`, o); },
};
