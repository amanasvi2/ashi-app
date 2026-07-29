import { supabase } from './supabase';
import { callApi } from './api';

export interface StudentSummary {
  id: string;
  username: string;
  displayName: string;
}

export async function listMyStudents(ownerId: string): Promise<StudentSummary[]> {
  const { data } = await supabase
    .from('students')
    .select('id, username, display_name')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });
  return (data ?? []).map(row => ({ id: row.id, username: row.username, displayName: row.display_name }));
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
