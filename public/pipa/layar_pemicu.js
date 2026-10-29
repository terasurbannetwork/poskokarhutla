/* SIPPA: layar Pemicu pra-posisi /pipa/pemicu (PRD §9.4.4, DS §3.3 §4.4, DT §3.1.6 §5.4). Kontrak router: pasang(akar, konteks) dan lepas().
   Logika murni (tingkat, basi, ringkasan, kit terdekat, deret 7 hari, HTML) di atas dan diuji tanpa DOM; DOM dan jaringan di bawah.
   Butuh global public/inti: fmt, esc, jamWIB, Kartu, nanti. Data: /api/sippa/data/pemicu, kelayakan_kompleks, /api/sippa/kit (bersesi) dan /data/fwi_ansambel.json (publik).
   Ambang dan tingkat berlabel asumsi-kebijakan, belum diuji balik. Mode jelajah menggeser ambang di layar saja: tidak ada yang disimpan. */
import {KONST, tingkatPemicu} from "./hitung.js";
import {opsiGerak, peranKlien, formGerak, bukaDialog, tutupDialog, kirimPost, jalurApi} from "./layar_kit.js";
import {memuat, galat, menunggu} from "./keadaan.js";

export const AMBANG_BAWAAN = {...KONST.pemicu};
const BASI_MS = 36 * 36e5;   // ansambel atau titik lebih tua dari 36 jam: PRA-POSISI dan GELAR tidak dihitung (DT §7.3)
const SEL_SETENGAH = 0.25;   // jendela ketat sel 0,5 derajat, sama dengan scripts/data/sippa/pemicu.py
const URUT = {GELAR: 0, "PRA-POSISI": 1, SIAGA: 2, NORMAL: 3};
const KELAS = {NORMAL: "normal", SIAGA: "siaga", "PRA-POSISI": "pra", GELAR: "gelar", basi: "basi"};
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const TINDAKAN = {
  NORMAL: "Kit tetap di gudang induk; servis rutin.",
  SIAGA: "Cek kesiapan kit, latihan G6, isi BBM gudang.",
  "PRA-POSISI": "Pindah kit ke depot depan (YonTP), tugaskan operator, buat kode penugasan.",
  GELAR: "Gelar kit sesuai saran sarana.",
};

/* ---------- tingkat ---------- */
/* hitung ulang dengan ambang yang digeser memakai tingkatPemicu satu-satunya (kembar Python): tiap masukan digeser sebesar selisih ambang,
   sehingga perbandingan di tingkatPemicu persis sama dengan perbandingan terhadap ambang baru. Ambang tidak disimpan. */
export function tingkatJelajah(x, amb) {
  const B = KONST.pemicu, geser = (v, a, b) => v == null ? null : v - a + b;
  return tingkatPemicu({...x, anom_pct: geser(x.anom_pct, amb.siaga_anom_pct, B.siaga_anom_pct), hari_ps50: geser(x.hari_ps50, amb.pra_hari, B.pra_hari), titik_ab: geser(x.titik_ab, amb.gelar_titik, B.gelar_titik)});
}
const umur = (iso, kini) => { const t = Date.parse(iso); return Number.isNaN(t) ? Infinity : kini - t; };
export const basiAnsambel = (d, kini) => d.basi?.ansambel === true || umur(d.ansambel_dibuat, kini) > BASI_MS;
export const basiTitik = (d, kini) => d.basi?.titik24 === true || umur(d.titik24_acuan, kini) > BASI_MS;
/* tingkat yang tampil: ansambel basi memadamkan PRA-POSISI dan GELAR (tanda strip bersebab); SIAGA tetap tampil dengan catatan basi */
export function tingkatTampil(tingkat, basiA) {
  if (basiA && (tingkat === "PRA-POSISI" || tingkat === "GELAR")) return {kunci: "basi", teks: "–, data ansambel basi", basi: true};
  return {kunci: tingkat, teks: tingkat, basi: basiA && tingkat === "SIAGA"};
}

/* ---------- ringkasan judul kartu ---------- */
const namaWilayah = w => String(w ?? "").split("_").filter(Boolean).map(s => s[0].toUpperCase() + s.slice(1)).join("-");
export function ringkasPemicu(baris, basiA) {
  if (!baris.length) return "Belum ada kabupaten dengan kompleks zona A atau B di provinsi ini";
  const n = {GELAR: 0, "PRA-POSISI": 0, SIAGA: 0, NORMAL: 0};
  for (const b of baris) n[basiA && (b.tingkat === "PRA-POSISI" || b.tingkat === "GELAR") ? "SIAGA" : b.tingkat]++;
  const bagian = ["GELAR", "PRA-POSISI", "SIAGA"].filter(k => n[k]).map((k, i) => i === 0 ? `${fmt(n[k])} kabupaten di ${k}` : `${fmt(n[k])} di ${k}`);
  let teks = bagian.length ? bagian.join(", ") + (basiA ? ", PRA-POSISI dan GELAR tidak dihitung karena data ansambel basi" : "") : `Semua ${fmt(baris.length)} kabupaten NORMAL`;
  const grup = new Map();
  for (const b of baris) if (b.anom_pct != null && b.musim && b.wilayah_iklim && !grup.has(`${b.wilayah_iklim}|${b.musim}`)) grup.set(`${b.wilayah_iklim}|${b.musim}`, b);
  if (grup.size) teks += "; " + [...grup.values()].map(b => `prakiraan ${namaWilayah(b.wilayah_iklim)} ${b.musim} ${fmt(b.anom_pct)}% dari normal`).join("; ");
  return teks;
}

/* ---------- kit terdekat (garis lurus, estimasi) ---------- */
export function jarakKm(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180, a = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lon2 - lon1) * r / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}
export function kitTerdekat(kits, lat, lon, saring = () => true) {
  if (lat == null || lon == null) return null;
  let t = null;
  for (const k of kits) {
    if (k.status === "hilang" || k.status === "pensiun" || k.lat == null || k.lon == null || !saring(k)) continue;
    const km = jarakKm(lat, lon, k.lat, k.lon);
    if (!t || km < t.km) t = {kit: k, km};
  }
  return t;
}
/* kit yang boleh dijadwalkan ke depot: di gudang, tanpa gerak terbuka; peran baca tidak diberi tombol */
export function kitUntukRencana(kits, lat, lon, peran) {
  if (!opsiGerak("gudang", peran).some(o => o.rencana && o.alasan === "pra_posisi")) return null;
  return kitTerdekat(kits, lat, lon, k => k.status === "gudang" && !k.gerak_buka);
}

/* pusat kabupaten = rerata kompleks zona A atau B versi konservatif, sama dengan unit pemicu.py */
export function pusatKab(kompleks) {
  const m = new Map();
  for (const k of kompleks) if (k.zona_k === "A" || k.zona_k === "B") {
    const kunci = `${k.prov}|${k.kab}`, e = m.get(kunci) || {lat: 0, lon: 0, titik: []};
    e.titik.push([k.lat, k.lon]); m.set(kunci, e);
  }
  for (const e of m.values()) { e.lat = e.titik.reduce((s, t) => s + t[0], 0) / e.titik.length; e.lon = e.titik.reduce((s, t) => s + t[1], 0) / e.titik.length; }
  return m;
}

/* ---------- deret 7 hari P(FWI >= 14) ---------- */
export const hariPs = s => s == null ? null : s.filter(p => p >= 0.5).length;
/* sel yang memuat kompleks kabupaten dengan hari P >= 0,5 terbanyak (sama dengan hari_ps50); tanpa sel = null, bukan nol */
export function seriPs(grid, titik) {
  let terbaik = null, n = -1, jumlah = -1;
  for (const [lat, lon] of titik) for (const s of grid) {
    if (Math.abs(lat - s.lat) > SEL_SETENGAH + 1e-9 || Math.abs(lon - s.lon) > SEL_SETENGAH + 1e-9) continue;
    const ps = s.ps.slice(0, 7), c = hariPs(ps), j = ps.reduce((a, b) => a + b, 0);
    if (c > n || (c === n && j > jumlah)) { terbaik = ps; n = c; jumlah = j; }
  }
  return terbaik;
}

/* ---------- model baris ---------- */
export function barisModel(d, {pusat, kits, peran, kini, ambang = null}) {
  const basiA = basiAnsambel(d, kini), basiT = basiTitik(d, kini);
  return d.baris.map(b => {
    const key = `${b.prov}|${b.kab}`;
    let mentah = b.tingkat;
    if (ambang) mentah = tingkatJelajah({anom_pct: b.anom_pct, hari_ps50: b.hari_ps50, titik_ab: b.titik_panas_zona_ab, basi_ansambel: basiA, basi_titik: basiT}, ambang);
    else if (basiT && mentah === "GELAR") mentah = "PRA-POSISI";
    const tampil = tingkatTampil(mentah, basiA), tingkat = tampil.kunci === "basi" ? "SIAGA" : mentah;
    const p = pusat?.get(key) ?? null, aktif = tingkat === "PRA-POSISI" || tingkat === "GELAR";
    return {b, key, tingkat, tampil, hari: basiA ? null : b.hari_ps50, basiA, titik: b.titik_panas_zona_ab, titikBasi: basiT, pusat: p,
      kit: p ? kitTerdekat(kits, p.lat, p.lon) : null, depot: p ? kitTerdekat(kits, p.lat, p.lon, k => k.status === "depot") : null,
      rencana: p && aktif ? kitUntukRencana(kits, p.lat, p.lon, peran) : null};
  });
}
export const urutTingkat = m => [...m].sort((a, b) => URUT[a.tingkat] - URUT[b.tingkat] || a.b.kab.localeCompare(b.b.kab, "id"));
export const saring = (m, kunci) => kunci === "semua" ? m : m.filter(x => x.tingkat === kunci);

/* ---------- HTML: semua teks dari data lewat esc ---------- */
const pil = (teks, kelas = "asumsi-kebijakan", judul = "") => `<span class="sp-yakin ${kelas}"${judul ? ` title="${esc(judul)}"` : ""}>${esc(teks)}</span>`;
const waktuIso = iso => { const t = Date.parse(iso); return Number.isNaN(t) ? "–" : jamWIB(t); };
const tgl = iso => { const [, m, h] = /^\d{4}-(\d{2})-(\d{2})/.exec(iso) || []; return m ? `${fmt(Number(h))} ${BULAN[Number(m) - 1]}` : "–"; };
const pctTeks = v => v == null ? "–" : `${fmt(v)}%`;
const KOLOM = ["Kabupaten", "Tingkat", "Anomali hujan p50", "Hari P(FWI ≥ 14) ≥ 0,5", "Titik panas 24 jam zona A/B", "Kit terdekat", "Depot"];
export const kepalaTabel = () => `<thead><tr>${KOLOM.map(k => `<th scope="col">${esc(k)}</th>`).join("")}<th scope="col"><span class="sr">Aksi</span></th></tr></thead>`;
const td = (label, isi, n) => `<td${n ? ' class="n"' : ""} data-label="${esc(label)}">${isi}</td>`;
const pilKit = k => `<span class="sp-status ${esc(k.status)}">${esc(k.status === "gudang" ? "di gudang" : k.status === "depot" ? "di depot depan" : k.status)}</span>`;

export function barisHtml(m, {pilih, peran}) {
  if (!m.length) return `<p class="ad-kosong">Tidak ada kabupaten pada tingkat ini. Pilih tingkat lain atau Semua.</p>`;
  return m.map((x, i) => {
    const {b, tampil} = x, tulis = peran === "W" || peran === "M";
    const tingkat = `<span class="sp-tingkat t-${KELAS[tampil.kunci]}">${esc(tampil.teks)}</span>` + (tampil.basi && tampil.kunci === "SIAGA" ? `<small class="sp-sub">PRA-POSISI dan GELAR: –, data ansambel basi</small>` : "") + (tampil.kunci === "basi" ? "" : `<small class="sp-sub">${esc(TINDAKAN[x.tingkat])}</small>`);
    const hari = x.hari != null ? `${esc(fmt(x.hari))} dari 7` : x.basiA ? "–, data ansambel basi" : "–";
    const titik = x.titik == null ? "–" : `${esc(fmt(x.titik))}${x.titikBasi ? " " + pil("data titik basi", "asumsi-kebijakan", "Acuan titik panas lebih tua dari 36 jam") : ""}`;
    const kit = x.kit ? `<a class="sp-kit-kode" href="/pipa/kit/${esc(x.kit.kit.id)}">${esc(x.kit.kit.kode)}</a>, ${esc(fmt(x.kit.km))} km ${pilKit(x.kit.kit)}` : "–";
    const depot = !x.pusat ? "–" : x.depot ? `${esc(x.depot.kit.lokasi ?? x.depot.kit.kode)}, ${esc(fmt(x.depot.km))} km` : "belum ada kit di depot";
    const aksi = x.rencana && tulis ? `<button type="button" class="ad-tombol" data-rencana="${i}">Buat rencana pra-posisi</button>` : "";
    return `<tr${x.key === pilih ? ' class="sp-terpilih"' : ""}>${td("Kabupaten", `<button type="button" class="sp-kab" data-kab="${esc(x.key)}" aria-pressed="${x.key === pilih}">${esc(b.kab)}</button>`)}${td("Tingkat", tingkat)}`
      + `${td("Anomali hujan p50", b.anom_pct == null ? "–" : `${esc(pctTeks(b.anom_pct))} <small class="sp-sub">(p10 ${esc(pctTeks(b.anom_p10))}, p90 ${esc(pctTeks(b.anom_p90))})</small>`, 1)}${td("Hari P(FWI ≥ 14) ≥ 0,5", hari, 1)}${td("Titik panas 24 jam zona A/B", titik, 1)}`
      + `${td("Kit terdekat", kit)}${td("Depot", depot)}<td class="a">${aksi}</td></tr>`;
  }).join("");
}

/* grafik 7 hari: garis P per hari, ambang 0,5; titik di atas ambang diisi (data-atas), bukan warna saja karena ada angka di judul titik */
export function grafikPs(seri, hari, nama) {
  if (!seri) return `<p class="ad-kosong">Tidak ada sel ansambel yang memuat kompleks ${esc(nama)}, jadi deret 7 hari tidak bisa digambar.</p>`;
  const W = 720, H = 230, L = 46, R = 14, T = 14, B = 36, n = seri.length, X = i => L + (W - L - R) * (n === 1 ? 0.5 : i / (n - 1)), Y = v => Math.round((T + (H - T - B) * (1 - v)) * 100) / 100;
  const atas = hariPs(seri);
  let s = `<svg class="sp-grafik" viewBox="0 0 ${W} ${H}" role="img" aria-label="Peluang FWI 14 atau lebih, 7 hari, ${esc(nama)}; ${esc(fmt(atas))} dari ${esc(fmt(n))} hari di atas ambang 0,5">`;
  for (const v of [0, 0.25, 0.5, 0.75, 1]) s += `<line class="sp-sumbu" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="sp-teks" x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${esc(fmt(v * 100))}%</text>`;
  s += `<line class="sp-ambang" x1="${L}" x2="${W - R}" y1="${Y(0.5)}" y2="${Y(0.5)}"><title>ambang 0,5 (50%)</title></line><text class="sp-teks sp-kuat" x="${W - R}" y="${Y(0.5) - 5}" text-anchor="end">ambang 0,5</text>`;
  s += `<polyline class="sp-garis" fill="none" points="${seri.map((v, i) => `${X(i)},${Y(v)}`).join(" ")}"/>`;
  seri.forEach((v, i) => { const t = tgl(hari?.[i] ?? ""); s += `<circle class="sp-titik" cx="${X(i)}" cy="${Y(v)}" r="5"${v >= 0.5 ? ' data-atas="1"' : ""}><title>${esc(t)}: ${esc(fmt(v * 100))}%</title></circle><text class="sp-teks" x="${X(i)}" y="${H - 12}" text-anchor="middle">${esc(t)}</text>`; });
  return s + "</svg>";
}

const NAMA_TUJUAN = {depot: "depot depan", banjir: "banjir"};
export function rencanaBerjalan(kits, peran) {
  const buka = kits.filter(k => k.gerak_buka && k.gerak_buka.ke_status === "depot");
  if (!buka.length) return "";
  const tulis = peran === "W" || peran === "M";
  return `<section class="sp-berjalan" aria-labelledby="sp-berjalan-h"><h2 class="sp-sub-judul" id="sp-berjalan-h">Rencana pra-posisi berjalan</h2><ul>${buka.map(k => { const g = k.gerak_buka;
    return `<li><a class="sp-kit-kode" href="/pipa/kit/${esc(k.id)}">${esc(k.kode)}</a><span>menuju ${esc(NAMA_TUJUAN[g.ke_status] ?? g.ke_status)}${g.eta_jam != null ? `, ETA ${esc(fmt(g.eta_jam))} jam` : ""}${g.waktu != null ? `, dijadwalkan ${esc(jamWIB(g.waktu))}` : ""}</span>${tulis ? `<button type="button" class="ad-tombol" data-tiba-kit="${esc(k.id)}">Konfirmasi tiba</button>` : ""}</li>`; }).join("")}</ul><p class="ad-catat">Kit baru berpindah ke depot saat tiba dikonfirmasi; gerak ini juga tampil di layar Kit.</p></section>`;
}

export const sumberIsi = d => `prakiraan iklim (iklim_outlook), ansambel FWI ECMWF (fwi_ansambel, dibuat ${waktuIso(d.ansambel_dibuat)}), titik panas VIIRS FIRMS 24 jam (titik24, acuan ${waktuIso(d.titik24_acuan)}); pemicu dihitung ${waktuIso(d.dibuat)}`;
export const sumberPemicu = d => "Sumber: " + sumberIsi(d);

/* ---------- DOM ---------- */
const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
const pergi = jalur => { history.pushState(null, "", jalur + location.search); dispatchEvent(new PopStateEvent("popstate")); };
let ctrl = null;
export function lepas() { ctrl?.abort(); ctrl = null; tutupDialog(); }

export async function pasang(akar, konteks) {
  lepas(); ctrl = new AbortController();
  const sinyal = ctrl.signal, peran = peranKlien(document.body?.dataset);
  const st = {d: null, kits: [], kitSiap: false, pusat: null, ans: null, ansGalat: null, filter: "semua", pilih: null, jelajah: false, ambang: {...AMBANG_BAWAAN}, tampilan: []};
  akar.innerHTML = `<h1 class="sp-judul">Pemicu pra-posisi</h1><div id="sp-pemicu-isi"></div>`;
  const isi = akar.querySelector("#sp-pemicu-isi");

  const muat = async () => {
    isi.replaceChildren(memuat());
    try {
      const d = await konteks.ambil("/api/sippa/data/pemicu", sinyal);
      if (sinyal.aborted) return;
      d.baris = (d.baris || []).filter(b => !konteks.prov || b.prov === konteks.prov);
      st.d = d; konteks.setPer?.(Date.parse(d.dibuat) || null);
      kerangka(); gambarSemua();
      nanti(() => muatPendamping());
    } catch (e) {
      if (sinyal.aborted) return;
      if (e.status === 404) { isi.replaceChildren(menunggu("Pemicu harian belum dihitung. Pipeline data harian mengisinya tiap malam.")); return; }
      if (e.status == null) console.error(e);
      isi.replaceChildren(galat(e.status ?? 0, e.status == null ? "Layar tidak bisa ditampilkan. Coba lagi." : e.message, muat));
    }
  };

  const kerangka = () => {
    isi.innerHTML = `<div id="sp-p-kartu"></div>
      <div class="sp-kontrol" role="group" aria-label="Penyaring tingkat"><div class="sp-chips" id="sp-p-chip"></div>
        <button type="button" class="ad-tombol" data-jelajah aria-expanded="false" aria-controls="sp-p-jelajah">Jelajahi ambang</button></div>
      <section class="sp-jelajah" id="sp-p-jelajah" hidden aria-label="Jelajah ambang">
        <p class="ad-catat">Geser ambang untuk melihat tingkat yang akan muncul. Hanya tampilan: ambang tidak disimpan dan tidak mengubah pemicu harian.</p>
        <label class="sp-geser">Anomali hujan siaga, di bawah atau sama dengan <output data-o="siaga_anom_pct"></output><input type="range" name="siaga_anom_pct" min="-60" max="0" step="1"></label>
        <label class="sp-geser">PRA-POSISI bila P(FWI ≥ 14) ≥ 0,5 pada sedikitnya <output data-o="pra_hari"></output><input type="range" name="pra_hari" min="1" max="7" step="1"></label>
        <label class="sp-geser">GELAR bila titik panas zona A/B sedikitnya <output data-o="gelar_titik"></output><input type="range" name="gelar_titik" min="1" max="20" step="1"></label>
        <div class="sp-aksi"><button type="button" class="ad-tombol" data-reset>Kembalikan ambang bawaan</button></div></section>
      <div id="sp-p-berjalan"></div><div id="sp-p-tabel"></div><div id="sp-p-grafik"></div>`;
    tulisGeser();
  };
  const tulisGeser = () => {
    const A = st.ambang;
    for (const [k, teks] of [["siaga_anom_pct", `${fmt(A.siaga_anom_pct)}%`], ["pra_hari", `${fmt(A.pra_hari)} dari 7 hari`], ["gelar_titik", `${fmt(A.gelar_titik)} titik`]]) {
      const o = isi.querySelector(`output[data-o="${k}"]`), r = isi.querySelector(`input[name="${k}"]`);
      if (o) o.textContent = teks; if (r) r.value = A[k];
    }
  };

  const model = () => barisModel(st.d, {pusat: st.pusat, kits: st.kits, peran, kini: Date.now(), ambang: st.jelajah ? st.ambang : null});
  const gambarKartu = m => {
    const d = st.d, basiA = basiAnsambel(d, Date.now()), basiT = basiTitik(d, Date.now());
    const pils = [pil("Asumsi kebijakan", "asumsi-kebijakan", "Ambang tingkat ditetapkan sebagai asumsi kebijakan"), pil("belum diuji balik", "asumsi-kebijakan", "Uji balik terhadap log 2026 dan musim 2027 belum dilakukan"),
      pil("Estimasi model", "estimasi-model", "Anomali hujan dan P(FWI) dari prakiraan dan ansambel, bukan pengamatan")];
    if (basiA) pils.push(pil("ansambel basi", "asumsi-kebijakan", "fwi_ansambel lebih tua dari 36 jam"));
    if (basiT) pils.push(pil("titik panas basi", "asumsi-kebijakan", "titik24 lebih tua dari 36 jam"));
    if (st.jelajah) pils.push(pil("Jelajah ambang, tidak disimpan", "hipotesis"));
    const ringkas = ringkasPemicu(m.map(x => ({...x.b, tingkat: x.tingkat})), basiA);
    isi.querySelector("#sp-p-kartu").innerHTML = Kartu.kartu("Pemicu", esc(ringkas), `<div class="sp-pil-baris">${pils.join("")}</div><p class="ad-catat">Tingkat adalah saran bagi staf, bukan perintah gelar; keputusan tetap di perencana.</p>`, esc(sumberIsi(d)));
    return m;
  };
  const jumlahChip = (m, k) => k === "semua" ? m.length : m.filter(x => x.tingkat === k).length;
  const gambarChip = m => {
    isi.querySelector("#sp-p-chip").innerHTML = ["semua", "GELAR", "PRA-POSISI", "SIAGA", "NORMAL"].map(k => `<button type="button" class="ad-chip" data-tingkat="${k}" aria-pressed="${k === st.filter}">${k === "semua" ? "Semua" : k} (${esc(fmt(jumlahChip(m, k)))})</button>`).join("");
  };
  const gambarTabel = m => {
    const tampil = urutTingkat(saring(m, st.filter));
    st.tampilan = tampil;
    if (!st.pilih || !m.some(x => x.key === st.pilih)) st.pilih = urutTingkat(m)[0]?.key ?? null;
    isi.querySelector("#sp-p-berjalan").innerHTML = st.kitSiap ? rencanaBerjalan(st.kits, peran) : "";
    isi.querySelector("#sp-p-tabel").innerHTML = !m.length ? `<p class="ad-kosong">Belum ada kabupaten dengan kompleks zona A atau B di provinsi ini.</p>`
      : `<div class="ad-tabel-wadah"><table class="ad-tabel sp-tabel-pemicu"><caption class="sr">Tingkat pemicu per kabupaten</caption>${kepalaTabel()}<tbody>${barisHtml(tampil, {pilih: st.pilih, peran})}</tbody></table></div>`
        + `<p class="ad-catat sp-sumber">${esc(sumberPemicu(st.d))}. Jarak kit: garis lurus dari rerata titik kompleks zona A/B, estimasi${st.kitSiap ? "" : "; inventaris kit belum dimuat"}.</p>`;
  };
  const gambarGrafik = () => {
    const slot = isi.querySelector("#sp-p-grafik"), x = st.pilih && st.d.baris.find(b => `${b.prov}|${b.kab}` === st.pilih);
    if (!x) { slot.replaceChildren(); return; }
    let badan;
    if (st.ansGalat) badan = `<p class="ad-kosong">Deret ansambel tidak bisa digambar (${esc(st.ansGalat)}). Muat ulang layar.</p>`;
    else if (!st.ans || !st.pusat) badan = `<div class="sp-kerangka" aria-busy="true" aria-label="Memuat"></div>`;
    else badan = grafikPs(seriPs(st.ans.grid, st.pusat.get(st.pilih)?.titik ?? []), st.ans.hari, x.kab);
    const basiA = basiAnsambel(st.d, Date.now());
    slot.innerHTML = `<article class="ex"><header class="ex-hd"><span class="ex-ey">Pemicu</span><div class="ex-jd"><h3>P(FWI ≥ 14) 7 hari, ${esc(x.kab)}</h3></div></header><div class="ex-bd">${badan}</div>
      <footer class="ex-ft"><span class="ex-leg"><span><i class="sp-pj"></i>ambang 0,5 (garis)</span><span><i class="sp-pj-titik"></i>titik terisi: di atas ambang</span></span><em>Sumber: ansambel ECMWF IFS 0,25° ${esc(st.ans ? `${fmt(st.ans.anggota)} anggota` : "")}, dibuat ${esc(waktuIso(st.d.ansambel_dibuat))}; estimasi model${basiA ? ", data ansambel basi" : ""}</em></footer></article>`;
  };
  const gambarSemua = () => { if (sinyal.aborted || !st.d) return; const m = model(); gambarKartu(m); gambarChip(m); gambarTabel(m); gambarGrafik(); };

  /* satu gambar ulang antre sekaligus: geseran dan klik beruntun tidak menumpuk kerja berat */
  let terjadwal = false;
  const jadwalkan = () => { if (terjadwal) return; terjadwal = true; nanti(() => { terjadwal = false; gambarSemua(); }); };

  /* data pendamping tidak menahan tabel: kit, kompleks (pusat kabupaten), ansambel; tiap kegagalan berdiri sendiri */
  let acKit = null;
  const muatKit = async () => {
    acKit?.abort(); const ac = acKit = new AbortController(); sinyal.addEventListener("abort", () => ac.abort(), {once: true});
    try { const j = await konteks.ambil("/api/sippa/kit", ac.signal); if (ac.signal.aborted) return; st.kits = j.kit || []; st.kitSiap = true; jadwalkan(); }
    catch (e) { if (!ac.signal.aborted && e.status == null) console.error(e); if (!ac.signal.aborted) konteks.pesan?.("Inventaris kit belum bisa dimuat, jadi kit terdekat tidak tampil. Muat ulang layar."); }
  };
  const muatPendamping = () => {
    muatKit();
    konteks.ambil("/api/sippa/data/kelayakan_kompleks", sinyal).then(j => { if (sinyal.aborted) return; st.pusat = pusatKab(j.kompleks || []); jadwalkan(); })
      .catch(e => { if (!sinyal.aborted) { st.ansGalat = e.message || "kompleks tidak termuat"; jadwalkan(); } });
    fetch("/data/fwi_ansambel.json", {signal: sinyal, credentials: "same-origin"}).then(r => { if (!r.ok) throw new Error(`kode ${r.status}`); return r.json(); })
      .then(j => { if (sinyal.aborted) return; st.ans = j; jadwalkan(); })
      .catch(e => { if (!sinyal.aborted && e.name !== "AbortError") { st.ansGalat = e.message || "ansambel tidak termuat"; jadwalkan(); } });
  };

  /* dialog rencana: formGerak milik layar Kit dipakai ulang; kabupaten dan catatan diisi dari baris */
  const bukaRencana = x => {
    const kit = x.rencana.kit, bungkus = el("div", "sp-form");
    bungkus.append(el("p", "ad-catat", `Kit terdekat yang masih di gudang: ${kit.kode}, ${fmt(x.rencana.km)} km dari pusat kompleks ${x.b.kab} (garis lurus, estimasi). Gerak ini terjadwal dan baru memindahkan kit saat tiba dikonfirmasi.`));
    const f = formGerak(kit, {rencana: true, alasan: "pra_posisi", peran, sesudah: () => { tutupDialog(); konteks.pesan?.(`Rencana pra-posisi ${kit.kode} ke depot dibuat. Gerak terencana tampil di layar Kit sampai tiba dikonfirmasi.`); muatKit(); }});
    if (f.elements?.kab) { f.elements.kab.value = x.b.kab; f.elements.prov.value = x.b.prov; f.elements.catatan.value = `Pemicu ${x.tingkat} ${x.b.kab}`.slice(0, 500); }
    bungkus.append(f); bukaDialog(`Rencana pra-posisi ${kit.kode}`, bungkus);
  };
  const konfirmasiTiba = async tombol => {
    const id = tombol.dataset.tibaKit;
    try {
      const r = await konteks.ambil(jalurApi("kit", id), sinyal), g = (r.gerak || []).find(h => h.rencana === 1 && h.tiba == null);
      if (!g) { konteks.pesan?.("Kit ini tidak punya rencana terbuka. Daftar dimuat ulang."); }
      else { await kirimPost(jalurApi("tiba", g.id), {}); konteks.pesan?.("Tiba tercatat. Kit kini berstatus di depot depan."); }
      await muatKit();
    } catch (e) { if (sinyal.aborted) return; konteks.pesan?.(e.message || "Tiba belum bisa dicatat. Coba lagi."); tombol.disabled = false; tombol.removeAttribute("aria-busy"); }
  };

  /* INP: aria dan keluaran angka berubah seketika di handler; tabel dan grafik digambar ulang lewat nanti() */
  akar.addEventListener("click", e => {
    const t = e.target;
    const c = t.closest("[data-tingkat]");
    if (c) { st.filter = c.dataset.tingkat; c.parentElement.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b === c))); jadwalkan(); return; }
    const k = t.closest("[data-kab]");
    if (k) { st.pilih = k.dataset.kab; akar.querySelectorAll("[data-kab]").forEach(b => b.setAttribute("aria-pressed", String(b === k))); jadwalkan(); return; }
    const j = t.closest("[data-jelajah]");
    if (j) { const buka = j.getAttribute("aria-expanded") !== "true"; j.setAttribute("aria-expanded", String(buka)); isi.querySelector("#sp-p-jelajah").hidden = !buka; if (!buka && st.jelajah) { st.jelajah = false; st.ambang = {...AMBANG_BAWAAN}; tulisGeser(); jadwalkan(); } return; }
    if (t.closest("[data-reset]")) { st.ambang = {...AMBANG_BAWAAN}; st.jelajah = false; tulisGeser(); jadwalkan(); return; }
    const r = t.closest("[data-rencana]");
    if (r) { const x = st.tampilan[Number(r.dataset.rencana)]; if (x?.rencana) bukaRencana(x); return; }
    const ti = t.closest("[data-tiba-kit]");
    if (ti && !ti.disabled) { ti.disabled = true; ti.setAttribute("aria-busy", "true"); konfirmasiTiba(ti); return; }
    const a = t.closest("a.sp-kit-kode");
    if (a && !e.button && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) { e.preventDefault(); pergi(a.pathname); }
  }, {signal: sinyal});
  akar.addEventListener("input", e => {
    const r = e.target.closest?.('input[type="range"]');
    if (!r || !Object.hasOwn(st.ambang, r.name)) return;
    st.ambang[r.name] = Number(r.value); st.jelajah = true; tulisGeser(); jadwalkan();
  }, {signal: sinyal});
  await muat();
}
