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

  const st = {q: "", kampus: "", sumber: "bukanx", urut: 4, rumpun: "", hal: 1, kJenis: "k"};
  let semua = [], hasil = [], perK = {}, logoK = {}, tunda = 0;

  const foto = (o, besar) => o[9]
    ? `<img class="ak-foto${besar ? " besar" : ""}" src="${esc(o[9])}" alt="" loading="lazy" referrerpolicy="no-referrer" data-inisial="${esc(inisial(o[1]))}">`
    : `<span class="ak-foto${besar ? " besar" : ""}" aria-hidden="true">${esc(inisial(o[1]))}</span>`;
  const sub = o => esc(o[11] ? `${o[11].replace(/\s*\((S\d|D\d|Sp-?\d)\)$/, "")}, ${o[2]}` : o[2]);
  const logo = o => o[14] ? `<img class="ak-logo" src="${esc(o[14])}" alt="Logo ${esc(o[2])}" loading="lazy" referrerpolicy="no-referrer">` : "";
  const sosok = (o, besar) => `<span class="ak-sosok${besar ? " besar" : ""}">${foto(o, besar)}${logo(o)}</span>`;
  const logoKecil = k => logoK[k] ? `<img class="ak-klogo" src="${esc(logoK[k])}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="ak-klogo kosong" aria-hidden="true">${esc(inisial(k))}</span>`;

  const kartu = (o, i) => `<button type="button" class="ak-orang" data-i="${i}">
      <div class="ak-atas">${sosok(o)}<div class="ak-nama"><h3>${esc(o[1])}</h3><p>${sub(o)}</p></div></div>
      <div class="ak-pil">${o[3].map((r, j) => pilRumpun(r, j === 0)).join("")}</div>
      ${metrik(o)}
    </button>`;

  function saring() {
    const q = st.q.toLowerCase();
    hasil = semua.filter(o => (!st.rumpun || o[3].includes(st.rumpun)) && (!st.kampus || o[2] === st.kampus)
      && (st.sumber === "" || (st.sumber === "s" ? o[13] === "s" : o[13] !== "x")) && (!q || o._cari.includes(q)));
    const u = st.urut;
    hasil.sort(u === 1 ? (a, b) => a[1].localeCompare(b[1], "id") : (a, b) => b[u] - a[u] || b[4] - a[4]);
    st.hal = 1;
    document.querySelectorAll("#akRumpun button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.r === st.rumpun)));
    gambar(false);
  }

  function gambar(gulir) {
    const nHal = Math.max(1, Math.ceil(hasil.length / PER_HAL)), a = (st.hal - 1) * PER_HAL;
    $("akDaftar").innerHTML = hasil.slice(a, a + PER_HAL).map((o, j) => kartu(o, a + j)).join("");
    $("akJumlah").innerHTML = hasil.length ? `<b>${angka(hasil.length)}</b> pakar, menampilkan ${angka(a + 1)} sampai ${angka(Math.min(a + PER_HAL, hasil.length))}` : "";
    $("akHampa").hidden = hasil.length > 0;
    const nomor = [...new Set([1, st.hal - 1, st.hal, st.hal + 1, nHal])].filter(n => n >= 1 && n <= nHal).sort((x, y) => x - y);
    let isi = `<button type="button" data-h="${st.hal - 1}" ${st.hal === 1 ? "disabled" : ""} aria-label="Halaman sebelumnya">‹</button>`, prev = 0;
    for (const n of nomor) { if (n - prev > 1) isi += "<span>…</span>"; isi += `<button type="button" data-h="${n}"${n === st.hal ? ' aria-current="page"' : ""}>${angka(n)}</button>`; prev = n; }
    isi += `<button type="button" data-h="${st.hal + 1}" ${st.hal === nHal ? "disabled" : ""} aria-label="Halaman berikutnya">›</button>`;
    $("akHal").innerHTML = nHal > 1 ? isi : "";
    if (gulir) $("akJumlah").scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"});
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
    $("akKIsi").innerHTML = k ? `${logoKecil(k)}<em>${esc(k)}</em>` : "<em>Semua kampus dan lembaga</em>";
    bukaKampus(false); saring();
  }

  /* ---------- lembar detail ---------- */
  function buka(o) {
    const IK = {buka: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'};
    const tautan = [[`https://openalex.org/${o[0]}`, "OpenAlex"], o[10] && [`https://sinta.kemdiktisaintek.go.id/authors/profile/${o[10]}`, "SINTA"],
      o[7] && [`https://orcid.org/${o[7]}`, "ORCID"], [`https://scholar.google.com/scholar?q=${encodeURIComponent('"' + o[1] + '"')}`, "Google Scholar"]].filter(Boolean);
    const status = o[13] === "s" ? ["ok", "Terdaftar di SINTA"] : o[13] === "x" ? ["", "Tidak ditemukan di SINTA"] : ["", "Belum dicocokkan dengan SINTA"];
    $("akDIsi").innerHTML = `<div class="ak-dkepala">${sosok(o, true)}<div class="ak-nama"><h2 id="akDNama">${esc(o[1])}</h2>
        <p>${sub(o)}</p><span class="ak-tanda ${status[0]}">${status[1]}</span></div></div>
      <div class="ak-dtubuh">
        ${metrik(o)}
        <section class="ak-dbagian"><h3>Rumpun bahaya</h3><div class="ak-pil">${o[3].map((r, j) => pilRumpun(r, j === 0)).join("")}</div></section>
        ${o[12] ? `<section class="ak-dbagian"><h3>Bidang menurut SINTA</h3><p>${esc(o[12])}</p></section>` : ""}
        <section class="ak-dbagian"><h3>Topik riset utama</h3><div class="ak-topik">${o[8].map(t => `<span>${esc(t)}</span>`).join("")}</div></section>
        <section class="ak-dbagian"><h3>Profil di luar</h3><div class="ak-tautan">${tautan.map(([u, n]) => `<a href="${esc(u)}" ${LUAR}>${n}${ikon(IK.buka, "currentColor")}</a>`).join("")}</div></section>
      </div>`;
    $("akLembar").hidden = false;
    document.body.style.overflow = "hidden";
    $("akLembar").querySelector(".ak-x").focus();
  }
  function tutup() { $("akLembar").hidden = true; document.body.style.overflow = ""; }

  function siapkan(d) {
    const per = {};
    perK = {};
    semua.forEach(o => { o[3].forEach(r => { per[r] = (per[r] || 0) + 1; }); perK[o[2]] = (perK[o[2]] || 0) + 1; if (o[14] && !logoK[o[2]]) logoK[o[2]] = o[14]; });
    semua.forEach(o => { if (!o[14] && logoK[o[2]]) o[14] = logoK[o[2]]; });   // logo kampus dipinjam dari rekan sekampus yang sudah tercocokkan SINTA
    const kampus = Object.keys(perK).filter(k => jenisK(k) === "k").length;
    $("akAngka").innerHTML = [
      [semua.length, "pakar terhimpun", '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5.5 2 5.5 5"/>', "#e8590c"],
      [kampus, "universitas dan kampus", '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c2 2 10 2 12 0v-5M22 9v6"/>', "#4263eb"],
      [Object.keys(perK).length - kampus, "lembaga riset dan pemerintah", '<path d="M3 21h18M5 21V10M19 21V10M9 21v-7M15 21v-7M2 10l10-6 10 6z"/>', "#5f3dc4"],
      [semua.filter(o => o[13] === "s").length, "terdaftar di SINTA", '<path d="M12 3l2.5 2 3.2-.3.8 3.1 2.7 1.8-1.3 3 1.3 3-2.7 1.8-.8 3.1-3.2-.3L12 21l-2.5-2-3.2.3-.8-3.1L2.8 14.4l1.3-3-1.3-3 2.7-1.8.8-3.1 3.2.3z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>', "#2b8a3e"]]
      .map(([n, l, ic, w]) => `<div><span class="ak-kpi-ikon" style="--w:${w}">${ikon(ic, w)}</span><b>${angka(n)}</b><span>${l}</span></div>`).join("");
    $("akRumpun").innerHTML = `<button type="button" data-r="" aria-pressed="true">Semua rumpun</button>` +
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
    document.addEventListener("click", e => { if (!$("akKPop").hidden && !e.target.closest(".ak-kampus-pilih")) bukaKampus(false); });
    $("akDaftar").addEventListener("click", e => { const b = e.target.closest(".ak-orang"); if (b) buka(hasil[+b.dataset.i]); });
    $("akLembar").addEventListener("click", e => { if (e.target.closest("[data-tutup]")) tutup(); });
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      if (!$("akLembar").hidden) tutup(); else if (!$("akKPop").hidden) { bukaKampus(false); $("akKBtn").focus(); }
    });
    $("akReset").addEventListener("click", () => {
      Object.assign(st, {q: "", rumpun: "", sumber: ""}); $("akQ").value = "";
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
    if (img.classList.contains("ak-logo") || img.classList.contains("ak-klogo")) { img.remove(); return; }
    if (!img.classList.contains("ak-foto")) return;
    const s = document.createElement("span"); s.className = img.className; s.textContent = img.dataset.inisial; s.setAttribute("aria-hidden", "true");
    img.replaceWith(s);
  }, true);
  mulai();
})();
