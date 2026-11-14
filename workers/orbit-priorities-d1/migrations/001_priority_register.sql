-- ORBIT priority register, isolated staging schema; never run on production without review.
-- Migration begins with no priorities; no browser or Mac data is imported.
CREATE TABLE IF NOT EXISTS orbit_priority_sets (
  scope TEXT PRIMARY KEY CHECK(scope = 'personal'),
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL
);
INSERT OR IGNORE INTO orbit_priority_sets (scope,revision,updated_at,updated_by)
VALUES ('personal',0,'1970-01-01T00:00:00.000Z','bootstrap');

CREATE TABLE IF NOT EXISTS orbit_priorities (
  scope TEXT NOT NULL DEFAULT 'personal',
  priority_id TEXT NOT NULL CHECK(length(priority_id) BETWEEN 1 AND 100),
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 500),
  done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0,1)),
  position INTEGER NOT NULL DEFAULT 0 CHECK(position >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision INTEGER NOT NULL CHECK(revision > 0),
  PRIMARY KEY(scope,priority_id),
  FOREIGN KEY(scope) REFERENCES orbit_priority_sets(scope)
);
CREATE INDEX IF NOT EXISTS idx_orbit_priorities_active
  ON orbit_priorities(scope,deleted_at,position);

CREATE TABLE IF NOT EXISTS orbit_priority_events (
  event_id TEXT PRIMARY KEY,
  scope TEXT NOT NULL DEFAULT 'personal',
  revision INTEGER NOT NULL CHECK(revision > 0),
  action TEXT NOT NULL CHECK(action IN
    ('create','edit','complete','restore','tombstone','import','clear_confirmed')),
  priority_id TEXT,
  actor TEXT NOT NULL,
  source TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  UNIQUE(scope,revision),
  FOREIGN KEY(scope) REFERENCES orbit_priority_sets(scope)
);
CREATE INDEX IF NOT EXISTS idx_orbit_priority_events_history
  ON orbit_priority_events(scope,revision DESC);

-- In a single transactional D1 batch: INSERT event for expected_revision + 1,
-- UPDATE revision by exactly one, INSERT/UPDATE the priority. No other order.
CREATE TRIGGER IF NOT EXISTS orbit_event_cas_guard
BEFORE INSERT ON orbit_priority_events
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM orbit_priority_sets WHERE scope=NEW.scope AND revision=NEW.revision-1
)
BEGIN SELECT RAISE(ABORT,'priority_revision_conflict'); END;

CREATE TRIGGER IF NOT EXISTS orbit_state_revision_step_guard
BEFORE UPDATE OF revision ON orbit_priority_sets
FOR EACH ROW WHEN NEW.revision != OLD.revision+1
BEGIN SELECT RAISE(ABORT,'priority_revision_must_increment_once'); END;

CREATE TRIGGER IF NOT EXISTS orbit_item_insert_guard
BEFORE INSERT ON orbit_priorities
FOR EACH ROW WHEN NOT EXISTS (
  SELECT 1 FROM orbit_priority_sets s
  JOIN orbit_priority_events e ON e.scope=s.scope AND e.revision=s.revision
    AND (e.priority_id=NEW.priority_id OR e.action IN ('import','clear_confirmed'))
  WHERE s.scope=NEW.scope AND s.revision=NEW.revision
)
BEGIN SELECT RAISE(ABORT,'priority_event_required'); END;

CREATE TRIGGER IF NOT EXISTS orbit_item_update_guard
BEFORE UPDATE ON orbit_priorities
FOR EACH ROW WHEN NEW.revision <= OLD.revision OR NOT EXISTS (
  SELECT 1 FROM orbit_priority_sets s
  JOIN orbit_priority_events e ON e.scope=s.scope AND e.revision=s.revision
    AND (e.priority_id=NEW.priority_id OR e.action IN ('import','clear_confirmed'))
  WHERE s.scope=NEW.scope AND s.revision=NEW.revision
)
BEGIN SELECT RAISE(ABORT,'priority_event_required'); END;

-- Tombstones preserve deleted records; events are immutable.
CREATE TRIGGER IF NOT EXISTS orbit_no_hard_delete_priority
BEFORE DELETE ON orbit_priorities
BEGIN SELECT RAISE(ABORT,'priority_tombstone_required'); END;

CREATE TRIGGER IF NOT EXISTS orbit_no_update_event
BEFORE UPDATE ON orbit_priority_events
BEGIN SELECT RAISE(ABORT,'priority_events_append_only'); END;

CREATE TRIGGER IF NOT EXISTS orbit_no_delete_event
BEFORE DELETE ON orbit_priority_events
BEGIN SELECT RAISE(ABORT,'priority_events_append_only'); END;
