-- Create database (run this manually first)
-- CREATE DATABASE once_human_memetics;

-- Users table (사용자 계정)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Characters table (게임 캐릭터/계정 - 한 사용자가 여러 캐릭터 소유 가능)
CREATE TABLE IF NOT EXISTS characters (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  character_name VARCHAR(100) NOT NULL,
  nickname VARCHAR(100),
  server_name VARCHAR(100),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, character_name)
);

-- Clans table
CREATE TABLE IF NOT EXISTS clans (
  id SERIAL PRIMARY KEY,
  clan_name VARCHAR(100) UNIQUE NOT NULL,
  master_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clan members table (캐릭터 단위로 클랜 가입)
CREATE TABLE IF NOT EXISTS clan_members (
  id SERIAL PRIMARY KEY,
  clan_id INTEGER REFERENCES clans(id) ON DELETE CASCADE,
  character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('master', 'member')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(clan_id, character_id)
);

-- Memetics table (캐릭터가 획득한 메메틱)
CREATE TABLE IF NOT EXISTS memetics (
  id SERIAL PRIMARY KEY,
  character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
  clan_id INTEGER REFERENCES clans(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level IN (5, 10, 15, 20, 25, 30, 35, 40, 45, 50)),
  memetic_name VARCHAR(100) NOT NULL,
  memetic_type VARCHAR(50),
  notes TEXT,
  obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_clan_id ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_character_id ON clan_members(character_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_user_id ON clan_members(user_id);
CREATE INDEX IF NOT EXISTS idx_memetics_clan_id ON memetics(clan_id);
CREATE INDEX IF NOT EXISTS idx_memetics_character_id ON memetics(character_id);
CREATE INDEX IF NOT EXISTS idx_memetics_level ON memetics(level);
