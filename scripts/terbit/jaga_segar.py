"""Penjaga sebelum `wrangler deploy`: tolak menerbitkan data karhutla yang basi.

Insiden 23 Okt 2026: udara.yml tidak menemukan cache `data-` (repo melewati batas 10 GB cache GitHub), lalu tetap deploy
memakai salinan public/data di git (tertanggal 12 Okt). Situs live mundur 11 hari tanpa satu pun galat. Setiap workflow yang
menerbitkan kini memanggil skrip ini dulu: bila data yang akan terbit lebih tua dari BATAS_JAM, deploy dibatalkan dengan galat.

Diperiksa: public/data/meta.json `dibuat` dan public/data/hotspot.json `acuan`; keduanya harus ada dan segar, DAN `dibuat` tidak
boleh lebih tua dari yang sedang tayang (LIVE/data/meta.json): data di situs tidak pernah mundur. Situs tidak terjangkau =
pemeriksaan tayang dilewati dengan peringatan (pemulihan situs yang mati tidak boleh terhalang).
Darurat (mis. FIRMS mati berhari-hari dan tampilan harus tetap terbit): set env PAKSA_TERBIT=1 pada jalan manual.

Pakai:  python3 scripts/terbit/jaga_segar.py        # keluar 1 bila basi
        python3 scripts/terbit/jaga_segar.py uji    # self-check
"""
import datetime as dt, json, os, sys, urllib.request

AKAR = os.path.join(os.path.dirname(__file__), "../..")
BATAS_JAM = 36   # titik.yml tiap 3 jam, data.yml harian: lebih dari 36 jam = rantai data putus, bukan keterlambatan biasa
LIVE = os.environ.get("LIVE_URL", "https://centurisk97.terasurbannetwork.workers.dev")


def tayang(live=LIVE):
    """meta.json `dibuat` yang sedang tayang, atau None bila situs tidak terjangkau."""
    try:
        req = urllib.request.Request(f"{live}/data/meta.json?cek={int(dt.datetime.now().timestamp())}", headers={"User-Agent": "poskokarhutla-ci/jaga"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return waktu(json.load(r)["dibuat"])
    except Exception as e:  # noqa: BLE001
        print(f"::warning title=Pemeriksaan tayang dilewati::meta.json live tidak terbaca ({type(e).__name__})")
        return None


def waktu(s):
    t = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
    return t if t.tzinfo else t.replace(tzinfo=dt.timezone.utc)


def periksa(akar=AKAR, kini=None, live_dibuat=None):
    """-> daftar masalah (kosong = segar). live_dibuat = meta.json `dibuat` yang sedang tayang (None = tidak dibandingkan)."""
    kini = kini or dt.datetime.now(dt.timezone.utc)
    masalah = []
    for berkas, kunci in (("public/data/meta.json", "dibuat"), ("public/data/hotspot.json", "acuan")):
        jalur = os.path.join(akar, berkas)
        try:
            t = waktu(json.load(open(jalur))[kunci])
        except (OSError, ValueError, KeyError, TypeError) as e:
            masalah.append(f"{berkas}: tidak terbaca ({type(e).__name__})")
            continue
        umur = (kini - t).total_seconds() / 3600
        if umur > BATAS_JAM:
            masalah.append(f"{berkas} `{kunci}` = {t.isoformat()} ({umur:.0f} jam lalu, batas {BATAS_JAM} jam)")
        if kunci == "dibuat" and live_dibuat and t < live_dibuat:
            masalah.append(f"{berkas} `dibuat` {t.isoformat()} lebih tua dari yang sedang tayang ({live_dibuat.isoformat()}): data situs akan mundur")
    return masalah


def uji():
    import tempfile
    d = tempfile.mkdtemp()
    os.makedirs(os.path.join(d, "public/data"))
    kini = dt.datetime(2026, 10, 23, 9, tzinfo=dt.timezone.utc)
    tulis = lambda m, h: (json.dump({"dibuat": m}, open(os.path.join(d, "public/data/meta.json"), "w")),
                          json.dump({"acuan": h}, open(os.path.join(d, "public/data/hotspot.json"), "w")))
    tulis("2026-10-23T04:00+07:00", "2026-10-22T19:00:00+00:00")
    assert periksa(d, kini) == [], periksa(d, kini)
    tulis("2026-10-12T21:45+07:00", "2026-10-12T12:27:00+00:00")   # keadaan insiden 23 Okt: HARUS ditolak
    assert len(periksa(d, kini)) == 2, periksa(d, kini)
    os.remove(os.path.join(d, "public/data/hotspot.json"))
    assert any("tidak terbaca" in m for m in periksa(d, kini)), "berkas hilang harus ditolak, bukan dilewati"
    # monoton: segar (< 36 jam) tetapi lebih tua dari yang tayang = DITOLAK; sama atau lebih baru = boleh
    tulis("2026-10-23T10:00+07:00", "2026-10-23T02:00:00+00:00")
    assert any("akan mundur" in m for m in periksa(d, kini, waktu("2026-10-23T13:00+07:00")))
    assert periksa(d, kini, waktu("2026-10-23T10:00+07:00")) == [] and periksa(d, kini, None) == []
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
        sys.exit(0)
    m = periksa(live_dibuat=tayang())
    if m and os.environ.get("PAKSA_TERBIT") != "1":
        for x in m:
            print(f"::error title=Data basi, deploy dibatalkan::{x}")
        print("Data karhutla yang akan terbit basi atau hilang; deploy dibatalkan supaya situs live tidak mundur. "
              "Jalankan titik.yml/data.yml dulu, atau PAKSA_TERBIT=1 bila memang darurat.", file=sys.stderr)
        sys.exit(1)
    print("data segar" if not m else "PAKSA_TERBIT=1: deploy walau basi: " + "; ".join(m))
