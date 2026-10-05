import { useEffect, useState, useMemo } from 'react';
import { ListChecks, ChevronDown, ChevronRight, Info, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner, EmptyState, Badge, Button } from '@/components/ui';
import type { Project, Page, ManualChecklistItem, ManualStatus } from '@/lib/types';
import { MANUAL_CHECKLIST } from '@/lib/manualChecklist';
import { MANUAL_STATUS_LABELS, MANUAL_STATUS_COLORS } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

const CATEGORIES = ['Perceivable', 'Operable', 'Understandable', 'Robust'];

export function ManualChecklistPage() {
  const { session, member } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [items, setItems] = useState<ManualChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data: projData } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      setProjects((projData as Project[]) || []);
      const { data: pageData } = await supabase.from('pages').select('*').order('created_at', { ascending: false });
      setPages((pageData as Page[]) || []);
      const { data: itemData } = await supabase.from('manual_checklist_items').select('*');
      setItems((itemData as ManualChecklistItem[]) || []);
      setLoading(false);
    })();
  }, [session?.user?.id]);

  const projectPages = useMemo(() => {
    if (!selectedProject) return [];
    return pages.filter((p) => p.project_id === selectedProject);
  }, [pages, selectedProject]);

  const relevantItems = useMemo(() => {
    return items.filter((i) => {
      if (i.project_id !== selectedProject) return false;
      if (selectedPage && i.page_id !== selectedPage) return false;
      return true;
    });
  }, [items, selectedProject, selectedPage]);

  const getItemForCriterion = (criterionId: string): ManualChecklistItem | null => {
    return relevantItems.find((i) => i.criterion_id === criterionId) || null;
  };

  const updateStatus = async (criterionId: string, criterionTitle: string, criterionCategory: string, status: ManualStatus) => {
    if (!selectedProject || !session?.user?.id || !member) return;
    const existing = getItemForCriterion(criterionId);

    if (existing) {
      const { data, error } = await supabase
        .from('manual_checklist_items')
        .update({
          status,
          reviewer_id: session.user.id,
          reviewer_name: member.full_name,
          tested_at: status === 'untested' ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
      if (!error && data) {
        setItems((prev) => prev.map((i) => (i.id === existing.id ? (data as ManualChecklistItem) : i)));
      }
    } else {
      const { data, error } = await supabase
        .from('manual_checklist_items')
        .insert({
          project_id: selectedProject,
          page_id: selectedPage || null,
          criterion_id: criterionId,
          criterion_title: criterionTitle,
          criterion_category: criterionCategory,
          status,
          reviewer_id: session.user.id,
          reviewer_name: member.full_name,
          tested_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (!error && data) {
        setItems((prev) => [...prev, data as ManualChecklistItem]);
      }
    }
  };

  const updateNotes = async (criterionId: string, notes: string) => {
    const existing = getItemForCriterion(criterionId);
    if (!existing) return;
    const { error } = await supabase
      .from('manual_checklist_items')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (!error) {
      setItems((prev) => prev.map((i) => (i.id === existing.id ? { ...i, notes } : i)));
    }
  };

  const toggleCriterion = (id: string) => {
    setExpandedCriteria((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const summary = useMemo(() => {
    const tested = relevantItems.filter((i) => i.status !== 'untested');
    const pass = tested.filter((i) => i.status === 'pass').length;
    const fail = tested.filter((i) => i.status === 'fail').length;
    const needsReview = tested.filter((i) => i.status === 'needs_review').length;
    return { total: MANUAL_CHECKLIST.length, tested: tested.length, pass, fail, needsReview };
  }, [relevantItems]);

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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manual Testing Checklist</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          WCAG 2.2 AA criteria that automated tools cannot fully verify — manual testing is required for complete conformance
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
            Why manual testing matters
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-400/80 mt-0.5">
            Automated tools like axe-core can detect approximately 30-40% of WCAG 2.2 AA issues. The criteria below
            require human judgment — for example, whether an image's alt text is meaningful, whether captions are
            accurate, or whether focus order is logical. Complete this checklist alongside automated scans for
            full conformance assessment.
          </p>
        </div>
      </div>

      {/* Project/page selectors */}
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div>
          <label htmlFor="proj-select" className="sr-only">Select project</label>
          <select
            id="proj-select"
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              setSelectedPage('');
            }}
            className="input-field w-auto"
          >
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {projectPages.length > 0 && (
          <div>
            <label htmlFor="page-select" className="sr-only">Select page</label>
            <select
              id="page-select"
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="input-field w-auto"
            >
              <option value="">All pages</option>
              {projectPages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!selectedProject ? (
        <div className="card">
          <EmptyState
            icon={<ListChecks className="w-6 h-6" />}
            title="Select a project to begin"
            description="Choose a project above to start working through the manual testing checklist."
          />
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-xs text-slate-500">Total Criteria</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900 dark:text-white">{summary.total}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500">Passing</p>
              <p className="mt-0.5 text-xl font-bold text-green-600 dark:text-green-400">{summary.pass}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500">Failing</p>
              <p className="mt-0.5 text-xl font-bold text-red-600 dark:text-red-400">{summary.fail}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500">Needs Review</p>
              <p className="mt-0.5 text-xl font-bold text-amber-600 dark:text-amber-400">{summary.needsReview}</p>
            </div>
          </div>

          {/* Checklist by category */}
          {CATEGORIES.map((category) => {
            const categoryItems = MANUAL_CHECKLIST.filter((c) => c.category === category);
            if (categoryItems.length === 0) return null;

            return (
              <div key={category} className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{category}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{categoryItems.length} criteria</p>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {categoryItems.map((criterion) => {
                    const item = getItemForCriterion(criterion.id);
                    const isExpanded = expandedCriteria.has(criterion.id);
                    const status = item?.status || 'untested';

                    return (
                      <div key={criterion.id}>
                        <button
                          onClick={() => toggleCriterion(criterion.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors text-left"
                          aria-expanded={isExpanded}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                <span className="text-slate-500 mr-2">{criterion.id}</span>
                                {criterion.title}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                {criterion.description}
                              </p>
                            </div>
                          </div>
                          <Badge className={cn(MANUAL_STATUS_COLORS[status], 'shrink-0')}>
                            {status === 'pass' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {status === 'fail' && <XCircle className="w-3 h-3 mr-1" />}
                            {status === 'needs_review' && <HelpCircle className="w-3 h-3 mr-1" />}
                            {MANUAL_STATUS_LABELS[status]}
                          </Badge>
                        </button>

                        {isExpanded && (
                          <div className="p-4 bg-slate-50 dark:bg-slate-800/20 space-y-4">
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-1">How to test</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">{criterion.howToTest}</p>
                            </div>

                            {/* Status buttons */}
                            <div>
                              <p className="text-xs font-medium text-slate-500 mb-2">Result</p>
                              <div className="flex gap-2 flex-wrap">
                                {(['pass', 'fail', 'needs_review', 'untested'] as ManualStatus[]).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => updateStatus(criterion.id, criterion.title, criterion.category, s)}
                                    className={cn(
                                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                                      status === s
                                        ? s === 'pass'
                                          ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-300 dark:border-green-700'
                                          : s === 'fail'
                                          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-700'
                                          : s === 'needs_review'
                                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                                        : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    )}
                                  >
                                    {MANUAL_STATUS_LABELS[s]}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Notes */}
                            <div>
                              <label htmlFor={`notes-${criterion.id}`} className="text-xs font-medium text-slate-500 mb-1 block">
                                Notes
                              </label>
                              <textarea
                                id={`notes-${criterion.id}`}
                                value={item?.notes || ''}
                                onChange={(e) => updateNotes(criterion.id, e.target.value)}
                                className="input-field text-sm resize-none"
                                rows={2}
                                placeholder="Add testing notes, observations, or screenshots references..."
                              />
                            </div>

                            {item?.reviewer_name && (
                              <p className="text-xs text-slate-400">
                                Tested by {item.reviewer_name} on {formatDate(item.tested_at)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
