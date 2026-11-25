import { OFFICIAL_CLASS_LEVELS, OFFICIAL_EXAM_TYPES } from '@app/lib/library-filters';
import { LYCEE_SERIES_BY_LEVEL } from '@app/lib/subjects-data';
import type { ClassLevel, ExamType } from '../types';

export const ADMIN_CLASS_LEVELS = [...OFFICIAL_CLASS_LEVELS] as ClassLevel[];
export const ADMIN_EXAM_TYPES = [...OFFICIAL_EXAM_TYPES] as ExamType[];

export const ADMIN_SESSIONS = [
  '1er Trimestre',
  '2ème Trimestre',
  '3ème Trimestre',
  'Annuel',
  '1st Semester',
  '2nd Semester',
  'Annual',
  'Regular',
] as const;

export function seriesForClass(level: string): readonly string[] {
  return LYCEE_SERIES_BY_LEVEL[level] ?? [];
}

export function needsSeries(level: string): boolean {
  return level === '2nde' || level === '1ère' || level === 'Tle';
}

export function composeClassLevel(level: string, series: string): string {
  if (needsSeries(level) && series) return `${level} ${series}`;
  return level;
}
