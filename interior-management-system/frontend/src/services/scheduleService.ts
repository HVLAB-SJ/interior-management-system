import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ScheduleData {
  project: string;
  title: string;
  type?: 'construction' | 'material' | 'inspection' | 'meeting' | 'other';
  phase?: string;
  startDate: Date | string;
  endDate: Date | string;
  allDay?: boolean;
  assignedTo?: string[];
  description?: string;
  location?: string;
  priority?: 'low' | 'medium' | 'high';
  progress?: number;
  isCompleted?: boolean;
  asRequestId?: string;  // AS 요청 ID
  time?: string;  // 시간 (HH:mm 형식)
}

export interface ScheduleResponse {
  _id: string;
  project: {
    _id: string;
    name: string;
  };
  title: string;
  type: string;
  phase: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  assignedTo: Array<{
    _id: string;
    name: string;
    username: string;
  }>;
  assigneeNames?: string[];  // 담당자 이름 배열
  description?: string;
  location?: string;
  priority: string;
  progress: number;
  isCompleted: boolean;
  completedAt?: string;
  createdBy: {
    _id: string;
    name: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
  time?: string;  // 시간 (HH:mm 형식)
}

const scheduleService = {
  // Get all schedules
  getAllSchedules: async (): Promise<ScheduleResponse[]> => {
    const response = await axios.get(`${API_URL}/schedules`);
    return response.data;
  },

  // Get single schedule
  getScheduleById: async (id: string): Promise<ScheduleResponse> => {
    const response = await axios.get(`${API_URL}/schedules/${id}`);
    return response.data;
  },

  // Create schedule
  createSchedule: async (data: ScheduleData): Promise<ScheduleResponse> => {
    const response = await axios.post(`${API_URL}/schedules`, {
      project: data.project,
      title: data.title,
      type: data.type || 'other',
      phase: data.phase || '기타',
      startDate: data.startDate,
      endDate: data.endDate,
      allDay: data.allDay !== undefined ? data.allDay : true,
      assignedTo: data.assignedTo || [],
      description: data.description,
      location: data.location,
      priority: data.priority || 'medium',
      progress: data.progress || 0,
      isCompleted: data.isCompleted || false,
      asRequestId: data.asRequestId,
      time: data.time
    });
    return response.data;
  },

  // Update schedule
  updateSchedule: async (id: string, data: Partial<ScheduleData>): Promise<ScheduleResponse> => {
    const response = await axios.put(`${API_URL}/schedules/${id}`, data);
    return response.data;
  },

  // Delete schedule
  deleteSchedule: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/schedules/${id}`);
  }
};

export default scheduleService;
