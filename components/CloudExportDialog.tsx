import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { 
  X, 
  Cloud, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Settings
} from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { 
  cloudStorageService, 
  CloudProvider, 
  ExportStatus 
} from '@/lib/cloud-storage';
import { validateCloudConfig } from '@/constants/cloud-config';

type CloudExportDialogProps = {
  visible: boolean;
  onClose: () => void;
  documentTitle: string;
  documentUrl: string;
};

const CLOUD_PROVIDERS: {
  id: CloudProvider;
  name: string;
  description: string;
  color: string;
}[] = [
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Save to your Google Drive',
    color: '#4285F4',
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Upload to Dropbox',
    color: '#0061FF',
  },
  {
    id: 'onedrive',
    name: 'OneDrive',
    description: 'Store in Microsoft OneDrive',
    color: '#0078D4',
  },
];

export function CloudExportDialog({
  visible,
  onClose,
  documentTitle,
  documentUrl,
}: CloudExportDialogProps) {
  const [exportStatus, setExportStatus] = useState<Record<CloudProvider, ExportStatus>>({
    'google-drive': { status: 'idle' },
    'dropbox': { status: 'idle' },
    'onedrive': { status: 'idle' },
  });

  const [connectedProviders, setConnectedProviders] = useState<Set<CloudProvider>>(new Set());

  React.useEffect(() => {
    if (visible) {
      checkConnectedProviders();
    }
  }, [visible]);

  const checkConnectedProviders = async () => {
    const connected = new Set<CloudProvider>();
    
    for (const provider of CLOUD_PROVIDERS) {
      try {
        const token = await cloudStorageService.getStoredToken(provider.id);
        if (token) {
          connected.add(provider.id);
        }
      } catch (error) {
        console.error(`Error checking ${provider.id} connection:`, error);
      }
    }
    
    setConnectedProviders(connected);
  };

  const handleExport = async (provider: CloudProvider) => {
    // Check if provider is configured
    if (!cloudStorageService.isProviderConfigured(provider)) {
      Alert.alert(
        'Configuration Required',
        `${cloudStorageService.getProviderDisplayName(provider)} is not configured. Please check your API keys in the configuration file.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      console.log(`Starting export to ${provider}:`, documentTitle);
      
      setExportStatus(prev => ({
        ...prev,
        [provider]: { status: 'authenticating' }
      }));

      // Authenticate with the provider
      await cloudStorageService.authenticate(provider);
      
      setExportStatus(prev => ({
        ...prev,
        [provider]: { status: 'uploading', progress: 0 }
      }));

      // Upload the document
      const fileUrl = await cloudStorageService.uploadDocument(
        provider,
        documentTitle,
        documentUrl,
        (progress) => {
          setExportStatus(prev => ({
            ...prev,
            [provider]: { status: 'uploading', progress }
          }));
        }
      );

      setExportStatus(prev => ({
        ...prev,
        [provider]: { status: 'success', fileUrl }
      }));

      // Update connected providers
      setConnectedProviders(prev => new Set([...prev, provider]));

      Alert.alert(
        'Export Successful',
        `Document "${documentTitle}" has been uploaded to ${cloudStorageService.getProviderDisplayName(provider)}.`,
        [
          { text: 'OK' },
          ...(fileUrl.startsWith('http') ? [{
            text: 'Open',
            onPress: () => {
              if (Platform.OS === 'web') {
                window.open(fileUrl, '_blank');
              } else {
                Alert.alert('Link', fileUrl);
              }
            }
          }] : [])
        ]
      );

    } catch (error) {
      console.error(`Export to ${provider} failed:`, error);
      
      setExportStatus(prev => ({
        ...prev,
        [provider]: { 
          status: 'error', 
          error: error.message || 'Export failed' 
        }
      }));

      Alert.alert(
        'Export Failed',
        `Failed to export to ${cloudStorageService.getProviderDisplayName(provider)}: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleDisconnect = async (provider: CloudProvider) => {
    Alert.alert(
      'Disconnect Account',
      `Are you sure you want to disconnect your ${cloudStorageService.getProviderDisplayName(provider)} account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await cloudStorageService.revokeAccess(provider);
              setConnectedProviders(prev => {
                const newSet = new Set(prev);
                newSet.delete(provider);
                return newSet;
              });
              setExportStatus(prev => ({
                ...prev,
                [provider]: { status: 'idle' }
              }));
              Alert.alert('Success', 'Account disconnected successfully');
            } catch (error) {
              console.error('Error disconnecting:', error);
              Alert.alert('Error', 'Failed to disconnect account');
            }
          }
        }
      ]
    );
  };

  const getStatusIcon = (status: ExportStatus) => {
    switch (status.status) {
      case 'authenticating':
      case 'uploading':
        return <ActivityIndicator size={20} color={Colors.primary} />;
      case 'success':
        return <CheckCircle size={20} color={Colors.success} />;
      case 'error':
        return <AlertCircle size={20} color={Colors.error} />;
      default:
        return <Upload size={20} color={Colors.gray[600]} />;
    }
  };

  const getStatusText = (provider: CloudProvider, status: ExportStatus) => {
    const isConfigured = cloudStorageService.isProviderConfigured(provider);
    
    if (!isConfigured) {
      return 'API keys not configured';
    }
    
    switch (status.status) {
      case 'authenticating':
        return 'Authenticating...';
      case 'uploading':
        return `Uploading... ${status.progress || 0}%`;
      case 'success':
        return 'Exported successfully';
      case 'error':
        return status.error || 'Export failed';
      default:
        return connectedProviders.has(provider) 
          ? 'Export to this service' 
          : 'Connect and export';
    }
  };

  const isProviderBusy = (provider: CloudProvider) => {
    const status = exportStatus[provider].status;
    return status === 'authenticating' || status === 'uploading';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Cloud size={24} color={Colors.primary} />
              <Text style={styles.title}>Export to Cloud</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              testID="close-export-dialog"
            >
              <X size={24} color={Colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Choose a cloud storage service to export &ldquo;{documentTitle}&rdquo;
          </Text>

          <View style={styles.providersContainer}>
            {CLOUD_PROVIDERS.map((provider) => {
              const status = exportStatus[provider.id];
              const isConnected = connectedProviders.has(provider.id);
              const isBusy = isProviderBusy(provider.id);
              const isConfigured = cloudStorageService.isProviderConfigured(provider.id);

              return (
                <View key={provider.id} style={[
                  styles.providerCard,
                  !isConfigured && styles.providerCardDisabled
                ]}>
                  <View style={styles.providerHeader}>
                    <View style={styles.providerInfo}>
                      <View 
                        style={[
                          styles.providerIcon, 
                          { backgroundColor: provider.color }
                        ]}
                      >
                        <Cloud size={20} color={Colors.background} />
                      </View>
                      <View style={styles.providerText}>
                        <Text style={styles.providerName}>{provider.name}</Text>
                        <Text style={styles.providerDescription}>
                          {provider.description}
                        </Text>
                      </View>
                    </View>

                    {isConnected && (
                      <TouchableOpacity
                        onPress={() => handleDisconnect(provider.id)}
                        style={styles.settingsButton}
                        testID={`disconnect-${provider.id}`}
                      >
                        <Settings size={16} color={Colors.gray[500]} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.providerActions}>
                    <View style={styles.statusContainer}>
                      {getStatusIcon(status)}
                      <Text 
                        style={[
                          styles.statusText,
                          status.status === 'error' && styles.errorText,
                          status.status === 'success' && styles.successText,
                        ]}
                      >
                        {getStatusText(provider.id, status)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.exportButton,
                        (isBusy || !isConfigured) && styles.exportButtonDisabled,
                        status.status === 'success' && styles.exportButtonSuccess,
                      ]}
                      onPress={() => handleExport(provider.id)}
                      disabled={isBusy || !isConfigured}
                      testID={`export-${provider.id}`}
                    >
                      <Text 
                        style={[
                          styles.exportButtonText,
                          status.status === 'success' && styles.exportButtonTextSuccess,
                        ]}
                      >
                        {!isConfigured ? 'Not Configured' : 
                         status.status === 'success' ? 'Export Again' : 'Export'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {status.status === 'success' && status.fileUrl?.startsWith('http') && (
                    <TouchableOpacity
                      style={styles.openLinkButton}
                      onPress={() => {
                        if (Platform.OS === 'web') {
                          window.open(status.fileUrl!, '_blank');
                        } else {
                          Alert.alert('File URL', status.fileUrl!);
                        }
                      }}
                      testID={`open-${provider.id}`}
                    >
                      <ExternalLink size={16} color={Colors.primary} />
                      <Text style={styles.openLinkText}>Open in {provider.name}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Your documents will be uploaded securely to your connected accounts.
            </Text>
            {(() => {
              const config = validateCloudConfig();
              if (!config.isValid) {
                return (
                  <Text style={styles.configWarning}>
                    ⚠️ Some services require API configuration: {config.missingKeys.join(', ')}
                  </Text>
                );
              }
              return null;
            })()}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray[600],
    lineHeight: 22,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  providersContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  providerCard: {
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 12,
    padding: 16,
    backgroundColor: Colors.gray[50],
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerText: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 2,
  },
  providerDescription: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  settingsButton: {
    padding: 8,
  },
  providerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    color: Colors.gray[600],
    flex: 1,
  },
  errorText: {
    color: Colors.error,
  },
  successText: {
    color: Colors.success,
  },
  exportButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonDisabled: {
    backgroundColor: Colors.gray[300],
  },
  exportButtonSuccess: {
    backgroundColor: Colors.success,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
  },
  exportButtonTextSuccess: {
    color: Colors.background,
  },
  openLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  openLinkText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  footerText: {
    fontSize: 12,
    color: Colors.gray[500],
    textAlign: 'center',
    lineHeight: 16,
  },
  configWarning: {
    fontSize: 11,
    color: Colors.warning,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 8,
  },
  providerCardDisabled: {
    opacity: 0.6,
  },
});