"""Extract the four existing transparent garments without regenerating artwork."""
from collections import deque
from pathlib import Path
from PIL import Image
import numpy as np

root = Path(__file__).resolve().parents[1]
folder = root / 'assets/images/wear'
source = Image.open(folder / '\uc637.png').convert('RGBA')
pixels = np.array(source)
active = pixels[:, :, 3] > 32
height, width = active.shape
parts = []
for y in range(height):
    for x in range(width):
        if not active[y, x]:
            continue
        queue = deque([(x, y)])
        active[y, x] = False
        component = []
        while queue:
            px, py = queue.popleft()
            component.append((px, py))
            for nx, ny in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
                if 0 <= nx < width and 0 <= ny < height and active[ny,nx]:
                    active[ny,nx] = False
                    queue.append((nx,ny))
        if len(component) > 1000:
            parts.append(component)
assert len(parts) == 4, f'Expected four garments, found {len(parts)}'
parts.sort(key=lambda p: (min(y for x,y in p)//340, min(x for x,y in p)))
for name, component in zip(('tee-short','tee-long','shirt-short','shirt-long'), parts):
    mask = Image.new('L', source.size)
    mask.putdata([0] * (width*height))
    access = mask.load()
    for x,y in component:
        access[x,y] = 255
    # Keep the original antialiasing around the connected garment only.
    from PIL import ImageFilter, ImageChops
    # The neighboring sleeves almost touch; do not expand into another garment.
    layer = source.copy()
    layer.putalpha(ImageChops.multiply(source.getchannel('A'), mask))
    layer = layer.crop(layer.getbbox())
    layer.save(folder / (name + '.png'))
    print(name, layer.size)