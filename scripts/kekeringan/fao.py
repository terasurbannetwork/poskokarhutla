"""Satu sumber konstanta padi dan tanah FAO-56 (Allen dkk. 1998, FAO Irrigation and Drainage Paper 56),
dicocokkan ke teks asli https://www.fao.org/4/x0490e/x0490e00.htm pada 18 Okt 2026. Dipakai neraca.py (dan padi.py).
Yang bukan dari FAO-56 bernama ASUMSI_* dan tidak boleh disebut bersumber FAO.

Pakai:  python3 scripts/kekeringan/fao.py   (self-check)
"""
# ---- dari FAO-56 --------------------------------------------------------------------------------
P_PADI = 0.20                 # Tabel 22, padi; catatan 4: "0,20 dari jenuh"
ZR_PADI = 0.5                 # m, Tabel 22: padi 0,5-1,0; batas bawah
KC_PADI = (1.05, 1.20, 0.90)  # Tabel 12 padi: Kc ini 1,05; Kc mid 1,20; Kc end 0,90-0,60 (ujung atas)
FASE_PADI = (30, 30, 60, 30)  # hari, Tabel 11 padi tropis (Des/Mei): awal, perkembangan, tengah, akhir = 150 (varietas Mei: 30/30/80/40 = 180)
FC_LEMPUNG = 0.25             # m3/m3, Tabel 19 Loam: qFC 0,20-0,30, titik tengah
WP_LEMPUNG = 0.12             # m3/m3, Tabel 19 Loam: qWP 0,07-0,17, titik tengah ((qFC-qWP) 0,13 ada di kisaran Tabel 19: 0,13-0,18)
SUMBER = {"p": "Tabel 22", "zr": "Tabel 22", "kc": "Tabel 12", "fase": "Tabel 11", "fc": "Tabel 19", "wp": "Tabel 19",
          "taw": "pers. 82", "raw": "pers. 83", "ks": "pers. 84", "dr": "pers. 85", "et0": "pers. 6 (Penman-Monteith)"}

# ---- ASUMSI kami, bukan FAO-56 ------------------------------------------------------------------
ASUMSI_AW_GAMBUT = 0.25       # m3/m3 air tersedia gambut; FAO-56 tidak memuat gambut
ASUMSI_KC_BERA = 0.5          # Kc lahan belum ditanam atau sudah dipanen
ASUMSI_AMBANG_BERAT = 0.5     # Ks di bawah ini = stres berat (pengelompokan kami)
ASUMSI_INTENSITAS = 15.0      # mm per hari hujan pada skenario iklim bulanan


def taw_mm(fc=FC_LEMPUNG, wp=WP_LEMPUNG, zr=ZR_PADI):
    """TAW (mm) = 1000 (qFC - qWP) Zr, FAO-56 pers. 82."""
    return round(1000 * (fc - wp) * zr, 1)


TAW_MINERAL = taw_mm()                        # 65,0 mm
TAW_GAMBUT = taw_mm(ASUMSI_AW_GAMBUT, 0.0)    # 125,0 mm (air tersedia langsung)


def uji():
    assert (P_PADI, ZR_PADI, KC_PADI, FASE_PADI) == (0.20, 0.5, (1.05, 1.20, 0.90), (30, 30, 60, 30))
    assert 0.20 <= FC_LEMPUNG <= 0.30 and 0.07 <= WP_LEMPUNG <= 0.17 and 0.13 <= FC_LEMPUNG - WP_LEMPUNG <= 0.18   # Tabel 19 lempung
    assert TAW_MINERAL == 65.0 and TAW_GAMBUT == 125.0 and sum(FASE_PADI) == 150
    print("ok fao")


if __name__ == "__main__":
    uji()
