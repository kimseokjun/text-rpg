"""전투 그림 처리: public/sprites/<kind>/<id>.png(+_atk.png) → 게임용 webp + src/data/spriteManifest.ts

- 원본(1024 투명 PNG, Codex 업로드)은 그대로 두고 옆에 <id>.webp, <id>_atk.webp 를 만든다.
- 기본 자세: 그림이 있는 영역만 잘라 높이 OUT_H px로 줄인다.
- 공격 자세: 원본마다 맞춤 크기가 달라서, 몸 크기가 기본 자세와 비슷하도록 높이를 기본의 ATK_RATIO 배로 맞춘다.
  (무기를 앞으로 뻗어 폭이 넓어진 그림이 작게 맞춰져 있기 때문)
사용: python3 scripts/sprites.py
"""
import glob, json, os
from PIL import Image

OUT_H = 256
ATK_RATIO = 0.92
ROOT = os.path.join(os.path.dirname(__file__), '..')

def clean(im):
    im = im.convert('RGBA')
    a = im.getchannel('A').point(lambda v: 0 if v < 24 else v)
    im.putalpha(a)
    return im.crop(im.getbbox())

manifest = {}
for png in sorted(glob.glob(os.path.join(ROOT, 'public/sprites/*/*.png'))):
    kind, name = png.split(os.sep)[-2], os.path.basename(png)[:-4]
    if name.endswith('_atk'):
        continue
    idle = clean(Image.open(png))
    s = OUT_H / idle.height
    out = idle.resize((round(idle.width * s), OUT_H), Image.LANCZOS)
    out.save(png[:-4] + '.webp', quality=90, method=6)
    entry = {'w': out.width, 'h': out.height}
    atk_png = png[:-4] + '_atk.png'
    if os.path.exists(atk_png):
        atk = clean(Image.open(atk_png))
        ah = round(OUT_H * ATK_RATIO)
        a2 = atk.resize((round(atk.width * ah / atk.height), ah), Image.LANCZOS)
        a2.save(atk_png[:-4] + '.webp', quality=90, method=6)
        entry.update({'aw': a2.width, 'ah': a2.height})
    manifest[f'{kind}/{name}'] = entry

lines = ['/** 자동 생성: python3 scripts/sprites.py — 직접 고치지 않는다. 값은 webp 픽셀 크기 (높이 기준 ' + str(OUT_H) + ') */',
         'export interface SpriteInfo { w: number; h: number; aw?: number; ah?: number }',
         'export const SPRITES: Record<string, SpriteInfo> = {']
for k, v in manifest.items():
    lines.append(f"  '{k}': {json.dumps(v).replace('\"', '')},")
lines.append('};')
open(os.path.join(ROOT, 'src/data/spriteManifest.ts'), 'w').write('\n'.join(lines) + '\n')
print(len(manifest), 'sprites')
