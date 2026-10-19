"use strict";
/* Kartu peluang bersama (public/inti), membaca berkas kontrak "peluang/1" (scripts/umum/peluang.py): public/<id>/data/peluang.json.
   Judul = `vonis` wilayah apa adanya (angka persen disorot); grafik = strip per hari (tinggi = peluang ambang terpilih); batasan + uji balik
   HANYA lewat Peluang.batasan() untuk tab Metode. Butuh format.js (esc, fmt) dan kartu.js (Kartu) lebih dulu; tooltip lewat #tip (tip.js, rapikanTip).
   Pemakaian (halaman memegang state `st` dan menggambar ulang lewat nanti(), seperti kartu Insight lain):
     const d = await Peluang.muat("data/peluang.json");                       // null bila gagal / bukan peluang/1 -> kartu dibuang
     Peluang.kartu(d, {ey: "Peluang", st: Insight.st, kunci: "pel", sumber, kejadian: "gempa"})
        kontrol bergulir lewat atribut data-set="<kunci>W" (select wilayah) dan data-set="<kunci>A" (segmen ambang) -> isi st[...] lalu gambar ulang.
        wilayah / ambang (kode `k`) dapat juga diberikan langsung di opsi; tak sah -> wilayah nasional / ambang pertama yang punya data.
     Peluang.batasan(d)  -> <details class="mt-sek"> bergaya metode.css; "<b>0. " diganti nomor oleh Metode halaman. */
const Peluang = (() => {
  const WARNA = ["#d9a441", "#d4702a", "#a8321f", "#6e1d14", "#4a130d"], TINGKAT = ["nasional", "provinsi", "kabupaten", "titik"];
  const H3 = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"], HL = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"], BL = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const cache = new Map();
  const sah = d => !!d && d.versi === "peluang/1" && Array.isArray(d.ambang) && d.ambang.length > 0 && !!d.wilayah && Object.keys(d.wilayah).length > 0;
  /* peluang -> teks: tidak pernah "100%" (peluang sungguh tak pernah pasti), nilai kecil tetap tampil */
  const pct = p => p == null || !isFinite(p) ? null : p >= .995 ? ">99%" : p > 0 && p < .005 ? "<1%" : Math.round(p * 100) + "%";
  const tgl = t => { const d = new Date(t + "T12:00:00Z"); return {h3: H3[d.getUTCDay()], hari: HL[d.getUTCDay()], tg: d.getUTCDate(), bln: BL[d.getUTCMonth()]}; };
  const angka = (v, des) => Number(v).toLocaleString("id-ID", {minimumFractionDigits: des, maximumFractionDigits: des});
  /* "Magnitudo 5 atau lebih" -> "M 5+" (satuan pendek), selain itu "... atau lebih" -> "...+" */
  const pendek = (a, b) => { let s = String(a.label).replace(/\s+atau lebih.*$/i, "+"); const l = b?.label, u = b?.satuan;
    if (l && u && u.length <= 2 && s.startsWith(l)) s = u + s.slice(l.length); return s; };
  const awal = d => Object.keys(d.wilayah).find(k => d.wilayah[k].tingkat === "nasional") ?? Object.keys(d.wilayah)[0];
  const urut = d => Object.keys(d.wilayah).sort((a, b) => { const A = d.wilayah[a], B = d.wilayah[b];
    return TINGKAT.indexOf(A.tingkat) - TINGKAT.indexOf(B.tingkat) || String(A.nama).localeCompare(String(B.nama), "id"); });

  /* judul satu kalimat: titik akhir dibuang, ". Kalimat" antar kalimat jadi "; kalimat" kecuali sesudah singkatan (Kab. Malang tetap) */
  const SINGKAT = new Set(["kab", "kep", "kec", "dr", "prof", "st", "h", "hj", "tk", "jl", "no"]);
  const vonis1 = v => String(v).trim().replace(/\.$/, "").replace(/(\S+)\.\s+(\p{Lu})/gu, (m, k, c) => SINGKAT.has(k.replace(/[^\p{L}]/gu, "").toLowerCase()) ? m : k + "; " + c.toLowerCase());
  const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  /* entri bulanan (jarak antar entri >= 28 hari): label sumbu "Nov 2026" */
  const bulanan = H => H.length > 1 && H.slice(1).every((h, k) => (Date.parse(h.t) - Date.parse(H[k].t)) / 864e5 >= 28);

  function tip(d, h, i, bln) {
    const t = tgl(h.t), B = d.besaran || {}, des = B.desimal ?? 1, u = B.satuan ? " " + B.satuan : "";
    let o = `<b>${bln ? BLN[+h.t.slice(5, 7) - 1] + " " + h.t.slice(0, 4) : `${t.hari}, ${t.tg} ${t.bln}`}</b>`;
    d.ambang.forEach((a, i) => { const p = pct(h.p?.[i]); if (p) o += `<br>${esc(a.label)}: ${p}`; });
    if (h.p_dasar?.[i] != null) o += `<br>Normalnya: ${pct(h.p_dasar[i])}`;
    if (h.p50 != null) o += `<br>Median: ${angka(h.p50, des)}${u}`;
    if (h.p10 != null && h.p90 != null) o += `<br>Rentang p10 sampai p90: ${angka(h.p10, des)} sampai ${angka(h.p90, des)}${u}`;
    return o; }

  /* strip batang tegak: satu batang per hari, % di atas batang (nilai kecil tetap tertulis), label hari "Sel 20" */
  function grafik(d, w, i, aria) {
    const H = w.hari || [], n = H.length; if (!n) return "";
    const M = typeof innerWidth === "number" && innerWidth < 640, W = M ? Math.max(350, n * 34 + 60) : 940, L = 20, R = 20, T = 36, B = 200, gap = (W - L - R) / n, bw = Math.min(gap * .66, 64);
    const bln = bulanan(H), P = H.map(h => h.p?.[i] ?? null), DS = H.map(h => h.p_dasar?.[i] ?? null), mx = Math.max(.1, ...P.filter(v => v != null), ...DS.filter(v => v != null)), Y = v => B - v / mx * (B - T), fs = n > 24 ? 9.5 : 11.5;
    const datar = P.every(v => v === P[0]), puncak = datar ? -1 : P.indexOf(Math.max(...P.filter(v => v != null))), warna = WARNA[i % WARNA.length];
    const g = H.map((h, k) => { const x = L + k * gap + (gap - bw) / 2, v = P[k], tx = pct(v), t = tgl(h.t), cx = x + bw / 2;
      let s = `<g class="gy" style="--i:${k}" data-tip="${esc(tip(d, h, i, bln))}">${v != null && v > 0 ? `<rect x="${x}" y="${Y(v)}" width="${bw}" height="${Math.max(2, B - Y(v))}" rx="${Math.min(4, bw / 3)}" fill="${warna}" opacity=".93"/>` : ""}<rect x="${L + k * gap}" y="${T}" width="${gap}" height="${B - T}" fill="transparent"/>${DS[k] != null ? `<line x1="${x - 4}" x2="${x + bw + 4}" y1="${Y(DS[k])}" y2="${Y(DS[k])}" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3" opacity=".6"/>` : ""}</g>`;
      if (tx) { const yy = v > 0 ? Y(v) : B; s += k === puncak ? Kartu.pil(cx - (tx.length * 6.6 + 16) / 2, yy - 26, esc(tx), "#c9503a", "#fff", 11)[0]
        : `<text x="${cx}" y="${yy - 6}" text-anchor="middle" font-size="${fs}" font-weight="700" opacity=".75" pointer-events="none">${esc(tx)}</text>`; }
      return s + `<text x="${cx}" y="${B + 16}" text-anchor="middle" font-size="10.5" opacity=".7">${bln ? BL[+h.t.slice(5, 7) - 1] + " " + h.t.slice(0, 4) : t.h3 + " " + t.tg}</text>`; }).join("");
    return `<div class="tw sk"><svg viewBox="0 0 ${W} ${B + 24}" style="min-width:${M ? W : 0}px" role="img" aria-label="${esc(aria)}"><line x1="${L}" x2="${W - R}" y1="${B}" y2="${B}" stroke="currentColor" opacity=".15"/>${g}</svg></div>`; }

  return {
    sah, pct,
    /* muat berkas; null bila gagal atau bukan peluang/1 (kartu pemanggil dibuang, tabel kosong bukan bukti aman) */
    muat(url) { if (!cache.has(url)) cache.set(url, fetch(url).then(r => r.ok ? r.json() : null).then(d => sah(d) ? d : null).catch(() => null).then(d => { if (!d) cache.delete(url); return d; })); return cache.get(url); },
    kartu(d, o = {}) {
      if (!sah(d)) return "";
      const k = o.kunci || "pel", st = o.st || {}, wk = o.wilayah ?? st[k + "W"], kode = d.wilayah[wk] ? wk : awal(d), w = d.wilayah[kode];
      const ada = d.ambang.map((_, i) => i).filter(i => (w.hari || []).some(h => h.p?.[i] != null)), pil = ada.length ? ada : d.ambang.map((_, i) => i);
      const ak = o.ambang ?? st[k + "A"], idx = pil.find(i => d.ambang[i].k === ak) ?? pil[0];
      const sel = Object.keys(d.wilayah).length > 1 ? `<select data-set="${k}W" aria-label="Pilih wilayah">${urut(d).map(c => `<option value="${esc(c)}"${c === kode ? " selected" : ""}>${esc(d.wilayah[c].nama)}</option>`).join("")}</select>` : "";
      const seg = pil.length > 1 ? Kartu.seg(k + "A", pil.map(i => [d.ambang[i].k, esc(pendek(d.ambang[i], d.besaran))]), {[k + "A"]: d.ambang[idx].k}) : "";
      const jd = esc(vonis1(w.vonis || w.nama || "")).replace(/(?:&gt;|&lt;)?\d[\d.,]*\s?%/g, Kartu.hl);
      const aria = `Peluang ${o.kejadian || ""} per hari, ${d.ambang[idx].label}, ${w.nama}`.replace(/\s+/g, " ");
      return Kartu.kartu(o.ey || "Peluang", jd, grafik(d, w, idx, aria), o.sumber ?? d.sumber ?? "", sel + seg, [...d.ambang.map((a, i) => [WARNA[i % WARNA.length], esc(a.label)]), ...((w.hari || []).some(h => h.p_dasar) ? [["#8a8f98", "normal"]] : [])]); },

    /* bab Metode: batasan[] + uji_balik; "" bila keduanya kosong */
    batasan(d, o = {}) {
      if (!sah(d)) return "";
      const li = L => `<ul>${L.map(x => `<li><span>${x}</span></li>`).join("")}</ul>`, bt = (d.batasan || []).map(esc), ub = d.uji_balik, baris = [];
      if (ub) { if (ub.latih && ub.uji) baris.push(`Dilatih pada ${esc(ub.latih)}, diuji pada ${esc(ub.uji)}.`);
        for (const [nm, v] of Object.entries(ub)) {
          if (v && typeof v === "object" && "dari" in v) baris.push(`${esc(nm.replace(/_/g, " "))}: ${fmt(v.dalam_selang)} dari ${fmt(v.dari)} masuk selang 90%.`);
          else if (v && typeof v === "object") for (const [k2, e] of Object.entries(v)) { if (e && typeof e === "object" && "teramati" in e)
            baris.push(`${esc(e.label || k2)}: teramati ${fmt(e.teramati)}, harapan ${fmt(e.harapan)}${e.selang90 ? `, selang 90% ${fmt(e.selang90[0])} sampai ${fmt(e.selang90[1])}` : ""} (${e.dalam_selang ? "dalam selang" : "di luar selang"}).`); }
          else if (!["latih", "uji"].includes(nm) && v != null) baris.push(`${esc(nm.replace(/_/g, " "))}: ${esc(v)}`); } }
      if (!bt.length && !baris.length) return "";
      const ik = `<svg class="mt-ikon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/></svg>`;
      return `<details class="mt-sek"><summary><span class="mt-nom">${ik}</span><span class="mt-jd"><b>0. ${esc(o.judul || "Peluang dan batasnya")}</b><small>ambang, rentang, dan uji balik</small></span></summary>
    <div class="mt-isi"><div class="mt-singkat"><span class="mt-lbl">Singkatnya</span><p>Peluang adalah pecahan dari ${fmt(d.anggota)} anggota atau catatan yang melewati ambang. Itu perkiraan, bukan kepastian.</p></div>
      ${baris.length ? `<details class="mt-tek"><summary>Uji balik</summary><div class="mt-tekisi">${baris.map(x => `<p>${x}</p>`).join("")}</div></details>` : ""}
      ${bt.length ? `<div class="mt-batas"><span class="mt-lbl">Batasan</span>${li(bt)}</div>` : ""}</div></details>`; },
  };
})();
