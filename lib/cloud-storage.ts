import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLOUD_STORAGE_CONFIG } from '@/constants/cloud-config';

WebBrowser.maybeCompleteAuthSession();

export type CloudProvider = 'google-drive' | 'dropbox' | 'onedrive';

export type CloudStorageConfig = {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  authUrl: string;
  tokenUrl: string;
};

export type CloudStorageToken = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type: string;
};

export type ExportStatus = {
  status: 'idle' | 'authenticating' | 'uploading' | 'success' | 'error';
  progress?: number;
  error?: string;
  fileUrl?: string;
};

const CLOUD_CONFIGS: Record<CloudProvider, CloudStorageConfig> = {
  'google-drive': {
    clientId: CLOUD_STORAGE_CONFIG.GOOGLE_DRIVE.CLIENT_ID,
    redirectUri: AuthSession.makeRedirectUri({ useProxy: true }),
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
  },
  'dropbox': {
    clientId: CLOUD_STORAGE_CONFIG.DROPBOX.APP_KEY,
    redirectUri: AuthSession.makeRedirectUri({ useProxy: true }),
    scopes: ['files.content.write'],
    authUrl: 'https://www.dropbox.com/oauth2/authorize',
    tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
  },
  'onedrive': {
    clientId: CLOUD_STORAGE_CONFIG.ONEDRIVE.CLIENT_ID,
    redirectUri: AuthSession.makeRedirectUri({ useProxy: true }),
    scopes: ['Files.ReadWrite'],
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  },
};

class CloudStorageService {
  private getStorageKey(provider: CloudProvider): string {
    return `cloud_token_${provider}`;
  }

  async getStoredToken(provider: CloudProvider): Promise<CloudStorageToken | null> {
    try {
      const tokenData = await AsyncStorage.getItem(this.getStorageKey(provider));
      if (!tokenData) return null;
      
      const token: CloudStorageToken = JSON.parse(tokenData);
      
      // Check if token is expired
      if (token.expires_at && Date.now() > token.expires_at) {
        await this.removeStoredToken(provider);
        return null;
      }
      
      return token;
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  async storeToken(provider: CloudProvider, token: CloudStorageToken): Promise<void> {
    try {
      await AsyncStorage.setItem(this.getStorageKey(provider), JSON.stringify(token));
    } catch (error) {
      console.error('Error storing token:', error);
      throw new Error('Failed to store authentication token');
    }
  }

  async removeStoredToken(provider: CloudProvider): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getStorageKey(provider));
    } catch (error) {
      console.error('Error removing stored token:', error);
    }
  }

  async authenticate(provider: CloudProvider): Promise<CloudStorageToken> {
    const config = CLOUD_CONFIGS[provider];
    
    try {
      // Check for existing valid token
      const existingToken = await this.getStoredToken(provider);
      if (existingToken) {
        return existingToken;
      }

      // Generate code verifier for PKCE (Google Drive and OneDrive)
      const codeVerifier = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Crypto.getRandomBytes(32).toString(),
        { encoding: Crypto.CryptoEncoding.BASE64URL }
      );

      const codeChallenge = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        codeVerifier,
        { encoding: Crypto.CryptoEncoding.BASE64URL }
      );

      // Build auth request
      const authRequestConfig: AuthSession.AuthRequestConfig = {
        clientId: config.clientId,
        scopes: config.scopes,
        redirectUri: config.redirectUri,
        responseType: AuthSession.ResponseType.Code,
        codeChallenge,
        codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      };

      // Add provider-specific parameters
      if (provider === 'dropbox') {
        authRequestConfig.extraParams = {
          token_access_type: 'offline',
        };
      }

      const authRequest = new AuthSession.AuthRequest(authRequestConfig);
      
      const authUrl = authRequest.makeAuthUrl({
        authorizationEndpoint: config.authUrl,
      });

      console.log('Opening auth URL:', authUrl);
      
      const result = await AuthSession.startAsync({
        authUrl,
        returnUrl: config.redirectUri,
      });

      if (result.type !== 'success') {
        throw new Error('Authentication was cancelled or failed');
      }

      const { code } = result.params;
      if (!code) {
        throw new Error('No authorization code received');
      }

      // Exchange code for token
      const token = await this.exchangeCodeForToken(provider, code, codeVerifier);
      
      // Store token
      await this.storeToken(provider, token);
      
      return token;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error(`Failed to authenticate with ${provider}: ${error.message}`);
    }
  }

  private async exchangeCodeForToken(
    provider: CloudProvider,
    code: string,
    codeVerifier: string
  ): Promise<CloudStorageToken> {
    const config = CLOUD_CONFIGS[provider];
    
    const tokenRequestBody: Record<string, string> = {
      client_id: config.clientId,
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    };

    // Add PKCE verifier for Google Drive and OneDrive
    if (provider !== 'dropbox') {
      tokenRequestBody.code_verifier = codeVerifier;
    }

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: new URLSearchParams(tokenRequestBody).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json();
      
      const token: CloudStorageToken = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type || 'Bearer',
        expires_at: tokenData.expires_in 
          ? Date.now() + (tokenData.expires_in * 1000)
          : undefined,
      };

      return token;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  async uploadDocument(
    provider: CloudProvider,
    documentTitle: string,
    fileUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const token = await this.getStoredToken(provider);
    if (!token) {
      throw new Error('No authentication token found. Please authenticate first.');
    }

    try {
      // Download the file first
      onProgress?.(10);
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        throw new Error('Failed to download file');
      }
      
      const fileBlob = await fileResponse.blob();
      onProgress?.(30);

      // Upload to the respective cloud service
      switch (provider) {
        case 'google-drive':
          return await this.uploadToGoogleDrive(token, documentTitle, fileBlob, onProgress);
        case 'dropbox':
          return await this.uploadToDropbox(token, documentTitle, fileBlob, onProgress);
        case 'onedrive':
          return await this.uploadToOneDrive(token, documentTitle, fileBlob, onProgress);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload to ${provider}: ${error.message}`);
    }
  }

  private async uploadToGoogleDrive(
    token: CloudStorageToken,
    fileName: string,
    fileBlob: Blob,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const metadata = {
      name: `${fileName}.jpg`,
      parents: ['root'],
    };

    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    } else {
      // For React Native, append as string
      formData.append('metadata', JSON.stringify(metadata));
    }
    
    formData.append('file', fileBlob, `${fileName}.jpg`);

    onProgress?.(50);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `${token.token_type} ${token.access_token}`,
      },
      body: formData,
    });

    onProgress?.(90);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Drive upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    onProgress?.(100);
    
    return `https://drive.google.com/file/d/${result.id}/view`;
  }

  private async uploadToDropbox(
    token: CloudStorageToken,
    fileName: string,
    fileBlob: Blob,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const path = `/Documents/${fileName}.jpg`;
    
    onProgress?.(50);

    const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `${token.token_type} ${token.access_token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path,
          mode: 'add',
          autorename: true,
        }),
      },
      body: fileBlob,
    });

    onProgress?.(90);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dropbox upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    onProgress?.(100);
    
    // Create a shared link
    const linkResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
      method: 'POST',
      headers: {
        'Authorization': `${token.token_type} ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: result.path_display,
        settings: {
          requested_visibility: 'public',
        },
      }),
    });

    if (linkResponse.ok) {
      const linkResult = await linkResponse.json();
      return linkResult.url;
    }
    
    return `Uploaded to ${result.path_display}`;
  }

  private async uploadToOneDrive(
    token: CloudStorageToken,
    fileName: string,
    fileBlob: Blob,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/root:/Documents/${fileName}.jpg:/content`;
    
    onProgress?.(50);

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `${token.token_type} ${token.access_token}`,
        'Content-Type': 'image/jpeg',
      },
      body: fileBlob,
    });

    onProgress?.(90);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OneDrive upload failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    onProgress?.(100);
    
    return result.webUrl || `Uploaded to OneDrive: ${fileName}.jpg`;
  }

  async revokeAccess(provider: CloudProvider): Promise<void> {
    try {
      const token = await this.getStoredToken(provider);
      if (!token) return;

      // Revoke token with the provider
      switch (provider) {
        case 'google-drive':
          await fetch(`https://oauth2.googleapis.com/revoke?token=${token.access_token}`, {
            method: 'POST',
          });
          break;
        case 'dropbox':
          await fetch('https://api.dropboxapi.com/2/auth/token/revoke', {
            method: 'POST',
            headers: {
              'Authorization': `${token.token_type} ${token.access_token}`,
            },
          });
          break;
        case 'onedrive':
          // Microsoft doesn't have a simple revoke endpoint, token will expire naturally
          break;
      }

      // Remove stored token
      await this.removeStoredToken(provider);
    } catch (error) {
      console.error('Error revoking access:', error);
      // Still remove the stored token even if revocation fails
      await this.removeStoredToken(provider);
    }
  }

  getProviderDisplayName(provider: CloudProvider): string {
    switch (provider) {
      case 'google-drive':
        return 'Google Drive';
      case 'dropbox':
        return 'Dropbox';
      case 'onedrive':
        return 'OneDrive';
      default:
        return provider;
    }
  }

  isProviderConfigured(provider: CloudProvider): boolean {
    const config = CLOUD_CONFIGS[provider];
    return config.clientId !== 'your-google-client-id' && 
           config.clientId !== 'your-dropbox-app-key' && 
           config.clientId !== 'your-microsoft-client-id' &&
           config.clientId.length > 0;
  }
}

export const cloudStorageService = new CloudStorageService();