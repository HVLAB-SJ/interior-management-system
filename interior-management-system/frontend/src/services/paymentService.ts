import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    const response = await axios.get(`${API_URL}/payments`);
    return response.data;
  },

  // Get single payment
  getPaymentById: async (id: string): Promise<PaymentResponse> => {
    const response = await axios.get(`${API_URL}/payments/${id}`);
    return response.data;
  },

  // Create payment
  createPayment: async (data: PaymentData): Promise<PaymentResponse> => {
    const response = await axios.post(`${API_URL}/payments`, {
      project: data.projectId,
      purpose: data.purpose,
      process: data.process,
      itemName: data.itemName,
      amount: data.amount,
      category: data.category,
      urgency: data.urgency || 'normal',
      requestedBy: data.requestedBy,
      bankInfo: data.bankInfo,
      notes: data.notes,
      attachments: data.attachments || []
    });
    return response.data;
  },

  // Update payment
  updatePayment: async (id: string, data: Partial<PaymentData>): Promise<PaymentResponse> => {
    const response = await axios.put(`${API_URL}/payments/${id}`, data);
    return response.data;
  },

  // Update payment status
  updatePaymentStatus: async (id: string, status: string): Promise<PaymentResponse> => {
    const response = await axios.put(`${API_URL}/payments/${id}/status`, { status });
    return response.data;
  },

  // Delete payment
  deletePayment: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/payments/${id}`);
  }
};

export default paymentService;
