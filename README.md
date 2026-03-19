# CICS Vault — Document Repository System
### New Era University · College of Information and Computer Studies
 
---
 
## Overview
 
CICS Vault is a secure, web-based document repository system built for the College of Information and Computer Studies (CICS) at New Era University. It provides a centralized platform where students can access official CICS documents such as syllabi, theses, forms, guidelines, and announcements — all secured behind NEU institutional login.
 
---
 
## Tech Stack
 
| Layer | Technology |
|---|---|
| Frontend | React (Next.js 14) |
| Authentication | Firebase Authentication (Google Sign-In) |
| Database | Firestore (Firebase) |
| File Storage | Supabase Storage |
| Styling | Tailwind CSS + Custom CSS |
| Deployment | Firebase Hosting |
 
---
 
## Features
 
### 🔐 Authentication
- Google Sign-In only
- Restricted to `@neu.edu.ph` email addresses
- Non-NEU accounts are automatically signed out with an error message
- Pre-registered admin accounts are assigned admin role on first login
 
### 👤 User Roles
 
#### Student
- Login with NEU Google account
- On first login: must select undergraduate program (CS, IT, IS, EMC)
- Browse and search documents in the Document Library
- Filter documents by Program, Category, and Year
- Download PDFs (if account is not blocked)
- View recently uploaded documents on the Home dashboard
 
#### Admin
- All student capabilities
- Upload PDF documents to Supabase Storage
- Assign documents to All Courses or Specific Programs
- Delete documents from the repository
- Block / Unblock student accounts
- View analytics dashboard (logins, downloads, activity chart)
- Filter analytics by Daily, Weekly, Monthly, or Custom date range
- View Audit History (who downloaded what and when)
- Switch between Admin and Student view
 
---
 
## Project Structure
 
```
cics-repo4/
├── app/
│   ├── page.tsx              ← Login page
│   ├── layout.tsx            ← Root layout
│   ├── globals.css           ← Global styles
│   ├── setup/
│   │   └── page.tsx          ← Program selection (first login)
│   ├── student/
│   │   └── page.tsx          ← Student dashboard & library
│   └── admin/
│       ├── page.tsx          ← Admin dashboard
│       └── logs/
│           └── page.tsx      ← Redirects to admin
├── lib/
│   ├── firebase.ts           ← Firebase configuration
│   └── supabase.ts           ← Supabase configuration
├── public/
│   └── neu-logo.png          ← NEU seal logo
├── .env.local                ← Environment variables (not committed)
├── next.config.js            ← Next.js configuration
├── package.json
└── README.md
```
 
---
 
## Firestore Database Structure
 
### `users` collection
```json
{
  "uid": "string",
  "email": "string",
  "displayName": "string",
  "photoURL": "string",
  "role": "student | admin",
  "program": "CS | IT | IS | EMC",
  "isBlocked": false,
  "createdAt": "timestamp"
}
```
 
### `documents` collection
```json
{
  "title": "string",
  "category": "Announcement | Form | Guideline | Memo | Syllabus | Thesis | Others",
  "program": "All | CS,IT | CS | IT | IS | EMC",
  "programs": ["CS", "IT", "IS", "EMC"],
  "fileURL": "string",
  "storagePath": "string",
  "uploadedBy": "uid",
  "createdAt": "timestamp"
}
```
 
### `logs` collection (download logs)
```json
{
  "userId": "string",
  "documentId": "string",
  "timestamp": "timestamp"
}
```
 
### `logins` collection (login tracking)
```json
{
  "userId": "string",
  "email": "string",
  "timestamp": "timestamp"
}
```
 
---
 
## Supabase Storage
 
- **Bucket name:** `cics-documents`
- **Bucket type:** Public
- **File path:** `{timestamp}-{filename}.pdf`
- **Policies:**
  - `Allow public read` — SELECT for public
  - `Allow auth upload` — INSERT for authenticated users
 
---
 
## Environment Variables
 
Create a `.env.local` file in the root with:
 
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
 
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
 
---
 
## Firestore Security Rules
 
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == uid;
      allow update: if request.auth != null && (
        request.auth.uid == uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
    }
    match /documents/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /logs/{logId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /logins/{logId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```
 
---
 
## Pre-Registering Admin Accounts
 
To pre-register an admin before their first login:
 
1. Go to **Firebase Console → Firestore → users collection**
2. Click **Add document** → use a descriptive Document ID (e.g. `jcesperanza-admin`)
3. Add these fields:
 
| Field | Type | Value |
|---|---|---|
| `email` | string | `admin@neu.edu.ph` |
| `displayName` | string | `Admin` |
| `role` | string | `admin` |
| `program` | string | `CS` |
| `isBlocked` | boolean | `false` |
 
4. When the admin logs in for the first time, the system automatically finds their pre-registered document by email, assigns their real Firebase UID, and redirects them to the Admin panel.
 
---
 
## Local Development
 
```bash
# Install dependencies
npm install --legacy-peer-deps
 
# Run development server
npm run dev
```
 
Open [http://localhost:3000](http://localhost:3000)
 
---
 
## Deployment (Firebase Hosting)
 
1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```
 
2. Login to Firebase:
```bash
firebase login
```
 
3. Initialize hosting:
```bash
firebase init hosting
```
- Public directory: `out`
- Configure as single-page app: `No`
- Set up automatic builds with GitHub: `No`
 
4. Update `next.config.js` to enable static export:
```js
const nextConfig = {
  output: "export",
  webpack: (config) => {
    config.externals = [...(config.externals || []), { undici: "undici" }];
    return config;
  },
};
module.exports = nextConfig;
```
 
5. Build the project:
```bash
npm run build
```
 
6. Deploy:
```bash
firebase deploy --only hosting
```
 
7. Go to **Firebase Console → Authentication → Authorized domains**
8. Add your Firebase Hosting URL (e.g. `document-app-6d5a4.web.app`)
 
**Live URL:** `https://document-app-6d5a4.web.app`
 
---
 
## User Flow
 
```
Login Page
    ↓
Google Sign-In (@neu.edu.ph only)
    ↓
Check Firestore by UID
    ├── Found → Check role → Admin Panel OR Student Dashboard
    └── Not found → Check by email (pre-registered?)
            ├── Found → Create UID document → Admin Panel
            └── Not found → Setup Page (pick program) → Student Dashboard
```
 
---
 
## Document Upload Flow (Admin)
 
```
Admin selects PDF file
    ↓
File uploaded to Supabase Storage (cics-documents bucket)
    ↓
Public URL retrieved from Supabase
    ↓
Document metadata saved to Firestore (title, category, program, fileURL, storagePath)
    ↓
Document appears in Student Library
```
 
---
 
## Download Flow (Student)
 
```
Student clicks Download
    ↓
Check isBlocked status
    ├── Blocked → Show restriction message
    └── Not blocked → Log download to Firestore (logs collection)
                        ↓
                    Open PDF in new tab
```
 
---
 
## Programs Supported
 
| Code | Full Name |
|---|---|
| CS | BS Computer Science |
| IT | BS Information Technology |
| IS | BS Information Systems |
| EMC | BS Entertainment & Multimedia Computing |
 
---
 
## Document Categories
 
- Announcement
- Form
- Guideline
- Memo
- Syllabus
- Thesis
- Others
 
---
 
*Built for New Era University — CICS Department · 2025–2026*
