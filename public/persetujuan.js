/* Persetujuan penyimpanan & analitik (dimuat SEBELUM jejak.js). Pilihan disimpan di localStorage "pb_persetujuan" bersama versi
   kebijakan dan tanggal; ditanya ulang setelah 12 bulan atau saat VERSI berubah. Analitik mati sampai pengunjung memilih
   "Terima semua" atau menyalakannya di "Atur"; Do Not Track / Global Privacy Control selalu memaksanya mati.
   Juga menggambar pil header "N online · N tampilan · Statistik →" dari atribut <html data-pb-*> yang diisi Worker. */
(() => {
  const D = document, W = window, N = navigator, KUNCI = "pb_persetujuan", VERSI = "2026-10", UMUR = 365 * 864e5;
  const dnt = N.doNotTrack === "1" || W.doNotTrack === "1" || N.globalPrivacyControl === true;
  const baca = () => { try { const o = JSON.parse(localStorage.getItem(KUNCI) || "null"); return o && o.v === VERSI && Date.now() - o.t < UMUR ? o : null; } catch (e) { return null; } };
  let pilihan = baca();
  function simpan(analitik) {
    const sebelum = !!pilihan?.analitik;
    pilihan = {v: VERSI, t: Date.now(), analitik: !!analitik && !dnt};
    try { localStorage.setItem(KUNCI, JSON.stringify(pilihan)); } catch (e) {}
    if (!pilihan.analitik) try { ["pb_vid", "pb_hari", "pb_hari1", "pb_akhir", "pb_slot"].forEach(k => localStorage.removeItem(k)); } catch (e) {}   // tarik persetujuan = id analitik dihapus
    D.dispatchEvent(new CustomEvent("pb-persetujuan", {detail: {analitik: pilihan.analitik, baru: pilihan.analitik && !sebelum}}));
    tutupSpanduk();
  }
  W.Persetujuan = {analitik: () => !dnt && !!pilihan?.analitik, pilihan: () => pilihan, buka: () => atur(), VERSI, simpan};

  D.head.insertAdjacentHTML("beforeend", `<style>
.pv{--pv-bg:#fff;--pv-ink:#0b2545;--pv-ink2:#56607a;--pv-line:#dfe3ec;--pv-soft:#f2f4f8;--pv-pri:#0b2545;--pv-pri-ink:#fff;font:14px/1.5 Inter,system-ui,sans-serif;color:var(--pv-ink)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .pv{--pv-bg:#172036;--pv-ink:#eef1f7;--pv-ink2:#aab4c8;--pv-line:#2a3550;--pv-soft:#1f2a44;--pv-pri:#4f8fc4}}
:root[data-theme="dark"] .pv{--pv-bg:#172036;--pv-ink:#eef1f7;--pv-ink2:#aab4c8;--pv-line:#2a3550;--pv-soft:#1f2a44;--pv-pri:#4f8fc4}
.pv-kartu{position:fixed;left:16px;bottom:16px;z-index:9000;width:min(400px,calc(100vw - 32px));background:var(--pv-bg);border:1px solid var(--pv-line);border-radius:16px;box-shadow:0 14px 40px rgb(11 37 69 / .22);padding:16px;display:grid;gap:12px}
.pv-kartu p{margin:0;color:var(--pv-ink2);font-size:13.5px}
.pv-kartu p a,.pv-dlg a{color:inherit;font-weight:600}
.pv-kepala{display:flex;gap:10px;align-items:center;font:800 15px "Plus Jakarta Sans",Inter,sans-serif}
.pv-kepala svg{flex:none;color:#e58a45}
.pv-aksi{display:flex;flex-wrap:wrap;gap:8px}
.pv button{font:700 12.5px Inter,sans-serif;letter-spacing:.04em;text-transform:uppercase;min-height:44px;padding:0 14px;border-radius:10px;cursor:pointer;border:1px solid var(--pv-line);background:var(--pv-soft);color:var(--pv-ink)}
.pv button.pv-pri{background:var(--pv-pri);color:var(--pv-pri-ink);border-color:var(--pv-pri);flex:1 1 100%}
.pv button:focus-visible,.pv input:focus-visible{outline:3px solid #e3b94e;outline-offset:2px}
.pv-dlg{border:0;border-radius:16px;padding:0;width:min(480px,calc(100vw - 24px));max-height:calc(100dvh - 24px);background:var(--pv-bg)}
.pv-dlg::backdrop{background:rgb(11 37 69 / .45)}
.pv-dlg form{padding:20px;display:grid;gap:12px}
.pv-dlg h2{margin:0;font:800 18px "Plus Jakarta Sans",Inter,sans-serif}
.pv-kat{border:1px solid var(--pv-line);border-radius:12px;padding:12px;display:grid;grid-template-columns:1fr auto;gap:4px 12px;align-items:center}
.pv-kat b{font-size:14px}.pv-kat small{grid-column:1;color:var(--pv-ink2);font-size:12.5px}
.pv-kat input{width:22px;height:22px;grid-row:1/3;grid-column:2;accent-color:#0b2545}
.pv-kat em{grid-row:1/3;grid-column:2;font-style:normal;font-size:12px;color:var(--pv-ink2)}
@media (max-width:560px){.pv-kartu{left:8px;right:8px;bottom:8px;width:auto;padding:12px;gap:8px;border-radius:14px}
  .pv-kartu .pv-kepala{display:none}.pv-kartu p{font-size:12.5px}
  .pv-aksi{display:grid;grid-template-columns:1fr 1fr;gap:6px}.pv button.pv-pri{grid-column:1/-1}.pv button{min-height:44px;font-size:11.5px;padding:0 8px}}
.pb-pil{display:inline-flex;align-items:center;gap:6px;color:#fff;text-decoration:none;font:600 12px Inter,sans-serif;background:rgb(255 255 255 / .12);border-radius:999px;padding:6px 11px;white-space:nowrap;margin-right:6px}
.pb-pil i{width:7px;height:7px;border-radius:50%;background:#5a9e74;box-shadow:0 0 0 3px rgb(90 158 116 / .3)}
@media (max-width:720px){.pb-pil .pb-pil-l{display:none}}
</style>`);
  const KUE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9 4 4 0 0 1-5-5 4 4 0 0 1-4-4z"/><path d="M8.5 9.5h.01M15 15h.01M10 16h.01M7 13h.01"/></svg>';
  const kebijakan = new URL("privasi.html#penyimpanan", D.baseURI).href;
  let kartu = null, dlg = null;
  function spanduk() {
    if (kartu) return;
    D.body.insertAdjacentHTML("beforeend", `<section class="pv pv-kartu" role="region" aria-label="Persetujuan penyimpanan dan analitik">
      <div class="pv-kepala">${KUE}Privasi Anda</div>
      <p>Kami memakai penyimpanan lokal untuk mengingat preferensi Anda dan, bila Anda setuju, menghitung bagian situs mana yang dibaca. Hanya pihak pertama — tidak dijual atau dibagikan. <a href="${kebijakan}">Kebijakan privasi</a></p>
      <div class="pv-aksi"><button class="pv-pri" data-pv="terima">Terima semua</button><button data-pv="tolak">Tolak non-esensial</button><button data-pv="atur">Atur</button></div></section>`);
    kartu = D.body.lastElementChild;
    kartu.addEventListener("click", e => { const b = e.target.closest("[data-pv]"); if (!b) return; const a = b.dataset.pv; if (a === "terima") simpan(true); else if (a === "tolak") simpan(false); else atur(); });
  }
  function tutupSpanduk() { kartu?.remove(); kartu = null; }
  /* "Atur": <dialog> modal — showModal() membuat sisa halaman inert (fokus terkurung), Esc menutup (event cancel bawaan) */
  function atur() {
    if (!dlg) {
      D.body.insertAdjacentHTML("beforeend", `<dialog class="pv pv-dlg" aria-labelledby="pvJudul"><form method="dialog">
        <h2 id="pvJudul">Pengaturan privasi</h2>
        <p class="kecil">Pilih apa yang boleh kami simpan di peramban ini. Anda bisa mengubahnya kapan saja lewat "Pengaturan privasi". <a href="${kebijakan}">Kebijakan privasi</a></p>
        <div class="pv-kat"><b>Esensial</b><small>Tema terang/gelap, preferensi tampilan, token laporan Lapor Warga, dan sesi admin. Selalu aktif karena situs membutuhkannya.</small><em>Selalu aktif</em></div>
        <label class="pv-kat"><b>Analitik</b><small>Statistik penggunaan anonim (tab, wilayah, dan fitur yang dibuka) untuk memperbaiki situs. Tanpa cookie, tanpa IP, tanpa iklan.${dnt ? " Dimatikan karena peramban Anda mengirim Do Not Track / Global Privacy Control." : ""}</small><input type="checkbox" name="analitik" ${W.Persetujuan.analitik() ? "checked" : ""} ${dnt ? "disabled" : ""}></label>
        <div class="pv-aksi"><button class="pv-pri" value="terima" type="submit">Terima semua</button><button value="simpan" type="submit">Simpan pilihan</button><button value="batal" type="submit" formnovalidate>Batal</button></div>
      </form></dialog>`);
      dlg = D.body.lastElementChild;
      dlg.addEventListener("close", () => { const v = dlg.returnValue; if (v === "terima") simpan(true); else if (v === "simpan") simpan(dlg.querySelector("[name=analitik]").checked); });
    }
    dlg.querySelector("[name=analitik]").checked = W.Persetujuan.analitik();
    dlg.returnValue = ""; dlg.showModal(); dlg.querySelector("input:not([disabled]),button").focus();
  }
  /* pil header (angka dari Worker; tanpa panggilan API) */
  function pil() {
    const a = D.documentElement.dataset, tema = D.getElementById("tema");
    if (!tema || a.pbOnline == null || D.querySelector(".pb-pil")) return;
    const f = n => Number(n || 0).toLocaleString("id-ID");
    tema.parentElement.insertAdjacentHTML("afterbegin", `<a class="pb-pil" href="/statistik" title="Statistik pengunjung"><i aria-hidden="true"></i>${f(a.pbOnline)} online<span class="pb-pil-l"> · ${f(a.pbTampil)} tampilan · Statistik →</span></a>`);
  }
  D.addEventListener("click", e => { if (e.target.closest?.("[data-pv-buka]")) { e.preventDefault(); atur(); } });   // tautan "Pengaturan privasi" di mana pun
  /* spanduk persetujuan disembunyikan dulu (pemilik, 14 Okt 2026); tanpa pilihan, analitik tetap mati. Munculkan lagi: SPANDUK = true */
  const SPANDUK = false;
  const siap = () => { if (!pilihan && SPANDUK) spanduk(); pil(); };
  if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", siap); else siap();
})();
