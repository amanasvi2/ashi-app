import { supabase } from './supabase';
import { callApi } from './api';

export interface StudentSummary {
  id: string;
  username: string;
  displayName: string;
}

// A parent has at most one student in the current UI (the schema allows
// more, but there's no switcher yet — see the plan's Phase notes).
export async function getMyStudent(parentId: string): Promise<StudentSummary | null> {
  const { data } = await supabase
    .from('students')
    .select('id, username, display_name')
    .eq('parent_id', parentId)
    .maybeSingle();
  return data ? { id: data.id, username: data.username, displayName: data.display_name } : null;
}

export interface TailoringDraft {
  goalsSummary: string[];
  itemTypeWeights: { social: number; nonverbal: number; inference: number };
  initialDifficulty: { social: 1 | 2 | 3; nonverbal: 1 | 2 | 3; inference: 1 | 2 | 3 };
  parentExplanation: string;
}

export async function analyzeIep(extractedText: string): Promise<TailoringDraft> {
  const { draft } = await callApi<{ draft: TailoringDraft }>('/api/iep/analyze', { extractedText });
  return draft;
}

export interface CreateStudentInput {
  username: string;
  password: string;
  displayName: string;
  gender: 'girl' | 'boy' | 'other';
  tailoringProfile?: {
    iepId?: string;
    itemTypeWeights: TailoringDraft['itemTypeWeights'];
    initialDifficulty: TailoringDraft['initialDifficulty'];
    goalsSummary: string[];
    parentExplanation: string;
  };
}

export async function createStudent(input: CreateStudentInput): Promise<StudentSummary> {
  const res = await callApi<{ studentId: string; username: string; displayName: string }>(
    '/api/create-student',
    input,
  );
  return { id: res.studentId, username: res.username, displayName: res.displayName };
}
