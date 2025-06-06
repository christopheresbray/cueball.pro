# Firebase Security Fix Guide

## Critical Security Issue: Exposed Firebase Credentials

The repository currently has sensitive Firebase credentials exposed, which is a significant security risk. The `serviceAccountKey.json` file contains a private key that should never be committed to a Git repository.

## Steps to Fix

### 1. Remove Service Account Key from Repository

```bash
# Remove the file from git tracking but keep it locally
git rm --cached serviceAccountKey.json

# Commit this change
git commit -m "Remove serviceAccountKey.json from repository"

# Push the change to remote repository
git push
```

### 2. Generate a New Service Account Key

Since the current key has been exposed, it should be considered compromised:

1. Go to the Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Save the new key file as `serviceAccountKey.json` in your local project directory

### 3. Create GitHub Secrets

In your GitHub repository:

1. Go to Settings > Secrets and variables > Actions
2. Add the following secrets:
   - `FIREBASE_SERVICE_ACCOUNT_KEY`: The entire content of your new serviceAccountKey.json file
   - `VITE_FIREBASE_CONFIG`: A JSON string containing your Firebase web configuration

Example for VITE_FIREBASE_CONFIG:
```json
{
  "apiKey": "your-api-key",
  "authDomain": "your-project-id.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project-id.appspot.com",
  "messagingSenderId": "your-messaging-sender-id",
  "appId": "your-app-id"
}
```

### 4. Update Local Environment Setup

Create a local `.env` file for development:

```
VITE_FIREBASE_CONFIG={"apiKey":"your-api-key","authDomain":"your-project-id.firebaseapp.com",...}
```

### 5. Verify .gitignore

Ensure these files are in your `.gitignore`:
```
.env
.env.local
serviceAccountKey.json
```

## Security Recommendations

1. **Rotate all Firebase credentials** - Since the service account key was exposed, consider rotating all other Firebase credentials as well.

2. **Enable IP address restrictions** - In the Firebase Console, restrict access to your Firebase services to specific IP addresses when possible.

3. **Set up monitoring** - Enable monitoring and alerts for suspicious activities in your Firebase project.

4. **Regular security audits** - Perform regular security audits of your codebase to ensure no credentials are committed.
