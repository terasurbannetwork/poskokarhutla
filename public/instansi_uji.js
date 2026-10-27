/* Medan uji lapangan di form Ruang Instansi (/instansi): tutupan, metode luas, arah jalar, tinggi nyala, angin, dugaan penyebab, bekas terbakar baru, jalur GPS ringkas.
   Dipakai public/instansi.js lewat window.UjiLapangan (dimuat sebelum instansi.js). Semua medan opsional kecuali tutupan + metode luas BILA luas diisi.
   Hasilnya objek `uji` di badan kiriman; ikut antrean luring instansi.js apa adanya. Daftar kode = src/uji_lapangan.js (dijaga tests/warga/uji_lapangan.test.mjs).
   CSP: tanpa skrip/gaya inline; teks lewat esc(). */
(() => {
  "use strict";
  const TUTUPAN = {gambut: "Gambut", semak_belukar: "Semak/belukar", kebun_sawit: "Kebun sawit", hti_akasia: "HTI/akasia", hutan: "Hutan", pertanian: "Pertanian", lain: "Lain"};
  const METODE_LUAS = {keliling_gps: "Keliling GPS (jalan di tepi area sambil merekam)", jalan_keliling: "Jalan keliling (diukur dengan langkah atau odometer)", taksiran: "Taksiran mata (tidak dihitung dalam uji)", drone: "Drone"};
  const YA_TIDAK = {ya: "Ya", tidak: "Tidak"};
  const TINGGI_NYALA = {lt05: "Di bawah 0,5 m", "05_15": "0,5 sampai 1,5 m", gt15: "Di atas 1,5 m"};
  const ANGIN_LOKAL = {tenang: "Tenang (asap naik lurus)", lemah: "Lemah (daun bergerak)", sedang: "Sedang (ranting kecil bergoyang, debu naik)", kencang: "Kencang (sulit berjalan melawan angin)"};
  const PENYEBAB = {pembukaan_lahan: "Pembukaan lahan", tak_sengaja: "Tidak sengaja", tak_tahu: "Tidak tahu", lain: "Lain"};
  const BEKAS_BARU = {ya: "Ya, ada bekas terbakar baru", tidak: "Tidak ada", tak_tahu: "Tidak tahu"};
  const ARAH = [["Utara", 0], ["Timur laut", 45], ["Timur", 90], ["Tenggara", 135], ["Selatan", 180], ["Barat daya", 225], ["Barat", 270], ["Barat laut", 315]];
  const MAKS_TITIK = 150;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const pilihan = (id, label, daftar, catatan = "") => `<label>${esc(label)}<select id="${id}"><option value="">Tidak diisi</option>${Object.entries(daftar).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join("")}</select>${catatan ? `<small class="lp-kecil">${esc(catatan)}</small>` : ""}</label>`;
  let jalur = {tugas: null, titik: []};   // jalur sementara untuk SATU tugas; berganti tugas = mulai baru

  function bidang(tugasId, konf) {
    if (jalur.tugas !== tugasId) jalur = {tugas: tugasId, titik: []};
    return `<details class="in-rinci in-uji" id="ujiRinci"><summary>Data uji lapangan, bantu menguji satelit (boleh dilewati)</summary>
      <p class="lp-kecil">Catatan ini dipakai menguji ketepatan deteksi dan perkiraan luas satelit, tanpa nama dan lokasi pribadi. Tutupan lahan dan metode luas wajib bila luas terbakar diisi.</p>
      ${pilihan("ujiTutupan", "Tutupan lahan", TUTUPAN)}${pilihan("ujiMetode", "Cara mengukur luas", METODE_LUAS, "Wajib bila luas diisi. Taksiran mata disimpan tetapi tidak dihitung dalam uji.")}
      <div class="in-uji-jalur"><b>Jalur keliling (opsional)</b><p class="lp-kecil">Berdiri di tiap sudut tepi area, ketuk Tandai titik (minimal 3). Luas dihitung di ponsel dan menggantikan isian luas; jalurnya tidak dikirim atau disimpan, hanya luas dan jumlah titik. Maksimal ${MAKS_TITIK} titik.</p>
        <div class="in-uji-aksi"><button type="button" class="lp-tombol" data-uji-aksi="titik">Tandai titik di sini</button><button type="button" class="lp-tombol" data-uji-aksi="hapus">Ulangi jalur</button></div>
        <p id="ujiJalurInfo" class="lp-kecil" role="status" aria-live="polite">${jalur.titik.length ? `${jalur.titik.length} titik tercatat${luasHa(jalur.titik) != null ? `, luas sekitar ${luasHa(jalur.titik)} ha` : ""}.` : "Belum ada titik."}</p></div>
      ${pilihan("ujiTepi", "Tepi api masih aktif?", YA_TIDAK)}
      <label>Arah api menjalar<select id="ujiArah"><option value="">Tidak diisi</option>${ARAH.map(([n, d]) => `<option value="${d}">${n}</option>`).join("")}</select></label>
      ${pilihan("ujiNyala", "Tinggi nyala", TINGGI_NYALA)}${pilihan("ujiAngin", "Angin di lokasi", ANGIN_LOKAL)}${pilihan("ujiSebab", "Dugaan penyebab", PENYEBAB)}
      ${pilihan("ujiBekas", konf ? "Bekas terbakar baru (untuk hasil sudah padam)" : "Bekas terbakar baru", BEKAS_BARU)}</details>`;
  }
  const bidangCek = () => `<details class="in-rinci in-uji" id="ujiRinci"><summary>Data uji lapangan (boleh dilewati)</summary>${pilihan("ujiBekas", "Bekas terbakar baru", BEKAS_BARU)}${pilihan("ujiNyala", "Masih ada nyala atau bara?", {lt05: "Ada bara kecil (di bawah 0,5 m)", "05_15": "Ada nyala 0,5 sampai 1,5 m", gt15: "Nyala di atas 1,5 m"})}</details>`;

  function titikSekarang(tombol) {
    if (!navigator.geolocation) return Promise.reject(new Error("Peramban ini tidak punya GPS."));
    return new Promise((ok, tidak) => navigator.geolocation.getCurrentPosition(p => ok([p.coords.latitude, p.coords.longitude, p.coords.accuracy]), () => tidak(new Error("Lokasi belum terbaca. Beri izin lokasi dan coba lagi.")), {enableHighAccuracy: true, timeout: 20000, maximumAge: 5000}));
  }
  document.addEventListener("click", async e => {
    const b = e.target.closest?.("[data-uji-aksi]"); if (!b) return;
    const info = $("ujiJalurInfo"); if (!info) return;
    if (b.dataset.ujiAksi === "hapus") { jalur.titik = []; info.textContent = "Belum ada titik."; return; }
    if (jalur.titik.length >= MAKS_TITIK) { info.textContent = `Maksimal ${MAKS_TITIK} titik.`; return; }
    b.disabled = true; info.textContent = "Membaca lokasi…";
    try { const [la, lo, ak] = await titikSekarang(); jalur.titik.push([Math.round(la * 1e5) / 1e5, Math.round(lo * 1e5) / 1e5]); const l = luasHa(jalur.titik); info.textContent = `${jalur.titik.length} titik tercatat${l != null ? `, luas sekitar ${l} ha` : ""}${ak > 50 ? " (akurasi rendah, tunggu GPS stabil)" : ""}.`; }
    catch (x) { info.textContent = x.message; }
    b.disabled = false;
  });
  /* luas poligon (hektare) dari titik [lat, lon]: proyeksi datar lokal (meter per derajat di lintang tengah) + rumus shoelace. Jalur sendiri TIDAK dikirim atau disimpan. */
  function luasHa(t) {
    if (t.length < 3) return null;
    const la0 = t.reduce((a, p) => a + p[0], 0) / t.length, my = 111320, mx = 111320 * Math.cos(la0 * Math.PI / 180);
    const xy = t.map(p => [(p[1] - t[0][1]) * mx, (p[0] - t[0][0]) * my]);
    let a = 0; for (let i = 0; i < xy.length; i++) { const [x1, y1] = xy[i], [x2, y2] = xy[(i + 1) % xy.length]; a += x1 * y2 - x2 * y1; }
    return Math.round(Math.abs(a) / 2 / 100) / 100;
  }
  const nilai = id => { const e = $(id); return e && e.value ? e.value : null; };
  /* mengisi body.uji; luasIsi: apakah isian membawa luas. Melempar Error berpesan manusiawi bila luas diisi tanpa tutupan + metode. */
  function baca(body, luasIsi) {
    if (!$("ujiRinci")) return;
    const u = {tutupan: nilai("ujiTutupan"), metode_luas: nilai("ujiMetode"), tepi_aktif: nilai("ujiTepi"), tinggi_nyala: nilai("ujiNyala"), angin_lokal: nilai("ujiAngin"), dugaan_penyebab: nilai("ujiSebab"), bekas_terbakar_baru: nilai("ujiBekas")};
    if (nilai("ujiArah") != null) u.arah_jalar_deg = Number(nilai("ujiArah"));
    const ha = luasHa(jalur.titik);
    if (ha != null) {   // jalur >= 3 titik: luas dari jalur menggantikan isian luas; metode dipaksa keliling_gps; hanya jumlah titik dikirim
      if (ha <= 0) { $("ujiRinci").open = true; throw new Error("Titik jalur segaris atau sama: luas nol. Tandai ulang sudut area."); }
      body.luas_ha = ha; u.metode_luas = "keliling_gps"; u.n_titik_jalur = jalur.titik.length;
      if (body.padam_ha != null && body.padam_ha > ha) throw new Error("Luas padam tidak boleh melebihi luas dari jalur keliling.");
    } else if (jalur.titik.length) { $("ujiRinci").open = true; throw new Error("Jalur keliling butuh minimal 3 titik (atau ketuk Ulangi jalur)."); }
    if ((luasIsi || ha != null) && (!u.tutupan || !u.metode_luas)) { $("ujiRinci").open = true; throw new Error("Luas diisi: pilih juga tutupan lahan dan cara mengukur luas (di bagian Data uji lapangan)."); }
    for (const k of Object.keys(u)) if (u[k] == null) delete u[k];
    if (Object.keys(u).length) body.uji = u;
  }
  function bacaCek(body) {
    if (!$("ujiRinci")) return;
    const u = {bekas_terbakar_baru: nilai("ujiBekas"), tinggi_nyala: nilai("ujiNyala")};
    for (const k of Object.keys(u)) if (u[k] == null) delete u[k];
    if (Object.keys(u).length) body.uji = u;
  }
  const lepas = () => { jalur = {tugas: null, titik: []}; };
  window.UjiLapangan = {bidang, bidangCek, baca, bacaCek, lepas, luasHa, DAFTAR: {TUTUPAN, METODE_LUAS, YA_TIDAK, TINGGI_NYALA, ANGIN_LOKAL, PENYEBAB, BEKAS_BARU}};

  /* ================================================================ uji lapangan banjir (formulir di /uji-lapangan, bagian D)
     Memanggil GET /api/instansi/uji-banjir/kec, POST /api/instansi/uji-banjir, dan (foto opsional) POST /api/foto. Status peta dihitung server, bukan dikirim. Sampel kontrol tanpa medan genangan. */
  const UB = {
    badan(n) {
      if (n.sampel !== "genangan" && n.sampel !== "kontrol") throw new Error("Pilih sampel.");
      if (!n.kec) throw new Error("Pilih kecamatan.");
      if (!Number.isFinite(n.lat) || !Number.isFinite(n.lon)) throw new Error("Ambil lokasi dulu.");
      const b = {sampel: n.sampel, kec: n.kec, lat: n.lat, lon: n.lon};
      if (n.sampel === "kontrol") return b;
      const t = Number(n.tinggi), l = Number(n.lama), h = n.luas === "" || n.luas == null ? null : Number(n.luas);
      if (!Number.isInteger(t) || t < 1 || t > 1000) throw new Error("Tinggi genangan 1 sampai 1000 cm.");
      if (!Number.isInteger(l) || l < 0 || l > 720) throw new Error("Lama genang 0 sampai 720 jam.");
      if (h != null && !(h > 0 && h <= 100000)) throw new Error("Luas lebih dari 0 dan paling banyak 100000 ha.");
      b.tinggi_cm = t; b.lama_jam = l; if (h != null) b.luas_ha = h; if (n.fotoId) b.foto_id = n.fotoId;
      return b;
    },
    async kirim(n, ambil = (...a) => fetch(...a)) {
      const r = await ambil("/api/instansi/uji-banjir", {method: "POST", credentials: "same-origin", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify(UB.badan(n))});
      return {s: r.status, j: await r.json().catch(() => ({}))};
    },
    async kecamatan(ambil = (...a) => fetch(...a)) {
      const r = await ambil("/api/instansi/uji-banjir/kec", {credentials: "same-origin", headers: {accept: "application/json"}});
      return {s: r.status, j: await r.json().catch(() => ({}))};
    },
    /* foto lewat unggah foto yang ada (POST /api/foto, kategori genangan); kompres = (berkas, sisi) => Blob, bawaan memakai canvas */
    async foto(berkas, lok, setuju, {ambil = (...a) => fetch(...a), kompres = UB.kompres} = {}) {
      if (setuju !== true) throw new Error("Centang persetujuan tayang publik untuk mengunggah foto.");
      const f = new FormData(), r4 = x => Math.round(x * 1e4) / 1e4;
      f.append("bencana", "banjir"); f.append("kategori", "genangan"); f.append("setuju", "1");
      f.append("lat", r4(lok.lat)); f.append("lon", r4(lok.lon)); f.append("akurasi", lok.akurasi); f.append("waktu_gps", lok.waktu);
      f.append("media", await kompres(berkas, 1600), "foto"); f.append("thumb", await kompres(berkas, 480), "thumb");
      const r = await ambil("/api/foto", {method: "POST", credentials: "same-origin", body: f});
      return {s: r.status, j: await r.json().catch(() => ({}))};
    },
    async kompres(berkas, sisi) {
      const bmp = await createImageBitmap(berkas), s = Math.min(1, sisi / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
      c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(ok => c.toBlob(w => w?.type === "image/webp" ? ok(w) : c.toBlob(ok, "image/jpeg", .8), "image/webp", .75));
    },
  };
  window.UjiBanjir = UB;
  function pasangBanjir() {
    const f = $("ujbForm"); if (!f) return;
    const st = $("ujbStatus"), lapor = (t, galat) => { st.textContent = t; st.className = galat ? "uj-galat" : "uj-redup"; };
    let lok = null, fotoId = null;
    const tampil = () => { for (const e of f.querySelectorAll("[data-ujb-genangan]")) e.hidden = f.sampel.value !== "genangan"; };
    f.sampel.addEventListener("change", tampil); tampil();
    UB.kecamatan().then(({s, j}) => {
      if (s !== 200) return lapor(s === 401 ? "Masuk dulu di Ruang Instansi (/instansi) di peramban ini." : (j.galat || `Daftar kecamatan belum bisa dimuat (${s}).`), true);
      for (const k of j.kecamatan) { const o = document.createElement("option"); o.value = k.kec; o.textContent = `${k.nama}, ${k.kab} (${k.status})`; f.kec.append(o); }
    }).catch(() => lapor("Tidak ada sambungan.", true));
    $("ujbLokasi").addEventListener("click", () => {
      if (!navigator.geolocation) return lapor("Peramban ini tidak punya GPS.", true);
      navigator.geolocation.getCurrentPosition(p => { lok = {lat: Math.round(p.coords.latitude * 1e5) / 1e5, lon: Math.round(p.coords.longitude * 1e5) / 1e5, akurasi: Math.round(p.coords.accuracy), waktu: Date.now()}; $("ujbLokasiInfo").textContent = `${lok.lat}, ${lok.lon} (akurasi ${lok.akurasi} m)`; },
        () => lapor("Lokasi belum terbaca. Beri izin lokasi dan coba lagi.", true), {enableHighAccuracy: true, timeout: 20000});
    });
    f.addEventListener("submit", async e => {
      e.preventDefault(); const tombol = $("ujbKirim"); tombol.disabled = true; lapor("Mengirim");
      try {
        if (f.foto.files[0] && f.sampel.value === "genangan" && f.setuju.checked) {
          if (!lok) throw new Error("Ambil lokasi dulu.");
          const r = await UB.foto(f.foto.files[0], lok, f.setuju.checked); if (r.s !== 201) throw new Error(r.j.galat || `Foto gagal diunggah (${r.s}). Kosongkan foto atau unggah di /foto.`);
          fotoId = r.j.id;
        }
        const r = await UB.kirim({sampel: f.sampel.value, kec: f.kec.value, lat: lok?.lat, lon: lok?.lon, tinggi: f.tinggi.value, lama: f.lama.value, luas: f.luas.value, fotoId});
        if (r.s !== 201) throw new Error(r.j.galat || `Gagal (${r.s}).`);
        lapor(`Tersimpan. Status peta saat ini ${r.j.status_peta}.`); f.reset(); tampil(); fotoId = null;
      } catch (x) { lapor(x.message, true); }
      tombol.disabled = false;
    });
  }
  if (typeof document.readyState === "string" && document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasangBanjir); else pasangBanjir();
})();
