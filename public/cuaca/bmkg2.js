"use strict";
/* BMKG batch 2: cuaca bandara (cuaca_bandara_bmkg.json, scripts/cuaca/bandara_bmkg.py) dan sambaran petir (cuaca_petir.json, scripts/cuaca/petir.py).
   Teks BMKG tampil apa adanya, berlabel BMKG dan jam ambil; tanpa vonis layak terbang. Petir hanya jendela menit yang terambil, tidak pernah dijumlah jadi total harian.
   Berkas hilang = bagian dibuang (A18). Laci: Bmkg2.laciBandara(baris S.sar.bandara) dan Bmkg2.laciPetir(prov, kab). */
const Bmkg2 = {
  bd: null, pt: null, _p: null, _m: new Map(),
  muat() { return this._p ||= Promise.all([opsi("../banjir/data/cuaca_bandara_bmkg.json"), opsi("../banjir/data/cuaca_petir.json")]).then(([b, p]) => {
    this.bd = b?.bandara && Object.keys(b.bandara).length ? b : null; this.pt = p?.kabupaten?.length ? p : null; }); },
  jarak(a, b, c, d) { const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); },
  /* titik Sarana (OSM) ke bandara BMKG: kode ICAO di id bila ada, selain itu bandara BMKG terdekat dalam 3 km */
  cocok(s) { const B = this.bd?.bandara; if (!B) return null; if (this._m.has(s[0])) return this._m.get(s[0]);
    let m = B[String(s[0]).toUpperCase()] ? {b: B[String(s[0]).toUpperCase()], cara: "kode ICAO sama"} : null;
    if (!m) { let t = null, tj = 3; for (const b of Object.values(B)) { const j = this.jarak(s[2], s[3], b.lat, b.lon); if (j <= tj) { t = b; tj = j; } } if (t) m = {b: t, cara: `koordinat terdekat, jarak ${fmt(Math.round(tj * 10) / 10)} km`}; }
    this._m.set(s[0], m); return m; },
  umur() { const j = this.bd?.dibuat && (Date.now() - new Date(this.bd.dibuat)) / 36e5; return j > 3 ? ` (sudah ${fmt(Math.round(j))} jam lalu, bukan data terkini)` : ""; },
  jam: (w, z) => String(w).slice(11, 16).replace(":", ".") + " " + (z || "WIB"),
  /* vis_min = BMKG menulis 10 km atau lebih */
  vis: o => o?.vis_km == null ? "–" : fmt(o.vis_km) + (o.vis_min ? " km atau lebih" : " km"),
  /* bagian laci satu bandara: pengamatan BMKG sebagai baris berikon, sandi METAR dan prakiraan per jam dilipat, sumber kecil */
  laciBandara(s) { const m = this.cocok(s); if (!m) return ""; const b = m.b, o = b.pengamatan, L = LI();
    const pk = (b.prakiraan || []).slice(0, 12).map(h => [esc(this.jam(h.waktu, b.zona)), `<span translate="no">${esc(h.cuaca)}</span>`, h.angin_kmj != null ? `${fmt(h.angin_kmj)} km/jam ${esc(h.arah || "")}` : "–", h.vis_km != null ? "jarak pandang " + this.vis(h) : ""]);
    const br = [L.barisLaci("pusat", "Bandara BMKG", `<span translate="no">${esc(b.nama)} (${esc(b.kode)})</span>`), L.barisLaci("peta", "Dicocokkan lewat", esc(m.cara)),
      ...(o ? [L.barisLaci("waktu", "Pengamatan", esc(this.jam(o.waktu, b.zona))), L.barisLaci("hujan", "Cuaca", `<span translate="no">${esc(o.cuaca)}</span>`),
        o.angin_kmj != null && L.barisLaci("angin", "Angin", `${fmt(o.angin_kmj)} km/jam ${esc(o.arah || "")}`), o.vis_km != null && L.barisLaci("mata", "Jarak pandang", this.vis(o)),
        o.suhu != null && L.barisLaci("suhu", "Suhu", fmt(o.suhu) + " °C")] : [])].filter(Boolean).join("");
    return seksiCu("Cuaca penerbangan BMKG", "angin", `<div class="lc-lbs">${br}</div>${o ? "" : `<p class="fnd">Pengamatan BMKG tidak tersedia pada pengambilan ini.</p>`}
      ${pk.length ? lipatLaci("Prakiraan per jam, 12 jam ke depan", deretLaci(pk)) : ""}
      ${b.metar ? lipatLaci("Sandi METAR asli", `<code class="cu-kode" translate="no">${esc(b.metar)}</code>`) : ""}<p class="fnd">Ditampilkan apa adanya, bukan penilaian layak terbang.</p>`,
      `Sumber: BMKG cuaca penerbangan, diambil ${jamWIB(b.diambil)}${this.umur()}.`); },
  kartuBandara() { const d = this.bd; if (!d) return ""; const B = Object.values(d.bandara), hit = {};
    B.forEach(b => { const c = b.pengamatan?.cuaca || "Tanpa pengamatan"; (hit[c] ||= []).push(b); });
    const st = Object.entries(hit).sort((a, b) => b[1].length - a[1].length), rutin = /^(cerah|berawan|cerah - berawan)$/i, perhatian = B.filter(b => b.pengamatan && !rutin.test(b.pengamatan.cuaca));
    const nSar = S.sar ? S.sar.bandara.filter(s => this.cocok(s)).length : 0, tw = (k, r) => `<div class="tw ex-tabel"><table><thead><tr>${k}</tr></thead><tbody>${r}</tbody></table></div>`;
    const tabel = tw("<th>Status BMKG</th><th class=\"n\">Bandara</th><th>Contoh</th>", st.map(([c, l]) => `<tr><td translate="no">${esc(c)}</td><td class="n">${fmt(l.length)}</td><td translate="no">${l.slice(0, 3).map(b => esc(b.nama.split(" - ")[0])).join(", ")}${l.length > 3 ? ", dan lainnya" : ""}</td></tr>`).join(""))
      + (perhatian.length ? `<p class="ex-sub">Bandara berstatus BMKG selain cerah atau berawan${perhatian.length > 12 ? ` (12 dari ${fmt(perhatian.length)}, urut abjad)` : ", urut abjad"}</p>` + tw("<th>Bandara</th><th>Provinsi</th><th>Status BMKG</th><th class=\"n\">Jarak pandang</th>",
        perhatian.sort((a, b) => a.nama.localeCompare(b.nama)).slice(0, 12).map(b => `<tr><td translate="no">${esc(b.nama)}</td><td>${esc(b.provinsi)}</td><td translate="no">${esc(b.pengamatan.cuaca)}</td><td class="n">${this.vis(b.pengamatan)}</td></tr>`).join("")) : "");
    return Kartu.ex(`Status pengamatan BMKG tersedia di ${Kartu.hl(fmt(B.filter(b => b.pengamatan).length) + " dari " + fmt(B.length) + " bandara")}: ${esc((st.find(x => x[0] !== "Tanpa pengamatan") || st[0])[0])} terbanyak, ${fmt((st.find(x => x[0] !== "Tanpa pengamatan") || st[0])[1].length)} bandara`, "", "", tabel,
      `Sumber: BMKG cuaca penerbangan, diambil ${jamWIB(d.dibuat)}${this.umur()}${d.gagal?.length ? `; ${fmt(d.gagal.length)} bandara gagal diambil` : ""}${S.sar ? `; ${fmt(nSar)} dari ${fmt(S.sar.bandara.length)} titik bandara di lapisan Sarana cocok dengan bandara BMKG` : ""}. Status apa adanya, bukan penilaian layak terbang`); },
  /* petir: hanya jendela menit yang terambil */
  jendela() { const p = this.pt, r = p.rentang; return `${fmt(Math.round(p.cakupan_menit))} menit terakhir, ${r.awal_wib.slice(11, 16).replace(":", ".")} sampai ${r.akhir_wib.slice(11, 16).replace(":", ".")} WIB`; },
  kartuPetir() { const p = this.pt; if (!p) return ""; const A = [...p.kabupaten].sort((a, b) => b.n - a.n), a0 = A[0];
    const tb = `<div class="tw ex-tabel"><table><thead><tr><th>Kabupaten atau kota</th><th>Provinsi</th><th class="n" title="Sambaran petir dari awan ke tanah (cloud-to-ground) yang terdeteksi jaringan BMKG dalam jendela waktu yang sama">Sambaran awan ke tanah</th></tr></thead><tbody>${A.slice(0, 12).map(k => `<tr><td translate="no">${esc(k.kab)}</td><td>${esc(namaProv(k.kode_prov))}</td><td class="n">${fmt(k.cg)}</td></tr>`).join("")}</tbody></table></div>`;
    return Kartu.ex(`Sambaran petir terbanyak di <span translate="no">${esc(a0.kab)}</span>, ${esc(namaProv(a0.kode_prov))}: ${Kartu.hl(fmt(a0.n) + " sambaran")} dalam ${esc(this.jendela())}`, "", "", tb,
      `Sumber: BMKG jaringan deteksi petir, diambil ${jamWIB(p.diambil)}. Hitungan hanya dalam jendela ${esc(this.jendela())}, bukan total harian dan tidak dijumlahkan antarjendela`); },
  /* baris laci kecamatan lewat kabupatennya */
  laciPetir(prov, kab) { const p = this.pt, nk = Resmi.nk(kab), k = p && p.kabupaten.find(x => x.kode_prov === prov && Resmi.nk(x.kab) === nk); if (!k) return ""; const L = LI();
    return seksiCu("Sambaran petir BMKG", "kuat", `<div class="lc-lbs">${L.barisLaci("kab", "Kabupaten atau kota", `<span translate="no">${esc(k.kab)}</span>`)}${L.barisLaci("kuat", "Sambaran", fmt(k.n))}${L.barisLaci("waktu", "Jendela pengamatan", esc(this.jendela()))}</div>
      <p class="fnd">Dihitung untuk kabupaten atau kota, bukan kecamatan. Hanya jendela waktu di atas, bukan total harian.</p>`, `Sumber: BMKG, diambil ${jamWIB(p.diambil)}.`); },
};
Bmkg2.muat();
Insight.EX.splice(Insight.EX.indexOf("resmi") + 1, 0, "bandaraBmkg", "petir");
Object.assign(Insight.LABEL, {bandaraBmkg: "Cuaca bandara BMKG", petir: "Sambaran petir BMKG"});
IK.bandaraBmkg = '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>'; IK.petir = IK.nowcast;
Insight.exBandaraBmkg = () => Bmkg2.kartuBandara();
Insight.exPetir = () => Bmkg2.kartuPetir();
