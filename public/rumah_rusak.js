/* Lapor Rumah Rusak (RB/RS/RR per rumah). Akses: sesi akun (cookie /admin/masuk) ATAU kode regu (localStorage pb_kode_regu, header x-kode-regu);
   server memeriksa keduanya di TIAP panggilan. Dipasang ke wadah mana pun: window.RumahRusak.pasang(wadah, {kode}); dipakai /rumah-rusak (otomatis,
   <main id="rrWadah" data-otomatis>) dan /lapangan (dimuat saat tombolnya diketuk). Semua teks dari server lewat textContent; innerHTML hanya untuk kerangka
   statis di bawah. CSP: tanpa skrip/gaya inline. Elemen dicari lewat data-r di dalam wadah (tanpa id ganda di halaman lapangan).
   ponytail: tanpa draf offline (lapangan.js punya); kirim gagal = ketuk kirim lagi. Koreksi admin hanya lewat API (POST /api/rumah-rusak/:id). */
(() => {
  "use strict";
  const KERANGKA = `
  <p class="rr-siapa" data-r="siapa">Memeriksa akses…</p>
  <p class="rr-banner" data-r="tanpaAkses" hidden>Halaman ini hanya untuk akun yang sudah masuk atau regu lapangan yang punya tautan dari posko. Masuk lewat <a href="/admin/masuk?ke=/rumah-rusak">halaman masuk</a>, atau buka lagi tautan regu Anda di <a href="/lapangan">Lapor Lapangan</a>.</p>
  <p class="rr-pesan" data-r="pesan" role="status" aria-live="polite"></p>
  <form data-r="f" autocomplete="off" novalidate>
    <section class="rr-blok">
      <h2>1. Lokasi rumah</h2>
      <div data-r="peta" class="rr-peta" role="application" aria-label="Peta: ketuk untuk menandai rumah"></div>
      <button type="button" data-r="gps" class="rr-tombol">📍 Pakai lokasi saya</button>
      <p data-r="lokasi" class="rr-kecil">Ketuk peta tepat di rumah yang rusak, atau tekan tombol di atas.</p>
    </section>
    <section class="rr-blok">
      <h2>2. Tingkat kerusakan</h2>
      <div data-r="tingkat" class="rr-tingkat" role="radiogroup" aria-label="Tingkat kerusakan"></div>
    </section>
    <section class="rr-blok">
      <h2>3. Kejadian</h2>
      <label>Bencana<select data-r="bencana"></select></label>
      <label>Tanggal kejadian<input data-r="tanggal" type="date"></label>
    </section>
    <section class="rr-blok">
      <h2>4. Catatan dan foto</h2>
      <label>Catatan (maksimal 300 huruf, boleh kosong)<textarea data-r="catatan" rows="2" maxlength="300"></textarea></label>
      <p class="rr-kecil">Jangan menulis identitas (nama lengkap, NIK, nomor HP) di catatan; tautan dan nomor telepon dihapus otomatis.</p>
      <label>Foto rumah (boleh kosong)<input data-r="foto" type="file" accept="image/*" capture="environment"></label>
    </section>
    <button type="submit" data-r="kirim" class="rr-tombol utama besar">Kirim laporan</button>
  </form>
  <section class="rr-blok">
    <h2>Laporan saya</h2>
    <ul data-r="saya" class="rr-daftar"></ul>
  </section>
  <section class="rr-blok">
    <h2>Rekap per kecamatan</h2>
    <div class="rr-baris">
      <label>Dari<input data-r="rDari" type="date"></label>
      <label>Sampai<input data-r="rSampai" type="date"></label>
      <label>Bencana<select data-r="rBencana"></select></label>
    </div>
    <button type="button" data-r="rMuat" class="rr-tombol">Muat rekap</button>
    <div class="rr-gulir"><table data-r="rekap" class="rr-tabel"><caption class="rr-kecil">Hanya laporan berstatus sah. RB = rusak berat, RS = rusak sedang, RR = rusak ringan.</caption>
      <thead><tr><th scope="col">Wilayah</th><th scope="col">RB</th><th scope="col">RS</th><th scope="col">RR</th><th scope="col">Jumlah</th></tr></thead><tbody></tbody></table></div>
  </section>`;
  function pasang(wadah, opsi = {}) {
    if (wadah.dataset.terpasang) return; wadah.dataset.terpasang = "1";
    wadah.innerHTML = KERANGKA;
    const TINGKAT = {
      berat: {kode: "RB", nama: "Rusak berat", tips: "Struktur utama roboh atau rusak lebih dari 50%.", warna: "#b3261e"},
      sedang: {kode: "RS", nama: "Rusak sedang", tips: "Rusak sebagian struktur, sekitar 30–50%.", warna: "#e08a1e"},
      ringan: {kode: "RR", nama: "Rusak ringan", tips: "Kerusakan non-struktural, kurang dari 30%.", warna: "#e5c100"},
    };
    const K_KODE = "pb_kode_regu", MAKS_FOTO = 1.4 * 1048576;
    const $ = id => wadah.querySelector(`[data-r="${id}"]`);
    const baca = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const buat = (tag, teks, kelas) => { const e = document.createElement(tag); if (teks != null) e.textContent = teks; if (kelas) e.className = kelas; return e; };
    const pesan = (t, k) => { $("pesan").textContent = t || ""; $("pesan").className = "rr-pesan " + (k || ""); };
    const hariIni = () => { const d = new Date(Date.now() + 7 * 36e5); return d.toISOString().slice(0, 10); };   // hari WIB, sama dengan server

    const dariHash = opsi.hash ? (location.hash.match(/^#k=([0-9a-fA-F]{26})$/) || [])[1] : null;
    let kode = dariHash ? dariHash.toLowerCase() : (opsi.kode || baca(K_KODE));
    if (dariHash) { try { localStorage.setItem(K_KODE, kode); history.replaceState(null, "", location.pathname); } catch (e) {} }
    if (kode && !/^[0-9a-f]{26}$/.test(kode)) kode = null;
    const hdr = (x = {}) => kode ? {...x, "x-kode-regu": kode} : x;
    const api = async (jalur, opsi = {}) => {
      const r = await fetch(jalur, {...opsi, headers: hdr(opsi.headers), credentials: "same-origin"});
      return {s: r.status, j: await r.json().catch(() => ({}))};
    };

    let titik = null, peta = null, penanda = null, siap = false;

    /* ---- form dari daftar tetap ---- */
    for (const [k, v] of Object.entries(TINGKAT)) {
      const l = buat("label", null, "rr-pil " + k), i = document.createElement("input"), s = buat("span"), b = buat("b", `${v.kode} · ${v.nama}`);
      i.type = "radio"; i.name = "tingkat"; i.value = k; s.append(b, buat("small", v.tips)); l.append(i, s); $("tingkat").append(l);
    }
    $("tanggal").value = $("rSampai").value = $("rDari").value = hariIni(); $("tanggal").max = hariIni();
    const isiBencana = daftar => {
      for (const id of ["bencana", "rBencana"]) {
        const s = $(id); s.replaceChildren(); if (id === "rBencana") { const o = buat("option", "Semua bencana"); o.value = ""; s.append(o); }
        for (const b of daftar) { const o = buat("option", b.nama); o.value = b.id; s.append(o); }
      }
    };
    isiBencana([]);
    fetch("/bencana.json").then(r => r.json()).then(j => isiBencana(j.bencana.filter(b => b.status !== "mati").map(b => ({id: b.id, nama: b.nama})))).catch(() => pesan("Daftar bencana tidak terbaca; muat ulang halaman.", "galat"));

    /* ---- peta ---- */
    function taruh(lat, lon, terbang) {
      titik = {lat, lon};
      if (peta) {
        if (!penanda) penanda = new maplibregl.Marker({color: "#0b2545"});
        penanda.setLngLat([lon, lat]).addTo(peta); if (terbang) peta.easeTo({center: [lon, lat], zoom: Math.max(peta.getZoom(), 16)});
      }
      $("lokasi").textContent = `Titik: ${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    }
    function mulaiPeta() {
      if (!window.maplibregl) { $("lokasi").textContent = "Peta tidak termuat. Pakai tombol lokasi saya."; return; }
      peta = new maplibregl.Map({container: $("peta"), style: "https://tiles.openfreemap.org/styles/positron", bounds: [[94.5, -11.5], [141.5, 6.3]], minZoom: 3, maxZoom: 19, dragRotate: false, attributionControl: {compact: true}});
      peta.addControl(new maplibregl.NavigationControl({showCompass: false}));
      peta.on("click", e => taruh(e.lngLat.lat, e.lngLat.lng, false));
      peta.on("load", () => {
        peta.addSource("saya", {type: "geojson", data: {type: "FeatureCollection", features: []}});
        peta.addLayer({id: "saya", type: "circle", source: "saya", paint: {"circle-radius": 6, "circle-stroke-width": 2, "circle-stroke-color": "#fff",
          "circle-color": ["match", ["get", "tingkat"], "berat", TINGKAT.berat.warna, "sedang", TINGKAT.sedang.warna, TINGKAT.ringan.warna]}});
        siap = true; if (pending) { gambarSaya(pending); pending = null; }
      });
    }
    let pending = null;
    const gambarSaya = baris => {
      if (!siap) { pending = baris; return; }
      peta.getSource("saya").setData({type: "FeatureCollection", features: baris.filter(r => r.status === "sah").map(r => ({type: "Feature", geometry: {type: "Point", coordinates: [r.lon, r.lat]}, properties: {tingkat: r.tingkat}}))});
    };
    $("gps").addEventListener("click", () => {
      if (!navigator.geolocation) return pesan("Peramban ini tidak bisa membaca lokasi.", "galat");
      pesan("Membaca lokasi…");
      navigator.geolocation.getCurrentPosition(p => { taruh(p.coords.latitude, p.coords.longitude, true); pesan(`Lokasi terbaca, akurasi ±${Math.round(p.coords.accuracy)} m. Geser penanda dengan mengetuk rumahnya di peta bila perlu.`); },
        e => pesan(e.code === 1 ? "Izin lokasi ditolak. Izinkan di pengaturan peramban, atau ketuk peta." : "Lokasi belum terbaca. Coba di tempat terbuka atau ketuk peta.", "galat"),
        {enableHighAccuracy: true, timeout: 20000, maximumAge: 0});
    });

    /* ---- foto: JPEG <= 1,4 MB, sisi terpanjang 1280 px (canvas membuang EXIF) ---- */
    async function kecilkan(file) {
      if (!file) return null;
      try {
        const bmp = await createImageBitmap(file), skala = Math.min(1, 1280 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
        c.width = Math.round(bmp.width * skala); c.height = Math.round(bmp.height * skala); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
        for (const q of [0.72, 0.55, 0.4]) { const b = await new Promise(r => c.toBlob(r, "image/jpeg", q)); if (b && b.size <= MAKS_FOTO) return b; }
      } catch (e) {}
      return null;   // canvas gagal: JANGAN kirim berkas asli (EXIF/GPS); pemanggil menampilkan galat
    }

    /* ---- kirim ---- */
    $("f").addEventListener("submit", async e => {
      e.preventDefault();
      const tingkat = (wadah.querySelector('input[name="tingkat"]:checked') || {}).value;
      if (!titik) return pesan("Tandai lokasi rumah dulu (bagian 1).", "galat");
      if (!tingkat) return pesan("Pilih tingkat kerusakan (bagian 2).", "galat");
      if (!$("bencana").value) return pesan("Pilih bencana (bagian 3).", "galat");
      const t = $("kirim"); t.disabled = true; pesan("Mengirim…");
      try {
        const body = {bencana: $("bencana").value, tanggal: $("tanggal").value || hariIni(), lat: titik.lat, lon: titik.lon, tingkat};
        if ($("catatan").value.trim()) body.catatan = $("catatan").value.trim();
        const r = await api("/api/rumah-rusak", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)});
        if (r.s !== 201) { if (r.s === 403) tanpaAkses(); return pesan(r.j.galat || `Ditolak (${r.s})`, "galat"); }
        let catat = "";
        const foto = await kecilkan($("foto").files[0]);
        if (foto) {
          const f = await api(`/api/rumah-rusak/foto/${r.j.id}`, {method: "POST", body: foto}).catch(() => ({s: 0}));
          if (f.s !== 200) catat = " Foto belum terkirim" + (f.s === 503 ? " (penyimpanan foto belum aktif)." : ".");
        } else if ($("foto").files[0]) catat = " Foto tidak bisa dikecilkan di ponsel ini atau terlalu besar; foto tidak dikirim.";
        pesan(`✅ Tersimpan di ${r.j.kec}, ${r.j.kab}.${catat}`, catat ? "galat" : "ok");
        $("f").reset(); $("tanggal").value = body.tanggal; $("bencana").value = body.bencana;
        if (penanda) penanda.remove(); penanda = null; titik = null; $("lokasi").textContent = "Ketuk peta untuk rumah berikutnya.";
        muatSaya();
      } catch (x) { pesan("Tidak ada sinyal. Coba kirim lagi.", "galat"); }
      finally { t.disabled = false; }
    });

    /* ---- laporan saya ---- */
    async function muatSaya() {
      const r = await api("/api/rumah-rusak?saya=1"); if (r.s !== 200) return;
      const ul = $("saya"); ul.replaceChildren();
      if (!r.j.laporan.length) ul.append(buat("li", "Belum ada laporan."));
      for (const x of r.j.laporan.slice(0, 50)) {
        const li = buat("li"), tg = TINGKAT[x.tingkat];
        li.append(buat("span", tg.kode, "rr-lencana " + x.tingkat), buat("span", `${x.kec}, ${x.kab}`), buat("span", `${x.bencana} · ${x.tanggal}${x.foto ? " · foto" : ""}`, "rr-kecil"));
        if (x.status !== "sah") li.append(buat("span", "ditolak admin", "rr-lencana ditolak"));
        ul.append(li);
      }
      gambarSaya(r.j.laporan);
    }

    /* ---- rekap ---- */
    const sel = (teks, kelas, ...angka) => { const tr = buat("tr", null, kelas); tr.append(buat("td", teks)); for (const a of angka) tr.append(buat("td", String(a))); return tr; };
    $("rMuat").addEventListener("click", async () => {
      const q = new URLSearchParams({dari: $("rDari").value, sampai: $("rSampai").value}); if ($("rBencana").value) q.set("bencana", $("rBencana").value);
      const r = await api("/api/rumah-rusak/rekap?" + q); if (r.s !== 200) return pesan(r.j.galat || `Rekap gagal (${r.s})`, "galat");
      pesan("");
      const tb = $("rekap").tBodies[0]; tb.replaceChildren();
      if (!r.j.kec.length) { const tr = buat("tr"), td = buat("td", "Tidak ada laporan pada rentang ini."); td.colSpan = 5; tr.append(td); tb.append(tr); return; }
      for (const k of r.j.kab) {
        tb.append(sel(`${k.kab} (${k.bencana})`, "kab", k.berat, k.sedang, k.ringan, k.total));
        for (const c of r.j.kec.filter(c => c.bencana === k.bencana && c.prov === k.prov && c.kab === k.kab)) tb.append(sel(c.kec, "kec", c.berat, c.sedang, c.ringan, c.total));
      }
      const j = r.j.total; tb.append(sel("Jumlah", "jumlah", j.berat, j.sedang, j.ringan, j.total));
    });

    function tanpaAkses() {
      $("tanpaAkses").hidden = false; $("kirim").disabled = true; $("siapa").textContent = "Belum ada akses";
    }
    /* ---- mulai ---- */
    mulaiPeta();
    (async () => {
      const r = await api("/api/rumah-rusak?saya=1").catch(() => ({s: 0}));
      if (r.s === 403) return tanpaAkses();
      if (r.s !== 200) return void ($("siapa").textContent = "Server tidak terjangkau; muat ulang.");
      $("siapa").textContent = "Akses terverifikasi";
      if (kode) api("/api/lapangan/saya").then(x => { if (x.s === 200) $("siapa").textContent = `${x.j.regu.nama} · ${x.j.regu.unsur} · ${x.j.regu.kab}`; }).catch(() => {});
      muatSaya();
    })();
  }
  window.RumahRusak = {pasang};
  const w = document.getElementById("rrWadah");
  if (w && w.hasAttribute("data-otomatis")) pasang(w, {hash: true});
})();
