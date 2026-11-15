/* 3W (siapa mengerjakan apa di mana) dan tawaran bantuan: rute TW-04..TW-07. Kontrak: data/kajian-bnpb/tiga-w/DESAIN-TEKNIS.md (Rute), KEAMANAN-PRIVASI.md, KEPUTUSAN-TIGA-W.md (Q1-Q7 bawaan sementara).
   TIDAK menyentuh env.DB: semua SQL ada di bagian TigaW src/hak.js (gerbang tests/agen/gerbang-d1.test.mjs).
   - RUTE_TIGAW digabung ke RUTE_SIKLUS (src/siklus.js): tulis = pusdalops, koordalops, Super Admin (PDKO); baca = STAF; BPBD (/api/instansi/siklus/...) hanya baca 3W di kab lingkupnya.
   - RUTE_BANTU di tabel RUTE worker.js: organisasi memegang token (header x-bantu, hanya sha-256 di D1), hanya baris dan tawaran miliknya; tidak publik (Q3).
   - Teks bebas lewat teks() (nomor telepon dan surel ditolak 400). Organisasi tidak pernah menerima alasan_internal (Q7) ataupun rujukan kebutuhan. */
import {json, gagal, acak, sha, bacaBody} from "./worker.js";
import {laju, lajuIP} from "./bnpb.js";
import {teks, teksOpsi, tglSah, tolak} from "./pusdalops_umum.js";
import * as H from "./hak.js";
import {NAMA_KAB4} from "./siklus_kab.js";
import {NO, masukan, kab4Sah, lihat, dalamBP, ujiLaju} from "./siklus_kejadian.js";
import {PROV} from "./instansi.js";
import {BARANG} from "./meja_spek.js";

const JAM = 36e5, T = H.pelakuTwTulis, B = H.pelakuTwBaca;
const RE_ID16 = /^[0-9a-f]{16}$/, RE_TOKEN = /^[A-Za-z0-9_-]{43}$/, FINAL = ["selesai", "dibatalkan", "digabung"];
const PROV_NAMA = Object.fromEntries(Object.entries(PROV).map(([k, v]) => [k, v[1]]));
const tglMs = v => v == null || v === "" ? null : tglSah(v) ? Date.parse(v + "T00:00:00+07:00") : tolak("tanggal harus YYYY-MM-DD yang sah");
const id16 = (v, nama) => typeof v === "string" && RE_ID16.test(v) ? v : tolak(`${nama} harus ID 16 heks`);
const tanpaTabel = e => /no such table: (main\.)?(org|tw_)/i.test(String(e?.message || e));
const kataBaris = o => ({id: o.id, kab4: o.kab4, kab: NAMA_KAB4[o.kab4] ?? null, klaster: o.klaster, org_id: o.org_id, org_nama: o.org_nama, org_jenis: o.org_jenis, kegiatan: o.kegiatan, status: o.status, mulai: o.mulai, selesai: o.selesai, sumber: o.sumber, diubah: o.diubah});
/* isi baris dari body (staf atau organisasi): kegiatan dan tanggal divalidasi di sini, klaster/status/kab di hak.js */
const isiBaris = b => masukan(() => {
  const mulai = tglMs(b.mulai), selesai = tglMs(b.selesai);
  if (mulai != null && selesai != null && selesai < mulai) tolak("selesai tidak boleh sebelum mulai");
  return {kegiatan: teks(b.kegiatan, "kegiatan", 200, 5), status: String(b.status ?? ""), klaster: String(b.klaster ?? ""), mulai, selesai};
});
const isiTawaran = b => masukan(() => {
  if (typeof b.barang !== "string" || (b.barang !== "lainnya" && !BARANG.includes(b.barang))) tolak("barang tidak dikenal");
  return {barang: b.barang, barangLain: teksOpsi(b.barang_lain, "barang_lain", 80, 2), jumlah: b.jumlah, satuan: teks(b.satuan, "satuan", 20, 1), syarat: teksOpsi(b.syarat, "syarat", 300, 2)};
});

/* ================================================================ staf */
async function kejadianBoleh(c) {
  const k = await H.skKejadianRingkas(c.env, c.h.pelaku, c.p.id);
  return lihat(c, k) ? k : null;
}
const lindungStaf = f => async c => {
  try { return await f(c); }
  catch (e) { if (tanpaTabel(e)) return gagal(503, "3W dan tawaran belum diaktifkan (migrasi 0143 belum dijalankan)"); throw e; }
};

async function bacaTigaW(c) {
  const k = await kejadianBoleh(c); if (!k) return NO();
  const [baris, celah] = await Promise.all([H.twBarisDaftar(c.env, B, k.id), H.twCelahTumpang(c.env, B, k.id, c.kini)]);
  const bp = c.h.tipe === "bp", dalam = r => !bp || dalamBP(c, [r.kab4]);
  const b = baris.filter(dalam).map(kataBaris), cl = celah.filter(dalam).map(r => ({...r, kab: NAMA_KAB4[r.kab4] ?? null}));
  if (bp && !cl.length) return NO();   // tidak ada kab kejadian di lingkup = sama dengan tidak ada
  return json({kejadian_id: k.id, klaster: H.TW_KLASTER, ambang_tumpang: H.TW_AMBANG_TUMPANG, ambang_hipotesis: true, baris: b, celah_tumpang: cl});
}
async function tulisTigaW(c) {
  const k = await kejadianBoleh(c); if (!k) return NO();
  const x = await ujiLaju(c, "tw.baris", 200); if (x) return x;
  const b = await masukanBody(c), kini = c.kini;
  if (b.id != null) {   // koreksi status/kegiatan/selesai baris yang ada
    const i = isiBaris(b);
    const ok = await H.twBarisUbah(c.env, T, {id: masukan(() => id16(b.id, "id")), kejadianId: k.id, status: i.status, kegiatan: i.kegiatan, selesai: i.selesai, oleh: c.h.oleh}, kini);
    return ok ? json({ok: true}) : NO();
  }
  const orgId = masukan(() => id16(b.org_id, "org_id")), kab4 = masukan(() => kab4Sah(b.kab4)), i = isiBaris(b);
  if (!await H.twOrgById(c.env, B, orgId)) return gagal(400, "organisasi tidak terdaftar");
  const id = acak(8);
  const ok = await H.twBarisBuat(c.env, T, {id, kejadianId: k.id, kab4, klaster: i.klaster, orgId, kegiatan: i.kegiatan, status: i.status, mulai: i.mulai, selesai: i.selesai, sumber: "staf", oleh: c.h.oleh}, kini);
  return ok ? json({id}, 201) : gagal(400, "kab4 bukan bagian dari kejadian ini");
}
const masukanBody = async c => { const b = await bacaBody(c.req, 16384); if (b.galat) throw new H.Galat(b.status || 400, b.galat); return b.o ?? {}; };

/* token: tampil SEKALI; hanya sha-256 disimpan; token lama organisasi itu dicabut dalam batch yang sama */
async function tokenBuat(c) {
  const k = await kejadianBoleh(c); if (!k) return NO();
  if (FINAL.includes(k.fase)) return gagal(409, "kejadian sudah ditutup; token tidak diterbitkan");
  const x = await ujiLaju(c, "tw.token", 30); if (x) return x;
  const b = await masukanBody(c), orgId = masukan(() => id16(b.org_id, "org_id")), o = await H.twOrgById(c.env, B, orgId);
  if (!o) return gagal(400, "organisasi tidak terdaftar");
  const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  await H.twTokenBuat(c.env, T, {id: acak(8), orgId, kejadianId: k.id, tokenSha: await sha(token)}, c.kini);
  return json({token, org_id: orgId, org_nama: o.nama, catatan: "token tampil sekali; kirim lewat tautan /bantu#t=<token>"}, 201);
}
async function tokenCabut(c) {
  const k = await kejadianBoleh(c); if (!k) return NO();
  const b = await masukanBody(c), orgId = masukan(() => id16(b.org_id, "org_id"));
  const n = await H.twTokenCabut(c.env, T, orgId, k.id, c.kini);
  return n ? json({ok: true, dicabut: n}) : NO();
}

async function tawaranDaftar(c) {
  const k = await kejadianBoleh(c); if (!k) return NO();
  const sid = c.url.searchParams.get("id");
  if (sid) {   // satu tawaran + riwayat + kandidat kebutuhan (staf memilih, mesin hanya mengurutkan)
    masukan(() => id16(sid, "id"));
    const t = await H.twTawaranById(c.env, B, k.id, sid); if (!t) return NO();
    const [riwayat, kand] = await Promise.all([H.twRiwayat(c.env, B, sid), H.twKandidat(c.env, B, k.id, t.barang, c.kini, PROV_NAMA)]);
    return json({tawaran: t, riwayat, kandidat: kand.kandidat, tak_terpetakan: kand.tak_terpetakan});
  }
  return json({kejadian_id: k.id, tawaran: await H.twTawaranDaftar(c.env, B, k.id)});
}
async function tawaranBuat(c) {
  const k = await kejadianBoleh(c); if (!k) return NO();
  const x = await ujiLaju(c, "tw.tawaran", 100); if (x) return x;
  const b = await masukanBody(c), i = isiTawaran(b), orgId = masukan(() => id16(b.org_id, "org_id"));
  const mitra = b.mitra_lokal_org_id == null || b.mitra_lokal_org_id === "" ? null : masukan(() => id16(b.mitra_lokal_org_id, "mitra_lokal_org_id"));
  const id = acak(8);
  const ok = await H.twTawaranBuat(c.env, T, {id, kejadianId: k.id, orgId, mitraLokalOrgId: mitra, ...i}, c.kini, BARANG.filter(x => x !== "lainnya"));
  return ok ? json({id}, 201) : gagal(400, "organisasi tidak terdaftar");
}
async function tawaranPutus(c) {
  const k = await kejadianBoleh(c); if (!k) return NO();
  const x = await ujiLaju(c, "tw.putus", 200); if (x) return x;
  const t = await H.twTawaranById(c.env, B, k.id, c.p.sid); if (!t) return NO();
  const b = await masukanBody(c);
  const hasil = masukan(() => ({status: String(b.status ?? ""), ai: teksOpsi(b.alasan_internal, "alasan_internal", 300, 1), ao: teksOpsi(b.alasan_organisasi, "alasan_organisasi", 300, 1),
    keb: b.kebutuhan == null ? null : Array.isArray(b.kebutuhan) && b.kebutuhan.length <= 20 && b.kebutuhan.every(e => e && typeof e === "object" && /^(meja|logpal)$/.test(e.sumber) && typeof e.id === "string" && e.id.length <= 40)
      ? b.kebutuhan.map(e => ({sumber: e.sumber, id: e.id})) : tolak("kebutuhan harus larik rujukan {sumber, id} maks 20")}));
  const ok = await H.twKeputusan(c.env, T, {id: t.id, kejadianId: k.id, status: hasil.status, alasanInternal: hasil.ai, alasanOrganisasi: hasil.ao, kebutuhan: hasil.keb, oleh: c.h.oleh}, c.kini);
  return ok ? json({ok: true, status: hasil.status}) : gagal(409, "tawaran sudah diputuskan");
}

/* register organisasi (di bawah awalan siklus supaya dilayani layaniSk) */
async function orgDaftar(c) {
  const q = (c.url.searchParams.get("q") || "").trim().toLowerCase().slice(0, 60);
  const r = await H.twOrgDaftar(c.env, B);
  return json({org: q ? r.filter(o => o.nama.toLowerCase().includes(q) || (o.singkatan || "").toLowerCase().includes(q)) : r});
}
async function orgBuat(c) {
  const x = await ujiLaju(c, "tw.org", 60); if (x) return x;
  const b = await masukanBody(c);
  const i = masukan(() => ({nama: teks(b.nama, "nama", 120, 2), singkatan: teksOpsi(b.singkatan, "singkatan", 20, 2), jenis: String(b.jenis ?? ""),
    negara: b.negara == null || b.negara === "" ? null : /^[A-Za-z]{2}$/.test(b.negara) ? b.negara : tolak("negara harus kode ISO 2 huruf"),
    institusiId: b.institusi_id == null || b.institusi_id === "" ? null : id16(b.institusi_id, "institusi_id")}));
  const id = acak(8);
  await H.twOrgBuat(c.env, T, {id, ...i, oleh: c.h.oleh}, c.kini);
  return json({id}, 201);
}

const dalam = lindungStaf;
export const RUTE_TIGAW = {
  "GET /api/siklus/kejadian/:id/tiga-w": {izin: ["STAF", "BP"], f: dalam(bacaTigaW)},
  "POST /api/siklus/kejadian/:id/tiga-w": {izin: ["PDKO"], f: dalam(tulisTigaW)},
  "GET /api/siklus/kejadian/:id/tawaran": {izin: ["STAF"], f: dalam(tawaranDaftar)},
  "POST /api/siklus/kejadian/:id/tawaran": {izin: ["PDKO"], f: dalam(tawaranBuat)},
  "POST /api/siklus/kejadian/:id/tawaran/:sid/keputusan": {izin: ["PDKO"], f: dalam(tawaranPutus)},
  "POST /api/siklus/kejadian/:id/tiga-w/token": {izin: ["PDKO"], f: dalam(tokenBuat)},
  "POST /api/siklus/kejadian/:id/tiga-w/token/cabut": {izin: ["PDKO"], f: dalam(tokenCabut)},
  "GET /api/siklus/org": {izin: ["STAF"], f: dalam(orgDaftar)},
  "POST /api/siklus/org": {izin: ["PDKO"], f: dalam(orgBuat)},
};

/* ================================================================ organisasi bertoken (/api/bantu) */
const KEPALA = {"cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "x-robots-tag": "noindex, nofollow"};
const jawab = r => { for (const [k, v] of Object.entries(KEPALA)) r.headers.set(k, v); return r; };
/* token dari header x-bantu: lolos -> {t, org}; selain itu Response 401 (tak dikenal, tercabut, kejadian ditutup: jawaban sama) atau 429 bila IP terlalu sering salah */
async function cekToken(env, req, kini) {
  if (!env.IP_SALT) return gagal(503, "server belum dikonfigurasi (IP_SALT)");
  const h = req.headers.get("x-bantu") || "";
  const t = RE_TOKEN.test(h) ? await H.twTokenCari(env, B, await sha(h)) : null;
  const org = t && !t.cabut && !FINAL.includes(t.fase) ? await H.twOrgById(env, B, t.org_id) : null;
  if (org) return {t, org};
  const lewat = await lajuIP(env, req, "bantu.gagal", [[JAM, 300]], kini); if (lewat) return lewat;   // hanya tebakan salah dihitung per IP
  return gagal(401, "tautan tidak berlaku; minta tautan baru ke koordinator");
}
const lindungBantu = f => async (env, req, url, kini) => {
  try {
    const a = await cekToken(env, req, kini); if (a instanceof Response) return jawab(a);
    return jawab(await f({env, req, kini, ...a}));
  } catch (e) {
    if (e instanceof H.Galat) return jawab(gagal(e.status, e.message));
    if (tanpaTabel(e)) return jawab(gagal(503, "layanan belum aktif"));
    if (/UNIQUE|constraint failed/i.test(String(e?.message))) return jawab(gagal(409, "data berubah atau melanggar aturan; muat ulang lalu ulangi"));
    console.error("bantu", e); return jawab(gagal(500, "galat server"));
  }
};
const bantuBody = async c => { const b = await bacaBody(c.req, 8192); if (b.galat) throw new H.Galat(b.status || 400, b.galat); return b.o ?? {}; };
const bantuLaju = async c => laju(c.env, "bantu:" + c.t.id, "bantu.tulis", [[JAM, 40]], c.kini);

async function bantuBaca(c) {
  const [baris, tawaran, celah] = await Promise.all([H.twBarisDaftar(c.env, B, c.t.kejadian_id, c.t.org_id), H.twTawaranDaftar(c.env, B, c.t.kejadian_id, {orgId: c.t.org_id, untukOrg: true}),
    H.twCelahTumpang(c.env, B, c.t.kejadian_id, c.kini)]);
  return json({org: {nama: c.org.nama, singkatan: c.org.singkatan, jenis: c.org.jenis}, kejadian_id: c.t.kejadian_id, klaster: H.TW_KLASTER, barang: BARANG,
    kab: celah.map(r => ({kab4: r.kab4, nama: NAMA_KAB4[r.kab4] ?? r.kab4})), baris: baris.map(kataBaris),
    tawaran: tawaran.map(t => ({id: t.id, barang: t.barang, barang_lain: t.barang_lain, jumlah: t.jumlah, satuan: t.satuan, syarat: t.syarat, status: t.status, alasan_organisasi: t.alasan_organisasi, dibuat: t.dibuat, diubah: t.diubah}))});
}
async function bantuBaris(c) {
  const x = await bantuLaju(c); if (x) return x;
  const b = await bantuBody(c), i = isiBaris(b);
  if (b.id != null) {
    const ok = await H.twBarisUbah(c.env, T, {id: masukan(() => id16(b.id, "id")), kejadianId: c.t.kejadian_id, orgId: c.t.org_id, status: i.status, kegiatan: i.kegiatan, selesai: i.selesai, oleh: "org:" + c.t.org_id}, c.kini);
    return ok ? json({ok: true}) : NO();   // baris organisasi lain = tidak ada
  }
  const id = acak(8), kab4 = masukan(() => kab4Sah(b.kab4));
  const ok = await H.twBarisBuat(c.env, T, {id, kejadianId: c.t.kejadian_id, kab4, klaster: i.klaster, orgId: c.t.org_id, kegiatan: i.kegiatan, status: i.status, mulai: i.mulai, selesai: i.selesai, sumber: "token", oleh: "org:" + c.t.org_id}, c.kini);
  return ok ? json({id}, 201) : gagal(400, "kab4 bukan bagian dari kejadian ini");
}
async function bantuTawaran(c) {
  const x = await bantuLaju(c); if (x) return x;
  const b = await bantuBody(c), i = isiTawaran(b);
  let mitra = null;   // mitra lokal disebut dengan NAMA (organisasi tidak boleh melihat register); dicocokkan persis, tanpa huruf besar-kecil
  const nm = masukan(() => teksOpsi(b.mitra_lokal, "mitra_lokal", 120, 2));
  if (nm) mitra = (await H.twOrgDaftar(c.env, B)).find(o => o.nama.toLowerCase() === nm.toLowerCase())?.id ?? null;   // tak cocok: nama disimpan sebagai teks untuk staf, jawaban sama (register tidak bocor)
  const id = acak(8);
  const ok = await H.twTawaranBuat(c.env, T, {id, kejadianId: c.t.kejadian_id, orgId: c.t.org_id, mitraLokalOrgId: mitra, mitraNama: mitra ? null : nm, ...i}, c.kini, BARANG.filter(x => x !== "lainnya"));
  return ok ? json({id}, 201) : gagal(400, "tawaran tidak dapat dicatat");
}
export const RUTE_BANTU = {
  "GET /api/bantu": lindungBantu(bantuBaca),
  "POST /api/bantu/baris": lindungBantu(bantuBaris),
  "POST /api/bantu/tawaran": lindungBantu(bantuTawaran),
};
