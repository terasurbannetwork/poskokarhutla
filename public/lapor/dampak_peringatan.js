/* Alun-alun, tampilan Peringatan (DP-11; data/kajian-bnpb/dampak-peringatan D22 sampai D24): fungsi murni tanpa DOM.
   Status per kab datang dari /api/dampak-peringatan/status dan dibaca lewat modul bersama inti/dampak_peringatan.js (DP = globalThis.DampakPeringatan, disuntik
   supaya bisa diuji). Baris kecil di kartu kejadian hanya membaca: tidak mengubah status, angka, atau pita kejadian (N9). */

export const BAHAYA_ALUN = [["bnj", "Banjir", "b-banjir"], ["lsr", "Tanah longsor", "b-longsor"], ["cex", "Cuaca ekstrem", "b-angin"], ["kht", "Karhutla", "b-api"]];
const norm = s => String(s ?? "").replace(/^(kab\.|kabupaten)\s+/i, "").toLowerCase().replace(/\s+/g, " ").trim();

/* kab_kode kabar "35|Pacitan" -> kode 4 angka status ("3501"): provinsi sama dan nama sama sesudah awalan "Kab." dibuang; tak ketemu = null (baris tidak tampil) */
export function kodeKab(kabKode, ringkas, status) {
  const [prov, nama] = String(kabKode || "").split("|");
  if (!prov || !nama) return null;
  const ada = Object.keys(status?.kab || {}).filter(k => /^\d{4}$/.test(k) && k.startsWith(prov));
  return ada.find(k => norm(ringkas?.kab?.[k]?.nama || status.kab[k]?.nama) === norm(nama)) || null;
}

/* tingkat tertinggi (>= Waspada) di antara empat bahaya untuk satu kab; seri = urutan BAHAYA_ALUN. null bila tak ada. */
export function barisPrakiraan(kabKode, {status, ringkas, DP, nama} = {}) {
  const k = kodeKab(kabKode, ringkas, status);
  if (!k || !DP) return null;
  let terbaik = null;
  for (const [kode, label] of BAHAYA_ALUN) {
    const e = DP.statusEfektif(status.kab[k]?.status?.[kode.toUpperCase()], status, kode);
    if (e.s >= 1 && (!terbaik || e.s > terbaik.s)) terbaik = {s: e.s, kode, hipotesis: e.hipotesis, label};
  }
  if (!terbaik) return null;
  const bahaya = terbaik.kode === "kht" ? "karhutla" : terbaik.label.toLowerCase();
  return {kode: terbaik.kode, teks: `Status prakiraan: ${DP.namaTingkat(terbaik.s, nama)} ${bahaya}`, hipotesis: terbaik.hipotesis};
}
