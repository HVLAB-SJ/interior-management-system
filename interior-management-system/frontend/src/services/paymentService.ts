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
  _id: string;
  project: {
    _id: string;
    name: string;
  };
  requestedBy: {
    _id: string;
    name: string;
    email: string;
  };
  approvedBy?: {
    _id: string;
    name: string;
  };
  amount: number;
  purpose: string;
  process?: string;
  itemName?: string;
  category: string;
  status: 'pending' | 'reviewing' | 'approved' | 'on-hold' | 'rejected' | 'completed';
  urgency: string;
  bankInfo?: {
    accountHolder: string;
    bankName: string;
    accountNumber: string;
  };
  requestDate: string;
  approvalDate?: string;
  completionDate?: string;
  notes?: string;
  attachments: Array<{
    name: string;
    url: string;
    type: string;
  }>;
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
