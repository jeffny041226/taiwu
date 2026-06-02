import { mysqlTable, varchar, int, text, boolean, json, datetime, mysqlEnum, index, uniqueIndex } from "drizzle-orm/mysql-core";
import { sql, relations } from "drizzle-orm";

/**
 * MySQL schema — 由 drizzle-kit push 推到 `taiwu` 数据库。
 * Source of truth: 不再有 db/*.sql;本文件是唯一权威。
 *
 * 注意:
 * - `defense_crickets` 用 .default(sql`(JSON_ARRAY())`),不能写 .default([])
 *   (MySQL 8 strict mode 拒绝字符串字面量作为 JSON 列默认值)
 * - datetime(6, { mode: "date" }) → 返回 JS Date,fsp=6 保留亚秒精度
 * - AUTO_INCREMENT 列会在数据迁移后用 ALTER TABLE ... AUTO_INCREMENT = MAX+1 修正
 * - 6 个属性(attack/defense/speed/maxHp/maxStamina/spiritBase)由 cricket_tier_ranges
 *   表按级别定义区间,user_crickets 实例值 = 抽/兑时在该级别区间内独立随机整数
 */

/* ──────────────────────────── users 用户表 ──────────────────────────── */

export const users = mysqlTable(
  "users",
  {
    /** 用户唯一标识 (Passport uid 或本地生成的 shanhai-{mobile}) */
    uid: varchar("uid", { length: 100 }).primaryKey(),
    /** 昵称 */
    nickName: varchar("nick_name", { length: 50 }).notNull(),
    /** 用户名 (可选) */
    username: varchar("username", { length: 50 }),
    /** 密码哈希 (本地账号时使用,Passport 登录为空) */
    passwordHash: text("password_hash"),
    /** 头像 URL */
    avatar: text("avatar"),
    /** TODO: 此列写而不读(只有 auth.ts 在 INSERT 时塞值),后续清理 */
    token: varchar("token", { length: 200 }),
    /** 账号创建时间 */
    createdAt: datetime("created_at", { mode: "date", fsp: 6 })
      .default(sql`CURRENT_TIMESTAMP(6)`)
      .notNull()
     ,
    /** 剩余抽蛐蛐次数 (微信支付/兑换码充值) */
    gachaChances: int("gacha_chances").notNull().default(0),
    /** 战力,综合蛐蛐品质+数量+胜场计算 */
    combatPower: int("combat_power").notNull().default(1000),
    /** 玩家布阵的 user_crickets.id 数组,长度 0..3 */
    defenseCrickets: json("defense_crickets")
      .$type<number[]>()
      .default(sql`(JSON_ARRAY())`)
      .notNull()
     ,
    /** 胜场累计 */
    wins: int("wins").notNull().default(0),
    /** 败场累计 */
    losses: int("losses").notNull().default(0),
    /** 账号状态 (normal 正常 / banned 封禁) — Taiwu-admin 写入,Taiwu 后端 auth/verify 读取 */
    status: mysqlEnum("status", ["normal", "banned"]).notNull().default("normal"),
    /** 软删时间 (NULL = 未删除) — Taiwu-admin 写入 */
    deletedAt: datetime("deleted_at", { mode: "date", fsp: 6 }),
  },
  (t) => ({
    combatPowerDesc: index("idx_users_combat_power").on(sql`${t.combatPower} DESC`),
    usernameUnique: uniqueIndex("uq_users_username").on(t.username),
    statusIdx: index("idx_users_status").on(t.status),
  })
);

/* ──────────────────────────── cricket_tier_ranges 级别属性区间配置表 ──────────────────────────── */

export const cricketTierRanges = mysqlTable("cricket_tier_ranges", {
  /** 蛐蛐级别:普通/稀有/史诗/传说 */
  tier: mysqlEnum("tier", ["common", "rare", "epic", "legendary"]).primaryKey(),
  /** 攻击力区间下限 (含) */
  attackMin: int("attack_min").notNull(),
  /** 攻击力区间上限 (含) */
  attackMax: int("attack_max").notNull(),
  /** 防御力区间下限 (含) */
  defenseMin: int("defense_min").notNull(),
  /** 防御力区间上限 (含) */
  defenseMax: int("defense_max").notNull(),
  /** 速度区间下限 (含) */
  speedMin: int("speed_min").notNull(),
  /** 速度区间上限 (含) */
  speedMax: int("speed_max").notNull(),
  /** 最大生命区间下限 (含) */
  maxHpMin: int("max_hp_min").notNull(),
  /** 最大生命区间上限 (含) */
  maxHpMax: int("max_hp_max").notNull(),
  /** 最大耐力区间下限 (含) */
  maxStaminaMin: int("max_stamina_min").notNull(),
  /** 最大耐力区间上限 (含) */
  maxStaminaMax: int("max_stamina_max").notNull(),
  /** 气势基础值区间下限 (含) */
  spiritBaseMin: int("spirit_base_min").notNull(),
  /** 气势基础值区间上限 (含) */
  spiritBaseMax: int("spirit_base_max").notNull(),
  /** 最后更新时间 — Taiwu-admin 写入,tier-ranges 5s 定时重读感知 */
  updatedAt: datetime("updated_at", { mode: "date", fsp: 6 })
    .default(sql`CURRENT_TIMESTAMP(6)`)
    .notNull()
    .$onUpdateFn(() => new Date()),
});

/* ──────────────────────────── cricket_templates 蛐蛐模板表 ──────────────────────────── */

export const cricketTemplates = mysqlTable(
  "cricket_templates",
  {
    /** 模板自增主键 */
    id: int("id").autoincrement().primaryKey(),
    /** 蛐蛐名 */
    name: varchar("name", { length: 50 }).notNull(),
    /** 称号 */
    title: varchar("title", { length: 100 }).notNull(),
    /** 级别 (普通/稀有/史诗/传说),决定 6 个属性区间 */
    tier: mysqlEnum("tier", ["common", "rare", "epic", "legendary"]).notNull(),
    /** 特性 ID (fierce/swift/cunning/steadfast/tenacious/resonant),引用 TRAIT_EFFECTS */
    trait: varchar("trait", { length: 50 }).notNull(),
    /** 边框色 (可空,UI 兜底用 TIER_COLORS) */
    color: varchar("color", { length: 20 }),
    /** 图标 emoji (可空) */
    emoji: varchar("emoji", { length: 10 }),
    /** 抽屉权重,同级别内权重相同 */
    gachaWeight: int("gacha_weight").notNull().default(100),
    /** 是否在抽屉池中 (软删) */
    isActive: boolean("is_active").notNull().default(true),
    /** 完整 URL (MinIO 公开 URL) 或 null — 见 image-loader.ts */
    imageKey: text("image_key"),
    /** 创建时间 */
    createdAt: datetime("created_at", { mode: "date", fsp: 6 })
      .default(sql`CURRENT_TIMESTAMP(6)`)
      .notNull()
     ,
  },
  (t) => ({
    tierIdx: index("idx_cricket_templates_tier").on(t.tier),
    activeIdx: index("idx_cricket_templates_active").on(t.isActive),
  })
);

/* ──────────────────────────── user_crickets 用户蛐蛐实例表 ──────────────────────────── */

export const userCrickets = mysqlTable(
  "user_crickets",
  {
    /** 实例自增主键 */
    id: int("id").autoincrement().primaryKey(),
    /** 所属用户 uid */
    uid: varchar("uid", { length: 100 })
      .notNull()
      .references(() => users.uid, { onDelete: "cascade" })
     ,
    /** 对应模板 id */
    templateId: int("template_id")
      .notNull()
      .references(() => cricketTemplates.id)
     ,
    /** 实际上一律为 null;模板图由 cricket_templates.image_key 提供 */
    imageKey: text("image_key"),
    /** 获得时间 */
    obtainedAt: datetime("obtained_at", { mode: "date", fsp: 6 })
      .default(sql`CURRENT_TIMESTAMP(6)`)
      .notNull()
     ,
    /** 实例攻击力,所属级别 attack 区间内随机 */
    attack: int("attack").notNull().default(10),
    /** 实例防御力,所属级别 defense 区间内随机 */
    defense: int("defense").notNull().default(10),
    /** 实例速度,所属级别 speed 区间内随机 */
    speed: int("speed").notNull().default(10),
    /** 实例最大生命,所属级别 maxHp 区间内随机 */
    maxHp: int("max_hp").notNull().default(100),
    /** 实例最大耐力,所属级别 maxStamina 区间内随机 */
    maxStamina: int("max_stamina").notNull().default(100),
    /** 实例气势基础值,所属级别 spiritBase 区间内随机 */
    spiritBase: int("spirit_base").notNull().default(100),
  },
  (t) => ({
    uidIdx: index("idx_user_crickets_uid").on(t.uid),
  })
);

/* ──────────────────────────── redeem_codes 兑换码表 ──────────────────────────── */

export const redeemCodes = mysqlTable(
  "redeem_codes",
  {
    /** 兑换码记录自增主键 */
    id: int("id").autoincrement().primaryKey(),
    /** 兑换码,格式 TW-XXXX-XXXX-XXXX */
    code: varchar("code", { length: 20 }).notNull().unique(),
    /** 兑换的蛐蛐模板 id (v1.0 必填,后续 type=item/currency 时可空) */
    templateId: int("template_id")
      .notNull()
      .references(() => cricketTemplates.id)
     ,
    /** 是否已使用 */
    isUsed: boolean("is_used").notNull().default(false),
    /** 使用者 uid */
    usedBy: varchar("used_by", { length: 100 }).references(() => users.uid),
    /** 使用时间 */
    usedAt: datetime("used_at", { mode: "date", fsp: 6 }),
    /** 创建时间 */
    createdAt: datetime("created_at", { mode: "date", fsp: 6 })
      .default(sql`CURRENT_TIMESTAMP(6)`)
      .notNull()
     ,
    /** 批次名 (Taiwu-admin 写入) */
    batch: varchar("batch", { length: 64 }),
    /** 兑换码类型 (cricket 单只蛐蛐 / item 道具 / currency 货币) — v1.0 admin 只生成 cricket */
    type: mysqlEnum("type", ["cricket", "item", "currency"]).notNull().default("cricket"),
    /** 灵活奖励 (JSON: 多只蛐蛐/道具/货币等),v1.0 暂未消费 */
    rewardPayload: json("reward_payload"),
    /** 过期时间 (NULL = 永久有效) */
    expiryAt: datetime("expiry_at", { mode: "date", fsp: 6 }),
    /** 兑换码状态 (active 启用 / disabled 禁用) — Taiwu redeem/use 应过滤 disabled */
    status: mysqlEnum("status", ["active", "disabled"]).notNull().default("active"),
    /** 创建者 (admin uid) */
    createdBy: varchar("created_by", { length: 100 }),
  },
  (t) => ({
    usedByIdx: index("idx_redeem_codes_used_by").on(t.usedBy),
    batchIdx: index("idx_redeem_codes_batch").on(t.batch),
    statusIdx: index("idx_redeem_codes_status").on(t.status),
  })
);

/* ──────────────────────────── 类型推断(给路由用)──────────────────────────── */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CricketTierRange = typeof cricketTierRanges.$inferSelect;
export type NewCricketTierRange = typeof cricketTierRanges.$inferInsert;
export type CricketTemplate = typeof cricketTemplates.$inferSelect;
export type NewCricketTemplate = typeof cricketTemplates.$inferInsert;
export type UserCricket = typeof userCrickets.$inferSelect;
export type NewUserCricket = typeof userCrickets.$inferInsert;
export type RedeemCode = typeof redeemCodes.$inferSelect;
export type NewRedeemCode = typeof redeemCodes.$inferInsert;
