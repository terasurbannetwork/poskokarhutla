/* SIPPA: layar Telemetri /pipa/telemetri (PRD §9.11, DS §4.11). Kontrak router: pasang(akar, konteks) dan lepas().
   Butuh global public/inti: fmt, esc, jamWIB, nanti (dimuat cangkang atau app.js). Logika murni di atas, DOM di bawah.
   Rute /api/sippa/telemetri, perangkat, perangkat (POST), alarm, alarm-tutup: DT §4.3 (SP-050). Token perangkat hanya hidup di dialog sekali tampil. */
import {memuat, kosong, galat} from "./keadaan.js";

const J = 36e5, ID16 = /^[0-9a-f]{16}$/;
const GAP_MS = 30 * 60e3;       // celah lebih dari ini memutus garis (gateway mengirim tiap 60 detik, DT 6.3)
const TITIK_MAKS = 288;         // 24 jam dalam keranjang 5 menit
const DEPAN_MS = 5 * 60e3;      // server menolak waktu lebih dari 5 menit di depan (DT 6.3)
const KEDALAMAN = [10, 30, 50, 100, 150, 300, 400, 500];   // CHECK kedalaman_cm di 0058

export const JENIS = {gateway: "Gateway", tekanan: "Tekanan", debit: "Debit", level: "Level", suhu_gambut: "Suhu gambut", muka_air_tanah: "Muka air tanah", co: "CO", pm25: "PM2,5", bbm: "BBM", rpm: "RPM", posisi: "Posisi"};
export const SATUAN = ["-", "bar", "m3/jam", "L/s", "m", "C", "ppm", "ug/m3", "%", "rpm", "derajat"];

/* tag P&ID SIPPA-G-02 (PRD §9.11, BOM §6.1): jenis dan satuan diturunkan dari tag, bukan diisi tangan */
const S = (nama, jenis, satuan) => ({nama, jenis, satuan});
export const TAG_PID = {
  "PT-101": S("Tekanan hisap", "tekanan", "bar"), "PT-102": S("Tekanan buang", "tekanan", "bar"), "PT-201": S("Tekanan distal", "tekanan", "bar"),
  "FT-101": S("Debit", "debit", "m3/jam"), "LT-101": S("Level intake", "level", "m"),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map(n => [`T-10${n}`, S(`Suhu gambut node ${n}`, "suhu_gambut", "C")])),
  "GWT-101": S("Muka air tanah", "muka_air_tanah", "m"), "CO-101": S("CO", "co", "ppm"), "PM-101": S("PM2,5", "pm25", "ug/m3"),
  "BBM-101": S("Level BBM", "bbm", "%"), "RPM-101": S("Putaran pompa", "rpm", "rpm"), "GPS-101": S("Posisi", "posisi", "derajat"),
  "U-102": S("Gateway telemetri", "gateway", "-"),
};

export const KODE_ALARM = {hisap_rendah: "Tekanan hisap rendah", debit_rendah: "Debit rendah", dry_run: "Pompa kering (dry run)", tekanan_lebih: "Tekanan lebih",
  belum_dingin: "Belum dingin", co_tinggi: "CO tinggi", bbm_rendah: "BBM rendah", diam: "Perangkat diam"};

const ada = (o, k) => Object.hasOwn(o, k);
const labelKode = k => ada(KODE_ALARM, k) ? KODE_ALARM[k] : "Alarm tidak dikenal";
/* peran dari atribut body yang diisi worker (hanya tampilan tombol; server tetap memeriksa tiap rute): M moderator, W tulis, B baca */
export const peranKlien = ds => ds && (ds.mod === "1" || ds.super === "1") ? "M" : ds && ds.tulis === "1" ? "W" : "B";

/* mutu (DS 2.1.3): 0 baik --ok, 1 diragukan --warn, 2 di luar rentang --bad; selalu berteks */
const MUTU = [["baik", "aktif"], ["diragukan", "servis"], ["di luar rentang", "hilang"]];
export const pilMutu = m => Number.isInteger(m) && m >= 0 && m <= 2 ? `<span class="sp-status ${MUTU[m][1]}">${MUTU[m][0]}</span>` : "–";
const pilStatus = (kelas, teks) => `<span class="sp-status ${kelas}">${esc(teks)}</span>`;
const pilYakin = (teks, kelas = "asumsi-kebijakan", judul = "") => `<span class="sp-yakin ${kelas}"${judul ? ` title="${esc(judul)}"` : ""}>${esc(teks)}</span>`;

export function lalu(ms, kini) {
  if (ms == null) return "belum pernah";
  const d = kini - ms;
  if (d < 60e3) return "baru saja";
  if (d < J) return `${fmt(Math.floor(d / 60e3))} menit lalu`;
  if (d < 48 * J) return `${fmt(Math.floor(d / J))} jam lalu`;
  return `${fmt(Math.floor(d / (24 * J)))} hari lalu`;
}
const jamMenit = ms => new Date(ms).toLocaleTimeString("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit"});
const angka = (v, satuan) => v == null || !isFinite(v) ? "–" : `${fmt(v)}${satuan && satuan !== "-" ? " " + satuan : ""}`;
const waktuTag = ms => ms == null ? "–" : `<time datetime="${new Date(ms).toISOString()}">${esc(jamWIB(ms))}</time>`;

/* ---------- seri 24 jam ---------- */
/* seri = [[t_ms, nilai, mutu]]; buang yang bukan angka, di luar 24 jam, atau lebih dari 5 menit di depan; urut waktu */
export function jendelaSeri(seri, kini) {
  if (!Array.isArray(seri)) return [];
  return seri.filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[0] >= kini - 24 * J && p[0] <= kini + DEPAN_MS)
    .map(p => [p[0], p[1], p[2] === 1 || p[2] === 2 ? p[2] : 0]).sort((a, b) => a[0] - b[0]);
}
/* keranjang waktu sama lebar: rerata waktu dan nilai, mutu terburuk; paling banyak n titik */
export function bucketSeri(seri, kini, n = TITIK_MAKS) {
  const t0 = kini - 24 * J, lebar = 24 * J / n, kel = new Map();
  for (const [t, v, m] of seri) {
    const i = Math.min(n - 1, Math.max(0, Math.floor((t - t0) / lebar))), k = kel.get(i) ?? {n: 0, t: 0, v: 0, mutu: 0};
    k.n++; k.t += t; k.v += v; k.mutu = Math.max(k.mutu, m ?? 0); kel.set(i, k);
  }
  return [...kel.entries()].sort((a, b) => a[0] - b[0]).map(([, k]) => ({t: k.t / k.n, v: k.v / k.n, mutu: k.mutu}));
}
/* 24 baris, satu per jam berakhir di kini; jam tanpa bacaan: n 0 dan min null (bukan nol) */
export function ringkasPerJam(seri, kini) {
  const baris = Array.from({length: 24}, (_, j) => ({dari: kini - (24 - j) * J, sampai: kini - (23 - j) * J, n: 0, min: null, maks: null, rerata: null, n_mutu2: 0, jumlah: 0}));
  for (const [t, v, m] of seri) {
    const j = Math.floor((t - (kini - 24 * J)) / J), b = baris[Math.min(23, Math.max(0, j))];
    b.n++; b.jumlah += v; b.min = b.min == null ? v : Math.min(b.min, v); b.maks = b.maks == null ? v : Math.max(b.maks, v); if (m === 2) b.n_mutu2++;
  }
  return baris.map(({jumlah, ...b}) => ({...b, rerata: b.n ? jumlah / b.n : null}));
}
export function tabelSeriHtml(baris, satuan) {
  const sel = (label, isi, n) => `<td${n ? ' class="n"' : ""} data-label="${label}">${isi}</td>`;
  return `<div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Ringkasan per jam, 24 jam terakhir</caption><thead><tr>${["Jam WIB", "Bacaan", "Terkecil", "Terbesar", "Rata-rata", "Di luar rentang"].map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead>
    <tbody>${baris.map(b => `<tr>${sel("Jam WIB", `${esc(jamMenit(b.dari))} sampai ${esc(jamMenit(b.sampai))}`)}${sel("Bacaan", fmt(b.n), 1)}${sel("Terkecil", angka(b.min, satuan), 1)}${sel("Terbesar", angka(b.maks, satuan), 1)}${sel("Rata-rata", angka(b.rerata, satuan), 1)}${sel("Di luar rentang", fmt(b.n_mutu2), 1)}</tr>`).join("")}</tbody></table></div>`;
}

/* ---------- grafik garis (DS 3.11): satu seri, acuan putus berlabel di ujung kanan, penanda mutu berongga atau berisi ---------- */
const bulat = v => Math.round(v * 10) / 10;
export function grafikGaris(seri, {kini, satuan, judul, acuan = []}) {
  const W = 720, H = 260, L = 46, R = 14, T = 16, B = 34, t0 = kini - 24 * J;
  const pts = bucketSeri(seri, kini);
  const nilai = [...pts.map(p => p.v), ...acuan.map(a => a.y)];
  let lo = Math.min(...nilai), hi = Math.max(...nilai);
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  if (hi - lo < 1e-9) { const e = Math.max(1, Math.abs(hi) * 0.1); lo -= e; hi += e; } else { const e = (hi - lo) * 0.08; lo -= e; hi += e; }
  const X = t => L + (W - L - R) * (t - t0) / (24 * J), Y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  let s = `<svg class="sp-grafik" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(judul)}"><title>${esc(judul)}</title>`;
  if (pts.length) s += `<desc>${esc(`${fmt(pts.length)} titik dalam 24 jam, terkecil ${angka(Math.min(...pts.map(p => p.v)), satuan)}, terbesar ${angka(Math.max(...pts.map(p => p.v)), satuan)}`)}</desc>`;
  for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4; s += `<line class="sp-sumbu" x1="${L}" x2="${W - R}" y1="${bulat(Y(v))}" y2="${bulat(Y(v))}"/><text class="sp-teks" x="${L - 6}" y="${bulat(Y(v)) + 4}" text-anchor="end">${esc(fmt(v))}</text>`; }
  const sixJam = 6 * J, wib = 7 * J;
  for (let t = Math.ceil((t0 + wib) / sixJam) * sixJam - wib; t <= kini; t += sixJam) s += `<text class="sp-teks" x="${bulat(X(t))}" y="${H - 14}" text-anchor="middle">${esc(jamMenit(t))}</text>`;
  s += `<text class="sp-teks" x="${W - R}" y="${H - 2}" text-anchor="end">jam WIB, satuan ${esc(satuan && satuan !== "-" ? satuan : "tanpa satuan")}</text>`;
  for (const a of acuan) {
    const y = bulat(Y(a.y));
    s += `<line class="sp-ambang putus" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text class="sp-teks sp-kuat" x="${W - R}" y="${y - 4}" text-anchor="end">${esc(a.label)}</text>`;
  }
  /* garis putus di celah lebih dari 30 menit; satu titik terpencil digambar sebagai titik */
  const ruas = []; let cur = [];
  for (const p of pts) { if (cur.length && p.t - cur[cur.length - 1].t > GAP_MS) { ruas.push(cur); cur = []; } cur.push(p); }
  if (cur.length) ruas.push(cur);
  for (const r of ruas) {
    if (r.length === 1) s += `<circle class="sp-tunggal" cx="${bulat(X(r[0].t))}" cy="${bulat(Y(r[0].v))}" r="2.5" fill="currentColor"/>`;
    else s += `<path class="sp-garis" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="${r.map((p, i) => `${i ? "L" : "M"}${bulat(X(p.t))} ${bulat(Y(p.v))}`).join("")}"/>`;
  }
  for (const p of pts) if (p.mutu > 0) s += `<circle class="sp-titik${p.mutu === 2 ? " meleset" : ""}" cx="${bulat(X(p.t))}" cy="${bulat(Y(p.v))}" r="4.5" tabindex="0"><title>${esc(`${angka(p.v, satuan)}, ${jamWIB(p.t)}, ${MUTU[p.mutu][0]}`)}</title></circle>`;
  return s + "</svg>";
}
export const acuanDariSah = (p, satuan) => [["min_sah", "batas sah min"], ["maks_sah", "batas sah maks"]].filter(([k]) => p?.[k] != null && isFinite(p[k])).map(([k, n]) => ({y: p[k], label: `${n} ${angka(p[k], satuan)}`}));
export const acuanDariAlarm = (alarm, perangkatId, satuan) => alarm.filter(a => a.perangkat_id === perangkatId && a.ditutup == null && a.ambang != null && isFinite(a.ambang))
  .map(a => ({y: a.ambang, label: `ambang alarm ${labelKode(a.kode).toLowerCase()} ${angka(a.ambang, satuan)}`}));

/* ---------- tabel perangkat ---------- */
const td = (label, isi, n) => `<td${n ? ' class="n"' : ""} data-label="${label}">${isi}</td>`;
export function barisPerangkatHtml(p, {kini, dipilih = false}) {
  const nama = ada(TAG_PID, p.tag) ? TAG_PID[p.tag].nama : "";
  return `<tr>${td("Tag", `<button type="button" class="ad-chip" data-pilih="${esc(p.id)}" aria-pressed="${dipilih}"${nama ? ` title="${esc(nama)}"` : ""}>${esc(p.tag)}</button>`)}${td("Kit", esc(p.kit_kode ?? p.kit_id ?? "–"))}${td("Jenis", esc(JENIS[p.jenis] ?? p.jenis ?? "–"))}`
    + `${td("Terakhir terlihat", p.terakhir == null ? "belum pernah" : `${waktuTag(p.terakhir)} <span class="ad-catat">${esc(lalu(p.terakhir, kini))}</span>`)}${td("Nilai terakhir", esc(p.terakhir == null ? "–" : angka(p.nilai_terakhir, p.satuan)), 1)}${td("Mutu", pilMutu(p.terakhir == null ? null : p.mutu_terakhir))}${td("Aktif", p.aktif ? pilStatus("aktif", "aktif") : pilStatus("dicabut", "dicabut"))}</tr>`;
}
export const urutPerangkat = daftar => [...daftar].sort((a, b) => (b.aktif ? 1 : 0) - (a.aktif ? 1 : 0) || String(a.kit_kode ?? a.kit_id).localeCompare(String(b.kit_kode ?? b.kit_id)) || String(a.tag).localeCompare(String(b.tag)));
export function pilihAwal(daftar) {
  const aktif = daftar.filter(p => p.aktif);
  const terlihat = aktif.filter(p => p.terakhir != null).sort((a, b) => b.terakhir - a.terakhir)[0];
  return (terlihat ?? aktif[0] ?? daftar[0])?.id ?? null;
}

/* ---------- alarm ---------- */
const siapaTutup = o => !o ? "–" : String(o).startsWith("perangkat:") ? "otomatis, perangkat pulih" : String(o).startsWith("staf:") ? "staf" : "admin";
export function alarmHtml(daftar, perMap, {peran, kini, aktif}) {
  if (!daftar.length) return `<p class="ad-kosong">${aktif ? "Tidak ada alarm aktif." : "Belum ada riwayat alarm."}</p>`;
  const bisaTutup = aktif && (peran === "W" || peran === "M");
  const kepala = ["Alarm", "Perangkat", "Nilai", "Ambang", aktif ? "Sejak" : "Mulai", ...(aktif ? (bisaTutup ? ["Aksi"] : []) : ["Ditutup"])];
  const baris = daftar.map(a => {
    const p = perMap.get(a.perangkat_id), sat = p?.satuan;
    return `<tr>${td("Alarm", pilStatus(aktif ? "hilang" : "pensiun", labelKode(a.kode)))}${td("Perangkat", esc(p ? `${p.tag}, ${p.kit_kode ?? p.kit_id}` : "perangkat tak dikenal"))}${td("Nilai", esc(angka(a.nilai, sat)), 1)}${td("Ambang", esc(angka(a.ambang, sat)), 1)}`
      + `${td(aktif ? "Sejak" : "Mulai", aktif ? `sejak ${waktuTag(a.mulai)} <span class="ad-catat">${esc(lalu(a.mulai, kini))}</span>` : waktuTag(a.mulai))}`
      + (aktif ? (bisaTutup ? td("Aksi", `<button type="button" class="ad-tombol" data-tutup="${esc(a.id)}">Tutup alarm</button>`) : "") : td("Ditutup", `ditutup ${waktuTag(a.ditutup)} oleh ${esc(siapaTutup(a.ditutup_oleh))}`)) + `</tr>`;
  });
  return `<div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">${aktif ? "Alarm aktif" : "Riwayat alarm"}</caption><thead><tr>${kepala.map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead><tbody>${baris.join("")}</tbody></table></div>`;
}

/* ---------- form daftar perangkat (DT 4.3 POST /api/sippa/perangkat, hanya moderator) ---------- */
const ada2 = v => v != null && String(v).trim() !== "";
const num = v => Number(String(v).trim().replace(",", "."));
const jenisTag = tag => ada(TAG_PID, tag) ? TAG_PID[tag].jenis : null;
export function cekPerangkat(f) {
  const g = [], tolak = (medan, alasan) => g.push({medan, alasan});
  if (!ID16.test(String(f.kit_id ?? ""))) tolak("kit_id", "Kit belum dipilih. Pilih salah satu kit dari daftar.");
  if (!ada(TAG_PID, String(f.tag ?? ""))) tolak("tag", "Tag belum dipilih atau tidak ada di P&ID SIPPA-G-02. Pilih tag dari daftar.");
  if (ada2(f.interval_s) && !(/^\d+$/.test(String(f.interval_s).trim()) && +f.interval_s >= 10 && +f.interval_s <= 3600)) tolak("interval_s", "Interval kirim harus bilangan bulat 10 sampai 3.600 detik. Isi angka dalam rentang itu atau kosongkan untuk 60.");
  const lo = ada2(f.min_sah) ? num(f.min_sah) : null, hi = ada2(f.maks_sah) ? num(f.maks_sah) : null;
  if (lo != null && !isFinite(lo)) tolak("min_sah", "Batas sah minimum harus angka. Tulis angka, misalnya 0,5, atau kosongkan.");
  if (hi != null && !isFinite(hi)) tolak("maks_sah", "Batas sah maksimum harus angka. Tulis angka, misalnya 16, atau kosongkan.");
  if (lo != null && hi != null && isFinite(lo) && isFinite(hi) && hi <= lo) tolak("maks_sah", "Batas sah maksimum harus lebih besar dari minimum. Perbaiki salah satunya.");
  if (ada2(f.tag_datar) && !/^[A-Za-z0-9_]{1,20}$/.test(String(f.tag_datar).trim())) tolak("tag_datar", "Kunci bentuk datar hanya huruf, angka, dan garis bawah, paling panjang 20. Contoh: T03_50cm_C.");
  if (jenisTag(f.tag) === "suhu_gambut" && ada2(f.kedalaman_cm) && !KEDALAMAN.includes(+f.kedalaman_cm)) tolak("kedalaman_cm", `Kedalaman node harus salah satu dari ${KEDALAMAN.map(fmt).join(", ")} cm. Pilih dari daftar.`);
  return g;
}
export function badanPerangkat(f) {
  const d = TAG_PID[f.tag], b = {kit_id: f.kit_id, tag: f.tag, jenis: d.jenis, satuan: d.satuan, interval_s: ada2(f.interval_s) ? Number(String(f.interval_s).trim()) : 60};
  if (ada2(f.min_sah)) b.min_sah = num(f.min_sah);
  if (ada2(f.maks_sah)) b.maks_sah = num(f.maks_sah);
  if (d.jenis === "suhu_gambut" && ada2(f.kedalaman_cm)) b.kedalaman_cm = Number(f.kedalaman_cm);
  if (ada2(f.tag_datar)) b.tag_datar = String(f.tag_datar).trim();
  b.beri_token = d.jenis === "gateway" || f.beri_token === true || f.beri_token === "1";
  return b;
}
export function tokenHtml(token) {
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) throw new Error("token tidak sah");
  return `<div class="sp-kode-sekali"><p class="sp-peringatan" role="alert">Salin token ini sekarang; token tidak bisa ditampilkan lagi. Yang tersimpan hanya sidik jarinya.</p>
    <input readonly value="${token}" aria-label="Token perangkat" data-token><button type="button" class="ad-tombol" data-salin>Salin token</button></div>`;
}

/* ---------- jaringan ---------- */
const id16 = id => { if (!ID16.test(String(id))) throw new Error("id tidak sah"); return id; };
export const jalurSeri = (perangkat, kini) => `/api/sippa/telemetri?perangkat=${id16(perangkat)}&sejak=${kini - 24 * J}`;
export const jalurTutup = id => `/api/sippa/alarm-tutup/${id16(id)}`;

/* ---------- DOM ---------- */
const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
const kotakGalat = daftar => { const e = el("div", "ad-galat"); e.setAttribute("role", "alert"); const ul = el("ul"); daftar.forEach(g => ul.append(el("li", "", g))); e.append(ul); return e; };
const kartu = (ey, judul, isi, kaki) => `<article class="ex"><header class="ex-hd"><span class="ex-ey">${esc(ey)}</span><div class="ex-jd"><h3>${esc(judul)}</h3></div></header><div class="ex-bd">${isi}</div><footer class="ex-ft">${kaki}</footer></article>`;

let ctrl = null, dialogTerbuka = null;
function tutupDialog() { dialogTerbuka?.close(); dialogTerbuka = null; }
function bukaDialog(judul, isi) {
  tutupDialog();
  const d = el("dialog", "sp-dialog dlg"), kepala = el("div", "dh"), h = el("h3", "", judul), x = el("button", "");
  h.tabIndex = -1; x.type = "button"; x.setAttribute("aria-label", "Tutup"); x.textContent = "×";
  kepala.append(h, x); const badan = el("div", "db"); badan.append(isi); d.append(kepala, badan);
  x.addEventListener("click", () => d.close());
  d.addEventListener("close", () => { d.replaceChildren(); d.remove(); if (dialogTerbuka === d) dialogTerbuka = null; });   // isi dibuang saat tutup: token sekali tampil tidak tersisa di DOM
  document.body.append(d); d.showModal(); h.focus(); dialogTerbuka = d;
  return d;
}
export function lepas() { ctrl?.abort(); ctrl = null; tutupDialog(); }

async function kirimPost(url, badan) { const {kirimPost: k} = await import("./layar_kit.js"); return k(url, badan); }

function dialogDaftar(kitList, sesudahTutup) {
  const f = el("form", "sp-form"); f.noValidate = true;
  const tagOpsi = Object.entries(TAG_PID).map(([t, d]) => `<option value="${esc(t)}">${esc(t)} ${esc(d.nama)}</option>`).join("");
  f.innerHTML = `<label>Kit <select name="kit_id">${kitList.length ? kitList.map(k => `<option value="${esc(k.id)}">${esc(k.kode)}</option>`).join("") : '<option value="">Belum ada kit</option>'}</select></label>
    <label>Tag P&amp;ID <select name="tag">${tagOpsi}</select></label>
    <p class="ad-catat" data-turunan></p>
    <label data-kedalaman hidden>Kedalaman node, cm <select name="kedalaman_cm"><option value="">Belum diisi</option>${KEDALAMAN.map(k => `<option value="${k}">${fmt(k)}</option>`).join("")}</select></label>
    <label>Batas sah minimum, boleh kosong <input name="min_sah" inputmode="decimal"></label>
    <label>Batas sah maksimum, boleh kosong <input name="maks_sah" inputmode="decimal"></label>
    <label>Interval kirim, detik (10 sampai 3.600) <input name="interval_s" inputmode="numeric" value="60"></label>
    <label>Kunci bentuk datar paket pemilik, boleh kosong <input name="tag_datar" maxlength="20" placeholder="T03_50cm_C"></label>
    <label><input type="checkbox" name="beri_token"> Beri token untuk perangkat ini (gateway selalu bertoken)</label>
    <div class="sp-galat-slot"></div><div class="sp-aksi"><button type="submit" class="ad-tombol utama">Daftarkan perangkat</button></div>`;
  const d = bukaDialog("Daftar perangkat", f);
  if (sesudahTutup) d.addEventListener("close", sesudahTutup);
  const turunan = () => {
    const t = TAG_PID[f.elements.tag.value], gw = t.jenis === "gateway";
    f.querySelector("[data-turunan]").textContent = `Jenis ${JENIS[t.jenis].toLowerCase()}, satuan ${t.satuan === "-" ? "tanpa satuan" : t.satuan}. Diturunkan dari tag.`;
    f.querySelector("[data-kedalaman]").hidden = t.jenis !== "suhu_gambut";
    f.elements.beri_token.checked = gw || f.elements.beri_token.checked; f.elements.beri_token.disabled = gw;
  };
  turunan(); f.elements.tag.addEventListener("change", turunan);
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const slot = f.querySelector(".sp-galat-slot"), isian = {};
    for (const n of ["kit_id", "tag", "kedalaman_cm", "min_sah", "maks_sah", "interval_s", "tag_datar"]) isian[n] = f.elements[n].value;
    isian.beri_token = f.elements.beri_token.checked || TAG_PID[isian.tag].jenis === "gateway";
    const salah = cekPerangkat(isian);
    if (salah.length) { slot.replaceChildren(kotakGalat(salah.map(g => g.alasan))); return; }
    const kirim = f.querySelector("button[type=submit]"); kirim.disabled = true; kirim.setAttribute("aria-busy", "true"); kirim.textContent = "Mendaftarkan..."; slot.replaceChildren();
    try {
      const j = await kirimPost("/api/sippa/perangkat", badanPerangkat(isian));
      const hasil = el("div");
      if (j.token) hasil.innerHTML = tokenHtml(j.token); else hasil.append(el("p", "", "Perangkat terdaftar."));
      f.replaceWith(hasil);
      hasil.querySelector("[data-salin]")?.addEventListener("click", async e2 => {
        const kolom = hasil.querySelector("[data-token]"), t = e2.currentTarget;
        try { await navigator.clipboard.writeText(kolom.value); t.textContent = "Tersalin"; } catch { kolom.select(); t.textContent = "Pilih lalu salin manual"; }
      });
    } catch (er) { slot.replaceChildren(kotakGalat([er.message])); kirim.disabled = false; kirim.removeAttribute("aria-busy"); kirim.textContent = "Daftarkan perangkat"; }
  });
}

export async function pasang(akar, konteks) {
  lepas(); ctrl = new AbortController();
  const sinyal = ctrl.signal, peran = peranKlien(document.body?.dataset);
  const st = {perangkat: [], alarm: [], kit: [], dipilih: null, kini: Date.now(), seri: null};
  akar.innerHTML = `<h1 class="sp-judul">Telemetri</h1>${peran === "M" ? '<div class="sp-aksi"><button type="button" class="ad-tombol utama" data-daftar>+ Daftar perangkat</button></div>' : ""}<div id="sp-tel-isi"></div>`;
  const isi = akar.querySelector("#sp-tel-isi");
  const perMap = () => new Map(st.perangkat.map(p => [p.id, p]));
  const perData = () => st.perangkat.reduce((m, p) => p.terakhir != null && (m == null || p.terakhir > m) ? p.terakhir : m, null);
  const perTeks = ms => ms == null ? "per –" : `per ${esc(jamWIB(ms))}`;

  const gambarAlarm = () => {
    const slot = akar.querySelector("#sp-tel-alarm"); if (!slot) return;
    const aktif = st.alarm.filter(a => a.ditutup == null), riwayat = st.alarm.filter(a => a.ditutup != null).sort((a, b) => b.ditutup - a.ditutup).slice(0, 20), m = perMap();
    const kaki = `<span class="ex-leg">${pilYakin("Asumsi kebijakan", "asumsi-kebijakan", "Ambang alarm ditetapkan sebagai asumsi kebijakan sampai G2")}</span><em>Sumber: evaluasi alarm di server, ambang asumsi kebijakan sampai G2, ${perTeks(st.kini)}</em>`;
    slot.innerHTML = kartu("Telemetri", `Alarm aktif (${fmt(aktif.length)})`, alarmHtml(aktif, m, {peran, kini: st.kini, aktif: true}), kaki)
      + kartu("Telemetri", "Riwayat alarm, 20 terakhir", alarmHtml(riwayat, m, {peran, kini: st.kini, aktif: false}), kaki);
    konteks.setPer?.(perData());
  };

  /* satu pemuat seri: memilih perangkat lain membatalkan fetch sebelumnya, jawaban basi tidak pernah menimpa */
  let acSeri = null;
  const muatSeri = async () => {
    acSeri?.abort(); const ac = acSeri = new AbortController(); sinyal.addEventListener("abort", () => ac.abort(), {once: true});
    const slot = akar.querySelector("#sp-tel-grafik"), p = perMap().get(st.dipilih); if (!slot || !p) return;
    slot.replaceChildren(memuat());
    try {
      const j = await konteks.ambil(jalurSeri(p.id, st.kini), ac.signal);
      if (ac.signal.aborted) return;
      const seri = jendelaSeri(j.seri, st.kini), judul = `${p.tag} ${p.kit_kode ?? p.kit_id}, 24 jam, ${p.satuan === "-" ? "tanpa satuan" : p.satuan}`;
      if (!seri.length) { slot.replaceChildren(kosong(`Belum ada bacaan ${p.tag} dalam 24 jam terakhir. Grafik muncul begitu gateway mengirim pesan.`)); return; }
      const acuan = [...acuanDariSah(j.ambang ?? p, p.satuan), ...acuanDariAlarm(st.alarm, p.id, p.satuan)];
      const kecil = seri.length < 5 ? pilYakin("n kecil", "asumsi-kebijakan", "Kurang dari 5 bacaan dalam 24 jam") : "";
      const perSeri = seri[seri.length - 1][0];
      slot.innerHTML = kartu("Telemetri", judul, grafikGaris(seri, {kini: st.kini, satuan: p.satuan, judul, acuan}) + `<details><summary>Lihat sebagai tabel</summary>${tabelSeriHtml(ringkasPerJam(seri, st.kini), p.satuan)}</details>`,
        `<span class="ex-leg"><span><i class="sp-pj"></i>nilai bacaan</span><span>garis putus: batas sah dan ambang alarm</span><span>berongga: di luar rentang, berisi: diragukan</span>${kecil}</span><em>Sumber: pesan telemetri gateway kit, ${fmt(seri.length)} bacaan, ${perTeks(perSeri)}</em>`);
    } catch (e) { if (ac.signal.aborted) return; if (e.status == null) console.error(e); slot.replaceChildren(galat(e.status ?? 0, e.status == null ? "Grafik tidak bisa ditampilkan. Coba lagi." : e.status ? e.message : "Tidak bisa terhubung ke server.", muatSeri)); }
  };

  const gambar = () => {
    if (sinyal.aborted) return;
    if (!st.perangkat.length) { isi.replaceChildren(kosong("Belum ada perangkat terdaftar. Telemetri dipasang mulai 2027 (§6.6).")); konteks.setPer?.(null); return; }
    const urut = urutPerangkat(st.perangkat), per = perData();
    isi.innerHTML = `<div class="sp-kisi"><div><div class="ad-tabel-wadah"><table class="ad-tabel"><caption class="sr">Perangkat telemetri</caption><thead><tr>${["Tag", "Kit", "Jenis", "Terakhir terlihat", "Nilai terakhir", "Mutu", "Aktif"].map(k => `<th scope="col">${k}</th>`).join("")}</tr></thead>
      <tbody>${urut.map(p => barisPerangkatHtml(p, {kini: st.kini, dipilih: p.id === st.dipilih})).join("")}</tbody></table></div>
      <p class="ad-catat sp-sumber">Sumber: pendaftaran perangkat dan pesan telemetri gateway, ${perTeks(per)}. Nilai terakhir bermutu 2 tetap tampil dan berlabel.</p></div>
      <div id="sp-tel-grafik"></div><div class="sp-kisi" id="sp-tel-alarm"></div></div>`;
    gambarAlarm();
  };

  let acMuat = null;
  const muat = async () => {
    acMuat?.abort(); const ac = acMuat = new AbortController(); sinyal.addEventListener("abort", () => ac.abort(), {once: true});
    isi.replaceChildren(memuat());
    try {
      const [jp, ja, jk] = await Promise.all([konteks.ambil("/api/sippa/perangkat", ac.signal), konteks.ambil("/api/sippa/alarm", ac.signal),
        konteks.ambil("/api/sippa/kit", ac.signal).catch(e => { if (e.name === "AbortError") throw e; return {kit: []}; })]);
      if (ac.signal.aborted) return;
      st.kit = jk.kit || [];
      const kode = new Map(st.kit.map(k => [k.id, k.kode]));
      st.perangkat = (jp.perangkat || []).map(p => ({...p, kit_kode: p.kit_kode ?? kode.get(p.kit_id)}));
      st.alarm = ja.alarm || []; st.kini = Date.now();
      if (!st.perangkat.some(p => p.id === st.dipilih)) st.dipilih = pilihAwal(st.perangkat);
      gambar();
      if (st.dipilih) muatSeri();
    } catch (e) { if (ac.signal.aborted) return; if (e.status == null) console.error(e); isi.replaceChildren(galat(e.status ?? 0, e.status == null ? "Layar tidak bisa ditampilkan. Coba lagi." : e.status ? e.message : "Tidak bisa terhubung ke server.", muat)); }
  };

  /* INP: aria-pressed dan label tombol berubah seketika di handler; fetch dan gambar ulang berat lewat nanti() */
  akar.addEventListener("click", e => {
    const pilih = e.target.closest("[data-pilih]");
    if (pilih) {
      if (pilih.dataset.pilih === st.dipilih) return;
      akar.querySelectorAll("[data-pilih]").forEach(b => b.setAttribute("aria-pressed", String(b === pilih)));
      st.dipilih = pilih.dataset.pilih; nanti(muatSeri); return;
    }
    const tutup = e.target.closest("[data-tutup]");
    if (tutup && !tutup.disabled) {
      tutup.disabled = true; tutup.setAttribute("aria-busy", "true"); tutup.textContent = "Menutup...";
      nanti(async () => {
        try {
          await kirimPost(jalurTutup(tutup.dataset.tutup), {});
          if (sinyal.aborted) return;
          const ja = await konteks.ambil("/api/sippa/alarm", sinyal); st.alarm = ja.alarm || []; gambarAlarm(); muatSeri(); konteks.pesan?.("Alarm ditutup.");
        } catch (er) { if (sinyal.aborted) return; konteks.pesan?.(er.message || "Alarm tidak bisa ditutup. Coba lagi."); tutup.disabled = false; tutup.removeAttribute("aria-busy"); tutup.textContent = "Tutup alarm"; }
      });
      return;
    }
    if (e.target.closest("[data-daftar]")) dialogDaftar(st.kit, () => { if (!sinyal.aborted) muat(); });
  }, {signal: sinyal});
  await muat();
}
