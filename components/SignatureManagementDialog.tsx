import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { X, Plus, Trash2, Edit3 } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { Signature } from '@/types/supabase';
import { 
  fetchUserSignatures, 
  saveSignature, 
  deleteSignature, 
  updateSignature 
} from '@/lib/signatures';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

interface SignatureManagementDialogProps {
  visible: boolean;
  onClose: () => void;
  onSignatureSelect?: (signature: Signature) => void;
}

export const SignatureManagementDialog: React.FC<SignatureManagementDialogProps> = ({
  visible,
  onClose,
  onSignatureSelect,
}) => {
  const { user } = useSupabaseAuth();
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [editingSignature, setEditingSignature] = useState<Signature | null>(null);
  const [signatureName, setSignatureName] = useState<string>('');

  const loadSignatures = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userSignatures = await fetchUserSignatures(user.id);
      setSignatures(userSignatures);
    } catch (error) {
      console.error('Error loading signatures:', error);
      Alert.alert('Error', 'Failed to load signatures');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (visible && user) {
      loadSignatures();
    }
  }, [visible, user, loadSignatures]);



  const handleCreateSignature = (signatureData: string) => {
    if (!signatureName.trim()) {
      Alert.alert('Error', 'Please enter a name for your signature');
      return;
    }

    handleSaveSignature(signatureData);
  };

  const handleSaveSignature = async (signatureData: string) => {
    if (!user) return;

    try {
      setLoading(true);
      
      if (editingSignature) {
        await updateSignature(editingSignature.id, {
          name: signatureName,
          signature_data: signatureData,
        });
      } else {
        await saveSignature({
          user_id: user.id,
          name: signatureName,
          signature_data: signatureData,
        });
      }

      await loadSignatures();
      setShowCreateForm(false);
      setEditingSignature(null);
      setSignatureName('');
    } catch (error) {
      console.error('Error saving signature:', error);
      Alert.alert('Error', 'Failed to save signature');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSignature = (signature: Signature) => {
    Alert.alert(
      'Delete Signature',
      `Are you sure you want to delete "${signature.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteSignature(signature.id);
              await loadSignatures();
            } catch (error) {
              console.error('Error deleting signature:', error);
              Alert.alert('Error', 'Failed to delete signature');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditSignature = (signature: Signature) => {
    setEditingSignature(signature);
    setSignatureName(signature.name);
    setShowCreateForm(true);
  };

  const handleSelectSignature = (signature: Signature) => {
    if (onSignatureSelect) {
      onSignatureSelect(signature);
      onClose();
    }
  };

  const handleClose = () => {
    setShowCreateForm(false);
    setEditingSignature(null);
    setSignatureName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {showCreateForm 
              ? (editingSignature ? 'Edit Signature' : 'Create Signature')
              : 'My Signatures'
            }
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {showCreateForm ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.createForm}>
              <Text style={styles.label}>Signature Name</Text>
              <TextInput
                style={styles.input}
                value={signatureName}
                onChangeText={setSignatureName}
                placeholder="Enter signature name"
                autoCapitalize="words"
              />

              <Text style={styles.label}>Draw Your Signature</Text>
              <SignatureCanvas
                onSignatureCreated={handleCreateSignature}
                onClear={() => {}}
              />

              <View style={styles.formButtons}>
                <Button
                  title="Cancel"
                  onPress={() => {
                    setShowCreateForm(false);
                    setEditingSignature(null);
                    setSignatureName('');
                  }}
                  variant="outline"
                  style={styles.formButton}
                />
              </View>
            </View>
          </ScrollView>
        ) : (
          <>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {signatures.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No signatures created yet</Text>
                  <Text style={styles.emptySubtext}>
                    Create your first signature to start signing documents
                  </Text>
                </View>
              ) : (
                <View style={styles.signatureGrid}>
                  {signatures.map((signature) => (
                    <TouchableOpacity
                      key={signature.id}
                      style={styles.signatureCard}
                      onPress={() => handleSelectSignature(signature)}
                    >
                      <View style={styles.signatureImageContainer}>
                        <Image
                          source={{ uri: signature.signature_data }}
                          style={styles.signatureImage}
                          resizeMode="contain"
                        />
                      </View>
                      <Text style={styles.signatureName} numberOfLines={1}>
                        {signature.name}
                      </Text>
                      <View style={styles.signatureActions}>
                        <TouchableOpacity
                          onPress={() => handleEditSignature(signature)}
                          style={styles.actionButton}
                        >
                          <Edit3 size={16} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteSignature(signature)}
                          style={styles.actionButton}
                        >
                          <Trash2 size={16} color="#ff4444" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <Button
                title="Create New Signature"
                onPress={() => setShowCreateForm(true)}
                icon={<Plus size={20} color="#fff" />}
                disabled={loading}
              />
            </View>
          </>
        )}
      </View>
    </Modal>
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
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  createForm: {
    paddingVertical: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  formButton: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  signatureGrid: {
    paddingVertical: 20,
    gap: 16,
  },
  signatureCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  signatureImageContainer: {
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  signatureImage: {
    width: '100%',
    height: '100%',
  },
  signatureName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  signatureActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});