"use strict";
/* Tab Tren gunung api: tiap blok = Kartu.ex (inti/kartu.js), sama dengan Tren karhutla/kekeringan. Kartu tanpa data dibuang (A18):
   riwayat harian (jumlah gunung per level, erupsi 24 jam) baru muncul setelah >= 2 hari terkumpul oleh scripts/gunungapi/magma.py; kejadian per tahun dari BNPB (data/dampak.json). */
const Tren = {
  D: undefined,
  kartu(ey, judul, isi, sumber, leg) { Kartu.leg(leg); return Kartu.ex(judul, "", "", isi, "Sumber: " + sumber).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${ey}</span>`); },
  /* batang berangka: v = [{n, t, tip}], bila n2 ada = batang kedua lebih sempit di depan */
  batang(v, {W = 940, H = 280, warna = "#e58a45", warna2 = "#c9503a", w2 = false, puncak = true} = {}) {
    const M = innerWidth < 640, Wd = M ? 700 : W, L = 34, B = H - 26, T = 22, gap = (Wd - L - 10) / v.length, bw = gap * .7, mx = Math.max(1, ...v.map(x => x.n || 0)), Y = x => B - x / mx * (B - T), pk = v.reduce((a, x, i) => x.n > v[a].n ? i : a, 0);
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${Wd - 4}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="11" opacity=".6">${rb(mx * f)}</text>`).join("");
    g += v.map((x, i) => { const px = L + i * gap + (gap - bw) / 2, ini = i === v.length - 1;
      if (x.kosong) return `<g data-tip="${x.tip}"><rect x="${px}" y="${T}" width="${bw}" height="${B - T}" fill="transparent"/><text x="${px + bw / 2}" y="${B - 6}" text-anchor="middle" font-size="${v.length > 14 ? 9.5 : 11}" opacity=".45" pointer-events="none">–</text>
        <text x="${px + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="${v.length > 14 ? 9.5 : 11}" opacity=".7" pointer-events="none">${x.t}</text></g>`;
      const lbl = fmt(x.n), pw = lbl.length * 11 * .6 + 16;
      return `<rect class="gy" style="--i:${i}" x="${px}" y="${Y(x.n)}" width="${bw}" height="${Math.max(1, B - Y(x.n))}" rx="3" fill="${warna}" opacity="${ini ? 1 : .8}" data-tip="${x.tip}"/>
        ${w2 && x.n2 ? `<rect class="gy" style="--i:${i}" x="${px + bw * .2}" y="${Y(x.n2)}" width="${bw * .6}" height="${Math.max(1, B - Y(x.n2))}" rx="2" fill="${warna2}" data-tip="${x.tip}"/>` : ""}
        ${puncak && i === pk ? `<g class="gf" style="--i:${i}">${Kartu.pil(px + bw / 2 - pw / 2, Y(x.n) - 26, lbl, "#c9503a", "#fff", 11)[0]}</g>` : `<text class="gf" style="--i:${i}" x="${px + bw / 2}" y="${Y(x.n) - 5}" text-anchor="middle" font-size="${v.length > 14 ? 9.5 : 11}" font-weight="800" opacity=".85" pointer-events="none">${fmt(x.n)}</text>`}
        <text x="${px + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="${v.length > 14 ? 9.5 : 11}" opacity=".7" pointer-events="none">${x.t}</text>`; }).join("");
    return `<div class="tw sk"><svg viewBox="0 0 ${Wd} ${H}" style="min-width:${M ? 700 : 0}px" role="img" aria-label="Tren">${g}</svg></div>`; },
  tgl: t => new Date(t + "T12:00:00+07:00").toLocaleDateString("id-ID", {day: "numeric", month: "short"}),

  /* 1. kejadian erupsi per tahun (BNPB) */
  kTahun() {
    const T = this.D?.tahunan, th = Object.keys(T || {}).sort().filter(t => T[t].kejadian != null); if (th.length < 3) return "";
    const v = th.map(t => ({n: T[t].kejadian, t: t.slice(2), tip: `<b>${t}</b><br>Kejadian erupsi gunung api: ${fmt(T[t].kejadian)}`})), pk = th.reduce((a, t) => T[t].kejadian > T[a].kejadian ? t : a, th[0]), akhir = th.at(-1);
    return this.kartu("Per tahun", `${Kartu.hl(fmt(T[akhir].kejadian) + " kejadian")} erupsi gunung api tercatat BNPB pada ${akhir}; tertinggi ${Kartu.hl(pk)} dengan ${fmt(T[pk].kejadian)} kejadian`,
      this.batang(v, {warna: "#e58a45"}), "BNPB, Data Bencana Indonesia 2010–" + akhir, [["#e58a45", "kejadian erupsi gunung api"], ["#c9503a", "tertinggi"]]); },

  /* hari yang tak punya baris riwayat di antara hari pertama dan terakhir (pekerjaan harian terbunuh): tetap digambar sebagai "–" tidak tercatat, TIDAK diinterpolasi atau dipadatkan */
  denganBolong(r) {
    const out = []; r.forEach((x, i) => { if (i) for (let t = Date.parse(r[i - 1].tgl + "T12:00:00Z") + 864e5; t < Date.parse(x.tgl + "T12:00:00Z"); t += 864e5) { const tg = new Date(t).toISOString().slice(0, 10);
      out.push({kosong: 1, tgl: tg, t: this.tgl(tg), tip: `<b>${this.tgl(tg)}</b><br>Tidak tercatat`}); } out.push(x); }); return out; },

  /* 2. gunung berstatus Waspada ke atas per hari (riwayat harian magma.py) */
  kLevel() {
    const r0 = S.st?.riwayat || []; if (r0.length < 2) return "";
    const r = this.denganBolong(r0), bolong = r.filter(x => x.kosong).map(x => x.t);
    const v = r.map(x => x.kosong ? x :  { const n = x.level; return {n: (n[2] || 0) + (n[3] || 0) + (n[4] || 0), n2: (n[3] || 0) + (n[4] || 0), t: this.tgl(x.tgl),
      tip: `<b>${this.tgl(x.tgl)}</b><br>Waspada ke atas: ${fmt((n[2] || 0) + (n[3] || 0) + (n[4] || 0))} gunung<br>Siaga atau Awas: ${fmt((n[3] || 0) + (n[4] || 0))} gunung`}; }), a = v.at(-1), b = v[0];
    return this.kartu("Status harian", `${Kartu.hl(fmt(a.n) + " gunung")} berstatus Waspada ke atas pada ${a.t}, ${a.n > b.n ? "naik" : a.n < b.n ? "turun" : "sama"} ${a.n === b.n ? "dengan" : "dari"} ${fmt(b.n)} gunung pada ${b.t}`,
      this.batang(v, {warna: WARNA_LV[2], warna2: WARNA_LV[3], w2: true, puncak: false}), "MAGMA Indonesia, PVMBG; dicatat Pantau Bencana tiap pembaruan", [[WARNA_LV[2], "Waspada ke atas"], [WARNA_LV[3], "Siaga atau Awas"]]); },

  /* 3. erupsi 24 jam per hari (hanya hari dengan daftar MAGMA yang mencapai 24 jam) */
  kErupsi() {
    const r = (S.st?.riwayat || []).filter(x => x.erupsi != null); if (r.length < 2) return "";
    const v = r.map(x => ({n: x.erupsi, t: this.tgl(x.tgl), tip: `<b>${this.tgl(x.tgl)}</b><br>Erupsi 24 jam: ${fmt(x.erupsi)}`})), pk = v.reduce((a, x, i) => x.n > v[a].n ? i : a, 0);
    return this.kartu("Erupsi harian", `${Kartu.hl(fmt(v.at(-1).n) + " erupsi")} dalam 24 jam terakhir; terbanyak ${Kartu.hl(fmt(v[pk].n) + " erupsi")} pada ${v[pk].t}`,
      this.batang(v, {warna: BATA}), "MAGMA Indonesia, informasi letusan; dicatat Pantau Bencana tiap pembaruan", [[BATA, "erupsi dalam 24 jam"], ["#c9503a", "terbanyak"]]); },

  /* 4. gunung naik atau turun level per hari (perubahan yang dicatat Pantau Bencana + tren di abu_gunungapi.json); dibuang bila belum ada perubahan */
  kNaik() {
    const ev = new Map(), tambah = (nm, tgl, dari, ke) => ev.set(nm + tgl + dari + ke, {nm, tgl, dari, ke});
    (S.st?.perubahan || []).forEach(p => tambah(p.nama, p.tgl, p.dari, p.ke));
    (this.abu?.tren || []).forEach(t => tambah(t.nama, new Date(t.waktu).toLocaleDateString("en-CA", WIB), t.dari, t.ke));
    const E = [...ev.values()]; if (!E.length) return "";
    const hari = [...new Set([...(S.st?.riwayat || []).map(r => r.tgl), ...E.map(e => e.tgl)])].sort(); if (hari.length < 2) return "";
    const naik = E.filter(e => e.ke > e.dari).length, turun = E.length - naik;
    const v = hari.map(t => { const d = E.filter(e => e.tgl === t), n = d.filter(e => e.ke > e.dari).length;
      return {n: d.length, n2: n, t: this.tgl(t), tip: `<b>${this.tgl(t)}</b><br>Naik level: ${fmt(n)} gunung<br>Turun level: ${fmt(d.length - n)} gunung${d.length ? "<br>" + esc(d.map(e => e.nm).join(", ")) : ""}`}; });
    return this.kartu("Naik turun level", `${Kartu.hl(fmt(naik) + " gunung")} naik level dan ${Kartu.hl(fmt(turun) + " gunung")} turun dalam ${fmt(hari.length)} hari terakhir`,
      this.batang(v, {warna: WARNA_LV[2], warna2: WARNA_LV[4], w2: true, puncak: false}), "MAGMA Indonesia, PVMBG; dicatat Pantau Bencana tiap pembaruan", [[WARNA_LV[2], "perubahan level"], [WARNA_LV[4], "naik"]]); },

  async render() {
    const el = $("#tren"); if (!el) return;
    if (this.D === undefined) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat tren gunung api…</div>`; this.D = await muatJSON("data/dampak.json").catch(() => null); }
    this.abu = await Data.abu();
    el.innerHTML = [this.kTahun, this.kLevel, this.kNaik, this.kErupsi].map(f => { try { return f.call(this); } catch (e) { console.error(e); return ""; } }).join("") || `<p class="kosong">Belum ada tren.</p>`; },
};
