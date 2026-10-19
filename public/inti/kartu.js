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
  kartu(ey, judul, isi, sumber, ctl = "", leg = null) {
    if (leg) this.leg(leg);
    return this.ex(judul, "", "", isi, "Sumber: " + sumber, ctl).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${ey}</span>`); },
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
};
