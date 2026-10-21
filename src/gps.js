/* Anti GPS palsu untuk unggahan warga. Peramban TIDAK bisa membuktikan GPS asli: aplikasi pengubah lokasi (mock location)
   menyuapi navigator.geolocation langsung, dan kode halaman ada di tangan pengirim. Bukti kuat butuh aplikasi asli dengan
   atestasi perangkat (Play Integrity / App Attest). Jadi di sini dua lapis:
   - tolak: yang pasti janggal (jaringan luar negeri, VPN/proxy/server cloud, bacaan GPS kurang/basi, titik kiriman tak cocok
     dengan bacaannya);
   - curiga: ciri aplikasi lokasi palsu yang bisa juga muncul pada GPS asli. Disimpan di foto.gps_curiga, admin yang memutus.
   Semua foto tetap lewat antrean admin sebelum tayang. */
export const SAMPEL_MIN = 3, SAMPEL_RENTANG = 90e3, KECEPATAN_MAKS = 300, PINDAH_MIN_KM = 30;
const jarakM = (a, b, c, d) => { const r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r; return Math.hypot(x, y) * 6371e3; };
const fmt = n => Math.round(n).toLocaleString("id-ID");
/* zona waktu resmi per kode provinsi BPS: aplikasi lokasi palsu memindah GPS, tidak memindah jam perangkat */
const zonaProv = p => /^(1|21|3|61|62)/.test(p) ? "WIB" : /^(5|63|64|65|7)/.test(p) ? "WITA" : /^(8|9)/.test(p) ? "WIT" : null;
const ZONA_IANA = {"Asia/Jakarta": "WIB", "Asia/Pontianak": "WIB", "Asia/Makassar": "WITA", "Asia/Ujung_Pandang": "WITA", "Asia/Jayapura": "WIT"};
/* relay privasi (iCloud Private Relay, WARP) keluar lewat Cloudflare/Fastly/Akamai: banyak iPhone sah memakainya, jadi tanda saja, bukan tolak */
export const jaringanRelay = cf => [13335, 209242, 54113, 20940, 16625, 36183].includes(Number(cf?.asn)) || /cloudflare|fastly|akamai/i.test(cf?.asOrganization || "");

/* sampel = JSON [[lat, lon, akurasi, waktu_ms], ...] dari beberapa bacaan GPS berurutan; sebelum = unggahan terakhir dari IP yang sama */
const GAGAL = "lokasi tidak bisa diverifikasi; muat ulang halaman lalu ambil lokasi lagi";   // satu pesan: jangan beri tahu aturan mana yang kena
export function nilaiGps({negara, hosting, relay, zona, prov, lat, lon, waktuGps, sampel, sebelum, kini}) {
  if (negara && negara !== "ID") return {tolak: `jaringan Anda terbaca dari luar Indonesia (${negara}); matikan VPN lalu kirim dari lokasi`};
  if (hosting && !relay) return {tolak: "jaringan Anda lewat VPN/proxy/server cloud; matikan lalu kirim memakai data seluler atau Wi-Fi biasa"};
  let s = null; if (typeof sampel === "string" && sampel.length <= 1000) try { s = JSON.parse(sampel); } catch (e) {}
  if (!Array.isArray(s) || s.length < SAMPEL_MIN || s.length > 10 || !s.every(x => Array.isArray(x) && x.length === 4 && x.every(Number.isFinite)))
    return {tolak: GAGAL};
  const t = s.map(x => x[3]);
  if (t.some((v, i) => i && v < t[i - 1]) || t.at(-1) - t[0] > SAMPEL_RENTANG || Math.abs(t.at(-1) - waktuGps) > 1000) return {tolak: GAGAL};
  const [la, lo] = s.at(-1);
  if (jarakM(lat, lon, la, lo) > 1) return {tolak: GAGAL};

  const curiga = [];
  if (relay) curiga.push("lewat relay privasi/VPN (iCloud Private Relay atau WARP 1.1.1.1): lokasi jaringan tidak bisa dicocokkan");
  const diam = s.every(x => x[0] === s[0][0] && x[1] === s[0][1]), akurasiTetap = s.every(x => x[2] === s[0][2]);
  if (diam && akurasiTetap) curiga.push(`GPS tidak bergeser sedikit pun di ${s.length} bacaan (ciri aplikasi lokasi palsu, bisa juga lokasi Wi-Fi)`);
  else if (akurasiTetap) curiga.push(`akurasi persis ±${fmt(s[0][2])} m di semua bacaan walau titik bergeser (ciri aplikasi lokasi palsu)`);
  let lompat = 0; for (const a of s) for (const b of s) lompat = Math.max(lompat, jarakM(a[0], a[1], b[0], b[1]));
  if (lompat > Math.max(300, 3 * Math.max(...s.map(x => x[2])))) curiga.push(`titik melompat ${fmt(lompat)} m antarbacaan dalam ${Math.round((t.at(-1) - t[0]) / 1000)} detik`);
  if (sebelum) {
    const km = jarakM(lat, lon, sebelum.lat, sebelum.lon) / 1000, jam = Math.max(kini - sebelum.dibuat, 60e3) / 36e5;
    if (km > PINDAH_MIN_KM && km / jam > KECEPATAN_MAKS)
      curiga.push(`pindah ${fmt(km)} km dalam ${fmt(jam * 60)} menit dari unggahan sebelumnya (${{email: "email", akun: "akun"}[sebelum.lewat] || "IP"} sama)`);
  }
  const zg = zonaProv(prov || "");
  if (zg && typeof zona === "string" && zona) {
    const zp = ZONA_IANA[zona];
    if (!zp) curiga.push(`jam perangkat memakai zona ${zona.slice(0, 40)}, bukan zona Indonesia (GPS di ${zg})`);
    else if (zp !== zg) curiga.push(`jam perangkat ${zp}, padahal GPS di wilayah ${zg} (aplikasi lokasi palsu tidak memindah jam)`);
  }
  return {curiga};
}
