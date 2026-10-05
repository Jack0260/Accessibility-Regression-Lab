import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Flag,
  AlertTriangle,
  CheckCircle2,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Bug,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner, ScoreRing, Badge, EmptyState, Button, Modal } from '@/components/ui';
import { compareScans } from '@/lib/scanner';
import type { Scan, Page, Project, FindingData, RemediationTicket, Impact, TicketPriority } from '@/lib/types';
import {
  IMPACT_BG,
  IMPACT_COLORS,
  TICKET_PRIORITY_LABELS,
} from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

type FindingsTab = 'all' | 'new' | 'resolved' | 'unchanged';

export function ScanDetailPage() {
  const { projectId, scanId } = useParams<{ projectId: string; scanId: string }>();
  const { session, member } = useAuth();
  const [scan, setScan] = useState<Scan | null>(null);
  const [page, setPage] = useState<Page | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [baselineScan, setBaselineScan] = useState<Scan | null>(null);
  const [allPageScans, setAllPageScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<FindingsTab>('all');
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [ticketFinding, setTicketFinding] = useState<FindingData | null>(null);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>('medium');
  const [existingTickets, setExistingTickets] = useState<RemediationTicket[]>([]);

  useEffect(() => {
    if (!scanId || !projectId) return;
    (async () => {
      const { data: scanData } = await supabase
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .maybeSingle();
      const scan = scanData as Scan | null;
      setScan(scan);

      if (scan) {
        const { data: pageData } = await supabase
          .from('pages')
          .select('*')
          .eq('id', scan.page_id)
          .maybeSingle();
        setPage(pageData as Page | null);

        // Fetch all scans for this page to find baseline
        const { data: pageScans } = await supabase
          .from('scans')
          .select('*')
          .eq('page_id', scan.page_id)
          .order('created_at', { ascending: false });
        const pageScansList = (pageScans as Scan[]) || [];
        setAllPageScans(pageScansList);

        const baseline = pageScansList.find((s) => s.is_baseline && s.id !== scan.id);
        setBaselineScan(baseline || null);

        // Fetch existing tickets for this project
        const { data: tickets } = await supabase
          .from('remediation_tickets')
          .select('*')
          .eq('project_id', projectId);
        setExistingTickets((tickets as RemediationTicket[]) || []);
      }

      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();
      setProject(projData as Project | null);
      setLoading(false);
    })();
  }, [scanId, projectId]);

  const findings: FindingData[] = scan?.findings_json || [];

  const regressionDiff = useMemo(() => {
    if (!baselineScan) return null;
    return compareScans(baselineScan.findings_json || [], findings);
  }, [baselineScan, findings]);

  const displayedFindings = useMemo(() => {
    if (!regressionDiff || tab === 'all') return findings;
    if (tab === 'new') return regressionDiff.newFindings;
    if (tab === 'resolved') return regressionDiff.resolvedFindings;
    if (tab === 'unchanged') return regressionDiff.unchangedFindings;
    return findings;
  }, [findings, regressionDiff, tab]);

  const groupedFindings = useMemo(() => {
    const groups: Record<string, FindingData[]> = {};
    for (const f of displayedFindings) {
      if (!groups[f.rule_id]) groups[f.rule_id] = [];
      groups[f.rule_id].push(f);
    }
    return Object.entries(groups).sort((a, b) => {
      const order: Impact[] = ['critical', 'serious', 'moderate', 'minor'];
      const aImpact = order.indexOf(a[1][0].impact);
      const bImpact = order.indexOf(b[1][0].impact);
      return aImpact - bImpact;
    });
  }, [displayedFindings]);

  const toggleFinding = (key: string) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCreateTicket = async () => {
    if (!ticketFinding || !projectId || !session?.user?.id || !ticketTitle.trim()) return;

    const newTicket: Omit<RemediationTicket, 'id' | 'created_at' | 'updated_at'> = {
      project_id: projectId,
      page_id: scan?.page_id || null,
      finding_fingerprint: ticketFinding.fingerprint,
      rule_id: ticketFinding.rule_id,
      rule_description: ticketFinding.rule_description,
      impact: ticketFinding.impact,
      wcag_criteria: ticketFinding.wcag_criteria,
      target_selector: ticketFinding.target_selector,
      failure_summary: ticketFinding.failure_summary,
      help_url: ticketFinding.help_url,
      title: ticketTitle.trim(),
      status: 'open',
      priority: ticketPriority,
      assignee_id: session.user.id,
      assignee_name: member?.full_name || '',
      due_date: null,
    };

    const { data, error } = await supabase
      .from('remediation_tickets')
      .insert(newTicket)
      .select()
      .single();

    if (!error && data) {
      setExistingTickets((prev) => [...prev, data as RemediationTicket]);
      setShowCreateTicket(false);
      setTicketFinding(null);
      setTicketTitle('');
      setTicketPriority('medium');
    }
  };

  const openCreateTicket = (f: FindingData) => {
    setTicketFinding(f);
    setTicketTitle(`Fix: ${f.rule_description} (${f.rule_id})`);
    setShowCreateTicket(true);
  };

  const isFindingTicketed = (f: FindingData) => {
    return existingTickets.some((t) => t.finding_fingerprint === f.fingerprint && t.status !== 'wont_fix');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-500">Scan not found.</p>
        <Link to={`/projects/${projectId}`} className="mt-4 inline-flex btn-primary">
          Back to Project
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Link
        to={`/projects/${projectId}`}
        className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to {project?.name || 'Project'}
      </Link>

      {/* Scan summary header */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <ScoreRing score={scan.overall_score} size={72} />
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Scan Results
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {page?.name} — {formatDateTime(scan.created_at)}
              </p>
              <div className="flex items-center gap-3 mt-2">
                {scan.is_baseline ? (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    <Flag className="w-3 h-3 mr-1" /> Baseline Scan
                  </Badge>
                ) : baselineScan ? (
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Compared to baseline
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    No baseline set
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          <SummaryStat label="Total" value={scan.total_violations} />
          <SummaryStat label="Critical" value={scan.critical_count} color="text-red-600 dark:text-red-400" />
          <SummaryStat label="Serious" value={scan.serious_count} color="text-orange-600 dark:text-orange-400" />
          <SummaryStat label="Moderate" value={scan.moderate_count} color="text-yellow-600 dark:text-yellow-400" />
          <SummaryStat label="Minor" value={scan.minor_count} color="text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Automated-only disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Automated checks only
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400/80 mt-0.5">
            These results are from automated axe-core scans and cover approximately 30-40% of WCAG 2.2 AA criteria.
            Automated testing cannot prove full WCAG conformance. Use the{' '}
            <Link to="/manual-checklist" className="underline font-medium">manual testing checklist</Link>{' '}
            to verify the remaining criteria.
          </p>
        </div>
      </div>

      {/* Regression summary */}
      {regressionDiff && (regressionDiff.newFindings.length > 0 || regressionDiff.resolvedFindings.length > 0) && (
        <div className="card p-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Regression Comparison vs Baseline
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <RegressionStat
              label="New Regressions"
              value={regressionDiff.newFindings.length}
              icon={<TrendingUp className="w-4 h-4" />}
              color="text-red-600 dark:text-red-400"
              bg="bg-red-50 dark:bg-red-900/20"
            />
            <RegressionStat
              label="Resolved"
              value={regressionDiff.resolvedFindings.length}
              icon={<TrendingDown className="w-4 h-4" />}
              color="text-green-600 dark:text-green-400"
              bg="bg-green-50 dark:bg-green-900/20"
            />
            <RegressionStat
              label="Unchanged"
              value={regressionDiff.unchangedFindings.length}
              icon={<Minus className="w-4 h-4" />}
              color="text-slate-600 dark:text-slate-400"
              bg="bg-slate-50 dark:bg-slate-800/50"
            />
          </div>
        </div>
      )}

      {/* Findings tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <FindingsTabButton active={tab === 'all'} onClick={() => setTab('all')}>
          All ({findings.length})
        </FindingsTabButton>
        {regressionDiff && (
          <>
            <FindingsTabButton active={tab === 'new'} onClick={() => setTab('new')}>
              New ({regressionDiff.newFindings.length})
            </FindingsTabButton>
            <FindingsTabButton active={tab === 'resolved'} onClick={() => setTab('resolved')}>
              Resolved ({regressionDiff.resolvedFindings.length})
            </FindingsTabButton>
            <FindingsTabButton active={tab === 'unchanged'} onClick={() => setTab('unchanged')}>
              Unchanged ({regressionDiff.unchangedFindings.length})
            </FindingsTabButton>
          </>
        )}
      </div>

      {/* Findings list */}
      {displayedFindings.length === 0 ? (
        <div className="card">
          {tab === 'all' ? (
            <EmptyState
              icon={<CheckCircle2 className="w-6 h-6" />}
              title="No violations found"
              description="This page passed all automated WCAG 2.2 AA checks. Remember that automated checks only cover part of WCAG — run the manual checklist too."
            />
          ) : (
            <EmptyState
              icon={<CheckCircle2 className="w-6 h-6" />}
              title={`No ${tab} findings`}
              description={
                tab === 'new'
                  ? 'No new regressions compared to the baseline. Great job!'
                  : tab === 'resolved'
                  ? 'No findings were resolved since the baseline.'
                  : 'No unchanged findings.'
              }
            />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {groupedFindings.map(([ruleId, group]) => {
            const first = group[0];
            const isExpanded = expandedFindings.has(ruleId);
            const ticketed = group.some(isFindingTicketed);

            return (
              <div key={ruleId} className="card overflow-hidden">
                <button
                  onClick={() => toggleFinding(ruleId)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-left"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <Badge className={cn(IMPACT_BG[first.impact], 'shrink-0')}>
                      {first.impact}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {first.rule_description}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {first.rule_id} — {group.length} occurrence{group.length > 1 ? 's' : ''}
                        {first.wcag_criteria && ` — WCAG: ${first.wcag_criteria}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ticketed && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                        <Bug className="w-3 h-3 mr-1" /> Ticketed
                      </Badge>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/50">
                    {group.map((f, i) => {
                      const isNew = regressionDiff?.newFindings.some(
                        (nf) => nf.fingerprint === f.fingerprint
                      );
                      const isResolved = regressionDiff?.resolvedFindings.some(
                        (rf) => rf.fingerprint === f.fingerprint
                      );
                      const hasTicket = isFindingTicketed(f);

                      return (
                        <div key={i} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isNew && (
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                  <TrendingUp className="w-3 h-3 mr-1" /> New regression
                                </Badge>
                              )}
                              {isResolved && (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                  <TrendingDown className="w-3 h-3 mr-1" /> Resolved
                                </Badge>
                              )}
                              <code className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {f.target_selector}
                              </code>
                            </div>
                            {!hasTicket && !isResolved && (
                              <Button size="sm" variant="secondary" onClick={() => openCreateTicket(f)}>
                                <Plus className="w-3 h-3" /> Create Ticket
                              </Button>
                            )}
                          </div>

                          {f.html_snippet && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">HTML</p>
                              <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg overflow-x-auto text-slate-700 dark:text-slate-300 font-mono">
                                {f.html_snippet}
                              </pre>
                            </div>
                          )}

                          {f.failure_summary && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Failure Summary</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{f.failure_summary}</p>
                            </div>
                          )}

                          {f.help_url && (
                            <a
                              href={f.help_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:underline"
                            >
                              <Info className="w-3 h-3" /> Learn more about this rule
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Ticket Modal */}
      <Modal
        open={showCreateTicket}
        onClose={() => setShowCreateTicket(false)}
        title="Create Remediation Ticket"
        description="Track this accessibility finding through remediation"
      >
        <div className="space-y-4">
          {ticketFinding && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge className={IMPACT_BG[ticketFinding.impact]}>
                  {ticketFinding.impact}
                </Badge>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {ticketFinding.rule_id}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{ticketFinding.target_selector}</p>
            </div>
          )}
          <div>
            <label htmlFor="ticket-title" className="label-text">Ticket title</label>
            <input
              id="ticket-title"
              type="text"
              value={ticketTitle}
              onChange={(e) => setTicketTitle(e.target.value)}
              className="input-field"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="ticket-priority" className="label-text">Priority</label>
            <select
              id="ticket-priority"
              value={ticketPriority}
              onChange={(e) => setTicketPriority(e.target.value as TicketPriority)}
              className="input-field"
            >
              {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-700 dark:text-blue-300">
            <p>This ticket will be assigned to you ({member?.full_name}). You can reassign it later from the Remediation board.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateTicket(false)}>Cancel</Button>
            <Button onClick={handleCreateTicket} disabled={!ticketTitle.trim()}>
              Create Ticket
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cn('mt-0.5 text-lg font-bold tabular-nums', color || 'text-slate-900 dark:text-white')}>
        {value}
      </p>
    </div>
  );
}

function RegressionStat({
  label,
  value,
  icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <div className={cn('p-4 rounded-lg flex items-center gap-3', bg)}>
      <div className={cn('shrink-0', color)}>{icon}</div>
      <div>
        <p className={cn('text-2xl font-bold tabular-nums', color)}>{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function FindingsTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap',
        active
          ? 'border-primary-600 text-primary-600 dark:text-primary-400'
          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
      )}
    >
      {children}
    </button>
  );
}
