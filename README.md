# StaffSync - Enterprise Human Resource Management System
StaffSync is a full-stack, enterprise-grade Human Resource Management (HRM) system built using the MERN stack (MongoDB, Express, React, Node.js). Designed with modern SaaS aesthetics, StaffSync streamlines workforce operations, automated attendance tracking, leave workflows, and internal communications across multi-tiered organizational roles.

### ▶ Watch the demo video
https://drive.google.com/file/d/1z6-YPyDwEIq5IGi-5aW4jU42VSSuZ15l/view?usp=sharing

## What is it?
In a lot of small companies, attendance lives in a spreadsheet, leave requests arrive on WhatsApp, and announcements get lost in group chats. StaffSync puts all of that in one web app.

There are three kinds of users, and each one sees a different app after signing in. An employee sees a check-in button and their own leave. A manager also gets their team and the requests waiting for a decision. HR sees the whole company.

## What can each role do?

| Role | What they can do |
|---|---|
| **Employee** | Check in and out with one click. Request leave and cancel it while it's pending. Read announcements and see their training. Change their own password. |
| **Manager** | Everything an employee can, plus: see their team's attendance for today, approve or reject their team's leave, and create training programs. |
| **HR** | Add, edit and deactivate employees. Approve new account requests. Assign managers. Reset passwords. Approve any leave. Post announcements. Browse attendance for the whole company. |
## Screenshots

| Sign in | Employee |
|---      |---       |
| <img width="1898" height="842" alt="image" src="https://github.com/user-attachments/assets/252868be-cef5-4011-bb9d-cd6ce837160b" />|<img width="1887" height="861" alt="image" src="https://github.com/user-attachments/assets/821b752f-4933-4155-81f7-5ce99e6b2f2e" />|

| Manager | Attendance |
|---|---|
|<img width="1887" height="861" alt="image" src="https://github.com/user-attachments/assets/71f66d20-a9f3-4eb0-b835-20b392edf89c" />|<img width="1882" height="857" alt="image" src="https://github.com/user-attachments/assets/3ecf8876-e202-44ee-8c9a-4882db8d572c" />|

| HR | All Employees Records |
|---|---|
| <img width="1885" height="865" alt="image" src="https://github.com/user-attachments/assets/e98cc6d1-64f3-48fe-ae0d-d13b4c7d6106" />|<img width="1887" height="862" alt="image" src="https://github.com/user-attachments/assets/b7d8bead-f9c6-4004-ac76-d74dbe4d7eb0" />|

## Built with

- **Frontend:** React, Vite, React Router, Axios, plain CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB Atlas with Mongoose

## Security Best Practices Implemented
- Password Hashing: Implemented bcryptjs salting and hashing for secure password storage.
- Token Security: Stateless JWT authorization headers across protected API routes.
- Sensitive Data Isolation: All MongoDB credentials and secret keys are completely isolated from version control via .gitignore.
- Role Isolation: API routes enforce middleware checks verifying user permissions prior to executing administrative operations.

## Demo accounts

|   Role   |       Email         | Password    |
|----------|---------------------|-------------|
| HR       | hr@staffsync.com    | Admin@12345 |
| Manager  | meera@staffsync.com | Meera@12345 |
| Employee | priya@staffsync.com | Priya@12345 |

## Project structure

staffsync/

├── backend/    Express API: models, controllers, routes, middleware

├── client/     React app: pages, components, context, styles

## Author

**Mohd Rahim**

⭐ If you find this project useful, please star the repo 
