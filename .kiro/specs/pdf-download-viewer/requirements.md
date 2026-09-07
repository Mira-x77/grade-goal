# PDF Download & Viewer Feature - Requirements

## Feature Overview
Students need to download exam papers from the library and read them offline within the app, without relying on external PDF readers.

## Glossary

- **Cache_Service**: IndexedDB-based service that tracks download status and paper metadata
- **Download_Service**: Service that handles PDF downloads and file operations
- **Library_Page**: Browse interface showing available (non-downloaded) papers
- **MyDownloads_Page**: Interface showing only downloaded papers
- **SimplePDFViewer**: Component that displays PDFs using iframe with base64 data
- **Download_Status**: Boolean flag indicating if a paper is downloaded (isDownloaded field)
- **Local_Path**: File system path where downloaded PDF is stored

## User Stories

### US-1: Browse Available Papers
**As a** student  
**I want to** browse exam papers in the Library section  
**So that** I can find papers I need to study

**Acceptance Criteria:**
- Library shows papers that are NOT yet downloaded
- Each paper shows: title, subject, class level, year, exam type, preview image
- Search and filter functionality works
- Downloaded papers do NOT appear in Library browse

### US-2: Download Paper to Device
**As a** student  
**I want to** download a paper to my device  
**So that** I can access it offline later

**Acceptance Criteria:**
- Download button visible on paper detail page
- Progress bar shows download status (0-100%)
- Download saves to app's private storage (not system downloads)
- After download completes, paper disappears from Library
- Download works on mobile (Android/iOS) only, not web
- On web, "Download" button opens PDF in new tab instead

### US-3: View Downloaded Papers List
**As a** student  
**I want to** see all my downloaded papers in one place  
**So that** I can easily find and access them

**Acceptance Criteria:**
- "My Downloads" section shows ONLY downloaded papers
- Each paper shows: title, subject, class, file size, download date
- Papers are sorted by download date (newest first)
- Shows total storage used
- Empty state message when no downloads exist

### US-4: Read PDF Offline
**As a** student  
**I want to** open and read downloaded PDFs inside the app  
**So that** I don't need internet or external apps

**Acceptance Criteria:**
- Tapping a downloaded paper opens it in-app
- PDF viewer works completely offline
- Viewer shows PDF content clearly
- Close button returns to downloads list
- Works on mobile devices (Android/iOS)

### US-5: Delete Downloaded Paper
**As a** student  
**I want to** delete papers I no longer need  
**So that** I can free up storage space

**Acceptance Criteria:**
- Delete button available on paper detail page (when downloaded)
- Confirmation dialog before deletion
- After deletion, paper reappears in Library browse
- Storage counter updates after deletion
- Bulk delete option in My Downloads section

## Critical Bug Fix Requirements

### Requirement 1: Cache Service Download Status Update

**User Story:** As a developer, I want the cache service to properly update download status, so that downloaded papers appear in MyDownloads section

#### Acceptance Criteria

1. WHEN Download_Service completes a download, THE Cache_Service SHALL update the paper's isDownloaded field to true in the papers store
2. WHEN Download_Service completes a download, THE Cache_Service SHALL store the Local_Path in the paper record
3. WHEN Download_Service completes a download, THE Cache_Service SHALL create a record in the downloads store with paperId, localPath, downloadedAt, and fileSize
4. WHEN Cache_Service updates download status, THE operation SHALL complete within 500ms
5. WHEN MyDownloads_Page loads, THE Cache_Service SHALL return all papers where isDownloaded equals true
6. FOR ALL papers with isDownloaded true, THE paper record SHALL contain a valid localPath field
7. WHEN a paper is deleted, THE Cache_Service SHALL set isDownloaded to false and remove localPath from the paper record
8. WHEN a paper is deleted, THE Cache_Service SHALL remove the corresponding record from the downloads store

### Requirement 2: SimplePDFViewer Base64 Display

**User Story:** As a student, I want to view downloaded PDFs inside the app, so that I can read papers offline without external apps

#### Acceptance Criteria

1. WHEN SimplePDFViewer receives base64 PDF data, THE component SHALL create a data URL with format "data:application/pdf;base64,{data}"
2. WHEN SimplePDFViewer renders, THE component SHALL display the PDF using an iframe element with the data URL as src
3. WHEN the PDF loads successfully, THE iframe SHALL display the PDF content in full screen
4. WHEN the user taps the close button, THE SimplePDFViewer SHALL call the onClose callback
5. IF the PDF fails to load, THEN THE SimplePDFViewer SHALL display an error message
6. THE SimplePDFViewer SHALL work offline without network connectivity
7. WHEN SimplePDFViewer unmounts, THE component SHALL clean up the data URL to prevent memory leaks

### Requirement 3: MyDownloads Display Integration

**User Story:** As a student, I want downloaded papers to appear in MyDownloads section, so that I can access them easily

#### Acceptance Criteria

1. WHEN MyDownloads_Page loads, THE page SHALL call Cache_Service.getCachedPapers()
2. WHEN Cache_Service returns papers, THE MyDownloads_Page SHALL filter for papers where isDownloaded equals true
3. WHEN a user taps a downloaded paper, THE MyDownloads_Page SHALL extract the filename from localPath
4. WHEN filename is extracted, THE MyDownloads_Page SHALL call readFileAsBase64(filename) to get PDF data
5. WHEN base64 data is retrieved, THE MyDownloads_Page SHALL pass the data to SimplePDFViewer
6. IF no downloaded papers exist, THEN THE MyDownloads_Page SHALL display an empty state message
7. WHEN a paper is deleted, THE MyDownloads_Page SHALL refresh the list and remove the deleted paper

## Functional Requirements

### FR-1: Download Management
- Downloads use Capacitor Filesystem API
- Files stored in app's Data directory under `exam-papers/`
- Filename format: `{timestamp}_{original_name}.pdf`
- Download can be cancelled mid-progress
- Failed downloads show error message

### FR-2: Storage Tracking
- IndexedDB tracks download status per paper
- Stores: paper ID, local file path, download timestamp, file size
- Cache persists across app restarts
- Downloaded papers flagged with `isDownloaded: true`

### FR-3: PDF Viewing
- Uses iframe with base64 data URL for PDF display
- Reads file from Capacitor Filesystem as base64
- Viewer is full-screen overlay
- Simple, lightweight implementation
- No external dependencies (no PDF.js, no native plugins)

### FR-4: Library Filtering
- Library browse filters out papers where `isDownloaded === true`
- Filter applied before search/filter logic
- Real-time update when download completes

## Non-Functional Requirements

### NFR-1: Performance
- Download progress updates every 10%
- PDF opens within 2 seconds
- Library loads within 1 second

### NFR-2: Storage
- Check available storage before download
- Show error if insufficient space
- Track total storage used by downloads

### NFR-3: Offline Support
- All downloaded papers accessible without internet
- PDF viewer works completely offline
- Downloads list cached locally

### NFR-4: Platform Support
- Full functionality on Android
- Full functionality on iOS
- Limited functionality on web (no downloads, only view online)

## Constraints

### Technical Constraints
- React + TypeScript + Capacitor stack
- Capacitor Filesystem plugin required
- IndexedDB for local data
- No native Android/iOS code modifications

### Business Constraints
- Must work offline after download
- No external PDF reader dependencies
- Simple, maintainable implementation

## Success Criteria

1. ✅ Downloaded papers appear ONLY in My Downloads (Bug Fix #1)
2. ✅ Library browse shows ONLY non-downloaded papers
3. ✅ PDF viewer opens and displays PDFs offline (Bug Fix #2)
4. ✅ Cache service properly updates isDownloaded status (Bug Fix #1)
5. ✅ SimplePDFViewer displays base64 PDFs in iframe (Bug Fix #2)
6. ✅ Download progress visible and accurate
7. ✅ Storage tracking accurate
8. ✅ Delete functionality works correctly

## Root Cause Analysis

### Bug #1: Downloaded PDFs not showing in MyDownloads
**Root Cause:** Cache service updateDownloadStatus method may not be properly persisting the isDownloaded flag and localPath to IndexedDB, or the transaction is not completing successfully.

**Evidence:**
- downloadService.ts logs show cache update is called
- MyDownloads page filters for isDownloaded === true
- Papers not appearing suggests cache update is failing silently

**Fix Required:** Ensure Cache_Service.updateDownloadStatus properly updates both the papers store and downloads store, and that the transaction completes successfully before returning.

### Bug #2: PDF reader not working in the app
**Root Cause:** SimplePDFViewer component exists and uses iframe with base64 data URL, but may have issues with:
1. Base64 data format (missing or incorrect MIME type)
2. Iframe not rendering on mobile platforms
3. File read operation failing

**Evidence:**
- SimplePDFViewer.tsx uses correct data URL format
- MyDownloads.tsx calls readFileAsBase64 correctly
- Issue likely in data flow or platform-specific rendering

**Fix Required:** Verify base64 data is correctly formatted, ensure iframe works on Capacitor mobile platforms, add error handling for file read failures.

## Out of Scope

- PDF annotation/markup
- PDF search within document
- Multi-page navigation controls
- Zoom controls
- PDF editing
- Sharing PDFs
- Cloud sync
