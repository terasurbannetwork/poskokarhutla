/* Email Peringatan Dini: HTML murni (tanpa I/O) supaya bisa diuji tanpa Worker. Standar email pemilik: gaya inline, tata letak
   <table> (tanpa flex/grid), tumpukan huruf Inter/Arial, kalimat biasa (bukan huruf kapital semua), angka id-ID, semua data di-escape.
   Tiap pembangun mengembalikan {subject, html, text}. Data bencana (nama, warna, gambar, tindakan) dari public/ews_tindakan.js. */
import {TINGKAT, HARI, BENCANA, tindakanUntuk} from "../public/ews_tindakan.js";

const FONT = "Inter,Arial,Helvetica,sans-serif", BIRU = "#0f3d5e";
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
export const angka = (n, d = 0) => Number(n).toLocaleString("id-ID", {minimumFractionDigits: d, maximumFractionDigits: d});
/* peluang -> kata, supaya tidak ada ketelitian palsu (galat baku model ~0,1) */
export const kataPeluang = p => p < 0.3 ? "kemungkinan kecil (sekitar 1 dari 5)" : p < 0.45 ? "sekitar 1 dari 3 kemungkinan" : p < 0.65 ? "sekitar 1 dari 2 kemungkinan" : "lebih dari separuh kemungkinan";
const HARI_KATA = ["hari ini", "besok", "lusa"];
const lokasi = w => [w?.kec && `Kec. ${w.kec}`, w?.kab, w?.prov_nama].filter(Boolean).join(", ") || "lokasi Anda";

const pil = t => `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${TINGKAT[t].warna};color:#ffffff;font:700 12px ${FONT};line-height:18px">${esc(TINGKAT[t].nama)}</span>`;
const tombol = (href, teks, warna = BIRU) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 4px"><tr><td style="background:${warna};border-radius:8px"><a href="${esc(href)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font:700 15px ${FONT};text-decoration:none">${esc(teks)}</a></td></tr></table>`;
const daftar = a => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${a.map((x, i) => `<tr><td valign="top" style="width:26px;padding:4px 0;font:700 14px ${FONT};color:${BIRU}">${i + 1}.</td><td style="padding:4px 0;font:14px/1.5 ${FONT};color:#1d2733">${esc(x)}</td></tr>`).join("")}</table>`;
const bungkus = (judulPendek, isi, kaki) => `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(judulPendek)}</title></head>
<body style="margin:0;padding:0;background:#eef2f6"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f6"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;border-collapse:separate;overflow:hidden">
<tr><td style="background:${BIRU};padding:14px 24px;font:700 15px ${FONT};color:#ffffff">Centurisk97 &middot; Peringatan Dini</td></tr>
<tr><td style="padding:22px 24px 8px;font:14px/1.55 ${FONT};color:#1d2733">${isi}</td></tr>
<tr><td style="padding:14px 24px 22px;border-top:1px solid #e3e8ee;font:12px/1.55 ${FONT};color:#5b6773">${kaki}</td></tr>
</table></td></tr></table></body></html>`;

const kakiUmum = (w, alasan, tautanBerhenti) => `${esc(alasan)}<br>Lokasi langganan: ${esc(lokasi(w))}.<br><a href="${esc(tautanBerhenti)}" style="color:${BIRU}">Berhenti berlangganan</a>`;

/* ---------------- konfirmasi ---------------- */
export function emailKonfirmasi({wilayah, bencana, waspada, tautan}) {
  const nama = bencana.map(b => BENCANA[b]?.nama).filter(Boolean);
  const subject = "Konfirmasi langganan Peringatan Dini";
  const html = bungkus(subject, `<h1 style="margin:0 0 10px;font:700 20px/1.3 ${FONT};color:#12202e">Satu langkah lagi</h1>
<p style="margin:0 0 12px">Seseorang (semoga Anda) meminta peringatan dini bencana untuk <b>${esc(lokasi(wilayah))}</b>. Tekan tombol di bawah untuk mulai menerimanya.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e3e8ee;border-radius:8px;border-collapse:separate;margin:8px 0"><tr><td style="padding:12px 14px;font:14px/1.6 ${FONT}">
<b>Bencana yang dipantau:</b> ${esc(nama.join(", "))}<br><b>Tingkat:</b> ${waspada ? "mulai Waspada" : "mulai Siaga"}${bencana.some(b => b === "gempa" || b === "tsunami") ? "; gempa dan tsunami selalu dikirim" : ""}</td></tr></table>
${tombol(tautan, "Ya, kirimi saya peringatan")}
<p style="margin:12px 0 0;color:#5b6773">Tautan berlaku 48 jam. Kalau bukan Anda yang meminta, abaikan email ini dan tidak ada yang terjadi.</p>`,
  "Email ini dikirim karena alamat Anda dipakai di halaman Peringatan Dini Centurisk97.");
  const text = `Konfirmasi langganan Peringatan Dini\n\nLokasi: ${lokasi(wilayah)}\nBencana: ${nama.join(", ")}\n\nKonfirmasi (berlaku 48 jam): ${tautan}\n\nKalau bukan Anda yang meminta, abaikan email ini.`;
  return {subject, html, text};
}

/* ---------------- prakiraan 3 hari ---------------- */
const tertinggi = ps => ps.reduce((a, p) => !a || p.tingkat > a.tingkat || (p.tingkat === a.tingkat && p.hari < a.hari) ? p : a, null);

export function emailPeringatan({asal, lat, lon, wilayah, peringatan, simulasi, tautanBerhenti}) {
  const top = tertinggi(peringatan), B = BENCANA[top.bencana], w = lokasi(wilayah);
  const kepala = `${TINGKAT[top.tingkat].nama} ${B.pendek.toLowerCase()} ${HARI_KATA[top.hari]} di ${w.split(", ").slice(0, 2).join(", ")}`;
  const subject = kepala[0].toUpperCase() + kepala.slice(1);
  const urut = [...new Set(peringatan.map(p => p.bencana))].map(b => ({b, t: Math.max(...peringatan.filter(p => p.bencana === b).map(p => p.tingkat))})).sort((a, b) => b.t - a.t);
  const sel = (b, h) => { const t = Math.max(0, ...peringatan.filter(p => p.bencana === b && p.hari === h).map(p => p.tingkat)); return t ? pil(t) : `<span style="color:#9aa5b1">&ndash;</span>`; };
  const baris = urut.map(({b}) => `<tr><td style="padding:9px 10px;border-top:1px solid #e3e8ee;font:700 13px ${FONT}">${esc(BENCANA[b].pendek)}</td>${[0, 1, 2].map(h => `<td align="center" style="padding:9px 6px;border-top:1px solid #e3e8ee">${sel(b, h)}</td>`).join("")}</tr>`).join("");
  const rincian = peringatan.filter(p => p.rincian && p.sumber_jenis !== "simulasi").filter((p, i, a) => a.findIndex(q => q.bencana === p.bencana && q.rincian === p.rincian) === i)
    .map(p => `<li style="margin:3px 0">${esc(p.rincian)}</li>`).join("");
  const blok = urut.map(({b, t}, i) => `<p style="margin:${i ? 16 : 6}px 0 4px;font:700 14px ${FONT};color:#12202e">${esc(BENCANA[b].nama)} ${pil(t)}</p>${daftar(tindakanUntuk(b, t))}`).join("");
  /* karhutla yang tingkatnya dibawa simulasi: blok sorot jarak, cakrawala, peluang + tombol ke /sim/<kompleks> */
  const sim = peringatan.filter(p => p.sumber_jenis === "simulasi" && p.kompleks).sort((a, b) => b.tingkat - a.tingkat || a.jam_sisa - b.jam_sisa);
  const cakupan = Number.isFinite(simulasi?.n_aktif) && Number.isFinite(simulasi?.n_diramal) ? ` Simulasi hanya mencakup ${angka(simulasi.n_diramal)} dari ${angka(simulasi.n_aktif)} cluster aktif hari ini; tidak ada peringatan simulasi bukan berarti aman.` : "";
  const catatSim = `Ini perkiraan model, bukan pengamatan. Model paling lemah untuk kebakaran gambut dan cluster besar.${cakupan}`;
  const blokSim = sim.length ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:16px 0 0;background:#fff4e8;border-left:4px solid ${TINGKAT[sim[0].tingkat].warna};border-collapse:separate"><tr><td style="padding:12px 14px;font:14px/1.55 ${FONT};color:#1d2733">
<b style="font:700 15px ${FONT};color:#12202e">Simulasi penjalaran api</b>${sim.map(p => `<br>${esc(p.kalimat || p.rincian)}`).join("")}
<br><span style="font:12px/1.5 ${FONT};color:#5b6773">${esc(catatSim)}</span>
${tombol(`${asal}/sim/${encodeURIComponent(sim[0].kompleks)}`, "Lihat simulasi", "#e2711d")}</td></tr></table>` : "";
  const peta = `${asal}/peringatan?lat=${lat}&lon=${lon}`;
  const html = bungkus(subject, `<img src="${esc(asal)}/img/${esc(B.gambar)}" width="552" alt="${esc(B.nama)}" style="display:block;width:100%;max-width:552px;height:auto;border-radius:8px;margin:0 0 16px">
<p style="margin:0 0 6px">${pil(top.tingkat)}</p>
<h1 style="margin:0 0 8px;font:700 21px/1.3 ${FONT};color:#12202e">${esc(subject)}</h1>
<p style="margin:0 0 14px;color:#34414e">${esc(TINGKAT[top.tingkat].arti)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e3e8ee;border-radius:8px;border-collapse:separate;overflow:hidden"><tr style="background:#f4f7fa"><td style="padding:9px 10px;font:700 12px ${FONT};color:#5b6773">Bencana</td>${HARI.map(h => `<td align="center" style="padding:9px 6px;font:700 12px ${FONT};color:#5b6773">${esc(h)}</td>`).join("")}</tr>${baris}</table>
${rincian ? `<ul style="margin:14px 0 0;padding-left:18px;color:#34414e">${rincian}</ul>` : ""}
${blokSim}<h2 style="margin:22px 0 4px;font:700 17px ${FONT};color:#12202e">Yang perlu Anda lakukan</h2>${blok}
${tombol(peta, "Lihat peta")}
<p style="margin:12px 0 0;color:#5b6773">Sumber: ${esc([...new Set(urut.map(x => BENCANA[x.b].sumber)), ...(sim.length ? [sim[0].sumber || "Simulasi penjalaran api Centurisk97"] : [])].join("; "))}. Prakiraan, bukan kepastian. Ikuti arahan BPBD/BMKG setempat.</p>`,
  kakiUmum(wilayah, "Anda menerima email ini karena berlangganan Peringatan Dini untuk lokasi di atas dan lokasi itu sedang diprakirakan berisiko.", tautanBerhenti));
  const text = `${subject}\n\n` + peringatan.map(p => `- ${HARI[p.hari]}: ${BENCANA[p.bencana].nama}, ${TINGKAT[p.tingkat].nama}`).join("\n") + "\n\nYang perlu Anda lakukan:\n" +
    urut.map(({b, t}) => `${BENCANA[b].nama}\n` + tindakanUntuk(b, t).map((x, i) => `${i + 1}. ${x}`).join("\n")).join("\n\n") +
    `${sim.length ? "\n\nSimulasi: " + sim.map(p => p.kalimat || p.rincian).join(" ") + ` ${catatSim} Lihat simulasi: ${asal}/sim/${encodeURIComponent(sim[0].kompleks)}` : ""}\n\nPeta: ${peta}\nPrakiraan, bukan kepastian. Ikuti arahan BPBD/BMKG setempat.\nBerhenti berlangganan: ${tautanBerhenti}`;
  return {subject, html, text};
}

/* ---------------- gempa & tsunami (waktu nyata) ----------------
   g = {mag, dalam (teks BMKG, mis. "10 km"), wilayah (teks BMKG), potensi, dirasakan, waktu (teks), jarak (km)}; tingkat 2/3; tsunami = true bila berpotensi */
export function emailGempa({asal, lat, lon, wilayah, g, tingkat, tsunami, tautanBerhenti}) {
  const b = tsunami ? "tsunami" : "gempa", B = BENCANA[b], mag = angka(g.mag, 1), jarak = angka(Math.round(g.jarak));
  const subject = tsunami ? `Gempa M${mag} berpotensi tsunami, ${jarak} km dari Anda` : `Gempa M${mag} terasa di sekitar Anda (${jarak} km)`;
  const baris = [["Magnitudo", `M${mag}`], ["Kedalaman", g.dalam], ["Jarak dari lokasi Anda", `${jarak} km`], ["Pusat gempa", g.wilayah], ["Waktu", g.waktu], ["Potensi", g.potensi], ["Dirasakan", g.dirasakan]]
    .filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:8px 10px;border-top:1px solid #e3e8ee;font:700 13px ${FONT};width:38%;color:#5b6773">${esc(k)}</td><td style="padding:8px 10px;border-top:1px solid #e3e8ee;font:14px ${FONT}">${esc(v)}</td></tr>`).join("");
  const aksi = tindakanUntuk(b, tingkat);
  const html = bungkus(subject, `${tsunami ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 14px"><tr><td style="background:#c62828;border-radius:8px;padding:14px 16px;font:700 18px/1.3 ${FONT};color:#ffffff">Segera menjauhi pantai</td></tr></table>` : ""}
<img src="${esc(asal)}/img/${esc(B.gambar)}" width="552" alt="${esc(B.nama)}" style="display:block;width:100%;max-width:552px;height:auto;border-radius:8px;margin:0 0 16px">
<p style="margin:0 0 6px">${pil(tingkat)}</p>
<h1 style="margin:0 0 12px;font:700 21px/1.3 ${FONT};color:#12202e">${esc(subject)}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e3e8ee;border-radius:8px;border-collapse:separate;overflow:hidden">${baris}</table>
<h2 style="margin:22px 0 4px;font:700 17px ${FONT};color:#12202e">Yang perlu Anda lakukan</h2>${daftar(aksi)}
${tombol(`${asal}/peringatan?lat=${lat}&lon=${lon}`, "Lihat peta")}
<p style="margin:12px 0 0;color:#5b6773">Sumber: ${esc(B.sumber)}. Ikuti arahan BPBD/BMKG setempat.</p>`,
  kakiUmum(wilayah, "Anda menerima email ini karena berlangganan Peringatan Dini dan gempa ini terjadi dekat lokasi langganan Anda.", tautanBerhenti));
  const text = `${subject}\n${tsunami ? "Segera menjauhi pantai\n" : ""}\nM${mag}, ${g.dalam || ""}, ${jarak} km dari Anda\n${g.wilayah || ""}\n\n` + aksi.map((x, i) => `${i + 1}. ${x}`).join("\n") + `\n\nBerhenti berlangganan: ${tautanBerhenti}`;
  return {subject, html, text};
}
