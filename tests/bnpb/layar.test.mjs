/* Uji LAYAR Ruang Koordinasi BNPB (butir C6): Chrome sungguhan membuka tiap halaman di atas worker utuh (Miniflare) + D1 lokal berisi dummy.
   Menangkap kelas bug "layar kosong / NaN / galat konsol padahal API sehat" yang lolos dari uji worker (yang hanya memeriksa HTML dan CSP).
   Jalan: npm run uji:layar. Tanpa Chrome (CHROME_BIN / Google Chrome / Chromium) seluruh berkas DILEWATI dengan pesan, bukan gagal diam-diam.
   Sebuah uji `todo` = bug layar yang SUDAH ditemukan dan menunggu pemilik halamannya; begitu diperbaiki, hapus penanda todo (uji hijau = bukti). */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {buatDunia} from "./_dunia.mjs";
import {sha256} from "../warga/_bnpb.mjs";

const CHROME = cariChrome();
const UKURAN = [[1440, 900], [390, 844]];
/* teks terlarang di layar: nilai bocor dari bug format (NaN/undefined/null/[object), em dash, dan kata "Anda" (gaya bahasa proyek: "kamu") */
const TERLARANG = /\bNaN\b|\bundefined\b|\bnull\b|\[object|—|\bAnda\b/g;
/* permintaan otomatis peramban ke favicon bukan galat halaman */
const bukanFavicon = g => !/favicon\.ico/.test(g);

/* aksi: satu interaksi inti (desktop); sesudahnya `harus` bernilai benar dan tidak ada galat konsol baru.
   isi: ekspresi JS yang harus benar sesudah data dummy terisi (elemen utama terisi). todo: {bagian: alasan} untuk bug yang sudah dilaporkan. */
const HALAMAN = [
  {nama: "/bnpb", url: d => "/bnpb", isi: "document.querySelectorAll('h2').length >= 3 && document.querySelectorAll('a[href]').length >= 3",
    aksi: async t => { await t.eval("document.querySelector('a[href=\"/sitrep\"]').focus()"); }, harus: "document.activeElement.getAttribute('href') === '/sitrep'"},
  {nama: "/relawan", url: d => "/relawan", isi: "document.querySelector('#ringkas').innerText.length > 30 && /\\d/.test(document.querySelector('#ringkas').innerText)",
    aksi: async t => { await t.pilih("#fProv", "64"); }, harus: "document.querySelector('#fProv').value === '64'"},
  {nama: "/alun-alun", url: d => "/alun-alun", isi: "document.querySelectorAll('#daftar > *').length >= 1",
    aksi: async t => { await t.klikTeks("button", "^Tanya$"); await t.tungguFungsi("document.querySelector('#daftar') !== null"); }, harus: "document.querySelectorAll('#daftar > *').length >= 1 || document.querySelector('#daftarPesan').innerText.length > 0"},
  {nama: "/riset", url: d => "/riset", isi: "document.querySelectorAll('tr').length >= 3",
    aksi: async t => { await t.eval("document.querySelector('#fTema').selectedIndex = 1; document.querySelector('#fTema').dispatchEvent(new Event('change', {bubbles: true}))"); }, harus: "document.querySelector('#fTema').selectedIndex === 1"},
  {nama: "/risiko", url: d => "/risiko", isi: "document.querySelectorAll('#isiTabel tr').length >= 5 && document.querySelectorAll('#peta path').length >= 1",
    aksi: async t => { await t.pilih("#fProv", "64"); await t.tungguFungsi("document.querySelectorAll('#peta path').length >= 1"); }, harus: "document.querySelector('#fProv').value === '64' && document.querySelectorAll('#peta path').length >= 1"},
  {nama: "/sitrep", url: d => "/sitrep", isi: "document.querySelectorAll('#lap tr').length >= 3",
    aksi: async t => { await t.pilih("#prov", "64"); await t.tungguFungsi("document.querySelectorAll('#lap tr').length >= 1"); }, harus: "document.querySelector('#prov').value === '64' && document.querySelectorAll('#lap tr').length >= 1"},
  {nama: "/kebutuhan", berubah: true, url: d => "/kebutuhan", isi: "document.querySelectorAll('#isiTabel tr').length >= 3 && document.querySelectorAll('#kartu > *').length >= 3",
    aksi: async t => { await t.klikTeks("button", "^30 hari$"); await t.tungguFungsi("/30 hari/.test(document.querySelector('#kartu').innerText)"); }, harus: "/30 hari/.test(document.querySelector('#kartu').innerText)"},
  {nama: "/risiko-kebakaran", url: d => "/risiko-kebakaran", isi: "document.querySelectorAll('#isiTabel tr').length >= 5 && document.querySelectorAll('#peta path').length >= 200",
    aksi: async t => { await t.pilih("#fKota", "Jakarta Barat"); await t.tungguFungsi("/dari \\d+ kelurahan/.test(document.querySelector('#halTabel').innerText)"); }, harus: "document.querySelector('#fKota').value === 'Jakarta Barat' && [...document.querySelectorAll('#isiTabel td[data-label=Kota]')].every(x => x.textContent === 'Jakarta Barat')"},
  {nama: "/meja (kode petugas)", berubah: true, url: d => "/meja#k=" + d.kode.meja, isi: "document.querySelectorAll('#app button').length >= 3 && document.querySelectorAll('#app tr').length >= 1",
    aksi: async t => { await t.klikTeks("#app button", "^Logistik$"); await t.tungguFungsi("/Logistik/.test(document.querySelector('#app').innerText)"); }, harus: "/Logistik/.test(document.querySelector('#app').innerText)"},
  {nama: "/relawan/saya (kode relawan)", url: d => "/relawan/saya#k=" + d.kode.relawan, isi: "document.querySelector('#isi').innerText.length > 50 && document.querySelectorAll('#isi tr').length >= 1",
    aksi: async t => { await t.eval("document.querySelector('#isi').scrollIntoView()"); }, harus: "document.querySelector('#tanpaKode').hidden !== false || getComputedStyle(document.querySelector('#tanpaKode')).display === 'none'"},
  {nama: "/kampus (kode koordinator)", url: d => "/kampus#k=" + d.kode.kampus, isi: "document.querySelector('#isi').innerText.length > 50 && document.querySelectorAll('#isi tr').length >= 2",
    aksi: async t => { await t.eval("document.querySelector('#isi').scrollIntoView()"); }, harus: "document.querySelector('#tanpaKode').hidden !== false || getComputedStyle(document.querySelector('#tanpaKode')).display === 'none'"},
  /* admin: cookie sesi Super Admin; interaksi inti = pindah tab (tab aktif berganti dan panel tidak kosong) */
  ...[["/admin/relawan", "^Relawan$"], ["/admin/alun", "^Utas$"], ["/admin/riset", "Mitra"], ["/admin/meja", "^Logistik$"]].map(([u, tab]) => ({
    nama: u, admin: true, berubah: true, url: d => u, isi: "document.querySelectorAll('table tr').length >= 2",
    aksi: async t => { await t.klikTeks("button", tab); await t.tungguFungsi("document.querySelectorAll('table tr, .ad-kosong, .ad-kartu').length >= 1 || document.body.innerText.length > 200"); },
    harus: "document.body.innerText.length > 200"})),
  /* Layar Pimpinan: tiap kartu harus berangka (bukan "belum ada data") setelah dummy; localStorage pm_dummy=1 membuat kartu membaca ?dummy=1 */
  {nama: "/admin/pimpinan", admin: true, modul: /./, url: d => "/admin/pimpinan", pra: async (t, d) => { await t.buka(d.base + "/admin/pimpinan"); await t.eval("localStorage.setItem('pm_dummy','1')"); },
    isi: "document.querySelectorAll('.pm-k').length === 8 && [...document.querySelectorAll('.pm-k')].every(k => /\\d/.test(k.innerText) && !k.querySelector('.pm-kosong'))",
    aksi: async t => { await t.eval("window.__cetak = 0; window.print = () => { window.__cetak++; }"); await t.klik("[data-cetak]"); }, harus: "window.__cetak === 1"},
  {nama: "/admin/pengingat", admin: true, modul: /^(pengingat|alun|meja|relawan)/, url: d => "/admin/pengingat", isi: "document.querySelectorAll('tbody tr[data-id]').length >= 1",
    aksi: async t => { await t.klikTeks("button", "^Periksa sekarang$"); await t.tungguFungsi("/Diperiksa:/.test(document.querySelector('#pgPesan').innerText)"); }, harus: "document.querySelector('#pgPesan').className.includes('ok') && document.querySelectorAll('tbody tr[data-id]').length >= 1"},
  {nama: "/riset/mitra (kode mitra)", url: d => "/riset/mitra#k=" + d.kode.mitra, isi: "document.querySelectorAll('.mt-blok').length >= 1 && document.querySelector('#app').innerText.length > 80",
    aksi: async t => { await t.eval("document.querySelector('.mt-blok').scrollIntoView()"); }, harus: "document.querySelectorAll('.mt-blok').length >= 1 && !/Kode tidak berlaku/.test(document.body.innerText)"},
  {nama: "/sitrep (arsip)", url: d => "/sitrep?tgl=" + d.tglArsip, isi: "document.querySelectorAll('#lap tr').length >= 3 && /Arsip/.test(document.querySelector('#lap').innerText)",
    aksi: async t => { await t.pilih("#prov", "64"); }, harus: "document.querySelector('#prov').value === '64'"},
  {nama: "/admin/gakkum", admin: true, url: d => "/admin/gakkum", isi: "document.querySelectorAll('table tr').length >= 5",
    aksi: async t => { await t.klikTeks("button", "^Sawit$"); }, harus: "document.querySelectorAll('table tr').length >= 2"},
];
/* Bug layar yang ditemukan uji ini: kunci "<halaman>|<bagian>" -> alasan. Pemilik halamannya memperbaiki, lalu baris ini dihapus. */
const TODO = {};   // kosong: semua halaman wajib lulus

if (!CHROME) {
  test("uji layar BNPB DILEWATI: Chrome tidak ditemukan", {skip: "tidak ada Chrome/Chromium (set CHROME_BIN atau pasang Google Chrome); uji layar hanya jalan di mesin yang punya peramban"}, () => {});
} else {
  let dunia, br, tab;
  before(async () => {
    dunia = await buatDunia(); br = await bukaPeramban(CHROME); tab = await br.tab();
    await tab.cookie(dunia.base, "sesi_admin", dunia.sesi);
  });
  after(async () => { await tab?.tutup(); await br?.tutup(); await dunia?.tutup(); });

  const buka = async (h, [w, ht]) => {
    const modul = h.modul || /relawan|kampus/.test(h.nama) ? /^(relawan|kampus)/ : /alun/.test(h.nama) ? /^alun/ : /riset/.test(h.nama) ? /^riset/ : /meja/.test(h.nama) ? /^meja/ : null;
    const kunci = modul ? Object.keys(dunia.galatIsi).filter(k => modul.test(k)) : [];
    assert.deepEqual(kunci.map(k => dunia.galatIsi[k]), [], "data dummy gagal diisi lewat endpoint Super Admin, jadi halaman tidak bisa dinilai; perbaiki dummy/kode modulnya dulu");
    await tab.ukuran(w, ht);
    if (h.pra) await h.pra(tab, dunia);
    await tab.buka(dunia.base + h.url(dunia), {tunggu: "body *"});
    await tab.tungguFungsi("document.readyState === 'complete'");
    await new Promise(r => setTimeout(r, 1200));   // fetch data halaman + render
  };
  const jalankan = (h, kunci, nama, fn) => test(nama, TODO[`${h.nama}|${kunci}`] ? {todo: TODO[`${h.nama}|${kunci}`]} : {}, fn);

  for (const h of HALAMAN) for (const uk of UKURAN) {
    const [w, ht] = uk, tag = `${h.nama} di ${w}x${ht}`;
    jalankan(h, `${w}`, `${tag}: tanpa galat konsol/CSP, tanpa scroll horizontal, tanpa teks bocor, elemen utama terisi`, async () => {
      await buka(h, uk);
      const g = tab.galat().filter(bukanFavicon);
      const lebar = await tab.lebihLebar(), teks = await tab.teks(), bocor = [...new Set(teks.match(TERLARANG) || [])];
      const terisi = await tab.eval(`(() => { try { return !!(${h.isi}); } catch (e) { return "galat: " + e.message; } })()`);
      const masalah = [];
      if (g.length) masalah.push("(1) galat konsol/CSP/jaringan: " + g.join(" | "));
      if (lebar.sw > w + 1) masalah.push(`(2) scroll horizontal: scrollWidth ${lebar.sw} > lebar layar ${w}`);
      if (bocor.length) masalah.push("(3) teks terlarang tampil: " + bocor.map(x => JSON.stringify(x)).join(", "));
      if (terisi !== true) masalah.push(`(4) elemen utama tidak terisi (${terisi}): ${h.isi}`);
      assert.equal(masalah.length, 0, `${tag} bermasalah. Sebab: halaman membaca data dummy yang sehat tetapi layarnya salah. Akibat: warga/petugas melihat layar rusak. Perbaikan: pemilik halaman (layar-peta / warga-api). Rincian:\n  ` + masalah.join("\n  "));
    });
  }
  for (const h of HALAMAN) {
    jalankan(h, "aksi", `${h.nama}: interaksi inti berjalan tanpa galat`, async () => {
      await buka(h, UKURAN[0]);
      tab.kosongkanGalat();
      const sebelum = await tab.teks();
      await h.aksi(tab);
      await new Promise(r => setTimeout(r, 600));
      const ok = await tab.eval(`(() => { try { return !!(${h.harus}); } catch (e) { return "galat: " + e.message; } })()`);
      assert.equal(ok, true, `${h.nama}: sesudah interaksi syarat ini tidak terpenuhi (${ok}): ${h.harus}`);
      if (h.berubah) assert.notEqual(await tab.teks(), sebelum, `${h.nama}: teks halaman tidak berubah sesudah interaksi (tab/filter tidak bereaksi)`);
      assert.deepEqual(tab.galat().filter(bukanFavicon), [], `${h.nama}: interaksi memunculkan galat konsol`);
    });
  }

  /* ---- interaksi lintas halaman ---- */
  test("alun-alun admin: Teruskan ke relawan pada utas butuh_bantuan membuat pil status di halaman publik utas itu", async () => {
    /* utas NYATA (bukan dummy): rincian publik menyembunyikan utas dummy (404), jadi pil di halaman publik hanya bisa dibuktikan pada utas nyata */
    const bikin = await dunia.api("POST", "/api/alun", {jenis: "butuh_bantuan", judul: "Butuh tenda darurat Demak", teks: "Pengungsi butuh tenda dan terpal.", bencana: "banjir", prov: "33", kab: "Kabupaten Demak"}, {"cf-connecting-ip": "10.9.0.1"});
    assert.equal(bikin.s, 201, "membuat utas butuh_bantuan nyata gagal: " + bikin.t.slice(0, 200));
    const u = {id: bikin.j.id};
    await tab.ukuran(1440, 900);
    await tab.buka(dunia.base + "/admin/alun", {tunggu: "table tr"});
    await tab.klikTeks("button", "^Butuh bantuan$");
    await tab.tungguFungsi(`!!document.querySelector('tr[data-id="${u.id}"]')`);
    tab.kosongkanGalat();
    await tab.klik(`tr[data-id="${u.id}"] [data-aksi="form_relawan"]`);
    await tab.tunggu("#axFormTeruskan");
    await tab.klik("#axFormTeruskan button[type=submit]");
    await tab.tungguFungsi(`/Relawan ditugaskan|Kebutuhan relawan|Permintaan relawan/.test(document.querySelector('tr[data-id="${u.id}"]')?.innerText || '')`);
    assert.deepEqual(tab.galat().filter(bukanFavicon), [], "Teruskan memunculkan galat konsol");
    for (const [w, ht] of UKURAN) {
      await tab.ukuran(w, ht);
      await tab.buka(dunia.base + "/alun-alun#u=" + u.id, {tunggu: ".al-kepala"});
      await tab.tungguFungsi("/Relawan ditugaskan|Kebutuhan relawan|Permintaan relawan/.test(document.querySelector('.al-kepala').innerText)", 8000);
      assert.deepEqual(tab.galat().filter(bukanFavicon), [], `halaman publik utas di ${w}: galat konsol`);
      const lb = await tab.lebihLebar(); assert.ok(lb.sw <= w + 1, `halaman publik utas di ${w}: scroll horizontal ${lb.sw}`);
    }
  });

  test("/meja luring: catatan masuk antrean perangkat + pita 'menunggu sinyal', online mengirim dan pita hilang", async () => {
    const hitung = async () => (await dunia.DB.prepare("SELECT count(*) n FROM meja_catatan WHERE meja = 'logistik' AND dummy = 0").first()).n;
    const sebelum = await hitung();
    await tab.ukuran(1440, 900);
    await tab.buka(dunia.base + "/meja#k=" + dunia.kode.meja, {tunggu: "#app button"});
    await tab.klikTeks("#app button", "^Logistik$");
    await tab.tungguFungsi("!!document.querySelector('[data-baru]')");
    await tab.klik("[data-baru]");
    await tab.tunggu("#mjForm");
    await tab.eval(`(() => { const f = document.querySelector('#mjForm'); const isi = {jumlah_diminta: "10", satuan: "kg", posko: "Posko Luring Uji", kebutuhan_untuk: "50"};
      f.elements.barang.selectedIndex = 1; for (const [k, v] of Object.entries(isi)) f.elements[k].value = v; })()`);
    const luring = (offline) => tab.kirim("Network.emulateNetworkConditions", {offline, latency: 0, downloadThroughput: -1, uploadThroughput: -1});
    await luring(true);
    try {
      tab.kosongkanGalat();
      await tab.klik("#mjForm button[type=submit]");
      await tab.tungguFungsi("!document.querySelector('.antre-pita')?.hidden && /1 kiriman menunggu sinyal/.test(document.querySelector('.antre-pita').innerText)");
      assert.equal(await hitung(), sebelum, "catatan sampai ke server padahal peramban luring");
      assert.match(await tab.teks(), /Disimpan di perangkat/);
    } finally { await luring(false); }
    await tab.tungguFungsi("document.querySelector('.antre-pita')?.hidden === true", 15000);
    assert.equal(await hitung(), sebelum + 1, "sesudah online catatan luring tidak terkirim ke server");
  });

  /* ---- Layar operasi lapangan (public/instansi_ops.js): dibuka dari panel tugas oleh akun instansi (/instansi) dan admin (/admin/instansi) ---- */
  const SANDI_OPS = "SandiUjiOps-2345678";
  let kukiInstansi = null;
  const masukInstansi = async () => {
    if (kukiInstansi) return kukiInstansi;
    const u = (await dunia.DB.prepare("SELECT username, garam FROM instansi_akun WHERE username LIKE 'dummypemprov%' AND dummy = 1 AND status = 'aktif' LIMIT 1").first());
    assert.ok(u, "akun instansi dummy tingkat provinsi tidak ada (dummy instansi gagal terisi?)");
    await dunia.DB.prepare("UPDATE instansi_akun SET sandi_sha = ?, wajib_ganti = 0 WHERE username = ?").bind(sha256(u.garam + SANDI_OPS), u.username).run();
    const r = await dunia.api("POST", "/api/instansi/masuk", {username: u.username, sandi: SANDI_OPS}, {"x-pb": "1", "cf-connecting-ip": "198.51.100.77"});
    assert.equal(r.s, 200, "masuk akun instansi dummy: " + r.t.slice(0, 200));
    const c = (r.h.get("set-cookie") || "").split(";")[0], i = c.indexOf("=");
    return (kukiInstansi = [c.slice(0, i), c.slice(i + 1)]);
  };
  /* /instansi sebagai akun provinsi dummy -> baris tugas dummy ber-ops -> Operasi lapangan */
  const bukaOps = async ([w, ht]) => {
    assert.deepEqual(Object.keys(dunia.galatIsi).filter(k => /^(instansi|ops)$/.test(k)).map(k => dunia.galatIsi[k]), [], "dummy instansi/operasi gagal diisi");
    const [nm, nilai] = await masukInstansi();
    await tab.ukuran(w, ht); await tab.cookie(dunia.base, nm, nilai);
    /* pop-up peta wilayah (popupMasuk) memanggil /api/titik yang kosong di dunia uji (404); tandai sudah tampil supaya galat itu bukan bagian dari uji operasi */
    const akunId = (await dunia.DB.prepare("SELECT id FROM instansi_akun WHERE username LIKE 'dummypemprov%' AND dummy = 1 LIMIT 1").first()).id;
    await tab.buka(dunia.base + "/instansi.css"); await tab.eval(`sessionStorage.setItem("pb_peta_masuk:${akunId}", "1")`);
    await tab.buka(dunia.base + "/instansi", {tunggu: "body *"});
    await tab.tungguFungsi(`!!document.querySelector('.in-baris[data-id="${dunia.kode.opsTugas}"]')`, 15000);
    await tab.eval("document.querySelector('.tg-modal [data-aksi=tutup]')?.click()");
    await tab.klik(`.in-baris[data-id="${dunia.kode.opsTugas}"]`);
    await tab.tunggu(".tg-ops"); await tab.klik(".tg-ops");
    await tab.tungguFungsi("document.querySelectorAll('.op-layar #opPeta svg circle').length >= 1 && document.querySelectorAll('.op-layar #opIsi .op-baris').length >= 2", 15000);
    await new Promise(r => setTimeout(r, 500));
  };
  for (const uk of UKURAN) {
    const [w, ht] = uk;
    test(`operasi lapangan di ${w}x${ht}: peta berisi lapisan, panel berbaris, tanpa galat/CSP/geser/teks bocor`, async () => {
      tab.kosongkanGalat(); await bukaOps(uk);
      const g = tab.galat().filter(bukanFavicon);
      const o = await tab.eval(`(() => { const l = document.querySelector('.op-layar'); return {sw: l.scrollWidth, cw: l.clientWidth, teks: l.innerText,
        garis: l.querySelectorAll('#opPeta svg polyline, #opPeta svg polygon').length, bulat: l.querySelectorAll('#opPeta svg circle').length, drone: l.querySelectorAll('#opPeta svg circle[fill-opacity=".9"]').length,
        ikon: l.querySelectorAll('.op-pil svg').length, sumber: l.querySelectorAll('#opIsi .op-baris').length, tab: l.querySelectorAll('.op-tab button').length}; })()`);
      const bocor = [...new Set(o.teks.match(TERLARANG) || []), ...(o.teks.includes(" · ") ? [" · "] : [])], lb = await tab.lebihLebar(), masalah = [];
      if (g.length) masalah.push("galat konsol/CSP: " + g.join(" | "));
      if (o.sw > o.cw + 1 || lb.sw > w + 1) masalah.push(`geser horizontal: layar ${o.sw}/${o.cw}, dokumen ${lb.sw}/${w}`);
      if (bocor.length) masalah.push("teks terlarang: " + bocor.map(x => JSON.stringify(x)).join(", "));
      if (o.garis < 3 || o.bulat < 8 || o.drone < 10) masalah.push(`peta kurang lapisan: garis/sektor ${o.garis}, lingkaran ${o.bulat}, titik drone ${o.drone}`);
      if (o.ikon < 3 || o.tab !== 8) masalah.push(`pil berikon ${o.ikon}, tab ${o.tab}`);
      assert.ok(/km/.test(o.teks) && /\d/.test(o.teks), "angka jarak km tidak tampil");
      assert.equal(masalah.length, 0, `operasi lapangan ${w}x${ht} bermasalah:\n  ` + masalah.join("\n  "));
      /* tiap tab terisi tanpa galat */
      for (const nm of ["Rencana aksi", "Permintaan", "Log drop", "Linimasa", "Drone", "Patroli", "TMAT"]) {
        await tab.klikTeks(".op-tab button", `^${nm}$`);
        await tab.tungguFungsi(`document.querySelector('#opIsi').getAttribute('aria-busy') === 'false' && document.querySelectorAll('#opIsi .op-bagian').length >= 1`, 8000);
        const t = await tab.eval("document.querySelector('.op-layar').innerText");
        assert.deepEqual([...new Set(t.match(TERLARANG) || [])], [], `tab ${nm} di ${w}: teks terlarang`);
        assert.ok(!/belum bisa dimuat|belum diaktifkan/.test(t), `tab ${nm} di ${w}: gagal dimuat: ` + t.slice(0, 200));
      }
      assert.deepEqual(tab.galat().filter(bukanFavicon), [], `galat konsol sesudah membuka tab di ${w}`);
    });
  }
  test("operasi lapangan: hitung selang menampilkan pompa dan asumsi, terbitkan periode, cetak A4, buat permintaan heli", async () => {
    tab.kosongkanGalat(); await bukaOps(UKURAN[0]);
    /* hitung selang ke sumber terpilih */
    await tab.klikTeks(".op-layar button", "^Hitung$");
    await tab.tungguFungsi("/\\d+\\s*pompa estafet/.test(document.querySelector('#opSelang')?.innerText || '')", 8000);
    const sel = await tab.eval("document.querySelector('#opSelang').innerText");
    assert.match(sel, /Jarak selang sekitar [\d.,]+ m/); assert.match(sel, /garis lurus x 1,2/); assert.match(sel, /Tekanan sisa/); assert.doesNotMatch(sel, /\bNaN\b/);
    assert.ok(await tab.eval("document.querySelectorAll(\"#opPeta svg line[stroke-dasharray='8 5'], #opPeta svg rect[fill='#0b2545']\").length >= 2"), "rencana selang dan pompa tidak tergambar di peta");
    /* klik peta memilih titik */
    await tab.eval(`(() => { const s = document.querySelector('#opPeta svg'), r = s.getBoundingClientRect(); s.dispatchEvent(new MouseEvent('click', {bubbles: true, clientX: r.left + r.width * .3, clientY: r.top + r.height * .3})); })()`);
    assert.match(await tab.eval("document.querySelector('[data-pick]').innerText"), /Titik dipilih: lintang -?[\d.,]+, bujur [\d.,]+/);
    /* rencana aksi: nilai awal otomatis, simpan draf, terbitkan, cetak */
    await tab.klikTeks(".op-tab button", "^Rencana aksi$"); await tab.tunggu("form[data-f=periode]");
    assert.ok(await tab.eval("document.querySelector('form[data-f=periode] [name=sasaran]').value.length > 10"), "nilai awal sasaran tidak terisi otomatis");
    const sebelum = await tab.eval("document.querySelectorAll('#opIsi .op-kartu').length");
    await tab.eval("(() => { const f = document.querySelector('form[data-f=periode]'); f.elements.pj.value = 'Ketua Regu Uji'; f.elements.komunikasi.value = 'Radio kanal 3'; })()");
    await tab.klik("form[data-f=periode] button[type=submit]");
    await tab.tungguFungsi(`document.querySelectorAll('#opIsi .op-kartu').length === ${sebelum + 1}`, 8000);
    await tab.eval("[...document.querySelectorAll('#opIsi .op-kartu')].find(k => /Draf/.test(k.innerText)).querySelector('[data-op=periode]').click()");
    await tab.tungguFungsi("[...document.querySelectorAll('#opIsi .op-kartu')].every(k => !/Draf/.test(k.innerText))", 8000);
    assert.match(await tab.eval("document.querySelector('#opPesan').innerText"), /diterbitkan/);
    await tab.eval("window.__cetak = 0; window.print = () => { window.__cetak++; }");
    await tab.eval("[...document.querySelectorAll('#opIsi .op-kartu')].find(k => /Ketua Regu Uji/.test(k.innerText)).querySelector('[data-op=cetak]').click()");
    assert.equal(await tab.eval("window.__cetak"), 1, "tombol Cetak A4 tidak memanggil print");
    const doc = await tab.eval("document.querySelector('.op-cetak-doc').innerText");
    assert.match(doc, /Rencana aksi periode operasi/); assert.match(doc, /Ketua Regu Uji/); assert.match(doc, /Disetujui oleh/);
    /* permintaan heli: akun instansi mengajukan, tidak bisa menyetujui */
    await tab.klikTeks(".op-tab button", "^Permintaan$"); await tab.tunggu("form[data-f=heli]");
    const heli0 = await tab.eval("[...document.querySelectorAll('#opIsi .op-kartu')].filter(k => /Helikopter water bombing/.test(k.innerText)).length");
    await tab.eval("(() => { document.querySelector('form[data-f=heli]').closest('details').open = true; document.querySelector('form[data-f=heli]').elements.luas.value = '15'; })()");
    await tab.klik("form[data-f=heli] button[type=submit]");
    await tab.tungguFungsi(`[...document.querySelectorAll('#opIsi .op-kartu')].filter(k => /Helikopter water bombing/.test(k.innerText)).length === ${heli0 + 1}`, 8000);
    const t = await tab.eval("document.querySelector('#opIsi').innerText");
    assert.match(t, /Diminta/); assert.match(t, /Menunggu persetujuan moderator atau staf/); assert.doesNotMatch(t, /Antrean persetujuan/);
    assert.deepEqual(tab.galat().filter(bukanFavicon), [], "interaksi operasi lapangan memunculkan galat konsol");
  });
  test("operasi lapangan: admin melihat antrean persetujuan, menyetujui permintaan heli, mengunggah TMAT; Operasi lapangan dibuka dari rincian tugas /admin/instansi", async () => {
    await tab.ukuran(1440, 900); await tab.cookie(dunia.base, "sesi_admin", dunia.sesi);
    await tab.buka(dunia.base + "/admin/instansi#pantau", {tunggu: "#aiIsi [data-rincian]"});
    tab.kosongkanGalat();
    await tab.klik("#aiIsi [data-rincian]"); await tab.tunggu(".tg-ops");
    await tab.klik(".tg-ops");   // memuat instansi_ops.js lewat tombol (halaman admin tidak menaut skripnya)
    await tab.tungguFungsi("!!document.querySelector('.op-layar #opPeta svg') && document.querySelectorAll('.op-tab button').length === 8", 15000);
    assert.equal(await tab.eval("document.querySelector('.op-layar').innerText.match(/Fitur operasi lapangan belum/) === null"), true);
    /* tugas ber-ops lewat modul yang sama: heli diminta lewat API, admin menyetujui dari antrean */
    const tg = await dunia.DB.prepare("SELECT lat, lon, kab, kec FROM tugas_api WHERE id = ?").bind(dunia.kode.opsTugas).first();
    const mk = await dunia.api("POST", "/api/ops/permintaan", {tugas_id: dunia.kode.opsTugas, jenis: "heli", lat: tg.lat, lon: tg.lon, prioritas: "tinggi", catatan: "uji antrean"}, {...(await import("../warga/_bnpb.mjs")).ADMIN, "x-pb": "1"});
    assert.equal(mk.s, 201, mk.t);
    await tab.eval(`window.InstansiOps.buka({id: ${JSON.stringify(dunia.kode.opsTugas)}, lat: ${tg.lat}, lon: ${tg.lon}, kab: ${JSON.stringify(tg.kab)}, kec: ${JSON.stringify(tg.kec)}, status: "buka"}, {admin: true})`);
    await tab.tungguFungsi("document.querySelectorAll('.op-layar #opPeta svg circle').length >= 8", 15000);
    await tab.klikTeks(".op-tab button", "^Permintaan$");
    await tab.tungguFungsi("/Antrean persetujuan/.test(document.querySelector('#opIsi').innerText)", 8000);
    await tab.eval("[...document.querySelectorAll('#opIsi .op-kartu')].find(k => /uji antrean/.test(k.innerText)).querySelector('[data-ke=disetujui]').click()");
    await tab.tungguFungsi("/Status permintaan diperbarui/.test(document.querySelector('#opPesan').innerText)", 8000);
    assert.match(await tab.eval("[...document.querySelectorAll('#opIsi .op-kartu')].find(k => /uji antrean/.test(k.innerText)).innerText"), /Disetujui/);
    await tab.klikTeks(".op-tab button", "^TMAT$"); await tab.tunggu("form[data-f=tmat]");
    const csv = `id,lat,lon,tmat_cm,waktu,sumber\nUJI-001,${(tg.lat + 0.01).toFixed(4)},${(tg.lon + 0.01).toFixed(4)},-41.5,${new Date().toISOString().slice(0, 19)}Z,Uji layar`;
    await tab.eval(`document.querySelector('form[data-f=tmat] [name=csv]').value = ${JSON.stringify(csv)}`);
    await tab.klik("form[data-f=tmat] button[type=submit]");
    await tab.tungguFungsi("/TMAT diunggah: 1 baris dari 1 stasiun/.test(document.querySelector('#opPesan').innerText)", 8000);
    await tab.klikTeks(".op-tab button", "^TMAT$"); await tab.tungguFungsi("/UJI-001/.test(document.querySelector('#opIsi').innerText)", 8000);
    assert.deepEqual([...new Set((await tab.eval("document.querySelector('.op-layar').innerText")).match(TERLARANG) || [])], []);
    assert.deepEqual(tab.galat().filter(bukanFavicon), [], "admin operasi lapangan memunculkan galat konsol");
  });
  test("operasi lapangan: tombol dummy 🧪/🧹 di /admin/instansi ikut mengisi dan menghapus contoh operasi lapangan", async () => {
    await tab.ukuran(1440, 900); await tab.cookie(dunia.base, "sesi_admin", dunia.sesi);
    await tab.buka(dunia.base + "/admin/instansi#pantau", {tunggu: "[data-dummy=hapus]"});
    await tab.eval("window.confirm = () => true");
    const hitung = async () => (await dunia.DB.prepare("SELECT (SELECT count(*) FROM ops_garis WHERE dummy = 1) g, (SELECT count(*) FROM ops_sumber_air WHERE dummy = 1) s").first());
    assert.ok((await hitung()).g > 0, "prasyarat: contoh operasi sudah terisi");
    await tab.klik("[data-dummy=hapus]");
    await tab.tungguFungsi("/Operasi lapangan: contoh dihapus/.test(document.querySelector('#aiPesan')?.innerText || '')", 30000);
    assert.deepEqual(await hitung(), {g: 0, s: 0}, "contoh operasi lapangan tidak terhapus oleh tombol 🧹");
    await tab.klik("[data-dummy=isi]");
    await tab.tungguFungsi("/Operasi lapangan: contoh terisi/.test(document.querySelector('#aiPesan')?.innerText || '')", 30000);
    const sesudah = await hitung(); assert.ok(sesudah.g >= 3 && sesudah.s >= 3, "contoh operasi lapangan tidak terisi oleh tombol 🧪: " + JSON.stringify(sesudah));
  });
}
