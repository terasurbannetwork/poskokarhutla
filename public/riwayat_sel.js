/* riwayat_sel.js — "Tren lokasi & prakiraan" di laci cluster: watak kebakaran di sekitar pusat cluster (jendela ~16 km)
   dari arsip VIIRS S-NPP 2012-2026 (public/data/riwayat_sel/<tx>_<ty>.json, scripts/data/riwayat_sel.py), digabung kondisi hari ini
   (angin, FWI, DC, gambut, umur api) menjadi fakta, prakiraan, dan saran.
   RiwayatSel.kunci(lat, lon) -> {ubin, sel}; RiwayatSel.analisa(rec, meta, p, enso) fungsi murni (diuji di tests/agen/riwayat-sel.test.mjs);
   RiwayatSel.html(a); RiwayatSel.isi(wadah, p) memuat ubin lalu menggambar. Prakiraan = pola masa lalu, bukan model fisika. */
(() => {
  "use strict";
  const X0 = 94.5, Y1 = 6.5, SEL = 0.05, TAHUN_AKTIF = 10, EL_NINO = [2004, 2006, 2009, 2015, 2019, 2023]   /* El Niño moderat ke atas (ONI) sejak 2003 */;
  const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const ARAH = ["utara", "timur laut", "timur", "tenggara", "selatan", "barat daya", "barat", "barat laut"];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const ang = (x, d = 0) => Number(x).toLocaleString("id-ID", {maximumFractionDigits: d});
  const arahDari = deg => ARAH[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
  const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
  const kuantil = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * q))] : null; };
  const rata = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const tglDoy = (doy, th = 2026) => new Date(Date.UTC(th, 0, doy)).toLocaleDateString("id-ID", {day: "numeric", month: "long", timeZone: "UTC"});
  const kali = r => r >= 10 ? ang(Math.round(r)) : ang(Math.round(r * 10) / 10, 1);

  function kunci(lat, lon) {
    const ix = Math.trunc((lon - X0) / SEL), iy = Math.trunc((Y1 - lat) / SEL);
    return {ubin: `${Math.trunc(ix * SEL)}_${Math.trunc(iy * SEL)}`, sel: `${ix}_${iy}`};
  }

  /* rec = rekaman sel; meta = {th0, sd}; p = properti cluster (hari, wd, ws, fwi, dc, gambut, teramati); enso = status iklim.json atau null */
  function analisa(rec, meta, p, enso, opsi = {}) {
    const th0 = meta.th0, sd = new Date(meta.sd + "T00:00:00Z"), thIni = sd.getUTCFullYear(), doyIni = Math.round((sd - Date.UTC(thIni, 0, 1)) / 864e5) + 1;
    const th = rec.y.map((_, i) => th0 + i), penuh = th.filter(t => t < thIni), y = t => rec.y[t - th0], yd = t => rec.yd[t - th0];
    /* seri panjang: MODIS 2003-... (ym) bila ada, selain itu VIIRS. Kekerapan, tren, El Niño, dan grafik memakai seri ini;
       deteksi minggu ini dan "tahun ini s.d. tanggal sama" tetap VIIRS (sensor yang sama dengan cluster) */
    const pj = rec.ym && meta.thm0 ? {t0: meta.thm0, v: rec.ym, amb: meta.aktif_modis || 3, sen: "MODIS"} : {t0: th0, v: rec.y, amb: TAHUN_AKTIF, sen: "VIIRS"};
    const thL = pj.v.map((_, i) => pj.t0 + i), penuhL = thL.filter(t => t < thIni), yL = t => pj.v[t - pj.t0];
    const aktif = penuhL.filter(t => yL(t) >= pj.amb), puncak = penuhL.reduce((a, t) => yL(t) > yL(a) ? t : a, penuhL[0]);
    const fakta = [], prakira = [], saran = [];
    const a = {th: thL, y: pj.v, sen: pj.sen, m: rec.m, thIni, sd: meta.sd, fakta, prakira, saran, aktif: aktif.length, penuh: penuhL.length};

    /* 1. kekerapan (seri panjang) */
    fakta.push(aktif.length
      ? `Terbakar ${aktif.length} dari ${penuhL.length} tahun (${pj.t0}–${thIni - 1}, ${pj.sen}); terakhir ${aktif[aktif.length - 1]}, terparah ${puncak} dengan ${ang(yL(puncak))} titik ${pj.sen}.`
      : `Dalam ${penuhL.length} tahun (${pj.t0}–${thIni - 1}) lokasi ini belum pernah mencapai ${pj.amb} titik ${pj.sen} setahun: kebakaran di sini tidak biasa.`);

    /* 1b. di luar kebiasaan: deteksi VIIRS 7 hari cluster vs rata-rata titik VIIRS setahun (rumus sama dengan watak_kluster.py `rs`) */
    const rt = Math.round(rata(penuh.map(y)));
    a.rs = rt >= 1 && p.n ? Math.round(p.n / rt * 10) / 10 : null;
    if (a.rs >= 1) fakta.push(`Seminggu ini ${ang(p.n)} deteksi, ${kali(a.rs)} kali rata-rata setahun di sini (${ang(rt)} titik VIIRS ${th0}–${thIni - 1}): di luar kebiasaan.`);

    /* 2. tahun ini vs tahun-tahun lalu sampai tanggal yang sama (VIIRS) */
    const lalu = penuh.map(yd), rLalu = rata(lalu), ini = yd(thIni);
    const peringkat = 1 + lalu.filter(v => v > ini).length;
    if (ini > 0) {
      const banding = rLalu >= 1 ? `, ${kali(ini / rLalu)} kali rata-rata ${th0}–${thIni - 1}` : "";
      fakta.push(`${thIni} sampai ${tglDoy(doyIni)}: ${ang(ini)} titik VIIRS${banding}; ${peringkat === 1 ? "tertinggi sejak " + th0 : "urutan ke-" + peringkat + " dari " + (penuh.length + 1) + " tahun"}.`);
    }
    a.tahunIni = {ini, rLalu, peringkat};

    /* 3. tren: dua blok tahun penuh sama panjang (seri panjang MODIS: 10 vs 10 tahun; VIIRS: 5 vs 5) */
    const w = penuhL.length >= 20 ? 10 : 5, b5 = penuhL.slice(-w), s5 = w === 10 ? penuhL.slice(0, w) : penuhL.slice(-10, -5), rb = rata(b5.map(yL)), rs = rata(s5.map(yL));
    if (s5.length === w && penuhL.length >= 2 * w && rs + rb >= pj.amb) {
      const r = rs ? rb / rs : Infinity;
      a.tren = r >= 1.5 ? "naik" : r <= 0.67 ? "turun" : "datar";
      fakta.push(`Tren: rata-rata ${b5[0]}–${b5[w - 1]} ${ang(Math.round(rb))} titik ${pj.sen}/tahun, ${s5[0]}–${s5[w - 1]} ${ang(Math.round(rs))} (${a.tren === "naik" ? "naik" : a.tren === "turun" ? "turun" : "relatif sama"}${rs && a.tren !== "datar" ? ", " + kali(r) + "×" : ""}).`);
    }

    /* 4. El Niño (seri panjang) */
    const en = penuhL.filter(t => EL_NINO.includes(t)), bi = penuhL.filter(t => !EL_NINO.includes(t)), re = rata(en.map(yL)), rbi = rata(bi.map(yL));
    if (re >= pj.amb) {
      a.elNino = rbi >= 1 ? re / rbi : null;
      fakta.push(`Di tahun El Niño (${en.join(", ")}) rata-rata ${ang(Math.round(re))} titik ${pj.sen}, ${a.elNino ? kali(a.elNino) + " kali tahun biasa" : "tahun biasa hampir nol"}.${enso && /El Ni/.test(enso) ? ` ${thIni} juga tahun El Niño.` : ""}`);
    }

    /* 5. musim */
    const tot = rec.m.reduce((x, v) => x + v, 0);
    if (tot) {
      const bp = rec.m.indexOf(Math.max(...rec.m)), porsi = Math.round(rec.m[bp] / tot * 100);
      a.bulanPuncak = bp;
      fakta.push(`Bulan paling rawan: ${BULAN[bp]} (${porsi}% dari semua titik${rec.s ? `); musim biasanya ${tglDoy(rec.s[0])} sampai ${tglDoy(rec.s[1])}.` : ")."}`);
    }
    if (rec.nm >= 40) fakta.push(`${rec.nm}% deteksi terjadi malam hari: api di sini cenderung terus membara setelah siang, ciri kebakaran gambut.`);

    /* PRAKIRAAN. Tahun berjalan El Niño + lokasi punya >= 3 episode di musim El Niño (2015, 2019, 2023) -> pakai analog itu saja
       (riwayat_sel.py `en`); uji balik membandingkan keduanya pada kasus yang sama (riwayat_sel_uji.json el_nino) */
    const elNow = !!(enso && /El Ni/.test(enso)), an = opsi.analog !== false && elNow && rec.en?.r?.length >= 3, R = an ? {...rec, ...rec.en} : rec, dasarM = an ? "musim El Niño 2015, 2019, 2023" : `musim ${th0}–${thIni - 1}`;
    a.analog = an;
    if (an) fakta.push(`Prakiraan di bawah memakai musim El Niño saja (2015, 2019, 2023) di lokasi ini, karena ${thIni} tahun El Niño.`);
    else if (elNow && opsi.analog === false && rec.en?.r?.length >= 3) fakta.push(`${thIni} tahun El Niño, tetapi prakiraan memakai semua tahun: diuji pada musim El Niño 2019 dan 2023, memakai musim El Niño saja meleset lebih jauh (episodenya terlalu sedikit).`);
    const turun = p.wd != null && p.ws != null ? (p.wd + 180) % 360 : null;
    if (turun != null && p.ws >= 5) prakira.push(["Arah jalar hari ini", `ke ${arahDari(turun)}`, `angin ${ang(p.ws)} km/jam dari ${arahDari(p.wd)}`]);
    if (R.v && R.v[1] >= 0.3) prakira.push(["Arah jalar historis", `ke ${arahDari(R.v[0])}`, `${ang(R.v[3])} pergeseran harian, konsistensi ${ang(Math.round(R.v[1] * 100))}%`]);
    else if (R.v) prakira.push(["Arah jalar historis", "tidak tetap", "pusat api di masa lalu bergeser ke berbagai arah"]);
    if (R.v) prakira.push(["Laju geser pusat api", `sekitar ${ang(R.v[2], 1)} km/hari`, `median ${ang(R.v[3])} pergeseran harian, ${dasarM}`]);
    const banyak = (R.r || []).length >= 8;
    if (R.x) prakira.push(["Jangkauan", `${ang(R.x[0], 1)} km`, `separuh episode meluas sejauh ini dari titik awal${banyak ? `; 1 dari 4 lebih dari ${ang(R.x[1], 1)} km` : ""}`]);
    const r = R.r || [];
    if (r.length >= 3) {
      const h = Math.max(1, p.hari || 1), lanjut = r.filter(v => v >= h), mTot = median(lanjut.length >= 3 ? lanjut : r);
      /* kuartil baru bermakna dari >= 8 episode; di bawah itu cukup median dan terlama */
      a.lama = {median: median(r), p75: r.length >= 8 ? kuantil(r, .75) : null, n: r.length, sisa: lanjut.length >= 3 ? Math.max(0, Math.round(mTot - h)) : null};
      prakira.push(["Lama kebakaran", `median ${ang(a.lama.median)} hari`, `${ang(r.length)} episode ${dasarM}${a.lama.p75 ? `; 1 dari 4 lebih dari ${ang(a.lama.p75)} hari` : ""}, terlama ${ang(r[r.length - 1])} hari`]);
      if (a.lama.sisa != null && p.teramati !== false) prakira.push(["Perkiraan sisa", a.lama.sisa ? `sekitar ${ang(a.lama.sisa)} hari lagi` : "mendekati akhir",
        `episode yang sudah bertahan ${ang(h)} hari di sini biasanya total ${ang(Math.round(mTot))} hari (${ang(lanjut.length)} kejadian)`]);
    }
    if (R.s) {
      a.sisaMusim = R.s[1] - doyIni;
      prakira.push(["Akhir musim", a.sisaMusim > 0 ? `sekitar ${tglDoy(R.s[1])}` : "biasanya sudah lewat", a.sisaMusim > 0 ? `${ang(a.sisaMusim)} hari lagi menurut median ${dasarM}` : `median akhir musim ${tglDoy(R.s[1])}; api ini terlambat dari kebiasaan`]);
    }
    if (R.k >= 2) prakira.push(["Kekambuhan", `${ang(R.k, 1)} episode/tahun`, "di tahun terbakar, api biasanya muncul lagi setelah sempat padam"]);

    /* SARAN dari pola di atas */
    const lamaPanjang = a.lama && a.lama.median >= 7, gambut = p.gambut || rec.nm >= 40;
    if (lamaPanjang) saran.push(`Siapkan operasi panjang: api di sini biasanya ${ang(a.lama.median)} hari. Atur rotasi regu dan logistik minimal ${ang(a.lama.p75 || a.lama.median)} hari.`);
    if (gambut && (p.dc > 300 || rec.nm >= 40)) saran.push("Gambut kering dan api membara malam: pasang sumur bor dan embung di tepi api, lakukan injeksi gambut, jangan tinggalkan lokasi setelah api permukaan padam.");
    if (turun != null && p.ws >= 5) saran.push(`Bangun sekat bakar dan tempatkan regu di sisi ${arahDari(turun)}${R.v && R.v[1] >= 0.3 && arahDari(R.v[0]) !== arahDari(turun) ? ` dan ${arahDari(R.v[0])} (arah jalar historis)` : ""}, searah angin.`);
    else if (R.v && R.v[1] >= 0.3) saran.push(`Jaga sisi ${arahDari(R.v[0])}: api di lokasi ini berulang kali bergerak ke sana.`);
    const radius = R.x && (banyak ? R.x[1] : R.x[0]);
    if (radius >= 5) saran.push(`Siagakan desa dan kebun dalam radius ${ang(Math.ceil(radius))} km; sejauh itu api di sini biasa meluas.`);
    if (R.k >= 2) saran.push("Api di sini sering kambuh: lanjutkan mop-up dan patroli minimal 14 hari setelah dinyatakan padam.");
    if (a.tahunIni.ini && a.tahunIni.rLalu >= 1 && a.tahunIni.ini / a.tahunIni.rLalu >= 2) saran.push(`Tahun ini sudah ${kali(a.tahunIni.ini / a.tahunIni.rLalu)} kali rata-rata: tambah alokasi regu dan anggaran untuk lokasi ini.`);
    if (a.sisaMusim > 14) saran.push(`Jaga kesiagaan sampai ${tglDoy(R.s[1])}; musim di sini biasanya belum berakhir sebelum itu.`);
    if (a.aktif >= Math.ceil(a.penuh / 3)) saran.push(`Lokasi langganan: masukkan ke patroli pencegahan rutin mulai ${R.s ? BULAN[new Date(Date.UTC(2026, 0, Math.max(1, R.s[0] - 30))).getUTCMonth()] : "Juni"}, sebulan sebelum musim di sini biasanya mulai.`);
    if (a.rs >= 5 && aktif.length <= 2) saran.push("Api besar di tempat yang jarang terbakar: periksa izin dan pembukaan lahan baru bersama Gakkum dan pemilik lahan.");
    if (a.tren === "naik") saran.push("Kebakaran di sini makin sering 5 tahun terakhir: cari penyebabnya (pembukaan lahan, kanal baru) bersama pemilik lahan.");
    if (!aktif.length) saran.push("Lokasi tanpa riwayat: pastikan dengan ground-check, bisa api baru dari pembukaan lahan.");
    return a;
  }

  /* faktor pendorong untuk kondisi cluster ini: kelas tiap variabel dicocokkan ke tabel sebaran_pendorong.json (370 ribu peristiwa VIIRS,
     laju "membesar >= 10 sel dalam 72 jam" per kelas dibagi kelas acuan). Rasio satu variabel, belum dikoreksi variabel lain. */
  function faktor(pd, p, a, ik) {
    if (!pd?.kelas) return [];
    const ke = (v, batas) => batas.filter(x => v >= x).length;
    const daftar = [["fwi", p.fwi, [2, 7, 14]], ["dc", p.dc, [100, 200]], ["ws", p.ws, [10, 15, 20]], ["rh_min", p.rh, [40, 50, 60]],
      ["gambut", p.gambut == null ? null : +!!p.gambut], ["oni", ik?.oni_terakhir?.nilai, [-0.5, 0.5, 1]], ["dmi", ik?.dmi_8_minggu, [-0.4, 0.4]],
      ["riwayat_f", a.sen === "MODIS" ? a.aktif : null, [1, 5, 10]]];
    return daftar.map(([k, v, batas]) => {
      const K = pd.kelas[k], T = K?.tabel; if (!T?.length || v == null || !Number.isFinite(+v)) return null;
      const row = T[Math.min(T.length - 1, batas ? ke(+v, batas) : +v)];
      /* kondisi = kelas acuan: tidak ada yang dibandingkan */
      return row && row !== T[0] && Number.isFinite(row.rasio) ? {nama: K.nama, kelas: row.kelas, rasio: row.rasio, acuan: T[0].kelas} : null;
    }).filter(Boolean).sort((x, y) => y.rasio - x.rasio);
  }

  function batang(nilai, label, sorot, judul) {
    const m = Math.max(...nilai, 1), n = nilai.length, w = 100 / n, lb = x => x >= 1000 ? (Math.round(x / 100) / 10 + "rb").replace(".", ",") : x;
    return `<svg viewBox="0 0 100 32" width="100%" role="img" aria-label="${esc(judul)}">${nilai.map((x, i) => { const h = Math.max(.6, x / m * 18);
      return `<rect x="${i * w + w * .15}" y="${24 - h}" width="${w * .7}" height="${h}" rx=".8" fill="${sorot(i) ? "#c9503a" : "#e58a45"}" data-tip="<b>${esc(label[i])}</b><br>${ang(x)} titik"/>`
        + (x ? `<text x="${i * w + w / 2}" y="${22.4 - h}" text-anchor="middle" font-size="2.6" font-weight="700" fill="var(--ink2)" pointer-events="none">${lb(x)}</text>` : "")
        + `<text x="${i * w + w / 2}" y="29" text-anchor="middle" font-size="2.6" fill="var(--ink2)" pointer-events="none">${esc(typeof label[i] === "number" ? String(label[i]).slice(-2) : label[i])}</text>`; }).join("")}</svg>`;
  }

  /* kalimat uji balik (riwayat_sel_uji.json): ramalan dari tahun sebelum musim uji saja, dibanding tebakan sederhana */
  function teksUji(u) {
    if (!u || !u.lama) return "";
    const l = Object.values(u.lama), m = u.musim, th = (u.tahun_uji || []).join(" dan ");
    if (!l.length) return "";
    const mae = l.map(x => x.mae), pemb = l.map(x => x.mae_pembanding), unggul = l.every(x => x.mae < x.mae_pembanding - 0.5);
    const rg = xs => Math.min(...xs) === Math.max(...xs) ? ang(xs[0], 1) : `${ang(Math.min(...xs), 1)}–${ang(Math.max(...xs), 1)}`;
    const E = u.el_nino, el = E && Object.values(E.lama || {}), em = E?.musim;
    const teksEl = el?.length ? ` Di musim El Niño, memakai musim El Niño sebelumnya saja: lama meleset ${rg(el.map(x => x.mae_analog))} hari vs ${rg(el.map(x => x.mae_umum))} hari dengan semua tahun${em ? `; akhir musim ${ang(em.mae_analog)} vs ${ang(em.mae_umum)} hari` : ""} (kasus yang sama).` : "";
    return `Uji pada musim ${th}: perkiraan lama kebakaran meleset rata-rata ${rg(mae)} hari, ${unggul ? "lebih baik dari" : "tidak lebih baik dari"} tebakan sederhana (2 kali umur api, ${rg(pemb)} hari)${m ? `; akhir musim meleset rata-rata ${ang(m.mae)} hari (tebakan umum ${ang(m.mae_pembanding)} hari)` : ""}.${teksEl} Pakai sebagai gambaran, bukan jadwal.`;
  }

  function html(a, u) {
    const li = xs => `<ul style="margin:0;padding-left:18px;font-size:12.5px;display:grid;gap:4px">${xs.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
    const sub = t => `<b style="display:block;font-size:12px;margin:10px 0 4px">${t}</b>`;
    return `${li(a.fakta)}
      ${sub(`Titik ${a.sen} per tahun, ${a.th[0]}–${a.thIni}`)}${batang(a.y, a.th, i => a.th[i] === a.thIni, "Titik per tahun")}
      <p class="fnd" style="margin:0">${a.thIni} sampai ${esc(new Date(a.sd + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "UTC"}))}.</p>
      ${sub("Titik per bulan, semua tahun")}${batang(a.m, ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], i => i === a.bulanPuncak, "Titik per bulan")}
      ${a.prakira.length ? sub("Prakiraan dari pola lokasi ini") + `<table class="tb2 br"><tbody>${a.prakira.map(([k, v, d]) => `<tr><td>${esc(k)}<small style="display:block;color:var(--ink2)">${esc(d)}</small></td><td class="n"><b>${esc(v)}</b></td></tr>`).join("")}</tbody></table>` : ""}
      ${a.faktor?.length ? sub("Faktor yang memengaruhi peluang api membesar di sini") + `<table class="tb2 br"><tbody>${a.faktor.map(f => `<tr><td>${esc(f.nama)}<small style="display:block;color:var(--ink2)">kondisi ${esc(f.kelas)}, dibanding ${esc(f.acuan)}</small></td><td class="n"><b style="color:${f.rasio >= 1.2 ? "var(--bad)" : f.rasio <= 0.8 ? "#3f7f5a" : "inherit"}">${kali(f.rasio)}×</b></td></tr>`).join("")}</tbody></table>
        <p class="fnd" style="margin:4px 0 0">Laju api membesar (≥ 140 ha dalam 72 jam) per kondisi, dari ${ang(a.nPeristiwa || 0)} peristiwa VIIRS 2012–2026. Satu variabel per baris, belum dikoreksi variabel lain; model terlatih di bawah memakai semuanya sekaligus (40 variabel).</p>` : ""}
      ${a.saran.length ? sub("Saran dari tren") + li(a.saran) : ""}
      <div style="margin-top:10px"><button type="button" class="btn btn-gelap" data-model-latih>Jalankan model terlatih, 72 jam</button><div data-model-hasil style="margin-top:8px"></div></div>
      <p class="fnd" style="margin-top:8px">Sumber: NASA FIRMS ${a.sen === "MODIS" ? `MODIS ${a.th[0]}–${a.thIni} (seri panjang) dan VIIRS S-NPP 2012–${a.thIni} (minggu ini, musim, lama, arah)` : `VIIRS S-NPP ${a.th[0]}–${a.thIni}`}, jendela ~16 km di sekitar pusat cluster. Prakiraan diambil dari kejadian masa lalu di lokasi ini, bukan simulasi; arah hari ini dari angin.</p>${teksUji(u) ? `<p class="fnd" style="margin-top:4px">${esc(teksUji(u))}</p>` : ""}`;
  }

  const ubin = {}, iklim = {}, ujiB = {}, dorong = {};
  async function isi(wadah, p) {
    const k = kunci(p.lat, p.lon);
    const [d, ik, ub, pd] = await Promise.all([ubin[k.ubin] ||= fetch(`data/riwayat_sel/${k.ubin}.json`).then(r => r.ok ? r.json() : null).catch(() => null),
      iklim.j ||= fetch("data/iklim.json").then(r => r.ok ? r.json() : null).catch(() => null),
      ujiB.j ||= fetch("data/riwayat_sel_uji.json").then(r => r.ok ? r.json() : null).catch(() => null),
      dorong.j ||= fetch("data/sebaran_pendorong.json").then(r => r.ok ? r.json() : null).catch(() => null)]);
    if (!wadah.isConnected) return;
    const rec = d?.c?.[k.sel];
    /* gerbang analog El Niño: hanya bila uji balik (kasus yang sama) membuktikan analog lebih tepat untuk lama DAN akhir musim */
    const E = ub?.el_nino, lolosAnalog = !!(E && Object.values(E.lama || {}).length && Object.values(E.lama).every(x => x.mae_analog < x.mae_umum) && (!E.musim || E.musim.mae_analog < E.musim.mae_umum));
    const A = rec && analisa(rec, d, p, ik?.status, {analog: lolosAnalog});
    if (A) { A.faktor = faktor(pd, p, A, ik); A.nPeristiwa = pd?.n_peristiwa; }
    wadah.innerHTML = rec ? html(A, ub) : `<p class="fnd">Lokasi ini tidak punya riwayat titik VIIRS sejak 2012 (kurang dari 20 titik dalam ~16 km): kebakaran di sini tidak biasa, pastikan dengan ground-check.</p>`;
    /* model terlatih (sebaran_model.js lewat SimData, sama dengan tab Simulasi): dijalankan hanya saat diminta karena memuat lahan + cuaca beberapa MB */
    const tb = wadah.querySelector("[data-model-latih]"), out = wadah.querySelector("[data-model-hasil]");
    if (tb) tb.onclick = async () => {
      if (typeof SimData === "undefined" || typeof SebaranModel === "undefined") { out.innerHTML = `<p class="fnd">Model terlatih belum termuat di halaman ini.</p>`; return; }
      tb.disabled = true; out.innerHTML = `<p class="fnd">Menjalankan model: memuat cuaca 40 hari dan peta lahan, sekitar setengah menit…</p>`;
      await new Promise(r => setTimeout(r, 0));   // tampilkan status dulu, baru kerja berat
      try {
        if (typeof lengkapiKluster === "function") await lengkapiKluster();   // api24 = sel awal model
        const f = (typeof S !== "undefined" ? S : null)?.kluster?.features.find(x => x.properties.id === p.id);   // S = const global index.html
        if (!f) throw new Error("cluster tidak ditemukan");
        await SimData.jalan({f, k: p.id});
        if (!wadah.isConnected) return;
        /* kartu() milik tab Simulasi: kalimat tentang garis di peta dan model fisika di bawahnya tidak berlaku di laci */
        out.innerHTML = SimData.hasil ? SimData.kartu().replace(/\s*Garis biru di peta[\s\S]*?pembanding\./, "") : `<p class="fnd">Model gagal dijalankan untuk cluster ini.</p>`;
      } catch (e) { out.innerHTML = `<p class="fnd">Model gagal: ${esc(e.message)}</p>`; }
      tb.disabled = false;
    };
  }

  const RiwayatSel = {kunci, analisa, html, isi, teksUji, faktor};
  if (typeof window !== "undefined") window.RiwayatSel = RiwayatSel;
  if (typeof module !== "undefined") module.exports = RiwayatSel;
})();
