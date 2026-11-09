/* Kalender rentang tanggal katalog dokumen, tertanam di menu Tanggal: klik pertama = awal, klik kedua = akhir. Pengganti <input type="date"> yang tampilannya tidak bisa diatur.
   Tanggal = teks ISO, dihitung di UTC supaya tidak bergeser zona waktu. */
"use strict";
window.KatalogTgl = (() => {
  const NS = "http://www.w3.org/2000/svg", HARI = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const garis = d => { const s = document.createElementNS(NS, "svg"), p = document.createElementNS(NS, "path"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true"); s.setAttribute("class", "kd-ik"); p.setAttribute("d", d); s.append(p); return s; };
  const el = (tag, kelas, teks) => { const e = document.createElement(tag); if (kelas) e.className = kelas; if (teks != null) e.textContent = teks; return e; };
  const iso = (y, m, d) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
  const tampil = t => new Date(t + "T12:00:00Z").toLocaleDateString("id-ID", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"});
  const namaBulan = (y, m) => new Date(Date.UTC(y, m, 1)).toLocaleDateString("id-ID", {month: "long", year: "numeric", timeZone: "UTC"});

  function buat({jumlah, min, max, ubah}) {
    const panel = el("div", "kd-kal");
    const judul = el("b", "kd-kal-judul"), kiri = el("button", "kd-ikon"), kanan = el("button", "kd-ikon"), kisi = el("div", "kd-kal-kisi"), petunjuk = el("span", "kd-kal-petunjuk"), hapus = el("button", "kd-kal-hapus", "Hapus");
    for (const [b, d, t] of [[kiri, "M15 6l-6 6 6 6", "Bulan sebelumnya"], [kanan, "M9 6l6 6-6 6", "Bulan berikutnya"]]) { b.type = "button"; b.title = t; b.setAttribute("aria-label", t); b.append(garis(d)); }
    hapus.type = "button";
    const kepala = el("div", "kd-kal-kepala"), kaki = el("div", "kd-kal-kaki");
    kepala.append(kiri, judul, kanan); kaki.append(petunjuk, hapus); panel.append(kepala, kisi, kaki);

    let a = "", z = "", arah = "", y, m;   // a..z = pilihan; arah = tanggal di bawah kursor saat baru memilih awal
    const warnai = () => {
      const u = a && !z && arah ? (arah < a ? [arah, a] : [a, arah]) : [a, z || a];
      for (const c of kisi.querySelectorAll("button")) {
        const t = c.dataset.t, dalam = !!u[0] && t >= u[0] && t <= u[1];
        c.classList.toggle("dalam", dalam); c.classList.toggle("awal", dalam && t === u[0]); c.classList.toggle("akhir", dalam && t === u[1]);
        c.setAttribute("aria-pressed", String(t === a || t === z));
      }
      petunjuk.textContent = a && !z ? "Pilih tanggal akhir" : a ? "" : "Pilih tanggal awal";
      hapus.hidden = !a;
    };
    const gambar = () => {
      judul.textContent = namaBulan(y, m);
      kiri.disabled = iso(y, m, 1) <= min; kanan.disabled = iso(y, m + 1, 1) > max;
      const isi = HARI.map(h => el("span", "kd-kal-hari", h)), awalan = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7, n = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      for (let i = 0; i < awalan; i++) isi.push(el("span"));
      for (let d = 1; d <= n; d++) {
        const t = iso(y, m, d), b = el("button", "kd-kal-tgl", d), j = jumlah.get(t) || 0;
        b.type = "button"; b.dataset.t = t; b.disabled = t < min || t > max; if (j) { b.classList.add("ada"); b.title = `${j} dokumen`; }
        b.setAttribute("aria-label", tampil(t) + (j ? `, ${j} dokumen` : ""));
        isi.push(b);
      }
      kisi.replaceChildren(...isi); warnai();
    };
    const geser = l => { const d = new Date(Date.UTC(y, m + l, 1)); y = d.getUTCFullYear(); m = d.getUTCMonth(); gambar(); };

    kiri.addEventListener("click", () => geser(-1)); kanan.addEventListener("click", () => geser(1));
    kisi.addEventListener("mouseover", ev => { const b = ev.target.closest("button:not(:disabled)"); if (b && a && !z) { arah = b.dataset.t; warnai(); } });
    kisi.addEventListener("click", ev => {
      const b = ev.target.closest("button:not(:disabled)"); if (!b) return;
      const t = b.dataset.t;
      if (!a || z) { a = t; z = ""; arah = t; warnai(); return; }
      if (t < a) { z = a; a = t; } else z = t;
      arah = ""; warnai(); ubah(a, z);
    });
    hapus.addEventListener("click", () => { const tadi = !!z; a = z = arah = ""; warnai(); if (tadi) ubah("", ""); });
    return {
      el: panel,
      segarkan() { const t = z || a || max; y = +t.slice(0, 4); m = +t.slice(5, 7) - 1; gambar(); },
      batalkanSetengah() { if (a && !z) { a = arah = ""; warnai(); } },
      kosongkan() { a = z = arah = ""; if (y != null) warnai(); },
    };
  }
  return {buat};
})();
