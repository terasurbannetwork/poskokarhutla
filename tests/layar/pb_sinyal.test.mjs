// PB-81.2 (F-41, Lifeline D6): mesin kartu bersama public/inti/sinyal.js. Hanya konteks provinsi, digerbangi kemampuan.layar.sinyal.
import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import vm from "node:vm";
const baca = p => fs.readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const M = JSON.parse(baca("public/data/menara.json")), P = JSON.parse(baca("public/data/internet_padam.json"));
function dunia(registri) {
  const win = {}; win.window = win; const urls = [];
  const fetch = async u => { urls.push(u); if (u === "/bencana.json") return {ok: true, json: async () => ({bencana: registri})};
    return {ok: true, json: async () => (/menara/.test(u) ? M : P)}; };
  vm.runInContext(baca("public/inti/sinyal.js"), vm.createContext({window: win, fetch, Intl, Promise, Number, Object, Math, JSON, Date, Array, String, console}));
  return {S: win.SinyalInti, urls};
}
const wadah = () => { const w = {html: "", isConnected: true, ada: false, handler: null, isi: null,
  querySelector(q) { if (q === "#dk-sinyal") return this.ada ? {addEventListener: (_, f) => { w.handler = f; }, querySelector: () => ({set innerHTML(v) { w.isi = v; }})} : null; return null; },
  insertAdjacentHTML(_, h) { w.html = h; w.ada = true; }}; return w; };
const reg = v => [{id: "gempa", kemampuan: {layar: {sinyal: v}}}, {id: "karhutla", kemampuan: {layar: {sinyal: true}}}];

test("registri: kartu hanya bila kemampuan.layar.sinyal true, dan tidak pernah untuk karhutla", () => {
  const {S} = dunia([]), iz = S.model.izinReg;
  assert.equal(iz(reg(true), "gempa"), true); assert.equal(iz(reg(false), "gempa"), false); assert.equal(iz(reg(true), "karhutla"), false);
  assert.equal(iz([], "gempa"), false); assert.equal(iz(null, "gempa"), false);
});
test("pasang: kunci mati = tidak ada kartu dan data tidak diunduh", async () => {
  const {S, urls} = dunia(reg(false)), w = wadah(); await S.pasang(w, {id: "gempa"});
  assert.equal(w.html, ""); assert.deepEqual(urls, ["/bencana.json"]);
});
test("pasang: kunci menyala = kartu standar .ex.ex-std dengan kepala nama seksi, tanpa kata aman", async () => {
  const {S} = dunia(reg(true)), w = wadah(); await S.pasang(w, {id: "gempa", prov: () => "32"});
  assert.match(w.html, /class="ex ex-std"/); assert.match(w.html, /<h3[^>]*>Sinyal komunikasi, Jawa Barat<\/h3>/); assert.match(w.html, /id="dk-sinyal"/);
  assert.ok(!/\baman\b/i.test(w.html) && !w.html.includes("·"), "tanpa kata aman dan tanpa titik tengah");
  assert.match(w.html, /bukan bukti seluler mati/); assert.ok(!/class="hl"/.test(w.html), "kepala tanpa kalimat temuan");
  assert.match(w.html, /<option value="32" selected>/);
});
test("model: petunjuk tidak dikenal jatuh ke provinsi dengan padam terbaru; hanya provinsi, tidak ada data kab", () => {
  const {S} = dunia([]), m = S.model, terbaru = [...P.peristiwa].sort((a, b) => b.mulai - a.mulai)[0].prov;
  assert.equal(m.awal(M, P, "99"), terbaru); assert.equal(m.awal(M, P, null), terbaru); assert.equal(m.awal(M, P, "32"), "32");
  const r = m.ringkas(M, P, "32"); assert.equal(r.sel, M.menara_per_provinsi["32"]); assert.equal(r.n, P.peristiwa.filter(e => e.prov === "32").length);
  assert.ok(m.daftarProv(M, P).every(k => /^\d{2}$/.test(k)), "kunci hanya kode provinsi 2 digit");
  assert.equal(m.bulat(13059), 13100); assert.equal(m.bulat(124), 120); assert.equal(m.bulat(11), 11);
});
test("model: provinsi sepi (kurang dari 20 sel) diberi catatan, provinsi tanpa peristiwa tidak mencetak nol palsu", () => {
  const {S} = dunia([]), m = S.model, h = m.kartu(M, P, "17");
  assert.match(h, /kurang dari 20 sel tercatat/);
  const kosong = Object.keys(M.menara_per_provinsi).find(k => !P.peristiwa.some(e => e.prov === k));
  if (kosong) assert.match(m.kartu(M, P, kosong), /Tidak ada peristiwa padam internet tercatat/);
});
test("kartu: pemilih provinsi menggambar ulang isi; sel tabel memakai .ex-tabel", async () => {
  const {S} = dunia(reg(true)), w = wadah(); await S.pasang(w, {id: "gempa", prov: () => "32"});
  assert.match(w.html, /class="tw ex-tabel"/); w.handler({target: {closest: () => ({value: "35"})}});
  assert.match(w.isi, /Sinyal komunikasi, Jawa Timur/);
});
test("halaman: skrip inti dimuat sebelum dampak.js, dan karhutla tidak disentuh", () => {
  for (const b of ["gempa", "gunungapi", "cuaca"]) {
    const h = baca(`public/${b}/index.html`), i = h.indexOf('src="../inti/sinyal.js"'), j = h.indexOf('src="dampak.js"'); assert.ok(i > 0 && i < j, b);
    assert.match(baca(`public/${b}/dampak.js`), new RegExp(`SinyalInti\\.pasang\\(.*id: "${b}"`));
  }
  assert.ok(!baca("public/index.html").includes("inti/sinyal.js"));
});
