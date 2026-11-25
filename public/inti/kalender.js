/* inti/kalender.js (PB-79, D15): SATU dialog kalender "Pilih tanggal" untuk semua bencana, tampilan dan perilaku sama dengan kalender karhutla (index.html, objek Kal).
   Mesin TIDAK memuat data sendiri: adaptor memberi `muat`. Dialog dibuka dulu dengan teks memuat, isinya menyusul (INP).
   Kalender.buka({tombol, hariIni: "YYYY-MM-DD", terpilih, judul, muat: async () => ({jumlah: {tgl: n}}), bisa: t => bool, satuan: "gempa",
                  ket: "keterangan", terbanyak: {judul, n}, warna: "<warna bencana>", awal: "YYYY-MM-DD" (bulan paling awal, opsional), pilih: t => {}})
   Mode rentang (opsional, /lapor/meja 24 Nov 2026): rentang: true, terpilih: ["dari", "sampai"], pilih: (dari, sampai) => {}.
   Ketuk pertama = tanggal awal, ketuk kedua = tanggal akhir (urutan dibalik bila perlu; ketuk tanggal sama dua kali = satu hari). Tanpa `rentang` perilaku lama tidak berubah.
   Tingkat warna lv1..lv5 = campuran warna bencana (--kal-w) dengan --card; makin pekat makin banyak. Gaya di inti/kalender.css. */
(() => {
const BL = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const BS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const angka = n => Number(n).toLocaleString("id-ID");
const rb = n => n >= 1e4 ? Math.round(n / 1e3) + "rb" : n >= 1e3 ? (n / 1e3).toFixed(1).replace(".", ",") + "rb" : String(n);
const tunda = f => typeof nanti === "function" ? nanti(f) : setTimeout(f, 0);
const pendek = t => +t.slice(8) + " " + BS[+t.slice(5, 7) - 1];
const bulanLain = (b, n) => { const [y, m] = b.split("-").map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7); };

/* ---------- model murni (diuji di tests/layar/pb_kalender.test.mjs) ---------- */
/* grid satu bulan: `geser` sel kosong di depan (Senin = kolom pertama) lalu `hari` hari */
function grid(bulan) { const [y, m] = bulan.split("-").map(Number); return {geser: (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7, hari: new Date(Date.UTC(y, m, 0)).getUTCDate()}; }
/* tingkat 0..5: tanpa angka atau 0 = 0; selebihnya menurut bagian dari angka terbesar */
function tingkat(v, maks) { if (!(v > 0)) return 0; const r = v / Math.max(1, maks); return r >= .5 ? 5 : r >= .3 ? 4 : r >= .15 ? 3 : r >= .05 ? 2 : 1; }
function teratas(jumlah, bisa, n) { return Object.keys(jumlah).filter(t => jumlah[t] > 0 && bisa(t)).sort((a, b) => jumlah[b] - jumlah[a] || (a < b ? 1 : -1)).slice(0, n); }

/* ---------- tampilan ---------- */
let D = null, K = null;   // D = <dialog>, K = keadaan kalender yang sedang terbuka
function dialog() {
  if (D) return D;
  D = document.createElement("dialog"); D.id = "dlgKal"; D.className = "dlg-kal";
  D.addEventListener("click", e => {
    if (e.target === D || e.target.closest(".kal-x")) return D.close();
    const g = e.target.closest("[data-geser]"); if (g && K) { K.bulan = bulanLain(K.bulan, Number(g.dataset.geser)); return gambar(); }
    const b = e.target.closest("[data-t]"); if (!b || b.disabled || !K) return;
    const t = b.dataset.t, f = K.pilih;
    if (K.rentang) {
      if (!K.mulai && !b.closest(".kal-top")) { K.mulai = t; return gambar(); }   // ketuk pertama: tandai awal, dialog tetap terbuka
      const [a, z] = K.mulai && K.mulai <= t ? [K.mulai, t] : K.mulai ? [t, K.mulai] : [t, t]; D.close(); if (f) tunda(() => f(a, z)); return;
    }
    D.close(); if (f) tunda(() => f(t));
  });
  D.addEventListener("close", () => { const t = K?.tombol; K = null; t?.focus?.(); });
  document.body.appendChild(D); return D;
}
function gambar() {
  if (!K || !K.data) return;
  const d = dialog(), bulan = K.bulan, [y, m] = bulan.split("-").map(Number), {geser, hari} = grid(bulan), jm = K.data.jumlah || {}, hi = K.hariIni;
  const maks = Math.max(1, ...Object.values(jm).filter(Number.isFinite)), bisa = K.bisa || (t => t in jm), sat = K.satuan || "kejadian";
  const [ra, rz] = K.rentang ? (K.mulai ? [K.mulai, K.mulai] : K.terpilih || []) : [];
  const kelas = t => !K.rentang ? (t === K.terpilih ? " pilih" : "") : ra && t >= ra && t <= rz ? (t === ra || t === rz ? " pilih ujung" : " antara") : "";
  let sel = ""; for (let i = 0; i < geser; i++) sel += "<span></span>";
  for (let h = 1; h <= hari; h++) {
    const t = `${bulan}-${String(h).padStart(2, "0")}`, v = jm[t], ok = t <= hi && bisa(t), lv = tingkat(v, maks);
    sel += t > hi ? `<span class="kal-h nanti">${h}</span>`
      : `<button type="button" class="kal-h lv${lv}${kelas(t)}" data-t="${t}"${ok ? "" : " disabled"} aria-label="${pendek(t)}${v != null ? ", " + angka(v) + " " + esc(sat) : ""}${ok ? "" : ", tidak tersedia"}"><b>${h}</b><i>${v != null ? rb(v) : ""}</i></button>`;
  }
  const top = K.terbanyak ? teratas(jm, t => t <= hi && bisa(t), K.terbanyak.n || 6) : [];
  const awal = (K.awal || Object.keys(jm).sort()[0] || hi).slice(0, 7);
  /* fokus dipulihkan sesudah isi diganti (QA 25 Nov 2026): tombol bulan atau tanggal yang sama, supaya pengguna papan ketik tidak terlempar ke awal dialog */
  const fk = d.contains?.(document.activeElement) ? document.activeElement : null, kunci = fk?.dataset?.geser != null ? `[data-geser="${fk.dataset.geser}"]` : fk?.dataset?.t ? `.kal-grid [data-t="${fk.dataset.t}"]` : null;
  d.innerHTML = `<div class="kal-kop"><b>${esc(K.judul)}</b><button type="button" class="kal-x" aria-label="Tutup">✕</button></div>
    <div class="kal-nav"><button type="button" data-geser="-1" aria-label="Bulan sebelumnya"${bulan <= awal ? " disabled" : ""}>‹</button><b>${BL[m - 1]} ${y}</b><button type="button" data-geser="1" aria-label="Bulan berikutnya"${bulan >= hi.slice(0, 7) ? " disabled" : ""}>›</button></div>
    <div class="kal-grid" role="grid"><span class="kal-hr">Sen</span><span class="kal-hr">Sel</span><span class="kal-hr">Rab</span><span class="kal-hr">Kam</span><span class="kal-hr">Jum</span><span class="kal-hr">Sab</span><span class="kal-hr">Min</span>${sel}</div>
    ${K.rentang ? `<p class="kal-petunjuk">${K.mulai ? `Mulai ${pendek(K.mulai)}. Ketuk tanggal akhir, atau ketuk tanggal yang sama untuk satu hari.` : "Ketuk tanggal awal, lalu tanggal akhir."}</p>` : ""}
    ${K.ket ? `<p class="kal-ket">${esc(K.ket)}</p>` : ""}
    ${top.length ? `<div class="kal-top"><span>${esc(K.terbanyak.judul || "Terbanyak")}</span>${top.map(t => `<button type="button" data-t="${t}">${pendek(t)} <b>${rb(jm[t])}</b></button>`).join("")}</div>` : ""}`;
  if (kunci) { const el = d.querySelector?.(kunci); (el && !el.disabled ? el : d.querySelector?.(".kal-nav button:not([disabled]), .kal-grid button:not([disabled])"))?.focus(); }
}
async function buka(o) {
  const d = dialog(), n = K = {...o, judul: o.judul || "Pilih tanggal", data: null, bulan: ((o.rentang ? o.terpilih?.[1] : o.terpilih) || o.hariIni).slice(0, 7), mulai: null};
  d.innerHTML = `<div class="kal-kop"><b>${esc(n.judul)}</b><button type="button" class="kal-x" aria-label="Tutup">✕</button></div><p class="kal-muat">Memuat jumlah ${esc(o.satuan || "kejadian")}…</p>`;
  if (o.warna) d.style.setProperty("--kal-w", o.warna); else d.style.removeProperty("--kal-w");
  if (!d.open) d.showModal();
  let data; try { data = await o.muat(); } catch (e) { data = {jumlah: {}}; }
  if (K !== n) return;   // dialog sudah ditutup atau dibuka ulang
  n.data = data || {jumlah: {}}; tunda(() => { if (K === n) gambar(); });
}
window.Kalender = {buka, tutup: () => { if (D?.open) D.close(); }, model: {grid, tingkat, teratas, bulanLain}};
})();
