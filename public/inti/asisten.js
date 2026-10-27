/* Asisten tanya-jawab mengambang (tanpa LLM, tanpa server): tombol bulat kanan bawah + panel kecil.
   Semua jawaban dihitung dari JSON publik yang sudah ada di situs, memuat sumber + waktu data; yang tidak diketahui dijawab "tidak tahu".
   Pasang: <link rel="stylesheet" href="/inti/asisten.css"><script src="/inti/asisten.js" defer></script> (auto-pasang), atau Asisten.pasang().
   Skrip klasik mandiri (tidak butuh format.js). Data dimuat malas: tidak ada fetch sebelum panel pertama dibuka. */
(() => {
"use strict";
if (window.Asisten) return;

/* ===== Data teks (sunting di sini) ===== */
/* Nomor darurat. Terverifikasi dari situs resmi (diperiksa 28 Okt 2026): 110 polri.go.id (Call Center 110), 112 jakarta.go.id (layanan darurat Jakarta Siaga 112),
   115 basarnas.go.id (Kontak Darurat SAR 115), 117 bnpb.go.id (Pusdalops 24 Jam Call Center 117), 119 pusatkrisis.kemkes.go.id (PSC 119).
   113 (Pemadam Kebakaran) umum dikenal tetapi belum terbaca dari situs resmi saat diperiksa. */
const DARURAT = [
  ["112", "Darurat terpadu", "Untuk semua keadaan darurat; diteruskan ke instansi yang tepat"],
  ["110", "Polisi", "Kejahatan dan keselamatan umum"],
  ["113", "Pemadam Kebakaran", "Kebakaran bangunan dan lahan"],
  ["115", "Basarnas", "Pencarian dan pertolongan (SAR)"],
  ["117", "BNPB (Pusdalops)", "Informasi dan laporan bencana, 24 jam"],
  ["119", "Ambulans, gawat darurat", "Layanan gawat darurat kesehatan (PSC 119)"],
];

const SUMBER_PANDUAN = "Ringkasan panduan BNPB dan BMKG";
/* kunci: id jenis; kata: pemicu ketik bebas; sebelum/saat/sesudah: langkah singkat */
const PANDUAN = {
  banjir: {nama: "banjir", kata: /banjir|genang|rob\b|meluap/,
    sebelum: ["Kenali jalur evakuasi dan tempat pengungsian terdekat.", "Siapkan tas siaga: dokumen, obat, senter, makanan dan air.", "Pantau peringatan dini BMKG dan informasi BPBD."],
    saat: ["Matikan listrik dan gas bila air mulai masuk rumah.", "Pindah ke tempat yang lebih tinggi; jangan menerobos arus banjir.", "Jauhi kabel listrik dan genangan yang dalam."],
    sesudah: ["Kembali ke rumah hanya bila dinyatakan aman.", "Bersihkan rumah, buang makanan yang terendam.", "Periksakan ke puskesmas bila ada diare, demam, atau luka terendam air banjir."]},
  gempa: {nama: "gempa bumi", kata: /gempa|guncang|lindu/,
    sebelum: ["Kenali jalur evakuasi dan titik kumpul.", "Pasang perabot tinggi agar tidak roboh; siapkan tas siaga."],
    saat: ["Merunduk, berlindung di bawah meja kokoh, dan bertahan (Drop, Cover, Hold on).", "Jauhi kaca, lemari, dan benda yang bisa jatuh; jangan memakai lift.", "Di luar ruangan, menjauh dari bangunan, tiang, dan kabel."],
    sesudah: ["Waspada gempa susulan.", "Periksa cedera, bau gas, dan kerusakan listrik sebelum masuk kembali.", "Ikuti informasi resmi BMKG; jangan menyebarkan kabar yang belum jelas."]},
  karhutla: {nama: "karhutla dan asap", kata: /karhutla|kebakaran (hutan|lahan)|asap|kabut|titik (api|panas)|gambut/,
    sebelum: ["Jangan membakar lahan atau sampah.", "Siapkan masker N95 atau KN95 di rumah.", "Kenali kontak BPBD dan posko terdekat."],
    saat: ["Kurangi aktivitas di luar saat udara tidak sehat; tutup pintu dan jendela.", "Pakai masker N95 atau KN95; masker kain biasa kurang menyaring asap halus.", "Bayi, lansia, ibu hamil, dan penderita sakit pernapasan sebaiknya tetap di dalam ruangan.", "Api dekat permukiman: laporkan ke 112 atau BPBD; jangan memadamkan api besar sendiri."],
    sesudah: ["Periksakan ke puskesmas bila batuk, sesak, atau mata perih berlanjut.", "Pastikan bara di sekitar tempat tinggal benar-benar padam."]},
  longsor: {nama: "tanah longsor", kata: /longsor|tanah bergerak|lereng/,
    sebelum: ["Waspada tinggal di bawah atau di atas lereng curam saat hujan deras berhari-hari.", "Kenali tanda: retakan tanah, pohon atau tiang miring, mata air baru atau air sumur keruh."],
    saat: ["Segera menjauh dari arah luncuran tanah, ke samping, bukan lurus ke bawah.", "Jangan menyeberangi aliran lumpur.", "Tinggalkan rumah di bawah lereng bila hujan lebat terus berlanjut."],
    sesudah: ["Jauhi lokasi, longsor susulan masih mungkin.", "Laporkan korban tertimbun ke 112, 115, atau BPBD; bantu hanya bila aman."]},
  tsunami: {nama: "tsunami", kata: /tsunami|gelombang pasang|air laut surut/,
    sebelum: ["Kenali jalur dan tempat evakuasi tsunami di wilayah pesisir.", "Kenali tanda alam: gempa kuat atau lama, air laut tiba-tiba surut."],
    saat: ["Di pesisir, bila gempa kuat atau lama, atau air laut surut tiba-tiba: segera menjauh dari pantai ke tempat tinggi, tanpa menunggu peringatan.", "Evakuasi dengan berjalan kaki bila memungkinkan.", "Jangan kembali untuk melihat gelombang."],
    sesudah: ["Tetap di tempat tinggi sampai BMKG mencabut peringatan; gelombang bisa datang berulang.", "Jauhi puing dan kabel listrik."]},
  erupsi: {nama: "erupsi gunung api", kata: /erupsi|gunung|letusan|abu vulkanik|lahar/,
    sebelum: ["Patuhi status dan radius aman dari PVMBG.", "Siapkan masker, kacamata pelindung, dan tas siaga."],
    saat: ["Jauhi radius bahaya dan alur sungai berhulu di gunung (lahar).", "Lindungi napas dan mata dari abu: masker, kacamata, pakaian tertutup.", "Tutup ventilasi rumah; hindari berkendara saat abu tebal."],
    sesudah: ["Jangan masuk zona bahaya sebelum dinyatakan aman.", "Basahi abu di atap sebelum dibersihkan; waspada lahar hujan."]},
  cuaca: {nama: "cuaca ekstrem", kata: /cuaca|angin|puting|badai|petir|hujan lebat|siklon/,
    sebelum: ["Pangkas pohon yang rapuh dan kencangkan atap.", "Pantau peringatan dini BMKG."],
    saat: ["Berlindung di bangunan kokoh; jauhi pohon, baliho, tiang, dan tepi sungai.", "Saat petir, jauhi lapangan terbuka dan jangan berteduh di bawah pohon tinggi.", "Angin kencang atau puting beliung: berlindung di ruangan tanpa jendela, merunduk."],
    sesudah: ["Jauhi kabel putus dan bangunan atau pohon yang berpotensi roboh.", "Laporkan kerusakan ke BPBD."]},
};

const SARAN = [
  ["Ada titik api dekat saya?", "api dekat saya"],
  ["Status bencana di wilayahku", "status"],
  ["Nomor darurat resmi", "nomor darurat"],
  ["Apa yang harus dilakukan saat bencana?", "panduan"],
  ["Cara melapor", "cara melapor"],
];

/* ===== Util ===== */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const fmt = (n, d = 1) => Number(n).toLocaleString("id-ID", {maximumFractionDigits: d});
const WIB = {timeZone: "Asia/Jakarta"};
const hariIni = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
/* "12 Okt 19.27 WIB (14 hari lalu)"; tanggal saja tanpa jam */
const waktu = iso => {
  if (!iso) return "waktu tidak diketahui";
  const tglSaja = String(iso).length <= 10, d = new Date(tglSaja ? iso + "T00:00:00+07:00" : iso);
  if (isNaN(d)) return "waktu tidak diketahui";
  const s = tglSaja ? d.toLocaleDateString("id-ID", {...WIB, day: "numeric", month: "short"}) : d.toLocaleString("id-ID", {...WIB, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).replace(",", "") + " WIB";
  const m = (Date.now() - d) / 6e4, umur = m < 0 ? "" : m < 90 ? `${Math.max(1, Math.round(m))} menit lalu` : m < 2880 ? `${Math.round(m / 60)} jam lalu` : `${Math.round(m / 1440)} hari lalu`;
  return s + (umur ? ` (${umur})` : "") + (m > 4320 ? ", lebih dari 3 hari lalu, kemungkinan belum diperbarui" : "");
};
const norm = s => String(s || "").toLowerCase().replace(/kabupaten |kab\. |provinsi |prov\. /g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const inti = s => norm(s).replace(/^kota /, "");   /* "Kota Bogor" dan "Bogor" dianggap sama bila hanya salah satunya dikenal */
const ARAH = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"];
const jarakKm = (a, b, c, d) => { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
const arah = (a, b, c, d) => { const r = Math.PI / 180, y = Math.sin((d - b) * r) * Math.cos(c * r), x = Math.cos(a * r) * Math.sin(c * r) - Math.sin(a * r) * Math.cos(c * r) * Math.cos((d - b) * r); return ARAH[Math.round(((Math.atan2(y, x) / r + 360) % 360) / 45) % 8]; };

const cache = {};
const muat = u => cache[u] ||= fetch(u, {cache: "no-cache"}).then(r => { if (!r.ok) throw new Error(u + " " + r.status); return r.json(); }).catch(e => { delete cache[u]; throw e; });
const coba = u => muat(u).catch(() => null);

/* ===== Gazetteer: kabupaten/kota + provinsi dari data kekeringan (sudah dipakai layar, 45 KB) ===== */
let gaz;
const gazetteer = async () => {
  if (gaz) return gaz;
  const [w, m] = await Promise.all([muat("/data/kekeringan_wilayah.json"), muat("/data/kekeringan_meta.json")]);
  const prov = m.provinsi, daftar = [];
  Object.entries(prov).forEach(([kode, nama]) => {
    const n = norm(nama);
    [n, n.replace(/^dki /, ""), n.replace(/^di /, ""), n.replace(/^kep /, "kepulauan ")].forEach(v => v && daftar.push({v, jenis: "prov", kode, nama}));
  });
  Object.keys(w.kab).forEach(k => {
    const [kode, nama] = k.split("|"), n = norm(nama);
    daftar.push({v: n, jenis: "kab", kode, nama, kunci: k});
    if (n.startsWith("kota ")) daftar.push({v: n.slice(5), jenis: "kab", kode, nama, kunci: k, alias: 1});
  });
  /* alias "kota x" -> "x" hanya bila tidak bentrok dengan nama kabupaten/provinsi lain */
  const penuh = new Set(daftar.filter(e => !e.alias).map(e => e.v));
  gaz = {prov, w, daftar: daftar.filter(e => !e.alias || !penuh.has(e.v)).sort((a, b) => b.v.length - a.v.length || (a.jenis === "kab" ? -1 : 1))};
  return gaz;
};
const cariWilayah = (teks, g) => { const q = ` ${norm(teks)} `; return g.daftar.find(e => q.includes(` ${e.v} `)) || null; };

/* ===== Penjawab ===== */
const tautan = (h, t) => `<a href="${h}">${esc(t)}</a>`;
const sumber = (...b) => `<p class="as-sb">Sumber: ${b.join("; ")}</p>`;
const baris = (...p) => p.filter(Boolean).map(x => `<p>${x}</p>`).join("");
const TIDAK_TAHU = `<p>Maaf, saya tidak punya jawaban untuk itu. Saya hanya menjawab dari data yang ada di situs ini. Coba salah satu pertanyaan di bawah, atau buka ${tautan("/semua", "beranda semua bencana")}.</p>`;

async function apiDekat(lat, lon) {
  const d = await coba("/data/titik24.json");
  if (!d?.titik?.length) return baris("Data titik panas belum bisa dibaca sekarang, jadi saya tidak bisa menjawab. Coba lagi nanti, atau buka " + tautan("/", "peta karhutla") + ".");
  let min = Infinity, t0 = null, dalam25 = 0, dalam50 = 0;
  for (const t of d.titik) { const k = jarakKm(lat, lon, t[0], t[1]); if (k < min) { min = k; t0 = t; } if (k <= 25) dalam25++; if (k <= 50) dalam50++; }
  const a = arah(lat, lon, t0[0], t0[1]);
  const isi = min <= 100
    ? baris(`<b>Titik panas terdekat ${fmt(min)} km ke arah ${a}</b> dari lokasimu.`, `Dalam radius 25 km ada ${fmt(dalam25)} titik, dalam 50 km ada ${fmt(dalam50)} titik.`)
    : baris(`<b>Tidak ada titik panas dalam 100 km</b> dari lokasimu. Yang terdekat ${fmt(min)} km ke arah ${a}.`);
  return isi + baris("Titik panas adalah deteksi satelit panas permukaan, bukan konfirmasi kebakaran. Bila kamu melihat api atau asap, hubungi 112.", tautan("/", "Buka peta karhutla")) + sumber(`NASA FIRMS (titik panas 24 jam), data ${esc(waktu(d.acuan))}`);
}

/* ringkasan per wilayah; e = {jenis, kode, nama, kunci?} */
async function ringkasWilayah(e, g) {
  const kab = e.jenis === "kab", provNama = g.prov[e.kode], cocok = n => kab ? inti(n) === inti(e.nama) : false;
  const [kl, tk, bj, kemarau, dar, reg] = await Promise.all([coba("/data/kluster_awal.json"), coba("/data/titik24.json"), coba("/banjir/data/kejadian_aktif_awal.json"), coba("/data/kekeringan_meta.json"), coba("/data/status_darurat.json"), coba("/bencana.json")]);
  const b = id => reg?.bencana?.find(x => x.id === id), nama = id => b(id)?.nama || id, rute = (id, f) => b(id) ? tautan(b(id).rute, f) : "";
  const baru = [], isi = [], src = [];
  const lokasi = kab ? `${e.nama}, ${provNama}` : provNama;

  /* karhutla: cluster titik panas */
  if (kl) {
    const cl = kl.features.map(f => f.properties).filter(p => kab ? p.prov === e.kode && cocok(p.kab) : p.prov === e.kode);
    if (cl.length) {
      const n24 = cl.reduce((a, p) => a + (p.n24 || 0), 0), lv = Math.max(...cl.map(p => p.level || 0));
      isi.push(`<b>${esc(nama("karhutla"))}:</b> ${fmt(cl.length, 0)} cluster titik panas${lv ? `, level tertinggi ${lv} dari 3` : ""}, ${fmt(n24, 0)} titik dalam 24 jam. ${rute("karhutla", "Peta karhutla")}`);
    } else isi.push(`<b>${esc(nama("karhutla"))}:</b> tidak ada cluster titik panas tercatat di data terakhir. ${rute("karhutla", "Peta karhutla")}`);
    src.push(`cluster titik panas NASA FIRMS, data ${esc(waktu(tk?.acuan))}`);
  }
  /* banjir: kejadian aktif (kecamatan Siaga/Awas) */
  if (bj?.kejadian) {
    const cocokKec = x => { const [p, kb] = x.split("|"); return p === e.kode && (!kab || cocok(kb)); };
    const kj = bj.kejadian.filter(k => k.kec.some(cocokKec)), kec = bj.kejadian.flatMap(k => k.kec).filter(cocokKec), lv = Math.max(0, ...kj.map(k => k.level_tertinggi));
    isi.push(kec.length ? `<b>${esc(nama("banjir"))}:</b> ${fmt(kec.length, 0)} kecamatan berstatus ${lv >= 3 ? "Awas" : "Siaga"} atau lebih tinggi. ${rute("banjir", "Peta banjir")}` : `<b>${esc(nama("banjir"))}:</b> tidak ada kecamatan berstatus Siaga atau Awas di data terakhir. ${rute("banjir", "Peta banjir")}`);
    src.push(`prakiraan banjir Centurisk97, data ${esc(waktu(bj.dibuat))}`);
  }
  /* kekeringan */
  if (kemarau) {
    const LV = ["Normal", "Waspada", "Siaga", "Awas"];
    if (kab) { const r = g.w.kab[e.kunci]; if (r) isi.push(`<b>${esc(nama("kekeringan"))}:</b> ${LV[r.lv]}${r.spi3 != null ? `, indeks SPI 3 bulan ${fmt(r.spi3)}` : ""}. ${rute("kekeringan", "Peta kekeringan")}`); }
    else { const p = g.w.prov[e.kode]; if (p) isi.push(`<b>${esc(nama("kekeringan"))}:</b> status provinsi ${LV[p.lv]}; ${fmt(p.kab_n?.[0] ?? 0, 0)} kabupaten/kota Waspada atau lebih, ${fmt(p.kab_n?.[2] ?? 0, 0)} Awas. ${rute("kekeringan", "Peta kekeringan")}`); }
    src.push(`deteksi kekeringan Centurisk97, data ${esc(waktu(kemarau.hari_ini))}`);
  }
  /* status darurat resmi (berkas boleh tidak ada) */
  const hari = hariIni(), sk = (dar?.sk || []).filter(s => s.mulai <= hari && hari <= (s.berakhir || "9999") && (kab ? (s.kab_kode ? String(s.kab_kode) === String(e.kunci?.split("|")[0]) && cocok(s.kab) : cocok(s.kab)) : norm(s.prov) === norm(provNama) || String(s.kab_kode || "").startsWith(e.kode)));
  if (dar && sk.length) {
    isi.unshift(`<b>Status darurat berlaku:</b> ` + sk.slice(0, 5).map(s => `${esc(s.status)}${s.jenis ? " " + esc(s.jenis) : ""}${!kab && s.kab ? " di " + esc(s.kab) : ""}, ${esc(s.mulai)} sampai ${esc(s.berakhir || "belum ditentukan")}${s.nomor ? ", SK " + esc(s.nomor) : ""}${/^https?:\/\//.test(s.tautan || "") ? ` ${tautan(esc(s.tautan), "dokumen")}` : ""}`).join("; ") + (sk.length > 5 ? `, dan ${sk.length - 5} lainnya` : "") + ".");
    src.push("status darurat dari SK yang tercatat");
  }
  if (!isi.length) return baris(`Saya tidak bisa membaca data status untuk ${esc(lokasi)} saat ini.`) + baris("Coba lagi nanti, atau buka " + tautan("/semua", "beranda semua bencana") + ".");
  return baris(`<b>Status bencana di ${esc(lokasi)}</b>`) + isi.map(x => `<p>${x}</p>`).join("") +
    baris("Gempa, gunung api, cuaca, dan kualitas udara tidak diringkas per wilayah di sini; lihat " + tautan("/semua", "beranda semua bencana") + ".") + sumber(...src);
}

/* titik api untuk wilayah yang diketik: ringkasan cluster karhutla */
async function apiWilayah(e, g) {
  const [kl, tk] = await Promise.all([coba("/data/kluster_awal.json"), coba("/data/titik24.json")]);
  if (!kl) return baris("Data cluster titik panas belum bisa dibaca sekarang. Coba lagi nanti, atau buka " + tautan("/", "peta karhutla") + ".");
  const kab = e.jenis === "kab", cl = kl.features.map(f => f.properties).filter(p => p.prov === e.kode && (!kab || inti(p.kab) === inti(e.nama))).sort((a, b) => (b.n24 || 0) - (a.n24 || 0));
  const lokasi = kab ? `${e.nama}, ${g.prov[e.kode]}` : g.prov[e.kode], n24 = cl.reduce((a, p) => a + (p.n24 || 0), 0);
  const isi = cl.length
    ? baris(`<b>${fmt(cl.length, 0)} cluster titik panas di ${esc(lokasi)}</b>, ${fmt(n24, 0)} titik dalam 24 jam.`, "Terbesar: " + cl.slice(0, 3).map(p => `${esc(p.kab)}${p.kec ? ", " + esc(p.kec) : ""} (${fmt(p.n24, 0)} titik 24 jam, level ${p.level})`).join("; ") + ".")
    : baris(`<b>Tidak ada cluster titik panas</b> tercatat di ${esc(lokasi)} pada data terakhir.`);
  return isi + baris("Titik panas bukan konfirmasi kebakaran. Bila kamu melihat api atau asap, hubungi 112.", tautan("/", "Buka peta karhutla")) + sumber(`cluster titik panas NASA FIRMS, data ${esc(waktu(tk?.acuan))}`);
}

const nomorDarurat = () => baris("<b>Nomor darurat resmi</b> (gratis dari ponsel):") +
  `<ul class="as-tel">${DARURAT.map(([n, a, k]) => `<li><a href="tel:${n}" class="as-no">${n}</a><span><b>${esc(a)}</b><br>${esc(k)}</span></li>`).join("")}</ul>` +
  baris("Dalam keadaan darurat jiwa, telepon dulu; jangan hanya melapor lewat situs.") + sumber("polri.go.id, jakarta.go.id, basarnas.go.id, bnpb.go.id, pusatkrisis.kemkes.go.id, diperiksa 28 Okt 2026");

const pilihJenis = () => baris("Bencana apa?") + `<div class="as-aksi">${Object.entries(PANDUAN).map(([k, v]) => `<button type="button" data-q="panduan ${k}">${esc(v.nama[0].toUpperCase() + v.nama.slice(1))}</button>`).join("")}</div>`;
const panduan = id => {
  const p = PANDUAN[id], daftar = (j, a) => `<p class="as-jd">${j}</p><ul>${a.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
  return baris(`<b>Yang harus dilakukan: ${esc(p.nama)}</b>`) + daftar("Sebelum", p.sebelum) + daftar("Saat kejadian", p.saat) + daftar("Sesudah", p.sesudah) +
    baris("Panduan lengkap: " + `<a href="https://bnpb.go.id" target="_blank" rel="noopener">bnpb.go.id</a>, <a href="https://www.bmkg.go.id" target="_blank" rel="noopener">bmkg.go.id</a>`) + sumber(SUMBER_PANDUAN);
};
const caraLapor = () => baris("<b>Cara melapor</b>", `Kondisi di sekitarmu (listrik, sinyal, BBM atau LPG, kebutuhan atau tawaran bantuan, karhutla, banjir, longsor, rob) bisa kamu laporkan di ${tautan("/warga", "halaman Lapor Warga")}. Buka halamannya, pilih jenis laporan, tandai lokasi, dan kirim.`,
  "Bila ada korban atau nyawa terancam, telepon 112 atau 117 lebih dulu.") + sumber("halaman Lapor Warga situs ini");

/* ===== Penafsir pertanyaan ===== */
const kata = (t, re) => re.test(t);
async function jawab(teks, ctx) {
  const t = norm(teks);
  if (kata(t, /\b(nomor|telepon|telpon|hubungi|call center|ambulans|polisi|pemadam|damkar|basarnas|kontak darurat)\b|^darurat$|\b(112|110|113|115|117|119)\b/)) return nomorDarurat();
  if (kata(t, /\b(lapor|melapor|laporan|pengaduan|mengadu)\b/) && !kata(t, /\b(status|laporan harian)\b/)) return caraLapor();
  const g = await gazetteer().catch(() => null), e = g && cariWilayah(teks, g);
  const jenis = Object.keys(PANDUAN).find(k => kata(t, PANDUAN[k].kata));
  const cue = kata(t, /\b(harus|lakukan|dilakukan|langkah|tindakan|panduan|antisipasi|menghadapi|selamat|persiapan|siaga|cara|apa yang|bagaimana|ketika|saat)\b/);
  if (kata(t, /^panduan$|apa yang harus|saat bencana/) && !jenis) return pilihJenis();
  if (jenis && (cue || !e) && !kata(t, /\b(titik|dekat|terdekat|status|kondisi)\b/)) return panduan(jenis);
  const api = kata(t, /\b(titik|api|hotspot|terdekat|sekitar saya|dekat saya|asap)\b/);
  if (api) {
    if (ctx.lokasi && !e) return apiDekat(ctx.lokasi[0], ctx.lokasi[1]);
    if (e) return apiWilayah(e, g);
    return {tanyaLokasi: "api"};
  }
  if (e) return ringkasWilayah(e, g);
  if (kata(t, /\b(status|kondisi|situasi|bencana|aman|level)\b/)) { ctx.menunggu = "status"; return baris("Wilayah mana? Ketik nama kabupaten, kota, atau provinsi, misalnya <i>Status bencana di Riau</i>.") ; }
  if (jenis) return panduan(jenis);
  return TIDAK_TAHU;
}

/* ===== Antarmuka ===== */
let el = {}, ctx = {lokasi: null, menunggu: null}, terpasang = false, sedang = false;
const ikon = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9.5 10a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4M12 16.6v.1"/></svg>';

function tambah(kelas, html, teks) {
  const d = document.createElement("div");
  d.className = "as-m " + kelas;
  if (teks != null) d.textContent = teks; else d.innerHTML = html;
  el.log.appendChild(d);
  el.log.scrollTop = el.log.scrollHeight;
  return d;
}
const sambut = () => tambah("as-b", baris("Halo, saya asisten Pantau Bencana. Saya menjawab hanya dari data yang ada di situs ini, lengkap dengan sumber dan waktunya. Pilih pertanyaan atau ketik sendiri."));

function mintaLokasi() {
  const m = tambah("as-b", baris("Untuk mencari titik api terdekat saya perlu lokasimu. Lokasi hanya dipakai di peramban ini dan tidak dikirim ke mana pun.") + `<div class="as-aksi"><button type="button" data-lokasi="1">Pakai lokasi saya</button></div><p>Atau ketik nama kabupaten, kota, atau provinsi.</p>`);
  ctx.menunggu = "api"; return m;
}

async function tanya(teks, label) {
  teks = String(teks || "").trim().slice(0, 200);
  if (!teks || sedang) return;
  sedang = true;
  tambah("as-u", null, label || teks);
  const tunggu = tambah("as-b as-tg", baris("Memeriksa data…"));
  el.log.setAttribute("aria-busy", "true");
  try {
    let q = teks;
    if (ctx.menunggu) {   /* jawaban atas pertanyaan balik "wilayah mana?" */
      const g = await gazetteer().catch(() => null);
      if (g && cariWilayah(teks, g) && !/\b(titik|api|status|nomor|lapor)\b/.test(norm(teks))) q = (ctx.menunggu === "api" ? "titik api " : "status ") + teks;
    }
    if (q === "api dekat saya" || q === "status") {
      tunggu.remove();
      if (q === "status") { ctx.menunggu = "status"; tambah("as-b", baris("Wilayah mana? Ketik nama kabupaten, kota, atau provinsi, misalnya <i>Status bencana di Riau</i>.")); }
      else if (ctx.lokasi) tambah("as-b", await apiDekat(...ctx.lokasi));
      else mintaLokasi();
      return;
    }
    const h = await jawab(q, ctx);
    tunggu.remove();
    if (h?.tanyaLokasi) mintaLokasi();
    else { if (ctx.menunggu && typeof h === "string" && !/Wilayah mana/.test(h)) ctx.menunggu = null; tambah("as-b", h); }
  } catch (err) {
    tunggu.remove();
    tambah("as-b", baris("Maaf, data belum bisa dimuat sekarang, jadi saya tidak bisa menjawab. Coba lagi sebentar lagi."));
  } finally { sedang = false; el.log.removeAttribute("aria-busy"); }
}

function lokasiSaya() {
  if (!navigator.geolocation) { tambah("as-b", baris("Peramban ini tidak mendukung lokasi. Ketik nama kabupaten, kota, atau provinsi.")); return; }
  tambah("as-u", null, "Pakai lokasi saya");
  const tunggu = tambah("as-b as-tg", baris("Menunggu izin lokasi…"));
  navigator.geolocation.getCurrentPosition(async p => {
    ctx.lokasi = [p.coords.latitude, p.coords.longitude]; tunggu.remove(); ctx.menunggu = null; sedang = true;
    const m = tambah("as-b as-tg", baris("Mencari titik panas terdekat…"));
    try { const h = await apiDekat(...ctx.lokasi); m.remove(); tambah("as-b", h); } catch { m.remove(); tambah("as-b", baris("Data titik panas belum bisa dimuat. Coba lagi nanti.")); }
    sedang = false;
  }, () => { tunggu.remove(); tambah("as-b", baris("Izin lokasi tidak diberikan, tidak apa-apa. Ketik nama kabupaten, kota, atau provinsi, misalnya <i>titik api di Pelalawan</i>.")); ctx.menunggu = "api"; },
  {enableHighAccuracy: false, timeout: 15000, maximumAge: 300000});
}

function buka() {
  el.panel.hidden = false; el.btn.setAttribute("aria-expanded", "true"); el.btn.classList.add("on");
  if (!el.log.childElementCount) sambut();
  el.in.focus({preventScroll: true});
}
function tutup(fokus = true) {
  el.panel.hidden = true; el.btn.setAttribute("aria-expanded", "false"); el.btn.classList.remove("on");
  if (fokus) el.btn.focus({preventScroll: true});
}

function pasang() {
  if (terpasang || !document.body) return;
  terpasang = true;
  const w = document.createElement("div");
  w.className = "as-w"; w.setAttribute("translate", "no");
  w.innerHTML = `<button type="button" class="as-fab" aria-label="Buka asisten tanya-jawab" aria-expanded="false" aria-controls="as-panel" title="Tanya asisten">${ikon}</button>
<section class="as-panel" id="as-panel" role="dialog" aria-label="Asisten tanya-jawab Pantau Bencana" hidden>
  <header class="as-hd"><b>Asisten Pantau Bencana</b><button type="button" class="as-x" aria-label="Tutup asisten">&times;</button></header>
  <div class="as-log" role="log" aria-live="polite" tabindex="0"></div>
  <div class="as-saran">${SARAN.map(([t, q]) => `<button type="button" data-q="${esc(q)}">${esc(t)}</button>`).join("")}</div>
  <form class="as-f" autocomplete="off"><input type="text" class="as-in" maxlength="200" placeholder="Tanya, mis. banjir di Demak" aria-label="Ketik pertanyaan"><button type="submit" class="as-k">Kirim</button></form>
</section>`;
  document.body.appendChild(w);
  el = {btn: w.querySelector(".as-fab"), panel: w.querySelector(".as-panel"), log: w.querySelector(".as-log"), in: w.querySelector(".as-in")};
  el.btn.addEventListener("click", () => el.panel.hidden ? buka() : tutup());
  w.querySelector(".as-x").addEventListener("click", () => tutup());
  w.querySelector(".as-f").addEventListener("submit", ev => { ev.preventDefault(); const v = el.in.value; el.in.value = ""; tanya(v); });
  w.addEventListener("click", ev => {
    const q = ev.target.closest("[data-q]"), l = ev.target.closest("[data-lokasi]");
    if (q) { const lab = q.textContent; if (q.dataset.q === "api dekat saya" && ctx.lokasi === null) { tambah("as-u", null, lab); mintaLokasi(); } else tanya(q.dataset.q, lab); }
    else if (l) lokasiSaya();
  });
  w.addEventListener("keydown", ev => { if (ev.key === "Escape" && !el.panel.hidden) { ev.stopPropagation(); tutup(); } });
}

window.Asisten = {pasang, buka: () => { pasang(); buka(); }, tutup, _jawab: jawab};   /* _jawab: untuk uji */
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pasang, {once: true}); else pasang();
})();
