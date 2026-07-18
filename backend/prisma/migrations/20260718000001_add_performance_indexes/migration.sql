-- Performance indexes for high-frequency query patterns

-- AccessLog: direction lookup on every RFID scan (by clientId or cardUid + tenantId, ordered by occurredAt)
CREATE INDEX IF NOT EXISTS "AccessLog_tenantId_occurredAt_idx" ON "AccessLog"("tenantId", "occurredAt" DESC);
CREATE INDEX IF NOT EXISTS "AccessLog_tenantId_clientId_occurredAt_idx" ON "AccessLog"("tenantId", "clientId", "occurredAt" DESC);
CREATE INDEX IF NOT EXISTS "AccessLog_tenantId_cardUid_occurredAt_idx" ON "AccessLog"("tenantId", "cardUid", "occurredAt" DESC);
CREATE INDEX IF NOT EXISTS "AccessLog_tenantId_eventType_occurredAt_idx" ON "AccessLog"("tenantId", "eventType", "occurredAt" DESC);

-- Card: lookup by uid on every RFID scan
CREATE INDEX IF NOT EXISTS "Card_tenantId_uid_idx" ON "Card"("tenantId", "uid");
CREATE INDEX IF NOT EXISTS "Card_tenantId_clientId_idx" ON "Card"("tenantId", "clientId");

-- Client: listing with filters
CREATE INDEX IF NOT EXISTS "Client_tenantId_isActive_idx" ON "Client"("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "Client_tenantId_createdAt_idx" ON "Client"("tenantId", "createdAt" DESC);
