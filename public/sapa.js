/* sapa.js — pop-up "Situasi hari ini" saat halaman karhutla dibuka. Sekali per hari WIB per peramban (localStorage "pb_sapa"),
   muncul setelah spanduk persetujuan ditutup, dilewati bila halaman dibuka lewat tautan khusus (?… atau /k/…).
   Skrip klasik, dimuat SETELAH skrip utama. Global: S, muatJSON, esc, fmt, namaProv, jamWIB, Laci, bukaTab, $.
   Semua angka dari kluster.json (kompleks aktif), peringatan.json (BMKG), asap.json (CAMS), sama dengan tab lain. */
(() => {
  const KUNCI = "pb_sapa", JAM = 36e5, ISPU_TS = 55.4;
  const hariIni = () => new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Jakarta"});
  const sudah = () => { try { return localStorage.getItem(KUNCI) === hariIni(); } catch (e) { return false; } };
  const tandai = () => { try { localStorage.setItem(KUNCI, hariIni()); } catch (e) {} };
  /* muncul di halaman depan dan /peta (pemilik, 15 Okt 2026); tautan khusus (?wil=…, /k/…) tetap dilewati */
  if (sudah() || /[?&](wil|k|kl|f)=/.test(location.search) || !["", "/peta"].includes(location.pathname.replace(/\/+$/, ""))) return;

  const R_API = /angin|asap|kabut|kebakaran|kering|panas|debu|jarak pandang/i;
  const topKab = (xs, n = 4) => { const m = new Map(); for (const p of xs) { const k = `${p.kab}|${p.prov}`; m.set(k, (m.get(k) || 0) + 1); }
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => { const [kab, prov] = k.split("|"); return {kab, prov, n: v}; }); };
  const IK = {api: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-6 1-8.5z"/>',
    jam: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    daun: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
    perisai: '<path d="M12 3 4.5 6v6c0 4.5 3.2 8 7.5 9 4.3-1 7.5-4.5 7.5-9V6z"/>',
    jauh: '<circle cx="12" cy="10" r="2.5"/><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/>',
    asap: '<path d="M4 14h11a3 3 0 1 0-3-3M3 18h14a3 3 0 1 1-3 3M6 10h4"/>',
    awas: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>'};
  const ik = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IK[k]}</svg>`;
  const baris = p => `<button class="sp-k" data-k="${esc(p.id)}"><span class="sp-ci" style="--w:${p.gambut ? "#8a5a3c" : "#e8743b"}">${ik(p.gambut ? "daun" : "api")}</span>
    <span class="sp-kn"><b translate="no">${esc(p.kab)}</b><small><span translate="no">${esc(p.kec || "")}</span> · ${esc(namaProv(p.prov))}${p.gambut ? " · gambut" : ""}</small></span>
    <em class="sp-p">${p.hari} hari</em></button>`;
  const kartu = (k, w, label, isi) => `<div class="sp-c" style="--w:${w}"><span class="sp-ci">${ik(k)}</span><div><b class="sp-ey">${label}</b><p>${isi}</p></div></div>`;
  const daftar = xs => `<span translate="no">${xs.map(x => esc(x.kab)).join(", ")}</span>`;

  async function siap() { for (let i = 0; i < 400 && !(S.meta && S.kluster); i++) await new Promise(r => setTimeout(r, 150)); return !!S.kluster; }

  function hitung(per, asap) {
    const acuan = new Date(S.meta.data_terakhir || S.meta.dibuat).getTime();
    const aktif = S.kluster.features.map(f => f.properties).filter(p => p.awal);
    const nyala = aktif.filter(p => p.jam_sejak <= 24);
    const baru = aktif.filter(p => acuan - new Date(p.awal) <= 24 * JAM);
    const lama = nyala.filter(p => p.hari > 2).sort((a, b) => b.hari - a.hari || b.n - a.n);
    const ini = aktif.reduce((s, p) => s + (p.ini || 0), 0), kmrn = aktif.reduce((s, p) => s + (p.kmrn || 0), 0);
    const gambut = nyala.filter(p => p.gambut);
    const bmkg = (per?.nowcast || []).filter(x => x.selesai && new Date(x.selesai) > Date.now() && R_API.test(x.event + " " + (x.headline || "")));
    /* asap: PM2.5 maks hari ini di sel 1° tempat kompleks menyala, dikelompokkan per kabupaten */
    const asapKab = new Map();
    if (asap?.grid) { const hi = Math.max(0, asap.hari.indexOf(hariIni())), sel = new Map(asap.grid.map(g => [`${g[0]},${g[1]}`, g[2][hi]]));
      const pusat = v => Math.floor(v) + .5;
      for (const p of nyala) { const pm = sel.get(`${pusat(p.lat)},${pusat(p.lon)}`); if (pm >= ISPU_TS) { const k = `${p.kab}|${p.prov}`; asapKab.set(k, Math.max(asapKab.get(k) || 0, pm)); } } }
    return {ini, kmrn, baru, lama, gambut, nyala, bmkg, asapKab: [...asapKab].sort((a, b) => b[1] - a[1])};
  }

  /* gaya Oyenza: lembar putih, satu angka besar, panel abu, ikon dalam lingkaran lembut, satu tombol pil hitam (pemilik, 15 Okt 2026) */
  function html(h) {
    const naik = h.ini - h.kmrn, arah = naik > 0 ? `<span class="sp-d naik">▲ ${fmt(naik)} dari kemarin</span>` : naik < 0 ? `<span class="sp-d turun">▼ ${fmt(-naik)} dari kemarin</span>` : `<span class="sp-d">sama dengan kemarin</span>`;
    const sek = (judul, isi) => `<section class="sp-sek"><h4>${judul}</h4>${isi}</section>`;
    const kab = topKab(h.baru, 5), maks = kab[0]?.n || 1;
    const bar = kab.map((x, i) => `<div class="sp-b"><i>${i + 1}</i><span translate="no">${esc(x.kab)}</span><s><u style="--p:${Math.max(3, x.n / maks * 100)}%"></u></s><b>${fmt(x.n)}</b></div>`).join("");
    const pm = h.asapKab[0]?.[1];
    const awas = [
      h.gambut.length && kartu("daun", "#8a5a3c", "Lahan gambut", `<b>${fmt(h.gambut.length)}</b> dari ${fmt(h.nyala.length)} kompleks menyala di gambut, paling sulit dipadamkan`),
      pm && kartu("asap", "#6d6a66", "Asap tidak sehat", `PM2.5 hingga <b>${fmt(pm)} µg/m³</b> di ${fmt(h.asapKab.length)} kabupaten, antara lain <span translate="no">${h.asapKab.slice(0, 3).map(([k]) => esc(k.split("|")[0])).join(", ")}</span>`),
      ...h.bmkg.slice(0, 2).map(x => kartu("awas", "#1d4e89", "Peringatan BMKG", esc(x.headline || x.event)))].filter(Boolean).join("");
    return `<div class="sp-hd"><span class="sp-eyh">Situasi hari ini · ${jamWIB(S.meta.data_terakhir || S.meta.dibuat)}</span><button class="sp-x" data-tutup aria-label="Tutup">×</button></div>
      <div class="sp-isi">
        <div class="sp-hero"><h3 id="spJudul"><b>${fmt(h.ini)}</b><span>titik api terdeteksi</span></h3>${arah}</div>
        <div class="sp-st"><div><span class="sp-ci" style="--w:#e8743b">${ik("api")}</span><b>${fmt(h.baru.length)}</b><small>kompleks baru dalam 24 jam</small></div>
          <div><span class="sp-ci" style="--w:#7a5c99">${ik("jam")}</span><b>${fmt(h.lama.length)}</b><small>kompleks bertahan lebih dari 2 hari</small></div></div>
        ${kab.length ? sek("Kompleks baru terbanyak", `<div class="sp-bs sp-panel">${bar}</div>`) : ""}
        ${h.lama.length ? sek("Bertahan paling lama", `<div class="sp-ks sp-panel">${h.lama.slice(0, 4).map(baris).join("")}</div>`) : ""}
        ${awas ? sek("Perlu perhatian", `<div class="sp-cs sp-panel">${awas}</div>`) : ""}
      </div>
      <div class="sp-aksi"><button class="sp-pri" data-tutup>Lihat peta</button><span>Sumber: NASA FIRMS, Copernicus CAMS, BMKG</span></div>`;
  }

  async function tampil() {
    if (!(await siap()) || sudah()) return;
    const [per, asap] = await Promise.all([muatJSON("data/peringatan.json").catch(() => null), muatJSON("data/asap.json").catch(() => null)]);
    const d = document.createElement("dialog"); d.className = "dlg sp"; d.setAttribute("aria-labelledby", "spJudul");
    d.innerHTML = html(hitung(per, asap)); document.body.appendChild(d);
    d.addEventListener("click", e => {
      const k = e.target.closest("[data-k]"); if (k) { d.close(); return Laci.buka(k.dataset.k); }
      if (e.target.closest("[data-tutup]") || e.target === d) d.close(); });
    d.addEventListener("close", () => { tandai(); d.remove(); });
    d.showModal();
  }

  document.head.insertAdjacentHTML("beforeend", `<style>
/* satu kolom: kepala tipis tetap, isi digulir, tombol menempel di bawah (tidak pernah terpotong) */
dialog.sp{width:min(520px,calc(100vw - 24px));max-height:min(780px,calc(100dvh - 32px));overflow:hidden;padding:0;border:0;border-radius:28px;background:var(--card);color:var(--ink);box-shadow:0 24px 60px rgb(0 0 0 / .22)}
dialog.sp[open]{display:flex;flex-direction:column}
dialog.sp::backdrop{background:rgb(0 0 0 / .38);backdrop-filter:blur(3px)}
.sp svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
.sp-hd{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px 0 24px}
.sp-eyh{font-size:13px;font-weight:600;color:var(--ink2)}
.sp .sp-x{border:0;background:var(--surface);color:var(--ink);width:36px;height:36px;border-radius:50%;font-size:20px;line-height:1;cursor:pointer;flex:none}
.sp .sp-x:hover{background:color-mix(in oklch,var(--ink) 10%,var(--surface))}
.sp-isi{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:6px 24px 12px;display:grid;gap:22px;align-content:start}
.sp-hero h3{margin:0;display:grid;gap:2px}
.sp-hero h3 b{font:800 52px/1.05 var(--display);letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.sp-hero h3 span{font:600 16px var(--font);color:var(--ink2)}
.sp-d{display:inline-block;margin-top:10px;font-size:13px;font-weight:700;padding:5px 11px;border-radius:999px;background:var(--surface);color:var(--ink2)}
.sp-d.naik{background:color-mix(in oklch,#d64545 11%,var(--card));color:#c03a3a}.sp-d.turun{background:color-mix(in oklch,#2f9e6a 12%,var(--card));color:#23805a}
.sp-st{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sp-st>div{background:var(--surface);border-radius:20px;padding:16px;display:grid;gap:2px;align-content:start}
.sp-st .sp-ci{margin-bottom:10px}
.sp-st b{font:800 28px/1.1 var(--display);letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.sp-st small{font-size:12.5px;line-height:1.35;color:var(--ink2)}
.sp-ci{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:color-mix(in oklch,var(--w) 14%,var(--card));color:var(--w);flex:none}
.sp-sek h4{font-size:15px;font-weight:700;color:var(--ink);margin:0 0 10px;letter-spacing:-.01em}
.sp-panel{background:var(--surface);border-radius:20px}
.sp-bs{display:grid;gap:12px;padding:16px 18px}
.sp-b{display:grid;grid-template-columns:16px 112px 1fr 44px;align-items:center;gap:12px;font-size:14px}
.sp-b i{font-style:normal;font-size:12px;font-weight:700;color:var(--ink2)}
.sp-b span{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-b s{display:block;height:6px;border-radius:3px;background:color-mix(in oklch,var(--ink) 7%,transparent);overflow:hidden;text-decoration:none}
.sp-b u{display:block;height:100%;width:var(--p);border-radius:3px;background:var(--ink)}
.sp-b:first-child u{background:#e8743b}
.sp-b b{text-align:right;font-variant-numeric:tabular-nums}
.sp-ks,.sp-cs{display:grid;padding:4px 0}
.sp-k{display:flex;align-items:center;gap:12px;text-align:left;border:0;background:none;color:var(--ink);padding:10px 16px;cursor:pointer;font:inherit;border-radius:14px}
.sp-k:hover{background:color-mix(in oklch,var(--ink) 4%,transparent)}
.sp-k:focus-visible{outline:3px solid #e3b94e;outline-offset:-3px}
.sp-kn{flex:1;min-width:0;display:grid}
.sp-kn b{font-size:14.5px;font-weight:700}
.sp-kn small{font-size:12.5px;color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-p{font-style:normal;font-size:12.5px;font-weight:700;padding:5px 11px;border-radius:999px;white-space:nowrap;background:var(--card);color:var(--ink)}
.sp-c{display:flex;gap:12px;align-items:flex-start;padding:12px 16px}
.sp-ey{display:block;font-size:14.5px;font-weight:700;color:var(--ink)}
.sp-c p{margin:2px 0 0;font-size:13px;line-height:1.45;color:var(--ink2)}.sp-c p b{color:var(--ink)}
.sp-aksi{flex:none;padding:12px 24px 20px;display:grid;gap:10px;justify-items:center;background:var(--card)}
.sp-aksi>span{font-size:11.5px;color:var(--ink2)}
.sp-pri{width:100%;min-height:52px;border:0;border-radius:999px;background:#171717;color:#fff;font:700 15px var(--font);cursor:pointer}
.sp-pri:hover{background:#000}.sp-pri:focus-visible,.sp .sp-x:focus-visible{outline:3px solid #e3b94e;outline-offset:2px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .sp-pri{background:#fff;color:#171717}}
:root[data-theme="dark"] .sp-pri{background:#fff;color:#171717}
@media (max-width:560px){.sp-hd{padding:16px 16px 0 18px}.sp-isi{padding:6px 18px 12px}.sp-aksi{padding:10px 18px 16px}.sp-hero h3 b{font-size:44px}.sp-b{grid-template-columns:14px 92px 1fr 36px}}
</style>`);

  /* tunggu spanduk persetujuan selesai supaya dua lapisan tidak bertumpuk */
  const mulai = () => document.querySelector(".pv-kartu") ? document.addEventListener("pb-persetujuan", () => setTimeout(tampil, 400), {once: true}) : tampil();
  document.readyState === "complete" ? setTimeout(mulai, 300) : addEventListener("load", () => setTimeout(mulai, 300));
})();
