import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { 
  Edit3, 
  MapPin, 
  Phone, 
  Calendar, 
  Clock, 
  CreditCard, 
  Receipt,
  DollarSign 
} from 'lucide-react-native';
import { ReceiptData } from '@/types/supabase';

interface ReceiptDataViewProps {
  receiptData: ReceiptData;
  onEdit?: () => void;
  showEditButton?: boolean;
}

export default function ReceiptDataView({
  receiptData,
  onEdit,
  showEditButton = true,
}: ReceiptDataViewProps) {
  const formatCurrency = (amount: number | undefined, currency = 'USD'): string => {
    if (amount === undefined || amount === null) return 'N/A';
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    });
    
    return formatter.format(amount);
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString: string | undefined): string => {
    if (!timeString) return 'N/A';
    
    try {
      // Assume time is in HH:MM format
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timeString;
    }
  };

  const getConfidenceColor = (score: number | undefined): string => {
    if (!score) return '#999';
    if (score >= 80) return '#34C759';
    if (score >= 60) return '#FF9500';
    return '#FF3B30';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Receipt Details</Text>
        {showEditButton && onEdit && (
          <TouchableOpacity onPress={onEdit} style={styles.editButton}>
            <Edit3 size={20} color="#007AFF" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Vendor Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vendor Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Business Name</Text>
            <Text style={styles.value}>{receiptData.vendor_name || 'N/A'}</Text>
          </View>

          {receiptData.vendor_address && (
            <View style={styles.infoRow}>
              <View style={styles.labelWithIcon}>
                <MapPin size={16} color="#666" />
                <Text style={styles.label}>Address</Text>
              </View>
              <Text style={styles.value}>{receiptData.vendor_address}</Text>
            </View>
          )}

          {receiptData.vendor_phone && (
            <View style={styles.infoRow}>
              <View style={styles.labelWithIcon}>
                <Phone size={16} color="#666" />
                <Text style={styles.label}>Phone</Text>
              </View>
              <Text style={styles.value}>{receiptData.vendor_phone}</Text>
            </View>
          )}
        </View>

        {/* Transaction Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>
          
          <View style={styles.row}>
            <View style={styles.halfColumn}>
              <View style={styles.infoRow}>
                <View style={styles.labelWithIcon}>
                  <Calendar size={16} color="#666" />
                  <Text style={styles.label}>Date</Text>
                </View>
                <Text style={styles.value}>{formatDate(receiptData.date)}</Text>
              </View>
            </View>

            <View style={styles.halfColumn}>
              <View style={styles.infoRow}>
                <View style={styles.labelWithIcon}>
                  <Clock size={16} color="#666" />
                  <Text style={styles.label}>Time</Text>
                </View>
                <Text style={styles.value}>{formatTime(receiptData.time)}</Text>
              </View>
            </View>
          </View>

          {receiptData.receipt_number && (
            <View style={styles.infoRow}>
              <View style={styles.labelWithIcon}>
                <Receipt size={16} color="#666" />
                <Text style={styles.label}>Receipt Number</Text>
              </View>
              <Text style={styles.value}>{receiptData.receipt_number}</Text>
            </View>
          )}

          {receiptData.payment_method && (
            <View style={styles.infoRow}>
              <View style={styles.labelWithIcon}>
                <CreditCard size={16} color="#666" />
                <Text style={styles.label}>Payment Method</Text>
              </View>
              <Text style={styles.value}>{receiptData.payment_method}</Text>
            </View>
          )}
        </View>

        {/* Amounts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <DollarSign size={20} color="#333" /> Amounts
          </Text>
          
          {receiptData.subtotal !== undefined && receiptData.subtotal > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Subtotal</Text>
              <Text style={styles.value}>
                {formatCurrency(receiptData.subtotal, receiptData.currency)}
              </Text>
            </View>
          )}

          {receiptData.tax_amount !== undefined && receiptData.tax_amount > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Tax</Text>
              <Text style={styles.value}>
                {formatCurrency(receiptData.tax_amount, receiptData.currency)}
              </Text>
            </View>
          )}

          {receiptData.tip_amount !== undefined && receiptData.tip_amount > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Tip</Text>
              <Text style={styles.value}>
                {formatCurrency(receiptData.tip_amount, receiptData.currency)}
              </Text>
            </View>
          )}

          <View style={[styles.infoRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(receiptData.total_amount, receiptData.currency)}
            </Text>
          </View>
        </View>

        {/* Line Items */}
        {receiptData.line_items && receiptData.line_items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items</Text>
            
            {receiptData.line_items.map((item, index) => (
              <View key={index} style={styles.lineItem}>
                <Text style={styles.itemDescription}>{item.description}</Text>
                <View style={styles.itemDetails}>
                  {item.quantity && item.quantity > 1 && (
                    <Text style={styles.itemDetail}>Qty: {item.quantity}</Text>
                  )}
                  {item.unit_price && item.unit_price > 0 && (
                    <Text style={styles.itemDetail}>
                      @ {formatCurrency(item.unit_price, receiptData.currency)}
                    </Text>
                  )}
                  {item.total_price && item.total_price > 0 && (
                    <Text style={styles.itemPrice}>
                      {formatCurrency(item.total_price, receiptData.currency)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Extraction Confidence */}
        {receiptData.confidence_score !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Extraction Quality</Text>
            <View style={styles.confidenceContainer}>
              <View style={[
                styles.confidenceBar,
                { 
                  width: `${receiptData.confidence_score}%`,
                  backgroundColor: getConfidenceColor(receiptData.confidence_score)
                }
              ]} />
              <Text style={styles.confidenceText}>
                {receiptData.confidence_score}% confident
              </Text>
            </View>
            
            {receiptData.extracted_at && (
              <Text style={styles.extractedAt}>
                Extracted on {formatDate(receiptData.extracted_at)}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
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
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  editButtonText: {
    color: '#007AFF',
    fontWeight: '500',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#1D1D1F',
    fontWeight: '400',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfColumn: {
    flex: 1,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  lineItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  itemDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDetail: {
    fontSize: 13,
    color: '#666',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1D1D1F',
  },
  confidenceContainer: {
    position: 'relative',
    height: 24,
    backgroundColor: '#E5E5E7',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  confidenceBar: {
    height: '100%',
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
  extractedAt: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});