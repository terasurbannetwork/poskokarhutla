/* Operasi Pusdalops, tab Gelombang 3: SK Aktif, Berantai, Medsos. Spek: docs/superpowers/specs/2026-11-01-pusdalops-standar.md (G2, G3, G4, L3).
   Dimuat sebelum operasi.js, yang memanggil window.OperasiG3(konteks) dan mendapat tiga pemuat tab {node, dummy}. Semua hitungan penyajian ada di operasi_pusdalops.js (murni, diuji);
   angka SK, lift, dan jeda dihitung server dan tidak dihitung ulang di sini. Teks data lewat h({teks}) saja (CSP, tanpa HTML mentah). */
(() => {
  "use strict";
  const NAMA_TINGKAT = {siaga: "Siaga darurat", tanggap: "Tanggap darurat", transisi: "Transisi darurat ke pemulihan"};
  window.OperasiG3 = c => {
    const {api, h, ikon, pil, pilDummy, tabel, tabelBatas, kosong, sumberKaki, isian, input, opsi, formulir, kepalaBlok, seg, nilaiSeg, pemilih, st, PROV, namaJenis, JENIS, kunciKab, O} = c;
    const F = O.fmt, np = k => PROV[k] || k;
    /* kaki tab: "per <tanggal data>" tampil, waktu ambil hanya di title */
    const kaki = (nama, tglData, t) => h("p", {class: "op-kaki", title: O.wibTeks(t), teks: `Sumber: ${nama}, per ${O.tglIndo(tglData)}`});
    const terbaru = (a, f) => a.length ? O.tglWIB(Math.max(...a.map(f))) : null;
    const wilayah = x => x.kab ? `${x.kab}, ${np(x.prov)}` : np(x.prov);

    /* ---------- SK aktif ---------- */
    async function muatSk() {
      const r = await api("GET", "/api/logbook/sk/aktif"); if (!r.ok) return {r};
      const j = r.j, daftar = [...(j.sk || [])].sort((a, b) => (b.perlu_cek ? 1 : 0) - (a.perlu_cek ? 1 : 0) || (a.sisa_hari ?? 1e9) - (b.sisa_hari ?? 1e9) || String(a.nomor).localeCompare(String(b.nomor), "id")), adaDummy = daftar.some(x => x.dummy);
      const papan = h("div", {class: "op-papan"}, (j.per_tingkat || []).map(t => h("section", {class: "op-kartu"}, h("h3", {teks: NAMA_TINGKAT[t.tingkat] || t.tingkat}), h("span", {class: "op-angka", teks: F(t.sk)}),
        pil(`${F(t.perlu_cek)} perlu dicek`, t.perlu_cek ? "bahaya" : "ok", t.perlu_cek ? "peringatan" : "ok"))));
      const blokRingkas = h("section", {class: "bn-blok"}, kepalaBlok("SK status darurat yang masih berlaku", "kalender", ...adaDummy ? [pilDummy()] : []),
        h("div", {class: "op-ringkas"}, pil(`Per ${O.tglIndo(j.tanggal)}`, "info", "kalender"), pil(`${F(j.jumlah)} SK aktif`, "info", "daftar"), pil(`${F(j.perlu_cek)} perlu dicek`, j.perlu_cek ? "bahaya" : "ok", j.perlu_cek ? "peringatan" : "ok")),
        h("p", {class: "op-p", teks: "Perlu dicek berarti SK-nya masih tercatat aktif, tetapi kejadiannya sudah selesai atau tidak ada entri logbook lebih dari 7 hari. Bahan tinjauan pimpinan: apakah SK perlu diakhiri atau datanya diperbarui."}),
        (j.per_tingkat || []).length ? papan : kosong("Belum ada SK status darurat yang masih berlaku."));
      const blokProv = h("section", {class: "bn-blok"}, kepalaBlok("Per provinsi", "pin"),
        (j.per_provinsi || []).length ? tabelBatas(["Provinsi", "SK aktif", "Perlu dicek"], j.per_provinsi.map(p => [np(p.prov), F(p.sk), p.perlu_cek ? pil(F(p.perlu_cek), "bahaya", "peringatan") : "0"]), ["", "n", "n"]) : kosong("Belum ada provinsi dengan SK aktif."));
      const blokDaftar = h("section", {class: "bn-blok"}, kepalaBlok("Daftar SK, yang perlu dicek paling atas", "daftar"),
        daftar.length ? tabelBatas(["Wilayah", "Tingkat", "Jenis", "Nomor SK", "TMT mulai", "TMT selesai", "Sisa", "Keterangan"], daftar.map(x => [wilayah(x), NAMA_TINGKAT[x.tingkat] || x.tingkat, pil(namaJenis(x.jenis), "info", x.jenis),
          x.nomor + (x.perpanjangan_ke ? `, perpanjangan ke-${x.perpanjangan_ke}` : ""), O.tglIndo(x.tmt_mulai), x.tmt_selesai ? O.tglIndo(x.tmt_selesai) : "", pil(O.sisaHariTeks(x.sisa_hari), O.skTone(x), x.perlu_cek ? "peringatan" : "kalender"),
          h("span", null, x.perlu_cek ? pil(O.alasanCek(x), "bahaya", "peringatan") : pil("Berjalan", "ok", "ok"), x.dummy ? pilDummy() : null)]), ["", "", "", "", "n", "n", "n", ""], daftar.map(x => x.perlu_cek ? "op-basi-baris" : "")) : kosong("Belum ada SK tercatat."),
        j.terpotong ? h("p", {class: "op-p", teks: "Daftar terpotong. Hanya SK terbaru yang tampil."}) : null);
      return {node: [blokRingkas, blokProv, blokDaftar, kaki("SK status darurat dari logbook Pusdalops (input staf)", j.tanggal, r.t)], dummy: adaDummy};
    }

    /* ---------- berantai ---------- */
    async function muatBerantai() {
      const r = await api("GET", "/api/pusdalops/berantai?aktif=1" + (st.prov ? "&prov=" + st.prov : "")); if (!r.ok) return {r};
      const daftar = O.urutSisaJam(r.j.peringatan || []), adaDummy = daftar.some(x => x.dummy);
      const filter = h("select", {name: "prov", "aria-label": "Filter provinsi"}); opsi(filter, Object.entries(PROV), "Semua provinsi"); filter.value = st.prov;
      filter.addEventListener("change", () => { st.prov = filter.value; c.segarkan(); });
      const kartu = x => h("section", {class: "op-kartu", "data-kab": x.kab},
        h("h3", {teks: wilayah(x)}),
        h("div", {class: "op-ringkas"}, pil(`${namaJenis(x.susulan)} susulan`, "tunggu", x.susulan), pil(`Pemicu ${namaJenis(x.pemicu).toLowerCase()}`, "info", x.pemicu), pil(O.sisaJamTeks(x.sisa_jam), x.sisa_jam < 12 ? "bahaya" : "tunggu", "tunggu"), x.dummy ? pilDummy() : null),
        h("p", {class: "op-p", teks: `Berlaku sampai ${O.wibTeks(x.berlaku_sampai)}. Laju ${O.fmtPersen(x.laju * 100)} dari kejadian pemicu, ${O.liftTeks(x)}.`}),
        h("p", {class: "op-p", teks: x.teks}),
        h("p", {class: "op-kaki", teks: "Selang tanpa koreksi perbandingan berganda."}));
      const blok = h("section", {class: "bn-blok"}, kepalaBlok("Peringatan bencana berantai, jendela 3 hari", "peringatan", isian("Provinsi", filter), ...adaDummy ? [pilDummy()] : []),
        h("p", {class: "op-pola", teks: "Pola deskriptif, bukan ramalan."}),
        h("p", {class: "op-p", teks: (r.j.catatan || "Pola deskriptif dari arsip logbook Pusdalops, bukan ramalan.") + " Diurutkan menurut sisa waktu berlaku, bukan menurut besar lift."}),
        h("div", {class: "op-ringkas"}, pil(`${F(daftar.length)} peringatan aktif`, daftar.length ? "tunggu" : "ok", "peringatan")),
        daftar.length ? h("div", {class: "op-papan op-papan-lebar"}, daftar.map(kartu)) : kosong("Tidak ada peringatan berantai yang masih berlaku untuk filter ini."),
        r.j.terpotong ? h("p", {class: "op-p", teks: "Daftar terpotong 500 peringatan. Saring per provinsi untuk melihat sisanya."}) : null);
      return {node: [blok, kaki("pola susulan dari arsip logbook Pusdalops 2014 sampai 2025", terbaru(daftar, x => x.mulai) || O.tglWIB(r.t), r.t)], dummy: adaDummy};
    }

    /* ---------- medsos ---------- */
    async function muatMedsos() {
      const [ds, jd] = await Promise.all([api("GET", "/api/pusdalops/medsos?status=baru" + (st.prov ? "&prov=" + st.prov : "")), api("GET", "/api/pusdalops/medsos/jeda")]);
      if (!ds.ok) return {r: ds};
      const butir = ds.j.butir || [], adaDummy = butir.some(x => x.dummy);
      const blokJeda = h("section", {class: "bn-blok"}, kepalaBlok("Jeda pantauan ke logbook", "tunggu"), (() => {
        if (!jd.ok) return kosong(jd.s === 503 || jd.s === 0 ? "Data jeda belum tersedia. Hubungi admin." : "Ringkasan jeda belum bisa dimuat.");
        const k = jd.j.keseluruhan || {}, bln = jd.j.per_bulan || [];
        return h("div", {class: "op-isi"}, h("div", {class: "op-ringkas"}, pil(`Median ${O.menitTeks(k.median_menit)}`, "info", "tunggu"), pil(`${F(k.n)} butir ditautkan`, "info", "daftar"), pil(`${F(k.logbook_lebih_dulu)} logbook lebih dulu`, "info", "kalender")),
          bln.length ? tabel(["Bulan", "Butir", "Median jeda", "Logbook lebih dulu"], bln.map(b => [O.bulanSingkat(b.bulan), F(b.n), O.menitTeks(b.median_menit), F(b.logbook_lebih_dulu)]), ["", "n", "n", "n"]) : kosong("Belum ada butir yang ditautkan ke kejadian."),
          h("p", {class: "op-p", teks: "Jeda dihitung dari waktu pantau sampai kejadian tercatat di logbook. Kejadian yang sudah ada sebelum dipantau dihitung terpisah, bukan jeda negatif."}));
      })());
      /* tindakan per butir: tombol baris mengisi formulir verifikasi di bawah */
      const idPilih = h("select", {name: "id", "aria-label": "Butir"}); opsi(idPilih, butir.map(x => [x.id, `${x.judul} (${wilayah(x)})`]), "Pilih butir");
      const aksi = seg("aksi", [["tolak", "Tolak", "sapu"], ["tautkan", "Tautkan ke kejadian", "pin"], ["buat", "Buat kejadian", "tambah"]], "tolak");
      const cat = input("catatan", {maxlength: "200", placeholder: "Alasan menolak (opsional, 3 sampai 200 karakter)"}), kej = h("select", {name: "kejadian_id", "aria-label": "Kejadian terbuka"}), jns = h("select", {name: "jenis", "aria-label": "Jenis kejadian"});
      opsi(kej, [], "Pilih kejadian"); opsi(jns, JENIS.map(j => [j, namaJenis(j)]), "Jenis dari butir");
      const info = h("p", {class: "op-p"}), wCat = isian("Catatan", cat), wKej = isian("Kejadian terbuka di kab/kota butir ini", kej), wJns = isian("Jenis kejadian", jns);
      const dipilih = () => butir.find(x => x.id === idPilih.value);
      let nomor = 0;
      const atur = async () => {
        const a = nilaiSeg(verif, "aksi"), b = dipilih(), n = ++nomor; wCat.hidden = a !== "tolak"; wKej.hidden = a !== "tautkan"; wJns.hidden = a !== "buat"; info.textContent = "";
        if (a === "buat" && b) jns.value = b.jenis || "";
        if (a !== "tautkan" || !b) return;
        opsi(kej, [], "Pilih kejadian");
        if (!b.kab) { info.textContent = "Butir ini hanya punya provinsi, jadi daftar kejadian tidak bisa dicari. Pakai Buat kejadian atau Tolak."; return; }
        info.textContent = "Memuat kejadian terbuka…"; const x = await api("GET", "/api/logbook/buka?kab=" + encodeURIComponent(kunciKab({prov: b.prov, nama: b.kab}))); if (n !== nomor) return;
        const ls = x.j.kejadian || []; opsi(kej, ls.map(k => [k.id, `${namaJenis(k.jenis)}, ${[k.kec, k.desa].filter(Boolean).join(", ") || "lokasi belum diisi"}`]), "Pilih kejadian");
        info.textContent = !x.ok ? (x.s === 503 ? "Data belum tersedia. Hubungi admin." : "Daftar kejadian belum bisa dimuat.") : ls.length ? "" : "Tidak ada kejadian terbuka di kabupaten/kota ini. Pakai Buat kejadian.";
      };
      const verif = formulir("Verifikasi butir", "ok", [isian("Butir", idPilih), aksi, wCat, wKej, wJns, info], function () {
        const b = dipilih(), a = nilaiSeg(verif, "aksi"); if (!b) return {galat: "Pilih butir yang diverifikasi."};
        const body = {id: b.id, aksi: a};
        if (a === "tolak") { const t = cat.value.trim(); if (t && t.length < 3) return {galat: "Catatan minimal 3 karakter, atau kosongkan."}; if (t) body.catatan = t; }
        if (a === "tautkan") { if (!kej.value) return {galat: "Pilih kejadian terbuka yang ditautkan."}; body.kejadian_id = kej.value; }
        if (a === "buat") { if (!jns.value && !b.jenis) return {galat: "Pilih jenis kejadian."}; if (jns.value) body.kejadian = {jenis: jns.value}; }
        return {url: "/api/pusdalops/medsos/verifikasi", body, ok: a === "tolak" ? "Butir ditolak." : a === "tautkan" ? "Butir ditautkan ke kejadian." : "Kejadian dibuat dari butir."};
      }, "Simpan verifikasi", "medsos-verif");
      verif.addEventListener("change", ev => { if (ev.target === idPilih || ev.target.name === "aksi") atur(); }); atur();   // select kejadian/jenis dan catatan tidak boleh mengulang atur()
      const tombolBaris = (b, a, teks, ik) => { const t = h("button", {type: "button", class: "bn-tombol sekunder op-tak-cetak", "data-butir": b.id, "data-aksi-v": a}, ikon(ik), teks);
        t.addEventListener("click", () => { verif.open = true; idPilih.value = b.id; const r = verif.querySelector(`input[name="aksi"][value="${a}"]`); r.checked = true; atur(); verif.scrollIntoView({block: "center"}); }); return t; };
      const blokAntre = h("section", {class: "bn-blok"}, kepalaBlok("Antrean butir baru", "daftar", ...adaDummy ? [pilDummy()] : []),
        h("div", {class: "op-ringkas"}, pil(`${F(butir.length)} butir menunggu`, butir.length ? "tunggu" : "ok", "daftar")),
        butir.length ? tabelBatas(["Waktu pantau", "Sumber", "Judul", "Wilayah", "Tautan", "Tindakan"], butir.map(b => [O.wibTeks(b.waktu_pantau), pil(O.SUMBER_MEDSOS[b.sumber] || b.sumber, "info", "uji"),
          h("span", null, b.judul, " ", b.jenis ? pil(namaJenis(b.jenis), "info", b.jenis) : null, b.dummy ? pilDummy() : null), wilayah(b), h("a", {href: b.tautan, target: "_blank", rel: "noopener noreferrer", teks: "Buka tautan"}),
          h("div", {class: "op-aksi"}, tombolBaris(b, "tolak", "Tolak", "sapu"), tombolBaris(b, "tautkan", "Tautkan", "pin"), tombolBaris(b, "buat", "Buat", "tambah"))]), ["n", "", "", "", "", ""]) : kosong("Tidak ada butir baru. Tambahkan lewat formulir di bawah."),
        ds.j.terpotong ? h("p", {class: "op-p", teks: "Antrean terpotong 100 butir terbaru. Saring per provinsi untuk melihat sisanya."}) : null);
      /* tambah butir */
      const pm = pemilih(), sumber = seg("sumber", [["medsos", "Media sosial", "uji"], ["tv", "Televisi", "uji"]], "medsos"), tautan = input("tautan", {maxlength: "300", inputmode: "url", placeholder: "https://"}), judul = input("judul", {maxlength: "140"}), jenisT = h("select", {name: "jenis"});
      opsi(jenisT, JENIS.map(j => [j, namaJenis(j)]), "Jenis (opsional)"); const waktu = input("waktu_pantau", {type: "datetime-local"});
      const tambah = formulir("Tambah butir pantauan", "tambah", [sumber, h("div", {class: "bn-baris"}, isian("Tautan (https)", tautan), isian("Judul pendek", judul)), h("div", {class: "bn-baris"}, ...pm.kolom, isian("Jenis (opsional)", jenisT), isian("Waktu pantau (WIB, kosong = sekarang)", waktu))],
        function () {
          const t = tautan.value.trim(), j = judul.value.trim(); if (!/^https:\/\/\S+$/.test(t) || t.length > 300) return {galat: "Tautan harus diawali https:// tanpa spasi, maksimal 300 karakter."}; if (j.length < 3 || j.length > 140) return {galat: "Judul 3 sampai 140 karakter."};
          if (!pm.sp.value) return {galat: "Pilih provinsi, atau provinsi dan kabupaten/kota."};
          const body = {sumber: nilaiSeg(tambah, "sumber"), tautan: t, judul: j, ...pm.kunci() ? {kab: pm.kunci()} : {prov: pm.sp.value}};
          if (jenisT.value) body.jenis = jenisT.value; if (waktu.value) { const w = Date.parse(waktu.value + ":00+07:00"); if (!Number.isFinite(w) || w > Date.now() + 3e5) return {galat: "Waktu pantau tidak sah atau di masa depan."}; body.waktu_pantau = w; }
          return {url: "/api/pusdalops/medsos", body, ok: "Butir masuk antrean."};
        });
      return {node: [blokJeda, blokAntre, verif, tambah, kaki("antrean pantauan medsos dan TV Pusdalops (input staf)", terbaru(butir, x => x.waktu_pantau) || O.tglWIB(ds.t), ds.t)], dummy: adaDummy};
    }
    return {sk: muatSk, berantai: muatBerantai, medsos: muatMedsos};
  };
})();
