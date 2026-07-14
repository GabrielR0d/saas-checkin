-- Adicionar phoneNumber ao Client
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Client_phoneNumber_key" ON "Client"("phoneNumber");

-- Campos de localização no TenantSettings
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "locationLat" DOUBLE PRECISION;
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "locationLng" DOUBLE PRECISION;
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "locationRadius" DOUBLE PRECISION NOT NULL DEFAULT 100;
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Campos no AccessLog
ALTER TABLE "AccessLog" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "AccessLog" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "AccessLog" ADD COLUMN IF NOT EXISTS "checkinSource" TEXT NOT NULL DEFAULT 'whatsapp';

-- Tornar cardUid opcional para check-ins sem cartão físico
ALTER TABLE "AccessLog" ALTER COLUMN "cardUid" DROP NOT NULL;
