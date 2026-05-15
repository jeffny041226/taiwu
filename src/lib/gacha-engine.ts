/**
 * 抽笼概率引擎
 * 加权随机抽样，服务端使用
 */

export interface GachaItem {
  id: number;
  name: string;
  tier: string;
  gachaWeight: number;
}

/**
 * 加权随机抽取一个物品
 * @param items 候选物品列表（含权重）
 * @returns 抽中的物品
 */
export function pullOne<T extends GachaItem>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.gachaWeight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.gachaWeight;
    if (random <= 0) {
      return item;
    }
  }

  // fallback: 返回最后一个（理论上不会到这里）
  return items[items.length - 1];
}

/**
 * 批量抽取
 * @param items 候选物品列表
 * @param count 抽取数量
 * @returns 抽中的物品数组
 */
export function pullMultiple<T extends GachaItem>(items: T[], count: number): T[] {
  const results: T[] = [];
  for (let i = 0; i < count; i++) {
    results.push(pullOne(items));
  }
  return results;
}

/**
 * 预期概率验证（用于测试和调试）
 * @param items 候选物品列表
 * @param iterations 模拟次数
 * @returns 每个物品的实际出现频率
 */
export function simulateDistribution<T extends GachaItem>(
  items: T[],
  iterations = 100000
): Map<number, number> {
  const counts = new Map<number, number>();
  for (let i = 0; i < iterations; i++) {
    const result = pullOne(items);
    counts.set(result.id, (counts.get(result.id) || 0) + 1);
  }
  return counts;
}
