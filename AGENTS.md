# 小勇士大冒险：AI 协作说明（所有参与的 AI 必读）

给一年级小朋友（6～7 岁）玩的闯关打怪游戏：答对数学题、拼音题、应用题就能攻击怪兽。
家长在国外，主要玩家在中国大陆，用 **iPhone Safari** 打开。

- 线上地址：https://sun0595.github.io/xiaoyongshi/
- 仓库：https://github.com/sun0595/sun0595.github.io
- `main` 分支 = 线上版本（GitHub Pages 自动发布 `main`，合并后 1～3 分钟生效）

---

## 一、硬性规则（违反任何一条都不能合并）

1. **只改 `src/` 和 `tools/`**。`xiaoyongshi/index.html` 是构建产物，不要手改，用构建脚本生成。
2. **零外部请求**。不能引用任何 CDN、Google 字体、外部图片或接口，因为中国大陆打不开它们。所有资源都由构建脚本内嵌进单个 HTML 文件。
3. **一屏显示，不能滚动**。所有页面在 **375×667**（iPhone SE）上都必须放得下。内容多时用分页标签或分步替换，不要加长页面。
4. **不用系统 emoji 显示**。源码里可以写 emoji，但显示时必须通过 `img("🐉")` 或 `emo(html)` 转成 Fluent 3D 图片。构建时会自动内嵌源码里出现的每个 emoji；如果某个 emoji 没有对应的 3D 图，构建会报错。
5. **字体统一**。所有中文用 `var(--f-ui)`（站酷快乐体），所有数字用 `var(--f-num)`（Baloo 2）。只有拼音用 `--f-py`（Andika，课本式 ɑ），只有教学用的汉字用 `--f-hz`（楷体）。不要引入新字体。
6. **UI 统一**。用现有组件：`.btn`（`.green/.blue/.red/.purple/.white`）、`.ibtn`、`.panel`、`.ribbon`、`.tabs/.tab`、`.pill`、`.bar`、`.note`、`.loot/.lt`。页面统一用 `openPage({title, back, body, ...})` 打开，不要另写一套样式。
7. **不能破坏存档**。存档在 `localStorage["math-hero-v1"]`（对象 `S`）。新增字段要有默认值，不能改名或删除旧字段；结构变化写在 `migrate()` 里。
8. **内容符合一年级**：数字在 20 以内；拼音和课本（人教版一年级上册）一致；文字简短，能用图就用图，所有题目都能被语音读出（`say()`）。
9. **提交前必须通过**：`python3 tools/build.py && python3 tools/build.py --test && node tools/smoke_test.mjs` 全部通过，并看一眼 `build/shots/` 里的截图。
10. 界面文字、提交信息、PR 说明都用**简体中文**。

## 二、多个 AI 同时工作的规则

- **不要直接推送到 `main`**。每个 AI 在自己的分支上工作，分支名：`agent/<你的名字>/<任务简述>`，例如 `agent/codebuddy/pinyin-world`。
- 完成后开一个 **Pull Request 到 `main`**，由主持人（Paseo 里的 Claude）审核合并。PR 说明里写：改了什么、为什么、怎么测的，并附上关键截图。
- **按文件划分任务，避免冲突**。同一时间，`src/ui.js` 和 `src/head.html`（界面、样式）最好只交给一个 AI；题库类任务主要改 `src/logic.js` 里各自的段落。
- 开始前先 `git pull`，PR 前先把最新的 `main` 合并进自己的分支。
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
**PR 里要包含重新构建后的 `xiaoyongshi/index.html`**，合并进 `main` 就会自动上线。

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

## 六、来自家长的反馈（已实现，不要回退）

- 要有压迫感：怪兽蓄力、最后 5 秒屏幕中央大数字倒计时、答错或超时就挨打。
- 奖励要有爽感：宝箱、贴纸收集与合成、星级升到钻石、BOSS 击败有专属演出（K.O.、烟花、金色结算）。
- BOSS 要明显不同：体型更大、有红色光环、半血暴怒。
- 大魔王只能通过连闯挑战，不能单刷。
- 小孩看不懂长文字：多用图形表达，加语音和气泡引导。
- 所有页面都有左上角返回按钮。
