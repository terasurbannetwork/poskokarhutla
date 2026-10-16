/* inti/sapa.js: mesin bersama pop-up "Situasi hari ini" (karhutla: sapa.js, banjir: banjir/sapa_banjir.js).
   Berisi yang sama di kedua halaman: kunci sekali-per-hari-WIB (localStorage "pb_sapa"), ikon, gaya dialog `.dlg.sp`, dan cangkang dialog
   (tunggu spanduk persetujuan, tutup menandai hari ini). Isi (angka, bagian, kartu) disusun oleh skrip halaman. Skrip klasik; muat SEBELUM skrip halaman. */
(() => {
  const KUNCI = "pb_sapa";
  const hariIni = () => new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Jakarta"});
  const sudah = () => { try { return localStorage.getItem(KUNCI) === hariIni(); } catch (e) { return false; } };
  const tandai = () => { try { localStorage.setItem(KUNCI, hariIni()); } catch (e) {} };
  const IK = {api: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-6 1-8.5z"/>',
    jam: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    daun: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
    asap: '<path d="M4 14h11a3 3 0 1 0-3-3M3 18h14a3 3 0 1 1-3 3M6 10h4"/>',
    awas: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>'};
  const ik = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IK[k]}</svg>`;
  const kartu = (k, w, label, isi) => `<div class="sp-c" style="--w:${w}"><span class="sp-ci">${ik(k)}</span><div><b class="sp-ey">${label}</b><p>${isi}</p></div></div>`;
  const css = () => document.head.insertAdjacentHTML("beforeend", `<style>
/* satu kolom: kepala tetap, isi digulir, tombol menempel di bawah (tidak pernah terpotong) */
dialog.sp{width:min(940px,calc(100vw - 24px));max-height:min(760px,calc(100dvh - 32px));overflow:hidden;padding:0;border:0;border-radius:22px}
dialog.sp[open]{display:flex;flex-direction:column}
.sp svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
.sp-hd{flex:none;display:flex;gap:12px;align-items:flex-start;padding:20px 22px 18px;background:linear-gradient(135deg,#0b2545,#163a66);color:#fff}
.sp-eyh{display:inline-flex;align-items:center;gap:8px;font-size:15px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#f5a06b}
.sp-hd h3{font:700 20px/1.3 var(--display);letter-spacing:-.01em;margin:8px 0 12px;color:#fff}
.sp-hd h3>b{color:#ff9a6b}.sp-hd h3 .naik{color:#ff9a6b}.sp-hd h3 .turun{color:#7fd6a4}
.sp-chips{display:flex;flex-wrap:nowrap;gap:6px}
.sp-eyh svg{width:18px;height:18px}
.sp .sp-x{border:0;background:rgb(255 255 255 / .14);color:#fff;width:36px;height:36px;border-radius:50%;font-size:20px;line-height:1;cursor:pointer;flex:none}
.sp .sp-x:hover{background:rgb(255 255 255 / .24)}
.sp-p{display:inline-flex;align-items:center;gap:5px;font-style:normal;font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap;line-height:1.3}
.sp-p.putih{background:rgb(255 255 255 / .12);color:#fff}
.sp-p.merah{background:color-mix(in oklch,#c9503a 12%,var(--card));color:#b5412c}
.sp-p.prov{background:color-mix(in oklch,#1d4e89 10%,var(--card));color:#1d4e89}
.sp-p.oranye{background:color-mix(in oklch,#e8743b 14%,var(--card));color:#b8521f}
.sp-p.gambut{background:color-mix(in oklch,#8a5a3c 12%,var(--card));color:#7a4a2c}
.sp-isi{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:20px 22px 8px;display:grid;gap:20px;align-content:start}
.sp-sek h4{font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--ink2);margin:0 0 8px}
.sp-panel{border:1px solid var(--line);border-radius:16px}
.sp-bs{display:grid;gap:10px;padding:14px 16px}
.sp-b{display:grid;grid-template-columns:minmax(0,1.25fr) 1fr 40px;align-items:center;gap:12px;font-size:13.5px}
.sp-b>span{display:flex;align-items:center;gap:8px;min-width:0}.sp-b>span>b{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-ps{display:grid;padding:2px 0}
.sp-pv{display:flex;align-items:center;gap:14px;padding:12px 16px;border-top:1px solid var(--line);font-size:14px}.sp-pv:first-child{border-top:0}.sp-pv>b{flex:none;min-width:150px}
.sp-b i{display:block;height:8px;border-radius:4px;background:color-mix(in oklch,var(--ink) 8%,transparent);overflow:hidden}
.sp-b u{display:block;height:100%;width:var(--p);border-radius:4px;background:#e8743b}
.sp-b>b{text-align:right;font-variant-numeric:tabular-nums}
.sp-ks{display:grid;padding:2px 0}
.sp-k{display:grid;grid-template-columns:20px minmax(0,1fr) auto auto 84px;align-items:center;gap:10px;text-align:left;border:0;border-top:1px solid var(--line);background:none;color:var(--ink);padding:11px 16px;cursor:pointer;font:inherit;font-size:13.5px}
.sp-k:first-child{border-top:0}.sp-k:hover{background:color-mix(in oklch,var(--ink) 4%,transparent)}
.sp-k:focus-visible{outline:3px solid #e3b94e;outline-offset:-3px}
.sp-k i{font-style:normal;font-size:11.5px;font-weight:800;color:var(--ink2)}
.sp-nm{display:grid;min-width:0}.sp-nm span{font-size:12px;color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sp-k em:last-child{justify-self:start}
.sp-cs{display:grid;padding:2px 0}
.sp-c{display:flex;gap:12px;align-items:flex-start;padding:13px 16px;border-top:1px solid var(--line)}.sp-c:first-child{border-top:0}
.sp-ci{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:color-mix(in oklch,var(--w) 15%,var(--card));color:var(--w);flex:none}.sp-ci svg{width:16px;height:16px}
.sp-ey{display:block;font-size:13.5px;font-weight:700;color:var(--ink)}
.sp-c p{margin:2px 0 0;font-size:13px;line-height:1.45;color:var(--ink2)}.sp-c p b{color:var(--ink)}
.sp-aksi{flex:none;padding:14px 22px 18px;display:flex;align-items:center;gap:12px;border-top:1px solid var(--line);background:var(--card)}
.sp-aksi>span{flex:1;font-size:11.5px;color:var(--ink2)}
.sp-pri{min-height:44px;padding:0 28px;border:0;border-radius:999px;background:#0b2545;color:#fff;font:700 14px var(--font);cursor:pointer}
.sp-pri:hover{background:#163a66}.sp-pri:focus-visible,.sp .sp-x:focus-visible{outline:3px solid #e3b94e;outline-offset:2px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .sp-pri{background:#e8743b}}
:root[data-theme="dark"] .sp-pri{background:#e8743b}
@media (max-width:560px){.sp-eyh{font-size:12px;letter-spacing:.05em;white-space:nowrap}.sp-pv{display:grid;gap:7px}.sp-pv>b{min-width:0}.sp-chips{gap:4px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin-right:-16px;padding-right:16px}.sp-chips::-webkit-scrollbar{display:none}.sp-p{font-size:9.5px;padding:3px 6px;gap:3px}.sp-p svg{display:none}.sp-pv{min-width:0}.sp-hd{padding:18px 16px 16px}.sp-isi{padding:16px 16px 8px}.sp-aksi{padding:12px 16px 16px}.sp-aksi>span{display:none}.sp-pri{flex:1}
  .sp-k{grid-template-columns:18px minmax(0,1fr) auto auto}.sp-nm span,.sp-k em:last-child{display:none}
  .sp-b{grid-template-columns:minmax(0,1.3fr) 1fr 34px}.sp-b>span{flex-direction:column;align-items:flex-start;gap:3px}}
</style>`);
  /* html: isi dialog; saatKlik(e, d): penangan klik tambahan (return true bila sudah ditangani); tombol [data-tutup] dan latar menutup */
  function dialog(html, saatKlik) {
    const d = document.createElement("dialog"); d.className = "dlg sp"; d.setAttribute("aria-labelledby", "spJudul");
    d.innerHTML = html; document.body.appendChild(d);
    d.addEventListener("click", e => { if (saatKlik?.(e, d)) return; if (e.target.closest("[data-tutup]") || e.target === d) d.close(); });
    d.addEventListener("close", () => { tandai(); d.remove(); });
    d.showModal(); return d;
  }
  /* tunggu spanduk persetujuan selesai supaya dua lapisan tidak bertumpuk */
  const mulai = fn => { const m = () => document.querySelector(".pv-kartu") ? document.addEventListener("pb-persetujuan", () => setTimeout(fn, 400), {once: true}) : fn();
    document.readyState === "complete" ? setTimeout(m, 300) : addEventListener("load", () => setTimeout(m, 300)); };
  window.SapaInti = {hariIni, sudah, tandai, IK, ik, kartu, css, dialog, mulai};
})();
