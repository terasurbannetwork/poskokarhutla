/* Web Push untuk akun instansi (pemda, polisi, TNI): satu ringkasan per akun tiap 3 jam bila ada api baru atau hal yang belum dicek.
   Skema: migrations/0040_push.sql. Tanpa pustaka: VAPID JWT ES256 (RFC 8292) dan enkripsi aes128gcm (RFC 8291) lewat WebCrypto.
   Kunci: VAPID_PUBLIK (vars, boleh publik), secret VAPID_PRIVAT (32 byte base64url) dan VAPID_SUBJEK (mailto: pemilik). Tanpa ketiganya fitur mati rapi:
   rute langganan dan uji menjawab 503, status menjawab {tersedia:false}, cron keluar tanpa galat. Buat kunci: node scripts/bnpb/vapid.mjs.
   Isi notifikasi hanya angka dan nama wilayah akun itu sendiri, tanpa kontak atau nama orang. Endpoint + kunci perangkat tidak pernah keluar dari server.
   Perhitungan memakai ulang logika instansi.js (tenggat, butirApiMunculLagi, butirCekUlang) dan dibatasi ke wilayah akun.
   Darurat regu dan tugas level 3 baru TIDAK menunggu 3 jam: src/kabar.js memakai kirimKe di bawah.
   ponytail: kerja per invokasi <= 100 akun dan <= 40 kiriman (batas subrequest akun Free); sisanya dilanjut menit berikutnya lewat penanda putaran. */
import {json, gagal, acak, bacaBody} from "./worker.js";
import {akunAktif, tenggat, butirApiMunculLagi, butirCekUlang, tanpaTabel, bencanaPer, PROV} from "./instansi.js";
import {labelBencana} from "./tugas_bencana.js";
import {laju} from "./bnpb.js";
import {bacaStatusBanjir, levelKec, NAMA_STATUS} from "./status_banjir.js";

const JAM = 36e5, PUTARAN = 3 * JAM, MAKS_PERANGKAT = 10, MAKS_AKUN = 100, MAKS_KIRIM = 40, MAKS_PESAN = 3993, JWT_UMUR = 12 * JAM / 1000;
const HOST_PUSH = h => h === "fcm.googleapis.com" || h === "updates.push.services.mozilla.com" || h.endsWith(".push.apple.com") || h.endsWith(".notify.windows.com");
const te = new TextEncoder(), tolakNyala = () => gagal(503, "notifikasi belum diaktifkan");
const pb = req => req.headers.get("x-pb") === "1" ? null : gagal(403, "kiriman instansi wajib membawa header x-pb: 1 (dikirim otomatis oleh halaman /instansi)");

/* ---------------- base64url dan bantuan byte ---------------- */
const b64u = u => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const deb64u = s => { if (typeof s !== "string" || !/^[A-Za-z0-9_-]+$/.test(s)) return null; const t = s.replace(/-/g, "+").replace(/_/g, "/"); try { return Uint8Array.from(atob(t + "=".repeat((4 - t.length % 4) % 4)), c => c.charCodeAt(0)); } catch (e) { return null; } };
const gabung = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };
const hkdf = async (ikm, salt, info, bit) => new Uint8Array(await crypto.subtle.deriveBits({name: "HKDF", hash: "SHA-256", salt, info}, await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]), bit));

export const siapPush = env => !!(env.VAPID_PUBLIK && env.VAPID_PRIVAT && /^(mailto:|https:\/\/)/.test(env.VAPID_SUBJEK || ""));

/* ---------------- VAPID (RFC 8292) ---------------- */
async function kunciVapid(env) {
  const pub = deb64u(env.VAPID_PUBLIK); if (!pub || pub.length !== 65 || pub[0] !== 4) throw new Error("VAPID_PUBLIK bukan titik P-256 65 byte");
  return crypto.subtle.importKey("jwk", {kty: "EC", crv: "P-256", x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33)), d: env.VAPID_PRIVAT}, {name: "ECDSA", namedCurve: "P-256"}, false, ["sign"]);
}
async function authVapid(env, kunci, endpoint, kini) {
  const kepala = b64u(te.encode(JSON.stringify({typ: "JWT", alg: "ES256"}))), isi = b64u(te.encode(JSON.stringify({aud: new URL(endpoint).origin, exp: Math.floor(kini / 1000) + JWT_UMUR, sub: env.VAPID_SUBJEK})));
  const ttd = new Uint8Array(await crypto.subtle.sign({name: "ECDSA", hash: "SHA-256"}, kunci, te.encode(`${kepala}.${isi}`)));   // WebCrypto sudah r||s (P1363), bentuk yang diminta JWT
  return `vapid t=${kepala}.${isi}.${b64u(ttd)}, k=${env.VAPID_PUBLIK}`;
}

/* ---------------- enkripsi aes128gcm (RFC 8291), satu record ---------------- */
export async function enkripsi(pesan, p256dh, auth) {
  const ua = await crypto.subtle.importKey("raw", p256dh, {name: "ECDH", namedCurve: "P-256"}, false, []);
  const eph = await crypto.subtle.generateKey({name: "ECDH", namedCurve: "P-256"}, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey));
  const rahasia = new Uint8Array(await crypto.subtle.deriveBits({name: "ECDH", public: ua}, eph.privateKey, 256));
  const ikm = await hkdf(rahasia, auth, gabung(te.encode("WebPush: info\0"), p256dh, asPub), 256);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(ikm, salt, te.encode("Content-Encoding: aes128gcm\0"), 128), nonce = await hkdf(ikm, salt, te.encode("Content-Encoding: nonce\0"), 96);
  const ct = new Uint8Array(await crypto.subtle.encrypt({name: "AES-GCM", iv: nonce}, await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]), gabung(pesan, new Uint8Array([2]))));
  return gabung(salt, new Uint8Array([0, 0, 0x10, 0]), new Uint8Array([asPub.length]), asPub, ct);   // salt, rs=4096, idlen, kunci publik pengirim, isi
}

/* kirim satu pesan ke daftar perangkat -> [{id, status}] (status 0 = jaringan gagal). topic = ringkas akun supaya pesan lama yang belum terkirim digantikan. */
export async function kirimKe(env, subs, payload, topik, kini) {
  const kunci = await kunciVapid(env); payload = {...payload};
  while (te.encode(JSON.stringify(payload)).length > MAKS_PESAN && (payload.isi || "").length) payload.isi = payload.isi.slice(0, Math.max(0, payload.isi.length - 100));   // batas RFC 8291 satu record: 3993 byte
  const isi = te.encode(JSON.stringify(payload)); if (isi.length > MAKS_PESAN) throw new Error("payload push terlalu besar");
  return Promise.all(subs.map(async s => {
    try {
      const tubuh = await enkripsi(isi, deb64u(s.p256dh), deb64u(s.auth));
      const r = await fetch(s.endpoint, {method: "POST", body: tubuh, redirect: "manual", signal: AbortSignal.timeout(8000), headers: {authorization: await authVapid(env, kunci, s.endpoint, kini), "content-encoding": "aes128gcm", "content-type": "application/octet-stream",
        ttl: String(PUTARAN / 1000), urgency: "high", topic: topik}});
      await r.body?.cancel?.();
      return {id: s.id, status: r.status};
    } catch (e) { return {id: s.id, status: 0}; }
  }));
}
export const mati = st => st === 404 || st === 410;
export const catatHasil = (env, hasil, kini) => hasil.flatMap(h => mati(h.status) ? [env.DB.prepare("DELETE FROM push_langganan WHERE id = ?").bind(h.id)]
  : [env.DB.prepare("UPDATE push_langganan SET terakhir_status = ?, terakhir_pada = ? WHERE id = ?").bind(h.status, kini, h.id)]);

/* ---------------- rute ---------------- */
const sahLangganan = async b => {
  const k = b.keys, ep = typeof b.endpoint === "string" ? b.endpoint : "";
  let u; try { u = new URL(ep); } catch (e) { return "endpoint bukan URL"; }
  if (ep.length > 1000 || u.protocol !== "https:" || u.username || u.password || u.port || !HOST_PUSH(u.hostname) || (u.hostname === "fcm.googleapis.com" && !/^\/(fcm\/send|wp)\//.test(u.pathname))) return "endpoint bukan layanan push yang dikenal";
  const p = deb64u(k?.p256dh), a = deb64u(k?.auth);
  if (!p || p.length !== 65 || p[0] !== 4 || !a || a.length !== 16) return "kunci perangkat tidak sah";
  try { await crypto.subtle.importKey("raw", p, {name: "ECDH", namedCurve: "P-256"}, false, []); } catch (e) { return "kunci perangkat bukan titik P-256 yang sah"; }
  return null;
};
async function langganan(env, req, kini) {
  const x = pb(req); if (x) return x;
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  if (!siapPush(env)) return tolakNyala();
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  const salah = await sahLangganan(b.o); if (salah) return gagal(400, salah);
  const ep = b.o.endpoint, ada = (await env.DB.prepare("SELECT count(*) n FROM push_langganan WHERE akun_id = ? AND endpoint != ?").bind(a.id, ep).first()).n;
  if (ada >= MAKS_PERANGKAT) return gagal(409, `maksimum ${MAKS_PERANGKAT} perangkat per akun; matikan notifikasi di perangkat lain dulu`);
  /* endpoint yang sama dipakai akun lain di perangkat ini (ganti akun): pindah ke akun yang sedang masuk */
  const st = [env.DB.prepare(`INSERT INTO push_langganan (id, akun_id, endpoint, p256dh, auth, dibuat) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET akun_id = excluded.akun_id, p256dh = excluded.p256dh, auth = excluded.auth, dibuat = excluded.dibuat`).bind(acak(8), a.id, ep, b.o.keys.p256dh, b.o.keys.auth, kini)];
  /* perangkat pertama akun ini: "api baru" dihitung sejak sekarang, bukan sejak push lama yang sudah basi */
  if (!ada) st.push(env.DB.prepare("INSERT INTO push_akun (akun_id, terakhir_kirim, putaran) VALUES (?, NULL, 0) ON CONFLICT(akun_id) DO UPDATE SET terakhir_kirim = NULL").bind(a.id));
  await env.DB.batch(st);
  return json({ok: true});
}
async function berhenti(env, req, kini) {
  const x = pb(req); if (x) return x;
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  const b = await bacaBody(req, 2048); if (b.galat) return gagal(b.status || 400, b.galat);
  if (typeof b.o.endpoint !== "string" || b.o.endpoint.length > 1000) return gagal(400, "endpoint wajib");
  await env.DB.prepare("DELETE FROM push_langganan WHERE akun_id = ? AND endpoint = ?").bind(a.id, b.o.endpoint).run();   // milik akun lain: tidak terhapus, jawaban sama (tidak membocorkan)
  return json({ok: true});
}
async function status(env, req, kini) {
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  if (!siapPush(env)) return json({tersedia: false});
  return json({tersedia: true, publik: env.VAPID_PUBLIK, perangkat: (await env.DB.prepare("SELECT count(*) n FROM push_langganan WHERE akun_id = ?").bind(a.id).first()).n, maks: MAKS_PERANGKAT});
}
async function uji(env, req, kini) {
  const x = pb(req); if (x) return x;
  const a = await akunAktif(env, req, kini); if (a instanceof Response) return a;
  if (!siapPush(env)) return tolakNyala();
  const subs = (await env.DB.prepare("SELECT id, endpoint, p256dh, auth FROM push_langganan WHERE akun_id = ?").bind(a.id).all()).results;
  if (!subs.length) return gagal(404, "belum ada perangkat yang menyalakan notifikasi");
  const batas = await laju(env, "push:" + a.id, "push.uji", [[JAM, 5]], kini); if (batas) return batas;
  let hasil; try { hasil = await kirimKe(env, subs, {judul: "Notifikasi uji", isi: "Notifikasi Centurisk97 berfungsi di perangkat ini.", tag: "pb-uji", url: "/instansi"}, "uji" + a.id.slice(0, 12), kini); }
  catch (e) { return tolakNyala(); }   // kunci VAPID cacat
  await env.DB.batch(catatHasil(env, hasil, kini));
  return json({terkirim: hasil.filter(h => h.status >= 200 && h.status < 300).length, dari: subs.length});
}
export const RUTE_PUSH = {
  "GET /api/instansi/push/status": (env, req, url, kini) => status(env, req, kini),
  "POST /api/instansi/push/langganan": (env, req, url, kini) => langganan(env, req, kini),
  "POST /api/instansi/push/berhenti": (env, req, url, kini) => berhenti(env, req, kini),
  "POST /api/instansi/push/uji": (env, req, url, kini) => uji(env, req, kini),
};

/* ---------------- ringkasan per akun (murni atas data yang sudah dimuat sekali) ---------------- */
export const dalam = (a, prov, kab) => a.tingkat === "kab" ? prov === a.prov && String(kab).toLowerCase() === String(a.kab).toLowerCase() : JSON.parse(a.cakupan).includes(prov);
const tempatAkun = a => a.tingkat === "kab" ? (a.kab.startsWith("Kota ") ? a.kab : "Kab. " + a.kab) : JSON.parse(a.cakupan).length === 1 && PROV[JSON.parse(a.cakupan)[0]] ? PROV[JSON.parse(a.cakupan)[0]][1] : a.wilayah;
export function ringkasAkun(a, D, sejak, kini) {
  const baru = D.tugas.filter(t => t.dibuat > sejak && dalam(a, t.prov, t.kab)), idBaru = new Set(baru.map(t => t.id));
  const n = {baru: baru.length, konfirmasi: 0, kabar: 0, ulang: D.cek.filter(b => dalam(a, b.provs[0], b.kab)).length, muncul: D.muncul.filter(b => dalam(a, b.provs[0], b.kab)).length};
  for (const t of D.tugas) {
    if (idBaru.has(t.id) || !dalam(a, t.prov, t.kab) || t.padam_verif === "muncul_lagi") continue;   // muncul lagi sudah dihitung sendiri
    const d = tenggat(t, kini); if (d.terlambat) n[d.langkah]++;
  }
  const total = n.baru + n.konfirmasi + n.kabar + n.ulang + n.muncul;
  if (!total) return null;
  const tempat = tempatAkun(a);
  const bagian = [[n.konfirmasi, "tugas belum dikonfirmasi"], [n.kabar, "tugas belum ada kabar tindakan"], [n.muncul, "api muncul lagi"], [n.ulang, "cek ulang jatuh tempo"]].filter(([c]) => c).map(([c, t]) => `${c} ${t}`);
  /* tugas bahaya lain (t.bencana, src/tugas_bencana.js): tanpa itu kalimatnya persis seperti dulu (api); dengan itu "N tugas baru" dan rincian per bahaya */
  const per = {}; for (const t of baru) per[t.bencana || "karhutla"] = (per[t.bencana || "karhutla"] || 0) + 1;
  const campur = Object.keys(per).some(b => b !== "karhutla");
  if (campur) bagian.unshift(...Object.entries(per).map(([b, c]) => `${c} ${labelBencana(b).nama.toLowerCase()} baru`));
  return {judul: n.baru ? `${n.baru} ${campur ? "tugas" : "api"} baru di ${tempat}` : `Ada yang perlu dicek di ${tempat}`,
    isi: bagian.length ? bagian.join(", ") : "Buka Tugas api untuk konfirmasi lapangan.", tag: "pb-" + a.id, url: "/instansi", n};
}

/* ---------------- status banjir naik (migrations/0064_push_banjir.sql) ----------------
   st = hasil bacaStatusBanjir; tercatat = Map "prov|kab" -> level terakhir yang dicatat untuk akun ini (kosong = belum ada garis dasar: hanya mencatat, tidak mengirim).
   Hasil: {naik: [{kab, level, dari}] (Waspada/Siaga/Awas yang LEBIH TINGGI dari tercatat), tulis: [[kab, level]] (semua perubahan, termasuk turun, supaya naik berikutnya terdeteksi)}. Murni. */
export function banjirAkun(a, st, tercatat) {
  const per = new Map();
  for (const [kunci, v] of Object.entries(st.kec)) {
    const [prov, kab] = kunci.split("|"), l = levelKec(v);
    if (l == null || !kab || !dalam(a, prov, kab)) continue;
    const k = prov + "|" + kab; per.set(k, Math.max(per.get(k) ?? 0, l));
  }
  const dasar = tercatat.size > 0, naik = [], tulis = [];
  for (const [k, l] of [...per].sort()) {
    const dari = tercatat.get(k) ?? 0;
    if (l === dari && tercatat.has(k)) continue;
    tulis.push([k, l]);
    if (dasar && l > dari && l >= 1) naik.push({kab: k.split("|")[1], level: l, dari});
  }
  return {naik, tulis};
}
const kalimatBanjir = naik => {
  const u = [...naik].sort((x, y) => y.level - x.level), nama = n => /^kota /i.test(n.kab) ? n.kab : "Kab. " + n.kab;
  return `Status banjir naik: ${u.slice(0, 5).map(n => `${nama(n)} ke ${NAMA_STATUS[n.level]}`).join(", ")}${u.length > 5 ? `, dan ${u.length - 5} kabupaten lain` : ""}`;
};

/* ---------------- cron: jam UTC kelipatan 3, mulai menit 25 (ringkasan tugas yang dibuat sejak push terakhir, jadi tugas baru di menit mana pun ikut putaran berikutnya); menit berikutnya melanjutkan sisa akun ---------------- */
export async function kirimPushDaerah(env, kini = Date.now()) {
  const w = new Date(kini);
  if (w.getUTCHours() % 3 !== 0 || w.getUTCMinutes() < 25) return {lewat: "bukan jadwal"};
  if (!siapPush(env)) return {lewat: "kunci VAPID belum dipasang"};
  try {
    const putaran = Math.floor(kini / PUTARAN);
    const akun = (await env.DB.prepare(`SELECT a.id, a.tingkat, a.prov, a.kab, a.cakupan, a.wilayah, coalesce(p.terakhir_kirim, 0) tk,
        (SELECT min(dibuat) FROM push_langganan l WHERE l.akun_id = a.id) awal FROM instansi_akun a LEFT JOIN push_akun p ON p.akun_id = a.id
      WHERE a.status = 'aktif' AND a.dummy = 0 AND coalesce(p.putaran, 0) != ?1 AND EXISTS (SELECT 1 FROM push_langganan l WHERE l.akun_id = a.id) ORDER BY a.id LIMIT ?2`).bind(putaran, MAKS_AKUN).all()).results;
    if (!akun.length) return {akun: 0, kirim: 0};
    const subs = (await env.DB.prepare("SELECT id, akun_id, endpoint, p256dh, auth FROM push_langganan WHERE akun_id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(akun.map(a => a.id))).all()).results;
    const D = {tugas: (await env.DB.prepare("SELECT id, prov, kab, status, dibuat, konfirmasi_pada, isian_terakhir, padam_verif FROM tugas_api WHERE status = 'buka' AND dummy = 0 LIMIT 5000").all()).results,
      cek: await butirCekUlang(env, kini, false), muncul: await butirApiMunculLagi(env, kini, false)};
    { const idx = new Map(D.tugas.map(t => [t.id, t])); for (const [id, b] of await bencanaPer(env, D.tugas)) idx.get(id).bencana = b; }   // tabel 0047 belum ada = tanpa kolom, semua karhutla
    const o = {akun: 0, kirim: 0, kosong: 0, hapus: 0, galat: 0}, rencana = [];
    for (const a of akun) { const mine = subs.filter(s => s.akun_id === a.id); if (rencana.length && o.kirim + mine.length > MAKS_KIRIM) break; o.kirim += mine.length; rencana.push({a, mine}); }   // sisanya menit berikutnya
    o.kirim = 0;
    /* klaim DULU, sebelum kirim: invokasi yang mati di tengah atau tumpang tindih tidak mengirim ganda (changes = 0 berarti sudah diklaim pihak lain) */
    const klaim = await env.DB.batch(rencana.map(({a}) => env.DB.prepare("INSERT INTO push_akun (akun_id, putaran) VALUES (?1, ?2) ON CONFLICT(akun_id) DO UPDATE SET putaran = ?2 WHERE putaran != ?2").bind(a.id, putaran)));
    const st = [];
    /* status banjir naik: berkas basi/hilang atau tabel 0064 belum ada = fitur ini dilewati, ringkasan tugas tetap jalan */
    const sb = await bacaStatusBanjir(env, kini); let tercatat = null;
    if (sb) try {
      const rs = (await env.DB.prepare("SELECT akun_id, kab, level FROM push_banjir WHERE akun_id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(rencana.map(x => x.a.id))).all()).results;
      tercatat = new Map(rencana.map(x => [x.a.id, new Map()])); for (const r of rs) tercatat.get(r.akun_id)?.set(r.kab, r.level);
    } catch (e) { if (!/no such table: (main\.)?push_banjir/i.test(String(e?.message || e))) throw e; }
    const tulisBanjir = (a, daftar) => daftar.map(([k, l]) => env.DB.prepare("INSERT INTO push_banjir (akun_id, kab, level, diperbarui) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(akun_id, kab) DO UPDATE SET level = ?3, diperbarui = ?4").bind(a.id, k, l, kini));
    for (const [i, {a, mine}] of rencana.entries()) {
      if (!klaim[i].meta.changes) continue;
      try {
        let r = ringkasAkun(a, D, a.tk || a.awal, kini);
        const bj = tercatat ? banjirAkun(a, sb, tercatat.get(a.id)) : {naik: [], tulis: []};
        if (bj.naik.length) {
          const k = kalimatBanjir(bj.naik);
          r = r ? {...r, isi: r.isi + "; " + k.toLowerCase()[0] + k.slice(1)} : {judul: `Status banjir naik di ${tempatAkun(a)}`, isi: k, tag: "pb-" + a.id, url: "/instansi"};
        }
        if (!r) { st.push(...tulisBanjir(a, bj.tulis)); o.kosong++; continue; }
        const {n, ...payload} = r, hasil = await kirimKe(env, mine, payload, a.id, kini);
        o.akun++; o.kirim += mine.length; o.hapus += hasil.filter(h => mati(h.status)).length;
        const terkirim = hasil.some(h => h.status >= 200 && h.status < 300);
        if (terkirim) st.push(env.DB.prepare("UPDATE push_akun SET terakhir_kirim = ? WHERE akun_id = ?").bind(kini, a.id));   // 429/5xx: terakhir_kirim tetap, dicoba lagi putaran berikutnya
        /* kenaikan baru dianggap terkirim bila ada perangkat yang menerima; gagal = tidak dicatat, putaran berikutnya mengirim lagi */
        const naikKab = new Set(bj.naik.map(x => x.kab));
        st.push(...tulisBanjir(a, terkirim ? bj.tulis : bj.tulis.filter(([k]) => !naikKab.has(k.split("|")[1]))));
        st.push(...catatHasil(env, hasil, kini));
      } catch (e) { o.galat++; console.error("push akun", a.id, e?.message); }   // satu akun cacat tidak mematikan akun lain; sudah terklaim, tidak diulang menit ini
    }
    if (st.length) await env.DB.batch(st);
    return o;
  } catch (e) { if (tanpaTabel(e) || /no such table: push_/i.test(String(e?.message))) return {lewat: "migrasi 0040 belum diterapkan"}; throw e; }
}
