# Hills 8-Ball League Management System

A comprehensive web application for managing 8-ball pool leagues, built with React, TypeScript, and Firebase.

## Features

- **League & Season Management**: Create leagues and organize them into seasons
- **Team & Player Management**: Manage teams, players, and venues
- **Automated Match Scheduling**: Generate round-robin schedules automatically
- **Match Scorekeeping**: Track individual frames and match results
- **Statistics**: View comprehensive player and team statistics
- **Role-Based Access Control**: Different interfaces for admins, team captains, and public users

## Tech Stack

- **Frontend**: React 19, TypeScript, Material UI 6
- **Backend**: Firebase (Firestore, Authentication)
- **Routing**: React Router 7
- **Build Tool**: Vite
- **Deployment**: Firebase Hosting

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Firebase account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/hills-8ball-league.git
   cd hills-8ball-league
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file based on `.env.example` and add your Firebase configuration:
   ```bash
   cp .env.example .env
   # Then edit .env with your Firebase details
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) to view the app in your browser.

### Firebase Setup

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Set up Firestore security rules (see `firestore.rules`)
5. Add your Firebase configuration to `.env`

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── common/       # Shared components (buttons, modals, etc.)
│   └── layout/       # Layout components (header, footer, etc.)
├── context/          # React context providers
├── firebase/         # Firebase configuration
├── pages/            # Page components
│   ├── admin/        # Admin-only pages
│   ├── auth/         # Authentication pages
│   ├── public/       # Publicly accessible pages
│   └── team/         # Team captain pages
├── services/         # API and service functions
└── utils/            # Utility functions
```

## Deployment

### Deploy to Firebase Hosting

1. Build the project:
   ```bash
   npm run build
   # or
   yarn build
   ```

2. Deploy to Firebase:
   ```bash
   firebase deploy
   ```

## Firebase Security Rules

The application uses role-based access control:
- **Admin**: Full access to all data
- **Team Captain**: Can manage their team's roster and input match results
- **Public**: Can view league standings, fixtures, and player statistics

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
