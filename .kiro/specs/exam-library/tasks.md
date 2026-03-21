# Implementation Plan: Exam Library

## Overview

This implementation plan breaks down the Exam Library feature into discrete coding tasks. The feature adds cloud-based exam paper management to the ScoreTarget mobile app, with a separate admin panel for content management. Implementation follows an incremental approach: infrastructure setup → data layer → services → mobile UI → admin panel → testing → integration.

## Tasks

- [x] 1. Set up Firebase infrastructure and configuration
  - Install Firebase SDK dependencies (`firebase`, `@capacitor/filesystem`, `@capacitor-community/file-opener`)
  - Create Firebase configuration file with environment variables
  - Set up Firestore and Storage instances
  - Configure Firebase Security Rules for Firestore (public read, admin write)
  - Configure Firebase Storage Rules (public read, admin write)
  - Create Firestore composite indexes configuration
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ] 1.1 Write property test for unique file path generation
  - **Property 1: Unique File Path Generation**
  - **Validates: Requirements 1.3, 1.5**

- [x] 2. Create data models and TypeScript types
  - Define `ExamPaper` interface with all required fields
  - Define `CachedPaper` interface for IndexedDB storage
  - Define `DownloadedPaper` interface for local downloads
  - Define `FilterCriteria`, `DownloadProgress`, and analytics interfaces
  - Define type unions for `ClassLevel`, `ExamType`, `Session`
  - Create validation schemas using Zod
  - _Requirements: 1.4, 2.3, 5.2, 9.2_

- [ ] 2.1 Write property test for complete metadata structure
  - **Property 2: Complete Metadata Structure**
  - **Validates: Requirements 1.4**

- [x] 3. Implement CacheService for IndexedDB operations
  - Initialize IndexedDB with three stores: `papers`, `downloads`, `metadata`
  - Implement `cachePapers()` to store paper metadata
  - Implement `getCachedPapers()` to retrieve cached papers
  - Implement `updateDownloadStatus()` to mark papers as downloaded
  - Implement `saveFilterState()` and `getFilterState()` for filter persistence
  - Implement `clearExpiredCache()` for 24-hour cache invalidation
  - _Requirements: 2.4, 3.5, 18.4_

- [ ] 3.1 Write property test for filter persistence round trip
  - **Property 8: Filter Persistence Round Trip**
  - **Validates: Requirements 3.5**

- [x] 4. Implement filesystem utilities with Capacitor
  - Create `initFilesystem()` to set up exam-papers directory
  - Implement `savePDF()` to write PDF blobs to device storage
  - Implement `deletePDF()` to remove files from device storage
  - Implement `getFileUri()` to get file URIs for opening
  - Implement `getAvailableSpace()` for storage checking (platform-specific)
  - Create helper functions: `blobToBase64()`, `base64ToBlob()`
  - _Requirements: 6.1, 6.7, 9.3, 19.3_

- [x] 5. Implement file integrity and download utilities
  - Create `calculateFileHash()` using SHA-256 for content hashing
  - Implement `verifyDownload()` to check file integrity after download
  - Create `downloadFile()` with progress tracking using fetch API
  - Implement `formatBytes()` for human-readable file sizes
  - _Requirements: 21.3, 22.1, 22.2_

- [ ] 5.1 Write property test for content hash generation
  - **Property 33: Content Hash Generation**
  - **Validates: Requirements 22.1**

- [ ] 5.2 Write property test for download integrity verification
  - **Property 34: Download Integrity Verification (Round Trip)**
  - **Validates: Requirements 22.2, 22.4**

- [ ] 5.3 Write property test for file size formatting
  - **Property 32: File Size Formatting**
  - **Validates: Requirements 21.3**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement ExamService for Firestore operations
  - Implement `fetchPapers()` to retrieve all papers from Firestore with caching
  - Implement `fetchPapersWithFilters()` to query with filter criteria
  - Implement `searchPapers()` for client-side text search
  - Implement `getPaper()` to fetch single paper by ID
  - Implement `getCachedPapers()` to retrieve from IndexedDB in offline mode
  - Implement `incrementDownloadCount()` to update Firestore counter
  - Add retry logic with `fetchWithRetry()` helper
  - _Requirements: 2.1, 2.2, 3.2, 4.2, 6.5_

- [ ] 7.1 Write property test for filter correctness
  - **Property 6: Filter Correctness**
  - **Validates: Requirements 3.3**

- [ ] 7.2 Write property test for filter clear round trip
  - **Property 7: Filter Clear Round Trip**
  - **Validates: Requirements 3.4**

- [ ] 7.3 Write property test for search correctness
  - **Property 9: Search Correctness**
  - **Validates: Requirements 4.2**

- [ ] 7.4 Write property test for combined search and filter
  - **Property 10: Combined Search and Filter**
  - **Validates: Requirements 4.4**

- [x] 8. Implement DownloadService for paper downloads
  - Implement `checkStorageAvailable()` to verify sufficient space
  - Implement `downloadPaper()` with progress callbacks and file saving
  - Implement `cancelDownload()` to abort in-progress downloads
  - Implement `verifyFileIntegrity()` using content hash verification
  - Implement `deletePaper()` to remove downloaded papers
  - Implement `getDownloadedPapers()` to list all downloads
  - Implement `getTotalStorageUsed()` to calculate storage usage
  - Implement `openPDF()` to launch native PDF viewer
  - Add error handling for network failures and storage errors
  - _Requirements: 6.1, 6.2, 6.6, 6.7, 6.8, 7.3, 8.1, 9.3, 9.5_

- [ ] 8.1 Write property test for download persistence
  - **Property 11: Download Persistence**
  - **Validates: Requirements 6.3, 6.4**

- [ ] 8.2 Write property test for download count increment
  - **Property 12: Download Count Increment**
  - **Validates: Requirements 6.5, 14.1**

- [ ] 8.3 Write property test for download cancellation
  - **Property 13: Download Cancellation**
  - **Validates: Requirements 6.8**

- [ ] 8.4 Write property test for paper deletion
  - **Property 15: Paper Deletion**
  - **Validates: Requirements 9.3, 9.4**

- [ ] 8.5 Write property test for storage calculation
  - **Property 16: Storage Calculation**
  - **Validates: Requirements 9.5**

- [x] 9. Implement AnalyticsService for tracking
  - Implement `trackDownload()` to increment counters in Firestore batch
  - Implement `updateStorageAnalytics()` to calculate total storage
  - Implement `updateTopPapers()` to maintain top 10 list
  - Create analytics document structure in Firestore
  - Track daily bandwidth usage in separate documents
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [ ] 9.1 Write property test for total downloads calculation
  - **Property 25: Total Downloads Calculation**
  - **Validates: Requirements 14.3**

- [ ] 9.2 Write property test for top papers ordering
  - **Property 26: Top Papers Ordering**
  - **Validates: Requirements 14.5**

- [ ] 9.3 Write property test for downloads by subject aggregation
  - **Property 27: Downloads by Subject Aggregation**
  - **Validates: Requirements 14.6**

- [ ] 9.4 Write property test for storage usage calculation
  - **Property 28: Storage Usage Calculation**
  - **Validates: Requirements 14.7**

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Create mobile UI components - Paper display
  - Create `PaperCard` component with paper info and download status indicator
  - Create `PaperGrid` component with loading and empty states
  - Create `DownloadProgressBar` component with percentage and cancel button
  - Apply existing design system styles (card-shadow, rounded-2xl, colors)
  - _Requirements: 2.3, 2.5, 6.2, 16.1, 16.3, 17.2_

- [ ] 11.1 Write property test for paper display completeness
  - **Property 4: Paper Display Completeness**
  - **Validates: Requirements 5.2**

- [x] 12. Create mobile UI components - Filters and search
  - Create `PaperFilters` component with dropdowns for classLevel, subject, year, examType
  - Create `PaperSearch` component with debounced input
  - Add clear filters button
  - Implement real-time search filtering
  - _Requirements: 3.1, 3.4, 4.1, 4.3_

- [x] 13. Create Library page
  - Create `Library.tsx` page component with tab navigation integration
  - Integrate `PaperGrid`, `PaperFilters`, and `PaperSearch` components
  - Implement filter state management with persistence
  - Add offline mode detection and indicator
  - Implement loading states and error handling with retry
  - Add "Library" tab to bottom navigation bar
  - _Requirements: 2.1, 2.4, 3.5, 16.2, 17.1, 17.3, 17.4_

- [x] 14. Create Paper Detail page
  - Create `PaperDetail.tsx` page with full metadata display
  - Implement conditional button rendering (Download/Open/Delete)
  - Integrate `DownloadProgressBar` for active downloads
  - Add download action with progress tracking
  - Add open action to launch PDF viewer
  - Add delete action with confirmation dialog
  - Handle all error states (network, storage, viewer)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.6, 8.2, 17.5_

- [ ] 14.1 Write property test for download status UI consistency
  - **Property 5: Download Status UI Consistency**
  - **Validates: Requirements 5.3, 5.4, 5.5**

- [x] 15. Create My Downloads page
  - Create `MyDownloads.tsx` page listing all downloaded papers
  - Display title, subject, fileSize, download date for each paper
  - Implement individual delete with confirmation
  - Implement bulk delete functionality
  - Display total storage used at top
  - Add empty state when no downloads
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 15.1 Write property test for downloaded paper display
  - **Property 14: Downloaded Paper Display**
  - **Validates: Requirements 9.2**

- [ ] 15.2 Write property test for bulk deletion
  - **Property 17: Bulk Deletion**
  - **Validates: Requirements 9.6**

- [x] 16. Add localization for Library feature
  - Add English translations to `src/lib/i18n.ts`
  - Add French translations to `src/lib/i18n.ts`
  - Apply translations to all Library UI components
  - Ensure paper content (titles, descriptions) remains in original language
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [ ] 16.1 Write property test for localization correctness
  - **Property 29: Localization Correctness**
  - **Validates: Requirements 15.1, 15.2**

- [ ] 16.2 Write property test for content language preservation
  - **Property 30: Content Language Preservation**
  - **Validates: Requirements 15.4**

- [x] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Create admin panel - Project setup
  - Create admin panel directory structure (`src/admin/`)
  - Set up admin routes with React Router
  - Create admin authentication with Firebase Auth
  - Implement `ProtectedRoute` component for admin-only access
  - Create admin layout with navigation
  - _Requirements: 10.1, 11.1_

- [x] 19. Implement AdminService for admin operations
  - Implement `uploadPDF()` to upload files to Firebase Storage
  - Implement `createPaper()` to create Firestore documents
  - Implement `updatePaper()` to edit paper metadata
  - Implement `deletePaper()` to remove papers from Storage and Firestore
  - Implement `getStorageAnalytics()` to fetch storage stats
  - Implement `getDownloadAnalytics()` to fetch download stats
  - Implement `getBandwidthUsage()` to fetch daily bandwidth
  - Implement `calculateFileHash()` for upload integrity
  - Add validation with `validatePaperMetadata()` and `validatePDFFile()`
  - _Requirements: 10.3, 10.4, 10.5, 12.3, 13.2, 13.3, 14.2, 14.3, 14.4_

- [x] 19.1 Write property test for upload validation
  - **Property 18: Upload Validation**
  - **Validates: Requirements 10.3**

- [x] 19.2 Write property test for upload creates document
  - **Property 19: Upload Creates Document**
  - **Validates: Requirements 10.5**

- [x] 19.3 Write property test for file metadata extraction
  - **Property 20: File Metadata Extraction**
  - **Validates: Requirements 10.8, 21.1, 21.2**

- [x] 19.4 Write property test for storage-Firestore consistency
  - **Property 3: Storage-Firestore Consistency**
  - **Validates: Requirements 1.6**

- [x] 20. Create admin panel - Upload form
  - Create `UploadForm.tsx` component with file input and metadata fields
  - Implement form validation with error display
  - Auto-populate fileName and fileSize from selected file
  - Show upload progress during file upload
  - Display success/error messages
  - Reset form after successful upload
  - _Requirements: 10.1, 10.2, 10.3, 10.6, 10.7, 10.8_

- [x] 21. Create admin panel - Papers table
  - Create `PapersTable.tsx` with sortable columns
  - Display all papers with title, subject, classLevel, year, examType, downloads, uploadDate
  - Implement column sorting
  - Add filter controls matching mobile app filters
  - Add Edit and Delete action buttons
  - Display total paper count
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 21.1 Write property test for paper count accuracy
  - **Property 21: Paper Count Accuracy**
  - **Validates: Requirements 11.5**

- [x] 22. Create admin panel - Edit form
  - Create `EditForm.tsx` pre-filled with current paper metadata
  - Allow editing of: title, subject, classLevel, year, examType, session, tags, description
  - Prevent editing of: id, fileUrl, fileName, fileSize, uploadDate, downloads
  - Implement form validation
  - Display success/error messages
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 22.1 Write property test for metadata edit round trip
  - **Property 22: Metadata Edit Round Trip**
  - **Validates: Requirements 12.3**

- [x] 22.2 Write property test for immutable field protection
  - **Property 23: Immutable Field Protection**
  - **Validates: Requirements 12.4**

- [x] 23. Create admin panel - Delete functionality
  - Implement delete confirmation dialog
  - Delete PDF from Firebase Storage on confirmation
  - Delete Firestore document after Storage deletion
  - Display success/error messages
  - Update analytics after deletion
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 23.1 Write property test for paper deletion completeness
  - **Property 24: Paper Deletion Completeness**
  - **Validates: Requirements 13.3**

- [x] 24. Create admin panel - Analytics dashboard
  - Create `AnalyticsDashboard.tsx` component
  - Display total downloads across all papers
  - Display total storage usage with 5GB limit indicator
  - Display top 10 most downloaded papers
  - Display downloads grouped by subject
  - Display daily bandwidth usage with 1GB limit indicator
  - Add warning indicators when approaching limits (90% threshold)
  - _Requirements: 14.3, 14.4, 14.5, 14.6, 14.7, 20.1, 20.2, 20.3, 20.4, 20.5_

- [x] 25. Create admin panel - Dashboard page
  - Create `Dashboard.tsx` with overview cards
  - Display total papers, storage used, today's downloads
  - Add quick action buttons (Upload, View Analytics)
  - Show recent uploads list
  - Display storage/bandwidth warnings when needed
  - _Requirements: 20.1, 20.2, 20.3, 20.4_

- [x] 26. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 27. Implement performance optimizations
  - Add lazy loading for Library, PaperDetail, MyDownloads pages
  - Implement pagination for paper lists (50 papers per page)
  - Add code splitting for admin panel routes
  - Optimize Firebase SDK imports (tree shaking)
  - Implement cache invalidation strategy (24-hour expiry)
  - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [x] 27.1 Write property test for pagination threshold
  - **Property 31: Pagination Threshold**
  - **Validates: Requirements 18.3**

- [x] 28. Implement error handling and network utilities
  - Create `useNetworkStatus()` hook for online/offline detection
  - Implement `fetchWithRetry()` with exponential backoff
  - Create `checkStorageBeforeDownload()` for space validation
  - Implement `safeFileOperation()` wrapper for filesystem errors
  - Create `handleFirebaseError()` for Firebase-specific errors
  - Add user-facing error messages with localization
  - _Requirements: 6.6, 6.7, 17.3, 17.4_

- [x] 29. Add platform-specific configurations
  - Configure Capacitor for Android (capacitor.config.ts)
  - Configure Capacitor for iOS (capacitor.config.ts)
  - Test filesystem access on both platforms
  - Test PDF viewer integration on both platforms
  - Ensure compatibility with Android 7.0+ and iOS 13.0+
  - _Requirements: 19.1, 19.2, 19.3, 19.4_

- [x] 30. Final integration and wiring
  - Wire all services together in app initialization
  - Initialize Firebase on app startup
  - Initialize IndexedDB on app startup
  - Initialize filesystem on app startup
  - Set up analytics tracking throughout the app
  - Connect all pages to navigation
  - Test complete user flows: browse → download → open → delete
  - Test complete admin flows: upload → edit → delete
  - Test offline mode functionality
  - _Requirements: All requirements_

- [x] 31. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- Implementation uses TypeScript throughout for type safety
- Firebase free tier limits: 5GB storage, 1GB/day bandwidth
- Target platforms: Android 7.0+, iOS 13.0+
- Existing design system and i18n infrastructure will be reused
