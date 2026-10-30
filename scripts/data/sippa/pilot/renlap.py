"""Renlap Generator (SP-140, butir 11): rencana lapangan untuk kompleks mana pun.
Pakai:  python3 renlap.py K0166,K9321 [--out FOLDER_KERJA]     keluaran: FOLDER_KERJA/keluaran/{renlap.pdf,data.json,img/}
        python3 renlap.py uji                                   self-check tanpa jaringan
Urutan: tarik data live -> kumpul -> tarik -> analisis -> cetak (dossier.html) -> Chrome headless (PDF) -> ekspor_web (data.json, img/).
Env: RENLAP_LIVE (bawaan https://centurisk97.id/data), CHROME (jalur Chrome), RENLAP_IMG_PREFIX (awalan alamat gambar di data.json)."""
import json, os, shutil, subprocess, sys, time, urllib.request
import kunjungan

HERE = os.path.dirname(os.path.abspath(__file__))
KELAYAKAN = os.path.join(HERE, "../../../../data/sippa/keluaran/kelayakan_kompleks.json")
PROV_MORATORIUM = {"64"}   # keputusan SIPPA 63: provinsi tanpa peta gambut 1:250.000 di PRIMS (Kalimantan Timur) memakai gambut moratorium PIPPIB
LIVE = ["kluster", "hotspot72", "fwi", "meta"]


def unduh_live(out, dasar):
    for nama in LIVE:
        for coba in range(3):
            try:
                req = urllib.request.Request(f"{dasar}/{nama}.json", headers={"User-Agent": "renlap/1.0"})
                with urllib.request.urlopen(req, timeout=120) as r:
                    b = r.read()
                json.loads(b)
                open(f"{out}/live_{nama}.json", "wb").write(b)
                break
            except Exception as e:
                if coba == 2:
                    raise RuntimeError(f"data live {nama}.json gagal ditarik: {e}")
                time.sleep(5 * (coba + 1))


def cari_chrome():
    for c in (os.environ.get("CHROME"), "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"):
        if c and (shutil.which(c) or os.path.exists(c)):
            return shutil.which(c) or c
    raise RuntimeError("Chrome tidak ditemukan (set CHROME)")


def jalankan(skrip, env):
    r = subprocess.run([sys.executable, f"{HERE}/{skrip}"], env=env, cwd=HERE)
    if r.returncode:
        raise RuntimeError(f"{skrip} gagal (kode {r.returncode})")


def gambut_otomatis(prov_kompleks):
    """prov_kompleks: kode provinsi tiap kompleks -> 'moratorium' bila SEMUA di PROV_MORATORIUM, selain itu None"""
    p = set(prov_kompleks)
    return "moratorium" if p and p <= PROV_MORATORIUM else None


def bangun(ids_teks, out):
    import situs
    ids = situs.parse_ids(ids_teks)
    os.makedirs(out, exist_ok=True)
    env = {**os.environ, "RENLAP_OUT": out, "RENLAP_KOMPLEKS": ",".join(ids)}
    if not env.get("RENLAP_GAMBUT"):          # env eksplisit menang; kalau kosong, turunkan dari provinsi kompleks
        kel = {k["id"]: k for k in json.load(open(KELAYAKAN))["kompleks"]}
        g = gambut_otomatis(kel[i]["prov"] for i in ids if i in kel)
        if g:
            env["RENLAP_GAMBUT"] = g
            print(f"RENLAP_GAMBUT={g} (otomatis, semua kompleks di provinsi moratorium)", file=sys.stderr)
    if kunjungan.valid(env.get("RENLAP_KUNJUNGAN"), set(ids)) is None:
        env.pop("RENLAP_KUNJUNGAN", None)
    t0 = time.time()
    unduh_live(out, os.environ.get("RENLAP_LIVE", "https://centurisk97.id/data"))
    for skrip in ("kumpul.py", "tarik.py", "analisis.py", "cetak.py"):
        jalankan(skrip, env)
    kel = f"{out}/keluaran"
    shutil.rmtree(kel, ignore_errors=True)
    os.makedirs(kel)
    subprocess.run([cari_chrome(), "--headless=new", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=30000",
                    f"--print-to-pdf={kel}/renlap.pdf", f"file://{out}/dossier.html"], check=True, timeout=900,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    jalankan("ekspor_web.py", env)
    if os.path.getsize(f"{kel}/renlap.pdf") < 20_000:
        raise RuntimeError("renlap.pdf terlalu kecil, cetak gagal")
    d = json.load(open(f"{kel}/data.json"))
    assert len(d["lokasi"]) == len(ids), "jumlah lokasi di data.json tidak sama dengan masukan"
    print(f"renlap siap: {len(ids)} lokasi, {int(time.time() - t0)} detik, {kel}", file=sys.stderr)
    return kel


def uji():
    import situs, teks_renlap
    import lapor
    situs.uji(); teks_renlap.uji(); kunjungan.uji()
    assert gambut_otomatis(["64", "64"]) == "moratorium" and gambut_otomatis(["64", "62"]) is None and gambut_otomatis([]) is None
    kel = json.load(open(KELAYAKAN))["kompleks"]
    assert any(k["prov"] == "64" for k in kel), "kelayakan_kompleks.json tanpa prov 64"
    assert len(lapor.tanda("k", "r", 1, "siap")) == 64
    print("renlap uji ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] == "uji":
        uji()
    else:
        bangun(a[0], os.path.abspath(a[a.index("--out") + 1]) if "--out" in a else f"{HERE}/kerja")
