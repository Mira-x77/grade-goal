import { useState, ChangeEvent, FormEvent } from 'react';
import { Upload, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import { calculateFileHash } from '../lib/integrity';
import { generatePDFPreview } from '../lib/pdf-preview-generator';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://aaayzhvqgqptgqaxxbdh.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo'
);

const CATEGORIES = ['Textbook', 'Study Guide', 'Reference', 'Practice Book', 'Novel', 'Other'];
const SYSTEMS = [
  { value: 'all',     label: 'All Systems' },
  { value: 'apc',     label: 'APC (Togo)' },
  { value: 'french',  label: 'French' },
  { value: 'english', label: 'English / Nigerian' },
];
const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'French',
  'History', 'Geography', 'Economics', 'Computer Science', 'Literature',
  'Mathématiques', 'Physique', 'Chimie', 'SVT', 'Français', 'Philosophie',
  'General', 'Other'
];

interface FormData {
  title: string;
  author: string;
  subject: string;
  category: string;
  system: string;
  classLevel: string;
  description: string;
  publishedYear: string;
  tags: string;
}

const emptyForm: FormData = {
  title: '', author: '', subject: '', category: '', system: 'all',
  classLevel: '', description: '', publishedYear: '', tags: ''
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default function BookUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { setErrors(prev => ({ ...prev, file: 'Must be a PDF file' })); return; }
    if (f.size > 100 * 1024 * 1024) { setErrors(prev => ({ ...prev, file: 'Max file size is 100MB' })); return; }
    setFile(f);
    const newErrors = { ...errors }; delete newErrors.file; setErrors(newErrors);
  };

  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setErrors(prev => ({ ...prev, cover: 'Must be an image file' })); return; }
    setCoverFile(f);
    const newErrors = { ...errors }; delete newErrors.cover; setErrors(newErrors);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) { const newErrors = { ...errors }; delete newErrors[name]; setErrors(newErrors); }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!file) newErrors.file = 'PDF file is required';
    if (!formData.title.trim() || formData.title.trim().length < 2) newErrors.title = 'Title is required (min 2 chars)';
    if (!formData.subject) newErrors.subject = 'Subject is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.system) newErrors.system = 'System is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const reset = () => {
    setFile(null); setCoverFile(null); setFormData(emptyForm); setErrors({}); setProgress(0);
    (document.getElementById('book-pdf') as HTMLInputElement).value = '';
    (document.getElementById('book-cover') as HTMLInputElement).value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate() || !file) return;

    setUploading(true);
    setProgress(0);

    try {
      // 1. Hash
      const contentHash = await calculateFileHash(file);
      setProgress(15);

      // 2. Upload PDF
      const fileName = `books/${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
      const { error: uploadError } = await supabase.storage.from('exam-papers').upload(fileName, file);
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      const { data: { publicUrl: fileUrl } } = supabase.storage.from('exam-papers').getPublicUrl(fileName);
      setProgress(50);

      // 3. Upload cover image (optional)
      let coverUrl: string | null = null;
      if (coverFile) {
        try {
          const coverName = `book-covers/${Date.now()}_${coverFile.name.replace(/\s+/g, '-')}`;
          const { error: coverError } = await supabase.storage.from('exam-papers').upload(coverName, coverFile);
          if (!coverError) {
            const { data: { publicUrl } } = supabase.storage.from('exam-papers').getPublicUrl(coverName);
            coverUrl = publicUrl;
          }
        } catch { /* non-fatal */ }
      } else {
        // Auto-generate cover from PDF first page
        try {
          const previewBlob = await generatePDFPreview(file);
          const previewName = `book-covers/auto_${Date.now()}.png`;
          const { error: previewError } = await supabase.storage.from('exam-papers').upload(previewName, previewBlob);
          if (!previewError) {
            const { data: { publicUrl } } = supabase.storage.from('exam-papers').getPublicUrl(previewName);
            coverUrl = publicUrl;
          }
        } catch { /* non-fatal */ }
      }
      setProgress(80);

      // 4. Insert DB record
      const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      const { error: dbError } = await supabase.from('library_books').insert({
        title: formData.title.trim(),
        author: formData.author.trim() || null,
        subject: formData.subject,
        category: formData.category,
        system: formData.system,
        class_level: formData.classLevel.trim() || null,
        description: formData.description.trim() || null,
        cover_url: coverUrl,
        file_url: fileUrl,
        file_name: file.name,
        file_size: file.size,
        file_size_formatted: formatBytes(file.size),
        content_hash: contentHash,
        tags,
        published_year: formData.publishedYear ? parseInt(formData.publishedYear) : null,
        downloads: 0,
      });

      if (dbError) throw new Error(`Database error: ${dbError.message}`);

      setProgress(100);
      toast.success('Book uploaded successfully!');
      setTimeout(() => { reset(); setUploading(false); }, 800);
    } catch (err) {
      console.error('Book upload error:', err);
      toast.error(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
      {/* PDF File */}
      <div className="bg-[#1a1d2e] rounded-lg border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5" /> Book PDF File
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="book-pdf" className="block text-sm font-medium text-gray-300 mb-2">
              Select PDF File * <span className="text-gray-500">(max 100MB)</span>
            </label>
            <input id="book-pdf" type="file" accept="application/pdf" onChange={handleFileChange} disabled={uploading}
              className="block w-full text-sm text-gray-300 border border-gray-700 rounded-lg cursor-pointer bg-[#0f1117] focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
            {errors.file && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4" />{errors.file}</p>}
            {file && <p className="mt-2 text-xs text-gray-400">{file.name} — {formatBytes(file.size)}</p>}
          </div>

          <div>
            <label htmlFor="book-cover" className="block text-sm font-medium text-gray-300 mb-2">
              Cover Image <span className="text-gray-500">(optional — auto-generated from PDF if not provided)</span>
            </label>
            <input id="book-cover" type="file" accept="image/*" onChange={handleCoverChange} disabled={uploading}
              className="block w-full text-sm text-gray-300 border border-gray-700 rounded-lg cursor-pointer bg-[#0f1117] focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
            {errors.cover && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4" />{errors.cover}</p>}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-[#1a1d2e] rounded-lg border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Book Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
            <input name="title" type="text" value={formData.title} onChange={handleChange} disabled={uploading}
              placeholder="e.g., Mathematics for Senior Secondary Schools"
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
            {errors.title && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4" />{errors.title}</p>}
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Author</label>
            <input name="author" type="text" value={formData.author} onChange={handleChange} disabled={uploading}
              placeholder="e.g., John Smith"
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
          </div>

          {/* Published Year */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Published Year</label>
            <input name="publishedYear" type="number" value={formData.publishedYear} onChange={handleChange} disabled={uploading}
              placeholder={String(new Date().getFullYear())} min="1900" max="2100"
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Subject *</label>
            <select name="subject" value={formData.subject} onChange={handleChange} disabled={uploading}
              className={`w-full px-3 py-2 border rounded-lg bg-[#0f1117] text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${errors.subject ? 'border-red-500' : 'border-gray-700'}`}>
              <option value="">Select subject</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.subject && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4" />{errors.subject}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
            <select name="category" value={formData.category} onChange={handleChange} disabled={uploading}
              className={`w-full px-3 py-2 border rounded-lg bg-[#0f1117] text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${errors.category ? 'border-red-500' : 'border-gray-700'}`}>
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4" />{errors.category}</p>}
          </div>

          {/* System */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Education System *</label>
            <select name="system" value={formData.system} onChange={handleChange} disabled={uploading}
              className={`w-full px-3 py-2 border rounded-lg bg-[#0f1117] text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${errors.system ? 'border-red-500' : 'border-gray-700'}`}>
              {SYSTEMS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            {errors.system && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4" />{errors.system}</p>}
          </div>

          {/* Class Level */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Class Level <span className="text-gray-500">(optional)</span></label>
            <input name="classLevel" type="text" value={formData.classLevel} onChange={handleChange} disabled={uploading}
              placeholder="e.g., SS1, Terminale, 100 Level"
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
          </div>

          {/* Tags */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Tags <span className="text-gray-500">(comma-separated)</span></label>
            <input name="tags" type="text" value={formData.tags} onChange={handleChange} disabled={uploading}
              placeholder="e.g., algebra, calculus, waec"
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">Description <span className="text-gray-500">(optional)</span></label>
            <textarea name="description" value={formData.description} onChange={handleChange} disabled={uploading} rows={3}
              placeholder="Brief description of the book..."
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 resize-none" />
          </div>
        </div>
      </div>

      {/* Progress */}
      {uploading && (
        <div className="bg-[#1a1d2e] rounded-lg border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Uploading book...</span>
            <span className="text-sm font-medium text-indigo-400">{progress}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={reset} disabled={uploading}
          className="px-6 py-2.5 border border-gray-700 rounded-lg text-gray-300 font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={uploading}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
          {uploading ? <><Loader2 className="h-5 w-5 animate-spin" />Uploading...</> : <><Upload className="h-5 w-5" />Upload Book</>}
        </button>
      </div>
    </form>
  );
}
