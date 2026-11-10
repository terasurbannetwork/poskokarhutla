"use strict";
/* Deteksi gempa beruntun (Silang Sumber F5, SS-43): laju gempa kecil di sekitar gunung api lawan sasaran lain. Data: data/beruntun.json (scripts/gempa/beruntun.py).
   Berlabel "Deteksi Centurisk97", BUKAN prediksi gempa dan bukan peringatan; ambang adalah hipotesis awal, belum teruji balik. Mode relatif (sasaran lawan
   median sasaran lain), bukan baseline historis. Bagian atas murni tanpa DOM (diuji tests/gempa/silang_beruntun.test.mjs, tiket SS-44). */
const Beruntun = {
  d: null,
  STATUS: {perlu_dicek: ["perlu dicek", "#3f6fa8", 0], biasa: ["biasa", "#6b7280", 1], data_kurang: ["data kurang", "#9aa8b8", 2]},
  /* murni */
  p3: p => p == null ? "–" : p < 0.01 ? "< 0,01" : p.toLocaleString("id-ID", {maximumFractionDigits: 2}),
  /* '2026-11-10T09:47Z' -> '10 Nov 2026 pukul 16.47 WIB' */
  waktuData(z) { const t = Date.parse(z); return isNaN(t) ? "" : new Date(t).toLocaleDateString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric"}) + " pukul " + new Date(t).toLocaleTimeString("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit"}).replace(":", ".") + " WIB"; },
  pil: (t, w) => `<span class="pill pm" style="--w:${w}">${esc(t)}</span>`,
  pilStatus(s) { const x = this.STATUS[s] || [s, "#6b7280"]; return this.pil(x[0], x[1]); },
  /* perlu dicek dulu, lalu cacah terbanyak, lalu nama */
  urut(d) { return [...(d?.sasaran || [])].sort((a, b) => (this.STATUS[a.status]?.[2] ?? 9) - (this.STATUS[b.status]?.[2] ?? 9) || b.N - a.N || (a.nama < b.nama ? -1 : 1)); },
  /* judul: kalimat temuan berangka; tanpa kata prediksi atau janji kejadian */
  judul(d) { const r = d.ringkas, h = n => `<span class="hl">${fmt(n)}</span>`;
    if (!r.dinilai) return `Tidak ada dari ${h(r.sasaran)} gunung api yang bisa dinilai: dari ${h(d.n_di_atas_mc)} gempa di atas Mc ${h(d.mc)} dalam ${h(d.jendela.mc_hari)} hari, hanya ${h(d.sasaran.reduce((a, s) => a + s.n_di_atas_mc, 0))} jatuh di lingkaran gunung api`;
    return r.perlu_dicek ? `${h(r.perlu_dicek)} dari ${h(r.dinilai)} gunung api yang dinilai punya laju gempa 7 hari di atas sasaran lain` : `Tidak ada dari ${h(r.dinilai)} gunung api yang dinilai punya laju gempa 7 hari di atas sasaran lain`; },
  /* tampilan */
  async render() {
    const el = $("#beruntun"); if (!el) return;
    if (!this.d) { try { this.d = await muatJSON("data/beruntun.json"); } catch (e) { el.replaceChildren(); return; } }
    const d = this.d; if (!el.dataset.siap) { el.dataset.siap = 1;
      el.innerHTML = Kartu.ex(this.judul(d), "", "", `<p class="tz-lb">${this.pil("Deteksi Centurisk97", "#0b2545")} ${this.pil("Bukan prediksi gempa", "#6b7280")} ${this.pil("Hipotesis, belum teruji", "#6b7280")} ${this.pil("Perbandingan relatif", "#3f6fa8")}</p><div id="bnTabel"></div>
        <p class="fnd ina-atr">Katalog sampai ${esc(this.waktuData(d.jendela.akhir))}. Laju gempa dalam ${fmt(d.jendela.deteksi_hari)} hari di lingkaran ${fmt(d.ambang.R_km)} km sekitar gunung api, dibanding median gunung api lain pada Mc yang sama (${fmt(d.mc)}; dihitung dari ${fmt(d.n_di_atas_mc)} gempa di atas Mc). Peluang ekor Poisson dikoreksi jumlah sasaran, tanda "perlu dicek" bila di bawah ${String(d.ambang.p_koreksi).replace(".", ",")}.
        Ini deteksi dari data katalog, bukan peringatan dan bukan kabar akan ada gempa. Mc, lingkaran, dan ambang adalah nilai awal. Tektonik regional tidak dibedakan dari vulkanik. Data kurang di sini berarti median sasaran lain nol, sehingga tidak ada pembanding; detektor ini belum bisa menangkap kawanan terisolasi, dan hasil kosong bukan bukti tidak ada gempa.
        Sumber: <a href="https://www.bmkg.go.id/gempabumi" target="_blank" rel="noopener">BMKG</a> (katalog InaTEWS, arsip Centurisk97), daftar gunung api PVMBG.</p>`, "")
        .replace('<article class="ex">', '<article class="ex ex-std">').replace('<span class="ex-ey"></span>', '<span class="ex-ey">Gempa beruntun</span>');
      if (!d.ringkas.dinilai) { $("#bnTabel").remove(); return; }   /* semua data kurang: judul sudah menjelaskan, tabel 69 baris kosong tidak ditampilkan */
      const T = pasangTabel($("#bnTabel"), {kolom: [["nama", "Gunung api"], ["N", "Gempa 7 hari", 1], ["harapan", "Pembanding", 1], ["p", "Peluang ekor", 1], ["status", "Status"], ["alasan", "Keterangan"]],
        sel: (r, k) => k === "nama" ? esc(r.nama) : k === "N" ? fmt(r.N) : k === "harapan" ? (r.harapan == null ? "–" : fmt(r.harapan)) : k === "p" ? this.p3(r.p_koreksi) : k === "status" ? this.pilStatus(r.status) : esc(r.alasan || ""),
        nilai: (r, k) => k === "status" ? (this.STATUS[r.status]?.[2] ?? 9) : k === "p" ? (r.p_koreksi ?? 2) : k === "alasan" ? (r.alasan || "") : r[k] ?? -1,
        urut: "status", turun: false, per: 10, satuan: "gunung api"});
      T.set(this.urut(d)); }
  },
};
