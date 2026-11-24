"use strict";
/* ================================================================ asap lintas negara (PKH-23): kota penerima di Singapura, Malaysia, Brunei
   Data: /udara/data/lintas_negara.json (scripts/udara/lintas_negara.py). HIPOTESIS: belum diuji balik. Asal per provinsi (dibulatkan 10%) hanya bila tampil=true;
   selain itu "belum dapat ditentukan" beserta alasannya, tidak pernah 0%. stasiun_asing.json TIDAK dipakai (izin DOE belum ada). Berkas hilang = kartu dibuang (A18). */
const PIL_HIPOTESIS = '<span class="kt" style="--c:#6b7280;--f:#fff;text-transform:none;letter-spacing:0">hipotesis</span>';
const Lintas = {
  D: null,
  muat() { return this._p ??= fetch("/udara/data/lintas_negara.json").then(r => r.ok ? r.json() : null).catch(() => null).then(d => this.D = d); },
  /* persen dibulatkan ke 10 terdekat; di bawah 5 ditulis "di bawah 10%" supaya tidak jadi 0% */
  pct: p => p < 10 ? "di bawah 10%" : Math.floor(p / 10) * 10 + "%",
  bag(b) { const r = b.rendah != null && b.tinggi != null && b.tinggi - b.rendah >= 10 ? `, rentang ${this.pct(b.rendah)} sampai ${this.pct(b.tinggi)}` : ""; return `${esc(b.asal)} ${this.pct(b.persen)}${r}`; },
  asal(r) { if (!r.tampil || !r.bagian?.length) return `belum dapat ditentukan<br><small>${esc((r.alasan || "").replace(/(\d)\.(\d)/g, "$1,$2"))}</small>`;
    return r.bagian.map(b => this.bag(b)).join("; "); },
  ex() { const P = this.D?.penerima; if (!P?.length) return "";
    const isi = `<div class="tw"><table><thead><tr><th style="text-transform:none">Kota penerima</th><th class="n" style="text-transform:none">PM2,5 (µg/m³)</th><th style="text-transform:none">Asal asap, per provinsi</th></tr></thead><tbody>${P.map(r =>
      `<tr><td><b translate="no">${esc(r.nama)}</b>, ${esc(r.negara)}</td><td class="n">${r.pm != null && isFinite(r.pm) ? fmt(Math.round(r.pm)) : "tidak ada data"}</td><td>${this.asal(r)}</td></tr>`).join("")}</tbody></table></div>
      <p class="fnd">Angka perkiraan model untuk besok (${esc(this.D.hari)}), bukan pengukuran. Persen dibulatkan ke bawah per 10% (di bawah 10% ditulis begitu) dan hanya ditampilkan bila model menjelaskan sedikitnya 20% kelebihan PM2,5 di atas latar. Provinsi asal berarti api di sana yang dilalui angin ke kota itu, bukan penetapan siapa yang membakar. Belum diuji balik.</p>`;
    return Insight.kepala(Kartu.ex("x", "", "", isi, ""), "lintas", "Asap lintas negara", PIL_HIPOTESIS); },
};
Insight.IK.lintas = '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>';
Insight.EX.splice(Insight.EX.indexOf("asal") + 1, 0, "lintas");
{ const g0 = Insight.gambar.bind(Insight); Insight.gambar = id => id === "lintas" ? Lintas.ex() : g0(id); }
