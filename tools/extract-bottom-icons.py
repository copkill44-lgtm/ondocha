from pathlib import Path
from collections import deque
from PIL import Image
import numpy as np
root=Path.cwd()
folder=root/'assets/images/icon'
source=Image.open(folder/'\uc544\uc774\ucf58 \ubc14\uc9c0.png').convert('RGBA')
scale=source.width/2048
boxes=[('pants-basic',(375,5,535,171)),('pants-denim',(680,5,820,171)),('pants-cargo',(955,5,1130,171)),('pants-wide',(1245,5,1405,171)),('pants-jogger',(1540,5,1705,171)),('shorts-basic',(350,260,535,381)),('shorts-denim',(650,260,840,381)),('shorts-cargo',(945,255,1135,381)),('shorts-bermuda',(1250,250,1420,381)),('shorts-sport',(1540,255,1725,381)),('skirt-basic',(350,475,540,593)),('skort',(660,475,845,593)),('skirt-short',(950,475,1145,593))]
for name,box in boxes:
    im=source.crop(tuple(round(v*scale) for v in box))
    pixels=np.array(im)
    active=pixels[:,:,3]>100
    h,w=active.shape
    largest=[]
    for y in range(h):
        for x in range(w):
            if not active[y,x]: continue
            q=deque([(x,y)]); active[y,x]=False; part=[]
            while q:
                px,py=q.popleft(); part.append((px,py))
                for nx,ny in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
                    if 0<=nx<w and 0<=ny<h and active[ny,nx]:
                        active[ny,nx]=False; q.append((nx,ny))
            if len(part)>len(largest): largest=part
    mask=np.zeros((h,w),dtype=np.uint8)
    for x,y in largest: mask[y,x]=pixels[y,x,3]
    pixels[:,:,3]=mask
    clean=Image.fromarray(pixels)
    clean=clean.crop(clean.getbbox())
    clean.save(folder/(name+'.png'))
    print(name,clean.size)