// Pure, no runtime deps — safe to import from both client (for UX
// messaging, e.g. disabling "Add another student" near the cap) and
// server (api/profile/save.ts, where the cap is actually enforced).

export type OwnerType = 'parent' | 'clinician';

export const STUDENT_CAP: Record<OwnerType, number> = {
  parent: 5,
  clinician: 20,
};

// `currentActiveCount` is the number of active (is_active = true)
// student_profiles rows the owner already has — a Student is a profile,
// with or without a login yet, so that's what counts against the cap.
export function isUnderStudentCap(currentActiveCount: number, ownerType: OwnerType): boolean {
  return currentActiveCount < STUDENT_CAP[ownerType];
}
