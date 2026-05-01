# Plan 2: 核心功能层

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 实现搜索、小说详情、阅读器、书架核心功能。

**Architecture:** Next.js App Router页面 + API Routes。书架用localStorage，阅读进度本地管理。多书源并发搜索，内容缓存Redis。

**Tech Stack:** Next.js, Material UI, Cheerio, localStorage API

---

## Task 12: 搜索功能

**Files:**
- Create: `src/app/search/page.tsx`
- Create: `src/app/api/search/route.ts`
- Create: `src/components/SearchBar.tsx`
- Create: `src/components/NovelCard.tsx`

**Implementation:**
- [ ] 搜索API：多书源并发请求，结果合并
- [ ] 搜索页面：搜索框 + 结果列表 + 分页
- [ ] NovelCard组件：书名、作者、封面、书源标识

---

## Task 13: 小说详情页

**Files:**
- Create: `src/app/novel/[id]/page.tsx`
- Create: `src/app/api/novel/[id]/route.ts`
- Create: `src/components/ChapterList.tsx`

**Implementation:**
- [ ] 详情API：获取小说元数据 + 章节列表
- [ ] 详情页：基本信息 + 章节列表 + 加入书架按钮
- [ ] ChapterList：懒加载分页，每页50章

---

## Task 14: 阅读器模块

**Files:**
- Create: `src/app/read/[novelId]/[chapterNum]/page.tsx`
- Create: `src/app/api/chapter/[novelId]/[num]/route.ts`
- Create: `src/components/Reader.tsx`
- Create: `src/hooks/useReadingProgress.ts`

**Implementation:**
- [ ] 章节API：指定书源获取内容，失败自动切换
- [ ] 阅读页面：章节内容 + 上下章按钮 + 设置面板
- [ ] Reader组件：字体大小、背景色、翻页模式
- [ ] 阅读进度：localStorage存储当前章节

---

## Task 15: 书架模块

**Files:**
- Create: `src/app/bookshelf/page.tsx`
- Create: `src/hooks/useBookshelf.ts`
- Create: `src/components/BookshelfItem.tsx`

**Implementation:**
- [ ] useBookshelf hook：localStorage CRUD操作
- [ ] 书架页面：收藏列表 + 排序筛选
- [ ] BookshelfItem：书籍信息 + 进度显示 + 删除按钮

---

## Task 16: 首页热门榜单

**Files:**
- Create: `src/app/api/hot/route.ts`
- Create: `src/components/HotList.tsx`
- Modify: `src/app/page.tsx`

**Implementation:**
- [ ] 热榜API：定时任务更新 + Redis缓存
- [ ] 首页集成：分类导航 + 热门榜单展示

---

**Duration:** 3 weeks