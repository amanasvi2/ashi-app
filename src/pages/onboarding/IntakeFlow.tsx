import { useEffect, useState } from 'react';
import { SKILLS, SUPPORTS, DOMAIN_LABELS, isActionableFocusSkill } from '../../skills';
import type { SkillDomain } from '../../skills';
import { extractProfile, saveProfile } from '../../profiles';
import type { ProfileSummary } from '../../profiles';
import type { StudentProfileInput } from '../../profileTypes';
import { defaultProfile, validateStudentProfile, MAX_FOCUS_SKILLS, DEFAULT_SESSION_LENGTH_MIN } from '../../profileValidation';
import { saveDescriptionDraft, loadDescriptionDraft, clearDescriptionDraft } from './draftStorage';

const DOMAINS: SkillDomain[] = ['reading', 'writing', 'math', 'comm', 'exec'];

function skillsByDomain(domain: SkillDomain) {
  return SKILLS.filter(s => s.domain === domain);
}

interface Props {
  onDone: (profile: ProfileSummary) => void;
}

export function IntakeFlow({ onDone }: Props) {
  const [step, setStep] = useState<'describe' | 'confirm'>('describe');
  const [description, setDescription] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<StudentProfileInput>(defaultProfile());
  const [newInterest, setNewInterest] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDescription(loadDescriptionDraft());
  }, []);

  const updateDescription = (value: string) => {
    setDescription(value);
    saveDescriptionDraft(value);
  };

  const handleContinue = async () => {
    setError('');
    if (description.trim().length < 5) { setError('Tell us a little more.'); return; }
    setExtracting(true);
    try {
      const draft = await extractProfile(description);
      setProfile({
        display_name: draft.display_name ?? '',
        grade: draft.grade ?? NaN,
        reading_level: draft.reading_level ?? draft.grade ?? NaN,
        strengths: draft.strengths,
        focus: draft.focus,
        supports: draft.supports,
        session_length_min: draft.session_length_min ?? DEFAULT_SESSION_LENGTH_MIN,
        interests: draft.interests,
      });
      setStep('confirm');
    } catch (err) {
      console.error('Profile extraction failed:', err);
      setError("Couldn't process that right now — try again in a moment.");
    } finally {
      setExtracting(false);
    }
  };

  const toggleStrength = (id: string) => {
    setProfile(p => ({
      ...p,
      strengths: p.strengths.includes(id) ? p.strengths.filter(x => x !== id) : [...p.strengths, id],
    }));
  };

  const toggleFocus = (id: string) => {
    setProfile(p => {
      if (p.focus.includes(id)) return { ...p, focus: p.focus.filter(x => x !== id) };
      if (p.focus.length >= MAX_FOCUS_SKILLS) return p;
      return { ...p, focus: [...p.focus, id] };
    });
  };

  const toggleSupport = (id: string) => {
    setProfile(p => ({
      ...p,
      supports: p.supports.includes(id) ? p.supports.filter(x => x !== id) : [...p.supports, id],
    }));
  };

  const addInterest = () => {
    const value = newInterest.trim();
    if (!value || profile.interests.includes(value)) { setNewInterest(''); return; }
    setProfile(p => ({ ...p, interests: [...p.interests, value] }));
    setNewInterest('');
  };

  const removeInterest = (value: string) => {
    setProfile(p => ({ ...p, interests: p.interests.filter(x => x !== value) }));
  };

  const canConfirm = profile.display_name.trim().length > 0
    && Number.isFinite(profile.grade)
    && profile.interests.length > 0;

  const handleConfirm = async () => {
    setError('');
    const readingLevel = Number.isFinite(profile.reading_level) ? profile.reading_level : profile.grade;
    const toSave: StudentProfileInput = { ...profile, reading_level: readingLevel };

    const { valid, errors } = validateStudentProfile(toSave);
    if (!valid) { setError(errors[0]); return; }

    setSaving(true);
    try {
      const saved = await saveProfile(toSave);
      clearDescriptionDraft();
      onDone(saved);
    } catch (err) {
      console.error('Profile save failed:', err);
      setError('Could not save the profile — try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 w-full max-w-lg space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-1">Tell us about your child</p>
          <p className="text-sm text-slate-500">{step === 'describe' ? 'Step 1 of 2' : 'Step 2 of 2 — review'}</p>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}

        {step === 'describe' && (
          <div className="space-y-4">
            <textarea
              value={description}
              onChange={e => updateDescription(e.target.value)}
              rows={8}
              placeholder="Tell us about your child. What are they good at, what's hard for them, and what helps them learn? A few sentences is plenty — or paste anything useful from a school report or IEP."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400
                         focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
            <button
              onClick={handleContinue}
              disabled={extracting || description.trim().length < 5}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700
                         disabled:opacity-40 transition-colors"
            >
              {extracting ? 'Reading that…' : 'Continue →'}
            </button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-5">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Her name or nickname</label>
              <input value={profile.display_name} onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Grade (0 = K)</label>
                <input type="number" min={0} max={12} value={Number.isFinite(profile.grade) ? profile.grade : ''}
                  onChange={e => setProfile(p => ({ ...p, grade: e.target.value === '' ? NaN : Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-600">Reading level</label>
                <input type="number" step={0.1} min={0} max={13}
                  value={Number.isFinite(profile.reading_level) ? profile.reading_level : ''}
                  placeholder={Number.isFinite(profile.grade) ? String(profile.grade) : ''}
                  onChange={e => setProfile(p => ({ ...p, reading_level: e.target.value === '' ? NaN : Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Strengths</p>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {DOMAINS.map(domain => (
                  <div key={domain}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{DOMAIN_LABELS[domain]}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {skillsByDomain(domain).map(s => (
                        <button key={s.id} onClick={() => toggleStrength(s.id)}
                          className={`px-2.5 py-1 rounded-full text-xs border transition-all
                            ${profile.strengths.includes(s.id) ? 'bg-blue-100 border-blue-400 text-blue-700 font-medium' : 'border-slate-200 text-slate-600'}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">
                Focus areas <span className="text-slate-400">(up to {MAX_FOCUS_SKILLS})</span>
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                {SKILLS.map(s => {
                  const selected = profile.focus.includes(s.id);
                  const supported = isActionableFocusSkill(s.id);
                  return (
                    <button key={s.id} onClick={() => toggleFocus(s.id)}
                      disabled={!selected && profile.focus.length >= MAX_FOCUS_SKILLS}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-all flex items-center gap-1
                        ${selected ? 'bg-blue-600 text-white border-blue-600 font-medium' : 'border-slate-200 text-slate-600'}
                        disabled:opacity-40`}>
                      {s.label}
                      {selected && !supported && (
                        <span title="Not yet used in practice sessions" className="text-amber-300">⚠</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {profile.focus.some(id => !isActionableFocusSkill(id)) && (
                <p className="text-xs text-amber-600 mt-1.5">
                  ⚠ Some selected focus areas aren't used in practice sessions yet — they're saved, but won't change what she practices.
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">What helps her</p>
              <div className="flex flex-wrap gap-1.5">
                {SUPPORTS.map(s => (
                  <button key={s.id} onClick={() => toggleSupport(s.id)}
                    className={`px-2.5 py-1 rounded-full text-xs border transition-all
                      ${profile.supports.includes(s.id) ? 'bg-blue-100 border-blue-400 text-blue-700 font-medium' : 'border-slate-200 text-slate-600'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">
                Interests <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {profile.interests.map(i => (
                  <span key={i} className="px-2.5 py-1 rounded-full text-xs bg-blue-100 text-blue-700 font-medium flex items-center gap-1.5">
                    {i}
                    <button onClick={() => removeInterest(i)} className="text-blue-400 hover:text-blue-700">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input value={newInterest} onChange={e => setNewInterest(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInterest(); } }}
                  placeholder="e.g. Minecraft, horses, drawing"
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                <button onClick={addInterest} className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">
                  Add
                </button>
              </div>
              {profile.interests.length === 0 && (
                <p className="text-xs text-slate-400 mt-1.5">Add at least one to continue.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Session length</p>
              <div className="flex gap-2">
                {[5, 10, 15, 20, 30].map(n => (
                  <button key={n} onClick={() => setProfile(p => ({ ...p, session_length_min: n }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all
                      ${profile.session_length_min === n ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600'}`}>
                    {n}m
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('describe')}
                className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">
                ← Back
              </button>
              <button onClick={handleConfirm} disabled={saving || !canConfirm}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
                {saving ? 'Saving…' : 'Confirm →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
