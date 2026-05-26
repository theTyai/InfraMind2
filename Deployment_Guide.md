# 🚀 Deployment Guide: InfraMind

This guide covers deploying the **React/Vite Client to Vercel** and the **Express/Node.js Server to Render.com**.

---

## Part 1: Deploying the Backend to Render

Render is excellent for hosting Node.js Web Services for free.

### 1. Preparation
1. Ensure your `server/` directory has its own `package.json` with a start script:
   ```json
   "scripts": {
     "start": "node index.js"
   }
   ```
2. Your Express app should be listening to the `process.env.PORT` environment variable (which you already have set up).

### 2. Deploying on Render
1. Go to [Render.com](https://render.com) and sign in with GitHub.
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. **Configuration:**
   - **Name**: `inframind-api`
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. **Environment Variables**:
   Scroll down to Advanced and add your environment variables from `server/.env`:
   - `REACT_APP_GEMINI_API_KEY`: `your_key_here`
   - For `FIREBASE_SERVICE_ACCOUNT`, since Render doesn't easily store raw files securely in the free tier, you should encode your `service-account.json` into a base64 string or parse it directly from an environment variable. If you haven't adapted `index.js` to parse JSON from an env variable, add this variable: `FIREBASE_SERVICE_ACCOUNT_JSON` and paste the raw JSON string. (You'll need to update `index.js` to `JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)`).
6. Click **Create Web Service**. 
7. Once deployed, Render will give you a URL like: `https://inframind-api.onrender.com`. **Copy this URL**.

---

## Part 2: Deploying the Frontend to Vercel

Vercel is optimized for frontend frameworks like Vite and React.

### 1. Preparation
Ensure your `client/vite.config.js` is set up properly and your `client/package.json` has a build script:
```json
"scripts": {
  "build": "vite build"
}
```

### 2. Deploying on Vercel
1. Go to [Vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository.
4. **Configuration:**
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   Expand the Environment Variables section and add everything from `client/.env`. 
   > [!IMPORTANT]
   > Update your `REACT_APP_API_BASE_URL` to the Render URL you just created!
   > `REACT_APP_API_BASE_URL` = `https://inframind-api.onrender.com/api`
6. Click **Deploy**.

---

## 3. Post-Deployment Checklist

### Update CORS on the Server
Now that your frontend is hosted on Vercel (e.g., `https://inframind.vercel.app`), your backend on Render will block its requests unless you whitelist the domain.
1. In `server/index.js`, find your CORS configuration.
2. Add your Vercel URL to the origin array:
   ```javascript
   app.use(cors({
     origin: ['http://localhost:5173', 'https://inframind.vercel.app']
   }));
   ```
3. Push the change to GitHub (Render will auto-deploy).

### Update Firebase Auth Settings
Firebase Authentication requires you to whitelist your new Vercel domain so the Google Sign-In popup is authorized to appear.
1. Go to the **Firebase Console**.
2. Navigate to **Authentication** -> **Settings** -> **Authorized domains**.
3. Click **Add domain** and paste your Vercel URL (e.g., `inframind.vercel.app`).
