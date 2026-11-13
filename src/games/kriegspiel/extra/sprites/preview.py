from PIL import Image, ImageDraw, ImageFont
import sys
U=Image.open('png/unites.png'); T=Image.open('png/terrain.png'); M=Image.open('png/marqueurs.png')
def tile(sheet,i,r=0,size=40): return sheet.crop((i*200,r*200,i*200+200,r*200+200)).resize((size,size),Image.LANCZOS)
F=lambda s: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',s)
W=1400; img=Image.new('RGB',(W,1180),'#ece6d6'); d=ImageDraw.Draw(img)
y=15
d.text((20,y),"Planches à 100 % (cases de 200 px affichées à 100 px)",fill='#222',font=F(20)); y+=35
names=["Infanterie","Cavalerie","Artillerie","Artillerie","Transmission","Estafette"]
for r,lab in enumerate(["Nord","Sud"]):
    d.text((20,y+40),lab,fill='#222',font=F(18))
    for i in range(6): img.paste(tile(U,i,r,100),(110+i*120,y),tile(U,i,r,100))
    y+=110
sub=["","","","à cheval","",""]
for i,n in enumerate(names): d.text((110+i*120,y),n,fill='#444',font=F(13)); d.text((110+i*120,y+15),sub[i],fill='#444',font=F(13))
y+=40
tn=["Montagne","Col","Forteresse","Arsenal Nord","Arsenal Sud","Arsenal détruit"]
for i in range(6): img.paste(tile(T,i,0,100),(110+i*120,y),tile(T,i,0,100)); d.text((110+i*120,y+105),tn[i],fill='#444',font=F(13))
d.text((20,y+40),"Terrain",fill='#222',font=F(18)); y+=135
mn=["Déjà déplacée","Isolée","Retraite oblig.","Cible détruite","Cible retraite","Sélection","Dest. en comm.","Dest. isolée"]
for i in range(8):
    bg=Image.new('RGBA',(100,100),'#d8cfb8'); t=tile(M,i,0,100); bg.alpha_composite(t)
    img.paste(bg,(110+i*120,y)); d.text((110+i*120,y+105),mn[i],fill='#444',font=F(12))
d.text((20,y+40),"Marqueurs",fill='#222',font=F(18)); y+=140
# plateau à 40 px
S=40; R="ABCDEFGHIJKLMNOPQRST"
d.text((20,y),"Extrait de plateau à 40 px par case (taille d'affichage réelle typique)",fill='#222',font=F(20)); y+=35
x0,y0=60,y; cols=range(3,25); rows=range(0,12)
terr={'B8':2,'D8':3,'B15':3,'I13':2,'H21':2,'F10':1,'L15':2,'N11':0,'N12':0,'N13':0,'N14':0,'N15':0,'N16':0,'O16':1,'O23':2,'M3':2}
for c in range(10,14): terr['C%d'%c]=0
for r in 'DEGHI': terr[r+'10']=0
units={'C8':(0,0),'C9':(0,0),'D9':(4,0),'E8':(2,0),'E9':(0,0),'F9':(1,0),'F11':(1,0),'G11':(1,0),'H11':(1,0),'H12':(0,0),'I12':(0,0),'J14':(3,0),'B16':(5,0),
       'K12':(0,1),'K13':(0,1),'K14':(1,1),'L13':(0,1),'L14':(2,1),'L15':(0,1),'K16':(1,1),'M17':(4,1),'K20':(0,1)}
mk={'H12':[0],'K12':[3],'K13':[4],'F11':[0,5],'J14':[1],'L13':[2]}
for ri,r in enumerate(rows):
    for ci,c in enumerate(cols):
        x=x0+ci*S; yy=y0+ri*S; key=R[r]+str(c)
        img.paste('#e3d9bf' if r<10 else '#dfd2b2',(x,yy,x+S,yy+S))
        d.rectangle((x,yy,x+S,yy+S),outline='#b9ad92')
        if key in terr: t=tile(T,terr[key]); img.paste(t,(x,yy),t)
        if key in units: i,s=units[key]; t=tile(U,i,s); img.paste(t,(x,yy),t)
        for m in mk.get(key,[]): t=tile(M,m); img.paste(t,(x,yy),t)
    d.text((x0-25,y0+ri*S+12),R[r],fill='#333',font=F(14))
for ci,c in enumerate(cols): d.text((x0+ci*S+12,y0-18),str(c),fill='#333',font=F(11))
d.line((x0,y0+10*S,x0+len(cols)*S,y0+10*S),fill='#7a3d0c',width=3)
img.save('preview.png')
