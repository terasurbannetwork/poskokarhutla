/* SP-011: logika murni layar /pipa/lapangan (DT §6.1.1, §6.1.2; DS §3.7.2; RU F1, F7) dan kunci statis keamanan serta ukuran sentuh.
   DOM-nya dibuktikan di peramban mode ponsel (dicatat di laporan tiket), bukan di sini. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {cekButir} from "../../public/pipa/formulir.js";

const L = await import("../../public/pipa/lapangan.js");
const baca = p => readFileSync(new URL(p, import.meta.url), "utf8");
const KODE = "0123456789abcdef0123456789";

function lingkungan(hash) {
  const simpan = new Map(), riwayat = [];
  return {simpan, riwayat,
    lokasi: {pathname: "/pipa/lapangan", search: "", hash},
    sejarah: {replaceState: (...a) => riwayat.push(a)},
    penyimpanan: {setItem: (k, v) => simpan.set(k, v), getItem: k => simpan.get(k) ?? null}};
}

test("ambilKode: fragmen #k= 26 heks disimpan lalu DIHAPUS dari alamat lewat replaceState (kode tidak tinggal di riwayat)", () => {
  const e = lingkungan(`#k=${KODE}`);
  assert.equal(L.ambilKode(e.lokasi, e.sejarah, e.penyimpanan), KODE);
  assert.equal(e.simpan.get("sippa.kode"), KODE);
  assert.deepEqual(e.riwayat, [[null, "", "/pipa/lapangan"]], "alamat bersih tanpa fragmen dan tanpa query");
});

test("ambilKode: fragmen liar (bukan 26 heks, penyisipan teks) TIDAK disimpan tetapi tetap dihapus dari alamat; tanpa fragmen tidak menyentuh apa pun", () => {
  for (const h of ["#k=<script>alert(1)</script>", "#k=" + KODE.slice(1), "#k=" + KODE + "0", "#k=zzzzzzzzzzzzzzzzzzzzzzzzzz", "#k=", "#x=1&k=" + KODE.slice(2)]) {
    const e = lingkungan(h);
    assert.equal(L.ambilKode(e.lokasi, e.sejarah, e.penyimpanan), null, h);
    assert.equal(e.simpan.has("sippa.kode"), false, `kode liar tersimpan: ${h}`);
    assert.equal(e.riwayat.length, 1, `fragmen tidak dihapus: ${h}`);
  }
  const e = lingkungan("");
  assert.equal(L.ambilKode(e.lokasi, e.sejarah, e.penyimpanan), null); assert.equal(e.riwayat.length, 0);
});

test("ambilKode: heks huruf besar (QR yang dikapitalkan) diterima dan disimpan huruf kecil", () => {
  const e = lingkungan(`#k=${KODE.toUpperCase()}`);
  assert.equal(L.ambilKode(e.lokasi, e.sejarah, e.penyimpanan), KODE);
});

test("kodeDariTeks: hasil pindai QR berupa tautan #k= atau 26 heks telanjang diterima; selain itu ditolak (kode di query tidak dihitung)", () => {
  assert.equal(L.kodeDariTeks(`https://pantau.example/pipa/lapangan#k=${KODE}`), KODE);
  assert.equal(L.kodeDariTeks(` ${KODE.toUpperCase()} `), KODE);
  for (const t of [`https://x/pipa/lapangan?k=${KODE}`, "#k=abc", "", null, undefined, KODE + "0", `javascript:alert(1)#k=${KODE.slice(1)}`, "<img src=x>"]) assert.equal(L.kodeDariTeks(t), null, String(t));
});

test("kalimatSinkron: empat keadaan DS §2.1.3 dengan kalimat DS §3.7.2 dan ikon yang benar", () => {
  const nol = {menunggu: 0, ditolak: 0};
  let k = L.kalimatSinkron({...nol, menunggu: 3});
  assert.deepEqual([k.keadaan, k.ikon], ["tunggu", "cloud-off"]); assert.equal(k.teks, "3 isian menunggu sinyal. Dikirim otomatis saat ada sinyal.");
  k = L.kalimatSinkron({...nol, menunggu: 3, mengirim: true});
  assert.deepEqual([k.keadaan, k.ikon], ["kirim", "refresh-cw"]); assert.equal(k.teks, "Mengirim 3 isian.");
  k = L.kalimatSinkron({menunggu: 0, ditolak: 1, alasan: "panjang trase di luar 0 sampai 5.000 m"});
  assert.deepEqual([k.keadaan, k.ikon], ["tolak", "circle-x"]); assert.equal(k.teks, "1 isian ditolak: panjang trase di luar 0 sampai 5.000 m.");
  k = L.kalimatSinkron({menunggu: 0, ditolak: 2});
  assert.match(k.teks, /^2 isian ditolak\. /);
  k = L.kalimatSinkron({...nol, terakhir: Date.UTC(2026, 9, 28, 7, 32)});   // 14.32 WIB
  assert.deepEqual([k.keadaan, k.ikon], ["terkirim", "cloud-check"]); assert.equal(k.teks, "Semua isian terkirim, 14.32 WIB.");
  assert.equal(L.kalimatSinkron(nol).teks, "Belum ada isian.");
  assert.equal(L.kalimatSinkron({menunggu: 1000, ditolak: 0}).teks.startsWith("1.000 isian"), true, "angka lewat id-ID");
  for (const x of [{menunggu: 1}, {ditolak: 1}, {mengirim: true, menunggu: 2}, {}]) assert.doesNotMatch(L.kalimatSinkron({menunggu: 0, ditolak: 0, ...x}).teks, /[—·]/);
});

test("stopwatch F7: tombol berikutnya aktif hanya sesudah yang sebelumnya; melompat atau mengulang ditolak", () => {
  assert.equal(L.TAHAP.length, 6);
  assert.deepEqual(L.TAHAP.map(t => t.medan), ["t_tiba", "t_mulai_gelar", "t_air_mengalir", "t_mulai_injeksi", "t_selesai", "t_bongkar_selesai"]);
  assert.equal(L.tahapAktif({}), 0);
  const a = L.tekanTahap({}, "t_tiba", 1000); assert.deepEqual(a, {t_tiba: 1000});
  assert.equal(L.tahapAktif(a), 1);
  assert.equal(L.tekanTahap(a, "t_air_mengalir", 2000), a, "melompat ke tahap ketiga ditolak (objek sama kembali)");
  assert.equal(L.tekanTahap(a, "t_tiba", 3000), a, "mengetuk ulang tahap yang sudah ada ditolak");
  let t = a; for (const [i, tahap] of L.TAHAP.slice(1).entries()) t = L.tekanTahap(t, tahap.medan, 2000 + i);
  assert.equal(L.tahapAktif(t), 6, "semua terisi");
  assert.equal(L.tekanTahap(t, "t_bongkar_selesai", 9), t);
});

test("bangunLog: sesi gelar lengkap dengan medan vonis pilot lolos cekButir; jam pompa dan air dihitung; isian kosong tidak dikirim", () => {
  const t0 = Date.UTC(2026, 9, 28, 1, 0);
  const s = {jenis: "karhutla", kelas_medan: "II", panjang_m: 120, n_orang: 4, petak_id: "P-03", air_sampai_lance: 1, p_ujung_bar: 2.4, p_ujung_menit: 35, p_ujung_sumber: "gauge", kecelakaan: 0, bocor_henti_menit: 0, bbm_l: 18.5, catatan: "",
    totalizer_awal: 100, totalizer_akhir: 112.5, konfigurasi: {kit: "SIPPA-001"},
    tahap: {t_tiba: t0, t_mulai_gelar: t0 + 36e5, t_air_mengalir: t0 + 2 * 36e5, t_mulai_injeksi: t0 + 2.5 * 36e5, t_selesai: t0 + 8.2 * 36e5}};
  const b = L.bangunLog(s, t0 + 9 * 36e5);
  assert.equal(cekButir("log", {id: "3f1c2a9e-4b6d-4e2a-9f10-6c2b8d7e1a55", ...b}).ok, true, JSON.stringify(cekButir("log", {id: "3f1c2a9e-4b6d-4e2a-9f10-6c2b8d7e1a55", ...b}).galat));
  assert.equal(b.jam_pompa, 6.2, "air mengalir sampai selesai, satu desimal");
  assert.equal(b.air_m3, 12.5); assert.equal(b.waktu_klien, t0 + 9 * 36e5);
  assert.equal(b.konfigurasi, JSON.stringify({kit: "SIPPA-001"}));
  assert.equal("catatan" in b, false, "teks kosong tidak ikut"); assert.equal("totalizer_awal" in b, false, "totalizer bukan medan butir");
  assert.equal("banjir_m3" in b, false);
  const buruk = L.bangunLog({...s, totalizer_akhir: 90}, 1);
  assert.equal("air_m3" in buruk, false, "totalizer akhir di bawah awal tidak jadi air negatif");
  const tanpaSelesai = L.bangunLog({...s, tahap: {t_tiba: t0}}, 1);
  assert.equal("jam_pompa" in tanpaSelesai, false);
});

test("bangunLog: nilai yang melanggar batas tetap sampai ke cekButir untuk ditolak (trase 5.001 m, orang 0)", () => {
  const b = L.bangunLog({jenis: "latihan", panjang_m: 5001, n_orang: 0, tahap: {}}, 1);
  const c = cekButir("log", {id: "3f1c2a9e-4b6d-4e2a-9f10-6c2b8d7e1a55", ...b});
  assert.deepEqual(c.galat.map(g => g.medan).sort(), ["n_orang", "panjang_m"]);
});

test("daftarSW: mendaftarkan /sw-lapangan.js dengan scope /pipa/lapangan (tanpa garis miring: halaman /pipa/lapangan ikut terkendali); galat didiamkan", async () => {
  const panggilan = [];
  L.daftarSW({serviceWorker: {register: (...a) => { panggilan.push(a); return Promise.reject(new Error("diblokir")); }}});
  assert.deepEqual(panggilan, [["/sw-lapangan.js", {scope: "/pipa/lapangan"}]]);
  await new Promise(ok => setTimeout(ok, 5));   // penolakan tidak menjadi unhandledrejection
  assert.doesNotThrow(() => L.daftarSW({}));
});

test("urgentLalu: tombol mati dan berlabel seketika (sebelum kerja jalan), ketuk ganda tidak menjalankan kerja dua kali, hidup lagi di setiap jalan keluar", async () => {
  const antrean = [], jadwal = f => antrean.push(f);
  const btn = {disabled: false, textContent: "Simpan BBM"};
  let n = 0;
  assert.equal(L.urgentLalu(btn, "Menyimpan...", async () => { n++; }, jadwal), true);
  assert.deepEqual([btn.disabled, btn.textContent, n], [true, "Menyimpan...", 0], "urgen: sebelum kerja");
  assert.equal(L.urgentLalu(btn, "Menyimpan...", async () => { n++; }, jadwal), false, "ketuk kedua ditolak");
  assert.equal(antrean.length, 1, "hanya satu kerja dijadwalkan");
  await antrean[0]();
  assert.equal(n, 1); assert.deepEqual([btn.disabled, btn.textContent], [false, "Simpan BBM"]);
  /* kerja gagal (kembali awal atau melempar): tetap pulih, tidak macet mati */
  const err = console.error; console.error = () => {};
  try {
    for (const kerja of [async () => { /* return awal karena galat validasi */ }, async () => { throw new Error("IDB penuh"); }]) {
      antrean.length = 0; L.urgentLalu(btn, "Menyimpan...", kerja, jadwal); await antrean[0]();
      assert.deepEqual([btn.disabled, btn.textContent], [false, "Simpan BBM"]);
    }
  } finally { console.error = err; }
  /* label yang diganti pemanggil tidak ditimpa */
  antrean.length = 0; L.urgentLalu(btn, "Keluar...", async () => { btn.textContent = "Keluar dari tugas"; }, jadwal); await antrean[0]();
  assert.equal(btn.textContent, "Keluar dari tugas");
});

test("jam tengah malam WIB tampil 00.05 (hourCycle h23), bukan 24.05", () => {
  assert.equal(L.kalimatSinkron({terakhir: Date.UTC(2026, 9, 27, 17, 5)}).teks, "Semua isian terkirim, 00.05 WIB.");
});

test("semua tombol Simpan, Masuk, Coba lagi, pindai QR, Keluar dan Kirim sekarang lewat urgentLalu; tidak ada tunda(async langsung di handler klik", () => {
  const s = baca("../../public/pipa/lapangan.js");
  assert.ok((s.match(/urgentLalu\(simpan, "Menyimpan\.\.\."/g) || []).length >= 5, "sesi, probe, BBM, gerak, perbaikan");
  for (const l of ["kirimSekarang", "masuk", "keluarT", "buang", "t, \"Membaca QR...\"", "b, \"Memuat...\""]) assert.ok(s.includes(`urgentLalu(${l}`), l);
  assert.doesNotMatch(s, /addEventListener\("click", \(\) => tunda\(async/);
  assert.doesNotMatch(s, /getCurrentPosition[^;]*\?\?/, "GPS: tidak ada operator ?? yang selalu menimpa pesan");
  assert.match(s, /minimumFractionDigits: 5/); assert.match(s, /Mengambil GPS\.\.\./);
  assert.ok(!s.includes("(C)") && s.includes("(°C)"));
});

test("kirim() hanya jalan bila tugas dimuat dan kode mati membuang kode ke layar Masuk: urutan terkunci di sumber", () => {
  const s = baca("../../public/pipa/lapangan.js");
  assert.match(s, /if \(S\.mengirim \|\| !S\.kode \|\| !S\.tugas\) return;/);
  assert.match(s, /if \(h\.berhenti === "kode"\) \{ S\.tugas = null; S\.kode = null; return tampilMasuk\(MSG_KODE_MATI\)/);
  assert.match(s, /Kode penugasan ini sudah tidak berlaku\. Minta kode baru ke perencana\./);
  assert.match(s, /Buang \$\{angka\(S\.j\.total\)\} isian dan keluar/);
});

test("keamanan: lapangan.js menulis teks hanya lewat textContent; satu-satunya innerHTML memasang ikon konstan; tanpa eval, tanpa em dash atau titik tengah, tanpa toFixed, tanpa kata terbukti", () => {
  const s = baca("../../public/pipa/lapangan.js");
  const baris = s.split("\n").filter(x => /innerHTML|insertAdjacentHTML|outerHTML|document\.write/.test(x));
  assert.ok(baris.length <= 1 && baris.every(x => /innerHTML\s*=\s*ikon\(/.test(x)), `innerHTML liar: ${baris.join(" | ")}`);
  assert.doesNotMatch(s, /\beval\(|new Function\(/);
  assert.doesNotMatch(s, /[—·]/); assert.doesNotMatch(s, /toFixed/); assert.doesNotMatch(s, /terbukti/i);
  assert.doesNotMatch(s, /location\.search|searchParams/, "kode tidak pernah dibaca dari query");
});

test("ukuran sentuh: tombol lapangan dan stopwatch >= 56 px, tombol utama lengket 66 px; status sinkron aria-live polite", () => {
  const css = baca("../../public/pipa/pipa.css"), lp = baca("../../public/lapangan.css");
  const tinggi = (sumber, sel) => { const m = new RegExp(sel.replace(/[.[\]]/g, "\\$&") + "\\s*\\{[^}]*min-height:(\\d+)px").exec(sumber); return m ? Number(m[1]) : null; };
  assert.ok(tinggi(lp, ".lp-tombol") >= 56, "lapangan.css .lp-tombol");
  assert.ok(tinggi(css, ".sp-stopwatch button") >= 56, "tombol stopwatch");
  assert.ok(tinggi(css, ".sp-lapangan input") >= 54 || tinggi(lp, "input,select,textarea") >= 54, "isian >= 54");
  assert.match(baca("../../public/pipa/lapangan.js"), /aria-live["']?\s*[:=,]\s*["']polite/);
});
