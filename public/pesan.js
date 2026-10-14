/* "Kirim pesan" ke tim: ikon di header + tombol di kaki Ringkasan/Metode, membuka dialog yang mengirim ke /api/pesan.
   Email hanya dipakai untuk membalas (privasi.html#pesan). Kolom "situs" adalah honeypot tersembunyi untuk bot. */
(() => {
  const D = document, sc = D.currentScript, API = new URL("api/pesan", sc?.src || location.href).href, KONFIG = new URL("api/warga/konfig", sc?.src || location.href).href;
  const KAT = [["masukan", "Masukan"], ["koreksi", "Koreksi data"], ["kerja_sama", "Kerja sama"], ["media", "Media"], ["lainnya", "Lainnya"]];
  const IKON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg>';
  D.head.insertAdjacentHTML("beforeend", `<style>
.ps-dlg{--ps-bg:#fff;--ps-ink:#0b2545;--ps-ink2:#56607a;--ps-line:#dfe3ec;--ps-in:#f6f7fa;border:0;border-radius:16px;padding:0;width:min(520px,calc(100vw - 24px));max-height:calc(100dvh - 24px);background:var(--ps-bg);color:var(--ps-ink);font:14.5px/1.5 Inter,system-ui,sans-serif;box-shadow:0 20px 60px rgb(11 37 69 / .3)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .ps-dlg{--ps-bg:#172036;--ps-ink:#eef1f7;--ps-ink2:#aab4c8;--ps-line:#2a3550;--ps-in:#10172a}}
:root[data-theme="dark"] .ps-dlg{--ps-bg:#172036;--ps-ink:#eef1f7;--ps-ink2:#aab4c8;--ps-line:#2a3550;--ps-in:#10172a}
.ps-dlg::backdrop{background:rgb(11 37 69 / .45)}
.ps-dlg form{display:grid;gap:10px;padding:20px}
.ps-dlg h2{font:800 19px/1.25 "Plus Jakarta Sans",Inter,sans-serif;margin:0}
.ps-dlg p{margin:0;color:var(--ps-ink2);font-size:13px}
.ps-dlg label{display:grid;gap:4px;font-weight:600;font-size:13px}
.ps-dlg label small{font-weight:400;color:var(--ps-ink2)}
.ps-dlg input,.ps-dlg select,.ps-dlg textarea{font:inherit;color:inherit;background:var(--ps-in);border:1px solid var(--ps-line);border-radius:10px;padding:9px 11px;width:100%}
.ps-dlg textarea{min-height:120px;resize:vertical}
.ps-dlg .ps-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (max-width:480px){.ps-dlg .ps-2{grid-template-columns:1fr}}
.ps-dlg .ps-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.ps-dlg .ps-cek{display:flex;gap:8px;align-items:flex-start;font-weight:400}
.ps-dlg .ps-cek input{width:auto;margin-top:3px}
.ps-dlg .ps-aksi{display:flex;gap:8px;justify-content:flex-end;align-items:center}
.ps-dlg .ps-galat{color:#c9503a;font-weight:600;font-size:13px;min-height:1em}
.ps-dlg button{font:600 14px Inter,sans-serif;border-radius:10px;padding:9px 16px;cursor:pointer;border:1px solid var(--ps-line);background:transparent;color:inherit}
.ps-dlg button.ps-kirim{background:#0b2545;color:#fff;border-color:#0b2545}
:root[data-theme="dark"] .ps-dlg button.ps-kirim{background:#4f8fc4;border-color:#4f8fc4}
.ps-kaki{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;padding:18px 16px 28px}
.ps-kaki button{font:600 14px Inter,sans-serif;display:inline-flex;gap:8px;align-items:center;border-radius:999px;padding:9px 18px;min-height:44px;cursor:pointer;border:1px solid currentColor;background:transparent;color:inherit;opacity:.85}
.ps-kaki button:hover{opacity:1}
</style>`);
  let dlg, ts = null, konfig;
  const muatTurnstile = () => muatTurnstile._p ||= new Promise((ok, no) => { const s = D.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.onload = ok; s.onerror = no; D.head.appendChild(s); });
  function buka() {
    if (!dlg) {
      D.body.insertAdjacentHTML("beforeend", `<dialog class="ps-dlg" aria-labelledby="psJudul"><form method="dialog" novalidate>
        <h2 id="psJudul">Kirim pesan ke tim</h2>
        <p>Untuk masukan, koreksi data, kerja sama, atau pertanyaan media. Email Anda hanya dipakai untuk membalas. <a href="/privasi.html#pesan" target="_blank" rel="noopener">Privasi</a></p>
        <div class="ps-2"><label>Nama <small>(opsional)</small><input name="nama" maxlength="100" autocomplete="name"></label>
        <label>Instansi / organisasi <small>(opsional)</small><input name="instansi" maxlength="150" autocomplete="organization"></label></div>
        <div class="ps-2"><label>Email<input name="email" type="email" maxlength="254" required autocomplete="email" inputmode="email"></label>
        <label>Kategori<select name="kategori">${KAT.map(([k, n]) => `<option value="${k}">${n}</option>`).join("")}</select></label></div>
        <label>Pesan <small>(10–2000 karakter)</small><textarea name="pesan" minlength="10" maxlength="2000" required></textarea></label>
        <label class="ps-cek"><input type="checkbox" name="sertakan" checked> <span>Sertakan tautan tampilan yang sedang saya buka</span></label>
        <label class="ps-hp" aria-hidden="true">Situs<input name="situs" tabindex="-1" autocomplete="off"></label>
        <div id="psTs"></div>
        <p class="ps-galat" role="alert"></p>
        <div class="ps-aksi"><button type="button" data-tutup>Batal</button><button class="ps-kirim" type="submit">Kirim</button></div>
      </form></dialog>`);
      dlg = D.body.lastElementChild;
      dlg.querySelector("[data-tutup]").onclick = () => dlg.close();
      dlg.querySelector("form").addEventListener("submit", kirim);
    }
    const f = dlg.querySelector("form"); f.querySelector(".ps-galat").textContent = "";
    dlg.showModal(); window.Jejak?.catat("pesan_buka", D.querySelector(".page.on")?.id?.replace(/^p-/, "") || "-");
    (konfig ||= fetch(KONFIG).then(r => r.ok ? r.json() : {}).catch(() => ({}))).then(k => {
      if (k.turnstile && ts == null) muatTurnstile().then(() => { ts = turnstile.render("#psTs", {sitekey: k.turnstile, language: "id"}); }).catch(() => {});
    });
  }
  async function kirim(e) {
    e.preventDefault();
    const f = e.target, g = f.querySelector(".ps-galat"), b = f.querySelector(".ps-kirim"), v = n => f.elements[n].value.trim();
    if (!/^\S+@\S+\.\S+$/.test(v("email"))) return g.textContent = "Isi alamat email yang sah supaya kami bisa membalas.";
    if (v("pesan").length < 10) return g.textContent = "Pesan minimal 10 karakter.";
    const o = {nama: v("nama"), instansi: v("instansi"), email: v("email"), kategori: v("kategori"), pesan: v("pesan"), situs: f.elements.situs.value,
      tautan: f.elements.sertakan.checked ? location.href : ""};
    if (ts != null) o.turnstile = turnstile.getResponse(ts);
    b.disabled = true; b.textContent = "Mengirim…"; g.textContent = "";
    try {
      const r = await fetch(API, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(o)});
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).galat || "Gagal mengirim (" + r.status + ")");
      window.Jejak?.catat("pesan_kirim", o.kategori);
      f.reset(); dlg.close();
      (typeof toast === "function" ? toast : alert)("Terima kasih, pesan Anda sudah terkirim. Kami akan membalas lewat email.");
    } catch (err) { g.textContent = err.message; if (ts != null) turnstile.reset(ts); }
    finally { b.disabled = false; b.textContent = "Kirim"; }
  }
  /* pemasangan: ikon header (sebelum tombol tema) + tombol di kaki Ringkasan & Metode */
  const tema = D.getElementById("tema");
  if (tema) tema.insertAdjacentHTML("beforebegin", `<button class="iconbtn" id="kirimPesan" aria-label="Kirim pesan ke tim" title="Kirim pesan">${IKON}</button>`);
  D.getElementById("kirimPesan")?.addEventListener("click", buka);
  for (const id of ["p-ringkasan", "p-metode"]) {
    const s = D.getElementById(id); if (!s) continue;
    s.insertAdjacentHTML("beforeend", `<div class="ps-kaki"><button type="button">${IKON}Kirim pesan ke tim</button><button type="button" data-pv-buka>Pengaturan privasi</button></div>`);
    s.lastElementChild.querySelector("button").addEventListener("click", buka);
  }
  window.Pesan = {buka};
})();
