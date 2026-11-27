"use strict";
/* JF-2 Hitung kebutuhan formasi JF (tiket RU-107; DESAIN-TEKNIS 6.31; DESIGN-SYSTEM 7.9). Volume tahunan per kab dari unit/formasi_jf.json (jf2.py);
   norma waktu dan jam efektif bisa diubah di peramban dan dihitung ulang di sini (tidak dikirim, tidak disimpan). Rumus sama dengan jf2.py:
   kebutuhan = jumlah (volume x norma jam) / jam efektif. Kosong tetap kosong: kegiatan tanpa norma atau tanpa volume dilewati, tidak jadi 0.
   Ketik: isian bereaksi seketika, hitung ulang tabel lewat nanti() dengan penghitung gen (INP). Teks data lewat textContent.
   Fungsi murni: globalThis.UnitJf2 {kebutuhan, agregat}. Layar: UnitTampil["JF-2"](berkas) -> [elemen]. */
(() => {
  /* norma: [{kegiatan, jam}], vol: {kegiatan: angka atau null}, je: jam efektif. null bila tak satu pun kegiatan terhitung. */
  function kebutuhan(vol, norma, je) {
    if (!(je > 0)) throw new RangeError("jam efektif harus lebih dari 0");
    let jam = 0, pakai = false;
    for (const n of norma) {
      const v = vol[n.kegiatan];
      if (n.jam == null || v == null) continue;
      if (!(n.jam > 0)) throw new RangeError(`norma ${n.kegiatan} harus lebih dari 0`);
      pakai = true; jam += v * n.jam;
    }
    return pakai ? {jam, orang: jam / je} : null;
  }
  /* kab: [[kode, nama, ...volume sesuai kolom]]; kolom: nama kegiatan tiap volume. -> {prov: {kode2: {jam, orang, n, m}}, nasional} */
  function agregat(kab, kolom, norma, je) {
    const prov = {}, nas = {jam: 0, orang: 0, n: 0, m: 0};
    for (const r of kab) {
      const vol = Object.fromEntries(kolom.map((k, i) => [k, r[2 + i]])), p = prov[r[0].slice(0, 2)] ||= {jam: 0, orang: 0, n: 0, m: 0};
      const h = kebutuhan(vol, norma, je);
      p.m++; nas.m++;
      if (h) { p.jam += h.jam; p.orang += h.orang; p.n++; nas.jam += h.jam; nas.orang += h.orang; nas.n++; }
    }
    return {prov, nasional: nas};
  }
  globalThis.UnitJf2 = {kebutuhan, agregat};
  if (typeof document === "undefined") return;

  /* ---------------- layar ---------------- */
  const R = window.UnitRapor;
  const h = (tag, a, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(a || {})) { if (v == null || v === false) continue; if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    e.append(...anak.flat().filter(x => x != null && x !== false)); return e; };
  const ikon = k => { const t = document.createElement("template"); t.innerHTML = R.svg(k); return t.content.firstElementChild; };
  const bil = (x, d = 3) => x == null ? "belum ada data" : x.toLocaleString("id-ID", {maximumFractionDigits: d});

  function alat(b) {
    const d = b?.data || {}, kolom = d.kolom_volume || [], kab = Array.isArray(d.kab) ? d.kab : [], nprov = d.provinsi || {}, norma0 = Array.isArray(d.norma) ? d.norma : [];
    const jeAwal = d.jam_efektif?.nilai;
    const isian = (id, nilai) => h("input", {type: "number", id, class: "un-g-in", min: "0", step: "any", inputmode: "decimal", value: nilai ?? ""});
    const je = isian("jf2-je", jeAwal), inp = norma0.map((n, i) => isian("jf2-n" + i, n.jam));
    const pilih = h("select", {id: "jf2-prov", class: "un-g-in"}, h("option", {value: "", teks: "Semua provinsi"}),
      ...Object.keys(nprov).sort((a, c) => nprov[a].localeCompare(nprov[c], "id")).map(k => h("option", {value: k, teks: nprov[k]})));
    const pesan = h("p", {class: "bn-pesan", role: "status", hidden: true});
    const badan = h("tbody"), ringkas = {}, dd = k => (ringkas[k] = h("dd", {teks: "belum ada data"}));
    const hasil = h("dl", {class: "un-ringkas"}, h("div", null, h("dt", {teks: "Kebutuhan nasional, orang"}), dd("orang")),
      h("div", null, h("dt", {teks: "Beban kerja, jam per tahun"}), dd("jam")), h("div", null, h("dt", {teks: "Kab/kota terhitung"}), dd("kab")));
    const csv = h("button", {type: "button", class: "ad-tombol kecil", disabled: true}, ikon("unduh"), "Unduh CSV");
    const kepala = ["Wilayah", "Kab/kota terhitung", "Jam per tahun", "Kebutuhan (orang)", "Usulan formasi (orang)"];
    const th = kepala.map((t, i) => h("th", {scope: "col", teks: t, title: i === 4 ? "Kebutuhan dibulatkan ke atas ke orang bulat; hanya kolom ini yang dibulatkan" : null}));
    let terakhir = null, gen = 0;
    const baca = el => el.value === "" ? null : Number(el.value);   // kosong tetap kosong, tidak jadi 0
    function salin() { const norma = norma0.map((n, i) => ({kegiatan: n.kegiatan, jam: baca(inp[i])})); return {norma, jam: baca(je)}; }
    function gambar(g) {
      if (g !== gen) return;
      pesan.hidden = true; csv.disabled = true; terakhir = null;
      const {norma, jam} = salin();
      let a;
      try { a = agregat(kab, kolom, norma, jam); } catch (e) { pesan.className = "bn-pesan galat"; pesan.textContent = e.message; pesan.hidden = false; badan.replaceChildren(); return; }
      const n = a.nasional, ada = n.n > 0;
      ringkas.orang.textContent = ada ? bil(n.orang, 1) : "belum ada data"; ringkas.jam.textContent = ada ? bil(n.jam, 0) : "belum ada data";
      ringkas.kab.textContent = ada ? `${bil(n.n, 0)} dari ${bil(n.m, 0)}` : "belum ada data";
      const dipilih = pilih.value, baris = [];
      if (!dipilih) for (const k of Object.keys(a.prov).sort()) { const p = a.prov[k]; baris.push([nprov[k] || k, p.n ? `${p.n} dari ${p.m}` : null, p.n ? p.jam : null, p.n ? p.orang : null]); }
      else for (const r of kab.filter(r => r[0].slice(0, 2) === dipilih)) {
        const x = UnitJf2.kebutuhan(Object.fromEntries(kolom.map((k, i) => [k, r[2 + i]])), norma, jam);
        baris.push([r[1] || r[0], x ? "1 dari 1" : null, x ? x.jam : null, x ? x.orang : null]);
      }
      const tampil = baris.map(r => [r[0], r[1], r[2], r[3], r[3] == null ? null : Math.ceil(r[3] - 1e-9)]);
      badan.replaceChildren(...tampil.map(r => h("tr", null, h("th", {scope: "row", "data-label": kepala[0], teks: r[0]}),
        ...[1, 2, 3, 4].map(i => h("td", {"data-label": kepala[i], class: i === 1 ? null : "n", teks: i === 1 ? (r[i] ?? "belum ada data") : bil(r[i], i === 3 ? 1 : 0)})))));
      if (tampil.length) { terakhir = {unduh: "formasi_jf.csv", kolom: kepala.map((label, i) => ({k: "c" + i, label, angka: i > 1})),
        baris: tampil.map(r => Object.fromEntries(r.map((v, i) => ["c" + i, v])))}; csv.disabled = false; }
    }
    const ulang = () => { const g = ++gen; nanti(() => gambar(g)); };
    const lbl = (f, t) => h("label", {for: f.id, teks: t});
    const baru = h("button", {type: "button", class: "ad-tombol kecil", teks: "Kembalikan ke bawaan"});
    baru.addEventListener("click", () => { je.value = jeAwal ?? ""; norma0.forEach((n, i) => { inp[i].value = n.jam ?? ""; }); ulang(); });
    const wadah = h("div", {class: "un-g"},
      h("div", {class: "un-g-in-wadah"},
        h("p", null, lbl(je, "Jam kerja efektif per tahun (bawaan 1.250)"), " ", je),
        ...norma0.map((n, i) => h("p", null, lbl(inp[i], `${n.nama}, jam per kegiatan (${n.jenjang})`), " ", inp[i], n.jam == null ? h("small", {teks: " belum ada norma, dilewati"}) : null)),
        h("p", null, baru), h("p", null, lbl(pilih, "Rincian"), " ", pilih)),
      h("div", {class: "un-g-out"}, pesan, hasil,
        h("div", {class: "ad-tabel-wadah ex-tabel", role: "region", tabindex: "0", "aria-label": "Kebutuhan formasi per wilayah"},
          h("table", {class: "ad-tabel"}, h("caption", {class: "sr", teks: "Kebutuhan formasi JF per wilayah"}), h("thead", null, h("tr", null, th)), badan))));
    wadah.addEventListener("input", ulang);
    pilih.addEventListener("change", ulang);
    csv.addEventListener("click", () => { if (terakhir) R.unduh(terakhir); });
    ulang();
    return h("section", {class: "ex ex-std", id: "jf2-alat", "aria-labelledby": "jf2-alat-j"},
      h("header", {class: "ex-hd"}, h("div", {class: "ex-pl"}, h("span", {class: "ex-ey", teks: "Usulan metode"}),
        h("span", {class: "bn-pil un-lbl un-hitungan"}, ikon("hitung"), "Hitungan kita"),
        h("span", {class: "bn-pil un-lbl un-asumsi", title: "Norma waktu dan jam efektif bawaan; Pusbin JF bisa mengubahnya"}, ikon("tanya"), "Asumsi: norma waktu bawaan")),
        h("div", {class: "ex-jd"}, h("h3", {id: "jf2-alat-j"}, ikon("hitung"), "Hitung kebutuhan formasi"), h("div", {class: "un-aksi"}, csv))),
      h("div", {class: "ex-bd"}, h("p", {class: "un-g-cat", teks: "Dihitung di peramban ini saja; isian tidak dikirim dan tidak disimpan. Usulan metode: tata cara resmi (Pasal 53 ayat 3 Perban 4/2025) belum terbit."}), wadah));
  }

  (window.UnitTampil ||= {})["JF-2"] = b => [alat(b), ...(b.kartu || []).map(k => R.render(k, b))];
})();
