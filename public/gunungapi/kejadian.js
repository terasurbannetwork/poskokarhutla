"use strict";
/* Tab Kejadian gunung api: satu kejadian V per gunung berstatus Waspada ke atas (scripts/umum/kejadian.py -> ../banjir/data/kejadian_gunungapi_awal.json).
   Kode V0001 tetap selama gunungnya tetap Level II ke atas (masa aktif 3 hari sesudah turun); tidak dipakai ulang. Klik baris = peta terbang + laci gunung;
   tautan bersih /gunungapi/k/V0001. Tabel standar: kepala gelap, urut, paginasi (A10). Tanpa berkasnya tab menampilkan "belum tersedia", bukan daftar kosong. */
const Kejadian = {
  st: {urut: "lv", turun: true, hal: 0}, PER: 10, K: undefined, _p: null,
  KOL: [["kode", "Kode"], ["nama", "Gunung"], ["prov", "Provinsi"], ["lv", "Level", 0], ["mulai", "Mulai"], ["aktif", "Status"]],
  /* kejadian + gunungnya (dicocokkan lewat nama "G. Semeru" -> "Semeru"); yang tak cocok dibuang */
  muat() { return this._p ||= muatJSON("../banjir/data/kejadian_gunungapi_awal.json").then(d => { const G = S.st.gunung;
      return this.K = (d.kejadian || []).map(k => ({...k, g: G.find(g => g.nama === k.nama.replace(/^G\.\s*/, ""))})).filter(k => k.g); }).catch(() => { this._p = null; return this.K = null; }); },
  kode: g => Kejadian.K?.find(k => k.g === g)?.kode || null,
  nilai: (k, c) => c === "lv" ? k.g.level : c === "aktif" ? +k.aktif : c === "mulai" ? Date.parse(k.mulai) : c === "nama" ? k.g.nama : c === "prov" ? k.g.prov : k.kode,
  sel: (k, c) => c === "kode" ? `<b translate="no">${esc(k.kode)}</b>` : c === "nama" ? `<span translate="no">${esc(k.g.nama)}</span>` : c === "prov" ? esc(k.g.prov) : c === "lv" ? pilLv(k.g.level, true)
    : c === "mulai" ? esc(tglPendek(k.mulai)) : `<span class="pl" style="--w:${k.aktif ? "#d4572f" : "#7d8794"}">${k.aktif ? "Aktif" : "Selesai"}</span>`,
  tabel() {
    const st = this.st, s = st.turun ? -1 : 1, R = [...this.K].sort((a, b) => { const x = this.nilai(a, st.urut), y = this.nilai(b, st.urut); return (typeof x === "string" ? x.localeCompare(y) : x - y) * s || a.kode.localeCompare(b.kode); });
    st.hal = Math.min(st.hal, Math.max(0, Math.ceil(R.length / this.PER) - 1));
    return `<div class="tw"><table><thead><tr>${this.KOL.map(([c, n]) => `<th aria-sort="${st.urut === c ? (st.turun ? "descending" : "ascending") : "none"}"><button data-k="${c}">${n}<i>${st.urut === c ? (st.turun ? "↓" : "↑") : ""}</i></button></th>`).join("")}</tr></thead>
      <tbody>${R.slice(st.hal * this.PER, (st.hal + 1) * this.PER).map(k => `<tr class="klik" data-kode="${esc(k.kode)}" tabindex="0">${this.KOL.map(([c]) => `<td>${this.sel(k, c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${paginasi(st.hal, R.length, this.PER, "kejadian")}`; },
  gambarTabel() { const el = $("#kejadian"); el.innerHTML = this.tabel(); pengurutKepala(this.st, el.querySelector("thead"), () => nanti(() => this.gambarTabel())); },
  async render() {
    const el = $("#kejadian"); if (!el) return;
    if (!el.dataset.siap) { el.dataset.siap = 1;
      const buka = e => { const h = e.type === "click" && e.target.closest("[data-h]");
        if (h) { if (h.disabled) return; this.st.hal = +h.dataset.h; return nanti(() => { this.gambarTabel(); el.querySelector(`.pgn-b[data-h="${this.st.hal}"]`)?.focus(); }); }
        const r = e.target.closest("tr[data-kode]"); if (r && (e.type === "click" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); this.buka(r.dataset.kode); } };
      el.addEventListener("click", buka); el.addEventListener("keydown", buka); }
    if (!el.children.length) el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat kejadian gunung api…</div>`;
    await this.muat();
    if (!this.K?.length) { el.innerHTML = `<div class="kosong">${this.K ? "Tidak ada gunung berstatus Waspada atau lebih tinggi." : "Data kejadian gunung api belum tersedia."}</div>`; return; }
    this.gambarTabel(); },
  /* buka satu kejadian: peta terbang ke gunungnya + laci; dorong = ubah URL jadi /gunungapi/k/V0001 */
  async buka(kode, dorong = true) {
    const n = this._n = (this._n || 0) + 1;
    bukaTab("peta", false); await this.muat(); if (n !== this._n) return;
    const k = this.K?.find(x => x.kode === kode);
    if (!k) { toast("Kejadian " + kode + " tidak ditemukan"); history.replaceState(null, "", "/gunungapi/kejadian"); return bukaTab("kejadian", false); }
    if (dorong) history.replaceState(null, "", "/gunungapi/k/" + kode);
    nanti(() => { if (n !== this._n) return; Peta.terbang(k.g); Detail.buka(k.g); }); },
};
