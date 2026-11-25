import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminService, type ContentSource } from '../services/adminService';
import { ExamPaper } from '../types';
import type { LibraryBook } from '../lib/r2-catalog';
import PapersTable from '../components/PapersTable';
import BooksTable from '../components/BooksTable';
import EditForm from '../components/EditForm';
import SupabaseNotice from '../components/SupabaseNotice';
import { useSupabaseStatus } from '../lib/supabase-status';
import { BookOpen, FileText, Loader2 } from 'lucide-react';

type Tab = 'papers' | 'books';

export default function Papers() {
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('papers');
  const [editingPaper, setEditingPaper] = useState<ExamPaper | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [source, setSource] = useState<ContentSource>('none');
  const supabaseStatus = useSupabaseStatus();

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      setLoading(true);
      const [fetchedPapers, fetchedBooks] = await Promise.all([
        adminService.getAllPapers(),
        adminService.getAllBooks(),
      ]);
      setPapers(fetchedPapers);
      setBooks(fetchedBooks);
      setSource(adminService.getPaperSource());
    } catch (error) {
      console.error('Failed to load library:', error);
      toast.error('Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (paper: ExamPaper) => {
    setEditingPaper(paper);
  };

  const handleEditSuccess = () => {
    setEditingPaper(null);
    loadLibrary();
  };

  const handleEditCancel = () => {
    setEditingPaper(null);
  };

  const handleDelete = async (paper: ExamPaper) => {
    if (!confirm(`Are you sure you want to delete "${paper.title}"?`)) {
      return;
    }

    setDeletingId(paper.id);
    try {
      await adminService.deletePaper(paper.id);
      toast.success('Paper deleted successfully');
      loadLibrary();
    } catch (error) {
      console.error('Failed to delete paper:', error);
      toast.error('Failed to delete paper');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const readOnly = source === 'r2-catalogue';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Manage Library</h1>
        <p className="text-gray-400 mt-1">
          {papers.length} papers · {books.length} books
        </p>
      </div>

      {readOnly ? (
        <SupabaseNotice status={supabaseStatus} className="mb-6">
          Showing the <strong>R2 catalogue</strong> — the same rows the app serves.
          Edit and delete need the database, so they are disabled until the
          Supabase plan is upgraded.
        </SupabaseNotice>
      ) : (
        <SupabaseNotice status={supabaseStatus} className="mb-6" />
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('papers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'papers'
              ? 'bg-indigo-600 text-white'
              : 'bg-[#1a1d2e] text-gray-300 border border-gray-800 hover:bg-[#22252f]'
          }`}
        >
          <FileText className="h-4 w-4" />
          Papers
          <span className="text-xs opacity-80">({papers.length})</span>
        </button>
        <button
          onClick={() => setTab('books')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'books'
              ? 'bg-emerald-600 text-white'
              : 'bg-[#1a1d2e] text-gray-300 border border-gray-800 hover:bg-[#22252f]'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          Books
          <span className="text-xs opacity-80">({books.length})</span>
        </button>
      </div>

      {tab === 'papers' ? (
        <PapersTable
          papers={papers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          deletingId={deletingId}
          readOnly={readOnly}
        />
      ) : (
        <BooksTable books={books} />
      )}

      {/* Edit Modal */}
      {editingPaper && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Edit Paper</h2>
            <EditForm
              paper={editingPaper}
              onSuccess={handleEditSuccess}
              onCancel={handleEditCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
}
