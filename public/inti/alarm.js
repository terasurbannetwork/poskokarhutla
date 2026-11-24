/* Pop-up alarm peringatan dini (PERINGATAN-DINI.md §3), dipasang di semua halaman bencana dan /semua.
   Sumber: GET /api/peringatan/aktif (src/peringatan.js). Jajak tiap 60 dtk hanya saat tab terlihat; tiap alarm tampil sekali per
   perangkat (localStorage "pb_alarm"); KECUALI operator command center: alert karhutla yang belum final muncul lagi tiap pemuatan halaman sampai diputuskan. Rupa meniru pop-up Situasi (public/inti/sapa.js): kepala navy, pil tingkat, tombol bulat.
   Kartu tidak modal (pojok kanan bawah) supaya tidak menghalangi peta; teks dari API selalu di-escape. Banjir ikut berbunyi (BERBUNYI).
   Kartu karhutla: SATU GET /api/cc/status?kunci= (src/command_center.js). Hanya 200 (operator/staf command center yang sedang masuk) menambah bagian
   tindak lanjut (status, pemegang, tombol 'aksi' -> POST /api/cc/aksi/:id).
   BUNYI hanya untuk alert yang BARU masuk setelah jajak pertama (tidak pernah saat halaman dibuka/dimuat ulang, tidak berulang). 401/403/404/jaringan putus/bentuk asing = kartu publik
   apa adanya, tanpa pesan, supaya pengunjung biasa tidak melihat bedanya. Bagian operator memakai DOM kecil + delegasi klik yang sama dengan tombol tutup. */
(() => {
  const JEDA = 60e3, KUNCI = "pb_alarm", MAKS_INGAT = 300;
  /* jenis yang berbunyi saat kartunya muncul (bunyi sama dengan /monitor), HANYA bila alert-nya baru masuk sesudah jajak pertama. Peramban menolak bunyi sebelum pengunjung mengetuk halaman: gagal diam, kartu tetap tampil. */
  const BERBUNYI = new Set(["banjir"]), SUARA = "/suara/alarm-api.mp3";
  const RUTE = {karhutla: "/", banjir: "/banjir/", gempa: "/gempa/", tsunami: "/gempa/", cuaca: "/cuaca/"};
  /* K13 (PB-68.7): di halaman satu bencana, alarm jenis SAMA = kartu penuh; jenis LAIN = pil di kepala halaman yang membuka kartu penuh saat diklik.
     Halaman tanpa jenis tunggal (/semua, /peringatan, command center, dll) = null: semua kartu penuh seperti dulu. Fungsi murni, diuji tests/layar/pb_alarm_pil.test.mjs. */
  const HALAMAN = [["/banjir/longsor", ["longsor"]], ["/banjir", ["banjir"]], ["/gempa", ["gempa", "tsunami"]], ["/cuaca", ["cuaca"]], ["/gunungapi", ["gunungapi"]], ["/kekeringan", ["kekeringan"]], ["/udara", ["udara"]], ["/pesisir", ["pesisir", "rob"]]];
  const JENIS_NAMA = {karhutla: "Karhutla", banjir: "Banjir", gempa: "Gempa bumi", tsunami: "Tsunami", cuaca: "Cuaca ekstrem", gunungapi: "Gunung api", udara: "Kualitas udara", kekeringan: "Kekeringan", pesisir: "Pesisir", longsor: "Longsor", rob: "Rob"};
  const jenisHalaman = jalur => {
    const p = String(jalur || "/").replace(/index\.html$/, "").replace(/\.html$/, "").replace(/\/+$/, "") || "/";
    if (p === "/") return ["karhutla"];
    for (const [d, j] of HALAMAN) if (p === d || p.startsWith(d + "/")) return j;
    return null;
  };
  const modeTampil = (jenis, jalur) => { const j = jenisHalaman(jalur); return !j || j.includes(jenis) ? "kartu" : "pil"; };
  const TINGKAT = ["Awas", "Siaga", "Waspada"];
  const urutAlarm = (x, y) => (PRIORITAS[y.tingkat] || 0) - (PRIORITAS[x.tingkat] || 0) || String(y.dibuat).localeCompare(String(x.dibuat));
  /* satu pil per JENIS: label "Banjir: 1 Awas, 24 Siaga" (tingkat tertinggi dulu), warna = tingkat tertinggi, klik membuka alarm tertinggi (items[0]). Kelompok diurut tingkat tertinggi lalu jumlah. */
  const kelompokPil = daftar => {
    const g = new Map();
    for (const a of daftar) { if (!g.has(a.jenis)) g.set(a.jenis, []); g.get(a.jenis).push(a); }
    return [...g].map(([jenis, items]) => {
      items = items.slice().sort(urutAlarm);
      /* laporan masuk yang dikecilkan (pemilik 24 Nov 2026): satu pil "Laporan masuk: 1 darurat, 2 biasa"; darurat berwarna Awas */
      if (jenis === "lapor") { const d = items.filter(a => a._b?.darurat).length, b = items.length - d;
        return {jenis, nama: "Laporan masuk", items, jumlah: items.length, tertinggi: d ? "Awas" : "Waspada", label: `Laporan masuk: ${[d && `${d} darurat`, b && `${b} biasa`].filter(Boolean).join(", ")}`}; }
      const n = JENIS_NAMA[jenis] || jenis, cacah = {};
      for (const a of items) { const t = PRIORITAS[a.tingkat] ? a.tingkat : "Waspada"; cacah[t] = (cacah[t] || 0) + 1; }
      const rinci = TINGKAT.filter(t => cacah[t]).map(t => `${cacah[t]} ${t}`).join(", ");
      return {jenis, nama: n, items, jumlah: items.length, tertinggi: PRIORITAS[items[0].tingkat] ? items[0].tingkat : "Waspada", label: `${n}: ${rinci}`};
    }).sort((x, y) => PRIORITAS[y.tertinggi] - PRIORITAS[x.tertinggi] || y.jumlah - x.jumlah);
  };
  window.AlarmMode = {jenisHalaman, modeTampil, kelompokPil};
  const WARNA = {Waspada: "#e3b94e", Siaga: "#e58a45", Awas: "#c9503a"};
  const PRIORITAS = {Waspada: 1, Siaga: 2, Awas: 3};
  /* logo WhatsApp (path Simple Icons), bagikan judul + teks + tautan peta lewat wa.me */
  const WA = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41"/></svg>';
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const baca = () => { try { return JSON.parse(localStorage.getItem(KUNCI) || "[]"); } catch (e) { return []; } };
  /* mode kecil (pemilik 24 Nov 2026: "ketika saya minimize, tetap jadi pill aja sampai saya pop out lagi"): sesudah tombol kecilkan, SEMUA peringatan,
     termasuk yang baru masuk, tampil sebagai pil sampai pengunjung membuka salah satu pil. Disimpan per perangkat supaya bertahan saat halaman dimuat ulang. */
  const KUNCI_KECIL = "pb_alarm_kecil";
  let kecil = (() => { try { return localStorage.getItem(KUNCI_KECIL) === "1"; } catch (e) { return false; } })();
  const setKecil = v => { kecil = v; try { v ? localStorage.setItem(KUNCI_KECIL, "1") : localStorage.removeItem(KUNCI_KECIL); } catch (e) {} };
  /* peringatan yang dikecilkan tidak dihitung "sudah dilihat", jadi tetap muncul sebagai pil sesudah halaman dimuat ulang */
  const lupakan = k => { try { localStorage.setItem(KUNCI, JSON.stringify(baca().filter(x => x !== k))); } catch (e) {} };
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
  let antre = [], ringkas = [], tampil = false, sejak = Math.floor(Date.now() / 36e5) * 36e5 - 24 * 36e5, el = null;   // sejak dibulatkan ke jam: semua tab berbagi kunci cache tepi (kuota baca D1)
  /* per tampilan halaman: opr = null (belum tahu) | true (operator berhak tulis) | false (publik); lihat = kunci yang sudah ditampilkan/ditutup di halaman ini; usai = kunci yang diketahui final;
     dikenal = kunci yang sudah pernah ada di jajak mana pun; pertama = jajak pertama belum selesai (isinya tidak berbunyi) */
  let opr = null, pertama = true, sibuk = false;
  const lihat = new Set(), usai = new Set(), dikenal = new Set();

  document.head.insertAdjacentHTML("beforeend", `<style>
.al{position:fixed;right:16px;bottom:16px;z-index:60;width:min(420px,calc(100vw - 32px));border-radius:18px;overflow:hidden;background:var(--card,#fff);color:var(--ink,#0b2545);box-shadow:0 12px 40px rgb(0 0 0 / .25);font:14px/1.45 var(--font,system-ui)}
/* laci rincian (#laci.on, peta.css) tidak boleh tertimpa: desktop geser ke kiri laci (12+390+12), <=900px laci jadi lembar bawah 72% maka naik di atasnya */
body:has(#laci.on) .al{right:414px;width:min(420px,calc(100vw - 430px))}
@media (max-width:900px){body:has(#laci.on) .al{right:16px;width:min(420px,calc(100vw - 32px));bottom:calc(72dvh + 8px);max-height:calc(28dvh - 16px);overflow:auto}}
.al-hd{display:flex;gap:10px;align-items:flex-start;padding:14px 16px 12px;background:linear-gradient(135deg,#0b2545,#163a66);color:#fff}
.al-ey{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#f5a06b;white-space:nowrap}
.al-ey.al-ey-d{color:#ff9a8a}
.al-hd h3{margin:6px 0 0;font:700 16px/1.35 var(--display,inherit);color:#fff}
.al-x{margin-left:auto;border:0;background:rgb(255 255 255 / .14);color:#fff;width:32px;height:32px;border-radius:50%;font-size:18px;line-height:1;cursor:pointer;flex:none}
/* tombol kecilkan jadi pil (pemilik 24 Nov 2026): bentuk sama dengan tombol tutup, sebelah kirinya */
.al-min{margin-left:auto;border:0;background:rgb(255 255 255 / .14);color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;flex:none;display:grid;place-items:center}
.al-min svg{width:16px;height:16px}
.al-min+.al-x{margin-left:8px}
.al-min:hover,.al-x:hover{background:rgb(255 255 255 / .24)}
.al-isi{padding:12px 16px 4px;display:grid;gap:8px}
.al-pil{display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;scrollbar-width:none}
.al-p{display:inline-flex;align-items:center;font-style:normal;font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap;background:color-mix(in oklab,var(--w) 16%,var(--card,#fff));color:var(--t,color-mix(in oklab,var(--w) 55%,#000))}
.al-bar{position:fixed;z-index:59;right:16px;bottom:16px;width:min(420px,calc(100vw - 32px));display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;pointer-events:none}.al-bar[hidden]{display:none}
.al-bar:empty{display:none}
.al-pl{pointer-events:auto;flex:none;display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;border:1px solid var(--line,#d5dbe3);border-radius:999px;background:var(--card,#fff);color:var(--ink,#0b2545);font:700 12.5px/1.2 var(--font,system-ui);box-shadow:0 2px 8px rgb(0 0 0 / .18);cursor:pointer;white-space:nowrap}
.al-pl svg{width:14px;height:14px;flex:none}
.al-pl-Waspada svg{color:var(--warn-tx,#b8860b)}.al-pl-Siaga svg{color:var(--f2-tx,#c2570c)}.al-pl-Awas svg{color:var(--bad-tx,#c9503a)}
@media (max-width:600px){.al-bar{flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto;max-height:52px;scrollbar-width:none}.al-bar>:first-child{margin-left:auto}.al-pl{min-height:44px}}
.al-isi p{margin:0;color:var(--ink2,#4a5568);font-size:13px}
.al-aksi{display:flex;gap:8px;padding:12px 16px 14px}
.al-aksi a,.al-aksi button{flex:1;display:inline-flex;justify-content:center;align-items:center;min-height:40px;border-radius:999px;font-weight:700;font-size:13px;text-decoration:none}
.al-aksi button{background:transparent;font-family:inherit;cursor:pointer}
/* daftar semua peringatan satu pil (pemilik 24 Nov 2026: "kalau banyak bisa milih untuk nampilin semua listnya") */
.al-semua{justify-self:start;min-height:32px;padding:0;border:0;background:none;color:inherit;font:700 12.5px/1.4 var(--font,system-ui);text-decoration:underline;text-underline-offset:2px;cursor:pointer}
.al-ls{list-style:none;margin:0;padding:0;max-height:min(52dvh,440px);overflow-y:auto;overscroll-behavior:contain;border-bottom:1px solid var(--line,#d5dbe3)}
.al-ls li{display:flex;align-items:center;gap:2px;padding:8px 4px 8px 14px;border-top:1px solid var(--line,#d5dbe3)}
.al-ls li:first-child{border-top:0}
.al-ls li{align-items:flex-start}
.al-r{flex:1;min-width:0;display:grid;gap:3px;padding:2px 0}
.al-r .al-p{justify-self:start}
.al-r b{font-size:13px;line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.al-r small{font-size:12px;color:var(--ink2,#4a5568)}
/* tombol per baris (pemilik 24 Nov 2026: tombol buka jelas, bukan hanya klik judul; plus aksi peta, email, WA seperti kartu) */
.al-ra{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}
.al-ra a,.al-ra button{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:0 10px;border:1px solid var(--line,#d5dbe3);border-radius:999px;background:transparent;color:inherit;font:700 12px/1.2 var(--font,system-ui);text-decoration:none;cursor:pointer;white-space:nowrap}
.al-ra .al-pri{background:#0b2545;border-color:transparent;color:#fff}
.al-ra a.al-wa{width:32px;padding:0;background:#1f8f4e;border-color:transparent;color:#fff}.al-ra .al-wa svg{width:17px;height:17px}
.al-rx{flex:none;width:36px;height:36px;border:0;border-radius:50%;background:transparent;color:var(--ink2,#4a5568);font-size:18px;line-height:1;cursor:pointer}
.al-rx:hover{background:color-mix(in oklab,var(--ink,#0b2545) 8%,transparent)}
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

  /* ---------------- laporan warga masuk (pemilik 20 Nov 2026: "tidak hanya Peringatan tapi juga kaya Laporan Warga") ----------------
     HANYA sesi staf meja laporan: GET /api/lapor/meja (src/lapor_ai.js mejaDaftar) sudah membatasi per wilayah akun dan membuang identitas pelapor untuk BPBD.
     401/403 pada jajak pertama = pengunjung publik: berhenti selamanya di halaman ini (laporan warga tidak pernah tampil publik, lapor-ai D7, Q11).
     Hanya laporan terkirim 2 jam terakhir; kartu tanpa tombol bagikan WA (D12). Kunci "lapor:<nomor>" di localStorage yang sama dengan alarm. */
  const LAPOR_JEDA = 180e3, LAPOR_JENDELA = 2 * 36e5, LAPOR_MAKS = 3;
  const KORBAN_DARURAT = {ya: "Ada korban atau orang terjebak", tidak: "Tidak ada korban", belum_tahu: "Korban belum diketahui"};
  let laporOk = null;   // null belum tahu | true staf | false publik
  const MIN = '<button class="al-min" type="button" data-kecil aria-label="Kecilkan jadi pil" title="Kecilkan jadi pil"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg></button>';
  function kartuLapor(b) {
    const w = b.wilayah || {}, tempat = [w.desa && `Desa/Kel. ${w.desa}`, w.kab].filter(Boolean).join(", "), d = b.dampak || {};
    const angka = [[d.meninggal, "meninggal"], [d.hilang, "hilang"], [d.luka, "luka"], [d.mengungsi, "mengungsi"], [d.rumah, "rumah rusak"]].filter(([n]) => n > 0).map(([n, l]) => `${Number(n).toLocaleString("id-ID")} ${l}`);
    const teks = [b.darurat ? `${KORBAN_DARURAT[b.darurat.korban] || "Korban belum diisi"}.` : "", angka.length ? `Dampak dilaporkan: ${angka.join(", ")}.` : "Dampak belum dilaporkan.",
      `${b.instansi ? "Laporan petugas" : "Laporan warga"}, belum terverifikasi; periksa di meja laporan.`].filter(Boolean).join(" ");
    return `<div class="al" role="alertdialog" aria-live="assertive" aria-label="Laporan masuk">
  <div class="al-hd"><div><span class="al-ey${b.darurat ? " al-ey-d" : ""}">${b.darurat ? "Laporan darurat" : b.instansi ? "Laporan BPBD" : "Laporan warga"}</span><h3>${esc(b.jenis || "Kejadian")}${w.kab ? ` di ${esc(w.desa || w.kab)}${w.desa ? `, ${esc(w.kab)}` : ""}` : ""}</h3></div>${MIN}<button class="al-x" type="button" data-tutup aria-label="Tutup">×</button></div>
  <div class="al-isi"><div class="al-pil">${b.darurat ? `<em class="al-p" style="--w:${WARNA.Awas}">Darurat</em>` : ""}<em class="al-p" style="--w:#1d4e89">${esc(b.statusLabel || "Baru")}</em>${b.subjenis && b.subjenis !== "Belum diketahui" ? `<em class="al-p" style="--w:#6b7489">${esc(b.subjenis)}</em>` : ""}${tempat ? `<em class="al-p" style="--w:#6b7489" translate="no">${esc(w.kab || tempat)}</em>` : ""}<em class="al-p" style="--w:#6b7489">${esc(jam(b.terkirim))}</em></div>
  <p>${esc(teks)}</p></div>
  <div class="al-aksi"><a class="al-pri" href="/lapor/meja#daftar">Buka laporan</a><a class="al-sek" href="/lapor/meja#peta">Lihat di peta</a></div>
</div>`;
  }
  /* Worker menyisipkan /inti/keluar.js hanya ke halaman bersesi (src/worker.js pasangKeluar): tanpa itu pengunjung publik, jangan bertanya sama sekali */
  const bersesi = () => !!document.querySelector('script[src^="/inti/keluar.js"], #keluar');
  async function jajakLapor() {
    if (laporOk === false || document.visibilityState !== "visible") return;
    if (!bersesi()) { laporOk = false; return; }
    try {
      const r = await fetch(`/api/lapor/meja?dari=${Math.floor((Date.now() - LAPOR_JENDELA) / 6e4) * 6e4}`, {cache: "no-store", credentials: "same-origin"});
      if (r.status === 401 || r.status === 403) { laporOk = false; return; }
      if (!r.ok) return;
      const j = await r.json(); if (!Array.isArray(j?.baris)) return; laporOk = true;
      const sudah = new Set(baca()), ada = new Set([...antre, ...ringkas].map(x => x.kunci)), batas = Date.now() - LAPOR_JENDELA;
      /* pil laporan yang sudah selesai atau tidak valid di meja hilang dari deretan pil */
      const tutup = new Set(j.baris.filter(b => b?.nomor && ["selesai", "tidak_valid"].includes(b.status)).map(b => "lapor:" + b.nomor));
      if (ringkas.some(x => tutup.has(x.kunci))) { ringkas = ringkas.filter(x => !tutup.has(x.kunci)); gambarPil(); }
      const baru = j.baris.filter(b => b?.nomor && b.terkirim >= batas && !["selesai", "tidak_valid"].includes(b.status) && !sudah.has("lapor:" + b.nomor) && !ada.has("lapor:" + b.nomor) && !lihat.has("lapor:" + b.nomor))
        .sort((x, y) => y.terkirim - x.terkirim).slice(0, LAPOR_MAKS);
      for (const b of baru) antre.push({kunci: "lapor:" + b.nomor, jenis: "lapor", tingkat: b.darurat ? "Awas" : "Waspada", dibuat: new Date(b.terkirim).toISOString(), _p: b.darurat ? 4 : 1.5, _b: b});
      urut(); (window.requestIdleCallback || setTimeout)(berikut);
    } catch (e) {}
  }
  /* darurat di atas Awas; laporan biasa di antara Waspada dan Siaga; lalu yang terbaru */
  const urut = () => antre.sort((x, y) => (y._p ?? PRIORITAS[y.tingkat] ?? 0) - (x._p ?? PRIORITAS[x.tingkat] ?? 0) || String(y.dibuat).localeCompare(String(x.dibuat)));
  const LONCENG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
  let bar = null;
  function gambarPil() {
    if (el?.classList.contains("al-dft")) gambarDaftar();   // daftar terbuka ikut diperbarui (peringatan baru masuk, kedaluwarsa, atau ditutup)
    if (!ringkas.length) { bar?.remove(); bar = null; return; }
    if (!bar) { bar = document.createElement("div"); bar.className = "al-bar"; bar.setAttribute("role", "group"); bar.setAttribute("aria-label", "Peringatan dini yang dikecilkan atau jenis lain");
      bar.addEventListener("click", e => { const b = e.target.closest("[data-pl]"); if (b) bukaPil(b.dataset.pl); }); document.body.append(bar); }
    taruh();
    bar.innerHTML = kelompokPil(ringkas).map(k =>
      `<button type="button" class="al-pl al-pl-${esc(k.tertinggi)}" data-pl="${esc(k.jenis)}" aria-label="${esc(`${k.jenis === "lapor" ? "" : "Peringatan "}${k.label}: buka`)}">${LONCENG}${esc(k.label)}</button>`).join("");
  }
  /* strip pil memakai jangkar kartu (kanan bawah); bila kartu terbuka, strip naik di atasnya. Tinggi kartu berubah (bagian operator datang belakangan), jadi diikuti ResizeObserver. */
  /* laci rincian (#laci.on, kanan layar) terbuka: pil bergeser ke kiri laci supaya tidak menutup isinya; di layar sempit laci menutupi lebar penuh, pil tetap */
  let amatiLaci = null;
  const geserLaci = () => { const lc = document.querySelector?.("#laci"); if (!lc) return "";
    if (!amatiLaci && window.MutationObserver) { amatiLaci = new MutationObserver(() => taruh()); amatiLaci.observe(lc, {attributes: true, attributeFilter: ["class"]}); }   /* dipasang malas: #laci bisa belum ada saat alarm.js dimuat */
    if (!lc.classList.contains("on") || innerWidth <= 600) return ""; const k = lc.getBoundingClientRect().left; return k > 200 ? Math.round(innerWidth - k + 16) + "px" : ""; };
  const taruh = () => { if (!bar) return; bar.style.bottom = (el && el.isConnected ? el.offsetHeight + 24 : 16) + "px"; bar.style.right = geserLaci();
    bar.hidden = innerWidth <= 600 && !!document.querySelector?.("#laci.on"); };   /* layar sempit: laci selebar layar, pil disembunyikan selama laci terbuka */
  let amati = null;
  const tutupEl = () => { el?.remove(); el = null; tampil = false; amati?.disconnect(); };
  const pasangEl = node => { el = node; tampil = true; document.body.append(el); taruh();
    if (window.ResizeObserver) { amati?.disconnect(); amati = new ResizeObserver(taruh); amati.observe(el); } };
  /* pil berisi satu peringatan: langsung kartunya; lebih dari satu: daftar semua (bukaDaftar) */
  function bukaPil(jenis) {
    const k = kelompokPil(ringkas.filter(a => a.jenis === jenis))[0]; if (!k) return;
    if (k.items.length > 1) return bukaDaftar(jenis);
    bukaItem(k.items[0], true);
  }
  /* pulih = keluar dari mode kecil (klik pil tunggal, perilaku lama). Dari daftar: mode kecil tetap, sisanya tetap di pil. */
  function bukaItem(a, pulih) {
    ringkas = ringkas.filter(x => x.kunci !== a.kunci);
    if (kecil && pulih) { setKecil(false); const balik = ringkas.filter(x => x.jenis === "lapor" || modeTampil(x.jenis, location.pathname) !== "pil"); ringkas = ringkas.filter(x => !balik.includes(x)); antre.push(...balik); }
    gambarPil();
    antre.unshift({...a, _bunyi: false});
    if (tampil && el) tutupEl();   // satu kartu pada satu waktu: kartu yang sedang terbuka ditutup seperti tombol x
    berikut(true);
  }

  /* ---------------- daftar semua peringatan (pemilik 24 Nov 2026: "repot banget harus liat dan close 1 1") ----------------
     dJenis = jenis pil yang dibuka, null = semua pil. Baris: klik membuka kartu penuh, × menutup satu; "Tutup semua" menutup seluruh isi daftar. */
  let dJenis = null;
  const isiDaftar = () => (dJenis ? ringkas.filter(a => a.jenis === dJenis) : ringkas.slice());
  function barisDaftar(a) {
    if (a.jenis === "lapor") { const b = a._b || {}, w = b.wilayah || {};
      return `<div class="al-r"><em class="al-p" style="--w:${b.darurat ? WARNA.Awas : "#1d4e89"}">${b.darurat ? "Darurat" : esc(b.statusLabel || "Baru")}</em><b>${esc(b.jenis || "Kejadian")}${w.kab ? ` di ${esc(w.desa || w.kab)}${w.desa ? `, ${esc(w.kab)}` : ""}` : ""}</b><small>${esc(jam(b.terkirim))}</small>
<div class="al-ra"><button type="button" class="al-pri" data-rb="${esc(a.kunci)}">Buka</button><a href="/lapor/meja#daftar">Buka laporan</a><a href="/lapor/meja#peta">Lihat di peta</a></div></div>`; }
    const wil = [a.kab, a.prov && window.namaProv ? namaProv(a.prov) : ""].filter(Boolean).join(", ");
    const rute = RUTE[a.jenis] || "/";
    return `<div class="al-r"><em class="al-p" style="--w:${WARNA[a.tingkat] || WARNA.Waspada}">${esc(a.tingkat)}</em><b>${esc(a.judul)}</b><small translate="no">${esc([wil, a.sumber, jam(a.dibuat)].filter(Boolean).join(", "))}</small>
<div class="al-ra"><button type="button" class="al-pri" data-rb="${esc(a.kunci)}">Buka</button><a href="${esc(rute)}">Lihat di peta</a><a href="/peringatan">Dapatkan lewat email</a><a class="al-wa" href="https://wa.me/?text=${encodeURIComponent([a.judul, a.teks, location.origin + rute].filter(Boolean).join("\n\n"))}" target="_blank" rel="noopener" aria-label="Bagikan lewat WhatsApp">${WA}</a></div></div>`;
  }
  function gambarDaftar() {
    const items = isiDaftar(); if (!items.length) { tutupEl(); gambarPil(); taruh(); setTimeout(berikut, 400); return; }
    const ls = el.querySelector(".al-ls"), gulir = ls ? ls.scrollTop : 0, rute = RUTE[dJenis];
    el.innerHTML = `<div class="al-hd"><div><span class="al-ey">Semua peringatan</span><h3>${esc(kelompokPil(items).map(k => k.label).join("; "))}</h3></div>${MIN}</div>
  <ul class="al-ls">${items.map(a => `<li>${barisDaftar(a)}<button type="button" class="al-rx" data-rx="${esc(a.kunci)}" aria-label="Tutup peringatan ini" title="Tutup peringatan ini">×</button></li>`).join("")}</ul>
  <div class="al-aksi">${dJenis === "lapor" ? `<a class="al-pri" href="/lapor/meja#daftar">Buka meja laporan</a>` : rute ? `<a class="al-pri" href="${esc(rute)}">Lihat di peta</a>` : ""}<button type="button" class="al-sek" data-tutup-semua>Tutup semua (${items.length})</button></div>`;
    const ls2 = el.querySelector(".al-ls"); if (ls2) ls2.scrollTop = gulir;
  }
  const buang = kunci => { tandai(kunci); lihat.add(kunci); ringkas = ringkas.filter(x => x.kunci !== kunci); antre = antre.filter(x => x.kunci !== kunci); };
  function bukaDaftar(jenis) {
    if (tampil && el) tutupEl();
    dJenis = jenis;
    const d = document.createElement("div"); d.className = "al al-ada al-dft"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Daftar peringatan");
    pasangEl(d); gambarDaftar();
    d.addEventListener("click", e => {
      if (e.target.closest("[data-kecil]")) { tutupEl(); taruh(); setTimeout(berikut, 400); return; }
      if (e.target.closest("[data-tutup-semua]")) { for (const a of isiDaftar()) buang(a.kunci); tutupEl(); gambarPil(); taruh(); setTimeout(berikut, 400); return; }
      const x = e.target.closest("[data-rx]"); if (x) { buang(x.dataset.rx); gambarPil(); return; }
      const b = e.target.closest("[data-rb]"); if (b) { const a = ringkas.find(y => y.kunci === b.dataset.rb); if (a) { tutupEl(); bukaItem(a, false); } }
    });
  }

  function kartu(a) {
    if (a.jenis === "lapor") return kartuLapor(a._b);
    const w = WARNA[a.tingkat] || WARNA.Waspada, wil = [a.kab, a.prov && window.namaProv ? namaProv(a.prov) : ""].filter(Boolean).join(", ");
    return `<div class="al" role="alertdialog" aria-live="assertive" aria-label="Peringatan dini">
  <div class="al-hd"><div><span class="al-ey">Peringatan ${esc(a.tingkat)}</span><h3>${esc(a.judul)}</h3></div>${MIN}<button class="al-x" type="button" data-tutup aria-label="Tutup">×</button></div>
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
    const r = a._s ? {s: 200, j: a._s} : await cc(urlStatus(a.kunci));
    if (r.s === 200 && penuh(r.j)) opr = true; else if (r.s === 401 || r.s === 403) opr = false;
    /* ditandai 'sudah dilihat' HANYA bila bukan operator, operator tanpa hak tulis, atau statusnya sudah final; operator + belum final = muncul lagi di pemuatan berikutnya */
    const tetap = r.s === 200 && penuh(r.j) && r.j.aksi.length > 0 && !FINAL_CC.includes(r.j.status);
    if (!tetap) { tandai(a.kunci); if (r.s === 200) usai.add(a.kunci); }
    if (r.s !== 200 || !penuh(r.j) || !k.isConnected) return;
    const op = document.createElement("div"); op.className = "al-op"; op.setAttribute("data-op", "");
    k.classList.add("al-ada"); k.querySelector(".al-isi")?.after(op);
    const w = {kunci: a.kunci, s: r.j, op, sibuk: false}; OP.set(k, w); gambar(w);
    if (a._bunyi) bunyi();
  }
  async function aksiCc(k, ke) {
    const w = OP.get(k); if (!w || w.sibuk || !Object.hasOwn(AKSI_CC, ke)) return;
    const s = w.s, final = FINAL_CC.includes(s.status), inp = w.op.querySelector("[data-cat]"), catatan = (inp?.value || "").trim();
    if (final && catatan.length < 3) { pesan(w, "Koreksi wajib bercatatan: tulis alasannya (minimal 3 huruf)."); inp?.focus(); return; }
    pesan(w, ""); sibukkan(w, true);
    const r = await cc(`/api/cc/aksi/${encodeURIComponent(s.id)}`, {method: "POST", headers: {"content-type": "application/json", "x-pb": "1"}, body: JSON.stringify({dari: s.status, ke, ...(catatan ? {catatan} : {})})});
    if (!k.isConnected) return;
    if (r.s === 200 && penuh(r.j)) { w.s = {...s, ...r.j}; if (FINAL_CC.includes(w.s.status)) { tandai(w.kunci); usai.add(w.kunci); } gambar(w, `Status: ${STATUS_CC[w.s.status][0]}.`); sibukkan(w, false); return; }
    if (r.s === 409) {   // kalah balapan: muat ulang status dari server (bentuk 409 tanpa 'aksi', jadi tombol dikosongkan bila muat ulang gagal)
      const b = await cc(urlStatus(w.kunci));
      if (!k.isConnected) return;
      w.s = b.s === 200 && penuh(b.j) ? b.j : {...s, ...(sah(r.j) ? {status: r.j.status, oleh_nama: r.j.oleh_nama, sejak: r.j.sejak} : {}), aksi: []};
      if (FINAL_CC.includes(w.s.status)) { tandai(w.kunci); usai.add(w.kunci); }
      gambar(w, `Sudah diubah oleh ${w.s.oleh_nama || "operator lain"} menjadi "${STATUS_CC[w.s.status][0]}"; status dimuat ulang.`); sibukkan(w, false); return;
    }
    sibukkan(w, false); pesan(w, typeof r.j?.galat === "string" && r.j.galat ? r.j.galat.slice(0, 140) : "Aksi gagal; coba lagi.");
  }

  function berikut(paksa) {
    if (tampil || !antre.length) return;
    if (kecil && paksa !== true) { for (const x of antre) if (!ringkas.some(y => y.kunci === x.kunci)) ringkas.push({...x, _bunyi: false});
      antre = []; ringkas.sort(urutAlarm); gambarPil(); return; }
    const [a] = antre.splice(0, 1); tampil = true; lihat.add(a.kunci);
    if (a.jenis !== "karhutla" || opr === false) tandai(a.kunci);   // karhutla: operatorCc yang menentukan (operator belum final tidak ditandai)
    if (BERBUNYI.has(a.jenis) && a._bunyi) bunyi();
    const t = document.createElement("div"); t.innerHTML = kartu(a); const k = t.firstElementChild;
    /* masih ada peringatan lain yang mengantre: tawarkan daftar semua supaya tidak ditutup satu per satu */
    if (antre.length) k.querySelector(".al-isi")?.insertAdjacentHTML("beforeend", `<button type="button" class="al-semua" data-semua>Lihat semua ${antre.length + 1} peringatan</button>`);
    pasangEl(k);
    k.addEventListener("click", e => {
      if (e.target.closest("[data-tutup]")) { tutupEl(); taruh(); setTimeout(berikut, 400); return; }
      /* lihat semua: kartu ini dan antreannya pindah ke pil (mode kecil, seperti kecilkan), lalu daftar semua dibuka */
      if (e.target.closest("[data-semua]")) { tutupEl(); setKecil(true);
        for (const x of [a, ...antre]) { lupakan(x.kunci); if (!ringkas.some(y => y.kunci === x.kunci)) ringkas.push({...x, _bunyi: false}); }
        antre = []; ringkas.sort(urutAlarm); gambarPil(); bukaDaftar(null); return; }
      /* kecilkan: kartu yang sama pindah ke deretan pil kanan bawah; klik pilnya membuka kartu ini lagi (bukaPil). Peringatan berikutnya di antrean tetap muncul. */
      if (e.target.closest("[data-kecil]")) { el.remove(); el = null; tampil = false; amati?.disconnect(); setKecil(true); lupakan(a.kunci);
        if (!ringkas.some(x => x.kunci === a.kunci)) ringkas.push({...a, _bunyi: false});
        for (const x of antre) { lupakan(x.kunci); if (!ringkas.some(y => y.kunci === x.kunci)) ringkas.push({...x, _bunyi: false}); }
        antre = []; ringkas.sort(urutAlarm); gambarPil(); taruh(); setTimeout(berikut, 400); return; }
      const b = e.target.closest("[data-ke]"); if (b && !b.disabled) aksiCc(k, b.dataset.ke);
    });
    k.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches?.("[data-cat]")) k.querySelector("[data-ke]:not(:disabled)")?.click(); });
    if (a.jenis === "karhutla" && opr !== false) operatorCc(a, k);
  }

  /* operator: alert karhutla yang sudah ditandai tapi BELUM final di server dimunculkan lagi (maks 20 GET per jajak; berhenti begitu terbukti publik) */
  async function ulangOperator(daftar, sudah, ada) {
    let n = 0;
    for (const a of daftar) {
      if (opr === false || n >= 20) break;
      if (a?.jenis !== "karhutla" || modeTampil(a.jenis, location.pathname) === "pil" || !a.kunci || !sudah.has(a.kunci) || ada.has(a.kunci) || lihat.has(a.kunci) || usai.has(a.kunci)) continue;
      n++; const r = await cc(urlStatus(a.kunci));
      if (r.s === 401 || r.s === 403) { opr = false; break; }
      if (r.s === 404) { usai.add(a.kunci); continue; }   // di luar wilayah/contoh: jangan ditanya ulang tiap menit
      if (r.s !== 200 || !penuh(r.j)) continue;
      opr = true;
      if (FINAL_CC.includes(r.j.status) || !r.j.aksi.length) usai.add(a.kunci); else { antre.push({...a, _s: r.j}); ada.add(a.kunci); }
    }
  }

  async function jajak() {
    if (document.visibilityState !== "visible" || sibuk) return;
    sibuk = true;
    try {
      const r = await fetch(`/api/peringatan/aktif?sejak=${sejak}`, {cache: "no-store"}); if (!r.ok) return;
      const j = await r.json(), sudah = new Set(baca()), ada = new Set([...antre, ...ringkas].map(x => x.kunci)), daftar = j.peringatan || [];
      for (const a of daftar) if (a?.kunci && !sudah.has(a.kunci) && !ada.has(a.kunci) && !lihat.has(a.kunci)) {
        const b = {...a, _bunyi: !pertama && !dikenal.has(a.kunci)};
        if (modeTampil(a.jenis, location.pathname) === "pil" || kecil) { ringkas.push(b); if (BERBUNYI.has(a.jenis) && b._bunyi) bunyi(); } else antre.push(b);
        ada.add(a.kunci);
      }
      ringkas = ringkas.filter(a => a.jenis === "lapor" || daftar.some(x => x?.kunci === a.kunci));   // alarm yang sudah kedaluwarsa di server hilang dari kepala halaman (pil laporan diurus jajakLapor)
      ringkas.sort(urutAlarm);
      gambarPil();
      await ulangOperator(daftar, sudah, ada);
      for (const a of daftar) if (a?.kunci) dikenal.add(a.kunci);
      pertama = false;
      // Tingkat tertinggi tampil dulu (Awas > Siaga > Waspada), lalu yang terbaru.
      urut();
      (window.requestIdleCallback || setTimeout)(berikut);
    } catch (e) {}
    finally { sibuk = false; }
  }

  setTimeout(jajak, 3000); setTimeout(jajakLapor, 4000);
  setInterval(() => { if (!document.hidden) jajak(); }, JEDA);
  setInterval(() => { if (!document.hidden) jajakLapor(); }, LAPOR_JEDA);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { jajak(); jajakLapor(); } });
})();
