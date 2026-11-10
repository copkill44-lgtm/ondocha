from pathlib import Path
from collections import deque
from PIL import Image
import numpy as np
root=Path.cwd()
folder=root/'assets/images/icon'
source=Image.open(folder/'\uc544\uc774\ucf58.png').convert('RGBA')
scale=source.width/2048
boxes=[('cardigan',(1415,345,1612,553)),('windbreaker',(1618,340,1814,553)),('puffer',(1818,340,2040,553))]
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