/* Inventori LogPal (/logpal). Gabungan tiga bagian halaman asal: data statis + hitungan pantau, lalu lapisan kerja yang kini bicara dengan /api/instansi/logpal/*. */

/* kerja berat sesudah paint: dua rAF bersarang, setTimeout 120 ms jaring bila tab tersembunyi; fn jalan sekali */
const nanti=(fn)=>{let sudah=false;const g=()=>{if(sudah)return;sudah=true;fn()};requestAnimationFrame(()=>requestAnimationFrame(g));setTimeout(g,120)};
const tunda=(fn,ms=150)=>{let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}};
const KATP=[['Mesin perahu',/mesin (perahu|tempel|speed|hidea)/],['Alat berat',/bulldozer|forklift|excavator|wheel loader|self loader/],['Perahu',/^perahu|speed ?boat|silinger/],['Genset',/gen[sz]et/],['Air bersih',/tangki air|tanki air|water treatment|tandon|treeng|aqua filta/],['Pompa',/^pompa (?!kaki|tangan)|water pump|^mesin pompa/],['Chainsaw',/chain ?saw|chinsaw|gergaji/],['Geobag',/geobag|karung banjiran/],['Terpal',/terpal|tenda gulung|teal/],['Tenda',/^tenda/],['Velbed',/velbed|feltbed/],['Matras dan kasur',/matras|kasur/],['Selimut',/selimut/],['Obat',/^obat/],['Komunikasi',/^alat komunikasi|radio|hytera|\brig\b|repeater|\bht\b|ssb|starl|icom/],['Kendaraan',/mobil|motor|truck|truk|ambulance|jeep|mibus|mini bus|pick ?up|trail/],['Penerangan',/light tower|\blampu|lentera|senter|solar/],['Pelindung diri',/rompi|life jacket|pelampung|helm|sepatu|apd|nomex|scba|sarung tangan|masker|hazmat|coverall|faceshield|jas hujan|mantel|boot/],['Pangan',/air mineral|garam|gula|kecap|madu|penyedap|sembako|minyak goreng|beras|sarden|makanan siap|kornet|mi instan/],['Paket keluarga',/family kit|hygiene|kitchen set|perlengkapan keluarga/]];
const ITP=[['Tandon air',/tandon|treeng/],['Flexible tank',/tanki portable|tangki portable|flexible/],['Pakaian anti api',/nomex|tahan api|anti panas|baju pemadam/],['APD medis',/hazmat|coverall/],['Pompa pemadam',/karhutla|jinjing|kebakaran|tekanan tinggi|bertekanan/],['Chainsaw',/chain ?saw|chinsaw|gergaji/],['Paket makanan siap saji',/makanan siap/],['Paket perlengkapan keluarga',/family kit|perlengkapan keluarga/],['Paket sandang',/paket sandang/],['Paket perlengkapan balita',/kidware|balita/],['Paket perlengkapan sekolah',/perlengkapan sekolah/],['Paket kebersihan',/peralatan kebersihan|paket kebersihan/],['Kantong jenazah',/kantong (jenazah|mayat)|kantung (jenazah|mayat)/],['Tenda pengungsi',/^tenda (pengungsi|pleton|peleton)/],['Light tower portable',/light tower/],['Motor trail',/motor (trail|trial|karhutla)|sepeda motor|^motor trail/],['Mobil rescue',/mobil rescue|jeep rescue/],['Mobil pick up',/pick ?up/],['Mobil tangki air',/mobil (tangki|tanki) air/],['Mobil dapur lapangan',/mobil dapur/],['Mobil toilet',/mobile? toilet/],['Truk serbaguna',/truck serba|truk serba|mobil truk serba|mobil truck serba/],['Water treatment portable',/water treatment/],['Pelampung keselamatan',/pelampung|life jacket/]];
const ITK={'Matras dan kasur':'Matras dan kasur lipat','Selimut':'Selimut','Terpal':'Terpal','Velbed':'Velbed','Genset':'Genset','Perahu':'Perahu evakuasi','Mesin perahu':'Mesin perahu','Pompa':'Pompa banjir'};
function klasifikasi(b){const s=b.toLowerCase(),k=(KATP.find(([,p])=>p.test(s))||['Lainnya'])[0],i=(ITP.find(([,p])=>p.test(s))||[ITK[k]||''])[0];const p1=['Paket makanan siap saji','Paket perlengkapan keluarga','Matras dan kasur lipat','Selimut'],p2=['Paket sandang','Terpal','Paket perlengkapan balita','Paket perlengkapan sekolah','Paket kebersihan','Kantong jenazah'];return {kategori:k,item_standar:i,prioritas:p1.includes(i)?'1':(p2.includes(i)?'2':'')}}

(function(){
const DAF={provinsi:'/data/logpal/provinsi.csv',wilayah:'/data/logpal/wilayah.csv',rute:'/api/instansi/logpal/statis?nama=rute',gudang:'/api/instansi/logpal/statis?nama=gudang',usulan:'/api/instansi/logpal/statis?nama=usulan',jangkauan:'/api/instansi/logpal/statis?nama=jangkauan',teks:'/api/instansi/logpal/statis?nama=teks',geo:'/data/logpal/provinsi_peta.json'};
const D={},C={},memo={},reg={};let GD=null,prov0=null;
const csv=(t)=>{const R=[];let r=[],c='',q=false;for(let i=0;i<t.length;i++){const h=t[i];if(q){if(h==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=h}else if(h==='"')q=true;else if(h===','){r.push(c);c=''}else if(h==='\n'){r.push(c.replace(/\r$/,''));R.push(r);r=[];c=''}else c+=h}if(c||r.length){r.push(c);R.push(r)}const k=R.shift().map(s=>s.replace(/^﻿/,''));return R.map(a=>Object.fromEntries(k.map((x,i)=>[x,a[i]])))};
function ada(id){return id in D||(C[id]&&C[id].inputs.every(ada))}
function nilai(id){if(id in D)return D[id];if(id in memo)return memo[id];const c=C[id];return memo[id]=c.fn(...c.inputs.map(nilai))}
function jalan(n){const f=reg[n];if(!f)return;document.querySelectorAll('[data-draw="'+n+'"]').forEach(el=>{if(!el.closest('[hidden]'))f(el)})}
function semua(){Object.keys(reg).forEach(jalan)}
function turunan(){
  if(!GD||!prov0)return;
  const kode=new Map(prov0.map(p=>[p.provinsi,p.kode]));let id=0;const baris=[];
  Object.values(GD).forEach(g=>(g.items||[]).forEach(x=>{const k=x.kategori?x:{...x,...klasifikasi(x.barang)};baris.push({id:x.id||String(++id),kode:kode.get(g.provinsi)||'',provinsi:g.provinsi,pemilik:g.pemilik,gudang:g.nama,barang:x.barang,kategori:k.kategori,jumlah:x.jumlah,siap_hitung:x.baik,satuan:x.satuan||'',catatan:x.catatan||'',sumber:x.sumber||'Input gudang',per:x.per||'',item_standar:k.item_standar||'',kelompok:x.kelompok||'Logistik lainnya',prioritas:k.prioritas||''})}));
  D.inventori=baris;
  const adaAngka=new Set(baris.filter(r=>r.pemilik==='BPBD'&&Number(r.jumlah)>0).map(r=>r.kode));
  D.provinsi=prov0.map(p=>adaAngka.has(p.kode)?{...p,status:'Ada angka'}:(p.status==='Ada angka'?{...p,status:'Belum ada data'}:p));
  Object.keys(memo).forEach(k=>delete memo[k]);semua();
}
window.dash={
  data(id){if(ada(id)){const v=nilai(id);return {status:'ok',data:v,refreshing:false,meta:[]}}return {status:'loading',data:[],refreshing:false,meta:[]}},
  calc(id,o){C[id]=o},loader(){},onData(f){f()},setLink(){},refresh(){},params(){return {}},setParams(){},resetParams(){},colors:['#1f6fb0','#d9600b'],
  draw(n,f){if(f)reg[n]=f;else jalan(n)},
  _csv:csv,_semua:semua,_gudang(g){GD=g;turunan()},_kebutuhan(k){D.kebutuhan=k;Object.keys(memo).forEach(x=>delete memo[x]);semua()}
};
Promise.all(Object.entries(DAF).map(async([id,u])=>{const r=await fetch(u,{credentials:'same-origin'});return [id,r.ok?await r.text():'']})).then(h=>{let J=null;h.forEach(([id,t])=>{
  if(id==='geo')D.geo=t?JSON.parse(t):{type:'FeatureCollection',features:[]};else if(id==='teks')D.teks=t?JSON.parse(t):{};else if(id==='jangkauan')J=t?csv(t):[];else if(id==='provinsi'){prov0=t?csv(t):[];D.provinsi=prov0}else D[id]=t?csv(t):[]});
  /* jam dan nama gudang per kab/kota datang dari data bersesi, digabung ke wilayah publik */
  const m=new Map((J||[]).map(x=>[x.provinsi+'|'+x.kab,x]));(D.wilayah||[]).forEach(w=>Object.assign(w,m.get(w.provinsi+'|'+w.kab)||{}));
  turunan();Object.keys(memo).forEach(k=>delete memo[k]);semua()});
let tw;addEventListener('resize',()=>{clearTimeout(tw);tw=setTimeout(()=>{jalan('peta');jalan('peta-jr')},200)});
})();
(function(){
const KOLOM = ['Alat berat','Perahu','Genset','Air bersih','Pompa','Chainsaw','Geobag','Tenda','Velbed','Matras dan kasur','Selimut','Terpal','Obat'];
const st = {pemilik:'Semua', kat:'Perahu', dkat:'', prov:'', cari:'', sort:'jumlah', arah:-1};
const id = (v) => (Number(v)||0).toLocaleString('id-ID');
const ulang = (...n) => nanti(() => n.forEach((x) => dash.draw(x)));
const siapData = (...s) => s.every((x) => dash.data(x).status === 'ok');
const baris = (x) => { const d = dash.data(x); return d.status === 'ok' ? d.data : []; };

dash.calc('rekap', {
  inputs:['inventori','provinsi'], title:'Rekap nasional',
  description:'Jumlah gudang, cakupan provinsi, dan total siap pakai per kategori.',
  fn:(inventori, provinsi) => {
    const g = new Set(inventori.map((r) => r.provinsi+'|'+r.gudang));
    const gp = (p) => new Set(inventori.filter((r) => r.pemilik===p).map((r) => r.provinsi+'|'+r.gudang)).size;
    const out = [
      {ukuran:'provinsi_angka', nilai:provinsi.filter((r) => r.status==='Ada angka').length},
      {ukuran:'provinsi_total', nilai:provinsi.length},
      {ukuran:'provinsi_kosong', nilai:provinsi.filter((r) => r.status==='Belum ada data').length},
      {ukuran:'gudang', nilai:g.size}, {ukuran:'gudang_bpbd', nilai:gp('BPBD')}, {ukuran:'gudang_bnpb', nilai:gp('BNPB')},
    ];
    const t = {};
    inventori.forEach((r) => { t[r.kategori] = (t[r.kategori]||0)+Number(r.siap_hitung||0); });
    Object.keys(t).forEach((k) => out.push({ukuran:k, nilai:t[k]}));
    return out;
  },
});
dash.calc('cakupan', {
  inputs:['provinsi'], title:'Cakupan laporan', description:'Jumlah provinsi per status laporan.',
  fn:(provinsi) => {
    const t = {};
    provinsi.forEach((r) => { t[r.status] = (t[r.status]||0)+1; });
    return Object.keys(t).map((status) => ({status, n:t[status]}));
  },
});
dash.calc('per_provinsi', {
  inputs:['inventori'], title:'Per provinsi dan kategori', description:'Total siap pakai per provinsi, pemilik, dan kategori.',
  fn:(inventori) => {
    const t = new Map();
    const tambah = (r, pemilik) => {
      const k = [r.kode,pemilik,r.kategori].join('|');
      if (!t.has(k)) t.set(k,{kunci:k,kode:r.kode,provinsi:r.provinsi,pemilik,kategori:r.kategori,jumlah:0});
      t.get(k).jumlah += Number(r.siap_hitung||0);
    };
    inventori.forEach((r) => { tambah(r,r.pemilik); tambah(r,'Semua'); });
    return [...t.values()];
  },
});
dash.calc('matriks', {
  inputs:['inventori'], title:'Rekap per gudang', description:'Total siap pakai per gudang pada kategori utama, dengan baris total.',
  fn:(inventori) => {
    const K = ['Alat berat','Perahu','Genset','Air bersih','Pompa','Chainsaw','Geobag','Tenda','Velbed','Matras dan kasur','Selimut','Terpal','Obat'];
    const t = new Map();
    const baru = (kunci, provinsi, pemilik, gudang) => { const o = {kunci,provinsi,pemilik,gudang}; K.forEach((k) => { o[k]=0; }); return o; };
    const ambil = (kunci, a, b, c) => { if (!t.has(kunci)) t.set(kunci, baru(kunci,a,b,c)); return t.get(kunci); };
    inventori.forEach((r) => {
      if (!K.includes(r.kategori)) return;
      const n = Number(r.siap_hitung||0);
      [ambil(r.provinsi+'|'+r.gudang, r.provinsi, r.pemilik, r.gudang), ambil('Total Semua','Total','Semua',''), ambil('Total '+r.pemilik,'Total',r.pemilik,'')].forEach((o) => { o[r.kategori]+=n; });
    });
    return [...t.values()];
  },
});

dash.draw('r', (el) => {
  const d = dash.data('rekap');
  const b = d.status==='ok' ? d.data.find((x) => x.ukuran===el.dataset.u) : null;
  el.textContent = b ? id(b.nilai) : '—';
});
dash.draw('cak-n', (el) => {
  const d = dash.data('cakupan');
  const b = d.status==='ok' ? d.data.find((x) => x.status===el.dataset.s) : null;
  el.textContent = b ? id(b.n) : (d.status==='ok' ? '0' : '—');
});
dash.draw('cak', (el) => {
  el.replaceChildren(...baris('provinsi').filter((r) => r.status===el.dataset.s).map((r) => {
    const s = document.createElement('span'); s.textContent = r.provinsi; if (r.catatan) s.title = r.catatan; return s;
  }));
});
dash.draw('sat', (el) => {
  if (!siapData('inventori')) return;
  const k = el.dataset.k, s = satuanKat(k), dus = k==='Selimut' && baris('inventori').some((x) => x.kategori===k && /dus|koli/i.test(x.satuan));
  el.textContent = dus ? s+'; perkiraan, ada baris dalam dus atau koli' : s;
});
dash.draw('n', (el) => { const d = el.dataset.n==='kab' ? baris('wilayah') : baris('provinsi'); el.textContent = d.length ? id(d.length) : '—'; });
dash.draw('sumber', (el) => {
  const w = typeof ME!=='undefined' && ME.kini ? new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'long',timeStyle:'short'}).format(new Date(ME.kini))+' WIB' : '—';
  el.textContent = el.dataset.k==='stok' ? 'Sumber: stok gudang BNPB dan BPBD yang dicatat di LogPal, tanggal tiap gudang di kolom Per; dimuat '+w+'.'
    : 'Sumber: pengajuan kebutuhan wilayah terdampak yang dicatat staf BNPB, dibandingkan stok gudang saat dicatat; dimuat '+w+'.';
});
/* teks yang memuat nama gudang datang dari data bersesi (tabel logpal_statis), bukan dari berkas publik */
dash.draw('teks', (el) => { const d = dash.data('teks'); el.textContent = (d.status==='ok' && d.data[el.dataset.t]) || el.dataset.d || ''; });
dash.draw('catatan', (el) => { const d = dash.data('teks'), c = d.status==='ok' && Array.isArray(d.data.catatan) ? d.data.catatan : []; el.replaceChildren(...c.map((x) => { const li = document.createElement('li'); li.textContent = x; return li; })); });
dash.draw('kat-teks', (el) => { el.textContent = st.kat; });

const daftarKat = () => [...new Set(baris('inventori').map((r) => r.kategori))].sort((a,b) => a.localeCompare(b,'id'));
dash.draw('pilih-kat', (sel) => {
  sel.replaceChildren(...daftarKat().map((k) => new Option(k)));
  sel.value = st.kat;
  sel.onchange = () => { st.kat = sel.value; ulang('kat-teks','peta','urut'); };
});
dash.draw('sar-kat', (sel) => {
  sel.replaceChildren(new Option('Semua kelompok',''), ...[...new Set(baris('inventori').map((r) => r.kelompok))].sort((a,b) => a.localeCompare(b,'id')).map((k) => new Option(k)));
  sel.value = st.dkat;
  sel.onchange = () => { st.dkat = sel.value; ulang('barang','jml-baris'); };
});
dash.draw('sar-prov', (sel) => {
  sel.replaceChildren(new Option('Semua provinsi',''), ...baris('provinsi').filter((r) => r.status==='Ada angka').map((r) => new Option(r.provinsi,r.kode)));
  sel.value = st.prov;
  sel.onchange = () => { st.prov = sel.value; ulang('peta','urut','matriks','barang','jml-baris'); };
});
const pilihProv = (kode) => { st.prov = st.prov===kode ? '' : kode;
  document.querySelectorAll('[data-draw="sar-prov"]').forEach((s) => { s.value = st.prov; });
  document.querySelectorAll('.km-baris').forEach((b) => b.setAttribute('aria-pressed', b.dataset.kode===st.prov ? 'true':'false'));
  ulang('sar-prov','peta','urut','matriks','barang','jml-baris'); };

/* satuan dominan sebuah kategori dari data gudang (satu label yang jujur: beberapa satuan disebut bila campur) */
const satuanKat = (kat) => { const c = new Map(); baris('inventori').filter((r) => r.kategori===kat && r.satuan).forEach((r) => { const s = r.satuan.replace(/\s*\(perkiraan\)/,'').toLowerCase(); c.set(s,(c.get(s)||0)+1); });
  const u = [...c.entries()].sort((a,b) => b[1]-a[1]).map((x) => x[0]); return u.length>2 ? u.slice(0,2).join(' atau ')+', satuan beragam' : u.join(' atau ') || 'satuan belum diisi'; };
const nilaiProv = () => {
  const m = new Map();
  baris('per_provinsi').filter((r) => r.pemilik===st.pemilik && r.kategori===st.kat).forEach((r) => m.set(r.kode, r));
  return m;
};
let geoRapi = null;
const rapikan = (geo) => {
  if (geoRapi) return geoRapi;
  geo.features.forEach((f) => {
    const polys = f.geometry.type==='Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    polys.forEach((p) => { if (d3.geoArea({type:'Polygon',coordinates:p}) > 2*Math.PI) p.forEach((c) => c.reverse()); });
  });
  geoRapi = geo; return geo;
};
dash.draw('peta', (el) => {
  if (!siapData('geo','provinsi','per_provinsi')) { el.textContent = '—'; return; }
  el.replaceChildren();
  const geo = rapikan(dash.data('geo').data);
  const status = new Map(baris('provinsi').map((r) => [r.kode,r]));
  const nilai = nilaiProv();
  const w = el.clientWidth || 800, h = Math.max(260, Math.round(w*.4));
  const proj = d3.geoMercator().fitSize([w,h],geo), path = d3.geoPath(proj);
  const vals = [...nilai.values()].map((r) => r.jumlah).filter((v) => v>0);
  const mn = d3.min(vals)||1, mx = d3.max(vals)||1;
  const skala = mx>mn ? d3.scaleLog([mn,mx],[.3,.92]).clamp(true) : () => .7;
  const warna = (kode) => {
    const s = status.get(kode), v = nilai.get(kode)?.jumlah||0;
    if (v>0) return d3.interpolateBlues(skala(v));
    if (!s || s.status==='Belum ada data') return 'var(--km-kosong)';
    return s.status==='Ada angka' ? 'var(--km-nol)' : 'var(--km-kuning)';
  };
  const svg = d3.select(el).append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('width','100%').attr('role','img').attr('aria-label','Peta sebaran per provinsi');
  const tip = d3.select(el).append('div').attr('class','km-tip').style('display','none');
  svg.selectAll('path').data(geo.features).join('path')
    .attr('d',path).attr('fill',(f) => warna(f.properties.kode))
    .attr('stroke',(f) => f.properties.kode===st.prov ? 'var(--color-fg)' : 'var(--color-bg)')
    .attr('stroke-width',(f) => f.properties.kode===st.prov ? 1.8 : .5)
    .on('mousemove',(e,f) => {
      const s = status.get(f.properties.kode), v = nilai.get(f.properties.kode)?.jumlah||0;
      tip.style('display',null).selectAll('*').remove();
      tip.append('em').text(s?.provinsi||'');
      tip.append('div').text(s?.status==='Ada angka' ? `${st.kat}: ${id(v)} ${satuanKat(st.kat)}` : (s?.status||''));
      if (s?.catatan) tip.append('div').text(s.catatan);
      const [x,y] = d3.pointer(e,el), lebar = tip.node().offsetWidth;
      tip.style('left',Math.max(0,Math.min(x+12,el.clientWidth-lebar))+'px').style('top',(y+12)+'px');
    })
    .on('mouseleave',() => tip.style('display','none'))
    .on('click',(e,f) => { if (status.get(f.properties.kode)?.status==='Ada angka') pilihProv(f.properties.kode); });
  const leg = d3.select(el).append('div').attr('class','km-leg');
  if (vals.length) {
    const a = leg.append('span');
    a.append('span').text(id(mn));
    a.append('i').attr('class','km-rampa').style('background',`linear-gradient(90deg,${d3.interpolateBlues(.3)},${d3.interpolateBlues(.92)})`);
    a.append('span').text(id(mx));
  }
  [['var(--km-nol)','Melapor, kategori ini nol'],['var(--km-kuning)','Tanpa angka atau belum melapor'],['var(--km-kosong)','Belum ada data']].forEach(([c,t]) => {
    const s = leg.append('span'); s.append('i').style('background',c); s.append('span').text(t);
  });
});
dash.draw('urut', (el) => {
  if (!siapData('per_provinsi')) { el.textContent = '—'; return; }
  const r = [...nilaiProv().values()].filter((x) => x.jumlah>0).sort((a,b) => b.jumlah-a.jumlah);
  const mx = d3.max(r,(x) => x.jumlah)||1;
  if (!r.length) { const p = document.createElement('p'); p.className='km-kosongan'; p.textContent='Belum ada provinsi yang mencatat kategori ini.'; el.replaceChildren(p); return; }
  el.replaceChildren(...r.map((x) => {
    const b = document.createElement('button'); b.type='button'; b.className='km-baris'; b.setAttribute('aria-pressed', x.kode===st.prov ? 'true':'false');
    const n = document.createElement('span'); n.textContent=x.provinsi;
    const u = document.createElement('u'); u.style.width = Math.max(2,x.jumlah/mx*100)+'%';
    const w = document.createElement('span'); w.appendChild(u);
    const a = document.createElement('b'); a.textContent=id(x.jumlah); a.title = id(x.jumlah)+' '+satuanKat(st.kat);
    b.dataset.kode = x.kode; b.append(n,w,a); b.onclick = () => pilihProv(x.kode); return b;
  }));
});
const namaProvTerpilih = () => baris('provinsi').find((r) => r.kode===st.prov)?.provinsi;
dash.draw('matriks', (el) => {
  if (!siapData('matriks','provinsi')) { el.replaceChildren(); return; }
  const nama = namaProvTerpilih();
  const urut = baris('matriks').filter((r) => r.provinsi!=='Total' && (st.pemilik==='Semua'||r.pemilik===st.pemilik) && (!nama||r.provinsi===nama))
    .sort((a,b) => a.provinsi.localeCompare(b.provinsi,'id') || a.pemilik.localeCompare(b.pemilik));
  const tot = nama ? [] : baris('matriks').filter((r) => r.kunci==='Total '+st.pemilik);
  el.replaceChildren(...[...urut,...tot].map((r) => {
    const tr = document.createElement('tr'); tr.dataset.key = r.kunci; if (r.provinsi==='Total') tr.className='tot';
    const td = (t,c) => { const x = document.createElement('td'); x.textContent=t; if (c) x.className=c; tr.appendChild(x); return x; };
    td(r.provinsi);
    const p = td('', 'a'); if (r.provinsi!=='Total') { const s = document.createElement('span'); s.className='km-pil'+(r.pemilik==='BNPB'?' bnpb':''); s.textContent=r.pemilik; p.appendChild(s); } else p.textContent=r.pemilik;
    td(r.gudang);
    KOLOM.forEach((k) => { const v = Number(r[k]||0); td(v?id(v):'–', v?'k':'k nol'); });
    return tr;
  }));
});
const barisDetail = () => {
  const q = st.cari.trim().toLowerCase();
  return baris('inventori').filter((r) => (st.pemilik==='Semua'||r.pemilik===st.pemilik) && (!st.dkat||r.kelompok===st.dkat) && (!st.prov||r.kode===st.prov) && (!q||(r.barang+' '+r.gudang+' '+r.provinsi).toLowerCase().includes(q)));
};
dash.draw('jml-baris', (el) => { el.textContent = dash.data('inventori').status==='ok' ? id(barisDetail().length) : '—'; });
dash.draw('barang', (el) => {
  if (!siapData('inventori')) { el.replaceChildren(); return; }
  const angka = st.sort==='jumlah'||st.sort==='siap_hitung';
  const r = barisDetail().sort((a,b) => st.arah*(angka ? Number(a[st.sort])-Number(b[st.sort]) : String(a[st.sort]).localeCompare(String(b[st.sort]),'id')));
  el.replaceChildren(...r.map((x) => {
    const tr = document.createElement('tr'); tr.dataset.key = x.id;
    const td = (t,c) => { const y = document.createElement('td'); y.textContent=t; if (c) y.className=c; tr.appendChild(y); return y; };
    td(x.provinsi);
    const p = td('','a'); const s = document.createElement('span'); s.className='km-pil'+(x.pemilik==='BNPB'?' bnpb':''); s.textContent=x.pemilik; p.appendChild(s);
    td(x.gudang); td(x.barang); td(x.kelompok); td(x.kategori); td(x.prioritas?('P'+x.prioritas):'','a'); td(id(x.jumlah),'k'); td(id(x.siap_hitung),'k'); td(x.satuan,'a'); td(x.per,'a'); td(x.sumber); td(x.catatan,'c');
    return tr;
  }));
});

document.querySelectorAll('.km-seg button[data-p]').forEach((b) => b.addEventListener('click', () => {
  st.pemilik = b.dataset.p;
  document.querySelectorAll('.km-seg button[data-p]').forEach((x) => x.setAttribute('aria-pressed', x===b ? 'true':'false'));
  ulang('peta','urut','matriks','barang','jml-baris');
}));
const cariMon = document.getElementById('cari'); if (cariMon) cariMon.addEventListener('input', tunda(() => { st.cari = cariMon.value; ulang('barang','jml-baris'); }));
const tandaSort = () => document.querySelectorAll('#tabel-barang th').forEach((th) => {
  const b = th.querySelector('button[data-s]');
  if (b && b.dataset.s===st.sort) th.setAttribute('aria-sort', st.arah>0?'ascending':'descending'); else th.removeAttribute('aria-sort');
});
document.querySelectorAll('#tabel-barang th button[data-s]').forEach((b) => b.addEventListener('click', () => {
  const k = b.dataset.s;
  if (st.sort===k) st.arah = -st.arah; else { st.sort=k; st.arah = (k==='jumlah'||k==='siap_hitung') ? -1 : 1; }
  tandaSort(); ulang('barang');
}));
tandaSort();

dash.calc('wilayah_ringkas', {inputs:['wilayah'], title:'Dasar perhitungan', description:'Total rata-rata pengungsi dan jumlah kecamatan.',
  fn:(wilayah) => [{ukuran:'pengungsi', nilai:Math.round(wilayah.reduce((a,r) => a+Number(r.pengungsi_rata||0),0))},{ukuran:'kecamatan', nilai:wilayah.reduce((a,r) => a+Number(r.kecamatan||0),0)}]});

dash.calc('standar', {inputs:['wilayah','inventori','provinsi'], title:'Standar minimal dan selisih stok', description:'Standar kab/kota, provinsi, nasional menurut draf Juklak, dibandingkan stok tercatat.',
  fn:(wilayah, inventori, provinsi) => {
    const ceil = (x) => Math.ceil(x-1e-9);
    // nama, jenis, rumus, operator, bahaya, prioritas
    const L = (n,r,p) => [n,'Logistik',r,'','',p];
    const G = (n,r,o) => [n,'Peralatan general',r,o,'',''];
    const S = (n,r,o,b) => [n,'Peralatan spesifik',r,o,b,''];
    const ITEMS = [L('Paket makanan siap saji','j3','1'),L('Paket perlengkapan keluarga','j','1'),L('Matras dan kasur lipat','j','1'),L('Selimut','j','1'),L('Paket sandang','j','2'),L('Terpal','j','2'),L('Paket perlengkapan balita','j','2'),L('Paket perlengkapan sekolah','j','2'),L('Paket kebersihan','j','2'),L('Kantong jenazah','j','2'),
      G('Tenda pengungsi','t',8),G('Velbed','v',1),G('Light tower portable','s',1),G('Genset','s',1),G('Motor trail','k',1),G('Mobil rescue','k',1),G('Mobil pick up','k',1),G('Mobil tangki air','k',1),G('Mobil dapur lapangan','k',1),G('Mobil toilet','k',1),G('Truk serbaguna','k',1),
      S('Mesin perahu','k',1,'Banjir'),S('Perahu evakuasi','k',2,'Banjir'),S('Pelampung keselamatan','j',1,'Banjir'),S('Pompa banjir','k',2,'Banjir'),S('Water treatment portable','k',1,'Banjir'),S('Water treatment portable','k',1,'Tsunami'),
      S('Chainsaw','k',1,'Gempa bumi'),S('Chainsaw','k',1,'Tsunami'),S('Chainsaw','k',1,'Tanah longsor'),S('Chainsaw','k',1,'Puting beliung'),S('Mesin gerinda','k',1,'Gempa bumi'),S('Mesin gerinda','k',1,'Tsunami'),S('Mesin gerinda','k',1,'Tanah longsor'),S('Mesin gerinda','k',1,'Puting beliung'),S('Mesin pompa air','k',1,'Kekeringan'),S('Mesin pompa air','k',1,'Tanah longsor'),S('Penghancur beton','k',1,'Tsunami'),S('Tandon air','k',1,'Kekeringan'),S('Pompa pemadam','k',1,'Kebakaran hutan dan lahan'),S('Flexible tank','k',1,'Kebakaran hutan dan lahan'),S('Pakaian anti api','k',1,'Kebakaran hutan dan lahan'),S('Pakaian anti api','k',1,'Erupsi gunung api'),S('APD medis','k',1,'Pandemi')];
    const hitungKab = (rumus, sl, a, kec) => { const t = ceil(sl*a/24); return {j3:ceil(sl*a*3), j:ceil(sl*a), k:ceil(sl*kec), t, v:t*24, s:ceil(t/6)}[rumus]; };
    const stok = new Map();
    inventori.forEach((r) => { if (r.item_standar) { const k = (r.pemilik==='BNPB'?'BNPB':r.kode)+'|'+r.item_standar; stok.set(k,(stok.get(k)||0)+Number(r.siap_hitung||0)); } });
    const titik = new Map(provinsi.map((p) => [p.kode,[Number(p.lon),Number(p.lat)]]));
    const jarak = (a,b) => { const [x1,y1]=titik.get(a),[x2,y2]=titik.get(b),r=Math.PI/180,h=Math.sin((y2-y1)*r/2)**2+Math.cos(y1*r)*Math.cos(y2*r)*Math.sin((x2-x1)*r/2)**2; return 12742*Math.asin(Math.sqrt(h)); };
    const stat = (s,t) => s<=0 ? 'Belum tercatat' : (s>=t ? 'Terpenuhi' : 'Kurang');
    const keluar = [];
    [0.1,0.2,0.3].forEach((sl) => ITEMS.forEach(([item,jenis,rumus,op,bahaya,pr]) => {
      const perProv = new Map();
      wilayah.forEach((w) => perProv.set(w.kode_prov,(perProv.get(w.kode_prov)||0)+hitungKab(rumus,sl,Number(w.pengungsi_rata||0),Number(w.kecamatan||0))));
      const prov = provinsi.map((p) => { const st = ceil(sl*(perProv.get(p.kode)||0)), sk = stok.get(p.kode+'|'+item)||0; return {kode:p.kode,nama:p.provinsi,st,sk}; });
      const nat = ceil(sl*prov.reduce((a,x) => a+x.st,0)), natS = stok.get('BNPB|'+item)||0;
      const lebih = prov.filter((x) => x.sk>x.st);
      const dasar = {item,jenis,bahaya,prioritas:pr,sl,operator:op};
      keluar.push({...dasar,kunci:['Nasional',sl,item,bahaya].join('|'),level:'Nasional',kode:'',wilayah:'Nasional',standar:nat,stok:natS,kurang:Math.max(0,nat-natS),status:stat(natS,nat),saran:''});
      prov.forEach((x) => {
        let saran = '';
        if (x.sk<x.st) {
          const dekat = lebih.filter((y) => y.kode!==x.kode).sort((a,b) => jarak(x.kode,a.kode)-jarak(x.kode,b.kode)).slice(0,2).map((y) => y.nama+' ('+(y.sk-y.st).toLocaleString('id-ID')+' lebih)');
          if (natS>nat) dekat.push('BNPB');
          saran = dekat.join(', lalu ') || 'Belum ada yang berlebih';
        }
        keluar.push({...dasar,kunci:[x.kode,sl,item,bahaya].join('|'),level:'Provinsi',kode:x.kode,wilayah:x.nama,standar:x.st,stok:x.sk,kurang:Math.max(0,x.st-x.sk),status:stat(x.sk,x.st),saran});
      });
    }));
    return keluar;
  }});
dash.calc('standar_ringkas', {inputs:['standar'], title:'Ringkasan status standar', description:'Jumlah item per status di tingkat nasional.',
  fn:(standar) => { const t = {}; standar.filter((r) => r.level==='Nasional' && r.jenis!=='Peralatan spesifik').forEach((r) => { const k = ['Nasional',r.sl,r.status].join('|'); t[k]=(t[k]||0)+1; }); return Object.keys(t).map((kunci) => ({kunci,nilai:t[kunci]})); }});
dash.calc('perka18', {inputs:['provinsi','inventori'], title:'Pembanding Perka 18/2009', description:'Buffer stock provinsi memakai penduduk 2026.',
  fn:(provinsi, inventori) => provinsi.map((p) => { const n = Number(p.penduduk||0), s = Math.round(n*0.001/4); const j = inventori.filter((r) => r.kode===p.kode && r.pemilik==='BPBD' && r.item_standar==='Kantong jenazah').reduce((a,r) => a+Number(r.siap_hitung||0),0); return {kode:p.kode,provinsi:p.provinsi,penduduk:n,pangan:Math.round(n*0.01*3),sandang:s,lain:s,kematian:Math.round(s*0.1),stok_jenazah:j}; })});
dash.calc('kebutuhan_hitung', {inputs:['kebutuhan'], title:'Analisa kebutuhan', description:'Selisih kebutuhan yang diajukan dengan stok gudang.',
  fn:(kebutuhan) => kebutuhan.map((r) => { const d = Number(r.diajukan), a = Number(r.stok_a||0)+Number(r.stok_b||0), setara = r.setara==='1'; const kurang = setara ? Math.max(0,d-a) : 0; return {...r,kurang,status:r.status_tetap || (a<=0 ? 'Belum ada' : (kurang>0 ? 'Sebagian' : 'Terpenuhi'))}; })});
dash.calc('kebutuhan_ringkas', {inputs:['kebutuhan_hitung'], title:'Ringkasan kebutuhan', description:'Jumlah kebutuhan yang melebihi stok.',
  fn:(kebutuhan_hitung) => [{ukuran:'lebih',nilai:kebutuhan_hitung.filter((r) => r.kurang>0).length},{ukuran:'total',nilai:kebutuhan_hitung.length}]});
dash.calc('jangkau', {inputs:['wilayah'], title:'Jangkauan gudang', description:'Jumlah kab/kota menurut perkiraan waktu tempuh.',
  fn:(wilayah) => ['bnpb','semua'].flatMap((g) => { const j = wilayah.map((r) => Number(r['jam_'+g])); const w = wilayah.map((r) => Number(r.pengungsi_rata||0)+1); const tw = w.reduce((a,b) => a+b,0); return [['k24',j.filter((x) => x<=24).length],['k72',j.filter((x) => x<=72).length],['lewat',j.filter((x) => x>72).length],['rata',Math.round(j.reduce((a,x,i) => a+x*w[i],0)/tw)]].map(([u,nilai]) => ({kunci:g+'|'+u,nilai})); })});

Object.assign(st,{sl:0.1,bahaya:'Banjir',stdProv:'11',g:'bnpb'});
const dSet = (el,where) => { el.dataset.where = where; };
dash.draw('sr', (el) => {
  const [lv,s] = el.dataset.u.split('|'), k = [lv,st.sl,s].join('|'); dSet(el,'kunci='+encodeURIComponent(k).replace(/%7C/g,'|'));
  const d = dash.data('standar_ringkas'); el.textContent = d.status==='ok' ? id((d.data.find((x) => x.kunci===k)||{}).nilai||0) : '—';
});
dash.draw('sj', (el) => { const d = dash.data('wilayah_ringkas'); el.textContent = d.status==='ok' ? id(d.data[0].nilai) : '—'; });
dash.draw('sk', (el) => { const d = dash.data('wilayah_ringkas'); el.textContent = d.status==='ok' ? id(d.data[1].nilai) : '—'; });
const pilStatus = (t) => { const s = document.createElement('span'); s.className = 'km-st '+({'Terpenuhi':'ok','Pengganti':'ok','Kurang':'ku','Sebagian':'ku','Belum ada':'no'}[t]||'ko'); s.textContent = t; return s; };
const barisStd = (el, rows, saran) => {
  const urut = rows.filter((r) => r.jenis!=='Peralatan spesifik' || r.bahaya===st.bahaya);
  el.replaceChildren(...urut.map((r) => {
    const tr = document.createElement('tr'); tr.dataset.key = r.kunci;
    const td = (t,c) => { const x = document.createElement('td'); x.textContent = t; if (c) x.className = c; tr.appendChild(x); return x; };
    td(r.item); td(r.jenis); td(r.prioritas?('P'+r.prioritas):'','a'); td(id(r.standar),'k'); td(id(r.stok),'k'); (r.kurang&&r.stok>0)?td(id(r.kurang),'mer'):td('–','k nol'); td('','a').appendChild(pilStatus(r.status)); td(r.operator?(r.operator+' orang'):'','a');
    if (saran) td(r.saran,'c');
    return tr;
  }));
};
dash.draw('std-nas', (el) => { if (!siapData('standar')) { el.replaceChildren(); return; } barisStd(el, baris('standar').filter((r) => r.level==='Nasional' && r.sl===st.sl)); });
dash.draw('std-prv', (el) => { if (!siapData('standar')) { el.replaceChildren(); return; } barisStd(el, baris('standar').filter((r) => r.level==='Provinsi' && r.sl===st.sl && r.kode===st.stdProv), true); });
dash.draw('std-prov-pilih', (sel) => {
  sel.replaceChildren(...baris('provinsi').map((r) => new Option(r.provinsi,r.kode))); sel.value = st.stdProv;
  sel.onchange = () => { st.stdProv = sel.value; ulang('std-prv'); };
});
dash.draw('perka', (el) => {
  el.replaceChildren(...baris('perka18').map((r) => { const tr = document.createElement('tr'); tr.dataset.key = r.kode;
    [r.provinsi,id(r.penduduk),id(r.pangan),id(r.sandang),id(r.lain),id(r.kematian),r.stok_jenazah?id(r.stok_jenazah):'–'].forEach((t,i) => { const x = document.createElement('td'); x.textContent = t; if (i) x.className='k'; tr.appendChild(x); }); return tr; }));
});
dash.draw('kb', (el) => { const d = dash.data('kebutuhan_ringkas'); const b = d.status==='ok' ? d.data.find((x) => x.ukuran===el.dataset.u) : null; el.textContent = b ? id(b.nilai) : '—'; });
dash.draw('kebutuhan', (el) => {
  el.replaceChildren(...baris('kebutuhan_hitung').map((r) => { const tr = document.createElement('tr'); tr.dataset.key = r.no;
    const td = (t,c) => { const x = document.createElement('td'); x.textContent = t; if (c) x.className = c; tr.appendChild(x); return x; };
    td(r.wilayah); td(r.kebutuhan); td(id(r.diajukan)+' '+r.satuan,'k'); td(r.stok_a_teks||'–','a'); td(r.stok_b_teks||'–','a'); td(r.kurang?(id(r.kurang)+' '+r.satuan):'–',r.kurang?'mer':'a'); td('','a').appendChild(pilStatus(r.status)); return tr; }));
});
dash.draw('jg', (el) => {
  const k = st.g+'|'+el.dataset.u; dSet(el,'kunci='+k);
  const d = dash.data('jangkau'), b = d.status==='ok' ? d.data.find((x) => x.kunci===k) : null; el.textContent = b ? b.nilai.toLocaleString('id-ID') : '—';
});
dash.draw('peta-jr', (el) => {
  if (!siapData('geo','wilayah','gudang','rute')) { el.textContent = '—'; return; }
  el.replaceChildren();
  const geo = rapikan(dash.data('geo').data), w = el.clientWidth||800, h = Math.max(280,Math.round(w*.42));
  const proj = d3.geoMercator().fitSize([w,h],geo), path = d3.geoPath(proj);
  const svg = d3.select(el).append('svg').attr('viewBox',`0 0 ${w} ${h}`).attr('width','100%').attr('role','img').attr('aria-label','Peta jangkauan gudang');
  const tip = d3.select(el).append('div').attr('class','km-tip').style('display','none');
  svg.append('g').selectAll('path').data(geo.features).join('path').attr('d',path).attr('fill','var(--km-kosong)').attr('stroke','var(--color-bg)').attr('stroke-width',.5).style('cursor','default');
  const tampil = (e,a,b) => { tip.style('display',null).selectAll('*').remove(); tip.append('em').text(a); tip.append('div').text(b); const [x,y]=d3.pointer(e,el),l=tip.node().offsetWidth; tip.style('left',Math.max(0,Math.min(x+12,el.clientWidth-l))+'px').style('top',(y+12)+'px'); };
  const hilang = () => tip.style('display','none');
  svg.append('g').selectAll('line').data(baris('rute')).join('line')
    .attr('x1',(r) => proj([+r.g_lon,+r.g_lat])[0]).attr('y1',(r) => proj([+r.g_lon,+r.g_lat])[1]).attr('x2',(r) => proj([+r.lon,+r.lat])[0]).attr('y2',(r) => proj([+r.lon,+r.lat])[1])
    .attr('stroke','#d9600b').attr('stroke-width',1).attr('stroke-dasharray',(r) => r.moda==='Laut'?'3 3':null);
  const warna = (j) => j<=24 ? '#3b82c4' : (j<=72 ? '#e0a44a' : '#c8102e');
  svg.append('g').selectAll('circle').data(baris('wilayah')).join('circle')
    .attr('cx',(r) => proj([+r.lon,+r.lat])[0]).attr('cy',(r) => proj([+r.lon,+r.lat])[1]).attr('r',Math.max(1.6,w/420)).attr('fill',(r) => warna(+r['jam_'+st.g])).attr('fill-opacity',.85)
    .on('mousemove',(e,r) => tampil(e,r.kab+', '+r.provinsi,`perkiraan ${Math.round(+r['jam_'+st.g]).toLocaleString('id-ID')} jam dari ${r['gudang_'+st.g]}`)).on('mouseleave',hilang);
  const G = baris('gudang').filter((g) => st.g==='semua' || g.pemilik==='BNPB');
  svg.append('g').selectAll('rect').data(G).join('rect')
    .attr('x',(g) => proj([+g.lon,+g.lat])[0]-4).attr('y',(g) => proj([+g.lon,+g.lat])[1]-4).attr('width',8).attr('height',8).attr('fill',(g) => g.pemilik==='BNPB'?'var(--color-fg)':'#fff').attr('stroke','var(--color-fg)')
    .on('mousemove',(e,g) => tampil(e,g.gudang,g.pemilik+', '+g.provinsi)).on('mouseleave',hilang);
  const leg = d3.select(el).append('div').attr('class','km-leg');
  [['#3b82c4','Sampai 24 jam'],['#e0a44a','24 sampai 72 jam'],['#c8102e','Lewat 72 jam'],['var(--color-fg)','Gudang BNPB']].forEach(([c,t]) => { const s = leg.append('span'); s.append('i').style('background',c); s.append('span').text(t); });
});
dash.draw('usulan', (el) => {
  el.replaceChildren(...baris('usulan').map((r) => { const tr = document.createElement('tr'); tr.dataset.key = r.urutan;
    [r.urutan==='0'?'Saat ini':r.urutan,r.titik,r.provinsi,Math.round(+r.jam_rata).toLocaleString('id-ID'),id(r.kab_24),id(r.kab_72)].forEach((t,i) => { const x = document.createElement('td'); x.textContent = t; if (i>2) x.className='k'; else if (!i) x.className='a'; tr.appendChild(x); }); return tr; }));
});
dash.draw('rute', (el) => {
  el.replaceChildren(...baris('rute').map((r) => { const tr = document.createElement('tr'); tr.dataset.key = r.kab;
    [r.provinsi,r.kab,r.asal,r.moda,Math.round(+r.jam),r.turun_di].forEach((t,i) => { const x = document.createElement('td'); x.textContent = t; if (i===4) x.className='k'; else if (i===3) x.className='a'; tr.appendChild(x); }); return tr; }));
});
document.querySelectorAll('[data-tab-btn]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-tab-btn]').forEach((x) => x.setAttribute('aria-pressed', x===b?'true':'false'));
  document.querySelectorAll('[data-tab]').forEach((s) => { s.hidden = s.dataset.tab!==b.dataset.tabBtn; });
  dash.setLink(b.dataset.tabBtn);
}));
document.querySelectorAll('.km-sl button').forEach((b) => b.addEventListener('click', () => {
  st.sl = Number(b.dataset.sl); document.querySelectorAll('.km-sl button').forEach((x) => x.setAttribute('aria-pressed', x===b?'true':'false')); ulang('sr','std-nas','std-prv');
}));
document.querySelectorAll('#std-bahaya').forEach((s) => s.addEventListener('change', () => { st.bahaya = s.value; ulang('std-nas','std-prv'); }));
document.querySelectorAll('.km-jr button').forEach((b) => b.addEventListener('click', () => {
  st.g = b.dataset.g; document.querySelectorAll('.km-jr button').forEach((x) => x.setAttribute('aria-pressed', x===b?'true':'false')); ulang('jg','peta-jr');
}));
document.querySelectorAll('[data-tab-btn]').forEach((b) => { if (b.dataset.tabBtn===location.hash.slice(1)) b.click(); });
})();

const KEL=['Pangan','Sandang','Papan','Logistik lainnya','Kendaraan bermotor','Peralatan air','Alat komunikasi','Hunian dan penerangan','Air dan sanitasi','Peralatan khusus'];
const $=(i)=>document.getElementById(i), N=(v)=>(Number(v)||0).toLocaleString('id-ID'), HARI=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const td=(t,c)=>{const x=document.createElement('td');x.textContent=t??'';if(c)x.className=c;return x};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const slug=(s)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||uid();
const pesan=(i,t,ok)=>{$(i).textContent=t;$(i).className='msg '+(ok?'o':'e')};
let G={},M=[],O=[],aktif=null,edit=null,lap=null,ME={};
const API='/api/instansi/logpal/';
async function api(jalur,badan){const r=await fetch(API+jalur,{method:badan===undefined?'GET':'POST',credentials:'same-origin',headers:{'x-pb':'1',...(badan===undefined?{}:{'content-type':'application/json'})},body:badan===undefined?undefined:JSON.stringify(badan)});let j=null;try{j=await r.json()}catch(e){}return {s:r.status,ok:r.ok,j:j||{}}}
const galat=(r,cadangan)=>(r.j&&r.j.galat)||cadangan;
/* satu pintu muat: semua tabel dibaca ulang dari server sesudah tiap tulis (stok adalah milik server) */
async function muat(){
  const r=await api('data');
  if(!r.ok){masukDulu(r);return false}
  ME=r.j;G={};r.j.gudang.forEach(g=>G[g.id]=g);M=r.j.mutasi;O=r.j.opname;P=r.j.permintaan;
  $('g_provinsi').replaceChildren(...(ME.provinsi||[]).map(p=>new Option(p.nama,p.kode)));
  $('p_bpbd').readOnly=$('p_prov').readOnly=ME.peran==='bpbd';
  if(ME.peran==='bpbd'){$('p_bpbd').value=ME.nama||'';$('p_prov').value=((ME.provinsi||[])[0]||{}).nama||'';if(ME.kab)$('p_kab').value=ME.kab}
  bolehSetuju=!!ME.proses;$('dummy').hidden=true;   // tombol dummy 🧪/🧹 disembunyikan atas permintaan pemilik 11 Nov 2026 (semua proyek); pulihkan: $('dummy').hidden=!ME.super

  dash._kebutuhan(ME.kebutuhan||[]);gambar();nanti(()=>dash._gudang(G));gambarP();
  if(location.hash.startsWith('#q-')&&!window.__h){window.__h=1;setTimeout(bukaHash,0)}
  return true}
function masukDulu(r){const st=$('st');st.replaceChildren();
  if(r.s===401){st.append('Masuk dulu. Akun BPBD masuk lewat ',Object.assign(document.createElement('a'),{href:'/instansi',textContent:'Ruang Instansi'}),', staf BNPB lewat ',Object.assign(document.createElement('a'),{href:'/admin/masuk?ke=/logpal',textContent:'halaman masuk staf'}),'.')}
  else st.textContent=galat(r,'Akun ini tidak punya akses ke Inventori LogPal.')}
const tulis=async(jalur,badan,pesanId,sukses,gagalTeks)=>{const g=pesanId==='mg'?null:G0();
  const r=await api(jalur,badan);if(!r.ok){pesan(pesanId,galat(r,gagalTeks));if(r.s===409)muat();return null}
  await muat();pesan(pesanId,sukses,1);return r.j};
const bisaTulis=(id)=>{const g=G0();if(!g||!g.boleh_tulis){pesan(id,'Gudang ini hanya bisa dibaca. Akun Anda tidak berwenang mengubahnya.');return false}return true};
const G0=()=>G[aktif];
$('b_kelompok').replaceChildren(...KEL.map(k=>new Option(k)));
['m_tanggal','o_tanggal','l_tgl'].forEach(i=>$(i).value=HARI());

const MON=['stok','standar','kebutuhan','jaringan','kirim','bantuan'];
document.querySelectorAll('[data-h]').forEach(b=>b.onclick=()=>{const h=b.dataset.h,mon=MON.includes(h);document.querySelectorAll('[data-h]').forEach(x=>x.setAttribute('aria-pressed',x===b));document.querySelectorAll('section[data-p]').forEach(s=>s.hidden=s.dataset.p!==h);document.querySelectorAll('[data-tab]').forEach(s=>s.hidden=s.dataset.tab!==h);$('mon').hidden=!mon;$('bilahG').hidden=mon;if(mon)nanti(dash._semua);if(h==='kirim')bukaKirim();if(h==='bantuan')bukaBantuan()});
$('pg').onchange=()=>{aktif=$('pg').value;gambar()};$('cari_barang').oninput=tunda(gambarStok);

function kedaluwarsa(d){if(!d)return null;const h=Math.floor((new Date(d)-new Date(HARI()))/864e5);return h<0?'lewat':(h<=90?'dekat':null)}
function gambar(){setTimeout(()=>{try{gambarAudit()}catch(e){}},0);
  const ks=Object.keys(G).sort((a,b)=>G[a].provinsi.localeCompare(G[b].provinsi,'id')||G[a].nama.localeCompare(G[b].nama,'id'));
  const opsi=ks.map(k=>new Option(G[k].provinsi+', '+G[k].nama,k));
  if(!aktif||!G[aktif])aktif=ks[0]||null;
  $('pg').replaceChildren(...opsi);if(aktif)$('pg').value=aktif;
  const v=$('l_g').value;$('l_g').replaceChildren(new Option('Semua gudang',''),...ks.map(k=>new Option(G[k].nama+', '+G[k].provinsi,k)));$('l_g').value=v;
  $('st').textContent=ks.length?ks.length+' gudang tercatat':'Belum ada gudang. Tambahkan gudang pertama di bawah.';
  gambarStok();gambarMutasi();gambarOpname();
}
function gambarStok(){
  const g=G0(),it=g?g.items||[]:[];
  const uBox=(a,b)=>{const d=document.createElement('div'),s=document.createElement('span'),n=document.createElement('b');s.textContent=a;n.textContent=b;d.append(s,n);return d};
  $('u').replaceChildren(uBox('Jenis barang',N(it.length)),uBox('Rusak',N(it.reduce((a,x)=>a+(+x.rusak||0),0))),uBox('Kedaluwarsa dekat atau lewat',N(it.filter(x=>kedaluwarsa(x.kedaluwarsa)).length)),uBox('Kapasitas gudang',g&&g.kapasitas_ton?N(g.kapasitas_ton)+' ton':'Belum diisi'));
  const q=$('cari_barang').value.trim().toLowerCase();
  $('tb').replaceChildren(...it.filter(x=>!q||x.barang.toLowerCase().includes(q)).map(x=>{
    const tr=document.createElement('tr'),k=kedaluwarsa(x.kedaluwarsa),e=td(PERAL.includes(x.kelompok)?(x.tahun||''):x.kedaluwarsa,'c');
    if(k){const p=document.createElement('span');p.className='pil '+(k==='lewat'?'b':'w');p.textContent=x.kedaluwarsa;e.replaceChildren(p)}
    const a=td('','c'),b=document.createElement('button');b.className='s';b.textContent='Ubah';b.onclick=()=>isi(x);a.append(b);
    tr.append(td(x.barang),td(x.kelompok),td(N(x.jumlah),'r'),td(N(x.baik),'r'),td(N(x.rusak),'r'),td(x.satuan,'c'),e,td(x.sumber_dana,'c'),td(x.catatan),a);return tr}));
  $('m_barang').replaceChildren(...it.map(x=>new Option(x.barang+' (stok '+N(x.jumlah)+')',x.id)));
}
function isi(x){edit=x.id;$('ft').textContent='Ubah barang';['barang','kelompok','satuan','jumlah','baik','rusak','sumber_dana','catatan',...KOLOM_B].forEach(k=>$('b_'+k).value=x[k]??'');ubahMode();scrollTo({top:0})}
function bersih(){edit=null;$('fb').reset();ubahMode();$('ft').textContent='Tambah barang'}
$('bb').onclick=bersih;
$('fb').onsubmit=async(e)=>{e.preventDefault();if(!aktif)return pesan('mb','Pilih atau tambah gudang dulu.');if(!bisaTulis('mb'))return;
  const j=+$('b_jumlah').value,baik=$('b_baik').value===''?j:+$('b_baik').value,aset=PERAL.includes($('b_kelompok').value),r=aset?((+$('b_rr').value||0)+(+$('b_rb').value||0)):($('b_rusak').value===''?Math.max(0,j-baik):+$('b_rusak').value);
  if(baik+r>j)return pesan('mb','Kondisi baik ditambah rusak tidak boleh melebihi jumlah.');
  const baru={...klasifikasi($('b_barang').value),barang:$('b_barang').value.trim(),kelompok:$('b_kelompok').value,satuan:$('b_satuan').value.trim(),jumlah:j,baik,rusak:r,sumber_dana:$('b_sumber_dana').value,...Object.fromEntries(KOLOM_B.map(k=>{const v=$('b_'+k).value.trim();return [k,ANGKA_B.has(k)?(v===''?null:+v):v]})),catatan:$('b_catatan').value.trim()};
  const rs=await tulis(edit?'ubah/'+edit:'barang/'+aktif,baru,'mb','Barang tersimpan.','Gagal menyimpan barang.');if(rs)bersih()};
$('fg').onsubmit=async(e)=>{e.preventDefault();const nama=$('g_nama').value.trim();
  const r=await tulis('gudang',{nama,prov:$('g_provinsi').value,kapasitas_ton:+$('g_kap').value||null},'mg','Gudang ditambahkan.','Gagal menambah gudang.');if(r){aktif=r.id;$('pg').value=aktif;$('fg').reset();$('g_provinsi').selectedIndex=0;gambar()}};

$('fm').onsubmit=async(e)=>{e.preventDefault();const g=G0();if(!g||!bisaTulis('mm'))return;const id=$('m_barang').value,j=+$('m_jumlah').value,jenis=$('m_jenis').value,x=(g.items||[]).find(i=>i.id===id);if(!x)return pesan('mm','Pilih barang.');
  if(jenis!=='Masuk'&&j>x.jumlah)return pesan('mm','Jumlah melebihi stok '+N(x.jumlah)+'.');
  const r=await tulis('mutasi/'+aktif,{tanggal:$('m_tanggal').value,jenis,barang_id:id,jumlah:j,lawan:$('m_lawan').value.trim(),moda:$('m_moda').value,dokumen:$('m_dok').value.trim(),nilai:+$('m_nilai').value||0,pj:$('m_pj').value.trim()},'mm','Mutasi tersimpan dan stok diperbarui.','Gagal menyimpan mutasi.');
  if(r)['m_jumlah','m_lawan','m_dok','m_nilai','m_pj'].forEach(k=>$(k).value='')};
function gambarMutasi(){
  const r=M.filter(m=>m.gudang===aktif).sort((a,b)=>b.tanggal.localeCompare(a.tanggal));
  $('tm').replaceChildren(...r.map(m=>{const tr=document.createElement('tr');let c=td('','c'),s=td(m.diterima==null?'':N(m.jumlah-m.diterima),'r');
    if(m.jenis==='Keluar'){const i=document.createElement('input');i.type='number';i.min=0;i.value=m.diterima??'';i.style.width='80px';i.setAttribute('aria-label','Jumlah diterima');i.disabled=!(G[m.gudang]&&G[m.gudang].boleh_tulis);i.onchange=async()=>{const r=await api('diterima/'+m._id,{diterima:+i.value});if(!r.ok)pesan('mm',galat(r,'Gagal menyimpan jumlah diterima.'),0);await muat()};c.append(i)}
    tr.append(td(m.tanggal,'c'),td(m.jenis,'c'),td(m.barang),td(N(m.jumlah)+' '+(m.satuan||''),'r'),td(m.lawan),td(m.moda,'c'),td(m.dokumen),c,s);return tr}));
}
const isian={};
function gambarOpname(){
  const g=G0();
  $('to').replaceChildren(...(g?g.items||[]:[]).map(x=>{const tr=document.createElement('tr'),f=document.createElement('input'),k=document.createElement('input'),s=td('','r'),a=isian[aktif+x.id]||{};
    f.id='of-'+x.id;f.type='number';f.min=0;f.value=a.f??'';f.style.width='90px';f.setAttribute('aria-label','Hitung fisik '+x.barang);k.value=a.k??'';k.maxLength=120;k.setAttribute('aria-label','Keterangan '+x.barang);
    const up=()=>{isian[aktif+x.id]={f:f.value,k:k.value};s.textContent=f.value===''?'':N(+f.value-x.jumlah)};f.oninput=up;k.oninput=up;up();
    const c=td('','c');c.append(f);const c2=td('');c2.append(k);tr.append(td(x.barang),td(x.satuan,'c'),td(N(x.jumlah),'r'),c,s,c2);return tr}));
  $('thO').replaceChildren(...O.slice().sort((a,b)=>b.tanggal.localeCompare(a.tanggal)).map(o=>{const tr=document.createElement('tr');tr.append(td(o.tanggal,'c'),td(o.gudang_nama),td(o.petugas),td(N(o.baris.length),'r'),td(N(o.baris.filter(b=>b.selisih).length),'r'),td(o.disesuaikan?'Ya':'Tidak','c'));return tr}));
}
$('os').onclick=async()=>{const g=G0();if(!g||!bisaTulis('mo'))return;const pt=$('o_petugas').value.trim();if(!pt)return pesan('mo','Isi nama petugas pemeriksa.');
  const baris=(g.items||[]).filter(x=>{const a=isian[aktif+x.id];return a&&a.f!==''&&a.f!==undefined}).map(x=>({barang_id:x.id,fisik:+isian[aktif+x.id].f,ket:isian[aktif+x.id].k||''}));
  if(!baris.length)return pesan('mo','Belum ada hasil hitung yang diisi.');
  const r=await tulis('opname/'+aktif,{tanggal:$('o_tanggal').value,petugas:pt,baris,disesuaikan:$('o_apply').checked},'mo','Berita acara tersimpan.','Gagal menyimpan berita acara.');
  if(r){(g.items||[]).forEach(x=>delete isian[aktif+x.id]);$('o_apply').checked=false;gambarOpname()}};

function bangunLaporan(){
  const jenis=$('l_jenis').value,hari=+$('l_per').value,akhir=$('l_tgl').value,kode=$('l_g').value;
  const d0=new Date(akhir);d0.setDate(d0.getDate()-hari+1);const awal=d0.toISOString().slice(0,10),dalam=t=>t>=awal&&t<=akhir;
  const gs=kode?[G[kode]]:Object.values(G),ms=M.filter(m=>(!kode||m.gudang===kode)&&dalam(m.tanggal)),os=O.filter(o=>(!kode||o.gudang===kode)&&dalam(o.tanggal));
  let head,rows,ring=[];
  if(jenis==='Laporan persediaan'){head=['Provinsi','Gudang','Barang','Kelompok','Jumlah','Baik','Rusak','Satuan','Kedaluwarsa','Per'];rows=gs.flatMap(g=>(g.items||[]).map(x=>[g.provinsi,g.nama,x.barang,x.kelompok,x.jumlah,x.baik,x.rusak,x.satuan,x.kedaluwarsa,x.per]));ring=[['Gudang',gs.length],['Jenis barang',rows.length]]}
  else if(jenis==='Rekap mutasi dan distribusi'){head=['Tanggal','Gudang','Jenis','Barang','Jumlah','Satuan','Asal atau tujuan','Moda','Dokumen','Diterima','Penanggung jawab'];rows=ms.sort((a,b)=>a.tanggal.localeCompare(b.tanggal)).map(m=>[m.tanggal,m.gudang_nama,m.jenis,m.barang,m.jumlah,m.satuan,m.lawan,m.moda,m.dokumen,m.diterima??'',m.pj]);ring=[['Masuk',ms.filter(m=>m.jenis==='Masuk').length],['Keluar',ms.filter(m=>m.jenis==='Keluar').length],['Penghapusan',ms.filter(m=>m.jenis==='Penghapusan').length]]}
  else if(jenis==='Laporan stok opname'){head=['Tanggal','Gudang','Petugas','Barang','Satuan','Tercatat','Hitung fisik','Selisih','Keterangan'];rows=os.flatMap(o=>o.baris.map(b=>[o.tanggal,o.gudang_nama,o.petugas,b.barang,b.satuan,b.tercatat,b.fisik,b.selisih,b.ket]));ring=[['Berita acara',os.length],['Baris selisih',rows.filter(r=>r[7]).length]]}
  else if(jenis==='Barang rusak dan kedaluwarsa'){head=['Provinsi','Gudang','Barang','Rusak','Satuan','Kedaluwarsa','Keadaan'];rows=gs.flatMap(g=>(g.items||[]).filter(x=>+x.rusak>0||kedaluwarsa(x.kedaluwarsa)).map(x=>[g.provinsi,g.nama,x.barang,x.rusak,x.satuan,x.kedaluwarsa,kedaluwarsa(x.kedaluwarsa)==='lewat'?'Lewat kedaluwarsa':(kedaluwarsa(x.kedaluwarsa)==='dekat'?'Kedaluwarsa dekat':'Rusak')]));ring=[['Baris',rows.length]]}
  else if(jenis==='Daftar peralatan (DBKP atau KIBAR)'){head=['Provinsi','Gudang','Kode barang','NUP','Nama barang','Merek dan tipe','Nomor seri','Tahun','Cara perolehan','Jumlah','Baik','Rusak ringan','Rusak berat','Nilai perolehan','Masa manfaat (tahun, KMK 295/2019)','Nilai buku (perkiraan garis lurus, Rp)','Lokasi','Label','Dokumen'];rows=gs.flatMap(g=>(g.items||[]).filter(adalahAset).map(x=>[g.provinsi,g.nama,x.kode_barang||'',x.nup||'',x.barang,x.merek||'',x.seri||'',x.tahun?String(x.tahun):'',x.cara||'',x.jumlah,x.baik,x.rr||0,x.rb||0,x.nilai||0,masaManfaat(x),nilaiBuku(x)??'',x.lokasi||'',x.label||'',x.dokumen||'']));ring=[['Baris',rows.length],['Nilai perolehan (Rp)',rows.reduce((a,r)=>a+r[13],0)]]}
  else if(jenis==='Daftar barang persediaan'){head=['Provinsi','Gudang','Kode atau NUSP','Barang','Kelompok','Batch','Kedaluwarsa','Jumlah','Satuan','Harga satuan','Nilai','Lokasi','Sumber dana','Dokumen'];rows=gs.flatMap(g=>(g.items||[]).filter(x=>!adalahAset(x)).map(x=>[g.provinsi,g.nama,x.kode_barang||'',x.barang,x.kelompok,x.batch||'',x.kedaluwarsa||'',x.jumlah,x.satuan,x.harga||0,(x.harga||0)*x.jumlah,x.lokasi||'',x.sumber_dana||'',x.dokumen||'']));ring=[['Baris',rows.length],['Nilai (Rp)',rows.reduce((a,r)=>a+r[10],0)]]}
  else if(jenis==='Hasil inventarisasi fisik'){head=['Tanggal','Gudang','Petugas','Barang','Satuan','Tercatat','Hitung fisik','Selisih','Hasil','Keterangan'];rows=os.flatMap(o=>o.baris.map(b=>[o.tanggal,o.gudang_nama,o.petugas,b.barang,b.satuan,b.tercatat,b.fisik,b.selisih,b.fisik===0&&b.tercatat>0?'Tidak ditemukan':(b.selisih>0?'Berlebih':(b.selisih<0?'Kurang':'Sesuai')),b.ket]));ring=[['Sesuai',rows.filter(r=>r[8]==='Sesuai').length],['Kurang',rows.filter(r=>r[8]==='Kurang').length],['Berlebih',rows.filter(r=>r[8]==='Berlebih').length],['Tidak ditemukan',rows.filter(r=>r[8]==='Tidak ditemukan').length]]}
  else{const k=ms.filter(m=>m.jenis==='Keluar'),t=new Map();k.forEach(m=>{const a=t.get(m.barang)||{j:0,n:0,s:m.satuan,d:new Set(),r:0};a.j+=m.jumlah;a.n+=m.nilai||0;a.d.add(m.lawan);a.r+=m.diterima??0;t.set(m.barang,a)});head=['Barang','Jumlah disalurkan','Satuan','Daerah penerima','Nilai (Rp)','Sudah diterima'];rows=[...t].map(([b,a])=>[b,a.j,a.s,a.d.size,a.n,a.r]);ring=[['Daerah penerima',new Set(k.map(m=>m.lawan).filter(Boolean)).size],['Jenis barang',t.size],['Nilai (Rp)',k.reduce((a,m)=>a+(m.nilai||0),0)]]}
  lap={jenis,awal,akhir,cak:kode?G[kode].nama+', '+G[kode].provinsi:'Semua gudang',head,rows,ring};
  $('hl').hidden=false;$('lj').textContent=jenis;$('ls').textContent=`${lap.cak}. Periode ${awal} sampai ${akhir}.`;
  $('lu').replaceChildren(...ring.map(([a,b])=>{const d=document.createElement('div'),s=document.createElement('span'),n=document.createElement('b');s.textContent=a;n.textContent=N(b);d.append(s,n);return d}));
  const tr=document.createElement('tr');tr.append(...head.map(h=>{const t=document.createElement('th');t.textContent=h;return t}));$('lh').replaceChildren(tr);
  $('lb').replaceChildren(...(rows.length?rows.map(r=>{const t=document.createElement('tr');t.append(...r.map(v=>td(typeof v==='number'?N(v):v,typeof v==='number'?'r':'')));return t}):[(()=>{const t=document.createElement('tr'),c=td('Belum ada data pada periode ini.','c');c.colSpan=head.length;t.append(c);return t})()]));
  $('ml').textContent='';
}
$('fl').onsubmit=e=>{e.preventDefault();bangunLaporan()};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const namaF=(x)=>`${lap.jenis} ${lap.akhir}.${x}`.replace(/\s+/g,'-');
function simpan(n,d){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([d],{type:/\.csv$/.test(n)?'text/csv;charset=utf-8':'text/html;charset=utf-8'}));a.href=u;a.download=n;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),3000)}
function unduh(n,d){simpan(n,d);pesan('ml','Berkas diunduh.',1)}
$('dc').onclick=()=>{const q=v=>{let s=String(v??'');if(typeof v!=='number'&&/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};unduh(namaF('csv'),'﻿'+[lap.head,...lap.rows].map(r=>r.map(q).join(',')).join('\r\n'))};
$('dh').onclick=()=>unduh(namaF('html'),`<!doctype html><meta charset=utf-8><title>${esc(lap.jenis)}</title><style>body{font-family:Roboto,Arial,sans-serif;font-size:12px;margin:24px}h1{font-size:18px}table{border-collapse:collapse;width:100%}th{background:#051c2c;color:#fff;padding:6px;text-align:center}td{border:1px solid #ccd6e0;padding:5px}</style><h1>${esc(lap.jenis)}</h1><p>${esc(lap.cak)}. Periode ${esc(lap.awal)} sampai ${esc(lap.akhir)}.</p><p>${lap.ring.map(([a,b])=>esc(a)+': '+N(b)).join(', ')}</p><table><tr>${lap.head.map(h=>'<th>'+esc(h)+'</th>').join('')}</tr>${lap.rows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(typeof v==='number'?N(v):v)+'</td>').join('')+'</tr>').join('')}</table>`);

const PERAL=['Kendaraan bermotor','Peralatan air','Alat komunikasi','Hunian dan penerangan','Air dan sanitasi','Peralatan khusus'];
const adalahAset=x=>PERAL.includes(x.kelompok);
const KOLOM_B=['kode_barang','lokasi','dokumen','kedaluwarsa','batch','harga','nup','merek','seri','tahun','cara','nilai','rr','rb','label'];
const ANGKA_B=new Set(['harga','tahun','nilai','rr','rb']);
function ubahMode(){const a=PERAL.includes($('b_kelompok').value);document.querySelectorAll('[data-m]').forEach(l=>l.hidden=(l.dataset.m==='A')!==a)}
$('b_kelompok').addEventListener('change',ubahMode);ubahMode();
const masaManfaat=x=>({Kendaraan:7,Perahu:10,'Mesin perahu':10,'Alat berat':10,Komunikasi:5,Chainsaw:10,Genset:10,Pompa:10}[x.kategori]||5);
function nilaiBuku(x){if(!x.nilai||!x.tahun)return null;const u=Math.max(0,+HARI().slice(0,4)-x.tahun),m=masaManfaat(x);return Math.round(x.nilai*Math.max(0,1-u/m)/1000)*1000}
const awalSemester=()=>{const h=HARI();return h.slice(0,4)+(+h.slice(5,7)<7?'-01-01':'-07-01')};
const pb=(v)=>Math.min(100,Math.max(0,Math.round(v)))+'%';
function lengkapA(x){return x.kode_barang&&x.nup&&x.tahun&&x.cara&&x.nilai&&x.lokasi&&x.dokumen&&x.label&&x.label!=='Belum'}
function lengkapP(x){const kd=x.kelompok==='Pangan'||x.kategori==='Obat';return x.kode_barang&&x.harga&&x.dokumen&&x.lokasi&&x.sumber_dana&&(!kd||x.kedaluwarsa)}
function gambarAudit(){
  const pilih=$('au_g');if(!pilih)return;const v=pilih.value,ks=Object.keys(G);
  pilih.replaceChildren(new Option('Semua gudang',''),...ks.map(k=>new Option(G[k].nama+', '+G[k].provinsi,k)));pilih.value=v;
  const k0=pilih.value,gs=k0?[[k0,G[k0]]]:Object.entries(G),semua=gs.flatMap(([k,g])=>(g.items||[]).map(x=>({...x,_g:g,_k:k}))),A=semua.filter(adalahAset),L=semua.filter(x=>!adalahAset(x));
  const aw=awalSemester(),opS=O.filter(o=>o.tanggal>=aw&&(!k0||o.gudang===k0)),mS=M.filter(m=>!k0||m.gudang===k0),keluar=mS.filter(m=>m.jenis==='Keluar');
  const hit=(a,f)=>[a.filter(f).length,a.length];
  const gudangOp=new Set(opS.map(o=>o.gudang));
  const barisOp=opS.flatMap(o=>o.baris),jumFisik=barisOp.reduce((a,b)=>a+b.fisik,0),jumKartu=barisOp.reduce((a,b)=>a+b.tercatat,0);
  const U=[
   ['Stok opname semester ini ada berita acaranya',...hit(gs,([k])=>gudangOp.has(k)),'Lakukan stok opname tiap gudang minimal per semester.'],
   ['Fisik sama dengan kartu stok',...hit(barisOp,b=>!b.selisih),'Jelaskan selisih fisik dan kartu, lalu sesuaikan catatan.'],
   ['Pencatatan rinci per spesifikasi',...hit(semua,x=>!/\(rekap\)/.test(x.barang)),'Rinci barang yang masih berupa rekap kategori.'],
   ['Persediaan punya kode, harga, dokumen, lokasi',...hit(L,lengkapP),'Lengkapi kolom persediaan di Input stok.'],
   ['Pangan dan obat punya tanggal kedaluwarsa',...hit(L.filter(x=>x.kelompok==='Pangan'||x.kategori==='Obat'),x=>x.kedaluwarsa),'Isi tanggal kedaluwarsa dan nomor batch.'],
   ['Penyaluran punya dokumen serah terima',...hit(keluar,m=>m.dokumen),'Isi nomor BAST atau surat jalan pada mutasi keluar.'],
   ['Penyaluran sudah dikonfirmasi diterima',...hit(keluar,m=>m.diterima!=null),'Isi jumlah diterima di riwayat mutasi.'],
   ['Peralatan punya kode barang dan NUP',...hit(A,x=>x.kode_barang&&x.nup),'Samakan dengan SIMAN, SAKTI, atau KIBAR.'],
   ['Peralatan berlabel',...hit(A,x=>x.label&&x.label!=='Belum'),'Pasang label dan catat statusnya.'],
   ['Peralatan punya dokumen kepemilikan',...hit(A,x=>x.dokumen),'Isi BAST, kontrak, atau BPKB.'],
   ['Nilai dan tahun perolehan untuk penyusutan',...hit(A,x=>x.nilai&&x.tahun),'Isi nilai dan tahun perolehan.'],
  ];
  $('au_t').replaceChildren(...U.map(([u,l,t,f])=>{const tr=document.createElement('tr'),s=document.createElement('span'),ok=t>0&&l===t,no=t===0;s.className='pil'+(ok?'':(no?'':' b'));s.textContent=no?'Belum ada data':(ok?'Lolos':'Belum lolos');const c=td('','c');c.append(s);tr.append(td(u),td(N(l),'r'),td(N(t),'r'),c,td(ok?'':f));return tr}));
  const uu=[['Uji lolos',U.filter(([, l,t])=>t>0&&l===t).length+' dari '+U.length],['Akurasi stok',jumKartu?pb((1-Math.abs(jumFisik-jumKartu)/jumKartu)*100):'Belum ada opname'],['Pemenuhan penyaluran',keluar.filter(m=>m.diterima!=null).length?pb(keluar.reduce((a,m)=>a+(m.diterima||0),0)/keluar.filter(m=>m.diterima!=null).reduce((a,m)=>a+m.jumlah,0)*100):'Belum ada data'],['Barang rusak',N(semua.reduce((a,x)=>a+(+x.rusak||0),0))]];
  $('au_u').replaceChildren(...uu.map(([a,b])=>{const d=document.createElement('div'),s=document.createElement('span'),n=document.createElement('b');s.textContent=a;n.textContent=b;d.append(s,n);return d}));
  const pct=(a,f)=>a.length?Math.round(a.filter(f).length/a.length*100)+'%':'–';
  $('au_g2').replaceChildren(...gs.sort((a,b)=>a[1].provinsi.localeCompare(b[1].provinsi,'id')).map(([k,g])=>{const it=g.items||[],a=it.filter(adalahAset),l=it.filter(x=>!adalahAset(x)),tr=document.createElement('tr');tr.append(td(g.provinsi),td(g.nama),td(N(a.length),'r'),td(pct(a,lengkapA),'r'),td(N(l.length),'r'),td(pct(l,lengkapP),'r'),td(gudangOp.has(k)?'Sudah':'Belum','c'));return tr}));
}
$('au_g').onchange=gambarAudit;

const FLOW={'Tanggap darurat':['Rapat koordinasi lintas sektor','Komandan tanggap darurat','Kepala gudang','Distribusi','Pelaporan kepala gudang','Selesai'],'Penguatan kesiapsiagaan':['Surat permohonan','Diagendakan di Deputi','Disposisi Direktur Logistik','Penelaahan Kasubdit','Usulan ke Direktur Logistik','Arahan Direktur Logistik','Surat perintah, surat pengeluaran, berita acara','Distribusi','Pengecekan barang','Pelaporan','Selesai']};
var P=[],bukaP=null,bolehSetuju=false;
function barisP(v={}){const tr=document.createElement('tr');const mk=(t,c)=>{const i=document.createElement('input');i.type=t;i.className=c;i.setAttribute('aria-label',c);return i};const a=mk('text','pb'),b=mk('number','pj'),s=mk('text','ps');b.min=1;a.value=v.b||'';const h=document.createElement('button');h.type='button';h.className='s';h.textContent='Hapus';h.onclick=()=>tr.remove();[a,b,s,h].forEach(x=>{const t=td('');t.append(x);tr.append(t)});$('p_items').append(tr)}
barisP();$('p_add').onclick=()=>barisP();
$('p_kirim').onclick=async()=>{const j=$('p_jenis').value,it=[...$('p_items').children].map(r=>({barang:r.querySelector('.pb').value.trim(),jumlah:+r.querySelector('.pj').value,satuan:r.querySelector('.ps').value.trim()})).filter(x=>x.barang&&x.jumlah>0);
  if(!$('p_bpbd').value.trim()||!$('p_prov').value.trim())return pesan('mp','Isi BPBD pemohon dan provinsi.');
  if(j==='Tanggap darurat'&&(!$('p_status').value||!$('p_sk').value.trim()))return pesan('mp','Tanggap darurat wajib mengisi status dan nomor penetapannya.');
  if(!it.length)return pesan('mp','Isi minimal satu barang.');
  const r=await tulis('permintaan',{jenis:j,bpbd:$('p_bpbd').value.trim(),provinsi:$('p_prov').value.trim(),kab:$('p_kab').value.trim(),status_darurat:$('p_status').value,sk:$('p_sk').value.trim(),jiwa:+$('p_jiwa').value||0,rekomendasi:$('p_rek').value,trc:$('p_trc').value.trim(),items:it},'mp','Permintaan terkirim.','Gagal mengirim permintaan.');
  if(r){$('fp').reset();$('p_items').replaceChildren();barisP();if(ME.peran==='bpbd'){$('p_bpbd').value=ME.nama||'';$('p_prov').value=((ME.provinsi||[])[0]||{}).nama||'';if(ME.kab)$('p_kab').value=ME.kab}}};
const namaTahap=p=>p.ditolak?'Ditolak':FLOW[p.jenis][p.tahap];
function gambarP(){
  $('pn').textContent=bolehSetuju?'Buka permintaan untuk memproses tahap berikutnya.':'Tahap diproses staf BNPB. Di sini Anda melihat permintaan milik sendiri.';
  $('tp').replaceChildren(...P.slice().sort((a,b)=>b.dibuat.localeCompare(a.dibuat)).map(p=>{const tr=document.createElement('tr'),s=document.createElement('span');s.className='pil'+(p.ditolak?' b':'');s.textContent=namaTahap(p);const c=td('','c');c.append(s);const a=td('','c'),b=document.createElement('button');b.className='s';b.textContent='Buka';b.onclick=()=>{bukaP=p._id;gambarPD()};a.append(b);tr.append(td(p.dibuat.slice(0,10),'c'),td(p.bpbd),td(p.provinsi),td(p.jenis),c,a);return tr}));
  gambarPD();
}
function gambarPD(){const p=P.find(x=>x._id===bukaP);$('pd').hidden=!p;if(!p)return;
  $('pdj').textContent=p.bpbd+', '+p.jenis;$('pds').textContent=[p.provinsi,p.kab,p.status_darurat,p.sk,p.jiwa?N(p.jiwa)+' jiwa':'',p.rekomendasi?'Rekomendasi provinsi: '+p.rekomendasi:'',p.trc].filter(Boolean).join('. ');
  $('pdi').closest('table').classList.toggle('tanpa-stok',!bolehSetuju);
  const bn=Object.values(G).filter(g=>g.pemilik==='BNPB').flatMap(g=>g.items||[]);
  const kata=s=>s.toLowerCase().split(/\s+/).filter(w=>w.length>3);
  $('pdi').replaceChildren(...p.items.map(i=>{const k=kata(i.barang),t=bn.filter(x=>k.some(w=>x.barang.toLowerCase().includes(w))).reduce((a,x)=>a+(+x.jumlah||0),0),tr=document.createElement('tr');tr.append(td(i.barang),td(N(i.jumlah)+' '+i.satuan,'r'),td(N(t),'r'));return tr}));
  $('pdh').replaceChildren(...p.riwayat.map(r=>{const tr=document.createElement('tr');tr.append(td(r.tahap),td(r.petugas),td(r.waktu.slice(0,16).replace('T',' '),'c'),td(r.catatan));return tr}));
  const akhir=p.ditolak||p.tahap>=FLOW[p.jenis].length-1;$('pda').hidden=akhir||!bolehSetuju;if(!akhir)$('pa_lanjut').textContent='Lanjut ke '+FLOW[p.jenis][p.tahap+1];}
async function majuP(tolak){const p=P.find(x=>x._id===bukaP);if(!p)return;const pt=$('pa_ptg').value.trim();if(!pt)return pesan('mpa','Isi nama petugas.');
  const r=await tulis('tahap/'+p._id,{aksi:tolak?'tolak':'lanjut',petugas:pt,catatan:$('pa_cat').value.trim(),dari:p.tahap},'mpa','Tahap tersimpan.','Gagal menyimpan tahap.');if(r)$('pa_cat').value=''}
$('pa_lanjut').onclick=()=>majuP(false);$('pa_tolak').onclick=()=>majuP(true);

const alamat=()=>location.origin+location.pathname;
function qrGambar(teks){const q=qrcode(0,'M');q.addData(teks);q.make();return q.createDataURL(4,0)}
function labelQR(){const g=G0();if(!g)return;const box=$('qrb'),tb=$('qrg'),it=(g.items||[]).slice(),akt=aktif;box.replaceChildren();box.hidden=false;$('qrd').hidden=true;tb.disabled=true;pesan('mo','Membuat '+N(it.length)+' label QR...',1);
  let i=0;const bagi=()=>{it.slice(i,i+20).forEach(x=>{const c=document.createElement('figure'),q=document.createElement('div'),t=document.createElement('figcaption');t.textContent=x.barang;c.append(q,t);box.append(c);const im=document.createElement('img');im.width=im.height=104;im.alt='QR '+x.barang;im.src=qrGambar(alamat()+'#q-'+akt+'-'+x.id);q.append(im)});
    i+=20;if(i<it.length)nanti(bagi);else{tb.disabled=false;$('qrd').hidden=false;pesan('mo','Label QR siap: '+N(it.length)+' barang.',1)}};
  nanti(bagi)}
$('qrg').onclick=labelQR;
$('qrd').onclick=()=>{const g=G0();if(!g)return;const isi=[...$('qrb').children].map(f=>{const im=f.querySelector('img');return `<figure><img src="${im.src}" width="110"><figcaption>${esc(f.querySelector('figcaption').textContent)}</figcaption></figure>`}).join('');unduh2(('Label QR '+g.nama+'.html').replace(/\s+/g,'-'),`<!doctype html><meta charset=utf-8><title>Label QR</title><style>body{font-family:Roboto,Arial,sans-serif;font-size:10px}main{display:flex;flex-wrap:wrap;gap:10px}figure{margin:0;width:130px;text-align:center;border:1px solid #ccd6e0;padding:6px}</style><h3>${esc(g.nama)}</h3><main>${isi}</main>`)};
function unduh2(n,d){simpan(n,d);pesan('mo','Label diunduh.',1)}
function bukaHash(){const m=location.hash.match(/^#q-(.+)-([a-z0-9]+)$/);if(!m||!G[m[1]])return;aktif=m[1];$('pg').value=aktif;gambar();document.querySelector('[data-h="opname"]').click();const i=document.getElementById('of-'+m[2]);if(i){i.scrollIntoView({block:'center'});i.focus()}}
addEventListener('hashchange',bukaHash);

/* ================================================================ tab Pengantaran (rencana kirim per kecamatan)
   Data besar (matriks waktu tempuh, kecamatan, terdampak staf) hanya dimuat sekali, saat tab pertama dibuka, dari /api/instansi/logpal/statis (sesi wajib).
   Stok dari G: gudang yang dikembalikan /api/instansi/logpal/data untuk akun ini, jadi akun BPBD merencanakan dari gudang yang boleh dilihatnya saja. */
const K0={m:null,kec:null,ter:null,ix:null,lebar:0,p:null};
/*kirim-murni*/
const ITEM_K=[['Paket makanan siap saji',j=>j*3,.5,'paket'],['Selimut',j=>j,1.5,'lembar'],['Matras dan kasur lipat',j=>j,3,'lembar'],['Paket perlengkapan keluarga',j=>Math.ceil(j/4),5,'paket'],['Terpal',j=>Math.ceil(j/4),5,'lembar'],['Tenda pengungsi',j=>Math.ceil(j/24),160,'unit'],['Velbed',j=>Math.ceil(j/24)*24,15,'unit'],['Genset',j=>Math.ceil(Math.ceil(j/24)/6),60,'unit'],['Light tower portable',j=>Math.ceil(Math.ceil(j/24)/6),150,'unit']];
const BLN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const tglK=(t)=>{const [,m,d]=String(t).split('-').map(Number);return m&&d?d+' '+BLN[m-1]:'–'};
const jamT=(j)=>j==null?'–':(j<48?Math.round(j)+' jam':Math.round(j/24*10)/10+' hari').replace('.',',');
function utamaK(t){return t[0]!=null?[t[0],'Darat']:(t[1]!=null?[t[1],'Laut']:(t[2]!=null?[t[2],'Udara']:[null,'']))}
function akhirK(c){return (+c.km_akhir||0)/(c.jauh==='1'?20:35)}
function tibaK(gi,c){const [j,m]=utamaK(K0.m.jam[gi][c._i]);return j==null?null:{utama:j,moda:m,akhir:akhirK(c),total:j+3+akhirK(c)}}
function idsK(l){return K0.m.gudang.map((g,i)=>[g,i]).filter(([g])=>g.status==='ada'&&(l==='semua'||g.pemilik==='BNPB')).map(([,i])=>i)}
const gudangG=(g)=>Object.values(G).filter(x=>g.pemilik==='BNPB'?(x.pemilik==='BNPB'&&x.nama===g.nama):(x.pemilik==='BPBD'&&x.provinsi===g.provinsi));
/* gudang matriks yang stoknya tampil untuk akun ini (ada di G dari /data); selain itu tidak dipakai di tabel tercepat dan peta */
const tampilK=(g)=>gudangG(g).length>0;
let stokG=null;const stokM=new Map();   // memo stok per gudang; G diganti objek baru tiap muat(), jadi memo dikosongkan saat G berubah
function stokK(g){if(stokG!==G){stokM.clear();stokG=G}if(stokM.has(g))return stokM.get(g);const t={};gudangG(g).flatMap(x=>x.items||[]).forEach(x=>{const k=x.item_standar||klasifikasi(x.barang).item_standar;if(k)t[k]=(t[k]||0)+(+x.baik||0)});stokM.set(g,t);return t}
function rencanaK(c,jiwa,cap,l){const R=idsK(l).map(i=>({g:K0.m.gudang[i],i,t:tibaK(i,c),s:stokK(K0.m.gudang[i]),m:{},ton:0})).filter(x=>x.t).sort((a,b)=>a.t.total-b.t.total);
  const B=ITEM_K.map(([n,f,kg,sat])=>{let sisa=f(jiwa);const kb=sisa,asal=[];for(const r of R){if(sisa<=0)break;const a=Math.min(sisa,r.s[n]||0);if(a>0){r.m[n]=a;r.ton+=a*kg/1000;sisa-=a;asal.push(r.g.nama)}}return {n,kb,sat,pn:kb-sisa,kr:sisa,asal}});
  const P=R.filter(r=>r.ton>0);P.forEach(r=>r.truk=Math.ceil(r.ton/cap));return {P,B}}
const normK=(s)=>String(s).toLowerCase().replace(/[^a-z]/g,'');
const kabDi=(kp,kab)=>K0.ix.get(kp+'|'+normK(kab))||[];   // indeks dibuat sekali di muatKirim
function cariKec(kp,kab,nm){const a=kabDi(kp,kab);return a.find(c=>normK(c.kec)===normK(nm))||a[0]}
/* status banjir terdampak yang masih berlaku: salinan TDm.tayang (public/banjir/terdampak.js), ambang 14 hari; Belum diketahui tidak dipakai */
function tayangK(doc,h=new Date(Date.now()+7*36e5).toISOString().slice(0,10)){return (doc&&doc.baris||[]).flatMap(b=>{const u=Math.round((Date.parse(h)-Date.parse(b.tanggal))/864e5);if(!(u<=14))return [];return b.status==='Belum surut'||b.status==='Sudah surut'?[{...b,umur:u}]:[]})}
/*akhir-kirim-murni*/
/*cuaca-murni*/
/* Cuaca jalur bantuan (LG-14): status resmi BMKG apa adanya, tanpa vonis layak atau tidak (KEPUTUSAN Q10 belum dijawab). Tanpa data tertulis = tidak ada data. D = {bandara, maritim, peringatan, siklon, siklonB} (JSON publik /banjir/data, null bila gagal dimuat). */
const jarakKm=(a,b,c,d)=>{const r=Math.PI/180,dl=(c-a)*r,dg=(d-b)*r,h=Math.sin(dl/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(dg/2)**2;return 12742*Math.asin(Math.sqrt(h))};
function terdekat(arr,lat,lon,la,lo){let b=null;for(const x of arr||[]){const y=la(x),z=lo(x);if(typeof y!=='number'||typeof z!=='number')continue;const k=jarakKm(lat,lon,y,z);if(!b||k<b.km)b={x,km:k}}return b}
const ZONA_JAM={WIB:7,WITA:8,WIT:9};
const msZona=(s,z)=>Date.parse(String(s).slice(0,16)+':00Z')-(ZONA_JAM[z]||7)*36e5;
function gelombangAktif(doc,prov,now){return ((doc&&doc.gelombang)||[]).filter(w=>w.prov===prov&&msZona(w.dari,w.zona)<=now&&now<msZona(w.sampai,w.zona))}
const umurJam=(doc,now)=>doc&&doc.dibuat?(now-Date.parse(doc.dibuat))/36e5:null;
const BASI_JAM=48;   // dokumen siklon lebih tua dari ini tidak dianggap daftar aktif
function siklonAktif(D,lat,lon,now){const o=[];
  const B=D.siklonB;if(B&&B.aktif&&umurJam(B,now)<=BASI_JAM)for(const s of B.aktif){const t=(s.titik||[]).filter(x=>!x.prakiraan).pop()||(s.titik||[])[0];if(t)o.push({sumber:'BMKG TCWC Jakarta',nama:s.nama,kategori:s.kategori,angin:t.angin_kt,waktu:t.waktu,km:jarakKm(lat,lon,t.lat,t.lon)})}
  const J=D.siklon;if(J&&J.aktif&&umurJam(J,now)<=BASI_JAM)for(const s of J.aktif){const t=(s.lintasan||[]).filter(x=>x[4]==='amatan').pop();if(t)o.push({sumber:s.sumber||'JTWC',nama:s.nama,kategori:s.kategori,angin:s.angin_kt,waktu:t[0],km:jarakKm(lat,lon,t[1],t[2])})}
  return o.sort((a,b)=>a.km-b.km)}
/* satu titik rute {nama,lat,lon,prov?} -> bandara, pelabuhan, perairan terdekat, peringatan gelombang aktif di provinsinya, siklon aktif */
function cuacaTitik(D,p,now){const B=D.bandara&&D.bandara.bandara?Object.values(D.bandara.bandara):null,M=D.maritim,
    bd=B&&terdekat(B,p.lat,p.lon,x=>x.lat,x=>x.lon),pl=M&&terdekat(M.pelabuhan,p.lat,p.lon,x=>x[3],x=>x[4]),pr=M&&terdekat(M.perairan,p.lat,p.lon,x=>x[3],x=>x[4]),
    prov=p.prov||(pl&&pl.x[2])||null;
  return {nama:p.nama,bandara:bd,pelabuhan:pl,perairan:pr,prov,gelombang:D.peringatan&&prov?gelombangAktif(D.peringatan,prov,now):null,siklon:(D.siklon||D.siklonB)?siklonAktif(D,p.lat,p.lon,now):null}}
const BLC=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'],ZN={'+07':'WIB','+08':'WITA','+09':'WIT'};
/* '2026-11-10T17:20+07:00' / '2026-11-10T16:30:00' (zona z) / '2026-11-09T12:00:00Z' / '2026-11-10 00:00 UTC' / '2026-11-10' -> '10 Nov 2026, 17.20 WIB'; Z dan UTC digeser ke WIB */
function waktuId(v,z){const m=String(v??'').match(/^(\d{4})-(\d\d)-(\d\d)(?:[T ](\d\d):(\d\d)(?::\d\d)?(?:\.\d+)?\s*(Z|UTC|[+-]\d\d(?::?\d\d)?)?)?$/);if(!m)return '–';let [,y,mo,d,h,mi,zz]=m;if(h==null)return `${+d} ${BLC[mo-1]} ${y}`;let lab=z||'WIB';if(zz==='Z'||zz==='UTC'){const t=new Date(Date.UTC(y,mo-1,d,h,mi)+7*36e5);y=t.getUTCFullYear();mo=t.getUTCMonth()+1;d=t.getUTCDate();h=String(t.getUTCHours()).padStart(2,'0');mi=String(t.getUTCMinutes()).padStart(2,'0');lab='WIB'}else if(zz)lab=ZN[zz.slice(0,3)]||zz;return `${+d} ${BLC[mo-1]} ${y}, ${h}.${mi} ${lab}`}
const LEVEL_GEL=[['sedang','Sedang'],['tinggi','Tinggi'],['sangat_tinggi','Sangat tinggi'],['ekstrem','Ekstrem']];
const tT=(v,s='')=>v==null?'–':(typeof v==='number'?v.toLocaleString('id-ID',{maximumFractionDigits:2}):String(v))+s;
function tabelBandara(b,now){const x=b.x,pk=(x.prakiraan||[]).slice(0,12),pg=x.pengamatan,met=typeof x.metar==='string'?x.metar:'';
  return `<p><b>Bandara ${esc(x.kode)} ${esc(x.nama)}</b>, ${tT(Math.round(b.km))} km dari titik ini. Data diambil ${esc(waktuId(x.diambil))}.</p>`
   +(pg?`<p>Pengamatan terakhir ${esc(waktuId(pg.waktu,x.zona))}: ${esc(pg.cuaca)}, angin ${tT(pg.angin_kmj,' km/jam')} (${esc(pg.arah||'–')}), jarak pandang ${tT(pg.vis_km,' km')}.</p>`:'<p>Tidak ada data pengamatan bandara.</p>')
   +(met?`<p>${esc(met)}</p>`:'')+(x.taf?`<p>${esc(x.taf)}</p>`:'')
   +(pk.length?`<div class="km-gulir"><table><thead><tr><th>Jam (${esc(x.zona||'')})</th><th>Cuaca</th><th>Angin km/jam</th><th>Arah</th><th>Jarak pandang km</th></tr></thead><tbody>${pk.map(r=>`<tr><td>${esc(String(r.waktu).slice(11,16).replace(':','.'))}</td><td>${esc(r.cuaca)}</td><td class="a">${tT(r.angin_kmj)}</td><td>${esc(r.arah||'–')}</td><td class="a">${tT(r.vis_km)}</td></tr>`).join('')}</tbody></table></div>`:'<p>Tidak ada data prakiraan 12 jam untuk bandara ini.</p>')}
function tabelMaritim(M,t,jenis,now){if(!t)return `<p>Tidak ada data ${jenis} terdekat.</p>`;const x=t.x,pel=jenis==='pelabuhan',h=M.hari||[],tgl=new Date(now+7*36e5).toISOString().slice(0,10),idx=h.map((d,i)=>i).filter(i=>h[i]>=tgl);
  const kol=[['Gelombang m',i=>x[5][i]==null?null:x[5][i]/10],['Kelas',i=>x[6][i]],['Embusan knot',i=>x[7][i]==null?null:Math.round(x[7][i])],['Arus knot',i=>x[8][i]==null?null:x[8][i].toLocaleString('id-ID',{minimumFractionDigits:1,maximumFractionDigits:1})]].concat(pel?[['Pasang maks cm',i=>x[10][i]],['Pasang min cm',i=>x[11][i]],['Jarak pandang min km',i=>x[12][i]]]:[]);
  if(!idx.length)return `<p>Tidak ada data ${jenis}: prakiraan BMKG yang tersimpan sudah lewat tanggalnya.</p>`;
  return `<p><b>${pel?'Pelabuhan':'Perairan'} ${esc(x[1])}</b> (${esc(x[0])}), ${tT(Math.round(t.km))} km dari titik ini. Prakiraan BMKG terbit ${esc(waktuId(M.terbit))}.</p><div class="km-gulir"><table><thead><tr><th>Tanggal</th>${kol.map(k=>`<th>${esc(k[0])}</th>`).join('')}</tr></thead><tbody>${idx.map(i=>`<tr><td>${esc(waktuId(h[i]))}</td>${kol.map(k=>{const v=k[1](i);return `<td class="a">${v==null?'–':esc(typeof v==='number'?v.toLocaleString('id-ID',{maximumFractionDigits:2}):v)}</td>`}).join('')}</tr>`).join('')}</tbody></table></div>`}
function htmlGelombang(g,prov){if(g==null)return '<p>Tidak ada data peringatan gelombang.</p>';if(!g.length)return `<p>Peringatan gelombang BMKG aktif untuk kode provinsi ${esc(prov)}: tidak ada pada data yang tersimpan.</p>`;
  return g.map(w=>`<p><b>Peringatan gelombang ${esc(w.wilayah)}</b>, berlaku ${esc(waktuId(w.dari,w.zona))} sampai ${esc(waktuId(w.sampai,w.zona))}.</p><ul>${LEVEL_GEL.filter(([k])=>(w[k]||[]).length).map(([k,n])=>`<li>${n}: ${esc(w[k].join(', '))}</li>`).join('')}</ul>`).join('')}
function htmlSiklon(s){if(s==null)return '<p>Tidak ada data siklon.</p>';if(!s.length)return '<p>Siklon aktif pada data BMKG dan JTWC yang tersimpan: tidak ada.</p>';
  return `<ul>${s.map(x=>`<li>${esc(x.nama)} (${esc(x.sumber)}), kategori ${esc(x.kategori||'–')}, angin ${tT(x.angin,' knot')}, posisi terakhir ${esc(waktuId(x.waktu))}, ${tT(Math.round(x.km))} km dari titik ini.</li>`).join('')}</ul>`}
function cuacaHtml(info,D,now){const ket=[['Bandara BMKG',D.bandara],['Maritim BMKG',D.maritim],['Peringatan gelombang BMKG',D.peringatan],['Siklon BMKG',D.siklonB],['Siklon JTWC',D.siklon]].map(([n,d])=>`${n}: ${d&&d.dibuat?'dibuat '+esc(waktuId(d.dibuat)):'tidak ada data'}`).join('; ');
  return `<p>Status resmi BMKG apa adanya, tanpa penilaian layak atau tidak. ${ket}.</p>`+info.map(t=>`<h3>${esc(t.nama)}</h3>`+(t.bandara?tabelBandara(t.bandara,now):'<p>Tidak ada data bandara.</p>')+tabelMaritim(D.maritim||{},t.pelabuhan,'pelabuhan',now)+tabelMaritim(D.maritim||{},t.perairan,'perairan',now)+htmlGelombang(t.gelombang,t.prov)+htmlSiklon(t.siklon)).join('')}
/*akhir-cuaca-murni*/
const CU={p:null,tk:0};
const jsonCu=(u)=>fetch(u).then(r=>r.ok?r.json():null).catch(()=>null);
const muatCuaca=()=>CU.p||(CU.p=Promise.all(['cuaca_bandara_bmkg','cuaca_maritim','peringatan','cuaca_siklon','cuaca_siklon_bmkg'].map(n=>jsonCu('/banjir/data/'+n+'.json'))).then(([bandara,maritim,peringatan,siklon,siklonB])=>{const D={bandara,maritim,peringatan,siklon,siklonB};if(Object.values(D).every(v=>v==null))CU.p=null;return D}));
/* dimuat malas sesudah rencana tampil; titik = tujuan dan sampai tiga gudang asal terdekat */
function tampilCuaca(c,P){const tk=++CU.tk,el=$('kr_cu');el.textContent='Memuat cuaca jalur bantuan.';const T=[{nama:`Tujuan: ${c.kec}, ${c.kab}`,lat:+c.lat,lon:+c.lon,prov:c.kode_prov}].concat(P.slice(0,3).map(r=>({nama:'Gudang asal: '+r.g.nama,lat:r.g.lat,lon:r.g.lon})));
  muatCuaca().then(D=>{if(tk!==CU.tk)return;const now=Date.now();el.innerHTML=cuacaHtml(T.map(t=>cuacaTitik(D,t,now)),D,now)}).catch(()=>{CU.p=null;if(tk===CU.tk)el.textContent='Tidak ada data cuaca: gagal dimuat.'})}
function isiPilih(sel,arr,v){sel.replaceChildren(...arr.map(x=>new Option(x)));if(v!=null)sel.value=v}
function isiKab(){const p=$('kr_p').value;isiPilih($('kr_k'),[...new Set(K0.kec.filter(c=>c.provinsi===p).map(c=>c.kab))].sort());isiKec()}
function isiKec(){const k=$('kr_k').value,p=$('kr_p').value;isiPilih($('kr_c'),K0.kec.filter(c=>c.provinsi===p&&c.kab===k).map(c=>c.kec).sort())}
function ubin(el,a){el.replaceChildren(...a.map(([x,y])=>{const d=document.createElement('div'),s=document.createElement('span'),n=document.createElement('b');d.className='km-u';s.textContent=x;n.textContent=y;d.append(s,n);return d}))}
const kolK=(t)=>t.toFixed(1).replace('.',',');
function hitungK(c,j,cap,l){const {P,B}=rencanaK(c,j,cap,l);$('kr_h').hidden=false;$('kr_h2').textContent=`Rencana kirim ke ${c.kec}, ${c.kab}`;
  $('kr_n').textContent=`Untuk ${N(j)} jiwa selama 3 hari. Rasio dari Juklak Standar Minimal 2024, paket keluarga dan terpal dihitung per KK isi 4 jiwa. Berat barang perkiraan. Stok dihitung dari gudang yang boleh dilihat akun ini.`+(c.jauh==='1'?' Kecamatan ini jauh dari jalan, antar terakhir perlu moda lain.':'');
  const tn=P.reduce((a,r)=>a+r.ton,0),tr=P.reduce((a,r)=>a+r.truk,0),kr=B.filter(b=>b.kr>0).length;
  ubin($('kr_u2'),[['Tiba pertama',P.length?jamT(P[0].t.total):'–'],['Semua tiba',P.length?jamT(Math.max(...P.map(r=>r.t.total))):'–'],['Total muatan',kolK(tn)+' ton'],['Truk',N(tr)+' truk'],['Barang kurang',kr+' dari '+B.length+' barang']]);
  $('kr_g').replaceChildren(...(P.length?P.map(r=>{const tr=document.createElement('tr');tr.append(td(r.g.nama),td(r.t.moda,'a'),td('perkiraan 3 jam','a'),td(jamT(r.t.utama),'a'),td(jamT(r.t.akhir),'a'),td(jamT(r.t.total),'a'),td(kolK(r.ton)+' ton','a'),td(N(r.truk),'a'));return tr}):[Object.assign(document.createElement('tr'),{innerHTML:'<td colspan="8">Tidak ada gudang yang terlihat akun ini dengan stok untuk barang di bawah.</td>'})]));
  $('kr_b').replaceChildren(...B.map(b=>{const tr=document.createElement('tr');tr.append(td(b.n),td(N(b.kb)+' '+b.sat,'a'),td(N(b.pn)+' '+b.sat,'a'),td(b.kr?N(b.kr)+' '+b.sat:'–','a'),td(b.asal.join(', ')||'Stok belum tercatat'));return tr}));
  const ib=K0.m.bandara[c._i],t=K0.m.tni[c._i],u=idsK(l).map(i=>K0.m.jam[i][c._i][2]).filter(v=>v!=null);
  $('kr_a').textContent=(u.length?`Alternatif udara: sekitar ${jamT(Math.min(...u))} lewat ${ib[0]||'bandara terdekat'}${ib[1]&&ib[1]!=='Sipil'?' ('+ib[1]+'). Bandara ini melibatkan TNI, pemakaiannya perlu izin TNI AU':''}. `:'')+(t[0]?`Pangkalan TNI terdekat: ${t[0]}, ${N(t[1])} km dari pusat kab/kota. Pemakaian pangkalan TNI perlu izin TNI AU.`:'');nanti(()=>tampilCuaca(c,P))}
function petaK(){const cv=$('kr_cv'),geo=dash.data('geo').data;if(!geo.features)return;K0.lebar=cv.clientWidth;const w=cv.clientWidth||900,h=Math.round(w*.42),r=devicePixelRatio||1;cv.width=w*r;cv.height=h*r;cv.style.height=h+'px';const x=cv.getContext('2d');x.scale(r,r);const pr=d3.geoMercator().fitSize([w,h],geo),pa=d3.geoPath(pr,x);const cs=getComputedStyle(cv);x.fillStyle=cs.getPropertyValue('--km-kosong')||'#ddd';x.strokeStyle=cs.getPropertyValue('--bg')||'#fff';x.lineWidth=.5;geo.features.forEach(f=>{x.beginPath();pa(f);x.fill();x.stroke()});
  const W_=c=>{const j=+c.jam_semua;return !c.jam_semua?'#888':j<=24?'#3b82c4':j<=72?'#e0a44a':'#c8102e'};K0.kec.forEach(c=>{const p=pr([+c.lon,+c.lat]);x.fillStyle=W_(c);x.fillRect(p[0]-.8,p[1]-.8,1.7,1.7)});
  K0.m.gudang.filter(g=>g.status==='ada'&&tampilK(g)).forEach(g=>{const p=pr([g.lon,g.lat]);x.fillStyle=g.pemilik==='BNPB'?'#051c2c':'#fff';x.strokeStyle='#051c2c';x.fillRect(p[0]-3.5,p[1]-3.5,7,7);x.strokeRect(p[0]-3.5,p[1]-3.5,7,7)});
  $('kr_lg').replaceChildren(...[['#3b82c4','Sampai 24 jam'],['#e0a44a','24 sampai 72 jam'],['#c8102e','Lewat 72 jam'],['#051c2c','Gudang BNPB']].map(([c,t])=>{const s=document.createElement('span'),i=document.createElement('i');i.style.background=c;s.append(i,t);return s}))}
const jedaK=()=>new Promise(r=>nanti(r));
const ambilK=async(n,wajib)=>{const r=await fetch(API+'statis?nama='+n,{credentials:'same-origin'});if(r.ok)return r.text();if(wajib)throw r.status;return ''};
function bukaKirim(){if(K0.m){if($('kr_cv').clientWidth!==K0.lebar)nanti(petaK);return}K0.p||=muatKirim().catch(e=>{K0.p=null;$('kr_m').className='msg e';$('kr_m').textContent=e===404?'Data rute belum diimpor ke server. Minta admin menjalankan impor LogPal (matriks dan kecamatan).':e===401||e===403?'Sesi berakhir atau akun tanpa hak. Masuk lagi.':'Data rute gagal dimuat. Buka tab ini lagi untuk mencoba ulang.'})}
async function muatKirim(){const m0=$('kr_m');m0.className='msg';m0.textContent='Memuat data rute.';await jedaK();
  const [m,k,t,td0]=await Promise.all([ambilK('matriks',1),ambilK('kecamatan',1),ambilK('terdampak'),fetch('/banjir/data/terdampak.json').then(r=>r.ok?r.json():null).catch(()=>null)]);
  await jedaK();const mm=JSON.parse(m),ix=new Map(mm.kab.map((x,i)=>[x,i]));
  const kec=dash._csv(k).map(c=>({...c,_i:ix.get(c.kode_prov+'|'+c.kab)}));await jedaK();
  const ix2=new Map();kec.forEach(c=>{const k=c.kode_prov+'|'+normK(c.kab);(ix2.get(k)||ix2.set(k,[]).get(k)).push(c)});K0.ix=ix2;K0.m=mm;K0.kec=kec;K0.ter=t?dash._csv(t):[];m0.textContent='';
  isiPilih($('kr_p'),[...new Set(kec.map(c=>c.provinsi))].sort());$('kr_p').onchange=isiKab;$('kr_k').onchange=isiKec;isiKab();
  const j=kec.map(c=>+c.jam_semua).filter(v=>v>0),jb=kec.map(c=>+c.jam_bnpb).filter(v=>v>0);ubin($('kr_u'),[['Kecamatan',N(kec.length)+' kecamatan'],['Tiba dalam 72 jam, semua gudang',N(j.filter(v=>v<=72).length)+' kecamatan'],['Tiba dalam 72 jam, BNPB saja',N(jb.filter(v=>v<=72).length)+' kecamatan'],['Jauh dari jalan',N(kec.filter(c=>c.jauh==='1').length)+' kecamatan']]);
  tabelTerdampak(tayangK(td0));
  $('kr_f').onsubmit=e=>{e.preventDefault();const c=K0.kec.find(x=>x.provinsi===$('kr_p').value&&x.kab===$('kr_k').value&&x.kec===$('kr_c').value);if(c)jalankanK(c,+$('kr_j').value,+$('kr_o').value||8,$('kr_l').value)};
  addEventListener('resize',tunda(()=>{if($('kr_cv').offsetParent)petaK()},250));
  nanti(petaK)}
/* chrome urgent dulu (pesan), hitungan dan gulir sesudah paint */
function jalankanK(c,j,cap,l){if(!(j>0)){$('kr_m').className='msg e';$('kr_m').textContent='Isi jumlah pengungsi lebih dari 0.';return}$('kr_m').className='msg';$('kr_m').textContent='Menghitung rencana.';nanti(()=>{hitungK(c,j,cap,l);$('kr_m').textContent='';$('kr_h').scrollIntoView({block:'start'})})}
function tabelTerdampak(baris){const L=idsK('semua').filter(i=>tampilK(K0.m.gudang[i])),tb=$('kr_t');   // tercepat hanya dari gudang yang stoknya tampil untuk akun ini
  if(!baris.length){const tr=document.createElement('tr'),x=td('Tidak ada kab/kota berstatus banjir yang masih berlaku (14 hari terakhir).');x.colSpan=10;tr.append(x);tb.replaceChildren(tr);return}
  tb.replaceChildren(...baris.map(b=>{const ter=K0.ter.find(r=>r.kode_prov===b.prov_kode&&normK(r.kab)===normK(b.kab)),c=cariKec(b.prov_kode,b.kab,ter?String(ter.kec).split(';')[0]:''),jw=ter&&+ter.jiwa>0?+ter.jiwa:0,
    bt=c&&L.map(i=>({g:K0.m.gudang[i],t:tibaK(i,c)})).filter(x=>x.t).sort((p,q)=>p.t.total-q.t.total)[0],tr=document.createElement('tr'),a=td('','a'),h=document.createElement('button');
    h.className='s';h.type='button';h.textContent=jw?'Hitung':'Isi jiwa';h.disabled=!c;
    h.onclick=()=>{$('kr_p').value=c.provinsi;isiKab();$('kr_k').value=c.kab;isiKec();$('kr_c').value=c.kec;
      if(jw){$('kr_j').value=jw;jalankanK(c,jw,+$('kr_o').value||8,$('kr_l').value)}
      else{$('kr_m').className='msg o';$('kr_m').textContent=`Jumlah jiwa ${b.kab} belum ada di data terdampak. Isi jumlah pengungsi lalu tekan Hitung rencana.`;$('kr_j').focus()}};
    a.append(h);tr.append(td(b.kab),td(b.provinsi),td(b.status,'a'),td(tglK(b.tanggal),'a'),td(ter?String(ter.kec).replace(/;/g,', '):'–'),td(jw?N(jw):'–','a'),td(bt?bt.g.nama:'–'),td(bt?bt.t.moda:'–','a'),td(bt?jamT(bt.t.total):'–','a'),a);return tr}))}

/* tab Bantuan: daftar bantuan peralatan dan logistik per BPBD per tahun. BUKAN stok; status kirim belum diketahui, jadi layar tidak menyebut terkirim atau diterima. Dimuat sekali saat tab pertama dibuka. */
const BN={m:null,p:null};
const BN_KOL=['Selimut','Matras','Kasur Lipat','Terpal','Makanan Siap Saji','Family Kit'];
function bukaBantuan(){if(BN.m||BN.p)return;const m=$('bn_m');m.className='msg';m.textContent='Memuat bantuan.';
  BN.p=api('bantuan').then(r=>{BN.p=null;
    if(!r.ok){m.className='msg e';m.textContent=r.s===401||r.s===403?'Sesi berakhir atau akun tanpa hak. Masuk lagi.':r.s===503?'Data bantuan belum diaktifkan di server. Minta admin menjalankan migrasi 0115.':galat(r,'Data bantuan gagal dimuat. Buka tab ini lagi untuk mencoba ulang.');return}
    BN.m=r.j.baris||[];m.textContent='';
    const ps=[...new Map(BN.m.map(b=>[b.prov,b.provinsi]))].sort((a,b)=>a[1].localeCompare(b[1],'id'));
    $('bn_prov').replaceChildren(new Option('Semua provinsi',''),...ps.map(([k,n])=>new Option(n,k)));
    gambarBn()}).catch(()=>{BN.p=null;m.className='msg e';m.textContent='Data bantuan gagal dimuat. Buka tab ini lagi untuk mencoba ulang.'})}
/*bantuan-murni*/
/* baris API + saring -> per BPBD {wilayah, belum, angka{barang:jumlah}, lain{"barang|satuan":jumlah}}; "Semua tahun" menjumlah kedua tahun */
function ringkasBn(baris,prov,tahun,belum){const per=new Map();
  for(const b of baris){if(prov&&b.prov!==prov)continue;if(tahun&&String(b.tahun)!==tahun)continue;
    const k=b.prov+'|'+b.wilayah;let x=per.get(k);if(!x)per.set(k,x={wilayah:b.wilayah,provinsi:b.provinsi,tingkat:b.tingkat,belum:false,angka:{},lain:{}});
    if(b.belum_usulkan)x.belum=true;
    if(BN_KOL.includes(b.barang))x.angka[b.barang]=(x.angka[b.barang]||0)+b.jumlah;
    else{const q=b.barang+'|'+b.satuan;x.lain[q]=(x.lain[q]||0)+b.jumlah}}
  let L=[...per.values()];if(belum)L=L.filter(x=>x.belum);
  return L.sort((a,b)=>a.provinsi.localeCompare(b.provinsi,'id')||(a.tingkat===b.tingkat?0:a.tingkat==='prov'?-1:1)||a.wilayah.localeCompare(b.wilayah,'id'))}
const teksLainBn=(lain)=>Object.entries(lain).map(([q,j])=>{const [b,s]=q.split('|');return b+' '+N(j)+(s?' '+s:'')}).join(', ');
/*akhir-bantuan-murni*/
function gambarBn(){if(!BN.m)return;const L=ringkasBn(BN.m,$('bn_prov').value,$('bn_tahun').value,$('bn_belum').checked),tb=$('bn_t');
  ubin($('bn_u'),[['BPBD',N(L.length)],['Belum mengusulkan',N(L.filter(x=>x.belum).length)]]);
  if(!L.length){const tr=document.createElement('tr'),x=td('Tidak ada BPBD untuk pilihan ini.','a');x.colSpan=9;tr.append(x);tb.replaceChildren(tr);return}
  const jml=Object.fromEntries(BN_KOL.map(k=>[k,0]));
  const baris=L.map(r=>{const tr=document.createElement('tr');BN_KOL.forEach(k=>{jml[k]+=r.angka[k]||0});
    const st=document.createElement('span');st.className='km-pil';st.textContent=r.belum?'Belum mengusulkan':'Sudah mengusulkan';const c=td('','a');c.append(st);
    tr.append(td(r.wilayah),c,td(teksLainBn(r.lain)||'–','t'),...BN_KOL.map(k=>td(r.angka[k]?N(r.angka[k]):'–','a')));return tr});
  const tot=document.createElement('tr');tot.className='tot';tot.append(td('Total'),td(''),td(''),...BN_KOL.map(k=>td(N(jml[k]),'a')));
  tb.replaceChildren(...baris,tot)}
['bn_prov','bn_tahun','bn_belum'].forEach(i=>$(i).onchange=()=>nanti(gambarBn));

/* 🧪 isi / 🧹 hapus data dummy (Super Admin; server menolak selain itu). Sesudahnya semua tab dimuat ulang, termasuk Bantuan. */
$('dummy').onclick=(e)=>{const b=e.target.closest('[data-dummy]');if(!b)return;const aksi=b.dataset.dummy;if(aksi==='hapus'&&!confirm('Hapus SEMUA data dummy LogPal? Data asli tidak tersentuh.'))return;
  const m=$('dummyMsg');m.textContent='Memproses.';nanti(async()=>{const r=await api('dummy',{aksi});
    if(!r.ok){m.textContent=galat(r,'Gagal memproses data dummy.');return}
    BN.m=null;await muat();if(!$('bn_t').closest('[data-tab]').hidden)bukaBantuan();m.textContent=aksi==='isi'?'Data dummy terisi.':'Data dummy terhapus.'})};


muat();

