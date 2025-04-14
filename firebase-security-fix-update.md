# Firebase Workflow Standardization Update

## Secret Name Inconsistencies Found

The GitHub workflows have inconsistent secret naming and usage:

1. In `firebase-hosting-deploy.yml`:
   - Using `secrets.FIREBASE_SERVICE_ACCOUNT` 
   - Using `secrets.FIREBASE_PROJECT_ID`

2. In other workflows:
   - Using `secrets.FIREBASE_SERVICE_ACCOUNT_CUEBALLPRO_D0D07`
   - Using hardcoded project ID: `cueballpro-d0d07`

## GitHub Workflow Fixes

1. **Standardize Secret Names**:
   - All workflows should use `secrets.FIREBASE_SERVICE_ACCOUNT_CUEBALLPRO_D0D07`
   - Remove the unnecessary `secrets.FIREBASE_SERVICE_ACCOUNT` and `secrets.FIREBASE_PROJECT_ID`

2. **Standardize Project ID**:
   - Use `cueballpro-d0d07` directly in all workflows, or
   - Create a new secret `FIREBASE_PROJECT_ID` with this value and use it consistently

3. **Update GitHub Secrets**:
   - Make sure to add the following secrets:
     - `FIREBASE_SERVICE_ACCOUNT_KEY`: Full JSON content of serviceAccountKey.json
     - `FIREBASE_SERVICE_ACCOUNT_CUEBALLPRO_D0D07`: Same as FIREBASE_SERVICE_ACCOUNT_KEY (needed by Firebase actions)
     - `VITE_FIREBASE_CONFIG`: JSON string with Firebase web config

## Additional Security Recommendations

1. **Use Environment Variables and Secrets Manager**: 
   - Consider using GitHub Environments for different deployment targets
   - Use environment-specific secrets for more control

2. **Consider Service Account Permissions**:
   - Use different service accounts with appropriate minimum permissions for CI/CD vs. local development
   - Rotate keys regularly (every 90 days is a good practice)

3. **Audit File Access**:
   - Setup monitoring and alerts for suspicious service account activity
   - Monitor Firebase project access logs 