import { useState, useMemo } from 'react';
import { FileText, Trash2, Edit, Download, Eye, Search } from 'lucide-react';
import { ExamPaper, ClassLevel, ExamType } from '../types';

interface FilterCriteria {
  classLevel?: ClassLevel;
  subject?: string;
  year?: number;
  examType?: ExamType;
  search?: string;
}

interface PapersTableProps {
  papers: ExamPaper[];
  onEdit: (paper: ExamPaper) => void;
  onDelete: (paper: ExamPaper) => void;
  deletingId: string | null;
}

const selectClass = "w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm";

export default function PapersTable({ papers, onEdit, onDelete, deletingId }: PapersTableProps) {
  const [filters, setFilters] = useState<FilterCriteria>({});

  const uniqueClassLevels = useMemo(() => Array.from(new Set(papers.map(p => p.classLevel))).sort(), [papers]);
  const uniqueSubjects = useMemo(() => Array.from(new Set(papers.map(p => p.subject))).sort(), [papers]);
  const uniqueYears = useMemo(() => Array.from(new Set(papers.map(p => p.year))).sort((a, b) => b - a), [papers]);
  const uniqueExamTypes = useMemo(() => Array.from(new Set(papers.map(p => p.examType))).sort(), [papers]);

  const filteredPapers = useMemo(() => {
    let result = [...papers];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q) || p.subject.toLowerCase().includes(q) || p.classLevel.toLowerCase().includes(q));
    }
    if (filters.classLevel) result = result.filter(p => p.classLevel === filters.classLevel);
    if (filters.subject) result = result.filter(p => p.subject === filters.subject);
    if (filters.year) result = result.filter(p => p.year === filters.year);
    if (filters.examType) result = result.filter(p => p.examType === filters.examType);
    return result;
  }, [papers, filters]);

  const handleFilterChange = (key: keyof FilterCriteria, value: string) => {
    if (value === '') {
      const f = { ...filters };
      delete f[key];
      setFilters(f);
    } else {
      setFilters({ ...filters, [key]: key === 'year' ? parseInt(value) : value });
    }
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div>
      {/* Search & Filters */}
      <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-4 mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search papers..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm placeholder-gray-600"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={filters.classLevel || ''} onChange={(e) => handleFilterChange('classLevel', e.target.value)} className={selectClass}>
            <option value="">All Levels</option>
            {uniqueClassLevels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={filters.subject || ''} onChange={(e) => handleFilterChange('subject', e.target.value)} className={selectClass}>
            <option value="">All Subjects</option>
            {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.year || ''} onChange={(e) => handleFilterChange('year', e.target.value)} className={selectClass}>
            <option value="">All Years</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filters.examType || ''} onChange={(e) => handleFilterChange('examType', e.target.value)} className={selectClass}>
            <option value="">All Types</option>
            {uniqueExamTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {hasActiveFilters && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{filteredPapers.length} of {papers.length} papers shown</span>
            <button onClick={() => setFilters({})} className="text-sm text-indigo-400 hover:underline font-semibold">Clear Filters</button>
          </div>
        )}
      </div>

      {/* Count */}
      <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-400" />
          <span className="font-semibold text-gray-200">Total: {filteredPapers.length} {filteredPapers.length === 1 ? 'paper' : 'papers'}</span>
        </div>
      </div>

      {/* Grid */}
      {filteredPapers.length === 0 ? (
        <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-12 text-center">
          <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">{hasActiveFilters ? 'No papers found matching your filters' : 'No papers uploaded yet'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPapers.map((paper) => (
            <div key={paper.id} className="bg-[#1a1d2e] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
              {/* Preview */}
              <div className="relative h-52 bg-gray-900 group overflow-hidden">
                {paper.previewUrl ? (
                  <img src={paper.previewUrl} alt={paper.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
                    <FileText className="h-16 w-16 text-gray-700 mb-2" />
                    <span className="text-xs text-gray-600 font-medium">No preview</span>
                  </div>
                )}
                <a href={paper.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex items-center gap-2 text-white bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                    <Eye className="h-5 w-5" />
                    <span className="text-sm font-semibold">View PDF</span>
                  </div>
                </a>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-bold text-white mb-2 line-clamp-2 text-sm">{paper.title}</h3>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md text-xs font-semibold">{paper.subject}</span>
                  <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded-md text-xs font-semibold">{paper.classLevel}</span>
                  <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded-md text-xs font-semibold">{paper.year}</span>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-md text-xs font-semibold">{paper.examType}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-1"><Download className="h-3.5 w-3.5" /><span>{paper.downloads} downloads</span></div>
                  <span>{formatDate(paper.uploadDate)}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onEdit(paper)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors">
                    <Edit className="h-4 w-4" />Edit
                  </button>
                  <button onClick={() => onDelete(paper)} disabled={deletingId === paper.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
