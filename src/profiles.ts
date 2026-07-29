import { supabase } from './supabase';
import { callApi } from './api';
import type { StudentProfileInput, ExtractedProfileDraft } from './profileTypes';

export interface ProfileSummary {
  id: string;
  displayName: string;
  studentId: string | null; // null until a login has been created and linked
}

// A parent has at most one profile in the current UI (the schema allows
// more, but there's no switcher yet).
export async function getMyProfile(parentId: string): Promise<ProfileSummary | null> {
  const { data } = await supabase
    .from('student_profiles')
    .select('id, display_name, student_id')
    .eq('parent_id', parentId)
    .eq('is_active', true)
    .maybeSingle();
  return data ? { id: data.id, displayName: data.display_name, studentId: data.student_id } : null;
}

export async function extractProfile(description: string): Promise<ExtractedProfileDraft> {
  const { draft } = await callApi<{ draft: ExtractedProfileDraft }>('/api/profile/extract', { description });
  return draft;
}

export async function saveProfile(profile: StudentProfileInput): Promise<ProfileSummary> {
  const res = await callApi<{ id: string; displayName: string }>('/api/profile/save', { profile });
  return { id: res.id, displayName: res.displayName, studentId: null };
}
