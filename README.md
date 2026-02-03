# Advanced Todo App – Piyush Kumar

A modern, Firebase‑powered todo application built with HTML, CSS and Vanilla JavaScript.  
It focuses on clean UI, per‑user synced tasks, dark mode, and a friendly AI‑style onboarding experience. [web:235][web:243]

---

## 🚀 Features

- Add, complete/undo, and delete tasks.
- Clear all tasks for the logged‑in user.
- Filter by **All**, **Active**, and **Completed**.
- Stats bar showing total, active and completed tasks.
- Motivational quote shown on each load.
- Scroll‑to‑top button with smooth scrolling.

**User experience**

- Personalized greeting: “Namaste 🙏 {name} 🚀”.
- First‑time **welcome popup** asking for your name with time‑based AI‑style message.
- Enter key in the name input triggers the “Let’s Go” button.
- Toast notifications for success and errors (task actions, auth, copy email).
- Dark mode toggle with theme saved in `localStorage`.
- Responsive layout for mobile and desktop, no horizontal scroll on small screens.

---

## 🧱 Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript.
- **Backend as a service:** Firebase Authentication, Firebase Firestore. [web:228][web:244]
- **Auth:** Google Sign‑In (Firebase Auth). [web:235]
- **Storage:** Firestore subcollections (`users/{uid}/tasks`).
- **Hosting (optional):** Netlify / Firebase Hosting (depends how you deploy).

---

## 🗄️ Data Model (Firestore)

**Collection structure**

```text
users (collection)
 └── {uid} (document)
      └── tasks (subcollection)
           └── {taskId} (document)


