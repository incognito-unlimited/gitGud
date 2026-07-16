-- Add AI agent support columns and tables

-- Add AI metadata columns to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS code_snippet TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS ai_metadata JSONB;

-- Add difficulty tracking columns to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS current_round INTEGER NOT NULL DEFAULT 1;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS difficulty_trend TEXT NOT NULL DEFAULT 'normal';

-- Create match_events table for tracking granular player actions
CREATE TABLE IF NOT EXISTS match_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
