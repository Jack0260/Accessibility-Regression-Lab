import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Plus, ArrowRight, FileText, ScanLine, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Modal, Spinner, EmptyState, ScoreRing } from '@/components/ui';
import type { Project, Scan } from '@/lib/types';
import { cn, timeAgo } from '@/lib/utils';

const PROJECT_COLORS = ['#2563eb', '#059669', '#dc2626', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04'];

export function ProjectsPage() {
  const { session } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [scanCounts, setScanCounts] = useState<Record<string, { count: number; latest: Scan | null; pageCount: number }>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    const { data: projData } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    setProjects(projData || []);

    const counts: Record<string, { count: number; latest: Scan | null; pageCount: number }> = {};
    for (const p of projData || []) {
      const { count } = await supabase
        .from('scans')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', p.id);
      const { data: latestScan } = await supabase
        .from('scans')
        .select('*')
        .eq('project_id', p.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const { count: pageCount } = await supabase
        .from('pages')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', p.id);
      counts[p.id] = { count: count || 0, latest: latestScan as Scan | null, pageCount: pageCount || 0 };
    }
    setScanCounts(counts);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [session?.user?.id]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        description: description.trim(),
        color,
        user_id: session?.user?.id,
      })
      .select()
      .single();

    if (!error && data) {
      setShowCreate(false);
      setName('');
      setDescription('');
      setColor(PROJECT_COLORS[0]);
      await fetchData();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project and all its pages, scans, and tickets? This cannot be undone.')) return;
    await supabase.from('projects').delete().eq('id', id);
    await fetchData();
  };

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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Projects</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage your accessibility testing projects and their pages
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FolderKanban className="w-6 h-6" />}
            title="No projects yet"
            description="Create a project to start scanning pages and tracking accessibility regressions over time."
            action={
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" /> Create your first project
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const info = scanCounts[p.id] || { count: 0, latest: null, pageCount: 0 };
            return (
              <div key={p.id} className="card p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: p.color }}
                  >
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                    aria-label={`Delete project ${p.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <Link to={`/projects/${p.id}`}>
                  <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {p.name}
                  </h3>
                </Link>
                {p.description && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                    {p.description}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {info.pageCount} pages
                    </span>
                    <span className="flex items-center gap-1">
                      <ScanLine className="w-3.5 h-3.5" />
                      {info.count} scans
                    </span>
                  </div>
                  {info.latest && <ScoreRing score={info.latest.overall_score} size={36} />}
                </div>
                {info.latest && (
                  <p className="mt-2 text-xs text-slate-400">Last scan {timeAgo(info.latest.created_at)}</p>
                )}
                <Link
                  to={`/projects/${p.id}`}
                  className="mt-3 flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:gap-2 transition-all"
                >
                  Open project <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create New Project"
        description="A project groups pages you want to scan for accessibility issues"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="proj-name" className="label-text">Project name</label>
            <input
              id="proj-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="e.g. Marketing Website"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="proj-desc" className="label-text">Description (optional)</label>
            <textarea
              id="proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="What is this project tracking?"
            />
          </div>
          <div>
            <span className="label-text">Project color</span>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-full ring-2 ring-offset-2 dark:ring-offset-slate-900 transition-all',
                    color === c ? 'ring-slate-400' : 'ring-transparent'
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                  aria-pressed={color === c}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              {creating ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
