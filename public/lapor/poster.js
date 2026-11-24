/* Pembuat poster QR per desa (KEPUTUSAN-LAPOR-AI K92, D131-D133; TIKET LA-84). Data publik saja: /data/desa_cari.json (kode, nama desa, kecamatan)
   dan /data/bpbd_kontak.json lewat kontakBpbd (K88: BPBD kab/kota, lalu provinsi, lalu 117; tanpa nomor karangan). QR dari window.Bagi.QR (public/bagi.js).
   Fungsi murni di atas diuji di tests/lapor/poster.test.mjs; bagian layar hanya jalan di peramban. */
import {kontakBpbd} from "./kontak.js";

/* kode desa "32.01.01.1001" -> tautan poster; hanya 10 angka (D131) */
export const tautanPoster = (origin, kd) => `${origin}/lapor/?d=${String(kd).replace(/\D/g, "")}`;
/* isi satu poster: tanpa nama orang; nomor BPBD dari kontakBpbd, dibuang bila hanya jatuh ke 117 (117 sudah tampil sendiri) */
export function isiPoster({kd, desa, kec}, {kabNama, provNama}, kontak, origin) {
  const w = {kabKode: kd.slice(0, 5), provKode: kd.slice(0, 2), kab: kabNama, prov: provNama};
  const b = kontakBpbd(kontak, w);
  return {kd, desa, kec, kab: kabNama, url: tautanPoster(origin, kd), bpbd: b.tingkat === "nasional" ? null : {nama: b.nama, nomor: b.nomor}};
}
/* daftar desa satu kecamatan (atau satu kab bila kec kosong), urut nama */
export const desaDi = (baris, kabKode, kecNama) => baris.filter(([kd, , kec]) => kd.startsWith(`${kabKode}.`) && (!kecNama || kec === kecNama))
  .map(([kd, desa, kec]) => ({kd, desa, kec})).sort((a, b) => a.desa.localeCompare(b.desa, "id"));

if (typeof document !== "undefined") {
  const $ = id => document.getElementById(id);
  const el = (t, k, x) => { const e = document.createElement(t); if (k) e.className = k; if (x != null) e.textContent = x; return e; };
  const PROV = {};   // nama provinsi dari baris provinsi bpbd_kontak.json
  let D = null, K = null, PER_KAB = new Map();   // indeks kab -> baris, dibangun sekali saat data termuat
  const MAKS = 80;   // ponytail: batas pratinjau satu kali cetak; kab besar dicetak per kecamatan
  Promise.all([fetch("/data/desa_cari.json").then(r => r.json()), fetch("/data/bpbd_kontak.json").then(r => r.json()).catch(() => null)]).then(([d, k]) => {
    D = d; K = k;
    for (const b of d.baris) { const kab = b[0].slice(0, 5); if (!PER_KAB.has(kab)) PER_KAB.set(kab, []); PER_KAB.get(kab).push(b); }
    for (const [kode, r] of Object.entries(k?.wilayah || {})) if (kode.length === 2) PROV[kode] = r.nama;
    $("kab").replaceChildren(el("option", null, "Pilih kabupaten/kota"), ...Object.entries(d.kab).sort((a, b) => a[1].localeCompare(b[1], "id"))
      .map(([kode, nama]) => Object.assign(el("option", null, `${nama}${PROV[kode.slice(0, 2)] ? `, ${PROV[kode.slice(0, 2)]}` : ""}`), {value: kode})));
    $("kab").firstChild.value = "";
  }).catch(() => { $("catatan").textContent = "Daftar desa belum termuat. Muat ulang halaman."; });

  $("kab").addEventListener("change", () => {
    const kab = $("kab").value, kec = [...new Set((PER_KAB.get(kab) || []).map(b => b[2]))].sort((a, b) => a.localeCompare(b, "id"));
    $("kec").replaceChildren(Object.assign(el("option", null, kab ? "Pilih kecamatan" : "Pilih kab/kota dulu"), {value: ""}), ...kec.map(n => Object.assign(el("option", null, n), {value: n})));
    $("kec").disabled = !kab; isiDesa();
  });
  $("kec").addEventListener("change", isiDesa);
  function isiDesa() {
    const kab = $("kab").value, kec = $("kec").value, xs = kab && kec ? desaDi(PER_KAB.get(kab) || [], kab, kec) : [];
    $("desa").replaceChildren(...xs.map(x => { const l = el("label"), c = el("input"); c.type = "checkbox"; c.value = x.kd; c.checked = true; c.dataset.desa = x.desa; c.dataset.kec = x.kec; l.append(c, x.desa); return l; }));
    $("desaWadah").hidden = !xs.length; ubah();
  }
  /* centang tampil seketika; pratinjau (sampai 80 lembar ber-QR, sekitar 2 ms per lembar) digambar sesudah bingkai berikutnya, sekali untuk klik beruntun (INP) */
  let jadwal = 0;
  const gambarNanti = () => { cancelAnimationFrame(jadwal); jadwal = requestAnimationFrame(() => setTimeout(gambar, 0)); };
  const ubah = () => { chrome(); gambarNanti(); };
  $("semua").addEventListener("click", () => { for (const c of $("desa").querySelectorAll("input")) c.checked = true; ubah(); });
  $("kosongkan").addEventListener("click", () => { for (const c of $("desa").querySelectorAll("input")) c.checked = false; ubah(); });
  $("desa").addEventListener("change", ubah);
  $("cetak").addEventListener("click", () => print());

  /* chrome (penghitung, tombol Cetak, catatan) berubah seketika di handler; pratinjau ditunda. Lembar disimpan per kode desa: QR dibuat sekali. */
  const LEMBAR = new Map();
  function chrome() {
    const n = $("desa").querySelectorAll("input:checked").length;
    $("nDesa").textContent = n ? `(${n} dipilih)` : "";
    $("cetak").disabled = !n || n > MAKS;
    $("catatan").textContent = n > MAKS ? `Paling banyak ${MAKS} poster sekali cetak. Kosongkan sebagian desa.` : "";
  }
  function gambar() {
    const kab = $("kab").value, dipilih = [...$("desa").querySelectorAll("input:checked")];
    if (dipilih.length > MAKS) { $("pratinjau").replaceChildren(); return; }
    const meta = {kabNama: D.kab[kab], provNama: PROV[kab.slice(0, 2)] || ""};
    $("pratinjau").replaceChildren(...dipilih.map(c => { if (!LEMBAR.has(c.value)) LEMBAR.set(c.value, lembar(isiPoster({kd: c.value, desa: c.dataset.desa, kec: c.dataset.kec}, meta, K, location.origin))); return LEMBAR.get(c.value); }));
  }
  function lembar(p) {
    const a = el("article", "ps-lembar");
    const kp = el("header", "ps-l-kepala"), l1 = el("img"); l1.src = "/lapor/lambang-bnpb.png"; l1.alt = "BNPB";
    const l2 = el("img"); l2.src = "/img/logo-kris.png"; l2.alt = "KRIS"; kp.append(l1, el("span", null, "Badan Nasional Penanggulangan Bencana"), l2);
    const j = el("h2"); j.append("Lapor kejadian bencana di ", el("b", null, `Desa/Kel. ${p.desa}`));
    const sub = el("p", "ps-l-sub", `Kecamatan ${p.kec}, ${p.kab}`);
    const qr = window.Bagi?.QR?.kanvas(p.url, 10); const kq = el("div", "ps-l-qr"); if (qr) { qr.setAttribute("role", "img"); qr.setAttribute("aria-label", `Kode QR ke ${p.url}`); kq.append(qr); }
    const u = el("p", "ps-l-url", p.url.replace(/^https?:\/\//, ""));
    const langkah = el("ol", "ps-l-langkah");
    for (const t of ["Pindai kode ini dengan kamera HP.", "Di kartu lokasi, pilih Desa dari poster.", "Ceritakan kejadiannya. Kirim foto bila bisa."]) langkah.append(el("li", null, t));
    const tel = el("div", "ps-l-telp");
    for (const [n, t] of [["112", "Darurat terpadu"], ["117", "Call center BNPB"], ...(p.bpbd ? [[p.bpbd.nomor, p.bpbd.nama]] : [])]) { const x = el("div"); x.append(el("b", null, n), el("small", null, t)); tel.append(x); }
    a.append(kp, j, sub, kq, u, langkah, el("p", "ps-l-nyawa", "Ada nyawa terancam? Jangan menunggu laporan. Telepon sekarang."), tel);
    return a;
  }
}
