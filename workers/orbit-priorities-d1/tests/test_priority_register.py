"""Contract tests using in-memory SQLite; no ORBIT data and no network."""
import json
import sqlite3
import unittest
from pathlib import Path

SCHEMA = (Path(__file__).parents[1] / 'migrations' / '001_priority_register.sql').read_text()

class PriorityRegisterTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(':memory:')
        self.db.execute('PRAGMA foreign_keys=ON')
        self.db.executescript(SCHEMA)

    def revision(self):
        return self.db.execute("SELECT revision FROM orbit_priority_sets WHERE scope='personal'").fetchone()[0]

    def commit(self, expected, event_id, action='create', priority_id='locks', title='Commercial', deleted_at=None):
        """Simulate the three statements sent through one atomic D1.batch call."""
        try:
            with self.db:
                self.db.execute("""INSERT INTO orbit_priority_events
                  (event_id,scope,revision,action,priority_id,actor,source,recorded_at,payload_json)
                  VALUES (?,'personal',?,?,?,'owner','safari','2026-11-14T01:00:00Z',?)""",
                  (event_id, expected+1, action, priority_id, json.dumps({'title':title})))
                self.db.execute("""UPDATE orbit_priority_sets
                  SET revision=?,updated_at='2026-11-14T01:00:00Z',updated_by='owner'
                  WHERE scope='personal' AND revision=?""", (expected+1,expected))
                self.db.execute("""INSERT INTO orbit_priorities
                  (scope,priority_id,title,done,position,created_at,updated_at,deleted_at,revision)
                  VALUES ('personal',?,?,0,0,'2026-11-14T01:00:00Z','2026-11-14T01:00:00Z',?,?)
                  ON CONFLICT(scope,priority_id) DO UPDATE SET
                  title=excluded.title,deleted_at=excluded.deleted_at,
                  updated_at=excluded.updated_at,revision=excluded.revision""",
                  (priority_id,title,deleted_at,expected+1))
        except sqlite3.IntegrityError:
            return False
        return True

    def test_initial_state_empty(self):
        self.assertEqual(self.revision(),0)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM orbit_priorities').fetchone()[0],0)

    def test_first_event(self):
        self.assertTrue(self.commit(0,'e1'))
        self.assertEqual(self.revision(),1)
        self.assertEqual(self.db.execute('SELECT action FROM orbit_priority_events').fetchone()[0],'create')

    def test_stale_revision_rollback(self):
        self.assertTrue(self.commit(0,'e1'))
        self.assertFalse(self.commit(0,'e2',action='edit',title='Stale'))
        self.assertEqual(self.revision(),1)
        self.assertEqual(self.db.execute('SELECT title FROM orbit_priorities').fetchone()[0],'Commercial')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM orbit_priority_events').fetchone()[0],1)

    def test_no_skipped_revision(self):
        self.assertTrue(self.commit(0,'e1'))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE orbit_priority_sets SET revision=9 WHERE scope='personal'")

    def test_no_item_mutation_without_new_event(self):
        self.assertTrue(self.commit(0,'e1'))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE orbit_priorities SET title='silent',revision=1 WHERE priority_id='locks'")

    def test_tombstone_and_restore(self):
        self.assertTrue(self.commit(0,'e1'))
        self.assertTrue(self.commit(1,'e2',action='tombstone',deleted_at='2026-11-14T02:00:00Z'))
        self.assertIsNotNone(self.db.execute('SELECT deleted_at FROM orbit_priorities').fetchone()[0])
        self.assertTrue(self.commit(2,'e3',action='restore'))
        self.assertIsNone(self.db.execute('SELECT deleted_at FROM orbit_priorities').fetchone()[0])
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM orbit_priority_events').fetchone()[0],3)

    def test_no_hard_delete(self):
        self.assertTrue(self.commit(0,'e1'))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("DELETE FROM orbit_priorities WHERE priority_id='locks'")

    def test_immutable_event_history(self):
        self.assertTrue(self.commit(0,'e1'))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE orbit_priority_events SET action='edit'")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("DELETE FROM orbit_priority_events")

    def test_invalid_item_causes_atomic_rollback(self):
        self.assertFalse(self.commit(0,'e1',title=''))
        self.assertEqual(self.revision(),0)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM orbit_priority_events').fetchone()[0],0)

    def test_reading_empty_never_means_clear(self):
        self.assertTrue(self.commit(0,'e1'))
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM orbit_priorities WHERE deleted_at IS NULL").fetchone()[0],1)
        self.assertEqual(self.revision(),1)

if __name__ == '__main__':
    unittest.main()
