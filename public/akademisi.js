/* /akademisi: direktori pakar kebencanaan, hanya staf BNPB dan admin. Data dari GET /api/akademisi (R2, bersesi; src/akademisi.js).
   Baris = [id, nama, kampus, [rumpun], h, karya, sitasi, orcid, [topik], foto, idSinta, prodi, subjek, status (s terdaftar SINTA, x tidak ada, "" belum dicek)].
   Semua teks dari luar di-escape. CSP: tanpa inline (galat foto ditangkap lewat listener capture). */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const angka = n => Number(n || 0).toLocaleString("id-ID");
  const inisial = n => n.replace(/[^\p{L} ]/gu, "").split(/\s+/).filter(w => w.length > 1).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
  const LUAR = 'target="_blank" rel="noopener noreferrer"';
  const LANGKAH = 60;
  let semua = [], hasil = [], tampil = 0, tunda = 0, rumpunAktif = "";

  const foto = (o, besar) => o[9]
    ? `<img class="ak-foto${besar ? " besar" : ""}" src="${esc(o[9])}" alt="" loading="lazy" referrerpolicy="no-referrer" data-inisial="${esc(inisial(o[1]))}">`
    : `<span class="ak-foto${besar ? " besar" : ""}" aria-hidden="true">${esc(inisial(o[1]))}</span>`;
  const sub = o => esc(o[11] ? `${o[11].replace(/\s*\((S\d|D\d|Sp-?\d)\)$/, "")}, ${o[2]}` : o[2]);

  function kartu(o, i) {
    return `<button type="button" class="ak-orang" data-i="${i}">
      <div class="ak-atas">${foto(o)}<div class="ak-nama"><h3>${esc(o[1])}</h3><p>${sub(o)}</p></div></div>
      <div class="ak-pil">${o[3].map((r, j) => `<span${j === 0 ? ' class="utama"' : ""}>${esc(r)}</span>`).join("")}</div>
      <div class="ak-metrik"><div><b>${angka(o[4])}</b><span>h-index</span></div><div><b>${angka(o[5])}</b><span>karya</span></div><div><b>${angka(o[6])}</b><span>sitasi</span></div></div>
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
    $("akDIsi").innerHTML = `<div class="ak-atas">${foto(o, true)}<div class="ak-nama"><h2 id="akDNama">${esc(o[1])}</h2><p>${sub(o)}</p>
        <p class="ak-tanda${o[13] === "s" ? " ok" : ""}">${o[13] === "s" ? "Terdaftar di SINTA" : o[13] === "x" ? "Tidak ditemukan di SINTA" : "Belum dicocokkan dengan SINTA"}</p></div></div>
      <div class="ak-metrik"><div><b>${angka(o[4])}</b><span>h-index</span></div><div><b>${angka(o[5])}</b><span>karya</span></div><div><b>${angka(o[6])}</b><span>sitasi</span></div></div>
      <div class="ak-dbagian"><h3>Rumpun bahaya</h3><div class="ak-pil">${o[3].map((r, j) => `<span${j === 0 ? ' class="utama"' : ""}>${esc(r)}</span>`).join("")}</div></div>
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
    $("akAngka").innerHTML = [[semua.length, "pakar terhimpun"], [Object.keys(perK).length, "kampus dan lembaga"], [dosen, "terdaftar di SINTA"],
      [semua.filter(o => o[4] >= 20).length, "h-index 20 ke atas"]].map(([n, l]) => `<div><b>${angka(n)}</b><span>${l}</span></div>`).join("");
    $("akRumpun").innerHTML = `<button type="button" data-r="" aria-pressed="true">Semua</button>` +
      d.rumpun.slice().sort((a, b) => (per[b] || 0) - (per[a] || 0)).map(r => `<button type="button" data-r="${esc(r)}" aria-pressed="false">${esc(r)}<span>${angka(per[r] || 0)}</span></button>`).join("");
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
    if (img.tagName !== "IMG" || !img.classList.contains("ak-foto")) return;
    const s = document.createElement("span"); s.className = img.className; s.textContent = img.dataset.inisial; s.setAttribute("aria-hidden", "true");
    img.replaceWith(s);
  }, true);
  mulai();
})();
