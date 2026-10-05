import { useEffect, useState, useMemo } from 'react';
import {
  FileCheck2,
  ShieldAlert,
  Printer,
  Download,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner, EmptyState, ScoreRing, Badge } from '@/components/ui';
import type { Project, Scan, ManualChecklistItem } from '@/lib/types';
import { MANUAL_CHECKLIST } from '@/lib/manualChecklist';
import { cn, formatDate } from '@/lib/utils';
import { IMPACT_COLORS } from '@/lib/types';

export function CompliancePage() {
  const { session } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [manualItems, setManualItems] = useState<ManualChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data: projData } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      setProjects((projData as Project[]) || []);

      const { data: scanData } = await supabase.from('scans').select('*').order('created_at', { ascending: false });
      setScans((scanData as Scan[]) || []);

      const { data: manualData } = await supabase.from('manual_checklist_items').select('*');
      setManualItems((manualData as ManualChecklistItem[]) || []);
      setLoading(false);
    })();
  }, [session?.user?.id]);

  const projectScans = useMemo(() => {
    if (selectedProject === 'all') return scans;
    return scans.filter((s) => s.project_id === selectedProject);
  }, [scans, selectedProject]);

  const projectManualItems = useMemo(() => {
    if (selectedProject === 'all') return manualItems;
    return manualItems.filter((m) => m.project_id === selectedProject);
  }, [manualItems, selectedProject]);

  const criteriaResults = useMemo(() => {
    // Group all findings by WCAG criteria across scans
    const criteriaMap = new Map<string, { criteria: string; pass: boolean; automated: boolean; manual?: ManualChecklistItem }>();

    // From automated scans - use latest scan per project
    const latestByProject = new Map<string, Scan>();
    for (const s of projectScans) {
      if (!latestByProject.has(s.project_id)) latestByProject.set(s.project_id, s);
    }

    for (const scan of latestByProject.values()) {
      const findings = scan.findings_json || [];
      for (const f of findings) {
        if (f.wcag_criteria && f.wcag_criteria !== 'N/A') {
          for (const c of f.wcag_criteria.split(',')) {
            const trimmed = c.trim();
            if (trimmed) {
              if (!criteriaMap.has(trimmed)) {
                criteriaMap.set(trimmed, { criteria: trimmed, pass: true, automated: true });
              }
              criteriaMap.get(trimmed)!.pass = false;
            }
          }
        }
      }
    }

    // From manual checklist
    for (const m of projectManualItems) {
      const existing = criteriaMap.get(m.criterion_id);
      if (existing) {
        existing.manual = m;
        if (m.status === 'fail') existing.pass = false;
      } else {
        criteriaMap.set(m.criterion_id, {
          criteria: m.criterion_id,
          pass: m.status !== 'fail',
          automated: false,
          manual: m,
        });
      }
    }

    // Add all manual checklist criteria that haven't been tested
    for (const c of MANUAL_CHECKLIST) {
      if (!criteriaMap.has(c.id)) {
        criteriaMap.set(c.id, { criteria: c.id, pass: false, automated: false });
      }
    }

    return Array.from(criteriaMap.values()).sort((a, b) => a.criteria.localeCompare(b.criteria));
  }, [projectScans, projectManualItems]);

  const summary = useMemo(() => {
    const total = criteriaResults.length;
    const passed = criteriaResults.filter((c) => c.pass && (c.automated || c.manual?.status === 'pass')).length;
    const failed = criteriaResults.filter((c) => !c.pass).length;
    const untested = criteriaResults.filter((c) => !c.automated && !c.manual).length;
    return { total, passed, failed, untested };
  }, [criteriaResults]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name || 'All Projects';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Compliance Reports</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            WCAG 2.2 Level AA conformance status across automated and manual checks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="input-field w-auto"
            aria-label="Select project"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={() => window.print()} className="btn-secondary" aria-label="Print report">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Automated-only disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Automated checks cover only ~30-40% of WCAG 2.2 AA criteria
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400/80 mt-0.5">
            This report combines automated axe-core results with manual testing checklist results. Criteria marked as
            "Untested" require manual verification. A passing automated score does not equal full WCAG conformance.
          </p>
        </div>
      </div>

      {projectScans.length === 0 && projectManualItems.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FileCheck2 className="w-6 h-6" />}
            title="No compliance data yet"
            description="Run scans and complete the manual testing checklist to generate a compliance report."
          />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-5">
              <p className="text-sm text-slate-500">Total Criteria</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{summary.total}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-500">Passing</p>
              <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{summary.passed}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-500">Failing</p>
              <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{summary.failed}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-slate-500">Untested</p>
              <p className="mt-1 text-2xl font-bold text-slate-400">{summary.untested}</p>
            </div>
          </div>

          {/* Criteria table */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                WCAG 2.2 AA Criteria Breakdown — {selectedProject === 'all' ? 'All Projects' : projectName(selectedProject)}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Criterion</th>
                    <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Method</th>
                    <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Last Tested</th>
                  </tr>
                </thead>
                <tbody>
                  {criteriaResults.map((c) => {
                    const checklistItem = MANUAL_CHECKLIST.find((m) => m.id === c.criteria);
                    const status = c.pass
                      ? (c.manual?.status === 'pass' || (c.automated && !c.manual) ? 'pass' : 'untested')
                      : c.manual?.status === 'fail' || !c.pass ? 'fail' : 'untested';

                    return (
                      <tr key={c.criteria} className="border-t border-slate-100 dark:border-slate-800/50">
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-medium text-slate-900 dark:text-white">{c.criteria}</span>
                            {checklistItem && (
                              <span className="text-slate-500 dark:text-slate-400 ml-2">{checklistItem.title}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {status === 'pass' ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Pass
                            </Badge>
                          ) : status === 'fail' ? (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                              <XCircle className="w-3 h-3 mr-1" /> Fail
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              <MinusCircle className="w-3 h-3 mr-1" /> Untested
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {c.automated && c.manual ? 'Automated + Manual' : c.automated ? 'Automated' : c.manual ? 'Manual' : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {c.manual?.tested_at ? formatDate(c.manual.tested_at) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-project scores */}
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Per-Project Compliance Scores</h3>
            <div className="space-y-3">
              {(selectedProject === 'all' ? projects : projects.filter((p) => p.id === selectedProject)).map((p) => {
                const latestScan = scans.find((s) => s.project_id === p.id);
                const projManual = manualItems.filter((m) => m.project_id === p.id);
                const manualPass = projManual.filter((m) => m.status === 'pass').length;
                const manualFail = projManual.filter((m) => m.status === 'fail').length;
                const score = latestScan?.overall_score ?? 100;

                return (
                  <div key={p.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                    <div className="flex items-center gap-4">
                      <ScoreRing score={score} size={48} />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {latestScan?.total_violations || 0} automated violations
                          {manualPass > 0 && `, ${manualPass} manual passes`}
                          {manualFail > 0 && `, ${manualFail} manual failures`}
                        </p>
                      </div>
                    </div>
                    <Badge className={score >= 90 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : score >= 70 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}>
                      {score >= 90 ? 'Compliant' : score >= 70 ? 'At Risk' : 'Non-Compliant'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
