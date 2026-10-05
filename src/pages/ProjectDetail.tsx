import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  FileText,
  Trash2,
  Play,
  Flag,
  ScanLine,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Code2,
  Layout,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Modal, Spinner, EmptyState, ScoreRing, Badge } from '@/components/ui';
import { runAxeScan } from '@/lib/scanner';
import { DEMO_PAGES, getDemoPage } from '@/lib/demoPages';
import type { Project, Page, Scan, FindingData, Impact } from '@/lib/types';
import { cn, timeAgo, formatDate } from '@/lib/utils';
import { IMPACT_BG } from '@/lib/types';

type Tab = 'pages' | 'scans';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { session } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pages');
  const [showAddPage, setShowAddPage] = useState(false);
  const [scanningPageId, setScanningPageId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Add page form state
  const [pageName, setPageName] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [pageSource, setPageSource] = useState<'demo' | 'html'>('demo');
  const [demoPageId, setDemoPageId] = useState(DEMO_PAGES[0].id);
  const [htmlContent, setHtmlContent] = useState('');

  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    const { data: proj } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();
    setProject(proj as Project | null);

    const { data: pageData } = await supabase
      .from('pages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    setPages(pageData as Page[] || []);

    const { data: scanData } = await supabase
      .from('scans')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    setScans(scanData as Scan[] || []);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleAddPage = async () => {
    if (!projectId || !pageName.trim()) return;
    const demoPage = pageSource === 'demo' ? getDemoPage(demoPageId) : null;
    const { data, error } = await supabase
      .from('pages')
      .insert({
        project_id: projectId,
        name: pageName.trim(),
        url: pageUrl.trim(),
        html_content: pageSource === 'html' ? htmlContent : (demoPage?.html || ''),
        demo_page_id: pageSource === 'demo' ? demoPageId : '',
      })
      .select()
      .single();

    if (!error && data) {
      setShowAddPage(false);
      setPageName('');
      setPageUrl('');
      setHtmlContent('');
      await fetchProject();
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Delete this page and all its scans?')) return;
    await supabase.from('pages').delete().eq('id', id);
    await fetchProject();
  };

  const handleScan = async (page: Page) => {
    if (!projectId || !session?.user?.id) return;
    setScanningPageId(page.id);
    setScanError(null);

    try {
      let htmlToScan = page.html_content;
      if (page.demo_page_id) {
        const demo = getDemoPage(page.demo_page_id);
        if (demo) htmlToScan = demo.html;
      }

      if (!htmlToScan.trim()) {
        setScanError('This page has no HTML content to scan. Add HTML or select a demo page.');
        setScanningPageId(null);
        return;
      }

      const result = await runAxeScan(htmlToScan);

      const { data: scanData, error: scanError } = await supabase
        .from('scans')
        .insert({
          page_id: page.id,
          project_id: projectId,
          status: 'completed',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          total_violations: result.total,
          critical_count: result.byImpact.critical,
          serious_count: result.byImpact.serious,
          moderate_count: result.byImpact.moderate,
          minor_count: result.byImpact.minor,
          passes_count: result.passes,
          incomplete_count: result.incomplete,
          overall_score: result.overallScore,
          is_baseline: false,
          findings_json: result.findings,
        })
        .select()
        .single();

      if (scanError) throw scanError;

      // Insert findings as individual rows
      if (scanData && result.findings.length > 0) {
        const findingsRows = result.findings.map((f) => ({
          scan_id: scanData.id,
          page_id: page.id,
          project_id: projectId,
          ...f,
        }));
        await supabase.from('findings').insert(findingsRows);
      }

      await fetchProject();
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'Scan failed unexpectedly');
    } finally {
      setScanningPageId(null);
    }
  };

  const handleSetBaseline = async (scanId: string, pageId: string) => {
    // Unset previous baseline for this page
    await supabase
      .from('scans')
      .update({ is_baseline: false })
      .eq('page_id', pageId);

    // Set new baseline
    await supabase
      .from('scans')
      .update({ is_baseline: true })
      .eq('id', scanId);

    // Update page's baseline_scan_id
    await supabase
      .from('pages')
      .update({ baseline_scan_id: scanId })
      .eq('id', pageId);

    await fetchProject();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-500">Project not found.</p>
        <Link to="/projects" className="mt-4 inline-flex btn-primary">
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Link to="/projects" className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: project.color }}
          >
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{project.name}</h1>
            {project.description && (
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{project.description}</p>
            )}
          </div>
        </div>
        <Button onClick={() => setShowAddPage(true)}>
          <Plus className="w-4 h-4" /> Add Page
        </Button>
      </div>

      {scanError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{scanError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
        <TabButton active={tab === 'pages'} onClick={() => setTab('pages')}>
          <FileText className="w-4 h-4" /> Pages ({pages.length})
        </TabButton>
        <TabButton active={tab === 'scans'} onClick={() => setTab('scans')}>
          <ScanLine className="w-4 h-4" /> Scans ({scans.length})
        </TabButton>
      </div>

      {tab === 'pages' && (
        <div className="space-y-3">
          {pages.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<FileText className="w-6 h-6" />}
                title="No pages yet"
                description="Add a page to scan — choose a built-in demo page with seeded defects, or paste your own HTML."
                action={
                  <Button onClick={() => setShowAddPage(true)}>
                    <Plus className="w-4 h-4" /> Add your first page
                  </Button>
                }
              />
            </div>
          ) : (
            pages.map((page) => {
              const pageScans = scans.filter((s) => s.page_id === page.id);
              const latestScan = pageScans[0];
              const baselineScan = pageScans.find((s) => s.is_baseline);
              const isScanning = scanningPageId === page.id;

              return (
                <div key={page.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                        {page.demo_page_id ? <Layout className="w-5 h-5" /> : <Code2 className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{page.name}</h3>
                        {page.url && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{page.url}</p>
                        )}
                        {page.demo_page_id && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            Demo: {getDemoPage(page.demo_page_id)?.name || page.demo_page_id}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span>{pageScans.length} scans</span>
                          {baselineScan && (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                              <Flag className="w-3 h-3 mr-1" /> Baseline set
                            </Badge>
                          )}
                          {latestScan && (
                            <span>Last: {timeAgo(latestScan.created_at)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {latestScan && <ScoreRing score={latestScan.overall_score} size={48} />}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleScan(page)}
                        disabled={isScanning}
                      >
                        {isScanning ? (
                          <><Spinner className="w-3.5 h-3.5" /> Scanning...</>
                        ) : (
                          <><Play className="w-3.5 h-3.5" /> Run Scan</>
                        )}
                      </Button>
                      <button
                        onClick={() => handleDeletePage(page.id)}
                        className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        aria-label={`Delete page ${page.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Recent scans for this page */}
                  {pageScans.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="space-y-2">
                        {pageScans.slice(0, 4).map((scan) => (
                          <div key={scan.id} className="flex items-center justify-between text-sm">
                            <Link
                              to={`/projects/${projectId}/scans/${scan.id}`}
                              className="flex items-center gap-3 hover:text-primary-600 dark:hover:text-primary-400 transition-colors min-w-0 flex-1"
                            >
                              <ScoreRing score={scan.overall_score} size={28} />
                              <span className="text-slate-700 dark:text-slate-300">
                                {scan.total_violations} violations
                              </span>
                              <span className="text-xs text-slate-400">{timeAgo(scan.created_at)}</span>
                              {scan.is_baseline && (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                                  Baseline
                                </Badge>
                              )}
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            </Link>
                            {!scan.is_baseline && (
                              <button
                                onClick={() => handleSetBaseline(scan.id, page.id)}
                                className="text-xs text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 px-2 py-1 rounded transition-colors"
                                title="Set as baseline for regression comparison"
                              >
                                Set baseline
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'scans' && (
        <div className="space-y-3">
          {scans.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<ScanLine className="w-6 h-6" />}
                title="No scans yet"
                description="Run a scan on any page to see results here."
              />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Score</th>
                    <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Violations</th>
                    <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">By Severity</th>
                    <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Baseline</th>
                    <th className="px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => {
                    const page = pages.find((p) => p.id === scan.page_id);
                    return (
                      <tr key={scan.id} className="border-t border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3"><ScoreRing score={scan.overall_score} size={36} /></td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          {scan.total_violations}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {scan.critical_count > 0 && <Badge className={IMPACT_BG.critical}>C:{scan.critical_count}</Badge>}
                            {scan.serious_count > 0 && <Badge className={IMPACT_BG.serious}>S:{scan.serious_count}</Badge>}
                            {scan.moderate_count > 0 && <Badge className={IMPACT_BG.moderate}>M:{scan.moderate_count}</Badge>}
                            {scan.minor_count > 0 && <Badge className={IMPACT_BG.minor}>m:{scan.minor_count}</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {scan.is_baseline ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Yes
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {formatDate(scan.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/projects/${projectId}/scans/${scan.id}`}
                            className="text-primary-600 dark:text-primary-400 hover:underline"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Page Modal */}
      <Modal
        open={showAddPage}
        onClose={() => setShowAddPage(false)}
        title="Add Page"
        description="Choose a built-in demo page or paste your own HTML to scan"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="page-name" className="label-text">Page name</label>
            <input
              id="page-name"
              type="text"
              value={pageName}
              onChange={(e) => setPageName(e.target.value)}
              className="input-field"
              placeholder="e.g. Homepage, Login Form, Product Page"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="page-url" className="label-text">URL (optional, for reference)</label>
            <input
              id="page-url"
              type="text"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              className="input-field"
              placeholder="https://example.com/page"
            />
          </div>

          <div>
            <span className="label-text">Content source</span>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setPageSource('demo')}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pageSource === 'demo'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-transparent'
                )}
              >
                <Layout className="w-4 h-4" /> Demo Pages
              </button>
              <button
                onClick={() => setPageSource('html')}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pageSource === 'html'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-transparent'
                )}
              >
                <Code2 className="w-4 h-4" /> Custom HTML
              </button>
            </div>

            {pageSource === 'demo' ? (
              <div className="space-y-2">
                {DEMO_PAGES.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => setDemoPageId(demo.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-all',
                      demoPageId === demo.id
                        ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{demo.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{demo.description}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <label htmlFor="html-content" className="label-text">HTML content</label>
                <textarea
                  id="html-content"
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="input-field font-mono text-xs resize-none"
                  rows={10}
                  placeholder="<!doctype html>..."
                />
                <p className="mt-1 text-xs text-slate-400">
                  Paste a full HTML document. It will be rendered in a sandboxed iframe and scanned with axe-core.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowAddPage(false)}>Cancel</Button>
            <Button onClick={handleAddPage} disabled={!pageName.trim()}>
              Add Page
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
        active
          ? 'border-primary-600 text-primary-600 dark:text-primary-400'
          : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
      )}
    >
      {children}
    </button>
  );
}
