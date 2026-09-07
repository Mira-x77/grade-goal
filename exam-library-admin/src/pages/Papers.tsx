import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminService } from '../services/adminService';
import { ExamPaper } from '../types';
import PapersTable from '../components/PapersTable';
import EditForm from '../components/EditForm';
import { Loader2 } from 'lucide-react';

export default function Papers() {
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPaper, setEditingPaper] = useState<ExamPaper | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadPapers();
  }, []);

  const loadPapers = async () => {
    try {
      setLoading(true);
      const fetchedPapers = await adminService.getAllPapers();
      setPapers(fetchedPapers);
    } catch (error) {
      console.error('Failed to load papers:', error);
      toast.error('Failed to load papers');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (paper: ExamPaper) => {
    setEditingPaper(paper);
  };

  const handleEditSuccess = () => {
    setEditingPaper(null);
    loadPapers();
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
      loadPapers();
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Manage Papers</h1>
        <p className="text-gray-400 mt-1">View, edit, and delete exam papers ({papers.length} total)</p>
      </div>

      <PapersTable 
        papers={papers} 
        onEdit={handleEdit}
        onDelete={handleDelete} 
        deletingId={deletingId}
      />

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
