-- Cloudflare D1: eine Tabelle für alle Sammlungen (users, bookings, requests, …)
CREATE TABLE IF NOT EXISTS docs (
  col  TEXT NOT NULL,
  id   TEXT NOT NULL,
  data TEXT NOT NULL,
  PRIMARY KEY (col, id)
);
CREATE INDEX IF NOT EXISTS docs_col ON docs (col);
