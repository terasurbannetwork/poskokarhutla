"""Tarik DIBI (Superset dasbor publik) tanpa penggabungan baris: kelompok (dt, kab, jenis, kategori, is_bencana).
Simpan ke hasil/dibi_mentah_2024_2026.json. Pakai: python tarik_dibi.py"""
import json, urllib.request, datetime as dt, os, sys, time
URL = "https://dibi.bnpb.go.id/api/v1/chart/data"
AK = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(AK, "hasil", "dibi_mentah_2024_2026.json")
def q(columns, metrics, filters, limit=50000):
    badan = {"datasource": {"id": 1, "type": "table"}, "form_data": {"slice_id": 1, "dashboardId": 1},
             "queries": [{"columns": columns, "metrics": [{"expressionType": "SQL", "sqlExpression": e, "label": l} for l, e in metrics],
                          "filters": filters, "row_limit": limit, "orderby": []}], "result_format": "json", "result_type": "full"}
    rq = urllib.request.Request(URL, json.dumps(badan).encode(), {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"})
    return json.load(urllib.request.urlopen(rq, timeout=300))["result"][0]["data"]
if __name__ == "__main__":
    # periksa kolom
    try:
        r = q(["dt","provinsi","kabupaten","id_kab_bps","jenis_bencana"],[("n","COUNT(*)")],[{"col":"tahun","op":"IN","val":[2026]}],5)
        print(r[:1])
    except Exception as e:
        print("GAGAL", e); sys.exit(1)

def tarik():
    kol = ["dt","provinsi","kabupaten","id_kab_bps","jenis_bencana","kategori_bencana","is_bencana","id_tipe_bencana"]
    met = [(c, f"SUM({c})") for c in ["jumlah_kejadian","meninggal","hilang","luka_sakit","menderita","mengungsi","menderita_mengungsi",
           "rumah_rusak_berat","rumah_rusak_sedang","rumah_rusak_ringan","rumah_terendam","pendidikan_rusak","rumah_ibadat_rusak",
           "fasyankes_rusak","fasum_rusak","kantor_rusak","jembatan_rusak"]] + [("n_baris","COUNT(*)")]
    semua = []
    for th in (2024, 2025, 2026):
        b = q(kol, met, [{"col":"tahun","op":"IN","val":[th]}])
        print(th, len(b)); assert len(b) < 50000
        semua += b; time.sleep(1)
    json.dump({"ditarik": dt.datetime.now().isoformat(timespec="minutes"), "sumber": URL, "kolom": kol+[m[0] for m in met], "data": semua},
              open(OUT, "w", encoding="utf8"), ensure_ascii=False)
