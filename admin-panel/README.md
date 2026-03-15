# Faculty App - Admin Panel

A React-based admin panel for managing the Faculty Substitute System.

## Features

- **Dashboard**: Overview of system statistics
- **User Management**: View, edit, and delete users
- **Request Management**: View and manage substitute requests
- **Settings**: Configure system settings

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router v6
- Lucide React (icons)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Navigate to admin-panel directory
cd admin-panel

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

Build output will be in the `dist/` folder.

## Project Structure

```
admin-panel/
├── src/
│   ├── components/
│   │   └── Layout.tsx      # Main layout with sidebar
│   ├── pages/
│   │   ├── Dashboard.tsx   # Dashboard page
│   │   ├── Login.tsx       # Login page
│   │   ├── Requests.tsx    # Requests management
│   │   ├── Settings.tsx    # Settings page
│   │   └── Users.tsx       # User management
│   ├── services/
│   │   └── api.ts          # API service
│   ├── App.tsx             # Main app component
│   ├── index.css           # Global styles
│   └── main.tsx            # Entry point
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## API Configuration

The admin panel connects to the backend API. Update the API URL in `src/services/api.ts`:

```typescript
// Production
const API_BASE_URL = 'https://facultyapp-api.onrender.com/api'

// Local development
// const API_BASE_URL = 'http://localhost:8000/api'
```

## Authentication

Admin users can login using their registered credentials. The authentication token is stored in localStorage.

## Deployment

### Vercel

```bash
npm run build
# Deploy dist/ folder to Vercel
```

### Netlify

```bash
npm run build
# Deploy dist/ folder to Netlify
```

### Static Hosting

Build the project and serve the `dist/` folder with any static file server.

## Authors

- Utkarsh Nigam - https://github.com/UtkarshNigam11
- Sujoy Dutta - https://github.com/dutta-sujoy
