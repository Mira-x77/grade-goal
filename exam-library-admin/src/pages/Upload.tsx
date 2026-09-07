import { useState } from 'react';
import UploadForm from '../components/UploadForm';
import MassUpload from '../components/MassUpload';
import BookUploadForm from '../components/BookUploadForm';
import { Upload as UploadIcon, ListPlus, BookOpen, GraduationCap, Globe, School } from 'lucide-react';

type UploadTab = 'apc' | 'french' | 'nigerian' | 'books';

export default function Upload() {
  const [activeTab, setActiveTab] = useState<UploadTab>('apc');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Upload Content</h1>
        <p className="text-gray-400 mt-1">Add exam papers by grading system or upload books</p>
      </div>

      {/* System-specific Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* APC (Togo) Tab */}
        <button
          onClick={() => setActiveTab('apc')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            activeTab === 'apc'
              ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
              : 'bg-[#1a1d2e] border-gray-700 text-gray-400 hover:border-blue-500 hover:bg-blue-500/5'
          }`}
        >
          <School className="h-6 w-6" />
          <div className="text-center">
            <div className="font-bold text-sm">APC</div>
            <div className="text-xs opacity-80">Togolese System</div>
          </div>
        </button>

        {/* French Tab */}
        <button
          onClick={() => setActiveTab('french')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            activeTab === 'french'
              ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20'
              : 'bg-[#1a1d2e] border-gray-700 text-gray-400 hover:border-purple-500 hover:bg-purple-500/5'
          }`}
        >
          <GraduationCap className="h-6 w-6" />
          <div className="text-center">
            <div className="font-bold text-sm">French</div>
            <div className="text-xs opacity-80">AEFE System</div>
          </div>
        </button>

        {/* Nigerian Tab */}
        <button
          onClick={() => setActiveTab('nigerian')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            activeTab === 'nigerian'
              ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-600/20'
              : 'bg-[#1a1d2e] border-gray-700 text-gray-400 hover:border-green-500 hover:bg-green-500/5'
          }`}
        >
          <Globe className="h-6 w-6" />
          <div className="text-center">
            <div className="font-bold text-sm">Nigerian</div>
            <div className="text-xs opacity-80">University System</div>
          </div>
        </button>

        {/* Books Tab */}
        <button
          onClick={() => setActiveTab('books')}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            activeTab === 'books'
              ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-600/20'
              : 'bg-[#1a1d2e] border-gray-700 text-gray-400 hover:border-orange-500 hover:bg-orange-500/5'
          }`}
        >
          <BookOpen className="h-6 w-6" />
          <div className="text-center">
            <div className="font-bold text-sm">Books</div>
            <div className="text-xs opacity-80">Study Materials</div>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        {activeTab === 'apc' && <MassUpload systemFilter="apc" systemLabel="APC (Togo)" />}
        {activeTab === 'french' && <MassUpload systemFilter="french" systemLabel="French (AEFE)" />}
        {activeTab === 'nigerian' && <MassUpload systemFilter="english" systemLabel="Nigerian University" />}
        {activeTab === 'books' && <BookUploadForm />}
      </div>
    </div>
  );
}
