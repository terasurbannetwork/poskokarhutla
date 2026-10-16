/* Admin media sosial (/admin/sosmed): tempel URL post Instagram/X/Threads, kelola yang tampil di tab Berita.
   CSP admin: tanpa skrip/gaya inline. Semua teks dari data lewat esc() atau textContent; data dari /api/sosmed/admin (sesi admin). */
(() => {
  const app = document.getElementById("app"), API = "/api/sosmed";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const jam = t => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB";
  const NAMA = {instagram: "Instagram", x: "X", threads: "Threads"};
  const kirim = (url, body) => fetch(url, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)}).then(async r => ({ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}));

  app.innerHTML = `<form class="sm-form" id="smForm" autocomplete="off">
    <label>URL post<input name="url" type="url" required placeholder="https://x.com/akun/status/123… atau instagram.com/p/… atau threads.com/@akun/post/…"></label>
    <label>Teks ringkas (opsional; untuk X diisi otomatis bila kosong)<textarea name="teks" rows="2" maxlength="500"></textarea></label>
    <div class="sm-baris">
      <label>Akun (opsional)<input name="akun" maxlength="40" placeholder="@akun"></label>
      <label>Kode provinsi (opsional)<input name="prov" inputmode="numeric" pattern="[0-9]{2}" maxlength="2" placeholder="mis. 16"></label>
    </div>
    <div><button class="ad-tombol utama" type="submit">➕ Tambahkan</button></div>
    <p class="sm-pesan" id="smPesan" role="status"></p>
  </form>
  <div class="sm-daftar" id="smDaftar"><p class="ad-redup">Memuat…</p></div>`;
  const form = document.getElementById("smForm"), pesan = document.getElementById("smPesan"), daftar = document.getElementById("smDaftar");
  const say = (t, k) => { pesan.textContent = t; pesan.className = "sm-pesan " + (k || ""); };

  async function muat() {
    const r = await fetch(`${API}/admin`);
    if (r.status === 403) { location.href = "/admin/masuk"; return; }
    const {post = []} = await r.json().catch(() => ({}));
    daftar.innerHTML = post.length ? post.map(p => `<article class="sm-k ${p.tampil ? "" : "sembunyi"}" data-id="${esc(p.id)}">
      <div class="sm-isi"><b>${esc(NAMA[p.platform] || p.platform)}${p.akun ? " · " + esc(p.akun) : ""}${p.prov ? " · prov " + esc(p.prov) : ""}</b>
        <p>${p.teks ? esc(p.teks) : '<i class="ad-redup">tanpa teks</i>'}</p>
        <p class="sm-meta"><a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">Buka post</a> · ${esc(jam(p.dibuat))} · ${esc(p.bencana)}${p.tampil ? "" : " · disembunyikan"}</p></div>
      <button class="ad-tombol" data-tampil="${p.tampil ? 0 : 1}">${p.tampil ? "🙈 Sembunyikan" : "👁️ Tampilkan"}</button></article>`).join("")
      : '<p class="ad-redup">Belum ada post. Tempel URL di atas.</p>';
  }

  form.addEventListener("submit", async e => {
    e.preventDefault(); const f = new FormData(form), b = {};
    for (const k of ["url", "teks", "akun", "prov"]) { const v = String(f.get(k) || "").trim(); if (v) b[k] = v; }
    const t = form.querySelector("button"); t.disabled = true; say("Menyimpan…");
    const r = await kirim(API, b); t.disabled = false;
    if (!r.ok) return say(r.j.galat || `Gagal (${r.status})`, "galat");
    form.reset(); say("Post ditambahkan. Tampil di tab Berita dalam beberapa menit.", "ok"); muat();
  });
  daftar.addEventListener("click", async e => {
    const t = e.target.closest("[data-tampil]"); if (!t) return;
    t.disabled = true;
    const r = await kirim(`${API}/${t.closest("[data-id]").dataset.id}`, {tampil: +t.dataset.tampil});
    if (!r.ok) { t.disabled = false; return say(r.j.galat || `Gagal (${r.status})`, "galat"); }
    muat();
  });
  muat();
})();
