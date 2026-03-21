import { useState, FormEvent, ChangeEvent } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { calculateFileHash } from '../lib/integrity';
import { generatePDFPreview } from '../lib/pdf-preview-generator';
import { ClassLevel, ExamType, Session } from '../types';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://aaayzhvqgqptgqaxxbdh.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl6aHZxZ3FwdGdxYXh4YmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NzAwNDksImV4cCI6MjA4ODA0NjA0OX0.NNKOn17jGZHEbBKBnX3oxVhSYJhKm28QSOkK76I0bgo'
);

interface FormData {
  title: string;
  subject: string;
  classLevel: ClassLevel | '';
  series: string;  // For 1ère and Tle only
  year: number;
  examType: ExamType | '';
  session: Session | '';
  tags: string;
  description: string;
}

interface FormErrors {
  [key: string]: string;
}

const CLASS_LEVELS = [
  "Sixième", "Cinquième", "Quatrième", "Troisième",  // Collège (Middle School)
  "Seconde", "Première", "Terminale"  // Lycée (High School) - without series
];

const SERIES = ["A", "C", "D", "E"];  // For Première and Terminale only

const EXAM_TYPES: ExamType[] = ["Baccalauréat", "Composition", "Devoir", "Interro"];

const SESSIONS: Session[] = ["1st Semester", "2nd Semester", "Annual"];

const SUBJECTS = [
  "Mathématiques",
  "Physique",
  "Chimie",
  "SVT",
  "Français",
  "Anglais",
  "Histoire",
  "Géographie",
  "Philosophie",
  "Informatique"
];

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState<FormData>({
    title: '',
    subject: '',
    classLevel: '',
    series: '',
    year: new Date().getFullYear(),
    examType: '',
    session: '',
    tags: '',
    description: ''
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (selectedFile.type !== 'application/pdf') {
      setErrors({ ...errors, file: 'Please select a PDF file' });
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setErrors({ ...errors, file: 'File size must be less than 50MB' });
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    setFileSize(formatBytes(selectedFile.size));

    // Clear file error if any
    const newErrors = { ...errors };
    delete newErrors.file;
    setErrors(newErrors);
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) || new Date().getFullYear() : value
    }));

    // Clear error for this field
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!file) {
      newErrors.file = 'Please select a PDF file';
    }

    if (!formData.title.trim() || formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.subject) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.classLevel) {
      newErrors.classLevel = 'Class level is required';
    }

    // Validate series for Première and Terminale
    if ((formData.classLevel === 'Première' || formData.classLevel === 'Terminale') && !formData.series) {
      newErrors.series = 'Series is required for Première and Terminale';
    }

    if (!formData.year || formData.year < 2000 || formData.year > 2100) {
      newErrors.year = 'Year must be between 2000 and 2100';
    }

    if (!formData.examType) {
      newErrors.examType = 'Exam type is required';
    }

    if (!formData.session) {
      newErrors.session = 'Session is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFile(null);
    setFileName('');
    setFileSize('');
    setFormData({
      title: '',
      subject: '',
      classLevel: '',
      series: '',
      year: new Date().getFullYear(),
      examType: '',
      session: '',
      tags: '',
      description: ''
    });
    setErrors({});
    setUploadProgress(0);

    // Reset file input
    const fileInput = document.getElementById('pdf-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !file) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      console.log('🚀 Starting upload process...');
      console.log('📄 File:', file.name, file.size, 'bytes');
      console.log('📋 Form data:', formData);

      // Calculate content hash
      console.log('🔐 Calculating content hash...');
      const contentHash = await calculateFileHash(file);
      console.log('✅ Content hash:', contentHash);

      // Simulate progress for upload (Firebase doesn't provide real-time progress easily)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Combine class level and series for Première and Terminale
      const fullClassLevel = (formData.classLevel === 'Première' || formData.classLevel === 'Terminale') && formData.series
        ? `${formData.classLevel} ${formData.series}`
        : formData.classLevel;

      console.log('📋 Full class level:', fullClassLevel);

      // Upload PDF to Supabase Storage directly
      console.log('📤 Uploading PDF to Supabase Storage...');
      const fileName = `${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('exam-papers')
        .upload(fileName, file);

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: { publicUrl: fileUrl } } = supabase.storage
        .from('exam-papers')
        .getPublicUrl(fileName);

      console.log('✅ PDF uploaded, URL:', fileUrl);

      clearInterval(progressInterval);
      setUploadProgress(70);

      // Generate and upload preview
      console.log('🖼️ Generating preview...');
      let previewUrl = null;
      try {
        const previewBlob = await generatePDFPreview(file);
        const previewFileName = `preview_${fileName}.png`;

        const { error: previewError } = await supabase.storage
          .from('exam-papers')
          .upload(previewFileName, previewBlob);

        if (!previewError) {
          const { data: { publicUrl } } = supabase.storage
            .from('exam-papers')
            .getPublicUrl(previewFileName);
          previewUrl = publicUrl;
          console.log('✅ Preview generated:', previewUrl);
        }
      } catch (previewError) {
        console.warn('⚠️ Preview generation failed (non-fatal):', previewError);
      }

      setUploadProgress(90);

      // Create database record directly via Supabase
      console.log('💾 Creating database record...');
      const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

      const { data: insertedData, error: dbError } = await supabase
        .from('exam_papers')
        .insert({
          title: formData.title.trim(),
          subject: formData.subject,
          class_level: fullClassLevel,
          year: formData.year,
          exam_type: formData.examType,
          session: formData.session,
          file_url: fileUrl,
          file_name: file.name,
          file_size: file.size,
          file_size_formatted: formatBytes(file.size),
          content_hash: contentHash,
          preview_url: previewUrl,
          tags: tags,
          description: formData.description.trim() || null,
          downloads: 0
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database error:', dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      const paperId = insertedData.id;

      console.log('✅ Database record created, ID:', paperId);

      setUploadProgress(100);
      toast.success('Exam paper uploaded successfully!');

      // Reset form after short delay
      setTimeout(() => {
        resetForm();
        setUploading(false);
      }, 1000);

    } catch (error) {
      console.error('❌ Upload error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        fullError: error
      });
      toast.error(error instanceof Error ? error.message : 'Failed to upload exam paper');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
      {/* File Upload Section */}
      <div className="bg-[#1a1d2e] rounded-lg border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5" />
          PDF File
        </h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="pdf-file"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Select PDF File *
            </label>
            <input
              id="pdf-file"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-sm text-gray-300 border border-gray-700 rounded-lg cursor-pointer bg-[#0f1117] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {errors.file && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.file}
              </p>
            )}
          </div>

          {fileName && (
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {fileName}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    File Size: {fileSize}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metadata Section */}
      <div className="bg-[#1a1d2e] rounded-lg border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Paper Metadata
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleInputChange}
              disabled={uploading}
              placeholder="e.g., Baccalauréat Mathématiques 2023"
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
              Subject *
            </label>
            <select
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              disabled={uploading}
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" style="background:#1a1d2e;color:#e2e8f0">Select subject</option>
              {SUBJECTS.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            {errors.subject && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.subject}
              </p>
            )}
          </div>

          {/* Class Level */}
          <div>
            <label htmlFor="classLevel" className="block text-sm font-medium text-gray-300 mb-2">
              Classe *
            </label>
            <select
              id="classLevel"
              name="classLevel"
              value={formData.classLevel}
              onChange={handleInputChange}
              disabled={uploading}
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" style="background:#1a1d2e;color:#e2e8f0">Sélectionner la classe</option>
              {CLASS_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
            {errors.classLevel && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.classLevel}
              </p>
            )}
          </div>

          {/* Series (only for 1ère and Tle) */}
          {(formData.classLevel === 'Première' || formData.classLevel === 'Terminale') && (
            <div>
              <label htmlFor="series" className="block text-sm font-medium text-gray-300 mb-2">
                Série *
              </label>
              <select
                id="series"
                name="series"
                value={formData.series}
                onChange={handleInputChange}
                disabled={uploading}
                className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="" style="background:#1a1d2e;color:#e2e8f0">Sélectionner la série</option>
                {SERIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.series && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.series}
                </p>
              )}
            </div>
          )}

          {/* Year */}
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-300 mb-2">
              Année *
            </label>
            <input
              id="year"
              name="year"
              type="number"
              value={formData.year}
              onChange={handleInputChange}
              disabled={uploading}
              min="2000"
              max="2100"
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {errors.year && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.year}
              </p>
            )}
          </div>

          {/* Exam Type */}
          <div>
            <label htmlFor="examType" className="block text-sm font-medium text-gray-300 mb-2">
              Exam Type *
            </label>
            <select
              id="examType"
              name="examType"
              value={formData.examType}
              onChange={handleInputChange}
              disabled={uploading}
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" style="background:#1a1d2e;color:#e2e8f0">Select exam type</option>
              {EXAM_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            {errors.examType && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.examType}
              </p>
            )}
          </div>

          {/* Session */}
          <div>
            <label htmlFor="session" className="block text-sm font-medium text-gray-300 mb-2">
              Session *
            </label>
            <select
              id="session"
              name="session"
              value={formData.session}
              onChange={handleInputChange}
              disabled={uploading}
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" style="background:#1a1d2e;color:#e2e8f0">Select session</option>
              {SESSIONS.map(session => (
                <option key={session} value={session}>{session}</option>
              ))}
            </select>
            {errors.session && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.session}
              </p>
            )}
          </div>

          {/* Tags */}
          <div className="md:col-span-2">
            <label htmlFor="tags" className="block text-sm font-medium text-gray-300 mb-2">
              Tags (comma-separated)
            </label>
            <input
              id="tags"
              name="tags"
              type="text"
              value={formData.tags}
              onChange={handleInputChange}
              disabled={uploading}
              placeholder="e.g., algebra, geometry, trigonometry"
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description (optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              disabled={uploading}
              rows={4}
              placeholder="Additional information about this exam paper..."
              className="w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-[#1a1d2e] rounded-lg border border-gray-800 p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">
                Uploading...
              </span>
              <span className="text-sm font-medium text-primary">
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={resetForm}
          disabled={uploading}
          className="px-6 py-2.5 border border-gray-700 rounded-lg text-gray-300 font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={uploading}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              Upload Paper
            </>
          )}
        </button>
      </div>
    </form>
  );
}
