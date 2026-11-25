/* Gerbang Peta Situs (PS-02, KEPUTUSAN D10, RENCANA-UJI U1): registri src/peta_situs.js harus sama dengan halaman nyata situs.
   Jalankan: node --test tests/agen/gerbang-peta-situs.test.mjs
   Akibat gagal: halaman tak tercatat tidak muncul di menu mana pun, atau menu menunjuk halaman yang sudah tak ada. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {existsSync, readFileSync} from "node:fs";
import {join} from "node:path";
import {PUBLIK_TANPA_SESI} from "../../src/worker.js";
import {bolehStaf, SEMUA_PERAN} from "../../src/admin_halaman.js";
import {HALAMAN, menuUntuk} from "../../src/peta_situs.js";
import {AKAR, norm, nyata, tab} from "./fixtures/peta_situs_nyata.mjs";

const tokenEntri = e => e.akses === "token" || e.token;
const rutaBersih = e => norm(e.rute.split("?")[0]);

/* fungsi murni: dipakai uji nyata dan uji mode gagal */
export function periksa({halaman, nyataSet, adaTab, menuRute, tamuKunci}) {
  const reg = new Set(halaman.map(rutaBersih));
  return {
    yatim: [...nyataSet].filter(r => !reg.has(r)).sort(),
    hantu: [...reg].filter(r => !nyataSet.has(r) && !adaTab(r) && !/:id$/.test(r)).sort(),
    tanpaMenu: halaman.filter(e => !tokenEntri(e) && !menuRute.has(e.rute)).map(e => e.rute).sort(),
    tamuBeda: [...new Set([...halaman.filter(e => e.akses === "tamu").map(e => e.rute).filter(r => !tamuKunci.includes(r)),
      ...tamuKunci.filter(r => !halaman.some(e => e.akses === "tamu" && e.rute === r))])].sort()};
}

const SESI = [null, {jenis: "admin", peran: []}, ...["instansi", "petugas", "kemitraan", "pemirsa"].map(jenis => ({jenis, peran: []})),
  ...[...SEMUA_PERAN, "irtama", "unit", "kemitraan", "direktori"].map(p => ({jenis: "staf", peran: [p]}))];
const ruteMenu = (menu = menuUntuk) => new Set(SESI.flatMap(s => menu(s, bolehStaf, false).flatMap(p => p.grup.flatMap(g => g.butir.map(e => e.rute)))));

const NYATA = () => ({halaman: HALAMAN, nyataSet: nyata, adaTab: tab, menuRute: ruteMenu(), tamuKunci: [...PUBLIK_TANPA_SESI.keys()]});
const f = (judul, daftar) => daftar.length ? `${judul} (${daftar.length}): ${daftar.join(", ")}` : "";

test("yatim: tiap halaman nyata tercatat di src/peta_situs.js", () => {
  const {yatim} = periksa(NYATA());
  assert.deepEqual(yatim, [], f("Halaman nyata tanpa entri registri", yatim) +
    "\nAkibat: halaman tak pernah muncul di menu atau peta situs, pengguna tak bisa menemukannya.\nPerbaiki: tambah baris di src/peta_situs.js (pintu, grup, akses), atau, bila bukan halaman sendiri, alias/pengecualian di tests/agen/fixtures/peta_situs_nyata.mjs.");
});
test("hantu: tiap entri registri menunjuk halaman nyata", () => {
  const {hantu} = periksa(NYATA());
  assert.deepEqual(hantu, [], f("Entri registri tanpa halaman nyata", hantu) +
    "\nAkibat: menu menampilkan tautan mati (404).\nPerbaiki: hapus entri dari src/peta_situs.js atau kembalikan halamannya.");
});
test("tiap entri non-token tampil di menu minimal satu sesi (host tak terkunci)", () => {
  const {tanpaMenu} = periksa(NYATA());
  assert.deepEqual(tanpaMenu, [], f("Entri non-token yang tak pernah tampil di menuUntuk", tanpaMenu) +
    "\nAkibat: halaman tercatat tapi tak terjangkau lewat menu pintu mana pun.\nPerbaiki: betulkan pintu/grup/hak/peran entrinya di src/peta_situs.js, atau beri akses \"token\" bila memang tautan bertoken.");
});
test("akses tamu sama persis dengan kunci PUBLIK_TANPA_SESI", () => {
  const {tamuBeda} = periksa(NYATA());
  assert.deepEqual(tamuBeda, [], f("Selisih akses tamu lawan PUBLIK_TANPA_SESI", tamuBeda) +
    "\nAkibat: menu menyebut halaman terbuka padahal Worker menolak tamu, atau sebaliknya.\nPerbaiki: samakan `akses` di src/peta_situs.js dengan PUBLIK_TANPA_SESI di src/worker.js.");
});
test("peta_situs_publik.json segar terhadap generatornya", async () => {
  const json = join(AKAR, "public/inti/peta_situs_publik.json"), gen = join(AKAR, "scripts/agents/peta_situs_publik.mjs");
  assert.ok(existsSync(json) && existsSync(gen), "public/inti/peta_situs_publik.json dan scripts/agents/peta_situs_publik.mjs wajib ada (PS-11)");
  const m = await import(gen);
  const bangun = m.bangun || m.buat || m.bangunPublik || m.hasil || m.default;
  assert.equal(typeof bangun, "function", "generator scripts/agents/peta_situs_publik.mjs harus mengekspor fungsi bangun()/buat()/bangunPublik()");
  const aktual = JSON.parse(readFileSync(json, "utf8"));
  assert.deepEqual(aktual, JSON.parse(JSON.stringify(await bangun())),
    "public/inti/peta_situs_publik.json basi.\nAkibat: kaki situs menampilkan tautan lama.\nPerbaiki: jalankan node scripts/agents/peta_situs_publik.mjs lalu commit hasilnya.");
});

test("mode gagal: gerbang menangkap yatim, hantu, entri tanpa menu, dan selisih tamu", () => {
  const palsu = [{rute: "/ada", akses: "tamu"}, {rute: "/hantu", akses: "sesi"}, {rute: "/tersembunyi", akses: "sesi"}, {rute: "/tamu-salah", akses: "tamu"}, {rute: "/rahasia/x", akses: "token"}];
  const h = periksa({halaman: palsu, nyataSet: new Set(["/ada", "/tersembunyi", "/tamu-salah", "/yatim", "/rahasia/x"]), adaTab: () => false,
    menuRute: new Set(["/ada", "/hantu", "/tamu-salah"]), tamuKunci: ["/ada", "/lupa"]});
  assert.deepEqual(h.yatim, ["/yatim"]);
  assert.deepEqual(h.hantu, ["/hantu"]);
  assert.deepEqual(h.tanpaMenu, ["/tersembunyi"]);   // token dikecualikan
  assert.deepEqual(h.tamuBeda, ["/lupa", "/tamu-salah"]);
  const bersih = periksa({halaman: palsu.slice(0, 1), nyataSet: new Set(["/ada"]), adaTab: () => false, menuRute: new Set(["/ada"]), tamuKunci: ["/ada"]});
  assert.deepEqual(bersih, {yatim: [], hantu: [], tanpaMenu: [], tamuBeda: []});
});

/* PS-09/PS-11: menu tidak ditulis tangan lagi (KEPUTUSAN K2). Daftar menu lama tidak boleh kembali. */
const MENU_LAMA = [["src/admin_halaman.js", /\b(GRUP_ADMIN|GRUP_STAF)\b|^const SUB\s*=/m], ["public/inti/dasbor_admin.js", /\bconst GRUP\s*=/],
  ["public/bnpb/menu_pusdalops.js", /\bCADANGAN\b/], ["public/petugas/menu.js", /\bCADANGAN\s*=/], ["public/kemitraan/menu.js", /\bCADANGAN\s*=/]];
test("menu dari registri: daftar menu tulisan tangan lama tidak kembali", () => {
  const kembali = MENU_LAMA.filter(([b, re]) => existsSync(join(AKAR, b)) && re.test(readFileSync(join(AKAR, b), "utf8"))).map(([b]) => b);
  assert.deepEqual(kembali, [], f("Daftar menu tulisan tangan muncul lagi", kembali) +
    "\nAkibat: menu berbeda dengan registri dan halaman baru tak muncul.\nPerbaiki: ambil menu dari /api/peta-situs atau public/inti/peta_situs_publik.json (src/peta_situs.js).");
});
