/* Kemitraan Kampus /kemitraan: helper bersama window.KM + cangkang layar (KM-A10). Rupa tiru /akademisi (DS §1-§4).
   public/akademisi.js berbentuk IIFE tanpa ekspor, jadi helper di bawah DISALIN dengan penanda asal baris (baris per 30 Okt 2026).
   Beda dari salinan asal: tanpa atribut gaya inline (CSP style-src 'self'); warna per elemen lewat kelas .km-w-<kunci> di kemitraan.css.
   Tiap tampilan (daerah, masalah, riset, dana, satgas, talenta, kampus, dasbor) mendaftar KM.tampilan[nama] = {bangun(el), angka()}. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);   // akademisi.js:7
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));   // akademisi.js:8
  const angka = n => Number(n || 0).toLocaleString("id-ID");   // akademisi.js:9
  const fmt = n => n == null || n === "" || Number.isNaN(Number(n)) ? "–" : Number(n).toLocaleString("id-ID", {maximumFractionDigits: 1});   // akademisi.js:10 (nol); null tampil en dash, bukan nol; maks 1 desimal
  const inisial = n => n.replace(/[^\p{L} ]/gu, "").split(/\s+/).filter(w => w.length > 1).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";   // akademisi.js:11
  const LUAR = 'target="_blank" rel="noopener noreferrer"';   // akademisi.js:12
  /* rumpun -> [label, ikon (path SVG 24px, garis), warna ikon]. Salinan LITERAL akademisi.js:16-32; gerbang-kemitraan.test.mjs membandingkan nilainya */
  const RUMPUN = {
    "gempa": ["Gempa bumi", '<path d="M2 12h4l2-6 4 12 3-9 2 3h5"/>', "#e8590c"],
    "tsunami": ["Tsunami", '<path d="M2 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M4 11c1-4 5-7 9-6-2 1-3 3-2 5 2 0 3-1 4-2"/>', "#0b7285"],
    "gunung api": ["Gunung api", '<path d="m3 20 6-10 2 3 2-4 8 11z"/><path d="M12 6c0-2 1-3 3-3M10 5c-1-1-1-2 0-3"/>', "#c92a2a"],
    "banjir": ["Banjir", '<path d="M12 3s-5 6-5 9a5 5 0 0 0 10 0c0-3-5-9-5-9z"/><path d="M2 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1"/>', "#1c7ed6"],
    "longsor": ["Tanah longsor", '<path d="M3 20h18L8 5z"/><circle cx="15" cy="9" r="1.5"/><circle cx="18" cy="13" r="1"/>', "#8d5524"],
    "karhutla": ["Karhutla", '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 2 1 3 3 3 5 1-2 1-5 0-9z"/>', "#f76707"],
    "hidrometeorologi": ["Hidrometeorologi", '<path d="M7 15a4 4 0 1 1 1-8 5 5 0 0 1 9 2 3 3 0 0 1 0 6z"/><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3"/>', "#4263eb"],
    "iklim": ["Iklim", '<path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>', "#e03131"],
    "kekeringan": ["Kekeringan", '<circle cx="12" cy="7" r="3"/><path d="M12 1v1M5.5 3.5l.7.7M18.5 3.5l-.7.7M3 21l3-6 3 3 3-5 3 4 3-2 3 6z"/>', "#b8860b"],
    "pesisir": ["Pesisir", '<path d="M2 18c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1"/><circle cx="17" cy="7" r="3"/><path d="M2 14h7l3-3"/>', "#1098ad"],
    "geologi": ["Geologi", '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>', "#5f3dc4"],
    "manajemen bencana": ["Manajemen bencana", '<path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>', "#2b8a3e"],
    "kesehatan bencana": ["Kesehatan bencana", '<path d="M12 20s-8-5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11z"/><path d="M12 9v5M9.5 11.5h5"/>', "#d6336c"],
    "wabah": ["Wabah", '<circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>', "#7048e8"],
    "penginderaan jauh": ["Penginderaan jauh", '<rect x="9" y="9" width="6" height="6" rx="1"/><path d="M4 7l5 2M20 17l-5-2M7 4 5 9M17 20l2-5"/>', "#495057"],
  };
  /* bahaya khusus modul ini (DS §2): bukan rumpun pakar, jadi di luar salinan di atas */
  const EXTRA = {
    "udara": ["Udara", '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8"/>', "#9c36b5"],
    "multi": ["Multi bahaya", '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>', "#2b8a3e"],
  };
  const slug = k => String(k ?? "").toLowerCase().replace(/\s+/g, "-");
  const KUNCI = new Set([...Object.keys(RUMPUN), ...Object.keys(EXTRA), "p1", "p2", "p3"].map(slug));
  /* beda dari akademisi.js:33 (atribut gaya inline): kelas .km-w-<kunci>; kunci tak dikenal (mis. currentColor) = tanpa kelas, garis ikut warna teks */
  const ikon = (d, kunci, kls) => `<svg class="ak-ikon${KUNCI.has(slug(kunci)) ? " km-w-" + slug(kunci) : ""}${kls ? " " + kls : ""}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const warna = kunci => (RUMPUN[kunci] || EXTRA[kunci] || [])[2] || "#6b7280";
  const emailOk = e => typeof e === "string" && /^[^\s@<>"']+@[^\s@<>"']+$/.test(e);   // akademisi.js:98
  const urlOk = u => typeof u === "string" && /^https?:\/\//i.test(u.trim()) ? u.trim() : "";   // akademisi.js:573, tanpa jalur gambar akademisi
  const nanti = f => { let s = 0; const go = () => { if (!s++) f(); }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };   // akademisi.js:92

  /* navigasi halaman bersama; akademisi.js:281 */
  function navHal(hal, total, per, benda) {
    const nHal = Math.max(1, Math.ceil(total / per)), a = (hal - 1) * per;
    if (!total) return "";
    const awal = Math.max(1, Math.min(hal - 2, nHal - 4)), jendela = Array.from({length: Math.min(5, nHal)}, (_, i) => awal + i);
    const nomor = [...new Set([...(awal > 1 ? [1] : []), ...jendela, ...(awal + 4 < nHal ? [nHal] : [])])];
    let isi = `<button type="button" class="ak-hal-arah" data-h="${hal - 1}" ${hal === 1 ? "disabled" : ""}>‹ Sebelumnya</button>`, prev = 0;
    for (const n of nomor) { if (n - prev > 1) isi += "<span>…</span>"; isi += `<button type="button" data-h="${n}"${n === hal ? ' aria-current="page"' : ""}>${angka(n)}</button>`; prev = n; }
    isi += `<button type="button" class="ak-hal-arah" data-h="${hal + 1}" ${hal === nHal ? "disabled" : ""}>Berikutnya ›</button>`;
    return `<p><b>${angka(total)}</b> ${esc(benda)}<span>menampilkan ${angka(a + 1)}–${angka(Math.min(a + per, total))}</span></p>${nHal > 1 ? `<div>${isi}</div>` : ""}`;
  }
  /* kosongHtml: akademisi.js:588 (judul di-esc di sini) */
  const kosongHtml = (t, pesan) => `<div class="ak-panel ak-kosong"><h2>${esc(t)}</h2><p>${esc(pesan || "Data ini belum tersedia. Coba lagi nanti.")}</p></div>`;
  /* tabelHtml: akademisi.js:595; label kolom dan isi sel dipasok pemanggil sebagai HTML yang sudah di-esc */
  const tabelHtml = (kol, baris) => `<div class="ak-tw"><table class="ak-t2"><thead><tr>${kol.map(([l, c]) => `<th class="${c || ""}">${l}</th>`).join("")}</tr></thead><tbody>${baris.map(r => `<tr>${r.map((x, i) => `<td class="${kol[i][1] || ""}">${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const IK_SEMUA = '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>';   // akademisi.js:588
  /* pemilih bercari (provinsi, kab, kampus, donor); akademisi.js:600-620. ik(v) mengembalikan [path, kunci] atau null */
  const opsiBtn = (v, l, c, a, ik) => `<button type="button" role="option" data-v="${esc(v)}" aria-selected="${a}">${ik || ""}<span>${esc(l)}</span>${c != null ? `<small>${angka(c)}</small>` : ""}</button>`;
  const htmlPilih = (id, ik, cari) => `<div class="ak-kampus-pilih" id="${esc(id)}" data-gen><button type="button" class="ak-kbtn" aria-haspopup="listbox" aria-expanded="false"><svg class="ak-ikon ak-kik" viewBox="0 0 24 24" aria-hidden="true">${ik}</svg><span><em></em></span><svg class="ak-panah" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="ak-kpop" hidden><label class="ak-kcari"><span class="sr">${esc(cari)}</span><input type="search" autocomplete="off" placeholder="${esc(cari)}"></label><div class="ak-kdaftar" role="listbox" aria-label="${esc(cari)}"></div></div></div>`;
  function pasangPilih(id, {opsi, nilai, pilih, semua, ik}) {
    const k = $(id), btn = k.querySelector(".ak-kbtn"), pop = k.querySelector(".ak-kpop"), q = k.querySelector("input"), dft = k.querySelector(".ak-kdaftar");
    const label = () => { const v = nilai(); k.querySelector(".ak-kbtn > span").innerHTML = `<em>${esc(v ? (opsi().find(x => x[0] === v)?.[1] || v) : semua)}</em>`; };
    const dflt = btn.querySelector(".ak-kik")?.innerHTML || "", dik = (v, semuaOpsi) => { const sp = !semuaOpsi && ik ? ik(v) : null; return sp ? ikon(sp[0], sp[1], "ak-opik") : semuaOpsi && ik ? ikon(IK_SEMUA, "", "ak-opik") : dflt ? ikon(dflt, "", "ak-opik") : ""; };
    const isi = () => { const t = q.value.trim().toLowerCase(), cur = nilai(), o = opsi().filter(x => !t || x[1].toLowerCase().includes(t));
      dft.innerHTML = (t ? "" : opsiBtn("", semua, null, !cur, dik(null, true))) + (o.length ? o.slice(0, 300).map(x => opsiBtn(x[0], x[1], x[2], x[0] === cur, dik(x[0]))).join("") : "<p>Tidak ada yang cocok.</p>"); };
    const tutupP = () => { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); };
    btn.addEventListener("click", () => { const b = pop.hidden; document.querySelectorAll(".ak-kampus-pilih[data-gen]").forEach(x => x._tutup?.());
      if (b) { pop.hidden = false; btn.setAttribute("aria-expanded", "true"); q.value = ""; q.focus(); nanti(isi); } });
    q.addEventListener("input", () => nanti(isi));
    dft.addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b) return; tutupP(); pilih(b.dataset.v); label(); });
    k._tutup = tutupP; label(); return label;
  }
  document.addEventListener("click", e => document.querySelectorAll(".ak-kampus-pilih[data-gen]").forEach(x => { if (!x.contains(e.target)) x._tutup?.(); }));
  document.addEventListener("keydown", e => { if (e.key !== "Escape") return; const a = [...document.querySelectorAll(".ak-kampus-pilih[data-gen] .ak-kpop:not([hidden])")];
    if (!a.length) return; e.stopImmediatePropagation(); a.forEach(p => p.parentElement._tutup()); });

  /* grafik area per tahun; akademisi.js:200. Beda: warna lewat kunci (kelas .km-w-<kunci> di figure), teks angka memakai atribut fill, bukan gaya inline */
  /* Beda dari asal: tahun tanpa data TIDAK diisi nol (dilewati; sumbu x per tahun sehingga celahnya terlihat);
     seri tanpa nilai positif tidak digambar; opsi {satuan, sumber} tampil di label puncak dan kaki figure. */
  function grafik(seri, judul, kunci, {satuan = "", sumber = ""} = {}) {
    const w = warna(kunci);
    seri = seri.filter(([t, v]) => v != null && v !== "" && Number.isFinite(+v)).map(([t, v]) => [+t, +v]).sort((a, b) => a[0] - b[0]);
    const awal = seri.findIndex(x => x[1] > 0);
    if (awal < 0) return "";
    seri = seri.slice(awal);
    const W = 940, H = 190, kiri = 14, kanan = 14, atas = 28, bawah = 26, n = seri.length, maks = Math.max(...seri.map(x => x[1]));
    const t0 = seri[0][0], rentang = seri[n - 1][0] - t0;
    const X = i => kiri + (rentang === 0 ? (W - kiri - kanan) / 2 : (seri[i][0] - t0) * (W - kiri - kanan) / rentang), Y = v => atas + (1 - v / maks) * (H - atas - bawah);
    const t = seri.map(([, v], i) => [X(i), Y(v)]), dasar = H - bawah;
    const dx = t.slice(1).map((p, i) => p[0] - t[i][0]), m = t.slice(1).map((p, i) => (p[1] - t[i][1]) / dx[i]);
    const tg = t.map((_, i) => i === 0 ? m[0] : i === n - 1 ? m[n - 2] : m[i - 1] * m[i] <= 0 ? 0 : 3 * (dx[i - 1] + dx[i]) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]));
    let d = `M${t[0][0]},${t[0][1]}`;
    for (let i = 0; i < n - 1; i++) d += ` C${t[i][0] + dx[i] / 3},${t[i][1] + (tg[i] || 0) * dx[i] / 3} ${t[i + 1][0] - dx[i] / 3},${t[i + 1][1] - (tg[i + 1] || 0) * dx[i] / 3} ${t[i + 1][0]},${t[i + 1][1]}`;
    const langkah = Math.max(1, Math.ceil(n / 14)), iMaks = seri.findIndex(x => x[1] === maks), tandai = i => i % langkah === 0 || i === n - 1 || i === iMaks;
    const g = "g" + Math.random().toString(36).slice(2, 8), lebar = rentang === 0 ? W : (W - kiri - kanan) / rentang, j = esc(judul), sat = satuan ? " " + esc(satuan) : "";
    return `<figure class="ak-grafik${KUNCI.has(slug(kunci)) ? " km-w-" + slug(kunci) : ""}" data-seri="${esc(JSON.stringify(seri.map(([th2, v], i) => [th2, v, t[i][0], t[i][1]])))}" data-w="${W}" data-h="${H}"><figcaption>${j}</figcaption><div class="ak-gcap"><em>${seri[0][0] === seri[n - 1][0] ? seri[0][0] : seri[0][0] + " sampai " + seri[n - 1][0]}</em><span>Puncak ${seri[iMaks][0]}: <b>${fmt(maks)}</b>${sat}</span></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${j}">
      <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${w}" stop-opacity=".26"/><stop offset="1" stop-color="${w}" stop-opacity="0"/></linearGradient></defs>
      ${[.5, 1].map(f => `<line x1="${kiri}" x2="${W - kanan}" y1="${Y(maks * f)}" y2="${Y(maks * f)}" class="ak-gr-garis"/>`).join("")}
      <line x1="${kiri}" x2="${W - kanan}" y1="${dasar}" y2="${dasar}" class="ak-gr-dasar"/>
      <path d="${d} L${t[n - 1][0]},${dasar} L${t[0][0]},${dasar}Z" fill="url(#${g})"/><path d="${d}" fill="none" stroke="${w}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line class="ak-gr-bantu" x1="0" x2="0" y1="${atas - 8}" y2="${dasar}"/><circle class="ak-gr-sorot" r="5.5" cx="0" cy="0" fill="${w}" stroke="var(--card)" stroke-width="2.5"/>
      ${t.map(([x, y], i) => tandai(i) ? `<circle cx="${x}" cy="${y}" r="3.4" fill="var(--card)" stroke="${w}" stroke-width="2"/><text x="${x}" y="${y - 10}" class="ak-gr-nilai" fill="${w}">${fmt(seri[i][1])}</text><text x="${x}" y="${H - 6}" class="ak-gr-tahun">${seri[i][0]}</text>` : "").join("")}
      ${t.map(([x], i) => `<rect class="ak-gr-hit" data-i="${i}" x="${x - lebar / 2}" y="0" width="${lebar}" height="${H}"/>`).join("")}
    </svg><div class="ak-gr-tip" hidden></div>${sumber ? `<small>Sumber: ${esc(sumber)}</small>` : ""}</figure>`;
  }

  /* ---------- registri, layar masuk / galat / muat ---------- */
  let tokenS = 0;
  const KM = window.KM = {$, esc, angka, fmt, inisial, LUAR, RUMPUN, EXTRA, ikon, warna, emailOk, urlOk, nanti, navHal, kosongHtml, tabelHtml, htmlPilih, pasangPilih, grafik, tampilan: {}, peran: null, hak: [], kini: null};
  KM.IK = {
    buku: '<path d="M4 19.5V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM8 7h6"/>',
    masalah: '<path d="M12 9v4M12 17h.01M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    dana: '<path d="M3 7h18v10H3zM12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0"/>',
    satgas: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/>',
    talenta: '<path d="M22 10 12 5 2 10l10 5 10-5zM6 12v5c3 2 9 2 12 0v-5"/>',
    kampus: '<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6"/>',
    dasbor: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    tanya: '<path d="M9 9a3 3 0 1 1 4 2.8c-.7.3-1 1-1 1.7V14M12 18h.01"/>',
    aktifkan: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    daerah: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    riset: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    orang: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5.5 2 5.5 5"/>',
    cek: '<path d="m5 12 5 5 9-10"/>',
    waktu: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  /* urutan dan hak tiap tampilan (PRD §3): ST/SA/PM semua; KK semua kecuali dasbor; BP hanya daerah dan masalah; AG/PL tidak punya tampilan di sini */
  KM.URUTAN = [["daerah", "Daerah"], ["masalah", "Masalah"], ["riset", "Riset"], ["dana", "Dana"], ["satgas", "Satgas"], ["talenta", "Talenta"], ["kampus", "Kampus"], ["dasbor", "Dasbor"]];
  const SEMUA = KM.URUTAN.map(x => x[0]);
  KM.HAK = {SA: SEMUA, ST: SEMUA, PM: SEMUA, KK: SEMUA.filter(x => x !== "dasbor"), BP: ["daerah", "masalah"], AG: [], PL: []};

  /* pita 4 angka: baris = [[path ikon, nilai, label] x4]; nilai null tampil en dash, bukan nol */
  KM.pita = baris => { const el = $("kmAngka"); if (!el) return;
    const h = (baris || []).map(([d, n, l]) => `<div><svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg><b>${fmt(n)}</b><span>${esc(l)}</span></div>`).join(""); el.innerHTML = h; };
  const segarPita = nama => { let a = []; try { a = KM.tampilan[nama]?.angka?.() || []; } catch (e) { a = []; } KM.pita(a); };
  KM.segarPita = () => segarPita(KM.kini);

  const tampilkanMasuk = () => { $("kmMuat").hidden = true; $("kmGalat").hidden = true; $("kmTampil").hidden = true; KM.pita([]); $("kmMasuk").hidden = false; };
  const tampilkanGalat = t => { $("kmMuat").hidden = true; $("kmMasuk").hidden = true; $("kmTampil").hidden = true; KM.pita([]); $("kmGalat").textContent = t; $("kmGalat").hidden = false; };
  /* GET ke /api/kemitraan/<jalur> (same-origin). 401 = tanpa sesi: layar masuk. Gagal lain = null; pemanggil menampilkan galatnya */
  KM.ambil = async jalur => {
    let r;
    try { r = await fetch("/api/kemitraan/" + String(jalur).replace(/^\/+/, ""), {credentials: "same-origin", headers: {accept: "application/json"}}); } catch (e) { return null; }
    if (r.status === 401) { tampilkanMasuk(); return null; }
    if (!r.ok) return null;
    try { return await r.json(); } catch (e) { return null; }
  };

  /* lembar bawah bersama (profil daerah/kampus/aktivasi); akademisi.js:359. Kepala tampil seketika, isi berat lewat nanti() */
  KM.bukaSheet = (mode, kepala, isiFn) => {
    const sh = $("kmSheet"), tk = ++tokenS; sh.dataset.mode = mode;
    $("kmSIsi").innerHTML = kepala + '<div class="ak-dtubuh" id="kmSTubuh"><div class="ak-hantu"></div></div>';
    sh.hidden = false; document.body.style.overflow = "hidden"; sh.querySelector(".ak-x").focus();
    nanti(() => {
      if (tk !== tokenS || sh.hidden) return;
      try { $("kmSTubuh").innerHTML = isiFn(); }
      catch (e) { console.warn("kemitraan sheet", e); $("kmSTubuh").innerHTML = kosongHtml("Gagal dimuat", "Muat ulang halaman."); }
    });
  };
  KM.tutupSheet = () => { $("kmSheet").hidden = true; tokenS++; $("kmTip").hidden = true; if ($("kmLembar").hidden) document.body.style.overflow = ""; };

  /* ---------- tampilan: klik segmen = ganti panel seketika; bangun() sekali dan malas lewat nanti() ---------- */
  const dibangun = new Set();
  function tampil(nama) {
    if (!KM.hak.includes(nama)) return;
    KM.kini = nama;
    $("kmTampil").querySelectorAll("button[data-t]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.t === nama)));
    document.querySelectorAll(".ak-tampilan").forEach(s => { s.hidden = s.id !== "kmv-" + nama; });
    const u = new URL(location.href); u.searchParams.set("tampil", nama); history.replaceState(null, "", u);
    segarPita(nama);
    nanti(() => {
      try { localStorage.setItem("km-tampil", nama); } catch (e) {}
      const el = $("kmv-" + nama), T = KM.tampilan[nama];
      if (!dibangun.has(nama) && el) {
        dibangun.add(nama);
        try { if (T) T.bangun(el); else el.innerHTML = kosongHtml(KM.URUTAN.find(x => x[0] === nama)[1]); }
        catch (e) { console.warn("kemitraan", nama, e); el.innerHTML = kosongHtml(nama, "Tampilan ini gagal dimuat. Muat ulang halaman."); }
        if (KM.kini === nama) segarPita(nama);   // hanya sesudah bangun pertama: pita aria-live tidak diumumkan ulang tiap klik
      }
    });
  }
  KM.tampil = tampil;

  async function mulai() {
    if (!$("kmMuat")) return;   // halaman cetak (buku) memakai helper KM tanpa cangkang layar
    $("kmMuat").innerHTML = '<div class="ak-hantu"></div>'.repeat(6); $("kmMuat").hidden = false;
    let s = null;
    try { const r = await fetch("/api/kemitraan/saya", {credentials: "same-origin", headers: {accept: "application/json"}}); s = r.ok ? await r.json() : null; } catch (e) { s = null; }
    if (!s?.jenis) return tampilkanMasuk();   // 401, 404, 503, atau jaringan gagal = tanpa sesi
    KM.peran = s.jenis; KM.hak = KM.HAK[s.jenis] || [];
    if (!KM.hak.length) return tampilkanGalat("Akunmu tidak punya tampilan di halaman ini. Buka halaman Saya untuk panggilan dan tugasmu.");
    const seg = KM.URUTAN.filter(x => KM.hak.includes(x[0])).map(([k, l]) => `<button type="button" data-t="${esc(k)}" aria-pressed="false">${ikon(KM.IK[k], "")}${esc(l)}</button>`).join("");
    $("kmTampil").innerHTML = seg;
    $("kmTampil").addEventListener("click", e => { const b = e.target.closest("button[data-t]"); if (b) tampil(b.dataset.t); });
    document.querySelectorAll(".ak-tabpanah").forEach(b => b.addEventListener("click", () => $("kmTampil").scrollBy({left: +b.dataset.d * 220, behavior: "smooth"})));
    $("kmTampil").hidden = false; $("kmMuat").hidden = true;
    let simpan = ""; try { simpan = localStorage.getItem("km-tampil") || ""; } catch (e) {}
    tampil([new URLSearchParams(location.search).get("tampil"), simpan].find(v => KM.hak.includes(v)) || KM.hak[0]);
  }

  /* kepala situs: menu garis tiga (layar sempit) dan tema terang/gelap; akademisi.js:2672-2679 */
  const burger = $("burger");
  if (burger) burger.addEventListener("click", () => { const b = document.querySelector("header.top").classList.toggle("buka"); burger.setAttribute("aria-expanded", String(b)); });
  const tema = $("tema");
  if (tema) tema.addEventListener("click", () => {
    const gelap = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const t = gelap ? "light" : "dark"; document.documentElement.dataset.theme = t;
    try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {}
  });
  /* penutup dialog dan lembar: latar atau tombol silang; Escape menutup lembar */
  document.addEventListener("click", e => { if (e.target.closest("[data-tutup-s]")) KM.tutupSheet(); if (e.target.closest("[data-tutup]")) { $("kmLembar").hidden = true; if ($("kmSheet").hidden) document.body.style.overflow = ""; } });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("kmSheet").hidden) KM.tutupSheet(); });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mulai); else mulai();
})();
