# Flamingo Pharma - Stage Gate Management System

A full-stack web application for managing pharmaceutical product launches through a structured 7-stage gate workflow with real-time collaboration, RBAC, and audit trails.

## Live Demo


## Demo Video

   [Watch walkthrough](https://github.com/Nikjin22/flamingo-stagegate/releases/download/v1.0-demo/Flamingo.-.Stagegate.mp4)

## Screenshots

### Login Page
![Login](https://github.com/user-attachments/assets/ce35bf48-6f37-41fb-b71e-31ee596dad55)

### Dashboard
![Dashboard](https://github.com/user-attachments/assets/be17b305-7f2f-45ac-b730-2683490b8164)

### Kanban Task Board
![Kanban](https://github.com/user-attachments/assets/997704e3-4885-4d3b-bad9-be9111e8219c)

### Launches
![Timeline](https://github.com/user-attachments/assets/ddf8db22-6efe-43c9-bdff-4a5d7fb6853c)

### Product Timeline
![Readiness](https://github.com/user-attachments/assets/0f6cb19a-5348-45b1-b71f-b9a6c2eaf1b7)

### Readiness Assessment
![Documents](https://github.com/user-attachments/assets/9acdc54a-b63c-495a-bacb-fb536cb31b20)

### Audit Trail
![Audit](https://github.com/user-attachments/assets/ffd452ec-baa4-45ad-9ebb-43a1d0c9d56b)

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
