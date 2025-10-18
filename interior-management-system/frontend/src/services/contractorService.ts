import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ContractorData {
  rank?: string;
  companyName?: string;
  name: string;
  process: string;
  contact?: string;
  accountNumber: string;
  notes?: string;
}

export interface ContractorResponse {
  _id: string;
  rank?: string;
  companyName?: string;
  name: string;
  process: string;
  contact?: string;
  accountNumber: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const contractorService = {
  // Get all contractors
  getAllContractors: async (): Promise<ContractorResponse[]> => {
    const response = await axios.get(`${API_URL}/contractors`);
    return response.data;
  },

  // Get single contractor
  getContractorById: async (id: string): Promise<ContractorResponse> => {
    const response = await axios.get(`${API_URL}/contractors/${id}`);
    return response.data;
  },

  // Create contractor
  createContractor: async (data: ContractorData): Promise<ContractorResponse> => {
    const response = await axios.post(`${API_URL}/contractors`, data);
    return response.data;
  },

  // Update contractor
  updateContractor: async (id: string, data: Partial<ContractorData>): Promise<ContractorResponse> => {
    const response = await axios.put(`${API_URL}/contractors/${id}`, data);
    return response.data;
  },

  // Delete contractor
  deleteContractor: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/contractors/${id}`);
  }
};

export default contractorService;
