-- Index for filtering AccessLog by checkinSource within a tenant, ordered by occurredAt.
-- Used by: GET /reports/summary (todayWhatsappCheckins), GET /access-logs?checkinSource=...
CREATE INDEX IF NOT EXISTS "AccessLog_tenantId_checkinSource_occurredAt_idx"
  ON "AccessLog"("tenantId", "checkinSource", "occurredAt" DESC);
