"use strict";
/* Prakiraan resmi BMKG yang sudah diarsip, dibandingkan dengan model tanpa menyebut mana yang benar. Berkas (../banjir/data/): cuaca_factsheet (Ikhtisar Cuaca Harian),
   cuaca_sepekan (artikel prakiraan sepekan), cuaca_bmkg_kab10 (515 kabupaten, 10 hari, teks kondisi). Teks BMKG tampil apa adanya, berlabel BMKG; model = Open-Meteo.
   Bagian yang berkasnya hilang dibuang (A18); kartu tanpa satu bagian pun = "". */
const Resmi = {
  D: null, _p: null,
  muat() { return this._p ||= Promise.all(["factsheet", "sepekan", "bmkg_kab10"].map(n => opsi(`../banjir/data/cuaca_${n}.json`))).then(([fs, sp, kb]) => (this.D = {fs, sp: sp?.artikel, kb: kb?.kab ? kb : null})); },
  /* nama kab: "Kota Adm. Jakarta Pusat" dan "Kota Jakarta Pusat" jadi sama; kunci "kodeprov|nama" */
  nk: s => String(s).toLowerCase().replace(/\badm\.|\badministrasi\b/g, "").replace(/^(kabupaten|kab\.)\s*/, "").replace(/[^a-z0-9]/g, ""),
  tingkatKab() {   /* "prov|nama" -> tingkat model tertinggi per hari di kontrak 72 jam; kosong bila cuaca_kec tak ada */
    if (this._tk) return this._tk; const m = new Map(); if (!S.kec || !S.kecKunci) return m;
    for (const r of S.kec.kec) { const [p, kab] = (S.kecKunci[r[0]] || "").split("|"), k = p + "|" + this.nk(kab), a = m.get(k) || m.set(k, [0, 0, 0]).get(k); r[1].forEach((t, i) => { if (t > a[i]) a[i] = t; }); }
    return this._tk = m; },
  /* hitungan per tanggal kab10: BMKG lebat atau lebih, sedang, petir; model Waspada atau lebih bila tanggalnya ada di cuaca_kec */
  harian() {
    const kb = this.D?.kb; if (!kb) return []; const T = this.tingkatKab(), kec = S.kec?.hari || [], tgl = new Map();
    for (const [, v] of Object.entries(kb.kab)) for (const h of v.hari || []) { const o = tgl.get(h.tgl) || tgl.set(h.tgl, {tgl: h.tgl, lebat: 0, sedang: 0, petir: 0, n: 0, model: null, nModel: 0}).get(h.tgl), c = String(h.kondisi || "").toLowerCase(); o.n++;
      if (/lebat|ekstrem/.test(c)) o.lebat++; else if (c === "hujan sedang") o.sedang++; else if (/petir/.test(c)) o.petir++;
      const j = kec.indexOf(h.tgl); if (j >= 0 && T.size) { o.model = (o.model || 0) + ((T.get(v.prov + "|" + this.nk(v.nama)) || [])[j] > 0 ? 1 : 0); o.nModel++; } }   /* cuaca_kec hanya memuat kecamatan di atas Waspada: kab tanpa baris = Normal */
    return [...tgl.values()].sort((a, b) => a.tgl.localeCompare(b.tgl)); },
  /* model hujan harian tertinggi di satu provinsi pada satu tanggal; null bila tanggal di luar prakiraan model */
  modelProv(prov, tgl) { const i = S.pr?.hari?.indexOf(tgl); if (i == null || i < 0) return null; let v = null;
    for (const r of S.pr.sel) if (r[2] === prov && r[3][i] != null && (v == null || r[3][i] > v)) v = r[3][i]; return v; },
  baris(kepala, isi) { return `<tr><td style="font-weight:600;white-space:normal;min-width:150px">${kepala}</td><td style="white-space:normal;line-height:1.5">${isi}</td></tr>`; },
  kartu() {
    const D = this.D; if (!D || !(D.fs || D.sp || D.kb)) return ""; const sk = Kartu.hl, bagian = [], judul = [], hari = this.harian(), tw = (kep, b) => `<div class="tw ex-tabel"><table><thead><tr>${kep}</tr></thead><tbody>${b}</tbody></table></div>`;
    const f = D.fs, st = f?.hujan_stasiun?.[0];
    if (st) { const mm = this.modelProv(st.kode_prov, f.tanggal);
      judul.push(`hujan terukur BMKG tertinggi ${sk(fmt(st.mm) + " mm")} di <span translate="no">${esc(st.nama)}</span>, ${esc(st.prov)}`);
      bagian.push(this.baris("Hujan terukur BMKG tertinggi", `<span translate="no">${esc(st.nama)}</span>, ${esc(st.prov)}: ${fmt(st.mm)} mm (ikhtisar ${tglSgk(f.tanggal)}). `
        + (mm == null ? `Model Open-Meteo tidak mencakup ${tglSgk(f.tanggal)}, jadi tidak dibandingkan.` : `Model Open-Meteo, hujan harian tertinggi di ${esc(namaProv(st.kode_prov))} pada tanggal itu: ${fmt(Math.round(mm))} mm.`))); }
    const kj = f?.kejadian_bencana?.filter(k => k.jenis?.length && k.lokasi?.length);
    if (kj?.length) bagian.push(this.baris("Kejadian dilaporkan BMKG", `${fmt(kj.length)} kejadian: ` + kj.slice(0, 3).map(k => `${esc(k.jenis.join(", "))} di ${esc(k.lokasi[0])}`).join("; ") + (kj.length > 3 ? `; dan ${fmt(kj.length - 3)} lainnya` : "") + "."));
    const pg = f?.prognosis?.butir && Object.values(f.prognosis.butir)[0]; if (pg) bagian.push(this.baris("Prognosis BMKG", esc(pg)));
    const sp = D.sp, p0 = sp?.prakiraan?.[0];
    if (p0?.tingkat?.length) bagian.push(this.baris(`Prakiraan sepekan BMKG, ${tglSgk(p0.periode.dari)} sampai ${tglSgk(p0.periode.sampai)}`, p0.tingkat.map(t => `${esc(t.tingkat)}: ${esc(String(t.teks).replace(/\.$/, ""))}`).join(". ") + "."));
    if (!bagian.length && !hari.length) return "";
    const lebatMaks = hari.reduce((a, h) => h.lebat > a.lebat ? h : a, hari[0] || {lebat: 0});
    /* teks kondisi kab10 hanya satu waktu per hari dan kosakatanya bisa tanpa "hujan lebat": nol di sini BUKAN pernyataan aman, jadi tidak ditulis */
    if (hari.length && lebatMaks.lebat) judul.push(`BMKG menulis hujan lebat atau lebih di ${sk(fmt(lebatMaks.lebat) + " kabupaten")} pada ${tglSgk(lebatMaks.tgl)}`);
    const ada = hari.some(h => h.nModel), adaLebat = hari.some(h => h.lebat), kolom = ["Tanggal", ...(adaLebat ? ["Hujan lebat atau lebih"] : []), "Hujan sedang", "Hujan petir", ...(ada ? ["Model Waspada atau lebih"] : [])].map((k, i) => `<th${i ? ' class="n"' : ""}>${k}</th>`).join("");
    const tabHari = hari.length ? tw(kolom, hari.map(h => `<tr><td>${tglPendek(h.tgl)}</td>${adaLebat ? `<td class="n">${fmt(h.lebat)}</td>` : ""}<td class="n">${fmt(h.sedang)}</td><td class="n">${fmt(h.petir)}</td>${ada ? `<td class="n">${h.nModel ? fmt(h.model) : "–"}</td>` : ""}</tr>`).join("")) : "";
    const tab = bagian.length ? tw("<th>Perbandingan</th><th>Isi</th>", bagian.join("")) : "";
    const kaki = [f && `Ikhtisar Cuaca Harian ${f.diambil ? jamWIB(f.diambil) : tglSgk(f.tanggal)}`, sp && `Prakiraan Sepekan terbit ${tglSgk(sp.terbit.slice(0, 10))}`, D.kb && `prakiraan kabupaten ${jamWIB(D.kb.dibuat)}`].filter(Boolean).join(", ");
    return Kartu.ex(`${judul.join("; ").replace(/^./, c => c.toUpperCase())}`, "", "", tab + (tabHari ? `<p class="fnd" style="padding:6px 22px 0">Kabupaten dan kota per tanggal menurut teks kondisi BMKG (perwakilan satu waktu per hari), dibandingkan dengan status model Centurisk97${ada ? "" : "; tanggal model tidak beririsan, kolom model dibuang"}.</p>` + tabHari : ""),
      `Sumber: BMKG, ${kaki}; model Open-Meteo. Dibandingkan apa adanya, tidak berarti salah satunya benar`); },
  /* baris laci satu kecamatan: prakiraan BMKG 10 hari kabupatennya, per tanggal apa adanya */
  laci(prov, kab) {
    const kb = this.D?.kb, k = kb && Object.values(kb.kab).find(v => v.prov === prov && this.nk(v.nama) === this.nk(kab)); if (!k?.hari?.length) return "";
    const b = k.hari.map(h => `<tr><td>${tglPendek(h.tgl)}</td><td translate="no">${esc(h.kondisi)}</td><td class="n">${h.tmin != null ? fmt(h.tmin) + " sampai " + fmt(h.tmax) + " °C" : "–"}</td><td class="n">${h.humin != null ? fmt(h.humin) + " sampai " + fmt(h.humax) + "%" : "–"}</td></tr>`).join("");
    return `<p class="fnd"><b>Prakiraan BMKG 10 hari</b>, <span translate="no">${esc(k.nama)}</span> (kabupaten atau kota, bukan kecamatan)</p><div class="tw"><table><thead><tr><th>Tanggal</th><th>Kondisi</th><th class="n">Suhu</th><th class="n">Kelembapan</th></tr></thead><tbody>${b}</tbody></table></div>
      <p class="fnd">Sumber: BMKG, dianalisis ${tglSgk(String(k.dianalisis).slice(0, 10))} ${esc(k.zona || "")}, diambil ${jamWIB(k.diambil)}.</p>`; },
};
Resmi.muat();
