/* "Kirim pesan" ke tim: ikon di header + tombol di kaki Ringkasan/Metode, membuka dialog yang mengirim ke /api/pesan.
   Email hanya dipakai untuk membalas (privasi.html#pesan). Kolom "situs" adalah honeypot tersembunyi untuk bot. */
(() => {
  const D = document, sc = D.currentScript, API = new URL("api/pesan", sc?.src || location.href).href, KONFIG = new URL("api/warga/konfig", sc?.src || location.href).href;
  const KAT = [["masukan", "Masukan"], ["koreksi", "Koreksi data"], ["kerja_sama", "Kerja sama"], ["media", "Media"], ["lainnya", "Lainnya"]];
  /* ikon tiap topik (path 24×24) */
  const IK_KAT = {masukan: '<path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.8z"/>', koreksi: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    kerja_sama: '<path d="M8 12l3 3 5-5"/><path d="M3 12l4-4 5 2 5-2 4 4-9 9z"/>', media: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 13h7M7 16h4"/>', lainnya: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'};
  const IKON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg>';
  D.head.insertAdjacentHTML("beforeend", `<style>
.ps-dlg{--ps-bg:#fff;--ps-ink:#0b2545;--ps-ink2:#56607a;--ps-line:#dfe3ec;--ps-in:#f6f7fa;border:0;border-radius:16px;padding:0;width:min(700px,calc(100vw - 24px));max-height:calc(100dvh - 24px);background:var(--ps-bg);color:var(--ps-ink);font:14.5px/1.5 Inter,system-ui,sans-serif;box-shadow:0 20px 60px rgb(11 37 69 / .3)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .ps-dlg{--ps-bg:#172036;--ps-ink:#eef1f7;--ps-ink2:#aab4c8;--ps-line:#2a3550;--ps-in:#10172a}}
:root[data-theme="dark"] .ps-dlg{--ps-bg:#172036;--ps-ink:#eef1f7;--ps-ink2:#aab4c8;--ps-line:#2a3550;--ps-in:#10172a}
.ps-dlg::backdrop{background:rgb(11 37 69 / .45)}
.ps-dlg form{display:flex;flex-direction:column;max-height:calc(100dvh - 24px)}
.ps-dlg .ps-hd{display:flex;align-items:center;gap:12px;padding:16px 20px;background:linear-gradient(135deg,#1d4e89,#0b2545);color:#fff}
.ps-dlg .ps-hd p{color:rgb(255 255 255 / .8)!important}
.ps-dlg .ps-hd .ps-x{background:rgb(255 255 255 / .12);border-color:rgb(255 255 255 / .3);color:#fff}
.ps-dlg .ps-ik{flex:none;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#f08a3c,#d9532b);color:#fff}
.ps-dlg .ps-hp2{margin-top:3px;font-size:12.5px}
.ps-dlg .ps-l{display:flex;align-items:baseline;justify-content:space-between;font-weight:700;font-size:12.5px}
.ps-dlg .ps-l small{font-weight:500;color:var(--ps-ink2);font-size:11px}
.ps-dlg .ps-kat{display:grid;gap:6px}
.ps-dlg .ps-kat > div{display:flex;flex-wrap:nowrap;gap:6px}
@media (max-width:620px){.ps-dlg .ps-kat > div{flex-wrap:wrap}}
.ps-dlg .ps-chip{display:inline-flex;flex:1 1 auto;cursor:pointer;font-weight:600}  /* chip topik dibentang dari tepi ke tepi (pemilik, 15 Okt 2026) */
.ps-dlg .ps-chip input{position:absolute;opacity:0;width:1px;height:1px}
.ps-dlg .ps-chip span svg{width:14px;height:14px;flex:none}
.ps-dlg .ps-chip span{display:inline-flex;flex:1;justify-content:center;white-space:nowrap;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;border:1px solid var(--ps-line);background:var(--ps-bg);font-size:12.5px}
.ps-dlg .ps-chip input:checked + span{background:#0b2545;border-color:#0b2545;color:#fff}
.ps-dlg .ps-chip input:focus-visible + span{outline:2px solid #1d4e89;outline-offset:2px}
:root[data-theme="dark"] .ps-dlg .ps-chip input:checked + span{background:#4f8fc4;border-color:#4f8fc4}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .ps-dlg .ps-chip input:checked + span{background:#4f8fc4;border-color:#4f8fc4}}
.ps-dlg .ps-ik svg{width:20px;height:20px}
.ps-dlg .ps-hd > div{flex:1;min-width:0}
.ps-dlg h2{font:800 19px/1.25 "Plus Jakarta Sans",Inter,sans-serif;margin:0}
.ps-dlg .ps-sub{display:inline-block;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:6px;padding:2px 9px;border-radius:999px;background:color-mix(in oklch,#1d4e89 12%,transparent);color:#1d4e89;font-size:11px;font-weight:700}
.ps-dlg .ps-x{flex:none;width:36px;height:36px;padding:0;border-radius:50%;display:grid;place-items:center;font-size:20px;line-height:1}
.ps-dlg .ps-bd{display:grid;gap:12px;padding:16px 20px;overflow:auto}
.ps-dlg p{margin:0;color:var(--ps-ink2);font-size:13px}
.ps-dlg .ps-ket{display:flex;gap:8px;align-items:flex-start;padding:9px 12px;border-radius:10px;background:var(--ps-in);border:1px solid var(--ps-line);font-size:12.5px}
.ps-dlg .ps-ket a{color:#1d4e89;font-weight:700;text-decoration:none}
.ps-dlg .ps-ket a:hover{text-decoration:underline}
.ps-dlg label{display:grid;gap:4px;font-weight:600;font-size:13px}
.ps-dlg label small{font-weight:400;color:var(--ps-ink2)}
.ps-dlg input,.ps-dlg select,.ps-dlg textarea{font:inherit;color:inherit;background:var(--ps-bg);border:1px solid var(--ps-line);border-radius:10px;padding:10px 12px;width:100%;transition:border-color .15s,box-shadow .15s}
.ps-dlg input:focus,.ps-dlg select:focus,.ps-dlg textarea:focus{outline:none;border-color:#1d4e89;box-shadow:0 0 0 3px color-mix(in oklch,#1d4e89 18%,transparent)}
.ps-dlg textarea{min-height:120px;resize:vertical}
.ps-dlg .ps-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (max-width:480px){.ps-dlg .ps-2{grid-template-columns:1fr}.ps-dlg .ps-ik{display:none}}
.ps-dlg .ps-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
.ps-dlg .ps-cek{display:flex;gap:8px;align-items:flex-start;font-weight:400}
.ps-dlg .ps-cek input{width:auto;margin-top:3px}
.ps-dlg .ps-aksi{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 20px 18px;border-top:1px solid var(--ps-line)}
.ps-dlg .ps-aksi button{min-height:44px}
.ps-dlg .ps-galat{color:#c9503a;font-weight:600;font-size:13px}
.ps-dlg .ps-galat:empty{display:none}
.ps-dlg button{font:600 14px Inter,sans-serif;border-radius:10px;padding:9px 16px;cursor:pointer;border:1px solid var(--ps-line);background:transparent;color:inherit}
.ps-dlg button.ps-kirim{background:linear-gradient(135deg,#f08a3c,#d9532b);color:#fff;border-color:transparent;font-weight:800}
:root[data-theme="dark"] .ps-dlg button.ps-kirim{background:#4f8fc4;border-color:#4f8fc4}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .ps-dlg button.ps-kirim{background:#4f8fc4;border-color:#4f8fc4}}
.ps-fab{position:fixed;right:16px;bottom:16px;z-index:40;height:48px;padding:0 18px 0 14px;border-radius:999px;border:2px solid #fff;display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#f08a3c,#d9532b);color:#fff;font:800 14px Inter,system-ui,sans-serif;box-shadow:0 8px 22px rgb(217 83 43 / .45);cursor:pointer}
.ps-fab:hover{filter:brightness(1.06);transform:translateY(-1px)}
.ps-fab svg{width:20px;height:20px}
@media (max-width:640px){.ps-fab span{display:none}.ps-fab{width:48px;padding:0;justify-content:center}}
body:has(#p-peta.on) .ps-fab{right:62px;bottom:44px} /* kiri tombol zoom peta (pemilik, 14 Okt 2026) */
.ps-kaki{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;padding:18px 16px 28px}
.ps-kaki button{font:600 14px Inter,sans-serif;display:inline-flex;gap:8px;align-items:center;border-radius:999px;padding:9px 18px;min-height:44px;cursor:pointer;border:1px solid currentColor;background:transparent;color:inherit;opacity:.85}
.ps-kaki button:hover{opacity:1}
</style>`);
  let dlg, ts = null, konfig;
  const muatTurnstile = () => muatTurnstile._p ||= new Promise((ok, no) => { const s = D.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.onload = ok; s.onerror = no; D.head.appendChild(s); });
  function buka() {
    if (!dlg) {
      D.body.insertAdjacentHTML("beforeend", `<dialog class="ps-dlg" aria-labelledby="psJudul"><form method="dialog" novalidate>
        <div class="ps-hd"><span class="ps-ik">${IKON}</span><div><h2 id="psJudul">Chat Admin</h2><p class="ps-hp2">Tim Pantau Bencana membaca setiap pesan dan membalas lewat email.</p></div><button type="button" class="ps-x" data-tutup aria-label="Tutup">×</button></div>
        <div class="ps-bd">
        <div class="ps-kat" role="radiogroup" aria-label="Topik pesan"><span class="ps-l">Topik</span><div>${KAT.map(([k, n], i) => `<label class="ps-chip"><input type="radio" name="kategori" value="${k}" ${i ? "" : "checked"}><span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IK_KAT[k]}</svg>${n}</span></label>`).join("")}</div></div>
        <div class="ps-2"><label><span class="ps-l">Nama <small>opsional</small></span><input name="nama" maxlength="100" autocomplete="name" placeholder="Nama kamu"></label>
        <label><span class="ps-l">Instansi <small>opsional</small></span><input name="instansi" maxlength="150" autocomplete="organization" placeholder="Organisasi / media"></label></div>
        <label><span class="ps-l">Email</span><input name="email" type="email" maxlength="254" required autocomplete="email" inputmode="email" placeholder="nama@contoh.com"></label>
        <label><span class="ps-l">Pesan <small>10–2000 karakter</small></span><textarea name="pesan" minlength="10" maxlength="2000" required placeholder="Tulis pesan, koreksi data, atau pertanyaan kamu…"></textarea></label>
        <label class="ps-cek"><input type="checkbox" name="sertakan" checked> <span>Sertakan tautan tampilan yang sedang saya buka</span></label>
        <label class="ps-hp" aria-hidden="true">Situs<input name="situs" tabindex="-1" autocomplete="off"></label>
        <div id="psTs"></div>
        <p class="ps-galat" role="alert"></p>
        </div>
        <div class="ps-aksi"><button type="button" data-tutup>Batal</button><button class="ps-kirim" type="submit">Kirim</button></div>
      </form></dialog>`);
      dlg = D.body.lastElementChild;
      dlg.querySelectorAll("[data-tutup]").forEach(b => b.onclick = () => dlg.close());
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
      (typeof toast === "function" ? toast : alert)("Terima kasih, pesan kamu sudah terkirim. Kami akan membalas lewat email.");
    } catch (err) { g.textContent = err.message; if (ts != null) turnstile.reset(ts); }
    finally { b.disabled = false; b.textContent = "Kirim"; }
  }
  /* pemasangan: ikon header (sebelum tombol tema) + tombol di kaki Ringkasan & Metode */
  const tema = D.getElementById("tema");
  /* tombol pesan mengambang di kanan bawah (pemilik, 14 Okt 2026), bukan di header */
  if (tema) D.body.insertAdjacentHTML("beforeend", `<button class="ps-fab" id="kirimPesan" aria-label="Chat admin" title="Kirim pesan ke tim">${IKON}<span>Chat Admin</span></button>`);
  D.getElementById("kirimPesan")?.addEventListener("click", buka);
  for (const id of ["p-ringkasan", "p-metode"]) {
    const s = D.getElementById(id); if (!s) continue;
    s.insertAdjacentHTML("beforeend", `<div class="ps-kaki"><button type="button">${IKON}Kirim pesan ke tim</button><button type="button" data-pv-buka>Pengaturan privasi</button></div>`);
    s.lastElementChild.querySelector("button").addEventListener("click", buka);
  }
  window.Pesan = {buka};
})();
