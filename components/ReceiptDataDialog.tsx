import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { X, Plus, Trash2, Save, DollarSign, Calendar, Clock, MapPin, Phone } from 'lucide-react-native';
import { ReceiptData, ReceiptLineItem } from '@/types/supabase';
import { trpc } from '@/lib/trpc';

interface ReceiptDataDialogProps {
  visible: boolean;
  onClose: () => void;
  documentId: string;
  initialData?: ReceiptData;
  onSave?: (data: ReceiptData) => void;
}

export default function ReceiptDataDialog({
  visible,
  onClose,
  documentId,
  initialData,
  onSave,
}: ReceiptDataDialogProps) {
  const [receiptData, setReceiptData] = useState<ReceiptData>({
    vendor_name: '',
    vendor_address: '',
    vendor_phone: '',
    total_amount: 0,
    subtotal: 0,
    tax_amount: 0,
    tip_amount: 0,
    date: '',
    time: '',
    receipt_number: '',
    payment_method: '',
    currency: 'USD',
    line_items: [],
  });

  const updateReceiptMutation = trpc.receipts.update.useMutation({
    onSuccess: () => {
      Alert.alert('Success', 'Receipt data updated successfully');
      onSave?.(receiptData);
      onClose();
    },
    onError: (error: { message: string }) => {
      Alert.alert('Error', error.message);
    },
  });

  useEffect(() => {
    if (initialData) {
      setReceiptData({
        ...initialData,
        line_items: initialData.line_items || [],
      });
    }
  }, [initialData]);

  const handleSave = () => {
    updateReceiptMutation.mutate({
      documentId,
      receiptData,
    });
  };

  const addLineItem = () => {
    setReceiptData(prev => ({
      ...prev,
      line_items: [
        ...(prev.line_items || []),
        {
          description: '',
          quantity: 1,
          unit_price: 0,
          total_price: 0,
        },
      ],
    }));
  };

  const updateLineItem = (index: number, field: keyof ReceiptLineItem, value: string | number) => {
    setReceiptData(prev => ({
      ...prev,
      line_items: prev.line_items?.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ) || [],
    }));
  };

  const removeLineItem = (index: number) => {
    setReceiptData(prev => ({
      ...prev,
      line_items: prev.line_items?.filter((_, i) => i !== index) || [],
    }));
  };

  const formatCurrency = (value: number | undefined): string => {
    return value ? value.toFixed(2) : '0.00';
  };

  const parseCurrency = (value: string): number => {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Receipt Data</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Vendor Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vendor Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Name</Text>
              <TextInput
                style={styles.input}
                value={receiptData.vendor_name || ''}
                onChangeText={(text) => setReceiptData(prev => ({ ...prev, vendor_name: text }))}
                placeholder="Enter business name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <MapPin size={16} color="#666" /> Address
              </Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={receiptData.vendor_address || ''}
                onChangeText={(text) => setReceiptData(prev => ({ ...prev, vendor_address: text }))}
                placeholder="Enter address"
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                <Phone size={16} color="#666" /> Phone
              </Text>
              <TextInput
                style={styles.input}
                value={receiptData.vendor_phone || ''}
                onChangeText={(text) => setReceiptData(prev => ({ ...prev, vendor_phone: text }))}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Transaction Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Details</Text>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>
                  <Calendar size={16} color="#666" /> Date
                </Text>
                <TextInput
                  style={styles.input}
                  value={receiptData.date || ''}
                  onChangeText={(text) => setReceiptData(prev => ({ ...prev, date: text }))}
                  placeholder="YYYY-MM-DD"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>
                  <Clock size={16} color="#666" /> Time
                </Text>
                <TextInput
                  style={styles.input}
                  value={receiptData.time || ''}
                  onChangeText={(text) => setReceiptData(prev => ({ ...prev, time: text }))}
                  placeholder="HH:MM"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Receipt Number</Text>
              <TextInput
                style={styles.input}
                value={receiptData.receipt_number || ''}
                onChangeText={(text) => setReceiptData(prev => ({ ...prev, receipt_number: text }))}
                placeholder="Enter receipt number"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Method</Text>
              <TextInput
                style={styles.input}
                value={receiptData.payment_method || ''}
                onChangeText={(text) => setReceiptData(prev => ({ ...prev, payment_method: text }))}
                placeholder="Cash, Card, etc."
              />
            </View>
          </View>

          {/* Amounts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <DollarSign size={20} color="#333" /> Amounts
            </Text>
            
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Subtotal</Text>
                <TextInput
                  style={styles.input}
                  value={formatCurrency(receiptData.subtotal)}
                  onChangeText={(text) => setReceiptData(prev => ({ 
                    ...prev, 
                    subtotal: parseCurrency(text) 
                  }))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Tax</Text>
                <TextInput
                  style={styles.input}
                  value={formatCurrency(receiptData.tax_amount)}
                  onChangeText={(text) => setReceiptData(prev => ({ 
                    ...prev, 
                    tax_amount: parseCurrency(text) 
                  }))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Tip</Text>
                <TextInput
                  style={styles.input}
                  value={formatCurrency(receiptData.tip_amount)}
                  onChangeText={(text) => setReceiptData(prev => ({ 
                    ...prev, 
                    tip_amount: parseCurrency(text) 
                  }))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Total</Text>
                <TextInput
                  style={[styles.input, styles.totalInput]}
                  value={formatCurrency(receiptData.total_amount)}
                  onChangeText={(text) => setReceiptData(prev => ({ 
                    ...prev, 
                    total_amount: parseCurrency(text) 
                  }))}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Line Items */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Line Items</Text>
              <TouchableOpacity onPress={addLineItem} style={styles.addButton}>
                <Plus size={20} color="#007AFF" />
                <Text style={styles.addButtonText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {receiptData.line_items?.map((item, index) => (
              <View key={index} style={styles.lineItem}>
                <View style={styles.lineItemHeader}>
                  <Text style={styles.lineItemTitle}>Item {index + 1}</Text>
                  <TouchableOpacity 
                    onPress={() => removeLineItem(index)}
                    style={styles.removeButton}
                  >
                    <Trash2 size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  value={item.description}
                  onChangeText={(text) => updateLineItem(index, 'description', text)}
                  placeholder="Item description"
                />

                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.thirdWidth]}>
                    <Text style={styles.label}>Qty</Text>
                    <TextInput
                      style={styles.input}
                      value={item.quantity?.toString() || '1'}
                      onChangeText={(text) => updateLineItem(index, 'quantity', parseInt(text) || 1)}
                      placeholder="1"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.thirdWidth]}>
                    <Text style={styles.label}>Unit Price</Text>
                    <TextInput
                      style={styles.input}
                      value={formatCurrency(item.unit_price)}
                      onChangeText={(text) => updateLineItem(index, 'unit_price', parseCurrency(text))}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.thirdWidth]}>
                    <Text style={styles.label}>Total</Text>
                    <TextInput
                      style={styles.input}
                      value={formatCurrency(item.total_price)}
                      onChangeText={(text) => updateLineItem(index, 'total_price', parseCurrency(text))}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Confidence Score */}
          {receiptData.confidence_score !== undefined && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Extraction Confidence</Text>
              <View style={styles.confidenceContainer}>
                <View style={[
                  styles.confidenceBar,
                  { width: `${receiptData.confidence_score}%` }
                ]} />
                <Text style={styles.confidenceText}>
                  {receiptData.confidence_score}% confident
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            onPress={handleSave} 
            style={styles.saveButton}
            disabled={updateReceiptMutation.isLoading}
          >
            {updateReceiptMutation.isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Save size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  multilineInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  totalInput: {
    borderColor: '#007AFF',
    borderWidth: 2,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  thirdWidth: {
    flex: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  addButtonText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  lineItem: {
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#F8F9FA',
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lineItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  removeButton: {
    padding: 4,
  },
  confidenceContainer: {
    position: 'relative',
    height: 24,
    backgroundColor: '#E5E5E7',
    borderRadius: 12,
    overflow: 'hidden',
  },
  confidenceBar: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 12,
  },
  confidenceText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 12,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});