// Cetak ringkas.html (3 lembar) ke PDF; laporkan lembar yang isinya meluap.
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const DI = path.dirname(fileURLToPath(import.meta.url));
const { luncur } = await import(pathToFileURL('D:/Project/Work/BNPB/poskokarhutla/data/laporan-bnpb/generator/pw.mjs').href);
const keluar = process.argv[2] || path.join(DI, 'Laporan Bencana Oktober 2026 Ringkas v2.pdf');
const b = await luncur();
const p = await b.newPage({ viewport: { width: 794, height: 1123 } });
await p.goto(pathToFileURL(path.join(DI, 'ringkas.html')).href, { waitUntil: 'load' });
await p.emulateMedia({ media: 'print' });
const luap = await p.$$eval('.lembar', ls => ls.map((l, i) => {
  const kaki = l.querySelector('.kaki');
  const anak = [...l.children].filter(c => c !== kaki);
  const bawah = Math.max(...anak.map(c => c.getBoundingClientRect().bottom));
  return { lembar: i + 1, sisa_px: Math.round(kaki.getBoundingClientRect().top - bawah), luap: l.scrollHeight > l.clientHeight + 1 };
}));
console.log(JSON.stringify(luap));
await p.pdf({ path: keluar, format: 'A4', printBackground: true, preferCSSPageSize: true });
await b.close();
console.log('pdf', keluar);
