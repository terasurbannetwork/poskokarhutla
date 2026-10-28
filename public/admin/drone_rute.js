/* drone_rute.js: rute sapuan drone termal di atas sel gambut membara + KMZ WPML. Murni, tanpa DOM, diuji di node (tests/agen/drone-rute.test.mjs).
   Sel = pusat piksel 375 m dari bara.sel (scripts/data/harian.py). Jalur bolak-balik timur-barat, hanya di atas sel (celah antarsel dilompati),
   lebar lajur = tapak kamera termal x (1 - tumpang samping). Dipecah jadi beberapa penerbangan bila melebihi baterai.
   Format KMZ sama dengan scripts/bnpb/drone.py kmz() (wpmz/1.0.6, ketinggian relatif titik lepas landas). BELUM diuji di DJI Pilot 2 / FlightHub 2:
   lihat docs/bnpb/PANDUAN-DRONE-GAMBUT.md bagian "Yang belum diuji". */
(function (akar) {
"use strict";
const SISI = 375;   // m, piksel VIIRS (titik_unik.SEL)
/* Nilai awal per drone. fov_h = sudut pandang horizontal kamera termal (derajat), menit = waktu terbang aman satu baterai (sudah dikurangi cadangan).
   enum = droneEnumValue/droneSubEnumValue/payloadEnumValue WPML. SEMUA perlu dicek ke lembar spesifikasi dan KMZ ekspor DJI Pilot 2 untuk drone yang sama. */
const DRONE = {
  m3t: {nama: "DJI Mavic 3T", fov_h: 49, menit: 30, enum: [77, 1, 67]},
  m30t: {nama: "DJI Matrice 30T", fov_h: 49, menit: 28, enum: [67, 1, 53]},
  m4td: {nama: "DJI Matrice 4TD (dock)", fov_h: 45, menit: 30, enum: [100, 1, 99]},
};
const BAWAAN = {drone: "m3t", tinggi: 100, laju: 6, samping: 0.2, depan: 0.2, cadangan_menit: 3};
const MAKS_TINGGI = 120;   // m, batas ketinggian drone di Indonesia (PM 37/2020)

/* proyeksi datar lokal (cukup untuk wilayah beberapa km) */
const proyeksi = (lat0, lon0) => {
  const kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110540;
  return {ke: (lat, lon) => [(lon - lon0) * kx, (lat - lat0) * ky], dari: (x, y) => [lat0 + y / ky, lon0 + x / kx]};
};
const jarak = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/* tapak kamera termal di tanah (m): lebar (tegak lurus arah terbang) dan panjang (searah), sensor 640 x 512 = 5:4 */
function tapak(tinggi, fov_h) {
  const w = 2 * tinggi * Math.tan(fov_h * Math.PI / 360);
  return {lebar: w, panjang: w * 4 / 5};
}

/* sel [[lat, lon, persisten], ...] -> lajur [{y, ruas: [[x0, x1], ...]}] di koordinat lokal */
function lajur(selXY, jarakLajur) {
  const h = SISI / 2, ys = selXY.map(s => s[1]);
  const y0 = Math.min(...ys) - h, y1 = Math.max(...ys) + h, out = [];
  for (let y = y0 + Math.min(jarakLajur, SISI) / 2; y < y1; y += jarakLajur) {
    const iv = selXY.filter(s => Math.abs(s[1] - y) <= h).map(s => [s[0] - h, s[0] + h]).sort((a, b) => a[0] - b[0]);
    const ruas = [];
    for (const [a, b] of iv) { const r = ruas[ruas.length - 1]; if (r && a <= r[1] + 1) r[1] = Math.max(r[1], b); else ruas.push([a, b]); }
    if (ruas.length) out.push({y, ruas});
  }
  return out;
}

/* opsi: {drone, tinggi, laju, samping, depan, cadangan_menit, menit?, fov_h?, lepas: [lat, lon]?}
   -> {terbang: [{titik: [[lat, lon]], km, menit, foto}], km, menit, foto, jarak_lajur, jarak_foto, tapak, sel, lepas, peringatan: []} */
function rencana(sel, opsi = {}) {
  const o = {...BAWAAN, ...opsi}, d = DRONE[o.drone] || DRONE[BAWAAN.drone];
  const fov = o.fov_h ?? d.fov_h, menitBaterai = (o.menit ?? d.menit) - o.cadangan_menit, peringatan = [];
  if (!sel?.length) return null;
  const tinggi = Math.min(Math.max(o.tinggi, 30), MAKS_TINGGI);
  if (tinggi !== o.tinggi) peringatan.push(`Ketinggian dibatasi ${tinggi} m (rentang 30 sampai ${MAKS_TINGGI} m).`);
  const lat0 = sel.reduce((a, s) => a + s[0], 0) / sel.length, lon0 = sel.reduce((a, s) => a + s[1], 0) / sel.length, P = proyeksi(lat0, lon0);
  const xy = sel.map(s => P.ke(s[0], s[1])), t = tapak(tinggi, fov);
  const jarakLajur = t.lebar * (1 - o.samping), jarakFoto = t.panjang * (1 - o.depan);
  /* ruas berurutan bolak-balik: lajur genap barat ke timur, ganjil timur ke barat */
  const ruas = [];
  lajur(xy, jarakLajur).forEach((l, i) => {
    const r = i % 2 ? [...l.ruas].reverse().map(([a, b]) => [b, a]) : l.ruas;
    for (const [a, b] of r) ruas.push([[a, l.y], [b, l.y]]);
  });
  const lepas = o.lepas ? P.ke(o.lepas[0], o.lepas[1]) : ruas[0][0];
  const maksM = Math.max(1, menitBaterai) * 60 * o.laju;   // meter terbang satu baterai (lepas landas dan mendarat ~1 menit dihitung di cadangan)
  /* ruas yang lebih panjang dari sepertiga jangkauan dipotong, supaya lajur panjang bisa dibagi ke beberapa baterai */
  for (let k = 0; k < ruas.length; k++) {
    const [a, b] = ruas[k], pjg = jarak(a, b), n = Math.ceil(pjg / (maksM / 3));
    if (n > 1) ruas.splice(k, 1, ...Array.from({length: n}, (_, m) => [0, 1].map(e => [a[0] + (b[0] - a[0]) * (m + e) / n, a[1] + (b[1] - a[1]) * (m + e) / n])));
  }
  const terbang = [];
  let kini = null;
  const tutup = () => { if (!kini) return; const akhir = kini.titik[kini.titik.length - 1]; kini.m += jarak(akhir, lepas); terbang.push(kini); kini = null; };
  for (const r of ruas) {
    const pjg = jarak(r[0], r[1]);
    if (kini) {
      const akhir = kini.titik[kini.titik.length - 1], tambah = jarak(akhir, r[0]) + pjg;
      if (kini.m + tambah + jarak(r[1], lepas) > maksM) tutup();
      else { kini.titik.push(r[0], r[1]); kini.m += tambah; kini.sapu += pjg; continue; }
    }
    const pergi = jarak(lepas, r[0]);
    if (pergi + pjg + jarak(r[1], lepas) > maksM) peringatan.push("Satu lajur lebih panjang dari jangkauan satu baterai; pindahkan titik lepas landas lebih dekat.");
    kini = {titik: [r[0], r[1]], m: pergi + pjg, sapu: pjg};
  }
  tutup();
  const keLL = p => P.dari(p[0], p[1]).map(v => Math.round(v * 1e7) / 1e7);
  const hasil = terbang.map(f => ({titik: f.titik.map(keLL), km: f.m / 1000, menit: f.m / o.laju / 60 + o.cadangan_menit, foto: Math.ceil(f.sapu / jarakFoto) + 1}));
  if (jarak(lepas, ruas[0][0]) > 2000) peringatan.push(`Titik lepas landas ${(jarak(lepas, ruas[0][0]) / 1000).toFixed(1).replace(".", ",")} km dari lajur pertama. Pastikan izin terbang di luar jarak pandang (BVLOS).`);
  return {terbang: hasil, km: hasil.reduce((a, f) => a + f.km, 0), menit: hasil.reduce((a, f) => a + f.menit, 0), foto: hasil.reduce((a, f) => a + f.foto, 0),
    jarak_lajur: jarakLajur, jarak_foto: jarakFoto, tapak: t, tinggi, laju: o.laju, sel: sel.length, lepas: keLL(lepas), drone: d, enum: o.enum || d.enum, peringatan};
}

const xml = s => String(s).replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
/* satu penerbangan -> [[nama, isi]] untuk zip: wpmz/template.kml + wpmz/waylines.wpml. Gimbal tegak lurus di titik pertama, lalu foto termal + lebar
   tiap jarak_foto meter sepanjang rute (actionTrigger multipleDistance). */
function wpml(r, i, nama) {
  const f = r.terbang[i], [de, ds, pe] = r.enum;
  const cfg = `<wpml:missionConfig><wpml:flyToWaylineMode>safely</wpml:flyToWaylineMode><wpml:finishAction>goHome</wpml:finishAction>
<wpml:exitOnRCLost>executeLostAction</wpml:exitOnRCLost><wpml:executeRCLostAction>goBack</wpml:executeRCLostAction>
<wpml:takeOffSecurityHeight>20</wpml:takeOffSecurityHeight><wpml:globalTransitionalSpeed>${r.laju}</wpml:globalTransitionalSpeed>
<wpml:globalRTHHeight>${r.tinggi}</wpml:globalRTHHeight>
<wpml:droneInfo><wpml:droneEnumValue>${de}</wpml:droneEnumValue><wpml:droneSubEnumValue>${ds}</wpml:droneSubEnumValue></wpml:droneInfo>
<wpml:payloadInfo><wpml:payloadEnumValue>${pe}</wpml:payloadEnumValue><wpml:payloadPositionIndex>0</wpml:payloadPositionIndex></wpml:payloadInfo>
</wpml:missionConfig>`;
  const akhir = f.titik.length - 1;
  const aksi = `<wpml:actionGroup><wpml:actionGroupId>0</wpml:actionGroupId><wpml:actionGroupStartIndex>0</wpml:actionGroupStartIndex><wpml:actionGroupEndIndex>0</wpml:actionGroupEndIndex>
<wpml:actionGroupMode>sequence</wpml:actionGroupMode><wpml:actionTrigger><wpml:actionTriggerType>reachPoint</wpml:actionTriggerType></wpml:actionTrigger>
<wpml:action><wpml:actionId>0</wpml:actionId><wpml:actionActuatorFunc>gimbalRotate</wpml:actionActuatorFunc><wpml:actionActuatorFuncParam>
<wpml:gimbalRotateMode>absoluteAngle</wpml:gimbalRotateMode><wpml:gimbalPitchRotateEnable>1</wpml:gimbalPitchRotateEnable><wpml:gimbalPitchRotateAngle>-90</wpml:gimbalPitchRotateAngle>
<wpml:gimbalRollRotateEnable>0</wpml:gimbalRollRotateEnable><wpml:gimbalRollRotateAngle>0</wpml:gimbalRollRotateAngle><wpml:gimbalYawRotateEnable>0</wpml:gimbalYawRotateEnable>
<wpml:gimbalYawRotateAngle>0</wpml:gimbalYawRotateAngle><wpml:gimbalRotateTimeEnable>0</wpml:gimbalRotateTimeEnable><wpml:gimbalRotateTime>0</wpml:gimbalRotateTime>
<wpml:payloadPositionIndex>0</wpml:payloadPositionIndex></wpml:actionActuatorFuncParam></wpml:action></wpml:actionGroup>
<wpml:actionGroup><wpml:actionGroupId>1</wpml:actionGroupId><wpml:actionGroupStartIndex>0</wpml:actionGroupStartIndex><wpml:actionGroupEndIndex>${akhir}</wpml:actionGroupEndIndex>
<wpml:actionGroupMode>sequence</wpml:actionGroupMode><wpml:actionTrigger><wpml:actionTriggerType>multipleDistance</wpml:actionTriggerType>
<wpml:actionTriggerParam>${Math.max(1, Math.round(r.jarak_foto))}</wpml:actionTriggerParam></wpml:actionTrigger>
<wpml:action><wpml:actionId>0</wpml:actionId><wpml:actionActuatorFunc>takePhoto</wpml:actionActuatorFunc><wpml:actionActuatorFuncParam>
<wpml:fileSuffix>gambut</wpml:fileSuffix><wpml:payloadPositionIndex>0</wpml:payloadPositionIndex><wpml:useGlobalPayloadLensIndex>0</wpml:useGlobalPayloadLensIndex>
<wpml:payloadLensIndex>ir,wide</wpml:payloadLensIndex></wpml:actionActuatorFuncParam></wpml:action></wpml:actionGroup>`;
  const tanda = f.titik.map(([la, lo], k) => `<Placemark><Point><coordinates>${lo.toFixed(7)},${la.toFixed(7)}</coordinates></Point><wpml:index>${k}</wpml:index>
<wpml:executeHeight>${r.tinggi}</wpml:executeHeight><wpml:waypointSpeed>${r.laju}</wpml:waypointSpeed>
<wpml:waypointHeadingParam><wpml:waypointHeadingMode>followWayline</wpml:waypointHeadingMode><wpml:waypointHeadingAngle>0</wpml:waypointHeadingAngle>
<wpml:waypointHeadingPathMode>followBadArc</wpml:waypointHeadingPathMode></wpml:waypointHeadingParam>
<wpml:waypointTurnParam><wpml:waypointTurnMode>toPointAndStopWithDiscontinuityCurvature</wpml:waypointTurnMode><wpml:waypointTurnDampingDist>0</wpml:waypointTurnDampingDist></wpml:waypointTurnParam>
<wpml:useStraightLine>1</wpml:useStraightLine>${k === 0 ? aksi : ""}</Placemark>`).join("");
  const kepala = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.6"><Document>';
  const n = xml(nama);
  return [["wpmz/template.kml", `${kepala}<wpml:author>Centurisk97</wpml:author>${cfg}<Folder><name>${n}</name></Folder></Document></kml>`],
    ["wpmz/waylines.wpml", `${kepala}${cfg}<Folder><wpml:templateId>0</wpml:templateId><wpml:executeHeightMode>relativeToStartPoint</wpml:executeHeightMode>`
      + `<wpml:waylineId>0</wpml:waylineId><wpml:distance>${Math.round(f.km * 1000)}</wpml:distance><wpml:duration>${Math.round(f.menit * 60)}</wpml:duration>`
      + `<wpml:autoFlightSpeed>${r.laju}</wpml:autoFlightSpeed>${tanda}</Folder></Document></kml>`]];
}

const api = {DRONE, BAWAAN, MAKS_TINGGI, SISI, tapak, lajur, rencana, wpml, proyeksi};
if (typeof module !== "undefined" && module.exports) module.exports = api; else akar.DroneRute = api;
})(typeof window !== "undefined" ? window : globalThis);
