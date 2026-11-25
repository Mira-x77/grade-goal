import { useMemo, useState } from 'react';
import { BookOpen, Download, Search } from 'lucide-react';
import type { LibraryBook } from '../lib/r2-catalog';

interface BooksTableProps {
  books: LibraryBook[];
}

const selectClass =
  'w-full px-3 py-2 border border-gray-700 bg-[#0f1117] text-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm';

/** Read-only book grid backed by `adminService.getAllBooks()`. */
export default function BooksTable({ books }: BooksTableProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [system, setSystem] = useState('');

  const categories = useMemo(
    () => Array.from(new Set(books.map(b => b.category).filter(Boolean))).sort(),
    [books],
  );
  const systems = useMemo(
    () => Array.from(new Set(books.map(b => b.system).filter(Boolean))).sort(),
    [books],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return books.filter(book => {
      if (q) {
        const haystack = `${book.title} ${book.author ?? ''} ${book.subject} ${book.category}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (category && book.category !== category) return false;
      if (system && book.system !== system) return false;
      return true;
    });
  }, [books, search, category, system]);

  const hasFilters = Boolean(search || category || system);

  return (
    <div>
      {/* Search & filters */}
      <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-4 mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search books, authors, subjects..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-700 bg-[#0f1117] text-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm placeholder-gray-600"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select value={category} onChange={e => setCategory(e.target.value)} className={selectClass}>
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={system} onChange={e => setSystem(e.target.value)} className={selectClass}>
            <option value="">All Systems</option>
            {systems.map(s => (
              <option key={s} value={s}>{s.toUpperCase()}</option>
            ))}
          </select>
        </div>
        {hasFilters && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {filtered.length} of {books.length} books shown
            </span>
            <button
              onClick={() => {
                setSearch('');
                setCategory('');
                setSystem('');
              }}
              className="text-sm text-indigo-400 hover:underline font-semibold"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Count */}
      <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-400" />
          <span className="font-semibold text-gray-200">
            Total: {filtered.length} {filtered.length === 1 ? 'book' : 'books'}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#1a1d2e] border border-gray-800 rounded-xl p-12 text-center">
          <BookOpen className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">
            {hasFilters ? 'No books match your filters' : 'No books found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(book => (
            <div
              key={book.id}
              className="bg-[#1a1d2e] border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors flex flex-col"
            >
              <div className="relative h-52 bg-gray-900 overflow-hidden">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-900/20 to-teal-900/20">
                    <BookOpen className="h-16 w-16 text-gray-700 mb-2" />
                    <span className="text-xs text-gray-600 font-medium">No cover</span>
                  </div>
                )}
              </div>

              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-white mb-2 line-clamp-2 text-sm">{book.title}</h3>
                {book.author && <p className="text-xs text-gray-400 mb-2">{book.author}</p>}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-md text-xs font-semibold uppercase">
                    {book.system}
                  </span>
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-md text-xs font-semibold">
                    {book.subject}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded-md text-xs font-semibold">
                    {book.category}
                  </span>
                  {book.publishedYear && (
                    <span className="px-2 py-0.5 bg-gray-800 text-gray-400 rounded-md text-xs font-semibold">
                      {book.publishedYear}
                    </span>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>{book.fileSizeFormatted}</span>
                </div>
                <a
                  href={book.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4" />
                  View PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
