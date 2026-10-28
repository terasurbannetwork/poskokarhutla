/* /akademisi: direktori pakar kebencanaan, hanya staf BNPB dan admin. Data dari GET /api/akademisi (R2, bersesi; src/akademisi.js).
   Baris = [id, nama, kampus, [rumpun], h, karya, sitasi, orcid, [topik], foto, idSinta, prodi, subjek, status (s terdaftar SINTA,
   x tidak ada, "" belum dicek), logo kampus]. Semua teks dari luar di-escape. CSP: tanpa skrip inline (galat foto lewat listener capture). */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const angka = n => Number(n || 0).toLocaleString("id-ID");
  const inisial = n => n.replace(/[^\p{L} ]/gu, "").split(/\s+/).filter(w => w.length > 1).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
  const LUAR = 'target="_blank" rel="noopener noreferrer"';
  const PER_HAL = 24;
  const RE_KAMPUS = /universitas|university|institut|institute|politeknik|polytechnic|sekolah tinggi|akademi|college|school/i;
  const jenisK = k => k === "Afiliasi belum diketahui" ? "l" : RE_KAMPUS.test(k) ? "k" : "l";
  /* rumpun -> [label, ikon (path SVG 24px, garis), warna ikon] */
  const RUMPUN = {
    "gempa": ["Gempa bumi", '<path d="M2 12h4l2-6 4 12 3-9 2 3h5"/>', "#e8590c"],
    "tsunami": ["Tsunami", '<path d="M2 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M4 11c1-4 5-7 9-6-2 1-3 3-2 5 2 0 3-1 4-2"/>', "#0b7285"],
    "gunung api": ["Gunung api", '<path d="m3 20 6-10 2 3 2-4 8 11z"/><path d="M12 6c0-2 1-3 3-3M10 5c-1-1-1-2 0-3"/>', "#c92a2a"],
    "banjir": ["Banjir", '<path d="M12 3s-5 6-5 9a5 5 0 0 0 10 0c0-3-5-9-5-9z"/><path d="M2 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1"/>', "#1c7ed6"],
    "longsor": ["Tanah longsor", '<path d="M3 20h18L8 5z"/><circle cx="15" cy="9" r="1.5"/><circle cx="18" cy="13" r="1"/>', "#8d5524"],
    "karhutla": ["Karhutla", '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 2 1 3 3 3 5 1-2 1-5 0-9z"/>', "#f76707"],
    "hidrometeorologi": ["Hidrometeorologi", '<path d="M7 15a4 4 0 1 1 1-8 5 5 0 0 1 9 2 3 3 0 0 1 0 6z"/><path d="M9 18l-1 3M13 18l-1 3M17 18l-1 3"/>', "#4263eb"],
    "iklim": ["Iklim", '<path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 9v7"/>', "#e03131"],
    "pesisir": ["Pesisir", '<path d="M2 18c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1"/><circle cx="17" cy="7" r="3"/><path d="M2 14h7l3-3"/>', "#1098ad"],
    "geologi": ["Geologi", '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>', "#5f3dc4"],
    "manajemen bencana": ["Manajemen bencana", '<path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>', "#2b8a3e"],
    "kesehatan bencana": ["Kesehatan bencana", '<path d="M12 20s-8-5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11z"/><path d="M12 9v5M9.5 11.5h5"/>', "#d6336c"],
    "penginderaan jauh": ["Penginderaan jauh", '<rect x="9" y="9" width="6" height="6" rx="1"/><path d="M4 7l5 2M20 17l-5-2M7 4 5 9M17 20l2-5"/>', "#495057"],
  };
  const ikon = (d, w) => `<svg class="ak-ikon" viewBox="0 0 24 24" aria-hidden="true" style="--w:${w}">${d}</svg>`;
  const pilRumpun = (r, utama) => { const [l, d, w] = RUMPUN[r] || [r, "", "#6b7280"];
    return `<span class="ak-r${utama ? " utama" : ""}" style="--w0:${w}">${d ? ikon(d, w) : ""}${esc(l)}</span>`; };
  const METRIK = [[4, "h-index", "Pengaruh riset", '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],
    [5, "Karya", "Publikasi ilmiah", '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'],
    [6, "Sitasi", "Dikutip peneliti lain", '<path d="M7 7h4v6H5v-2c0-2 1-4 2-4zM15 7h4v6h-6v-2c0-2 1-4 2-4z"/>']];
  const metrik = o => `<div class="ak-metrik">${METRIK.map(([i, l, t, d]) => `<div title="${t}"><span class="ak-mlabel">${ikon(d, "currentColor")}${l}</span><b>${angka(o[i])}</b></div>`).join("")}</div>`;

  const st = {q: "", kampus: "", prodi: "", sumber: "s", urut: 4, rumpun: "", hal: 1, kJenis: "k"};
  let semua = [], hasil = [], perK = {}, logoK = {}, tunda = 0;

  const foto = (o, besar) => o[9]
    ? `<img class="ak-foto${besar ? " besar" : ""}" src="${esc(o[9])}" alt="" loading="lazy" referrerpolicy="no-referrer" data-inisial="${esc(inisial(o[1]))}">`
    : `<span class="ak-foto${besar ? " besar" : ""}" aria-hidden="true">${esc(inisial(o[1]))}</span>`;
  /* institusi dulu, prodi (bila ada) sebagai label di bawahnya */
  const sub = o => `<p>${esc(o[2])}</p>${o[11] ? `<span class="ak-prodi">${esc(o[11].replace(/\s*\((S\d|D\d|Sp-?\d)\)$/, ""))}</span>` : ""}`;
  const logo = o => o[14] ? `<img class="ak-logo" src="${esc(o[14])}" alt="Logo ${esc(o[2])}" loading="lazy" referrerpolicy="no-referrer">` : "";
  const sosok = (o, besar) => `<span class="ak-sosok${besar ? " besar" : ""}">${foto(o, besar)}${logo(o)}</span>`;
  const logoKecil = k => logoK[k] ? `<img class="ak-klogo" src="${esc(logoK[k])}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="ak-klogo kosong" aria-hidden="true">${esc(inisial(k))}</span>`;

  /* kartu: foto bulat berlogo kampus dan nama; di bawahnya label yang bisa diklik
     untuk menyaring (institusi, prodi, rumpun), lalu metrik. Kartu = div berperan tombol supaya label di dalamnya boleh jadi tombol. */
  const prodiDari = o => o[11] ? o[11].replace(/\s*\((S\d|D\d|Sp-?\d)\)$/, "") : "";
  const kartu = (o, i) => { const prodi = prodiDari(o);
    return `<div class="ak-orang" role="button" tabindex="0" data-i="${i}" aria-label="Buka profil ${esc(o[1])}">
      <span class="ak-atas">${sosok(o)}<span class="ak-nama"><h3>${esc(o[1])}</h3>${o[13] === "s" || o[15] === "diaspora" ? `<span class="ak-lencana">${o[13] === "s" ? `<em class="ak-l-sinta">SINTA</em>` : ""}${o[15] === "diaspora" ? `<em class="ak-l-diaspora">Diaspora</em>` : ""}</span>` : ""}</span></span>
      <span class="ak-kartu-label">
        <button type="button" class="ak-lbl-inst" data-fk="kampus" data-v="${esc(o[2])}" title="Saring: ${esc(o[2])}">${esc(o[2])}</button>
        ${prodi ? `<button type="button" class="ak-lbl-prodi" data-fk="prodi" data-v="${esc(prodi)}" title="Saring program studi ini">${esc(prodi)}</button>` : ""}
      </span>
      <span class="ak-pil">${o[3].map((r, j) => `<button type="button" class="ak-r${j === 0 ? " utama" : ""}" data-fk="rumpun" data-v="${esc(r)}" style="--w0:${(RUMPUN[r] || [])[2] || "#6b7280"}">${(RUMPUN[r] || [])[1] ? ikon(RUMPUN[r][1], RUMPUN[r][2]) : ""}${esc((RUMPUN[r] || [r])[0])}</button>`).join("")}</span>
      ${metrik(o)}
    </div>`; };

  function saring() {
    const q = st.q.toLowerCase();
    hasil = semua.filter(o => (!st.rumpun || o[3].includes(st.rumpun)) && (!st.kampus || o[2] === st.kampus) && (!st.prodi || prodiDari(o) === st.prodi)
      && (q || st.sumber === "" || (st.sumber === "s" ? o[13] === "s" : o[13] !== "x")) && (!q || o._cari.includes(q)));   // cari nama = semua sumber
    const u = st.urut;
    hasil.sort(u === 1 ? (a, b) => a[1].localeCompare(b[1], "id") : (a, b) => b[u] - a[u] || b[4] - a[4]);
    st.hal = 1;
    document.querySelectorAll("#akRumpun button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.r === st.rumpun)));
    $("akPIsi").innerHTML = `<em>${esc(st.prodi || "Semua program studi")}</em>`;
    gambar(false);
  }

  function gambar(gulir) {
    const nHal = Math.max(1, Math.ceil(hasil.length / PER_HAL)), a = (st.hal - 1) * PER_HAL;
    $("akDaftar").innerHTML = hasil.slice(a, a + PER_HAL).map((o, j) => kartu(o, a + j)).join("");
    $("akHampa").hidden = hasil.length > 0;
    $("akHal").innerHTML = navHal(st.hal, hasil.length, PER_HAL, "pakar");
    if (gulir) document.querySelector(".ak-hasil").scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"});
  }

  /* ---------- pemilih kampus dan lembaga ---------- */
  function daftarKampus() {
    const q = $("akKQ").value.trim().toLowerCase();
    const isi = Object.entries(perK).filter(([k]) => jenisK(k) === st.kJenis && (!q || k.toLowerCase().includes(q))).sort((a, b) => b[1] - a[1]);
    const semuaBtn = `<button type="button" role="option" data-k="" aria-selected="${!st.kampus}"><span>${st.kJenis === "k" ? "Semua universitas dan kampus" : "Semua lembaga"}</span></button>`;
    $("akKDaftar").innerHTML = (q ? "" : semuaBtn) + (isi.length ? isi.slice(0, 300).map(([k, n]) =>
      `<button type="button" role="option" data-k="${esc(k)}" aria-selected="${k === st.kampus}">${logoKecil(k)}<span>${esc(k)}</span><small>${angka(n)}</small></button>`).join("")
      : `<p>Tidak ada ${st.kJenis === "k" ? "kampus" : "lembaga"} bernama itu.</p>`);
    document.querySelectorAll("#akKJenis button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.j === st.kJenis)));
  }
  function bukaKampus(buka) {
    $("akKPop").hidden = !buka; $("akKBtn").setAttribute("aria-expanded", String(buka));
    if (buka) { $("akKQ").value = ""; daftarKampus(); $("akKQ").focus(); }
  }
  function pilihKampus(k) {
    st.kampus = k;
    if (k && st.prodi && !semua.some(o => o[2] === k && prodiDari(o) === st.prodi)) st.prodi = "";   // prodi yang tidak ada di kampus ini dilepas
    $("akKIsi").innerHTML = k ? `${logoKecil(k)}<em>${esc(k)}</em>` : "<em>Semua kampus dan lembaga</em>";
    bukaKampus(false); saring();
  }

  /* ---------- pemilih program studi: daftar ikut kampus terpilih ---------- */
  function daftarProdi() {
    const q = $("akPQ").value.trim().toLowerCase(), n = {};
    semua.forEach(o => { const p = prodiDari(o); if (p && (!st.kampus || o[2] === st.kampus)) n[p] = (n[p] || 0) + 1; });
    const isi = Object.entries(n).filter(([p]) => !q || p.toLowerCase().includes(q)).sort((a, b) => b[1] - a[1]);
    $("akPDaftar").innerHTML = (q ? "" : `<button type="button" role="option" data-p="" aria-selected="${!st.prodi}"><span>Semua program studi</span></button>`)
      + (isi.length ? isi.slice(0, 300).map(([p, c]) => `<button type="button" role="option" data-p="${esc(p)}" aria-selected="${p === st.prodi}"><span>${esc(p)}</span><small>${angka(c)}</small></button>`).join("")
      : `<p>Tidak ada program studi bernama itu.</p>`);
  }
  function bukaProdi(buka) {
    $("akPPop").hidden = !buka; $("akPBtn").setAttribute("aria-expanded", String(buka));
    if (buka) { $("akPQ").value = ""; daftarProdi(); $("akPQ").focus(); }
  }

  /* ---------- lembar detail ---------- */
  /* karya paling banyak dikutip dari OpenAlex lewat worker (kunci API di secret); gagal = bagian tetap tersembunyi */
  let karyaId = "";
  /* grafik area per tahun, SVG tulisan tangan: kurva halus (Catmull-Rom), angka di atas tiap titik, sumbu tahun di bawah */
  function grafik(seri, judul, warna) {
    const per = new Map(seri.map(([t, v]) => [+t, v])), th = [...per.keys()];   // tahun tanpa data diisi nol supaya sumbu berurutan
    seri = th.length ? Array.from({length: Math.max(...th) - Math.min(...th) + 1}, (_, i) => [Math.min(...th) + i, per.get(Math.min(...th) + i) ?? 0]) : seri;
    seri = seri.slice(Math.max(0, seri.findIndex(x => x[1] > 0)));   // tahun nol di awal dipangkas
    const W = 940, H = 190, kiri = 14, kanan = 14, atas = 28, bawah = 26, n = seri.length, maks = Math.max(1, ...seri.map(x => x[1]));
    const X = i => kiri + (n === 1 ? (W - kiri - kanan) / 2 : i * (W - kiri - kanan) / (n - 1)), Y = v => atas + (1 - v / maks) * (H - atas - bawah);
    const t = seri.map(([th, v], i) => [X(i), Y(v)]), dasar = H - bawah;
    /* kurva monoton (Fritsch-Carlson): tidak menembus di bawah nol atau di atas puncak antara dua titik */
    const dx = t.slice(1).map((p, i) => p[0] - t[i][0]), m = t.slice(1).map((p, i) => (p[1] - t[i][1]) / dx[i]);
    const tg = t.map((_, i) => i === 0 ? m[0] : i === n - 1 ? m[n - 2] : m[i - 1] * m[i] <= 0 ? 0 : 3 * (dx[i - 1] + dx[i]) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]));
    let d = `M${t[0][0]},${t[0][1]}`;
    for (let i = 0; i < n - 1; i++) d += ` C${t[i][0] + dx[i] / 3},${t[i][1] + (tg[i] || 0) * dx[i] / 3} ${t[i + 1][0] - dx[i] / 3},${t[i + 1][1] - (tg[i + 1] || 0) * dx[i] / 3} ${t[i + 1][0]},${t[i + 1][1]}`;
    /* label: tahun paling banyak ~14, angka di titik bertanda (tiap langkah, puncak, terakhir) */
    const langkah = Math.max(1, Math.ceil(n / 14)), iMaks = seri.findIndex(x => x[1] === maks), tandai = i => i % langkah === 0 || i === n - 1 || i === iMaks;
    const g = "g" + Math.random().toString(36).slice(2, 8);
    const lebar = n === 1 ? W : (W - kiri - kanan) / (n - 1);
    return `<figure class="ak-grafik" data-seri="${esc(JSON.stringify(seri.map(([th, v], i) => [th, v, t[i][0], t[i][1]])))}" data-w="${W}" data-h="${H}" style="--gw:${warna}"><figcaption>${judul}<span>${seri[0][0]}–${seri[n - 1][0]}, puncak ${angka(maks)} (${seri[iMaks][0]})</span></figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${judul}">
      <defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${warna}" stop-opacity=".26"/><stop offset="1" stop-color="${warna}" stop-opacity="0"/></linearGradient></defs>
      ${[.5, 1].map(f => `<line x1="${kiri}" x2="${W - kanan}" y1="${Y(maks * f)}" y2="${Y(maks * f)}" class="ak-gr-garis"/>`).join("")}
      <line x1="${kiri}" x2="${W - kanan}" y1="${dasar}" y2="${dasar}" class="ak-gr-dasar"/>
      <path d="${d} L${t[n - 1][0]},${dasar} L${t[0][0]},${dasar}Z" fill="url(#${g})"/><path d="${d}" fill="none" stroke="${warna}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <line class="ak-gr-bantu" x1="0" x2="0" y1="${atas - 8}" y2="${dasar}"/><circle class="ak-gr-sorot" r="5.5" cx="0" cy="0" fill="${warna}" stroke="var(--card)" stroke-width="2.5"/>
      ${t.map(([x, y], i) => tandai(i) ? `<circle cx="${x}" cy="${y}" r="3.4" fill="var(--card)" stroke="${warna}" stroke-width="2"/><text x="${x}" y="${y - 10}" class="ak-gr-nilai" style="fill:${warna}">${angka(seri[i][1])}</text><text x="${x}" y="${H - 6}" class="ak-gr-tahun">${seri[i][0]}</text>` : "").join("")}
      ${t.map(([x], i) => `<rect class="ak-gr-hit" data-i="${i}" x="${x - lebar / 2}" y="0" width="${lebar}" height="${H}"/>`).join("")}
    </svg><div class="ak-gr-tip" hidden></div></figure>`;
  }
  /* sorot grafik: tahun terdekat dengan penunjuk mendapat garis bantu, titik, dan tooltip; keluar = sembunyi */
  function sorotGrafik(e) {
    const r = e.target.closest?.(".ak-gr-hit"), fig = e.target.closest?.(".ak-grafik");
    if (!fig) return;
    if (!r) { fig.classList.remove("aktif"); fig.querySelector(".ak-gr-tip").hidden = true; return; }
    const seri = fig._seri || (fig._seri = JSON.parse(fig.dataset.seri)), [th, v, x, y] = seri[+r.dataset.i], prev = seri[+r.dataset.i - 1];
    const bantu = fig.querySelector(".ak-gr-bantu"), sorot = fig.querySelector(".ak-gr-sorot"), tip = fig.querySelector(".ak-gr-tip");
    bantu.setAttribute("x1", x); bantu.setAttribute("x2", x); sorot.setAttribute("cx", x); sorot.setAttribute("cy", y);
    const beda = prev ? v - prev[1] : null;
    tip.innerHTML = `<b>${th}</b><span><i></i>${angka(v)}</span>${beda != null ? `<small class="${beda > 0 ? "naik" : beda < 0 ? "turun" : ""}">${beda > 0 ? "▲" : beda < 0 ? "▼" : "="} ${angka(Math.abs(beda))} dari ${prev[0]}</small>` : ""}`;
    const svg = fig.querySelector("svg").getBoundingClientRect(), fb = fig.getBoundingClientRect(), k = svg.width / +fig.dataset.w;
    tip.hidden = false; fig.classList.add("aktif");
    const px = svg.left - fb.left + x * k, py = svg.top - fb.top + y * k, tw = tip.offsetWidth;
    tip.style.left = Math.min(Math.max(px - tw / 2, 6), fb.width - tw - 6) + "px"; tip.style.top = (py - tip.offsetHeight - 14) + "px";
  }

  /* rincian SINTA (panen): tabel Scopus vs GScholar, grafik Scopus per tahun, artikel berkuartil, ringkasan dari data bersumber */
  async function rinciSinta(o) {
    let x; try { const r = await fetch("/api/akademisi/sinta/" + encodeURIComponent(o[10]), {credentials: "same-origin"}); if (!r.ok) return; x = await r.json(); } catch (e) { return; }
    if (karyaId !== o[0]) return;
    const T = x.tabel || {}, BARIS = [["Article", "Artikel"], ["Citation", "Sitasi"], ["Cited Document", "Dokumen dikutip"], ["H-Index", "h-index"], ["i10-Index", "i10-index"], ["G-Index", "G-index"]];
    const ada = BARIS.filter(([k]) => T[k]);
    if (ada.length) {
      const skor = x.skor?.["SINTA Score Overall"];
      $("akMetrik").querySelector("div").innerHTML = `<table class="ak-tabel"><thead><tr><th></th><th><em class="sc">Scopus</em></th><th><em class="gs">Google Scholar</em></th></tr></thead>
        <tbody>${ada.map(([k, l]) => `<tr><td>${l}</td><td>${angka(T[k][0] ?? 0)}</td><td>${angka(T[k][1] ?? 0)}</td></tr>`).join("")}</tbody></table>
        ${skor != null ? `<p class="ak-skor">Skor SINTA <b>${angka(skor)}</b>${x.skor?.["SINTA Score 3Yr"] != null ? `, tiga tahun terakhir <b>${angka(x.skor["SINTA Score 3Yr"])}</b>` : ""}</p>` : ""}`;
      $("akMetrik").hidden = false;
    }
    const sc = x.grafik?.["scopus-chart-articles"];
    if (sc?.length > 1) {
      const gr = $("akTahunan"), lama = gr.querySelector(".ak-grafik2");
      lama.insertAdjacentHTML("afterbegin", grafik(sc.map(([t, v]) => [t, v]), "Artikel Scopus per tahun", "#e8590c"));
      lama.querySelectorAll(".ak-grafik").forEach(f => { if (f.querySelector("figcaption").textContent === "Karya terbit per tahun") f.remove(); });
      gr.hidden = false;
    }
    if (x.artikel?.length) {
      const IKJ = '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>';
      $("akScopus").querySelector("ol").innerHTML = x.artikel.map(k => { const u = (k.urutan || "").match(/(\d+) of (\d+)/);
        return barisKarya({...k, q: (k.kuartil || "").match(/^Q(\d)/)?.[1], jenis: /Conference/i.test(k.kuartil || "") ? "Prosiding" : /Journal/i.test(k.kuartil || "") ? "Jurnal" : /Book/i.test(k.kuartil || "") ? "Buku" : "",
          urutan: u && +u[1] > 0 ? u[1] : null, jumlah_penulis: u?.[2]}); }).join("");
      $("akScopus").hidden = false;
    }
    /* ringkasan: hanya merangkai fakta yang ada di data, tanpa klaim tambahan */
    const kal = [`${o[1]} tercatat di ${o[2]}${x.prodi ? `, ${x.prodi.replace(/^(S\d|D\d|Sp-?\d) - (.*)$/, "program studi $2 ($1)")}` : ""}.`];
    if (x.subjek?.length) kal.push(`Bidang yang dicantumkan di SINTA: ${x.subjek.join(", ")}.`);
    if (T.Article) kal.push(`Tercatat ${angka(T.Article[0] ?? 0)} artikel di Scopus dengan h-index ${angka(T["H-Index"]?.[0] ?? 0)} dan ${angka(T.Article[1] ?? 0)} karya di Google Scholar dengan h-index ${angka(T["H-Index"]?.[1] ?? 0)}.`);
    const q1 = (x.artikel || []).filter(k => /^Q1/.test(k.kuartil || "")).length;
    if (x.artikel?.length) kal.push(`${q1 ? `${q1} dari ${x.artikel.length} artikel Scopus terbarunya terbit di jurnal Q1. ` : ""}Artikel terbaru terbit di ${x.artikel[0].terbitan || "jurnal bereputasi"} (${x.artikel[0].tahun}).`);
    $("akRingkas").querySelector("p").textContent = kal.join(" ");
    $("akRingkas").hidden = false;
  }
  /* navigasi halaman bersama: daftar pakar dan daftar karya memakai bentuk yang sama */
  function navHal(hal, total, per, benda) {
    const nHal = Math.max(1, Math.ceil(total / per)), a = (hal - 1) * per;
    if (!total) return "";
    const awal = Math.max(1, Math.min(hal - 2, nHal - 4)), jendela = Array.from({length: Math.min(5, nHal)}, (_, i) => awal + i);
    const nomor = [...new Set([...(awal > 1 ? [1] : []), ...jendela, ...(awal + 4 < nHal ? [nHal] : [])])];
    let isi = `<button type="button" class="ak-hal-arah" data-h="${hal - 1}" ${hal === 1 ? "disabled" : ""}>‹ Sebelumnya</button>`, prev = 0;
    for (const n of nomor) { if (n - prev > 1) isi += "<span>…</span>"; isi += `<button type="button" data-h="${n}"${n === hal ? ' aria-current="page"' : ""}>${angka(n)}</button>`; prev = n; }
    isi += `<button type="button" class="ak-hal-arah" data-h="${hal + 1}" ${hal === nHal ? "disabled" : ""}>Berikutnya ›</button>`;
    return `<p><b>${angka(total)}</b> ${benda}<span>menampilkan ${angka(a + 1)}–${angka(Math.min(a + per, total))}</span></p>${nHal > 1 ? `<div>${isi}</div>` : ""}`;
  }
  const IKJ = '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>';
  const IKL = {jenis: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>', orang: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
    tahun: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', kuartil: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>'};
  /* satu baris karya (OpenAlex atau Scopus): judul + label berikon di kiri, kutipan di kolom kanan */
  const barisKarya = k => `<li><a href="${esc(k.url)}" ${LUAR}><span class="ak-kisi"><b>${esc(k.judul)}</b>
      <span class="ak-klabel">${k.q ? `<em class="q q${k.q}">${ikon(IKL.kuartil, "#fff")}Q${k.q}</em>` : ""}${k.jenis ? `<em class="j">${ikon(IKL.jenis, "#fff")}${esc(k.jenis)}</em>` : ""}${k.terbitan ? `<em class="t">${ikon(IKJ, "currentColor")}${esc(k.terbitan)}</em>` : ""}${k.urutan ? `<em>${ikon(IKL.orang, "currentColor")}Penulis ke-${k.urutan} dari ${k.jumlah_penulis}</em>` : ""}${k.tahun ? `<em>${ikon(IKL.tahun, "currentColor")}${k.tahun}</em>` : ""}</span></span>
      <span class="ak-kangka"><b>${angka(k.sitasi ?? 0)}</b><small>kutipan</small></span></a></li>`;
  const kst = {hal: 1, urut: "sitasi", jenis: "", cari: ""};
  let karyaTunda = 0;
  /* ORCID publik: tautan muncul, riwayat pendidikan dan pekerjaan sebagai lini masa, biografi apa adanya (berlabel sumbernya) */
  function orcid(x, id) {
    $("akTautan").insertAdjacentHTML("beforeend", `<a href="https://orcid.org/${esc(id)}" ${LUAR}>ORCID${ikon('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', "currentColor")}</a>`);
    const garis = (l, judul) => l.length ? `<div class="ak-garis"><h4>${judul}</h4><ol>${l.map(r => `<li><span class="ak-gthn">${r.mulai || ""}${r.selesai ? `–${r.selesai}` : r.mulai ? "–kini" : ""}</span><b>${esc(r.peran || r.unit || r.institusi)}</b><small>${esc([r.peran || r.unit ? r.unit : "", r.institusi].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", "))}</small></li>`).join("")}</ol></div>` : "";
    const isi = (x.biografi ? `<p class="ak-bio">${esc(x.biografi)}</p>` : "") + `<div class="ak-garis2">${garis(x.pendidikan, "Pendidikan")}${garis(x.pekerjaan, "Pekerjaan dan jabatan")}</div>`;
    if (!x.biografi && !x.pendidikan.length && !x.pekerjaan.length) return;
    const sek = $("akOrcid"); sek.querySelector(".ak-disi").innerHTML = isi + `<p class="ak-sumber">Sumber: rekaman publik ORCID</p>`; sek.hidden = false;
  }
  async function karya(o, awal = true) {
    karyaId = o[0];
    if (awal) Object.assign(kst, {hal: 1, urut: "sitasi", jenis: "", cari: ""});
    const q = new URLSearchParams({hal: kst.hal, urut: kst.urut, ...(kst.jenis && {jenis: kst.jenis}), ...(kst.cari && {cari: kst.cari}), ...(awal && o[7] && {orcid: o[7]})});
    const sek = $("akKarya"); if (!awal && sek) sek.querySelector("ol").style.opacity = ".5";
    let j; try { const r = await fetch(`/api/akademisi/karya/${encodeURIComponent(o[0])}?${q}`, {credentials: "same-origin"}); if (!r.ok) return; j = await r.json(); } catch (e) { return; }
    if (karyaId !== o[0] || !sek) return;
    const gr = $("akTahunan");
    if (awal && gr && j.tahunan?.length > 1) {
      const box = gr.querySelector("div"), adaScopus = [...box.querySelectorAll("figcaption")].some(f => f.textContent.startsWith("Artikel Scopus per tahun"));   // SINTA lebih panjang: menang
      box.insertAdjacentHTML("beforeend", (adaScopus ? "" : grafik(j.tahunan.map(x => [x[0], x[1]]), "Karya terbit per tahun", "#e8590c")) + grafik(j.tahunan.map(x => [x[0], x[2]]), "Sitasi per tahun", "#2f9e44"));
      gr.hidden = false;
    }
    if (awal && j.orcid?.publik) orcid(j.orcid, o[7]);
    if (awal && !j.karya?.length) return;
    const ol = sek.querySelector("ol"); ol.style.opacity = "";
    ol.innerHTML = j.karya.length ? j.karya.map(barisKarya).join("") : `<li class="ak-khampa">Tidak ada karya yang cocok.</li>`;
    $("akKHal").innerHTML = navHal(j.hal || kst.hal, Math.min(j.jumlah || 0, 50 * (j.per_hal || 8)), j.per_hal || 8, "karya");
    sek.hidden = false;
    if (awal) {   // pasang kendali saringan sekali per lembar
      sek.querySelector(".ak-ksaring").addEventListener("click", e => { const b = e.target.closest("button[data-k]"); if (!b) return;
        kst[b.dataset.k] = b.dataset.v; kst.hal = 1; b.parentElement.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); karya(o, false); });
      sek.querySelector("input").addEventListener("input", e => { clearTimeout(karyaTunda); karyaTunda = setTimeout(() => { kst.cari = e.target.value.trim(); kst.hal = 1; karya(o, false); }, 350); });
      $("akKHal").addEventListener("click", e => { const b = e.target.closest("button[data-h]"); if (!b || b.disabled) return; kst.hal = +b.dataset.h; karya(o, false); sek.scrollIntoView({block: "start", behavior: "smooth"}); });
    }
  }

  function buka(o) {
    const IK = {buka: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'};
    const tautan = [[`https://openalex.org/${o[0]}`, "OpenAlex"], o[10] && [`https://sinta.kemdiktisaintek.go.id/authors/profile/${o[10]}`, "SINTA"],
[`https://scholar.google.com/scholar?q=${encodeURIComponent('"' + o[1] + '"')}`, "Google Scholar"]].filter(Boolean);
    const status = o[13] === "s" ? ["ok", "Terdaftar di SINTA"] : o[13] === "x" ? ["", "Tidak ditemukan di SINTA"] : ["", "Belum dicocokkan dengan SINTA"];
    /* kepala lembar: foto, nama, institusi, label (prodi, SINTA, rumpun) dan metrik semuanya di pita navy */
    $("akDIsi").innerHTML = `<div class="ak-dkepala"><div class="ak-dk-atas">${sosok(o, true)}<div class="ak-nama"><h2 id="akDNama">${esc(o[1])}</h2><p>${esc(o[2])}</p></div></div>
        <div class="ak-pil">${o[11] ? `<span class="ak-prodi">${esc(o[11].replace(/\s*\((S\d|D\d|Sp-?\d)\)$/, ""))}</span>` : ""}<span class="ak-tanda ${status[0]}">${status[1]}</span>${o[15] === "diaspora" ? `<span class="ak-tanda diaspora">Diaspora Indonesia</span>` : ""}${o[3].map(r => pilRumpun(r)).join("")}</div>
        ${metrik(o)}</div>
      <div class="ak-dtubuh">
        ${o[12] ? `<section class="ak-dbagian"><h3>Bidang menurut SINTA</h3><p>${esc(o[12])}</p></section>` : ""}
        <section class="ak-dbagian"><h3>Topik riset utama</h3><div class="ak-topik">${o[8].map(t => `<span>${esc(t)}</span>`).join("")}</div></section>
        <section class="ak-dbagian" id="akOrcid" hidden><h3>Biografi dan riwayat</h3></section>
        <section class="ak-dbagian" id="akRingkas" hidden><h3>Ringkasan</h3><p></p></section>
        <section class="ak-dbagian" id="akMetrik" hidden><h3>Metrik publikasi menurut SINTA</h3><div></div></section>
        <section class="ak-dbagian" id="akTahunan" hidden><h3>Rekam jejak per tahun</h3><div class="ak-grafik2"></div></section>
        <section class="ak-dbagian" id="akScopus" hidden><h3>Artikel Scopus terbaru</h3><ol class="ak-karya"></ol></section>
        <section class="ak-dbagian" id="akKarya" hidden><h3>Karya ilmiah</h3>
          <div class="ak-ksaring"><div class="ak-seg" role="group" aria-label="Jenis karya"><button type="button" data-k="jenis" data-v="" aria-pressed="true">Semua</button><button type="button" data-k="jenis" data-v="jurnal" aria-pressed="false">Jurnal</button><button type="button" data-k="jenis" data-v="prosiding" aria-pressed="false">Prosiding</button><button type="button" data-k="jenis" data-v="buku" aria-pressed="false">Buku</button></div>
            <label class="ak-cari ak-kcari2"><span class="sr">Cari judul karya</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" autocomplete="off" placeholder="Cari judul karya"></label>
            <div class="ak-seg" role="group" aria-label="Urutkan karya"><span class="ak-seg-lbl">Urutkan</span><button type="button" data-k="urut" data-v="sitasi" aria-pressed="true">Paling dikutip</button><button type="button" data-k="urut" data-v="terbaru" aria-pressed="false">Terbaru</button></div></div>
          <ol class="ak-karya"></ol><nav id="akKHal" class="ak-hal" aria-label="Halaman daftar karya"></nav></section>
        <section class="ak-dbagian"><h3>Profil di luar</h3><div class="ak-tautan" id="akTautan">${tautan.map(([u, n]) => `<a href="${esc(u)}" ${LUAR}>${n}${ikon(IK.buka, "currentColor")}</a>`).join("")}</div></section>
      </div>`;
    /* tiap bagian jadi kontainer yang bisa dilipat; id dan hidden ikut pindah supaya pengisi async tetap menemukannya */
    for (const sc of $("akDIsi").querySelectorAll("section.ak-dbagian")) {
      const d = document.createElement("details"), sum = document.createElement("summary"), isi = document.createElement("div");
      d.className = "ak-dbagian"; if (sc.id) d.id = sc.id; d.hidden = sc.hidden; d.open = true; isi.className = "ak-disi";
      sum.append(sc.querySelector("h3")); isi.append(...sc.childNodes); d.append(sum, isi); sc.replaceWith(d);
    }
    $("akLembar").hidden = false;
    document.body.style.overflow = "hidden";
    karya(o);
    if (o[10]) rinciSinta(o);
    $("akLembar").querySelector(".ak-x").focus();
  }
  function tutup() { $("akLembar").hidden = true; document.body.style.overflow = ""; }

  function siapkan(d) {
    const per = {};
    perK = {};
    semua.forEach(o => { o[3].forEach(r => { per[r] = (per[r] || 0) + 1; }); perK[o[2]] = (perK[o[2]] || 0) + 1; if (o[14] && !logoK[o[2]]) logoK[o[2]] = o[14]; });
    semua.forEach(o => { if (!o[14] && logoK[o[2]]) o[14] = logoK[o[2]]; });   // logo kampus dipinjam dari rekan sekampus yang sudah tercocokkan SINTA
    const kampus = Object.keys(perK).filter(k => jenisK(k) === "k").length;
    const IK = ['<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5.5 2 5.5 5"/>',
      '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c2 2 10 2 12 0v-5"/>', '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M8 10h.01M16 10h.01"/>',
      '<path d="M12 3l2.5 2 3.2-.3.8 3.1 2.7 1.8-1.3 3 1.3 3-2.7 1.8-.8 3.1-3.2-.3L12 21l-2.5-2-3.2.3-.8-3.1L2.8 14.4l1.3-3-1.3-3 2.7-1.8.8-3.1 3.2.3z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'];
    $("akAngka").innerHTML = [[semua.length, "pakar terhimpun"], [kampus, "universitas dan kampus"], [Object.keys(perK).length - kampus, "lembaga riset dan pemerintah"], [semua.filter(o => o[13] === "s").length, "terdaftar di SINTA"]]
      .map(([n, l], i) => `<div><svg viewBox="0 0 24 24" aria-hidden="true">${IK[i]}</svg><b>${angka(n)}</b><span>${l}</span></div>`).join("");
    $("akRumpun").innerHTML = `<button type="button" data-r="" aria-pressed="true">${ikon('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>', "currentColor")}Semua rumpun</button>` +
      d.rumpun.slice().sort((a, b) => (per[b] || 0) - (per[a] || 0)).map(r => { const [l, ic, w] = RUMPUN[r] || [r, "", "#6b7280"];
        return `<button type="button" data-r="${esc(r)}" aria-pressed="false">${ic ? ikon(ic, w) : ""}${esc(l)}<span>${angka(per[r] || 0)}</span></button>`; }).join("");
  }

  function segmen(id, kunci, ubah) {
    $(id).addEventListener("click", e => {
      const b = e.target.closest("button[data-v]"); if (!b) return;
      st[kunci] = ubah(b.dataset.v);
      $(id).querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      saring();
    });
  }

  async function mulai() {
    $("akMuat").innerHTML = '<div class="ak-hantu"></div>'.repeat(6);
    const galat = t => { $("akMuat").textContent = ""; $("akGalat").textContent = t; $("akGalat").hidden = false; };
    let r;
    try { r = await fetch("/api/akademisi", {credentials: "same-origin"}); } catch (e) { galat("Gagal memuat data. Periksa koneksi lalu muat ulang halaman."); return; }
    $("akMuat").textContent = "";
    if (r.status === 401) { $("akMasuk").hidden = false; return; }
    if (!r.ok) { galat((await r.json().catch(() => ({}))).galat || `Gagal memuat (${r.status})`); return; }
    const d = await r.json();
    semua = d.orang.map(o => Object.assign(o, {_cari: [o[1], o[2], o[11], o[12], ...o[8], ...o[3]].join(" ").toLowerCase()}));
    siapkan(d);
    $("akIsi").hidden = false;
    $("akQ").addEventListener("input", () => { clearTimeout(tunda); tunda = setTimeout(() => { st.q = $("akQ").value.trim(); saring(); }, 200); });
    segmen("akS", "sumber", v => v);
    segmen("akU", "urut", v => +v);
    $("akRumpun").addEventListener("click", e => { const b = e.target.closest("button[data-r]"); if (!b) return; st.rumpun = b.dataset.r; saring(); });
    $("akHal").addEventListener("click", e => { const b = e.target.closest("button[data-h]"); if (!b || b.disabled) return; st.hal = +b.dataset.h; gambar(true); });
    $("akKBtn").addEventListener("click", () => bukaKampus($("akKPop").hidden));
    $("akKQ").addEventListener("input", daftarKampus);
    $("akKJenis").addEventListener("click", e => { const b = e.target.closest("button[data-j]"); if (!b) return; st.kJenis = b.dataset.j; daftarKampus(); $("akKQ").focus(); });
    $("akKDaftar").addEventListener("click", e => { const b = e.target.closest("button[data-k]"); if (b) pilihKampus(b.dataset.k); });
    $("akPBtn").addEventListener("click", () => bukaProdi($("akPPop").hidden));
    $("akPQ").addEventListener("input", daftarProdi);
    $("akPDaftar").addEventListener("click", e => { const b = e.target.closest("button[data-p]"); if (b) { st.prodi = b.dataset.p; bukaProdi(false); saring(); } });
    document.addEventListener("click", e => {
      if (!$("akKPop").hidden && !e.target.closest(".ak-kampus-pilih:not(.ak-prodi-pilih)")) bukaKampus(false);
      if (!$("akPPop").hidden && !e.target.closest(".ak-prodi-pilih")) bukaProdi(false);
    });
    /* label di kartu menyaring; klik di bagian lain kartu membuka profil */
    $("akDaftar").addEventListener("click", e => {
      const f = e.target.closest("[data-fk]");
      if (f) { const v = f.dataset.v;
        if (f.dataset.fk === "kampus") { st.kJenis = jenisK(v); pilihKampus(v); } else { st[f.dataset.fk] = v; saring(); }
        document.querySelector(".ak-saring").scrollIntoView({block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); return; }
      const b = e.target.closest(".ak-orang"); if (b) buka(hasil[+b.dataset.i]);
    });
    $("akDaftar").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("ak-orang")) { e.preventDefault(); buka(hasil[+e.target.dataset.i]); } });
    $("akLembar").addEventListener("click", e => { if (e.target.closest("[data-tutup]")) tutup(); });
    $("akLembar").addEventListener("pointermove", sorotGrafik);
    $("akLembar").addEventListener("pointerleave", () => document.querySelectorAll(".ak-grafik.aktif").forEach(f => { f.classList.remove("aktif"); f.querySelector(".ak-gr-tip").hidden = true; }));
    $("akLembar").addEventListener("pointerout", e => { const f = e.target.closest?.(".ak-grafik"); if (f && !f.contains(e.relatedTarget)) { f.classList.remove("aktif"); f.querySelector(".ak-gr-tip").hidden = true; } });
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if (!$("akLembar").hidden) tutup(); else if (!$("akKPop").hidden) { bukaKampus(false); $("akKBtn").focus(); } else if (!$("akPPop").hidden) { bukaProdi(false); $("akPBtn").focus(); }
    });
    $("akReset").addEventListener("click", () => {
      Object.assign(st, {q: "", rumpun: "", sumber: "", prodi: ""}); $("akQ").value = "";
      $("akS").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.v === "")));
      pilihKampus("");
    });
    saring();
  }

  /* kepala situs: menu garis tiga (layar sempit) dan tema terang/gelap, sama dengan halaman lain */
  const burger = $("burger");
  if (burger) burger.addEventListener("click", () => { const b = document.querySelector("header.top").classList.toggle("buka"); burger.setAttribute("aria-expanded", String(b)); });
  const tema = $("tema");
  if (tema) tema.addEventListener("click", () => {
    const gelap = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const t = gelap ? "light" : "dark"; document.documentElement.dataset.theme = t;
    try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {}
  });
  // foto gagal dimuat (Scholar menghapus/menolak): ganti lingkaran inisial; logo gagal: buang
  document.addEventListener("error", e => {
    const img = e.target;
    if (img.tagName !== "IMG") return;
    if (img.classList.contains("ak-logo") || img.classList.contains("ak-klogo") || img.classList.contains("ak-sampul-logo")) { img.remove(); return; }
    const sp = img.parentElement?.classList.contains("ak-sampul") ? img.parentElement : null;
    if (sp && img === sp.firstElementChild) { sp.classList.add("kosong"); const i = document.createElement("span"); i.className = "ak-sampul-inisial"; i.textContent = img.dataset.inisial || ""; img.replaceWith(i); return; }
    if (!img.classList.contains("ak-foto")) return;
    const s = document.createElement("span"); s.className = img.className; s.textContent = img.dataset.inisial; s.setAttribute("aria-hidden", "true");
    img.replaceWith(s);
  }, true);
  mulai();
})();
