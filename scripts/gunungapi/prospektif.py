"""Catatan prospektif append-only arah abu skenario vs VONA PVMBG (B03) -> public/banjir/data/prospektif_abu.json. Pola scripts/gempa/susulan.py `prospektif`.

Tiap hari, untuk tiap gunung Level II ke atas di abu_gunungapi.json, dicatat SATU entri sebelum hasilnya diketahui:
  skenario.arah_deg  arah (derajat, ke mana awan bergerak) titik tengah sebaran partikel mentah (`jejak_tipis`) pada jam ke-6 skenario;
                     jam ke-6 = potret terdekat dengan jam penilaian uji balik (3 jam), ditetapkan sekarang dan tidak diubah.
  jendela            [angin.mulai, angin.mulai + 12 jam]: VONA yang diterbitkan di sini dan menulis arah awan ("moving to northeast") menilai entri.
Penilaian (sekali, entri tidak diubah lagi): VONA PERTAMA bergerah di jendela itu; selisih sudut <= 45 derajat = cocok (8 mata angin, resolusi 45 derajat;
pembanding acak 25%). Bila tak ada VONA beraraah (awan tak teramati atau tak ada erupsi) entri ditutup `n_vona: 0` dan TIDAK dihitung dalam metrik.
Bila VONA tak terjangkau atau daftar yang dibaca tak mencapai awal jendela, `dinilai` tetap null (slot kosong) dan `vona_terjangkau` false pada
catatan lari terakhir; ini bukan kegagalan model.
Batas: satu entri = satu gunung satu hari, jadi hari-hari berurutan di gunung yang sama berbagi angin dan musim (p binomial optimistis); skenario
mengandaikan erupsi pada awal jendela sedangkan VONA terbit pada jam erupsi sebenarnya, hingga 12 jam kemudian.
Pakai:  python3 scripts/gunungapi/prospektif.py        catat + nilai (jaringan MAGMA untuk penilaian)
        python3 scripts/gunungapi/prospektif.py uji    self-check
"""
import datetime as dt, json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import abu
from uji_abu import MATA, p_binomial, selisih

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
ABU = os.path.join(AKAR, "public/banjir/data/abu_gunungapi.json")
KELUAR = os.path.join(AKAR, "public/banjir/data/prospektif_abu.json")
VONA = "https://magma.esdm.go.id/v1/vona"
JAM_SKEN = 6        # potret jejak_tipis yang dicatat (ditetapkan di muka)
JENDELA_JAM = 12    # lebar jendela penilaian
HAL_MAKS = 12       # halaman daftar VONA (15 per halaman, terbaru dulu) paling banyak yang dibaca
MAKS_BYTE = 5_000_000
TIPS = 45
TELAT_JAM = 2       # entri yang dicatat lebih dari ini sesudah awal jendela ditolak: sebagian jendela sudah lewat dan hasilnya bisa diketahui


def _t(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def urai_vona(h):
    """Halaman daftar VONA -> [{gunung (slug), waktu (ISO Z), arah (mata angin) | None}]."""
    out = []
    for m in re.finditer(r'<small>(\d{4}-\d\d-\d\d \d\d:\d\d):\d\d UTC</small>.*?timeline-title"><a[^>]*>(.*?) - \d{8}/\d{4}Z</a>.*?timeline-text">(.*?)</p>', h, re.S):
        d = re.search(r"moving to ([a-z]+)", re.sub(r"\s+", " ", m.group(3)))
        out.append({"gunung": abu.id_gunung(re.sub(r"<[^>]+>", "", m.group(2)).strip()), "waktu": m.group(1).replace(" ", "T") + ":00Z",
                    "arah": d.group(1) if d and d.group(1) in MATA else None})
    return out


def baca_vona(awal, ambil=None):
    """Daftar VONA terbaru ke belakang sampai melewati `awal` (datetime). -> (kejadian, mencapai_awal: bool). Gagal jaringan: ([], False)."""
    ambil = ambil or (lambda p: abu.ambil_byte(VONA + (f"?page={p}" if p > 1 else ""), MAKS_BYTE).decode("utf-8", "replace"))
    ev = []
    for p in range(1, HAL_MAKS + 1):
        try:
            h = ambil(p)
        except Exception as e:
            print(f"  VONA halaman {p}: {e}", file=sys.stderr)
            return ev, False
        b = urai_vona(h)
        if not b:
            return ev, False
        ev += b
        if min(_t(x["waktu"]) for x in b) < awal:
            return ev, True
        time.sleep(.4)
    return ev, False


def entri_baru(g, abu_o, kini):
    """Satu entri untuk gunung g (isi abu_gunungapi.json), None bila potret skenario tidak ada."""
    pot = next((j for j in g.get("jejak_tipis", []) if j["jam"] == JAM_SKEN and j.get("arah_deg") is not None), None)
    if pot is None:
        return None
    mulai = g["angin"]["mulai"]
    if kini > _t(mulai) + dt.timedelta(hours=TELAT_JAM):
        return None   # terlambat: bukan prospektif murni
    return {"id": f"{g['id']}|{mulai[:10]}", "gunung": g["nama"], "gunung_id": g["id"], "level": g["level"], "dicatat": kini.strftime("%Y-%m-%dT%H:%MZ"),
            "skenario": {"arah_deg": pot["arah_deg"], "jam": JAM_SKEN, "kolom_m": g["kolom_m"], "kolom_sumber": g["kolom_sumber"], "model": abu_o["model"], "dibuat": abu_o["dibuat"]},
            "jendela": [mulai, (_t(mulai) + dt.timedelta(hours=JENDELA_JAM)).strftime("%Y-%m-%dT%H:%M:%SZ")], "dinilai": None}


def nilai(e, vona, mencapai, kini):
    """Hasil penilaian untuk entri e, atau None bila belum bisa (jendela belum lewat, atau daftar VONA tak mencapai awal jendela)."""
    a, b = (_t(x) for x in e["jendela"])
    if kini < b + dt.timedelta(hours=1) or not mencapai:
        return None
    di = sorted((v for v in vona if v["gunung"] == e["gunung_id"] and a <= _t(v["waktu"]) <= b and v["arah"]), key=lambda v: v["waktu"])
    pada = kini.strftime("%Y-%m-%dT%H:%MZ")
    if not di:
        return {"pada": pada, "n_vona": 0}
    v = di[0]
    sel = selisih(e["skenario"]["arah_deg"], MATA[v["arah"]])
    return {"pada": pada, "n_vona": len(di), "vona_waktu": v["waktu"], "arah_vona": v["arah"], "arah_vona_deg": MATA[v["arah"]], "selisih_deg": sel, "cocok": sel <= TIPS}


def ringkas(entri):
    s = [x["dinilai"] for x in entri if x["dinilai"] and x["dinilai"].get("n_vona") and not x.get("terlambat")]
    k = sum(1 for d in s if d["cocok"])
    return {"n": len(s), "cocok": k, "persen": round(100 * k / len(s)) if s else None, "acak_persen": 25, "p_binomial": float(f"{p_binomial(k, len(s)):.3g}") if s else None}


def gabung(lama, baru):
    """Tolak bila entri lama hilang atau skenarionya berubah, atau penilaian yang sudah ada berubah (append-only)."""
    bk = {x["id"]: x for x in baru["entri"]}
    for x in lama.get("entri", []):
        y = bk.get(x["id"])
        if y is None or y["skenario"] != x["skenario"] or y["jendela"] != x["jendela"] or (x.get("dinilai") and y.get("dinilai") != x["dinilai"]):
            raise ValueError(f"prospektif bukan append-only: entri {x['id']} hilang atau diubah")
    return baru


def jalan(kini=None, ambil=None, abu_o=None):
    kini = kini or dt.datetime.now(dt.timezone.utc)
    abu_o = abu_o or abu.baca(ABU, None)
    if not abu_o:
        raise SystemExit("abu_gunungapi.json belum ada")
    lama = abu.baca(KELUAR, {"entri": []})
    entri = [dict(x) for x in lama["entri"]]
    ada = {x["id"] for x in entri}
    for g in abu_o["gunung"]:
        e = entri_baru(g, abu_o, kini)
        if e and e["id"] not in ada:
            entri.append(e); ada.add(e["id"])
    tunda = [x for x in entri if x["dinilai"] is None and kini >= _t(x["jendela"][1]) + dt.timedelta(hours=1)]
    terjangkau = None
    if tunda:
        vona, mencapai = baca_vona(min(_t(x["jendela"][0]) for x in tunda), ambil)
        terjangkau = bool(vona)
        for x in tunda:
            x["dinilai"] = nilai(x, vona, mencapai, kini)
    baru = {"diperbarui": kini.strftime("%Y-%m-%dT%H:%MZ"), "vona_terjangkau": terjangkau, "dicatat": len(entri), "dinilai": sum(1 for x in entri if x["dinilai"]),
            "ringkasan": ringkas(entri), "jam_skenario": JAM_SKEN, "jendela_jam": JENDELA_JAM, "ambang_deg": TIPS,
            "catatan": "Append-only. Tiap hari tiap gunung Level II ke atas dicatat arah awan abu skenario (jam ke-6) sebelum hasilnya diketahui; dinilai sekali terhadap VONA PVMBG "
                       "pertama yang menulis arah awan dalam 12 jam sejak awal skenario. Entri tanpa VONA beraraah ditutup n_vona 0 dan tidak dihitung. Entri lama tidak pernah diubah atau dihapus.",
            "entri": entri}
    abu.simpan(KELUAR, gabung(lama, baru))
    print("prospektif abu:", baru["dicatat"], "dicatat,", baru["dinilai"], "dinilai, ringkasan", baru["ringkasan"], "VONA terjangkau" if terjangkau else "")
    return baru


def uji():
    h = ('<div><small>2026-10-19 11:48:00 UTC</small> <a>Orange</a><p class="timeline-title"><a href="#">Semeru - 20261019/1148Z</a></p><p class="timeline-text">Eruption at 1148 UTC. Ash-cloud is not observed.</p></div>'
         '<div><small>2026-10-19 06:33:00 UTC</small><p class="timeline-title"><a href="#">Lewotobi Laki-Laki - 20261019/0633Z</a></p><p class="timeline-text">Ash cloud moving to northeast. foo</p></div>')
    v = urai_vona(h)
    assert v == [{"gunung": "semeru", "waktu": "2026-10-19T11:48:00Z", "arah": None}, {"gunung": "lewotobi-laki-laki", "waktu": "2026-10-19T06:33:00Z", "arah": "northeast"}], v
    assert abu.id_gunung("Lewotobi Laki-laki") == "lewotobi-laki-laki"
    g = {"id": "semeru", "nama": "Semeru", "level": 3, "kolom_m": 2000, "kolom_sumber": "asumsi", "angin": {"mulai": "2026-10-18T19:00:00Z"},
         "jejak_tipis": [{"jam": 6, "arah_deg": 260}, {"jam": 12, "arah_deg": 270}]}
    ao = {"model": "m", "dibuat": "2026-10-19T02:43:33+07:00", "gunung": [g]}
    kini = dt.datetime(2026, 10, 18, 20, 0, tzinfo=dt.timezone.utc)
    e = entri_baru(g, ao, kini)
    assert entri_baru(g, ao, dt.datetime(2026, 10, 19, 13, 54, tzinfo=dt.timezone.utc)) is None   # dicatat 19 jam sesudah awal: ditolak
    assert ringkas([{"dinilai": {"n_vona": 1, "cocok": True}, "terlambat": True}])["n"] == 0
    assert e["id"] == "semeru|2026-10-18" and e["jendela"] == ["2026-10-18T19:00:00Z", "2026-10-19T07:00:00Z"] and e["dinilai"] is None and e["skenario"]["arah_deg"] == 260, e
    assert entri_baru({**g, "jejak_tipis": [{"jam": 12, "arah_deg": 1}]}, ao, kini) is None
    kemudian = dt.datetime(2026, 10, 19, 12, 0, tzinfo=dt.timezone.utc)
    assert nilai(e, [], True, kini) is None and nilai(e, [], False, kemudian) is None   # jendela belum lewat / daftar tak mencapai awal: slot kosong
    assert nilai(e, [], True, kemudian) == {"pada": "2026-10-19T12:00Z", "n_vona": 0}
    ev = [{"gunung": "semeru", "waktu": "2026-10-19T03:00:00Z", "arah": "west"}, {"gunung": "semeru", "waktu": "2026-10-19T09:00:00Z", "arah": "east"}, {"gunung": "ibu", "waktu": "2026-10-19T02:00:00Z", "arah": "west"}]
    r = nilai(e, ev, True, kemudian)
    assert r["n_vona"] == 1 and r["arah_vona"] == "west" and r["selisih_deg"] == 10 and r["cocok"] is True, r
    assert nilai(e, [dict(ev[0], arah="east")], True, kemudian)["cocok"] is False
    lama = {"entri": [{**e, "dinilai": r}]}
    gabung(lama, {"entri": [{**e, "dinilai": r}]})
    for rusak in ({"entri": []}, {"entri": [{**e, "dinilai": {**r, "cocok": False}}]}, {"entri": [{**e, "skenario": {**e["skenario"], "arah_deg": 1}, "dinilai": r}]}):
        try:
            gabung(lama, rusak); raise SystemExit("append-only dilanggar tanpa galat")
        except ValueError:
            pass
    assert ringkas([{"dinilai": r}, {"dinilai": {"n_vona": 0}}, {"dinilai": None}]) == {"n": 1, "cocok": 1, "persen": 100, "acak_persen": 25, "p_binomial": 0.25}
    # baca_vona: daftar yang tak mencapai awal jendela dilaporkan, tidak diam-diam dianggap lengkap
    hal = lambda p: h
    ev2, ok = baca_vona(dt.datetime(2026, 10, 19, 7, 0, tzinfo=dt.timezone.utc), hal)
    assert ok and len(ev2) == 2
    ev3, ok = baca_vona(dt.datetime(2020, 1, 1, tzinfo=dt.timezone.utc), lambda p: h)
    assert not ok and len(ev3) == 2 * HAL_MAKS
    assert baca_vona(kini, lambda p: 1 / 0) == ([], False)
    print("prospektif abu: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
