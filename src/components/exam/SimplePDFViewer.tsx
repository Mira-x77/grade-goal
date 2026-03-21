import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface SimplePDFViewerProps {
  pdfData: string; // base64 data
  fileName: string;
  onClose: () => void;
}

export function SimplePDFViewer({ pdfData, fileName, onClose }: SimplePDFViewerProps) {
  const [error, setError] = useState('');

  // Create blob URL from base64
  const pdfUrl = `data:application/pdf;base64,${pdfData}`;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-b border-white/10 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-sm truncate">{fileName}</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="absolute inset-0 pt-16">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-4">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title={fileName}
          />
        )}
      </div>
    </div>
  );
}
