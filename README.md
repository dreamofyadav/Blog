<div align="center">

# ✦ BrainByte

### A full-stack blog platform built with the MERN Stack

---

## 📖 About

**BrainByte** is a production-ready blog platform where users can write richly formatted articles, embed images anywhere in the text, and submit posts for admin review before they go live.
Admins can approve, reject, or delete any post and manage user roles — all from a dedicated admin panel.

The project is built entirely without third-party UI libraries or editor packages — the rich text editor is hand-crafted using the browser's native `contentEditable` API.

---

## ✨ Features

### For Readers
- 📰 Browse approved & published blog posts with cover images, tags, and read time
- 🔍 Search posts by title and filter by tags
- ♥ Like posts (requires account)
- 💬 Comment on posts and delete your own comments

### For Authors
- ✏️ **Rich Text Editor** — Bold, italic, headings (H1–H3), blockquote, bullet & numbered lists, links, horizontal rule
- 🖼️ **Inline Image Upload** — Insert images anywhere in the post body via toolbar button, drag & drop, or clipboard paste
- 🔄 **Image Controls** — Hover over any inserted image to remove it or swap it with a different one
- 📸 **Cover Image** — Upload a cover photo with change and remove controls
- 🏷️ Tags and draft/publish toggle
- 📊 Personal dashboard — live word count, read time, views, likes
- 🔒 Published posts are locked for accidental editing — unlock with a deliberate "Edit Post" click
- 📋 Dashboard showing all posts with approval status and rejection reasons

### For Admins
- ⏳ Every submitted post goes into a **pending review queue** before going live
- ✅ Approve or ❌ reject posts with a custom reason shown to the author
- 👁️ Full-content **preview modal** to read a post before deciding
- 🗑️ Delete any post by any user
- 👥 View all users, promote to admin or demote to regular user
- 📊 Admin overview dashboard with platform-wide statistics

### Security
- 🔐 JWT authentication (7-day expiry)
- 🔑 Passwords hashed with bcrypt (cost factor 12)
- 🛡️ Role-based middleware — auth + admin enforced per route
- 🔒 Author-scoped DB queries prevent cross-user data access
- 🧹 HTML sanitized before saving — editor-only attributes stripped server-side
- ☁️ Images stored on Cloudinary — no local disk dependency

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Database** | MongoDB + Mongoose | Document storage, schema validation, middleware hooks |
| **Backend** | Node.js + Express | REST API, routing, middleware |
| **Authentication** | JSON Web Tokens (JWT) | Stateless auth |
| **Password Hashing** | bcryptjs | Secure password storage |
| **File Upload** | Multer + Cloudinary | Image upload, optimization, CDN delivery |
| **Frontend** | React 18 | Component-based SPA |
| **Routing** | React Router v6 | Client-side navigation, nested routes, route guards |
| **HTTP Client** | Axios | API calls with request/response interceptors |
| **Styling** | Plain CSS | Custom design system with CSS variables |

---

## 📁 Project Structure

```
BrainByte/
├── backend/
│   ├── middleware/
│   │   ├── auth.js              # JWT verification — populates req.user
│   │   └── admin.js             # Role check — blocks non-admins (403)
│   ├── models/
│   │   ├── User.js              # name, email, password (hashed), role
│   │   ├── Post.js              # title, content (HTML), status, approvalStatus
│   │   └── Comment.js           # content, post ref, author ref
│   ├── routes/
│   │   ├── auth.js              # /register  /login  /me
│   │   ├── posts.js             # CRUD, like/unlike, author-scoped
│   │   ├── comments.js          # GET / POST / DELETE per post
│   │   ├── upload.js            # Cloudinary image upload & delete
│   │   └── admin.js             # approve, reject, delete, user management
│   ├── index.js                # Express app, middleware, MongoDB connect
│   └── .env                     # Secrets (not committed)
│
└── frontend/
    └── src/
        ├── components/
        │   ├── Navbar.js         # Responsive nav, role-aware links
        │   ├── RichEditor.js     # Custom contentEditable editor
        │   └── Comments.js       # Comment list + compose form
        ├── context/
        │   └── AuthContext.js    # Global auth state, isAdmin helper
        ├── pages/
        │   ├── Home.js           # Post feed, search, tag filter, pagination
        │   ├── PostPage.js       # Single post reading view + likes + comments
        │   ├── Editor.js         # Write / edit post, read-only lock for published
        │   ├── Dashboard.js      # Author's posts, approval status, rejection reasons
        │   ├── Login.js          # Sign in form
        │   ├── Register.js       # Registration form
        │   ├── NotFound.js       # 404 page
        │   └── admin/
        │       ├── AdminLayout.js       # Sidebar shell with nested Outlet
        │       ├── AdminDashboard.js    # Stats + pending queue
        │       ├── AdminPosts.js        # All posts table — filter, search, actions
        │       ├── AdminUsers.js        # User list, promote / demote
        │       └── PostPreviewModal.js  # Full content review modal
        └── utils/
            └── api.js            # Axios instance with auto JWT header + 401 redirect
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local) or a [MongoDB Atlas](https://www.mongodb.com/atlas) free cluster
- A free [Cloudinary](https://cloudinary.com) account

### 1. Clone the repository

```bash
git clone https://github.com/your-username/Blog.git
cd Blog
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend/` folder:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/inkwell
JWT_SECRET=your_super_secret_jwt_key_here

# From cloudinary.com → Dashboard
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

NODE_ENV=development
```

### 4. Start the backend

```bash
npm run dev
# Server running on http://localhost:5000
```

### 5. Start the frontend

```bash
cd ../frontend
npm install
npm start
# App running on http://localhost:3000
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---
---

## 🔄 Post Approval Workflow

```
Author writes post → clicks "Submit"
          │
          ▼
    status = 'published'
    approvalStatus = 'pending'    ← not visible on homepage
          │
          ▼
   Admin sees post in /admin
   Opens preview modal → reads content
          │
     ┌────┴─────┐
     ▼           ▼
  Approve     Reject (with reason)
     │              │
     ▼              ▼
 Post goes       Author sees reason
  live on        in their Dashboard
 homepage              │
                       ▼
               Author edits post
                       │
                       ▼
           approvalStatus → 'pending'
           (back in admin queue)
```

---

## 🖼️ Rich Text Editor

Built from scratch using the browser's native `contentEditable` API — no Quill, TipTap, or Slate.js.

**Image workflow:**
| Action | How |
|---|---|
| Insert image | Toolbar button, drag & drop, or Ctrl+V paste |
| Remove image | Hover the image → click **✕ Remove** |
| Replace image | Hover the image → click **🔄 Change** → pick new file |
| Caption | Click below any image to add/edit a caption |

**Safety:**
- `contenteditable` attributes are stripped before the HTML is saved — captions and figures are read-only on the published post
- Image control overlays are removed from the saved HTML — they never reach the database
- Published posts are locked; authors must click "Edit Post" and confirm before changes are allowed

---


## 🌐 Deployment

### Backend — Render

1. Push your code to GitHub
2. Connect the repo to your hosting platform
3. Set all `.env` variables as platform environment variables
4. Set `NODE_ENV=production`
5. Use your MongoDB Atlas URI for `MONGO_URI`
6. No persistent disk needed — all images live on Cloudinary

### Frontend — Vercel

1. Set build command: `npm run build`
2. Set publish directory: `build`
3. Add environment variable: `REACT_APP_API_URL=https://your-backend-domain.com`
4. Update `frontend/src/utils/api.js`:
   ```js
   baseURL: process.env.REACT_APP_API_URL + '/api'
   ```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

Built with ☕ and the MERN Stack

⭐ **Star this repo if you found it helpful!**

</div>
