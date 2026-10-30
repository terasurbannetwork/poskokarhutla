/* Kartu "Titik panas tinggi, belum ada laporan BPBD" di /laporan-bnpb. Baca data/karhutla_belum_lapor.json apa adanya. */
(() => {
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const angka = n => Number.isFinite(+n) && n != null ? (+n).toLocaleString("id-ID") : "-";
const tgl = s => { const m = /^\d{4}-(\d\d)-(\d\d)/.exec(s || ""); return m ? `${+m[2]} ${BLN[+m[1] - 1] || ""}`.trim() : ""; };
const BATAS = 15;

function subjudul(d) {
  const j = d.jendela || {}, a = tgl(j.dari), b = tgl(j.sampai), t = d.ambang?.titik_7h;
  const rentang = a && b ? (a.split(" ")[1] === b.split(" ")[1] ? `${a.split(" ")[0]}–${b}` : `${a}–${b}`) : "";
  const tol = tgl(j.toleransi_lapor_sampai), th = (j.sampai || "").slice(0, 4);
  return `≥${angka(t)} titik dalam 7 hari${rentang ? ` (${rentang}${th ? " " + th : ""})` : ""}, tanpa laporan BPBD di logbook${tol ? ` s.d. ${tol}` : ""}`;
}
/* "30 Okt 2026 00.32 WIB" dari ISO UTC */
function waktu(s) {
  const d = new Date(s); if (isNaN(d)) return "";
  const w = new Date(d.getTime() + 7 * 36e5), p = n => String(n).padStart(2, "0");
  return `${w.getUTCDate()} ${BLN[w.getUTCMonth()]} ${w.getUTCFullYear()} ${p(w.getUTCHours())}.${p(w.getUTCMinutes())} WIB`;
}
function baris(k, i) {
  return `<tr${i >= BATAS ? " data-lebih hidden" : ""}><td>${i + 1}</td><td class="kiri">${esc(k.prov)}</td><td class="kiri">${esc(k.kab)}</td><td>${angka(k.titik_7h)}</td><td>${angka(k.titik_hari_ini)}</td><td>${k.terakhir_lapor ? esc(tgl(k.terakhir_lapor)) : "tidak ada di logbook"}</td></tr>`;
}
/* Mengembalikan HTML isi kartu, atau "" bila tak ada baris. */
function render(d) {
  const kab = Array.isArray(d?.kab) ? d.kab : [];
  if (!kab.length) return "";
  return `<h2>Titik panas tinggi, belum ada laporan BPBD</h2><p class="lb-bl-sub">${esc(subjudul(d))}</p>
<div class="lb-tabel"><table class="lb-bl-tab"><thead><tr><th>No</th><th>Provinsi</th><th>Kab/Kota</th><th>Titik 7 hari</th><th>Titik ${esc(tgl(d.jendela?.sampai)) || "hari terakhir"}</th><th>Laporan terakhir</th></tr></thead><tbody>${kab.map(baris).join("")}</tbody></table></div>
${kab.length > BATAS ? `<button type="button" class="pp-btn kecil ke2" id="lbBlSemua" aria-expanded="false">Tampilkan semua (${angka(kab.length)})</button>` : ""}
<p class="lb-ket">Sumber: titik panas satelit VIIRS/MODIS (lokasi unik 375 m) dan logbook Pusdalops BNPB${d.dibuat ? `, diperbarui ${esc(waktu(d.dibuat))}` : ""}. Bahan konfirmasi ke BPBD, bukan bukti api tidak dilaporkan.</p>`;
}
globalThis.__belumLapor = {render, tgl, angka};
if (typeof document === "undefined") return;
const el = document.getElementById("lbBelumLapor");
if (!el) return;
fetch("/data/karhutla_belum_lapor.json").then(r => r.ok ? r.json() : null).catch(() => null).then(d => {
  const h = render(d); if (!h) return;
  el.innerHTML = h; el.hidden = false;
  const b = document.getElementById("lbBlSemua");
  if (b) b.onclick = () => { // pembuka satu atribut per baris; cukup ringan
    const buka = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", buka);
    b.textContent = buka ? "Tampilkan 15 teratas" : `Tampilkan semua (${angka(d.kab.length)})`;
    el.querySelectorAll("tr[data-lebih]").forEach(tr => { tr.hidden = !buka; });
  };
});
})();
