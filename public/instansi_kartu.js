/* Kartu Api: satu layar ponsel yang menjawab di mana, sebesar apa, situasi, dan kebutuhan. SATU modul untuk /instansi dan /admin/instansi (docs/bnpb/RANCANGAN-API-PADAM.md prinsip 2 dan 3).
   Masukan: t = tugas (rekomendasi, akses), kartu = kunci `kartu` dari GET /api/instansi/tugas/:id (kontrak bagian 7; kunci yang belum ada dilewati, kartu null = tampilkan yang ada).
   KartuApi.html(t, kartu), KartuApi.teks(t, kartu) (teks WhatsApp, fungsi murni), KartuApi.pasang(wadah, t, kartu). Tanpa ketergantungan global (bisa diuji di Node).
   Luas terbakar = luas_koreksi saja (kisaran antartahun); luas_aktif tampil terpisah sebagai Front aktif, tidak pernah sebagai luas terbakar. Semua angka perkiraan, dibulatkan 2 angka bermakna.
   CSP: tanpa skrip dan gaya inline; teks data lewat esc(). INP: ketukan hanya menyalin atau membuka tautan, tidak menggambar ulang. */
(() => {
  "use strict";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const num = v => typeof v === "number" && Number.isFinite(v);
  const obj = v => v && typeof v === "object" && !Array.isArray(v) ? v : null;
  /* dua angka bermakna: 1234 -> 1.200, 12,3 -> 12, 5,55 -> 5,6, 0,456 -> 0,46 (desimal = 1 - eksponen angka, tanpa presisi palsu) */
  const bulat = x => { if (!x) return 0; const d = Math.floor(Math.log10(Math.abs(x))), p = 10 ** (d - 1); return Math.round(x / p) * p; };
  const ang = (x, d = 0) => Number(x).toLocaleString("id-ID", {maximumFractionDigits: d});
  const a2 = x => { const b = bulat(x); return ang(b, b ? Math.max(0, 1 - Math.floor(Math.log10(Math.abs(b)))) : 0); };
  /* "sekitar 12 ha, rentang 8 sampai 20 ha" */
  function rentang(o, satuan) {
    if (!obj(o) || !num(o.ha) && !num(o.min) && !num(o.maks)) return null;
    const t = num(o.ha) ? o.ha : (o.min + o.maks) / 2, ada = num(o.min) && num(o.maks) && o.maks > o.min;
    return {tengah: `${a2(t)} ${satuan}`, rentang: ada ? `${a2(o.min)} sampai ${a2(o.maks)} ${satuan}` : null};
  }
  function tiga(v, satuan) {   // angka tunggal atau [rendah, tengah, tinggi]; satuan kosong = nama kolomnya sudah satuan
    const sat = satuan ? " " + satuan : "";
    if (num(v)) return `${a2(v)}${sat}`;
    if (Array.isArray(v) && v.length && v.every(num)) return v.length === 3 ? `${a2(v[1])}${sat} (rentang ${a2(v[0])} sampai ${a2(v[2])})` : `${v.map(a2).join(" sampai ")}${sat}`;
    return null;
  }
  const derajat = (x, plus, minus) => `${ang(Math.abs(x), 3)}° ${x >= 0 ? plus : minus}`;
  const koor = (lat, lon) => num(lat) && num(lon) ? `${derajat(lat, "LU", "LS")}, ${derajat(lon, "BT", "BB")}` : null;
  const waktu = w => { const ms = typeof w === "number" ? (w < 1e12 ? w * 1000 : w) : Date.parse(w); return Number.isFinite(ms) ? new Date(ms).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB" : null; };
  const navUrl = (lat, lon) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving`;
  const JENIS = {jalan: "jalan", sungai: "sungai", kanal: "kanal", jalan_utama: "jalan utama", jalan_desa: "jalan desa"};
  const TREN = {tumbuh: "tumbuh", stabil: "stabil", menyusut: "menyusut", sedikit: "titik panas sedikit, tren belum terbaca"};
  const KONS = {hti: "HTI", hph: "HPH", hgu: "HGU", hpt: "HPT", ipk: "IPK", sawit: "perkebunan sawit", tambang: "pertambangan"}, SUMBER = "Sumber: deteksi satelit (VIIRS, MODIS, Himawari) dan hitungan Pantau Bencana. Belum divalidasi lapangan.";
  const DASAR_LUAS = "kisaran antartahun, perkiraan dari titik panas, bukan pengukuran", DASAR_AKTIF = "piksel satelit aktif 12 jam terakhir";
  const kata = s => String(s).replace(/_/g, " ");

  /* Pola lokasi dari riwayat VIIRS (kartu.watak): tiap baris hanya muncul bila angkanya ada; tanpa presisi palsu (tahun dan hari apa adanya, jarak 2 angka bermakna). */
  const tglPendek = v => { const d = typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T00:00:00Z") : null; return d && Number.isFinite(+d) ? d.toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "UTC"}) : null; };
  function watak(w) {
    w = obj(w); if (!w) return {baris: [], kambuh: false};
    const b = [], int = v => num(v) && Number.isInteger(v) && v >= 0, lamaHari = int(w.md) ? `Biasanya ${ang(w.md)} hari` : null;
    if (int(w.a) && int(w.n) && w.n > 0 && w.a <= w.n) b.push(`${w.lg ? "Lokasi langganan: terbakar" : "Terbakar"} ${ang(w.a)} dari ${ang(w.n)} tahun`);
    const sisa = int(w.sisa) ? (w.sisa ? `perkiraan sisa ${ang(w.sisa)} hari` : "perkiraan mendekati akhir") : null;
    if (lamaHari || sisa) b.push([lamaHari, sisa].filter(Boolean).join("; "));
    if (tglPendek(w.akhir)) b.push(`Musim di sini biasanya selesai ${tglPendek(w.akhir)}`);
    if (num(w.x) && w.x > 0) b.push(`Api di sini biasa meluas sekitar ${a2(w.x)} km`);
    const kambuh = num(w.k) && w.k >= 2;
    if (kambuh) b.push("Sering kambuh: jangan tinggalkan lokasi, lanjutkan mop-up dan patroli 14 hari setelah padam");
    return {baris: b, kambuh};
  }

  /* Susun isi kartu sebagai data netral; html() dan teks() sama-sama membacanya, jadi isi keduanya tak bisa berbeda. */
  function susun(t, kartu) {
    const k = obj(kartu) || {}, rek = obj(t?.rekomendasi) || {}, keb = obj(rek.kebutuhan) || {}, tot = obj(keb.total) || {};
    const fr = obj(k.front), ms = obj(k.masuk), radius = num(k.radius_m) ? k.radius_m : num(fr?.radius_m) ? fr.radius_m : null;
    const titik = fr && num(fr.lat) && num(fr.lon) ? fr : num(t?.lat) && num(t?.lon) ? {lat: t.lat, lon: t.lon} : null;
    const tujuan = ms && num(ms.lat) && num(ms.lon) ? ms : titik;
    const di = {
      front: titik && koor(titik.lat, titik.lon), radius: radius != null ? `ukuran piksel sekitar ${ang(bulat(radius))} m, posisi bisa meleset lebih jauh` : null, sensor: fr?.sensor ? String(fr.sensor) : null, waktu: fr?.waktu != null ? waktu(fr.waktu) : null,
      masuk: ms && num(ms.lat) ? `${num(ms.jarak_km) ? `${a2(ms.jarak_km)} km dari front` : "jarak belum diketahui"}${ms.jenis ? `, ${Object.hasOwn(JENIS, ms.jenis) ? JENIS[ms.jenis] : kata(ms.jenis)}` : ""}` : null,
      nav: tujuan ? navUrl(tujuan.lat, tujuan.lon) : null, navKe: tujuan === ms ? "titik masuk" : "titik api"};
    const lk = obj(k.luas_koreksi), la = obj(k.luas_aktif), luas = rentang(lk, "ha"), aktif = rentang(la, "ha");
    const tr = obj(k.tren), arah = tr && Object.hasOwn(TREN, tr.arah) ? TREN[tr.arah] : null;
    const se = {luas, luasDasar: luas ? DASAR_LUAS + (lk.dasar ? `, dasar ${String(lk.dasar)}` : "") : null, aktif: aktif && aktif.tengah + (aktif.rentang ? `, rentang ${aktif.rentang}` : ""),
      tren: tr && arah && tr.arah === "sedikit" ? arah : tr && (num(tr.n24) || arah) ? `${num(tr.n24) ? `${ang(tr.n24)} titik panas 24 jam` : ""}${num(tr.n24_kemarin) ? `, kemarin ${ang(tr.n24_kemarin)}` : ""}${arah ? `, ${arah}` : ""}`.replace(/^, /, "") : null};
    const kons = (Array.isArray(k.konsesi) ? k.konsesi : []).filter(x => obj(x) && (x.nama || x.pemegang)).slice(0, 3).map(x => `${x.jenis ? (Object.hasOwn(KONS, String(x.jenis).toLowerCase()) ? KONS[String(x.jenis).toLowerCase()] : kata(x.jenis)) + " " : ""}${x.nama || ""}${x.pemegang ? ` (pemegang ${x.pemegang})` : ""}`.trim());
    const lahan = typeof (rek.jenis ?? rek.lahan) === "string" ? kata(rek.jenis ?? rek.lahan) : null, cu = rek.fwi ?? rek.cuaca?.fwi;
    const sit = {lahan, kons, cuaca: num(cu) ? `FWI ${a2(cu)}` : typeof rek.cuaca === "string" ? rek.cuaca : typeof rek.cuaca?.teks === "string" ? rek.cuaca.teks : null,
      syarat: (Array.isArray(k.syarat) ? k.syarat : []).filter(x => typeof x === "string").map(kata)};
    const pompa = Array.isArray(tot.pompa) ? tot.pompa.filter(p => obj(p) && num(p.unit)).map(p => `${ang(bulat(p.unit))} unit${num(p.hp) ? `, ${ang(p.hp)} HP` : ""}`).join("; ") : null;
    const heli = tiga(tot.heli, "unit"), hari = num(keb.target_hari) ? `${ang(keb.target_hari)} hari` : null;
    const kb = [["Regu", tiga(tot.regu, "")], ["Personel", tiga(tot.personel, "orang")], ["Pompa", pompa || null], ["Air", tiga(tot.air_l_hari, "liter per hari")], ["Selang", tiga(tot.selang_m, "m")],
      ["Helikopter", heli], ["Durasi", hari ? `target ${hari}` : null]].filter(x => x[1]);
    const wk = watak(k.watak);
    return {id: k.insiden || null, di, se, sit, kb, wk, ada: !!(titik || luas || aktif || kons.length || kb.length || wk.baris.length)};
  }


  /* ---- multi-bahaya: kamus kata per bahaya (cermin src/tugas_bencana.js `kata`) dan kartu bahaya selain karhutla ----
     Kunci status yang dikirim ke server TETAP menyala/bara/padam/bukan_api; hanya label layarnya yang berganti. Gempa tidak punya tombol selesai (kaji cepat dan laporan regu saja). */
  const KAMUS = {
    karhutla: {nama: "Karhutla", sebut: "Api", titik: "titik api", selesai: "padam", tutup: "api padam", kondisi: "Kondisi api", st: {menyala: "Masih menyala", bara: "Tinggal bara", padam: "Sudah padam", bukan_api: "Bukan api"}},
    banjir: {nama: "Banjir", sebut: "Banjir", titik: "lokasi banjir", selesai: "surut", tutup: "banjir surut", kondisi: "Kondisi banjir", st: {menyala: "Masih tergenang", bara: "Mulai surut", padam: "Sudah surut", bukan_api: "Bukan banjir"}},
    gempa: {nama: "Gempa", sebut: "Gempa", titik: "lokasi terdampak", selesai: "selesai", tutup: "kaji cepat selesai", kondisi: "Hasil kaji cepat", tanpaSelesai: true, st: {menyala: "Ada kerusakan atau korban", bara: "Kerusakan ringan", bukan_api: "Tanpa dampak"}},
    gunungapi: {nama: "Gunungapi", sebut: "Gunungapi", titik: "lokasi pos pantau", selesai: "turun status", tutup: "status turun", kondisi: "Kondisi di lokasi", st: {menyala: "Masih aktif", bara: "Mereda", padam: "Status sudah turun", bukan_api: "Tidak ada dampak"}},
    cuaca: {nama: "Cuaca ekstrem", sebut: "Cuaca ekstrem", titik: "lokasi terdampak", selesai: "berakhir", tutup: "cuaca ekstrem berakhir", kondisi: "Kondisi cuaca", st: {menyala: "Masih berlangsung", bara: "Mereda", padam: "Sudah berakhir", bukan_api: "Tidak terjadi"}},
    kekeringan: {nama: "Kekeringan", sebut: "Kekeringan", titik: "lokasi terdampak", selesai: "membaik", tutup: "kekeringan membaik", kondisi: "Kondisi kekeringan", st: {menyala: "Masih kering", bara: "Mulai membaik", padam: "Sudah membaik", bukan_api: "Tidak terjadi"}},
    udara: {nama: "Kualitas udara", sebut: "Kualitas udara", titik: "lokasi terdampak", selesai: "membaik", tutup: "udara membaik", kondisi: "Kondisi udara", st: {menyala: "Masih buruk", bara: "Mulai membaik", padam: "Sudah membaik", bukan_api: "Tidak terjadi"}}};
  const idBencana = t => Object.hasOwn(KAMUS, t?.bencana) ? t.bencana : "karhutla";
  const LEVEL_GA = {1: "Normal", 2: "Waspada", 3: "Siaga", 4: "Awas"};
  const SUMBER_B = {banjir: "Sumber: data hujan, peringatan banjir, dan hitungan Pantau Bencana.", gempa: "Sumber: BMKG dan hitungan Pantau Bencana (penduduk WorldPop).", gunungapi: "Sumber: PVMBG (MAGMA Indonesia) dan hitungan Pantau Bencana.",
    cuaca: "Sumber: peringatan dini BMKG.", kekeringan: "Sumber: indeks kekeringan (SPI) dan hitungan Pantau Bencana.", udara: "Sumber: data kualitas udara dan hitungan Pantau Bencana."};
  const str = v => typeof v === "string" && v.trim() ? v.trim().slice(0, 300) : null;
  /* [kunci kartu, label, pemformat, satuan]; baris pertama yang terisi menjadi angka kunci (oranye) */
  const KARTU_B = {
    banjir: [["jiwa_terdampak", "Penduduk terdampak", v => `sekitar ${a2(v)}`, "jiwa"], ["hujan_mm", "Hujan", v => ang(v, 0), "mm"]],
    gempa: [["mag", "Magnitudo", v => ang(v, 1), ""], ["mmi_maks", "Guncangan terkuat", v => ang(v, 0), "MMI"], ["jiwa_mmi6", "Penduduk di wilayah MMI 6 atau lebih", v => `sekitar ${a2(v)}`, "jiwa", "perkiraan model, belum diuji"], ["dalam_km", "Kedalaman", v => ang(v, 0), "km"]],
    gunungapi: [["level", "Level PVMBG", v => LEVEL_GA[v] ? `${ang(v)}, ${LEVEL_GA[v]}` : ang(v), ""], ["radius_krb_km", "Radius kawasan rawan bencana", v => ang(v, 1), "km"], ["jiwa_krb", "Penduduk dalam radius", v => `sekitar ${a2(v)}`, "jiwa"]],
    cuaca: [["jenis_peringatan", "Jenis peringatan", v => str(v) && kata(str(v)), ""], ["berlaku_hingga", "Berlaku hingga", v => waktu(v), ""], ["jiwa_kab_terlibat", "Penduduk kabupaten terlibat", v => `sekitar ${a2(v)}`, "jiwa"]],
    kekeringan: [["spi3", "SPI 3 bulan", v => ang(v, 1), ""], ["hari_tanpa_hujan", "Hari tanpa hujan", v => ang(v, 0), "hari"], ["jiwa_kab_terlibat", "Penduduk kabupaten terlibat", v => `sekitar ${a2(v)}`, "jiwa"]],
    udara: [["ispu", "ISPU", v => ang(v, 0), ""], ["polutan", "Polutan utama", v => str(v), ""], ["tren", "Tren", v => str(v) && kata(str(v)), ""]]};
  function susunBencana(b, t, kartu) {
    const k = obj(kartu) || {}, baris = [];
    for (const [c, label, f, sat, cat] of KARTU_B[b] || []) {
      const v = k[c], ok = typeof v === "string" ? !!str(v) : num(v); if (!ok) continue;
      const isi = f(v); if (isi) baris.push([label, sat ? `${isi} ${sat}` : isi, cat]);
    }
    if (num(k.jiwa) && !(KARTU_B[b] || []).some(x => x[0] === "jiwa")) baris.push(["Penduduk terpapar", `sekitar ${a2(k.jiwa)} jiwa`]);
    const syarat = (Array.isArray(k.syarat) ? k.syarat : []).filter(x => typeof x === "string").map(kata);
    return {id: str(k.insiden), baris, dasar: str(k.dasar), syarat, nav: num(t?.lat) && num(t?.lon) ? navUrl(t.lat, t.lon) : null, titik: koor(t?.lat, t?.lon), hipotesis: t?.hipotesis === true || k.hipotesis === true || b === "kekeringan", ada: baris.length > 0};
  }
  function teksBencana(b, t, kartu) {
    const m = KAMUS[b], s = susunBencana(b, t, kartu), o = [`*KARTU ${m.sebut.toUpperCase()}${s.id ? " " + s.id : ""}*`];
    const lok = [t?.kec && `Kecamatan ${t.kec}`, t?.kab].filter(Boolean).join(", ");
    if (lok || s.titik) o.push(`*Di mana:* ${[lok, s.titik].filter(Boolean).join(", ")}.`);
    if (s.nav) o.push(`Navigasi ke ${m.titik}: ${s.nav}`);
    if (s.baris.length) o.push(`*Situasi:* ${s.baris.map(([n, v, c]) => `${n} ${v}${c ? ` (${c})` : ""}`).join(", ")}.`);
    if (s.dasar) o.push(`Dasar: ${s.dasar}.`);
    if (s.hipotesis) o.push("Status: hipotesis, ambang belum teruji."); o.push(SUMBER_B[b] + " Belum divalidasi lapangan."); return o.join("\n");
  }
  function htmlBencana(b, t, kartu) {
    const m = KAMUS[b], s = susunBencana(b, t, kartu), [u, ...sisa] = s.baris;
    return `<section class="kp-kartu" aria-label="Kartu ${esc(m.sebut)}"><div class="kp-kepala"><h2>Kartu ${esc(m.sebut)}</h2>${s.id ? `<span class="kp-id">${esc(s.id)}</span>` : ""}${s.hipotesis ? pil("Hipotesis") : ""}${pil("Perkiraan", "emas")}</div>
      <div class="kp-bag"><h3>Di mana</h3>${s.titik ? `<p class="kp-utama">${esc(s.titik)}</p>` : `<p class="kp-redup">Koordinat belum tersedia.</p>`}${baris("Wilayah", esc([t?.kec && `Kecamatan ${t.kec}`, t?.kab].filter(Boolean).join(", ")))}
        ${s.nav ? `<a class="kp-tombol utama kp-nav" href="${esc(s.nav)}" target="_blank" rel="noopener noreferrer">Navigasi ke ${esc(m.titik)}</a>` : ""}</div>
      <div class="kp-bag"><h3>Situasi</h3>${u ? `<p class="kp-utama">${esc(u[1])}</p><p class="kp-baris"><span class="kp-k">${esc(u[0])}</span>${u[2] ? pil(u[2], "emas") : ""}</p>` : `<p class="kp-redup">Belum ada angka untuk kejadian ini.</p>`}
        ${sisa.map(([n, v, c]) => baris(n, esc(v) + (c ? " " + pil(c, "emas") : ""))).join("")}${baris("Dasar", s.dasar && esc(s.dasar))}${s.syarat.length ? baris("Alasan prioritas", esc(s.syarat.join(", "))) : ""}</div>
      <p class="kp-sumber">${esc(SUMBER_B[b])} Belum divalidasi lapangan.</p>
      <div class="kp-aksi"><button type="button" class="kp-tombol" data-kp="salin">Salin teks WhatsApp</button><a class="kp-tombol" data-kp="wa" href="https://wa.me/?text=${encodeURIComponent(teksBencana(b, t, kartu))}" target="_blank" rel="noopener noreferrer">Buka WhatsApp</a><button type="button" class="kp-tombol" data-kp="cetak">Cetak</button></div>
      <p class="kp-pesan" role="status" aria-live="polite"></p></section>`;
  }

  /* teks ringkas siap kirim WhatsApp; tanpa tanda pemisah titik tengah */
  function teks(t, kartu) {
    const bc = idBencana(t); if (bc !== "karhutla") return teksBencana(bc, t, kartu);
    const s = susun(t, kartu), b = [`*KARTU API${s.id ? " " + s.id : ""}*`];
    if (s.di.front) b.push(`*Di mana:* ${s.di.front}${s.di.radius ? `, ${s.di.radius}` : ""}${s.di.sensor ? `, ${s.di.sensor}` : ""}${s.di.waktu ? `, ${s.di.waktu}` : ""}.`);
    if (s.di.masuk) b.push(`Titik masuk: ${s.di.masuk}.`);
    if (s.di.nav) b.push(`Navigasi ke ${s.di.navKe}: ${s.di.nav}`);
    if (s.se.luas) b.push(`*Sebesar apa:* sekitar ${s.se.luas.tengah}${s.se.luas.rentang ? `, rentang ${s.se.luas.rentang}` : ""}. ${s.se.luasDasar[0].toUpperCase() + s.se.luasDasar.slice(1)}.${s.se.tren ? ` ${s.se.tren[0].toUpperCase() + s.se.tren.slice(1)}.` : ""}`);
    else if (s.se.tren) b.push(`*Sebesar apa:* luas belum tersedia. ${s.se.tren[0].toUpperCase() + s.se.tren.slice(1)}.`);
    if (s.se.aktif) b.push(`*Front aktif:* sekitar ${s.se.aktif}, dari ${DASAR_AKTIF}, bukan luas terbakar.`);
    const sit = [s.sit.lahan && `lahan ${s.sit.lahan}`, ...s.sit.kons.map(x => `konsesi ${x}`), s.sit.cuaca].filter(Boolean);
    if (sit.length) b.push(`*Situasi:* ${sit.join(", ")}.`);
    if (s.wk.baris.length) b.push(`*Pola lokasi:* ${s.wk.baris.join(". ")}.`);
    if (s.kb.length) b.push(`*Kebutuhan (perkiraan):* ${s.kb.map(([n, v]) => `${n.toLowerCase()} ${v}`).join(", ")}.`);
    b.push(SUMBER);
    return b.join("\n");
  }

  const pil = (txt, warna = "") => `<span class="kp-pil ${warna}">${esc(txt)}</span>`;
  const baris = (nama, isi) => isi ? `<p class="kp-baris"><span class="kp-k">${esc(nama)}</span> ${isi}</p>` : "";
  function html(t, kartu) {
    const bc = idBencana(t); if (bc !== "karhutla") return htmlBencana(bc, t, kartu);
    const s = susun(t, kartu); if (!s.ada && !s.id) return "";
    const di = s.di, se = s.se, sit = s.sit;
    const sitIsi = [sit.lahan && baris("Lahan", esc(sit.lahan)), ...sit.kons.map(x => baris("Konsesi", esc(x))), baris("Cuaca", sit.cuaca && esc(sit.cuaca)),
      sit.syarat.length ? baris("Alasan prioritas", esc(sit.syarat.join(", "))) : ""].filter(Boolean).join("");
    return `<section class="kp-kartu" aria-label="Kartu Api"><div class="kp-kepala"><h2>Kartu Api</h2>${s.id ? `<span class="kp-id">${esc(s.id)}</span>` : ""}${pil("Perkiraan", "emas")}</div>
      <div class="kp-bag"><h3>Di mana</h3>${di.front ? `<p class="kp-utama">${esc(di.front)}</p>` : `<p class="kp-redup">Koordinat front belum tersedia.</p>`}
        ${baris("Ketidakpastian", di.radius && `${esc(di.radius)}${di.sensor ? `, sensor ${esc(di.sensor)}` : ""}${di.waktu ? `, ${esc(di.waktu)}` : ""}`)}${baris("Titik masuk", di.masuk && esc(di.masuk))}
        ${di.nav ? `<a class="kp-tombol utama kp-nav" href="${esc(di.nav)}" target="_blank" rel="noopener noreferrer">Navigasi ke ${esc(di.navKe)}</a>` : ""}</div>
      <div class="kp-bag"><h3>Sebesar apa</h3>${se.luas ? `<p class="kp-utama">Sekitar ${esc(se.luas.tengah)}</p>${baris("Rentang", se.luas.rentang && esc(se.luas.rentang))}${baris("Dasar", esc(se.luasDasar))}` : `<p class="kp-redup">Luas belum tersedia.</p>`}
        ${baris("Front aktif", se.aktif && `sekitar ${esc(se.aktif)}, dari ${esc(DASAR_AKTIF)}, bukan luas terbakar`)}${baris("Tren 24 jam", se.tren && esc(se.tren))}</div>
      <div class="kp-bag"><h3>Situasi</h3>${sitIsi || `<p class="kp-redup">Belum ada data lahan atau konsesi.</p>`}</div>
      ${s.wk.baris.length ? `<div class="kp-bag"><h3>Pola lokasi ${pil("Riwayat satelit", "emas")}</h3>${s.wk.baris.map(x => `<p class="kp-baris">${esc(x)}</p>`).join("")}</div>` : ""}
      <div class="kp-bag"><h3>Kebutuhan ${pil("Perkiraan", "emas")}</h3>${s.kb.length ? s.kb.map(([n, v]) => baris(n, esc(v))).join("") : `<p class="kp-redup">Belum ada hitungan kebutuhan.</p>`}</div>
      <p class="kp-sumber">${SUMBER}</p>
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
  window.KartuApi = {html, teks, pasang, susun, KAMUS, idBencana};
})();
