/* ================================================================ bagikan & ekspor
   Gambar siap unggah (IG feed 4:5, story/TikTok 9:16, kotak 1:1), tautan, dan berkas data (xlsx, pdf, pptx).
   Satu mesin untuk semua halaman bencana: Bagikan.init("karhutla") | Bagikan.init("banjir") | Bagikan.init(id) untuk bencana yang mendaftarkan
   Bagikan.tema[id] = {siap, tanggal, acuan, data, teksWil, keterangan?, konteks?, tautan?, geo?, titik?} di berkasnya sendiri (public/<id>/bagikan.js).
   Nama, sumber, dan tagar dibaca dari medan `bagikan` di public/bencana.json (registry).
   Memakai state & fungsi halaman (S, peta, fmt, esc, jamWIB, namaProv, toast, ...). Pustaka berat dimuat saat diminta. */
"use strict";
const SITUS_W = document.documentElement.dataset.situs === "w";   /* *.workers.dev: merek Centurisk97, tanpa akun Teras Urban (pemilik, 17 Okt 2026) */
const Bagikan = {
  hal: "karhutla", dasar: "", tema: {}, reg: null, tab: "gambar", tpl: "ringkas", uk: "feed", prov: "", exId: "", pakaiPeta: true,
  UK: {feed: [1080, 1350, "Feed 4:5"], story: [1080, 1920, "Story · TikTok 9:16"], kotak: [1080, 1080, "Kotak 1:1"]},
  TPL: [["kompleks", "Cluster ini"], ["ringkas", "Ringkasan hari ini"], ["provinsi", "Provinsi"], ["ex", "Grafik Insight"]],
  C: {navy: "#0b2545", navy2: "#1d4e89", kertas: "#f3f6fa", tinta: "#0b2545", tinta2: "#5b6b82", garis: "#dde4ee", jalur: "#edf1f6", hl: "#ffb37a"},
  LV: ["#5a9e74", "#e3b94e", "#e58a45", "#c9503a"],
  /* SheetJS komunitas tidak bisa menulis gaya sel (header tebal); xlsx-js-style = SheetJS + gaya, API sama */
  LIB: {
    xlsx: ["https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js", () => window.XLSX],
    pdf: ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", () => window.jspdf],
    tabel: ["https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js", () => window.jspdf?.jsPDF?.API?.autoTable],
    pptx: ["https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js", () => window.PptxGenJS],
    dom: ["https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js", () => window.htmlToImage],
  },
  /* adaptor bencana yang terdaftar (karhutla dan banjir tinggal di mesin ini, jadi undefined) */
  get T() { return this.tema[this.hal]; },
  siap() { return this.T ? !!this.T.siap() : typeof S !== "undefined" && !!S.meta; },
  acuan() { return this.T ? this.T.acuan() : S.acuan || S.meta.dibuat; },
  get K() {
    let k = this._K();
    /* *.workers.dev bermerek Centurisk97 (pemilik, 17 Okt 2026) */
    if (SITUS_W) k = {...k, nama: k.nama.replace("Pantau Bencana", "Centurisk97"), pendek: "Centurisk97", akhir: "#Centurisk97"};
    return this.en() ? {...k, nama: k.nama.replace("Pantau Bencana", "Disaster Monitoring"), pendek: "Disaster Monitoring", akhir: "#DisasterMonitoring"} : k;
  },
  /* tema dari registry (medan `bagikan`); literal di bawah hanya cadangan sebelum bencana.json terbaca */
  /* nama pendek bencana untuk label ekspor ("Insight karhutla", "Tren banjir", ...): id halaman, kecuali yang namanya lebih dari satu kata */
  namaBencana() { return {cuaca: "cuaca ekstrem", udara: "kualitas udara", gunungapi: "gunung api"}[this.hal] || this.hal; },
  _K() {
    const r = this.reg?.[this.hal]?.bagikan, a = this.hal === "banjir"
      ? {nama: "Pantau Bencana · Banjir, Longsor & Rob", pendek: "Pantau Bencana", tema: "banjir, longsor & rob", sumber: "Sumber: Open-Meteo, Copernicus GloFAS, BMKG Maritim, BNPB",
        tagar: ["#banjir", "#longsor", "#rob", "#cuacaekstrem", "#siagabencana"], akhir: "#PantauBencana"}
      : this.T ? {nama: "Pantau Bencana", pendek: "Pantau Bencana", sumber: "", tagar: [], akhir: "#PantauBencana"}
      : {nama: "Pantau Bencana · Karhutla", pendek: "Pantau Bencana", tema: "kebakaran hutan dan lahan", sumber: "Sumber: NASA FIRMS, BMKG/Open-Meteo, BNPB",
        tagar: ["#karhutla", "#kabutasap", "#kebakaranhutan", "#titikpanas"], akhir: "#PantauBencana"};
    return r ? {...a, nama: r.nama, sumber: "Sumber: " + r.sumber, tagar: r.tagar} : a;
  },

  /* ---------------------------------------------------------------- pasang */
  init(halaman) {
    this.hal = halaman === "banjir" || this.tema[halaman] ? halaman : "karhutla";
    fetch(this.dasar + "bencana.json").then(r => r.ok ? r.json() : null).then(j => { if (j) this.reg = Object.fromEntries(j.bencana.map(b => [b.id, b])); }).catch(() => {});
    const st = document.querySelector("header.top .stat");
    if (!st || document.getElementById("bgBuka")) return;
    if (!document.querySelector("link[data-bagikan]")) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = this.dasar + "bagikan.css"; l.dataset.bagikan = ""; document.head.appendChild(l); }
    if (!window.Bagi && !document.querySelector("script[data-bagi]")) { const s = document.createElement("script"); s.src = this.dasar + "bagi.js"; s.dataset.bagi = ""; document.head.appendChild(s); }
    const b = document.createElement("button"), lbl = this.en() ? "Share" : "Bagikan";
    b.className = "iconbtn bg-hdr"; b.id = "bgBuka"; b.type = "button"; b.title = lbl;
    b.setAttribute("aria-haspopup", "dialog");
    b.innerHTML = `${this.IKON}<span>${lbl}</span>`;
    st.insertBefore(b, document.getElementById("tema"));
    b.onclick = () => this.cepat();
    this.pasangCepat();
    /* tombol bagikan di tiap grafik Insight (tab dirender ulang sendiri, jadi diamati) */
    const ins = document.getElementById("insight");
    if (ins) { new MutationObserver(() => this.tombolEx()).observe(ins, {childList: true, subtree: true}); this.tombolEx(); }
    /* Tren & Dampak: tombol yang sama di tiap kartu grafik/tabel */
    ["tren", "dampak", "berita", "insightKompleks"].forEach(id => { const el = document.getElementById(id); if (el) new MutationObserver(() => this.tombolEx()).observe(el, {childList: true, subtree: true}); });
    document.addEventListener("click", e => { const t = e.target.closest?.(".bg-ex"); if (!t) return; e.stopPropagation();
      const box = t.closest("[data-ex]"), art = t.closest("article.ex");
      if (!t.closest("#insight") || t.closest(".ct-bab, [data-ex=citra]") || !art?.querySelector("svg[viewBox]")) { this._exLuar = this.ambilLuar(t); this.halEx = 0; return this.buka("ex", "luar"); }
      this.buka("ex", box ? box.dataset.ex : "b" + [...document.querySelectorAll("#insight article.ex")].indexOf(art)); }, true);
    /* tautan dalam: ?wil=62|Seruyan membuka wilayah itu setelah peta siap */
    const w = this.T ? null : new URLSearchParams(location.search).get("wil");
    if (w && /^\d{2}(\|[^|<>"]{1,80}){0,2}$/.test(w)) this.tungguWil(w);
  },
  tombolEx() {
    document.querySelectorAll("#insight article.ex, #insight section.ct-bab, #insightKompleks article.ex, #tren article.ex, #dampak article.ex, #berita article.ex, #berita section.pm-p, #tren .head").forEach(a => {
      const isi = a.classList.contains("head") ? this.isiHead(a) : [a];
      /* hanya kartu yang punya grafik lebar (viewBox ≥ 300) atau tabel; ikon kecil tidak dihitung */
      /* semua kartu berjudul bisa dibagikan sebagai gambar; yang tanpa grafik/tabel ditangkap dari tampilannya (pemilik, 15 Okt 2026) */
      const ada = !!a.querySelector("h2, h3, h4") || isi.some(x => x.querySelector?.("table, .ct-bab .maplibregl-canvas, .ct-galeri2 img") || (a.matches(".ct-bab") && x.querySelector?.(".maplibregl-canvas")) || [...(x.querySelectorAll?.("svg[viewBox]") || [])].some(v => (v.viewBox.baseVal?.width || 0) >= 300));
      /* pemilih provinsi bisa muncul belakangan (select -> PilihCantik): pindahkan tombol yang sudah ada ke sebelahnya */
      /* baris pemilih: di samping judul (.ex-jd) atau di baris kontrol kepala kartu */
      /* pemilih provinsi naik ke baris judul (kanan atas), lalu tombol bagikan di sebelahnya (pemilik, 15 Okt 2026) */
      /* pemilih provinsi + tombol bagikan: satu wadah di pojok kanan atas kartu, sebaris label kategori (pemilik, 15 Okt 2026) */
      const hd = a.querySelector(":scope > header"), pemilih = hd?.querySelector(".pc, .pmulti, select"), lama = a.querySelector(":scope > .bg-ex, :scope > header .ex-jd > .bg-ex");
      let aksi = hd?.querySelector(":scope > .ex-aksi"), jdK = aksi;
      if (pemilih && hd) { if (!aksi) { aksi = jdK = document.createElement("div"); aksi.className = "ex-aksi"; hd.prepend(aksi); }
        if (pemilih.parentElement !== aksi) aksi.prepend(pemilih); if (lama && lama.parentElement !== aksi) { aksi.append(lama); lama.classList.add("bg-pk"); } }
      if (a.querySelector(":scope > .bg-ex, :scope > header > .bg-ex, :scope > .pm-h > .bg-ex, :scope > header .bg-pk") || !ada) return;
      const b = document.createElement("button"); b.type = "button"; b.className = "bg-ex"; b.setAttribute("aria-label", "Bagikan grafik ini"); b.title = "Bagikan";
      b.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>`;
      b.setAttribute("aria-label", "Bagikan grafik ini sebagai gambar"); /* kartu berpemilih provinsi: tombol sebaris di kanan pemilih (pemilik, 15 Okt 2026) */
      a.classList.contains("head") ? a.append(b) : a.matches(".pm-p") ? a.querySelector(".pm-h")?.append(b) : pemilih && jdK ? (jdK.append(b), b.classList.add("bg-pk")) : a.prepend(b); });   /* panel Berita: tombol di kepala panel */   /* panel Berita: tombol di kepala panel */
  },
  /* bagian Tren berbentuk judul .head + elemen sesudahnya sampai .head berikutnya */
  isiHead(h) { const out = []; for (let x = h.nextElementSibling; x && !x.classList.contains("head"); x = x.nextElementSibling) out.push(x); return out; },
  ambilLuar(t) {
    const art = t.closest("section.pm-p, article.ex, section.ct-bab"), head = art ? null : t.closest(".head"), jd = art ? art.querySelector("h3, h4") : head.querySelector("h2");
    const isi = art ? [art] : this.isiHead(head), cari = q => isi.map(x => x.matches?.(q) ? x : x.querySelector?.(q)).find(Boolean);
    /* sampai dua grafik + tabel kartu itu, ditumpuk, supaya gambar tidak kosong di atas-bawah */
    const svgs = isi.flatMap(x => [...(x.querySelectorAll?.("svg[viewBox]") || [])]).filter(v => (v.viewBox.baseVal?.width || 0) >= 300).slice(0, 2), svg = svgs[0];
    const tabel0 = cari("table") || this.tabelDariTip(svgs) || (art ? this.tabelVideo(art) : null);
    return {judul: jd.textContent.replace(/\s+/g, " ").trim(), judulSeg: [...jd.childNodes].map(x => ({t: x.textContent, hl: x.nodeType === 1 && x.classList.contains("hl")})),
      svg, svgs, tabel: tabel0, peta: svgs.length ? null : cari(".maplibregl-canvas"), galeri: cari(".ct-galeri2"), dom: !svgs.length && !tabel0 && !cari(".ct-galeri2") && !cari(".maplibregl-canvas") && art ? this.blokDom(art) : null, fn: art?.querySelector(".fn")?.textContent.trim() || "", label: (t.closest("#insight") ? "Insight " : t.closest("#dampak") ? "Dampak " : t.closest("#berita") ? "Pantauan berita" : "Tren ") + (t.closest("#berita") ? "" : this.namaBencana())};
  },
  /* grafik tanpa tabel: susun tabel dari tooltip batang ("<b>Nama</b><br>Label: nilai<br>…"), satu baris per nama */
  sorotDari(svgs) { const t = this.tabelDariTip(svgs); if (!t) return [];
    /* kolom terpilih: rasio/persen diutamakan, lalu kolom yang angkanya paling bervariasi; kolom bernilai nol semua tidak dipakai (pemilik, 15 Okt 2026) */
    const rs = [...t.querySelectorAll("tbody tr")], nk = rs[0]?.children.length || 1, en = this.en();
    const angka = x => { const v = Number(String(x || "").replace(/[^\d.,-]/g, "").replace(en ? /,/g : /\./g, "").replace(",", ".")); return Number.isFinite(v) ? v : 0; };
    const nilai = j => rs.map(r => angka(r.children[j]?.textContent)), rasio = j => rs.filter(r => /[×x%]\s*$/.test(r.children[j]?.textContent || "")).length;
    /* kolom pertama = ukuran utama grafik (yang dipakai judul); rasio/persen didahulukan bila ada. Kolom nol semua dilewati. */
    const skor = j => { const mx = Math.max(...nilai(j)); return mx <= 0 ? -1 : rasio(j) * 1e3 + (j === 1 ? 10 : 0) - j * .01; };
    let j = 1; for (let k = 2; k < nk; k++) if (skor(k) > skor(j)) j = k;
    if (skor(j) < 0) return [];
    const kep = t.querySelectorAll("thead th")[j]?.textContent || "";
    /* nama ringkas: "Selasa, 13 Oktober 2026" -> "13 Okt"; tanda bulatan di depan keterangan dibuang */
    const ringkas = t => String(t).replace(/^[A-Za-z]+,\s*(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+\d{4}$/, "$1 $2").replace(/^[•●·\s]+/, "").trim();
    const top = rs.map(r => ({n: ringkas(r.children[0].textContent) + (kep && !rasio(j) ? " · " + ringkas(kep) : ""), v: r.children[j]?.textContent || "", a: angka(r.children[j]?.textContent)}))
      .filter(q => q.v && q.v !== "–" && q.a > 0).sort((p, q) => q.a - p.a).slice(0, 3);
    return top.length > 1 ? top : []; },
  /* daftar video (a.vd-k): 5 video yang sedang tampil jadi tabel Video | Kanal · tanggal | Tayangan */
  tabelVideo(art) {
    const ks = [...art.querySelectorAll("a.vd-k")].slice(0, 5); if (!ks.length) return null;
    const pt = (t, n) => t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t, t = document.createElement("table");
    t.innerHTML = `<thead><tr><th>Video</th><th>Kanal · tanggal</th><th>Tayangan</th></tr></thead><tbody>${ks.map(k => {
      const tt = k.querySelector(".vd-tt")?.textContent.replace(/\s*tayangan\s*$/, "").trim() || "–", kt = (k.querySelector("small")?.textContent || "").replace(/\s*·\s*[\d.,]+\s*kali ditonton\s*$/, "").trim();
      return `<tr><td>${esc(pt(k.querySelector("b")?.textContent.trim() || "", 40))}</td><td>${esc(pt(kt, 26))}</td><td>${esc(tt)}</td></tr>`; }).join("")}</tbody>`;
    return t;
  },
  tabelDariTip(svgs) {
    const baris = new Map(), kol = new Set();
    for (const v of svgs || []) for (const el of v.querySelectorAll("[data-tip]")) {
      const d = document.createElement("div"); d.innerHTML = el.getAttribute("data-tip"); const nm = d.querySelector("b")?.textContent.trim(); if (!nm) continue;
      const r = baris.get(nm) || {}; d.innerHTML.split(/<br\s*\/?>/i).slice(1).forEach(p => { const tx = document.createElement("div"); tx.innerHTML = p; const t = tx.textContent.trim(), i = t.indexOf(":"); if (i > 0) { const k = t.slice(0, i).trim(); kol.add(k); r[k] ??= t.slice(i + 1).trim(); } });
      baris.set(nm, r); }
    if (baris.size < 2 || !kol.size) return null;
    const K = [...kol].slice(0, 4), t = document.createElement("table");
    t.innerHTML = `<thead><tr><th></th>${K.map(k => `<th>${esc(k)}</th>`).join("")}</tr></thead><tbody>${[...baris].map(([n, r]) => `<tr><td>${esc(n)}</td>${K.map(k => `<td>${esc(r[k] ?? "–")}</td>`).join("")}</tr>`).join("")}</tbody>`;
    return t;
  },
  /* tabel -> kanvas: hanya 10 baris teratas, sisanya di situs */
  /* tabel -> kanvas selebar isi gambar (±1:1, jadi huruf terbaca). Kolom: data-bagi-kol="0,3,4" di <table> bila ada,
     selain itu 6 kolom pertama. Angka rata kanan, lebar kolom mengikuti isi, tanpa kepala navy (pemilik, 15 Okt 2026) */
  tabelKanvas(tb, n = 10, mulai = 0) {
    const semua = [...tb.querySelectorAll("thead th")].map(x => x.textContent.replace(/[↑↓]/g, "").trim()), pilih = (tb.dataset.bagiKol || "").split(",").filter(Boolean).map(Number);
    const ki = pilih.length ? pilih : semua.map((_, i) => i).slice(0, 6), kol = ki.map(i => semua[i] || "");
    const rows = [...tb.querySelectorAll("tbody tr")].slice(mulai, mulai + n).map(r => ki.map(i => r.children[i]?.textContent.replace(/\s+/g, " ").trim() || ""));
    const W = 940, rh = 66, hh = 54, H = hh + rh * rows.length, cv = this.kanvas(W, H), x = cv.getContext("2d"), pd = 18;
    const angka = ki.map((_, j) => rows.filter(r => /^[–-]$|^[\d.,]+\s*(%|ha|hari|×|x)?$/.test(r[j])).length >= rows.length * .7);
    /* tanpa elipsis: lebar kolom = isi terpanjang; bila total melebihi kanvas, huruf yang mengecil, bukan teksnya dipotong (pemilik, 15 Okt 2026) */
    const ukur = fs => kol.map((k, j) => { this.f(x, 800, Math.round(fs * .72)); let m = x.measureText(k.toUpperCase()).width;
      for (const r of rows) { this.f(x, j ? 500 : 700, fs); m = Math.max(m, x.measureText(r[j]).width); } return m + 2 * pd; });
    let fs = 25, lebar = ukur(fs); const tot = lebar.reduce((a, b) => a + b, 0); if (tot > W) { fs = Math.max(14, Math.floor(fs * W / tot)); lebar = ukur(fs); }
    const k = W / lebar.reduce((a, b) => a + b, 0), cw = lebar.map(v => v * k), cx = cw.map((_, j) => cw.slice(0, j).reduce((a, b) => a + b, 0));
    x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); x.textBaseline = "middle";
    kol.forEach((t, j) => { this.f(x, 800, Math.round(fs * .72)); x.fillStyle = this.C.tinta2; x.textAlign = angka[j] ? "right" : "left"; x.fillText(t.toUpperCase(), angka[j] ? cx[j] + cw[j] - pd : cx[j] + pd, hh / 2); });
    x.fillStyle = this.C.navy2; x.fillRect(0, hh - 2, W, 2);
    rows.forEach((r, i) => { const y = hh + rh * i; if (i) { x.fillStyle = "#e6ebf2"; x.fillRect(0, y, W, 1.5); }
      r.forEach((c, j) => { this.f(x, j ? 500 : 700, fs); x.fillStyle = j ? (this.C.tinta || "#1c2b40") : this.C.navy2; x.textAlign = angka[j] ? "right" : "left";
        x.fillText(c, angka[j] ? cx[j] + cw[j] - pd : cx[j] + pd, y + rh / 2); }); });
    x.textAlign = "left"; x.textBaseline = "alphabetic"; return cv;
  },
  tungguWil(w) {
    let n = 0; const t = setInterval(() => {
      if (++n > 120) return clearInterval(t);
      if (typeof S === "undefined" || !S.meta || typeof peta === "undefined" || !peta || !peta.isStyleLoaded()) return;
      clearInterval(t); if (S.meta.provinsi?.[w.split("|")[0]]) try { turun(w); } catch (e) { console.warn(e); } }, 300);
  },

  /* ---------------------------------------------------------------- dialog */
  dialog() {
    let d = document.getElementById("bgDlg"); if (d) return d;
    d = document.createElement("dialog"); d.className = "dlg bg"; d.id = "bgDlg"; d.setAttribute("aria-labelledby", "bgJudul");
    const tab = (id, n) => `<button role="tab" type="button" id="bgT-${id}" aria-controls="bgP-${id}" aria-selected="false" tabindex="-1" data-tab="${id}">${n}</button>`;
    d.innerHTML = `<div class="dh"><div><h3 id="bgJudul">Bagikan</h3></div><button type="button" aria-label="Tutup" data-tutup>×</button></div>
      <div class="db">
        <div class="seg penuh bg-tabs" role="tablist" aria-label="Pilihan">${tab("gambar", "Gambar")}${tab("tautan", "Tautan")}</div>
        <div role="tabpanel" id="bgP-gambar" aria-labelledby="bgT-gambar" class="bg-panel">
          <div class="lbl">Templat</div>
          <div class="bg-tpl" role="group" aria-label="Templat">${this.TPL.map(([k, n]) => `<button type="button" data-tpl="${k}" aria-pressed="false"><span class="bg-th"><canvas width="90" height="112" aria-hidden="true"></canvas></span><span>${n}</span></button>`).join("")}</div>
          <div class="bg-opsi">
            <div class="seg" role="group" aria-label="Ukuran">${Object.entries(this.UK).map(([k, v]) => `<button type="button" data-uk="${k}" aria-pressed="false">${v[2]}</button>`).join("")}</div>
            <select id="bgProv" aria-label="Provinsi"></select>
            <select id="bgEx" aria-label="Grafik Insight"></select>
            <label class="bg-cek"><input type="checkbox" id="bgPeta"> Tangkapan peta langsung</label>
          </div>
          <div class="bg-pra"><img id="bgImg" alt=""><p id="bgStG" role="status" aria-live="polite"></p></div>
          <div class="bg-hal" id="bgHal" hidden><button type="button" data-hal="-1" aria-label="Halaman sebelumnya">‹</button><span aria-live="polite"></span><button type="button" data-hal="1" aria-label="Halaman berikutnya">›</button></div>
          <div class="bg-aksi"><button type="button" class="btn pri" id="bgUnduh">Unduh PNG</button><button type="button" class="btn sec" id="bgBagiG">Bagikan gambar</button></div>
          <label class="sr-only" for="bgTeks">Keterangan & tagar</label>
          <textarea id="bgTeks" rows="7" readonly></textarea>
          <div class="bg-aksi"><button type="button" class="btn sec" id="bgSalinTeks">Salin keterangan</button></div>
        </div>
        <div role="tabpanel" id="bgP-tautan" aria-labelledby="bgT-tautan" class="bg-panel" hidden>
          <label class="sr-only" for="bgUrl">Tautan ke tampilan ini</label>
          <div class="bg-url"><input id="bgUrl" readonly><button type="button" class="btn sec" id="bgSalinUrl">Salin</button></div>
          <button type="button" class="btn pri" id="bgBagiU" hidden>Bagikan lewat aplikasi…</button>
          <div class="bg-sos" id="bgSos"></div>
        </div>
        <div role="tabpanel" id="bgP-ekspor" aria-labelledby="bgT-ekspor" class="bg-panel" hidden>
          <div class="bg-eks">
            <button type="button" data-eks="xlsx"><b>Excel (.xlsx)</b><span>${this.hal === "banjir" ? "Status kecamatan, sungai, rob, provinsi, metadata" : "Provinsi, cluster, posko & anggaran, peringkat risiko, metadata"}</span></button>
            <button type="button" data-eks="pdf"><b>PDF laporan harian</b><span>A4: sampul & KPI, peta, tabel, grafik insight, rekomendasi, sumber</span></button>
            <button type="button" data-eks="pptx"><b>Slide (.pptx)</b><span>16:9: KPI, peta, tabel provinsi, grafik insight, rekomendasi</span></button>
          </div>
          <p id="bgStE" class="bg-cat" role="status" aria-live="polite">Pustaka ekspor dimuat saat tombol ditekan.</p>
        </div>
      </div>`;
    document.body.appendChild(d);
    const q = s => d.querySelector(s);
    d.addEventListener("click", e => { if (e.target === d || e.target.closest("[data-tutup]")) d.close(); });
    const tl = q("[role=tablist]");
    tl.addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) this.pilihTab(b.dataset.tab); });
    tl.addEventListener("keydown", e => { if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return; e.preventDefault();
      const t = [...tl.querySelectorAll("[role=tab]")], i = t.findIndex(x => x.getAttribute("aria-selected") === "true");
      const j = e.key === "Home" ? 0 : e.key === "End" ? t.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + t.length) % t.length;
      this.pilihTab(t[j].dataset.tab); t[j].focus(); });
    q(".bg-tpl").addEventListener("click", e => { const b = e.target.closest("[data-tpl]"); if (b && !b.disabled) { this.tpl = b.dataset.tpl; this.perbarui(); } });
    q("[aria-label=Ukuran]").addEventListener("click", e => { const b = e.target.closest("[data-uk]"); if (b) { this.uk = b.dataset.uk; this.perbarui(); } });
    q("#bgProv").onchange = e => { this.prov = e.target.value; this.perbarui(); };
    q("#bgEx").onchange = e => { this.exId = e.target.value; this.perbarui(); };
    q("#bgPeta").onchange = e => { this.pakaiPeta = e.target.checked; this._th = {}; this.perbarui(); };
    q("#bgHal").addEventListener("click", e => { const b = e.target.closest("[data-hal]"); const n = this.cv?.d?.halaman?.n || 1; if (!b || n < 2) return;
      this.halEx = ((this.halEx || 0) + +b.dataset.hal + n) % n; this._th = {}; this.perbarui(); });
    q("#bgUnduh").onclick = () => this.unduhSemua();
    q("#bgBagiG").onclick = () => this.bagiGambar();
    q("#bgSalinTeks").onclick = () => this.salin(q("#bgTeks").value, "Keterangan disalin");
    q("#bgSalinUrl").onclick = () => this.salin(q("#bgUrl").value, "Tautan disalin");
    q("#bgBagiU").onclick = () => navigator.share({title: document.title, text: this.teksPendek(), url: this.tautan()}).catch(() => {});
    q(".bg-eks").addEventListener("click", e => { const b = e.target.closest("[data-eks]"); if (b) this.ekspor(b.dataset.eks); });
    return d;
  },
  pilihTab(id) {
    this.tab = id; const d = this.dialog();
    d.querySelectorAll("[role=tab]").forEach(t => { const on = t.dataset.tab === id; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; });
    d.querySelectorAll("[role=tabpanel]").forEach(p => p.hidden = p.id !== "bgP-" + id);
  },
  /* bagikan satu kompleks dari lacinya: dialog dibuka di tab Tautan dengan alamat kompleks itu */
  /* gambar pakai templat "Kompleks ini" (data kompleks itu, bukan ringkasan nasional); tautan langsung /k/K0001 */
  bukaKompleks(id) {
    /* model Insight: langsung dialog gambar kompleks (pemilik, 14 Okt 2026) */
    this.bukaKompleksDlg(id);
  },
  /* gambar pakai templat "Kompleks ini" (data kompleks itu, bukan ringkasan nasional); tautan langsung /k/K0001 */
  bukaKompleksDlg(id) {
    this._urlKhusus = location.origin + "/k/" + encodeURIComponent(id); this._kom = id;
    const d = this.dialog(); if (!d._resetK) { d._resetK = 1; d.addEventListener("close", () => { this._urlKhusus = null; this._kom = null; if (this.tpl === "kompleks") this.tpl = "ringkas"; }); }
    this.buka("kompleks");
  },
  async gambarKom(id) {
    this._hari = null; this._snap = undefined; this._d = {}; const k0 = this._kom; this._kom = id;
    try { await this.font(); const cv = await this.render("kompleks", "feed"); return await new Promise(r => cv.toBlob(r, "image/png")); }
    finally { this._kom = k0; }
  },
  /* dari dialog analisa wilayah: gambar provinsi wilayah itu */
  bukaProv(k) { this._provPaksa = k; return this.buka("provinsi"); },
  dataKom(id) {
    const p = S.kluster.features.find(f => f.properties.id === id)?.properties; if (!p) return this.data("");
    const kf = p.cuaca ? p.fdrs : 0, dk = typeof daopsDekat === "function" ? daopsDekat(p.lat, p.lon) : [], bp = typeof bpbdDekat === "function" ? bpbdDekat(p.lat, p.lon) : null;
    const kpi = [
      {l: "Piksel api 24 jam", s: "Piksel 24 j", v: fmt(p.px24), ket: `± ${fmt(Math.round(p.px24 * 14))} ha garis api aktif`, ks: `± ${fmt(Math.round(p.px24 * 14))} ha`, w: this.LV[3]},
      {l: "Hari menyala", s: "Hari menyala", v: fmt(p.hari), ket: "dalam 7 hari terakhir", ks: "7 hari terakhir", w: this.LV[2]},
      {l: "Luas indikatif", s: "Luas", v: fmt(Math.round(p.luas)) + " ha", ket: `rentang ${fmt(Math.round(p.luas * .3))}–${fmt(Math.round(p.luas))} ha`, ks: "indikatif", w: this.LV[2]},
      {l: "Bahaya cuaca (FWI)", s: "FWI", v: p.cuaca ? fmt(p.fwi) : "–", ket: p.cuaca ? "bahaya cuaca " + FWI_KELAS[kf][0].toLowerCase() : "tidak tersedia", ks: p.cuaca ? FWI_KELAS[kf][0].toLowerCase() : "–", w: this.LV[kf]},
    ];
    const rows = [...dk.slice(0, 4).map(d => ({n: d.nama, v: Math.round(d.jarak), t: fmt(Math.round(d.jarak)) + " km", w: this.LV[1]})), ...(bp ? [{n: bp.nama, v: Math.round(bp.jarak), t: fmt(Math.round(bp.jarak)) + " km", w: this.LV[0]}] : [])];
    const rek = [{lv: p.level, t: `Status ${S.meta.status[p.level].toLowerCase()}${p.level === 3 && p.peringkat ? `, urutan ${p.peringkat} di wilayah kerjanya` : ""}.`},
      ...(p.gambut ? [{lv: 2, t: "Berada di lahan gambut: api bisa menyala di bawah permukaan, perlu pembasahan dan ground-check."}] : []),
      ...(p.cuaca ? [{lv: kf, t: `Cuaca: suhu ${fmt(p.t)} °C, kelembapan ${fmt(p.rh)}%, angin ${fmt(p.ws)} km/jam.`}] : []),
      /* pola lokasi (watak_kluster.py `wt`, VIIRS 2012-2025 jendela ~16 km); bagian yang datanya kosong tidak ditulis */
      ...(p.wt ? [{lv: p.wt.lg || p.wt.k >= 2 ? 2 : 1, t: [p.wt.lg ? `Lokasi langganan: terbakar ${p.wt.a} dari ${p.wt.n} tahun` : p.wt.a ? `Terbakar ${p.wt.a} dari ${p.wt.n} tahun` : `Tidak pernah terbakar besar dalam ${p.wt.n} tahun terakhir`,
        p.wt.rs >= 1 ? `seminggu ini ${fmt(p.wt.rs >= 10 ? Math.round(p.wt.rs) : p.wt.rs)} kali rata-rata setahun` : null, p.wt.md ? `dulu rata-rata ${fmt(p.wt.md)} hari` : null,
        p.wt.akhir ? `musim sampai ${new Date(p.wt.akhir + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "UTC"})}` : null,
        p.wt.k >= 2 ? "sering kambuh, mop-up 14 hari" : null].filter(Boolean).join(", ") + "."}] : [])];
    return {tpl: "kompleks", prov: p.prov, lv: p.level, label: `Cluster ${p.id}`, judul: `${p.kec}, ${p.kab}`,
      sub: `${namaProv(p.prov)} · status ${S.meta.status[p.level].toLowerCase()} · ${fmt(p.n)} deteksi VIIRS 7 hari`,
      kpi, bar: {judul: "Unit pemadam terdekat (jarak lurus)", pendek: "Unit terdekat", rows}, rek, legenda: [[this.LV[3], "Prioritas"], [this.LV[2], "Siaga"], [this.LV[1], "Patroli"]], petaKet: `Cluster ${p.id}`};
  },
  async buka(tpl, exId) {
    if (!this.siap()) return this.kabar("Data belum termuat, coba lagi sebentar.");
    this._hari = null; this._snap = undefined; this._ex = null; this._th = {}; this._d = {};
    if (tpl) this.tpl = tpl; if (exId != null) this.exId = exId; if (!this._kom && this.tpl === "kompleks") this.tpl = "ringkas";
    /* tombol share di kepala halaman: ikut wilayah yang sedang dibuka (provinsi), nasional bila belum memilih */
    if (this.T && (this.tpl === "provinsi" || this.tpl === "kompleks")) this.tpl = "ringkas";
    if (!tpl && this.tpl !== "ex") this.tpl = !this.T && document.querySelector("#p-peta.on") && S.jalur?.[0] ? "provinsi" : "ringkas";
    this.prov = this.T ? "" : this._provPaksa || S.jalur?.[0] || (S.meta.provinsi[this.prov] ? this.prov : this.provAwal()); this._provPaksa = null;
    const d = this.dialog(), q = s => d.querySelector(s);
    if (!this.T) { q("#bgProv").innerHTML = this.daftarProv().map(k => `<option value="${k}">${esc(namaProv(k))}</option>`).join(""); q("#bgProv").value = this.prov; }
    q("#bgPeta").checked = this.pakaiPeta; q('[data-tpl="kompleks"]').hidden = !this._kom || !!this.T; q('[data-tpl="provinsi"]').hidden = !!this.T;
    q("#bgBagiU").hidden = !navigator.share;
    q("#bgUrl").value = this.tautan(); this.sosial();
    if (!d.open) d.showModal();
    this.pilihTab(tpl ? "gambar" : this.tab);
    this._exP = this.daftarEx().catch(e => { console.warn(e); return []; });
    this.perbarui();
  },
  kabar(m) { if (typeof toast === "function") toast(m); else alert(m); },
  async salin(t, ok) {
    try { await navigator.clipboard.writeText(t); this.kabar(ok); }
    catch (e) { const a = document.createElement("textarea"); a.value = t; a.style.cssText = "position:fixed;opacity:0"; this.dialog().appendChild(a); a.select(); document.execCommand("copy"); a.remove(); this.kabar(ok); }
  },
  simpan(blob, nama) {
    this.terakhir = {nama, blob};
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nama; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  },
  tanggal() { if (this.T) return this.T.tanggal(); return S.meta.hari_wib || new Date().toISOString().slice(0, 10); },
  namaBerkas(ext) { return `${this.T ? this.hal : this.hal === "banjir" ? "posko-banjir" : "posko-karhutla"}-${this.tpl === "provinsi" ? this.slug(namaProv(this.prov)) + "-" : this.tpl === "kompleks" && this._kom ? this._kom + "-" : ""}${this.tanggal()}${ext === "png" ? "-" + this.uk : ""}.${ext}`; },
  slug: s => String(s).toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  tglPanjang() { return new Date(this.tanggal() + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"}); },
  /* alamat yang dicetak di gambar: domain publik, bukan localhost/pratinjau */
  situs() { const h = /^(localhost|127\.|\[::1\])/.test(location.host) || location.host.endsWith(".pages.dev") ? "pantau.terasurban.com" : location.host;
    return h; /* cukup domain, tanpa /insight dsb. (pemilik, 14 Okt 2026) */ },
  tautan() {
    if (this._urlKhusus) return this._urlKhusus; /* dibuka dari laci kompleks: tautan langsung /k/K0001 */
    if (this.T?.tautan) return this.T.tautan();
    const u = new URL(location.href); u.search = "";
    if (!this.T && S.jalur?.length) u.searchParams.set("wil", S.jalur.join("|"));
    return u.toString();
  },
  muatKontak() { if (!this._kontak) this._kontak = fetch("/data/kontak.json").then(r => r.ok ? r.json() : null).then(k => (this.kontak = k)).catch(() => null); return this._kontak; },
  sosial() {
    const u = encodeURIComponent(this.tautan()), t = encodeURIComponent(this.teksPendek());
    const L = [["WhatsApp", `https://wa.me/?text=${t}%20${u}`], ["Telegram", `https://t.me/share/url?url=${u}&text=${t}`], ["X", `https://x.com/intent/tweet?text=${t}&url=${u}`],
      ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${u}`], ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${u}`]];
    /* logo aplikasi (path 24×24, isi penuh) dan warna merek untuk lingkaran ikon */
    const IK = {WhatsApp: ["#25D366", "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z"],
      Telegram: ["#229ED9", "M21.9 4.3 18.7 19c-.2 1-.9 1.3-1.8.8l-4.8-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2l-11 6.9-4.7-1.5c-1-.3-1-1 .2-1.5l18.5-7.1c.9-.3 1.6.2 1.5 1.7Z"],
      X: ["#000000", "M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.9L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z"],
      Facebook: ["#1877F2", "M14 22v-8h2.7l.4-3.2H14v-2c0-.9.3-1.6 1.6-1.6h1.7V4.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.3H7.8V14h2.8v8H14Z"],
      LinkedIn: ["#0A66C2", "M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2ZM5.3 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2Zm1.8 13.1H3.5V9h3.6v11.5Z"]};
    this.dialog().querySelector("#bgSos").innerHTML = L.map(([n, h]) => `<a class="bg-app" href="${h}" target="_blank" rel="noopener noreferrer" style="--w:${IK[n][0]}"><i><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${IK[n][1]}"/></svg></i><span>${n}</span></a>`).join("");
  },
  teksPendek() {
    if (this.T) return `${this.T.teksWil("")} ${this.en() ? "Follow" : "Pantau"} ${this.K.nama}:`;
    const d = this.data("");
    return this.hal === "banjir" ? `${d.kpi[0].v} kecamatan berstatus banjir hari ini (${d.kpi[0].ket}). Pantau ${this.K.nama}:` : `${d.kpi[0].v} titik panas dan ${d.kpi[2].v} cluster prioritas pemadaman hari ini. Pantau ${this.K.nama}:`;
  },

  /* ---------------------------------------------------------------- bagikan sekali ketuk (bagi.js)
     Ponsel: lembar bawaan perangkat; desktop: lembar ringkas. Teks pendek dengan angka halaman, dalam bahasa window.BAHASA. */
  IKON: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>`,
  en() { return /^en/i.test(String(window.BAHASA || document.documentElement.lang || "")); },
  bagi(c) { if (window.Bagi) Bagi.buka(c); else this.buka(); },
  /* tombol header: selalu lembar (berisi tombol aplikasi, gambar, dan ekspor) */
  cepat() {
    if (!this.siap()) return this.kabar(this.en() ? "Data is still loading, try again shortly." : "Data belum termuat, coba lagi sebentar.");
    /* model Insight: dialog gambar. Provinsi hanya bila sedang di Peta dengan provinsi terpilih; halaman lain = Indonesia */
    if (this.T) return this.buka("ringkas");
    const diPeta = !!document.querySelector("#p-peta.on"), k = diPeta ? S.jalur?.[0] || "" : "";
    this.buka(k ? "provinsi" : "ringkas");
  },
  async gambarCepat(k) {
    this._hari = null; this._snap = undefined; this._d = {};
    const p0 = this.prov; if (k) this.prov = k;
    try { await this.font(); const cv = await this.render(k ? "provinsi" : "ringkas", "feed"); return await new Promise(r => cv.toBlob(r, "image/png")); }
    finally { this.prov = p0; }
  },
  tglPendek() { return new Date(this.tanggal() + "T12:00:00+07:00").toLocaleDateString(this.en() ? "en-GB" : "id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"}); },
  n(v) { return Number(v || 0).toLocaleString(this.en() ? "en-US" : "id-ID"); },
  jiwa(v) { return this.en() ? (v >= 1e6 ? Math.round(v / 1e5) / 10 + " M" : v >= 1e3 ? Math.round(v / 1e3) + "k" : String(Math.round(v))) : typeof rb === "function" ? rb(v) : fmt(v); },
  /* ponytail: jiwa terpapar asap hanya bila tab Ringkasan sudah menghitung (Ringkasan.D); selain itu titik panas hari ini */
  ringkasanD() { try { return typeof Ringkasan !== "undefined" && Ringkasan.D?.adaAsap ? Ringkasan.D : null; } catch (e) { return null; } },
  teksWil(k) {
    if (this.T) return this.T.teksWil(k);
    const E = this.en(), tg = this.tglPendek(), nm = k ? namaProv(k) : "Indonesia";
    if (this.hal === "banjir") { const d = this.data(k);
      return E ? `${nm}: ${d.kpi[0].v} sub-districts on flood alert, 3-day rain up to ${d.kpi[1].v} (${tg}).` : `${nm}: ${d.kpi[0].v} kecamatan berstatus banjir, hujan 3 hari hingga ${d.kpi[1].v} (${tg}).`; }
    const kl = k ? klusterDi(k) : S.kluster.features, n3 = kl.filter(f => f.properties.level === 3).length, h = this.hariIni(), R = this.ringkasanD();
    const jw = R ? (k ? R.P?.[k]?.jiwa : R.kpi?.jiwaNas) : 0;
    const dua = jw ? (E ? `${this.jiwa(jw)} people exposed to smoke` : `${this.jiwa(jw)} jiwa terpapar asap`) : (E ? `${this.n(k ? h.per[k] : h.tot)} hotspots today` : `${this.n(k ? h.per[k] : h.tot)} titik panas hari ini`);
    return E ? `${nm}: ${this.n(n3)} priority fire complexes, ${dua} (${tg}).` : `${nm}: ${this.n(n3)} cluster prioritas, ${dua} (${tg}).`;
  },
  konteks(jenis, a) {
    const E = this.en(), tg = this.tglPendek(), o = location.origin, L = E ? "Live map:" : "Pantau langsung:";
    if (this.T) return this.T.konteks?.(jenis, a, {tg, o}) || {judul: document.title, teks: this.teksWil("") + " " + L, url: o + location.pathname, kampanye: this.hal + "-" + (jenis || "ringkasan")};
    if (jenis === "kompleks") {
      const p = S.kluster?.features.find(f => f.properties.id === a)?.properties, J = (E ? "Fire complex " : "Cluster ") + a;
      const st = p && (E ? ["routine prevention", "patrol", "suppression standby", "priority suppression"][p.level] : S.meta.status[p.level].toLowerCase());
      const teks = p ? (E ? `${J} (${p.kab}, ${namaProv(p.prov)}): ${st}, ${this.n(p.n24)} hotspots in 24 h (${tg}). See it on the map:` : `${J} (${p.kab}, ${namaProv(p.prov)}): ${st}, ${this.n(p.n24)} titik panas 24 jam (${tg}). Lihat di peta:`)
        : `${J}. ${E ? "See it on the map:" : "Lihat di peta:"}`;
      return {judul: J, teks, url: o + "/k/" + encodeURIComponent(a), kampanye: "kompleks"};
    }
    /* kartu Berita: tanggal hari ini, bukan tanggal data titik panas (bisa tertinggal beberapa hari) */
    if (jenis === "artikel") { const [j, url, kamp] = a, hr = new Date().toLocaleDateString(E ? "en-GB" : "id-ID", {day: "numeric", month: "short", timeZone: "Asia/Jakarta"});
      return {judul: j, teks: `${Bagi.potong(j, 180)} (${hr}). ${E ? "More:" : "Selengkapnya:"}`, url, kampanye: kamp}; }
    const k = jenis === "prov" ? a : "";
    return {judul: k ? namaProv(k) + " · " + this.K.pendek : document.title, teks: this.teksWil(k) + " " + L, url: o + location.pathname + (k ? "?wil=" + k : ""), kampanye: k ? "provinsi" : "ringkasan"};
  },
  /* tombol bagikan di bagian halaman yang dirender ulang sendiri: diamati, dipasang sekali per elemen */
  pasangCepat() {
    const E = this.en(), o = location.origin;
    const tombol = (lbl, f) => { const b = document.createElement("button"); b.type = "button"; b.className = "bs-sel"; b.title = lbl; b.setAttribute("aria-label", lbl); b.innerHTML = this.IKON;
      b.onclick = ev => { ev.stopPropagation(); if (!this.siap()) return; this.bagi(f()); }; return b; };
    const amati = (id, f) => { const el = document.getElementById(id); if (!el) return; let r = 0;
      const jalan = () => { r = 0; try { f(el); } catch (e) { console.warn("bagikan", id, e); } };
      new MutationObserver(() => { r ||= requestAnimationFrame(jalan); }).observe(el, {childList: true, subtree: true}); jalan(); };
    /* teks judul tanpa tombol di dalamnya (mis. "Hapus saringan ✕") */
    const judul = el => { if (!el) return ""; const c = el.cloneNode(true); c.querySelectorAll("button").forEach(b => b.remove()); return c.textContent.replace(/\s+/g, " ").trim(); };
    if (!this.T) amati("ringkasan", el => { const a = el.querySelector(".rk-hero .rk-aksi"); if (!a || a.querySelector(".bg-rk")) return;
      const b = document.createElement("button"); b.type = "button"; b.className = "btn sec bg-rk"; b.innerHTML = `${this.IKON}<span>${E ? "Share" : "Bagikan"}</span>`;
      b.onclick = () => this.bagi({...this.konteks("nasional"), gambar: () => this.gambarCepat(""), lainnya: () => this.buka()}); a.prepend(b); });
    amati("berita", el => {
      /* kartu grafik Berita memakai tombol gambar ala Insight (tombolEx); tombol tautan hanya untuk kartu tanpa grafik/tabel */
      /* kartu Berita: semua memakai tombol gambar (tombolEx); tombol tautan hanya per berita di daftar */
      el.querySelectorAll(".br-item").forEach(it => { if (it.querySelector(".bs-sel")) return; const j = judul(it.querySelector("a b")), src = judul(it.querySelector(".br-src"));
        it.querySelector(".br-meta")?.append(tombol(E ? "Share this news" : "Bagikan berita ini", () => ({judul: j, kampanye: "berita", url: o + "/berita",
          teks: `"${Bagi.potong(j, 150)}" (${src}). ${this.T ? (E ? "Follow the news on " + this.K.pendek + ":" : `Pantau berita ${this.T.kata || this.hal} di ${this.K.pendek}:`) : E ? "Follow fire news & hotspots on " + this.K.pendek + ":" : `Pantau berita & titik panas karhutla di ${this.K.pendek}:`}`}))); });
    });
    /* Dampak: tiap kartu grafik memakai tombol gambar ala Insight (tombolEx); tombol tautan per bagian tidak dipakai lagi */
    /* dialog provinsi tab Operasi (#dlg dipakai bersama; hanya yang berisi .op-db) */
    if (!this.T) amati("dlg", d => { const hd = d.querySelector(".dh"), j = judul(d.querySelector("#dlgJudul")); if (!d.querySelector(".op-db") || !hd || hd.querySelector(".bs-sel") || !/:/.test(j)) return;
      const k = Object.keys(S.meta?.provinsi || {}).find(x => namaProv(x) === j.split(":")[0].trim()); if (!k) return;
      hd.querySelector("[data-tutup]")?.before(tombol(E ? "Share this province" : "Bagikan provinsi ini", () => ({judul: j, kampanye: "operasi", url: o + "/operasi?wil=" + k,
        teks: `${this.teksWil(k)} ${E ? "Operations needs:" : "Kebutuhan operasi:"}`}))); });
  },

  /* ---------------------------------------------------------------- data */
  provAwal() { return this.daftarProv()[0]; },
  daftarProv() {
    if (this.T) return [];
    const semua = Object.keys(S.meta.provinsi);
    if (this.hal === "banjir") { const ag = agregat("b", 0), n = k => ag[k] ? ag[k].lv * 1e6 + ag[k].n[3] * 1e4 + ag[k].n[2] * 100 + ag[k].n[1] : 0; return semua.sort((a, b) => n(b) - n(a)); }
    const h = this.hariIni(), pr = S.meta.prioritas || [];
    return [...pr, ...semua.filter(k => !pr.includes(k)).sort((a, b) => (h.per[b] || 0) - (h.per[a] || 0))];
  },
  /* titik panas hari kalender WIB per provinsi & kab (sensor utama, semua keyakinan; sama dengan KPI peta saat rentang "Hari ini") */
  hariIni() {
    if (this._hari) return this._hari;
    const per = {}, kab = {}; let tot = 0, tinggi = 0;
    for (const b of S.titik || []) { if (b[7] !== S.hariIni || !S.utama?.has(b[3])) continue; const w = S.wilKunci[b[6]]; if (!w) continue;
      per[w[0]] = (per[w[0]] || 0) + 1; kab[w[1]] = (kab[w[1]] || 0) + 1; tot++; if (b[5] === 2) tinggi++; }
    return this._hari = {per, kab, tot, tinggi};
  },
  polos(html) { return new DOMParser().parseFromString(String(html), "text/html").body.textContent.replace(/\s+/g, " ").trim(); },
  data(k) { return this._d?.[k || "-"] || ((this._d ||= {})[k || "-"] = this.T ? this.T.data(k) : this.hal === "banjir" ? this.dataBanjir(k) : this.dataApi(k)); },
  dataApi(k) {
    const h = this.hariIni(), kl = k ? klusterDi(k) : S.kluster.features, lvN = [0, 1, 2, 3].map(l => kl.filter(f => f.properties.level === l).length);
    const fw = k ? S.wilayah[k]?.fwi_maks : Math.max(0, ...Object.keys(S.meta.provinsi).map(p => S.wilayah[p]?.fwi_maks || 0)), kf = fw == null ? 0 : kelasFWI(fw);
    const n = k ? h.per[k] || 0 : h.tot, lv = Math.max(0, ...kl.map(f => f.properties.level));
    const kpi = [
      {l: "Titik panas hari ini", s: "Titik panas", v: fmt(n), ket: k ? "hari ini (WIB)" : `hari ini (WIB) · ${fmt(h.tinggi)} keyakinan tinggi`, ks: "hari ini (WIB)", w: this.LV[3], ik: "api"},
      {l: "Cluster aktif", s: "Cluster", v: fmt(kl.length), ket: "aktif 72 jam terakhir", ks: "aktif 72 jam", w: this.LV[2], ik: "lapis"},
      {l: "Prioritas pemadaman", s: "Prioritas", v: fmt(lvN[3]), ket: `${fmt(lvN[2])} lain siaga pemadaman`, ks: `+${fmt(lvN[2])} siaga`, w: this.LV[3], ik: "awas"},
      {l: "FWI maksimum", s: "FWI maks", v: fmt(fw), ket: fw == null ? "–" : "bahaya cuaca " + FWI_KELAS[kf][0].toLowerCase(), ks: fw == null ? "–" : FWI_KELAS[kf][0].toLowerCase(), w: this.LV[kf], ik: "cuaca"},
    ];
    let rows, jb, jp;
    if (!k) { rows = Object.entries(h.per).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p, v]) => ({n: namaProv(p), k: p, v, t: fmt(v), w: this.LV[S.wilayah[p]?.level ?? 0]})); jb = "Titik panas terbanyak hari ini"; jp = "Titik panas hari ini"; }
    else {
      rows = Object.entries(h.kab).filter(([x]) => x.startsWith(k + "|")).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([x, v]) => ({n: x.split("|")[1], v, t: fmt(v), w: this.LV[3]})); jb = "Kabupaten/kota dengan titik panas terbanyak hari ini"; jp = "Titik panas per kabupaten";
      if (!rows.length) { const c = {}; kl.forEach(f => c[f.properties.kab] = (c[f.properties.kab] || 0) + 1);
        rows = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([x, v]) => ({n: x, v, t: fmt(v), w: this.LV[2]})); jb = "Kabupaten/kota dengan cluster terbanyak"; jp = "Cluster per kabupaten"; }
    }
    let rek = [];
    if (k) { try { rek = rekomendasi(k, this.dRek(k, kl)).map(r => ({lv: r.lv, t: this.polos(r.teks), dasar: r.dasar})); } catch (e) { console.warn("rekomendasi", e); }
      if (!rek.length) rek = [{lv: 0, t: "Pencegahan rutin; tidak ada cluster berstatus siaga atau prioritas."}]; }
    return {tpl: k ? "provinsi" : "ringkas", prov: k, lv, label: k ? "Ringkasan provinsi" : "Ringkasan harian",
      judul: k ? namaProv(k) : "Situasi karhutla hari ini",
      sub: k ? `Status ${S.meta.status[lv].toLowerCase()}, ${fmt(n)} titik panas, ${fmt(kl.length)} cluster aktif` : `Indonesia, ${fmt(n)} titik panas, ${fmt(lvN[3])} cluster prioritas pemadaman`,
      kpi, bar: {judul: jb, pendek: jp, rows}, rek, legenda: [[this.LV[3], "Prioritas"], [this.LV[2], "Siaga"], [this.LV[1], "Patroli"]], petaKet: "Cluster aktif"};
  },
  /* sama dengan masukan rekomendasi() di renderPrioritas */
  dRek(k, kl) {
    const G = S.fwi.grid, hari = G[0].hari.map(x => x.tgl), i0 = Math.max(0, hari.indexOf(S.fwi.hari_ini)), hr = hari.slice(i0, i0 + 4), sel = G.filter(g => g.prov === k);
    const per = hr.map(tg => { const cs = sel.map(g => g.hari.find(x => x.tgl === tg)).filter(Boolean); return {fwi: Math.max(0, ...cs.map(c => c.fwi ?? 0)), hujan: cs.reduce((a, c) => a + (c.hujan || 0), 0) / (cs.length || 1)}; });
    let pm = 0; const asap = typeof Lapis !== "undefined" && Lapis.cache?.asap;
    if (asap) for (const c of asap.grid) { let best = null, dd = 1e9; for (const g of sel) { const x = (g.lat - c[0]) ** 2 + (g.lon - c[1]) ** 2; if (x < dd) { dd = x; best = g; } } if (best && dd <= .6) pm = Math.max(pm, ...c[2].map(v => v ?? 0)); }
    const t = new Date(Date.now() + 7 * 36e5), das = t.getUTCMonth() * 3 + Math.min(2, Math.floor((t.getUTCDate() - 1) / 10)), o = Tren.musim?.prov?.[k], pk = (S.posko || []).filter(x => x.prov === k);
    return {kl, fwiH3: Math.max(0, ...per.map(x => x.fwi)), hariSangat: per.filter(x => x.fwi >= 14).length, hujan: per.reduce((a, x) => a + x.hujan, 0), pm,
      musim: o && {p: o.p_semua[das], siaga: Tren.siaga(o.p_semua)},
      posko: {perm: pk.filter(x => x.jenis_posko !== "aju").length, aju: pk.filter(x => x.jenis_posko === "aju").length, biaya: pk.reduce((a, x) => a + anggaran(S.semuaPosko.get(x.id)).total, 0)}};
  },
  dataBanjir(k) {
    const n = [0, 0, 0, 0], nl = [0, 0, 0, 0], kab = {};
    for (const [kk, v] of Object.entries(S.st.kec)) { if (k && !kk.startsWith(k + "|")) continue; const l = v.b?.[0] || 0; n[l]++; nl[v.l?.[0] || 0]++;
      if (l) { const kb = kk.split("|")[1], o = kab[kb] ||= {v: 0, lv: 0}; o.v++; o.lv = Math.max(o.lv, l); } }
    const grid = S.hujan.grid.filter(g => !k || g.prov === k), basah = grid.reduce((a, g) => (g.h3 || 0) > (a?.h3 || 0) ? g : a, null), h3 = basah?.h3 || 0;
    const sgT = (S.sungai?.titik || []).filter(t => !k || t.prov === k), sg = sgT.filter(t => t.kelas).length;
    const iH = S.rob ? Math.max(0, S.rob.hari.indexOf(S.hujan.hari_ini)) : 0;
    const rob = (S.rob?.titik || []).filter(t => (!k || t.prov === namaProv(k) || t.prov === k) && Math.max(0, ...t.lv.slice(iH).map(v => v || 0)) > 0).length;
    const lv = n[3] ? 3 : n[2] ? 2 : n[1] ? 1 : 0;
    let rows, jb, jp;
    const kpi = [
      {l: "Kecamatan berstatus banjir", s: "Kec. berstatus", v: fmt(n[1] + n[2] + n[3]), ket: `${fmt(n[3])} awas · ${fmt(n[2])} siaga · ${fmt(n[1])} waspada`, ks: `${fmt(n[3])} awas · ${fmt(n[2])} siaga`, w: this.LV[lv]},
      {l: "Hujan 3 hari maksimum", s: "Hujan 3 hari", v: fmt(Math.round(h3)) + " mm", ket: basah ? (k ? "kelas " + kelasHujan(h3) : "di " + namaProv(basah.prov)) : "–", ks: kelasHujan(h3), w: "#4f8fc4"},
      {l: "Sungai di atas ambang", s: "Sungai > Q2", v: fmt(sg), ket: `dari ${fmt(sgT.length)} titik GloFAS`, ks: `dari ${fmt(sgT.length)} titik`, w: "#5f6fb0"},
      {l: "Titik pantai rob", s: "Titik rob", v: fmt(rob), ket: "waspada ke atas, 10 hari", ks: "10 hari ke depan", w: "#2b8c86"},
    ];
    if (!k) { const ag = agregat("b", 0); rows = Object.keys(S.meta.provinsi).filter(p => ag[p]).map(p => ({p, a: ag[p]})).sort((a, b) => b.a.lv - a.a.lv || b.a.n[3] - a.a.n[3] || b.a.n[2] - a.a.n[2] || b.a.n[1] - a.a.n[1])
      .slice(0, 5).map(({p, a}) => { const v = a.n[1] + a.n[2] + a.n[3]; return {n: namaProv(p), k: p, v, t: fmt(v) + " kec.", w: this.LV[a.lv]}; }); jb = "Provinsi dengan kecamatan berstatus terbanyak"; jp = "Kecamatan berstatus per provinsi"; }
    else { rows = Object.entries(kab).sort((a, b) => b[1].lv - a[1].lv || b[1].v - a[1].v).slice(0, 5).map(([x, o]) => ({n: x, v: o.v, t: fmt(o.v) + " kec.", w: this.LV[o.lv]})); jb = "Kabupaten/kota dengan kecamatan berstatus terbanyak"; jp = "Kecamatan berstatus per kabupaten"; }
    const rek = [];
    if (k) {
      if (n[1] + n[2] + n[3]) rek.push({lv, t: `${fmt(n[3])} kecamatan awas, ${fmt(n[2])} siaga, dan ${fmt(n[1])} waspada banjir hari ini${rows[0] ? "; terbanyak di " + rows.slice(0, 2).map(r => r.n).join(" dan ") : ""}`});
      AKSI.b[lv].forEach(t => rek.push({lv, t}));
      if (nl[2] + nl[3]) rek.push({lv: 2, t: `${fmt(nl[2] + nl[3])} kecamatan siaga/awas longsor: ${AKSI.l[2][0].toLowerCase()}`});
      if (h3 >= 100) rek.push({lv: 2, t: `Hujan hingga ${fmt(Math.round(h3))} mm dalam 3 hari: periksa saluran, pintu air, dan pompa di dataran rendah`});
      if (sg) rek.push({lv: 2, t: `${fmt(sg)} titik sungai diprakirakan melewati debit banjir 2 tahunan: siagakan warga bantaran`});
      if (rob) rek.push({lv: 1, t: `${fmt(rob)} titik pantai berstatus rob: informasikan jam pasang tertinggi ke warga pesisir`});
    }
    return {tpl: k ? "provinsi" : "ringkas", prov: k, lv, label: k ? "Ringkasan provinsi" : "Ringkasan harian",
      judul: k ? namaProv(k) : "Situasi banjir hari ini",
      sub: k ? `Status ${LEVEL[lv].toLowerCase()} · ${fmt(n[1] + n[2] + n[3])} kecamatan berstatus hari ini` : `Indonesia · ${fmt(n[1] + n[2] + n[3])} kecamatan berstatus waspada ke atas`,
      kpi, bar: {judul: jb, pendek: jp, rows}, rek, legenda: [[this.LV[3], "Awas"], [this.LV[2], "Siaga"], [this.LV[1], "Waspada"]], petaKet: "Status banjir per provinsi"};
  },
  /* grafik insight: karhutla dirender di luar layar dari Insight.gambar(); banjir disalin dari tab Insight */
  wadah() {
    let w = document.getElementById("bgOff");
    if (!w) { w = document.createElement("div"); w.id = "bgOff"; w.setAttribute("aria-hidden", "true"); document.body.appendChild(w); }
    return w;
  },
  async daftarEx() {
    if (this._ex) return this._ex;
    const box = this.wadah(), out = [];
    if (this.hal === "karhutla") {
      if (!Insight.data.mo) await Insight.muat();
      box.innerHTML = Insight.EX.map(id => `<div data-ex="${id}">${Insight.gambar(id)}</div>`).join("");
      box.querySelectorAll("[data-ex]").forEach(d => out.push({id: d.dataset.ex, art: d.querySelector("article.ex")}));
    } else {
      if (!document.querySelector("#insight article.ex") && typeof Insight !== "undefined") await Insight.render();
      box.innerHTML = "";
      document.querySelectorAll("#insight article.ex").forEach((a, i) => { const c = a.cloneNode(true); c.querySelector(".bg-ex")?.remove(); box.appendChild(c); out.push({id: "b" + i, art: c}); });
    }
    this._ex = out.filter(x => x.art?.querySelector("svg") && x.art.querySelector("h3")).map(x => ({...x, judul: x.art.querySelector("h3").textContent.trim()}));
    const sel = this.dialog().querySelector("#bgEx");
    sel.innerHTML = this._ex.map(e => `<option value="${e.id}">${esc(e.judul.length > 90 ? e.judul.slice(0, 88) + "…" : e.judul)}</option>`).join("");
    if (this.exId !== "luar" && !this._ex.some(e => e.id === this.exId)) this.exId = this._ex[0]?.id || "";
    sel.value = this.exId;
    return this._ex;
  },
  /* SVG -> kanvas. Gaya dibekukan dalam tema terang (tanpa repaint: tema dipulihkan di tugas yang sama) */
  svgKanvas(svg, skala = 2) {
    const R = document.documentElement, tema = R.dataset.theme; R.dataset.theme = "light";
    let teks, w, h;
    try {
      const vb = svg.viewBox?.baseVal; w = vb?.width || svg.getBoundingClientRect().width || 940; h = vb?.height || svg.getBoundingClientRect().height || 400;
      const P = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "stroke-opacity", "opacity", "font-family", "font-size", "font-weight", "font-style", "text-anchor", "dominant-baseline", "letter-spacing", "visibility", "display"];
      const gaya = el => { const cs = getComputedStyle(el); return P.map(p => `${p}:${cs.getPropertyValue(p)}`).join(";"); };
      const c = svg.cloneNode(true), a = [svg, ...svg.querySelectorAll("*")], b = [c, ...c.querySelectorAll("*")];
      a.forEach((el, i) => { b[i].setAttribute("style", gaya(el)); b[i].removeAttribute("class"); b[i].removeAttribute("data-tip"); });
      c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); c.setAttribute("width", w); c.setAttribute("height", h);
      if (vb?.width) c.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
      teks = new XMLSerializer().serializeToString(c);
    } finally { if (tema) R.dataset.theme = tema; else delete R.dataset.theme; }
    return new Promise((ok, gagal) => { const img = new Image();
      img.onload = () => { const cv = this.kanvas(Math.round(w * skala), Math.round(h * skala)); cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); ok(cv); };
      img.onerror = () => gagal(new Error("SVG grafik tidak bisa digambar"));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(teks); });
  },
  async dataEx(id = this.exId) {
    if (id === "luar" && this._exLuar) { const L = this._exLuar;
      /* tiap grafik, galeri, peta, dan potongan tabel = satu halaman sendiri, supaya isinya tetap terbaca (pemilik, 15 Okt 2026) */
      L.hal ||= {}; L.halaman = L.hal[this.uk];
      if (!L.halaman) { const fotoPeta = c => { const k = this.kanvas(c.width, c.height); k.getContext("2d").drawImage(c, 0, 0); return k; };
        const BARIS = {story: 20, feed: 12, kotak: 9}[this.uk] || 12, nT = L.tabel ? Math.min(3, Math.ceil(L.tabel.querySelectorAll("tbody tr").length / BARIS)) : 0;
        L.halaman = [...(L.dom ? (await Promise.all(L.dom.map(e => this.domKanvas(e).catch(er => (console.warn(er), null))))).filter(Boolean) : []), ...(L.peta ? [fotoPeta(L.peta)] : []), ...(L.galeri ? [await this.galeriKanvas(L.galeri)] : []), ...await Promise.all((L.svgs || []).map(v => this.svgKanvas(v))),
          ...Array.from({length: nT}, (_, i) => this.tabelKanvas(L.tabel, BARIS, i * BARIS))]; L.hal[this.uk] = L.halaman; }
      if (!L.halaman.length) { const k = this.kanvas(940, 200), c = k.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, 940, 200); this.f(c, 600, 28); c.fillStyle = this.C.tinta2; c.textBaseline = "middle"; c.fillText(this.en() ? "See the full card on the site" : "Lihat kartu lengkap di situs", 0, 100); L.halaman = [k]; L.hal[this.uk] = L.halaman; }   /* kartu tanpa isi yang bisa digambar: jangan keluar kosong */
      const n = L.halaman.length, i = Math.min(this.halEx || 0, Math.max(0, n - 1)), lebih = L.tabel && L.tabel.querySelectorAll("tbody tr").length > 36;
      L.sorot ||= this.sorotDari(L.svgs?.slice(0, 1)); L.tabelTip ??= L.tabel ? null : this.tabelDariTip(L.svgs?.slice(0, 1));
      const grafik1 = L.svgs?.length && i === (L.dom ? L.dom.length : 0) + (L.peta ? 1 : 0) + (L.galeri ? 1 : 0);
      return {tpl: "ex", id: "luar", label: L.label + (n > 1 ? ` · ${i + 1}/${n}` : ""), judul: L.judul, judulSeg: L.judulSeg, sub: "", unit: "", img: L.halaman[i] || null, halaman: {i, n}, sorot: grafik1 ? L.sorot : [], tabelTip: grafik1 ? L.tabelTip : null,   /* sorotan & tabel isi hanya di halaman grafik pertama */
        fn: [L.fn, lebih || L.tabel ? `Lihat data lengkap di https://${this.situs()}` : ""].filter(Boolean).join(" · ")}; }
    const L = await this._exP || await this.daftarEx(), e = L.find(z => z.id === id) || L[0];
    if (!e) return {tpl: "ex", label: "Grafik Insight", judul: "Grafik Insight belum tersedia", kosong: true};
    const h3 = e.art.querySelector("h3"), tx = s => e.art.querySelector(s)?.textContent.replace(/\s+/g, " ").trim() || "";
    e.img ||= await this.svgKanvas(e.art.querySelector("svg"));
    return {tpl: "ex", id: e.id, label: "Grafik Insight", judul: e.judul, judulSeg: [...h3.childNodes].map(x => ({t: x.textContent, hl: x.nodeType === 1 && x.classList.contains("hl")})),
      sub: tx(".sub"), unit: tx(".unit"), fn: tx(".fn"), img: e.img, sorot: e.sorot ||= this.sorotDari([e.art.querySelector("svg")]), tabelTip: e.tabelTip ??= this.tabelDariTip([e.art.querySelector("svg")])};
  },

  /* ---------------------------------------------------------------- peta */
  tangkap() {
    if (this._snap !== undefined) return Promise.resolve(this._snap);
    return new Promise(res => {
      const fin = v => { if (this._snap === undefined) { this._snap = v; res(v); } };
      if (typeof peta === "undefined" || !peta?.getCanvas) return fin(null);
      const cv = peta.getCanvas(); if (!cv.width || !cv.height) return fin(null);
      peta.once("render", () => { try {
        const c = this.kanvas(cv.width, cv.height); c.getContext("2d").drawImage(cv, 0, 0);
        const k = cv.width / (cv.clientWidth || cv.width / devicePixelRatio), p = typeof kiriPad === "function" && cv.clientWidth ? kiriPad() : {top: 0, bottom: 0, left: 0, right: 0};
        const f = [p.left * k, p.top * k, cv.width - p.right * k, cv.height - p.bottom * k];
        fin(this.polosan(c) ? null : {c, f: f[2] - f[0] > cv.width * .2 && f[3] - f[1] > cv.height * .2 ? f : [0, 0, cv.width, cv.height]});
      } catch (e) { fin(null); } });
      peta.triggerRepaint(); setTimeout(() => fin(null), 1500);
    });
  },
  polosan(c) { const s = this.kanvas(12, 12), x = s.getContext("2d"); x.drawImage(c, 0, 0, 12, 12); const d = x.getImageData(0, 0, 12, 12).data; let m = 0, v = 0, n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) m += d[i] + d[i + 1] + d[i + 2]; m /= n; for (let i = 0; i < d.length; i += 4) v += (d[i] + d[i + 1] + d[i + 2] - m) ** 2; return v / n < 30; },
  /* tempel tangkapan peta: potongan terbesar berasio blok, berpusat di area yang tidak tertutup panel (dibatasi tepi kanvas) */
  tempel(x, s, a, b, w, h) {
    const [f0, f1, f2, f3] = s.f, r = w / h;
    let sw = s.c.width, sh = sw / r; if (sh > s.c.height) { sh = s.c.height; sw = sh * r; }
    const sx = Math.max(0, Math.min(s.c.width - sw, (f0 + f2) / 2 - sw / 2)), sy = Math.max(0, Math.min(s.c.height - sh, (f1 + f3) / 2 - sh / 2));
    x.drawImage(s.c, sx, sy, sw, sh, a, b, w, h);
  },
  kotakFitur(f) { const bb = [180, 90, -180, -90]; const jalan = c => typeof c[0] === "number" ? (bb[0] = Math.min(bb[0], c[0]), bb[1] = Math.min(bb[1], c[1]), bb[2] = Math.max(bb[2], c[0]), bb[3] = Math.max(bb[3], c[1])) : c.forEach(jalan); jalan(f.geometry.coordinates); return bb; },
  /* peta sederhana tanpa ubin: batas provinsi + titik data, selalu bisa digambar */
  gambarPeta(x, a, b, w, h, prov) {
    const F = (this.T ? this.T.geo?.() : S.geo?.prov?.features) || [], fp = prov && F.find(f => f.properties.kode === prov);
    let bb = [94.6, -11.2, 141.2, 6.3];
    if (fp) { bb = this.kotakFitur(fp); const dx = (bb[2] - bb[0]) * .14 + .2, dy = (bb[3] - bb[1]) * .14 + .2; bb = [bb[0] - dx, bb[1] - dy, bb[2] + dx, bb[3] + dy]; }
    const kx = Math.cos((bb[1] + bb[3]) / 2 * Math.PI / 180), s = Math.min(w / ((bb[2] - bb[0]) * kx), h / (bb[3] - bb[1])), mx = (bb[0] + bb[2]) / 2, my = (bb[1] + bb[3]) / 2;
    const P = (lo, la) => [a + w / 2 + (lo - mx) * kx * s, b + h / 2 - (la - my) * s];
    x.save(); x.beginPath(); x.rect(a, b, w, h); x.clip();
    x.fillStyle = "#e4ecf5"; x.fillRect(a, b, w, h);
    const ag = this.hal === "banjir" ? agregat("b", 0) : null;
    for (const f of F) {
      const g = f.geometry, poli = g.type === "Polygon" ? [g.coordinates] : g.coordinates, k = f.properties.kode;
      x.beginPath(); for (const p of poli) for (const ring of p) ring.forEach(([lo, la], i) => { const [px, py] = P(lo, la); i ? x.lineTo(px, py) : x.moveTo(px, py); });
      x.fillStyle = prov && k !== prov ? "#d6dfea" : "#ffffff"; x.fill("evenodd");
      const lv = this.T ? 0 : ag ? ag[k]?.lv || 0 : S.wilayah?.[k]?.level || 0;
      if (lv && (!prov || k === prov)) { x.globalAlpha = prov ? .16 : .3; x.fillStyle = this.LV[lv]; x.fill("evenodd"); x.globalAlpha = 1; }
      x.strokeStyle = "#a9b8ca"; x.lineWidth = Math.max(1, w / 900); x.stroke();
    }
    const z = Math.max(.7, w / 1000) * (fp ? 1.35 : 1), titik = (lo, la, r, c) => { const [px, py] = P(lo, la); x.beginPath(); x.arc(px, py, r * z, 0, 7); x.fillStyle = c; x.fill(); x.lineWidth = 1.2 * z; x.strokeStyle = "rgba(255,255,255,.9)"; x.stroke(); };
    if (this.T) (this.T.titik?.() || []).forEach(q => titik(q.lon, q.lat, q.r || 4, q.w || this.LV[3]));
    else if (this.hal === "banjir") {
      const iH = S.rob ? Math.max(0, S.rob.hari.indexOf(S.hujan.hari_ini)) : 0;
      (S.sungai?.titik || []).filter(t => t.kelas).forEach(t => titik(t.lon, t.lat, 5, "#5f6fb0"));
      (S.rob?.titik || []).forEach(t => { const l = Math.max(0, ...t.lv.slice(iH).map(v => v || 0)); if (l) titik(t.lon, t.lat, 5, "#2b8c86"); });
    } else {
      const L = (fp ? klusterDi(prov) : S.kluster.features.filter(f => f.properties.level >= 1)).map(f => f.properties).sort((p, q) => p.level - q.level);
      for (const p of L) titik(p.lon, p.lat, [2.2, 3.2, 4.6, 6.4][p.level], this.LV[p.level]);
    }
    x.restore();
  },

  /* ---------------------------------------------------------------- kanvas */
  /* kartu tanpa grafik/tabel: tiap blok isi (kolom kiri/kanan, daftar) = satu halaman; turun selama isinya cuma satu anak */
  blokDom(art) {
    const lihat = e => e && e.offsetHeight > 40 && !e.matches(".bg-ex, .bs-sel, .pm-h, header, .ex-hd, .fn, .ex-ft, [hidden], .pgn, .pg, #pg, nav, .ct-hal");
    let ks = [...(art.querySelector(":scope > .ex-bd") || art).children].filter(lihat);
    /* satu pembungkus: turun bila isinya berdampingan (kolom kiri/kanan) atau terlalu tinggi untuk satu halaman */
    const dampingan = e => new Set([...e.children].filter(lihat).map(c => c.offsetLeft)).size > 1;
    for (let n = 0; n < 6 && ks.length === 1 && [...ks[0].children].filter(lihat).length && (dampingan(ks[0]) || ks[0].offsetHeight > 500); n++) {
      const anak = [...ks[0].children].filter(lihat); if (anak.length > 6 && ks[0].offsetHeight > 600) break;   /* sudah di tingkat daftar: dipotong di bawah */
      ks = anak; }
    /* daftar/kisi panjang (mis. Daftar berita): dipotong per kelompok item, dua baris per halaman, paling banyak 4 halaman */
    const out = [];
    for (const k of ks) { const it = [...k.children].filter(lihat), kol = new Set(it.slice(0, 8).map(c => c.offsetLeft)).size || 1;
      if (it.length > 6 && k.offsetHeight > 600) { const per = kol > 1 ? Math.max(6, kol * 2) : 6; for (let i = 0; i < it.length && out.length < 4; i += per) out.push({induk: k, item: it.slice(i, i + per)}); }
      else out.push(k); }
    return out.slice(0, 6);
  },
  async domKanvas(el) {
    await this.muatLib("dom");
    /* potongan daftar: salinan induk berisi sebagian item, dipasang sementara di tempat yang sama (gaya CSS tetap kena), di luar layar */
    if (el.induk) { const c = el.induk.cloneNode(false); el.item.forEach(i => c.append(i.cloneNode(true)));
      Object.assign(c.style, {position: "absolute", left: "-12000px", top: "0", width: el.induk.offsetWidth + "px"}); el.induk.parentElement.append(c);
      /* salinan memutar ulang animasi muncul (opacity 0): matikan supaya langsung tampil */
      [c, ...c.querySelectorAll("*")].forEach(n => { n.style.animation = "none"; n.style.transition = "none"; });
      try { return await this.domKanvas(c); } finally { c.remove(); } }
    const R = document.documentElement, tema = R.dataset.theme; R.dataset.theme = "light";
    const tombol = n => !(n.classList && (n.classList.contains("bg-ex") || n.classList.contains("bs-sel"))), o = {pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: false, imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      style: {position: "relative", left: "0", top: "0", margin: "0", transform: "none"}};   /* akar tangkapan: salinan di luar layar tidak ikut tergeser keluar bingkai */
    /* gambar lintas-asal (favikon media, thumbnail berita) bisa menggagalkan tangkapan: ulangi tanpa gambar itu */
    const luar = n => n.tagName === "IMG" && n.src && !n.src.startsWith(location.origin) && !n.src.startsWith("data:");
    try { return await htmlToImage.toCanvas(el, {...o, filter: tombol}); }
    catch (e) { return await htmlToImage.toCanvas(el, {...o, filter: n => tombol(n) && !luar(n)}); }
    finally { if (tema) R.dataset.theme = tema; else delete R.dataset.theme; }
  },
  /* galeri citra satelit (kartu Insight): tiap kompleks = nama + warna asli & SWIR berdampingan, 3 kolom */
  async galeriKanvas(g) {
    const ks = [...g.querySelectorAll(".ct-kartu2")], K = 2, iw = 300, gp = 24, nm = 44, cw = iw * 2 + 8, ch = nm + iw, bar = Math.ceil(ks.length / K);
    const c = this.kanvas(K * cw + (K - 1) * gp, bar * ch + (bar - 1) * gp), x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    const muat = s => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = s; });
    await Promise.all(ks.map(async (k, n) => { const a = (n % K) * (cw + gp), b = Math.floor(n / K) * (ch + gp);
      x.fillStyle = "#0b2545"; x.font = "700 22px Inter, system-ui, sans-serif"; const b1 = k.querySelector(".ct-nm b")?.textContent || ""; x.fillText(b1, a, b + 28);
      x.fillStyle = "#5b6b7f"; x.font = "500 18px Inter, system-ui, sans-serif"; x.fillText(k.querySelector(".ct-nm span")?.textContent || "", a + x.measureText(b1).width * 22 / 18 + 10, b + 28);
      const im = await Promise.all([...k.querySelectorAll("img")].slice(0, 2).map(i => muat(i.currentSrc || i.src)));
      im.forEach((i, j) => { const ix = a + j * (iw + 8), iy = b + nm; x.fillStyle = "#e8edf3"; x.fillRect(ix, iy, iw, iw); if (i) x.drawImage(i, ix, iy, iw, iw);
        const t = j ? "SWIR" : "Warna asli"; x.font = "700 15px Inter, system-ui, sans-serif"; const tw = x.measureText(t).width + 16;
        x.fillStyle = "rgba(11,37,69,.72)"; x.fillRect(ix + 8, iy + 8, tw, 24); x.fillStyle = "#fff"; x.fillText(t, ix + 16, iy + 25); }); }));
    return c;
  },
  kanvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; },
  f(x, w, s, d) { x.font = `${w} ${s}px ${d ? '"Plus Jakarta Sans", "Inter"' : '"Inter"'}, system-ui, -apple-system, "Segoe UI", sans-serif`; },
  pas(x, t, maks, w, s, d, min = 20) { let u = s; this.f(x, w, u, d); while (u > min && x.measureText(t).width > maks) this.f(x, w, u -= 2, d); return u; },
  potong(x, t, maks) { t = String(window.T ? window.T(String(t)) : t); if (x.measureText(t).width <= maks) return t; while (t.length > 1 && x.measureText(t + "…").width > maks) t = t.slice(0, -1); return t.trimEnd() + "…"; },
  baris(x, t, maks) { const out = []; let l = ""; for (const k of String(window.T ? window.T(String(t)) : t).split(/\s+/).filter(Boolean)) { const c = l ? l + " " + k : k; if (l && x.measureText(c).width > maks) { out.push(l); l = k; } else l = c; } if (l) out.push(l); return out; },
  barisKaya(x, seg, maks) {
    const tok = seg.flatMap(s => s.t.split(/(\s+)/).filter(Boolean).map(t => ({t: /^\s+$/.test(t) ? " " : t, hl: s.hl}))), out = [];
    let l = [], lw = 0;
    for (const k of tok) { const kw = x.measureText(k.t).width;
      if (k.t === " ") { if (l.length) { l.push(k); lw += kw; } continue; }
      if (lw + kw > maks && l.length) { while (l.at(-1)?.t === " ") l.pop(); out.push(l); l = []; lw = 0; }
      l.push(k); lw += kw; }
    while (l.at(-1)?.t === " ") l.pop(); if (l.length) out.push(l); return out;
  },
  /* panel di kertas putih: abu netral sangat muda, tanpa bayangan (pemilik, 15 Okt 2026) */
  kartu(x, a, b, w, h, r = 26) { x.fillStyle = "#f5f6f8"; x.beginPath(); x.roundRect(a, b, w, h, r); x.fill(); },
  /* logo Pantau Bencana (radar), sama dengan img/logo.svg; polos = siluet putih untuk watermark */
  logo(x, a, b, s, polos) {
    x.save(); x.translate(a, b); x.scale(s / 64, s / 64);
    if (!polos) { const g = x.createLinearGradient(0, 0, 64, 64); g.addColorStop(0, "#ff9a3d"); g.addColorStop(1, "#d63c2a"); x.fillStyle = g; x.beginPath(); x.roundRect(0, 0, 64, 64, 16); x.fill(); }
    x.strokeStyle = "#fff"; x.fillStyle = "#fff"; x.lineWidth = 4; x.beginPath(); x.arc(32, 32, 19, 0, Math.PI * 2); x.stroke();
    x.globalAlpha = .75; x.lineWidth = 3.5; x.beginPath(); x.arc(32, 32, 9, 0, Math.PI * 2); x.stroke(); x.globalAlpha = .9;
    x.beginPath(); x.moveTo(32, 32); x.lineTo(32, 11); x.arc(32, 32, 21, -Math.PI / 2, -Math.PI / 2 + 1.18); x.closePath(); x.fill(); x.globalAlpha = 1;
    x.beginPath(); x.arc(32, 32, 4, 0, Math.PI * 2); x.fill();
    x.restore();
  },
  async font() {
    try { await Promise.all(['800 60px "Plus Jakarta Sans"', '700 26px "Plus Jakarta Sans"', '500 22px "Inter"', '600 22px "Inter"', '700 22px "Inter"'].map(f => document.fonts.load(f))); await document.fonts.ready; } catch (e) {}
  },
  /* tata letak per templat & ukuran: [blok atau [blok kiri, blok kanan], porsi sisa tinggi] */
  TATA: {
    ringkas: {kotak: [["kpi4"], [["peta", "bar"], 1]], feed: [["kpi4"], ["peta", .55], ["bar", .45]], story: [["kpi22"], ["peta", .46], ["bar", .54]]},
    provinsi: {kotak: [["kpi4"], ["bar", 1]], feed: [["kpi4"], ["peta", .45], ["bar", .55]], story: [["kpi4"], ["peta", .45], ["bar", .55]]}, /* blok Rekomendasi dihapus (pemilik, 14 Okt 2026) */
    kompleks: {kotak: [["kpi4"], ["bar", 1]], feed: [["kpi4"], ["peta", .45], ["bar", .55]], story: [["kpi4"], ["peta", .45], ["bar", .55]]}, /* blok Rekomendasi dihapus (pemilik, 14 Okt 2026) */
    ex: {kotak: [["ex", 1]], feed: [["ex", 1]], story: [["ex", 1]]},
  },
  async render(tpl = this.tpl, uk = this.uk) {
    await this.muatKontak();
    const [W, H] = this.UK[uk], cv = this.kanvas(W, H), x = cv.getContext("2d"), P = 72, story = uk === "story";
    const atas = story ? 110 : 64, bawah = story ? H - 70 : H - 30;   /* kaki dirapatkan ke tepi bawah (pemilik, 15 Okt 2026) */
    const d = tpl === "ex" ? await this.dataEx() : tpl === "kompleks" ? this.dataKom(this._kom) : this.data(tpl === "provinsi" ? this.prov : "");
    x.fillStyle = "#fff"; x.fillRect(0, 0, W, H);   /* grafik: kertas putih, panel abu lembut (pemilik, 15 Okt 2026) */
    const y0 = this.kepala(x, W, P, atas, d, uk), y1 = this.kaki(x, W, H, P, bawah, story);
    const G = 24, tata = this.TATA[tpl][uk], tetap = {kpi4: 214, kpi22: 2 * 190 + 20};
    let sisa = y1 - y0 - G * (tata.length - 1);
    tata.forEach(([k]) => { if (tetap[k]) sisa -= tetap[k]; });
    let y = y0;
    for (const [k, porsi] of tata) {
      const h = tetap[k] || Math.floor(sisa * porsi);
      if (Array.isArray(k)) { const w2 = (W - 2 * P - G) / 2; await this.blok(x, k[0], P, y, w2, h, d); await this.blok(x, k[1], P + w2 + G, y, w2, h, d); }
      else await this.blok(x, k, P, y, W - 2 * P, h, d);
      y += h + G;
    }
    cv.d = d; return cv;
  },
  kepala(x, W, P, atas, d, uk) {
    const lebar = W - 2 * P, maksBaris = d.tpl === "ex" ? (uk === "story" ? 4 : 3) : 2, seg = (d.judulSeg || [{t: d.judul}]).map(g => window.T ? {...g, t: window.T(String(g.t ?? ""))} : g);
    /* kepala lebih rendah & huruf lebih kecil supaya isi dapat ruang lebih (pemilik, 14 Okt 2026) */
    let u = d.tpl === "ex" ? (uk === "story" ? 48 : 36) : uk === "kotak" ? 44 : 50; this.f(x, 800, u, true);
    let ln = this.barisKaya(x, seg, lebar);
    while (ln.length > maksBaris && u > 32) { u -= 3; this.f(x, 800, u, true); ln = this.barisKaya(x, seg, lebar); }
    if (ln.length > maksBaris) { ln = ln.slice(0, maksBaris); ln.at(-1).push({t: "…"}); }
    const adaSub = d.sub && d.tpl !== "ringkas" && d.tpl !== "provinsi", lh = Math.round(u * 1.12), yJ = atas + 76 + 22, ySub = yJ + ln.length * lh + 4, ex = d.tpl === "ex", bawah = ySub + (adaSub ? 34 : 0) + (ex ? atas - 8 : 64);
    const g = x.createLinearGradient(0, 0, W * .6, bawah * 1.2); g.addColorStop(0, this.C.navy2); g.addColorStop(1, this.C.navy);
    x.fillStyle = g; x.fillRect(0, 0, W, bawah);
    this.logo(x, P, atas, 76);
    x.textBaseline = "alphabetic"; x.fillStyle = "#fff"; this.f(x, 800, 32, true); x.fillText(this.K.nama, P + 98, atas + 34);
    this.f(x, 500, 23); x.fillStyle = "rgba(255,255,255,.78)"; x.fillText(this.potong(x, d.label + " · " + this.tglPanjang(), lebar - 98), P + 98, atas + 68);
    this.f(x, 800, u, true);
    /* judul rata kanan-kiri: baris selain yang terakhir dibentang, sisa ruang dibagi ke spasi (pemilik, 15 Okt 2026) */
    ln.forEach((l, i) => { const akhir = i === ln.length - 1, sp = l.filter(k => k.t === " ").length, isi = l.reduce((a, k) => a + x.measureText(k.t).width, 0);
      const tambah = !akhir && sp && lebar - isi < lebar * .25 ? (lebar - isi) / sp : 0; let px = P;
      for (const k of l) { x.fillStyle = k.hl ? this.C.hl : "#fff"; x.fillText(k.t, px, yJ + i * lh + u * .82); px += x.measureText(k.t).width + (k.t === " " ? tambah : 0); } });
    if (d.sub && d.tpl !== "ringkas" && d.tpl !== "provinsi") { this.f(x, 500, 23); x.fillStyle = "rgba(255,255,255,.84)"; x.fillText(this.potong(x, d.sub, lebar), P, ySub + 30); }
    /* grafik dibagikan tanpa kartu putih: tidak menumpuk ke pita navy, jadi judul berada di tengah pita (pemilik, 15 Okt 2026) */
    return ex ? bawah + 36 : bawah - 56;
  },
  kaki(x, W, H, P, bawah) {
    const y = bawah - 70;
    x.strokeStyle = this.C.garis; x.lineWidth = 2; x.beginPath(); x.moveTo(P, y); x.lineTo(W - P, y); x.stroke();
    /* baris 1: sumber (kiri) + "Data …" (kanan) sebaris; baris 2: akun resmi dibentang rata dari tepi ke tepi (pemilik, 15 Okt 2026) */
    this.f(x, 500, 21); x.fillStyle = this.C.tinta2; x.textAlign = "right"; const dt = "Data " + jamWIB(this.acuan()); /* sama dengan lencana "Data …" di header (lintasan satelit terakhir) */ x.fillText(dt, W - P, y + 34); const dw = x.measureText(dt).width; x.textAlign = "left";
    x.fillText(this.potong(x, this.K.sumber, W - 2 * P - dw - 24), P, y + 34);
    /* akun resmi per platform (dari data/kontak.json) lalu alamat situs: tiap ikon diberi nama akunnya sendiri,
       bukan lima ikon yang seolah-olah semuanya menunjuk ke situs */
    const sos = (!SITUS_W && this.kontak && this.kontak.sosial) || {}, akun = [];   /* akun Teras Urban tidak tampil di *.workers.dev */
    const nama = u => { try { const q = new URL(u).pathname.split("/").filter(Boolean); return q[q.length - 1] || ""; } catch (e) { return ""; } };
    if (sos.instagram) akun.push(["#d62976", "ig", "@" + nama(sos.instagram)]);
    if (sos.linkedin) akun.push(["#0a66c2", "in", "Teras Urban"]);
    if (sos.x) akun.push(["#111", "X", "@" + nama(sos.x)]);
    if (sos.facebook) akun.push(["#1877f2", "f", nama(sos.facebook)]);
    if (sos.tiktok) akun.push(["#111", "♪", "@" + nama(sos.tiktok).replace(/^@/, "")]);
    if (sos.youtube) akun.push(["#ff0000", "▶", nama(sos.youtube)]);
    akun.push([this.C.navy2, "web", this.situs()]);
    const s = 28, gp = 8, by = y + 64 - 21; this.f(x, 700, 20);
    const lb = [], ruang = W - 2 * P; for (const k of akun) { const tw = s + gp + x.measureText(k[2]).width; if (lb.reduce((p, v) => p + v + 22, tw) > ruang) break; lb.push(tw); }
    const sela = lb.length > 1 ? (ruang - lb.reduce((p, v) => p + v, 0)) / (lb.length - 1) : 0; let a = lb.length > 1 ? P : (W - lb[0]) / 2;
    for (const [i, [w, t, teks]] of akun.slice(0, lb.length).entries()) {
      this.f(x, 700, 20); const tw = x.measureText(teks).width;
      x.fillStyle = w; x.beginPath(); x.roundRect(a, by, s, s, 8); x.fill(); x.strokeStyle = "#fff"; x.fillStyle = "#fff"; x.lineWidth = 2.2;
      if (t === "ig") { x.beginPath(); x.roundRect(a + 7, by + 7, 14, 14, 4.5); x.stroke(); x.beginPath(); x.arc(a + 14, by + 14, 3.6, 0, Math.PI * 2); x.stroke(); }
      else if (t === "web") { x.beginPath(); x.arc(a + 14, by + 14, 8, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.ellipse(a + 14, by + 14, 3.6, 8, 0, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.moveTo(a + 6, by + 14); x.lineTo(a + 22, by + 14); x.stroke(); }
      else { this.f(x, 800, 16); x.textAlign = "center"; x.fillText(t, a + s / 2, by + 20); x.textAlign = "left"; }
      this.f(x, 700, 20); x.fillStyle = this.C.navy2; x.fillText(teks, a + s + gp, y + 64); a += lb[i] + sela;
    }
    return y - 26;
  },
  async blok(x, k, a, b, w, h, d) {
    if (k === "kpi4") { const g = 18, cw = (w - 3 * g) / 4; d.kpi.forEach((q, i) => this.kpi(x, a + i * (cw + g), b, cw, h, q, true)); }
    else if (k === "kpi22") { const g = 20, cw = (w - g) / 2, ch = (h - g) / 2; d.kpi.forEach((q, i) => this.kpi(x, a + (i % 2) * (cw + g), b + Math.floor(i / 2) * (ch + g), cw, ch, q, false)); }
    else if (k === "bar") this.bar(x, a, b, w, h, d.bar);
    else if (k === "rek") this.rek(x, a, b, w, h, d.rek);
    else if (k === "peta") await this.petaBlok(x, a, b, w, h, d);
    else if (k === "ex") { const img = f => new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = this.dasar + f; });
      /* QR langsung ke https://pantau.terasurban.com (koreksi galat H, jadi logo di tengah tetap terbaca) */
      this._qr ||= Promise.all([img("img/qr-pantau.png"), img("img/teras-urban-mark-navy.png"), img("img/logo.svg?v=2")]); this.exBlok(x, a, b, w, h, d, ...(SITUS_W ? [null, null, (await this._qr)[2]] : await this._qr)); }   /* QR & logo Teras Urban tidak tampil di *.workers.dev */
  },
  /* ubin KPI gaya Oyenza: panel abu tanpa garis, ikon dalam lingkaran lembut, label kecil, angka besar, keterangan sebagai pil (pemilik, 15 Okt 2026) */
  IKK: {api: "M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-6 1-8.5z", lapis: "M12 3 3 8l9 5 9-5zM3 13l9 5 9-5", awas: "M12 4 2.5 20h19zM12 10v4.5M12 17.5v.01",
    cuaca: "M12 3v2M5.6 5.6 7 7M3 12h2M17 7l1.4-1.4M12 8a4 4 0 0 0-3.9 4.9A3.5 3.5 0 0 0 9 20h8a3.5 3.5 0 0 0 .5-7A4 4 0 0 0 12 8z"},
  kpi(x, a, b, w, h, q, pendek) {
    const T = t => window.T ? window.T(String(t)) : String(t);
    x.fillStyle = "#f5f6f8"; x.beginPath(); x.roundRect(a, b, w, h, 26); x.fill();
    const pd = pendek ? 24 : 32, lw = w - 2 * pd, ik = pendek ? 44 : 52;
    x.fillStyle = "#fff"; x.beginPath(); x.arc(a + pd + ik / 2, b + pd + ik / 2, ik / 2, 0, 7); x.fill();
    x.save(); x.translate(a + pd + ik / 2 - 12 * ik / 44, b + pd + ik / 2 - 12 * ik / 44); x.scale(ik / 44, ik / 44); x.strokeStyle = q.w; x.lineWidth = 2; x.lineCap = x.lineJoin = "round";
    x.stroke(new Path2D(this.IKK[q.ik] || this.IKK.api)); x.restore();
    this.f(x, 700, pendek ? 17 : 19); x.fillStyle = this.C.tinta2; x.fillText(this.potong(x, T(pendek ? q.s : q.l), lw - ik - 12), a + pd + ik + 12, b + pd + ik / 2 + 6);
    const u = this.pas(x, q.v, lw, 800, pendek ? 58 : 76, true, 28); x.fillStyle = this.C.tinta; x.fillText(q.v, a + pd, b + pd + ik + 14 + u * .86);
    const kt = T(pendek ? q.ks || q.ket : q.ket); if (kt && kt !== "–") { this.f(x, 700, pendek ? 15 : 17); const tw = Math.min(lw, x.measureText(kt).width + 24), py = b + h - pd - 32;
      x.fillStyle = this.warnaPil(q.w); x.beginPath(); x.roundRect(a + pd, py, tw, 32, 16); x.fill(); x.fillStyle = q.w; x.fillText(this.potong(x, kt, tw - 24), a + pd + 12, py + 22); }
  },
  warnaPil(w) { const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(w || ""); return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},.13)` : "rgba(11,37,69,.08)"; },
  judulBlok(x, t, a, b, lw) { this.f(x, 700, 26, true); x.fillStyle = this.C.tinta; x.fillText(this.potong(x, t, lw), a, b); },
  bar(x, a, b, w, h, B) {
    this.kartu(x, a, b, w, h); const pd = 32, lw = w - 2 * pd;
    this.judulBlok(x, w < 600 ? B.pendek || B.judul : B.judul, a + pd, b + pd + 22, lw);
    const sempit = w < 600, ruang = h - pd - 52 - pd + 8, R = B.rows.slice(0, Math.max(1, Math.floor(ruang / (sempit ? 58 : 30)))), y0 = b + pd + 52, rh = Math.min(sempit ? 76 : 66, ruang / Math.max(R.length, 1)), mx = Math.max(1, ...R.map(r => r.v));
    if (!R.length) { this.f(x, 500, 22); x.fillStyle = this.C.tinta2; x.fillText("Belum ada data hari ini.", a + pd, y0 + 34); return; }
    this.f(x, 700, 22); const vw = Math.max(...R.map(r => x.measureText(r.t).width)) + 16;
    R.forEach((r, i) => {
      const y = y0 + i * rh;
      if (sempit) {
        this.f(x, 600, 21); x.fillStyle = this.C.tinta; x.fillText(this.potong(x, r.n, lw - vw), a + pd, y + rh * .42);
        this.f(x, 700, 21); x.textAlign = "right"; x.fillText(r.t, a + w - pd, y + rh * .42); x.textAlign = "left";
        const by = y + rh * .55, bh = Math.max(8, rh * .2);
        x.fillStyle = this.C.jalur; x.beginPath(); x.roundRect(a + pd, by, lw, bh, bh / 2); x.fill();
        x.fillStyle = r.w; x.beginPath(); x.roundRect(a + pd, by, Math.max(bh, lw * r.v / mx), bh, bh / 2); x.fill();
      } else {
        const nw = lw * .34, bx = a + pd + nw + 12, bw = lw - nw - 12 - vw, bh = Math.min(30, rh * .5), by = y + (rh - bh) / 2;
        this.f(x, 600, 22); x.fillStyle = this.C.tinta; x.fillText(this.potong(x, r.n, nw), a + pd, by + bh * .5 + 8);
        x.fillStyle = this.C.jalur; x.beginPath(); x.roundRect(bx, by, bw, bh, 8); x.fill();
        x.fillStyle = r.w; x.beginPath(); x.roundRect(bx, by, Math.max(10, bw * r.v / mx), bh, 8); x.fill();
        this.f(x, 700, 22); x.fillStyle = this.C.tinta; x.textAlign = "right"; x.fillText(r.t, a + w - pd, by + bh * .5 + 8); x.textAlign = "left";
      }
    });
  },
  rek(x, a, b, w, h, R) {
    this.kartu(x, a, b, w, h); const pd = 32, lw = w - 2 * pd - 46;
    this.judulBlok(x, "Rekomendasi", a + pd, b + pd + 22, w - 2 * pd);
    let y = b + pd + 52; const batas = b + h - pd, lh = 29; this.f(x, 500, 21);
    for (let i = 0; i < R.length; i++) {
      let ln = this.baris(x, R[i].t, lw); const muat = Math.floor((batas - y) / lh); if (muat < 1) break;
      if (ln.length > muat) { ln = ln.slice(0, muat); ln[muat - 1] = this.potong(x, ln[muat - 1] + " …", lw); }
      x.fillStyle = this.LV[R[i].lv] || this.LV[0]; x.beginPath(); x.arc(a + pd + 15, y + 15, 15, 0, 7); x.fill();
      this.f(x, 800, 16); x.fillStyle = "#fff"; x.textAlign = "center"; x.fillText(String(i + 1), a + pd + 15, y + 21); x.textAlign = "left";
      this.f(x, 500, 21); x.fillStyle = this.C.tinta; ln.forEach((l, j) => x.fillText(l, a + pd + 46, y + 22 + j * lh));
      y += ln.length * lh + 14;
    }
  },
  async petaBlok(x, a, b, w, h, d) {
    this.kartu(x, a, b, w, h);
    x.save(); x.beginPath(); x.roundRect(a, b, w, h, 26); x.clip();
    /* ringkasan nasional selalu peta Indonesia penuh (digambar); tangkapan layar hanya untuk provinsi/kompleks yang sedang dibuka */
    const snap = this.pakaiPeta && d.prov && S.jalur?.[0] === d.prov ? await this.tangkap() : null;
    if (snap) this.tempel(x, snap, a, b, w, h); else this.gambarPeta(x, a, b, w, h, d.prov);
    x.restore();
    const isi = snap ? [["", "Tampilan peta saat ini · © OpenFreeMap © OpenStreetMap"]] : [["", d.petaKet + ":"], ...d.legenda];
    this.f(x, 600, 18); let cw = 28; isi.forEach(([c, t]) => cw += x.measureText(t).width + (c ? 30 : 12));
    cw = Math.min(cw, w - 32);
    x.fillStyle = "rgba(11,37,69,.82)"; x.beginPath(); x.roundRect(a + 16, b + h - 56, cw, 40, 20); x.fill();
    let px = a + 30; x.save(); x.beginPath(); x.rect(a + 16, b + h - 56, cw - 8, 40); x.clip();
    isi.forEach(([c, t]) => { if (c) { x.fillStyle = c; x.beginPath(); x.arc(px + 7, b + h - 36, 7, 0, 7); x.fill(); px += 20; } x.fillStyle = "#fff"; x.fillText(t, px, b + h - 30); px += x.measureText(t).width + 12; });
    x.restore();
  },
  /* grafik langsung di kertas (tanpa kartu), selebar mungkin. Urutan: satuan, kotak sorotan (angka utama grafik), grafik,
     lalu ajakan "Cek data lengkap" + QR di dasar (pemilik, 15 Okt 2026) */
  exBlok(x, a, b, w, h, d, qr, mark, ikon) {
    if (d.kosong || !d.img) { this.f(x, 500, 24); x.fillStyle = this.C.tinta2; x.fillText("Buka tab Insight sekali, lalu coba lagi.", a, b + 30); return; }
    let y = b; this.f(x, 600, 22); x.fillStyle = this.C.tinta2;
    if (d.unit) { this.baris(x, d.unit, w).slice(0, 2).forEach(l => { x.fillText(l, a, y + 24); y += 32; }); y += 10; }
    /* dasar: catatan kaki lalu ajakan + QR */
    /* ajakan: panel putih berbayang, ikon aplikasi, domain besar, QR berbingkai tipis (pemilik, 15 Okt 2026) */
    const qs = 156, yC = b + h - qs;
    x.fillStyle = "#f3f5f8"; x.beginPath(); x.roundRect(a, yC, w, qs, 32); x.fill();
    const ik = 84, ix = a + 28, iy = yC + (qs - ik) / 2; if (ikon) x.drawImage(ikon, ix, iy, ik, ik);
    if (qr) { const qw = qs - 36, qx = a + w - qw - 18, qy = yC + 18; x.fillStyle = "#fff"; x.beginPath(); x.roundRect(qx, qy, qw, qw, 18); x.fill();
      const qi = qw - 18; x.drawImage(qr, qx + 9, qy + 9, qi, qi);
      if (mark) { const m = qi * .26, mx = qx + 9 + (qi - m) / 2, my = qy + 9 + (qi - m) / 2; x.fillStyle = "#fff"; x.beginPath(); x.roundRect(mx - 3, my - 3, m + 6, m + 6, 5); x.fill();
        const r = Math.min(m / mark.width, m / mark.height); x.drawImage(mark, mx + (m - mark.width * r) / 2, my + (m - mark.height * r) / 2, mark.width * r, mark.height * r); } }
    const tx = ix + (ikon ? ik + 24 : 0), tw = w - (tx - a) - qs - 20;
    x.fillStyle = this.C.tinta2; this.f(x, 600, 21); x.fillText(this.potong(x, this.en() ? "Full data & live map" : "Data lengkap & peta langsung", tw), tx, yC + 62);
    x.fillStyle = this.C.navy2; this.pas(x, this.situs(), tw, 800, 40, true, 24); x.fillText(this.situs(), tx, yC + 108);
    this.f(x, 500, 18); x.fillStyle = this.C.tinta2; const fn = d.fn ? this.baris(x, d.fn.replace(/\s*·?\s*Lihat data lengkap di \S+/, ""), w).slice(0, 2) : [], yF = yC - 20 - fn.length * 26;
    fn.forEach((l, i) => x.fillText(l, a, yF + 18 + i * 26));
    /* sorotan di atas grafik */
    const sor = (d.sorot || []).slice(0, 3), tS = 162, gS = 32, ruang0 = yF - 24 - y, pakai = sor.length > 1 && ruang0 - tS - gS > d.img.height * Math.min(1, w / d.img.width) * .5;
    /* kotak sorotan gaya Oyenza: panel putih tanpa garis, nomor urut dalam lingkaran lembut, angka besar + satuan kecil, nama di bawah */
    if (pakai) { const g = 18, cw = (w - g * (sor.length - 1)) / sor.length;
      sor.forEach((q, i) => { const xx = a + i * (cw + g), m = String(q.v).match(/^([\d.,]+)\s*(.*)$/) || [0, q.v, ""], [nm, ...ket] = String(q.n).split(" · ");
        /* kotak sorotan: label kecil abu di atas, angka besar dengan satuan menempel (±58% ukuran angka, satu garis dasar), keterangan abu di bawah (pemilik, 15 Okt 2026) */
        x.fillStyle = "#f5f6f8"; x.beginPath(); x.roundRect(xx, y, cw, tS, 26); x.fill();
        this.f(x, 700, 23); x.fillStyle = this.C.tinta2; x.fillText(this.potong(x, nm, cw - 52), xx + 26, y + 42);
        let u = 62; const lb = cw - 52, uk = () => { this.f(x, 800, u, true); const nw = x.measureText(m[1]).width; this.f(x, 800, Math.round(u * .58), true); return nw + (m[2] ? 3 + x.measureText(m[2]).width : 0); };
        while (u > 28 && uk() > lb) u -= 2;
        this.f(x, 800, u, true); x.fillStyle = this.C.navy2; x.fillText(m[1], xx + 26, y + 108);
        if (m[2]) { const nw = x.measureText(m[1]).width; this.f(x, 800, Math.round(u * .58), true); x.fillText(this.potong(x, m[2], cw - 52 - nw - 3), xx + 26 + nw + 3, y + 108); }
        if (ket.length) { this.f(x, 500, 17); x.fillStyle = this.C.tinta2; x.fillText(this.potong(x, ket.join(" · ").replace(/^[•●\s]+/, ""), cw - 52), xx + 26, y + 142); } });
      y += tS + gS; }
    const ruang = yF - 24 - y, s = Math.min(w / d.img.width, ruang / d.img.height), iw = d.img.width * s, ih = d.img.height * s;
    /* ruang tegak berlebih (story, grafik lebar): isi dengan tabel angka grafik itu sendiri di bawahnya (pemilik, 15 Okt 2026) */
    const sisa = ruang - ih - 32, nb = d.tabelTip ? Math.min(14, d.tabelTip.querySelectorAll("tbody tr").length, Math.floor((sisa - 54) / 66)) : 0;
    if (nb >= 3) { x.drawImage(d.img, a + (w - iw) / 2, y, iw, ih); const tc = this.tabelKanvas(d.tabelTip, nb), th = tc.height * w / tc.width;
      x.drawImage(tc, a, y + ih + 32 + Math.max(0, (sisa - th) / 2), w, th); return; }
    x.drawImage(d.img, a + (w - iw) / 2, y + Math.max(0, (ruang - ih) / 2), iw, ih);
  },

  /* ---------------------------------------------------------------- pratinjau */
  async perbarui() {
    const t = this._t = (this._t || 0) + 1, d = this.dialog(), q = s => d.querySelector(s), st = q("#bgStG");
    d.querySelectorAll("[data-tpl]").forEach(b => b.setAttribute("aria-pressed", b.dataset.tpl === this.tpl));
    d.querySelectorAll("[data-uk]").forEach(b => b.setAttribute("aria-pressed", b.dataset.uk === this.uk));
    q("#bgProv").hidden = this.tpl !== "provinsi"; q("#bgEx").hidden = true; /* grafik dipilih dari kartu yang diklik */ q(".bg-cek").hidden = true; /* tangkapan peta: selalu otomatis (pemilik, 14 Okt 2026) */
    st.textContent = "Menyiapkan gambar…"; q("#bgImg").classList.add("muat");
    try {
      await this.font();
      if (this.tpl === "ex") await this._exP;
      const cv = this.cv = await this.render(); if (t !== this._t) return;
      const blob = await new Promise(r => cv.toBlob(r, "image/png")); if (t !== this._t) return;
      this.blob = blob; const img = q("#bgImg"); if (img.src) URL.revokeObjectURL(img.src); img.src = URL.createObjectURL(blob);
      img.alt = `Pratinjau ${this.TPL.find(z => z[0] === this.tpl)[1]}, ${this.UK[this.uk][2]}`; img.classList.remove("muat");
      st.textContent = "";
      q("#bgTeks").value = this.keterangan(cv.d);
      const hl = cv.d.halaman, ph = q("#bgHal"); ph.hidden = !(hl?.n > 1); if (hl?.n > 1) ph.querySelector("span").textContent = `Halaman ${hl.i + 1} dari ${hl.n}`;
      q("#bgUnduh").textContent = hl?.n > 1 ? `Unduh ${hl.n} PNG` : "Unduh PNG";
      q("#bgBagiG").hidden = !(navigator.canShare && navigator.canShare({files: [new File([blob], "a.png", {type: "image/png"})]}));
      this.thumbs(t);
    } catch (e) { console.error(e); if (t === this._t) st.textContent = "Gagal membuat gambar: " + e.message; }
  },
  async thumbs(t) {
    const uk = this.uk; if (this._th[uk]) return; this._th[uk] = 1;
    const d = this.dialog(), ex = await this._exP;
    d.querySelector('[data-tpl="ex"]').disabled = !ex.length;
    for (const [k] of this.TPL) {
      if (t !== this._t) { this._th[uk] = 0; return; }
      if ((k === "ex" && !ex.length) || (k === "kompleks" && !this._kom) || (this.T && (k === "kompleks" || k === "provinsi"))) continue;
      const c = d.querySelector(`[data-tpl="${k}"] canvas`), src = k === this.tpl && this.cv?.width === this.UK[uk][0] && this.cv.height === this.UK[uk][1] ? this.cv : await this.render(k, uk), [W, H] = this.UK[uk];
      c.width = 90; c.height = Math.round(90 * H / W);
      const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(src, 0, 0, c.width, c.height);
    }
  },
  keterangan(d) {
    const tg = this.tglPanjang(), url = this.tautan(), tag = s => "#" + String(s).normalize("NFD").replace(/[^A-Za-z0-9]/g, "");
    const prov = d.tpl === "provinsi" ? [d.judul] : (d.bar?.rows || []).slice(0, 3).map(r => r.n);
    const tagar = [...this.K.tagar, ...prov.map(tag), this.K.akhir].join(" ");
    /* caption: kalimat utama, konteks dari kartu, sumber + tanggal, lalu ajakan membuka situs. Tanpa emoji dan basa-basi (pemilik, 14 Okt 2026) */
    const titik = t => { t = String(t || "").replace(/\s+/g, " ").trim(); return t && !/[.!?]$/.test(t) ? t + "." : t; };
    const sumber = (d.fn || "").match(/Sumber:\s*([^·\n]+)/)?.[1]?.trim(), konteks = [d.sub, (d.fn || "").replace(/Sumber:[^·\n]+/, "").replace(/^[\s·]+|[\s·]+$/g, "")].map(titik).filter(Boolean).join(" ");
    if (d.tpl === "ex") return `${titik(d.judul)}${konteks ? `\n\n${konteks}` : ""}\n\nData per ${tg}${sumber ? `, diolah dari ${sumber}` : ""}. ${this.T ? "Peta dan grafik lengkapnya" : "Peta titik panas dan grafik lengkapnya"} bisa dibuka di https://${this.situs()}\n\n${tagar}`;
    const K = d.kpi.map(q => q.v), top = (d.bar?.rows || []).slice(0, 3).map(r => `${r.n} (${r.t})`).join(", ");
    let isi;
    if (this.T) isi = this.T.keterangan?.(d, tg) || `${d.judul}, ${tg}. ${d.sub}.`;
    else if (this.hal === "banjir") isi = `${d.tpl === "provinsi" ? d.judul : "Situasi banjir, longsor, dan rob"}, ${tg}: ${K[0]} kecamatan berstatus banjir (${d.kpi[0].ket}). Hujan 3 hari terlebat ${K[1]}, ${K[2]} titik sungai di atas ambang banjir 2 tahunan, ${K[3]} titik pantai berstatus rob.`;
    else isi = d.tpl === "kompleks" ? `${d.label} di ${d.judul}: ${d.sub}.`
      : `${d.tpl === "provinsi" ? d.judul : "Indonesia"}, ${tg}. Satelit mendeteksi ${K[0]} titik panas hari ini. Dari ${K[1]} cluster yang aktif, ${K[2]} perlu diprioritaskan untuk dipadamkan. Bahaya cuaca kebakaran (FWI) mencapai ${K[3]}, kategori ${d.kpi[3].ket.replace(/^bahaya cuaca /, "")}.`;
    const rek = d.tpl === "provinsi" && d.rek[0] ? `\n\nLangkah utama: ${d.rek[0].t}.` : "";
    return `${isi}${top ? `\n\nPaling banyak di ${top}.` : ""}${rek}\n\nPeta dan data lengkapnya: https://${this.situs()}\n\n${tagar}`;
  },
  /* semua halaman kartu yang dibagi (1 bila kartunya muat satu halaman), urut dari halaman 1 */
  async semuaBlob() {
    const n = this.cv?.d?.halaman?.n || 1; if (n < 2) return this.blob ? [this.blob] : [];
    const asal = this.halEx, out = [];
    try { for (let i = 0; i < n; i++) { this.halEx = i; const cv = await this.render(); out.push(await new Promise(r => cv.toBlob(r, "image/png"))); } } finally { this.halEx = asal; }
    return out;
  },
  namaHal(i, n) { const b = this.namaBerkas("png"); return n > 1 ? b.replace(/\.png$/, `-${i + 1}.png`) : b; },
  async unduhSemua() { const bs = await this.semuaBlob(); for (const [i, b] of bs.entries()) { this.simpan(b, this.namaHal(i, bs.length)); if (bs.length > 1) await new Promise(r => setTimeout(r, 350)); } },
  async bagiGambar() {
    if (!this.blob) return;
    const bs = await this.semuaBlob(), fs = bs.map((b, i) => new File([b], this.namaHal(i, bs.length), {type: "image/png"})), teks = this.dialog().querySelector("#bgTeks").value;
    try { await navigator.share({files: fs, title: document.title, text: teks}); }
    catch (e) { if (e.name !== "AbortError") { await this.unduhSemua(); this.kabar("Berbagi berkas tidak didukung; gambar diunduh."); } }
  },

  /* ---------------------------------------------------------------- ekspor */
  muatLib(k) {
    const [url, ada] = this.LIB[k]; if (ada()) return Promise.resolve();
    return (this._lib ||= {})[k] ||= new Promise((ok, gagal) => { const s = document.createElement("script"); s.src = url; s.crossOrigin = "anonymous"; s.async = true;
      s.onload = () => ada() ? ok() : gagal(new Error("Pustaka tidak lengkap: " + url)); s.onerror = () => { delete this._lib[k]; gagal(new Error("Gagal memuat " + url)); }; document.head.appendChild(s); });
  },
  async ekspor(jenis) {
    const d = this.dialog(), st = d.querySelector("#bgStE"), tb = [...d.querySelectorAll("[data-eks]")];
    if (tb.some(b => b.disabled)) return;
    tb.forEach(b => b.disabled = true); st.textContent = "Memuat pustaka…";
    try {
      await this.muatLib(jenis === "xlsx" ? "xlsx" : jenis);
      if (jenis === "pdf") await this.muatLib("tabel");
      st.textContent = "Menyusun berkas…"; await new Promise(r => setTimeout(r, 30));
      const r = await this[{xlsx: "keExcel", pdf: "kePdf", pptx: "kePptx"}[jenis]]();
      this.simpan(r.blob, r.nama); st.textContent = `${r.nama} · ${Math.round(r.blob.size / 1024)} KB · ${r.info}`;
    } catch (e) { console.error(e); st.textContent = "Ekspor gagal: " + e.message; }
    finally { tb.forEach(b => b.disabled = false); }
  },
  namaEkspor(ext) { return `${this.T ? this.hal : this.hal === "banjir" ? "posko-banjir" : "posko-karhutla"}-${this.tanggal()}.${ext}`; },
  /* tabel provinsi ringkas untuk PDF & slide */
  tabelProv() {
    if (this.hal === "banjir") {
      const ag = agregat("b", 0), agL = agregat("l", 0), iH = S.rob ? Math.max(0, S.rob.hari.indexOf(S.hujan.hari_ini)) : 0;
      const R = Object.keys(S.meta.provinsi).map(k => { const a = ag[k] || {lv: 0, n: [0, 0, 0, 0]}, h3 = Math.max(0, ...S.hujan.grid.filter(g => g.prov === k).map(g => g.h3 || 0));
        const sg = (S.sungai?.titik || []).filter(t => t.prov === k && t.kelas).length, rob = (S.rob?.titik || []).filter(t => (t.prov === namaProv(k) || t.prov === k) && Math.max(0, ...t.lv.slice(iH).map(v => v || 0)) > 0).length;
        return {k, lv: a.lv, n: a.n, l: (agL[k]?.n[2] || 0) + (agL[k]?.n[3] || 0), h3, sg, rob}; })
        .sort((a, b) => b.lv - a.lv || b.n[3] - a.n[3] || b.n[2] - a.n[2] || b.n[1] - a.n[1] || b.h3 - a.h3);
      return {kepala: ["Provinsi", "Status", "Awas", "Siaga", "Waspada", "Longsor siaga+", "Hujan 3h (mm)", "Sungai > Q2", "Rob"], angka: [2, 3, 4, 5, 6, 7, 8],
        baris: R.map(r => [namaProv(r.k), LEVEL[r.lv], r.n[3], r.n[2], r.n[1], r.l, Math.round(r.h3), r.sg, r.rob]), aktif: R.filter(r => r.lv || r.h3 >= 50).length};
    }
    const h = this.hariIni(), R = Object.keys(S.meta.provinsi).map(k => { const kl = klusterDi(k); return {k, n: h.per[k] || 0, kl: kl.length, p: kl.filter(f => f.properties.level === 3).length, s: kl.filter(f => f.properties.level === 2).length, w: S.wilayah[k] || {}}; })
      .sort((a, b) => b.n - a.n || b.kl - a.kl);
    return {kepala: ["Provinsi", "Status", "Titik hari ini", "Cluster aktif", "Prioritas", "Siaga", "FWI maks"], angka: [2, 3, 4, 5, 6],
      baris: R.map(r => [namaProv(r.k), S.meta.status[r.w.level ?? 0], r.n, r.kl, r.p, r.s, r.w.fwi_maks ?? null]), aktif: R.filter(r => r.n || r.kl).length};
  },
  /* kompleks prioritas (karhutla) / kecamatan siaga-awas (banjir) */
  tabelUtama(n) {
    if (this.hal === "banjir") {
      const R = Object.entries(S.st.kec).map(([k, v]) => ({k, l: v.b?.[0] || 0, m: Math.max(0, ...(v.b || [0])), h3: v.h3, a7: v.a7})).filter(r => r.l >= 2 || r.m >= 3)
        .sort((a, b) => b.l - a.l || b.m - a.m || (b.h3 || 0) - (a.h3 || 0)).slice(0, n);
      return {judul: "Kecamatan siaga & awas banjir", kepala: ["Kecamatan", "Kab/Kota", "Provinsi", "Hari ini", "Maks 4 hari", "Hujan 3h (mm)", "Hujan 7h lalu (mm)"], angka: [5, 6],
        baris: R.map(r => { const [p, kb, kc] = r.k.split("|"); return [kc, kb, namaProv(p), LEVEL[r.l], LEVEL[r.m], Math.round(r.h3 ?? 0), Math.round(r.a7 ?? 0)]; })};
    }
    const R = S.kluster.features.map(f => f.properties).filter(p => p.level === 3).sort((a, b) => a.peringkat - b.peringkat).slice(0, n);
    return {judul: "Cluster prioritas pemadaman", kepala: ["Kode", "Provinsi", "Kab/Kota", "Kecamatan", "Piksel 24 j", "Hari", "Luas maks (ha)", "FWI", "DC", "Gambut", "Daops terdekat"], angka: [4, 5, 6, 7, 8, 10],
      baris: R.map(p => [p.id, namaProv(p.prov), p.kab, p.kec, p.px24, p.hari, Math.round(p.luas), p.fwi, Math.round(p.dc), p.gambut ? "ya" : "–", p.daops ? `${p.daops} (${fmt(p.jarak_daops)} km)` : "–"])};
  },
  rekProv() {
    if (this.hal === "banjir") { const ag = agregat("b", 0); return Object.keys(S.meta.provinsi).filter(k => (ag[k]?.lv || 0) >= 2).sort((a, b) => ag[b].lv - ag[a].lv || ag[b].n[3] - ag[a].n[3] || ag[b].n[2] - ag[a].n[2]).slice(0, 8)
      .map(k => { const d = this.data(k); return {k, nama: namaProv(k), status: LEVEL[d.lv], lv: d.lv, ket: d.sub, rek: d.rek}; }); }
    return (S.meta.prioritas || []).map(k => { const d = this.data(k); return {k, nama: namaProv(k), status: S.meta.status[d.lv], lv: d.lv, ket: d.sub, rek: d.rek}; });
  },
  catatanMetode() {
    if (this.hal === "banjir") return [
      ...Object.entries(S.meta.sumber || {}).map(([k, v]) => `${k[0].toUpperCase() + k.slice(1)}: ${v}.`),
      "Status kecamatan Normal, Waspada, Siaga, Awas dihitung dari prakiraan hujan, debit sungai, dan bahaya InaRISK; aturan lengkap di tab Metode.",
      "Sungai: ambang Q2/Q5/Q20 dari debit maksimum tahunan 1997–2025 (distribusi Gumbel), Copernicus GloFAS lewat Open-Meteo.",
      "Rob: muka laut maksimum harian Open-Meteo Marine terhadap ambang persentil 95/99 titik itu sejak 2022; peringatan resmi dari BMKG Maritim.",
      "Riwayat kejadian: DIBI BNPB. Fitur banjir masih uji coba; cek peringatan resmi BMKG dan BPBD sebelum bertindak."];
    const db = S.meta.dbscan || {};
    return [
      "Titik panas: NASA FIRMS (MODIS, VIIRS S-NPP, NOAA-20), semua tingkat keyakinan, dihitung per hari kalender WIB.",
      `Cluster: titik dikelompokkan (DBSCAN radius ${fmt(db.eps_km)} km, jendela ${fmt(db.jendela_hari)} hari); aktif ${fmt(db.aktif_jam)} jam, di gambut ${fmt(db.aktif_gambut_jam)} jam.`,
      `Status kompleks: ${S.meta.status.join(", ")}; dari ukuran front aktif, bahaya cuaca, kekeringan gambut (DC), dan risiko wilayah.`,
      "Bahaya cuaca: Fire Weather Index sistem Kanada dari prakiraan BMKG/Open-Meteo; kelas rendah 0–1, sedang 2–6, tinggi 7–13, sangat tinggi di atas 13.",
      "Laporan harian provinsi pantauan: BNPB. Riwayat risiko: arsip MODIS 2002–sekarang.",
      "Posko dan anggaran adalah rekomendasi otomatis; harga satuan 2026 indikatif, periksa e-Katalog/SSH daerah sebelum dipakai.",
      "Penjelasan lengkap ada di tab Metode di situs."];
  },
  async petaDok(w, h) {
    const c = this.kanvas(w, h), x = c.getContext("2d"), s = this.pakaiPeta ? await this.tangkap() : null;
    if (s) this.tempel(x, s, 0, 0, w, h); else this.gambarPeta(x, 0, 0, w, h, "");
    return {url: c.toDataURL("image/jpeg", .88), snap: !!s};
  },
  async grafikDok(maks = 99) {
    const L = (await (this._exP || this.daftarEx())).slice(0, maks), out = [];
    for (const e of L) { try { const d = await this.dataEx(e.id), pd = 40, c = this.kanvas(d.img.width + 2 * pd, d.img.height + 2 * pd), x = c.getContext("2d");
      x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(d.img, pd, pd); out.push({...d, url: c.toDataURL("image/png"), w: c.width, h: c.height}); } catch (er) { console.warn(er); } }
    return out;
  },
  logoUrl() { const c = this.kanvas(128, 128), x = c.getContext("2d"); x.fillStyle = this.C.navy2; x.beginPath(); x.roundRect(0, 0, 128, 128, 30); x.fill(); this.logo(x, 0, 0, 128); return c.toDataURL("image/png"); },

  async keExcel() {
    const X = window.XLSX, wb = X.utils.book_new(), info = [];
    const tambah = (nama, kepala, baris) => {
      const ws = X.utils.aoa_to_sheet([kepala, ...baris.map(r => r.map(v => v == null || (typeof v === "number" && !isFinite(v)) ? "" : v))]);
      kepala.forEach((_, c) => { const a = ws[X.utils.encode_cell({r: 0, c})]; if (a) a.s = {font: {bold: true, color: {rgb: "FFFFFFFF"}}, fill: {fgColor: {rgb: "0B2545"}}, alignment: {vertical: "center", wrapText: true}}; });
      baris.forEach((r, i) => r.forEach((v, c) => { if (typeof v === "number" && Math.abs(v) >= 1000 && Number.isInteger(v)) { const a = ws[X.utils.encode_cell({r: i + 1, c})]; if (a) a.z = "#,##0"; } }));
      ws["!cols"] = kepala.map((k, c) => ({wch: Math.min(48, Math.max(String(k).length + 2, ...baris.slice(0, 400).map(r => String(r[c] ?? "").length + 2)))}));
      if (baris.length) ws["!autofilter"] = {ref: ws["!ref"]};
      X.utils.book_append_sheet(wb, ws, nama); info.push(`${nama} ${fmt(baris.length)}`);
    };
    const meta = [["Judul", `${this.K.nama} · ekspor data`], ["Dibuat", new Date().toLocaleString("id-ID", {timeZone: "Asia/Jakarta"}) + " WIB"], ["Data diperbarui", jamWIB(S.meta.dibuat)], ["Hari data (WIB)", S.meta.hari_wib], ["Tautan", this.tautan()]];
    if (this.hal === "banjir") {
      const hr = S.st.hari, K = Object.entries(S.st.kec);
      tambah("Status kecamatan", ["Provinsi", "Kode prov", "Kab/Kota", "Kecamatan", ...hr.map(t => "Banjir " + t), "Banjir maks (0-3)", ...hr.map(t => "Longsor " + t), "Longsor maks (0-3)", "Hujan 3 hari (mm)", "Hujan 7 hari lalu (mm)", "Bahaya banjir InaRISK"],
        K.map(([k, v]) => { const [p, kb, kc] = k.split("|"), b = hr.map((_, i) => v.b?.[i] || 0), l = hr.map((_, i) => v.l?.[i] || 0);
          return [namaProv(p), p, kb, kc, ...b.map(x => LEVEL[x]), Math.max(...b), ...l.map(x => LEVEL[x]), Math.max(...l), v.h3 ?? null, v.a7 ?? null, S.bahaya?.[k]?.banjir ?? null]; })
          .sort((a, b) => b[4 + hr.length] - a[4 + hr.length] || (b[b.length - 3] || 0) - (a[a.length - 3] || 0)));
      const sh = S.sungai?.hari || [];
      tambah("Sungai", ["Provinsi", "Kab/Kota", "Kecamatan", "Lintang", "Bujur", "Puncak 7 hari (m3/s)", "Q2", "Q5", "Q20", "Puncak / Q2", "Status", ...sh.map(t => "Debit " + t)],
        (S.sungai?.titik || []).map(t => [namaProv(t.prov), t.kab, t.kec, t.lat, t.lon, t.puncak, t.q2, t.q5, t.q20, t.q2 ? Math.round(t.puncak / t.q2 * 100) / 100 : null, LEVEL[t.kelas || 0], ...sh.map((_, i) => t.q?.[i] ?? null)]).sort((a, b) => (b[9] || 0) - (a[9] || 0)));
      const rh = S.rob?.hari || [], iH = Math.max(0, rh.indexOf(S.hujan.hari_ini));
      tambah("Rob", ["Provinsi", "Kab/Kota", "Kecamatan", "Lintang", "Bujur", "Status puncak (hari ini dst.)", "Persentil 95 (m)", "Persentil 99 (m)", "Tertinggi tercatat (m)", "Stasiun IOC", ...rh.map(t => "Muka laut maks " + t + " (m)"), ...rh.map(t => "Status " + t)],
        (S.rob?.titik || []).map(t => [t.prov, t.kab, t.kec, t.lat, t.lon, LEVEL[Math.max(0, ...t.lv.slice(iH).map(v => v || 0))], t.p95, t.p99, t.amax, t.ioc?.stasiun ?? null, ...rh.map((_, i) => t.h?.[i] ?? null), ...rh.map((_, i) => LEVEL[t.lv?.[i] || 0])]));
      const tp = this.tabelProv();
      tambah("Provinsi", tp.kepala, tp.baris);
      meta.push(...Object.entries(S.meta.sumber || {}).map(([k, v]) => ["Sumber " + k, v]), ["Status", (S.meta.status || LEVEL).join(", ")], ["Jumlah kecamatan dinilai", S.meta.jumlah_kec], ["Catatan", "Fitur banjir masih uji coba; cek peringatan resmi BMKG dan BPBD."]);
    } else {
      const h = this.hariIni(), hr = Object.keys(S.wilayah[Object.keys(S.wilayah)[0]]?.harian || {}).sort(), pk = new Map(), ang = new Map();
      for (const x of S.posko || []) { pk.set(x.prov, (pk.get(x.prov) || 0) + 1); ang.set(x.prov, (ang.get(x.prov) || 0) + anggaran(S.semuaPosko.get(x.id)).total); }
      const tg = {}; for (const b of S.titik) if (b[7] === S.hariIni && S.utama.has(b[3]) && b[5] === 2) { const p = S.wilKunci[b[6]]?.[0]; tg[p] = (tg[p] || 0) + 1; }
      tambah("Provinsi", ["Kode", "Provinsi", "Status", "Titik panas hari ini (WIB)", "Keyakinan tinggi hari ini", ...hr.map(t => "Titik " + t), "Cluster aktif", "Prioritas pemadaman", "Siaga pemadaman", "Patroli terpadu", "FWI maks", "FWI rata-rata", "DC maks", "FFMC maks", "Posko lapangan", "Anggaran posko (Rp)", "Pantauan harian BNPB"],
        Object.keys(S.meta.provinsi).map(k => { const w = S.wilayah[k] || {}, kl = klusterDi(k), n = l => kl.filter(f => f.properties.level === l).length;
          return [k, namaProv(k), S.meta.status[w.level ?? 0], h.per[k] || 0, tg[k] || 0, ...hr.map(t => w.harian?.[t] ?? 0), kl.length, n(3), n(2), n(1), w.fwi_maks ?? null, w.fwi_rata ?? null, w.dc_maks ?? null, w.ffmc_maks ?? null, pk.get(k) || 0, Math.round(ang.get(k) || 0), S.meta.bnpb?.[k] ? "ya" : "tidak"]; })
          .sort((a, b) => b[3] - a[3] || b[5 + hr.length] - a[5 + hr.length]));
      const F = S.kluster.features, kol = [];
      for (const f of F.slice(0, 50)) for (const [k, v] of Object.entries(f.properties)) if (!kol.includes(k) && (v == null || typeof v !== "object" || k === "tanggung")) kol.push(k);
      tambah("Cluster", ["status", "provinsi", ...kol], F.map(f => { const p = f.properties; return [S.meta.status[p.level], namaProv(p.prov), ...kol.map(k => Array.isArray(p[k]) ? p[k].join("; ") : typeof p[k] === "boolean" ? (p[k] ? "ya" : "tidak") : p[k])]; })
        .sort((a, b) => (a[2 + kol.indexOf("peringkat")] || 1e9) - (b[2 + kol.indexOf("peringkat")] || 1e9)));
      const TK = ["Pusat (provinsi)", "Menengah (kabupaten)", "Lapangan"];
      tambah("Posko", ["ID", "Tingkat", "Jenis", "Provinsi", "Kab/Kota", "Nama / lokasi", "Lintang", "Bujur", "Cluster dilayani", "Cluster prioritas", "Regu", "Personel", "Biaya harian (Rp)", "Hari", "Operasional (Rp)", "Alat (Rp)", "Dana siap pakai (Rp)", "Total (Rp)", "Induk"],
        [...S.semuaPosko.values()].map(x => { const a = anggaran(x); return [x.id, TK[x.tingkat], x.jenis_posko || x.jenis || "", namaProv(x.prov), x.kab || "", x.nama || "", x.lat ?? null, x.lon ?? null, x.kompleks?.length ?? null, x.prioritas ?? null, a.regu || null, a.org || null, Math.round(a.harian), a.hari, Math.round(a.op), Math.round(a.alat?.t || 0), Math.round(a.dsp || 0), Math.round(a.total), x.induk || ""]; }));
      try {
        await Riwayat.muat(); const th = Riwayat.th, J = {prov: "Provinsi", kab: "Kabupaten/kota", kec: "Kecamatan"};
        tambah("Peringkat risiko", ["Tingkat", "Provinsi", "Kab/Kota", "Nama", "Skor risiko (0-100)", "Kelas", "Tahun terbakar", "Total titik MODIS", "Tahun puncak", "Tren (rasio)", ...th.map(t => "Titik " + t)],
          Object.values(S.riw).sort((a, b) => ["prov", "kab", "kec"].indexOf(a.jenis) - ["prov", "kab", "kec"].indexOf(b.jenis) || b.skor - a.skor)
            .map(r => [J[r.jenis], namaProv(r.prov), r.jenis === "prov" ? "" : r.kab, r.nama, r.skor, r.kelas, r.tahun, r.total, r.puncak, r.tren, ...r.v]));
      } catch (e) { console.warn("riwayat", e); info.push("peringkat risiko gagal dimuat"); }
      meta.push(["Data satelit terakhir", S.meta.data_terakhir], ["Jumlah titik (arsip 7 hari)", S.meta.jumlah_titik], ["Jumlah cluster", S.meta.jumlah_kluster],
        ["Sumber titik panas", "NASA FIRMS: MODIS, VIIRS S-NPP, NOAA-20"], ["Sumber cuaca & FWI", "BMKG / Open-Meteo"], ["Laporan harian", "BNPB"], ["Riwayat", "Arsip NASA FIRMS MODIS 2002–sekarang"],
        ["Status cluster", S.meta.status.join(", ")], ["Catatan", "Luas dan anggaran indikatif; harga satuan 2026 perlu dicek ke e-Katalog/SSH daerah."]);
    }
    meta.push(...this.catatanMetode().map((t, i) => ["Metode " + (i + 1), t]));
    tambah("Metadata", ["Kunci", "Nilai"], meta);
    const ab = X.write(wb, {bookType: "xlsx", type: "array", compression: true});
    return {blob: new Blob([ab], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}), nama: this.namaEkspor("xlsx"), info: info.join(" · ")};
  },

  async kePdf() {
    const {jsPDF} = window.jspdf, doc = new jsPDF({unit: "mm", format: "a4", compress: true}), W = 210, M = 15, LW = W - 2 * M;
    const T = s => String(window.T ? window.T(String(s ?? "")) : s ?? "").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/[–—−]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/→/g, "->").replace(/[^\x00-\xFF]/g, "");
    const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), NAVY = rgb(this.C.navy), NAVY2 = rgb(this.C.navy2), ABU = rgb(this.C.tinta2);
    const d = this.data(""), tg = this.tglPanjang(), judulLap = this.hal === "banjir" ? "Banjir, longsor & rob" : "Kebakaran hutan dan lahan";
    const kepala = j => { doc.setFillColor(...NAVY); doc.rect(0, 0, W, 17, "F"); doc.setFillColor(229, 138, 69); doc.rect(0, 17, W, .8, "F");
      doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(12.5); doc.text(T(j), M, 11);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.text(T(`${this.K.nama} · ${tg}`), W - M, 11, {align: "right"}); doc.setTextColor(...NAVY); return 27; };
    const tabel = (j, t, startY, opsi = {}) => doc.autoTable({head: [t.kepala.map(T)], body: t.baris.map(r => r.map(v => T(typeof v === "number" ? fmt(v) : v))), startY, margin: {top: 26, left: M, right: M, bottom: 18},
      styles: {font: "helvetica", fontSize: 8, cellPadding: 1.6, textColor: NAVY, lineColor: [221, 228, 238], lineWidth: .1}, headStyles: {fillColor: NAVY, textColor: 255, fontStyle: "bold"},
      alternateRowStyles: {fillColor: [243, 246, 250]}, columnStyles: Object.fromEntries(t.angka.map(i => [i, {halign: "right"}])),
      didDrawPage: z => { if (z.pageNumber > 1) kepala(j); }, ...opsi});
    /* sampul */
    for (let i = 0; i < 60; i++) { const t = i / 59; doc.setFillColor(...NAVY2.map((v, j) => Math.round(v + (NAVY[j] - v) * t))); doc.rect(0, i * 1.6, W, 1.7, "F"); }
    doc.addImage(this.logoUrl(), "PNG", M, 16, 14, 14);
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text(T(this.K.nama), M + 18, 22);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(210, 222, 238); doc.text(T("Laporan harian · " + tg), M + 18, 27.5);
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(26); doc.text(T("Laporan harian"), M, 52); doc.setFontSize(18); doc.text(T(judulLap), M, 62);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(210, 222, 238); doc.text(T(`Data diperbarui ${jamWIB(S.meta.dibuat)} · ${this.situs()}`), M, 71);
    const kw = (LW - 3 * 4) / 4;
    d.kpi.forEach((q, i) => { const x = M + i * (kw + 4), y = 80; doc.setFillColor(255); doc.setDrawColor(221, 228, 238); doc.roundedRect(x, y, kw, 30, 2.5, 2.5, "FD");
      doc.setFillColor(...rgb(q.w)); doc.rect(x, y + 4, 1.2, 22, "F");
      doc.setTextColor(...ABU); doc.setFont("helvetica", "bold"); doc.setFontSize(6.6); doc.text(T(q.l.toUpperCase()), x + 4, y + 7, {maxWidth: kw - 6});
      doc.setTextColor(...NAVY); doc.setFontSize(18); doc.text(T(q.v), x + 4, y + 19);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...ABU); doc.text(doc.splitTextToSize(T(q.ket), kw - 6)[0] || "", x + 4, y + 26); });
    const pt = await this.petaDok(1780, 1000);
    doc.addImage(pt.url, "JPEG", M, 118, LW, LW * 1000 / 1780);
    const yP = 118 + LW * 1000 / 1780; doc.setFontSize(7.5); doc.setTextColor(...ABU);
    doc.text(T(pt.snap ? "Tampilan peta saat ini. Peta dasar © OpenFreeMap © OpenStreetMap." : `${d.petaKet}: ${d.legenda.map(l => l[1]).join(", ")}.`), M, yP + 4.5);
    doc.setFontSize(10); doc.setTextColor(...NAVY); const rk = this.keterangan(d).split("\n\n").slice(0, 2).join(" ");
    doc.text(doc.splitTextToSize(T(rk), LW), M, yP + 13);
    /* tabel */
    doc.addPage(); let y = kepala("Ringkasan per provinsi");
    const tp = this.tabelProv(); tabel("Ringkasan per provinsi", {...tp, baris: tp.baris.slice(0, Math.max(10, tp.aktif))}, y);
    doc.addPage(); y = kepala(this.tabelUtama(0).judul); const tu = this.tabelUtama(this.hal === "banjir" ? 60 : 40);
    if (tu.baris.length) tabel(tu.judul, tu, y, {styles: {font: "helvetica", fontSize: 7.4, cellPadding: 1.4, textColor: NAVY, lineColor: [221, 228, 238], lineWidth: .1}});
    else { doc.setFontSize(10); doc.text(T("Tidak ada baris berstatus hari ini."), M, y + 4); }
    /* grafik insight */
    const gr = await this.grafikDok();
    if (gr.length) { doc.addPage(); y = kepala("Grafik Insight");
      for (const g of gr) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); const jl = doc.splitTextToSize(T(g.judul), LW);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); const fl = doc.splitTextToSize(T(g.fn), LW).slice(0, 3);
        let iw = LW, ih = iw * g.h / g.w; if (ih > 110) { ih = 110; iw = ih * g.w / g.h; }
        const perlu = jl.length * 5 + 6 + ih + fl.length * 3.6 + 10;
        if (y + perlu > 282) { doc.addPage(); y = kepala("Grafik Insight"); }
        doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...NAVY); doc.text(jl, M, y + 4); y += jl.length * 5;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...ABU); doc.text(doc.splitTextToSize(T(g.sub), LW)[0] || "", M, y + 3.5); y += 6;
        doc.addImage(g.url, "PNG", M + (LW - iw) / 2, y, iw, ih); y += ih + 2;
        doc.setFontSize(7.5); doc.text(fl, M, y + 3); y += fl.length * 3.6 + 9;
      } }
    /* rekomendasi */
    const rp = this.rekProv();
    if (rp.length) { doc.addPage(); y = kepala("Rekomendasi per provinsi");
      for (const r of rp) {
        const isi = r.rek.map((z, i) => { doc.setFontSize(9); const t = doc.splitTextToSize(T(`${i + 1}. ${z.t}`), LW - 6); doc.setFontSize(7.5); return {t, d: z.dasar ? doc.splitTextToSize(T("Dasar: " + z.dasar), LW - 10) : []}; });
        const tinggi = 10 + isi.reduce((a, z) => a + z.t.length * 4.2 + z.d.length * 3.6 + 2, 0);
        if (y + Math.min(tinggi, 60) > 282) { doc.addPage(); y = kepala("Rekomendasi per provinsi"); }
        doc.setFillColor(...rgb(this.LV[r.lv] || this.LV[0])); doc.rect(M, y, 1.4, 6, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...NAVY); doc.text(T(r.nama), M + 4, y + 4.8);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...ABU); doc.text(T(r.ket), M + 4, y + 9.5); y += 14;
        for (const z of isi) { if (y + z.t.length * 4.2 > 284) { doc.addPage(); y = kepala("Rekomendasi per provinsi"); }
          doc.setFontSize(9); doc.setTextColor(...NAVY); doc.text(z.t, M + 4, y); y += z.t.length * 4.2;
          if (z.d.length) { doc.setFontSize(7.5); doc.setTextColor(...ABU); doc.text(z.d, M + 8, y - .6); y += z.d.length * 3.6; } y += 1.6; }
        y += 5;
      } }
    /* sumber & metode */
    doc.addPage(); y = kepala("Sumber & metode"); doc.setFontSize(9.5); doc.setTextColor(...NAVY);
    for (const t of [this.K.sumber + ".", ...this.catatanMetode()]) { const l = doc.splitTextToSize(T("• " + t), LW); doc.text(l, M, y); y += l.length * 4.6 + 2.5; }
    doc.setFontSize(8.5); doc.setTextColor(...ABU); doc.text(doc.splitTextToSize(T(`Dibuat otomatis dari ${this.tautan()} pada ${new Date().toLocaleString("id-ID", {timeZone: "Asia/Jakarta"})} WIB. Angka mengikuti data saat laporan dibuat.`), LW), M, y + 4);
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...ABU);
      doc.text(T(`${this.K.sumber} · ${this.situs()}`), M, 291); doc.text(`Halaman ${i} dari ${n}`, W - M, 291, {align: "right"}); }
    return {blob: doc.output("blob"), nama: this.namaEkspor("pdf"), info: `${n} halaman`, halaman: n};
  },

  async kePptx() {
    const p = new window.PptxGenJS(), d = this.data(""), tg = this.tglPanjang(), FONT = "Arial", N = "0B2545", ABU = "5B6B82", hx = h => h.replace("#", "").toUpperCase();
    p.layout = "LAYOUT_WIDE"; p.author = this.K.nama; p.title = `${this.K.nama} · laporan harian ${this.tanggal()}`;
    p.defineSlideMaster({title: "ISI", background: {color: "FFFFFF"}, objects: [
      {rect: {x: 0, y: 0, w: 13.333, h: .82, fill: {color: N}}}, {rect: {x: 0, y: .82, w: 13.333, h: .05, fill: {color: "E58A45"}}},
      {text: {text: `${this.K.sumber} · ${this.situs()} · data ${jamWIB(S.meta.dibuat)}`, options: {x: .5, y: 7.06, w: 11, h: .3, fontFace: FONT, fontSize: 9, color: ABU}}}],
      slideNumber: {x: 12.35, y: 7.06, w: .6, h: .3, fontFace: FONT, fontSize: 9, color: ABU}});
    const isi = j => { const s = p.addSlide({masterName: "ISI"}); s.addText(j, {x: .5, y: .1, w: 12.3, h: .62, fontFace: FONT, fontSize: 22, bold: true, color: "FFFFFF", fit: "shrink"}); return s; };
    /* judul */
    const s0 = p.addSlide(); s0.background = {color: N};
    s0.addShape(p.ShapeType.rect, {x: 0, y: 6.9, w: 13.333, h: .6, fill: {color: "1D4E89"}});
    s0.addImage({data: this.logoUrl(), x: .8, y: .8, w: .85, h: .85});
    s0.addText(this.K.nama, {x: 1.85, y: .85, w: 9, h: .4, fontFace: FONT, fontSize: 16, bold: true, color: "FFFFFF"});
    s0.addText("Laporan harian · " + tg, {x: 1.85, y: 1.25, w: 9, h: .35, fontFace: FONT, fontSize: 12, color: "C9D6E8"});
    s0.addText(this.hal === "banjir" ? "Situasi banjir, longsor & rob" : "Situasi kebakaran hutan dan lahan", {x: .8, y: 2.6, w: 11.5, h: 1.4, fontFace: FONT, fontSize: 40, bold: true, color: "FFFFFF"});
    s0.addText(d.sub, {x: .8, y: 4.0, w: 11.5, h: .5, fontFace: FONT, fontSize: 18, color: "FFB37A"});
    s0.addText(`Data diperbarui ${jamWIB(S.meta.dibuat)} · ${this.K.sumber}`, {x: .8, y: 6.95, w: 11.7, h: .5, fontFace: FONT, fontSize: 11, color: "DDE6F2"});
    /* KPI + grafik batang native (bisa disunting) */
    const s1 = isi("Situasi hari ini · " + tg);
    d.kpi.forEach((q, i) => { const x = .5 + i * 3.1;
      s1.addShape(p.ShapeType.roundRect, {x, y: 1.2, w: 2.9, h: 2.0, fill: {color: "F3F6FA"}, line: {color: "DDE4EE", width: .75}, rectRadius: .12});
      s1.addShape(p.ShapeType.rect, {x, y: 1.4, w: .07, h: 1.6, fill: {color: hx(q.w)}, line: {color: hx(q.w), width: 0}});
      s1.addText(q.l.toUpperCase(), {x: x + .2, y: 1.3, w: 2.6, h: .4, fontFace: FONT, fontSize: 10, bold: true, color: ABU, charSpacing: 1});
      s1.addText(q.v, {x: x + .2, y: 1.7, w: 2.6, h: .85, fontFace: FONT, fontSize: 34, bold: true, color: N, fit: "shrink"});
      s1.addText(q.ket, {x: x + .2, y: 2.6, w: 2.6, h: .45, fontFace: FONT, fontSize: 10.5, color: ABU, fit: "shrink"}); });
    const R = d.bar.rows;
    s1.addText(d.bar.judul, {x: .5, y: 3.45, w: 12.3, h: .4, fontFace: FONT, fontSize: 15, bold: true, color: N});
    if (R.length) s1.addChart(p.ChartType.bar, [{name: d.bar.judul, labels: R.map(r => r.n), values: R.map(r => r.v)}], {x: .5, y: 3.85, w: 12.3, h: 3.1, barDir: "bar", catAxisOrientation: "maxMin",
      chartColors: [hx(this.hal === "banjir" ? "#4f8fc4" : "#c9503a")], showValue: true, dataLabelFormatCode: "#,##0", dataLabelFontSize: 11, dataLabelFontFace: FONT, dataLabelColor: N,
      catAxisLabelFontFace: FONT, catAxisLabelFontSize: 12, catAxisLabelColor: N, valAxisHidden: true, valGridLine: {style: "none"}, catAxisLineShow: false, showLegend: false, barGapWidthPct: 60});
    /* peta */
    const pt = await this.petaDok(1716, 800), s2 = isi(this.hal === "banjir" ? "Peta status hari ini" : "Peta cluster aktif");
    s2.addImage({data: pt.url, x: .5, y: 1.05, w: 12.33, h: 5.75});
    s2.addText(pt.snap ? "Tampilan peta saat ini · peta dasar © OpenFreeMap © OpenStreetMap" : `${d.petaKet}: ${d.legenda.map(l => l[1]).join(", ")}`, {x: .5, y: 6.78, w: 12.3, h: .28, fontFace: FONT, fontSize: 9, color: ABU});
    /* tabel provinsi */
    const tp = this.tabelProv(), s3 = isi("Ringkasan per provinsi"), nb = 14;
    s3.addTable([tp.kepala.map(t => ({text: t, options: {bold: true, color: "FFFFFF", fill: {color: N}}})), ...tp.baris.slice(0, nb).map((r, i) => r.map((v, j) => ({text: typeof v === "number" ? fmt(v) : String(v ?? "–"), options: {align: tp.angka.includes(j) ? "right" : "left", fill: {color: i % 2 ? "F3F6FA" : "FFFFFF"}}})))],
      {x: .5, y: 1.1, w: 12.33, fontFace: FONT, fontSize: 11, color: N, border: {type: "solid", pt: .5, color: "DDE4EE"}, rowH: .36, valign: "middle", autoPage: false});
    if (tp.baris.length > nb) s3.addText(`${nb} provinsi teratas dari ${tp.baris.length}; tabel lengkap ada di ekspor Excel.`, {x: .5, y: 6.75, w: 12, h: .3, fontFace: FONT, fontSize: 9, color: ABU});
    /* grafik insight */
    for (const g of await this.grafikDok(6)) {
      const s = isi("Insight");
      s.addText(g.judul, {x: .5, y: 1.0, w: 12.33, h: .8, fontFace: FONT, fontSize: 17, bold: true, color: N, fit: "shrink", valign: "top"});
      s.addText(g.sub, {x: .5, y: 1.78, w: 12.33, h: .32, fontFace: FONT, fontSize: 11, color: ABU});
      let iw = 12.33, ih = iw * g.h / g.w; if (ih > 4.55) { ih = 4.55; iw = ih * g.w / g.h; }
      s.addImage({data: g.url, x: .5 + (12.33 - iw) / 2, y: 2.15, w: iw, h: ih});
      if (g.fn) s.addText(g.fn, {x: .5, y: 6.72, w: 12.33, h: .32, fontFace: FONT, fontSize: 8.5, color: ABU, fit: "shrink"});
    }
    /* rekomendasi: dua provinsi per slide */
    const rp = this.rekProv();
    for (let i = 0; i < rp.length; i += 2) {
      const s = isi("Rekomendasi per provinsi");
      rp.slice(i, i + 2).forEach((r, j) => { const x = .5 + j * 6.3;
        s.addShape(p.ShapeType.rect, {x, y: 1.15, w: .08, h: .7, fill: {color: hx(this.LV[r.lv] || this.LV[0])}, line: {color: hx(this.LV[r.lv] || this.LV[0]), width: 0}});
        s.addText(r.nama, {x: x + .2, y: 1.1, w: 5.8, h: .45, fontFace: FONT, fontSize: 18, bold: true, color: N});
        s.addText(r.ket, {x: x + .2, y: 1.52, w: 5.8, h: .35, fontFace: FONT, fontSize: 11, color: ABU, fit: "shrink"});
        s.addText(r.rek.slice(0, 6).map(z => ({text: z.t, options: {bullet: {type: "number"}, breakLine: true, paraSpaceAfter: 6}})),
          {x: x + .1, y: 2.05, w: 5.9, h: 4.8, fontFace: FONT, fontSize: 12, color: N, valign: "top", fit: "shrink"}); });
    }
    /* sumber */
    const s9 = isi("Sumber & metode");
    s9.addText([this.K.sumber + ".", ...this.catatanMetode()].map(t => ({text: t, options: {bullet: true, breakLine: true, paraSpaceAfter: 6}})), {x: .5, y: 1.1, w: 12.3, h: 5.6, fontFace: FONT, fontSize: 13, color: N, valign: "top", fit: "shrink"});
    s9.addText(`Tautan: ${this.tautan()}`, {x: .5, y: 6.7, w: 12.3, h: .3, fontFace: FONT, fontSize: 10, color: "1D4E89", hyperlink: {url: this.tautan()}});
    const blob = await p.write({outputType: "blob"}), n = p.slides?.length ?? p._slides?.length;
    return {blob, nama: this.namaEkspor("pptx"), info: `${n} slide`, slide: n};
  },
};
Bagikan.dasar = (document.currentScript?.src || "").replace(/[^/]*$/, "");
if (document.currentScript?.dataset.halaman) Bagikan.init(document.currentScript.dataset.halaman);
