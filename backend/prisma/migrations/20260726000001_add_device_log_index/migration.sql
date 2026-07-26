-- AddIndex
CREATE INDEX "AccessLog_tenantId_deviceId_occurredAt_idx" ON "AccessLog"("tenantId", "deviceId", "occurredAt" DESC);
