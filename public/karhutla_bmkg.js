/* karhutla_bmkg.js — kartu Insight "BMKG hari ini" dari banjir/data/karhutla_bmkg.json (factsheet karhutla BMKG, teks + daftar produk gambar).
   Status resmi BMKG, terpisah dari deteksi kita: titik panas BMKG (kepercayaan tinggi) TIDAK digabung dengan FIRMS sistem kita.
   Gambar produk (FWI/FFMC/DMC/DC/ISI/BUI, asap, hotspot) dimuat langsung dari BMKG, lazy; yang gagal dimuat dibuang dari pilihan.
   Butuh: Insight, esc, fmt, namaProv. Dimuat sesudah insight_sebaran.js. */
(() => {
if (typeof Insight === "undefined" || !Array.isArray(Insight.EX)) return;
const STD = h => h.replace('<article class="ex">', '<article class="ex ex-std">');
const BK = {d: null, janji: null, gagal: new Set()};
const NAMA = {11: "Aceh", 12: "Sumatera Utara", 13: "Sumatera Barat", 14: "Riau", 15: "Jambi", 16: "Sumatera Selatan", 17: "Bengkulu", 18: "Lampung", 19: "Kepulauan Bangka Belitung", 21: "Kepulauan Riau",
  31: "DKI Jakarta", 32: "Jawa Barat", 33: "Jawa Tengah", 34: "DI Yogyakarta", 35: "Jawa Timur", 36: "Banten", 51: "Bali", 52: "Nusa Tenggara Barat", 53: "Nusa Tenggara Timur",
  61: "Kalimantan Barat", 62: "Kalimantan Tengah", 63: "Kalimantan Selatan", 64: "Kalimantan Timur", 65: "Kalimantan Utara", 71: "Sulawesi Utara", 72: "Sulawesi Tengah", 73: "Sulawesi Selatan",
  74: "Sulawesi Tenggara", 75: "Gorontalo", 76: "Sulawesi Barat", 81: "Maluku", 82: "Maluku Utara", 91: "Papua Barat", 92: "Papua Barat Daya", 93: "Papua Selatan", 94: "Papua Tengah", 95: "Papua Pegunungan", 96: "Papua"};
const nm = k => NAMA[k] || (typeof namaProv === "function" ? namaProv(k) : k);
const dftr = a => { const n = (a || []).map(k => esc(nm(k))); return n.length > 1 ? n.slice(0, -1).join(", ") + " dan " + n.at(-1) : n[0] || "–"; };
const tgl = (s, o = {day: "numeric", month: "long", year: "numeric"}) => s ? new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {...o, timeZone: "UTC"}) : "–";
const tambah = (s, n) => new Date(Date.parse(s + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
BK.muat = () => BK.janji ||= fetch("banjir/data/karhutla_bmkg.json").then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
  BK.d = d || false; document.querySelectorAll('[data-ex="bmkg"]').forEach(b => { b.innerHTML = Insight.gambar("bmkg"); }); return d; });

const IK = {
  fwi: '<path d="M12 3c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1-1-2-1-3 2 1 4 3 4 6a6 6 0 0 1-12 0c0-5 5-6 6-11z"/>', ffmc: '<path d="M5 19c0-8 6-13 14-14 0 8-5 14-13 14M5 19l7-7"/>',
  dmc: '<path d="M12 4 3 9l9 5 9-5zM3 14l9 5 9-5"/>', dc: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>', isi: '<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h8"/>',
  bui: '<path d="M4 8h16M4 12h16M4 16h16"/>', asap: '<path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 10 1 3.5 3.5 0 0 1 0 7z"/>', hotspot: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  hari: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'};
const ik = k => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK[k]}</svg>`;
const PROD = [["fwi", "FWI", "Fire Weather Index"], ["ffmc", "FFMC", "Fine Fuel Moisture Code"], ["dmc", "DMC", "Duff Moisture Code"], ["dc", "DC", "Drought Code"], ["isi", "ISI", "Initial Spread Index"],
  ["bui", "BUI", "Buildup Index"], ["asap", "Asap", "Sebaran asap"], ["hotspot", "Hotspot", "Peta titik panas"]];
const HARI = k => k === "obs" ? "Pengamatan" : k === "00" ? "Hari ini" : "H+" + +k;

/* semua gambar yang daftar BMKG-nya berstatus 200 dan belum gagal dimuat: {fwi: {obs: url, "00": url...}, asap: {"-": url}} */
function gambar(d) {
  const o = {}, P = d.produk || {}, ok = x => x && x.status === 200 && /^https:\/\/(dataweb|inderaja)\.bmkg\.go\.id\//.test(x.url) && !BK.gagal.has(x.url);
  for (const x of P.spartan_fwi_dan_komponen || []) { const m = /_indonesia_([a-z]+)_(obs|\d\d)\.png$/.exec(x.url); if (m && ok(x)) (o[m[1]] ||= {})[m[2]] = x; }
  for (const k of ["asap", "hotspot"]) if (ok(P[k])) o[k] = {"-": P[k]};
  return o;
}
const baris = (lb, isi) => `<div class="bk-r"><b>${lb}</b><span>${isi}</span></div>`;

Insight.exBmkg = function () {
  if (BK.d === null) { BK.muat(); return STD(this.ex("Memuat pengumuman BMKG…", "", "", `<div class="kosong"><div class="spin"></div></div>`, "")); }
  const d = BK.d; if (!d || !d.ringkas) return "";
  const kini = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10), lewat = d.berlaku_sampai < kini;
  const as = d.asap || {}, tp = d.titik_panas || {}, fw = d.potensi_fwi?.per_pulau || {}, pk = d.rekomendasi?.perhatian_khusus?.kode_prov || [], omc = d.omc?.daftar || [];
  const nBerasap = (as.provinsi_berasap?.kode_prov || []).length;
  const judul = `BMKG ${tgl(d.tanggal, {day: "numeric", month: "long"})}: ${this.hl(fmt(nBerasap) + " provinsi")} berasap dan ${this.hl(fmt(pk.length) + " provinsi")} berstatus perhatian khusus`;
  const arah = as.arah_sebaran_asap?.arah || [], lb = as.lintas_batas;
  const pulau = Object.entries(tp.per_pulau || {}).filter(([, v]) => v.titik > 0).sort((a, b) => b[1].titik - a[1].titik).map(([n, v]) => `${esc(n)} ${fmt(v.titik)}`).join(", ");
  const isi = `<div class="bk">`
    + baris("Masa berlaku", `${tgl(d.berlaku_dari)} sampai ${tgl(d.berlaku_sampai)}${lewat ? ", pengumuman ini sudah lewat masa berlakunya" : ""}`)
    + baris("Provinsi berasap", dftr(as.provinsi_berasap?.kode_prov))
    + baris("Arah asap", arah.length ? `menyebar ke ${esc(arah.join(" dan ").toLowerCase())}` : "–")
    + baris("Asap lintas batas", lb?.ada ? `ada, dari ${esc(lb.dari)} ke ${esc(lb.ke)}` : "tidak terpantau oleh BMKG")
    + Object.entries(fw).map(([n, v]) => baris("Potensi FWI " + esc(n), `${esc(v.rentang?.dari || "")} sampai ${esc(v.rentang?.sampai || "")}; risiko tertinggi ${dftr(v.risiko_tertinggi?.kode_prov)}`)).join("")
    + baris("Perhatian khusus", dftr(pk))
    + baris("OMC berjalan", omc.length ? omc.map(o => `${esc(o.provinsi)} (${tgl(o.dari, {day: "numeric", month: "short"})} sampai ${tgl(o.sampai, {day: "numeric", month: "short"})})`).join(", ") : "tidak ada")
    + baris("Titik panas BMKG", `${this.hl(fmt(tp.total_nasional) + " titik")}, kepercayaan tinggi, BMKG, ${tgl(tp.tanggal)} (${esc(tp.dari || "")} sampai ${esc(tp.sampai || "")} ${esc(tp.zona || "")})${pulau ? `; ${pulau}` : ""}. Angka ini terpisah dari deteksi FIRMS sistem kita`)
    + `</div>`;
  /* produk gambar */
  const G = gambar(d), prods = PROD.filter(([k]) => G[k]);
  let gm = "", ctl = "";
  if (prods.length) {
    const st = this.st, pk1 = G[st.bkProd] ? st.bkProd : prods[0][0], hr = Object.keys(G[pk1]).sort((a, b) => a === "obs" ? -1 : b === "obs" ? 1 : a < b ? -1 : 1), h1 = G[pk1][st.bkHari] ? st.bkHari : hr.includes("00") ? "00" : hr[0], x = G[pk1][h1];
    const bar = (key, v, arr) => `<div class="bk-pilih" role="group" style="--n:${arr.length}">${arr.map(([k, n, ikon, tt]) => `<button data-set="${key}" data-v="${k}" aria-pressed="${k === v}"${tt ? ` title="${esc(tt)}"` : ""}>${ik(ikon)}<span>${esc(n)}</span></button>`).join("")}</div>`;
    const lm = x.last_modified ? new Date(x.last_modified).toLocaleString("id-ID", {day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"}) + " WIB" : "";
    const nmP = PROD.find(p => p[0] === pk1), tglGb = h1 === "obs" ? "pengamatan" : h1 === "-" ? "" : tgl(tambah(d.tanggal, +h1));
    const mem = ["asap", "hotspot"].includes(pk1) ? "" : bar("bkHari", h1, hr.map(k => [k, HARI(k), "hari"]));
    gm = bar("bkProd", pk1, prods.map(([k, n, t]) => [k, n, k, t])) + mem
      + `<figure class="bk-gb"><img src="${esc(x.url)}" alt="${esc(nmP[2])} BMKG${tglGb ? ", " + esc(tglGb) : ""}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-bk="${esc(x.url)}"><figcaption>${esc(nmP[2])}${tglGb ? ", " + esc(tglGb) : ""}. Sumber: BMKG${lm ? `, diperbarui ${esc(lm)}` : ""}</figcaption></figure>`;
  }
  return STD(this.ex(judul, "", "", isi + gm, ""));
};
Insight.LABEL.bmkg = "BMKG hari ini";
Object.assign(Insight.st, {bkProd: "fwi", bkHari: "00"});
Insight.EX.splice(Math.max(0, Insight.EX.indexOf("cuaca") + 1), 0, "bmkg");

/* gambar gagal dimuat = opsinya disembunyikan (error tidak menggelembung: tangkap di fase capture) */
document.addEventListener("error", e => { const u = e.target?.dataset?.bk; if (!u) return; BK.gagal.add(u);
  const box = e.target.closest('[data-ex="bmkg"]'); if (box) requestAnimationFrame(() => { box.innerHTML = Insight.gambar("bmkg"); }); }, true);
})();
