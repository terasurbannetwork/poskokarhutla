"use strict";
/* LAYAR DINDING command center karhutla (/command-center/dinding, kerangka src/admin_halaman.js halamanDinding). BACA SAJA, menyala terus, tanpa tombol aksi, tanpa modal/pop-up
   (sengaja TIDAK memuat pop-up peringatan publik, sapaan, atau asisten). Tanpa nomor telepon, catatan bebas, foto, atau nama regu: /api/cc/dinding memang tidak mengirimkannya.
   Sumber dan jajak: /api/cc/dinding 30 dtk; /api/titik, /api/peringatan/aktif, /api/omc/sortie masing-masing 5 menit; semuanya jalan walau tab tersembunyi.
   Tiap sumber punya umur data sendiri di baris bawah: MERAH bila basi (cc > 2 menit, titik > 4 jam, peringatan/OMC > 15 menit) atau "Gagal menyegarkan sejak HH.MM" bila jajak gagal.
   Layar tetap menyala (Screen Wake Lock, diminta ulang saat kembali terlihat), muat ulang sendiri tiap hari pukul 03.00 WIB, sesi habis (401/403) = spanduk besar, bukan pengalihan diam-diam.
   Peta nasional MapLibre gelap (ubin openfreemap; gagal = latar polos): titik panas 24 jam (lokasi unik, AngkaKawasan.selUnik; oranye terang bergaris gelap, jari-jari ~0,25-0,3 rem supaya terbaca dari jauh) dan lingkaran alert level 3 per status (baru berkedip,
   prefers-reduced-motion dihormati). Tanpa CSS zoom (kanvas peta salah ukur di bawahnya): ukuran huruf dari rem yang mengikuti lebar/tinggi layar (command_dinding.css).
   Hemat kerja untuk layar yang menyala 24 jam: lapisan titik panas (puluhan ribu fitur) dibangun SEKALI per muat titik (5 menit) dan dipasang hanya saat itu; lapisan alert (<= 60) dipasang ulang hanya bila isinya
   berubah; pemotongan antrean mengukur tata letak SATU kali (bukan per baris) dan ukuran ulang saat jendela ditarik ditunda (debounce). */
(() => {
  const {h, jam, jamTgl, tgl, durasi, durasiPecah, teksShift, ambil, waktu, jajak, perbaruiUmur, suara, NAMA_STATUS} = window.Cc;
  const ROOT = document.getElementById("dd"), BODY = document.body.dataset;
  const MENIT = 6e4, JAM = 36e5, HARI = 24 * JAM, WIB = 7 * JAM, GERAK = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BASI = {cc: 2 * MENIT, titik: 4 * JAM, peringatan: 15 * MENIT, omc: 15 * MENIT};
  const DASAR = "https://tiles.openfreemap.org/styles/dark", JENDELA_TITIK = 24 * JAM;
  const warna = (k, cad) => getComputedStyle(document.documentElement).getPropertyValue(k).trim() || cad;   // satu sumber warna status: command_bersama.css
  const W = {baru: warna("--cc-baru", "#e5484d"), dalam_konfirmasi: warna("--cc-konf", "#f5c518"), ada_api: warna("--cc-api", "#f76b15"), tidak_ada_api: warna("--cc-aman", "#8b98ab")};
  const TITIK = warna("--cc-titik", "#ffb04d"), TITIK_GARIS = "#1b0d00";   // oranye terang + garis gelap tipis: menonjol di ubin gelap dari jauh, dan beda dari "ada api" (#f76b15)
  const SUMBER = {cc: {nama: "Command center"}, titik: {nama: "Titik panas"}, peringatan: {nama: "Peringatan"}, omc: {nama: "OMC"}};
  for (const [k, s] of Object.entries(SUMBER)) Object.assign(s, {batas: BASI[k], diambil: null, gagal: null});
  const S = {D: null, titik: null, fc: null, sigAlert: null, peringatan: null, omc: null, sesiHabis: false, reload: null, kunci: null, tundaUkur: 0};
  const el = {}, U = {};

  /* ---------------------------------------------------------------- kerangka */
  function ubin(kunci, label, satuan) {
    const n = h("b", {class: "dd-angka-nilai", teks: "–"}), s = h("span", {class: "dd-angka-satuan", teks: satuan}), sub = h("small", {class: "dd-angka-sub"});
    U[kunci] = {n, s, sub, el: h("div", {class: "dd-ubin"}, h("span", {class: "dd-angka-label", teks: label}), h("div", {class: "dd-angka-baris"}, n, s), sub)};
    return U[kunci].el;
  }
  /* angka rata kanan + satuan di kolom tetap; teks panjang ("1 jam 5") mengecil supaya tidak keluar dari ubin */
  const angka = (u, teks, satuan = u.s.textContent) => { u.n.textContent = teks; u.n.classList.toggle("pj", String(teks).length > 6); u.s.textContent = satuan; };
  function bangun() {
    el.spanduk = h("div", {class: "dd-spanduk", role: "alert", hidden: true}, h("b", {teks: "Sesi habis — masuk ulang"}), " ", h("a", {href: BODY.masuk, teks: "Masuk ulang"}));
    el.shift = h("b", {class: "dd-shift-nama", teks: "Shift"}); el.hadir = h("span", {class: "dd-hadir"});
    el.jam = h("span", {class: "dd-jam-angka", teks: "--.--"}); el.tgl = h("span", {class: "dd-tgl"});
    el.peta = h("div", {class: "dd-peta"}); el.petaGagal = h("p", {class: "dd-peta-gagal", hidden: true});
    el.daftar = h("ol", {class: "dd-daftar"}); el.lagi = h("p", {class: "dd-lagi", hidden: true}); el.kosong = h("p", {class: "dd-kosong", hidden: true, teks: "Tidak ada alert level 3 yang menunggu."});
    el.kunci = h("span", {class: "dd-kunci"});
    el.umur = Object.fromEntries(Object.keys(SUMBER).map(k => [k, h("span", {class: "dd-sumber"})]));
    const legenda = h("ul", {class: "dd-legenda", "aria-label": "Legenda"}, ...["baru", "dalam_konfirmasi", "ada_api", "tidak_ada_api"].map(k => h("li", {"data-s": k}, NAMA_STATUS[k])), h("li", {"data-s": "titik"}, "Titik panas 24 jam"));
    ROOT.replaceChildren(el.spanduk,
      h("header", {class: "dd-atas"},
        h("div", {class: "dd-judul"}, h("h1", {teks: "Command center karhutla"}), h("p", {teks: "BNPB · Pusdalops · layar dinding"})),
        h("div", {class: "dd-shift"}, el.shift, el.hadir),
        h("div", {class: "dd-jam"}, suara.lencana(), h("div", {class: "dd-jam-baris"}, el.jam, h("small", {teks: "WIB"})), el.tgl)),
      h("main", {class: "dd-tengah"},
        h("section", {class: "dd-petabox", "aria-label": "Peta titik panas dan alert"}, el.peta, legenda, el.petaGagal),
        h("aside", {class: "dd-antrean", "aria-label": "Antrean alert level 3"}, h("h2", {teks: "Antrean alert level 3"}), h("div", {class: "dd-daftar-kotak"}, el.daftar, el.kosong), el.lagi)),
      h("section", {class: "dd-angka", "aria-label": "Angka ringkas"},
        ubin("titik", "Titik panas 24 jam", "lokasi"), ubin("alert", "Alert hari ini", "alert"), ubin("median", "Median respons shift ini", "menit"),
        ubin("lewat", "Lewat 6 jam, BPBD belum konfirmasi", "tugas"), ubin("peringatan", "Peringatan aktif, semua bencana", "peringatan"), ubin("omc", "OMC hari ini", "sortie")),
      h("footer", {class: "dd-umur", "aria-label": "Umur data"}, h("b", {teks: "Umur data"}), ...Object.values(el.umur), el.kunci));
    document.body.append(suara.gerbang(false));
  }

  /* ---------------------------------------------------------------- jam, spanduk, umur data */
  function gambarJam() {
    const n = waktu.kini(), j = jam(n);
    if (el.jam.textContent !== j) { el.jam.textContent = j; el.tgl.textContent = tgl(n); }
  }
  function gambarSpanduk() { el.spanduk.hidden = !S.sesiHabis; }
  function gambarUmur() {
    const n = waktu.kini();
    for (const [k, s] of Object.entries(SUMBER)) {
      const umur = s.diambil == null ? null : Math.max(0, n - s.diambil), basi = s.gagal != null || umur == null || umur > s.batas;
      el.umur[k].className = "dd-sumber" + (basi ? " basi" : "");
      el.umur[k].replaceChildren(h("b", {teks: s.nama}), " ", s.gagal != null ? `Gagal menyegarkan sejak ${jam(s.gagal)}` : umur == null ? "belum dimuat" : `diperbarui ${durasi(umur)} lalu`);
    }
    el.kunci.textContent = S.kunci ? "Layar tetap menyala: ya" : "Layar tetap menyala: tidak";
    el.kunci.className = "dd-kunci" + (S.kunci ? "" : " basi");
  }

  /* ---------------------------------------------------------------- command center */
  async function muatCc() {
    const r = await ambil("/api/cc/dinding"), s = SUMBER.cc;
    if (r.status === 401 || r.status === 403) { S.sesiHabis = true; s.gagal ??= waktu.kini(); gambarSpanduk(); gambarUmur(); return; }
    S.sesiHabis = false; gambarSpanduk();
    if (!r.ok || !r.j.ringkasan) { s.gagal ??= waktu.kini(); gambarUmur(); return; }
    s.gagal = null; waktu.sinkron(r.j.kini); s.diambil = r.j.data_pada; S.D = r.j;
    S.reload ??= berikut03(waktu.kini());
    gambarCc(); gambarUmur();
  }
  /* kunci stabil satu alert tanpa id tugas: lokasi dibulatkan + waktu dibuat (untuk status baru, sejak = dibuat) */
  const kunciAlert = x => `${x.prov}|${x.kab}|${x.lat}|${x.lon}|${x.sejak}`;
  function gambarCc() {
    const d = S.D, r = d.ringkasan;
    el.shift.textContent = "Shift " + teksShift(d.shift);
    el.hadir.textContent = d.operator_hadir.length ? "Operator hadir: " + d.operator_hadir.join(", ") : "Belum ada operator hadir";
    /* satu populasi: alert yang DIBUAT sejak 00.00 WIB (angka besar dan rinciannya); antrean terbuka sampai 7 hari ada di panel kanan, bukan di sini */
    const hi = r.hari_ini ?? {baru: 0, dalam_konfirmasi: 0, diputuskan: 0};
    /* bagian-bagiannya menjumlah ke angka besar: alert hari ini yang tugasnya sudah ditutup (padam/bukan api) tanpa keputusan operator tidak masuk tiga bagian server, jadi ditambah "sudah tutup" bila ada */
    const tutup = Math.max(0, (r.alert_hari_ini ?? 0) - hi.baru - hi.dalam_konfirmasi - hi.diputuskan);
    angka(U.alert, fmt(r.alert_hari_ini)); U.alert.sub.textContent = `dibuat sejak 00.00 WIB: ${fmt(hi.baru)} baru · ${fmt(hi.dalam_konfirmasi)} dalam konfirmasi · ${fmt(hi.diputuskan)} diputuskan${tutup ? ` · ${fmt(tutup)} sudah tutup` : ""}`;
    const [nilai, satuan] = durasiPecah(r.median_respons_ms);
    angka(U.median, nilai, satuan); U.median.sub.textContent = r.median_respons_ms == null ? "belum ada alert dipegang pada shift ini" : "dari alert dibuat sampai dipegang" + (r.median_respons_terpotong ? " · dari sebagian (batas baca)" : "");
    /* cakupan eksplisit: SEMUA tugas karhutla yang masih terbuka tanpa konfirmasi lapangan, semua level, dihitung sejak dibuat; bukan antrean level 3 di panel kanan. Terpotong = angka batas bawah. */
    angka(U.lewat, fmt(r.lewat_tenggat_konfirmasi) + (r.lewat_tenggat_terpotong ? "+" : "")); U.lewat.el.classList.toggle("merah", r.lewat_tenggat_konfirmasi > 0);
    U.lewat.sub.textContent = r.lewat_tenggat_terpotong ? "semua level, sejak dibuat · baru sebagian dihitung (batas baca), angka sebenarnya lebih besar" : "semua tugas karhutla terbuka, semua level, sejak dibuat";
    gambarAntrean();
    isiAlert();
    suara.perbarui(d.antrean.filter(x => x.status === "baru").map(kunciAlert));   // keadaan dari server: berhenti sendiri begitu semua sudah dipegang
  }
  function itemAntrean(x, dataPada) {
    return h("li", {class: "dd-item", "data-s": x.status},
      h("span", {class: "dd-titik", "aria-hidden": "true"}),
      h("div", {class: "dd-item-isi"},
        h("div", {class: "dd-item-atas"}, h("b", {teks: x.kab || x.prov_nama}), h("span", {class: "cc-pil", "data-s": x.status, teks: NAMA_STATUS[x.status] ?? x.status})),
        h("div", {class: "dd-item-bawah"}, h("small", {teks: x.prov_nama}), h("small", null, "umur ", h("span", {"data-dari": dataPada - x.umur})), x.pemegang ? h("small", {teks: `${x.pemegang} sejak ${jamTgl(x.sejak)}`}) : null)));
  }
  /* tanpa gulir: baris yang tidak muat dibuang dari bawah dan diganti "+N alert lagi" (urutan server: baru, dalam konfirmasi, diputuskan). N = antrean_total (seluruh antrean di server, bisa > 60 baris
     yang dikirim) dikurangi baris yang tampil. Umur diisi SEBELUM mengukur (teks umur mengubah lebar baris); potong() dijalankan lagi tiap kali umur berubah, supaya baris yang tumbuh karena
     "1 jam 5 menit" tidak terpotong separuh. UKUR SATU KALI: semua rect dibaca berturut-turut (satu tata letak), baru ekor dibuang sekaligus; menghapus baris satu per satu sambil membaca
     scrollHeight memaksa tata letak ulang tiap baris (puluhan ms di thread utama untuk 60 baris). */
  function potong() {
    if (!S.D) return;
    const total = Math.max(S.D.antrean_total ?? 0, S.D.antrean.length);
    el.lagi.hidden = total === 0; if (el.lagi.hidden) return;
    if (!el.lagi.textContent.trim()) el.lagi.textContent = "+0 alert lagi";   // tinggi barisnya ikut terukur
    const anak = [...el.daftar.children]; let muat = anak.length;
    if (anak.length > 1) {
      const batas = el.daftar.getBoundingClientRect().bottom + 1, rapat = parseFloat(getComputedStyle(anak[0]).marginBottom) || 0;   // kotak margin baris terakhir juga harus muat (seperti scrollHeight)
      const bawah = anak.map(e => e.getBoundingClientRect().bottom + rapat);
      const gagal = bawah.findIndex(b => b > batas); if (gagal >= 0) muat = Math.max(1, gagal);
      for (const e of anak.slice(muat)) e.remove();
    }
    const sisa = total - muat, r = S.D.ringkasan;
    /* pasti = "+N alert lagi"; server memotong daftar bacanya (antrean_terpotong) = N batas bawah, akhiran + seperti chip lain: "N+ alert lagi" (bukan "+N+") */
    el.lagi.hidden = sisa <= 0; el.lagi.textContent = r.antrean_terpotong || r.final_terpotong ? `${fmt(sisa)}+ alert lagi` : `+${fmt(sisa)} alert lagi`;
  }
  function gambarAntrean() {
    const d = S.D;
    el.daftar.replaceChildren(...d.antrean.map(x => itemAntrean(x, d.data_pada)));
    el.kosong.hidden = d.antrean.length > 0;
    perbaruiUmur(el.daftar); potong();
  }

  /* ---------------------------------------------------------------- titik panas, peringatan, OMC */
  /* /api/titik: {acuan, dibuat, wilayah, baris:[lat, lon, jam relatif acuan, sensor, frp, keyakinan, indeks wilayah]} (pengurai sama dengan public/monitor.js).
     24 jam terakhir, dihitung per LOKASI UNIK (sel ~375 m lintas satelit, AngkaKawasan.selUnik): angka sejenis dengan hotspot di peta utama. */
  function uraiTitik(j, kini) {
    const t0 = Date.parse(j.acuan), lihat = new Set(), titik = [];
    const baris = (j.baris || []).map(b => ({lat: b[0], lon: b[1], ms: t0 + Math.round(b[2] * JAM)})).filter(b => Number.isFinite(b.lat) && Number.isFinite(b.lon) && b.ms >= kini - JENDELA_TITIK);
    /* tanpa urut waktu: jumlah lokasi unik = jumlah kunci sel berbeda, tak bergantung urutan; urutan hanya memilih titik mana yang mewakili selnya (selisih < satu sel), dan ms tak dipakai lagi */
    for (const b of baris) { const k = AngkaKawasan.selUnik(b.lat, b.lon); if (!lihat.has(k)) { lihat.add(k); titik.push(b); } }
    return titik;
  }
  async function muatTitik() {
    const r = await ambil("/api/titik", {cache: "no-cache", batas: 45e3}), s = SUMBER.titik;
    if (!r.ok || !Array.isArray(r.j.baris)) { s.gagal ??= waktu.kini(); gambarUmur(); return; }
    s.gagal = null; s.diambil = Date.parse(r.j.dibuat || r.j.acuan);
    S.titik = uraiTitik(r.j, waktu.kini()); angka(U.titik, fmt(S.titik.length)); U.titik.sub.textContent = "lokasi unik (sel 375 m, semua satelit)";
    S.fc = {type: "FeatureCollection", features: S.titik.map(t => ({type: "Feature", properties: {}, geometry: {type: "Point", coordinates: [t.lon, t.lat]}}))};   // dibangun SEKALI per muat (5 menit), bukan tiap jajak antrean
    isiTitik(); gambarUmur();
  }
  async function muatPeringatan() {
    const r = await ambil("/api/peringatan/aktif"), s = SUMBER.peringatan;
    if (!r.ok || !Array.isArray(r.j.peringatan)) { s.gagal ??= waktu.kini(); gambarUmur(); return; }
    s.gagal = null; s.diambil = Date.parse(r.j.kini) || waktu.kini();
    /* daftar server dipotong 50 baris terbaru: angka dari `total` + `per_tingkat` (COUNT sebenarnya), bukan dari panjang daftar. Respons tanpa kolom itu (cache tepi 30 dtk dari versi lama) dihitung dari daftar, dan 50 baris penuh = "50+". */
    const per = {Awas: 0, Siaga: 0, Waspada: 0}, tepat = r.j.per_tingkat && typeof r.j.per_tingkat === "object" && Number.isFinite(r.j.total);
    if (tepat) for (const k of Object.keys(per)) per[k] = Number(r.j.per_tingkat[k]) || 0; else for (const p of r.j.peringatan) if (p.tingkat in per) per[p.tingkat]++;
    const plus = !tepat && r.j.peringatan.length >= 50 ? "+" : "";
    angka(U.peringatan, fmt(tepat ? r.j.total : r.j.peringatan.length) + plus);
    U.peringatan.sub.textContent = Object.entries(per).filter(([, n]) => n).map(([k, n]) => `${fmt(n)}${plus} ${k}`).join(" · ") || "tidak ada peringatan aktif";
    U.peringatan.el.classList.toggle("merah", per.Awas > 0); gambarUmur();
  }
  async function muatOmc() {
    const wibHari = ms => new Date(ms + WIB).toISOString().slice(0, 10), hari = wibHari(waktu.kini());
    const r = await ambil(`/api/omc/sortie?sejak=${hari}`), s = SUMBER.omc;
    if (!r.ok || !Array.isArray(r.j.sortie)) { s.gagal ??= waktu.kini(); gambarUmur(); return; }
    s.gagal = null; s.diambil = Date.parse(r.j.dibuat) || waktu.kini();
    const n = r.j.sortie.filter(x => x.mulai && wibHari(Date.parse(x.mulai)) === hari).length;
    angka(U.omc, fmt(n)); U.omc.sub.textContent = n ? "sortie modifikasi cuaca tercatat" : "belum ada sortie tercatat"; gambarUmur();
  }

  /* ---------------------------------------------------------------- peta */
  let M = null, SIAP = false, polos = false;
  const KOSONG = {type: "FeatureCollection", features: []};
  const POLOS = () => ({version: 8, sources: {}, layers: [{id: "bg", type: "background", paint: {"background-color": "#0a1a30"}}]});
  const warnaStatus = ["match", ["get", "status"], "baru", W.baru, "dalam_konfirmasi", W.dalam_konfirmasi, "ada_api", W.ada_api, "tidak_ada_api", W.tidak_ada_api, "#ffffff"];
  /* ukuran lingkaran mengikuti rem (1920 x 1080 = 1; 3840 x 2160 = 2): di layar 4K titik tidak mengecil terhadap huruf */
  const skala = () => Math.max(0.7, parseFloat(getComputedStyle(document.documentElement).fontSize) / 17.4);
  const zoomJari = (a, b, c, k) => ["interpolate", ["linear"], ["zoom"], 3, a * k, 6, b * k, 9, c * k];
  const jari = k => zoomJari(12, 18, 26, k * skala());
  /* titik panas: ~0,25 rem di zoom awal 1920 x 1080 (zoom ~4,3 => ~4,4 px), ~0,29 rem di 3840 x 2160; di bawah lingkaran alert (lapisannya dipasang lebih dulu) */
  const jariTitik = k => zoomJari(3.5, 5.5, 8, k);
  function lapisan() {
    const k = skala();
    M.addSource("titik", {type: "geojson", data: KOSONG});
    M.addLayer({id: "titik", type: "circle", source: "titik", paint: {"circle-radius": jariTitik(k), "circle-color": TITIK, "circle-opacity": 0.95, "circle-stroke-width": k, "circle-stroke-color": TITIK_GARIS, "circle-stroke-opacity": 0.85}});
    M.addSource("alert", {type: "geojson", data: KOSONG});
    M.addLayer({id: "alert-halo", type: "circle", source: "alert", filter: ["==", ["get", "status"], "baru"], paint: {"circle-radius": jari(GERAK ? 1.2 : 1.7), "circle-color": W.baru, "circle-opacity": GERAK ? 0.4 : 0.3, "circle-blur": 0.7}});
    M.addLayer({id: "alert", type: "circle", source: "alert", paint: {"circle-radius": zoomJari(10, 15, 22, k), "circle-color": warnaStatus, "circle-opacity": 0.55, "circle-stroke-width": 3 * k, "circle-stroke-color": warnaStatus}});
  }
  function skalakan() {
    if (!M || !SIAP) return;
    const k = skala();
    M.setPaintProperty("titik", "circle-radius", jariTitik(k)); M.setPaintProperty("titik", "circle-stroke-width", k); M.setPaintProperty("alert", "circle-radius", zoomJari(10, 15, 22, k)); M.setPaintProperty("alert", "circle-stroke-width", 3 * k);
    M.setPaintProperty("alert-halo", "circle-radius", jari(GERAK ? 1.2 : 1.7));
  }
  /* titik panas: dipasang HANYA saat datanya baru (muatTitik) atau gaya peta dimuat ulang (style.load); puluhan ribu fitur, setData penuh membangun ulang indeks geojson-vt di worker */
  function isiTitik() { if (M && SIAP && S.fc) M.getSource("titik")?.setData(S.fc); }
  /* alert level 3: <= 60 fitur, dipasang ulang hanya bila status/lokasinya berubah dari pemasangan terakhir */
  function isiAlert() {
    if (!M || !SIAP || !S.D) return;
    const f = S.D.antrean.filter(x => Number.isFinite(x.lat) && Number.isFinite(x.lon)), sig = JSON.stringify(f.map(x => [x.status, x.lon, x.lat]));
    if (sig === S.sigAlert) return;
    S.sigAlert = sig;
    M.getSource("alert")?.setData({type: "FeatureCollection", features: f.map(x => ({type: "Feature", properties: {status: x.status}, geometry: {type: "Point", coordinates: [x.lon, x.lat]}}))});
  }
  async function pasangPeta() {
    try { await (await import("/inti/maplibre.js")).muatMapLibre(); }
    catch (e) { el.petaGagal.hidden = false; el.petaGagal.textContent = "Peta tidak bisa dimuat; angka dan antrean tetap berjalan."; return; }
    try { M = new maplibregl.Map({container: el.peta, style: DASAR, bounds: [[94.5, -11.5], [141.5, 6.5]], fitBoundsOptions: {padding: 8}, interactive: false, attributionControl: {compact: true}, fadeDuration: 0}); }
    catch (e) { M = null; el.petaGagal.hidden = false; el.petaGagal.textContent = "Peta tidak bisa digambar di perangkat ini (WebGL); angka dan antrean tetap berjalan."; return; }
    M.on("style.load", () => { lapisan(); SIAP = true; S.sigAlert = null; isiTitik(); isiAlert(); });   // gaya baru = sumber kosong: pasang ulang keduanya
    const gagal = () => { if (!SIAP && !polos) { polos = true; M.setStyle(POLOS()); el.petaGagal.hidden = false; el.petaGagal.textContent = "Peta dasar tidak tersedia; lapisan tetap tampil di atas latar polos."; } };
    M.on("error", e => { console.warn("peta:", e?.error?.message || e?.message || e); gagal(); }); setTimeout(gagal, 12e3);   // peringatan, bukan galat: ubin yang gagal tidak boleh mengotori konsol layar yang menyala terus
    /* ditarik-tarik = banyak event: tunda 150 ms, satu kali ukur ulang peta dan antrean */
    window.addEventListener("resize", () => { clearTimeout(S.tundaUkur); S.tundaUkur = setTimeout(() => { M.resize(); skalakan(); if (S.D) gambarAntrean(); }, 150); });
    /* alert baru berdenyut; tanpa gerak (prefers-reduced-motion) halonya statis dan tidak ada pengatur waktu sama sekali */
    if (GERAK) setInterval(() => {
      if (!SIAP || !S.D || !S.D.antrean.some(x => x.status === "baru") || !M.getLayer("alert-halo")) return;
      const t = (Date.now() % 1800) / 1800;
      M.setPaintProperty("alert-halo", "circle-radius", jari(1 + 1.4 * t)); M.setPaintProperty("alert-halo", "circle-opacity", 0.55 * (1 - t));
    }, 120);
  }

  /* ---------------------------------------------------------------- layar tetap menyala, muat ulang harian */
  async function mintaKunci() {
    try {
      if (!navigator.wakeLock || document.visibilityState !== "visible" || S.kunci) return;
      const k = await navigator.wakeLock.request("screen"); S.kunci = k;
      k.addEventListener("release", () => { if (S.kunci === k) S.kunci = null; gambarUmur(); });
    } catch (e) { S.kunci = null; }
    gambarUmur();
  }
  /* 03.00 WIB berikutnya (ms epoch) setelah `kini` */
  function berikut03(kini) { const t = Math.floor((kini + WIB) / HARI) * HARI + 3 * JAM - WIB; return t > kini ? t : t + HARI; }

  /* ---------------------------------------------------------------- jalan */
  bangun(); gambarJam(); gambarUmur();
  jajak(muatCc, 30e3); jajak(muatTitik, 5 * MENIT); jajak(muatPeringatan, 5 * MENIT); jajak(muatOmc, 5 * MENIT);
  pasangPeta();
  mintaKunci(); document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") mintaKunci(); });
  setInterval(() => {
    gambarJam();
    if (S.reload != null && waktu.kini() >= S.reload) location.reload();   // sekali sehari, 03.00 WIB; sesudahnya gerbang suara muncul lagi bila peramban meminta ketukan
  }, 1e3);
  setInterval(() => { gambarUmur(); perbaruiUmur(el.daftar); potong(); }, 10e3);
})();
