import { useState, FormEvent, ChangeEvent } from 'react';
import { Edit, AlertCircle, Loader2, FileText } from 'lucide-react';
import { adminService } from '../services/adminService';
import { ClassLevel, ExamType, Session, ExamPaper } from '../types';
import { toast } from 'sonner';

interface EditFormProps {
  paper: ExamPaper;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  title: string;
  subject: string;
  classLevel: ClassLevel;
  year: number;
  examType: ExamType;
  session: Session;
  tags: string;
  description: string;
}

interface FormErrors {
  [key: string]: string;
}

const CLASS_LEVELS: ClassLevel[] = [
  "Sixième", "Cinquième", "Quatrième", "Troisième",
  "Seconde", "Première D", "Première C", "Terminale D", "Terminale C"
];

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

export default function EditForm({ paper, onSuccess, onCancel }: EditFormProps) {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const [formData, setFormData] = useState<FormData>({
    title: paper.title,
    subject: paper.subject,
    classLevel: paper.classLevel,
    year: paper.year,
    examType: paper.examType,
    session: paper.session,
    tags: paper.tags.join(', '),
    description: paper.description || ''
  });

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) || paper.year : value
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

    if (!formData.title.trim() || formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.subject) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.classLevel) {
      newErrors.classLevel = 'Class level is required';
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setSaving(true);

    try {
      // Update paper metadata
      await adminService.updatePaper(paper.id, {
        title: formData.title.trim(),
        subject: formData.subject,
        classLevel: formData.classLevel,
        year: formData.year,
        examType: formData.examType,
        session: formData.session,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        description: formData.description.trim() || undefined
      });

      toast.success('Paper updated successfully!');
      onSuccess();

    } catch (error) {
      console.error('Update error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update paper');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Immutable Fields Display */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          File Information (Read-only)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">File Name:</span>
            <p className="font-medium text-gray-900 mt-1">{paper.fileName}</p>
          </div>
          <div>
            <span className="text-gray-600">File Size:</span>
            <p className="font-medium text-gray-900 mt-1">{formatBytes(paper.fileSize)}</p>
          </div>
          <div>
            <span className="text-gray-600">Upload Date:</span>
            <p className="font-medium text-gray-900 mt-1">{formatDate(paper.uploadDate)}</p>
          </div>
          <div>
            <span className="text-gray-600">Downloads:</span>
            <p className="font-medium text-gray-900 mt-1">{paper.downloads}</p>
          </div>
          <div className="md:col-span-2">
            <span className="text-gray-600">Paper ID:</span>
            <p className="font-mono text-xs text-gray-900 mt-1 break-all">{paper.id}</p>
          </div>
        </div>
      </div>

      {/* Editable Metadata Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Edit className="h-5 w-5" />
          Edit Paper Metadata
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="md:col-span-2">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleInputChange}
              disabled={saving}
              placeholder="e.g., Baccalauréat Mathématiques 2023"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <select
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select subject</option>
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
            <label htmlFor="classLevel" className="block text-sm font-medium text-gray-700 mb-2">
              Class Level *
            </label>
            <select
              id="classLevel"
              name="classLevel"
              value={formData.classLevel}
              onChange={handleInputChange}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select class level</option>
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

          {/* Year */}
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
              Year *
            </label>
            <input
              id="year"
              name="year"
              type="number"
              value={formData.year}
              onChange={handleInputChange}
              disabled={saving}
              min="2000"
              max="2100"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
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
            <label htmlFor="examType" className="block text-sm font-medium text-gray-700 mb-2">
              Exam Type *
            </label>
            <select
              id="examType"
              name="examType"
              value={formData.examType}
              onChange={handleInputChange}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select exam type</option>
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
            <label htmlFor="session" className="block text-sm font-medium text-gray-700 mb-2">
              Session *
            </label>
            <select
              id="session"
              name="session"
              value={formData.session}
              onChange={handleInputChange}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select session</option>
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
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags (comma-separated)
            </label>
            <input
              id="tags"
              name="tags"
              type="text"
              value={formData.tags}
              onChange={handleInputChange}
              disabled={saving}
              placeholder="e.g., algebra, geometry, trigonometry"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              disabled={saving}
              rows={4}
              placeholder="Additional information about this exam paper..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Edit className="h-5 w-5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}
