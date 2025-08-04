import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  ScrollView
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Share, Download, ArrowLeft, MoreVertical, FileText, RefreshCw, Copy } from 'lucide-react-native';
import { Colors } from '@/constants/colors';
import { Container } from '@/components/Container';
import { deleteDocument, getDocumentOCRText, reprocessDocumentOCR } from '@/lib/supabase';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function DocumentDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    file_url: string;
    thumbnail_url: string;
    created_at: string;
    ocr_text?: string;
    ocr_processed?: string;
  }>();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [ocrText, setOcrText] = useState<string | null>(params.ocr_text || null);
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [showOcrText, setShowOcrText] = useState<boolean>(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Load OCR text on component mount
  React.useEffect(() => {
    const loadOCRText = async () => {
      try {
        setOcrLoading(true);
        const text = await getDocumentOCRText(params.id);
        setOcrText(text);
      } catch (error) {
        console.error('Error loading OCR text:', error);
      } finally {
        setOcrLoading(false);
      }
    };

    if (!ocrText && params.ocr_processed === 'true') {
      loadOCRText();
    }
  }, [ocrText, params.id, params.ocr_processed]);



  const handleReprocessOCR = async () => {
    try {
      setOcrLoading(true);
      console.log('Reprocessing OCR for document:', params.id);
      const result = await reprocessDocumentOCR(params.id, params.file_url);
      setOcrText(result.text);
      Alert.alert('Success', 'OCR text has been reprocessed');
    } catch (error) {
      console.error('Error reprocessing OCR:', error);
      Alert.alert('Error', 'Failed to reprocess OCR. Please try again.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleCopyOCRText = () => {
    if (!ocrText) return;
    
    if (Platform.OS === 'web') {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(ocrText);
        Alert.alert('Success', 'OCR text copied to clipboard');
      }
    } else {
      // For mobile, you would use expo-clipboard here
      Alert.alert('Copy', 'OCR text copy functionality will be implemented here');
    }
  };

  const handleShare = () => {
    console.log('Sharing document:', params.title);
    
    if (Platform.OS === 'web') {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(params.file_url);
        Alert.alert('Success', 'Document URL copied to clipboard');
      } else {
        window.open(params.file_url, '_blank');
      }
    } else {
      Alert.alert('Share', 'Share functionality will be implemented here');
    }
  };

  const handleDownload = () => {
    console.log('Downloading document:', params.title);
    
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = params.file_url;
      link.download = `${params.title}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      Alert.alert('Download', 'Download functionality will be implemented here');
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${params.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              console.log('Deleting document:', params.id);
              await deleteDocument(params.id, params.file_url, params.thumbnail_url);
              Alert.alert('Success', 'Document deleted successfully');
              router.back();
            } catch (error) {
              console.error('Error deleting document:', error);
              Alert.alert('Error', 'Failed to delete document. Please try again.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const showActionMenu = () => {
    const actions = [
      {
        text: 'Share',
        onPress: handleShare
      },
      {
        text: 'Download',
        onPress: handleDownload
      }
    ];

    if (ocrText) {
      actions.push({
        text: 'Copy OCR Text',
        onPress: handleCopyOCRText
      });
      actions.push({
        text: 'Reprocess OCR',
        onPress: handleReprocessOCR
      });
    }

    actions.push(
      {
        text: 'Delete',
        style: 'destructive' as const,
        onPress: handleDelete
      },
      { text: 'Cancel', style: 'cancel' as const }
    );

    Alert.alert('Document Actions', 'Choose an action', actions);
  };

  return (
    <Container>
      <Stack.Screen
        options={{
          title: params.title || 'Document',
          headerStyle: {
            backgroundColor: Colors.background,
          },
          headerTintColor: Colors.gray[900],
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.headerButton}
              testID="back-button"
            >
              <ArrowLeft size={24} color={Colors.gray[900]} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={showActionMenu}
              style={styles.headerButton}
              testID="menu-button"
            >
              <MoreVertical size={24} color={Colors.gray[900]} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        maximumZoomScale={3}
        minimumZoomScale={1}
        testID="document-scroll-view"
      >
        <View style={styles.imageContainer}>
          {imageLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading image...</Text>
            </View>
          )}
          <Image
            source={{ uri: params.file_url }}
            style={styles.documentImage}
            contentFit="contain"
            transition={300}
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            testID="document-image"
          />
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.documentTitle}>{params.title}</Text>
          <Text style={styles.documentDate}>
            Created: {formatDate(params.created_at)}
          </Text>
          
          {(ocrText || ocrLoading) && (
            <View style={styles.ocrContainer}>
              <TouchableOpacity
                style={styles.ocrHeader}
                onPress={() => setShowOcrText(!showOcrText)}
                testID="ocr-toggle-button"
              >
                <FileText size={20} color={Colors.primary} />
                <Text style={styles.ocrHeaderText}>
                  {ocrLoading ? 'Processing OCR...' : 'Extracted Text'}
                </Text>
                {ocrLoading && <RefreshCw size={16} color={Colors.gray[500]} />}
              </TouchableOpacity>
              
              {showOcrText && ocrText && (
                <View style={styles.ocrTextContainer}>
                  <ScrollView 
                    style={styles.ocrTextScroll}
                    showsVerticalScrollIndicator={false}
                    testID="ocr-text-scroll"
                  >
                    <Text style={styles.ocrText} selectable>
                      {ocrText}
                    </Text>
                  </ScrollView>
                  
                  <View style={styles.ocrActions}>
                    <TouchableOpacity
                      style={styles.ocrActionButton}
                      onPress={handleCopyOCRText}
                      testID="copy-ocr-button"
                    >
                      <Copy size={16} color={Colors.primary} />
                      <Text style={styles.ocrActionText}>Copy</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.ocrActionButton}
                      onPress={handleReprocessOCR}
                      disabled={ocrLoading}
                      testID="reprocess-ocr-button"
                    >
                      <RefreshCw size={16} color={Colors.primary} />
                      <Text style={styles.ocrActionText}>Reprocess</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleShare}
            disabled={loading}
            testID="share-button"
          >
            <Share size={20} color={Colors.background} />
            <Text style={styles.primaryButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={handleDownload}
            disabled={loading}
            testID="download-button"
          >
            <Download size={20} color={Colors.primary} />
            <Text style={styles.secondaryButtonText}>Download</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  imageContainer: {
    flex: 1,
    minHeight: screenHeight * 0.6,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -12 }],
    zIndex: 1,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.gray[600],
    textAlign: 'center',
  },
  documentImage: {
    width: screenWidth,
    height: '100%',
    maxHeight: screenHeight * 0.8,
  },
  infoContainer: {
    padding: 20,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  documentTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: 8,
    lineHeight: 32,
  },
  documentDate: {
    fontSize: 16,
    color: Colors.gray[600],
    lineHeight: 22,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  ocrContainer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
    paddingTop: 16,
  },
  ocrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  ocrHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    flex: 1,
  },
  ocrTextContainer: {
    marginTop: 12,
    backgroundColor: Colors.gray[50],
    borderRadius: 8,
    padding: 16,
  },
  ocrTextScroll: {
    maxHeight: 200,
  },
  ocrText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.gray[700],
  },
  ocrActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  ocrActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.gray[300],
  },
  ocrActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
});