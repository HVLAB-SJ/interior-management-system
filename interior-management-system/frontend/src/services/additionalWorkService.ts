import api from './api';

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
    const response = await api.get('/additional-works');
    return response.data;
  },

  // Get single additional work
  getAdditionalWorkById: async (id: string): Promise<AdditionalWorkResponse> => {
    const response = await api.get(`/additional-works/${id}`);
    return response.data;
  },

  // Create additional work
  createAdditionalWork: async (data: AdditionalWorkData): Promise<AdditionalWorkResponse> => {
    const response = await api.post('/additional-works', data);
    return response.data;
  },

  // Update additional work
  updateAdditionalWork: async (id: string, data: Partial<AdditionalWorkData>): Promise<AdditionalWorkResponse> => {
    const response = await api.put(`/additional-works/${id}`, data);
    return response.data;
  },

  // Delete additional work
  deleteAdditionalWork: async (id: string): Promise<void> => {
    await api.delete(`/additional-works/${id}`);
  }
};

export default additionalWorkService;
