import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import {
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
} from "../config/env";

/**
 * 同步导出 db — 不做懒加载。
 * 容器 depends_on: mysql: service_healthy,后端进程启动时 MySQL 已就绪,
 * 懒加载在这个栈里没有意义,反而让失败模式变成运行期 500 而不是启动崩溃。
 */
const pool = mysql.createPool({
  host: MYSQL_HOST,
  port: MYSQL_PORT,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: false,
  decimalNumbers: true,
});

export const db = drizzle(pool, { schema, mode: "default" });
export { pool };
