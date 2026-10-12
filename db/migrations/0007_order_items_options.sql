ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "selectedOption" varchar(255);
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "notes" varchar(500);
