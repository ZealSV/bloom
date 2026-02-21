-- bloom Database Schema
-- Run this in your Supabase SQL Editor to set up the tables

-- Teaching sessions
CREATE TABLE sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    topic TEXT NOT NULL,
    subject_area TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'active'
);

-- Chat messages
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Concepts extracted from the conversation
CREATE TABLE concepts (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mastery_score REAL DEFAULT 0,
    status TEXT DEFAULT 'identified',
    parent_concept TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge gaps detected
CREATE TABLE gaps (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    concept_name TEXT NOT NULL,
    description TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMPTZ DEFAULT now()
);

-- Concept relationships for the knowledge graph
CREATE TABLE concept_relationships (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    from_concept TEXT NOT NULL,
    to_concept TEXT NOT NULL,
    relationship TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_concepts_session_id ON concepts(session_id);
CREATE INDEX idx_gaps_session_id ON gaps(session_id);
CREATE INDEX idx_concept_relationships_session_id ON concept_relationships(session_id);

-- Enable Row Level Security (open for now — add auth policies later)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_relationships ENABLE ROW LEVEL SECURITY;

-- Allow all operations (no auth for now)
CREATE POLICY "Allow all on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on concepts" ON concepts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on gaps" ON gaps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on concept_relationships" ON concept_relationships FOR ALL USING (true) WITH CHECK (true);
