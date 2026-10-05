import { useState } from 'react';
import { User as UserIcon, Mail, Shield, Save, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button, Spinner, Badge } from '@/components/ui';
import { ROLE_LABELS, type UserRole } from '@/lib/types';
import { cn, initials } from '@/lib/utils';

export function SettingsPage() {
  const { member, session, refreshMember } = useAuth();
  const [fullName, setFullName] = useState(member?.full_name || '');
  const [role, setRole] = useState<UserRole>(member?.role || 'frontend_engineer');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!member || !session?.user?.id) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error } = await supabase
      .from('team_members')
      .update({ full_name: fullName, role })
      .eq('id', member.id);

    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
      await refreshMember();
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  if (!member) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage your profile and role assignment
        </p>
      </div>

      {/* Profile card */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Profile</h3>

        {/* Avatar display */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ backgroundColor: member.avatar_color }}
            aria-hidden="true"
          >
            {initials(fullName || '?')}
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{member.email}</p>
            <Badge className="bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 mt-1">
              {ROLE_LABELS[role]}
            </Badge>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="full-name" className="label-text">Full name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field pl-10"
                placeholder="Your name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email-readonly" className="label-text">Email (cannot change)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <input
                id="email-readonly"
                type="email"
                value={member.email}
                readOnly
                className="input-field pl-10 opacity-60 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label htmlFor="role-select" className="label-text">Role</label>
            <select
              id="role-select"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="input-field"
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving || !fullName.trim()}>
              {saving ? (
                <><Spinner className="w-4 h-4" /> Saving...</>
              ) : saved ? (
                <><Check className="w-4 h-4" /> Saved!</>
              ) : (
                <><Save className="w-4 h-4" /> Save Changes</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* WCAG target info */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" /> Compliance Target
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">WCAG 2.2 Level AA</p>
              <p className="text-xs text-slate-500 mt-0.5">The product's conformance objective</p>
            </div>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Active</Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            All automated scans use the WCAG 2.2 AA tag set from axe-core. The manual testing checklist
            covers criteria that automated tools cannot verify. Together they provide a complete
            conformance assessment.
          </p>
        </div>
      </div>

      {/* About */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">About Accessibility Regression Lab</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          A production-style platform for accessibility testing, regression detection, remediation tracking,
          and compliance reporting. Scans use axe-core to run real WCAG 2.2 AA checks in the browser.
          Baselines enable automatic regression detection, and release quality gates enforce accessibility
          criteria before shipping.
        </p>
      </div>
    </div>
  );
}
