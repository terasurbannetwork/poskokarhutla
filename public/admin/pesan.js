/* Kotak pesan admin: daftar, saring, cari, tandai dibaca/arsip, balas lewat email (mailto). Data dari /api/pesan (dijaga sesi). */
(() => {
  const $ = s => document.querySelector(s), app = $("#app");
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const waktu = t => new Date(t + 7 * 36e5).toISOString().slice(0, 16).replace("T", " ") + " WIB";
  const st = {status: "aktif", kategori: "", q: ""};
  let d = null, tunda;
  const ambil = async (u, o) => { const r = await fetch(u, {credentials: "same-origin", ...o}); if (r.status === 401) { location.href = "/admin/masuk"; throw new Error("sesi habis"); }
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).galat || r.status); return r.json(); };
  function render() {
    const h = d.hitung, K = d.kategori;
    const balas = p => `mailto:${encodeURIComponent(p.email)}?subject=${encodeURIComponent("Re: pesan kamu ke Centurisk97 (" + K[p.kategori] + ")")}&body=${encodeURIComponent(`Halo ${p.nama || ""},\n\n\n\n---\nPesan kamu (${waktu(p.dibuat)}):\n${p.isi}`)}`;
    app.innerHTML = `
    ${d.email_siap ? "" : `<div class="ad-spanduk" role="status"><b>Notifikasi email belum dikonfigurasi.</b> Pesan tetap tersimpan di sini; set EMAIL_API_KEY, EMAIL_FROM, EMAIL_TO agar tiap pesan baru juga dikirim ke email.</div>`}
    <nav class="ad-tabs" aria-label="Status pesan">
      ${[["aktif", "📥 Kotak masuk", (h.baru || 0) + (h.dibaca || 0)], ["baru", "✉️ Belum dibaca", h.baru || 0], ["dibaca", "📖 Dibaca", h.dibaca || 0], ["arsip", "🗄️ Arsip", h.arsip || 0], ["semua", "📚 Semua", null]]
        .map(([k, l, n]) => `<button data-s="${k}" aria-pressed="${st.status === k}">${l}${n != null ? ` <b>${n}</b>` : ""}</button>`).join("")}
    </nav>
    <div class="ad-kontrol" role="toolbar" aria-label="Saring pesan">
      <select id="kat" aria-label="Kategori"><option value="">Semua kategori</option>${Object.entries(K).map(([k, n]) => `<option value="${k}" ${st.kategori === k ? "selected" : ""}>${n}</option>`).join("")}</select>
      <input type="search" id="q" placeholder="🔎 Cari nama, instansi, email, isi" value="${esc(st.q)}" aria-label="Cari pesan">
    </div>
    <div class="ad-pesan">${d.pesan.length ? d.pesan.map(p => `<article class="ad-msg" data-status="${p.status}" data-id="${p.id}">
      <header><b>${esc(p.nama || "(tanpa nama)")}</b>${p.instansi ? `<span class="ad-redup">${esc(p.instansi)}</span>` : ""}<span class="ad-pil">${esc(K[p.kategori])}</span>
        <span class="ad-pil ${p.status}">${p.status}</span><span class="ad-redup kecil">${waktu(p.dibuat)}</span></header>
      <div class="isi">${esc(p.isi)}</div>
      <div class="ad-redup kecil">${esc(p.email)}${p.tautan ? ` · <a href="${esc(p.tautan)}" target="_blank" rel="noopener noreferrer">tampilan yang dibuka</a>` : ""}</div>
      <div class="aksi"><a class="ad-tombol kecil utama" href="${balas(p)}" data-baca>📧 Balas lewat email</a>
        ${p.status !== "dibaca" ? `<button class="ad-tombol kecil" data-ke="dibaca">📖 Tandai dibaca</button>` : `<button class="ad-tombol kecil" data-ke="baru">✉️ Tandai belum dibaca</button>`}
        ${p.status !== "arsip" ? `<button class="ad-tombol kecil" data-ke="arsip">🗄️ Arsipkan</button>` : `<button class="ad-tombol kecil" data-ke="dibaca">↩️ Keluarkan dari arsip</button>`}</div>
    </article>`).join("") : `<p class="ad-kosong">Tidak ada pesan.</p>`}</div>
    <p class="ad-catat">Pesan dihapus otomatis 180 hari setelah dikirim. Email pengirim hanya untuk membalas.</p>`;
    app.querySelectorAll("[data-s]").forEach(b => b.onclick = () => { st.status = b.dataset.s; muat(); });
    $("#kat").onchange = e => { st.kategori = e.target.value; muat(); };
    $("#q").oninput = e => { clearTimeout(tunda); tunda = setTimeout(() => { st.q = e.target.value.trim(); muat(true); }, 350); };
    app.querySelectorAll("[data-ke]").forEach(b => b.onclick = () => ubah(b.closest("[data-id]").dataset.id, b.dataset.ke));
    app.querySelectorAll("[data-baca]").forEach(a => a.addEventListener("click", () => { const m = a.closest("[data-id]"); if (m.dataset.status === "baru") ubah(m.dataset.id, "dibaca"); }));
    const b = $("#badgePesan"); if (b) { b.hidden = !h.baru; b.textContent = h.baru || ""; }
  }
  async function ubah(id, status) {
    try { await ambil(`/api/pesan/${id}`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({status})}); muat(); }
    catch (e) { alert("Gagal mengubah status: " + e.message); }
  }
  async function muat(jagaFokus) {
    const p = new URLSearchParams({status: st.status}); if (st.kategori) p.set("kategori", st.kategori); if (st.q) p.set("q", st.q);
    try { d = await ambil("/api/pesan?" + p); render(); if (jagaFokus) { const q = $("#q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
    catch (e) { app.innerHTML = `<p class="ad-galat">Pesan gagal dimuat: ${esc(e.message)}</p>`; }
  }
  muat();
})();
