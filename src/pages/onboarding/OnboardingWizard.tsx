import { useEffect, useState } from 'react';
import { SKILLS, DOMAIN_LABELS, ACTIONABLE_TARGET_SKILL_IDS, skillById } from '../../skills';
import type { SkillDomain } from '../../skills';
import { createStudent } from '../../students';
import type { StudentSummary, StudentProfileInput, ProfileTarget, FormatConstraints } from '../../students';
import { validateStudentProfile, DEFAULT_FORMAT_CONSTRAINTS } from '../../profileValidation';
import { saveDraft, loadDraft, clearDraft } from './draftStorage';
import type { IntakeDraft } from './draftStorage';

const TOTAL_STEPS = 10;

const INTEREST_OPTIONS = [
  { id: 'gaming',  label: 'Gaming',       emoji: '🎮' },
  { id: 'animals', label: 'Animals',      emoji: '🐾' },
  { id: 'music',   label: 'Music',        emoji: '🎵' },
  { id: 'comedy',  label: 'Comedy',       emoji: '😂' },
  { id: 'art',     label: 'Art',          emoji: '🎨' },
  { id: 'cooking', label: 'Cooking',      emoji: '🍳' },
  { id: 'sports',  label: 'Sports',       emoji: '⚽' },
  { id: 'science', label: 'Science',      emoji: '🔬' },
  { id: 'crafts',  label: 'DIY & Crafts', emoji: '✂️' },
  { id: 'nature',  label: 'Nature',       emoji: '🌿' },
];

const FORMAT_TOGGLES: { key: keyof FormatConstraints; label: string; hint: string }[] = [
  { key: 'one_step_at_a_time', label: 'One step at a time', hint: 'Give one instruction before the next, not several at once.' },
  { key: 'short_directions', label: 'Short directions', hint: 'Keep wording brief and simple.' },
  { key: 'read_aloud', label: 'Read things aloud', hint: 'Text gets read out loud automatically.' },
  { key: 'extended_response_time', label: 'Extra time to respond', hint: 'No rushing between questions.' },
  { key: 'graphic_organizers_for_writing', label: 'Graphic organizers for writing', hint: 'Visual structure before writing tasks.' },
];

const DOMAINS: SkillDomain[] = ['reading', 'writing', 'math', 'comm', 'exec'];

function skillsByDomain(domain: SkillDomain) {
  return SKILLS.filter(s => s.domain === domain);
}

function emptyTargetDetail() {
  return { current: null as number | null, goal: null as number | null, level: null as number | null };
}

interface Props {
  onDone: (student: StudentSummary) => void;
}

export function OnboardingWizard({ onDone }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [grade, setGrade] = useState<number | ''>('');
  const [readingLevel, setReadingLevel] = useState<number | ''>('');
  const [englishLearner, setEnglishLearner] = useState(false);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [targetSkills, setTargetSkills] = useState<string[]>([]);
  const [targetDetails, setTargetDetails] = useState<Record<string, ReturnType<typeof emptyTargetDetail>>>({});
  const [formatConstraints, setFormatConstraints] = useState<FormatConstraints>({ ...DEFAULT_FORMAT_CONSTRAINTS });
  const [sessionLength, setSessionLength] = useState(12);
  const [motivation, setMotivation] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [gender, setGender] = useState<'girl' | 'boy' | 'other'>('other');
  const [creating, setCreating] = useState(false);

  // Load any resumable draft on mount (password is never persisted).
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setStep(draft.step);
      setDisplayName(draft.displayName);
      setUsername(draft.username);
      setGrade(Number.isFinite(draft.grade) ? draft.grade : '');
      setReadingLevel(draft.instructional_reading_level ?? '');
      setEnglishLearner(draft.english_learner);
      setStrengths(draft.strengths);
      setTargetSkills(draft.targets.map(t => t.skill));
      setTargetDetails(Object.fromEntries(draft.targets.map(t => [t.skill, { current: t.current, goal: t.goal, level: t.level }])));
      setFormatConstraints(draft.format_constraints);
      setSessionLength(draft.session_length_target_min);
      setMotivation(draft.motivation ?? '');
      setInterests(draft.interests);
    }
    setLoaded(true);
  }, []);

  // Persist a resumable draft on every change (never the password).
  useEffect(() => {
    if (!loaded) return;
    const targets: ProfileTarget[] = targetSkills.map(skill => ({ skill, ...(targetDetails[skill] ?? emptyTargetDetail()) }));
    const draft: IntakeDraft = {
      step, displayName, username,
      grade: typeof grade === 'number' ? grade : NaN,
      instructional_reading_level: readingLevel === '' ? null : readingLevel,
      english_learner: englishLearner,
      strengths, targets,
      format_constraints: formatConstraints,
      session_length_target_min: sessionLength,
      motivation: motivation.trim() || null,
      interests,
    };
    saveDraft(draft);
  }, [loaded, step, displayName, username, grade, readingLevel, englishLearner, strengths, targetSkills, targetDetails, formatConstraints, sessionLength, motivation, interests]);

  const toggleInList = (list: string[], setList: (v: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  const toggleTarget = (id: string) => {
    if (targetSkills.includes(id)) {
      setTargetSkills(targetSkills.filter(x => x !== id));
    } else {
      setTargetSkills([...targetSkills, id]);
      setTargetDetails(prev => ({ ...prev, [id]: prev[id] ?? emptyTargetDetail() }));
    }
  };

  const updateTargetDetail = (id: string, field: 'current' | 'goal' | 'level', value: number | null) => {
    setTargetDetails(prev => ({ ...prev, [id]: { ...(prev[id] ?? emptyTargetDetail()), [field]: value } }));
  };

  const next = () => { setError(''); setStep(s => Math.min(TOTAL_STEPS, s + 1)); };
  const back = () => { setError(''); setStep(s => Math.max(1, s - 1)); };

  const buildProfile = (): StudentProfileInput => ({
    grade: typeof grade === 'number' ? grade : NaN,
    instructional_reading_level: readingLevel === '' ? null : readingLevel,
    english_learner: englishLearner,
    strengths,
    targets: targetSkills.map(skill => ({ skill, ...(targetDetails[skill] ?? emptyTargetDetail()) })),
    format_constraints: formatConstraints,
    session_length_target_min: sessionLength,
    motivation: motivation.trim() || null,
    interests,
  });

  const handleCreate = async () => {
    setError('');
    if (!displayName.trim() || !username.trim()) { setError('Fill in a name and username.'); return; }
    if (password.length < 4) { setError('Password needs at least 4 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    const profile = buildProfile();
    const { valid, errors } = validateStudentProfile(profile);
    if (!valid) { setError(errors[0]); return; }

    setCreating(true);
    try {
      const student = await createStudent({ username, password, displayName, gender, profile });
      clearDraft();
      onDone(student);
    } catch (err) {
      console.error('Create student failed:', err);
      setError('Could not create the account — that username might already be taken.');
    } finally {
      setCreating(false);
    }
  };

  const canLeaveStep1 = displayName.trim().length > 0 && typeof grade === 'number';
  const canLeaveStep4 = targetSkills.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 w-full max-w-lg space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-1">Tell us about your child</p>
          <p className="text-sm text-slate-500">Step {step} of {TOTAL_STEPS}</p>
          <div className="flex gap-1.5 mt-3">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-blue-500' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800">Name and grade</h2>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Her name or nickname</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Grade (0 for Kindergarten)</label>
              <input type="number" min={0} max={12} value={grade}
                onChange={e => setGrade(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <button onClick={next} disabled={!canLeaveStep1}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
              Next →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800">Reading level</h2>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Instructional reading level (grade equivalent, optional)</label>
              <input type="number" step={0.1} min={0} max={13} value={readingLevel}
                placeholder="e.g. 4.5"
                onChange={e => setReadingLevel(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <button onClick={() => setEnglishLearner(!englishLearner)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all
                ${englishLearner ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600'}`}>
              English learner
              <span>{englishLearner ? '✓' : ''}</span>
            </button>
            <div className="flex gap-3">
              <button onClick={back} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">← Back</button>
              <button onClick={next} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">Next →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Strengths</h2>
              <p className="text-sm text-slate-500 mt-1">What is she already good at? (optional)</p>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {DOMAINS.map(domain => (
                <div key={domain}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">{DOMAIN_LABELS[domain]}</p>
                  <div className="flex flex-wrap gap-2">
                    {skillsByDomain(domain).map(s => (
                      <button key={s.id} onClick={() => toggleInList(strengths, setStrengths, s.id)}
                        className={`px-3 py-1.5 rounded-full text-xs border transition-all text-left
                          ${strengths.includes(s.id) ? 'bg-blue-100 border-blue-400 text-blue-700 font-medium' : 'border-slate-200 text-slate-600'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={back} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">← Back</button>
              <button onClick={next} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">Next →</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Practice targets</h2>
              <p className="text-sm text-slate-500 mt-1">Pick at least one — these are what practice sessions will focus on.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ACTIONABLE_TARGET_SKILL_IDS.map(id => {
                const s = skillById(id)!;
                return (
                  <button key={id} onClick={() => toggleTarget(id)}
                    className={`px-3 py-2 rounded-xl text-sm border transition-all text-left
                      ${targetSkills.includes(id) ? 'bg-blue-600 text-white border-blue-600 font-medium' : 'border-slate-200 text-slate-600'}`}>
                    {s.label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={back} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">← Back</button>
              <button onClick={next} disabled={!canLeaveStep4}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
                Next →
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Target details</h2>
              <p className="text-sm text-slate-500 mt-1">Optional — helps us pick the right starting difficulty.</p>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {targetSkills.map(id => {
                const s = skillById(id)!;
                const detail = targetDetails[id] ?? emptyTargetDetail();
                return (
                  <div key={id} className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
                    <p className="text-sm font-medium text-slate-800">{s.label}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Current %</label>
                        <input type="number" min={0} max={100} value={detail.current === null ? '' : Math.round(detail.current * 100)}
                          onChange={e => updateTargetDetail(id, 'current', e.target.value === '' ? null : Number(e.target.value) / 100)}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Goal %</label>
                        <input type="number" min={0} max={100} value={detail.goal === null ? '' : Math.round(detail.goal * 100)}
                          onChange={e => updateTargetDetail(id, 'goal', e.target.value === '' ? null : Number(e.target.value) / 100)}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Level</label>
                        <input type="number" value={detail.level === null ? '' : detail.level}
                          onChange={e => updateTargetDetail(id, 'level', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={back} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">← Back</button>
              <button onClick={next} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">Next →</button>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">What helps her most</h2>
              <p className="text-sm text-slate-500 mt-1">Optional — check any that apply.</p>
            </div>
            <div className="space-y-2">
              {FORMAT_TOGGLES.map(t => (
                <button key={t.key}
                  onClick={() => setFormatConstraints({ ...formatConstraints, [t.key]: !formatConstraints[t.key] })}
                  className={`w-full flex items-start justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-all
                    ${formatConstraints[t.key] ? 'bg-blue-50 border-blue-300' : 'border-slate-200'}`}>
                  <span>
                    <span className="block text-sm font-medium text-slate-800">{t.label}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{t.hint}</span>
                  </span>
                  <span className="text-blue-600 mt-0.5">{formatConstraints[t.key] ? '✓' : ''}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={back} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">← Back</button>
              <button onClick={next} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">Next →</button>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800">Session length</h2>
            <p className="text-sm text-slate-500">How long should a practice session run before it ends?</p>
            <div className="flex gap-2">
              {[5, 8, 12, 15, 20].map(n => (
                <button key={n} onClick={() => setSessionLength(n)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all
                    ${sessionLength === n ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600'}`}>
                  {n}m
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={back} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">← Back</button>
              <button onClick={next} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">Next →</button>
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Motivation and interests</h2>
              <p className="text-sm text-slate-500 mt-1">Optional — helps us make practice feel less generic.</p>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">What motivates her?</label>
              <textarea value={motivation} onChange={e => setMotivation(e.target.value)} rows={3}
                placeholder="e.g. earning screen time, stickers, a favorite show..."
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">What does she like?</p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => toggleInList(interests, setInterests, opt.id)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all
                      ${interests.includes(opt.id) ? 'bg-blue-100 border-blue-400 text-blue-700 font-medium' : 'border-slate-200 text-slate-600'}`}>
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={back} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">← Back</button>
              <button onClick={next} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">Next →</button>
            </div>
          </div>
        )}

        {step === 9 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-800">Review</h2>
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2 text-sm text-slate-700">
              <p><span className="text-slate-400">Name:</span> {displayName || '—'}</p>
              <p><span className="text-slate-400">Grade:</span> {grade === '' ? '—' : grade}</p>
              <p><span className="text-slate-400">Reading level:</span> {readingLevel === '' ? '—' : readingLevel}</p>
              <p><span className="text-slate-400">English learner:</span> {englishLearner ? 'Yes' : 'No'}</p>
              <p><span className="text-slate-400">Strengths:</span> {strengths.length ? strengths.map(id => skillById(id)?.label).join(', ') : '—'}</p>
              <p><span className="text-slate-400">Targets:</span> {targetSkills.map(id => skillById(id)?.label).join(', ')}</p>
              <p><span className="text-slate-400">Session length:</span> {sessionLength} minutes</p>
              <p><span className="text-slate-400">Interests:</span> {interests.length ? interests.join(', ') : '—'}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={back} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">← Back</button>
              <button onClick={next} className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">Looks good →</button>
            </div>
          </div>
        )}

        {step === 10 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Create her login</h2>
              <p className="text-sm text-slate-500 mt-1">She'll use this username and password to sign in.</p>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Username</label>
              <input value={username} onChange={e => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Confirm</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">How does she identify? (optional)</p>
              <div className="flex gap-2">
                {([{ v: 'girl', l: 'Girl' }, { v: 'boy', l: 'Boy' }, { v: 'other', l: 'Something else' }] as const).map(o => (
                  <button key={o.v} onClick={() => setGender(o.v)}
                    className={`flex-1 py-2 rounded-xl text-sm border transition-all
                      ${gender === o.v ? 'bg-blue-600 text-white border-blue-600 font-semibold' : 'border-slate-200 text-slate-600'}`}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={back} className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">← Back</button>
              <button onClick={handleCreate} disabled={creating}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
                {creating ? 'Creating…' : "Done! Let's go"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
