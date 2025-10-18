import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ConstructionPaymentData {
  project: string;
  client: string;
  totalAmount: number;
  vatType: 'percentage' | 'amount';
  vatPercentage: number;
  vatAmount: number;
  payments: Array<{
    types: ('계약금' | '착수금' | '중도금' | '잔금' | '추가금')[];
    amount: number;
    date: Date;
    method: string;
    notes?: string;
  }>;
}

export interface ConstructionPaymentResponse {
  _id: string;
  project: string;
  client: string;
  totalAmount: number;
  vatType: 'percentage' | 'amount';
  vatPercentage: number;
  vatAmount: number;
  payments: Array<{
    types: ('계약금' | '착수금' | '중도금' | '잔금' | '추가금')[];
    amount: number;
    date: string;
    method: string;
    notes?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const constructionPaymentService = {
  // Get all construction payments
  getAllConstructionPayments: async (): Promise<ConstructionPaymentResponse[]> => {
    const response = await axios.get(`${API_URL}/construction-payments`);
    return response.data;
  },

  // Get single construction payment
  getConstructionPaymentById: async (id: string): Promise<ConstructionPaymentResponse> => {
    const response = await axios.get(`${API_URL}/construction-payments/${id}`);
    return response.data;
  },

  // Create construction payment
  createConstructionPayment: async (data: ConstructionPaymentData): Promise<ConstructionPaymentResponse> => {
    const response = await axios.post(`${API_URL}/construction-payments`, data);
    return response.data;
  },

  // Update construction payment
  updateConstructionPayment: async (id: string, data: Partial<ConstructionPaymentData>): Promise<ConstructionPaymentResponse> => {
    const response = await axios.put(`${API_URL}/construction-payments/${id}`, data);
    return response.data;
  },

  // Delete construction payment
  deleteConstructionPayment: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/construction-payments/${id}`);
  }
};

export default constructionPaymentService;
