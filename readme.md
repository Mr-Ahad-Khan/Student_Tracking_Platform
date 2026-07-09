# Student Tracking Platform

A comprehensive, production-ready Student Tracking Platform tailored for higher education institutions. This application features a **Role-Based Access Control (RBAC)** workflow tailored for Students, Teaching Faculty, and Non-Teaching/Administrative staff.

Built using the **MERN Stack** (**M**ongoDB, **E**xpress, **R**eact, **N**ode.js) leveraging pure **JavaScript** with explicit runtime validation.

---

## 🚀 Key Features

### 👨‍🎓 Student Portal

- **Visual Performance Analytics:** Interactive dashboards displaying attendance trends and continuous assessment grades using reactive charts.
- **Financial Ledger:** Real-time checking of outstanding tuition fees and payment statuses.
- **Digital Operations:** Submit, track, and manage digital leave applications directly to faculty.

### 👩‍🏫 Teaching Staff Dashboard

- **Bulk Attendance Matrix:** Fast, grid-based attendance tracking for scheduled course lectures.
- **Grade Book:** Direct interface to input, modify, and finalize internal evaluation and examination marks.
- **Workflow Automation:** Review, approve, or reject student-submitted leave requests.

### 💼 Non-Teaching / Admin Control

- **Bulk Onboarding:** Automated pipeline to upload and register thousands of student/faculty profiles instantly via CSV files.
- **Tuition & Finance Tracker:** System-wide registry to mark clear or outstanding student fee cycles.
- **Campus Broadcasts:** Publish globally visible notices and official announcements.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React.js (Vite Build Tool), Tailwind CSS, Axios, React Router DOM, Recharts
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose ODM
- **Security:** JSON Web Tokens (JWT) in `HttpOnly` Cookies, Bcrypt.js password hashing, and runtime validation via `Joi`/`Yup`

---

## 📁 Repository Structure

```text
student-tracking-platform/
├── backend/
│   ├── config/          # Database and environment configurations
│   ├── controllers/     # Route logic handlers
│   ├── middleware/      # Auth, RBAC, and error handlers
│   ├── models/          # Mongoose database schemas
│   ├── routes/          # Express API route declarations
│   └── validators/      # Joi/Yup structural data validation
└── frontend/
    ├── src/
    │   ├── assets/      # Static files & images
    │   ├── components/  # Reusable UI items (Buttons, Input, Cards)
    │   ├── context/     # Auth and state management
    │   ├── layouts/     # Protected route layouts for Roles
    │   ├── pages/       # Dashboard and View files
    │   └── utils/       # Axios clients and helper tools
```
