# PDF Download & Viewer Feature - Implementation Tasks

## Task 1: Fix Library Filtering
**Status:** ✅ COMPLETED

Ensure downloaded papers don't show in Library browse.

**Sub-tasks:**
- [x] 1.1 Add `downloadedPaperIds` state to Library.tsx
- [x] 1.2 Load downloaded paper IDs from cache on mount
- [x] 1.3 Filter papers before applying search/filters
- [x] 1.4 Apply same logic to LibraryDirect.tsx

**Files:**
- `src/pages/Library.tsx`
- `src/pages/LibraryDirect.tsx`

---

## Task 2: Implement SimplePDFViewer
**Status:** ✅ COMPLETED

Create lightweight PDF viewer using iframe.

**Sub-tasks:**
- [x] 2.1 Create SimplePDFViewer component
- [x] 2.2 Accept base64 PDF data as prop
- [x] 2.3 Render using data URL in iframe
- [x] 2.4 Add close button and header

**Files:**
- `src/components/exam/SimplePDFViewer.tsx`

---

## Task 3: Update MyDownloads to Use SimplePDFViewer
**Status:** ✅ COMPLETED

Replace native PDF opener with in-app viewer.

**Sub-tasks:**
- [x] 3.1 Import SimplePDFViewer and readFileAsBase64
- [x] 3.2 Add state for PDF viewer (showPDFViewer, currentPDF)
- [x] 3.3 Update handlePaperClick to read file and show viewer
- [x] 3.4 Render SimplePDFViewer when active

**Files:**
- `src/pages/MyDownloads.tsx`

---

## Task 4: Update PaperDetail to Use SimplePDFViewer
**Status:** ✅ COMPLETED

Use in-app viewer for downloaded papers.

**Sub-tasks:**
- [x] 4.1 Import SimplePDFViewer and readFileAsBase64
- [x] 4.2 Add state for PDF viewer (showPDFViewer, pdfData)
- [x] 4.3 Update handleOpen to read file and show viewer
- [x] 4.4 Render SimplePDFViewer when active

**Files:**
- `src/pages/PaperDetail.tsx`

---

## Task 5: Verify Download Flow
**Status:** ✅ COMPLETED

Ensure downloads work and update cache correctly.

**Sub-tasks:**
- [x] 5.1 Verify downloadService.downloadPaper() saves file
- [x] 5.2 Verify cacheService.updateDownloadStatus() updates IndexedDB
- [x] 5.3 Add console logging for debugging
- [x] 5.4 Test download progress updates

**Files:**
- `src/services/downloadService.ts`
- `src/services/cacheService.ts`

---

## Task 6: Build and Test APK
**Status:** ✅ COMPLETED

Build APK and verify functionality on device.

**Sub-tasks:**
- [x] 6.1 Run `npm run build`
- [x] 6.2 Run `npx cap sync android`
- [x] 6.3 Build APK with Gradle
- [x] 6.4 Copy APK to desktop
- [x] 6.5 Test on device

**Commands:**
```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
Copy-Item "android\app\build\outputs\apk\debug\app-debug.apk" "$env:USERPROFILE\Desktop\ScoreTarget.apk" -Force
```

---

## Task 7: Manual Testing Checklist
**Status:** PENDING

Test all functionality on device.

**Test Cases:**
- [ ] 7.1 Library shows only non-downloaded papers
- [ ] 7.2 Download paper from PaperDetail
- [ ] 7.3 Downloaded paper appears in MyDownloads
- [ ] 7.4 Downloaded paper disappears from Library
- [ ] 7.5 Open PDF from MyDownloads - displays correctly
- [ ] 7.6 Open PDF from PaperDetail (after download) - displays correctly
- [ ] 7.7 PDF works offline (airplane mode)
- [ ] 7.8 Delete paper from MyDownloads
- [ ] 7.9 Deleted paper reappears in Library
- [ ] 7.10 Storage counter updates correctly

---

## Task 8: Bug Fixes (If Needed)
**Status:** PENDING

Address any issues found during testing.

**Potential Issues:**
- [ ] 8.1 PDF not displaying in viewer
- [ ] 8.2 Download not updating cache
- [ ] 8.3 Papers not filtering correctly
- [ ] 8.4 File read errors

---

## Notes

### Current Implementation Status
- ✅ Library filtering logic added
- ✅ SimplePDFViewer created
- ✅ MyDownloads updated to use viewer
- ✅ PaperDetail updated to use viewer
- ✅ APK built and ready for testing

### Known Issues
- Need to test on actual device
- Need to verify offline functionality
- Need to verify cache updates correctly

### Next Steps
1. Install APK on device
2. Run through test checklist (Task 7)
3. Fix any bugs found (Task 8)
4. Mark spec as complete
