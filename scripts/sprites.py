"""전투 그림 처리: public/sprites/<kind>/<id>.png(+_atk.png) → 게임용 webp + src/data/spriteManifest.ts

- 원본(1024 투명 PNG, Codex 업로드)은 그대로 두고 옆에 <id>.webp, <id>_atk.webp 를 만든다.
- 기본 자세: 그림이 있는 영역만 잘라 높이 OUT_H px로 줄인다.
- 공격 자세: 2단계부터는 원본이 기본 자세와 같은 배율이라 같은 비율로 줄이고, 원본 위치 차이(오른쪽·아래 끝)를 ar·ab로 기록한다.
  1단계(LEGACY_FIT)는 공격 자세가 따로 캔버스에 맞춰져 있어서, 높이를 기본의 ATK_RATIO 배로 맞추고 오른쪽 아래에 붙인다.
사용: python3 scripts/sprites.py  (이미 변환한 그림은 원본이 바뀌지 않았으면 건너뜀)
"""
import glob, json, os
from PIL import Image

OUT_H = 256
ATK_RATIO = 0.92
LEGACY_FIT = {'job/warrior', 'job/mage', 'job/archer', 'job/priest', 'mon/morten'}
ROOT = os.path.join(os.path.dirname(__file__), '..')

def clean(im):
    im = im.convert('RGBA')
    a = im.getchannel('A').point(lambda v: 0 if v < 24 else v)
    im.putalpha(a)
    return im, im.getbbox()

manifest = {}
# 기존 manifest 읽기 (변환 건너뛰기용)
old_manifest = {}
mpath = os.path.join(ROOT, 'src/data/spriteManifest.ts')
if os.path.exists(mpath):
    import re
    for k, body in re.findall(r"'([^']+)': \{([^}]*)\}", open(mpath).read()):
        old_manifest[k] = {a: int(b) for a, b in re.findall(r'(\w+): (-?\d+)', body)}
for png in sorted(glob.glob(os.path.join(ROOT, 'public/sprites/*/*.png'))):
    kind, name = png.split(os.sep)[-2], os.path.basename(png)[:-4]
    if name.endswith('_atk'):
        continue
    key = f'{kind}/{name}'
    webp, atk_png, atk_webp = png[:-4] + '.webp', png[:-4] + '_atk.png', png[:-4] + '_atk.webp'
    fresh = lambda src, dst: os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src)
    if key not in LEGACY_FIT and key in old_manifest and fresh(png, webp) and (not os.path.exists(atk_png) or fresh(atk_png, atk_webp)):
        manifest[key] = old_manifest[key]  # 이미 변환됨 (원본이 바뀌지 않았으면 건너뜀)
        continue
    raw, box = clean(Image.open(png))
    idle = raw.crop(box)
    s = OUT_H / idle.height
    out = idle.resize((round(idle.width * s), OUT_H), Image.LANCZOS)
    out.save(png[:-4] + '.webp', quality=90, method=6)
    entry = {'w': out.width, 'h': out.height}
    atk_png = png[:-4] + '_atk.png'
    if os.path.exists(atk_png):
        araw, abox = clean(Image.open(atk_png))
        atk = araw.crop(abox)
        if key in LEGACY_FIT:
            ah = round(OUT_H * ATK_RATIO)
            a2 = atk.resize((round(atk.width * ah / atk.height), ah), Image.LANCZOS)
            ar = ab = 0
        else:
            a2 = atk.resize((round(atk.width * s), round(atk.height * s)), Image.LANCZOS)
            ar, ab = round((box[2] - abox[2]) * s), round((box[3] - abox[3]) * s)
        a2.save(atk_png[:-4] + '.webp', quality=90, method=6)
        entry.update({'aw': a2.width, 'ah': a2.height})
        if ar or ab:
            entry.update({'ar': ar, 'ab': ab})
    manifest[f'{kind}/{name}'] = entry

lines = ['/** 자동 생성: python3 scripts/sprites.py — 직접 고치지 않는다. 값은 webp 픽셀 크기 (높이 기준 ' + str(OUT_H) + ') */',
         'export interface SpriteInfo { w: number; h: number; aw?: number; ah?: number; ar?: number; ab?: number }',
         'export const SPRITES: Record<string, SpriteInfo> = {']
for k, v in manifest.items():
    lines.append(f"  '{k}': {json.dumps(v).replace('\"', '')},")
lines.append('};')
open(os.path.join(ROOT, 'src/data/spriteManifest.ts'), 'w').write('\n'.join(lines) + '\n')
print(len(manifest), 'sprites')
