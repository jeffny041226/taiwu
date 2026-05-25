-- 兑换码表
CREATE TABLE IF NOT EXISTS redeem_codes (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(20) UNIQUE NOT NULL,
  template_id   INTEGER NOT NULL REFERENCES cricket_templates(id),
  is_used       BOOLEAN DEFAULT false,
  used_by       VARCHAR(100) REFERENCES users(uid),
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redeem_codes_code ON redeem_codes(code);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_used_by ON redeem_codes(used_by);
