export const RECURRENCE_OPTIONS = [
  { id: 'none', label: 'One time' },
  { id: 'daily', label: 'Every day' },
  { id: 'weekdays', label: 'School days (Mon–Fri)' },
  { id: 'weekly', label: 'Weekly (Saturdays)' },
  { id: 'monthly', label: 'Monthly' },
] as const;

export const ROUTINE_GROUP_OPTIONS = [
  { id: '', label: 'No routine group' },
  { id: 'morning', label: 'Morning routine' },
  { id: 'evening', label: 'Bedtime routine' },
  { id: 'after_school', label: 'After school' },
] as const;

export type RecurrencePreset = (typeof RECURRENCE_OPTIONS)[number]['id'];
export type RoutineGroupId = (typeof ROUTINE_GROUP_OPTIONS)[number]['id'];

export function routineGroupEmoji(group?: string | null): string {
  if (group === 'morning') return '🌅';
  if (group === 'evening') return '🌙';
  if (group === 'after_school') return '🎒';
  return '🔁';
}
