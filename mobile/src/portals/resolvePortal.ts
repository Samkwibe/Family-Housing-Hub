/** Resolve which portal shell to load from user profile fields. */
export type PortalName = 'renter' | 'owner' | 'child';

export type PortalContextPayload = {
  user_id: string;
  experience_type: string;
  active_portal: string;
  household_id?: string | null;
  property_id?: string | null;
  child_profile_id?: string | null;
  capabilities: string[];
};

export function resolveActivePortal(profile: Record<string, unknown> | null | undefined): PortalName {
  if (!profile) return 'renter';

  const activePortal = String(profile.activePortal || '').toLowerCase();
  if (activePortal === 'owner') return 'owner';
  if (activePortal === 'child' || activePortal === 'teen') return 'child';

  const experienceType = String(profile.experienceType || '').toLowerCase();
  if (experienceType === 'owner') return 'owner';
  if (experienceType === 'child' || experienceType === 'teen') return 'child';

  const userType = String(profile.userType || 'renter').toLowerCase();
  if (userType === 'owner') return 'owner';
  if (userType === 'family') return 'child';

  return 'renter';
}

export function portalLabel(portal: PortalName): string {
  if (portal === 'owner') return 'Owner';
  if (portal === 'child') return 'Child';
  return 'Renter';
}
