# Deployment Guide (No Database Required)

This guide covers deploying Xiaoshuo Aggregator to Render (free tier).

## Architecture

Pure source-based architecture:
- No PostgreSQL database required
- No Redis required
- All data stored in browser localStorage
- Book sources fetched directly from external APIs

## Prerequisites

1. GitHub account (for repository hosting)
2. Render account (https://render.com)

## Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/xiaoshuo.git
git push -u origin main
```

## Step 2: Deploy to Render

### Option A: Using render.yaml (Blueprint)

1. Go to https://dashboard.render.com
2. Click "New" > "Blueprint"
3. Connect your GitHub repository
4. Render will detect `render.yaml` and create web service

### Option B: Manual Setup

1. **Create Web Service**
   - Click "New" > "Web Service"
   - Connect your GitHub repository
   - Name: `xiaoshuo-aggregator`
   - Region: Oregon (or closest)
   - Branch: `main`
   - Runtime: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Plan: Free

2. **Add Environment Variables**
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `NEXT_PUBLIC_APP_NAME` | `小说聚合平台` |

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | Set to `production` |
| `NEXT_PUBLIC_APP_NAME` | No | Application name |

## Free Tier Limits

### Render
- Web Service: 750 hours/month (always on not guaranteed)
- No scheduled jobs

## Monitoring

1. **Render Dashboard**
   - View logs: Logs tab
   - Metrics: Metrics tab
   - Deployments: Events tab

2. **Health Check Endpoint**
   - URL: `/api/health`
   - Returns: `{ success: true, status: 'ok' }`

## Troubleshooting

### Build Failures
- Check build logs in Render dashboard
- Verify all dependencies in package.json
- Ensure Node.js version compatibility (18.x recommended)

### Memory Issues
- Free tier: 512MB RAM
- Consider upgrading to Starter plan ($7/month) for more RAM