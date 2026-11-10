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
  /* blok laci satu bandara: status pengamatan, METAR mentah, prakiraan 12 jam, jam terbit */
  laciBandara(s) { const m = this.cocok(s); if (!m) return ""; const b = m.b, o = b.pengamatan;
    const pk = (b.prakiraan || []).slice(0, 12).map(h => `<tr><td>${esc(this.jam(h.waktu, b.zona))}</td><td translate="no">${esc(h.cuaca)}</td><td class="n">${h.angin_kmj != null ? fmt(h.angin_kmj) + " km/jam " + esc(h.arah || "") : "–"}</td><td class="n">${this.vis(h)}</td></tr>`).join("");
    return `<p class="fnd"><b>BMKG Penerbangan</b>, <span translate="no">${esc(b.nama)}</span> (${esc(b.kode)}), cocok lewat ${m.cara}</p>
      ${o ? `<p class="fnd">Status pengamatan BMKG ${esc(this.jam(o.waktu, b.zona))}: <span translate="no">${esc(o.cuaca)}</span>${o.angin_kmj != null ? `, angin ${fmt(o.angin_kmj)} km/jam ${esc(o.arah || "")}` : ""}${o.vis_km != null ? `, jarak pandang ${this.vis(o)}` : ""}${o.suhu != null ? `, suhu ${fmt(o.suhu)} °C` : ""}</p>` : `<p class="fnd">Pengamatan BMKG tidak tersedia pada pengambilan ini.</p>`}
      ${b.metar ? `<p class="fnd">METAR: <code translate="no" style="white-space:normal;word-break:break-all">${esc(b.metar)}</code></p>` : ""}
      ${pk ? `<div class="tw"><table><thead><tr><th>Jam</th><th>Cuaca</th><th class="n">Angin</th><th class="n">Jarak pandang</th></tr></thead><tbody>${pk}</tbody></table></div>` : ""}
      <p class="fnd">Sumber: BMKG cuaca penerbangan, diambil ${jamWIB(b.diambil)}${this.umur()}. Ditampilkan apa adanya, bukan penilaian layak terbang.</p>`; },
  kartuBandara() { const d = this.bd; if (!d) return ""; const B = Object.values(d.bandara), hit = {};
    B.forEach(b => { const c = b.pengamatan?.cuaca || "Tanpa pengamatan"; (hit[c] ||= []).push(b); });
    const st = Object.entries(hit).sort((a, b) => b[1].length - a[1].length), rutin = /^(cerah|berawan|cerah - berawan)$/i, perhatian = B.filter(b => b.pengamatan && !rutin.test(b.pengamatan.cuaca));
    const nSar = S.sar ? S.sar.bandara.filter(s => this.cocok(s)).length : 0, tw = (k, r) => `<div class="tw ex-tabel"><table><thead><tr>${k}</tr></thead><tbody>${r}</tbody></table></div>`;
    const tabel = tw("<th>Status BMKG</th><th class=\"n\">Bandara</th><th>Contoh</th>", st.map(([c, l]) => `<tr><td translate="no">${esc(c)}</td><td class="n">${fmt(l.length)}</td><td translate="no">${l.slice(0, 3).map(b => esc(b.nama.split(" - ")[0])).join(", ")}${l.length > 3 ? ", dan lainnya" : ""}</td></tr>`).join(""))
      + (perhatian.length ? `<p class="fnd" style="padding:6px 22px 0">Bandara dengan status BMKG selain cerah atau berawan, ${perhatian.length > 12 ? `12 dari ${fmt(perhatian.length)}, ` : ""}urut abjad nama.</p>` + tw("<th>Bandara</th><th>Provinsi</th><th>Status BMKG</th><th class=\"n\">Jarak pandang</th>",
        perhatian.sort((a, b) => a.nama.localeCompare(b.nama)).slice(0, 12).map(b => `<tr><td translate="no">${esc(b.nama)}</td><td>${esc(b.provinsi)}</td><td translate="no">${esc(b.pengamatan.cuaca)}</td><td class="n">${this.vis(b.pengamatan)}</td></tr>`).join("")) : "");
    return Kartu.ex(`Status pengamatan BMKG tersedia di ${Kartu.hl(fmt(B.filter(b => b.pengamatan).length) + " dari " + fmt(B.length) + " bandara")}: ${esc((st.find(x => x[0] !== "Tanpa pengamatan") || st[0])[0])} terbanyak, ${fmt((st.find(x => x[0] !== "Tanpa pengamatan") || st[0])[1].length)} bandara`, "", "", tabel,
      `Sumber: BMKG cuaca penerbangan, diambil ${jamWIB(d.dibuat)}${this.umur()}${d.gagal?.length ? `; ${fmt(d.gagal.length)} bandara gagal diambil` : ""}${S.sar ? `; ${fmt(nSar)} dari ${fmt(S.sar.bandara.length)} titik bandara di lapisan Sarana cocok dengan bandara BMKG` : ""}. Status apa adanya, bukan penilaian layak terbang`); },
  /* petir: hanya jendela menit yang terambil */
  jendela() { const p = this.pt, r = p.rentang; return `${fmt(Math.round(p.cakupan_menit))} menit terakhir, ${r.awal_wib.slice(11, 16).replace(":", ".")} sampai ${r.akhir_wib.slice(11, 16).replace(":", ".")} WIB`; },
  kartuPetir() { const p = this.pt; if (!p) return ""; const A = [...p.kabupaten].sort((a, b) => b.n - a.n), a0 = A[0];
    const tb = `<div class="tw ex-tabel"><table><thead><tr><th>Kabupaten atau kota</th><th>Provinsi</th><th class="n">Sambaran tanah (CG)</th></tr></thead><tbody>${A.slice(0, 12).map(k => `<tr><td translate="no">${esc(k.kab)}</td><td>${esc(namaProv(k.kode_prov))}</td><td class="n">${fmt(k.cg)}</td></tr>`).join("")}</tbody></table></div>`;
    return Kartu.ex(`Sambaran petir terbanyak di <span translate="no">${esc(a0.kab)}</span>, ${esc(namaProv(a0.kode_prov))}: ${Kartu.hl(fmt(a0.n) + " sambaran")} dalam ${esc(this.jendela())}`, "", "", tb,
      `Sumber: BMKG jaringan deteksi petir, diambil ${jamWIB(p.diambil)}. Hitungan hanya dalam jendela ${esc(this.jendela())}, bukan total harian dan tidak dijumlahkan antarjendela`); },
  /* baris laci kecamatan lewat kabupatennya */
  laciPetir(prov, kab) { const p = this.pt, nk = Resmi.nk(kab), k = p && p.kabupaten.find(x => x.kode_prov === prov && Resmi.nk(x.kab) === nk); if (!k) return "";
    return `<p class="fnd"><b>Petir BMKG</b> di <span translate="no">${esc(k.kab)}</span> (kabupaten atau kota, bukan kecamatan): ${fmt(k.n)} sambaran dalam ${esc(this.jendela())}. Bukan total harian. Sumber: BMKG, diambil ${jamWIB(p.diambil)}.</p>`; },
};
Bmkg2.muat();
Insight.EX.splice(Insight.EX.indexOf("resmi") + 1, 0, "bandaraBmkg", "petir");
Object.assign(Insight.LABEL, {bandaraBmkg: "Cuaca bandara BMKG", petir: "Sambaran petir BMKG"});
IK.bandaraBmkg = IK.resmi; IK.petir = IK.nowcast;
Insight.exBandaraBmkg = () => Bmkg2.kartuBandara();
Insight.exPetir = () => Bmkg2.kartuPetir();
