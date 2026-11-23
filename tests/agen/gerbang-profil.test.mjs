// Gerbang paket profil-bpbd (data/kajian-bnpb/profil-bpbd/RENCANA-UJI.md bagian 2, GP-1..GP-16).
// Statis: membaca kode apa adanya. Tiap gerbang punya uji "mode gagal" (masukan buruk harus tertangkap), lalu uji atas repo.
// GP-14..GP-16 menjaga kode PF-07..PF-09 yang belum ada: logikanya lengkap, dibuka (skip dihapus) saat tiketnya selesai.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, existsSync, statSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {join} from "node:path";

const AKAR = fileURLToPath(new URL("../../", import.meta.url));
const baca = rel => readFileSync(join(AKAR, rel), "utf8");
const srcProfil = () => readdirSync(join(AKAR, "src")).filter(f => /^profil.*\.js$/.test(f)).map(f => `src/${f}`);
const tanpaKomentar = s => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
const SEBAB = "Perbaiki: lihat data/kajian-bnpb/profil-bpbd/RENCANA-UJI.md bagian Gerbang";

// badan fungsi menurut indentasi: dari baris deklarasi sampai baris penutup "}" berindentasi sama
export function badanFungsi(src, nama) {
  const m = new RegExp(`^([ \\t]*)(?:export\\s+)?(?:async\\s+)?function\\s+${nama}\\s*\\(`, "m").exec(src);
  if (!m) return null;
  const sisa = src.slice(m.index), akhir = sisa.indexOf(`\n${m[1]}}`, 1);
  return akhir < 0 ? sisa : sisa.slice(0, akhir + 2 + m[1].length);
}
// handler untuk kunci rute di peta rute: `"GET /x": nama` atau `"GET /x": (a) => nama(...)`
export function handlerRute(src, kunci) {
  const m = new RegExp(`"${kunci.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}":\\s*(?:\\([^)]*\\)\\s*=>\\s*)?(\\w+)`).exec(src);
  return m?.[1] ?? null;
}

// GP-1
export const konsolBocor = src => (tanpaKomentar(src).match(/console\.\w+\([^;\n]*/g) || []).filter(l => /pin|sandi|token/i.test(l));
test("GP-1 mode gagal: console.log memuat pin/sandi/token tertangkap", () => {
  assert.equal(konsolBocor('console.log("masuk", pin);').length, 1);
  assert.equal(konsolBocor('console.error(sandiBaru)').length, 1);
  assert.equal(konsolBocor('console.error("galat", e.message); // pin').length, 0);
});
test("GP-1 src/profil*.js tidak mencetak pin, sandi, token", () => {
  const berkas = srcProfil(); assert.ok(berkas.length >= 3, "src/profil*.js tidak ditemukan");
  const bocor = berkas.flatMap(f => konsolBocor(baca(f)).map(l => `${f}: ${l}`));
  assert.deepEqual(bocor, [], `Rahasia PIN bisa masuk log Cloudflare. ${SEBAB} (GP-1): hapus variabel itu dari console.*\n${bocor.join("\n")}`);
});

// GP-2
export const kirimWA = src => { const s = tanpaKomentar(src); return [/from\s+["'][^"']*\/wa(\.js)?["']/.test(s) && "impor wa.js", /\bwa_antre\b/.test(s) && "menyentuh wa_antre"].filter(Boolean); };
test("GP-2 mode gagal: impor wa.js dan wa_antre tertangkap", () => {
  assert.deepEqual(kirimWA('import {kirim} from "./wa.js";'), ["impor wa.js"]);
  assert.deepEqual(kirimWA('INSERT INTO wa_antre (x)'), ["menyentuh wa_antre"]);
  assert.deepEqual(kirimWA('import {normalWA} from "./worker.js";'), []);
});
test("GP-2 src/profil*.js tidak mengirim WA", () => {
  const s = srcProfil().flatMap(f => kirimWA(baca(f)).map(x => `${f}: ${x}`));
  assert.deepEqual(s, [], `Profil PIC tidak boleh memicu pesan WA (pengiriman ulang undangan hanya PF-07 lewat hak.js). ${SEBAB} (GP-2)\n${s.join("\n")}`);
});

// GP-3
export function langgarMigrasi(sql) {
  const s = tanpaKomentar(sql.replace(/^\s*--.*$/gm, "")), g = [];
  if (/\bDROP\b/i.test(s)) g.push("DROP");
  if (/\bALTER\s+TABLE\b/i.test(s)) g.push("ALTER TABLE");
  for (const m of s.matchAll(/CREATE\s+(?:UNIQUE\s+)?(TABLE|INDEX|TRIGGER)\s+(?!IF\s+NOT\s+EXISTS)(\w+)/gi)) g.push(`CREATE ${m[1]} ${m[2]} tanpa IF NOT EXISTS`);
  for (const m of s.matchAll(/CREATE\s+(?:UNIQUE\s+)?(?:INDEX|TRIGGER)\s+IF\s+NOT\s+EXISTS\s+\w+[^;]*?\bON\s+(\w+)/gi)) if (!/^instansi_(profil|sesi_profil)/.test(m[1])) g.push(`pemicu atau indeks di tabel lain: ${m[1]}`);
  for (const m of s.matchAll(/CREATE\s+TRIGGER\s+IF\s+NOT\s+EXISTS\s+\w+\s+BEFORE\s+\w+\s+ON\s+(\w+)/gi)) if (!/^instansi_(profil|sesi_profil)/.test(m[1])) g.push(`pemicu di tabel lain: ${m[1]}`);
  return [...new Set(g)];
}
test("GP-3 mode gagal: DROP, ALTER, CREATE tanpa IF NOT EXISTS, indeks di tabel lain tertangkap", () => {
  assert.ok(langgarMigrasi("DROP TABLE x;").includes("DROP"));
  assert.ok(langgarMigrasi("ALTER TABLE instansi_akun ADD COLUMN x;").includes("ALTER TABLE"));
  assert.equal(langgarMigrasi("CREATE TABLE t (a);").length, 1);
  assert.equal(langgarMigrasi("CREATE INDEX IF NOT EXISTS i ON instansi_akun (a);").length, 1);
  assert.deepEqual(langgarMigrasi("-- DROP di komentar\nCREATE TABLE IF NOT EXISTS instansi_profil (a);"), []);
});
test("GP-3 migrasi 0166 hanya CREATE IF NOT EXISTS atas tabel profilnya sendiri", () => {
  const g = langgarMigrasi(baca("migrations/0166_profil_bpbd.sql"));
  assert.deepEqual(g, [], `Migrasi harus idempoten dan tidak mengubah tabel lama. ${SEBAB} (GP-3)\n${g.join("\n")}`);
});

// GP-4
export const aksesD1Liar = src => (tanpaKomentar(src).match(/\benv\.DB\b|\.prepare\(/g) || []).length;
test("GP-4 mode gagal: env.DB dan prepare di luar hak.js tertangkap", () => {
  assert.equal(aksesD1Liar("await env.DB.prepare('x')"), 2);
  assert.equal(aksesD1Liar("await H.pfProfil(env, a, id)"), 0);
});
test("GP-4 akses D1 profil hanya lewat fungsi pf* di src/hak.js; fixture sisa tidak memuat profil", () => {
  const liar = srcProfil().filter(f => aksesD1Liar(baca(f)) > 0);
  assert.deepEqual(liar, [], `src/profil*.js menyentuh D1 langsung. ${SEBAB} (GP-4): pindahkan kueri ke fungsi pf* di src/hak.js`);
  const hak = baca("src/hak.js"); assert.ok(/export const pfProfilAkun\b/.test(hak) && /export const pfLog\b/.test(hak), "fungsi pf* hilang dari src/hak.js");
  for (const f of ["d1-sisa.json", "d1-pindai.json"]) {
    const kunci = Object.keys(JSON.parse(baca(`tests/agen/fixtures/${f}`))).filter(k => /profil/.test(k));
    assert.deepEqual(kunci, [], `tests/agen/fixtures/${f} memuat ${kunci}: berkas profil tidak boleh jadi utang D1. ${SEBAB} (GP-4)`);
  }
});

// GP-5
const PEMERIKSA = /akunMasuk|sesiProfilDari|modOK|modAtauStaf/;
export function rutePenjaga(src) {
  const rute = [...src.matchAll(/"((?:GET|POST) \/api\/instansi\/[^"]*)":\s*(\w+)/g)].map(m => [m[1], m[2]]);
  const ada = new Set(rute.map(r => r[1])), bantu = ["akunPemda", "profilMilik", "bolehUbah", "akunAdmin"];
  const sah = new Set();
  for (let putaran = 0; putaran < 4; putaran++) for (const b of bantu) { const t = badanFungsi(src, b) || ""; if (PEMERIKSA.test(t) || [...sah].some(x => new RegExp(`\\b${x}\\(`).test(t))) sah.add(b); }
  return {rute, tanpa: rute.filter(([, h]) => { const t = badanFungsi(src, h) || ""; return !(PEMERIKSA.test(t) || [...sah].some(x => new RegExp(`\\b${x}\\(`).test(t))); }).map(r => r[0]), ada: ada.size};
}
test("GP-5 mode gagal: handler tanpa pemeriksa sesi tertangkap", () => {
  const bur = `const x = {\n    "GET /api/instansi/profil": daftar,\n  };\n  async function daftar(env, req) {\n    return json({});\n  }\n`;
  assert.deepEqual(rutePenjaga(bur).tanpa, ["GET /api/instansi/profil"]);
  assert.deepEqual(rutePenjaga(bur.replace("return json", "await D.akunMasuk(env); return json")).tanpa, []);
});
test("GP-5 tiap rute /api/instansi/profil* dan admin/profil* memeriksa sesi atau hak", () => {
  const {rute, tanpa} = rutePenjaga(baca("src/profil.js"));
  assert.ok(rute.length >= 12, `hanya ${rute.length} rute profil terbaca: parser atau src/profil.js berubah`);
  assert.deepEqual(tanpa, [], `Rute profil tanpa pemeriksaan sesi: terbuka untuk siapa pun. ${SEBAB} (GP-5): panggil akunMasuk, sesiProfilDari, modOK, atau modAtauStaf\n${tanpa.join("\n")}`);
});

// GP-6
export function bocorPin(js) {
  const s = tanpaKomentar(js), g = [];
  for (const k of ["localStorage", "sessionStorage", "document.cookie"]) if (s.includes(k)) g.push(k);
  if (/setAttribute\(\s*["'][^"']*["']\s*,[^)]*\bpin\w*/.test(s)) g.push("PIN ke atribut DOM");
  if (/dataset\.\w+\s*=[^;\n]*\bpin\w*/.test(s)) g.push("PIN ke dataset");
  if (/data-[\w-]+="\$\{[^}]*\bpin\w*[^}]*\}"/.test(s)) g.push("PIN ke data-atribut");
  if (/[?&]pin=|(?:location|history)\.[^;\n]*\bpin\b|URLSearchParams[^;\n]*\bpin\b/.test(s)) g.push("PIN ke URL");
  return g;
}
test("GP-6 mode gagal: PIN ke storage, atribut, dataset, URL tertangkap", () => {
  assert.deepEqual(bocorPin('localStorage.setItem("pin", p)'), ["localStorage"]);
  assert.deepEqual(bocorPin('el.setAttribute("data-x", pin)'), ["PIN ke atribut DOM"]);
  assert.deepEqual(bocorPin("el.dataset.p = pinSementara;"), ["PIN ke dataset"]);
  assert.deepEqual(bocorPin('fetch(`/x?pin=${p}`)'), ["PIN ke URL"]);
  assert.deepEqual(bocorPin('e.currentTarget.setAttribute("aria-label", buka ? "Sembunyikan PIN" : "Tampilkan PIN")'), []);
});
test("GP-6 layar profil tidak menyimpan atau menyalin PIN", () => {
  const g = ["public/instansi_profil.js", "public/admin/instansi_profil.js"].flatMap(f => bocorPin(baca(f)).map(x => `${f}: ${x}`));
  assert.deepEqual(g, [], `PIN bisa terbaca skrip lain atau tersimpan di peramban bersama. ${SEBAB} (GP-6): PIN hanya di memori variabel dan kolom isian\n${g.join("\n")}`);
});

// GP-7
export function warnaLiteral(css) {
  const s = tanpaKomentar(css).replace(/var\([^)]*\)/g, ""), g = [];
  for (const m of s.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|hwb)\(/g)) g.push(m[0]);
  if (/text-transform\s*:\s*uppercase/i.test(s)) g.push("text-transform: uppercase");
  return g;
}
test("GP-7 mode gagal: warna literal dan uppercase tertangkap", () => {
  assert.deepEqual(warnaLiteral("a{color:#fff}"), ["#fff"]);
  assert.deepEqual(warnaLiteral("a{background:rgb(1,2,3)}"), ["rgb("]);
  assert.deepEqual(warnaLiteral("a{text-transform:uppercase}"), ["text-transform: uppercase"]);
  assert.deepEqual(warnaLiteral("a{color:var(--c, #fff)}"), []);
});
test("GP-7 public/instansi_profil.css tanpa warna literal dan tanpa huruf kapital paksa", () => {
  const g = warnaLiteral(baca("public/instansi_profil.css"));
  assert.deepEqual(g, [], `Gaya menyimpang dari token tema. ${SEBAB} (GP-7): pakai var(--...) dari public/inti/tema.css\n${g.join("\n")}`);
});

// GP-8
export function undanganBermasalah(js) {
  const m = /const undangan\s*=\s*r\s*=>\s*`([\s\S]*?)`;/.exec(js); if (!m) return ["fungsi undangan tidak ditemukan"];
  const t = m[1], g = [];
  if (/tugas api/i.test(t)) g.push('memuat "tugas api"');
  if (/Pantau Bencana/i.test(t)) g.push('memuat "Pantau Bencana"');
  for (const n of [1, 2, 3]) if (!new RegExp(`(^|\\\\n)${n}\\. `).test(t)) g.push(`langkah ${n} hilang`);
  return g;
}
test("GP-8 mode gagal: undangan lama atau tanpa tiga langkah tertangkap", () => {
  const ok = "const undangan = r => `Yth.\\n1. a\\n2. b\\n3. c`;";
  assert.deepEqual(undanganBermasalah(ok), []);
  assert.deepEqual(undanganBermasalah(ok.replace("Yth.", "tugas api")), ['memuat "tugas api"']);
  assert.deepEqual(undanganBermasalah(ok.replace("Yth.", "Pantau Bencana")), ['memuat "Pantau Bencana"']);
  assert.deepEqual(undanganBermasalah(ok.replace("\\n3. c", "")), ["langkah 3 hilang"]);
});
test("GP-8 teks undangan admin memuat tiga langkah daftar PIC", () => {
  const g = undanganBermasalah(baca("public/admin/instansi.js"));
  assert.deepEqual(g, [], `Teks undangan salah arah ke kontak BPBD. ${SEBAB} (GP-8)\n${g.join("\n")}`);
});

// GP-9
export const saringSebelumIris = body => { const f = body.search(/\.filter\([^)]*adaPemda/), s = body.indexOf(".slice("); return f >= 0 && s >= 0 && f < s; };
test("GP-9 mode gagal: slice sebelum filter tertangkap", () => {
  assert.equal(saringSebelumIris("const d = defs.slice(a, b).filter(x => adaPemda(x.jenis));"), false);
  assert.equal(saringSebelumIris("const d = all.filter(d => adaPemda(d.jenis)); d.slice(a, b)"), true);
});
test("GP-9 buatMassal menyaring jenis pemda sebelum slice", () => {
  const b = badanFungsi(baca("src/instansi.js"), "buatMassal"); assert.ok(b, "buatMassal tidak ditemukan");
  assert.ok(saringSebelumIris(b), `Halaman batch bisa kosong atau memuat Polri dan TNI. ${SEBAB} (GP-9): .filter(adaPemda) sebelum .slice di buatMassal`);
});

// GP-10
test("GP-10 mode gagal: regex tanpa sesi_profil tertangkap", () => {
  const f = s => /\bsesi_profil\b/.test(badanFungsi(`export const tolakOrigin = (req) => {\n  ${s}\n};\n`.replace("export const tolakOrigin = (req) =>", "export function tolakOrigin(req)"), "tolakOrigin") || "");
  assert.equal(f("x = /sesi_admin|sesi_profil/"), true);
  assert.equal(f("x = /sesi_admin|sesi_masuk/"), false);
});
test("GP-10 sesi_profil ada di regex tolakOrigin", () => {
  const w = baca("src/worker.js"), i = w.indexOf("export const tolakOrigin"); assert.ok(i >= 0, "tolakOrigin hilang");
  const t = w.slice(i, w.indexOf("\n};", i));
  assert.ok(/sesi_profil/.test(t), `POST dengan kuki profil dari asal lain lolos (CSRF). ${SEBAB} (GP-10): tambah sesi_profil ke regex kuki di tolakOrigin`);
});

// GP-11
export const urutanProfilDulu = body => { const p = body.indexOf("sesiProfilDari("), m = body.indexOf("sesiMasuk("); return p >= 0 && (m < 0 || p < m); };
test("GP-11 mode gagal: sesiMasuk lebih dulu atau tanpa sesiProfilDari tertangkap", () => {
  assert.equal(urutanProfilDulu("await sesiMasuk(); await sesiProfilDari();"), false);
  assert.equal(urutanProfilDulu("await sesiMasuk();"), false);
  assert.equal(urutanProfilDulu("await sesiProfilDari(); await sesiMasuk();"), true);
});
test("GP-11 hakMeja memanggil sesiProfilDari sebelum sesiMasuk", () => {
  const b = badanFungsi(baca("src/lapor_ai.js"), "hakMeja"); assert.ok(b, "hakMeja tidak ditemukan");
  assert.ok(urutanProfilDulu(b), `Meja laporan BPBD tidak lagi lewat sesi profil (K63). ${SEBAB} (GP-11)`);
});

// GP-12
export function rutePasangLiar(workerSrc, instansiSrc) {
  const g = [], w = tanpaKomentar(workerSrc);
  for (const m of w.matchAll(/"POST \/api\/instansi\/[^"]*"\s*:/g)) g.push(`worker.js mendaftarkan ${m[0]}`);
  if (/\brutePofil\b/.test(w)) g.push("worker.js memakai rutePofil langsung, bukan lewat RUTE_INSTANSI");
  const i = instansiSrc.indexOf("const RUTE_ASLI = {"), j = instansiSrc.indexOf("\n};", i);
  if (i < 0 || !/\.\.\.rutePofil\(/.test(instansiSrc.slice(i, j))) g.push("rutePofil tidak disebar di dalam RUTE_ASLI");
  if (!/Object\.entries\(RUTE_ASLI\)\.map/.test(instansiSrc)) g.push("RUTE_INSTANSI tidak membungkus semua RUTE_ASLI");
  return g;
}
test("GP-12 mode gagal: rute POST liar tertangkap", () => {
  const ins = "const RUTE_ASLI = {\n  ...rutePofil({}),\n};\nexport const RUTE_INSTANSI = Object.fromEntries(Object.entries(RUTE_ASLI).map(x));";
  assert.deepEqual(rutePasangLiar("const R = {};", ins), []);
  assert.equal(rutePasangLiar('const R = {"POST /api/instansi/x": f};', ins).length, 1);
  assert.equal(rutePasangLiar("const R = {};", ins.replace("...rutePofil({}),", "")).length, 1);
});
test("GP-12 semua rute POST /api/instansi/* lewat pembungkus RUTE_INSTANSI", () => {
  const g = rutePasangLiar(baca("src/worker.js"), baca("src/instansi.js"));
  assert.deepEqual(g, [], `Rute lolos dari header x-pb dan log kerja. ${SEBAB} (GP-12)\n${g.join("\n")}`);
});

// GP-13
export const periksaWajibGanti = ({akunAktif, hakMeja, pembungkus}) => Object.entries({akunAktif, hakMeja, pembungkus}).filter(([, t]) => !(t && /sesiProfilDari/.test(t) && /pin_wajib_ganti/.test(t))).map(([k]) => k);
test("GP-13 mode gagal: pemeriksaan pin_wajib_ganti dihapus tertangkap", () => {
  const ok = "sesiProfilDari(); p.pin_wajib_ganti";
  assert.deepEqual(periksaWajibGanti({akunAktif: ok, hakMeja: ok, pembungkus: ok}), []);
  assert.deepEqual(periksaWajibGanti({akunAktif: ok, hakMeja: "sesiProfilDari()", pembungkus: ok}), ["hakMeja"]);
  assert.deepEqual(periksaWajibGanti({akunAktif: ok, hakMeja: ok, pembungkus: null}), ["pembungkus"]);
});
test("GP-13 akunAktif, hakMeja, dan pembungkus rute memeriksa pin_wajib_ganti", () => {
  const ins = baca("src/instansi.js"), i = ins.indexOf("export const RUTE_INSTANSI");
  const g = periksaWajibGanti({akunAktif: badanFungsi(ins, "akunAktif"), hakMeja: badanFungsi(baca("src/lapor_ai.js"), "hakMeja"), pembungkus: i < 0 ? null : ins.slice(i, ins.indexOf("}]));", i))});
  assert.deepEqual(g, [], `Sesi dengan PIN awal (diketahui admin) bisa bekerja penuh. ${SEBAB} (GP-13): ${g.join(", ")}`);
});

// GP-14 (PF-09)
const PF09 = "PF-09 belum dikerjakan";
const daftarBerkas = (rel, hasil = []) => { const d = join(AKAR, rel); if (!existsSync(d)) return hasil; for (const e of readdirSync(d)) { const r = `${rel}/${e}`; statSync(join(AKAR, r)).isDirectory() ? daftarBerkas(r, hasil) : hasil.push(r); } return hasil; };
export const bocorPic = ({kontak, info, dataPublik, meja}) => {
  const g = [];
  for (const [k, t] of Object.entries({kontak, info})) if (/\bpfPic\w*/.test(t)) g.push(`${k} memakai fungsi PIC`);
  for (const [f, t] of Object.entries(dataPublik)) if (/"pic_?(wa|hp|nomor)\w*"|\bpfPic\w*/i.test(t)) g.push(`${f} memuat nomor PIC`);
  if (/\b0\d{9,12}\b|\+?62\d{9,12}/.test(meja)) g.push("meja.js memuat nomor telepon literal");
  if (/\bpic\b/i.test(meja) && !/\/pic\b/.test(meja)) g.push("meja.js memuat PIC tanpa rute staf /pic");
  return g;
};
test("GP-14 mode gagal: nomor PIC di jawaban pelapor, data publik, atau meja tertangkap", () => {
  const ok = {kontak: "", info: "", dataPublik: {}, meja: "fetch(`/api/lapor/meja/${n}/pic`)"};
  assert.deepEqual(bocorPic(ok), []);
  assert.equal(bocorPic({...ok, info: "pfPicAktif(env)"}).length, 1);
  assert.equal(bocorPic({...ok, dataPublik: {"a.json": '{"pic_wa":"x"}'}}).length, 1);
  assert.equal(bocorPic({...ok, meja: "pic 081234567890"}).length >= 1, true);
});
test("GP-14 nomor PIC tidak bocor ke pelapor, data publik, atau meja", {skip: /export (?:async )?(?:const|function) pfPic/.test(baca("src/hak.js")) ? false : PF09}, () => {
  const dataPublik = Object.fromEntries(daftarBerkas("public/data").filter(f => /\.(json|csv|txt)$/.test(f)).map(f => [f, baca(f)]));
  const g = bocorPic({kontak: baca("src/lapor_kontak.js"), info: baca("src/lapor_info.js"), dataPublik, meja: baca("public/lapor/meja.js")});
  assert.deepEqual(g, [], `Nomor pribadi PIC bisa terbaca pelapor atau publik. ${SEBAB} (GP-14)\n${g.join("\n")}`);
});

// GP-15 (PF-07)
export const undangUlangBermasalah = ({badan, berkasUndangPf}) => {
  const g = [];
  if (!badan) return ["handler undang-ulang tidak ditemukan"];
  if (/\bsandi\w*/i.test(badan.replace(/tanpa sandi/gi, ""))) g.push("handler undang-ulang menyentuh variabel sandi");
  for (const [f, t] of Object.entries(berkasUndangPf)) if (f !== "src/hak.js" && /undang_pf/.test(tanpaKomentar(t)) && /wa_antre/.test(tanpaKomentar(t))) g.push(`${f} menulis wa_antre undang_pf di luar hak.js`);
  return g;
};
test("GP-15 mode gagal: sandi di undang-ulang atau tulis wa_antre di luar hak.js tertangkap", () => {
  assert.equal(undangUlangBermasalah({badan: "const pesan = `sandi ${sandi}`", berkasUndangPf: {}}).length, 1);
  assert.equal(undangUlangBermasalah({badan: "ok", berkasUndangPf: {"src/profil.js": "INSERT INTO wa_antre undang_pf"}}).length, 1);
  assert.deepEqual(undangUlangBermasalah({badan: "ok", berkasUndangPf: {"src/hak.js": "INSERT INTO wa_antre undang_pf"}}), []);
  assert.equal(undangUlangBermasalah({badan: null, berkasUndangPf: {}}).length, 1);
});
const adaUndang = () => srcProfil().some(f => /undang-ulang/.test(baca(f)));
test("GP-15 undang-ulang tanpa sandi dan wa_antre undang_pf hanya via hak.js", {skip: adaUndang() ? false : "PF-07 belum dikerjakan"}, () => {
  const f = srcProfil().find(f => /undang-ulang/.test(baca(f))), s = baca(f);
  const nama = handlerRute(s, s.match(/(?:GET|POST) [^"]*undang-ulang[^"]*/)?.[0]);
  const berkasUndangPf = Object.fromEntries(readdirSync(join(AKAR, "src")).filter(x => x.endsWith(".js")).map(x => [`src/${x}`, baca(`src/${x}`)]));
  const g = undangUlangBermasalah({badan: nama && badanFungsi(s, nama), berkasUndangPf});
  assert.deepEqual(g, [], `Sandi tidak boleh dikirim lewat WA atau antrean. ${SEBAB} (GP-15)\n${g.join("\n")}`);
});

// GP-16 (PF-08/PF-09)
export const rutePicTanpaHak = (src, kunciList) => kunciList.filter(k => {
  const h = handlerRute(src, k), b = h && badanFungsi(src, h);
  return !(b && /\bhakMeja\(/.test(b) && /\bbnpb\b/.test(b));
});
test("GP-16 mode gagal: handler tanpa hakMeja atau tanpa pembatas bnpb tertangkap", () => {
  const src = (isi) => `const R = {\n  "GET /api/lapor/respons": respons,\n};\nasync function respons(env, req) {\n${isi}\n}\n`;
  assert.deepEqual(rutePicTanpaHak(src("const h = await hakMeja(env); if (!h.c.bnpb) return tolak();"), ["GET /api/lapor/respons"]), []);
  assert.deepEqual(rutePicTanpaHak(src("const h = await hakMeja(env);"), ["GET /api/lapor/respons"]), ["GET /api/lapor/respons"]);
  assert.deepEqual(rutePicTanpaHak(src("return json({});"), ["GET /api/lapor/respons"]), ["GET /api/lapor/respons"]);
});
const dgnRuteLapor = () => readdirSync(join(AKAR, "src")).filter(f => /^lapor.*\.js$/.test(f)).map(f => `src/${f}`).find(f => /api\/lapor\/respons/.test(baca(f)));
test("GP-16 respons dan PIC di meja memanggil hakMeja dan menolak selain bnpb", {skip: dgnRuteLapor() ? false : "PF-08 belum dikerjakan"}, () => {
  const f = dgnRuteLapor(), s = baca(f);
  const kunci = [...s.matchAll(/"((?:GET|POST) \/api\/lapor\/(?:respons|meja\/:nomor\/pic)[^"]*)"/g)].map(m => m[1]);
  assert.ok(kunci.length >= 1, "rute respons/pic tidak terbaca");
  const g = rutePicTanpaHak(s, kunci);
  assert.deepEqual(g, [], `BPBD atau tamu bisa melihat respons dan PIC. ${SEBAB} (GP-16)\n${g.join("\n")}`);
});
