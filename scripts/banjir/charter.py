"""Aktivasi International Charter Space and Major Disasters -> public/banjir/data/charter.json (INDEKS, bukan model)

Sumber: https://disasterscharter.org/activations (halaman Next.js; seluruh daftar tertanam di payload RSC halaman itu, 1.050 aktivasi
per 29 Okt 2026: activationId, judul, waktu aktivasi, titik pusat, negara, jenis bencana). Tanpa kunci, 1 permintaan GET.
STAC supervisor.disasterscharter.org/api/activations hanya memuat 171 aktivasi bertanda produk, jadi tidak dipakai.
Syarat pakai: situs publik Charter; ringkasan angka dengan atribusi. Tidak ada tanggal kejadian di sumber, hanya tanggal aktivasi.

Olahan
  per_tahun / per_jenis      hitungan aktivasi dunia dan Indonesia
  indonesia                  daftar aktivasi (id, tanggal, judul, jenis, titik, kabupaten dari titik pusat)
  latensi                    aktivasi - tanggal kejadian terdekat sebelumnya di DIBI (kabupaten sama, jenis sama, jendela 0..30 hari),
                             hanya bila berkas DIBI ada dan aktivasi jatuh di masa cakupan DIBI; median, kuartil, n
  indeks_kabupaten           jumlah aktivasi dengan titik pusat di kabupaten itu (indeks keterpaparan skala-Charter, bukan peluang)
Model P(skala Charter | korban awal, bahaya): label = aktivasi Indonesia yang punya tanggal kejadian DIBI cocok. Aturan rencana
(RENCANA-PANEN-DATA.md baris 15): label < 30 -> ditulis indeks. `label_model` di keluaran memuat n label dan keputusan; kode TIDAK
melatih logistik bila n < 30 (swa-uji memeriksa percabangan itu).

Pakai:  python3 scripts/banjir/charter.py          ambil, olah, tulis
        python3 scripts/banjir/charter.py uji
Env MCDWD_DIBI = jalur dibi_tanggal.json (bawaan data/raw/banjir/dibi_tanggal.json; berkas ini hanya ada di cache lokal/Actions).
"""
import datetime as dt, json, os, re, statistics, sys, urllib.request
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, WIB, baca, simpan

URL = "https://disasterscharter.org/activations"
UA = "poskobanjir/1.0 (Pantau Bencana; +https://centurisk97.id)"
BERKAS = os.path.join(KELUAR, "charter.json")
MIN_LABEL = 30
OBJ = re.compile(r'\{"activationId":"(\d+)".*?"disasterTypes":\[[^\]]*\]\}')
ATRIBUSI = "International Charter Space and Major Disasters, daftar aktivasi publik (disasterscharter.org); ringkasan oleh Pantau Bencana"
JENIS_DIBI = {"Flood": {"banjir", "bandang", "rob"}, "Landslide": {"longsor"}, "Storm": {"cuaca", "gelombang"}}  # DIBI lokal tak memuat gempa/letusan


def ambil():
    req = urllib.request.Request(URL, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read().decode("utf8", "replace")


def urai(html):
    """Payload RSC (string ber-escape) -> daftar aktivasi. Menolak bila jumlah tidak cocok dengan totalFilteredActivations."""
    h = html.replace('\\"', '"').replace("\\u0026", "&")
    out, lihat = [], set()
    for m in OBJ.finditer(h):
        try:
            o = json.loads(m.group(0))
        except Exception:
            continue
        if o["activationId"] in lihat:
            continue
        lihat.add(o["activationId"])
        out.append({"id": int(o["activationId"]), "tgl": dt.datetime.fromtimestamp(o["dateAsTimestamp"] / 1000, dt.timezone.utc).date().isoformat(),
                    "judul": o["title"], "negara": o["country"], "jenis": o["disasterTypes"],
                    "lat": float(o["centerPointLatitude"]), "lon": float(o["centerPointLongitude"]), "status": o["activationStatus"]})
    tot = re.search(r'"totalFilteredActivations":(\d+)', h)
    if tot and abs(len(out) - int(tot.group(1))) > 5:
        raise RuntimeError(f"Charter: terurai {len(out)} aktivasi, halaman menyatakan {tot.group(1)}")
    if len(out) < 500:
        raise RuntimeError(f"Charter: hanya {len(out)} aktivasi terurai, format halaman berubah?")
    return sorted(out, key=lambda a: a["id"])


def latensi(aktivasi, dibi):
    """Aktivasi Indonesia ber-kab + baris DIBI [[jenis], prov, kab, tanggal, n] -> daftar (id, hari). Hanya jenis yang punya padanan DIBI."""
    per = defaultdict(list)
    for jenis, p, kab, tgl, n in dibi:
        if n >= 1:
            for j in jenis:
                per[f"{p}|{kab}", j].append(dt.date.fromisoformat(tgl))
    awal = min(d for v in per.values() for d in v)
    out = []
    for a in aktivasi:
        d0 = dt.date.fromisoformat(a["tgl"])
        if not a.get("kab") or d0 < awal + dt.timedelta(days=30):
            continue
        cocok = []
        for j in a["jenis"]:
            for kunci in JENIS_DIBI.get(j, ()):
                cocok += [d for d in per.get((a["kab"], kunci), []) if 0 <= (d0 - d).days <= 30]
        if cocok:
            out.append((a["id"], (d0 - max(cocok)).days))
    return out


def kuartil(xs):
    xs = sorted(xs)
    q = lambda p: xs[int(p * (len(xs) - 1))]
    return {"q1": q(.25), "median": q(.5), "q3": q(.75)}


def ringkas(aktivasi, dibi=None, wil=None):
    idn = [a for a in aktivasi if a["negara"].upper() == "INDONESIA"]
    if wil is not None:
        for a in idn:
            c = wil.cari(a["lon"], a["lat"])
            a["kab"] = f"{c[0]}|{c[1]}" if c else None
    out = {"total": len(aktivasi), "total_indonesia": len(idn),
           "per_tahun": dict(sorted(Counter(a["tgl"][:4] for a in aktivasi).items())),
           "per_tahun_indonesia": dict(sorted(Counter(a["tgl"][:4] for a in idn).items())),
           "per_jenis_indonesia": dict(Counter(j for a in idn for j in a["jenis"]).most_common()),
           "indonesia": [{k: a.get(k) for k in ("id", "tgl", "judul", "jenis", "lat", "lon", "kab")} for a in idn],
           "indeks_kabupaten": dict(Counter(a["kab"] for a in idn if a.get("kab")).most_common())}
    lat = latensi(idn, dibi) if dibi else []
    out["latensi"] = ({"n": len(lat), "hari": kuartil([h for _, h in lat]), "definisi": "tanggal aktivasi - tanggal terakhir kejadian DIBI sejenis di kabupaten yang sama dalam 30 hari sebelumnya"}
                      if len(lat) >= 5 else {"n": len(lat), "catatan": "kurang dari 5 pasangan atau DIBI tak tersedia; tidak dilaporkan"})
    n_label = len(lat)
    out["label_model"] = {"n_label": n_label, "ambang": MIN_LABEL,
                          "keputusan": "indeks" if n_label < MIN_LABEL else "model logistik layak dicoba",
                          "alasan": f"{n_label} aktivasi Indonesia punya tanggal kejadian DIBI cocok; label model butuh >= {MIN_LABEL}. Total aktivasi Indonesia {len(idn)} sejak "
                                    f"{idn[0]['tgl'] if idn else '-'}, tetapi DIBI lokal (dibi_tanggal.json, 2008+) hanya memuat jenis hidrometeorologi (banjir, bandang, longsor, cuaca, rob, gelombang, kering) dan tanpa korban per kejadian: "
                                    "fitur 'korban awal' tidak tersedia, gempa/letusan tanpa padanan."}
    return out


def main():
    html = ambil()
    akt = urai(html)
    from wilayah import Wilayah
    p = os.environ.get("MCDWD_DIBI", os.path.join(MENTAH, "dibi_tanggal.json"))
    dibi = baca(p)
    isi = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="seconds"), "sumber": URL, "atribusi": ATRIBUSI,
           "lisensi": "daftar publik Charter; sebutkan sumber", **ringkas(akt, dibi, Wilayah())}
    simpan(BERKAS, isi)
    print(json.dumps({k: isi[k] for k in ("total", "total_indonesia", "per_jenis_indonesia", "latensi", "label_model")}, ensure_ascii=False, indent=1))


def uji():
    contoh = ('x \\"totalFilteredActivations\\":3 y {\\"activationId\\":\\"2\\",\\"activationStatus\\":\\"closed\\",\\"title\\":\\"Flood in Indonesia\\",'
              '\\"dateAsTimestamp\\":1733788800000,\\"centerPointLatitude\\":\\"-6.2\\",\\"centerPointLongitude\\":\\"106.8\\",\\"country\\":\\"INDONESIA\\",'
              '\\"slug\\":\\"a\\",\\"disasterTypes\\":[\\"Flood\\"]},{\\"activationId\\":\\"1\\",\\"activationStatus\\":\\"closed\\",\\"title\\":\\"Fire\\",'
              '\\"dateAsTimestamp\\":1000000000000,\\"centerPointLatitude\\":\\"1\\",\\"centerPointLongitude\\":\\"2\\",\\"country\\":\\"CANADA\\",\\"slug\\":\\"b\\",'
              '\\"disasterTypes\\":[\\"Fire\\"]}')
    try:
        urai(contoh)
        assert False, "harus menolak daftar < 500"
    except RuntimeError:
        pass
    # percabangan keputusan dan latensi
    akt = [{"id": i, "tgl": "2020-02-%02d" % (i + 1), "judul": "Flood", "negara": "INDONESIA", "jenis": ["Flood"], "lat": 0, "lon": 0, "kab": "31|Jakarta Pusat"} for i in range(6)]
    dibi = [[["banjir"], "31", "Jakarta Pusat", "2020-01-%02d" % (i + 1), 1] for i in range(30)]
    dibi += [[["banjir"], "31", "Jakarta Pusat", "2020-02-%02d" % d, 1] for d in range(1, 5)]
    r = ringkas(akt, dibi)
    assert r["total_indonesia"] == 6 and r["label_model"]["n_label"] == 6 and r["label_model"]["keputusan"] == "indeks"
    assert r["latensi"]["n"] == 6 and r["latensi"]["hari"]["median"] == 0 and r["latensi"]["hari"]["q3"] == 0, r["latensi"]
    assert r["indeks_kabupaten"] == {"31|Jakarta Pusat": 6}
    assert ringkas(akt, None)["latensi"]["n"] == 0
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
