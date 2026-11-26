"""MB-7 Penerima dokumen: usulan baris ber-id stabil dan keputusan staf (DESAIN-TEKNIS sec 4.7; tiket RU-034).

Pustaka murni, bukan langkah jalan.py. Sistem pemakai (PSPB-1, KS-1, ...) menyusun usulan lewat usulan(); gabung() menempelkan
keputusan staf dari tabel D1 unit_ketuk (migrasi 0187; rute GET/POST /api/unit/ketuk).

  usulan_id(jenis, url, kunci)           sha1(jenis + url + kunci)[:16], stabil antarjalan
  usulan(jenis, baris, sumber)           baris = [{kunci, url, isi, label, keyakinan, sumber_nama}] -> baris usulan skema DT 4.7
  gabung(baris_usulan, keputusan)        -> {baris: [... status, masuk_angka, pil], yatim, hitung}; keputusan terbaru per usulan_id menang
  baca_keputusan(berkas, jalankan)       satu `wrangler d1 execute` (jalankan bisa ditukar saat uji); tanpa D1 -> galat jelas, bukan []

Status: menunggu | diterima | ditolak | dikoreksi. Koreksi menimpa HANYA medan yang dikoreksi dan sudah ada di isi.
Angka: usulan tanpa keputusan tidak masuk angka, kecuali label 'resmi' DAN keyakinan 'pola_tetap' (tampil berpil "belum dikonfirmasi").
Usulan ditolak tidak pernah masuk angka. Keputusan yang usulannya sudah tidak ada dihitung `yatim` (bukan dibuang diam-diam).

  python3 -I scripts/bnpb/unit/terima.py --cek
"""
import hashlib
import json
import re
import subprocess
import sys

KEYAKINAN = ("pola_tetap", "pola_longgar")
LABEL = ("resmi", "sekunder", "hitungan_kita", "proksi")
KEPUTUSAN_KE_STATUS = {"terima": "diterima", "tolak": "ditolak", "koreksi": "dikoreksi"}
PIL_BELUM = "belum dikonfirmasi"
RE_ID = re.compile(r"^[0-9a-f]{16}$")
RE_BERKAS = re.compile(r"^usulan_[a-z0-9_]{1,32}$")
DB = "poskowarga"


def usulan_id(jenis, url, kunci):
    return hashlib.sha1(f"{jenis}{url or ''}{kunci}".encode()).hexdigest()[:16]


def usulan(jenis, baris, sumber_jenis="jdih"):
    out, lihat = [], set()
    for b in baris:
        if b.get("label") not in LABEL or b.get("keyakinan") not in KEYAKINAN:
            raise ValueError(f"usulan {b.get('kunci')!r}: label {b.get('label')!r} atau keyakinan {b.get('keyakinan')!r} tidak sah")
        if not isinstance(b.get("isi"), dict) or not str(b.get("kunci", "")).strip():
            raise ValueError("usulan tanpa kunci baris atau isi bukan objek")
        i = usulan_id(jenis, b.get("url"), b["kunci"])
        if i in lihat:
            raise ValueError(f"id usulan kembar untuk kunci {b['kunci']!r}")
        lihat.add(i)
        out.append({"id": i, "sumber": {"jenis": sumber_jenis, "nama": str(b.get("sumber_nama") or "")[:200], "url": b.get("url")},
                    "label": b["label"], "isi": b["isi"], "keyakinan": b["keyakinan"], "keputusan": "menunggu"})
    return {"berkas": jenis, "baris": out}


def _terbaru(keputusan):
    """{usulan_id: keputusan terbaru}; urutan masukan = urutan waktu naik (SELECT ... ORDER BY waktu), seri waktu: yang terakhir menang."""
    t = {}
    for k in keputusan:
        if k.get("keputusan") not in KEPUTUSAN_KE_STATUS:
            raise ValueError(f"keputusan {k.get('keputusan')!r} bukan terima, tolak, atau koreksi")
        if not RE_ID.match(str(k.get("usulan_id", ""))):
            raise ValueError(f"usulan_id {k.get('usulan_id')!r} bukan 16 heks")
        t[k["usulan_id"]] = k
    return t


def _koreksi(k):
    c = k.get("koreksi")
    if isinstance(c, str):
        c = json.loads(c)
    if k["keputusan"] == "koreksi" and (not isinstance(c, dict) or not c):
        raise ValueError(f"keputusan koreksi {k['usulan_id']} tanpa isi koreksi")
    return c if isinstance(c, dict) else {}


def gabung(baris_usulan, keputusan):
    t = _terbaru(keputusan)
    ada = {b["id"] for b in baris_usulan}
    out = []
    for b in baris_usulan:
        k = t.get(b["id"])
        isi = dict(b["isi"])
        if k is None:
            status = "menunggu"
            resmi_tetap = b["label"] == "resmi" and b["keyakinan"] == "pola_tetap"
            masuk, pil = resmi_tetap, (PIL_BELUM if resmi_tetap else None)
        else:
            status = KEPUTUSAN_KE_STATUS[k["keputusan"]]
            if status == "dikoreksi":
                isi.update({m: v for m, v in _koreksi(k).items() if m in isi})   # hanya medan yang sudah ada di usulan
            masuk, pil = status != "ditolak", None
        out.append({**b, "isi": isi, "status": status, "masuk_angka": masuk, "pil": pil, "keputusan_waktu": k.get("waktu") if k else None})
    hitung = {s: sum(x["status"] == s for x in out) for s in ("menunggu", "diterima", "ditolak", "dikoreksi")}
    return {"baris": out, "yatim": sum(i not in ada for i in t), "hitung": hitung}


def _wrangler(sql):
    r = subprocess.run(["npx", "wrangler", "d1", "execute", DB, "--remote", "--json", "--command", sql], capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        raise RuntimeError(f"wrangler d1 execute gagal ({r.returncode}): {' '.join(r.stderr.split())[:200]}")
    return r.stdout


def baca_keputusan(berkas, jalankan=_wrangler):
    """Keputusan satu berkas, urut waktu naik. Gagal = RuntimeError (pemanggil memutuskan; jangan menganggap 'tak ada keputusan')."""
    if not RE_BERKAS.fullmatch(berkas):   # fullmatch: "$" saja menerima newline di akhir
        raise ValueError(f"berkas {berkas!r} bukan usulan_*")
    d = json.loads(jalankan(f"SELECT usulan_id, keputusan, koreksi, waktu FROM unit_ketuk WHERE berkas = '{berkas}' AND dummy = 0 ORDER BY waktu, id"))
    if not isinstance(d, list) or not d or d[0].get("success") is not True:
        raise RuntimeError("balasan wrangler d1 tak dikenal")
    return d[0].get("results") or []


def cek():
    # id stabil antarjalan dan sama dengan rumus DT 4.7
    assert usulan_id("rpbd", "https://x/a", "1101") == usulan_id("rpbd", "https://x/a", "1101")
    assert usulan_id("rpbd", "https://x/a", "1101") == hashlib.sha1(b"rpbdhttps://x/a1101").hexdigest()[:16]
    assert usulan_id("rpbd", None, "1101") != usulan_id("rpbd", "https://x/a", "1101") and len(usulan_id("a", "b", "c")) == 16
    b = lambda k, lab="sekunder", ky="pola_longgar", **isi: {"kunci": k, "url": "https://x/" + k, "isi": {"a": 1, "status": "berlaku", **isi}, "label": lab, "keyakinan": ky, "sumber_nama": "dok " + k}
    u = usulan("rpbd", [b("1"), b("2"), b("3"), b("4", "resmi", "pola_tetap"), b("5", "resmi", "pola_longgar")])
    ids = [x["id"] for x in u["baris"]]
    assert len(set(ids)) == 5 and all(RE_ID.match(i) for i in ids) and u["baris"][0]["keputusan"] == "menunggu"
    assert [x["id"] for x in usulan("rpbd", [b("1"), b("2"), b("3"), b("4", "resmi", "pola_tetap"), b("5", "resmi", "pola_longgar")])["baris"]] == ids  # antarjalan
    for salah in ({**b("9"), "label": "karangan"}, {**b("9"), "keyakinan": "yakin"}, {**b("9"), "isi": []}, {**b("9"), "kunci": " "}):
        try:
            usulan("rpbd", [salah]); raise AssertionError("usulan salah tidak ditolak")
        except ValueError:
            pass
    try:
        usulan("rpbd", [b("1"), b("1")]); raise AssertionError("id kembar tidak ditolak")
    except ValueError:
        pass
    # tanpa keputusan: menunggu; hanya resmi + pola_tetap masuk angka dan berpil
    g = gabung(u["baris"], [])
    s = {x["id"]: x for x in g["baris"]}
    assert all(x["status"] == "menunggu" for x in g["baris"]) and g["hitung"]["menunggu"] == 5
    assert [x["masuk_angka"] for x in g["baris"]] == [False, False, False, True, False]
    assert s[ids[3]]["pil"] == PIL_BELUM and s[ids[0]]["pil"] is None
    # terima, tolak, koreksi; koreksi hanya menimpa medan yang dikoreksi dan yang sudah ada
    kep = [{"usulan_id": ids[0], "keputusan": "terima", "koreksi": None, "waktu": 1},
           {"usulan_id": ids[1], "keputusan": "tolak", "koreksi": None, "waktu": 2},
           {"usulan_id": ids[2], "keputusan": "koreksi", "koreksi": json.dumps({"status": "habis", "liar": "x"}), "waktu": 3},
           {"usulan_id": ids[3], "keputusan": "tolak", "koreksi": None, "waktu": 4}]
    g = gabung(u["baris"], kep)
    s = {x["id"]: x for x in g["baris"]}
    assert [s[i]["status"] for i in ids[:4]] == ["diterima", "ditolak", "dikoreksi", "ditolak"] and s[ids[4]]["status"] == "menunggu"
    assert s[ids[2]]["isi"] == {"a": 1, "status": "habis"}, s[ids[2]]["isi"]       # 'liar' tidak ditambahkan, 'a' tidak berubah
    assert u["baris"][2]["isi"]["status"] == "berlaku", "usulan asli ikut berubah"
    assert [s[i]["masuk_angka"] for i in ids] == [True, False, True, False, False]  # resmi+pola_tetap yang DITOLAK tidak masuk angka
    assert g["hitung"] == {"menunggu": 1, "diterima": 1, "ditolak": 2, "dikoreksi": 1} and g["yatim"] == 0
    # keputusan terbaru menang; yatim dihitung
    kep2 = kep + [{"usulan_id": ids[1], "keputusan": "terima", "koreksi": None, "waktu": 9}, {"usulan_id": "0" * 16, "keputusan": "terima", "koreksi": None, "waktu": 9}]
    g = gabung(u["baris"], kep2)
    assert {x["id"]: x["status"] for x in g["baris"]}[ids[1]] == "diterima" and g["yatim"] == 1
    # keputusan atau koreksi cacat ditolak, bukan diabaikan
    for salah in ([{"usulan_id": ids[0], "keputusan": "setuju"}], [{"usulan_id": "xyz", "keputusan": "terima"}],
                  [{"usulan_id": ids[0], "keputusan": "koreksi", "koreksi": None}], [{"usulan_id": ids[0], "keputusan": "koreksi", "koreksi": "{}"}]):
        try:
            gabung(u["baris"], salah); raise AssertionError(f"keputusan cacat lolos: {salah}")
        except ValueError:
            pass
    # pembaca D1: SQL tanpa data uji, galat tidak jadi daftar kosong
    sql = []
    ok = lambda q: (sql.append(q), json.dumps([{"results": [{"usulan_id": ids[0], "keputusan": "terima", "koreksi": None, "waktu": "t"}], "success": True}]))[1]
    assert len(baca_keputusan("usulan_rpbd", ok)) == 1 and "dummy = 0" in sql[0] and "usulan_rpbd" in sql[0]
    assert baca_keputusan("usulan_rpbd", lambda q: json.dumps([{"results": [], "success": True}])) == []
    for salah in ("bukan json", json.dumps({"error": 1}), json.dumps([{"success": False}])):
        try:
            baca_keputusan("usulan_rpbd", lambda q, s=salah: s); raise AssertionError("balasan salah diterima")
        except (RuntimeError, ValueError):
            pass
    for berkas in ("rpbd", "usulan_x'; DROP TABLE unit_ketuk;--", "usulan_", "usulan_x\n"):
        try:
            baca_keputusan(berkas, ok); raise AssertionError(f"nama berkas {berkas!r} lolos")
        except ValueError:
            pass
    s = json.dumps(g, ensure_ascii=False)
    assert "·" not in s and not re.search(r"\baman\b", s, re.I)
    print("terima.py --cek: lulus (id stabil, 4 status, koreksi hanya medan terkoreksi, resmi+pola_tetap berpil, penolakan menang, yatim dihitung)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
