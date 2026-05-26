---
name: shanhai-login-redirect
description: 山海登录对接（跳转统一登录页）。用于对接公司 Passport 登录体系，跳转到 h5.shuziwenbo.cn/login 统一登录入口，回调处理 sz_t 参数。触发词：'跳转登录'、'统一登录入口'、'sz_t回调'、'对接山海登录'、'接入公司登录'。
---

# 山海登录对接（跳转统一登录页）

## 登录流程概述

整体流程：**跳转登录 → 统一页面登录 → 回调带参数 → 解析存储**

```
用户点击登录
    ↓
跳转到统一登录入口
    ↓
用户在统一页面完成登录（手机号验证码等方式）
    ↓
登录成功，自动跳转回 target 地址
    ↓
URL 携带 sz_t 参数（格式：${token}_${uid}）
    ↓
前端解析参数，存储 Token 和 UID
    ↓
调用后端获取/同步用户信息
    ↓
登录完成
```

## Passport 接口说明

### 重要：接口调用方式

**所有 Passport 接口必须由后端调用，前端不直接调用 Passport 接口。**

原因：
- Passport 接口属于内部服务，不应暴露给前端
- 避免敏感信息泄露和安全隐患
- 后端可统一处理错误、缓存、日志等

### Token 校验接口

| 接口 | 地址 | 用途 |
|------|------|------|
| 校验 Token | `GET /intra/v1/api/verifyToken?token={token}` | 验证 token 有效性和 uid 匹配 |
| 获取用户信息 | `GET /intra/v1/api/getTokenInfo?token={token}` | 根据 token 获取用户完整信息 |
| 根据 UID 获取用户 | `GET /intra/v1/api/getUserInfo?uid={uid}` | 根据 uid 获取用户信息 |

**完整地址**：`http://passport.szwb.imgo.tv` + 接口路径

**getTokenInfo 返回信息**：
- uid：用户唯一标识
- nickname：昵称
- avatar：头像 URL
- mobile：手机号
- state：账号状态（1=正常）
- 其他：注册时间、平台等

## 前端实现要点

### 登录入口跳转

**跳转地址**：`http://h5.shuziwenbo.cn/login?from=modou&target={回调地址}`

**参数说明**：
- `from`：项目来源标识，默认为 `modou`
- `target`：回调目标地址，需要 URL encode

### 回调参数解析

登录完成后，URL 携带 `sz_t` 参数：

**参数格式**：`sz_t=${token}_${uid}`

**解析步骤**：
1. 从 URL 获取 sz_t 参数
2. 用下划线分割，提取 token 和 uid
3. 存储到本地
4. 调用后端同步用户信息
5. 跳转到首页或业务页面

### Token 传递方式

后续请求携带 Token：

- Header：`Authorization: Bearer {token}`
- URL 参数：`token={token}&uid={uid}`

建议两种方式同时使用。

## 后端实现要点

### Token 校验流程

每次需要鉴权的请求：

1. 从请求中提取 Token 和 UID（Header 或 URL 参数）
2. 调用 Passport `verifyToken` 接口校验 token 有效性和 uid 匹配
3. 校验通过 → Token 有效，可调用 `getTokenInfo` 获取完整用户信息
4. 校验失败 → Token 无效，返回 401

### 用户信息同步

首次登录时同步 Passport 用户信息到本地：

**同步字段**：Passport UID、手机号、昵称、头像

**同步策略**：按 Passport UID 查询本地用户，不存在则创建，存在则更新

### 白名单配置

不需要 Token 校验的接口：首页展示、公开详情、静态资源等

## 关键注意事项

- **回调地址**：target 需要能被统一登录页访问
- **Token 缓存**：可用 Redis 缓存校验结果，减少延迟
- **错误处理**：Token 过期返回 401，引导重新登录
- **多端适配**：小程序可能需要 webview 中转