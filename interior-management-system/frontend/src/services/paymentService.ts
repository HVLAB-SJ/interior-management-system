import api from './api';

export interface PaymentData {
  projectId: string;
  purpose: string;
  process?: string;
  itemName?: string;
  amount: number;
  category: 'material' | 'labor' | 'equipment' | 'transport' | 'other';
  urgency?: 'normal' | 'urgent' | 'emergency';
  requestedBy?: string;
  bankInfo?: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
  };
  notes?: string;
  attachments?: any[];
}

export interface PaymentResponse {
  id: number;
  project_id: number;
  project_name: string;
  project_color: string;
  user_id: number;
  requester_name: string;
  approver_name?: string;
  approved_by?: number;
  request_type: string;
  vendor_name: string;
  description: string;
  amount: number;
  account_holder: string;
  bank_name: string;
  account_number: string;
  notes: string;
  status: 'pending' | 'reviewing' | 'approved' | 'on-hold' | 'rejected' | 'completed';
  created_at: string;
  updated_at: string;
  approved_at?: string;
  paid_at?: string;
}

const paymentService = {
  // Get all payments
  getAllPayments: async (): Promise<PaymentResponse[]> => {
    const response = await api.get('/payments');
    return response.data;
  },

  // Get single payment
  getPaymentById: async (id: string): Promise<PaymentResponse> => {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },

  // Create payment
  createPayment: async (data: PaymentData): Promise<PaymentResponse> => {
    // Convert to backend format (camelCase -> snake_case)
    const response = await api.post('/payments', {
      project_id: data.projectId,
      request_type: data.category,
      vendor_name: data.process || '',
      description: data.purpose,
      amount: data.amount,
      account_holder: data.bankInfo?.accountHolder || '',
      bank_name: data.bankInfo?.bankName || '',
      account_number: data.bankInfo?.accountNumber || '',
      notes: data.notes || ''
    });
    return response.data;
  },

  // Update payment
  updatePayment: async (id: string, data: Partial<PaymentData>): Promise<PaymentResponse> => {
    // Convert to backend format (camelCase -> snake_case)
    const backendData: any = {};
    if (data.purpose !== undefined) backendData.description = data.purpose;
    if (data.amount !== undefined) backendData.amount = data.amount;
    if (data.process !== undefined) backendData.vendor_name = data.process;
    if (data.category !== undefined) backendData.request_type = data.category;
    if (data.notes !== undefined) backendData.notes = data.notes;
    if (data.bankInfo !== undefined) {
      if (data.bankInfo.accountHolder) backendData.account_holder = data.bankInfo.accountHolder;
      if (data.bankInfo.bankName) backendData.bank_name = data.bankInfo.bankName;
      if (data.bankInfo.accountNumber) backendData.account_number = data.bankInfo.accountNumber;
    }
    const response = await api.put(`/payments/${id}`, backendData);
    return response.data;
  },

  // Update payment status
  updatePaymentStatus: async (id: string, status: string): Promise<PaymentResponse> => {
    const response = await api.put(`/payments/${id}/status`, { status });
    return response.data;
  },

  // Delete payment
  deletePayment: async (id: string): Promise<void> => {
    await api.delete(`/payments/${id}`);
  }
};

export default paymentService;
