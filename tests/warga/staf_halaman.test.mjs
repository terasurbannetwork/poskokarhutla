/* Halaman admin untuk sesi staf (T1/S7), formatter bersama, dan teks bocor "null" (S1). Worker utuh di workerd + D1 lokal; Chrome nyata untuk uji DOM (dilewati bila tidak ada).
   Jalankan: node --test tests/warga/staf_halaman.test.mjs */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import path from "node:path";
import {AKAR} from "./_bantu.mjs";
import {siapkan, berantai, ADMIN} from "./_bnpb.mjs";
import "../../src/worker.js";
import {PROV, durasi} from "../../src/instansi.js";
import {P_VALIDASI, P_KONSESI} from "../../src/staf.js";
import {PERAN_BACA} from "../../src/omc.js";
import {P_SIPPA_BACA} from "../../src/sippa.js";
import {HALAMAN_STAF} from "../../src/admin_halaman.js";
import * as S from "../../public/laporan_karhutla_spek.js";
import {cariChrome, bukaPeramban} from "../bnpb/_peramban.mjs";
import {buatDunia} from "../bnpb/_dunia.mjs";

const uji = berantai(), PB = {"x-pb": "1"}, teks = (...p) => readFileSync(path.join(AKAR, ...p), "utf8");
const U = await siapkan("uji-staf-halaman", {r2: true}), {api} = U;
let ip = 0;
const bikin = async (peran, wilayah = []) => {
  const r = await api("POST", "/api/staf/admin/buat", {nama: "Staf " + peran[0], nip: `1980${++ip}0012005`, unit: "Pusdalops BNPB", email: `s${ip}@bnpb.go.id`, wa: "081234567890", peran, wilayah}, ADMIN);
  assert.equal(r.s, 201, r.t);
  const m = await api("POST", "/api/staf/masuk", {username: r.j.username, sandi: r.j.sandi}, {"cf-connecting-ip": `198.51.100.${ip}`}), cookie = m.h.get("set-cookie").split(";")[0];
  assert.equal((await api("POST", "/api/staf/gantisandi", {}, {cookie, ...PB})).s, 200);
  return {cookie};
};

uji("T1: /admin/instansi untuk staf berperan memakai kerangka staf; peran lain ke Meja Pantau; tanpa sesi ke login admin; admin penuh dengan sub-nav", async () => {
  const ver = await bikin(["verifikator"]), ana = await bikin(["analis_konsesi"]), tmc = await bikin(["tmc"]);
  const a = await api("GET", "/admin/instansi", undefined, ver); assert.equal(a.s, 200);
  assert.match(a.t, /data-staf="1" data-peran="verifikator"/); assert.match(a.t, /<span class="ad-sep staf">Staf<\/span>/); assert.doesNotMatch(a.t, /action="\/admin\/keluar"/); assert.match(a.t, /data-staf-keluar/);
  assert.doesNotMatch(a.t, /href="\/admin\/omc"/, "menu hanya halaman yang boleh dibuka perannya"); assert.match(a.t, /href="\/admin\/laporan-karhutla"/); assert.doesNotMatch(a.t, /class="ad-sub"/);
  const k = await api("GET", "/admin/posko", undefined, ana); assert.equal(k.s, 200); assert.match(k.t, /href="\/admin\/posko"/);
  const man = async (j, h = {}) => { const r = await U.mf.dispatchFetch("http://bnpb.lokal" + j, {headers: h, redirect: "manual"}); await r.text(); return {s: r.status, h: r.headers}; };
  const t = await man("/admin/instansi", tmc); assert.equal(t.s, 303); assert.equal(t.h.get("location"), "/admin/pantau", "staf tanpa peran cocok tidak dilempar ke login admin");
  const an = await man("/admin/instansi"); assert.equal(an.s, 303); assert.match(an.h.get("location"), /\/admin\/masuk/);
  const ad = await api("GET", "/admin/instansi", undefined, ADMIN); assert.equal(ad.s, 200); assert.match(ad.t, /<span class="ad-sep">Admin<\/span>/);
  for (const k2 of ["laporan-karhutla", "omc", "inventaris", "pantau"]) assert.match(ad.t.match(/<nav class="ad-sub"[\s\S]*?<\/nav>/)[0], new RegExp(`href="/admin/${k2}"`), `sub-nav Akun Instansi memuat ${k2}`);
  const pa = await api("GET", "/admin/pantau", undefined, ver); assert.match(pa.t, /ad-sep staf/); assert.match(pa.t, /\/inti\/format\.js/);
  const omc = await api("GET", "/admin/omc", undefined, tmc); assert.equal(omc.s, 200); assert.match(omc.t, /data-masuk="1"/);
  /* halaman Ruang Koordinasi lain: staf tanpa peran yang cocok ke Meja Pantau, anonim ke login admin (bukan kerangka kosong) */
  for (const [j, boleh, tolak] of [["/admin/omc", tmc, ver], ["/admin/inventaris", ver, tmc]]) { assert.equal((await api("GET", j, undefined, boleh)).s, 200, j); const sal = await man(j, tolak); assert.equal(sal.s, 303, j); assert.equal(sal.h.get("location"), "/admin/pantau", j + " peran tak cocok"); const an2 = await man(j); assert.equal(an2.s, 303, j); assert.match(an2.h.get("location"), /\/admin\/masuk/, j + " anonim"); }
  assert.equal((await man("/admin/laporan-karhutla", tmc)).s, 200, "laporan karhutla: semua staf"); assert.equal((await man("/admin/laporan-karhutla")).s, 303); assert.equal((await api("GET", "/admin/pantau")).s, 200, "Meja Pantau tetap memuat layar masuk staf");
});
uji("hak halaman staf sama dengan hak API-nya (satu sumber)", () => {
  assert.deepEqual([...HALAMAN_STAF.omc].sort(), [...PERAN_BACA].sort());
  assert.deepEqual([...HALAMAN_STAF.instansi].sort(), [...new Set([...P_VALIDASI, ...P_KONSESI])].sort());
  assert.deepEqual(HALAMAN_STAF.posko, P_KONSESI);
  assert.deepEqual(HALAMAN_STAF.pipa, P_SIPPA_BACA, "SIPPA: hak halaman = hak baca API (src/sippa.js)");
  const kl = teks("public/admin/instansi.js"); assert.match(kl, /TAB_PERAN = \{validasi: \["verifikator", "pusdalops"\], akun: \[\], pantau: \["pusdalops"\], kontak: \["analis_konsesi"\]\}/);
});
uji("S3 dan R9: fmt.durasi = durasi Worker; PROV klien = server; ejaan resmi Palangka Raya", () => {
  const ctx = vm.createContext({document: {querySelector() {}, getElementById() {}}});
  vm.runInContext(teks("public/inti/format.js").replace(/const \$ = .*\n/, "") + "\nthis.fmt = fmt;", ctx);
  const f = ctx.fmt.durasi;
  assert.equal(f(45 * 60e3), "45 menit"); assert.equal(f((6 * 60 + 24) * 60e3), "6 jam 24 menit"); assert.equal(f((34 * 60) * 60e3), "1 hari 10 jam"); assert.equal(f(137 * 60e3), "2 jam 17 menit"); assert.equal(f(2 * 3600e3), "2 jam");
  for (const ms of [0, 1e3, 59e3, 61e3, 3600e3, 3660e3, 86400e3, 90000e3, 5e8, -7260e3]) assert.equal(f(ms), durasi(ms), `ms ${ms}`);
  const w = {}; vm.runInContext(teks("public/instansi_wilayah.js"), vm.createContext({window: w}));
  assert.equal(JSON.stringify(w.Wilayah.PROV), JSON.stringify(Object.fromEntries(Object.entries(PROV).map(([k, v]) => [k, v[1]]))));
  assert.equal(w.Wilayah.kab("Kota Palangkaraya"), "Kota Palangka Raya"); assert.equal(w.Wilayah.teks("Api di Sabangau, Kota Palangkaraya"), "Api di Sabangau, Kota Palangka Raya");
  for (const f2 of ["public/instansi.js", "public/admin/instansi.js", "public/admin/pantau.js"]) assert.doesNotMatch(teks(f2), /const (jamTeks|durasiTeks|lama) = ms =>/, `${f2}: tanpa formatter durasi lokal`);
});
uji("S4 dan S9: label alat satu sumber; galat spek berbahasa manusia; isian kosong menuntut isi minimal", () => {
  assert.equal(S.labelAlat("selang_2_5"), "selang 2,5 inci"); assert.match(teks("public/laporan_karhutla_wa.js"), /labelAlat\b.*laporan_karhutla_spek|import \{[^}]*labelAlat[^}]*\} from "\.\/laporan_karhutla_spek\.js"/);
  assert.equal(S.galatManusia({jalur: "fs[2].padam_udara_ha", pesan: "wajib diisi (isi 0 bila tidak ada)"}), "Fire spot 3: padam udara wajib diisi (isi 0 bila tidak ada)");
  const kurang = S.kurangMinimal("prov:62", {}, "2026-10-21"); assert.ok(kurang.length >= 1 && kurang.every(x => !/\[\d+\]/.test(x)), kurang.join("; "));
  const bad = S.normalisasi("prov:62", {fs: [{kab: "A", target_ha: "1"}, {kab: "B", target_ha: "1"}, {kab: "C", target_ha: "1"}]}, "2026-10-21", true);
  assert.ok(bad.galat.map(S.galatManusia).some(x => x.startsWith("Fire spot 3: padam udara wajib diisi")));
  assert.match(teks("public/instansi_laporan.js"), /Isi minimal: /); assert.match(teks("src/laporan_karhutla.js"), /S\.galatManusia\(g\[0\]\)/);
});
uji("R5 dan S10: kontak lama hanya untuk usulan menunggu; selesai ditolak server", () => {
  assert.match(teks("src/instansi.js"), /kontak_lama: u\.status === "menunggu" \?/); assert.match(teks("src/pantau.js"), /const SELESAI_MANUAL = new Set\(\)/);
  assert.doesNotMatch(teks("public/admin/instansi.js"), /id perusahaan \$\{/, "kartu usulan menampilkan nama PT, bukan id");
});

/* S1: tanpa simpul teks "null" di layar admin (Chrome nyata, data dummy lewat dunia uji) */
const CHROME = cariChrome();
if (!CHROME) uji("S1 DILEWATI: Chrome tidak ditemukan", async () => {});
else uji("S1: tak ada simpul teks null atau undefined di Meja Pantau, Inventaris, OMC (form terbuka), Akun Instansi", async () => {
  const dunia = await buatDunia(), br = await bukaPeramban(CHROME), tab = await br.tab();
  try {
    for (const m of ["instansi/admin", "inventaris", "omc", "pantau"]) await dunia.api("POST", `/api/${m}/dummy`, {aksi: "isi"});
    await tab.cookie(dunia.base, "sesi_admin", dunia.sesi); await tab.ukuran(1440, 900);
    const bocor = () => tab.eval(`(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const o = []; while (w.nextNode()) if (/^\\s*(null|undefined)\\s*$/.test(w.currentNode.nodeValue)) o.push(w.currentNode.parentElement.outerHTML.slice(0, 100)); return o; })()`);
    for (const [u, aksi] of [["/admin/pantau"], ["/admin/inventaris"], ["/admin/omc", "[data-baru]"], ["/admin/instansi#pantau"], ["/admin/instansi#akun"]]) {
      await tab.buka(dunia.base + u, {tunggu: "body *"}); await tab.tungguFungsi("document.readyState === 'complete'"); await new Promise(r => setTimeout(r, 1500));
      if (aksi) { await tab.klik(aksi); await new Promise(r => setTimeout(r, 900)); }
      assert.deepEqual(await bocor(), [], `${u}: simpul teks null`);
    }
  } finally { await tab.tutup(); await br.tutup(); await dunia.tutup(); }
});
