"use strict";
/* Mesin kartu bersama (public/inti): kartu "Insight" (pil kategori + judul beraksen + kontrol segmen | grafik | legenda + sumber),
   label pil SVG, pemilih provinsi tunggal/ganda. Dipotong dari index.html tanpa ubah perilaku.
   Ketergantungan halaman diberikan lewat parameter: st (state kontrol), daftar (kode wilayah), nama (kode -> nama).
   Halaman memasang penghubung tipis (mis. Insight.ex = (...a) => Kartu.ex(...a)). Butuh format.js (esc) lebih dulu. */
const Kartu = {
  _leg: null,
  _bukaMulti: null,
  ex(judul, sub, unit, isi, catatan, ctl = "") {
    /* sub & unit sengaja tidak dicetak: pemilik minta kartu cukup judul + grafik (13 Okt 2026) */
    /* catatan "...Sumber: X" dipecah: legenda (warna dari daftar leg) + sumber bercetak miring */
    const [ket, sumber] = String(catatan).split(/\s*Sumber:\s*/), leg = this._leg; this._leg = null;
    /* pemilih provinsi (select di awal ctl) pindah ke kanan judul, sebaris */
    let kanan = ""; if (ctl.startsWith("<select")) { const i = ctl.indexOf("</select>") + 9; kanan = ctl.slice(0, i); ctl = ctl.slice(i); }
    else if (ctl.startsWith('<details class="pmulti"')) { const i = ctl.indexOf("</details>") + 10; kanan = ctl.slice(0, i); ctl = ctl.slice(i); }
    return `<article class="ex"><header class="ex-hd"><span class="ex-ey"></span><div class="ex-jd"><h3>${judul}</h3>${kanan}</div>${ctl ? `<div class="ctl">${ctl}</div>` : ""}</header>
      <div class="ex-bd">${isi}</div><footer class="ex-ft">${leg ? `<span class="ex-leg">${leg.map(([w, n]) => `<span><i style="background:${w}"></i>${n}</span>`).join("")}</span>` : ket ? `<span>${ket}</span>` : ""}${sumber ? `<em>Sumber: ${sumber}</em>` : ""}</footer></article>`; },
  leg(daftar) { this._leg = daftar; return ""; },
  /* kartu Insight siap pakai untuk bencana baru: pil kategori `ey` di kepala, legenda `leg` = [[warna, nama]], "Sumber: ..." di kaki.
     Ikon bagikan TIDAK dibuat di sini: Bagikan.tombolEx (bagikan.js) memasangnya di tiap article.ex (tanpa subjudul/unit, A1). */
  /* o.seksi = true: kepala nama seksi langsung di string (Kartu.seksi), tanpa menunggu perapian DOM */
  kartu(ey, judul, isi, sumber, ctl = "", leg = null, o = {}) {
    if (leg) this.leg(leg);
    const h = this.ex(judul, "", "", isi, "Sumber: " + sumber, ctl).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${ey}</span>`);
    return o.seksi ? this.seksi(h) : h; },
  /* label pil SVG: lebar ditaksir dari jumlah huruf (SVG tidak bisa auto-lebar tanpa mengukur); ik = isi <g> ikon 12 px di kiri */
  pil(x, y, t, bg, fg, fs = 12, ik = "") { const w = t.length * fs * .6 + 16 + (ik ? 16 : 0), tx = x + (ik ? 16 : 0) + (w - (ik ? 16 : 0)) / 2;
    return [`<rect x="${x}" y="${y}" width="${w}" height="20" rx="10" fill="${bg}"/>${ik ? `<g transform="translate(${x + 8},${y + 4})" fill="none" stroke="${fg}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ik}</g>` : ""}<text x="${tx}" y="${y + 14}" text-anchor="middle" font-size="${fs}" font-weight="700" style="fill:${fg}">${t}</text>`, w]; },
  hl: t => `<span class="hl">${t}</span>`,
  /* batang horizontal berlabel pil: rows [{n, v, txt?, tip?}], w = warna; lebar mengikuti #dampak */
  hbar(rows, w) {
    const Wd = Math.min(940, Math.max(330, ($("#dampak")?.clientWidth || 680) - 44 - (($("#dampak")?.clientWidth || 0) >= 1100 ? 224 : 0))), L = Wd < 500 ? 100 : 160, rh = 26, R = 80, m = Math.max(1, ...rows.map(r => r.v)), X = v => L + v / m * (Wd - L - R);
    return `<svg class="dk-svg" viewBox="0 0 ${Wd} ${rows.length * rh}" role="img">${rows.map((r, i) => { const y = i * rh, t = r.txt ?? fmt(r.v);
      return `<g><text x="${L - 8}" y="${y + rh / 2 + 4}" text-anchor="end" font-size="11.5" font-weight="600">${esc(r.n)}</text><rect class="gx" style="--i:${i}" x="${L}" y="${y + 5}" width="${Math.max(1.5, X(r.v) - L)}" height="${rh - 10}" rx="3" fill="${w}" data-tip="${r.tip || ""}"/>${Kartu.pil(X(r.v) + 5, y + 3, t, w, "#fff", 11)[0]}</g>`; }).join("")}</svg>`; },
  seg(key, opsi, st = {}) { return `<div class="seg" role="group">${opsi.map(([v, n]) => `<button data-set="${key}" data-v="${v}" aria-pressed="${String(st[key]) === String(v)}">${n}</button>`).join("")}</div>`; },
  /* klik di luar menu provinsi = tutup */
  _pmTutup: document.addEventListener("click", e => document.querySelectorAll(".pmulti[open]").forEach(d => { if (!d.contains(e.target)) d.open = false; })),
  /* pilih beberapa provinsi untuk dibandingkan (pemilik, 14 Okt 2026): st[key] = kode dipisah koma, "" = semua */
  provDipilih(key, st = {}) { return String(st[key] || "").split(",").filter(Boolean); },
  selProvMulti(key, daftar, nama, st = {}, semua = "Semua provinsi") { const P = this.provDipilih(key, st), lb = !P.length ? semua : P.length === 1 ? nama(P[0]) : P.length + " provinsi";
    const buka = this._bukaMulti === key; this._bukaMulti = null;
    return `<details class="pmulti"${buka ? " open" : ""}><summary>${esc(lb)}</summary><div class="pm-menu"><label><input type="checkbox" data-multi="${key}" value="" ${P.length ? "" : "checked"}><span>Semua provinsi (${daftar.length})</span></label>${daftar.map(k => `<label><input type="checkbox" data-multi="${key}" value="${k}" ${P.includes(k) ? "checked" : ""}><span>${esc(nama(k))}</span></label>`).join("")}</div></details>`; },
  selProv(key, semua = "Semua provinsi", daftar, nama, st = {}) { return `<select data-set="${key}" aria-label="Provinsi"><option value="">${semua}</option>${daftar.map(k => `<option value="${k}" ${k === st[key] ? "selected" : ""}>${esc(nama(k))}</option>`).join("")}</select>`; },

  /* ===== mode kepala NAMA SEKSI (AGENTS.md 3.5, pembaruan 11 Nov 2026) =====
     Kepala kartu = ikon + nama seksi (isi pil .ex-ey) di h3; kalimat temuan lama, keterangan kaki, dan "Sumber: ..." pindah ke title h3;
     kaki hanya legenda; kaki kosong dibuang. Menyala HANYA di laman bencana baru (SEKSI_LAMAN); karhutla (/) dan /banjir tetap rupa lama.
     Laman yang menyala mendapat <html data-kartu="seksi">, tempat CSS opt-in di kartu.css, tabel.css, insight.css menggantung.
     Pemakaian:
       Kartu.seksi(html)               string kartu .ex -> string kartu berkepala nama seksi (idempoten, data-kp); dipakai Cerita.sisip dan bisa
                                       menggantikan kepalaKartu()/kepalaSeksi() milik laman.
       Kartu.ikonSeksi("Peluang")      <svg> ikon nama seksi (registri Kartu.IKON menurut kata kunci).
     Kartu yang lolos dari pembungkus laman (kepala masih kalimat .hl atau kaki "Sumber:") dirapikan di DOM sesudah pembungkus laman
     (public/gempa/kepala_kartu.js, kepalaKartu() cuaca dan udara) selesai, jadi pembungkus itu tetap jalan dan tidak digandakan. */
  SEKSI_LAMAN: ["gempa", "kekeringan", "gunungapi", "cuaca", "udara", "pesisir", "longsor"],
  SEKSI: false,
  /* [pola nama seksi, isi <svg> 24 px]; yang pertama cocok dipakai, baris terakhir = bawaan */
  IKON: [
    [/peluang|ambang|ansambel/i, '<path d="M3 20h18M6 20v-6M11 20V8M16 20v-9"/>'],
    [/cerita|riwayat|berita|kajian/i, '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4"/>'],
    [/provinsi|peta|wilayah|kabupaten|kota/i, '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>'],
    [/penduduk|jiwa|orang|warga/i, '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'],
    [/bulan|tahun|tren|tanggal|kalender/i, '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],
    [/daftar|kejadian|katalog/i, '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'],
    [/status|peringatan|bahaya|rawan/i, '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>'],
    [/./, '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>'],
  ],
  ikonSeksi(nama) {
    nama = String(nama || "").trim();
    /* ikon khusus gempa (public/gempa/kepala_kartu.js) didahulukan supaya kartu gempa tidak berganti ikon */
    if (typeof KepalaGempa !== "undefined" && KepalaGempa?.svg) return KepalaGempa.svg(nama);
    const p = (this.IKON.find(([re]) => re.test(nama)) || this.IKON[this.IKON.length - 1])[1];
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`; },
  _teks: t => String(t || "").replace(/\s+/g, " ").trim(),
  /* rapikan satu <article class="ex"> (elemen); false bila tak ada nama seksi (pil .ex-ey kosong = kartu masih memuat) */
  _rapiSeksi(ex, nama) {
    if (ex.dataset.kp) return true;
    const hd = ex.querySelector(":scope > .ex-hd"), ey = hd?.querySelector(".ex-ey"), h3 = hd?.querySelector("h3"); if (!h3) return false;
    const isi = nama ? esc(nama) : ey?.innerHTML.trim(), polos = nama || this._teks(ey?.textContent); if (!isi || !polos) return false;
    ex.dataset.kp = 1;
    const ft = ex.querySelector(":scope > .ex-ft"), em = ft ? [...ft.children].filter(e => !e.classList.contains("ex-leg")) : [];
    const lama = this._teks(h3.textContent), ket = [lama && lama !== polos ? lama.replace(/[.\s]*$/, ".") : "", ...em.map(e => this._teks(e.textContent))].filter(Boolean).join(" ");
    hd.querySelector(":scope > .ex-ik")?.remove();   /* ubin ikon gaya B (Peluang) diganti ikon sebaris di h3 */
    h3.innerHTML = (/<svg/i.test(isi) ? "" : this.ikonSeksi(polos)) + isi; if (ket) h3.title = ket;
    if (ey) { const pl = ey.closest(".ex-pl"); pl ? ey.textContent = "" : ey.remove(); }   /* .ex-pl tetap (pil tingkat, pil model); ey kosong disembunyikan CSS */
    em.forEach(e => e.remove()); if (ft && !ft.children.length) ft.remove();
    ex.classList.add("ex-std"); return true; },
  seksi(h, nama) {
    if (!h || typeof h !== "string" || !h.includes("<article")) return h;
    const t = document.createElement("template"); t.innerHTML = h; const a = t.content.querySelector("article.ex"); if (!a || a.dataset.kp) return h;
    return this._rapiSeksi(a, nama) ? t.innerHTML : h; },
  /* kartu yang belum dirapikan pembungkus laman: pil nama seksi terisi DAN kepala masih kalimat .hl atau kaki "Sumber:".
     Kartu laman yang sengaja memakai pil kategori + nama (pesisir, gunung api) tidak memenuhi syarat ini, jadi tidak disentuh. */
  _lolos(ex) {
    if (ex.dataset.kp) return false; const hd = ex.querySelector(":scope > .ex-hd"), ey = hd?.querySelector(".ex-ey");
    if (!ey || !this._teks(ey.textContent)) return false;
    return !!hd.querySelector("h3 .hl") || [...ex.querySelectorAll(":scope > .ex-ft > em")].some(e => /^Sumber:/.test(this._teks(e.textContent))); },
  /* data-ket = title h3 yang ditetapkan mesin (Peluang); dikembalikan bila pembungkus laman menimpanya dengan nama pendek */
  _jagaKet(ex) { const k = ex.dataset.ket, h3 = k && ex.querySelector(":scope > .ex-hd h3"); if (h3 && h3.title !== k) h3.title = k; },
  _sapuSeksi(root) { const L = root.matches?.("article.ex") ? [root] : [...(root.querySelectorAll?.("article.ex") || [])]; L.forEach(ex => { if (this._lolos(ex)) this._rapiSeksi(ex); this._jagaKet(ex); }); },
  _pasangSeksi() {
    /* aman di uji vm (tanpa location/body): mode mati */
    if (typeof document === "undefined" || typeof location === "undefined" || !document.documentElement?.dataset) return;
    const p = String(location.pathname || "").split("/").filter(Boolean)[0] || "";
    this.SEKSI = document.documentElement.dataset.kartu === "seksi" || this.SEKSI_LAMAN.includes(p);
    if (!this.SEKSI || typeof MutationObserver === "undefined") return; document.documentElement.dataset.kartu = "seksi";
    const mulai = () => { this._sapuSeksi(document.body);
      /* ditunda satu microtask: pengamat laman (gempa) yang memakai ikon dan nama sendiri bekerja lebih dulu; tetap sebelum layar dilukis */
      new MutationObserver(M => queueMicrotask(() => { for (const m of M) { m.addedNodes.forEach(n => n.nodeType === 1 && this._sapuSeksi(n));
        const ex = m.target.closest?.("article.ex"); if (ex && this._lolos(ex)) this._rapiSeksi(ex); } }))
        .observe(document.body, {childList: true, subtree: true}); };
    document.body ? mulai() : document.addEventListener("DOMContentLoaded", mulai); },
};
Kartu._pasangSeksi();
