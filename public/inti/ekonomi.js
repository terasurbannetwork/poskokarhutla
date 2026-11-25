"use strict";
/* Kartu keputusan ekonomi (F-21, PB-55). Berkas: /data/ekonomi/<bencana>.json (scripts/umum/ekonomi.py).
   Ditahan (validasi-model 25 Nov 2026): kartu hanya menampilkan jiwa terpapar per kab/kota dan tabel komponen
   ("koefisien tidak tersedia" atau "ditahan sampai uji balik"); tidak ada angka mengungsi, kg, atau rupiah di mana pun.
   Kolom di luar kab, nama, prov, jiwa diabaikan walau ada di berkas. Kosong tampil "tidak ada data", tidak pernah 0.
   Pil "Hipotesis" di kepala bila berkas hipotesis. Sumber dan definisi di title (hover), tanpa kaki Sumber.
   Kepala kartu = nama seksi berikon, tanpa kalimat temuan (AGENTS 3.5, 11 Nov 2026). Kartu.ikonSeksi dipakai bila kartu.js dimuat.
   Pakai: PbEkonomi.pasang(host, "banjir") (async, kartu ditambahkan di akhir host); PbEkonomi.html(data) untuk string. */
const PbEkonomi = (() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const KOSONG = "tidak ada data", NAMA = "Keputusan ekonomi", BARIS = 10;
  const KOMPONEN = {perkiraan_mengungsi: "Perkiraan mengungsi", beras_per_hari: "Kebutuhan beras per hari", nilai_bangunan: "Nilai bangunan terpapar",
    pangan_selain_beras: "Pangan selain beras", air_hunian_jamban: "Air, hunian, dan jamban"};
  const angka = v => typeof v === "number" && isFinite(v) ? v.toLocaleString("id-ID") : KOSONG;
  const ikon = () => typeof Kartu !== "undefined" && Kartu.ikonSeksi ? Kartu.ikonSeksi(NAMA) : "";
  const td = (teks, title) => `<td${title ? ` title="${esc(title)}"` : ""}>${esc(teks)}</td>`;
  const kartu = (pil, isi, sumber) => `<article class="ex ex-std" data-kp="1" data-ekonomi="1"><header class="ex-hd">${pil}<div class="ex-jd"><h3${sumber ? ` title="${esc(sumber)}"` : ""}>${ikon()}${esc(NAMA)}</h3></div></header><div class="ex-bd">${isi}</div></article>`;

  function html(d) {
    if (!d || !Array.isArray(d.kolom) || !Array.isArray(d.baris)) return kartu("", "<p>Tidak ada data ekonomi untuk bencana ini.</p>", "");
    const i = Object.fromEntries(d.kolom.map((k, n) => [k, n]));
    const pil = d.hipotesis ? `<span class="ex-ey" title="${esc(d.hipotesis_alasan || "Belum diuji balik")}">Hipotesis</span>` : "";
    const rows = d.baris.slice(0, BARIS).map(r => `<tr>${td(r[i.nama], r[i.kab])}${td(angka(r[i.jiwa]))}</tr>`).join("");
    const label = d.label_jiwa || "Jiwa terpapar";
    const paparan = `<table class="ex-tabel"><thead><tr><th title="${esc(`${BARIS} kab/kota dengan paparan terbesar dari ${d.baris.length}`)}">Kab/kota</th>`
      + `<th title="${esc(d.paparan || "")}">${esc(label)}</th></tr></thead><tbody>${rows || `<tr><td colspan="2">${KOSONG}</td></tr>`}</tbody></table>`;
    const kp = (d.komponen || []).map(x => `<tr>${td(KOMPONEN[x.komponen] || x.komponen)}${td(x.teks || KOSONG, x.alasan)}</tr>`).join("");
    const komponen = kp ? `<table class="ex-tabel"><thead><tr><th>Komponen</th><th title="Rupiah hanya bila koefisien bersumber (Q6) dan perkiraan mengungsi lulus uji balik">Status</th></tr></thead><tbody>${kp}</tbody></table>` : "";
    return kartu(pil, paparan + komponen, [d.ditahan, d.dibuat && "dihitung " + d.dibuat.slice(0, 10)].filter(Boolean).join(", "));
  }

  /* gagal muat (404, JSON rusak, jaringan) = kartu "tidak ada data", bukan angka */
  const muat = (id, url) => fetch(url || `/data/ekonomi/${encodeURIComponent(id)}.json`).then(r => r.ok ? r.json() : null).catch(() => null);
  async function pasang(host, id, o = {}) {
    const d = await muat(id, o.url);
    if (!host) return null;
    host.insertAdjacentHTML("beforeend", html(d));
    return host.lastElementChild;
  }
  return {html, pasang, muat};
})();
if (typeof window !== "undefined") window.PbEkonomi = PbEkonomi;
