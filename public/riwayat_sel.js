/* riwayat_sel.js — "Tren lokasi & prakiraan" di laci cluster: watak kebakaran di sekitar pusat cluster (jendela ~16 km)
   dari arsip VIIRS S-NPP 2012-2026 (public/data/riwayat_sel/<tx>_<ty>.json, scripts/data/riwayat_sel.py), digabung kondisi hari ini
   (angin, FWI, DC, gambut, umur api) menjadi fakta, prakiraan, dan saran.
   RiwayatSel.kunci(lat, lon) -> {ubin, sel}; RiwayatSel.analisa(rec, meta, p, enso) fungsi murni (diuji di tests/agen/riwayat-sel.test.mjs);
   RiwayatSel.html(a); RiwayatSel.isi(wadah, p) memuat ubin lalu menggambar. Prakiraan = pola masa lalu, bukan model fisika. */
(() => {
  "use strict";
  const X0 = 94.5, Y1 = 6.5, SEL = 0.05, TAHUN_AKTIF = 10, EL_NINO = [2015, 2019, 2023];
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
  function analisa(rec, meta, p, enso) {
    const th0 = meta.th0, sd = new Date(meta.sd + "T00:00:00Z"), thIni = sd.getUTCFullYear(), doyIni = Math.round((sd - Date.UTC(thIni, 0, 1)) / 864e5) + 1;
    const th = rec.y.map((_, i) => th0 + i), penuh = th.filter(t => t < thIni), y = t => rec.y[t - th0], yd = t => rec.yd[t - th0];
    const aktif = penuh.filter(t => y(t) >= TAHUN_AKTIF), puncak = penuh.reduce((a, t) => y(t) > y(a) ? t : a, penuh[0]);
    const fakta = [], prakira = [], saran = [];
    const a = {th, y: rec.y, m: rec.m, thIni, sd: meta.sd, fakta, prakira, saran, aktif: aktif.length, penuh: penuh.length};

    /* 1. kekerapan */
    fakta.push(aktif.length
      ? `Terbakar ${aktif.length} dari ${penuh.length} tahun (${th0}–${thIni - 1}); terakhir ${aktif[aktif.length - 1]}, terparah ${puncak} dengan ${ang(y(puncak))} titik.`
      : `Dalam ${penuh.length} tahun terakhir lokasi ini belum pernah mencapai ${TAHUN_AKTIF} titik setahun: kebakaran di sini tidak biasa.`);

    /* 2. tahun ini vs tahun-tahun lalu sampai tanggal yang sama */
    const lalu = penuh.map(yd), rLalu = rata(lalu), ini = yd(thIni);
    const peringkat = 1 + lalu.filter(v => v > ini).length;
    if (ini > 0) {
      const banding = rLalu >= 1 ? `, ${kali(ini / rLalu)} kali rata-rata ${th0}–${thIni - 1}` : "";
      fakta.push(`${thIni} sampai ${tglDoy(doyIni)}: ${ang(ini)} titik${banding}; ${peringkat === 1 ? "tertinggi sejak " + th0 : "urutan ke-" + peringkat + " dari " + (penuh.length + 1) + " tahun"}.`);
    }
    a.tahunIni = {ini, rLalu, peringkat};

    /* 3. tren 5 tahun terakhir vs 5 tahun sebelumnya (tahun penuh) */
    const b5 = penuh.slice(-5), s5 = penuh.slice(-10, -5), rb = rata(b5.map(y)), rs = rata(s5.map(y));
    if (s5.length === 5 && rs + rb >= 10) {
      const r = rs ? rb / rs : Infinity;
      a.tren = r >= 1.5 ? "naik" : r <= 0.67 ? "turun" : "datar";
      fakta.push(`Tren: rata-rata ${b5[0]}–${b5[4]} ${ang(Math.round(rb))} titik/tahun, ${s5[0]}–${s5[4]} ${ang(Math.round(rs))} (${a.tren === "naik" ? "naik" : a.tren === "turun" ? "turun" : "relatif sama"}${rs && a.tren !== "datar" ? ", " + kali(r) + "×" : ""}).`);
    }

    /* 4. El Niño */
    const en = penuh.filter(t => EL_NINO.includes(t)), bi = penuh.filter(t => !EL_NINO.includes(t)), re = rata(en.map(y)), rbi = rata(bi.map(y));
    if (re >= 10) {
      a.elNino = rbi >= 1 ? re / rbi : null;
      fakta.push(`Di tahun El Niño (${en.join(", ")}) rata-rata ${ang(Math.round(re))} titik, ${a.elNino ? kali(a.elNino) + " kali tahun biasa" : "tahun biasa hampir nol"}.${enso && /El Ni/.test(enso) ? ` ${thIni} juga tahun El Niño.` : ""}`);
    }

    /* 5. musim */
    const tot = rec.m.reduce((x, v) => x + v, 0);
    if (tot) {
      const bp = rec.m.indexOf(Math.max(...rec.m)), porsi = Math.round(rec.m[bp] / tot * 100);
      a.bulanPuncak = bp;
      fakta.push(`Bulan paling rawan: ${BULAN[bp]} (${porsi}% dari semua titik${rec.s ? `); musim biasanya ${tglDoy(rec.s[0])} sampai ${tglDoy(rec.s[1])}.` : ")."}`);
    }
    if (rec.nm >= 40) fakta.push(`${rec.nm}% deteksi terjadi malam hari: api di sini cenderung terus membara setelah siang, ciri kebakaran gambut.`);

    /* PRAKIRAAN */
    const turun = p.wd != null && p.ws != null ? (p.wd + 180) % 360 : null;
    if (turun != null && p.ws >= 5) prakira.push(["Arah jalar hari ini", `ke ${arahDari(turun)}`, `angin ${ang(p.ws)} km/jam dari ${arahDari(p.wd)}`]);
    if (rec.v && rec.v[1] >= 0.3) prakira.push(["Arah jalar historis", `ke ${arahDari(rec.v[0])}`, `${ang(rec.v[3])} pergeseran harian, konsistensi ${ang(Math.round(rec.v[1] * 100))}%`]);
    else if (rec.v) prakira.push(["Arah jalar historis", "tidak tetap", "pusat api di masa lalu bergeser ke berbagai arah"]);
    if (rec.v) prakira.push(["Laju geser pusat api", `sekitar ${ang(rec.v[2], 1)} km/hari`, `median ${ang(rec.v[3])} pergeseran harian ${th0}–${thIni}`]);
    const banyak = (rec.r || []).length >= 8;
    if (rec.x) prakira.push(["Jangkauan", `${ang(rec.x[0], 1)} km`, `separuh episode meluas sejauh ini dari titik awal${banyak ? `; 1 dari 4 lebih dari ${ang(rec.x[1], 1)} km` : ""}`]);
    const r = rec.r || [];
    if (r.length >= 3) {
      const h = Math.max(1, p.hari || 1), lanjut = r.filter(v => v >= h), mTot = median(lanjut.length >= 3 ? lanjut : r);
      /* kuartil baru bermakna dari >= 8 episode; di bawah itu cukup median dan terlama */
      a.lama = {median: median(r), p75: r.length >= 8 ? kuantil(r, .75) : null, n: r.length, sisa: lanjut.length >= 3 ? Math.max(0, Math.round(mTot - h)) : null};
      prakira.push(["Lama kebakaran", `median ${ang(a.lama.median)} hari`, `${ang(r.length)} episode${a.lama.p75 ? `; 1 dari 4 lebih dari ${ang(a.lama.p75)} hari` : ""}, terlama ${ang(r[r.length - 1])} hari`]);
      if (a.lama.sisa != null && p.teramati !== false) prakira.push(["Perkiraan sisa", a.lama.sisa ? `sekitar ${ang(a.lama.sisa)} hari lagi` : "mendekati akhir",
        `episode yang sudah bertahan ${ang(h)} hari di sini biasanya total ${ang(Math.round(mTot))} hari (${ang(lanjut.length)} kejadian)`]);
    }
    if (rec.s) {
      a.sisaMusim = rec.s[1] - doyIni;
      prakira.push(["Akhir musim", a.sisaMusim > 0 ? `sekitar ${tglDoy(rec.s[1])}` : "biasanya sudah lewat", a.sisaMusim > 0 ? `${ang(a.sisaMusim)} hari lagi menurut median musim ${th0}–${thIni - 1}` : `median akhir musim ${tglDoy(rec.s[1])}; api ini terlambat dari kebiasaan`]);
    }
    if (rec.k >= 2) prakira.push(["Kekambuhan", `${ang(rec.k, 1)} episode/tahun`, "di tahun terbakar, api biasanya muncul lagi setelah sempat padam"]);

    /* SARAN dari pola di atas */
    const lamaPanjang = a.lama && a.lama.median >= 7, gambut = p.gambut || rec.nm >= 40;
    if (lamaPanjang) saran.push(`Siapkan operasi panjang: api di sini biasanya ${ang(a.lama.median)} hari. Atur rotasi regu dan logistik minimal ${ang(a.lama.p75 || a.lama.median)} hari.`);
    if (gambut && (p.dc > 300 || rec.nm >= 40)) saran.push("Gambut kering dan api membara malam: pasang sumur bor dan embung di tepi api, lakukan injeksi gambut, jangan tinggalkan lokasi setelah api permukaan padam.");
    if (turun != null && p.ws >= 5) saran.push(`Bangun sekat bakar dan tempatkan regu di sisi ${arahDari(turun)}${rec.v && rec.v[1] >= 0.3 && arahDari(rec.v[0]) !== arahDari(turun) ? ` dan ${arahDari(rec.v[0])} (arah jalar historis)` : ""}, searah angin.`);
    else if (rec.v && rec.v[1] >= 0.3) saran.push(`Jaga sisi ${arahDari(rec.v[0])}: api di lokasi ini berulang kali bergerak ke sana.`);
    const radius = rec.x && (banyak ? rec.x[1] : rec.x[0]);
    if (radius >= 5) saran.push(`Siagakan desa dan kebun dalam radius ${ang(Math.ceil(radius))} km; sejauh itu api di sini biasa meluas.`);
    if (rec.k >= 2) saran.push("Api di sini sering kambuh: lanjutkan mop-up dan patroli minimal 14 hari setelah dinyatakan padam.");
    if (a.tahunIni.ini && a.tahunIni.rLalu >= 1 && a.tahunIni.ini / a.tahunIni.rLalu >= 2) saran.push(`Tahun ini sudah ${kali(a.tahunIni.ini / a.tahunIni.rLalu)} kali rata-rata: tambah alokasi regu dan anggaran untuk lokasi ini.`);
    if (a.sisaMusim > 14) saran.push(`Jaga kesiagaan sampai ${tglDoy(rec.s[1])}; musim di sini biasanya belum berakhir sebelum itu.`);
    if (a.aktif >= Math.ceil(a.penuh / 3)) saran.push(`Lokasi langganan: masukkan ke patroli pencegahan rutin mulai ${rec.s ? BULAN[new Date(Date.UTC(2026, 0, Math.max(1, rec.s[0] - 30))).getUTCMonth()] : "Juni"}, sebulan sebelum musim di sini biasanya mulai.`);
    if (a.tren === "naik") saran.push("Kebakaran di sini makin sering 5 tahun terakhir: cari penyebabnya (pembukaan lahan, kanal baru) bersama pemilik lahan.");
    if (!aktif.length) saran.push("Lokasi tanpa riwayat: pastikan dengan ground-check, bisa api baru dari pembukaan lahan.");
    return a;
  }

  function batang(nilai, label, sorot, judul) {
    const m = Math.max(...nilai, 1), n = nilai.length, w = 100 / n, lb = x => x >= 1000 ? (Math.round(x / 100) / 10 + "rb").replace(".", ",") : x;
    return `<svg viewBox="0 0 100 32" width="100%" role="img" aria-label="${esc(judul)}">${nilai.map((x, i) => { const h = Math.max(.6, x / m * 18);
      return `<rect x="${i * w + w * .15}" y="${24 - h}" width="${w * .7}" height="${h}" rx=".8" fill="${sorot(i) ? "#c9503a" : "#e58a45"}" data-tip="<b>${esc(label[i])}</b><br>${ang(x)} titik"/>`
        + (x ? `<text x="${i * w + w / 2}" y="${22.4 - h}" text-anchor="middle" font-size="2.6" font-weight="700" fill="var(--ink2)" pointer-events="none">${lb(x)}</text>` : "")
        + `<text x="${i * w + w / 2}" y="29" text-anchor="middle" font-size="2.6" fill="var(--ink2)" pointer-events="none">${esc(typeof label[i] === "number" ? String(label[i]).slice(-2) : label[i])}</text>`; }).join("")}</svg>`;
  }

  function html(a) {
    const li = xs => `<ul style="margin:0;padding-left:18px;font-size:12.5px;display:grid;gap:4px">${xs.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
    const sub = t => `<b style="display:block;font-size:12px;margin:10px 0 4px">${t}</b>`;
    return `${li(a.fakta)}
      ${sub(`Titik per tahun, ${a.th[0]}–${a.thIni}`)}${batang(a.y, a.th, i => a.th[i] === a.thIni, "Titik per tahun")}
      <p class="fnd" style="margin:0">${a.thIni} sampai ${esc(new Date(a.sd + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", timeZone: "UTC"}))}.</p>
      ${sub("Titik per bulan, semua tahun")}${batang(a.m, ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"], i => i === a.bulanPuncak, "Titik per bulan")}
      ${a.prakira.length ? sub("Prakiraan dari pola lokasi ini") + `<table class="tb2 br"><tbody>${a.prakira.map(([k, v, d]) => `<tr><td>${esc(k)}<small style="display:block;color:var(--ink2)">${esc(d)}</small></td><td class="n"><b>${esc(v)}</b></td></tr>`).join("")}</tbody></table>` : ""}
      ${a.saran.length ? sub("Saran dari tren") + li(a.saran) : ""}
      <p class="fnd" style="margin-top:8px">Sumber: NASA FIRMS VIIRS S-NPP ${a.th[0]}–${a.thIni}, jendela ~16 km di sekitar pusat cluster. Prakiraan diambil dari kejadian masa lalu di lokasi ini, bukan simulasi; arah hari ini dari angin.</p>`;
  }

  const ubin = {}, iklim = {};
  async function isi(wadah, p) {
    const k = kunci(p.lat, p.lon);
    const [d, ik] = await Promise.all([ubin[k.ubin] ||= fetch(`data/riwayat_sel/${k.ubin}.json`).then(r => r.ok ? r.json() : null).catch(() => null),
      iklim.j ||= fetch("data/iklim.json").then(r => r.ok ? r.json() : null).catch(() => null)]);
    if (!wadah.isConnected) return;
    const rec = d?.c?.[k.sel];
    wadah.innerHTML = rec ? html(analisa(rec, d, p, ik?.status)) : `<p class="fnd">Lokasi ini tidak punya riwayat titik VIIRS sejak 2012 (kurang dari 20 titik dalam ~16 km): kebakaran di sini tidak biasa, pastikan dengan ground-check.</p>`;
  }

  const RiwayatSel = {kunci, analisa, html, isi};
  if (typeof window !== "undefined") window.RiwayatSel = RiwayatSel;
  if (typeof module !== "undefined") module.exports = RiwayatSel;
})();
