/* SIPPA: pembungkus skrip klasik. Sumber pemilik: data/kajian-bnpb/pipa/sumber/Karhutla_Decision_Dashboard.html baris 9-299; angka dan rumus tidak diubah.
   Perubahan hanya tiga jenis, semuanya bertanda SIPPA: (pembungkus, gerbangSippa, perbaikan teks G23).
   Karhutla Decision Studio, v1.0, transparent pre-FEED planning model.
   No value below is field-verified, a vendor duty curve, or an award price.
   Designed to run offline with bundled data; no network requests. */
(function(root){
 'use strict';
 const G=9.81, RHO=1000;
 const fx=(v,d)=>new Intl.NumberFormat('id-ID',{minimumFractionDigits:d,maximumFractionDigits:d}).format(v); //SIPPA: pembulatan teks tampil id-ID (pengganti toFixed); tidak dipakai untuk hitungan
 const HELI={kode:'sippa.heli.biaya_jam',status:'menunggu',nilai:null,pembanding:'> Rp200 juta per sorti satu jam (BNPB, September 2023)'}; //SIPPA: G13/G23 slot biaya heli menunggu angka BNPB; menggantikan placeholder pemilik, tidak masuk TCO
 const NAMA_SIPPA={ELEC:'Pompa elektrik',GEN:'Genset pendukung',BOOST:'Booster dan kontrol',SPARE:'Pompa cadangan',STEEL:'Pipa baja berlapis',RGB:'Drone kamera RGB',BURIAL:'Penanaman pipa dengan proteksi',RAISED:'Penyangga pipa ditinggikan',ARMOR:'Proteksi lokal segmen kritis',HOT:'Spool ujung panas',HOTREMOTE:'Selang tambahan ujung jauh dari titik panas',SEC:'Pengamanan aset',WELL:'Sumur dan survei hidrogeologi',POND:'Embung tampungan tambahan',INTAKE:'Intake sungai terlindung',TRASH:'Pompa banjir terpisah',FORWARD:'Gudang depan dan area stok',HUB:'Hub transfer air dan darat',TOOLS2:'Perangkat inspeksi prediktif',AIRCTRL:'Koordinasi udara dan komunikasi',DRILL2:'Peralatan latihan tambahan'}; //SIPPA: G23 nama item yang di berkas pemilik jatuh ke kode mentah
 const BASES=[
   {id:'portable', name:'Portable', baseline:'S1', main:800, branches:400, hdpe:0, crewBase:8, mobilization:0.8},
   {id:'semi', name:'Semi-permanen', baseline:'S2', main:1500, branches:500, hdpe:1500, crewBase:10, mobilization:1.5},
   {id:'backbone', name:'Backbone permanen', baseline:'S3', main:5000, branches:900, hdpe:5000, crewBase:12, mobilization:2.5}
 ];
 const PIPE={
   hdpe:{name:'HDPE PE100',c:140, factor:1, install:'bantalan/penanaman berizin; butt/electrofusion; fitting transisi',heat:'Tidak boleh dibiarkan terpapar api/bara', flexibility:.55},
   layflat:{name:'Layflat kelas pemadam',c:120,factor:.45,install:'gelar sementara, coupling terkunci, inspeksi sebelum isi',heat:'Harus diamankan dari panas langsung',flexibility:1},
   steel:{name:'Pipa baja berlapis',c:120,factor:2.6,install:'spool/flensa dan proteksi korosi; dudukan',heat:'Tahan suhu relatif lebih baik, namun perlu inspeksi sambungan',flexibility:.15},
   hybrid:{name:'HDPE + layflat + spools logam',c:138,factor:1.05,install:'HDPE backbone, layflat untuk cabang; segmen baja di hotspot',heat:'Jaga HDPE tetap terlindung; logam pada ujung panas',flexibility:.8}
 };
 const COST={hdpe200:1162050,hdpe110:351350,layflat100:275000,layflat65:165000,steel160:3100000,adapter:2400000,metalHot:9000000,burial:225000,raised:880000,security:110000000,
  dieselPump:450000000,gasPump:190781250,electricPump:420000000,backupGenset:270000000,trashPump:250000000,
  thermalDrone:111217000,rgbDrone:53000000,droneBattery:42000000,
  canopy:400000000,post:600000000,container:100000000,fuelSafe:50000000,
  sensor:12000000, gateway:25000000,waterGauge:18000000,solarPack:30000000,
  canalBlock:65000000,spillway:125000000,agri:140000000,
  manifold:25000000,coupling:2400000,lance:4200000,nozzle:6500000,suction:28000000,filter:19000000,kitValve:13500000,flowmeter:18000000,pressure:8500000,
  survey:180000000,permit:160000000,installation:260000000,mobilization:210000000,boat:230000000,truck:440000000,ppe:140000000,tools:120000000,abTrial:250000000,training:85000000, communications:38000000};
 const QBASE = [
  {id:'GAS',name:'Pompa pemadam portable bensin',qty:[2,1,2], unit:'unit', p:COST.gasPump,origin:'Penawaran publik terdahulu; reconfirm RFQ'},
  {id:'DIESEL',name:'Pompa diesel utama skid + panel',qty:[0,1,2],unit:'unit',p:COST.dieselPump,origin:'Asumsi engineering'},
  {id:'HD200',name:'HDPE OD200 PN16 SDR11',qty:[0,1500,5000],unit:'m',p:COST.hdpe200,origin:'Harga pemasok terdahulu, tidak final'},
  {id:'HD110',name:'HDPE OD110 PN16 SDR11 cabang',qty:[0,500,2000],unit:'m',p:COST.hdpe110,origin:'Harga pemasok terdahulu, tidak final'},
  {id:'LAY100',name:'Layflat DN100',qty:[800,400,500],unit:'m',p:COST.layflat100,origin:'Asumsi engineering'},
  {id:'LAY65',name:'Layflat DN65',qty:[400,500,900],unit:'m',p:COST.layflat65,origin:'Asumsi engineering'},
  {id:'MAN',name:'Manifold multioutlet',qty:[2,4,10],unit:'set',p:COST.manifold,origin:'Asumsi engineering'},
  {id:'COU',name:'Coupling/adaptor',qty:[20,25,45],unit:'set',p:COST.coupling,origin:'Asumsi engineering'},
  {id:'LAN',name:'Lance injeksi (uji desain)',qty:[6,12,24],unit:'unit',p:COST.lance,origin:'Asumsi engineering'},
  {id:'NOZ',name:'Nozzle pemadam',qty:[6,12,24],unit:'unit',p:COST.nozzle,origin:'Asumsi engineering'},
  {id:'SUC',name:'Suction, foot valve, strainer',qty:[2,2,4],unit:'set',p:COST.suction,origin:'Asumsi engineering'},
  {id:'FIL',name:'Filter/maintenance bypass',qty:[2,2,4],unit:'unit',p:COST.filter,origin:'Asumsi engineering'},
  {id:'VAL',name:'Check/isolation/air-release',qty:[2,8,20],unit:'set',p:COST.kitValve,origin:'Asumsi engineering'},
  {id:'FLO',name:'Flowmeter totalizer',qty:[2,4,10],unit:'unit',p:COST.flowmeter,origin:'Asumsi engineering'},
  {id:'PRS',name:'Sensor tekanan/vakum',qty:[4,8,20],unit:'unit',p:COST.pressure,origin:'Asumsi engineering'},
  {id:'WTD',name:'Node WTD dan suhu multi-kedalaman',qty:[8,20,50],unit:'unit',p:COST.sensor,origin:'Asumsi engineering'},
  {id:'GAT',name:'Gateway telemetri',qty:[1,2,4],unit:'unit',p:COST.gateway,origin:'Asumsi engineering'},
  {id:'DRONE',name:'Drone kamera termal enterprise',qty:[1,1,2],unit:'unit',p:COST.thermalDrone,origin:'Harga publik terdahulu; RFQ'},
  {id:'DBAT',name:'Baterai/charger/transport drone',qty:[1,1,2],unit:'set',p:COST.droneBattery,origin:'Asumsi engineering'},
  {id:'SOLAR',name:'PV + baterai sistem sensor',qty:[1,3,7],unit:'set',p:COST.solarPack,origin:'Asumsi engineering'},
  {id:'PUMPHS',name:'Rumah pompa elevasi aman',qty:[0,1,2],unit:'unit',p:COST.canopy,origin:'Asumsi engineering'},
  {id:'POST',name:'Pos pemadam + gudang',qty:[0,1,2],unit:'unit',p:COST.post,origin:'Asumsi engineering'},
  {id:'CONT',name:'Kontainer terkunci',qty:[1,1,1],unit:'unit',p:COST.container,origin:'Asumsi engineering'},
  {id:'TANK',name:'Penyimpanan BBM bunding',qty:[1,2,3],unit:'set',p:COST.fuelSafe,origin:'Asumsi engineering'},
  {id:'COM',name:'Radio / komunikasi backhaul',qty:[1,2,3],unit:'paket',p:COST.communications,origin:'Asumsi engineering'},
  {id:'CANAL',name:'Sekat kanal disetujui',qty:[2,6,12],unit:'unit',p:COST.canalBlock,origin:'Asumsi engineering'},
  {id:'SPILL',name:'Spillway/struktur air terkendali',qty:[0,2,6],unit:'unit',p:COST.spillway,origin:'Asumsi engineering'},
  {id:'FLOOD',name:'Sensor tinggi banjir',qty:[2,5,10],unit:'unit',p:COST.waterGauge,origin:'Asumsi engineering'},
  {id:'AGRI',name:'Pilot pertanian tanpa bakar',qty:[0,1,3],unit:'paket',p:COST.agri,origin:'Asumsi engineering'},
  {id:'SURV',name:'Survei GIS/gambut/topografi',qty:[1,1,2],unit:'paket',p:COST.survey,origin:'Asumsi engineering'},
  {id:'PERM',name:'Kajian lingkungan/izin',qty:[1,1,2],unit:'paket',p:COST.permit,origin:'Asumsi engineering'},
  {id:'INST',name:'Instalasi dan pengujian jaringan',qty:[1,2,6],unit:'paket',p:COST.installation,origin:'Asumsi engineering'},
  {id:'MOB',name:'Mobilisasi ke lokasi',qty:[1,2,5],unit:'paket',p:COST.mobilization,origin:'Asumsi engineering'},
  {id:'BOAT',name:'Perahu rescue/logistik',qty:[1,1,2],unit:'unit',p:COST.boat,origin:'Asumsi engineering'},
  {id:'TRUCK',name:'Pickup 4×4 pendukung',qty:[1,1,2],unit:'unit',p:COST.truck,origin:'Asumsi engineering'},
  {id:'PPE',name:'Paket APD dan P3K regu',qty:[1,2,3],unit:'paket',p:COST.ppe,origin:'Asumsi engineering'},
  {id:'TOOL',name:'Tools/spares awal',qty:[1,2,4],unit:'paket',p:COST.tools,origin:'Asumsi engineering'},
  {id:'AB',name:'Pilot A/B test dan sensor uji',qty:[1,2,3],unit:'paket',p:COST.abTrial,origin:'Asumsi engineering'},
  {id:'TRAIN',name:'Commissioning dan latihan awal',qty:[1,2,3],unit:'paket',p:COST.training,origin:'Asumsi engineering'}
 ];
 const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
 const N=x=>Number.isFinite(+x)?+x:0;
 function money(v){return 'Rp'+Math.round(v).toLocaleString('id-ID');}
 function pct(v){return fx((v*100),1)+'%';} //SIPPA: toFixed diganti fx (Intl id-ID), angka sama
 function getBase(id){return BASES.find(b=>b.id===id)||BASES[1];}
 function defaultState(){return {site:'kanal',strategy:'semi',tactic:'hybrid',airSupport:'none',waterSource:'canal',waterRights:'pending',ecoPermit:'pending',flood:'seasonal',fireType:'peat',fireLevel:'medium',peatDepth:'deep',wtd:'dry',access:'mixed',waterQ:70,envReserve:10,area:5,waterPerHa:600,flowLPM:2000,pipeTemp:35,operationHours:240,daysPerYear:35,networkLength:1500,branchLength:500,pipe:'hybrid',od:200,sdr:11,alignment:'protected',heat:'moderate',elevation:10,minorK:5,pressureEnd:2,hasBooster:false,pump:'diesel',pumpCount:1,redundancy:'cold',pumpEff:0.65,crew:10,wage:250000,shiftHours:8,crewSpeed:75,security:'high',tenure:'pending',rewetting:'yes',canalBlocks:6,agriculture:'none',floodUse:'monitor',drone:'thermal',detection:'integrated',telemetry:'lora',sensorTier:'extended',logistics:'split',maint:'preventive',drill:'annual',hotend:'metal',horizon:5,discountRate:8,annualAvoidedLoss:0,verifiedHaAnnual:0,helicopterHours:0,contingency:20,priceFactor:1,fuelPrice:14500,petrolPrice:15500,electricPrice:1800,weightCost:25,weightSafety:30,weightEffectiveness:25,weightAccess:10,weightEnvironment:10};}
 function buildBoQ(s){
  const base=getBase(s.strategy), idx=BASES.indexOf(base), o={};
  const set=(id,q,p,why)=>{ if(q<=0){delete o[id];return;} if(q>0) o[id]={id,name:(QBASE.find(x=>x.id===id)||{}).name||NAMA_SIPPA[id]||id,q,price:p,origin:why||'Estimasi engineering / configurable'};}; //SIPPA: G23 nama cadangan NAMA_SIPPA
  for (const x of QBASE) set(x.id,x.qty[idx],x.p,x.origin);
  let L=clamp(N(s.networkLength),0,50000), br=clamp(N(s.branchLength),0,20000);
  const ratio = Math.pow(N(s.od)/200,2)* (s.sdr==='17'?0.68:1), priceHD=COST.hdpe200*ratio;
  const hp=L*(s.pipe==='hybrid'?.78:s.pipe==='hdpe'?1:0);
  const lay=L*(s.pipe==='hybrid'?.22:s.pipe==='layflat'?1:0);
  const steel=L*(s.pipe==='steel'?1:0);
  set('HD200',hp,priceHD,'Model pengali luas material vs OD200; BUKAN harga pasar');
  set('LAY100',lay,COST.layflat100*Math.pow(N(s.od)/100,1.15),'Asumsi harga berbasis DN100 dikalikan diameter; perlu vendor untuk ukuran yang dipilih');
  if(o.LAY100)o.LAY100.name=`Layflat nominal ~${N(s.od)} mm (ukuran & rating wajib OEM)`;
  set('STEEL',steel,COST.steel160*Math.pow(N(s.od)/160,1.6),'Asumsi pengali diameter; hanya pendekatan');
  set('HD110',s.strategy==='portable'?0:br*.45,COST.hdpe110,'Harga publik terdahulu untuk OD110 (asumsi quantity)');
  set('LAY65',br*(s.strategy==='portable'?1:.55),COST.layflat65,'Estimasi engineer');
  const pumpCt=Math.max(1,Math.round(N(s.pumpCount)));
  set('GAS',s.pump==='gas'?pumpCt:s.pump==='hybrid'?1:0,COST.gasPump,'Harga publik VE1500W (duty curve berbeda)');
  set('DIESEL',s.pump==='diesel'?pumpCt:s.pump==='hybrid'?Math.max(1,pumpCt-1):0,COST.dieselPump,'Asumsi pompa diesel, vendor Q-H diperlukan');
  set('ELEC',s.pump==='electric'?pumpCt:0,COST.electricPump,'Asumsi pompa elektrik, daya listrik harus ada');
  set('GEN',s.pump==='electric'&&s.site==='remote'?1:0,COST.backupGenset,'Asumsi genset pendukung lokasi terpencil');
  if(s.hasBooster)set('BOOST',1,390000000,'Booster & controls konsep; kurva series hydraulic wajib');
  const emergency=s.redundancy==='installed'?1:s.redundancy==='cold'&&pumpCt===1?1:0;
  set('SPARE',emergency,s.pump==='gas'?COST.gasPump: s.pump==='electric'?COST.electricPump:COST.dieselPump,'Pompa cadangan; belum tentu ready for duty');
  const branches=Math.max(1,Math.ceil(br/125));
  set('MAN',branches,COST.manifold,'Asumsi 1 manifold/125 m total cabang');
  set('COU',Math.max(4,Math.ceil(lay/100)+Math.ceil(hp/100)+branches*2),COST.coupling,'Tergantung tipe coupling; QTY konsep bukan detail baut');
  set('LAN',s.tactic==='surface'||s.tactic==='rewetonly'?0:Math.max(2,Math.ceil(N(s.crew)/2))*(s.tactic==='injection'?1.3:1),COST.lance);
  set('NOZ',s.tactic==='rewetonly'?0:Math.max(2,Math.ceil(N(s.crew)/2)),COST.nozzle);
  set('SUC',pumpCt,COST.suction);
  set('FIL',pumpCt,COST.filter);
  set('VAL',Math.max(3,Math.ceil(L/300)+branches),COST.kitValve);
  set('FLO',Math.max(1,pumpCt),COST.flowmeter);
  set('PRS',Math.max(2,2*pumpCt+Math.ceil(L/1000)),COST.pressure);
  set('WTD',s.sensorTier==='none'?0:s.sensorTier==='basic'?Math.max(4,Math.ceil(L/350)):Math.max(8,Math.ceil(L/150)),COST.sensor);
  set('GAT',s.telemetry==='none'?0:Math.max(1,Math.ceil(L/2000)),COST.gateway);
  set('DRONE',s.drone==='thermal'?1:0,COST.thermalDrone);
  set('RGB',s.drone==='rgb'?1:0,COST.rgbDrone);
  set('DBAT',s.drone==='none'?0:1,COST.droneBattery);
  set('SOLAR',s.telemetry==='none'?0:Math.max(1,Math.ceil(L/850)),COST.solarPack);
  set('PUMPHS',s.strategy==='portable'?0:Math.max(1,Math.ceil(L/3500)),COST.canopy);
  set('POST',s.strategy==='portable'?0:Math.max(1,Math.ceil(L/4500)),COST.post);
  set('CONT',1,COST.container);
  set('TANK',Math.max(1,Math.ceil(pumpCt/2)),COST.fuelSafe);
  set('COM',s.telemetry==='satellite'?2:s.telemetry==='none'?1:1,COST.communications);
  set('CANAL',s.rewetting==='yes'?Math.max(0,Math.round(N(s.canalBlocks))):0,COST.canalBlock);
  set('SPILL',s.rewetting==='yes'?Math.ceil(Math.max(0,N(s.canalBlocks))/3):0,COST.spillway);
  set('FLOOD',s.flood==='high'||s.floodUse!=='none'?Math.max(2,Math.ceil(L/600)):0,COST.waterGauge);
  set('AGRI',s.agriculture==='pilot'?1:s.agriculture==='network'?3:0,COST.agri);
  set('SURV',1,COST.survey);
  set('PERM',1,COST.permit);
  const groundFactor=s.access==='road'?0.8:s.access==='boat'?1.15:s.access==='remote'?1.75:1;
  const peatFactor=s.peatDepth==='deep'?1.2:s.peatDepth==='mid'?1.07:1;
  const installRatio=(L/2000*.55+br/800*.2+.25);
  set('INST',installRatio*groundFactor*peatFactor,COST.installation,'Asumsi instalasi bergantung panjang, akses & ketebalan gambut');
  set('MOB',base.mobilization*groundFactor,COST.mobilization);
  set('BOAT',s.access==='boat'||s.access==='mixed'?1:s.access==='remote'?2:0,COST.boat);
  set('TRUCK',s.access==='road'?1:s.access==='mixed'?1:s.access==='remote'?1:0,COST.truck);
  set('PPE',Math.max(1,Math.ceil(N(s.crew)/20)),COST.ppe);
  set('TOOL',s.strategy==='backbone'?3:s.strategy==='semi'?2:1,COST.tools);
  set('AB',1,COST.abTrial);
  set('TRAIN',s.drill==='quarterly'?2:1,COST.training);
  if(s.alignment==='buried')set('BURIAL',L,COST.burial*groundFactor*peatFactor,'Biaya tanam dengan proteksi, survei izin dan geoteknik perlu DED');
  if(s.alignment==='raised')set('RAISED',L,COST.raised*peatFactor,'Elevated supports/fondasi gabungan; desain beban banjir');
  if(s.alignment==='protected')set('ARMOR',Math.min(L,Math.max(25,L*.10)),COST.burial*1.35,'Proteksi lokal segmen kritis, bukan otomatis semua pipa');
  if(s.hotend==='metal')set('HOT',Math.max(10,5*Math.ceil(N(s.crew)/2)),COST.metalHot,'Spool ujung panas dan insulasi lokal; desain termal wajib');
  if(s.hotend==='hdpe')set('HOT',0,COST.metalHot);
  if(s.hotend==='remote')set('HOTREMOTE',60,COST.layflat65,'Selang tambahan menjauh dari titik panas, harga asumsi');
  if(s.security==='high')set('SEC',1,COST.security,'Kunci, CCTV/asset tag/anchor dan fence; asumsi');
  if(s.waterSource==='well')set('WELL',1,950000000,'Asumsi survei+sumur; kajian hidrogeologi dan izin wajib');
  if(s.waterSource==='embung')set('POND',1,540000000,'Asumsi tampungan tambahan; butuh desain hidrologi');
  if(s.waterSource==='river')set('INTAKE',1,160000000,'Asumsi intake sungai terlindung');
  if(s.floodUse==='pump')set('TRASH',1,COST.trashPump,'Pompa banjir berbeda duty point; izin pelepasan air');
  if(s.logistics==='forward')set('FORWARD',1,320000000,'Gudang depan keamanan/stock area; asumsi');
  if(s.logistics==='split')set('HUB',1,150000000,'Hub & transfer air/darat; asumsi');
  if(s.maint==='predictive')set('TOOLS2',1,115000000,'CBM tambahan, inspeksi berkala dan perangkat');
  if(s.airSupport!=='none')set('AIRCTRL',1,55000000,'Koordinasi udara dan komunikasi, asumsi sekali pengadaan');
  if(s.drill==='quarterly')set('DRILL2',1,120000000,'Peralatan latihan tambahan; bukan OPEX');
  if(s.sippa){for(const e of s.sippa.tambah||[]){set(e.id,e.q,e.price,e.why);if(o[e.id]&&e.name)o[e.id].name=e.name;}for(const id of s.sippa.pinjam||[])delete o[id];} //SIPPA: hanya untuk keadaan ber-blok sippa (preset S0, S0B): item tambahan dan kendaraan/perahu dipinjam (G06); S1 sampai S3 tidak terpengaruh
  return Object.values(o).filter(x=>x.q>0).map(x=>({...x, total:x.q*x.price*N(s.priceFactor)})).sort((a,b)=>b.total-a.total);
 }
 function assess(s){
  s={...defaultState(),...s};
  const base=getBase(s.strategy);
  const L=N(s.networkLength), Q=N(s.waterQ), eQ=N(s.envReserve), qTarget=N(s.area)*N(s.waterPerHa);
  const pumpQ=N(s.flowLPM||2000), flow=pumpQ/60000; // m3/s
  let od=N(s.od)/1000, sdr=N(s.sdr);
  const idHD=clamp(N(s.od)*(1-2/sdr)/1000,.018,.95), idLay=clamp(N(s.od)*.96/1000,.018,.95),idSteel=clamp(N(s.od)*.91/1000,.018,.95);
  const di=s.pipe==='layflat'?idLay:s.pipe==='steel'?idSteel:idHD;
  const areaPipe=Math.PI*di*di/4, vel=flow/areaPipe;
  const C=s.pipe==='layflat'?120:s.pipe==='steel'?120:135;
  const tempDerate= s.pipe==='hdpe'||s.pipe==='hybrid'?clamp(1-.014*(N(s.pipeTemp)-20),.58,1):1;
  const fLoss=(len,coef,d)=>10.67*len*Math.pow(flow,1.852)/(Math.pow(coef,1.852)*Math.pow(d,4.871));
  const hf=s.pipe==='hybrid'?fLoss(L*.78,135,idHD)+fLoss(L*.22,120,idLay):fLoss(L,C,di);
  const hm=N(s.minorK)*vel*vel/(2*G);
  const staticH=N(s.elevation), endpoint=N(s.pressureEnd)*1e5/(RHO*G);
  const tdh=staticH+hf+hm+endpoint+3.5; // 3.5 m intake/filter/suction allowance, may vary
  const pressBar=RHO*G*tdh/1e5;
  const shaftKw=(RHO*G*flow*tdh)/1000/clamp(N(s.pumpEff),.35,.9);
  const hp=shaftKw/0.7457;
  const dailyQ=(pumpQ/1000)*60,waterHours=qTarget/(pumpQ/1000*60);
  const sourceAvail=Math.max(0,Q-eQ); const availableLPMin=sourceAvail*60;
  const waterOK=availableLPMin>=pumpQ;
  const branches=N(s.branchLength);
  const logisticMult=s.access==='road'?1:s.access==='mixed'?1.5:s.access==='boat'?1.9:2.8;
  const groundMult=s.peatDepth==='deep'?1.65:s.peatDepth==='mid'?1.25:1;
  const pipeMult=(s.pipe==='steel'?0.30:s.pipe==='hdpe'?.72:s.pipe==='hybrid'?.8:1.15)*(s.alignment==='buried'?.48:s.alignment==='raised'?.4:1);
  const installedMPerHour=Math.max(1,N(s.crewSpeed)*pipeMult/logisticMult/groundMult*(N(s.crew)/8)**.45);
  const installHours=L/installedMPerHour+8+branches/Math.max(10,installedMPerHour*.8);
  const installDays=installHours/clamp(N(s.shiftHours),1,16);
  const pumpUnits=Math.max(1,Math.round(N(s.pumpCount)));
  const estimatedPumpHp=s.pump==='gas'?75:s.pump==='electric'?100:s.pump==='hybrid'?85:110; // ASSUMED sizing placeholder, not p-Q curve
  const pumpRatingOK=hp<=pumpUnits*estimatedPumpHp*.85;
  let hard=[], conditional=[], soft=[];
  if(!waterOK)hard.push(`Sumber air setelah cadangan ekologis hanya ${fx(availableLPMin,0)} LPM; target operasi ${fx(pumpQ,0)} LPM.`); //SIPPA: toFixed diganti fx (Intl id-ID), angka sama
  if(s.waterRights==='no')hard.push('Izin pengambilan air ditolak/tidak sah.'); else if(s.waterRights==='pending')conditional.push('Izin/kuota pengambilan air belum terbit.');
  if(s.tenure==='disputed')hard.push('Hak lintasan/pemanfaatan lahan disengketakan.');else if(s.tenure==='pending')conditional.push('Hak lahan, ROW, dan persetujuan masyarakat belum diverifikasi.');
  if(s.ecoPermit==='rejected')hard.push('Persetujuan lingkungan tidak tersedia/ditolak.');else if(s.ecoPermit==='pending')conditional.push('Kajian dan persetujuan lingkungan belum disetujui.');
  if(s.waterSource==='well')conditional.push('Sumur memerlukan uji debit, hidrogeologi dan izin; akuifer produktif belum dipastikan.'); //SIPPA: teks, larangan kata keputusan 50
  if(s.floodUse==='pump')conditional.push('Fungsi banjir memerlukan analisis pelepasan air dan larangan pengeringan gambut.');
  if(s.heat==='severe' && s.alignment==='surface' && s.pipe!=='steel')hard.push('Pipa termoplastik terbuka pada zona panas ekstrem: proteksi/perubahan rute diperlukan.');
  if(s.tactic==='rewetonly'&&s.fireType!=='none')hard.push('Rewetting saja tidak memenuhi fungsi respons terhadap titik panas yang sedang aktif; wajib punya rencana pemadaman.'); //SIPPA: teks, "titik panas" untuk data satelit
  if(s.tactic==='injection'&&s.sensorTier==='none')conditional.push('Injeksi bawah permukaan tanpa instrumentasi suhu/kedalaman sulit diverifikasi; uji alat dan core verification.');
  if(s.hotend==='hdpe'&&s.fireType!=='surface')hard.push('Ujung pemadaman bara tidak boleh diakhiri HDPE yang terekspos panas tanpa analisis termal.');
  if(s.hasBooster)conditional.push('Pompa seri/booster wajib mengecek tekanan antar-node, NPSH, relief, transien, dan dua kurva Q–H vendor.');
  if(s.pump==='electric'&&s.site==='remote')conditional.push('Pompa listrik lokasi terpencil harus membuktikan ketersediaan listrik/genset dan jalur cadangan.');
  if(s.pump==='gas')conditional.push('Rating daya bensin adalah placeholder; kapasitas debit pada head target wajib kurva OEM dan uji acceptance.');
  if(!pumpRatingOK)hard.push('Daya poros melebihi perkiraan rating pompa terpasang, perlu kurva Q–H vendor dan redesign.');
  const nominalPN=s.sdr==='17'?10:16;
  if(['hdpe','hybrid'].includes(s.pipe) && pressBar>nominalPN*tempDerate*.88)hard.push(`Tekanan perhitungan ${fx(pressBar,1)} bar melampaui ambang screening 88% × PN${nominalPN} × derating suhu (~${fx(tempDerate,2)}); perlu perubahan diameter/PN/pump & transien.`); //SIPPA: toFixed diganti fx (Intl id-ID), angka sama
  if(['hdpe','hybrid'].includes(s.pipe)&&N(s.pipeTemp)>45)conditional.push('Temperatur air/pipa tinggi; derating PE100 pada suhu aktual harus diverifikasi dengan datasheet.');
  if(vel>3)conditional.push(`Kecepatan ${fx(vel,2)} m/s tinggi; cek water hammer dan opsi diameter lebih besar.`); //SIPPA: toFixed diganti fx (Intl id-ID), angka sama
  if(s.wtd==='dry')conditional.push('Muka air tanah sangat rendah; prioritas rewetting dan pengendalian kebakaran berulang.');
  if(s.peatDepth==='deep' && s.alignment==='buried')conditional.push('Penanaman pipa pada gambut dalam perlu investigasi subsiden, amblesan, dan gangguan hidrologi.');
  if(s.security==='high'&&s.alignment==='surface'&&s.strategy==='backbone')conditional.push('Backbone terbuka di daerah rawan pencurian: pengamanan dan proteksi aset harus diperkuat.');
  if(s.flood==='high'&&s.alignment==='buried')conditional.push('Flotasi, erosi dan stabilitas trench saat banjir memerlukan desain khusus.');
  if(s.airSupport==='helicopter')conditional.push('Dukungan helikopter adalah kontrak terpisah, dibatasi cuaca/jarak/izin; biaya per jam menunggu angka BNPB (sippa.heli.biaya_jam), belum masuk TCO.'); //SIPPA: G13/G23 teks
  if(s.rewetting==='no'&&s.wtd==='dry')soft.push('Desain belum menyelesaikan penyebab keringnya gambut; potensi kebakaran berulang tinggi.');
  if(s.drone==='thermal')soft.push('Drone termal membantu target dan prioritas patroli, bukan konfirmasi padam pada kedalaman gambut.');
  if(s.drone==='none')soft.push('Tanpa drone, intensitas patroli darat dan pengambilan sampel suhu perlu ditingkatkan.');
  if(s.maint==='basic')soft.push('Maintenance reaktif meningkatkan kemungkinan downtime dan kerusakan tersembunyi.');
  if(s.alignment==='surface'&&s.pipe==='hdpe')soft.push('HDPE terbuka sensitif terhadap panas setempat; perlindungan/monitoring suhu diperlukan.');
  if(s.strategy==='backbone'&&s.fireType==='surface'&&N(s.area)<=2)soft.push('Backbone permanen berpotensi overinvestment untuk api kecil dan berpindah-pindah.');
  if(s.agriculture!=='none'&&s.wtd==='dry')conditional.push('Dukungan pertanian tidak boleh menambah drainase gambut; harus kompatibel KHG.');
  if(s.site==='dome' && s.strategy==='backbone')conditional.push('Backbone pada puncak kubah gambut dapat berdampak hidrologis; prioritaskan evaluasi ekologi/rute penghindaran.');
  if(s.site==='remote' && s.strategy==='backbone')conditional.push('OPEX inspeksi dan mobilisasi backbone remote harus diuji dengan rute nyata.');
  if(s.waterSource==='canal'&&s.wtd==='dry')conditional.push('Pasokan dari kanal perlu diukur kemarau dan neraca air KHG; jangan mengandalkan level musim hujan.');
  if(N(s.pressureEnd)<1.0)conditional.push('Tekanan residual ujung mungkin kurang untuk alat/aplikator; cek OEM lance/nozzle.');
  if(s.heat==='severe'&&s.pipe==='steel')soft.push('Baja tahan paparan panas relatif lebih baik, tapi tetap perlu proteksi korosi dan kestabilan fondasi.');
  const boq=buildBoQ(s); const direct=boq.reduce((a,b)=>a+b.total,0);
  const contingency=direct*clamp(N(s.contingency)/100,0,.75); const capex=direct+contingency;
  const engineHours=N(s.operationHours), diesel=s.pump==='diesel'||s.pump==='hybrid', gas=s.pump==='gas'||s.pump==='hybrid';
  const fuelDieselHr=diesel?shaftKw*.27/.84:0; // kg/kWh -> litre/h
  const fuelPetrolHr=gas?22*(s.pump==='hybrid'?1:pumpUnits):0; // OEM example for VE1500W; not proportional model
  const gridKWhHr=s.pump==='electric'?shaftKw/.91:0;
  const energyAnnual=engineHours*(fuelDieselHr*N(s.fuelPrice)+fuelPetrolHr*N(s.petrolPrice)+gridKWhHr*N(s.electricPrice));
  const wageAnnual= N(s.crew)*N(s.wage)*N(s.daysPerYear);
  const serviceAnnual=direct*(s.maint==='basic'?.025:s.maint==='predictive'?.055:.042);
  const detectionMult=s.detection==='manual'?1.32:s.detection==='satellite'?.82:1;
  const patrolling=(s.drone==='thermal'?85000000:s.drone==='rgb'?53000000:36000000)*detectionMult;
  const monitor=s.telemetry==='satellite'?110000000:s.telemetry==='none'?12000000:34000000;
  const protection=s.security==='high'?65000000:s.security==='mid'?29000000:10000000;
  const logistics= (s.access==='remote'?160000000:s.access==='boat'?110000000:s.access==='mixed'?75000000:40000000) *(s.logistics==='forward'?.92:1.0);
  const drill=s.drill==='quarterly'?95000000:s.drill==='annual'?52000000:22000000;
  const airAnnual=s.airSupport==='none'?0:s.airSupport==='oncall'?30000000:30000000+N(s.helicopterHours)*N(HELI.nilai); //SIPPA: G13 biaya per jam heli = slot HELI (menunggu, null jadi 0), bukan placeholder pemilik; bagian 30 juta koordinasi tetap
  const opex=energyAnnual+wageAnnual+serviceAnnual+patrolling+monitor+protection+logistics+drill+airAnnual;
  const horizon=clamp(N(s.horizon),1,30), tco=capex+opex*horizon;const perHa=qTarget?capex/N(s.area):null;
  const annualBenefit=N(s.annualAvoidedLoss), discountRate=clamp(N(s.discountRate)/100,0,.3);
  const annuityFactor=Array.from({length:horizon},(_,i)=>1/Math.pow(1+discountRate,i+1)).reduce((a,b)=>a+b,0);
  const npv=(annualBenefit-opex)*annuityFactor-capex;
  const bcr=annualBenefit*annuityFactor/(capex+opex*annuityFactor||1);
  const breakevenAnnual=opex+capex/(annuityFactor||1);
  const costVerifiedHa=N(s.verifiedHaAnnual)>0?opex/N(s.verifiedHaAnnual):null;
  const fuelLitresYear=(fuelDieselHr+fuelPetrolHr)*engineHours;
  const operationalEmissionsKg=(fuelDieselHr*2.68+fuelPetrolHr*2.31)*engineHours; // Illustrative fuel-only combustion CO2, excluding peat & life-cycle.
  const dispatchHours=(s.access==='remote'?16:s.access==='boat'?9:s.access==='mixed'?6:3)*(s.logistics==='forward'?.72:s.logistics==='split'?.9:1);
  const deployProd=Math.max(10,N(s.crewSpeed)*.8/logisticMult/groundMult*(N(s.crew)/8)**.45);
  const incidentDeployHours=s.strategy==='portable'?installHours:s.strategy==='semi'?3+Math.min(branches,300)/deployProd:1+Math.min(branches,100)/deployProd; // Assumes fixed portions are already built, inspected and operable.
  const readyHours=incidentDeployHours+dispatchHours; 
  let reliab=.97-(s.maint==='basic'?.12:s.maint==='predictive'?.02:.055)-(s.redundancy==='none'?.08:s.redundancy==='installed'?.005:.035)-(s.access==='remote'?.06:0)-(s.flood==='high'?.045:0);
  reliab=clamp(reliab,.4,.995);
  const riskRisk= Math.min(100, Math.round((hard.length*20 + conditional.length*6 + soft.length*2 + (s.access==='remote'?8:0) + (s.security==='high'?6:0))));
  const decision=hard.length?'NO-GO':conditional.length?'HOLD / VALIDASI':'KONDISIONAL';
  const profileScores={
    capital:100/(1+capex/6e9),
    safety:clamp(94-hard.length*24-conditional.length*5-(s.heat==='severe'?9:0),0,100),
    ops:clamp(100-readyHours/2-(s.access==='remote'?20:0)+(s.redundancy==='installed'?10:0),0,100),
    ecology:clamp(78+(s.rewetting==='yes'?15:-20)-(s.waterSource==='well'?20:0)-(s.floodUse==='pump'?18:0)-(s.alignment==='buried'&&s.peatDepth==='deep'?10:0),0,100),
    effectiveness:clamp((waterOK?80:15) + (s.drone==='thermal'?5:0)+(s.sensorTier==='extended'?5:0)-(s.fireType==='peat'?6:0)-(hard.length?20:0),0,100)
  };
  const wCost=N(s.weightCost),wSafety=N(s.weightSafety),wEff=N(s.weightEffectiveness),wAccess=N(s.weightAccess),wEnvironment=N(s.weightEnvironment); const wt=Math.max(1,wCost+wSafety+wEff+wAccess+wEnvironment);
  const score=(profileScores.capital*wCost+profileScores.safety*wSafety+profileScores.effectiveness*wEff+profileScores.ops*wAccess+profileScores.ecology*wEnvironment)/wt;
  const dependencies=[
    {from:'Sumber air',out:'Debit bersih, izin, keandalan saat kemarau, pemilihan intake',impact:waterOK?'lulus debit nominal; tetap perlu Q90/Q95 lapangan':'GAGAL debit minimum'},
    {from:'Topografi + diameter',out:'Δz → TDH → daya pompa → biaya energi dan rating pipa',impact:`Head ${fx(tdh,1)} m; ${fx(pressBar,2)} bar; ${fx(hp,1)} HP`}, //SIPPA: toFixed diganti fx (Intl id-ID), angka sama
    {from:'Material + trase',out:'Investasi per meter, waktu pemasangan, tahan panas, pencurian',impact:`${PIPE[s.pipe].name}; ${s.alignment}; ${fx(installedMPerHour,0)} m/jam tim`}, //SIPPA: toFixed diganti fx (Intl id-ID), angka sama
    {from:'Penggerak & cadangan',out:'Peralatan pompa, BBM/listrik, reliability, maintenance',impact:`${s.pump}; ${s.redundancy}; ${money(energyAnnual)}/tahun energi`},
    {from:'Banjir & gambut',out:'Fondasi, struktur air, akses, monitoring WTD, risiko ekologis',impact:`Banjir ${s.flood}; WTD ${s.wtd}; sekat kanal ${s.rewetting==='yes'?s.canalBlocks:0}`},
    {from:'Drone + sensor',out:'Biaya/false alarm/kecepatan penemuan titik panas dan bukti padam',impact:`${s.drone}; ${s.telemetry}; ${s.sensorTier}`},
    {from:'Logistik + personel',out:'Jam pemasangan, stok BBM, staging, gaji, kesiapan regu',impact:`${N(s.crew)} orang; ${fx(installHours,1)} jam instalasi; ${money(wageAnnual)}/tahun upah`}, //SIPPA: toFixed diganti fx (Intl id-ID), angka sama
    {from:'Pemeliharaan + latihan',out:'Reliability, kesiapsiagaan, suku cadang dan OPEX',impact:`Availability ilustratif ${fx((reliab*100),0)}%; bukan estimasi statistik teruji`} //SIPPA: toFixed diganti fx (Intl id-ID), angka sama
  ];
  return {s,base,boq,hyd:{flow,di,od,tempDerate,nominalPN,vel,hf,hm,staticH,endpoint,tdh,pressBar,shaftKw,hp,waterHours,waterVolume:qTarget,sourceAvail,waterOK,pumpRatingOK,installedMPerHour,installHours,installDays,readyHours,availableLPMin},fin:{direct,contingency,capex,opex,tco,perHa,operationalEmissionsKg,annualBenefit,discountRate,annuityFactor,npv,bcr,breakevenAnnual,costVerifiedHa,airAnnual,energyAnnual,wageAnnual,serviceAnnual,patrolling,monitor,protection,logistics,drill,fuelDieselHr,fuelPetrolHr,gridKWhHr,fuelLitresYear,horizon},hard,conditional,soft,decision,score,profileScores,riskRisk,reliab,dependencies};
 }
 function compare(s){return BASES.map(b=>{let t={...s,strategy:b.id,networkLength:b.main,branchLength:b.branches};if(b.id==='portable'){t.pipe='layflat';t.alignment='surface';t.pump='gas';t.pumpCount=2;t.rewetting='no';}if(b.id==='semi'){t.pipe='hybrid';t.pump='diesel';t.pumpCount=1;t.alignment='protected';}if(b.id==='backbone'){t.pipe='hdpe';t.pump='diesel';t.pumpCount=2;t.alignment='buried';}return assess(t);});}
 function drawRiskMC(s, iterations=800){
  const initial=assess(s);let seed=2166136261;const state=JSON.stringify(s);for(let i=0;i<state.length;i++) seed=((seed^state.charCodeAt(i))*16777619)>>>0;
  const rng=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  const out=[];for(let i=0;i<iterations;i++){
   const c=.78+rng()*.50, fuel=.65+rng()*.75, labor=.7+rng()*.75, ops=.75+rng()*.60;
   const capex=initial.fin.capex*c;
   const opex=(initial.fin.energyAnnual*fuel+initial.fin.wageAnnual*labor+(initial.fin.opex-initial.fin.energyAnnual-initial.fin.wageAnnual)*ops);
   out.push(capex+opex*initial.fin.horizon);
  }
  out.sort((a,b)=>a-b);const at=p=>out[Math.floor((out.length-1)*p)];
  return {low:at(.1),mid:at(.5),high:at(.9),samples:out.length, note:'Ilustrasi 800 skenario dengan rentang distribusi asumsi; bukan distribusi biaya empiris.'};
 }
 //SIPPA: mulai blok tambahan (semua baris sampai "akhir blok tambahan" milik SIPPA)
 //SIPPA: gerbangSippa hanya MENAMBAH hambatan ke salinan hasil (tidak pernah menghapus, tidak mengubah masukan); keputusan dihitung ulang dengan aturan mesin (ada hard = NO-GO), tidak pernah GO.
 //SIPPA: konst = SippaHitung.KONST (serap_lance_lpm, dalam_maks_m, g1_rasio): angka batas hanya hidup di hitung.js; tanpa konst gerbang gagal keras, bukan diam.
 function gerbangSippa(state,hasil,konst){
  const K=konst||(root.SippaHitung&&root.SippaHitung.KONST);
  if(!K||!K.serap_lance_lpm||!K.dalam_maks_m||!K.g1_rasio)throw new Error('gerbangSippa: KONST SippaHitung tidak termuat (serap_lance_lpm, dalam_maks_m, g1_rasio)');
  const s={...defaultState(),...state}, sp=state&&state.sippa;
  const hard=hasil.hard.slice(), conditional=hasil.conditional.slice();
  if(sp){
   const serap=N(sp.n_lance)*K.serap_lance_lpm;
   if(N(s.flowLPM)>serap)hard.push(`H-SERAP: Debit ${fx(N(s.flowLPM),0)} L/min tidak terserap ${fx(N(sp.n_lance),0)} lance (paling banyak ${fx(serap,0)} L/min).`);
   if(N(sp.dalam_m)>K.dalam_maks_m)hard.push(`H-DALAM: Kedalaman injeksi ${fx(N(sp.dalam_m),1)} m melewati batas ${fx(K.dalam_maks_m,0)} m (keputusan 50).`);
  }
  if(s.strategy==='semi'||s.strategy==='backbone')hard.push('jaringan_permanen: Jaringan pipa tetap (semi-permanen dan backbone) ditutup; SIPPA hanya kit portabel. Angka tampil sebagai pembanding (keputusan 60).');
  if(hasil.hyd.availableLPMin<K.g1_rasio*N(s.flowLPM))conditional.push(`H-AIR: Sumber air bersih ${fx(hasil.hyd.availableLPMin,0)} L/menit kurang dari ${fx(K.g1_rasio,1)} kali debit operasi ${fx(N(s.flowLPM),0)} L/menit.`);
  const decision=hard.length?'NO-GO':conditional.length?'HOLD / VALIDASI':'KONDISIONAL';
  const riskRisk=Math.min(100,Math.round(hard.length*20+conditional.length*6+hasil.soft.length*2+(s.access==='remote'?8:0)+(s.security==='high'?6:0)));
  return {...hasil,hard,conditional,decision,riskRisk};
 }
 //SIPPA: preset baru S0 dan S0B (PRD 9.5.2) sebagai keadaan di atas defaultState; harga dari QBASE/COST mesin (tabel harga sippa.rab dari SP-062 belum tersedia, nanti masuk lewat blok sippa.tambah).
 function presetSippa(kode){
  const d=defaultState();
  const s0={...d,site:'kanal',strategy:'portable',tactic:'injection',pipe:'layflat',od:100,sdr:'11',alignment:'surface',networkLength:1000,branchLength:500,
   pump:'gas',pumpCount:2,redundancy:'none',flowLPM:300,elevation:2,minorK:5,pressureEnd:3,pipeTemp:35,hotend:'remote',crew:8,rewetting:'no',canalBlocks:0,
   security:'low',sensorTier:'none',telemetry:'none',drone:'none',floodUse:'none',access:'road',logistics:'hub',maint:'basic',drill:'annual',
   sippa:{n_lance:8,dalam_m:3,koridor:1,pinjam:['BOAT','TRUCK'],tambah:[{id:'LAN',q:8,price:COST.lance,why:'BOM S0: 8 lance, harga mesin pemilik'}]}};
  if(kode==='S0')return s0;
  if(kode==='S0B')return {...s0,floodUse:'pump',sippa:{...s0.sippa,tambah:[...s0.sippa.tambah,{id:'FLD150',name:'Layflat DN150 modul banjir',q:300,price:COST.layflat100*Math.pow(150/100,1.15),why:'Pengali diameter mesin pemilik dari DN100; pompa banjir terpisah (TRASH)'}]}};
  throw new Error('presetSippa: kode '+kode+' tidak dikenal (S0 atau S0B)');
 }
 //SIPPA: S0, S0B, S1, S2, S3 berdampingan (keputusan 43), semuanya lewat gerbangSippa.
 function bandingkanSemua(dasar,konst){
  const d={...defaultState(),...dasar};
  const pemilik=compare(d).map((h,i)=>({kode:['S1','S2','S3'][i],hasil:gerbangSippa(h.s,h,konst)}));
  const baru=['S0','S0B'].map(k=>{const st=presetSippa(k);return {kode:k,hasil:gerbangSippa(st,assess(st),konst)};});
  return [...baru,...pemilik];
 }
 //SIPPA: G23 hitungan nyata dari skema (menggantikan hitungan tetap lama di UI pemilik).
 function hitungSkema(skema){return {dimensi:skema.length,pilihan:skema.reduce((a,d)=>a+d.options.length,0)};}
 //SIPPA: akhir blok tambahan
 const API={BASES,PIPE,COST,QBASE,G,N,HELI,defaultState,getBase,buildBoQ,assess,compare,drawRiskMC,money,pct,clamp,gerbangSippa,presetSippa,bandingkanSemua,hitungSkema}; //SIPPA: ekspor ditambah gerbangSippa, preset, G, N, HELI
 if(typeof module!=='undefined' && module.exports) module.exports=API;
 root.KarhutlaEngine=API;
})(typeof window!=='undefined'?window:globalThis);
