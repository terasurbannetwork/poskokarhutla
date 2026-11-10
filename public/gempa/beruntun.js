"use strict";
/* Deteksi gempa beruntun (Silang Sumber F5, SS-43): gempa M 4,5+ 7 hari di lingkaran gunung api lawan laju historis USGS M 4,5+ (keputusan pemilik Q1).
   Data: data/beruntun.json (scripts/gempa/beruntun.py). Berlabel "Deteksi Centurisk97", BUKAN prediksi gempa dan bukan peringatan; ambang hipotesis, belum teruji.
   Hanya M 4,5 ke atas: kawanan gempa kecil vulkanik tidak terlihat; kegempaan MAGMA tampil di kolom terpisah (SS-44), tidak dilebur.
   Bagian atas murni tanpa DOM (diuji tests/gempa/silang_beruntun.test.mjs). */
const Beruntun = {
  d: null,
  STATUS: {perlu_dicek: ["perlu dicek", "#3f6fa8", 0], biasa: ["biasa", "#6b7280", 1], tidak_dinilai: ["tidak dinilai", "#9aa8b8", 2]},
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
    if (!r.dinilai) return `Tidak ada dari ${h(r.sasaran)} gunung api yang bisa dinilai: ${esc(d.sumber_hitungan)}`;
    const pr = r.laju_prior_saja ? `; ${h(r.laju_prior_saja)} tanpa gempa historis di lingkaran hanya punya laju dari prior` : "";
    return r.perlu_dicek ? `${h(r.perlu_dicek)} dari ${h(r.dinilai)} gunung api punya gempa M 4,5+ 7 hari di atas laju historisnya${pr}`
      : `Tidak ada dari ${h(r.dinilai)} gunung api yang punya gempa M 4,5+ 7 hari di atas laju historisnya; ${h(r.n_gempa_di_lingkaran)} gempa M 4,5+ jatuh di lingkaran gunung api${pr}`; },
  /* kolom MAGMA terpisah: level PVMBG dan jumlah kegempaan MAGMA 7 hari; tidak digabung ke peluang */
  teksMagma(m) { return !m ? "–" : m.total_7hari == null ? "tidak ada di MAGMA" : fmt(m.total_7hari); },
  tipMagma(m) { return !m?.per_jenis ? "" : Object.entries(m.per_jenis).map(([k, v]) => `${k.replace(/_/g, " ")} ${fmt(v)}`).join(", "); },
  pilLevel(m) { const W = {1: "#6b7280", 2: "#c9961a", 3: "#e8743b", 4: "#d64545"}; return m?.level ? this.pil("Level " + m.level + " " + m.level_nama, W[m.level]) : "–"; },
  /* tampilan */
  async render() {
    const el = $("#beruntun"); if (!el) return;
    if (!this.d) { try { this.d = await muatJSON("data/beruntun.json"); } catch (e) { el.replaceChildren(); return; } }
    const d = this.d, k = d.kelengkapan || {}, ov = d.overdispersi || {}; if (!el.dataset.siap) { el.dataset.siap = 1;
      el.innerHTML = Kartu.ex(this.judul(d), "", "", `<p class="tz-lb">${this.pil("Deteksi Centurisk97", "#0b2545")} ${this.pil("Bukan prediksi gempa", "#6b7280")} ${this.pil("Hipotesis, belum teruji", "#6b7280")} ${this.pil("Hanya M 4,5 ke atas", "#3f6fa8")}</p><div id="bnTabel"></div>
        <p class="fnd ina-atr">Katalog sampai ${esc(this.waktuData(d.jendela.akhir))}. N = cacah gempa M 4,5+ dalam ${fmt(d.jendela.deteksi_hari)} hari di lingkaran ${fmt(d.ambang.R_km)} km sekitar gunung api, dihitung dari USGS saja (skala yang sama dengan baseline); cacah BMKG hanya info di keterangan kolom N. Pembanding: laju historis USGS M 4,5+ sejak ${esc(d.jendela.baseline_mulai.slice(0, 4))} di lingkaran yang sama, (n + 0,5) per hari.
        Peluang ekor memakai binomial negatif dengan kelebihan varians ${fmt(ov.alpha)} (ukuran ${fmt(ov.k_ukuran)}), dari uji mundur mingguan leave-one-year-out atas ${fmt(ov.n_minggu)} minggu, dikali jumlah sasaran. Tanda "perlu dicek" hanya bila peluang terkoreksi di bawah ${fmt(d.ambang.p_koreksi)} DAN N paling sedikit ${fmt(d.ambang.n_min_menyala)}, supaya satu pasangan susulan tidak menyalakan tanda. Pada uji mundur tanda menyala ${fmt(ov.n_menyala_total)} dari ${fmt(ov.n_pasang)} pasangan gunung api dan minggu (${fmt(Math.round(ov.tingkat_menyala * 1e6) / 1e4)}%).
        Keterbatasan: hanya gempa M 4,5 ke atas, jadi kawanan gempa kecil vulkanik tidak terlihat di kolom deteksi; kolom MAGMA menampilkan kegempaan PVMBG terpisah dan tidak dilebur dengan peluang. Gempa susulan ikut dalam laju historis.
        Kelengkapan M ${fmt(k.ambang)} (USGS) hanya diasumsikan; nilai-b ${fmt(k.b_aki_semua)} bukan bukti kelengkapan karena komposisi jenis magnitudo bergeser antar-era. Katalog historis diunduh ${esc(d.baseline_diunduh || "")}. Radius, ambang, dan N minimal adalah nilai awal. Ini deteksi dari data katalog, bukan peringatan dan bukan kabar akan ada gempa.
        Sumber hitungan: <a href="https://earthquake.usgs.gov/fdsnws/event/1/" target="_blank" rel="noopener">USGS</a> (M 4,5+); info: <a href="https://www.bmkg.go.id/gempabumi" target="_blank" rel="noopener">BMKG</a>, <a href="https://magma.esdm.go.id" target="_blank" rel="noopener">MAGMA Indonesia, PVMBG</a>.</p>`, "")
        .replace('<article class="ex">', '<article class="ex ex-std">').replace('<span class="ex-ey"></span>', '<span class="ex-ey">Gempa beruntun</span>');
      const T = pasangTabel($("#bnTabel"), {kolom: [["nama", "Gunung api"], ["N", "Gempa M 4,5+ 7 hari", 1], ["harapan", "Harapan dari laju historis", 1], ["p", "Peluang ekor (dikoreksi)", 1], ["nm", "Menyala di uji mundur", 1], ["status", "Status"], ["level", "Level MAGMA"], ["mg", "Kegempaan MAGMA 7 hari", 1]],
        sel: (r, c) => c === "nama" ? esc(r.nama) : c === "N" ? `<span title="USGS; cacah BMKG M 4,5+ (info): ${fmt(r.n_bmkg)}">${fmt(r.N)}</span>` : c === "harapan" ? (r.harapan.toLocaleString("id-ID", {maximumSignificantDigits: 2})) : c === "p" ? this.p3(r.p_koreksi) : c === "nm" ? fmt(r.n_menyala) : c === "status" ? this.pilStatus(r.status) + (r.laju_prior_saja ? " <small title=\"Tidak ada gempa M 4,5+ historis di lingkaran; laju hanya dari prior\">laju dari prior</small>" : "") + (r.usulan_radius ? ` <small title="Usulan, tidak dipakai menghitung: cacah historis ${fmt(r.usulan_radius.n_hist_50km)} di 50 km dan ${fmt(r.usulan_radius.n_hist_100km)} di 100 km">usulan radius</small>` : "")
          : c === "level" ? this.pilLevel(r.magma) : `<span title="${esc(this.tipMagma(r.magma))}">${this.teksMagma(r.magma)}</span>`,
        nilai: (r, c) => c === "status" ? (this.STATUS[r.status]?.[2] ?? 9) : c === "p" ? (r.p_koreksi ?? 2) : c === "nm" ? (r.n_menyala ?? -1) : c === "level" ? (r.magma?.level ?? 0) : c === "mg" ? (r.magma?.total_7hari ?? -1) : c === "nama" ? r.nama : r[c] ?? -1,
        urut: "status", turun: false, per: 10, satuan: "gunung api"});
      T.set(this.urut(d)); }
  },
};
