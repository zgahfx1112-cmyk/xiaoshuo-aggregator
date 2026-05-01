# Plan 3: 高级功能层

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 书源管理、推荐算法、评论系统、定时任务。

**Architecture:** 书源导入/导出JSON配置。推荐算法基于标签匹配 + 热门 + 随机探索。Giscus评论集成。Cron定时更新书源。

**Tech Stack:** Giscus, node-cron, localStorage, Redis

---

## Task 17: 书源管理模块

**Files:**
- Create: `src/app/sources/page.tsx`
- Create: `src/app/api/sources/import/route.ts`
- Create: `src/components/SourceItem.tsx`
- Create: `src/hooks/useSources.ts`

**Implementation:**
- [ ] 书源列表页：内置 + 用户导入书源，状态标识
- [ ] 导入API：JSON校验 + 快速验证
- [ ] 导出功能：生成分享JSON

---

## Task 18: 书源自动更新

**Files:**
- Create: `src/app/api/sources/update/route.ts`
- Create: `src/lib/sourceUpdater.ts`
- Create: `src/app/api/cron/update-sources/route.ts`

**Implementation:**
- [ ] 拉取yckceo.com书源页面
- [ ] 解析书源JSON链接
- [ ] 分层验证（快速 + 深度）
- [ ] 定时任务API（外部触发）

---

## Task 19: 推荐算法

**Files:**
- Create: `src/app/api/recommend/route.ts`
- Create: `src/lib/recommendService.ts`
- Create: `src/hooks/useUserPreference.ts`
- Modify: `src/app/page.tsx`

**Implementation:**
- [ ] 用户偏好追踪：阅读历史标签统计
- [ ] 推荐生成：标签匹配5本 + 热门3本 + 随机2本
- [ ] Redis缓存推荐结果

---

## Task 20: 评论系统

**Files:**
- Create: `src/components/Comment.tsx`
- Modify: `src/app/novel/[id]/page.tsx`

**Implementation:**
- [ ] Giscus组件集成
- [ ] GitHub Discussions配置

---

## Task 21: 阅读设置优化

**Files:**
- Modify: `src/components/Reader.tsx`
- Create: `src/components/ReadingSettings.tsx`

**Implementation:**
- [ ] 字体大小滑块（12-24px）
- [ ] 背景色选择（白/护眼/暗）
- [ ] 翻页模式（点击/滑动）

---

**Duration:** 2 weeks