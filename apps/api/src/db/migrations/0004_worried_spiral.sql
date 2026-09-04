ALTER TABLE "menu_item" ADD COLUMN "image_key" text;--> statement-breakpoint
ALTER TABLE "menu_item" ADD COLUMN "image_width" integer;--> statement-breakpoint
ALTER TABLE "menu_item" ADD COLUMN "image_height" integer;--> statement-breakpoint
ALTER TABLE "restaurant_profile" ADD COLUMN "logo_key" text;--> statement-breakpoint
ALTER TABLE "restaurant_profile" ADD COLUMN "logo_width" integer;--> statement-breakpoint
ALTER TABLE "restaurant_profile" ADD COLUMN "logo_height" integer;--> statement-breakpoint
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_image_complete" CHECK (("menu_item"."image_key" is null and "menu_item"."image_width" is null and "menu_item"."image_height" is null)
          or ("menu_item"."image_key" is not null and "menu_item"."image_width" > 0 and "menu_item"."image_height" > 0));--> statement-breakpoint
ALTER TABLE "restaurant_profile" ADD CONSTRAINT "restaurant_profile_logo_complete" CHECK (("restaurant_profile"."logo_key" is null and "restaurant_profile"."logo_width" is null and "restaurant_profile"."logo_height" is null)
          or ("restaurant_profile"."logo_key" is not null and "restaurant_profile"."logo_width" > 0 and "restaurant_profile"."logo_height" > 0));