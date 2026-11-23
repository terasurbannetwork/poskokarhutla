// Ikon garis (gaya Lucide) deck Penanganan yang tidak ada di templat: PNG transparan 256 px, warna sesuai tempatnya.
// pemda = pil PEMILIK armada (navy, sama dengan ikon TNI/Kemenhut/PT Sinarmas templat). ikon/firespot.png disalin dari deck 25 Okt
// (../../satelit-2026-10-25/ikon-firespot.png, dibuat ikon.mjs di sana), tidak dibuat ulang di sini.
// Pakai: PLAYWRIGHT_MJS=<playwright>/index.mjs node ikon.mjs   -> ikon/pemda.png
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { luncur } from '../pw.mjs';
const KE = fileURLToPath(new URL('ikon/', import.meta.url)); fs.mkdirSync(KE, {recursive: true});
const IKON = {
  pemda: ['#051C2C', '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2l8 5H4z"/>'],
  // kepala kolom deck banjir (penanganan_banjir.py), putih di atas kotak warna: air, longsor, rob, jiwa terpapar
  'banjir-air': ['#FFFFFF', '<path d="M2 7c.6.5 1.2 1 2.5 1C7 8 7 6 9.5 6c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 13c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 19c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>'],
  'banjir-longsor': ['#FFFFFF', '<path d="M2 20h20"/><path d="M3 20 10 5l4 7"/><path d="M15 14l2 2"/><circle cx="18" cy="11" r="1.5"/><circle cx="20" cy="17" r="1"/>'],
  'banjir-rob': ['#FFFFFF', '<path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M12 13V3"/><path d="m8 7 4-4 4 4"/>'],
  'banjir-jiwa': ['#FFFFFF', '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'],
  // PB-58: kepala kolom deck gempa dan kekeringan (penanganan_gempa.py, penanganan_kekeringan.py), putih di atas kotak warna
  'gempa-m4': ['#FFFFFF', '<path d="M2 12h3l2-6 3 12 3-9 2 5 2-2h5"/>'],
  'gempa-m5': ['#FFFFFF', '<path d="M2 12h2l2-8 3 16 3-12 2 8 2-4h6"/><path d="M12 2v2"/>'],
  'gempa-rasa': ['#FFFFFF', '<path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-6l2-2-1-2 3-2"/>'],
  'gempa-maks': ['#FFFFFF', '<path d="M3 3v18h18"/><path d="M7 16l4-6 3 3 5-8"/><circle cx="19" cy="5" r="1.5"/>'],
  'kering-jiwa': ['#FFFFFF', '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><circle cx="19" cy="6" r="3"/><path d="M19 1v1M19 10v1M14 6h1M23 6h1"/>'],
  'kering-hth': ['#FFFFFF', '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="12" cy="16" r="2.5"/>'],
  'kering-kab': ['#FFFFFF', '<path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3z"/><path d="M9 4v13M15 7v13"/>'],
  'kering-hujan': ['#FFFFFF', '<path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3"/><path d="M8 19v2M8 13v2M12 21v2M12 15v2M16 19v2M16 13v2"/>'],
  // ikon pil kiri tabel: putih di pil berwarna, gelap (#051C2C) di pil abu
  'pil-gempa-putih': ['#FFFFFF', '<path d="M2 12h3l2-6 3 12 3-9 2 5 2-2h5"/>'],
  'pil-gempa-gelap': ['#051C2C', '<path d="M2 12h3l2-6 3 12 3-9 2 5 2-2h5"/>'],
  'pil-hitung-putih': ['#FFFFFF', '<path d="M3 3v18h18"/><path d="M8 17v-4M12 17V9M16 17v-7M20 17V6"/>'],
  'pil-kering-putih': ['#FFFFFF', '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'],
  'pil-kering-gelap': ['#051C2C', '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'],
};
// Pakai: node ikon.mjs [nama ...] -> hanya ikon itu (ikon lama tidak digambar ulang, jadi berkasnya tidak berubah)
const PILIH = process.argv.slice(2);
const b = await luncur();
const pg = await b.newPage({viewport: {width: 256, height: 256}});
for (const [n, [c, d]] of Object.entries(IKON).filter(([n]) => !PILIH.length || PILIH.includes(n))) {
  await pg.setContent(`<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg></body></html>`);
  await (await pg.$('svg')).screenshot({path: KE + n + '.png', omitBackground: true});
}
await b.close(); console.log('ikon', Object.keys(IKON).join(', '));
