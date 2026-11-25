import { useState, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { autoCategorizeFile, AutoCategoryResult } from '../lib/auto-categorize';
import { adminService } from '../services/adminService';
import { ClassLevel, ExamType, Session, AcademicSystem } from '../types';
import { ADMIN_CLASS_LEVELS, ADMIN_EXAM_TYPES, ADMIN_SESSIONS } from '../lib/class-catalog';
import { calculateFileHash } from '../lib/integrity';
import { generatePDFPreview } from '../lib/pdf-preview-generator';
import { storageAdapter } from '../lib/storage-adapter';
import { useStorageTarget } from '../lib/storage-target';
import StorageTargetSelect from './StorageTargetSelect';
// import { supabase } from '../lib/supabaseClient';

interface ProcessedFile extends AutoCategoryResult {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  previewUrl?: string; // local object URL for UI
}

interface MassUploadProps {
  systemFilter: AcademicSystem;
  systemLabel: string;
}

const CLASS_LEVELS = ADMIN_CLASS_LEVELS;
const EXAM_TYPES = ADMIN_EXAM_TYPES;
const SESSIONS = [...ADMIN_SESSIONS];

const SUBJECTS = [
  "Mathématiques", "Physique", "Chimie", "SVT", "PCT",
  "Français", "Anglais", "Histoire", "Géographie", "ECM", 
  "Philosophie", "Informatique"
];

export default function MassUpload({ systemFilter, systemLabel }: MassUploadProps) {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [target] = useStorageTarget();

  const processFiles = async (newFiles: File[]) => {
    setIsProcessing(true);
    
    // Process one by one to avoid locking the UI completely
    for (const file of newFiles) {
      if (file.type !== 'application/pdf') {
        toast.error(`Skipped ${file.name}: Not a PDF file`);
        continue;
      }
      
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`Skipped ${file.name}: Exceeds 50MB limit`);
        continue;
      }

      const category = await autoCategorizeFile(file);
      
      setFiles(prev => [...prev, {
        id: Math.random().toString(36).substring(7),
        file,
        status: 'pending',
        ...category,
        system: systemFilter  // Lock to selected system
      }]);
    }
    
    setIsProcessing(false);
  };

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(Array.from(e.target.files));
    }
    // reset input
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileMeta = (id: string, field: keyof AutoCategoryResult, value: any) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const uploadAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
    if (pendingFiles.length === 0) return;

    // Validation
    const invalidFiles = pendingFiles.filter(f => !f.title || !f.classLevel || !f.subject || !f.examType || !f.session || !f.system);
    if (invalidFiles.length > 0) {
      toast.error(`${invalidFiles.length} files have missing required metadata fields (including System).`);
      return;
    }

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'success') continue;

      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f));

      try {
        const fileData = files[i];
        
        // 1. Calculate hash
        const contentHash = await calculateFileHash(fileData.file);
        
        // 2. Upload PDF
        // const fileName = `${Date.now()}_${fileData.file.name.replace(/\s+/g, '-')}`;
        // const storagePath = `${fileData.classLevel.replace(/\s+/g, '-')}/${fileData.subject.replace(/\s+/g, '-')}/${fileData.year}/${fileName}`;
        
        // Use direct supabase upload to match UploadForm behavior or just use adminService.uploadPDF but adminService uses original file.name
        // We will just use adminService and let it do its thing
        const fileUrl = await adminService.uploadPDF(fileData.file, {
          title: fileData.title,
          classLevel: fileData.classLevel as ClassLevel,
          subject: fileData.subject,
          year: fileData.year,
          examType: fileData.examType as ExamType,
          session: fileData.session as Session,
          tags: [],
          contentHash: contentHash
        });

        // 3. Generate and upload preview
        let previewUrl: string | undefined = undefined;
        try {
          const previewBlob = await generatePDFPreview(fileData.file);
          const previewFileName = `preview_${Date.now()}_${fileData.file.name.replace(/\s+/g, '-')}.png`;
          previewUrl = await storageAdapter.uploadFile(previewFileName, previewBlob, {
            contentType: 'image/png',
          });
        } catch (err) {
          console.warn('Failed to generate preview for', fileData.file.name, err);
        }

        // 4. Create DB Record
        try {
          await adminService.createPaper({
            title: fileData.title,
            subject: fileData.subject,
            classLevel: fileData.classLevel as ClassLevel,
            year: fileData.year,
            examType: fileData.examType as ExamType,
            session: fileData.session as Session,
            system: fileData.system as AcademicSystem,
            fileUrl: fileUrl,
            fileName: fileData.file.name,
            fileSize: fileData.file.size,
            contentHash: contentHash,
            tags: [],
            previewUrl: previewUrl
          });
        } catch (dbError) {
          // No row -> roll back the files we just stored.
          for (const url of [previewUrl, fileUrl]) {
            if (!url) continue;
            await storageAdapter.deleteFile(url).catch((cleanupError) => {
              console.warn('⚠️ Could not roll back stored file:', url, cleanupError);
            });
          }
          throw dbError;
        }

        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'success' } : f));
      } catch (error: any) {
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', errorMessage: error.message } : f));
      }
    }

    setIsUploading(false);
    toast.success('Mass upload complete!');
  };

  const pendingCount = files.filter(f => f.status === 'pending' || f.status === 'error').length;
  const successCount = files.filter(f => f.status === 'success').length;

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-700 bg-[#1a1d2e] hover:border-gray-600'
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-[#0f1117] rounded-full">
            {isProcessing ? (
              <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-indigo-400" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              {isProcessing ? 'Analyzing PDFs...' : `Upload ${systemLabel} Papers`}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Drag and drop multiple PDFs here to auto-categorize them.
            </p>
            <div className="mt-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full inline-block">
              <span className="text-xs font-semibold text-indigo-300">System: {systemLabel}</span>
            </div>
          </div>
          <label className="relative inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors disabled:opacity-50">
            <span>Browse Files</span>
            <input 
              type="file" 
              multiple 
              accept="application/pdf" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              onChange={handleFileSelect}
              disabled={isProcessing || isUploading}
            />
          </label>
        </div>
      </div>

      {/* Destination */}
      <StorageTargetSelect disabled={isUploading || isProcessing} />

      {/* Stats & Action */}
      {files.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-[#1a1d2e] p-4 rounded-xl border border-gray-800 gap-4">
          <div className="flex gap-4">
            <div className="text-center px-4 py-2 bg-[#0f1117] rounded-lg border border-gray-800">
              <p className="text-xs text-gray-500 font-medium">Total Files</p>
              <p className="text-xl font-bold text-white">{files.length}</p>
            </div>
            <div className="text-center px-4 py-2 bg-[#0f1117] rounded-lg border border-gray-800">
              <p className="text-xs text-gray-500 font-medium">Pending</p>
              <p className="text-xl font-bold text-yellow-400">{pendingCount}</p>
            </div>
            <div className="text-center px-4 py-2 bg-[#0f1117] rounded-lg border border-gray-800">
              <p className="text-xs text-gray-500 font-medium">Uploaded</p>
              <p className="text-xl font-bold text-green-400">{successCount}</p>
            </div>
          </div>
          
          <button
            onClick={uploadAll}
            disabled={pendingCount === 0 || isUploading || isProcessing}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Uploading...</>
            ) : (
              <><Play className="h-5 w-5 fill-current" /> Confirm &amp; Upload {pendingCount} Files{target === 'r2' ? ' to R2' : ' to Supabase'}</>
            )}
          </button>
        </div>
      )}

      {/* Review Table */}
      {files.length > 0 && (
        <div className="bg-[#1a1d2e] rounded-xl border border-gray-800 overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#0f1117] text-gray-400 border-b border-gray-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold min-w-[200px]">File / Title</th>
                <th className="px-4 py-3 font-semibold w-[150px]">Class</th>
                <th className="px-4 py-3 font-semibold w-[150px]">Subject</th>
                <th className="px-4 py-3 font-semibold w-[120px]">Year</th>
                <th className="px-4 py-3 font-semibold w-[150px]">Type</th>
                <th className="px-4 py-3 font-semibold w-[150px]">Session</th>
                <th className="px-4 py-3 font-semibold">Match</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {files.map((file) => (
                <tr key={file.id} className={`hover:bg-white/[0.02] transition-colors ${file.status === 'success' ? 'bg-green-900/10' : ''}`}>
                  <td className="px-4 py-3">
                    {file.status === 'pending' && <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block mr-2"></span>}
                    {file.status === 'uploading' && <Loader2 className="h-4 w-4 text-indigo-400 animate-spin inline-block mr-2" />}
                    {file.status === 'success' && <CheckCircle className="h-4 w-4 text-green-400 inline-block mr-2" />}
                    {file.status === 'error' && <AlertCircle className="h-4 w-4 text-red-400 inline-block mr-2" />}
                    <span className="capitalize text-gray-400 text-xs">{file.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-500 text-xs truncate max-w-[200px]" title={file.file.name}>{file.file.name}</span>
                      <input 
                        type="text" 
                        value={file.title} 
                        onChange={e => updateFileMeta(file.id, 'title', e.target.value)}
                        disabled={file.status === 'success' || file.status === 'uploading'}
                        className="bg-transparent border-b border-gray-700 focus:border-indigo-500 outline-none text-white w-full px-1"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select 
                      value={file.classLevel} 
                      onChange={e => updateFileMeta(file.id, 'classLevel', e.target.value)}
                      disabled={file.status === 'success' || file.status === 'uploading'}
                      className={`bg-[#0f1117] border rounded px-2 py-1 text-xs w-full outline-none ${!file.classLevel ? 'border-red-500/50 text-red-400' : 'border-gray-700 text-gray-300'}`}
                    >
                      <option value="">Select...</option>
                      {CLASS_LEVELS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select 
                      value={file.subject} 
                      onChange={e => updateFileMeta(file.id, 'subject', e.target.value)}
                      disabled={file.status === 'success' || file.status === 'uploading'}
                      className={`bg-[#0f1117] border rounded px-2 py-1 text-xs w-full outline-none ${!file.subject ? 'border-red-500/50 text-red-400' : 'border-gray-700 text-gray-300'}`}
                    >
                      <option value="">Select...</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input 
                      type="number" 
                      value={file.year} 
                      onChange={e => updateFileMeta(file.id, 'year', parseInt(e.target.value) || new Date().getFullYear())}
                      disabled={file.status === 'success' || file.status === 'uploading'}
                      className="bg-[#0f1117] border border-gray-700 text-gray-300 rounded px-2 py-1 text-xs w-full outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select 
                      value={file.examType} 
                      onChange={e => updateFileMeta(file.id, 'examType', e.target.value)}
                      disabled={file.status === 'success' || file.status === 'uploading'}
                      className={`bg-[#0f1117] border rounded px-2 py-1 text-xs w-full outline-none ${!file.examType ? 'border-red-500/50 text-red-400' : 'border-gray-700 text-gray-300'}`}
                    >
                      <option value="">Select...</option>
                      {EXAM_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select 
                      value={file.session} 
                      onChange={e => updateFileMeta(file.id, 'session', e.target.value)}
                      disabled={file.status === 'success' || file.status === 'uploading'}
                      className={`bg-[#0f1117] border rounded px-2 py-1 text-xs w-full outline-none ${!file.session ? 'border-red-500/50 text-red-400' : 'border-gray-700 text-gray-300'}`}
                    >
                      <option value="">Select...</option>
                      {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${file.confidence > 80 ? 'bg-green-500' : file.confidence > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${file.confidence}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400">{file.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => removeFile(file.id)}
                      disabled={file.status === 'uploading' || file.status === 'success'}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded disabled:opacity-50 transition-colors"
                      title="Remove from list"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
