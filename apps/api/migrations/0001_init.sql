-- Migration: 0001_init.sql
-- Creates users and projects tables for Mapnova D1 backend

CREATE TABLE users (
  id TEXT PRIMARY KEY,                -- Clerk user ID
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,                -- crypto.randomUUID()
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{"features":[],"notes":"","settings":{}}',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
