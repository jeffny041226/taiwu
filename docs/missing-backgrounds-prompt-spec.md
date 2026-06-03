# 缺失背景素材生成 Prompt 规格文档

> 用途：本项目所有 UI 全屏背景的 AI 生图 prompt 集中档。
> 适用范围：MiniMax image-01 / Midjourney v6.1 / Flux 1.1 Pro / SDXL + 国风 LoRA / DALL-E 3 / Ideogram 2.0 等主流模型。
> 维护者：每次新加背景请先复制本文件的「通用风格基线」再补充页面专属内容，保证系列风格统一。

---

## 1. 通用规格

| 参数 | 值 |
|---|---|
| 设计画布 | 390 × 844 px（iPhone 14/15 竖屏） |
| 出图尺寸 | **1170 × 2532 px**（3x 密度） |
| 比例 | 9 : 19.5 |
| 文件格式 | WebP（< 300KB） |
| 命名 | `bg-{page}.webp`（小写、连字符） |
| 路径 | `/public/assets/backgrounds/` |
| 注册 | `src/config/assets.ts` 的 `backgrounds.{key}` 字段 |
| CSS 用法 | `background-size: cover; background-position: center;` |

---

## 2. 通用风格基线（每张图的 prompt 必须包含）

```
Hand-painted Chinese gongbi ink-and-wash illustration, traditional
gufeng (古风) aesthetic, soft watercolor brushwork on rice paper
texture, muted earth-tone palette (sage green, terracotta vermillion,
ink black, cream ivory, antique gold accent). Composition uses
natural framing elements at edges and bottom, leaving the upper
60% clean and uncluttered for UI overlay. No characters, no faces,
no text, no modern elements. Painterly, atmospheric, cinematic depth
of field. Masterwork quality, museum-grade.
```

### 调色板锚点（HSL 区间，每张图必须可取到这些色）

| 角色 | HEX | 用途占比 |
|---|---|---|
| 墨青 | `#3a4a3e` | 主色，山体/植物阴影 |
| 土黄 | `#8a7040` | 辅色，石阶/木构/纸面 |
| 朱砂 | `#a03830` | 点缀，牌坊/门/印章 |
| 竹绿 | `#5a7050` | 辅色，竹叶/苔藓 |
| 茶褐 | `#5a4030` | 辅色，家具/木器 |
| 暖白 | `#e8dcc0` | 底色，宣纸/米黄 |
| 暗金 | `#c5a059` | 高光（< 5%，呼应 UI 主题色） |

**禁止：** 纯黑、纯白、饱和蓝/红/紫、高对比卡通色、霓虹色、电光色。

### 通用负向 prompt（每张图都附加）

```
no text, no characters, no people, no faces, no anime, no cartoon,
no 3D render, no photorealistic, no neon, no saturated colors, no
modern objects, no logos, no watermarks, no UI elements, no fake
Chinese calligraphy
```

---

## 3. 构图硬约束（每张图必须满足）

| 约束 | 数值 | 原因 |
|---|---|---|
| 中央留白区域 | 画面 **40-60%** | 给 UI 卡片/文字覆盖 |
| 主体色块占比 | ≤ 35% | 不抢前景 |
| 顶部 vignette 暗化 | 上 15-20% 渐黑 | 顶栏/标题可读 |
| 底部装饰区 | 画面下 25-35% | 锚定视觉重心 |
| 边缘装饰 | 左右 + 底部自然元素 | 保持系列风格统一 |
| 暗金点缀 | < 5% 面积 | 呼应 `#c5a059` 主题色 |
| 不用现代物品 | — | 古风基调 |
| 不用清晰可读汉字 | — | 避免"假古文"出戏 |

### 构图关键词（中英对照，方便加 prompt）

| 描述 | English | 中文 |
|---|---|---|
| 主体在底部 | `subject strictly in bottom 35% of frame` | 主体严格在画面下 35% |
| 中央留空 | `vast empty atmospheric space dominating upper 60%` | 广阔空旷氛围占上 60% |
| 低角度仰拍 | `low-angle perspective shot` | 低角度仰拍 |
| 大场景 | `wide-angle establishing shot` | 广角定场镜头 |
| 顶暗角 | `strong vignette darkening at top` | 顶部强暗角 |
| 对称庄严 | `symmetrical and monumental composition` | 对称庄严构图 |

---

## 4. 各页面 Prompt（P0 → P1 → P2）

### 4.1 P0 — 必须补

#### `bg-auth.webp` — 登录页（山门/古寺入口）

**风格定位：** 庙门/山门/古寺入口。中央留出干净区域给登录表单。

**Prompt：**
```
[Style baseline from §2]

Vertical 9:16 aspect ratio, 1170x2532 resolution. Wide-angle
establishing shot, low-angle perspective. All architectural and
natural elements strictly confined to the bottom 50% of the frame.
Upper 50% is intentionally minimal: only soft mountain mist and
empty atmospheric sky for UI overlay.

Bottom 50% content: a traditional Chinese mountain temple gate
(shanmen) viewed from a weathered grey stone staircase. Stone steps
in foreground with green moss creeping along the cracks. Above the
steps: a vermillion-lacquered wooden pailou gate with upturned eaves,
centered horizontally. Two small stone guardian lion statues flank
the gate base. The half-open gate reveals a warm golden glow from
within, hinting at passage into another world. Background: layered
misty ink-wash mountains, far peaks nearly white fading into near
peaks in dark teal-green. Wisps of cloud drift across the gate
eaves. A few scattered autumn maple leaves on the steps.

Strong vignette darkening at the top edge and sides.

[Negative prompt from §2]
```

**后期处理建议：** 如果中央仍有杂物，用 inpainting 擦除后用 AI 补"空"。最终导出前确保上 50% 没有强主体。

---

#### `bg-room.webp` — 房间等待页（茶楼雅间）

**风格定位：** 茶楼雅间。木桌 + 椅子 + 窗外竹影。给「邀请码输入框」留中央。

**Prompt：**
```
[Style baseline from §2]

Vertical 9:16 aspect ratio. Wide-angle interior shot with strong
one-point perspective. Subject matter in the lower 55% of frame,
upper 45% is darker wooden ceiling and top wall for UI text overlay.

Lower 55% content: the interior of a refined Ming-dynasty teahouse
private room. A rectangular dark-walnut wooden table occupies the
lower-center, with two carved wooden armchairs on either side. On
the table: a small celadon tea teapot, two tiny tea cups, and a
brass cricket cage (longxuguan) in the exact center. Behind the
table: a tall window frame with vertical wooden lattice, through
which a bamboo grove is visible in soft focus. To the left: a
hanging scroll painting of ink mountains, partially visible. To the
right: a tall celadon vase with a single curved branch of plum
blossom. Ceiling at top showing dark wooden beams.

One-point perspective drawing eye to the table center. Warm interior
lamplight from off-screen left, soft window light from background.
No electric light sources.

[Negative prompt from §2]
```

---

#### `bg-market.webp` — 虫市

> ✅ 已存在。仅在新一轮统一系列重做时参考此 prompt。

**Prompt：**
```
[Style baseline from §2]

Vertical 9:16 aspect ratio. Eye-level perspective shot of a
traditional Chinese cricket market alley (longxu shi). Subject
matter occupies the lower 60% of frame, upper 40% is the
receding alley perspective fading to soft mist.

Lower 60% content: two rows of wooden vendor stalls flanking a
central stone-paved alley. Left stalls: bamboo cricket cages
(longxuguan) of various sizes hanging and stacked, some with
insects visible. Right stalls: similar arrangement with ceramic
cages, glass jars with specimens, small boxes. Stone pavement
between stalls has moss between cracks. Background: the alley
recedes into atmospheric mist, with a single paper lantern
glowing faintly. Color palette: warm wood browns #5a4030, aged
bamboo #8a8860, brass #8a7040, ceramic celadon #7a9080, terracotta
#a03830 (occasional), stone grey #6a6a64.

Lighting: warm late-afternoon light filtering into the alley.
Strong depth of field with foreground stalls sharp, background
alley soft and atmospheric.

[Negative prompt from §2]
```

---

### 4.2 P1 — 建议补

#### `bg-matchmake.webp` — 匹配页（庭院茶桌）

**Prompt：**
```
[Style baseline from §2]

Vertical 9:16 aspect ratio. Top-down 3/4 perspective, slightly
asymmetric (table placed slightly left of center for visual
interest). Subject matter in lower 50%, upper 50% is courtyard
background fading to overcast sky for UI status text overlay.

Lower 50% content: a circular bluestone table in a traditional
Chinese courtyard. Two ceramic cricket jars (longxuguan) sit on
the table facing each other, one in warm celadon green, the other
in warm russet brown. Between them: a small bronze incense burner
with a thin wisp of smoke rising. Table edge has scattered dried
osmanthus petals. The courtyard floor around the table is grey
flagstone with moss between cracks. Four wooden chair legs visible
at table edge corners. Background: blurred courtyard wall in soft
focus, with a single gnarled plum tree branch extending from one
corner. Sky visible at top: pale overcast with one or two birds in
silhouette.

Even diffused overcast lighting, no harsh shadows. Center 40%
intentionally clear for matchmaking animation overlay.

[Negative prompt from §2]
```

---

#### `bg-handbook.webp` — 蛐蛐图鉴（翻开的手札）

**Prompt：**
```
[Style baseline from §2]

Vertical 9:16 aspect ratio. Top-down view, slight 5-degree
rotation of subject. An open traditional Chinese thread-bound
notebook (xianzhuang shouce) lies on a dark wooden desk. The book
occupies the center 60% of the frame.

Notebook content: aged cream xuan paper with subtle fiber texture,
edges slightly yellowed and worn. Left page is blank with a
delicate ink border. Right page contains three small gongbi-style
cricket illustrations arranged vertically (a green one, a brown
one, a reddish-purple one), each ~2cm tall in the painting,
surrounded by hand-brushed calligraphic labels in tiny ink script
(illegible, just texture).

Around the book: a few scattered dried plum petals, a writing
brush resting on a brush holder, an ink stone with a wet pool of
ink catching light, and a small red seal paste (yinzhang) with
carved dragon design.

Top 15% and bottom 15% are darker (desk surface in shadow) for UI
margins. Warm desk-lamp from upper-left casting soft shadows from
the brush and seal. Vignette effect: edges fade to darker brown.

[Negative prompt from §2]
```

---

### 4.3 P2 — 可选

#### `bg-defense.webp` — 布阵页（俯视沙盘）

**Prompt：**
```
[Style baseline from §2]

Vertical 9:16 aspect ratio. Top-down view of a circular sand table
(shapan) on a wooden stand, used for military formation planning in
ancient China. The table is centered, occupying 60% of frame. Top
20% and bottom 20% are darker wood in shadow for UI margins.

Table content: fine golden-tan colored sand, raked into gentle
wavy patterns. Three small circular wooden tokens (~2cm wide)
placed in a triangle formation on the sand, each token marked
with a different colored Chinese character (suggesting position
1/2/3, characters illegible, just visual texture). A small wooden
ruler and a brass compass (指南针) rest on the sand edge.
Surrounding the table: dark walnut wood with scattered miniature
paper command flags (red, black, blue).

Overhead slightly diffused lighting, casting very soft shadows
from the tokens.

[Negative prompt from §2]
```

---

#### `bg-room-create.webp` — 创建/加入房间（展开的竹简）

**Prompt：**
```
[Style baseline from §2]

Vertical 9:16 aspect ratio. A long traditional bamboo slip scroll
(zhujian) partially unrolled on a dark wooden desk. The scroll is
horizontal across the middle 50% of frame. Top 25% and bottom 25%
are darker desk for UI margins.

Scroll content: made of vertical bamboo strips bound by leather
cords, with columns of ink calligraphy running down (illegible,
just texture). A small square wooden seal (vermillion paste on the
corner) is pressed onto the scroll. To the side: a calligraphy
brush resting on a brush rest, an ink stone, and a small bronze
paperweight in the shape of a recumbent ox. A few dried leaves
scattered on the desk.

Warm side-light from right, casting long soft shadows from the
brush and paperweight.

[Negative prompt from §2]
```

---

## 5. 跨模型适配指南

### 5.1 MiniMax image-01（已测试，DNS 受限）

- 工具：`mcp__minimax-image__text_to_image`
- 推荐参数：`aspect_ratio=9:16`，`n=4`（一次出 4 张挑），`prompt_optimizer=true`
- 失败时降级：减小 `n`、简化 prompt、用 `prompt_optimizer=false` 看原意

### 5.2 Midjourney v6.1（最佳国风质量）

```
{prompt above} --ar 9:16 --s 750 --sref <reference_image_url> --sw 100
```

- `--sref` 传入 `bg-market.webp` 或 `bg-ladder.webp` 作为风格锚点
- `--s 750` 提高风格化
- `--sw 100` 让 sref 完全主导风格

### 5.3 Flux 1.1 Pro（Replicate）

- 端点：`POST https://api.replicate.com/v1/predictions`
- 参数：`prompt`、`aspect_ratio="9:16"`、`output_quality=100`
- 一次出 4 张成本约 $0.05

### 5.4 SDXL + 国风 LoRA（本地免费，最稳）

**推荐栈：**
- 基础模型：RealVisXL V4.0 / DreamShaper XL
- LoRA（civitai 搜）：`GuoFeng3.4` / `Shuimo` / `国风` （挑 download > 1k 的）
- ControlNet：Tile + Depth（控制构图）
- 工作流：固定 seed 跑一批，换 seed 跑另一批，组合挑

**Prompt 结构差异：** SDXL 用逗号分隔的 tag 风格更稳定，把上面的整段 prompt 拆成：
```
masterpiece, best quality, gufeng, chinese ink wash painting,
gongbi style, (vignette:1.2), (empty upper half:1.3),
[页面主体内容拆成 5-10 个关键 tag],
muted earth tone palette, sage green, terracotta, ink black,
cream ivory, [细节增强词]
```

**Negative：**
```
text, watermark, signature, characters, people, faces, anime,
3d, photorealistic, neon, saturated colors, modern objects
```

### 5.5 DALL-E 3 / Ideogram 2.0

- 直接复制本文件的整段 prompt，无需改写
- 缺点：国风细腻度不如 MJ/Flux/SDXL+LoRA

---

## 6. 一致性检查清单（生成完所有图后跑）

| # | 检查项 | 工具 |
|---|---|---|
| 1 | 调色板锚点色在 5+ 张图里都能找到 | Photoshop/截图取色器 |
| 2 | 同一颜色（如墨青、暖白）在所有图里 HSL 误差 ≤ 5 | 批量取色脚本 |
| 3 | 边缘装饰的笔触粗细/水彩晕染程度视觉一致 | 肉眼并排比较 |
| 4 | 顶部留白区域（25-30%）在所有图里视觉重量相当 | 肉眼 |
| 5 | 全部用 `background-size: cover` 测试，主体不被裁到重要部位 | 浏览器实测 |
| 6 | 中央 40-60% 区域色彩平均亮度 ≥ 整体 60%（保证 UI 可读） | 截图取色 |

---

## 7. 文件命名与注册示例

新增 `bg-auth.webp` 后，在 `src/config/assets.ts` 加：

```typescript
export const ASSETS = {
  backgrounds: {
    // ... 现有
    auth: "/assets/backgrounds/bg-auth.webp",  // ← 新增
  },
};
```

页面里引用：
```tsx
<div className="fixed inset-0 -z-10" style={{
  backgroundImage: `url(${ASSETS.backgrounds.auth})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
}} />
```

---

## 8. 变更日志

| 日期 | 变更 |
|---|---|
| 2026-06-02 | 初版：盘点 7 个缺背景页面，输出 P0/P1/P2 prompt 规格 |
