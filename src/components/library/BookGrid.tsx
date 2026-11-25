import { BookCard } from "./BookCard";
import { Loader2, BookOpen } from "lucide-react";
import { LibraryBook, UnifiedDownloadProgress, DownloadStatus } from '@/types/exam-library';

interface BookGridProps {
  books: LibraryBook[];
  onBookClick: (book: LibraryBook) => void;
  loading?: boolean;
  openingId?: string | null;
  downloadStatuses?: Map<string, DownloadStatus>;
  downloadProgresses?: Map<string, UnifiedDownloadProgress>;
  onDownload?: (book: LibraryBook) => void;
  onCancelDownload?: (bookId: string) => void;
}

export function BookGrid({ 
  books, 
  onBookClick, 
  loading, 
  openingId, 
  downloadStatuses, 
  downloadProgresses, 
  onDownload, 
  onCancelDownload, 
}: BookGridProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground mt-3">
          Loading books...
        </p>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-black text-foreground mt-4">No books found</h3>
        <p className="text-sm font-semibold text-muted-foreground text-center mt-2">
          No books found in the database. Books will appear here once they are uploaded via the Admin Portal.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          isOpening={openingId === book.id}
          onClick={() => onBookClick(book)}
          downloadStatus={downloadStatuses?.get(book.id)}
          downloadProgress={downloadProgresses?.get(book.id)}
          onDownload={onDownload ? () => onDownload(book) : undefined}
          onCancelDownload={onCancelDownload ? () => onCancelDownload(book.id) : undefined}
        />
      ))}
    </div>
  );
}
