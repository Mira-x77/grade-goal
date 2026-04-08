import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aaayzhvqgqptgqaxxbdh.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo';
const supabase = createClient(supabaseUrl, supabaseKey);

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
