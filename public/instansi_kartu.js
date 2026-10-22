/* Kartu Api: satu layar ponsel yang menjawab di mana, sebesar apa, situasi, dan kebutuhan. SATU modul untuk /instansi dan /admin/instansi (docs/bnpb/RANCANGAN-API-PADAM.md prinsip 2 dan 3).
   Masukan: t = tugas (rekomendasi, akses), kartu = kunci `kartu` dari GET /api/instansi/tugas/:id (kontrak bagian 7; kunci yang belum ada dilewati, kartu null = tampilkan yang ada).
   KartuApi.html(t, kartu), KartuApi.teks(t, kartu) (teks WhatsApp, fungsi murni), KartuApi.pasang(wadah, t, kartu). Tanpa ketergantungan global (bisa diuji di Node).
   Luas yang tampil SELALU luas terkoreksi dengan rentang; luas mentah piksel tidak pernah dicetak. Semua angka perkiraan, dibulatkan 2 angka bermakna.
   CSP: tanpa skrip dan gaya inline; teks data lewat esc(). INP: ketukan hanya menyalin atau membuka tautan, tidak menggambar ulang. */
(() => {
  "use strict";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const num = v => typeof v === "number" && Number.isFinite(v);
  const obj = v => v && typeof v === "object" && !Array.isArray(v) ? v : null;
  /* dua angka bermakna: 1234 -> 1.200, 12,3 -> 12, 0,456 -> 0,46 (tanpa presisi palsu) */
  const bulat = x => { if (!x) return 0; const d = Math.floor(Math.log10(Math.abs(x))), p = 10 ** (d - 1); return Math.round(x / p) * p; };
  const ang = (x, d = 0) => Number(x).toLocaleString("id-ID", {maximumFractionDigits: d});
  const a2 = x => ang(bulat(x), bulat(x) < 10 ? 1 : 0);
  /* "sekitar 12 ha, rentang 8 sampai 20 ha" */
  function rentang(o, satuan) {
    if (!obj(o) || !num(o.ha) && !num(o.min) && !num(o.maks)) return null;
    const t = num(o.ha) ? o.ha : (o.min + o.maks) / 2, ada = num(o.min) && num(o.maks) && o.maks > o.min;
    return {tengah: `${a2(t)} ${satuan}`, rentang: ada ? `${a2(o.min)} sampai ${a2(o.maks)} ${satuan}` : null};
  }
  function tiga(v, satuan) {   // angka tunggal atau [rendah, tengah, tinggi]
    if (num(v)) return `${a2(v)} ${satuan}`;
    if (Array.isArray(v) && v.length && v.every(num)) return v.length === 3 ? `${a2(v[1])} ${satuan} (rentang ${a2(v[0])} sampai ${a2(v[2])})` : `${v.map(a2).join(" sampai ")} ${satuan}`;
    return null;
  }
  const derajat = (x, plus, minus) => `${ang(Math.abs(x), 3)}° ${x >= 0 ? plus : minus}`;
  const koor = (lat, lon) => num(lat) && num(lon) ? `${derajat(lat, "LU", "LS")}, ${derajat(lon, "BT", "BB")}` : null;
  const waktu = w => { const ms = typeof w === "number" ? (w < 1e12 ? w * 1000 : w) : Date.parse(w); return Number.isFinite(ms) ? new Date(ms).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB" : null; };
  const navUrl = (lat, lon) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
  const JENIS = {jalan: "jalan", sungai: "sungai", kanal: "kanal", jalan_utama: "jalan utama", jalan_desa: "jalan desa"};
  const TREN = {tumbuh: "tumbuh", stabil: "stabil", menyusut: "menyusut"};
  const kata = s => String(s).replace(/_/g, " ");

  /* Susun isi kartu sebagai data netral; html() dan teks() sama-sama membacanya, jadi isi keduanya tak bisa berbeda. */
  function susun(t, kartu) {
    const k = obj(kartu) || {}, rek = obj(t?.rekomendasi) || {}, keb = obj(rek.kebutuhan) || {}, tot = obj(keb.total) || {};
    const fr = obj(k.front), ms = obj(k.masuk), radius = num(k.radius_m) ? k.radius_m : num(fr?.radius_m) ? fr.radius_m : null;
    const titik = fr && num(fr.lat) && num(fr.lon) ? fr : num(t?.lat) && num(t?.lon) ? {lat: t.lat, lon: t.lon} : null;
    const tujuan = ms && num(ms.lat) && num(ms.lon) ? ms : titik;
    const di = {
      front: titik && koor(titik.lat, titik.lon), radius: radius != null ? `${ang(bulat(radius))} m` : null, sensor: fr?.sensor ? String(fr.sensor) : null, waktu: fr?.waktu != null ? waktu(fr.waktu) : null,
      masuk: ms && num(ms.lat) ? `${num(ms.jarak_km) ? `${a2(ms.jarak_km)} km dari front` : "jarak belum diketahui"}${ms.jenis ? `, ${JENIS[ms.jenis] || kata(ms.jenis)}` : ""}` : null,
      nav: tujuan ? navUrl(tujuan.lat, tujuan.lon) : null, navKe: tujuan === ms ? "titik masuk" : "titik api"};
    const lk = obj(k.luas_koreksi), la = obj(k.luas_aktif), luas = rentang(lk, "ha") || rentang(la, "ha");
    const tr = obj(k.tren), arah = tr && TREN[tr.arah];
    const se = {luas, luasDasar: luas ? (rentang(lk, "ha") ? (lk.dasar ? String(lk.dasar) : "terkoreksi dari piksel satelit") : "piksel satelit 12 jam terakhir, belum dikoreksi lapangan") : null,
      tren: tr && (num(tr.n24) || arah) ? `${num(tr.n24) ? `${ang(tr.n24)} titik panas 24 jam` : ""}${num(tr.n24_kemarin) ? `, kemarin ${ang(tr.n24_kemarin)}` : ""}${arah ? `, ${arah}` : ""}`.replace(/^, /, "") : null};
    const kons = (Array.isArray(k.konsesi) ? k.konsesi : []).filter(x => obj(x) && (x.nama || x.pemegang)).slice(0, 3).map(x => `${x.jenis ? kata(x.jenis) + " " : ""}${x.nama || ""}${x.pemegang ? ` (pemegang ${x.pemegang})` : ""}`.trim());
    const lahan = typeof (rek.jenis ?? rek.lahan) === "string" ? kata(rek.jenis ?? rek.lahan) : null, cu = rek.fwi ?? rek.cuaca?.fwi;
    const sit = {lahan, kons, cuaca: num(cu) ? `FWI ${a2(cu)}` : typeof rek.cuaca === "string" ? rek.cuaca : typeof rek.cuaca?.teks === "string" ? rek.cuaca.teks : null,
      syarat: (Array.isArray(k.syarat) ? k.syarat : []).filter(x => typeof x === "string").map(kata)};
    const pompa = Array.isArray(tot.pompa) ? tot.pompa.filter(p => obj(p) && num(p.unit)).map(p => `${ang(bulat(p.unit))} pompa${num(p.hp) ? ` ${ang(p.hp)} HP` : ""}`).join(", ") : null;
    const heli = tiga(tot.heli, "heli"), hari = num(keb.target_hari) ? `${ang(keb.target_hari)} hari` : null;
    const kb = [["Regu", tiga(tot.regu, "regu")], ["Personel", tiga(tot.personel, "orang")], ["Pompa", pompa || null], ["Air", tiga(tot.air_l_hari, "liter per hari")], ["Selang", tiga(tot.selang_m, "m")],
      ["Helikopter", heli], ["Durasi", hari ? `target ${hari}` : null]].filter(x => x[1]);
    return {id: k.insiden || null, di, se, sit, kb, ada: !!(titik || luas || kons.length || kb.length)};
  }

  /* teks ringkas siap kirim WhatsApp; tanpa tanda pemisah titik tengah */
  function teks(t, kartu) {
    const s = susun(t, kartu), b = [`*KARTU API${s.id ? " " + s.id : ""}*`];
    if (s.di.front) b.push(`*Di mana:* ${s.di.front}${s.di.radius ? `, radius sekitar ${s.di.radius}` : ""}${s.di.sensor ? `, ${s.di.sensor}` : ""}${s.di.waktu ? `, ${s.di.waktu}` : ""}.`);
    if (s.di.masuk) b.push(`Titik masuk: ${s.di.masuk}.`);
    if (s.di.nav) b.push(`Navigasi ke ${s.di.navKe}: ${s.di.nav}`);
    if (s.se.luas) b.push(`*Sebesar apa:* sekitar ${s.se.luas.tengah}${s.se.luas.rentang ? `, rentang ${s.se.luas.rentang}` : ""}${s.se.tren ? `. ${s.se.tren[0].toUpperCase() + s.se.tren.slice(1)}` : ""}.`);
    else if (s.se.tren) b.push(`*Sebesar apa:* luas belum tersedia. ${s.se.tren[0].toUpperCase() + s.se.tren.slice(1)}.`);
    const sit = [s.sit.lahan && `lahan ${s.sit.lahan}`, ...s.sit.kons.map(x => `konsesi ${x}`), s.sit.cuaca].filter(Boolean);
    if (sit.length) b.push(`*Situasi:* ${sit.join(", ")}.`);
    if (s.kb.length) b.push(`*Kebutuhan (perkiraan):* ${s.kb.map(([n, v]) => `${n.toLowerCase()} ${v}`).join(", ")}.`);
    b.push("Perkiraan dari satelit, belum divalidasi lapangan. Sumber: Pantau Bencana.");
    return b.join("\n");
  }

  const pil = (txt, warna = "") => `<span class="kp-pil ${warna}">${esc(txt)}</span>`;
  const baris = (nama, isi) => isi ? `<p class="kp-baris"><span class="kp-k">${esc(nama)}</span> ${isi}</p>` : "";
  function html(t, kartu) {
    const s = susun(t, kartu); if (!s.ada && !s.id) return "";
    const di = s.di, se = s.se, sit = s.sit;
    const sitIsi = [sit.lahan && baris("Lahan", esc(sit.lahan)), ...sit.kons.map(x => baris("Konsesi", esc(x))), baris("Cuaca", sit.cuaca && esc(sit.cuaca)),
      sit.syarat.length ? baris("Alasan prioritas", esc(sit.syarat.join(", "))) : ""].filter(Boolean).join("");
    return `<section class="kp-kartu" aria-label="Kartu Api"><div class="kp-kepala"><h2>Kartu Api</h2>${s.id ? `<span class="kp-id">${esc(s.id)}</span>` : ""}${pil("Perkiraan", "emas")}</div>
      <div class="kp-bag"><h3>Di mana</h3>${di.front ? `<p class="kp-utama">${esc(di.front)}</p>` : `<p class="kp-redup">Koordinat front belum tersedia.</p>`}
        ${baris("Ketidakpastian", di.radius && `radius sekitar ${esc(di.radius)}${di.sensor ? `, sensor ${esc(di.sensor)}` : ""}${di.waktu ? `, ${esc(di.waktu)}` : ""}`)}${baris("Titik masuk", di.masuk && esc(di.masuk))}
        ${di.nav ? `<a class="kp-tombol utama kp-nav" href="${esc(di.nav)}" target="_blank" rel="noopener noreferrer">Navigasi ke ${esc(di.navKe)}</a>` : ""}</div>
      <div class="kp-bag"><h3>Sebesar apa</h3>${se.luas ? `<p class="kp-utama">Sekitar ${esc(se.luas.tengah)}</p>${baris("Rentang", se.luas.rentang && esc(se.luas.rentang))}${baris("Dasar", esc(se.luasDasar))}` : `<p class="kp-redup">Luas terkoreksi belum tersedia. Luas mentah piksel tidak ditampilkan karena jauh lebih besar dari luas terbakar sebenarnya.</p>`}
        ${baris("Tren 24 jam", se.tren && esc(se.tren))}</div>
      <div class="kp-bag"><h3>Situasi</h3>${sitIsi || `<p class="kp-redup">Belum ada data lahan atau konsesi.</p>`}</div>
      <div class="kp-bag"><h3>Kebutuhan ${pil("Perkiraan", "emas")}</h3>${s.kb.length ? s.kb.map(([n, v]) => baris(n, esc(v))).join("") : `<p class="kp-redup">Belum ada hitungan kebutuhan.</p>`}</div>
      <p class="kp-sumber">Sumber: deteksi satelit (VIIRS, MODIS, Himawari) dan hitungan Pantau Bencana. Belum divalidasi lapangan.</p>
      <div class="kp-aksi"><button type="button" class="kp-tombol" data-kp="salin">Salin teks WhatsApp</button><a class="kp-tombol" data-kp="wa" href="https://wa.me/?text=${encodeURIComponent(teks(t, kartu))}" target="_blank" rel="noopener noreferrer">Buka WhatsApp</a><button type="button" class="kp-tombol" data-kp="cetak">Cetak</button></div>
      <p class="kp-pesan" role="status" aria-live="polite"></p></section>`;
  }

  /* menaruh kartu ke wadah dan memasang tombolnya (sekali per wadah) */
  function pasang(wadah, t, kartu) {
    if (!wadah) return; wadah.innerHTML = html(t, kartu); if (!wadah.firstChild) return;
    const pesan = m => { const p = wadah.querySelector(".kp-pesan"); if (p) p.textContent = m; };
    wadah.querySelector('[data-kp="salin"]')?.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(teks(t, kartu)); pesan("Teks disalin. Tempel di WhatsApp."); } catch (e) { pesan("Tidak bisa menyalin otomatis. Pakai tombol Buka WhatsApp."); }
    });
    wadah.querySelector('[data-kp="cetak"]')?.addEventListener("click", () => {
      document.body.classList.add("kp-cetak"); wadah.classList.add("kp-cetak-ini");
      const bersih = () => { document.body.classList.remove("kp-cetak"); wadah.classList.remove("kp-cetak-ini"); window.removeEventListener("afterprint", bersih); };
      window.addEventListener("afterprint", bersih); window.print();
    });
  }
  window.KartuApi = {html, teks, pasang, susun};
})();
