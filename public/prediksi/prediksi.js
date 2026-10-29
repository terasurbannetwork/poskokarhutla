"use strict";
/* /prediksi: tab Besok (kartu per kab), Rapor (skor vs baseline), Konfirmasi (POST /api/prediksi/konfirmasi).
   Data: data/prediksi.json, skor.json, ujibalik.json, kalibrasi.json, lalu.json (scripts/prediksi/*.py).
   $, fmt, esc, rb dari ../inti/format.js. Angka: format id-ID, peluang dibulatkan ke 5% (tidak ada presisi palsu). */
const PR = {d: null, skor: null, uji: null, kal: null, lalu: null, n: 60, tab: "besok"};
const LEVEL = ["Normal", "Waspada", "Siaga", "Awas"];
const ISPU = ["Baik/Sedang", "Tidak sehat", "Sangat tidak sehat", "Berbahaya"];
const KODE_NAMA = {HJN: "Hujan", API: "Titik panas", BNJ: "Banjir", LSR: "Longsor", ASP: "Asap PM2,5", ROB: "Rob"};

const persen = p => p == null ? "–" : p < 0.05 ? "<5%" : p > 0.95 ? ">95%" : `${Math.round(p * 20) * 5}%`;
const mm = v => v == null ? "–" : v < 1 ? "<1 mm" : `±${fmt(Math.round(v))} mm`;
const jam = h => h == null ? "–" : `±${String(h).padStart(2, "0")}.00`;
const tgl = t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta"});
const angka3 = v => v == null ? "–" : fmt(Math.round(v * 1000) / 1000);
const kol = (kode, r, c) => r ? r[PR.d.kode[kode].kol.indexOf(c)] : null;

function pil(v) {
  /* v = [vonis, n, bss_klim, terkalibrasi] dari prediksi.json kode.vonis */
  if (!v) return "";
  const kls = v[0] === "mengalahkan baseline" ? "ok" : v[0] === "belum teruji" ? "abu" : "buruk";
  const t = v[0] === "belum teruji" ? `belum teruji${v[1] ? ` (n ${fmt(v[1])})` : ""}` : `${v[0]}, n ${fmt(v[1])}`;
  return `<span class="pr-pil ${kls}" title="Rapor ketepatan prakiraan ini">${esc(t)}${v[3] ? " · terkalibrasi" : ""}</span>`;
}

const sumber = kode => {
  const k = PR.d.kode[kode];
  return k ? `<span class="pr-src" title="Dibekukan ${esc(jamWIB(k.dibuat))}">Sumber: ${esc(k.sumber)}; terbit ${esc(tgl(k.terbit))}</span>` : "";
};

function kartu(k, n) {
  const v = (kode, c) => PR.d.kode[kode]?.vonis[`${c}|${n}`];
  const baris = [];
  const h = k.HJN?.[n - 1];
  if (h) {
    const [p1, p20, p50, tot, mulai, lama, , m] = ["p1", "p20", "p50", "tot", "mulai", "lama", "puncak", "m"].map(c => kol("HJN", h, c));
    const kapan = mulai == null ? "tidak ada jam hujan ≥0,5 mm" : `mulai ${jam(mulai)} WIB, lama ±${fmt(lama)} jam, total ${mm(tot)}`;
    baris.push(`<div class="pr-b"><b>Hujan</b> ${kapan}<br>peluang ≥1 mm ${persen(p1)} · ≥20 mm ${persen(p20)} · ≥50 mm ${persen(p50)}
      ${m ? "" : '<span class="pr-pil abu" title="Tanpa ansambel: skor kasar dari jumlah hujan deterministik">skor kasar</span>'} ${pil(v("HJN", "p20"))}</div>`);
  }
  const a = k.API?.[n - 1];
  if (a) baris.push(`<div class="pr-b"><b>Titik panas</b> peluang ≥1 titik ${persen(kol("API", a, "p"))} (${fmt(kol("API", a, "d"))} dari 3 hari terakhir bertitik panas) ${pil(v("API", "p"))}</div>`);
  for (const kd of ["BNJ", "LSR"]) {
    const r = k[kd]?.[n - 1];
    if (r) baris.push(`<div class="pr-b"><b>${KODE_NAMA[kd]}</b> ${LEVEL[kol(kd, r, "lv")]}${kol(kd, r, "ps") != null ? `, peluang Siaga ${persen(kol(kd, r, "ps"))}` : ""} ${pil(v(kd, "ps"))}</div>`);
  }
  const s = k.ASP?.[n - 1];
  if (s) baris.push(`<div class="pr-b"><b>Asap</b> PM2,5 ±${fmt(kol("ASP", s, "pm"))} µg/m³, ${ISPU[kol("ASP", s, "kat")]} <span class="pr-pil abu">belum teruji</span></div>`);
  const r = k.ROB?.[n - 1];
  if (r) baris.push(`<div class="pr-b"><b>Rob</b> ${kol("ROB", r, "lewat") ? "muka laut melewati p95" : "di bawah p95"} <span class="pr-pil abu">belum teruji</span></div>`);
  return `<article class="card pr-k" role="listitem"><h3>${esc(k.nama)}</h3><p class="pr-kecil">${esc(k.pn)} · ${rb(k.jiwa)} jiwa</p>${baris.join("") || '<p class="pr-kecil">Tidak ada prakiraan untuk hari ini.</p>'}</article>`;
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
      return `<li><b>${esc(nama[x.kab]?.nama)}</b>: ${rb(d.jiwa)} jiwa terpapar${d.sekolah != null ? `, ${fmt(d.sekolah)} sekolah, ${fmt(d.faskes)} faskes` : ""}${d.murid ? `, ${rb(d.murid)} murid` : ""}${kb ? `; perkiraan mengungsi ${rb(kb.mengungsi)}: air ${rb(kb.air_l)} L/hari, hunian ${rb(kb.hunian_m2)} m², ${rb(kb.jamban)} jamban, pangan ${rb(kb.kkal)} kkal/hari` : ""}</li>`;
    }).join("");
    return `<details class="card pad pr-w"><summary><b>${esc(a.maka)}</b>: ${fmt(xs.length)} kab/kota, ${rb(jiwa)} jiwa terpapar${ungsi ? `, perkiraan mengungsi ${rb(ungsi)}` : ""} <span class="pr-pil abu">perkiraan, belum diuji balik</span></summary>
      <p class="pr-kecil">Jika: ${syarat}. Paparan: ${esc(a.paparan?.sumber || "")}.${a.catatan ? " " + esc(a.catatan) : ""} Kebutuhan: ${esc(PR.d.sphere.sumber)}.</p><ul>${rinci}</ul>${xs.length > 40 ? `<p class="pr-kecil">dan ${fmt(xs.length - 40)} lainnya; persempit dengan filter.</p>` : ""}</details>`;
  }).join("");
}

function tabelSkor(kode, g) {
  if (g.status !== "dinilai") return `<p class="pr-kecil">${esc(KODE_NAMA[kode])}: menunggu (${fmt(g.prakiraan || 0)} prakiraan tercatat). ${esc(g.alasan || "")}</p>`;
  const rows = g.grup.map(x => `<tr><td>${x.ambang}</td><td class="n">+${x.tenggang}</td><td>${esc(x.tahap)}</td><td class="n">${fmt(x.n)}</td>
    <td class="n">${angka3(x.brier_banding)}</td><td class="n">${angka3(x.brier_persistensi)}</td><td class="n">${angka3(x.brier_klimatologi)}</td>
    <td class="n">${x.pod == null ? "–" : persen(x.pod)}</td><td class="n">${x.far == null ? "–" : persen(x.far)}</td>
    <td class="n">${x.mae_mulai == null ? "–" : `±${fmt(Math.round(x.mae_mulai))} jam`}</td><td class="n">${x.mae_lama == null ? "–" : `±${fmt(Math.round(x.mae_lama))} jam`}</td>
    <td>${pil([x.vonis, x.n_banding])}</td></tr>`).join("");
  return `<h3>${esc(KODE_NAMA[kode])}</h3><div class="tw"><table><thead><tr><th>Ambang</th><th class="n">Tenggang</th><th>Tahap</th><th class="n">n</th>
    <th class="n">Brier model</th><th class="n">Brier persistensi</th><th class="n">Brier klimatologi</th><th class="n">POD</th><th class="n">FAR</th>
    <th class="n">Galat jam mulai</th><th class="n">Galat lama</th><th>Vonis</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function gambarRapor() {
  const s = PR.skor, u = PR.uji, k = PR.kal;
  let h = `<div class="head"><div><h2>Rapor ketepatan</h2><p class="pr-kecil">Brier lebih kecil = lebih baik. Prakiraan harus lebih baik dari persistensi (besok = hari terakhir lengkap) dan klimatologi (frekuensi bulan yang sama). Vonis butuh ≥30 pasangan.</p></div></div>`;
  h += `<section class="card pad pr-sek"><h2>Prospektif</h2><p class="pr-kecil">${esc(s?.catatan || "skor.json belum ada")}</p>${s ? Object.entries(s.kode).map(([kd, g]) => tabelSkor(kd, g)).join("") : ""}</section>`;
  h += `<section class="card pad pr-sek"><h2>Uji balik retrospektif</h2>${u ? `<p class="pr-kecil">${esc(u.catatan)} Periode ${esc(u.periode.join(" s.d. "))}, ${fmt(u.n_terbit)} hari terbit.</p>${tabelSkor("HJN", u.kode.HJN)}` : '<p class="pr-kecil">Belum dijalankan.</p>'}</section>`;
  const kp = (k?.peluang || []).concat(k?.jumlah || []);
  h += `<section class="card pad pr-sek"><h2>Kalibrasi otomatis</h2><p class="pr-kecil">${esc(k?.aturan?.metode || "kalibrasi.json belum ada")}. Dipakai ${fmt(k?.ringkas?.dipakai || 0)}, ditolak ${fmt(k?.ringkas?.ditolak || 0)}, menunggu ${fmt(k?.ringkas?.menunggu || 0)}.</p>
    ${kp.length ? `<div class="tw"><table><thead><tr><th>Grup</th><th>Status</th><th class="n">n fit / uji</th><th>Alasan</th></tr></thead><tbody>${kp.map(x =>
      `<tr><td>${esc(x.kode || x.besaran)} ${esc(x.ambang ?? x.prov)} +${x.tenggang}</td><td>${esc(x.status)}</td><td class="n">${fmt(x.n_fit)} / ${fmt(x.n_uji)}</td><td>${esc(x.alasan)}</td></tr>`).join("")}</tbody></table></div>` : ""}</section>`;
  $("#rapor").innerHTML = h;
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

function pilihTab(t) {
  PR.tab = t;
  document.querySelectorAll("#tabs button").forEach(b => b.dataset.tab === t ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  document.querySelectorAll("main .page").forEach(s => s.classList.toggle("on", s.id === "p-" + t));
  if (t === "rapor" && !$("#rapor table, #rapor section")) gambarRapor();
  history.replaceState(null, "", t === "besok" ? "./" : "#" + t);
}

async function ambil(f) { try { const r = await fetch("data/" + f, {cache: "no-cache"}); return r.ok ? r.json() : null; } catch { return null; } }

async function mulai() {
  [PR.d, PR.skor, PR.uji, PR.kal, PR.lalu] = await Promise.all(["prediksi.json", "skor.json", "ujibalik.json", "kalibrasi.json", "lalu.json"].map(ambil));
  if (!PR.d) { $("#kartu").innerHTML = '<p class="kosong">Data prediksi belum tersedia.</p>'; $("#upd").textContent = "Data belum ada"; return; }
  $("#upd").textContent = "Diperbarui " + jamWIB(PR.d.dibuat);
  const hj = PR.d.kode.HJN || Object.values(PR.d.kode)[0];
  $("#hari").innerHTML = hj.hari.map((h, i) => `<option value="${i + 1}">${i ? `+${i + 1} hari` : "Besok"}: ${esc(tgl(h))}</option>`).join("");
  const prov = [...new Map(PR.d.kab.map(k => [k.prov, k.pn])).entries()].sort((a, b) => a[1].localeCompare(b[1], "id"));
  $("#prov").insertAdjacentHTML("beforeend", prov.map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join(""));
  $("#dKab").innerHTML = PR.d.kab.map(k => `<option value="${esc(k.nama)}">${esc(k.pn)}</option>`).join("");
  $("#catatan").innerHTML = `<p class="pr-kecil">${Object.keys(PR.d.kode).map(sumber).join("<br>")}</p><details class="pr-kecil"><summary>Batasan</summary><ul>${PR.d.batasan.map(b => `<li>${esc(b)}</li>`).join("")}</ul></details>`;
  const kini = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
  Object.assign($("#kTgl"), {max: kini, min: new Date(Date.now() + 7 * 36e5 - 7 * 864e5).toISOString().slice(0, 10), value: kini});
  try { $("#kRegu").value = localStorage.getItem("prediksi.regu") || ""; } catch {}
  gambarBesok();
  const tab = location.hash.slice(1);
  if (["rapor", "konfirmasi"].includes(tab)) pilihTab(tab);
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
$("#kKab").addEventListener("change", laluKab);
$("#kTgl").addEventListener("change", laluKab);
mulai();
