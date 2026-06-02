export type Tier = "common" | "rare" | "epic" | "legendary";
export type Trait = "fierce" | "swift" | "cunning" | "steadfast" | "tenacious" | "resonant";

export interface CricketTemplate {
  id: number;
  name: string;
  title: string;
  tier: Tier;
  trait: Trait;
  color?: string;
  emoji?: string;
  gachaWeight: number;
  isActive: boolean;
  imageKey?: string;
}

export interface UserCricket {
  id: number;
  uid: string;
  templateId: number;
  template: CricketTemplate;
  imageKey?: string;
  obtainedAt: string;
  /** 个体属性浮动值 (继承自模板 + 品级浮动) */
  attack: number;
  defense: number;
  speed: number;
  maxHp: number;
  maxStamina: number;
  spiritBase: number;
}