/* Tab Penyaringan: semua konsesi dinilai di peramban dengan asumsi yang bisa diubah (skorSaring), dipotong per
   ~8 ms supaya klik tetap ringan; klik baris/poligon = kartu pra-FS; "Jadikan proyek" menyimpan geometri + stat. */
import * as AK from "./akuntansi.js";
import {S, h, ganti, ang, pct, judul, tombol, pil, kosong, tabel, segmen, pilihan, hias, nanti, tunda, jeda, kabar, kirim, api, pesanGalat, petaBaru, ukurUlang, batas, NAVY, T, T_HA, ribuan} from "./alat.js";
import {JENIS_KONSESI, label, prov, statDari, blokStat, penaksir, tabelKredit, ringkasKeuangan, proyeksi, formAsumsi, kelasApi, sumberGfw} from "./ranah.js";
import {muatProyek} from "./proyek.js";

const F = {jenis: "", prov: "", luas: AK.AMBANG.luas_min_ha, hutan: AK.AMBANG.hutan_sisa_min * 100, verra: "semua", urut: "npv", hal: 0, cari: ""};
const PER = 25;
const URUT = {npv: ["NPV", s => s.npv_usd], potensi: ["Potensi estimasi kredit", s => s.potensi_kredit_th], stok: ["Stok karbon", s => s.stok_tCO2_ha], laju: ["Laju kehilangan", s => s.laju]};
let gen = 0, P = null, peta = null, petaP = null, kotor = false;   // kotor: warna peta tertunda karena panel tersembunyi

export async function muatSaring() {
  if (S.saring || S.saringGalat) return;
  try { S.saring = await api("/api/karbon/saring"); } catch (e) { S.saringGalat = e; }
}
const baris = () => S.saring?.baris || [];

/* nilai semua baris; generasi baru membatalkan putaran lama */
async function hitungSemua() {
  const my = ++gen, B = baris(), st = P?.querySelector("#sgSt");
  let t0 = performance.now();
  for (let i = 0; i < B.length; i++) {
    try { S.skor.set(B[i].id, AK.skorSaring(statDari(B[i]), S.asumsi, S.frl)); } catch (e) { S.skor.set(B[i].id, {galat: e.message}); }
    if (performance.now() - t0 > 8) {
      if (st) st.textContent = `Menghitung ${ang(i + 1)} dari ${ang(B.length)} konsesi…`;
      await jeda(); if (my !== gen) return; t0 = performance.now();
    }
  }
  if (my !== gen) return;
  if (st) st.textContent = `${ang(B.length)} konsesi dinilai dengan asumsi saat ini.`;
  nanti(gambarIsi);
}

function tersaring() {
  const q = F.cari.trim().toLowerCase(), [, f] = URUT[F.urut];
  return baris().filter(r => {
    const sk = S.skor.get(r.id), st = statDari(r), luas = +st.luas_ha || 0;
    if (F.jenis && r.jenis !== F.jenis) return false;
    if (F.prov && r.prov !== F.prov) return false;
    if (luas < (+F.luas || 0)) return false;
    if (luas && (+st.hutan2000_ha || 0) / luas * 100 < (+F.hutan || 0)) return false;
    if (F.verra !== "semua" && sk && !sk.galat && String(sk.jalur_verra) !== F.verra) return false;
    if (q && !`${r.nama} ${r.pemegang ?? ""} ${r.kab ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => { const x = S.skor.get(a.id), y = S.skor.get(b.id); return (y && !y.galat ? f(y) ?? -Infinity : -Infinity) - (x && !x.galat ? f(x) ?? -Infinity : -Infinity); });
}

const SATU = "Konsesi diurutkan menurut estimasi nilai karbon pada asumsi yang sedang dipakai.";
export async function render(panel) {
  /* kembali ke tab: UI dan peta sudah ada, jangan dibangun ulang; peta hanya perlu ukuran baru sesudah panel tampil (INP) */
  if (P === panel && panel.querySelector("#sgIsi")) { nanti(() => { ukurUlang(peta); if (kotor) warnaiPeta(tersaring()); }); return; }
  P = panel;
  ganti(panel, judul("Penyaringan konsesi", SATU), h("p", {class: "kb-st", id: "sgSt", role: "status"}, "Memuat data penyaringan…"));
  await muatSaring();
  if (S.saringGalat) {
    const e = S.saringGalat;
    ganti(panel, judul("Penyaringan konsesi"), kosong(e.status === 404 ? "Data penyaringan belum diunggah." : pesanGalat(e, "memuat data penyaringan")));
    return;
  }
  const B = baris(), provs = [...new Set(B.map(r => r.prov).filter(Boolean))].sort();
  const set = (k, v) => { F[k] = v; F.hal = 0; nanti(gambarIsi); };
  const inp = (k, a) => h("input", {type: "number", value: F[k], min: 0, step: "any", inputmode: "numeric", oninput: tunda(e => set(k, e.target.value), 250), ...a});
  ganti(panel,
    judul("Penyaringan konsesi", SATU),
    h("details", {class: "lipat kb-lipat"}, h("summary", null, "Asumsi penyaringan"),
      h("div", {class: "isi"}, formAsumsi(S.asumsi, null, a => { S.asumsi = a; hitungSemua(); }))),
    h("div", {class: "kb-saring"},
      h("label", {class: "kb-f"}, h("span", null, "Jenis izin"), pilihan([["", "Semua jenis"], ...JENIS_KONSESI], F.jenis, {"aria-label": "Jenis izin", onchange: e => set("jenis", e.target.value)})),
      h("label", {class: "kb-f"}, h("span", null, "Provinsi"), pilihan([["", "Semua provinsi"], ...provs.map(p => [p, prov(p)])], F.prov, {"aria-label": "Provinsi", onchange: e => set("prov", e.target.value)})),
      h("label", {class: "kb-f"}, h("span", null, "Luas minimal (ha)"), inp("luas")),
      h("label", {class: "kb-f"}, h("span", null, "Hutan 2000 minimal (%)"), inp("hutan", {max: 100})),
      h("label", {class: "kb-f"}, h("span", null, "Cari nama"), h("input", {type: "search", value: F.cari, placeholder: "Nama, pemegang, kabupaten", oninput: tunda(e => set("cari", e.target.value), 200)})),
      h("div", {class: "kb-f"}, h("span", null, "Jalur Verra"), segmen([["semua", "Semua"], ["true", "Ya"], ["false", "Tidak"]], F.verra, v => set("verra", v), "Jalur Verra"))),
    h("div", {class: "kb-f kb-urut"}, h("span", null, "Urutkan menurut"), segmen(Object.entries(URUT).map(([k, [t]]) => [k, t]), F.urut, v => set("urut", v), "Urutkan")),
    h("p", {class: "kb-st", id: "sgSt", role: "status"}),
    h("div", {class: "kb-peta", id: "sgPeta"}, h("div", {class: "kb-peta-leg", id: "sgLeg"})),
    h("div", {id: "sgIsi"}));
  hias(panel);
  if (S.skor.size !== B.length) hitungSemua(); else { panel.querySelector("#sgSt").textContent = `${ang(B.length)} konsesi dinilai dengan asumsi saat ini.`; gambarIsi(); }
  nanti(pasangPeta);
}

function gambarIsi() {
  const el = P?.querySelector("#sgIsi"); if (!el) return;
  const L = tersaring(), hal = Math.min(F.hal, Math.max(0, Math.ceil(L.length / PER) - 1)), potong = L.slice(hal * PER, hal * PER + PER);
  const sk = r => S.skor.get(r.id) || {}, ok = r => !sk(r).galat && S.skor.has(r.id), st = statDari;
  const nav = h("div", {class: "kb-pgn"}); nav.innerHTML = paginasi(hal, L.length, PER, "konsesi");   // paginasi() (inti/tabel.js) hanya berisi angka
  nav.addEventListener("click", e => { const b = e.target.closest("button[data-h]"); if (!b) return; F.hal = +b.dataset.h; nanti(gambarIsi); });
  ganti(el, L.length ? tabel([
    {t: "Konsesi", kelas: "kb-nama", f: r => r.nama},
    {t: "Jenis", f: r => label(JENIS_KONSESI, r.jenis)},
    {t: "Provinsi", kelas: "kb-o", f: r => prov(r.prov)},
    {t: "Luas (ha)", n: 1, f: r => ang(st(r).luas_ha)},
    {t: "Hutan 2000", n: 1, f: r => pct(st(r).luas_ha ? st(r).hutan2000_ha / st(r).luas_ha : null, 0)},
    {t: "Gambut", n: 1, kelas: "kb-o", f: r => ok(r) ? pct(sk(r).porsi_gambut, 0) : "–"},
    {t: `Stok (${T_HA})`, n: 1, kelas: "kb-o", f: r => ok(r) ? ang(sk(r).stok_tCO2_ha) : "–"},
    {t: "Laju (%/th)", n: 1, f: r => ok(r) ? pct(sk(r).laju, 1) : "–"},
    {t: `Estimasi kredit (${T}/th)`, n: 1, f: r => ok(r) ? ang(sk(r).potensi_kredit_th) : "–"},
    {t: "NPV (USD)", n: 1, f: r => ok(r) ? ribuan(sk(r).npv_usd) : "–"},
    {t: `NPV masa baseline (USD)`, n: 1, kelas: "kb-o", f: r => ok(r) ? ribuan(sk(r).npv_masa_baseline_usd) : "–"},
    {t: "IRR", n: 1, kelas: "kb-o", f: r => ok(r) ? (sk(r).irr == null ? "–" : pct(sk(r).irr)) : "–"},
    {t: "Jalur Verra", f: r => ok(r) ? pil(sk(r).jalur_verra ? "Ya" : "Tidak", sk(r).jalur_verra ? "ya" : "tidak") : "–"},
    {t: "Penilaian", f: r => !S.skor.has(r.id) ? "…" : sk(r).galat ? pil("Galat", "galat") : pil(sk(r).layak ? "Layak" : "Belum layak", sk(r).layak ? "layak" : "belum")},
  ], potong, {klik: buka}) : kosong("Tidak ada konsesi yang cocok dengan saringan."), nav,
    h("p", {class: "kb-cat"}, `Konsesi: ${S.saring.sumber_konsesi ?? "–"}. ${S.saring.kaki ||= sumberGfw(baris())}`));
  warnaiPeta(L);
}

/* ---------- peta ---------- */
async function pasangPeta() {
  const el = P?.querySelector("#sgPeta"); if (!el || petaP) { if (peta && el && !el.contains(peta.getContainer())) { petaP = null; peta.remove(); peta = null; return pasangPeta(); } return; }
  petaP = (async () => {
    S.geom ||= await api("/api/karbon/saring_geom").catch(() => null);
    if (!S.geom?.features?.length) { el.hidden = true; return; }
    const kanvas = h("div", {class: "kb-peta-k"}); el.prepend(kanvas);
    peta = await petaBaru(kanvas);
    peta.addSource("k", {type: "geojson", data: S.geom, promoteId: "id"});
    peta.addLayer({id: "k-isi", type: "fill", source: "k", paint: {"fill-color": ["match", ["coalesce", ["feature-state", "k"], -1], 0, NAVY[0], 1, NAVY[1], 2, NAVY[2], 3, NAVY[3], 4, NAVY[4], "#9aa3ad"],
      "fill-opacity": ["case", ["boolean", ["feature-state", "tampil"], true], .75, 0]}});
    peta.addLayer({id: "k-garis", type: "line", source: "k", paint: {"line-color": "#0b2545", "line-width": .6, "line-opacity": ["case", ["boolean", ["feature-state", "tampil"], true], .8, 0]}});
    peta.on("click", "k-isi", e => { const id = e.features[0]?.id, r = baris().find(x => x.id === id); if (r) buka(r); });
    peta.on("mouseenter", "k-isi", () => { peta.getCanvas().style.cursor = "pointer"; });
    peta.on("mouseleave", "k-isi", () => { peta.getCanvas().style.cursor = ""; });
    const b = batas(S.geom); if (b) peta.fitBounds(b, {padding: 30, duration: 0, maxZoom: 9});
    warnaiPeta(tersaring());
  })().catch(e => { el.hidden = true; console.warn(e); });
}
function warnaiPeta(L) {
  if (!peta?.getSource("k")) return;
  if (P?.hidden) { kotor = true; return; }   // peta di panel tersembunyi diwarnai nanti, sesudah panel tampil dan tercat
  kotor = false;
  const [nm, f] = URUT[F.urut], nilai = L.map(r => S.skor.get(r.id)).filter(x => x && !x.galat).map(f).filter(Number.isFinite).sort((a, b) => a - b);
  const q = [.2, .4, .6, .8].map(p => nilai[Math.floor(p * (nilai.length - 1))] ?? 0), kelas = v => q.filter(x => v > x).length, tampil = new Set(L.map(r => r.id));
  for (const g of S.geom.features) {
    const id = g.properties?.id, sk = S.skor.get(id), v = sk && !sk.galat ? f(sk) : null;
    peta.setFeatureState({source: "k", id}, {tampil: tampil.has(id), k: Number.isFinite(v) ? kelas(v) : -1});
  }
  const leg = P.querySelector("#sgLeg");
  if (leg) ganti(leg, h("b", null, nm), NAVY.map((c, i) => h("span", null, h("i", {style: `background:${c}`}), i === 0 ? "rendah" : i === 4 ? "tinggi" : "")));
}

/* ---------- kartu pra-FS ---------- */
/* jejak tebang nyata (pendorong 4): indikasi IFM, bukan baseline IFM (itu butuh rencana tebang RKU) */
function ifm(st) {
  let b; try { b = AK.baseline(st, S.asumsi); } catch { return null; }
  if (b.hilang_tebang_rerata_ha == null) return null;
  return h("p", {class: "kb-ifm"}, h("b", null, "Tebang teramati (indikasi IFM, perlu RKU): "),
    `${ang(b.hilang_tebang_rerata_ha, 1)} ha/th, ${ang(b.emisi_tebang_rerata_t)} ${T}/th rata-rata ${S.asumsi.periode_acuan.join("–")}. `,
    b.porsi_dapat_dicegah != null ? `Kehilangan yang bisa dicegah (pendorong baseline): ${pct(b.porsi_dapat_dicegah, 0)} dari seluruh kehilangan periode acuan.` : "");
}
/* Kerangka dialog (judul, tombol tutup) muncul seketika; isi berat (grafik, tabel kredit, dua penaksir) menyusul lewat nanti() */
const STAT_KUNCI = ["id", "versi", "diambil", "tahun_data_akhir", "luas_ha", "hutan2000_ha", "primer_ha", "gambut_ha", "gambut_hutan_ha", "stok_tC", "hilang", "hilang_api", "tutupan2017", "kawasan", "pendorong", "serapan_co2_t"];
function buka(r) {
  const d = h("dialog", {class: "dlg kb-dlg", "aria-label": "Kartu pra-studi kelayakan " + r.nama});
  const tutup = () => d.close(), db = h("div", {class: "db"}, h("p", {class: "kb-st"}, "Menyiapkan kartu…"));
  d.addEventListener("close", () => d.remove());
  d.append(
    h("div", {class: "dh"}, h("div", null, h("h3", null, r.nama), h("p", null, [r.pemegang, label(JENIS_KONSESI, r.jenis), prov(r.prov), r.kab].filter(Boolean).join(" · "))),
      h("button", {type: "button", "aria-label": "Tutup", onclick: tutup}, "×")), db);
  document.body.append(d); d.showModal();
  nanti(() => isiKartu(r, db, tutup, d));
}
function isiKartu(r, db, tutup, d) {
  const st = statDari(r), sk = S.skor.get(r.id) || {}, p = proyeksi(st, S.asumsi);
  const btnP = tombol("Jadikan proyek", async () => {
    btnP.disabled = true; btnP.textContent = "Menyimpan…";
    try {
      S.geom ||= await api("/api/karbon/saring_geom").catch(() => null);
      const geom = S.geom?.features?.find(f => f.properties?.id === r.id)?.geometry ?? null;
      const {id, nama, pemegang, prov: pv, kab} = r;
      /* statistik penyaringan ikut dikirim (hanya kunci §3.2): server tidak menarik ulang GFW */
      const stat = Object.fromEntries(STAT_KUNCI.filter(k => st[k] !== undefined).map(k => [k, st[k]]));
      const j = await kirim("/api/karbon/proyek", {nama, konsesi_id: id, pemegang, prov: pv || null, kab, tahap: "identifikasi", geom, asumsi: S.asumsi, ...(stat.hilang ? {stat} : {})});
      await muatProyek(); kabar(`Proyek "${nama}" dibuat.`); d.close(); location.hash = "#proyek/" + j.id;
    } catch (e) { btnP.disabled = false; btnP.textContent = "Jadikan proyek"; kabar(pesanGalat(e, "membuat proyek")); }
  });
  ganti(db,
    sk.galat ? h("p", {class: "kb-galat"}, sk.galat) : h("div", {class: "kb-pils"},
      pil(sk.layak ? "Layak disaring lanjut" : "Belum layak", sk.layak ? "layak" : "belum"), pil(sk.jalur_verra ? "Jalur Verra terbuka" : "Jalur nasional SPE-GRK", sk.jalur_verra ? "ya" : "tidak"),
      pil("Risiko api " + kelasApi(sk.risiko_api).toLowerCase(), "api" + sk.risiko_api)),
    sk.alasan?.length ? h("ul", {class: "kb-alasan"}, sk.alasan.map(a => h("li", null, "Belum layak: " + a))) : null,
    sk.peringatan?.length ? h("ul", {class: "kb-catatan"}, sk.peringatan.map(a => h("li", null, a))) : null,
    ifm(st),
    p.galat ? h("p", {class: "kb-galat"}, p.galat) : ringkasKeuangan(st, S.asumsi, p),
    blokStat(st, S.asumsi),
    h("h4", null, "Dua penaksir faktor emisi"), penaksir(st, S.asumsi),
    p.galat ? null : [h("h4", null, `Estimasi kredit per tahun (${T})`), tabelKredit(p)],
    h("p", {class: "kb-cat"}, "Estimasi satelit pra-studi kelayakan, belum diverifikasi pihak ketiga."),
    h("div", {class: "kb-aksi"}, btnP, tombol("Tutup", tutup, "ke2")));
}
