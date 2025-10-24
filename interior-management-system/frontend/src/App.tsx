import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Schedule from './pages/Schedule';
import AfterService from './pages/AfterService';
import AdditionalWork from './pages/AdditionalWork';
import ConstructionPayment from './pages/ConstructionPayment';
import Contractors from './pages/Contractors';
import WorkRequest from './pages/WorkRequest';
import ExecutionHistory from './pages/ExecutionHistory';
import Payments from './pages/Payments';
import Login from './pages/Login';
import { AuthProvider } from './contexts/AuthContext';
import { triggerUrgentNotification, requestNotificationPermission } from './utils/notificationSound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  useEffect(() => {
    // 브라우저 알림 권한 요청
    requestNotificationPermission();

    // Socket.IO 연결
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('🔌 Socket.IO 연결됨');
    });

    // 긴급 결제 알림 수신
    socket.on('urgent-payment', (data: {
      project: string;
      amount: number;
      urgency: 'urgent' | 'emergency'
    }) => {
      console.log('🚨 긴급 결제 알림 수신:', data);

      const message = `${data.project} 프로젝트에서 ${data.amount.toLocaleString()}원 결제 요청`;
      triggerUrgentNotification(data.urgency, message);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket.IO 연결 해제됨');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="projects" element={<Projects />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="after-service" element={<AfterService />} />
              <Route path="additional-work" element={<AdditionalWork />} />
              <Route path="construction-payment" element={<ConstructionPayment />} />
              <Route path="contractors" element={<Contractors />} />
              <Route path="work-request" element={<WorkRequest />} />
              <Route path="execution-history" element={<ExecutionHistory />} />
              <Route path="payments" element={<Payments />} />
            </Route>
          </Routes>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#363636',
                border: '1px solid #e5e5e5',
              },
            }}
          />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;