#!/usr/bin/env python3
"""SIPPA: zona, saran sarana, matriks respons, pemicu (DESAIN-TEKNIS §5.4, PRD §5.4 dan §9.4.2, SP-019).
Kembar fungsi hitung JS; semua ambang asumsi-kebijakan. Stdlib saja.
Pakai: python3 scripts/data/sippa/respons.py uji"""
import math
import sys
from pathlib import Path

AMBANG_ZONA = {"air": 2.5, "jalan": 5}
LIKU_TRASE = 1.2

SARANA_RESPONS = {
    1: "Pompa jinjing, selang 500 m, dan 2 lance",
    2: "1 kit relay; 8 lance; flowmeter; probe",
    3: "1–2 kit; sekat basah; drone termal",
    4: "2 kit dan regu garis; evakuasi asap; kit hanya di sisi yang sudah tertahan",
}

# nomor: (kit, heli, kalimat saran); kalimat sama dengan SARANA di hitung.js
ATURAN_SARANA = {
    1: ("sisi_tertahan", True, "Tahan front dari udara, regu darat menyusul; kit hanya di sisi yang sudah tertahan."),
    2: ("tidak", False, "Pencegahan (rewetting, sekat kanal, patroli) dan drone termal untuk deteksi; kit tidak dipra-posisikan."),
    3: ("dari_sumur", False, "Sumur bor dangkal pra-posisi dan pompa jinjing; mobil tangki cadangan; kit dari sumur ke bara bila sumur memberi paling sedikit 1,5 kali debit operasi."),
    4: ("perahu", False, "Kit lewat perahu dan portage (gulungan paling berat 30 kg per orang); depot depan di tepi kanal; sekat kanal di sel inti."),
    5: ("jinjing", False, "Pompa jinjing, selang 500 m, dan 2 lance cukup; kit relay tidak perlu."),
    6: ("relay", False, "Kit relay SIPPA (layflat DN100 0,5–1,5 km, 8 lance, probe)."),
}

LABEL_VERSI = {"k": "konservatif", "u": "jalan utama OSM", "o": "optimistis", "v": "terverifikasi"}
JAM_HELI = 6


def ada_angka(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def zona(air, jalan, ambang=AMBANG_ZONA):
    """Pembanding ketat `<` (keputusan 51): tepat 2,50 atau 5,00 km = jauh; None = jauh."""
    a = math.inf if air is None else air
    j = math.inf if jalan is None else jalan
    if a < ambang["air"]:
        return "A" if j < ambang["jalan"] else "B"
    return "C" if j < ambang["jalan"] else "D"


def zona_terverifikasi(k, cek):
    return k["zona_o"] if cek and cek.get("hasil") == "lolos" else k["zona_k"]


def bulat_js(x):
    return math.floor(x + 0.5)  # Math.round, bukan round() bankir Python


def tampil(n):
    """Padanan fmt id-ID (paling banyak 1 desimal, titik ribuan, koma desimal), seperti `tampil` di hitung.js."""
    if n is None or n != n:
        return "–"
    v = bulat_js(abs(n) * 10) / 10
    s = f"{v:,.1f}".replace(",", "_").replace(".", ",").replace("_", ".")
    s = s[:-2] if s.endswith(",0") else s
    return ("-" + s) if n < 0 and v != 0 else s


def saran_sarana(k, versi, api_aktif, cek=None):
    """Aturan dicek berurutan, berhenti di yang pertama cocok (DT §5.4); `cek` hanya dipakai versi v (sippa_jalan_cek terbaru)."""
    lolos = bool(cek) and cek.get("hasil") == "lolos"
    versi_zona = {
        "k": (k.get("air_km_lama"), k.get("jalan_km_lama"), k.get("zona_k")),
        "u": (k.get("air_km_semua"), k.get("jalan_km_utama"), k.get("zona_u")),
        "o": (k.get("air_km_semua"), k.get("jalan_km_semua"), k.get("zona_o")),
        "v": (k.get("air_km_semua"), k.get("jalan_km_semua") if lolos else k.get("jalan_km_lama"), k.get("zona_o") if lolos else k.get("zona_k")),
    }
    if versi not in versi_zona:
        raise ValueError(f"versi zona {versi} tidak dikenal; pilih k, u, o, atau v")
    air, jalan, z = versi_zona[versi]
    jam = k.get("jam_tiba")
    if jam is not None and jam > JAM_HELI and api_aktif:
        no = 1
    elif z == "D":
        no = 2
    elif z == "C":
        no = 3
    elif z == "B":
        no = 4
    elif (0 if air is None else air) <= 0.5:  # JS: null <= 0,5 benar
        no = 5
    else:
        no = 6
    kit, heli, sarana = ATURAN_SARANA[no]
    alasan = ["air tidak terdeteksi" if air is None else f"air {tampil(air)} km",
              "tanpa jalan kendaraan" if jalan is None else f"jalan {tampil(jalan)} km",
              f"zona {z} {LABEL_VERSI[versi]}"]
    if jam is None:
        alasan.append("waktu tempuh belum dihitung")
    elif no == 1:
        alasan.append(f"waktu tempuh {tampil(jam)} jam dan ada titik panas 24 jam")
    beda = k.get("beda_air_m")
    return {"aturan": no, "kit": kit, "heli": heli, "sarana": sarana, "alasan": alasan,
            "tautan_hitung": {"L_m": None if air is None else bulat_js(air * 1000 * LIKU_TRASE),
                              "dz_m": None if beda is None else 0 - beda, "dz_sumber": "dsm"}}


def matriks_respons(frp, luas_ha, z, koef, jam_tiba=None):
    """koef = operasi.json.koef; koef['bara_regu']['mid'] ha/regu/hari (tidak ada angka 1,2 tertanam)."""
    mid = ((koef or {}).get("bara_regu") or {}).get("mid")
    if not ada_angka(mid) or mid <= 0:
        raise ValueError("koef.bara_regu.mid wajib angka positif (dari operasi.json)")
    if not ada_angka(frp) or frp < 0 or not ada_angka(luas_ha) or luas_ha < 0:
        raise ValueError("frp dan luasHa wajib angka 0 atau lebih")
    t_f = 1 if frp < 10 else 2 if frp <= 30 else 3 if frp <= 100 else 4  # batas atas ikut tingkat bawah
    t_l = 1 if luas_ha <= 2 else 2 if luas_ha <= 10 else 3 if luas_ha <= 50 else 4
    t = max(t_f, t_l)
    if t == 1:
        regu = 1
    elif t == 2:
        regu = 2
    elif t == 3:
        regu = 3 if luas_ha <= 30 else 4
    else:
        regu = max(5, math.ceil(luas_ha / (mid * 10)))
    hari = math.ceil(10 * luas_ha / (regu * mid) - 1e-9) / 10  # 1e-9 sama dengan JS: derau float tidak boleh menaikkan satu langkah
    heli = "ya" if t == 4 else "tahan_front" if t >= 2 and jam_tiba is not None and jam_tiba > JAM_HELI else "tidak"
    return {"tingkat": t, "tingkat_frp": t_f, "tingkat_luas": t_l, "regu": regu, "hari": hari, "heli": heli,
            "sarana": SARANA_RESPONS[t] + ("; sumur dangkal" if t == 1 and z == "C" else "")}


def tingkat_pemicu(x):
    anom = x.get("anom_pct")
    siaga = anom is not None and anom <= -20
    pra = siaga and not x.get("basi_ansambel") and x.get("hari_ps50") is not None and x["hari_ps50"] >= 3
    gelar = pra and not x.get("basi_titik") and x.get("titik_ab") is not None and x["titik_ab"] >= 1
    return "GELAR" if gelar else "PRA-POSISI" if pra else "SIAGA" if siaga else "NORMAL"


def uji():
    sys.path.append(str(Path(__file__).resolve().parent))
    import kembar_cli
    n = kembar_cli.uji_fixture({"zona", "tingkatPemicu"})
    # T1-T4 (DT §5.8)
    def pem(a, h, t, ba, bt):
        return tingkat_pemicu({"anom_pct": a, "hari_ps50": h, "titik_ab": t, "basi_ansambel": ba, "basi_titik": bt})
    assert [pem(-29.5, 4, 0, False, False), pem(-29.5, 4, 2, False, False), pem(-29.5, 4, 2, True, False), pem(-12, 7, 5, False, False)] \
        == ["PRA-POSISI", "GELAR", "SIAGA", "NORMAL"]
    assert pem(None, 4, 2, False, False) == "NORMAL" and pem(-20, 3, 1, False, True) == "PRA-POSISI"
    # enam aturan saran_sarana, satu kompleks per aturan; aturan 1 menang atas zona D
    dasar = {"air_km_lama": 1.4, "jalan_km_lama": 3.2, "air_km_semua": 1.4, "jalan_km_utama": 3.2, "jalan_km_semua": 3.2,
             "zona_k": "A", "zona_u": "A", "zona_o": "A", "jam_tiba": 2, "beda_air_m": 1.5}
    def s(no, versi="k", api=False, **ubah):
        r = saran_sarana({**dasar, **ubah}, versi, api)
        assert r["aturan"] == no, (no, r)
        assert r["alasan"] and any(c.isdigit() for c in r["alasan"][0]), r
        return r
    assert s(1, api=True, jam_tiba=7, zona_k="D")["heli"] is True
    assert s(2, zona_k="D")["kit"] == "tidak"
    assert s(3, zona_k="C")["kit"] == "dari_sumur"
    assert s(4, zona_k="B")["kit"] == "perahu"
    assert s(5, air_km_lama=0.5)["kit"] == "jinjing"
    r6 = s(6)
    assert r6["kit"] == "relay" and r6["alasan"][:3] == ["air 1,4 km", "jalan 3,2 km", "zona A konservatif"], r6
    assert r6["tautan_hitung"] == {"L_m": 1680, "dz_m": -1.5, "dz_sumber": "dsm"}, r6
    assert s(6, jam_tiba=None, api=True)["alasan"][-1] == "waktu tempuh belum dihitung"
    assert s(4, versi="o", zona_o="B", air_km_semua=0.4)["aturan"] == 4 and s(5, versi="o", air_km_semua=0.4)["aturan"] == 5
    assert s(3, versi="v", zona_k="C")["alasan"][2] == "zona C terverifikasi"  # tanpa cek lolos: zona konservatif
    rv = saran_sarana({**dasar, "zona_k": "C", "jalan_km_lama": None}, "v", False, {"hasil": "lolos"})
    assert rv["aturan"] == 6 and rv["alasan"][1] == "jalan 3,2 km", rv  # cek lolos: zona_o dan jalan_km_semua
    assert s(1, api=True, jam_tiba=7)["alasan"][-1] == "waktu tempuh 7 jam dan ada titik panas 24 jam"
    assert [tampil(x) for x in (1.44, 1.45, 1234.56, 0, -2.5, None)] == ["1,4", "1,5", "1.234,6", "0", "-2,5", "–"]
    try:
        saran_sarana(dasar, "x", False)
        raise AssertionError("versi x harus ditolak")
    except ValueError:
        pass
    assert zona_terverifikasi({"zona_o": "A", "zona_k": "C"}, {"hasil": "lolos"}) == "A"
    assert zona_terverifikasi({"zona_o": "A", "zona_k": "C"}, None) == "C"
    # empat tingkat matriks_respons + batas antar-tingkat (koef bara_regu.mid = 1,0 seperti operasi.json)
    koef = {"bara_regu": {"mid": 1.0}}
    def m(frp, luas, z="A", jam=None):
        return matriks_respons(frp, luas, z, koef, jam)
    t1 = m(5, 1, "C")
    assert (t1["tingkat"], t1["regu"], t1["hari"], t1["heli"]) == (1, 1, 1.0, "tidak") and t1["sarana"].endswith(" sumur dangkal"), t1
    t2 = m(20, 5)
    assert (t2["tingkat"], t2["regu"], t2["hari"]) == (2, 2, 2.5), t2
    assert m(20, 5, jam=7)["heli"] == "tahan_front"
    t3 = m(50, 20)
    assert (t3["tingkat"], t3["regu"], t3["hari"]) == (3, 3, 6.7), t3
    assert m(50, 40)["regu"] == 4
    t4 = m(150, 60)
    assert (t4["tingkat"], t4["regu"], t4["hari"], t4["heli"]) == (4, 6, 10.0, "ya"), t4
    assert [m(f, 0)["tingkat"] for f in (9.99, 10, 30, 30.1, 100, 100.1)] == [1, 2, 2, 3, 3, 4]
    assert [m(0, a)["tingkat"] for a in (2, 2.1, 10, 10.1, 50, 50.1)] == [1, 2, 2, 3, 3, 4]
    assert m(0, 5)["tingkat"] == 2 and m(50, 1)["tingkat"] == 3, "tingkat = max(FRP, luas)"
    try:
        m(-1, 5)
        raise AssertionError("FRP negatif harus ditolak")
    except ValueError:
        pass
    print(f"respons.py uji: OK ({n} kasus acuan + T1-T4 + 6 aturan saran + 4 tingkat respons)")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        sys.exit("pakai: respons.py uji")
