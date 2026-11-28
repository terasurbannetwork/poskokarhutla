// Ikon garis untuk pil kerusakan selain rumah (pemilik 20 Nov: "yang selain rumah tambahin icon juga dong"); gaya sama dengan harian_ikon.mjs:
// garis 2 px, ujung bulat, viewBox 24. Keluaran <ke>/ik_rusak/<nama>.png 96 px transparan, warna teks tabel.
import fs from 'node:fs';
import { luncur } from '../../../generator/pw.mjs';
const KE = process.argv[2], C = process.argv[3] || '#2E3440';
const IK = {
  rumah: '<path d="M3 11 12 4l9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
  sekolah: '<path d="M3 10 12 4l9 6"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/><path d="M12 4V1.5h3"/>',
  jalan: '<path d="M7 21 10 3"/><path d="M17 21 14 3"/><path d="M12 5v2.5M12 11v2.5M12 17v2.5"/>',
  jembatan: '<path d="M2 15h20"/><path d="M3 15c3-7 15-7 18 0"/><path d="M7 11.2V15M12 9.5V15M17 11.2V15"/><path d="M4 15v5M20 15v5"/>',
  listrik: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  kesehatan: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M12 8v8M8 12h8"/>',
  lahan: '<path d="M12 21v-9"/><path d="M12 12c0-4 3-6 7-6 0 4-3 6-7 6z"/><path d="M12 15c0-3.5-2.5-5.5-6.5-5.5 0 3.5 2.5 5.5 6.5 5.5z"/><path d="M5 21h14"/>',
  ibadah: '<path d="M5 21v-8a7 7 0 0 1 14 0v8z"/><path d="M12 6V3"/><path d="M3 21h18"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/>',
  dapur: '<path d="M4 11h16v3a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7z"/><path d="M9 7c0-1.5 1-1.5 1-3M14 7c0-1.5 1-1.5 1-3"/>',
  tanggul: '<path d="M3 20h18"/><path d="M6 20 8.5 9h7L18 20"/><path d="M2 8c2-1.5 3-1.5 5 0s3 1.5 5 0 3-1.5 5 0 3 1.5 5 0"/>',
  pohon: '<path d="M12 22v-7"/><path d="M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z"/><path d="M9 22h6"/>',
  gedung: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M11 21v-3h2v3"/>',
  air: '<path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z"/>',
};
fs.mkdirSync(`${KE}/ik_rusak`, {recursive: true});
const b = await luncur(); const pg = await b.newPage({viewport: {width: 96, height: 96}});
for (const [n, d] of Object.entries(IK)) {
  await pg.setContent(`<html><body style="margin:0;background:transparent"><svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${C}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg></body></html>`);
  await (await pg.$('svg')).screenshot({path: `${KE}/ik_rusak/${n}.png`, omitBackground: true});
}
await b.close();
console.log('ikon kerusakan', Object.keys(IK).join(','));
