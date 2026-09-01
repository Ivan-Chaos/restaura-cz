CREATE TABLE "email_confirmation" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_confirmation_attempts_range" CHECK ("email_confirmation"."attempts" between 0 and 5)
);
--> statement-breakpoint
ALTER TABLE "owner_account" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_confirmation" ADD CONSTRAINT "email_confirmation_account_id_owner_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."owner_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Hand-added: every account that existed before confirmation was introduced is
-- treated as verified. Without this they would all be locked out of the
-- dashboard by a code that was never sent to them.
UPDATE "owner_account" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL;