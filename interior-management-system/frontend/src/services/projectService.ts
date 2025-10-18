import api from './api';

export interface ProjectData {
  name: string;
  client: string | {
    name: string;
    phone: string;
    email?: string;
    address: string;
  };
  location: string | {
    address: string;
    detailAddress?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  startDate: Date | string;
  endDate: Date | string;
  status?: 'planning' | 'in-progress' | 'completed' | 'on-hold';
  contractAmount: number;
  spent?: number;
  manager: string;
  team?: string[];
  progress?: number;
  description?: string;
  meetingNotes?: Array<{
    id: string;
    content: string;
    date: Date;
  }>;
  customerRequests?: Array<{
    id: string;
    content: string;
    completed: boolean;
    createdAt: Date;
  }>;
  entrancePassword?: string;
  sitePassword?: string;
}

export interface ProjectResponse {
  _id: string;
  name: string;
  client: {
    name: string;
    phone: string;
    email?: string;
    address: string;
  };
  location: {
    address: string;
    detailAddress?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  startDate: string;
  endDate: string;
  status: 'planning' | 'inProgress' | 'completed' | 'onHold';
  budget: number;
  actualCost: number;
  manager: {
    _id: string;
    name: string;
    username: string;
  } | string;
  fieldManagers: Array<{
    _id: string;
    name: string;
    username: string;
  } | string>;
  workers: Array<{
    _id: string;
    name: string;
    username: string;
  } | string>;
  colorCode: string;
  progress: number;
  description?: string;
  attachments: Array<{
    name: string;
    url: string;
    type: string;
    uploadedAt: string;
  }>;
  createdBy: {
    _id: string;
    name: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

const projectService = {
  // Get all projects
  getAllProjects: async (): Promise<ProjectResponse[]> => {
    const response = await api.get('/projects');
    return response.data;
  },

  // Get single project
  getProjectById: async (id: string): Promise<ProjectResponse> => {
    const response = await api.get(`/projects/${id}`);
    return response.data;
  },

  // Create project
  createProject: async (data: ProjectData): Promise<ProjectResponse> => {
    // Convert frontend format to backend format
    const backendData: any = {
      name: data.name,
      client: typeof data.client === 'string'
        ? {
            name: data.client || '미등록',
            phone: '미등록',
            address: '미등록'
          }
        : data.client,
      location: typeof data.location === 'string'
        ? {
            address: data.location
          }
        : data.location,
      status: data.status === 'in-progress' ? 'inProgress' : (data.status === 'on-hold' ? 'onHold' : data.status),
      budget: data.contractAmount,
      actualCost: data.spent || 0,
      manager: data.manager,
      fieldManagers: data.team || [],
      workers: [],
      progress: data.progress || 0,
      description: data.description
    };

    // Only add dates if they exist
    if (data.startDate) {
      backendData.startDate = data.startDate;
    }
    if (data.endDate) {
      backendData.endDate = data.endDate;
    }

    const response = await api.post('/projects', backendData);
    return response.data;
  },

  // Update project
  updateProject: async (id: string, data: Partial<ProjectData>): Promise<ProjectResponse> => {
    // First, get the existing project to preserve client and location data
    const existingProject = await api.get(`/projects/${id}`);
    const existing = existingProject.data;

    // Log incoming data for debugging
    console.log('projectService.updateProject - incoming data:', data);
    console.log('projectService.updateProject - existing project:', existing);

    // Convert frontend format to backend format
    const backendData: any = {};

    if (data.name !== undefined) backendData.name = data.name;
    if (data.client !== undefined) {
      // Preserve existing client data when only name is provided
      if (typeof data.client === 'string') {
        backendData.client = {
          name: data.client,
          phone: existing.client?.phone || '미등록',
          email: existing.client?.email,
          address: existing.client?.address || '미등록'
        };
      } else {
        backendData.client = data.client;
      }
    }
    if (data.location !== undefined) {
      // Preserve existing location data when only address is provided
      if (typeof data.location === 'string') {
        backendData.location = {
          address: data.location,
          detailAddress: existing.location?.detailAddress,
          coordinates: existing.location?.coordinates
        };
      } else {
        backendData.location = data.location;
      }
    }
    if (data.startDate !== undefined) backendData.startDate = data.startDate;
    if (data.endDate !== undefined) backendData.endDate = data.endDate;
    if (data.status !== undefined) {
      backendData.status = data.status === 'in-progress' ? 'inProgress' : (data.status === 'on-hold' ? 'onHold' : data.status);
    }
    if (data.contractAmount !== undefined) backendData.budget = data.contractAmount;
    if (data.spent !== undefined) backendData.actualCost = data.spent;
    // Handle manager field - send it to backend regardless of format
    // Backend will convert names to ObjectIds
    if (data.manager !== undefined) {
      backendData.manager = data.manager;
    }
    // Don't include team field when updating - it will be handled separately if needed
    // Team members are usually names, not ObjectIds, which causes validation errors
    // If you need to update team members, use a separate API endpoint
    if (data.progress !== undefined) backendData.progress = data.progress;
    if (data.description !== undefined) backendData.description = data.description;
    if (data.meetingNotes !== undefined) backendData.meetingNotes = data.meetingNotes;
    if (data.customerRequests !== undefined) backendData.customerRequests = data.customerRequests;
    if (data.entrancePassword !== undefined) backendData.entrancePassword = data.entrancePassword;
    if (data.sitePassword !== undefined) backendData.sitePassword = data.sitePassword;

    // Log final payload
    console.log('projectService.updateProject - sending to backend:', backendData);

    try {
      const response = await api.put(`/projects/${id}`, backendData);
      return response.data;
    } catch (error: any) {
      console.error('projectService.updateProject - error:', error);
      console.error('projectService.updateProject - error response:', error.response?.data);
      console.error('projectService.updateProject - error status:', error.response?.status);
      throw error;
    }
  },

  // Delete project
  deleteProject: async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
  }
};

export default projectService;
