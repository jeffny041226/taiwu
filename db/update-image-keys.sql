-- 更新蛐蛐模板的素材图片路径
-- 当前占位图: 6张循环分配给20只蛐蛐
-- image_key 存储相对路径 (大图), 前端根据场景选择大图或缩略图

UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-001.png' WHERE id = 1;   -- 褐背小将
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-002.png' WHERE id = 2;   -- 灰翅将军
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-003.png' WHERE id = 3;   -- 黄足童子
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-004.png' WHERE id = 4;   -- 白须先锋
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-005.png' WHERE id = 5;   -- 黑背力士
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-006.png' WHERE id = 6;   -- 斑纹小将
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-001.png' WHERE id = 7;   -- 青足勇士
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-002.png' WHERE id = 8;   -- 须郎君
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-003.png' WHERE id = 9;   -- 青头大王
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-004.png' WHERE id = 10;  -- 黑头金刚
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-005.png' WHERE id = 11;  -- 铁翅元帅
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-006.png' WHERE id = 12;  -- 金须战将
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-001.png' WHERE id = 13;  -- 斑背先锋
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-002.png' WHERE id = 14;  -- 黄翅太保
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-003.png' WHERE id = 15;  -- 紫翅飞将
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-004.png' WHERE id = 16;  -- 赤羽天骄
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-005.png' WHERE id = 17;  -- 蓝甲天兵
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-006.png' WHERE id = 18;  -- 白翼先知
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-001.png' WHERE id = 19;  -- 赤牙将军
UPDATE cricket_templates SET image_key = '/assets/crickets/cricket-002.png' WHERE id = 20;  -- 金翅霸王;