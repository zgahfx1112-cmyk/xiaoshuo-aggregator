# Plan 4: 优化与部署

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 缓存优化、Rate Limiting、SEO、Render部署、监控。

**Architecture:** Redis缓存策略优化。IP频率限制防爬虫滥用。SEO meta标签 + SSR渲染。Render Web Service部署 + PostgreSQL + Upstash Redis。

**Tech Stack:** Render, Upstash Redis, Next.js SEO

---

## Task 22: 缓存策略优化

**Files:**
- Modify: `src/lib/redis.ts`
- Modify: All API routes

**Implementation:**
- [ ] 缓存预热：Top50小说前10章预加载
- [ ] 缓存失效策略：小说更新触发清理
- [ ] 缓存统计：命中率监控

---

## Task 23: Rate Limiting

**Files:**
- Create: `src/lib/rateLimit.ts`
- Modify: All API routes

**Implementation:**
- [ ] Redis实现IP频率限制
- [ ] 每IP每分钟10次请求
- [ ] 超限返回429状态码

---

## Task 24: SEO优化

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/novel/[id]/page.tsx`
- Modify: `src/app/read/[novelId]/[chapterNum]/page.tsx`

**Implementation:**
- [ ] 动态meta标签：书名、作者、简介
- [ ] SSR渲染详情页、阅读页
- [ ] Sitemap生成

---

## Task 25: Render部署配置

**Files:**
- Create: `render.yaml`
- Modify: `package.json`
- Create: `DEPLOYMENT.md`

**Implementation:**
- [ ] Web Service配置
- [ ] PostgreSQL数据库服务
- [ ] 环境变量配置
- [ ] 部署文档

---

## Task 26: 监控与日志

**Files:**
- Create: `src/lib/logger.ts`
- Modify: `src/app/api/cron/*.ts`

**Implementation:**
- [ ] 日志记录：INFO/WARN/ERROR
- [ ] 定时任务执行状态监控
- [ ] 错误告警机制

---

## Task 27: 最终验证

**Files:**
- None

**Implementation:**
- [ ] 生产环境部署验证
- [ ] 性能测试：响应时间<3秒
- [ ] 功能测试：所有核心功能正常
- [ ] 提交最终代码

---

**Duration:** 1 week