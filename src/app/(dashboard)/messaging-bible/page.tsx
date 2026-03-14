'use client';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Building2,
  Users,
  Swords,
  LayoutGrid,
  Sparkles,
  Copy,
  Download,
  Check,
  Loader2,
  FileText,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import SimpleMarkdown from '@/components/SimpleMarkdown';

interface TargetAudience {
  name: string;
  role: string;
  painPoints: string;
}

interface Competitor {
  name: string;
  difference: string;
}

interface Department {
  name: string;
  focus: 'strategic' | 'operational';
}

const STEPS = [
  { label: 'Company', icon: Building2 },
  { label: 'Audience', icon: Users },
  { label: 'Competition', icon: Swords },
  { label: 'Departments', icon: LayoutGrid },
  { label: 'Generate', icon: Sparkles },
];

const COMPANY_TYPES = [
  { value: 'mga', label: 'MGA (Managing General Agent)' },
  { value: 'broker', label: 'Broker' },
  { value: 'carrier', label: 'Carrier / Insurer' },
  { value: 'insurtech', label: 'Insurtech' },
  { value: 'reinsurer', label: 'Reinsurer' },
  { value: 'tpa', label: 'Third Party Administrator' },
  { value: 'other', label: 'Other' },
];

const DEPARTMENT_OPTIONS = [
  'C-Suite',
  'Underwriting',
  'Claims',
  'IT / Technology',
  'Compliance',
  'Operations',
  'Marketing',
  'Sales',
  'Finance',
  'HR',
];

const CHANNEL_OPTIONS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'email', label: 'Email Newsletter' },
  { id: 'trade_media', label: 'Trade Media / PR' },
  { id: 'internal', label: 'Internal Briefings' },
];

const inputClass = 'w-full bg-[var(--navy)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent';

export default function MessagingBiblePage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [existingBible, setExistingBible] = useState<any>(null);
  const [generatedDoc, setGeneratedDoc] = useState('');
  const [error, setError] = useState('');

  // Step 1: Company
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [niche, setNiche] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');

  // Step 2: Audience
  const [targetAudiences, setTargetAudiences] = useState<TargetAudience[]>([
    { name: '', role: '', painPoints: '' },
  ]);

  // Step 3: Competition
  const [competitors, setCompetitors] = useState<Competitor[]>([{ name: '', difference: '' }]);
  const [differentiators, setDifferentiators] = useState<string[]>(['']);
  const [keyChallenges, setKeyChallenges] = useState<string[]>(['']);

  // Step 4: Departments
  const [departments, setDepartments] = useState<Department[]>([]);
  const [channels, setChannels] = useState<string[]>(['linkedin', 'email', 'trade_media']);

  // Load existing data
  useEffect(() => {
    fetch('/api/messaging-bible')
      .then((r) => r.json())
      .then((data) => {
        if (data.company) {
          setCompanyName(data.company.name || '');
          setCompanyType(data.company.type || '');
          setNiche(data.company.niche || '');
          setCompanyDescription(data.company.description || '');
        }
        if (data.bible) {
          setExistingBible(data.bible);
          if (data.bible.company_description) setCompanyDescription(data.bible.company_description);
          const ta = JSON.parse(data.bible.target_audiences || '[]');
          if (ta.length > 0) setTargetAudiences(ta);
          const comp = JSON.parse(data.bible.competitors || '[]');
          if (comp.length > 0) setCompetitors(comp);
          const diff = JSON.parse(data.bible.differentiators || '[]');
          if (diff.length > 0) setDifferentiators(diff);
          const kc = JSON.parse(data.bible.key_challenges || '[]');
          if (kc.length > 0) setKeyChallenges(kc);
          const dept = JSON.parse(data.bible.departments || '[]');
          if (dept.length > 0) setDepartments(dept);
          const ch = JSON.parse(data.bible.channels || '[]');
          if (ch.length > 0) setChannels(ch);
          if (data.bible.full_document && data.bible.status === 'complete') {
            setGeneratedDoc(data.bible.full_document);
            setStep(4);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaveAndNext = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/messaging-bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyType,
          niche,
          companyDescription,
          targetAudiences: targetAudiences.filter((a) => a.name || a.role),
          competitors: competitors.filter((c) => c.name),
          differentiators: differentiators.filter(Boolean),
          keyChallenges: keyChallenges.filter(Boolean),
          departments,
          channels,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save');
        return;
      }
      setExistingBible({ ...existingBible, id: data.bibleId });
      setStep(step + 1);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    // Save first
    setSaving(true);
    setError('');
    try {
      const saveRes = await fetch('/api/messaging-bible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyType,
          niche,
          companyDescription,
          targetAudiences: targetAudiences.filter((a) => a.name || a.role),
          competitors: competitors.filter((c) => c.name),
          differentiators: differentiators.filter(Boolean),
          keyChallenges: keyChallenges.filter(Boolean),
          departments,
          channels,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok) {
        setError(saveData.error || 'Failed to save');
        setSaving(false);
        return;
      }
      setSaving(false);

      // Generate
      setGenerating(true);
      const genRes = await fetch('/api/messaging-bible/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bibleId: saveData.bibleId }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) {
        setError(genData.error || 'Failed to generate');
        return;
      }
      setGeneratedDoc(genData.document);
    } catch {
      setError('Generation failed. Please try again.');
    } finally {
      setSaving(false);
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedDoc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedDoc], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName || 'Company'}_Messaging_Bible.md`;
    a.click();
    URL.revokeObjectURL(url);
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
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[var(--accent)]" />
          Messaging Bible
        </h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
          Define your brand voice, positioning, and messaging strategy across all channels
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-4">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isComplete = i < step;
          return (
            <div key={s.label} className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                    : isComplete
                    ? 'text-emerald-400 cursor-pointer hover:bg-emerald-500/10'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {isComplete ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-3 h-3 text-[var(--text-secondary)] hidden sm:block" />
              )}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="text-sm text-[var(--error)] bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="bg-[var(--navy-light)] border border-[var(--border)] rounded-xl p-5 sm:p-6">
        {/* Step 1: Company Overview */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Company Overview</h2>
              <p className="text-xs text-[var(--text-secondary)]">Tell us about your company so we can tailor your messaging strategy.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Company Name</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Acme Insurance" className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Company Type</label>
              <select value={companyType} onChange={(e) => setCompanyType(e.target.value)} className={inputClass}>
                <option value="">Select type...</option>
                {COMPANY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Niche / Specialty</label>
              <input type="text" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. Cyber insurance, Marine, Professional Indemnity" className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Company Description</label>
              <textarea value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} placeholder="What does your company do? What makes you different? What problems do you solve?" rows={4} className={inputClass} />
            </div>
          </div>
        )}

        {/* Step 2: Target Audience */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Target Audiences</h2>
              <p className="text-xs text-[var(--text-secondary)]">Who are you trying to reach? Add your key buyer personas.</p>
            </div>

            {targetAudiences.map((audience, i) => (
              <div key={i} className="bg-[var(--navy)] rounded-lg p-4 space-y-3 relative">
                {targetAudiences.length > 1 && (
                  <button
                    onClick={() => setTargetAudiences(targetAudiences.filter((_, j) => j !== i))}
                    className="absolute top-3 right-3 p-1 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-[var(--text-secondary)] hover:text-red-400" />
                  </button>
                )}
                <div className="text-xs font-semibold text-[var(--accent)] mb-2">Audience {i + 1}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">Name / Label</label>
                    <input type="text" value={audience.name} onChange={(e) => { const a = [...targetAudiences]; a[i].name = e.target.value; setTargetAudiences(a); }} placeholder="e.g. CTOs at mid-size insurers" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--text-secondary)] mb-1">Role / Title</label>
                    <input type="text" value={audience.role} onChange={(e) => { const a = [...targetAudiences]; a[i].role = e.target.value; setTargetAudiences(a); }} placeholder="e.g. Chief Technology Officer" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Pain Points</label>
                  <textarea value={audience.painPoints} onChange={(e) => { const a = [...targetAudiences]; a[i].painPoints = e.target.value; setTargetAudiences(a); }} placeholder="What keeps them up at night? What problems do they need solved?" rows={2} className={inputClass} />
                </div>
              </div>
            ))}

            <button
              onClick={() => setTargetAudiences([...targetAudiences, { name: '', role: '', painPoints: '' }])}
              className="flex items-center gap-2 text-sm text-[var(--accent)] hover:text-[var(--accent)]/80 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add another audience
            </button>
          </div>
        )}

        {/* Step 3: Competition */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Competitive Landscape</h2>
              <p className="text-xs text-[var(--text-secondary)]">Who are your competitors and what makes you different?</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Competitors</h3>
              {competitors.map((comp, i) => (
                <div key={i} className="flex gap-3 mb-3">
                  <input type="text" value={comp.name} onChange={(e) => { const c = [...competitors]; c[i].name = e.target.value; setCompetitors(c); }} placeholder="Competitor name" className={`${inputClass} w-1/3`} />
                  <input type="text" value={comp.difference} onChange={(e) => { const c = [...competitors]; c[i].difference = e.target.value; setCompetitors(c); }} placeholder="What do they do differently?" className={`${inputClass} flex-1`} />
                  {competitors.length > 1 && (
                    <button onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))} className="p-2 hover:bg-red-500/10 rounded transition-colors">
                      <X className="w-4 h-4 text-[var(--text-secondary)]" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setCompetitors([...competitors, { name: '', difference: '' }])} className="flex items-center gap-2 text-xs text-[var(--accent)] hover:text-[var(--accent)]/80">
                <Plus className="w-3 h-3" /> Add competitor
              </button>
            </div>

            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Your Key Differentiators</h3>
              {differentiators.map((diff, i) => (
                <div key={i} className="flex gap-3 mb-3">
                  <input type="text" value={diff} onChange={(e) => { const d = [...differentiators]; d[i] = e.target.value; setDifferentiators(d); }} placeholder="What sets you apart?" className={`${inputClass} flex-1`} />
                  {differentiators.length > 1 && (
                    <button onClick={() => setDifferentiators(differentiators.filter((_, j) => j !== i))} className="p-2 hover:bg-red-500/10 rounded transition-colors">
                      <X className="w-4 h-4 text-[var(--text-secondary)]" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setDifferentiators([...differentiators, ''])} className="flex items-center gap-2 text-xs text-[var(--accent)] hover:text-[var(--accent)]/80">
                <Plus className="w-3 h-3" /> Add differentiator
              </button>
            </div>

            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Key Challenges Your Customers Face</h3>
              {keyChallenges.map((challenge, i) => (
                <div key={i} className="flex gap-3 mb-3">
                  <input type="text" value={challenge} onChange={(e) => { const c = [...keyChallenges]; c[i] = e.target.value; setKeyChallenges(c); }} placeholder="e.g. Struggling with legacy systems" className={`${inputClass} flex-1`} />
                  {keyChallenges.length > 1 && (
                    <button onClick={() => setKeyChallenges(keyChallenges.filter((_, j) => j !== i))} className="p-2 hover:bg-red-500/10 rounded transition-colors">
                      <X className="w-4 h-4 text-[var(--text-secondary)]" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setKeyChallenges([...keyChallenges, ''])} className="flex items-center gap-2 text-xs text-[var(--accent)] hover:text-[var(--accent)]/80">
                <Plus className="w-3 h-3" /> Add challenge
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Departments & Channels */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Departments & Channels</h2>
              <p className="text-xs text-[var(--text-secondary)]">Which departments need buy-in, and what channels matter most?</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Departments that need buy-in</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DEPARTMENT_OPTIONS.map((dept) => {
                  const isSelected = departments.some((d) => d.name === dept);
                  return (
                    <button
                      key={dept}
                      onClick={() => {
                        if (isSelected) {
                          setDepartments(departments.filter((d) => d.name !== dept));
                        } else {
                          setDepartments([...departments, { name: dept, focus: 'strategic' }]);
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                        isSelected
                          ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
                          : 'text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]/30'
                      }`}
                    >
                      {dept}
                    </button>
                  );
                })}
              </div>
            </div>

            {departments.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Focus type per department</h3>
                <div className="space-y-2">
                  {departments.map((dept, i) => (
                    <div key={dept.name} className="flex items-center justify-between bg-[var(--navy)] rounded-lg px-4 py-2.5">
                      <span className="text-sm text-[var(--text-primary)]">{dept.name}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { const d = [...departments]; d[i].focus = 'strategic'; setDepartments(d); }}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            dept.focus === 'strategic' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          Strategic
                        </button>
                        <button
                          onClick={() => { const d = [...departments]; d[i].focus = 'operational'; setDepartments(d); }}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            dept.focus === 'operational' ? 'bg-purple-500/10 text-purple-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          Operational
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">Priority channels</h3>
              <div className="grid grid-cols-2 gap-2">
                {CHANNEL_OPTIONS.map((ch) => {
                  const isSelected = channels.includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      onClick={() => {
                        if (isSelected) {
                          setChannels(channels.filter((c) => c !== ch.id));
                        } else {
                          setChannels([...channels, ch.id]);
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                        isSelected
                          ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
                          : 'text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)]/30'
                      }`}
                    >
                      {ch.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Generate / View */}
        {step === 4 && (
          <div className="space-y-5">
            {!generatedDoc && !generating && (
              <>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Ready to Generate</h2>
                  <p className="text-xs text-[var(--text-secondary)]">Review your inputs and generate your Messaging Bible.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-[var(--navy)] rounded-lg p-3">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Company</div>
                    <div className="text-[var(--text-primary)] font-medium">{companyName || 'Not set'}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{companyType || 'Type not set'} · {niche || 'Niche not set'}</div>
                  </div>
                  <div className="bg-[var(--navy)] rounded-lg p-3">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Audiences</div>
                    <div className="text-[var(--text-primary)] font-medium">{targetAudiences.filter((a) => a.name).length} defined</div>
                  </div>
                  <div className="bg-[var(--navy)] rounded-lg p-3">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Competitors</div>
                    <div className="text-[var(--text-primary)] font-medium">{competitors.filter((c) => c.name).length} listed</div>
                  </div>
                  <div className="bg-[var(--navy)] rounded-lg p-3">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Departments</div>
                    <div className="text-[var(--text-primary)] font-medium">{departments.length} selected</div>
                  </div>
                </div>

                <Button variant="primary" onClick={handleGenerate} className="w-full flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Generate Messaging Bible
                </Button>
              </>
            )}

            {generating && (
              <div className="flex flex-col items-center justify-center py-16 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-[var(--accent)]/20 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Generating your Messaging Bible...</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">This typically takes 15-30 seconds. We&apos;re crafting a comprehensive strategy document tailored to {companyName}.</p>
                </div>
              </div>
            )}

            {generatedDoc && !generating && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">{companyName} Messaging Bible</h2>
                    <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                      <Check className="w-3 h-3" /> Generated successfully
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={handleCopy}>
                      {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleDownload}>
                      <Download className="w-4 h-4 mr-1" /> Download
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleGenerate}>
                      <Sparkles className="w-4 h-4 mr-1" /> Regenerate
                    </Button>
                  </div>
                </div>
                <div className="bg-[var(--navy)] rounded-lg p-6 border border-[var(--border)]">
                  <SimpleMarkdown
                    content={generatedDoc}
                    className="text-[var(--text-secondary)] text-sm leading-relaxed"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      {step < 4 && (
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          <Button
            variant="primary"
            onClick={step === 3 ? handleSaveAndNext : handleSaveAndNext}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {step === 3 ? 'Review & Generate' : 'Save & Continue'}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {step === 4 && generatedDoc && (
        <div className="flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => setStep(0)}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Edit Inputs
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.location.href = '/content'}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" /> View Content Library
          </Button>
        </div>
      )}
    </div>
  );
}
