# PDF Download & Viewer Feature - Technical Design

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    React App                        │
├─────────────────────────────────────────────────────┤
│  Library Page  │  PaperDetail  │  MyDownloads Page  │
│  (browse)      │  (download)   │  (view PDFs)       │
└────────┬───────────────┬───────────────┬────────────┘
         │               │               │
         ▼               ▼               ▼
┌─────────────────────────────────────────────────────┐
│              Service Layer                          │
├─────────────────────────────────────────────────────┤
│  examService  │  downloadService  │  cacheService   │
└────────┬──────────────┬────────────────┬────────────┘
         │              │                │
         ▼              ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase   │  │  Capacitor   │  │  IndexedDB   │
│   Storage    │  │  Filesystem  │  │   Cache      │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Component Design

### 1. Library Page (`src/pages/Library.tsx`)

**Purpose:** Browse available (non-downloaded) papers

**State:**
```typescript
papers: ExamPaper[]              // All papers from Supabase
downloadedPaperIds: Set<string>  // IDs of downloaded papers
filteredPapers: ExamPaper[]      // After filtering downloads + search
```

**Logic:**
```typescript
// Filter out downloaded papers
const applyFilters = () => {
  let result = papers.filter(p => !downloadedPaperIds.has(p.id));
  // Apply search/filters...
  setFilteredPapers(result);
}
```

**Dependencies:**
- `examService.fetchPapers()` - Get papers from Supabase
- `cacheService.getCachedPapers()` - Get download status

---

### 2. PaperDetail Page (`src/pages/PaperDetail.tsx`)

**Purpose:** Show paper details and handle download

**State:**
```typescript
paper: ExamPaper | null
isDownloaded: boolean
downloadProgress: DownloadProgress | null
showPDFViewer: boolean
pdfData: string  // base64
```

**Download Flow:**
```
User clicks "Download"
  ↓
Check storage space
  ↓
downloadService.downloadPaper()
  ↓
Progress updates (0-100%)
  ↓
Save to Filesystem
  ↓
Update IndexedDB cache
  ↓
Set isDownloaded = true
```

**Open Flow:**
```
User clicks "Open PDF"
  ↓
Get download info from cache
  ↓
Read file as base64
  ↓
Show SimplePDFViewer
```

---

### 3. MyDownloads Page (`src/pages/MyDownloads.tsx`)

**Purpose:** List and open downloaded papers

**State:**
```typescript
downloadedPapers: CachedPaper[]  // Papers with isDownloaded=true
totalStorage: number
showPDFViewer: boolean
currentPDF: { data: string, title: string }
```

**Load Flow:**
```
Page loads
  ↓
cacheService.getCachedPapers()
  ↓
Filter where isDownloaded === true
  ↓
Display list
```

**Open Flow:**
```
User taps paper
  ↓
Extract filename from localPath
  ↓
readFileAsBase64(filename)
  ↓
Show SimplePDFViewer with data
```

---

### 4. SimplePDFViewer Component (`src/components/exam/SimplePDFViewer.tsx`)

**Purpose:** Display PDF using iframe

**Props:**
```typescript
interface SimplePDFViewerProps {
  pdfData: string;    // base64 encoded PDF
  fileName: string;   // Display name
  onClose: () => void;
}
```

**Implementation:**
```typescript
const pdfUrl = `data:application/pdf;base64,${pdfData}`;

return (
  <div className="fixed inset-0 z-50 bg-black">
    <Header with close button />
    <iframe src={pdfUrl} className="w-full h-full" />
  </div>
);
```

**Why iframe?**
- Simple, no dependencies
- Works offline with data URLs
- Native browser PDF rendering
- Cross-platform (Android/iOS)

---

## Service Layer Design

### downloadService (`src/services/downloadService.ts`)

**Key Methods:**

```typescript
class DownloadService {
  // Download PDF from URL to device
  async downloadPaper(
    paper: ExamPaper,
    onProgress: (progress: DownloadProgress) => void
  ): Promise<string>
  
  // Check if paper is downloaded
  async isPaperDownloaded(paperId: string): Promise<boolean>
  
  // Get download info
  async getDownloadInfo(paperId: string): Promise<DownloadedPaper | null>
  
  // Delete downloaded paper
  async deletePaper(paperId: string): Promise<void>
  
  // Get all downloaded papers
  async getDownloadedPapers(): Promise<DownloadedPaper[]>
}
```

**Download Implementation:**
```typescript
async downloadPaper(paper, onProgress) {
  // 1. Check storage
  await checkStorageBeforeDownload(paper.fileSize);
  
  // 2. Fetch PDF
  const response = await fetch(paper.fileUrl);
  const blob = await response.blob();
  
  // 3. Save to filesystem
  const fileName = `${Date.now()}_${paper.fileName}`;
  const localPath = await savePDF(fileName, blob);
  
  // 4. Update cache
  await cacheService.updateDownloadStatus(paper.id, true, localPath);
  
  return localPath;
}
```

---

### cacheService (`src/services/cacheService.ts`)

**Purpose:** Track download status in IndexedDB

**Stores:**
```typescript
{
  papers: {
    id: string,
    title: string,
    // ... paper metadata
    isDownloaded: boolean,
    localPath?: string,
    downloadedAt?: string
  },
  downloads: {
    id: string,
    paperId: string,
    localPath: string,
    downloadedAt: string,
    fileSize: number
  }
}
```

**Key Methods:**
```typescript
async updateDownloadStatus(
  paperId: string,
  status: boolean,
  localPath?: string
): Promise<void>

async getCachedPapers(): Promise<CachedPaper[]>

async getDownloadedPapers(): Promise<DownloadedPaper[]>
```

---

## Filesystem Layer (`src/lib/filesystem.ts`)

**Using:** `@capacitor/filesystem`

**Directory Structure:**
```
App Data Directory/
└── exam-papers/
    ├── 1234567890_math_paper.pdf
    ├── 1234567891_physics_paper.pdf
    └── ...
```

**Key Functions:**
```typescript
// Save PDF blob to device
async function savePDF(fileName: string, data: Blob): Promise<string>

// Delete PDF from device
async function deletePDF(fileName: string): Promise<void>

// Read PDF as base64
async function readFileAsBase64(fileName: string): Promise<string>

// Get file URI for opening
async function getFileUri(fileName: string): Promise<string>
```

**Implementation:**
```typescript
async function savePDF(fileName: string, data: Blob): Promise<string> {
  const base64Data = await blobToBase64(data);
  
  const result = await Filesystem.writeFile({
    path: `${EXAM_PAPERS_DIR}/${fileName}`,
    data: base64Data,
    directory: Directory.Data
  });
  
  return result.uri;
}
```

---

## Data Flow Diagrams

### Download Flow
```
Library Page
  ↓ (user clicks paper)
PaperDetail Page
  ↓ (user clicks Download)
downloadService.downloadPaper()
  ↓
fetch(paper.fileUrl) → Blob
  ↓
filesystem.savePDF() → localPath
  ↓
cacheService.updateDownloadStatus(id, true, localPath)
  ↓
IndexedDB: papers[id].isDownloaded = true
  ↓
PaperDetail: setIsDownloaded(true)
```

### View Flow
```
MyDownloads Page
  ↓ (user taps paper)
Extract filename from paper.localPath
  ↓
filesystem.readFileAsBase64(filename) → base64Data
  ↓
SimplePDFViewer({ pdfData: base64Data })
  ↓
<iframe src="data:application/pdf;base64,..." />
```

### Library Filter Flow
```
Library Page loads
  ↓
examService.fetchPapers() → papers[]
  ↓
cacheService.getCachedPapers() → cachedPapers[]
  ↓
Extract downloadedPaperIds = Set(cachedPapers.filter(p => p.isDownloaded).map(p => p.id))
  ↓
Filter: papers.filter(p => !downloadedPaperIds.has(p.id))
  ↓
Display filtered papers
```

---

## Error Handling

### Download Errors
```typescript
try {
  await downloadPaper(paper, onProgress);
} catch (error) {
  if (error.message.includes('storage')) {
    toast.error('Not enough storage space');
  } else if (error.message.includes('network')) {
    toast.error('Network error. Check connection.');
  } else {
    toast.error('Download failed. Try again.');
  }
}
```

### File Read Errors
```typescript
try {
  const data = await readFileAsBase64(fileName);
} catch (error) {
  toast.error('File not found. Please download again.');
  // Mark as not downloaded
  await cacheService.updateDownloadStatus(paperId, false);
}
```

---

## Platform-Specific Behavior

### Mobile (Android/iOS)
- Full download functionality
- Files saved to app's private storage
- PDF viewer uses iframe with base64 data
- Offline access works

### Web
- No download functionality
- "Download" button opens PDF in new tab
- No offline access
- MyDownloads page shows empty state

**Detection:**
```typescript
import { Capacitor } from '@capacitor/core';

if (Capacitor.getPlatform() === 'web') {
  // Web behavior
  window.open(paper.fileUrl, '_blank');
} else {
  // Mobile behavior
  await downloadPaper(paper);
}
```

---

## Performance Considerations

### Download Progress
- Update progress every 10% to avoid UI lag
- Use throttled progress callbacks

### PDF Loading
- Show loading spinner while reading file
- Timeout after 10 seconds with error

### Memory Management
- Don't keep multiple PDFs in memory
- Clear pdfData state when viewer closes
- Use base64 data URLs (browser handles memory)

---

## Testing Strategy

### Unit Tests
- `downloadService.downloadPaper()` - mock fetch
- `cacheService.updateDownloadStatus()` - mock IndexedDB
- `filesystem.savePDF()` - mock Capacitor

### Integration Tests
- Download → Cache → Display flow
- Delete → Cache update → Library reappears
- Filter logic with downloaded papers

### Manual Testing
1. Download paper → verify in MyDownloads
2. Open PDF → verify displays correctly
3. Delete paper → verify reappears in Library
4. Offline mode → verify PDF still opens
5. Low storage → verify error message

---

## Migration Plan

### Current State Issues
1. Downloaded papers still show in Library
2. PDF viewer not working
3. Cache not updating correctly

### Fix Steps
1. ✅ Update Library filter logic (add downloadedPaperIds filter)
2. ✅ Replace complex PDF viewer with SimplePDFViewer
3. ✅ Ensure cache updates on download
4. ✅ Test download → view → delete flow
5. ✅ Rebuild and test APK

---

## Success Metrics

- [ ] Downloaded papers hidden from Library
- [ ] MyDownloads shows only downloaded papers
- [ ] PDF viewer opens and displays PDFs
- [ ] Download progress accurate
- [ ] Delete removes from MyDownloads and shows in Library
- [ ] Works offline after download
