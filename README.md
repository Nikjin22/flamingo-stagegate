# Flamingo Pharma - Stage Gate Management System

A full-stack web application for managing pharmaceutical product launches through a structured 7-stage gate workflow with real-time collaboration, RBAC, and audit trails.

## Live Demo
   [Watch walkthrough] - (https://github.com/Nikjin22/flamingo-stagegate/releases/download/v1.0-demo/Flamingo.-.Stagegate.mp4)

## Screenshots
*[Add your screenshots here]*

## Tech Stack

**Frontend:** React 18, Vite, TanStack Query, Zustand, Recharts, CSS3  
**Backend:** Node.js 24, Express.js, Prisma ORM 7, PostgreSQL 18  
**Auth:** JWT (HS256) + bcryptjs

## Key Features

- 7-stage gate approval workflow
- Role-based access control (5 roles)
- Real-time Kanban task board with drag-and-drop
- Pharmaceutical readiness assessment with radar charts
- Document management with versioning
- Complete audit trail with tamper-evident logging
- Excel and PDF export

## Run Locally

### Backend
```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
