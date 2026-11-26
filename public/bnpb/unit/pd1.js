"use strict";
/* PD-1 Rapor peringatan dini (tiket RU-088; DESAIN-TEKNIS 6.6, baris Layar). Kartu per jenis bahaya dan tingkat digambar UnitRapor dari berkas
   unit/rapor_peringatan.json (scripts/prediksi/rapor_peringatan.py lewat pd1.py); layar tidak menghitung hit, palsu, terlewat, POD, atau FAR.
   Tambahan di sini hanya unduhan teks templat laporan 4-bulanan (Januari-April, Mei-Agustus, September-Desember, ews_evaluasi) dari data.periode berkas yang sama.
   Sel tanpa angka (kosong = belum cukup data) ditulis "belum cukup data", tidak pernah 0. Palsu dan terlewat memakai keterbatasan yang sama dengan title kolom kartu.
   Pakai: UnitPd1.periode(data) -> [nama periode yang dinilai]; UnitPd1.teks(data, periode) -> teks; UnitTampil["PD-1"](berkas) -> [elemen]. */
(() => {
  const KOSONG = "belum cukup data", TANPA_TINGKAT = "tidak dihitung per tingkat";
  const KET = "Palsu adalah episode peringatan tanpa kejadian tercatat dalam jendelanya. Logbook dan DIBI bukan daftar kejadian lengkap, sehingga palsu cenderung terlalu tinggi dan terlewat terlalu rendah. Tanpa umpan BPBD belum bisa dibedakan antara tidak terjadi dan tidak tercatat. Laporan ini menilai peringatan yang sudah terbit, bukan model prakiraan Centurisk97.";
  const SUMBER = {dibi: "DIBI BNPB", logbook: "Logbook Pusdalops"};
  const sah = d => d && typeof d === "object" && Array.isArray(d.periode);
  const bulat = v => Number.isFinite(v) ? v.toLocaleString("id-ID", {maximumFractionDigits: 0}) : KOSONG;
  const dua = v => Number.isFinite(v) ? v.toLocaleString("id-ID", {minimumFractionDigits: 2, maximumFractionDigits: 2}) : KOSONG;
  const tgl = iso => /^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? new Date(iso + "T00:00:00Z").toLocaleDateString("id-ID", {timeZone: "UTC", day: "numeric", month: "long", year: "numeric"}) : null;

  const periode = data => sah(data) ? [...new Set(data.periode.filter(p => p && p.dinilai && Array.isArray(p.baris)).map(p => String(p.periode)))] : [];

  function teks(data, nama) {
    const ps = sah(data) ? data.periode.filter(p => p && p.dinilai && String(p.periode) === nama && Array.isArray(p.baris)) : [];
    if (!ps.length) return null;
    const out = [`Laporan 4-bulanan peringatan dini, periode ${nama}`, "Badan Nasional Penanggulangan Bencana, Ruang Unit Direktorat Peringatan Dini", ""];
    for (const p of ps) {
      const a = tgl(p.dari), b = tgl(p.sampai);
      out.push(`Kejadian pembanding: ${SUMBER[p.sumber] || p.sumber}${a && b ? `, jendela ${a} sampai ${b}` : ""}`);
      out.push("Jenis bahaya | Tingkat | Hit | Palsu | Terlewat | POD (peluang terdeteksi) | FAR (rasio peringatan palsu) | Vonis | Keterangan");
      for (const r of p.baris) {
        const semua = r.tingkat === "Semua tingkat";   // terlewat dan POD hanya ada di baris Semua tingkat; di sana kosong berarti belum cukup data
        out.push([r.jenis, r.tingkat, bulat(r.hit), bulat(r.palsu), r.terlewat == null ? TANPA_TINGKAT : bulat(r.terlewat), Number.isFinite(r.pod) ? dua(r.pod) : semua ? KOSONG : TANPA_TINGKAT,
          dua(r.far), r.vonis || KOSONG, r.ket || "-"].join(" | "));
      }
      out.push("");
    }
    out.push("Keterangan: POD (probability of detection, peluang terdeteksi) = hit / (hit + terlewat); FAR (false alarm ratio, rasio peringatan palsu) = palsu / (hit + palsu). Belum cukup data berarti hit + terlewat atau hit + palsu kurang dari 10. Tidak dihitung per tingkat berarti terlewat dan POD hanya ada di baris Semua tingkat, karena kejadian tidak punya tingkat peringatan.");
    out.push("Keterbatasan: " + KET);
    const ts = data.tsunami; if (ts && typeof ts === "object" && ts.alasan) out.push("Tsunami: tidak dinilai, " + ts.alasan + ".");
    if (data.umpan_bpbd) out.push("Umpan balik BPBD: " + data.umpan_bpbd + ".");
    return out.join("\n");
  }

  function tampil(berkas) {
    const R = window.UnitRapor, d = berkas.data, per = {dibuat: berkas.dibuat, basi_jam: berkas.basi_jam};
    const h = (tag, a, ...anak) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(a || {})) { if (v == null || v === false) continue; if (k === "teks") e.textContent = v; else e.setAttribute(k, v === true ? "" : v); }
      e.append(...anak.flat().filter(x => x != null && x !== false)); return e; };
    const kartu = (berkas.kartu || []).filter(k => k.sistem === "PD-1").map(k => ({periode: String(k.pil || "").replace(/^Periode /, ""), el: R.render(k, per)}));
    const ps = periode(d);
    if (!ps.length) return kartu.map(x => x.el);
    let pilih = ps[ps.length - 1];
    const wadah = h("div", {class: "un-pd1-kartu"});
    /* tab periode benar-benar mengganti kartu yang tampil; bila nama periode kartu tak cocok dengan satu pun tab, semua kartu tampil (tidak ada yang disembunyikan diam-diam) */
    const cocok = kartu.some(x => ps.includes(x.periode));
    const gambar = () => wadah.replaceChildren(...kartu.filter(x => !cocok || x.periode === pilih).map(x => x.el));
    gambar();
    const tabs = h("div", {class: "ad-tabs un-tabs", role: "group", "aria-label": "Periode laporan 4-bulanan"},
      ...ps.map(p => h("button", {type: "button", "data-periode": p, "aria-pressed": String(p === pilih), teks: p})));
    const unduh = h("button", {type: "button", class: "ad-tombol kecil", "data-unduh-pd1": "1", teks: "Unduh teks laporan 4-bulanan"});
    tabs.addEventListener("click", e => { const b = e.target.closest("[data-periode]"); if (!b) return; pilih = b.dataset.periode; for (const x of tabs.children) x.setAttribute("aria-pressed", String(x === b)); gambar(); });
    unduh.addEventListener("click", () => {
      const t = teks(d, pilih); if (!t) return;
      const a = h("a", {href: URL.createObjectURL(new Blob(["﻿" + t], {type: "text/plain;charset=utf-8"})), download: `laporan_peringatan_dini_${pilih.replace(/[^A-Za-z0-9]+/g, "_")}.txt`});
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    });
    return [h("div", {class: "un-wil-pemilih"}, tabs, unduh), wadah];
  }

  const api = {periode, teks};
  (typeof window !== "undefined" ? window : globalThis).UnitPd1 = api;
  if (typeof window !== "undefined" && window.UnitRapor) (window.UnitTampil ||= {})["PD-1"] = tampil;
})();
