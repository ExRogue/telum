'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Newspaper,
  FileText,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
} from 'lucide-react';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  tags: string;
  published_at: string;
}

interface GeneratedContent {
  id: string;
  title: string;
  content_type: string;
  compliance_status: string;
  compliance_score: number;
  created_at: string;
}

/* ---------- mini bar chart (pure CSS, no deps) ---------- */
function MiniBarChart({ data, label }: { data: number[]; label: string }) {
  const max = Math.max(...data, 1);
  return (
    <div>
      <div className="flex items-end gap-1.5 h-28">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-sm bg-gradient-to-t from-[var(--accent)] to-[var(--purple)] transition-all duration-500 min-h-[2px]"
              style={{ height: `${(v / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span key={d} className="flex-1 text-center text-[10px] text-[var(--text-secondary)]">
            {d}
          </span>
        ))}
      </div>
      <p className="text-xs text-[var(--text-secondary)] mt-2 text-center">{label}</p>
    </div>
  );
}

/* ---------- donut chart (SVG) ---------- */
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width="100" height="100" viewBox="0 0 100 100" className="flex-shrink-0">
        {segments.map((seg, i) => {
          const pct = seg.value / total;
          const offset = circumference * (1 - pct);
          const rotation = cumulative * 360 - 90;
          cumulative += pct;
          return (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth="10"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={offset}
              transform={`rotate(${rotation} 50 50)`}
              className="transition-all duration-500"
            />
          );
        })}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="fill-[var(--text-primary)] text-lg font-bold">
          {total}
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-[var(--text-secondary)]">{seg.label}</span>
            <span className="text-xs font-medium text-[var(--text-primary)] ml-auto">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- compliance gauge ---------- */
function ComplianceGauge({ score }: { score: number }) {
  const radius = 42;
  const circumference = Math.PI * radius; // half-circle
  const filled = (score / 100) * circumference;
  const color = score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--error)';

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 70" className="overflow-visible">
        <path
          d="M 10 60 A 42 42 0 0 1 110 60"
          fill="none"
          stroke="var(--border)"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M 10 60 A 42 42 0 0 1 110 60"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - filled}
          className="transition-all duration-700"
        />
        <text x="60" y="55" textAnchor="middle" className="fill-[var(--text-primary)] text-xl font-bold">
          {score}%
        </text>
      </svg>
      <p className="text-xs text-[var(--text-secondary)] mt-1">Avg. compliance score</p>
    </div>
  );
}

export default function DashboardPage() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [content, setContent] = useState<GeneratedContent[]>([]);
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => d.user && setUser(d.user));
    fetch('/api/news?limit=5').then(r => r.json()).then(d => setNews(d.articles || []));
    fetch('/api/generate?limit=5').then(r => r.json()).then(d => setContent(d.content || []));
  }, []);

  /* Compute analytics from real data */
  const compliancePassed = content.filter(c => c.compliance_status === 'passed').length;
  const complianceWarning = content.filter(c => c.compliance_status === 'warning').length;
  const complianceFailed = content.filter(c => c.compliance_status === 'failed').length;
  const avgCompliance = content.length
    ? Math.round(content.reduce((s, c) => s + (c.compliance_score || 0), 0) / content.length)
    : 0;

  // Content type breakdown
  const typeCounts: Record<string, number> = {};
  content.forEach(c => { typeCounts[c.content_type] = (typeCounts[c.content_type] || 0) + 1; });
  const typeColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];
  const typeSegments = Object.entries(typeCounts).map(([label, value], i) => ({
    label: label.charAt(0).toUpperCase() + label.slice(1),
    value,
    color: typeColors[i % typeColors.length],
  }));

  // Weekly activity (group by day of week from recent content + news)
  const weeklyActivity = [0, 0, 0, 0, 0, 0, 0];
  [...content, ...news].forEach(item => {
    const d = new Date('created_at' in item ? item.created_at : item.published_at);
    if (!isNaN(d.getTime())) {
      const day = (d.getDay() + 6) % 7; // Mon=0
      weeklyActivity[day]++;
    }
  });

  const stats = [
    { label: 'News Articles', value: news.length, icon: Newspaper, color: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]/10' },
    { label: 'Content Generated', value: content.length, icon: FileText, color: 'text-[var(--purple)]', bg: 'bg-[var(--purple)]/10' },
    { label: 'Compliance Pass', value: compliancePassed, icon: CheckCircle, color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10' },
    { label: 'Needs Review', value: complianceWarning, icon: AlertTriangle, color: 'text-[var(--warning)]', bg: 'bg-[var(--warning)]/10' },
  ];

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {user ? `Welcome back, ${user.name.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Your insurance content command centre
        </p>
      </div>

      {/* Quick action */}
      <div className="bg-gradient-to-r from-[var(--accent)]/10 to-[var(--purple)]/10 border border-[var(--accent)]/20 rounded-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--accent)]/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Ready to generate content?</h3>
            <p className="text-sm text-[var(--text-secondary)]">Select news articles and transform them into branded content</p>
          </div>
        </div>
        <Link href="/pipeline">
          <Button>
            Open Pipeline <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <TrendingUp className="w-4 h-4 text-[var(--success)]" />
            </div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</p>
            <p className="text-sm text-[var(--text-secondary)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Analytics row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Weekly Activity */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="font-semibold text-[var(--text-primary)]">Weekly Activity</h3>
          </div>
          <MiniBarChart data={weeklyActivity} label="Items created this week" />
        </div>

        {/* Content Breakdown */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-[var(--purple)]" />
            <h3 className="font-semibold text-[var(--text-primary)]">Content Types</h3>
          </div>
          {typeSegments.length > 0 ? (
            <DonutChart segments={typeSegments} />
          ) : (
            <div className="h-28 flex items-center justify-center text-sm text-[var(--text-secondary)]">
              No content yet — create your first piece
            </div>
          )}
        </div>

        {/* Compliance Gauge */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[var(--success)]" />
            <h3 className="font-semibold text-[var(--text-primary)]">Compliance Overview</h3>
          </div>
          {content.length > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <ComplianceGauge score={avgCompliance} />
              <div className="flex gap-4 text-xs mt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
                  <span className="text-[var(--text-secondary)]">Passed {compliancePassed}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                  <span className="text-[var(--text-secondary)]">Warning {complianceWarning}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--error)]" />
                  <span className="text-[var(--text-secondary)]">Failed {complianceFailed}</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="h-28 flex items-center justify-center text-sm text-[var(--text-secondary)]">
              Generate content to see compliance data
            </div>
          )}
        </div>
      </div>

      {/* Two columns: news + content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Latest news */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-[var(--accent)]" />
              Latest News
            </h2>
            <Link href="/news" className="text-sm text-[var(--accent)] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {news.length === 0 ? (
              <div className="p-5 text-center text-sm text-[var(--text-secondary)]">
                No news articles yet. Visit the Pipeline to fetch news.
              </div>
            ) : (
              news.map((article) => {
                const tags = JSON.parse(article.tags || '[]');
                return (
                  <div key={article.id} className="p-4 hover:bg-[var(--navy-lighter)] transition-colors">
                    <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 mb-1">
                      {article.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-[var(--text-secondary)]">{article.source}</span>
                      <span className="text-xs text-[var(--text-secondary)]">·</span>
                      <Clock className="w-3 h-3 text-[var(--text-secondary)]" />
                      <span className="text-xs text-[var(--text-secondary)]">{formatTime(article.published_at)}</span>
                      {tags.slice(0, 2).map((tag: string) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent content */}
        <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[var(--purple)]" />
              Recent Content
            </h2>
            <Link href="/content" className="text-sm text-[var(--accent)] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {content.length === 0 ? (
              <div className="p-5 text-center text-sm text-[var(--text-secondary)]">
                No content generated yet. Use the Pipeline to create your first piece.
              </div>
            ) : (
              content.map((item) => (
                <div key={item.id} className="p-4 hover:bg-[var(--navy-lighter)] transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
                      {item.title}
                    </h3>
                    <Badge
                      variant={item.compliance_status === 'passed' ? 'success' : item.compliance_status === 'warning' ? 'warning' : 'error'}
                    >
                      {item.compliance_score}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="purple">{item.content_type}</Badge>
                    <span className="text-xs text-[var(--text-secondary)]">{formatTime(item.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
