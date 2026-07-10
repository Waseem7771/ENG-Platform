# SpeakPath — Design Brief for UI/UX Designer

## 1. Platform Overview

**SpeakPath** is an interactive English learning platform built for Arabic-speaking teens and adults. It replaces traditional textbook learning with AI-powered conversations, live teacher-led group sessions, interactive games, and real-world scenario practice.

**Tagline:** "Your Path to Speaking English"

**Target Audience:**
- Arabic speakers (teens and above)
- Beginner to Advanced English learners
- Students who want engaging, interactive learning — not boring textbooks

**Platform Type:** Web application (desktop + mobile responsive)

**Mood / Aesthetic:**
- Dark premium theme (deep blue-black backgrounds)
- Violet / Blue / Cyan accent colors
- Glassmorphism cards, spotlight effects, subtle animations
- Modern, clean, tech-forward — inspired by oryzo.ai and obsidianassembly.com
- Should feel like a premium app, not a school website

---

## 2. User Roles

### Student
- Takes a placement exam to determine their level
- Joins classes created by teachers
- Participates in live group sessions
- Completes exercises and games
- Practices English with AI conversation partner
- Tracks progress, XP, streaks, and level progression

### Teacher
- Creates and manages classes
- Invites students via class code
- Creates and assigns exercises/lessons
- Starts and controls live group sessions (must be present the entire session)
- Views student progress and analytics

---

## 3. Pages to Design

### 3.1 Public Pages

#### Landing Page (/)
- **Hero Section:** Large bold heading "Your Path to Speaking English" with animated gradient text, rotating words ("English" / "Fluently" / "Boldly"), floating particles, spotlight beam from top, subtle grid background
- **Badge:** "Interactive English Learning Platform" pill with pulse dot
- **CTAs:** "Start Learning Free" (primary gradient button) + "I'm a Teacher" (ghost/outline button)
- **Stats Bar:** 4 columns — "10+ Exercise Types", "10+ AI Scenarios", "6 Skill Categories", "A1–C2 CEFR Levels"
- **Scroll indicator:** Animated mouse/dot scroll hint
- **Features Section:** 6 cards in 3-column grid with spotlight hover effect — AI Conversations, Live Sessions, Games & Puzzles, Smart Placement, Progress Tracking, Arabic Speakers
- **How It Works:** 3 numbered steps (01, 02, 03) — Take Placement Exam → Join Live Sessions → Practice & Level Up
- **CTA Section:** "Ready to speak with confidence?" with signup button
- **Footer:** Minimal — logo, copyright, privacy/terms links

#### Login Page (/login)
- Centered card on dark background with floating particles + spotlight beam + grid
- Logo at top
- Email + Password fields (dark glass inputs)
- "Sign in" gradient button
- Link to signup

#### Signup Page (/signup)
- Same dark background treatment as login
- **Role selector:** Two cards side by side — Student (with icon) / Teacher (with icon), selected state has violet/blue glow border
- Name, Email, Password fields
- "Create account" gradient button
- Link to login

---

### 3.2 Student Dashboard Pages

#### Student Home (/student)
- **Header:** "Welcome back!" with gradient punctuation
- **4 Stat Cards:** Current Level, Total XP, Streak (days), Exercises Done — each with colored dot indicator and gradient background
- **Skills Progress Panel:** 5 progress bars — Grammar, Vocabulary, Listening, Translation, Speaking (each 0-100% with colored bars)
- **Quick Actions Panel:** 4 action items — Placement Exam, Practice with AI, Join Session, Exercises — each with icon badge and hover animation

#### Placement Exam (/student/placement)
- **Intro screen:** Title "Find Your Level", description of what the exam covers
- 3 info items: "20-30 Questions", "About 15 minutes", "3 Levels (Beginner, Intermediate, Advanced)"
- "Start Exam" button
- **Exam screen (after clicking start):** One question at a time, progress bar at top, question number, multiple choice or fill-in-blank answers, timer (optional), "Next" button
- **Results screen:** Overall score (0-100), determined level (BEGINNER / INTERMEDIATE / ADVANCED), breakdown by category (Grammar %, Vocabulary %, Reading %), "Continue to Dashboard" button

#### Exercise Library (/student/exercises)
- **Header:** "Exercises" with subtitle "Choose an exercise type to practice"
- **8 Exercise Type Cards** in grid (2-3 columns):
  1. Grammar Puzzles — fill-in-blank, sentence reordering, error correction
  2. Vocabulary Match — match words, flashcards, word builder
  3. Translation Challenge — Arabic ↔ English translation
  4. Listening Practice — audio + comprehension questions
  5. Speed Quiz — timed multiple choice
  6. AI Conversation — practice scenarios with AI
  7. Picture Description — describe images in English
  8. Story Builder — collaborative story with AI
- Each card: icon, title, short description, hover spotlight effect

#### Exercise Play Screen (design for each type)
- **Grammar Puzzle:** Sentence with blank(s), drag-and-drop word options, "Check Answer" button, score feedback (correct = green glow + spark effect, wrong = red shake)
- **Vocabulary Match:** Grid of flippable cards (word on one side, meaning on other), match pairs, timer, score
- **Translation Challenge:** Source text (Arabic), text input field for English translation, AI-powered scoring with feedback
- **Speed Quiz:** Question + 4 options, countdown timer, score counter, streak indicator
- **Listening:** Audio player with waveform, question below, multiple choice answers
- **Picture Description:** Image displayed, text area to describe it, AI feedback on grammar/vocabulary used
- **Story Builder:** Chat-style interface — AI starts a story, student continues, back and forth

#### AI Conversation (/student/ai-chat)
- **Scenario Selection:** 10 scenario cards in grid:
  1. At the Restaurant
  2. Job Interview
  3. Doctor Visit
  4. Shopping
  5. Asking Directions
  6. At the Airport
  7. Hotel Check-in
  8. Phone Call
  9. Business Meeting
  10. Free Conversation
- Each card: emoji icon, title, 1-line description

- **Chat Screen (after selecting scenario):**
  - Chat bubbles — AI on left (with avatar), student on right
  - Text input at bottom with send button
  - Optional: microphone button for voice input
  - AI provides real-time feedback on grammar mistakes (highlighted in the response)
  - Scenario context shown at top (e.g., "You are at a restaurant. Order your meal.")
  - "End Conversation" button that shows a summary/score

#### Live Sessions (/student/sessions)
- **No active sessions state:** Empty state card — "When your teacher starts a live session, it will appear here"
- **Active session card:** Session title, teacher name, number of participants, "Join" button with glow
- **Session Room (after joining):**
  - Video/audio area (teacher presence indicator)
  - Real-time chat panel on the right
  - Shared exercise area in the center (teacher can push exercises to all students)
  - Participant list with online indicators
  - "Leave Session" button

---

### 3.3 Teacher Dashboard Pages

#### Teacher Home (/teacher)
- **Header:** "Teacher Command Center" with gradient text
- **4 Stat Cards:** Total Students, Active Classes, Live Sessions, Exercises Created — green/teal/cyan/blue themed
- **Recent Activity Panel:** List of recent events or empty state
- **Upcoming Sessions Panel:** Scheduled sessions or empty state

#### Class Management (/teacher/classes)
- **Header:** "My Classes" + "Create Class" button
- **Class Cards:** Each showing class name, level (badge), student count, class code
- **Create Class Modal/Page:** Name, description, level selector (Beginner/Intermediate/Advanced), auto-generated join code
- **Class Detail Page:** Student list, assigned lessons, session history, "Start Session" button

#### Exercise Management (/teacher/exercises)
- **Header:** "Exercises" + "Create Exercise" button
- **Exercise list:** Table or card grid showing exercise title, type, difficulty, date created
- **Create Exercise Form:**
  - Title, Type (dropdown: Grammar/Vocabulary/Translation/Listening/Quiz/Puzzle/Conversation/Picture/Story)
  - Difficulty (Beginner/Intermediate/Advanced)
  - Content editor (dynamic based on type — e.g., for grammar: sentence template + correct answers; for vocab: word pairs; for quiz: questions + options)
  - Points value, time limit (optional)
  - "Save Exercise" button

#### Session Management (/teacher/sessions)
- **Header:** "Live Sessions" + "Start Session" button
- **Session list:** Past and upcoming sessions with status badges (Waiting/Active/Ended)
- **Start Session Modal:** Select class, session title, "Go Live" button
- **Session Control Room:**
  - Student list with join status (online/offline)
  - Chat panel
  - Exercise launcher — select and push an exercise to all students
  - "End Session" button (only teacher can end)
  - Timer showing session duration

#### Student Progress (/teacher/students)
- **Student list:** Table with name, email, class, level, XP, last active
- **Student Detail (click on student):**
  - Level and XP
  - Skills breakdown (5 progress bars)
  - Exercise history (list of completed exercises with scores)
  - Attendance (sessions joined)

---

## 4. Design System

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| Background | Deep blue-black (#0F0D1A) | Page backgrounds |
| Foreground | Warm cream (#ECE8D9) | Primary text |
| Primary | Violet (#7C3AED) | Buttons, links, active states |
| Secondary | Blue (#3B82F6) | Secondary actions, teacher theme |
| Accent | Cyan (#22D3EE) | Highlights, accents |
| Muted | White at 40% opacity | Subtle text, descriptions |
| Border | White at 5% opacity | Card borders, dividers |
| Card BG | White at 2-3% opacity | Card backgrounds |
| Error | Red (#EF4444) | Error messages, wrong answers |
| Success | Emerald (#10B981) | Correct answers, success states |
| Warning | Amber (#F59E0B) | Warnings, streaks |

### Typography
- **Font:** Geist Sans (or similar clean geometric sans-serif)
- **Headings:** Bold, tight tracking (-0.02em), sizes: 8xl (hero), 5xl (section), 4xl (page), 2xl (card)
- **Body:** Regular weight, relaxed leading, white/40 for descriptions
- **Labels:** Uppercase, extra tracking (0.2em), xs size, white/50
- **Numbers/Stats:** Bold, larger size, gradient or accent colored

### Component Patterns
- **Cards:** `border border-white/5`, `bg-white/[0.02]`, `rounded-2xl`, spotlight hover effect
- **Buttons (Primary):** Gradient pill (violet → blue), rounded-full, shimmer on hover, uppercase tracking
- **Buttons (Secondary):** Ghost/outline with border-white/15, inner glow on hover
- **Inputs:** Dark glass (`bg-white/5`, `border-white/10`), rounded-xl, h-12, violet focus ring
- **Progress Bars:** h-2, rounded-full, bg-white/5 track, colored fill
- **Badges:** Rounded-full, small text, border + tinted background

### Animation Guidelines
- **Easing:** `cubic-bezier(0.35, 0.35, 0, 1)` for most transitions (Obsidian-style)
- **Duration:** 0.6-1.0s for entrance, 0.3s for hover, 2s+ for ambient
- **Scroll animations:** Fade up + blur clear on viewport enter
- **Page transitions:** Stagger children with 0.1-0.15s delay
- **Hover effects:** Subtle scale (1.02), x-shift (4px), spotlight follow, inner glow
- **Ambient effects:** Floating particles, rotating spotlight beam, subtle grid background

### Spacing
- Page padding: 24px (mobile), 48px (desktop)
- Section padding: 128px vertical
- Card padding: 28px
- Gap between cards: 16px
- Max content width: 1280px (7xl)

---

## 5. Responsive Breakpoints
- **Mobile:** < 768px (1 column, stacked layout, hamburger menu)
- **Tablet:** 768-1024px (2 columns)
- **Desktop:** > 1024px (3-4 columns, sidebar visible)

---

## 6. Key User Flows to Design

### Flow 1: New Student Signup → Placement → Dashboard
1. Landing page → Click "Start Learning Free"
2. Signup page → Select "Student", fill form, submit
3. Redirect to Student Dashboard
4. Click "Take Placement Exam"
5. Complete exam (20-30 questions)
6. See results + assigned level
7. Return to dashboard (level now shows)

### Flow 2: Teacher Creates Class → Starts Session
1. Login as teacher
2. Go to Classes → Create Class (name, level)
3. Get class code → Share with students
4. Go to Sessions → Start Session (select class)
5. Students join the session
6. Teacher pushes exercises, manages chat
7. Teacher ends session

### Flow 3: Student Joins Session → Does Exercises
1. Student sees active session on Sessions page
2. Clicks "Join"
3. Enters session room — sees teacher, chat, exercise area
4. Teacher pushes a grammar exercise
5. Student completes exercise, gets score
6. Teacher pushes next exercise
7. Session ends — student sees summary

### Flow 4: Student Practices Solo
1. Go to Exercises → Select "Grammar Puzzles"
2. Complete exercise, see score + feedback
3. XP and progress update
4. Go to AI Chat → Select "At the Restaurant" scenario
5. Have AI conversation, get feedback
6. Return to dashboard — progress bars updated

---

## 7. Deliverables Needed
1. **Figma/Design file** with all pages listed above
2. **Component library** (buttons, cards, inputs, badges, progress bars, nav)
3. **Mobile responsive** versions of key pages (landing, dashboard, exercise play)
4. **Interaction/animation specs** (hover states, transitions, scroll animations)
5. **Iconography** — consistent icon set to replace emoji placeholders (consider Lucide, Phosphor, or custom)
6. **Empty states** — designs for when there's no data (no classes, no sessions, no progress)
7. **Success/Error states** — correct answer celebration, wrong answer feedback, form validation

---

## 8. Technical Notes for Designer
- Built with **Next.js + Tailwind CSS** — designs should use Tailwind-compatible values
- Using **shadcn/ui** as component base — can customize but maintain consistent API
- Using **Framer Motion** for animations — keep animations achievable with CSS transforms + opacity
- **No images required** for MVP — use gradients, shapes, and icons instead
- Dark mode only for now (no light mode toggle needed)
- RTL (right-to-left) support is NOT needed yet — interface is English only
