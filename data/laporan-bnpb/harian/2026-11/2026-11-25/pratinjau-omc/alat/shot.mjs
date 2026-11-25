import { pathToFileURL } from 'node:url';
const { luncur } = await import(pathToFileURL('D:/Project/Work/BNPB/poskokarhutla/data/laporan-bnpb/generator/pw.mjs').href);
const D = process.argv[2];
const b = await luncur(); const pg = await b.newPage({viewport: {width: 1600, height: 900}, deviceScaleFactor: 1.5});
for (const n of ['slide1', 'slide2']) {
  await pg.goto(pathToFileURL(`${D}/${n}.html`).href); await pg.waitForTimeout(300);
  await pg.screenshot({path: `${D}/${n}.png`});
}
await b.close(); console.log('shot ok');
const b2 = await luncur(); const p2 = await b2.newPage({viewport: {width: 1456, height: 640}, deviceScaleFactor: 3});
await p2.goto(pathToFileURL(`${D}/konten.html`).href); await p2.waitForTimeout(300); await p2.screenshot({path: `${D}/konten.png`}); await b2.close(); console.log('konten ok');
