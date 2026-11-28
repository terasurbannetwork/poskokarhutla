/* Penggambar Lacak laporan, dipakai dua tempat: halaman sendiri /lapor/lacak.html (mandiri) dan layar di dalam aplikasi /lapor (lewat rel kiri dan kepala tetap).
   Data dari /api/lapor/lacak?t= (token pemegang tautan). Token tidak ditulis ke penyimpanan apa pun di sini. Diperbarui tiap 30 detik selama terlihat. */
const el = (t, k, x) => { const e = document.createElement(t); if (k) e.className = k; if (x != null) e.textContent = x; return e; };
const IK = {terima: "M4 12l5 5L20 6", lihat: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", telaah: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4",
  tindak: "M3 21h18M5 21V10l7-6 7 6v11M10 21v-6h4v6", selesai: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-4 9 3 3 5-6",
  jenis: "M12 3 2 20h20ZM12 10v4M12 17h.01", karakter: "M4 6h16M4 12h10M4 18h7", lokasi: "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Zm0-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  waktu: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2", lapor: "M4 5h16v11H8l-4 4Z", foto: "M4 7h3l2-2h6l2 2h3v12H4ZM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", pelapor: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0"};
const ik = k => { const v = document.createElementNS("http://www.w3.org/2000/svg", "svg"); v.setAttribute("viewBox", "0 0 24 24"); v.setAttribute("aria-hidden", "true"); const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", IK[k]); v.append(p); return v; };
const GB = {"Banjir": "banjir", "Tanah longsor": "longsor", "Gelombang pasang dan abrasi": "rob", "Cuaca ekstrem": "cuaca", "Kekeringan": "kekeringan", "Kebakaran hutan dan lahan": "karhutla", "Gempa bumi": "gempa", "Tsunami": "tsunami", "Erupsi gunung api": "gunungapi"};
const IKON_KARTU = {status: "M9 5h6M9 3h6v4H9zM6 5H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1M9 14l2 2 4-4", kejadian: "M12 3 2 20h20ZM12 10v4M12 17h.01", bukti: "M4 7h3l2-2h6l2 2h3v12H4Zm8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  balas: "M4 5h16v11H8l-4 4Z", dok: "M12 4v11M7 10l5 5 5-5M5 20h14", darurat: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2", kembali: "M15 6l-6 6 6 6"};
const kepala = (jenis, judul, extra = "") => { const h = el("h2"); const v = document.createElementNS("http://www.w3.org/2000/svg", "svg"); v.setAttribute("viewBox", "0 0 24 24"); v.setAttribute("aria-hidden", "true");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", IKON_KARTU[jenis]); v.append(p); h.append(v, judul); return h; };
const kartu = (kelas, jenis, judul, isi, tersembunyi = false) => { const s = el("section", `lk-kartu ${kelas}`); s.hidden = tersembunyi; s.append(kepala(jenis, judul), isi); return s; };

/* pasangLacak(akar, {token, mandiri, kembali}): membangun kerangka di akar dan mengisinya; mengembalikan {muat, henti} */
export function pasangLacak(akar, {token, mandiri = false, kembali = null} = {}) {
  const r = {};   // rujukan simpul: pita, nomor, ringkas, status, qr, tahap, rinci, bukti, balasan, unduhan
  akar.replaceChildren();
  const pita = el("header", "lk-pita"), merek = mandiri ? Object.assign(el("a", "lk-merek"), {href: "/lapor/"}) : null;
  if (merek) { const g = Object.assign(el("img"), {src: "/lapor/lambang-bnpb.png", alt: "", width: 36, height: 36}); const t = el("span", null, "Pantau Bencana"); t.append(el("small", null, "BNPB")); merek.append(g, t); pita.append(merek); }
  const isiPita = el("div", "lk-pita-isi"); r.nomor = el("h1", null, "Memuat..."); r.ringkas = el("p", "lk-ringkas"); isiPita.append(el("p", "lk-alis", "Lacak laporan"), r.nomor, r.ringkas);
  const kananPita = el("div", "lk-pita-kanan"); r.status = el("span", "lk-status"); r.qr = el("div", "lk-qr"); kananPita.append(r.status, r.qr); pita.append(isiPita, kananPita); r.pita = pita;
  r.tahap = el("ol", "lk-tahap"); const kStatus = kartu("lk-tahap-wadah k-status", "status", "Status laporan", r.tahap);
  r.rinci = el("dl", "lk-rinci"); const kKejadian = kartu("k-kejadian", "kejadian", "Kejadian", r.rinci);
  r.bukti = el("div", "lk-bukti"); const kBukti = kartu("", "bukti", "Foto penanganan dari petugas", r.bukti, true);
  r.balasan = el("div", "lk-balasan"); const kBalas = kartu("k-balas", "balas", "Balasan petugas", r.balasan, true);
  r.unduhan = el("div", "lk-unduh"); const kDok = kartu("k-dok", "dok", "Dokumen laporan", r.unduhan);
  const nas = el("div", "lk-nas"); for (const [n, t] of [["117", "Call center BNPB"], ["112", "Darurat terpadu"], ["113", "Pemadam kebakaran"]]) { const a = Object.assign(el("a"), {href: `tel:${n}`}); a.append(el("b", null, n), el("small", null, t)); nas.append(a); }
  const kDarurat = kartu("lk-darurat", "darurat", "Butuh bantuan segera?", nas);
  const kmb = mandiri ? Object.assign(el("a", "lk-kembali"), {href: "/lapor/"}) : Object.assign(el("button", "lk-kembali"), {type: "button"});
  { const v = document.createElementNS("http://www.w3.org/2000/svg", "svg"); v.setAttribute("viewBox", "0 0 24 24"); v.setAttribute("aria-hidden", "true"); const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", IKON_KARTU.kembali); v.append(p);
    kmb.append(v, mandiri ? "Kembali ke Pantau Bencana" : "Kembali ke Laporan saya"); if (!mandiri) kmb.addEventListener("click", () => kembali?.()); }
  const kanan = el("div", "lk-kanan"); kanan.append(kBukti, kBalas, kDok, kDarurat, kmb);
  const dua = el("div", "lk-dua"); dua.append(kKejadian, kanan);
  akar.append(pita, kStatus, dua, el("p", "lk-catatan", "Halaman ini hanya bisa dibuka lewat tautan yang dikirim kepada pelapor. Jangan bagikan ke orang lain."));

  let henti = false, jalan = 0;
  async function muat() {
    const aku = ++jalan;
    try {
      const res = await fetch(`/api/lapor/lacak?t=${encodeURIComponent(token || "")}`, {signal: AbortSignal.timeout(15000), cache: "no-store", referrerPolicy: "no-referrer"}), j = await res.json();
      if (aku !== jalan || henti) return;
      if (!res.ok) throw new Error(j.galat || "Laporan tidak ditemukan.");
      if (mandiri) document.title = `Lacak ${j.nomor}, Pantau Bencana BNPB`;
      r.nomor.textContent = j.nomor;
      if (GB[j.jenis]) pita.style.setProperty("--foto", `url(/img/bencana-${GB[j.jenis]}.jpg)`);
      const kini = [...j.tahap].reverse().find(x => x.selesai); r.status.textContent = kini ? kini.label : "Menunggu";
      if (!r.qr.childElementCount && window.Bagi?.QR) { try { const q = window.Bagi.QR.kanvas(mandiri ? location.href : `${location.origin}/lapor/lacak.html?t=${token}`, 4); q.setAttribute("role", "img"); q.setAttribute("aria-label", "Kode QR halaman ini"); r.qr.append(q); } catch {} }
      r.ringkas.textContent = `${j.jenis}${j.subjenis ? `, ${j.subjenis.toLowerCase()}` : ""}. Dilaporkan ${j.waktuLapor}.`;
      r.tahap.replaceChildren(...j.tahap.map((x, i) => {
        const li = el("li", x.selesai ? "selesai" : (i && j.tahap[i - 1].selesai ? "berikut" : "")), titik = el("span", "lk-titik"), isi = el("div");
        titik.append(ik(["terima", "lihat", "telaah", "tindak", "selesai"][i] || "terima"));
        isi.append(el("b", null, x.label), el("small", null, x.selesai ? x.waktu : "Menunggu"));
        if (x.catatan) isi.append(el("p", null, x.catatan));
        li.append(titik, isi); return li;
      }));
      kBukti.hidden = !(j.bukti || []).length; // bukti tindak lanjut (K60, D88)
      r.bukti.replaceChildren(...(j.bukti || []).map(b => { const f = el("figure"), a = Object.assign(el("a"), {href: b.url, target: "_blank", rel: "noopener"}), im = el("img"); im.src = b.url; im.alt = "Foto penanganan oleh petugas"; im.loading = "lazy"; a.append(im); f.append(a, el("figcaption", null, b.waktu)); return f; }));
      kBalas.hidden = !j.balasan.length;
      r.balasan.replaceChildren(...j.balasan.map(b => { const d = el("div", "lk-balas"); d.append(el("b", null, "Admin BNPB"), el("p", null, b.teks), el("small", null, b.waktu)); return d; }));
      const rinci = [["Jenis", j.jenis, "jenis"], ["Karakteristik", j.subjenis, "karakter"], ["Lokasi", j.lokasi, "lokasi"], ["Waktu kejadian", j.waktuKejadian, "waktu"], ["Waktu dilaporkan", j.waktuLapor, "lapor"], ["Foto", `${j.foto} foto`, "foto"], ["Pelapor", j.pelapor, "pelapor"]];
      r.rinci.replaceChildren(...rinci.filter(([, v]) => v).map(([k, v, i]) => { const d = el("div", i === "lokasi" ? "lebar" : ""), u = el("span", "lk-rinci-ikon"); u.append(ik(i)); const tx = el("span"); tx.append(el("dt", null, k), el("dd", null, v)); d.append(u, tx); return d; }));
      r.unduhan.replaceChildren(...j.unduhan.map(u => { const a = Object.assign(el("a", "lk-dok"), {href: u.url}); const jenis = /pdf/i.test(u.label) ? "PDF" : "Word";
        a.append(el("span", `lk-dok-ikon ${jenis.toLowerCase()}`, jenis), el("b", null, u.label), el("small", null, "Laporan lengkap dengan foto")); return a; }));
    } catch (e) { if (aku === jalan && !henti) { r.nomor.textContent = e.message; r.ringkas.textContent = "Periksa lagi tautan yang Anda terima."; } }
  }
  const putar = setInterval(() => { if (!document.hidden && akar.offsetParent !== null) muat(); }, 30000);   // layar tersembunyi (pindah tab) tidak menarik data
  muat();
  return {muat, henti() { henti = true; clearInterval(putar); }};
}
