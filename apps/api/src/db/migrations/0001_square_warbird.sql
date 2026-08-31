CREATE TABLE "restaurant_profile" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"restaurant_name" text NOT NULL,
	"phones" text[] NOT NULL,
	"location" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_profile_name_length" CHECK (char_length("restaurant_profile"."restaurant_name") between 1 and 120),
	CONSTRAINT "restaurant_profile_phones_count" CHECK (cardinality("restaurant_profile"."phones") between 1 and 3),
	CONSTRAINT "restaurant_profile_location_length" CHECK (char_length("restaurant_profile"."location") between 1 and 200)
);
--> statement-breakpoint
ALTER TABLE "restaurant_profile" ADD CONSTRAINT "restaurant_profile_account_id_owner_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."owner_account"("id") ON DELETE cascade ON UPDATE no action;