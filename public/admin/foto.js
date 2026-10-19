/* Admin foto lapangan (/admin/foto): antrean persetujuan, yang tayang, yang ditolak, komentar, dan tombol dummy 🧪/🧹.
   CSP admin: tanpa skrip/gaya inline, jadi semua gaya lewat kelas di foto.css. Data dari /api/foto/admin (sesi admin). */
(() => {
  const app = document.getElementById("app"), API = "/api/foto";
  try { localStorage.setItem("pb_admin", "1"); } catch (e) {}   // halaman publik ikut memuat dummy untuk admin
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const jam = t => new Date(t).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB";
  /* nama kategori per bencana dari registry (public/bencana.json: foto_kategori); sebelum termuat / gagal = kategori karhutla */
  let KAT = {karhutla: {api: "Api", asap: "Asap", padam: "Pemadaman", dampak: "Dampak", lainnya: "Lainnya"}}, NAMA = {};
  const namaKat = f => { const b = f.bencana || "karhutla", k = KAT[b]?.[f.kategori] || f.kategori; return b === "karhutla" ? k : `${NAMA[b] || b} · ${k}`; };
  let tab = "menunggu";
  const kirim = (url, body) => fetch(url, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)}).then(async r => ({ok: r.ok, j: await r.json().catch(() => ({}))}));

  function lencana(f) {
    const L = [[`GPS perangkat ±${f.akurasi} m`, f.akurasi <= 100 ? "baik" : "sedang"],
      [f.kamera ? "Dari kamera" : "Dari galeri", f.kamera ? "baik" : "sedang"],
      [f.exif_waktu ? "Waktu EXIF cocok" : "Tanpa waktu EXIF", f.exif_waktu ? "baik" : "sedang"],
      [f.exif_jarak == null ? "Tanpa GPS EXIF" : `GPS EXIF ${f.exif_jarak} m dari perangkat`, f.exif_jarak == null ? "sedang" : "baik"]];
    for (const c of (f.gps_curiga || "").split(" · ").filter(Boolean)) L.push([`Curiga GPS palsu: ${c}`, "buruk"]);
    if (f.aduan) L.push([`${f.aduan} aduan`, "buruk"]);
    if (f.dummy) L.push(["DUMMY", "dummy"]);
    return L.map(([t, k]) => `<span class="af-l ${k}">${esc(t)}</span>`).join("");
  }
  const kartu = f => `<article class="af-k" data-id="${f.id}">
    <a class="af-media" href="${API}/media/${f.id}" target="_blank" rel="noopener">${f.jenis === "video" ? `<video src="${API}/media/${f.id}" controls preload="metadata" poster="${API}/thumb/${f.id}"></video>` : `<img alt="" loading="lazy" src="${API}/thumb/${f.id}">`}</a>
    <div class="af-isi"><div class="af-atas"><b>${esc(namaKat(f))}${f.jenis === "video" ? ` · video ${Math.round(f.durasi)} dtk` : ""}</b><span>${jam(f.dibuat)}</span></div>
      <p class="af-ket">${esc(f.keterangan) || '<i class="af-redup">tanpa keterangan</i>'}</p>
      <p class="af-wil">Kec. ${esc(f.kec)}, ${esc(f.kab)} · <a href="https://www.google.com/maps?q=${f.lat},${f.lon}" target="_blank" rel="noopener">${(+f.lat).toFixed(5)}, ${(+f.lon).toFixed(5)}</a></p>
      <p class="af-redup">Diambil ${jam(f.diambil)} · ${f.nama ? esc(f.nama) + (f.tampil_nama ? " (kredit tampil)" : " (anonim)") : "tanpa nama"}${f.email ? " · " + esc(f.email) : ""} · pengirim ${f.pengirim} · ${Math.round(f.ukuran / 1024)} KB</p>
      <div class="af-lencana">${lencana(f)}</div>
      ${f.alasan ? `<p class="af-redup">Alasan: ${esc(f.alasan)}</p>` : ""}
      <div class="af-aksi">${tab !== "tayang" ? '<button class="ad-tombol utama" data-a="setujui">✅ Setujui</button>' : ""}${tab !== "ditolak" ? '<button class="ad-tombol" data-a="tolak">⛔ Tolak</button>' : ""}<button class="ad-tombol bahaya" data-a="hapus">🗑️ Hapus</button>
        ${tab === "tayang" ? `<a class="ad-tombol" href="/f/${f.id}" target="_blank" rel="noopener">🔗 Lihat publik</a>` : ""}</div></div></article>`;

  async function muat() {
    const r = await fetch(tab === "komentar" ? `${API}/admin?komentar=1` : `${API}/admin?status=${tab}`);
    if (r.status === 403) { location.href = "/admin/masuk"; return; }
    const j = await r.json(), n = j.jumlah || muat.n || {}; if (j.jumlah) muat.n = j.jumlah;
    const tabs = [["menunggu", "⏳ Menunggu"], ["tayang", "✅ Tayang"], ["ditolak", "⛔ Ditolak"], ["komentar", "💬 Komentar"]];
    app.innerHTML = `<nav class="ad-tabs" aria-label="Antrean foto">${tabs.map(([k, l]) => `<button data-tab="${k}" aria-pressed="${k === tab}">${l}${n[k] != null ? ` <b>${n[k]}</b>` : ""}</button>`).join("")}</nav>
      <div class="af-daftar">${tab === "komentar" ? komentar(j) : (j.foto.length ? j.foto.map(kartu).join("") : `<p class="af-kosong">${tab === "menunggu" ? "Antrean kosong. Semua foto sudah diperiksa." : "Belum ada foto di sini."}</p>`)}</div>`;
  }
  /* table-app: kepala kolom tetap tergambar walau kosong (selera #94); di HP jadi kartu lewat data-label. */
  const komentar = xs => `<div class="ad-tabel-wadah"><table class="ad-tabel"><thead><tr><th>Waktu</th><th>Komentar</th><th>Foto</th><th>Aduan</th><th>Aksi</th></tr></thead><tbody>${xs.length ? xs.map(k => `<tr class="${k.disembunyikan ? "af-sembunyi" : ""}">
    <td class="w" data-label="Waktu">${jam(k.dibuat)}</td><td data-label="Komentar"><span><b>${esc(k.nama || "Warga")}</b> ${esc(k.teks)}${k.dummy ? ' <span class="af-l dummy">DUMMY</span>' : ""}</span></td><td data-label="Foto"><a href="/f/${k.foto_id}" target="_blank" rel="noopener">${esc(k.kab)}</a></td><td class="n" data-label="Aduan">${k.aduan}</td>
    <td class="a"><button class="ad-tombol kecil" data-k="${k.id}" data-a="${k.disembunyikan ? "tampilkan_komentar" : "sembunyikan_komentar"}">${k.disembunyikan ? "👁️ Tampilkan" : "🙈 Sembunyikan"}</button></td></tr>`).join("") : '<tr><td colspan="5" class="af-kosong-baris">Belum ada komentar.</td></tr>'}</tbody></table></div>`;

  /* tombol dummy 🧪/🧹 (DUMMY.md) tinggal di slot kanan judul halaman, di luar #app yang dirender ulang tiap ganti tab */
  const aksiJudul = document.getElementById("aksiJudul");
  aksiJudul.innerHTML = '<button class="ad-tombol ad-bulat" data-dummy="isi" title="Isi data dummy untuk halaman ini" aria-label="Isi data dummy">🧪</button><button class="ad-tombol ad-bulat" data-dummy="hapus" title="Hapus semua data dummy" aria-label="Hapus data dummy">🧹</button>';
  const klik = async e => {
    const t = e.target.closest("[data-tab]"); if (t) { tab = t.dataset.tab; app.querySelectorAll("[data-tab]").forEach(b => b.setAttribute("aria-pressed", b === t)); return muat(); }
    const d = e.target.closest("[data-dummy]");
    if (d) {
      if (d.dataset.dummy === "hapus" && !confirm("Hapus SEMUA foto, suka, dan komentar dummy? Data asli tidak tersentuh.")) return;
      /* halaman ini memuat foto SEMUA bencana: 🧪 mengisi tiap bencana (409 = sudah ada, dilewati); halaman bencana mengisi bencananya sendiri (public/foto.js) */
      let r, n = 0;
      if (d.dataset.dummy === "isi") { for (const b of Object.keys(KAT)) { const x = await kirim(`${API}/dummy`, {aksi: "isi", bencana: b}); if (x.ok) n += x.j.foto; else r = x; } r = n || !r ? {ok: true, j: {foto: n}} : r; }
      else r = await kirim(`${API}/dummy`, {aksi: "hapus"});
      alert(r.ok ? (d.dataset.dummy === "isi" ? `${r.j.foto} foto dummy dibuat (menunggu, tayang, ditolak) beserta suka, komentar, dan aduan.` : `${r.j.foto} foto dan ${r.j.komentar} komentar dummy dihapus.`) : r.j.galat);
      return location.reload();   // muat ulang penuh (DUMMY.md syarat 6)
    }
    if (e.currentTarget === aksiJudul) return;
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
  };
  app.addEventListener("click", klik); aksiJudul.addEventListener("click", klik);
  fetch("/bencana.json").then(r => r.ok ? r.json() : null).catch(() => null).then(j => {
    for (const b of j?.bencana || []) { KAT[b.id] = Object.fromEntries(b.foto_kategori || []); NAMA[b.id] = b.nama; }
  }).then(muat);
})();
