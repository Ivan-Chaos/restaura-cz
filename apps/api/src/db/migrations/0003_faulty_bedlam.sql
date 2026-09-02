ALTER TABLE "menu_item" ALTER COLUMN "price_czk" SET DATA TYPE numeric(10, 2);
--> statement-breakpoint
-- Hand-added note: this is a widening in place, not a rewrite. Postgres casts
-- integer to numeric implicitly, so every existing whole-koruna price keeps its
-- value (89 becomes 89.00) and the menu_item_price_non_negative check still
-- holds without being touched.
