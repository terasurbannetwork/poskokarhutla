/* /kejadian.html?b=<modul>&k=<kode kab>: berkas dari scripts/umum/laporan_kejadian.py; hanya modul dan kode yang dikenal yang dimuat */
(() => {
  const DIR = {banjir: "/banjir/data/kejadian/", cuaca: "/banjir/data/kejadian/", udara: "/udara/data/kejadian/", kekeringan: "/data/kejadian/"};
  const q = new URLSearchParams(location.search), b = q.get("b"), k = q.get("k");
  if (!Object.hasOwn(DIR, b) || !/^\d{4}$/.test(k || "")) { document.getElementById("laporan").innerHTML = '<div class="kosong" role="alert">Laporan kejadian tidak ditemukan.</div>'; return; }
  document.getElementById("kjBencana").dataset.bencana = b;
  Laporan.pasang({id: b, url: `${DIR[b]}${b}-${k}.json`});
})();
