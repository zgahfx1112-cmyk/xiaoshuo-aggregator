-- CreateEnum
-- CreateTable
CREATE TABLE "Novel" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "author" VARCHAR(100) NOT NULL,
    "cover" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[],
    "category" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "wordCount" INTEGER DEFAULT 0,
    "rating" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Novel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NovelSource" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "sourceName" VARCHAR(50) NOT NULL,
    "sourceUrl" VARCHAR(500) NOT NULL,
    "sourceId" VARCHAR(100) NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "lastChecked" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NovelSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "chapterNum" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "sourceUrls" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "novelId" TEXT NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "ratingCount" INTEGER DEFAULT 0,
    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookSource" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "config" JSONB NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "level" VARCHAR(10) NOT NULL,
    "task" VARCHAR(50) NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Novel_title_idx" ON "Novel"("title");

-- CreateIndex
CREATE INDEX "Novel_author_idx" ON "Novel"("author");

-- CreateIndex
CREATE INDEX "Novel_category_idx" ON "Novel"("category");

-- CreateIndex
CREATE INDEX "Novel_createdAt_idx" ON "Novel"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NovelSource_novelId_sourceName_key" ON "NovelSource"("novelId", "sourceName");

-- CreateIndex
CREATE INDEX "NovelSource_sourceName_idx" ON "NovelSource"("sourceName");

-- CreateIndex
CREATE INDEX "NovelSource_available_idx" ON "NovelSource"("available");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_novelId_chapterNum_key" ON "Chapter"("novelId", "chapterNum");

-- CreateIndex
CREATE INDEX "Chapter_novelId_idx" ON "Chapter"("novelId");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_novelId_source_key" ON "Rating"("novelId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "BookSource_name_key" ON "BookSource"("name");

-- CreateIndex
CREATE INDEX "BookSource_type_idx" ON "BookSource"("type");

-- CreateIndex
CREATE INDEX "BookSource_available_idx" ON "BookSource"("available");

-- CreateIndex
CREATE INDEX "SystemLog_task_idx" ON "SystemLog"("task");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");

-- AddForeignKey
ALTER TABLE "NovelSource" ADD CONSTRAINT "NovelSource_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
