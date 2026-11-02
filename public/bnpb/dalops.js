/* Pantau Banjir Dalops (/bnpb/dalops): kab/kota terdampak banjir yang perlu ditanya, belum surut, siaga 3 hari, sudah surut.
   Data: GET /api/dalops/banjir (staf, src/dalops.js; R2 dari scripts/data/dalops_banjir.py) + /banjir/data/status.json (publik).
   Hitungan di dalops_hitung.js (murni, diuji). Teks data lewat textContent; tooltip lewat data-tip (di-esc). Tanpa gaya/skrip inline (CSP). */
(() => {
  "use strict";
  const {ikon, h, F, PROV} = window.Wilayah, H = window.DalopsHitung;
  const app = document.getElementById("app");
  const KURANG = {kabar: "Kabar lebih dari sehari", kk: "KK", jiwa: "Jiwa", tinggi: "Tinggi air"};
  const pil = (teks, kelas, ik) => h("span", {class: "bn-pil " + kelas}, ik ? ikon(ik) : null, teks);
  const tinggi = t => !t ? "–" : t[0] === t[1] ? F(t[0]) + " cm" : `${F(t[0])}–${F(t[1])} cm`;
  const wibHari = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  const peta = x => x.kab_kode ? h("a", {class: "dl-ikon", href: "/banjir/peta?wil=" + encodeURIComponent(x.kab_kode), target: "_blank", rel: "noopener", "aria-label": "Lihat " + x.nama + " di peta banjir", "data-tip": "<b>Lihat di peta banjir</b>"}, ikon("pin")) : null;
  const kab = x => h("div", {class: "dl-kab"}, h("b", {teks: x.nama}), h("span", {class: "bn-label", teks: PROV[x.prov_kode] || x.prov || ""}));
  const tabel = (kepala, baris) => h("div", {class: "lb-tabel-bungkus"}, h("table", {class: "lb-tabel"}, h("thead", null, h("tr", null, kepala.map(k => h("th", {scope: "col", teks: k})))), h("tbody", null, baris)));
  const td = (isi, n) => h("td", {class: n ? "n" : null}, isi);
  const sumber = t => h("div", {class: "lb-kaki bn-label", teks: "Sumber: " + t});
  const blok = (ik, judul, ...isi) => h("section", {class: "bn-blok"}, h("h2", {class: "lb-judul-blok"}, ikon(ik), judul), ...isi);
  const kosong = (ik, teks) => h("div", {class: "lb-kosong"}, ikon(ik), h("span", {teks}));
  const pesan = (teks, tautan) => app.replaceChildren(h("div", {class: "bn-blok"}, h("p", {class: "lb-p", teks}), tautan || null));

  function kartuMasuk(s) {
    app.replaceChildren(h("div", {class: "bn-blok"}, h("h2", {teks: "Masuk staf"}),
      h("p", {class: "lb-p", teks: s === 403 ? "Akunmu belum berhak membuka Pantau Banjir Dalops. Hanya peran Pusdalops, Koordinator Pusdalops, dan Pimpinan yang boleh. Minta Super Admin menambah perannya." : "Pantau Banjir Dalops hanya untuk staf Pusdalops BNPB. Masuk dulu dengan akun staf, lalu buka halaman ini lagi."}),
      h("a", {class: "bn-tombol", href: "/admin/pantau", teks: "Masuk staf"})));
  }

  async function salin(tombol, teks) {
    try { await navigator.clipboard.writeText(teks); tombol.replaceChildren(ikon("ok"), "Tersalin"); }
    catch (e) { tombol.replaceChildren(ikon("peringatan"), "Gagal menyalin"); }
    setTimeout(() => tombol.replaceChildren(ikon("simpan"), "Salin pesan"), 2500);
  }

  /* ---------- bagian ---------- */
  function bagianTanya(daftar, sk, st, hari) {
    if (!daftar.length) return blok("ok", "Semua wilayah belum surut sudah berkabar lengkap", kosong("ok", "Tidak ada yang perlu ditanya hari ini."));
    const baris = daftar.map((x, i) => {
      /* status.json hanya memuat kecamatan berlevel > 0 (scripts/banjir/status.py): kab tak tercantum = Aman */
      const b = st ? (sk[x.kab_kode]?.b?.[1] ?? 0) : null, tombol = h("button", {type: "button", class: "bn-tombol dl-salin"}, ikon("simpan"), "Salin pesan");
      tombol.addEventListener("click", () => salin(tombol, H.pesanWA(x)));
      return h("tr", {class: x.umur >= 3 ? "dl-basi" : null}, td(F(i + 1), true), h("td", null, kab(x)),
        td(h("div", {class: "dl-kab"}, h("b", {teks: H.tglPendek(x.terakhir)}), h("span", {class: "bn-label", teks: x.umur < 1 ? "logbook terakhir" : F(x.umur) + " hari sebelumnya"})), true),
        h("td", null, h("div", {class: "dl-chips"}, x.kurang.map(k => pil(KURANG[k], k === "kabar" ? "lb-t-bahaya" : "lb-t-tunggu", k === "kabar" ? "tunggu" : "peringatan")))),
        td(b == null ? "–" : pil(H.NAMA_LEVEL[b], "dl-l" + b), true),
        h("td", null, h("div", {class: "dl-aksi"}, tombol, peta(x))));
    });
    return blok("tunggu", `${F(daftar.length)} wilayah perlu ditanya ke BPBD`,
      h("p", {class: "lb-p", teks: `Banjir yang belum dilaporkan surut, kabarnya lebih dari sehari atau angkanya belum lengkap, per logbook ${H.tglPanjang(hari)}. Kabar paling lama di atas. Tombol Salin pesan menyiapkan teks permintaan pembaruan untuk grup WA BPBD.`}),
      tabel(["No", "Kab/kota", "Kabar terakhir", "Yang kurang", "Status besok", "Tindak lanjut"], baris), sumber("Logbook Pusdalops BNPB, status banjir Centurisk97"));
  }

  function tabelKejadian(daftar, hari) {
    const baris = [], perProv = new Map();
    for (const x of daftar) (perProv.get(x.prov_kode) || perProv.set(x.prov_kode, []).get(x.prov_kode)).push(x);
    let n = 0;
    for (const [p, xs] of perProv) {
      baris.push(h("tr", {class: "dl-prov"}, h("td", {colspan: "11", teks: PROV[p] || xs[0].prov || "Provinsi tidak tercatat"})));
      for (const x of xs) baris.push(h("tr", null, td(F(++n), true), h("td", null, h("b", {teks: x.nama})), td(H.tglPendek(x.mulai), true), td(F(H.lama(x, hari)), true),
        td(F(x.kk), true), td(F(x.jiwa), true), td(F(x.mengungsi), true), td(tinggi(x.tinggi_cm), true),
        h("td", {class: "dl-kondisi", "data-tip": x.kondisi ? "<b>Kondisi terakhir</b><br>" + esc(x.kondisi) : null, teks: x.kondisi ? (x.kondisi.length > 70 ? x.kondisi.slice(0, 68) + "…" : x.kondisi) : "–"}),
        td(H.tglPendek(x.terakhir), true), h("td", null, peta(x))));
    }
    return tabel(["No", "Kab/kota", "Mulai", "Lama, hari", "KK", "Jiwa", "Mengungsi", "Tinggi air", "Kondisi terakhir", "Kabar terakhir", "Peta"], baris);
  }

  function bagianSiaga(sk, sudah, hariStatus, wadah, min) {
    const daftar = H.siaga(sk, sudah, min), hari = hariStatus || [];
    const dua = daftar.filter(x => x.sudah && x.maks >= 2).length;
    const baris = daftar.map((x, i) => h("tr", {class: x.sudah && x.maks >= 2 ? "dl-sorot" : null}, td(F(i + 1), true), h("td", null, kab(x)),
      td(x.sudah ? pil("Sudah banjir", "lb-t-bahaya", "banjir") : h("span", {class: "bn-label", teks: "Belum"}), true),
      ...hari.map((_, j) => td(pil(H.NAMA_LEVEL[x.b[j] ?? 0], "dl-l" + (x.b[j] ?? 0)), true)), td(x.h3 == null ? "–" : F(Math.round(x.h3)), true), h("td", null, peta(x))));
    wadah.replaceChildren(
      h("p", {class: "lb-p", teks: daftar.length ? `${F(daftar.length)} kab/kota berstatus ${min >= 2 ? "Siaga atau Awas" : "Waspada, Siaga, atau Awas"} pada salah satu hari sampai ${H.tglPanjang(hari[hari.length - 1])}${dua ? `, ${F(dua)} di antaranya sudah banjir sepekan ini (baris disorot)` : ""}.` : "Tidak ada kab/kota berstatus itu."}),
      daftar.length ? tabel(["No", "Kab/kota", "Banjir sepekan", ...hari.map(H.tglPendek), "Hujan tiga hari, mm", "Peta"], baris) : null);
  }

  function bagianArti() {
    return h("div", {class: "dl-arti"}, [[1, "Hujan tiga hari 40 mm atau lebih, atau sungai mulai naik."], [2, "Hujan tiga hari 80 mm di wilayah rawan banjir, atau debit sungai tinggi."], [3, "Hujan tiga hari 120 mm di wilayah sangat rawan, atau sungai meluap."]]
      .map(([l, t]) => h("div", null, pil(H.NAMA_LEVEL[l], "dl-l" + l), h("span", {class: "bn-label", teks: t}))));
  }

  function render(d, st) {
    const hari = d.hari, kel = H.kelompok(d.kejadian, hari), pekan = H.sepekan(kel, hari);
    const belum = pekan.filter(x => !x.surut), sudahSurut = pekan.filter(x => x.surut), tanya = H.perluDitanya(kel, hari);
    const sk = st ? H.statusKab(st) : {}, sudah = new Set(pekan.map(x => x.kab_kode)), hariSt = st?.hari || [];
    const nSiaga = st ? H.siaga(sk, sudah, 2).length : null, laporan = d.kejadian.filter(k => H.selisih(hari, k.terakhir) <= H.SEPEKAN).length;
    const telat = H.selisih(wibHari(), hari);

    const angka = (n, label, ik) => h("div", {class: "bn-kartu"}, h("h2", null, ikon(ik), label), h("div", {class: "bn-angka", teks: n == null ? "–" : F(n)}));
    const siagaWadah = h("div", {class: "dl-isi"});
    const seg = h("div", {class: "lb-seg dl-seg", role: "radiogroup", "aria-label": "Status yang ditampilkan"},
      [[2, "Siaga dan Awas", "peringatan"], [1, "Termasuk Waspada", "daftar"]].map(([v, t, ik]) => h("label", null, h("input", {type: "radio", name: "dl-min", value: String(v), checked: v === 2}), ikon(ik), t)));
    seg.addEventListener("change", e => bagianSiaga(sk, sudah, hariSt, siagaWadah, +e.target.value));   // hanya bagian ini yang dirender ulang
    if (st) bagianSiaga(sk, sudah, hariSt, siagaWadah, 2);

    app.replaceChildren(
      h("div", {class: "bn-judul"}, h("h1", {teks: "Pantau Banjir Dalops"}),
        h("div", {class: "bn-aksi"}, pil(`Logbook per ${H.tglPanjang(hari)}`, telat > 1 ? "lb-t-bahaya" : "lb-t-info", "kalender"), telat > 1 ? pil(`Data tertinggal ${F(telat)} hari, jalankan ulang dalops_banjir.py`, "lb-t-bahaya", "peringatan") : null)),
      h("div", {class: "bn-grid bn-ringkas dl-ringkas"}, angka(laporan, "Laporan banjir sepekan", "banjir"), angka(belum.length, "Wilayah belum dilaporkan surut", "tunggu"),
        angka(tanya.length, "Wilayah perlu ditanya", "peringatan"), angka(nSiaga, "Siaga atau Awas sampai " + (hariSt.length ? H.tglPendek(hariSt[hariSt.length - 1]) : "–"), "kalender")),
      bagianTanya(tanya, sk, st, hari),
      blok("banjir", `${F(belum.length)} wilayah belum dilaporkan surut`, belum.length ? tabelKejadian(belum, hari) : kosong("ok", "Semua banjir sepekan ini sudah dilaporkan surut."), sumber("Logbook Pusdalops BNPB")),
      blok("peringatan", st ? `${F(nSiaga)} wilayah Siaga atau Awas sampai ${H.tglPanjang(hariSt[hariSt.length - 1])}` : "Status banjir belum termuat", st ? seg : null, st ? siagaWadah : kosong("peringatan", "status.json gagal dimuat, coba muat ulang."), st ? bagianArti() : null, sumber("Status banjir Centurisk97, logbook Pusdalops BNPB")),
      h("details", {class: "bn-blok dl-surut"}, h("summary", null, h("h2", {class: "lb-judul-blok"}, ikon("ok"), `${F(sudahSurut.length)} wilayah sudah dilaporkan surut`)),
        sudahSurut.length ? tabelKejadian(sudahSurut, hari) : kosong("tunggu", "Belum ada yang dilaporkan surut sepekan ini."), sumber("Logbook Pusdalops BNPB")));
    pasangTip();
  }

  (async () => {
    let r;
    try { r = await fetch("/api/dalops/banjir", {credentials: "same-origin"}); } catch (e) { return pesan("Tidak ada sinyal. Muat ulang halaman ini."); }
    if (r.status === 401 || r.status === 403) return kartuMasuk(r.status);
    if (r.status === 404) return pesan("Data logbook banjir belum diunggah. Jalankan python3 scripts/data/dalops_banjir.py --unggah di mesin Pusdalops.");
    if (!r.ok) return pesan("Data gagal dimuat (" + r.status + "). Muat ulang halaman ini.");
    const d = await r.json(), st = await fetch("/banjir/data/status.json").then(x => x.ok ? x.json() : null).catch(() => null);
    render(d, st);
  })();
})();
