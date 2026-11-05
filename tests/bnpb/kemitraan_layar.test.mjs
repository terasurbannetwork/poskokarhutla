/* Uji LAYAR Kemitraan Kampus (RU §2.3), bagian cangkang KM-A10: L7 tanpa sesi, L8 tema gelap, L9 INP; hak per tampilan.
   Uji statis (tanpa Chrome) selalu jalan; uji peramban memakai worker utuh + D1 (pola layar.test.mjs) dan DILEWATI dengan pesan bila tak ada Chrome.
   Isi tiap tampilan diuji di tiket tampilannya (L1-L6); di sini hanya cangkang. Nama uji ditulis literal: cakupan.json menunjuk potongan namanya. */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync} from "node:fs";
import vm from "node:vm";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {buatDunia} from "./_dunia.mjs";

const AKAR = new URL("../../", import.meta.url).pathname;
const baca = p => readFileSync(AKAR + p, "utf8");
const TAMPILAN = ["daerah", "masalah", "riset", "dana", "satgas", "talenta", "kampus", "dasbor"];
const UKURAN = [[1440, 900], [390, 844]];
const TERLARANG = /\bNaN\b|\bundefined\b|\bnull\b|\[object|—|\bAnda\b/g;
/* bukan galat halaman: favicon, dan 401 dari /api/kemitraan/saya saat tanpa sesi (itu memang jawabannya) */
/* harness _dunia.mjs menyajikan statis tanpa content-type, jadi modul /inti/kepala.js ditolak peramban; di produksi ASSETS menyajikannya bertipe benar (bukan galat halaman) */
const KEPALA_MIME = /Failed to load module script.*\/inti\/kepala\.js/;
const bukanFavicon = g => !/favicon\.ico/.test(g) && !KEPALA_MIME.test(g);
const wajar = g => bukanFavicon(g) && !/status of 401/.test(g);

/* ---------------- statis ---------------- */
test("cangkang KM statis: kemitraan.html tanpa skrip atau gaya inline dan memuat inti serta 8 tampilan", () => {
  const h = baca("public/kemitraan.html");
  assert.deepEqual([...h.matchAll(/<script\b([^>]*)>/gi)].filter(m => !/\bsrc\s*=/.test(m[1])), [], "ada <script> tanpa src; CSP script-src 'self' memblokirnya");
  assert.ok(!/<style\b|\sstyle\s*=|\son[a-z]+\s*=\s*["']|javascript:/i.test(h), "ada gaya atau handler inline di kemitraan.html (CSP)");
  for (const f of ["inti", ...TAMPILAN]) assert.ok(h.includes(`/kemitraan/${f}.js`), `kemitraan.html tidak memuat /kemitraan/${f}.js`);
  for (const id of ["kmAngka", "kmTampil", "kmMasuk", "kmGalat", "kmMuat", "kmLembar", "kmSheet", "kmDpBar", "kmTip", ...TAMPILAN.map(t => "kmv-" + t)])
    assert.ok(h.includes(`id="${id}"`), `kemitraan.html tidak punya #${id} (DS §3)`);
  assert.ok(h.indexOf('href="/inti/tema.css"') < h.indexOf('href="/akademisi.css') && h.indexOf('href="/akademisi.css') < h.indexOf('href="/kemitraan.css'), "urutan CSS harus tema, akademisi, kemitraan (DS §1)");
});

test("cangkang KM statis: tiap .km-w-<kunci> di kemitraan.css cocok KM.RUMPUN dan warnanya sama dengan akademisi.js", () => {
  const lit = t => { const m = /const RUMPUN = (\{[\s\S]*?\n  \});/.exec(t); assert.ok(m, "literal RUMPUN tidak ditemukan"); return JSON.parse(JSON.stringify(vm.runInNewContext("(" + m[1] + ")"))); };   // lewat JSON: objek lintas konteks vm beda prototipe
  const km = lit(baca("public/kemitraan/inti.js")), ak = lit(baca("public/akademisi.js")), css = baca("public/kemitraan.css");
  assert.deepEqual(km, ak, "KM.RUMPUN menyimpang dari RUMPUN akademisi.js");
  const aturan = Object.fromEntries([...css.matchAll(/\.km-w-([a-z0-9-]+)\{--w:([^;}]+);--w0:([^;}]+);--gw:([^;}]+)\}/g)].map(m => [m[1], m.slice(2, 5)]));
  for (const [k, [, , w]] of Object.entries(km)) {
    const s = k.replace(/ /g, "-");
    assert.ok(aturan[s], `kemitraan.css tidak punya .km-w-${s} untuk rumpun "${k}"`);
    assert.deepEqual(aturan[s], [w, w, w], `.km-w-${s} warnanya ${aturan[s]} != ${w}`);
  }
  for (const s of ["udara", "multi", "p1", "p2", "p3"]) assert.ok(aturan[s], `kemitraan.css tidak punya .km-w-${s}`);
  const lebih = Object.keys(aturan).filter(s => !(s in Object.fromEntries(Object.keys(km).map(k => [k.replace(/ /g, "-"), 1]))) && !["udara", "multi", "p1", "p2", "p3"].includes(s));
  assert.deepEqual(lebih, [], "ada .km-w-* di CSS yang tidak ada di KM.RUMPUN: " + lebih.join(", "));
});

test("cangkang KM tampilan: tiap berkas mendaftar KM.tampilan dengan bangun dan angka (4 butir) dan menampilkan kosongHtml", () => {
  assert.deepEqual(readdirSync(AKAR + "public/kemitraan").filter(n => /\.js$/.test(n) && !["inti.js", "konst.js", "hitung.js", "peta.js", "panduan.js"].includes(n)).sort(), TAMPILAN.map(t => t + ".js").sort(), "berkas tampilan di public/kemitraan tidak sama dengan 8 tampilan DS §3");
  for (const t of TAMPILAN) {
    const s = baca(`public/kemitraan/${t}.js`);
    assert.match(s, new RegExp(`KM\\.tampilan\\.${t}\\s*=\\s*\\{`), `${t}.js tidak mendaftar KM.tampilan.${t}`);
    assert.match(s, /bangun\(el\)/, `${t}.js tanpa bangun(el)`);
    assert.match(s, /kosongHtml\(/, `${t}.js tidak menampilkan kosongHtml()`);
    const a = /const angka = \(\) => \[(.*)\];/.exec(s);
    assert.ok(a && (a[1].match(/\[IK\./g) || []).length === 4, `${t}.js: angka() harus 4 butir [ikon, nilai, label] (DS §3), dapat ${a ? (a[1].match(/\[IK\./g) || []).length : "tidak ada"}`);
  }
});

/* ---------------- peramban ---------------- */
const CHROME = cariChrome();
if (!CHROME) {
  test("uji layar Kemitraan DILEWATI: Chrome tidak ditemukan", {skip: "tidak ada Chrome/Chromium (set CHROME_BIN atau pasang Google Chrome)"}, () => {});
} else {
  let dunia, br, tab;
  before(async () => { dunia = await buatDunia(); br = await bukaPeramban(CHROME); tab = await br.tab(); });
  after(async () => { await tab?.tutup(); await br?.tutup(); await dunia?.tutup(); });

  const staf = () => tab.cookie(dunia.base, "sesi_admin", dunia.sesi);
  const tamu = () => tab.kirim("Network.deleteCookies", {name: "sesi_admin", url: dunia.base});
  const buka = async (jalur, [w, ht], pra) => {
    await tab.ukuran(w, ht);
    /* pra: sumber JS yang dijalankan sebelum skrip halaman (mis. mengganti jawaban /api/kemitraan/saya untuk peran lain) */
    const id = pra ? (await tab.kirim("Page.addScriptToEvaluateOnNewDocument", {source: pra})).identifier : null;
    try { await tab.buka(dunia.base + jalur, {tunggu: "body *"}); await tab.tungguFungsi("document.readyState === 'complete'"); await new Promise(r => setTimeout(r, 900)); }
    finally { if (id) await tab.kirim("Page.removeScriptToEvaluateOnNewDocument", {identifier: id}); }
  };
  const sebagai = peran => `(() => { const f = window.fetch; window.fetch = (u, o) => String(u).includes("/api/kemitraan/saya") ? Promise.resolve(new Response(JSON.stringify({jenis: ${JSON.stringify(peran)}}), {status: 200, headers: {"content-type": "application/json"}})) : f(u, o); })()`;
  const tombol = () => tab.eval("[...document.querySelectorAll('#kmTampil button')].map(b => b.dataset.t)");

  test("cangkang KM L7: tanpa sesi /kemitraan menampilkan layar masuk, bukan galat", async () => {
    await tamu();
    for (const uk of UKURAN) {
      await buka("/kemitraan", uk);
      const k = await tab.eval(`({masuk: !document.querySelector('#kmMasuk').hidden, galat: !document.querySelector('#kmGalat').hidden, muat: !document.querySelector('#kmMuat').hidden, seg: !document.querySelector('#kmTampil').hidden,
        tombol: !!document.querySelector('#kmMasuk a[href*="/admin"]') && !!document.querySelector('#kmMasuk a[href="/kemitraan/masuk"]'), panel: document.querySelectorAll('.ak-tampilan:not([hidden])').length})`);
      assert.deepEqual(k, {masuk: true, galat: false, muat: false, seg: false, tombol: true, panel: 0}, `${uk[0]}: layar masuk salah: ${JSON.stringify(k)}`);
      assert.deepEqual(tab.galat().filter(wajar), [], `${uk[0]}: tanpa sesi tidak boleh ada galat konsol/CSP`);
      assert.ok(!TERLARANG.test(await tab.teks()), `${uk[0]}: teks terlarang di layar masuk`);
      const lb = await tab.lebihLebar(); assert.ok(lb.sw <= uk[0] + 1, `${uk[0]}: scroll horizontal ${lb.sw}`);
    }
  });

  test("cangkang KM staf: delapan segmen, pita empat angka en dash, satu panel tampil, tanpa galat", async () => {
    await staf();
    for (const uk of UKURAN) {
      await buka("/kemitraan?tampil=daerah", uk);
      assert.deepEqual(await tombol(), TAMPILAN, `${uk[0]}: segmen tampilan staf`);
      const p = await tab.eval(`({n: document.querySelectorAll('#kmAngka > div').length, b: [...document.querySelectorAll('#kmAngka b')].map(x => x.textContent), lbl: document.querySelector('#kmAngka span').textContent,
        tampil: [...document.querySelectorAll('.ak-tampilan:not([hidden])')].map(x => x.id), kosong: document.querySelectorAll('#kmv-daerah .ak-kosong').length, tekan: document.querySelector('#kmTampil [aria-pressed=true]').dataset.t})`);
      assert.equal(p.n, 4, `${uk[0]}: pita harus 4 butir`); assert.deepEqual(p.b.slice(2), ["–", "–"], `${uk[0]}: null harus en dash, bukan nol: ${p.b}`);   // tervalidasi dan kunjungan menunggu API (KM-B06 mengisi dua angka pertama dari ringkas.json)
      assert.equal(p.lbl, "Kab/kota berprofil"); assert.deepEqual(p.tampil, ["kmv-daerah"]); assert.equal(p.tekan, "daerah");
      assert.deepEqual(tab.galat().filter(bukanFavicon), [], `${uk[0]}: galat konsol/CSP`);
      assert.ok(!TERLARANG.test(await tab.teks()), `${uk[0]}: teks terlarang`);
      const lb = await tab.lebihLebar(); assert.ok(lb.sw <= uk[0] + 1, `${uk[0]}: scroll horizontal ${lb.sw}`);
    }
    /* klik tiap segmen: panel, pita, URL dan localStorage ikut; panel dibangun sekali */
    await buka("/kemitraan", UKURAN[0]);
    for (const t of TAMPILAN) {
      await tab.klik(`#kmTampil [data-t="${t}"]`);
      await tab.tungguFungsi(`localStorage.getItem("km-tampil") === ${JSON.stringify(t)}`);
      const s = await tab.eval(`({tampil: [...document.querySelectorAll('.ak-tampilan:not([hidden])')].map(x => x.id), url: new URL(location.href).searchParams.get("tampil"), pita: document.querySelector('#kmAngka span').textContent, isi: document.querySelector('#kmv-${t}').children.length})`);
      assert.deepEqual([s.tampil, s.url], [["kmv-" + t], t], `klik ${t}: panel/URL salah ${JSON.stringify(s)}`);
      assert.ok(s.pita && s.isi > 0, `klik ${t}: pita atau isi kosong ${JSON.stringify(s)}`);
    }
    await buka("/kemitraan", UKURAN[0]);   // tampilan terakhir diingat
    assert.equal(await tab.eval("document.querySelector('#kmTampil [aria-pressed=true]').dataset.t"), "dasbor", "localStorage km-tampil tidak dipakai saat buka tanpa ?tampil=");
    await buka("/kemitraan?tampil=riset", UKURAN[0]);
    assert.equal(await tab.eval("document.querySelector('#kmTampil [aria-pressed=true]').dataset.t"), "riset", "?tampil= harus menang atas ingatan");
    /* helper angka: tahun kosong tidak jadi nol, seri nol semua tidak meledak, desimal maks 1 */
    const g = await tab.eval(`(() => { const d = document.createElement("div"); d.innerHTML = KM.grafik([[2019, 5], [2020, null], [2021, 3]], "Uji", "banjir", {satuan: "kejadian", sumber: "DIBI"});
      return {nilai: [...d.querySelectorAll(".ak-gr-nilai")].map(x => x.textContent), tahun: [...d.querySelectorAll(".ak-gr-tahun")].map(x => x.textContent), cap: d.querySelector(".ak-gcap").textContent,
        sumber: d.querySelector("small")?.textContent, nol: KM.grafik([[2019, 0], [2020, 0]], "Nol", "banjir"), fmt: [KM.fmt(null), KM.fmt(0.4732), KM.fmt(12345)]}; })()`);
    assert.deepEqual([g.nilai, g.tahun], [["5", "3"], ["2019", "2021"]], `grafik: tahun tanpa data harus dilewati, bukan nol: ${JSON.stringify(g)}`);
    assert.match(g.cap, /Puncak 2019: 5 kejadian/); assert.equal(g.sumber, "Sumber: DIBI");
    assert.equal(g.nol, "", "grafik seri nol semua: kosong, bukan galat");
    assert.deepEqual(g.fmt, ["–", "0,5", "12.345"], "fmt: null en dash, maks 1 desimal, titik ribuan");
  });

  test("cangkang KM hak: BP hanya daerah dan masalah, KK tanpa dasbor, AG tanpa tampilan", async () => {
    await staf();
    await buka("/kemitraan?tampil=dasbor", UKURAN[0], sebagai("BP"));
    assert.deepEqual(await tombol(), ["daerah", "masalah"], "BP");
    assert.equal(await tab.eval("document.querySelector('#kmTampil [aria-pressed=true]').dataset.t"), "daerah", "BP minta dasbor harus jatuh ke daerah, bukan membuka dasbor");
    assert.equal(await tab.eval("document.querySelectorAll('.ak-tampilan:not([hidden])').length"), 1);
    await buka("/kemitraan", UKURAN[0], sebagai("KK"));
    assert.deepEqual(await tombol(), TAMPILAN.filter(t => t !== "dasbor"), "KK");
    await buka("/kemitraan", UKURAN[0], sebagai("PM")); assert.deepEqual(await tombol(), TAMPILAN, "PM");
    await buka("/kemitraan", UKURAN[0], sebagai("AG"));
    const a = await tab.eval("({galat: !document.querySelector('#kmGalat').hidden, teks: document.querySelector('#kmGalat').textContent, seg: !document.querySelector('#kmTampil').hidden, panel: document.querySelectorAll('.ak-tampilan:not([hidden])').length})");
    assert.deepEqual([a.galat, a.seg, a.panel], [true, false, 0], "AG: " + JSON.stringify(a)); assert.match(a.teks, /Saya/);
  });

  test("cangkang KM L1: tampilan daerah memuat pita, kartu 24 per halaman, cari 'pulang' satu kartu, tanpa galat", async () => {
    await staf();
    for (const uk of UKURAN) {
      await buka("/kemitraan?tampil=daerah", uk);
      await tab.tungguFungsi("document.querySelectorAll('#kmv-daerah .km-daerah').length > 0");
      const k = await tab.eval(`({pita: [...document.querySelectorAll('#kmAngka b')].map(x => x.textContent), kartu: document.querySelectorAll('#kmv-daerah .km-daerah').length, hal: !!document.querySelector('#kmDHal [data-h="2"]'), chip: document.querySelectorAll('#kmv-daerah .ak-chip button').length})`);
      assert.ok(k.pita[0] !== "–" && k.pita[1] !== "–", `${uk[0]}: dua angka pita pertama harus terisi: ${k.pita}`);
      assert.equal(k.kartu, 24, `${uk[0]}: halaman pertama harus 24 kartu, dapat ${k.kartu}`); assert.ok(k.hal && k.chip >= 6, `${uk[0]}: paginasi atau chip hilang ${JSON.stringify(k)}`);
      await tab.eval(`(() => { const i = document.getElementById("kmDQ"); i.value = "pulang"; i.dispatchEvent(new Event("input", {bubbles: true})); })()`);
      await tab.tungguFungsi("document.querySelectorAll('#kmv-daerah .km-daerah').length === 1");
      assert.match(await tab.eval("document.querySelector('#kmv-daerah .km-daerah h3').textContent"), /Pulang Pisau/);
      assert.deepEqual(tab.galat().filter(bukanFavicon), [], `${uk[0]}: galat konsol/CSP`);
      assert.ok(!TERLARANG.test(await tab.teks()), `${uk[0]}: teks terlarang di daerah`);
      const lb = await tab.lebihLebar(); assert.ok(lb.sw <= uk[0] + 1, `${uk[0]}: scroll horizontal ${lb.sw}`);
    }
  });

  test("cangkang KM L2: lembar daerah menampilkan kepala di bawah 100 ms, tab bab berisi, ikon Buku menuju /kemitraan/buku", async () => {
    await staf();
    for (const uk of UKURAN) {
      await buka("/kemitraan?tampil=daerah", uk);
      await tab.tungguFungsi("document.querySelectorAll('#kmv-daerah .km-daerah').length > 0");
      const o = await tab.eval(`(async () => { const kartu = document.querySelector('#kmv-daerah .km-daerah[data-kab="6211"]') || document.querySelector('#kmv-daerah .km-daerah'); const t0 = performance.now(); kartu.click();
        while (document.querySelector('#kmSheet').hidden || !document.querySelector('#kmSheet .ak-dkepala h2')) await new Promise(r => requestAnimationFrame(() => r()));
        return {dt: performance.now() - t0, nama: document.querySelector('#kmSheet .ak-dkepala h2').textContent, buku: document.querySelector('#kmSheet .ak-dkepala a.km-ik').getAttribute('href'), kab: new URL(location.href).searchParams.get('kab')}; })()`);
      assert.ok(o.dt < 100, `${uk[0]}: kepala lembar tampil ${o.dt.toFixed(1)} ms >= 100 ms`);
      assert.match(o.buku, /^\/kemitraan\/buku\?kab=\d{4}$/); assert.equal(o.buku.slice(-4), o.kab, "?kab= harus mengikuti lembar");
      for (const bab of ["1", "2", "3", "4", "5", "6", "7", "9"]) {
        await tab.tungguFungsi(`!!document.querySelector('#kmSheet .km-bab [data-bab="${bab}"]')`);   // kerangka lembar dipasang lewat KM.nanti
        await tab.klik(`#kmSheet .km-bab [data-bab="${bab}"]`);
        await tab.tungguFungsi(`document.querySelector('#kmBabIsi') && document.querySelector('#kmBabIsi').children.length > 0 && !document.querySelector('#kmBabIsi .ak-hantu')`);
        const t = await tab.eval("document.querySelector('#kmBabIsi').textContent");
        assert.ok(t.trim().length > 20 && !TERLARANG.test(t) && !/\{|\[object/.test(t), `${uk[0]}: bab ${bab} kosong atau bocor: ${t.slice(0, 120)}`);
      }
      const lb = await tab.lebihLebar(); assert.ok(lb.sw <= uk[0] + 1, `${uk[0]}: scroll horizontal ${lb.sw}`);
      assert.deepEqual(tab.galat().filter(bukanFavicon), [], `${uk[0]}: galat konsol/CSP di lembar`);
    }
    /* buka kab, tutup, buka kab yang sama lagi: data sudah di memo, lembar tidak boleh macet di kerangka .ak-hantu */
    await buka("/kemitraan?tampil=daerah&q=pulang", UKURAN[0]);   // ?q= menyaring ke satu kartu (6211 tidak di halaman pertama)
    await tab.tungguFungsi("document.querySelectorAll('#kmv-daerah .km-daerah').length > 0");
    for (const putaran of [1, 2, 3]) {
      await tab.eval(`document.querySelector('#kmv-daerah .km-daerah[data-kab="6211"]').click()`);
      await tab.tungguFungsi("document.querySelector('#kmBabIsi') && document.querySelector('#kmBabIsi').children.length > 0 && !document.querySelector('#kmBabIsi .ak-hantu')");
      assert.ok((await tab.eval("document.querySelector('#kmBabIsi').textContent")).trim().length > 20, `buka ke-${putaran}: bab 1 kosong`);
      await tab.eval("KM.tutupSheet()");
    }
    await buka("/kemitraan?tampil=daerah&kab=6211", UKURAN[0]);   // ?kab= membuka lembar langsung
    await tab.tungguFungsi("!document.querySelector('#kmSheet').hidden && document.querySelector('#kmBabIsi') && !document.querySelector('#kmBabIsi .ak-hantu')");
    assert.match(await tab.eval("document.querySelector('#kmSheet .ak-dkepala h2').textContent"), /Pulang Pisau/);
  });

  test("cangkang KM L2b: bab Wilayah menggambar peta provinsi dengan kab terpilih disorot, bab Panduan memuat daftar pertanyaan tanpa slot kosong", async () => {
    await staf();
    for (const uk of UKURAN) {
      await buka("/kemitraan?tampil=daerah&kab=6211", uk);
      await tab.tungguFungsi("!!document.querySelector('#kmBabIsi svg.km-peta-wil')");
      const pt = await tab.eval(`(() => { const s = document.querySelector('#kmBabIsi svg.km-peta-wil'); return {n: s.querySelectorAll('path:not(.km-celah)').length, pilih: s.querySelectorAll('path.pilih').length, tt: s.querySelector('path.pilih')?.dataset.tt, akhir: s.lastElementChild === s.querySelector('path.pilih'), w: s.getBoundingClientRect().width}; })()`);
      assert.ok(pt.n >= 5, `${uk[0]}: peta hanya ${pt.n} kab`);
      assert.equal(pt.pilih, 1, `${uk[0]}: harus tepat satu kab disorot`);
      assert.ok(pt.akhir, `${uk[0]}: kab terpilih harus digambar terakhir supaya garis tebalnya tidak tertimpa`);
      assert.match(pt.tt, /Pulang Pisau/, `${uk[0]}: tooltip kab terpilih: ${pt.tt}`);
      assert.ok(pt.w > 100 && pt.w <= uk[0], `${uk[0]}: lebar peta ${pt.w}`);
      await tab.klik('#kmSheet .km-bab [data-bab="9"]');
      await tab.tungguFungsi("document.querySelectorAll('#kmBabIsi ol.km-tanya > li').length > 20");
      const t = await tab.eval("document.querySelector('#kmBabIsi').textContent");
      assert.ok(!TERLARANG.test(t) && !/[{}]|\[object/.test(t), `${uk[0]}: panduan bocor: ${t.slice(0, 120)}`);
      assert.deepEqual(await tab.eval("[...document.querySelectorAll('#kmBabIsi a[href^=\"/kemitraan/panduan\"]')].every(a => /^\\/kemitraan\\/panduan\\?kab=6211(&masalah=[^&\\s]+)?$/.test(a.getAttribute('href')))"), true, "tautan cetak panduan harus ?kab=&masalah=");
      assert.deepEqual(tab.galat().filter(bukanFavicon), [], `${uk[0]}: galat konsol/CSP di bab peta/panduan`);
    }
    /* halaman cetak /kemitraan/panduan: dengan masalah (judul masalah + riset) dan tanpa kab (pesan, bukan galat) */
    await buka("/kemitraan/panduan?kab=6211", UKURAN[0]);
    await tab.tungguFungsi("document.querySelectorAll('#pdIsi ol.km-tanya > li').length > 20");
    const pd = await tab.eval("({h1: document.querySelector('#pdJudul').textContent, teks: document.querySelector('#pdIsi').textContent, ns: document.querySelectorAll('#pdIsi details').length})");
    assert.match(pd.h1, /Pulang Pisau/); assert.equal(pd.ns, 8, "8 narasumber"); assert.ok(!TERLARANG.test(pd.teks) && !/[{}]/.test(pd.teks), "panduan cetak bocor");
    await buka("/kemitraan/panduan", UKURAN[0]);
    await tab.tungguFungsi("document.querySelector('#pdIsi .ak-kosong')");
    assert.deepEqual(tab.galat().filter(bukanFavicon), [], "galat konsol/CSP di halaman panduan");
  });

  /* kontras WCAG dari computed style: warna apa pun yang diterima canvas (oklch, color-mix) diubah ke sRGB lewat piksel */
  const KONTRAS = `(sel) => { const cv = document.createElement("canvas").getContext("2d", {willReadFrequently: true});
    const rgb = c => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = "#000"; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return [...cv.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const lum = ([r, g, b]) => { const f = v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
    return [...document.querySelectorAll(sel)].map(e => { const kartu = e.closest(".ak-panel, .ak-orang"); const a = lum(rgb(getComputedStyle(e).color)), b = lum(rgb(getComputedStyle(kartu).backgroundColor));
      return {sel: e.tagName + "." + kartu.className, kontras: (Math.max(a, b) + .05) / (Math.min(a, b) + .05)}; }); }`;
  test("cangkang KM L8: tema gelap kontras teks kartu minimal 4,5:1 (juga terang)", async () => {
    await staf();
    await buka("/kemitraan?tampil=daerah", UKURAN[0]);
    for (const tema of ["dark", "light"]) {
      await tab.eval(`document.documentElement.dataset.theme = ${JSON.stringify(tema)}`);
      await new Promise(r => setTimeout(r, 200));
      const k = await tab.eval(`(${KONTRAS})("#kmv-daerah .ak-orang h3, #kmv-daerah .ak-orang .ak-mlabel, #kmv-daerah .ak-orang .ak-metrik b")`);
      assert.ok(k.length >= 2, `${tema}: tidak ada teks kartu untuk diukur`);
      for (const x of k) assert.ok(x.kontras >= 4.5, `${tema}: kontras ${x.kontras.toFixed(2)} < 4,5 pada ${x.sel}`);
    }
    assert.equal(await tab.eval("getComputedStyle(document.querySelector('#kmv-daerah .ak-orang')).backgroundColor !== getComputedStyle(document.body).backgroundColor"), true, "kartu harus beda dari latar halaman di tema terang");
  });

  test("cangkang KM L9: klik segmen ke bingkai berikutnya di bawah 100 ms", async () => {
    await staf();
    for (const uk of UKURAN) {
      await buka("/kemitraan?tampil=daerah", uk);
      const ukur = await tab.eval(`(async () => { const hasil = {}; for (const t of ${JSON.stringify(TAMPILAN.slice(1))}.concat(["daerah"])) { const b = document.querySelector('#kmTampil [data-t="' + t + '"]');
        const t0 = performance.now(); b.click(); await new Promise(r => requestAnimationFrame(() => r())); const dt = performance.now() - t0;
        hasil[t] = {dt, tampil: !document.querySelector('#kmv-' + t).hidden}; await new Promise(r => setTimeout(r, 250)); } return hasil; })()`);
      for (const [t, x] of Object.entries(ukur)) {
        assert.ok(x.tampil, `${uk[0]}: panel ${t} tidak tampil di bingkai berikutnya`);
        assert.ok(x.dt < 100, `${uk[0]}: klik ${t} ke bingkai berikutnya ${x.dt.toFixed(1)} ms >= 100 ms (INP buruk; bangun() harus lewat nanti())`);
      }
    }
  });
}
