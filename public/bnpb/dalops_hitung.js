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
  const namaKab = (kode, kab) => kode ? kode.split("|")[1] : tutup((kab || [])[0] || "");

  /* satu baris per kab/kota DAN status surut (sama dengan deck Situasi Banjir Sepekan): mulai paling awal, kabar paling akhir,
     angka dari kejadian terakhir yang mengisinya. Satu kab bisa muncul di dua kelompok (Langkat: satu kejadian surut, satu belum).
     Kejadian yang kabarnya lebih tua dari sepekan dikelompokkan terpisah (senyap), supaya tidak memanjangkan lama banjir kejadian pekan ini. */
  function kelompok(kejadian, h) {
    const m = new Map();
    for (const k of [...kejadian].sort((a, b) => (a.terakhir > b.terakhir) - (a.terakhir < b.terakhir))) {
      const kode = (k.kab_kode || [])[0] || "", kunci = (kode || "?" + namaKab("", k.kab)) + "|" + (k.surut ? 1 : 0) + "|" + (selisih(h, k.terakhir) > SEPEKAN ? "senyap" : "pekan");
      const x = m.get(kunci) || {kunci, kab_kode: kode, nama: namaKab(kode, k.kab), prov: k.prov, prov_kode: k.prov_kode, surut: k.surut, mulai: k.mulai, terakhir: k.terakhir,
        kk: null, jiwa: null, mengungsi: null, rumah_terendam: null, tinggi_cm: null, kondisi: "", id: []};
      if (k.mulai && k.mulai < x.mulai) x.mulai = k.mulai;
      if (k.terakhir > x.terakhir) x.terakhir = k.terakhir;
      for (const f of ["kk", "jiwa", "mengungsi", "rumah_terendam", "tinggi_cm"]) if (k[f] != null) x[f] = k[f];
      if (k.kondisi) x.kondisi = k.kondisi;
      x.id.push(k.id); m.set(kunci, x);
    }
    return [...m.values()].sort((a, b) => a.prov_kode.localeCompare(b.prov_kode) || a.nama.localeCompare(b.nama));
  }
  /* lama banjir dalam hari, termasuk hari mulai: belum surut s.d. hari logbook, sudah surut s.d. kabar terakhir (sama dengan deck) */
  const lama = (x, h) => selisih(x.surut ? x.terakhir : h, x.mulai || x.terakhir) + 1;
  const sepekan = (kel, h) => kel.filter(x => selisih(h, x.terakhir) <= SEPEKAN);

  /* belum surut yang kabarnya lebih dari sehari atau angkanya bolong. Urut kabar paling lama dulu. */
  function perluDitanya(kel, h) {
    const out = [];
    for (const x of kel) {
      if (x.surut) continue;
      const umur = selisih(h, x.terakhir), kurang = [];
      if (umur >= 1) kurang.push("kabar");
      if (x.kk == null) kurang.push("kk");
      if (x.jiwa == null) kurang.push("jiwa");
      if (x.tinggi_cm == null) kurang.push("tinggi");
      if (kurang.length) out.push({...x, umur, kurang, senyap: umur > SEPEKAN});
    }
    return out.sort((a, b) => b.umur - a.umur || a.nama.localeCompare(b.nama));
  }

  /* status.json per kecamatan -> per kab: level harian = tertinggi di kecamatannya, h3 = tertinggi */
  function statusKab(st) {
    const out = {};
    for (const [k, v] of Object.entries(st?.kec || {})) {
      const [p, kab] = k.split("|"), kode = p + "|" + kab, x = out[kode] || (out[kode] = {kab_kode: kode, prov_kode: p, nama: kab, b: [], h3: null});
      (v.b || []).forEach((l, i) => { if (l != null && !(x.b[i] >= l)) x.b[i] = l; });
      if (v.h3 != null && !(x.h3 >= v.h3)) x.h3 = v.h3;
    }
    return out;
  }
  /* kab dengan level >= min di salah satu hari. Urut: level tertinggi, yang sepekan ini sudah banjir dulu, lalu hujan tiga hari. */
  function siaga(sk, sudahBanjir, min = 2) {
    return Object.values(sk).map(x => ({...x, maks: Math.max(...x.b.map(l => l ?? 0)), sudah: sudahBanjir.has(x.kab_kode)}))
      .filter(x => x.maks >= min).sort((a, b) => b.maks - a.maks || b.sudah - a.sudah || (b.h3 ?? 0) - (a.h3 ?? 0) || a.nama.localeCompare(b.nama));
  }

  const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const tglPanjang = s => s ? `${+s.slice(8, 10)} ${BLN[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}` : "–";
  const tglPendek = s => s ? `${+s.slice(8, 10)} ${BLN[+s.slice(5, 7) - 1].slice(0, 3)}` : "–";
  const NAMA_KURANG = {kabar: "kondisi terkini dan apakah banjir sudah surut", kk: "jumlah KK terdampak", jiwa: "jumlah jiwa terdampak", tinggi: "tinggi genangan (cm)"};
  /* pesan siap tempel ke grup WA BPBD: netral-formal, tanpa sapaan nama */
  function pesanWA(x) {
    const minta = [...new Set(["kabar", ...x.kurang])].map(k => NAMA_KURANG[k]);
    if (x.mengungsi == null) minta.push("jumlah warga mengungsi dan lokasi pengungsian");
    return `Yth. rekan BPBD ${x.nama}. Pusdalops BNPB mencatat banjir di ${x.nama} sejak ${tglPanjang(x.mulai)}, kabar terakhir ${tglPanjang(x.terakhir)}, belum dilaporkan surut.\n` +
      `Mohon pembaruan:\n${minta.map((m, i) => `${i + 1}. ${m[0].toUpperCase() + m.slice(1)}`).join("\n")}\n` +
      `Bila ada kebutuhan mendesak (logistik, perahu, pompa, alat berat), mohon disampaikan sekalian. Terima kasih.`;
  }

  const X = {SEPEKAN, NAMA_LEVEL, selisih, kelompok, lama, sepekan, perluDitanya, statusKab, siaga, pesanWA, tglPanjang, tglPendek, namaKab};
  g.DalopsHitung = X;
})(globalThis);
