/* KP-24 kartu Jejak kerja di beranda: hitungan per hari (absen, logbook, tugas) milik orangnya sendiri, 7 hari. Tanpa isi tulisan, foto, atau vektor. */
import {esc, api, angka} from "./umum.js";
import {ik} from "./ikon.js";

const tgl = s => new Date(s + "T00:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "long", year: "numeric", timeZone: "UTC"});
export const barisHari = baris => {
  const per = new Map();
  for (const x of baris) { const h = per.get(x.tanggal) ?? {tanggal: x.tanggal, absen: 0, logbook: 0, tugas: 0}; if (x.jenis in h) h[x.jenis] = x.n; per.set(x.tanggal, h); }
  return [...per.values()].sort((a, b) => a.tanggal < b.tanggal ? 1 : -1);
};
export async function kartuJejak(el, orangId, kode) {
  const r = await api(`/api/orang/${encodeURIComponent(orangId)}/jejak`, {kode}); if (!el.isConnected) return;
  const h = r.ok ? barisHari(r.data.baris || []) : [];
  el.innerHTML = `<h2>${ik("buku", 18)} Jejak kerja</h2>${!r.ok ? `<p class="lp-kecil">Belum bisa dimuat.</p>` : h.length ? `<div class="lp-gulung"><table class="lp-tabel lp-jejak"><thead><tr><th>Tanggal</th><th>Absen</th><th>Logbook</th><th>Tugas</th></tr></thead><tbody>${h.map(x => `<tr><td>${esc(tgl(x.tanggal))}</td><td>${angka(x.absen)}</td><td>${angka(x.logbook)}</td><td>${angka(x.tugas)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="lp-kecil">Belum ada catatan 7 hari terakhir.</p>`}`;
}
