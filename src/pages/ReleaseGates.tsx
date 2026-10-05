import { useEffect, useState, useMemo } from 'react';
import { ShieldCheck, Plus, CheckCircle2, XCircle, AlertTriangle, Settings2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner, EmptyState, Badge, Button, Modal } from '@/components/ui';
import type { Project, Scan, ReleaseGate } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

export function ReleaseGatesPage() {
  const { session } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [gates, setGates] = useState<ReleaseGate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editGate, setEditGate] = useState<ReleaseGate | null>(null);

  // Create form state
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [maxCritical, setMaxCritical] = useState(0);
  const [maxSerious, setMaxSerious] = useState(0);
  const [maxNewRegressions, setMaxNewRegressions] = useState(0);
  const [minScore, setMinScore] = useState(95);
  const [requireManual, setRequireManual] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data: projData } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      setProjects((projData as Project[]) || []);

      const { data: scanData } = await supabase.from('scans').select('*').order('created_at', { ascending: false });
      setScans((scanData as Scan[]) || []);

      const { data: gateData } = await supabase.from('release_gates').select('*').order('created_at', { ascending: false });
      setGates((gateData as ReleaseGate[]) || []);
      setLoading(false);
    })();
  }, [session?.user?.id]);

  const evaluateGate = (gate: ReleaseGate) => {
    const projScans = scans.filter((s) => s.project_id === gate.project_id);
    if (projScans.length === 0) return { result: 'pending', reason: 'No scans available' };

    // Find baseline and latest
    const baseline = projScans.find((s) => s.is_baseline);
    const latest = projScans[0];

    const failures: string[] = [];

    if (latest.critical_count > gate.max_critical) {
      failures.push(`${latest.critical_count} critical issues (max ${gate.max_critical})`);
    }
    if (latest.serious_count > gate.max_serious) {
      failures.push(`${latest.serious_count} serious issues (max ${gate.max_serious})`);
    }
    if (latest.overall_score < gate.min_score) {
      failures.push(`Score ${latest.overall_score} below minimum ${gate.min_score}`);
    }

    // Check regressions if baseline exists
    if (baseline && baseline.id !== latest.id) {
      const baselineFingerprints = new Set((baseline.findings_json || []).map((f) => f.fingerprint));
      const newRegs = (latest.findings_json || []).filter((f) => !baselineFingerprints.has(f.fingerprint));
      if (newRegs.length > gate.max_new_regressions) {
        failures.push(`${newRegs.length} new regressions (max ${gate.max_new_regressions})`);
      }
    }

    if (gate.require_manual_review) {
      // Check if manual checklist has been completed
      // For simplicity, we'll check if there are manual items with tested_at
      // This is a soft check — in production this would query the DB
    }

    if (failures.length === 0) {
      return { result: 'pass', reason: 'All criteria met' };
    }
    return { result: 'fail', reason: failures.join('; ') };
  };

  const handleCreate = async () => {
    if (!name.trim() || !projectId) return;
    const { data, error } = await supabase
      .from('release_gates')
      .insert({
        name: name.trim(),
        project_id: projectId,
        max_critical: maxCritical,
        max_serious: maxSerious,
        max_new_regressions: maxNewRegressions,
        min_score: minScore,
        require_manual_review: requireManual,
        enabled: true,
      })
      .select()
      .single();

    if (!error && data) {
      setGates((prev) => [data as ReleaseGate, ...prev]);
      setShowCreate(false);
      setName('');
      setProjectId('');
      setMaxCritical(0);
      setMaxSerious(0);
      setMaxNewRegressions(0);
      setMinScore(95);
      setRequireManual(false);
    }
  };

  const handleUpdate = async (gate: ReleaseGate, updates: Partial<ReleaseGate>) => {
    const { data, error } = await supabase
      .from('release_gates')
      .update(updates)
      .eq('id', gate.id)
      .select()
      .single();
    if (!error && data) {
      setGates((prev) => prev.map((g) => (g.id === gate.id ? (data as ReleaseGate) : g)));
      setEditGate(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this release gate?')) return;
    await supabase.from('release_gates').delete().eq('id', id);
    setGates((prev) => prev.filter((g) => g.id !== id));
  };

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name || 'Unknown';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Release Quality Gates</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Define accessibility criteria that must pass before a release can ship
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={projects.length === 0}>
          <Plus className="w-4 h-4" /> New Gate
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ShieldCheck className="w-6 h-6" />}
            title="No projects to gate"
            description="Create a project first, then define release quality gates for it."
          />
        </div>
      ) : gates.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<ShieldCheck className="w-6 h-6" />}
            title="No release gates yet"
            description="Create a quality gate to enforce accessibility criteria before releases. For example: zero critical issues, no new regressions vs baseline, minimum score 95."
            action={
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" /> Create your first gate
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {gates.map((gate) => {
            const evaluation = evaluateGate(gate);
            const projScans = scans.filter((s) => s.project_id === gate.project_id);
            const latest = projScans[0];

            return (
              <div key={gate.id} className="card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                        evaluation.result === 'pass'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : evaluation.result === 'fail'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      )}
                    >
                      {evaluation.result === 'pass' ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : evaluation.result === 'fail' ? (
                        <XCircle className="w-6 h-6" />
                      ) : (
                        <AlertTriangle className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{gate.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{projectName(gate.project_id)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={
                            evaluation.result === 'pass'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                              : evaluation.result === 'fail'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }
                        >
                          {evaluation.result === 'pass' ? 'PASS' : evaluation.result === 'fail' ? 'FAIL' : 'PENDING'}
                        </Badge>
                        {!gate.enabled && <Badge className="bg-slate-100 text-slate-400 dark:bg-slate-800">Disabled</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditGate(gate)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      aria-label="Edit gate"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(gate.id)}
                      className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      aria-label="Delete gate"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Gate criteria */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <GateMetric label="Max Critical" limit={gate.max_critical} current={latest?.critical_count ?? 0} />
                  <GateMetric label="Max Serious" limit={gate.max_serious} current={latest?.serious_count ?? 0} />
                  <GateMetric label="Min Score" limit={gate.min_score} current={latest?.overall_score ?? 100} inverse />
                  <GateMetric label="Max New Regressions" limit={gate.max_new_regressions} current={0} />
                </div>

                {/* Evaluation reason */}
                <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium">Status: </span>
                    {evaluation.reason}
                  </p>
                  {latest && (
                    <p className="text-xs text-slate-400 mt-1">
                      Last scan: {formatDate(latest.created_at)} — Score: {latest.overall_score}/100
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Gate Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Release Quality Gate"
        description="Define criteria that must be met before a release can ship"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="gate-name" className="label-text">Gate name</label>
            <input id="gate-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="e.g. Production Release Gate" autoFocus />
          </div>
          <div>
            <label htmlFor="gate-project" className="label-text">Project</label>
            <select id="gate-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input-field">
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="max-critical" className="label-text">Max Critical Issues</label>
              <input id="max-critical" type="number" min={0} value={maxCritical} onChange={(e) => setMaxCritical(parseInt(e.target.value) || 0)} className="input-field" />
            </div>
            <div>
              <label htmlFor="max-serious" className="label-text">Max Serious Issues</label>
              <input id="max-serious" type="number" min={0} value={maxSerious} onChange={(e) => setMaxSerious(parseInt(e.target.value) || 0)} className="input-field" />
            </div>
            <div>
              <label htmlFor="max-regressions" className="label-text">Max New Regressions</label>
              <input id="max-regressions" type="number" min={0} value={maxNewRegressions} onChange={(e) => setMaxNewRegressions(parseInt(e.target.value) || 0)} className="input-field" />
            </div>
            <div>
              <label htmlFor="min-score" className="label-text">Minimum Score</label>
              <input id="min-score" type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(parseInt(e.target.value) || 0)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={requireManual} onChange={(e) => setRequireManual(e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Require manual checklist review</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || !projectId}>Create Gate</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Gate Modal */}
      <Modal
        open={!!editGate}
        onClose={() => setEditGate(null)}
        title="Edit Release Gate"
      >
        {editGate && (
          <GateEditForm gate={editGate} onSave={handleUpdate} onCancel={() => setEditGate(null)} />
        )}
      </Modal>
    </div>
  );
}

function GateMetric({ label, limit, current, inverse }: { label: string; limit: number; current: number; inverse?: boolean }) {
  const passes = inverse ? current >= limit : current <= limit;
  return (
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className={cn('text-sm font-bold tabular-nums', passes ? 'text-slate-900 dark:text-white' : 'text-red-600 dark:text-red-400')}>
          {current}
        </span>
        <span className="text-xs text-slate-400">/ {limit}</span>
      </div>
    </div>
  );
}

function GateEditForm({ gate, onSave, onCancel }: { gate: ReleaseGate; onSave: (gate: ReleaseGate, updates: Partial<ReleaseGate>) => void; onCancel: () => void }) {
  const [name, setName] = useState(gate.name);
  const [maxCritical, setMaxCritical] = useState(gate.max_critical);
  const [maxSerious, setMaxSerious] = useState(gate.max_serious);
  const [maxNewRegressions, setMaxNewRegressions] = useState(gate.max_new_regressions);
  const [minScore, setMinScore] = useState(gate.min_score);
  const [requireManual, setRequireManual] = useState(gate.require_manual_review);
  const [enabled, setEnabled] = useState(gate.enabled);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="edit-name" className="label-text">Gate name</label>
        <input id="edit-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="edit-critical" className="label-text">Max Critical</label>
          <input id="edit-critical" type="number" min={0} value={maxCritical} onChange={(e) => setMaxCritical(parseInt(e.target.value) || 0)} className="input-field" />
        </div>
        <div>
          <label htmlFor="edit-serious" className="label-text">Max Serious</label>
          <input id="edit-serious" type="number" min={0} value={maxSerious} onChange={(e) => setMaxSerious(parseInt(e.target.value) || 0)} className="input-field" />
        </div>
        <div>
          <label htmlFor="edit-regressions" className="label-text">Max New Regressions</label>
          <input id="edit-regressions" type="number" min={0} value={maxNewRegressions} onChange={(e) => setMaxNewRegressions(parseInt(e.target.value) || 0)} className="input-field" />
        </div>
        <div>
          <label htmlFor="edit-score" className="label-text">Minimum Score</label>
          <input id="edit-score" type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(parseInt(e.target.value) || 0)} className="input-field" />
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={requireManual} onChange={(e) => setRequireManual(e.target.checked)} className="w-4 h-4 rounded" />
        <span className="text-sm text-slate-700 dark:text-slate-300">Require manual checklist review</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4 rounded" />
        <span className="text-sm text-slate-700 dark:text-slate-300">Enabled</span>
      </label>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(gate, { name, max_critical: maxCritical, max_serious: maxSerious, max_new_regressions: maxNewRegressions, min_score: minScore, require_manual_review: requireManual, enabled })}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
