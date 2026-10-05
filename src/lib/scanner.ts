import axe from 'axe-core';
import type { FindingData, Impact, RegressionDiff } from './types';

// ============================================================
// axe-core scanning engine — runs real WCAG checks in the browser
// ============================================================

function buildFingerprint(ruleId: string, targetSelector: string): string {
  return `${ruleId}::${targetSelector}`;
}

function extractWcagTags(tags: string[]): string {
  const wcagTags = tags.filter((t) => t.startsWith('wcag'));
  return wcagTags.join(', ') || 'N/A';
}

function safeSelector(target: any): string {
  if (!Array.isArray(target) || target.length === 0) return 'unknown';
  const first = Array.isArray(target[0]) ? target[0] : target;
  return first.join(' > ');
}

export interface ScanResult {
  findings: FindingData[];
  total: number;
  byImpact: Record<Impact, number>;
  passes: number;
  incomplete: number;
  overallScore: number;
}

export async function runAxeScan(html: string): Promise<ScanResult> {
  // Render HTML into a sandboxed iframe so axe-core can analyze a real DOM
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '1024px';
    iframe.style.height = '768px';
    iframe.setAttribute('sandbox', 'allow-same-origin');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.setAttribute('title', 'Accessibility scan target');

    document.body.appendChild(iframe);

    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };

    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) {
          cleanup();
          reject(new Error('Unable to access iframe document'));
          return;
        }

        // Run axe-core against the iframe document
        axe.run(
          doc,
          {
            runOnly: {
              type: 'tag',
              values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
            },
            resultTypes: ['violations', 'passes', 'incomplete'],
          },
          (err, results) => {
            cleanup();
            if (err) {
              reject(err);
              return;
            }

            const findings: FindingData[] = [];
            const violations = results.violations || [];

            for (const v of violations) {
              const wcagCriteria = extractWcagTags(v.tags || []);
              for (const node of v.nodes || []) {
                const selector = safeSelector(node.target);
                const htmlSnippet = node.html || '';
                const failureSummary = node.failureSummary || v.description || '';
                findings.push({
                  rule_id: v.id,
                  rule_description: v.description || v.help || v.id,
                  impact: (v.impact || 'moderate') as Impact,
                  wcag_criteria: wcagCriteria,
                  target_selector: selector,
                  html_snippet: htmlSnippet,
                  failure_summary: failureSummary,
                  help_url: v.helpUrl || '',
                  fingerprint: buildFingerprint(v.id, selector),
                });
              }
            }

            const byImpact: Record<Impact, number> = {
              critical: 0,
              serious: 0,
              moderate: 0,
              minor: 0,
            };

            for (const f of findings) {
              byImpact[f.impact]++;
            }

            const total = findings.length;
            const penalty = findings.reduce((sum, f) => {
              switch (f.impact) {
                case 'critical': return sum + 20;
                case 'serious': return sum + 10;
                case 'moderate': return sum + 5;
                case 'minor': return sum + 2;
                default: return sum;
              }
            }, 0);
            const overallScore = Math.max(0, 100 - penalty);

            resolve({
              findings,
              total,
              byImpact,
              passes: results.passes?.length || 0,
              incomplete: results.incomplete?.length || 0,
              overallScore,
            });
          }
        );
      } catch (e) {
        cleanup();
        reject(e);
      }
    };

    iframe.onerror = () => {
      cleanup();
      reject(new Error('iframe failed to load'));
    };

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      } else {
        // Fallback: srcdoc
        iframe.srcdoc = html;
      }
    } catch {
      iframe.srcdoc = html;
    }
  });
}

// ============================================================
// Regression detection — compare two scans by fingerprint
// ============================================================

export function compareScans(
  baseline: FindingData[],
  current: FindingData[]
): RegressionDiff {
  const baselineMap = new Map(baseline.map((f) => [f.fingerprint, f]));
  const currentMap = new Map(current.map((f) => [f.fingerprint, f]));

  const newFindings: FindingData[] = [];
  const resolvedFindings: FindingData[] = [];
  const unchangedFindings: FindingData[] = [];

  for (const f of current) {
    if (baselineMap.has(f.fingerprint)) {
      unchangedFindings.push(f);
    } else {
      newFindings.push(f);
    }
  }

  for (const f of baseline) {
    if (!currentMap.has(f.fingerprint)) {
      resolvedFindings.push(f);
    }
  }

  // Recurring = was in baseline, still in current, same fingerprint
  const recurringFindings = unchangedFindings;

  return {
    newFindings,
    resolvedFindings,
    unchangedFindings,
    recurringFindings,
    totalChanges: newFindings.length + resolvedFindings.length,
  };
}
