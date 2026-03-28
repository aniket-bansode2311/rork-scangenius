// Cloud Storage Configuration
// Replace these with your actual API keys and client IDs

export const CLOUD_STORAGE_CONFIG = {
  // Google Drive Configuration
  // 1. Go to Google Cloud Console (https://console.cloud.google.com/)
  // 2. Create a new project or select existing one
  // 3. Enable Google Drive API
  // 4. Create OAuth 2.0 credentials (Web application)
  // 5. Add your redirect URIs
  GOOGLE_DRIVE: {
    CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_DRIVE_CLIENT_ID || 'your-google-client-id',
    // Example: '123456789-abcdefghijklmnop.apps.googleusercontent.com'
  },

  // Dropbox Configuration
  // 1. Go to Dropbox App Console (https://www.dropbox.com/developers/apps)
  // 2. Create a new app
  // 3. Choose "Scoped access" and "Full Dropbox" access
  // 4. Get your App key
  DROPBOX: {
    APP_KEY: process.env.EXPO_PUBLIC_DROPBOX_APP_KEY || 'your-dropbox-app-key',
    // Example: 'abcdefghijklmnop'
  },

  // Microsoft OneDrive Configuration
  // 1. Go to Azure Portal (https://portal.azure.com/)
  // 2. Register a new application in Azure AD
  // 3. Add Microsoft Graph permissions (Files.ReadWrite)
  // 4. Get your Application (client) ID
  ONEDRIVE: {
    CLIENT_ID: process.env.EXPO_PUBLIC_ONEDRIVE_CLIENT_ID || 'your-microsoft-client-id',
    // Example: '12345678-1234-1234-1234-123456789012'
  },
};

// Validation function to check if all required keys are configured
export function validateCloudConfig(): { isValid: boolean; missingKeys: string[] } {
  const missingKeys: string[] = [];
  
  if (!CLOUD_STORAGE_CONFIG.GOOGLE_DRIVE.CLIENT_ID || CLOUD_STORAGE_CONFIG.GOOGLE_DRIVE.CLIENT_ID === 'your-google-client-id') {
    missingKeys.push('Google Drive Client ID');
  }
  
  if (!CLOUD_STORAGE_CONFIG.DROPBOX.APP_KEY || CLOUD_STORAGE_CONFIG.DROPBOX.APP_KEY === 'your-dropbox-app-key') {
    missingKeys.push('Dropbox App Key');
  }
  
  if (!CLOUD_STORAGE_CONFIG.ONEDRIVE.CLIENT_ID || CLOUD_STORAGE_CONFIG.ONEDRIVE.CLIENT_ID === 'your-microsoft-client-id') {
    missingKeys.push('OneDrive Client ID');
  }
  
  return {
    isValid: missingKeys.length === 0,
    missingKeys,
  };
}