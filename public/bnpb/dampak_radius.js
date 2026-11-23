"use strict";
/* Dampak radius (data/kajian-bnpb/inarisk PRD F-14, KEPUTUSAN D14): penduduk dan sarana dalam beberapa radius dari satu titik,
   lewat proksi /api/inarisk/dampak (kueri spasial InaRISK, dicache Worker 1 hari). Dipakai kartu gunung api /bnpb/dalops.
   DampakRadius.tabel(lat, lon, [km...]) -> elemen; diisi saat terlihat di layar. Teks hanya lewat textContent. */
(g => {
  const KOLOM = [["penduduk", "Penduduk"], ["sekolah", "Sekolah"], ["rs", "Rumah sakit"], ["puskesmas", "Puskesmas"]];
  const F = v => typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("id-ID", {maximumFractionDigits: 0}) : "–";
  const el = (t, cls, teks) => { const e = document.createElement(t); if (cls) e.className = cls; if (teks != null) e.textContent = teks; return e; };
  async function hitung(lat, lon, km) {
    const r = await fetch("/api/inarisk/dampak", {method: "POST", headers: {"content-type": "application/json"},
      body: JSON.stringify({type: "circle", center: {lat, lng: lon}, radius_meter: Math.round(km * 1000), geometry: {type: "Point", coordinates: [lon, lat]}})});
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }
  /* radius unik terurut, 0 < km <= 50 (batas proksi) */
  const rapikan = ks => [...new Set(ks.filter(k => typeof k === "number" && k > 0 && k <= 50))].sort((a, b) => a - b);
  function tabel(lat, lon, radius, {larangan = null} = {}) {
    const ks = rapikan(radius), wadah = el("div", "dr-wadah");
    if (typeof lat !== "number" || typeof lon !== "number" || !ks.length) return wadah;
    const judul = el("b", "dr-judul", "Dampak dalam radius");
    const t = el("table", "ad-tabel dl-tabel dr-tabel"), kepala = el("tr");
    kepala.append(el("th", null, "Radius"), ...KOLOM.map(([, n]) => Object.assign(el("th", "n", n), {scope: "col"})));
    const badan = el("tbody");
    const baris = ks.map(km => {
      const tr = el("tr"), th = Object.assign(el("th", null, `${F(km)} km${km === larangan ? ", larangan" : ""}`), {scope: "row"});
      const sel = KOLOM.map(() => el("td", "n", "…"));
      tr.append(th, ...sel); badan.append(tr);
      return {km, sel};
    });
    t.append(el("thead"), badan); t.tHead.append(kepala);
    const kaki = el("small", "dr-kaki", "Sumber: InaRISK BNPB, kueri spasial; angka dari titik puncak.");
    wadah.append(judul, el("div", "ad-tabel-wadah dl-tabel-wadah", null), kaki);
    wadah.children[1].append(t);
    let sudah = false;
    const isi = () => {
      if (sudah) return; sudah = true;
      for (const b of baris) hitung(lat, lon, b.km)
        .then(r => KOLOM.forEach(([k], i) => { b.sel[i].textContent = r && r[k] !== "" && r[k] != null ? F(Number(r[k])) : "–"; }))
        .catch(() => b.sel.forEach((s, i) => { s.textContent = i ? "" : "gagal dimuat"; }));
    };
    /* hanya dihitung saat kartu terlihat: halaman Dalops panjang, gunung Siaga/Awas bisa beberapa */
    if ("IntersectionObserver" in g) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); isi(); } }, {rootMargin: "200px"}); io.observe(wadah); }
    else isi();
    return wadah;
  }
  g.DampakRadius = {tabel, rapikan};
})(globalThis);
