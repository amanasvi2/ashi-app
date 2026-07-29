import { supabase } from './supabase';
import { callApi } from './api';
import type { StudentProfileInput, ExtractedProfileDraft } from './profileTypes';
import type { OwnerType } from './ownerCaps';

export interface ProfileSummary {
  id: string;
  displayName: string;
  studentId: string | null; // null until a login has been created and linked
}

export async function listMyProfiles(ownerId: string): Promise<ProfileSummary[]> {
  const { data } = await supabase
    .from('student_profiles')
    .select('id, display_name, student_id')
    .eq('owner_id', ownerId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  return (data ?? []).map(row => ({ id: row.id, displayName: row.display_name, studentId: row.student_id }));
}

// Recorded once at signup (src/auth.ts) and never changed afterward —
// determines the student cap (server-enforced, see api/profile/save.ts)
// and which owner-facing view App.tsx renders (dashboard+switcher vs. the
// clinician roster).
export async function getMyOwnerType(ownerId: string): Promise<OwnerType> {
  const { data } = await supabase.from('owners').select('owner_type').eq('id', ownerId).maybeSingle();
  return (data?.owner_type as OwnerType | undefined) ?? 'parent';
}

export async function extractProfile(description: string): Promise<ExtractedProfileDraft> {
  const { draft } = await callApi<{ draft: ExtractedProfileDraft }>('/api/profile/extract', { description });
  return draft;
}

export async function saveProfile(profile: StudentProfileInput): Promise<ProfileSummary> {
  const res = await callApi<{ id: string; displayName: string }>('/api/profile/save', { profile });
  return { id: res.id, displayName: res.displayName, studentId: null };
}
