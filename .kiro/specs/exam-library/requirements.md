# Requirements Document: Exam Library

## Introduction

The Exam Library feature enables students using the ScoreTarget mobile application to browse, search, download, and view past exam papers stored in Firebase Cloud Storage. The feature includes a mobile interface for students and a web-based admin panel for content management. The system must maintain the app's small footprint by storing PDFs remotely while enabling offline access to downloaded papers.

## Glossary

- **Mobile_App**: The React + Capacitor mobile application running on Android and iOS devices
- **Admin_Panel**: The web-based interface for uploading and managing exam papers
- **Firebase_Storage**: Cloud storage service hosting PDF exam papers
- **Firestore**: Cloud database storing exam paper metadata
- **Exam_Paper**: A PDF document containing past examination questions
- **Paper_Metadata**: Structured data describing an exam paper (title, subject, class level, year, exam type, session, tags, file information)
- **Downloaded_Paper**: An exam paper stored locally on the student's device
- **Device_Storage**: Local file system storage on the student's mobile device
- **Student**: End user of the Mobile_App who browses and downloads exam papers
- **Administrator**: User who manages exam papers through the Admin_Panel
- **Filter_Criteria**: Classification attributes used to narrow exam paper searches (class level, subject, year, exam type)
- **Analytics_Data**: Usage statistics including download counts and storage metrics
- **PDF_Viewer**: Native device application for viewing PDF documents
- **Download_Progress**: Real-time indicator showing percentage completion of a file download
- **Session**: Academic term identifier (e.g., "1st Semester", "2nd Semester")
- **Class_Level**: Academic grade level (e.g., "Terminale D", "Première D")
- **Exam_Type**: Category of examination (e.g., "Baccalauréat", "Composition")

## Requirements

### Requirement 1: Cloud Storage Infrastructure

**User Story:** As an administrator, I want exam papers stored in Firebase Storage, so that the mobile app remains small and papers are accessible to all students.

#### Acceptance Criteria

1. THE Firebase_Storage SHALL store exam paper PDF files with unique identifiers
2. THE Firestore SHALL store Paper_Metadata for each exam paper
3. WHEN an exam paper is uploaded, THE Admin_Panel SHALL generate a unique file path in Firebase_Storage
4. THE Paper_Metadata SHALL include: id, title, subject, classLevel, year, examType, session, fileUrl, fileName, fileSize, uploadDate, downloads, and tags
5. THE Firebase_Storage SHALL organize files using the path structure: `/exam-papers/{classLevel}/{subject}/{year}/{fileName}`
6. FOR ALL exam papers in Firebase_Storage, a corresponding Paper_Metadata document SHALL exist in Firestore

### Requirement 2: Browse Exam Papers

**User Story:** As a student, I want to browse available exam papers, so that I can find materials relevant to my studies.

#### Acceptance Criteria

1. WHEN the Student opens the Library tab, THE Mobile_App SHALL display a grid of available exam papers
2. THE Mobile_App SHALL retrieve Paper_Metadata from Firestore for display
3. THE Mobile_App SHALL display for each paper: title, subject, classLevel, year, fileSize, and download status
4. WHEN the Student has no internet connection, THE Mobile_App SHALL display cached Paper_Metadata from the last successful fetch
5. THE Mobile_App SHALL indicate which papers are already downloaded to Device_Storage

### Requirement 3: Filter Exam Papers

**User Story:** As a student, I want to filter exam papers by multiple criteria, so that I can quickly find specific papers I need.

#### Acceptance Criteria

1. THE Mobile_App SHALL provide filter controls for: Class_Level, subject, year, and Exam_Type
2. WHEN the Student selects Filter_Criteria, THE Mobile_App SHALL query Firestore with the selected filters
3. THE Mobile_App SHALL display only exam papers matching all selected Filter_Criteria
4. WHEN the Student clears filters, THE Mobile_App SHALL display all available exam papers
5. THE Mobile_App SHALL persist selected Filter_Criteria across app sessions

### Requirement 4: Search Exam Papers

**User Story:** As a student, I want to search exam papers by title or subject, so that I can find specific papers quickly.

#### Acceptance Criteria

1. THE Mobile_App SHALL provide a search input field in the Library tab
2. WHEN the Student enters search text, THE Mobile_App SHALL filter displayed papers where title or subject contains the search text (case-insensitive)
3. THE Mobile_App SHALL update search results in real-time as the Student types
4. WHEN the Student combines search with Filter_Criteria, THE Mobile_App SHALL apply both constraints

### Requirement 5: View Paper Details

**User Story:** As a student, I want to view detailed information about an exam paper, so that I can decide whether to download it.

#### Acceptance Criteria

1. WHEN the Student taps on an exam paper, THE Mobile_App SHALL display a detail view
2. THE Mobile_App SHALL display: title, subject, classLevel, year, examType, session, fileSize, uploadDate, downloads, tags, and description
3. THE Mobile_App SHALL display a "Download" button if the paper is not downloaded
4. THE Mobile_App SHALL display an "Open" button if the paper is already downloaded
5. THE Mobile_App SHALL display a "Delete" button if the paper is already downloaded

### Requirement 6: Download Exam Papers

**User Story:** As a student, I want to download exam papers to my device, so that I can access them offline.

#### Acceptance Criteria

1. WHEN the Student taps the "Download" button, THE Mobile_App SHALL download the PDF from Firebase_Storage to Device_Storage
2. WHILE downloading, THE Mobile_App SHALL display Download_Progress as a percentage
3. WHEN the download completes successfully, THE Mobile_App SHALL store the PDF in Device_Storage
4. WHEN the download completes successfully, THE Mobile_App SHALL update the local database to mark the paper as downloaded
5. WHEN the download completes successfully, THE Mobile_App SHALL increment the downloads count in Firestore
6. IF the download fails due to network error, THEN THE Mobile_App SHALL display an error message and allow retry
7. IF the Student has insufficient Device_Storage, THEN THE Mobile_App SHALL display an error message before attempting download
8. WHEN a download is in progress, THE Mobile_App SHALL allow the Student to cancel the download

### Requirement 7: View Downloaded Papers Offline

**User Story:** As a student, I want to access downloaded papers without internet, so that I can study anywhere.

#### Acceptance Criteria

1. THE Mobile_App SHALL maintain a local database of Downloaded_Paper records
2. WHEN the Student has no internet connection, THE Mobile_App SHALL display all Downloaded_Paper entries
3. WHEN the Student taps "Open" on a Downloaded_Paper, THE Mobile_App SHALL open the PDF in the device's PDF_Viewer
4. THE Mobile_App SHALL function in offline mode for viewing Downloaded_Paper list and opening papers

### Requirement 8: Open PDF in Device Viewer

**User Story:** As a student, I want to open exam papers in my device's PDF viewer, so that I can read them comfortably.

#### Acceptance Criteria

1. WHEN the Student taps "Open" on a Downloaded_Paper, THE Mobile_App SHALL invoke the native PDF_Viewer with the local file path
2. IF the PDF_Viewer is not available, THEN THE Mobile_App SHALL display an error message
3. THE Mobile_App SHALL support PDF opening on both Android and iOS platforms

### Requirement 9: Manage Downloaded Papers

**User Story:** As a student, I want to manage my downloaded papers, so that I can free up storage space when needed.

#### Acceptance Criteria

1. THE Mobile_App SHALL provide a "My Downloads" section listing all Downloaded_Paper entries
2. THE Mobile_App SHALL display for each Downloaded_Paper: title, subject, fileSize, and download date
3. WHEN the Student taps "Delete" on a Downloaded_Paper, THE Mobile_App SHALL remove the PDF from Device_Storage
4. WHEN the Student deletes a Downloaded_Paper, THE Mobile_App SHALL update the local database to mark the paper as not downloaded
5. THE Mobile_App SHALL display total storage used by all Downloaded_Paper files
6. THE Mobile_App SHALL allow the Student to delete multiple papers simultaneously

### Requirement 10: Upload Exam Papers (Admin)

**User Story:** As an administrator, I want to upload exam papers with metadata, so that students can access new materials.

#### Acceptance Criteria

1. THE Admin_Panel SHALL provide a file upload interface accepting PDF files
2. THE Admin_Panel SHALL provide input fields for: title, subject, classLevel, year, examType, session, tags, and description
3. WHEN the Administrator submits the upload form, THE Admin_Panel SHALL validate that all required fields are filled
4. WHEN the Administrator submits a valid upload form, THE Admin_Panel SHALL upload the PDF to Firebase_Storage
5. WHEN the PDF upload completes, THE Admin_Panel SHALL create a Paper_Metadata document in Firestore
6. WHEN the upload completes successfully, THE Admin_Panel SHALL display a success message
7. IF the upload fails, THEN THE Admin_Panel SHALL display an error message with failure reason
8. THE Admin_Panel SHALL auto-populate fileName and fileSize from the selected PDF file

### Requirement 11: View All Papers (Admin)

**User Story:** As an administrator, I want to view all uploaded papers, so that I can manage the library content.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display a table of all exam papers with columns: title, subject, classLevel, year, examType, downloads, uploadDate
2. THE Admin_Panel SHALL retrieve Paper_Metadata from Firestore for display
3. THE Admin_Panel SHALL provide sorting controls for each column
4. THE Admin_Panel SHALL provide filter controls matching the Mobile_App Filter_Criteria
5. THE Admin_Panel SHALL display total count of exam papers

### Requirement 12: Edit Paper Metadata (Admin)

**User Story:** As an administrator, I want to edit paper metadata, so that I can correct errors or update information.

#### Acceptance Criteria

1. WHEN the Administrator clicks "Edit" on a paper, THE Admin_Panel SHALL display an edit form pre-filled with current Paper_Metadata
2. THE Admin_Panel SHALL allow editing of: title, subject, classLevel, year, examType, session, tags, and description
3. WHEN the Administrator submits the edit form, THE Admin_Panel SHALL update the Paper_Metadata document in Firestore
4. THE Admin_Panel SHALL prevent editing of: id, fileUrl, fileName, fileSize, uploadDate, and downloads
5. WHEN the update completes successfully, THE Admin_Panel SHALL display a success message

### Requirement 13: Delete Papers (Admin)

**User Story:** As an administrator, I want to delete exam papers, so that I can remove outdated or incorrect materials.

#### Acceptance Criteria

1. WHEN the Administrator clicks "Delete" on a paper, THE Admin_Panel SHALL display a confirmation dialog
2. WHEN the Administrator confirms deletion, THE Admin_Panel SHALL delete the PDF from Firebase_Storage
3. WHEN the PDF deletion completes, THE Admin_Panel SHALL delete the Paper_Metadata document from Firestore
4. WHEN the deletion completes successfully, THE Admin_Panel SHALL display a success message
5. IF the deletion fails, THEN THE Admin_Panel SHALL display an error message

### Requirement 14: Track Download Analytics

**User Story:** As an administrator, I want to track download statistics, so that I can understand which papers are most valuable to students.

#### Acceptance Criteria

1. WHEN a Student successfully downloads a paper, THE Mobile_App SHALL increment the downloads field in the paper's Paper_Metadata document
2. THE Firestore SHALL maintain an accurate downloads count for each exam paper
3. THE Admin_Panel SHALL display total downloads across all papers
4. THE Admin_Panel SHALL display download count for each individual paper
5. THE Admin_Panel SHALL display a list of top 10 most downloaded papers
6. THE Admin_Panel SHALL display download statistics grouped by subject
7. THE Admin_Panel SHALL calculate and display total Firebase_Storage usage

### Requirement 15: Localization Support

**User Story:** As a student, I want the library interface in my preferred language, so that I can use the app comfortably.

#### Acceptance Criteria

1. THE Mobile_App SHALL display all Library interface text in French when the app language is set to French
2. THE Mobile_App SHALL display all Library interface text in English when the app language is set to English
3. THE Mobile_App SHALL translate: tab labels, button text, filter labels, error messages, and status messages
4. THE Paper_Metadata content (titles, descriptions) SHALL remain in the original language as uploaded

### Requirement 16: UI Consistency

**User Story:** As a student, I want the library interface to match the existing app design, so that the experience feels cohesive.

#### Acceptance Criteria

1. THE Mobile_App SHALL apply existing design tokens to Library components: card-shadow, rounded-2xl, color scheme
2. THE Mobile_App SHALL add a "Library" tab to the bottom navigation bar
3. THE Mobile_App SHALL use consistent typography, spacing, and color palette with existing app screens
4. THE Mobile_App SHALL implement smooth transitions and animations matching existing app behavior

### Requirement 17: Loading and Error States

**User Story:** As a student, I want clear feedback during operations, so that I understand what the app is doing.

#### Acceptance Criteria

1. WHILE fetching exam papers from Firestore, THE Mobile_App SHALL display a loading indicator
2. WHILE downloading a PDF, THE Mobile_App SHALL display Download_Progress
3. IF Firestore fetch fails, THEN THE Mobile_App SHALL display an error message with retry option
4. IF the Student has no internet connection, THEN THE Mobile_App SHALL display an offline indicator
5. WHEN an operation completes successfully, THE Mobile_App SHALL display a success confirmation

### Requirement 18: Performance Constraints

**User Story:** As a student, I want the app to remain fast and small, so that it works well on my device.

#### Acceptance Criteria

1. THE Mobile_App SHALL maintain an app bundle size increase of less than 500KB for the Library feature code
2. THE Mobile_App SHALL load and display the Library tab within 2 seconds on a 4G connection
3. THE Mobile_App SHALL paginate exam paper lists when displaying more than 50 papers
4. THE Mobile_App SHALL cache Paper_Metadata locally to reduce Firestore reads
5. THE Mobile_App SHALL implement lazy loading for paper thumbnail images if included

### Requirement 19: Platform Compatibility

**User Story:** As a student, I want the library to work on my device, so that I can access exam papers regardless of my platform.

#### Acceptance Criteria

1. THE Mobile_App SHALL support the Library feature on Android devices running Android 7.0 or higher
2. THE Mobile_App SHALL support the Library feature on iOS devices running iOS 13.0 or higher
3. THE Mobile_App SHALL use Capacitor filesystem APIs for cross-platform Device_Storage access
4. THE Mobile_App SHALL handle platform-specific PDF_Viewer invocation for both Android and iOS

### Requirement 20: Firebase Quota Management

**User Story:** As an administrator, I want to stay within Firebase free tier limits, so that the service remains cost-free.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display current Firebase_Storage usage against the 5GB limit
2. THE Admin_Panel SHALL display current daily download bandwidth against the 1GB/day limit
3. IF Firebase_Storage usage exceeds 4.5GB, THEN THE Admin_Panel SHALL display a warning message
4. IF daily download bandwidth exceeds 900MB, THEN THE Admin_Panel SHALL display a warning message
5. THE Admin_Panel SHALL provide recommendations for managing storage when approaching limits

### Requirement 21: Parse and Display PDF Metadata

**User Story:** As a student, I want to see accurate file information, so that I can make informed download decisions.

#### Acceptance Criteria

1. WHEN the Administrator uploads a PDF, THE Admin_Panel SHALL extract fileName from the file object
2. WHEN the Administrator uploads a PDF, THE Admin_Panel SHALL extract fileSize in bytes from the file object
3. THE Mobile_App SHALL display fileSize in human-readable format (KB, MB)
4. THE Mobile_App SHALL display fileSize before download to inform storage requirements
5. FOR ALL exam papers, fileSize SHALL accurately represent the PDF file size in Firebase_Storage

### Requirement 22: Round-Trip Data Integrity

**User Story:** As a developer, I want to ensure data integrity throughout the upload-download cycle, so that students receive uncorrupted files.

#### Acceptance Criteria

1. WHEN a PDF is uploaded to Firebase_Storage, THE Admin_Panel SHALL store the file's content hash
2. WHEN the Mobile_App downloads a PDF, THE Mobile_App SHALL verify the downloaded file's content hash matches the stored hash
3. IF the content hash verification fails, THEN THE Mobile_App SHALL delete the corrupted file and display an error message
4. FOR ALL successfully downloaded papers, the PDF content SHALL be identical to the uploaded PDF content

