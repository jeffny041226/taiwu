import { mysqlTable, varchar, int, text, boolean, json, datetime, mysqlEnum, index, primaryKey, uniqueIndex } from "drizzle-orm/mysql-core";
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
 */

/* ──────────────────────────── users ──────────────────────────── */

export const users = mysqlTable(
  "users",
  {
    uid: varchar("uid", { length: 100 }).primaryKey(),
    nickName: varchar("nick_name", { length: 50 }).notNull(),
    username: varchar("username", { length: 50 }),
    passwordHash: text("password_hash"),
    avatar: text("avatar"),
    /** TODO: 此列写而不读(只有 auth.ts 在 INSERT 时塞值),后续清理 */
    token: varchar("token", { length: 200 }),
    createdAt: datetime("created_at", { mode: "date", fsp: 6 })
      .default(sql`CURRENT_TIMESTAMP(6)`)
      .notNull(),
    gachaChances: int("gacha_chances").notNull().default(0),
    combatPower: int("combat_power").notNull().default(1000),
    /** 玩家布阵的 user_crickets.id 数组,长度 0..3 */
    defenseCrickets: json("defense_crickets")
      .$type<number[]>()
      .default(sql`(JSON_ARRAY())`)
      .notNull(),
    wins: int("wins").notNull().default(0),
    losses: int("losses").notNull().default(0),
  },
  (t) => ({
    combatPowerDesc: index("idx_users_combat_power").on(sql`${t.combatPower} DESC`),
    usernameUnique: uniqueIndex("uq_users_username").on(t.username),
  })
);

/* ──────────────────────────── cricket_templates ──────────────────────────── */

export const cricketTemplates = mysqlTable(
  "cricket_templates",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 50 }).notNull(),
    title: varchar("title", { length: 100 }).notNull(),
    tier: mysqlEnum("tier", ["common", "rare", "epic", "legendary"]).notNull(),
    attack: int("attack").notNull(),
    defense: int("defense").notNull(),
    speed: int("speed").notNull(),
    hpBase: int("hp_base").notNull().default(100),
    staminaBase: int("stamina_base").notNull().default(100),
    spiritBase: int("spirit_base").notNull().default(100),
    trait: varchar("trait", { length: 50 }).notNull(),
    color: varchar("color", { length: 20 }),
    emoji: varchar("emoji", { length: 10 }),
    gachaWeight: int("gacha_weight").notNull().default(100),
    isActive: boolean("is_active").notNull().default(true),
    /** 完整 URL (MinIO 公开 URL) 或 null — 见 image-loader.ts */
    imageKey: text("image_key"),
    createdAt: datetime("created_at", { mode: "date", fsp: 6 })
      .default(sql`CURRENT_TIMESTAMP(6)`)
      .notNull(),
  },
  (t) => ({
    tierIdx: index("idx_cricket_templates_tier").on(t.tier),
    activeIdx: index("idx_cricket_templates_active").on(t.isActive),
  })
);

/* ──────────────────────────── user_crickets ──────────────────────────── */

export const userCrickets = mysqlTable(
  "user_crickets",
  {
    id: int("id").autoincrement().primaryKey(),
    uid: varchar("uid", { length: 100 })
      .notNull()
      .references(() => users.uid, { onDelete: "cascade" }),
    templateId: int("template_id")
      .notNull()
      .references(() => cricketTemplates.id),
    /** 实际上一律为 null;模板图由 cricket_templates.image_key 提供 */
    imageKey: text("image_key"),
    obtainedAt: datetime("obtained_at", { mode: "date", fsp: 6 })
      .default(sql`CURRENT_TIMESTAMP(6)`)
      .notNull(),
    /** 个体属性 (迁移 001) */
    attack: int("attack").notNull().default(10),
    defense: int("defense").notNull().default(10),
    speed: int("speed").notNull().default(10),
    maxHp: int("max_hp").notNull().default(100),
    maxStamina: int("max_stamina").notNull().default(100),
    spiritBase: int("spirit_base").notNull().default(100),
  },
  (t) => ({
    uidIdx: index("idx_user_crickets_uid").on(t.uid),
  })
);

/* ──────────────────────────── redeem_codes ──────────────────────────── */

export const redeemCodes = mysqlTable(
  "redeem_codes",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    templateId: int("template_id")
      .notNull()
      .references(() => cricketTemplates.id),
    isUsed: boolean("is_used").notNull().default(false),
    usedBy: varchar("used_by", { length: 100 }).references(() => users.uid),
    usedAt: datetime("used_at", { mode: "date", fsp: 6 }),
    createdAt: datetime("created_at", { mode: "date", fsp: 6 })
      .default(sql`CURRENT_TIMESTAMP(6)`)
      .notNull(),
  },
  (t) => ({
    usedByIdx: index("idx_redeem_codes_used_by").on(t.usedBy),
  })
);

/* ──────────────────────────── 类型推断(给路由用)──────────────────────────── */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type CricketTemplate = typeof cricketTemplates.$inferSelect;
export type NewCricketTemplate = typeof cricketTemplates.$inferInsert;
export type UserCricket = typeof userCrickets.$inferSelect;
export type NewUserCricket = typeof userCrickets.$inferInsert;
export type RedeemCode = typeof redeemCodes.$inferSelect;
export type NewRedeemCode = typeof redeemCodes.$inferInsert;
