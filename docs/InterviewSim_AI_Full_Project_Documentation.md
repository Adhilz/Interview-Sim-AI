# InterviewSim AI — Complete Project Documentation

**Version:** 1.0  
**Date:** February 16, 2026  
**Platform:** React + TypeScript + Supabase (Lovable Cloud)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Application Architecture](#3-application-architecture)
4. [Routing & Page Navigation Map](#4-routing--page-navigation-map)
5. [Page-by-Page Code Explanation](#5-page-by-page-code-explanation)
6. [Component Architecture](#6-component-architecture)
7. [API & Edge Function Integrations](#7-api--edge-function-integrations)
8. [Database Schema & RLS Policies](#8-database-schema--rls-policies)
9. [Authentication & Authorization Flow](#9-authentication--authorization-flow)
10. [External Service Integrations](#10-external-service-integrations)
11. [File Structure Reference](#11-file-structure-reference)

---

## 1. Project Overview

**InterviewSim AI** is a full-stack, college-grade AI mock interview platform. Students attend timed voice + video interviews conducted by a VAPI Voice Assistant with a Simli-powered lip-sync avatar. The platform includes:

- Secure authentication with **College Codes** (institutional linking)
- **Resume Upload** with AI-powered OCR parsing (Gemini Vision)
- **ATS Resume Scoring** with detailed feedback
- **3 Interview Modes**: Resume+JD, Technical, HR Behavioral
- **Real-time AI Avatar** (Simli) with lip-sync animation
- **Auto-evaluation** with strict scoring rubrics
- **Aptitude MCQ Tests** (AI-generated, CAT/GRE level)
- **College Admin Dashboard** with student monitoring
- **Interview History** with detailed per-question analysis

**Published URL:** https://interviewsimulationai.lovable.app

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS + shadcn/ui + Framer Motion |
| **State** | React Query (@tanstack/react-query) |
| **Routing** | React Router DOM v6 |
| **Backend** | Supabase (Lovable Cloud) — PostgreSQL + Edge Functions |
| **Auth** | Supabase Auth (Email/Password + College Code) |
| **Voice AI** | VAPI Web SDK (@vapi-ai/web) |
| **Avatar** | Simli Client SDK (simli-client) — WebRTC lip-sync |
| **AI Models** | Lovable AI Gateway (Gemini 2.5 Flash, Gemini 3 Flash Preview) |
| **PDF Parsing** | pdfjs-dist (client-side) + Gemini Vision OCR (server-side) |
| **Validation** | Zod |
| **Storage** | Supabase Storage (resumes, avatars buckets) |

---

## 3. Application Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     FRONTEND (React/Vite)                    │
│                                                              │
│  Landing ─→ Auth ─→ Dashboard ─→ Interview ─→ History       │
│                   ─→ Resume ─→ ATS Score                     │
│                   ─→ Aptitude Test                            │
│                   ─→ Profile                                  │
│                   ─→ Admin Dashboard                          │
│                   ─→ Help                                     │
├──────────────────────────────────────────────────────────────┤
│                   SUPABASE EDGE FUNCTIONS                     │
│                                                              │
│  vapi-interview     → Configures VAPI assistant sessions     │
│  evaluate-interview → AI evaluation of transcripts           │
│  parse-resume       → Resume text extraction + AI parsing    │
│  ats-score          → ATS compatibility analysis             │
│  admin-signup       → Secure admin account creation          │
│  generate-aptitude  → AI aptitude question generation        │
│  simli-config       → Simli API key delivery (JWT-gated)     │
├──────────────────────────────────────────────────────────────┤
│                   SUPABASE DATABASE (PostgreSQL)              │
│                                                              │
│  profiles, user_roles, university_codes,                     │
│  resumes, resume_highlights, ats_scores,                     │
│  interviews, interview_sessions, vapi_logs,                  │
│  evaluations, improvement_suggestions,                       │
│  aptitude_tests, avatar_sessions, admin_notifications        │
├──────────────────────────────────────────────────────────────┤
│                   EXTERNAL SERVICES                           │
│                                                              │
│  VAPI.ai      → Voice AI interview engine                    │
│  Simli        → Real-time lip-sync avatar (WebRTC)           │
│  Lovable AI   → Gemini models for parsing/evaluation         │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Routing & Page Navigation Map

**File:** `src/App.tsx`

| Route | Page Component | File | Access | Description |
|-------|---------------|------|--------|-------------|
| `/` | `Landing` | `src/pages/Landing.tsx` | Public | Marketing landing page with animated background, features, CTA |
| `/login` | `Auth` | `src/pages/Auth.tsx` | Public | Login form with email/password |
| `/signup` | `Auth` | `src/pages/Auth.tsx` | Public | Signup with role selection (Student/Admin) |
| `/forgot-password` | `Auth` | `src/pages/Auth.tsx` | Public | Password reset email request |
| `/reset-password` | `ResetPassword` | `src/pages/ResetPassword.tsx` | Public | Set new password (via email link) |
| `/dashboard` | `Dashboard` | `src/pages/Dashboard.tsx` | Student | Student home — stats, quick actions, recent interviews |
| `/interview` | `Interview` | `src/pages/Interview.tsx` | Student | Mode select → Setup → Live interview → Evaluation |
| `/resume` | `Resume` | `src/pages/Resume.tsx` | Student | Upload, parse, view highlights, ATS scoring |
| `/history` | `InterviewHistory` | `src/pages/InterviewHistory.tsx` | Student | Past interviews with scores & feedback |
| `/aptitude` | `AptitudeTest` | `src/pages/AptitudeTest.tsx` | Student + Admin | 10-question AI-generated MCQ test |
| `/profile` | `Profile` | `src/pages/Profile.tsx` | Student | Edit name, avatar, permissions |
| `/help` | `Help` | `src/pages/Help.tsx` | Student + Admin | FAQ, system status, email support |
| `/admin` | `AdminDashboard` | `src/pages/AdminDashboard.tsx` | Admin | Student management, analytics, notifications |
| `*` | `NotFound` | `src/pages/NotFound.tsx` | Public | 404 page |

### Navigation Flow Diagram

```
Landing Page (/)
    ├── "Get Started" → /signup
    ├── "Login" → /login
    └── Logo click → /

Auth (/login, /signup, /forgot-password)
    ├── Login success (student) → /dashboard
    ├── Login success (admin) → /admin
    ├── Signup success → Email verification → /login
    ├── Admin signup → /login (with college code)
    └── Forgot password → /reset-password (via email link)

Student Dashboard (/dashboard)
    ├── "Start New Interview" → /interview
    ├── "Upload Resume" → /resume
    ├── "View All" (history) → /history
    └── Sidebar links → /interview, /resume, /history, /aptitude, /profile, /help

Interview Page (/interview)
    ├── Step 1: Mode Select (resume_jd / technical / hr)
    ├── Step 2: Duration Select (3 or 5 min) + Pre-interview camera setup
    ├── Step 3: Live Interview Room (fullscreen, VAPI + Simli avatar)
    ├── Step 4: Auto-evaluation (loading screen)
    └── Step 5: Results display with scores + feedback

Admin Dashboard (/admin)
    ├── Tab: Overview (stats, skill metrics, weak areas)
    ├── Tab: Interviews (all student interviews with filters)
    ├── Tab: Students (manage, unlink, edit branch, CSV export)
    ├── Tab: Codes (manage college codes)
    ├── Tab: Aptitude (view student test results)
    └── Bell icon: Real-time notifications
```

---

## 5. Page-by-Page Code Explanation

### 5.1 Landing Page (`src/pages/Landing.tsx`)

**Purpose:** Marketing page for unauthenticated visitors.

**How it works:**
1. Fetches platform metrics (total users, interviews, average score) from database on mount
2. Falls back to demo values if RLS blocks anonymous access (expected behavior)
3. Renders sub-components: `AnimatedBackground`, `Navbar`, `HeroSection`, `FeaturesSection`, `CTASection`, `Footer`
4. Uses a dark futuristic theme (`bg-[#0a1628]`)

**Sub-components (in `src/components/landing/`):**
- `AnimatedBackground.tsx` — Animated particle/gradient background
- `Navbar.tsx` — Top nav with logo, Login/Signup buttons
- `HeroSection.tsx` — Hero banner with stats counters
- `FeaturesSection.tsx` — Feature cards (Resume AI, Mock Interview, etc.)
- `CTASection.tsx` — Call-to-action section
- `Footer.tsx` — Footer with links

---

### 5.2 Auth Page (`src/pages/Auth.tsx`)

**Purpose:** Handles Login, Signup (Student + Admin), and Forgot Password — all on one component using route-based rendering (`/login`, `/signup`, `/forgot-password`).

**How it works:**

1. **Route Detection:** Uses `useLocation()` to determine which form to show based on current path
2. **Validation:** Uses Zod schemas (`loginSchema`, `studentSignupSchema`, `adminSignupSchema`, `forgotPasswordSchema`)
3. **Login Flow:**
   - Calls `supabase.auth.signInWithPassword()`
   - Fetches user role from `user_roles` table
   - Redirects: admin → `/admin`, student → `/dashboard`
4. **Student Signup Flow:**
   - Validates college code via `supabase.rpc('validate_university_code')`
   - Creates user with `supabase.auth.signUp()` passing metadata (full_name, university_code_id, branch)
   - DB trigger `handle_new_user` automatically creates profile + assigns student role
5. **Admin Signup Flow:**
   - Calls edge function `admin-signup` (POST to `/functions/v1/admin-signup`)
   - Edge function uses service role key to: create user → create university_code → update role to admin
   - Returns generated college code to display
6. **Forgot Password:**
   - Calls `supabase.auth.resetPasswordForEmail()` with redirect to `/reset-password`

**Role Selection UI:** Two cards (Student with graduation cap icon, Admin with building icon) that toggle the signup form fields.

---

### 5.3 Reset Password Page (`src/pages/ResetPassword.tsx`)

**Purpose:** Handles password reset after clicking email link.

**How it works:**
1. Extracts `access_token` and `type=recovery` from URL hash
2. Sets session using `supabase.auth.setSession()`
3. Shows password form with strength indicator (6 checks: length, uppercase, lowercase, number, special char)
4. On submit: calls `supabase.auth.updateUser({ password })` → signs out → redirects to `/login`

---

### 5.4 Student Dashboard (`src/pages/Dashboard.tsx`)

**Purpose:** Student home page with overview stats and quick actions.

**How it works:**
1. Fetches on mount: profile, total interviews (count), completed interviews (count), recent 5 interviews, all evaluations
2. Calculates average score from evaluations
3. Displays: 3 stat cards (Total, Completed, Avg Score), 2 quick action cards (Start Interview, Upload Resume), recent interviews list
4. Uses `StudentSidebar` for navigation

**Data Sources:**
- `profiles` table → user name, avatar
- `interviews` table → count, recent list
- `evaluations` table → scores

---

### 5.5 Interview Page (`src/pages/Interview.tsx`)

**Purpose:** The core interview flow — mode selection through to evaluation display.

**State Machine:** `mode_select` → `setup` → `ready` → `connecting` → `in_progress` → `evaluating` → `completed`

**How it works:**

1. **Mode Select** (`InterviewModeSelector` component):
   - 3 modes: Resume+JD (requires uploaded resume), Technical, HR Behavioral
   - Duration select: 3 or 5 minutes

2. **Pre-Interview Setup** (`PreInterviewSetup` component):
   - Requests camera/mic permissions
   - Shows video preview
   - Optional: Job description/preferences textarea (Resume+JD mode only)

3. **Start Interview:**
   - Creates interview record in `interviews` table
   - Calls `vapi-interview` edge function with `action: 'start'`
   - Edge function returns: sessionId, firstMessage, assistantOverrides (system prompt)
   - Switches to fullscreen `InterviewRoom`

4. **Live Interview** (`InterviewRoom` component):
   - Fetches Simli config from `simli-config` edge function
   - Initializes Simli avatar (WebRTC lip-sync)
   - **Gate:** VAPI only starts AFTER Simli avatar is ready
   - VAPI handles voice conversation, Simli handles visual lip-sync
   - Audio pipeline: VAPI audio → plays to user + piped to Simli for lip-sync
   - Captures transcript from VAPI `message` and `conversation-update` events
   - Timer countdown with 30-second warning (spoken by AI)
   - At 0 seconds: AI speaks closing message, call ends

5. **End Interview:**
   - Updates interview status to `completed`
   - Calls `evaluate-interview` edge function with transcript + candidate profile
   - Shows `EvaluationDisplay` with scores, feedback, per-question analysis

**Key Components:**
- `InterviewModeSelector.tsx` — 3-card mode selection grid
- `PreInterviewSetup.tsx` — Camera preview + preferences
- `InterviewRoom.tsx` — Fullscreen interview room (Simli avatar + user video + controls)
- `SimliAvatar.tsx` — Simli WebRTC avatar component
- `InterviewSettings.tsx` — Settings dialog (mic/speaker select, avatar toggle)
- `EvaluationDisplay.tsx` — Post-interview score display

---

### 5.6 Resume Page (`src/pages/Resume.tsx`)

**Purpose:** Resume upload, AI parsing, ATS analysis.

**How it works:**

1. **Upload:**
   - Validates file type (PDF/Word) and size (< 5MB)
   - Uploads to Supabase Storage `resumes` bucket
   - Creates record in `resumes` table

2. **Parse:**
   - Extracts text client-side using `pdfjs-dist`
   - Validates extracted text quality (alphanumeric ratio, resume keywords check)
   - If text extraction fails → sends base64 file for server-side OCR
   - Calls `parse-resume` edge function
   - Edge function uses Gemini Vision for OCR if needed, then Gemini 2.5 Flash for structured extraction
   - Saves to `resume_highlights` table (skills, tools, projects, experience, education, summary)

3. **Display:**
   - Shows parsed highlights in organized cards (Skills, Tools, Summary, Projects, Experience, Education)
   - Shows ATS score panel if previously analyzed

4. **ATS Analysis:**
   - User selects a job role via `JobRoleCombobox`
   - Calls `ats-score` edge function with resume text + target role
   - Uses Gemini 3 Flash Preview for comprehensive ATS scoring
   - Displays: overall score gauge, section scores, strengths/weaknesses, missing keywords, recruiter review, improvement suggestions, optimized bullet points

**Key Components:**
- `ATSAnalysisPanel.tsx` — Full ATS results display
- `ATSScoreGauge.tsx` — Circular score gauge
- `ATSSectionScore.tsx` — Individual section score bars
- `JobRoleCombobox.tsx` — Searchable job role selector

---

### 5.7 Interview History (`src/pages/InterviewHistory.tsx`)

**Purpose:** View all past interviews with detailed evaluations.

**How it works:**
1. Fetches all interviews, evaluations, and improvement suggestions for the user
2. Displays summary stats (total, completed, avg score, total minutes)
3. Each interview is a collapsible card showing:
   - Duration, status badge, date/time
   - Overall/technical/communication/confidence scores
   - AI feedback paragraph
   - Improvement areas with categories

---

### 5.8 Aptitude Test (`src/pages/AptitudeTest.tsx`)

**Purpose:** AI-generated MCQ aptitude test (10 questions, CAT/GRE/GMAT level).

**How it works:**
1. **Start:** Calls `generate-aptitude-questions` edge function (JWT-authenticated)
2. **In Progress:** Shows one question at a time with radio options, progress bar, difficulty badge
3. **Submit:** After all 10 answers, calculates score and saves to `aptitude_tests` table
4. **Review:** Shows all questions with correct/incorrect indicators
5. **History:** Sidebar shows last 10 test scores

---

### 5.9 Profile (`src/pages/Profile.tsx`)

**Purpose:** User profile management.

**Features:**
- Avatar upload (to Supabase `avatars` bucket, public)
- Edit full name
- View college name and code (read-only)
- Toggle camera/microphone permissions
- Save changes to `profiles` table

---

### 5.10 Help (`src/pages/Help.tsx`)

**Purpose:** Support page with FAQ, system status, and contact.

**Features:**
- Send message via email app or Gmail compose
- 8 FAQ items in accordion
- System status indicators (Interview, Video, Resume, Auth, Database)
- Support email contacts
- Quick links to Dashboard, Interview, Resume

---

### 5.11 Admin Dashboard (`src/pages/AdminDashboard.tsx`)

**Purpose:** College administrator dashboard for student monitoring.

**Features:**
1. **Overview Tab:**
   - Stats: total students, interviews, completed, avg score
   - Skill metrics (Technical, Communication, Confidence averages)
   - Common weak areas chart
   - Performance filter (Above/Below average)

2. **Interviews Tab:**
   - All student interviews with: name, email, mode, duration, score, status
   - Branch filter

3. **Students Tab:**
   - Student list with interview count, avg score, branch, last interview date
   - Actions: Unlink student, Edit branch
   - CSV export (per branch)
   - Branch filter

4. **Codes Tab:**
   - View/manage college codes
   - Generate new codes with optional max usage limit
   - Copy code to clipboard

5. **Aptitude Tab:**
   - View all student aptitude test results
   - Branch filter

6. **Notifications:**
   - Real-time via Supabase Realtime (postgres_changes on `admin_notifications`)
   - Bell icon with unread count
   - Mark individual/all as read

7. **College Rename:**
   - Dialog to rename college in `university_codes` table

---

## 6. Component Architecture

### Shared Components

| Component | File | Used By |
|-----------|------|---------|
| `StudentSidebar` | `src/components/StudentSidebar.tsx` | Dashboard, Interview, Resume, History, Aptitude, Profile |
| `ProtectedRoute` | `src/components/ProtectedRoute.tsx` | All authenticated routes (wraps in App.tsx) |
| `ThemeToggle` | `src/components/ThemeToggle.tsx` | Landing navbar |
| `NavLink` | `src/components/NavLink.tsx` | Navigation helper |

### `ProtectedRoute` Logic:
1. Checks `supabase.auth.getSession()`
2. If no session → redirects to `/login`
3. Fetches user role from `user_roles` table
4. If role not in `allowedRoles` → redirects to appropriate dashboard
5. Listens to `onAuthStateChange` for session expiry

### `StudentSidebar` Navigation Items:
- Dashboard (`/dashboard`)
- New Interview (`/interview`)
- Resume (`/resume`)
- History (`/history`)
- Aptitude Test (`/aptitude`)
- Profile (`/profile`)
- Help (`/help`)
- Logout button

---

## 7. API & Edge Function Integrations

### 7.1 `vapi-interview` Edge Function

**File:** `supabase/functions/vapi-interview/index.ts`  
**Auth:** JWT required (`verify_jwt: true`)  
**Actions:**

| Action | Method | Description |
|--------|--------|-------------|
| `get_config` | POST | Returns VAPI `publicKey` and `assistantId` from secrets |
| `start` | POST | Creates interview session, builds mode-specific system prompt, returns assistantOverrides |

**System Prompt Building (per mode):**
- **resume_jd:** `buildResumeJDSystemPrompt()` — Builds randomized interview strategy from resume data (projects, skills, experience). Includes question pools with random ordering. Optionally includes user-provided job description context.
- **technical:** `buildTechnicalSystemPrompt()` — Phase 1: asks candidate's target role. Phase 2: role-specific technical questions (CS, Data Science, Design, Marketing, Engineering, Finance, Medical, Law, etc.)
- **hr:** `buildHRSystemPrompt()` — Behavioral STAR-method interview with leadership, teamwork, conflict resolution questions.

**Data Flow:**
```
Client → POST /functions/v1/vapi-interview
  body: { action: 'start', interviewId, interviewMode, resumeHighlights, interviewerPreferences }
  ↓
Edge Function:
  1. Verify JWT auth
  2. Create interview_sessions record
  3. Build system prompt based on mode
  4. Return { sessionId, firstMessage, assistantOverrides }
  ↓
Client starts VAPI call with assistantOverrides
```

---

### 7.2 `evaluate-interview` Edge Function

**File:** `supabase/functions/evaluate-interview/index.ts`  
**Auth:** JWT required  
**AI Model:** Lovable AI Gateway (configurable per mode)

**Evaluation Flow:**
1. Receives transcript + interviewId + mode
2. Tries to fetch authoritative transcript from VAPI API (using `VAPI_API_KEY`)
3. Falls back to client-provided transcript if VAPI fetch fails
4. Selects evaluation prompt based on mode:
   - `RESUME_JD_EVALUATION_PROMPT` — Strict scoring: Communication, Technical Accuracy, Confidence, Relevance
   - `TECHNICAL_EVALUATION_PROMPT` — Response Quality, Domain Knowledge, Problem Solving, Explanation Clarity
   - `HR_EVALUATION_PROMPT` — Communication Clarity, Response Depth, Confidence Level, Professionalism
5. Sends transcript to AI for evaluation
6. Parses JSON response, calculates overall score (0-100)
7. Saves to `evaluations` table + `improvement_suggestions` table
8. Returns evaluation data to client

---

### 7.3 `parse-resume` Edge Function

**File:** `supabase/functions/parse-resume/index.ts`  
**Auth:** JWT required  
**AI Model:** Gemini 2.5 Flash (parsing), Gemini 2.5 Flash Vision (OCR)

**Flow:**
1. Receives extracted text + optional base64 file
2. If text extraction failed (gibberish, too short, no resume keywords) → uses Gemini Vision OCR on base64 image
3. Sends clean text to AI with structured extraction prompt
4. Parses JSON output: name, email, skills, tools, projects, experience, education, summary
5. Saves/updates `resume_highlights` table
6. Updates `resumes.parsed_at` timestamp

---

### 7.4 `ats-score` Edge Function

**File:** `supabase/functions/ats-score/index.ts`  
**Auth:** JWT required  
**AI Model:** Gemini 3 Flash Preview

**Flow:**
1. Receives resume text + job role + optional base64 for OCR
2. Performs OCR if text quality is poor
3. Sends to AI with detailed ATS analysis prompt
4. Returns: overall_score, keyword_match_percentage, section_scores, missing_keywords, strengths, weaknesses, formatting_issues, recruiter_review, improvement_suggestions, optimized_bullets
5. Saves/updates `ats_scores` table

---

### 7.5 `admin-signup` Edge Function

**File:** `supabase/functions/admin-signup/index.ts`  
**Auth:** None (public, but rate-limited)

**Security Measures:**
- Rate limiting: 3 signups per IP per hour
- Origin validation (only lovable domains + localhost)
- Input validation (email format, password length, name length limits)

**Flow:**
1. Generate college code: `{First3CharsOfName}{timestamp_base36}`
2. Create user via `supabase.auth.admin.createUser()` (auto-confirmed)
3. Create `university_codes` record with `admin_user_id`
4. Update profile's `university_id`
5. Update `user_roles` from student → admin
6. Rollback on failure (delete user + university code)

---

### 7.6 `generate-aptitude-questions` Edge Function

**File:** `supabase/functions/generate-aptitude-questions/index.ts`  
**Auth:** JWT required  
**AI Model:** Gemini 2.5 Flash

**Flow:**
1. Verify JWT authentication
2. Send prompt to AI requesting 10 MCQ questions (4 medium-hard, 6 hard)
3. Topics: number series, logic puzzles, percentages, probability, coding-decoding, syllogisms, etc.
4. Parse JSON array response
5. Validate exactly 10 questions
6. Return questions to client

---

### 7.7 `simli-config` Edge Function

**File:** `supabase/functions/simli-config/index.ts`  
**Auth:** JWT required (`verify_jwt: false` in config, but manual JWT check in code)

**Flow:**
1. Verify JWT
2. Read `SIMLI_API_KEY` and `SIMLI_FACE_ID` from secrets
3. Return to client for WebRTC avatar initialization

---

## 8. Database Schema & RLS Policies

### Tables

| Table | Purpose | RLS |
|-------|---------|-----|
| `profiles` | User profile data (name, email, avatar, branch, college link) | Own data + admin view own college |
| `user_roles` | Role assignment (student/admin) | Read own only, no insert/update/delete |
| `university_codes` | College codes with usage tracking | Admin manages own, students view linked |
| `resumes` | Uploaded resume metadata | Own data only |
| `resume_highlights` | Parsed resume structured data | Own data only |
| `ats_scores` | ATS analysis results | Own data + admin view own college |
| `interviews` | Interview records (mode, duration, status) | Own data + admin view own college |
| `interview_sessions` | VAPI session tracking | Insert/view own interviews only |
| `vapi_logs` | VAPI event logs | View own only, no write |
| `evaluations` | Interview evaluation scores | View own + admin view own college |
| `improvement_suggestions` | Per-evaluation improvement items | View own + admin view own college |
| `aptitude_tests` | Aptitude test results | Insert/view own + admin view own college |
| `avatar_sessions` | Avatar session metadata | View own only |
| `admin_notifications` | Real-time notifications for admins | Admin view/update own |

### Key RLS Patterns:
- **Student isolation:** `user_id = auth.uid()`
- **Admin college scope:** `has_role(auth.uid(), 'admin') AND is_in_admin_university(user_id, auth.uid())`
- **Anonymous denial:** Explicit `false` policies to block unauthenticated access
- **Write protection:** Many tables deny INSERT/UPDATE/DELETE from client (only edge functions with service role key can write)

### Database Functions:
- `handle_new_user()` — Trigger on `auth.users` INSERT: creates profile, assigns student role, increments college code usage
- `validate_university_code()` — Validates code is active, not expired, not at max usage
- `has_role()` — Checks if user has specific role
- `is_in_admin_university()` — Checks if two users share same institution
- `get_admin_university_id()` — Gets admin's university ID
- `notify_admin_on_interview_complete()` — Trigger: creates admin notification when interview completes
- `update_updated_at_column()` — Generic trigger for updating timestamps

---

## 9. Authentication & Authorization Flow

### Signup Flow (Student):
```
1. User enters: email, password, full name, college code, branch
2. Client validates college code via RPC: validate_university_code()
3. Client calls supabase.auth.signUp() with metadata
4. DB trigger handle_new_user() fires:
   a. Creates profile (user_id, email, full_name, university_code_id, branch)
   b. Assigns 'student' role in user_roles
   c. Increments university_codes.current_uses
5. User receives verification email
6. After verification → login
```

### Signup Flow (Admin):
```
1. User enters: email, password, full name, college name
2. Client calls admin-signup edge function
3. Edge function (with service role key):
   a. Creates user via admin API (auto-confirmed)
   b. Creates university_codes record
   c. handle_new_user trigger creates profile + student role
   d. Updates profile.university_id
   e. Updates user_roles to 'admin'
4. Returns generated college code
5. Admin can now login immediately
```

### Login Flow:
```
1. supabase.auth.signInWithPassword()
2. Fetch role from user_roles
3. Redirect: admin → /admin, student → /dashboard
```

### Route Protection (`ProtectedRoute`):
```
1. Check session exists
2. Fetch user role
3. Verify role in allowedRoles
4. If unauthorized → redirect to appropriate dashboard
5. Listen for auth state changes (session expiry)
```

---

## 10. External Service Integrations

### VAPI (Voice AI)
- **SDK:** `@vapi-ai/web` v2.5.2
- **Hook:** `src/hooks/useVapi.ts`
- **Secrets:** `VAPI_PUBLIC_KEY`, `VAPI_API_KEY`, `VAPI_ASSISTANT_ID`
- **Flow:** Client initializes VAPI with public key → starts call with assistant overrides (system prompt from edge function) → captures transcript events → pipes audio to Simli

### Simli (Avatar)
- **SDK:** `simli-client` v2.0.0
- **Hook:** `src/hooks/useSimliStream.ts`
- **Component:** `src/components/interview/SimliAvatar.tsx`
- **Secrets:** `SIMLI_API_KEY`, `SIMLI_FACE_ID`
- **Flow:** Client fetches config from `simli-config` edge function → initializes SimliClient with WebRTC → receives VAPI audio track → drives lip-sync animation
- **Audio Architecture:** VAPI is sole audio source (plays to user). Simli audio is muted — it only drives visual lip-sync.

### Lovable AI Gateway
- **Endpoint:** `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Auth:** `LOVABLE_API_KEY` (server-side only)
- **Models Used:**
  - `google/gemini-2.5-flash` — Resume parsing, aptitude questions, interview evaluation
  - `google/gemini-3-flash-preview` — ATS scoring
- **Features:** Vision API for OCR (base64 image input)

---

## 11. File Structure Reference

```
src/
├── App.tsx                          # Root: routes, providers
├── main.tsx                         # Entry point
├── index.css                        # Global styles, design tokens
├── App.css                          # App-level styles
├── vite-env.d.ts                    # Vite type declarations
│
├── pages/
│   ├── Landing.tsx                  # Public landing page
│   ├── Auth.tsx                     # Login/Signup/ForgotPassword
│   ├── ResetPassword.tsx            # Password reset form
│   ├── Dashboard.tsx                # Student dashboard
│   ├── Interview.tsx                # Interview flow orchestrator
│   ├── Resume.tsx                   # Resume upload & management
│   ├── InterviewHistory.tsx         # Past interview list
│   ├── AptitudeTest.tsx             # MCQ aptitude test
│   ├── Profile.tsx                  # User profile settings
│   ├── Help.tsx                     # FAQ & support
│   ├── AdminDashboard.tsx           # Admin analytics & management
│   └── NotFound.tsx                 # 404 page
│
├── components/
│   ├── ProtectedRoute.tsx           # Auth guard wrapper
│   ├── StudentSidebar.tsx           # Shared sidebar navigation
│   ├── ThemeToggle.tsx              # Dark/light mode toggle
│   ├── NavLink.tsx                  # Navigation link helper
│   │
│   ├── landing/
│   │   ├── AnimatedBackground.tsx   # Particle animation
│   │   ├── Navbar.tsx               # Landing top nav
│   │   ├── HeroSection.tsx          # Hero banner + stats
│   │   ├── FeaturesSection.tsx      # Feature cards
│   │   ├── CTASection.tsx           # Call-to-action
│   │   └── Footer.tsx               # Landing footer
│   │
│   ├── interview/
│   │   ├── InterviewRoom.tsx        # Fullscreen interview UI
│   │   ├── SimliAvatar.tsx          # Simli WebRTC avatar
│   │   ├── PreInterviewSetup.tsx    # Camera preview + preferences
│   │   ├── InterviewModeSelector.tsx # Mode selection cards
│   │   ├── InterviewSettings.tsx    # Settings dialog
│   │   ├── EvaluationDisplay.tsx    # Post-interview results
│   │   └── DidAvatar.tsx            # Legacy D-ID avatar (unused)
│   │
│   ├── ats/
│   │   ├── ATSAnalysisPanel.tsx     # Full ATS results display
│   │   ├── ATSScoreGauge.tsx        # Circular score gauge
│   │   ├── ATSSectionScore.tsx      # Section score bars
│   │   └── JobRoleCombobox.tsx      # Job role search selector
│   │
│   └── ui/                          # shadcn/ui components (40+ files)
│
├── hooks/
│   ├── useVapi.ts                   # VAPI voice AI hook
│   ├── useSimliStream.ts            # Simli WebRTC hook
│   ├── useTheme.tsx                 # Theme provider + hook
│   ├── useDidStream.ts              # Legacy D-ID hook (unused)
│   ├── use-mobile.tsx               # Mobile detection hook
│   └── use-toast.ts                 # Toast notification hook
│
├── integrations/supabase/
│   ├── client.ts                    # Supabase client (auto-generated)
│   └── types.ts                     # Database types (auto-generated)
│
├── lib/
│   ├── utils.ts                     # Utility functions (cn, etc.)
│   └── uploadAvatarToStorage.ts     # Avatar upload helper
│
└── assets/
    └── ai-robot-hero.png            # Hero image

supabase/
├── config.toml                      # Edge function configuration
└── functions/
    ├── vapi-interview/index.ts      # Interview session management
    ├── evaluate-interview/index.ts  # AI evaluation engine
    ├── parse-resume/index.ts        # Resume parsing + OCR
    ├── ats-score/index.ts           # ATS compatibility analysis
    ├── admin-signup/index.ts        # Secure admin registration
    ├── generate-aptitude-questions/index.ts  # MCQ generation
    ├── simli-config/index.ts        # Simli key delivery
    └── did-stream/index.ts          # Legacy D-ID (unused)

public/
├── avatars/
│   ├── interviewer.png              # AI avatar static image
│   ├── ai-interviewer.png
│   └── ...
├── favicon.ico
├── favicon.png
├── placeholder.svg
└── robots.txt

docs/
├── project_master_workflow.txt      # Master workflow documentation
└── InterviewSim_AI_Full_Project_Documentation.md  # This file
```

---

*End of Documentation*
