import { useEffect, useState } from 'react';
import { 
  Upload, 
  Download, 
  Smartphone, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Plus,
  Calendar,
  FileText,
  Bug,
  Sparkles,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { appUpdatesService, type AppUpdate, type NewAppUpdate } from '../services/appUpdatesService';

interface UploadForm {
  versionName: string;
  versionCode: number;
  releaseNotes: string;
  bugFixes: string;
  newFeatures: string;
  isMandatory: boolean;
  minSupportedVersion: number | null;
}

export default function AppUpdates() {
  const [updates, setUpdates] = useState<AppUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [uploadForm, setUploadForm] = useState<UploadForm>({
    versionName: '',
    versionCode: 0,
    releaseNotes: '',
    bugFixes: '',
    newFeatures: '',
    isMandatory: false,
    minSupportedVersion: null
  });

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    try {
      setLoading(true);
      const data = await appUpdatesService.getAllUpdates();
      setUpdates(data);
    } catch (error) {
      console.error('Failed to load updates:', error);
      toast.error('Failed to load updates');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.apk')) {
        toast.error('Please select an APK file');
        return;
      }
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast.error('File size must be less than 100MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Please select an APK file');
      return;
    }

    if (!uploadForm.versionName || !uploadForm.versionCode || !uploadForm.releaseNotes) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const updateData: NewAppUpdate = {
        versionName: uploadForm.versionName,
        versionCode: uploadForm.versionCode,
        releaseNotes: uploadForm.releaseNotes,
        bugFixes: uploadForm.bugFixes || undefined,
        newFeatures: uploadForm.newFeatures || undefined,
        isMandatory: uploadForm.isMandatory,
        minSupportedVersion: uploadForm.minSupportedVersion || undefined,
        apkFile: selectedFile
      };

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await appUpdatesService.uploadUpdate(updateData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      toast.success('Update uploaded successfully!');
      closeUploadForm();
      loadUpdates();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload update');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const closeUploadForm = () => {
    setShowUploadForm(false);
    setSelectedFile(null);
    setUploadForm({
      versionName: '',
      versionCode: 0,
      releaseNotes: '',
      bugFixes: '',
      newFeatures: '',
      isMandatory: false,
      minSupportedVersion: null
    });
  };

  const toggleUpdateStatus = async (update: AppUpdate) => {
    try {
      await appUpdatesService.toggleUpdateStatus(update.id);
      toast.success(`Update ${update.is_active ? 'deactivated' : 'activated'} successfully`);
      loadUpdates();
    } catch (error) {
      console.error('Failed to toggle update status:', error);
      toast.error('Failed to toggle update status');
    }
  };

  const deleteUpdate = async (update: AppUpdate) => {
    if (!confirm(`Are you sure you want to delete version ${update.version_name}? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(update.id);
    try {
      await appUpdatesService.deleteUpdate(update.id);
      toast.success('Update deleted successfully');
      loadUpdates();
    } catch (error) {
      console.error('Failed to delete update:', error);
      toast.error('Failed to delete update');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Smartphone className="h-8 w-8 text-indigo-400" />
              App Updates
            </h1>
            <p className="text-gray-400 mt-1">Manage mobile app updates and releases</p>
          </div>
          <button
            onClick={() => setShowUploadForm(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <Plus className="h-5 w-5" />
            Upload New Update
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6">
          <div className="bg-green-500/10 p-3 rounded-lg w-fit mb-4">
            <CheckCircle className="h-6 w-6 text-green-400" />
          </div>
          <h3 className="text-gray-400 text-sm font-semibold mb-1">Active Updates</h3>
          <p className="text-3xl font-bold text-white">
            {updates.filter(u => u.is_active).length}
          </p>
        </div>

        <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6">
          <div className="bg-blue-500/10 p-3 rounded-lg w-fit mb-4">
            <Download className="h-6 w-6 text-blue-400" />
          </div>
          <h3 className="text-gray-400 text-sm font-semibold mb-1">Total Updates</h3>
          <p className="text-3xl font-bold text-white">{updates.length}</p>
        </div>

        <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6">
          <div className="bg-orange-500/10 p-3 rounded-lg w-fit mb-4">
            <AlertCircle className="h-6 w-6 text-orange-400" />
          </div>
          <h3 className="text-gray-400 text-sm font-semibold mb-1">Mandatory Updates</h3>
          <p className="text-3xl font-bold text-white">
            {updates.filter(u => u.is_mandatory && u.is_active).length}
          </p>
        </div>
      </div>

      {/* Updates List */}
      <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">All Updates</h2>
        
        {updates.length === 0 ? (
          <div className="text-center py-12">
            <Smartphone className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No updates uploaded yet</h3>
            <p className="text-gray-500 mb-6">Upload your first app update to get started</p>
            <button
              onClick={() => setShowUploadForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Upload First Update
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => (
              <div key={update.id} className="border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
                {/* Update Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-500/10 p-3 rounded-lg">
                      <Smartphone className="h-6 w-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Version {update.version_name}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-400">Code: {update.version_code}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          update.is_active 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {update.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {update.is_mandatory && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                            Mandatory
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleUpdateStatus(update)}
                      className={`p-2 rounded-lg transition-colors ${
                        update.is_active
                          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                          : 'bg-green-500/10 hover:bg-green-500/20 text-green-400'
                      }`}
                      title={update.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {update.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    
                    <button
                      onClick={async () => {
                        try {
                          const url = await appUpdatesService.getDownloadUrl(update.id);
                          window.open(url, '_blank');
                        } catch (error) {
                          toast.error('Failed to get download URL');
                        }
                      }}
                      className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                      title="Download APK"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => deleteUpdate(update)}
                      disabled={deletingId === update.id}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete Update"
                    >
                      {deletingId === update.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Update Content */}
                <div className="space-y-4">
                  {/* Release Notes */}
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                      <FileText className="h-4 w-4" />
                      Release Notes
                    </h4>
                    <p className="text-gray-400 whitespace-pre-line">{update.release_notes}</p>
                  </div>

                  {/* Bug Fixes */}
                  {update.bug_fixes && (
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                        <Bug className="h-4 w-4" />
                        Bug Fixes
                      </h4>
                      <p className="text-gray-400 whitespace-pre-line">{update.bug_fixes}</p>
                    </div>
                  )}

                  {/* New Features */}
                  {update.new_features && (
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                        <Sparkles className="h-4 w-4" />
                        New Features
                      </h4>
                      <p className="text-gray-400 whitespace-pre-line">{update.new_features}</p>
                    </div>
                  )}
                </div>

                {/* Update Footer */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(update.created_at)}
                    </span>
                    <span>Size: {formatFileSize(update.apk_file_size)}</span>
                    {update.min_supported_version && (
                      <span>Min Version: {update.min_supported_version}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Upload New Update</h2>
              <button
                onClick={closeUploadForm}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={uploadUpdate} className="space-y-6">
              {/* Version Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Version Name *
                  </label>
                  <input
                    type="text"
                    value={uploadForm.versionName}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, versionName: e.target.value }))}
                    placeholder="e.g., 1.2.3"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Version Code *
                  </label>
                  <input
                    type="number"
                    value={uploadForm.versionCode || ''}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, versionCode: parseInt(e.target.value) || 0 }))}
                    placeholder="e.g., 123"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* APK File */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  APK File *
                </label>
                <input
                  type="file"
                  accept=".apk"
                  onChange={handleFileSelect}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer hover:file:bg-indigo-700"
                  required
                />
                {selectedFile && (
                  <p className="text-sm text-gray-400 mt-2">
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              {/* Release Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Release Notes *
                </label>
                <textarea
                  value={uploadForm.releaseNotes}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, releaseNotes: e.target.value }))}
                  placeholder="What's new in this version..."
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  required
                />
              </div>

              {/* Bug Fixes */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Bug Fixes
                </label>
                <textarea
                  value={uploadForm.bugFixes}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, bugFixes: e.target.value }))}
                  placeholder="List of bugs fixed in this version..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {/* New Features */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  New Features
                </label>
                <textarea
                  value={uploadForm.newFeatures}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, newFeatures: e.target.value }))}
                  placeholder="New features added in this version..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Options */}
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={uploadForm.isMandatory}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, isMandatory: e.target.checked }))}
                    className="w-5 h-5 text-indigo-600 bg-gray-800 border-gray-700 rounded focus:ring-indigo-500"
                  />
                  <span className="text-gray-300 font-semibold">Mandatory Update</span>
                  <span className="text-sm text-gray-500">(Users must update to continue using the app)</span>
                </label>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Minimum Supported Version Code
                  </label>
                  <input
                    type="number"
                    value={uploadForm.minSupportedVersion || ''}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, minSupportedVersion: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="Minimum version that can update to this version"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-300">Uploading...</span>
                    <span className="text-sm text-indigo-400">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Please don't close this window while uploading
                  </p>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeUploadForm}
                  disabled={uploading}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      Upload Update
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}