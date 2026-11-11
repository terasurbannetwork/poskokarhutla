/* Siaga pra-musim per kabupaten/kota dan bulan: kalender risiko (tahun penuh dari data), SOP pra-musim, saran stok penyangga, desa langganan terisolir, daerah senyap.
   Data: /data/bnpb/siaga.json (scripts/bnpb/siaga.py dari kalender_risiko.json + desa_terisolir.csv), /data/senyap.json (pipa-data).
   Angka pipeline tidak dihitung ulang di layar. Tanpa gaya/skrip inline (CSP); teks data lewat textContent. */
(() => {
  "use strict";
  const {PROV, ikon, h, F, label, namaJenis, urutJenis, BLN} = window.Wilayah;
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
  const thRingkas = (a = []) => { const t = a.map(Number).sort((x, y) => x - y), o = []; for (let i = 0; i < t.length;) { let j = i; while (t[j + 1] === t[j] + 1) j++; o.push(j > i ? `${t[i]}–${t[j]}` : `${t[i]}`); i = j + 1; } return o.length < 3 ? o.join(" dan ") : `${o.slice(0, -1).join(", ")}, dan ${o.at(-1)}`; };
  const tglF = d => d.toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"});
  const blnTh = d => `${BLN[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`;
  const wibKini = () => new Date(Date.now() + 7 * 36e5);

  let D, SEN, KB, SU, kode, bulan, ref, boxIsi, sedangDummy = false;

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
        g.setAttribute("data-tip", tip(`${namaJenis(j)}, ${BLN[i]}`, `Ada kejadian: ${v.ada[j][i]} dari ${D.n_tahun} tahun penuh`, pv >= D.ambang_musim ? "Masuk musim" : "Di luar musim"));
        r.setAttribute("class", "bat" + (pv >= D.ambang_musim ? " musim" : "")); r.setAttribute("x", i * 80 + 8); r.setAttribute("width", 64); r.setAttribute("y", 104 - hh); r.setAttribute("height", hh); r.setAttribute("rx", 3);
        const t = document.createElementNS(svg.namespaceURI, "text"); t.setAttribute("x", i * 80 + 40); t.setAttribute("y", 119); t.textContent = BLN[i].slice(0, 3);
        g.append(r, t);
        if (i + 1 === bulan) { const o = document.createElementNS(svg.namespaceURI, "rect"); o.setAttribute("class", "pilih"); o.setAttribute("x", i * 80 + 3); o.setAttribute("y", 2); o.setAttribute("width", 74); o.setAttribute("height", 120); g.append(o); }
        svg.append(g);
      });
      rows.append(h("div", {class: "sg-baris"}, h("b", null, ikon(j), namaJenis(j)), svg));
    }
    return blok("kalender", `Kalender risiko ${v.nama}`, rows, kaki(`Tinggi batang = bagian dari ${D.n_tahun} tahun penuh (${thRingkas(D.tahun_penuh)}) yang punya kejadian di bulan itu. Batang merah = masuk musim (ada kejadian di ${Math.ceil(D.ambang_musim * D.n_tahun)} tahun atau lebih). Kotak = bulan terpilih.`));
  }

  function sop(T) {
    const v = D.kab[kode], cek = lokal("siaga_sop") || {};
    const isi = T.length ? T.map(({jenis, m, mulai, berjalan, tugas}) => h("div", {class: "sg-sop"},
      h("h3", null, ikon(jenis), namaJenis(jenis), pil(`musim ${rentang(m.bulan)}`, "info", "kalender"), pil(berjalan ? "musim berjalan" : `mulai sekitar ${blnTh(mulai)}`, berjalan ? "bahaya" : "tunggu", berjalan ? "peringatan" : "tunggu")),
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
    const isi = aktif.length ? aktif.map(t => h("div", {class: "sg-sop"}, h("h3", null, ikon(t.jenis), namaJenis(t.jenis), pil(`${F(Math.round(t.m.kejadian_th * D.n_tahun))} kejadian dalam ${D.n_tahun} tahun di musim`, "info", "daftar")),
      h("div", {class: "sg-stok"}, D.stok[t.jenis].map(s => h("div", null, ikon(s.kode), s.nama)))))
      : [kosong("logistik", "Tidak ada musim yang berjalan atau mulai dalam 90 hari ke depan di bulan terpilih.")];
    return blok("logistik", `Saran stok penyangga ${v.nama}`, ...isi, kaki("Daftar jenis barang menurut kebutuhan per jenis kejadian (kode kebutuhan logbook). Jumlah belum dihitung: logbook arsip tidak memuat kebutuhan, jadi tentukan jumlah dari data penduduk dan standar pelayanan minimal setempat."));
  }

  /* ---------- kebutuhan yang biasa diminta (logbook_kebutuhan.json, hitungan kejadian tahun dasar) ---------- */
  const KEB = {makanan: "Makanan", air_bersih: "Air bersih", tenda_terpal: "Tenda dan terpal", selimut_tikar_kasur: "Selimut, tikar, kasur", pakaian: "Pakaian", obat_kesehatan: "Obat dan kesehatan", bayi_anak: "Kebutuhan bayi dan anak",
    perlengkapan_mandi: "Perlengkapan mandi", masker: "Masker", karung_pasir: "Karung pasir", material_bangunan: "Material bangunan", perahu: "Perahu", pompa: "Pompa", alat_berat: "Alat berat", mobil_tangki_air: "Mobil tangki air", genset: "Genset",
    gergaji_mesin: "Gergaji mesin", alat_komunikasi: "Alat komunikasi"};
  const IKK = {tenda_terpal: "tenda", obat_kesehatan: "obat", material_bangunan: "material", pakaian: "sandang", selimut_tikar_kasur: "sandang", bayi_anak: "personel", masker: "obat", mobil_tangki_air: "air_bersih", alat_komunikasi: "sinyal"};
  const MIN_BULAN = 3, MIN_BERISI = 5;   // di bawah ini persentase tidak berarti
  const pct = (a, b) => b ? `${F(Math.round(100 * a / b))}%` : "–";
  const jml = (a, bl) => bl.reduce((x, m) => x + (a?.[m - 1] || 0), 0);
  /* baris: {k, n, den (kab, bisa null), nas, nasDen}; kolom kab hanya bila ada den */
  function tabelKeb(judulKolom, rows, jendela) {
    const kab = rows.some(r => r.den != null), tb = h("tbody");
    const sel = (n, den) => h("td", {class: "n"}, h("meter", {min: 0, max: 100, value: den ? 100 * n / den : 0, title: pct(n, den)}), " ", pct(n, den), ` (${F(n)} dari ${F(den)})`);
    for (const r of rows) tb.append(h("tr", null, h("td", null, h("span", {class: "sg-keb"}, ikon(IKK[r.k] || r.k), KEB[r.k] || label(r.k))), kab ? sel(r.n, r.den) : null, sel(r.nas, r.nasDen)));
    return h("div", {class: "lb-tabel-bungkus"}, h("table", {class: "lb-tabel"}, h("thead", null, h("tr", null, [judulKolom, ...(kab ? [`Kab/kota, ${jendela}`] : []), "Nasional, semua bulan"].map(t => h("th", {teks: t})))), tb));
  }
  function kebutuhanBiasa() {
    const v = D.kab[kode], kk = `${kode.slice(0, 2)}|${v.nama}`, judul = `Kebutuhan yang biasa diminta ${v.nama}`;
    if (!KB) return blok("logistik", judul, kosong("peringatan", "Data kebutuhan logbook belum terbit. Berkas public/data/bnpb/logbook_kebutuhan.json dibuat tim data."));
    const js = J4.filter(j => v.musim[j]?.bulan.includes(bulan) && KB.jenis[j]);
    const isi = js.length ? js.map(j => {
      const d = KB.jenis[j], bl = v.musim[j].bulan, jendela = rentang(bl), kb = d.kab_berisi?.[kk];
      const den = kb ? jml(kb.n_kejadian_berisi, bl) : 0, denA = kb ? jml(kb.n_alat_berisi, bl) : 0;
      const nas = Object.entries(d.nasional).map(([k, n]) => ({k, nas: n, nasDen: d.n_kejadian_berisi})).sort((a, b) => b.nas - a.nas);
      const kabRows = Object.entries(d.kab[kk] || {}).map(([k, a]) => ({k, n: jml(a, bl), den, nas: d.nasional[k] || 0, nasDen: d.n_kejadian_berisi})).filter(r => r.n).sort((a, b) => b.n - a.n);
      const alatRows = Object.entries(d.alat_nasional || {}).map(([k, n]) => ({k, n: jml(d.alat_kab?.[kk]?.[k], bl), den: denA, nas: n, nasDen: d.alat_berisi})).sort((a, b) => b.nas - a.nas);
      const cukup = den >= MIN_BERISI;
      return h("div", {class: "sg-sop"}, h("h3", null, ikon(j), namaJenis(j), pil(`musim ${jendela}`, "info", "kalender"), pil(cukup ? `${F(den)} kejadian berisi di kab/kota dari ${F(jml(kb.n_kejadian, bl))}` : `${F(d.n_kejadian_berisi)} kejadian berisi secara nasional dari ${F(d.n_kejadian)}`, "info", "daftar")),
        cukup ? tabelKeb("Kebutuhan", kabRows, jendela)
          : [kosong("data", `Belum cukup data di kab ini: hanya ${F(den)} kejadian ${namaJenis(j).toLowerCase()} berisi kolom kebutuhan pada bulan musim (${jendela}), kurang dari ${MIN_BERISI}. Di bawah ini pola nasional, bukan kab/kota ini.`), d.n_kejadian_berisi >= MIN_BERISI ? tabelKeb("Kebutuhan", nas) : null],
        denA >= MIN_BERISI ? [h("h4", {class: "sg-sub", teks: "Peralatan yang dikerahkan"}), tabelKeb("Peralatan", alatRows, jendela)]
          : d.alat_berisi >= MIN_BERISI ? [h("h4", {class: "sg-sub", teks: "Peralatan yang dikerahkan, pola nasional"}), tabelKeb("Peralatan", alatRows.map(r => ({...r, den: null})))] : kaki(`Peralatan: hanya ${F(d.alat_berisi)} kejadian yang mengisinya, terlalu sedikit untuk persentase.`));
    }) : [kosong("logistik", `Tidak ada jenis yang masuk musim di ${BLN[bulan - 1]} untuk ${v.nama}. Pilih bulan lain.`)];
    return blok("logistik", judul, ...isi, kaki(`Sumber: logbook Pusdalops BNPB, tahun dasar ${thRingkas(KB.tahun_dasar)}. Persentase = kejadian dengan kategori itu dibagi kejadian yang mengisi kolom kebutuhan (atau peralatan) pada bulan musim jenis tersebut; kolom ini jarang diisi, jadi n selalu ditampilkan. Kategori dari kata kunci. Ini bahan menentukan stok penyangga, bukan jumlah barang.`));
  }


  /* ---------- perkiraan stok per bulan (logbook_kebutuhan.json prov_bulan) ---------- */
  let jenisStok = "banjir";
  const pecah = (v, d = 1) => v == null ? "–" : F(Math.round(v * 10 ** d) / 10 ** d);
  function perkiraanStok() {
    const kp = kode.slice(0, 2), namaP = PROV[kp] || kp, judul = `Perkiraan stok per bulan ${namaP}`;
    if (!KB) return blok("logistik", judul, kosong("peringatan", "Data kebutuhan logbook belum terbit."));
    const js = Object.keys(KB.jenis).filter(j => j !== "omc" && KB.jenis[j]?.prov_bulan?.[kp]).sort(urutJenis);
    if (!js.length) return blok("logistik", judul, kosong("tunggu", `Belum ada kejadian berkebutuhan tercatat di ${namaP}.`));
    if (!js.includes(jenisStok)) jenisStok = js[0];
    const seg = h("div", {class: "lb-seg", role: "radiogroup", "aria-label": "Jenis kejadian"}), kotak = h("div", {class: "lb-isi"});
    for (const j of js) { const i = h("input", {type: "radio", name: "sgstokj", value: j, checked: j === jenisStok}); i.addEventListener("change", () => { jenisStok = j; requestAnimationFrame(isi); }); seg.append(h("label", null, i, ikon(j), namaJenis(j))); }
    const sorot = new Set([0, 1, 2].map(x => (bulan - 1 + x) % 12));
    const isi = () => {
      const d = KB.jenis[jenisStok], pb = d.prov_bulan[kp], n = KB.n_tahun_dasar, nk = pb.n_kejadian;
      const alat = new Set(Object.keys(d.alat_nasional || {})), rows = [];
      for (const [k, a] of Object.entries(pb)) { if (!Array.isArray(a) || k.startsWith("n_")) continue;
        const pen = alat.has(k) ? pb.n_alat_berisi : pb.n_berisi, est = a.map((x, m) => pen[m] * n >= MIN_BULAN ? x / pen[m] * nk[m] : null);
        if (est.some(x => x)) rows.push({k, est, jml: est.reduce((x, y) => x + (y || 0), 0)}); }
      rows.sort((a, b) => b.jml - a.jml);
      const berisiTh = pb.n_berisi.reduce((x, y) => x + y, 0) * n;
      if (berisiTh < MIN_BERISI) return kotak.replaceChildren(kosong("data", `Belum cukup data di ${namaP}: hanya ${F(Math.round(berisiTh))} kejadian ${namaJenis(jenisStok).toLowerCase()} mengisi kolom kebutuhan di tahun dasar, kurang dari ${MIN_BERISI}.`));
      /* grafik kejadian per bulan, bulan sorotan merah */
      const W = 960, svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"), mx = Math.max(...nk, 0.1);
      svg.setAttribute("viewBox", `0 0 ${W} 150`); svg.setAttribute("class", "sg-svg"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", `Rata-rata kejadian ${jenisStok} per bulan di ${namaP}`);
      const ln = document.createElementNS(svg.namespaceURI, "line"); ln.setAttribute("class", "dasar"); ln.setAttribute("x1", 0); ln.setAttribute("x2", W); ln.setAttribute("y1", 126); ln.setAttribute("y2", 126); svg.append(ln);
      nk.forEach((v, i) => { const g = document.createElementNS(svg.namespaceURI, "g"), hh = Math.max(v ? 3 : 0, 110 * v / mx), r = document.createElementNS(svg.namespaceURI, "rect"), t = document.createElementNS(svg.namespaceURI, "text");
        g.setAttribute("data-tip", tip(`${namaJenis(jenisStok)}, ${BLN[i]}`, `Rata-rata ${pecah(v)} kejadian per tahun`, `Mengisi kolom kebutuhan: ${pecah(pb.n_berisi[i], 2)} per tahun`, sorot.has(i) ? "Bulan ini dan dua bulan berikutnya" : ""));
        r.setAttribute("class", "bat" + (sorot.has(i) ? " musim" : "")); r.setAttribute("x", i * 80 + 8); r.setAttribute("width", 64); r.setAttribute("y", 126 - hh); r.setAttribute("height", hh); r.setAttribute("rx", 3);
        t.setAttribute("x", i * 80 + 40); t.setAttribute("y", 144); t.textContent = BLN[i].slice(0, 3); g.append(r, t); svg.append(g); });
      const tb = h("tbody");
      for (const {k, est} of rows.slice(0, 12)) tb.append(h("tr", null, h("td", null, h("span", {class: "sg-keb"}, ikon(IKK[k] || k), KEB[k] || label(k))), est.map((x, m) => h("td", {class: "n" + (sorot.has(m) ? " sg-sorot" : ""), teks: x == null ? "–" : pecah(x)}))));
      kotak.replaceChildren(h("div", {class: "lb-ringkas"}, pil(`${pecah(nk.reduce((x, y) => x + y, 0))} kejadian ${namaJenis(jenisStok).toLowerCase()} per tahun di ${namaP}`, "info", "daftar"), pil(`${F(Math.round(berisiTh))} kejadian mengisi kolom kebutuhan`, "tunggu", "peringatan"), pil("bukan jumlah barang", "tunggu", "senyap")), svg,
        h("div", {class: "lb-tabel-bungkus"}, h("table", {class: "lb-tabel"}, h("thead", null, h("tr", null, ["Kebutuhan, kejadian per tahun", ...BLN.map((b, m) => b.slice(0, 3))].map((t, m) => h("th", {class: m && sorot.has(m - 1) ? "sg-sorot" : "", teks: t})))), tb)),
        kaki(`Perkiraan kejadian per tahun yang membutuhkan tiap kategori = kejadian berkategori itu dibagi kejadian yang mengisi kolom kebutuhan (atau peralatan), dikali semua kejadian di bulan itu. Ini mengandaikan kejadian yang tidak mengisi kolom sama kebutuhannya dengan yang mengisi, dan belum tentu benar. Rata-rata ${F(n)} tahun dasar; kolom merah muda = bulan ini dan dua bulan berikutnya. Tanda – = kurang dari 3 kejadian yang mengisi di bulan itu, terlalu sedikit untuk dijadikan perkiraan. Perkiraan kasar dari laporan Pusdalops, bukan stok yang harus disiapkan. Menampilkan 12 kategori teratas. Sumber: logbook Pusdalops BNPB, tahun dasar ${thRingkas(KB.tahun_dasar)}.`));
    };
    isi();
    return blok("logistik", judul, seg, kotak);
  }

  /* ---------- bencana susulan (logbook_susulan.json), deskriptif ---------- */
  function susulan() {
    const v = D.kab[kode], kk = `${kode.slice(0, 2)}|${v.nama}`, judul = `Bencana susulan ${v.nama}`;
    if (!SU) return blok("peringatan", judul, kosong("peringatan", "Data bencana susulan belum terbit (logbook_susulan.json)."));
    const NJ = x => namaJenis(x).toLowerCase(), J = NJ, baris = [];
    for (const [kunci, p] of Object.entries(SU.pasangan)) {
      const a = kunci.split(">"), c = p.kab?.[kk], nas = p.nasional, sama = a[0] === a[1];
      const nol = x => x.ci95 && x.ci95[0] <= 1 && x.ci95[1] >= 1;   // ci95 null = tanpa klaim lift
      const kal = (x, lingkup) => {
        const awal = sama ? `Sesudah ${J(a[0])}, ${J(a[0])} berikutnya` : `Sesudah ${J(a[0])}, ${J(a[1])}`, per100 = F(Math.round(x.laju * 100)), dasar = F(Math.round(x.dasar * 100));
        const t = `${awal} tercatat 1–${SU.jendela_hari} hari kemudian pada ${per100} dari 100 kejadian di ${lingkup} (${F(x.k)} dari ${F(x.n)})`;
        return !x.ci95 ? `${t}; hari biasa ${dasar} dari 100, selang belum bisa dihitung sehingga tidak ada klaim.` : nol(x) ? `${t}, tidak berbeda dari kebetulan (hari biasa ${dasar} dari 100).` : `${t}, ${F(x.lift)} kali hari biasa (${dasar} dari 100; selang ${F(x.ci95[0])} sampai ${F(x.ci95[1])}).`;
      };
      const hari0 = (x, lingkup) => x.hari0 ? `Tercatat di hari yang sama: ${F(Math.round(x.hari0.laju * 100))} dari 100 di ${lingkup} (sebagian satu laporan gabungan).` : null;
      baris.push({kunci, a, c, nas, kal, hari0, nol});
    }
    const isi = baris.map(({a, c, nas, kal, hari0, nol}) => h("div", {class: "sg-sop"}, h("h3", null, ikon(a[0]), `${label(a[0]).replace("Gempabumi", "Gempa bumi")}, lalu ${NJ(a[1])}`, c ? pil(`${F(c.n)} kejadian di kab/kota`, "info", "daftar") : pil("kab/kota ini belum cukup kejadian (minimal 10 pemicu, 5 disusul)", "tunggu", "senyap"), c && (!c.ci95 || nol(c)) ? pil(c.ci95 ? "tidak berbeda dari kebetulan" : "tanpa klaim lift", "info", "senyap") : c ? pil(`${F(c.lift)} kali hari biasa`, "bahaya", "peringatan") : null),
      c ? h("p", {class: "lb-p", teks: kal(c, v.nama)}) : null, c && hari0(c, v.nama) ? h("p", {class: "lb-p lb-pudar", teks: hari0(c, v.nama)}) : null,
      nas ? h("p", {class: "lb-p lb-pudar", teks: kal(nas, "seluruh Indonesia")}) : null, nas && hari0(nas, "seluruh Indonesia") ? h("p", {class: "lb-p lb-pudar", teks: hari0(nas, "seluruh Indonesia")}) : null));
    return blok("peringatan", judul, ...isi, kaki(`Menghitung seberapa sering jenis kedua tercatat di kab/kota yang sama setelah jenis pertama, dibanding peluang jendela yang sama di hari acak (kab/kota dan bulan-dalam-tahun sama). Selang yang mencakup 1 = tidak bisa dibedakan dari kebetulan, jadi tidak ada klaim. Deskriptif dari laporan Pusdalops, bukan ramalan; satu kejadian yang dilaporkan sebagai dua jenis ikut terhitung. Kab/kota tampil bila minimal 10 kejadian pemicu dan 5 yang disusul; kab/kota tidak diurutkan menurut kenaikan karena perbandingan berganda membuat sebagian angka tinggi muncul kebetulan. Selang: ${SU.ci_metode || "bootstrap"}. Tahun dasar ${thRingkas(SU.tahun_dasar)}.`));
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
  /* ubin Angka utama (sistem desain dashboard, rujukan /operasi) */
  function angkaUtama(T) {
    const v = D.kab[kode], musim = J4.filter(j => (v.p[j]?.[bulan - 1] ?? 0) >= D.ambang_musim), tg = T.flatMap(x => x.tugas);
    const segera = tg.filter(t => t.status[0] === "segera").length, lewat = tg.filter(t => t.status[0] === "terlewat").length;
    const sen = (SEN?.baris || []).filter(b => b.kab === `${kode.slice(0, 2)}|${v.nama}`).length;
    const ubin = (ik, nama, nilai, sub, kelas = "") => h("div", {class: "db-ubin " + kelas}, h("header", null, h("i", null, ikon(ik)), h("span", {teks: nama})), h("b", {teks: nilai}), h("small", {teks: sub}));
    return h("div", {class: "db-ubin-grid k4"},
      ubin("kalender", `Masuk musim ${BLN[bulan - 1]}`, F(musim.length), musim.length ? musim.map(namaJenis).join(", ") : "tidak ada", musim.length ? "oranye" : ""),
      ubin("peringatan", "Tugas SOP segera", F(segera), "30 hari ke depan", segera ? "oranye" : ""),
      ubin("peringatan", "Tugas terlewat", F(lewat), "belum dikerjakan", lewat ? "merah" : ""),
      ubin("senyap", "Daerah senyap", F(sen), "sinyal tanpa laporan", sen ? "oranye" : ""));
  }
  const isiSemua = () => { const T = tugasKab(); boxIsi.replaceChildren(angkaUtama(T), kalender(), sop(T), stok(T), kebutuhanBiasa(), perkiraanStok(), susulan(), terisolir(), senyap()); };
  let rafId = 0;
  const gambarIsi = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(() => { isiSemua(); }); };
  const gambarSekarang = () => { cancelAnimationFrame(rafId); isiSemua(); };
  function ganti(k) { kode = k; lokal(KUNCI, k); gambarIsi(); }

  async function mulai() {
    [D, SEN, KB, SU] = await Promise.all([ambil("/data/bnpb/siaga.json"), ambil("/data/senyap.json"), ambil("/data/bnpb/logbook_kebutuhan.json"), ambil("/data/bnpb/logbook_susulan.json")]);
    if (!D) return app.replaceChildren(kosong("peringatan", "Data siaga belum terbit. Jalankan scripts/bnpb/siaga.py."));
    sedangDummy = false;  // tanpa data dummy, pemilik 11 Nov 2026; dulu lokal(DUMMY) === 1
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
    const aksi = h("div", {class: "bn-aksi"});
    app.replaceChildren(h("div", {class: "bn-judul"}, h("h1", {teks: "Siaga pra-musim"}), sedangDummy ? pil("data dummy aktif", "info", "uji") : null, aksi),
      h("section", {class: "bn-blok sg-pilih sg-tidakcetak"}, h("div", {class: "bn-baris"}, h("label", {class: "bn-isian"}, "Provinsi", sProv), h("label", {class: "bn-isian"}, "Kabupaten/kota", sKab)), sb), boxIsi);
    gambarSekarang();
    pasangTip();
    superDummy(aksi);
  }
  /* Super Admin: 🧪 isi contoh desa terisolir dan daerah senyap bila datanya kosong, 🧹 hapus. Murni di peramban ini (tidak ada tabel yang ditulis), muat ulang penuh. */
  async function superDummy(aksi) {
    return;   // tombol dummy 🧪/🧹 disembunyikan atas permintaan pemilik 11 Nov 2026 (semua proyek); pulihkan: hapus baris return ini
    const r = await fetch("/api/akademisi/saya").then(x => x.ok ? x.json() : null).catch(() => null);
    if (!r?.super) return;
    aksi.prepend(h("button", {class: "ad-tombol ad-bulat", type: "button", "data-d": "isi", title: "Isi contoh desa terisolir dan daerah senyap untuk kabupaten/kota ini", "aria-label": "Isi data dummy"}, "🧪"),
      h("button", {class: "ad-tombol ad-bulat", type: "button", "data-d": "hapus", title: "Hapus data dummy", "aria-label": "Hapus data dummy"}, "🧹"));
    aksi.addEventListener("click", e => { const b = e.target.closest("[data-d]"); if (!b) return; lokal(DUMMY, b.dataset.d === "isi" ? 1 : null); location.reload(); });
  }
  mulai();
})();
