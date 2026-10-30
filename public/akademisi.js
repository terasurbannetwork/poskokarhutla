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
    "kekeringan": ["Kekeringan", '<circle cx="12" cy="7" r="3"/><path d="M12 1v1M5.5 3.5l.7.7M18.5 3.5l-.7.7M3 21l3-6 3 3 3-5 3 4 3-2 3 6z"/>', "#b8860b"],
    "pesisir": ["Pesisir", '<path d="M2 18c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1"/><circle cx="17" cy="7" r="3"/><path d="M2 14h7l3-3"/>', "#1098ad"],
    "geologi": ["Geologi", '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>', "#5f3dc4"],
    "manajemen bencana": ["Manajemen bencana", '<path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>', "#2b8a3e"],
    "kesehatan bencana": ["Kesehatan bencana", '<path d="M12 20s-8-5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11z"/><path d="M12 9v5M9.5 11.5h5"/>', "#d6336c"],
    "penginderaan jauh": ["Penginderaan jauh", '<rect x="9" y="9" width="6" height="6" rx="1"/><path d="M4 7l5 2M20 17l-5-2M7 4 5 9M17 20l2-5"/>', "#495057"],
  };
  const ikon = (d, w) => `<svg class="ak-ikon" viewBox="0 0 24 24" aria-hidden="true" style="--w:${w}">${d}</svg>`;
  const pilRumpun = (r, utama) => { const [l, d, w] = RUMPUN[r] || [r, "", "#6b7280"];
    return `<span class="ak-r${utama ? " utama" : ""}" style="--w0:${w}">${d ? ikon(d, w) : ""}${esc(l)}</span>`; };
  /* judul HURUF BESAR SEMUA dari sumber jadi Huruf Judul; nama jurnal OpenAlex "A/A" kembar diambil satu */
  const KECIL = new Set("a an and as at by for from in into of on or the to with via di dan untuk dari pada yang ke dengan atau dalam terhadap sebagai oleh".split(" "));
  const rapiJudul = t => { t = String(t || "").trim(); if (!t || /\p{Ll}/u.test(t) || t.length < 16) return t;
    return t.toLowerCase().replace(/[\p{L}\d][\p{L}\d'’-]*/gu, (w, i) => i && KECIL.has(w) && !/[:–—]\s*$/.test(t.slice(0, i)) ? w : w[0].toUpperCase() + w.slice(1)); };
  const rapiJurnal = t => { const p = String(t || "").split("/"), n = x => x.trim().toLowerCase().replace(/^the\s+/, "");
    return p.length === 2 && n(p[0]) === n(p[1]) ? p[0].trim() : String(t || ""); };
  const METRIK = [[4, "h-index", "Pengaruh riset", '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],
    [5, "Karya", "Publikasi ilmiah", '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'],
    [6, "Sitasi", "Dikutip peneliti lain", '<path d="M7 7h4v6H5v-2c0-2 1-4 2-4zM15 7h4v6h-6v-2c0-2 1-4 2-4z"/>']];
  const metrik = o => `<div class="ak-metrik">${METRIK.map(([i, l, t, d]) => `<div title="${t}"><span class="ak-mlabel">${ikon(d, "currentColor")}${l}</span><b>${angka(o[i])}</b></div>`).join("")}</div>`;

  const st = {q: "", prov: new Set(), kampus: new Set(), prodi: "", sumber: "s", urut: 4, rumpun: new Set(), hal: 1, kJenis: "k", baru: false};
  let baruSet = new Set();
  let semua = [], hasil = [], perK = {}, logoK = {}, tunda = 0;
  const PROV = {11: "Aceh", 12: "Sumatera Utara", 13: "Sumatera Barat", 14: "Riau", 15: "Jambi", 16: "Sumatera Selatan", 17: "Bengkulu", 18: "Lampung", 19: "Kepulauan Bangka Belitung", 21: "Kepulauan Riau",
    31: "DKI Jakarta", 32: "Jawa Barat", 33: "Jawa Tengah", 34: "DI Yogyakarta", 35: "Jawa Timur", 36: "Banten", 51: "Bali", 52: "Nusa Tenggara Barat", 53: "Nusa Tenggara Timur",
    61: "Kalimantan Barat", 62: "Kalimantan Tengah", 63: "Kalimantan Selatan", 64: "Kalimantan Timur", 65: "Kalimantan Utara", 71: "Sulawesi Utara", 72: "Sulawesi Tengah", 73: "Sulawesi Selatan",
    74: "Sulawesi Tenggara", 75: "Gorontalo", 76: "Sulawesi Barat", 81: "Maluku", 82: "Maluku Utara", 91: "Papua", 92: "Papua Barat", 93: "Papua Selatan", 94: "Papua Tengah", 95: "Papua Pegunungan", 96: "Papua Barat Daya"};
  let kampusInfo = {}, kontak = {}, peta = new Map(), dp = new Set(), tokenS = 0, sibuk = false;
  const DP_KEY = "ak-dp", PERLU_KEY = "ak-dp-perlu";
  const nanti = f => window.requestIdleCallback ? requestIdleCallback(f, {timeout: 300}) : setTimeout(f, 0);
  const provK = k => kampusInfo[k]?.prov || null, provO = o => provK(o[2]);
  const provNama = v => PROV[v] || "";
  /* provinsi, kampus, rumpun: multi pilih (Set); kosong = semua. "?" = lokasi belum diketahui */
  const cocokProv = o => !st.prov.size || st.prov.has(provO(o) || "?");
  const cocokProvK = k => !st.prov.size || st.prov.has(provK(k) || "?");
  /* tandai centang di daftar pop-up tanpa menggambar ulang (gulir daftar tetap) */
  const tandai = (box, kunci, s) => box.querySelectorAll("button[role=option]").forEach(b => b.setAttribute("aria-selected", String(b.dataset[kunci] ? s.has(b.dataset[kunci]) : !s.size)));
  const balik = (s, v) => { const t = new Set(v ? s : []); if (v) t.has(v) ? t.delete(v) : t.add(v); return t; };
  const emailOk = e => typeof e === "string" && /^[^\s@<>"']+@[^\s@<>"']+$/.test(e);
  const IKON_PIN = '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', IKON_MAIL = '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    IKON_TANDA = '<path d="M6 4h12v17l-6-4-6 4z"/>', IKON_WEB = '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>';
  /* email: dari ORCID (kontak.json), kalau tidak ada email resmi kampus; tak ada keduanya = null */
  const emailDari = o => { const a = [].concat(kontak[o[0]]?.email || []).filter(emailOk); if (a.length) return {list: a, sumber: "ORCID"};
    const k = [].concat(kampusInfo[o[2]]?.email || []).filter(emailOk); return k.length ? {list: k, sumber: "Email kampus"} : null; };

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
      <label class="ak-pilih" title="Tambah ke daftar pendek"><input type="checkbox" data-dp="${esc(o[0])}" aria-label="Tambah ${esc(o[1])} ke daftar pendek"${dp.has(o[0]) ? " checked" : ""}><span class="ak-cek"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg></span></label>
      <span class="ak-atas">${sosok(o)}<span class="ak-nama"><h3>${esc(o[1])}</h3>${o[13] === "s" || o[15] === "diaspora" || baruSet.has(o[0]) ? `<span class="ak-lencana">${baruSet.has(o[0]) ? `<em class="ak-l-baru">Baru</em>` : ""}${o[13] === "s" ? `<em class="ak-l-sinta">SINTA</em>` : ""}${o[15] === "diaspora" ? `<em class="ak-l-diaspora">Diaspora</em>` : ""}</span>` : ""}</span></span>
      <span class="ak-kartu-label">
        <button type="button" class="ak-lbl-inst" data-kp="${esc(o[2])}" title="Profil kampus ${esc(o[2])}">${esc(o[2])}</button>
        ${prodi ? `<button type="button" class="ak-lbl-prodi" data-fk="prodi" data-v="${esc(prodi)}" title="Saring program studi ini">${esc(prodi)}</button>` : ""}
      </span>
      <span class="ak-pil">${o[3].map((r, j) => `<button type="button" class="ak-r${j === 0 ? " utama" : ""}" data-fk="rumpun" data-v="${esc(r)}" style="--w0:${(RUMPUN[r] || [])[2] || "#6b7280"}">${(RUMPUN[r] || [])[1] ? ikon(RUMPUN[r][1], RUMPUN[r][2]) : ""}${esc((RUMPUN[r] || [r])[0])}</button>`).join("")}</span>
      ${metrik(o)}
    </div>`; };

  function saring() {
    const q = st.q.toLowerCase();
    hasil = semua.filter(o => cocokProv(o) && (!st.rumpun.size || o[3].some(r => st.rumpun.has(r))) && (!st.kampus.size || st.kampus.has(o[2])) && (!st.prodi || prodiDari(o) === st.prodi)
      && (!st.baru || baruSet.has(o[0])) && (q || st.baru || st.sumber === "" || (st.sumber === "s" ? o[13] === "s" : o[13] !== "x")) && (!q || o._cari.includes(q)));   // cari nama = semua sumber
    const u = st.urut;
    hasil.sort(u === 1 ? (a, b) => a[1].localeCompare(b[1], "id") : (a, b) => b[u] - a[u] || b[4] - a[4]);
    st.hal = 1;
    chromeSaring();
    gambar(false);
  }
  /* chrome filter (chip, label tombol) diperbarui seketika di jalur klik; saring() yang berat lewat nanti */
  function chromeSaring() {
    document.querySelectorAll("#akRumpun button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.r ? st.rumpun.has(b.dataset.r) : !st.rumpun.size)));
    $("akPIsi").innerHTML = `<em>${esc(st.prodi || "Semua program studi")}</em>`;
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
    const isi = Object.entries(perK).filter(([k]) => jenisK(k) === st.kJenis && cocokProvK(k) && (!q || k.toLowerCase().includes(q))).sort((a, b) => b[1] - a[1]);
    const semuaBtn = `<button type="button" role="option" data-k="" aria-selected="${!st.kampus.size}"><span>${st.kJenis === "k" ? "Semua universitas dan kampus" : "Semua lembaga"}</span></button>`;
    $("akKDaftar").innerHTML = (q ? "" : semuaBtn) + (isi.length ? isi.slice(0, 300).map(([k, n]) =>
      `<button type="button" role="option" data-k="${esc(k)}" aria-selected="${st.kampus.has(k)}">${logoKecil(k)}<span>${esc(k)}</span><small>${angka(n)}</small></button>`).join("")
      : `<p>Tidak ada ${st.kJenis === "k" ? "kampus" : "lembaga"} bernama itu.</p>`);
    document.querySelectorAll("#akKJenis button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.j === st.kJenis)));
  }
  function bukaKampus(buka) {
    $("akKPop").hidden = !buka; $("akKBtn").setAttribute("aria-expanded", String(buka));
    if (buka) { $("akKQ").value = ""; daftarKampus(); $("akKQ").focus(); }
  }
  const lepasProdi = () => { if (st.prodi && !semua.some(o => cocokProv(o) && (!st.kampus.size || st.kampus.has(o[2])) && prodiDari(o) === st.prodi)) st.prodi = ""; };   // prodi yang tidak ada di pilihan ini dilepas
  const isiKampus = () => { const n = st.kampus.size, k = [...st.kampus][0];
    $("akKIsi").innerHTML = !n ? "<em>Semua kampus dan lembaga</em>" : n === 1 ? `${logoKecil(k)}<em>${esc(k)}</em>` : `<em>${angka(n)} kampus dan lembaga</em>`; };
  function aturKampus(s) { st.kampus = s; lepasProdi(); isiKampus(); saring(); }
  function pilihKampus(k) { aturKampus(new Set(k ? [k] : [])); bukaKampus(false); }

  /* ---------- pemilih provinsi: lewat kampus.json; tanpa data = disembunyikan ---------- */
  function daftarProv() {
    const q = $("akVQ").value.trim().toLowerCase(), n = {};
    semua.forEach(o => { const v = provO(o) || "?"; n[v] = (n[v] || 0) + 1; });
    const isi = Object.entries(n).filter(([v]) => v !== "?" && (!q || provNama(v).toLowerCase().includes(q))).sort((a, b) => b[1] - a[1]);
    const btn = (v, t, c) => `<button type="button" role="option" data-v="${v}" aria-selected="${v ? st.prov.has(v) : !st.prov.size}"><span>${esc(t)}</span>${c != null ? `<small>${angka(c)}</small>` : ""}</button>`;
    $("akVDaftar").innerHTML = (q ? "" : btn("", "Semua provinsi")) + isi.map(([v, c]) => btn(v, provNama(v) || v, c)).join("")
      + (n["?"] && (!q || "lokasi belum diketahui".includes(q)) ? btn("?", "Lokasi belum diketahui", n["?"]) : "") + (!isi.length && q ? "<p>Tidak ada provinsi bernama itu.</p>" : "");
  }
  function bukaProv(buka) {
    $("akVPop").hidden = !buka; $("akVBtn").setAttribute("aria-expanded", String(buka));
    if (buka) { $("akVQ").value = ""; daftarProv(); $("akVQ").focus(); }
  }
  const labelProv = v => v === "?" ? "Lokasi belum diketahui" : v ? provNama(v) || v : "Semua provinsi";
  const isiProv = () => { const s = [...st.prov]; $("akVIsi").innerHTML = `<em>${esc(s.length > 1 ? `${angka(s.length)} provinsi` : labelProv(s[0] || ""))}</em>`; };
  function aturProv(s) {
    st.prov = s; isiProv();
    const kp = new Set([...st.kampus].filter(cocokProvK)); if (kp.size !== st.kampus.size) { st.kampus = kp; isiKampus(); }   // kampus di luar provinsi terpilih dilepas
    lepasProdi(); saring();
  }
  function pilihProv(v) { aturProv(new Set(v ? [v] : [])); bukaProv(false); }

  /* ---------- pemilih program studi: daftar ikut kampus terpilih ---------- */
  function daftarProdi() {
    const q = $("akPQ").value.trim().toLowerCase(), n = {};
    semua.forEach(o => { const p = prodiDari(o); if (p && cocokProv(o) && (!st.kampus.size || st.kampus.has(o[2]))) n[p] = (n[p] || 0) + 1; });
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
    const satuan = judul.startsWith("Sitasi") ? "sitasi" : judul.startsWith("Artikel") ? "artikel" : "karya";
    const g = "g" + Math.random().toString(36).slice(2, 8);
    const lebar = n === 1 ? W : (W - kiri - kanan) / (n - 1);
    return `<figure class="ak-grafik" data-seri="${esc(JSON.stringify(seri.map(([th, v], i) => [th, v, t[i][0], t[i][1]])))}" data-w="${W}" data-h="${H}" style="--gw:${warna}"><figcaption>${judul}</figcaption><div class="ak-gcap"><em>${seri[0][0]} sampai ${seri[n - 1][0]}</em><span>Puncak ${seri[iMaks][0]}: <b>${angka(maks)}</b> ${satuan}</span></div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${judul}">
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
        ${skor != null ? `<div class="ak-skor"><div><b>${angka(skor)}</b><span>Skor SINTA</span></div>${x.skor?.["SINTA Score 3Yr"] != null ? `<div><b>${angka(x.skor["SINTA Score 3Yr"])}</b><span>Skor SINTA 3 tahun</span></div>` : ""}</div>` : ""}`;
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
  const barisKarya = k => `<li><a href="${esc(k.url)}" ${LUAR}><span class="ak-kisi"><b>${esc(rapiJudul(k.judul))}</b>
      <span class="ak-klabel">${k.q ? `<em class="q q${k.q}">${ikon(IKL.kuartil, "#fff")}Q${k.q}</em>` : ""}${k.jenis ? `<em class="j">${ikon(IKL.jenis, "#fff")}${esc(k.jenis)}</em>` : ""}${k.terbitan ? `<em class="t" title="${esc(rapiJurnal(k.terbitan))}">${ikon(IKJ, "currentColor")}<span>${esc(rapiJurnal(k.terbitan))}</span></em>` : ""}${k.urutan ? `<em>${ikon(IKL.orang, "currentColor")}Penulis ke-${k.urutan} dari ${k.jumlah_penulis}</em>` : ""}${k.tahun ? `<em>${ikon(IKL.tahun, "currentColor")}${k.tahun}</em>` : ""}</span></span>
      <span class="ak-kangka"><b>${angka(k.sitasi ?? 0)}</b><small>kutipan</small></span></a></li>`;
  const kst = {hal: 1, urut: "sitasi", jenis: "", cari: ""};
  let karyaTunda = 0;
  /* ORCID publik: tautan muncul, riwayat pendidikan dan pekerjaan sebagai lini masa, biografi apa adanya (berlabel sumbernya) */
  function orcid(x, id) {
    $("akTautan").insertAdjacentHTML("beforeend", `<a href="https://orcid.org/${esc(id)}" ${LUAR}>ORCID${ikon('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', "currentColor")}</a>`);
    /* linimasa: kartu per jenis berikon; tahun sebagai pil di kolom kiri, peran tebal, unit dan institusi di bawahnya; jabatan berjalan bertitik penuh */
    const IKG = {p: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c2 2 10 2 12 0v-5M22 9v6"/>', k: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>'};
    const garis = (l, judul, j) => l.length ? `<div class="ak-garis ak-garis-${j}"><h4><svg viewBox="0 0 24 24" aria-hidden="true">${IKG[j]}</svg>${judul}<small>${l.length}</small></h4><ol>${l.map(r => { const kini = r.mulai && !r.selesai && j === "k";
      return `<li${kini ? ' class="kini"' : ""}><span class="ak-gthn">${r.mulai || "—"}${r.selesai ? `–${r.selesai}` : kini ? "–kini" : ""}</span><div><b>${esc(r.peran || r.unit || r.institusi)}</b><small>${esc([r.peran || r.unit ? r.unit : "", r.institusi].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", "))}</small></div></li>`; }).join("")}</ol></div>` : "";
    const isi = (x.biografi ? `<p class="ak-bio">${esc(x.biografi)}</p>` : "") + `<div class="ak-garis2">${garis(x.pendidikan, "Pendidikan", "p")}${garis(x.pekerjaan, "Pekerjaan dan jabatan", "k")}</div>`;
    if (!x.biografi && !x.pendidikan.length && !x.pekerjaan.length) return;
    const sek = $("akOrcid"); sek.querySelector(".ak-disi").innerHTML = isi; sek.hidden = false;
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

  const dpTombol = id => `<button type="button" class="ak-dptog" data-dp-t="${esc(id)}" aria-pressed="${dp.has(id)}">${ikon(IKON_TANDA, "currentColor")}<span>${dp.has(id) ? "Ada di daftar pendek" : "Tambah ke daftar pendek"}</span></button>`;
  const kontakHtml = o => { const e = emailDari(o); if (!e) return "";
    return `<div class="ak-kontak">${ikon(IKON_MAIL, "currentColor")}${e.list.map(m => `<a href="mailto:${esc(m)}">${esc(m)}</a>`).join("")}<em class="ak-sumber">${e.sumber}</em></div>`; };

  /* ---------- daftar pendek ---------- */
  const dpSimpan = () => { try { localStorage.setItem(DP_KEY, JSON.stringify([...dp])); } catch (e) {} };
  function dpSegarkan() {
    $("akDpN").textContent = angka(dp.size); $("akDpBar").hidden = !dp.size; document.body.classList.toggle("ak-ada-dp", dp.size > 0);
    if (!dp.size) { $("akDpMenu").hidden = true; document.querySelector('[data-dpa="unduh"]').setAttribute("aria-expanded", "false"); }
    document.querySelectorAll("input[data-dp]").forEach(c => { c.checked = dp.has(c.dataset.dp); });
    document.querySelectorAll("[data-dp-t]").forEach(b => { const a = dp.has(b.dataset.dpT); b.setAttribute("aria-pressed", String(a)); b.querySelector("span").textContent = a ? "Ada di daftar pendek" : "Tambah ke daftar pendek"; });
  }
  function dpUbah(id, ada) { if (ada) dp.add(id); else dp.delete(id); dpSimpan(); dpSegarkan(); if ($("akSheet").dataset.mode === "dp" && !$("akSheet").hidden) daftarDp(); }
  function dpTambahBanyak(ors) { ors.forEach(o => dp.add(o[0])); dpSimpan(); dpSegarkan(); pesanDp(`${angka(ors.length)} pakar ditambahkan`); }
  let pesanT = 0;
  function pesanDp(t) { $("akDpPesan").textContent = t; clearTimeout(pesanT); if (t) pesanT = setTimeout(() => { $("akDpPesan").textContent = ""; }, 4000); }

  /* lembar bawah bersama: daftar pendek dan profil kampus. Kepala tampil seketika, isi berat ditunda. */
  function bukaSheet(mode, kepala, isiFn) {
    const sh = $("akSheet"), tk = ++tokenS; sh.dataset.mode = mode;
    $("akSIsi").innerHTML = kepala + '<div class="ak-dtubuh" id="akSTubuh"><div class="ak-hantu"></div></div>';
    sh.hidden = false; document.body.style.overflow = "hidden"; sh.querySelector(".ak-x").focus();
    nanti(() => { if (tk === tokenS && !sh.hidden) $("akSTubuh").innerHTML = isiFn(); });
  }
  function tutupSheet() { $("akSheet").hidden = true; tokenS++; $("akTip").hidden = true; if ($("akLembar").hidden) document.body.style.overflow = ""; }
  const metrikK = a => `<div class="ak-metrik">${a.map(([l, d, n]) => `<div><span class="ak-mlabel">${ikon(d, "currentColor")}${l}</span><b>${angka(n)}</b></div>`).join("")}</div>`;
  const IK_ORANG = '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5.5 2 5.5 5"/>';
  const kecil = o => `<button type="button" class="ak-sbuka" data-buka="${esc(o[0])}">${foto(o)}<span><b>${esc(o[1])}</b><small>${esc(prodiDari(o) || o[2])}</small></span></button>`;
  function daftarDp() {
    const ors = [...dp].map(id => peta.get(id)).filter(Boolean);
    if (!ors.length) { tutupSheet(); return; }
    $("akSJudul").nextElementSibling.querySelector("b").textContent = angka(ors.length);
    $("akSTubuh").innerHTML = `<ol class="ak-sdaftar">${ors.map(o => `<li>${kecil(o)}<button type="button" class="ak-shapus" data-hapus="${esc(o[0])}" aria-label="Hapus ${esc(o[1])} dari daftar pendek"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></li>`).join("")}</ol>`;
  }
  function lihatDp() {
    bukaSheet("dp", `<div class="ak-dkepala"><div class="ak-dk-atas"><div class="ak-nama"><h2 id="akSJudul">Daftar pendek pakar</h2><p><b>${angka(dp.size)}</b> pakar terpilih</p></div></div></div>`, () => { daftarDp(); return $("akSTubuh").innerHTML; });
  }
  const urlHost = w => String(w).replace(/^https?:\/\//i, "").replace(/\/$/, "");
  function profilKampus(k) {
    const info = kampusInfo[k] || {}, ors = semua.filter(o => o[2] === k), karyaN = ors.reduce((a, o) => a + (o[5] || 0), 0), sitasiN = ors.reduce((a, o) => a + (o[6] || 0), 0);
    const web = typeof info.web === "string" && info.web ? (/^https?:\/\//i.test(info.web) ? info.web : "https://" + info.web) : "", em = [].concat(info.email || []).filter(emailOk)[0];
    const pil = [info.kota && `<span class="ak-ptl">${ikon(IKON_PIN, "currentColor")}${esc(info.kota)}</span>`, provNama(info.prov) && `<span class="ak-ptl">${esc(provNama(info.prov))}</span>`,
      web && `<a class="ak-ptl" href="${esc(web)}" ${LUAR}>${ikon(IKON_WEB, "currentColor")}${esc(urlHost(web))}</a>`, em && `<a class="ak-ptl" href="mailto:${esc(em)}">${ikon(IKON_MAIL, "currentColor")}${esc(em)}</a>`].filter(Boolean).join("");
    const kepala = `<div class="ak-dkepala"><div class="ak-dk-atas">${logoKecil(k)}<div class="ak-nama"><h2 id="akSJudul">${esc(k)}</h2>${info.alamat || Number.isFinite(info.lat) ? `<p class="ak-alamat">${ikon(IKON_PIN, "currentColor")}<span>${esc(info.alamat || [info.kota, provNama(info.prov)].filter(Boolean).join(", "))}${Number.isFinite(info.lat) && Number.isFinite(info.lon) ? ` <a href="https://www.google.com/maps/search/?api=1&query=${info.lat},${info.lon}" ${LUAR}>Lihat di peta</a>` : ""}</span></p>` : ""}</div>${metrikK([["Pakar", IK_ORANG, ors.length], ["Karya", METRIK[1][3], karyaN], ["Sitasi", METRIK[2][3], sitasiN]])}</div>${pil ? `<div class="ak-pil">${pil}</div>` : ""}</div>`;
    bukaSheet("kampus", kepala, () => {
      const per = {}, prodi = {}; ors.forEach(o => { o[3].forEach(r => { per[r] = (per[r] || 0) + 1; }); const p = prodiDari(o); if (p) prodi[p] = (prodi[p] || 0) + 1; });
      const baris = Object.entries(per).sort((a, b) => b[1] - a[1]), mx = baris[0]?.[1] || 1;
      const top = ors.slice().sort((a, b) => b[4] - a[4] || b[6] - a[6]).slice(0, 10), pr = Object.entries(prodi).sort((a, b) => b[1] - a[1]).slice(0, 12);
      const bag = (j, isi) => `<section class="ak-dbagian"><div class="ak-disi"><h3>${j}</h3>${isi}</div></section>`;
      return (baris.length ? bag("Pakar per rumpun", `<div class="ak-bars">${baris.map(([r, n]) => { const [l, d, w] = RUMPUN[r] || [r, "", "#6b7280"];
          return `<div class="ak-br" tabindex="0" data-t="${esc(l)}" data-n="${n}" data-p="${Math.round(n / ors.length * 100)}" data-tot="${ors.length}" style="--w0:${w}"><span class="ak-bl">${d ? ikon(d, w) : ""}${esc(l)}</span><span class="ak-bt"><i style="width:${Math.max(8, n / mx * 100)}%"><b>${angka(n)}</b></i></span></div>`; }).join("")}</div>`) : "")
        + bag("Sepuluh pakar dengan h-index tertinggi", `<ol class="ak-sdaftar">${top.map(o => `<li>${kecil(o)}<em class="ak-hp">h-index <b>${angka(o[4])}</b></em></li>`).join("")}</ol>`)
        + (pr.length ? bag("Program studi terkait", `<div class="ak-pil">${pr.map(([p, n]) => `<span class="ak-prodi">${esc(p)}<small>${angka(n)}</small></span>`).join("")}</div>`) : "")
        + `<div class="ak-saksi"><button type="button" class="ak-tbl" data-sa="tambah">Tambah semua pakar teratas ke daftar pendek</button><button type="button" class="ak-tbl alt" data-sa="lihat">Lihat semua pakar kampus ini</button></div>`;
    });
    $("akSheet").dataset.k = k;
  }

  /* ---------- ekspor daftar pendek: pustaka dimuat malas saat klik, versi sama dengan unduh_tabel.js ---------- */
  const NAVY = [5, 28, 44], NAVY_HEX = "051C2C";
  const LIB = {
    xlsx: ["https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", () => window.XLSX],
    docx: ["https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js", () => window.docx],
    pdf: ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", () => window.jspdf],
    tabel: ["https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js", () => window.jspdf?.jsPDF?.API?.autoTable]};
  const janji = {};
  const muat = k => janji[k] ||= new Promise((ok, gagal) => { const [src, ada] = LIB[k]; if (ada()) return ok();
    const sc = document.createElement("script"); sc.src = src; sc.onload = ok; sc.onerror = () => { delete janji[k]; gagal(new Error("Gagal memuat pustaka " + k)); }; document.head.append(sc); });
  const KOL = ["No", "Nama", "Kampus", "Program studi", "Provinsi", "Rumpun", "h-index", "Karya", "Sitasi", "Email", "ORCID", "SINTA"];
  const urlOrcid = v => /^https?:/.test(v) ? v : "https://orcid.org/" + v;
  function dataDp() {
    const wib = new Date(Date.now() + 7 * 36e5), iso = wib.toISOString().slice(0, 10), perlu = $("akDpPerlu").value.trim();
    const baris = [...dp].map(id => peta.get(id)).filter(Boolean).map((o, i) => { const e = emailDari(o);
      return [i + 1, o[1], o[2], prodiDari(o), provNama(provO(o)), o[3].map(r => (RUMPUN[r] || [r])[0]).join(", "), o[4] || 0, o[5] || 0, o[6] || 0,
        e ? e.list.join("; ") + (e.sumber === "Email kampus" ? " (kampus)" : "") : "", o[7] ? urlOrcid(o[7]) : "", o[10] ? "https://sinta.kemdiktisaintek.go.id/authors/profile/" + o[10] : ""]; });
    return {judul: "Daftar Pendek Pakar Kebencanaan", iso, perlu, baris,
      tanggal: wib.toLocaleDateString("id-ID", {timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric"}) + ", " + wib.toISOString().slice(11, 16) + " WIB"};
  }
  async function xlsx(L) { await muat("xlsx"); const X = window.XLSX, wb = X.utils.book_new();
    const ws = X.utils.aoa_to_sheet([[L.judul], [L.tanggal], ...(L.perlu ? [["Keperluan: " + L.perlu]] : []), [], KOL, ...L.baris]);
    ws["!cols"] = [5, 26, 34, 28, 18, 28, 9, 9, 10, 32, 38, 48].map(w => ({wch: w})); X.utils.book_append_sheet(wb, ws, "Daftar pendek");
    return new Blob([X.write(wb, {bookType: "xlsx", type: "array"})], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}); }
  async function docx(L) { await muat("docx"); const D = window.docx, P = (x, o = {}) => new D.Paragraph({spacing: {after: 80}, ...o, children: [new D.TextRun({text: x, ...(o.run || {})})]});
    const KANAN = new Set([0, 6, 7, 8]);
    const sel = (x, i, kepala) => new D.TableCell({shading: kepala ? {type: D.ShadingType.CLEAR, fill: NAVY_HEX, color: "auto"} : undefined, margins: {top: 40, bottom: 40, left: 60, right: 60},
      children: [new D.Paragraph({alignment: KANAN.has(i) ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT, children: [new D.TextRun({text: String(x), bold: kepala, color: kepala ? "FFFFFF" : undefined, size: 14})]})]});
    const anak = [P(L.judul, {run: {bold: true, size: 36, color: NAVY_HEX}}), P(L.tanggal), ...(L.perlu ? [P("Keperluan: " + L.perlu, {run: {bold: true}})] : []),
      new D.Table({width: {size: 100, type: D.WidthType.PERCENTAGE}, rows: [new D.TableRow({tableHeader: true, children: KOL.map((x, i) => sel(x, i, true))}), ...L.baris.map(r => new D.TableRow({cantSplit: true, children: r.map((x, i) => sel(x, i))}))]})];
    return D.Packer.toBlob(new D.Document({sections: [{properties: {page: {size: {orientation: D.PageOrientation.LANDSCAPE}, margin: {top: 720, bottom: 720, left: 720, right: 720}}}, children: anak}]})); }
  async function pdf(L) { await muat("pdf"); await muat("tabel"); const d = new window.jspdf.jsPDF({unit: "pt", format: "a4", orientation: "landscape"});
    d.setFont("helvetica", "bold").setFontSize(18).setTextColor(...NAVY).text(L.judul, 36, 44);
    d.setFont("helvetica", "normal").setFontSize(10).setTextColor(60).text(L.tanggal, 36, 62); let y = 76;
    if (L.perlu) { d.setFont("helvetica", "bold").text("Keperluan: " + L.perlu, 36, y); y += 14; }
    d.autoTable({startY: y + 6, margin: {left: 36, right: 36, bottom: 36}, head: [KOL], body: L.baris, styles: {fontSize: 7, cellPadding: 3, textColor: 30, overflow: "linebreak"},
      headStyles: {fillColor: NAVY, textColor: 255, fontStyle: "bold"}, columnStyles: {0: {halign: "right", cellWidth: 22}, 6: {halign: "right"}, 7: {halign: "right"}, 8: {halign: "right"}}});
    return d.output("blob"); }
  const FORMAT = {xlsx, docx, pdf};
  async function eksporDp(f) {
    if (sibuk || !dp.size) return; sibuk = true; pesanDp("Menyiapkan berkas"); await new Promise(r => setTimeout(r, 0));
    try { const L = dataDp(); try { localStorage.setItem(PERLU_KEY, L.perlu); } catch (e) {}
      const blob = await FORMAT[f](L), u = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = u; a.download = `daftar-pendek-pakar-${L.iso}.${f}`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4e4); pesanDp("Berkas siap"); }
    catch (e) { console.error(e); pesanDp(e.message || "Gagal membuat berkas"); }
    finally { sibuk = false; } }

  function buka(o) {
    const IK = {buka: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'};
    const tautan = [[`https://openalex.org/${o[0]}`, "OpenAlex"], o[10] && [`https://sinta.kemdiktisaintek.go.id/authors/profile/${o[10]}`, "SINTA"],
[`https://scholar.google.com/scholar?q=${encodeURIComponent('"' + o[1] + '"')}`, "Google Scholar"]].filter(Boolean);
    const status = o[13] === "s" ? ["ok", "Terdaftar di SINTA"] : o[13] === "x" ? ["", "Tidak ditemukan di SINTA"] : ["", "Belum dicocokkan dengan SINTA"];
    /* kepala lembar: foto, nama, institusi, label (prodi, SINTA, rumpun) dan metrik semuanya di pita navy */
    $("akDIsi").innerHTML = `<div class="ak-dkepala"><div class="ak-dk-atas">${sosok(o, true)}<div class="ak-nama"><h2 id="akDNama">${esc(o[1])}</h2><p><button type="button" class="ak-kp" data-kp="${esc(o[2])}" title="Profil kampus">${esc(o[2])}</button></p></div>${metrik(o)}</div>
        ${kontakHtml(o)}
        <div class="ak-pil">${o[11] ? `<span class="ak-prodi">${esc(o[11].replace(/\s*\((S\d|D\d|Sp-?\d)\)$/, ""))}</span>` : ""}<span class="ak-tanda ${status[0]}">${status[1]}</span>${o[15] === "diaspora" ? `<span class="ak-tanda diaspora">Diaspora Indonesia</span>` : ""}${o[3].map(r => pilRumpun(r)).join("")}${dpTombol(o[0])}</div></div>
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
        <section class="ak-dbagian" id="akRisetW" hidden><h3>Riset wilayah</h3><div class="ak-wchip"></div></section>
        <section class="ak-dbagian" id="akKolab" hidden><h3>Sering menulis bersama</h3><ol class="ak-sdaftar"></ol></section>
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
    extraPakar(o);
    $("akLembar").querySelector(".ak-dlg").scrollTop = 0;
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

  /* ---------- tampilan lain: data staf dari /api/akademisi/data/<nama>, dimuat saat tampilannya dibuka (404/503 = disembunyikan) ---------- */
  const TAMPIL_KEY = "ak-tampil";
  const DATA = {};
  const ambilData = n => DATA[n] ||= fetch(`/api/akademisi/data/${n}`, {credentials: "same-origin"}).then(r => r.ok ? r.json() : null).catch(() => null).then(x => { if (x == null) delete DATA[n]; return x; });
  const urlOk = u => typeof u === "string" && /^https?:\/\//i.test(u.trim()) ? u.trim() : "";
  const urlDoi = d => d ? urlOk(/^https?:\/\//i.test(d) ? d : "https://doi.org/" + String(d).replace(/^doi:\s*/i, "")) : "";
  const urlOA = id => id ? urlOk(/^https?:\/\//i.test(id) ? id : "https://openalex.org/" + id) : "";
  const tglID = s => { if (!s) return ""; if (/^\d{4}$/.test(String(s))) return String(s); const d = new Date(String(s).slice(0, 10) + "T00:00:00Z");
    return isNaN(d) ? String(s) : d.toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "long", year: "numeric"}); };
  const provT = v => PROV[v] || (v == null ? "" : String(v));
  const kapital = s => s ? s[0].toUpperCase() + s.slice(1) : "";
  const dlist = a => Array.isArray(a) ? a : [];
  const rpRingkas = n => { const f = (v, t) => `Rp ${(Math.round(v * 10) / 10).toLocaleString("id-ID")} ${t}`;
    return n >= 1e12 ? f(n / 1e12, "triliun") : n >= 1e9 ? f(n / 1e9, "miliar") : n >= 1e6 ? f(n / 1e6, "juta") : "Rp " + angka(n); };
  const IK_KAMPUS = '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c2 2 10 2 12 0v-5"/>', IK_SEMUA = '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>';
  const lbl = (c, ik, t) => `<em${c ? ` class="${c}"` : ""} title="${esc(t)}">${ik ? ikon(ik, "currentColor") : ""}<span>${esc(t)}</span></em>`;
  const hantuHtml = '<div class="ak-hantu"></div>';
  const kosongHtml = t => `<div class="ak-panel ak-kosong"><h2>${t}</h2><p>Data ini belum tersedia. Coba lagi nanti.</p></div>`;
  const cariKotak = (id, ph) => `<label class="ak-cari"><span class="sr">${ph}</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="${id}" type="search" autocomplete="off" placeholder="${ph}"></label>`;
  const segHtml = (id, judul, a) => `<div class="ak-seg" id="${id}" role="group" aria-label="${judul}">${a.map(([v, l, ik], i) => `<button type="button" data-v="${esc(v)}" aria-pressed="${i === 0}">${ik ? `<svg class="ak-ikon" viewBox="0 0 24 24" aria-hidden="true">${ik}</svg>` : ""}${l}</button>`).join("")}</div>`;
  const chipsRumpun = rows => `<button type="button" data-r="" aria-pressed="true">${ikon(IK_SEMUA, "currentColor")}Semua rumpun</button>` + rows.map(([r, n]) => { const [l, ic, w] = RUMPUN[r] || [r, "", "#6b7280"];
    return `<button type="button" data-r="${esc(r)}" aria-pressed="false">${ic ? ikon(ic, w) : ""}${esc(l)}<span>${angka(n)}</span></button>`; }).join("");
  const setChip = (id, v) => $(id).querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.r === v)));
  const setSeg = (id, v) => $(id).querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
  const tabelHtml = (kol, baris) => `<div class="ak-tw"><table class="ak-t2"><thead><tr>${kol.map(([l, c]) => `<th class="${c || ""}">${l}</th>`).join("")}</tr></thead><tbody>${baris.map(r => `<tr>${r.map((x, i) => `<td class="${kol[i][1] || ""}">${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  const tautanLuar = (u, t) => u ? `<a href="${esc(u)}" ${LUAR}>${t}</a>` : "";
  const hostLabel = u => esc(urlHost(u));

  /* pemilih bergaya kampus (tombol + popup bercari). opsi() = [[nilai, label, jumlah]]; mengembalikan fungsi penyegar label */
  const opsiBtn = (v, l, c, a) => `<button type="button" role="option" data-v="${esc(v)}" aria-selected="${a}"><span>${esc(l)}</span>${c != null ? `<small>${angka(c)}</small>` : ""}</button>`;
  const htmlPilih = (id, ik, cari) => `<div class="ak-kampus-pilih" id="${id}" data-gen><button type="button" class="ak-kbtn" aria-haspopup="listbox" aria-expanded="false"><svg class="ak-ikon ak-kik" viewBox="0 0 24 24" aria-hidden="true">${ik}</svg><span><em></em></span><svg class="ak-panah" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="ak-kpop" hidden><label class="ak-kcari"><span class="sr">${cari}</span><input type="search" autocomplete="off" placeholder="${cari}"></label><div class="ak-kdaftar" role="listbox" aria-label="${cari}"></div></div></div>`;
  function pasangPilih(id, {opsi, nilai, pilih, semua}) {
    const k = $(id), btn = k.querySelector(".ak-kbtn"), pop = k.querySelector(".ak-kpop"), q = k.querySelector("input"), dft = k.querySelector(".ak-kdaftar");
    const label = () => { const v = nilai(); k.querySelector(".ak-kbtn > span").innerHTML = `<em>${esc(v ? (opsi().find(x => x[0] === v)?.[1] || v) : semua)}</em>`; };
    const isi = () => { const t = q.value.trim().toLowerCase(), cur = nilai(), o = opsi().filter(x => !t || x[1].toLowerCase().includes(t));
      dft.innerHTML = (t ? "" : opsiBtn("", semua, null, !cur)) + (o.length ? o.slice(0, 300).map(x => opsiBtn(x[0], x[1], x[2], x[0] === cur)).join("") : "<p>Tidak ada yang cocok.</p>"); };
    const tutupP = () => { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); };
    btn.addEventListener("click", () => { const b = pop.hidden; document.querySelectorAll(".ak-kampus-pilih[data-gen]").forEach(x => x._tutup?.());
      if (b) { pop.hidden = false; btn.setAttribute("aria-expanded", "true"); q.value = ""; isi(); q.focus(); } });
    q.addEventListener("input", isi);
    dft.addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b) return; tutupP(); pilih(b.dataset.v); label(); });
    k._tutup = tutupP; label(); return label;
  }
  document.addEventListener("click", e => document.querySelectorAll(".ak-kampus-pilih[data-gen]").forEach(x => { if (!x.contains(e.target)) x._tutup?.(); }));
  document.addEventListener("keydown", e => { if (e.key !== "Escape") return; const a = [...document.querySelectorAll(".ak-kampus-pilih[data-gen] .ak-kpop:not([hidden])")];
    if (!a.length) return; e.stopImmediatePropagation(); a.forEach(p => p.parentElement._tutup()); });
  const pasangHal = (id, fn) => $(id).addEventListener("click", e => { const b = e.target.closest("button[data-h]"); if (b && !b.disabled) fn(+b.dataset.h); });
  const gulirKe = id => $(id).scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"});

  /* ----- riset daerah: indeks sekali, saring sesuai permintaan ----- */
  const R = {prov: "", kab: "", rumpun: "", sumber: "", q: "", hal: 1}, RPER = 20;
  let risetArr = null, risetHasil = [], pakarRiset = new Map(), risetProv = {}, risetKab = {}, risetRumpun = {}, risetSegar = null, rtok = 0;
  function indeksRiset(arr) {
    if (risetArr) return;
    risetArr = dlist(arr).filter(x => x && x.judul);
    for (const x of risetArr) {
      const w = new Set();
      for (const a of dlist(x.wilayah)) { if (!a || !a.prov) continue; w.add(String(a.prov)); if (a.kab) w.add(a.prov + "|" + a.kab); }
      x._w = w;
      for (const key of w) { const i = key.indexOf("|"); if (i < 0) risetProv[key] = (risetProv[key] || 0) + 1; else { const p = key.slice(0, i), kb = key.slice(i + 1); (risetKab[p] ||= {})[kb] = (risetKab[p][kb] || 0) + 1; } }
      x._cari = [x.judul, dlist(x.penulis).join(" "), x.jurnal, x.kampus].filter(Boolean).join(" ").toLowerCase();
      for (const r of dlist(x.rumpun)) risetRumpun[r] = (risetRumpun[r] || 0) + 1;
      for (const id of dlist(x.pakar)) { if (!pakarRiset.has(id)) pakarRiset.set(id, []); pakarRiset.get(id).push(x); }
    }
    risetArr.sort((a, b) => (b.sitasi || 0) - (a.sitasi || 0) || (b.tahun || 0) - (a.tahun || 0));
  }
  function saringRiset() {
    const q = R.q.toLowerCase(), key = R.kab ? R.prov + "|" + R.kab : R.prov;
    risetHasil = risetArr.filter(x => (!key || x._w.has(key)) && (!R.rumpun || dlist(x.rumpun).includes(R.rumpun)) && (!R.sumber || (R.sumber === "int") === (x.sumber === "openalex")) && (!q || x._cari.includes(q)));
  }
  function barisRiset(x, i) {
    const pk = dlist(x.pakar).map(id => peta.get(id)).filter(Boolean), nm = new Set(pk.map(o => o[1].toLowerCase()));
    const lain = dlist(x.penulis).filter(n => !nm.has(String(n).toLowerCase())), sisa = lain.length - 3;
    const u = urlOk(x.url) || urlDoi(x.doi) || urlOA(x.id);
    return `<li class="ak-rr" role="button" tabindex="0" data-ri="${i}" aria-label="Buka ringkasan ${esc(rapiJudul(x.judul))}"><div class="ak-kisi"><b class="ak-rj">${esc(rapiJudul(x.judul))}</b>
      <span class="ak-klabel">${x.tahun ? lbl("", IKL.tahun, x.tahun) : ""}${x.jurnal ? lbl("t", IKJ, rapiJurnal(x.jurnal)) : ""}${x.kampus ? lbl("t", IK_KAMPUS, x.kampus) : ""}${x.jenis ? lbl("j", IKL.jenis, kapital(x.jenis)) : ""}${x.oa ? lbl("s", "", "Akses terbuka") : ""}</span>
      ${pk.length || lain.length ? `<span class="ak-rp">${ikon(IKL.orang, "currentColor")}${pk.slice(0, 5).map(o => `<button type="button" class="ak-pk" data-pk="${esc(o[0])}" title="Buka profil pakar">${esc(o[1])}</button>`).join("")}${lain.slice(0, 3).map(n => `<span class="ak-pn">${esc(n)}</span>`).join("")}${sisa > 0 ? `<span class="ak-pn">${angka(sisa)} penulis lain</span>` : ""}</span>` : ""}</div>
      ${x.sitasi != null ? `<span class="ak-kangka"><b>${angka(x.sitasi)}</b><small>kutipan</small></span>` : ""}</li>`;
  }
  function gambarRiset(gulir) {
    const n = risetHasil.length, a = (R.hal - 1) * RPER, wil = R.kab ? `${R.kab}, ${provT(R.prov)}` : R.prov ? provT(R.prov) : "Indonesia";
    $("akRJ").innerHTML = `<b>${angka(n)}</b> riset tentang ${esc(wil)}`;
    $("akRL").innerHTML = n ? `<ol class="ak-rlist">${risetHasil.slice(a, a + RPER).map((x, j) => barisRiset(x, a + j)).join("")}</ol>` : `<p class="ak-khampa">Tidak ada riset yang cocok. Longgarkan saringan.</p>`;
    $("akRH").innerHTML = navHal(R.hal, n, RPER, "riset");
    if (gulir) gulirKe("akRJ");
  }
  function bangunRiset(p) {
    p.innerHTML = `<div class="ak-saring"><div class="ak-alat">${cariKotak("akRQ", "Cari judul, penulis, jurnal, atau kampus")}</div>
      <div class="ak-baris">${htmlPilih("akRP", IKON_PIN, "Cari provinsi")}${htmlPilih("akRK", IKON_PIN, "Cari kabupaten atau kota")}</div>
      ${segHtml("akRS", "Sumber riset", [["", "Semua sumber", IK_SEMUA], ["int", "Jurnal internasional", IKJ], ["lokal", "Repositori kampus", IK_KAMPUS]])}
      <div id="akRR" class="ak-chip" role="group" aria-label="Rumpun bahaya">${chipsRumpun(Object.entries(risetRumpun).sort((a, b) => b[1] - a[1]))}</div></div>
      <div class="ak-hasil" id="akRHasil"><h2 class="ak-judulv" id="akRJ"></h2><div id="akRL"></div><nav id="akRH" class="ak-hal" aria-label="Halaman daftar riset" aria-live="polite"></nav></div>`;
    const jalan = gulir => { const t = ++rtok; nanti(() => { if (t !== rtok) return; saringRiset(); gambarRiset(gulir); }); };
    const kabBox = () => { $("akRK").hidden = !(R.prov && risetKab[R.prov]); };
    const lP = pasangPilih("akRP", {semua: "Semua provinsi", nilai: () => R.prov, opsi: () => Object.entries(risetProv).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, provT(v), c]),
      pilih: v => { R.prov = v; R.kab = ""; R.hal = 1; kabBox(); lK(); jalan(false); }});
    const lK = pasangPilih("akRK", {semua: "Semua kabupaten dan kota", nilai: () => R.kab, opsi: () => Object.entries(risetKab[R.prov] || {}).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, v, c]),
      pilih: v => { R.kab = v; R.hal = 1; jalan(false); }});
    let tt = 0;
    $("akRQ").addEventListener("input", e => { clearTimeout(tt); tt = setTimeout(() => { R.q = e.target.value.trim(); R.hal = 1; jalan(false); }, 250); });
    $("akRS").addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b) return; R.sumber = b.dataset.v; R.hal = 1; setSeg("akRS", R.sumber); jalan(false); });
    $("akRR").addEventListener("click", e => { const b = e.target.closest("button[data-r]"); if (!b) return; R.rumpun = b.dataset.r; R.hal = 1; setChip("akRR", R.rumpun); jalan(false); });
    pasangHal("akRH", h => { R.hal = h; gambarRiset(true); });
    const bukaR = e => { if (e.target.closest("[data-pk],a")) return; const li = e.target.closest("[data-ri]"); if (li) sheetRiset(risetHasil[+li.dataset.ri]); };
    $("akRL").addEventListener("click", bukaR);
    $("akRL").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-ri]")) { e.preventDefault(); bukaR(e); } });
    risetSegar = () => { $("akRQ").value = R.q; lP(); lK(); kabBox(); setChip("akRR", R.rumpun); setSeg("akRS", R.sumber); jalan(false); };
    risetSegar();
  }
  /* lembar riset: kepala seketika; ringkasan, penjelasan, kesimpulan (Workers AI dari abstrak), abstrak asli, topik, sitasi per tahun dimuat dari worker */
  const IK_LUAR = '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', IK_PDF = '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M12 11v6m-3-3 3 3 3-3"/>';
  let risetId = "";
  function sheetRiset(x) {
    if (!x) return;
    const u = urlOk(x.url) || urlDoi(x.doi) || urlOA(x.id), wid = String(x.id || "").match(/W\d{4,12}/)?.[0] || "", tk = risetId = wid || x.judul;
    const pk = dlist(x.pakar).map(id => peta.get(id)).filter(Boolean), nm = new Set(pk.map(o => o[1].toLowerCase())), lain = dlist(x.penulis).filter(n => !nm.has(String(n).toLowerCase()));
    const nPen = Math.max(dlist(x.penulis).length, pk.length), wil = [...new Set(dlist(x.wilayah).map(w => w?.kab || provT(w?.prov)).filter(Boolean))].slice(0, 8);
    const sekilas = [`${kapital(x.jenis || "karya")} ini terbit${x.tahun ? ` tahun ${x.tahun}` : ""}${x.jurnal ? ` di ${rapiJurnal(x.jurnal)}` : ""}, ditulis ${angka(nPen)} penulis${pk.length ? `, ${angka(pk.length)} di antaranya pakar di direktori ini` : ""}.`,
      wil.length ? `Wilayah kajiannya ${wil.join(", ")}.` : "", x.sitasi ? `Sudah dikutip ${angka(x.sitasi)} kali oleh peneliti lain.` : ""].filter(Boolean).join(" ");
    const kepala = `<div class="ak-dkepala ak-rkepala"><div class="ak-pil">${dlist(x.rumpun).map(r => pilRumpun(r)).join("")}${x.oa ? '<span class="ak-tanda ok">Akses terbuka</span>' : ""}</div>
      <div class="ak-nama"><h2 id="akSJudul">${esc(rapiJudul(x.judul))}</h2><p>${esc([x.jurnal && rapiJurnal(x.jurnal), x.tahun].filter(Boolean).join(", "))}</p></div>
      <div class="ak-raksi">${u ? `<a class="ak-rbtn" href="${esc(u)}" ${LUAR}>${ikon(IK_LUAR, "currentColor")}Buka naskah</a>` : ""}<span id="akRPdf"></span></div></div>`;
    bukaSheet("riset", kepala, () => metrikK([["Kutipan", METRIK[2][3], x.sitasi ?? 0], ["Penulis", IK_ORANG, nPen], ["Pakar direktori", IK_ORANG, pk.length]])
      + `<section class="ak-dbagian ak-rai"><div class="ak-disi"><h3>Ringkasan</h3><p class="ak-rata">${esc(sekilas)}</p><div id="akRAi">${wid ? '<div class="ak-hantu"></div>' : ""}</div></div></section>`
      + `<div id="akRLain"></div>`
      + (pk.length || lain.length ? bagS("Penulis", `${pk.length ? `<ol class="ak-sdaftar">${pk.map(o => `<li>${kecil(o)}</li>`).join("")}</ol>` : ""}${lain.length ? `<div class="ak-pil ak-rpn">${lain.slice(0, 20).map(n => `<span class="ak-prodi">${esc(n)}</span>`).join("")}${lain.length > 20 ? `<span class="ak-prodi">${angka(lain.length - 20)} lainnya</span>` : ""}</div>` : ""}`) : ""));
    $("akSheet").dataset.k = "";
    if (!wid) return;
    fetch("/api/akademisi/riset/" + wid, {credentials: "same-origin"}).then(r => r.ok ? r.json() : null).catch(() => null).then(d => nanti(() => {
      if (risetId !== tk || $("akSheet").hidden) return;
      const ai = $("akRAi"), ln = $("akRLain"); if (!ai || !ln) return;
      if (!d) { ai.innerHTML = ""; return; }
      ai.innerHTML = d.ai ? `<p class="ak-rata ak-rbesar">${esc(d.ai.ringkasan)}</p>${d.ai.penjelasan.length ? `<h4>Penjelasan</h4><ul class="ak-rbutir">${d.ai.penjelasan.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
          ${d.ai.kesimpulan ? `<div class="ak-rsimpul"><h4>Kesimpulan</h4><p class="ak-rata">${esc(d.ai.kesimpulan)}</p></div>` : ""}<p class="ak-rcatat">Disusun mesin dari abstrak naskah. Periksa naskah asli sebelum dikutip.</p>`
        : d.abstrak ? "" : `<p class="ak-rcatat">Abstrak naskah ini tidak tersedia di OpenAlex, jadi ringkasan isi belum bisa disusun.</p>`;
      if (d.pdf) $("akRPdf").innerHTML = `<a class="ak-rbtn putih" href="${esc(d.pdf)}" ${LUAR}>${ikon(IK_PDF, "currentColor")}Unduh PDF</a>`;
      ln.innerHTML = (d.tahunan?.length > 1 ? `<section class="ak-dbagian"><div class="ak-disi">${grafik(d.tahunan, "Sitasi per tahun", "#e8590c")}</div></section>` : "")
        + (d.topik?.length || d.kunci?.length ? bagS("Topik dan kata kunci", `<div class="ak-pil">${dlist(d.topik).map(t => `<span class="ak-prodi" title="${esc(t.bidang)}">${esc(t.nama)}</span>`).join("")}${dlist(d.kunci).map(k => `<span class="ak-r">${esc(kapital(k))}</span>`).join("")}</div>`) : "")
        + (d.abstrak ? `<details class="ak-dbagian"><summary><h3>Abstrak asli</h3></summary><div class="ak-disi"><p class="ak-rata">${esc(d.abstrak)}</p></div></details>` : "");
    }));
  }
  function setWilRiset(prov, kab) { Object.assign(R, {prov, kab, rumpun: "", sumber: "", q: "", hal: 1}); if (risetSegar) risetSegar(); }

  /* ----- kejadian besar ----- */
  const K = {jenis: "", hal: 1}, KPER = 18;
  let kejArr = [], kejHasil = [];
  const lokasiKej = k => [...dlist(k.kab), ...dlist(k.prov).map(provT)].filter(Boolean).join(", ");
  const pakarKej = k => dlist(k.riset?.pakar).filter(p => p && peta.has(p.id));
  function gambarKej(gulir) {
    kejHasil = kejArr.filter(k => !K.jenis || k.jenis === K.jenis);
    const n = kejHasil.length, a = (K.hal - 1) * KPER;
    $("akKjJ").innerHTML = `<b>${angka(n)}</b> kejadian besar${K.jenis ? ` ${esc((RUMPUN[K.jenis] || [K.jenis])[0].toLowerCase())}` : ""}${DATA._kejDiperbarui ? `<em class="ak-tanda">Diperbarui ${esc(tglID(DATA._kejDiperbarui))}</em>` : ""}`;
    $("akKjL").innerHTML = kejHasil.slice(a, a + KPER).map((k, j) => { const lok = lokasiKej(k), r = k.riset;
      return `<article class="ak-kjk" role="button" tabindex="0" data-kj="${a + j}" aria-label="Buka ${esc(k.nama)}" style="--w0:${(RUMPUN[k.jenis] || [])[2] || "#6b7280"}">
        <div class="ak-kjatas">${pilRumpun(k.jenis, true)}<span class="ak-kjtgl">${esc(tglID(k.tanggal) || "Tanggal belum tercatat")}</span></div><h3>${esc(k.nama)}</h3>
        ${lok ? `<p class="ak-kjm">${ikon(IKON_PIN, "currentColor")}${esc(lok)}</p>` : ""}
        ${r ? `<div class="ak-kjangka"><div><b>${angka(r.works_total ?? dlist(r.works).length)}</b><span>karya riset</span></div><div><b>${angka(pakarKej(k).length)}</b><span>pakar direktori</span></div></div>` : `<div class="ak-kjangka kosong"><span>Data riset menyusul</span></div>`}</article>`; }).join("");
    $("akKjH").innerHTML = navHal(K.hal, n, KPER, "kejadian");
    if (gulir) gulirKe("akKjJ");
  }
  const bagS = (j, isi) => `<section class="ak-dbagian"><div class="ak-disi"><h3>${j}</h3>${isi}</div></section>`;
  function sheetKej(k) {
    const lok = lokasiKej(k), r = k.riset;
    const kepala = `<div class="ak-dkepala"><div class="ak-dk-atas"><div class="ak-nama"><h2 id="akSJudul">${esc(k.nama)}</h2><p>${esc(tglID(k.tanggal))}${lok ? (k.tanggal ? ", " : "") + esc(lok) : ""}</p></div></div><div class="ak-pil">${pilRumpun(k.jenis)}</div></div>`;
    bukaSheet("kejadian", kepala, () => {
      if (!r) return `<p class="ak-khampa">Data riset menyusul.</p>`;
      const pk = pakarKej(k).slice(0, 10), kr = dlist(r.works).slice().sort((a, b) => (b.sitasi || 0) - (a.sitasi || 0)).slice(0, 10);
      return (pk.length ? bagS("Pakar teratas di direktori", `<ol class="ak-sdaftar">${pk.map(p => `<li>${kecil(peta.get(p.id))}<em class="ak-hp"><b>${angka(p.n)}</b> karya${p.pertama ? `, sejak ${esc(p.pertama)}` : ""}</em></li>`).join("")}</ol>`) : "")
        + (kr.length ? bagS("Karya teratas", `<ol class="ak-karya">${kr.map(w => barisKarya({url: urlDoi(w.doi) || urlOA(w.id), judul: w.judul, tahun: w.tahun, terbitan: w.jurnal, sitasi: w.sitasi})).join("")}</ol>`) : "")
        || `<p class="ak-khampa">Belum ada pakar atau karya yang tercatat.</p>`;
    });
    $("akSheet").dataset.k = "";
  }
  function bangunKej(p, d) {
    DATA._kejDiperbarui = d.diperbarui || "";
    kejArr = dlist(d.kejadian).filter(k => k && k.nama).sort((a, b) => String(b.tanggal || "").localeCompare(String(a.tanggal || "")));
    const n = {}; kejArr.forEach(k => { if (k.jenis) n[k.jenis] = (n[k.jenis] || 0) + 1; });
    p.innerHTML = `<div class="ak-saring"><div id="akKjC" class="ak-chip" role="group" aria-label="Jenis bencana">${chipsRumpun(Object.entries(n).sort((a, b) => b[1] - a[1]))}</div></div>
      <div class="ak-hasil"><h2 class="ak-judulv" id="akKjJ"></h2><div class="ak-kjgrid" id="akKjL"></div><nav id="akKjH" class="ak-hal" aria-label="Halaman kejadian" aria-live="polite"></nav></div>`;
    $("akKjC").addEventListener("click", e => { const b = e.target.closest("button[data-r]"); if (!b) return; K.jenis = b.dataset.r; K.hal = 1; setChip("akKjC", K.jenis); nanti(() => gambarKej(false)); });
    pasangHal("akKjH", h => { K.hal = h; gambarKej(true); });
    const buka1 = e => { const c = e.target.closest("[data-kj]"); if (c && kejHasil[+c.dataset.kj]) sheetKej(kejHasil[+c.dataset.kj]); };
    $("akKjL").addEventListener("click", buka1);
    $("akKjL").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.dataset.kj != null) { e.preventDefault(); buka1(e); } });
    gambarKej(false);
  }

  /* ----- jurnal ----- */
  const J = {q: "", hal: 1}, JPER = 25;
  let jurArr = [], jurHasil = [];
  function gambarJur(gulir) {
    const q = J.q.toLowerCase(); jurHasil = jurArr.filter(j => !q || j._cari.includes(q));
    const n = jurHasil.length, a = (J.hal - 1) * JPER;
    $("akJJ").innerHTML = `<b>${angka(n)}</b> jurnal kebencanaan`;
    $("akJL").innerHTML = n ? `<div class="ak-jgrid">${jurHasil.slice(a, a + JPER).map(j => { const w = urlOk(j.web), issn = dlist(j.issn);
      return `<article class="ak-jk"><div class="ak-jkatas"><span class="ak-jav" aria-hidden="true">${ikon(IKJ, "currentColor")}</span><div class="ak-jnama"><h4>${esc(j.nama)}</h4>${j.penerbit ? `<p>${esc(j.penerbit)}</p>` : ""}</div>${j.doaj ? '<em class="ak-jdoaj" title="Terindeks Directory of Open Access Journals">DOAJ</em>' : ""}</div>
        ${dlist(j.subjek).length ? `<div class="ak-pil">${dlist(j.subjek).slice(0, 3).map(t => `<span class="ak-prodi">${esc(t)}</span>`).join("")}</div>` : ""}
        <div class="ak-jkbawah">${issn.length ? `<span class="ak-issn"><b>ISSN</b>${issn.map(esc).join(", ")}</span>` : "<span></span>"}${w ? `<a class="ak-lnk" href="${esc(w)}" ${LUAR}>${ikon(IKON_WEB, "currentColor")}Kunjungi jurnal</a>` : ""}</div></article>`; }).join("")}</div>` : `<p class="ak-khampa">Tidak ada jurnal yang cocok.</p>`;
    $("akJH").innerHTML = navHal(J.hal, n, JPER, "jurnal");
    if (gulir) gulirKe("akJJ");
  }
  function bangunJur(p, d) {
    jurArr = d.filter(j => j && j.nama).map(j => Object.assign(j, {_cari: [j.nama, j.penerbit, ...dlist(j.issn), ...dlist(j.subjek)].filter(Boolean).join(" ").toLowerCase()}));
    p.innerHTML = `<div class="ak-saring"><div class="ak-alat">${cariKotak("akJQ", "Cari nama jurnal, penerbit, ISSN, atau subjek")}</div></div>
      <div class="ak-hasil"><h2 class="ak-judulv" id="akJJ"></h2><div id="akJL"></div><nav id="akJH" class="ak-hal" aria-label="Halaman daftar jurnal" aria-live="polite"></nav></div>`;
    let tt = 0; $("akJQ").addEventListener("input", e => { clearTimeout(tt); tt = setTimeout(() => { J.q = e.target.value.trim(); J.hal = 1; nanti(() => gambarJur(false)); }, 250); });
    pasangHal("akJH", h => { J.hal = h; gambarJur(true); });
    gambarJur(false);
  }

  /* ----- pusat studi: hanya yang namanya terverifikasi ----- */
  const PS = {prov: ""};
  let psArr = [];
  function gambarPs() {
    const l = psArr.filter(x => !PS.prov || x.prov === PS.prov), grup = {};
    l.forEach(x => { (grup[x.prov || ""] ||= []).push(x); });
    $("akPJ").innerHTML = `<b>${angka(l.length)}</b> pusat studi kebencanaan${PS.prov ? ` di ${esc(provT(PS.prov))}` : ""}`;
    $("akPL").innerHTML = Object.entries(grup).sort((a, b) => (provT(a[0]) || "~").localeCompare(provT(b[0]) || "~", "id")).map(([pv, a]) =>
      `<section class="ak-psgrup"><h3 class="ak-psh">${esc(provT(pv) || "Provinsi belum diketahui")}<small>${angka(a.length)}</small></h3><div class="ak-psgrid">${a.sort((x, y) => x.nama.localeCompare(y.nama, "id")).map(kartuPs).join("")}</div></section>`).join("")
      || `<p class="ak-khampa">Tidak ada pusat studi di provinsi ini.</p>`;
  }
  /* nama induk di data pusat studi yang ditulis lain di data pakar: disamakan supaya logo dan profil kampus ketemu */
  const INDUK_PS = {"IPB University": "Institut Pertanian Bogor", "Bina Nusantara University": "Universitas Bina Nusantara", "UIN Sultan Syarif Kasim Riau": "Universitas Islam Negeri Sultan Syarif Kasim Riau",
    "UIN Sunan Kalijaga Yogyakarta": "Universitas Islam Negeri Sunan Kalijaga", "UIN Walisongo Semarang": "Universitas Islam Negeri Walisongo Semarang", "Universitas Khairun": "Khairun University",
    "Universitas Kristen Satya Wacana": "Satya Wacana Christian University", "Universitas Maritim Raja Ali Haji": "Universitas Maritim Raja Ali Haji (UMRAH)",
    "Universitas Negeri Manado": "Manado State University", "Universitas Pertahanan Republik Indonesia": "Universitas Pertahanan"};
  function kartuPs(x) {
    x = x.induk && INDUK_PS[x.induk] && !perK[x.induk] ? {...x, induk: INDUK_PS[x.induk]} : x;
    const inst = x.kontak_level === "institusi", web = urlOk(x.web), em = emailOk(x.email) ? x.email : "", tel = typeof x.telepon === "string" ? x.telepon.trim() : "";
    const ada = x.induk && (perK[x.induk] || kampusInfo[x.induk]);
    const lk = (ik, lab, href, t) => `<a class="ak-lnk" href="${esc(href)}"${href.startsWith("http") ? " " + LUAR : ""}>${ikon(ik, "currentColor")}<em>${lab}</em>${esc(t)}</a>`;
    return `<article class="ak-psk"><div class="ak-psatas">${x.induk ? logoKecil(x.induk) : ""}<h4>${esc(x.nama)}${x.singkatan ? ` <small>(${esc(x.singkatan)})</small>` : ""}</h4></div>
      <div class="ak-pil">${x.induk ? (ada ? `<button type="button" class="ak-lbl-inst" data-kp="${esc(x.induk)}" title="Profil kampus">${esc(x.induk)}</button>` : `<span class="ak-prodi">${esc(x.induk)}</span>`) : ""}${x.kota ? `<span class="ak-ptl ak-ptl2">${ikon(IKON_PIN, "currentColor")}${esc(x.kota)}</span>` : ""}</div>
      ${dlist(x.fokus).length ? `<div class="ak-pil">${dlist(x.fokus).slice(0, 6).map(f => `<span class="ak-r">${esc(f)}</span>`).join("")}</div>` : ""}
      <div class="ak-pil">${web ? lk(IKON_WEB, "Situs", web, urlHost(web)) : ""}${em ? lk(IKON_MAIL, inst ? "Kontak kampus" : "Email", "mailto:" + em, em) : ""}${tel ? lk('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>', inst ? "Kontak kampus" : "Telepon", "tel:" + tel.replace(/[^\d+]/g, ""), tel) : ""}${urlOk(x.sumber_url) ? lk('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>', "Sumber", x.sumber_url.trim(), "tautan") : ""}</div></article>`;
  }
  function bangunPs(p, d) {
    psArr = d.filter(x => x && x.nama && x.nama_terverifikasi === true);
    if (!psArr.length) throw new Error("kosong");
    const n = {}; psArr.forEach(x => { n[x.prov || ""] = (n[x.prov || ""] || 0) + 1; });
    p.innerHTML = `<div class="ak-saring"><div class="ak-baris">${htmlPilih("akPP", IKON_PIN, "Cari provinsi")}</div></div>
      <div class="ak-hasil"><h2 class="ak-judulv" id="akPJ"></h2><div id="akPL"></div></div>`;
    pasangPilih("akPP", {semua: "Semua provinsi", nilai: () => PS.prov, opsi: () => Object.entries(n).filter(([v]) => v).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, provT(v), c]), pilih: v => { PS.prov = v; nanti(gambarPs); }});
    $("akPL").addEventListener("click", e => { const kp = e.target.closest("[data-kp]"); if (kp) profilKampus(kp.dataset.kp); });
    gambarPs();
  }

  /* ----- pengadaan kajian: pagu rencana (SIRUP), bukan nilai kontrak ----- */
  const A = {prov: "", tahun: "", jenis: "", hal: 1}, APER = 25;
  let pengArr = [], pengHasil = [];
  function gambarPeng(gulir) {
    pengHasil = pengArr.filter(x => (!A.prov || x.prov === A.prov) && (!A.tahun || String(x.tahun) === A.tahun) && (!A.jenis || x.jenis === A.jenis));
    const n = pengHasil.length, a = (A.hal - 1) * APER, total = pengHasil.reduce((s, x) => s + (Number(x.nilai_rp) || 0), 0);
    const wil = [A.tahun && "tahun " + A.tahun, A.prov ? "di " + provT(A.prov) : !A.tahun ? "di seluruh Indonesia" : ""].filter(Boolean).join(" ");
    $("akGJ").innerHTML = `<b>${esc(rpRingkas(total))}</b> pagu kajian bencana ${esc(wil)}<em class="ak-tanda">Rencana pengadaan (SIRUP), bukan nilai kontrak</em>`;
    $("akGL").innerHTML = n ? tabelHtml([["Tahun", "c"], ["Instansi"], ["Judul"], ["Provinsi"], ["Pagu", "r"], ["Metode"]], pengHasil.slice(a, a + APER).map(x => { const u = urlOk(x.url);
      return [esc(x.tahun ?? ""), esc(x.instansi || ""), u ? tautanLuar(u, esc(x.judul)) : esc(x.judul), esc([x.kab, provT(x.prov)].filter(Boolean).join(", ")), x.nilai_rp != null ? "Rp " + angka(x.nilai_rp) : "Tidak tercatat", esc(x.metode || "")]; })) : `<p class="ak-khampa">Tidak ada pengadaan yang cocok.</p>`;
    $("akGH").innerHTML = navHal(A.hal, n, APER, "pengadaan");
    if (gulir) gulirKe("akGJ");
  }
  function bangunPeng(p, d) {
    pengArr = d.filter(x => x && x.judul).sort((a, b) => (b.tahun || 0) - (a.tahun || 0) || (b.nilai_rp || 0) - (a.nilai_rp || 0));
    const hit = f => { const n = {}; pengArr.forEach(x => { const v = f(x); if (v != null && v !== "") n[v] = (n[v] || 0) + 1; }); return n; };
    const nP = hit(x => x.prov), nT = hit(x => x.tahun), nJ = hit(x => x.jenis);
    p.innerHTML = `<div class="ak-saring"><div class="ak-baris ak-baris3">${htmlPilih("akGP", IKON_PIN, "Cari provinsi")}${htmlPilih("akGT", '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', "Cari tahun")}${htmlPilih("akGE", IKL.jenis, "Cari jenis")}</div></div>
      <div class="ak-hasil"><h2 class="ak-judulv" id="akGJ"></h2><div id="akGL"></div><nav id="akGH" class="ak-hal" aria-label="Halaman daftar pengadaan" aria-live="polite"></nav></div>`;
    const ubah = (k, v) => { A[k] = v; A.hal = 1; nanti(() => gambarPeng(false)); };
    pasangPilih("akGP", {semua: "Semua provinsi", nilai: () => A.prov, opsi: () => Object.entries(nP).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, provT(v), c]), pilih: v => ubah("prov", v)});
    pasangPilih("akGT", {semua: "Semua tahun", nilai: () => A.tahun, opsi: () => Object.entries(nT).sort((a, b) => b[0] - a[0]).map(([v, c]) => [v, v, c]), pilih: v => ubah("tahun", v)});
    pasangPilih("akGE", {semua: "Semua jenis", nilai: () => A.jenis, opsi: () => Object.entries(nJ).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, kapital(v), c]), pilih: v => ubah("jenis", v)});
    pasangHal("akGH", h => { A.hal = h; gambarPeng(true); });
    gambarPeng(false);
  }

  /* ----- pengalih tampilan ----- */
  const VIEW = {
    pakar: ["Pakar", IK_ORANG], riset: ["Riset daerah", IKON_PIN], kejadian: ["Kejadian besar", '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>'], jurnal: ["Jurnal", IKJ],
    pusat: ["Pusat studi", '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M8 10h.01M16 10h.01"/>'], pengadaan: ["Pengadaan kajian", '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>']};
  const MUAT = {riset: ["riset", (p, d) => { indeksRiset(d); bangunRiset(p); }, d => Array.isArray(d) && d.length], kejadian: ["kejadian", bangunKej, d => Array.isArray(d?.kejadian) && d.kejadian.length],
    jurnal: ["jurnal", bangunJur, d => Array.isArray(d) && d.length], pusat: ["pusat_studi", bangunPs, d => Array.isArray(d) && d.length], pengadaan: ["pengadaan", bangunPeng, d => Array.isArray(d) && d.length]};
  const sudah = {};
  const bacaTampil = () => { try { return localStorage.getItem(TAMPIL_KEY); } catch (e) { return null; } };
  function bukaView(v) {
    const [nama, bangun, sah] = MUAT[v], p = $("akv-" + v);
    if (sudah[v]) return;
    sudah[v] = true; p.innerHTML = hantuHtml;
    const gagal = () => { delete sudah[v]; p.innerHTML = kosongHtml(esc(VIEW[v][0])); const t = $("akTampil").querySelector(`[data-t="${v}"]`); if (t) t.hidden = true; };
    ambilData(nama).then(d => { if (!sah(d)) { gagal(); return; } nanti(() => { try { p.innerHTML = ""; bangun(p, d); } catch (e) { console.error(e); gagal(); } }); });
  }
  function pasangTampil(v) {
    $("akTampil").innerHTML = Object.entries(VIEW).map(([k, [l, ik]]) => `<button type="button" data-t="${k}" aria-pressed="false">${ikon(ik, "currentColor")}${l}</button>`).join("");
    $("akTampil").hidden = false;
    $("akTampil").addEventListener("click", e => { const b = e.target.closest("button[data-t]"); if (b) tampil(b.dataset.t); });
    tampil(VIEW[v] ? v : "pakar");
  }
  function tampil(v) {
    $("akTampil").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.t === v)));
    $("akIsi").hidden = v !== "pakar";
    Object.keys(MUAT).forEach(k => { $("akv-" + k).hidden = k !== v; });
    try { const u = new URL(location.href); if (v === "pakar") u.searchParams.delete("tampil"); else u.searchParams.set("tampil", v); history.replaceState(null, "", u); localStorage.setItem(TAMPIL_KEY, v); } catch (e) {}
    if (v !== "pakar") nanti(() => bukaView(v));
  }

  /* ----- baru bulan ini: pil di kartu dan saringan ----- */
  async function muatBaru() {
    const d = await ambilData("baru"), ids = dlist(d?.baru).filter(id => peta.has(id));
    if (!ids.length) return;
    baruSet = new Set(ids); $("akBaruN").textContent = angka(ids.length); $("akBaruTog").hidden = false; gambar(false);
  }

  /* ----- bagian tambahan di dialog pakar: riset wilayah dan penulis bersama ----- */
  function extraPakar(o) {
    const id = o[0];
    ambilData("riset").then(d => { if (!Array.isArray(d) || karyaId !== id) return; nanti(() => {
      indeksRiset(d); const a = pakarRiset.get(id) || [], sek = $("akRisetW"); if (!a.length || karyaId !== id || !sek) return;
      const n = {}; for (const x of a) for (const key of new Set(dlist(x.wilayah).filter(w => w && w.prov).map(w => w.kab ? w.prov + "|" + w.kab : String(w.prov)))) n[key] = (n[key] || 0) + 1;
      const top = Object.entries(n).sort((x, y) => y[1] - x[1]).slice(0, 10);
      if (!top.length) return;
      sek.querySelector(".ak-wchip").innerHTML = top.map(([key, c]) => { const i = key.indexOf("|"), lab = i < 0 ? provT(key) : `${key.slice(i + 1)}, ${provT(key.slice(0, i))}`;
        return `<button type="button" class="ak-wc" data-rw="${esc(key)}" title="Lihat riset wilayah ini">${ikon(IKON_PIN, "currentColor")}${esc(lab)}<small>${angka(c)}</small></button>`; }).join("");
      sek.hidden = false; }); });
    ambilData("kolaborasi").then(d => { if (!d || typeof d !== "object" || !Object.hasOwn(d, id) || karyaId !== id) return;
      const l = dlist(d[id]).filter(x => x && peta.has(x.id)).sort((x, y) => (y.n || 0) - (x.n || 0)).slice(0, 8), sek = $("akKolab"); if (!l.length || !sek) return;
      sek.querySelector("ol").innerHTML = l.map(x => { const p = peta.get(x.id), ct = dlist(x.contoh)[0]?.judul;
        return `<li><button type="button" class="ak-sbuka" data-pk="${esc(p[0])}"${ct ? ` title="${esc(ct)}"` : ""}>${foto(p)}<span><b>${esc(p[1])}</b><small>${esc(p[2])}</small></span></button><em class="ak-hp"><b>${angka(x.n)}</b> karya bersama</em></li>`; }).join("");
      sek.hidden = false; });
  }
  document.addEventListener("click", e => {
    const pk = e.target.closest("[data-pk]"); if (pk) { const o = peta.get(pk.dataset.pk); if (o) buka(o); return; }
    const rw = e.target.closest("[data-rw]"); if (rw) { const [p, k] = rw.dataset.rw.split("|"); tutup(); setWilRiset(p, k || ""); tampil("riset"); }
  });
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
    /* kampus.json dan kontak.json bisa belum ada (404/503): fitur provinsi dan email diam-diam hilang */
    const ambil = async u => { try { const x = await fetch(u, {credentials: "same-origin"}); return x.ok ? await x.json() : null; } catch (e) { return null; } };
    const [kj, kt] = await Promise.all([ambil("/api/akademisi/kampus"), ambil("/api/akademisi/kontak")]);
    kampusInfo = kj && typeof kj === "object" && !Array.isArray(kj) ? kj : {}; kontak = kt && typeof kt === "object" && !Array.isArray(kt) ? kt : {};
    peta = new Map(semua.map(o => [o[0], o]));
    try { dp = new Set((JSON.parse(localStorage.getItem(DP_KEY)) || []).filter(id => peta.has(id))); $("akDpPerlu").value = localStorage.getItem(PERLU_KEY) || ""; } catch (e) { dp = new Set(); }
    if (Object.values(kampusInfo).some(v => v?.prov)) $("akVBox").hidden = false;
    /* tautan dalam: ?prov=32&rumpun=gempa saring daftar, ?pakar=<id OpenAlex> membuka dialog pakar (id tak dikenal diabaikan) */
    const qs = new URLSearchParams(location.search), pv = qs.get("prov"), rp = qs.get("rumpun"), pk = qs.get("pakar");
    if (pv && !$("akVBox").hidden) { st.prov = new Set(pv.split(",").filter(v => PROV[v] || v === "?")); isiProv(); }   // ?prov=32,33 boleh banyak
    if (rp) st.rumpun = new Set(rp.split(",").filter(r => d.rumpun.includes(r) || RUMPUN[r]));
    if ((st.prov.size || st.rumpun.size) && !qs.get("sumber")) { st.sumber = ""; $("akS").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.v === ""))); }
    $("akIsi").hidden = false;
    $("akQ").addEventListener("input", () => { clearTimeout(tunda); tunda = setTimeout(() => { st.q = $("akQ").value.trim(); saring(); }, 200); });
    segmen("akS", "sumber", v => v);
    segmen("akU", "urut", v => +v);
    $("akRumpun").addEventListener("click", e => { const b = e.target.closest("button[data-r]"); if (!b) return; st.rumpun = balik(st.rumpun, b.dataset.r); chromeSaring(); nanti(saring); });
    $("akHal").addEventListener("click", e => { const b = e.target.closest("button[data-h]"); if (!b || b.disabled) return; st.hal = +b.dataset.h; b.setAttribute("aria-current", "page"); nanti(() => gambar(true)); });
    $("akKBtn").addEventListener("click", () => bukaKampus($("akKPop").hidden));
    $("akKQ").addEventListener("input", daftarKampus);
    $("akKJenis").addEventListener("click", e => { const b = e.target.closest("button[data-j]"); if (!b) return; st.kJenis = b.dataset.j; daftarKampus(); $("akKQ").focus(); });
    $("akKDaftar").addEventListener("click", e => { const b = e.target.closest("button[data-k]"); if (!b) return; const s = balik(st.kampus, b.dataset.k); tandai($("akKDaftar"), "k", s); st.kampus = s; isiKampus(); nanti(() => aturKampus(s)); });
    $("akVBtn").addEventListener("click", () => bukaProv($("akVPop").hidden));
    $("akVQ").addEventListener("input", daftarProv);
    $("akVDaftar").addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b) return; const s = balik(st.prov, b.dataset.v); tandai($("akVDaftar"), "v", s); st.prov = s; isiProv(); nanti(() => aturProv(s)); });
    $("akPBtn").addEventListener("click", () => bukaProdi($("akPPop").hidden));
    $("akPQ").addEventListener("input", daftarProdi);
    $("akPDaftar").addEventListener("click", e => { const b = e.target.closest("button[data-p]"); if (b) { st.prodi = b.dataset.p; bukaProdi(false); chromeSaring(); nanti(saring); } });
    document.addEventListener("click", e => {
      const w = e.target.closest(".ak-kampus-pilih");
      if (!$("akKPop").hidden && w !== $("akKPop").parentElement) bukaKampus(false);
      if (!$("akPPop").hidden && w !== $("akPPop").parentElement) bukaProdi(false);
      if (!$("akVPop").hidden && w !== $("akVPop").parentElement) bukaProv(false);
      if (!$("akDpMenu").hidden && !e.target.closest("#akDpMenu,[data-dpa=unduh]")) { $("akDpMenu").hidden = true; document.querySelector("[data-dpa=unduh]").setAttribute("aria-expanded", "false"); }
    });
    /* label di kartu menyaring; klik di bagian lain kartu membuka profil */
    $("akDaftar").addEventListener("click", e => {
      if (e.target.closest(".ak-pilih")) { if (e.target.tagName === "INPUT") dpUbah(e.target.dataset.dp, e.target.checked); return; }
      const kp = e.target.closest("[data-kp]"); if (kp) { profilKampus(kp.dataset.kp); return; }
      const f = e.target.closest("[data-fk]");
      if (f) { const v = f.dataset.v;
        st[f.dataset.fk] = st[f.dataset.fk] instanceof Set ? new Set([v]) : v; chromeSaring(); isiKampus(); isiProv();
        nanti(() => { saring(); document.querySelector(".ak-saring").scrollIntoView({block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"}); }); return; }
      const b = e.target.closest(".ak-orang"); if (b) buka(hasil[+b.dataset.i]);
    });
    $("akDaftar").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("ak-orang")) { e.preventDefault(); buka(hasil[+e.target.dataset.i]); } });
    $("akLembar").addEventListener("click", e => { if (e.target.closest("[data-tutup]")) { tutup(); return; }
      const t = e.target.closest("[data-dp-t]"); if (t) { dpUbah(t.dataset.dpT, !dp.has(t.dataset.dpT)); return; }
      const kp = e.target.closest("[data-kp]"); if (kp) profilKampus(kp.dataset.kp); });
    /* bilah daftar pendek */
    $("akDpBar").addEventListener("click", e => {
      const a = e.target.closest("[data-dpa]"), f = e.target.closest("[data-dpf]");
      if (f) { $("akDpMenu").hidden = true; document.querySelector("[data-dpa=unduh]").setAttribute("aria-expanded", "false"); nanti(() => eksporDp(f.dataset.dpf)); return; }
      if (!a) return;
      if (a.dataset.dpa === "lihat") lihatDp();
      else if (a.dataset.dpa === "kosong") { dp.clear(); dpSimpan(); dpSegarkan(); }
      else { const buka = $("akDpMenu").hidden; $("akDpMenu").hidden = !buka; a.setAttribute("aria-expanded", String(buka)); if (buka) $("akDpPerlu").focus(); } });
    /* lembar bawah */
    $("akSheet").addEventListener("click", e => {
      if (e.target.closest("[data-tutup-s]")) { tutupSheet(); return; }
      const h = e.target.closest("[data-hapus]"); if (h) { dpUbah(h.dataset.hapus, false); return; }
      const b = e.target.closest("[data-buka]"); if (b) { const o = peta.get(b.dataset.buka); tutupSheet(); if (o) buka(o); return; }
      const sa = e.target.closest("[data-sa]"); if (!sa) return;
      const k = $("akSheet").dataset.k;
      if (sa.dataset.sa === "tambah") dpTambahBanyak(semua.filter(o => o[2] === k).sort((x, y) => y[4] - x[4] || y[6] - x[6]).slice(0, 10));
      else { st.kJenis = jenisK(k); if (st.prov.size && !cocokProvK(k)) pilihProv(""); pilihKampus(k); tutupSheet(); document.querySelector(".ak-hasil").scrollIntoView({block: "start"}); } });
    /* tooltip batang rumpun: berlaku untuk pointer dan fokus papan ketik */
    const tipBar = (e, br) => { const tip = $("akTip"); if (!br) { tip.hidden = true; return; }
      tip.innerHTML = `<b>${esc(br.dataset.t)}</b><span><i style="background:${br.style.getPropertyValue("--w0")}"></i>${angka(br.dataset.n)} pakar</span><small>${esc(br.dataset.p)}% dari ${angka(br.dataset.tot)} pakar kampus</small>`;
      tip.hidden = false; const r = br.getBoundingClientRect(), x = e.clientX ?? r.left + 40, y = e.clientY ?? r.top;
      tip.style.left = Math.min(Math.max(8, x + 12), innerWidth - tip.offsetWidth - 8) + "px"; tip.style.top = Math.max(8, y - tip.offsetHeight - 12) + "px"; };
    $("akSheet").addEventListener("pointermove", e => tipBar(e, e.target.closest(".ak-br")));
    $("akSheet").addEventListener("pointerleave", () => { $("akTip").hidden = true; });
    $("akSheet").addEventListener("focusin", e => { const b = e.target.closest(".ak-br"); if (b) tipBar({}, b); });
    $("akSheet").addEventListener("focusout", () => { $("akTip").hidden = true; });
    $("akLembar").addEventListener("pointermove", sorotGrafik); $("akSheet").addEventListener("pointermove", sorotGrafik);
    $("akLembar").addEventListener("pointerleave", () => document.querySelectorAll(".ak-grafik.aktif").forEach(f => { f.classList.remove("aktif"); f.querySelector(".ak-gr-tip").hidden = true; }));
    $("akLembar").addEventListener("pointerout", e => { const f = e.target.closest?.(".ak-grafik"); if (f && !f.contains(e.relatedTarget)) { f.classList.remove("aktif"); f.querySelector(".ak-gr-tip").hidden = true; } });
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if (!$("akSheet").hidden) tutupSheet(); else if (!$("akDpMenu").hidden) { $("akDpMenu").hidden = true; document.querySelector("[data-dpa=unduh]").setAttribute("aria-expanded", "false"); } else if (!$("akLembar").hidden) tutup(); else if (!$("akVPop").hidden) { bukaProv(false); $("akVBtn").focus(); } else if (!$("akKPop").hidden) { bukaKampus(false); $("akKBtn").focus(); } else if (!$("akPPop").hidden) { bukaProdi(false); $("akPBtn").focus(); }
    });
    $("akReset").addEventListener("click", () => {
      Object.assign(st, {q: "", rumpun: new Set(), sumber: "", prodi: "", baru: false, prov: new Set()}); $("akBaruTog").setAttribute("aria-pressed", "false"); $("akQ").value = ""; isiProv();
      $("akS").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.v === "")));
      pilihKampus("");
    });
    saring(); dpSegarkan();
    $("akBaruTog").addEventListener("click", () => { st.baru = !st.baru; $("akBaruTog").setAttribute("aria-pressed", String(st.baru)); nanti(saring); });
    nanti(muatBaru);
    pasangTampil((qs.get("tampil") || (!pk && !pv && !rp && bacaTampil()) || "pakar"));
    const o = pk && peta.get(pk); if (o) nanti(() => buka(o));
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
