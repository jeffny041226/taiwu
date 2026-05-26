/**
 * 生成 200 个虚拟用户用于战力排行榜测试
 * npx tsx scripts/seed-ladder-data.ts
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { CRICKET_TEMPLATES } from "../packages/shared/src/data/cricket-templates";
import { generateVariant } from "../packages/shared/src/lib/cricket-utils";

dotenv.config({ path: path.resolve(__dirname, "../packages/backend/.env") });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const SURNAMES = ["赵","钱","孙","李","周","吴","郑","王","冯","陈","褚","卫","蒋","沈","韩","杨","朱","秦","尤","许","何","吕","施","张","孔","曹","严","华","金","魏","陶","姜","戚","谢","邹","喻","柏","水","窦","章","云","苏","潘","葛","奚","范","彭","郎","鲁","韦","昌","马","苗","凤","花","方","俞","任","袁","柳","酆","鲍","史","唐","费","廉","岑","薛","雷","贺","倪","汤","滕","殷","罗","毕","郝","邬","安","常","乐","于","时","傅","皮","卞","齐","康","伍","余","元","卜","顾","孟","平","黄","和","穆","萧","尹","姚","邵","湛","汪","祁","毛","禹","狄","米","贝","明","臧","计","伏","成","戴","谈","宋","茅","庞","熊","纪","舒","屈","项","祝","董","梁","杜","阮","蓝","闵","席","季","麻","强","贾","路","娄","危","江","童","颜","郭","梅","盛","林","刁","钟","徐","邱","骆","高","夏","蔡","田","樊","胡","凌","霍","虞","万","支","柯","昝","管","卢","莫","经","房","裘","缪","干","解","应","宗","丁","宣","贲","邓","郁","单","杭","洪","包","诸","左","石","崔","吉","钮","龚","程","嵇","邢","滑","裴","陆","荣","翁","荀","羊","於","惠","甄","曲","家","封","芮","羿","储","靳","汲","邴","糜","松","井","段","富","巫","乌","焦","巴","弓","牧","隗","山","谷","车","侯","宓","蓬","全","郗","班","仰","秋","仲","伊","宫","宁","仇","栾","暴","甘","钭","厉","戎","祖","武","符","刘","景","詹","束","龙","叶","幸","司","韶","郜","黎","蓟","薄","印","宿","白","怀","蒲","邰","从","鄂","索","咸","籍","赖","卓","蔺","屠","蒙","池","乔","阴","郁","胥","能","苍","双","闻","莘","党","翟","谭","贡","劳","逄","姬","申","扶","堵","冉","宰","郦","雍","卻","璩","桑","桂","濮","牛","寿","通","边","扈","燕","冀","郏","浦","尚","农","温","别","庄","晏","柴","瞿","阎","充","慕","连","茹","习","宦","艾","鱼","容","向","古","易","慎","戈","廖","庾","终","暨","居","衡","步","都","耿","满","弘","匡","国","文","寇","广","禄","阙","东","欧","殳","沃","利","蔚","越","夔","隆","师","巩","厍","聂","晁","勾","敖","融","冷","訾","辛","阚","那","简","饶","空","曾","毋","沙","乜","养","鞠","须","丰","巢","关","蒯","相","查","后","荆","红","游","竺","权","逯","盖","益","桓","公","万俟","司马","上官","欧阳","夏侯","诸葛","闻人","东方","赫连","皇甫","尉迟","公羊","澹台","公冶","宗政","濮阳","淳于","单于","太叔","申屠","公孙","仲孙","轩辕","令狐","钟离","宇文","长孙","慕容","鲜于","闾丘","司徒","司空","丌官","司寇","仉","督","子车","颛孙","端木","巫马","公西","漆雕","乐正","壤驷","公良","拓跋","夹谷","宰父","谷梁","晋","楚","闫","法","汝","鄢","涂","钦","段干","百里","东郭","南门","呼延","归","海","羊舌","微生","岳","帅","缑","亢","况","后","有","琴","梁丘","左丘","东门","西门","商","牟","佘","佴","伯","赏","南宫","墨","哈","谯","笪","年","爱","阳","佟"][Math.floor(Math.random() * 400)];
const GIVENS = ["伟","芳","娜","秀英","敏","静","丽","强","磊","军","洋","勇","艳","杰","娟","涛","明","超","秀兰","霞","平","刚","桂英"];

function randomName(): string {
  return SURNAMES + GIVENS[Math.floor(Math.random() * GIVENS.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 战力计算：蛐蛐数量 + 品质权重 + 随机偏移
function calcPower(crickets: Array<{ tier: string }>): number {
  let score = crickets.length * 20;
  for (const c of crickets) {
    if (c.tier === "common") score += 10;
    else if (c.tier === "rare") score += 30;
    else if (c.tier === "epic") score += 80;
    else if (c.tier === "legendary") score += 200;
  }
  score += randomInt(0, 500);
  return Math.min(10000, Math.max(0, score));
}

async function main() {
  console.log("开始生成 200 个虚拟用户...\n");

  const activeTemplates = CRICKET_TEMPLATES.filter(t => t.isActive);

  // 1. 批量创建用户
  const users: Array<{ uid: string; nick_name: string; combat_power: number; wins: number; losses: number }> = [];

  for (let i = 1; i <= 200; i++) {
    const uid = `fake-${String(i).padStart(5, "0")}`;
    const count = randomInt(3, 20);

    // 先抽蛐蛐模板
    const pulled: typeof activeTemplates = [];
    for (let j = 0; j < count; j++) {
      const totalWeight = activeTemplates.reduce((s, t) => s + t.gachaWeight, 0);
      let r = Math.random() * totalWeight;
      for (const tpl of activeTemplates) {
        r -= tpl.gachaWeight;
        if (r <= 0) { pulled.push(tpl); break; }
      }
    }

    const power = calcPower(pulled);
    const wins = randomInt(0, Math.floor(power / 50));
    const losses = randomInt(0, Math.floor((10000 - power) / 50));

    users.push({
      uid,
      nick_name: randomName(),
      combat_power: power,
      wins,
      losses,
    });

    if (i % 50 === 0) console.log(`  已生成 ${i} 用户...`);
  }

  // 批量插入 users（每次 50 条）
  console.log("\n插入用户...");
  for (let i = 0; i < users.length; i += 50) {
    const batch = users.slice(i, i + 50);
    const { error } = await sb.from("users").upsert(
      batch.map(u => ({
        uid: u.uid,
        nick_name: u.nick_name,
        token: u.uid,
        avatar: "/assets/avatars/avatar-default.png",
        combat_power: u.combat_power,
        wins: u.wins,
        losses: u.losses,
      })),
      { onConflict: "uid" }
    );
    if (error) console.error(`  用户插入失败 batch ${i}:`, error.message);
    else console.log(`  用户 ${i + 1}-${Math.min(i + 50, users.length)} 完成`);
  }

  // 2. 为每个用户生成蛐蛐
  console.log("\n生成蛐蛐...");
  let totalCrickets = 0;

  for (let i = 1; i <= 200; i++) {
    const uid = `fake-${String(i).padStart(5, "0")}`;
    const count = randomInt(3, 20);

    const pulls: typeof activeTemplates = [];
    for (let j = 0; j < count; j++) {
      const totalWeight = activeTemplates.reduce((s, t) => s + t.gachaWeight, 0);
      let r = Math.random() * totalWeight;
      for (const tpl of activeTemplates) {
        r -= tpl.gachaWeight;
        if (r <= 0) { pulls.push(tpl); break; }
      }
    }

    const inserts = pulls.map(tpl => {
      const v = generateVariant(tpl);
      return {
        uid,
        template_id: tpl.id,
        attack: v.attack,
        defense: v.defense,
        speed: v.speed,
        max_hp: v.maxHp,
        max_stamina: v.maxStamina,
        spirit_base: v.spiritBase,
      };
    });

    // 分批插入（每次 50 条）
    for (let j = 0; j < inserts.length; j += 50) {
      const batch = inserts.slice(j, j + 50);
      const { error } = await sb.from("user_crickets").insert(batch);
      if (error) {
        console.error(`  蛐蛐插入失败 uid=${uid}:`, error.message);
        break;
      }
    }

    totalCrickets += inserts.length;
    if (i % 50 === 0) console.log(`  已为 ${i} 个用户生成蛐蛐 (累计 ${totalCrickets} 只)...`);
  }

  // 3. 为 150 个用户设置防守阵容
  console.log("\n设置防守阵容...");
  const defendUids: string[] = [];
  const allUids = users.map(u => u.uid);
  // 随机选 150 人
  const shuffled = [...allUids].sort(() => Math.random() - 0.5);
  const withDefense = new Set(shuffled.slice(0, 150));

  for (const uid of withDefense) {
    // 从该用户的蛐蛐中随机选 3 只
    const { data: crickets } = await sb.from("user_crickets")
      .select("id").eq("uid", uid).limit(3);
    if (crickets && crickets.length >= 3) {
      const ids = crickets.map((c: any) => c.id);
      await sb.from("users").update({ defense_crickets: ids }).eq("uid", uid);
    }
    defendUids.push(uid);
  }

  console.log(`  已为 ${defendUids.length} 人设置防守阵容`);
  console.log(`  未布阵: ${200 - defendUids.length} 人`);

  console.log("\n=== 完成 ===");
  console.log(`用户: 200 人`);
  console.log(`蛐蛐: ${totalCrickets} 只`);
  console.log(`布阵: ${defendUids.length} 人`);
  console.log(`未布阵: ${200 - defendUids.length} 人`);

  // 统计
  const powers = users.map(u => u.combat_power).sort((a, b) => b - a);
  console.log(`战力范围: ${powers[199]} ~ ${powers[0]}`);
  console.log(`平均战力: ${Math.round(powers.reduce((a, b) => a + b, 0) / 200)}`);
}

main().catch(console.error);
