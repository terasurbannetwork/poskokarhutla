"""public/data/ringkasan.json: muatan ringan tab Ringkasan, supaya halaman awal tidak mengunduh berita.json (± 1,7 MB gzip),
penerbangan.json, dan musim_awal.json utuh. Hanya bagian yang dibaca ringkasan.js:

- berita: harian (semua hari), artikel 7 hari terakhir (kolom yang dipakai olahBerita), sorotan pertama
- penerbangan: dibuat + kejadian 15 hari terakhir (tgl, bandara)
- titik_hari: titik panas per 24 jam mundur dari acuan (garis kecil KPI; salinan hariTitik() ringkasan.js), supaya
  Ringkasan tidak perlu hotspot.json 7 hari (± 2 MB gzip)
- musim_awal: ambang per provinsi untuk hari-dalam-tahun data +-1 (ringkasan.js membaca ambang[doy]; objek bekerja sama)

Berkas sumber yang hilang dilewati; ringkasan.js jatuh ke berkas aslinya bila kuncinya tidak ada.
Pakai:  python3 scripts/data/ringkasan.py  |  ... uji
"""
import datetime as dt, json, math, os, re, sys

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "data")
KOLOM_ARTIKEL = ("judul", "tgl", "asal", "domain", "sumber", "kab", "prov", "cerita")
# url (tautan Google News ± 300 byte, 80 % isi berkas) hanya untuk judul yang bisa tampil sebagai contoh: salinan DESAK & KLAIM di
# ringkasan.js olahBerita(). Regex di sana berubah tanpa ini -> contoh baru tampil tanpa tautan (bukan galat).
TAMPIL = re.compile(r"\b(desak|mendesak|minta|meminta|tuntut|menuntut|harap|berharap|perlu|butuh|imbau|mengimbau|usul|mengusulkan)\b"
                    r"|\b((sudah|telah|berhasil) (padam|dipadamkan|terkendali|dikendalikan)|api (sudah )?padam|padam total|padam seluruhnya"
                    r"|terkendali sepenuhnya|nihil titik|bebas (asap|titik)|tidak ada (lagi )?titik( panas| api)?|sudah aman)\b", re.I)


def baca(nama):
    j = os.path.join(DATA, nama)
    return json.load(open(j)) if os.path.exists(j) else None


def ringan_berita(B):
    hari = sorted(B["harian"])
    t7 = hari[-7:][0] if hari else ""
    def slim(a):
        o = {k: a.get(k) for k in KOLOM_ARTIKEL}
        if TAMPIL.search(a.get("judul") or ""): o["url"] = a.get("url_asli") or a.get("url")
        return o
    return {"dibuat": B.get("dibuat"), "harian": {t: B["harian"][t] for t in hari[-14:]},   # olahBerita membaca <= 14 hari
            "sorotan_nas": (B.get("sorotan_nas") or [])[:1], "sorotan": (B.get("sorotan") or [])[:1],
            "artikel": [slim(a) for a in B["artikel"] if a["tgl"][:10] >= t7]}


def ringan_penerbangan(P, hari):
    batas = (hari - dt.timedelta(days=15)).isoformat()
    return {"dibuat": P.get("dibuat"), "kejadian": [{"tgl": x["tgl"], "bandara": x.get("bandara")} for x in P.get("kejadian", []) if x["tgl"] > batas]}


def titik_hari(hs, provinsi):
    """= ringkasan.js hariTitik(): sensor utama, provinsi pantauan, laci 24 jam mundur dari acuan, paling lama 14 hari"""
    per, jmin, utama = {}, 0, set(hs["sensor_utama"])
    for b in hs["baris"]:
        jmin = min(jmin, b[2])
        if hs["wilayah"][b[6]].split("|")[0] not in provinsi or b[3] not in utama:
            continue
        i = max(0, math.ceil(-b[2] / 24) - 1)
        per[i] = per.get(i, 0) + 1
    n = min(14, math.floor(-jmin / 24))
    return {"acuan": hs["acuan"], "v": [per.get(n - 1 - i, 0) for i in range(n)]}


def ringan_musim(M, hari):
    doy = hari.timetuple().tm_yday - 1
    hs = [d for d in (doy - 1, doy, doy + 1) if d >= 0]
    return {"prov": {k: {"ambang": {str(d): v["ambang"][d] for d in hs if d < len(v.get("ambang") or [])}} for k, v in M.get("prov", {}).items()}}


def main():
    meta = baca("meta.json")
    hari = dt.date.fromisoformat(meta["hari_wib"]) if meta else dt.date.today()
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"), "hari_wib": hari.isoformat()}
    B, P, M = baca("berita.json"), baca("penerbangan.json"), baca("musim_awal.json")
    if B: out["berita"] = ringan_berita(B)
    if P: out["penerbangan"] = ringan_penerbangan(P, hari)
    if M: out["musim_awal"] = ringan_musim(M, hari)
    hs = baca("hotspot.json")
    if hs and meta: out["titik_hari"] = titik_hari(hs, meta["provinsi"])
    with open(os.path.join(DATA, "ringkasan.json"), "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("ringkasan.json:", sorted(out), os.path.getsize(os.path.join(DATA, "ringkasan.json")), "byte")


def uji():
    B = {"harian": {f"2026-10-{d:02d}": {"n": d} for d in range(1, 11)}, "sorotan": [1, 2],
         "artikel": [{"tgl": "2026-10-03T01:00", "judul": "lama"}, {"tgl": "2026-10-04T01:00", "judul": "baru", "isi": "x", "url": "u"},
                    {"tgl": "2026-10-05T01:00", "judul": "Warga mendesak status darurat", "url": "g", "url_asli": "a"}]}
    r = ringan_berita(B)
    assert [a["judul"] for a in r["artikel"]][:1] == ["baru"] and "isi" not in r["artikel"][0] and r["sorotan"] == [1], r
    assert "url" not in r["artikel"][0] and r["artikel"][1]["url"] == "a", r["artikel"]
    assert len(r["harian"]) == 10
    m = ringan_musim({"prov": {"14": {"ambang": list(range(366))}}}, dt.date(2026, 1, 2))
    assert m == {"prov": {"14": {"ambang": {"0": 0, "1": 1, "2": 2}}}}, m
    p = ringan_penerbangan({"kejadian": [{"tgl": "2026-09-01", "bandara": "A"}, {"tgl": "2026-10-10", "bandara": "B", "x": 1}]}, dt.date(2026, 10, 14))
    assert p["kejadian"] == [{"tgl": "2026-10-10", "bandara": "B"}], p
    hs = {"acuan": "A", "sensor_utama": ["N"], "wilayah": ["14|x|y", "99|x|y"],
          "baris": [[0, 0, -1, "N", 0, 0, 0, ""], [0, 0, -25, "N", 0, 0, 0, ""], [0, 0, -30, "M", 0, 0, 0, ""], [0, 0, -2, "N", 0, 0, 1, ""], [0, 0, -72, "N", 0, 0, 0, ""]]}
    assert titik_hari(hs, {"14": "Riau"}) == {"acuan": "A", "v": [1, 1, 1]}, titik_hari(hs, {"14": "Riau"})
    print("ringkasan uji: lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
