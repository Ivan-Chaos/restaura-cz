ALTER TABLE "menu_item" ADD COLUMN "dietary" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_item" ADD COLUMN "allergens" smallint[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_item" ADD COLUMN "spice_level" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_item" ADD COLUMN "warnings" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_item" ADD COLUMN "availability" text DEFAULT 'available' NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_dietary_known" CHECK (cardinality("menu_item"."dietary") <= 7
          and "menu_item"."dietary" <@ array['vegetarian', 'vegan', 'glutenFree', 'lactoseFree', 'halal', 'kosher', 'lenten']::text[]);--> statement-breakpoint
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_allergens_known" CHECK (cardinality("menu_item"."allergens") <= 14
          and "menu_item"."allergens" <@ array[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]::smallint[]);--> statement-breakpoint
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_spice_level_range" CHECK ("menu_item"."spice_level" between 0 and 3);--> statement-breakpoint
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_warnings_known" CHECK (cardinality("menu_item"."warnings") <= 5
          and "menu_item"."warnings" <@ array['containsAlcohol', 'rawOrUndercooked', 'mayContainBones', 'servedVeryHot', 'containsCaffeine']::text[]);--> statement-breakpoint
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_availability_known" CHECK ("menu_item"."availability" in ('available', 'limited', 'soldOut', 'hidden'));--> statement-breakpoint
-- Hand-added note: no backfill, deliberately. Every column above is NOT NULL
-- with a default, so Postgres fills existing rows from attmissingval without
-- rewriting the table, and each default already satisfies its CHECK — an empty
-- set declares nothing, a spice level of 0 is not spicy, and 'available' is
-- what every dish was before this feature existed. A menu published yesterday
-- reads identically today.
--
-- The column adds must stay ahead of the constraint adds: ADD CONSTRAINT scans
-- the table to validate, and it can only pass because the defaults are already
-- in place. At this table's size that scan is milliseconds; if menu_item ever
-- grows, the pattern is ADD CONSTRAINT ... NOT VALID followed by VALIDATE
-- CONSTRAINT, which drizzle-kit does not generate and would be a hand-edit.
