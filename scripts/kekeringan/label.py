"""Label kejadian kekeringan per kabupaten-bulan dari arsip Pusdalops (G8) -> data/raw/kekeringan_label.json (git-ignored).

Aturan (ditulis SEBELUM skor uji dihitung; ringkasan di RISET-LABEL.md):
  satuan      kabupaten-bulan 'prov|Kab' x 'YYYY-MM'. Banyak baris/episode di kab-bulan yang sama = SATU kejadian (dedup per sumber, lalu gabungan = gabung himpunan).
  sumber      sk       sk_status.jsonl jenis kekeringan: tiap bulan antara mulai..selesai (tanpa mulai: bulan tgl_sk; tanpa selesai: bulan mulai). Tingkat Siaga/Tanggap, perpanjangan, sama saja.
                       Baris tanpa kab (tingkat provinsi) atau tanpa tanggal dibuang.
              rekap    rekap_harian.jsonl jenis kekeringan: bulan tanggal laporan (baris tanpa kab dibuang).
              laphar   laphar_2022_2025.json episode jenis kekeringan: bulan mulai..terakhir (episode tanpa kab dibuang).
              logbook  data/raw/logbook/arsip/*/kejadian.jsonl jenis kekeringan: bulan tgl_kejadian (cadangan pertama_dicatat). Bukan public/data/logbook_riwayat.json:
                       berkas itu hanya menyimpan hitungan kab-per-tahun dan klimatologi bulan lintas tahun, tidak ada kab-per-bulan-per-tahun.
  cakupan     tahun masuk cakupan sumber bila ada >= MIN_TAHUN (10) kejadian kekeringan di tahun itu; bulan di luar cakupan TIDAK PERNAH dihitung negatif
              (tidak ada catatan != tidak ada kekeringan). Logbook: bulan harus tercatat >= 90% hari (hari_bulan di logbook_riwayat.json).
  dikenal     kab_bulan_dikenal = bulan yang sudah diketahui di akhir bulan itu, bahan persistensi tanpa bocor: logbook hanya bila pertama_dicatat <= bulan kejadian;
              rekap/laphar sama dengan data; SK kosong (rentang SK ditetapkan di muka, persistensi SK = artefak).
  tidak terbit sk_kekeringan_tidak_terbit.jsonl: kab yang tidak menerbitkan SK sekalipun kering; dikeluarkan dari penilaian SK (tidak positif, tidak negatif).
  pencocokan  nama kab ke kunci penduduk.json (prov + nama tanpa 'Kab.'; 'Kota X' tetap beda). Yang tak cocok dihitung, dilaporkan, dibuang.
Pakai:  python3 scripts/kekeringan/label.py        (bangun)    python3 scripts/kekeringan/label.py uji   (self-check)
"""
import calendar, glob, json, os, sys

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.join(AB, "../..")
D = os.path.join(AKAR, "data/raw/pusdalops_unik")
KELUAR = os.path.join(AKAR, "data/raw/kekeringan_label.json")
MIN_TAHUN, MIN_HARI, BATAS_BULAN = 10, .9, 36


def norm_kab(n):
    return "".join(c for c in (n or "").lower().replace("kabupaten", "").replace("kab.", "") if c.isalpha())


def bulan_rentang(a, b):
    """'YYYY-MM-DD' a..b -> ['YYYY-MM', ...]; None bila tak terbaca atau lebih dari BATAS_BULAN bulan (tanggal salah ketik)."""
    try:
        y, m, y2, m2 = int(a[:4]), int(a[5:7]), int(b[:4]), int(b[5:7])
    except (TypeError, ValueError):
        return None
    out = []
    while (y, m) <= (y2, m2) and len(out) <= BATAS_BULAN:
        out.append(f"{y}-{m:02d}")
        y, m = (y, m + 1) if m < 12 else (y + 1, 1)
    return out if 0 < len(out) <= BATAS_BULAN else None


def penyelesai(penduduk):
    idx = {}
    for k in penduduk["kec"]:
        p, kb, _ = k.split("|")
        idx[(p, norm_kab(kb))] = f"{p}|{kb}"
    return lambda prov, nama: idx.get((str(prov), norm_kab(nama)))


def jsonl(f):
    with open(f, encoding="utf-8") as h:
        return [json.loads(l) for l in h if l.strip()]


def kumpul(baris, cari):
    """baris = [(provs, kab_nama, [bulan])] -> ({kab: set(bulan)}, n_baris, n_tak_cocok, n_tanpa_tanggal)."""
    out, n, tak, tgl = {}, 0, 0, 0
    for provs, nama, bln in baris:
        n += 1
        if not bln:
            tgl += 1
            continue
        k = next((x for x in (cari(p, nama) for p in provs) if x), None)
        if not k:
            tak += 1
            continue
        out.setdefault(k, set()).update(bln)
    return out, n, tak, tgl


def bangun():
    penduduk = json.load(open(os.path.join(AKAR, "public/data/penduduk.json")))
    riw = json.load(open(os.path.join(AKAR, "public/data/logbook_riwayat.json")))
    cari = penyelesai(penduduk)
    mentah = {}   # nama -> (baris [(provs, nama, bulan)], n_per_tahun)

    sk = [s for s in jsonl(f"{D}/sk_status.jsonl") if s.get("jenis") == "kekeringan"]
    b = []
    for s in sk:
        a = s.get("mulai") or s.get("tgl_sk")
        z = s.get("selesai") if s.get("selesai") and s.get("mulai") and s["selesai"] >= s["mulai"] else a
        kab = s["kab"].split("|", 1)[1] if s.get("kab") and "|" in s["kab"] else None
        b.append(([s["prov"]], kab, bulan_rentang(a, z) if a else None) if kab else ([], None, None))
    mentah["sk"] = (b, [s.get("tahun") for s in sk])

    rk = [r for r in jsonl(f"{D}/rekap_harian.jsonl") if r.get("jenis") == "kekeringan" and r.get("kab") and r.get("tanggal")]
    mentah["rekap"] = ([([r["prov"]], r["kab"], [r["tanggal"][:7]]) for r in rk], [r["tanggal"][:4] for r in rk])

    ep = [e for e in json.load(open(f"{D}/laphar_2022_2025.json"))["episode"] if e.get("jenis") == "kekeringan" and e.get("kab")]
    mentah["laphar"] = ([([e["prov"]], e["kab"].split("|", 1)[1], bulan_rentang(e["mulai"], e.get("terakhir") or e["mulai"])) for e in ep], [e["mulai"][:4] for e in ep])

    lb, lb_kenal = [], []
    for f in sorted(glob.glob(os.path.join(AKAR, "data/raw/logbook/arsip/*/kejadian.jsonl"))):
        for r in jsonl(f):
            if r.get("jenis") == "kekeringan":
                t = r.get("tgl_kejadian") or r.get("pertama_dicatat")
                for prov, nama in zip(r.get("prov_kode") or [None] * len(r.get("kabkota") or []), r.get("kabkota") or []):
                    lb.append(([prov], nama, [t[:7]] if t else None))
                    pc = r.get("pertama_dicatat")   # diketahui di akhir bulan b hanya bila pertama kali dicatat paling lambat bulan b (tanpa pertama_dicatat: tidak dianggap diketahui)
                    if t and pc and pc[:7] <= t[:7]:
                        lb_kenal.append(([prov], nama, [t[:7]]))
    mentah["logbook"] = (lb, [x[2][0][:4] for x in lb if x[2]])
    kenal = {"logbook": kumpul(lb_kenal, cari)[0]}

    tt = []
    for r in jsonl(f"{D}/sk_kekeringan_tidak_terbit.jsonl"):
        k = cari(r["prov"], r["kab"])
        if k:
            tt.append(k)

    sumber = {}
    for nama, (baris, thn) in mentah.items():
        kb, n, tak, tgl = kumpul(baris, cari)
        per_thn = {}
        for y in thn:
            if y:
                per_thn[str(y)] = per_thn.get(str(y), 0) + 1
        ya = sorted(y for y, v in per_thn.items() if v >= MIN_TAHUN)
        bln = [f"{y}-{m:02d}" for y in ya for m in range(1, 13)]
        if nama == "logbook":
            hb = riw["hari_bulan"]
            bln = [x for x in bln if hb.get(x[:4]) and hb[x[:4]][int(x[5:]) - 1] >= MIN_HARI * calendar.monthrange(int(x[:4]), int(x[5:]))[1]]
        sumber[nama] = {"baris": n, "tak_cocok": tak, "tanpa_tanggal_atau_kab": tgl, "kab": len(kb), "kab_bulan": sum(len(v) for v in kb.values()),
                        "kejadian_per_tahun": dict(sorted(per_thn.items())), "tahun_cakupan": ya, "bulan_cakupan": bln,
                        "kab_bulan_data": {k: sorted(v) for k, v in sorted(kb.items())}}
        # dikenal = bulan yang SUDAH diketahui di akhir bulan itu (bahan persistensi tanpa bocor). rekap/laphar: sama dengan data (laporan bertanggal);
        # sk: kosong, rentang SK ditetapkan di muka sehingga bulan lalu 'diketahui' dari tanggal mulai/selesai = artefak, persistensi SK tidak dipakai.
        sumber[nama]["kab_bulan_dikenal"] = {k: sorted(v) for k, v in sorted(kenal.get(nama, {} if nama == "sk" else kb).items())}
    gab = {}
    for s in sumber.values():
        for k, v in s["kab_bulan_data"].items():
            gab.setdefault(k, set()).update(v)
    isi = {"aturan": __doc__.split("Pakai:")[0].strip(), "tidak_terbit_kab": sorted(set(tt)), "sumber": sumber,
           "gabungan": {"kab": len(gab), "kab_bulan": sum(len(v) for v in gab.values())}}
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    json.dump(isi, open(KELUAR, "w", encoding="utf-8"), ensure_ascii=False)
    for n, s in sumber.items():
        print(f"{n}: {s['baris']} baris, {s['tak_cocok']} tak cocok, {s['tanpa_tanggal_atau_kab']} tanpa tanggal/kab -> {s['kab_bulan']} kab-bulan di {s['kab']} kab; cakupan {s['tahun_cakupan']} ({len(s['bulan_cakupan'])} bulan)")
    print(f"tidak terbit SK: {len(set(tt))} kab cocok; gabungan {isi['gabungan']['kab_bulan']} kab-bulan")


def uji():
    assert bulan_rentang("2019-07-15", "2019-10-31") == ["2019-07", "2019-08", "2019-09", "2019-10"]
    assert bulan_rentang("2019-12-01", "2020-01-02") == ["2019-12", "2020-01"] and bulan_rentang("2019-01-01", "2030-01-01") is None and bulan_rentang(None, "2019-01-01") is None
    assert bulan_rentang("2019-05-01", "2019-03-01") is None
    cari = penyelesai({"kec": {"33|Blora|X": 1, "33|Kota Magelang|Y": 1, "33|Magelang|Z": 1}})
    assert cari("33", "Kab. Blora") == "33|Blora" and cari("33", "Kota Magelang") == "33|Kota Magelang" and cari("33", "Magelang") == "33|Magelang" and cari("32", "Blora") is None
    kb, n, tak, tgl = kumpul([(["33"], "Blora", ["2019-07", "2019-08"]), (["33"], "Kab. Blora", ["2019-08"]), (["33"], "Hilang", ["2019-07"]), (["33"], "Blora", None)], cari)
    assert kb == {"33|Blora": {"2019-07", "2019-08"}} and (n, tak, tgl) == (4, 1, 1)   # dedup kab-bulan
    print("ok label")


if __name__ == "__main__":
    uji() if "uji" in sys.argv[1:] else (uji(), bangun())
