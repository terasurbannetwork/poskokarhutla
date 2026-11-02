"use strict";
/* Tab Posko cuaca ekstrem (DISEMBUNYIKAN dari menu, seperti banjir dan kekeringan). Data: ../banjir/data/cuaca_posko.json (scripts/cuaca/posko.py).
   Posko = REKOMENDASI hasil hitungan dari tingkat Siaga/Awas prakiraan 3 hari, BUKAN laporan lapangan. */
const Posko = (() => {
  let D = null;
  const pil = lv => `<span style="background:${warnaT(lv)};color:#fff;border-radius:99px;padding:2px 9px;font-size:12px;font-weight:700">${esc(namaT(lv))}</span>`;
  function gambar() {
    const N = D.nasional, K = D.kabupaten.slice(0, 30);
    const baris = K.map(o => `<tr><td><b translate="no">${esc(o.nama)}</b><br><small translate="no">${esc(namaProv(o.prov))}</small></td><td>${pil(o.lv)}</td><td class="num">${fmt(o.kec_n)}</td><td class="num">${fmt(o.posko.length)}</td>
      <td>${o.bpbd?.pusdalops ? `<span translate="no">${esc(o.bpbd.pusdalops)}</span>` : "–"}</td></tr>`).join("");
    return Kartu.ex("Kabupaten", "", "", `<div class="tw"><table class="kl-tb"><thead><tr><th>Kabupaten/kota</th><th>Status</th><th>Kecamatan</th><th>Posko</th><th>Pusdalops BPBD</th></tr></thead><tbody>${baris}</tbody></table></div>`,
      `Rekomendasi hasil hitungan, bukan laporan lapangan: ${fmt(N.posko)} posko untuk ${fmt(N.kec)} kecamatan Siaga atau Awas di ${fmt(N.kab)} kabupaten/kota, satu posko per gugus dalam ${fmt(D.param.gabung_km)} km. Kontak dari BNPB peta_bpbd. Sumber: ${esc(D.sumber.pos)}`)
      .replace('<span class="ex-ey"></span>', '<span class="ex-ey">Posko cuaca ekstrem</span>'); }
  async function render() {
    const el = $("#posko"); if (!el) return;
    if (!D) { el.innerHTML = `<div class="kosong"><div class="spin"></div>Memuat posko…</div>`;
      try { D = await muatJSON("../banjir/data/cuaca_posko.json"); } catch (e) { el.innerHTML = `<div class="kosong">Data posko belum tersedia.</div>`; return; } }
    el.innerHTML = D.nasional?.posko ? gambar() : `<div class="kosong">Tidak ada kecamatan Siaga atau Awas dalam prakiraan 3 hari, jadi tidak ada rekomendasi posko.</div>`; }
  return {render};
})();
