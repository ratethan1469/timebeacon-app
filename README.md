# TimeBeacon App

Professional time tracking application with Google integrations and AI-powered automation.

## 🌍 Environments

- **Local Development**: http://localhost:3002
- **QA Environment**: https://app.qa.timebeacon.io  
- **Production**: https://app.timebeacon.io

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start backend server (port 3001)
npm run dev:backend

# Start frontend dev server (port 3002)
npm run dev

# Or run both simultaneously
npm run dev:full
```

### Building & Deployment

```bash
# Build for different environments
npm run build          # Local build
npm run build:qa        # QA build
npm run build:prod      # Production build

# Deploy to different environments
npm run deploy:qa       # Deploy to QA
npm run deploy:prod     # Deploy to Production
```

## 🔄 Deployment Workflow

### QA Workflow
1. Create feature branch from `main`
2. Make changes and test locally
3. Push to `qa` branch
4. GitHub Actions automatically deploys to `app.qa.timebeacon.io`
5. Test thoroughly in QA environment
6. When ready, merge `qa` → `main`

### Production Workflow
1. Merge approved QA changes to `main` branch
2. GitHub Actions automatically deploys to `app.timebeacon.io`
3. Monitor production deployment

## 🔧 Configuration

Environment-specific configurations:
- `.env.local` - Local development
- `.env.qa` - QA environment  
- `.env.production` - Production environment

## 🧪 Testing

```bash
npm run test            # Unit tests
npm run test:e2e        # End-to-end tests
npm run test:all        # Full test suite
npm run lint            # Type checking
```

## 📱 Features

- **Time Tracking**: Manual and automated time entry
- **Google Integration**: Calendar, Gmail, Drive sync
- **AI-Powered**: Smart categorization and suggestions
- **Reporting**: Advanced analytics and exports
- **Multi-tenant**: User authentication and data isolation

## 🔐 Authentication

- JWT-based authentication
- Google OAuth integration
- MongoDB user storage

## 📊 Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express, MongoDB
- **Authentication**: JWT, Google OAuth
- **Deployment**: Vercel, GitHub Actions
- **Testing**: Vitest, Playwright