import type { Request, Response, NextFunction } from "express";

/**
 * 包装 async 路由 handler，让 Express 4 能捕获 async 异常并传递给 errorHandler。
 * Express 5 原生支持 async 错误，但 4.x 不会自动捕获 reject 的 promise。
 *
 * 用法:
 *   router.get("/foo", asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error("[Error]", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
}
