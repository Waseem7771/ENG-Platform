# SpeakPath — Product Requirements Document (PRD)

---

## 1. Document Information

| Field        | Value                                      |
|--------------|--------------------------------------------|
| Project Name | SpeakPath                                  |
| Version      | 1.0                                        |
| Date         | 2026-04-03                                 |
| Author       | Waseem (Product Owner)                     |
| Status       | Draft                                      |
| Repository   | https://github.com/Waseem7771/ENG-Platform |

---

## 2. Executive Summary

**SpeakPath** ("Your Path to Speaking English") is an interactive, AI-powered English learning platform designed specifically for Arabic-speaking teens and adults. It replaces traditional textbook-based learning with a modern, engaging experience that combines AI conversation practice, live teacher-led group sessions, gamified exercises, and a structured placement system aligned to the CEFR framework (A1–C2).

The platform serves two user roles — **Students** who learn through interactive exercises, AI chat, and live sessions, and **Teachers** who create classes, assign exercises, manage students, and lead real-time group sessions. SpeakPath is a web application (desktop + mobile responsive) built with Next.js, TypeScript, SQLite (with planned PostgreSQL migration), and the OpenAI API.

---

## 3. Problem Statement

### The Problem
Arabic speakers learning English face significant barriers:
- **Boring, textbook-heavy approaches** that fail to engage teens and young adults
- **Limited access to interactive, conversational practice** — especially outside classroom hours
- **No affordable platforms tailored to Arabic speakers** that understand their specific learning challenges (grammar structure differences, pronunciation patterns, vocabulary gaps)
- **Teachers lack modern tools** to manage classes, track student progress, and deliver engaging live sessions digitally

### Why Now
- AI language models (OpenAI) have reached a quality level where real-time conversational practice is viable and natural
- Remote/hybrid learning demand continues to grow in the Arabic-speaking world
- No dominant competitor serves this specific niche with a modern, premium UX

---

## 4. Goals & Objectives

### Business Objectives
| # | Objective                                                                 |
|---|---------------------------------------------------------------------------|
| 1 | Establish SpeakPath as the go-to English learning platform for Arabic speakers |
| 2 | Build a growing base of active students and teachers on the platform      |
| 3 | Validate the product-market fit before introducing monetization           |
| 4 | Create a foundation that supports future scaling (PostgreSQL, paid tiers) |

### Product Objectives
| # | Objective                                                                          |
|---|------------------------------------------------------------------------------------|
| 1 | Deliver an engaging, gamified learning experience that keeps students coming back   |
| 2 | Provide teachers with a simple, powerful dashboard to manage classes and sessions   |
| 3 | Use AI to enable conversational English practice in realistic scenarios             |
| 4 | Accurately assess and track student proficiency using CEFR-aligned placement exams |
| 5 | Support real-time, teacher-led group sessions with exercise delivery                |

---

## 5. Success Metrics (KPIs)

| Metric                        | Target (MVP)          | Measurement Method              |
|-------------------------------|-----------------------|---------------------------------|
| Student registration          | 100+ students         | User signups                    |
| Teacher adoption              | 10+ teachers          | Teacher account creation        |
| Daily active users            | 30% of registered     | Login/activity tracking         |
| Placement exam completion     | 80% of new students   | Exam start vs. completion rate  |
| Average session duration      | 15+ minutes           | Session time tracking           |
| Exercise completion rate      | 60%+ of started       | Exercise start vs. completion   |
| AI conversation engagement    | 5+ messages per chat  | Message count per conversation  |
| Student streak retention      | 40% maintain 7+ days  | Streak tracking                 |
| Teacher session frequency     | 2+ sessions/week      | Session creation logs           |

---

## 6. Target Audience

### Primary: Students
- **Demographics:** Arabic-speaking teens and adults (13+)
- **Proficiency:** Beginner to Advanced (A1–C2 CEFR)
- **Motivation:** Want to learn English for school, career, travel, or personal growth
- **Pain Points:** Bored by textbooks, lack of conversational practice, no personalized feedback
- **Tech Comfort:** Comfortable with web apps; expect a modern, premium experience

### Secondary: Teachers
- **Demographics:** English teachers serving Arabic-speaking students
- **Motivation:** Need digital tools to manage classes, deliver interactive lessons, and track progress
- **Pain Points:** Existing tools are generic, not tailored for ESL; hard to engage students remotely
- **Tech Comfort:** Moderate; need a simple, intuitive interface

---

## 7. Scope Definition

### 7.1 In-Scope (MVP Features)

#### Authentication & Onboarding
- Email/password signup and login
- Role selection during signup (Student or Teacher)
- Student placement exam (20–30 questions, determines Beginner/Intermediate/Advanced level)

#### Student Features
- **Dashboard:** Current level, XP, streak, exercises completed, skills progress (Grammar, Vocabulary, Listening, Translation, Speaking)
- **Exercise Library:** 8 exercise types:
  1. Grammar Puzzles (fill-in-blank, sentence reordering, error correction)
  2. Vocabulary Match (flashcards, word matching, word builder)
  3. Translation Challenge (Arabic ↔ English with AI scoring)
  4. Listening Practice (audio + comprehension questions)
  5. Speed Quiz (timed multiple choice)
  6. AI Conversation (scenario-based chat)
  7. Picture Description (describe images, AI feedback)
  8. Story Builder (collaborative storytelling with AI)
- **AI Conversation:** 10 real-world scenarios (Restaurant, Job Interview, Doctor Visit, Shopping, Directions, Airport, Hotel, Phone Call, Business Meeting, Free Conversation)
- **Live Sessions:** Join teacher-led sessions, participate in chat, complete pushed exercises
- **Progress Tracking:** XP system, streak counter, skill progress bars, level progression

#### Teacher Features
- **Dashboard:** Total students, active classes, live sessions count, exercises created
- **Class Management:** Create classes with name/description/level, auto-generated join codes, student roster
- **Exercise Management:** Create exercises by type with dynamic content editors, set difficulty and points
- **Session Management:** Start/end live sessions, push exercises to students, session chat, student presence tracking
- **Student Analytics:** View individual student progress, skill breakdowns, exercise history, attendance

#### Live Sessions System
- Teacher creates and controls sessions (must be present entire duration)
- Students see and join active sessions
- Real-time chat between teacher and students
- Teacher can push exercises to all participants
- Session ends only when teacher closes it

### 7.2 Out of Scope (Future Phases)
| Feature                          | Phase   | Notes                                      |
|----------------------------------|---------|--------------------------------------------|
| Google/Social login              | Phase 2 | Email/password only for MVP                |
| Payment/Monetization             | Phase 2 | Free for MVP; subscription model planned   |
| Mobile native apps (iOS/Android) | Phase 3 | Web responsive only for MVP                |
| RTL interface support            | Phase 2 | Interface is English-only for now          |
| Light mode theme                 | Phase 2 | Dark mode only for MVP                     |
| Video/audio in live sessions     | Phase 2 | Text chat + exercise push for MVP          |
| PostgreSQL migration             | Phase 2 | SQLite for MVP                             |
| Admin panel (platform-level)     | Phase 2 | Only Student/Teacher roles for MVP         |
| Gamification leaderboards        | Phase 2 | XP/streaks exist, no public leaderboards   |
| Notification system              | Phase 2 | No push/email notifications for MVP        |
| Content marketplace              | Phase 3 | Teachers create exercises only for own use |

---

## 8. Detailed Requirements

### 8.1 User Stories

#### Student Stories
| ID   | Story                                                                                                    | Priority |
|------|----------------------------------------------------------------------------------------------------------|----------|
| S-01 | As a student, I want to create an account so I can start learning English                                | P0       |
| S-02 | As a student, I want to take a placement exam so the platform knows my level                             | P0       |
| S-03 | As a student, I want to see my dashboard with XP, level, streaks, and progress                           | P0       |
| S-04 | As a student, I want to browse and complete different exercise types to practice skills                   | P0       |
| S-05 | As a student, I want to practice English with an AI in realistic scenarios                                | P0       |
| S-06 | As a student, I want to join live sessions started by my teacher                                         | P0       |
| S-07 | As a student, I want to see real-time feedback on my grammar mistakes during AI conversations            | P1       |
| S-08 | As a student, I want to track my streaks and XP to stay motivated                                        | P1       |
| S-09 | As a student, I want to see a summary/score after completing an AI conversation                          | P1       |

#### Teacher Stories
| ID   | Story                                                                                                    | Priority |
|------|----------------------------------------------------------------------------------------------------------|----------|
| T-01 | As a teacher, I want to create an account and set up my profile                                          | P0       |
| T-02 | As a teacher, I want to create classes and get join codes for students                                   | P0       |
| T-03 | As a teacher, I want to create exercises of various types and difficulty levels                           | P0       |
| T-04 | As a teacher, I want to start a live session and have students join                                      | P0       |
| T-05 | As a teacher, I want to push exercises to students during a live session                                 | P0       |
| T-06 | As a teacher, I want to view each student's progress, scores, and attendance                             | P1       |
| T-07 | As a teacher, I want to manage my class roster (view students, their levels)                             | P1       |

### 8.2 Functional Requirements

#### FR-01: Authentication System
- Email/password registration with role selection (Student/Teacher)
- Secure login/logout with session management
- Protected routes based on user role
- Redirect unauthenticated users to login

#### FR-02: Placement Exam Engine
- 20–30 questions covering Grammar, Vocabulary, and Reading
- Adaptive or fixed question set
- Scoring algorithm that maps to three levels: Beginner, Intermediate, Advanced
- Category-wise score breakdown on results screen
- One-time exam with option to retake (TBD)

#### FR-03: Exercise System
- Support 8 exercise types with distinct UIs and interaction models
- Dynamic content rendering based on exercise type
- Real-time scoring and feedback
- XP reward on completion
- Skill category tagging (Grammar, Vocabulary, Listening, Translation, Speaking)

#### FR-04: AI Conversation Engine
- Integration with OpenAI API for natural language conversation
- 10 pre-defined scenarios with context prompts
- Real-time grammar feedback inline with AI responses
- Conversation summary and score on session end
- Message history within a conversation session

#### FR-05: Live Session System
- Teacher creates session linked to a specific class
- Real-time student join/leave tracking
- Text-based chat (all participants)
- Exercise push mechanism (teacher selects exercise → appears for all students)
- Session timer and status management (Waiting → Active → Ended)
- Only teacher can end the session

#### FR-06: Progress & Gamification
- XP earned from exercises, AI conversations, and session participation
- Daily streak tracking (consecutive days with activity)
- Skill progress bars (5 categories, 0–100%)
- Level progression based on placement + ongoing performance

#### FR-07: Class Management
- Create class with name, description, level
- Auto-generated unique class/join code
- Student enrollment via class code
- Class detail view with student roster and assigned exercises

### 8.3 Non-Functional Requirements

| Category       | Requirement                                                                                       |
|----------------|---------------------------------------------------------------------------------------------------|
| Performance    | Pages load in < 2 seconds; AI responses in < 5 seconds                                          |
| Security       | Password hashing (bcrypt/argon2), session-based auth, CSRF protection, input sanitization        |
| Scalability    | SQLite for MVP (< 500 users); PostgreSQL migration path for scale                                |
| Usability      | Intuitive UI requiring no onboarding tutorial; mobile responsive                                  |
| Accessibility  | WCAG 2.1 AA compliance for color contrast and keyboard navigation                                |
| Reliability    | Graceful error handling; AI fallbacks if OpenAI is unavailable                                    |
| Localization   | English-only interface (no RTL support needed for MVP)                                            |

### 8.4 Design/UX Requirements

| Aspect              | Specification                                                                                |
|----------------------|----------------------------------------------------------------------------------------------|
| Theme                | Dark premium (deep blue-black #0F0D1A background)                                           |
| Color Palette        | Violet (#7C3AED), Blue (#3B82F6), Cyan (#22D3EE), Cream (#ECE8D9)                          |
| Typography           | Geist Sans; bold headings with tight tracking; relaxed body text                             |
| Component Style      | Glassmorphism cards, gradient buttons, spotlight hover effects                               |
| Animations           | Framer Motion; 0.6–1s entrance, 0.3s hover, floating particles, stagger children            |
| Inspiration          | oryzo.ai, obsidianassembly.com                                                               |
| Framework            | Tailwind CSS + shadcn/ui components                                                          |
| Responsive           | Mobile (< 768px), Tablet (768–1024px), Desktop (> 1024px)                                   |

### 8.5 Technical Requirements

| Component         | Technology                                           |
|-------------------|------------------------------------------------------|
| Frontend          | Next.js (App Router) + TypeScript + Tailwind CSS     |
| UI Components     | shadcn/ui (customized to dark theme)                 |
| Animation         | Framer Motion                                        |
| Backend/API       | Next.js API Routes                                   |
| Database          | SQLite (via Prisma ORM) → PostgreSQL in Phase 2      |
| Authentication    | Better Auth (email/password)                         |
| AI Integration    | OpenAI API (GPT-4 for conversations and scoring)     |
| Real-time         | Server-Sent Events or WebSockets for live sessions   |
| Deployment        | TBD (Vercel likely)                                  |

### 8.6 Data Requirements

#### User Data
- Profile: name, email, hashed password, role (student/teacher), created date
- Student-specific: level, XP, streak count, last active date
- Teacher-specific: (no additional fields for MVP)

#### Academic Data
- Placement exam results: scores by category, assigned level, timestamp
- Exercise records: exercise ID, student ID, score, time spent, completion date
- Skill progress: per-student scores across 5 skill categories

#### Class Data
- Class: name, description, level, join code, teacher ID
- Enrollment: student-class mappings

#### Session Data
- Session: title, class ID, teacher ID, status, start/end timestamps
- Chat messages: sender, content, timestamp
- Exercise assignments: session-exercise mappings, per-student completion

#### AI Conversation Data
- Conversation: student ID, scenario, messages (role + content), feedback, summary score

---

## 9. Technical Architecture

```
┌─────────────────────────────────────────────┐
│                  Client (Browser)            │
│         Next.js App (React + Tailwind)       │
│         shadcn/ui + Framer Motion            │
├─────────────────────────────────────────────┤
│              Next.js API Routes              │
│         (Authentication, CRUD, AI)           │
├──────────┬──────────────┬───────────────────┤
│  Prisma  │  Better Auth │    OpenAI API     │
│  (ORM)   │  (Sessions)  │  (Conversations)  │
├──────────┴──────────────┴───────────────────┤
│          SQLite Database (MVP)               │
│       → PostgreSQL (Phase 2)                 │
└─────────────────────────────────────────────┘
```

### Key Integration Points
- **OpenAI API:** Used for AI conversation scenarios, translation scoring, grammar feedback, and picture description evaluation
- **Better Auth:** Handles signup, login, session management, and role-based access
- **Prisma ORM:** Database abstraction layer; enables SQLite → PostgreSQL migration with minimal code changes
- **Real-time (Live Sessions):** WebSocket or SSE connection for chat messages, exercise push, and presence tracking

---

## 10. Risks & Dependencies

| Risk                                           | Impact | Likelihood | Mitigation                                                     |
|------------------------------------------------|--------|------------|----------------------------------------------------------------|
| OpenAI API costs scale unpredictably            | High   | Medium     | Implement rate limiting, cache common responses, set usage caps |
| OpenAI API downtime affects AI features         | Medium | Low        | Graceful fallback UI; queue messages for retry                 |
| SQLite limits concurrent users in live sessions | Medium | Medium     | Plan PostgreSQL migration for Phase 2; limit MVP to ~50 concurrent |
| Real-time session sync complexity               | High   | Medium     | Start with polling/SSE; upgrade to WebSockets if needed        |
| Content quality for exercises                   | Medium | Medium     | Seed with curated exercise sets; teacher creation supplements  |
| Student engagement/retention                    | High   | Medium     | Gamification (XP, streaks); varied exercise types; AI novelty  |
| Scope creep during MVP development              | Medium | High       | Strict scope adherence to this PRD; defer Phase 2 items        |

### External Dependencies
| Dependency        | Purpose                        | Risk Level |
|-------------------|--------------------------------|------------|
| OpenAI API        | AI conversations and scoring   | Medium     |
| Vercel (planned)  | Hosting and deployment         | Low        |
| npm ecosystem     | Package dependencies           | Low        |

---

## 11. Key Stakeholders

| Stakeholder | Role                    | Responsibilities                                   |
|-------------|-------------------------|----------------------------------------------------|
| Waseem      | Product Owner/Developer | Architecture decisions, development, deployment    |
| Teachers    | End Users (Secondary)   | Provide feedback on class/session management tools |
| Students    | End Users (Primary)     | Provide feedback on learning experience and UX     |

---

## 12. High-Level Timeline / Phases

### Phase 1 — MVP (Current)
- Authentication (signup, login, role-based routing)
- Landing page with premium dark theme
- Student dashboard + placement exam
- Exercise library (8 types) with scoring
- AI conversation (10 scenarios via OpenAI)
- Teacher dashboard + class management
- Live sessions (text chat + exercise push)
- Progress tracking (XP, streaks, skill bars)

### Phase 2 — Growth
- Google/social login
- PostgreSQL migration
- Video/audio in live sessions
- Notification system (email, in-app)
- Gamification leaderboards
- Light mode option
- RTL interface support
- Admin panel
- Monetization (subscription tiers)

### Phase 3 — Scale
- Native mobile apps (iOS, Android)
- Content marketplace (teacher exercise sharing)
- Advanced analytics and reporting
- Multi-language interface support
- API for third-party integrations

---

## 13. Page Inventory

| #  | Route                    | Role    | Description                                |
|----|--------------------------|---------|--------------------------------------------|
| 1  | `/`                      | Public  | Landing page with hero, features, CTA      |
| 2  | `/login`                 | Public  | Email/password login                       |
| 3  | `/signup`                | Public  | Account creation with role selection       |
| 4  | `/student`               | Student | Student dashboard (stats, progress, actions) |
| 5  | `/student/placement`     | Student | Placement exam flow                        |
| 6  | `/student/exercises`     | Student | Exercise library (8 types)                 |
| 7  | `/student/exercises/[id]`| Student | Exercise play screen                       |
| 8  | `/student/ai-chat`       | Student | AI scenario selection + chat               |
| 9  | `/student/sessions`      | Student | View and join live sessions                |
| 10 | `/teacher`               | Teacher | Teacher dashboard (stats, activity)        |
| 11 | `/teacher/classes`       | Teacher | Class list + create/manage classes         |
| 12 | `/teacher/classes/[id]`  | Teacher | Class detail (students, exercises, sessions) |
| 13 | `/teacher/exercises`     | Teacher | Exercise list + create exercises           |
| 14 | `/teacher/sessions`      | Teacher | Session list + start/manage sessions       |
| 15 | `/teacher/students`      | Teacher | Student roster + individual progress       |

---

## 14. Appendices

### A. Design Reference
- See [SpeakPath-Design-Brief.md](SpeakPath-Design-Brief.md) for complete UI/UX specifications, design system, color tokens, typography, component patterns, animation guidelines, and all page wireframe descriptions.

### B. CEFR Level Mapping
| Platform Level | CEFR Range | Description                    |
|----------------|------------|--------------------------------|
| Beginner       | A1–A2      | Basic vocabulary and grammar   |
| Intermediate   | B1–B2      | Conversational fluency         |
| Advanced       | C1–C2      | Near-native proficiency        |

### C. Exercise Type Reference
| Type                 | Skills Targeted              | AI Required |
|----------------------|------------------------------|-------------|
| Grammar Puzzles      | Grammar                      | No          |
| Vocabulary Match     | Vocabulary                   | No          |
| Translation Challenge| Translation, Grammar, Vocab  | Yes         |
| Listening Practice   | Listening                    | No          |
| Speed Quiz           | Grammar, Vocabulary          | No          |
| AI Conversation      | Speaking, Grammar, Vocab     | Yes         |
| Picture Description  | Speaking, Grammar, Vocab     | Yes         |
| Story Builder        | Speaking, Grammar, Vocab     | Yes         |

---

*This is a living document. It will be updated as the project evolves through development and user feedback.*
