/* arsip_laporan.js: bagian "Arsip laporan harian" di tab Laporan (public/index.html #arsipLaporan).
   Membuka laporan hari-hari sebelumnya tanpa membuat ulang: tiap baris menautkan ke halaman yang
   sudah ada, lewat parameter tanggalnya.

     Laporan bencana harian  -> /laporan-bnpb?tanggal=…           (+ &unduh=pptx|pdf)
     Laporan karhutla harian -> /laporan?hari=…                   (+ &cetak=1)

   Kartu periodenya menyalin HariPeriodeBar pangantara: baris pertama "Kemarin | Periode | Besok"
   dengan tanggal sebagai lencana, baris kedua strip tujuh hari dengan loncat minggu di kedua ujung.
   Yang berbeda hanya satu: strip di sini Senin sampai Minggu, bukan Senin sampai Jumat, karena posko
   bekerja tiap hari.

   Hari mana yang punya laporan:
     karhutla -> /data/laporan.json (deret `hari`), terbuka untuk siapa pun yang boleh membuka situs.
     bencana  -> GET /api/laporan-bnpb?jenis=harian, hanya untuk yang sudah masuk admin. Ditolak 403
                 bukan berarti kosong, jadi kolomnya mengatakan "perlu masuk", tidak diam-diam "-". */
(() => {
const $ = s => document.querySelector(s);
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const BULAN_PJG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MAKS_BARIS = 14;                                   // "hari-hari sebelumnya" yang ditampilkan sekaligus

const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const d0 = s => new Date(s + "T00:00:00Z");
const iso = d => d.toISOString().slice(0, 10);
const geser = (s, n) => iso(new Date(Date.parse(s + "T00:00:00Z") + n * 864e5));
const hariIni = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);   // tanggal WIB
const tglPendek = s => { const d = d0(s); return `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}`; };
const tglPanjang = s => { const d = d0(s); return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN_PJG[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const tglPanjangPendek = s => { const d = d0(s); return `${HARI[d.getUTCDay()]}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const tglLencana = s => { const d = d0(s); return `${HARI[d.getUTCDay()].slice(0, 3)}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}`; };
/* Senin pekan yang memuat s */
const senin = s => geser(s, -((d0(s).getUTCDay() + 6) % 7));

/* ikon: dokumen bersudut lipat, hurufnya dipisah supaya PDF dan PPT terbaca tanpa warna saja */
const IKON_DOK = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/></svg>';
const IKON_CETAK = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z"/></svg>';
const IKON_KAL = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
const IKON_BUKA = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const S = {hari: hariIni(), karhutla: new Set(), bnpb: new Set(), kunci: "", akses: "memuat", manual: false};

/* tombol berkas: ikon dokumen + nama format, sebagai tautan supaya bisa dibuka di tab baru */
const tombol = (url, label, judul, ikon = IKON_DOK, kelas = "") =>
  `<a class="ar-ik ${kelas}" href="${esc(url)}" title="${esc(judul)}" aria-label="${esc(judul)}">${ikon}<span>${esc(label)}</span></a>`;

function selBencana(h) {
  if (S.akses === "tolak") return `<span class="ar-no" title="Masuk admin untuk membuka arsip laporan bencana harian">perlu masuk</span>`;
  if (S.akses === "memuat") return `<span class="ar-no">memuat…</span>`;
  if (!S.bnpb.has(h)) return `<span class="ar-no">belum dibuat</span>` +
    tombol(`/laporan-bnpb?tanggal=${h}`, "Isi", `Isi Laporan Kejadian Bencana Harian ${tglPanjang(h)}`, IKON_BUKA, "ar-ik2");
  return tombol(`/laporan-bnpb?tanggal=${h}`, "Buka", `Buka laporan ${tglPanjang(h)}`, IKON_BUKA, "ar-ik2")
    + tombol(`/laporan-bnpb?tanggal=${h}&unduh=pptx`, "PPT", `Unduh PPTX laporan bencana harian ${tglPanjang(h)}`)
    + tombol(`/laporan-bnpb?tanggal=${h}&unduh=pdf`, "PDF", `Unduh PDF laporan bencana harian ${tglPanjang(h)}`);
}
function selKarhutla(h) {
  if (!S.karhutla.has(h)) return `<span class="ar-no">tidak ada data</span>`;
  return tombol(`/laporan?hari=${h}`, "Buka", `Buka laporan karhutla harian ${tglPanjang(h)}`, IKON_BUKA, "ar-ik2")
    + tombol(`/laporan?hari=${h}&cetak=1`, "PDF", `Cetak atau unduh PDF laporan karhutla harian ${tglPanjang(h)}`, IKON_CETAK);
}

function gambar() {
  const w = $("#arsipLaporan"); if (!w) return;
  const h = S.hari, kemarin = geser(h, -1), besok = geser(h, 1), ini = hariIni();
  const sn = senin(h), pekan = Array.from({length: 7}, (_, i) => geser(sn, i));
  const baris = Array.from({length: MAKS_BARIS}, (_, i) => geser(h, -i));
  const labelPekan = s => `${tglPendek(senin(s))} - ${tglPendek(geser(senin(s), 6))}`;
  w.innerHTML = `
  <h3 class="ar-jd">Arsip laporan harian</h3>
  <p class="ar-sub">Laporan bencana harian dan laporan karhutla harian untuk hari-hari sebelumnya. Pilih tanggalnya, lalu buka atau unduh.</p>
  <div class="ar-periode" data-anatomi="kartu-periode-hari">
    <div class="ar-p1">
      <button type="button" class="ar-langkah" data-h="${kemarin}"><b>&lsaquo; Kemarin</b><span class="ar-len">${esc(tglLencana(kemarin))}</span></button>
      <div class="ar-tengah">
        <span class="ar-plabel">Periode</span>
        <span class="ar-pickw">
          <button type="button" class="ar-pick" id="arPick" aria-label="Pilih tanggal laporan">${IKON_KAL}<b>${esc(tglPanjangPendek(h))}</b></button>
          <input type="date" id="arTgl" value="${h}" max="${ini}" tabindex="-1" aria-hidden="true">
        </span>
        ${h === ini ? `<span class="ar-ini">Hari ini</span>` : `<button type="button" class="ar-balik" data-h="${ini}">&#8634; Hari ini</button>`}
      </div>
      <button type="button" class="ar-langkah ar-kanan" data-h="${besok}" ${besok > ini ? "disabled" : ""}><span class="ar-len">${esc(tglLencana(besok))}</span><b>Besok &rsaquo;</b></button>
    </div>
    <div class="ar-p2">
      <button type="button" class="ar-ujung" data-h="${geser(h, -7)}" title="${esc(labelPekan(geser(h, -7)))}">&lsaquo; ${esc(labelPekan(geser(h, -7)))}</button>
      <div class="ar-strip">${pekan.map(d => `<button type="button" class="ar-hari${d === h ? " on" : d === ini ? " kini" : ""}" data-h="${d}" ${d > ini ? "disabled" : ""}>
        <span>${HARI[d0(d).getUTCDay()]}</span><small>${esc(tglPendek(d))}</small></button>`).join("")}</div>
      <button type="button" class="ar-ujung" data-h="${geser(h, 7)}" title="${esc(labelPekan(geser(h, 7)))}" ${geser(h, 7) > ini ? "disabled" : ""}>${esc(labelPekan(geser(h, 7)))} &rsaquo;</button>
    </div>
  </div>
  <div class="ar-tabel"><table><thead><tr><th>Tanggal</th><th>Laporan bencana harian</th><th>Laporan karhutla harian</th></tr></thead><tbody>
    ${baris.map(d => `<tr class="${d === h ? "ar-on" : ""}"><td>${esc(tglPanjang(d))}</td><td>${selBencana(d)}</td><td>${selKarhutla(d)}</td></tr>`).join("")}
  </tbody></table></div>`;
  const inp = $("#arTgl");
  inp.onchange = e => { if (e.target.value) pilih(e.target.value); };
  /* Tombol berlabel Indonesia, bukan <input type="date"> telanjang: tanggalnya ditulis sendiri supaya
     tidak muncul "10/19/2026" bawaan Chrome. Kalendernya tetap kalender peramban, dipanggil lewat
     showPicker() dari input yang disembunyikan di belakang tombol. */
  $("#arPick").onclick = () => { try { inp.showPicker(); } catch (e) { inp.focus(); inp.click(); } };
}
function pilih(h) { if (h > hariIni()) return; S.hari = h; S.manual = true; gambar(); }

$("#arsipLaporan")?.addEventListener("click", e => {
  const b = e.target.closest("button[data-h]"); if (!b || b.disabled) return;
  pilih(b.dataset.h);
});

/* Daftar hari yang punya laporan. Dua sumber dibaca sekali saat tab dibuka; kegagalannya tidak
   mengosongkan tabel, hanya mengubah kata di selnya. */
async function muat() {
  const k = hariIni();
  if (S.kunci === k) return;                             // sudah dimuat untuk hari ini
  S.kunci = k;
  try {
    const L = await fetch("/data/laporan.json", {cache: "no-cache"}).then(r => r.ok ? r.json() : null);
    if (L?.hari) S.karhutla = new Set(L.hari);
  } catch (e) {}
  try {
    const r = await fetch("/api/laporan-bnpb?jenis=harian", {credentials: "same-origin"});
    if (r.status === 403 || r.status === 401) S.akses = "tolak";
    else if (!r.ok) S.akses = "gagal";
    else { const j = await r.json(); S.bnpb = new Set((j.daftar || []).map(x => x.tanggal)); S.akses = "ok"; }
  } catch (e) { S.akses = "gagal"; }
  /* Hari terpilih awal = hari terbaru yang BENAR-BENAR punya laporan, bukan hari ini. Data satelit
     kadang tertinggal sehari dua, dan arsip yang terbuka pada deretan "tidak ada data" tidak berguna. */
  if (!S.manual) {
    const ada = [...S.karhutla, ...S.bnpb].filter(h => h <= hariIni()).sort();
    if (ada.length && ada.at(-1) < S.hari) S.hari = ada.at(-1);
  }
  gambar();
}

window.ArsipLaporan = {gambar, muat, pilih, S};
gambar();
/* Berkas ini `defer`, jadi skrip utama index.html sudah memanggil bukaTab() sebelum ArsipLaporan ada.
   Kalau tab Laporan yang sedang terbuka (mis. masuk langsung ke /pelaporan), daftarnya dimuat di sini;
   perpindahan tab berikutnya dipanggil dari bukaTab. */
if (document.querySelector("#p-pelaporan")?.classList.contains("on")) muat();
})();
