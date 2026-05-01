# Deployment Guide

This guide covers deploying Xiaoshuo Aggregator to Render (free tier).

## Prerequisites

1. GitHub account (for repository hosting)
2. Render account (https://render.com)
3. Upstash account for Redis (https://upstash.com) - Free tier available

## Step 1: Push to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/xiaoshuo.git
git push -u origin main
```

## Step 2: Create Upstash Redis (Free)

1. Go to https://console.upstash.io
2. Create a new database:
   - Name: `xiaoshuo-redis`
   - Region: Choose closest to your Render region
   - Type: Regional (free tier)
3. Copy the following values:
   - `REDIS_URL`: The UPSTASH_REDIS_REST_URL
   - `REDIS_TOKEN`: The UPSTASH_REDIS_REST_TOKEN

## Step 3: Deploy to Render

### Option A: Using render.yaml (Blueprint)

1. Go to https://dashboard.render.com
2. Click "New" > "Blueprint"
3. Connect your GitHub repository
4. Render will detect `render.yaml` and create:
   - Web service: `xiaoshuo-aggregator`
   - PostgreSQL database: `xiaoshuo-db`
5. Add environment variables manually:
   - `REDIS_URL`: Your Upstash REST URL
   - `REDIS_TOKEN`: Your Upstash REST Token

### Option B: Manual Setup

1. **Create PostgreSQL Database**
   - Go to https://dashboard.render.com
   - Click "New" > "PostgreSQL"
   - Name: `xiaoshuo-db`
   - Database: `xiaoshuo`
   - User: `xiaoshuo_user`
   - Region: Oregon (or closest)
   - Plan: Free
   - Click "Create Database"

2. **Create Web Service**
   - Click "New" > "Web Service"
   - Connect your GitHub repository
   - Name: `xiaoshuo-aggregator`
   - Region: Same as database
   - Branch: `main`
   - Root: (leave empty)
   - Runtime: `Node`
   - Build Command: `npm install && npm run db:generate && npm run build`
   - Start Command: `npm start`
   - Plan: Free

3. **Add Environment Variables**
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | (from database connection) |
   | `REDIS_URL` | (from Upstash) |
   | `REDIS_TOKEN` | (from Upstash) |
   | `CRON_SECRET` | (click "Generate") |
   | `NEXT_PUBLIC_APP_NAME` | `小说聚合平台` |
   | `YCKCEO_SOURCE_URL` | `https://www.yckceo.com/yuedu/shuyuan` |

## Step 4: Database Migration

After the first deployment, run migrations:

1. Go to your web service in Render dashboard
2. Click "Shell" tab
3. Run:
```bash
npx prisma migrate deploy
npx prisma db seed
```

Alternatively, use the Prisma schema approach with `prisma db push`:
```bash
npx prisma db push
npx prisma db seed
```

## Step 5: Configure Cron Jobs

Since Render free tier doesn't support scheduled jobs, use external cron services:

### Option A: UptimeRobot (Recommended)

1. Go to https://uptimerobot.com
2. Create a new monitor:
   - Monitor Type: HTTP(s)
   - URL: `https://your-app.onrender.com/api/cron/update-sources?secret=YOUR_CRON_SECRET`
   - Monitoring Interval: Every 6 hours
3. This will trigger the source update endpoint periodically

### Option B: cron-job.org

1. Go to https://cron-job.org
2. Create a new job:
   - URL: `https://your-app.onrender.com/api/cron/update-sources?secret=YOUR_CRON_SECRET`
   - Schedule: `0 */6 * * *` (every 6 hours)

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (auto-set by Render) |
| `REDIS_URL` | Yes | Upstash Redis REST URL |
| `REDIS_TOKEN` | Yes | Upstash Redis REST token |
| `CRON_SECRET` | Yes | Secret for cron endpoint authentication |
| `NEXT_PUBLIC_APP_NAME` | No | Application name (default: "小说聚合平台") |
| `YCKCEO_SOURCE_URL` | No | External book source URL |

## Free Tier Limits

### Render
- Web Service: 750 hours/month (always on not guaranteed)
- PostgreSQL: 1GB storage, 97 connections
- No scheduled jobs

### Upstash Redis
- 10,000 requests/day
- 256MB storage
- 100 concurrent connections

## Monitoring

1. **Render Dashboard**
   - View logs: Logs tab
   - Metrics: Metrics tab
   - Deployments: Events tab

2. **Health Check Endpoint**
   - URL: `/api/health`
   - Returns service status

## Troubleshooting

### Database Connection Errors
- Check DATABASE_URL is set correctly
- Verify database is running in Render dashboard
- Check connection limits (97 max on free tier)

### Redis Connection Errors
- Verify REDIS_URL and REDIS_TOKEN from Upstash
- Check Upstash dashboard for usage limits
- Ensure using REST URL, not Redis URL

### Build Failures
- Check build logs in Render dashboard
- Verify all dependencies in package.json
- Ensure Node.js version compatibility (18.x recommended)

### Memory Issues
- Free tier: 512MB RAM
- Optimize queries and cache frequently used data
- Consider upgrading to Starter plan ($7/month) for 512MB-2GB

## Scaling Up

To upgrade from free tier:

1. **Web Service**: Upgrade to Starter ($7/month)
   - More RAM (512MB - 2GB)
   - Always on (no spin-down)
   - Scheduled jobs included

2. **Database**: Upgrade to Starter ($7/month)
   - 10GB storage
   - More connections

3. **Redis**: Upgrade Upstash plan
   - More requests/day
   - Larger storage

## Security Checklist

- [ ] CRON_SECRET is generated and secure
- [ ] Database credentials not exposed in code
- [ ] Redis tokens not exposed in code
- [ ] HTTPS enforced (automatic on Render)
- [ ] Environment variables set in Render dashboard only