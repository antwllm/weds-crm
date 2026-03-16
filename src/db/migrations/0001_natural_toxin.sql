CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"filters" jsonb,
	"sort_by" varchar(20) DEFAULT 'createdAt',
	"sort_direction" varchar(4) DEFAULT 'desc',
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_preferences_user_email_unique" UNIQUE("user_email")
);
