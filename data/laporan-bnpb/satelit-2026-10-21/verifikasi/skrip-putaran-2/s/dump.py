import re,sys
s=open(sys.argv[1]).read()
for m in re.finditer(r'<p:(sp|cxnSp|pic)>.*?</p:\1>',s,re.S):
    b=m.group(0)
    o=re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/><a:ext cx="(\d+)" cy="(\d+)"/>',b)
    x,y,cx,cy=map(int,o.groups()) if o else (0,0,0,0)
    t='|'.join(re.findall(r'<a:t>([^<]*)</a:t>',b))
    g=re.search(r'prst="(\w+)"',b); f=re.search(r'<p:spPr>.*?<a:solidFill><a:srgbClr val="(\w+)"',b,re.S)
    tc=re.findall(r'<a:rPr[^>]*>\s*<a:solidFill><a:srgbClr val="(\w+)"',b)
    sz=re.findall(r'<a:rPr[^>]*sz="(\d+)"',b)
    print(m.group(1),x,y,cx,cy,g.group(1) if g else '',f.group(1) if f else '',repr(t[:200]),set(tc),set(sz))
