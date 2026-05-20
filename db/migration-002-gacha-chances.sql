-- 斗蛐蛐 数据库迁移: 添加抽奖次数追踪

-- 给 users 表添加 gacha_chances 字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS gacha_chances INTEGER NOT NULL DEFAULT 0;

-- 新用户自动获得 3 次免费抽奖机会
-- 通过后端 register 逻辑实现，不在此处
