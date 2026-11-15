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
Netlify will automatically detect the `netlify.toml` file, but confirm the following settings:
- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `dist`

*(Note: We have also configured root-level workspaces and dual `netlify.toml` files, so Netlify will succeed whether Base directory is left blank or set to `frontend`.)*

### Step 4: Disconnect the Neon Extension in Netlify (Crucial)
In your Netlify Dashboard sidebar under **Extensions**:
1. Click on **Neon** (or go to **Site configuration** → **Integrations / Extensions**).
2. If Neon is connected, click **Uninstall** or **Remove Extension**.
3. *Why?* Neon is a PostgreSQL database for the **Django backend** (`backend/config/settings.py`). The Netlify site only hosts the static React frontend. Connecting the Neon extension to the Netlify frontend triggers automatic database migration hooks during Netlify build, causing `Initializing: Failed`.

### Step 5: Add Environment Variables (Optional)
If your Django backend is deployed on a public URL (e.g. Render, Railway, PythonAnywhere, or AWS):
1. Go to **Site configuration** → **Environment variables**.
2. Add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-backend-api-url.com/api` (e.g. `https://shahin-backend.onrender.com/api`)

*(Note: Even without a live backend, the built-in mock persistence system in `frontend/src/services/api.js` ensures the full showroom app remains 100% interactive, allowing you to test billing, inventory, attendance, and printing immediately without blank screens!)*

### Step 6: Trigger Deploy
1. Go to **Deploys** tab.
2. Click **"Trigger deploy"** → select **"Clear cache and deploy site"**.
3. Netlify will build your project in ~30 seconds and give you a live URL (e.g. `https://shahin-steel-shop.netlify.app`).

---

## 🔧 Troubleshooting the Two Common Errors

### Error 1: "Failed during stage 'Install dependencies': dependency_installation script returned non-zero exit code: 1"
- **Cause**: Netlify tried to run `npm ci` at the root of the repository without finding dependencies or lockfile.
- **Fixed in Repo**: We added `"workspaces": ["frontend"]` to root `package.json`, generated root `package-lock.json`, and added `.node-version` (Node 20).

### Error 2: "Initializing: Failed"
- **Cause 1**: The **Neon extension** was enabled on Netlify. It tries to run database branching or migrations on a static frontend during container initialization.
  - **Fix**: Remove the Neon extension from Netlify (Site settings → Integrations/Extensions → Neon → Uninstall).
- **Cause 2**: Base directory conflict.
  - **Fix**: Ensure Base directory is `frontend`, Build command is `npm run build`, and Publish directory is `dist`.

---

## 🔄 Single Page Application (SPA) Routing
The repository includes:
- `netlify.toml`
- `frontend/public/_redirects` (`/* /index.html 200`)

This ensures you can refresh any page (`/dashboard`, `/sales`, `/customers`, `/attendance`, etc.) directly in the browser without encountering a 404 error!
