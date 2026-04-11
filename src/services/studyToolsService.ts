import { supabase } from '@/integrations/supabase/client';

export interface TopQuestion   { question: string; frequency: string }
export interface KeyTopic      { topic: string; weight: string; hint: string }
export interface CheatSheetItem{ item: string; detail: string }
export interface SolutionItem  { question: string; steps: string[] }
export interface PracticeTest  { question: string; type: string; marks: number }
export interface WeakSpot      { area: string; why: string; tip: string }

export interface StudyToolContent {
  topQuestions:    TopQuestion[];
  keyTopics:       KeyTopic[];
  cheatSheet:      CheatSheetItem[];
  stepBySolutions: SolutionItem[];
  practiceTests:   PracticeTest[];
  weakSpots:       WeakSpot[];
}

const LOCAL_CACHE_KEY = (subject: string, classLevel: string) =>
  `study_tools_${subject}_${classLevel}`.replace(/\s+/g, '_').toLowerCase();

export async function fetchStudyTools(
  subject: string,
  classLevel: string
): Promise<StudyToolContent> {
  // 1. Check localStorage first (instant load on revisit)
  const localKey = LOCAL_CACHE_KEY(subject, classLevel);
  const local = localStorage.getItem(localKey);
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (parsed?.topQuestions) return parsed as StudyToolContent;
    } catch { /* ignore */ }
  }

  // 2. Call Edge Function (which handles Supabase cache + Gemini)
  const { data, error } = await supabase.functions.invoke('generate-study-tools', {
    body: { subject, classLevel },
  });

  if (error) throw new Error(error.message);
  if (!data?.content) throw new Error('No content returned');

  const content = data.content as StudyToolContent;

  // 3. Save to localStorage for instant future loads
  localStorage.setItem(localKey, JSON.stringify(content));

  return content;
}
