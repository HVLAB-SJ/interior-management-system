import api from './api';

export interface WorkRequestData {
  project: string;
  requestType: string; // 목공도면, 전기도면, 설비도면, 3D모델링, 기타
  description: string;
  requestDate: Date | string;
  dueDate: Date | string;
  requestedBy: string; // 요청자
  assignedTo: string; // 담당자
  status?: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
  completedDate?: Date | string;
}

export interface WorkRequestResponse {
  _id: string;
  project: string;
  requestType: string;
  description: string;
  requestDate: string;
  dueDate: string;
  requestedBy: string;
  assignedTo: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
}

const workRequestService = {
  // Get all work requests
  getAllWorkRequests: async (): Promise<WorkRequestResponse[]> => {
    const response = await api.get('/workrequests');
    return response.data;
  },

  // Get single work request
  getWorkRequestById: async (id: string): Promise<WorkRequestResponse> => {
    const response = await api.get(`/workrequests/${id}`);
    return response.data;
  },

  // Create work request
  createWorkRequest: async (data: WorkRequestData): Promise<WorkRequestResponse> => {
    const response = await api.post('/workrequests', {
      project: data.project,
      requestType: data.requestType,
      description: data.description,
      requestDate: data.requestDate,
      dueDate: data.dueDate,
      requestedBy: data.requestedBy,
      assignedTo: data.assignedTo,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      notes: data.notes,
      completedDate: data.completedDate
    });
    return response.data;
  },

  // Update work request
  updateWorkRequest: async (id: string, data: Partial<WorkRequestData>): Promise<WorkRequestResponse> => {
    const response = await api.put(`/workrequests/${id}`, data);
    return response.data;
  },

  // Delete work request
  deleteWorkRequest: async (id: string): Promise<void> => {
    await api.delete(`/workrequests/${id}`);
  }
};

export default workRequestService;
