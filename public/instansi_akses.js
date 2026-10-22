/* Kartu akses ke lokasi api: satu penggambar untuk /lacak (penerima tugas) dan /instansi (akun daerah), dari kunci `akses` di tugas_api (salinan tugas_kompleks.json):
   {jalan:{lat,lon,kelas,km_garis_lurus}|null, kaki_km, jam_tiba, dari:{dari,jenis,km_jalan,jam}|null, jalan_kaki_jam, bawa:[{barang,jumlah,satuan,status}]|null}.
   Semua angka PERKIRAAN. Jalan utama (aspal) terdekat BUKAN jalan menuju titik api: data jalan desa dan kebun tidak ada di peta situs, jadi angkanya tidak boleh
   dibandingkan dengan jalan kaki. Teks data lewat esc() (CSP: tanpa skrip dan gaya inline). */
(() => {
  "use strict";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const ang = (n, d = 1) => Number(n).toLocaleString("id-ID", {maximumFractionDigits: d});
  const ok = n => typeof n === "number" && Number.isFinite(n) && n >= 0;
  const JENIS = {posko: "posko", daops: "daerah operasi", bpbd: "BPBD", manggala_agni: "Manggala Agni", pos_pantau: "pos pantau", gudang: "gudang"};
  /* jam desimal -> "1 jam 24 menit" (perkiraan, dibulatkan ke 5 menit) */
  const jam = h => { if (!ok(h)) return null; const m = Math.max(5, Math.round(h * 12) * 5), j = Math.floor(m / 60), s = m % 60; return j ? `${j} jam${s ? ` ${s} menit` : ""}` : `${s} menit`; };
  function html(a) {
    if (!a || typeof a !== "object") return "";
    const baris = [], d = a.dari && typeof a.dari === "object" ? a.dari : null, j = a.jalan && typeof a.jalan === "object" ? a.jalan : null;
    if (d && typeof d.dari === "string") baris.push(`<div class="ak-baris"><span class="ak-k">Pangkalan asal tercepat</span><b>${esc(d.dari)}</b>${d.jenis ? ` <span class="ak-jenis">${esc(JENIS[d.jenis] || String(d.jenis).replace(/_/g, " "))}</span>` : ""}
      <p>${ok(d.km_jalan) ? `Sekitar ${ang(d.km_jalan)} km lewat jalan` : "Jarak jalan belum ada"}${jam(d.jam) ? `, perkiraan ${jam(d.jam)}` : ""}.</p></div>`);
    if (a.jam_tiba != null && a.jam_tiba !== "") baris.push(`<div class="ak-baris"><span class="ak-k">Perkiraan tiba di lokasi</span><b>${ok(a.jam_tiba) ? esc(jam(a.jam_tiba)) : esc(a.jam_tiba)}</b><p>Dari pangkalan asal sampai titik api, termasuk jalan kaki. Perkiraan, bukan jadwal.</p></div>`);
    if (ok(a.kaki_km)) baris.push(`<div class="ak-baris"><span class="ak-k">Jalan kaki, batas bawah</span><b>paling sedikit ${ang(a.kaki_km)} km${jam(a.jalan_kaki_jam) ? `, sekitar ${jam(a.jalan_kaki_jam)}` : ""}</b>
      <p>Batas bawah dari peta jalan dan sungai kami. Medan rawa, gambut, dan semak bisa membuat jalan kaki jauh lebih lama.</p></div>`);
    if (j && ok(j.km_garis_lurus)) baris.push(`<div class="ak-baris ak-jalan"><span class="ak-k">Jalan utama (aspal) terdekat</span><b>${ang(j.km_garis_lurus)} km garis lurus dari titik api</b>${j.kelas ? ` <span class="ak-jenis">${esc(String(j.kelas).replace(/_/g, " "))}</span>` : ""}
      <p>Ini jalan utama beraspal, bukan jalan menuju titik api: jalan desa dan kebun tidak ada di peta kami. Jangan bandingkan angka ini dengan jalan kaki di atas.</p></div>`);
    const bawa = Array.isArray(a.bawa) ? a.bawa.filter(b => b && typeof b.barang === "string") : [];
    if (bawa.length) baris.push(`<div class="ak-baris"><span class="ak-k">Barang yang dipikul</span><ul class="ak-bawa">${bawa.map(b => `<li>${esc(b.barang)}${ok(b.jumlah) ? `, ${esc(ang(b.jumlah))}${b.satuan ? " " + esc(b.satuan) : ""}` : ""}${b.status ? ` <span class="ak-jenis">${esc(String(b.status).replace(/_/g, " "))}</span>` : ""}</li>`).join("")}</ul></div>`);
    return baris.length ? `<section class="ak-kartu" aria-label="Akses ke lokasi"><h2>Akses ke lokasi</h2><span class="ak-pil">Perkiraan, belum divalidasi lapangan</span>${baris.join("")}</section>` : "";
  }
  window.AksesKartu = {html, jam};
})();
