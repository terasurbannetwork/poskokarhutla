/* Fungsi MURNI layar Pantau Banjir Dalops (/bnpb/dalops): kelompok per kab/kota, perlu ditanya, status banjir per kab, teks WA.
   Tanpa DOM dan tanpa fetch. Dimuat peramban (window.DalopsHitung) dan node untuk uji (tests/bnpb/dalops.test.mjs).
   Masukan: JSON /api/dalops/banjir (scripts/data/dalops_banjir.py) dan /banjir/data/status.json. Semua tanggal YYYY-MM-DD,
   dihitung terhadap hari logbook terakhir (data.hari), bukan jam perangkat: logbook periode 07.00-07.00 WIB. */
(g => {
  "use strict";
  const SEPEKAN = 6, NAMA_LEVEL = ["Aman", "Waspada", "Siaga", "Awas"];
  const hari = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
  const selisih = (a, b) => hari(a) - hari(b);   // a - b dalam hari
  const tutup = s => (s || "").replace(/^(Kab\.|Kabupaten)\s+/i, "");
  /* nama kab dari kunci "11|Aceh Barat" atau dari daftar nama logbook */
  const namaKab = (kode, kab) => kode && !kode.endsWith("|(provinsi)") ? kode.split("|")[1] : tutup((kab || [])[0] || "");   // gempa tingkat provinsi: pakai nama barisnya

  /* satu baris per kab/kota DAN status surut (sama dengan deck Situasi Banjir Sepekan): mulai paling awal, kabar paling akhir,
     angka dari kejadian terakhir yang mengisinya. Satu kab bisa muncul di dua kelompok (Langkat: satu kejadian surut, satu belum).
     Kejadian yang kabarnya lebih tua dari sepekan dikelompokkan terpisah (senyap), supaya tidak memanjangkan lama banjir kejadian pekan ini. */
  /* histori harian dua kejadian sekab: angka dijumlah per tanggal, tinggi diambil rentang terlebar, kondisi dari yang terakhir */
  const TINDAK = ["upaya", "terlibat", "kebutuhan", "kendala"];   // daftar teks tindakan dari logbook (scripts/data/dalops_banjir.py butir())
  function gabungRiwayat(a, b) {
    const m = new Map(a.map(r => [r.tgl, {...r}]));
    for (const r of b) {
      const x = m.get(r.tgl);
      if (!x) { m.set(r.tgl, {...r}); continue; }
      for (const f of ["kk", "jiwa", "kk_u", "jiwa_u", "n_kec", "n_desa"]) if (r[f] != null) x[f] = (x[f] || 0) + r[f];
      if (r.tinggi_cm) x.tinggi_cm = x.tinggi_cm ? [Math.min(x.tinggi_cm[0], r.tinggi_cm[0]), Math.max(x.tinggi_cm[1], r.tinggi_cm[1])] : r.tinggi_cm;
      x.surut = x.surut && r.surut; if (r.kondisi) x.kondisi = r.kondisi;
      if (r.desa) x.desa = [...(x.desa || []), ...r.desa];
      for (const f of TINDAK) if (r[f]?.length) x[f] = [...new Set([...(x[f] || []), ...r[f]])];
    }
    return [...m.values()].sort((p, q) => p.tgl < q.tgl ? -1 : 1);
  }
  /* desa per kecamatan untuk rincian: kecamatan dari daftar logbook + yang disebut di teks; desa tanpa kecamatan dikumpulkan terpisah */
  function perKec(x) {
    const m = new Map((x.kec || []).map(k => [k.toLowerCase(), {nama: k, desa: []}]));
    const lain = {nama: null, desa: []};
    for (const d of x.desa || []) {
      const k = d.kec && (m.get(d.kec.toLowerCase()) || m.set(d.kec.toLowerCase(), {nama: d.kec, desa: []}).get(d.kec.toLowerCase()));
      (k || lain).desa.push(d);
    }
    return [...m.values(), ...(lain.desa.length ? [lain] : [])];
  }

  /* desa atau hari histori yang punya minimal satu angka (KK, jiwa, tinggi air); tanpa angka = baris berisi "–" saja */
  const adaAngka = d => d.kk != null || d.jiwa != null || !!d.tinggi_cm;

  function kelompok(kejadian, h) {
    const m = new Map();
    for (const k of [...kejadian].sort((a, b) => (a.terakhir > b.terakhir) - (a.terakhir < b.terakhir))) {
      const kode = (k.kab_kode || [])[0] || "", kunci = (kode || "?" + namaKab("", k.kab)) + "|" + (k.surut ? 1 : 0) + "|" + (selisih(h, k.terakhir) > SEPEKAN ? "senyap" : "pekan");
      const x = m.get(kunci) || {kunci, kab_kode: kode, nama: namaKab(kode, k.kab), prov: k.prov, prov_kode: k.prov_kode, surut: k.surut, mulai: k.mulai, terakhir: k.terakhir,
        kk: null, jiwa: null, mengungsi: null, kk_u: null, rumah_terendam: null, tinggi_cm: null, kondisi: "", id: [], kec: [], desa: [], riwayat: [],
        upaya: [], terlibat: [], kebutuhan: [], kendala: [], upaya_tgl: null, md: null, hilang: null, status_darurat: null};
      if (k.mulai && k.mulai < x.mulai) x.mulai = k.mulai;
      if (k.terakhir > x.terakhir) x.terakhir = k.terakhir;
      for (const f of ["kk", "jiwa", "mengungsi", "kk_u", "rumah_terendam", "tinggi_cm", "md", "hilang", "status_darurat"]) if (k[f] != null && k[f] !== "") x[f] = k[f];   // md, hilang, status_darurat: gempa dst, kosong bila tidak dilaporkan
      for (const c of k.kec || []) if (!x.kec.includes(c)) x.kec.push(c);
      for (const d of k.desa || []) { const ada = x.desa.find(y => y.nama.toLowerCase() === d.nama.toLowerCase()); if (ada) Object.assign(ada, Object.fromEntries(Object.entries(d).filter(([, v]) => v != null))); else x.desa.push({...d}); }
      x.riwayat = gabungRiwayat(x.riwayat, k.riwayat || []);
      if (k.kondisi) x.kondisi = k.kondisi;
      /* tindakan: dari kejadian terakhir yang mengisinya (urutan kabar naik, jadi yang terbaru menang) */
      for (const f of TINDAK) if (k[f]?.length) x[f] = k[f];
      if (k.upaya_tgl && (!x.upaya_tgl || k.upaya_tgl >= x.upaya_tgl)) x.upaya_tgl = k.upaya_tgl;
      if (k.luar) x.luar = gabungLuar(x.luar, k.luar);   // Cek Kabar Luar: label paling waspada, bukti gabungan
      x.id.push(k.id); m.set(kunci, x);
    }
    return [...m.values()].sort((a, b) => a.prov_kode.localeCompare(b.prov_kode) || a.nama.localeCompare(b.nama));
  }
  /* Cek Kabar Luar (data/kajian-bnpb/cek-kabar/ALGORITMA 5): label kelompok = yang paling waspada (masih > belum_ada > mungkin_selesai),
     bukti gabungan maksimal 5 terbaru tanpa dobel tautan. Label tidak pernah menutup kejadian. */
  const WASPADA_LUAR = {mungkin_selesai: 0, belum_ada: 1, masih: 2};
  function gabungLuar(a, b) {
    if (!a) return {...b, bukti: [...(b.bukti || [])]};
    const menang = (WASPADA_LUAR[b.label] ?? 1) > (WASPADA_LUAR[a.label] ?? 1) ? b : a, lihat = new Set();
    const bukti = [...(a.bukti || []), ...(b.bukti || [])].sort((x, y) => (y.tgl || "").localeCompare(x.tgl || "")).filter(x => !lihat.has(x.url) && lihat.add(x.url)).slice(0, 5);
    return {...menang, senyap: Math.min(a.senyap ?? 999, b.senyap ?? 999), bukti};
  }
  /* ringkasan label per tab: dihitung dari kelompok belum selesai yang berlabel */
  const ringkasLuar = kel => kel.filter(x => !x.surut && x.luar).reduce((n, x) => (n[x.luar.label] = (n[x.luar.label] || 0) + 1, n), {masih: 0, mungkin_selesai: 0, belum_ada: 0});

  /* lama banjir dalam hari, termasuk hari mulai: belum surut s.d. hari logbook, sudah surut s.d. kabar terakhir (sama dengan deck) */
  const lama = (x, h) => selisih(x.surut ? x.terakhir : h, x.mulai || x.terakhir) + 1;
  const sepekan = (kel, h) => kel.filter(x => selisih(h, x.terakhir) <= SEPEKAN);

  /* kata per jenis untuk teks WA dan daftar kurang (pemilik 5 Nov 2026: Pantau = Karhutla, Banjir, Longsor). 'surut' di data = selesai menurut jenisnya. */
  const KATA = {
    banjir: {kata: "banjir", selesai: "surut", tanya: "apakah banjir sudah surut", ukur: "tinggi genangan", tinggi: true, alat: "logistik, perahu, pompa, alat berat"},
    longsor: {kata: "longsor", selesai: "tertangani", tanya: "apakah akses sudah bisa dilalui dan material sudah dibersihkan", ukur: "", tinggi: false, alat: "logistik, alat berat, tenda"},
    gempa: {kata: "gempa bumi", selesai: "selesai", tanya: "apakah penanganan dampak gempa sudah selesai (korban, kerusakan, pengungsi)", ukur: "", tinggi: false, alat: "logistik, tenda, alat berat, tenaga medis"},
    cuaca: {kata: "cuaca ekstrem", selesai: "selesai", tanya: "apakah dampak cuaca ekstrem sudah tertangani", ukur: "", tinggi: false, alat: "logistik, tenda, alat berat, terpal"},
    kekeringan: {kata: "kekeringan", selesai: "berakhir", tanya: "apakah kekeringan sudah berakhir dan bagaimana pasokan air bersih", ukur: "", tinggi: false, alat: "air bersih, tangki air, pompa"},
    /* 11 Nov 2026: tab sendiri */
    gelombang: {kata: "gelombang pasang", selesai: "surut", tanya: "apakah air laut sudah surut dan bagaimana kerusakan di pesisir", ukur: "", tinggi: false, alat: "logistik, tenda, karung pasir, alat berat"},
    permukiman: {kata: "kebakaran permukiman", selesai: "padam", tanya: "apakah api sudah padam dan berapa rumah rusak serta warga mengungsi", ukur: "", tinggi: false, alat: "logistik, tenda, sandang, makanan siap saji"}};

  /* belum surut yang kabarnya lebih dari sehari atau angkanya bolong. Urut kabar paling lama dulu. */
  function perluDitanya(kel, h, j = KATA.banjir) {
    const out = [];
    for (const x of kel) {
      if (x.surut) continue;
      const umur = selisih(h, x.terakhir), kurang = [];
      if (umur >= 1) kurang.push("kabar");
      if (x.kk == null) kurang.push("kk");
      if (x.jiwa == null) kurang.push("jiwa");
      if (j.tinggi && x.tinggi_cm == null) kurang.push("tinggi");
      if (kurang.length || x.luar?.label === "mungkin_selesai") out.push({...x, umur, kurang, senyap: umur > SEPEKAN});   // kemungkinan selesai ikut ditanya walau angkanya lengkap
    }
    /* urutan: label kabar luar (kemungkinan selesai dulu, lalu belum ada kabar, lalu masih), lalu paling lama senyap; tanpa label = belum ada kabar */
    const rank = x => WASPADA_LUAR[x.luar?.label ?? "belum_ada"];
    return out.sort((a, b) => rank(a) - rank(b) || (b.luar?.senyap ?? b.umur) - (a.luar?.senyap ?? a.umur) || b.umur - a.umur || a.nama.localeCompare(b.nama));
  }

  /* status.json per kecamatan -> per kab: level harian = tertinggi di kecamatannya, h3 = tertinggi, h3d = hujan tiga hari per tanggal (tertinggi) */
  function statusKab(st, f = "b") {   // f: "b" banjir, "l" longsor (status.json membawa keduanya); hasil tetap di x.b
    const out = {};
    for (const [k, v] of Object.entries(st?.kec || {})) {
      const [p, kab] = k.split("|"), kode = p + "|" + kab, x = out[kode] || (out[kode] = {kab_kode: kode, prov_kode: p, nama: kab, b: [], h3: null, h3d: []});
      (v[f] || []).forEach((l, i) => { if (l != null && !(x.b[i] >= l)) x.b[i] = l; });
      if (v.h3 != null && !(x.h3 >= v.h3)) x.h3 = v.h3;
      (v.h3d || []).forEach((m, i) => { if (m != null && !(x.h3d[i] >= m)) x.h3d[i] = m; });
    }
    return out;
  }
  /* kab dengan level >= min di salah satu hari. Urut: level tertinggi, yang sepekan ini sudah banjir dulu, lalu hujan tiga hari. */
  function siaga(sk, sudahBanjir, min = 2) {
    return Object.values(sk).map(x => ({...x, maks: Math.max(...x.b.map(l => l ?? 0)), sudah: sudahBanjir.has(x.kab_kode)}))
      .filter(x => x.maks >= min).sort((a, b) => b.maks - a.maks || b.sudah - a.sudah || (b.h3 ?? 0) - (a.h3 ?? 0) || a.nama.localeCompare(b.nama));
  }

  /* ringkasan per provinsi dari baris sepekan (satu kab bisa dua baris: surut dan belum): kab unik, kab belum surut, jumlah KK/jiwa/mengungsi,
     kejadian = banyak id logbook. Urut kejadian terbanyak. */
  function perProv(pekan) {
    const m = new Map();
    for (const x of pekan) {
      const r = m.get(x.prov_kode) || m.set(x.prov_kode, {prov_kode: x.prov_kode, prov: x.prov, kab: new Set(), belum: new Set(), kk: 0, jiwa: 0, kk_u: 0, mengungsi: 0, kejadian: 0, baris: []}).get(x.prov_kode);
      const kunci = x.kab_kode || x.nama;
      r.kab.add(kunci); if (!x.surut) r.belum.add(kunci);
      r.kk += x.kk || 0; r.jiwa += x.jiwa || 0; r.kk_u += x.kk_u || 0; r.mengungsi += x.mengungsi || 0; r.kejadian += x.id.length; r.baris.push(x);
    }
    return [...m.values()].map(r => ({...r, nKab: r.kab.size, nBelum: r.belum.size})).sort((a, b) => b.kejadian - a.kejadian || a.prov_kode.localeCompare(b.prov_kode));
  }

  const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const tglPanjang = s => s ? `${+s.slice(8, 10)} ${BLN[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}` : "–";
  const tglPendek = s => s ? `${+s.slice(8, 10)} ${BLN[+s.slice(5, 7) - 1].slice(0, 3)}` : "–";
  const NAMA_KURANG = j => ({kabar: "kondisi terkini dan " + j.tanya, kk: "jumlah KK terdampak", jiwa: "jumlah jiwa terdampak", tinggi: "tinggi genangan (cm)", upaya: "upaya penanganan yang sudah dilakukan"});
  /* pesan siap tempel ke grup WA BPBD: netral-formal, tanpa sapaan nama */
  function pesanWA(x, j = KATA.banjir) {
    /* kemungkinan selesai menurut kabar luar: minta konfirmasi, tanpa meneruskan isi berita (KEAMANAN-PRIVASI cek-kabar) */
    if (x.luar?.label === "mungkin_selesai")
      return `Yth. rekan BPBD ${x.nama}. Pusdalops BNPB mencatat ${j.kata} di ${x.nama} sejak ${tglPanjang(x.mulai)}, kabar terakhir ${tglPanjang(x.terakhir)}, belum dilaporkan ${j.selesai}.\n` +
        `Mohon konfirmasi apakah sudah selesai (${j.selesai}). Bila sudah, mohon tanggal ${j.selesai} dan angka akhir terdampak. Bila belum, mohon kondisi terkini. Terima kasih.`;
    const minta = [...new Set(["kabar", ...x.kurang])].map(k => NAMA_KURANG(j)[k]);
    if (x.mengungsi == null) minta.push("jumlah warga mengungsi dan lokasi pengungsian");
    return `Yth. rekan BPBD ${x.nama}. Pusdalops BNPB mencatat ${j.kata} di ${x.nama} sejak ${tglPanjang(x.mulai)}, kabar terakhir ${tglPanjang(x.terakhir)}, belum dilaporkan ${j.selesai}.\n` +
      `Mohon pembaruan:\n${minta.map((m, i) => `${i + 1}. ${m[0].toUpperCase() + m.slice(1)}`).join("\n")}\n` +
      `Bila ada kebutuhan mendesak (${j.alat}), mohon disampaikan sekalian. Terima kasih.`;
  }

  /* pesan peringatan dini untuk kab berstatus Waspada ke atas: status dan hujan tiga hari per tanggal, minta siaga dan kabar bila banjir */
  function pesanSiaga(x, hari, j = KATA.banjir) {
    const baris = hari.map((t, i) => `${i + 1}. ${tglPanjang(t)}: ${NAMA_LEVEL[x.b[i] ?? 0]}${x.h3d?.[i] != null ? `, hujan tiga hari ${Math.round(x.h3d[i])} mm` : ""}`);
    const K = j.kata[0].toUpperCase() + j.kata.slice(1);
    return `Yth. rekan BPBD ${x.nama}. Pusdalops BNPB menyampaikan prakiraan status ${j.kata} ${x.nama}:\n${baris.join("\n")}\n` +
      (x.sudah ? `${K} sepekan ini sudah tercatat di logbook. Mohon kabar kondisi terkini dan ${j.tanya}.\n` : "") +
      `Mohon kesiapsiagaan, dan bila terjadi ${j.tinggi ? "banjir atau genangan" : j.kata} mohon dikabarkan lokasi, jumlah KK dan jiwa terdampak${j.tinggi ? ", serta tinggi air" : ", serta akses yang tertutup"}. Terima kasih.`;
  }

  /* pesan per provinsi ke Pusdalops BPBD provinsi: daftar kab/kota belum surut dengan kabar terakhirnya */
  function pesanProv(prov, xs, j = KATA.banjir) {
    const belum = xs.filter(x => !x.surut);
    return `Yth. rekan Pusdalops BPBD Provinsi ${prov}. Pusdalops BNPB mencatat ${j.kata} belum dilaporkan ${j.selesai} di ${belum.length} kab/kota:\n` +
      belum.map((x, i) => `${i + 1}. ${x.nama}, sejak ${tglPanjang(x.mulai)}, kabar terakhir ${tglPanjang(x.terakhir)}`).join("\n") +
      `\nMohon pembaruan kondisi terkini tiap kab/kota: ${j.tanya}, jumlah KK dan jiwa terdampak, warga mengungsi, ${j.tinggi ? "tinggi genangan, " : ""}serta desa/kelurahan terdampak. Terima kasih.`;
  }

  /* Mitigasi (tab Banjir): usulan langkah per kab/kota dari data hidup. Satu kab satu kelompok, prioritas terdampak > awas > siaga > pantau.
     Langkah hanya dari data yang ada: kebutuhan/kendala terlapor, posko lapangan (posko.json), kecamatan berstatus, kecamatan lereng (l >= 2). Tidak ada langkah karangan. */
  const sebut = (xs, maks = 3) => xs.slice(0, maks).join(", ") + (xs.length > maks ? ` dan ${xs.length - maks} lainnya` : "");
  const maksArr = a => Math.max(0, ...(a || []).map(l => l ?? 0));
  function mitigasi(st, posko, pekan, hari) {
    const kabSt = new Map();   // "11|Aceh Barat" -> [{nama, b, l}]
    for (const [k, v] of Object.entries(st?.kec || {})) {
      const [p, kb, kc] = k.split("|"), kode = p + "|" + kb;
      (kabSt.get(kode) || kabSt.set(kode, []).get(kode)).push({nama: kc, b: v.b || [], l: v.l || []});
    }
    const tgl = i => i <= 0 || st.hari?.[i] < hari ? "Sekarang" : "Sebelum " + tglPendek(st.hari?.[i]);   // tanggal yang sudah lewat bukan tenggat
    const pakai = new Set(), grup = [];
    const buat = (kunci, judul, baris) => grup.push({kunci, judul, baris});
    /* 1. terdampak belum surut */
    const terdampak = [];
    for (const x of pekan || []) {
      if (x.surut || !x.kab_kode || pakai.has(x.kab_kode)) continue;
      pakai.add(x.kab_kode);
      const l = [];
      if (x.kebutuhan?.length) l.push("Penuhi kebutuhan: " + x.kebutuhan.join(", "));
      if (x.kendala?.length) l.push("Atasi kendala: " + x.kendala.join(", "));
      if (x.terakhir && hari && x.terakhir < hari) l.push("Konfirmasi status surut ke BPBD, laporan terakhir " + tglPendek(x.terakhir));
      if (x.kk == null && x.jiwa == null) l.push("Tuntaskan pendataan dampak");
      terdampak.push({kab_kode: x.kab_kode, nama: x.nama, prov_kode: x.prov_kode, langkah: l.join("; ") || "Lanjutkan penanganan dan laporkan perkembangan", tenggat: "Sekarang", _n: (x.kec || []).length});
    }
    /* 2-3. awas lalu siaga; 4. pantau */
    const per = {3: [], 2: []}, pantau = [];
    const adaPekan = new Map((pekan || []).map(x => [x.kab_kode, x]));
    for (const [kode, kecs] of kabSt) {
      if (pakai.has(kode)) continue;
      const lv = Math.max(...kecs.map(c => maksArr(c.b)));
      const [p, nama] = kode.split("|");
      if (lv >= 2) {
        const idx = Math.min(...kecs.flatMap(c => c.b.map((v, i) => v >= lv ? i : 99)));
        const tinggi = kecs.filter(c => maksArr(c.b) >= lv).map(c => c.nama).sort();
        const ps = new Set((posko?.lapangan || []).filter(o => o.prov === p && o.kab === nama && (o.jenis === "permanen" || o.jenis === "siaga")).map(o => (o.kec || "").toLowerCase()));
        const dgPosko = tinggi.filter(n => ps.has(n.toLowerCase())), evak = tinggi.filter(n => !ps.has(n.toLowerCase()));
        const lereng = kecs.filter(c => maksArr(c.l) >= 2).map(c => c.nama).sort();
        const l = [dgPosko.length && "Posko " + sebut(dgPosko), evak.length && "siapkan evakuasi " + sebut(evak), lereng.length && "pantau lereng " + sebut(lereng)].filter(Boolean);
        l[0] = l[0][0].toUpperCase() + l[0].slice(1);
        pakai.add(kode);
        per[lv >= 3 ? 3 : 2].push({kab_kode: kode, nama, prov_kode: p, langkah: l.join("; "), tenggat: tgl(idx), _i: idx, _n: tinggi.length});
      } else if (lv === 1 && adaPekan.get(kode)?.surut) {
        const w = kecs.filter(c => maksArr(c.b) >= 1).map(c => c.nama).sort();
        pantau.push({kab_kode: kode, nama, prov_kode: p, langkah: "Pantauan khusus: " + sebut(w, 4), tenggat: "", _n: w.length});
      }
    }
    const urut = xs => xs.sort((a, b) => (a._i ?? 0) - (b._i ?? 0) || b._n - a._n || a.nama.localeCompare(b.nama)).map(({_i, _n, ...r}) => r);
    buat("terdampak", "Terdampak belum surut", urut(terdampak)); buat("awas", "Awas", urut(per[3])); buat("siaga", "Siaga", urut(per[2])); buat("pantau", "Pantauan khusus", urut(pantau));
    const g = grup.filter(x => x.baris.length), n = Object.fromEntries(grup.map(x => [x.kunci, x.baris.length]));
    return {grup: g, n: {terdampak: n.terdampak, awas: n.awas, siaga: n.siaga, pantau: n.pantau, total: g.reduce((a, x) => a + x.baris.length, 0)}};
  }

  /* ---------- Laporan Masuk (tab pemantau rekap harian WA Koordalops; kontrak GET /api/dalops/laporan) ----------
     hari = [{tanggal, status: "ok"|"gagal", kejadian: [{jenis, prov, lokasi, tempat, sifat: "baru"|"pengkinian"|"", status: "berjalan"|"belum"|"selesai"}]}] urut apa saja.
     Semua tanggal YYYY-MM-DD (tanggal rekap WIB). Tanpa DOM, tanpa fetch. */
  const JENDELA_TERBUKA = 14, USUL_TUTUP = 7, MULAI_CEK = 7;
  const geser = (s, n) => new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) + n * 864e5).toISOString().slice(0, 10);
  const normLokasi = s => String(s || "").toLowerCase().replace(/^\s*(kabupaten|kab\.?|kota|provinsi|prov\.?)\s+/, "").replace(/\s+/g, " ").trim();
  const kunciKejadian = k => `${k.jenis}|${k.prov}|${normLokasi(k.lokasi)}`;
  const NAMA_JENIS = {banjir: "Banjir", longsor: "Tanah longsor", karhutla: "Karhutla", gempabumi: "Gempa bumi", gunungapi: "Gunung api", cuaca: "Cuaca ekstrem", kekeringan: "Kekeringan",
    kebakaran_permukiman: "Kebakaran permukiman", kecelakaan: "Gagal teknologi", konflik_sosial: "Konflik sosial", gelombang_pasang: "Gelombang pasang", tsunami: "Tsunami", wabah: "Wabah", lainnya: "Lainnya"};
  /* nilai jenis rekap (laporan_urai.js jenisDari) sudah memakai kode logbook (src/logbook.js JENIS); hanya dua yang digabung urai ke jenis lain */
  const JENIS_LOGBOOK = {tsunami: "gempabumi", gelombang_pasang: "cuaca"};
  const jenisLogbook = j => JENIS_LOGBOOK[j] || j;
  const labelKejadian = (k, namaProv) => `${k.label || NAMA_JENIS[k.jenis] || "Kejadian"} ${k.tempat || namaProv(k.prov)}`.trim();
  const KATA_UMUM = {kata: "kejadian", selesai: "selesai", tanya: "apakah penanganan sudah selesai", tinggi: false, alat: "logistik, peralatan"};
  const kataJenis = j => ({gempabumi: KATA.gempa, gelombang_pasang: KATA.gelombang, kebakaran_permukiman: KATA.permukiman, karhutla: {kata: "karhutla", selesai: "padam", tanya: "apakah api sudah padam", tinggi: false, alat: "pompa, selang, logistik regu"}}[j]
    || KATA[j] || {...KATA_UMUM, kata: (NAMA_JENIS[j] || "kejadian").toLowerCase()});

  /* tujuh tanggal WIB terakhir, terbaru dulu; hari ini dilewati sebelum 07.00 WIB (rekap belum semestinya masuk) */
  function tanggalPantau(kiniMs) {
    const w = new Date(kiniMs + 7 * 36e5), hariIni = w.toISOString().slice(0, 10), awal = w.getUTCHours() < 7 ? geser(hariIni, -1) : hariIni;
    return [...Array(7)].map((_, i) => geser(awal, -i));
  }

  /* arsip rekap yang terbaca (status ok), tanggal naik; kunci -> kemunculan [{tanggal, k}] naik */
  function indeksArsip(hari) {
    const ok = [...hari].filter(x => x.status === "ok").sort((a, b) => a.tanggal < b.tanggal ? -1 : 1), m = new Map();
    for (const d of ok) {
      const lihat = new Set();
      for (const k of d.kejadian || []) { const c = kunciKejadian(k); if (lihat.has(c)) continue; lihat.add(c); (m.get(c) || m.set(c, []).get(c)).push({tanggal: d.tanggal, k}); }
    }
    return {ok, awal: ok[0]?.tanggal || null, m};
  }

  /* laporan pertama: tanggal terawal kunci itu; kemunculan pertama di tanggal arsip paling awal dan bersifat pengkinian = "Sebelum <awal>" (hari ke tak diketahui) */
  function riwayatKunci(ar, kunci, T) {
    const a = (ar.m.get(kunci) || []).filter(e => e.tanggal <= T);
    if (!a.length) return null;
    const p = a[0], sebelum = p.tanggal === ar.awal && p.k.sifat === "pengkinian";
    return {pertama: p.tanggal, sebelum, hariKe: sebelum ? null : selisih(T, p.tanggal) + 1};
  }

  function ringkasLaporan(hari, T) {
    const ar = indeksArsip(hari), rekap = hari.find(x => x.tanggal === T);
    if (!rekap || rekap.status !== "ok") return {ada: false, status: rekap ? rekap.status : "belum", baru: [], pengkinian: [], tagih: [], perluDicek: []};
    const tampil = new Set(), kini = [];
    for (const k of rekap.kejadian || []) { const c = kunciKejadian(k); if (!tampil.has(c)) { tampil.add(c); kini.push({kunci: c, k}); } }
    const dari = geser(T, -JENDELA_TERBUKA);
    /* terbuka sebelum T: muncul dalam 14 hari sebelum T dan status kemunculan terakhir (sebelum T) bukan selesai */
    const sebelumT = new Map();
    for (const [c, es] of ar.m) { const w = es.filter(e => e.tanggal < T && e.tanggal >= dari); if (w.length && w[w.length - 1].k.status !== "selesai") sebelumT.set(c, w[w.length - 1]); }
    const tagih = [...sebelumT].filter(([c]) => !tampil.has(c)).map(([c, e]) => {
      const tanpa = selisih(T, e.tanggal), r = riwayatKunci(ar, c, T);
      return {kunci: c, k: e.k, kabarTerakhir: e.tanggal, tanpa, nada: tanpa >= 3 ? "merah" : "kuning", usulTutup: tanpa > USUL_TUTUP, pertama: r.pertama, sebelum: r.sebelum};
    }).sort((a, b) => b.tanpa - a.tanpa || (a.pertama < b.pertama ? -1 : a.pertama > b.pertama ? 1 : 0) || (a.kunci < b.kunci ? -1 : 1));
    const bagian = sifat => kini.filter(e => e.k.sifat === sifat).map(e => ({...e, ...riwayatKunci(ar, e.kunci, T)}));
    const baru = bagian("baru"), pengkinian = bagian("pengkinian"), perluDicek = [];
    for (const e of baru) if (sebelumT.has(e.kunci)) perluDicek.push({kunci: e.kunci, k: e.k, alasan: "mungkin_pengkinian"});
    const cukupLama = ar.awal != null && selisih(T, ar.awal) >= MULAI_CEK;
    for (const e of pengkinian) if (cukupLama && !(ar.m.get(e.kunci) || []).some(x => x.tanggal < T)) perluDicek.push({kunci: e.kunci, k: e.k, alasan: "tanpa_pertama"});
    return {ada: true, status: "ok", baru, pengkinian, tagih, perluDicek, awalArsip: ar.awal};
  }

  /* logbook periode 07.00-07.00 WIB: rekap bertanggal T memakai tgl = T - 1 (GET /api/logbook/hari) */
  const tglLogbook = T => geser(T, -1);
  /* kejadian rekap ada di entri logbook: jenis + provinsi, dan kab/kota bila rekap menyebut lokasinya */
  const cocokLogbook = (k, entri) => (entri || []).some(e => jenisLogbook(e.jenis) === jenisLogbook(k.jenis) && String(e.prov) === String(k.prov) && (!normLokasi(k.lokasi) || normLokasi(e.kab) === normLokasi(k.lokasi)));

  /* pesan siap kirim untuk kabar yang berhenti; pola sama dengan pesanWA */
  function pesanTagih(x, nama, j = KATA_UMUM) {
    const sejak = x.sebelum ? "sebelum " + tglPanjang(x.pertama) : "sejak " + tglPanjang(x.pertama);
    return `Yth. rekan BPBD ${nama}. Pusdalops BNPB mencatat ${j.kata} di ${nama} ${sejak}, kabar terakhir ${tglPanjang(x.kabarTerakhir)} (${x.tanpa} hari tanpa pembaruan), belum dilaporkan ${j.selesai}.\n` +
      `Mohon pembaruan:\n1. Kondisi terkini dan ${j.tanya}\n2. Jumlah warga terdampak dan mengungsi\n` +
      `Bila ada kebutuhan mendesak (${j.alat}), mohon disampaikan sekalian. Terima kasih.`;
  }

  /* pesan WA gabungan untuk baris Kelengkapan data yang sedang tersaring (pemilik 12 Nov 2026: "expor ... dalam wa").
     xs: [{nama, prov, jenis (kata), mulai, terakhir, minta: [teks]}]; sapa: nama BPBD tujuan atau null. Dipotong di `maks` baris supaya tautan wa.me tetap terbuka. */
  function pesanKurang(xs, sapa, maks = 40) {
    if (!xs.length) return "";
    const m = new Map();
    for (const x of xs.slice(0, maks)) (m.get(x.prov) || m.set(x.prov, []).get(x.prov)).push(x);
    const blok = [...m].map(([p, ys]) => `*${p}*\n` + ys.map((x, i) => `${i + 1}. ${x.nama}, ${x.jenis} sejak ${tglPendek(x.mulai)} (kabar terakhir ${tglPendek(x.terakhir)}): ${x.minta.join(", ")}`).join("\n"));
    const sisa = xs.length - Math.min(xs.length, maks);
    return `Yth. rekan BPBD ${sapa || "provinsi dan kab/kota"}. Pusdalops BNPB masih menunggu pembaruan data kejadian berikut:\n\n${blok.join("\n\n")}\n` +
      (sisa ? `\nDan ${sisa.toLocaleString("id-ID")} kejadian lain (daftar lengkap menyusul dalam berkas Excel).\n` : "") +
      `\nMohon kondisi terkini dan data yang belum ada di atas. Bila ada kebutuhan mendesak, mohon disampaikan sekalian. Terima kasih.`;
  }

  /* penulis .xlsx tanpa pustaka (CSP halaman staf: script-src 'self', SheetJS cdnjs diblok): zip tanpa kompresi + SpreadsheetML minimal.
     lembar: [{nama, kepala: [teks], baris: [[teks|angka|null]]}]. Kepala tebal putih di atas navy, baris kepala dibekukan. Mengembalikan Uint8Array. */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const escXml = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"})[c]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  const kolom = i => { let s = ""; for (i++; i; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + (i - 1) % 26) + s; return s; };
  function zip(berkas) {
    const enc = new TextEncoder(), lokal = [], pusat = []; let off = 0;
    const u16 = v => [v & 255, v >>> 8 & 255], u32 = v => [v & 255, v >>> 8 & 255, v >>> 16 & 255, v >>> 24 & 255];
    for (const [nama, isi] of berkas) {
      const n = enc.encode(nama), d = enc.encode(isi), c = crc32(d), umum = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(c), ...u32(d.length), ...u32(d.length), ...u16(n.length), ...u16(0)];
      const kepala = Uint8Array.from([...u32(0x04034b50), ...umum]);
      lokal.push(kepala, n, d);
      pusat.push(Uint8Array.from([...u32(0x02014b50), ...u16(20), ...umum, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), n);
      off += kepala.length + n.length + d.length;
    }
    const pj = pusat.reduce((s, x) => s + x.length, 0);
    const akhir = Uint8Array.from([...u32(0x06054b50), 0, 0, 0, 0, ...u16(berkas.length), ...u16(berkas.length), ...u32(pj), ...u32(off), 0, 0]);
    const semua = [...lokal, ...pusat, akhir], out = new Uint8Array(semua.reduce((s, x) => s + x.length, 0));
    let i = 0; for (const x of semua) { out.set(x, i); i += x.length; }
    return out;
  }
  function xlsx(lembar) {
    const sel = (v, r, c, s) => v == null || v === "" ? "" : typeof v === "number" && Number.isFinite(v) ? `<c r="${kolom(c)}${r}"${s}><v>${v}</v></c>`
      : `<c r="${kolom(c)}${r}" t="inlineStr"${s}><is><t xml:space="preserve">${escXml(v)}</t></is></c>`;
    const sheet = L => {
      const lebar = L.kepala.map((k, i) => Math.min(60, Math.max(8, String(k).length + 2, ...L.baris.map(b => String(b[i] ?? "").length + 2))));
      const rows = [L.kepala, ...L.baris].map((b, r) => `<row r="${r + 1}">${b.map((v, c) => sel(v, r + 1, c, r ? "" : ' s="1"')).join("")}</row>`).join("");
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
        `<cols>${lebar.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${rows}</sheetData></worksheet>`;
    };
    const nama = lembar.map((L, i) => escXml(String(L.nama || "Lembar " + (i + 1)).replace(/[\\/?*[\]:]/g, " ").slice(0, 31)));
    return zip([
      ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${lembar.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
      ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${nama.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`],
      ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${lembar.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${lembar.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
      ["xl/styles.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF051C2C"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs></styleSheet>`],
      ...lembar.map((L, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheet(L)])]);
  }

  const X = {pesanKurang, xlsx, crc32, gabungLuar, ringkasLuar, WASPADA_LUAR, kunciKejadian, normLokasi, ringkasLaporan, tanggalPantau, tglLogbook, cocokLogbook, labelKejadian, kataJenis, pesanTagih, NAMA_JENIS, mitigasi, KATA, SEPEKAN, NAMA_LEVEL, selisih, kelompok, lama, sepekan, perProv, perKec, adaAngka, gabungRiwayat, perluDitanya, statusKab, siaga, pesanWA, pesanSiaga, pesanProv, tglPanjang, tglPendek, namaKab};
  g.DalopsHitung = X;
})(globalThis);
