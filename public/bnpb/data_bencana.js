/* Data Bencana Indonesia (pemilik 23 Nov 2026: "Dalops BNPB agar dibuat gini", contoh gis.bnpb.go.id, "bisa ada filter gini juga";
   lalu "Bagusin. Jelek banget", "Buat kaya model dashboard kita normalnya gimana": panel di peta bergaya /lapor/meja).
   Satu modul untuk dua tempat:
   - tab pertama /bnpb/dalops: DataBencana.pasang(panel, {aktif}) lengkap (filter, Ringkasan, rincian kab, Dampak, Kerusakan, Belum di DIBI, unduh).
   - halaman /bnpb/data-bencana dan /instansi/data-bencana (kerangka milik sesi DIBI): pasang(el, {tanam: true, ubah}) menggambar peta dan panelnya saja;
     kerangka mengatur keadaan lewat k.atur({dari, sampai, prov, kab, jenis}) dan menerima ubah(info) tiap kali keadaan berubah. Jangan panggil atur di dalam ubah.
   Data: /data/dibi_kejadian.json (DIBI 365 hari, per kab per hari). Baris berkunci bencana: 0 = di bawah ambang Juklak 7/2023: tidak ikut jumlah,
   hanya dipakai mencocokkan logbook. Kolom yang tidak ada di data (d.kolom) tampil "–", tidak pernah 0.
   Peta: provinsi (/geo/provinsi.json); provinsi dipilih = kab/kota (/geo/kabupaten/<prov>.json). DIBI memakai kode provinsi Papua lama (91, 94):
   provinsi tiap baris dicari lewat nama kab di /data/bnpb/wilayah.json.
   opsi.aktif() (tab Dalops saja, logbook staf): kab/kota masih berlangsung jadi titik merah, daftar di rincian kab, dan dicocokkan ke DIBI
   (kab + kelompok jenis + tanggal plus minus 3 hari) untuk kartu Rekonsiliasi tiga sumber; opsi.lapor() menambah Lapor Bencana terverifikasi BPBD.
   Banding periode sama tahun lalu dari /data/dibi_tren.json (bulan_prov, sesi DIBI): hanya bulan penuh, tingkat Indonesia dan provinsi.
   Unduh Excel (DalopsHitung.xlsx, tanpa pustaka) dan cetak A4 (window.print, kelas html.bd-cetak). Teks data lewat textContent. */
(() => {
  "use strict";
  const {ikon, h, F, PROV} = window.Wilayah;
  /* jenis DIBI -> kelompok layar; urutan aturan penting (Banjir Lahar ke gunung api, Banjir Rob ke gelombang) */
  const ATURAN = [[/lahar|erupsi|gunung/i, "gunungapi"], [/rob|gelombang|abrasi/i, "gelombang_pasang"], [/tsunami/i, "gempabumi_tsunami"], [/gempa/i, "gempabumi"],
    [/banjir/i, "banjir"], [/longsor|gerakan tanah/i, "longsor"], [/cuaca|angin|puting|topan|siklon/i, "cuaca"], [/hutan|lahan/i, "karhutla"],
    [/kekeringan/i, "kekeringan"], [/permukiman|gedung/i, "kebakaran_permukiman"],
    /* non-alam dipisah dari Lainnya agar sama dengan daftar Ringkasan kanan (kategori DIBI), pemilik 25 Nov 2026 */
    [/epidemi|wabah/i, "wabah"], [/konflik/i, "konflik_sosial"], [/gagal teknologi|kecelakaan industri|teknologi/i, "kegagalan_teknologi"]];
  /* [kunci, nama, ikon, token warna kategori di tema.css] */
  const KEL = [["banjir", "Banjir", "banjir", "--kat-banjir"], ["cuaca", "Cuaca ekstrem", "cuaca", "--kat-cuaca"], ["longsor", "Tanah longsor", "longsor", "--kat-longsor"],
    ["karhutla", "Karhutla", "karhutla", "--kat-karhutla"], ["gelombang_pasang", "Gelombang dan abrasi", "gelombang_pasang", "--kat-gelombang"], ["gempabumi", "Gempa bumi", "gempabumi", "--kat-gempa"],
    ["kekeringan", "Kekeringan", "kekeringan", "--kat-kering"], ["gunungapi", "Erupsi gunung api", "gunungapi", "--kat-erupsi"], ["tsunami", "Tsunami", "tsunami", "--kat-tsunami"],
    ["kebakaran_permukiman", "Kebakaran permukiman", "kebakaran_permukiman", "--kat-lain"], ["wabah", "Wabah penyakit", "wabah", "--kat-lain"],
    ["konflik_sosial", "Konflik sosial", "konflik_sosial", "--kat-lain"], ["kegagalan_teknologi", "Kegagalan teknologi", "kegagalan_teknologi", "--kat-lain"], ["lainnya", "Lainnya", "lainnya", "--kat-lain"]];
  const namaKel = k => KEL.find(x => x[0] === k)?.[1] || k;
  /* kelompok daftar jenis (pemilik 25 Nov 2026): bencana alam dulu, lalu bencana lainnya (permukiman, nonalam, sosial, lainnya); sama dengan bendera alam di dibi_tren.js */
  const ALAM = new Set(["banjir", "cuaca", "longsor", "karhutla", "gelombang_pasang", "gempabumi", "kekeringan", "gunungapi", "tsunami"]);
  const kelompok = j => { for (const [re, k] of ATURAN) if (re.test(j)) return k === "gempabumi_tsunami" ? (/gempa/i.test(j) ? "gempabumi" : "tsunami") : k; return "lainnya"; };
  /* nama kab dinormalkan: DIBI "Kota Adm. Jakarta Barat", geo "Kota Administrasi Jakarta Barat" */
  const ALIAS = {kotapadangsidempuan: "kotapadangsidimpuan"};
  /* lambang daerah (pemilik 25 Nov 2026), dipakai kartu tooltip dan kartu rincian kab/kota (daftar peringkat tanpa lambang, pemilik 25 Nov 2026):
     provinsi /lambang/provinsi/<kode>.png; kab/kota lewat /lambang/kabkota.json (kunci "prov|nama", dicocokkan dengan norm), tanpa lambang kab: lambang provinsinya.
     Elemen gambar disimpan per alamat dan kelas supaya tidak dibuat ulang tiap gerak tetikus; gagal muat disembunyikan. */
  let LAMB = null; const lambangImg = new Map();
  fetch("/lambang/kabkota.json").then(r => r.json()).then(d => { LAMB = new Map(Object.entries(d).map(([k, v]) => { const [pv, nm] = k.split("|"); return [pv + "|" + norm(nm), v]; })); }).catch(() => {});
  const srcLambang = (prov, nama) => { const slug = nama ? LAMB?.get(prov + "|" + norm(nama)) : null; return slug ? `/lambang/kabkota/${slug}.png` : `/lambang/provinsi/${prov}.png`; };
  const gbrLambang = (src, kls) => { const kunci = kls + " " + src; let img = lambangImg.get(kunci);
    if (!img) { img = h("img", {class: kls, alt: "", src, decoding: "async"}); img.addEventListener("error", () => { img.style.visibility = "hidden"; }, {once: true}); lambangImg.set(kunci, img); }
    return img; };
  const norm = s => { const n = String(s || "").toLowerCase().replace(/kep\./g, "kepulauan ").replace(/administrasi|adm\.|kab\./g, "").replace(/\bdan\b/g, "").replace(/[^a-z]/g, ""); return ALIAS[n] || n; };
  const CADANG_PROV = {fakfak: "92"};   // tidak ada di wilayah.json
  /* skala warna berurutan satu rona (pemilik: bukan hijau-kuning-merah polos); batas bawah tiap kelas per tingkat peta */
  const BATAS = {prov: [1, 20, 50, 100, 200], kab: [1, 3, 6, 12, 25]};
  /* per 100 ribu penduduk (pemilik 23 Nov 2026, lewat sesi DIBI: "supaya provinsi kecil yang rawan tidak tenggelam oleh Jawa"); kira-kira kuintil data Nov 2026 */
  const BATAS_LAJU = {prov: [0.01, 0.6, 1, 2, 3], kab: [0.01, 0.6, 1.5, 3, 7]};
  const F1 = v => Number(v).toLocaleString("id-ID", {maximumFractionDigits: v < 10 ? 1 : 0});
  const RONA = [.16, .34, .52, .72, 1];   // campuran --card -> --brand2 -> --brand
  const KOLOM = ["meninggal", "hilang", "luka", "terdampak", "mengungsi", "rr_berat", "rr_sedang", "rr_ringan", "terendam", "f_pendidikan", "f_kantor", "jembatan", "f_umum", "f_ibadah", "f_kesehatan", "lahan_ha"];
  const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const BLN3 = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tgl = s => { const [y, m, d] = s.split("-"); return `${+d} ${BLN[m - 1]} ${y}`; };
  const tglPendek = s => { const [, m, d] = s.split("-"); return `${+d} ${BLN3[m - 1]}`; };
  const geser = (t, n) => new Date(Date.parse(t + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  /* tanggal dari luar (URL, kerangka): "YYYY" atau "YYYY-MM-DD"; yang lain null (bug pemilik 23 Nov 2026: ?dari=2015 jadi "NaN undefined 2015") */
  const bacaTgl = (v, akhir) => { v = String(v || "").trim(); if (/^\d{4}$/.test(v)) return v + (akhir ? "-12-31" : "-01-01");
    return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z")) ? v : null; };
  const tengah = g => { let x0 = 180, x1 = -180, y0 = 90, y1 = -90;
    JSON.stringify(g.coordinates).replace(/\[(-?[\d.]+),(-?[\d.]+)\]/g, (_, a, b) => { a = +a; b = +b; if (a < x0) x0 = a; if (a > x1) x1 = a; if (b < y0) y0 = b; if (b > y1) y1 = b; });
    return [[x0, y0], [x1, y1]]; };
  const persen = (kini, lalu) => !lalu ? null : Math.round((kini - lalu) / lalu * 100);
  const kataUbah = p => p == null ? "tanpa pembanding" : p === 0 ? "sama" : (p > 0 ? "naik " : "turun ") + F(Math.abs(p)) + " persen";
  /* logo WhatsApp (path Simple Icons, sama dengan dalops.js dan public/inti/alarm.js), pemilik 25 Nov 2026 "jadi logo WA" */
  const ikonWA = () => { const sv = document.createElementNS("http://www.w3.org/2000/svg", "svg"); sv.setAttribute("viewBox", "0 0 24 24"); sv.setAttribute("aria-hidden", "true"); sv.setAttribute("class", "bd-wa-ikon");
    const pa = document.createElementNS("http://www.w3.org/2000/svg", "path"); pa.setAttribute("d", "M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41"); sv.appendChild(pa); return sv; };
  const waLink = (teks, label) => h("a", {class: "bd-wa", href: "https://wa.me/?text=" + encodeURIComponent(teks), target: "_blank", rel: "noopener"}, ikonWA(), h("span", {teks: label}));
  const GEO = new Map(), ambil = u => GEO.get(u) || GEO.set(u, fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(e => { GEO.delete(u); throw e; })).get(u);

  async function siapkan() {
    const [d, w] = await Promise.all([ambil("/data/dibi_kejadian.json"), ambil("/data/bnpb/wilayah.json")]);
    const provNama = new Map(); for (const x of w.kab) { const k = norm(x.nama); provNama.set(k, [...(provNama.get(k) || []), x.prov]); }
    const kabDaftar = new Map();   // prov -> Map(kunci kab -> nama)
    const baris = d.kejadian.map(x => {
      const n = norm(x.kab), cal = provNama.get(n) || [], prov = cal.includes(x.prov_kode) ? x.prov_kode : cal.length === 1 ? cal[0] : CADANG_PROV[n] || x.prov_kode;
      if (!kabDaftar.has(prov)) kabDaftar.set(prov, new Map()); kabDaftar.get(prov).set(n, x.kab);
      return {...x, prov, kabN: n, kel: kelompok(x.jenis)};
    });
    return {d, baris, kabDaftar, provNama, kolomAda: new Set(d.kolom || [])};
  }

  function jumlah(baris) {
    const per = Object.fromEntries(KEL.map(([k]) => [k, 0])), s = {total: 0};
    for (const x of baris) { if (x.bencana === 0) continue; per[x.kel] += x.kejadian; s.total += x.kejadian; for (const k of KOLOM) s[k] = (s[k] || 0) + (x[k] || 0); }
    return {per, s};
  }

  /* panel di atas peta bisa digeser lewat kepalanya (aturan pemilik: panel di atas peta wajib bisa ditarik), hanya layar lebar;
     tetap di dalam bingkai peta, klik ganda kepala mengembalikan ke tempat asal */
  function geserPanel(k, pegang, bingkai) {
    if (pegang.dataset.geser) return; pegang.dataset.geser = "1";
    const LEBAR = matchMedia("(min-width: 1101px)"); let mulai = null;
    pegang.classList.add("bd-pegang"); pegang.title = "Geser panel; klik ganda untuk mengembalikan";
    pegang.addEventListener("pointerdown", e => { if (!LEBAR.matches || e.button || e.target.closest("button,a")) return; const r = k.getBoundingClientRect(), b = bingkai.getBoundingClientRect();
      mulai = {x: e.clientX, y: e.clientY, l: r.left - b.left, t: r.top - b.top, w: r.width, bw: b.width, bh: b.height, gerak: false}; pegang.setPointerCapture(e.pointerId); });
    pegang.addEventListener("pointermove", e => { if (!mulai) return; if (!mulai.gerak && Math.hypot(e.clientX - mulai.x, e.clientY - mulai.y) < 4) return; mulai.gerak = true;
      const l = Math.max(0, Math.min(mulai.l + e.clientX - mulai.x, mulai.bw - mulai.w)), t = Math.max(0, Math.min(mulai.t + e.clientY - mulai.y, mulai.bh - 40));
      Object.assign(k.style, {left: l + "px", top: t + "px", right: "auto"}); });
    /* summary <details>: geser bukan klik, jadi panel tidak ikut terlipat sesudah digeser */
    pegang.addEventListener("click", e => { if (pegang.dataset.habisGeser) { e.preventDefault(); delete pegang.dataset.habisGeser; } });
    const lepas = () => { if (mulai?.gerak) pegang.dataset.habisGeser = "1"; mulai = null; }; pegang.addEventListener("pointerup", lepas); pegang.addEventListener("pointercancel", lepas);
    pegang.addEventListener("dblclick", e => { e.preventDefault(); k.style.left = k.style.top = k.style.right = ""; });
  }

  async function pasang(wadah, opsi = {}) {
    const TANAM = !!opsi.tanam;
    wadah.replaceChildren(h("p", {class: "lb-p bd-pesan", teks: "Memuat data bencana…"}));
    let D; try { D = await siapkan(); } catch (e) { wadah.replaceChildren(h("p", {class: "lb-p bd-pesan", teks: "Data bencana gagal dimuat. Muat ulang halaman ini."})); return; }
    const jepit = t => t < D.d.dari ? D.d.dari : t > D.d.sampai ? D.d.sampai : t;
    const q = TANAM ? new URLSearchParams() : new URLSearchParams(location.search), awalTahun = D.d.sampai.slice(0, 4) + "-01-01";
    const BAKU = {dari: jepit(awalTahun), sampai: D.d.sampai, prov: "", kab: "", jenis: ""};
    /* st.jenis: kelompok dipisah koma, "" = semua; bisa beberapa sekaligus (pemilik 25 Nov 2026 "multiselect") */
    const jSet = (() => { let k, v; return () => k === st.jenis ? v : (k = st.jenis, v = new Set(st.jenis ? st.jenis.split(",") : [])); })(), cocokJ = kel => !st.jenis || jSet().has(kel);
    /* nama jenis terpilih untuk judul: satu atau dua disebut, lebih dari itu cukup jumlahnya (judul tidak memanjang jadi daftar) */
    const namaJ = () => { if (!st.jenis) return null; if (st.jenis === "-") return "Tidak ada jenis dipilih"; const j = st.jenis.split(","); if (j.length > 2) { const al = j.filter(k => ALAM.has(k)).length; if (al === j.length && al >= ALAM.size - 1) return "Bencana alam"; if (!al) return "Bencana lainnya"; }
      return j.length <= 2 ? j.map(namaKel).join(" dan ") : `${j.length} jenis bencana`; };
    const st = {...BAKU, ukur: "jumlah", lapis: new Set()};   // ukur: jumlah | per100; lapis: posko, rambu
    const css = getComputedStyle(document.documentElement), kuas = document.createElement("canvas").getContext("2d", {willReadFrequently: true});
    /* token tema berupa oklch, MapLibre hanya paham rgb: warnai satu piksel lalu baca kembali */
    const rgba = n => { kuas.clearRect(0, 0, 1, 1); kuas.fillStyle = css.getPropertyValue(n).trim(); kuas.fillRect(0, 0, 1, 1); return [...kuas.getImageData(0, 0, 1, 1).data]; };
    const warna = n => { const [r, g, b, a] = rgba(n); return `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`; };
    const campur = (p, p2, t) => `rgb(${p.slice(0, 3).map((v, i) => Math.round(v + (p2[i] - v) * t)).join(",")})`;
    /* palet dihitung ulang saat tema berganti (event "pk-tema" dari tombol tema menu Pusdalops, QA 25 Nov 2026) */
    let cCard, cB2, cB, SKALA, TANPA;
    const hitungWarna = () => { cCard = rgba("--card"); cB2 = rgba("--brand2"); cB = rgba("--brand");
      SKALA = RONA.map(t => t <= .72 ? campur(cCard, cB2, t / .72) : campur(cB2, cB, (t - .72) / .28));
      TANPA = campur(cCard, rgba("--ink2"), .32); };   // wilayah tanpa data penduduk: abu, bukan nol
    hitungWarna();

    /* atur keadaan dari URL (bukan tanam) atau dari kerangka (atur) */
    const atur = (p, simpan) => {
      if (p.dari !== undefined) st.dari = jepit(bacaTgl(p.dari, false) || BAKU.dari);
      if (p.sampai !== undefined) st.sampai = jepit(bacaTgl(p.sampai, true) || BAKU.sampai);
      if (st.dari > st.sampai) [st.dari, st.sampai] = [st.sampai, st.dari];
      if (p.prov !== undefined) { st.prov = PROV[p.prov] ? p.prov : ""; if (p.kab === undefined) st.kab = ""; }
      if (p.kab !== undefined) { const k = String(p.kab || "");
        if (/^\d{2}\.?\d{2}$/.test(k)) { const kode = k.includes(".") ? k : k.slice(0, 2) + "." + k.slice(2), x = D.baris.find(y => y.kab_kode === kode); st.kab = x ? x.kabN : ""; if (x) st.prov = x.prov; }
        else st.kab = norm(k); }
      if (p.jenis !== undefined) st.jenis = p.jenis === "-" ? "-" : String(p.jenis || "").split(",").filter((j, i, a) => KEL.some(x => x[0] === j) && a.indexOf(j) === i).join(",");
      if (p.ukur !== undefined) st.ukur = p.ukur === "per100" ? "per100" : "jumlah";
      if (p.lapis !== undefined) { st.lapis = new Set((p.lapis || []).filter(x => x === "posko" || x === "rambu")); muatLapis(); }
      terap(simpan);
    };

    /* ---------- panel Ringkasan (kiri, gaya /lapor/meja) ---------- */
    const elTotal = h("b", {class: "bd-total-n"}), elWil = h("span", {class: "bd-total-wil"}), elPerT = h("span", {class: "bd-total-per"}), elBand = h("span", {class: "bd-total-band"}), elAkt = h("span", {class: "bd-total-akt", hidden: true});
    const kJenis = h("div", {class: "bd-rk-jenis", role: "group", "aria-label": "Saring jenis bencana"}), kPering = h("ol", {class: "bd-rk-kab"}), lPering = h("p", {class: "bd-rk-label"}), kLapis = h("div", {class: "bd-rk-lapis"});
    const ringkas = h("details", {class: "bd-ringkas", open: true}, h("summary", null, ikon("data"), h("span", {teks: "Ringkasan"})),
      h("div", {class: "bd-ringkas-isi"}, h("div", {class: "bd-rk-total"}, h("span", {class: "bd-rk-label", teks: "Jumlah kejadian bencana"}), h("span", {class: "bd-total-baris"}, elTotal, h("span", {teks: "kejadian"})), elWil, elPerT, elBand, elAkt),
        kJenis, lPering, kPering, kLapis));

    /* ---------- kartu Dampak dan Kerusakan (di luar peta; tidak dipakai mode tanam) ---------- */
    const A = {}; const ubin = (...xs) => xs.map(([k, ik, l]) => { const n = h("b"); A[k] = n; return h("div", {class: "bd-ang"}, h("i", null, ikon(ik)), n, h("span", {teks: l})); });
    const elPer = h("span", {class: "bd-periode"}), elBandD = h("div", {class: "bd-banding"});
    const kotakDampak = h("section", {class: "bd-kartu bd-k-dampak"}, h("div", {class: "bd-kepala"}, h("h3", null, ikon("personel"), h("span", {teks: "Dampak bencana"})), elPer),
      h("p", {class: "bd-sub", teks: "Korban"}), h("div", {class: "bd-grid4"}, ...ubin(["meninggal", "peringatan", "Meninggal"], ["hilang", "tunggu", "Hilang"], ["luka", "obat", "Luka-luka"], ["mengungsi", "ungsi", "Mengungsi"])),
      h("p", {class: "bd-sub", teks: "Terdampak"}), h("div", {class: "bd-grid4 bd-lebar"}, ...ubin(["terdampak", "sosial", "Jiwa menderita"], ["terendam", "banjir", "Rumah terendam"], ["lahan_ha", "gambut", "Lahan terdampak (ha)"])), elBandD);
    const kotakRusak = h("section", {class: "bd-kartu bd-k-rusak"}, h("div", {class: "bd-kepala"}, h("h3", null, ikon("rumah"), h("span", {teks: "Kerusakan"}))),
      h("p", {class: "bd-sub", teks: "Rumah"}), h("div", {class: "bd-grid4 bd-rumah"}, ...ubin(["rr_ringan", "rumah", "Rusak ringan"], ["rr_sedang", "rumah", "Rusak sedang"], ["rr_berat", "rumah", "Rusak berat"], ["rr_total", "rumah", "Total rusak"])),
      h("p", {class: "bd-sub", teks: "Fasilitas"}), h("div", {class: "bd-grid4 bd-grid3"}, ...ubin(["f_pendidikan", "data", "Pendidikan"], ["f_kantor", "wilayah", "Kantor"], ["jembatan", "akses", "Jembatan"], ["f_ibadah", "huntara", "Rumah ibadah"], ["f_kesehatan", "obat", "Fasilitas kesehatan"], ["f_umum", "material", "Fasilitas umum"])));
    A.rr_total.parentElement.classList.add("bd-ang-total");

    /* ---------- filter periode dan wilayah (bukan tanam; kerangka tanam punya pengaturnya sendiri) ---------- */
    /* periode = satu tombol yang membuka kalender inti mode rentang (pemilik 25 Nov 2026 "date pickernya bagusin"; sama dengan /lapor/meja), bukan input tanggal bawaan peramban.
       Angka per hari = baris DIBI di atas ambang (bencana !== 0) sesuai wilayah dan jenis terpilih; hanya tanggal di cakupan data yang bisa dipilih. */
    const fT = {dari: "", sampai: ""}, BLN_P = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], tglP = t => `${+t.slice(8)} ${BLN_P[+t.slice(5, 7) - 1]} ${t.slice(0, 4)}`;
    const bPeriode = h("button", {type: "button", class: "bd-periode", id: "bdPeriode", "aria-haspopup": "dialog"});
    const labelP = () => { const t = fT.dari && fT.sampai ? (fT.dari === fT.sampai ? tglP(fT.dari) : `${tglP(fT.dari)} – ${tglP(fT.sampai)}`) : "Pilih tanggal";
      bPeriode.replaceChildren(ikon("kalender"), h("span", {teks: t})); bPeriode.setAttribute("aria-label", "Periode: " + t); };
    let kalP = null;
    const muatKal = () => window.Kalender ? Promise.resolve() : kalP ||= new Promise((ok, gagal) => {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/inti/kalender.css"; document.head.append(l);
      const sk = document.createElement("script"); sk.src = "/inti/kalender.js"; sk.onload = ok; sk.onerror = () => { kalP = null; gagal(); }; document.head.append(sk); });
    bPeriode.addEventListener("click", async () => { try { await muatKal(); } catch (e) { pesanF.textContent = "Kalender gagal dimuat. Muat ulang halaman ini."; return; }
      window.Kalender.buka({tombol: bPeriode, rentang: true, hariIni: D.d.sampai, terpilih: fT.dari ? [fT.dari, fT.sampai] : undefined, judul: "Pilih periode", satuan: "kejadian", awal: D.d.dari,
        ket: "Angka = kejadian DIBI hari itu.", bisa: t => t >= D.d.dari && t <= D.d.sampai, terbanyak: {judul: "Hari dengan kejadian terbanyak", n: 5},
        muat: async () => { const jumlah = {}; for (const x of D.baris) if (x.bencana !== 0 && diWil(x) && cocokJ(x.kel)) jumlah[x.tanggal] = (jumlah[x.tanggal] || 0) + 1; return {jumlah}; },
        pilih: (a, z) => { fT.dari = a; fT.sampai = z; pesanF.textContent = ""; labelP(); }}); });
    const sProv = h("select", {id: "bdProv"}, h("option", {value: "", teks: "Semua provinsi"}), ...Object.entries(PROV).sort((a, b) => a[1].localeCompare(b[1], "id")).map(([k, n]) => h("option", {value: k, teks: n})));
    const sKab = h("select", {id: "bdKab"});
    const isiKab = () => { const m = D.kabDaftar.get(sProv.value); sKab.disabled = !m;
      sKab.replaceChildren(h("option", {value: "", teks: m ? "Semua kab/kota" : "Pilih provinsi dulu"}), ...(m ? [...m].sort((a, b) => a[1].localeCompare(b[1], "id")).map(([k, n]) => h("option", {value: k, teks: n})) : [])); };
    sProv.addEventListener("change", isiKab);
    const pesanF = h("p", {class: "bd-galat", role: "alert"});
    const bTerap = h("button", {type: "button", class: "bd-btn bd-utama", teks: "Terapkan"}), bUlang = h("button", {type: "button", class: "bd-btn", teks: "Atur ulang"}), bTutup = h("button", {type: "button", class: "bd-btn", teks: "Tutup"});
    const panelF = h("div", {class: "bd-filter", id: "bdFilter", hidden: true, role: "group", "aria-label": "Filter data"},
      h("label", {for: "bdPeriode", teks: "Periode"}), bPeriode,
      h("label", {for: "bdProv", teks: "Provinsi"}), sProv, h("label", {for: "bdKab", teks: "Kabupaten/kota"}), sKab, pesanF, h("div", {class: "bd-filter-aksi"}, bTerap, bUlang, bTutup));
    const nFilter = h("b", {class: "bd-n", hidden: true});
    const bFilter = h("button", {type: "button", class: "bd-ikon-btn bd-utama-btn", "aria-expanded": "false", "aria-controls": "bdFilter"}, ikon("kalender"), h("span", {teks: "Filter"}), nFilter);
    const isiForm = () => { fT.dari = st.dari; fT.sampai = st.sampai; labelP(); sProv.value = st.prov; isiKab(); sKab.value = st.kab; pesanF.textContent = ""; };
    const buka = jadi => { panelF.hidden = !jadi; bFilter.setAttribute("aria-expanded", String(jadi)); if (jadi) { isiForm(); bPeriode.focus(); } else bFilter.focus({preventScroll: true}); };
    bFilter.addEventListener("click", () => buka(panelF.hidden));
    bTutup.addEventListener("click", () => buka(false));
    panelF.addEventListener("keydown", e => { if (e.key === "Escape") buka(false); });
    bUlang.addEventListener("click", () => { Object.assign(st, BAKU); isiForm(); terap(true); });
    bTerap.addEventListener("click", () => {
      if (!fT.dari || !fT.sampai) { pesanF.textContent = "Pilih periode dulu."; return; }
      Object.assign(st, {dari: fT.dari, sampai: fT.sampai, prov: sProv.value, kab: sKab.value}); buka(false); terap(true); });

    /* unduh untuk rapat: Excel (semua lembar) atau cetak A4 */
    const mUnduh = h("div", {class: "bd-menu", id: "bdUnduh", hidden: true, role: "group", "aria-label": "Unduh"},
      h("button", {type: "button", "data-u": "xlsx"}, ikon("unduh"), h("span", {teks: "Excel"})), h("button", {type: "button", "data-u": "cetak"}, ikon("cetak"), h("span", {teks: "Cetak A4"})));
    const bUnduh = h("button", {type: "button", class: "bd-ikon-btn", "aria-expanded": "false", "aria-controls": "bdUnduh"}, ikon("unduh"), h("span", {teks: "Unduh"}));
    const tutupUnduh = () => { mUnduh.hidden = true; bUnduh.setAttribute("aria-expanded", "false"); };
    bUnduh.addEventListener("click", e => { e.stopPropagation(); mUnduh.hidden = !mUnduh.hidden; bUnduh.setAttribute("aria-expanded", String(!mUnduh.hidden)); });
    document.addEventListener("click", e => { if (!mUnduh.contains(e.target) && !bUnduh.contains(e.target)) tutupUnduh(); });
    mUnduh.addEventListener("click", e => { const b = e.target.closest("[data-u]"); if (!b) return; tutupUnduh(); b.dataset.u === "xlsx" ? unduhExcel() : cetak(); });

    const jejak = h("nav", {class: "bd-jejak", "aria-label": "Tingkat wilayah"});
    const alat = h("div", {class: "dl-peta-alat bd-alat"}, ...(TANAM ? [] : [h("div", {class: "bd-unduh"}, bUnduh, mUnduh), bFilter]));   // kelas dl-peta-alat: tab Dalops menaruh pemilih jenis bencana di sini
    /* legenda tengah bawah = skala warna + pengatur ukuran dan lapisan (satu bilah, gaya .mj-legenda) */
    const lgSkala = h("div", {class: "bd-lg-skala"});
    const bUkur = [["jumlah", "Jumlah"], ["per100", "Per 100 ribu jiwa"]].map(([k, t]) => { const b = h("button", {type: "button", "data-ukur": k, "aria-pressed": "false", teks: t});
      b.addEventListener("click", () => { if (st.ukur === k) return; st.ukur = k; terap(false); }); return b; });
    const bLapis = [["posko", "Posko pengungsian", "tenda"], ["rambu", "Rambu evakuasi", "pin"]].map(([k, t, ik]) => { const b = h("button", {type: "button", "data-lapis": k, "aria-pressed": "false"}, ikon(ik), h("span", {teks: t}));
      b.addEventListener("click", () => { st.lapis.has(k) ? st.lapis.delete(k) : st.lapis.add(k); muatLapis(); terap(false); }); return b; });
    const legenda = h("div", {class: "bd-legenda", "aria-label": "Legenda dan lapisan peta"}, lgSkala,
      h("div", {class: "bd-lg-alat"}, h("div", {class: "bd-seg", role: "group", "aria-label": "Ukuran warna peta"}, ...bUkur), h("hr"), ...bLapis));
    const tip = h("div", {class: "bd-tip", hidden: true, role: "status"});
    const kanvas = h("div", {class: "bd-kanvas"});
    const kotakRinci = h("section", {class: "bd-rinci", hidden: true, "aria-live": "polite"});
    const kotakBelum = h("section", {class: "bd-kartu bd-k-belum", hidden: true});
    const judulCetak = h("h2", {class: "bd-cetak-judul"});
    const peta = h("div", {class: "bd-peta"}, kanvas, h("div", {class: "bd-atas"}, jejak, alat), ...(TANAM ? [] : [panelF]), ringkas, kotakRinci, legenda, tip);
    wadah.replaceChildren(h("div", {class: "bd-wadah" + (TANAM ? " bd-tanam" : "")}, judulCetak, peta, ...(TANAM ? [] : [h("div", {class: "bd-bawah"}, kotakDampak, kotakRusak), kotakBelum])));
    geserPanel(ringkas, ringkas.querySelector("summary"), peta);

    /* ---------- peta ---------- */
    /* sorot wilayah dari luar peta (daftar peringkat, pemilik 25 Nov 2026): kode wilayah -> id fitur peta; diisi tiap peta digambar */
    let idPerKode = new Map(), sorotLuar = () => {}, elPesanJ = null;
    let M = null, siapPeta = null, idSorot = null, bingkaiAkhir = [[94.8, -11.2], [141.2, 6.2]], lebarFit = 0;
    const ruang = () => innerWidth > 1100 ? {top: 70, bottom: 60, left: 310, right: st.kab ? 340 : 40} : 24;   // panel Ringkasan dan rincian menutup tepi peta di layar lebar
    /* peta bisa lahir di panel yang belum berukuran (tab Dalops): ukur ulang tiap kali wadahnya berubah, dan bingkai ulang
       bila bingkai terakhir dihitung saat peta masih sempit (pemilik 23 Nov 2026: peta tampil kecil dan terlalu jauh) */
    const bingkai = (b, durasi = 600) => { bingkaiAkhir = b; lebarFit = kanvas.clientWidth; if (M && lebarFit > 200) M.fitBounds(b, {padding: ruang(), duration: durasi}); };
    if (window.maplibregl) {
      M = new maplibregl.Map({container: kanvas, style: "https://tiles.openfreemap.org/styles/positron", bounds: bingkaiAkhir, fitBoundsOptions: {padding: ruang()},
        minZoom: 2, maxZoom: 12, dragRotate: false, pitchWithRotate: false, attributionControl: {compact: true},
        preserveDrawingBuffer: true, canvasContextAttributes: {preserveDrawingBuffer: true}});   // cetak A4 memotret kanvas WebGL
      M.addControl(new maplibregl.NavigationControl({showCompass: false}), "bottom-right"); M.touchZoomRotate.disableRotation();
      new ResizeObserver(() => { if (!kanvas.clientWidth) return; M.resize(); if (Math.abs(kanvas.clientWidth - lebarFit) > 80) bingkai(bingkaiAkhir, 0); }).observe(kanvas);
      siapPeta = new Promise(r => M.on("load", () => {
        for (const l of M.getStyle().layers) if (l.type === "symbol" && /country|state/.test(l.id)) M.setLayoutProperty(l.id, "visibility", "none");   // nama negara dan provinsi dasar peta bertumpuk dengan pewarnaan
        M.addSource("w", {type: "geojson", data: {type: "FeatureCollection", features: []}, promoteId: "id"});
        M.addLayer({id: "w-isi", type: "fill", source: "w", paint: {"fill-color": ["coalesce", ["get", "w"], warna("--surface")], "fill-opacity": ["case", ["boolean", ["feature-state", "sorot"], false], .95, .85]}});
        M.addLayer({id: "w-garis", type: "line", source: "w", paint: {"line-color": ["case", ["boolean", ["feature-state", "sorot"], false], warna("--ink"), warna("--card")], "line-width": ["case", ["boolean", ["feature-state", "sorot"], false], 2, .8]}});
        M.addLayer({id: "w-pilih", type: "line", source: "w", filter: ["==", ["get", "pilih"], 1], paint: {"line-color": warna("--brand-accent"), "line-width": 3}});
        /* rambu evakuasi IDRIP: garis putus-putus di kab/kota yang tercakup data rambu */
        M.addLayer({id: "w-rambu", type: "line", source: "w", filter: ["==", ["get", "rambu"], 1], paint: {"line-color": warna("--ok-tx"), "line-width": 2.2, "line-dasharray": [2, 1.4]}});
        /* posko pengungsian (DIBI): titik oranye, ukuran menurut jiwa */
        M.addSource("posko", {type: "geojson", data: {type: "FeatureCollection", features: []}});
        M.addLayer({id: "posko-titik", type: "circle", source: "posko", paint: {"circle-radius": ["interpolate", ["linear"], ["sqrt", ["get", "jiwa"]], 0, 4, 10, 7, 40, 14],
          "circle-color": warna("--brand-accent"), "circle-opacity": .9, "circle-stroke-color": warna("--card"), "circle-stroke-width": 1.5}});
        /* kejadian masih berlangsung (logbook Dalops): titik merah bercincin di tengah provinsi atau kab, angka = kab/kota */
        M.addSource("akt", {type: "geojson", data: {type: "FeatureCollection", features: []}});
        M.addLayer({id: "akt-cincin", type: "circle", source: "akt", paint: {"circle-radius": ["+", 11, ["*", 2, ["sqrt", ["get", "n"]]]], "circle-color": warna("--bad"), "circle-opacity": .22}});
        M.addLayer({id: "akt-titik", type: "circle", source: "akt", paint: {"circle-radius": ["+", 7, ["sqrt", ["get", "n"]]], "circle-color": warna("--bad"), "circle-stroke-color": warna("--card"), "circle-stroke-width": 2}});
        M.addLayer({id: "akt-n", type: "symbol", source: "akt", filter: [">", ["get", "n"], 1], layout: {"text-field": ["to-string", ["get", "n"]], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-allow-overlap": true},
          paint: {"text-color": warna("--card")}});
        r(); }));
      /* lambang daerah di kepala kartu (pemilik 25 Nov 2026): provinsi /lambang/provinsi/<kode>.png, kab/kota lewat /lambang/kabkota.json
         (kunci "prov|nama", dicocokkan dengan norm); kab tanpa lambang memakai lambang provinsinya; gagal muat disembunyikan.
         Elemen gambar disimpan per alamat supaya tidak dibuat ulang tiap gerak tetikus. */
      const lambang = p => gbrLambang(st.prov ? srcLambang(st.prov, p.nama) : srcLambang(p.kode), "bd-tip-lambang");
      const sorot = id => { if (idSorot != null) M.setFeatureState({source: "w", id: idSorot}, {sorot: false}); idSorot = id; if (id != null) M.setFeatureState({source: "w", id}, {sorot: true}); };
      sorotLuar = kode => sorot(kode == null ? null : idPerKode.get(kode) ?? null);
      M.on("mousemove", "w-isi", e => { const f = e.features[0]; if (!f || e.originalEvent.bdPosko || M.queryRenderedFeatures(e.point, {layers: ["posko-titik"]}).length) return; sorot(f.id); M.getCanvas().style.cursor = "pointer";
        const p = f.properties, top = JSON.parse(p.top || "[]"), akt = JSON.parse(p.akt || "[]");
        const per100 = st.ukur === "per100", lain = top.find(([k]) => k === "lainnya")?.[1] || 0, utama = top.filter(([k]) => k !== "lainnya");
        const sisa = lain + utama.slice(4).reduce((t, [, n]) => t + n, 0), daftar = [...utama.slice(0, 4), ...(sisa ? [["lainnya", sisa]] : [])];
        /* baris jenis: ubin ikon berwarna jenis (sama dengan Ringkasan), nama, angka, batang porsi */
        const baris = ([k, n]) => { const kl = KEL.find(x => x[0] === k), w = kl?.[3] || "--kat-lain", b = h("span", {class: "bd-tip-k"}, h("span", {class: "bd-tip-ik"}, ikon(kl?.[2] || "lainnya")), h("span", {teks: namaKel(k)}), h("strong", {teks: F(n)}), h("em"));
          b.style.setProperty("--jn", `var(${w})`); b.querySelector("em").style.setProperty("--p", (p.n ? n / p.n * 100 : 0).toFixed(1) + "%"); b.querySelector("em").style.setProperty("--w", `var(${w})`); return b; };
        tip.replaceChildren(h("span", {class: "bd-tip-kepala"}, lambang(p), h("b", {teks: p.nama}), ...(p.urut ? [h("small", {class: "bd-tip-urut", teks: `Ke-${F(p.urut)} dari ${F(p.dari)}`})] : [])),
          h("span", {class: "bd-tip-angka"}, h("strong", {teks: per100 ? (p.laju != null ? F1(p.laju) : "–") : F(p.n)}),
            h("span", {teks: per100 ? (p.laju != null ? `kejadian per 100 ribu jiwa, ${F(p.n)} kejadian` : `${F(p.n)} kejadian, tanpa data penduduk`) : (p.n ? "kejadian" : "Tidak ada kejadian tercatat")})),
          ...(daftar.length ? [h("span", {class: daftar.length > 1 ? "bd-tip-rinci" : "bd-tip-satu"}, ...daftar.map(baris))] : []),
          ...(p.rambuTeks ? [h("small", {class: "bd-tip-rambu", teks: p.rambuTeks})] : []),
          ...(akt.length ? [h("span", {class: "bd-tip-akt", teks: "Masih berlangsung: " + akt.join(", ")})] : []),
          h("small", {class: "bd-tip-klik", teks: st.prov ? (st.kab === p.kode ? "Klik untuk melepas pilihan" : "Klik untuk melihat kab/kota ini") : "Klik untuk melihat kab/kota"}));
        tip.hidden = false; const lb = tip.offsetWidth, tg = tip.offsetHeight; tip.style.left = Math.max(8, Math.min(e.point.x + 16, peta.clientWidth - lb - 8)) + "px"; tip.style.top = (e.point.y + 16 + tg > peta.clientHeight ? Math.max(8, e.point.y - tg - 12) : e.point.y + 16) + "px"; });
      M.on("mouseleave", "w-isi", () => { sorot(null); tip.hidden = true; M.getCanvas().style.cursor = ""; });
      M.on("mousemove", "posko-titik", e => { const p = e.features[0]?.properties; if (!p) return; e.originalEvent.bdPosko = true;
        tip.replaceChildren(h("b", {teks: p.lokasi || "Posko pengungsian"}), h("span", {teks: `${F(p.jiwa)} jiwa mengungsi`}), h("small", {teks: [p.desa, p.kec, p.kab].filter(Boolean).join(", ")}),
          h("small", {teks: `Laporan ${p.tgl ? tglPendek(p.tgl) : "tanpa tanggal"}${p.sumber ? ", " + p.sumber : ""}`}));
        tip.hidden = false; tip.style.left = Math.min(e.point.x + 14, peta.clientWidth - tip.offsetWidth - 8) + "px"; tip.style.top = Math.min(e.point.y + 14, peta.clientHeight - tip.offsetHeight - 8) + "px"; });
      M.on("click", "w-isi", e => { const p = e.features[0]?.properties; if (!p) return;
        if (!st.prov) Object.assign(st, {prov: p.id, kab: ""}); else st.kab = st.kab === p.kode ? "" : p.kode;
        terap(true); });
    } else kanvas.append(h("p", {class: "lb-p bd-pesan", teks: "Peta gagal dimuat. Angka di panel tetap berlaku."}));

    /* ---------- gambar peta ---------- */
    const warnaN = (n, tingkat) => { if (!n) return null; let i = 0; for (const [j, b] of BATAS[tingkat].entries()) if (n >= b) i = j; return SKALA[i]; };
    const warnaL = (v, tingkat) => { if (!v) return null; let i = 0; for (const [j, b] of BATAS_LAJU[tingkat].entries()) if (v >= b) i = j; return SKALA[i]; };
    const perLaju = () => st.ukur === "per100" && PEND;
    /* nilai warna satu wilayah: jumlah, atau per 100 ribu jiwa bila ukur per100 (null = tanpa data penduduk) */
    const ukurWil = (n, jiwa, tingkat) => { if (!perLaju()) return {w: warnaN(n, tingkat), laju: null};
      if (!jiwa) return {w: TANPA, laju: null}; const laju = n / jiwa * 1e5; return {w: warnaL(laju, tingkat), laju}; };
    const teksRambu = (k, nama) => { if (!st.lapis.has("rambu") || !RAMBU?.size) return null; const a = RAMBU.get(k);
      return a ? `Rambu evakuasi IDRIP ${RAMBU.tahun}: ${F(a.n)}` : `${nama}: tidak tercakup data rambu IDRIP`; };
    const ringkasAkt = (xs, perKab) => { const m = new Map(); for (const x of xs) { const a = m.get(x.kata) || new Set(); a.add(perKab ? x.mulai : x.kabN); m.set(x.kata, a); }
      return [...m].map(([k, v]) => perKab ? `${k} sejak ${tglPendek([...v].sort()[0])}` : `${k} di ${F(v.size)} kab/kota`); };
    let tingkatGeo = null;
    async function gambar(rows, akt) {
      if (!M) return; await siapPeta;
      const fitur = [], titik = [], tingkat = st.prov ? "kab" : "prov", idBaru = new Map();
      const kel = (kunci, xs) => { const m = new Map(); for (const x of xs) { const k = kunci(x); m.set(k, [...(m.get(k) || []), x]); } return m; };
      const top = a => JSON.stringify(Object.entries(a.kel).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1]));
      const hitung = kunci => { const per = new Map(); for (const x of rows) { if (x.bencana === 0) continue; const k = kunci(x), a = per.get(k) || {n: 0, kel: {}}; a.n += x.kejadian; a.kel[x.kel] = (a.kel[x.kel] || 0) + x.kejadian; per.set(k, a); } return per; };
      const pusat = g => { const [[x0, y0], [x1, y1]] = tengah(g); return [(x0 + x1) / 2, (y0 + y1) / 2]; };
      idPerKode = idBaru;
      if (!st.prov) {
        const g = await ambil("/geo/provinsi.json"), per = hitung(x => x.prov), ak = kel(x => x.prov, akt);
        g.features.forEach(f => { const k = f.properties.kode, a = per.get(k) || {n: 0, kel: {}}, xa = ak.get(k) || [];
          const u = ukurWil(a.n, PEND?.prov.get(k), tingkat);
          let rambuTeks = null; if (st.lapis.has("rambu") && RAMBU?.size) { const xs = [...RAMBU].filter(([kk]) => kk.startsWith(k + "|")); rambuTeks = xs.length ? `Rambu evakuasi IDRIP ${RAMBU.tahun}: ${F(xs.reduce((t, [, v]) => t + v.n, 0))} di ${F(xs.length)} kab/kota` : "Tidak tercakup data rambu IDRIP"; }
          idBaru.set(k, k);
          fitur.push({type: "Feature", properties: {id: k, kode: k, nama: PROV[k] || k, n: a.n, w: u.w, laju: u.laju, rambuTeks, top: top(a), akt: JSON.stringify(ringkasAkt(xa, false))}, geometry: f.geometry});
          if (xa.length) titik.push({type: "Feature", properties: {n: new Set(xa.map(x => x.kabN)).size}, geometry: {type: "Point", coordinates: pusat(f.geometry)}}); });
      } else {
        let g; try { g = await ambil(`/geo/kabupaten/${st.prov}.json`); } catch (e) { g = {features: []}; }
        const per = hitung(x => x.kabN), ak = kel(x => x.kabN, akt);
        g.features.forEach((f, i) => { const kn = norm(f.properties.kab), a = per.get(kn) || {n: 0, kel: {}}, xa = ak.get(kn) || [];
          const u = ukurWil(a.n, PEND?.kab.get(st.prov + "|" + kn), tingkat), rk = st.prov + "|" + kn;
          idBaru.set(kn, st.prov + "-" + i);
          fitur.push({type: "Feature", properties: {id: st.prov + "-" + i, kode: kn, nama: f.properties.kab, n: a.n, w: u.w, laju: u.laju, pilih: st.kab === kn ? 1 : 0,
            rambu: st.lapis.has("rambu") && RAMBU?.has(rk) ? 1 : 0, rambuTeks: teksRambu(rk, f.properties.kab), top: top(a), akt: JSON.stringify(ringkasAkt(xa, true))}, geometry: f.geometry});
          if (xa.length) titik.push({type: "Feature", properties: {n: 1}, geometry: {type: "Point", coordinates: pusat(f.geometry)}}); });
      }
      /* peringkat wilayah menurut jumlah kejadian (atau laju per 100 ribu jiwa), hanya wilayah berkejadian */
      const nilaiUrut = f => perLaju() ? f.properties.laju : f.properties.n;
      const urut = fitur.filter(f => nilaiUrut(f) > 0).sort((a, b) => nilaiUrut(b) - nilaiUrut(a));
      urut.forEach((f, i) => { f.properties.urut = i + 1; f.properties.dari = urut.length; });
      M.getSource("w").setData({type: "FeatureCollection", features: fitur});
      M.getSource("akt").setData({type: "FeatureCollection", features: titik});
      const pos = st.lapis.has("posko") && Array.isArray(POSKO) ? POSKO.filter(x => !st.prov || x.prov === st.prov) : [];
      M.getSource("posko").setData({type: "FeatureCollection", features: pos.map(x => ({type: "Feature", properties: {jiwa: x.jiwa || 0, lokasi: x.lokasi, desa: x.desa, kec: x.kec, kab: x.kab, tgl: x.tgl, sumber: x.sumber}, geometry: {type: "Point", coordinates: [x.lng, x.lat]}}))});
      const kunci = st.prov || "id";
      if (kunci !== tingkatGeo) { tingkatGeo = kunci;
        if (!st.prov) bingkai([[94.8, -11.2], [141.2, 6.2]]);
        else if (fitur.length) { const b = tengah({coordinates: fitur.map(f => f.geometry.coordinates)}); if (b[0][0] < b[1][0]) bingkai(b); } }
    }
    function gambarLegenda() {
      const tk = st.prov ? "kab" : "prov", laju = perLaju(), b = laju ? BATAS_LAJU[tk] : BATAS[tk], kotak = (teks, warnaKotak, kls) => { const s = h("span", {class: "bd-lg-kotak" + (kls ? " " + kls : "")}, h("i"), teks); if (warnaKotak) s.querySelector("i").style.background = warnaKotak; return s; };
      const label = (x, i) => laju ? (i === 0 ? `di bawah ${F1(b[1])}` : i === b.length - 1 ? `${F1(x)} ke atas` : `${F1(x)}–${F1(b[i + 1])}`)
        : (i === b.length - 1 ? `${F(x)} ke atas` : x === b[i + 1] - 1 ? F(x) : `${F(x)}–${F(b[i + 1] - 1)}`);
      lgSkala.replaceChildren(h("b", {teks: (laju ? "Kejadian per 100 ribu jiwa, " : "Kejadian per ") + (st.prov ? "kab/kota" : "provinsi")}), kotak("0", null, "bd-lg-nol"), ...b.map((x, i) => kotak(label(x, i), SKALA[i])),
        ...(laju ? [kotak("Tanpa data penduduk", TANPA)] : []),
        ...(opsi.aktif ? [h("span", {class: "bd-lg-akt"}, h("i"), "Masih berlangsung")] : []),
        ...(st.lapis.has("posko") ? [h("span", {class: "bd-lg-posko"}, h("i"), "Posko, besar = jiwa")] : []),
        ...(st.lapis.has("rambu") ? [h("span", {class: "bd-lg-rambu"}, h("i"), "Tercakup data rambu IDRIP")] : []));
      bUkur.forEach(x => x.setAttribute("aria-pressed", String(x.dataset.ukur === st.ukur)));
      bUkur[1].disabled = !PEND; bUkur[1].title = PEND ? "" : "Data penduduk belum termuat";
      bLapis.forEach(x => x.setAttribute("aria-pressed", String(st.lapis.has(x.dataset.lapis))));
    }

    /* ---------- data yang datang belakangan: logbook aktif (staf) dan tren bulanan (banding) ---------- */
    let AKT = [], TREN = null, LAP = [];
    if (opsi.lapor) opsi.lapor().then(xs => { LAP = (xs || []).filter(x => x.prov && x.kabNama && x.pertama); terap(false); }).catch(() => {});   // gagal atau bukan staf BNPB: kolom Lapor kosong
    if (opsi.aktif) opsi.aktif().then(xs => { AKT = (xs || []).filter(x => (x.kab_kode || "").includes("|")).map(x => { const [pv, nm] = x.kab_kode.split("|"); return {...x, prov: pv, kabN: norm(nm), namaKab: nm}; }); terap(false); }).catch(() => {});
    ambil("/data/dibi_tren.json").then(t => { TREN = t; siapPend(); terap(false); }).catch(() => {});
    /* penduduk (IRBI BNPB lewat dibi_tren.json): null = tidak ada, tidak pernah 0; provinsi = jumlah kab berpenduduk */
    let PEND = null;
    function siapPend() { if (PEND || !Array.isArray(TREN?.penduduk)) return; PEND = {kab: new Map(), prov: new Map()};
      TREN.kab.forEach(([, pv, nm], i) => { const v = TREN.penduduk[i]; if (v == null) return; PEND.kab.set(pv + "|" + norm(nm), v); PEND.prov.set(pv, (PEND.prov.get(pv) || 0) + v); }); }
    /* lapisan posko dan rambu dimuat saat pertama dinyalakan */
    let POSKO = null, RAMBU = null;
    const provDariNama = Object.fromEntries([...Object.entries(PROV).map(([k, v]) => [norm(v), k]), ["daerahistimewayogyakarta", "34"], ["dkijakarta", "31"]]);
    const kabKunci = (pv, nm) => { const n = norm(nm); return pv + "|" + (D.provNama.has(n) || !D.provNama.has("kota" + n) ? n : "kota" + n); };
    function muatLapis() {
      if (st.lapis.has("posko") && !POSKO) { POSKO = []; ambil("/data/dibi_posko.json").then(d => { const K = d.kolom, i = Object.fromEntries(K.map((k, j) => [k, j]));
        POSKO = d.posko.filter(x => x[i.lat] != null && x[i.lng] != null).map(x => { const n = norm(x[i.kab]), pv = (D.provNama.get(n) || [])[0] || "";
          return {prov: pv, kabN: n, kab: x[i.kab], kec: x[i.kec], desa: x[i.desa], lokasi: x[i.lokasi], jiwa: x[i.jumlah], lat: x[i.lat], lng: x[i.lng], tgl: x[i.sumber_tgl], sumber: x[i.sumber]}; });
        POSKO.tanpaTitik = d.posko.length - POSKO.length; terap(false); }).catch(() => { POSKO = null; }); }
      if (st.lapis.has("rambu") && !RAMBU) { RAMBU = new Map(); ambil("/data/dibi_rambu.json").then(d => { const K = d.kolom, i = Object.fromEntries(K.map((k, j) => [k, j])), m = new Map();
        for (const x of d.rambu) { const pv = provDariNama[norm(x[i.provinsi])]; if (!pv) continue; const k = kabKunci(pv, x[i.kab]), a = m.get(k) || {n: 0, jenis: {}}; a.n += x[i.jumlah] || 0; const j = d.jenis[x[i.jenis]] || "Lainnya"; a.jenis[j] = (a.jenis[j] || 0) + (x[i.jumlah] || 0); m.set(k, a); }
        RAMBU = m; RAMBU.tahun = (d.catatan.match(/IDRIP (\d{4})/) || [])[1] || ""; terap(false); }).catch(() => { RAMBU = null; }); }
    }
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
      const jum = (lo, hi) => { const t = [0, 0, 0, 0, 0]; for (const r of TREN.bulan_prov) { if (r[iB] < lo || r[iB] > hi || (st.prov && r[iP] !== st.prov) || !cocokJ(kelompok(TREN.kategori[r[iK]]))) continue; ukur.forEach((i, j) => { t[j] += r[i] || 0; }); } return t; };
      const th = Math.floor(a / 100);
      return {label: `${BLN3[a % 100 - 1]}${a === b ? "" : " sampai " + BLN3[b % 100 - 1]}`, th, kini: jum(a, b), lalu: jum(a - 100, b - 100), sementara: th >= +(TREN.sementara || 9999)};
    }

    /* rekonsiliasi tiga sumber (lapor-ai LA-77): DIBI (semua baris, termasuk bencana: 0), logbook Pusdalops, Lapor Bencana terverifikasi BPBD
       (opsi.lapor, rute staf /api/lapor/meja/rekon). Kab sama, kelompok jenis sama, jendela 3 hari (rekon_tiga.js). Logbook yang mulainya
       kurang dari 3 hari lalu belum ditagih supaya BPBD sempat mengentri. Hanya baris yang perlu dilengkapi yang tampil. */
    function rekonTiga() {
      const R = window.RekonTiga; if (!R) return [];
      const hariIni = AKT.reduce((m, x) => x.hari > m ? x.hari : m, "") || new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
      const pas = x => diWil(x) && cocokJ(x.kel) && x.lo >= st.dari && x.lo <= st.sampai && x.lo >= D.d.dari;
      const dibi = D.baris.map(x => ({prov: x.prov, kabN: x.kabN, kel: x.kel, lo: x.tanggal, nama: x.kab}));
      const logbook = AKT.map(x => ({prov: x.prov, kabN: x.kabN, kel: x.kel, lo: x.mulai, hi: x.terakhir || x.mulai, nama: x.nama, kata: x.kata}));
      const lapor = LAP.map(x => { const kel = R.KEL_LAPOR[x.jenis] || "lainnya", k = kabKunci(x.prov, x.kabNama || ""); return {prov: x.prov, kabN: k.split("|")[1], kel, lo: x.pertama, hi: x.terakhir, n: x.n, nama: x.kabNama}; });
      return R.rekon({dibi, logbook, lapor}).filter(r => R.perluDilengkapi(r) && pas({...r, lo: r.mulai}) && (r.dibi || r.lapor || geser(r.mulai, 3) <= hariIni))
        .map(r => ({...r, kata: r.isi.find(x => x.kata)?.kata || namaKel(r.kel).toLowerCase()}));
    }
    const ADA = ["Ada", "Tidak ada"];
    function gambarBelum() {
      if (TANAM || !opsi.aktif || (!AKT.length && !LAP.length)) { kotakBelum.hidden = true; return; }
      const xs = rekonTiga(), R = window.RekonTiga; kotakBelum.hidden = false;
      const kepala = h("div", {class: "bd-kepala"}, h("h3", null, ikon("kurang"), h("span", {teks: "Rekonsiliasi tiga sumber"})), h("span", {class: "bd-pil", teks: F(xs.length) + " kejadian"}),
        ...(st.prov && xs.length ? [waLink(`Yth. rekan BPBD se-${PROV[st.prov] || st.prov}. Kejadian berikut belum lengkap di DIBI atau laporan harian ke Pusdalops BNPB:\n` +
          xs.map(r => `- ${r.nama}: ${r.kata}, ${r.mulai}${r.dibi ? "" : ", belum di DIBI"}${r.dibi && !r.logbook ? ", belum di laporan harian" : ""}`).join("\n") + "\nMohon dilengkapi beserta data korban, pengungsi, dan kerusakannya. Terima kasih.", "Tagih provinsi")] : []));
      if (!xs.length) { kotakBelum.replaceChildren(kepala, h("p", {class: "bd-kosong", teks: "Semua kejadian di logbook dan Lapor Bencana wilayah ini sudah ada padanannya."})); return; }
      const th = (t, judul) => h("th", {scope: "col", teks: t, title: judul || null}), ya = v => h("td", {class: v ? "bd-ada" : "bd-tiada", teks: v ? ADA[0] : ADA[1]});
      const tabel = h("table", {class: "ad-tabel bd-tabel"}, h("thead", null, h("tr", null, th("Kab/kota"), th("Provinsi"), th("Jenis"), th("Mulai", "Tanggal paling awal di sumber mana pun"), th("Akhir"),
        th("DIBI"), th("Logbook", "Logbook Pusdalops BNPB"), th("Lapor", "Laporan warga yang sudah diverifikasi BPBD wilayahnya di Lapor Bencana"), th("Kirim", "Minta BPBD melengkapi lewat WhatsApp"))),
        h("tbody", null, ...xs.map(r => h("tr", null, h("td", null, h("b", {teks: r.nama})), h("td", {teks: PROV[r.prov] || r.prov}), h("td", {teks: r.kata}), h("td", {teks: tglPendek(r.mulai)}),
          h("td", {teks: tglPendek(r.akhir)}), ya(r.dibi), ya(r.logbook), h("td", {class: r.lapor ? "bd-ada" : "bd-tiada", teks: r.lapor ? F(r.lapor) + " laporan" : ADA[1]}),
          h("td", null, waLink(R.pesanTagih(r, r.kata), "Tagih"))))));
      kotakBelum.replaceChildren(kepala, h("div", {class: "ad-tabel-wadah bd-tabel-wadah"}, tabel));
    }

    /* rincian satu kab/kota (panel kanan): angka utama, tren 12 bulan, kejadian terakhir, masih berlangsung, kirim ringkasan */
    function gambarRinci(kabNama, s) {
      if (!st.kab) { kotakRinci.hidden = true; return; }
      const semua = D.baris.filter(x => x.bencana !== 0 && x.prov === st.prov && x.kabN === st.kab && cocokJ(x.kel));
      const bulan = []; for (let i = 11; i >= 0; i--) { const d = new Date(Date.parse(D.d.sampai.slice(0, 7) + "-01T00:00:00Z")); d.setUTCMonth(d.getUTCMonth() - i); bulan.push(d.toISOString().slice(0, 7)); }
      const nB = bulan.map(b => semua.filter(x => x.tanggal.startsWith(b)).reduce((t, x) => t + x.kejadian, 0)), maks = Math.max(1, ...nB);
      const tren = h("div", {class: "bd-tren", role: "img", "aria-label": "Kejadian per bulan, 12 bulan terakhir"}, ...bulan.map((b, i) => {
        const e = h("span", {class: "bd-tren-b", title: `${BLN3[+b.slice(5) - 1]} ${b.slice(0, 4)}: ${F(nB[i])} kejadian`}, h("i"), h("small", {teks: BLN3[+b.slice(5) - 1].slice(0, 1)}));
        e.querySelector("i").style.blockSize = (nB[i] / maks * 100) + "%"; return e; }));
      const akhir = semua.slice().sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 5);
      const rr = x => (x.rr_berat || 0) + (x.rr_sedang || 0) + (x.rr_ringan || 0);
      const dampakSingkat = x => [x.meninggal && `${F(x.meninggal)} meninggal`, x.mengungsi && `${F(x.mengungsi)} mengungsi`, rr(x) && `${F(rr(x))} rumah rusak`, x.terendam && `${F(x.terendam)} rumah terendam`].filter(Boolean).join(", ");
      const akt = AKT.filter(x => !x.surut && x.prov === st.prov && x.kabN === st.kab && cocokJ(x.kel));
      const pesan = `Ringkasan kejadian bencana ${kabNama}, ${tgl(st.dari)} sampai ${tgl(st.sampai)} (DIBI BNPB):\n` +
        `${F(s.total)} kejadian. Meninggal ${F(s.meninggal || 0)}, hilang ${F(s.hilang || 0)}, luka ${F(s.luka || 0)}, mengungsi ${F(s.mengungsi || 0)}. ` +
        `Rumah rusak ${F(rr(s))}, terendam ${F(s.terendam || 0)}.` + (akt.length ? `\nMasih berlangsung menurut Pusdalops BNPB: ${akt.map(x => `${x.kata} sejak ${tgl(x.mulai)}`).join("; ")}.` : "");
      const tutup = h("button", {type: "button", class: "bd-tutup", "aria-label": "Tutup rincian"}, "×");
      tutup.addEventListener("click", () => { st.kab = ""; terap(true); });
      const kepala = h("div", {class: "bd-rinci-kepala"}, h("span", {class: "bd-rinci-nama"}, gbrLambang(srcLambang(st.prov, kabNama), "bd-rinci-lambang"), h("span", null, h("b", {teks: kabNama}), h("small", {teks: PROV[st.prov] || ""}))), tutup);
      kotakRinci.replaceChildren(kepala, h("div", {class: "bd-rinci-isi"},
        h("div", {class: "bd-rinci-angka"}, ...[["Kejadian", s.total], ["Meninggal", s.meninggal || 0], ["Mengungsi", s.mengungsi || 0], ["Rumah rusak", rr(s)]].map(([t, v]) => h("span", null, h("b", {teks: F(v)}), h("small", {teks: t})))),
        h("p", {class: "bd-rk-label", teks: "Kejadian per bulan"}), tren,
        h("p", {class: "bd-rk-label", teks: "Kejadian terakhir"}), akhir.length ? h("ul", {class: "bd-daftar"}, ...akhir.map(x => h("li", null, h("b", {teks: tglPendek(x.tanggal)}), h("span", {teks: x.jenis}), dampakSingkat(x) ? h("small", {teks: dampakSingkat(x)}) : null)))
          : h("p", {class: "bd-kosong", teks: "Tidak ada kejadian tercatat dalam 365 hari terakhir."}),
        ...(opsi.aktif ? [h("p", {class: "bd-rk-label", teks: "Masih berlangsung"}), akt.length ? h("ul", {class: "bd-daftar bd-daftar-akt"}, ...akt.map(x => h("li", null, h("b", {teks: x.kata}),
          h("span", {teks: `sejak ${tglPendek(x.mulai)}, kabar terakhir ${tglPendek(x.terakhir)}`}), x.wa ? waLink(x.wa, "Minta pembaruan") : null)))
          : h("p", {class: "bd-kosong", teks: "Tidak ada kejadian yang masih berlangsung di logbook."})] : []),
        waLink(pesan, "Kirim ringkasan lewat WhatsApp")));
      kotakRinci.hidden = false;
      geserPanel(kotakRinci, kepala, peta);
    }

    /* ---------- unduh ---------- */
    let terakhir = null;   // hasil terap terakhir, dipakai unduh dan cetak
    function unduhExcel() {
      const X = window.DalopsHitung?.xlsx; if (!X || !terakhir) return alert("Pembuat Excel belum termuat. Muat ulang halaman ini.");
      const {rows, s, per, kabNama} = terakhir, wil = kabNama || (st.prov ? PROV[st.prov] : "Indonesia"), ada = k => D.kolomAda.has(k);
      const ring = [["Wilayah", wil], ["Periode", `${tgl(st.dari)} sampai ${tgl(st.sampai)}`], ["Jenis", namaJ() || "Semua"], ["Sumber", "DIBI BNPB, kejadian di atas ambang Juklak 7/2023"],
        ["Jumlah kejadian", s.total], ...[["Meninggal", "meninggal"], ["Hilang", "hilang"], ["Luka-luka", "luka"], ["Mengungsi", "mengungsi"], ["Jiwa menderita", "terdampak"], ["Rumah terendam", "terendam"],
          ["Lahan terdampak (ha)", "lahan_ha"], ["Rumah rusak ringan", "rr_ringan"], ["Rumah rusak sedang", "rr_sedang"], ["Rumah rusak berat", "rr_berat"], ["Fasilitas pendidikan rusak", "f_pendidikan"],
          ["Kantor rusak", "f_kantor"], ["Jembatan rusak", "jembatan"], ["Rumah ibadah rusak", "f_ibadah"], ["Fasilitas kesehatan rusak", "f_kesehatan"], ["Fasilitas umum rusak", "f_umum"]].map(([t, k]) => [t, ada(k) ? s[k] || 0 : "tidak ada data"])];
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
      }
      if (opsi.aktif && (AKT.length || LAP.length)) lembar.push({nama: "Rekonsiliasi", kepala: ["Kab/kota", "Provinsi", "Jenis", "Mulai", "Akhir", "DIBI", "Logbook", "Lapor (laporan terverifikasi)"],
        baris: rekonTiga().map(r => [r.nama, PROV[r.prov] || r.prov, r.kata, r.mulai, r.akhir, r.dibi ? ADA[0] : ADA[1], r.logbook ? ADA[0] : ADA[1], r.lapor || ADA[1]])});
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

    /* ---------- terap: hitung ulang semua dari st ---------- */
    /* tema berganti: palet koroplet, garis, dan titik peta ikut token baru tanpa muat ulang */
    const ganti = () => { hitungWarna(); if (M && M.getLayer("w-isi")) {
      const cat = [["w-isi", "fill-color", ["coalesce", ["get", "w"], warna("--surface")]], ["w-garis", "line-color", ["case", ["boolean", ["feature-state", "sorot"], false], warna("--ink"), warna("--card")]],
        ["w-pilih", "line-color", warna("--brand-accent")], ["w-rambu", "line-color", warna("--ok-tx")], ["posko-titik", "circle-color", warna("--brand-accent")], ["posko-titik", "circle-stroke-color", warna("--card")],
        ["akt-cincin", "circle-color", warna("--bad")], ["akt-titik", "circle-color", warna("--bad")], ["akt-titik", "circle-stroke-color", warna("--card")], ["akt-n", "text-color", warna("--card")]];
      for (const [l, k, v] of cat) if (M.getLayer(l)) M.setPaintProperty(l, k, v); }
      if (terakhir) terap(false); };
    addEventListener("pk-tema", () => { if (wadah.isConnected) ganti(); });
    function terap(simpanUrl) {
      const kabNama = st.kab ? D.kabDaftar.get(st.prov)?.get(st.kab) || AKT.find(x => x.kabN === st.kab)?.namaKab || q.get("kab") || st.kab : null;
      const pilihWil = D.baris.filter(x => x.tanggal >= st.dari && x.tanggal <= st.sampai && diWil(x));
      const rows = st.jenis ? pilihWil.filter(x => cocokJ(x.kel)) : pilihWil;
      const {per} = jumlah(pilihWil), {s} = jumlah(rows);
      const akt = AKT.filter(x => !x.surut && diWil(x) && cocokJ(x.kel));
      terakhir = {rows, s, per, kabNama};
      const wil = kabNama || (st.prov ? PROV[st.prov] : "Indonesia"), periode = st.dari === st.sampai ? tgl(st.dari) : `${tgl(st.dari)} sampai ${tgl(st.sampai)}`;   /* satu hari: satu tanggal saja */

      /* Ringkasan: jumlah, banding, aktif, per jenis (tombol saring), peringkat wilayah */
      elTotal.textContent = F(s.total);
      /* wilayah (dan jenis terpilih) satu baris, periode baris sendiri; tanam: periode peta (data 365 hari) bisa lebih pendek dari periode kerangka */
      elWil.textContent = [namaJ(), wil].filter(Boolean).join(", "); elPerT.textContent = TANAM ? periode : ""; elPerT.hidden = !TANAM;
      const bd = banding();
      elBand.textContent = !bd || bd.catatan ? "" : `${kataUbah(persen(bd.kini[0], bd.lalu[0]))} dari ${F(bd.lalu[0])} (${bd.label} ${bd.th - 1})`;
      elBand.dataset.arah = bd?.kini ? Math.sign(bd.kini[0] - bd.lalu[0]) : "";
      elAkt.hidden = !opsi.aktif || !AKT.length;
      elAkt.textContent = akt.length ? `${F(new Set(akt.map(x => x.prov + x.kabN)).size)} kab/kota masih berlangsung` : "Tidak ada kejadian yang masih berlangsung";
      elAkt.classList.toggle("bd-nol", !akt.length);
      const pilih = jSet(); if (!elPesanJ) elPesanJ = h("p", {class: "bd-rk-pesan", role: "status", hidden: true});
      elPesanJ.textContent = "Belum ada jenis bencana yang dipilih. Pilih paling sedikit satu untuk melihat angkanya."; elPesanJ.hidden = st.jenis !== "-";
      /* judul kelompok + tombol pil "Pilih semua" / "Lepas semua" (sama dengan Ringkasan kanan). Tanpa saringan = semua terpilih.
         Lepas semua boleh sampai tidak ada jenis terpilih: st.jenis = "-" (beda dengan "" = tanpa saringan). */
      const KUNCI = KEL.map(x => x[0]), kelAda = k => k !== "lainnya" || per.lainnya;
      const simpanJ = j => { j.delete("-"); st.jenis = KUNCI.filter(kelAda).every(k => j.has(k)) ? "" : j.size ? KUNCI.filter(k => j.has(k)).join(",") : "-"; terap(false); };
      const grupJ = al => { const ks = KUNCI.filter(k => ALAM.has(k) === al && kelAda(k)), penuh = !st.jenis || ks.every(k => pilih.has(k));
        const aksi = h("button", {type: "button", class: "bd-rk-grup-b", teks: penuh ? "Lepas semua" : "Pilih semua", "aria-label": `${penuh ? "Lepas" : "Pilih"} semua ${al ? "bencana alam" : "bencana lainnya"}`});
        aksi.addEventListener("click", () => { const j = st.jenis ? new Set(jSet()) : new Set(KUNCI.filter(kelAda)); ks.forEach(k => penuh ? j.delete(k) : j.add(k)); simpanJ(j); });
        return h("div", {class: "bd-rk-grup"}, h("span", {teks: al ? "Bencana alam" : "Bencana lainnya"}), aksi); };
      kJenis.replaceChildren(...KEL.filter(([k]) => k !== "lainnya" || per.lainnya).flatMap(([k, t, ik, w], i, a) => {
        const b = h("button", {type: "button", class: "bd-rk-baris", "aria-pressed": String(pilih.has(k)), disabled: per[k] ? null : true},
          h("span", {class: "bd-rk-ik"}, ikon(ik)), h("span", {teks: t}), h("b", {teks: F(per[k])}));
        b.style.setProperty("--jn", `var(${w})`);
        /* klik menambah atau melepas satu jenis; semua terlepas = semua jenis */
        b.addEventListener("click", () => { if (!st.jenis) { st.jenis = k; return terap(false); } const j = new Set(jSet()); j.has(k) ? j.delete(k) : j.add(k); simpanJ(j); });
        const awalGrup = i === 0 ? ALAM.has(k) : !ALAM.has(k) && ALAM.has(a[i - 1][0]) ? false : null;
        return awalGrup !== null ? [grupJ(awalGrup), b] : [b]; }), elPesanJ);
      kJenis.classList.toggle("bd-saring", !!st.jenis);
      const perWil = new Map(); for (const x of rows) { if (x.bencana === 0) continue; const k = st.prov ? x.kabN : x.prov; perWil.set(k, (perWil.get(k) || 0) + x.kejadian); }
      const laju = perLaju(), jiwaWil = k => st.prov ? PEND?.kab.get(st.prov + "|" + k) : PEND?.prov.get(k);
      const nilai = laju ? [...perWil].filter(([k]) => jiwaWil(k)).map(([k, n]) => [k, n / jiwaWil(k) * 1e5]) : [...perWil];
      const atas = nilai.sort((a, b) => b[1] - a[1]).slice(0, 8), maks = atas[0]?.[1] || 1;
      lPering.textContent = (st.prov ? "Kab/kota" : "Provinsi") + (laju ? " tertinggi per 100 ribu jiwa" : " terbanyak");
      kPering.replaceChildren(...atas.map(([k, n], i) => { const nama = st.prov ? D.kabDaftar.get(st.prov)?.get(k) || k : PROV[k] || k;
        const b = h("button", {type: "button", "aria-pressed": String(st.kab === k)}, h("i"), h("em", {teks: String(i + 1)}), h("span", {teks: nama}), h("b", {teks: laju ? F1(n) : F(n)}));
        b.querySelector("i").style.inlineSize = Math.round(n / maks * 100) + "%";
        b.addEventListener("click", () => { if (st.prov) st.kab = st.kab === k ? "" : k; else Object.assign(st, {prov: k, kab: ""}); terap(true); });
        /* arahkan kursor atau fokus: batas wilayahnya tersorot di peta (garis tebal, sama dengan saat peta di-hover) */
        b.addEventListener("pointerenter", () => sorotLuar(k)); b.addEventListener("pointerleave", () => sorotLuar(null));
        b.addEventListener("focus", () => sorotLuar(k)); b.addEventListener("blur", () => sorotLuar(null));
        return h("li", null, b); }));
      if (!atas.length) kPering.replaceChildren(h("li", {class: "bd-kosong", teks: "Tidak ada kejadian pada saringan ini."}));
      /* posko dan rambu di panel Ringkasan; rambu: kab rawan lawan cakupan data IDRIP, "tidak tercakup" bukan "nol" */
      const isiLapis = [];
      if (st.lapis.has("posko") && Array.isArray(POSKO)) { const ps = POSKO.filter(x => (!st.prov || x.prov === st.prov) && (!st.kab || x.kabN === st.kab));
        isiLapis.push(h("p", {class: "bd-rk-label", teks: "Posko pengungsian (DIBI)"}), h("div", {class: "bd-rk-mini"}, h("span", null, h("b", {teks: F(ps.length)}), h("small", {teks: "lokasi"})), h("span", null, h("b", {teks: F(ps.reduce((t, x) => t + (x.jiwa || 0), 0))}), h("small", {teks: "jiwa"}))),
          ...(POSKO.tanpaTitik && !st.prov ? [h("p", {class: "bd-catat", teks: `${F(POSKO.tanpaTitik)} posko tanpa koordinat tidak tampil di peta.`})] : [])); }
      if (st.lapis.has("rambu") && RAMBU?.size) {
        const kabRawan = new Map(); for (const x of rows) { if (x.bencana === 0 || (st.prov && x.prov !== st.prov)) continue; const k = x.prov + "|" + x.kabN; kabRawan.set(k, (kabRawan.get(k) || 0) + x.kejadian); }
        const daftar = [...kabRawan].sort((a, b) => b[1] - a[1]).slice(0, 8);
        isiLapis.push(h("p", {class: "bd-rk-label", teks: "Kab/kota rawan dan rambu evakuasi"}), h("ul", {class: "bd-rk-rambu"}, ...daftar.map(([k, n]) => { const [pv, kn] = k.split("|"), a = RAMBU.get(k);
          return h("li", {class: a ? "" : "bd-luar"}, h("span", {teks: D.kabDaftar.get(pv)?.get(kn) || kn}), h("small", {teks: `${F(n)} kejadian`}), h("b", {teks: a ? `${F(a.n)} rambu` : "di luar data"})); })),
          h("p", {class: "bd-catat", teks: `Data rambu hanya mencakup ${F(RAMBU.size)} kab/kota program IDRIP ${RAMBU.tahun}. "Di luar data" berarti belum terdata, bukan tidak ada rambu.`})); }
      kLapis.replaceChildren(...isiLapis);

      /* kartu Dampak dan Kerusakan; kolom yang tidak ada di data tampil "–" */
      elPer.textContent = periode;
      judulCetak.textContent = `Data Bencana Indonesia, ${[namaJ(), wil].filter(Boolean).join(", ")}, ${periode}`;
      for (const k of Object.keys(A)) if (k !== "rr_total") { const ada = D.kolomAda.has(k); A[k].textContent = ada ? F(s[k] || 0) : "–"; A[k].parentElement.title = ada ? "" : "Belum ada di data DIBI"; }
      A.rr_total.textContent = F((s.rr_ringan || 0) + (s.rr_sedang || 0) + (s.rr_berat || 0));
      elBandD.replaceChildren(...(!bd ? [] : bd.catatan ? [h("p", {class: "bd-kosong", teks: bd.catatan})] : [
        h("p", {class: "bd-sub", teks: `${bd.label} ${bd.th}${bd.sementara ? " (sementara)" : ""} dibanding ${bd.label} ${bd.th - 1}`}),
        h("div", {class: "bd-band-grid"}, ...[["Kejadian", 0, "data"], ["Meninggal dan hilang", 1, "peringatan"], ["Luka-luka", 2, "obat"], ["Menderita dan mengungsi", 3, "ungsi"], ["Rumah rusak", 4, "rumah"]].map(([t, i, ik]) => {   // ikon sama dengan ubin Dampak (pemilik 25 Nov 2026 "kasih icon")
          const p = persen(bd.kini[i], bd.lalu[i]);
          return h("div", {class: "bd-band", "data-arah": p == null ? "" : String(Math.sign(p)), title: `${bd.th}: ${F(bd.kini[i])}, ${bd.th - 1}: ${F(bd.lalu[i])}`},
            h("span", {class: "bd-band-n"}, h("i", null, ikon(ik)), t), h("b", {teks: F(bd.kini[i])}), h("small", {teks: kataUbah(p)})); }))]));

      /* jejak wilayah: Indonesia > provinsi > kab, tiap tingkat bisa diklik naik; periode ikut di jejak supaya terbaca tanpa membuka filter */
      const lv = [["Indonesia", () => Object.assign(st, {prov: "", kab: ""})]];
      if (st.prov) lv.push([PROV[st.prov] || st.prov, () => { st.kab = ""; }]);
      if (kabNama) lv.push([kabNama, null]);
      jejak.replaceChildren(...lv.map(([t, f], i) => i === lv.length - 1 ? h("span", {"aria-current": "location", teks: t})
        : (() => { const b = h("button", {type: "button", teks: t}); b.addEventListener("click", () => { f(); terap(true); }); return b; })()),
        ...(TANAM ? [] : [h("small", {class: "bd-jejak-per", teks: periode})]));
      const nf = [st.dari !== BAKU.dari || st.sampai !== BAKU.sampai, !!st.prov, !!st.kab].filter(Boolean).length;
      nFilter.hidden = !nf; nFilter.textContent = String(nf);
      if (simpanUrl && !TANAM && opsi.url !== false) { const u = new URL(location.href);
        for (const [k, v] of [["dari", st.dari !== BAKU.dari ? st.dari : ""], ["sampai", st.sampai !== BAKU.sampai ? st.sampai : ""], ["prov", st.prov], ["kab", st.kab ? (D.baris.find(x => x.kabN === st.kab && x.prov === st.prov)?.kab_kode || kabNama || "") : ""]]) v ? u.searchParams.set(k, v) : u.searchParams.delete(k);
        history.replaceState(history.state, "", u); }
      gambarLegenda();
      gambar(rows, akt);
      gambarRinci(kabNama, s);
      gambarBelum();
      opsi.ubah?.({st: {...st, lapis: [...st.lapis]}, per, s, kolomAda: [...D.kolomAda], kabNama, banding: bd});
    }

    if (TANAM) terap(false);
    else atur({dari: q.get("dari") ?? undefined, sampai: q.get("sampai") ?? undefined, prov: q.get("prov") ?? undefined, kab: q.get("kab") ?? undefined}, false);
    return {segar: () => M?.resize(), atur: p => atur(p, false), keadaan: () => ({...st, lapis: [...st.lapis]})};
  }

  window.DataBencana = {pasang, kelompok, norm, KEL: KEL.map(([k, t, ik, w]) => ({k, nama: t, ikon: ik, warna: w}))};
})();
