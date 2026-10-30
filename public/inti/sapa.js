/* inti/sapa.js: mesin bersama pop-up "Situasi hari ini" (karhutla: sapa.js, banjir: banjir/sapa_banjir.js, bencana lain: Sapa.daftar).
   Berisi yang sama di semua halaman: kunci sekali-per-hari-WIB (localStorage "pb_sapa" untuk karhutla dan banjir, "pb_sapa_<id>" untuk bencana lain),
   ikon, gaya dialog `.dlg.sp`, dan cangkang dialog (tunggu spanduk persetujuan, tutup menandai hari ini). Isi (angka, bagian, kartu) disusun oleh
   skrip halaman. Skrip klasik; muat SEBELUM skrip halaman.
   Sapa.daftar(id, {siap, hitung, html, saatKlik?, ikon?, jalur?}) mendaftarkan pop-up satu bencana; Sapa.rangka/pil/provBaris/item menyusun tata letak
   yang sama dengan karhutla (kepala navy + chip, panel provinsi, daftar, kartu perhatian, sumber + tombol). */
(() => {
  const KUNCI = "pb_sapa";
  const hariIni = () => new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Jakarta"});
  const sudah = (k = KUNCI) => { try { return localStorage.getItem(k) === hariIni(); } catch (e) { return false; } };
  const tandai = (k = KUNCI) => { try { localStorage.setItem(k, hariIni()); } catch (e) {} };
  const IK = {api: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3-1-3 0-6 1-8.5z"/>',
    jam: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    daun: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/>',
    asap: '<path d="M4 14h11a3 3 0 1 0-3-3M3 18h14a3 3 0 1 1-3 3M6 10h4"/>',
    awas: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    naik: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    turun: '<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>'};
  const ik = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${IK[k]}</svg>`;
  const kartu = (k, w, label, isi) => `<div class="sp-c" style="--w:${w}"><span class="sp-ci">${ik(k)}</span><div><b class="sp-ey">${label}</b><p>${isi}</p></div></div>`;
  const css = () => document.head.insertAdjacentHTML("beforeend", `<style>
/* satu kolom: kepala tetap, isi digulir, tombol menempel di bawah (tidak pernah terpotong) */
dialog.sp{width:min(940px,calc(100vw - 24px));max-height:min(760px,calc(100dvh - 32px));overflow:hidden;padding:0;border:0;border-radius:22px}
dialog.sp[open]{display:flex;flex-direction:column}
.sp svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;flex:none}
/* kepala rata tengah; tombol tutup menempel di pojok supaya tidak menggeser tengahnya */
.sp-hd{flex:none;position:relative;display:flex;gap:12px;align-items:flex-start;padding:20px 64px 18px;background:linear-gradient(135deg,#0b2545,#163a66);color:#fff;text-align:center}
.sp-hd .sp-x{position:absolute;top:16px;right:16px}
.sp-eyh{display:inline-flex;align-items:center;gap:8px;font-size:15px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#f5a06b}
.sp-hd h3{font:700 20px/1.3 var(--display);letter-spacing:-.01em;margin:8px 0 12px;color:#fff}
.sp-hd h3>b{color:#ff9a6b}.sp-hd h3 .naik{color:#ff9a6b}.sp-hd h3 .turun{color:#7fd6a4}
.sp-hd h3 b svg{width:.95em;height:.95em;stroke-width:2.4;vertical-align:-.1em;margin-right:4px}
.sp-chips{display:flex;flex-wrap:wrap;justify-content:center;gap:6px}
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
.sp-sek{min-width:0}.sp-sek h4{font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:var(--ink2);margin:0 0 8px}
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
.sp-k{display:grid;grid-template-columns:20px minmax(0,1fr) auto auto minmax(84px,auto);align-items:center;gap:10px;text-align:left;border:0;border-top:1px solid var(--line);background:none;color:var(--ink);padding:11px 16px;cursor:pointer;font:inherit;font-size:13.5px}
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
/* kepala tabel + kolom tetap (.rata) supaya pil lurus ke bawah */
.sp-th{display:grid;align-items:center;gap:10px;padding:9px 16px;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2);background:color-mix(in oklch,var(--ink) 4%,transparent);border-radius:15px 15px 0 0}
.sp-ka{text-align:right}.sp-th .sat{font-style:normal;text-transform:none;letter-spacing:0}.sp-km{color:var(--ink2);font-weight:600}.sp-nol{color:var(--ink2)}
.sp-k>em,.sp-pr>*,.sp-b>em{justify-self:start}
.sp-ks.rata .sp-k,.sp-th.k{grid-template-columns:20px minmax(120px,1fr) 128px 50px 58px 78px 64px 60px 82px;gap:8px}
.sp-nm1{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sp-nm1 span{color:var(--ink2)}
.sp-k small{font-size:10.5px;font-weight:700}.sp-k .naik{color:#b5412c}.sp-k .turun{color:#2f7d4f}
.sp-as .sp-th,.sp-ar{grid-template-columns:minmax(0,1fr) 150px 110px 110px}
.sp-ar{display:grid;align-items:center;gap:10px;padding:10px 16px;border-top:1px solid var(--line);font-size:13.5px}.sp-ar>em{justify-self:start}.sp-ar b{font-weight:600}
.sp-bs.rata .sp-b,.sp-th.b{grid-template-columns:minmax(0,1fr) 150px minmax(80px,1fr) 64px 64px}
.sp-bs>.sp-th{margin:-14px -16px 4px;border-bottom:1px solid var(--line)}
.sp-pt>.sp-th,.sp-pr{grid-template-columns:minmax(130px,1.2fr) 1.3fr 1fr 1fr .9fr}
.sp-pt.as>.sp-th,.sp-pt.as>.sp-pr{grid-template-columns:minmax(130px,1.1fr) 1.2fr .8fr .8fr .7fr 1.5fr}
.sp-ct{margin:0;padding:9px 16px;border-top:1px solid var(--line);font-size:12px;font-weight:700;color:var(--ink2);background:color-mix(in oklch,var(--ink) 2.5%,transparent)}
/* asap: skala P.14/2020 pada PM2,5 24 jam, warna sama dengan .pill.as* di tabel wilayah */
.sp-p.as0{background:color-mix(in oklch,var(--ink) 6%,var(--card));color:var(--ink2)}
.sp-p.as1{background:oklch(70% .05 70 / .2);color:oklch(45% .05 65)}
.sp-p.as2{background:oklch(55% .07 55 / .22);color:oklch(38% .07 50)}
.sp-p.as3{background:oklch(40% .08 340 / .2);color:oklch(38% .12 340)}
.sp-pr{display:grid;align-items:center;gap:10px;padding:11px 16px;border-top:1px solid var(--line);font-size:14px}
.sp-pn{border:0;background:none;padding:0;font:inherit;font-weight:700;color:var(--ink);cursor:pointer;text-align:left}.sp-pn:hover{text-decoration:underline}
button.sp-p{border:0;cursor:pointer;font-family:inherit}button.sp-p:hover{filter:brightness(.95)}button.sp-p[aria-expanded="true"]{box-shadow:inset 0 0 0 1.5px currentColor}
button.sp-p:focus-visible,.sp-pn:focus-visible{outline:3px solid #e3b94e;outline-offset:2px}
.sp-pd{padding:2px 16px 14px;background:color-mix(in oklch,var(--ink) 2.5%,transparent)}
.sp-pd>p{margin:10px 0 8px;font-size:12.5px;color:var(--ink2)}.sp-pd>p b{color:var(--ink)}
.sp-pd .sp-ks{border:1px solid var(--line);border-radius:12px;background:var(--card)}.sp-pd .sp-th{border-radius:11px 11px 0 0}
.sp-cs button.sp-c{width:100%;border:0;border-top:1px solid var(--line);background:none;color:inherit;font:inherit;text-align:left;cursor:pointer}
.sp-cs button.sp-c:hover,.sp-cs button.sp-c[aria-expanded="true"]{background:color-mix(in oklch,var(--ink) 4%,transparent)}.sp-cs button.sp-c:focus-visible{outline:3px solid #e3b94e;outline-offset:-3px}
.sp-cs.rata .sp-c{display:grid;grid-template-columns:32px 150px 1fr;gap:12px;align-items:center}.sp-cs.rata .sp-c>div{display:contents}.sp-cs.rata .sp-c p{margin:0}
.sp-th.c{grid-template-columns:194px 1fr;gap:12px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .sp-pri{background:#e8743b}}
:root[data-theme="dark"] .sp-pri{background:#e8743b}
@media (max-width:560px){.sp-ks:not(.rata) .sp-k{grid-template-columns:20px auto auto minmax(0,1fr);row-gap:6px}.sp-ks:not(.rata) .sp-k>.sp-nm{grid-column:2/-1}.sp-ks:not(.rata) .sp-k>.sp-nm+*{grid-column:2}.sp-eyh{font-size:12px;letter-spacing:.05em;white-space:nowrap}.sp-pv{display:grid;gap:7px}.sp-pv>b{min-width:0}.sp-chips{gap:4px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin-right:-16px;padding-right:16px}.sp-chips::-webkit-scrollbar{display:none}.sp-p{font-size:9.5px;padding:3px 6px;gap:3px}.sp-p svg{display:none}.sp-pv{min-width:0}.sp-hd{padding:18px 16px 16px}.sp-isi{padding:16px 16px 8px}.sp-aksi{padding:12px 16px 16px}.sp-aksi>span{display:none}.sp-pri{flex:1}
  .sp-k{grid-template-columns:18px minmax(0,1fr) auto auto}.sp-nm span,.sp-k em:last-child{display:none}
  .sp-b{grid-template-columns:minmax(0,1.3fr) 1fr 34px}.sp-b>span{flex-direction:column;align-items:flex-start;gap:3px}
  .sp-pt{overflow-x:auto}.sp-pt>*{min-width:600px}.sp-pt.as>*{min-width:740px}.sp-hd{padding:18px 52px 16px}.sp-hd .sp-x{top:12px;right:12px}
  .sp-mh{display:none!important}.sp-ks.rata .sp-k,.sp-th.k{grid-template-columns:18px minmax(0,1fr) 64px 54px}
  .sp-as .sp-th,.sp-ar{grid-template-columns:minmax(0,1fr) 96px 58px 58px}.sp-ar{font-size:12.5px}
  .sp-bs.rata .sp-b,.sp-th.b{grid-template-columns:minmax(0,1fr) 108px 40px 40px}.sp-bs.rata .sp-b>i,.sp-th.b>:nth-child(3){display:none}
  .sp-cs.rata .sp-c{grid-template-columns:32px 1fr;row-gap:2px}.sp-cs.rata .sp-c p{grid-column:2}.sp-th.c{grid-template-columns:1fr}.sp-th.c>:last-child{display:none}}
/* pantauan dan tindak lanjut: baris tombol */
.sp-pk-a{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px 16px;border-top:1px solid var(--line)}
.sp-pk-a a{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:13px;font-weight:700;text-decoration:none}
.sp-pk-a a:hover{background:color-mix(in oklch,var(--ink) 5%,var(--card))}.sp-pk-a a:focus-visible{outline:3px solid #e3b94e;outline-offset:2px}
.sp-pk-a a.wa{background:#1f8f4e;border-color:#1f8f4e;color:#fff}.sp-pk-a a.kecil{border:0;background:none;color:var(--ink2);min-height:0;padding:0 4px;font-weight:600;text-decoration:underline}
</style>`);
  /* html: isi dialog; saatKlik(e, d): penangan klik tambahan (return true bila sudah ditangani); tombol [data-tutup] dan latar menutup */
  function dialog(html, saatKlik, kunci) {
    const d = document.createElement("dialog"); d.className = "dlg sp"; d.setAttribute("aria-labelledby", "spJudul");
    d.innerHTML = html; document.body.appendChild(d);
    d.addEventListener("click", e => { if (saatKlik?.(e, d)) return; if (e.target.closest("[data-tutup]") || e.target === d) d.close(); });
    d.addEventListener("close", () => { tandai(kunci); d.remove(); });
    d.showModal(); pantauan(d, kunci); return d;
  }
  /* ---------- bagian "Pantauan dan tindak lanjut": hitungan agregat publik dari /api/pantau/ringkas, hanya untuk bencana di PANTAU ---------- */
  const PANTAU = ["karhutla", "banjir"];
  const idDari = k => !k || k === KUNCI ? "karhutla" : k.replace(/^pb_sapa_/, "");
  const ringkas = {};   /* satu fetch per bencana per muat halaman */
  const muatRingkas = id => ringkas[id] ||= fetch("/api/pantau/ringkas?bencana=" + encodeURIComponent(id))
    .then(r => r.ok ? r.json() : null).catch(() => null);
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
  const bagianPantau = r => {
    const wa = /^\d{8,15}$/.test(r.wa || "") ? `<a class="wa" href="https://wa.me/${r.wa}" target="_blank" rel="noopener">${ik("jam")}Hubungi lewat WA</a>` : "";
    const aksi = `<div class="sp-pk-a"><a href="/daftar-kontak?kategori=bpbd">${ik("awas")}Daftar staf BPBD</a>${wa}<a class="kecil" href="/monitor" data-monitor>Buka Monitor</a></div>`;
    return `<section class="sp-sek sp-pantau"><h4>Pantauan dan tindak lanjut</h4><div class="sp-panel">${aksi}</div></section>`;
  };
  function pantauan(d, kunci) {
    const id = idDari(kunci); if (!PANTAU.includes(id)) return;
    d.addEventListener("click", e => { const a = e.target.closest("[data-monitor]"); if (!a) return;
      if (typeof window.bukaTab === "function" && document.querySelector('#tabs [data-t="monitor"]')) { e.preventDefault(); d.close(); window.bukaTab("monitor"); } });
    muatRingkas(id).then(r => {
      try { const isi = d.isConnected && r && r.total && d.querySelector(".sp-isi");
        if (isi && !d.querySelector(".sp-pantau")) isi.insertAdjacentHTML("beforeend", bagianPantau(r)); } catch (e) {}
    });
  }
  /* tunggu spanduk persetujuan selesai supaya dua lapisan tidak bertumpuk */
  const mulai = fn => { const m = () => document.querySelector(".pv-kartu") ? document.addEventListener("pb-persetujuan", () => setTimeout(fn, 400), {once: true}) : fn();
    document.readyState === "complete" ? setTimeout(m, 300) : addEventListener("load", () => setTimeout(m, 300)); };
  window.SapaInti = {hariIni, sudah, tandai, IK, ik, kartu, css, dialog, mulai};

  /* ---------- bencana lain: tata letak yang sama dengan karhutla, isi dari adaptor tiap bencana ---------- */
  const sek = (judul, tipe, isi) => `<section class="sp-sek"><h4>${judul}</h4><div class="sp-${tipe} sp-panel">${isi}</div></section>`;
  const pil = (teks, kelas = "prov", ikon = "") => `<em class="sp-p ${kelas}">${ikon ? ik(ikon) : ""}${teks}</em>`;
  /* baris provinsi/wilayah di panel `ps`: nama + chip */
  const provBaris = (nama, pils) => `<div class="sp-pv"><b>${nama}</b><div class="sp-chips">${pils.join("")}</div></div>`;
  /* baris daftar klik di panel `ks`: nomor, nama + keterangan, dua chip; data-k diteruskan ke saatKlik */
  const item = (k, no, nama, sub, p1 = "", p2 = "") => `<button class="sp-k" data-k="${k}"><i>${no}</i><span class="sp-nm"><b translate="no">${nama}</b><span translate="no">${sub}</span></span>${p1 || "<em></em>"}${p2 || "<em></em>"}</button>`;
  /* rangka dialog: eyebrow (ikon + teks), judul (HTML), chips putih [[ikon, teks]], bagian [[judul, tipe, isi]] (kosong dilewati), sumber, tombol */
  const rangka = ({ikon, eyebrow, judul, chips = [], bagian = [], sumber, tombol = "Lihat peta"}) =>
    `<div class="sp-hd"><div style="flex:1;min-width:0"><span class="sp-eyh">${ik(ikon)}${eyebrow}</span>
        <h3 id="spJudul">${judul}</h3>
        <div class="sp-chips">${chips.filter(Boolean).map(([i, t]) => `<span class="sp-p putih">${i ? ik(i) : ""}${t}</span>`).join("")}</div>
</div>
        <button class="sp-x" data-tutup aria-label="Tutup">×</button></div>
      <div class="sp-isi">
      ${bagian.filter(b => b && b[2]).map(([j, t, isi]) => sek(j, t, isi)).join("\n      ")}
      </div>
      <div class="sp-aksi"><span>Sumber: ${sumber}</span><button class="sp-pri" data-tutup>${tombol}</button></div>`;
  /* jalur halaman depan bencana: /<id> dan /<id>/peta; tautan khusus (?wil=, ?k=) dilewati */
  function daftar(id, o) {
    const kunci = "pb_sapa_" + id, jalur = o.jalur || ["/" + id, "/" + id + "/peta"];
    if (o.ikon) Object.assign(IK, o.ikon);
    if (sudah(kunci) || /[?&](wil|k|kl|f)=/.test(location.search) || !jalur.includes(location.pathname.replace(/\/index\.html$/, "").replace(/\/+$/, ""))) return;
    css();
    mulai(async () => {
      for (let i = 0; i < 400 && !(await o.siap()); i++) await new Promise(r => setTimeout(r, 150));
      if (!(await o.siap()) || sudah(kunci)) return;
      const h = await o.hitung(); if (!h) return;
      dialog(o.html(h), o.saatKlik, kunci);
    });
  }
  window.Sapa = {daftar, rangka, pil, provBaris, item, kartu, ik};
})();
