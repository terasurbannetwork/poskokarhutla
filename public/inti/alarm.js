/* Pop-up alarm peringatan dini (PERINGATAN-DINI.md §3), dipasang di semua halaman bencana dan /semua.
   Sumber: GET /api/peringatan/aktif (src/peringatan.js). Jajak tiap 60 dtk hanya saat tab terlihat; tiap alarm tampil sekali per
   perangkat (localStorage "pb_alarm"). Rupa meniru pop-up Situasi (public/inti/sapa.js): kepala navy, pil tingkat, tombol bulat.
   Kartu tidak modal (pojok kanan bawah) supaya tidak menghalangi peta; teks dari API selalu di-escape. Banjir ikut berbunyi (BERBUNYI).
   Kartu karhutla: SATU GET /api/cc/status?kunci= (src/command_center.js). Hanya 200 (operator/staf command center yang sedang masuk) menambah bagian
   tindak lanjut (status, pemegang, tombol 'aksi' -> POST /api/cc/aksi/:id) dan membunyikan SUARA. 401/403/404/jaringan putus/bentuk asing = kartu publik
   apa adanya, tanpa pesan, supaya pengunjung biasa tidak melihat bedanya. Bagian operator memakai DOM kecil + delegasi klik yang sama dengan tombol tutup. */
(() => {
  const JEDA = 60e3, KUNCI = "pb_alarm", MAKS_INGAT = 300;
  /* jenis yang berbunyi saat kartunya muncul (bunyi sama dengan /monitor). Peramban menolak bunyi sebelum pengunjung mengetuk halaman: gagal diam, kartu tetap tampil. */
  const BERBUNYI = new Set(["banjir"]), SUARA = "/suara/alarm-api.mp3";
  const RUTE = {karhutla: "/", banjir: "/banjir/", gempa: "/gempa/", tsunami: "/gempa/", cuaca: "/cuaca/"};
  const WARNA = {Waspada: "#e3b94e", Siaga: "#e58a45", Awas: "#c9503a"};
  const PRIORITAS = {Waspada: 1, Siaga: 2, Awas: 3};
  /* logo WhatsApp (path Simple Icons), bagikan judul + teks + tautan peta lewat wa.me */
  const WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41"/></svg>';
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const baca = () => { try { return JSON.parse(localStorage.getItem(KUNCI) || "[]"); } catch (e) { return []; } };
  const tandai = k => { try { const a = baca().filter(x => x !== k); a.push(k); localStorage.setItem(KUNCI, JSON.stringify(a.slice(-MAKS_INGAT))); } catch (e) {} };
  const jam = iso => { const d = new Date(iso); return isNaN(d) ? "" : new Intl.DateTimeFormat("id-ID", {day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"}).format(d).replace(":", "."); };
  /* nama + warna pil status command center dan nama tombol aksi. Warna [1] SALINAN PERSIS token --cc-* di public/admin/command_bersama.css baris 3
     (berkas ini tak bisa berbagi CSS var dengan meja operator); ubah di sana, ubah di sini. Dipakai sebagai --w pil .al-p (latar tint 16%).
     [2] opsional: warna teks tema terang untuk yang terlalu muda (kuning #f5c518 dicampur 75% hitam hanya 3,3:1; #3b2f00 = teks pil yang sama di meja operator). */
  const STATUS_CC = {baru: ["Baru", "#e5484d"], dalam_konfirmasi: ["Dalam konfirmasi", "#f5c518", "#3b2f00"], ada_api: ["Ada api", "#f76b15"], tidak_ada_api: ["Tidak ada api", "#8b98ab"]};
  const AKSI_CC = {dalam_konfirmasi: "Dalam konfirmasi", ada_api: "Ada api", tidak_ada_api: "Tidak ada api"}, FINAL_CC = ["ada_api", "tidak_ada_api"];
  const fJamWib = new Intl.DateTimeFormat("id-ID", {timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
  const fTglWib = new Intl.DateTimeFormat("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short"});
  const jamWib = ms => Number.isFinite(ms) ? fJamWib.format(ms).replace(":", ".") : "";
  /* SALINAN logika jamTgl di public/admin/command_bersama.js (berkas ini tak bisa berbagi modul dengan meja operator; ubah di sana, ubah di sini):
     jam saja bila ms jatuh di hari WIB yang sama dengan sekarang ("07.42"), selain itu "30 Okt 09.15": status yang dipegang berhari-hari (alert hidup 7 hari) tak boleh terbaca sebagai pagi ini. */
  const hariWib = ms => Math.floor((ms + 7 * 36e5) / 864e5), hariIni = ms => hariWib(ms) === hariWib(Date.now());
  const jamTgl = ms => !Number.isFinite(ms) ? "" : hariIni(ms) ? jamWib(ms) : `${fTglWib.format(ms)} ${jamWib(ms)}`;
  const bunyi = () => { try { new Audio(SUARA).play().catch(() => {}); } catch (e) {} };
  let antre = [], tampil = false, sejak = Date.now() - 24 * 36e5, el = null;

  document.head.insertAdjacentHTML("beforeend", `<style>
.al{position:fixed;right:16px;bottom:16px;z-index:60;width:min(420px,calc(100vw - 32px));border-radius:18px;overflow:hidden;background:var(--card,#fff);color:var(--ink,#0b2545);box-shadow:0 12px 40px rgb(0 0 0 / .25);font:14px/1.45 var(--font,system-ui)}
.al-hd{display:flex;gap:10px;align-items:flex-start;padding:14px 16px 12px;background:linear-gradient(135deg,#0b2545,#163a66);color:#fff}
.al-ey{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#f5a06b;white-space:nowrap}
.al-hd h3{margin:6px 0 0;font:700 16px/1.35 var(--display,inherit);color:#fff}
.al-x{margin-left:auto;border:0;background:rgb(255 255 255 / .14);color:#fff;width:32px;height:32px;border-radius:50%;font-size:18px;line-height:1;cursor:pointer;flex:none}
.al-isi{padding:12px 16px 4px;display:grid;gap:8px}
.al-pil{display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;scrollbar-width:none}
.al-p{display:inline-flex;align-items:center;font-style:normal;font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap;background:color-mix(in oklab,var(--w) 16%,var(--card,#fff));color:var(--t,color-mix(in oklab,var(--w) 55%,#000))}
.al-isi p{margin:0;color:var(--ink2,#4a5568);font-size:13px}
.al-aksi{display:flex;gap:8px;padding:12px 16px 14px}
.al-aksi a{flex:1;display:inline-flex;justify-content:center;align-items:center;min-height:40px;border-radius:999px;font-weight:700;font-size:13px;text-decoration:none}
.al-pri{background:#0b2545;color:#fff}.al-sek{border:1px solid var(--line,#d5dbe3);color:inherit}
.al-aksi a.al-wa{flex:none;width:40px;padding:0;background:#1f8f4e;color:#fff}.al-wa svg{width:20px;height:20px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .al-pri,:root:not([data-theme="light"]) .al-bt-p{background:#e8743b}}
:root[data-theme="dark"] .al-pri,:root[data-theme="dark"] .al-bt-p{background:#e8743b}
/* pil semua kartu: latar dicampur di oklab (campuran oklch dengan --card ber-hue 0 / 256 menyeret hue --w: kuning jadi merah muda / biru kehijauan);
   teks tema terang = --w digelapkan, tema gelap = --w diterangkan (campuran 75% hitam lama hampir tak terbaca di atas kartu gelap). Keduanya >= 4,5:1 (AA). */
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .al-p{color:color-mix(in oklab,var(--w) 55%,#fff)}}
:root[data-theme="dark"] .al-p{color:color-mix(in oklab,var(--w) 55%,#fff)}
.al.al-ada{max-height:calc(100dvh - 32px);overflow-y:auto;overscroll-behavior:contain}
.al-op{margin:8px 16px 0;padding:10px 12px;border-radius:12px;display:grid;gap:8px;background:color-mix(in oklch,var(--ink,#0b2545) 6%,var(--card,#fff))}
.al-op-t{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:12.5px;color:var(--ink2,#4a5568)}.al-op-t b{color:var(--ink,#0b2545)}
.al-op-c{width:100%;box-sizing:border-box;min-height:40px;padding:6px 12px;border:1px solid var(--line,#d5dbe3);border-radius:10px;background:var(--card,#fff);color:inherit;font:inherit;font-size:13px}
.al-op-b{display:flex;flex-wrap:wrap;gap:6px}
.al-bt{flex:1 1 auto;min-height:40px;padding:0 14px;border:1px solid var(--line,#d5dbe3);border-radius:999px;background:transparent;color:inherit;font:700 13px/1.2 inherit;cursor:pointer}
.al-bt-p{background:#0b2545;border-color:transparent;color:#fff}.al-bt-a{background:#e05a0c;border-color:transparent;color:#fff}
.al-bt:disabled,.al-op-c:disabled{opacity:.55;cursor:default}
.al-op-ps{margin:0;min-height:0;font-size:12.5px;color:var(--ink2,#4a5568)}.al-op-ps:empty{margin-top:-8px}
.al-op-l{justify-self:start;font-size:12.5px;font-weight:700;color:inherit;text-decoration:underline;text-underline-offset:2px}
</style>`);

  function kartu(a) {
    const w = WARNA[a.tingkat] || WARNA.Waspada, wil = [a.kab, a.prov && window.namaProv ? namaProv(a.prov) : ""].filter(Boolean).join(", ");
    return `<div class="al" role="alertdialog" aria-live="assertive" aria-label="Peringatan dini">
  <div class="al-hd"><div><span class="al-ey">Peringatan ${esc(a.tingkat)}</span><h3>${esc(a.judul)}</h3></div><button class="al-x" type="button" data-tutup aria-label="Tutup">×</button></div>
  <div class="al-isi"><div class="al-pil"><em class="al-p" style="--w:${w}">${esc(a.tingkat)}</em><em class="al-p" style="--w:#1d4e89">${esc(a.sumber)}</em>${wil ? `<em class="al-p" style="--w:#6b7489" translate="no">${esc(wil)}</em>` : ""}<em class="al-p" style="--w:#6b7489">${esc(jam(a.dibuat))}</em></div>
  ${a.teks ? `<p>${esc(a.teks)}</p>` : ""}</div>
  <div class="al-aksi"><a class="al-pri" href="${esc(RUTE[a.jenis] || "/")}">Lihat di peta</a><a class="al-sek" href="/peringatan">Dapatkan lewat email</a><a class="al-wa" href="https://wa.me/?text=${encodeURIComponent([a.judul, a.teks, location.origin + (RUTE[a.jenis] || "/")].filter(Boolean).join("\n\n"))}" target="_blank" rel="noopener" aria-label="Bagikan lewat WhatsApp">${WA}</a></div>
</div>`;
  }

  /* ---------------- tindak lanjut operator command center (kartu karhutla) ---------------- */
  const OP = new WeakMap();   // kartu -> {kunci, s (status terakhir dari server), op (bagian operator), sibuk}
  const sah = j => !!j && typeof j === "object" && Object.hasOwn(STATUS_CC, j.status);
  const penuh = j => sah(j) && j.id != null && Array.isArray(j.aksi);
  const urlStatus = kunci => "/api/cc/status?kunci=" + encodeURIComponent(kunci);
  /* fetch JSON same-origin tanpa cache dengan batas waktu; tidak pernah melempar. s = 0: jaringan putus atau kehabisan waktu */
  async function cc(url, opsi) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 10e3);
    try { const r = await fetch(url, {...opsi, cache: "no-store", credentials: "same-origin", signal: ac.signal}); return {s: r.status, j: await r.json().catch(() => ({}))}; }
    catch (e) { return {s: 0, j: {}}; }
    finally { clearTimeout(t); }
  }
  function isiOp(s) {
    const [nama, w, t] = STATUS_CC[s.status], final = FINAL_CC.includes(s.status), aksi = (Array.isArray(s.aksi) ? s.aksi : []).filter(k => Object.hasOwn(AKSI_CC, k)), j = jamTgl(s.sejak);
    const pegang = s.status === "baru" ? "Belum ada yang memegang" : `${final ? "Diputuskan" : "Dipegang"} <b>${esc(s.oleh_nama || "operator")}</b>${j ? (final ? (hariIni(s.sejak) ? " pukul " : " pada ") : " sejak ") + esc(j) : ""}`;
    return `<div class="al-op-t"><em class="al-p" style="--w:${w}${t ? `;--t:${t}` : ""}">${esc(nama)}</em><span>${pegang}</span></div>
${aksi.length && final ? `<input class="al-op-c" type="text" maxlength="300" autocomplete="off" data-cat placeholder="Alasan koreksi (wajib, minimal 3 huruf)" aria-label="Alasan koreksi">` : ""}
${aksi.length ? `<div class="al-op-b">${aksi.map(k => `<button type="button" class="al-bt${final ? "" : k === "dalam_konfirmasi" ? " al-bt-p" : k === "ada_api" ? " al-bt-a" : ""}" data-ke="${esc(k)}">${final ? "Koreksi: buka kembali konfirmasi" : esc(AKSI_CC[k])}</button>`).join("")}</div>` : ""}
<p class="al-op-ps" role="status"></p>
<a class="al-op-l" href="/command-center">Buka meja operator</a>`;
  }
  const pesan = (w, teks) => { const p = w.op.querySelector(".al-op-ps"); if (p) p.textContent = teks; };
  const sibukkan = (w, ya) => { w.sibuk = ya; w.op.querySelectorAll("button,input").forEach(x => { x.disabled = ya; }); };
  const gambar = (w, teks) => { w.op.innerHTML = isiOp(w.s); if (teks) pesan(w, teks); };
  /* GET status: 200 yang bentuknya utuh = pelaku command center -> pasang bagian operator + SUARA. Selain itu: tidak melakukan apa pun (kartu publik apa adanya). */
  async function operatorCc(a, k) {
    const r = await cc(urlStatus(a.kunci));
    if (r.s !== 200 || !penuh(r.j) || !k.isConnected) return;
    const op = document.createElement("div"); op.className = "al-op"; op.setAttribute("data-op", "");
    k.classList.add("al-ada"); k.querySelector(".al-isi")?.after(op);
    const w = {kunci: a.kunci, s: r.j, op, sibuk: false}; OP.set(k, w); gambar(w);
    bunyi();
  }
  async function aksiCc(k, ke) {
    const w = OP.get(k); if (!w || w.sibuk || !Object.hasOwn(AKSI_CC, ke)) return;
    const s = w.s, final = FINAL_CC.includes(s.status), inp = w.op.querySelector("[data-cat]"), catatan = (inp?.value || "").trim();
    if (final && catatan.length < 3) { pesan(w, "Koreksi wajib bercatatan: tulis alasannya (minimal 3 huruf)."); inp?.focus(); return; }
    pesan(w, ""); sibukkan(w, true);
    const r = await cc(`/api/cc/aksi/${encodeURIComponent(s.id)}`, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify({dari: s.status, ke, ...(catatan ? {catatan} : {})})});
    if (!k.isConnected) return;
    if (r.s === 200 && penuh(r.j)) { w.s = {...s, ...r.j}; gambar(w, `Status: ${STATUS_CC[w.s.status][0]}.`); sibukkan(w, false); return; }
    if (r.s === 409) {   // kalah balapan: muat ulang status dari server (bentuk 409 tanpa 'aksi', jadi tombol dikosongkan bila muat ulang gagal)
      const b = await cc(urlStatus(w.kunci));
      if (!k.isConnected) return;
      w.s = b.s === 200 && penuh(b.j) ? b.j : {...s, ...(sah(r.j) ? {status: r.j.status, oleh_nama: r.j.oleh_nama, sejak: r.j.sejak} : {}), aksi: []};
      gambar(w, `Sudah diubah oleh ${w.s.oleh_nama || "operator lain"} menjadi "${STATUS_CC[w.s.status][0]}"; status dimuat ulang.`); sibukkan(w, false); return;
    }
    sibukkan(w, false); pesan(w, typeof r.j?.galat === "string" && r.j.galat ? r.j.galat.slice(0, 140) : "Aksi gagal; coba lagi.");
  }

  function berikut() {
    if (tampil || !antre.length) return;
    const a = antre.shift(); tampil = true; tandai(a.kunci);
    if (BERBUNYI.has(a.jenis)) bunyi();
    const t = document.createElement("div"); t.innerHTML = kartu(a); el = t.firstElementChild; document.body.append(el);
    const k = el;
    k.addEventListener("click", e => {
      if (e.target.closest("[data-tutup]")) { el.remove(); el = null; tampil = false; setTimeout(berikut, 400); return; }
      const b = e.target.closest("[data-ke]"); if (b && !b.disabled) aksiCc(k, b.dataset.ke);
    });
    k.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches?.("[data-cat]")) k.querySelector("[data-ke]:not(:disabled)")?.click(); });
    if (a.jenis === "karhutla") operatorCc(a, k);
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
