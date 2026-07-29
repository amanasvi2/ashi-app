import { supabase } from './supabase';
import { callApi } from './api';

export interface StudentSummary {
  id: string;
  username: string;
  displayName: string;
}

// A parent has at most one student in the current UI (the schema allows
// more, but there's no switcher yet).
export async function getMyStudent(parentId: string): Promise<StudentSummary | null> {
  const { data } = await supabase
    .from('students')
    .select('id, username, display_name')
    .eq('parent_id', parentId)
    .maybeSingle();
  return data ? { id: data.id, username: data.username, displayName: data.display_name } : null;
}

export interface CreateStudentInput {
  profileId: string;
  username: string;
  password: string;
  gender: 'girl' | 'boy' | 'other';
}

export async function createStudent(input: CreateStudentInput): Promise<StudentSummary> {
  const res = await callApi<{ studentId: string; username: string; displayName: string }>(
    '/api/create-student',
    input,
  );
  return { id: res.studentId, username: res.username, displayName: res.displayName };
}
