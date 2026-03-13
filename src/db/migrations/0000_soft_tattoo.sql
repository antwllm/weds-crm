CREATE TYPE "public"."activity_type" AS ENUM('email_received', 'sms_sent', 'email_sent', 'status_change', 'note_added', 'duplicate_inquiry', 'notification_failed', 'pipedrive_synced', 'whatsapp_sent', 'whatsapp_received');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('nouveau', 'contacte', 'rdv', 'devis_envoye', 'signe', 'perdu');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"type" "activity_type" NOT NULL,
	"content" text,
	"metadata" jsonb,
	"gmail_message_id" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_prompt_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"prompt_template" text NOT NULL,
	"model" varchar(100) DEFAULT 'anthropic/claude-sonnet-4',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" varchar(500),
	"body" text,
	"variables" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"event_date" varchar(50),
	"message" text,
	"budget" integer,
	"source" varchar(50) DEFAULT 'mariages.net',
	"status" "lead_status" DEFAULT 'nouveau',
	"vcard_url" text,
	"gmail_message_id" varchar(255),
	"pipedrive_person_id" integer,
	"pipedrive_deal_id" integer,
	"last_sync_origin" varchar(10),
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "linked_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"gmail_message_id" varchar(255) NOT NULL,
	"gmail_thread_id" varchar(255),
	"subject" varchar(500),
	"snippet" text,
	"direction" varchar(10),
	"received_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "oauth_tokens_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer,
	"direction" varchar(10),
	"status" varchar(20),
	"error" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"wa_message_id" varchar(255),
	"direction" varchar(10) NOT NULL,
	"body" text,
	"status" varchar(20),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_emails" ADD CONSTRAINT "linked_emails_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_log" ADD CONSTRAINT "sync_log_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;