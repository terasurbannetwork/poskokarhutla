"use strict";
/* Kartu video bersama (A34), dipakai tab Berita gempa dan gunung api. Data: ../banjir/data/video_<id>.json (scripts/umum/video.py;
   berkas belum ada atau kosong = kartu tidak muncul). Butuh format.js (esc, escUrl, fmt) dan tabel.js (paginasi). Memuat video.css sendiri.
   Pakai: KartuVideo.pasang(elemenBerita, "gempa") sesudah elemen berita digambar; aman dipanggil ulang tiap render. */
var KartuVideo = {
  PER: 12, cache: {}, o: {},
  async pasang(el, id) {
    if (!document.querySelector("link[data-video]")) { const l = document.createElement("link"); l.rel = "stylesheet"; l.dataset.video = 1; l.href = new URL("video.css", document.querySelector("script[src$='inti/video.js']").src).href; document.head.append(l); }
    try { this.cache[id] ||= await fetch(`../banjir/data/video_${id}.json`, {cache: "no-cache"}).then(r => r.ok ? r.json() : null); } catch { return; }
    const d = this.cache[id]; if (!d?.video?.length || el.querySelector("#brVideo")) return;
    const o = this.o[id] ||= {urut: "tonton", mode: "30", q: "", h: 0}, sg = (k, xs) => `<div class="seg">${xs.map(([v, n]) => `<button type="button" data-vd="${k}" data-v="${v}" aria-pressed="${o[k] === v}">${n}</button>`).join("")}</div>`;
    const a = document.createElement("article"); a.className = "ex"; a.id = "brVideo";
    a.innerHTML = `<header class="ex-hd"><span class="ex-ey">Video YouTube</span><div class="ex-jd"><h3 class="vd-jd"></h3></div></header>
      <div class="ctl vd-ctl">${sg("urut", [["baru", "Terbaru"], ["tonton", "View terbanyak"]])}${sg("mode", [["30", "Sebulan terakhir"], ["90", "3 bulan terakhir"]])}
      <input type="search" class="vd-cari" data-vd="q" placeholder="Cari judul atau kanal" aria-label="Cari video" value="${esc(o.q)}"></div>
      <div class="ex-bd"><div class="vd-grid"></div><div class="vd-pg"></div></div><footer class="ex-ft"><em>Sumber: YouTube Data API per ${esc((d.dibuat || "").slice(0, 10))}; diputar di YouTube</em></footer>`;
    a.onclick = e => { const b = e.target.closest("[data-vd]:not(input)"), p = e.target.closest(".vd-pg [data-h]");
      if (p) { e.stopPropagation(); if (!p.disabled) { o.h = +p.dataset.h; this.isi(a, d, o); a.scrollIntoView({block: "start", behavior: "smooth"}); } return; }   // berhenti di sini: berita.js punya [data-h] sendiri
      if (b) { e.stopPropagation(); o[b.dataset.vd] = b.dataset.v; o.h = 0; a.querySelectorAll(`[data-vd="${b.dataset.vd}"]`).forEach(x => x.setAttribute("aria-pressed", x === b)); this.isi(a, d, o); } };
    a.oninput = e => { if (e.target.dataset.vd === "q") { o.q = e.target.value; o.h = 0; this.isi(a, d, o); } };
    el.append(a); this.isi(a, d, o);
  },
  isi(a, d, o) {
    const q = o.q.toLowerCase(), JN = {resmi: ["Pemerintah", "#1d4e89"], media: ["Media", "#4f8fc4"], kreator: ["Kreator", "#e58a45"]};
    const xs = d.video.filter(v => (!q || (v.judul + " " + v.kanal).toLowerCase().includes(q)) && Date.now() - new Date(v.tgl) <= +o.mode * 864e5);
    o.urut === "tonton" ? xs.sort((x, y) => (y.tonton || 0) - (x.tonton || 0) || y.tgl.localeCompare(x.tgl)) : xs.sort((x, y) => y.tgl.localeCompare(x.tgl));
    const h = o.h = Math.min(o.h, Math.max(0, Math.ceil(xs.length / this.PER) - 1)), dur = s => s == null ? "" : `<u>${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}</u>`;
    a.querySelector(".vd-jd").innerHTML = `${Kartu.hl(fmt(xs.length) + " video")} di YouTube`;
    a.querySelector(".vd-grid").innerHTML = xs.slice(h * this.PER, (h + 1) * this.PER).map(v => { const j = JN[v.jenis || "kreator"];
      return `<a class="vd-k" href="${escUrl(v.url)}" target="_blank" rel="noopener"><span class="vd-th"><img src="${escUrl(v.gambar)}" alt="" loading="lazy" referrerpolicy="no-referrer">${dur(v.durasi)}<i aria-hidden="true">▶</i></span>
        <span class="vd-lb"><em class="br-lb" style="--w:${j[1]}">${j[0]}</em></span><b>${esc(v.judul)}</b><small>${esc(v.kanal)}, ${new Date(v.tgl).toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"})}${v.tonton != null ? `, ${fmt(v.tonton)} kali ditonton` : ""}</small></a>`; }).join("") || `<p class="kosong">Tidak ada video yang cocok.</p>`;
    a.querySelector(".vd-pg").innerHTML = paginasi(h, xs.length, this.PER, "video");
  },
};
