-- MACRO Database Schema
-- Run this against your Supabase database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for login lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Entries table (the raw text input)
CREATE TABLE IF NOT EXISTS entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for dashboard queries (hot path: user_id + timestamp range)
CREATE INDEX IF NOT EXISTS idx_entries_user_timestamp ON entries(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, (timestamp::date));

-- Entry items table (parsed nutritional data)
CREATE TABLE IF NOT EXISTS entry_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,

    -- Calories (kcal)
    calories_min INTEGER NOT NULL,
    calories_mid INTEGER NOT NULL,
    calories_max INTEGER NOT NULL,

    -- Protein (grams)
    protein_min DECIMAL(6,2) NOT NULL,
    protein_mid DECIMAL(6,2) NOT NULL,
    protein_max DECIMAL(6,2) NOT NULL,

    -- Carbs (grams)
    carbs_min DECIMAL(6,2) NOT NULL,
    carbs_mid DECIMAL(6,2) NOT NULL,
    carbs_max DECIMAL(6,2) NOT NULL,

    -- Fat (grams)
    fat_min DECIMAL(6,2) NOT NULL,
    fat_mid DECIMAL(6,2) NOT NULL,
    fat_max DECIMAL(6,2) NOT NULL,

    -- Fiber (grams)
    fiber_min DECIMAL(6,2) NOT NULL,
    fiber_mid DECIMAL(6,2) NOT NULL,
    fiber_max DECIMAL(6,2) NOT NULL,

    -- Confidence level
    confidence VARCHAR(10) NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for aggregation queries
CREATE INDEX IF NOT EXISTS idx_entry_items_entry_id ON entry_items(entry_id);
