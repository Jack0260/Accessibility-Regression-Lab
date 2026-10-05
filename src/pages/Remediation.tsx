import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Bug,
  Filter,
  Calendar,
  MessageSquare,
  Send,
  ArrowLeft,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner, EmptyState, Badge, Button } from '@/components/ui';
import type {
  RemediationTicket,
  Project,
  Comment,
  TicketStatus,
  TicketPriority,
} from '@/lib/types';
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_COLORS,
  IMPACT_BG,
} from '@/lib/types';
import { cn, formatDate, timeAgo, initials } from '@/lib/utils';

const STATUS_ORDER: TicketStatus[] = ['open', 'in_progress', 'resolved', 'wont_fix'];
const STATUS_ICONS: Record<TicketStatus, string> = {
  open: '○',
  in_progress: '◐',
  resolved: '●',
  wont_fix: '×',
};

export function RemediationPage() {
  const { session } = useAuth();
  const [tickets, setTickets] = useState<RemediationTicket[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [view, setView] = useState<'board' | 'list'>('board');

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data: ticketData } = await supabase
        .from('remediation_tickets')
        .select('*')
        .order('created_at', { ascending: false });
      setTickets((ticketData as RemediationTicket[]) || []);

      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      setProjects((projData as Project[]) || []);
      setLoading(false);
    })();
  }, [session?.user?.id]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (filterProject !== 'all' && t.project_id !== filterProject) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterAssignee === 'me' && t.assignee_id !== session?.user?.id) return false;
      if (filterAssignee === 'unassigned' && t.assignee_id) return false;
      return true;
    });
  }, [tickets, filterProject, filterStatus, filterAssignee, session?.user?.id]);

  const assignees = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>();
    for (const t of tickets) {
      if (t.assignee_id && t.assignee_name) {
        map.set(t.assignee_id, {
          id: t.assignee_id,
          name: t.assignee_name,
          color: '#2563eb',
        });
      }
    }
    return Array.from(map.values());
  }, [tickets]);

  const updateTicket = async (id: string, updates: Partial<RemediationTicket>) => {
    const { data, error } = await supabase
      .from('remediation_tickets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      setTickets((prev) => prev.map((t) => (t.id === id ? (data as RemediationTicket) : t)));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Remediation Board</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track and assign accessibility findings through remediation
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <Filter className="w-4 h-4" />
        </div>
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="input-field w-auto py-1.5 text-sm"
          aria-label="Filter by project"
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TicketStatus | 'all')}
          className="input-field w-auto py-1.5 text-sm"
          aria-label="Filter by status"
        >
          <option value="all">All Statuses</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>{TICKET_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="input-field w-auto py-1.5 text-sm"
          aria-label="Filter by assignee"
        >
          <option value="all">All Assignees</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setView('board')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              view === 'board' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            Board
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              view === 'list' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            List
          </button>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Bug className="w-6 h-6" />}
            title="No remediation tickets"
            description="Create tickets from scan findings to track remediation work. Run a scan, view the results, and click 'Create Ticket' on any violation."
          />
        </div>
      ) : view === 'board' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_ORDER.map((status) => {
            const statusTickets = filteredTickets.filter((t) => t.status === status);
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span aria-hidden="true">{STATUS_ICONS[status]}</span>
                    {TICKET_STATUS_LABELS[status]}
                  </h3>
                  <span className="text-xs text-slate-400">{statusTickets.length}</span>
                </div>
                <div className="space-y-2">
                  {statusTickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      projectName={projectName(ticket.project_id)}
                      onUpdate={updateTicket}
                    />
                  ))}
                  {statusTickets.length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                      No tickets
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Title</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Project</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Severity</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Priority</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Status</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Assignee</th>
                <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Due</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((t) => (
                <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    <Link to={`/remediation/${t.id}`} className="hover:text-primary-600 dark:hover:text-primary-400">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{projectName(t.project_id)}</td>
                  <td className="px-4 py-3"><Badge className={IMPACT_BG[t.impact]}>{t.impact}</Badge></td>
                  <td className="px-4 py-3"><Badge className={TICKET_PRIORITY_COLORS[t.priority]}>{TICKET_PRIORITY_LABELS[t.priority]}</Badge></td>
                  <td className="px-4 py-3"><Badge className={TICKET_STATUS_COLORS[t.status]}>{TICKET_STATUS_LABELS[t.status]}</Badge></td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{t.assignee_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(t.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TicketCard({
  ticket,
  projectName,
  onUpdate,
}: {
  ticket: RemediationTicket;
  projectName: string;
  onUpdate: (id: string, updates: Partial<RemediationTicket>) => void;
}) {
  return (
    <Link
      to={`/remediation/${ticket.id}`}
      className="block card p-3 hover:shadow-md transition-shadow"
    >
      <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">
        {ticket.title}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{projectName}</p>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <Badge className={IMPACT_BG[ticket.impact]}>{ticket.impact}</Badge>
        <Badge className={TICKET_PRIORITY_COLORS[ticket.priority]}>
          {TICKET_PRIORITY_LABELS[ticket.priority]}
        </Badge>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
        {ticket.assignee_name ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: '#2563eb' }}
            >
              {initials(ticket.assignee_name)}
            </div>
            {ticket.assignee_name}
          </div>
        ) : (
          <span className="text-xs text-slate-400">Unassigned</span>
        )}
        {ticket.due_date && (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(ticket.due_date)}
          </span>
        )}
      </div>
    </Link>
  );
}

// ============================================================
// Ticket Detail Page
// ============================================================

export function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { session, member } = useAuth();
  const [ticket, setTicket] = useState<RemediationTicket | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ticketId) return;
    (async () => {
      const { data: ticketData } = await supabase
        .from('remediation_tickets')
        .select('*')
        .eq('id', ticketId)
        .maybeSingle();
      const t = ticketData as RemediationTicket | null;
      setTicket(t);

      if (t) {
        const { data: projData } = await supabase
          .from('projects')
          .select('*')
          .eq('id', t.project_id)
          .maybeSingle();
        setProject(projData as Project | null);

        const { data: commentData } = await supabase
          .from('comments')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });
        setComments((commentData as Comment[]) || []);
      }
      setLoading(false);
    })();
  }, [ticketId]);

  const updateTicket = async (updates: Partial<RemediationTicket>) => {
    if (!ticket) return;
    const { data, error } = await supabase
      .from('remediation_tickets')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', ticket.id)
      .select()
      .single();
    if (!error && data) {
      setTicket(data as RemediationTicket);
    }
  };

  const handleAddComment = async () => {
    if (!ticket || !commentText.trim() || !session?.user?.id || !member) return;
    setSubmitting(true);
    const { data, error } = await supabase
      .from('comments')
      .insert({
        ticket_id: ticket.id,
        project_id: ticket.project_id,
        author_id: session.user.id,
        author_name: member.full_name,
        body: commentText.trim(),
      })
      .select()
      .single();
    if (!error && data) {
      setComments((prev) => [...prev, data as Comment]);
      setCommentText('');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-500">Ticket not found.</p>
        <Link to="/remediation" className="mt-4 inline-flex btn-primary">Back to Remediation</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <Link
        to="/remediation"
        className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Remediation Board
      </Link>

      {/* Ticket header */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge className={TICKET_STATUS_COLORS[ticket.status]}>
            {TICKET_STATUS_LABELS[ticket.status]}
          </Badge>
          <Badge className={TICKET_PRIORITY_COLORS[ticket.priority]}>
            {TICKET_PRIORITY_LABELS[ticket.priority]}
          </Badge>
          <Badge className={IMPACT_BG[ticket.impact]}>{ticket.impact}</Badge>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{ticket.title}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Created {timeAgo(ticket.created_at)} in{' '}
          <Link to={`/projects/${ticket.project_id}`} className="text-primary-600 dark:text-primary-400 hover:underline">
            {project?.name || 'project'}
          </Link>
        </p>

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-xs text-slate-500 mb-1">Rule</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{ticket.rule_id}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">WCAG Criteria</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{ticket.wcag_criteria || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Assignee</p>
            <div className="flex items-center gap-2">
              {ticket.assignee_name ? (
                <>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: '#2563eb' }}
                  >
                    {initials(ticket.assignee_name)}
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{ticket.assignee_name}</span>
                </>
              ) : (
                <span className="text-sm text-slate-400">Unassigned</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Due Date</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(ticket.due_date)}</p>
          </div>
        </div>

        {/* Editable controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label htmlFor="status-select" className="label-text">Status</label>
            <select
              id="status-select"
              value={ticket.status}
              onChange={(e) => updateTicket({ status: e.target.value as TicketStatus })}
              className="input-field"
            >
              {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="priority-select" className="label-text">Priority</label>
            <select
              id="priority-select"
              value={ticket.priority}
              onChange={(e) => updateTicket({ priority: e.target.value as TicketPriority })}
              className="input-field"
            >
              {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="due-date" className="label-text">Due Date</label>
            <input
              id="due-date"
              type="date"
              value={ticket.due_date || ''}
              onChange={(e) => updateTicket({ due_date: e.target.value || null })}
              className="input-field"
            />
          </div>
        </div>
      </div>

      {/* Finding details */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Finding Details</h3>
        {ticket.failure_summary && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Failure Summary</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{ticket.failure_summary}</p>
          </div>
        )}
        {ticket.target_selector && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Target Element</p>
            <code className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded block text-slate-700 dark:text-slate-300 font-mono">
              {ticket.target_selector}
            </code>
          </div>
        )}
        {ticket.help_url && (
          <a
            href={ticket.help_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Learn more about this accessibility rule →
          </a>
        )}
      </div>

      {/* Comments */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Activity & Comments ({comments.length})
        </h3>
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No comments yet. Be the first to add one.</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  {initials(c.author_name)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{c.author_name}</span>
                    <span className="text-xs text-slate-400">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{c.body}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add comment */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            placeholder="Add a comment..."
            className="input-field"
            aria-label="Add a comment"
          />
          <Button onClick={handleAddComment} disabled={!commentText.trim() || submitting}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
