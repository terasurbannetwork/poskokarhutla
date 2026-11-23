/* Data Bencana Indonesia (pemilik 23 Nov 2026: "Dalops BNPB agar dibuat gini", contoh gis.bnpb.go.id, "lebih bagus", "bisa ada filter gini juga").
   Satu modul untuk dua tempat: tab pertama /bnpb/dalops (window.DataBencana.pasang(panel)) dan halaman berdiri /bnpb/data-bencana
   untuk BPBD (?prov=73&kab=73.17 mengunci wilayah awal; filter tetap bisa diubah).
   Data: /data/dibi_kejadian.json (publik, DIBI 365 hari, per kab per hari; scripts/umum/dibi_kejadian.py di data.yml).
   Peta: provinsi (/geo/provinsi.json); provinsi dipilih = kab/kota (/geo/kabupaten/<prov>.json).
   DIBI memakai kode provinsi Papua lama (91, 94): provinsi tiap baris dicari lewat nama kab di /data/bnpb/wilayah.json.
   Rumah ibadah, fasilitas kesehatan, dan lahan (ha) dari kolom f_ibadah, f_kesehatan, lahan_ha (DIBI, ditambah sesi DIBI 23 Nov 2026). Teks data lewat textContent (h(..., {teks})).
   Baris berkunci bencana: 0 = di bawah ambang Juklak 7/2023: tidak ikut jumlah, hanya dipakai mencocokkan logbook.
   Tambahan pemilik 23 Nov 2026 ("lapisan aktif ... klik kab ... belum tercatat di DIBI ... banding tahun lalu ... unduh ... pintu BPBD"):
   - opsi.aktif() (hanya tab Dalops, data logbook staf): kab/kota yang masih berlangsung jadi titik merah di peta, daftar di rincian kab,
     dan dicocokkan ke DIBI (kab + kelompok jenis + tanggal plus minus 3 hari, sama dengan rekonsiliasi_dalops_dibi) untuk daftar Belum tercatat di DIBI.
   - banding periode sama tahun lalu dari /data/dibi_tren.json (bulan_prov, sesi DIBI): hanya bulan penuh, tingkat Indonesia dan provinsi.
   - unduh Excel (DalopsHitung.xlsx, tanpa pustaka) dan cetak A4 (window.print, kelas html.bd-cetak). */
(() => {
  "use strict";
  const {ikon, h, F, PROV} = window.Wilayah;
  /* jenis DIBI -> kelompok layar; urutan aturan penting (Banjir Lahar ke gunung api, Banjir Rob ke gelombang) */
  const ATURAN = [[/lahar|erupsi|gunung/i, "gunungapi"], [/rob|gelombang|abrasi/i, "gelombang_pasang"], [/tsunami/i, "gempabumi_tsunami"], [/gempa/i, "gempabumi"],
    [/banjir/i, "banjir"], [/longsor|gerakan tanah/i, "longsor"], [/cuaca|angin|puting|topan|siklon/i, "cuaca"], [/hutan|lahan/i, "karhutla"],
    [/kekeringan/i, "kekeringan"], [/permukiman|gedung/i, "kebakaran_permukiman"]];
  const KEL = [["banjir", "Banjir", "banjir"], ["cuaca", "Cuaca ekstrem", "cuaca"], ["longsor", "Tanah longsor", "longsor"], ["karhutla", "Karhutla", "karhutla"],
    ["gelombang_pasang", "Gelombang dan abrasi", "gelombang_pasang"], ["gempabumi", "Gempa bumi", "gempabumi"], ["kekeringan", "Kekeringan", "kekeringan"],
    ["gunungapi", "Erupsi gunung api", "gunungapi"], ["tsunami", "Tsunami", "tsunami"], ["kebakaran_permukiman", "Kebakaran permukiman", "kebakaran_permukiman"], ["lainnya", "Lainnya", "lainnya"]];
  const kelompok = j => { for (const [re, k] of ATURAN) if (re.test(j)) return k === "gempabumi_tsunami" ? (/gempa/i.test(j) ? "gempabumi" : "tsunami") : k; return "lainnya"; };
  /* nama kab dinormalkan: DIBI "Kota Adm. Jakarta Barat", geo "Kota Administrasi Jakarta Barat" */
  const ALIAS = {kotapadangsidempuan: "kotapadangsidimpuan"};
  const norm = s => { const n = String(s || "").toLowerCase().replace(/kep\./g, "kepulauan ").replace(/administrasi|adm\.|kab\./g, "").replace(/\bdan\b/g, "").replace(/[^a-z]/g, ""); return ALIAS[n] || n; };
  const CADANG_PROV = {fakfak: "92"};   // tidak ada di wilayah.json
  /* rentang kelas peta sama dengan gis.bnpb.go.id, warna dari token tema */
  const KELAS = [[0, "0", "--line"], [1, "1 sampai 50", "--ok"], [51, "51 sampai 150", "--warn"], [151, "Lebih dari 150", "--bad"]];
  const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const tgl = s => { const [y, m, d] = s.split("-"); return `${+d} ${BLN[m - 1]} ${y}`; };
  const tglPendek = s => { const [, m, d] = s.split("-"); return `${+d} ${BLN[m - 1].slice(0, 3)}`; };
  const GEO = new Map(), ambil = u => GEO.get(u) || GEO.set(u, fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(e => { GEO.delete(u); throw e; })).get(u);

  const tengah = g => { let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
    JSON.stringify(g.coordinates).replace(/\[(-?[\d.]+),(-?[\d.]+)\]/g, (_, a, b) => { a = +a; b = +b; if (a < x0) x0 = a; if (a > x1) x1 = a; if (b < y0) y0 = b; if (b > y1) y1 = b; });
    return [[x0, y0], [x1, y1]]; };
  const geser = (t, n) => new Date(Date.parse(t + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const BLN3 = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const persen = (kini, lalu) => !lalu ? null : Math.round((kini - lalu) / lalu * 100);
  const kataUbah = p => p == null ? "tanpa pembanding" : p === 0 ? "sama" : (p > 0 ? "naik " : "turun ") + F(Math.abs(p)) + " persen";
  const waLink = (teks, label) => h("a", {class: "bd-wa", href: "https://wa.me/?text=" + encodeURIComponent(teks), target: "_blank", rel: "noopener"}, ikon("lanjut"), h("span", {teks: label}));

  async function siapkan() {
    const [d, w] = await Promise.all([ambil("/data/dibi_kejadian.json"), ambil("/data/bnpb/wilayah.json")]);
    const provNama = new Map(); for (const x of w.kab) { const k = norm(x.nama); provNama.set(k, [...(provNama.get(k) || []), x.prov]); }
    const kabDaftar = new Map();   // prov -> Map(kunci kab -> nama)
    const baris = d.kejadian.map(x => {
      const n = norm(x.kab), cal = provNama.get(n) || [], prov = cal.includes(x.prov_kode) ? x.prov_kode : cal.length === 1 ? cal[0] : CADANG_PROV[n] || x.prov_kode;
      if (!kabDaftar.has(prov)) kabDaftar.set(prov, new Map()); kabDaftar.get(prov).set(n, x.kab);
      return {...x, prov, kabN: n, kel: kelompok(x.jenis)};
    });
    return {d, baris, kabDaftar};
  }

  function jumlah(baris) {
    const per = Object.fromEntries(KEL.map(([k]) => [k, 0])), s = {total: 0};
    for (const x of baris) { if (x.bencana === 0) continue; per[x.kel] += x.kejadian; s.total += x.kejadian; for (const k of ["meninggal", "hilang", "luka", "terdampak", "mengungsi", "rr_berat", "rr_sedang", "rr_ringan", "terendam", "f_pendidikan", "f_kantor", "jembatan", "f_umum", "f_ibadah", "f_kesehatan", "lahan_ha"]) s[k] = (s[k] || 0) + (x[k] || 0); }
    return {per, s};
  }

  /* kartu melayang bisa digeser lewat judulnya (aturan pemilik: panel di atas peta wajib bisa ditarik), hanya layar lebar;
     tetap di dalam bingkai peta, klik ganda judul mengembalikan ke tempat asal */
  function geserKartu(k, bingkai) {
    const pegang = k.querySelector("h3"), LEBAR = matchMedia("(min-width: 1101px)"); let mulai = null;
    pegang.classList.add("bd-pegang"); pegang.title = "Geser kartu; klik ganda untuk mengembalikan";
    pegang.addEventListener("pointerdown", e => { if (!LEBAR.matches || e.button) return; const r = k.getBoundingClientRect(), b = bingkai.getBoundingClientRect();
      mulai = {x: e.clientX, y: e.clientY, l: r.left - b.left, t: r.top - b.top, w: r.width, h: r.height, bw: b.width, bh: b.height}; pegang.setPointerCapture(e.pointerId); });
    pegang.addEventListener("pointermove", e => { if (!mulai) return;
      const l = Math.max(0, Math.min(mulai.l + e.clientX - mulai.x, mulai.bw - mulai.w)), t = Math.max(0, Math.min(mulai.t + e.clientY - mulai.y, mulai.bh - 40));
      Object.assign(k.style, {left: l + "px", top: t + "px", right: "auto"}); });
    const lepas = () => { mulai = null; }; pegang.addEventListener("pointerup", lepas); pegang.addEventListener("pointercancel", lepas);
    pegang.addEventListener("dblclick", () => { k.style.left = k.style.top = k.style.right = ""; });
  }

  async function pasang(wadah, opsi = {}) {
    wadah.replaceChildren(h("p", {class: "lb-p", teks: "Memuat data bencana…"}));
    let D; try { D = await siapkan(); } catch (e) { wadah.replaceChildren(h("p", {class: "lb-p", teks: "Data bencana gagal dimuat. Muat ulang halaman ini."})); return; }
    const q = new URLSearchParams(location.search), awalTahun = D.d.sampai.slice(0, 4) + "-01-01";
    const BAKU = {dari: awalTahun < D.d.dari ? D.d.dari : awalTahun, sampai: D.d.sampai, prov: "", kab: ""};
    const st = {dari: q.get("dari") || BAKU.dari, sampai: q.get("sampai") || BAKU.sampai, prov: q.get("prov") || "", kab: q.get("kab") || "", jenis: ""};
    if (/^\d/.test(st.kab) && !st.prov) st.prov = st.kab.slice(0, 2);
    const css = getComputedStyle(document.documentElement), kuas = document.createElement("canvas").getContext("2d", {willReadFrequently: true});
    /* token tema berupa oklch, MapLibre hanya paham rgb: warnai satu piksel lalu baca kembali */
    const warna = n => { kuas.clearRect(0, 0, 1, 1); kuas.fillStyle = css.getPropertyValue(n).trim(); kuas.fillRect(0, 0, 1, 1); const [r, g, b, a] = kuas.getImageData(0, 0, 1, 1).data; return `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`; };

    /* ---------- kerangka: peta + kartu melayang ---------- */
    const elTotal = h("b", {class: "bd-total-n"}), elWil = h("span", {class: "bd-total-wil"}), elBand = h("span", {class: "bd-total-band"}), elAkt = h("span", {class: "bd-total-akt", hidden: true});
    const kJenis = h("ul", {class: "bd-jenis", "aria-label": "Jumlah kejadian per jenis bencana"});
    const kotakJenis = h("section", {class: "bd-kartu bd-k-jenis"}, h("h3", {teks: "Kejadian per jenis bencana"}), kJenis);
    const kotakTotal = h("section", {class: "bd-kartu bd-k-total"}, h("h3", {teks: "Jumlah kejadian bencana"}), elTotal, elWil, elBand, elAkt);
    const angkaBesar = (ik, label) => { const n = h("b"); return [h("div", {class: "bd-ang"}, h("i", null, ikon(ik)), n, h("span", {teks: label})), n]; };
    const A = {}; const baris = (...xs) => xs.map(([k, ik, l]) => { const [e, n] = angkaBesar(ik, l); A[k] = n; return e; });
    const elPer = h("span", {class: "bd-periode"}), elBandD = h("div", {class: "bd-banding"});
    const kotakDampak = h("section", {class: "bd-kartu bd-k-dampak"}, h("div", {class: "bd-kepala"}, h("h3", {teks: "Dampak bencana"}), elPer),
      h("p", {class: "bd-sub", teks: "Korban"}), h("div", {class: "bd-grid4"}, ...baris(["meninggal", "peringatan", "Meninggal"], ["hilang", "tunggu", "Hilang"], ["luka", "obat", "Luka-luka"], ["mengungsi", "ungsi", "Mengungsi"])),
      h("p", {class: "bd-sub", teks: "Terdampak"}), h("div", {class: "bd-grid4 bd-lebar"}, ...baris(["terdampak", "sosial", "Jiwa menderita"], ["terendam", "banjir", "Rumah terendam"], ["lahan_ha", "gambut", "Lahan terdampak (ha)"])), elBandD);
    const kotakRusak = h("section", {class: "bd-kartu bd-k-rusak"}, h("h3", {teks: "Kerusakan"}),
      h("p", {class: "bd-sub", teks: "Rumah"}), h("div", {class: "bd-grid4"}, ...baris(["rr_ringan", "rumah", "Rusak ringan"], ["rr_sedang", "rumah", "Rusak sedang"], ["rr_berat", "rumah", "Rusak berat"], ["rr_total", "rumah", "Total rusak"])),
      h("p", {class: "bd-sub", teks: "Fasilitas"}), h("div", {class: "bd-grid4 bd-grid3"}, ...baris(["f_pendidikan", "data", "Pendidikan"], ["f_kantor", "wilayah", "Kantor"], ["jembatan", "akses", "Jembatan"], ["f_ibadah", "huntara", "Rumah ibadah"], ["f_kesehatan", "obat", "Fasilitas kesehatan"], ["f_umum", "material", "Fasilitas umum"])));
    A.rr_total.parentElement.classList.add("bd-ang-total");

    /* filter: panel tersembunyi di pojok peta (pola gis.bnpb.go.id), Terapkan / Atur ulang / Tutup */
    const iDari = h("input", {type: "date", id: "bdDari", min: D.d.dari, max: D.d.sampai}), iSampai = h("input", {type: "date", id: "bdSampai", min: D.d.dari, max: D.d.sampai});
    const sProv = h("select", {id: "bdProv"}, h("option", {value: "", teks: "Semua provinsi"}),
      ...Object.entries(PROV).sort((a, b) => a[1].localeCompare(b[1], "id")).map(([k, n]) => h("option", {value: k, teks: n})));
    const sKab = h("select", {id: "bdKab"});
    const isiKab = () => { const m = D.kabDaftar.get(sProv.value); sKab.disabled = !m;
      sKab.replaceChildren(h("option", {value: "", teks: m ? "Semua kab/kota" : "Pilih provinsi dulu"}), ...(m ? [...m].sort((a, b) => a[1].localeCompare(b[1], "id")).map(([k, n]) => h("option", {value: k, teks: n})) : [])); };
    sProv.addEventListener("change", isiKab);
    const pesanF = h("p", {class: "bd-galat", role: "alert"});
    const bTerap = h("button", {type: "button", class: "bd-btn bd-utama", teks: "Terapkan"}), bUlang = h("button", {type: "button", class: "bd-btn", teks: "Atur ulang"}), bTutup = h("button", {type: "button", class: "bd-btn", teks: "Tutup"});
    const panelF = h("div", {class: "bd-filter", id: "bdFilter", hidden: true, role: "group", "aria-label": "Filter data"},
      h("label", {for: "bdDari", teks: "Tanggal awal"}), iDari, h("label", {for: "bdSampai", teks: "Tanggal akhir"}), iSampai,
      h("label", {for: "bdProv", teks: "Provinsi"}), sProv, h("label", {for: "bdKab", teks: "Kabupaten/kota"}), sKab, pesanF,
      h("div", {class: "bd-filter-aksi"}, bTerap, bUlang, bTutup));
    const nFilter = h("b", {class: "bd-n", hidden: true});
    const bFilter = h("button", {type: "button", class: "bd-btn-ikon", "aria-expanded": "false", "aria-controls": "bdFilter"}, ikon("daftar"), h("span", {teks: "Filter"}), nFilter);
    const isiForm = () => { iDari.value = st.dari; iSampai.value = st.sampai; sProv.value = st.prov; isiKab(); sKab.value = st.kab; pesanF.textContent = ""; };
    const buka = jadi => { panelF.hidden = !jadi; bFilter.setAttribute("aria-expanded", String(jadi)); if (jadi) { isiForm(); iDari.focus(); } else bFilter.focus({preventScroll: true}); };
    bFilter.addEventListener("click", () => buka(panelF.hidden));
    bTutup.addEventListener("click", () => buka(false));
    panelF.addEventListener("keydown", e => { if (e.key === "Escape") buka(false); });
    bUlang.addEventListener("click", () => { Object.assign(st, BAKU, {jenis: ""}); isiForm(); terap(true); });
    bTerap.addEventListener("click", () => {
      if (!iDari.value || !iSampai.value) { pesanF.textContent = "Isi tanggal awal dan tanggal akhir."; return; }
      if (iDari.value > iSampai.value) { pesanF.textContent = "Tanggal awal harus sebelum tanggal akhir."; return; }
      Object.assign(st, {dari: iDari.value, sampai: iSampai.value, prov: sProv.value, kab: sKab.value}); buka(false); terap(true); });

    /* unduh untuk rapat: Excel (semua lembar) atau cetak A4 */
    const mUnduh = h("div", {class: "bd-menu", id: "bdUnduh", hidden: true, role: "group", "aria-label": "Unduh"},
      h("button", {type: "button", "data-u": "xlsx"}, ikon("unduh"), h("span", {teks: "Excel"})), h("button", {type: "button", "data-u": "cetak"}, ikon("cetak"), h("span", {teks: "Cetak A4"})));
    const bUnduh = h("button", {type: "button", class: "bd-btn-ikon bd-btn-terang", "aria-expanded": "false", "aria-controls": "bdUnduh"}, ikon("unduh"), h("span", {teks: "Unduh"}));
    const tutupUnduh = () => { mUnduh.hidden = true; bUnduh.setAttribute("aria-expanded", "false"); };
    bUnduh.addEventListener("click", e => { e.stopPropagation(); mUnduh.hidden = !mUnduh.hidden; bUnduh.setAttribute("aria-expanded", String(!mUnduh.hidden)); });
    document.addEventListener("click", e => { if (!mUnduh.contains(e.target) && e.target !== bUnduh) tutupUnduh(); });
    mUnduh.addEventListener("click", e => { const b = e.target.closest("[data-u]"); if (!b) return; tutupUnduh(); b.dataset.u === "xlsx" ? unduhExcel() : cetak(); });
    const jejak = h("nav", {class: "bd-jejak", "aria-label": "Tingkat wilayah"});
    const alat = h("div", {class: "dl-peta-alat bd-alat"}, h("div", {class: "bd-unduh"}, bUnduh, mUnduh), bFilter);   // kelas dl-peta-alat: tab Dalops menaruh pemilih jenis bencana di sini
    const legenda = h("div", {class: "bd-legenda", "aria-label": "Legenda jumlah kejadian"}, ...KELAS.map(([, t, v]) => h("span", {"data-w": v}, h("i"), t)),
      opsi.aktif ? h("span", {class: "bd-leg-akt"}, h("i"), "Masih berlangsung") : null);
    /* rincian kab/kota: muncul saat satu kab dipilih (klik peta atau filter) */
    const kotakRinci = h("section", {class: "bd-kartu bd-k-rinci", hidden: true, "aria-live": "polite"});
    /* kejadian logbook yang belum ada di DIBI: hanya bila opsi.aktif (staf) */
    const kotakBelum = h("section", {class: "bd-kartu bd-k-belum", hidden: true});
    const judulCetak = h("h2", {class: "bd-cetak-judul"});
    const tip = h("div", {class: "bd-tip", hidden: true, role: "status"});
    const kanvas = h("div", {class: "bd-kanvas"});
    const peta = h("div", {class: "bd-peta"}, kanvas, jejak, alat, panelF, kotakJenis, kotakTotal, kotakRinci, legenda, tip);
    wadah.replaceChildren(h("div", {class: "bd-wadah"}, judulCetak, peta, h("div", {class: "bd-bawah"}, kotakDampak, kotakRusak), kotakBelum));
    [kotakJenis, kotakTotal].forEach(k => geserKartu(k, peta));

    /* ---------- peta ---------- */
    let M = null, siapPeta = null, idSorot = null;
    let bingkaiAkhir = [[94.8, -11.2], [141.2, 6.2]], lebarFit = 0;
    /* peta bisa lahir di panel yang belum berukuran (tab Dalops): ukur ulang tiap kali wadahnya berubah, dan bingkai ulang
       bila bingkai terakhir dihitung saat peta masih sempit (pemilik 23 Nov 2026: peta tampil kecil dan terlalu jauh) */
    const bingkai = (b, durasi = 600) => { bingkaiAkhir = b; lebarFit = kanvas.clientWidth; if (M && lebarFit > 200) M.fitBounds(b, {padding: ruang(), duration: durasi}); };
    const ruang = () => innerWidth > 1100 ? {top: 70, bottom: 56, left: 340, right: 250} : 24;   // kartu melayang menutup tepi peta di layar lebar
    if (window.maplibregl) {
      M = new maplibregl.Map({container: kanvas, style: "https://tiles.openfreemap.org/styles/positron", bounds: [[94.8, -11.2], [141.2, 6.2]], fitBoundsOptions: {padding: ruang()},
        minZoom: 2, maxZoom: 12, dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true},
        preserveDrawingBuffer: true, canvasContextAttributes: {preserveDrawingBuffer: true}});   // cetak A4 memotret kanvas WebGL
      M.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right"); M.touchZoomRotate.disableRotation();
      new ResizeObserver(() => { if (!kanvas.clientWidth) return; M.resize(); if (Math.abs(kanvas.clientWidth - lebarFit) > 80) bingkai(bingkaiAkhir, 0); }).observe(kanvas);
      siapPeta = new Promise(r => M.on("load", () => {
        for (const l of M.getStyle().layers) if (l.type === "symbol" && /country|state/.test(l.id)) M.setLayoutProperty(l.id, "visibility", "none");   // nama negara dan provinsi dasar peta bertumpuk dengan pewarnaan
        M.addSource("w", {type: "geojson", data: {type: "FeatureCollection", features: []}, promoteId: "id"});
        const isi = ["step", ["get", "n"], warna("--line")]; for (const [b, , v] of KELAS.slice(1)) isi.push(b, warna(v));
        M.addLayer({id: "w-isi", type: "fill", source: "w", paint: {"fill-color": isi, "fill-opacity": ["case", ["boolean", ["feature-state", "sorot"], false], .95, .78]}});
        M.addLayer({id: "w-garis", type: "line", source: "w", paint: {"line-color": ["case", ["boolean", ["feature-state", "sorot"], false], warna("--ink"), warna("--card")], "line-width": ["case", ["boolean", ["feature-state", "sorot"], false], 2, .7]}});
        M.addLayer({id: "w-pilih", type: "line", source: "w", filter: ["==", ["get", "pilih"], 1], paint: {"line-color": warna("--ink"), "line-width": 2.5}});
        /* kejadian masih berlangsung (logbook Dalops): titik merah bercincin di tengah provinsi atau kab, angka = kab/kota */
        M.addSource("akt", {type: "geojson", data: {type: "FeatureCollection", features: []}});
        M.addLayer({id: "akt-cincin", type: "circle", source: "akt", paint: {"circle-radius": ["+", 11, ["*", 2, ["sqrt", ["get", "n"]]]], "circle-color": warna("--bad"), "circle-opacity": .22}});
        M.addLayer({id: "akt-titik", type: "circle", source: "akt", paint: {"circle-radius": ["+", 7, ["sqrt", ["get", "n"]]], "circle-color": warna("--bad"), "circle-stroke-color": warna("--card"), "circle-stroke-width": 2}});
        M.addLayer({id: "akt-n", type: "symbol", source: "akt", filter: [">", ["get", "n"], 1], layout: {"text-field": ["to-string", ["get", "n"]], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-allow-overlap": true},
          paint: {"text-color": warna("--card")}});
        r(); }));
      const sorot = id => { if (idSorot != null) M.setFeatureState({source: "w", id: idSorot}, {sorot: false}); idSorot = id; if (id != null) M.setFeatureState({source: "w", id}, {sorot: true}); };
      M.on("mousemove", "w-isi", e => { const f = e.features[0]; if (!f) return; sorot(f.id); M.getCanvas().style.cursor = "pointer";
        const p = f.properties, top = JSON.parse(p.top || "[]");
        const akt = JSON.parse(p.akt || "[]");
        tip.replaceChildren(h("b", {teks: p.nama}), h("span", {teks: F(p.n) + " kejadian"}), ...top.map(([k, n]) => h("small", {teks: `${KEL.find(x => x[0] === k)[1]}: ${F(n)}`})),
          ...(akt.length ? [h("span", {class: "bd-tip-akt", teks: "Masih berlangsung: " + akt.join(", ")})] : []));
        tip.hidden = false; const lebar = peta.clientWidth; tip.style.left = Math.min(e.point.x + 14, lebar - 220) + "px"; tip.style.top = (e.point.y + 14) + "px"; });
      M.on("mouseleave", "w-isi", () => { sorot(null); tip.hidden = true; M.getCanvas().style.cursor = ""; });
      M.on("click", "w-isi", e => { const p = e.features[0]?.properties; if (!p) return;
        if (!st.prov) Object.assign(st, {prov: p.id, kab: ""}); else st.kab = st.kab === p.kode ? "" : p.kode;
        terap(true); });
    } else kanvas.append(h("p", {class: "lb-p", teks: "Peta gagal dimuat. Angka di bawah tetap berlaku."}));

    /* ---------- hitung dan gambar ---------- */
    let tingkatGeo = null;
    /* ringkas kejadian aktif per wilayah: "banjir di 2 kab/kota" (provinsi) atau "banjir sejak 3 Nov" (kab) */
    const ringkasAkt = (xs, perKab) => { const m = new Map(); for (const x of xs) { const a = m.get(x.kata) || new Set(); a.add(perKab ? x.mulai : x.kabN); m.set(x.kata, a); }
      return [...m].map(([k, v]) => perKab ? `${k} sejak ${tglPendek([...v].sort()[0])}` : `${k} di ${F(v.size)} kab/kota`); };
    async function gambar(rows, akt) {
      if (!M) return; await siapPeta;
      const fitur = [], titik = [];
      const kelAkt = kunci => { const m = new Map(); for (const x of akt) { const k = kunci(x); m.set(k, [...(m.get(k) || []), x]); } return m; };
      if (!st.prov) {
        const g = await ambil("/geo/provinsi.json"), per = new Map();
        for (const x of rows) { const a = per.get(x.prov) || {n: 0, kel: {}}; a.n += x.kejadian; a.kel[x.kel] = (a.kel[x.kel] || 0) + x.kejadian; per.set(x.prov, a); }
        const ak = kelAkt(x => x.prov);
        g.features.forEach(f => { const k = f.properties.kode, a = per.get(k) || {n: 0, kel: {}}, xa = ak.get(k) || [];
          fitur.push({type: "Feature", properties: {id: k, kode: k, nama: PROV[k] || k, n: a.n, top: JSON.stringify(Object.entries(a.kel).sort((x, y) => y[1] - x[1]).slice(0, 3)), akt: JSON.stringify(ringkasAkt(xa, false))}, geometry: f.geometry});
          if (xa.length) { const [[x0, y0], [x1, y1]] = tengah(f.geometry); titik.push({type: "Feature", properties: {n: new Set(xa.map(x => x.kabN)).size}, geometry: {type: "Point", coordinates: [(x0 + x1) / 2, (y0 + y1) / 2]}}); } });
      } else {
        let g; try { g = await ambil(`/geo/kabupaten/${st.prov}.json`); } catch (e) { g = {features: []}; }
        const per = new Map();
        for (const x of rows) { const a = per.get(x.kabN) || {n: 0, kel: {}}; a.n += x.kejadian; a.kel[x.kel] = (a.kel[x.kel] || 0) + x.kejadian; per.set(x.kabN, a); }
        const ak = kelAkt(x => x.kabN);
        g.features.forEach((f, i) => { const kn = norm(f.properties.kab), a = per.get(kn) || {n: 0, kel: {}}, xa = ak.get(kn) || [];
          fitur.push({type: "Feature", properties: {id: st.prov + "-" + i, kode: kn, nama: f.properties.kab, n: a.n, pilih: st.kab === kn ? 1 : 0, top: JSON.stringify(Object.entries(a.kel).sort((x, y) => y[1] - x[1]).slice(0, 3)), akt: JSON.stringify(ringkasAkt(xa, true))}, geometry: f.geometry});
          if (xa.length) { const [[x0, y0], [x1, y1]] = tengah(f.geometry); titik.push({type: "Feature", properties: {n: 1}, geometry: {type: "Point", coordinates: [(x0 + x1) / 2, (y0 + y1) / 2]}}); } });
      }
      M.getSource("w").setData({type: "FeatureCollection", features: fitur});
      M.getSource("akt").setData({type: "FeatureCollection", features: titik});
      const kunci = st.prov || "id";
      if (kunci !== tingkatGeo) { tingkatGeo = kunci;
        if (!st.prov) bingkai([[94.8, -11.2], [141.2, 6.2]]);
        else if (fitur.length) { const b = tengah({coordinates: fitur.map(f => f.geometry.coordinates)}); if (b[0][0] < b[1][0]) bingkai(b); } }
    }

    /* ---------- data tambahan yang datang belakangan: logbook aktif (staf) dan tren bulanan (banding) ---------- */
    let AKT = [], TREN = null;
    if (opsi.aktif) opsi.aktif().then(xs => { AKT = (xs || []).filter(x => (x.kab_kode || "").includes("|")).map(x => { const [pv, nm] = x.kab_kode.split("|"); return {...x, prov: pv, kabN: norm(nm), namaKab: nm}; }); terap(false); }).catch(() => {});
    ambil("/data/dibi_tren.json").then(t => { TREN = t; terap(false); }).catch(() => {});
    const diWil = x => (!st.prov || x.prov === st.prov) && (!st.kab || x.kabN === st.kab);

    /* banding periode sama tahun lalu: bulan penuh di dalam rentang, sumber bulan_prov (DIBI is_bencana) supaya kedua tahun sebanding */
    function banding() {
      if (!TREN) return null;
      if (st.kab) return {catatan: "Banding tahun lalu tersedia di tingkat Indonesia dan provinsi"};
      const [y0, m0, d0] = st.dari.split("-").map(Number), akhirBulan = geser(st.sampai, 1).slice(8) === "01";
      let [y1, m1] = st.sampai.split("-").map(Number); if (!akhirBulan) { m1--; if (!m1) { m1 = 12; y1--; } }
      let a = y0 * 100 + m0; if (d0 !== 1) a = m0 === 12 ? (y0 + 1) * 100 + 1 : a + 1;
      const b = y1 * 100 + m1; if (a > b || Math.floor(a / 100) !== Math.floor(b / 100)) return {catatan: "Banding tahun lalu perlu minimal satu bulan penuh dalam satu tahun"};
      const K = TREN.kolom_bulan, iB = K.indexOf("bulan"), iK = K.indexOf("kategori"), iP = K.indexOf("prov"), ukur = ["kejadian", "mdh", "luka", "terdampak", "rumah"].map(k => K.indexOf(k));
      const jum = (lo, hi) => { const t = [0, 0, 0, 0, 0]; for (const r of TREN.bulan_prov) { if (r[iB] < lo || r[iB] > hi || (st.prov && r[iP] !== st.prov) || (st.jenis && kelompok(TREN.kategori[r[iK]]) !== st.jenis)) continue; ukur.forEach((i, j) => { t[j] += r[i] || 0; }); } return t; };
      const kini = jum(a, b), lalu = jum(a - 100, b - 100), th = Math.floor(a / 100), lbl = `${BLN3[a % 100 - 1]}${a === b ? "" : " sampai " + BLN3[b % 100 - 1]}`;
      return {label: lbl, th, kini, lalu, sementara: th >= +String(TREN.sementara || 9999)};
    }

    /* kejadian logbook yang belum ada di DIBI: kab sama, kelompok jenis sama, tanggal DIBI di [mulai - 3, terakhir + 3]. Diberi jeda 3 hari sejak mulai supaya BPBD sempat mengentri. */
    function belumDibi() {
      const hariIni = AKT.reduce((m, x) => x.hari > m ? x.hari : m, "");
      const indeks = new Map(); for (const x of D.baris) { const k = x.prov + "|" + x.kabN + "|" + x.kel; indeks.set(k, [...(indeks.get(k) || []), x.tanggal]); }
      return AKT.filter(x => diWil(x) && (!st.jenis || x.kel === st.jenis) && x.mulai && geser(x.mulai, 3) <= hariIni && x.mulai >= D.d.dari)
        .filter(x => { const lo = geser(x.mulai, -3), hi = geser(x.terakhir || x.mulai, 3); return !(indeks.get(x.prov + "|" + x.kabN + "|" + x.kel) || []).some(t => t >= lo && t <= hi); })
        .sort((a, b) => a.mulai.localeCompare(b.mulai));
    }
    const pesanTagihDibi = x => `Yth. rekan BPBD ${x.nama}. Pusdalops BNPB mencatat ${x.kata} di ${x.nama} sejak ${tgl(x.mulai)}, kabar terakhir ${tgl(x.terakhir || x.mulai)}. ` +
      `Kejadian ini belum kami temukan di DIBI (dibi.bnpb.go.id). Mohon dientri ke DIBI beserta data korban, pengungsi, dan kerusakannya. Terima kasih.`;

    function gambarBelum() {
      if (!opsi.aktif || !AKT.length) { kotakBelum.hidden = true; return; }
      const xs = belumDibi(); kotakBelum.hidden = false;
      const kepala = h("div", {class: "bd-kepala"}, h("h3", null, ikon("kurang"), h("span", {teks: "Belum tercatat di DIBI"})), h("span", {class: "bd-pil", teks: F(xs.length) + " kejadian"}));
      if (!xs.length) { kotakBelum.replaceChildren(kepala, h("p", {class: "bd-kosong", teks: "Semua kejadian logbook di wilayah ini sudah ada padanannya di DIBI."})); return; }
      const th = (t, judul) => h("th", {scope: "col", teks: t, title: judul || null});
      const tabel = h("table", {class: "ad-tabel bd-tabel"}, h("thead", null, h("tr", null, th("Kab/kota"), th("Provinsi"), th("Jenis"), th("Mulai", "Tanggal pertama di logbook Pusdalops"),
        th("Kabar terakhir"), th("Umur", "Hari sejak mulai sampai hari logbook terakhir"), th("Status"), th("Kirim", "Minta BPBD mengentri ke DIBI lewat WhatsApp"))),
        h("tbody", null, ...xs.map(x => h("tr", null, h("td", null, h("b", {teks: x.nama})), h("td", {teks: PROV[x.prov] || x.prov}), h("td", {teks: x.kata}), h("td", {teks: tglPendek(x.mulai)}),
          h("td", {teks: tglPendek(x.terakhir || x.mulai)}), h("td", {class: "n", teks: F(Math.round((Date.parse(x.hari) - Date.parse(x.mulai)) / 864e5)) + " hari"}),
          h("td", {teks: x.surut ? x.ya : x.tidak}), h("td", null, waLink(pesanTagihDibi(x), "Tagih"))))));
      kotakBelum.replaceChildren(kepala, h("div", {class: "ad-tabel-wadah bd-tabel-wadah"}, tabel));
    }

    /* rincian satu kab/kota: tren 12 bulan, kejadian terakhir, masih berlangsung, kirim ringkasan */
    function gambarRinci(kabNama, s) {
      if (!st.kab) { kotakRinci.hidden = true; return; }
      const semua = D.baris.filter(x => x.bencana !== 0 && x.prov === st.prov && x.kabN === st.kab && (!st.jenis || x.kel === st.jenis));
      const bulan = []; for (let i = 11; i >= 0; i--) { const d = new Date(Date.parse(D.d.sampai.slice(0, 7) + "-01T00:00:00Z")); d.setUTCMonth(d.getUTCMonth() - i); bulan.push(d.toISOString().slice(0, 7)); }
      const nB = bulan.map(b => semua.filter(x => x.tanggal.startsWith(b)).reduce((t, x) => t + x.kejadian, 0)), maks = Math.max(1, ...nB);
      const tren = h("div", {class: "bd-tren", role: "img", "aria-label": "Kejadian per bulan, 12 bulan terakhir"}, ...bulan.map((b, i) => {
        const e = h("span", {class: "bd-tren-b", title: `${BLN3[+b.slice(5) - 1]} ${b.slice(0, 4)}: ${F(nB[i])} kejadian`}, h("i"), h("small", {teks: BLN3[+b.slice(5) - 1].slice(0, 1)}));
        e.querySelector("i").style.blockSize = (nB[i] / maks * 100) + "%"; return e; }));
      const akhir = semua.slice().sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 5);
      const dampakSingkat = x => [x.meninggal && `${F(x.meninggal)} meninggal`, x.mengungsi && `${F(x.mengungsi)} mengungsi`, (x.rr_berat || 0) + (x.rr_sedang || 0) + (x.rr_ringan || 0) && `${F((x.rr_berat || 0) + (x.rr_sedang || 0) + (x.rr_ringan || 0))} rumah rusak`, x.terendam && `${F(x.terendam)} rumah terendam`].filter(Boolean).join(", ");
      const akt = AKT.filter(x => !x.surut && x.prov === st.prov && x.kabN === st.kab && (!st.jenis || x.kel === st.jenis));
      const ringkas = `Ringkasan kejadian bencana ${kabNama}, ${tgl(st.dari)} sampai ${tgl(st.sampai)} (DIBI BNPB):\n` +
        `${F(s.total)} kejadian. Meninggal ${F(s.meninggal || 0)}, hilang ${F(s.hilang || 0)}, luka ${F(s.luka || 0)}, mengungsi ${F(s.mengungsi || 0)}. ` +
        `Rumah rusak ${F((s.rr_ringan || 0) + (s.rr_sedang || 0) + (s.rr_berat || 0))}, terendam ${F(s.terendam || 0)}.` +
        (akt.length ? `\nMasih berlangsung menurut Pusdalops BNPB: ${akt.map(x => `${x.kata} sejak ${tgl(x.mulai)}`).join("; ")}.` : "");
      const tutup = h("button", {type: "button", class: "bd-tutup", "aria-label": "Tutup rincian"}, "×");
      tutup.addEventListener("click", () => { st.kab = ""; terap(true); });
      kotakRinci.replaceChildren(h("div", {class: "bd-kepala"}, h("h3", {teks: kabNama}), tutup), h("p", {class: "bd-rinci-prov", teks: PROV[st.prov] || ""}),
        h("p", {class: "bd-sub", teks: "Kejadian per bulan"}), tren,
        h("p", {class: "bd-sub", teks: "Kejadian terakhir"}), akhir.length ? h("ul", {class: "bd-daftar"}, ...akhir.map(x => h("li", null, h("b", {teks: tglPendek(x.tanggal)}), h("span", {teks: x.jenis}), dampakSingkat(x) ? h("small", {teks: dampakSingkat(x)}) : null)))
          : h("p", {class: "bd-kosong", teks: "Tidak ada kejadian tercatat dalam 365 hari terakhir."}),
        ...(opsi.aktif ? [h("p", {class: "bd-sub", teks: "Masih berlangsung"}), akt.length ? h("ul", {class: "bd-daftar bd-daftar-akt"}, ...akt.map(x => h("li", null, h("b", {teks: x.kata}),
          h("span", {teks: `sejak ${tglPendek(x.mulai)}, kabar terakhir ${tglPendek(x.terakhir)}`}), x.wa ? waLink(x.wa, "Minta pembaruan") : null)))
          : h("p", {class: "bd-kosong", teks: "Tidak ada kejadian yang masih berlangsung di logbook."})] : []),
        waLink(ringkas, "Kirim ringkasan lewat WhatsApp"));
      kotakRinci.hidden = false;
      if (innerWidth > 1100) kotakRinci.style.top = (kotakTotal.offsetTop + kotakTotal.offsetHeight + 12) + "px";
    }

    /* ---------- unduh ---------- */
    let terakhir = null;   // {rows, s, per, akt, kabNama} hasil terap terakhir, dipakai unduh dan cetak
    function unduhExcel() {
      const X = window.DalopsHitung?.xlsx; if (!X || !terakhir) return alert("Pembuat Excel belum termuat. Muat ulang halaman ini.");
      const {rows, s, per, kabNama} = terakhir, wil = kabNama || (st.prov ? PROV[st.prov] : "Indonesia");
      const ring = [["Wilayah", wil], ["Periode", `${tgl(st.dari)} sampai ${tgl(st.sampai)}`], ["Jenis", st.jenis ? KEL.find(x => x[0] === st.jenis)[1] : "Semua"], ["Sumber", "DIBI BNPB, kejadian di atas ambang Juklak 7/2023"],
        ["Jumlah kejadian", s.total], ...[["Meninggal", "meninggal"], ["Hilang", "hilang"], ["Luka-luka", "luka"], ["Mengungsi", "mengungsi"], ["Jiwa menderita", "terdampak"], ["Rumah terendam", "terendam"],
          ["Lahan terdampak (ha)", "lahan_ha"], ["Rumah rusak ringan", "rr_ringan"], ["Rumah rusak sedang", "rr_sedang"], ["Rumah rusak berat", "rr_berat"], ["Fasilitas pendidikan rusak", "f_pendidikan"],
          ["Kantor rusak", "f_kantor"], ["Jembatan rusak", "jembatan"], ["Rumah ibadah rusak", "f_ibadah"], ["Fasilitas kesehatan rusak", "f_kesehatan"], ["Fasilitas umum rusak", "f_umum"]].map(([t, k]) => [t, s[k] || 0])];
      const KOL = ["kejadian", "meninggal", "hilang", "luka", "mengungsi", "terdampak", "rr_berat", "rr_sedang", "rr_ringan", "terendam"];
      const perWil = new Map(); for (const x of rows) { if (x.bencana === 0) continue; const k = st.prov ? x.kab : (PROV[x.prov] || x.prov), a = perWil.get(k) || Object.fromEntries(KOL.map(c => [c, 0])); for (const c of KOL) a[c] += x[c] || 0; perWil.set(k, a); }
      const lembar = [{nama: "Ringkasan", kepala: ["Butir", "Nilai"], baris: ring},
        {nama: "Per jenis", kepala: ["Jenis bencana", "Kejadian"], baris: KEL.map(([k, t]) => [t, per[k] || 0])},
        {nama: st.prov ? "Per kab-kota" : "Per provinsi", kepala: [st.prov ? "Kab/kota" : "Provinsi", "Kejadian", "Meninggal", "Hilang", "Luka", "Mengungsi", "Menderita", "Rusak berat", "Rusak sedang", "Rusak ringan", "Terendam"],
          baris: [...perWil].sort((a, b) => b[1].kejadian - a[1].kejadian).map(([k, a]) => [k, ...KOL.map(c => a[c])])},
        {nama: "Kejadian", kepala: ["Tanggal", "Jenis", "Provinsi", "Kab/kota", "Kejadian", "Meninggal", "Hilang", "Luka", "Mengungsi", "Menderita", "Rusak berat", "Rusak sedang", "Rusak ringan", "Terendam"],
          baris: rows.filter(x => x.bencana !== 0).map(x => [x.tanggal, x.jenis, PROV[x.prov] || x.prov, x.kab, ...KOL.map(c => x[c] || 0)])}];
      if (opsi.aktif && AKT.length) {
        lembar.push({nama: "Masih berlangsung", kepala: ["Kab/kota", "Provinsi", "Jenis", "Mulai", "Kabar terakhir"], baris: AKT.filter(x => !x.surut && diWil(x)).map(x => [x.nama, PROV[x.prov] || x.prov, x.kata, x.mulai, x.terakhir])});
        lembar.push({nama: "Belum di DIBI", kepala: ["Kab/kota", "Provinsi", "Jenis", "Mulai", "Kabar terakhir", "Status"], baris: belumDibi().map(x => [x.nama, PROV[x.prov] || x.prov, x.kata, x.mulai, x.terakhir, x.surut ? x.ya : x.tidak])});
      }
      const nama = ["data-bencana", wil, st.dari, st.sampai].join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
      const a = h("a", {href: URL.createObjectURL(new Blob([X(lembar)], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})), download: nama + ".xlsx"});
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }
    /* cetak A4: hanya bagian ini yang tampil (data_bencana.css @media print), peta diukur ulang lalu ditunggu diam sebelum dialog cetak */
    function cetak() {
      const html = document.documentElement; html.classList.add("bd-cetak");
      const lepas = () => { html.classList.remove("bd-cetak"); M?.resize(); removeEventListener("afterprint", lepas); };
      addEventListener("afterprint", lepas);
      if (!M) return print();
      let jadi = false; const go = () => { if (jadi) return; jadi = true; print(); };
      requestAnimationFrame(() => { M.resize(); M.once("idle", go); setTimeout(go, 1500); });
    }

    function terap(simpanUrl) {
      const kabNama = st.kab ? D.kabDaftar.get(st.prov)?.get(st.kab) || AKT.find(x => x.kabN === st.kab)?.namaKab || q.get("kab") : null;
      const pilihWil = D.baris.filter(x => x.tanggal >= st.dari && x.tanggal <= st.sampai && (!st.prov || x.prov === st.prov) && (!st.kab || x.kabN === st.kab));
      const rows = st.jenis ? pilihWil.filter(x => x.kel === st.jenis) : pilihWil;
      const {per} = jumlah(pilihWil), {s} = jumlah(rows), maks = Math.max(1, ...Object.values(per));
      const akt = AKT.filter(x => !x.surut && diWil(x) && (!st.jenis || x.kel === st.jenis));
      terakhir = {rows, s, per, kabNama};
      /* daftar jenis: klik = tampilkan jenis itu saja di peta dan angka dampak; klik lagi = semua */
      kJenis.replaceChildren(...KEL.filter(([k]) => k !== "lainnya" || per.lainnya).map(([k, t, ik]) => {
        const b = h("button", {type: "button", "aria-pressed": String(st.jenis === k), disabled: per[k] ? null : true},
          h("i", null, ikon(ik)), h("span", {class: "bd-j-nama", teks: t}), h("b", {teks: F(per[k])}), h("span", {class: "bd-j-batang"}, h("span")));
        b.querySelector(".bd-j-batang > span").style.inlineSize = (per[k] / maks * 100) + "%";
        b.addEventListener("click", () => { st.jenis = st.jenis === k ? "" : k; terap(false); });
        return h("li", null, b); }));
      kotakJenis.classList.toggle("bd-saring", !!st.jenis);
      elTotal.textContent = F(s.total);
      elWil.textContent = [st.jenis ? KEL.find(x => x[0] === st.jenis)[1] : null, kabNama || (st.prov ? PROV[st.prov] : "Indonesia")].filter(Boolean).join(", ");
      elPer.textContent = `${tgl(st.dari)} sampai ${tgl(st.sampai)}`;
      judulCetak.textContent = `Data Bencana Indonesia, ${elWil.textContent}, ${elPer.textContent}`;
      elAkt.hidden = !opsi.aktif || !AKT.length;
      elAkt.textContent = akt.length ? `${F(new Set(akt.map(x => x.prov + x.kabN)).size)} kab/kota masih berlangsung` : "Tidak ada kejadian yang masih berlangsung";
      elAkt.classList.toggle("bd-nol", !akt.length);
      /* banding tahun lalu: satu baris di kartu jumlah, empat butir di kartu dampak */
      const bd = banding();
      elBand.textContent = !bd || bd.catatan ? "" : `${kataUbah(persen(bd.kini[0], bd.lalu[0]))} dari ${F(bd.lalu[0])} (${bd.label} ${bd.th - 1})`;
      elBand.dataset.arah = bd?.kini ? Math.sign(bd.kini[0] - bd.lalu[0]) : "";
      elBandD.replaceChildren(...(!bd ? [] : bd.catatan ? [h("p", {class: "bd-kosong", teks: bd.catatan})] : [
        h("p", {class: "bd-sub", teks: `${bd.label} ${bd.th}${bd.sementara ? " (sementara)" : ""} dibanding ${bd.label} ${bd.th - 1}`}),
        h("div", {class: "bd-band-grid"}, ...[["Kejadian", 0], ["Meninggal dan hilang", 1], ["Luka-luka", 2], ["Menderita dan mengungsi", 3], ["Rumah rusak", 4]].map(([t, i]) => {
          const p = persen(bd.kini[i], bd.lalu[i]);
          return h("div", {class: "bd-band", "data-arah": p == null ? "" : String(Math.sign(p)), title: `${bd.th}: ${F(bd.kini[i])}, ${bd.th - 1}: ${F(bd.lalu[i])}`},
            h("span", {teks: t}), h("b", {teks: F(bd.kini[i])}), h("small", {teks: kataUbah(p)})); }))]));
      for (const k of Object.keys(A)) if (k !== "rr_total") A[k].textContent = F(s[k] || 0);
      A.rr_total.textContent = F((s.rr_ringan || 0) + (s.rr_sedang || 0) + (s.rr_berat || 0));
      /* jejak wilayah: Indonesia > provinsi > kab, tiap tingkat bisa diklik naik */
      const lv = [["Indonesia", () => Object.assign(st, {prov: "", kab: ""})]];
      if (st.prov) lv.push([PROV[st.prov] || st.prov, () => { st.kab = ""; }]);
      if (kabNama) lv.push([kabNama, null]);
      jejak.replaceChildren(...lv.map(([t, f], i) => i === lv.length - 1 ? h("span", {"aria-current": "location", teks: t})
        : (() => { const b = h("button", {type: "button", teks: t}); b.addEventListener("click", () => { f(); terap(true); }); return b; })()));
      const nf = [st.dari !== BAKU.dari || st.sampai !== BAKU.sampai, !!st.prov, !!st.kab].filter(Boolean).length;
      nFilter.hidden = !nf; nFilter.textContent = String(nf);
      if (simpanUrl && opsi.url !== false) { const u = new URL(location.href);
        for (const [k, v] of [["dari", st.dari !== BAKU.dari ? st.dari : ""], ["sampai", st.sampai !== BAKU.sampai ? st.sampai : ""], ["prov", st.prov], ["kab", st.kab ? (D.baris.find(x => x.kabN === st.kab && x.prov === st.prov)?.kab_kode || kabNama || "") : ""]]) v ? u.searchParams.set(k, v) : u.searchParams.delete(k);
        history.replaceState(history.state, "", u); }
      gambar(rows, akt);
      gambarRinci(kabNama || "Kab/kota terpilih", s);
      gambarBelum();
    }
    /* ?kab=73.17 (kode DIBI) -> kunci nama */
    if (st.kab && /^\d/.test(st.kab)) { const x = D.baris.find(y => y.kab_kode === st.kab); st.kab = x ? x.kabN : ""; if (x) st.prov = x.prov; }
    else if (st.kab) st.kab = norm(st.kab);   // ?kab=Bulukumba (tautan dari /instansi)
    terap(false);
    return {segar: () => M?.resize()};
  }

  window.DataBencana = {pasang, kelompok, norm};
})();
