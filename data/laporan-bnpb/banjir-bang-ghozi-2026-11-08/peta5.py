"""Peta slide 2: level banjir tertinggi tiap kab/kota dalam 4 hari ke depan, label provinsi yang masuk tabel."""
import json,hashlib,glob,os,shutil,math
from PIL import Image,ImageDraw,ImageFont,ImageFilter
SK='C:/Users/USER/.claude/skills/ppt-konsultan/bnpb/assets/'
PJ=SK+'proyek-banjir0811/'; G=SK+'proyek-bnpb/geo/kabupaten/'
D4=json.load(open('kec4.json',encoding='utf-8')); LV=D4['lv']
LON0,LON1,LAT0,LAT1=94.0,141.6,-11.3,7.0
SS=2; PW=2000; PH=int(PW*(LAT1-LAT0)/(LON1-LON0))
X=lambda o:(o-LON0)/(LON1-LON0)*PW*SS; Y=lambda a:(LAT1-a)/(LAT1-LAT0)*PH*SS
WR={3:'#8F3F07',2:'#E8894A',1:'#F4C3A0',0:'#DCE3EB'}; NAVY='#24384F'
im=Image.new('RGB',(PW*SS,PH*SS),'#FFFFFF'); d=ImageDraw.Draw(im)
F=lambda s,b=True: ImageFont.truetype(SK+'fonts/Roboto-'+('Bold' if b else 'Medium')+'.ttf',s*SS)
rings=lambda g:[g['coordinates']] if g['type']=='Polygon' else g['coordinates']
for f_ in sorted(glob.glob(G+'*.json')):
    kp=os.path.basename(f_)[:2]
    for ft in json.load(open(f_,encoding='utf-8'))['features']:
        k=kp+'|'+ft['properties']['kab']
        for q in rings(ft['geometry']):
            pts=[(X(c[0]),Y(c[1])) for c in q[0]]
            if len(pts)>2: d.polygon(pts,fill=WR[LV.get(k,0)],outline='#FFFFFF',width=1)
def label(x,y,t):
    f=F(38); w=d.textlength(t,font=f)+44*SS; h=62*SS
    tepi=24*SS; m=Image.new('L',(int(w)+2*tepi,int(h)+2*tepi),0); ImageDraw.Draw(m).rounded_rectangle([tepi,tepi,tepi+w,tepi+h],radius=h/2,fill=90); m=m.filter(ImageFilter.GaussianBlur(7*SS))
    im.paste(Image.new('RGB',m.size,'#24384F'),(int(x-w/2)-tepi,int(y-h/2)-tepi+4*SS),m)
    d.rounded_rectangle([x-w/2,y-h/2,x+w/2,y+h/2],radius=h/2,fill='#FFFFFF',outline='#C9D1DB',width=2*SS); d.text((x,y),t,font=f,fill=NAVY,anchor='mm')
for lo,la,t in ((99.5,6.2,'Aceh'),(102.7,3.6,'Sumut'),(96.8,-1.3,'Sumbar'),(106.8,-9.0,'Jabar'),(106.6,2.3,'Kalbar'),(126.5,3.2,'Sulut')): label(X(lo),Y(la),t)
km=111.32*math.cos(math.radians(2)); px=500/km/(LON1-LON0)*PW*SS; x0,y0=X(95.2),Y(-9.9)
d.line([(x0,y0),(x0+px,y0)],fill=NAVY,width=4*SS); d.text((x0+px/2,y0-28*SS),'500 km',font=F(28,False),fill=NAVY,anchor='mm')
ax,ay=X(138.8),Y(5.3); d.polygon([(ax,ay-46*SS),(ax-14*SS,ay),(ax+14*SS,ay)],fill=NAVY); d.text((ax,ay+20*SS),'U',font=F(30),fill=NAVY,anchor='mm')
im=im.resize((PW,PH),Image.LANCZOS)
png=PJ+'petanya/probabilitas-081126.png'; im.save(png,optimize=True)
mas=PJ+'petanya/kec4-081126.json'; shutil.copy('kec4.json',mas)
sha=lambda p:hashlib.sha256(open(p,'rb').read()).hexdigest()
json.dump({'unsur_peta':{'sumber_batas':'Batas kab/kota BIG','sistem_referensi':'WGS 84','proyeksi':'ekuirektangular','catatan':'Batas wilayah bukan rujukan resmi'},'masukan':{'kec4-081126.json':sha(mas)}},open(PJ+'petanya/probabilitas-081126.json','w',encoding='utf-8'),ensure_ascii=False)
print(im.size)
