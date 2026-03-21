import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { generatePDFPreview } from './lib/pdf-preview-generator';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface ExamPaper {
  id: string;
  title: string;
  subject: string;
  class_level: string;
  year: number;
  exam_type: string;
  session: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_size_formatted: string;
  preview_url?: string;
  downloads: number;
  created_at: string;
}

export default function Test() {
  const [activeTab, setActiveTab] = useState<'upload' | 'library'>('upload');
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    class_level: '',
    series: '',
    year: new Date().getFullYear(),
    exam_type: '',
    session: '',
    tags: '',
    description: ''
  });

  // Cameroon education system options - MUST match app's ClassLevel type
  const classLevels = ['Sixième', 'Cinquième', 'Quatrième', 'Troisième', 'Seconde', 'Première', 'Terminale'];
  const series = ['A', 'C', 'D', 'E'];
  const subjects = [
    'Mathématiques',
    'Physique',
    'Chimie',
    'SVT',
    'Français',
    'Anglais',
    'Histoire',
    'Géographie',
    'Philosophie',
    'Informatique'
  ];
  const examTypes = ['Baccalauréat', 'Composition', 'Devoir', 'Interro'];
  const sessions = ['1st Semester', '2nd Semester', 'Annual'];

  // Check if series selection should be shown (only for Première and Terminale)
  const showSeriesSelect = formData.class_level === 'Première' || formData.class_level === 'Terminale';
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    if (activeTab === 'library') {
      loadPapers();
    }
  }, [activeTab]);

  const loadPapers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_papers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPapers(data || []);
    } catch (error) {
      console.error('Error loading papers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const generateContentHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Preparing upload...');

    try {
      const fileName = `${Date.now()}_${file.name}`;
      
      setUploadStatus('Calculating file hash...');
      setUploadProgress(10);
      
      const contentHash = await generateContentHash(file);
      console.log('📝 Content hash:', contentHash);
      
      setUploadStatus('Uploading PDF...');
      setUploadProgress(30);
      
      const { error: uploadError } = await supabase.storage
        .from('exam-papers')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('exam-papers')
        .getPublicUrl(fileName);

      setUploadStatus('Generating preview...');
      setUploadProgress(60);

      let previewUrl = null;
      try {
        const previewBlob = await generatePDFPreview(file);
        const previewFileName = `preview_${fileName}.png`;
        
        const { error: previewError } = await supabase.storage
          .from('exam-papers')
          .upload(previewFileName, previewBlob);

        if (!previewError) {
          const { data: { publicUrl: previewPublicUrl } } = supabase.storage
            .from('exam-papers')
            .getPublicUrl(previewFileName);
          previewUrl = previewPublicUrl;
        }
      } catch (previewError) {
        console.error('Preview generation failed:', previewError);
      }

      setUploadStatus('Saving to database...');
      setUploadProgress(80);

      // Combine class_level and series if applicable
      const finalClassLevel = showSeriesSelect && formData.series
        ? `${formData.class_level} ${formData.series}`
        : formData.class_level;

      console.log('📝 Inserting into database:', {
        title: formData.title,
        subject: formData.subject,
        class_level: finalClassLevel,
        year: formData.year,
        exam_type: formData.exam_type,
        session: formData.session,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        content_hash: contentHash,
        preview_url: previewUrl
      });

      const { data: insertedData, error: dbError } = await supabase
        .from('exam_papers')
        .insert({
          title: formData.title,
          subject: formData.subject,
          class_level: finalClassLevel,
          year: formData.year,
          exam_type: formData.exam_type,
          session: formData.session,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          file_size_formatted: formatFileSize(file.size),
          content_hash: contentHash,
          preview_url: previewUrl,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
          description: formData.description,
          downloads: 0
        })
        .select();

      if (dbError) {
        console.error('❌ Database insert error:', dbError);
        throw dbError;
      }

      console.log('✅ Database insert successful:', insertedData);

      setUploadProgress(100);
      setUploadStatus('Upload complete!');
      
      setTimeout(() => {
        setFile(null);
        setFormData({
          title: '',
          subject: '',
          class_level: '',
          series: '',
          year: new Date().getFullYear(),
          exam_type: '',
          session: '',
          tags: '',
          description: ''
        });
        setUploadProgress(0);
        setUploadStatus('');
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm('Are you sure you want to delete this paper?')) return;

    try {
      await supabase.storage.from('exam-papers').remove([fileName]);
      await supabase.from('exam_papers').delete().eq('id', id);
      loadPapers();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const filteredPapers = papers.filter(paper =>
    paper.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    paper.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    paper.class_level.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            ScoreTarget Admin
          </h1>
          <p className="text-blue-200/70">Exam Library Management System</p>
        </div>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/50'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Upload
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`px-8 py-3 rounded-xl font-semibold transition-all ${
              activeTab === 'library'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/50'
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            Library ({papers.length})
          </button>
        </div>

        {activeTab === 'upload' && (
          <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20 shadow-2xl">
            <form onSubmit={handleUpload} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-blue-200">PDF File</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gradient-to-r file:from-blue-500 file:to-purple-500 file:text-white file:cursor-pointer"
                  required
                />
                {file && (
                  <p className="mt-2 text-sm text-green-400">✓ {file.name} ({formatFileSize(file.size)})</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2 text-blue-200">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    placeholder="e.g., Épreuve de Mathématiques - Bac 2024"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-blue-200">Subject</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    required
                  >
                    <option value="" className="bg-slate-800">Select Subject</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject} className="bg-slate-800">{subject}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-blue-200">Class Level</label>
                  <select
                    value={formData.class_level}
                    onChange={(e) => setFormData({...formData, class_level: e.target.value, series: ''})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    required
                  >
                    <option value="" className="bg-slate-800">Select Class</option>
                    {classLevels.map(level => (
                      <option key={level} value={level} className="bg-slate-800">{level}</option>
                    ))}
                  </select>
                </div>

                {showSeriesSelect && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-blue-200">Series</label>
                    <select
                      value={formData.series}
                      onChange={(e) => setFormData({...formData, series: e.target.value})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                      required
                    >
                      <option value="" className="bg-slate-800">Select Series</option>
                      {series.map(s => (
                        <option key={s} value={s} className="bg-slate-800">{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2 text-blue-200">Year</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    min="2000"
                    max={new Date().getFullYear() + 1}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-blue-200">Exam Type</label>
                  <select
                    value={formData.exam_type}
                    onChange={(e) => setFormData({...formData, exam_type: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    required
                  >
                    <option value="" className="bg-slate-800">Select Exam Type</option>
                    {examTypes.map(type => (
                      <option key={type} value={type} className="bg-slate-800">{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-blue-200">Session</label>
                  <select
                    value={formData.session}
                    onChange={(e) => setFormData({...formData, session: e.target.value})}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    required
                  >
                    <option value="" className="bg-slate-800">Select Session</option>
                    {sessions.map(session => (
                      <option key={session} value={session} className="bg-slate-800">{session}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-blue-200">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  placeholder="e.g., mathematics, algebra, calculus"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-blue-200">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  rows={3}
                />
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-center text-blue-200">{uploadStatus}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || !file}
                className="w-full py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-xl font-semibold text-lg shadow-lg shadow-purple-500/50 hover:shadow-purple-500/70 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload Exam Paper'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'library' && (
          <div className="space-y-6">
            <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-white/20">
              <input
                type="text"
                placeholder="Search papers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-blue-200/50"
              />
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-blue-200">Loading papers...</p>
              </div>
            ) : filteredPapers.length === 0 ? (
              <div className="text-center py-12 backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20">
                <p className="text-xl text-blue-200">No papers found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPapers.map((paper) => (
                  <div
                    key={paper.id}
                    className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/30 transition-all"
                  >
                    {paper.preview_url ? (
                      <img
                        src={paper.preview_url}
                        alt={paper.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <svg className="w-16 h-16 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}

                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{paper.title}</h3>
                      <div className="space-y-1 text-sm text-blue-200/70">
                        <p>Subject: {paper.subject}</p>
                        <p>Class: {paper.class_level}</p>
                        <p>Year: {paper.year}</p>
                        <p>Type: {paper.exam_type}</p>
                        <p>Size: {paper.file_size_formatted}</p>
                        <p>Downloads: {paper.downloads}</p>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <a
                          href={paper.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-center text-sm transition-all"
                        >
                          View
                        </a>
                        <a
                          href={paper.file_url}
                          download
                          className="flex-1 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-center text-sm transition-all"
                        >
                          Download
                        </a>
                        <button
                          onClick={() => handleDelete(paper.id, paper.file_name)}
                          className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-center text-sm transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
