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
      const b = h("button", {type: "button", class: DAS ? "db-jenis" : "dt-chip", "aria-pressed": String(st.kat.has(k)), "data-k": k}, warnai(h("i", {"aria-hidden": "true"}), w, "background"), ikon(ik), h("span", {class: "dt-geser", title: lbl}, h("span", {teks: lbl})), h("b", {class: "dt-chip-n"}));   // nama dibungkus: yang terpotong digeser bolak-balik (pemilik 25 Nov 2026)
      b.addEventListener("click", () => { st.kat.has(k) ? st.kat.delete(k) : st.kat.add(k); if (!st.kat.size) st.kat.add(k); segarChip(); gambar(); }); return b; });
    const segarChip = () => chips.forEach(b => b.setAttribute("aria-pressed", String(st.kat.has(b.dataset.k))));
    /* nama kategori yang lebih panjang dari pilnya digeser pelan bolak-balik supaya terbaca utuh (pemilik 25 Nov 2026 "animasi geser2 teksnya");
       jarak geser = lebar yang terpotong, durasi ikut jarak; diukur ulang saat lebar berubah. Gerak dimatikan bila pengguna memilih kurangi gerakan (CSS). */
    const ukurGeser = () => { for (const w of akar.querySelectorAll(".dt-geser")) { const t = w.firstElementChild, lebih = Math.ceil(t.getBoundingClientRect().width) - w.clientWidth;   // span inline: scrollWidth selalu 0, lebar diukur dari kotaknya
      w.classList.toggle("geser", lebih > 2); if (lebih > 2) { w.style.setProperty("--geser", -lebih + "px"); w.style.setProperty("--durasi", Math.max(4, 2.5 + lebih / 18).toFixed(1) + "s"); } } };
    let rafGeser = 0; new ResizeObserver(() => { if (!rafGeser) rafGeser = requestAnimationFrame(() => { rafGeser = 0; ukurGeser(); }); }).observe(akar);
    const bAlam = h("button", {type: "button", class: "dt-btn-teks", teks: "Bencana alam"}), bSemua = h("button", {type: "button", class: "dt-btn-teks", teks: "Semua kategori"});
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
    const TAB = [...(DAS ? [["peta", "Peta", "wilayah"]] : []), ["tren", "Tren", "data"], ["sebaran", "Sebaran", "akses"], ["tabel", "Tabel", "daftar"], ...(DAS ? [["profil", "Profil kab/kota", "rumah"]] : [])];
    const tabB = TAB.map(([k, t, ik]) => h("button", {type: "button", role: "tab", class: DAS ? "db-nav" : null, id: "dtTab-" + k, "aria-selected": String(k === st.tab), tabindex: k === st.tab ? "0" : "-1"}, ikon(ik), h("span", {teks: t})));
    const panel = Object.fromEntries(TAB.map(([k]) => [k, h("div", {role: "tabpanel", id: "dtPanel-" + k, "aria-labelledby": "dtTab-" + k, hidden: k !== st.tab || null, class: "dt-panel"})]));
    const tabList = h("div", {class: DAS ? "db-tabs" : "dt-tabs", role: "tablist", "aria-label": "Tampilan data DIBI", "aria-orientation": DAS ? "vertical" : null}, tabB);
    const pilihTab = (k, fokus) => { st.tab = k; tabB.forEach((b, i) => { const on = TAB[i][0] === k; b.setAttribute("aria-selected", String(on)); b.tabIndex = on ? 0 : -1; if (on && fokus) b.focus(); });
      for (const [kk, p] of Object.entries(panel)) p.hidden = kk !== k; akar.dataset.tab = k; gambarRingkasan();
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
    const bBagi = h("button", {type: "button", class: "dt-btn-teks"}, ikon("akses"), h("span", {teks: "Bagikan tautan wilayah ini"}));
    const bCetak = h("button", {type: "button", class: "dt-btn-teks"}, ikon("daftar"), h("span", {teks: "Cetak A4"}));
    bBagi.addEventListener("click", async () => { const u = tautan().href, judul = `Statistik bencana ${wilNama()}`;
      try { if (navigator.share && matchMedia("(pointer:coarse)").matches) { await navigator.share({title: judul, url: u}); return; }
        await navigator.clipboard.writeText(u); status.textContent = "Tautan disalin"; bBagi.lastChild.textContent = "Tautan disalin";
        setTimeout(() => (bBagi.lastChild.textContent = "Bagikan tautan wilayah ini"), 2500);
      } catch (e) { if (e.name !== "AbortError") prompt("Salin tautan ini:", u); } });
    const judulWil = h("span", {class: "dt-wil"}); let segarPeriode = () => {}, kirimPeta = () => {}, infoPeta = null, cetakProfil = () => {};
    /* tab Peta: data peta hanya 365 hari terakhir, jadi bilah atas menulis periode yang benar-benar dipakai peta */
    const judulPeta = () => { const a = infoPeta?.st; judulWil.textContent = a?.dari ? `${wilNama()}, ${tglPanjang(a.dari)} sampai ${tglPanjang(a.sampai)}` : `${wilNama()}, 365 hari terakhir`; };
    const sumberCetak = h("p", {class: "dt-cetak-saja", teks: `Sumber: DIBI BNPB (dibi.bnpb.go.id), hanya kejadian yang memenuhi ambang bencana. Diunduh ${tglPanjang(T.dibuat.slice(0, 10))}.`});
    if (DAS) {
      /* Peta milik data_bencana.js (sesi Dalops): mode tanam = peta + panel bergaya meja; atur() dari sini, ubah() bila pengguna klik peta */
      const petaEl = h("div", {class: "db-peta"}); panel.peta.append(petaEl); document.getElementById("app")?.remove();
      let kendali = null, dariPeta = false;
      kirimPeta = () => { if (!kendali || dariPeta) return; const satu = st.kat.size === 1 ? kat([...st.kat][0])[1] : "";
        kendali.atur({dari: String(st.dari), sampai: String(st.sampai), prov: st.prov, kab: st.kab >= 0 ? T.kab[st.kab][0].replace(/^(\d\d)(\d\d)$/, "$1.$2") : "", jenis: satu}); };
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
      const sisi = h("aside", {class: "db-sisi", "aria-label": "Menu data bencana"},
        h("a", {class: "db-merek", href: "/bnpb"}, h("img", {src: "/lapor/lambang-bnpb.png", alt: "", width: "34", height: "34"}), h("div", {}, h("b", {id: "dtJudul", teks: "Data Bencana Indonesia"}), h("small", {teks: "Sumber DIBI BNPB"}))),
        h("p", {class: "db-segar"}, h("i"), h("span", {teks: `Data diperbarui ${tglPanjang(T.dibuat.slice(0, 10))}`})),
        grup("Tampilan", tabList),
        grup("Jenis bencana", h("div", {class: "db-cepat"}, bAlam, bSemua), h("div", {class: "db-jenis-daftar"}, chips)),
        grup("Wilayah", h("div", {class: "dt-f-isi"}, lbl("dtProv", "Provinsi"), sProv), h("div", {class: "dt-f-isi"}, lbl("dtKab", "Kabupaten/kota"), sKab)),
        grup("Tahun", h("div", {class: "db-dua"}, h("div", {class: "dt-f-isi"}, lbl("dtDari", "Dari"), sDari), h("div", {class: "dt-f-isi"}, lbl("dtSampai", "Sampai"), sSampai)), bUlang),
        grup("Bagikan", bBagi, bCetak));
      bAlam.textContent = "Bencana alam"; bSemua.textContent = "Semua";
      const atas = h("div", {class: "db-atas"}, h("div", {class: "db-jejak"}, ikon("wilayah"), judulWil), segP,
        h("span", {class: "dt-pil", title: "DIBI menetapkan data final sekitar Februari tahun berikutnya", teks: `Data ${T.sementara} sementara`}));
      const rk = h("aside", {class: "db-ringkas", "aria-label": "Ringkasan"}, h("h2", {class: "db-rk-j"}, ikon("data"), h("span", {teks: "Ringkasan"})), ringkasan);
      akar.classList.add("db-app"); akar.dataset.tab = st.tab;
      akar.replaceChildren(sisi, h("div", {class: "db-utama"}, atas, sumberCetak, h("div", {class: "db-isi"}, h("div", {class: "db-panel"}, ...Object.values(panel)), rk)), status, tip);
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

    /* ---------- grafik batang per tahun (bertumpuk) + garis rata-rata 5 tahun ---------- */
    function grafikTahun(wadah, seri0, {garis = true, k = "kejadian"} = {}) {
      const W = Math.max(320, wadah.clientWidth || 640), H = 280, kiri = 52, kanan = 12, atas = 22, bawah = 26;
      /* rata-rata 5 tahun dihitung atas deret penuh (tahun sebelum rentang ikut), lalu hanya tahun dalam rentang yang digambar */
      const rataPenuh = ma5(D.tahun.map((_, i) => seri0.reduce((a, x) => a + x.nilai[i], 0))), dalam = D.tahun.map((t, i) => t >= st.dari && t <= st.sampai ? i : -1).filter(i => i >= 0);
      const th = dalam.map(i => D.tahun[i]), seri = seri0.map(x => ({...x, nilai: dalam.map(i => x.nilai[i])})), n = th.length, lebarB = (W - kiri - kanan) / n;
      const jumlah = th.map((_, i) => seri.reduce((a, x) => a + x.nilai[i], 0)), rata = dalam.map(i => rataPenuh[i]);
      const puncak = Math.max(1, ...jumlah, ...rata), p10 = 10 ** Math.floor(Math.log10(puncak / 4)), langkah = p10 * [1, 2, 2.5, 5, 10].find(m => p10 * m * 4 >= puncak);
      const maks = Math.ceil(puncak * 1.08 / langkah) * langkah, y = v => atas + (H - atas - bawah) * (1 - v / maks);
      const svg = s("svg", {viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "dt-svg", role: "group", "aria-label": `${LABEL[k]} per tahun, ${wilNama()}`});
      for (let v = 0; v <= maks + 1e-9; v += langkah) { const yy = y(v); svg.append(s("line", {x1: kiri, x2: W - kanan, y1: yy, y2: yy, class: "dt-grid"}), s("text", {x: kiri - 6, y: yy + 4, class: "dt-sumbu", "text-anchor": "end", teks: nilaiTeks(k, v)})); }
      th.forEach((t, i) => {
        const x = kiri + i * lebarB, g = s("g", {class: "dt-batang" + (t === T.sementara ? " dt-sementara" : "")});
        let dasar = 0;
        for (const x0 of seri) { const v = x0.nilai[i]; if (!v) continue; const r = s("rect", {x: x + lebarB * .2, width: lebarB * .6, y: y(dasar + v), height: Math.max(.5, y(dasar) - y(dasar + v)), rx: 1.5}); warnai(r, x0.warna); g.append(r); dasar += v; }
        g.append(s("rect", {x, width: lebarB, y: atas, height: H - atas - bawah, class: "dt-sasar"}));
        if (n <= 20 || i % 2 === 0) svg.append(s("text", {x: x + lebarB / 2, y: H - 8, class: "dt-sumbu", "text-anchor": "middle", teks: t === T.sementara ? t + "*" : String(t)}));
        if (jumlah[i] && W / n > 34) svg.append(s("text", {x: x + lebarB / 2, y: Math.min(y(jumlah[i]), garis ? y(rata[i]) : Infinity) - 7, class: "dt-nilai", "text-anchor": "middle", teks: ringkas(SATUAN[k] === "rp" ? jumlah[i] * 1e6 : jumlah[i]).replace(" ribu", " rb").replace(" juta", " jt").replace(" miliar", " M").replace(" triliun", " T")}));
        ikat(g, () => barisTip(`${t}${t === T.sementara ? ", sementara" : ""}`, [...seri.filter(x0 => x0.nilai[i]).map(x0 => [x0.warna, x0.nama, nilaiPenuh(k, x0.nilai[i])]),
          ...(seri.length > 1 ? [[null, "Jumlah", nilaiPenuh(k, jumlah[i])]] : []), ...(garis ? [[null, "Rata-rata 5 tahun", nilaiPenuh(k, rata[i])]] : [])]), `${t}: ${nilaiPenuh(k, jumlah[i])}`);
        svg.append(g);
      });
      if (garis) { const p = rata.map((v, i) => `${i ? "L" : "M"}${(kiri + (i + .5) * lebarB).toFixed(1)},${y(v).toFixed(1)}`).join("");
        svg.append(s("path", {d: p, class: "dt-garis"}), ...rata.map((v, i) => s("circle", {cx: kiri + (i + .5) * lebarB, cy: y(v), r: 2.5, class: "dt-titik"}))); }
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
        h("p", {class: "db-rk-besar"}, h("b", {teks: F(Math.round(kej))}), h("span", {teks: `kejadian${n > 1 ? `, ${F(Math.round(kej / n))} per tahun` : ""}`})),
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

    /* kalender bulan: baris tahun x kolom bulan, intensitas = kejadian */
    function trenBulan() {
      const m = new Map(); let maks = 1;
      const lolosB = r => st.kat.has(T.kategori[r[1]]) && (!st.prov || r[2] === st.prov);
      for (const r of T.bulan_prov) { if (!lolosB(r)) continue; const v = r[CB.kejadian]; m.set(r[0], (m.get(r[0]) || 0) + v); }
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
            ikat(c, () => barisTip(`${BLN_PANJANG[i]} ${t}`, [[null, "Kejadian", F(v)], ...(a ? [[null, "Rata-rata 5 tahun sebelumnya", F(Math.round(a.rata * 10) / 10)], [null, "Penanda", "di atas biasanya"]] : [])]),
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
      const m = new Map(); for (const x of D.harian) { if (!st.kat.has(x.kat) || (st.kab >= 0 ? x.i !== st.kab : st.prov && x.prov !== st.prov)) continue; m.set(x.tanggal, (m.get(x.tanggal) || 0) + nilai(x)); }
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
        const [y, mo, d] = tg.split("-"); ikat(kotak, () => barisTip(`${+d} ${BLN_PANJANG[+mo - 1]} ${y}`, [[null, LABEL[k], nilaiPenuh(k, v)]]), `${+d} ${BLN_PANJANG[+mo - 1]} ${y}: ${nilaiPenuh(k, v)}`);
        svg.append(kotak); });
      bTren.hari.replaceChildren(h("div", {class: "dt-gulir", tabindex: "0", role: "region", "aria-label": "Kalender harian"}, svg));
      const jml = [...m.values()].reduce((a, b) => a + b, 0);
      bTren.legHari.replaceChildren(h("span", {teks: "Sedikit"}), ...[0, 1, 2, 3, 4, 5].map(i => h("i", {class: "dt-hari-sel", "data-tingkat": String(i)})), h("span", {teks: "Banyak"}),
        h("span", {class: "dt-leg-ket", teks: `Jumlah 365 hari: ${nilaiPenuh(k, jml)}. Saringan tahun tidak berlaku di sini.`}));
    }

    /* ---------- tab Sebaran ---------- */
    const pSebar = h("select", {id: "dtUkur"}, pilihan(st.sebar, UKUR.map(([k, l]) => [k, l])));
    pSebar.addEventListener("change", () => { st.sebar = pSebar.value; nanti(gambarSebaran); });
    const bSeb = {kat: h("div", {class: "dt-hbar"}), wil: h("div", {class: "dt-hbar"}), kab: h("div", {class: "dt-hbar"}), judulWil: h("span"), judulKab: h("span")};
    panel.sebaran.append(h("div", {class: "dt-isi"},
      h("div", {class: "dt-sebar-alat"}, h("div", {class: "dt-f-isi dt-ukur"}, h("label", {for: "dtUkur", teks: "Ukuran"}), pSebar),
        T.penduduk ? segmen([[false, "Jumlah"], [true, "Per 100 ribu penduduk per tahun"]], st.per100, v => { st.per100 = v; nanti(gambarSebaran); }, "Cara hitung wilayah") : null),
      h("div", {class: "dt-dua"}, kartu("daftar", "Per kategori bencana", null, bSeb.kat), h("section", {class: "dt-kartu"}, h("div", {class: "dt-k-kepala"}, h("h3", {}, ikon("wilayah"), bSeb.judulWil)), bSeb.wil)),
      h("section", {class: "dt-kartu"}, h("div", {class: "dt-k-kepala"}, h("h3", {}, ikon("wilayah"), bSeb.judulKab)), bSeb.kab)));
    function batangDatar(wadah, daftar, k, {klik, perKat, total, teks} = {}) {
      const maks = Math.max(1, ...daftar.map(x => x.v)), jumlah = total ?? daftar.reduce((a, x) => a + x.v, 0);
      if (!jumlah) { wadah.replaceChildren(h("p", {class: "dt-catatan", teks: `Tidak ada ${LABEL[k].toLowerCase()} tercatat untuk saringan ini.`})); return; }
      wadah.replaceChildren(h("ol", {class: "dt-hb-daftar"}, daftar.filter(x => x.v).map((x, i) => {
        const bar = h("span", {class: "dt-hb-bar"}); bar.style.inlineSize = (x.v / maks * 100).toFixed(2) + "%";
        if (perKat) for (const [kk, v] of [...perKat(x)].sort((a, b) => URUT_KAT.indexOf(a[0]) - URUT_KAT.indexOf(b[0]))) { const seg = warnai(h("i"), kat(kk)[2], "background"); seg.style.flexGrow = String(v); bar.append(seg); } else bar.append(warnai(h("i"), x.warna || "--brand2", "background"));
        const isi = [h("span", {class: "dt-hb-no", teks: String(i + 1)}), h("span", {class: "dt-hb-nama"}, x.ikon ? ikon(x.ikon) : null, h("span", {teks: x.nama, title: x.nama})), h("span", {class: "dt-hb-jalur"}, bar),
          h("b", {teks: teks ? teks(x.v) : SATUAN[k] === "rp" ? nilaiTeks(k, x.v) : F(Math.round(x.v)) + (SATUAN[k] === "ha" ? " ha" : "")})   /* angka penuh di semua baris: dulu 18.951 jadi "19 ribu" sementara 9.516 tetap utuh (QA 25 Nov 2026) */, h("small", {teks: teks ? "" : F(Math.round(x.v / jumlah * 1000) / 10) + "%"})];
        const baris = klik ? h("button", {type: "button", class: "dt-hb-baris", title: `Saring ke ${x.nama}`}, isi) : h("div", {class: "dt-hb-baris"}, isi);
        if (klik) baris.addEventListener("click", () => klik(x));
        if (perKat) ikat(baris, () => barisTip(x.nama, [...[...perKat(x)].sort((a, b) => b[1] - a[1]).map(([kk, v]) => [kat(kk)[2], kat(kk)[0], nilaiPenuh(k, v)]),
          ...(teks ? [[null, "Per 100 ribu penduduk per tahun", teks(x.v)], [null, "Penduduk", F(x.pend)]] : [])]), `${x.nama}: ${teks ? teks(x.v) + " per 100 ribu penduduk per tahun" : nilaiPenuh(k, x.v)}`), baris.removeAttribute("role");
        return h("li", {}, baris); })));
    }
    function gambarSebaran() {
      const k = st.sebar, perKat = new Map(), perWil = new Map(), perKab = new Map(), tingkatKab = !!st.prov;
      for (const r of T.tahun_kab) { if (!lolos(r)) continue; const v = ambilNilai(r, k), nk = T.kategori[r[1]], wk = tingkatKab ? r[2] : T.kab[r[2]][1];
        perKat.set(nk, (perKat.get(nk) || 0) + v);
        if (!perWil.has(wk)) perWil.set(wk, new Map()); const mw = perWil.get(wk); mw.set(nk, (mw.get(nk) || 0) + v);
        if (!perKab.has(r[2])) perKab.set(r[2], new Map()); const mk = perKab.get(r[2]); mk.set(nk, (mk.get(nk) || 0) + v); }
      const jml = m => [...m.values()].reduce((a, b) => a + b, 0);
      /* per 100 ribu penduduk per tahun = jumlah / banyak tahun / penduduk x 100.000 (wilayah tanpa data penduduk tidak ditampilkan) */
      const p100 = st.per100 && T.penduduk, nTh = st.sampai - st.dari + 1, pendProv = new Map();
      if (p100) T.kab.forEach((kb, i) => { const pd = T.penduduk[i]; if (pd) pendProv.set(kb[1], (pendProv.get(kb[1]) || 0) + pd); });
      const ubah = (x, pd) => p100 ? (pd ? {...x, pend: pd, v: x.v / nTh / pd * 1e5} : null) : x;
      const teks100 = p100 ? v => F(Math.round(v * 100) / 100) : null;
      batangDatar(bSeb.kat, [...perKat].map(([nk, v]) => ({nama: kat(nk)[0], ikon: kat(nk)[1], warna: kat(nk)[2], v})).sort((a, b) => b.v - a.v), k);
      bSeb.judulWil.textContent = tingkatKab ? `Per kabupaten/kota, ${PROV[st.prov] || st.prov}` : "Per provinsi";
      batangDatar(bSeb.wil, [...perWil].map(([w, m]) => ubah({kode: w, nama: tingkatKab ? T.kab[w][2] : PROV[w] || w, v: jml(m), m}, tingkatKab ? T.penduduk?.[w] : pendProv.get(w))).filter(Boolean).sort((a, b) => b.v - a.v).slice(0, tingkatKab ? 40 : 38), k,
        {teks: teks100, perKat: x => x.m, klik: x => { if (tingkatKab) { st.kab = x.kode; } else { st.prov = x.kode; st.kab = -1; sProv.value = x.kode; } isiKab(); sKab.value = st.kab; gambar(); status.textContent = `Disaring ke ${x.nama}`; }});
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
    function tabelUrut(id, judul, kolom, baris, {kakiTotal} = {}) {
      const tb = h("tbody", {}, baris.map(r => h("tr", {}, r.map((v, j) => kolom[j].angka ? h("td", {"data-value": String(v ?? 0), teks: kolom[j].teks ? kolom[j].teks(v) : F(v)}) : (j === 0 ? h("th", {scope: "row", teks: v}) : h("td", {teks: v}))))));
      const tabel = h("table", {class: "dt-tabel", id}, h("caption", {id: id + "-c", teks: judul}),
        h("thead", {}, h("tr", {}, kolom.map(c => h("th", {scope: "col", "data-type": c.angka ? "number" : "text", class: c.angka ? "dt-angka" : null}, h("button", {type: "button", teks: c.nama}))))), tb,
        kakiTotal ? h("tfoot", {}, h("tr", {}, kakiTotal.map((v, j) => j === 0 ? h("th", {scope: "row", teks: v}) : h("td", {teks: kolom[j].teks ? kolom[j].teks(v) : F(v)})))) : null);
      tabel.tHead.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; const th = b.closest("th");
        const arah = th.getAttribute("aria-sort") === "descending" ? "ascending" : "descending";
        for (const x of tabel.tHead.rows[0].cells) x.removeAttribute("aria-sort"); th.setAttribute("aria-sort", arah);
        const i = th.cellIndex, angka = th.dataset.type === "number", f = arah === "ascending" ? 1 : -1;
        const rows = [...tb.rows].map(r => [r, angka ? +r.cells[i].dataset.value : r.cells[i].textContent]);
        rows.sort((a, b) => f * (angka ? a[1] - b[1] : collator.compare(a[1], b[1])));
        for (const [r] of rows) tb.moveBefore ? tb.moveBefore(r, null) : tb.append(r);
        status.textContent = `${judul} diurutkan menurut ${b.textContent}, ${arah === "ascending" ? "naik" : "turun"}`; });
      return h("div", {class: "dt-gulir", role: "region", tabindex: "0", "aria-labelledby": id + "-c"}, tabel);
    }
    const bTab = {rekap: h("div"), daftar: h("div"), cari: h("input", {type: "search", id: "dtCari", placeholder: "Cari kab/kota, provinsi, atau jenis", autocomplete: "off"}), hal: 0};
    const unduhRekap = h("button", {type: "button", class: "dt-btn-teks"}, ikon("data"), h("span", {teks: "Unduh CSV"})), unduhDaftar = h("button", {type: "button", class: "dt-btn-teks"}, ikon("data"), h("span", {teks: "Unduh CSV"}));
    panel.tabel.append(h("div", {class: "dt-isi"}, kartu("daftar", "Rekap per wilayah", unduhRekap, bTab.rekap),
      kartu("daftar", "Daftar kejadian 365 hari terakhir", unduhDaftar, h("div", {class: "dt-f-isi dt-cari"}, h("label", {for: "dtCari", teks: "Cari"}), bTab.cari), bTab.daftar)));
    let rekapData = null;
    function gambarRekap() {
      const tingkatKab = !!st.prov, m = new Map();
      for (const r of T.tahun_kab) { if (!lolos(r)) continue; const w = tingkatKab ? r[2] : T.kab[r[2]][1]; if (!m.has(w)) m.set(w, KOL_REKAP.map(() => 0)); const a = m.get(w); KOL_REKAP.forEach((k, j) => (a[j] += ambilNilai(r, k))); }
      const baris = [...m].map(([w, a]) => [tingkatKab ? T.kab[w][2] : PROV[w] || w, ...a.map(v => Math.round(v * 10) / 10)]).sort((a, b) => b[1] - a[1]);
      const tot = KOL_REKAP.map((_, j) => baris.reduce((x, r) => x + r[j + 1], 0));
      const kolom = [{nama: tingkatKab ? "Kabupaten/kota" : "Provinsi"}, ...KOL_REKAP.map(k => ({nama: KEPALA_PENDEK[k], angka: true, ...(k === "kejadian" ? {teks: v => F(Math.round(v))} : {})}))];   // kejadian lintas kab dibagi rata di data: tampil bulat seperti ringkasan (QA 25 Nov 2026)
      rekapData = {kepala: kolom.map(c => c.nama), baris};
      bTab.rekap.replaceChildren(tabelUrut("dtRekap", `Rekap ${wilNama()}, ${st.dari} sampai ${st.sampai}`, kolom, baris, {kakiTotal: ["Jumlah", ...tot]}));
    }
    unduhRekap.addEventListener("click", () => rekapData && csv(`rekap-dibi-${wilNama().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${st.dari}-${st.sampai}.csv`, rekapData.kepala, rekapData.baris));
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
          return j === 0 ? h("th", {scope: "row", teks: t}) : h("td", {class: a ? "dt-angka" : null, teks: t}); })))));
      const nav = h("nav", {class: "dt-hal", "aria-label": "Halaman daftar"}, h("span", {teks: semua.length ? `${F(bTab.hal * per + 1)} sampai ${F(bTab.hal * per + tampil.length)} dari ${F(semua.length)} baris` : "Tidak ada kejadian untuk saringan ini"}));
      if (jmlHal > 1) { const b1 = h("button", {type: "button", class: "dt-btn-teks", disabled: bTab.hal === 0 || null, teks: "Sebelumnya"}), b2 = h("button", {type: "button", class: "dt-btn-teks", disabled: bTab.hal >= jmlHal - 1 || null, teks: "Berikutnya"});
        b1.addEventListener("click", () => { bTab.hal--; gambarDaftar(); }); b2.addEventListener("click", () => { bTab.hal++; gambarDaftar(); }); nav.append(b1, b2); }
      bTab.daftar.replaceChildren(h("div", {class: "dt-gulir", role: "region", tabindex: "0", "aria-labelledby": "dtDaftar-c"}, tabel), nav);
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
      const angka = [["Kejadian", F(Math.round(kej))], ["Rata-rata per tahun", F(Math.round(kej / nTh * 10) / 10)],
        ["Per 100 ribu penduduk per tahun", pend ? F(Math.round(kej / nTh / pend * 1e5 * 100) / 100) : "–"], ["Meninggal dan hilang", F(Math.round(total("mdh")))],
        ["Menderita dan mengungsi", ringkas(total("terdampak"))], ["Rumah rusak", F(Math.round(total("rumah")))]];
      const grafik = h("div", {class: "dt-grafik db-profil-grafik"}), musim = h("div"), musimKet = h("span", {class: "dt-pil dt-pil-netral"});
      const terakhir = D.harian.filter(x => x.i === st.kab).sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 8);
      const darurat = D.darurat.filter(x => x.kab === kode), posko = D.posko.filter(x => x.kab === kode), rambu = D.rambu.filter(x => x.kab === kode);
      const perRambu = new Map(); rambu.forEach(x => perRambu.set(x.jenis, (perRambu.get(x.jenis) || 0) + x.n));
      const bagi = h("button", {type: "button", class: "dt-btn-teks"}, ikon("akses"), h("span", {teks: "Bagikan tautan profil"})), cetak = h("button", {type: "button", class: "dt-btn-teks"}, ikon("daftar"), h("span", {teks: "Cetak A4"}));
      bagi.addEventListener("click", () => bBagi.click()); cetak.addEventListener("click", () => cetakProfil());
      const daftar = (kosong, baris) => baris.length ? h("ul", {class: "db-pf-daftar"}, baris) : h("p", {class: "dt-catatan", teks: kosong});
      bPro.isi.replaceChildren(
        h("header", {class: "db-pf-kepala"}, h("div", {}, h("h2", {teks: kb[2]}), h("p", {teks: `${PROV[kb[1]] || kb[1]}${pend ? `, penduduk ${F(pend)} jiwa` : ""}, ${st.dari} sampai ${st.sampai}`})), h("div", {class: "dt-aksi"}, bagi, cetak)),
        h("div", {class: "db-pf-angka"}, angka.map(([l, v]) => h("div", {}, h("b", {teks: v}), h("span", {teks: l})))),
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
      grafikTahun(grafik, seriKat("kejadian")); trenMusim(musim, musimKet);
    }

    const gambarTab = () => { if (st.tab === "tren") { trenKej(); trenKorban(); trenRumah(); trenBulan(); trenMusim(); trenHari(); }
      else if (st.tab === "sebaran") gambarSebaran(); else if (st.tab === "profil") gambarProfil(); else if (st.tab === "tabel") { gambarRekap(); gambarDaftar(); } };
    let antre = false;
    function gambar() { if (antre) return; antre = true; nanti(() => { antre = false; sembunyiTip();   /* elemen yang di-hover diganti: tanpa ini tooltip menggantung */ gambarRingkasan(); gambarTab(); kirimPeta(); if (akar.id === "dtWadah") history.replaceState(history.state, "", tautan()); }); }
    /* cetak A4: semua tab digambar, hanya wadah ini yang tercetak (kelas jalur di leluhurnya) */
    const jalur = []; for (let e = akar.parentElement; e && e !== document.documentElement; e = e.parentElement) jalur.push(e);
    const siapCetak = (hanyaProfil) => { document.documentElement.classList.add("dt-mencetak"); document.documentElement.classList.toggle("dt-cetak-profil", !!hanyaProfil);
      if (hanyaProfil) { jalur.forEach(e => e.classList.add("dt-jalur")); akar.classList.add("dt-jalur-akar"); panel.profil.classList.add("dt-panel-cetak"); gambarProfil(); return; } jalur.forEach(e => e.classList.add("dt-jalur")); akar.classList.add("dt-jalur-akar");
      Object.values(panel).forEach(p => p.classList.add("dt-panel-cetak")); gambarRingkasan(); trenKej(); trenKorban(); trenRumah(); trenBulan(); trenMusim(); gambarSebaran(); gambarRekap(); };
    const usaiCetak = () => { document.documentElement.classList.remove("dt-mencetak", "dt-cetak-profil"); jalur.forEach(e => e.classList.remove("dt-jalur")); akar.classList.remove("dt-jalur-akar"); Object.values(panel).forEach(p => p.classList.remove("dt-panel-cetak")); nanti(gambarTab); };
    cetakProfil = () => { siapCetak(true); requestAnimationFrame(() => setTimeout(() => window.print(), 50)); };
    bCetak.addEventListener("click", () => { siapCetak(); requestAnimationFrame(() => setTimeout(() => window.print(), 50)); });
    window.addEventListener("afterprint", () => { if (document.documentElement.classList.contains("dt-mencetak")) usaiCetak(); });
    gambar();
    let lebarLalu = akar.clientWidth;
    new ResizeObserver(() => { const w = akar.clientWidth; if (Math.abs(w - lebarLalu) > 24) { lebarLalu = w; if (st.tab === "tren") nanti(gambarTab); } }).observe(akar);
  }

  window.DibiTren = {pasang};
  const w = document.getElementById("dtWadah"); if (w) pasang(w, {dasbor: w.dataset.dasbor === "1"});
})();
