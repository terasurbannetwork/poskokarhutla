/* Pop-up alarm peringatan dini (PERINGATAN-DINI.md §3), dipasang di semua halaman bencana dan /semua.
   Sumber: GET /api/peringatan/aktif (src/peringatan.js). Jajak tiap 60 dtk hanya saat tab terlihat; tiap alarm tampil sekali per
   perangkat (localStorage "pb_alarm"). Rupa meniru pop-up Situasi (public/inti/sapa.js): kepala navy, pil tingkat, tombol bulat.
   Kartu tidak modal (pojok kanan bawah) supaya tidak menghalangi peta; teks dari API selalu di-escape. */
(() => {
  const JEDA = 60e3, KUNCI = "pb_alarm", MAKS_INGAT = 300;
  const RUTE = {karhutla: "/", banjir: "/banjir/", gempa: "/gempa/", tsunami: "/gempa/", cuaca: "/cuaca/"};
  const WARNA = {Waspada: "#e3b94e", Siaga: "#e58a45", Awas: "#c9503a"};
  const PRIORITAS = {Waspada: 1, Siaga: 2, Awas: 3};
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const baca = () => { try { return JSON.parse(localStorage.getItem(KUNCI) || "[]"); } catch (e) { return []; } };
  const tandai = k => { try { const a = baca().filter(x => x !== k); a.push(k); localStorage.setItem(KUNCI, JSON.stringify(a.slice(-MAKS_INGAT))); } catch (e) {} };
  const jam = iso => { const d = new Date(iso); return isNaN(d) ? "" : new Intl.DateTimeFormat("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).format(d).replace(":", "."); };
  let antre = [], tampil = false, sejak = Date.now() - 24 * 36e5, el = null;

  document.head.insertAdjacentHTML("beforeend", `<style>
.al{position:fixed;right:16px;bottom:16px;z-index:60;width:min(420px,calc(100vw - 32px));border-radius:18px;overflow:hidden;background:var(--card,#fff);color:var(--ink,#0b2545);box-shadow:0 12px 40px rgb(0 0 0 / .25);font:14px/1.45 var(--font,system-ui)}
.al-hd{display:flex;gap:10px;align-items:flex-start;padding:14px 16px 12px;background:linear-gradient(135deg,#0b2545,#163a66);color:#fff}
.al-ey{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#f5a06b;white-space:nowrap}
.al-hd h3{margin:6px 0 0;font:700 16px/1.35 var(--display,inherit);color:#fff}
.al-x{margin-left:auto;border:0;background:rgb(255 255 255 / .14);color:#fff;width:32px;height:32px;border-radius:50%;font-size:18px;line-height:1;cursor:pointer;flex:none}
.al-isi{padding:12px 16px 4px;display:grid;gap:8px}
.al-pil{display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;scrollbar-width:none}
.al-p{display:inline-flex;align-items:center;font-style:normal;font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap;background:color-mix(in oklch,var(--w) 16%,var(--card,#fff));color:color-mix(in oklch,var(--w) 75%,#000)}
.al-isi p{margin:0;color:var(--ink2,#4a5568);font-size:13px}
.al-aksi{display:flex;gap:8px;padding:12px 16px 14px}
.al-aksi a{flex:1;display:inline-flex;justify-content:center;align-items:center;min-height:40px;border-radius:999px;font-weight:700;font-size:13px;text-decoration:none}
.al-pri{background:#0b2545;color:#fff}.al-sek{border:1px solid var(--line,#d5dbe3);color:inherit}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .al-pri{background:#e8743b}}
:root[data-theme="dark"] .al-pri{background:#e8743b}
</style>`);

  function kartu(a) {
    const w = WARNA[a.tingkat] || WARNA.Waspada, wil = [a.kab, a.prov && window.namaProv ? namaProv(a.prov) : ""].filter(Boolean).join(", ");
    return `<div class="al" role="alertdialog" aria-live="assertive" aria-label="Peringatan dini">
  <div class="al-hd"><div><span class="al-ey">Peringatan ${esc(a.tingkat)}</span><h3>${esc(a.judul)}</h3></div><button class="al-x" type="button" data-tutup aria-label="Tutup">×</button></div>
  <div class="al-isi"><div class="al-pil"><em class="al-p" style="--w:${w}">${esc(a.tingkat)}</em><em class="al-p" style="--w:#1d4e89">${esc(a.sumber)}</em>${wil ? `<em class="al-p" style="--w:#6b7489" translate="no">${esc(wil)}</em>` : ""}<em class="al-p" style="--w:#6b7489">${esc(jam(a.dibuat))}</em></div>
  ${a.teks ? `<p>${esc(a.teks)}</p>` : ""}</div>
  <div class="al-aksi"><a class="al-pri" href="${esc(RUTE[a.jenis] || "/")}">Lihat di peta</a><a class="al-sek" href="/peringatan">Dapatkan lewat email</a></div>
</div>`;
  }

  function berikut() {
    if (tampil || !antre.length) return;
    const a = antre.shift(); tampil = true; tandai(a.kunci);
    const t = document.createElement("div"); t.innerHTML = kartu(a); el = t.firstElementChild; document.body.append(el);
    el.addEventListener("click", e => { if (e.target.closest("[data-tutup]")) { el.remove(); el = null; tampil = false; setTimeout(berikut, 400); } });
  }

  async function jajak() {
    if (document.visibilityState !== "visible") return;
    try {
      const r = await fetch(`/api/peringatan/aktif?sejak=${sejak}`, {cache: "no-store"}); if (!r.ok) return;
      const j = await r.json(), sudah = new Set(baca()), ada = new Set(antre.map(x => x.kunci));
      for (const a of (j.peringatan || [])) if (a?.kunci && !sudah.has(a.kunci) && !ada.has(a.kunci)) antre.push(a);
      // Tingkat tertinggi tampil dulu (Awas > Siaga > Waspada), lalu yang terbaru.
      antre.sort((x, y) => (PRIORITAS[y.tingkat] || 0) - (PRIORITAS[x.tingkat] || 0) || String(y.dibuat).localeCompare(String(x.dibuat)));
      (window.requestIdleCallback || setTimeout)(berikut);
    } catch (e) {}
  }

  setTimeout(jajak, 3000);
  setInterval(jajak, JEDA);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") jajak(); });
})();
