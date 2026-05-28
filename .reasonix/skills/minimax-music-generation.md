---
name: minimax-music-generation
description: 使用 MiniMax Music 2.6 API 生成背景音乐/歌曲。纯音乐/带歌词/翻唱，按 prompt 描述风格情绪场景。
---
# MiniMax 音乐生成 skill

使用 MiniMax Music 2.6 API 生成背景音乐（纯音乐/带歌词）。适合为游戏、视频、应用快速生成配乐。

## 前置条件

- MiniMax API Key（本项目在 `scripts/gen-room-bgm.ts` 中）
- 网络可访问 `api.minimax.chat`（已确认；`api.minimaxi.com` 为官方域名，本项目统一走 `.chat` 代理）

## API 参考

**端点：** `POST https://api.minimax.chat/v1/music_generation`

**Headers：**
```
Authorization: Bearer <API_KEY>
Content-Type: application/json
```

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | string | 是 | `music-2.6`（推荐）/ `music-2.6-free`（限免，RPM 较低）/ `music-cover`（翻唱） |
| `prompt` | string | 纯音乐必填 | 风格、情绪、场景描述，最长 2000 字符 |
| `lyrics` | string | 否 | 歌词，`\n` 分隔，支持 `[Verse]` `[Chorus]` 等结构标签 |
| `is_instrumental` | bool | 否 | `true`=纯音乐（`lyrics` 非必填），默认 `false` |
| `lyrics_optimizer` | bool | 否 | 自动根据 prompt 生成歌词（`lyrics` 为空时生效） |
| `output_format` | string | 否 | `hex`（默认，直接返回 hex 编码音频）/ `url`（返回下载链接，24h 有效） |
| `stream` | bool | 否 | 流式传输，默认 `false` |
| `audio_setting` | object | 否 | `{sample_rate: 44100, bitrate: 256000, format: "mp3"}` |
| `aigc_watermark` | bool | 否 | 添加音频水印，默认 `false` |

**响应：**

```json
{
  "data": {
    "audio": "hex编码的音频数据",
    "status": 2
  },
  "trace_id": "...",
  "extra_info": {
    "music_duration": 25364,
    "music_sample_rate": 44100,
    "music_channel": 2,
    "bitrate": 256000,
    "music_size": 813651
  },
  "base_resp": { "status_code": 0, "status_msg": "success" }
}
```

## 工作流程

### 1. 生成纯音乐（最常见）

```typescript
const res = await fetch("https://api.minimax.chat/v1/music_generation", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "music-2.6",
    prompt: "Chinese ancient style, guzheng and flute, peaceful bamboo forest, Zen atmosphere",
    lyrics: "",
    is_instrumental: true,
  }),
});

const data = await res.json();
// data.data.audio 为 hex 编码的 MP3
const buf = Buffer.from(data.data.audio, "hex");
fs.writeFileSync("output.mp3", buf);
```

### 2. 生成带歌词的歌曲

```typescript
{
  model: "music-2.6",
  prompt: "古风, 中国风, 诗意, 悠扬",
  lyrics: "[Verse]\n春风拂面柳絮飘\n小桥流水人欢笑\n[Chorus]\n岁月如歌梦如烟\n一曲清唱到天明",
  is_instrumental: false,
}
```

### 3. 自动生成歌词

```typescript
{
  model: "music-2.6",
  prompt: "欢快的新年歌曲, 喜庆, 热闹",
  lyrics: "",
  lyrics_optimizer: true,  // 自动根据 prompt 写词
  is_instrumental: false,
}
```

### 4. 翻唱（music-cover）

```typescript
{
  model: "music-cover",
  prompt: "摇滚风格, 高亢",
  audio_url: "https://.../original.mp3",  // 参考音频
  lyrics: "[Verse]\n新歌词...",
}
```

## 本项目示例脚本

`scripts/gen-room-bgm.ts` — 生成选蛐蛐页面背景音乐。

用法：
```bash
npx tsx scripts/gen-room-bgm.ts
```

脚本逻辑：
1. POST 到 `api.minimax.chat/v1/music_generation`
2. 从 `data.data.audio` 取 hex 编码 MP3
3. `Buffer.from(hex, "hex")` 解码
4. 写入 `public/assets/audio/bgm/bgm-room.mp3`

## 注意

- **本项目 API key 只生效于 `api.minimax.chat`，不适用 `api.minimaxi.com`**
- 纯音乐模式下 `lyrics` 可以传空字符串或省略
- 不指定 `audio_setting` 时默认输出 44100Hz MP3
- `output_format: "url"` 返回的下载链接 24 小时有效
- 翻唱需要先调用「翻唱前处理」接口获取 `cover_feature_id`
- `music-2.6-free` 模型有 RPM 限制，正式项目用 `music-2.6`
