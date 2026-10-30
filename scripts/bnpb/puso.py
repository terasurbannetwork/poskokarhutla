"""#50 Label puso (gagal panen) padi karena kekeringan dari BPS WebAPI -> public/data/bnpb/puso.json
Tujuan: label kekeringan untuk model kekeringan (dikerjakan gunungapi-kering, BUKAN di sini). Berkas ini hanya mengantar label + cakupannya.

SUMBER   BPS WebAPI, tabel "Keadaan Bencana Alam Kekeringan pada Tanaman Padi menurut Kabupaten/Kota di Provinsi X" (hektar, turvar
         Terkena / Puso; sumber asal Dinas Pertanian provinsi). Tabel ini PER PROVINSI: tiap domain BPS provinsi (NN00) memutuskan sendiri
         apakah menerbitkannya, jadi cakupan kabupaten bolong-bolong. Cakupan tiap provinsi dan tahun dicatat apa adanya di `cakupan`;
         provinsi tanpa tabel kabupaten diberi `tingkat = "tidak ada"`, bukan diisi dari tabel provinsi lain.
KEPUTUSAN nol vs hilang: sel kosong di balasan = HILANG (tidak ditulis), bukan 0. Angka 0 hanya bila BPS menulis 0.
KELUARAN {"dibuat","sumber","atribusi","cakupan":{prov:{tabel,tahun:[..],kab_n,turvar:[..]}},"tahun_min","tahun_maks",
          "kering":{kode:{tahun:[terkena_ha, puso_ha]}}, "puso":{kode:{tahun:puso_ha}}, "provinsi_tanpa_tabel":[..], "gagal":[..]}
Pakai:  BPS_KEY=... python3 scripts/bnpb/puso.py  |  python3 scripts/bnpb/puso.py --cek
"""
import json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hvc_dasar as D
import bps as B

PROV = [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 31, 32, 33, 34, 35, 36, 51, 52, 53, 61, 62, 63, 64, 65, 71, 72, 73, 74, 75, 76, 81, 82,
        91, 92, 93, 94, 95, 96]
POLA_KERING = r"kekeringan.*padi.*kabupaten|padi.*kekeringan.*kabupaten"      # turvar Terkena / Puso, khusus sebab kekeringan
POLA_PUSO = r"padi.*(puso|gagal panen).*kabupaten|(puso|gagal panen).*padi.*kabupaten"   # puso semua sebab (kekeringan, banjir, hama)
KODE_TAHUN = [(a, a + 2) for a in range(105, 126, 3)]   # th = tahun - 1900; API membatasi 3 tahun per panggilan (2005-2025)


def kolom(label):
    """Label turvar -> 'puso' | 'terkena' | None (kategori lain, mis. ringan/sedang/berat, tidak dipakai)."""
    s = (label or "").lower()
    if "puso" in s or "gagal panen" in s or "rusak" in s:
        return "puso"
    if re.search(r"terkena|luas kekeringan|luas terkena|total", s):
        return "terkena"
    return None


def urai_tabel(r):
    """Balasan data -> ({kode kab 4 digit: {tahun: {puso, terkena}}}, [label turvar terbaca]).
    Hanya vervar 4 digit non-provinsi (kode berakhiran 00 = provinsi dibuang)."""
    if not isinstance(r, dict) or r.get("status") != "OK" or r.get("data-availability") != "available" or not isinstance(r.get("datacontent"), dict):
        return {}, []
    var = r["var"][0]["val"]
    tv = {t["val"]: kolom(t.get("label")) for t in r["turvar"]} if r.get("turvar") else {0: "puso"}
    out = {}
    tts = r.get("turtahun") or [{"val": 0}]
    # turtahun bulanan: hanya baris "Tahunan" dipakai; tanpa itu dan > 1 pilihan, tabel dilewati (tidak dijumlah diam-diam)
    tt_pakai = [t["val"] for t in tts if re.search(r"tahunan", str(t.get("label", "")), re.I)] or ([tts[0]["val"]] if len(tts) == 1 else [])
    for ver in r["vervar"]:
        kode = str(ver["val"])
        if len(kode) != 4 or kode.endswith("00"):
            continue
        for th in r["tahun"]:
            for tvid, nama in tv.items():
                if nama is None:
                    continue
                for tt in tt_pakai:
                    n = r["datacontent"].get(f"{ver['val']}{var}{tvid}{th['val']}{tt}")
                    if n is None or n == "":
                        continue
                    out.setdefault(kode, {}).setdefault(th["label"], {})[nama] = float(n)
    return out, sorted({v for v in tv.values() if v})


def cari_tabel(dom):
    """-> {"kering": (id, judul) | None, "puso": (id, judul) | None}. Kata kunci 'kekeringan', 'puso', 'gagal panen' (halaman 1-3 tiap kata)."""
    daftar = []
    for kata in ("kekeringan", "puso", "gagal panen"):
        for h in (1, 2, 3):
            try:
                r = B.ambil(B.url_var(dom, kata, h))
            except RuntimeError:
                break
            d = r.get("data") or []
            if r.get("data-availability") == "list-not-available" or len(d) < 2:
                break
            daftar += [(x["var_id"], x["title"]) for x in d[1] if isinstance(x, dict) and "var_id" in x]
            if d[0].get("page", 1) >= d[0].get("pages", 1):
                break
    judul = dict(daftar)
    out = {}
    for nama, pola in (("kering", POLA_KERING), ("puso", POLA_PUSO)):
        v = B.pilih_var(daftar, pola)
        out[nama] = (v, judul[v]) if v is not None else None
    return out


def tarik(dom, vid):
    """Semua tahun 2005-2025 -> ({kode: {tahun: {puso, terkena}}}, turvar terbaca)."""
    gab, tur = {}, set()
    for a, b in KODE_TAHUN:
        d, t = urai_tabel(B.ambil(B.url_data(dom, vid, f"{a}:{b}")))
        tur |= set(t)
        for k, per in d.items():
            for th, v in per.items():
                gab.setdefault(k, {})[th] = v
    return gab, sorted(tur)


def jalan(prov=None):
    mulai = time.time()
    info = D.kab_info()
    kering, puso, cakupan, tanpa, gagal = {}, {}, {}, [], []
    for p in prov or PROV:
        dom = f"{p}00"
        try:
            tb = cari_tabel(dom)
            ada = False
            for jenis, tujuan in (("kering", kering), ("puso", puso)):
                if tb[jenis] is None:
                    continue
                vid, judul = tb[jenis]
                gab, tur = tarik(dom, vid)
                if not gab:
                    continue
                ada = True
                for k, per in gab.items():
                    for th, v in per.items():
                        tujuan.setdefault(k, {})[th] = [v.get("terkena"), v.get("puso")] if jenis == "kering" else v.get("puso")
                tahun = sorted({th for per in gab.values() for th in per})
                cakupan.setdefault(str(p), {})[jenis] = {"tabel": f"var {vid}: {judul}", "tahun": tahun, "kab_n": len(gab), "turvar": tur}
                print(f"  {dom} {jenis}: var {vid}, {len(gab)} kab, {tahun[0]}-{tahun[-1]}", file=sys.stderr, flush=True)
            if not ada:
                tanpa.append(p)
        except (RuntimeError, B.FormatBeda, KeyError) as e:
            gagal.append(f"{dom}: {str(e)[:160]}")
    semua = sorted({th for t in (kering, puso) for per in t.values() for th in per})
    asing = sorted(k for k in set(kering) | set(puso) if k not in info)
    D.simpan_plafon("puso.json", {
        "sumber": "BPS WebAPI, tabel kabupaten/kota: (a) Keadaan Bencana Alam Kekeringan pada Tanaman Padi (terkena, puso; hektar) dan (b) Luas Puso/Gagal Panen Padi semua sebab; sumber asal Dinas Pertanian provinsi",
        "atribusi": "Badan Pusat Statistik (BPS) Provinsi, dari data Dinas Pertanian provinsi; syarat WebAPI BPS",
        "catatan": "Cakupan bolong: hanya provinsi yang menerbitkan tabel kabupaten (lihat cakupan dan provinsi_tanpa_tabel). Sel kosong = hilang, bukan 0. kering[kab][tahun] = [terkena_ha, puso_ha] khusus kekeringan; puso[kab][tahun] = puso_ha semua sebab (bukan label murni kekeringan).",
        "cakupan": cakupan, "provinsi_tanpa_tabel": tanpa, "gagal": gagal, "dicari": [f"{p}00" for p in (prov or PROV)],
        "tahun_min": semua[0] if semua else None, "tahun_maks": semua[-1] if semua else None, "kode_tak_dikenal": asing,
        "kering": kering, "puso": puso})
    print(f"puso.json: kering {len(kering)} kab, puso {len(puso)} kab, {len(cakupan)} provinsi bertabel, {len(tanpa)} tanpa, {len(gagal)} gagal, {time.time() - mulai:.0f} dtk", file=sys.stderr)


def _cek():
    assert kolom("Puso") == "puso" and kolom("Terkena") == "terkena" and kolom("Ringan") is None
    fix = {"status": "OK", "data-availability": "available", "var": [{"val": 811}],
           "turvar": [{"val": 1151, "label": "Terkena"}, {"val": 1152, "label": "Puso"}, {"val": 9, "label": "Ringan"}],
           "vervar": [{"val": 3300, "label": "PROV"}, {"val": 3301, "label": "Cilacap"}, {"val": 3302, "label": "Banyumas"}],
           "tahun": [{"val": 115, "label": "2015"}], "turtahun": [{"val": 0}],
           "datacontent": {"33018111151" + "1150": 12.0, "33018111152" + "1150": 0.0, "33028111152" + "1150": 3.5, "33008111152" + "1150": 99}}
    d, t = urai_tabel(fix)
    assert d == {"3301": {"2015": {"terkena": 12.0, "puso": 0.0}}, "3302": {"2015": {"puso": 3.5}}}, d   # 0 tetap 0; provinsi dibuang; kosong tak ditulis
    assert t == ["puso", "terkena"]
    bln = dict(fix, turtahun=[{"val": 1, "label": "Januari"}, {"val": 2, "label": "Februari"}])
    assert urai_tabel(bln) == ({}, ["puso", "terkena"]), "turtahun bulanan tanpa Tahunan harus dilewati"
    assert urai_tabel({"status": "OK", "data-availability": "available", "datacontent": []}) == ({}, [])
    dl = [(1, "Padi Sawah"), (808, "Keadaan Bencana Alam Banjir pada Tanaman Padi menurut Kabupaten/Kota di Provinsi X"),
          (811, "Keadaan Bencana Alam Kekeringan pada Tanaman Padi menurut Kabupaten/Kota di Provinsi X"),
          (50, "[PP.TP.006] Luas Tanam, Puso, dan Panen Tanaman Padi Tahunan menurut Kabupaten/Kota"),
          (599, "Luas Tanam, Luas Panen dan Luas Rusak/Puso Jagung")]
    assert B.pilih_var(dl, POLA_KERING) == 811 and B.pilih_var(dl[:2], POLA_KERING) is None
    assert B.pilih_var(dl, POLA_PUSO) == 50, "puso jagung/tanpa kabupaten bukan label padi"
    print("puso: --cek hijau")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        _cek()
    else:
        jalan([int(x) for x in sys.argv[1].split(",")] if len(sys.argv) > 1 else None)
