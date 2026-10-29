/* Hasil laporan otomatis bot Mac mini (src/wa.js): POST bearer mesin, daftar rentang, unduh. R2 lokal sungguhan di workerd.
   Jalankan: node --test tests/warga/wa_hasil.test.mjs */
import assert from "node:assert/strict";
import {berantai, siapkan, ADMIN} from "./_bnpb.mjs";

const uji = berantai();
const U = await siapkan("uji-wa-hasil", {r2: true, ikat: {WA_MESIN: "mesin-rahasia"}}), {api, mf} = U;
const MESIN = {authorization: "Bearer mesin-rahasia"};
const TP = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const PPTX = (s = "a") => new Uint8Array([0x50, 0x4b, 3, 4, ...new TextEncoder().encode(s)]), PDF = (s = "a") => new TextEncoder().encode("%PDF-1.7 " + s);
async function kirim(o = {}, h = MESIN) {
  const f = new FormData(), d = {tanggal: "2026-10-28", laporan: "harian", revisi: "0", ...o};
  for (const k of ["tanggal", "laporan", "revisi"]) if (d[k] !== undefined) f.set(k, String(d[k]));
  const px = "pptx" in d ? d.pptx : PPTX(), pd = "pdf" in d ? d.pdf : PDF();
  if (px) f.set("pptx", new Blob([px], {type: TP}), d.nama || "Laporan Harian 28 Okt.pptx");
  if (pd) f.set("pdf", new Blob([pd], {type: "application/pdf"}), "x.pdf");
  const r = await mf.dispatchFetch("http://bnpb.lokal/api/wa/hasil", {method: "POST", headers: h, body: f});
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return {s: r.status, j, t};
}

uji("hasil WA: POST hanya bearer mesin, magic byte, dua berkas wajib, timpa menyimpan revisi terbaru", async () => {
  assert.equal((await kirim({}, ADMIN)).s, 403, "admin x-admin-token ditolak");
  assert.equal((await kirim({}, {authorization: "Bearer salah"})).s, 403);
  assert.equal((await kirim({}, {})).s, 403);
  assert.equal((await kirim({pptx: new TextEncoder().encode("bukan zip")})).s, 400);
  assert.equal((await kirim({pdf: new TextEncoder().encode("bukan pdf")})).s, 400);
  assert.equal((await kirim({pdf: null})).s, 400);
  assert.equal((await kirim({pptx: null})).s, 400);
  assert.equal((await kirim({tanggal: "2026-02-31"})).s, 400);
  assert.equal((await kirim({laporan: "../x"})).s, 400);
  assert.equal((await kirim({revisi: "-1"})).s, 400);
  const a = await kirim({revisi: 1, pdf: PDF("lama")}); assert.equal(a.s, 200, a.t); assert.deepEqual(a.j, {ok: true, tanggal: "2026-10-28", laporan: "harian", revisi: 1});
  assert.equal((await kirim({revisi: 2, pdf: PDF("baru")})).j.revisi, 2);
  const d = await api("GET", "/api/wa/hasil?dari=2026-10-28&sampai=2026-10-28", undefined, MESIN);
  assert.equal(d.s, 200, d.t); assert.equal(d.j.hasil.length, 1); assert.equal(d.j.hasil[0].revisi, 2); assert.equal(d.j.hasil[0].nama, "Laporan Harian 28 Okt");
  assert.equal(d.j.hasil[0].ukuran.pdf, PDF("baru").length);
});

uji("hasil WA: daftar rentang tanggal dan parameter buruk 400", async () => {
  await kirim({tanggal: "2026-10-27", laporan: "penanganan"}); await kirim({tanggal: "2026-10-20"}); await kirim({tanggal: "2026-10-29"});
  const l = async q => api("GET", "/api/wa/hasil" + q, undefined, ADMIN);
  const r = await l("?dari=2026-10-21&sampai=2026-10-28");
  assert.deepEqual(r.j.hasil.map(h => h.tanggal + h.laporan), ["2026-10-28harian", "2026-10-27penanganan"]);
  assert.equal(r.h.get("cache-control"), "no-store");
  assert.equal((await l("?dari=2026-10-20&sampai=2026-10-29")).j.hasil.length, 4);
  assert.equal((await l("?dari=2026-01-01&sampai=2026-10-29")).s, 400, "rentang > 31 hari");
  assert.equal((await l("?dari=2026-10-29&sampai=2026-10-01")).s, 400);
  assert.equal((await l("?dari=x")).s, 400);
  assert.equal((await api("GET", "/api/wa/hasil")).s, 403);
  assert.equal((await l("")).s, 200, "tanpa parameter = 14 hari terakhir");
});

uji("hasil WA: unduh oleh admin dan bearer, parameter buruk 400, hilang 404", async () => {
  const q = "?tanggal=2026-10-28&laporan=harian&jenis=";
  for (const h of [ADMIN, MESIN]) {
    const p = await mf.dispatchFetch("http://bnpb.lokal/api/wa/hasil/berkas" + q + "pptx", {headers: h});
    assert.equal(p.status, 200); assert.equal(p.headers.get("content-type"), TP);
    assert.match(p.headers.get("content-disposition"), /^attachment; filename="Laporan Harian 28 Okt\.pptx"$/);
    assert.equal(p.headers.get("x-content-type-options"), "nosniff"); assert.equal(p.headers.get("cache-control"), "private, no-store");
    assert.deepEqual([...new Uint8Array(await p.arrayBuffer()).slice(0, 4)], [0x50, 0x4b, 3, 4]);
  }
  const f = await mf.dispatchFetch("http://bnpb.lokal/api/wa/hasil/berkas" + q + "pdf", {headers: MESIN});
  assert.equal(f.headers.get("content-type"), "application/pdf"); assert.match(await f.text(), /^%PDF-1.7 baru/);
  const b = j => api("GET", "/api/wa/hasil/berkas" + j, undefined, ADMIN);
  assert.equal((await b("?tanggal=../../x&laporan=harian&jenis=pdf")).s, 400);
  assert.equal((await b("?tanggal=2026-10-28&laporan=harian&jenis=json")).s, 400);
  assert.equal((await b("?tanggal=2026-10-28&laporan=harian&jenis=__proto__")).s, 400);
  assert.equal((await b("?tanggal=2026-10-28&laporan=lain&jenis=pdf")).s, 400);
  assert.equal((await b("?tanggal=2026-10-01&laporan=harian&jenis=pdf")).s, 404);
  assert.equal((await api("GET", "/api/wa/hasil/berkas" + q + "pdf")).s, 403);
});
