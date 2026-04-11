# ScoreTarget App - Complete Code Reference Guide

## 📱 App Overview
ScoreTarget is a comprehensive academic performance tracking and exam preparation app built with React, TypeScript, Vite, and Supabase. It supports multiple educational systems (APC, French, Nigerian University) and provides features for grade tracking, exam simulation, study materials library, and more.

---

## 🗂️ Project Structure

```
src/
├── pages/           # Main application screens
├── components/      # Reusable UI components
├── lib/            # Core business logic & utilities
├── services/       # External service integrations
├── contexts/       # React context providers
├── hooks/          # Custom React hooks
├── types/          # TypeScript type definitions
└── integrations/   # Third-party integrations (Supabase)
```

---

## 📄 PAGES (src/pages/)

### 1. **Index.tsx** - Onboarding Flow
**Location:** `src/pages/Index.tsx`
**Route:** `/onboarding`
**Purpose:** Multi-step onboarding process for new users

**Key Features:**
- Educational system selection (APC/French/Nigerian)
- Student profile setup (name, class, level, department)
- Target grade/GPA configuration
- Subject selection
- Initial marks entry

**Main Components Used:**
- `OnboardingScreen` - System & profile setup
- `SubjectsSetup` - Subject selection interface
- `MarksInput` - Initial grade entry
- `OnboardingHeader` - Progress indicator

**State Management:**
- Uses `AppState` type from `src/types/exam.ts`
- Saves to localStorage via `src/lib/storage.ts`
- Handles Nigerian-specific semester data

**Navigation Flow:**
1. System selection → Profile → Target → Subjects → Marks → Home

---

### 2. **Home.tsx** - Main Dashboard
**Location:** `src/pages/Home.tsx`
**Route:** `/` (protected, requires onboarding)
**Purpose:** Central hub showing current performance, subjects, and quick actions

**Key Sections:**

#### Hero Card (Top)
- Displays current average/GPA
- Progress bar toward target
- Color-coded status (green/yellow/red)
- Nigerian: Shows CGPA and class of degree

#### Subject Cards
- List of all subjects with marks
- Individual subject averages
- Coefficient indicators
- Quick navigation to subject details

#### Strategy Card
- Shows saved simulation strategy
- Displays predicted average
- Quick access to simulator

#### Activity Timeline
- Recent mark entries
- Historical performance data
- Streak tracking

**Key Buttons:**
- **+ Button (FAB):** Opens mark entry sheet
- **Simulator Icon:** Navigate to `/simulator`
- **Library Icon:** Navigate to `/library`
- **Settings Icon:** Navigate to `/settings`

**Bottom Sheets:**
- Mark Entry Sheet (subject selection → score input)
- Edit Marks Sheet (bulk edit all marks)
- Results Sheet (detailed breakdown)
- Nigerian Assessment Sheet (semester/course management)

**Components Used:**
- `TaskBar` - Bottom navigation
- `Mascot` - Animated mascot character
- `ProductTour` - First-time user guidance
- `FrenchClassView` - French system specific view
- `NigerianDashboard` - Nigerian system dashboard
- `SubjectBreakdown` - Detailed subject analysis

---

### 3. **Simulator.tsx** - What-If Scenario Planner
**Location:** `src/pages/Simulator.tsx`
**Route:** `/simulator` (protected)
**Purpose:** Plan future scores to reach target average

**Key Features:**
- Slider controls for each unfilled mark
- Real-time average calculation
- Color-coded feedback (on-track/risky/below)
- Save strategy to home dashboard

**UI Elements:**
- Hero card showing simulated average
- Subject-grouped sliders
- Expandable mark type sections
- Save button (only enabled when on-track)

**Logic:**
- Uses `simulateYearlyAverage()` from `src/lib/exam-logic.ts`
- Saves strategy to `AppState.savedStrategy`
- Validates against target before saving

---

### 4. **LibraryDirect.tsx** - Exam Papers Library
**Location:** `src/pages/LibraryDirect.tsx`
**Route:** `/library` (protected)
**Purpose:** Browse, search, and download past exam papers

**Tabs:**
1. **Past Papers Tab:**
   - Grid/List view toggle
   - Search by title/subject
   - Filter by class, subject, year, exam type
   - Download indicators
   - Preview thumbnails

2. **Pass Smarter Tab:**
   - Premium study tools preview
   - Subject-specific prep materials
   - Links to subject dashboards

**Key Buttons:**
- **View Layout Toggle:** Switch between grid/list
- **Filter Pills:** Quick filter selection
- **Clear Filters:** Reset all filters
- **Download FAB:** Navigate to `/my-downloads`

**Data Source:**
- Fetches from Supabase `exam_papers` table
- Caches downloads via `src/services/downloadService.ts`
- Filters based on user's class level

---

### 5. **PaperDetail.tsx** - Individual Paper Viewer
**Location:** `src/pages/PaperDetail.tsx`
**Route:** `/library/:paperId` (protected)
**Purpose:** View and download specific exam paper

**Features:**
- PDF preview
- Paper metadata (year, type, class, subject)
- Download button
- Share functionality
- Related papers suggestions

**Components:**
- PDF viewer integration
- Download progress indicator
- Metadata cards

---

### 6. **SubjectDashboard.tsx** - Subject-Specific View
**Location:** `src/pages/SubjectDashboard.tsx`
**Route:** `/subject/:subjectName` (protected)
**Purpose:** Detailed view of single subject performance

**Sections:**
- Subject overview card
- Mark history timeline
- Performance trends
- Study recommendations
- Related exam papers
- Premium prep materials (locked)

---

### 7. **Settings.tsx** - App Configuration
**Location:** `src/pages/Settings.tsx`
**Route:** `/settings` (protected)
**Purpose:** Customize app behavior and appearance

**Settings Sections:**

#### Appearance
- Theme: Light/Dark/System/Midnight/Ink
- Accent color picker (9 colors)

#### Language
- English/Français toggle

#### Assessment Weights
- Customize interro/devoir/compo weights
- Edit mode toggle

#### Rounding Rules
- Exact (no rounding)
- Standard (0.5 rounds up)
- School (custom rules)

#### Subject Coefficients
- Adjust individual subject weights
- +/- buttons for each subject

#### French Class Data (French system only)
- Class average, min, max
- Teacher appreciation (1-5 scale)

#### Color Feedback Thresholds
- Green (on-target) range
- Yellow (risky) threshold
- Red (critical) trigger

#### Notifications
- Toggle alerts for unreachable targets
- Critical subject warnings
- Recovery possibility alerts

#### Data Control
- Clear all marks
- Wipe all data (reset app)
- Account info
- Sign out

**Key Buttons:**
- **Edit Weights:** Enable coefficient editing
- **Clear Marks:** Reset all scores
- **Wipe All Data:** Complete reset (with confirmation)
- **Sign Out:** Logout and return to auth

---

### 8. **Profile.tsx** - User Profile
**Location:** `src/pages/Profile.tsx`
**Route:** `/profile` (protected)
**Purpose:** View and edit user information

**Features:**
- Display name, email, class
- Edit profile details
- Subscription status
- Usage statistics

---

### 9. **MyDownloads.tsx** - Downloaded Papers
**Location:** `src/pages/MyDownloads.tsx`
**Route:** `/my-downloads` (protected)
**Purpose:** Access offline downloaded papers

**Features:**
- List of downloaded papers
- Quick access to PDFs
- Delete downloads
- Storage usage indicator

---

### 10. **FeedbackBoard.tsx** - User Feedback
**Location:** `src/pages/FeedbackBoard.tsx`
**Route:** `/feedback` or `/feedback-board` (protected)
**Purpose:** Submit and vote on feature requests

**Features:**
- View all feedback items
- Upvote/downvote
- Submit new ideas
- Filter by status (pending/in-progress/completed)

---

### 11. **AuthPage.tsx** - Authentication
**Location:** `src/pages/AuthPage.tsx`
**Route:** `/auth` (public)
**Purpose:** User login/signup

**Features:**
- Email/password authentication
- Social login (Google, etc.)
- Password reset
- Sign up flow

---

### 12. **AuthCallback.tsx** - OAuth Callback
**Location:** `src/pages/AuthCallback.tsx`
**Route:** `/auth/callback` (public)
**Purpose:** Handle OAuth redirects

---

### 13. **NotFound.tsx** - 404 Page
**Location:** `src/pages/NotFound.tsx`
**Route:** `*` (catch-all)
**Purpose:** Handle invalid routes

---

## 🧩 COMPONENTS (src/components/)

### Core Components

#### **TaskBar.tsx** - Bottom Navigation
**Location:** `src/components/TaskBar.tsx`
**Used In:** All main pages
**Purpose:** Persistent bottom navigation bar

**Props:**
- `showBack?: boolean` - Show back button
- `action?: ReactNode` - Custom action button (FAB)

**Features:**
- Safe area insets for mobile
- Animated transitions
- Custom action slot for page-specific buttons

---

#### **Mascot.tsx** - Animated Character
**Location:** `src/components/Mascot.tsx`
**Used In:** Home, onboarding, intros
**Purpose:** Friendly animated mascot

**Poses:**
- `thinking` - Contemplative
- `reading` - Studying
- `writing` - Taking notes
- `analyze` - Analyzing data
- `triumph` - Celebrating success
- `sleep` - Resting
- `work` - Working hard
- `reward` - Achievement

**Props:**
- `pose: string` - Mascot pose
- `size?: number` - Size in pixels

---

#### **OnboardingScreen.tsx** - Onboarding Steps
**Location:** `src/components/OnboardingScreen.tsx`
**Used In:** Index page
**Purpose:** Multi-step onboarding interface

**Steps:**
1. `system` - Educational system selection
2. `profile` - Student info (name, class, series)
3. `semester` - Nigerian semester selection
4. `target` - Target grade/GPA

**Props:**
- `step: OnboardingStep`
- `onStepChange: (step) => void`
- `gradingSystem: GradingSystem`
- `onGradingSystemChange: (system) => void`
- Plus all profile/target props

---

#### **SubjectsSetup.tsx** - Subject Selection
**Location:** `src/components/SubjectsSetup.tsx`
**Used In:** Index page (onboarding)
**Purpose:** Add/remove subjects with coefficients

**Features:**
- Predefined subject suggestions
- Custom subject input
- Coefficient adjustment
- Drag-to-reorder (optional)

**Props:**
- `subjects: Subject[]`
- `onSubjectsChange: (subjects) => void`
- `onContinue: () => void`
- `classLevel?: string`
- `serie?: string`

---

#### **MarksInput.tsx** - Grade Entry
**Location:** `src/components/MarksInput.tsx`
**Used In:** Index page, Home (edit sheet)
**Purpose:** Enter marks for all subjects

**Features:**
- Three mark types: Interro, Devoir, Compo
- Validation (0-20 range)
- Auto-save
- Skip empty marks

**Props:**
- `subjects: Subject[]`
- `onSubjectsChange: (subjects) => void`
- `onContinue: () => void`

---

#### **ResultsScreen.tsx** - Performance Summary
**Location:** `src/components/ResultsScreen.tsx`
**Used In:** Home (results sheet)
**Purpose:** Detailed performance breakdown

**Sections:**
- Overall average
- Subject-by-subject analysis
- Strengths/weaknesses
- Recommendations

---

#### **ProductTour.tsx** - Feature Walkthrough
**Location:** `src/components/ProductTour.tsx`
**Used In:** Home (first visit)
**Purpose:** Interactive app tour

**Features:**
- Spotlight on key features
- Step-by-step guidance
- Skip/dismiss option
- Progress indicator

---

### Nigerian System Components

#### **NigerianDashboard.tsx**
**Location:** `src/components/NigerianDashboard.tsx`
**Purpose:** Nigerian university system dashboard

**Features:**
- CGPA display
- Class of degree
- Semester breakdown
- Credit units tracking

---

#### **NigerianAssessmentSheet.tsx**
**Location:** `src/components/NigerianAssessmentSheet.tsx`
**Purpose:** Manage semesters and courses

**Features:**
- Add/remove semesters
- Add/remove courses
- Credit units input
- Score entry
- GPA calculation

---

### French System Components

#### **FrenchClassView.tsx**
**Location:** `src/components/FrenchClassView.tsx`
**Purpose:** French education system view

**Features:**
- Class ranking
- Appreciation display
- Comparative analysis

---

### Subscription Components

#### **PremiumIntroSheet.tsx**
**Location:** `src/components/subscription/PremiumIntroSheet.tsx`
**Purpose:** Introduce premium features

---

#### **PlanSelectSheet.tsx**
**Location:** `src/components/subscription/PlanSelectSheet.tsx`
**Purpose:** Choose subscription plan

**Options:**
- All subjects (full access)
- Subject pack (select specific subjects)

---

#### **SubjectPackSheet.tsx**
**Location:** `src/components/subscription/SubjectPackSheet.tsx`
**Purpose:** Select subjects for pack subscription

---

#### **PaymentSheet.tsx**
**Location:** `src/components/subscription/PaymentSheet.tsx`
**Purpose:** Process payment

---

### UI Components (src/components/ui/)

Standard shadcn/ui components:
- `Button`, `Input`, `Card`, `Dialog`, `Sheet`
- `Tabs`, `Select`, `Checkbox`, `Switch`
- `Toast`, `Tooltip`, `Popover`
- And more...

---

## 🔧 CORE LOGIC (src/lib/)

### **storage.ts** - Data Persistence
**Location:** `src/lib/storage.ts`

**Key Functions:**
- `saveState(state: AppState)` - Save to localStorage
- `loadState(): AppState | null` - Load from localStorage
- `getStreak(): number` - Get current streak
- `getHistory(): HistoryEntry[]` - Get mark history
- `addHistoryEntry(entry)` - Add to history

**Storage Keys:**
- `scoretarget_state` - Main app state
- `scoretarget_history` - Mark history
- `scoretarget_streak` - Streak data

---

### **exam-logic.ts** - Grade Calculations
**Location:** `src/lib/exam-logic.ts`

**Key Functions:**
- `calcYearlyAverage(subjects)` - Calculate overall average
- `getPredictedRange(subjects)` - Min/max possible average
- `getAbsoluteBounds(subjects)` - Absolute min/max
- `simulateYearlyAverage(subjects, overrides)` - What-if simulation

**Logic:**
- Weighted by coefficient
- Handles partial marks
- Respects assessment weights

---

### **grading-apc.ts** - APC System
**Location:** `src/lib/grading-apc.ts`

**Functions:**
- `calcAPCYearlyAverage(subjects, weighted)` - APC-specific calculation
- `getPerformanceAlerts(subjects, target)` - Generate warnings

---

### **grading-french.ts** - French System
**Location:** `src/lib/grading-french.ts`

**Functions:**
- French-specific grading rules
- Class ranking calculations
- Appreciation handling

---

### **grading-nigerian.ts** - Nigerian System
**Location:** `src/lib/grading-nigerian.ts`

**Key Functions:**
- `scoreToGrade(score)` - Convert score to letter grade
- `computeGP(score, creditUnits)` - Calculate grade points
- `computeSemesterGPA(courses)` - Semester GPA
- `computeCGPA(semesters)` - Cumulative GPA
- `classifyDegree(cgpa)` - Determine class of degree
- `validateScore(score)` - Validate 0-100 range
- `validateCreditUnits(units)` - Validate 1-6 range

**Grade Scale:**
- A: 70-100 (5.0 points)
- B: 60-69 (4.0 points)
- C: 50-59 (3.0 points)
- D: 45-49 (2.0 points)
- E: 40-44 (1.0 points)
- F: 0-39 (0.0 points)

---

### **grading-engine-registry.ts** - System Registry
**Location:** `src/lib/grading-engine-registry.ts`

**Purpose:** Manage multiple grading systems

**Functions:**
- `registerEngine(system, engine)` - Register grading system
- `getEngine(system)` - Get grading engine
- `calculateAverage(system, subjects)` - Calculate using correct system

---

## 🌐 SERVICES (src/services/)

### **downloadService.ts** - File Management
**Location:** `src/services/downloadService.ts`

**Functions:**
- `downloadPaper(paperId, url)` - Download PDF
- `getDownloadedPapers()` - List downloads
- `deletePaper(paperId)` - Remove download
- `deleteMultiplePapers(ids)` - Bulk delete

**Storage:**
- Uses Capacitor Filesystem API
- Stores in app's documents directory

---

### **cacheService.ts** - Data Caching
**Location:** `src/services/cacheService.ts`

**Functions:**
- `getCachedPapers()` - Get cached paper metadata
- `cachePaper(paper)` - Cache paper info
- `clearCache()` - Clear all cache
- `clearAll()` - Clear everything

---

### **cloudSyncService.ts** - Cloud Sync
**Location:** `src/services/cloudSyncService.ts`

**Functions:**
- `syncToCloud(state)` - Upload state to Supabase
- `syncFromCloud()` - Download state from Supabase
- `resolveConflicts(local, remote)` - Merge conflicts

---

### **subscriptionService.ts** - Premium Features
**Location:** `src/services/subscriptionService.ts`

**Functions:**
- `checkSubscription()` - Verify premium status
- `purchaseSubscription(plan)` - Process purchase
- `cancelSubscription()` - Cancel premium

---

### **adminService.ts** - Admin Functions
**Location:** `src/services/adminService.ts`

**Functions:**
- `uploadPaper(file, metadata)` - Upload exam paper
- `deletePaper(paperId)` - Remove paper
- `updatePaper(paperId, metadata)` - Edit paper info

---

## 🎨 CONTEXTS (src/contexts/)

### **ThemeContext.tsx** - Theme Management
**Location:** `src/contexts/ThemeContext.tsx`

**Provides:**
- `theme: Theme` - Current theme
- `setTheme(theme)` - Change theme
- `accent: AccentColor` - Current accent
- `setAccent(color)` - Change accent

**Themes:**
- `light`, `dark`, `system`, `midnight`, `ink`

**Accents:**
- Orange, Blue, Green, Purple, Red, Pink, Teal, Yellow, Indigo

---

### **LanguageContext.tsx** - Internationalization
**Location:** `src/contexts/LanguageContext.tsx`

**Provides:**
- `language: 'en' | 'fr'` - Current language
- `setLang(lang)` - Change language
- `t(key)` - Translate key

**Translation Files:**
- `src/lib/i18n.ts` - Translation strings

---

### **AuthContext.tsx** - Authentication
**Location:** `src/contexts/AuthContext.tsx`

**Provides:**
- `user: User | null` - Current user
- `signIn(email, password)` - Login
- `signUp(email, password)` - Register
- `signOut()` - Logout
- `loading: boolean` - Auth state loading

---

## 📊 TYPES (src/types/)

### **exam.ts** - Core Types
**Location:** `src/types/exam.ts`

**Key Types:**

```typescript
type GradingSystem = 'apc' | 'french' | 'nigerian_university';

interface Subject {
  id: string;
  name: string;
  coefficient: number;
  marks: {
    interro: number | null;
    dev: number | null;
    compo: number | null;
  };
  french?: {
    classAverage: number | null;
    classMin: number | null;
    classMax: number | null;
    appreciation: number | null;
  };
  customAssessments?: Assessment[];
}

interface AppState {
  step: 'onboarding' | 'subjects' | 'marks' | 'results';
  targetAverage: number;
  targetMin: number;
  subjects: Subject[];
  settings: AppSettings;
  studentName?: string;
  classLevel?: string;
  serie?: string;
  semester?: string;
  department?: string;
  universityLevel?: string;
  savedStrategy?: SavedStrategy;
  nigerianState?: NigerianState;
}

interface AppSettings {
  gradingSystem: GradingSystem;
  weights: {
    interro: number;
    dev: number;
    compo: number;
  };
  rounding: RoundingMode;
  colorThresholds: {
    greenBelow: number;
    yellowBelow: number;
  };
  notifications: {
    targetUnreachable: boolean;
    subjectCritical: boolean;
    canSaveAverage: boolean;
  };
  apcWeightedSplit?: boolean;
}
```

---

### **nigerian.ts** - Nigerian Types
**Location:** `src/types/nigerian.ts`

**Key Types:**

```typescript
interface NigerianCourse {
  id: string;
  name: string;
  creditUnits: number;
  score: number;
  letter: string;
  gradePoints: number;
  gp: number;
}

interface NigerianSemester {
  id: string;
  sessionLabel: string;
  name: string;
  courses: NigerianCourse[];
  gpa: number;
}

interface NigerianState {
  semesters: NigerianSemester[];
  cgpa: number;
  classOfDegree: string;
  targetCGPA: number | null;
  remainingCreditUnits: number;
}
```

---

## 🔐 AUTHENTICATION FLOW

1. User visits app → Redirected to `/auth` if not logged in
2. Login/signup via Supabase Auth
3. OAuth callback handled by `/auth/callback`
4. Successful auth → Check onboarding status
5. If no data → Redirect to `/onboarding`
6. If data exists → Redirect to `/` (Home)

**Protected Routes:**
- All routes except `/auth` and `/auth/callback` require authentication
- Routes with `requireOnboarding` prop also require completed onboarding

---

## 📱 NAVIGATION STRUCTURE

```
/auth (public)
  └─ Login/Signup

/auth/callback (public)
  └─ OAuth redirect handler

/onboarding (protected)
  └─ Multi-step setup

/ (protected + onboarding required)
  └─ Home Dashboard
      ├─ /simulator
      ├─ /library
      │   └─ /library/:paperId
      ├─ /subject/:subjectName
      ├─ /my-downloads
      ├─ /settings
      ├─ /profile
      └─ /feedback
```

---

## 🎯 KEY USER FLOWS

### First-Time User
1. Sign up at `/auth`
2. Redirected to `/onboarding`
3. Select educational system
4. Enter profile info
5. Set target grade
6. Add subjects
7. Enter initial marks
8. Redirected to `/` (Home)
9. See product tour

### Daily Usage
1. Open app → Home dashboard
2. Tap **+** button → Enter new mark
3. View updated average
4. Check subject breakdown
5. Navigate to Library → Download papers
6. Use Simulator → Plan future scores

### Exam Preparation
1. Navigate to Library
2. Switch to "Pass Smarter" tab
3. Select subject
4. View premium prep materials (if subscribed)
5. Download relevant past papers
6. Access from My Downloads offline

---

## 🔄 DATA FLOW

### State Management
- **Local State:** React `useState` for UI
- **Persistent State:** localStorage via `storage.ts`
- **Cloud Sync:** Supabase (optional, for backup)

### Data Persistence
1. User makes change (e.g., enters mark)
2. Component updates local state
3. `useEffect` triggers `saveState()`
4. Data saved to localStorage
5. Optional: Background sync to Supabase

### Data Loading
1. App loads → `loadState()` called
2. Check localStorage for `scoretarget_state`
3. If found → Parse and validate
4. If not found → Show onboarding
5. Migrate old data formats if needed

---

## 🎨 THEMING SYSTEM

### Theme Structure
- **Base themes:** light, dark, system
- **Special themes:** midnight (OLED), ink (paper-like)
- **Accent colors:** 9 options (orange default)

### CSS Variables
Defined in `src/index.css`:
- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`

### Accent Color System
Managed by `ThemeContext`:
- Stored in localStorage as `gostudy_accent`
- Applied via CSS custom properties
- Affects buttons, links, highlights

---

## 🌍 INTERNATIONALIZATION

### Supported Languages
- English (`en`)
- French (`fr`)

### Translation System
- Managed by `LanguageContext`
- Translations in `src/lib/i18n.ts`
- Usage: `const { t } = useLanguage(); t('key')`

### Adding Translations
1. Add key to `translations` object in `i18n.ts`
2. Provide English and French strings
3. Use `t('key')` in components

---

## 🔔 NOTIFICATION SYSTEM

### Types
1. **Toast Notifications:** Quick feedback (via Sonner)
2. **In-App Alerts:** Performance warnings
3. **Push Notifications:** (Future feature)

### Triggers
- Mark entered
- Target reached/missed
- Strategy saved
- Paper downloaded
- Subscription changes

---

## 💾 DATABASE SCHEMA (Supabase)

### Tables

#### `exam_papers`
- `id` (uuid, primary key)
- `title` (text)
- `subject` (text)
- `class_level` (text)
- `year` (integer)
- `exam_type` (text)
- `serie` (text, nullable)
- `file_url` (text)
- `preview_url` (text, nullable)
- `created_at` (timestamp)

#### `user_states` (Cloud Sync)
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `state_data` (jsonb)
- `updated_at` (timestamp)

#### `subscriptions`
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `plan` (text)
- `status` (text)
- `subjects` (text[], nullable)
- `expires_at` (timestamp)

#### `feedback_items`
- `id` (uuid, primary key)
- `user_id` (uuid, foreign key)
- `title` (text)
- `description` (text)
- `category` (text)
- `votes` (integer)
- `status` (text)
- `created_at` (timestamp)

---

## 🧪 TESTING

### Test Files
- `src/lib/grading-nigerian.test.ts` - Nigerian grading logic
- `src/lib/grading-engine-registry.test.ts` - System registry
- `src/services/adminService.test.ts` - Admin functions
- `src/services/pdf-viewer.integration.test.ts` - PDF viewer

### Running Tests
```bash
npm run test
```

---

## 🚀 BUILD & DEPLOYMENT

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Android Build
```bash
npm run build
npx cap sync android
npx cap open android
```

### iOS Build
```bash
npm run build
npx cap sync ios
npx cap open ios
```

---

## 🐛 COMMON ISSUES & SOLUTIONS

### Issue: Marks not saving
**Location:** Check `src/lib/storage.ts`
**Solution:** Verify localStorage is enabled, check browser console for errors

### Issue: Average calculation wrong
**Location:** Check `src/lib/exam-logic.ts` or system-specific files
**Solution:** Verify weights and coefficients, check rounding settings

### Issue: PDF not loading
**Location:** Check `src/services/downloadService.ts`
**Solution:** Verify file URL, check Capacitor filesystem permissions

### Issue: Theme not applying
**Location:** Check `src/contexts/ThemeContext.tsx`
**Solution:** Verify CSS variables in `src/index.css`, check localStorage

---

## 📝 ADDING NEW FEATURES

### Adding a New Page
1. Create file in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation link in `TaskBar.tsx` or relevant component
4. Add translations in `src/lib/i18n.ts`
5. Update this README

### Adding a New Component
1. Create file in `src/components/NewComponent.tsx`
2. Define props interface
3. Import and use in relevant pages
4. Add to this README

### Adding a New Grading System
1. Create `src/lib/grading-newsystem.ts`
2. Implement grading functions
3. Register in `src/lib/grading-engine-registry.ts`
4. Add type to `GradingSystem` in `src/types/exam.ts`
5. Update onboarding to include new system
6. Add translations

---

## 📞 SUPPORT & CONTACT

For questions about the codebase:
1. Check this README first
2. Review relevant source files
3. Check inline code comments
4. Review Git commit history

---

## 📄 LICENSE

[Add your license information here]

---

**Last Updated:** [Current Date]
**Version:** 1.0.0
**Maintainer:** [skydrake]
