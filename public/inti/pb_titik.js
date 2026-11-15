/* Sarana dan fasilitas sasaran lintas bencana (PB-17; F-2, F-7). Skrip klasik tanpa inline (CSP), global window.PbTitik; juga dimuat node untuk uji (tests/layar/pb_titik.test.mjs).
   Rute: GET /api/pb/titik, POST /api/pb/titik (isi/ubah), POST /api/pb/titik/hapus (hapus lunak, alasan 5-300). Kontrak dan kode galat: src/pb_isian.js.
   Tiga kartu .ex-std (kepala = nama seksi): daftar, peta, isian. Teks pengguna selalu lewat textContent. Chrome kontrol urgent (atribut saja); daftar dan peta digambar di rAF sesudah data tiba (INP).
   Hak tulis diputuskan server (403 ditampilkan apa adanya); layar tidak menebak peran. Tanpa data contoh: kosong = "Belum ada". */
(g => {
  "use strict";
  const SARANA = ["heli_evakuasi", "perahu_karet", "perahu_motor", "pompa_air", "truk_tangki", "tenda", "terpal", "atap_darurat", "alat_berat", "genset", "dapur_umum", "masker", "air_bersih_unit", "tim_sar_unit"];
  const FASILITAS = ["tempat_evakuasi", "faskes", "sekolah", "gudang", "helipad", "sumber_air", "barak", "ruang_udara_bersih", "pos_pantau"];
  const LABEL = {heli_evakuasi: "Helikopter evakuasi", perahu_karet: "Perahu karet", perahu_motor: "Perahu motor", pompa_air: "Pompa air", truk_tangki: "Truk tangki", tenda: "Tenda", terpal: "Terpal", atap_darurat: "Atap darurat", alat_berat: "Alat berat", genset: "Genset", dapur_umum: "Dapur umum", masker: "Masker", air_bersih_unit: "Unit air bersih", tim_sar_unit: "Unit tim SAR",
    tempat_evakuasi: "Tempat evakuasi", faskes: "Fasilitas kesehatan", sekolah: "Sekolah", gudang: "Gudang", helipad: "Helipad", sumber_air: "Sumber air", barak: "Barak", ruang_udara_bersih: "Ruang udara bersih", pos_pantau: "Pos pantau"};
  const STATUS = {siap: "Siap", dipakai: "Dipakai", rusak: "Rusak", tidak_tersedia: "Tidak tersedia"};
  const WARNA = {siap: "#1f8a4c", dipakai: "#1b5fa8", rusak: "#c0392b", tidak_tersedia: "#7a8699"};
  const IK = {sarana: "M3 7h11v9H3z|M14 10h4l3 3v3h-7z|M7 19a1.5 1.5 0 1 0 0-.01|M17 19a1.5 1.5 0 1 0 0-.01", fasilitas: "M3 21V8l9-5 9 5v13|M9 21v-6h6v6", daftar: "M4 6h16|M4 12h16|M4 18h10", peta: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z|M9 4v14|M15 6v14", isi: "M12 5v14|M5 12h14", hapus: "M5 7h14|M10 7V4h4v3|M7 7l1 13h8l1-13", ubah: "M4 20h4L19 9l-4-4L4 16z"};
  const GALAT = {401: "Masuk dulu untuk mengisi atau mengubah data.", 403: "Akun ini tidak berhak mengisi sarana di wilayah ini.", 404: "Bencana ini belum menyalakan operasi, atau titiknya tidak ditemukan.", 409: "Titik sudah dihapus atau berubah; muat ulang daftar.", 429: "Terlalu cepat; tunggu beberapa menit lalu coba lagi.", 503: "Fitur sarana dan fasilitas belum aktif di server."};

  /* ---- inti murni (diuji node) ---- */
  const label = j => LABEL[j] || j;
  const MAKS_BARIS = 100;
  const koma = n => Number(n).toFixed(5).replace(".", ",");   // klik peta: koma desimal, sama dengan placeholder; badanSimpan menerima koma maupun titik
  const jenisUntuk = (golongan, izinSarana) => golongan === "sarana" ? SARANA.filter(j => !izinSarana || !izinSarana.length || izinSarana.includes(j)) : FASILITAS;
  const geojson = daftar => ({type: "FeatureCollection", features: daftar.filter(t => t.lat != null && t.lon != null && Number.isFinite(+t.lat) && Number.isFinite(+t.lon)).map(t => ({type: "Feature", properties: {id: t.id, nama: t.nama, status: t.status, warna: WARNA[t.status] || WARNA.tidak_tersedia}, geometry: {type: "Point", coordinates: [+t.lon, +t.lat]}}))});
  const urut = (daftar, kunci, naik) => [...daftar].sort((a, b) => { const x = a[kunci] ?? "", y = b[kunci] ?? ""; const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "id"); return naik ? c : -c; });
  /* badan POST dari nilai isian; angka dikirim sebagai angka, kosong dihilangkan (server memvalidasi ulang) */
  function badanSimpan(f) {
    const o = {bencana: f.bencana, prov: f.prov, golongan: f.golongan, jenis: f.jenis, nama: String(f.nama ?? "").trim(), lat: Number(String(f.lat).replace(",", ".")), lon: Number(String(f.lon).replace(",", ".")), status: f.status || "siap"};
    if (f.kab) o.kab = f.kab;
    if (f.id) o.id = f.id;
    if (String(f.kapasitas ?? "").trim() !== "") o.kapasitas = Number(f.kapasitas);
    const c = String(f.catatan ?? "").trim(); if (c) o.catatan = c;
    return o;
  }
  const cek = o => !o.prov ? "Pilih provinsi." : !o.jenis ? "Pilih jenis." : !o.nama ? "Nama tempat atau unit wajib (tanpa nama orang)." : !Number.isFinite(o.lat) || !Number.isFinite(o.lon) ? "Isi lintang dan bujur, atau klik peta." : null;
  const galatRamah = (status, j) => (j && j.galat) || GALAT[status] || "Gagal menyimpan (kode " + status + ").";

  /* ---- DOM ---- */
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
  const ikon = k => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "2"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true");
    for (const d of IK[k].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.append(p); } return s; };
  const tombol = (k, teks, kelas) => { const b = el("button", kelas || ""); b.type = "button"; b.append(ikon(k), el("span", null, teks)); return b; };
  const kartu = (nama, ik, isi) => { const a = el("article", "ex ex-std"), h = el("header", "ex-hd"), jd = el("div", "ex-jd"), h3 = el("h3"); h3.append(ikon(ik), document.createTextNode(nama)); jd.append(h3); h.append(jd);
    const bd = el("div", "ex-bd"); bd.append(...isi); a.append(h, bd); return a; };
  const pilihan = (nilai, daftar) => { const s = el("select"); for (const [v, t] of daftar) { const o = el("option", null, t); o.value = v; s.append(o); } s.value = nilai; return s; };
  const bidang = (teks, kontrol) => { const l = el("label", "pb-f"); l.append(el("span", null, teks), kontrol); return l; };
  const masukan = (tipe, ket, maks) => { const i = el("input"); i.type = tipe; if (ket) i.placeholder = ket; if (maks) i.maxLength = maks; i.autocomplete = "off"; return i; };

  /* pasang(host, {bencana, nama?, sarana?: [jenis yang diizinkan registri], prov?, provDaftar?: [[kode, nama]], ambil?}) -> {muat, tutup} */
  function pasang(host, o) {
    const ambil = o.ambil || (g.fetch ? g.fetch.bind(g) : null);
    const S = {tutup: false, batas: MAKS_BARIS, daftar: [], prov: o.prov || "", golongan: "sarana", edit: null, urut: ["nama", true], peta: null, sibuk: 0};
    const provDaftar = o.provDaftar || Object.entries(g.S?.meta?.provinsi || {});
    const api = async (jalur, opsi) => { const r = await ambil(jalur, {credentials: "same-origin", ...opsi}); let j = null; try { j = await r.json(); } catch (e) {} return {ok: r.ok, status: r.status, j}; };
    const kirim = (jalur, badan) => api(jalur, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(badan)});

    /* kartu 1: daftar */
    const selProv = pilihan(S.prov, [["", "Pilih provinsi"], ...provDaftar]);
    const selGol = pilihan("", [["", "Semua golongan"], ["sarana", "Sarana"], ["fasilitas", "Fasilitas"]]);
    const status = el("p", "pb-status"); status.setAttribute("role", "status");
    const tabelWadah = el("div", "pb-tabel");
    const kartuDaftar = kartu("Daftar sarana dan fasilitas", "daftar", [(() => { const b = el("div", "pb-alat"); b.append(bidang("Provinsi", selProv), bidang("Golongan", selGol)); return b; })(), status, tabelWadah]);
    /* kartu 2: peta */
    const petaDiv = el("div", "pb-peta"); petaDiv.setAttribute("role", "region"); petaDiv.setAttribute("aria-label", "Peta fasilitas");
    const kartuPeta = kartu("Peta fasilitas", "peta", [petaDiv, el("p", "pb-ket", "Klik peta untuk mengisi koordinat pada isian.")]);
    /* kartu 3: isian */
    const seg = el("div", "pb-seg"); seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "Golongan isian");
    const bSar = tombol("sarana", "Sarana"), bFas = tombol("fasilitas", "Fasilitas"); seg.append(bSar, bFas);
    const fJenis = el("select"), fNama = masukan("text", "Nama tempat atau unit, tanpa nama orang", 80), fLat = masukan("text", "-6,2"), fLon = masukan("text", "106,8"), fKap = masukan("number", "0"),
      fStat = pilihan("siap", Object.entries(STATUS)), fCat = masukan("text", "Catatan singkat (opsional)", 200), fKab = masukan("text", "4 digit (opsional)", 4);
    fLat.inputMode = fLon.inputMode = "decimal"; fKap.min = "0"; fKap.max = "1000000"; fKab.inputMode = "numeric";
    const simpanB = tombol("isi", "Simpan", "pb-utama"), batalB = tombol("ubah", "Batal ubah", "pb-sekunder"); batalB.hidden = true;
    const pesan = el("p", "pb-pesan"); pesan.setAttribute("role", "status");
    const grid = el("div", "pb-form"); grid.append(bidang("Jenis", fJenis), bidang("Nama", fNama), bidang("Lintang", fLat), bidang("Bujur", fLon), bidang("Kapasitas", fKap), bidang("Status", fStat), bidang("Kab/kota (kode)", fKab), bidang("Catatan", fCat));
    const aksi = el("div", "pb-aksi"); aksi.append(simpanB, batalB);
    const kartuIsi = kartu("Isian", "isi", [seg, grid, aksi, pesan]);

    host.replaceChildren(kartuDaftar, kartuPeta, kartuIsi);

    const isiJenis = () => { fJenis.replaceChildren(...jenisUntuk(S.golongan, o.sarana).map(j => { const op = el("option", null, label(j)); op.value = j; return op; })); };
    const tandaiGol = () => { bSar.setAttribute("aria-pressed", String(S.golongan === "sarana")); bFas.setAttribute("aria-pressed", String(S.golongan === "fasilitas")); isiJenis(); };
    const kosongkan = () => { S.edit = null; fNama.value = fLat.value = fLon.value = fKap.value = fCat.value = ""; fStat.value = "siap"; batalB.hidden = true; simpanB.lastChild.textContent = "Simpan"; };

    /* tabel: dibangun dari data lewat textContent, urut dari kepala kolom */
    function gambarTabel() {
      if (S.tutup) return;
      const kolom = [["Nama", "nama"], ["Jenis", "jenis"], ["Kapasitas (jumlah)", "kapasitas", 1], ["Status", "status"]];
      const t = el("table"), th = el("thead"), tr = el("tr");
      for (const [t1, k, n] of kolom) { const c = el("th", n ? "n" : "", t1); c.tabIndex = 0; c.dataset.k = k; if (S.urut[0] === k) c.setAttribute("aria-sort", S.urut[1] ? "ascending" : "descending"); tr.append(c); }
      tr.append(el("th", null, "Aksi")); th.append(tr); t.append(th);
      const tb = el("tbody"), f = selGol.value;
      const baris = urut(S.daftar.filter(x => !f || x.golongan === f).map(x => ({...x, jenis_t: label(x.jenis)})), S.urut[0] === "jenis" ? "jenis_t" : S.urut[0], S.urut[1]);
      for (const x of baris.slice(0, S.batas)) {
        const r = el("tr"); r.dataset.id = x.id;
        const nm = el("td", "ops-kiri", x.nama), jn = el("td", null, label(x.jenis)), kp = el("td", "n num", x.kapasitas == null ? "–" : new Intl.NumberFormat("id-ID").format(x.kapasitas));
        const st = el("td"), pil = el("span", "pb-st", STATUS[x.status] || x.status); pil.style.setProperty("--w", WARNA[x.status] || WARNA.tidak_tersedia); st.append(pil);
        const ak = el("td", "pb-ak"), ub = el("button", "pb-ik", "Ubah"), hp = el("button", "pb-ik", "Hapus"); ub.type = hp.type = "button"; ub.dataset.aksi = "ubah"; hp.dataset.aksi = "hapus"; ak.append(ub, hp);
        r.append(nm, jn, kp, st, ak); tb.append(r);
      }
      t.append(tb);
      const w = el("div", "tw ops-tw ex-tabel"); w.append(t);
      const isi = [baris.length ? w : el("p", "ops-kosong", S.prov ? "Belum ada sarana atau fasilitas di provinsi ini." : "Pilih provinsi untuk melihat daftar.")];
      if (baris.length > S.batas) { const l = tombol("daftar", "Tampilkan lagi (" + (baris.length - S.batas) + " baris)", "pb-sekunder"); l.dataset.lagi = "1"; isi.push(l); }
      tabelWadah.replaceChildren(...isi);
    }

    /* peta: dimuat malas saat ada data; kerja berat setelah klik (nanti) */
    function gambarPeta() {
      if (S.tutup) return;
      const gj = geojson(S.daftar);
      if (!g.maplibregl) { petaDiv.hidden = true; return; }
      petaDiv.hidden = false;
      if (!S.peta) {
        const pt = gj.features[0]?.geometry.coordinates || [113.9, -2.2];
        const p = S.peta = new g.maplibregl.Map({container: petaDiv, style: "https://tiles.openfreemap.org/styles/positron", center: pt, zoom: gj.features.length ? 8 : 4, minZoom: 3, maxZoom: 17, dragRotate: false, attributionControl: {compact: true}});
        p.addControl(new g.maplibregl.NavigationControl({showCompass: false}));
        p.on("load", () => { p.addSource("pbt", {type: "geojson", data: gj}); p.addLayer({id: "pbt", type: "circle", source: "pbt", paint: {"circle-radius": 6, "circle-color": ["get", "warna"], "circle-stroke-width": 1.5, "circle-stroke-color": "#fff"}}); S.siapPeta = true; fit(gj); });
        p.on("click", e => { fLat.value = koma(e.lngLat.lat); fLon.value = koma(e.lngLat.lng); });
      } else if (S.siapPeta) { S.peta.getSource("pbt")?.setData(gj); fit(gj); }
    }
    function fit(gj) {
      const f = gj.features; if (!f.length || !S.peta) return;
      const b = new g.maplibregl.LngLatBounds(); f.forEach(x => b.extend(x.geometry.coordinates));
      S.peta.fitBounds(b, {padding: 48, maxZoom: 12, duration: 0});
    }
    const nanti = fn => g.requestAnimationFrame ? g.requestAnimationFrame(() => setTimeout(fn, 0)) : setTimeout(fn, 0);

    async function muat() {
      if (!S.prov) { S.daftar = []; gambarTabel(); status.textContent = ""; return; }
      const n = ++S.sibuk; status.textContent = "Memuat...";
      const q = new URLSearchParams({bencana: o.bencana, prov: S.prov}), r = await api("/api/pb/titik?" + q);
      if (n !== S.sibuk) return;
      if (!r.ok) { S.daftar = []; status.textContent = galatRamah(r.status, r.j); nanti(gambarTabel); return; }
      S.daftar = r.j.tersedia === false ? [] : r.j.titik || [];
      status.textContent = r.j.tersedia === false ? "Fitur belum aktif di server." : "";
      nanti(gambarTabel); nanti(gambarPeta);
    }

    /* ---- kontrol: handler hanya mengubah atribut/nilai; kerja berat ditunda ---- */
    selProv.addEventListener("change", () => { S.prov = selProv.value; S.batas = MAKS_BARIS; muat(); });
    selGol.addEventListener("change", () => nanti(gambarTabel));
    bSar.addEventListener("click", () => { S.golongan = "sarana"; tandaiGol(); });
    bFas.addEventListener("click", () => { S.golongan = "fasilitas"; tandaiGol(); });
    tabelWadah.addEventListener("click", e => {
      const th = e.target.closest("th[data-k]"), b = e.target.closest("[data-aksi]");
      if (e.target.closest("[data-lagi]")) { S.batas += MAKS_BARIS; return nanti(gambarTabel); }
      if (th) { S.urut = [th.dataset.k, S.urut[0] === th.dataset.k ? !S.urut[1] : true]; return nanti(gambarTabel); }
      if (!b) return;
      const x = S.daftar.find(z => z.id === b.closest("tr").dataset.id); if (!x) return;
      if (b.dataset.aksi === "ubah") {
        S.edit = x; S.golongan = x.golongan; tandaiGol(); fJenis.value = x.jenis; fNama.value = x.nama; fLat.value = x.lat; fLon.value = x.lon; fKap.value = x.kapasitas ?? ""; fStat.value = x.status; fCat.value = x.catatan ?? ""; fKab.value = x.kab || "";
        batalB.hidden = false; simpanB.lastChild.textContent = "Simpan perubahan"; pesan.textContent = ""; kartuIsi.scrollIntoView?.({block: "nearest"}); return;
      }
      /* hapus: alasan wajib 5-300; diminta di baris yang sama tanpa dialog bawaan */
      if (tabelWadah.querySelector(".pb-alasan")) return;
      const k = el("div", "pb-alasan"), i = masukan("text", "Alasan (5 sampai 300 karakter)", 300), y = tombol("hapus", "Hapus", "pb-bahaya"), n = tombol("daftar", "Batal", "pb-sekunder");
      i.setAttribute("aria-label", "Alasan hapus"); k.append(i, y, n); b.closest("td").append(k); i.focus();
      n.addEventListener("click", () => k.remove());
      y.addEventListener("click", async () => {
        if (i.value.trim().length < 5) { pesan.textContent = "Alasan hapus wajib, minimal 5 karakter."; return; }
        y.disabled = true; const r = await kirim("/api/pb/titik/hapus", {id: x.id, alasan: i.value.trim()});
        if (!r.ok) { y.disabled = false; pesan.textContent = galatRamah(r.status, r.j); return; }
        pesan.textContent = "Titik dihapus."; muat();
      });
    });
    batalB.addEventListener("click", () => { kosongkan(); pesan.textContent = ""; });
    simpanB.addEventListener("click", async () => {
      const b = badanSimpan({bencana: o.bencana, prov: S.edit ? S.edit.prov : S.prov, kab: fKab.value.trim() || S.edit?.kab, id: S.edit?.id, golongan: S.golongan, jenis: fJenis.value, nama: fNama.value, lat: fLat.value, lon: fLon.value, kapasitas: fKap.value, status: fStat.value, catatan: fCat.value});
      const s = cek(b); if (s) { pesan.textContent = s; return; }
      simpanB.disabled = true; pesan.textContent = "Menyimpan...";
      const r = await kirim("/api/pb/titik", b); simpanB.disabled = false;
      if (!r.ok) { pesan.textContent = galatRamah(r.status, r.j); return; }
      pesan.textContent = S.edit ? "Perubahan disimpan." : "Titik disimpan."; kosongkan(); muat();
    });

    tandaiGol(); gambarTabel();
    if (S.prov) muat();
    return {muat, tutup() { S.tutup = true; S.peta?.remove(); S.peta = null; host.replaceChildren(); }, _S: S};
  }

  g.PbTitik = {SARANA, FASILITAS, LABEL, STATUS, label, jenisUntuk, geojson, urut, badanSimpan, cek, galatRamah, koma, MAKS_BARIS, pasang};
})(typeof window !== "undefined" ? window : globalThis);
