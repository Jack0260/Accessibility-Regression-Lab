import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  FolderKanban,
  Bug,
  TrendingDown,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ScoreRing, Spinner } from '@/components/ui';
import type { Project, Scan, RemediationTicket } from '@/lib/types';
import { cn, timeAgo, scoreColor } from '@/lib/utils';

export function DashboardPage() {
  const { session } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentScans, setRecentScans] = useState<Scan[]>([]);
  const [tickets, setTickets] = useState<RemediationTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data: projData } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: scanData } = await supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: ticketData } = await supabase
        .from('remediation_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      setProjects(projData || []);
      setRecentScans(scanData || []);
      setTickets(ticketData || []);
      setLoading(false);
    })();
  }, [session?.user?.id]);

  const stats = useMemo(() => {
    const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress');
    const criticalTickets = openTickets.filter((t) => t.priority === 'critical');
    const latestScansByProject = new Map<string, Scan>();
    for (const s of recentScans) {
      if (!latestScansByProject.has(s.project_id)) {
        latestScansByProject.set(s.project_id, s);
      }
    }
    const avgScore =
      latestScansByProject.size > 0
        ? Math.round(
            Array.from(latestScansByProject.values()).reduce((sum, s) => sum + s.overall_score, 0) /
              latestScansByProject.size
          )
        : 0;

    return {
      projectCount: projects.length,
      openTickets: openTickets.length,
      criticalTickets: criticalTickets.length,
      avgScore,
    };
  }, [projects, tickets, recentScans]);

  const scoreTrend = useMemo(() => {
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const sorted = [...recentScans].reverse();
    return sorted.map((s, i) => ({
      name: `Scan ${i + 1}`,
      score: s.overall_score,
      project: projectMap.get(s.project_id)?.name || 'Unknown',
    }));
  }, [recentScans, projects]);

  const severityData = useMemo(() => {
    const totals = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    for (const s of recentScans) {
      totals.critical += s.critical_count;
      totals.serious += s.serious_count;
      totals.moderate += s.moderate_count;
      totals.minor += s.minor_count;
    }
    return [
      { name: 'Critical', value: totals.critical, color: '#dc2626' },
      { name: 'Serious', value: totals.serious, color: '#ea580c' },
      { name: 'Moderate', value: totals.moderate, color: '#ca8a04' },
      { name: 'Minor', value: totals.minor, color: '#2563eb' },
    ];
  }, [recentScans]);

  const ticketStatusData = useMemo(() => {
    const counts = { open: 0, in_progress: 0, resolved: 0, wont_fix: 0 };
    for (const t of tickets) {
      counts[t.status]++;
    }
    return [
      { name: 'Open', value: counts.open, color: '#2563eb' },
      { name: 'In Progress', value: counts.in_progress, color: '#f59e0b' },
      { name: 'Resolved', value: counts.resolved, color: '#22c55e' },
      { name: 'Won\'t Fix', value: counts.wont_fix, color: '#94a3b8' },
    ];
  }, [tickets]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Accessibility health overview across all your projects
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Projects"
          value={stats.projectCount}
          icon={<FolderKanban className="w-5 h-5" />}
          accent="primary"
          link="/projects"
        />
        <StatCard
          label="Open Tickets"
          value={stats.openTickets}
          icon={<Bug className="w-5 h-5" />}
          accent="warning"
          link="/remediation"
        />
        <StatCard
          label="Critical Issues"
          value={stats.criticalTickets}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent="error"
          link="/remediation"
        />
        <StatCard
          label="Avg. Score"
          value={stats.avgScore}
          icon={<TrendingDown className="w-5 h-5" />}
          accent="success"
          suffix="/100"
        />
      </div>

      {projects.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-4">
            <FolderKanban className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            No projects yet
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Create your first project to start scanning pages and tracking accessibility regressions.
          </p>
          <Link to="/projects" className="inline-flex mt-4 btn-primary">
            Create a Project <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Compliance Score Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Overall accessibility score across recent scans
              </p>
              {scoreTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={scoreTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ fill: '#2563eb', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <NoChartData />
              )}
            </div>

            <div className="card p-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Findings by Severity
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Distribution of violations from recent scans
              </p>
              {severityData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {severityData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <NoChartData />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Remediation Status
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Ticket breakdown by current status
              </p>
              {ticketStatusData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={ticketStatusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {ticketStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <NoChartData />
              )}
            </div>

            {/* Project health */}
            <div className="card p-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                Project Health
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Latest compliance score per project
              </p>
              <div className="space-y-3">
                {projects.slice(0, 5).map((p) => {
                  const latestScan = recentScans.find((s) => s.project_id === p.id);
                  const score = latestScan?.overall_score ?? 100;
                  return (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {p.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {latestScan ? `${latestScan.total_violations} violations` : 'No scans yet'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn('text-sm font-bold tabular-nums', scoreColor(score))}>
                          {score}
                        </span>
                        {latestScan ? (
                          <span className="text-xs text-slate-400">{timeAgo(latestScan.created_at)}</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Recent scans */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
              Recent Scans
            </h3>
            {recentScans.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-slate-200 dark:border-slate-800">
                      <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Score</th>
                      <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Violations</th>
                      <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Critical</th>
                      <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Serious</th>
                      <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Baseline</th>
                      <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentScans.slice(0, 8).map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="py-3">
                          <ScoreRing score={s.overall_score} size={36} />
                        </td>
                        <td className="py-3 font-medium text-slate-900 dark:text-white">
                          {s.total_violations}
                        </td>
                        <td className="py-3">
                          {s.critical_count > 0 ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">{s.critical_count}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3">
                          {s.serious_count > 0 ? (
                            <span className="text-orange-600 dark:text-orange-400 font-medium">{s.serious_count}</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3">
                          {s.is_baseline ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" aria-label="Baseline scan" />
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 text-slate-500 dark:text-slate-400">
                          {timeAgo(s.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <NoChartData />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
  link,
  suffix,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: 'primary' | 'warning' | 'error' | 'success';
  link?: string;
  suffix?: string;
}) {
  const accentClasses = {
    primary: 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    warning: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    error: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    success: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  };

  const content = (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {value}
            {suffix && <span className="text-sm text-slate-400 font-normal">{suffix}</span>}
          </p>
        </div>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', accentClasses[accent])}>
          {icon}
        </div>
      </div>
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
}

function NoChartData() {
  return (
    <div className="h-[240px] flex flex-col items-center justify-center text-slate-400">
      <XCircle className="w-8 h-8 mb-2 opacity-50" />
      <p className="text-sm">No data yet</p>
    </div>
  );
}
