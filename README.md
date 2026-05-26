# InfraMind

An AI-native system architecture workspace that translates text into visual blueprints, database schemas, and codebase scaffolds.

## Features
- **Architecture Renderer**: Interactive SVGs using Mermaid.js.
- **AI Gateway**: Centralized orchestration layer for robust, dynamic LLM routing.
- **Code Scaffolder**: In-browser ZIP generation for instant boilerplate setups.
- **Share Links**: Public, read-only system blueprints.

## Tech Stack
- **Frontend**: React 18, Vite, Zustand, Vanilla CSS
- **Backend**: Node.js, Express, Firebase Admin SDK
- **AI Engine**: Google Gemini (3.5 Flash, 2.5 Pro)

## Getting Started

```bash
git clone https://github.com/your-org/inframind.git
cd inframind
npm install

# Start development servers
npm run dev
```

### Environment Variables

**client/.env**
```env
REACT_APP_API_BASE_URL=http://localhost:5000/api
REACT_APP_FIREBASE_API_KEY=xxx
REACT_APP_FIREBASE_AUTH_DOMAIN=xxx
REACT_APP_FIREBASE_PROJECT_ID=xxx
```

**server/.env**
```env
PORT=5000
FIREBASE_SERVICE_ACCOUNT=service-account.json
REACT_APP_GEMINI_API_KEY=xxx
```
*(Ensure `service-account.json` is placed in the `server/` directory).*

---
MIT License © InfraMind Technologies
