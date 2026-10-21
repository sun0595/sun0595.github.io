# 小勇士大冒险：AI 协作说明（所有参与的 AI 必读）

给一年级小朋友（6～7 岁）玩的闯关打怪游戏：答对数学题、拼音题、应用题就能攻击怪兽。
家长在国外，主要玩家在中国大陆，用 **iPhone Safari** 打开。

- 线上地址：https://sun0595.github.io/xiaoyongshi/
- 仓库：https://github.com/sun0595/sun0595.github.io
- `main` 分支 = 正式版（GitHub Pages 自动发布 `main`，合并后 1～3 分钟生效）。**孩子每天在玩，main 只由主持人在家长同意后更新。**
- `dev` 分支 = 开发版。所有 AI 的 PR 都提交到 `dev`。
- 试玩版：https://sun0595.github.io/xiaoyongshi/beta/ ，由主持人把 `dev` 构建后发布，给孩子试玩；正式版不受影响。

---

## 一、硬性规则（违反任何一条都不能合并）

1. **只改 `src/` 和 `tools/`**。`xiaoyongshi/index.html` 是构建产物，不要手改，用构建脚本生成。
2. **零外部请求**。不能引用任何 CDN、Google 字体、外部图片或接口，因为中国大陆打不开它们。所有资源都由构建脚本内嵌进单个 HTML 文件。
3. **一屏显示，不能滚动**。除关卡地图可以上下拖动外，其他所有页面一屏放下、不能滚动。所有页面在 **375×667**（iPhone SE）和 **393×852**（带刘海/灵动岛的 iPhone）上都必须放得下（地图的顶栏和按钮也一样）。内容多时用分页标签或分步替换，不要加长页面。
4. **不用系统 emoji 显示**。源码里可以写 emoji，但显示时必须通过 `img("🐉")` 或 `emo(html)` 转成 Fluent 3D 图片。构建时会自动内嵌源码里出现的每个 emoji；如果某个 emoji 没有对应的 3D 图，构建会报错。`src/art/` 里的原画优先显示，没有原画才用 Fluent 3D 图：原图用 `python3 tools/art_prep.py <原图文件夹> src/art/ [--map 文件名=输出名 …]` 处理（去白底、裁剪、缩小、转 WebP），文件名用小写字母、数字和下划线（`map_<世界id>` 地图段、`hero_base` / `hero_<品质>` 小勇士整套外观、`weapon_<品质>` / `shield_<品质>` 手持、`mon_<世界id>_<关号>` 怪兽，第 15 关是 Boss），由构建脚本内嵌，代码里用 `art("名字")` / `artImg("名字", "🐉")` 取图；内嵌原画超过 5MB 构建会警告。处理后的 `src/art/*.webp` 是源素材，要提交。
5. **字体统一**。所有中文用 `var(--f-ui)`（站酷快乐体），所有数字用 `var(--f-num)`（Baloo 2）。只有拼音用 `--f-py`（Andika，课本式 ɑ），只有教学用的汉字用 `--f-hz`（楷体）。不要引入新字体。
6. **UI 统一**。用现有组件：`.btn`（`.green/.blue/.red/.purple/.white`）、`.ibtn`、`.panel`、`.ribbon`、`.tabs/.tab`、`.pill`、`.bar`、`.note`、`.loot/.lt`。页面统一用 `openPage({title, back, body, ...})` 打开，不要另写一套样式。
7. **不能破坏存档**。存档在 `localStorage["math-hero-v1"]`（对象 `S`）。新增字段要有默认值，不能改名或删除旧字段；结构变化写在 `migrate()` 里。
8. **内容符合一年级，但不能太简单**：难度随关卡递进，从 10 以内加减到 20 以内进位/退位，再到整十整百（30+30、100+100）和两位数加减；拼音和课本（人教版一年级上册）一致；文字简短，能用图就用图，所有题目都能被语音读出（`say()`）。
9. **提交前必须通过**：`python3 tools/build.py && python3 tools/build.py --test && node tools/smoke_test.mjs` 全部通过，并看一眼 `build/shots/` 里的截图。
10. 界面文字、提交信息、PR 说明都用**简体中文**。
11. **iPhone 安全区**。游戏不能遮挡顶部状态栏，也不能被状态栏、刘海、灵动岛、底部横条遮挡。所有贴边元素（包括全屏弹层 `.modal`、彩带、闪白等 `position:fixed` 的层）都要用 `env(safe-area-inset-*)` 留白，横屏时左右也要留。
12. **试玩版存档独立**。试玩版（/xiaoyongshi/beta/）不能读写正式版存档 `math-hero-v1`：第一次打开时把正式存档**复制**一份到自己的键里，之后只用自己的键。

## 安全边界（所有 AI 必须遵守）

- 只操作 `sun0595/sun0595.github.io` 这一个仓库。这台电脑的 GitHub 授权也能访问家长的其他仓库，**一律不准读取、克隆或修改其他仓库**。
- 不准推送到 `main` 或 `dev`，不准强制推送（`--force`），不准删除别人的分支，不准改仓库设置、Pages 设置、分支保护和权限。
- 不准把令牌、密码、个人信息写进代码、提交信息或 PR。
- 在家长的 Mac 上工作时：只能在 `~/Documents/Paseo Daily/小勇士开发/` 里自己的目录下读写；不准安装全局软件，不准改系统、网络、代理设置；删除只能用 `trash`，不准用 `rm`。

## 二、多个 AI 同时工作的规则

- **不要直接推送到 `main` 或 `dev`**。每个 AI 在自己的分支上工作，分支名：`agent/<你的名字>/<任务简述>`，例如 `agent/codebuddy/pinyin-world`。
- 完成后开一个 **Pull Request 到 `dev`**，由主持人（Paseo 里的 Claude）审核合并。界面有变化的 PR，主持人会先把截图给家长看，家长同意才合并。PR 说明里写：改了什么、为什么、怎么测的，并附上关键截图。
- **按文件划分任务，避免冲突**。同一时间，`src/ui.js` 和 `src/head.html`（界面、样式）最好只交给一个 AI；题库类任务主要改 `src/logic.js` 里各自的段落。
- 开始前先从最新的 `dev` 开分支，PR 前先把最新的 `dev` 合并进自己的分支。
- **PR 里不要提交构建产物** `xiaoyongshi/index.html`（几个 AI 同时改会一直冲突）。提交前运行 `git checkout -- xiaoyongshi/index.html` 还原它。构建产物由主持人在发布试玩版或正式版时统一生成。
- 没有仓库写权限的 AI：fork 后开 PR，或者把补丁（diff）交给主持人。

## 三、构建、测试、发布

```bash
pip install fonttools brotli          # 构建需要
npm i playwright && npx playwright install chromium   # 测试需要（或设置 CHROMIUM_PATH）

python3 tools/build.py                # 生成 xiaoyongshi/index.html（线上文件）
python3 tools/build.py --test         # 生成 build/test.html（带测试钩子 window.__t）
node tools/smoke_test.mjs             # 在 375×667 上走一遍所有画面，截图存到 build/shots/
```

第一次构建会下载 Fluent Emoji 3D 图片包（npm）和三种字体（google/fonts 仓库）到 `.cache/`，之后可以离线构建。
发布（只由主持人做）：试玩版构建到 `xiaoyongshi/beta/index.html`，正式版构建到 `xiaoyongshi/index.html`，通过 PR 合并进 `main` 后自动上线。

在家长的 Mac（Paseo）上：构建工具装在 `~/Documents/Paseo Daily/小勇士开发/.venv`（先 `source ../.venv/bin/activate`），Playwright 装在 `小勇士开发/node_modules`；测试用本机 Chrome：
`CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node tools/smoke_test.mjs`

## 四、代码地图

| 文件 | 内容 |
|---|---|
| `src/head.html` | `<title>` 和全部 CSS（设计变量在 `:root`） |
| `src/body.html` | 静态 DOM 骨架：地图 `#map`、战斗 `#battle`、弹层 `#modal` |
| `src/logic.js` | 存档 `S`/`DEFAULT`/`migrate`；音效 `sfx` 与语音 `say()`；计算题生成器 `G`；拼音题 `PY` / `pyQ()`；应用题 `WP`（每题都有线段图分步讲解 `steps`）；世界 `WORLDS`；勇士 `HEROES`；贴纸 `STK`；星级档位 `TIERS`；道具 `ITEMS` |
| `src/ui.js` | 3D 图片 `img()`/`emo()`；场景 `SCENES`；地图 `renderMap()`；弹层 `openPage()`；勇士、贴纸册、家长看板；战斗 `startLevel()` → `nextQuestion()` → `answer()` → `heroAttack()`/`monsterAttack()`；道具与冰冻；结算 `win()`/`showWin()`/`openChest()`；BOSS 演出 `bossFinale()`；大魔王连闯 `RUNS`；彩带和烟花 |
| `tools/build.py` | 组装单文件、内嵌 3D 图片、子集化并内嵌字体、检查外部引用 |
| `tools/smoke_test.mjs` | 自动走查和截图，检查报错、滚动、网络请求 |

题目对象格式（`nextQuestion()` 使用）：
`{parts | html, speak, answer, options[], hint | steps[], kind: "num"|"cmp"|"py"|"word"|"shape", key, rec, optHtml?, disp?}`
- `answer` 必须出现在 `options` 里，错误选项要用孩子真会犯的错。
- `speak` 是给语音读的纯文字。
- `hint`（或应用题的 `steps`）要能教会孩子怎么做，不要直接说出答案。

## 五、常见任务怎么做

- **加一种计算题**：在 `G` 里加生成器，然后在 `WORLDS[i].levels[j].g` 里用 `mix(...)` 接上。
- **加拼音字**：在 `PY` 里加 `[字, 无调拼音(ü 写作 v), 声调, emoji]`，emoji 必须有 3D 图。
- **加应用题**：在 `WP` 里仿照 `compareTrap` 写，必须带 `steps`（线段图 `bars()`、排队圆圈 `ppl()`、圆点 `dots()`）。
- **加世界或关卡**：在 `WORLDS` 末尾追加，同时在 `SCENES` 加场景配色。注意大魔王连闯 `RUNS` 和 `isFinal()` 是按世界序号写的，插在中间要一起改。
- **加贴纸、勇士、道具**：分别改 `STK`、`HEROES`（技能字段见现有写法）、`ITEMS` 和 `useItem()`。

## 六、家长 2026-10-21 的新决定（优先于下面的旧反馈）

- 每道题固定 **15 秒**，超时就挨打，要有压迫感；不要取消限时，也不要做"错题强制复练""每天限玩几关"。
- **关卡线性推进**（第 1 关、第 2 关……一直往后），不做"同一批关卡加难重打"的二周目；已通过的关卡随时可以在地图上点回去重玩。
- **当天难度递增**：当天第 1～15 关正常；第 16～30 关怪物伤害 ×2、每题 10 秒；第 31 关起伤害 ×3、每题 8 秒，依此加码。界面要看得出"狂暴"状态。
- **玩法多样**：答题打怪、算术消除（保证有解、乱点会挨打）、汉字-拼音连连看、拼读（b + ā → bā），不同关卡穿插。
- **装备取代贴纸**：白、蓝、粉、紫、橙、红六种品质；武器、头盔、盔甲、盾牌四个部位；词缀用图标加数字；能穿在主角身上并改变外观。旧贴纸折算成宝箱，不能让孩子觉得东西丢了。
- 不新增勇士，但现有勇士的技能和攻击特效要做好。
- **不加**"发给爸爸妈妈"报告按钮（家长看板和错题记录保留）。
- 美术以后会换成更有游戏感的原画风格（家长选定 CodeBuddy 的「3 头身硬边糖果」样稿），在那之前继续用 Fluent 3D 图。

## 七、来自家长的旧反馈（已实现；与第六节冲突时以第六节为准）

- 要有压迫感：怪兽蓄力、最后 5 秒屏幕中央大数字倒计时、答错或超时就挨打。
- 奖励要有爽感：宝箱、装备掉落（原为贴纸）、星级升到钻石、BOSS 击败有专属演出（K.O.、烟花、金色结算）。
- BOSS 要明显不同：体型更大、有红色光环、半血暴怒。
- 大魔王只能通过连闯挑战，不能单刷。（改为线性关卡时由界面负责人重新设计，设计方案先给家长看。）
- 小孩看不懂长文字：多用图形表达，加语音和气泡引导。
- 所有页面都有左上角返回按钮。
