/* inti/pilih_tanggal.js (PB-73, F-36, D15, D16): SATU mesin pemilih tanggal untuk semua bencana selain karhutla (karhutla punya pemilih sendiri di index.html).
   Segmen "Hari ini | Kemarin | Tanggal lain" (select native) dan, bila adaptor punya riwayat, segmen "Real Time | Riwayat".
   Mesin TIDAK pernah menawarkan tanggal tanpa data (D16): daftar tanggal berasal dari data yang sudah dimuat halaman. Hari ini atau Kemarin tanpa data = tombol mati.
   Digerbangi kemampuan.layar.pilih_tanggal di /bencana.json.

   Adaptor: {id: "gempa",
             host: () => elemen penampung,              // mesin menulis isinya
             tanggal: () => [ms, ...],                  // waktu kejadian data yang ADA (ms epoch); mesin mengubahnya jadi tanggal WIB unik
             ubah: iso|null => {},                      // dipanggil (ditunda) saat tanggal berubah; null = kembali ke rentang bawaan halaman
             riwayat: {ubah: bool => {}} (opsional)}    // ada = segmen Real Time/Riwayat tampil; true = Riwayat
   PilihTanggal.pasang(adaptor) memasang; PilihTanggal.gambar() menggambar ulang setelah data berubah. */
(() => {
const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const wibIso = ms => new Date(ms + 7 * 36e5).toISOString().slice(0, 10);
const geser = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const pendek = iso => +iso.slice(8) + " " + BLN[+iso.slice(5, 7) - 1];

/* ---------- model murni (diuji di tests/layar/pb_pilih_tanggal.test.mjs) ---------- */
/* tanggal WIB unik yang punya data, terbaru dulu; label Hari ini/Kemarin dihitung terhadap `kini` (ms) dalam WIB */
function daftarTanggal(waktu, kini) {
  const hi = wibIso(kini), kem = geser(hi, -1), ada = [...new Set((waktu || []).filter(Number.isFinite).map(wibIso))].sort().reverse();
  return ada.map(iso => ({iso, label: iso === hi ? "Hari ini" : iso === kem ? "Kemarin" : pendek(iso)}));
}
/* tanggal untuk tiap bagian segmen: hari ini dan kemarin (null bila tanpa data), sisanya masuk "Tanggal lain" */
function bagi(daftar, kini) {
  const hi = wibIso(kini), kem = geser(hi, -1), ada = new Set(daftar.map(d => d.iso));
  return {hariIni: ada.has(hi) ? hi : null, kemarin: ada.has(kem) ? kem : null, lain: daftar.filter(d => d.iso !== hi && d.iso !== kem)};
}
const sesuai = (ms, iso) => !iso || wibIso(ms) === iso;
const izinReg = (daftar, id) => id !== "karhutla" && (daftar || []).find(b => b.id === id)?.kemampuan?.layar?.pilih_tanggal === true;

/* ---------- tampilan ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
let REG = null;
const registri = () => REG ||= typeof fetch === "function" ? fetch("/bencana.json").then(r => r.ok ? r.json() : Promise.reject(new Error("registri " + r.status))).then(j => j.bencana || [], () => []) : Promise.resolve([]);
const tunda = f => typeof nanti === "function" ? nanti(f) : setTimeout(f, 0);
let A = null, IZIN = false, T = null, R = false, terakhir = "";   // T = tanggal terpilih (iso|null), R = mode Riwayat

function html() {
  const kini = Date.now(), d = daftarTanggal(A.tanggal(), kini), b = bagi(d, kini);
  const tb = (iso, n) => `<button type="button" data-pt="${iso || ""}" aria-pressed="${!!iso && T === iso}"${iso ? "" : " disabled"}>${n}</button>`;
  const lain = b.lain.length, sel = lain ? T && b.lain.some(x => x.iso === T) : false;
  const s1 = `<div class="seg penuh" role="group" aria-label="Pilih tanggal data" data-pt-baris>${tb(b.hariIni, "Hari ini")}${tb(b.kemarin, "Kemarin")}`
    + `<select data-pt-lain data-cantik="native" aria-label="Tanggal lain" aria-pressed="${sel}"${lain ? "" : " disabled"} style="flex:1;min-width:0;border:0;border-radius:999px;font:inherit;font-size:12px;font-weight:600;cursor:pointer;padding:5px 2px;text-align:center;background:${sel ? "var(--brand)" : "none"};color:${sel ? "var(--on-brand)" : "var(--ink2)"}">`
    + `<option value="">Tanggal lain</option>${b.lain.map(x => `<option value="${x.iso}"${T === x.iso ? " selected" : ""}>${esc(x.label)}</option>`).join("")}</select></div>`;
  const s2 = A.riwayat ? `<div class="seg penuh" role="group" aria-label="Real Time atau Riwayat" data-pt-mode><button type="button" data-ptm="0" aria-pressed="${!R}">Real Time</button><button type="button" data-ptm="1" aria-pressed="${R}">Riwayat</button></div>` : "";
  return `<div style="display:flex;flex-direction:column;gap:5px;width:100%">${s1}${s2}</div>`;
}
function gambar() {
  if (!A || !IZIN) return; const h = A.host(); if (!h) return; const x = html();
  if (x === terakhir && h.firstChild) return;   // DOM ditulis ulang hanya bila isinya berubah (fokus papan ketik tetap)
  terakhir = x; h.innerHTML = x;
  if (!h._pt) { h._pt = true;
    h.addEventListener("click", e => { const m = e.target.closest("[data-ptm]"), b = e.target.closest("[data-pt]");
      if (m) { const baru = m.dataset.ptm === "1"; if (baru === R) return; R = baru; gambar(); return tunda(() => A.riwayat.ubah(R)); }
      if (b && !b.disabled) { T = T === b.dataset.pt ? null : b.dataset.pt; gambar(); const t = T; tunda(() => A.ubah(t)); } });
    h.addEventListener("change", e => { if (!e.target.matches("[data-pt-lain]")) return; T = e.target.value || null; gambar(); const t = T; tunda(() => A.ubah(t)); }); }
}
/* tanggal terpilih yang datanya hilang (data hidup bergeser) dilepas, bukan dibiarkan menggantung */
function segar() { if (T && !daftarTanggal(A?.tanggal() || [], Date.now()).some(x => x.iso === T)) { T = null; tunda(() => A.ubah(null)); } gambar(); }

window.PilihTanggal = {
  pasang: a => { A = a; IZIN = false; T = null; R = false; terakhir = "";
    registri().then(d => { IZIN = izinReg(d, a.id); segar(); }); return a; },
  gambar: segar, lepas: () => { if (T) { T = null; terakhir = ""; gambar(); } }, diizinkan: () => IZIN, terpilih: () => T, riwayat: () => R, registri,
  model: {daftarTanggal, bagi, sesuai, izinReg, wibIso, geser}};
})();
