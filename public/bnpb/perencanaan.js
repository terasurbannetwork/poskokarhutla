/* Perencanaan Pusdalops (/bnpb/perencanaan): kab prioritas (beban laporan), kalender operasi, stok pra-musim.
   Data: tiga JSON statis /data/bnpb/{kab_prioritas,kalender_operasi,stok_prapemusim}.json dari scripts/bnpb/perencanaan.py; layar TIDAK menghitung ulang angka pipeline.
   Semua pemilihan dan format ada di perencanaan_pusdalops.js (murni, diuji). Semuanya pola LAPORAN, belum diuji balik.
   INP: tab/pilihan jenis/daftar langsung mengecat chrome (aria-selected, pesan memuat); tabel dan matriks berat disusun sesudah satu frame tercat.
   Tanpa gaya/skrip inline (CSP); teks data lewat h({teks}) saja. */
(() => {
  "use strict";
  const {ikon, h, namaJenis, PROV} = window.Wilayah, P = window.PerencanaanPusdalops, app = document.getElementById("app");
  const TAB = [["kab", "Beban laporan kab", "pin"], ["kalender", "Kalender operasi", "kalender"], ["stok", "Stok pra-musim", "logistik"]];
  const BERKAS = {kab: "kab_prioritas", kalender: "kalender_operasi", stok: "stok_prapemusim"};
  const st = {tab: "kab", mode: "semua", jenisK: "banjir", jenisS: "banjir"};
  const cache = {}, el = {}; let nomor = 0, nTahun = 9;

  const ambil = nama => cache[nama] || (cache[nama] = fetch(`/data/bnpb/${BERKAS[nama]}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(e => { delete cache[nama]; throw e; }));
  const sesudahFrame = f => { let jalan = false; const go = () => { if (!jalan) { jalan = true; f(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); };
  const pil = (teks, ton, ik, tip) => h("span", {class: "bn-pil pr-t-" + ton, title: tip || null}, ikon(ik), teks);
  const seg = (kelas, daftar, aktif, atribut) => h("div", {class: "pr-seg " + kelas, role: atribut.role, "aria-label": atribut.label},
    daftar.map(([k, t, ik]) => h("button", {type: "button", class: "pr-pilih", "data-k": k, [atribut.role === "tablist" ? "aria-selected" : "aria-pressed"]: String(k === aktif), ...(atribut.role === "tablist" ? {role: "tab"} : {})}, ikon(ik), t)));
  const tandai = (wadah, k, atr) => wadah.querySelectorAll("[data-k]").forEach(b => b.setAttribute(atr, String(b.dataset.k === k)));
  const tabel = (kepala, baris, kelas = "", kelasKolom = []) => h("div", {class: "pr-bungkus"}, h("table", {class: "pr-tabel " + kelas}, h("thead", null, h("tr", null, kepala.map(t => t instanceof Node ? t : h("th", {teks: t})))),
    h("tbody", null, baris)));
  const tr = (sel, att) => h("tr", att, sel.map((c, i) => c instanceof Node && c.tagName === "TD" ? c : h("td", {class: typeof c === "number" || /^[\d.,%\s–]+$/.test(String(c)) ? "n" : "", ...(c instanceof Node ? {} : {teks: c == null ? "" : String(c)})}, c instanceof Node ? c : null)));
  const kaki = (sumber, dibuat) => h("p", {class: "pr-kaki", teks: `Sumber: ${sumber}. Data per ${P.tglIndo(dibuat)}.`});
  const jenisSeg = (daftar, aktif, label) => seg("jenis", daftar.map(j => [j, namaJenis(j), j]), aktif, {role: "group", label});
  const tahunTxt = d => (d.tahun_dasar || []).join(", ");
  const keyPil = (k, alasan) => k === "tinggi" ? pil("Keyakinan tinggi", "ok", "ok", alasan) : k === "sedang" ? pil("Keyakinan sedang", "tunggu", "tunggu", alasan) : pil("Keyakinan rendah", "bahaya", "peringatan", alasan);
  const namaProv = k => PROV[k] || k;

  /* ---------- tab 1: kab prioritas ---------- */
  function rincian(r, mode) {
    const k = r.rinci;
    if (!k) return h("td", {colspan: "9"}, h("p", {class: "pr-p", teks: "Kab ini ada di daftar bencana alam tetapi tidak di daftar utama 51 kab, jadi rincian (jenis dominan, kebutuhan khas, SK, korban) tidak tersedia."}));
    const khas = P.kebutuhanKhas(k.kebutuhan_khas), sk = P.skBaris(k.sk_2018_2024), kb = k.korban_2022_2025, pas = P.pasangan(k.berantai);
    const bagian = (judul, ...isi) => h("section", null, h("h3", {teks: judul}), ...isi);
    return h("td", {colspan: "9"}, h("div", {class: "pr-kisi"},
      bagian("Pola laporan", h("ul", null, [`Jenis dominan: ${namaJenis(k.jenis_dominan)}, ${P.persen(k.jenis_dominan_pct)} dari laporan`, `Bulan puncak semua jenis: ${P.bln(k.bulan_puncak)}`,
        `Bulan puncak jenis dominan: ${P.bln(k.bulan_puncak_jenis_dominan)}`, `Bulan ada laporan: ${P.bulat(k.bulan_aktif_lapor)} dari 12`, `Tahun ada laporan: ${P.bulat(k.tahun_aktif_lapor)} dari ${P.bulat(nTahun)}`,
        `Kejadian bencana alam: ${P.bulat(k.kejadian_bencana_alam)} dari ${P.bulat(k.kejadian)}`].map(t => h("li", {teks: t})))),
      bagian("Kebutuhan khas", khas && khas.kategori.length ? [h("p", {class: "pr-p", teks: `Dari ${P.bulat(khas.nBerisi)} kejadian yang mengisi kolom kebutuhan (dasar: ${khas.dasar}).`}),
          h("ul", null, khas.kategori.map(c => h("li", {teks: `${c.nama}: ${P.persen(c.pct)} (${P.bulat(c.n)} kejadian)`})))]
        : h("p", {class: "pr-p", teks: "Kolom kebutuhan jarang diisi di kab ini (kurang dari 10 kejadian), jadi tidak ditampilkan."})),
      bagian("SK per tingkat, 2018 s.d. 2024", sk ? (sk.length ? h("ul", null, sk.map(s => h("li", {teks: `${s.tingkat}: ${P.bulat(s.n)} SK`}))) : h("p", {class: "pr-p", teks: "Tidak ada SK tercatat."})) : h("p", {class: "pr-p", teks: "Sumber SK tidak tersedia untuk kab ini."}),
        h("p", {class: "pr-kaki", teks: "Dari rekap SK Pusdalops, tidak lengkap."})),
      bagian("Korban 2022 s.d. 2025, batas bawah", kb ? [h("ul", null, [`Episode laporan: ${P.bulat(kb.episode)}`, `Meninggal: ${P.bulat(kb.md)} orang`, `Hilang: ${P.bulat(kb.hilang)} orang`, `Luka: ${P.bulat(kb.luka)} orang`, `Mengungsi: ${P.bulat(kb.mengungsi_jiwa)} jiwa`,
          `Terdampak: ${P.bulat(kb.terdampak_jiwa)} jiwa`, `Rumah rusak berat: ${P.bulat(kb.rumah_rb)} unit`].map(t => h("li", {teks: t}))), h("p", {class: "pr-kaki", teks: "Jumlah nilai puncak tiap episode laporan harian; hari tanpa PDF belum diurai."})]
        : h("p", {class: "pr-p", teks: "Tidak ada data korban."})),
      h("section", {class: "pr-lebar"}, h("h3", {teks: "Pasangan kejadian berantai"}),
        h("p", {class: "pr-p", teks: "Selang tanpa koreksi perbandingan berganda: sebagian pasangan lolos karena kebetulan. Diurutkan menurut jumlah pemicu, bukan menurut lift."}),
        pas.length ? tabel(["Pasangan", "Pemicu (n)", "Diikuti (k)", "Laju", "Lift", "Selang 95%", "Keterangan"], pas.map(p => tr([p.nama, P.bulat(p.n), P.bulat(p.k), P.persen(p.laju * 100), P.fmt(p.lift, 1), p.selang,
          pil(p.diAtas1 ? "Selang di atas 1" : "Selang mencakup 1", p.diAtas1 ? "info" : "abu", p.diAtas1 ? "ok" : "senyap")]))) : h("p", {class: "pr-p", teks: "Tidak ada pasangan dengan sampel cukup (n minimal 10, k minimal 5)."}))));
  }
  function barisKab(r, mode) {
    const k = r.rinci;
    return tr([P.bulat(r.peringkat), h("td", null, h("button", {type: "button", class: "pr-nama", "data-kab": r.kab, "aria-expanded": "false"}, ikon("lanjut"), r.nama)), namaProv(r.prov), P.bulat(r.kejadian),
      mode === "semua" ? P.fmt(r.perTahun, 1) : "–", P.fmt(r.per100rb, 1), P.fmt(r.per100km2, 1),
      h("td", null, k ? `${namaJenis(k.jenis_dominan)} ${P.persen(k.jenis_dominan_pct)} ` : "–", r.dominanNonAlam ? pil("Dominan non-bencana alam", "tunggu", "peringatan") : null),
      mode === "semua" ? P.persen(r.kumulatif) : "–"]);
  }
  function tabKab(d) {
    nTahun = (d.tahun_dasar || []).length;
    const n = (d.kab || []).length, na = (d.prioritas_bencana_alam || []).length;
    const wadah = h("div"), isi = () => {
      const daftar = P.daftarKab(d, st.mode), tb = tabel(["No", "Kabupaten/kota", "Provinsi", "Beban laporan (kejadian)", "Per tahun", "Per 100 ribu penduduk", "Per 100 km²", "Jenis dominan", "Kumulatif"], daftar.map(r => barisKab(r, st.mode)));
      tb.querySelector("tbody").addEventListener("click", e => {
        const b = e.target.closest("[data-kab]"); if (!b) return; const baris = b.closest("tr"), sib = baris.nextElementSibling;
        if (sib && sib.classList.contains("pr-rinci")) { sib.remove(); b.setAttribute("aria-expanded", "false"); return; }
        const r = daftar.find(x => x.kab === b.dataset.kab); b.setAttribute("aria-expanded", "true");
        baris.after(h("tr", {class: "pr-rinci"}, rincian(r, st.mode)));
      });
      wadah.replaceChildren(tb);
    };
    const pilih = seg("", [["semua", `Semua jenis (${P.bulat(n)} kab)`, "daftar"], ["alam", `Khusus bencana alam (${P.bulat(na)} kab)`, "banjir"]], st.mode, {role: "group", label: "Daftar kab"});
    pilih.addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (!b || b.dataset.k === st.mode) return; st.mode = b.dataset.k; tandai(pilih, st.mode, "aria-pressed"); wadah.setAttribute("aria-busy", "true"); sesudahFrame(() => { isi(); wadah.removeAttribute("aria-busy"); }); });
    isi();
    return h("div", {class: "bn-blok"}, h("h2", {teks: `${P.bulat(n)} kab menurut beban laporan`}), h("p", {class: "pr-wajib", teks: "Beban laporan, bukan peringkat risiko."}),
      h("p", {class: "pr-p", teks: `Kab diurut menurut jumlah laporan Pusdalops (semua jenis, tahun dasar ${tahunTxt(d)}) sampai kumulatif ${P.persen(d.parameter_beban * 100)} dari ${P.bulat(d.total_kejadian)} kejadian-kab; ${P.persen(d.parameter_beban * 100)} adalah parameter operasional, bukan hasil statistik. Kab yang jarang melapor tampak ringan. Kolom per 100 ribu penduduk dan per 100 km² hanya pembanding dan tidak mengganti urutan.`}),
      h("div", null, pil("Belum diuji balik", "bahaya", "uji")), pilih, wadah,
      h("p", {class: "pr-p", teks: `Bencana alam saja menyisihkan ${d.jenis_non_alam.map(j => namaJenis(j).toLowerCase()).join(", ")}. Klik nama kab untuk rincian.`}),
      kaki(d.sumber, d.dibuat));
  }

  /* ---------- tab 2: kalender ---------- */
  const SIMBOL = {puncak: "●", musim: "■", persiapan: "◆", kosong: ""};
  function matriksKal(kal, jenis) {
    const baris = P.barisKalender(kal, jenis), kep = [h("th", {teks: "Provinsi"}), ...P.BLN.map(b => h("th", {class: "b", teks: b})), "Musim", "Persiapan logistik", "Sumber persiapan", "Keyakinan"].map(t => t instanceof Node ? t : h("th", {teks: t}));
    return tabel(kep, baris.map(r => h("tr", {class: r.pudar ? "pr-pudar" : null}, [
      h("td", null, h("span", {teks: r.nama})),
      ...r.sel.map(c => h("td", {class: "b pr-s-" + c.s, teks: SIMBOL[c.s], title: `${r.nama}, ${namaJenis(jenis)}, ${P.BLN[c.bulan - 1]}: ${c.s === "puncak" ? "puncak musim" : c.s === "musim" ? "dalam musim" : c.s === "persiapan" ? "bulan persiapan logistik" : "di luar musim"}; rata-rata ${P.fmt(c.rata, 1)} laporan per tahun`})),
      h("td", {teks: r.musim.length ? r.musim.join("; ") : "Tidak musiman"}),
      h("td", {class: "n", teks: r.siap == null ? "–" : P.BLN[r.siap - 1]}),
      h("td", {teks: r.sumber || "–"}),
      h("td", null, keyPil(r.keyakinan, r.alasan.length ? r.alasan.join("; ") : null))])), "pr-kal");
  }
  function tabKalender(d) {
    const jenis = P.jenisKalender(d); if (!jenis.includes(st.jenisK)) st.jenisK = jenis[0];
    const wadah = h("div"), isi = () => wadah.replaceChildren(matriksKal(d, st.jenisK));
    const pilih = jenisSeg(jenis, st.jenisK, "Jenis bencana");
    pilih.addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (!b || b.dataset.k === st.jenisK) return; st.jenisK = b.dataset.k; tandai(pilih, st.jenisK, "aria-pressed"); wadah.setAttribute("aria-busy", "true"); sesudahFrame(() => { isi(); wadah.removeAttribute("aria-busy"); }); });
    isi();
    const lg = (k, t) => h("span", null, h("i", {class: "pr-s-" + k}), t);
    return h("div", {class: "bn-blok"}, h("h2", {teks: "Kalender operasi provinsi menurut bulan"}), h("p", {class: "pr-wajib", teks: "Pola laporan, bukan musim fisik; belum diuji balik."}),
      h("div", null, pil("Belum diuji balik", "bahaya", "uji")),
      h("p", {class: "pr-p", teks: `Musim dibaca dari laporan Pusdalops tahun ${tahunTxt(d)}. Entri berkeyakinan rendah atau tidak musiman dipudarkan dan tidak diberi bulan persiapan. Provinsi dan jenis dengan kurang dari 30 kejadian tidak dimuat. Untuk karhutla, sumber persiapan dapat beralih ke titik panas bila puncak laporan menyimpang dari FIRMS.`}),
      pilih, h("div", {class: "pr-legenda"}, lg("puncak", "Puncak musim"), lg("musim", "Dalam musim"), lg("persiapan", "Bulan persiapan logistik"), lg("kosong", "Di luar musim")), wadah,
      h("details", null, h("summary", {teks: "Metode dan catatan"}), h("p", {class: "pr-p", teks: d.rumus}), h("p", {class: "pr-p", teks: d.keyakinan}), (d.catatan || []).map(c => h("p", {class: "pr-p", teks: c}))),
      kaki(`arsip laporan Pusdalops BNPB tahun dasar ${tahunTxt(d)}, titik panas FIRMS untuk karhutla`, d.dibuat));
  }

  /* ---------- tab 3: stok pra-musim ---------- */
  function detailStok(r) {
    const kat = P.kategoriStok(r.grup, r.tidakAndal);
    return h("div", {class: "pr-bungkus"}, kat.length ? tabel(["Kategori", "Persen dari yang berisi", "Selang Wilson 95%", "Kejadian per tahun (teramati)", "Ekstrapolasi per tahun", "Bulan puncak"],
      kat.map(c => tr([c.nama, P.persen(c.pct), c.selang, P.fmt(c.teramati, 1), c.ekstrapolasi == null ? pil("Tidak andal", "abu", "peringatan") : P.fmt(c.ekstrapolasi, 0), c.puncak == null ? "–" : P.BLN[c.puncak - 1]]))) : h("p", {class: "pr-p", teks: "Tidak ada kategori."}));
  }
  function daftarStok(d) {
    const baris = P.barisStok(d, st.jenisS);
    const w = h("div", {class: "pr-daftar"}, baris.map(r => {
      const det = h("details", {class: "pr-prov"}, h("summary", null, h("b", {teks: r.nama}), h("span", {teks: `${P.fmt(r.perTahun, 1)} kejadian per tahun`}), h("span", {teks: `Cakupan isian ${P.persen(r.cakupan)} (${P.bulat(r.nBerisi)} kejadian)`}),
        r.tidakAndal ? pil("Ekstrapolasi tidak andal", "abu", "peringatan") : pil("Ekstrapolasi terbatas", "tunggu", "tunggu"), h("span", {teks: r.siap == null ? "Persiapan: –" : `Persiapan: ${P.BLN[r.siap - 1]}${r.sumber === "titik_panas" ? " (titik panas)" : ""}`}), keyPil(r.keyakinan)));
      det.addEventListener("toggle", () => { if (det.open && det.children.length === 1) det.append(detailStok(r)); });
      return det;
    }));
    return baris.length ? w : h("p", {class: "pr-p", teks: "Tidak ada provinsi dengan sampel cukup untuk jenis ini."});
  }
  function tabStok(d) {
    const jenis = P.jenisStok(d); if (!jenis.includes(st.jenisS)) st.jenisS = jenis[0];
    const wadah = h("div"), isi = () => wadah.replaceChildren(daftarStok(d));
    const pilih = jenisSeg(jenis, st.jenisS, "Jenis bencana");
    pilih.addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (!b || b.dataset.k === st.jenisS) return; st.jenisS = b.dataset.k; tandai(pilih, st.jenisS, "aria-pressed"); wadah.setAttribute("aria-busy", "true"); sesudahFrame(() => { isi(); wadah.removeAttribute("aria-busy"); }); });
    isi();
    return h("div", {class: "bn-blok"}, h("h2", {teks: "Kebutuhan pra-musim per provinsi"}), h("p", {class: "pr-wajib", teks: "Frekuensi kejadian, BUKAN jumlah barang; bias seleksi."}),
      h("div", null, pil("Belum diuji balik", "bahaya", "uji")),
      h("p", {class: "pr-p", teks: `Persen = kejadian berkategori dibagi kejadian yang mengisi kolom kebutuhan. Yang mengisi kolom itu kemungkinan kejadian yang lebih besar atau lebih ditangani, jadi persen condong tinggi; selang Wilson hanya mencerminkan galat sampling, bukan bias seleksi. Ekstrapolasi ke semua kejadian ditulis tidak andal bila cakupan isian di bawah 10%. Jumlah per orang atau keluarga tidak ada di arsip. Provinsi dan jenis dengan kurang dari 10 kejadian berisi tidak dimuat.`}),
      pilih, wadah, h("details", null, h("summary", {teks: "Catatan"}), (d.catatan || []).map(c => h("p", {class: "pr-p", teks: c}))),
      kaki(`arsip laporan Pusdalops BNPB tahun dasar ${tahunTxt(d)}, kategori dari kata kunci teks laporan`, d.dibuat));
  }

  /* ---------- kerangka ---------- */
  const RENDER = {kab: tabKab, kalender: tabKalender, stok: tabStok};
  function segarkan() {
    const no = ++nomor; el.isi.setAttribute("aria-busy", "true"); el.pesan.className = "bn-pesan"; el.pesan.textContent = "Memuat…";
    sesudahFrame(async () => {
      if (no !== nomor) return;
      let d; try { d = await ambil(st.tab); } catch (e) { if (no === nomor) { el.pesan.className = "bn-pesan galat"; el.pesan.textContent = "Data perencanaan belum bisa dimuat. Coba lagi nanti."; el.isi.removeAttribute("aria-busy"); } return; }
      if (no !== nomor) return;
      el.isi.replaceChildren(RENDER[st.tab](d)); el.isi.removeAttribute("aria-busy"); el.pesan.textContent = ""; el.pesan.className = "bn-pesan";
    });
  }
  el.tab = seg("tab", TAB, st.tab, {role: "tablist", label: "Bagian perencanaan"});
  el.pesan = h("p", {class: "bn-pesan", role: "status"}); el.isi = h("div", {class: "pr-isi"});
  app.replaceChildren(h("div", {class: "bn-judul"}, h("h1", {teks: "Perencanaan Pusdalops"}), h("div", {class: "bn-aksi"})),
    h("section", {class: "bn-blok"}, el.tab, el.pesan), el.isi);
  el.tab.addEventListener("click", e => { const b = e.target.closest("[data-k]"); if (b && b.dataset.k !== st.tab) { st.tab = b.dataset.k; tandai(el.tab, st.tab, "aria-selected"); segarkan(); } });
  segarkan();
})();
