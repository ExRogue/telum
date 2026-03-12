'use client';
import { useEffect, useState } from 'react';
import {
  Settings,
  Building2,
  Palette,
  Shield,
  Save,
  CheckCircle,
  AlertCircle,
  User,
  LogOut,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';

interface Company {
  id: string;
  name: string;
  type: string;
  niche: string;
  description: string;
  brand_voice: string;
  brand_tone: string;
  compliance_frameworks: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
}

const COMPANY_TYPES = [
  { value: 'mga', label: 'Managing General Agent (MGA)' },
  { value: 'insurtech', label: 'Insurtech' },
  { value: 'broker', label: 'Insurance Broker' },
];

const BRAND_VOICES = [
  { value: 'professional', label: 'Professional', desc: 'Authoritative, polished, business-focused' },
  { value: 'approachable', label: 'Approachable', desc: 'Friendly, conversational, accessible' },
  { value: 'thought_leader', label: 'Thought Leader', desc: 'Insightful, forward-looking, expert' },
  { value: 'technical', label: 'Technical', desc: 'Precise, data-driven, analytical' },
];

const COMPLIANCE_OPTIONS = [
  { id: 'FCA', label: 'FCA', desc: 'Financial Conduct Authority (UK)' },
  { id: 'GDPR', label: 'GDPR', desc: 'General Data Protection Regulation (EU/UK)' },
  { id: 'State DOI', label: 'State DOI', desc: 'State Department of Insurance (US)' },
  { id: 'FTC', label: 'FTC', desc: 'Federal Trade Commission (US)' },
];

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Company fields
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('mga');
  const [niche, setNiche] = useState('');
  const [description, setDescription] = useState('');
  const [brandVoice, setBrandVoice] = useState('professional');
  const [brandTone, setBrandTone] = useState('');
  const [complianceFrameworks, setComplianceFrameworks] = useState<string[]>(['FCA']);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/company').then((r) => r.json()),
    ])
      .then(([authData, companyData]) => {
        if (authData.user) setUser(authData.user);
        if (companyData.company) {
          const c = companyData.company;
          setCompanyName(c.name || '');
          setCompanyType(c.type || 'mga');
          setNiche(c.niche || '');
          setDescription(c.description || '');
          setBrandVoice(c.brand_voice || 'professional');
          setBrandTone(c.brand_tone || '');
          try {
            setComplianceFrameworks(JSON.parse(c.compliance_frameworks || '["FCA"]'));
          } catch {
            setComplianceFrameworks(['FCA']);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName,
          type: companyType,
          niche,
          description,
          brand_voice: brandVoice,
          brand_tone: brandTone,
          compliance_frameworks: complianceFrameworks,
        }),
      });
      if (res.ok) {
        setSaveStatus('success');
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const toggleFramework = (id: string) => {
    setComplianceFrameworks((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Configure your company profile, brand voice, and compliance rules
          </p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Save status toast */}
      {saveStatus !== 'idle' && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${
            saveStatus === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}
        >
          {saveStatus === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {saveStatus === 'success' ? 'Settings saved successfully' : 'Failed to save settings. Please try again.'}
          </p>
        </div>
      )}

      {/* Account section */}
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-3 p-5 border-b border-[var(--border)]">
          <User className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">Account</h2>
        </div>
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--purple)] flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">{user?.name || 'Unknown'}</p>
                <p className="text-sm text-[var(--text-secondary)]">{user?.email || ''}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign out
            </Button>
          </div>
        </div>
      </div>

      {/* Company profile section */}
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-3 p-5 border-b border-[var(--border)]">
          <Building2 className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">Company Profile</h2>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid sm:grid-cols-2 gap-5">
            <Input
              id="companyName"
              label="Company name"
              placeholder="Acme Insurance"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Company type
              </label>
              <select
                value={companyType}
                onChange={(e) => setCompanyType(e.target.value)}
                className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
              >
                {COMPANY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            id="niche"
            label="Market niche"
            placeholder="e.g. Specialty lines, Cyber insurance, Commercial property"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Company description
            </label>
            <textarea
              placeholder="Brief description of your company, target market, and key differentiators..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
            />
          </div>
        </div>
      </div>

      {/* Brand voice section */}
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-3 p-5 border-b border-[var(--border)]">
          <Palette className="w-5 h-5 text-[var(--purple)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">Brand Voice</h2>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">
              Voice style
            </label>
            <div className="grid sm:grid-cols-2 gap-3">
              {BRAND_VOICES.map((voice) => (
                <button
                  key={voice.value}
                  onClick={() => setBrandVoice(voice.value)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    brandVoice === voice.value
                      ? 'bg-[var(--accent)]/10 border-[var(--accent)]/30 ring-1 ring-[var(--accent)]/20'
                      : 'bg-[var(--navy)] border-[var(--border)] hover:border-[var(--accent)]/20'
                  }`}
                >
                  <p className={`text-sm font-semibold ${brandVoice === voice.value ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
                    {voice.label}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">{voice.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Custom tone notes
            </label>
            <textarea
              placeholder="Any additional instructions for content tone, e.g. 'Avoid jargon', 'Use UK English', 'Include data points where possible'..."
              value={brandTone}
              onChange={(e) => setBrandTone(e.target.value)}
              rows={2}
              className="w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none"
            />
          </div>
        </div>
      </div>

      {/* Compliance section */}
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl">
        <div className="flex items-center gap-3 p-5 border-b border-[var(--border)]">
          <Shield className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold text-[var(--text-primary)]">Compliance Frameworks</h2>
        </div>
        <div className="p-5">
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Select the regulatory frameworks that apply to your business. Generated content will be automatically checked against these rules.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {COMPLIANCE_OPTIONS.map((framework) => {
              const active = complianceFrameworks.includes(framework.id);
              return (
                <button
                  key={framework.id}
                  onClick={() => toggleFramework(framework.id)}
                  className={`flex items-center gap-3 text-left p-4 rounded-xl border transition-all ${
                    active
                      ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/20'
                      : 'bg-[var(--navy)] border-[var(--border)] hover:border-emerald-500/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      active ? 'bg-emerald-500 border-emerald-500' : 'border-[var(--border)]'
                    }`}
                  >
                    {active && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${active ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>
                      {framework.label}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{framework.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {complianceFrameworks.length === 0 && (
            <p className="text-xs text-amber-400 mt-3 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              Select at least one compliance framework for content checking.
            </p>
          )}
        </div>
      </div>

      {/* Bottom save bar */}
      <div className="flex items-center justify-between bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-sm text-[var(--text-secondary)]">
            {complianceFrameworks.length} framework{complianceFrameworks.length !== 1 ? 's' : ''} active
          </span>
          <span className="text-[var(--text-secondary)]">·</span>
          <Badge variant="purple">{BRAND_VOICES.find((v) => v.value === brandVoice)?.label || brandVoice}</Badge>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
