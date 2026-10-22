/* Membuat pasangan kunci VAPID untuk notifikasi push /instansi (src/push.js). Jalankan SEKALI di mesin pemilik: node scripts/bnpb/vapid.mjs
   Kunci hanya dicetak ke layar. TIDAK ditulis ke berkas mana pun: kunci privat jangan masuk git, chat, atau tangkapan layar. */
import {generateKeyPairSync} from "node:crypto";

const {privateKey} = generateKeyPairSync("ec", {namedCurve: "prime256v1"});
const j = privateKey.export({format: "jwk"});
const b = s => Buffer.from(s, "base64url");
const publik = Buffer.concat([Buffer.from([4]), b(j.x), b(j.y)]).toString("base64url");   // titik tak terkompresi 65 byte
console.log(`
Kunci VAPID dibuat. Langkah untuk pemilik:

1. Pasang kunci PRIVAT sebagai secret (tempel saat diminta, jangan simpan di berkas):
     npx wrangler@4.42.0 secret put VAPID_PRIVAT
   nilai: ${j.d}

2. Pasang subjek (email pemilik untuk dihubungi layanan push):
     npx wrangler@4.42.0 secret put VAPID_SUBJEK
   nilai: mailto:emailkamu@contoh.id

3. Kunci PUBLIK boleh terbuka. Tambahkan ke "vars" di wrangler.jsonc lalu terbitkan:
     "VAPID_PUBLIK": "${publik}"

4. Terapkan migrasi 0040 ke D1 produksi (migrations/0040_push.sql), lalu terbitkan worker.
   Sesudah itu tombol "Nyalakan notifikasi" muncul di /instansi. Di iPhone, pasang /instansi ke Layar Utama dulu.

Jangan pernah mengganti VAPID_PUBLIK tanpa mengganti VAPID_PRIVAT (pasangannya): langganan lama jadi tidak sah dan tiap perangkat harus menyalakan ulang.
Layar ini tidak disimpan. Tutup terminal atau bersihkan riwayatnya sesudah selesai.
`);
