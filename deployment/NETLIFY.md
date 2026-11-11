# 🚀 How to Deploy SHAHIN STEEL SHOP on Netlify

Follow these simple steps to deploy your application on Netlify with automated continuous deployment from your GitHub repository.

---

## 📋 Prerequisites
- Your GitHub repository: **`https://github.com/arifiqbal8709/SHAHIN-STEEL-SHOP`**
- A free account on [Netlify](https://www.netlify.com/)

---

## 🛠️ Step-by-Step Deployment Instructions

### Step 1: Log in to Netlify
1. Go to [https://app.netlify.com/](https://app.netlify.com/)
2. Log in using your GitHub account (**arifiqbal8709**).

### Step 2: Import Your Project
1. In the Netlify dashboard, click **"Add new site"** → **"Import an existing project"**.
2. Select **GitHub**.
3. Choose the repository: **`arifiqbal8709/SHAHIN-STEEL-SHOP`**.

### Step 3: Configure Build Settings
Netlify will automatically detect the `netlify.toml` file we created, but verify the following settings:
- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `dist` (or `frontend/dist`)

### Step 4: Add Environment Variables (Optional)
If your Django backend is deployed on a public URL (e.g. Render, Railway, PythonAnywhere, or AWS):
1. Click **"Environment variables"** (or go to **Site configuration** → **Environment variables**).
2. Add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-backend-api-url.com/api` (e.g. `https://shahin-backend.onrender.com/api`)

*(Note: Even without a live backend, the built-in mock persistence system in `frontend/src/services/api.js` ensures the full showroom app remains 100% interactive, allowing you to test billing, inventory, attendance, and printing immediately without blank screens!)*

### Step 5: Click "Deploy Site"
1. Click the **"Deploy SHAHIN-STEEL-SHOP"** button.
2. Netlify will install dependencies and build your project in ~30 seconds.
3. Once completed, Netlify will provide your live URL (e.g. `https://shahin-steel-shop.netlify.app`).

---

## 🔄 Single Page Application (SPA) Routing
The repository includes:
- `netlify.toml`
- `frontend/public/_redirects` (`/* /index.html 200`)

This ensures you can refresh any page (`/dashboard`, `/sales`, `/customers`, `/attendance`, etc.) directly in the browser without encountering a 404 error!

