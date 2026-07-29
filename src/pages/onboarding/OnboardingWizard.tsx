import { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// eslint-disable-next-line import/no-unresolved
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { supabase } from '../../supabase';
import { analyzeIep, createStudent } from '../../students';
import type { StudentSummary, TailoringDraft } from '../../students';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => ('str' in item ? item.str : '')).join(' '));
  }
  return pages.join('\n').trim();
}

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

const TYPE_LABELS = { social: 'Social problems', nonverbal: 'Nonverbal cues', inference: 'Reading inference' } as const;
const DIFF_LABELS: Record<1 | 2 | 3, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

interface Props {
  parentId: string;
  onDone: (student: StudentSummary) => void;
}

export function OnboardingWizard({ parentId, onDone }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState('');

  // Step 1
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedText, setExtractedText] = useState('');

  // Step 2 (editable draft)
  const [draft, setDraft] = useState<TailoringDraft | null>(null);

  // Step 3
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [gender, setGender] = useState<'girl' | 'boy' | 'other'>('other');
  const [interests, setInterests] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const toggleInterest = (id: string) =>
    setInterests(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const handleAnalyze = async () => {
    setError('');
    setAnalyzing(true);
    try {
      const text = inputMode === 'upload' && file ? await extractPdfText(file) : pastedText.trim();
      if (text.length < 50) {
        setError(
          inputMode === 'upload'
            ? "Couldn't read enough text from that file — try pasting the text instead."
            : 'Paste a bit more of the IEP text.',
        );
        return;
      }
      const result = await analyzeIep(text);
      setExtractedText(text);
      setDraft(result);
      setStep(2);
    } catch (err) {
      console.error('IEP analyze failed:', err);
      setError('Something went wrong reading that IEP. You can try again or paste the text instead.');
    } finally {
      setAnalyzing(false);
    }
  };

  const updateWeight = (type: keyof TailoringDraft['itemTypeWeights'], value: number) => {
    if (!draft) return;
    setDraft({ ...draft, itemTypeWeights: { ...draft.itemTypeWeights, [type]: value } });
  };

  const updateDifficulty = (type: keyof TailoringDraft['initialDifficulty'], value: 1 | 2 | 3) => {
    if (!draft) return;
    setDraft({ ...draft, initialDifficulty: { ...draft.initialDifficulty, [type]: value } });
  };

  const handleCreate = async () => {
    setError('');
    if (!displayName.trim() || !username.trim()) { setError('Fill in a name and username.'); return; }
    if (password.length < 4) { setError('Password needs at least 4 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setCreating(true);
    try {
      const student = await createStudent({
        username, password, displayName, gender,
        tailoringProfile: draft ? {
          itemTypeWeights: draft.itemTypeWeights,
          initialDifficulty: draft.initialDifficulty,
          goalsSummary: draft.goalsSummary,
          parentExplanation: draft.parentExplanation,
        } : undefined,
      });

      // Attach interests (create-student.ts doesn't take these — parent_config
      // is otherwise parent-managed, so set it here as a normal authenticated write).
      await supabase.from('parent_config').update({ interests }).eq('student_id', student.id);

      // Persist the IEP itself now that we have a student to attach it to.
      if (extractedText) {
        let storagePath: string | null = null;
        if (file) {
          storagePath = `${parentId}/${student.id}/${file.name}`;
          await supabase.storage.from('iep-documents').upload(storagePath, file);
        }
        const { data: iepRow } = await supabase
          .from('ieps')
          .insert({ student_id: student.id, storage_path: storagePath, original_filename: file?.name ?? null, extracted_text: extractedText })
          .select('id')
          .single();
        if (iepRow) {
          await supabase.from('tailoring_profiles').update({ iep_id: iepRow.id }).eq('student_id', student.id).eq('is_active', true);
        }
      }

      onDone(student);
    } catch (err) {
      console.error('Create student failed:', err);
      setError('Could not create the account — that username might already be taken.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 w-full max-w-lg space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-1">Set up your child's account</p>
          <p className="text-sm text-slate-500">Step {step} of 3</p>
          <div className="flex gap-2 mt-3">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-blue-500' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Upload your child's IEP</h2>
              <p className="text-sm text-slate-500 mt-1">
                We'll read the goals and set up practice that matches them. You'll be able to review and
                adjust everything before it's saved.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setInputMode('upload')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all
                  ${inputMode === 'upload' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600'}`}
              >
                Upload PDF
              </button>
              <button
                onClick={() => setInputMode('paste')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all
                  ${inputMode === 'paste' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600'}`}
              >
                Paste text instead
              </button>
            </div>

            {inputMode === 'upload' ? (
              <label className="block border-2 border-dashed border-slate-200 rounded-xl px-4 py-8 text-center cursor-pointer hover:border-blue-300 transition-colors">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-sm text-slate-600">{file ? file.name : 'Click to choose a PDF'}</p>
                <p className="text-xs text-slate-400 mt-1">If it's a scanned document, try "Paste text instead."</p>
              </label>
            ) : (
              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                rows={8}
                placeholder="Paste the goals and present-levels sections here..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300
                           focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
            )}

            <button
              onClick={handleAnalyze}
              disabled={analyzing || (inputMode === 'upload' ? !file : pastedText.trim().length < 50)}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {analyzing ? 'Reading the IEP…' : 'Analyze IEP →'}
            </button>
          </div>
        )}

        {step === 2 && draft && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Review what we found</h2>
              <p className="text-sm text-slate-500 mt-1">Check this over — you can adjust the emphasis below.</p>
            </div>

            <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">Goals this app supports</p>
              <ul className="space-y-1.5">
                {draft.goalsSummary.map((g, i) => (
                  <li key={i} className="text-sm text-blue-800 flex gap-2">
                    <span className="text-blue-400">•</span>{g}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Practice emphasis</p>
              {(Object.keys(TYPE_LABELS) as (keyof typeof TYPE_LABELS)[]).map(type => (
                <div key={type} className="bg-white rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-800">{TYPE_LABELS[type]}</span>
                    <span className="text-xs text-slate-400">{Math.round(draft.itemTypeWeights[type] * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={draft.itemTypeWeights[type]}
                    onChange={e => updateWeight(type, Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex gap-2 mt-2">
                    {([1, 2, 3] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => updateDifficulty(type, d)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all
                          ${draft.initialDifficulty[type] === d ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-500'}`}
                      >
                        {DIFF_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">
                ← Back
              </button>
              <button onClick={() => setStep(3)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700">
                Looks good →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Create her login</h2>
              <p className="text-sm text-slate-500 mt-1">She'll use this username and password to sign in.</p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-600">Her name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
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

            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">What does she like? (optional)</p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => toggleInterest(opt.id)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all
                      ${interests.includes(opt.id) ? 'bg-blue-100 border-blue-400 text-blue-700 font-medium' : 'border-slate-200 text-slate-600'}`}>
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50">
                ← Back
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {creating ? 'Creating…' : "Done! Let's go"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
