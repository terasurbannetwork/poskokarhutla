/* Siaga pra-musim per kabupaten/kota dan bulan: kalender risiko (7 tahun penuh), SOP pra-musim, saran stok penyangga, desa langganan terisolir, daerah senyap.
   Data: /data/bnpb/siaga.json (scripts/bnpb/siaga.py dari kalender_risiko.json + desa_terisolir.csv), /data/senyap.json (pipa-data).
   Angka pipeline tidak dihitung ulang di layar. Tanpa gaya/skrip inline (CSP); teks data lewat textContent. */
(() => {
  "use strict";
  const {PROV, ikon, h, F, label, BLN} = window.Wilayah;
  const app = document.getElementById("app"), KUNCI = "siaga_kab_v1", DUMMY = "siaga_dummy";
  const J4 = ["banjir", "longsor", "cuaca", "karhutla"];
  const HARI = 864e5;
  const ambil = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
  const lokal = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} return v === undefined ? null : v; };
  const kosong = (ik, teks, ...lain) => h("div", {class: "lb-kosong"}, ikon(ik), h("span", {teks}), ...lain);
  const pil = (teks, ton, ik) => h("span", {class: "bn-pil lb-t-" + ton}, ikon(ik), teks);
  const kaki = t => h("p", {class: "lb-p lb-kaki", teks: t});
  const blok = (ik, judul, ...isi) => h("section", {class: "bn-blok"}, h("h2", {class: "lb-judul-blok"}, ikon(ik), judul), ...isi);
  const tip = (judul, ...baris) => { const e = (s) => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c])); return `<b>${e(judul)}</b><br>${baris.map(e).join("<br>")}`; };
  const rentang = bulan => { const b = [...bulan]; return b.length > 2 ? `${BLN[b[0] - 1].slice(0, 3)} sampai ${BLN[b[b.length - 1] - 1].slice(0, 3)}` : b.map(x => BLN[x - 1].slice(0, 3)).join(", "); };
  const tglF = d => d.toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"});
  const blnTh = d => `${BLN[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
  const wibKini = () => new Date(Date.now() + 7 * 36e5);

  let D, SEN, kode, bulan, ref, boxIsi, sedangDummy = false;

  /* ---------- tanggal SOP: awal musim terdekat yang belum berakhir terhadap acuan ---------- */
  /* ponytail: musim bimodal memakai bulan 'mulai' pertama saja; pecah per runtun bila ada kab yang perlu */
  function awalMusim(m, acuan) {
    const panjang = m.bulan.length;
    for (const y of [acuan.getUTCFullYear() - 1, acuan.getUTCFullYear(), acuan.getUTCFullYear() + 1]) {
      const s = Date.UTC(y, m.mulai - 1, 1);
      if (s + panjang * 31 * HARI >= acuan.getTime()) return new Date(s);
    }
  }
  const tugasKab = () => {
    const v = D.kab[kode], out = [];
    for (const j of Object.keys(v.musim)) {
      const m = v.musim[j], s = awalMusim(m, ref), berjalan = s <= ref;
      out.push({jenis: j, m, mulai: s, berjalan, tugas: D.sop[j].map((t, i) => { const tg = new Date(s.getTime() + t.h * HARI);
        const sisa = Math.round((tg - ref) / HARI);
        return {...t, id: `${kode}|${j}|${i}`, tgl: tg, sisa, status: sisa < -1 ? ["terlewat", "bahaya", "peringatan"] : sisa <= 30 ? ["segera", "tunggu", "tunggu"] : ["terjadwal", "info", "kalender"]}; })});
    }
    return out.sort((a, b) => a.mulai - b.mulai);
  };

  /* ---------- kartu ---------- */
  function kalender() {
    const v = D.kab[kode], rows = h("div", {class: "sg-kal"});
    for (const j of J4) {
      const p = v.p[j]; if (!p) continue;
      const ms = v.musim[j]?.bulan || [];
      const W = 12 * 80, svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 ${W} 124`); svg.setAttribute("class", "sg-svg"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", `Peluang ${j} per bulan`);
      const ln = document.createElementNS(svg.namespaceURI, "line"); ln.setAttribute("class", "dasar"); ln.setAttribute("x1", 0); ln.setAttribute("x2", W); ln.setAttribute("y1", 104); ln.setAttribute("y2", 104); svg.append(ln);
      p.forEach((pv, i) => {
        const g = document.createElementNS(svg.namespaceURI, "g"), hh = Math.max(3, pv * 96), r = document.createElementNS(svg.namespaceURI, "rect");
        g.setAttribute("data-tip", tip(`${label(j)}, ${BLN[i]}`, `Ada kejadian: ${v.ada[j][i]} dari ${D.n_tahun} tahun penuh`, pv >= D.ambang_musim ? "Masuk musim" : "Di luar musim"));
        r.setAttribute("class", "bat" + (pv >= D.ambang_musim ? " musim" : "")); r.setAttribute("x", i * 80 + 8); r.setAttribute("width", 64); r.setAttribute("y", 104 - hh); r.setAttribute("height", hh); r.setAttribute("rx", 3);
        const t = document.createElementNS(svg.namespaceURI, "text"); t.setAttribute("x", i * 80 + 40); t.setAttribute("y", 119); t.textContent = BLN[i].slice(0, 3);
        g.append(r, t);
        if (i + 1 === bulan) { const o = document.createElementNS(svg.namespaceURI, "rect"); o.setAttribute("class", "pilih"); o.setAttribute("x", i * 80 + 3); o.setAttribute("y", 2); o.setAttribute("width", 74); o.setAttribute("height", 120); g.append(o); }
        svg.append(g);
      });
      rows.append(h("div", {class: "sg-baris"}, h("b", null, ikon(j), label(j)), svg));
    }
    return blok("kalender", `Kalender risiko ${v.nama}`, rows, kaki(`Tinggi batang = bagian dari ${D.n_tahun} tahun penuh (2014 sampai 2020) yang punya kejadian di bulan itu. Batang merah = masuk musim (ada kejadian di ${Math.ceil(D.ambang_musim * D.n_tahun)} tahun atau lebih). Kotak = bulan terpilih.`));
  }

  function sop(T) {
    const v = D.kab[kode], cek = lokal("siaga_sop") || {};
    const isi = T.length ? T.map(({jenis, m, mulai, berjalan, tugas}) => h("div", {class: "sg-sop"},
      h("h3", null, ikon(jenis), label(jenis), pil(`musim ${rentang(m.bulan)}`, "info", "kalender"), pil(berjalan ? "musim berjalan" : `mulai sekitar ${blnTh(mulai)}`, berjalan ? "bahaya" : "tunggu", berjalan ? "peringatan" : "tunggu")),
      h("ul", {class: "sg-tugas"}, tugas.map(t => { const c = h("input", {type: "checkbox", checked: !!cek[t.id], "aria-label": t.tugas});
        c.addEventListener("change", () => { const s = lokal("siaga_sop") || {}; c.checked ? s[t.id] = 1 : delete s[t.id]; lokal("siaga_sop", s); c.closest("li").classList.toggle("selesai", c.checked); });
        return h("li", {class: cek[t.id] ? "selesai" : ""}, c, h("span", null, h("span", {class: "tx", teks: t.tugas}), h("small", {teks: `sekitar ${blnTh(t.tgl)}, usulan: ${t.pj}`})), pil(t.status[0], t.status[1], t.status[2])); }))))
      : [kosong("kalender", `Tidak ada jenis dengan musim pasti di ${v.nama} (peluang tiap bulan di bawah ${Math.round(D.ambang_musim * 100)}%). Tidak ada SOP pra-musim yang dibangkitkan.`)];
    const aksi = h("div", {class: "lb-kanan sg-tidakcetak"}, h("button", {class: "bn-tombol sekunder", type: "button", id: "sgCetak"}, ikon("cetak"), "Cetak"), h("button", {class: "bn-tombol sekunder", type: "button", id: "sgCsv"}, ikon("unduh"), "CSV"));
    aksi.addEventListener("click", e => { if (e.target.closest("#sgCetak")) window.print(); if (e.target.closest("#sgCsv")) unduhCsv(T, v.nama); });
    const b = blok("ok", `Templat tugas pra-musim ${v.nama}`, ...isi, kaki("Bukan SOP resmi; tenggat dan penanggung jawab perlu ditetapkan BPBD. Waktu dihitung dari awal musim menurut riwayat logbook.")); b.firstChild.append(aksi); return b;
  }
  function unduhCsv(T, nama) {
    const cek = lokal("siaga_sop") || {}, q = s => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const rows = [["kabupaten_kota", "jenis", "awal_musim", "bulan_target", "tugas", "usulan_penanggung_jawab", "status", "selesai"].join(",")];
    for (const t of T) for (const x of t.tugas) rows.push([nama, t.jenis, t.mulai.toISOString().slice(0, 7), x.tgl.toISOString().slice(0, 7), x.tugas, x.pj, x.status[0], cek[x.id] ? "ya" : "tidak"].map(q).join(","));
    const a = h("a", {href: URL.createObjectURL(new Blob(["﻿" + rows.join("\r\n")], {type: "text/csv;charset=utf-8"})), download: `templat-pra-musim-${nama.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`});
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  function stok(T) {
    const v = D.kab[kode], aktif = T.filter(t => t.berjalan || (t.mulai - ref) / HARI <= 90);
    const isi = aktif.length ? aktif.map(t => h("div", {class: "sg-sop"}, h("h3", null, ikon(t.jenis), label(t.jenis), pil(`${F(Math.round(t.m.kejadian_th * D.n_tahun))} kejadian dalam ${D.n_tahun} tahun di musim`, "info", "daftar")),
      h("div", {class: "sg-stok"}, D.stok[t.jenis].map(s => h("div", null, ikon(s.kode), s.nama)))))
      : [kosong("logistik", "Tidak ada musim yang berjalan atau mulai dalam 90 hari ke depan di bulan terpilih.")];
    return blok("logistik", `Saran stok penyangga ${v.nama}`, ...isi, kaki("Daftar jenis barang menurut kebutuhan per jenis kejadian (kode kebutuhan logbook). Jumlah belum dihitung: logbook arsip tidak memuat kebutuhan, jadi tentukan jumlah dari data penduduk dan standar pelayanan minimal setempat."));
  }

  const DUM_DESA = ["Desa Contoh Hulu", "Desa Contoh Tengah", "Desa Contoh Hilir", "Desa Contoh Seberang"];
  function terisolir() {
    const v = D.kab[kode]; let rows = v.desa;
    if (sedangDummy && !rows.length) rows = DUM_DESA.map((d, i) => ({desa: d, kec: "Kecamatan Contoh", n: 6 - i, jenis: [J4[i % 3]], bulan: [((bulan + i * 3 - 1) % 12) + 1, bulan], terakhir: 2020 + (i % 3), dummy: true}));
    rows = [...rows].sort((a, b) => (b.bulan.includes(bulan) - a.bulan.includes(bulan)) || ((b.n || 0) - (a.n || 0)) || a.desa.localeCompare(b.desa, "id"));
    const box = h("div");
    const gambar = (maks) => { const tb = h("tbody");
      for (const r of rows.slice(0, maks)) tb.append(h("tr", null, h("td", null, r.desa, r.dummy ? " " : null, r.dummy ? pil("dummy", "info", "uji") : null), h("td", {teks: r.kec || "–"}), h("td", {class: "n", teks: r.n == null ? "–" : F(r.n)}), h("td", {teks: r.jenis.map(label).join(", ") || "–"}),
        h("td", {class: r.bulan.includes(bulan) ? "sg-bulanini" : "", teks: r.bulan.map(b => BLN[b - 1].slice(0, 3)).join(", ") || "–"}), h("td", {teks: r.terakhir || "–"}), h("td", null, r.bulan.includes(bulan) ? pil("rawan bulan ini", "bahaya", "peringatan") : pil("di luar bulan ini", "ok", "ok"))));
      box.replaceChildren(...[h("div", {class: "lb-tabel-bungkus"}, h("table", {class: "lb-tabel"}, h("thead", null, h("tr", null, ["Desa", "Kecamatan", "Kejadian", "Jenis", "Bulan rawan", "Terakhir", "Status"].map(t => h("th", {teks: t})))), tb)),
        h("p", {class: "lb-draf", teks: `${F(Math.min(maks, rows.length))} dari ${F(rows.length)} desa`}), rows.length > maks ? (() => { const b = h("button", {class: "bn-tombol sekunder sg-tidakcetak", type: "button"}, ikon("tambah"), `Tampilkan ${F(Math.min(50, rows.length - maks))} lagi`); b.addEventListener("click", () => gambar(maks + 50)); return b; })() : null].filter(Boolean)); };
    if (rows.length) gambar(10);
    else box.append(kosong("pin", D.ada_terisolir ? `Tidak ada desa langganan terisolir tercatat untuk ${v.nama}.` : "Daftar desa langganan terisolir belum terbit. Berkas data/pusdalops/desa_terisolir.csv disiapkan tim data; setelah ada, jalankan scripts/bnpb/siaga.py."));
    return blok("pin", `Desa langganan terisolir ${v.nama}`, box, kaki("Desa dengan ≥2 kejadian akses terputus (atau di 2 tahun berbeda). Jumlah ini batas atas: layak dicek, bukan daftar pasti."));
  }

  function senyap() {
    const v = D.kab[kode], kunci = `${kode.slice(0, 2)}|${v.nama}`, box = h("div"), toggle = h("div", {class: "sg-toggle sg-tidakcetak", role: "radiogroup", "aria-label": "Cakupan daerah senyap"});
    let semua = false;
    const rasio = r => r.riwayat?.dari ? r.riwayat.tahun_ada / r.riwayat.dari : 0;   // nilai mentah beda satuan (titik, mm), tak dibandingkan
    let baris = SEN?.baris || [];
    if (sedangDummy && !baris.length) baris = [{kab: kunci, jenis: "karhutla", kekuatan: "kuat", nilai: 120, satuan: "titik 3 hari", sejak: wibKini().toISOString().slice(0, 10), alasan: "Contoh dummy: titik panas banyak, belum ada laporan.", riwayat: {tahun_ada: 3, dari: 7}, dummy: true},
      {kab: kunci, jenis: "banjir", kekuatan: "sedang", nilai: 45, satuan: "mm 24 jam", sejak: wibKini().toISOString().slice(0, 10), alasan: "Contoh dummy: hujan lebat tanpa laporan.", riwayat: {tahun_ada: 5, dari: 7}, dummy: true}];
    const gambar = () => {
      const rows = (semua ? baris : baris.filter(b => b.kab === kunci)).slice().sort((a, b) => (a.kekuatan === "kuat" ? 0 : 1) - (b.kekuatan === "kuat" ? 0 : 1) || rasio(b) - rasio(a) || String(a.kab).localeCompare(String(b.kab), "id"));
      if (!rows.length) return box.replaceChildren(kosong("senyap", !SEN && !sedangDummy ? "Daftar daerah senyap belum terbit. Berkas public/data/senyap.json dibuat tim data tiap hari." : semua ? "Tidak ada daerah senyap hari ini." : `Tidak ada sinyal tanpa laporan di ${v.nama}.`));
      const tb = h("tbody");
      for (const r of rows.slice(0, 15)) tb.append(h("tr", null, h("td", {teks: String(r.kab).split("|").pop()}), h("td", null, pil(label(r.jenis), "info", r.jenis)), h("td", null, pil(label(r.kekuatan), r.kekuatan === "kuat" ? "bahaya" : "tunggu", "peringatan")),
        h("td", {class: "n", teks: `${F(r.nilai)} ${r.satuan || ""}`}), h("td", {teks: r.sejak ? tglF(new Date(r.sejak)) : "–"}), h("td", {teks: r.riwayat ? `${r.riwayat.tahun_ada} dari ${r.riwayat.dari} tahun` : "–"}), h("td", {teks: r.alasan || ""}), r.dummy ? h("td", null, pil("dummy", "info", "uji")) : null));
      box.replaceChildren(h("div", {class: "lb-tabel-bungkus"}, h("table", {class: "lb-tabel"}, h("thead", null, h("tr", null, ["Kab/kota", "Jenis", "Kekuatan", "Sinyal", "Sejak", "Riwayat bulan sinyal", "Alasan"].map(t => h("th", {teks: t})))), tb)),
        h("p", {class: "lb-draf", teks: `${F(Math.min(15, rows.length))} dari ${F(rows.length)} daerah`}));
    };
    for (const [n, t, ik] of [["kab", "Kab/kota ini", "pin"], ["semua", "Semua daerah", "daftar"]]) { const i = h("input", {type: "radio", name: "sgsen", value: n, checked: n === "kab"}); i.addEventListener("change", () => { semua = n === "semua"; gambar(); }); toggle.append(h("label", null, i, ikon(ik), t)); }
    gambar();
    return blok("senyap", SEN?.acuan ? `Daerah senyap per ${tglF(new Date(SEN.acuan))}` : "Daerah senyap", toggle, box, kaki(SEN?.batasan || "Sinyal satelit atau cuaca yang belum disertai laporan. Daftar tanya, bukan vonis."));
  }

  /* ---------- susunan halaman ---------- */
  /* gambar ulang ditunda satu frame: kontrol pilihan (kab, bulan) bereaksi seketika, kartu menyusul; permintaan beruntun digabung */
  let rafId = 0;
  const gambarIsi = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(() => { const T = tugasKab(); boxIsi.replaceChildren(kalender(), sop(T), stok(T), terisolir(), senyap()); }); };
  const gambarSekarang = () => { cancelAnimationFrame(rafId); const T = tugasKab(); boxIsi.replaceChildren(kalender(), sop(T), stok(T), terisolir(), senyap()); };
  function ganti(k) { kode = k; lokal(KUNCI, k); gambarIsi(); }

  async function mulai() {
    [D, SEN] = await Promise.all([ambil("/data/bnpb/siaga.json"), ambil("/data/senyap.json")]);
    if (!D) return app.replaceChildren(kosong("peringatan", "Data siaga belum terbit. Jalankan scripts/bnpb/siaga.py."));
    sedangDummy = lokal(DUMMY) === 1;
    const kini = wibKini(); bulan = kini.getUTCMonth() + 1; ref = new Date(Date.UTC(kini.getUTCFullYear(), kini.getUTCMonth(), kini.getUTCDate()));
    const urut = Object.entries(D.kab).map(([k, v]) => ({k, nama: v.nama, prov: k.slice(0, 2)})).sort((a, b) => a.nama.localeCompare(b.nama, "id"));
    kode = lokal(KUNCI); if (!D.kab[kode]) kode = (urut.find(x => x.k === "3304") || urut[0]).k;
    const sProv = h("select", {"aria-label": "Provinsi"}), sKab = h("select", {"aria-label": "Kabupaten/kota"});
    const isiKab = () => sKab.replaceChildren(...urut.filter(x => x.prov === sProv.value).map(x => h("option", {value: x.k, teks: x.nama})));
    sProv.replaceChildren(...[...new Set(urut.map(x => x.prov))].sort().map(p => h("option", {value: p, teks: PROV[p] || p})));
    sProv.value = kode.slice(0, 2); isiKab(); sKab.value = kode;
    sProv.addEventListener("change", () => { isiKab(); ganti(sKab.value); });
    sKab.addEventListener("change", () => ganti(sKab.value));
    const sb = h("div", {class: "sg-bulan", role: "radiogroup", "aria-label": "Bulan"});
    BLN.forEach((n, i) => { const r = h("input", {type: "radio", name: "sgbln", value: i + 1, checked: i + 1 === bulan}); r.addEventListener("change", () => { bulan = i + 1; ref = i + 1 === kini.getUTCMonth() + 1 ? new Date(Date.UTC(kini.getUTCFullYear(), kini.getUTCMonth(), kini.getUTCDate())) : new Date(Date.UTC(kini.getUTCFullYear() + (i + 1 < kini.getUTCMonth() + 1 ? 1 : 0), i, 1)); gambarIsi(); }); sb.append(h("label", null, r, n.slice(0, 3))); });
    boxIsi = h("div", {class: "bn-form"});
    const aksi = h("div", {class: "bn-aksi"}, h("a", {class: "bn-tombol sekunder", href: "/bnpb/logbook.html"}, ikon("daftar"), "Logbook"));
    app.replaceChildren(h("div", {class: "bn-judul"}, h("h1", {teks: "Siaga pra-musim"}), sedangDummy ? pil("data dummy aktif", "info", "uji") : null, aksi),
      h("section", {class: "bn-blok sg-pilih sg-tidakcetak"}, h("div", {class: "bn-baris"}, h("label", {class: "bn-isian"}, "Provinsi", sProv), h("label", {class: "bn-isian"}, "Kabupaten/kota", sKab)), sb), boxIsi);
    gambarSekarang();
    pasangTip();
    superDummy(aksi);
  }
  /* Super Admin: 🧪 isi contoh desa terisolir dan daerah senyap bila datanya kosong, 🧹 hapus. Murni di peramban ini (tidak ada tabel yang ditulis), muat ulang penuh. */
  async function superDummy(aksi) {
    const r = await fetch("/api/akademisi/saya").then(x => x.ok ? x.json() : null).catch(() => null);
    if (!r?.super) return;
    aksi.prepend(h("button", {class: "ad-tombol ad-bulat", type: "button", "data-d": "isi", title: "Isi contoh desa terisolir dan daerah senyap untuk kabupaten/kota ini", "aria-label": "Isi data dummy"}, "🧪"),
      h("button", {class: "ad-tombol ad-bulat", type: "button", "data-d": "hapus", title: "Hapus data dummy", "aria-label": "Hapus data dummy"}, "🧹"));
    aksi.addEventListener("click", e => { const b = e.target.closest("[data-d]"); if (!b) return; lokal(DUMMY, b.dataset.d === "isi" ? 1 : null); location.reload(); });
  }
  mulai();
})();
