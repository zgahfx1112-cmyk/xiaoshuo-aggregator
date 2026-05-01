-- AddEnabledField
-- Add enabled field to BookSource table

ALTER TABLE "BookSource" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;

-- Create index for enabled field
CREATE INDEX "BookSource_enabled_index" ON "BookSource"("enabled");