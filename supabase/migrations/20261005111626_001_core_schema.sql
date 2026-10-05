/*
# Accessibility Regression Lab — Core Schema

Creates the foundational tables for the platform: team members (profiles linked
to auth.users), projects, pages, scans, findings, remediation tickets, manual
checklist items, release gates, and comments. All tables are owner-scoped with
RLS policies.

1. New Tables
- `team_members` — user profiles with role assignments, linked to auth.users
- `projects` — collections of pages being tracked for accessibility
- `pages` — individual pages within a project that get scanned
- `scans` — individual accessibility scan runs on a page
- `findings` — individual accessibility violations found during a scan
- `remediation_tickets` — tickets created from findings for tracking remediation
- `manual_checklist_items` — manual testing checklist results per page per criterion
- `release_gates` — quality gate definitions per project
- `comments` — activity log comments on remediation tickets

2. Security
- RLS enabled on all tables
- Owner-scoped policies on projects and downstream tables
- All policies use auth.uid() for ownership checks
*/

-- ============================================================
-- Team Members (profiles)
-- ============================================================
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'frontend_engineer',
  avatar_color text DEFAULT '#2563eb',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_select_own" ON team_members;
CREATE POLICY "team_members_select_own" ON team_members FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "team_members_insert_own" ON team_members;
CREATE POLICY "team_members_insert_own" ON team_members FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "team_members_update_own" ON team_members;
CREATE POLICY "team_members_update_own" ON team_members FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Projects
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  wcag_level text NOT NULL DEFAULT 'AA',
  color text DEFAULT '#2563eb',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select_own" ON projects;
CREATE POLICY "projects_select_own" ON projects FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_insert_own" ON projects;
CREATE POLICY "projects_insert_own" ON projects FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_update_own" ON projects;
CREATE POLICY "projects_update_own" ON projects FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "projects_delete_own" ON projects;
CREATE POLICY "projects_delete_own" ON projects FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- Pages
-- ============================================================
CREATE TABLE IF NOT EXISTS pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text DEFAULT '',
  html_content text DEFAULT '',
  demo_page_id text DEFAULT '',
  baseline_scan_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pages_select_own" ON pages;
CREATE POLICY "pages_select_own" ON pages FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = pages.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "pages_insert_own" ON pages;
CREATE POLICY "pages_insert_own" ON pages FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = pages.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "pages_update_own" ON pages;
CREATE POLICY "pages_update_own" ON pages FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = pages.project_id AND projects.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = pages.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "pages_delete_own" ON pages;
CREATE POLICY "pages_delete_own" ON pages FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = pages.project_id AND projects.user_id = auth.uid())
);

-- ============================================================
-- Scans
-- ============================================================
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'completed',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz DEFAULT now(),
  total_violations int DEFAULT 0,
  critical_count int DEFAULT 0,
  serious_count int DEFAULT 0,
  moderate_count int DEFAULT 0,
  minor_count int DEFAULT 0,
  passes_count int DEFAULT 0,
  incomplete_count int DEFAULT 0,
  overall_score int DEFAULT 100,
  is_baseline boolean DEFAULT false,
  findings_json jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scans_select_own" ON scans;
CREATE POLICY "scans_select_own" ON scans FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = scans.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "scans_insert_own" ON scans;
CREATE POLICY "scans_insert_own" ON scans FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = scans.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "scans_update_own" ON scans;
CREATE POLICY "scans_update_own" ON scans FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = scans.project_id AND projects.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = scans.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "scans_delete_own" ON scans;
CREATE POLICY "scans_delete_own" ON scans FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = scans.project_id AND projects.user_id = auth.uid())
);

-- ============================================================
-- Findings (individual violations)
-- ============================================================
CREATE TABLE IF NOT EXISTS findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  rule_description text DEFAULT '',
  impact text DEFAULT 'moderate',
  wcag_criteria text DEFAULT '',
  target_selector text DEFAULT '',
  html_snippet text DEFAULT '',
  failure_summary text DEFAULT '',
  help_url text DEFAULT '',
  fingerprint text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "findings_select_own" ON findings;
CREATE POLICY "findings_select_own" ON findings FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = findings.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "findings_insert_own" ON findings;
CREATE POLICY "findings_insert_own" ON findings FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = findings.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "findings_delete_own" ON findings;
CREATE POLICY "findings_delete_own" ON findings FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = findings.project_id AND projects.user_id = auth.uid())
);

-- ============================================================
-- Remediation Tickets
-- ============================================================
CREATE TABLE IF NOT EXISTS remediation_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_id uuid REFERENCES pages(id) ON DELETE SET NULL,
  finding_fingerprint text NOT NULL DEFAULT '',
  rule_id text NOT NULL,
  rule_description text DEFAULT '',
  impact text DEFAULT 'moderate',
  wcag_criteria text DEFAULT '',
  target_selector text DEFAULT '',
  failure_summary text DEFAULT '',
  help_url text DEFAULT '',
  title text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_name text DEFAULT '',
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE remediation_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select_own" ON remediation_tickets;
CREATE POLICY "tickets_select_own" ON remediation_tickets FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = remediation_tickets.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "tickets_insert_own" ON remediation_tickets;
CREATE POLICY "tickets_insert_own" ON remediation_tickets FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = remediation_tickets.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "tickets_update_own" ON remediation_tickets;
CREATE POLICY "tickets_update_own" ON remediation_tickets FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = remediation_tickets.project_id AND projects.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = remediation_tickets.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "tickets_delete_own" ON remediation_tickets;
CREATE POLICY "tickets_delete_own" ON remediation_tickets FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = remediation_tickets.project_id AND projects.user_id = auth.uid())
);

-- ============================================================
-- Manual Checklist Items
-- ============================================================
CREATE TABLE IF NOT EXISTS manual_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  page_id uuid REFERENCES pages(id) ON DELETE CASCADE,
  criterion_id text NOT NULL,
  criterion_title text NOT NULL,
  criterion_category text NOT NULL,
  status text NOT NULL DEFAULT 'untested',
  notes text DEFAULT '',
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_name text DEFAULT '',
  tested_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE manual_checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checklist_select_own" ON manual_checklist_items;
CREATE POLICY "checklist_select_own" ON manual_checklist_items FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = manual_checklist_items.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "checklist_insert_own" ON manual_checklist_items;
CREATE POLICY "checklist_insert_own" ON manual_checklist_items FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = manual_checklist_items.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "checklist_update_own" ON manual_checklist_items;
CREATE POLICY "checklist_update_own" ON manual_checklist_items FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = manual_checklist_items.project_id AND projects.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = manual_checklist_items.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "checklist_delete_own" ON manual_checklist_items;
CREATE POLICY "checklist_delete_own" ON manual_checklist_items FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = manual_checklist_items.project_id AND projects.user_id = auth.uid())
);

-- ============================================================
-- Release Gates
-- ============================================================
CREATE TABLE IF NOT EXISTS release_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  max_critical int DEFAULT 0,
  max_serious int DEFAULT 0,
  max_new_regressions int DEFAULT 0,
  min_score int DEFAULT 95,
  require_manual_review boolean DEFAULT false,
  enabled boolean DEFAULT true,
  last_evaluated timestamptz,
  last_result text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE release_gates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gates_select_own" ON release_gates;
CREATE POLICY "gates_select_own" ON release_gates FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = release_gates.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "gates_insert_own" ON release_gates;
CREATE POLICY "gates_insert_own" ON release_gates FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = release_gates.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "gates_update_own" ON release_gates;
CREATE POLICY "gates_update_own" ON release_gates FOR UPDATE
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = release_gates.project_id AND projects.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = release_gates.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "gates_delete_own" ON release_gates;
CREATE POLICY "gates_delete_own" ON release_gates FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = release_gates.project_id AND projects.user_id = auth.uid())
);

-- ============================================================
-- Comments (activity log on tickets)
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES remediation_tickets(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text DEFAULT '',
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_own" ON comments;
CREATE POLICY "comments_select_own" ON comments FOR SELECT
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = comments.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "comments_insert_own" ON comments;
CREATE POLICY "comments_insert_own" ON comments FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = comments.project_id AND projects.user_id = auth.uid())
);

DROP POLICY IF EXISTS "comments_delete_own" ON comments;
CREATE POLICY "comments_delete_own" ON comments FOR DELETE
TO authenticated USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = comments.project_id AND projects.user_id = auth.uid())
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pages_project ON pages(project_id);
CREATE INDEX IF NOT EXISTS idx_scans_page ON scans(page_id);
CREATE INDEX IF NOT EXISTS idx_scans_project ON scans(project_id);
CREATE INDEX IF NOT EXISTS idx_findings_scan ON findings(scan_id);
CREATE INDEX IF NOT EXISTS idx_findings_page ON findings(page_id);
CREATE INDEX IF NOT EXISTS idx_findings_project ON findings(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_project ON remediation_tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_page ON remediation_tickets(page_id);
CREATE INDEX IF NOT EXISTS idx_checklist_page ON manual_checklist_items(page_id);
CREATE INDEX IF NOT EXISTS idx_checklist_project ON manual_checklist_items(project_id);
CREATE INDEX IF NOT EXISTS idx_gates_project ON release_gates(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_ticket ON comments(ticket_id);
