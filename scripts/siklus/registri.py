"""Registri sumber Siklus: validasi sumber.json (pemilik, pemakai, jadwal, lisensi, jeda, anggaran).

Cermin gerbang-peta-data: sumber tanpa pemilik, pemakai, atau jadwal ditolak.
Pakai: python3 -I scripts/siklus/registri.py periksa | uji
"""
import json, os, sys

AB = os.path.dirname(os.path.abspath(__file__))
BERKAS = os.path.join(AB, "sumber.json")
STATUS = {"hidup", "bersyarat", "gagal"}
WAJIB = ("id", "nama", "url", "lisensi", "atribusi", "jadwal", "job", "pemilik", "pemakai", "status", "uji")
JEDA_MIN = 2


def muat(jalur=BERKAS):
    with open(jalur, encoding="utf-8") as f:
        return json.load(f)


def periksa(d):
    """-> daftar masalah (kosong = sah)."""
    m = []
    sumber = d.get("sumber")
    if not isinstance(sumber, list) or not sumber:
        return ["sumber kosong atau bukan daftar"]
    ids = set()
    for x in sumber:
        i = x.get("id", "?")
        if i in ids:
            m.append(f"{i}: id ganda")
        ids.add(i)
        for k in WAJIB:
            if not str(x.get(k, "")).strip():
                m.append(f"{i}: {k} kosong")
        if x.get("status") not in STATUS:
            m.append(f"{i}: status {x.get('status')!r} bukan salah satu {sorted(STATUS)}")
        j = x.get("jeda")
        if not isinstance(j, (int, float)) or isinstance(j, bool) or j < JEDA_MIN:
            m.append(f"{i}: jeda harus angka >= {JEDA_MIN} detik")
        if not x.get("fitur"):
            m.append(f"{i}: fitur kosong")
    a = d.get("anggaran") or {}
    plafon, lapis = a.get("plafon_byte"), a.get("lapis") or {}
    if not isinstance(plafon, int) or not lapis:
        m.append("anggaran: plafon_byte atau lapis hilang")
    else:
        angka = [v for v in lapis.values() if isinstance(v, int)]
        if len(angka) != len(lapis) or sum(angka) > plafon:
            m.append("anggaran: lapis harus bilangan bulat dan jumlahnya tidak melampaui plafon")
    return m


def diambil(d):
    """Sumber yang boleh dipanen: gagal tidak pernah diambil."""
    return [x for x in d["sumber"] if x["status"] != "gagal"]


def _uji():
    d = muat()
    assert periksa(d) == [], periksa(d)
    assert len(d["sumber"]) == 43 and len(diambil(d)) == 38
    assert all(x["status"] != "gagal" for x in diambil(d))

    def salah(ubah, kata):
        c = json.loads(json.dumps(d))
        ubah(c)
        m = periksa(c)
        assert any(kata in s for s in m), (kata, m)

    salah(lambda c: c["sumber"][0].pop("pemakai"), "pemakai kosong")
    salah(lambda c: c["sumber"][0].update(pemilik=" "), "pemilik kosong")
    salah(lambda c: c["sumber"][0].update(jadwal=""), "jadwal kosong")
    salah(lambda c: c["sumber"][0].update(lisensi=""), "lisensi kosong")
    salah(lambda c: c["sumber"][0].update(jeda=1), "jeda harus")
    salah(lambda c: c["sumber"][0].update(status="ngawur"), "status")
    salah(lambda c: c["sumber"].append(dict(c["sumber"][0])), "id ganda")
    salah(lambda c: c["anggaran"]["lapis"].update(saji=4000000000), "melampaui plafon")
    salah(lambda c: c.update(sumber=[]), "kosong")
    print("registri: uji hijau")


if __name__ == "__main__":
    aksi = sys.argv[1] if len(sys.argv) > 1 else ""
    if aksi == "uji":
        _uji()
    elif aksi == "periksa":
        m = periksa(muat())
        print("\n".join(m) or "registri sah")
        sys.exit(1 if m else 0)
    else:
        sys.exit("pakai: registri.py periksa | uji")
