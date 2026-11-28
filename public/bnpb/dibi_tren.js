/* Tren, Sebaran, dan Tabel DIBI di /bnpb/data-bencana (pemilik 23 Nov 2026: dasbor DIBI "tapi jauh lebih bagus").
   Data: /data/dibi_tren.json (scripts/umum/dibi_tren.py: tahun x kab x kategori sejak 2008, bulan x prov x kategori)
   dan /data/dibi_kejadian.json (365 hari, per kab per hari). Keduanya HANYA is_bencana = TRUE, sama dengan dasbor DIBI.
   Satu baris filter untuk tiga tab. Klik chip: status tombol berubah seketika, gambar ulang ditunda (INP).
   Warna kategori dari token --kat-* di public/inti/tema.css; teks data lewat textContent. Pasang otomatis ke #dtWadah. */
(() => {
  "use strict";
  const {h, ikon, F} = window.Wilayah;
  const NS = "http://www.w3.org/2000/svg";
  const s = (tag, att = {}, ...anak) => { const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(att)) if (v != null) k === "teks" ? (e.textContent = v) : e.setAttribute(k, v);
    for (const a of anak.flat()) if (a) e.append(a); return e; };
  const warnai = (e, w, prop = "fill") => (e.style[prop] = `var(${w})`, e);
  const nanti = f => requestAnimationFrame(() => setTimeout(f, 0));

  /* kategori DIBI -> [label, ikon, token warna, bencana alam?] */
  const KAT = {"Banjir": ["Banjir", "banjir", "--kat-banjir", 1], "Cuaca ekstrem": ["Cuaca ekstrem", "cuaca", "--kat-cuaca", 1],
    "Longsor": ["Tanah longsor", "longsor", "--kat-longsor", 1], "Kebakaran hutan dan lahan": ["Karhutla", "karhutla", "--kat-karhutla", 1],
    "Kekeringan": ["Kekeringan", "kekeringan", "--kat-kering", 1], "Gelombang pasang / Abrasi": ["Gelombang pasang dan abrasi", "gelombang_pasang", "--kat-gelombang", 1],
    "Gempabumi": ["Gempa bumi", "gempabumi", "--kat-gempa", 1], "Erupsi gunung api": ["Erupsi gunung api", "gunungapi", "--kat-erupsi", 1],
    "Tsunami": ["Tsunami", "tsunami", "--kat-tsunami", 1], "Kebakaran permukiman": ["Kebakaran permukiman", "kebakaran_permukiman", "--kat-lain", 0],
    "Epidemi - Wabah penyakit": ["Wabah penyakit", "wabah", "--kat-lain", 0], "Konflik sosial": ["Konflik sosial", "konflik_sosial", "--kat-lain", 0],
    "Gagal teknologi": ["Kegagalan teknologi", "kegagalan_teknologi", "--kat-lain", 0]};
  const kat = n => KAT[n] || [n, "lainnya", "--kat-lain", 0];
  const URUT_KAT = Object.keys(KAT);

  /* ukuran: kunci kolom (atau rumus) -> label, satuan */
  const UKUR = [["kejadian", "Kejadian", ""], ["mdh", "Meninggal dan hilang", "jiwa"], ["luka", "Luka dan sakit", "jiwa"], ["terdampak", "Menderita dan mengungsi", "jiwa"],
    ["rumah", "Rumah rusak", "unit"], ["rr_berat", "Rumah rusak berat", "unit"], ["rr_sedang", "Rumah rusak sedang", "unit"], ["rr_ringan", "Rumah rusak ringan", "unit"],
    ["terendam", "Rumah terendam", "unit"], ["rugi_rumah", "Estimasi kerugian rumah", "rp"], ["f_pendidikan", "Satuan pendidikan rusak", "unit"],
    ["f_ibadah", "Rumah ibadat rusak", "unit"], ["f_kesehatan", "Fasilitas kesehatan rusak", "unit"], ["f_kantor", "Kantor rusak", "unit"],
    ["jembatan", "Jembatan rusak", "unit"], ["lahan_ha", "Lahan rusak", "ha"]];
  const LABEL = Object.fromEntries(UKUR.map(([k, l]) => [k, l])), SATUAN = Object.fromEntries(UKUR.map(([k, , u]) => [k, u]));
  const ringkas = v => { const a = Math.abs(v); return a >= 1e12 ? F(Math.round(v / 1e11) / 10) + " triliun" : a >= 1e9 ? F(Math.round(v / 1e8) / 10) + " miliar"
    : a >= 1e6 ? F(Math.round(v / 1e5) / 10) + " juta" : a >= 1e4 ? F(Math.round(v / 1e3)) + " ribu" : F(Math.round(v)); };
  /* rugi_rumah DIBI dalam juta rupiah */
  const nilaiTeks = (k, v) => SATUAN[k] === "rp" ? "Rp" + ringkas(v * 1e6) : SATUAN[k] === "ha" ? ringkas(v) + " ha" : ringkas(v);
  const nilaiPenuh = (k, v) => SATUAN[k] === "rp" ? "Rp" + F(Math.round(v)) + " juta" : F(Math.round(v * (SATUAN[k] === "ha" ? 10 : 1)) / (SATUAN[k] === "ha" ? 10 : 1)) + (SATUAN[k] === "ha" ? " ha" : "");
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const BLN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const PROV = window.Wilayah.PROV;
  const tglPanjang = t => { const [y, m, d] = String(t || "").split("-"); return y && m ? `${+d} ${BLN_PANJANG[+m - 1]} ${y}` : ""; };
  /* peta "prov|nama ternormalkan" -> berkas lambang kab/kota; dimuat sekali, gagal = peta kosong */
  let lambangKabSiap = new Map();
  const LAMBANG_KAB = fetch("/lambang/kabkota.json").then(r => r.json()).then(d => new Map(Object.entries(d).map(([k, v]) => { const [pv, nm] = k.split("|"); return [pv + "|" + norm(nm), v]; }))).catch(() => new Map()).then(m => (lambangKabSiap = m));
  const norm = s => { const n = String(s || "").toLowerCase().replace(/kep\./g, "kepulauan ").replace(/administrasi|adm\.|kab\.|kabupaten/g, "").replace(/\bdan\b/g, "").replace(/[^a-z]/g, ""); return n === "kotapadangsidempuan" ? "kotapadangsidimpuan" : n; };

  /* berkas harian lama tanpa kolom kategori: turunkan dari jenis DIBI (urutan aturan penting: lahar ke erupsi, rob ke gelombang) */
  const ATURAN = [[/lahar|erupsi|gunung/i, "Erupsi gunung api"], [/rob|gelombang|abrasi/i, "Gelombang pasang / Abrasi"], [/tsunami/i, "Tsunami"], [/gempa/i, "Gempabumi"],
    [/banjir/i, "Banjir"], [/longsor|gerakan tanah/i, "Longsor"], [/cuaca|angin|puting|topan|siklon/i, "Cuaca ekstrem"], [/hutan|lahan/i, "Kebakaran hutan dan lahan"],
    [/kekeringan/i, "Kekeringan"], [/permukiman|gedung|kebakaran/i, "Kebakaran permukiman"]];
  const katDariJenis = j => (ATURAN.find(([re]) => re.test(j || "")) || [0, "Lainnya"])[1];

  async function muat() {
    const ambil = u => fetch(u).then(r => { if (!r.ok) throw new Error(`${u}: ${r.status}`); return r.json(); });
    const [T, H, SD, PK, RB] = await Promise.all([ambil("/data/dibi_tren.json"), ambil("/data/dibi_kejadian.json").catch(() => null),
      ...["dibi_status_darurat", "dibi_posko", "dibi_rambu"].map(n => ambil(`/data/${n}.json`).catch(() => null))]);
    const C = Object.fromEntries(T.kolom_tahun.map((k, i) => [k, i])), CB = Object.fromEntries(T.kolom_bulan.map((k, i) => [k, i]));
    const kabNama = new Map(); T.kab.forEach((k, i) => { const n = norm(k[2]); if (!kabNama.has(n)) kabNama.set(n, []); kabNama.get(n).push(i); });
    /* baris harian -> indeks kab (DIBI memakai kode Papua lama, jadi cocokkan lewat kode lalu nama) */
    const kabKode = new Map(T.kab.map((k, i) => [k[0], i]));
    const harian = (H?.kejadian || []).filter(x => x.bencana !== 0).map(x => {   /* bencana 0 = di bawah ambang DIBI, bukan angka resmi */
      const kd = (x.kab_kode || "").replace(".", ""), cal = kabNama.get(norm(x.kab)) || [];
      const i = kabKode.has(kd) ? kabKode.get(kd) : cal.find(j => T.kab[j][1] === x.prov_kode) ?? cal[0];
      return {...x, i, prov: i == null ? x.prov_kode : T.kab[i][1], kat: x.kategori || katDariJenis(x.jenis)};
    });
    const tahun = [...new Set(T.tahun_kab.map(r => r[0]))].sort((a, b) => a - b);
    /* penanganan dari dataset DIBI lain (scripts/umum/dibi_lain.py): tiap baris diberi kode kab BPS 4 digit dan kode prov */
    const kabDariNama = (nama, prov) => { const cal = kabNama.get(norm(nama)) || []; const i = cal.find(j => !prov || T.kab[j][1] === prov) ?? cal[0]; return i == null ? "" : T.kab[i][0]; };
    const PNAMA = new Map(Object.entries(window.Wilayah.PROV).map(([k, v]) => [norm(v), k]));
    const darurat = (SD?.sk || []).filter(x => x.aktif).map(x => ({kab: x.kab_bps || "", prov: x.prov_kode || "", status: x.status, nomor: x.nomor, jenis: (x.jenis || []).join(", "), mulai: x.mulai, berakhir: x.berakhir}));
    const KP = Object.fromEntries((PK?.kolom || []).map((k, i) => [k, i]));
    const posko = (PK?.posko || []).map(r => { const kd = String(r[KP.id_desa_sdi] || "").split(".").slice(0, 2).join(""); return {kab: kd, prov: kd.slice(0, 2), jiwa: r[KP.jumlah] || 0, lokasi: r[KP.lokasi], desa: r[KP.desa], kec: r[KP.kec], tgl: r[KP.sumber_tgl]}; });
    const KR = Object.fromEntries((RB?.kolom || []).map((k, i) => [k, i]));
    const rambu = (RB?.rambu || []).map(r => { const prov = PNAMA.get(norm(r[KR.provinsi])) || ""; return {prov, kab: kabDariNama(r[KR.kab], prov), n: r[KR.jumlah] || 0, jenis: (RB.jenis || [])[r[KR.jenis]] ?? r[KR.jenis]}; });
    return {T, C, CB, harian, tahun, dariH: H?.dari, sampaiH: H?.sampai, darurat, posko, rambu, ada: {darurat: !!SD, posko: !!PK, rambu: !!RB}};
  }

  function pasang(akar, awal = {}) {
    akar.replaceChildren(h("p", {class: "dt-muat", role: "status", teks: "Memuat tren bencana…"}));
    muat().then(D => bangun(akar, D, awal)).catch(e => akar.replaceChildren(h("p", {class: "dt-galat", role: "alert", teks: "Data tren DIBI gagal dimuat. Muat ulang halaman. (" + e.message + ")"})));
  }

  function bangun(akar, D, awal) {
    const {T, C, CB} = D, kategoriAda = URUT_KAT.filter(k => T.kategori.includes(k)).concat(T.kategori.filter(k => !KAT[k]));
    const idxKat = new Map(T.kategori.map((k, i) => [k, i]));
    const alam = () => new Set(kategoriAda.filter(k => kat(k)[3]));
    const thAkhir = D.tahun.at(-1), thAwal = D.tahun[0];
    const q = new URLSearchParams(location.search);
    const kabAwal = (q.get("kab") || awal.kab || "").replace(".", "");
    const st = {kat: alam(), dari: Math.max(thAwal, 2008), sampai: thAkhir, prov: q.get("prov") || awal.prov || "", kab: kabAwal ? T.kab.findIndex(k => k[0] === kabAwal) : -1,
      tab: "tren", korban: "mdh", rumah: "rumah", sebar: "kejadian", hari: "kejadian", per100: false};
    /* tautan wilayah: ?prov=32&kab=32.01&dari=2015&sampai=2025&kat=0,3 (indeks kategori di dibi_tren.json) */
    const angkaQ = n => { const v = parseInt(q.get(n), 10); return D.tahun.includes(v) ? v : null; };
    if (q.get("tab")) st.tabAwal = q.get("tab");
    if (angkaQ("dari")) st.dari = angkaQ("dari"); if (angkaQ("sampai")) st.sampai = angkaQ("sampai"); if (st.dari > st.sampai) st.sampai = st.dari;
    if (q.get("kat")) { const k = new Set(q.get("kat").split(",").map(Number).filter(i => T.kategori[i]).map(i => T.kategori[i])); if (k.size) st.kat = k; }
    if (st.kab >= 0) st.prov = T.kab[st.kab][1]; else st.kab = -1;

    /* ---------- hitung ---------- */
    const lolos = r => st.kat.has(T.kategori[r[1]]) && r[0] >= st.dari && r[0] <= st.sampai && (st.kab >= 0 ? r[2] === st.kab : !st.prov || T.kab[r[2]][1] === st.prov);
    const lolosSemuaTahun = r => st.kat.has(T.kategori[r[1]]) && (st.kab >= 0 ? r[2] === st.kab : !st.prov || T.kab[r[2]][1] === st.prov);
    const ambilNilai = (r, k, CC = C) => k === "mdh" ? (CC.mdh != null ? r[CC.mdh] : r[CC.meninggal] + r[CC.hilang]) : k === "rumah" ? (CC.rumah != null ? r[CC.rumah] : r[CC.rr_berat] + r[CC.rr_sedang] + r[CC.rr_ringan]) : r[CC[k]] || 0;
    const pertahun = (k, perKat) => { const m = new Map(D.tahun.map(t => [t, perKat ? new Map() : 0]));
      for (const r of T.tahun_kab) { if (!lolosSemuaTahun(r)) continue; const v = ambilNilai(r, k);
        if (perKat) { const mm = m.get(r[0]); mm.set(r[1], (mm.get(r[1]) || 0) + v); } else m.set(r[0], m.get(r[0]) + v); } return m; };
    const total = k => { let n = 0; for (const r of T.tahun_kab) if (lolos(r)) n += ambilNilai(r, k); return n; };
    const ma5 = (deret) => deret.map((_, i) => { const a = deret.slice(Math.max(0, i - 4), i + 1); return a.reduce((x, y) => x + y, 0) / a.length; });

    /* ---------- kerangka ---------- */
    const DAS = !!awal.dasbor;   /* halaman berdiri: kerangka dasbor gaya /lapor/meja (sidebar kiri, bilah atas, Ringkasan kanan) */
    if (DAS) st.tab = ["peta", "tren", "sebaran", "tabel", "profil"].includes(st.tabAwal) ? st.tabAwal : "peta";
    const status = h("p", {class: "dt-sr", role: "status"});
    const tip = h("div", {class: "dt-tip", hidden: true, role: "tooltip"});
    const wilNama = () => st.kab >= 0 ? T.kab[st.kab][2] : st.prov ? PROV[st.prov] || st.prov : "Indonesia";

    // filter
    const chips = kategoriAda.map(k => { const [lbl, ik, w] = kat(k);
      /* dasbor: baris sama persis dengan "Per jenis bencana" di Ringkasan peta (kelas bd-rk-baris di data_bencana.css, ubin ikon berwarna jenis) */
      const b = DAS ? h("button", {type: "button", class: "bd-rk-baris", "aria-pressed": String(st.kat.has(k)), "data-k": k}, h("span", {class: "bd-rk-ik"}, ikon(ik)), h("span", {class: "dt-geser", title: lbl}, h("span", {teks: lbl})), h("b", {class: "dt-chip-n"}))
        : h("button", {type: "button", class: "dt-chip", "aria-pressed": String(st.kat.has(k)), "data-k": k}, warnai(h("i", {"aria-hidden": "true"}), w, "background"), ikon(ik), h("span", {class: "dt-geser", title: lbl}, h("span", {teks: lbl})), h("b", {class: "dt-chip-n"}));
      if (DAS) b.style.setProperty("--jn", `var(${w})`);;   // nama dibungkus: yang terpotong digeser bolak-balik (pemilik 25 Nov 2026)
      b.addEventListener("click", () => { st.kat.has(k) ? st.kat.delete(k) : st.kat.add(k); segarChip(); gambar(); }); return b; });
    /* pilihan tidak pernah kosong (grafik akan menampilkan nol palsu): beri tahu, jangan diam-diam memilih ulang */
    const elPesanJ = h("p", {class: "bd-rk-pesan", role: "status", hidden: true}), elJmlJ = h("small", {class: "db-jenis-jml"}); let tPesanJ = 0;
    const pesanJenis = () => { elPesanJ.textContent = "Pilih paling sedikit satu jenis bencana"; elPesanJ.hidden = false; clearTimeout(tPesanJ); tPesanJ = setTimeout(() => (elPesanJ.hidden = true), 2600); };
    /* pilihan cepat tersegmen (pemilik 25 Nov 2026: tombol kelompok "aneh", "lepas semua gabisa dipencet"):
       Semua, Alam, Lainnya MENETAPKAN pilihan (bukan menambah); segmen yang cocok dengan pilihan sekarang tersorot, pilihan manual = tak ada yang tersorot.
       Judul kelompok kembali label biasa; baris tetap bisa diklik satu per satu. */
    /* judul kelompok = tombol pil "Pilih semua" / "Lepas semua" (pemilik 25 Nov 2026: "pengen ada fitur uncheck", "bikin jadi pill, jangan underline").
       Lepas semua benar-benar melepas, boleh sampai tidak ada jenis terpilih; keadaan kosong diberi tahu di bawah daftar, grafik tidak menebak. */
    const grupKat = al => kategoriAda.filter(k => !!kat(k)[3] === al);
    const grupB = [true, false].filter(al => grupKat(al).length).map(al => { const ks = grupKat(al), aksi = h("button", {type: "button", class: "bd-rk-grup-b"});
      aksi.addEventListener("click", () => { if (ks.every(k => st.kat.has(k))) ks.forEach(k => st.kat.delete(k)); else ks.forEach(k => st.kat.add(k)); segarChip(); gambar(); });
      return {al, ks, aksi, b: h("div", {class: "bd-rk-grup"}, h("span", {teks: al ? "Bencana alam" : "Bencana lainnya"}), aksi)}; });
    /* pilihan bawaan (semua bencana alam) atau semua: baris polos seperti daftar peta tanpa saringan; sorotan hanya muncul bila pengguna menyaring */
    const segarChip = () => { chips.forEach(b => b.setAttribute("aria-pressed", String(st.kat.has(b.dataset.k))));
      elJmlJ.textContent = `${st.kat.size} dari ${kategoriAda.length} terpilih`;
      elPesanJ.textContent = "Belum ada jenis bencana yang dipilih. Pilih paling sedikit satu untuk melihat angkanya."; elPesanJ.hidden = st.kat.size > 0;
      for (const g of grupB) { const penuh = g.ks.every(k => st.kat.has(k)); g.aksi.textContent = penuh ? "Lepas semua" : "Pilih semua";
        g.aksi.setAttribute("aria-label", `${penuh ? "Lepas" : "Pilih"} semua ${g.al ? "bencana alam" : "bencana lainnya"}`); }
      const a = alam(), bawaan = st.kat.size === kategoriAda.length || (st.kat.size === a.size && [...a].every(k => st.kat.has(k)));
      chips[0]?.parentElement?.classList.toggle("db-bawaan", bawaan); };
    /* nama kategori yang lebih panjang dari pilnya digeser pelan bolak-balik supaya terbaca utuh (pemilik 25 Nov 2026 "animasi geser2 teksnya");
       jarak geser = lebar yang terpotong, durasi ikut jarak; diukur ulang saat lebar berubah. Gerak dimatikan bila pengguna memilih kurangi gerakan (CSS). */
    const ukurGeser = () => { for (const w of akar.querySelectorAll(".dt-geser")) { const t = w.firstElementChild, lebih = Math.ceil(t.getBoundingClientRect().width) - w.clientWidth;   // span inline: scrollWidth selalu 0, lebar diukur dari kotaknya
      w.classList.toggle("geser", lebih > 2); if (lebih > 2) { w.style.setProperty("--geser", -lebih + "px"); w.style.setProperty("--durasi", Math.max(4, 2.5 + lebih / 18).toFixed(1) + "s"); } } };
    let rafGeser = 0; new ResizeObserver(() => { if (!rafGeser) rafGeser = requestAnimationFrame(() => { rafGeser = 0; ukurGeser(); }); }).observe(akar);
    const bAlam = h("button", {type: "button", class: "dt-btn-teks", teks: "Bencana alam"}), bSemua = h("button", {type: "button", class: "dt-btn-teks", teks: "Semua kategori"});
    /* tombol cepat mode Dalops (tanpa kerangka dasbor); dasbor memakai kotak centang kelompok di Ringkasan */
    bAlam.addEventListener("click", () => { st.kat = alam(); segarChip(); gambar(); });
    bSemua.addEventListener("click", () => { st.kat = new Set(kategoriAda); segarChip(); gambar(); });
    const pilihan = (nilai, daftar) => daftar.map(([v, t]) => h("option", {value: v, selected: String(v) === String(nilai) || null, teks: t}));
    const sDari = h("select", {id: "dtDari"}, pilihan(st.dari, D.tahun.map(t => [t, t]))), sSampai = h("select", {id: "dtSampai"}, pilihan(st.sampai, D.tahun.map(t => [t, t])));
    const provAda = [...new Set(T.kab.map(k => k[1]))].filter(p => PROV[p]).sort((a, b) => PROV[a].localeCompare(PROV[b], "id"));
    const sProv = h("select", {id: "dtProv"}, pilihan(st.prov, [["", "Seluruh Indonesia"], ...provAda.map(p => [p, PROV[p]])]));
    const sKab = h("select", {id: "dtKab"});
    const isiKab = () => { sKab.replaceChildren(...pilihan(st.kab, [[-1, st.prov ? "Semua kab/kota" : "Pilih provinsi dulu"],
      ...T.kab.map((k, i) => [i, k]).filter(([, k]) => k[1] === st.prov).sort((a, b) => a[1][2].localeCompare(b[1][2], "id")).map(([i, k]) => [i, k[2]])])); sKab.disabled = !st.prov; };
    isiKab();
    sDari.addEventListener("change", () => { st.dari = +sDari.value; if (st.dari > st.sampai) { st.sampai = st.dari; sSampai.value = st.sampai; } gambar(); });
    sSampai.addEventListener("change", () => { st.sampai = +sSampai.value; if (st.sampai < st.dari) { st.dari = st.sampai; sDari.value = st.dari; } gambar(); });
    sProv.addEventListener("change", () => { st.prov = sProv.value; st.kab = -1; isiKab(); gambar(); });
    sKab.addEventListener("change", () => { st.kab = +sKab.value; gambar(); });
    const bUlang = h("button", {type: "button", class: "dt-btn-teks", teks: "Atur ulang"});
    bUlang.addEventListener("click", () => { Object.assign(st, {kat: alam(), dari: Math.max(thAwal, 2008), sampai: thAkhir, prov: "", kab: -1});
      sDari.value = st.dari; sSampai.value = st.sampai; sProv.value = ""; isiKab(); segarChip(); gambar(); });
    const lbl = (f, t) => h("label", {for: f, teks: t});
    const filter = h("div", {class: "dt-filter", role: "group", "aria-label": "Saring data tren"},
      h("div", {class: "dt-f-kat"}, h("div", {class: "dt-f-kepala"}, h("span", {class: "dt-f-judul", teks: "Kategori bencana"}), h("div", {class: "dt-f-cepat"}, bAlam, bSemua)),
        h("div", {class: "dt-chips"}, chips)),
      h("div", {class: "dt-f-baris"},
        h("div", {class: "dt-f-isi"}, lbl("dtDari", "Dari tahun"), sDari), h("div", {class: "dt-f-isi"}, lbl("dtSampai", "Sampai tahun"), sSampai),
        h("div", {class: "dt-f-isi dt-lebar"}, lbl("dtProv", "Provinsi"), sProv), h("div", {class: "dt-f-isi dt-lebar"}, lbl("dtKab", "Kabupaten/kota"), sKab),
        h("div", {class: "dt-f-isi dt-f-ulang"}, bUlang)));

    // tab (focusgroup bila didukung; panah kiri/kanan dipasang sendiri sebagai cadangan)
    const TAB = [...(DAS ? [["peta", "Peta", "wilayah"]] : []), ["tren", "Tren", "grafik"], ["sebaran", "Sebaran", "peringkat"], ["tabel", "Tabel", "tabel"], ...(DAS ? [["profil", "Profil kab/kota", "rumah"]] : [])];
    const tabB = TAB.map(([k, t, ik]) => h("button", {type: "button", role: "tab", class: DAS ? "dbt-nav" : null, id: "dtTab-" + k, title: t, "aria-selected": String(k === st.tab), tabindex: k === st.tab ? "0" : "-1"}, ikon(ik), h("span", {teks: t})));
    const panel = Object.fromEntries(TAB.map(([k]) => [k, h("div", {role: "tabpanel", id: "dtPanel-" + k, "aria-labelledby": "dtTab-" + k, hidden: k !== st.tab || null, class: "dt-panel"})]));
    const tabList = h("div", {class: DAS ? "db-tabs" : "dt-tabs", role: "tablist", "aria-label": "Tampilan data DIBI", "aria-orientation": DAS ? "horizontal" : null}, tabB);
    const pilihTab = (k, fokus) => { st.tab = k; tabB.forEach((b, i) => { const on = TAB[i][0] === k; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; if (on && fokus) b.focus(); });
      for (const [kk, p] of Object.entries(panel)) p.hidden = kk !== k; akar.dataset.tab = k; bukaTurun(); gambarRingkasan();
      if (k === "peta") nanti(() => window.dispatchEvent(new Event("resize"))); nanti(gambarTab); };
    tabB.forEach((b, i) => { b.addEventListener("click", () => pilihTab(TAB[i][0]));
      b.addEventListener("keydown", e => { const j = {ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: TAB.length - 1}[e.key]; if (j == null) return; e.preventDefault(); pilihTab(TAB[(j + TAB.length) % TAB.length][0], true); }); });

    const ringkasan = h("div", {class: DAS ? "db-rk-isi" : "dt-kpi", "aria-live": "off"});
    /* bagikan tautan wilayah ini: Web Share bila ada, selain itu salin ke papan klip */
    const tautan = () => { const u = new URL(location.href), set = (k, v) => v === "" || v == null ? u.searchParams.delete(k) : u.searchParams.set(k, v);
      set("prov", st.prov); set("kab", st.kab >= 0 ? T.kab[st.kab][0].replace(/^(\d\d)(\d\d)$/, "$1.$2") : "");
      set("dari", st.dari !== Math.max(thAwal, 2008) ? st.dari : ""); set("sampai", st.sampai !== thAkhir ? st.sampai : "");
      const bawaan = alam(), sama = bawaan.size === st.kat.size && [...bawaan].every(k => st.kat.has(k));
      set("tab", DAS && st.tab !== "peta" ? st.tab : "");
      set("kat", sama ? "" : [...st.kat].map(k => idxKat.get(k)).sort((a, b) => a - b).join(",")); return u; };
    const TEKS_BAGI = DAS ? "Bagikan" : "Bagikan tautan wilayah ini";
    const bBagi = h("button", {type: "button", class: "dt-btn-teks", title: "Bagikan tautan wilayah ini"}, ikon("bagikan"), h("span", {teks: TEKS_BAGI}));
    const bCetak = h("button", {type: "button", class: "dt-btn-teks"}, ikon("cetak"), h("span", {teks: "Cetak A4"}));
    bBagi.addEventListener("click", async () => { const u = tautan().href, judul = `Statistik bencana ${wilNama()}`;
      try { if (navigator.share && matchMedia("(pointer:coarse)").matches) { await navigator.share({title: judul, url: u}); return; }
        await navigator.clipboard.writeText(u); status.textContent = "Tautan disalin"; bBagi.lastChild.textContent = "Tautan disalin";
        setTimeout(() => (bBagi.lastChild.textContent = TEKS_BAGI), 2500);
      } catch (e) { if (e.name !== "AbortError") prompt("Salin tautan ini:", u); } });
    const judulWil = h("span", {class: "dt-wil"}); let jenisBlok = null, pilSementara = "", segarKetik = () => {}, segarTurun = () => {}, bukaTurun = () => {}, segarPeriode = () => {}, kirimPeta = () => {}, infoPeta = null, cetakProfil = () => {};
    /* tab Peta: data peta hanya 365 hari terakhir, jadi bilah atas menulis periode yang benar-benar dipakai peta */
    const judulPeta = () => { const a = infoPeta?.st; judulWil.textContent = a?.dari ? `${wilNama()}, ${tglPanjang(a.dari)} sampai ${tglPanjang(a.sampai)}` : `${wilNama()}, 365 hari terakhir`; };
    const sumberCetak = h("p", {class: "dt-cetak-saja", teks: `Sumber: DIBI BNPB (dibi.bnpb.go.id), hanya kejadian yang memenuhi ambang bencana. Diunduh ${tglPanjang(T.dibuat.slice(0, 10))}.`});
    /* kop laporan cetak (pemilik 25 Nov 2026 "selesaikan fitur print"): logo, judul, wilayah dan periode, jenis yang dihitung, tanggal cetak; hanya tampil saat mencetak */
    const kopWil = h("span", {class: "db-kop-wil"}), kopJenis = h("small", {class: "db-kop-jenis"}), kopTgl = h("small", {class: "db-kop-tgl"});
    const kopCetak = h("header", {class: "dt-cetak-saja db-kop"}, h("img", {src: "/lapor/lambang-bnpb.png", alt: "", width: "46", height: "46"}),
      h("div", {class: "db-kop-isi"}, h("b", {teks: "Data Bencana Indonesia"}), kopWil, kopJenis), kopTgl);
    const segarKop = (profil) => { const per = st.dari === st.sampai ? String(st.dari) : `${st.dari} sampai ${st.sampai}`;
      /* cetak profil: nama wilayah sudah jadi judul besar di bawah kop, jadi kop cukup menyebut jenis dokumennya */
      kopWil.textContent = profil ? `Profil kabupaten/kota, ${per}` : `${wilNama()}${st.kab >= 0 ? ", " + (PROV[st.prov] || st.prov) : ""}, ${per}`;
      const a = alam(), semuaJ = st.kat.size === kategoriAda.length, alamSaja = st.kat.size === a.size && [...a].every(k => st.kat.has(k));
      kopJenis.textContent = semuaJ ? "Semua jenis bencana" : alamSaja ? "Bencana alam" : `Jenis: ${kategoriAda.filter(k => st.kat.has(k)).map(k => kat(k)[0]).join(", ") || "tidak ada"}`;
      const k = new Date(); kopTgl.textContent = `Dicetak ${tglPanjang(k.toISOString().slice(0, 10))}`; };
    if (DAS) {
      /* Peta milik data_bencana.js (sesi Dalops): mode tanam = peta + panel bergaya meja; atur() dari sini, ubah() bila pengguna klik peta */
      const petaEl = h("div", {class: "db-peta"}); panel.peta.append(petaEl); document.getElementById("app")?.remove();
      let kendali = null, dariPeta = false;
      /* jenis hanya dikirim bila pilihan kerangka berubah, supaya pilihan ganda di Ringkasan peta tidak tertimpa saat wilayah atau tahun diganti */
      let jenisTerkirim;
      kirimPeta = () => { if (!kendali || dariPeta) return; const satu = st.kat.size === 1 ? kat([...st.kat][0])[1] : "";
        /* kab dikirim sebagai NAMA: kode di dibi_tren.json (kode DIBI, mis. Aceh Selatan 1101) berbeda dengan kode BPS di peta (Aceh Selatan 11.03),
           mengirim kode membuat kab tertukar dan URL bergeser tiap muat ulang */
        const p = {dari: String(st.dari), sampai: String(st.sampai), prov: st.prov, kab: st.kab >= 0 ? T.kab[st.kab][2] : ""};
        if (satu !== jenisTerkirim) { p.jenis = jenisTerkirim = satu; }
        kendali.atur(p); };
      const terimaPeta = info => { infoPeta = info; if (st.tab === "peta") judulPeta();
        if (!kendali) return;   /* laporan awal peta (sebelum atur() pertama) tidak boleh menimpa wilayah dari tautan */
        const p = info?.st?.prov || "", kbm = String(info?.st?.kab || ""), kb = kbm.replace(".", "");
        /* peta bisa melapor kab sebagai kode BPS ("33.25") atau nama; cocokkan keduanya */
        const i = !kbm ? -1 : /^\d{4}$/.test(kb) ? T.kab.findIndex(k => k[0] === kb) : T.kab.findIndex(k => (!p || k[1] === p) && norm(k[2]) === norm(kbm)); if (p === st.prov && i === st.kab) return;
        st.prov = p; st.kab = i; sProv.value = p; isiKab(); sKab.value = i; dariPeta = true; gambar(); nanti(() => (dariPeta = false)); };
      if (window.DataBencana) Promise.resolve(window.DataBencana.pasang(petaEl, {tanam: true, ubah: terimaPeta})).then(k => { if (k?.atur) { kendali = k; kirimPeta(); } }).catch(() => {});
      const PERIODE = [[5, "5 tahun"], [10, "10 tahun"], [0, "Sejak 2008"], [1, "Tahun ini"]];
      const segP = h("div", {class: "db-periode", role: "group", "aria-label": "Periode cepat"}, PERIODE.map(([n, t]) => { const b = h("button", {type: "button", "data-n": String(n), teks: t});
        b.addEventListener("click", () => { st.sampai = thAkhir; st.dari = n === 0 ? Math.max(thAwal, 2008) : n === 1 ? thAkhir : thAkhir - n + 1; sDari.value = st.dari; sSampai.value = st.sampai; gambar(); }); return b; }));
      segarPeriode = () => segP.querySelectorAll("button").forEach(b => { const n = +b.dataset.n, dari = n === 0 ? Math.max(thAwal, 2008) : n === 1 ? thAkhir : thAkhir - n + 1; b.setAttribute("aria-pressed", String(st.sampai === thAkhir && st.dari === dari)); });
      const grup = (t, ...isi) => h("section", {class: "db-grup"}, h("h2", {class: "db-grup-j", teks: t}), ...isi);
      /* tombol tema, pola /lapor/meja: simpan "pk-tema" (dibaca anti kedip oleh /halaman_awal.js), lalu kabari peta lewat event "pk-tema" agar palet dihitung ulang */
      const garis = {fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round"};
      const bTema = h("button", {class: "db-tema", type: "button", "aria-label": "Ganti tema terang/gelap", title: "Ganti tema terang/gelap"},
        s("svg", {class: "db-bulan", viewBox: "0 0 24 24", "aria-hidden": "true", ...garis}, s("path", {d: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"})),
        s("svg", {class: "db-matahari", viewBox: "0 0 24 24", "aria-hidden": "true", ...garis}, s("circle", {cx: "12", cy: "12", r: "4"}), s("path", {d: "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"})));
      bTema.addEventListener("click", () => {
        const d = document.documentElement, gelap = d.dataset.theme ? d.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches, t = gelap ? "light" : "dark";
        d.dataset.theme = t; try { localStorage.setItem("pk-tema", JSON.stringify(t)); } catch (e) {}
        requestAnimationFrame(() => dispatchEvent(new CustomEvent("pk-tema", {detail: t}))); });
      const sisi = h("div", {class: "db-sisi", role: "group", "aria-label": "Tampilan data bencana"},
        tabList,
        /* tanggal data di dasar sidebar (pemilik 25 Nov 2026 "pindahin ke bawah") */
        h("p", {class: "db-segar"}, h("i", {"aria-hidden": "true"}), h("span", {class: "db-segar-l", teks: "Data diperbarui"}), h("b", {teks: tglPanjang(T.dibuat.slice(0, 10))})),
        );
      bAlam.textContent = "Bencana alam"; bSemua.textContent = "Semua";
      /* wilayah, tahun, bagikan di bilah atas, bukan di sidebar (pemilik 25 Nov 2026); label tersembunyi untuk pembaca layar, nilai pilihan sudah menjelaskan */
      /* bilah atas satu baris: kotak wilayah (ikon peta, provinsi | kab/kota) dan kotak tahun (ikon kalender, dari sampai), lalu aksi di kanan.
         Judul wilayah dan periode tidak di sini lagi (pemilik 25 Nov 2026): pindah ke Ringkasan, sama dengan Ringkasan peta */
      const kotak = (kls, ik, ...isi) => h("div", {class: `db-kotak ${kls}`}, ikon(ik), ...isi);
      /* pilihan yang bisa diketik (pemilik 25 Nov 2026), dipakai wilayah dan tahun: kotak teks + daftar saran; <select> asli tetap sumber nilai dan event change.
         Ketik menyaring daftar (semua kata harus cocok), panah atas/bawah memilih, Enter memasang, Escape batal. Daftar fixed agar tidak terpotong. */
      const cariN = t => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ");
      const daftarKetik = [];
      /* lambangOpsi(option) -> alamat gambar atau null: daftar saran provinsi dan kab/kota memakai lambang daerah (pemilik 25 Nov 2026) */
      const ketik = (sel, nama, lambangOpsi) => {
        const id = sel.id + "Daftar", inp = h("input", {type: "text", class: "db-ketik", role: "combobox", "aria-label": nama, "aria-autocomplete": "list", "aria-expanded": "false", "aria-controls": id, autocomplete: "off", spellcheck: "false"});
        const ul = h("ul", {class: "db-ketik-daftar", role: "listbox", id, "aria-label": nama, hidden: true}); sel.hidden = true; sel.tabIndex = -1;
        let opsi = [], aktif = -1;
        const teks = () => sel.selectedOptions[0]?.textContent || "";
        const sorot = i => { aktif = i; inp.removeAttribute("aria-activedescendant");
          ul.querySelectorAll("[data-i]").forEach(li => { const on = +li.dataset.i === i; li.classList.toggle("on", on); if (on) { inp.setAttribute("aria-activedescendant", li.id); li.scrollIntoView({block: "nearest"}); } }); };
        const tutup = () => { ul.hidden = true; inp.setAttribute("aria-expanded", "false"); sorot(-1); };
        const buka = q => { const kata = cariN(q).split(" ").filter(Boolean);
          opsi = [...sel.options].filter(o => !o.disabled && kata.every(k => cariN(o.textContent).includes(k)));
          const gb = src => { const im = h("img", {class: "db-ketik-lmb", alt: "", loading: "lazy", decoding: "async", src}); im.addEventListener("error", () => { im.style.visibility = "hidden"; }, {once: true}); return im; };
          ul.classList.toggle("db-ketik-berlogo", !!lambangOpsi);
          ul.replaceChildren(...opsi.map((o, i) => { const src = lambangOpsi?.(o);
            return h("li", {role: "option", id: `${id}-${i}`, "data-i": String(i), "aria-selected": String(o.selected)}, ...(lambangOpsi ? [src ? gb(src) : h("span", {class: "db-ketik-lmb"})] : []), h("span", {teks: o.textContent})); }));
          if (!opsi.length) ul.append(h("li", {class: "db-ketik-kosong", teks: "Tidak ditemukan"}));
          const r = inp.closest(".db-kotak").getBoundingClientRect(), k = inp.getBoundingClientRect();
          Object.assign(ul.style, {left: `${k.left - 6}px`, top: `${r.bottom + 6}px`, minInlineSize: `${Math.max(k.width + 12, 120)}px`});
          ul.hidden = false; inp.setAttribute("aria-expanded", "true");
          sorot(kata.length ? 0 : opsi.findIndex(o => o.selected)); };
        const pasang = o => { tutup(); if (o && sel.value !== o.value) { sel.value = o.value; sel.dispatchEvent(new Event("change", {bubbles: true})); } inp.value = teks(); };
        /* fokus: kotak dikosongkan dan nilai sekarang jadi placeholder, jadi langsung bisa mengetik tanpa blok seleksi (blok seleksi memancing ikon terjemahan peramban) */
        inp.addEventListener("focus", () => { inp.placeholder = teks(); inp.value = ""; buka(""); });
        inp.addEventListener("click", () => { if (ul.hidden) buka(""); });
        inp.addEventListener("input", () => buka(inp.value));
        inp.addEventListener("keydown", e => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (ul.hidden) return buka(""); const n = opsi.length, maju = e.key === "ArrowDown" ? 1 : -1; if (n) sorot(aktif < 0 ? (maju > 0 ? 0 : n - 1) : (aktif + maju + n) % n); }
          else if (e.key === "Enter") { e.preventDefault(); if (!ul.hidden) pasang(opsi[aktif >= 0 ? aktif : 0]); }
          else if (e.key === "Escape") { e.preventDefault(); tutup(); inp.value = teks(); inp.placeholder = ""; inp.blur(); } });
        inp.addEventListener("blur", () => { tutup(); inp.value = teks(); inp.placeholder = ""; });
        ul.addEventListener("mousedown", e => { e.preventDefault(); const li = e.target.closest("[data-i]"); if (li) { pasang(opsi[+li.dataset.i]); inp.blur(); } });
        addEventListener("scroll", e => { if (!ul.hidden && !ul.contains(e.target)) tutup(); }, {passive: true, capture: true});
        daftarKetik.push(() => { if (document.activeElement !== inp) inp.value = teks(); inp.disabled = sel.disabled; });
        return [inp, h("span", {class: "db-k-panah", "aria-hidden": "true"}), ul, sel]; };
      /* rentang tahun dalam satu tombol (pemilik 25 Nov 2026: dua pemilih terkesan wajib tahun berbeda).
         Kisi tahun: klik pertama langsung berlaku sebagai satu tahun; klik tahun lain (opsional) membentuk rentang dan menutup kisi.
         Tahun kedua tidak wajib: tombol Selesai, Escape, atau klik di luar menyimpan satu tahun itu (pemilik 25 Nov 2026). */
      const thLabel = h("span", {class: "db-th-l"}), bTahun = h("button", {type: "button", class: "db-th-b", "aria-haspopup": "dialog", "aria-expanded": "false"}, thLabel, h("span", {class: "db-k-panah", "aria-hidden": "true"}));
      const thPetunjuk = h("p", {class: "db-th-ptk"}), thKisi = h("div", {class: "db-th-kisi"});
      const thSelesai = h("button", {type: "button", class: "db-th-selesai", teks: "Selesai"});
      const thPop = h("div", {class: "db-th-pop", role: "dialog", "aria-label": "Pilih tahun", hidden: true}, thPetunjuk, thKisi, h("div", {class: "db-th-kaki"}, thSelesai));
      let thAnc = null;
      const thTeks = () => st.dari === st.sampai ? String(st.dari) : `${st.dari}\u2013${st.sampai}`;
      const thGambar = (a = st.dari, b = st.sampai) => { const lo = Math.min(a, b), hi = Math.max(a, b);
        thPetunjuk.textContent = thAnc == null ? "Klik satu tahun, atau dua tahun untuk rentang" : `${thAnc} dipilih. Klik tahun lain bila ingin rentang`;
        thKisi.querySelectorAll("button").forEach(x => { const t = +x.dataset.t; x.classList.toggle("di", t > lo && t < hi); x.classList.toggle("ujung", t === lo || t === hi); x.setAttribute("aria-pressed", String(t >= lo && t <= hi)); }); };
      thKisi.append(...D.tahun.map(t => { const x = h("button", {type: "button", "data-t": String(t), teks: String(t)});
        x.addEventListener("pointerenter", () => { if (thAnc != null) thGambar(thAnc, t); });
        x.addEventListener("focus", () => { if (thAnc != null) thGambar(thAnc, t); });
        x.addEventListener("click", () => { const pasangTh = (lo, hi) => { if (lo === st.dari && hi === st.sampai) return; st.dari = lo; st.sampai = hi; sDari.value = lo; sSampai.value = hi; gambar(); };
          if (thAnc == null || thAnc === t) { const dua = thAnc === t; thAnc = dua ? null : t; pasangTh(t, t); if (dua) thTutup(true); else thGambar(t, t); return; }
          const lo = Math.min(thAnc, t), hi = Math.max(thAnc, t); thAnc = null; thTutup(true); pasangTh(lo, hi); });
        return x; }));
      const thTutup = fokus => { thPop.hidden = true; thAnc = null; bTahun.setAttribute("aria-expanded", "false"); thGambar(); if (fokus) bTahun.focus(); };
      const thBuka = () => { const r = bTahun.closest(".db-kotak").getBoundingClientRect(); Object.assign(thPop.style, {left: `${r.left}px`, top: `${r.bottom + 6}px`});
        thAnc = null; thGambar(); thPop.hidden = false; bTahun.setAttribute("aria-expanded", "true");
        (thKisi.querySelector(`[data-t="${st.dari}"]`) || thKisi.firstChild)?.focus({preventScroll: true}); };
      bTahun.addEventListener("click", () => thPop.hidden ? thBuka() : thTutup(false));
      thSelesai.addEventListener("click", () => thTutup(true));
      thPop.addEventListener("keydown", e => { if (e.key === "Escape") { e.preventDefault(); thTutup(true); } });
      addEventListener("pointerdown", e => { if (!thPop.hidden && !thPop.contains(e.target) && !bTahun.contains(e.target)) thTutup(false); });
      addEventListener("scroll", e => { if (!thPop.hidden && !thPop.contains(e.target)) thTutup(false); }, {passive: true, capture: true});
      sDari.hidden = sSampai.hidden = true;
      daftarKetik.push(() => { thLabel.textContent = thTeks(); bTahun.setAttribute("aria-label", `Tahun ${st.dari === st.sampai ? st.dari : `${st.dari} sampai ${st.sampai}`}, ubah`); if (thPop.hidden) thGambar(); });
      segarKetik = () => daftarKetik.forEach(f => f());
      const saring = h("div", {class: "db-saring", role: "group", "aria-label": "Saring wilayah dan tahun"},
        kotak("db-k-wil", "wilayah", ...ketik(sProv, "Provinsi", o => o.value ? `/lambang/provinsi/${o.value}.png` : null), h("span", {class: "db-k-sela", "aria-hidden": "true"}),
          ...ketik(sKab, "Kabupaten/kota", o => { const kb = T.kab[+o.value]; if (!kb) return st.prov ? `/lambang/provinsi/${st.prov}.png` : null;
            const slug = lambangKabSiap.get(kb[1] + "|" + norm(kb[2])); return slug ? `/lambang/kabkota/${slug}.png` : `/lambang/provinsi/${kb[1]}.png`; })),
        kotak("db-k-th", "kalender", bTahun, thPop, sDari, sSampai),
        segP, bUlang);
      /* Bagikan dan Cetak tetap bertulisan (pemilik 25 Nov 2026); pil "sementara" ikut judul wilayah di Ringkasan */
      const atas = h("div", {class: "db-atas"}, saring, h("div", {class: "db-aksi"}, bBagi, bCetak, bTema));   /* tombol tema di bilah atas, sebelah Cetak (pemilik 25 Nov 2026) */
      pilSementara = h("span", {class: "db-sementara", title: "DIBI menetapkan data final sekitar Februari tahun berikutnya"}, ikon("tunggu"), h("span", {teks: `Data ${T.sementara} sementara`}));
      /* filter jenis tinggal di Ringkasan kanan, sama letaknya dengan "Per jenis bencana" di Ringkasan peta (pemilik 25 Nov 2026: jangan di sidebar).
         Satu elemen tetap, dipasang ulang tiap gambarRingkasan(); tab Peta memakai daftar di peta karena Ringkasan kanan disembunyikan di sana */
      /* kelompok Bencana alam / Bencana lainnya, sama dengan daftar peta (bendera alam di KAT) */
      const grupChip = grupB.flatMap(g => [g.b, ...chips.filter(b => g.ks.includes(b.dataset.k))]);
      /* bagian bisa dilipat (pemilik 25 Nov 2026 "bisa hide/show ada dropdownnya"): kepala menyebut jumlah terpilih supaya saat terlipat tetap terbaca */
      jenisBlok = h("details", {class: "db-rk-jenis", open: true}, h("summary", {class: "db-jenis-kepala"}, h("span", {teks: "Jenis bencana"}), elJmlJ, h("i", {"aria-hidden": "true"})),
        h("div", {class: "db-jenis-daftar bd-rk-jenis bd-saring"}, grupChip), elPesanJ); segarChip();
      /* tanda isi di bawah (pemilik 25 Nov 2026 "gabakal nyadar klo bisa discroll"): tombol panah melayang di dasar Ringkasan
         menyebut bagian berikutnya yang belum terlihat; klik menggulir ke bagian itu; hilang di dasar. Panah, bukan pudar (QA 24 Nov). */
      /* tombol x muncul saat diarahkan kursor (pemilik 25 Nov 2026): sembunyikan tanda ini hanya sampai pengguna pindah tab tampilan
         (Peta, Tren, dan seterusnya); tidak disimpan di peramban. Kunci simpanan versi lama dihapus. */
      const turunTeks = h("span"), bTurun = h("button", {type: "button", class: "db-rk-turun"}, turunTeks, h("i", {"aria-hidden": "true"}));
      const bTurunX = h("button", {type: "button", class: "db-rk-turun-x", "aria-label": "Sembunyikan tombol gulir", title: "Sembunyikan"}, "\u00d7");
      const turunWadah = h("div", {class: "db-rk-turun-wadah", hidden: true}, bTurun, bTurunX);
      let turunTutup = false; try { localStorage.removeItem("db-turun-tutup"); sessionStorage.removeItem("db-turun-tutup"); } catch (e) {}
      bukaTurun = () => { turunTutup = false; };
      bTurunX.addEventListener("click", () => { turunTutup = true; turunWadah.hidden = true; });
      const rk = h("aside", {class: "db-ringkas", "aria-label": "Ringkasan"}, h("h2", {class: "db-rk-j"}, ikon("data"), h("span", {teks: "Ringkasan"})), ringkasan, turunWadah);
      const berikut = () => { const batas = rk.getBoundingClientRect().bottom - 110; /* judul di 110 px terbawah dianggap belum terlihat: isinya masih di bawah */ return [...ringkasan.querySelectorAll(".db-rk-label")].find(l => l.getBoundingClientRect().top > batas); };
      segarTurun = () => { const habis = rk.scrollTop + rk.clientHeight >= rk.scrollHeight - 8, n = habis ? null : berikut();
        turunWadah.hidden = habis || turunTutup; turunTeks.textContent = n ? `Lihat ${n.textContent.toLowerCase()}` : "Lihat lainnya"; bTurun.setAttribute("aria-label", n ? `Gulir ke ${n.textContent}` : "Gulir ke bawah"); };
      bTurun.addEventListener("click", () => { const n = berikut(); rk.scrollTo({top: n ? rk.scrollTop + n.getBoundingClientRect().top - rk.getBoundingClientRect().top - 12 : rk.scrollHeight, behavior: "smooth"}); });
      let rafTurun = 0; const nantiTurun = () => { if (!rafTurun) rafTurun = requestAnimationFrame(() => { rafTurun = 0; segarTurun(); }); };
      rk.addEventListener("scroll", nantiTurun, {passive: true}); new ResizeObserver(nantiTurun).observe(rk);
      akar.classList.add("db-app"); akar.dataset.tab = st.tab;
      akar.replaceChildren(sisi, h("div", {class: "db-utama"}, kopCetak, atas, sumberCetak, h("div", {class: "db-isi"}, h("div", {class: "db-panel"}, ...Object.values(panel)), rk)), status, tip);
    } else akar.replaceChildren(
      h("div", {class: "dt-kepala"}, h("h2", {class: "dt-judul", id: "dtJudul"}, ikon("data"), h("span", {teks: "Statistik bencana sejak 2008"})),
        h("span", {class: "dt-pil", title: "DIBI menetapkan data final sekitar Februari tahun berikutnya", teks: `Data ${T.sementara} sementara`}), judulWil,
        h("div", {class: "dt-aksi"}, bBagi, bCetak)),
      sumberCetak, filter, ringkasan, tabList, ...Object.values(panel), status, tip);

    /* ---------- tooltip ---------- */
    /* QA 25 Nov 2026: isi tooltip hanya dibangun ulang saat pindah elemen, ukurannya disimpan; posisi diatur sekali per bingkai (tanpa paksa layout tiap gerak tetikus) */
    let tipEl = null, tipUk = [0, 0], tipXY = null, tipRaf = 0;
    const letakTip = () => { tipRaf = 0; if (!tipXY) return; const [x, y] = tipXY, [lebar, tinggi] = tipUk;
      tip.style.left = Math.min(window.innerWidth - lebar - 8, Math.max(8, x + 14)) + "px"; tip.style.top = Math.max(8, y - tinggi - 12) + "px"; };
    const tampilTip = (e, isi) => { const el = e.currentTarget || e.target;
      if (el !== tipEl || tip.hidden) { tipEl = el; tip.replaceChildren(...isi()); tip.hidden = false; tipUk = [tip.offsetWidth, tip.offsetHeight]; }
      const r = e.clientX == null ? el.getBoundingClientRect?.() : null; tipXY = [e.clientX ?? (r.left + r.width / 2), e.clientY ?? r.top];
      if (!tipRaf) tipRaf = requestAnimationFrame(letakTip); };
    const sembunyiTip = () => { tip.hidden = true; tipEl = null; tipXY = null; };
    /* satu titik Tab per grafik (roving tabindex, QA 25 Nov 2026): butir lain tabindex -1, panah kiri/kanan/atas/bawah, Home, End berpindah di grafik yang sama */
    const ikat = (el, isi, label) => { el.setAttribute("tabindex", "-1"); el.dataset.dtFokus = ""; el.setAttribute("role", "img"); el.setAttribute("aria-label", label);
      el.addEventListener("pointermove", e => tampilTip(e, isi)); el.addEventListener("pointerleave", sembunyiTip);
      el.addEventListener("focus", () => tampilTip({target: el, currentTarget: el}, isi)); el.addEventListener("blur", sembunyiTip); };
    const grupFokus = el => [...(el.closest("svg, .dt-gulir, table") || akar).querySelectorAll("[data-dt-fokus]")];
    let rovRaf = 0;
    const rove = () => { rovRaf = 0; for (const g of akar.querySelectorAll("svg, .dt-gulir, table")) { const b = [...g.querySelectorAll(":scope [data-dt-fokus]")].filter(x => x.closest("svg, .dt-gulir, table") === g);
      if (b.length && !b.some(x => x.tabIndex === 0)) b[0].tabIndex = 0; } };
    new MutationObserver(() => { if (!rovRaf) rovRaf = requestAnimationFrame(rove); }).observe(akar, {childList: true, subtree: true});
    akar.addEventListener("keydown", e => { const el = e.target.closest?.("[data-dt-fokus]"); if (!el) return;
      const b = grupFokus(el), i = b.indexOf(el), ke = {ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: b.length - 1}[e.key];
      if (ke == null || !b[ke]) return; e.preventDefault(); el.tabIndex = -1; b[ke].tabIndex = 0; b[ke].focus(); });
    const barisTip = (judul, baris) => [h("b", {teks: judul}), ...baris.map(([w, l, v]) => h("span", {class: "dt-tip-b"}, w ? warnai(h("i"), w, "background") : h("i", {class: "dt-tip-kosong"}), h("span", {teks: l}), h("strong", {teks: v})))];

    /* ---------- salin dan unduh kartu sebagai gambar (pemilik 25 Nov 2026) ----------
       Kartu disalin dengan gaya hasil hitung di tiap elemen, dibungkus SVG foreignObject, digambar ke kanvas 2x, lalu PNG.
       Font Inter (subset latin) disisipkan sebagai data URL saat pertama dipakai; tombol gambar sendiri tidak ikut.
       Baris kaki: wilayah, rentang, sumber, supaya gambar tetap bermakna bila dibagikan sendirian. */
    let fontGbr = null;
    const muatFontGbr = () => fontGbr ||= (async () => { try {
      const l = document.querySelector('link[href*="fonts.googleapis"]'); if (!l) return "";
      const css = (await (await fetch(l.href)).text()).split("/* ").filter(b => b.startsWith("latin */")).map(b => "/* " + b).join("");
      const urls = [...new Set(css.match(/https:[^)'"]+/g) || [])], data = await Promise.all(urls.map(async u => { const b = await (await fetch(u)).blob();
        return new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }); }));
      return urls.reduce((c, u, i) => c.split(u).join(data[i]), css); } catch (e) { return ""; } })();
    const namaBerkas = t => `${t} - ${wilNama()} ${st.dari === st.sampai ? st.dari : `${st.dari}-${st.sampai}`}`.replace(/[\\/:*?"<>|]+/g, " ").trim() + ".png";
    async function fotoKartu(sec) {
      const font = await muatFontGbr(), r = sec.getBoundingClientRect(), W = Math.ceil(r.width), cs0 = getComputedStyle(sec), klon = sec.cloneNode(true);
      const asal = [sec, ...sec.querySelectorAll("*")], sal = [klon, ...klon.querySelectorAll("*")];
      /* gaya disalin per 120 elemen lalu memberi jeda, supaya halaman dan putaran tombol tetap bergerak (pemilik: "jangan diem ngelag") */
      for (let i = 0; i < asal.length; i++) { const cs = getComputedStyle(asal[i]); let t = ""; for (const pr of cs) t += `${pr}:${cs.getPropertyValue(pr)};`; sal[i].setAttribute("style", t);
        if (i % 120 === 119) await new Promise(r => setTimeout(r)); }
      klon.querySelectorAll(".dt-k-gbr").forEach(x => x.remove());
      Object.assign(klon.style, {margin: "0", boxShadow: "none", inlineSize: W + "px", blockSize: "auto", maxInlineSize: "none"});
      const kaki = document.createElement("p"); kaki.textContent = `${wilNama()}, ${st.dari === st.sampai ? st.dari : `${st.dari} sampai ${st.sampai}`}. Sumber: DIBI BNPB.`;
      kaki.setAttribute("style", `margin:4px 0 0;font:500 12px Inter,sans-serif;color:${getComputedStyle(akar).getPropertyValue("--ink2") || "gray"};`);
      klon.append(kaki);
      /* ukur tinggi nyata klon (dengan kaki) di luar layar */
      const ukur = document.createElement("div"); ukur.setAttribute("style", "position:fixed;left:-99999px;top:0;"); ukur.append(klon); document.body.append(ukur);
      const H = Math.ceil(klon.getBoundingClientRect().height); ukur.remove();
      const isi = new XMLSerializer().serializeToString(klon);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${font}</style>${isi}</div></foreignObject></svg>`;
      const img = new Image(); img.decoding = "sync";
      await new Promise((ok, gagal) => { img.onload = ok; img.onerror = gagal; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg); });
      const k = 2, cv = document.createElement("canvas"); cv.width = W * k; cv.height = H * k;
      const g = cv.getContext("2d"); g.fillStyle = cs0.backgroundColor || "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.scale(k, k); g.drawImage(img, 0, 0);
      return new Promise((ok, gagal) => cv.toBlob(b => b ? ok(b) : gagal(new Error("kanvas kosong")), "image/png")); }
    /* tanda berhasil yang terlihat (pemilik 25 Nov 2026): ikon jadi centang dan label kecil di bawah tombol selama 1,8 detik; gagal: label merah tanpa centang */
    /* sedang memproses: ikon diganti lingkaran berputar seketika, lalu beri kesempatan layar menggambar sebelum kerja berat dimulai */
    const muatTombol = b => { clearTimeout(b._t); b._ik ||= b.firstElementChild;   /* ikon asli disimpan sekali, jadi klik saat centang masih tampil tidak menukar ikonnya */ b.dataset.muat = "1"; b.setAttribute("aria-busy", "true"); b.replaceChildren(h("span", {class: "dt-k-putar", "aria-hidden": "true"})); };
    const jedaGambar = () => new Promise(r => requestAnimationFrame(() => setTimeout(r)));
    const tandai = (b, teks, ok = true) => { const t0 = b.title, ik = b._ik || b.firstElementChild, lb = h("span", {class: "dt-k-gb-lbl", "aria-hidden": "true", teks});
      delete b.dataset.muat; b.removeAttribute("aria-busy"); b.replaceChildren(ik);
      b.querySelector(".dt-k-gb-lbl")?.remove(); if (ok) { b.dataset.ok = "1"; b.replaceChildren(ikon("centang"), lb); } else { b.dataset.gagal = "1"; b.append(lb); }
      b.title = teks; status.textContent = teks;
      clearTimeout(b._t); b._t = setTimeout(() => { delete b.dataset.ok; delete b.dataset.gagal; b.replaceChildren(ik); b.title = t0; }, 1800); };
    function pasangGbr() {
      /* kartu tabel tidak diberi tombol gambar: sudah ada Unduh CSV, dan gambar tabel bergulir hanya memuat bagian yang terlihat (pemilik: "tombol downloadnya ada 2") */
      for (const sec of akar.querySelectorAll(".dt-kartu")) { const kp = sec.querySelector(":scope > .dt-k-kepala"); if (!kp) continue; if (sec.closest("#dtPanel-tabel") || sec.querySelector(".dt-tabel")) { kp.querySelector(".dt-k-gbr")?.remove(); continue; } if (kp.querySelector(".dt-k-gbr")) continue;
        const judul = kp.querySelector("h3")?.textContent.trim() || "Grafik";
        const bS = h("button", {type: "button", class: "dt-k-gb", "aria-label": `Salin ${judul} sebagai gambar`, title: "Salin sebagai gambar"}, ikon("salin"));
        const bU = h("button", {type: "button", class: "dt-k-gb", "aria-label": `Unduh ${judul} sebagai gambar`, title: "Unduh gambar PNG"}, ikon("unduh"));
        bS.addEventListener("click", async () => { if (bS.dataset.muat) return; muatTombol(bS);
          try { const foto = jedaGambar().then(() => fotoKartu(sec)); await navigator.clipboard.write([new ClipboardItem({"image/png": foto})]); tandai(bS, "Tersalin"); }
          catch (e) { try { const b = await fotoKartu(sec), a = h("a", {href: URL.createObjectURL(b), download: namaBerkas(judul)}); a.click(); tandai(bS, "Diunduh, salin ditolak"); } catch (e2) { tandai(bS, "Gagal", false); } }
          });
        bU.addEventListener("click", async () => { if (bU.dataset.muat) return; muatTombol(bU); await jedaGambar();
          try { const b = await fotoKartu(sec), u = URL.createObjectURL(b), a = h("a", {href: u, download: namaBerkas(judul)}); a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000); tandai(bU, "Terunduh"); }
          catch (e) { tandai(bU, "Gagal", false); }
          });
        kp.append(h("div", {class: "dt-k-gbr"}, bS, bU)); } }

    /* ---------- grafik batang per tahun (bertumpuk) + garis rata-rata 5 tahun ---------- */
    function grafikTahun(wadah, seri0, {garis = true, k = "kejadian", tinggi = document.documentElement.classList.contains("dt-mencetak") ? 200 : 280} = {}) {   /* cetak: lebih pendek, tidak menyisakan halaman kosong */
      const W = Math.max(320, wadah.clientWidth || 640), H = tinggi, kiri = 52, kanan = 12, atas = 22, bawah = 26;
      /* rata-rata 5 tahun dihitung atas deret penuh (tahun sebelum rentang ikut), lalu hanya tahun dalam rentang yang digambar */
      const rataPenuh = ma5(D.tahun.map((_, i) => seri0.reduce((a, x) => a + x.nilai[i], 0))), dalam = D.tahun.map((t, i) => t >= st.dari && t <= st.sampai ? i : -1).filter(i => i >= 0);
      const th = dalam.map(i => D.tahun[i]), seri = seri0.map(x => ({...x, nilai: dalam.map(i => x.nilai[i])})), n = th.length, lebarB = (W - kiri - kanan) / n;
      const jumlah = th.map((_, i) => seri.reduce((a, x) => a + x.nilai[i], 0)), rata = dalam.map(i => rataPenuh[i]);
      const puncak = Math.max(1, ...jumlah, ...rata), p10 = 10 ** Math.floor(Math.log10(puncak / 4)), langkah = p10 * [1, 2, 2.5, 5, 10].find(m => p10 * m * 4 >= puncak);
      const maks = Math.ceil(puncak * 1.08 / langkah) * langkah, y = v => atas + (H - atas - bawah) * (1 - v / maks);
      const svg = s("svg", {viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "dt-svg", role: "group", "aria-label": `${LABEL[k]} per tahun, ${wilNama()}`});
      for (let v = 0; v <= maks + 1e-9; v += langkah) { const yy = y(v); svg.append(s("line", {x1: kiri, x2: W - kanan, y1: yy, y2: yy, class: "dt-grid"}), s("text", {x: kiri - 6, y: yy + 4, class: "dt-sumbu", "text-anchor": "end", teks: nilaiTeks(k, v)})); }
      const labelJml = [];   /* angka jumlah dikumpulkan lalu digambar paling akhir, di atas garis rata-rata */
      th.forEach((t, i) => {
        const x = kiri + i * lebarB, g = s("g", {class: "dt-batang" + (t === T.sementara ? " dt-sementara" : "")});
        let dasar = 0;
        for (const x0 of seri) { const v = x0.nilai[i]; if (!v) continue; const r = s("rect", {x: x + lebarB * .2, width: lebarB * .6, y: y(dasar + v), height: Math.max(.5, y(dasar) - y(dasar + v)), rx: 1.5}); warnai(r, x0.warna); g.append(r); dasar += v; }
        g.append(s("rect", {x, width: lebarB, y: atas, height: H - atas - bawah, class: "dt-sasar"}));
        /* label tahun dijarangkan menurut lebar batang (+-38 px per label "2026*") supaya tidak bertumpuk di grafik sempit; dihitung dari kanan agar tahun terakhir selalu tampil */
        if ((n - 1 - i) % Math.max(1, Math.ceil(38 / lebarB)) === 0) svg.append(s("text", {x: x + lebarB / 2, y: H - 8, class: "dt-sumbu", "text-anchor": "middle", teks: t === T.sementara ? t + "*" : String(t)}));
        if (jumlah[i] && W / n > 34) labelJml.push(s("text", {x: x + lebarB / 2, y: y(jumlah[i]) - 7,   /* angka jumlah selalu di atas batangnya sendiri, tidak menumpang titik garis rata-rata (pemilik 25 Nov 2026) */ class: "dt-nilai", "text-anchor": "middle", teks: ringkas(SATUAN[k] === "rp" ? jumlah[i] * 1e6 : jumlah[i]).replace(" ribu", " rb").replace(" juta", " jt").replace(" miliar", " M").replace(" triliun", " T")}));
        ikat(g, () => barisTip(`${t}${t === T.sementara ? ", sementara" : ""}`, [...seri.filter(x0 => x0.nilai[i]).map(x0 => [x0.warna, x0.nama, nilaiPenuh(k, x0.nilai[i])]),
          ...(seri.length > 1 ? [[null, "Jumlah", nilaiPenuh(k, jumlah[i])]] : []), ...(garis ? [[null, "Rata-rata 5 tahun", nilaiPenuh(k, rata[i])]] : [])]), `${t}: ${nilaiPenuh(k, jumlah[i])}`);
        svg.append(g);
      });
      if (garis) { const p = rata.map((v, i) => `${i ? "L" : "M"}${(kiri + (i + .5) * lebarB).toFixed(1)},${y(v).toFixed(1)}`).join("");
        svg.append(s("path", {d: p, class: "dt-garis"}), ...rata.map((v, i) => s("circle", {cx: kiri + (i + .5) * lebarB, cy: y(v), r: 2.5, class: "dt-titik"}))); }
      svg.append(...labelJml);
      wadah.replaceChildren(svg);
    }
    const legenda = (seri, garis) => h("div", {class: "dt-legenda"}, seri.map(x => h("span", {}, warnai(h("i"), x.warna, "background"), h("span", {teks: x.nama}))),
      garis ? h("span", {class: "dt-leg-garis"}, h("i"), h("span", {teks: "Rata-rata 5 tahun"})) : null, h("span", {class: "dt-leg-ket", teks: `* ${T.sementara} sementara`}));
    const seriKat = k => { const m = pertahun(k, true), kats = kategoriAda.filter(x => st.kat.has(x));
      return kats.map(x => { const i = idxKat.get(x); return {nama: kat(x)[0], warna: kat(x)[2], nilai: D.tahun.map(t => m.get(t).get(i) || 0)}; }).filter(x => x.nilai.some(Boolean)); };
    const seriSatu = (k, nama, warna) => { const m = pertahun(k); return [{nama, warna, nilai: D.tahun.map(t => m.get(t))}]; };

    /* pemilih segmen (penuh lebar, dibagi rata) */
    const segmen = (pil, nilai, ubah, label) => { const g = h("div", {class: "dt-seg", role: "radiogroup", "aria-label": label});
      const bs = pil.map(([v, t]) => { const b = h("button", {type: "button", role: "radio", "aria-checked": String(v === nilai), teks: t});
        b.addEventListener("click", () => { bs.forEach(x => x.setAttribute("aria-checked", String(x === b))); ubah(v); }); return b; }); g.append(...bs); return g; };
    const kartu = (ik, judul, alat, ...isi) => h("section", {class: "dt-kartu"}, h("div", {class: "dt-k-kepala"}, h("h3", {}, ikon(ik), h("span", {teks: judul})), alat || null), ...isi);

    /* ---------- ringkasan angka ---------- */
    function gambarRingkasan() {
      const n = st.sampai - st.dari + 1, rentang = st.dari === st.sampai ? String(st.dari) : `${st.dari} sampai ${st.sampai}`;
      if (DAS && st.tab === "peta") judulPeta(); else judulWil.textContent = `${wilNama()}, ${rentang}`;
      segarKetik(); requestAnimationFrame(() => segarTurun());
      const kotak = [["kejadian", "Kejadian", "data"], ["mdh", "Meninggal dan hilang", "personel"], ["luka", "Luka dan sakit", "personel"],
        ["terdampak", "Menderita dan mengungsi", "ungsi"], ["rumah", "Rumah rusak", "rumah"], ["rugi_rumah", "Estimasi kerugian rumah", "dana"]];
      /* jumlah per jenis untuk pil di tombol jenis: saringan wilayah dan tahun, tanpa saringan jenis */
      const perJenis = new Map();
      for (const r of T.tahun_kab) { if (r[0] < st.dari || r[0] > st.sampai || (st.kab >= 0 ? r[2] !== st.kab : st.prov && T.kab[r[2]][1] !== st.prov)) continue;
        const nk = T.kategori[r[1]]; perJenis.set(nk, (perJenis.get(nk) || 0) + r[C.kejadian]); }
      chips.forEach(b => { const v = perJenis.get(b.dataset.k) || 0; b.querySelector(".dt-chip-n").textContent = F(Math.round(v)); b.classList.toggle("dt-nol", !v); });
      segarPeriode();
      if (!DAS) { ringkasan.replaceChildren(...kotak.map(([k, l, ik]) => { const v = total(k);
        return h("div", {class: "dt-kpi-k"}, h("span", {class: "dt-kpi-l"}, ikon(ik), h("span", {teks: l})), h("b", {teks: nilaiTeks(k, Math.round(v))}),
          n > 1 ? h("small", {teks: `${nilaiTeks(k, v / n)} per tahun`}) : null); })); return; }
      /* Ringkasan kanan gaya /lapor/meja: kelompok berlabel, baris ikon, label, angka; lalu kab/kota terbanyak */
      const baris = (ik, l, k, v = total(k)) => h("div", {class: "db-rk-b"}, h("span", {class: "db-rk-ik"}, ikon(ik)), h("span", {teks: l}), h("b", {teks: nilaiTeks(k, Math.round(k === "lahan_ha" ? v * 10 : v) / (k === "lahan_ha" ? 10 : 1))}));
      const kej = total("kejadian"), perKab = new Map();
      for (const r of T.tahun_kab) if (lolos(r)) perKab.set(r[2], (perKab.get(r[2]) || 0) + r[C.kejadian]);
      const top = [...perKab].sort((a, b) => b[1] - a[1]).slice(0, 5), maks = top[0]?.[1] || 1;
      ringkasan.replaceChildren(
        /* kepala Ringkasan (pemilik 25 Nov 2026 "bagusin"): kotak lembut seperti "Jumlah kejadian bencana" di Ringkasan peta;
           rata-rata per tahun baris sendiri; pil sementara hanya bila rentang tahun memuat tahun sementara */
        h("div", {class: "db-rk-kepala"}, h("span", {class: "db-rk-kecil", teks: "Jumlah kejadian bencana"}),
          h("p", {class: "db-rk-besar"}, h("b", {teks: F(Math.round(kej))}), h("span", {teks: "kejadian"})),
          n > 1 ? h("p", {class: "db-rk-rata"}, "Rata-rata ", h("b", {teks: F(Math.round(kej / n))}), " per tahun") : "",
          h("p", {class: "db-rk-wil"}, judulWil), +T.sementara >= st.dari && +T.sementara <= st.sampai ? pilSementara : ""),
        jenisBlok,
        h("p", {class: "db-rk-label", teks: "Korban"}), baris("personel", "Meninggal", "meninggal"), baris("personel", "Hilang", "hilang"), baris("obat", "Luka dan sakit", "luka"), baris("ungsi", "Menderita dan mengungsi", "terdampak"),
        h("p", {class: "db-rk-label", teks: "Rumah"}), baris("rumah", "Rusak berat", "rr_berat"), baris("rumah", "Rusak sedang", "rr_sedang"), baris("rumah", "Rusak ringan", "rr_ringan"), baris("air", "Terendam", "terendam"),
        h("p", {class: "db-rk-label", teks: "Fasilitas dan lahan"}), baris("data", "Satuan pendidikan", "f_pendidikan"), baris("sosial", "Rumah ibadat", "f_ibadah"), baris("obat", "Fasilitas kesehatan", "f_kesehatan"),
        baris("wilayah", "Kantor", "f_kantor"), baris("akses", "Jembatan", "jembatan"), baris("gambut", "Lahan rusak", "lahan_ha"),
        h("p", {class: "db-rk-label", teks: "Kerugian"}), baris("dana", "Estimasi kerugian rumah", "rugi_rumah"),
        h("p", {class: "db-rk-label", teks: "Penanganan saat ini"}), ...penanganan(),
        top.length > 1 ? h("p", {class: "db-rk-label", teks: "Kab/kota terbanyak"}) : "",
        top.length > 1 ? h("ol", {class: "db-rk-kab"}, top.map(([i, v], j) => h("li", {}, h("span", {class: "db-rk-no", teks: String(j + 1)}), h("span", {teks: T.kab[i][2]}), h("b", {teks: F(Math.round(v))}),
          (() => { const g = h("i"); g.style.inlineSize = (v / maks * 100).toFixed(1) + "%"; return g; })()))) : "");
    }

    /* status darurat aktif, posko pengungsian, rambu evakuasi IDRIP untuk wilayah terpilih (tidak ikut saringan tahun dan jenis) */
    function penanganan() {
      const kode = st.kab >= 0 ? T.kab[st.kab][0] : "", cocok = x => kode ? x.kab === kode : !st.prov || x.prov === st.prov;
      const b = (ik, l, v, ada) => h("div", {class: "db-rk-b"}, h("span", {class: "db-rk-ik"}, ikon(ik)), h("span", {teks: l}), h("b", {teks: ada ? F(v) : "–"}));
      const pk = D.posko.filter(cocok);
      return [b("tenda", "Status darurat aktif", D.darurat.filter(cocok).length, D.ada.darurat), b("ungsi", "Posko pengungsian", pk.length, D.ada.posko),
        b("personel", "Jiwa di posko", pk.reduce((a, x) => a + x.jiwa, 0), D.ada.posko), b("akses", "Rambu evakuasi IDRIP", D.rambu.filter(cocok).reduce((a, x) => a + x.n, 0), D.ada.rambu)];
    }

    /* ---------- tab Tren ---------- */
    const bTren = {kej: h("div", {class: "dt-grafik"}), korban: h("div", {class: "dt-grafik"}), rumah: h("div", {class: "dt-grafik"}), legKej: h("div"), legKorban: h("div"), legRumah: h("div"),
      bulan: h("div", {class: "dt-bulan"}), musim: h("div"), musimKet: h("span", {class: "dt-pil dt-pil-netral"}), banding: h("div", {class: "dt-banding"}), hari: h("div", {class: "dt-hari"}), legHari: h("div", {class: "dt-legenda"})};
    panel.tren.append(h("div", {class: "dt-isi"},
      kartu("data", "Kejadian per tahun", null, bTren.kej, bTren.legKej),
      h("div", {class: "dt-dua"},
        kartu("personel", "Korban per tahun", segmen([["mdh", "Meninggal dan hilang"], ["luka", "Luka"], ["terdampak", "Menderita dan mengungsi"]], st.korban, v => { st.korban = v; nanti(trenKorban); }, "Jenis korban"), bTren.korban, bTren.legKorban),
        kartu("rumah", "Kerusakan rumah per tahun", segmen([["rumah", "Jumlah rumah"], ["rugi_rumah", "Estimasi kerugian"]], st.rumah, v => { st.rumah = v; nanti(trenRumah); }, "Ukuran kerusakan"), bTren.rumah, bTren.legRumah)),
      kartu("kalender", "Kejadian per bulan", null, bTren.banding, bTren.bulan),
      kartu("cuaca", "Bulan rawan per jenis bencana", bTren.musimKet, bTren.musim),
      kartu("kalender", "Kejadian per hari, 365 hari terakhir", segmen([["kejadian", "Kejadian"], ["mdh", "Meninggal dan hilang"], ["terdampak", "Menderita dan mengungsi"], ["rumah", "Rumah rusak"]], st.hari, v => { st.hari = v; nanti(trenHari); }, "Ukuran harian"), bTren.hari, bTren.legHari)));

    const trenKej = () => { const seri = seriKat("kejadian"); grafikTahun(bTren.kej, seri); bTren.legKej.replaceChildren(legenda(seri, true)); };
    const WARNA_KORBAN = {mdh: "--kat-erupsi", luka: "--kat-karhutla", terdampak: "--kat-banjir"};
    const trenKorban = () => { const seri = seriSatu(st.korban, LABEL[st.korban], WARNA_KORBAN[st.korban]); grafikTahun(bTren.korban, seri, {k: st.korban}); bTren.legKorban.replaceChildren(legenda(seri, true)); };
    const trenRumah = () => {
      const pake = st.rumah === "rugi_rumah", bobot = {rr_berat: 60, rr_sedang: 30, rr_ringan: 15, terendam: 1};
      const kol = pake ? ["rr_berat", "rr_sedang", "rr_ringan", "terendam"] : ["rr_berat", "rr_sedang", "rr_ringan"], w = {rr_berat: "--kat-erupsi", rr_sedang: "--kat-karhutla", rr_ringan: "--kat-gempa", terendam: "--kat-banjir"};
      const seri = kol.map(c => { const m = pertahun(c); return {nama: LABEL[c].replace("Rumah rusak ", "Rusak "), warna: w[c], nilai: D.tahun.map(t => m.get(t) * (pake ? bobot[c] : 1))}; });
      grafikTahun(bTren.rumah, seri, {k: pake ? "rugi_rumah" : "rumah"}); bTren.legRumah.replaceChildren(legenda(seri, true));
    };

    /* rincian per jenis di tooltip kalender (pemilik 25 Nov 2026): Map kategori -> nilai, terbesar dulu, bertitik warna kategori */
    const barisJenis = (per, fmt) => per ? [...per].filter(([, v]) => v).sort((a, b) => b[1] - a[1]).map(([kk, v]) => [kat(kk)[2], kat(kk)[0], fmt(v)]) : [];
    const tambahPer = (peta, kunci, kk, v) => { let p = peta.get(kunci); if (!p) peta.set(kunci, p = new Map()); p.set(kk, (p.get(kk) || 0) + v); };

    /* kalender bulan: baris tahun x kolom bulan, intensitas = kejadian */
    function trenBulan() {
      const m = new Map(); let maks = 1;
      const lolosB = r => st.kat.has(T.kategori[r[1]]) && (!st.prov || r[2] === st.prov);
      const mk = new Map();
      for (const r of T.bulan_prov) { if (!lolosB(r)) continue; const v = r[CB.kejadian]; m.set(r[0], (m.get(r[0]) || 0) + v); tambahPer(mk, r[0], T.kategori[r[1]], v); }
      for (const v of m.values()) maks = Math.max(maks, v);
      const thn = D.tahun.filter(t => t >= st.dari && t <= st.sampai).reverse();
      /* di atas biasanya: lebih dari rata-rata + 2 simpangan baku bulan yang sama 5 tahun sebelumnya, sekaligus paling sedikit 1,5 kali rata-rata
         dan selisih paling sedikit 3 kejadian (tren naik jangka panjang tidak membuat semua sel bertanda);
         butuh 5 tahun riwayat penuh; bulan berjalan tidak dinilai */
      const bulanKini = new Date().getFullYear() * 100 + new Date().getMonth() + 1;
      const atas = (t, i, v) => { if (t - 5 < D.tahun[0] || t * 100 + i + 1 >= bulanKini) return null;
        const lalu = [1, 2, 3, 4, 5].map(j => m.get((t - j) * 100 + i + 1) || 0), rata = lalu.reduce((x, y) => x + y, 0) / 5;
        const sb = Math.sqrt(lalu.reduce((x, y) => x + (y - rata) ** 2, 0) / 5); return v > rata + 2 * sb && v >= 1.5 * rata && v - rata >= 3 ? {rata} : null; };
      const kisi = h("div", {class: "dt-kal", role: "grid", "aria-label": "Kejadian per bulan"},
        h("div", {class: "dt-kal-baris dt-kal-kepala", role: "row"}, h("span", {role: "columnheader"}), BLN.map(b => h("span", {role: "columnheader", teks: b})), h("span", {role: "columnheader", teks: "Jumlah"})),
        thn.map(t => { let jml = 0; return h("div", {class: "dt-kal-baris", role: "row"}, h("span", {role: "rowheader", class: "dt-kal-th", teks: t === T.sementara ? t + "*" : String(t)}),
          BLN.map((b, i) => { const v = m.get(t * 100 + i + 1) || 0; jml += v; const c = h("span", {role: "gridcell", class: "dt-kal-sel", "data-tingkat": v ? String(Math.min(5, Math.ceil(v / maks * 5))) : "0", teks: v ? F(v) : ""});
            const a = atas(t, i, v); if (a) c.classList.add("dt-kal-atas");
            ikat(c, () => barisTip(`${BLN_PANJANG[i]} ${t}`, [[null, "Kejadian", F(v)], ...barisJenis(mk.get(t * 100 + i + 1), F),
              ...(a ? [[null, "Rata-rata 5 tahun sebelumnya", F(Math.round(a.rata * 10) / 10)], [null, "Penanda", "di atas biasanya"]] : [])]),
              `${BLN_PANJANG[i]} ${t}: ${F(v)} kejadian${a ? ", di atas biasanya" : ""}`); c.setAttribute("role", "gridcell"); return c; }),
          h("span", {role: "gridcell", class: "dt-kal-jml", teks: F(jml)})); }));
      bTren.bulan.replaceChildren(st.kab >= 0 ? h("p", {class: "dt-catatan", teks: "Data bulanan DIBI tersedia sampai tingkat provinsi. Yang tampil: " + (PROV[st.prov] || st.prov) + "."}) : "", h("div", {class: "dt-gulir", tabindex: "0", role: "region", "aria-label": "Kalender kejadian per bulan"}, kisi),
        h("div", {class: "dt-legenda"}, h("span", {teks: "Sedikit"}), [1, 2, 3, 4, 5].map(i => h("i", {class: "dt-kal-sel", "data-tingkat": String(i)})), h("span", {teks: "Banyak"}),
          h("span", {class: "dt-leg-atas", title: "Lebih dari rata-rata ditambah dua simpangan baku, dan paling sedikit 1,5 kali rata-rata, bulan yang sama lima tahun sebelumnya"}, h("i", {class: "dt-kal-sel dt-kal-atas", "data-tingkat": "3"}), h("span", {teks: "Di atas biasanya"}))));
      // bulan terakhir lawan bulan yang sama tahun lalu (seperti tab Bulanan DIBI)
      /* bulan berjalan belum genap: bandingkan bulan penuh terakhir */
      const kini = new Date(), bulanIni = kini.getFullYear() * 100 + kini.getMonth() + 1;
      const akhir = Math.max(...[...m.keys()].filter(k => m.get(k) && k < bulanIni), 0); if (!akhir) { bTren.banding.replaceChildren(); return; }
      const lalu = akhir - 100, jumlahB = (ym, k) => { let n = 0; for (const r of T.bulan_prov) if (r[0] === ym && lolosB(r)) n += ambilNilai(r, k, CB); return n; };
      const nmB = ym => `${BLN_PANJANG[ym % 100 - 1]} ${Math.floor(ym / 100)}`;
      bTren.banding.replaceChildren(h("p", {class: "dt-sub", teks: `${nmB(akhir)} lawan ${nmB(lalu)}`}), h("div", {class: "dt-kpi dt-kpi-kecil"},
        [["kejadian", "Kejadian"], ["terdampak", "Menderita dan mengungsi"], ["rumah", "Rumah rusak"], ["rugi_rumah", "Estimasi kerugian rumah"]].map(([k, l]) => {
          const a = jumlahB(akhir, k), b = jumlahB(lalu, k), p = b ? Math.round((a - b) / b * 100) : null;
          return h("div", {class: "dt-kpi-k"}, h("span", {class: "dt-kpi-l", teks: l}), h("b", {teks: nilaiTeks(k, a)}),
            h("small", {class: p == null ? "" : p > 0 ? "dt-naik" : p < 0 ? "dt-turun" : "", teks: p == null ? `${nmB(lalu)}: tidak ada` : `${p > 0 ? "naik" : p < 0 ? "turun" : "sama"} ${p ? F(Math.abs(p)) + " persen" : ""} dari ${nilaiTeks(k, b)}`.replace("  ", " ")})); })));
    }

    /* bulan rawan: pola bulanan tiap jenis, tahun final saja (tanpa tahun sementara). Per kab/kota dari musim_kab bila ada, selain itu per provinsi. */
    function trenMusim(wadah = bTren.musim, ket = bTren.musimKet) {
      const per = new Map(), tambah = (ki, i, v) => { if (!per.has(ki)) per.set(ki, Array(12).fill(0)); per.get(ki)[i] += v; };
      const tingkatKab = st.kab >= 0 && T.musim_kab, akhirFinal = T.sementara - 1;
      if (tingkatKab) { const c0 = 2; for (const r of T.musim_kab) if (r[0] === st.kab) for (let i = 0; i < 12; i++) tambah(r[1], i, r[c0 + i] || 0); }
      else for (const r of T.bulan_prov) { const th = Math.floor(r[0] / 100); if (th >= T.sementara || (st.prov && r[2] !== st.prov)) continue; tambah(r[1], r[0] % 100 - 1, r[CB.kejadian]); }
      ket.textContent = `Pola ${D.tahun[0]} sampai ${akhirFinal}, ${tingkatKab ? T.kab[st.kab][2] : st.prov ? PROV[st.prov] || st.prov : "Indonesia"}`;
      const baris = kategoriAda.filter(k => st.kat.has(k) && per.has(idxKat.get(k))).map(k => ({k, n: per.get(idxKat.get(k))})).map(x => ({...x, jml: x.n.reduce((a, b) => a + b, 0)})).filter(x => x.jml).sort((a, b) => b.jml - a.jml);
      if (!baris.length) { wadah.replaceChildren(h("p", {class: "dt-catatan", teks: "Belum ada kejadian tercatat untuk saringan ini."})); return; }
      const kisi = h("div", {class: "dt-kal dt-musim", role: "grid", "aria-label": "Bulan rawan per jenis bencana"},
        h("div", {class: "dt-kal-baris dt-kal-kepala", role: "row"}, h("span", {role: "columnheader", teks: "Jenis"}), BLN.map(b => h("span", {role: "columnheader", teks: b})), h("span", {role: "columnheader", teks: "Puncak"})),
        baris.map(({k, n, jml}) => { const maks = Math.max(...n), puncak = n.map((v, i) => v === maks ? BLN[i] : null).filter(Boolean);
          return h("div", {class: "dt-kal-baris", role: "row"}, h("span", {role: "rowheader", class: "dt-kal-th dt-musim-nama"}, warnai(h("i"), kat(k)[2], "background"), h("span", {teks: kat(k)[0]})),
            n.map((v, i) => { const p = v / jml * 100, c = h("span", {role: "gridcell", class: "dt-kal-sel" + (v === maks ? " dt-puncak" : ""), "data-tingkat": v ? String(Math.min(5, Math.ceil(v / maks * 5))) : "0", teks: v ? (p < 1 ? "<1%" : F(Math.round(p)) + "%") : ""});
              ikat(c, () => barisTip(`${kat(k)[0]}, ${BLN_PANJANG[i]}`, [[null, "Kejadian", F(v)], [null, "Bagian dari setahun", F(Math.round(p * 10) / 10) + "%"]]), `${kat(k)[0]} ${BLN_PANJANG[i]}: ${F(Math.round(p))} persen`); c.setAttribute("role", "gridcell"); return c; }),
            h("span", {role: "gridcell", class: "dt-kal-jml", title: `${F(jml)} kejadian`, teks: jml < 12 ? "data sedikit" : puncak.join(", ")})); }));
      wadah.replaceChildren(h("div", {class: "dt-gulir", tabindex: "0", role: "region", "aria-label": "Tabel bulan rawan"}, kisi),
        st.kab >= 0 && !T.musim_kab ? h("p", {class: "dt-catatan", teks: `Pola bulanan per kabupaten/kota belum tersedia. Yang tampil: ${PROV[st.prov] || st.prov}.`}) : "");
    }

    /* kalender harian 365 hari dari dibi_kejadian.json */
    function trenHari() {
      if (!D.harian.length || !D.sampaiH) { bTren.hari.replaceChildren(h("p", {class: "dt-catatan", teks: "Data harian belum tersedia."})); bTren.legHari.replaceChildren(); return; }
      const k = st.hari, nilai = x => k === "kejadian" ? x.kejadian || 0 : k === "mdh" ? (x.meninggal || 0) + (x.hilang || 0) : k === "terdampak" ? (x.terdampak || 0) + (x.mengungsi || 0) : (x.rr_berat || 0) + (x.rr_sedang || 0) + (x.rr_ringan || 0);
      const m = new Map(), mk = new Map();
      for (const x of D.harian) { if (!st.kat.has(x.kat) || (st.kab >= 0 ? x.i !== st.kab : st.prov && x.prov !== st.prov)) continue; const v = nilai(x); m.set(x.tanggal, (m.get(x.tanggal) || 0) + v); tambahPer(mk, x.tanggal, x.kat, v); }
      const akhir = new Date(D.sampaiH + "T00:00:00Z"), awal = new Date(akhir); awal.setUTCDate(awal.getUTCDate() - 364); awal.setUTCDate(awal.getUTCDate() - awal.getUTCDay());
      const hari = []; for (let d = new Date(awal); d <= akhir; d.setUTCDate(d.getUTCDate() + 1)) hari.push(d.toISOString().slice(0, 10));
      const nilaiAda = [...m.values()].filter(Boolean).sort((a, b) => a - b), batas = [.2, .4, .6, .8].map(p => nilaiAda[Math.floor(p * (nilaiAda.length - 1))] || 1);
      const tingkat = v => !v ? 0 : 1 + batas.filter(b => v > b).length;
      const kol = Math.ceil(hari.length / 7), sel = 13, jarak = 3, kiriL = 26, atasL = 16, W = kiriL + kol * (sel + jarak), H = atasL + 7 * (sel + jarak);
      const svg = s("svg", {viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "dt-svg dt-svg-hari", role: "group", "aria-label": `${LABEL[k]} per hari, ${wilNama()}`});
      ["Min", "", "Sel", "", "Kam", "", "Sab"].forEach((t, i) => t && svg.append(s("text", {x: 0, y: atasL + i * (sel + jarak) + 10, class: "dt-sumbu", teks: t})));
      let blnLalu = -1;
      hari.forEach((tg, i) => { const c = Math.floor(i / 7), r = i % 7, v = m.get(tg) || 0, bl = +tg.slice(5, 7) - 1;
        if (r === 0 && bl !== blnLalu) { svg.append(s("text", {x: kiriL + c * (sel + jarak), y: 10, class: "dt-sumbu", teks: BLN[bl]})); blnLalu = bl; }
        const kotak = s("rect", {x: kiriL + c * (sel + jarak), y: atasL + r * (sel + jarak), width: sel, height: sel, rx: 2.5, class: "dt-hari-sel", "data-tingkat": String(tingkat(v))});
        const [y, mo, d] = tg.split("-"); ikat(kotak, () => barisTip(`${+d} ${BLN_PANJANG[+mo - 1]} ${y}`, [[null, LABEL[k], nilaiPenuh(k, v)], ...barisJenis(mk.get(tg), x => nilaiPenuh(k, x))]), `${+d} ${BLN_PANJANG[+mo - 1]} ${y}: ${nilaiPenuh(k, v)}`);
        svg.append(kotak); });
      bTren.hari.replaceChildren(h("div", {class: "dt-gulir", tabindex: "0", role: "region", "aria-label": "Kalender harian"}, svg));
      const jml = [...m.values()].reduce((a, b) => a + b, 0);
      bTren.legHari.replaceChildren(h("span", {teks: "Sedikit"}), ...[0, 1, 2, 3, 4, 5].map(i => h("i", {class: "dt-hari-sel", "data-tingkat": String(i)})), h("span", {teks: "Banyak"}),
        h("span", {class: "dt-leg-ket", teks: `Jumlah 365 hari: ${nilaiPenuh(k, jml)}. Saringan tahun tidak berlaku di sini.`}));
    }

    /* ---------- tab Sebaran ---------- */
    const pSebar = h("select", {id: "dtUkur"}, pilihan(st.sebar, UKUR.map(([k, l]) => [k, l])));
    pSebar.addEventListener("change", () => { st.sebar = pSebar.value; nanti(gambarSebaran); });
    /* tata letak Sebaran (pemilik 25 Nov 2026 "tingkatkan ui/ux"): bilah ukuran; kartu komposisi jenis (satu batang 100% + legenda angka,
       menggantikan daftar per kategori yang mengulang Ringkasan dan sekaligus jadi legenda warna batang wilayah); per wilayah dan kab/kota terbanyak berdampingan,
       10 teratas dulu dengan tombol tampilkan semua; di tingkat provinsi kartu kab/kota terbanyak disembunyikan karena isinya sama */
    const bSeb = {kat: h("div", {class: "dt-komp"}), wil: h("div", {class: "dt-hbar"}), kab: h("div", {class: "dt-hbar"}), judulWil: h("span"), judulKab: h("span"), ketWil: h("small", {class: "dt-k-ket"})};
    const kartuKab = h("section", {class: "dt-kartu"}, h("div", {class: "dt-k-kepala"}, h("h3", {}, ikon("peringkat"), bSeb.judulKab)), bSeb.kab);
    const duaSeb = h("div", {class: "dt-dua"}, h("section", {class: "dt-kartu"}, h("div", {class: "dt-k-kepala"}, h("h3", {}, ikon("wilayah"), bSeb.judulWil)), bSeb.ketWil, bSeb.wil), kartuKab);
    panel.sebaran.append(h("div", {class: "dt-isi"},
      h("div", {class: "dt-sebar-alat"}, h("label", {class: "dt-sebar-ukur"}, ikon("data"), h("span", {class: "dt-sr", teks: "Ukuran"}), pSebar),
        T.penduduk ? segmen([[false, "Jumlah"], [true, "Per 100 ribu jiwa per tahun"]], st.per100, v => { st.per100 = v; nanti(gambarSebaran); }, "Cara hitung wilayah") : null),
      kartu("daftar", "Komposisi per jenis bencana", null, bSeb.kat), duaSeb));
    function batangDatar(wadah, daftar, k, {klik, perKat, total, teks, batas = 10, pilih} = {}) {
      const maks = Math.max(1, ...daftar.map(x => x.v)), jumlah = total ?? daftar.reduce((a, x) => a + x.v, 0);
      const ada = daftar.filter(x => x.v), iPilih = pilih != null ? ada.findIndex(x => x.kode === pilih) : -1, potong = !wadah._semua && ada.length > batas + 2 && iPilih < batas;   /* wilayah terpilih di luar 10 teratas: tampil semua */   /* 10 teratas dulu; bila hanya lebih 1-2 baris, tampil semua */
      if (!jumlah) { wadah.replaceChildren(h("p", {class: "dt-catatan", teks: `Tidak ada ${LABEL[k].toLowerCase()} tercatat untuk saringan ini.`})); return; }
      const lagi = ada.length > batas + 2 ? h("button", {type: "button", class: "dt-hb-lagi", "aria-expanded": String(!potong), teks: potong ? `Tampilkan semua ${F(ada.length)}` : "Tampilkan 10 teratas"}) : null;
      if (lagi) lagi.addEventListener("click", () => { wadah._semua = potong; gambarSebaran(); });
      wadah.replaceChildren(h("ol", {class: "dt-hb-daftar"}, (potong ? ada.slice(0, batas) : ada).map((x, i) => {
        const bar = h("span", {class: "dt-hb-bar"}); bar.style.inlineSize = (x.v / maks * 100).toFixed(2) + "%";
        if (perKat) for (const [kk, v] of [...perKat(x)].sort((a, b) => URUT_KAT.indexOf(a[0]) - URUT_KAT.indexOf(b[0]))) { const seg = warnai(h("i"), kat(kk)[2], "background"); seg.style.flexGrow = String(v); bar.append(seg); } else bar.append(warnai(h("i"), x.warna || "--brand2", "background"));
        const isi = [h("span", {class: "dt-hb-no", teks: String(i + 1)}), h("span", {class: "dt-hb-nama"}, x.ikon ? ikon(x.ikon) : null, h("span", {teks: x.nama, title: x.nama})), h("span", {class: "dt-hb-jalur"}, bar),
          h("b", {teks: teks ? teks(x.v) : SATUAN[k] === "rp" ? nilaiTeks(k, x.v) : F(Math.round(x.v)) + (SATUAN[k] === "ha" ? " ha" : "")})   /* angka penuh di semua baris: dulu 18.951 jadi "19 ribu" sementara 9.516 tetap utuh (QA 25 Nov 2026) */, h("small", {teks: teks ? "" : F(Math.round(x.v / jumlah * 1000) / 10) + "%"})];
        const dipilih = pilih != null && x.kode === pilih;
        const baris = klik ? h("button", {type: "button", class: "dt-hb-baris" + (dipilih ? " dt-hb-pilih" : ""), "aria-current": dipilih ? "true" : null, title: dipilih ? `${x.nama} sedang dipilih, klik untuk melepas` : `Saring ke ${x.nama}`}, isi) : h("div", {class: "dt-hb-baris"}, isi);
        if (klik) baris.addEventListener("click", () => klik(x));
        if (perKat) ikat(baris, () => barisTip(x.nama, [...[...perKat(x)].sort((a, b) => b[1] - a[1]).map(([kk, v]) => [kat(kk)[2], kat(kk)[0], nilaiPenuh(k, v)]),
          ...(teks ? [[null, "Per 100 ribu penduduk per tahun", teks(x.v)], [null, "Penduduk", F(x.pend)]] : [])]), `${x.nama}: ${teks ? teks(x.v) + " per 100 ribu penduduk per tahun" : nilaiPenuh(k, x.v)}`), baris.removeAttribute("role");
        return h("li", {}, baris); })), lagi || "");
    }
    /* komposisi jenis: satu batang 100% bertumpuk + legenda berangka (terbesar dulu); juga legenda warna batang wilayah */
    function komposisi(wadah, perKat, k) {
      const daftar = [...perKat].filter(([, v]) => v).sort((a, b) => b[1] - a[1]), jml = daftar.reduce((a, [, v]) => a + v, 0);
      if (!jml) { wadah.replaceChildren(h("p", {class: "dt-catatan", teks: `Tidak ada ${LABEL[k].toLowerCase()} tercatat untuk saringan ini.`})); return; }
      const bar = h("div", {class: "dt-komp-bar", role: "img", "aria-label": `Komposisi ${LABEL[k].toLowerCase()} per jenis bencana`});
      const leg = h("ul", {class: "dt-komp-leg"});
      for (const [nk, v] of daftar) { const p = v / jml * 100, seg = warnai(h("i"), kat(nk)[2], "background"); seg.style.flexGrow = String(v);
        ikat(seg, () => barisTip(kat(nk)[0], [[kat(nk)[2], LABEL[k], nilaiPenuh(k, v)], [null, "Bagian", F(Math.round(p * 10) / 10) + "%"]]), `${kat(nk)[0]}: ${nilaiPenuh(k, v)}`); bar.append(seg);
        leg.append(h("li", {}, warnai(h("i"), kat(nk)[2], "background"), h("span", {teks: kat(nk)[0]}), h("b", {teks: SATUAN[k] === "rp" ? nilaiTeks(k, v) : F(Math.round(v))}), h("small", {teks: p < 0.1 ? "<0,1%" : F(Math.round(p * 10) / 10) + "%"}))); }
      wadah.replaceChildren(bar, leg);
    }
    function gambarSebaran() {
      const k = st.sebar, perKat = new Map(), perWil = new Map(), perKab = new Map(), tingkatKab = !!st.prov;
      /* daftar wilayah memakai seluruh provinsi walau satu kab/kota dipilih (QA 25 Nov 2026: dulu tinggal 1 baris, tak ada pembanding); kab terpilih disorot */
      const lolosWil = r => st.kat.has(T.kategori[r[1]]) && r[0] >= st.dari && r[0] <= st.sampai && (!st.prov || T.kab[r[2]][1] === st.prov);
      for (const r of T.tahun_kab) { if (!lolosWil(r)) continue; const wk = tingkatKab ? r[2] : T.kab[r[2]][1], nk = T.kategori[r[1]], v = ambilNilai(r, k);
        if (!perWil.has(wk)) perWil.set(wk, new Map()); const mw = perWil.get(wk); mw.set(nk, (mw.get(nk) || 0) + v); }
      for (const r of T.tahun_kab) { if (!lolos(r)) continue; const v = ambilNilai(r, k), nk = T.kategori[r[1]];
        perKat.set(nk, (perKat.get(nk) || 0) + v);
        if (!perKab.has(r[2])) perKab.set(r[2], new Map()); const mk = perKab.get(r[2]); mk.set(nk, (mk.get(nk) || 0) + v); }
      const jml = m => [...m.values()].reduce((a, b) => a + b, 0);
      /* per 100 ribu penduduk per tahun = jumlah / banyak tahun / penduduk x 100.000 (wilayah tanpa data penduduk tidak ditampilkan) */
      const p100 = st.per100 && T.penduduk, nTh = st.sampai - st.dari + 1, pendProv = new Map();
      if (p100) T.kab.forEach((kb, i) => { const pd = T.penduduk[i]; if (pd) pendProv.set(kb[1], (pendProv.get(kb[1]) || 0) + pd); });
      const ubah = (x, pd) => p100 ? (pd ? {...x, pend: pd, v: x.v / nTh / pd * 1e5} : null) : x;
      const teks100 = p100 ? v => F(Math.round(v * 100) / 100) : null;
      komposisi(bSeb.kat, perKat, k);
      bSeb.judulWil.textContent = tingkatKab ? `Per kabupaten/kota, ${PROV[st.prov] || st.prov}` : "Per provinsi";
      bSeb.ketWil.textContent = tingkatKab ? "Klik baris untuk menyaring ke kab/kota itu" : "Klik baris untuk melihat kab/kota";
      kartuKab.hidden = tingkatKab; duaSeb.classList.toggle("dt-satu", tingkatKab);
      batangDatar(bSeb.wil, [...perWil].map(([w, m]) => ubah({kode: w, nama: tingkatKab ? T.kab[w][2] : PROV[w] || w, v: jml(m), m}, tingkatKab ? T.penduduk?.[w] : pendProv.get(w))).filter(Boolean).sort((a, b) => b.v - a.v).slice(0, tingkatKab ? 40 : 38), k,
        {teks: teks100, perKat: x => x.m, pilih: tingkatKab && st.kab >= 0 ? st.kab : null, klik: x => { if (tingkatKab) { st.kab = st.kab === x.kode ? -1 : x.kode; } else { st.prov = x.kode; st.kab = -1; sProv.value = x.kode; } isiKab(); sKab.value = st.kab; gambar(); status.textContent = `Disaring ke ${x.nama}`; }});
      bSeb.judulKab.textContent = `Kabupaten/kota terbanyak, ${wilNama()}`;
      batangDatar(bSeb.kab, [...perKab].map(([i, m]) => ubah({nama: `${T.kab[i][2]}${st.prov ? "" : ", " + (PROV[T.kab[i][1]] || "")}`, v: jml(m), m}, T.penduduk?.[i])).filter(Boolean).sort((a, b) => b.v - a.v).slice(0, 20), k, {teks: teks100, perKat: x => x.m, total: jml(perKat)});
    }

    /* ---------- tab Tabel ---------- */
    const KOL_REKAP = ["kejadian", "mdh", "luka", "terdampak", "rr_berat", "rr_sedang", "rr_ringan", "terendam", "rugi_rumah", "f_pendidikan", "f_ibadah", "f_kesehatan", "f_kantor", "jembatan", "lahan_ha"];
    const KEPALA_PENDEK = {kejadian: "Kejadian", mdh: "Meninggal dan hilang", luka: "Luka", terdampak: "Menderita dan mengungsi", rr_berat: "Rusak berat", rr_sedang: "Rusak sedang", rr_ringan: "Rusak ringan",
      terendam: "Terendam", rugi_rumah: "Kerugian rumah (juta Rp)", f_pendidikan: "Pendidikan", f_ibadah: "Rumah ibadat", f_kesehatan: "Kesehatan", f_kantor: "Kantor", jembatan: "Jembatan", lahan_ha: "Lahan (ha)"};
    const csv = (nama, kepala, baris) => { const sel = v => { const t = String(v ?? ""); return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
      const isi = "﻿" + [kepala, ...baris].map(r => r.map(sel).join(",")).join("\n"); const a = h("a", {href: URL.createObjectURL(new Blob([isi], {type: "text/csv;charset=utf-8"})), download: nama});
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
    const collator = new Intl.Collator("id", {numeric: true, sensitivity: "base"});
    /* tabel urut: tombol di th, aria-sort di th aktif, baris dipindah (bukan dibangun ulang) */
    /* grup: [[label, banyak kolom], ...] = baris kepala kelompok di atas kepala kolom (pemilik 25 Nov 2026 "bagusin halaman tabel");
       kolom.bar: sel angka diberi batang tipis di latar, panjang = nilai / nilai terbesar kolom itu */
    function tabelUrut(id, judul, kolom, baris, {kakiTotal, grup, pilih} = {}) {
      const maksK = kolom.map((c, j) => c.bar ? Math.max(1, ...baris.map(r => +r[j] || 0)) : 0);
      /* kolom j: kelompok mana, awal kelompok berlabel (untuk garis pemisah) */
      const kelKol = []; if (grup) { let j = 0; for (const [l, n] of grup) for (let i = 0; i < n; i++, j++) kelKol[j] = {l, awal: i === 0 && !!l, akhir: i === n - 1 && !!l}; }
      const pisah = j => kelKol[j]?.awal ? "dt-kol-awal" : kelKol[j + 1]?.awal && !kelKol[j]?.l ? null : null;
      const tb = h("tbody", {}, baris.map(r => h("tr", {class: pilih != null && r[0] === pilih ? "dt-tr-pilih" : null, "aria-current": pilih != null && r[0] === pilih ? "true" : null}, r.map((v, j) => { if (!kolom[j].angka) return j === 0 ? h("th", {scope: "row", teks: v}) : h("td", {teks: v});
        const td = h("td", {"data-value": String(v ?? 0), class: [kolom[j].bar ? "dt-sel-bar" : "", pisah(j) || ""].join(" ").trim() || null, teks: kolom[j].teks ? kolom[j].teks(v) : F(v)});
        if (kolom[j].bar) td.style.setProperty("--p", ((+v || 0) / maksK[j] * 100).toFixed(1) + "%"); return td; }))));
      const thKol = (c, j, ekstra = {}) => h("th", {scope: "col", "data-type": c.angka ? "number" : "text", "data-col": String(j), class: [c.angka ? "dt-angka" : "", pisah(j) || ""].join(" ").trim() || null, title: c.nama, ...ekstra},
        h("button", {type: "button", teks: c.pendek || c.nama}));
      let kepala;
      if (grup) { const atas = [], bawah = []; let j = 0;
        for (const [l, n] of grup) { if (!l) { for (let i = 0; i < n; i++, j++) atas.push(thKol(kolom[j], j, {rowspan: "2"})); continue; }
          atas.push(h("th", {scope: "colgroup", colspan: String(n), class: "dt-kol-awal", teks: l})); for (let i = 0; i < n; i++, j++) bawah.push(thKol(kolom[j], j)); }
        kepala = h("thead", {}, h("tr", {class: "dt-kep-grup"}, atas), h("tr", {class: "dt-kep-sub"}, bawah)); }
      else kepala = h("thead", {}, h("tr", {}, kolom.map((c, j) => thKol(c, j))));
      const tabel = h("table", {class: "dt-tabel" + (grup ? " dt-tabel-grup" : ""), id}, h("caption", {id: id + "-c", teks: judul}), kepala, tb,
        kakiTotal ? h("tfoot", {}, h("tr", {}, kakiTotal.map((v, j) => j === 0 ? h("th", {scope: "row", teks: v}) : h("td", {class: pisah(j), teks: kolom[j].teks ? kolom[j].teks(v) : F(v)})))) : null);
      tabel.tHead.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const th = b.closest("th");
        const arah = th.getAttribute("aria-sort") === "descending" ? "ascending" : "descending";
        for (const x of tabel.tHead.querySelectorAll("th[data-col]")) x.removeAttribute("aria-sort"); th.setAttribute("aria-sort", arah);
        const i = +th.dataset.col, angka = th.dataset.type === "number", f = arah === "ascending" ? 1 : -1;
        const rows = [...tb.rows].map(r => [r, angka ? +r.cells[i].dataset.value : r.cells[i].textContent]);
        rows.sort((a, b) => f * (angka ? a[1] - b[1] : collator.compare(a[1], b[1])));
        for (const [r] of rows) tb.moveBefore ? tb.moveBefore(r, null) : tb.append(r);
        status.textContent = `${judul} diurutkan menurut ${b.textContent}, ${arah === "ascending" ? "naik" : "turun"}`; });
      return h("div", {class: "dt-gulir dt-gulir-tabel", role: "region", tabindex: "0", "aria-labelledby": id + "-c"}, tabel);
    }
    const bTab = {rekap: h("div"), daftar: h("div"), cari: h("input", {type: "search", id: "dtCari", placeholder: "Cari kab/kota, provinsi, atau jenis", autocomplete: "off"}), hal: 0};
    const unduhRekap = h("button", {type: "button", class: "dt-btn-teks"}, ikon("unduh"), h("span", {teks: "Unduh CSV"})), unduhDaftar = h("button", {type: "button", class: "dt-btn-teks"}, ikon("unduh"), h("span", {teks: "Unduh CSV"}));
    bTab.jml = h("span", {class: "dt-cari-jml", "aria-live": "polite"});
    panel.tabel.append(h("div", {class: "dt-isi"}, kartu("tabel", "Rekap per wilayah", unduhRekap, bTab.rekap),
      kartu("daftar", "Daftar kejadian 365 hari terakhir", unduhDaftar,
        h("div", {class: "dt-cari-bar"}, h("label", {class: "dt-cari-kotak"}, ikon("cari"), h("span", {class: "dt-sr", teks: "Cari"}), bTab.cari), bTab.jml), bTab.daftar)));
    let rekapData = null;
    function gambarRekap() {
      const tingkatKab = !!st.prov, m = new Map();
      /* rekap memakai seluruh provinsi walau satu kab/kota dipilih (QA 25 Nov 2026: dulu tinggal 1 baris); baris kab terpilih disorot */
      const lolosRekap = r => st.kat.has(T.kategori[r[1]]) && r[0] >= st.dari && r[0] <= st.sampai && (!st.prov || T.kab[r[2]][1] === st.prov);
      for (const r of T.tahun_kab) { if (!lolosRekap(r)) continue; const w = tingkatKab ? r[2] : T.kab[r[2]][1]; if (!m.has(w)) m.set(w, KOL_REKAP.map(() => 0)); const a = m.get(w); KOL_REKAP.forEach((k, j) => (a[j] += ambilNilai(r, k))); }
      const baris = [...m].map(([w, a]) => [tingkatKab ? T.kab[w][2] : PROV[w] || w, ...a.map(v => Math.round(v * 10) / 10)]).sort((a, b) => b[1] - a[1]);
      const tot = KOL_REKAP.map((_, j) => baris.reduce((x, r) => x + r[j + 1], 0));
      /* label di bawah kelompok cukup pendek, nama lengkap tetap di title dan CSV */
      const PENDEK_GRUP = {rr_berat: "Berat", rr_sedang: "Sedang", rr_ringan: "Ringan", rugi_rumah: "Kerugian (juta Rp)", f_ibadah: "Ibadat", luka: "Luka", mdh: "Meninggal dan hilang", terdampak: "Menderita dan mengungsi"};
      const kolom = [{nama: tingkatKab ? "Kabupaten/kota" : "Provinsi"}, ...KOL_REKAP.map(k => ({nama: KEPALA_PENDEK[k], pendek: PENDEK_GRUP[k], angka: true, ...(k === "kejadian" ? {teks: v => F(Math.round(v)), bar: true} : {})}))];   // kejadian lintas kab dibagi rata di data: tampil bulat seperti ringkasan (QA 25 Nov 2026)
      rekapData = {kepala: kolom.map(c => c.nama), baris};
      /* kelompok kolom mengikuti urutan KOL_REKAP: nama dan kejadian, 3 korban, 5 rumah, 5 fasilitas, 1 lahan */
      const grup = [["", 2], ["Korban (jiwa)", 3], ["Rumah (unit)", 5], ["Fasilitas rusak (unit)", 5], ["", 1]];
      bTab.rekap.replaceChildren(tabelUrut("dtRekap", `Rekap ${st.prov ? PROV[st.prov] || st.prov : "Indonesia"}, ${st.dari} sampai ${st.sampai}`, kolom, baris, {kakiTotal: ["Jumlah", ...tot], grup, pilih: st.kab >= 0 ? T.kab[st.kab][2] : null}));
    }
    unduhRekap.addEventListener("click", () => rekapData && csv(`rekap-dibi-${(st.prov ? PROV[st.prov] || st.prov : "Indonesia").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${st.dari}-${st.sampai}.csv`, rekapData.kepala, rekapData.baris));
    const KOL_DAFTAR = [["tanggal", "Tanggal"], ["prov_nama", "Provinsi"], ["kab", "Kabupaten/kota"], ["jenis", "Jenis"], ["kejadian", "Kejadian", 1], ["mdh", "Meninggal dan hilang", 1], ["luka", "Luka", 1],
      ["terdampak", "Menderita", 1], ["mengungsi", "Mengungsi", 1], ["rumah", "Rumah rusak", 1], ["terendam", "Terendam", 1]];
    const urutD = {k: "tanggal", turun: true};
    const daftarSaring = () => { const q2 = norm(bTab.cari.value);
      return D.harian.filter(x => st.kat.has(x.kat) && (st.kab >= 0 ? x.i === st.kab : !st.prov || x.prov === st.prov)).map(x => ({...x, prov_nama: PROV[x.prov] || x.prov, mdh: (x.meninggal || 0) + (x.hilang || 0),
        rumah: (x.rr_berat || 0) + (x.rr_sedang || 0) + (x.rr_ringan || 0)})).filter(x => !q2 || norm(`${x.kab} ${x.prov_nama} ${x.jenis}`).includes(q2)); };
    function gambarDaftar() {
      const semua = daftarSaring(), angka = KOL_DAFTAR.find(c => c[0] === urutD.k)[2], f = urutD.turun ? -1 : 1;
      semua.sort((a, b) => f * (angka ? (a[urutD.k] || 0) - (b[urutD.k] || 0) : collator.compare(String(a[urutD.k] ?? ""), String(b[urutD.k] ?? ""))));
      const per = 50, jmlHal = Math.max(1, Math.ceil(semua.length / per)); bTab.hal = Math.min(bTab.hal, jmlHal - 1);
      const tampil = semua.slice(bTab.hal * per, bTab.hal * per + per);
      const tabel = h("table", {class: "dt-tabel"}, h("caption", {id: "dtDaftar-c", teks: `Kejadian ${tglPanjang(D.dariH)} sampai ${tglPanjang(D.sampaiH)}, ${wilNama()}`}),
        h("thead", {}, h("tr", {}, KOL_DAFTAR.map(([k, l, a]) => { const b = h("button", {type: "button", teks: l}); b.addEventListener("click", () => { urutD.turun = urutD.k === k ? !urutD.turun : true; urutD.k = k; bTab.hal = 0; gambarDaftar(); fokusUrut(k); });
          return h("th", {scope: "col", class: a ? "dt-angka" : null, "data-k": k, "aria-sort": urutD.k === k ? (urutD.turun ? "descending" : "ascending") : null}, b); }))),
        h("tbody", {}, tampil.map(x => h("tr", {}, KOL_DAFTAR.map(([k, , a], j) => { const v = x[k]; const t = k === "tanggal" ? (() => { const [y, mo, d] = v.split("-"); return `${+d} ${BLN[+mo - 1]} ${y}`; })() : a ? (v ? F(v) : "–") : v || "–";
          if (k === "jenis") return h("td", {class: "dt-jenis"}, warnai(h("i", {"aria-hidden": "true"}), kat(x.kat)[2], "background"), h("span", {teks: t}));
          return j === 0 ? h("th", {scope: "row", teks: t}) : h("td", {class: a ? "dt-angka" : null, teks: t}); })))));
      bTab.jml.textContent = semua.length ? `${F(semua.length)} kejadian` : "Tidak ada kejadian untuk saringan ini";
      const nav = h("nav", {class: "dt-hal", "aria-label": "Halaman daftar"}, h("span", {teks: semua.length ? `Baris ${F(bTab.hal * per + 1)} sampai ${F(bTab.hal * per + tampil.length)} dari ${F(semua.length)}, halaman ${F(bTab.hal + 1)} dari ${F(jmlHal)}` : ""}));
      if (jmlHal > 1) { const b1 = h("button", {type: "button", class: "dt-btn-teks", disabled: bTab.hal === 0 || null, teks: "Sebelumnya"}), b2 = h("button", {type: "button", class: "dt-btn-teks", disabled: bTab.hal >= jmlHal - 1 || null, teks: "Berikutnya"});
        b1.addEventListener("click", () => { bTab.hal--; gambarDaftar(); }); b2.addEventListener("click", () => { bTab.hal++; gambarDaftar(); }); nav.append(b1, b2); }
      bTab.daftar.replaceChildren(h("div", {class: "dt-gulir dt-gulir-tabel", role: "region", tabindex: "0", "aria-labelledby": "dtDaftar-c"}, tabel), nav);
      bTab.semua = semua;
    }
    const fokusUrut = k => bTab.daftar.querySelector(`th[data-k="${k}"] button`)?.focus();
    let tunda; bTab.cari.addEventListener("input", () => { clearTimeout(tunda); tunda = setTimeout(() => { bTab.hal = 0; gambarDaftar(); }, 200); });
    unduhDaftar.addEventListener("click", () => csv(`kejadian-dibi-${D.dariH}-${D.sampaiH}.csv`, KOL_DAFTAR.map(c => c[1]), (bTab.semua || []).map(x => KOL_DAFTAR.map(([k]) => x[k] ?? ""))));

    /* ---------- gambar ---------- */
    /* ---------- Profil satu kab/kota untuk BPBD (satu halaman A4): angka, tren, bulan rawan, kejadian terakhir, penanganan ---------- */
    const bPro = {isi: h("div", {class: "db-profil"})};
    if (panel.profil) panel.profil.append(bPro.isi);
    function gambarProfil() {
      if (!panel.profil) return;
      if (st.kab < 0) { bPro.isi.replaceChildren(h("div", {class: "dt-kartu db-profil-kosong"}, ikon("rumah"), h("p", {teks: "Pilih kabupaten/kota di sidebar, atau klik wilayahnya di peta, untuk melihat profilnya."}))); return; }
      const kb = T.kab[st.kab], kode = kb[0], pend = T.penduduk?.[st.kab], nTh = st.sampai - st.dari + 1, kej = total("kejadian");
      /* angka profil (pemilik 25 Nov 2026 "bagusin lagi"): satu kartu dua baris (Kejadian, Dampak). Tiap angka diberi konteks, bukan hiasan:
         sparkline tren per tahun dalam rentang terpilih (Jumlah dan tiga angka dampak), atau peringkat di antara kab/kota satu provinsi (Rata-rata, Per 100 ribu jiwa). */
      const thR = D.tahun.filter(t => t >= st.dari && t <= st.sampai);
      const deret = k => { const m = pertahun(k); return thR.map(t => m.get(t) || 0); };
      const sekab = T.kab.map((x, i) => i).filter(i => T.kab[i][1] === kb[1]), jmlKab = new Map(sekab.map(i => [i, 0]));
      for (const r of T.tahun_kab) if (jmlKab.has(r[2]) && st.kat.has(T.kategori[r[1]]) && r[0] >= st.dari && r[0] <= st.sampai) jmlKab.set(r[2], jmlKab.get(r[2]) + r[C.kejadian]);
      const peringkat = nilaiKab => { const urut = [...nilaiKab].filter(([, v]) => v != null).sort((x, y) => y[1] - x[1]), i = urut.findIndex(([j]) => j === st.kab);
        return i < 0 ? "" : `ke-${F(i + 1)} dari ${F(urut.length)} kab/kota di ${PROV[kb[1]] || kb[1]}`; };
      const per100Kab = new Map([...jmlKab].map(([i, v]) => [i, T.penduduk?.[i] ? v / nTh / T.penduduk[i] * 1e5 : null]));
      const angka = [["Kejadian", [
          {ik: "data", l: nTh > 1 ? `Jumlah, ${st.dari} sampai ${st.sampai}` : `Jumlah tahun ${st.dari}`, v: F(Math.round(kej)), sat: "kejadian", nm: "kejadian", tren: nTh > 2 ? deret("kejadian") : null},
          {ik: "grafik", l: "Rata-rata", v: F(Math.round(kej / nTh * 10) / 10), sat: "per tahun", ket: peringkat(jmlKab)},
          {ik: "personel", l: "Per 100 ribu jiwa", v: pend ? F(Math.round(kej / nTh / pend * 1e5 * 100) / 100) : "–", sat: pend ? "per tahun" : "", ket: pend ? peringkat(per100Kab) : "data penduduk belum ada"}]],
        ["Dampak", [
          {ik: "personel", l: "Meninggal dan hilang", v: F(Math.round(total("mdh"))), sat: "jiwa", tren: nTh > 2 ? deret("mdh") : null},
          {ik: "ungsi", l: "Menderita dan mengungsi", v: ringkas(total("terdampak")), sat: "jiwa", tren: nTh > 2 ? deret("terdampak") : null},
          {ik: "rumah", l: "Rumah rusak", v: F(Math.round(total("rumah"))), sat: "unit", tren: nTh > 2 ? deret("rumah") : null}]]];
      /* sparkline: garis + bidang tipis, titik di tahun terakhir; tooltip menyebut puncak */
      const garisMini = (xs, nama) => { const W = 200, H = 30, mx = Math.max(1, ...xs), dx = W / Math.max(1, xs.length - 1), yy = v => H - 3 - v / mx * (H - 8);
        const pts = xs.map((v, i) => `${(i * dx).toFixed(1)},${yy(v).toFixed(1)}`), iP = xs.indexOf(Math.max(...xs));
        /* selebar kolom (preserveAspectRatio none), tebal garis tetap lewat vector-effect */
        const g = s("svg", {viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", class: "db-pf-tren", role: "img", "aria-label": `Tren ${nama} per tahun`},
          s("path", {d: `M${pts[0]} L${pts.join(" L")} L${W},${H} L0,${H}Z`, class: "db-pf-tren-isi"}), s("polyline", {points: pts.join(" "), class: "db-pf-tren-garis"}));
        /* lacak garis (pemilik 25 Nov 2026): kursor atau panah kiri/kanan memilih tahun terdekat; garis bantu tegak + titik + tooltip tahun dan nilai.
           Garis bantu dan titik berupa elemen HTML di atas SVG supaya titik tetap bulat (SVG direntang preserveAspectRatio none). */
        g.removeAttribute("role"); g.setAttribute("aria-hidden", "true");
        const n = xs.length, garisV = h("i", {class: "db-pf-tren-v", hidden: true}), titik = h("i", {class: "db-pf-tren-t", hidden: true});
        const wadahT = h("div", {class: "db-pf-tren-wadah", tabindex: "0", role: "img", "aria-label": `Tren ${nama} per tahun, ${thR[0]} sampai ${thR.at(-1)}. Panah kiri dan kanan untuk memilih tahun.`}, g, garisV, titik);
        const Nama = nama.charAt(0).toUpperCase() + nama.slice(1);
        let iA = n - 1;
        const tunjuk = (i, e) => { iA = Math.max(0, Math.min(n - 1, i)); const xp = n > 1 ? iA / (n - 1) * 100 : 50;
          garisV.hidden = titik.hidden = false; garisV.style.left = titik.style.left = xp + "%"; titik.style.top = (yy(xs[iA]) / H * 100) + "%";
          tipEl = null; tampilTip(e || {target: titik, currentTarget: titik}, () => barisTip(`${thR[iA]}${thR[iA] === T.sementara ? ", sementara" : ""}`,
            [[null, Nama, F(Math.round(xs[iA]))], ...(iA === iP && xs[iP] ? [[null, "Tertinggi dalam rentang ini", ""]] : [])])); };
        const lepas = () => { garisV.hidden = titik.hidden = true; sembunyiTip(); };
        wadahT.addEventListener("pointermove", e => { const r = wadahT.getBoundingClientRect(); tunjuk(Math.round((e.clientX - r.left) / r.width * (n - 1)), e); });
        wadahT.addEventListener("pointerleave", lepas);
        wadahT.addEventListener("focus", () => tunjuk(iA)); wadahT.addEventListener("blur", lepas);
        wadahT.addEventListener("keydown", e => { const ke = {ArrowLeft: iA - 1, ArrowRight: iA + 1, Home: 0, End: n - 1}[e.key]; if (ke == null) return; e.preventDefault(); tunjuk(ke); });
        return wadahT; };
      const grafik = h("div", {class: "dt-grafik db-profil-grafik"}), musim = h("div"), musimKet = h("span", {class: "dt-pil dt-pil-netral"});
      const terakhir = D.harian.filter(x => x.i === st.kab).sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 8);
      const darurat = D.darurat.filter(x => x.kab === kode), posko = D.posko.filter(x => x.kab === kode), rambu = D.rambu.filter(x => x.kab === kode);
      const perRambu = new Map(); rambu.forEach(x => perRambu.set(x.jenis, (perRambu.get(x.jenis) || 0) + x.n));
      const bagi = h("button", {type: "button", class: "dt-btn-teks"}, ikon("bagikan"), h("span", {teks: "Bagikan tautan profil"})), cetak = h("button", {type: "button", class: "dt-btn-teks"}, ikon("cetak"), h("span", {teks: "Cetak A4"}));
      bagi.addEventListener("click", () => bBagi.click()); cetak.addEventListener("click", () => cetakProfil());
      /* lambang kab/kota di kepala profil (pemilik 25 Nov 2026), sumber sama dengan kartu peta: /lambang/kabkota.json; tanpa lambang kab: lambang provinsi */
      const lambangPf = h("img", {class: "db-pf-lambang", alt: "", decoding: "async", src: `/lambang/provinsi/${kb[1]}.png`});
      lambangPf.addEventListener("error", () => { lambangPf.hidden = true; });
      LAMBANG_KAB.then(m => { const slug = m.get(kb[1] + "|" + norm(kb[2])); if (slug) lambangPf.src = `/lambang/kabkota/${slug}.png`; });
      const daftar = (kosong, baris) => baris.length ? h("ul", {class: "db-pf-daftar"}, baris) : h("p", {class: "dt-catatan", teks: kosong});
      bPro.isi.replaceChildren(
        h("header", {class: "db-pf-kepala"}, h("div", {class: "db-pf-nama"}, lambangPf, h("div", {}, h("h2", {teks: kb[2]}), h("p", {teks: `${PROV[kb[1]] || kb[1]}${pend ? `, penduduk ${F(pend)} jiwa` : ""}, ${st.dari} sampai ${st.sampai}`}))), h("div", {class: "dt-aksi"}, bagi, cetak)),
        h("div", {class: "db-pf-angka"}, angka.map(([g, xs]) => h("section", {class: "db-pf-grp", "aria-label": g}, h("h4", {}, h("span", {class: "db-pf-grp-ik"}, ikon(g === "Kejadian" ? "data" : "ungsi")), h("span", {teks: g})),
          h("div", {class: "db-pf-isi"}, xs.map(x => h("div", {class: "db-pf-stat"},
            h("div", {class: "db-pf-teks"}, h("span", {class: "db-pf-l"}, ikon(x.ik), h("span", {teks: x.l})), h("p", {class: "db-pf-v"}, h("b", {teks: x.v}), x.sat ? h("small", {teks: x.sat}) : ""),
              x.ket ? h("small", {class: "db-pf-ket", teks: x.ket}) : ""),
            x.tren ? garisMini(x.tren, x.nm || x.l.toLowerCase()) : "")))))),
        kartu("data", "Kejadian per tahun", null, grafik),
        kartu("cuaca", "Bulan rawan per jenis bencana", musimKet, musim),
        h("div", {class: "dt-dua"},
          kartu("kalender", "Kejadian terakhir", null, daftar("Belum ada kejadian tercatat dalam 365 hari terakhir.", terakhir.map(x => h("li", {}, h("b", {teks: tglPanjang(x.tanggal)}), h("span", {teks: x.jenis}),
            h("small", {teks: [x.meninggal ? `${F(x.meninggal)} meninggal` : "", x.mengungsi ? `${F(x.mengungsi)} mengungsi` : "", (x.rr_berat || 0) + (x.rr_sedang || 0) + (x.rr_ringan || 0) ? `${F((x.rr_berat || 0) + (x.rr_sedang || 0) + (x.rr_ringan || 0))} rumah rusak` : ""].filter(Boolean).join(", ")}))))),
          kartu("tenda", "Status darurat aktif", null, !D.ada.darurat ? h("p", {class: "dt-catatan", teks: "Data status darurat DIBI belum tersedia."}) :
            daftar("Tidak ada status darurat aktif yang tercatat di DIBI.", darurat.map(x => h("li", {}, h("b", {teks: x.status}), h("span", {teks: x.jenis}), h("small", {teks: `${x.nomor || ""}, ${tglPanjang(x.mulai)} sampai ${tglPanjang(x.berakhir)}`})))))),
        h("div", {class: "dt-dua"},
          kartu("ungsi", "Posko pengungsian", null, !D.ada.posko ? h("p", {class: "dt-catatan", teks: "Data posko DIBI belum tersedia."}) :
            daftar("Tidak ada posko pengungsian yang tercatat di DIBI.", posko.sort((a, b) => b.jiwa - a.jiwa).slice(0, 10).map(x => h("li", {}, h("b", {teks: `${F(x.jiwa)} jiwa`}), h("span", {teks: x.lokasi || x.desa || "Posko"}), h("small", {teks: [x.desa, x.kec, x.tgl ? tglPanjang(x.tgl) : ""].filter(Boolean).join(", ")}))))),
          kartu("akses", "Rambu evakuasi IDRIP", null, !D.ada.rambu ? h("p", {class: "dt-catatan", teks: "Data rambu DIBI belum tersedia."}) :
            rambu.length ? daftar("", [...perRambu].sort((a, b) => b[1] - a[1]).map(([j, n]) => h("li", {}, h("b", {teks: F(n)}), h("span", {teks: String(j)}))))
              : h("p", {class: "dt-catatan", teks: "Kab/kota ini tidak ada di data rambu IDRIP. Data IDRIP hanya mencakup kab/kota program IDRIP, jadi ini bukan berarti tidak ada rambu."}))),
        h("p", {class: "db-pf-sumber", teks: `Sumber: DIBI BNPB (dibi.bnpb.go.id), hanya kejadian yang memenuhi ambang bencana${pend ? "; penduduk IRBI BNPB" : ""}. Data ${T.sementara} sementara. Diunduh ${tglPanjang(T.dibuat.slice(0, 10))}.`}));
      grafikTahun(grafik, seriKat("kejadian"), {tinggi: document.documentElement.classList.contains("dt-cetak-profil") ? 120 : 280}); trenMusim(musim, musimKet);   /* cetak profil: grafik pendek selebar penuh, bukan dikecilkan */
    }

    const gambarTab = () => { if (st.tab === "tren") { trenKej(); trenKorban(); trenRumah(); trenBulan(); trenMusim(); trenHari(); }
      else if (st.tab === "sebaran") gambarSebaran(); else if (st.tab === "profil") gambarProfil(); else if (st.tab === "tabel") { gambarRekap(); gambarDaftar(); }
      pasangGbr(); };   /* tombol salin/unduh gambar dipasang tiap tab digambar, juga lewat pindah tab (Profil sempat tanpa tombol) */
    let antre = false;
    function gambar() { if (antre) return; antre = true; nanti(() => { antre = false; sembunyiTip();   /* elemen yang di-hover diganti: tanpa ini tooltip menggantung */ gambarRingkasan(); gambarTab(); pasangGbr(); kirimPeta(); if (akar.id === "dtWadah") history.replaceState(history.state, "", tautan()); }); }
    /* cetak A4: semua tab digambar, hanya wadah ini yang tercetak (kelas jalur di leluhurnya) */
    const jalur = []; for (let e = akar.parentElement; e && e !== document.documentElement; e = e.parentElement) jalur.push(e);
    /* cetak selalu bertema terang: tema gelap membuat teks terang tercetak di kertas putih (halaman tampak kosong, QA 25 Nov 2026) */
    let temaSebelum = null;
    const siapCetak = (hanyaProfil) => { const d = document.documentElement; temaSebelum = d.dataset.theme ?? ""; d.dataset.theme = "light"; segarKop(hanyaProfil);
      document.documentElement.classList.add("dt-mencetak"); document.documentElement.classList.toggle("dt-cetak-profil", !!hanyaProfil);
      if (hanyaProfil) { jalur.forEach(e => e.classList.add("dt-jalur")); akar.classList.add("dt-jalur-akar"); panel.profil.classList.add("dt-panel-cetak"); gambarProfil(); return; } jalur.forEach(e => e.classList.add("dt-jalur")); akar.classList.add("dt-jalur-akar");
      /* laporan lengkap: profil (punya tombol cetaknya sendiri) dan peta tidak ikut (pemilik 25 Nov 2026) */
      Object.entries(panel).forEach(([k, p]) => { if (k !== "profil" && k !== "peta") p.classList.add("dt-panel-cetak"); });
      const rkC = akar.querySelector(".db-ringkas"); if (rkC) { rkC._asal = rkC.nextSibling; rkC.parentElement.prepend(rkC); }
      gambarRingkasan(); trenKej(); trenKorban(); trenRumah(); trenBulan(); trenMusim(); gambarSebaran(); gambarRekap(); };
    const usaiCetak = () => { const d = document.documentElement; if (temaSebelum !== null) { if (temaSebelum) d.dataset.theme = temaSebelum; else delete d.dataset.theme; temaSebelum = null; }
      const rkC = akar.querySelector(".db-ringkas"); if (rkC && "_asal" in rkC) { rkC.parentElement.append(rkC); delete rkC._asal; }
      document.documentElement.classList.remove("dt-mencetak", "dt-cetak-profil"); jalur.forEach(e => e.classList.remove("dt-jalur")); akar.classList.remove("dt-jalur-akar"); Object.values(panel).forEach(p => p.classList.remove("dt-panel-cetak")); nanti(gambarTab); };
    cetakProfil = () => { siapCetak(true); requestAnimationFrame(() => setTimeout(() => window.print(), 50)); };
    bCetak.addEventListener("click", () => { siapCetak(); requestAnimationFrame(() => setTimeout(() => window.print(), 50)); });
    window.addEventListener("afterprint", () => { if (document.documentElement.classList.contains("dt-mencetak")) usaiCetak(); });
    /* Ctrl+P atau menu peramban: siapkan sama seperti tombol Cetak (profil bila sedang di tab Profil) */
    window.addEventListener("beforeprint", () => { if (DAS && !document.documentElement.classList.contains("dt-mencetak")) siapCetak(st.tab === "profil"); });
    gambar();
    let lebarLalu = akar.clientWidth;
    new ResizeObserver(() => { const w = akar.clientWidth; if (Math.abs(w - lebarLalu) > 24) { lebarLalu = w; if (st.tab === "tren") nanti(gambarTab); } }).observe(akar);
  }

  window.DibiTren = {pasang};
  const w = document.getElementById("dtWadah"); if (w) pasang(w, {dasbor: w.dataset.dasbor === "1"});
})();
