-- 斗蛐蛐 数据库建表 DDL
-- 适用于 Supabase PostgreSQL

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  uid            VARCHAR(100) PRIMARY KEY,
  nick_name      VARCHAR(50)  NOT NULL,
  username       VARCHAR(50)  UNIQUE,
  password_hash  TEXT,
  avatar         TEXT,
  token          VARCHAR(200) NOT NULL,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

-- 蛐蛐模板表
CREATE TABLE IF NOT EXISTS cricket_templates (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(50)  NOT NULL,
  title         VARCHAR(100) NOT NULL,
  tier          VARCHAR(20)  NOT NULL CHECK (tier IN ('common', 'rare', 'epic', 'legendary')),
  attack        INTEGER      NOT NULL,
  defense       INTEGER      NOT NULL,
  speed         INTEGER      NOT NULL,
  hp_base       INTEGER      NOT NULL DEFAULT 100,
  stamina_base  INTEGER      NOT NULL DEFAULT 100,
  spirit_base   INTEGER      NOT NULL DEFAULT 100,
  trait         VARCHAR(50)  NOT NULL,
  color         VARCHAR(20),
  emoji         VARCHAR(10),
  gacha_weight  INTEGER      NOT NULL DEFAULT 100,
  is_active     BOOLEAN      NOT NULL DEFAULT true,
  image_key     TEXT,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- 用户蛐蛐表
CREATE TABLE IF NOT EXISTS user_crickets (
  id          SERIAL PRIMARY KEY,
  uid         VARCHAR(100) NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
  template_id INTEGER      NOT NULL REFERENCES cricket_templates(id),
  image_key   TEXT,
  obtained_at TIMESTAMPTZ  DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_crickets_uid ON user_crickets(uid);
CREATE INDEX IF NOT EXISTS idx_cricket_templates_tier ON cricket_templates(tier);
CREATE INDEX IF NOT EXISTS idx_cricket_templates_active ON cricket_templates(is_active);
