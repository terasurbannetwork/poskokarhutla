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
  let AF = null;
  const afOk = id => dlist(AF?.[id]).filter(a => a && a.nama_lembaga);
  function muatAfiliasi() { ambilData("afiliasi").then(d => { if (!d || typeof d !== "object" || Array.isArray(d)) return; AF = d; semua.forEach(o => { const a = afOk(o[0]); if (a.length) o._cari += " " + a.map(x => x.nama_lembaga).join(" ").toLowerCase(); }); gambar(false); }); }
  const afPil = o => { const a = afOk(o[0]); return a.slice(0, 2).map(x => x.lembaga_id ? `<button type="button" class="ak-lbl-inst" data-lb="${esc(x.lembaga_id)}" title="Profil ${esc(x.nama_lembaga)}">${esc(x.nama_lembaga)}</button>` : `<button type="button" class="ak-lbl-inst" data-fq="${esc(x.nama_lembaga)}" title="Saring pakar berafiliasi ${esc(x.nama_lembaga)}">${esc(x.nama_lembaga)}</button>`).join("") + (a.length > 2 ? `<span class="ak-r">+${a.length - 2}</span>` : ""); };
  const kartu = (o, i) => { const prodi = prodiDari(o);
    return `<div class="ak-orang" role="button" tabindex="0" data-i="${i}" aria-label="Buka profil ${esc(o[1])}">
      <label class="ak-pilih" title="Tambah ke daftar pendek"><input type="checkbox" data-dp="${esc(o[0])}" aria-label="Tambah ${esc(o[1])} ke daftar pendek"${dp.has(o[0]) ? " checked" : ""}><span class="ak-cek"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg></span></label>
      <span class="ak-atas">${sosok(o)}<span class="ak-nama"><h3>${esc(o[1])}</h3>${o[13] === "s" || o[15] === "diaspora" || baruSet.has(o[0]) ? `<span class="ak-lencana">${baruSet.has(o[0]) ? `<em class="ak-l-baru">Baru</em>` : ""}${o[13] === "s" ? `<em class="ak-l-sinta">SINTA</em>` : ""}${o[15] === "diaspora" ? `<em class="ak-l-diaspora">Diaspora</em>` : ""}</span>` : ""}</span></span>
      <span class="ak-kartu-label">
        <button type="button" class="ak-lbl-inst" data-kp="${esc(o[2])}" title="Profil kampus ${esc(o[2])}">${esc(o[2])}</button>${afPil(o)}
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
  const kontakHtml = o => { const e = emailDari(o), ms = typeof medsosPasang === "function" ? medsosPasang(kontak[o[0]] || {}) : ""; if (!e && !ms) return "";
    return (e ? `<div class="ak-kontak">${ikon(IKON_MAIL, "currentColor")}${e.list.map(m => `<a href="mailto:${esc(m)}">${esc(m)}</a>`).join("")}<em class="ak-sumber">${e.sumber}</em></div>` : "") + (ms ? `<div class="ak-lkontak ak-lk-putih">${ms}</div>` : ""); };

  /* ---------- daftar pendek ---------- */
  const dpSimpan = () => { try { localStorage.setItem(DP_KEY, JSON.stringify([...dp])); } catch (e) {} };
  const modeL = () => tampilSkrg === "lembaga", setDp = () => modeL() ? dpl : dp;
  function dpSegarkan() {
    const n = setDp().size; $("akDpN").textContent = angka(n); $("akDpNoun").textContent = modeL() ? "lembaga" : "pakar"; $("akDpBar").hidden = !n; document.body.classList.toggle("ak-ada-dp", n > 0);
    if (!n) { $("akDpMenu").hidden = true; document.querySelector('[data-dpa="unduh"]').setAttribute("aria-expanded", "false"); }
    document.querySelectorAll("input[data-dp]").forEach(c => { c.checked = dp.has(c.dataset.dp); });
    document.querySelectorAll("input[data-dpl]").forEach(c => { c.checked = dpl.has(c.dataset.dpl); });
    document.querySelectorAll("[data-dpl-t]").forEach(b => { const a = dpl.has(b.dataset.dplT); b.setAttribute("aria-pressed", String(a)); b.querySelector("span").textContent = a ? "Ada di daftar pendek" : "Tambah ke daftar pendek"; });
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
        + '<div id="akSJur"></div>'
        + `<div class="ak-saksi"><button type="button" class="ak-tbl" data-sa="tambah">Tambah semua pakar teratas ke daftar pendek</button><button type="button" class="ak-tbl alt" data-sa="lihat">Lihat semua pakar kampus ini</button></div>`;
    });
    $("akSheet").dataset.k = k;
    const tk = tokenS;
    ambilData("jurnal").then(d => { const js = Array.isArray(d) ? jurnalKampus(d).get(k) || [] : [];
      if (!js.length) return;
      const isi = (coba = 0) => { if (tk !== tokenS) return; const el = $("akSJur"); if (!el) { if (coba < 20) nanti(() => isi(coba + 1)); return; }
        el.outerHTML = `<section class="ak-dbagian"><div class="ak-disi"><h3>Jurnal kebencanaan terbitan ${esc(k)}<small> ${angka(js.length)}</small></h3><div class="ak-jgrid">${js.map(kartuJur).join("")}</div></div></section>`; };
      nanti(() => isi()); });
  }

  /* jurnal -> kampus/lembaga penerbit: domain situs jurnal (subdomain kampus), lalu nama kampus terpanjang di teks penerbit, lalu alias penerbit berbahasa Inggris.
     Jurnal penerbit swasta, asosiasi, dan lembaga di luar data kampus belum punya rumah; tampil lagi saat direktori lembaga dibangun (docs/bnpb/lembaga). */
  const ALIAS_PENERBIT = [[/Indonesia Defense University/i, "Universitas Pertahanan"], [/National Research and Innovation Agency/i, "Badan Riset dan Inovasi Nasional"],
    [/Institut Teknologi Nasional, Bandung/i, "Institut Teknologi Nasional Bandung"], [/Diponegoro University/i, "Universitas Diponegoro"],
    [/Marine Geological Institute/i, "Balai Besar Survei dan Pemetaan Geologi Kelautan"], [/Sumber Daya Manusia Geologi/i, "Badan Geologi"]];
  const hostDari = u => { try { return new URL(/^https?:\/\//i.test(u) ? u : "https://" + u).hostname.toLowerCase().replace(/^www\./, ""); } catch (e) { return ""; } };
  let jurIdx = null;
  function jurnalKampus(d) {
    if (jurIdx?.d === d) return jurIdx.m;
    const dom = Object.entries(kampusInfo).map(([n, v]) => [hostDari(typeof v?.web === "string" ? v.web : ""), n]).filter(([h]) => h).sort((a, b) => b[0].length - a[0].length);
    const nama = Object.keys(kampusInfo).sort((a, b) => b.length - a.length), m = new Map();
    for (const j of d) { if (!j || !j.nama) continue;
      const h = hostDari(urlOk(j.web)), pen = String(j.penerbit || ""), pl = pen.toLowerCase();
      const k = (h && dom.find(([x]) => h === x || h.endsWith("." + x))?.[1]) || nama.find(n => n.length > 5 && pl.includes(n.toLowerCase())) || ALIAS_PENERBIT.find(([r]) => r.test(pen))?.[1];
      if (k) { if (!m.has(k)) m.set(k, []); m.get(k).push(j); } }
    jurIdx = {d, m}; return m;
  }
  const kartuJur = j => { const w = urlOk(j.web), issn = dlist(j.issn);
    return `<article class="ak-jk"><div class="ak-jkatas"><span class="ak-jav" aria-hidden="true">${ikon(IKJ, "currentColor")}</span><div class="ak-jnama"><h4>${esc(j.nama)}</h4>${j.penerbit ? `<p>${esc(j.penerbit)}</p>` : ""}</div>${j.doaj ? '<em class="ak-jdoaj" title="Terindeks Directory of Open Access Journals">DOAJ</em>' : ""}</div>
      ${dlist(j.subjek).length ? `<div class="ak-pil">${dlist(j.subjek).slice(0, 3).map(t => `<span class="ak-prodi">${esc(t)}</span>`).join("")}</div>` : ""}
      <div class="ak-jkbawah">${issn.length ? `<span class="ak-issn"><b>ISSN</b>${issn.map(esc).join(", ")}</span>` : "<span></span>"}${w ? `<a class="ak-lnk" href="${esc(w)}" ${LUAR}>${ikon(IKON_WEB, "currentColor")}Kunjungi jurnal</a>` : ""}</div></article>`; };

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
    return {judul: "Daftar Pendek Pakar Kebencanaan", iso, perlu, baris, berkas: "daftar-pendek-pakar", kol: KOL, lebar: [5, 26, 34, 28, 18, 28, 9, 9, 10, 32, 38, 48], kanan: [0, 6, 7, 8],
      tanggal: wib.toLocaleDateString("id-ID", {timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric"}) + ", " + wib.toISOString().slice(11, 16) + " WIB"};
  }
  async function xlsx(L) { await muat("xlsx"); const X = window.XLSX, wb = X.utils.book_new();
    const ws = X.utils.aoa_to_sheet([[L.judul], [L.tanggal], ...(L.perlu ? [["Keperluan: " + L.perlu]] : []), [], L.kol, ...L.baris]);
    ws["!cols"] = L.lebar.map(w => ({wch: w})); X.utils.book_append_sheet(wb, ws, "Daftar pendek");
    return new Blob([X.write(wb, {bookType: "xlsx", type: "array"})], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}); }
  async function docx(L) { await muat("docx"); const D = window.docx, P = (x, o = {}) => new D.Paragraph({spacing: {after: 80}, ...o, children: [new D.TextRun({text: x, ...(o.run || {})})]});
    const KANAN = new Set(L.kanan);
    const sel = (x, i, kepala) => new D.TableCell({shading: kepala ? {type: D.ShadingType.CLEAR, fill: NAVY_HEX, color: "auto"} : undefined, margins: {top: 40, bottom: 40, left: 60, right: 60},
      children: [new D.Paragraph({alignment: KANAN.has(i) ? D.AlignmentType.RIGHT : D.AlignmentType.LEFT, children: [new D.TextRun({text: String(x), bold: kepala, color: kepala ? "FFFFFF" : undefined, size: 14})]})]});
    const anak = [P(L.judul, {run: {bold: true, size: 36, color: NAVY_HEX}}), P(L.tanggal), ...(L.perlu ? [P("Keperluan: " + L.perlu, {run: {bold: true}})] : []),
      new D.Table({width: {size: 100, type: D.WidthType.PERCENTAGE}, rows: [new D.TableRow({tableHeader: true, children: L.kol.map((x, i) => sel(x, i, true))}), ...L.baris.map(r => new D.TableRow({cantSplit: true, children: r.map((x, i) => sel(x, i))}))]})];
    return D.Packer.toBlob(new D.Document({sections: [{properties: {page: {size: {orientation: D.PageOrientation.LANDSCAPE}, margin: {top: 720, bottom: 720, left: 720, right: 720}}}, children: anak}]})); }
  async function pdf(L) { await muat("pdf"); await muat("tabel"); const d = new window.jspdf.jsPDF({unit: "pt", format: "a4", orientation: "landscape"});
    d.setFont("helvetica", "bold").setFontSize(18).setTextColor(...NAVY).text(L.judul, 36, 44);
    d.setFont("helvetica", "normal").setFontSize(10).setTextColor(60).text(L.tanggal, 36, 62); let y = 76;
    if (L.perlu) { d.setFont("helvetica", "bold").text("Keperluan: " + L.perlu, 36, y); y += 14; }
    d.autoTable({startY: y + 6, margin: {left: 36, right: 36, bottom: 36}, head: [L.kol], body: L.baris, styles: {fontSize: 7, cellPadding: 3, textColor: 30, overflow: "linebreak"},
      headStyles: {fillColor: NAVY, textColor: 255, fontStyle: "bold"}, columnStyles: Object.fromEntries(L.kanan.map(i => [i, i ? {halign: "right"} : {halign: "right", cellWidth: 22}]))});
    return d.output("blob"); }
  const FORMAT = {xlsx, docx, pdf};
  async function eksporDp(f) {
    if (sibuk || !setDp().size) return; sibuk = true; pesanDp("Menyiapkan berkas"); await new Promise(r => setTimeout(r, 0));
    try { const L = modeL() ? dataDpl() : dataDp(); try { localStorage.setItem(PERLU_KEY, L.perlu); } catch (e) {}
      const blob = await FORMAT[f](L), u = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = u; a.download = `${L.berkas}-${L.iso}.${f}`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4e4); pesanDp("Berkas siap"); }
    catch (e) { console.error(e); pesanDp(e.message || "Gagal membuat berkas"); }
    finally { sibuk = false; } }

  const barisPakar = o => { const e = emailDari(o), ms = medsosPasang(kontak[o[0]] || {}), kon = (e ? e.list.map(m => `<span class="ak-kt"><a class="ak-lnk" href="mailto:${esc(m)}">${ikon(IKON_MAIL, "currentColor")}<em>Email</em>${esc(m)}</a></span>`).join("") : "") + ms, sinta = o[10] ? `https://sinta.kemdiktisaintek.go.id/authors/profile/${o[10]}` : "";
    return `<div class="ak-bgrup">${barisB("Peran kini", `<b>${esc(prodiDari(o) || "Peneliti")}</b>`, sinta || `https://openalex.org/${o[0]}`)}${barisB("Lembaga", `<button type="button" class="ak-pk" data-kp="${esc(o[2])}">${esc(o[2])}</button>`, urlOk(kampusInfo[o[2]]?.web) )}
      ${barisB("Keahlian dan rumpun", `<span class="ak-pil">${o[8].slice(0, 6).map(t => `<span class="ak-prodi">${esc(t)}</span>`).join("")}${o[3].map(r => pilRumpun(r)).join("")}</span>`, "")}
      ${barisB("Metrik", `<b>h-index ${angka(o[4])}</b>, ${angka(o[5])} karya, ${angka(o[6])} sitasi`, `https://openalex.org/${o[0]}`, o[13] === "s" ? "Terdaftar di SINTA" : "")}
      <div class="ak-bl2"><span class="ak-bk">Kontak</span><div class="ak-bn">${kon ? `<div class="ak-lkontak">${kon}</div>` : `<b>belum ada kontak bersumber</b>`}</div></div></div>`; };
  const akhirPakar = o => { const urls = [`https://openalex.org/${o[0]}`, o[10] && `https://sinta.kemdiktisaintek.go.id/authors/profile/${o[10]}`, o[7] && urlOrcid(o[7]), urlOk(kampusInfo[o[2]]?.web)], e = emailDari(o),
      yk = yakinOrang(urls, [["peran", prodiDari(o)], ["foto", o[9]], ["email", e], ["rumpun", o[3].length]], null), sj = semua.filter(y => y[0] !== o[0] && y[3].some(r => o[3].includes(r))).sort((a, b) => ((provO(b) === provO(o)) - (provO(a) === provO(o))) || b[4] - a[4]).slice(0, 6);
    return bagB("Seberapa yakin kita", yakinHtml(yk)) + bagB("Sumber", sumberList(urls)) + bagB("Pakar sejenis", sj.length ? `<div class="ak-pil">${sj.map(y => `<button type="button" class="ak-pk" data-pk="${esc(y[0])}">${esc(y[1])}</button>`).join("")}</div>` : ""); };
  function buka(o) {
    const IK = {buka: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'};
    const tautan = [[`https://openalex.org/${o[0]}`, "OpenAlex"], o[10] && [`https://sinta.kemdiktisaintek.go.id/authors/profile/${o[10]}`, "SINTA"],
[`https://scholar.google.com/scholar?q=${encodeURIComponent('"' + o[1] + '"')}`, "Google Scholar"]].filter(Boolean);
    const status = o[13] === "s" ? ["ok", "Terdaftar di SINTA"] : o[13] === "x" ? ["", "Tidak ditemukan di SINTA"] : ["", "Belum dicocokkan dengan SINTA"];
    /* kepala lembar: foto, nama, institusi, label (prodi, SINTA, rumpun) dan metrik semuanya di pita navy */
    $("akDIsi").innerHTML = `<div class="ak-dkepala"><div class="ak-dk-atas">${sosok(o, true)}<div class="ak-nama"><h2 id="akDNama">${esc(o[1])}</h2><p><button type="button" class="ak-kp" data-kp="${esc(o[2])}" title="Profil kampus">${esc(o[2])}</button></p></div>${metrik(o)}</div>
        ${kontakHtml(o)}
        <div class="ak-pil">${o[11] ? `<span class="ak-prodi">${esc(o[11].replace(/\s*\((S\d|D\d|Sp-?\d)\)$/, ""))}</span>` : ""}<span class="ak-tanda ${status[0]}">${status[1]}</span>${o[15] === "diaspora" ? `<span class="ak-tanda diaspora">Diaspora Indonesia</span>` : ""}${o[3].map(r => pilRumpun(r)).join("")}${dpTombol(o[0])}${koreksiBtn("pakar", o[0])}</div><div class="ak-korw"></div></div>
      <div class="ak-dtubuh">${barisPakar(o)}
        ${o[12] ? `<section class="ak-dbagian"><h3>Bidang menurut SINTA</h3><p>${esc(o[12])}</p></section>` : ""}
        <section class="ak-dbagian"><h3>Topik riset utama</h3><div class="ak-topik">${o[8].map(t => `<span>${esc(t)}</span>`).join("")}</div></section>
        <section class="ak-dbagian" id="akOrcid" hidden><h3>Pendidikan dan riwayat jabatan</h3></section>
        <section class="ak-dbagian" id="akRingkas" hidden><h3>Ringkasan</h3><p></p></section>
        <section class="ak-dbagian" id="akMetrik" hidden><h3>Metrik publikasi menurut SINTA</h3><div></div></section>
        <section class="ak-dbagian" id="akTahunan" hidden><h3>Rekam jejak per tahun</h3><div class="ak-grafik2"></div></section>
        <section class="ak-dbagian" id="akScopus" hidden><h3>Artikel Scopus terbaru</h3><ol class="ak-karya"></ol></section>
        <section class="ak-dbagian" id="akKarya" hidden><h3>Karya ilmiah</h3>
          <div class="ak-ksaring"><div class="ak-seg" role="group" aria-label="Jenis karya"><button type="button" data-k="jenis" data-v="" aria-pressed="true">Semua</button><button type="button" data-k="jenis" data-v="jurnal" aria-pressed="false">Jurnal</button><button type="button" data-k="jenis" data-v="prosiding" aria-pressed="false">Prosiding</button><button type="button" data-k="jenis" data-v="buku" aria-pressed="false">Buku</button></div>
            <label class="ak-cari ak-kcari2"><span class="sr">Cari judul karya</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" autocomplete="off" placeholder="Cari judul karya"></label>
            <div class="ak-seg" role="group" aria-label="Urutkan karya"><span class="ak-seg-lbl">Urutkan</span><button type="button" data-k="urut" data-v="sitasi" aria-pressed="true">Paling dikutip</button><button type="button" data-k="urut" data-v="terbaru" aria-pressed="false">Terbaru</button></div></div>
          <ol class="ak-karya"></ol><nav id="akKHal" class="ak-hal" aria-label="Halaman daftar karya"></nav></section>
        <section class="ak-dbagian" id="akAfl" hidden><h3>Afiliasi lain</h3><div></div></section>
        <section class="ak-dbagian" id="akBukuP" hidden><h3>Buku</h3><div></div></section>
        <section class="ak-dbagian" id="akBrP" hidden><h3>Berita terkait</h3><div></div></section>
        <section class="ak-dbagian" id="akRisetW" hidden><h3>Riset wilayah</h3><div class="ak-wchip"></div></section>
        <section class="ak-dbagian" id="akKolab" hidden><h3>Sering menulis bersama</h3><ol class="ak-sdaftar"></ol></section>
        <div id="akPkAkhir">${akhirPakar(o)}</div>
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
    const IK = ['<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5.5 2 5.5 5"/>', IK_GEDUNG, KAT.inovasi[1], IKP.data];
    $("akAngka").innerHTML = [[semua.length, "pakar", "akPakarN"], [null, "lembaga", "akLembagaN"], [null, "inovasi", "akInovasiN"], [null, "sistem data", "akSistemN"]]
      .map(([n, l, id], i) => `<div><svg viewBox="0 0 24 24" aria-hidden="true">${IK[i]}</svg><b id="${id}">${n == null ? "..." : angka(n)}</b><span>${l}</span></div>`).join("");
    [["lembaga", "akLembagaN", "lembaga"], ["inovasi", "akInovasiN", "inovasi"], ["sistem_data", "akSistemN", "sistem"]].forEach(([n, id, k]) => nanti(() => ambilData(n).then(d => { const a = dlist(Array.isArray(d) ? d : d?.[k]); $(id).textContent = a.length ? angka(a.length) : "0"; })));
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
  /* L45: ringkasan kebijakan per rumpun dan provinsi (POST /api/akademisi/ringkasan, Workers AI dari abstrak, cache R2 30 hari) */
  let rkSibuk = false, rktok = 0;
  const PESAN_RK = {401: "Masuk sebagai staf BNPB atau admin dulu.", 400: "Pilihan rumpun atau provinsi tidak sah.", 404: "Riset terlalu sedikit untuk diringkas. Pilih rumpun atau provinsi yang lebih luas.", 429: "Batas ringkasan per jam tercapai. Coba lagi nanti.", 503: "Ringkasan otomatis belum tersedia.", 502: "Ringkasan gagal disusun. Coba lagi nanti."};
  function segarRk() { const b = $("akRRk"), n = $("akRRn"); if (!b) return; rktok++; b.disabled = !R.rumpun || rkSibuk;
    n.textContent = R.rumpun ? `${(RUMPUN[R.rumpun] || [R.rumpun])[0]}, ${R.prov ? provT(R.prov) : "seluruh Indonesia"}` : "Pilih satu rumpun dulu"; $("akRRh").innerHTML = ""; }
  async function ringkasTemuan() {
    if (!R.rumpun || rkSibuk) return; rkSibuk = true; const tk = ++rktok, h = $("akRRh"); $("akRRk").disabled = true; h.innerHTML = hantuHtml;
    let r, d; try { r = await fetch("/api/akademisi/ringkasan", {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json"}, body: JSON.stringify({rumpun: R.rumpun, prov: R.prov})}); d = await r.json().catch(() => ({})); } catch (e) { r = null; }
    rkSibuk = false; $("akRRk").disabled = !R.rumpun; if (tk !== rktok) return;
    if (!r || !r.ok) { h.innerHTML = `<p class="ak-panel ak-rcatat">${esc(PESAN_RK[r?.status] || d?.galat || "Gagal memuat ringkasan. Periksa koneksi lalu coba lagi.")}</p>`; return; }
    nanti(() => { if (tk !== rktok) return;
      const kr = new Map(dlist(d.karya).map(k => [k.id, k])), tautan = id => { const k = kr.get(id), x = risetArr?.find(y => String(y.id || "").includes(id)), u = (x && (urlOk(x.url) || urlDoi(x.doi))) || urlOA(id);
        return u ? `<a class="ak-lsum" href="${esc(u)}" ${LUAR} title="${esc(k?.judul || id)}">Sumber${k?.tahun ? " " + esc(k.tahun) : ""}</a>` : ""; };
      h.innerHTML = `<section class="ak-panel ak-lA"><div class="ak-pil"><span class="ak-r utama" style="--w0:#e8590c">Ringkasan otomatis</span>${d.cache ? '<span class="ak-izin contoh">Dari simpanan</span>' : ""}${d.dibuat ? `<span class="ak-prodi">Dibuat ${esc(tglID(d.dibuat))}</span>` : ""}</div>
        <h2 class="ak-judulv"><b>${angka(dlist(d.temuan).length)}</b> temuan kunci, ${esc((RUMPUN[d.rumpun] || [d.rumpun])[0].toLowerCase())}, ${d.prov ? esc(provT(d.prov)) : "seluruh Indonesia"}</h2>
        <ol class="ak-rbutir ak-rkl">${dlist(d.temuan).map(t => `<li><span class="ak-rata">${esc(t.teks)}</span> ${dlist(t.karya).map(tautan).join(" ")}</li>`).join("")}</ol>
        ${dlist(d.implikasi).length ? `<div class="ak-rsimpul"><h4>Implikasi untuk penanggulangan bencana</h4><ul class="ak-rbutir">${d.implikasi.map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>` : ""}
        <p class="ak-lkaki">Ringkasan otomatis dari abstrak, periksa karya aslinya. Sumber: ${angka(dlist(d.karya).length)} riset teratas menurut sitasi dan kebaruan di tab Riset daerah (OpenAlex).</p></section>`; });
  }
  function bangunRiset(p) {
    p.innerHTML = `<div class="ak-saring"><div class="ak-alat">${cariKotak("akRQ", "Cari judul, penulis, jurnal, atau kampus")}</div>
      <div class="ak-baris">${htmlPilih("akRP", IKON_PIN, "Cari provinsi")}${htmlPilih("akRK", IKON_PIN, "Cari kabupaten atau kota")}</div>
      ${segHtml("akRS", "Sumber riset", [["", "Semua sumber", IK_SEMUA], ["int", "Jurnal internasional", IKJ], ["lokal", "Repositori kampus", IK_KAMPUS]])}
      <div id="akRR" class="ak-chip" role="group" aria-label="Rumpun bahaya">${chipsRumpun(Object.entries(risetRumpun).sort((a, b) => b[1] - a[1]))}</div>
      <div class="ak-rkbaris"><button type="button" class="ak-tbl" id="akRRk" disabled>Ringkas temuan</button><span class="ak-tanda" id="akRRn"></span></div></div>
      <div id="akRRh"></div>
      <div class="ak-hasil" id="akRHasil"><h2 class="ak-judulv" id="akRJ"></h2><div id="akRL"></div><nav id="akRH" class="ak-hal" aria-label="Halaman daftar riset" aria-live="polite"></nav></div>`;
    const jalan = gulir => { const t = ++rtok; segarRk(); nanti(() => { if (t !== rtok) return; saringRiset(); gambarRiset(gulir); }); };
    $("akRRk").addEventListener("click", ringkasTemuan);
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
    setChip("akKjC", K.jenis); gambarKej(false);
  }

  /* ----- jurnal ----- */
  const J = {q: "", hal: 1}, JPER = 25;
  let jurArr = [], jurHasil = [];
  function gambarJur(gulir) {
    const q = J.q.toLowerCase(); jurHasil = jurArr.filter(j => !q || j._cari.includes(q));
    const n = jurHasil.length, a = (J.hal - 1) * JPER;
    $("akJJ").innerHTML = `<b>${angka(n)}</b> jurnal kebencanaan`;
    $("akJL").innerHTML = n ? `<div class="ak-jgrid">${jurHasil.slice(a, a + JPER).map(kartuJur).join("")}</div>` : `<p class="ak-khampa">Tidak ada jurnal yang cocok.</p>`;
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
    p.innerHTML = `${segHtml("akPS", "Tampilan pusat studi", [["pusat", "Pusat studi", IK_KAMPUS], ["aset", "Aset riset", KAT.riset[1]]])}<div id="akPsA" class="ak-tampilan"></div><div id="akPsB" class="ak-tampilan" hidden></div>`;
    $("akPS").addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (b) subPs(b.dataset.v); });
    asSiap = false;
    $("akPsA").innerHTML = `<div class="ak-saring"><div class="ak-baris">${htmlPilih("akPP", IKON_PIN, "Cari provinsi")}</div></div>
      <div class="ak-hasil"><h2 class="ak-judulv" id="akPJ"></h2><div id="akPL"></div></div>`;
    pasangPilih("akPP", {semua: "Semua provinsi", nilai: () => PS.prov, opsi: () => Object.entries(n).filter(([v]) => v).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, provT(v), c]), pilih: v => { PS.prov = v; nanti(gambarPs); }});
    $("akPL").addEventListener("click", e => { const kp = e.target.closest("[data-kp]"); if (kp) profilKampus(kp.dataset.kp); });
    gambarPs(); subPs(psSub);
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

  /* ----- lembaga mitra (docs/bnpb/lembaga/PRD.md): daftar, profil, analisa, proyek mitra; aset riset di tab Pusat studi -----
     Data staf dari /api/akademisi/data/{lembaga,lembaga_3w,aset_riset} (R2). Layar membaca apa adanya; satu-satunya hitungan klien adalah agregat analisa. */
  const IK_TEL = '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>', IK_WA = '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9c0 3 3 6 6 6l1-1.5-2-1-1 .8c-1-.5-2-1.5-2.5-2.5l.8-1-1-2z"/>';
  const IK_GEDUNG = '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M8 10h.01M16 10h.01"/>', IK_BAR = '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', IK_UANG = '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>';
  const KAT = {
    kerelawanan: ["Kerelawanan", '<path d="M12 20s-8-5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11z"/>', "#d6336c"],
    donasi: ["Donasi dan filantropi", '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.7c0 2.3-5 1.3-5 3.6 0 1 1 1.7 2.5 1.7s2.5-.6 2.5-1.5M12 6.5v1.5M12 16v1.5"/>', "#2b8a3e"],
    pemerintah: ["Pemerintah", IK_GEDUNG, "#1c7ed6"],
    jejaring: ["Jejaring PRB", '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M11 7.3 6 16.8M13 7.3l5 9.5M7.5 19h9"/>', "#5f3dc4"],
    internasional: ["Internasional", '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>', "#0b7285"],
    "mitra-internasional": ["Mitra donor", '<path d="M3 12l4-4 4 3 4-3 6 5-6 5-3-2-3 2z"/>', "#1098ad"],
    keagamaan: ["Keagamaan", '<path d="M12 3v4M10 5h4M5 21V11l7-4 7 4v10M10 21v-5h4v5"/>', "#8d5524"],
    "dunia-usaha": ["Dunia usaha", IK_UANG, "#495057"],
    komunikasi: ["Komunikasi", '<path d="M12 12v9M8 21h8"/><circle cx="12" cy="10" r="2"/><path d="M7.5 5.5a6.5 6.5 0 0 0 0 9M16.5 5.5a6.5 6.5 0 0 1 0 9"/>', "#e8590c"],
    profesi: ["Asosiasi profesi", '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>', "#862e9c"],
    kesehatan: ["Kesehatan darurat", '<path d="M12 4v16M4 12h16"/>', "#e03131"],
    riset: ["Riset non-kampus", '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>', "#2f9e44"],
    lsm: ["LSM dan yayasan", '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M15.5 14.5c3 0 5.5 1.7 5.5 4.5"/>', "#d9480f"],
    inovasi: ["Inovasi", '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>', "#f59f00"],
    penerbit: ["Penerbit jurnal", IKJ, "#6b7280"]};
  const BIDANG = ["tanggap darurat", "SAR", "logistik", "kesehatan", "psikososial", "air dan sanitasi", "hunian", "pangan", "pendidikan", "perlindungan", "rehab-rekon", "PRB dan kesiapsiagaan", "pendanaan", "komunikasi", "data dan pemetaan", "riset"];
  const SKALA_L = {nasional: "Nasional", provinsi: "Provinsi", "kab/kota": "Kabupaten dan kota", internasional: "Internasional", regional: "Regional"};
  const KURS_USD = 16300;   // asumsi tampilan, tertulis di layar; bukan kurs resmi
  const nrm = s => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const skalaKey = s => { s = String(s || "").toLowerCase().trim(); return /kab|kota/.test(s) ? "kab/kota" : s; };
  const telF = t => { const d = String(t).replace(/\D/g, ""); if (!d.startsWith("62") || d.length < 9) return String(t);
    const r = d.slice(2), a = r[0] === "8" ? 3 : ["21", "22", "24", "31", "61"].includes(r.slice(0, 2)) ? 2 : 3, s = r.slice(a);
    return `+62 ${r.slice(0, a)}-${s.length > 4 ? s.slice(0, s.length - 4) + "-" + s.slice(-4) : s}`; };
  const telHref = t => "tel:" + String(t).replace(/[^\d+]/g, ""), waHref = t => "https://wa.me/" + String(t).replace(/\D/g, "");
  const strs = a => dlist(a).filter(v => typeof v === "string" && v.trim()).map(v => v.trim());
  const kabProv = x => [x.kab, provT(x.prov)].filter(Boolean).join(", ");
  const logoLb = x => urlOk(x.logo) ? `<img class="ak-klogo" src="${esc(urlOk(x.logo))}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="ak-klogo kosong" aria-hidden="true">${esc(inisial(x.singkatan || x.nama))}</span>`;
  const pilKat = k => { const [l, d, w] = KAT[k] || [k, "", "#6b7280"]; return `<span class="ak-r utama" style="--w0:${w}">${d ? ikon(d, w) : ""}${esc(l)}</span>`; };
  const sumberButir = (x, butir) => dlist(x.sumber).find(s => s && s.butir === butir && urlOk(s.url));
  const lSum = (u, tgl) => u ? `<a class="ak-lsum" href="${esc(u)}" ${LUAR} title="${esc(tgl ? "Diperiksa " + tglID(tgl) : "Buka sumber")}">Sumber</a>` : "";
  const hostDari2 = u => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch (e) { return ""; } };
  const pihak3 = (x, u) => { const h = hostDari2(u), w = hostDari2(urlOk(x.web) || ""); return h && !/\.(go|or|ac|mil)\.id$|\.go\.id$/.test(h) && !(w && (h === w || h.endsWith("." + w) || w.endsWith("." + h))) ? '<small class="ak-izin contoh" title="Sumber bukan domain lembaga atau situs resmi pemerintah">Direktori pihak ketiga</small>' : ""; };
  const lSumB = (x, butir) => { const s = sumberButir(x, butir); return s ? lSum(urlOk(s.url), s.diperiksa) + pihak3(x, urlOk(s.url)) : ""; };
  const kItem = (x, butir, ik, lab, href, teks) => `<span class="ak-kt"><a class="ak-lnk" href="${esc(href)}"${href.startsWith("http") ? " " + LUAR : ""}>${ikon(ik, "currentColor")}<em>${lab}</em>${esc(teks)}</a>${lSumB(x, butir)}</span>`;
  /* semua = profil (semua nomor), tidak = kartu (satu per jenis) */
  const kontakLb = (x, semua) => { const lim = a => semua ? a : a.slice(0, 1), web = urlOk(x.web);
    return [...lim(strs(x.telepon)).map(t => kItem(x, "telepon", IK_TEL, "Telepon", telHref(t), telF(t))), ...lim(strs(x.wa)).map(t => kItem(x, "wa", IK_WA, "WA", waHref(t), telF(t))),
      ...lim(strs(x.email).filter(emailOk)).map(m => kItem(x, "email", IKON_MAIL, "Email", "mailto:" + m, m)), ...(web ? [kItem(x, "web", IKON_WEB, "Situs", web, urlHost(web))] : [])].join(""); };
  const izinStatus = z => { if (!z || typeof z !== "object") return null;
    if (z.status === "dicabut") return ["dicabut", "Izin dicabut"];
    const d = z.berlaku_sampai ? new Date(String(z.berlaku_sampai).slice(0, 10) + "T23:59:59Z") : null;
    if (z.status === "habis" || (d && !isNaN(d) && d < new Date())) return ["habis", "Izin habis"];
    return z.status === "berlaku" || d ? ["berlaku", "Izin berlaku"] : ["belum", "Izin belum diperiksa"]; };
  const pilIzin = x => { const s = izinStatus(x.izin); if (!s) return "";
    return `<span class="ak-izin ${s[0]}" title="${esc([x.izin.jenis, x.izin.nomor, x.izin.berlaku_sampai && "berlaku sampai " + tglID(x.izin.berlaku_sampai)].filter(Boolean).join(", "))}">${s[1]}</span>`; };
  const pilMitra = x => x.mitra_bnpb?.bukti ? `<span class="ak-izin mitra" title="${esc([x.mitra_bnpb.bukti, x.mitra_bnpb.tahun].filter(Boolean).join(", "))}">Mitra BNPB</span>` : "";
  const pilContoh = x => x.dummy ? '<span class="ak-izin contoh">Contoh</span>' : "";
  const basi = x => x.diperiksa && Date.now() - new Date(String(x.diperiksa).slice(0, 10)).getTime() > 183 * 864e5;
  const lbPeriksa = x => x.diperiksa ? `<small class="ak-lper${basi(x) ? " basi" : ""}">Diperiksa ${esc(tglID(x.diperiksa))}${basi(x) ? ", lebih dari 6 bulan lalu" : ""}</small>` : "";
  const waktuMaks = a => a.map(x => String(x.diperiksa || "")).filter(Boolean).sort().pop() || "";

  /* ---- daftar ---- */
  const LB = {q: "", prov: "", kat: "", skala: "", bidang: "", sub: "", sensor: false, hal: 1}, LPER = 24;
  let lbArr = [], lbMap = new Map(), lbCabang = new Map(), lbHasil = [], ltok = 0, lbSub = "peta", dpl = new Set();
  const DPL_KEY = "ak-dpl";
  const bacaDpl = () => { try { return new Set(JSON.parse(localStorage.getItem(DPL_KEY)) || []); } catch (e) { return new Set(); } };
  const RE_NAMA = [[/bmkg|meteorologi klimatologi/i, ["gempa", "tsunami", "hidrometeorologi", "iklim", "kekeringan"], "BMKG"], [/pvmbg|magma/i, ["gunung api"], "PVMBG"], [/badan geologi/i, ["longsor", "gempa", "gunung api"], "Badan Geologi"],
    [/manggala agni|daops/i, ["karhutla"], "Manggala Agni"], [/bbws|ditjen sda|sumber daya air/i, ["banjir", "kekeringan"], "BBWS/SDA"], [/\bbig\b|informasi geospasial/i, ["tsunami", "pesisir"], "BIG"], [/brgm|restorasi gambut/i, ["karhutla"], "BRGM"]];
  const RE_SENSOR = [[/buoy|pasut/i, ["tsunami", "pesisir"]], [/seism|akselero/i, ["gempa", "tsunami"]], [/gnss|cors/i, ["gempa"]], [/gunung|cctv/i, ["gunung api"]], [/radar|aws|cuaca/i, ["hidrometeorologi"]], [/awlr|arr|hidrolog|muka air/i, ["banjir"]], [/tmat|gambut/i, ["karhutla"]]];
  function turunRumpun(x) {
    const m = new Map(), add = (r, a) => { if (!m.has(r)) m.set(r, a); };
    strs(x.rumpun).forEach(r => add(r, "rumpun tercatat di laman lembaga"));
    dlist(x.sensor).forEach(sn => RE_SENSOR.forEach(([re, rs]) => { if (re.test(sn?.jenis || "")) rs.forEach(r => add(r, `punya ${sn.jenis}`)); }));
    const t = [x.nama, x.singkatan, x.sub, ...strs(x.alias)].join(" "); RE_NAMA.forEach(([re, rs, l]) => { if (re.test(t)) rs.forEach(r => add(r, `lembaga ${l}`)); });
    return m;
  }
  const alasanLb = x => GL.r ? x._rum?.get(GL.r) : "";
  async function perkayaRumpun() {
    const [iv, sd] = await Promise.all([ambilData("inovasi"), ambilData("sistem_data")]);
    dlist(Array.isArray(iv) ? iv : iv?.inovasi).forEach(i => dlist(i.pembuat).forEach(b => { const x = lbMap.get(b.lembaga_id); if (x) strs(i.rumpun).forEach(r => { if (!x._rum.has(r)) x._rum.set(r, `pembuat ${i.nama}`); }); }));
    dlist(Array.isArray(sd) ? sd : sd?.sistem).forEach(i => { const x = lbMap.get(i.lembaga_id); if (x) strs(i.rumpun).forEach(r => { if (!x._rum.has(r)) x._rum.set(r, `pemilik ${i.nama}`); }); });
    if (GL.r && $("akLJ")) { saringLb(); gambarLb(false); }
    ambilBrc(() => { if ($("akLJ")) gambarLb(false); if ($("akTkL")) gambarTk(false); if ($("akInL")) gambarIn(false); });
  }
  function indeksLb(d) {
    lbArr = dlist(Array.isArray(d) ? d : d?.lembaga).filter(x => x && x.id && x.nama); lbMap = new Map(); lbCabang = new Map();
    for (const x of lbArr) { lbMap.set(x.id, x); if (x.induk) { if (!lbCabang.has(x.induk)) lbCabang.set(x.induk, []); lbCabang.get(x.induk).push(x); }
      x.prov = x.prov == null || x.prov === "" ? null : String(x.prov); x._skala = skalaKey(x.skala);
      x._cari = [x.nama, x.singkatan, x.kab, x.sub, ...strs(x.alias)].filter(Boolean).join(" ").toLowerCase(); }
    lbArr.sort((a, b) => a.nama.localeCompare(b.nama, "id")); lbArr.forEach(x => { x._rum = turunRumpun(x); }); nanti(perkayaRumpun);
    for (const x of lbArr) x._skor = [strs(x.telepon).length, strs(x.wa).length, strs(x.email).length, urlOk(x.web), x.alamat, x.pimpinan?.nama, x.izin, strs(x.bidang).length, urlOk(x.logo), Number.isFinite(x.lat)].filter(Boolean).length;
    lbArr.slice().sort((a, b) => b._skor - a._skor).forEach((x, i) => { x._rank = i + 1; });
    for (const a of sub1(lbArr, x => x.kategori).values()) a.slice().sort((p, q) => q._skor - p._skor).forEach((x, i) => { x._rankK = i + 1; x._nK = a.length; });
    dpl = new Set([...bacaDpl()].filter(id => lbMap.has(id)));
  }
  const hitungLb = f => { const n = {}; lbArr.forEach(x => { const v = f(x); for (const k of [].concat(v)) if (k != null && k !== "") n[k] = (n[k] || 0) + 1; }); return n; };
  const chipsKat = rows => `<button type="button" data-r="" aria-pressed="true">${ikon(IK_SEMUA, "currentColor")}Semua kategori</button>` + rows.map(([k, n]) => { const [l, ic, w] = KAT[k] || [k, "", "#6b7280"];
    return `<button type="button" data-r="${esc(k)}" aria-pressed="false">${ic ? ikon(ic, w) : ""}${esc(l)}<span>${angka(n)}</span></button>`; }).join("");
  /* pola kartu pakar dipakai semua kartu direktori: foto/logo bulat, nama, lencana status, pil navy dan biru muda, rumpun, 3 metrik */
  const BRC = new Map(); let brcMuat = false;
  const ambilBrc = cb => { if (brcMuat) return; brcMuat = true; ambilData("berita").then(d => { dlist(Array.isArray(d) ? d : d?.berita).forEach(b => dlist(b?.entitas).forEach(e => BRC.set(e.jenis + ":" + e.id, (BRC.get(e.jenis + ":" + e.id) || 0) + 1))); cb?.(); }); };
  const IKP = {kontak: IK_TEL, cabang: IK_GEDUNG, sensor: IK_BAR, berita: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4"/>', kiprah: '<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.3 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>', medsos: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 11 7.6-4M8.2 13l7.6 4"/>',
    lokasi: IKON_PIN, tahun: IKL.tahun, bantuan: '<path d="M12 20s-8-5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11z"/>', data: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/>', frek: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', uang: IK_UANG, proyek: IK_BAR, tenggat: IKL.tahun};
  const sosokPola = (logoUrl, nama, badge) => `<span class="ak-sosok"><span class="ak-foto ak-fl">${urlOk(logoUrl) ? `<img src="${esc(urlOk(logoUrl))}" alt="" loading="lazy" referrerpolicy="no-referrer" data-inisial="${esc(inisial(nama))}">` : esc(inisial(nama))}</span>${urlOk(badge) ? `<img class="ak-logo" src="${esc(urlOk(badge))}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}</span>`;
  const kartuPola = ({attr, cek, sosok, nama, status, navy, biru, rumpun, metrik}) => { const rp = strs(rumpun), mt = metrik.map(([k, l, v, t]) => `<div title="${esc(l)}"><span class="ak-mlabel">${ikon(IKP[k], "currentColor")}${esc(l)}</span><b${t ? ' class="t"' : ""}>${esc(v)}</b></div>`).join("");
    return `<div class="ak-orang" role="button" tabindex="0" ${attr} aria-label="Buka ${esc(nama)}">${cek || ""}<span class="ak-atas">${sosok}<span class="ak-nama"><h3>${esc(nama)}</h3>${status ? `<span class="ak-lencana"><em class="ak-l-${status[0]}">${esc(status[1])}</em></span>` : ""}</span></span>
      <span class="ak-kartu-label">${navy ? `<button type="button" class="ak-lbl-inst" data-fq="${esc(navy)}" title="Cari ${esc(navy)}">${esc(navy)}</button>` : ""}${biru ? `<button type="button" class="ak-lbl-prodi" data-fq="${esc(biru)}" title="Cari ${esc(biru)}">${esc(biru)}</button>` : ""}</span>
      <span class="ak-pil">${rp.slice(0, 3).map((r, j) => `<button type="button" class="ak-r${j === 0 ? " utama" : ""}" data-rpn="${esc(r)}" style="--w0:${(RUMPUN[r] || [])[2] || "#6b7280"}">${(RUMPUN[r] || [])[1] ? ikon(RUMPUN[r][1], RUMPUN[r][2]) : ""}${esc((RUMPUN[r] || [r])[0])}</button>`).join("")}${rp.length > 3 ? `<span class="ak-r">+${rp.length - 3}</span>` : ""}</span>
      <div class="ak-metrik">${mt}</div></div>`; };
  const sheetDetail = (nama, html) => { bukaSheet("detail", `<div class="ak-dkepala"><div class="ak-dk-atas"><div class="ak-nama"><h2 id="akSJudul">${esc(nama)}</h2></div></div></div>`, () => `<div class="ak-disi">${html}</div>`); $("akSheet").dataset.k = ""; };
  const cekPola = (id, ada) => `<label class="ak-pilih" title="Tambah ke daftar pendek"><input type="checkbox" data-dpl="${esc(id)}" aria-label="Tambah ke daftar pendek"${ada ? " checked" : ""}><span class="ak-cek"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg></span></label>`;
  function kartuLb(x, i) {
    const iz = izinStatus(x.izin), st = iz?.[0] === "dicabut" ? ["merah", "Izin dicabut"] : iz?.[0] === "berlaku" ? ["sinta", "Izin berlaku"] : x.mitra_bnpb?.bukti ? ["sinta", "Mitra BNPB"] : x.yakin?.label === "tinggi" ? ["sinta", "Resmi"] : null;
    const induk = x.induk && lbMap.get(x.induk), kon = strs(x.telepon).length + strs(x.wa).length + strs(x.email).filter(emailOk).length + (urlOk(x.web) ? 1 : 0), bn = BRC.get("lembaga:" + x.id);
    const m2 = x.kategori === "dunia-usaha" ? ["bantuan", "Bantuan", angka(dlist(x.potensi_bantuan).length)] : dlist(x.sensor).length ? ["sensor", "Sensor", angka(dlist(x.sensor).length)] : ["cabang", "Cabang", angka((lbCabang.get(x.id) || []).length)];
    return kartuPola({attr: `data-li="${i}"`, cek: cekPola(x.id, dpl.has(x.id)), sosok: sosokPola(x.logo, x.singkatan || x.nama, induk?.logo), nama: x.singkatan ? `${x.nama} (${x.singkatan})` : x.nama, status: st, navy: induk ? (induk.singkatan || induk.nama) : (KAT[x.kategori] || [x.kategori])[0],
      biru: x.sub ? kapital(x.sub) : x.prov ? provT(x.prov) : SKALA_L[x._skala], rumpun: [...(x._rum?.keys() || [])], metrik: [["kontak", "Kontak", angka(kon)], m2, ["berita", "Berita", bn == null ? "-" : angka(bn)]]});
  }
  function saringLb() {
    const q = LB.q.toLowerCase();
    lbHasil = lbArr.filter(x => (!LB.prov || x.prov === LB.prov) && (!LB.kat || x.kategori === LB.kat) && (!LB.skala || x._skala === LB.skala) && (!LB.bidang || strs(x.bidang).includes(LB.bidang)) && (!LB.sensor || dlist(x.sensor).length > 0) && (!LB.sub || String(x.sub || "").toLowerCase() === LB.sub) && (!GL.r || x._rum.has(GL.r) || x._rum.size === 0) && (!q || x._cari.includes(q)));
  }
  const grupLb = x => GL.r ? (x._rum.has(GL.r) ? "k" : "l") : "";
  function gambarLb(gulir) {
    if (GL.r) lbHasil.sort((a, b) => (grupLb(a) === "k" ? 0 : 1) - (grupLb(b) === "k" ? 0 : 1) || a.nama.localeCompare(b.nama, "id"));
    const n = lbHasil.length, a = (LB.hal - 1) * LPER, wil = LB.prov ? ` di ${provT(LB.prov)}` : "", kat = LB.kat ? ` ${(KAT[LB.kat] || [LB.kat])[0].toLowerCase()}` : "";
    $("akLJ").innerHTML = `<b>${angka(n)}</b> lembaga${esc(kat)}${esc(wil)}`;
    $("akLL").innerHTML = n ? lbHasil.slice(a, a + LPER).map((x, j) => { const g = grupLb(x), h = g && (j === 0 || grupLb(lbHasil[a + j - 1]) !== g) ? `<h3 class="ak-lgrp">${g === "k" ? "Khusus " + esc(namaBencana(GL.r).toLowerCase()) : "Lintas bencana"}</h3>` : ""; return h + kartuLb(x, a + j); }).join("") : `<p class="ak-khampa">Tidak ada lembaga yang cocok. Longgarkan saringan.</p>`;
    $("akLH").innerHTML = navHal(LB.hal, n, LPER, "lembaga");
    if (gulir) gulirKe("akLJ");
  }
  function bangunDaftarLb(el) {
    el.innerHTML = `<div class="ak-saring"><div class="ak-alat">${cariKotak("akLQ", "Cari nama, singkatan, atau kota")}<button id="akLSn" class="ak-tog" type="button" aria-pressed="false">${ikon(IK_BAR, "currentColor")}Punya sensor</button></div>
      <div class="ak-baris ak-baris3">${htmlPilih("akLP", IKON_PIN, "Cari provinsi")}${htmlPilih("akLSk", IK_GEDUNG, "Cari skala")}${htmlPilih("akLB", IKL.jenis, "Cari bidang kegiatan")}</div><div class="ak-baris" id="akLSubW" hidden>${htmlPilih("akLSub", IK_UANG, "Cari sub-kategori dunia usaha")}</div>
      <div id="akLC" class="ak-chip" role="group" aria-label="Kategori lembaga">${chipsKat(Object.entries(hitungLb(x => x.kategori)).filter(([k]) => k !== "penerbit").sort((a, b) => b[1] - a[1]))}</div></div>
      <div class="ak-hasil"><h2 class="ak-judulv" id="akLJ"></h2><div class="ak-daftar" id="akLL"></div><nav id="akLH" class="ak-hal" aria-label="Halaman daftar lembaga" aria-live="polite"></nav></div>`;
    const jalan = gulir => { const t = ++ltok; nanti(() => { if (t !== ltok) return; saringLb(); gambarLb(gulir); }); };
    const opsi = (f, lab) => () => Object.entries(hitungLb(f)).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, lab(v), c]);
    const ubah = (k, v) => { LB[k] = v; LB.hal = 1; jalan(false); };
    pasangPilih("akLP", {semua: "Semua provinsi", nilai: () => LB.prov, opsi: opsi(x => x.prov, provT), pilih: v => ubah("prov", v)});
    pasangPilih("akLSk", {semua: "Semua skala", nilai: () => LB.skala, opsi: opsi(x => x._skala, v => SKALA_L[v] || kapital(v)), pilih: v => ubah("skala", v)});
    pasangPilih("akLB", {semua: "Semua bidang kegiatan", nilai: () => LB.bidang, opsi: opsi(x => strs(x.bidang), kapital), pilih: v => ubah("bidang", v)});
    $("akLSn").addEventListener("click", () => { LB.sensor = !LB.sensor; $("akLSn").setAttribute("aria-pressed", String(LB.sensor)); LB.hal = 1; jalan(false); });
    pasangPilih("akLSub", {semua: "Semua sub-kategori dunia usaha", nilai: () => LB.sub, opsi: () => Object.entries(hitungLbL(lbArr.filter(x => x.kategori === LB.kat), x => String(x.sub || "").toLowerCase())).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, kapital(v), c]), pilih: v => ubah("sub", v)});
    let tt = 0; $("akLQ").addEventListener("input", e => { clearTimeout(tt); tt = setTimeout(() => ubah("q", e.target.value.trim()), 250); });
    $("akLC").addEventListener("click", e => { const b = e.target.closest("button[data-r]"); if (!b) return; setChip("akLC", b.dataset.r); $("akLSubW").hidden = !["dunia-usaha", "lsm"].includes(b.dataset.r); LB.sub = ""; ubah("kat", b.dataset.r); });
    pasangHal("akLH", h => { LB.hal = h; gambarLb(true); });
    const bukaK = e => { if (e.target.closest(".ak-pilih")) { if (e.target.tagName === "INPUT") dplUbah(e.target.dataset.dpl, e.target.checked); return; }
      if (e.target.closest("a")) return; const c = e.target.closest("[data-li]"); if (c && lbHasil[+c.dataset.li]) bukaLb(lbHasil[+c.dataset.li]); };
    $("akLL").addEventListener("click", bukaK);
    $("akLL").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-li]")) { e.preventDefault(); bukaK(e); } });
    jalan(false);
  }

  /* ---- daftar pendek lembaga: bilah dan mesin ekspor pakar dipakai bersama ---- */
  const dplSimpan = () => { try { localStorage.setItem(DPL_KEY, JSON.stringify([...dpl])); } catch (e) {} };
  function dplUbah(id, ada) { if (ada) dpl.add(id); else dpl.delete(id); dplSimpan(); dpSegarkan(); if ($("akSheet").dataset.mode === "dpl" && !$("akSheet").hidden) daftarDpl(); }
  const dplTombol = id => `<button type="button" class="ak-dptog" data-dpl-t="${esc(id)}" aria-pressed="${dpl.has(id)}">${ikon(IKON_TANDA, "currentColor")}<span>${dpl.has(id) ? "Ada di daftar pendek" : "Tambah ke daftar pendek"}</span></button>`;
  function daftarDpl() {
    const ls = [...dpl].map(id => lbMap.get(id)).filter(Boolean);
    if (!ls.length) { tutupSheet(); return; }
    $("akSJudul").nextElementSibling.querySelector("b").textContent = angka(ls.length);
    $("akSTubuh").innerHTML = `<ol class="ak-sdaftar">${ls.map(x => `<li><button type="button" class="ak-sbuka" data-lb="${esc(x.id)}">${logoLb(x)}<span><b>${esc(x.nama)}</b><small>${esc(KAT[x.kategori]?.[0] || x.kategori)}</small></span></button><button type="button" class="ak-shapus" data-hapusl="${esc(x.id)}" aria-label="Hapus ${esc(x.nama)} dari daftar pendek"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></li>`).join("")}</ol>`;
  }
  function lihatDpl() { bukaSheet("dpl", `<div class="ak-dkepala"><div class="ak-dk-atas"><div class="ak-nama"><h2 id="akSJudul">Daftar pendek lembaga</h2><p><b>${angka(dpl.size)}</b> lembaga terpilih</p></div></div></div>`, () => { daftarDpl(); return $("akSTubuh").innerHTML; }); }
  const KOL_L = ["No", "Nama", "Singkatan", "Kategori", "Provinsi", "Kota", "Telepon", "WA", "Email", "Situs", "Sumber kontak", "Izin", "Mitra BNPB", "Diperiksa"];
  function dataDpl() {
    const wib = new Date(Date.now() + 7 * 36e5), iso = wib.toISOString().slice(0, 10), perlu = $("akDpPerlu").value.trim();
    const baris = [...dpl].map(id => lbMap.get(id)).filter(Boolean).map((x, i) => [i + 1, x.nama, x.singkatan || "", KAT[x.kategori]?.[0] || x.kategori, provT(x.prov), x.kab || "", strs(x.telepon).map(telF).join("; "), strs(x.wa).map(telF).join("; "),
      strs(x.email).join("; "), urlOk(x.web), [...new Set(dlist(x.sumber).map(s => urlOk(s?.url)).filter(Boolean))].join(" "), izinStatus(x.izin)?.[1] || "", x.mitra_bnpb?.bukti ? [x.mitra_bnpb.bukti, x.mitra_bnpb.tahun].filter(Boolean).join(", ") : "", x.diperiksa ? tglID(x.diperiksa) : ""]);
    return {judul: "Daftar Pendek Lembaga Mitra", iso, perlu, baris, berkas: "daftar-pendek-lembaga", kol: KOL_L, lebar: [5, 34, 14, 22, 18, 20, 24, 24, 30, 30, 60, 16, 26, 18], kanan: [0],
      tanggal: wib.toLocaleDateString("id-ID", {timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric"}) + ", " + wib.toISOString().slice(11, 16) + " WIB"};
  }

  /* ---- profil lembaga (L41) ---- */
  const isiNanti = (cek, id, html) => { const c = (n = 0) => { if (!cek()) return; const el = $(id); if (!el) { if (n < 20) nanti(() => c(n + 1)); return; } el.outerHTML = html; }; nanti(c); };
  const namaLb = x => [...new Set([x.nama, x.singkatan, ...strs(x.alias)].map(nrm).filter(s => s.length >= 3))];
  /* jurnal yang penerbitnya sama dengan nama/singkatan/alias lembaga: sama persis, atau salah satu nama (>= 4 huruf) muncul utuh sebagai kata di teks penerbit */
  function jurnalLembaga(d, x) {
    const nm = namaLb(x);
    return dlist(d).filter(j => { const pen = " " + nrm(j?.penerbit) + " "; return pen.trim() && nm.some(n => pen.trim() === n || (n.length >= 4 && pen.includes(" " + n + " "))); });
  }
  const proyekLembaga = (d, x) => { const nm = new Set(namaLb(x)); return dlist(d).filter(p => p && [].concat(p.pelaksana, p.donor).some(v => nm.has(nrm(v)))); };
  const usdR = n => { const f = (v, t) => `US$ ${(Math.round(v * 10) / 10).toLocaleString("id-ID")} ${t}`; return n >= 1e9 ? f(n / 1e9, "miliar") : n >= 1e6 ? f(n / 1e6, "juta") : "US$ " + angka(n); };
  const tabelProyek = (a, tampilLembaga) => tabelHtml([["Proyek"], ["Donor"], ["Pelaksana"], ["Sektor", "n"], ["Provinsi", "n"], ["Nilai", "r"], ["Periode", "n"], ["Status"]], a.map(p => { const u = urlOk(p.sumber_url), sk = strs(p.sektor).join(", "), pv = strs(p.prov).map(provT).join(", ");
    return [u ? tautanLuar(u, esc(p.judul)) : esc(p.judul), esc(p.donor || ""), esc(p.pelaksana || ""), `<span title="${esc(sk)}">${esc(sk)}</span>`, `<span title="${esc(pv)}">${esc(pv)}</span>`,
      p.nilai_usd != null ? `${esc(usdR(p.nilai_usd))}<small class="ak-lper"> ${esc(rpRingkas(p.nilai_usd * KURS_USD))}</small>` : "Tidak tercatat", esc([p.mulai, p.selesai].filter(Boolean).map(tglID).join(" sampai ")), esc(kapital(p.status || ""))]; }));
  /* ---- profil lengkap (PRD 6.15): baris berlabel dengan cip domain, bagian bergaris, jaringan, keyakinan, sumber, sebanding ---- */
  const cip = u => { const h = hostDari2(urlOk(u) || ""); return h ? `<a class="ak-cip" href="${esc(urlOk(u))}" ${LUAR}>${esc(h)}</a>` : ""; };
  const barisB = (label, nilai, u, catatan) => nilai ? `<div class="ak-bl2"><span class="ak-bk">${esc(label)}</span><div class="ak-bn"><span>${nilai}${u ? " " + cip(u) : ""}</span>${catatan ? `<small>${esc(catatan)}</small>` : ""}</div></div>` : "";
  const bagB = (judul, isi) => isi ? `<section class="ak-bg"><h3><i class="ak-kotak"></i>${esc(judul)}</h3>${isi}</section>` : "";
  const BUKTI = {resmi: "RESMI", iati: "IATI", berita: "BERITA", "pihak-ketiga": "PIHAK KETIGA"};
  const linkJar = j => `<li><span class="ak-izin ${j.bukti === "resmi" ? "berlaku" : j.bukti === "pihak-ketiga" ? "contoh" : "mitra"}">${esc(BUKTI[j.bukti] || "BUKTI")}</span> <small class="ak-lper">${esc(kapital(j.relasi || ""))}</small> ${j.ke_id && lbMap.has(j.ke_id) ? `<button type="button" class="ak-pk" data-lb="${esc(j.ke_id)}">${esc(lbMap.get(j.ke_id).nama)}</button>` : `<b>${esc(j.ke_nama || "")}</b>`} ${cip(j.sumber_url)}${j.tanggal ? ` <small class="ak-lper">${esc(tglID(j.tanggal))}</small>` : ""}</li>`;
  function jaringanTurunan(x, w3, pd) {
    const nm = new Set(namaLb(x)), cocok = v => nm.has(nrm(v)), a = [];
    const bukaId = n => { const y = lbArr.find(z => namaLb(z).includes(nrm(n))); return y ? {ke_id: y.id} : {ke_nama: n}; };
    if (x.induk && lbMap.has(x.induk)) a.push({relasi: "induk", ke_id: x.induk, bukti: "resmi"});
    (lbCabang.get(x.id) || []).slice(0, 15).forEach(c => a.push({relasi: "cabang", ke_id: c.id, bukti: "resmi"}));
    dlist(w3).forEach(p => { if ([].concat(p.pelaksana).some(cocok) && p.donor) a.push({relasi: "pendana", ...bukaId(p.donor), bukti: "iati", sumber_url: p.sumber_url, tanggal: p.mulai}); if (cocok(p.donor) && p.pelaksana) a.push({relasi: "penerima", ...bukaId(String(p.pelaksana)), bukti: "iati", sumber_url: p.sumber_url, tanggal: p.mulai}); });
    dlist(Array.isArray(pd) ? pd : pd?.pendanaan).forEach(p => { if (p.lembaga_id === x.id || cocok(p.pemberi)) a.push({relasi: "penerima", ke_nama: p.penerima || strs(p.pelaksana).join(", "), bukti: "resmi", sumber_url: p.url, tanggal: p.tahun && String(p.tahun)}); if (cocok(p.penerima) || strs(p.pelaksana).some(cocok)) a.push({relasi: "pendana", ...bukaId(p.pemberi), bukti: "resmi", sumber_url: p.url, tanggal: p.tahun && String(p.tahun)}); });
    return a.filter(j => j.ke_id || j.ke_nama);
  }
  const yakinHtml = y => y && Number.isFinite(y.skor) ? `<div class="ak-yakin"><div class="ak-ybar"><i style="width:${Math.round(y.skor * 100)}%"></i></div><b>${y.skor.toLocaleString("id-ID", {maximumFractionDigits: 2})}</b> <span class="ak-izin ${y.label === "tinggi" ? "berlaku" : y.label === "sedang" ? "habis" : "dicabut"}">${esc(kapital(y.label || ""))}</span><ul class="ak-lsumber">${strs(y.alasan).map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>` : "";
  const RESMI_RE = /\.go\.id|\.ac\.id|\.mil\.id|orcid\.org|sinta\.|wikidata\.org|openalex\.org|scholar\.google/i;
  function yakinOrang(urls, lengkap, tgl) {
    const u = urls.filter(Boolean), porsi = u.length ? u.filter(x => RESMI_RE.test(x)).length / u.length : 0, kel = lengkap.length ? lengkap.filter(a => a[1]).length / lengkap.length : 0;
    const umur = tgl ? (Date.now() - new Date(String(tgl).slice(0, 10)).getTime()) / 864e5 : null, segar = umur == null || isNaN(umur) ? .5 : umur < 183 ? 1 : umur < 365 ? .5 : .2, skor = Math.round((.5 * porsi + .35 * kel + .15 * segar) * 100) / 100;
    return {skor, label: skor >= .7 ? "tinggi" : skor >= .4 ? "sedang" : "rendah", alasan: [`${Math.round(porsi * 100)}% sumber dari laman resmi, institusi, atau katalog ilmiah (${u.length} sumber)`, `Kelengkapan: ${lengkap.filter(a => a[1]).map(a => a[0]).join(", ") || "belum ada"}${lengkap.some(a => !a[1]) ? `; belum ada ${lengkap.filter(a => !a[1]).map(a => a[0]).join(", ")}` : ""}`, tgl ? `Diperiksa ${tglID(tgl)}` : "Tanggal periksa belum tercatat"]};
  }
  const sumberList = urls => { const m = new Map(); urls.forEach(u => { u = urlOk(u); if (u) m.set(u, hostDari2(u)); }); return m.size ? `<ul class="ak-lsumber ak-srcl">${[...m].map(([u, h]) => `<li><b>${esc(h)}</b> <a href="${esc(u)}" ${LUAR}>${esc(u)}</a></li>`).join("")}</ul>` : ""; };
  const sumberUnik = x => { const m = new Map(); [...dlist(x.sumber).map(s => s?.url), x.web, x.pimpinan?.sumber_url, x.izin?.sumber_url, x.mitra_bnpb?.sumber_url, x.sdm?.sumber_url, ...dlist(x.kapasitas).map(k => k?.sumber_url), ...dlist(x.potensi_bantuan).map(k => k?.sumber_url), ...dlist(x.sensor).map(k => k?.sumber_url)].forEach(u => { u = urlOk(u); if (u) m.set(u, hostDari2(u)); }); return [...m]; };
  const sumberHtml = x => { const a = sumberUnik(x); return a.length ? `<ul class="ak-lsumber ak-srcl">${a.map(([u, h]) => `<li><b>${esc(h)}</b> <a href="${esc(u)}" ${LUAR}>${esc(u)}</a></li>`).join("")}</ul>` : ""; };
  const koreksiBtn = (jenis, id) => `<button type="button" class="ak-rbtn ak-rbtn-b" data-kor="${esc(jenis + ":" + id)}">Laporkan koreksi</button>`;
  const formKor = (jenis, id) => `<form class="ak-kor" data-korf="${esc(jenis + ":" + id)}"><label>Butir yang salah<input name="butir" required maxlength="60" placeholder="Contoh: telepon"></label><label>Isi yang benar<input name="isi" required maxlength="400"></label><label>Tautan sumber (https)<input name="sumber_url" type="url" maxlength="400" placeholder="https://"></label><div class="ak-pil"><button type="submit" class="ak-rbtn ak-rbtn-b">Kirim</button><span class="ak-lper" role="status"></span></div></form>`;
  async function kirimKoreksi(f) {
    const [jenis, ...r] = f.dataset.korf.split(":"), id = r.join(":"), st2 = f.querySelector("[role=status]"), v = Object.fromEntries(new FormData(f)); st2.textContent = "Mengirim";
    try { const res = await fetch("/api/akademisi/koreksi", {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify({jenis, id, butir: v.butir, isi: v.isi, sumber_url: v.sumber_url || ""})});
      st2.textContent = res.ok ? "Terkirim ke antrean admin, terima kasih" : ((await res.json().catch(() => ({}))).galat || `Gagal (${res.status})`); if (res.ok) f.reset(); } catch (e) { st2.textContent = "Gagal terkirim. Periksa koneksi."; }
  }
  /* rakitan profil dipakai dua wadah: lembar bawah (daftar) dan panel kanan (peta) */
  function rakitLb(x, panel) {
    const lok = kabProv(x), web = urlOk(x.web), induk = x.induk && lbMap.get(x.induk), pre = panel ? "akDr" : "akLb";
    const ps = x.pimpinan, z = x.izin, mb = x.mitra_bnpb, bid = strs(x.bidang), kon = kontakLb(x, true) + medsosPasang(x), sb = sumberButir(x, "web")?.url || x.web;
    const ring = ["Menurut Direktori Kebencanaan" + (x.diperiksa ? ` (diperbarui ${tglID(x.diperiksa)})` : ""), `, ${x.nama}`, x.didirikan ? ` didirikan pada ${x.didirikan}` : "", ps?.nama ? `, dipimpin ${ps.nama}${ps.jabatan ? " (" + ps.jabatan + ")" : ""}` : "", lok ? `, berkantor di ${lok}` : "", bid.length ? `, bergerak di bidang ${bid.slice(0, 5).join(", ")}` : "", "."].join("");
    const kepala = `<div class="ak-dkepala"><div class="ak-dk-atas">${logoLb(x)}<div class="ak-nama"><h2 id="${panel ? "akDrNama" : "akSJudul"}">${esc(x.nama)}</h2><p>${esc([x.badan_hukum, x.singkatan].filter(Boolean).join(", "))}</p></div></div>
      <div class="ak-pil">${pilKat(x.kategori)}${x.sub ? `<span class="ak-ptl">${esc(kapital(x.sub))}</span>` : ""}${x.prov ? `<span class="ak-ptl">${esc(provT(x.prov))}</span>` : ""}${x._rankK ? `<span class="ak-ptl" title="Peringkat kelengkapan data di kategorinya">#${angka(x._rankK)} dari ${angka(x._nK)}</span>` : ""}${pilIzin(x)}${pilMitra(x)}${pilContoh(x)}</div>
      <p class="ak-rata ak-ringk">${esc(ring)}</p>
      <div class="ak-pil">${web ? `<a class="ak-rbtn" href="${esc(web)}" ${LUAR}>${ikon(IK_LUAR, "currentColor")}Kunjungi situs</a>` : ""}${dplTombol(x.id)}${koreksiBtn("lembaga", x.id)}</div><div id="${pre}Kor" class="ak-korw"></div></div>`;
    const tubuh = () => `<div class="ak-bgrup">`
      + barisB("Pimpinan", ps?.nama ? `<b>${esc(ps.nama)}</b>` : "", ps?.sumber_url, ps?.jabatan)
      + barisB("Didirikan", x.didirikan ? `<b>${esc(x.didirikan)}</b>` : "", sumberButir(x, "didirikan")?.url)
      + barisB("Badan hukum dan izin", x.badan_hukum || z ? `<b>${esc(x.badan_hukum || "")}</b> ${z ? pilIzin(x) : ""}` : "", z?.sumber_url, z ? [z.jenis, z.nomor && "nomor " + z.nomor, z.berlaku_sampai && "berlaku sampai " + tglID(z.berlaku_sampai)].filter(Boolean).join(", ") : "")
      + barisB("Mitra BNPB", mb?.bukti ? `<b>${esc(mb.bukti)}</b>` : "", mb?.sumber_url, mb?.tahun ? String(mb.tahun) : "")
      + barisB("SDM", x.sdm?.jumlah != null ? `<b>${esc(angka(x.sdm.jumlah))}</b> ${esc(x.sdm.jenis || "")}` : "", x.sdm?.sumber_url, x.sdm?.tanggal ? "Dibaca " + tglID(x.sdm.tanggal) : "")
      + dlist(x.kapasitas).map((k, i) => barisB(i ? "" : "Kapasitas", esc(k.teks || ""), k.sumber_url)).join("")
      + barisB("Wilayah kerja", `<b>${esc([SKALA_L[x._skala] || kapital(x.skala || ""), lok].filter(Boolean).join(", "))}</b>`, "")
      + `<div class="ak-bl2"><span class="ak-bk">Kontak</span><div class="ak-bn">${kon ? `<div class="ak-lkontak">${kon}</div>` : `<b>belum ada kontak bersumber</b> ${koreksiBtn("lembaga", x.id)}`}</div></div></div>`
      + `<div id="${pre}Jar"></div>`
      + bagB("Rekam jejak bencana", dlist(x.potensi_bantuan).length ? `<ul class="ak-lsumber">${dlist(x.potensi_bantuan).map(pb => `<li>${esc(pb.teks || "")}${pb.kejadian || pb.tahun ? ` <small class="ak-lper">${esc([pb.kejadian, pb.tahun].filter(Boolean).join(", "))}</small>` : ""} ${pb.otomatis ? '<span class="ak-izin contoh">Dicocokkan otomatis dari berita</span>' : ""} ${cip(pb.sumber_url)}</li>`).join("")}</ul>` : "")
      + bagB("Bidang", bid.length || strs(x.rumpun).length ? `<div class="ak-pil">${bid.map(b => `<span class="ak-prodi">${esc(kapital(b))}</span>`).join("")}${strs(x.rumpun).map(r => pilRumpun(r)).join("")}</div>` : "")
      + (dlist(x.sensor).length ? bagB("Sensor", tabelHtml([["Jenis"], ["Jumlah", "r"], ["Cakupan"], ["Data terbuka"], ["Sumber"]], dlist(x.sensor).map(sn => [esc(kapital(sn.jenis || "")), sn.jumlah != null ? angka(sn.jumlah) : "-", esc(sn.cakupan || ""), sn.data_terbuka ? (urlOk(sn.portal_url) ? tautanLuar(urlOk(sn.portal_url), "Ya, portal") : "Ya") : "Tidak", cip(sn.sumber_url)]))) : "")
      + (dlist(x.inovasi_produk).length ? bagB("Inovasi", `<div class="ak-psgrid">${dlist(x.inovasi_produk).map(pr => `<article class="ak-psk"><h4>${esc(pr.nama || "")}</h4>${pr.uraian ? `<p class="ak-rata">${esc(pr.uraian)}</p>` : ""}<div class="ak-pil">${strs(pr.rumpun).map(r => pilRumpun(r)).join("")}${pr.tahun ? `<span class="ak-prodi">${esc(pr.tahun)}</span>` : ""}${cip(pr.sumber_url)}</div></article>`).join("")}</div>`) : "")
      + `<div id="${pre}Sd"></div><div id="${pre}Dana"></div><div id="${pre}Proy"></div><div id="${pre}Jur"></div>`
      + bagB("Kantor pusat", x.alamat || Number.isFinite(x.lat) ? `<p>${esc(x.alamat || lok)}${Number.isFinite(x.lat) && Number.isFinite(x.lon) ? ` <a class="ak-lsum" href="https://www.google.com/maps/search/?api=1&query=${x.lat},${x.lon}" ${LUAR}>Lihat di peta</a>` : ""} ${cip(sumberButir(x, "alamat")?.url)}</p>${x.lokasi_sumber ? `<small class="ak-lper">Titik peta ditentukan dari ${esc(x.lokasi_sumber)}</small>` : ""}` : "")
      + `<div id="${pre}Brt"></div>`
      + bagB("Seberapa yakin kita", yakinHtml(x.yakin))
      + bagB("Sumber", sumberHtml(x) + lbPeriksa(x))
      + bagB("Lembaga sejenis", (() => { const sama = y => y.id !== x.id && y.kategori === x.kategori, tier = y => (!x.sub || String(y.sub || "").toLowerCase() === String(x.sub).toLowerCase() ? 0 : 2) + (x.prov && y.prov === x.prov ? 0 : 1);
        const a = lbArr.filter(sama).sort((p, q) => tier(p) - tier(q) || q._skor - p._skor).slice(0, 8);
        return a.length ? `<ol class="ak-sdaftar">${a.map(y => `<li><button type="button" class="ak-sbuka" data-lb="${esc(y.id)}">${logoLb(y)}<span><b>${esc(y.nama)}</b><small>${esc([y.prov ? provT(y.prov) : "Nasional", y._rankK ? `#${y._rankK} dari ${y._nK} kelengkapan` : ""].filter(Boolean).join(", "))}</small></span></button></li>`).join("")}</ol>` : ""; })());
    const isiAsync = cek => {
      ambilData("berita").then(d => { const h = brtHtml("lembaga", x.id, d); if (h) isiNanti(cek, pre + "Brt", h); });
      Promise.all([ambilData("lembaga_3w"), ambilData("pendanaan")]).then(([w3, pd]) => { const a = x.jaringan?.length ? x.jaringan : jaringanTurunan(x, w3, pd); if (!a.length) return;
        const grup = ["induk", "cabang", "anggota", "mitra", "pendana", "penerima"].map(r => [r, a.filter(j => j.relasi === r)]).filter(g => g[1].length);
        isiNanti(cek, pre + "Jar", bagB("Jaringan", grup.map(([r, l]) => `<h4 class="ak-lh">${esc(kapital(r))} <small>${angka(l.length)}</small></h4><ul class="ak-lsumber ak-jar">${l.slice(0, 12).map(linkJar).join("")}</ul>`).join(""))); });
      ambilData("lembaga_3w").then(d => { const a = Array.isArray(d) ? proyekLembaga(d, x) : []; if (a.length) isiNanti(cek, pre + "Proy", bagB(`Proyek mitra (3W) ${angka(a.length)}`, `${tabelProyek(a.slice(0, 20))}<span class="ak-tanda">Data dilaporkan donor ke IATI, bisa tidak lengkap</span>`)); });
      ambilData("pendanaan").then(d => { const a = dlist(Array.isArray(d) ? d : d?.pendanaan).filter(y => y.lembaga_id === x.id); if (a.length) isiNanti(cek, pre + "Dana", bagB(`Pendanaan ${angka(a.length)}`, `<ul class="ak-lsumber">${a.slice(0, 10).map(y => `<li><b>${esc(y.nama)}</b> <small class="ak-lper">${esc([kapital(y.jenis || ""), y.jenis_entri].filter(Boolean).join(", "))}</small> ${cip(y.url)}</li>`).join("")}</ul>`)); });
      ambilData("sistem_data").then(d => { const a = dlist(Array.isArray(d) ? d : d?.sistem).filter(y => y.lembaga_id === x.id); if (a.length) isiNanti(cek, pre + "Sd", bagB(`Sistem data ${angka(a.length)}`, `<div class="ak-pil">${a.map(y => `<span class="ak-prodi">${esc(y.nama)}</span>`).join("")}</div>`)); });
      ambilData("jurnal").then(d => { const a = Array.isArray(d) ? jurnalLembaga(d, x) : []; if (a.length) isiNanti(cek, pre + "Jur", bagB(`Jurnal terbitan ${x.singkatan || x.nama} ${angka(a.length)}`, `<div class="ak-jgrid">${a.map(kartuJur).join("")}</div>`)); });
    };
    return {kepala, tubuh, isiAsync};
  }
  function bukaLb(x) {
    const r = rakitLb(x, false); bukaSheet("lembaga", r.kepala, r.tubuh); $("akSheet").dataset.k = ""; const tk = tokenS; r.isiAsync(() => tk === tokenS);
  }
  let drTok = 0;
  function bukaDrawer(x) {
    const r = rakitLb(x, true), d = $("akDrawer"), tk = ++drTok; d.hidden = false;
    $("akDrIsi").innerHTML = r.kepala + '<div class="ak-dtubuh" id="akDrTubuh"><div class="ak-hantu"></div></div>'; d.scrollTop = 0;
    nanti(() => { if (tk === drTok) { $("akDrTubuh").innerHTML = r.tubuh(); r.isiAsync(() => tk === drTok && !d.hidden); } });
  }
  const tutupDrawerAman = () => { const d = $("akDrawer"); if (d) tutupDrawer(); };
  const tutupDrawer = () => { drTok++; $("akDrawer").hidden = true; };

  /* ---- analisa (L42): peta di atas indeks risiko provinsi, kesenjangan wilayah, matriks provinsi x bidang, komposisi ---- */
  let risikoP = null, geoP = null;
  const ambilJson = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
  const kelasWarna = ["#fff3bf", "#ffd43b", "#f76707", "#c92a2a"];
  function statProv(rk) {
    const ip = rk.kolom.indexOf("prov"), ir = rk.kolom.indexOf("risiko"), id = rk.kolom.indexOf("pend"), m = new Map();
    for (const r of rk.kec) { const e = m.get(r[ip]) || {s: 0, n: 0, pend: 0, kec: 0}; e.kec++; e.pend += r[id] || 0; if (r[ir] != null) { e.s += r[ir]; e.n++; } m.set(r[ip], e); }
    for (const e of m.values()) e.risiko = e.n ? e.s / e.n : null;
    return m;
  }
  const kelasIdx = (v, amb) => v == null ? -1 : amb.filter(a => v >= a).length;
  const kartuA = (pil, w, judul, isi, sumber) => `<section class="ak-panel ak-lA"><div class="ak-pil"><span class="ak-r utama" style="--w0:${w}">${pil}</span></div><h2 class="ak-judulv">${judul}</h2>${isi}<p class="ak-lkaki">Sumber: ${sumber}</p></section>`;
  const ttA = (t, v, k, c) => `data-tt="${esc(t)}" data-tv="${esc(v)}" data-tk="${esc(k || "")}" data-tc="${esc(c || "")}"`;
  function peringkat(a, q) { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) * q)] : null; }
  function petaSvg(geo, prov, amb, titik) {
    const X0 = 94.8, Y0 = 6.3, K = 20, W = Math.round(46.5 * K), H = Math.round(17.6 * K), pt = (lo, la) => `${((lo - X0) * K).toFixed(1)},${((Y0 - la) * K).toFixed(1)}`;
    const ring = r => "M" + r.map(c => pt(c[0], c[1])).join("L") + "Z";
    const ps = geo.features.map(f => { const kode = String(f.properties.kode), g = f.geometry, polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates, e = prov.get(kode), ki = kelasIdx(e?.risiko, amb);
      return `<path class="ak-pv" tabindex="0" data-p="${esc(kode)}" fill="${ki < 0 ? "#dfe3e8" : kelasWarna[ki]}" d="${polys.map(p => p.map(ring).join("")).join("")}"/>`; }).join("");
    const ds = titik.map(x => `<circle class="ak-pt" data-id="${esc(x.id)}" cx="${((x.lon - X0) * K).toFixed(1)}" cy="${((Y0 - x.lat) * K).toFixed(1)}" r="2.6"/>`).join("");
    return `<svg class="ak-peta" viewBox="0 0 ${W} ${H}" role="img" aria-label="Peta sebaran lembaga di atas indeks risiko provinsi">${ps}${ds}</svg>`;
  }
  function renderAnalisa(el, rk, geo) {
    const L = lbArr.filter(x => x.kategori !== "penerbit"), amb = rk?.ambang || [15, 35, 60], kls = rk?.kelas || ["Rendah", "Sedang", "Tinggi", "Sangat tinggi"];
    const prov = rk ? statProv(rk) : new Map(), kodeProv = Object.keys(PROV).filter(k => !rk || prov.has(k)), perProv = {}, perBid = {};
    L.forEach(x => { if (x.prov) { perProv[x.prov] = (perProv[x.prov] || 0) + 1; strs(x.bidang).forEach(b => { (perBid[x.prov] ||= {})[b] = (perBid[x.prov][b] || 0) + 1; }); } });
    const lembagaTgl = waktuMaks(L), tL = lembagaTgl ? `direktori lembaga mitra, diperiksa sampai ${tglID(lembagaTgl)}` : "direktori lembaga mitra", tR = rk ? `indeks risiko kecamatan Centurisk97 (${esc(rk.label || "indeks komposit")}, data ${esc(tglID(rk.hari))}), dirata-ratakan per provinsi` : "";
    const bagian = [];
    /* 1. peta */
    const titik = L.filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lon)), nProv = new Set(L.map(x => x.prov).filter(Boolean)).size;
    bagian.push(kartuA("Peta sebaran", "#1c7ed6", `<b>${angka(L.length)}</b> lembaga tersebar di <b>${angka(nProv)}</b> provinsi, ${angka(titik.length)} bertitik peta`,
      geo && rk ? `<div class="ak-petaw">${petaSvg(geo, prov, amb, titik)}</div><div class="ak-pil ak-legenda">${kls.map((k, i) => `<span class="ak-r"><i class="ak-sw" style="background:${kelasWarna[i]}"></i>${esc(k)}${i === 0 ? ` (di bawah ${amb[0]})` : i < amb.length ? ` (${amb[i - 1]} sampai ${amb[i]})` : ` (${amb[amb.length - 1]} ke atas)`}</span>`).join("")}<span class="ak-r"><i class="ak-sw titik"></i>Lembaga</span></div>`
        : `<p class="ak-khampa">Peta tidak bisa dimuat. Coba lagi nanti.</p>`, `${tR || "indeks risiko tidak tersedia"}; batas provinsi BPS; ${tL}`));
    /* 2. kesenjangan wilayah */
    const dgn = kodeProv.filter(k => prov.get(k)?.risiko != null);
    if (rk && dgn.length) {
      const med = peringkat(dgn.map(k => prov.get(k).risiko), .5), tinggi = dgn.filter(k => prov.get(k).risiko >= med);
      const baris = tinggi.map(k => { const e = prov.get(k), n = perProv[k] || 0, pj = n / (e.pend / 1e6); return {k, e, n, pj}; }).sort((a, b) => a.pj - b.pj || b.e.risiko - a.e.risiko);
      const q1 = peringkat(baris.map(b => b.pj), .25), rawan = baris.filter(b => b.pj <= q1);
      bagian.push(kartuA("Kesenjangan wilayah", "#e03131", `<b>${angka(rawan.length)}</b> dari ${angka(baris.length)} provinsi berisiko tinggi tergolong rawan, mitra sedikit`,
        `<div class="ak-pil"><span class="ak-izin dicabut">Rawan, mitra sedikit</span><span class="ak-prodi">Berisiko tinggi: indeks rata-rata ${esc(angka(Math.round(med * 10) / 10))} atau lebih (median nasional ${angka(dgn.length)} provinsi)</span><span class="ak-prodi">Ambang: ${esc(q1.toLocaleString("id-ID", {maximumFractionDigits: 1}))} lembaga per juta penduduk atau kurang (kuartil bawah)</span></div>`
        + tabelHtml([["Provinsi"], ["Indeks risiko", "r"], ["Penduduk (juta)", "r"], ["Lembaga di provinsi", "r"], ["Per juta penduduk", "r"], ["Status"]], baris.map(b => [esc(provT(b.k)), `<span class="ak-r" ${ttA(provT(b.k), "Indeks " + angka(Math.round(b.e.risiko * 10) / 10), kls[kelasIdx(b.e.risiko, amb)], "")}>${esc(angka(Math.round(b.e.risiko * 10) / 10))}</span>`,
          esc((b.e.pend / 1e6).toLocaleString("id-ID", {maximumFractionDigits: 1})), angka(b.n), esc(b.pj.toLocaleString("id-ID", {maximumFractionDigits: 1})), b.pj <= q1 ? '<span class="ak-izin dicabut">Rawan, mitra sedikit</span>' : '<span class="ak-izin berlaku">Cukup</span>'])),
        `${tR}; jumlah penduduk WorldPop per kecamatan dijumlahkan per provinsi; ${tL}. Hanya lembaga yang bermarkas di provinsi, lembaga nasional dan internasional tidak dihitung`));
    }
    /* 3. matriks provinsi x bidang */
    const urutP = Object.keys(PROV).sort((a, b) => (prov.get(b)?.risiko ?? -1) - (prov.get(a)?.risiko ?? -1) || provT(a).localeCompare(provT(b), "id")), sel = urutP.length * BIDANG.length;
    const kosongB = BIDANG.map(b => [b, urutP.filter(k => !(perBid[k]?.[b])).length]), kosong = kosongB.reduce((s, [, n]) => s + n, 0), mx = Math.max(1, ...urutP.flatMap(k => BIDANG.map(b => perBid[k]?.[b] || 0)));
    bagian.push(kartuA("Kesenjangan bidang", "#862e9c", `<b>${angka(kosong)}</b> dari ${angka(sel)} sel provinsi dan bidang masih kosong`,
      `<div class="ak-pil">${kosongB.slice().sort((a, b) => b[1] - a[1]).slice(0, 4).map(([b, n]) => `<span class="ak-izin habis">${esc(kapital(b))}: ${angka(n)} provinsi kosong</span>`).join("")}</div>
       <div class="ak-tw"><table class="ak-t2 ak-matriks"><thead><tr><th>Provinsi</th>${BIDANG.map(b => `<th class="c" title="${esc(kapital(b))}"><span>${esc(kapital(b))}</span></th>`).join("")}</tr></thead>
       <tbody>${urutP.map(k => `<tr><td>${esc(provT(k))}</td>${BIDANG.map(b => { const n = perBid[k]?.[b] || 0;
         return `<td class="c ak-mx${n ? "" : " kosong"}" ${n ? `style="--m:${Math.round(18 + n / mx * 62)}%"` : ""} ${ttA(provT(k), `${angka(n)} lembaga`, kapital(b) + (n ? "" : ", belum ada"), n ? "#1c7ed6" : "#c92a2a")}>${n ? angka(n) : "0"}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>`,
      `${tL}. Bidang hanya dihitung bila laman lembaganya menyebutnya; lembaga nasional dan internasional tidak dihitung${rk ? `. Provinsi diurutkan dari indeks risiko tertinggi (${tR})` : ""}`));
    /* 4. komposisi */
    const kat = Object.entries(hitungLbL(L, x => x.kategori)).sort((a, b) => b[1] - a[1]), skl = Object.entries(hitungLbL(L, x => x._skala)).sort((a, b) => b[1] - a[1]);
    const bar = (rows, lab, warna) => { const m = Math.max(1, ...rows.map(r => r[1])); return `<div class="ak-bars">${rows.map(([k, n]) => { const [l, d, w] = warna(k);
      return `<div class="ak-br" tabindex="0" ${ttA(l, `${angka(n)} lembaga`, `${(n / L.length * 100).toLocaleString("id-ID", {maximumFractionDigits: 1})}% dari ${angka(L.length)} lembaga`, w)} style="--w0:${w}"><span class="ak-bl">${d ? ikon(d, w) : ""}${esc(l)}</span><span class="ak-bt"><i style="width:${Math.max(8, n / m * 100)}%"><b>${angka(n)}</b></i></span></div>`; }).join("")}</div>`; };
    bagian.push(kartuA("Komposisi", "#2f9e44", `<b>${angka(L.length)}</b> lembaga dalam <b>${angka(kat.length)}</b> kategori`,
      `<div class="ak-komp"><div><h3 class="ak-lh">Per kategori</h3>${bar(kat, null, k => KAT[k] || [k, "", "#6b7280"])}</div><div><h3 class="ak-lh">Per skala</h3>${bar(skl, null, k => [SKALA_L[k] || kapital(k), "", "#1c7ed6"])}</div></div>`, tL));
    el.innerHTML = bagian.join("");
    const tip = $("akTip"), tampilTip = e => { const t = e.target.closest?.("[data-tt]"), pv = e.target.closest?.(".ak-pv"), pt = e.target.closest?.(".ak-pt"); let h = "";
      if (t) h = `<b>${esc(t.dataset.tt)}</b><span>${t.dataset.tc ? `<i style="background:${esc(t.dataset.tc)}"></i>` : ""}${esc(t.dataset.tv)}</span>${t.dataset.tk ? `<small>${esc(t.dataset.tk)}</small>` : ""}`;
      else if (pt) { const x = lbMap.get(pt.dataset.id); if (x) h = `<b>${esc(KAT[x.kategori]?.[0] || x.kategori)}</b><span>${esc(x.singkatan || x.nama)}</span><small>${esc(kabProv(x) || x.nama)}</small>`; }
      else if (pv) { const k = pv.dataset.p, e2 = prov.get(k), n = perProv[k] || 0; h = `<b>${esc(provT(k))}</b><span><i style="background:${pv.getAttribute("fill")}"></i>${e2?.risiko != null ? "Indeks " + angka(Math.round(e2.risiko * 10) / 10) : "Indeks tidak tersedia"}</span><small>${esc(e2?.risiko != null ? kls[kelasIdx(e2.risiko, amb)] + ", " : "")}${angka(n)} lembaga${e2 ? `, ${(n / (e2.pend / 1e6)).toLocaleString("id-ID", {maximumFractionDigits: 1})} per juta penduduk` : ""}</small>`; }
      if (!h) { tip.hidden = true; return; }
      tip.innerHTML = h; tip.hidden = false; const r = (t || pv || pt).getBoundingClientRect(), x = e.clientX ?? r.left + 40, y = e.clientY ?? r.top;
      tip.style.left = Math.min(Math.max(8, x + 12), innerWidth - tip.offsetWidth - 8) + "px"; tip.style.top = Math.max(8, y - tip.offsetHeight - 12) + "px"; };
    el.addEventListener("pointermove", tampilTip); el.addEventListener("pointerleave", () => { tip.hidden = true; });
    el.addEventListener("focusin", e => tampilTip(e)); el.addEventListener("focusout", () => { tip.hidden = true; });
  }
  const hitungLbL = (L, f) => { const n = {}; L.forEach(x => { const k = f(x); if (k) n[k] = (n[k] || 0) + 1; }); return n; };
  let analisaSiap = false;
  function bangunAnalisa(el) {
    if (analisaSiap) return; analisaSiap = true; el.innerHTML = hantuHtml + hantuHtml;
    Promise.all([risikoP ||= ambilJson("/banjir/data/risiko_kecamatan.json"), geoP ||= ambilJson("/geo/provinsi.json")]).then(([rk, geo]) => nanti(() => {
      const rkOk = rk && Array.isArray(rk.kec) && Array.isArray(rk.kolom) ? rk : null; if (!rkOk) risikoP = null; if (!geo?.features) geoP = null;
      renderAnalisa(el, rkOk, geo?.features ? geo : null); }));
  }

  /* ---- proyek mitra / 3W (L43) ---- */
  const PJ = {q: "", prov: "", donor: "", sektor: "", hal: 1}, PJPER = 25;
  let pjArr = [], pjHasil = [], pjSiap = false, pjtok = 0;
  function gambarPj(gulir) {
    pjHasil = pjArr.filter(p => (!PJ.prov || strs(p.prov).includes(PJ.prov)) && (!PJ.donor || p.donor === PJ.donor) && (!PJ.sektor || strs(p.sektor).includes(PJ.sektor)) && (!PJ.q || p._cari.includes(PJ.q.toLowerCase())));
    const n = pjHasil.length, a = (PJ.hal - 1) * PJPER, total = pjHasil.reduce((s, p) => s + (Number(p.nilai_usd) || 0), 0);
    $("akPjJ").innerHTML = `<b>${angka(n)}</b> proyek mitra${PJ.prov ? ` di ${esc(provT(PJ.prov))}` : ""}, nilai <b>${esc(usdR(total))}</b><em class="ak-tanda">Data dilaporkan donor ke IATI, bisa tidak lengkap</em><em class="ak-tanda">Rupiah dengan kurs Rp${angka(KURS_USD)} per US$ (asumsi tampilan)</em>`;
    $("akPjL").innerHTML = n ? tabelProyek(pjHasil.slice(a, a + PJPER)) : `<p class="ak-khampa">Tidak ada proyek yang cocok.</p>`;
    $("akPjH").innerHTML = navHal(PJ.hal, n, PJPER, "proyek");
    if (gulir) gulirKe("akPjJ");
  }
  function bangunProyek(el) {
    if (pjSiap) return; pjSiap = true; el.innerHTML = hantuHtml;
    ambilData("lembaga_3w").then(d => nanti(() => {
      if (!Array.isArray(d) || !d.length) { pjSiap = false; el.innerHTML = kosongHtml("Proyek mitra"); return; }
      pjArr = d.filter(p => p && p.judul).map(p => Object.assign(p, {_cari: [p.judul, p.donor, p.pelaksana, ...strs(p.sektor)].filter(Boolean).join(" ").toLowerCase()})).sort((a, b) => (b.nilai_usd || 0) - (a.nilai_usd || 0));
      const hit = f => { const n = {}; pjArr.forEach(p => { for (const k of [].concat(f(p))) if (k) n[k] = (n[k] || 0) + 1; }); return n; }, nP = hit(p => strs(p.prov)), nD = hit(p => p.donor), nS = hit(p => strs(p.sektor));
      el.innerHTML = `<div class="ak-saring"><div class="ak-alat">${cariKotak("akPjQ", "Cari judul, donor, pelaksana, atau sektor")}</div>
        <div class="ak-baris ak-baris3">${htmlPilih("akPjP", IKON_PIN, "Cari provinsi")}${htmlPilih("akPjD", IK_UANG, "Cari donor")}${htmlPilih("akPjS", IKL.jenis, "Cari sektor")}</div></div>
        <div class="ak-hasil"><h2 class="ak-judulv" id="akPjJ"></h2><div id="akPjL"></div><nav id="akPjH" class="ak-hal" aria-label="Halaman daftar proyek" aria-live="polite"></nav></div>`;
      const jalan = () => { const t = ++pjtok; nanti(() => { if (t === pjtok) gambarPj(false); }); }, ubah = (k, v) => { PJ[k] = v; PJ.hal = 1; jalan(); };
      pasangPilih("akPjP", {semua: "Semua provinsi", nilai: () => PJ.prov, opsi: () => Object.entries(nP).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, provT(v), c]), pilih: v => ubah("prov", v)});
      pasangPilih("akPjD", {semua: "Semua donor", nilai: () => PJ.donor, opsi: () => Object.entries(nD).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, v, c]), pilih: v => ubah("donor", v)});
      pasangPilih("akPjS", {semua: "Semua sektor", nilai: () => PJ.sektor, opsi: () => Object.entries(nS).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, kapital(v), c]), pilih: v => ubah("sektor", v)});
      let tt = 0; $("akPjQ").addEventListener("input", e => { clearTimeout(tt); tt = setTimeout(() => ubah("q", e.target.value.trim()), 250); });
      pasangHal("akPjH", h => { PJ.hal = h; gambarPj(true); });
      gambarPj(false); }));
  }

  /* ---- peta berlogo (L4P, PRD 6.1a): MapLibre dimuat malas; pin logo = marker HTML terbatas per viewport (decluttering), sisanya titik di circle layer ---- */
  LIB.maplibre = ["https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.js", () => window.maplibregl];
  const MAP_CSS = "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.css";
  const PULAU = {"Sumatera": ["11", "12", "13", "14", "15", "16", "17", "18", "19", "21"], "Jawa-Bali": ["31", "32", "33", "34", "35", "36", "51"], "Kalimantan": ["61", "62", "63", "64", "65"],
    "Sulawesi": ["71", "72", "73", "74", "75", "76"], "Nusa Tenggara": ["52", "53"], "Maluku-Papua": ["81", "82", "91", "92", "93", "94", "95", "96"]};
  const WARNA_SENSOR = {seismik: "#e8590c", pasut: "#0b7285", gnss: "#5f3dc4", cuaca: "#4263eb", hidrologi: "#1c7ed6", "gunung api": "#c92a2a", buoy: "#1098ad", satelit: "#495057"};
  const BIRU = ["#e7f1ff", "#a5d8ff", "#4dabf7", "#1c7ed6", "#0b3d91"], MERAH = ["#fff0f0", "#ffc9c9", "#ff8787", "#f03e3e", "#a61e1e"];
  const PT = {map: null, mode: "pin", kat: "", sens: "", lapis: {lembaga: true, kampus: true, pusat: false, sensor: false}, pulau: "", tingkat: "prov", ukuran: "jumlah", pins: new Map(), geoProv: null, kabCache: {}, pusatArr: [], sensorArr: [], items: [], itemsCho: [], siap: false};
  const bbox = f => { let a = 180, b = 90, c = -180, d = -90; const w = g => { if (typeof g[0] === "number") { a = Math.min(a, g[0]); c = Math.max(c, g[0]); b = Math.min(b, g[1]); d = Math.max(d, g[1]); } else g.forEach(w); }; w(f.geometry.coordinates); return [a, b, c, d]; };
  const kunciKab = n => { n = String(n || ""); return (/^kota\b/i.test(n) ? "K:" : "") + nrm(n.replace(/^(kabupaten|kab\.?|kota|administrasi)\s+/i, "")); };
  const bobot = x => (x._skala === "nasional" || x._skala === "internasional" ? 3 : 0) + (lbCabang.get(x.id)?.length || 0) * .5 + (x._skor || 0) * .4 + (urlOk(x.logo) ? 2 : 0);
  const adaKontak = x => strs(x.telepon).length + strs(x.wa).length + strs(x.email).length > 0;
  function itemPeta() {
    const L = [];
    if (PT.lapis.lembaga) for (const x of lbArr) if (x.kategori !== "penerbit" && (!PT.kat || x.kategori === PT.kat) && Number.isFinite(x.lat) && Number.isFinite(x.lon))
      L.push({key: "l:" + x.id, jenis: "lembaga", lat: x.lat, lon: x.lon, nama: x.singkatan || x.nama, tip: x.nama, sub: KAT[x.kategori]?.[0] || x.kategori, logo: urlOk(x.logo), warna: (KAT[x.kategori] || [])[2] || "#6b7280", redup: !!GL.r && x._rum.size > 0 && !x._rum.has(GL.r), w: bobot(x), buka: () => bukaDrawer(x)});
    if (PT.lapis.kampus) for (const [k, v] of Object.entries(kampusInfo)) if (Number.isFinite(v?.lat) && Number.isFinite(v?.lon))
      L.push({key: "k:" + k, jenis: "kampus", lat: v.lat, lon: v.lon, nama: k, tip: k, sub: "Kampus", logo: urlOk(logoK[k]), warna: "#14284b", w: 1 + (perK[k] || 0) / 8, buka: () => profilKampus(k)});
    if (PT.lapis.pusat) PT.pusatArr.forEach((x, i) => { const v = kampusInfo[x.induk]; if (Number.isFinite(v?.lat)) L.push({key: "p:" + i, jenis: "pusat", lat: v.lat + (i % 5) * .004, lon: v.lon + (i % 7) * .004, nama: x.singkatan || x.nama, tip: x.nama, sub: "Pusat studi", logo: urlOk(logoK[x.induk]), warna: "#2b8a3e", w: .5, buka: () => profilKampus(x.induk)}); });
    return L;
  }
  const geoPts = a => ({type: "FeatureCollection", features: a.map(i => ({type: "Feature", properties: {key: i.key, warna: i.warna, op: i.redup ? .2 : 1}, geometry: {type: "Point", coordinates: [i.lon, i.lat]}}))});
  const geoSens = () => ({type: "FeatureCollection", features: PT.sensorArr.filter(s => (!PT.sens || s.jenis === PT.sens) && Number.isFinite(s.lat) && Number.isFinite(s.lon)).map(s => ({type: "Feature", properties: {id: s.id, nama: s.nama, jenis: s.jenis, jaringan: s.jaringan || "", pemilik: s.pemilik || "", warna: WARNA_SENSOR[s.jenis] || "#6b7280"}, geometry: {type: "Point", coordinates: [s.lon, s.lat]}}))});
  const elPin = i => { const b = document.createElement("button"); b.type = "button"; b.className = "ak-pin" + (i.redup ? " redup" : ""); b.title = i.tip;
    b.innerHTML = `<span class="ak-pinlogo" style="--w0:${esc(i.warna)}">${i.logo ? `<img src="${esc(i.logo)}" alt="" referrerpolicy="no-referrer" loading="lazy" data-inisial="${esc(inisial(i.nama))}">` : esc(inisial(i.nama))}</span>${i.label === false ? "" : `<span class="ak-pinlabel">${esc(i.nama)}</span>`}`;
    b.addEventListener("click", e => { e.stopPropagation(); i.buka(); }); return b; };
  /* decluttering: urut bobot, tolak pin yang kotaknya menimpa pin terpilih; batas jumlah menurut zoom */
  function gambarPin() {
    const m = PT.map; if (!m || !PT.siap) return;
    const src = PT.mode === "cho" ? PT.itemsCho : PT.items, b = m.getBounds(), cap = Math.min(90, Math.round(10 + (m.getZoom() - 3) * 9)), kotak = [], pilih = [];
    for (const i of src.filter(i => b.contains([i.lon, i.lat])).sort((a, c) => c.w - a.w)) {
      if (pilih.length >= cap) break; const p = m.project([i.lon, i.lat]), w = i.label === false ? 40 : 40 + Math.min(String(i.nama).length, 22) * 6.6;
      if (kotak.some(k => p.x - 19 < k[2] && p.x - 19 + w > k[0] && p.y - 20 < k[3] && p.y + 20 > k[1])) continue;
      kotak.push([p.x - 19, p.y - 20, p.x - 19 + w, p.y + 20]); pilih.push(i);
    }
    const ada = new Set(pilih.map(i => i.key));
    for (const [k, mk] of PT.pins) if (!ada.has(k)) { mk.remove(); PT.pins.delete(k); }
    for (const i of pilih) if (!PT.pins.has(i.key)) PT.pins.set(i.key, new maplibregl.Marker({element: elPin(i), anchor: "left", offset: [-19, 0]}).setLngLat([i.lon, i.lat]).addTo(m));
  }
  let pinT = 0; const jadwalPin = () => { cancelAnimationFrame(pinT); pinT = requestAnimationFrame(() => nanti(gambarPin)); };
  function segarPeta() {   // dipanggil setelah lapisan/kategori/data berubah
    const m = PT.map; if (!m || !PT.siap) return;
    PT.items = itemPeta(); m.getSource("pts")?.setData(geoPts(PT.items)); m.getSource("sns")?.setData(geoSens());
    for (const mk of PT.pins.values()) mk.remove(); PT.pins.clear(); gambarPin();
    const vis = (id, v) => { if (m.getLayer(id)) m.setLayoutProperty(id, "visibility", v ? "visible" : "none"); };
    vis("pts-dot", PT.mode === "pin"); vis("sns-dot", PT.lapis.sensor && PT.mode === "pin");
    document.querySelectorAll("#akPtLayer [data-ly]").forEach(b => b.setAttribute("aria-pressed", String(!!PT.lapis[b.dataset.ly])));
  }
  const tipPeta = (e, html) => { const t = $("akTip"); if (!html) { t.hidden = true; return; } t.innerHTML = html; t.hidden = false; const x = e.originalEvent.clientX, y = e.originalEvent.clientY;
    t.style.left = Math.min(Math.max(8, x + 12), innerWidth - t.offsetWidth - 8) + "px"; t.style.top = Math.max(8, y - t.offsetHeight - 12) + "px"; };
  const sub1 = (L, f) => { const m = new Map(); L.forEach(x => { const k = f(x); if (k == null) return; (m.get(k) || m.set(k, []).get(k)).push(x); }); return m; };

  /* ---- pita wilayah ---- */
  function pitaPeta() {
    const L = lbArr.filter(x => x.kategori !== "penerbit"), per = [...sub1(L, x => x.prov)].map(([k, a]) => [k, a.length]).sort((a, b) => b[1] - a[1]).slice(0, 8);
    $("akPita").innerHTML = `<button type="button" data-fly="id"><b>Indonesia</b> ${angka(L.length)}</button>${per.map(([k, n]) => `<button type="button" data-fly="${esc(k)}"><b>${esc(provT(k))}</b> ${angka(n)}</button>`).join("")}<button type="button" class="ak-pitacho" data-fly="cho" aria-pressed="${PT.mode === "cho"}">Terbanyak per kab/kota</button>`;
  }
  async function geoProvinsi() { if (!PT.geoProv) PT.geoProv = await ambilJson("/geo/provinsi.json"); return PT.geoProv; }
  async function terbangKe(k) {
    const m = PT.map; if (k === "id") { m.flyTo({center: [118, -2.4], zoom: 3.9}); return; }
    const g = await geoProvinsi(), f = g?.features.find(f => String(f.properties.kode) === k); if (f) { const b = bbox(f); m.fitBounds([[b[0], b[1]], [b[2], b[3]]], {padding: 60, maxZoom: 9}); }
  }

  /* ---- choropleth (provinsi atau kab/kota) ---- */
  async function muatKab(kode) { if (!PT.kabCache[kode]) PT.kabCache[kode] = ambilJson(`/geo/kabupaten/${kode}.json`).then(g => g ? g.features.map(f => (f.properties.kode = kode, f)) : []); return PT.kabCache[kode]; }
  function kuantil(v, n = 5) { const s = v.filter(x => x > 0).sort((a, b) => a - b); if (!s.length) return []; return Array.from({length: n - 1}, (_, i) => s[Math.min(s.length - 1, Math.floor(s.length * (i + 1) / n))]); }
  async function petaCho() {
    const m = PT.map, prov = PT.tingkat === "prov", kodes = PT.pulau ? PULAU[PT.pulau] : Object.keys(PROV), tok = ++PT.chot;
    let fs = prov ? ((await geoProvinsi())?.features || []).filter(f => kodes.includes(String(f.properties.kode))) : (await Promise.all(kodes.map(muatKab))).flat();
    if (tok !== PT.chot) return;
    const L = lbArr.filter(x => x.kategori !== "penerbit" && x.prov), grup = sub1(L, x => prov ? x.prov : (x.kab ? x.prov + "|" + kunciKab(x.kab) : null));
    if (prov && !risikoP) risikoP = ambilJson("/banjir/data/risiko_kecamatan.json");
    const rk = prov ? await risikoP : null, sp = rk && Array.isArray(rk.kec) ? statProv(rk) : null; if (tok !== PT.chot) return;
    const reg = fs.map(f => { const kode = String(f.properties.kode), key = prov ? kode : kode + "|" + kunciKab(f.properties.kab), a = grup.get(key) || [], e = sp?.get(kode);
      return {f, key, nama: prov ? provT(kode) : f.properties.kab, kode, a, n: a.length, kontak: a.filter(adaKontak).length, pj: e ? a.length / (e.pend / 1e6) : null, risiko: e?.risiko ?? null, top: a.slice().sort((p, q) => bobot(q) - bobot(p))[0]}; });
    if (sp) { const pr = r => { const v = reg.map(x => x.risiko).filter(x => x != null).sort((a, b) => a - b); return v.length ? v.filter(x => x <= r).length / v.length : 0; }, pj = reg.map(x => x.pj).filter(x => x != null).sort((a, b) => a - b);
      reg.forEach(x => { x.gap = x.risiko == null || x.pj == null ? null : pr(x.risiko) - pj.filter(v => v <= x.pj).length / pj.length; }); }
    const uk = PT.ukuran, nilai = x => uk === "jumlah" ? x.n : uk === "kontak" ? x.kontak : uk === "perjuta" ? x.pj : x.gap, merah = uk === "gap", pal = merah ? MERAH : BIRU;
    const vals = reg.map(nilai).filter(v => v != null), br = merah ? kuantil(vals.map(v => v + 1)).map(v => v - 1) : kuantil(vals), kelas = v => v == null || (!merah && v <= 0) ? -1 : br.filter(b => v >= b).length;
    reg.forEach(x => { x.v = nilai(x); x.k = kelas(x.v); x.warna = x.k < 0 ? "#e9ecef" : pal[Math.min(4, x.k)]; });
    PT.reg = reg;
    const feats = reg.map(x => ({type: "Feature", properties: {i: reg.indexOf(x), warna: x.warna}, geometry: x.f.geometry}));
    m.getSource("cho").setData({type: "FeatureCollection", features: feats});
    const fmt = v => v == null ? "tidak tersedia" : uk === "perjuta" ? v.toLocaleString("id-ID", {maximumFractionDigits: 1}) : uk === "gap" ? (v > 0 ? "+" : "") + v.toLocaleString("id-ID", {maximumFractionDigits: 1}) : angka(v), sat = {jumlah: "lembaga", kontak: "lembaga berkontak", perjuta: "lembaga per juta penduduk", gap: "selisih persentil risiko dan mitra"}[uk];
    PT.fmt = fmt; PT.sat = sat;
    const punya = reg.filter(x => x.n > 0).length, rank = reg.filter(x => x.v != null).sort((a, b) => b.v - a.v).slice(0, 15), ed = [-Infinity, ...br];
    $("akPtIsi").innerHTML = `<p class="ak-rata">Jumlah ${prov ? "provinsi" : "kab/kota"} yang punya lembaga mitra, menurut ukuran yang dipilih.</p>
      <p class="ak-ptcakup"><b>${angka(punya)}</b> dari ${angka(reg.length)} ${prov ? "provinsi" : "kab/kota"} punya minimal satu lembaga mitra</p>
      <div class="ak-legenda2"><span><i style="background:#e9ecef"></i>${merah ? "Data tidak tersedia" : "Tidak ada"}</span>${pal.map((c, i) => `<span><i style="background:${c}"></i>${i === 0 ? "Terendah" : i === 4 ? "Tertinggi" : ""}${br[i - 1] != null && i && i < 4 ? "dari " + esc(fmt(br[i - 1])) : ""}</span>`).join("")}</div>
      <ol class="ak-rank">${rank.map(x => `<li><button type="button" data-rg="${reg.indexOf(x)}">${x.top ? logoLb(x.top) : '<span class="ak-klogo kosong" aria-hidden="true">-</span>'}<span><b>${esc(x.nama)}</b><small>${esc(x.top ? x.top.singkatan || x.top.nama : "Belum ada lembaga")}</small></span><em>${esc(fmt(x.v))}</em></button></li>`).join("")}</ol>
      <small class="ak-lper">Satuan: ${esc(sat)}. Sumber: direktori lembaga mitra${sp ? `; penduduk dan indeks risiko dari risiko kecamatan Centurisk97 (data ${esc(tglID(rk.hari))})` : ""}; batas wilayah BIG.</small>`;
    $("akPtUkuran").querySelectorAll("button").forEach(b => { b.disabled = !prov && (b.dataset.v === "perjuta" || b.dataset.v === "gap"); });
    PT.itemsCho = reg.filter(x => x.top && Number.isFinite(x.top.lat)).map(x => ({key: "c:" + x.key, lat: (bbox(x.f)[1] + bbox(x.f)[3]) / 2, lon: (bbox(x.f)[0] + bbox(x.f)[2]) / 2, nama: x.top.singkatan || x.top.nama, tip: x.top.nama, logo: urlOk(x.top.logo), warna: (KAT[x.top.kategori] || [])[2] || "#6b7280", w: x.n, label: false, buka: () => bukaDrawer(x.top)}));
    for (const mk of PT.pins.values()) mk.remove(); PT.pins.clear(); gambarPin();
    if (PT.pulau || !prov) { const bs = fs.map(bbox); if (bs.length) m.fitBounds([[Math.min(...bs.map(b => b[0])), Math.min(...bs.map(b => b[1]))], [Math.max(...bs.map(b => b[2])), Math.max(...bs.map(b => b[3]))]], {padding: 40}); }
  }
  function modePeta(cho) {
    PT.mode = cho ? "cho" : "pin"; const m = PT.map; $("akPtPanel").hidden = !cho; document.querySelector(".ak-pitacho")?.setAttribute("aria-pressed", String(cho));
    for (const id of ["cho-fill", "cho-line"]) m.setLayoutProperty(id, "visibility", cho ? "visible" : "none");
    if (cho) { if (PT.tingkat === "kab" && !PT.pulau) { PT.pulau = "Jawa-Bali"; setSeg("akPtPulau", PT.pulau); } nanti(petaCho); } else segarPeta();
  }
  async function bangunPeta(el) {
    el.innerHTML = `<div class="ak-pta"><div class="ak-pita" id="akPita" role="group" aria-label="Wilayah"></div>
      <div class="ak-ptaisi"><div id="akMap" class="ak-map" role="application" aria-label="Peta lembaga mitra"></div>
        <div class="ak-ptlayer" id="akPtLayer" role="group" aria-label="Lapisan peta"><button type="button" data-ly="lembaga" aria-pressed="true">Lembaga mitra<small>${angka(lbArr.filter(x => Number.isFinite(x.lat)).length)}</small></button><button type="button" data-ly="kampus" aria-pressed="true">Kampus<small>${angka(Object.values(kampusInfo).filter(v => Number.isFinite(v?.lat)).length)}</small></button><button type="button" data-ly="pusat" aria-pressed="false">Pusat studi</button><button type="button" data-ly="sensor" aria-pressed="false" hidden>Jaringan sensor</button>
          ${htmlPilih("akPtKat", IK_GEDUNG, "Cari kategori")}<div hidden id="akPtSensW">${htmlPilih("akPtSens", IK_BAR, "Cari jenis sensor")}</div></div>
        <aside class="ak-ptpanel" id="akPtPanel" hidden><h3>Lembaga di tiap kab/kota</h3>
          ${segHtml("akPtPulau", "Pulau", [["", "Semua pulau"], ...Object.keys(PULAU).map(k => [k, k])])}${segHtml("akPtTingkat", "Tingkat", [["prov", "Provinsi"], ["kab", "Kab/kota"]])}${segHtml("akPtUkuran", "Ukuran", [["jumlah", "Jumlah lembaga"], ["kontak", "Berkontak"], ["perjuta", "Per juta penduduk"], ["gap", "Kesenjangan risiko"]])}
          <div id="akPtIsi">${hantuHtml}</div></aside>
        <aside class="ak-drawer" id="akDrawer" role="dialog" aria-labelledby="akDrNama" hidden><button type="button" class="ak-drtutup" id="akDrTutup">${ikon('<path d="M6 6l12 12M18 6 6 18"/>', "currentColor")}Tutup</button><div id="akDrIsi"></div></aside></div></div>`;
    pitaPeta();
    try { await muatMapLib(); } catch (e) { $("akMap").innerHTML = '<p class="ak-khampa">Peta tidak bisa dimuat. Periksa koneksi lalu muat ulang.</p>'; return; }
    const gelap = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const m = PT.map = new maplibregl.Map({container: "akMap", style: "https://tiles.openfreemap.org/styles/" + (gelap ? "dark" : "positron"), center: [118, -2.4], zoom: 3.9, minZoom: 3, maxZoom: 16, dragRotate: false, pitchWithRotate: false,
      attributionControl: {compact: true, customAttribution: "Batas wilayah BIG"}});
    m.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right"); m.addControl(new maplibregl.GeolocateControl({positionOptions: {enableHighAccuracy: false}}), "top-right");
    PT.chot = 0; m.once("load", () => m.resize()); new ResizeObserver(() => m.resize()).observe($("akMap"));
    pasangPilih("akPtKat", {semua: "Semua kategori", nilai: () => PT.kat, opsi: () => Object.entries(hitungLb(x => x.kategori)).filter(([k]) => k !== "penerbit").sort((a, b) => b[1] - a[1]).map(([k, c]) => [k, (KAT[k] || [k])[0], c]), pilih: v => { PT.kat = v; nanti(segarPeta); }});
    pasangPilih("akPtSens", {semua: "Semua jenis sensor", nilai: () => PT.sens, opsi: () => Object.entries(sub1(PT.sensorArr, s => s.jenis)).map(([k, a]) => [k, kapital(k), a.length]).sort((a, b) => b[2] - a[2]), pilih: v => { PT.sens = v; nanti(segarPeta); }});
    $("akPtLayer").addEventListener("click", e => { const b = e.target.closest("[data-ly]"); if (!b) return; PT.lapis[b.dataset.ly] = !PT.lapis[b.dataset.ly]; b.setAttribute("aria-pressed", String(PT.lapis[b.dataset.ly]));
      $("akPtSensW").hidden = !PT.lapis.sensor; if (b.dataset.ly === "pusat" && PT.lapis.pusat && !PT.pusatArr.length) ambilData("pusat_studi").then(d => { PT.pusatArr = dlist(d).filter(x => x && x.nama && x.nama_terverifikasi === true); nanti(segarPeta); }); nanti(segarPeta); });
    $("akPita").addEventListener("click", e => { const b = e.target.closest("[data-fly]"); if (!b) return; if (b.dataset.fly === "cho") { nanti(() => modePeta(PT.mode !== "cho")); return; } terbangKe(b.dataset.fly); });
    const seg = (id, k) => $(id).addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b || b.disabled) return; PT[k] = b.dataset.v; setSeg(id, b.dataset.v);
      if (k === "tingkat" && b.dataset.v === "kab" && !PT.pulau) { PT.pulau = "Jawa-Bali"; setSeg("akPtPulau", PT.pulau); } if (k === "tingkat" && b.dataset.v === "kab" && (PT.ukuran === "perjuta" || PT.ukuran === "gap")) { PT.ukuran = "jumlah"; setSeg("akPtUkuran", "jumlah"); } nanti(petaCho); });
    seg("akPtPulau", "pulau"); seg("akPtTingkat", "tingkat"); seg("akPtUkuran", "ukuran");
    $("akPtIsi").addEventListener("click", e => { const b = e.target.closest("[data-rg]"); const r = b && PT.reg?.[+b.dataset.rg]; if (r) { const bb = bbox(r.f); m.fitBounds([[bb[0], bb[1]], [bb[2], bb[3]]], {padding: 60, maxZoom: 10}); } });
    $("akDrTutup").addEventListener("click", tutupDrawer);
    m.on("load", () => {
      m.addSource("pts", {type: "geojson", data: geoPts([])}); m.addSource("sns", {type: "geojson", data: geoSens()}); m.addSource("cho", {type: "geojson", data: {type: "FeatureCollection", features: []}});
      m.addLayer({id: "cho-fill", type: "fill", source: "cho", layout: {visibility: "none"}, paint: {"fill-color": ["get", "warna"], "fill-opacity": .72}});
      m.addLayer({id: "cho-line", type: "line", source: "cho", layout: {visibility: "none"}, paint: {"line-color": "#fff", "line-width": .6}});
      m.addLayer({id: "sns-dot", type: "circle", source: "sns", layout: {visibility: "none"}, paint: {"circle-color": ["get", "warna"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 1.6, 9, 4], "circle-opacity": .85}});
      m.addLayer({id: "pts-dot", type: "circle", source: "pts", paint: {"circle-color": ["get", "warna"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 3, 10, 6], "circle-stroke-color": "#fff", "circle-stroke-width": 1, "circle-opacity": ["get", "op"]}});
      PT.siap = true; segarPeta();
      m.on("moveend", jadwalPin);
      m.on("mousemove", "pts-dot", e => { const i = PT.items.find(x => x.key === e.features[0].properties.key); m.getCanvas().style.cursor = "pointer"; tipPeta(e, i && `<b>${esc(i.sub)}</b><span>${esc(i.tip)}</span>`); });
      m.on("mouseleave", "pts-dot", () => { m.getCanvas().style.cursor = ""; $("akTip").hidden = true; });
      m.on("click", "pts-dot", e => PT.items.find(x => x.key === e.features[0].properties.key)?.buka());
      m.on("mousemove", "sns-dot", e => { const p = e.features[0].properties; m.getCanvas().style.cursor = "pointer"; tipPeta(e, `<b>${esc(kapital(p.jenis))}</b><span>${esc(p.nama)}</span>${p.jaringan ? `<small>${esc(p.jaringan)}</small>` : ""}`); });
      m.on("mouseleave", "sns-dot", () => { m.getCanvas().style.cursor = ""; $("akTip").hidden = true; });
      m.on("click", "sns-dot", e => { const x = lbMap.get(e.features[0].properties.pemilik); if (x) bukaDrawer(x); });
      m.on("mousemove", "cho-fill", e => { const r = PT.reg?.[e.features[0].properties.i]; if (r) tipPeta(e, `<b>${esc(r.nama)}</b><span>${esc(PT.fmt(r.v))}</span><small>${esc(PT.sat)}, ${angka(r.n)} lembaga${r.top ? `, terbesar ${esc(r.top.singkatan || r.top.nama)}` : ""}</small>`); });
      m.on("mouseleave", "cho-fill", () => { $("akTip").hidden = true; });
      ambilData("sensor").then(d => { if (!Array.isArray(d) || !d.length) return; PT.sensorArr = d.filter(s => s && Number.isFinite(s.lat)); $("akPtLayer").querySelector('[data-ly="sensor"]').hidden = false; nanti(segarPeta); });
    });
  }
  const muatMapLib = () => janji.maplibreAll ||= new Promise((ok, gagal) => { if (!document.querySelector('link[href="' + MAP_CSS + '"]')) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = MAP_CSS; document.head.append(l); } muat("maplibre").then(ok, e => { delete janji.maplibreAll; gagal(e); }); });

  /* ---- tab Lembaga: tiga sub-tampilan, dibangun saat dibuka ---- */
  const SUBL = {peta: ["akLbPeta", bangunPeta], daftar: ["akLbDaftar", bangunDaftarLb], analisa: ["akLbAnalisa", bangunAnalisa], proyek: ["akLbProyek", bangunProyek]}, subLBangun = {};
  function subLb(v) {
    lbSub = v; setSeg("akLS", v);
    for (const [k, [id]] of Object.entries(SUBL)) $(id).hidden = k !== v;
    if (!subLBangun[v]) { subLBangun[v] = true; nanti(() => SUBL[v][1]($(SUBL[v][0]))); }
    dpSegarkan();
  }
  function bangunLembaga(p, d) {
    indeksLb(d); Object.keys(subLBangun).forEach(k => delete subLBangun[k]); analisaSiap = false; pjSiap = false; Object.assign(LB, {q: "", prov: "", kat: "", skala: "", bidang: "", sub: "", sensor: false, hal: 1}); PT.map?.remove(); Object.assign(PT, {map: null, siap: false, pins: new Map(), mode: "pin"}); tutupDrawerAman(); Object.assign(PJ, {q: "", prov: "", donor: "", sektor: "", hal: 1});
    p.innerHTML = `${segHtml("akLS", "Sub-tampilan lembaga", [["peta", "Peta", IKON_PIN], ["daftar", "Daftar", IK_GEDUNG], ["analisa", "Analisa", IK_BAR], ["proyek", "Proyek mitra", IK_UANG]])}<div id="akLbPeta" class="ak-tampilan"></div><div id="akLbDaftar" class="ak-tampilan" hidden></div><div id="akLbAnalisa" class="ak-tampilan" hidden></div><div id="akLbProyek" class="ak-tampilan" hidden></div>`;
    $("akLS").addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (b) subLb(b.dataset.v); });
    subLb(lbSub);
  }

  /* ---- aset riset (L46), sub-tampilan di tab Pusat studi ---- */
  const AS = {q: "", jenis: "", prov: "", pemilik: "", hal: 1}, ASPER = 24;
  let asArr = [], asHasil = [], asSiap = false, astok = 0;
  const kartuAs = a => { const web = urlOk(a.web), em = emailOk(a.kontak?.email) ? a.kontak.email : "", tel = typeof a.kontak?.telepon === "string" ? a.kontak.telepon.trim() : "", lok = [a.kota, provT(a.prov)].filter(Boolean).join(", ");
    return `<article class="ak-psk"><div class="ak-psatas"><h4>${esc(a.nama)}</h4></div>
      <div class="ak-pil"><span class="ak-r utama" style="--w0:#2f9e44">${ikon(KAT.riset[1], "#2f9e44")}${esc(kapital(a.jenis || "aset"))}</span>${a.bisa_disewa === true ? '<span class="ak-izin berlaku">Bisa disewa</span>' : a.bisa_disewa === false ? '<span class="ak-izin contoh">Tidak disewakan</span>' : ""}${pilContoh(a)}${lok ? `<span class="ak-ptl ak-ptl2">${ikon(IKON_PIN, "currentColor")}${esc(lok)}</span>` : ""}</div>
      ${a.pemilik || a.unit ? `<p class="ak-lper">${esc([a.pemilik, a.unit].filter(Boolean).join(", "))}</p>` : ""}${a.layanan ? `<p class="ak-rata">${esc(typeof a.layanan === "string" ? a.layanan : strs(a.layanan).join(", "))}</p>` : ""}
      <div class="ak-lkontak">${tel ? `<span class="ak-kt"><a class="ak-lnk" href="${esc(telHref(tel))}">${ikon(IK_TEL, "currentColor")}<em>Telepon</em>${esc(telF(tel))}</a></span>` : ""}${em ? `<span class="ak-kt"><a class="ak-lnk" href="mailto:${esc(em)}">${ikon(IKON_MAIL, "currentColor")}<em>Email</em>${esc(em)}</a></span>` : ""}${web ? `<span class="ak-kt"><a class="ak-lnk" href="${esc(web)}" ${LUAR}>${ikon(IKON_WEB, "currentColor")}<em>Situs</em>${esc(urlHost(web))}</a></span>` : ""}</div>
      <div class="ak-lfoot">${lSum(urlOk(a.sumber_url), a.diperiksa)}${lbPeriksa(a)}</div></article>`; };
  function gambarAs(gulir) {
    asHasil = asArr.filter(a => (!AS.jenis || a.jenis === AS.jenis) && (!AS.prov || String(a.prov) === AS.prov) && (!AS.pemilik || a.pemilik === AS.pemilik) && (!AS.q || a._cari.includes(AS.q.toLowerCase())));
    const n = asHasil.length, p0 = (AS.hal - 1) * ASPER;
    $("akAsJ").innerHTML = `<b>${angka(n)}</b> aset riset${AS.jenis ? ` jenis ${esc(AS.jenis)}` : ""}${AS.prov ? ` di ${esc(provT(AS.prov))}` : ""}`;
    $("akAsL").innerHTML = n ? `<div class="ak-psgrid">${asHasil.slice(p0, p0 + ASPER).map(kartuAs).join("")}</div>` : `<p class="ak-khampa">Tidak ada aset yang cocok.</p>`;
    $("akAsH").innerHTML = navHal(AS.hal, n, ASPER, "aset");
    if (gulir) gulirKe("akAsJ");
  }
  function bangunAset(el) {
    if (asSiap) return; asSiap = true; el.innerHTML = hantuHtml;
    ambilData("aset_riset").then(d => nanti(() => {
      if (!Array.isArray(d) || !d.length) { asSiap = false; el.innerHTML = kosongHtml("Aset riset"); return; }
      asArr = d.filter(a => a && a.nama).map(a => Object.assign(a, {prov: a.prov == null ? "" : String(a.prov), _cari: [a.nama, a.jenis, a.pemilik, a.unit, a.kota, typeof a.layanan === "string" ? a.layanan : strs(a.layanan).join(" ")].filter(Boolean).join(" ").toLowerCase()}));
      const hit = f => { const n = {}; asArr.forEach(a => { const k = f(a); if (k) n[k] = (n[k] || 0) + 1; }); return n; }, nJ = hit(a => a.jenis), nP = hit(a => a.prov), nM = hit(a => a.pemilik);
      el.innerHTML = `<div class="ak-saring"><div class="ak-alat">${cariKotak("akAsQ", "Cari nama alat, pemilik, atau layanan")}</div>
        <div class="ak-baris ak-baris3">${htmlPilih("akAsJn", IKL.jenis, "Cari jenis")}${htmlPilih("akAsP", IKON_PIN, "Cari provinsi")}${htmlPilih("akAsM", IK_GEDUNG, "Cari pemilik")}</div></div>
        <div class="ak-hasil"><h2 class="ak-judulv" id="akAsJ"></h2><div id="akAsL"></div><nav id="akAsH" class="ak-hal" aria-label="Halaman daftar aset" aria-live="polite"></nav></div>`;
      const jalan = () => { const t = ++astok; nanti(() => { if (t === astok) gambarAs(false); }); }, ubah = (k, v) => { AS[k] = v; AS.hal = 1; jalan(); };
      pasangPilih("akAsJn", {semua: "Semua jenis", nilai: () => AS.jenis, opsi: () => Object.entries(nJ).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, kapital(v), c]), pilih: v => ubah("jenis", v)});
      pasangPilih("akAsP", {semua: "Semua provinsi", nilai: () => AS.prov, opsi: () => Object.entries(nP).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, provT(v), c]), pilih: v => ubah("prov", v)});
      pasangPilih("akAsM", {semua: "Semua pemilik", nilai: () => AS.pemilik, opsi: () => Object.entries(nM).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, v, c]), pilih: v => ubah("pemilik", v)});
      let tt = 0; $("akAsQ").addEventListener("input", e => { clearTimeout(tt); tt = setTimeout(() => ubah("q", e.target.value.trim()), 250); });
      pasangHal("akAsH", h => { AS.hal = h; gambarAs(true); });
      gambarAs(false); }));
  }
  let psSub = "pusat";
  function subPs(v) { psSub = v; setSeg("akPS", v); $("akPsA").hidden = v !== "pusat"; $("akPsB").hidden = v !== "aset"; if (v === "aset") nanti(() => bangunAset($("akPsB"))); }

  /* ---- tombol dummy (DUMMY.md): dua ikon, Super Admin saja, isi mengikuti tab yang terbuka; data contoh hidup di klien, tanpa tulis ke server ---- */
  function dataContoh() {
    const wib = new Date(Date.now() + 7 * 36e5), tgl = wib.toISOString().slice(0, 10), mu = (n, h) => "+6281" + String(1000000 + n * 7919 + h).slice(0, 8), sm = (b, u) => ({butir: b, url: u, diperiksa: tgl});
    const mk = (id, nama, singkatan, kategori, o = {}) => { const web = `https://contoh-${id}.example.org`; return {id, nama: nama + " (contoh)", singkatan, kategori, skala: "provinsi", prov: null, bidang: ["tanggap darurat"], web,
      telepon: ["+622150001" + String(100 + id.length * 7).slice(0, 3)], email: [`info@contoh-${id}.example.org`], sumber: [sm("telepon", web), sm("email", web), sm("web", web)], diperiksa: tgl, dummy: true, ...o}; };
    const L = [
      mk("bpbd-riau", "BPBD Provinsi Riau", "BPBD Riau", "pemerintah", {prov: "14", kab: "Kota Pekanbaru", lat: 0.51, lon: 101.45, lokasi_sumber: "alamat", sub: "BPBD", bidang: ["tanggap darurat", "logistik", "PRB dan kesiapsiagaan"], rumpun: ["karhutla", "banjir"], wa: [mu(1, 1)], pimpinan: {nama: "Nama Contoh", jabatan: "Kepala Pelaksana", sumber_url: "https://contoh-bpbd-riau.example.org"}, alamat: "Jl. Contoh No. 1, Pekanbaru"}),
      mk("bpbd-jateng", "BPBD Provinsi Jawa Tengah", "BPBD Jateng", "pemerintah", {prov: "33", kab: "Kota Semarang", lat: -6.99, lon: 110.42, sub: "BPBD", bidang: ["tanggap darurat", "logistik", "air dan sanitasi"], rumpun: ["banjir", "longsor"], telepon: ["+62248001234", "+62248005678"]}),
      mk("pmi-riau", "PMI Provinsi Riau", "PMI Riau", "kerelawanan", {prov: "14", kab: "Kota Pekanbaru", lat: 0.52, lon: 101.44, sub: "palang merah", bidang: ["kesehatan", "psikososial", "air dan sanitasi"], mitra_bnpb: {bukti: "Perjanjian kerja sama contoh", tahun: 2024, sumber_url: "https://contoh-pmi-riau.example.org"}, wa: [mu(2, 2)]}),
      mk("pmi-pusat", "Palang Merah Indonesia", "PMI", "kerelawanan", {skala: "nasional", kab: "Jakarta Selatan", lat: -6.24, lon: 106.83, bidang: ["tanggap darurat", "kesehatan", "psikososial", "logistik", "pendanaan"], mitra_bnpb: {bukti: "MoU contoh", tahun: 2023, sumber_url: "https://contoh-pmi-pusat.example.org"}, medsos: {instagram: "https://instagram.com/contoh"}, pimpinan: {nama: "Nama Contoh", jabatan: "Ketua Umum", sumber_url: "https://contoh-pmi-pusat.example.org"}}),
      mk("laz-a", "LAZ Berizin Contoh A", "LAZ A", "donasi", {skala: "nasional", kab: "Jakarta Pusat", lat: -6.18, lon: 106.82, bidang: ["pendanaan", "pangan"], izin: {jenis: "LAZ", nomor: "SK 000/2025", berlaku_sampai: "2029-12-31", sumber_url: "https://contoh-laz-a.example.org"}}),
      mk("laz-b", "LAZ Izin Habis Contoh B", "LAZ B", "donasi", {skala: "nasional", bidang: ["pendanaan"], izin: {jenis: "LAZ", nomor: "SK 001/2020", berlaku_sampai: "2024-01-31", sumber_url: "https://contoh-laz-b.example.org"}, diperiksa: "2026-02-01"}),
      mk("yayasan-c", "Yayasan Izin Dicabut Contoh C", "Yayasan C", "donasi", {skala: "nasional", bidang: ["pendanaan"], izin: {jenis: "PUB", nomor: "SK 002/2019", status: "dicabut", sumber_url: "https://contoh-yayasan-c.example.org"}}),
      mk("planas", "Platform Nasional PRB Contoh", "Planas", "jejaring", {skala: "nasional", kab: "Jakarta Pusat", lat: -6.2, lon: 106.84, bidang: ["PRB dan kesiapsiagaan", "data dan pemetaan"]}),
      mk("un", "Badan PBB Contoh", "UN", "internasional", {skala: "internasional", kab: "Jakarta Pusat", lat: -6.19, lon: 106.82, bidang: ["perlindungan", "pangan", "hunian"]}),
      mk("aha", "AHA Centre", "AHA Centre", "mitra-internasional", {skala: "internasional", kab: "Jakarta Selatan", lat: -6.25, lon: 106.82, bidang: ["tanggap darurat", "data dan pemetaan", "logistik"], rumpun: ["banjir", "gempa"], alias: ["ASEAN Coordinating Centre for Humanitarian Assistance on disaster management"]}),
      mk("nu", "Lembaga Penanggulangan Bencana Contoh", "LPB Contoh", "keagamaan", {skala: "nasional", bidang: ["tanggap darurat", "psikososial"]}),
      mk("kadin", "Kamar Dagang Contoh", "Kadin Contoh", "dunia-usaha", {skala: "nasional", bidang: ["logistik", "pendanaan"]}),
      mk("orari", "Organisasi Radio Contoh", "ORARI Contoh", "komunikasi", {skala: "nasional", bidang: ["komunikasi"]}),
      mk("iagi", "Ikatan Ahli Geologi Indonesia", "IAGI", "profesi", {skala: "nasional", bidang: ["riset", "data dan pemetaan"], rumpun: ["geologi", "gempa"]}),
      mk("hagi", "Himpunan Ahli Geofisika Indonesia", "HAGI", "profesi", {skala: "nasional", bidang: ["riset", "data dan pemetaan"]}),
      mk("pkk", "Pusat Krisis Kesehatan Contoh", "PKK Contoh", "kesehatan", {skala: "nasional", bidang: ["kesehatan", "psikososial"], prov: "31", kab: "Jakarta Pusat", lat: -6.17, lon: 106.83}),
      mk("brin", "Pusat Riset Kebencanaan Contoh", "PRK Contoh", "riset", {skala: "nasional", bidang: ["riset", "data dan pemetaan"], prov: "32", kab: "Kota Bandung", lat: -6.91, lon: 107.61}),
      mk("pmi-jateng", "PMI Provinsi Jawa Tengah", "PMI Jateng", "kerelawanan", {prov: "33", kab: "Kota Semarang", lat: -6.98, lon: 110.41, induk: "pmi-pusat", bidang: ["kesehatan", "psikososial"], sub: "palang merah"}),
      mk("basarnas-ntt", "Kantor SAR Kupang", "Basarnas Kupang", "pemerintah", {prov: "53", kab: "Kota Kupang", lat: -10.17, lon: 123.6, sub: "SAR", bidang: ["SAR", "tanggap darurat"]}),
      mk("bpbd-papua", "BPBD Provinsi Papua", "BPBD Papua", "pemerintah", {prov: "91", kab: "Kota Jayapura", lat: -2.53, lon: 140.7, sub: "BPBD", bidang: ["tanggap darurat"], diperiksa: "2026-02-01"})];
    const P3 = (id, judul, donor, pelaksana, sektor, prov, usd, mulai, selesai, status) => ({id, judul: judul + " (contoh)", donor, pelaksana, sektor, prov, nilai_usd: usd, mulai, selesai, status, sumber_url: "https://contoh-iati.example.org/" + id, dummy: true});
    const W = [P3("p1", "Kesiapsiagaan banjir berbasis komunitas", "Badan Donor Contoh A", "Palang Merah Indonesia (contoh)", ["PRB dan kesiapsiagaan", "air dan sanitasi"], ["33", "35"], 2400000, "2025-01-01", "2027-12-31", "aktif"),
      P3("p2", "Pencegahan karhutla di lahan gambut", "Badan Donor Contoh B", "Platform Nasional PRB Contoh", ["lingkungan"], ["14", "62"], 5100000, "2024-06-01", "2028-05-31", "aktif"),
      P3("p3", "Respons gempa dan hunian sementara", "Badan Donor Contoh A", "Badan PBB Contoh", ["hunian", "perlindungan"], ["52"], 12800000, "2023-09-01", "2025-08-31", "selesai"),
      P3("p4", "Sistem peringatan dini tsunami", "Bank Pembangunan Contoh", "AHA Centre", ["data dan pemetaan"], ["91", "53"], 780000, "2026-01-01", "2027-06-30", "aktif"),
      P3("p5", "Layanan psikososial pascabencana", "Badan Donor Contoh B", "Palang Merah Indonesia (contoh)", ["psikososial"], ["14"], 310000, "2025-03-01", "2026-02-28", "aktif")];
    W.forEach((p, i) => { if (i === 0) p.pelaksana = "PMI"; });
    const A = (id, nama, jenis, pemilik, prov, kota, layanan, sewa) => ({id, nama: nama + " (contoh)", jenis, pemilik, unit: "Unit Layanan Contoh", prov, kota, layanan, bisa_disewa: sewa, kontak: {email: `layanan@contoh-${id}.example.org`, telepon: "+622150002" + (100 + id.length * 3)}, web: `https://contoh-${id}.example.org`, sumber_url: `https://contoh-${id}.example.org/katalog`, diperiksa: tgl, dummy: true});
    const S = [A("a1", "Drone pemetaan multispektral", "drone", "Badan Riset Contoh", "14", "Pekanbaru", "Pemetaan area terbakar dan lahan gambut, termasuk operator", true), A("a2", "Radar cuaca portabel", "radar", "Universitas Contoh", "33", "Semarang", "Pemantauan hujan ekstrem untuk operasi banjir", true),
      A("a3", "Seismograf broadband", "seismograf", "Badan Riset Contoh", "32", "Bandung", "Data getaran tanah untuk kajian gempa", false), A("a4", "Laboratorium uji tanah", "lab tanah", "Universitas Contoh", "35", "Surabaya", "Uji sifat tanah dan potensi longsor", true),
      A("a5", "Laboratorium kualitas air", "lab air", "Institut Contoh", "53", "Kupang", "Uji kualitas air pascabanjir dan kekeringan", true)];
    L[0].sensor = [{jenis: "hidrologi", jumlah: 12, cakupan: "Daerah aliran sungai Siak", data_terbuka: true, portal_url: "https://contoh-portal.example.org", sumber_url: "https://contoh-bpbd-riau.example.org"}];
    L[16].inovasi_produk = [{nama: "Aplikasi peringatan dini contoh", uraian: "Menyampaikan peringatan banjir lewat pesan singkat.", rumpun: ["banjir"], tahun: 2025, sumber_url: "https://contoh-brin.example.org"}];
    L.push(mk("startup", "Startup Kebencanaan Contoh", "Startup Contoh", "inovasi", {skala: "nasional", prov: "32", kab: "Kota Bandung", lat: -6.9, lon: 107.62, bidang: ["data dan pemetaan"], inovasi_produk: [{nama: "Papan pantau banjir contoh", uraian: "Dasbor tinggi muka air.", rumpun: ["banjir"], tahun: 2026, sumber_url: "https://contoh-startup.example.org"}]}));
    const SN = (id, jenis, lat, lon, pemilik) => ({id, nama: "Stasiun " + jenis + " " + id + " (contoh)", jenis, pemilik, jaringan: "Jaringan contoh", lat, lon, status: "aktif", sumber_url: "https://contoh-sensor.example.org"});
    const sensor = [SN("s1", "seismik", -6.9, 107.6, "brin"), SN("s2", "pasut", -6.1, 106.8, "bpbd-riau"), SN("s3", "gnss", -7.8, 110.4), SN("s4", "cuaca", 0.5, 101.4, "bpbd-riau"), SN("s5", "hidrologi", -7.0, 110.4, "bpbd-jateng"), SN("s6", "gunung api", -7.54, 110.45), SN("s7", "buoy", -9.0, 105.0), SN("s8", "satelit", -2.5, 118)];
    const IV = (id, nama, jenis, rumpun, status, lat, lon, lid) => ({id, nama: nama + " (contoh)", ringkasan: "Ringkasan contoh dua kalimat. Dipakai untuk menilai tampilan kartu.", jenis, rumpun, pembuat: [{nama: "Pembuat Contoh", lembaga_id: lid || null, jenis: lid ? "startup" : "kampus"}], tahun: 2022, status, penerapan: [{lokasi: "Lokasi contoh", prov: "33", lat, lon, tahun: 2023, sumber_url: "https://contoh-inovasi.example.org"}], mitra: ["Mitra Contoh"], paten: [{nomor: "P00202300001", sumber_url: "https://contoh-inovasi.example.org"}], web: "https://contoh-inovasi.example.org", sumber: [{butir: "profil", url: "https://contoh-inovasi.example.org"}], klaim: "Akurasi contoh 95%", diperiksa: tgl, dummy: true});
    const SDX = (id, nama, akses, pakai, lid) => ({id, nama: nama + " (contoh)", kepanjangan: "Sistem Contoh", pemilik: "Lembaga Contoh", lembaga_id: lid || null, uraian: "Uraian contoh sistem data.", jenis_data: ["tinggi muka air"], sensor: ["logger"], rumpun: ["banjir"], cakupan: "Nasional", rentang: "2017 sampai sekarang", frekuensi: "per jam", akses, format: ["JSON", "CSV"], lisensi: "CC BY", portal_url: "https://contoh-sd.example.org", api_url: akses.startsWith("api") ? "https://contoh-sd.example.org/api" : "", cara_minta: akses === "permohonan" ? "Surat resmi ke sekretariat" : "", status: akses === "tertutup" ? "mati" : "hidup", dipakai_pantau: pakai, sumber: [{butir: "portal", url: "https://contoh-sd.example.org"}], diperiksa: tgl, dummy: true});
    const sistem_data = ["terbuka", "api-terbuka", "api-kunci", "login", "permohonan", "tertutup"].map((a, i) => SDX("sd" + i, "Sistem " + a, a, i % 2 === 0, i === 0 ? "bpbd-riau" : null));
    const inovasi = [IV("i1", "Sensor longsor murah", "sensor", ["longsor"], "terpasang", -7.4, 109.7, "startup"), IV("i2", "Peringatan banjir berbasis AI", "model/AI", ["banjir"], "uji lapangan", -6.9, 107.6), IV("i3", "Drone pemetaan gambut", "drone", ["karhutla"], "dikomersialkan", 0.5, 101.4), IV("i4", "Papan pantau gempa", "sistem informasi", ["gempa"], "purwarupa", -7.8, 110.4), IV("i5", "Sirene tsunami lama", "alat", ["tsunami"], "berhenti", -8.7, 115.2)];
    L.find(x => x.id === "kadin").sub = "logistik"; L.find(x => x.id === "kadin").potensi_bantuan = [{teks: "Armada truk untuk distribusi logistik", kejadian: "Banjir contoh", tahun: 2025, sumber_url: "https://contoh-kadin.example.org"}];
    L.push(mk("lsm1", "Yayasan Gambut Lestari", "YGL", "lsm", {skala: "nasional", sub: "gambut dan hutan", prov: "14", kab: "Kota Pekanbaru", lat: 0.5, lon: 101.43, bidang: ["PRB dan kesiapsiagaan"], rumpun: ["karhutla"], linkedin: "https://linkedin.com/company/contoh", medsos: {instagram: "https://instagram.com/contoh", youtube: "https://youtube.com/@contoh", x: "https://x.com/contoh", facebook: "https://facebook.com/contoh", tiktok: "https://tiktok.com/@contoh"}, sumber: [sm("telepon", "https://direktori-pihak-ketiga.example.com/ygl"), sm("instagram", "https://instagram.com/contoh"), sm("linkedin", "https://linkedin.com/company/contoh")]}));
    L.push(mk("bmkg", "Badan Meteorologi Klimatologi dan Geofisika", "BMKG", "pemerintah", {skala: "nasional", kab: "Jakarta Pusat", lat: -6.15, lon: 106.84, bidang: ["data dan pemetaan"], sensor: [{jenis: "seismometer", jumlah: 400, cakupan: "Nasional", data_terbuka: true, portal_url: "https://contoh-bmkg.example.org", sumber_url: "https://contoh-bmkg.example.org"}, {jenis: "buoy", jumlah: 20, cakupan: "Laut", data_terbuka: false, sumber_url: "https://contoh-bmkg.example.org"}]}));
    const tokoh = [{id: "t1", nama: "Tokoh Contoh Satu", peran: "Kepala badan (contoh)", jenis: "pejabat", lembaga: "BNPB contoh", rumpun: ["gempa", "banjir"], prov: "31", kiprah: [{teks: "Memimpin respons gempa contoh", tahun: 2024, sumber_url: "https://contoh-tokoh.example.org"}], medsos_resmi: {instagram: "https://instagram.com/contoh"}, web: "https://contoh-tokoh.example.org", wikidata: "Q1", sumber: [{butir: "profil", url: "https://contoh-tokoh.example.org"}], diperiksa: tgl, dummy: true},
      {id: "t2", nama: "Tokoh Contoh Dua", peran: "Aktivis (contoh)", jenis: "tokoh masyarakat", lembaga: "Yayasan Gambut Lestari", rumpun: ["karhutla"], prov: "14", kiprah: [], diperiksa: tgl, dummy: true}];
    const dokumen = [{id: "d1", judul: "Rencana Penanggulangan Bencana contoh", jenis: "RPB", tahun: 2024, rumpun: ["banjir"], wilayah: [{prov: "33", kab: "Banjarnegara"}], url: "https://contoh-dok.example.org/1", sumber_url: "https://contoh-dok.example.org", dummy: true}, {id: "d2", judul: "Kajian Risiko Bencana contoh", jenis: "KRB", tahun: 2023, rumpun: ["gempa"], wilayah: [{prov: "14"}], url: "https://contoh-dok.example.org/2", dummy: true}, {id: "d3", judul: "Peraturan Daerah contoh", jenis: "regulasi", tahun: 2022, rumpun: ["karhutla"], wilayah: [{prov: "14"}], url: "https://contoh-dok.example.org/3", dummy: true}];
    const wilayah_anggaran = [{prov: "14", kab: null, tahun: 2025, pos: "Belanja tidak terduga", nilai_rp: 25e9, jenis_angka: "anggaran", sumber_url: "https://contoh-ang.example.org", dummy: true}, {prov: "33", kab: "Banjarnegara", tahun: 2025, pos: "Penanggulangan bencana", nilai_rp: 4.2e9, jenis_angka: "realisasi", sumber_url: "https://contoh-ang.example.org", dummy: true}];
    const BRT = (id, judul, kategori, ent, rumpun) => ({id, judul: judul + " (contoh)", tanggal: tgl, media: "Media Contoh", url: "https://contoh-berita.example.org/" + id, ringkas: "Ringkasan berita contoh satu sampai dua kalimat.", kategori, entitas: ent, rumpun, dummy: true});
    const berita = [BRT("b1", "BPBD Riau menambah armada", "bantuan dan respons", [{jenis: "lembaga", id: "bpbd-riau"}], ["karhutla"]), BRT("b2", "Startup luncurkan papan pantau", "peluncuran inovasi", [{jenis: "lembaga", id: "startup"}, {jenis: "inovasi", id: "i2"}], ["banjir"]), BRT("b3", "Kerja sama riset gempa", "kerja sama", [{jenis: "tokoh", id: "t1"}], ["gempa"]), BRT("b4", "Dana siap pakai cair", "pendanaan dan hibah", [{jenis: "lembaga", id: "pmi-pusat"}], [])];
    const PDN = (id, je, nama, pemberi, jenis, o = {}) => ({id, jenis_entri: je, nama: nama + " (contoh)", pemberi, lembaga_id: null, jenis, sasaran: ["pemerintah pusat", "pemda"], nilai: 5e7, mata_uang: "USD", nilai_usd: 5e7, tahun: 2024, selesai: 2029, status: "aktif", penerima: "Pemerintah Indonesia", pelaksana: ["BNPB"], prov: ["33", "14"], rumpun: ["banjir"], syarat: "Proposal contoh", cara: "Ajukan lewat surat resmi ke sekretariat, lampirkan proposal.", tenggat: "Setiap Maret", kontak: {email: ["dana@contoh-dana.example.org"], telepon: ["+622150003000"]}, url: "https://contoh-dana.example.org", sumber: [{butir: "profil", url: "https://contoh-dana.example.org"}], diperiksa: tgl, dummy: true, ...o});
    const pendanaan = [PDN("pd1", "skema", "Pinjaman siaga bencana", "Bank Dunia contoh", "pinjaman"), PDN("pd2", "skema", "Hibah antarpemerintah", "Badan Hibah Contoh", "hibah G2G", {sasaran: ["pemda"]}), PDN("pd3", "skema", "Dana riset kebencanaan", "Lembaga Riset Contoh", "dana riset", {sasaran: ["kampus"], rumpun: ["gempa"]}), PDN("pd4", "proyek", "Proyek ketahanan banjir", "Bank Dunia contoh", "pinjaman", {nilai: 1.5e8, nilai_usd: 1.5e8}), PDN("pd5", "proyek", "Proyek peringatan dini", "Bank Pembangunan contoh", "hibah multilateral", {nilai: 2.4e12, mata_uang: "IDR", nilai_usd: 1.5e8 / 10, rumpun: ["gempa", "tsunami"]})];
    return {lembaga: L, lembaga_3w: W, aset_riset: S, sensor, inovasi, sistem_data, tokoh, dokumen, wilayah_anggaran, berita, pendanaan};
  }
  const NAMA_DUMMY = {tokoh: ["tokoh", "berita", "lembaga"], berita: ["berita", "lembaga", "tokoh"], pendanaan: ["pendanaan", "lembaga"], pustaka: ["dokumen"], wilayah: ["lembaga", "sensor", "inovasi", "lembaga_3w", "sistem_data", "wilayah_anggaran", "dokumen", "tokoh", "pendanaan"], sistem_data: ["sistem_data", "lembaga"], inovasi: ["inovasi", "lembaga"], lembaga: ["lembaga", "lembaga_3w", "sensor"], pusat: ["aset_riset"]};
  function pesanDummy(t) { $("akDummyPesan").textContent = t; }
  function dummyIsi() {
    const v = tampilSkrg === "pakar" && pkSub === "tokoh" ? "tokoh" : tampilSkrg, ns = NAMA_DUMMY[v]; if (!ns) { pesanDummy("Tab ini belum punya data contoh."); return; }
    if (v === "wilayah" && !WL.kode) WL.kode = "14";
    const D = dataContoh(); ns.forEach(n => { DATA[n] = Promise.resolve(D[n]); });
    if (v === "lembaga") lbSub = "peta"; else if (v === "pusat") psSub = "aset";
    dummyMuat(v); pesanDummy(`Data contoh terisi: ${ns.map(n => angka(D[n].length) + " " + n.replace("_", " ")).join(", ")}`);
  }
  function dummyHapus() {
    ["lembaga", "lembaga_3w", "aset_riset", "sensor", "inovasi", "sistem_data", "tokoh", "dokumen", "wilayah_anggaran", "berita", "pendanaan"].forEach(n => delete DATA[n]); psSub = "pusat"; lbSub = "peta"; delete DATA.sensor;
    Object.keys(MUAT).forEach(k => { delete sudah[k]; }); const v = tampilSkrg === "pakar" && pkSub === "tokoh" ? "tokoh" : tampilSkrg;
    if (NAMA_DUMMY[v]) dummyMuat(v); pesanDummy("Data contoh dihapus");
  }
  function dummyMuat(v) {   // muat ulang PENUH: bangun ulang tampilan dari data (bukan tambal komponen)
    delete sudah[v]; const t = $("akTampil").querySelector(`[data-t="${v}"]`); if (t) t.hidden = false; bukaView(v);
  }
  async function pasangDummyAk() {
    let ok = false;
    try { const r = await fetch("/api/akademisi/saya", {credentials: "same-origin"});
      if (r.ok) { ok = (await r.json().catch(() => ({}))).super === true; }
      else if (new URLSearchParams(location.search).get("dummy") === "1") { const q = await fetch("/api/staf/admin/daftar", {credentials: "same-origin"}); q.body?.cancel?.(); ok = q.ok; } } catch (e) { return; }   // fallback lama: probe Super Admin bila /saya belum ada
    if (!ok) return;
    $("akDummy").hidden = false;
    $("akDummy").addEventListener("click", e => { const b = e.target.closest("[data-dummy]"); if (b) nanti(b.dataset.dummy === "isi" ? dummyIsi : dummyHapus); });
  }

  /* ---- tab Inovasi (L4I, PRD 6.7): ringkasan, saringan, kartu, peta penerapan ---- */
  const STATUS_IN = {"purwarupa": "#868e96", "uji lapangan": "#f59f00", "terpasang": "#2b8a3e", "dikomersialkan": "#1c7ed6", "berhenti": "#c92a2a"};
  const IN = {rumpun: "", jenis: "", status: "", prov: "", pembuat: "", q: "", hal: 1}, INPER = 18;
  let inArr = [], inHasil = [], intok = 0, inMap = null;
  const inProv = x => dlist(x.penerapan).map(p => p?.prov).filter(Boolean).map(String);
  const kartuInP = (x, i) => { const pb = dlist(x.pembuat)[0], l = pb?.lembaga_id && lbMap.get(pb.lembaga_id);
    return kartuPola({attr: `data-in="${i}"`, sosok: sosokPola(l?.logo, pb?.nama || x.nama), nama: x.nama, status: x.status ? [x.status === "terpasang" || x.status === "dikomersialkan" ? "sinta" : x.status === "berhenti" ? "abu" : "biru", kapital(x.status)] : null, navy: pb?.nama, biru: x.jenis && kapital(x.jenis), rumpun: x.rumpun,
      metrik: [["lokasi", "Lokasi", angka(dlist(x.penerapan).length)], ["tahun", "Tahun", x.tahun ? String(x.tahun) : "-"], ["berita", "Berita", BRC.has("inovasi:" + x.id) ? angka(BRC.get("inovasi:" + x.id)) : "-"]]}); };
  const kartuIn = x => { const pb = dlist(x.pembuat), web = urlOk(x.web), sm = dlist(x.sumber).filter(s => s && urlOk(s.url));
    return `<article class="ak-psk" id="in-${esc(x.id)}"><div class="ak-psatas"><h4>${esc(x.nama)}</h4></div>
      <div class="ak-pil">${x.status ? `<span class="ak-izin" style="background:${STATUS_IN[x.status] || "#6b7280"}">${esc(kapital(x.status))}</span>` : ""}${x.jenis ? `<span class="ak-prodi">${esc(kapital(x.jenis))}</span>` : ""}${x.tahun ? `<span class="ak-prodi">${esc(x.tahun)}</span>` : ""}${strs(x.rumpun).map(r => pilRumpun(r)).join("")}${pilContoh(x)}</div>
      ${x.ringkasan ? `<p class="ak-rata">${esc(x.ringkasan)}</p>` : ""}
      ${pb.length ? `<div class="ak-pil"><small class="ak-lper">Pembuat</small>${pb.map(b => b.lembaga_id && lbMap.has(b.lembaga_id) ? `<button type="button" class="ak-pk" data-lb="${esc(b.lembaga_id)}">${esc(b.nama)}</button>` : `<span class="ak-prodi">${esc(b.nama)}</span>`).join("")}</div>` : ""}
      ${dlist(x.penerapan).length ? `<div class="ak-pil"><small class="ak-lper">Penerapan</small>${dlist(x.penerapan).map(p => Number.isFinite(p.lat) ? `<button type="button" class="ak-pk" data-inpeta="${p.lat},${p.lon}" title="${esc(p.keterangan || "Lihat di peta")}">${esc(p.lokasi || "Lokasi")}${p.tahun ? ", " + esc(p.tahun) : ""}</button>` : `<span class="ak-prodi">${esc(p.lokasi || "")}</span>`).join("")}</div>` : ""}
      ${strs(x.mitra).length ? `<p class="ak-lper">Mitra: ${esc(strs(x.mitra).join(", "))}</p>` : ""}${dlist(x.paten).length ? `<p class="ak-lper">Paten: ${dlist(x.paten).map(t => urlOk(t.sumber_url) ? tautanLuar(urlOk(t.sumber_url), esc(t.nomor)) : esc(t.nomor)).join(", ")}</p>` : ""}
      ${x.klaim ? `<p class="ak-lper"><span class="ak-izin contoh">Klaim pembuat</span> ${esc(x.klaim)}</p>` : ""}
      <div class="ak-lfoot">${web ? `<a class="ak-lnk" href="${esc(web)}" ${LUAR}>${ikon(IKON_WEB, "currentColor")}<em>Situs</em>${esc(urlHost(web))}</a>` : ""}${sm.map(s => lSum(urlOk(s.url), x.diperiksa).replace(">Sumber<", `>Sumber ${esc(s.butir || "")}<`)).join("")}<button type="button" class="ak-pk" data-brt="inovasi:${esc(x.id)}">Berita terkait</button>${lbPeriksa(x)}</div></article>`; };
  function gambarIn(gulir) {
    inHasil = inArr.filter(x => (!IN.rumpun || strs(x.rumpun).includes(IN.rumpun)) && (!IN.jenis || x.jenis === IN.jenis) && (!IN.status || x.status === IN.status) && (!IN.prov || inProv(x).includes(IN.prov)) && (!IN.pembuat || dlist(x.pembuat).some(b => b.jenis === IN.pembuat)) && (!IN.q || x._cari.includes(IN.q.toLowerCase())));
    const n = inHasil.length, a = (IN.hal - 1) * INPER;
    $("akInJ").innerHTML = `<b>${angka(n)}</b> inovasi kebencanaan${IN.rumpun ? ` ${esc((RUMPUN[IN.rumpun] || [IN.rumpun])[0].toLowerCase())}` : ""}`;
    $("akInL").innerHTML = n ? `<div class="ak-daftar">${inHasil.slice(a, a + INPER).map(kartuInP).join("")}</div>` : `<p class="ak-khampa">Tidak ada inovasi yang cocok.</p>`;
    $("akInH").innerHTML = navHal(IN.hal, n, INPER, "inovasi");
    petaIn(); if (gulir) gulirKe("akInJ");
  }
  function petaIn() {
    if (!inMap?.siap) return; const f = inHasil.flatMap(x => dlist(x.penerapan).filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon)).map(p => ({type: "Feature", properties: {id: x.id, nama: x.nama, lokasi: p.lokasi || "", status: x.status || "", warna: STATUS_IN[x.status] || "#6b7280"}, geometry: {type: "Point", coordinates: [p.lon, p.lat]}})));
    inMap.m.getSource("inv").setData({type: "FeatureCollection", features: f});
  }
  async function bangunInovasi(p, d) {
    if (!lbArr.length) { const l = await ambilData("lembaga"); if (l) indeksLb(l); }
    inArr = dlist(Array.isArray(d) ? d : d?.inovasi).filter(x => x && x.id && x.nama).map(x => Object.assign(x, {_cari: [x.nama, x.ringkasan, x.jenis, ...dlist(x.pembuat).map(b => b.nama), ...strs(x.mitra)].filter(Boolean).join(" ").toLowerCase()}));
    Object.assign(IN, {rumpun: GL.r, jenis: "", status: "", prov: "", pembuat: "", q: "", hal: 1}); inMap = null;
    const hit = f => { const n = {}; inArr.forEach(x => { for (const k of [].concat(f(x))) if (k) n[k] = (n[k] || 0) + 1; }); return n; }, nR = hit(x => strs(x.rumpun)), nJ = hit(x => x.jenis), nS = hit(x => x.status), nP = hit(inProv), nB = hit(x => [...new Set(dlist(x.pembuat).map(b => b.jenis))]);
    const bar = (n, warna, lab) => { const rows = Object.entries(n).sort((a, b) => b[1] - a[1]), mx = Math.max(1, ...rows.map(r => r[1])); return `<div class="ak-bars">${rows.map(([k, c]) => { const w = warna(k), l = lab(k);
      return `<div class="ak-br" tabindex="0" data-tt="${esc(l)}" data-tv="${esc(angka(c) + " inovasi")}" data-tk="${esc((c / inArr.length * 100).toLocaleString("id-ID", {maximumFractionDigits: 1}) + "% dari " + angka(inArr.length))}" data-tc="${esc(w)}" style="--w0:${w}"><span class="ak-bl">${esc(l)}</span><span class="ak-bt"><i style="width:${Math.max(8, c / mx * 100)}%"><b>${angka(c)}</b></i></span></div>`; }).join("")}</div>`; };
    p.innerHTML = `<section class="ak-panel ak-lA"><div class="ak-pil"><span class="ak-r utama" style="--w0:#f59f00">Ringkasan</span></div><h2 class="ak-judulv"><b>${angka(inArr.length)}</b> inovasi kebencanaan, <b>${angka(nS.terpasang || 0)}</b> terpasang</h2>
        <div class="ak-komp"><div><h3 class="ak-lh">Per rumpun</h3>${bar(nR, r => (RUMPUN[r] || [])[2] || "#6b7280", r => (RUMPUN[r] || [r])[0])}</div><div><h3 class="ak-lh">Per jenis teknologi</h3>${bar(nJ, () => "#1c7ed6", kapital)}</div></div>
        <div><h3 class="ak-lh">Per status</h3>${bar(nS, k => STATUS_IN[k] || "#6b7280", kapital)}</div>
        <div class="ak-ptaisi"><div id="akInMap" class="ak-map ak-mapkecil" role="application" aria-label="Peta lokasi penerapan inovasi"></div></div>
        <div class="ak-pil ak-legenda">${Object.entries(STATUS_IN).map(([k, c]) => `<span class="ak-r"><i class="ak-sw" style="background:${c}"></i>${esc(kapital(k))}</span>`).join("")}</div>
        <p class="ak-lkaki">Sumber: direktori inovasi kebencanaan Centurisk97, tiap butir bertaut ke sumbernya. Klaim kinerja hanya dikutip dari pembuat. Lokasi hanya yang tertulis di sumber.</p></section>
      <div class="ak-saring"><div class="ak-alat">${cariKotak("akInQ", "Cari nama inovasi, pembuat, atau mitra")}</div>
        <div class="ak-baris ak-baris3">${htmlPilih("akInRp", IKON_PIN, "Cari rumpun")}${htmlPilih("akInJn", IKL.jenis, "Cari jenis teknologi")}${htmlPilih("akInSt", IK_BAR, "Cari status")}</div>
        <div class="ak-baris">${htmlPilih("akInPv", IKON_PIN, "Cari provinsi penerapan")}${htmlPilih("akInPb", IK_GEDUNG, "Cari jenis pembuat")}</div></div>
      <div class="ak-hasil"><h2 class="ak-judulv" id="akInJ"></h2><div id="akInL"></div><nav id="akInH" class="ak-hal" aria-label="Halaman daftar inovasi" aria-live="polite"></nav></div>`;
    const jalan = () => { const t = ++intok; nanti(() => { if (t === intok) gambarIn(false); }); }, ubah = (k, v) => { IN[k] = v; IN.hal = 1; jalan(); }, op = (n, lab) => () => Object.entries(n).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, lab(v), c]);
    pasangPilih("akInRp", {semua: "Semua rumpun", nilai: () => IN.rumpun, opsi: op(nR, r => (RUMPUN[r] || [r])[0]), pilih: v => ubah("rumpun", v)});
    pasangPilih("akInJn", {semua: "Semua jenis teknologi", nilai: () => IN.jenis, opsi: op(nJ, kapital), pilih: v => ubah("jenis", v)});
    pasangPilih("akInSt", {semua: "Semua status", nilai: () => IN.status, opsi: op(nS, kapital), pilih: v => ubah("status", v)});
    pasangPilih("akInPv", {semua: "Semua provinsi penerapan", nilai: () => IN.prov, opsi: op(nP, provT), pilih: v => ubah("prov", v)});
    pasangPilih("akInPb", {semua: "Semua jenis pembuat", nilai: () => IN.pembuat, opsi: op(nB, kapital), pilih: v => ubah("pembuat", v)});
    let tt = 0; $("akInQ").addEventListener("input", e => { clearTimeout(tt); tt = setTimeout(() => ubah("q", e.target.value.trim()), 250); });
    pasangHal("akInH", h => { IN.hal = h; gambarIn(true); });
    p.addEventListener("click", e => { const b = e.target.closest("[data-inpeta]"); if (!b || !inMap?.siap) return; const [la, lo] = b.dataset.inpeta.split(",").map(Number); inMap.m.flyTo({center: [lo, la], zoom: 9}); $("akInMap").scrollIntoView({block: "center"}); });
    const tip = $("akTip"); p.addEventListener("pointermove", e => { const t = e.target.closest("[data-tt]"); if (!t) { if (!e.target.closest(".maplibregl-canvas")) tip.hidden = true; return; }
      tip.innerHTML = `<b>${esc(t.dataset.tt)}</b><span><i style="background:${esc(t.dataset.tc)}"></i>${esc(t.dataset.tv)}</span><small>${esc(t.dataset.tk)}</small>`; tip.hidden = false; tip.style.left = Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8) + "px"; tip.style.top = Math.max(8, e.clientY - tip.offsetHeight - 12) + "px"; });
    p.addEventListener("pointerleave", () => { tip.hidden = true; });
    gambarIn(false);
    try { await muatMapLib(); } catch (e) { $("akInMap").innerHTML = '<p class="ak-khampa">Peta tidak bisa dimuat.</p>'; return; }
    const m = new maplibregl.Map({container: "akInMap", style: "https://tiles.openfreemap.org/styles/positron", center: [118, -2.4], zoom: 3.8, minZoom: 3, dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true}});
    m.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right"); inMap = {m, siap: false}; m.once("load", () => m.resize()); new ResizeObserver(() => m.resize()).observe($("akInMap"));
    m.on("load", () => { m.addSource("inv", {type: "geojson", data: {type: "FeatureCollection", features: []}});
      m.addLayer({id: "inv-dot", type: "circle", source: "inv", paint: {"circle-color": ["get", "warna"], "circle-radius": 7, "circle-stroke-color": "#fff", "circle-stroke-width": 2}});
      m.on("mousemove", "inv-dot", e => { const pr = e.features[0].properties; m.getCanvas().style.cursor = "pointer"; tipPeta(e, `<b>${esc(kapital(pr.status))}</b><span>${esc(pr.nama)}</span><small>${esc(pr.lokasi)}</small>`); });
      m.on("mouseleave", "inv-dot", () => { m.getCanvas().style.cursor = ""; $("akTip").hidden = true; });
      m.on("click", "inv-dot", e => { const id = e.features[0].properties.id, x = inArr.find(y => y.id === id); if (!x) return; IN.q = ""; Object.assign(IN, {rumpun: "", jenis: "", status: "", prov: "", pembuat: "", hal: 1}); IN.q = x.nama.toLowerCase(); $("akInQ").value = x.nama; nanti(() => { gambarIn(false); gulirKe("akInJ"); }); });
      inMap.siap = true; petaIn(); });
  }

  /* ---- tab Sistem data (L4D, PRD 6.8): sistem dan sumber data lembaga lain, mana yang bisa diambil ---- */
  const AKSES = {"terbuka": ["Terbuka tanpa login", "#2b8a3e"], "api-terbuka": ["API terbuka", "#1c7ed6"], "api-kunci": ["API berkunci gratis", "#0b7285"], "login": ["Perlu login", "#b25e00"], "permohonan": ["Permohonan resmi", "#862e9c"], "tertutup": ["Tertutup", "#c92a2a"]};
  const SD = {rumpun: "", akses: "", pemilik: "", jenis: "", pakai: "", q: "", hal: 1}, SDPER = 18;
  let sdArr = [], sdHasil = [], sdtok = 0;
  const siapAmbil = x => (x.akses === "terbuka" || x.akses === "api-terbuka") && !x.dipakai_pantau;
  const kartuSdP = x => { const own = x.lembaga_id && lbMap.get(x.lembaga_id), [al] = AKSES[x.akses] || [x.akses || "-"];
    return kartuPola({attr: `data-sd="${esc(x.id)}"`, sosok: sosokPola(own?.logo, x.pemilik || x.nama), nama: x.nama, status: [x.akses === "terbuka" || x.akses === "api-terbuka" || x.akses === "api-kunci" ? "sinta" : x.akses === "tertutup" ? "merah" : "biru", al], navy: x.pemilik, biru: x.dipakai_pantau ? "Dipakai Pantau Bencana" : "", rumpun: x.rumpun,
      metrik: [["data", "Jenis data", strs(x.jenis_data)[0] || "-", 1], ["sensor", "Sensor", strs(x.sensor)[0] || "-", 1], ["frek", "Frekuensi", x.frekuensi || "-", 1]]}); };
  const kartuSd = x => { const [al, aw] = AKSES[x.akses] || [x.akses || "Akses belum tercatat", "#6b7280"], portal = urlOk(x.portal_url), api = urlOk(x.api_url), sm = dlist(x.sumber).filter(s => s && urlOk(s.url));
    const baris = [["Jenis data", strs(x.jenis_data).join(", "), "jenis_data"], ["Sensor", strs(x.sensor).join(", "), "sensor"], ["Cakupan", x.cakupan, "cakupan"], ["Rentang", x.rentang, "rentang"], ["Pembaruan", x.frekuensi, "frekuensi"], ["Format", strs(x.format).join(", "), "format"], ["Lisensi", x.lisensi, "lisensi"]].filter(r => r[1]);
    return `<article class="ak-psk"><div class="ak-psatas"><h4>${esc(x.nama)}${x.kepanjangan ? ` <small>(${esc(x.kepanjangan)})</small>` : ""}</h4></div>
      <div class="ak-pil"><span class="ak-izin" style="background:${aw}">${esc(al)}</span>${x.status ? `<span class="ak-izin ${x.status === "hidup" ? "berlaku" : "dicabut"}">${esc(kapital(x.status))}</span>` : ""}${x.dipakai_pantau ? '<span class="ak-izin mitra">Sudah dipakai Pantau Bencana</span>' : ""}${strs(x.rumpun).map(r => pilRumpun(r)).join("")}${pilContoh(x)}</div>
      <div class="ak-pil"><small class="ak-lper">Pemilik</small>${x.lembaga_id && lbMap.has(x.lembaga_id) ? `<button type="button" class="ak-pk" data-lb="${esc(x.lembaga_id)}">${esc(x.pemilik)}</button>` : `<span class="ak-prodi">${esc(x.pemilik || "Tidak tercatat")}</span>`}</div>
      ${x.uraian ? `<p class="ak-rata">${esc(x.uraian)}</p>` : ""}${baris.length ? `<dl class="ak-sdl">${baris.map(([k, v, f]) => `<dt>${k}</dt><dd>${esc(v)}${strs(x.diverifikasi).includes(f) ? "" : ' <small class="ak-izin belum">Belum diverifikasi ke halaman</small>'}</dd>`).join("")}</dl>` : ""}
      ${x.cara_minta ? `<p class="ak-lper"><b>Cara meminta:</b> ${esc(x.cara_minta)}</p>` : ""}
      <div class="ak-lfoot">${portal ? `<a class="ak-rbtn ak-rbtn-b" href="${esc(portal)}" ${LUAR}>${ikon(IK_LUAR, "currentColor")}Portal</a>` : ""}${api ? `<a class="ak-rbtn ak-rbtn-b" href="${esc(api)}" ${LUAR}>${ikon(IK_LUAR, "currentColor")}API</a>` : ""}${sm.map(s => lSum(urlOk(s.url), x.diperiksa).replace(">Sumber<", `>Sumber ${esc(s.butir || "")}<`)).join("")}${lbPeriksa(x)}</div></article>`; };
  function gambarSd(gulir) {
    sdHasil = sdArr.filter(x => (!SD.rumpun || strs(x.rumpun).includes(SD.rumpun)) && (!SD.akses || x.akses === SD.akses) && (!SD.pemilik || x.pemilik === SD.pemilik) && (!SD.jenis || strs(x.jenis_data).includes(SD.jenis)) && (!SD.pakai || (SD.pakai === "sudah") === !!x.dipakai_pantau) && (!SD.q || x._cari.includes(SD.q.toLowerCase())));
    const n = sdHasil.length, a = (SD.hal - 1) * SDPER;
    $("akSdJ").innerHTML = `<b>${angka(n)}</b> sistem dan sumber data`;
    $("akSdL").innerHTML = n ? `<div class="ak-daftar">${sdHasil.slice(a, a + SDPER).map(kartuSdP).join("")}</div>` : `<p class="ak-khampa">Tidak ada sistem yang cocok.</p>`;
    $("akSdH").innerHTML = navHal(SD.hal, n, SDPER, "sistem");
    if (gulir) gulirKe("akSdJ");
  }
  async function bangunSd(p, d) {
    if (!lbArr.length) { const l = await ambilData("lembaga"); if (l) indeksLb(l); }
    sdArr = dlist(Array.isArray(d) ? d : d?.sistem).filter(x => x && x.id && x.nama).map(x => Object.assign(x, {_cari: [x.nama, x.kepanjangan, x.pemilik, x.uraian, ...strs(x.jenis_data), ...strs(x.sensor)].filter(Boolean).join(" ").toLowerCase()}));
    Object.assign(SD, {rumpun: GL.r, akses: "", pemilik: "", jenis: "", pakai: "", q: "", hal: 1});
    const hit = f => { const n = {}; sdArr.forEach(x => { for (const k of [].concat(f(x))) if (k) n[k] = (n[k] || 0) + 1; }); return n; }, nA = hit(x => x.akses), nR = hit(x => strs(x.rumpun)), nP = hit(x => x.pemilik), nJ = hit(x => strs(x.jenis_data)), belum = sdArr.filter(siapAmbil);
    const bar = (n, warna, lab, maks) => { const rows = Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, maks || 99), mx = Math.max(1, ...rows.map(r => r[1])); return `<div class="ak-bars">${rows.map(([k, c]) => { const w = warna(k), l = lab(k);
      return `<div class="ak-br" tabindex="0" data-tt="${esc(l)}" data-tv="${esc(angka(c) + " sistem")}" data-tk="${esc((c / sdArr.length * 100).toLocaleString("id-ID", {maximumFractionDigits: 1}) + "% dari " + angka(sdArr.length))}" data-tc="${esc(w)}" style="--w0:${w}"><span class="ak-bl">${esc(l)}</span><span class="ak-bt"><i style="width:${Math.max(8, c / mx * 100)}%"><b>${angka(c)}</b></i></span></div>`; }).join("")}</div>`; };
    p.innerHTML = `<section class="ak-panel ak-lA"><div class="ak-pil"><span class="ak-r utama" style="--w0:#0b7285">Ringkasan</span></div><h2 class="ak-judulv"><b>${angka(belum.length)}</b> dari ${angka(sdArr.length)} sistem bisa langsung diambil dan belum dipakai Pantau Bencana</h2>
        <div class="ak-komp"><div><h3 class="ak-lh">Per akses</h3>${bar(nA, k => (AKSES[k] || [])[1] || "#6b7280", k => (AKSES[k] || [k])[0])}</div><div><h3 class="ak-lh">Per rumpun</h3>${bar(hit(x => strs(x.rumpun)), r => (RUMPUN[r] || [])[2] || "#6b7280", r => (RUMPUN[r] || [r])[0])}</div></div>
        <div><h3 class="ak-lh">Per pemilik (sepuluh terbanyak)</h3>${bar(nP, () => "#1c7ed6", k => k, 10)}</div>
        <div><h3 class="ak-lh">Bisa langsung diambil, belum dipakai</h3><div class="ak-pil">${belum.slice(0, 30).map(x => `<span class="ak-prodi" title="${esc(x.pemilik || "")}">${esc(x.nama)}</span>`).join("") || '<span class="ak-lper">Tidak ada.</span>'}</div></div>
        <p class="ak-lkaki">Sumber: direktori sistem data Centurisk97; akses diuji hanya dengan membuka halaman atau endpoint publik. Tanggal periksa tercatat di tiap kartu.</p></section>
      <div class="ak-saring"><div class="ak-alat">${cariKotak("akSdQ", "Cari sistem, pemilik, atau jenis data")}</div>
        <div class="ak-baris ak-baris3">${htmlPilih("akSdRp", IKON_PIN, "Cari rumpun")}${htmlPilih("akSdAk", IK_BAR, "Cari akses")}${htmlPilih("akSdPm", IK_GEDUNG, "Cari pemilik")}</div>
        <div class="ak-baris">${htmlPilih("akSdJn", IKL.jenis, "Cari jenis data")}${htmlPilih("akSdPk", IK_UANG, "Cari status pemakaian")}</div></div>
      <div class="ak-hasil"><h2 class="ak-judulv" id="akSdJ"></h2><div id="akSdL"></div><nav id="akSdH" class="ak-hal" aria-label="Halaman daftar sistem" aria-live="polite"></nav></div>`;
    const jalan = () => { const t = ++sdtok; nanti(() => { if (t === sdtok) gambarSd(false); }); }, ubah = (k, v) => { SD[k] = v; SD.hal = 1; jalan(); }, op = (n, lab) => () => Object.entries(n).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, lab(v), c]);
    pasangPilih("akSdRp", {semua: "Semua rumpun", nilai: () => SD.rumpun, opsi: op(nR, r => (RUMPUN[r] || [r])[0]), pilih: v => ubah("rumpun", v)});
    pasangPilih("akSdAk", {semua: "Semua akses", nilai: () => SD.akses, opsi: op(nA, k => (AKSES[k] || [k])[0]), pilih: v => ubah("akses", v)});
    pasangPilih("akSdPm", {semua: "Semua pemilik", nilai: () => SD.pemilik, opsi: op(nP, k => k), pilih: v => ubah("pemilik", v)});
    pasangPilih("akSdJn", {semua: "Semua jenis data", nilai: () => SD.jenis, opsi: op(nJ, kapital), pilih: v => ubah("jenis", v)});
    pasangPilih("akSdPk", {semua: "Sudah dan belum dipakai", nilai: () => SD.pakai, opsi: () => [["sudah", "Sudah dipakai Pantau Bencana", sdArr.filter(x => x.dipakai_pantau).length], ["belum", "Belum dipakai", sdArr.filter(x => !x.dipakai_pantau).length]], pilih: v => ubah("pakai", v)});
    let tt = 0; $("akSdQ").addEventListener("input", e => { clearTimeout(tt); tt = setTimeout(() => ubah("q", e.target.value.trim()), 250); });
    pasangHal("akSdH", h => { SD.hal = h; gambarSd(true); });
    const tip = $("akTip"); p.addEventListener("pointermove", e => { const t = e.target.closest("[data-tt]"); if (!t) { tip.hidden = true; return; }
      tip.innerHTML = `<b>${esc(t.dataset.tt)}</b><span><i style="background:${esc(t.dataset.tc)}"></i>${esc(t.dataset.tv)}</span><small>${esc(t.dataset.tk)}</small>`; tip.hidden = false; tip.style.left = Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8) + "px"; tip.style.top = Math.max(8, e.clientY - tip.offsetHeight - 12) + "px"; });
    p.addEventListener("pointerleave", () => { tip.hidden = true; });
    gambarSd(false);
  }

  /* ---- pilih bencana global (berlaku di semua tab) ---- */
  const GL = {r: ""}; let pkSub = "akademisi";
  const GLB = [["", "Semua bencana"], ["gempa", "Gempa"], ["tsunami", "Tsunami"], ["gunung api", "Gunung api"], ["banjir", "Banjir"], ["longsor", "Longsor"], ["karhutla", "Karhutla"], ["kekeringan", "Kekeringan"], ["hidrometeorologi", "Cuaca ekstrem"], ["pesisir", "Pesisir"], ["iklim", "Iklim"], ["kesehatan bencana", "Kesehatan bencana"]];
  const namaBencana = r => (GLB.find(x => x[0] === r) || [r, r])[1];
  function setBencana(r) {
    GL.r = r; setChip("akBencana", r); st.rumpun = new Set(r ? [r] : []); R.rumpun = r; K.jenis = r; K.hal = 1;
    for (const v of ["lembaga", "pendanaan", "inovasi", "sistem_data", "pustaka", "berita", "riset", "kejadian", "tokoh"]) delete sudah[v];
    try { const u = new URL(location.href); r ? u.searchParams.set("bencana", r) : u.searchParams.delete("bencana"); history.replaceState(null, "", u); } catch (e) {}
    saring(); if (MUAT[tampilSkrg]) nanti(() => bukaView(tampilSkrg === "pakar" ? "tokoh" : tampilSkrg));
  }
  /* ---- gelombang 2: tokoh publik, pustaka, profil wilayah ---- */
  const wilKunci = (p, k) => k ? p + "|" + k : p;
  const wilTeks = w => { const [p, k] = String(w).split("|"); return k ? `${k}, ${provT(p)}` : provT(p); };
  const bagW = (judul, isi, sumber, n) => `<section class="ak-panel ak-lA"><h2 class="ak-judulv">${judul}${n != null ? `<small class="ak-lper"> ${angka(n)}</small>` : ""}</h2>${isi || '<p class="ak-khampa">Belum ada data.</p>'}<p class="ak-lkaki">Sumber: ${sumber}</p></section>`;

  /* ---- tokoh publik (segmen di tab Pakar) ---- */
  const TK = {q: "", jenis: "", prov: "", hal: 1}, TKPER = 18;
  let tkArr = [], tkHasil = [], tktok = 0;
  const fotoTk = (x, besar) => urlOk(x.foto_url) ? `<img class="ak-foto${besar ? " besar" : ""}" src="${esc(urlOk(x.foto_url))}" alt="" loading="lazy" referrerpolicy="no-referrer" data-inisial="${esc(inisial(x.nama))}">` : `<span class="ak-foto${besar ? " besar" : ""}" aria-hidden="true">${esc(inisial(x.nama))}</span>`;
  const kartuTk = (x, i) => kartuPola({attr: `data-tk="${i}"`, sosok: sosokPola(x.foto_url, x.nama), nama: x.nama, status: x.jenis ? ["sinta", kapital(x.jenis)] : null, navy: x.lembaga, biru: x.peran, rumpun: x.rumpun,
    metrik: [["kiprah", "Kiprah", angka(dlist(x.kiprah).length)], ["berita", "Berita", BRC.has("tokoh:" + x.id) ? angka(BRC.get("tokoh:" + x.id)) : "-"], ["medsos", "Medsos", angka(Object.values(x.medsos_resmi || {}).filter(urlOk).length)]]});
  function sheetTk(x) {
    const web = urlOk(x.web), wd = /^Q\d+$/.test(x.wikidata || "") ? `https://www.wikidata.org/wiki/${x.wikidata}` : "", lem = x.lembaga && lbArr.find(y => namaLb(y).includes(nrm(x.lembaga))), srcs = [...dlist(x.sumber).map(s => s?.url), web, wd, ...dlist(x.kiprah).map(k => k.sumber_url), ...Object.values(x.medsos_resmi || {})];
    const yk = x.yakin || yakinOrang(srcs, [["peran", x.peran], ["foto", urlOk(x.foto_url)], ["situs resmi", web], ["kiprah", dlist(x.kiprah).length]], x.diperiksa), kon = medsosPasang(x) + (web ? kItem(x, "web", IKON_WEB, "Situs", web, urlHost(web)) : "");
    const ring = `Menurut Direktori Kebencanaan${x.diperiksa ? ` (diperbarui ${tglID(x.diperiksa)})` : ""}, ${x.nama}${x.peran ? ` berperan sebagai ${x.peran}` : ""}${x.lembaga ? ` di ${x.lembaga}` : ""}${dlist(x.kiprah)[0]?.teks ? `; kiprah: ${dlist(x.kiprah)[0].teks}` : ""}.`;
    const sj = tkArr.filter(y => y.id !== x.id && strs(y.rumpun).some(r => strs(x.rumpun).includes(r))).sort((a, b) => (String(b.prov) === String(x.prov)) - (String(a.prov) === String(x.prov)) || dlist(b.kiprah).length - dlist(a.kiprah).length).slice(0, 6);
    bukaSheet("tokoh", `<div class="ak-dkepala"><div class="ak-dk-atas">${fotoTk(x, true)}<div class="ak-nama"><h2 id="akSJudul">${esc(x.nama)}</h2><p>${esc([x.peran, x.lembaga].filter(Boolean).join(", "))}</p></div></div><div class="ak-pil">${x.jenis ? `<span class="ak-prodi">${esc(kapital(x.jenis))}</span>` : ""}${x.prov ? `<span class="ak-ptl">${esc(provT(x.prov))}</span>` : ""}${strs(x.rumpun).map(r => pilRumpun(r)).join("")}${pilContoh(x)}</div>
      <p class="ak-rata ak-ringk">${esc(ring)}</p><div class="ak-pil">${web ? `<a class="ak-rbtn" href="${esc(web)}" ${LUAR}>${ikon(IK_LUAR, "currentColor")}Situs resmi</a>` : ""}${koreksiBtn("tokoh", x.id)}</div><div class="ak-korw"></div></div>`,
      () => `<div class="ak-bgrup">${barisB("Peran kini", x.peran ? `<b>${esc(x.peran)}</b>` : "", web)}${barisB("Lembaga", x.lembaga ? (lem ? `<button type="button" class="ak-pk" data-lb="${esc(lem.id)}">${esc(x.lembaga)}</button>` : `<b>${esc(x.lembaga)}</b>`) : "", "")}${barisB("Afiliasi lain", dlist(x.afiliasi).map(a => esc(a.nama_lembaga || a)).join(", "), "")}
        ${barisB("Keahlian dan rumpun", strs(x.rumpun).length ? `<span class="ak-pil">${strs(x.rumpun).map(r => pilRumpun(r)).join("")}</span>` : "", "")}
        <div class="ak-bl2"><span class="ak-bk">Kontak</span><div class="ak-bn">${kon ? `<div class="ak-lkontak">${kon}</div>` : `<b>belum ada kontak bersumber</b>`}<small>Hanya tautan resmi, tanpa kontak pribadi</small></div></div></div>`
        + bagB("Kiprah kebencanaan", dlist(x.kiprah).length ? `<ul class="ak-lsumber">${dlist(x.kiprah).map(k => `<li>${esc(k.teks || "")}${k.tahun ? ` <small class="ak-lper">${esc(k.tahun)}</small>` : ""} ${cip(k.sumber_url)}</li>`).join("")}</ul>` : "")
        + '<div id="akTkBuku"></div><div id="akTkBrt"></div>' + bagB("Seberapa yakin kita", yakinHtml(yk)) + bagB("Sumber", sumberList(srcs))
        + bagB("Tokoh sejenis", sj.length ? `<div class="ak-pil">${sj.map(y => `<button type="button" class="ak-pk" data-tks="${esc(y.id)}">${esc(y.nama)}</button>`).join("")}</div>` : ""));
    $("akSheet").dataset.k = ""; const tk = tokenS; ambilData("berita").then(d => { const h = brtHtml("tokoh", x.id, d); if (h) isiNanti(() => tk === tokenS, "akTkBrt", h); }); ambilData("buku").then(d => { const h = bukuOrang("tokoh", x.id, d); if (h) isiNanti(() => tk === tokenS, "akTkBuku", h); });
  }
  function gambarTk(gulir) {
    tkHasil = tkArr.filter(x => (!GL.r || strs(x.rumpun).includes(GL.r)) && (!TK.jenis || x.jenis === TK.jenis) && (!TK.prov || String(x.prov) === TK.prov) && (!TK.q || x._cari.includes(TK.q.toLowerCase())));
    const n = tkHasil.length, a = (TK.hal - 1) * TKPER;
    $("akTkJ").innerHTML = `<b>${angka(n)}</b> tokoh publik`;
    $("akTkL").innerHTML = n ? `<div class="ak-daftar">${tkHasil.slice(a, a + TKPER).map((x, j) => kartuTk(x, a + j)).join("")}</div>` : `<p class="ak-khampa">Tidak ada tokoh yang cocok.</p>`;
    $("akTkH").innerHTML = navHal(TK.hal, n, TKPER, "tokoh");
    if (gulir) gulirKe("akTkJ");
  }
  function bangunTokoh(p, d) {
    tkArr = dlist(Array.isArray(d) ? d : d?.tokoh).filter(x => x && x.id && x.nama).map(x => Object.assign(x, {_cari: [x.nama, x.peran, x.lembaga].filter(Boolean).join(" ").toLowerCase()}));
    Object.assign(TK, {q: "", jenis: "", prov: "", hal: 1});
    const hit = f => { const n = {}; tkArr.forEach(x => { const k = f(x); if (k) n[k] = (n[k] || 0) + 1; }); return n; }, nJ = hit(x => x.jenis), nP = hit(x => x.prov == null ? "" : String(x.prov));
    p.innerHTML = `<div class="ak-saring"><div class="ak-alat">${cariKotak("akTkQ", "Cari nama, peran, atau lembaga")}</div><div class="ak-baris">${htmlPilih("akTkJn", IKL.jenis, "Cari jenis tokoh")}${htmlPilih("akTkP", IKON_PIN, "Cari provinsi")}</div></div>
      <div class="ak-hasil"><h2 class="ak-judulv" id="akTkJ"></h2><div id="akTkL"></div><nav id="akTkH" class="ak-hal" aria-label="Halaman daftar tokoh" aria-live="polite"></nav></div>`;
    const jalan = () => { const t = ++tktok; nanti(() => { if (t === tktok) gambarTk(false); }); }, ubah = (k, v) => { TK[k] = v; TK.hal = 1; jalan(); };
    pasangPilih("akTkJn", {semua: "Semua jenis", nilai: () => TK.jenis, opsi: () => Object.entries(nJ).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, kapital(v), c]), pilih: v => ubah("jenis", v)});
    pasangPilih("akTkP", {semua: "Semua provinsi", nilai: () => TK.prov, opsi: () => Object.entries(nP).filter(([v]) => v).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, provT(v), c]), pilih: v => ubah("prov", v)});
    let tt = 0; $("akTkQ").addEventListener("input", e => { clearTimeout(tt); tt = setTimeout(() => ubah("q", e.target.value.trim()), 250); });
    pasangHal("akTkH", h => { TK.hal = h; gambarTk(true); });
    const buka1 = e => { const c = e.target.closest("[data-tk]"); if (c && tkHasil[+c.dataset.tk]) sheetTk(tkHasil[+c.dataset.tk]); };
    $("akTkL").addEventListener("click", buka1); $("akTkL").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-tk]")) { e.preventDefault(); buka1(e); } });
    gambarTk(false);
  }
  function pasangPkSeg(v) {
    const ada = v === "pakar"; $("akPkSeg").hidden = !ada; const tok = ada && pkSub === "tokoh";
    $("akIsi").hidden = !ada || tok; $("akv-tokoh").hidden = !tok; if (tok) bukaView("tokoh");
    setSeg("akPkSeg", pkSub);
  }

  /* ---- pustaka dokumen ---- */
  const PU = {jenis: "", prov: "", tahun: "", q: "", hal: 1}, PUPER = 25, JENIS_DOK = ["regulasi", "KRB", "RPB", "renkon", "R3P", "Jitupasna", "laporan kejadian", "kajian", "SOP", "rencana aksi"];
  let puArr = [], puHasil = [], putok = 0;
  const wilDok = d => dlist(d.wilayah).filter(w => w && w.prov);
  function gambarPu(gulir) {
    puHasil = puArr.filter(d => (!PU.jenis || String(d.jenis).toLowerCase() === PU.jenis.toLowerCase()) && (!PU.prov || wilDok(d).some(w => String(w.prov) === PU.prov)) && (!PU.tahun || String(d.tahun) === PU.tahun) && (!GL.r || strs(d.rumpun).includes(GL.r)) && (!PU.q || d._cari.includes(PU.q.toLowerCase())));
    const n = puHasil.length, a = (PU.hal - 1) * PUPER;
    $("akPuJ").innerHTML = `<b>${angka(n)}</b> dokumen`;
    $("akPuL").innerHTML = n ? tabelHtml([["Judul"], ["Jenis"], ["Tahun", "c"], ["Wilayah"]], puHasil.slice(a, a + PUPER).map(d => { const u = urlOk(d.url) || urlOk(d.sumber_url);
      return [u ? tautanLuar(u, esc(d.judul)) : esc(d.judul), `<span class="ak-prodi">${esc(kapital(d.jenis || ""))}</span>`, esc(d.tahun ?? ""), wilDok(d).slice(0, 3).map(w => `<button type="button" class="ak-pk" data-wl="${esc(wilKunci(String(w.prov), w.kab || ""))}">${esc(wilTeks(wilKunci(String(w.prov), w.kab || "")))}</button>`).join(" ") + pilContoh(d)]; })) : `<p class="ak-khampa">Tidak ada dokumen yang cocok.</p>`;
    $("akPuH").innerHTML = navHal(PU.hal, n, PUPER, "dokumen");
    if (gulir) gulirKe("akPuJ");
  }
  function bangunPustaka(p, d) {
    puArr = dlist(Array.isArray(d) ? d : d?.dokumen).filter(x => x && x.judul).map(x => Object.assign(x, {_cari: [x.judul, x.jenis, ...wilDok(x).map(w => w.kab)].filter(Boolean).join(" ").toLowerCase()})).sort((a, b) => (b.tahun || 0) - (a.tahun || 0));
    Object.assign(PU, {jenis: "", prov: "", tahun: "", q: "", hal: 1});
    const hit = f => { const n = {}; puArr.forEach(x => { for (const k of [].concat(f(x))) if (k) n[k] = (n[k] || 0) + 1; }); return n; }, nJ = hit(x => x.jenis), nP = hit(x => wilDok(x).map(w => String(w.prov))), nT = hit(x => x.tahun);
    p.innerHTML = `${segHtml("akPuS", "Sub-tampilan pustaka", [["dok", "Dokumen", IKJ], ["buku", "Buku", IKJ]])}<div id="akPuDok" class="ak-tampilan"></div><div id="akPuBuku" class="ak-tampilan" hidden></div>`;
    $("akPuS").addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b) return; setSeg("akPuS", b.dataset.v); $("akPuDok").hidden = b.dataset.v !== "dok"; $("akPuBuku").hidden = b.dataset.v !== "buku"; if (b.dataset.v === "buku" && !$("akBkJ")) nanti(() => bangunBuku($("akPuBuku"))); });
    $("akPuDok").innerHTML = `<div class="ak-saring"><div class="ak-alat">${cariKotak("akPuQ", "Cari judul atau kab/kota")}</div><div class="ak-baris ak-baris3">${htmlPilih("akPuJn", IKL.jenis, "Cari jenis dokumen")}${htmlPilih("akPuP", IKON_PIN, "Cari provinsi")}${htmlPilih("akPuT", IKL.tahun, "Cari tahun")}</div></div>
      <div class="ak-hasil"><h2 class="ak-judulv" id="akPuJ"></h2><div id="akPuL"></div><nav id="akPuH" class="ak-hal" aria-label="Halaman daftar dokumen" aria-live="polite"></nav></div>`;
    const jalan = () => { const t = ++putok; nanti(() => { if (t === putok) gambarPu(false); }); }, ubah = (k, v) => { PU[k] = v; PU.hal = 1; jalan(); };
    pasangPilih("akPuJn", {semua: "Semua jenis", nilai: () => PU.jenis, opsi: () => JENIS_DOK.map(j => [j, j, nJ[j] || 0]).concat(Object.entries(nJ).filter(([j]) => !JENIS_DOK.includes(j)).map(([j, c]) => [j, kapital(j), c])), pilih: v => ubah("jenis", v)});
    pasangPilih("akPuP", {semua: "Semua provinsi", nilai: () => PU.prov, opsi: () => Object.entries(nP).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, provT(v), c]), pilih: v => ubah("prov", v)});
    pasangPilih("akPuT", {semua: "Semua tahun", nilai: () => PU.tahun, opsi: () => Object.entries(nT).sort((a, b) => b[0] - a[0]).map(([v, c]) => [v, v, c]), pilih: v => ubah("tahun", v)});
    let tt = 0; $("akPuQ").addEventListener("input", e => { clearTimeout(tt); tt = setTimeout(() => ubah("q", e.target.value.trim()), 250); });
    pasangHal("akPuH", h => { PU.hal = h; gambarPu(true); });
    gambarPu(false);
  }

  /* ---- profil wilayah ---- */
  const WL = {kode: ""};
  let dibiP = null;
  const pip = (lo, la, g) => (g.type === "Polygon" ? [g.coordinates] : g.coordinates).some(poly => { let d = false; const r = poly[0]; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > la) !== (yj > la) && lo < (xj - xi) * (la - yi) / (yj - yi) + xi) d = !d; } return d; });
  const hav = (a, b, c, d) => { const r = x => x * Math.PI / 180, h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
  const cocokKab = (nama, kab) => !kab || (nama && kunciKab(nama) === kunciKab(kab));
  async function renderWil(el) {
    const [pv, kab] = WL.kode.split("|"); el.innerHTML = hantuHtml + hantuHtml; const tok = ++renderWil.t;
    const [rk, dibi, sens, inov, w3, sd, ang, dok, tkh, geoK, pdn] = await Promise.all([risikoP ||= ambilJson("/banjir/data/risiko_kecamatan.json"), dibiP ||= ambilJson("/data/dibi_kejadian.json"), ambilData("sensor"), ambilData("inovasi"), ambilData("lembaga_3w"), ambilData("sistem_data"), ambilData("wilayah_anggaran"), ambilData("dokumen"), ambilData("tokoh"), ambilJson(`/geo/kabupaten/${pv}.json`), ambilData("pendanaan")]);
    if (tok !== renderWil.t) return;
    const fK = kab && geoK?.features?.find(f => cocokKab(f.properties.kab, kab)), pusat = fK ? (b => [(b[1] + b[3]) / 2, (b[0] + b[2]) / 2])(bbox(fK)) : null;
    const kec = dlist(rk?.kec).filter(r => r[0] === pv && cocokKab(r[1], kab)), skor = kec.map(r => r[3]).filter(v => v != null), rata = skor.length ? skor.reduce((a, b) => a + b, 0) / skor.length : null, pend = kec.reduce((a, r) => a + (r[13] || 0), 0);
    const ki = kelasIdx(rata, rk?.ambang || [15, 35, 60]), ev = dlist(dibi?.kejadian).filter(k => String(k.prov_kode) === pv && cocokKab(k.kab, kab)), evJ = {}; ev.forEach(k => { evJ[k.jenis] = (evJ[k.jenis] || 0) + (k.kejadian || 1); });
    const B = [];
    B.push(bagW("Ringkasan", rata != null || ev.length ? `<div class="ak-ringw"><div><b>${rata != null ? angka(Math.round(rata * 10) / 10) : "-"}</b><span>indeks risiko rata-rata${ki >= 0 ? `, ${esc((rk.kelas || [])[ki] || "")}` : ""}</span></div><div><b>${angka(kec.length)}</b><span>kecamatan</span></div><div><b>${(pend / 1e6).toLocaleString("id-ID", {maximumFractionDigits: 1})}</b><span>juta penduduk</span></div><div><b>${angka(ev.reduce((a, k) => a + (k.kejadian || 1), 0))}</b><span>kejadian bencana, ${esc(tglID(dibi?.dari))} sampai ${esc(tglID(dibi?.sampai))}</span></div></div>
        <div class="ak-pil">${Object.entries(evJ).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([j, n]) => `<span class="ak-prodi">${esc(j)}<small>${angka(n)}</small></span>`).join("")}</div>` : "", `indeks risiko kecamatan Centurisk97 (${esc(tglID(rk?.hari))}, dirata-ratakan); kejadian ${esc(dibi?.sumber || "DIBI BNPB")}`));
    const L = lbArr.filter(x => x.kategori !== "penerbit"), bp = L.filter(x => /bpbd/i.test(x.sub || "") || /^bpbd/i.test(x.nama)), bpW = bp.filter(x => x.prov === pv && (!kab || !x.kab || cocokKab(x.kab, kab) || /provinsi/i.test(x.nama)));
    B.push(bagW("BPBD dan nomornya", bpW.length ? `<div class="ak-bpbd">${bpW.map(x => `<div><h3>${esc(x.nama)}</h3>${strs(x.telepon).concat(strs(x.wa)).map(t => `<a href="${esc(telHref(t))}">${esc(telF(t))}</a>`).join("")}${strs(x.telepon).length + strs(x.wa).length ? "" : '<small class="ak-lper">Nomor belum tercatat</small>'}${lSumB(x, "telepon")}${lbPeriksa(x)}</div>`).join("")}</div>` : "", "direktori lembaga mitra, tiap nomor bertaut ke sumbernya"));
    const dw = L.filter(x => x.prov === pv && !bpW.includes(x) && (!kab || !x.kab || cocokKab(x.kab, kab))), dek = pusat ? L.filter(x => Number.isFinite(x.lat) && !bpW.includes(x)).map(x => [x, hav(pusat[0], pusat[1], x.lat, x.lon)]).sort((a, b) => a[1] - b[1]).slice(0, 8) : [];
    const kecilLb = (x, km) => `<li><button type="button" class="ak-sbuka" data-lb="${esc(x.id)}">${logoLb(x)}<span><b>${esc(x.nama)}</b><small>${esc(KAT[x.kategori]?.[0] || x.kategori)}${km != null ? `, ${km.toLocaleString("id-ID", {maximumFractionDigits: 0})} km` : ""}</small></span></button></li>`;
    B.push(bagW(kab ? "Lembaga di kab/kota ini dan terdekat" : "Lembaga di provinsi ini", dw.length || dek.length ? `<ol class="ak-sdaftar">${dw.slice(0, 12).map(x => kecilLb(x)).join("")}${dek.map(([x, km]) => kecilLb(x, km)).join("")}</ol>` : "", "direktori lembaga mitra; jarak garis lurus dari pusat kab/kota", dw.length));
    const pk = semua.filter(o => provO(o) === pv).sort((a, b) => b[4] - a[4]), tk = dlist(Array.isArray(tkh) ? tkh : tkh?.tokoh).filter(x => String(x.prov) === pv);
    B.push(bagW("Pakar dan tokoh", pk.length || tk.length ? `<ol class="ak-sdaftar">${pk.slice(0, 6).map(o => `<li>${kecil(o)}<em class="ak-hp">h-index <b>${angka(o[4])}</b></em></li>`).join("")}</ol>${tk.length ? `<div class="ak-pil">${tk.slice(0, 10).map(x => `<span class="ak-prodi">${esc(x.nama)}</span>`).join("")}</div>` : ""}` : "", `direktori pakar (kampus di provinsi), tokoh publik`, pk.length + tk.length));
    const geoP2 = await geoProvinsi(), gP = geoP2?.features.find(f => String(f.properties.kode) === pv), gArea = fK || gP, sn = gArea ? dlist(sens).filter(s => Number.isFinite(s.lat) && pip(s.lon, s.lat, gArea.geometry)) : [], snJ = {}; sn.forEach(s => { snJ[s.jenis] = (snJ[s.jenis] || 0) + 1; });
    B.push(bagW("Sensor terpasang", sn.length ? `<div class="ak-pil">${Object.entries(snJ).map(([j, n]) => `<span class="ak-izin" style="background:${WARNA_SENSOR[j] || "#6b7280"}">${esc(kapital(j))} ${angka(n)}</span>`).join("")}</div>${gArea ? miniPeta(gArea, sn) : ""}` : "", "jaringan sensor lembaga (titik di dalam batas wilayah BIG)", sn.length));
    const iv = dlist(Array.isArray(inov) ? inov : inov?.inovasi).filter(x => dlist(x.penerapan).some(p => String(p.prov) === pv && (!kab || !p.lokasi || nrm(p.lokasi).includes(nrm(kab.replace(/^(kabupaten|kota)\s+/i, ""))))));
    B.push(bagW("Inovasi yang pernah diterapkan", iv.length ? `<div class="ak-psgrid">${iv.slice(0, 6).map(kartuIn).join("")}</div>` : "", "direktori inovasi kebencanaan; klaim pembuat", iv.length));
    const pj = dlist(w3).filter(x => strs(x.prov).includes(pv));
    B.push(bagW("Proyek donor", pj.length ? tabelProyek(pj.slice(0, 15)) + '<span class="ak-tanda">Data dilaporkan donor ke IATI, bisa tidak lengkap</span>' : "", "proyek mitra (3W) tingkat provinsi", pj.length));
    const sdl = dlist(Array.isArray(sd) ? sd : sd?.sistem);
    B.push(bagW("Sistem data yang mencakup wilayah ini", sdl.length ? `<div class="ak-pil">${sdl.slice(0, 40).map(x => `<span class="ak-prodi" title="${esc(x.cakupan || "")}">${esc(x.nama)}${/nasional|indonesia/i.test(x.cakupan || "") ? " (nasional)" : ""}</span>`).join("")}</div>` : "", "direktori sistem data; sistem berjangkauan nasional ditandai", sdl.length));
    const pdw = dlist(Array.isArray(pdn) ? pdn : pdn?.pendanaan).filter(x => x.jenis_entri === "proyek" && strs(x.prov).includes(pv));
    B.push(bagW("Pendanaan", pdw.length ? tabelHtml(KOL_PROYEK, pdw.slice(0, 15).map(barisProyek)) : "", "direktori pendanaan (proyek dengan lokasi provinsi ini)", pdw.length));
    const an = dlist(ang).filter(r => String(r.prov) === pv && cocokKab(r.kab || "", r.kab ? kab : ""));
    B.push(bagW("Anggaran", an.length ? tabelHtml([["Tahun", "c"], ["Pos"], ["Jenis angka"], ["Nilai", "r"], ["Sumber"]], an.map(r => [esc(r.tahun ?? ""), esc(r.pos || ""), esc(r.jenis_angka || ""), "Rp " + angka(r.nilai_rp), lSum(urlOk(r.sumber_url))])) : "", "data anggaran wilayah, tiap angka bertaut ke sumbernya", an.length));
    const dk = dlist(Array.isArray(dok) ? dok : dok?.dokumen).filter(d => wilDok(d).some(w => String(w.prov) === pv && (!kab || !w.kab || cocokKab(w.kab, kab))));
    B.push(bagW("Dokumen", dk.length ? tabelHtml([["Judul"], ["Jenis"], ["Tahun", "c"]], dk.slice(0, 15).map(d => [urlOk(d.url) ? tautanLuar(urlOk(d.url), esc(d.judul)) : esc(d.judul), esc(kapital(d.jenis || "")), esc(d.tahun ?? "")])) : "", "pustaka dokumen", dk.length));
    el.innerHTML = `<h2 class="ak-judulv ak-wjudul">${esc(wilTeks(WL.kode))}</h2>` + B.join("");
  }
  renderWil.t = 0;
  function miniPeta(f, titik) { const b = bbox(f), W = 600, K = W / Math.max(b[2] - b[0], .01), H = Math.max(120, Math.min(420, (b[3] - b[1]) * K)), k = Math.min(K, H / Math.max(b[3] - b[1], .01)), pt = (lo, la) => `${((lo - b[0]) * k).toFixed(1)},${((b[3] - la) * k).toFixed(1)}`;
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    return `<svg class="ak-peta ak-mini" viewBox="0 0 ${W} ${Math.round(H)}" role="img" aria-label="Peta sensor di wilayah"><path d="${polys.map(p => p.map(r => "M" + r.map(c => pt(c[0], c[1])).join("L") + "Z").join("")).join("")}" fill="#e7f1ff" stroke="#14284b" stroke-width="1"/>${titik.slice(0, 600).map(s => `<circle cx="${pt(s.lon, s.lat).split(",")[0]}" cy="${pt(s.lon, s.lat).split(",")[1]}" r="3.5" fill="${WARNA_SENSOR[s.jenis] || "#6b7280"}"><title>${esc(s.nama)}</title></circle>`).join("")}</svg>`; }
  async function bangunWilayah(p) {
    p.innerHTML = `<div class="ak-saring">${htmlPilih("akWlP", IKON_PIN, "Cari kab/kota atau provinsi")}</div><div id="akWlIsi" class="ak-tampilan"><p class="ak-khampa">Pilih kab/kota atau provinsi untuk melihat profil wilayahnya.</p></div>`;
    if (!lbArr.length) { const l = await ambilData("lembaga"); if (l) indeksLb(l); }
    const rk = await (risikoP ||= ambilJson("/banjir/data/risiko_kecamatan.json")), kb = new Map(); dlist(rk?.kec).forEach(r => kb.set(r[0] + "|" + r[1], r[1]));
    const opsi = [...Object.keys(PROV).map(k => [k, provT(k) + " (provinsi)"]), ...[...kb].map(([k, n]) => [k, `${n}, ${provT(k.split("|")[0])}`])];
    const pilih = v => { WL.kode = v; try { const u = new URL(location.href); v ? u.searchParams.set("wilayah", v) : u.searchParams.delete("wilayah"); history.replaceState(null, "", u); } catch (e) {} if (v) nanti(() => renderWil($("akWlIsi"))); };
    const lab = pasangPilih("akWlP", {semua: "Pilih wilayah", nilai: () => WL.kode, opsi: () => opsi, pilih});
    if (WL.kode) { lab(); nanti(() => renderWil($("akWlIsi"))); }
  }

  /* ---- berita (L4B): daftar kartu bergaya portal berita, tertaut ke entitas ---- */
  const KAT_BERITA = ["kerja sama", "bantuan dan respons", "peluncuran inovasi", "uji dan penerapan", "pendanaan dan hibah", "penghargaan", "penunjukan jabatan", "kebijakan", "riset dan publikasi", "hukum dan izin", "lainnya"];
  const JENIS_ENT = {lembaga: "Lembaga", tokoh: "Tokoh", pakar: "Pakar", inovasi: "Inovasi"};
  const BR = {kat: "", ent: "", jenis: "", media: "", dari: "", sampai: "", q: "", hal: 1}, BRPER = 15;
  let brArr = [], brHasil = [], brtok = 0;
  const entBr = e => { if (!e) return null; if (e.jenis === "lembaga") { const x = lbMap.get(e.id); return x && {nama: x.nama, logo: logoLb(x), buka: () => bukaLb(x)}; }
    if (e.jenis === "tokoh") { const x = tkArr.find(t => t.id === e.id); return x && {nama: x.nama, logo: `<span class="ak-sosok">${fotoTk(x)}</span>`, buka: () => sheetTk(x)}; }
    if (e.jenis === "pakar") { const o = peta.get(e.id); return o && {nama: o[1], logo: `<span class="ak-sosok">${foto(o)}</span>`, buka: () => buka(o)}; }
    if (e.jenis === "inovasi") return {nama: "Inovasi", logo: `<span class="ak-klogo kosong" aria-hidden="true">${ikon(KAT.inovasi[1], "currentColor")}</span>`, buka: () => { IN.q = ""; tampil("inovasi"); }}; return null; };
  function kartuBr(b, i) {
    const ents = dlist(b.entitas).map(entBr).filter(Boolean).slice(0, 3);
    return `<article class="ak-psk ak-brk"><div class="ak-brm"><div class="ak-pil">${b.kategori ? `<span class="ak-r utama" style="--w0:#e8590c">${esc(kapital(b.kategori))}</span>` : ""}<span class="ak-lper">${esc(tglID(b.tanggal))}</span>${pilContoh(b)}</div>
      <h3 class="ak-brj">${urlOk(b.url) ? `<a href="${esc(urlOk(b.url))}" ${LUAR}>${esc(b.judul)}</a>` : esc(b.judul)}</h3>${b.ringkas ? `<p class="ak-rata">${esc(b.ringkas)}</p>` : ""}<div class="ak-pil">${b.media ? `<span class="ak-prodi">${esc(b.media)}</span>` : ""}${strs(b.rumpun).map(r => pilRumpun(r)).join("")}</div></div>
      ${ents.length ? `<div class="ak-bre">${ents.map((e, j) => `<button type="button" class="ak-brl" data-bre="${i}:${j}" title="${esc(e.nama)}">${e.logo}<small>${esc(e.nama)}</small></button>`).join("")}</div>` : ""}</article>`;
  }
  function gambarBr(gulir) {
    const q = BR.q.toLowerCase();
    brHasil = brArr.filter(b => (!BR.kat || b.kategori === BR.kat) && (!BR.media || b.media === BR.media) && (!GL.r || strs(b.rumpun).includes(GL.r)) && (!BR.ent || dlist(b.entitas).some(e => e.jenis + ":" + e.id === BR.ent)) && (!BR.jenis || dlist(b.entitas).some(e => e.jenis === BR.jenis))
      && (!BR.dari || String(b.tanggal) >= BR.dari) && (!BR.sampai || String(b.tanggal).slice(0, 10) <= BR.sampai) && (!q || b._cari.includes(q)));
    const n = brHasil.length, a = (BR.hal - 1) * BRPER, e = BR.ent ? entBr({jenis: BR.ent.split(":")[0], id: BR.ent.slice(BR.ent.indexOf(":") + 1)}) : null;
    $("akBrJ").innerHTML = `<b>${angka(n)}</b> berita${e ? ` tentang ${esc(e.nama)} <button type="button" class="ak-pk" data-brlepas="1">Lepas saringan</button>` : ""}`;
    $("akBrL").innerHTML = n ? `<div class="ak-brlist">${brHasil.slice(a, a + BRPER).map((b, j) => kartuBr(b, a + j)).join("")}</div>` : `<p class="ak-khampa">Tidak ada berita yang cocok.</p>`;
    $("akBrH").innerHTML = navHal(BR.hal, n, BRPER, "berita");
    if (gulir) gulirKe("akBrJ");
  }
  async function bangunBerita(p, d) {
    if (!lbArr.length) { const l = await ambilData("lembaga"); if (l) indeksLb(l); }
    if (!tkArr.length) { const t = await ambilData("tokoh"); if (t) tkArr = dlist(Array.isArray(t) ? t : t?.tokoh); }
    brArr = dlist(Array.isArray(d) ? d : d?.berita).filter(b => b && b.judul).map(b => Object.assign(b, {_cari: [b.judul, b.ringkas, b.media].filter(Boolean).join(" ").toLowerCase()})).sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));
    const ent = BR.ent; Object.assign(BR, {kat: "", jenis: "", media: "", dari: "", sampai: "", q: "", hal: 1, ent});
    const nM = {}; brArr.forEach(b => { if (b.media) nM[b.media] = (nM[b.media] || 0) + 1; }); const nK = {}; brArr.forEach(b => { if (b.kategori) nK[b.kategori] = (nK[b.kategori] || 0) + 1; });
    p.innerHTML = `<div class="ak-saring"><div class="ak-alat">${cariKotak("akBrQ", "Cari judul, ringkasan, atau media")}</div>
      <div class="ak-baris ak-baris3">${htmlPilih("akBrK", IKL.jenis, "Cari kategori")}${htmlPilih("akBrE", IK_GEDUNG, "Cari jenis entitas")}${htmlPilih("akBrM", IKJ, "Cari media")}</div>
      <div class="ak-baris"><label class="ak-tgl"><span>Dari tanggal</span><input id="akBrDr" type="date"></label><label class="ak-tgl"><span>Sampai tanggal</span><input id="akBrSd" type="date"></label></div></div>
      <div class="ak-hasil"><h2 class="ak-judulv" id="akBrJ"></h2><div id="akBrL"></div><nav id="akBrH" class="ak-hal" aria-label="Halaman daftar berita" aria-live="polite"></nav></div>`;
    const jalan = () => { const t = ++brtok; nanti(() => { if (t === brtok) gambarBr(false); }); }, ubah = (k, v) => { BR[k] = v; BR.hal = 1; jalan(); };
    pasangPilih("akBrK", {semua: "Semua kategori", nilai: () => BR.kat, opsi: () => KAT_BERITA.filter(k => nK[k]).map(k => [k, kapital(k), nK[k]]), pilih: v => ubah("kat", v)});
    pasangPilih("akBrE", {semua: "Semua entitas", nilai: () => BR.jenis, opsi: () => Object.entries(JENIS_ENT).map(([k, l]) => [k, l, brArr.filter(b => dlist(b.entitas).some(e => e.jenis === k)).length]), pilih: v => ubah("jenis", v)});
    pasangPilih("akBrM", {semua: "Semua media", nilai: () => BR.media, opsi: () => Object.entries(nM).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, v, c]), pilih: v => ubah("media", v)});
    $("akBrDr").addEventListener("change", e => ubah("dari", e.target.value)); $("akBrSd").addEventListener("change", e => ubah("sampai", e.target.value));
    let tt = 0; $("akBrQ").addEventListener("input", e => { clearTimeout(tt); tt = setTimeout(() => ubah("q", e.target.value.trim()), 250); });
    pasangHal("akBrH", h => { BR.hal = h; gambarBr(true); });
    $("akBrL").addEventListener("click", e => { const b = e.target.closest("[data-bre]"); if (!b) return; const [i, j] = b.dataset.bre.split(":").map(Number); entBr(dlist(brHasil[i]?.entitas)[j])?.buka(); });
    $("akBrJ").addEventListener("click", e => { if (e.target.closest("[data-brlepas]")) { BR.ent = ""; BR.hal = 1; jalan(); } });
    gambarBr(false);
  }
  /* bagian BERITA TERKAIT di profil: maks 5, "lihat semua" membuka tab Berita tersaring ke entitas itu */
  const brtHtml = (jenis, id, d) => { const a = dlist(Array.isArray(d) ? d : d?.berita).filter(b => dlist(b?.entitas).some(e => e.jenis === jenis && e.id === id)).sort((x, y) => String(y.tanggal).localeCompare(String(x.tanggal)));
    return a.length ? bagS(`Berita terkait<small> ${angka(a.length)}</small>`, `<ul class="ak-lsumber">${a.slice(0, 5).map(b => `<li>${urlOk(b.url) ? tautanLuar(urlOk(b.url), esc(b.judul)) : esc(b.judul)} <small class="ak-lper">${esc([b.media, tglID(b.tanggal)].filter(Boolean).join(", "))}</small></li>`).join("")}</ul>${a.length > 5 ? `<button type="button" class="ak-pk" data-brt="${esc(jenis + ":" + id)}">Lihat semua ${angka(a.length)} berita</button>` : ""}`) : ""; };
  const lihatBerita = ent => { BR.ent = ent; BR.hal = 1; delete sudah.berita; tutupSheet(); tutupDrawerAman(); tutup(); tampil("berita"); };
  /* ikon medsos: glyph garis sederhana, bukan logo merek */
  const IKM = {instagram: '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><path d="M16.8 7.2h.01"/>', tiktok: '<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.4 2.3 2 3.8 4.5 4"/>', facebook: '<path d="M14 21v-8h3l.5-3.5H14V7.5c0-1 .5-1.8 2-1.8h1.6V3c-.6 0-1.7-.2-2.9-.2C12 2.8 10.4 4.4 10.4 7v2.5H7.5V13h2.9v8z"/>',
    x: '<path d="M5 4l14 16M19 4 5 20"/>', youtube: '<rect x="3" y="6" width="18" height="12" rx="4"/><path d="m10.5 9.5 4 2.5-4 2.5z"/>', linkedin: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 11v5M8 8h.01M12 16v-5M12 13c0-1.5 1-2 2-2s2 .6 2 2v3"/>'};
  const medsosPasang = (x, semua) => { const m = {...(x.medsos && typeof x.medsos === "object" ? x.medsos : {}), ...(x.linkedin ? {linkedin: x.linkedin} : {}), ...(x.medsos_resmi && typeof x.medsos_resmi === "object" ? x.medsos_resmi : {})};
    return Object.entries(m).filter(([, v]) => urlOk(v)).map(([k, v]) => kItem(x, k, IKM[k] || IKON_WEB, kapital(k), urlOk(v), urlHost(v))).join(""); };

  /* ---- pendanaan (L4F, PRD 6.14): skema yang bisa dilamar dan proyek yang sudah mengalir ---- */
  const JENIS_DANA = {"pinjaman": "#1c7ed6", "hibah G2G": "#2b8a3e", "hibah multilateral": "#0b7285", "dana iklim": "#5f3dc4", "dana riset": "#e8590c", "instrumen domestik": "#495057", "asuransi risiko": "#862e9c"};
  const PD = {sub: "skema", jenis: "", pemberi: "", sasaran: "", status: "", prov: "", q: "", hal: 1}, PDPER = 18;
  let pdArr = [], pdHasil = [], pdtok = 0;
  const nilaiAsli = x => x.nilai != null ? `${x.mata_uang && x.mata_uang !== "USD" ? esc(x.mata_uang) + " " : "US$ "}${esc(angka(x.nilai))}` : "";
  const kartuSkemaP = x => { const l = x.lembaga_id && lbMap.get(x.lembaga_id), np = pdArr.filter(y => y.jenis_entri === "proyek" && y.pemberi === x.pemberi).length;
    return kartuPola({attr: `data-sk="${esc(x.id)}"`, sosok: sosokPola(l?.logo, x.pemberi || x.nama), nama: x.nama, status: ["sinta", kapital(x.jenis || "skema")], navy: x.pemberi, biru: strs(x.sasaran)[0] && kapital(strs(x.sasaran)[0]), rumpun: x.rumpun,
      metrik: [["uang", "Besaran", x.nilai != null ? usdR(x.nilai_usd ?? x.nilai) : "-", 1], ["proyek", "Proyek di Indonesia", angka(np)], ["tenggat", "Tenggat", x.tenggat || "-", 1]]}); };
  const kartuSkema = (x, i) => `<article class="ak-psk"><div class="ak-psatas"><h4>${esc(x.nama)}</h4></div>
    <div class="ak-pil"><span class="ak-izin" style="background:${JENIS_DANA[x.jenis] || "#6b7280"}">${esc(kapital(x.jenis || "skema"))}</span>${x.status ? `<span class="ak-prodi">${esc(kapital(x.status))}</span>` : ""}${strs(x.rumpun).map(r => pilRumpun(r)).join("")}${pilContoh(x)}</div>
    <div class="ak-pil"><small class="ak-lper">Pemberi</small>${x.lembaga_id && lbMap.has(x.lembaga_id) ? `<button type="button" class="ak-pk" data-lb="${esc(x.lembaga_id)}">${esc(x.pemberi)}</button>` : `<span class="ak-prodi">${esc(x.pemberi || "Tidak tercatat")}</span>`}</div>
    <dl class="ak-sdl">${[["Sasaran", strs(x.sasaran).join(", ")], ["Besaran", nilaiAsli(x) ? nilaiAsli(x) : ""], ["Tenggat", x.tenggat], ["Syarat", x.syarat]].filter(r => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${typeof v === "string" && k === "Besaran" ? v : esc(v)}</dd>`).join("")}</dl>
    <details class="ak-cara"><summary class="ak-rbtn ak-rbtn-b">Cara mengajukan</summary><div class="ak-disi">${x.cara ? `<p class="ak-rata">${esc(x.cara)}</p>` : '<p class="ak-khampa">Cara belum tercatat.</p>'}<div class="ak-lkontak">${strs(x.kontak?.email).filter(emailOk).map(m => `<span class="ak-kt"><a class="ak-lnk" href="mailto:${esc(m)}">${ikon(IKON_MAIL, "currentColor")}<em>Email</em>${esc(m)}</a></span>`).join("")}${strs(x.kontak?.telepon).map(t => `<span class="ak-kt"><a class="ak-lnk" href="${esc(telHref(t))}">${ikon(IK_TEL, "currentColor")}<em>Telepon</em>${esc(telF(t))}</a></span>`).join("")}${urlOk(x.url) ? `<span class="ak-kt"><a class="ak-lnk" href="${esc(urlOk(x.url))}" ${LUAR}>${ikon(IKON_WEB, "currentColor")}<em>Situs resmi</em>${esc(urlHost(x.url))}</a></span>` : ""}</div></div></details>
    <div class="ak-lfoot">${dlist(x.sumber).filter(s => urlOk(s?.url)).map(s => lSum(urlOk(s.url), x.diperiksa).replace(">Sumber<", `>Sumber ${esc(s.butir || "")}<`)).join("")}${lbPeriksa(x)}</div></article>`;
  const barisProyek = x => { const d = urlOk(x.url) || urlOk(dlist(x.sumber)[0]?.url);
    return [d ? tautanLuar(d, esc(x.nama)) : esc(x.nama), esc(x.pemberi || ""), esc(x.penerima || strs(x.pelaksana).join(", ")), `${nilaiAsli(x) || "Tidak tercatat"}${x.nilai_usd != null && x.mata_uang && x.mata_uang !== "USD" ? `<small class="ak-lper"> ${esc(usdR(x.nilai_usd))}</small>` : ""}`, esc([x.tahun, x.selesai].filter(Boolean).join(" sampai ")), esc(kapital(x.status || "")),
      `<span title="${esc(strs(x.prov).map(provT).join(", "))}">${esc(strs(x.prov).map(provT).join(", "))}</span>`, esc(strs(x.rumpun).map(r => (RUMPUN[r] || [r])[0]).join(", "))]; };
  const KOL_PROYEK = [["Proyek"], ["Pemberi"], ["Penerima"], ["Nilai", "r"], ["Tahun", "n"], ["Status"], ["Provinsi", "n"], ["Rumpun", "n"]];
  const bendera = c => /^[A-Za-z]{2}$/.test(c || "") ? String.fromCodePoint(...[...c.toUpperCase()].map(ch => 127397 + ch.charCodeAt(0))) : "";
  let ngArr = null;
  function sheetNegara(n) {
    const kb = n.kedubes || {}, web = urlOk(kb.web), ids = new Set(strs(n.proyek_pendanaan_ids)), pr = pdArr.filter(x => ids.has(x.id));
    bukaSheet("negara", `<div class="ak-dkepala"><div class="ak-dk-atas"><div class="ak-nama"><h2 id="akSJudul">${esc(bendera(n.iso2))} ${esc(n.negara)}</h2><p><b>${esc(usdR(n.total_usd_kemanusiaan_id || 0))}</b> bantuan kemanusiaan ke Indonesia</p></div></div></div>`, () =>
      bagS("Badan bantuan", strs(n.badan).length ? `<div class="ak-pil">${strs(n.badan).map(b => { const y = lbArr.find(z => namaLb(z).includes(nrm(b))); return y ? `<button type="button" class="ak-pk" data-lb="${esc(y.id)}">${esc(b)}</button>` : `<span class="ak-prodi">${esc(b)}</span>`; }).join("")}</div>` : '<p class="ak-khampa">Belum ada data.</p>')
      + bagS("Rincian per kejadian", dlist(n.rincian).length ? tabelHtml([["Tahun", "c"], ["Kejadian"], ["Nilai", "r"], ["Penerima"], ["Sumber"]], dlist(n.rincian).map(r => [esc(r.tahun ?? ""), esc(r.kejadian || ""), esc(usdR(r.usd || 0)), esc(r.penerima || ""), cip(r.sumber_url)])) : '<p class="ak-khampa">Belum ada rincian.</p>')
      + bagS("Proyek pendanaan", pr.length ? tabelHtml(KOL_PROYEK, pr.map(barisProyek)) : '<p class="ak-khampa">Belum ada proyek tertaut.</p>')
      + bagS("Kedutaan besar", web || kb.email || kb.telepon ? `<div class="ak-lkontak">${kb.telepon ? `<span class="ak-kt"><a class="ak-lnk" href="${esc(telHref(kb.telepon))}">${ikon(IK_TEL, "currentColor")}<em>Telepon</em>${esc(telF(kb.telepon))}</a></span>` : ""}${emailOk(kb.email) ? `<span class="ak-kt"><a class="ak-lnk" href="mailto:${esc(kb.email)}">${ikon(IKON_MAIL, "currentColor")}<em>Email</em>${esc(kb.email)}</a></span>` : ""}${web ? `<span class="ak-kt"><a class="ak-lnk" href="${esc(web)}" ${LUAR}>${ikon(IKON_WEB, "currentColor")}<em>Situs</em>${esc(urlHost(web))}</a></span>` : ""}</div>` : '<p class="ak-khampa">Belum ada kontak.</p>')
      + bagS("Sumber", `<ul class="ak-lsumber ak-srcl">${dlist(n.sumber).map(x => urlOk(x?.url || x)).filter(Boolean).map(u => `<li><b>${esc(hostDari2(u))}</b> <a href="${esc(u)}" ${LUAR}>${esc(u)}</a></li>`).join("") || "<li>Tidak ada sumber tercatat.</li>"}</ul>`));
    $("akSheet").dataset.k = "";
  }
  async function gambarNegara() {
    $("akPdJ").innerHTML = ""; $("akPdH").innerHTML = ""; $("akPdL").innerHTML = hantuHtml; if (!ngArr) { const d = await ambilData("negara_donor"); ngArr = dlist(Array.isArray(d) ? d : d?.negara).filter(n => n && n.negara).sort((a, b) => (b.total_usd_kemanusiaan_id || 0) - (a.total_usd_kemanusiaan_id || 0)); }
    if (PD.sub !== "negara") return; const mx = Math.max(1, ...ngArr.map(n => n.total_usd_kemanusiaan_id || 0)), tot = ngArr.reduce((a, n) => a + (n.total_usd_kemanusiaan_id || 0), 0);
    $("akPdJ").innerHTML = `<b>${esc(usdR(tot))}</b> bantuan kemanusiaan dari ${angka(ngArr.length)} negara donor`;
    $("akPdL").innerHTML = ngArr.length ? `<div class="ak-bars">${ngArr.map((n, i) => `<div class="ak-br ak-ngr" tabindex="0" role="button" data-ng="${i}" data-tt="${esc(n.negara)}" data-tv="${esc(usdR(n.total_usd_kemanusiaan_id || 0))}" data-tk="${esc(angka(strs(n.badan).length) + " badan bantuan, klik untuk profil")}" data-tc="#1c7ed6" style="--w0:#1c7ed6"><span class="ak-bl">${i + 1}. ${esc(bendera(n.iso2))} ${esc(n.negara)}</span><span class="ak-bt"><i style="width:${Math.max(8, (n.total_usd_kemanusiaan_id || 0) / mx * 100)}%"><b>${esc(usdR(n.total_usd_kemanusiaan_id || 0))}</b></i></span></div>`).join("")}</div>` : kosongHtml("Negara donor");
  }
  function gambarPd(gulir) {
    $("akPdSaring").hidden = PD.sub === "negara"; if (PD.sub === "negara") { gambarNegara(); return; }
    const skema = PD.sub === "skema";
    pdHasil = pdArr.filter(x => (x.jenis_entri || "skema") === (skema ? "skema" : "proyek") && (!PD.jenis || x.jenis === PD.jenis) && (!PD.pemberi || x.pemberi === PD.pemberi) && (!PD.sasaran || strs(x.sasaran).includes(PD.sasaran)) && (!PD.status || x.status === PD.status)
      && (!GL.r || strs(x.rumpun).includes(GL.r)) && (!PD.prov || strs(x.prov).includes(PD.prov)) && (!PD.q || x._cari.includes(PD.q.toLowerCase())));
    const n = pdHasil.length, a = (PD.hal - 1) * PDPER, tot = pdHasil.reduce((s, x) => s + (Number(x.nilai_usd) || 0), 0);
    $("akPdJ").innerHTML = `<b>${angka(n)}</b> ${skema ? "skema pendanaan" : "proyek pendanaan"}${!skema ? `, nilai <b>${esc(usdR(tot))}</b>` : ""}`;
    $("akPdL").innerHTML = n ? (skema ? `<div class="ak-daftar">${pdHasil.slice(a, a + PDPER).map(kartuSkemaP).join("")}</div>` : tabelHtml(KOL_PROYEK, pdHasil.slice(a, a + PDPER).map(barisProyek))) : `<p class="ak-khampa">Tidak ada entri yang cocok.</p>`;
    $("akPdH").innerHTML = navHal(PD.hal, n, PDPER, skema ? "skema" : "proyek");
    if (gulir) gulirKe("akPdJ");
  }
  async function bangunDana(p, d) {
    if (!lbArr.length) { const l = await ambilData("lembaga"); if (l) indeksLb(l); }
    pdArr = dlist(Array.isArray(d) ? d : d?.pendanaan).filter(x => x && x.nama).map(x => Object.assign(x, {_cari: [x.nama, x.pemberi, x.penerima, ...strs(x.pelaksana), ...strs(x.sasaran)].filter(Boolean).join(" ").toLowerCase()}));
    ngArr = null; Object.assign(PD, {jenis: "", pemberi: "", sasaran: "", status: "", prov: "", q: "", hal: 1});
    const pr = pdArr.filter(x => x.jenis_entri === "proyek"), hit = f => { const n = {}; pdArr.forEach(x => { for (const k of [].concat(f(x))) if (k) n[k] = (n[k] || 0) + 1; }); return n; };
    const jum = f => { const n = {}; pr.forEach(x => { const k = f(x); if (k) n[k] = (n[k] || 0) + (Number(x.nilai_usd) || 0); }); return n; };
    const bar = (n, warna) => { const rows = Object.entries(n).filter(r => r[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 10), mx = Math.max(1, ...rows.map(r => r[1])); return rows.length ? `<div class="ak-bars">${rows.map(([k, c]) => `<div class="ak-br" tabindex="0" data-tt="${esc(k)}" data-tv="${esc(usdR(c))}" data-tk="${esc((c / (rows.reduce((s, r) => s + r[1], 0)) * 100).toLocaleString("id-ID", {maximumFractionDigits: 1}) + "% dari yang tampil")}" data-tc="${esc(warna(k))}" style="--w0:${warna(k)}"><span class="ak-bl">${esc(kapital(k))}</span><span class="ak-bt"><i style="width:${Math.max(8, c / mx * 100)}%"><b>${esc(usdR(c))}</b></i></span></div>`).join("")}</div>` : '<p class="ak-khampa">Belum ada nilai proyek.</p>'; };
    const totP = pr.reduce((s, x) => s + (Number(x.nilai_usd) || 0), 0);
    p.innerHTML = `${segHtml("akPdS", "Sub-tampilan pendanaan", [["skema", "Skema", IK_UANG], ["proyek", "Proyek", IK_BAR], ["negara", "Negara donor", IK_GEDUNG]])}
      <section class="ak-panel ak-lA"><div class="ak-pil"><span class="ak-r utama" style="--w0:#2b8a3e">Ringkasan</span></div><h2 class="ak-judulv"><b>${esc(usdR(totP))}</b> nilai ${angka(pr.length)} proyek pendanaan kebencanaan, ${angka(pdArr.length - pr.length)} skema bisa dilamar</h2>
        <div class="ak-komp"><div><h3 class="ak-lh">Nilai proyek per pemberi</h3>${bar(jum(x => x.pemberi), () => "#1c7ed6")}</div><div><h3 class="ak-lh">Nilai proyek per jenis</h3>${bar(jum(x => x.jenis), k => JENIS_DANA[k] || "#6b7280")}</div></div>
        <p class="ak-lkaki">Sumber: direktori pendanaan Centurisk97; nilai asli dan nilai dalam US$ menurut sumber, tiap entri bertaut ke sumbernya.</p></section>
      <div class="ak-saring" id="akPdSaring"><div class="ak-alat">${cariKotak("akPdQ", "Cari nama, pemberi, atau penerima")}</div>
        <div class="ak-baris ak-baris3">${htmlPilih("akPdJn", IK_UANG, "Cari jenis")}${htmlPilih("akPdPm", IK_GEDUNG, "Cari pemberi")}${htmlPilih("akPdSs", IK_GEDUNG, "Cari sasaran")}</div>
        <div class="ak-baris ak-baris3">${htmlPilih("akPdSt", IK_BAR, "Cari status")}${htmlPilih("akPdPv", IKON_PIN, "Cari provinsi")}</div></div>
      <div class="ak-hasil"><h2 class="ak-judulv" id="akPdJ"></h2><div id="akPdL"></div><nav id="akPdH" class="ak-hal" aria-label="Halaman daftar pendanaan" aria-live="polite"></nav></div>`;
    const jalan = () => { const t = ++pdtok; nanti(() => { if (t === pdtok) gambarPd(false); }); }, ubah = (k, v) => { PD[k] = v; PD.hal = 1; jalan(); }, op = (f, lab) => () => Object.entries(hit(f)).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, lab(v), c]);
    pasangPilih("akPdJn", {semua: "Semua jenis", nilai: () => PD.jenis, opsi: op(x => x.jenis, kapital), pilih: v => ubah("jenis", v)}); pasangPilih("akPdPm", {semua: "Semua pemberi", nilai: () => PD.pemberi, opsi: op(x => x.pemberi, v => v), pilih: v => ubah("pemberi", v)});
    pasangPilih("akPdSs", {semua: "Semua sasaran", nilai: () => PD.sasaran, opsi: op(x => strs(x.sasaran), kapital), pilih: v => ubah("sasaran", v)}); pasangPilih("akPdSt", {semua: "Semua status", nilai: () => PD.status, opsi: op(x => x.status, kapital), pilih: v => ubah("status", v)});
    pasangPilih("akPdPv", {semua: "Semua provinsi", nilai: () => PD.prov, opsi: op(x => strs(x.prov), provT), pilih: v => ubah("prov", v)});
    $("akPdS").addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b) return; PD.sub = b.dataset.v; PD.hal = 1; setSeg("akPdS", PD.sub); jalan(); });
    let tt = 0; $("akPdQ").addEventListener("input", e => { clearTimeout(tt); tt = setTimeout(() => ubah("q", e.target.value.trim()), 250); }); pasangHal("akPdH", h => { PD.hal = h; gambarPd(true); });
    const tip = $("akTip"); p.addEventListener("pointermove", e => { const t = e.target.closest("[data-tt]"); if (!t) { tip.hidden = true; return; }
      tip.innerHTML = `<b>${esc(t.dataset.tt)}</b><span><i style="background:${esc(t.dataset.tc)}"></i>${esc(t.dataset.tv)}</span><small>${esc(t.dataset.tk)}</small>`; tip.hidden = false; tip.style.left = Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8) + "px"; tip.style.top = Math.max(8, e.clientY - tip.offsetHeight - 12) + "px"; });
    p.addEventListener("pointerleave", () => { tip.hidden = true; });
    const bukaN = e => { const c = e.target.closest("[data-ng]"); if (c && ngArr?.[+c.dataset.ng]) sheetNegara(ngArr[+c.dataset.ng]); }; $("akPdL").addEventListener("click", bukaN); $("akPdL").addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-ng]")) { e.preventDefault(); bukaN(e); } });
    setSeg("akPdS", PD.sub); gambarPd(false);
  }

  const bukuOrang = (jenis, id, d) => { const a = dlist(Array.isArray(d) ? d : d?.buku).filter(b => dlist(b.penulis).some(p => p[jenis + "_id"] === id)); return a.length ? bagB(`Buku ${angka(a.length)}`, `<ul class="ak-lsumber">${a.slice(0, 8).map(b => `<li>${urlOk(b.url) ? tautanLuar(urlOk(b.url), esc(b.judul)) : esc(b.judul)} <small class="ak-lper">${esc([b.penerbit, b.tahun].filter(Boolean).join(", "))}</small></li>`).join("")}</ul>`) : ""; };
  /* ---- buku: sub-tampilan di tab Pustaka ---- */
  const BK = {jenis: "", akses: "", tahun: "", penerbit: "", q: "", hal: 1}, BKPER = 18;
  let bkArr = [], bkHasil = [], bktok = 0;
  const kartuBk = b => { const w = (RUMPUN[strs(b.rumpun)[0]] || [])[2] || "#14284b", pn = dlist(b.penulis);
    return `<article class="ak-psk ak-bk2"><div class="ak-sampul" style="--w0:${w}">${urlOk(b.sampul_url) ? `<img src="${esc(urlOk(b.sampul_url))}" alt="" loading="lazy" referrerpolicy="no-referrer" data-inisial="${esc(b.judul)}">` : `<span>${esc(b.judul)}</span>`}</div>
      <div class="ak-bkm"><h4>${urlOk(b.url) ? tautanLuar(urlOk(b.url), esc(b.judul)) : esc(b.judul)}</h4>${b.subjudul ? `<small class="ak-lper">${esc(b.subjudul)}</small>` : ""}
      <div class="ak-pil">${b.jenis ? `<span class="ak-prodi">${esc(kapital(b.jenis))}</span>` : ""}${b.akses ? `<span class="ak-izin ${/terbuka/i.test(b.akses) ? "berlaku" : "contoh"}">${esc(kapital(b.akses))}</span>` : ""}${strs(b.rumpun).slice(0, 2).map(r => pilRumpun(r)).join("")}</div>
      <p class="ak-lper">${pn.map(p => p.pakar_id && peta.has(p.pakar_id) ? `<button type="button" class="ak-pk" data-pk="${esc(p.pakar_id)}">${esc(p.nama)}</button>` : p.tokoh_id ? `<button type="button" class="ak-pk" data-tkid="${esc(p.tokoh_id)}">${esc(p.nama)}</button>` : esc(p.nama)).join(" ")}</p>
      <small class="ak-lper">${esc([b.penerbit, b.tahun].filter(Boolean).join(", "))}</small>${b.ringkas ? `<p class="ak-rata">${esc(b.ringkas)}</p>` : ""}<div class="ak-lfoot">${dlist(b.sumber).map(s => urlOk(s?.url || s)).filter(Boolean).slice(0, 2).map(u => cip(u)).join("")}</div></div></article>`; };
  function gambarBk(gulir) {
    bkHasil = bkArr.filter(b => (!BK.jenis || b.jenis === BK.jenis) && (!BK.akses || b.akses === BK.akses) && (!BK.tahun || String(b.tahun) === BK.tahun) && (!BK.penerbit || b.penerbit === BK.penerbit) && (!GL.r || strs(b.rumpun).includes(GL.r)) && (!BK.q || b._cari.includes(BK.q.toLowerCase())));
    const n = bkHasil.length, a = (BK.hal - 1) * BKPER;
    $("akBkJ").innerHTML = `<b>${angka(n)}</b> buku`; $("akBkL").innerHTML = n ? `<div class="ak-psgrid ak-bkgrid">${bkHasil.slice(a, a + BKPER).map(kartuBk).join("")}</div>` : `<p class="ak-khampa">Tidak ada buku yang cocok.</p>`; $("akBkH").innerHTML = navHal(BK.hal, n, BKPER, "buku");
    if (gulir) gulirKe("akBkJ");
  }
  async function bangunBuku(el) {
    el.innerHTML = hantuHtml; const d = await ambilData("buku"); bkArr = dlist(Array.isArray(d) ? d : d?.buku).filter(b => b && b.judul).map(b => Object.assign(b, {_cari: [b.judul, b.subjudul, b.penerbit, ...dlist(b.penulis).map(p => p.nama), ...strs(b.isbn)].filter(Boolean).join(" ").toLowerCase()}));
    if (!bkArr.length) { el.innerHTML = kosongHtml("Buku"); return; }
    Object.assign(BK, {jenis: "", akses: "", tahun: "", penerbit: "", q: "", hal: 1});
    const hit = f => { const n = {}; bkArr.forEach(b => { for (const k of [].concat(f(b))) if (k) n[k] = (n[k] || 0) + 1; }); return n; }, nR = hit(b => strs(b.rumpun)), nPn = {}; bkArr.forEach(b => dlist(b.penulis).forEach(p => { const k = p.nama; if (k) { (nPn[k] ||= {n: 0, p}).n++; } }));
    const top = Object.values(nPn).sort((a, b) => b.n - a.n).slice(0, 8), mx = Math.max(1, ...Object.values(nR));
    el.innerHTML = `<section class="ak-panel ak-lA"><div class="ak-pil"><span class="ak-r utama" style="--w0:#8d5524">Ringkasan</span></div><h2 class="ak-judulv"><b>${angka(bkArr.length)}</b> buku kebencanaan dari ${angka(Object.keys(nPn).length)} penulis</h2>
      <div class="ak-komp"><div><h3 class="ak-lh">Per rumpun</h3><div class="ak-bars">${Object.entries(nR).sort((a, b) => b[1] - a[1]).map(([r, c]) => { const w = (RUMPUN[r] || [])[2] || "#6b7280"; return `<div class="ak-br" tabindex="0" data-tt="${esc((RUMPUN[r] || [r])[0])}" data-tv="${angka(c)} buku" data-tk="${esc((c / bkArr.length * 100).toLocaleString("id-ID", {maximumFractionDigits: 1}) + "% dari " + angka(bkArr.length))}" data-tc="${w}" style="--w0:${w}"><span class="ak-bl">${esc((RUMPUN[r] || [r])[0])}</span><span class="ak-bt"><i style="width:${Math.max(8, c / mx * 100)}%"><b>${angka(c)}</b></i></span></div>`; }).join("")}</div></div>
      <div><h3 class="ak-lh">Penulis paling produktif</h3><div class="ak-pil">${top.map(t => t.p.pakar_id && peta.has(t.p.pakar_id) ? `<button type="button" class="ak-pk" data-pk="${esc(t.p.pakar_id)}">${esc(t.p.nama)} ${angka(t.n)}</button>` : t.p.tokoh_id ? `<button type="button" class="ak-pk" data-tkid="${esc(t.p.tokoh_id)}">${esc(t.p.nama)} ${angka(t.n)}</button>` : `<span class="ak-prodi">${esc(t.p.nama)} ${angka(t.n)}</span>`).join("")}</div></div></div>
      <p class="ak-lkaki">Sumber: direktori buku Centurisk97; tiap butir bertaut ke sumbernya.</p></section>
      <div class="ak-saring"><div class="ak-alat">${cariKotak("akBkQ", "Cari judul, penulis, penerbit, atau ISBN")}</div><div class="ak-baris ak-baris3">${htmlPilih("akBkJn", IKL.jenis, "Cari jenis")}${htmlPilih("akBkAk", IKON_WEB, "Cari akses")}${htmlPilih("akBkTh", IKL.tahun, "Cari tahun")}</div><div class="ak-baris">${htmlPilih("akBkPb", IK_GEDUNG, "Cari penerbit")}</div></div>
      <div class="ak-hasil"><h2 class="ak-judulv" id="akBkJ"></h2><div id="akBkL"></div><nav id="akBkH" class="ak-hal" aria-label="Halaman daftar buku" aria-live="polite"></nav></div>`;
    const jalan = () => { const t = ++bktok; nanti(() => { if (t === bktok) gambarBk(false); }); }, ubah = (k, v) => { BK[k] = v; BK.hal = 1; jalan(); }, op = (f, lab) => () => Object.entries(hit(f)).sort((a, b) => b[1] - a[1]).map(([v, c]) => [v, lab(v), c]);
    pasangPilih("akBkJn", {semua: "Semua jenis", nilai: () => BK.jenis, opsi: op(b => b.jenis, kapital), pilih: v => ubah("jenis", v)}); pasangPilih("akBkAk", {semua: "Semua akses", nilai: () => BK.akses, opsi: op(b => b.akses, kapital), pilih: v => ubah("akses", v)});
    pasangPilih("akBkTh", {semua: "Semua tahun", nilai: () => BK.tahun, opsi: op(b => b.tahun, v => v), pilih: v => ubah("tahun", v)}); pasangPilih("akBkPb", {semua: "Semua penerbit", nilai: () => BK.penerbit, opsi: op(b => b.penerbit, v => v), pilih: v => ubah("penerbit", v)});
    let tt = 0; $("akBkQ").addEventListener("input", e => { clearTimeout(tt); tt = setTimeout(() => ubah("q", e.target.value.trim()), 250); }); pasangHal("akBkH", h => { BK.hal = h; gambarBk(true); });
    const tip = $("akTip"); el.addEventListener("pointermove", e => { const t = e.target.closest("[data-tt]"); if (!t) { tip.hidden = true; return; } tip.innerHTML = `<b>${esc(t.dataset.tt)}</b><span><i style="background:${esc(t.dataset.tc)}"></i>${esc(t.dataset.tv)}</span><small>${esc(t.dataset.tk)}</small>`; tip.hidden = false; tip.style.left = Math.min(e.clientX + 12, innerWidth - tip.offsetWidth - 8) + "px"; tip.style.top = Math.max(8, e.clientY - tip.offsetHeight - 12) + "px"; });
    el.addEventListener("pointerleave", () => { tip.hidden = true; }); gambarBk(false);
  }

  /* ----- pengalih tampilan ----- */
  const VIEW = {
    pakar: ["Pakar", IK_ORANG], lembaga: ["Lembaga", IK_GEDUNG], wilayah: ["Wilayah", IKON_PIN], inovasi: ["Inovasi", KAT.inovasi[1]], sistem_data: ["Sistem data", '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>'], pendanaan: ["Pendanaan", IK_UANG], pustaka: ["Pustaka", IKJ], berita: ["Berita", '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4"/>'], riset: ["Riset daerah", IKON_PIN], kejadian: ["Kejadian besar", '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>'],
    pusat: ["Pusat studi", '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M8 10h.01M16 10h.01"/>']};
  /* Tab Jurnal disembunyikan 30 Okt 2026: jurnal kini tampil di profil kampus/lembaga penerbitnya (jurnalKampus). Pulihkan tab:
     jurnal: ["Jurnal", IKJ] di VIEW dan jurnal: ["jurnal", bangunJur, d => Array.isArray(d) && d.length] di MUAT. */
  /* Pengadaan kajian disembunyikan atas permintaan pemilik 30 Okt 2026. Pulihkan: tambah lagi ke VIEW dan MUAT
     pengadaan: ["Pengadaan kajian", '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>'] dan pengadaan: ["pengadaan", bangunPeng, d => Array.isArray(d) && d.length] */
  DATA.wilayah = Promise.resolve([{}]);
  const MUAT = {pendanaan: ["pendanaan", bangunDana, d => Array.isArray(d?.pendanaan ?? d) && (d?.pendanaan ?? d).length], wilayah: ["wilayah", bangunWilayah, () => true], pustaka: ["dokumen", bangunPustaka, d => Array.isArray(d?.dokumen ?? d) && (d?.dokumen ?? d).length > 0], berita: ["berita", bangunBerita, d => Array.isArray(d?.berita ?? d) && (d?.berita ?? d).length], tokoh: ["tokoh", bangunTokoh, d => Array.isArray(d?.tokoh ?? d) && (d?.tokoh ?? d).length], sistem_data: ["sistem_data", bangunSd, d => Array.isArray(d?.sistem ?? d) && (d?.sistem ?? d).length], inovasi: ["inovasi", bangunInovasi, d => Array.isArray(d?.inovasi ?? d) && (d?.inovasi ?? d).length], lembaga: ["lembaga", bangunLembaga, d => Array.isArray(d?.lembaga ?? d) && (d?.lembaga ?? d).length], riset: ["riset", (p, d) => { indeksRiset(d); bangunRiset(p); }, d => Array.isArray(d) && d.length], kejadian: ["kejadian", bangunKej, d => Array.isArray(d?.kejadian) && d.kejadian.length],
    pusat: ["pusat_studi", bangunPs, d => Array.isArray(d) && d.length]};
  const sudah = {};
  let tampilSkrg = "pakar";
  const bacaTampil = () => { try { return localStorage.getItem(TAMPIL_KEY); } catch (e) { return null; } };
  function bukaView(v) {
    const [nama, bangun, sah] = MUAT[v], p = $("akv-" + v);
    if (sudah[v]) return;
    sudah[v] = true; p.innerHTML = hantuHtml;
    const gagal = () => { delete sudah[v]; p.innerHTML = kosongHtml(esc((VIEW[v] || ["Tokoh publik"])[0])); const t = $("akTampil").querySelector(`[data-t="${v}"]`); if (t) t.hidden = true; };
    ambilData(nama).then(d => { if (!sah(d)) { gagal(); return; } nanti(() => { try { p.innerHTML = ""; bangun(p, d); } catch (e) { console.error(e); gagal(); } }); });
  }
  function pasangTampil(v) {
    $("akBencana").innerHTML = GLB.map(([k, l]) => { const ic = RUMPUN[k]; return `<button type="button" data-r="${esc(k)}" aria-pressed="${k === GL.r}">${ic ? ikon(ic[1], ic[2]) : ""}${esc(l)}</button>`; }).join(""); $("akBencana").hidden = false;
    $("akBencana").addEventListener("click", e => { const b = e.target.closest("button[data-r]"); if (!b) return; setChip("akBencana", b.dataset.r); nanti(() => setBencana(b.dataset.r)); });
    $("akPkSeg").addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b) return; pkSub = b.dataset.v; setSeg("akPkSeg", pkSub); pasangPkSeg("pakar"); });
    $("akTampil").innerHTML = Object.entries(VIEW).map(([k, [l, ik]]) => `<button type="button" data-t="${k}" aria-pressed="false">${ikon(ik, "currentColor")}${l}</button>`).join("");
    $("akTampil").hidden = false;
    $("akTampil").addEventListener("click", e => { const b = e.target.closest("button[data-t]"); if (b) tampil(b.dataset.t); });
    tampil(VIEW[v] ? v : "pakar");
  }
  function tampil(v) {
    tampilSkrg = v; dpSegarkan();
    $("akTampil").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.t === v)));
    $("akIsi").hidden = v !== "pakar";
    Object.keys(MUAT).forEach(k => { $("akv-" + k).hidden = k !== v; });
    try { const u = new URL(location.href); if (v === "pakar") u.searchParams.delete("tampil"); else u.searchParams.set("tampil", v); history.replaceState(null, "", u); localStorage.setItem(TAMPIL_KEY, v); } catch (e) {}
    pasangPkSeg(v); if (v !== "pakar") nanti(() => bukaView(v));
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
    ambilData("buku").then(d => { const a = dlist(Array.isArray(d) ? d : d?.buku).filter(b => dlist(b.penulis).some(p => p.pakar_id === id)), sek = $("akBukuP"); if (!a.length || karyaId !== id || !sek) return;
      sek.querySelector("div").innerHTML = `<ul class="ak-lsumber">${a.slice(0, 8).map(b => `<li>${urlOk(b.url) ? tautanLuar(urlOk(b.url), esc(b.judul)) : esc(b.judul)} <small class="ak-lper">${esc([b.penerbit, b.tahun].filter(Boolean).join(", "))}</small></li>`).join("")}</ul>`; sek.hidden = false; });
    ambilData("afiliasi").then(d => { const a = dlist(d?.[id]).filter(x => x && x.nama_lembaga), sek = $("akAfl"); if (!a.length || karyaId !== id || !sek) return;
      sek.querySelector("div").innerHTML = `<ul class="ak-lsumber">${a.map(x => `<li>${x.lembaga_id ? `<button type="button" class="ak-pk" data-lb="${esc(x.lembaga_id)}">${esc(x.nama_lembaga)}</button>` : `<b>${esc(x.nama_lembaga)}</b>`} ${x.peran || x.peran_asli ? `<small class="ak-lper">${esc(x.peran || x.peran_asli)}</small>` : ""} ${x.mulai || x.selesai ? `<small class="ak-lper">${esc([x.mulai, x.selesai].filter(Boolean).join(" sampai "))}</small>` : ""} ${cip(x.sumber_url)}</li>`).join("")}</ul>`; sek.hidden = false; });
    ambilData("berita").then(d => { const a = dlist(Array.isArray(d) ? d : d?.berita).filter(b => dlist(b?.entitas).some(e => e.jenis === "pakar" && e.id === id)).sort((x, y) => String(y.tanggal).localeCompare(String(x.tanggal))), sek = $("akBrP"); if (!a.length || karyaId !== id || !sek) return;
      sek.querySelector("div").innerHTML = `<ul class="ak-lsumber">${a.slice(0, 5).map(b => `<li>${urlOk(b.url) ? tautanLuar(urlOk(b.url), esc(b.judul)) : esc(b.judul)} <small class="ak-lper">${esc([b.media, tglID(b.tanggal)].filter(Boolean).join(", "))}</small></li>`).join("")}</ul>${a.length > 5 ? `<button type="button" class="ak-pk" data-brt="pakar:${esc(id)}">Lihat semua ${angka(a.length)} berita</button>` : ""}`; sek.hidden = false; });
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
    const rp = e.target.closest("[data-rpn]"); if (rp) { e.stopPropagation(); nanti(() => setBencana(rp.dataset.rpn)); return; }
    const tki = e.target.closest("[data-tkid]"); if (tki) { e.stopPropagation(); const x = tkArr.find(t => t.id === tki.dataset.tkid); if (x) sheetTk(x); return; }
    const lbk = e.target.closest("[data-lb]"); if (lbk && !lbk.closest("#akSheet")) { e.stopPropagation(); (async () => { if (!lbArr.length) { const l = await ambilData("lembaga"); if (l) indeksLb(l); } const x = lbMap.get(lbk.dataset.lb); if (x) bukaLb(x); })(); return; }
    const fq = e.target.closest("[data-fq]"); if (fq) { e.stopPropagation(); const i = document.querySelector(".ak-tampilan:not([hidden]) input[type=search]") || (!$("akIsi").hidden && $("akQ")); if (i) { i.value = fq.dataset.fq; i.dispatchEvent(new Event("input", {bubbles: true})); i.scrollIntoView({block: "center"}); } return; }
    if (e.target.closest("a,button,.ak-pilih")) return;
    const c = e.target.closest("[data-in],[data-sd],[data-sk]"); if (!c) return;
    if (c.dataset.in != null) { const x = inHasil[+c.dataset.in]; if (x) sheetDetail(x.nama, kartuIn(x)); } else if (c.dataset.sd) { const x = sdArr.find(y => y.id === c.dataset.sd); if (x) sheetDetail(x.nama, kartuSd(x)); } else { const x = pdArr.find(y => y.id === c.dataset.sk); if (x) sheetDetail(x.nama, kartuSkema(x)); } }, true);
  document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("[data-in],[data-sd],[data-sk]")) { e.preventDefault(); e.target.click(); } });
  document.addEventListener("submit", e => { const f = e.target.closest("[data-korf]"); if (f) { e.preventDefault(); kirimKoreksi(f); } });
  document.addEventListener("click", e => {
    const pk = e.target.closest("[data-pk]"); if (pk) { const o = peta.get(pk.dataset.pk); if (o) buka(o); return; }
    const tks = e.target.closest("[data-tks]"); if (tks) { const x = tkArr.find(y => y.id === tks.dataset.tks); if (x) sheetTk(x); return; }
    const kr = e.target.closest("[data-kor]"); if (kr) { const w = kr.closest(".ak-dkepala, .ak-bn, .ak-disi, #akDrIsi, #akSIsi")?.querySelector(".ak-korw") || document.querySelector("#akDrawer:not([hidden]) .ak-korw, #akSheet:not([hidden]) .ak-korw"); if (w) w.innerHTML = w.innerHTML ? "" : formKor(...kr.dataset.kor.split(/:(.*)/s)); return; }
    const wl = e.target.closest("[data-wl]"); if (wl) { WL.kode = wl.dataset.wl; delete sudah.wilayah; tutup(); tutupSheet(); tampil("wilayah"); return; }
    const bt = e.target.closest("[data-brt]"); if (bt) { lihatBerita(bt.dataset.brt); return; }
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
    const qs = new URLSearchParams(location.search); if (qs.get("wilayah")) WL.kode = qs.get("wilayah"); if (qs.get("bencana") && GLB.some(x => x[0] === qs.get("bencana"))) { GL.r = qs.get("bencana"); st.rumpun = new Set([GL.r]); R.rumpun = GL.r; K.jenis = GL.r; }
    const pv = qs.get("prov"), rp = qs.get("rumpun"), pk = qs.get("pakar");
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
      if (a.dataset.dpa === "lihat") (modeL() ? lihatDpl : lihatDp)();
      else if (a.dataset.dpa === "kosong") { if (modeL()) { dpl.clear(); dplSimpan(); } else { dp.clear(); dpSimpan(); } dpSegarkan(); }
      else { const buka = $("akDpMenu").hidden; $("akDpMenu").hidden = !buka; a.setAttribute("aria-expanded", String(buka)); if (buka) $("akDpPerlu").focus(); } });
    /* lembar bawah */
    $("akSheet").addEventListener("click", e => {
      if (e.target.closest("[data-tutup-s]")) { tutupSheet(); return; }
      const h = e.target.closest("[data-hapus]"); if (h) { dpUbah(h.dataset.hapus, false); return; }
      const hl = e.target.closest("[data-hapusl]"); if (hl) { dplUbah(hl.dataset.hapusl, false); return; }
      const tl = e.target.closest("[data-dpl-t]"); if (tl) { dplUbah(tl.dataset.dplT, !dpl.has(tl.dataset.dplT)); return; }
      const lb = e.target.closest("[data-lb]"); if (lb) { const x = lbMap.get(lb.dataset.lb); if (x) bukaLb(x); return; }
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
      if ($("akDrawer") && !$("akDrawer").hidden && $("akSheet").hidden) tutupDrawer(); else if (!$("akSheet").hidden) tutupSheet(); else if (!$("akDpMenu").hidden) { $("akDpMenu").hidden = true; document.querySelector("[data-dpa=unduh]").setAttribute("aria-expanded", "false"); } else if (!$("akLembar").hidden) tutup(); else if (!$("akVPop").hidden) { bukaProv(false); $("akVBtn").focus(); } else if (!$("akKPop").hidden) { bukaKampus(false); $("akKBtn").focus(); } else if (!$("akPPop").hidden) { bukaProdi(false); $("akPBtn").focus(); }
    });
    $("akReset").addEventListener("click", () => {
      Object.assign(st, {q: "", rumpun: new Set(), sumber: "", prodi: "", baru: false, prov: new Set()}); $("akBaruTog").setAttribute("aria-pressed", "false"); $("akQ").value = ""; isiProv();
      $("akS").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.v === "")));
      pilihKampus("");
    });
    saring(); dpSegarkan();
    $("akBaruTog").addEventListener("click", () => { st.baru = !st.baru; $("akBaruTog").setAttribute("aria-pressed", String(st.baru)); nanti(saring); });
    nanti(muatBaru); nanti(pasangDummyAk); nanti(muatAfiliasi);
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
    if (img.closest?.(".ak-pinlogo")) { img.parentElement.textContent = img.dataset.inisial || ""; return; }
    if (img.classList.contains("ak-logo") || img.classList.contains("ak-klogo") || img.classList.contains("ak-sampul-logo")) { img.remove(); return; }
    const sp = img.parentElement?.classList.contains("ak-sampul") ? img.parentElement : null;
    if (sp && img === sp.firstElementChild) { sp.classList.add("kosong"); const i = document.createElement("span"); i.className = "ak-sampul-inisial"; i.textContent = img.dataset.inisial || ""; img.replaceWith(i); return; }
    if (!img.classList.contains("ak-foto")) return;
    const s = document.createElement("span"); s.className = img.className; s.textContent = img.dataset.inisial; s.setAttribute("aria-hidden", "true");
    img.replaceWith(s);
  }, true);
  mulai();
})();
