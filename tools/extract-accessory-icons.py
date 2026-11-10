from pathlib import Path
from collections import deque
from PIL import Image
import numpy as np
root=Path.cwd()
folder=root/'assets/images/icon'
source=Image.open(folder/'\uc544\uc774\ucf58 \uc561\uc138\uc0ac\ub9ac.png').convert('RGBA')
scale=source.width/2048
boxes=[('accessory-bag',(100,180,315,385)),('accessory-hat',(420,195,650,380)),('accessory-scarf',(760,170,965,388)),('accessory-necklace',(1100,180,1290,380)),('accessory-earrings',(1430,190,1630,380)),('accessory-watch',(1765,175,1940,390))]
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
            if len(part)>100: largest.extend(part)
    mask=np.zeros((h,w),dtype=np.uint8)
    for x,y in largest: mask[y,x]=pixels[y,x,3]
    pixels[:,:,3]=mask
    clean=Image.fromarray(pixels)
    clean=clean.crop(clean.getbbox())
    clean.save(folder/(name+'.png'))
    print(name,clean.size)