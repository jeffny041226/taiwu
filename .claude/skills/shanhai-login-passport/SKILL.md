---
name: shanhai-login-passport
description: 山海登录对接（本地表单 + Passport API）。用于对接公司 Passport 登录体系，在本地页面完成登录，调用 Passport 短信验证码 API。触发词：'本地登录对接'、'Passport API登录'、'调用passport接口'、'对接山海登录'、'接入公司登录'。
---

# 山海登录对接（本地表单 + Passport API）

## 登录流程概述

整体流程：**本地输入 → 调用 Passport API → 获取 Token → 存储**

```
用户输入手机号
    ↓
调用 Passport 获取验证码 API
    ↓
用户输入验证码
    ↓
调用 Passport 验证码登录 API
    ↓
获取 Token 和 UID
    ↓
存储到本地
    ↓
获取/同步用户信息
    ↓
登录完成
```

## Passport API 说明

### 重要：接口调用方式

**所有 Passport 接口必须由后端调用，前端不直接调用 Passport 接口。**

```
前端 → 调用后端接口 → 后端调用 Passport → 返回结果
```

### 核心接口列表

| 接口 | 方法 | 地址 | 用途 |
|------|------|------|------|
| 获取验证码 | GET | `/intra/v1/api/getMobileCode` | 发送短信验证码 |
| 验证码登录 | POST | `/intra/v1/api/mobileCodeLogin` | 短信验证码登录 |
| 校验 Token | GET | `/intra/v1/api/verifyToken?token={token}` | 验证 token 有效性 |
| 获取用户信息 | GET | `/intra/v1/api/getTokenInfo?token={token}` | 根据 token 获取用户信息 |
| 根据 UID 获取用户 | GET | `/intra/v1/api/getUserInfo?uid={uid}` | 根据 uid 获取用户信息 |

**完整地址**：`http://passport.szwb.imgo.tv` + 接口路径

### 配置项

```properties
passport.api.base-url=http://passport.szwb.imgo.tv
passport.platform=7
```

### 获取短信验证码

**请求方式**：GET，参数通过 URL query string 传递

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| mobile | string | 是 | 手机号 |
| operation | string | 是 | 固定值 `mobilecodelogin` |
| platform | int | 是 | 平台标识（数字） |
| overseas | int | 否 | 是否海外：0-否，1-是 |
| smsCode | string | 否 | 国际区码，默认 86 |
| uip | string | 是 | 用户 IP |

### 验证码登录

**请求方式**：POST，参数通过 `application/x-www-form-urlencoded` 格式传递

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| mobile | string | 是 | 手机号 |
| mobileCode | string | 是 | 短信验证码 |
| platform | int | 是 | 平台标识（数字） |
| overseas | int | 否 | 是否海外：0-否，1-是 |
| smsCode | string | 否 | 国际区码，默认 86 |
| did | string | 否 | 设备 ID |

**返回字段**：token、uid、nickName、avatar、mobile

### Token 校验

**请求方式**：GET `/intra/v1/api/verifyToken?token={token}`

**返回字段**：uid

### 获取用户信息

**请求方式**：GET `/intra/v1/api/getTokenInfo?token={token}`

**返回字段**：uid、nickname（小写）、avatar、mobile

## 前端实现要点

### 登录页面流程

1. 用户输入手机号
2. 点击获取验证码 → 调用后端接口
3. 输入验证码
4. 点击登录 → 调用后端接口
5. 后端返回 Token 和 UID，存储到本地

### Token 传递方式

- Header：`Authorization: Bearer {token}`
- Header：`X-Passport-Uid: {uid}`
- URL 参数：`token={token}&uid={uid}`

## 后端实现要点

### PassportService 封装

封装 Passport HTTP 客户端，调用核心接口：获取验证码、验证码登录、Token 校验、获取用户信息。

### 登录接口流程

1. 接收手机号和验证码
2. 调用 Passport 验证码登录接口
3. 按 Passport UID 查询/创建本地用户
4. 缓存 Token 到 Redis
5. 返回 Token 和用户信息

### Token 校验流程

1. 先查 Redis 缓存
2. 缓存不存在则调用 verifyToken 接口
3. 校验 UID 是否匹配

## 关键注意事项

- **请求格式**：获取验证码用 GET，登录用 POST form-urlencoded
- **响应码**：成功返回 `code: 200`
- **字段名**：用户昵称字段是 `nickname`（小写）
- **platform 类型**：必须是数字
- **Token 缓存**：Redis 缓存 Token -> userId 映射
- **万能验证码**：测试环境支持 `666666`