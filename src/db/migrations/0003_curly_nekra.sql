ALTER TABLE "email_templates" ADD COLUMN "is_default" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "content_type" varchar(10) DEFAULT 'text';--> statement-breakpoint
ALTER TABLE "email_templates" ADD COLUMN "attachments" jsonb;