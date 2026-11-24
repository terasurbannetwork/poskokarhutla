import json, ssl, urllib.request, sys
URL="https://dibi.bnpb.go.id/api/v1/chart/data"
ctx=ssl.create_default_context()
def q(kolom, metrik, saring=[], batas=50000):
    b={"datasource":{"id":1,"type":"table"},"form_data":{"slice_id":1,"dashboardId":1},
       "queries":[{"columns":kolom,"metrics":[{"expressionType":"SQL","sqlExpression":e,"label":l} for l,e in metrik],
                   "filters":saring,"row_limit":batas,"orderby":[]}],"result_format":"json","result_type":"full"}
    r=urllib.request.Request(URL,json.dumps(b).encode(),{"Content-Type":"application/json","User-Agent":"Mozilla/5.0"})
    return json.load(urllib.request.urlopen(r,timeout=300,context=ctx))["result"][0]["data"]
INT="(COALESCE(meninggal,0)>=30 OR COALESCE(rumah_rusak_berat,0)>=600)"
M=[("baris","COUNT(*)"),("kej","SUM(jumlah_kejadian)"),("int_baris",f"SUM(CASE WHEN {INT} THEN 1 ELSE 0 END)"),
   ("md","SUM(meninggal)"),("md_int",f"SUM(CASE WHEN {INT} THEN meninggal ELSE 0 END)"),
   ("rb","SUM(rumah_rusak_berat)"),("rb_int",f"SUM(CASE WHEN {INT} THEN rumah_rusak_berat ELSE 0 END)"),
   ("rs","SUM(rumah_rusak_sedang)"),("rs_int",f"SUM(CASE WHEN {INT} THEN rumah_rusak_sedang ELSE 0 END)"),
   ("rr","SUM(rumah_rusak_ringan)"),("rr_int",f"SUM(CASE WHEN {INT} THEN rumah_rusak_ringan ELSE 0 END)"),
   ("ung","SUM(mengungsi)"),("ung_int",f"SUM(CASE WHEN {INT} THEN mengungsi ELSE 0 END)"),
   ("md_rows","SUM(CASE WHEN COALESCE(meninggal,0)>=30 THEN 1 ELSE 0 END)"),("rb_rows","SUM(CASE WHEN COALESCE(rumah_rusak_berat,0)>=600 THEN 1 ELSE 0 END)")]
out={}
out["tahun"]=q(["tahun"],M)
out["jenis"]=q(["jenis_bencana"],M)
out["total"]=q([],M)
json.dump(out,open(sys.argv[1],"w"),indent=0)
print(json.dumps(out["total"]))
