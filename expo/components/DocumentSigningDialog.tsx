import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  PanResponder,
} from 'react-native';
import { X, PenTool, RotateCw, Trash2, Save } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { SignatureManagementDialog } from '@/components/SignatureManagementDialog';
import { Document, Signature, SignatureData } from '@/types/supabase';
import { signDocument } from '@/lib/document-signing';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface DocumentSigningDialogProps {
  visible: boolean;
  onClose: () => void;
  document: Document | null;
  onDocumentSigned: (signedDocument: Document) => void;
}

interface PlacedSignature {
  id: string;
  signature: Signature;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

const { width: screenWidth } = Dimensions.get('window');
const SIGNATURE_DEFAULT_WIDTH = 120;
const SIGNATURE_DEFAULT_HEIGHT = 60;

export const DocumentSigningDialog: React.FC<DocumentSigningDialogProps> = ({
  visible,
  onClose,
  document,
  onDocumentSigned,
}) => {
  const { user } = useSupabaseAuth();
  const [showSignatureManager, setShowSignatureManager] = useState<boolean>(false);
  const [placedSignatures, setPlacedSignatures] = useState<PlacedSignature[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [documentDimensions, setDocumentDimensions] = useState({ width: 0, height: 0 });
  
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSignatureSelect = (signature: Signature) => {
    // Place signature in the center of the document
    const newSignature: PlacedSignature = {
      id: `${signature.id}_${Date.now()}`,
      signature,
      x: (documentDimensions.width - SIGNATURE_DEFAULT_WIDTH) / 2,
      y: (documentDimensions.height - SIGNATURE_DEFAULT_HEIGHT) / 2,
      width: SIGNATURE_DEFAULT_WIDTH,
      height: SIGNATURE_DEFAULT_HEIGHT,
      rotation: 0,
    };
    
    setPlacedSignatures(prev => [...prev, newSignature]);
    setShowSignatureManager(false);
  };

  const createPanResponder = (signatureId: string) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        setSelectedSignatureId(signatureId);
      },

      onPanResponderMove: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        
        setPlacedSignatures(prev => 
          prev.map(sig => 
            sig.id === signatureId 
              ? { 
                  ...sig, 
                  x: Math.max(0, Math.min(documentDimensions.width - sig.width, sig.x + dx)),
                  y: Math.max(0, Math.min(documentDimensions.height - sig.height, sig.y + dy))
                }
              : sig
          )
        );
      },

      onPanResponderRelease: () => {
        // Keep signature selected for further actions
      },
    });
  };

  const rotateSignature = (signatureId: string) => {
    setPlacedSignatures(prev => 
      prev.map(sig => 
        sig.id === signatureId 
          ? { ...sig, rotation: (sig.rotation + 90) % 360 }
          : sig
      )
    );
  };

  const resizeSignature = (signatureId: string, scale: number) => {
    setPlacedSignatures(prev => 
      prev.map(sig => 
        sig.id === signatureId 
          ? { 
              ...sig, 
              width: Math.max(60, Math.min(200, sig.width * scale)),
              height: Math.max(30, Math.min(100, sig.height * scale))
            }
          : sig
      )
    );
  };

  const removeSignature = (signatureId: string) => {
    setPlacedSignatures(prev => prev.filter(sig => sig.id !== signatureId));
    setSelectedSignatureId(null);
  };

  const handleSaveSignedDocument = async () => {
    if (!document || !user || placedSignatures.length === 0) {
      Alert.alert('Error', 'Please add at least one signature before saving');
      return;
    }

    try {
      setLoading(true);

      // Convert placed signatures to SignatureData format
      const signatureData: SignatureData[] = placedSignatures.map(sig => ({
        signature_id: sig.signature.id,
        x: sig.x / documentDimensions.width, // Normalize to percentage
        y: sig.y / documentDimensions.height, // Normalize to percentage
        width: sig.width / documentDimensions.width, // Normalize to percentage
        height: sig.height / documentDimensions.height, // Normalize to percentage
        rotation: sig.rotation,
      }));

      const signedDocument = await signDocument({
        documentId: document.id,
        userId: user.id,
        signatureData,
        originalImageUrl: document.file_url,
      });

      onDocumentSigned(signedDocument);
      onClose();
      Alert.alert('Success', 'Document signed successfully!');
    } catch (error) {
      console.error('Error signing document:', error);
      Alert.alert('Error', 'Failed to sign document. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPlacedSignatures([]);
    setSelectedSignatureId(null);
    onClose();
  };

  if (!document) return null;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.title}>Sign Document</Text>
            <TouchableOpacity
              onPress={handleSaveSignedDocument}
              style={styles.saveButton}
              disabled={loading || placedSignatures.length === 0}
            >
              <Save size={24} color={placedSignatures.length > 0 ? "#007AFF" : "#ccc"} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.documentContainer}
            contentContainerStyle={styles.documentContent}
            showsVerticalScrollIndicator={false}
            maximumZoomScale={3}
            minimumZoomScale={0.5}
          >
            <View style={styles.documentWrapper}>
              <Image
                source={{ uri: document.file_url }}
                style={styles.documentImage}
                resizeMode="contain"
                onLoad={(event) => {
                  const { width, height } = event.nativeEvent.source;
                  const aspectRatio = width / height;
                  const containerWidth = screenWidth - 40;
                  const containerHeight = containerWidth / aspectRatio;
                  
                  setDocumentDimensions({
                    width: containerWidth,
                    height: containerHeight,
                  });
                }}
              />
              
              {/* Placed signatures */}
              {placedSignatures.map((placedSig) => {
                const panResponder = createPanResponder(placedSig.id);
                const isSelected = selectedSignatureId === placedSig.id;
                
                return (
                  <View
                    key={placedSig.id}
                    style={[
                      styles.placedSignature,
                      {
                        left: placedSig.x,
                        top: placedSig.y,
                        width: placedSig.width,
                        height: placedSig.height,
                        transform: [{ rotate: `${placedSig.rotation}deg` }],
                        borderColor: isSelected ? '#007AFF' : 'transparent',
                        borderWidth: isSelected ? 2 : 0,
                      },
                    ]}
                    {...panResponder.panHandlers}
                  >
                    <Image
                      source={{ uri: placedSig.signature.signature_data }}
                      style={styles.signatureImage}
                      resizeMode="contain"
                    />
                    
                    {isSelected && (
                      <View style={styles.signatureControls}>
                        <TouchableOpacity
                          onPress={() => rotateSignature(placedSig.id)}
                          style={styles.controlButton}
                        >
                          <RotateCw size={16} color="#007AFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => resizeSignature(placedSig.id, 1.2)}
                          style={styles.controlButton}
                        >
                          <Text style={styles.controlText}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => resizeSignature(placedSig.id, 0.8)}
                          style={styles.controlButton}
                        >
                          <Text style={styles.controlText}>-</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeSignature(placedSig.id)}
                          style={[styles.controlButton, styles.deleteButton]}
                        >
                          <Trash2 size={16} color="#ff4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.toolbar}>
            <Button
              title="Add Signature"
              onPress={() => setShowSignatureManager(true)}
              icon={<PenTool size={20} color="#fff" />}
              style={styles.toolbarButton}
            />
            
            {placedSignatures.length > 0 && (
              <Text style={styles.signatureCount}>
                {placedSignatures.length} signature{placedSignatures.length !== 1 ? 's' : ''} added
              </Text>
            )}
          </View>
        </View>
      </Modal>

      <SignatureManagementDialog
        visible={showSignatureManager}
        onClose={() => setShowSignatureManager(false)}
        onSignatureSelect={handleSignatureSelect}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    padding: 4,
  },
  documentContainer: {
    flex: 1,
  },
  documentContent: {
    padding: 20,
  },
  documentWrapper: {
    position: 'relative',
    alignSelf: 'center',
  },
  documentImage: {
    width: screenWidth - 40,
    height: (screenWidth - 40) * 1.4, // Default aspect ratio
  },
  placedSignature: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
  },
  signatureImage: {
    width: '100%',
    height: '100%',
  },
  signatureControls: {
    position: 'absolute',
    top: -40,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  controlText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#ffe6e6',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  toolbarButton: {
    flex: 1,
    marginRight: 16,
  },
  signatureCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});