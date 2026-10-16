"use strict";
/* Tab Tren gunung api: tiap blok = Kartu.ex (inti/kartu.js), sama dengan Tren karhutla/kekeringan. Kartu tanpa data dibuang (A18):
   riwayat harian (jumlah gunung per level, erupsi 24 jam) baru muncul setelah >= 2 hari terkumpul oleh scripts/gunungapi/magma.py; kejadian per tahun dari BNPB (data/dampak.json). */
const Tren = {
  D: undefined,
  kartu(ey, judul, isi, sumber, leg) { Kartu.leg(leg); return Kartu.ex(judul, "", "", isi, "Sumber: " + sumber).replace('<span class="ex-ey"></span>', `<span class="ex-ey">${ey}</span>`); },
  /* batang berangka: v = [{n, t, tip}], bila n2 ada = batang kedua lebih sempit di depan */
  batang(v, {W = 940, H = 280, warna = "#e58a45", warna2 = "#c9503a", w2 = false, puncak = true} = {}) {
    const M = innerWidth < 640, Wd = M ? 700 : W, L = 34, B = H - 26, T = 22, gap = (Wd - L - 10) / v.length, bw = gap * .7, mx = Math.max(1, ...v.map(x => x.n)), Y = x => B - x / mx * (B - T), pk = v.reduce((a, x, i) => x.n > v[a].n ? i : a, 0);
    let g = [0, .5, 1].map(f => `<line x1="${L}" x2="${Wd - 4}" y1="${Y(mx * f)}" y2="${Y(mx * f)}" stroke="currentColor" opacity=".08"/><text x="${L - 6}" y="${Y(mx * f) + 4}" text-anchor="end" font-size="11" opacity=".6">${rb(mx * f)}</text>`).join("");
    g += v.map((x, i) => { const px = L + i * gap + (gap - bw) / 2, ini = i === v.length - 1, lbl = fmt(x.n), pw = lbl.length * 11 * .6 + 16;
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
    return this.kartu("Per tahun", `${Kartu.hl(fmt(T[akhir].kejadian) + " kejadian")} erupsi gunung api tercatat BNPB pada ${akhir}; tertinggi ${Kartu.hl(pk)} dengan ${fmt(T[pk].kejadian)}`,
      this.batang(v, {warna: "#e58a45"}), "BNPB, Data Bencana Indonesia 2010–" + akhir, [["#e58a45", "kejadian erupsi gunung api"], ["#c9503a", "tertinggi"]]); },

  /* 2. gunung berstatus Waspada ke atas per hari (riwayat harian magma.py) */
  kLevel() {
    const r = S.st?.riwayat || []; if (r.length < 2) return "";
    const v = r.map(x => { const n = x.level; return {n: (n[2] || 0) + (n[3] || 0) + (n[4] || 0), n2: (n[3] || 0) + (n[4] || 0), t: this.tgl(x.tgl),
      tip: `<b>${this.tgl(x.tgl)}</b><br>Waspada ke atas: ${fmt((n[2] || 0) + (n[3] || 0) + (n[4] || 0))} gunung<br>Siaga atau Awas: ${fmt((n[3] || 0) + (n[4] || 0))} gunung`}; }), a = v.at(-1), b = v[0];
    return this.kartu("Status harian", `${Kartu.hl(fmt(a.n) + " gunung")} berstatus Waspada ke atas pada ${a.t}, ${a.n > b.n ? "naik" : a.n < b.n ? "turun" : "sama"} ${a.n === b.n ? "dengan" : "dari"} ${fmt(b.n)} pada ${b.t}`,
      this.batang(v, {warna: WARNA_LV[2], warna2: WARNA_LV[3], w2: true, puncak: false}), "MAGMA Indonesia, PVMBG; dicatat Pantau Bencana tiap pembaruan", [[WARNA_LV[2], "Waspada ke atas"], [WARNA_LV[3], "Siaga atau Awas"]]); },

  /* 3. erupsi 24 jam per hari (hanya hari dengan daftar MAGMA yang mencapai 24 jam) */
  kErupsi() {
    const r = (S.st?.riwayat || []).filter(x => x.erupsi != null); if (r.length < 2) return "";
    const v = r.map(x => ({n: x.erupsi, t: this.tgl(x.tgl), tip: `<b>${this.tgl(x.tgl)}</b><br>Erupsi 24 jam: ${fmt(x.erupsi)}`})), pk = v.reduce((a, x, i) => x.n > v[a].n ? i : a, 0);
    return this.kartu("Erupsi harian", `${Kartu.hl(fmt(v.at(-1).n) + " erupsi")} dalam 24 jam terakhir; terbanyak ${Kartu.hl(fmt(v[pk].n))} pada ${v[pk].t}`,
      this.batang(v, {warna: BATA}), "MAGMA Indonesia, informasi letusan; dicatat Pantau Bencana tiap pembaruan", [[BATA, "erupsi dalam 24 jam"], ["#c9503a", "terbanyak"]]); },

  async render() {
    const el = $("#tren"); if (!el) return;
    if (this.D === undefined) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat tren gunung api…</div>`; this.D = await muatJSON("data/dampak.json").catch(() => null); }
    el.innerHTML = [this.kTahun, this.kLevel, this.kErupsi].map(f => { try { return f.call(this); } catch (e) { console.error(e); return ""; } }).join("") || `<p class="kosong">Belum ada tren.</p>`; },
};
