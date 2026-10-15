/* Admin foto lapangan (/admin/foto): antrean persetujuan, yang tayang, yang ditolak, komentar, dan tombol dummy 🧪/🧹.
   CSP admin: tanpa skrip/gaya inline, jadi semua gaya lewat kelas di foto.css. Data dari /api/foto/admin (sesi admin). */
(() => {
  const app = document.getElementById("app"), API = "/api/foto";
  try { localStorage.setItem("pb_admin", "1"); } catch (e) {}   // halaman publik ikut memuat dummy untuk admin
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const jam = t => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB";
  const KAT = {api: "Api", asap: "Asap", padam: "Pemadaman", dampak: "Dampak", lainnya: "Lainnya"};
  let tab = "menunggu";
  const kirim = (url, body) => fetch(url, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)}).then(async r => ({ok: r.ok, j: await r.json().catch(() => ({}))}));

  function lencana(f) {
    const L = [[`GPS perangkat ±${f.akurasi} m`, f.akurasi <= 100 ? "baik" : "sedang"],
      [f.kamera ? "Dari kamera" : "Dari galeri", f.kamera ? "baik" : "sedang"],
      [f.exif_waktu ? "Waktu EXIF cocok" : "Tanpa waktu EXIF", f.exif_waktu ? "baik" : "sedang"],
      [f.exif_jarak == null ? "Tanpa GPS EXIF" : `GPS EXIF ${f.exif_jarak} m dari perangkat`, f.exif_jarak == null ? "sedang" : "baik"]];
    if (f.aduan) L.push([`${f.aduan} aduan`, "buruk"]);
    if (f.dummy) L.push(["DUMMY", "dummy"]);
    return L.map(([t, k]) => `<span class="af-l ${k}">${esc(t)}</span>`).join("");
  }
  const kartu = f => `<article class="af-k" data-id="${f.id}">
    <a class="af-media" href="${API}/media/${f.id}" target="_blank" rel="noopener">${f.jenis === "video" ? `<video src="${API}/media/${f.id}" controls preload="metadata" poster="${API}/thumb/${f.id}"></video>` : `<img alt="" loading="lazy" src="${API}/thumb/${f.id}">`}</a>
    <div class="af-isi"><div class="af-atas"><b>${KAT[f.kategori]}${f.jenis === "video" ? ` · video ${Math.round(f.durasi)} dtk` : ""}</b><span>${jam(f.dibuat)}</span></div>
      <p class="af-ket">${esc(f.keterangan) || '<i class="af-redup">tanpa keterangan</i>'}</p>
      <p class="af-wil">Kec. ${esc(f.kec)}, ${esc(f.kab)} · <a href="https://www.google.com/maps?q=${f.lat},${f.lon}" target="_blank" rel="noopener">${f.lat}, ${f.lon}</a></p>
      <p class="af-redup">Diambil ${jam(f.diambil)} · ${f.nama ? esc(f.nama) + (f.tampil_nama ? " (kredit tampil)" : " (anonim)") : "tanpa nama"}${f.email ? " · " + esc(f.email) : ""} · pengirim ${f.pengirim} · ${Math.round(f.ukuran / 1024)} KB</p>
      <div class="af-lencana">${lencana(f)}</div>
      ${f.alasan ? `<p class="af-redup">Alasan: ${esc(f.alasan)}</p>` : ""}
      <div class="af-aksi">${tab !== "tayang" ? '<button class="af-ya" data-a="setujui">Setujui</button>' : ""}${tab !== "ditolak" ? '<button data-a="tolak">Tolak</button>' : ""}<button class="af-hapus" data-a="hapus">Hapus</button>
        ${tab === "tayang" ? `<a href="/f/${f.id}" target="_blank" rel="noopener">Lihat publik ↗</a>` : ""}</div></div></article>`;

  async function muat() {
    app.innerHTML = '<p class="ad-redup">Memuat…</p>';
    const r = await fetch(tab === "komentar" ? `${API}/admin?komentar=1` : `${API}/admin?status=${tab}`);
    if (r.status === 403) { location.href = "/admin/masuk"; return; }
    const j = await r.json(), n = j.jumlah || muat.n || {}; if (j.jumlah) muat.n = j.jumlah;
    const tabs = [["menunggu", "Menunggu"], ["tayang", "Tayang"], ["ditolak", "Ditolak"], ["komentar", "Komentar"]];
    app.innerHTML = `<div class="af-kepala"><h1>Foto lapangan</h1><div class="af-dummy"><button data-dummy="isi" title="Isi data dummy untuk halaman ini">🧪</button><button data-dummy="hapus" title="Hapus semua data dummy">🧹</button></div></div>
      <nav class="af-tab">${tabs.map(([k, l]) => `<button data-tab="${k}" aria-pressed="${k === tab}">${l}${n[k] != null ? ` <b>${n[k]}</b>` : ""}</button>`).join("")}</nav>
      <div class="af-daftar">${tab === "komentar" ? komentar(j) : (j.foto.length ? j.foto.map(kartu).join("") : `<p class="af-kosong">${tab === "menunggu" ? "Antrean kosong. Semua foto sudah diperiksa." : "Belum ada foto di sini."}</p>`)}</div>`;
  }
  const komentar = xs => xs.length ? `<table class="af-tb"><thead><tr><th>Waktu</th><th>Komentar</th><th>Foto</th><th>Aduan</th><th></th></tr></thead><tbody>${xs.map(k => `<tr class="${k.disembunyikan ? "af-sembunyi" : ""}">
    <td>${jam(k.dibuat)}</td><td><b>${esc(k.nama || "Warga")}</b> ${esc(k.teks)}${k.dummy ? ' <span class="af-l dummy">DUMMY</span>' : ""}</td><td><a href="/f/${k.foto_id}" target="_blank" rel="noopener">${esc(k.kab)}</a></td><td>${k.aduan}</td>
    <td><button data-k="${k.id}" data-a="${k.disembunyikan ? "tampilkan_komentar" : "sembunyikan_komentar"}">${k.disembunyikan ? "Tampilkan" : "Sembunyikan"}</button></td></tr>`).join("")}</tbody></table>` : '<p class="af-kosong">Belum ada komentar.</p>';

  app.addEventListener("click", async e => {
    const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; return muat(); }
    const d = e.target.closest("[data-dummy]");
    if (d) {
      if (d.dataset.dummy === "hapus" && !confirm("Hapus SEMUA foto, suka, dan komentar dummy? Data asli tidak tersentuh.")) return;
      const r = await kirim(`${API}/dummy`, {aksi: d.dataset.dummy});
      alert(r.ok ? (d.dataset.dummy === "isi" ? `${r.j.foto} foto dummy dibuat (menunggu, tayang, ditolak) beserta suka, komentar, dan aduan.` : `${r.j.foto} foto dan ${r.j.komentar} komentar dummy dihapus.`) : r.j.galat);
      return location.reload();   // muat ulang penuh (DUMMY.md syarat 6)
    }
    const a = e.target.closest("[data-a]"); if (!a) return;
    const id = a.dataset.k || a.closest("[data-id]").dataset.id, aksi = a.dataset.a;
    let alasan = "";
    if (aksi === "tolak") { alasan = prompt("Alasan penolakan (tercatat di audit):", "Tidak relevan dengan kejadian"); if (!alasan) return; }
    if (aksi === "hapus" && !confirm("Hapus permanen foto ini beserta berkas, suka, dan komentarnya?")) return;
    a.disabled = true;
    const r = await kirim(`${API}/admin/${id}`, {aksi, alasan});
    if (!r.ok) { a.disabled = false; return alert(r.j.galat || "Gagal"); }
    if (a.dataset.k) return muat();
    a.closest("[data-id]").remove(); muat.n && (muat.n[tab] = Math.max(0, (muat.n[tab] || 1) - 1));
  });
  muat();
})();
