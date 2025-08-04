# Cloud Storage Integration Setup Guide

This guide will help you configure the cloud storage integration for exporting documents to Google Drive, Dropbox, and OneDrive.

## Overview

The app supports exporting scanned documents to three major cloud storage providers:
- **Google Drive** - Upload documents to your Google Drive account
- **Dropbox** - Store documents in your Dropbox
- **OneDrive** - Save documents to Microsoft OneDrive

## Configuration

### 1. Environment Variables

Create a `.env` file in your project root and add the following variables:

```env
# Google Drive Configuration
EXPO_PUBLIC_GOOGLE_DRIVE_CLIENT_ID=your-google-client-id

# Dropbox Configuration  
EXPO_PUBLIC_DROPBOX_APP_KEY=your-dropbox-app-key

# OneDrive Configuration
EXPO_PUBLIC_ONEDRIVE_CLIENT_ID=your-microsoft-client-id
```

### 2. Google Drive Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application" as the application type
   - Add authorized redirect URIs:
     - For development: `https://auth.expo.io/@your-username/your-app-slug`
     - For production: Your app's custom scheme
5. Copy the Client ID and add it to your `.env` file

**Required Scopes:**
- `https://www.googleapis.com/auth/drive.file`

### 3. Dropbox Setup

1. Go to the [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click "Create app"
3. Choose:
   - **API**: Scoped access
   - **Access**: Full Dropbox (or App folder if you prefer)
   - **Name**: Your app name
4. In the app settings:
   - Note down the "App key"
   - Add redirect URIs in the OAuth 2 section:
     - For development: `https://auth.expo.io/@your-username/your-app-slug`
     - For production: Your app's custom scheme
5. Set permissions:
   - Go to "Permissions" tab
   - Enable `files.content.write`
6. Copy the App Key and add it to your `.env` file

**Required Scopes:**
- `files.content.write`

### 4. OneDrive (Microsoft) Setup

1. Go to the [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Fill in the details:
   - **Name**: Your app name
   - **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
   - **Redirect URI**: 
     - Platform: Web
     - URI: `https://auth.expo.io/@your-username/your-app-slug`
5. After creation, note the "Application (client) ID"
6. Go to "API permissions":
   - Click "Add a permission"
   - Choose "Microsoft Graph"
   - Select "Delegated permissions"
   - Add `Files.ReadWrite`
7. Copy the Client ID and add it to your `.env` file

**Required Scopes:**
- `Files.ReadWrite`

## Testing the Integration

1. Make sure all environment variables are set correctly
2. Restart your development server
3. Open a document in the app
4. Tap the "Export" button
5. Choose a cloud storage provider
6. The app will guide you through the OAuth authentication flow
7. Once authenticated, your document will be uploaded

## Troubleshooting

### Common Issues

**"Configuration Required" Error**
- Ensure all environment variables are set in your `.env` file
- Restart your development server after adding environment variables
- Check that the variable names match exactly

**Authentication Fails**
- Verify your redirect URIs are correctly configured in each provider's console
- Make sure the client IDs/app keys are correct
- Check that required permissions/scopes are enabled

**Upload Fails**
- Ensure the authenticated user has sufficient storage space
- Check network connectivity
- Verify API permissions are granted

### Development vs Production

For production builds, you'll need to:
1. Update redirect URIs in each provider's console to use your production URLs
2. Set up proper environment variable management for your deployment platform
3. Test the OAuth flows in your production environment

## Security Considerations

- Never commit API keys or client secrets to version control
- Use environment variables for all sensitive configuration
- Regularly rotate API keys and credentials
- Monitor API usage and set up appropriate rate limiting
- Consider implementing token refresh logic for long-lived sessions

## API Rate Limits

Each provider has different rate limits:
- **Google Drive**: 1,000 requests per 100 seconds per user
- **Dropbox**: 120 requests per minute per app
- **OneDrive**: 10,000 requests per 10 minutes per app

The app includes basic error handling for rate limit scenarios.

## Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify your configuration against this guide
3. Test with a simple OAuth flow first
4. Consult the official documentation for each provider

## Provider Documentation Links

- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [Dropbox API Documentation](https://www.dropbox.com/developers/documentation)
- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/api/resources/onedrive)