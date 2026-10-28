/* /akademisi: direktori pakar kebencanaan, hanya staf BNPB dan admin. Data dari GET /api/akademisi (R2, bersesi; src/akademisi.js).
   Baris = [id, nama, kampus, [rumpun], h, karya, sitasi, orcid, [topik], foto, idSinta, prodi, subjek, status (s terdaftar SINTA, x tidak ada, "" belum dicek), logo kampus].
   Semua teks dari luar di-escape. CSP: tanpa inline (galat foto ditangkap lewat listener capture). */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const angka = n => Number(n || 0).toLocaleString("id-ID");
  const inisial = n => n.replace(/[^\p{L} ]/gu, "").split(/\s+/).filter(w => w.length > 1).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
  const LUAR = 'target="_blank" rel="noopener noreferrer"';
  const LANGKAH = 60;
  /* rumpun -> [label, ikon (path SVG 24px, garis), warna lembut ikon] */
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
  const pilRumpun = (r, utama) => { const [l, d, w] = RUMPUN[r] || [r, "", "#6b7280"]; return `<span class="ak-r${utama ? " utama" : ""}">${d ? ikon(d, w) : ""}${esc(l)}</span>`; };
  const METRIK = [[4, "h-index", "Pengaruh riset", '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'],
    [5, "Karya", "Publikasi ilmiah", '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>'],
    [6, "Sitasi", "Dikutip peneliti lain", '<path d="M7 7h4v6H5v-2c0-2 1-4 2-4zM15 7h4v6h-6v-2c0-2 1-4 2-4z"/>']];
  const metrik = o => `<div class="ak-metrik">${METRIK.map(([i, l, t, d]) => `<div title="${t}"><span class="ak-mlabel">${ikon(d, "currentColor")}${l}</span><b>${angka(o[i])}</b></div>`).join("")}</div>`;
  let semua = [], hasil = [], tampil = 0, tunda = 0, rumpunAktif = "";

  const foto = (o, besar) => o[9]
    ? `<img class="ak-foto${besar ? " besar" : ""}" src="${esc(o[9])}" alt="" loading="lazy" referrerpolicy="no-referrer" data-inisial="${esc(inisial(o[1]))}">`
    : `<span class="ak-foto${besar ? " besar" : ""}" aria-hidden="true">${esc(inisial(o[1]))}</span>`;
  const sub = o => esc(o[11] ? `${o[11].replace(/\s*\((S\d|D\d|Sp-?\d)\)$/, "")}, ${o[2]}` : o[2]);
  const logo = o => o[14] ? `<img class="ak-logo" src="${esc(o[14])}" alt="Logo ${esc(o[2])}" loading="lazy" referrerpolicy="no-referrer">` : "";
  const sosok = (o, besar) => `<span class="ak-sosok${besar ? " besar" : ""}">${foto(o, besar)}${logo(o)}</span>`;

  function kartu(o, i) {
    return `<button type="button" class="ak-orang" data-i="${i}">
      <div class="ak-atas">${sosok(o)}<div class="ak-nama"><h3>${esc(o[1])}</h3><p>${sub(o)}</p></div></div>
      <div class="ak-pil">${o[3].map((r, j) => pilRumpun(r, j === 0)).join("")}</div>
      ${metrik(o)}
    </button>`;
  }

  function saring() {
    const q = $("akQ").value.trim().toLowerCase(), k = $("akK").value, st = $("akS").value, u = +$("akU").value;
    hasil = semua.filter(o => (!rumpunAktif || o[3].includes(rumpunAktif)) && (!k || o[2] === k)
      && (st === "" || (st === "s" ? o[13] === "s" : o[13] !== "x")) && (!q || o._cari.includes(q)));
    hasil.sort(u === 1 ? (a, b) => a[1].localeCompare(b[1], "id") : (a, b) => b[u] - a[u] || b[4] - a[4]);
    tampil = 0; $("akDaftar").textContent = "";
    $("akJumlah").textContent = `${angka(hasil.length)} pakar ditampilkan`;
    $("akHampa").hidden = hasil.length > 0;
    document.querySelectorAll("#akRumpun button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.r === rumpunAktif)));
    lagi();
  }

  function lagi() {
    $("akDaftar").insertAdjacentHTML("beforeend", hasil.slice(tampil, tampil + LANGKAH).map((o, j) => kartu(o, tampil + j)).join(""));
    tampil += LANGKAH;
    $("akLagi").hidden = tampil >= hasil.length;
  }

  function buka(o) {
    const tautan = [[`https://openalex.org/${o[0]}`, "OpenAlex"], o[10] && [`https://sinta.kemdiktisaintek.go.id/authors/profile/${o[10]}`, "SINTA"],
      o[7] && [`https://orcid.org/${o[7]}`, "ORCID"]].filter(Boolean);
    $("akDIsi").innerHTML = `<div class="ak-atas">${sosok(o, true)}<div class="ak-nama"><h2 id="akDNama">${esc(o[1])}</h2><p>${sub(o)}</p>
        <p class="ak-tanda${o[13] === "s" ? " ok" : ""}">${o[13] === "s" ? "Terdaftar di SINTA" : o[13] === "x" ? "Tidak ditemukan di SINTA" : "Belum dicocokkan dengan SINTA"}</p></div></div>
      ${metrik(o)}
      <div class="ak-dbagian"><h3>Rumpun bahaya</h3><div class="ak-pil">${o[3].map((r, j) => pilRumpun(r, j === 0)).join("")}</div></div>
      ${o[12] ? `<div class="ak-dbagian"><h3>Bidang menurut SINTA</h3><p>${esc(o[12])}</p></div>` : ""}
      <div class="ak-dbagian"><h3>Topik riset utama</h3><ul>${o[8].map(t => `<li>${esc(t)}</li>`).join("")}</ul></div>
      <div class="ak-dbagian"><h3>Profil</h3><div class="ak-tautan">${tautan.map(([u, n]) => `<a class="ak-tbl ak-tbl2" href="${esc(u)}" ${LUAR}>${n}</a>`).join("")}</div></div>
      <p class="ak-catatan">Gelar, jabatan, riwayat pendidikan, dan kontak menyusul dari PDDikti dan laman kampus.</p>`;
    $("akLembar").hidden = false;
    document.body.style.overflow = "hidden";
    $("akLembar").querySelector(".ak-x").focus();
  }
  function tutup() { $("akLembar").hidden = true; document.body.style.overflow = ""; }

  function siapkan(d) {
    const per = {}, perK = {};
    semua.forEach(o => { o[3].forEach(r => { per[r] = (per[r] || 0) + 1; }); perK[o[2]] = (perK[o[2]] || 0) + 1; });
    const dosen = semua.filter(o => o[13] === "s").length;
    $("akAngka").innerHTML = [
      [semua.length, "pakar terhimpun", '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c3 0 5.5 2 5.5 5"/>', "#e8590c"],
      [Object.keys(perK).length, "kampus dan lembaga", '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c2 2 10 2 12 0v-5M22 9v6"/>', "#4263eb"],
      [dosen, "terdaftar di SINTA", '<path d="M12 3l2.5 2 3.2-.3.8 3.1 2.7 1.8-1.3 3 1.3 3-2.7 1.8-.8 3.1-3.2-.3L12 21l-2.5-2-3.2.3-.8-3.1L2.8 14.4l1.3-3-1.3-3 2.7-1.8.8-3.1 3.2.3z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>', "#2b8a3e"],
      [semua.filter(o => o[4] >= 20).length, "h-index 20 ke atas", '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>', "#f08c00"]]
      .map(([n, l, d, w]) => `<div><span class="ak-kpi-ikon" style="--w:${w}">${ikon(d, w)}</span><b>${angka(n)}</b><span>${l}</span></div>`).join("");
    $("akRumpun").innerHTML = `<button type="button" data-r="" aria-pressed="true">Semua</button>` +
      d.rumpun.slice().sort((a, b) => (per[b] || 0) - (per[a] || 0)).map(r => { const [l, ic, w] = RUMPUN[r] || [r, "", "#6b7280"];
        return `<button type="button" data-r="${esc(r)}" aria-pressed="false">${ic ? ikon(ic, w) : ""}${esc(l)}<span>${angka(per[r] || 0)}</span></button>`; }).join("");
    $("akK").insertAdjacentHTML("beforeend", Object.entries(perK).sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `<option value="${esc(k)}">${esc(k)} (${angka(n)})</option>`).join(""));
    $("akSumber").textContent = `${d.sumber}. Diperbarui ${new Date(d.diperbarui + "T00:00:00Z").toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "long", year: "numeric"})}.`;
  }

  async function mulai() {
    $("akMuat").innerHTML = '<div class="ak-hantu"></div>'.repeat(6);
    let r;
    try { r = await fetch("/api/akademisi", {credentials: "same-origin"}); }
    catch (e) { $("akMuat").textContent = ""; $("akSumber").textContent = "Gagal memuat data. Periksa koneksi lalu muat ulang halaman."; return; }
    $("akMuat").textContent = "";
    if (r.status === 401) { $("akMasuk").hidden = false; $("akSumber").textContent = "Perlu masuk"; return; }
    if (!r.ok) { $("akSumber").textContent = (await r.json().catch(() => ({}))).galat || `Gagal memuat (${r.status})`; return; }
    const d = await r.json();
    semua = d.orang.map(o => Object.assign(o, {_cari: [o[1], o[2], o[11], o[12], ...o[8], ...o[3]].join(" ").toLowerCase()}));
    siapkan(d);
    $("akIsi").hidden = false;
    $("akQ").addEventListener("input", () => { clearTimeout(tunda); tunda = setTimeout(saring, 200); });
    ["akK", "akS", "akU"].forEach(id => $(id).addEventListener("change", saring));
    $("akRumpun").addEventListener("click", e => { const b = e.target.closest("button[data-r]"); if (!b) return; rumpunAktif = b.dataset.r; saring(); });
    $("akDaftar").addEventListener("click", e => { const b = e.target.closest(".ak-orang"); if (b) buka(hasil[+b.dataset.i]); });
    $("akLembar").addEventListener("click", e => { if (e.target.closest("[data-tutup]")) tutup(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("akLembar").hidden) tutup(); });
    $("akLagi").addEventListener("click", lagi);
    $("akReset").addEventListener("click", () => { $("akQ").value = ""; $("akK").value = ""; $("akS").value = ""; rumpunAktif = ""; saring(); });
    saring();
  }
  // foto gagal dimuat (Scholar menghapus/menolak): ganti lingkaran inisial
  document.addEventListener("error", e => {
    const img = e.target;
    if (img.tagName !== "IMG") return;
    if (img.classList.contains("ak-logo")) { img.remove(); return; }
    if (!img.classList.contains("ak-foto")) return;
    const s = document.createElement("span"); s.className = img.className; s.textContent = img.dataset.inisial; s.setAttribute("aria-hidden", "true");
    img.replaceWith(s);
  }, true);
  mulai();
})();
