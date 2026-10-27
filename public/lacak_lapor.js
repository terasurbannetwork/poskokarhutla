/* Kartu "Lapor dari lokasi" di /lacak (POST /api/lacak/media lalu /api/lacak/lapor, src/instansi.js laporPetugas). Langkahnya (konfirmasi, kabar, cek ulang) ditentukan server lewat
   info.lapor; petugas hanya memilih kondisi, mengambil foto, lalu Kirim. Laporan tercatat atas nama orang di tautan ini, bukan nama yang diketik.
   - Foto diproses saat dipilih (kompres WebP/JPEG 1600 px, thumbnail JPEG, EXIF waktu dan GPS seperti public/instansi.js) dan disimpan sebagai draf di IndexedDB pb_lacak per tautan
     (pilihan dan foto di dua baris terpisah: ketukan tidak menulis ulang blob). Muat ulang halaman tidak menghapus pilihan dan foto. Selama foto diproses, Kirim terkunci.
   - Kirim: GPS dibaca 3 kali, laporan + foto masuk antrean IndexedDB DULU, baru dikirim. Ulang otomatis saat online, saat halaman terlihat lagi, dan tiap 60 detik dengan jeda bertambah
     (60 detik x 2^n, maks 30 menit). Batas waktu 90 detik per unggahan dan 45 detik per laporan. Berkas diunggah sekali (id diingat, blob-nya dibuang dari antrean),
     laporan memakai klien_id tetap (idempoten di server).
   - Server menolak bacaan GPS lebih dari 6 jam: antrean berumur > 5 jam diberi peringatan. 410 (tautan mati) atau Selesai = draf dan antrean tautan itu dihapus dari ponsel.
   CSP: tanpa skrip/gaya inline; teks data lewat esc(); pratinjau foto lewat blob:. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const waktu = w => new Date(w).toLocaleString("id-ID", new Date(w).toDateString() === new Date().toDateString() ? {hour: "2-digit", minute: "2-digit"} : {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"});
  const idAcak = () => [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(16).padStart(2, "0")).join("");
  const JUDUL = {konfirmasi: "Lapor kondisi di lokasi", kabar: "Kabar terbaru dari lokasi", cekulang: "Cek ulang lokasi yang sudah padam"};
  const ARAHAN = {konfirmasi: "Laporan pertama dari lokasi. Pilih kondisi, ambil minimal satu foto, lalu Kirim. Namamu tercatat sebagai pelapor.",
    kabar: "Kirim kabar tiap ada perubahan, paling lambat sekali sehari. Melaporkan padam wajib berfoto.",
    cekulang: "Periksa tanah dan gambut dengan tangan atau tongkat, lalu foto lokasi yang sudah padam."};
  const LANGKAH = {konfirmasi: "Laporan pertama", kabar: "Kabar", cekulang: "Cek ulang"};
  const NAMA = {menyala: "Api masih menyala", bara: "Tinggal bara atau asap", padam: "Sudah padam", bukan_api: "Bukan api"};
  const BEKAS = [["ya", "Ya, ada"], ["tidak", "Tidak ada"], ["tak_tahu", "Tidak tahu"]];
  const MAKS_FOTO = 5, JEDA0 = 60e3, JEDA_MAKS = 30 * 60e3, UMUR_PERINGATAN = 5 * 3600e3;
  const kosong = () => ({kondisi: null, alasan: null, bekas: null, catatan: "", foto: []});
  let C = null, L = null, kunci = "", draf = kosong(), antrean = [], urls = [], sibuk = false, menyiapkan = false, memproses = false, lagi = false;

  /* ---- IndexedDB: antrean (keyPath id) dan draf (keyPath tk = sha256 token, 24 hex) ---- */
  const idb = () => new Promise((ok, no) => { if (!window.indexedDB) return no(new Error("tanpa IndexedDB")); const r = indexedDB.open("pb_lacak", 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("antrean", {keyPath: "id"}); r.result.createObjectStore("draf", {keyPath: "tk"}); }; r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  async function tx(st, mode, fn) { const d = await idb(); return new Promise((ok, no) => { const t = d.transaction(st, mode), r = fn(t.objectStore(st)); t.oncomplete = () => { d.close(); ok(r?.result); }; t.onerror = t.onabort = () => { d.close(); no(t.error); }; }); }
  const simpan = it => it.memori ? Promise.resolve() : tx("antrean", "readwrite", s => s.put(it)).catch(() => {});
  const buang = async it => { antrean = antrean.filter(x => x !== it); if (!it.memori) await tx("antrean", "readwrite", s => s.delete(it.id)).catch(() => {}); };
  /* pilihan (kecil, tiap ketuk) dan foto (blob, hanya saat foto berubah) disimpan di dua baris store draf */
  const simpanPilihan = () => tx("draf", "readwrite", s => s.put({tk: kunci, kondisi: draf.kondisi, alasan: draf.alasan, bekas: draf.bekas, catatan: draf.catatan})).catch(() => {});
  const simpanFoto = () => tx("draf", "readwrite", s => s.put({tk: kunci + ":foto", foto: draf.foto})).catch(() => {});
  const sha = async s => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 24);

  /* ---- foto: EXIF JPEG (DateTimeOriginal, GPS) dibaca dari berkas asli; canvas membuang EXIF dari berkas yang diunggah. Sama dengan public/instansi.js ---- */
  function bacaExif(buf) {
    try {
      const v = new DataView(buf); if (v.getUint16(0) !== 0xffd8) return null;
      let o = 2;
      while (o < v.byteLength - 4) { const m = v.getUint16(o), n = v.getUint16(o + 2);
        if (m === 0xffe1 && v.getUint32(o + 4) === 0x45786966) { const t = o + 10, le = v.getUint16(t) === 0x4949;
          const u16 = p => v.getUint16(t + p, le), u32 = p => v.getUint32(t + p, le), ifd = p => { const out = {}, k = u16(p); for (let i = 0; i < k; i++) { const e = p + 2 + i * 12; out[u16(e)] = {n: u32(e + 4), nilai: e + 8}; } return out; };
          const str = e => { const p = e.n > 4 ? u32(e.nilai) : e.nilai; let s = ""; for (let i = 0; i < e.n - 1; i++) s += String.fromCharCode(v.getUint8(t + p + i)); return s; };
          const rat = e => { const p = u32(e.nilai); return [0, 1, 2].map(i => u32(p + i * 8) / (u32(p + i * 8 + 4) || 1)); };
          const ifd0 = ifd(u32(4)), hasil = {};
          if (ifd0[0x8769]) { const ex = ifd(u32(ifd0[0x8769].nilai)), dt = ex[0x9003] && str(ex[0x9003]), off = ex[0x9011] && str(ex[0x9011]), m2 = dt && dt.match(/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/);
            if (m2) { const w = Date.parse(`${m2[1]}-${m2[2]}-${m2[3]}T${m2[4]}:${m2[5]}:${m2[6]}` + (off && /^[+-]\d\d:\d\d$/.test(off) ? off : "")); if (Number.isFinite(w)) hasil.waktu = w; } }
          if (ifd0[0x8825]) { const g = ifd(u32(ifd0[0x8825].nilai));
            if (g[2] && g[4]) { const dms = a => a[0] + a[1] / 60 + a[2] / 3600, la = dms(rat(g[2])), lo = dms(rat(g[4]));
              const sLa = g[1] ? String.fromCharCode(v.getUint8(g[1].nilai + t)) : "N", sLo = g[3] ? String.fromCharCode(v.getUint8(g[3].nilai + t)) : "E";
              if (la || lo) { hasil.lat = sLa === "S" ? -la : la; hasil.lon = sLo === "W" ? -lo : lo; } } }
          return hasil; }
        if (m === 0xffda) break; o += 2 + n; }
    } catch (e) {}
    return null;
  }
  const keBlob = (c, tipe, q) => new Promise((ok, no) => c.toBlob(b => b ? ok(b) : no(new Error("Foto tidak bisa diproses: memori ponsel penuh. Tutup aplikasi lain lalu coba lagi.")), tipe, q));
  function kanvas(src, sisi) { const s = Math.min(1, sisi / Math.max(src.width, src.height)), c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(src.width * s)); c.height = Math.max(1, Math.round(src.height * s)); c.getContext("2d").drawImage(src, 0, 0, c.width, c.height); return c; }
  let tipeKecil = null;   // WebP bila peramban bisa membuatnya (diuji sekali), selain itu JPEG: tidak ada encode yang dibuang
  const tipe = () => tipeKecil ??= (() => { try { const c = document.createElement("canvas"); c.width = c.height = 1; return c.toDataURL("image/webp").startsWith("data:image/webp") ? "image/webp" : "image/jpeg"; } catch (e) { return "image/jpeg"; } })();
  async function siapkanFoto(f, kamera) {
    if (!/^image\//.test(f.type)) throw new Error(`${f.name || "Berkas"} bukan foto.`);
    const exif = /jpe?g$/i.test(f.type) ? bacaExif(await f.slice(0, 256 * 1024).arrayBuffer()) : null;
    if (exif?.waktu && Date.now() - exif.waktu > 48 * 3600e3) throw new Error(`Foto diambil ${Math.round((Date.now() - exif.waktu) / 864e5).toLocaleString("id-ID")} hari lalu; hanya 48 jam terakhir.`);
    let bmp, besar, kecil;
    try { bmp = await createImageBitmap(f); } catch (e) { throw new Error("Foto tidak bisa dibaca peramban ini."); }
    try {
      besar = kanvas(bmp, 1600); bmp.close?.(); bmp = null;   // bitmap penuh dilepas begitu kanvas 1600 jadi
      kecil = kanvas(besar, 640);
      return {media: await keBlob(besar, tipe(), 0.8), thumb: await keBlob(kecil, "image/jpeg", 0.7), exif, kamera};
    } finally { bmp?.close?.(); for (const c of [besar, kecil]) if (c) c.width = c.height = 0; }   // iOS menahan memori kanvas sampai ukurannya dinolkan
  }
  /* GPS: tiga bacaan berjarak 1 detik (server menilai sampelnya untuk lokasi palsu) */
  const posisi = (umur, tunggu) => new Promise((ok, no) => navigator.geolocation.getCurrentPosition(ok, no, {enableHighAccuracy: true, timeout: tunggu, maximumAge: umur}));
  /* titik segar dulu; bila GPS tidak memberi titik baru (ponsel diam: Safari iOS bisa tidak memperbarui sama sekali), pakai titik terakhir <= 60 dtk.
     Bacaan yang sama persis ditandai curiga di server (src/gps.js), tidak ditolak. */
  const bacaGPS = tunggu => posisi(0, tunggu).catch(e => e.code === 3 ? posisi(60000, 5000) : Promise.reject(e)).catch(e => {
    throw new Error(e.code === 1 ? "Izin lokasi ditolak. Izinkan lokasi untuk situs ini di pengaturan peramban, lalu Kirim lagi." : "Lokasi belum terbaca. Pindah ke tempat terbuka, lalu Kirim lagi.");
  });
  async function ambilGPS() {
    if (!navigator.geolocation) throw new Error("Peramban ini tidak bisa membaca lokasi. Pakai Chrome atau Safari terbaru.");
    const s = [];
    for (let i = 0; i < 3; i++) { if (i) await new Promise(r => setTimeout(r, 1000)); const p = await bacaGPS(i ? 3000 : 15000); s.push([p.coords.latitude, p.coords.longitude, p.coords.accuracy, Date.now()]); }
    const [lat, lon, akurasi, w] = s[2];
    if (akurasi > 1000) throw new Error("Sinyal GPS terlalu lemah (lebih dari 1 km). Pindah ke tempat terbuka, lalu Kirim lagi.");
    return {lat, lon, akurasi, waktu_gps: w, sampel: s, zona: Intl.DateTimeFormat().resolvedOptions().timeZone};
  }

  /* ---- tampilan ---- */
  const status = (t, k) => { const s = $("statusLapor"); s.hidden = !t; s.textContent = t || ""; s.className = "lk-status " + (k || ""); };
  const fotoWajib = () => !!L && (L.foto || !!L.kondisi.find(x => x.kode === draf.kondisi)?.foto || (L.langkah === "konfirmasi" && !draf.kondisi));
  const tanyaBekas = () => !!L?.bekas && (L.langkah === "cekulang" || (L.langkah === "konfirmasi" && draf.kondisi === "padam"));
  const tombol = (attr, kode, nama, aktif, kelas) => `<button type="button" class="${kelas}" ${attr}="${esc(kode)}" aria-pressed="${aktif}">${esc(nama)}</button>`;
  const teksRiwayat = r => r.langkah === "cekulang" ? "foto lokasi padam" : NAMA[r.langkah === "konfirmasi" ? (r.hasil === "api_ada" ? r.status_api : r.hasil === "sudah_padam" ? "padam" : r.hasil) : r.status_api] || "";
  function gambar() {
    const k = $("kartuLapor"); k.hidden = !L; if (!L) return;
    $("hLapor").textContent = L.langkah ? JUDUL[L.langkah] : "Lapor dari lokasi";
    $("laporArahan").textContent = L.langkah ? ARAHAN[L.langkah] : L.pesan || "";
    $("laporForm").hidden = !L.langkah;
    $("blokKondisi").hidden = !L.kondisi.length;
    $("pilihKondisi").innerHTML = L.kondisi.map(x => tombol("data-kondisi", x.kode, x.nama, draf.kondisi === x.kode, "lk-kond k-" + esc(x.kode))).join("");
    $("pilihAlasan").innerHTML = L.alasan_bukan_api.map(x => tombol("data-alasan", x.kode, x.nama, draf.alasan === x.kode, "lk-opsi")).join("");
    $("pilihBekas").innerHTML = BEKAS.map(([kd, n]) => tombol("data-bekas", kd, n, draf.bekas === kd, "lk-opsi")).join("");
    $("wadahCatatan").hidden = L.langkah !== "kabar"; if (document.activeElement !== $("catatan") && $("catatan").value !== draf.catatan) $("catatan").value = draf.catatan;   // jangan timpa yang sedang diketik
    $("labelKirim").textContent = `${L.kondisi.length ? "3. " : ""}Kirim`;
    gambarPilihan();
    $("laporSaya").hidden = !L.riwayat.length;
    $("daftarLaporSaya").innerHTML = L.riwayat.map(r => `<li><b>${esc(LANGKAH[r.langkah])}</b>: ${esc(teksRiwayat(r))}, ${r.foto} foto, ${esc(waktu(r.dibuat))}</li>`).join("");
  }
  /* ketukan: hanya aria-pressed, wadah, dan label yang berubah (tanpa innerHTML: fokus dan ketukan berikutnya tidak hilang) */
  function gambarPilihan() {
    for (const [attr, v] of [["kondisi", draf.kondisi], ["alasan", draf.alasan], ["bekas", draf.bekas]]) for (const b of $("kartuLapor").querySelectorAll(`[data-${attr}]`)) b.setAttribute("aria-pressed", String(b.dataset[attr] === v));
    $("wadahAlasan").hidden = draf.kondisi !== "bukan_api"; $("wadahBekas").hidden = !tanyaBekas();
    $("labelFoto").textContent = `${L.kondisi.length ? "2. " : ""}Foto lokasi${fotoWajib() ? ", wajib" : ", boleh dilewati"}`;
    tombolSibuk();
  }
  function tombolSibuk() {
    $("bFotoKamera").disabled = $("bFotoGaleri").disabled = menyiapkan || sibuk || draf.foto.length >= MAKS_FOTO;
    $("bKirimLapor").disabled = menyiapkan || sibuk;
    for (const b of $("daftarFoto").querySelectorAll("[data-hapus]")) b.disabled = menyiapkan || sibuk;
  }
  function gambarFoto() {
    urls.forEach(u => URL.revokeObjectURL(u)); urls = draf.foto.map(f => URL.createObjectURL(f.thumb));
    $("daftarFoto").innerHTML = draf.foto.map((f, i) => `<li><img src="${urls[i]}" alt="Foto ${i + 1}${f.kamera ? ", dari kamera" : ", dari galeri"}"><button type="button" data-hapus="${i}" aria-label="Hapus foto ${i + 1}">Hapus</button></li>`).join("");
    tombolSibuk();
  }
  function gambarAntrean() {
    const w = $("antreanLapor"), tunggu = antrean.filter(x => !x.galat), tua = tunggu.some(x => x.gps && Date.now() - x.gps.waktu_gps > UMUR_PERINGATAN);
    const baris = [tunggu.length ? `<p>${tunggu.length} laporan tersimpan di ponsel, terkirim otomatis saat ada sinyal.${tunggu[0].terakhir ? " " + esc(tunggu[0].terakhir) : ""}</p>` : "",
      tua ? `<p class="galat">Laporan sudah hampir 6 jam di ponsel. Cari sinyal segera: lewat 6 jam lokasinya ditolak server.</p>` : "",
      ...antrean.filter(x => x.galat).map(x => `<p class="galat">${esc(LANGKAH[x.langkah])} ${esc(waktu(x.dibuat))} tidak terkirim: ${esc(x.galat)} <button type="button" class="lk-buang" data-buang="${esc(x.id)}">Buang</button></p>`)].filter(Boolean);
    w.hidden = !baris.length; w.innerHTML = baris.join("");
  }

  /* ---- pilihan dan foto ---- */
  async function tambahFoto(files, kamera) {
    if (menyiapkan) return;
    const daftar = [...files].slice(0, MAKS_FOTO - draf.foto.length);
    if (!daftar.length) return status(`Paling banyak ${MAKS_FOTO} foto per laporan.`, "galat");
    menyiapkan = true; tombolSibuk();   // Kirim, foto, dan Hapus terkunci: foto yang belum jadi tidak bisa tertinggal
    let galat = null;
    try {
      for (const [i, f] of daftar.entries()) {
        status(`Menyiapkan foto ${i + 1} dari ${daftar.length}…`);
        try { const o = await siapkanFoto(f, kamera); draf.foto.push(o); gambarFoto(); } catch (e) { galat = e.message; }
      }
    } finally { menyiapkan = false; status(galat || "", galat ? "galat" : ""); gambarPilihan(); }
    simpanFoto();
  }
  $("fotoKamera").addEventListener("change", e => { tambahFoto(e.target.files, true); e.target.value = ""; });
  $("fotoGaleri").addEventListener("change", e => { tambahFoto(e.target.files, false); e.target.value = ""; });
  let tmCatatan = null;
  $("catatan").addEventListener("input", e => { draf.catatan = e.target.value; clearTimeout(tmCatatan); tmCatatan = setTimeout(simpanPilihan, 600); });
  $("catatan").addEventListener("change", simpanPilihan);
  $("kartuLapor").addEventListener("click", async e => {
    const b = e.target.closest("button"); if (!b || sibuk) return;
    if (b.dataset.kondisi) { draf.kondisi = b.dataset.kondisi; if (draf.kondisi !== "bukan_api") draf.alasan = null; if (!tanyaBekas()) draf.bekas = null; }
    else if (b.dataset.alasan) draf.alasan = b.dataset.alasan;
    else if (b.dataset.bekas) draf.bekas = b.dataset.bekas;
    else if (b.dataset.hapus) { draf.foto.splice(Number(b.dataset.hapus), 1); gambarFoto(); gambarPilihan(); return simpanFoto(); }
    else if (b.id === "bFotoKamera") return $("fotoKamera").click();
    else if (b.id === "bFotoGaleri") return $("fotoGaleri").click();
    else if (b.id === "bKirimLapor") return kirim();
    else if (b.dataset.buang) { const it = antrean.find(x => x.id === b.dataset.buang); if (it) buang(it); return gambarAntrean(); }
    else return;
    status(""); gambarPilihan(); simpanPilihan();
  });

  /* ---- kirim: simpan ke antrean dulu, lalu proses ---- */
  async function kirim() {
    if (sibuk || menyiapkan || !L?.langkah) return;
    draf.catatan = $("catatan").value;
    if (L.kondisi.length && !draf.kondisi) return status("Pilih kondisi di lokasi dulu: ketuk salah satu tombol.", "galat");
    if (draf.kondisi === "bukan_api" && !draf.alasan) return status("Pilih alasan kenapa bukan api.", "galat");
    if (fotoWajib() && !draf.foto.length) return status("Ambil minimal satu foto lokasi.", "galat");
    sibuk = true; tombolSibuk(); status("Menyimpan…");
    try {
      let gps = null;
      if (draf.foto.length) { status("Membaca lokasi, tahan ponsel diam sebentar…"); gps = await ambilGPS(); }
      const it = {id: idAcak(), tk: kunci, klien_id: idAcak(), langkah: L.langkah, kondisi: draf.kondisi, alasan: draf.kondisi === "bukan_api" ? draf.alasan : null, bekas: tanyaBekas() ? draf.bekas : null,
        catatan: L.langkah === "kabar" ? draf.catatan.trim() : "", gps, berkas: draf.foto.map(f => ({media: f.media, thumb: f.thumb, exif: f.exif, kamera: f.kamera})), dibuat: Date.now(), coba: 0, berikut: 0};
      try { await tx("antrean", "readwrite", s => s.put(it)); } catch (x) { it.memori = true; }   // tanpa IndexedDB: tetap dikirim, tidak tahan muat ulang
      antrean.push(it); draf = kosong(); await tx("draf", "readwrite", s => { s.delete(kunci); return s.delete(kunci + ":foto"); }).catch(() => {});
      status("Tersimpan di ponsel, mengirim…"); gambar(); gambarFoto(); gambarAntrean();
    } catch (x) { return status(x.message, "galat"); }
    finally { sibuk = false; tombolSibuk(); }
    proses(true);
  }
  async function kirimApi(jalur, body) {
    const form = body instanceof FormData, henti = new AbortController(), batas = setTimeout(() => henti.abort(), form ? 90e3 : 45e3);   // macet di sinyal lemah = dianggap tanpa sinyal, dicoba lagi
    try { const r = await fetch("/api/lacak/" + jalur, {method: "POST", signal: henti.signal, headers: {"x-lacak": C.token, "x-pb": "1", ...(form ? {} : {"content-type": "application/json"})}, body: form ? body : JSON.stringify(body)});
      return {ok: r.ok, status: r.status, j: await r.json().catch(() => ({}))}; }
    catch (e) { return {ok: false, status: 0, j: {}}; }
    finally { clearTimeout(batas); }
  }
  const nilai = r => r.status === 410 ? {mati: r.j} : r.status === 0 || r.status === 429 || r.status >= 500 ? {tunda: r.status ? r.j.galat || "server sibuk" : "tidak ada sinyal"}
    : {tolak: r.status === 409 && "langkah" in r.j ? "keadaan tugas sudah berubah (mungkin sudah dilaporkan orang lain). Buang, lalu kirim laporan baru." : r.j.galat || "laporan ditolak."};
  async function kirimItem(it) {
    for (const [i, b] of it.berkas.entries()) {
      if (b.mediaId) continue;
      status(`Mengunggah foto ${i + 1} dari ${it.berkas.length}…`);
      const fd = new FormData(); fd.append("media", b.media, "foto"); fd.append("thumb", b.thumb, "thumb");
      for (const k of ["lat", "lon", "akurasi", "waktu_gps", "zona"]) fd.append(k, it.gps[k]); fd.append("sampel", JSON.stringify(it.gps.sampel));
      if (b.exif?.waktu) fd.append("exif_waktu", b.exif.waktu); if (b.exif?.lat != null) { fd.append("exif_lat", b.exif.lat); fd.append("exif_lon", b.exif.lon); }
      if (b.kamera) fd.append("kamera", "1");
      const r = await kirimApi("media", fd); if (!r.ok) return nilai(r);
      b.mediaId = r.j.id; b.media = b.thumb = null; await simpan(it);   // berkas terunggah tidak perlu disimpan lagi
    }
    status("Mengirim laporan…");
    const r = await kirimApi("lapor", {klien_id: it.klien_id, langkah: it.langkah, kondisi: it.kondisi ?? undefined, alasan_bukan_api: it.alasan ?? undefined, bekas_terbakar_baru: it.bekas ?? undefined,
      catatan: it.catatan || undefined, media: it.berkas.map(b => b.mediaId)});
    return r.ok ? {ok: r.j} : nilai(r);
  }
  async function proses(paksa = false) {
    if (memproses) { lagi = true; return; }
    if (!C || !antrean.length) return; memproses = true; lagi = false;
    let berubah = false;
    try {
      for (const it of [...antrean].sort((a, b) => a.dibuat - b.dibuat)) {
        if (it.galat) continue;
        if (!paksa && it.berikut > Date.now()) break;
        const h = await kirimItem(it);
        if (h.ok) { await buang(it); status(`Laporan terkirim ${waktu(Date.now())}. Terima kasih.`, "ok"); const l = await C.segarkan(); if (l !== undefined) { L = l; berubah = true; } continue; }
        if (h.mati) {   // tautan mati: antrean tidak bisa dikirim lagi, katakan terus terang berapa yang hilang
          const n = antrean.filter(x => !x.galat).length; for (const x of [...antrean]) await buang(x);
          return C.mati({...h.mati, galat: `${h.mati.galat || "Tautan ini tidak bisa dipakai lagi"}. ${n} laporan di ponsel ini belum terkirim dan tidak bisa dikirim lagi: sampaikan isinya ke yang menugaskanmu.`}); }
        if (h.tolak) { it.galat = h.tolak; status(""); await simpan(it); continue; }
        it.coba++; it.berikut = Date.now() + Math.min(JEDA_MAKS, JEDA0 * 2 ** (it.coba - 1)); it.terakhir = `Percobaan terakhir ${waktu(Date.now())}: ${h.tunda}.`; status(""); await simpan(it); break;
      }
    } finally { memproses = false; if (berubah) gambar(); gambarAntrean(); if (!antrean.some(x => !x.galat)) C?.antreanKosong?.(); if (lagi) proses(true); }
  }
  addEventListener("online", () => proses(true));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") proses(); });
  setInterval(() => { if (navigator.onLine !== false) proses(); }, 60e3);

  /* dipanggil lacak.js sesudah info termuat: o = {token, lapor, segarkan: () => lapor baru atau undefined, mati: fungsi tautan mati} */
  window.LacakLapor = {
    async mulai(o) {
      C = o; L = o.lapor || null;
      try { kunci = await sha(o.token); } catch (e) { kunci = "t" + o.token.slice(0, 8); }
      try { const [d, f] = await Promise.all([tx("draf", "readonly", s => s.get(kunci)), tx("draf", "readonly", s => s.get(kunci + ":foto"))]);
        draf = {...kosong(), kondisi: d?.kondisi ?? null, alasan: d?.alasan ?? null, bekas: d?.bekas ?? null, catatan: d?.catatan ?? "", foto: Array.isArray(f?.foto) ? f.foto : []}; } catch (e) {}
      try { antrean = (await tx("antrean", "readonly", s => s.getAll())).filter(x => x.tk === kunci); } catch (e) {}
      gambar(); gambarFoto(); gambarAntrean(); proses(true);
    },
    perbarui(l) { if (l !== undefined) { L = l || null; gambar(); } },
    menunggu: () => antrean.filter(x => !x.galat).length + (sibuk || menyiapkan ? 1 : 0) + (draf.foto.length ? 1 : 0),   // foto yang belum dikirim ikut dihitung; Hapus foto melepaskannya
    /* tautan mati (410 saat muat atau kirim) atau Selesai: draf, foto, dan antrean tautan ini dihapus dari ponsel */
    async bersihkan(token) {
      if (!token) return;
      let k; try { k = await sha(token); } catch (e) { k = "t" + token.slice(0, 8); }
      antrean = antrean.filter(x => x.tk !== k); if (k === kunci) draf = kosong();
      await tx("draf", "readwrite", s => { s.delete(k); return s.delete(k + ":foto"); }).catch(() => {});
      await tx("antrean", "readwrite", s => { const r = s.openCursor(); r.onsuccess = () => { const c = r.result; if (!c) return; if (c.value.tk === k) c.delete(); c.continue(); }; return r; }).catch(() => {});
    },
  };
})();
