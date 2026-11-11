"use strict";
/* /prediksi: tab Besok (kartu per kab), Rapor (skor vs baseline), Dampak (paparan statis), Konfirmasi (POST /api/prediksi/konfirmasi).
   Data: data/prediksi.json, skor.json, ujibalik.json, kalibrasi.json, lalu.json (scripts/prediksi/*.py).
   $, fmt, esc, rb dari ../inti/format.js. Angka: format id-ID, peluang dibulatkan ke 5% (tidak ada presisi palsu). */
const PR = {dampak: null, jalan: null, d: null, skor: null, uji: null, kal: null, lalu: null, kalender: null, n: 60, tab: "besok", lap: undefined, geo: {}};
const LEVEL = ["Normal", "Waspada", "Siaga", "Awas"];
const ISPU = ["Baik/Sedang", "Tidak sehat", "Sangat tidak sehat", "Berbahaya"];
const KODE_NAMA = {HJN: "Hujan", API: "Titik panas", BNJ: "Banjir", LSR: "Longsor", ASP: "Asap PM2,5", ROB: "Rob"};

const persen = p => p == null ? "–" : p < 0.05 ? "<5%" : p > 0.95 ? ">95%" : `${Math.round(p * 20) * 5}%`;
const mm = v => v == null ? "–" : v < 1 ? "<1 mm" : `±${fmt(Math.round(v))} mm`;
const jam = h => h == null ? "–" : `±${String(h).padStart(2, "0")}.00`;
const tglPanjang = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta"});
const tgl = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta"});
// ["2014",..,"2020","2024","2025"] -> "2014–2020 dan 2024–2025": runtun bersambung digabung
const rentangTahun = th => {
  const r = [];
  for (const y of th.map(Number).sort((a, b) => a - b)) (r.length && r.at(-1)[1] === y - 1) ? r.at(-1)[1] = y : r.push([y, y]);
  const s = r.map(([a, b]) => a === b ? `${a}` : `${a}–${b}`);
  return s.length < 3 ? s.join(" dan ") : `${s.slice(0, -1).join(", ")}, dan ${s.at(-1)}`;
};
const angka3 = v => v == null ? "–" : fmt(Math.round(v * 1000) / 1000);
const angka4 = v => v == null ? "–" : fmt(Math.round(v * 10000) / 10000);
const kol = (kode, r, c) => r ? r[PR.d.kode[kode].kol.indexOf(c)] : null;

function pil(v) {
  /* v = [vonis, n, bss_klim, terkalibrasi] dari prediksi.json kode.vonis */
  if (!v) return "";
  const kls = v[0] === "mengalahkan baseline" ? "ok" : v[0] === "belum teruji" ? "abu" : "buruk";
  const t = v[0] === "belum teruji" ? `belum teruji${v[1] ? ` (n ${fmt(v[1])})` : ""}` : `${v[0]}, n ${fmt(v[1])}`;
  return `<span class="pr-pil ${kls}" title="Rapor ketepatan prakiraan ini">${esc(t)}${v[3] ? ", terkalibrasi" : ""}</span>`;
}

const sumber = kode => {
  const k = PR.d.kode[kode];
  return k ? `<span class="pr-src" title="Dibekukan ${esc(jamWIB(k.dibuat))}">Sumber: ${esc(k.sumber)}; terbit ${esc(tgl(k.terbit))}</span>` : "";
};

const ribu = v => rb(v).replace(/ rb$/, " ribu").replace(/ jt$/, " juta");
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_PENUH = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const JENIS_KAL = {banjir: "Banjir", longsor: "Longsor", cuaca: "Cuaca ekstrem", karhutla: "Karhutla"};
const pk = p => p == null ? "–" : p < 0.05 ? "<5%" : `${Math.round(p * 20) * 5}%`;

/* Kalender risiko (kalender_risiko.json): referensi kedua dari logbook Pusdalops, bukan pengganti klimatologi di rapor. */
function barisKal(k, n) {
  const kk = PR.kalender?.kab[k.id], hari = PR.d.kode.HJN?.hari?.[n - 1];
  if (!kk || !hari) return "";
  const m = +hari.slice(5, 7) - 1;
  const isi = ["banjir", "longsor", "karhutla"].filter(j => kk[j].ada[m] > 0).sort((a, b) => kk[b].ada[m] - kk[a].ada[m])
    .map(j => `${JENIS_KAL[j].toLowerCase()} di ${fmt(kk[j].ada[m])} dari ${fmt(PR.kalender.n_tahun)} tahun${kk[j].kecil ? " (sampel kecil)" : ""}`).join(", ");
  if (!isi) return "";
  return `<div class="pr-b"><span class="pr-lab" data-k="KAL" title="${esc(PR.kalender.metode)}">Riwayat ${esc(BULAN[m])}</span><span>${isi} <span class="pr-pil abu">logbook Pusdalops</span></span></div>`;
}

function kartu(k, n) {
  const v = (kode, c) => PR.d.kode[kode]?.vonis[`${c}|${n}`];
  const baris = [];
  const h = k.HJN?.[n - 1];
  if (h) {
    const [p1, p20, p50, tot, mulai, lama, , m] = ["p1", "p20", "p50", "tot", "mulai", "lama", "puncak", "m"].map(c => kol("HJN", h, c));
    const kapan = mulai == null ? "tidak ada jam hujan ≥0,5 mm" : `mulai ${esc(jam(mulai))} WIB, lama ±${fmt(lama)} jam, total ${mm(tot)}`;
    baris.push(`<div class="pr-b"><span class="pr-lab" data-k="HJN">Hujan</span><span>${kapan}<br>peluang ≥1 mm ${persen(p1)}, ≥20 mm ${persen(p20)}, ≥50 mm ${persen(p50)}
      ${m ? "" : '<span class="pr-pil abu" title="Tanpa ansambel: skor kasar dari jumlah hujan deterministik">skor kasar</span>'} ${pil(v("HJN", "p20"))}</span></div>`);
  }
  const a = k.API?.[n - 1];
  if (a) baris.push(`<div class="pr-b"><span class="pr-lab" data-k="API">Titik panas</span><span>peluang ≥1 titik ${persen(kol("API", a, "p"))} (${fmt(kol("API", a, "d"))} dari 3 hari terakhir bertitik panas) ${pil(v("API", "p"))}</span></div>`);
  for (const kd of ["BNJ", "LSR"]) {
    const r = k[kd]?.[n - 1];
    if (r) baris.push(`<div class="pr-b"><span class="pr-lab" data-k="${kd}">${KODE_NAMA[kd]}</span><span>${LEVEL[kol(kd, r, "lv")]}${kol(kd, r, "ps") != null ? `, peluang Siaga ${persen(kol(kd, r, "ps"))}` : ""} ${pil(v(kd, "ps"))}</span></div>`);
  }
  const s = k.ASP?.[n - 1];
  if (s) baris.push(`<div class="pr-b"><span class="pr-lab" data-k="ASP">Asap</span><span>PM2,5 ±${fmt(kol("ASP", s, "pm"))} µg/m³, ${ISPU[kol("ASP", s, "kat")]} <span class="pr-pil abu">belum teruji</span></span></div>`);
  const r = k.ROB?.[n - 1];
  if (r) baris.push(`<div class="pr-b"><span class="pr-lab" data-k="ROB">Rob</span><span>${kol("ROB", r, "lewat") ? "muka laut melewati p95" : "di bawah p95"} <span class="pr-pil abu">belum teruji</span></span></div>`);
  baris.push(barisKal(k, n));
  return `<article class="card pr-k" role="listitem"><header class="pr-kh"><h3>${esc(k.nama)}</h3><span class="pr-kp"><small>${esc(k.pn)}</small><small>${ribu(k.jiwa)} jiwa</small></span></header>${baris.join("") || '<p class="pr-kecil">Tidak ada prakiraan untuk hari ini.</p>'}</article>`;
}

function saring() {
  const q = $("#cari").value.trim().toLowerCase(), p = $("#prov").value, n = +$("#hari").value || 1, u = $("#urut").value;
  const skor = k => u === "nama" ? 0 : u === "api" ? -(kol("API", k.API?.[n - 1], "p") ?? -1) : u === "asap" ? -(kol("ASP", k.ASP?.[n - 1], "pm") ?? -1)
    : -((kol("HJN", k.HJN?.[n - 1], "p50") ?? -1) * 10 + (kol("HJN", k.HJN?.[n - 1], "tot") ?? 0) / 1000);
  return PR.d.kab.filter(k => (!p || k.prov === p) && (!q || k.nama.toLowerCase().includes(q)))
    .sort((a, b) => skor(a) - skor(b) || a.nama.localeCompare(b.nama, "id"));
}

function gambarBesok() {
  const n = +$("#hari").value || 1, daftar = saring(), nama = Object.fromEntries(PR.d.kab.map(k => [k.id, k]));
  $("#kartu").innerHTML = daftar.slice(0, PR.n).map(k => kartu(k, n)).join("") || '<p class="kosong">Tidak ada kab/kota yang cocok.</p>';
  $("#lagi").hidden = daftar.length <= PR.n;
  $("#lagi").textContent = `Tampilkan lagi (${fmt(daftar.length - PR.n)} tersisa)`;
  const ids = new Set(daftar.map(k => k.id));
  const w = PR.d.waspada.filter(x => x.tenggang === n && ids.has(x.kab));
  const atr = Object.fromEntries(PR.d.aturan.map(a => [a.id, a]));
  const per = {};
  for (const x of w) (per[x.aturan] ||= []).push(x);
  $("#waspada").innerHTML = Object.entries(per).map(([id, xs]) => {
    const a = atr[id], jiwa = xs.reduce((s, x) => s + (x.dampak.jiwa || 0), 0);
    const ungsi = xs.reduce((s, x) => s + (x.dampak.kebutuhan?.mengungsi || 0), 0);
    const syarat = [...(a.semua || []), ...(a.salah_satu || [])].map(s => esc(s.sumber)).join(a.salah_satu ? " ATAU " : "; ");
    const rinci = xs.slice(0, 40).map(x => {
      const d = x.dampak, kb = d.kebutuhan;
      return `<li><b>${esc(nama[x.kab]?.nama)}</b>: ${ribu(d.jiwa)} jiwa terpapar${d.sekolah != null ? `, ${fmt(d.sekolah)} sekolah, ${fmt(d.faskes)} faskes` : ""}${d.murid ? `, ${ribu(d.murid)} murid` : ""}${kb ? `; perkiraan mengungsi ${ribu(kb.mengungsi)}: air ${ribu(kb.air_l)} L/hari, hunian ${ribu(kb.hunian_m2)} m², ${ribu(kb.jamban)} jamban, pangan ${ribu(kb.kkal)} kkal/hari` : ""}</li>`;
    }).join("");
    return `<details class="card pad pr-w"><summary><b>${esc(a.maka)}</b>: ${fmt(xs.length)} kab/kota, ${ribu(jiwa)} jiwa terpapar${ungsi ? `, perkiraan mengungsi ${ribu(ungsi)}` : ""} <span class="pr-pil abu">perkiraan, belum diuji balik</span></summary>
      <p class="pr-kecil">Jika: ${syarat}. Paparan: ${esc(a.paparan?.sumber || "")}.${a.catatan ? " " + esc(a.catatan) : ""} Kebutuhan: ${esc(PR.d.sphere.sumber)}.</p><ul>${rinci}</ul>${xs.length > 40 ? `<p class="pr-kecil">dan ${fmt(xs.length - 40)} lainnya; persempit dengan filter.</p>` : ""}</details>`;
  }).join("");
}

function tabelSkor(kode, g) {
  if (g.status !== "dinilai") return `<p class="pr-kecil">${esc(KODE_NAMA[kode])}: menunggu (${fmt(g.prakiraan || 0)} prakiraan tercatat). ${esc(g.alasan || "")}</p>`;
  const rows = g.grup.map(x => `<tr><td>${esc(x.ambang)}</td><td class="n">+${esc(x.tenggang)}</td><td>${esc(x.tahap)}</td><td class="n">${fmt(x.n)}</td>
    <td class="n">${angka3(x.brier_banding)}</td><td class="n">${angka3(x.brier_persistensi)}</td><td class="n">${angka3(x.brier_klimatologi)}</td>
    <td class="n">${x.pod == null ? "–" : persen(x.pod)}</td><td class="n">${x.far == null ? "–" : persen(x.far)}</td>
    <td class="n">${x.mae_mulai == null ? "–" : `±${fmt(Math.round(x.mae_mulai))} jam`}</td><td class="n">${x.mae_lama == null ? "–" : `±${fmt(Math.round(x.mae_lama))} jam`}</td>
    <td>${pil([x.vonis, x.n_banding])}</td></tr>`).join("");
  return `<h3>${esc(KODE_NAMA[kode])}</h3><div class="tw"><table><thead><tr><th>Ambang</th><th class="n">Tenggang</th><th>Tahap</th><th class="n">n</th>
    <th class="n">Brier model</th><th class="n">Brier persistensi</th><th class="n">Brier klimatologi</th><th class="n">POD</th><th class="n">FAR</th>
    <th class="n">Galat jam mulai</th><th class="n">Galat lama</th><th>Vonis</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* Model bayangan (lab adu model 2 Nov 2026): berdampingan dengan model lama dan baseline, pasangan kab-hari yang sama. Tidak mengganti apa pun. */
const pilAp = (v, n) => `<span class="pr-pil abu">${v === "belum teruji" ? "belum teruji" : v.startsWith("peringkat lebih") ? `AP unggul di ${fmt(n)} pasangan prospektif` : `AP belum unggul di ${fmt(n)} pasangan prospektif`}</span>`;
function bayanganRapor(b) {
  if (!b) return "";
  const nama = kd => b.model[kd]?.nama || kd;
  const rows = b.banding.map(x => `<tr><td>${esc(nama(x.kode))}</td><td class="n">+${esc(x.tenggang)}</td><td class="n">${fmt(x.n_banding)}</td>
    <td class="n">${angka4(x.brier_bayangan)}</td><td class="n">${x.lama ? angka4(x.brier_lama) : "tidak ada"}</td><td class="n">${angka4(x.brier_persistensi)}</td><td class="n">${angka4(x.brier_klimatologi)}</td>
    <td class="n">${angka3(x.ap_bayangan)}</td><td class="n">${x.lama ? angka3(x.ap_lama) : "tidak ada"}</td><td class="n">${angka3(x.ap_persistensi)}</td><td class="n">${angka3(x.ap_klimatologi)}</td>
    <td>${pil([x.vonis, x.n_banding])}</td><td>${pilAp(x.vonis_peringkat, x.n_banding)}</td></tr>`).join("");
  const info = Object.entries(b.model).map(([kd, m]) => `<li><b>${esc(m.nama)}</b> (${fmt(m.prakiraan)} prakiraan tercatat): ${esc(m.metode)}. Di lab: ${esc(m.uji_lab)}.</li>`).join("");
  return `<section class="card pad pr-sek"><h2>Model bayangan, diuji berdampingan</h2><p class="pr-kecil">${esc(b.catatan)} Brier lebih kecil dan AP (ketepatan peringkat) lebih besar = lebih baik. Vonis kiri memakai aturan yang sama dengan model lama (Brier lebih kecil dari persistensi dan klimatologi, n ≥ 30); vonis kanan memakai AP. Peluang bayangan belum dikalibrasi, jadi Brier dapat kalah oleh pergeseran laju kejadian sementara peringkatnya menang.</p>
    <ul class="pr-kecil">${info}</ul>${rows ? `<div class="tw"><table><thead><tr><th>Model</th><th class="n">Tenggang</th><th class="n">n pasangan</th><th class="n">Brier bayangan</th><th class="n">Brier model lama</th><th class="n">Brier persistensi</th><th class="n">Brier klimatologi</th>
    <th class="n">AP bayangan</th><th class="n">AP model lama</th><th class="n">AP persistensi</th><th class="n">AP klimatologi</th><th>Vonis (Brier)</th><th>Vonis (AP)</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="pr-kecil">Belum ada pasangan yang matang. Banjir dan longsor menunggu label DIBI 14 hari, karhutla dan cuaca ekstrem sesudah data harian terkumpul.</p>'}</section>`;
}

function gambarRapor() {
  const s = PR.skor, u = PR.uji, k = PR.kal;
  let h = `<div class="head"><div><h2>Rapor ketepatan</h2><p class="pr-kecil">Brier lebih kecil = lebih baik. Prakiraan harus lebih baik dari persistensi (besok = hari terakhir lengkap) dan klimatologi (frekuensi bulan yang sama). Vonis butuh ≥30 pasangan.</p></div></div>`;
  h += `<section class="card pad pr-sek"><h2>Prospektif</h2><p class="pr-kecil">${esc(s?.catatan || "skor.json belum ada")}</p>${s ? Object.entries(s.kode).filter(([kd]) => !kd.endsWith("_B")).map(([kd, g]) => tabelSkor(kd, g)).join("") : ""}</section>`;
  h += bayanganRapor(s?.bayangan);
  h += `<section class="card pad pr-sek"><h2>Uji balik retrospektif</h2>${u ? `<p class="pr-kecil">${esc(u.catatan)} Periode ${esc(u.periode.join(" s.d. "))}, ${fmt(u.n_terbit)} hari terbit.</p>${tabelSkor("HJN", u.kode.HJN)}` : '<p class="pr-kecil">Belum dijalankan.</p>'}</section>`;
  h += kalenderRapor();
  const ka = PR.aktif;
  h += `<section class="card pad pr-sek"><h2>Koreksi bulanan banjir</h2><p class="pr-kecil">${ka?.versi ? `Versi koreksi yang dipakai: ${ka.versi}${ka.setel ? `, disusun ulang ${tglPanjang(ka.setel)}` : ""}.` : "Belum ada koreksi yang lolos uji: prakiraan banjir memakai angka model apa adanya."} Disusun ulang sebulan sekali. Versi baru hanya dipakai bila lebih akurat pada hari-hari uji yang tidak ikut disusun. Prakiraan yang sudah terbit tidak berubah. Sumber: data kejadian DIBI BNPB dan logbook Pusdalops.</p></section>`;
  const kp = (k?.peluang || []).concat(k?.jumlah || []);
  h += `<section class="card pad pr-sek"><h2>Kalibrasi otomatis</h2><p class="pr-kecil">${esc(k?.aturan?.metode || "kalibrasi.json belum ada")}. Dipakai ${fmt(k?.ringkas?.dipakai || 0)}, ditolak ${fmt(k?.ringkas?.ditolak || 0)}, menunggu ${fmt(k?.ringkas?.menunggu || 0)}.</p>
    ${kp.length ? `<div class="tw"><table><thead><tr><th>Grup</th><th>Status</th><th class="n">n fit / uji</th><th>Alasan</th></tr></thead><tbody>${kp.map(x =>
      `<tr><td>${esc(x.kode || x.besaran)} ${esc(x.ambang ?? x.prov)} +${esc(x.tenggang)}</td><td>${esc(x.status)}</td><td class="n">${fmt(x.n_fit)} / ${fmt(x.n_uji)}</td><td>${esc(x.alasan)}</td></tr>`).join("")}</tbody></table></div>` : ""}</section>`;
  $("#rapor").innerHTML = h;
}

function kalenderRapor() {
  const kal = PR.kalender;
  if (!kal) return '<section class="card pad pr-sek"><h2>Kalender risiko</h2><p class="pr-kecil">kalender_risiko.json belum ada.</p></section>';
  const id = idKab($("#kalKab")?.value || "") || PR.d.kab[0].id, kk = kal.kab[id], m0 = new Date(Date.now() + 7 * 36e5).getUTCMonth();
  const baris = !kk ? '<p class="pr-kecil">Kab/kota ini tidak ada di logbook (nama wilayah tidak cocok).</p>' : kal.jenis.map(j => {
    const x = kk[j], mx = Math.max(0.05, ...x.p.map(v => v || 0));
    return `<div class="pr-kal"><b>${JENIS_KAL[j]}</b> ${x.kecil ? '<span class="pr-pil buruk">sampel kecil</span>' : ""}<div class="pr-bars" role="img" aria-label="Peluang bulanan ${JENIS_KAL[j]}">${x.p.map((v, i) =>
      `<span class="pr-bar${i === m0 ? " ini" : ""}" tabindex="0" style="height:${Math.round((v || 0) / mx * 100)}%" title="${BULAN[i]}: ${fmt(x.ada[i])} dari ${fmt(kal.n_tahun)} tahun${x.ada[i] ? " ada kejadian" : ""}"></span>`).join("")}</div></div>`;
  }).join("");
  return `<section class="card pad pr-sek" id="kalender"><h2>Kalender risiko dari logbook</h2>
    <p class="pr-kecil">Referensi kedua, berdampingan dengan klimatologi: klimatologi di atas memakai pengamatan harian yang baru dikumpulkan sistem ini; kalender memakai logbook Pusdalops tahun penuh ${esc(rentangTahun(kal.tahun_penuh))} (${fmt(kal.n_tahun)} tahun), sehingga cocok untuk sisi dampak banjir dan longsor. Angka \"N dari ${fmt(kal.n_tahun)} tahun\" = tahun yang bulan itu punya minimal satu kejadian tercatat. Kab/kota dengan kurang dari ${fmt(kal.kecil_di_bawah)} kejadian ditandai sampel kecil. Belum diuji lawan prakiraan.</p>
    <label class="pr-kecil">Kab/kota <input id="kalKab" list="dKab" value="${esc(PR.d.kab.find(k => k.id === id).nama)}" autocomplete="off"></label>
    <div id="kalIsi">${baris}</div></section>`;
}

function laluKab() {
  const kab = idKab($("#kKab").value), t = $("#kTgl").value, hari = PR.lalu?.hari?.[t];
  if (!kab || !hari) { $("#kLalu").innerHTML = '<p class="pr-kecil">Tidak ada prakiraan tercatat untuk kab dan tanggal ini.</p>'; return; }
  const isi = Object.entries(hari).filter(([, v]) => v.kab[kab]).map(([kd, v]) => {
    const r = v.kab[kab], g = c => r[v.kol.indexOf(c)];
    const t = kd === "HJN" ? `hujan ${mm(g("tot"))}, peluang ≥20 mm ${persen(g("p20"))}` : kd === "API" ? `peluang titik panas ${persen(g("p"))}`
      : kd === "ASP" ? `PM2,5 ±${fmt(g("pm"))} µg/m³` : kd === "ROB" ? (g("lewat") ? "rob di atas p95" : "rob di bawah p95") : LEVEL[g("lv")];
    return `<li><b>${KODE_NAMA[kd]}</b>: ${esc(t)} (terbit ${esc(v.terbit)})</li>`;
  }).join("");
  $("#kLalu").innerHTML = `<p class="pr-kecil">Prakiraan sehari sebelumnya untuk tanggal ini:</p><ul>${isi}</ul>`;
}

const idKab = s => PR.d?.kab.find(k => k.nama === s || k.id === s)?.id;

async function kirim(e) {
  e.preventDefault();
  const kab = idKab($("#kKab").value);
  if (!kab) { $("#kHasil").textContent = "Pilih kab/kota dari daftar."; return; }
  const regu = $("#kRegu").value.trim();
  try { localStorage.setItem("prediksi.regu", regu); } catch {}
  const nilai = $("#kNilai").value === "" ? null : Number($("#kNilai").value);
  const body = {kab, tanggal: $("#kTgl").value, kode: $("#kKode").value, terjadi: +e.submitter.dataset.terjadi, nilai, catatan: $("#kCat").value.trim() || null};
  $("#kHasil").textContent = "Mengirim…";
  try {
    const r = await fetch("/api/prediksi/konfirmasi", {method: "POST", headers: {"content-type": "application/json", "x-kode-regu": regu}, body: JSON.stringify(body)});
    const j = await r.json().catch(() => ({}));
    $("#kHasil").textContent = r.ok ? `Tersimpan: ${KODE_NAMA[body.kode]} ${body.terjadi ? "terjadi" : "tidak terjadi"} di ${$("#kKab").value}, ${tgl(body.tanggal)}.` : `Gagal: ${j.galat || j.error || r.status}`;
  } catch (x) { $("#kHasil").textContent = "Gagal mengirim: periksa sambungan."; }
}

/* Tab Dampak: paparan statis per kab (dampak.json, jalan.json), dimuat sekali saat tab pertama dibuka. SKENARIO/PAPARAN, bukan prakiraan. */
const kelasPil = {Rendah: "ok", Sedang: "abu", Tinggi: "buruk", "Sangat tinggi": "buruk"};
function gambarDampak() {
  const q = $("#dKabIn").value, id = q ? idKab(q) : PR.d.kab[0].id, k = PR.d.kab.find(x => x.id === id);
  if (!k) { $("#dampakIsi").innerHTML = '<p class="kosong">Kab/kota tidak ditemukan.</p>'; return; }
  const dp = PR.dampak?.kab[id], jl = PR.jalan?.kab[id];
  const g = dp?.gempa, f = dp?.genangan, t = dp?.terisolir;
  const baris = [];
  baris.push(g ? `<div class="pr-b"><b>Gempa bumi</b> bahaya ${g.kelas ? `<span class="pr-pil ${kelasPil[g.kelas] || "abu"}">${esc(g.kelas)}</span>` : ""} skor ${fmt(g.skor)} dari 100${g.m_maks != null ? `, magnitudo tertinggi tercatat ${fmt(g.m_maks)}, ${fmt(g.n_m5)} gempa M5+` : ""}${g.kec_inarisk != null ? `; InaRISK: ${fmt(g.kec_tinggi)} dari ${fmt(g.kec_inarisk)} kecamatan berindeks tinggi (indeks tertinggi ${angka3(g.inarisk_maks)})` : ""}</div>`
    : '<div class="pr-b"><b>Gempa bumi</b> tidak ada di sumber.</div>');
  baris.push(f ? `<div class="pr-b"><b>Genangan banjir</b> kejadian terekam terbesar ${fmt(Math.round(f.tergenang_ha))} ha pada ${esc(tgl(f.acuan))} (cakupan radar ${fmt(f.cakupan_pct)}%). Jumlah bangunan terendam belum ditampilkan sampai koreksi permukiman selesai.</div>`
    : '<div class="pr-b"><b>Genangan banjir</b> tidak ada citra radar yang terekam untuk kab/kota ini.</div>');
  baris.push(t ? `<div class="pr-b"><b>Desa langganan terisolir</b> ${fmt(t.desa)} desa, ${fmt(t.kejadian)} kejadian di logbook (batas atas, layak dicek)</div>` : '<div class="pr-b"><b>Desa langganan terisolir</b> tidak tercatat di logbook.</div>');
  baris.push(jl ? `<div class="pr-b"><b>Titik rawan putus jalan</b> ${jl.way_rawan != null ? `${fmt(jl.way_rawan)} ruas (way OSM) yang bila putus memisahkan ≥${fmt(jl.km_rawan)} km jalan lain,` : "angka ruas rawan dihitung ulang di giliran berikut;"} dari ${fmt(jl.way)} way OSM jalan utama (${fmt(Math.round(jl.km_jaringan))} km), ${fmt(jl.jembatan_tunggal)} di antaranya jembatan.
    <ol class="pr-kecil">${jl.top.map(o => `<li>${esc(o.nama || "tanpa nama")} (${esc(o.kelas)}${o.jembatan ? ", jembatan" : ""}): bila terputus, ${fmt(Math.round(o.km_terisolir * 10) / 10)} km jalan terpisah <a href="https://www.openstreetmap.org/way/${esc(o.way)}" target="_blank" rel="noopener">OSM ${esc(o.way)}</a></li>`).join("")}</ol></div>`
    : '<div class="pr-b"><b>Titik rawan putus jalan</b> belum dihitung untuk kab/kota ini.</div>');
  baris.push('<div class="pr-b"><b>Tsunami dan kerusakan bangunan gempa</b> tidak ditampilkan per kab: sumber terbukanya tidak tersedia sebagai tabel statis.</div>');
  $("#dampakIsi").innerHTML = `<article class="card pr-k"><h3>${esc(k.nama)}</h3><p class="pr-kecil">${esc(k.pn)}</p>${baris.join("")}</article>`;
}
async function muatDampak() {
  if (PR.dampak === null) {
    $("#dampakIsi").innerHTML = '<p class="kosong">Memuat…</p>';
    [PR.dampak, PR.jalan] = await (PR.memDampak ||= Promise.all(["dampak.json", "jalan.json"].map(ambil)));
    PR.dampak ||= false;
    $("#dampakLabel").textContent = PR.dampak ? PR.dampak.label + (PR.jalan ? " " + PR.jalan.label : "") : "";
    $("#dampakSumber").innerHTML = PR.dampak ? Object.values(PR.dampak.sumber).map(esc).join("<br>") + `<br>Data: ${esc(PR.dampak.dibuat)}` + (PR.jalan ? "<br>" + esc(PR.jalan.sumber) + `<br>Data jalan: ${esc(PR.jalan.dibuat)}` : "") : "";
  }
  if (!PR.dampak) { $("#dampakIsi").innerHTML = '<p class="kosong">Data dampak belum tersedia.</p>'; return; }
  gambarDampak();
}

function pilihTab(t) {
  PR.tab = t;
  document.querySelectorAll("#tabs button").forEach(b => b.dataset.tab === t ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  document.querySelectorAll(".db-nav-b[data-tab]").forEach(b => b.setAttribute("aria-current", String(b.dataset.tab === t)));
  const j = $("#prJudul"); if (j) j.textContent = document.querySelector(`#tabs button[data-tab="${t}"]`)?.textContent || "Prediksi";
  document.querySelectorAll("main .page").forEach(s => s.classList.toggle("on", s.id === "p-" + t));
  const tunda2 = f => window.nanti ? window.nanti(f) : f();   // isi berat sesudah satu frame tercat (chrome tab sudah berganti)
  if (t === "rapor" && !$("#rapor table, #rapor section")) tunda2(gambarRapor);
  if (t === "dampak") tunda2(muatDampak);
  if (t === "laporan") muatLaporan();   // laporan_layar.js; hash #laporan/<prov> diatur di sana
  else if (t === "tangga") muatTangga();   // tangga.js; hash #tangga/<id kab> diatur di sana
  else history.replaceState(null, "", t === "besok" ? "./" : "#" + t);
}

/* model A (data/kajian-bnpb/dashboard): panel seksi kiri dari tab, kepala halaman navy, kaki pembaruan data per sumber */
const IK_TAB = {besok: "M8 2v4|M16 2v4|M3 10h18|M5 4h14v17H5z", rapor: "M9 11l3 3 8-8|M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9", tangga: "M4 20h4v-4h4v-4h4V8h4", dampak: "M12 3l9 16H3z|M12 10v4|M12 17v.5", laporan: "M6 3h9l4 4v14H6z|M9 12h6|M9 16h6", konfirmasi: "M20 6 9 17l-5-5"};
const svgD = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d.split("|").map(x => `<path d="${x}"/>`).join("")}</svg>`;
function panelKiri() {
  if ($(".db-nav")) return;
  const tabs = [...document.querySelectorAll("#tabs button[data-tab]")];
  const kaki = Object.entries(PR.d.kode).map(([kd, k]) => `<div class="db-nav-pb"><i class="db-nav-dot"></i><span>${esc(KODE_NAMA[kd] || kd)}</span><b>${esc(tgl(k.terbit).replace(/^\w+, /, "").replace(/ (\w{3})\w*$/, " $1"))}</b></div>`).join("");
  document.body.insertAdjacentHTML("beforeend", `<aside class="db-nav pr-nav" aria-label="Seksi prediksi"><div class="db-nav-id"><b>Prediksi</b><small>Prakiraan per kab/kota sampai 3 hari</small></div>
    <p class="db-nav-g"><i>${svgD("M4 6h16|M4 12h16|M4 18h10")}</i><span>Isi halaman</span></p>
    <nav class="db-nav-isi">${tabs.map(b => `<button type="button" class="db-nav-b" data-tab="${b.dataset.tab}" aria-current="${b.hasAttribute("aria-current")}"><i class="db-nav-ik">${svgD(IK_TAB[b.dataset.tab] || IK_TAB.besok)}</i><span class="db-nav-t">${esc(b.textContent.trim())}</span></button>`).join("")}</nav>
    <div class="db-nav-kaki"><p class="db-nav-g"><i>${svgD("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z|M12 7v5l3 2")}</i><span>Pembaruan data</span></p>${kaki}</div></aside>`);
  $(".pr-nav").addEventListener("click", e => { const b = e.target.closest("button[data-tab]"); if (b) pilihTab(b.dataset.tab); });
  document.querySelector("main").insertAdjacentHTML("afterbegin", `<h1 class="db-l1" id="prJudul">${esc(document.querySelector("#tabs button[aria-current]")?.textContent || "Besok")}</h1>`);
}

async function ambil(f) { try { const r = await fetch("data/" + f, {cache: "no-cache"}); return r.ok ? r.json() : null; } catch { return null; } }

async function mulai() {
  [PR.d, PR.skor, PR.uji, PR.kal, PR.lalu, PR.kalender, PR.aktif] = await Promise.all(["prediksi.json", "skor.json", "ujibalik.json", "kalibrasi.json", "lalu.json", "kalender_risiko.json", "kalibrasi_aktif.json"].map(ambil));
  if (!PR.d) { $("#kartu").innerHTML = '<p class="kosong">Data prediksi belum tersedia.</p>'; $("#upd").textContent = "Data belum ada"; return; }
  $("#upd").textContent = "Diperbarui " + jamWIB(PR.d.dibuat);
  const hj = PR.d.kode.HJN || Object.values(PR.d.kode)[0];
  $("#hari").innerHTML = hj.hari.map((h, i) => `<option value="${i + 1}">${i ? `+${i + 1} hari` : "Besok"}: ${esc(tgl(h))}</option>`).join("");
  const prov = [...new Map(PR.d.kab.map(k => [k.prov, k.pn])).entries()].sort((a, b) => a[1].localeCompare(b[1], "id"));
  $("#prov").insertAdjacentHTML("beforeend", prov.map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join(""));
  $("#dKab").innerHTML = PR.d.kab.map(k => `<option value="${esc(k.nama)}">${esc(k.pn)}</option>`).join("");
  /* sumber dan batasan dilipat di bawah kartu (sistem desain dashboard: teks metode tidak menutupi angka) */
  $("#catatan").innerHTML = `<details class="db-catatan"><summary>Sumber dan batasan</summary><p class="pr-kecil">${Object.keys(PR.d.kode).map(sumber).join("<br>")}</p><ul class="pr-kecil">${PR.d.batasan.map(b => `<li>${esc(b)}</li>`).join("")}</ul></details>`;
  $(".pr-lagi").after($("#catatan"));
  panelKiri();
  const kini = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  Object.assign($("#kTgl"), {max: kini, min: new Date(Date.now() + 7 * 36e5 - 7 * 864e5).toISOString().slice(0, 10), value: kini});
  try { $("#kRegu").value = localStorage.getItem("prediksi.regu") || ""; } catch {}
  gambarBesok();
  const tab = location.hash.slice(1).split("/")[0];
  if (["rapor", "dampak", "konfirmasi", "laporan", "tangga"].includes(tab)) pilihTab(tab);
}

let tunda;
$("#cari").addEventListener("input", () => { clearTimeout(tunda); tunda = setTimeout(() => { PR.n = 60; gambarBesok(); }, 150); });
for (const id of ["#prov", "#hari", "#urut"]) $(id).addEventListener("change", () => { PR.n = 60; gambarBesok(); });
$("#lagi").addEventListener("click", () => { PR.n += 60; gambarBesok(); });
$("#tabs").addEventListener("click", e => {
  const b = e.target.closest("button[data-tab]");
  if (!b) return;
  pilihTab(b.dataset.tab);
  $("header.top").classList.remove("buka");
  $("#burger").setAttribute("aria-expanded", "false");
});
$("#burger").addEventListener("click", () => $("#burger").setAttribute("aria-expanded", $("header.top").classList.toggle("buka")));
$("#fk").addEventListener("submit", kirim);
$("#dKabIn").addEventListener("change", gambarDampak);
$("#kKab").addEventListener("change", laluKab);
$("#kTgl").addEventListener("change", laluKab);
mulai();

document.addEventListener("change", e => {
  if (e.target.id !== "kalKab") return;
  (window.nanti || (f => f()))(() => {
    const s = document.createElement("div");
    s.innerHTML = kalenderRapor();
    $("#kalIsi").innerHTML = s.querySelector("#kalIsi").innerHTML;
  });
});
