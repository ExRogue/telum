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

export default function DashboardPage() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [content, setContent] = useState<GeneratedContent[]>([]);
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => d.user && setUser(d.user));
    fetch('/api/news?limit=5').then(r => r.json()).then(d => setNews(d.articles || []));
    fetch('/api/generate?limit=5').then(r => r.json()).then(d => setContent(d.content || []));
  }, []);

  const stats = [
    { label: 'News Articles', value: news.length, icon: Newspaper, color: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]/10' },
    { label: 'Content Generated', value: content.length, icon: FileText, color: 'text-[var(--purple)]', bg: 'bg-[var(--purple)]/10' },
    { label: 'Compliance Pass', value: content.filter(c => c.compliance_status === 'passed').length, icon: CheckCircle, color: 'text-[var(--success)]', bg: 'bg-[var(--success)]/10' },
    { label: 'Needs Review', value: content.filter(c => c.compliance_status === 'warning').length, icon: AlertTriangle, color: 'text-[var(--warning)]', bg: 'bg-[var(--warning)]/10' },
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

      {/* Two columns */}
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
