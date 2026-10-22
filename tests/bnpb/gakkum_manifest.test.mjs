/* Uji layar Berkas Gakkum: manifest bukti ber-hash, rantai kustodi, hash media dari API (bukan dihitung ulang), cetak A4.
   Bukti lapangan di-mock di peramban (fetch /api/ops/bukti) supaya dua keadaan teruji: media ber-sha256 dan media lama tanpa sha256. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {buatDunia} from "./_dunia.mjs";

const CHROME = cariChrome(), SHA = "a".repeat(63) + "b";
if (!CHROME) test("uji manifest Gakkum DILEWATI: Chrome tidak ditemukan", {skip: "tidak ada Chrome"}, () => {});
else {
  let dunia, br, tab;
  before(async () => { dunia = await buatDunia(); br = await bukaPeramban(CHROME); tab = await br.tab(); await tab.cookie(dunia.base, "sesi_admin", dunia.sesi); });
  after(async () => { await tab?.tutup(); await br?.tutup(); await dunia?.tutup(); });

  test("manifest: hash sama dengan SHA-256 byte unduhan, hash media dari API, media lama diberi keterangan, kustodi tampil, cetak A4", async () => {
    await tab.ukuran(1440, 900);
    await tab.buka(dunia.base + "/admin/gakkum", {tunggu: "table tr"});
    await tab.tungguFungsi("document.querySelectorAll('#gkIsi button[data-berkas]').length >= 1");
    /* titik di dalam poligon konsesi pertama (pindai kisi) + bukti palsu berisi dua media */
    await tab.eval(`(async () => {
      const prov = document.getElementById('gkProv').value, d = await (await fetch('/data/konsesi2026/' + prov + '.json')).json();
      const id = document.querySelector('#gkIsi button[data-berkas]').dataset.berkas, r = d.perusahaan.find(x => x.id === id);
      const cin = (x, y, c) => { let d = false; for (let i = 0, j = c.length - 1; i < c.length; j = i++) { const [xi, yi] = c[i], [xj, yj] = c[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) d = !d; } return d; };
      const ps = r.geom.flatMap(g => g.type === 'Polygon' ? [g.coordinates] : g.coordinates), c = ps[0][0];
      const xs = c.map(p => p[0]), ys = c.map(p => p[1]); let hit = null;
      for (let a = 1; a < 40 && !hit; a++) for (let b = 1; b < 40 && !hit; b++) { const x = Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * a / 40, y = Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * b / 40; if (ps.some(p => cin(x, y, p[0]) && !p.slice(1).some(h => cin(x, y, h)))) hit = [x, y]; }
      const asli = window.fetch.bind(window);
      window.fetch = (u, o) => String(u).startsWith('/api/ops/bukti') ? Promise.resolve(new Response(JSON.stringify({tugas: [{id: 't1', prov: '64', kab: 'X', kec: 'Y', lat: hit[1], lon: hit[0], waktu_deteksi: 1760000000000, padam: 'terverifikasi', padam_pada: 1760003600000, isian: [], media: [
        {id: 'm1', jenis: 'foto', url: '/api/instansi/admin/media/m1', thumb: '/x.png', exif_waktu: 1760000100000, exif_lat: hit[1], exif_lon: hit[0], gps_curiga: false, sha256: '${SHA}', instansi: 'BPBD Uji', dibuat: 1760000200000},
        {id: 'm2', jenis: 'foto', url: '/api/instansi/admin/media/m2', thumb: '/x.png', exif_waktu: null, gps_curiga: true}]}]}))) : asli(u, o);
      document.querySelector('#gkIsi button[data-berkas]').click();
    })()`);
    await tab.tungguFungsi("!!document.getElementById('gkHashMan')", 10000);
    const t = await tab.eval("document.getElementById('gkLembar').innerText");
    assert.ok(t.includes(SHA), "sha256 dari API tidak tampil");
    assert.ok(t.includes("hash belum tercatat (unggahan sebelum 0044)"), "media tanpa sha256 tidak diberi keterangan");
    assert.ok(/8\. Manifest bukti/.test(t) && /9\. Rantai kustodi/.test(t) && /BPBD Uji/.test(t) && /Super Admin/.test(t), "manifest atau kustodi tidak lengkap");
    assert.ok(/shasum -a 256 manifest\.json/.test(t) && /bukan bahwa isinya benar/.test(t) && /Bahan awal, bukan alat bukti sah/.test(t));
    /* tangkap byte unduhan, bandingkan dengan hash di layar (dihitung di Node, bukan di peramban) */
    const teks = await tab.eval(`(async () => { let b; const asli = URL.createObjectURL; URL.createObjectURL = x => { b = x; return asli.call(URL, x); }; document.getElementById('gkUnduhMan').click(); return await b.text(); })()`);
    const layar = await tab.eval("document.getElementById('gkHashMan').textContent");
    assert.equal(createHash("sha256").update(teks, "utf8").digest("hex"), layar, "hash manifest di layar != SHA-256 byte berkas unduhan");
    const j = JSON.parse(teks), media = j.item.filter(b => b.jenis === "media_lapangan");
    assert.deepEqual(media.map(m => m.sha256), [SHA, null], "sha256 manifest harus dari API, null bila tidak ada");
    assert.equal(media[0].instansi, "BPBD Uji");
    assert.ok(j.item.every((b, i) => b.no === i + 1) && j.item[0].jenis === "berkas_data");
    assert.equal(teks, JSON.stringify(JSON.parse(teks)), "bentuk berkas harus ringkas tanpa spasi");
    assert.deepEqual(tab.galat().filter(g => !/favicon|x\.png/.test(g)), []);
    /* cetak: A4, kotak lembar tidak melebar */
    await tab.kirim("Emulation.setEmulatedMedia", {media: "print"});
    const pdf = Buffer.from((await tab.kirim("Page.printToPDF", {preferCSSPageSize: true, printBackground: true})).data, "base64").toString("latin1");
    await tab.kirim("Emulation.setEmulatedMedia", {media: ""});
    const hal = +(/\/Type\s*\/Pages[^>]*\/Count (\d+)/.exec(pdf)?.[1] ?? /\/Count (\d+)/.exec(pdf)?.[1]);
    assert.ok(hal >= 1 && hal <= 8, "jumlah halaman cetak " + hal);
    const mb = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/.exec(pdf);
    if (mb) assert.ok(Math.abs(+mb[1] - 595.3) < 2 && Math.abs(+mb[2] - 841.9) < 2, `bukan A4: ${mb[1]}x${mb[2]}`);
  });
}
