/* Riset kampus untuk kebijakan (publik). Data dari GET /api/riset/ringkas; semua teks server masuk lewat textContent (tanpa innerHTML dari data).
   Tanpa kontak PIC dan tanpa nama peneliti: server tidak mengirimnya. */
(() => {
  const $ = id => document.getElementById(id), NS = "http://www.w3.org/2000/svg", HALAMAN = 8;
  const IKON = {
    topi: "M2 9l10-5 10 5-10 5z|M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5",
    labu: "M9 3h6|M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3",
    jam: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z|M12 7v5l3 2",
    centang: "M5 12l5 5 9-10",
    dokumen: "M7 3h7l5 5v13H7z|M14 3v5h5|M10 13h6|M10 17h6",
    gedung: "M4 21V8l8-5 8 5v13|M9 21v-6h6v6|M9 11h.01|M15 11h.01",
    bidik: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z|M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z|M12 12h.01",
    bendera: "M5 21V4|M5 4h11l-2 4 2 4H5",
    api: "M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
    tautan: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1|M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
    unduh: "M12 3v12|M7 11l5 5 5-5|M5 21h14",
    salin: "M9 9h11v11H9z|M5 15V4h11",
    naik: "M12 19V5|M5 12l7-7 7 7",
    kunci: "M6 11h12v9H6z|M8 11V8a4 4 0 0 1 8 0v3",
  };
  const svg = n => { const s = document.createElementNS(NS, "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    for (const d of IKON[n].split("|")) { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); s.appendChild(p); } return s; };
  const h = (tag, att, ...anak) => { const e = document.createElement(tag);
    for (const [k, v] of Object.entries(att || {})) { if (v == null || v === false) continue; if (k === "class") e.className = v; else if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
    for (const a of anak) if (a != null) e.append(a); return e; };
  const angka = n => Number(n || 0).toLocaleString("id-ID");
  const tgl = s => s ? new Date(s + "T00:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta"}) : "";
  const pil = (ikon, teks, warna) => h("span", {class: "bn-pil" + (warna ? " rs-" + warna : "")}, svg(ikon), teks);
  const STATUS = {berjalan: ["jam", "Berjalan", "biru"], laporan_akhir: ["dokumen", "Laporan akhir", "ungu"], selesai: ["centang", "Selesai", "hijau"]};
  const JENIS_NAMA = {artikel: "Artikel", dataset: "Dataset", model: "Model", policy_brief: "Policy brief", prototipe: "Prototipe"};
  let D = null, urutKolom = "status", urutArah = 1, hal = 0;

  async function muat() {
    const dummy = new URLSearchParams(location.search).get("dummy") === "1" ? "?dummy=1" : "";
    try { const r = await fetch("/api/riset/ringkas" + dummy); if (!r.ok) throw new Error(r.status === 503 ? "Fitur riset belum diaktifkan." : "Gagal memuat (" + r.status + ")."); D = await r.json(); }
    catch (e) { $("pesan").textContent = e.message; return; }
    kartu(); saring(); tabelRiset(); katalog(); sitasi(); ajak();
  }

  function kartu() {
    const k = D.kartu, isi = [["gedung", "Mitra aktif", k.mitra_aktif], ["jam", "Riset berjalan", k.berjalan], ["centang", "Riset selesai", k.selesai], ["dokumen", "Luaran", k.luaran], ["bendera", "Dipakai kebijakan", k.kebijakan]];
    $("kartu").replaceChildren(...isi.map(([i, l, n]) => h("div", {class: "bn-kartu rs-stat"}, pil(i, l), h("div", {class: "bn-angka", teks: angka(n)}))));
  }

  /* ---- agenda ---- */
  function saring() {
    const fT = $("fTema"), fB = $("fBencana");
    fT.replaceChildren(h("option", {value: "", teks: "Semua tema"}), ...Object.entries(D.tema).map(([k, v]) => h("option", {value: k, teks: v})));
    fB.replaceChildren(h("option", {value: "", teks: "Semua bencana"}), ...Object.entries(D.bencana).map(([k, v]) => h("option", {value: k, teks: v})));
    fT.onchange = fB.onchange = agenda; agenda();
  }
  function agenda() {
    const t = $("fTema").value, b = $("fBencana").value, a = D.agenda.filter(x => (!t || x.tema === t) && (!b || x.bencana === b));
    $("agenda").replaceChildren(...(a.length ? a.map(x => h("article", {class: "bn-kartu rs-agenda p" + x.prioritas},
      h("div", {class: "rs-pilpil"}, pil("bendera", "Prioritas " + x.prioritas, x.prioritas === 1 ? "merah" : x.prioritas === 2 ? "kuning" : "abu"), pil("bidik", D.tema[x.tema] || x.tema, "biru"), pil("api", D.bencana[x.bencana] || x.bencana, "abu")),
      h("h3", {teks: x.judul}), x.latar ? h("p", {class: "rs-latar", teks: x.latar}) : null,
      x.luaran ? h("p", {class: "rs-luaran-harap"}, h("b", {teks: "Luaran: "}), x.luaran) : null)) : [h("p", {class: "rs-kosong", teks: "Belum ada agenda yang cocok."})]));
  }

  /* ---- tabel riset: kepala gelap, bisa diurutkan, berhalaman ---- */
  const KOLOM = [["judul", "Riset"], ["institusi", "Institusi"], ["bencana", "Bencana"], ["status", "Status"], ["luaran", "Luaran"], ["kebijakan", "Dipakai kebijakan"]];
  const nilai = (r, k) => k === "luaran" ? r.luaran.length : k === "status" ? ["berjalan", "laporan_akhir", "selesai"].indexOf(r.status) : k === "bencana" ? D.bencana[r.bencana] || r.bencana : r[k];
  function tautanLuaran(l) {
    const url = l.tautan || (l.doi ? "https://doi.org/" + l.doi : null), isi = [svg("dokumen"), (JENIS_NAMA[l.jenis] || l.jenis) + ": " + l.judul];
    return url ? h("a", {class: "rs-chip", href: url, target: "_blank", rel: "noopener noreferrer"}, ...isi) : h("span", {class: "rs-chip"}, ...isi);
  }
  function tabelRiset() {
    const w = $("riset"), r = [...D.riset].sort((a, b) => { const x = nilai(a, urutKolom), y = nilai(b, urutKolom); return (x > y ? 1 : x < y ? -1 : 0) * urutArah; });
    if (!r.length) return w.replaceChildren(h("p", {class: "rs-kosong", teks: "Belum ada riset berjalan atau selesai."}));
    const mak = Math.max(0, Math.ceil(r.length / HALAMAN) - 1); hal = Math.min(hal, mak);
    const kepala = h("tr", null, ...KOLOM.map(([k, l]) => h("th", {"aria-sort": k === urutKolom ? (urutArah > 0 ? "ascending" : "descending") : "none"},
      h("button", {type: "button", class: "rs-urut", "data-k": k}, l, k === urutKolom ? " " + (urutArah > 0 ? "▲" : "▼") : ""))));
    const baris = r.slice(hal * HALAMAN, hal * HALAMAN + HALAMAN).map(x => { const s = STATUS[x.status];
      return h("tr", null, h("td", {"data-label": "Riset", class: "rs-judul"}, h("b", {teks: x.judul}), h("span", {class: "rs-redup", teks: [x.wilayah, tgl(x.mulai) + " - " + tgl(x.selesai)].join(" · ")})),
        h("td", {"data-label": "Institusi"}, x.institusi, x.unit ? h("span", {class: "rs-redup", teks: x.unit}) : null),
        h("td", {"data-label": "Bencana"}, pil("api", D.bencana[x.bencana] || x.bencana, "abu")),
        h("td", {"data-label": "Status"}, pil(s[0], s[1], s[2])),
        h("td", {"data-label": "Luaran", class: "rs-luaran"}, ...(x.luaran.length ? x.luaran.map(tautanLuaran) : [h("span", {class: "rs-redup", teks: "Belum ada"})])),
        h("td", {"data-label": "Dipakai kebijakan"}, x.kebijakan ? pil("bendera", angka(x.kebijakan) + " pemanfaatan", "hijau") : h("span", {class: "rs-redup", teks: "Belum"}))); });
    const pager = h("div", {class: "rs-hal"}, h("button", {type: "button", class: "bn-tombol sekunder", "data-h": "-1", disabled: hal === 0, teks: "Sebelumnya"}),
      h("span", {teks: `Halaman ${angka(hal + 1)} dari ${angka(mak + 1)} (${angka(r.length)} riset)`}), h("button", {type: "button", class: "bn-tombol sekunder", "data-h": "1", disabled: hal >= mak, teks: "Berikutnya"}));
    w.replaceChildren(h("div", {class: "ad-tabel-wadah"}, h("table", {class: "ad-tabel"}, h("thead", null, kepala), h("tbody", null, ...baris))), pager);
  }
  $("riset").addEventListener("click", e => {
    const u = e.target.closest(".rs-urut"), p = e.target.closest("[data-h]");
    if (u) { urutArah = urutKolom === u.dataset.k ? -urutArah : 1; urutKolom = u.dataset.k; hal = 0; tabelRiset(); }
    else if (p) { hal += +p.dataset.h; tabelRiset(); }
  });

  /* ---- katalog data ---- */
  function katalog() {
    const kepala = h("tr", null, ...["Data", "Bencana", "Format", "Cakupan waktu", "Lisensi", "Jalur"].map(l => h("th", {teks: l})));
    const baris = D.katalog.map(k => h("tr", null, h("td", {"data-label": "Data", class: "rs-judul"}, h("b", {teks: k.nama}), h("span", {class: "rs-redup", teks: k.deskripsi})),
      h("td", {"data-label": "Bencana"}, pil("api", D.bencana[k.bencana] || k.bencana, "abu")), h("td", {"data-label": "Format"}, k.format), h("td", {"data-label": "Cakupan waktu"}, k.cakupan),
      h("td", {"data-label": "Lisensi"}, pil("kunci", k.lisensi, "hijau")),
      h("td", {"data-label": "Jalur"}, k.jalur ? h("a", {class: "ad-tombol kecil", href: k.jalur, target: "_blank", rel: "noopener noreferrer"}, svg("unduh"), "Unduh") : pil("kunci", "Diminta lewat mitra", "kuning"))));
    $("katalog").replaceChildren(h("div", {class: "ad-tabel-wadah"}, h("table", {class: "ad-tabel"}, h("thead", null, kepala), h("tbody", null, ...baris))));
  }
  function sitasi() {
    const t = new Date().toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"});
    const teks = `[Nama data]. BNPB dan Pantau Bencana. ${D.lisensi}. Diakses ${t}. ${location.origin}`;
    const salin = h("button", {type: "button", class: "bn-tombol sekunder"}, svg("salin"), "Salin sitasi");
    salin.onclick = async () => { try { await navigator.clipboard.writeText(teks); salin.lastChild.textContent = "Tersalin"; } catch (e) { salin.lastChild.textContent = "Salin manual"; } };
    $("sitasi").replaceChildren(h("h2", null, pil("kunci", "Aturan sitasi " + D.lisensi, "hijau")), h("p", {class: "rs-kutip", teks}), salin);
  }
  function ajak() {
    $("hAjak").replaceChildren(svg("topi"), "Kampusmu mau bermitra?");
    $("ajakTeks").replaceChildren("Hubungi admin lewat kotak pesan di ", h("a", {href: "/"}, "Pantau Bencana"), " dengan kategori Kerja sama. Admin yang mencatat institusimu dan memberi kode mitra pribadi. Kamu yang sudah punya kode buka ",
      h("a", {href: "/riset/mitra"}, "halaman mitra"), ".");
  }
  muat();
})();
