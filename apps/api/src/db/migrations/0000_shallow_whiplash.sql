CREATE TABLE "menu" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"visual_variant" text DEFAULT 'default' NOT NULL,
	"public_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_name_length" CHECK (char_length("menu"."name") between 1 and 120),
	CONSTRAINT "menu_status_valid" CHECK ("menu"."status" in ('draft', 'published'))
);
--> statement-breakpoint
CREATE TABLE "menu_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_czk" integer NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_item_name_length" CHECK (char_length("menu_item"."name") between 1 and 200),
	CONSTRAINT "menu_item_description_length" CHECK ("menu_item"."description" is null or char_length("menu_item"."description") <= 2000),
	CONSTRAINT "menu_item_price_non_negative" CHECK ("menu_item"."price_czk" >= 0)
);
--> statement-breakpoint
CREATE TABLE "menu_section" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"menu_id" uuid NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_section_title_length" CHECK (char_length("menu_section"."title") between 1 and 120)
);
--> statement-breakpoint
CREATE TABLE "owner_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "menu" ADD CONSTRAINT "menu_account_id_owner_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."owner_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_section_id_menu_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."menu_section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_section" ADD CONSTRAINT "menu_section_menu_id_menu_id_fk" FOREIGN KEY ("menu_id") REFERENCES "public"."menu"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_account_id_owner_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."owner_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "menu_account_id_idx" ON "menu" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_public_slug_idx" ON "menu" USING btree ("public_slug") WHERE "menu"."public_slug" is not null;--> statement-breakpoint
CREATE INDEX "menu_item_section_position_idx" ON "menu_item" USING btree ("section_id","position");--> statement-breakpoint
CREATE INDEX "menu_section_menu_position_idx" ON "menu_section" USING btree ("menu_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "owner_account_email_lower_idx" ON "owner_account" USING btree (lower("email"));