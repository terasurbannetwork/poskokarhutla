"""MIROVA (Univ. Torino / Univ. Firenze): daya radiatif vulkanik (VRP, MW) dari MODIS/VIIRS, gunung api Indonesia.

Sumber (halaman HTML publik, tanpa API): https://www.mirovaweb.it/NRT/latest.php (VRP terbaru per sensor)
dan /NRT/zscoretrend.php (jumlah alert 24j/minggu/bulan/tahun + tingkat aktivitas). ID MIROVA = nomor GVP;
Indonesia 261-268, 260010 dibuang. Tidak ada arsip, jadi deret harian maksimum VRP dikumpulkan sendiri di berkasnya (90 hari).

LISENSI: data MIROVA nonkomersial; olah-ulang/redistribusi butuh izin penyelenggara -> izin_olah = "belum".
Layar hanya menampilkan dengan atribusi dan tautan ke MIROVA; jangan dipakai sebagai masukan model terbit sebelum izin.

Keluaran: public/gunungapi/data/mirova.json. Pemakaian: python3 scripts/gunungapi/mirova.py [uji]
"""
import datetime as dt, html, json, os, re, statistics, sys, time, urllib.request

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
BASIS = "https://www.mirovaweb.it/NRT/"
UA = "PantauBencana-research/1.0 (+https://github.com/terasurbannetwork/poskokarhutla; pinkatitan@gmail.com)"
KELUAR = os.path.join(AKAR, "public/gunungapi/data/mirova.json")
KATALOG = os.path.join(AKAR, "public/gunungapi/data/gunung.json")
HARI = 90
MIN_GUNUNG = 15
NAMA = {"Krakatau": "Anak Krakatau", "Paluweh": "Rokatenda", "Lewotolo": "Ili Lewotolok", "TaraBatu": "Batutara",
        "TenggerCaldera": "Bromo", "Kelut": "Kelud", "Lewotobi": "Lewotobi Laki-laki", "SangeangApi": "Sangeangapi"}
ATRIBUSI = "MIROVA (Universita di Torino, Universita di Firenze), www.mirovaweb.it; sensor MODIS/VIIRS (NASA)"
LISENSI = "Nonkomersial; olah-ulang dan redistribusi butuh izin MIROVA."


def ambil(nama, coba=3):
    for i in range(coba):
        try:
            req = urllib.request.Request(BASIS + nama, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read(8_000_000).decode("utf-8", "replace")
        except Exception:
            if i == coba - 1:
                raise
            time.sleep(3 * (i + 1))


def indonesia(i):
    return 261 <= int(i) // 1000 <= 268 and int(i) != 260010


def baca_terbaru(teks):
    """-> {id: {"nama", "vrp" (maks lintas sensor), "waktu" (UTC terbaru)}}"""
    h = {}
    for tr in re.findall(r"<tr class=\"\w+\">(.*?)</tr>", teks, re.S):
        td = [html.unescape(re.sub(r"<[^>]+>", "", x)).strip() for x in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
        if len(td) < 6 or not td[1].isdigit() or not indonesia(td[1]):
            continue
        try:
            w = dt.datetime.strptime(td[0], "%d-%b-%Y %H:%M:%S").replace(tzinfo=dt.timezone.utc)
            v = float(td[3])
        except ValueError:
            continue
        g = h.setdefault(td[1], {"nama": td[2], "vrp": 0.0, "waktu": w})
        g["vrp"] = max(g["vrp"], v)
        g["waktu"] = max(g["waktu"], w)
    return h


def baca_zscore(teks):
    """-> {id: {"alert_24j","alert_minggu","alert_bulan","alert_tahun","aktivitas_minggu"}}"""
    h = {}
    for tr in re.findall(r"<tr>(.*?)</tr>", teks, re.S):
        m = re.search(r"volcano_id=(\d+)", tr)
        n = re.findall(r"alerts-cell\">(\d+)<", tr)
        a = re.findall(r"class=\"activity-level [\w-]+\">\s*([^<]+?)\s*<", tr)
        if m and indonesia(m.group(1)) and len(n) == 4:
            h[m.group(1)] = dict(zip(("alert_24j", "alert_minggu", "alert_bulan", "alert_tahun"), map(int, n)),
                                 aktivitas_minggu=a[1] if len(a) > 1 else None)
    return h


def di_atas_latar(seri):
    """seri {YYYY-MM-DD: VRP maks}. True bila maks 2 hari UTC terakhir > median + 3*max(1.4826*MAD, 1 MW) hari-hari sebelumnya
    (nol ikut dihitung); None bila < 14 hari. ponytail: latar MAD murni, tanpa musim/penutupan awan; nol karena awan menurunkan median."""
    if len(seri) < 14:
        return None
    t = sorted(seri)
    lalu = [seri[k] for k in t[:-2]]
    med = statistics.median(lalu)
    mad = statistics.median(abs(x - med) for x in lalu)
    return max(seri[k] for k in t[-2:]) > med + 3 * max(1.4826 * mad, 1.0)


def gabung(lama, terbaru, zs, sekarang):
    g = {}
    batas = (sekarang - dt.timedelta(days=HARI)).strftime("%Y-%m-%d")
    for i, d in terbaru.items():
        s = dict((lama.get(i) or {}).get("seri") or {})
        hari = d["waktu"].strftime("%Y-%m-%d")
        s[hari] = max(s.get(hari, 0.0), d["vrp"])
        s = {k: v for k, v in sorted(s.items()) if k >= batas}
        g[i] = {"nama_mirova": d["nama"], "gunung": NAMA.get(d["nama"], d["nama"]), "vrp_mw": d["vrp"],
                "waktu": d["waktu"].strftime("%Y-%m-%dT%H:%M:%SZ"), **zs.get(i, {}),
                "di_atas_latar": di_atas_latar(s), "seri": s}
    return g


def jalan():
    terbaru = baca_terbaru(ambil("latest.php"))
    if len(terbaru) < MIN_GUNUNG:
        sys.exit(f"hanya {len(terbaru)} gunung Indonesia terbaca (< {MIN_GUNUNG}); berkas lama dipertahankan")
    time.sleep(3)
    zs = baca_zscore(ambil("zscoretrend.php"))
    try:
        lama = json.load(open(KELUAR)).get("gunung", {})
    except (OSError, ValueError):
        lama = {}
    now = dt.datetime.now(dt.timezone.utc)
    g = gabung(lama, terbaru, zs, now)
    kat = json.load(open(KATALOG))
    tanpa = sorted(v["gunung"] for v in g.values() if v["gunung"] not in kat)
    out = {"dibuat": now.strftime("%Y-%m-%dT%H:%M:%SZ"), "sumber": BASIS + "latest.php", "atribusi": ATRIBUSI,
           "lisensi": LISENSI, "izin_olah": "belum", "satuan": "MW (VRP)", "gunung": g}
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(g)} gunung; VRP>0: {sum(v['vrp_mw'] > 0 for v in g.values())}; "
          f"alert 24j>0: {sum(v.get('alert_24j', 0) > 0 for v in g.values())}; tak ada di katalog MAGMA: {tanpa}")


def uji():
    ds = lambda n, f: {(dt.date(2026, 1, 1) + dt.timedelta(days=i)).isoformat(): f(i) for i in range(n)}
    assert di_atas_latar(ds(13, lambda i: 0)) is None
    assert di_atas_latar(ds(30, lambda i: 0.0)) is False
    assert di_atas_latar(ds(30, lambda i: 5.0 if i >= 29 else 0.0)) is True          # lonjakan di hari terakhir
    assert di_atas_latar(ds(30, lambda i: 0.5 if i == 29 else 0.0)) is False         # di bawah lantai 1 MW
    assert di_atas_latar(ds(30, lambda i: 9.0 if i == 10 else 0.0)) is False         # lonjakan lama bukan sinyal
    assert indonesia("262000") and not indonesia("260010") and not indonesia("341090")
    row = '<tr class="low"><td>29-Oct-2026 13:35:00</td><td>264020</td><td><a>Agung</a></td><td data-order="1">2.50</td><td>0</td><td>MODIS</td></tr>'
    r2 = row.replace("2.50", "4.00").replace("MODIS", "VIIRS")
    h = baca_terbaru(row + r2)
    assert h["264020"]["vrp"] == 4.0 and h["264020"]["nama"] == "Agung"
    assert len(baca_terbaru(row.replace("264020", "341090"))) == 0
    z = baca_zscore('<tr><td><a href="x?volcano_id=264020">Agung</a></td><td class="alerts-cell">0</td><td class="alerts-cell">1</td>'
                    '<td class="alerts-cell">2</td><td class="alerts-cell">51</td><td><span class="activity-level a">\n N/D </span></td>'
                    '<td><span class="activity-level b">\n Normal </span></td></tr>')
    assert z["264020"]["alert_tahun"] == 51 and z["264020"]["aktivitas_minggu"] == "Normal"
    g = gabung({"264020": {"seri": {"2020-01-01": 1.0}}}, h, z, dt.datetime(2026, 10, 30, tzinfo=dt.timezone.utc))
    assert list(g["264020"]["seri"]) == ["2026-10-29"] and g["264020"]["di_atas_latar"] is None
    print("uji mirova: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
