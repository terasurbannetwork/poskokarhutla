"use strict";
/* JF-1 Kamus kompetensi teknis PB (tiket RU-050; DESAIN-TEKNIS 5.15; DESIGN-SYSTEM 7.9). Data dari unit/kompetensi.json (jf1.py);
   layar hanya menampilkan dan menyaring, tidak menghitung ulang. Kartu jenjang lewat UnitRapor; kartu cari berisi satu kotak cari dan
   <details> bawaan per kode (buka-tutup tanpa JS). Ketik: nilai kotak urgen, penyaringan lewat nanti() (INP). Teks data lewat textContent.
   Daftar: UnitTampil["JF-1"](berkas) -> [elemen]. */
(() => {
  const R = window.UnitRapor;
  const h = (tag, a, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(a || {})) { if (v == null || v === false) continue; if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    e.append(...anak.flat().filter(x => x != null && x !== false)); return e; };
  const ikon = k => { const t = document.createElement("template"); t.innerHTML = R.svg(k); return t.content.firstElementChild; };   // svg dari daftar tetap rapor.js
  const kecil = s => String(s || "").toLocaleLowerCase("id-ID");

  function kartuCari(b) {
    const komp = Array.isArray(b?.data?.kompetensi) ? b.data.kompetensi : [];
    const butir = komp.map(k => {
      const d = h("details", {class: "un-jf", "data-cari": kecil([k.kode, k.kompetensi, k.definisi].join(" "))},
        h("summary", null, h("b", {teks: k.kode}), " ", k.kompetensi),
        h("p", {class: "un-jf-def", teks: k.definisi}),
        ...(k.level || []).map(lv => h("div", {class: "un-jf-lv"}, h("h4", {teks: "Level " + lv.level}),
          h("ol", null, ...(lv.indikator || []).map(i => h("li", null, h("span", {class: "un-jf-no", teks: i.no}), " ", i.teks))))));
      return d;
    });
    const status = h("p", {class: "un-jf-st", role: "status", teks: `${komp.length.toLocaleString("id-ID")} kompetensi`});
    const kotak = h("input", {type: "search", id: "jf1-q", class: "un-jf-q", placeholder: "Cari kode atau nama kompetensi", autocomplete: "off"});
    const kosong = h("p", {class: "ad-kosong", hidden: true, teks: "Tidak ada kompetensi yang cocok."});
    let gen = 0;
    const saring = (q, g) => { if (g !== gen) return; let n = 0;
      for (const d of butir) { const ok = !q || d.dataset.cari.includes(q); d.hidden = !ok; if (ok) n++; }
      status.textContent = q ? `${n.toLocaleString("id-ID")} dari ${komp.length.toLocaleString("id-ID")} kompetensi` : `${komp.length.toLocaleString("id-ID")} kompetensi`;
      kosong.hidden = n > 0; };
    kotak.addEventListener("input", () => { const q = kecil(kotak.value.trim()), g = ++gen; nanti(() => saring(q, g)); });
    const csv = h("button", {type: "button", class: "ad-tombol kecil"}, ikon("unduh"), "Unduh CSV");
    csv.addEventListener("click", () => R.unduh({unduh: "kompetensi_pb.csv",
      kolom: [{k: "kode", label: "Kode"}, {k: "kompetensi", label: "Kompetensi"}, {k: "level", label: "Level"}, {k: "no", label: "Nomor"}, {k: "teks", label: "Indikator"}],
      baris: komp.flatMap(k => (k.level || []).flatMap(lv => (lv.indikator || []).map(i => ({kode: k.kode, kompetensi: k.kompetensi, level: lv.level, no: i.no, teks: i.teks}))))}));
    return h("section", {class: "ex ex-std", id: "jf1-cari", "aria-labelledby": "jf1-cari-j"},
      h("header", {class: "ex-hd"}, h("div", {class: "ex-pl"}, h("span", {class: "ex-ey", teks: "Kamus kompetensi"}),
        h("span", {class: "bn-pil un-lbl un-asumsi", title: b?.data?.catatan_teks || ""}, ikon("tanya"), "Teks ekstraksi PDF")),
        h("div", {class: "ex-jd"}, h("h3", {id: "jf1-cari-j"}, ikon("kaca"), "Cari kompetensi"), h("div", {class: "un-aksi"}, csv))),
      h("div", {class: "ex-bd"}, h("label", {class: "sr", for: "jf1-q", teks: "Cari kompetensi"}), kotak, status, kosong, h("div", {class: "un-jf-daftar"}, ...butir)));
  }

  (window.UnitTampil ||= {})["JF-1"] = b => [...(b.kartu || []).map(k => R.render(k, b)), kartuCari(b)];
})();
