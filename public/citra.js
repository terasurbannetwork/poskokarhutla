/* citra.js — citra satelit terbaru per kompleks prioritas (data/citra.json dari scripts/data/citra.py).
   1. Laci kompleks: bagian "Citra satelit terbaru" setelah "Api saat ini": warna asli + SWIR berdampingan, pilih tanggal,
      klik gambar -> #dlg besar dengan pembanding sebelum/sesudah (geser) dan titik panas 24 jam opsional.
   2. Insight: exhibit "Kondisi terbaru dari satelit" (Citra.pasangInsight, dipanggil otomatis saat muat).
   Skrip klasik dimuat SETELAH skrip utama, lapisan5.js dan databaru.js. Memakai global halaman: S, Laci, Insight, $, esc, fmt,
   muatJSON, bukaTab. Tidak mengubah index.html selain tag (lihat CITRA.md). */
(() => {
  let D = null, janji = null;
  const muat = () => janji ||= muatJSON("data/citra.json").then(d => (D = d)).catch(e => { janji = null; throw e; });
  const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const tg = t => { const [y, m, d] = t.split("-").map(Number); return `${d} ${BLN[m - 1]}${y !== new Date().getFullYear() ? " " + y : ""}`; };
  const lalu = t => { const n = Math.round((Date.now() - new Date(t + "T12:00:00+07:00")) / 864e5); return n <= 0 ? "hari ini" : n === 1 ? "kemarin" : n + " hari lalu"; };
  const wib = h => /^\d\d:\d\d$/.test(h.jam || "") ? String((+h.jam.slice(0, 2) + 7) % 24).padStart(2, "0") + "." + h.jam.slice(3) + " WIB" : h.jam || "";
  const src = (h, m) => "data/" + h[m];   /* jalur di citra.json relatif ke data/ */
  const viirs = h => h.satelit.startsWith("VIIRS");
  const kredit = h => `Sumber: ${esc(viirs(h) ? D.atribusi.VIIRS : D.atribusi.Sentinel)}`;
  const awan = h => h.awan_pct == null ? "awan tidak dihitung" : `awan/asap ${h.awan_pct}%`;
  const MODE = {tc: "Warna asli", swir: "SWIR: api & bekas bakar"};
  /* kunci warna SWIR sebagai legenda (swatch), bukan paragraf */
  const LEG = `<div class="leg ct-leg" style="margin-top:8px">${[["#ff5a1f", "Api aktif / bara"], ["#5a3a24", "Bekas terbakar"], ["#3f9a3a", "Vegetasi hidup"],
    ["#e8b98a", "Tanah terbuka"], ["#b9d3e6", "Asap tebal"], ["#fff", "Awan"]].map(([w, n]) => `<span><i class="sw" style="background:${w};border:1px solid var(--line)"></i>${n}</span>`).join("")}</div>`;
  const KET = `SWIR menembus asap tipis, jadi api sering terlihat walau di warna asli tertutup.`;
  /* gambar terbaik untuk ringkasan: Sentinel terbaru yang cukup bersih, lalu Sentinel terbaru, lalu VIIRS */
  const terbaik = xs => xs.find(h => !viirs(h) && h.awan_pct <= 50) || xs.find(h => !viirs(h)) || xs[0];
  /* keterangan citra sebagai label-label kecil; awan diberi warna sesuai kejernihan */
  const sub = h => { const aw = h.awan_pct, w = aw == null ? "" : aw <= 30 ? "ok" : aw <= 70 ? "sedang" : "buruk";
    return `<span class="ct-lb">${esc(h.satelit)}</span><span class="ct-lb">${tg(h.tgl)} · ${lalu(h.tgl)}</span>${wib(h) ? `<span class="ct-lb">${wib(h)}</span>` : ""}<span class="ct-lb ${w}">${awan(h)}</span><span class="ct-lb">kotak ${h.km} km</span>`; };

  /* ================================================================ laci */
  const _buka = Laci.buka.bind(Laci);
  Laci.buka = function (id) { _buka(id); tambahLaci(id); };
  async function tambahLaci(id) {
    try { await muat(); } catch { return; }
    const xs = D.kompleks[id], awal = xs?.length ? xs.indexOf(terbaik(xs)) : 0;
    if (S.pilihK !== id || $("#laci .ct-laci")) return;
    const isi = xs?.length ? `<div class="seg ct-tgl" role="group" aria-label="Tanggal citra">${xs.map((h, i) => `<button data-i="${i}" aria-pressed="${i === awal}">${tg(h.tgl)}<small>${viirs(h) ? "VIIRS" : "S2"}</small></button>`).join("")}</div>
      <div class="ct-dua">${["tc", "swir"].map(m => `<figure><button class="ct-img" data-m="${m}" aria-label="Perbesar ${MODE[m]}"><img alt="" width="400" height="400"></button><figcaption>${MODE[m]}</figcaption></figure>`).join("")}</div>
      <p class="ct-meta"></p>${LEG}<div class="sg-ket ct-ket"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/></svg><span><b>SWIR menembus asap tipis</b>: api sering tetap terlihat walau di warna asli tertutup</span></div><p class="fnd ct-kr"></p>`
      : `<p class="fnd">Belum ada citra untuk kompleks ini: hanya ${Object.keys(D.kompleks).length} kompleks prioritas teratas yang dipotretkan tiap hari, atau belum ada lintasan satelit dalam ${D.hari} hari.</p>`;
    const html = `<details class="lipat ct-laci" open><summary>Citra satelit terbaru</summary><div class="isi">${isi}</div></details>`;
    const api = [...document.querySelectorAll("#laci details.lipat")].find(d => d.querySelector("summary")?.textContent.startsWith("Api saat ini"));
    api ? api.insertAdjacentHTML("afterend", html) : $("#laci .bd")?.insertAdjacentHTML("afterbegin", html);
    const el = $("#laci .ct-laci"); if (!xs?.length) return;
    let i = awal;
    const isiGambar = () => { const h = xs[i];
      el.querySelectorAll(".ct-img").forEach(b => { const img = b.firstChild; img.src = src(h, b.dataset.m); img.alt = `${MODE[b.dataset.m]} ${h.satelit} ${tg(h.tgl)}, kotak ${h.km} km berpusat di kompleks ${id}`; });
      el.querySelectorAll(".ct-tgl button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.i === i)));
      el.querySelector(".ct-meta").innerHTML = sub(h); el.querySelector(".ct-kr").innerHTML = kredit(h); };
    isiGambar();
    el.addEventListener("click", e => { const t = e.target.closest(".ct-tgl button"); if (t) { i = +t.dataset.i; return isiGambar(); }
      const b = e.target.closest(".ct-img"); if (b) bandingkan(id, i, b.dataset.m); });
  }

  /* ================================================================ dialog banding sebelum/sesudah */
  function bandingkan(id, i, mode) {
    const xs = D.kompleks[id], p = S.kluster.features.find(f => f.properties.id === id)?.properties || {}, d = $("#dlg");
    const st = {m: mode, ses: i, seb: null, api: false};
    const pasangan = () => xs.map((h, j) => j).filter(j => j !== st.ses && xs[j].km === xs[st.ses].km && xs[j].tgl < xs[st.ses].tgl);
    const opsi = (js, v) => js.map(j => `<option value="${j}" ${j === v ? "selected" : ""}>${tg(xs[j].tgl)} · ${esc(xs[j].satelit)} · ${awan(xs[j])}</option>`).join("");
    const titik = h => { const [w, s, e, n] = h.bbox; return (p.api24 || []).filter(([x, y]) => x > w && x < e && y > s && y < n)
      .map(([x, y]) => `<circle cx="${((x - w) / (e - w) * 100).toFixed(2)}" cy="${((n - y) / (n - s) * 100).toFixed(2)}" r="${h.km > 20 ? .6 : 1.4}"/>`).join(""); };
    const gambar = () => {
      const h = xs[st.ses], ps = pasangan(); if (!ps.includes(st.seb)) st.seb = ps.at(-1) ?? null; const b = st.seb == null ? null : xs[st.seb];
      d.querySelector(".ct-ctl").innerHTML = `<div class="seg" role="group" aria-label="Jenis citra">${Object.entries(MODE).map(([k, n]) => `<button data-mode="${k}" aria-pressed="${st.m === k}">${n}</button>`).join("")}</div>
        <label>Sesudah <select data-c="ses">${opsi(xs.map((_, j) => j), st.ses)}</select></label>
        ${ps.length ? `<label>Sebelum <select data-c="seb">${opsi(ps, st.seb)}</select></label>` : ""}
        ${p.api24?.length ? `<label class="ct-cek"><input type="checkbox" data-c="api" ${st.api ? "checked" : ""}> titik panas 24 jam</label>` : ""}`;
      d.querySelector(".ct-banding").innerHTML = `${b ? `<img src="${src(b, st.m)}" alt="Sebelum: ${MODE[st.m]} ${esc(b.satelit)} ${tg(b.tgl)}"><span class="ct-tag kiri">${tg(b.tgl)}</span>` : ""}
        <img class="${b ? "atas" : ""}" src="${src(h, st.m)}" alt="${b ? "Sesudah: " : ""}${MODE[st.m]} ${esc(h.satelit)} ${tg(h.tgl)}" style="--x:50%"><span class="ct-tag kanan">${tg(h.tgl)}</span>
        ${st.api ? `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${titik(h)}</svg>` : ""}
        ${b ? `<i class="ct-garis" style="--x:50%"></i><input type="range" min="0" max="100" value="50" aria-label="Geser pembanding sebelum dan sesudah">` : ""}`;
      d.querySelector(".ct-sub").innerHTML = b ? `<span class="ct-lb-j">Sebelum</span>${sub(b)}<br><span class="ct-lb-j">Sesudah</span>${sub(h)}` : sub(h);
      d.querySelector(".ct-kr").innerHTML = "Sumber: " + [...new Set([h, b].filter(Boolean).map(kredit))].map(x => x.replace("Sumber: ", "")).join(" · ");
    };
    d.innerHTML = `<div class="dh"><div><h3 id="dlgJudul">Citra satelit · ${esc(p.kec || id)}${p.kab ? ", " + esc(p.kab) : ""}</h3><p>Kompleks ${esc(id)} · ${xs.length} citra dalam ${D.hari} hari terakhir</p></div><button aria-label="Tutup" data-tutup>×</button></div>
      <div class="db ct-dlg"><div class="ct-ctl"></div><div class="ct-banding"></div><p class="ct-meta ct-sub"></p>${LEG}
      <p class="fnd">Geser garis untuk membandingkan dua tanggal pada tempat yang sama. ${KET} Persen awan dihitung dari peta kelas Sentinel (SCL) di dalam kotak; asap tebal ikut terhitung sebagai awan.</p><p class="fnd ct-kr"></p></div>`;
    d.querySelector("[data-tutup]").onclick = () => d.close(); d.onclick = ev => { if (ev.target === d) d.close(); };
    d.oninput = e => { if (e.target.type !== "range") return; d.querySelectorAll(".ct-banding .atas, .ct-garis").forEach(x => x.style.setProperty("--x", e.target.value + "%")); };
    d.onchange = e => { const c = e.target.dataset.c; if (!c) return; if (c === "api") st.api = e.target.checked; else st[c] = +e.target.value; gambar(); };
    d.querySelector(".ct-ctl").onclick = e => { const b = e.target.closest("[data-mode]"); if (b) { st.m = b.dataset.mode; gambar(); } };
    /* yang diklik paling lama: jadikan "sebelum", bandingkan dengan citra terbaru berskala sama */
    if (!pasangan().length) { const j = xs.findIndex(h => h.km === xs[i].km && h.tgl > xs[i].tgl); if (j >= 0) Object.assign(st, {ses: j, seb: i}); }
    gambar(); d.showModal();
  }

  /* ================================================================ insight */
  const Citra = window.Citra = {
    muat, bandingkan,
    pasangInsight() {
      if (typeof Insight === "undefined" || Insight.EX.includes("citra")) return;
      Insight.EX.splice(Math.max(1, Insight.EX.indexOf("harian") + 1), 0, "citra");
      Object.assign(Insight.st, {citraHal: 0});
      /* keterangan singkat per kartu dari kejernihan citra dan api 24 jam kompleks itu */
      const tafsir = (h, p) => viirs(h) ? "Citra harian kasar (375 m): cocok untuk melihat arah dan sebaran asap, bukan detail api."
        : h.awan_pct > 70 ? "Tertutup awan atau asap tebal: api tidak terlihat jelas di citra ini."
        : h.awan_pct > 30 ? "Sebagian tertutup awan/asap: lihat bagian yang jernih di SWIR."
        : (p.px24 || 0) > 0 ? `Cukup jernih: merah/jingga di SWIR adalah api aktif (${fmt(p.px24)} piksel api 24 jam), cokelat gelap bekas terbakar.`
        : "Cukup jernih: cokelat gelap di SWIR menandai bekas terbakar; tidak ada api aktif 24 jam terakhir.";
      Insight.exCitra = function () {
        /* citra.json belum terbit: kartu disembunyikan, jangan menunggu selamanya */
        if (!D) { if (Citra.gagal) return ""; muat().then(() => { const box = document.querySelector('#insight [data-ex="citra"]'); if (box) box.innerHTML = this.gambar("citra"); })
            .catch(() => { Citra.gagal = true; document.querySelector('#insight [data-ex="citra"]')?.remove(); });
          return ""; }
        const ks = Object.entries(D.kompleks).filter(([, xs]) => xs.length), PER = 6, nH = Math.ceil(ks.length / PER), hal = Math.min(this.st.citraHal || 0, nH - 1);
        const bersih = ks.filter(([, xs]) => xs.some(h => !viirs(h) && h.awan_pct <= 30)).length;
        const kartu = ks.slice(hal * PER, hal * PER + PER).map(([id, xs]) => { const h = terbaik(xs), p = S.kluster?.features.find(f => f.properties.id === id)?.properties || {};
          return `<div class="ct-kartu2"><div class="ct-nm"><b>${esc(p.kec || id)}</b><span>${esc(p.kab || "")}</span></div><button class="ct-pasang" data-kl="${esc(id)}" aria-label="Buka kompleks ${esc(p.kec || id)}">${["tc", "swir"].map(m => `<figure><img src="${src(h, m)}" alt="${MODE[m]} ${esc(p.kec || id)} ${tg(h.tgl)}" loading="lazy" decoding="async" width="400" height="400" onerror="this.closest('figure').classList.add('ct-hilang')"><figcaption>${m === "tc" ? "Warna asli" : "SWIR"}</figcaption><span class="ct-tglp">${tg(h.tgl)}</span></figure>`).join("")}</button>
            <div class="ct-isi"><div class="ct-meta">${sub(h)}</div><p class="ct-tf">${tafsir(h, p)}</p></div></div>`; }).join("");
        const pg = nH > 1 ? `<div class="ct-hal">${paginasi(hal, ks.length, PER, "kompleks")}</div>` : "";
        return this.ex(`Potret perbandingan warna asli dan SWIR di ${this.hl(fmt(ks.length) + " kompleks prioritas")}; ${this.hl(fmt(bersih))} terpotret cukup jernih dalam ${D.hari} hari terakhir`,
          "Kondisi terbaru dari satelit", `Potongan ± ${D.kotak_km} × ${D.kotak_km} km berpusat di tiap kompleks, urut prioritas. Klik gambar untuk membuka kompleks dan membandingkan tanggal.`,
          `<div class="ct-galeri2">${kartu}</div>${pg}${LEG}<div class="ct-info">${[["Menembus asap tipis", "api sering terlihat di SWIR walau tertutup di warna asli"], ["Cukup jernih", "awan/asap ≤ 30% di dalam kotak"], ["Cadangan VIIRS", "dipakai bila Sentinel berawan atau lebih dari 2 hari"]].map(([b, t]) => `<span><b>${b}</b>${t}</span>`).join("")}</div>`,
          `Sumber: ${esc(D.atribusi.Sentinel)} · ${esc(D.atribusi.VIIRS)} · diperbarui ${new Date(D.dibuat).toLocaleString("id-ID", {timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"})} WIB`); };
      document.addEventListener("click", e => { const b = e.target.closest(".ct-hal [data-h]"); if (!b || b.disabled) return; Insight.st.citraHal = +b.dataset.h;
        const box = document.querySelector('#insight [data-ex="citra"]'); if (box) { box.innerHTML = Insight.gambar("citra"); box.scrollIntoView({block: "nearest"}); } });
      if (document.querySelector("#p-insight.on")) Insight.render();
    },
  };
  Citra.pasangInsight();
})();
