/* Uji LAYAR Ruang Koordinasi BNPB (butir C6): Chrome sungguhan membuka tiap halaman di atas worker utuh (Miniflare) + D1 lokal berisi dummy.
   Menangkap kelas bug "layar kosong / NaN / galat konsol padahal API sehat" yang lolos dari uji worker (yang hanya memeriksa HTML dan CSP).
   Jalan: npm run uji:layar. Tanpa Chrome (CHROME_BIN / Google Chrome / Chromium) seluruh berkas DILEWATI dengan pesan, bukan gagal diam-diam.
   Sebuah uji `todo` = bug layar yang SUDAH ditemukan dan menunggu pemilik halamannya; begitu diperbaiki, hapus penanda todo (uji hijau = bukti). */
import {test, before, after} from "node:test";
import assert from "node:assert/strict";
import {bukaPeramban, cariChrome} from "./_peramban.mjs";
import {buatDunia} from "./_dunia.mjs";

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
  {nama: "/admin/gakkum", admin: true, url: d => "/admin/gakkum", isi: "document.querySelectorAll('table tr').length >= 5",
    aksi: async t => { await t.klikTeks("button", "^Sawit$"); }, harus: "document.querySelectorAll('table tr').length >= 2"},
];
/* Bug layar yang ditemukan uji ini: kunci "<halaman>|<bagian>" -> alasan. Pemilik halamannya memperbaiki, lalu baris ini dihapus. */
const TODO = {};   // kosong: semua halaman wajib lulus di 1440 dan 390 (isi alasan di sini bila ada bug layar yang belum dibetulkan)

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
    const modul = /relawan|kampus/.test(h.nama) ? /^(relawan|kampus)/ : /alun/.test(h.nama) ? /^alun/ : /riset/.test(h.nama) ? /^riset/ : /meja/.test(h.nama) ? /^meja/ : null;
    const kunci = modul ? Object.keys(dunia.galatIsi).filter(k => modul.test(k)) : [];
    assert.deepEqual(kunci.map(k => dunia.galatIsi[k]), [], "data dummy gagal diisi lewat endpoint Super Admin, jadi halaman tidak bisa dinilai; perbaiki dummy/kode modulnya dulu");
    await tab.ukuran(w, ht);
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
}
