// ============================================================
// Core domain types for the Accessibility Regression Lab
// ============================================================

export type UserRole =
  | 'frontend_engineer'
  | 'qa_engineer'
  | 'a11y_specialist'
  | 'design_system_owner'
  | 'engineering_manager'
  | 'product_manager'
  | 'release_manager';

export interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_color: string;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  wcag_level: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  project_id: string;
  name: string;
  url: string;
  html_content: string;
  demo_page_id: string;
  baseline_scan_id: string | null;
  created_at: string;
  updated_at: string;
}

export type Impact = 'critical' | 'serious' | 'moderate' | 'minor';

export interface FindingData {
  rule_id: string;
  rule_description: string;
  impact: Impact;
  wcag_criteria: string;
  target_selector: string;
  html_snippet: string;
  failure_summary: string;
  help_url: string;
  fingerprint: string;
}

export interface Scan {
  id: string;
  page_id: string;
  project_id: string;
  status: string;
  started_at: string;
  completed_at: string;
  total_violations: number;
  critical_count: number;
  serious_count: number;
  moderate_count: number;
  minor_count: number;
  passes_count: number;
  incomplete_count: number;
  overall_score: number;
  is_baseline: boolean;
  findings_json: FindingData[];
  created_at: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'wont_fix';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface RemediationTicket {
  id: string;
  project_id: string;
  page_id: string | null;
  finding_fingerprint: string;
  rule_id: string;
  rule_description: string;
  impact: Impact;
  wcag_criteria: string;
  target_selector: string;
  failure_summary: string;
  help_url: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignee_id: string | null;
  assignee_name: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export type ManualStatus = 'untested' | 'pass' | 'fail' | 'needs_review';

export interface ManualChecklistItem {
  id: string;
  project_id: string;
  page_id: string | null;
  criterion_id: string;
  criterion_title: string;
  criterion_category: string;
  status: ManualStatus;
  notes: string;
  reviewer_id: string | null;
  reviewer_name: string;
  tested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReleaseGate {
  id: string;
  project_id: string;
  name: string;
  max_critical: number;
  max_serious: number;
  max_new_regressions: number;
  min_score: number;
  require_manual_review: boolean;
  enabled: boolean;
  last_evaluated: string | null;
  last_result: string;
  created_at: string;
}

export interface Comment {
  id: string;
  ticket_id: string;
  project_id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
}

// ============================================================
// Regression detection types
// ============================================================

export type RegressionClass = 'new' | 'resolved' | 'unchanged' | 'recurring';

export interface RegressionDiff {
  newFindings: FindingData[];
  resolvedFindings: FindingData[];
  unchangedFindings: FindingData[];
  recurringFindings: FindingData[];
  totalChanges: number;
}

// ============================================================
// UI / label maps
// ============================================================

export const ROLE_LABELS: Record<UserRole, string> = {
  frontend_engineer: 'Frontend Engineer',
  qa_engineer: 'QA Automation Engineer',
  a11y_specialist: 'Accessibility Specialist',
  design_system_owner: 'Design System Owner',
  engineering_manager: 'Engineering Manager',
  product_manager: 'Product Manager',
  release_manager: 'Release Manager',
};

export const IMPACT_COLORS: Record<Impact, string> = {
  critical: '#dc2626',
  serious: '#ea580c',
  moderate: '#ca8a04',
  minor: '#2563eb',
};

export const IMPACT_BG: Record<Impact, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  serious: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  moderate: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  minor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  wont_fix: 'Won\'t Fix',
};

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  wont_fix: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export const MANUAL_STATUS_LABELS: Record<ManualStatus, string> = {
  untested: 'Untested',
  pass: 'Pass',
  fail: 'Fail',
  needs_review: 'Needs Review',
};

export const MANUAL_STATUS_COLORS: Record<ManualStatus, string> = {
  untested: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  pass: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  fail: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  needs_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};
