import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface AdditionalWorkData {
  project: string;
  description: string;
  amount: number;
  date: Date;
  notes?: string;
}

export interface AdditionalWorkResponse {
  _id: string;
  project: string;
  description: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const additionalWorkService = {
  // Get all additional works
  getAllAdditionalWorks: async (): Promise<AdditionalWorkResponse[]> => {
    const response = await axios.get(`${API_URL}/additional-works`);
    return response.data;
  },

  // Get single additional work
  getAdditionalWorkById: async (id: string): Promise<AdditionalWorkResponse> => {
    const response = await axios.get(`${API_URL}/additional-works/${id}`);
    return response.data;
  },

  // Create additional work
  createAdditionalWork: async (data: AdditionalWorkData): Promise<AdditionalWorkResponse> => {
    const response = await axios.post(`${API_URL}/additional-works`, data);
    return response.data;
  },

  // Update additional work
  updateAdditionalWork: async (id: string, data: Partial<AdditionalWorkData>): Promise<AdditionalWorkResponse> => {
    const response = await axios.put(`${API_URL}/additional-works/${id}`, data);
    return response.data;
  },

  // Delete additional work
  deleteAdditionalWork: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/additional-works/${id}`);
  }
};

export default additionalWorkService;
