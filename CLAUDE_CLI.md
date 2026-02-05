# Building with Claude CLI

This document provides guidance for using Claude CLI to continue building this LMS project.

## Project Status

### ✅ Completed
- Backend structure and all API routes
- Database schema (Prisma)
- Authentication system
- API client for frontend
- Login page

### 🔨 Needs Building (Use Claude CLI)

#### Priority 1: Admin Pages
1. Admin Dashboard (`/app/admin/page.tsx`)
2. Programs List (`/app/admin/programs/page.tsx`)
3. Program Edit Page (`/app/admin/programs/[id]/page.tsx`)
4. Learners List (`/app/admin/learners/page.tsx`)
5. Sessions/Calendar (`/app/admin/sessions/page.tsx`)

#### Priority 2: Learner Pages
1. Learner Home (`/app/learner/page.tsx`)
2. Program View (`/app/learner/programs/[id]/page.tsx`)
3. Lesson Player (`/app/learner/lessons/[id]/page.tsx`)
4. Sessions Calendar (`/app/learner/sessions/page.tsx`)

#### Priority 3: Shared Components
1. Admin Sidebar Navigation
2. Video Player Component
3. PDF Viewer Component
4. Content Tree/Accordion
5. Calendar Component

## Example Claude CLI Prompts

### Starting the Project
```
Open the lms-project folder. First, read the README.md to understand the project structure.
```

### Building Admin Dashboard
```
Create the admin dashboard page at /app/admin/page.tsx. 
It should:
- Show stats cards (total learners, active learners, programs count)
- List all programs with thumbnail, name, learner count, lesson count
- Show today's sessions
- Use the adminApi.getPrograms() from lib/api.ts
- Follow the wireframe style from the docs
```

### Building Program Edit Page
```
Create the program edit page at /app/admin/programs/[id]/page.tsx.
It should:
- Show program details (name, description, thumbnail)
- Display content tree (topics > subtopics > lessons)
- Allow adding/editing/deleting topics, subtopics, lessons
- Support drag-and-drop reordering (optional)
- Use adminApi functions from lib/api.ts
```

### Building Video Player
```
Create a VideoPlayer component at /components/learner/VideoPlayer.tsx.
It should:
- Embed Bunny.net videos using iframe
- Track watch progress (call learnerApi.updateProgress every 10 seconds)
- Show current position and duration
- Have fullscreen support
- Resume from last position
```

### Building Learner Home
```
Create the learner home page at /app/learner/page.tsx.
It should:
- Show welcome message with user name
- Display "Continue Learning" section with last in-progress lesson
- Show enrolled program cards with progress percentage
- List upcoming sessions
- Use learnerApi.getHome() from lib/api.ts
```

## Code Patterns to Follow

### Using React Query
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

// Fetching data
const { data, isLoading } = useQuery({
  queryKey: ['programs'],
  queryFn: adminApi.getPrograms,
});

// Mutations
const createMutation = useMutation({
  mutationFn: adminApi.createProgram,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['programs'] });
    toast.success('Program created!');
  },
});
```

### Protected Routes
```typescript
'use client';

import { useAuthStore } from '@/lib/auth-store';
import { redirect } from 'next/navigation';

export default function AdminPage() {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) redirect('/auth/login');
  if (user?.role !== 'ADMIN') redirect('/');
  
  // ... page content
}
```

### Component Structure
```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({ variant = 'primary', size = 'md', ...props }: ButtonProps) {
  // ...
}
```

## File Structure Reference

```
frontend/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx ✅
│   │   ├── setup-password/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── admin/
│   │   ├── page.tsx (dashboard)
│   │   ├── layout.tsx (with sidebar)
│   │   ├── programs/
│   │   │   ├── page.tsx (list)
│   │   │   └── [id]/page.tsx (edit)
│   │   ├── learners/
│   │   │   ├── page.tsx (list)
│   │   │   └── [id]/page.tsx (detail)
│   │   └── sessions/page.tsx
│   └── learner/
│       ├── page.tsx (home)
│       ├── layout.tsx (with nav)
│       ├── programs/[id]/page.tsx
│       ├── lessons/[id]/page.tsx
│       └── sessions/page.tsx
├── components/
│   ├── ui/ (Button, Input, Modal, etc.)
│   ├── admin/ (AdminSidebar, ContentTree, etc.)
│   └── learner/ (VideoPlayer, ProgressBar, etc.)
└── lib/
    ├── api.ts ✅
    └── auth-store.ts ✅
```

## Tips for Claude CLI

1. **One page at a time**: Build and test each page before moving to the next
2. **Check the API**: Reference lib/api.ts for available API functions
3. **Use existing styles**: globals.css has utility classes like .btn, .card, .input
4. **Toast notifications**: Use `toast.success()` and `toast.error()` from react-hot-toast
5. **Loading states**: Always show loading spinners while fetching data
6. **Error handling**: Wrap API calls in try/catch and show error toasts

## Running the Project

```bash
# Terminal 1: Backend
cd backend
npm install
cp .env.example .env  # Fill in your values
npx prisma migrate dev
npm run seed
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Backend: http://localhost:3001
Frontend: http://localhost:3000
