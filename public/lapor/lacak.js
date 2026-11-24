/* Lacak laporan tanpa login (/lapor/lacak.html?t=<token>): status bertahap, balasan petugas, unduh PDF dan Word. Diperbarui tiap 30 detik. */
const $ = id => document.getElementById(id), el = (t, k, x) => { const e = document.createElement(t); if (k) e.className = k; if (x != null) e.textContent = x; return e; };
const t = new URLSearchParams(location.search).get("t");
// ikon garis sederhana per tahap dan per baris kejadian (pemilik 19 Nov 2026: "kasih icon")
const IK = {terima: "M4 12l5 5L20 6", lihat: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", telaah: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4",
  tindak: "M3 21h18M5 21V10l7-6 7 6v11M10 21v-6h4v6", selesai: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-4 9 3 3 5-6",
  jenis: "M12 3 2 20h20ZM12 10v4M12 17h.01", karakter: "M4 6h16M4 12h10M4 18h7", lokasi: "M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Zm0-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  waktu: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2", lapor: "M4 5h16v11H8l-4 4Z", foto: "M4 7h3l2-2h6l2 2h3v12H4ZM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", pelapor: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0"};
const ik = k => { const v = document.createElementNS("http://www.w3.org/2000/svg", "svg"); v.setAttribute("viewBox", "0 0 24 24"); v.setAttribute("aria-hidden", "true"); const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", IK[k]); v.append(p); return v; };
async function muat() {
  try {
    const r = await fetch(`/api/lapor/lacak?t=${encodeURIComponent(t || "")}`, {signal: AbortSignal.timeout(15000)}), j = await r.json();
    if (!r.ok) throw new Error(j.galat || "Laporan tidak ditemukan.");
    document.title = `Lacak ${j.nomor}, Pantau Bencana BNPB`;
    $("nomor").textContent = j.nomor;
    const GB = {"Banjir": "banjir", "Tanah longsor": "longsor", "Gelombang pasang dan abrasi": "rob", "Cuaca ekstrem": "cuaca", "Kekeringan": "kekeringan", "Kebakaran hutan dan lahan": "karhutla", "Gempa bumi": "gempa", "Tsunami": "tsunami", "Erupsi gunung api": "gunungapi"}[j.jenis];
    if (GB) $("pita").style.setProperty("--foto", `url(/img/bencana-${GB}.jpg)`);
    const kini = [...j.tahap].reverse().find(x => x.selesai); $("statusKini").textContent = kini ? kini.label : "Menunggu";
    if (!$("qr").childElementCount && window.Bagi?.QR) { try { const q = window.Bagi.QR.kanvas(location.href, 4); q.setAttribute("role", "img"); q.setAttribute("aria-label", "Kode QR halaman ini"); $("qr").append(q); } catch {} }
    $("ringkas").textContent = `${j.jenis}${j.subjenis ? `, ${j.subjenis.toLowerCase()}` : ""}. Dilaporkan ${j.waktuLapor}.`;
    $("tahap").replaceChildren(...j.tahap.map((x, i) => {
      const li = el("li", x.selesai ? "selesai" : (i && j.tahap[i - 1].selesai ? "berikut" : "")), titik = el("span", "lk-titik"), isi = el("div");
      titik.append(ik(["terima", "lihat", "telaah", "tindak", "selesai"][i] || "terima"));
      isi.append(el("b", null, x.label), el("small", null, x.selesai ? x.waktu : "Menunggu"));
      if (x.catatan) isi.append(el("p", null, x.catatan));
      li.append(titik, isi); return li;
    }));
    $("kBukti").hidden = !(j.bukti || []).length; // bukti tindak lanjut (K60, D88)
    $("bukti").replaceChildren(...(j.bukti || []).map(b => { const f = el("figure"), a = Object.assign(el("a"), {href: b.url, target: "_blank", rel: "noopener"}), im = el("img"); im.src = b.url; im.alt = "Foto penanganan oleh petugas"; im.loading = "lazy"; a.append(im); f.append(a, el("figcaption", null, b.waktu)); return f; }));
    $("kBalasan").hidden = !j.balasan.length;
    $("balasan").replaceChildren(...j.balasan.map(b => { const d = el("div", "lk-balas"); d.append(el("b", null, "Admin BNPB"), el("p", null, b.teks), el("small", null, b.waktu)); return d; }));
    const rinci = [["Jenis", j.jenis, "jenis"], ["Karakteristik", j.subjenis, "karakter"], ["Lokasi", j.lokasi, "lokasi"], ["Waktu kejadian", j.waktuKejadian, "waktu"], ["Waktu dilaporkan", j.waktuLapor, "lapor"], ["Foto", `${j.foto} foto`, "foto"], ["Pelapor", j.pelapor, "pelapor"]];
    $("rinci").replaceChildren(...rinci.filter(([, v]) => v).map(([k, v, i]) => { const d = el("div", i === "lokasi" ? "lebar" : ""), u = el("span", "lk-rinci-ikon"); u.append(ik(i)); const tx = el("span"); tx.append(el("dt", null, k), el("dd", null, v)); d.append(u, tx); return d; }));
    $("unduhan").replaceChildren(...j.unduhan.map(u => { const a = Object.assign(el("a", "lk-dok"), {href: u.url}); const jenis = /pdf/i.test(u.label) ? "PDF" : "Word";
      a.append(el("span", `lk-dok-ikon ${jenis.toLowerCase()}`, jenis), el("b", null, u.label), el("small", null, "Laporan lengkap dengan foto")); return a; }));
  } catch (e) { $("nomor").textContent = e.message; $("ringkas").textContent = "Periksa lagi tautan yang Anda terima."; }
}
muat(); setInterval(() => { if (!document.hidden) muat(); }, 30000);
