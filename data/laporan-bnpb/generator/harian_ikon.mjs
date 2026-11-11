// Ikon garis (gaya Lucide) untuk panel Bencana lainnya: PNG transparan 96 px, beberapa warna.
import fs from 'node:fs';
const KE = process.argv[2] || '.'; fs.mkdirSync(KE + '/ik', {recursive: true});
import os from 'node:os';
import { luncur } from './pw.mjs';
const P = {
  // 2 Nov: ikon KRIS (Kolaborasi, Responsif, Integratif, Sinkronisasi) untuk sampul laporan, garis Lucide
  kolaborasi: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  responsif: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  integratif: '<path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z"/>',
  sinkronisasi: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  gempa: '<path d="M2 12h3l2-6 3 12 3-9 2 5 2-2h5"/>',
  longsor: '<path d="M2 20 9 7l4 5 2-2 7 10"/><path d="M2 20h20"/><circle cx="15.5" cy="16" r="1.5"/><circle cx="19" cy="18" r="1"/><circle cx="12" cy="17.5" r="1"/>',
  api: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  banjir: '<path d="M2 7c.6.5 1.2 1 2.5 1C7 8 7 6 9.5 6c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 13c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 19c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  tenda: '<path d="M3.5 21 14 3"/><path d="M20.5 21 10 3"/><path d="M15.5 21 12 15l-3.5 6"/><path d="M2 21h20"/>',
  rumah: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  orang: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  hati: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="m12 13-1-1 2-2-3-3 2-2"/>',
  kalender: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  angin: '<path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/>',
  truk: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  awas: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  gunung: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
  cek: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  radius: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  arah: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  asap: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  suhu: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  tetes: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  mata: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  tekanan: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  hujan: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M16 14v6M8 14v6M12 16v6"/>',
  telepon: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  jam: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',   // 11 Nov pemilik: waktu diukur (beda dari kalender = periode berlaku)
  sampah: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
};
const W = {putih: '#FFFFFF', slate: '#5B7A99', merah: '#C8102E', oranye: '#D9600B', navy: '#051C2C', kering: '#8A6A2E', coklat: '#7A5230'};
const b = await luncur();
const pg = await b.newPage({viewport: {width: 96, height: 96}});
for (const [n, d] of Object.entries(P)) for (const [w, c] of Object.entries(W)) {
  await pg.setContent(`<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg></body></html>`);
  await (await pg.$('svg')).screenshot({path: `${KE}/ik/${n}-${w}.png`, omitBackground: true});
}
// 10 Nov pemilik: ikon solid untuk penanda peringatan dini di peta; WARNA diganti warna ikon
const AWAN = 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z';
const SOLID = {
  asapsolid: `<path d="${AWAN}" fill="WARNA"/>`,
  hujansolid: `<g transform="translate(0 -5)"><path d="${AWAN}" fill="WARNA"/></g><path d="M8 17.5v4.5M12 17.5v4.5M16 17.5v4.5" stroke-width="2.6"/>`,
  anginsolid: `<g stroke-width="3.2">${P.angin}</g>`,
};
for (const [n, d] of Object.entries(SOLID)) for (const [w, c] of Object.entries(W)) {
  await pg.setContent(`<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d.replaceAll('WARNA', c)}</svg></body></html>`);
  await (await pg.$('svg')).screenshot({path: `${KE}/ik/${n}-${w}.png`, omitBackground: true});
}
// 11 Nov pemilik ("arah panahnya bisa disesuain sama arah sektornya"): panah 16 arah mata angin, panah<i> = i x 22,5 derajat dari utara searah jarum jam
for (let i = 0; i < 16; i++) for (const w of ['kering', 'oranye', 'navy']) {
  await pg.setContent(`<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${W[w]}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><g transform="rotate(${i * 22.5} 12 12)"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></g></svg></body></html>`);
  await (await pg.$('svg')).screenshot({path: `${KE}/ik/panah${i}-${w}.png`, omitBackground: true});
}
// 11 Nov pemilik (usul gambar mata angin): ikon jarum kompas, lingkaran + titik utara + jarum terisi menunjuk arah sektor
for (let i = 0; i < 16; i++) {
  const c = W.kering;
  await pg.setContent(`<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10.2"/><circle cx="12" cy="1.8" r="1.3" fill="${c}" stroke="none"/><g transform="rotate(${i * 22.5} 12 12)"><path d="M12 3.6 15 12 12 10.6 9 12Z" fill="${c}"/><path d="M12 20.4 15 12 12 13.4 9 12Z" fill="#FFFFFF" stroke-width="1.2"/></g></svg></body></html>`);
  await (await pg.$('svg')).screenshot({path: `${KE}/ik/kompas${i}-kering.png`, omitBackground: true});
}
await b.close(); console.log('ikon', Object.keys(P).length * Object.keys(W).length);
