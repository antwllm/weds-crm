-- Phase 6: WhatsApp AI Agent schema changes

-- Add AI agent columns to leads table
ALTER TABLE "leads" ADD COLUMN "whatsapp_ai_enabled" boolean DEFAULT false;
ALTER TABLE "leads" ADD COLUMN "whatsapp_ai_handoff_at" timestamp;
ALTER TABLE "leads" ADD COLUMN "whatsapp_ai_last_alert_at" timestamp;
ALTER TABLE "leads" ADD COLUMN "whatsapp_ai_consecutive_count" integer DEFAULT 0;

-- Add sentBy column to whatsapp_messages table
ALTER TABLE "whatsapp_messages" ADD COLUMN "sent_by" varchar(10) DEFAULT 'human';

-- Create whatsapp_agent_config table (single-row, like ai_prompt_config)
CREATE TABLE IF NOT EXISTS "whatsapp_agent_config" (
  "id" serial PRIMARY KEY,
  "prompt_template" text NOT NULL,
  "knowledge_base" text,
  "model" varchar(100) DEFAULT 'anthropic/claude-sonnet-4',
  "updated_at" timestamp DEFAULT now()
);
