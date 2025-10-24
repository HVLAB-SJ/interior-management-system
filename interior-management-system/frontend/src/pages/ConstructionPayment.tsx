import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { X, Edit } from 'lucide-react';
import { useDataStore } from '../store/dataStore';
import toast from 'react-hot-toast';

interface PaymentRecord {
  id: string;
  project: string;
  client: string;
  totalAmount: number; // 순수 공사금액
  vatType: 'percentage' | 'amount'; // 부가세 입력 방식
  vatPercentage: number; // 부가세 발행 비율 (0-100%)
  vatAmount: number; // 부가세 발행 금액
  payments: {
    type: string; // 쉼표로 구분된 타입들 ('계약금', '계약금, 착수금' 등)
    amount: number;
    date: Date;
    method: string;
    notes?: string;
  }[];
}

const ConstructionPayment = () => {
  const {
    projects,
    constructionPayments,
    loadConstructionPaymentsFromAPI,
    addConstructionPaymentToAPI,
    updateConstructionPaymentInAPI,
    deleteConstructionPaymentFromAPI,
    executionRecords
  } = useDataStore();
  const [records, setRecords] = useState<PaymentRecord[]>(constructionPayments);

  // Load construction payments from API on mount
  useEffect(() => {
    console.log('💰 ConstructionPayment: Loading payments from API...');
    loadConstructionPaymentsFromAPI()
      .then(() => {
        console.log('💰 ConstructionPayment: Payments loaded successfully');
      })
      .catch(error => {
        console.error('💰 ConstructionPayment: Failed to load construction payments:', error);
        toast.error('공사대금 데이터를 불러오는데 실패했습니다');
      });
  }, [loadConstructionPaymentsFromAPI]);

  // 헤더의 + 버튼 클릭 이벤트 수신
  useEffect(() => {
    const handleHeaderAddButton = () => {
      handleAddProject();
    };

    window.addEventListener('headerAddButtonClick', handleHeaderAddButton);
    return () => window.removeEventListener('headerAddButtonClick', handleHeaderAddButton);
  }, []);

  // Sync local state with dataStore, normalize data, and remove orphaned records
  useEffect(() => {
    console.log('💰 ConstructionPayment: Syncing with dataStore');
    console.log('💰 constructionPayments:', constructionPayments);
    console.log('💰 projects:', projects);

    // Get valid project names
    const validProjectNames = projects.map(p => p.name);
    console.log('💰 Valid project names:', validProjectNames);

    // Filter out records that don't have corresponding projects
    const validRecords = constructionPayments.filter(record =>
      validProjectNames.includes(record.project)
    );
    console.log('💰 Valid records after filtering:', validRecords);

    // Normalize the valid records
    const normalizedRecords = validRecords.map(record => ({
      ...record,
      vatType: record.vatType || 'percentage',
      vatPercentage: record.vatPercentage ?? 100,
      vatAmount: record.vatAmount ?? 0,
      payments: record.payments.map((payment: any) => ({
        ...payment,
        // Convert old 'types' format to new 'type' format
        type: payment.type || payment.types?.[0] || '계약금'
      }))
    }));
    console.log('💰 Normalized records:', normalizedRecords);

    // If orphaned records were found, delete them from the store
    if (validRecords.length < constructionPayments.length) {
      // Find orphaned records
      const orphanedRecords = constructionPayments.filter(
        record => !validProjectNames.includes(record.project)
      );

      // Delete each orphaned record from the store
      orphanedRecords.forEach(async (record) => {
        try {
          await deleteConstructionPaymentFromAPI(record.id);
        } catch (error) {
          console.error('Failed to delete orphaned record:', error);
        }
      });

      console.log('Removed orphaned construction payment records:',
        orphanedRecords.map(r => `${r.project} (${r.id})`));
    }

    setRecords(normalizedRecords);
  }, [constructionPayments, projects, deleteConstructionPaymentFromAPI]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<PaymentRecord | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'remaining'>('remaining');
  const [newProject, setNewProject] = useState({
    projectId: '',
    totalAmount: 0,
    vatType: 'percentage' as 'percentage' | 'amount',
    vatPercentage: 100,
    vatAmount: 0
  });
  const [newPayment, setNewPayment] = useState({
    types: [] as ('계약금' | '착수금' | '중도금' | '잔금' | '추가금')[],
    percentage: 0,
    amount: 0,
    date: '',
    method: '계좌이체',
    notes: ''
  });

  // 각 구분별 기본 비율
  const DEFAULT_PERCENTAGES = {
    '계약금': 10,
    '착수금': 40,
    '중도금': 40,
    '잔금': 10,
    '추가금': 0  // 추가금은 기본 0%
  };

  // 선택된 타입들의 비율 합산
  const calculateTotalPercentage = (selectedTypes: string[]) => {
    return selectedTypes.reduce((sum, type) => {
      return sum + (DEFAULT_PERCENTAGES[type as keyof typeof DEFAULT_PERCENTAGES] || 0);
    }, 0);
  };

  // 공사 날짜 기반으로 자동 날짜 계산 (우선순위: 계약금 > 착수금 > 중도금 > 잔금 > 추가금)
  const calculatePaymentDate = (types: ('계약금' | '착수금' | '중도금' | '잔금' | '추가금')[], projectId?: string) => {
    const currentProject = projectId
      ? projects.find(p => p.id === projectId)
      : (selectedRecord ? projects.find(p => p.name === selectedRecord.project) : null);

    if (!currentProject || types.length === 0) return '';
    if (!currentProject.startDate || !currentProject.endDate) return '';

    const startDate = new Date(currentProject.startDate);
    const endDate = new Date(currentProject.endDate);

    // Check if dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return '';

    // 우선순위에 따라 날짜 결정
    if (types.includes('계약금')) {
      // 계약금은 날짜를 비워둠 (사용자가 직접 입력)
      return '';
    } else if (types.includes('착수금')) {
      // 착수금은 공사 시작 1주일 전
      const oneWeekBefore = new Date(startDate);
      oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);
      return format(oneWeekBefore, 'yyyy-MM-dd');
    } else if (types.includes('중도금')) {
      // 중도금은 공사 시작과 종료 중간
      const middleTime = startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2;
      return format(new Date(middleTime), 'yyyy-MM-dd');
    } else if (types.includes('잔금') || types.includes('추가금')) {
      // 잔금과 추가금은 공사 종료일
      return format(endDate, 'yyyy-MM-dd');
    }

    return '';
  };

  // 프로젝트의 예상 수금 일정 계산
  const calculatePaymentSchedule = (record: PaymentRecord) => {
    const project = projects.find(p => p.name === record.project);
    if (!project) return [];
    if (!project.startDate || !project.endDate) return [];

    const totalAmount = calculateTotalContractAmount(record);
    const startDate = new Date(project.startDate);
    const endDate = new Date(project.endDate);

    // Check if dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];

    const schedule: Array<{
      type: string;
      date: Date | null;
      amount: number;
      percentage: number;
      status: string;
      actualDate?: Date;
      actualAmount?: number;
    }> = [];

    // 계약금 - 날짜 미정
    schedule.push({
      type: '계약금',
      date: null,
      amount: Math.round(totalAmount * 0.1),
      percentage: 10,
      status: 'pending'
    });

    // 착수금 - 공사 시작 1주일 전
    const oneWeekBefore = new Date(startDate);
    oneWeekBefore.setDate(oneWeekBefore.getDate() - 7);
    schedule.push({
      type: '착수금',
      date: oneWeekBefore,
      amount: Math.round(totalAmount * 0.4),
      percentage: 40,
      status: oneWeekBefore <= new Date() ? 'overdue' : 'pending'
    });

    // 중도금 - 공사 중간
    const middleTime = startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2;
    const middleDate = new Date(middleTime);
    schedule.push({
      type: '중도금',
      date: middleDate,
      amount: Math.round(totalAmount * 0.4),
      percentage: 40,
      status: middleDate <= new Date() ? 'overdue' : 'pending'
    });

    // 잔금 - 공사 종료일
    schedule.push({
      type: '잔금',
      date: endDate,
      amount: Math.round(totalAmount * 0.1),
      percentage: 10,
      status: endDate <= new Date() ? 'overdue' : 'pending'
    });

    // 실제 수금 내역과 비교하여 상태 업데이트
    record.payments.forEach(payment => {
      const types = payment.type?.split(', ') || [];
      types.forEach(type => {
        const scheduleItem = schedule.find(s => s.type === type.trim());
        if (scheduleItem) {
          scheduleItem.status = 'completed';
          scheduleItem.actualDate = payment.date;
          scheduleItem.actualAmount = payment.amount;
        }
      });
    });

    return schedule;
  };

  const handleAddProject = () => {
    setShowProjectModal(true);
  };

  const handleSaveProject = async () => {
    console.log('💰 handleSaveProject called');
    console.log('💰 newProject:', newProject);
    console.log('💰 projects:', projects);

    // ID 타입 안전하게 비교 (문자열/숫자 모두 처리)
    const selectedProject = projects.find(p =>
      p.id === newProject.projectId ||
      p.id === parseInt(newProject.projectId) ||
      p.id.toString() === newProject.projectId.toString()
    );
    console.log('💰 selectedProject:', selectedProject);
    console.log('💰 totalAmount:', newProject.totalAmount, 'type:', typeof newProject.totalAmount);

    if (!selectedProject) {
      alert('프로젝트를 선택하세요');
      return;
    }

    if (newProject.totalAmount <= 0) {
      alert('총 공사금액을 입력하세요 (0보다 커야 합니다)');
      return;
    }

    try {
      const newRecord: any = {
        id: '',
        project_id: selectedProject.id,  // Add project_id for backend
        project: selectedProject.name,
        client: selectedProject.client,
        totalAmount: newProject.totalAmount,
        vatType: newProject.vatType,
        vatPercentage: newProject.vatPercentage,
        vatAmount: newProject.vatAmount,
        payments: []
      };

      console.log('📤 Sending to API:', newRecord);
      await addConstructionPaymentToAPI(newRecord);
      toast.success('프로젝트가 추가되었습니다');
      setShowProjectModal(false);
      setNewProject({ projectId: '', totalAmount: 0, vatType: 'percentage', vatPercentage: 100, vatAmount: 0 });
    } catch (error) {
      console.error('Failed to add construction payment:', error);
      toast.error('프로젝트 추가에 실패했습니다');
    }
  };

  const handleAddPayment = () => {
    setEditingPaymentIndex(null);
    setNewPayment({
      types: [],
      percentage: 0,
      amount: 0,
      date: '',
      method: '계좌이체',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleEditPayment = (index: number) => {
    const payment = selectedRecord?.payments[index];
    if (!payment) return;

    setEditingPaymentIndex(index);
    // type이 쉼표로 구분된 문자열인 경우 처리
    const paymentTypes = payment.type
      ? payment.type.split(',').map(t => t.trim()) as ('계약금' | '착수금' | '중도금' | '잔금' | '추가금')[]
      : [];
    setNewPayment({
      types: paymentTypes,
      percentage: calculateTotalPercentage(paymentTypes),
      amount: payment.amount,
      date: format(payment.date, 'yyyy-MM-dd'),
      method: payment.method,
      notes: payment.notes || ''
    });
    setShowPaymentModal(true);
  };

  const handleSavePayment = async () => {
    if (!selectedRecord || !newPayment.date || newPayment.amount <= 0 || newPayment.types.length === 0) {
      alert('모든 필드를 입력하세요');
      return;
    }

    try {
      let updatedPayments;
      if (editingPaymentIndex !== null) {
        // 수정 모드
        updatedPayments = selectedRecord.payments.map((payment, idx) =>
          idx === editingPaymentIndex
            ? {
                type: newPayment.types.join(', '),  // 여러 타입을 쉼표로 구분하여 저장
                amount: newPayment.amount,
                date: new Date(newPayment.date),
                method: newPayment.method,
                notes: newPayment.notes
              }
            : payment
        );
      } else {
        // 추가 모드
        updatedPayments = [
          ...selectedRecord.payments,
          {
            type: newPayment.types.join(', '),  // 여러 타입을 쉼표로 구분하여 저장
            amount: newPayment.amount,
            date: new Date(newPayment.date),
            method: newPayment.method,
            notes: newPayment.notes
          }
        ];
      }

      const updatedRecord = {
        ...selectedRecord,
        payments: updatedPayments
      };

      // Update in API
      await updateConstructionPaymentInAPI(selectedRecord.id, updatedRecord);
      toast.success(editingPaymentIndex !== null ? '입금이 수정되었습니다' : '입금이 추가되었습니다');

      // Update local state
      const updatedRecords = records.map(record =>
        record.id === selectedRecord.id ? updatedRecord : record
      );
      setRecords(updatedRecords);
      setSelectedRecord(updatedRecord);
      setShowPaymentModal(false);
      setEditingPaymentIndex(null);
      setNewPayment({
        types: [],
        percentage: 0,
        amount: 0,
        date: '',
        method: '계좌이체',
        notes: ''
      });
    } catch (error) {
      console.error('Failed to save payment:', error);
      toast.error('입금 저장에 실패했습니다');
    }
  };

  // 총 계약금액 계산 (공사금액 + 부가세)
  const calculateTotalContractAmount = (record: PaymentRecord) => {
    if (record.vatType === 'amount') {
      return record.totalAmount + (record.vatAmount || 0);
    } else {
      const vatAmount = record.totalAmount * ((record.vatPercentage ?? 100) / 100) * 0.1;
      return record.totalAmount + vatAmount;
    }
  };

  // 부가세 금액 계산
  const getVatAmount = (record: PaymentRecord) => {
    if (record.vatType === 'amount') {
      return record.vatAmount || 0;
    } else {
      return record.totalAmount * ((record.vatPercentage ?? 100) / 100) * 0.1;
    }
  };

  // 퍼센트에 따라 금액 자동 계산 (총 계약금액 기준)
  const calculateAmountFromPercentage = (percentage: number) => {
    if (!selectedRecord) return 0;
    const totalContractAmount = calculateTotalContractAmount(selectedRecord);
    return Math.round((totalContractAmount * percentage) / 100);
  };

  const calculateReceived = (record: PaymentRecord) => {
    return record.payments.reduce((sum, p) => sum + p.amount, 0);
  };

  const calculateRemaining = (record: PaymentRecord) => {
    const totalContractAmount = calculateTotalContractAmount(record);
    return totalContractAmount - calculateReceived(record);
  };

  // 프로젝트별 실행내역 총 합계 계산
  const calculateExecutionTotal = (projectName: string) => {
    return executionRecords
      .filter(record => record.project === projectName)
      .reduce((sum, record) => sum + (record.totalAmount || 0), 0);
  };

  // 검색 및 탭 필터링
  const filteredRecords = records
    .filter(record =>
      (record.project || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.client || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(record => {
      if (activeTab === 'all') return true;
      const remaining = calculateRemaining(record);
      if (activeTab === 'completed') return remaining === 0;
      if (activeTab === 'remaining') return remaining > 0;
      return true;
    });

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between lg:justify-start">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">공사대금 관리</h1>
        <button onClick={handleAddProject} className="hidden lg:inline-flex btn btn-primary px-4 py-2 ml-auto">
          + 프로젝트
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 md:space-x-8 overflow-x-auto">
          {[
            { id: 'remaining' as const, label: '미수금', count: records.filter(r => calculateRemaining(r) > 0).length },
            { id: 'completed' as const, label: '완납', count: records.filter(r => calculateRemaining(r) === 0).length },
            { id: 'all' as const, label: '전체', count: records.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-gray-700 text-gray-700'
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              <span className={`ml-1 md:ml-2 py-0.5 px-1.5 md:px-2 rounded-full text-[10px] md:text-xs font-semibold ${
                activeTab === tab.id ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="프로젝트 또는 고객명 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
        />
      </div>

      {/* Records List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRecords.map((record) => {
          const received = calculateReceived(record);
          const remaining = calculateRemaining(record);
          const totalContractAmount = calculateTotalContractAmount(record);
          const percentage = (received / totalContractAmount) * 100;

          return (
            <div key={record.id} className="card hover:border-gray-400 transition-colors">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-gray-900">{record.project}</h3>
                  <button
                    onClick={() => setSelectedRecord(record)}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    상세보기
                  </button>
                </div>
                <p className="text-sm text-gray-600">{record.client}님</p>
              </div>

              {/* Total Amount */}
              <div className="mb-4 space-y-2">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">순수 공사금액</p>
                  <p className="text-lg font-bold text-gray-900">
                    ₩{record.totalAmount.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-700">
                      총 계약금액 (부가세 {record.vatType === 'percentage' ? `${record.vatPercentage ?? 100}%` : `₩${(record.vatAmount || 0).toLocaleString()}`} 포함)
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    ₩{totalContractAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">수령률</span>
                  <span className="text-sm font-medium text-gray-900">{percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full">
                  <div
                    className="bg-gray-600 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {/* Received, Execution Total & Remaining */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-700 mb-1">수령금액</p>
                  <p className="text-base font-bold text-gray-800">
                    ₩{received.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-700 mb-1">실행내역 합계</p>
                  <p className="text-base font-bold text-gray-800">
                    ₩{calculateExecutionTotal(record.project).toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-700 mb-1">미수금</p>
                  <p className="text-base font-bold text-gray-800">
                    ₩{remaining.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Latest Payment */}
              {record.payments.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500 mb-2">최근 입금</p>
                  {record.payments.slice(-2).reverse().map((payment, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">
                        {payment.type || '미분류'} - {format(payment.date, 'MM/dd')}
                      </span>
                      <span className="font-medium text-gray-900">
                        ₩{payment.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{selectedRecord.project}</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedRecord.client}님</p>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Payment Schedule */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">예상 수금 일정</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="space-y-3">
                    {calculatePaymentSchedule(selectedRecord).map((schedule, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            schedule.status === 'completed' ? 'bg-green-100 text-green-800' :
                            schedule.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {schedule.type}
                          </span>
                          <span className="text-sm text-gray-700">
                            {schedule.date ? format(schedule.date, 'yyyy년 MM월 dd일') : '날짜 미정'}
                            {schedule.status === 'completed' && schedule.actualDate && (
                              <span className="text-green-600 ml-2">
                                (실제: {format(schedule.actualDate, 'MM/dd')})
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            ₩{schedule.amount.toLocaleString()}
                            <span className="text-xs text-gray-500 ml-1">({schedule.percentage}%)</span>
                          </p>
                          {schedule.status === 'completed' && schedule.actualAmount && (
                            <p className="text-xs text-green-600">
                              실제: ₩{schedule.actualAmount.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">예상 총액</span>
                      <span className="font-bold text-gray-900">
                        ₩{calculateTotalContractAmount(selectedRecord).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      순수 공사금액 (₩)
                    </label>
                    <input
                      type="number"
                      value={selectedRecord.totalAmount || ''}
                      onChange={async (e) => {
                        const newTotalAmount = e.target.value === '' ? 0 : Number(e.target.value);
                        const updatedRecord = {
                          ...selectedRecord,
                          totalAmount: newTotalAmount
                        };
                        setSelectedRecord(updatedRecord);
                        try {
                          await updateConstructionPaymentInAPI(selectedRecord.id, updatedRecord);
                          const updatedRecords = records.map(r =>
                            r.id === selectedRecord.id ? updatedRecord : r
                          );
                          setRecords(updatedRecords);
                        } catch (error) {
                          console.error('Failed to update total amount:', error);
                          toast.error('금액 수정에 실패했습니다');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-bold focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                      placeholder="50000000"
                      min="0"
                    />
                    <p className="mt-2 text-xs text-gray-500">부가세를 제외한 순수 공사금액</p>
                  </div>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-700 mb-1">
                      총 계약금액 (부가세 {selectedRecord.vatType === 'percentage' ? `${selectedRecord.vatPercentage ?? 100}%` : `₩${(selectedRecord.vatAmount || 0).toLocaleString()}`} 포함)
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      ₩{calculateTotalContractAmount(selectedRecord).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* VAT Edit */}
                <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    부가세 입력 방식
                  </label>

                  {/* 입력 방식 선택 */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={async () => {
                        const updatedRecord = {
                          ...selectedRecord,
                          vatType: 'percentage' as 'percentage' | 'amount'
                        };
                        setSelectedRecord(updatedRecord);
                        try {
                          await updateConstructionPaymentInAPI(selectedRecord.id, updatedRecord);
                          const updatedRecords = records.map(r =>
                            r.id === selectedRecord.id ? updatedRecord : r
                          );
                          setRecords(updatedRecords);
                        } catch (error) {
                          console.error('Failed to update VAT type:', error);
                          toast.error('부가세 방식 변경에 실패했습니다');
                        }
                      }}
                      className={`flex-1 px-3 py-2 text-sm border rounded-lg font-medium transition-colors ${
                        selectedRecord.vatType === 'percentage'
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      비율 (%)
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const updatedRecord = {
                          ...selectedRecord,
                          vatType: 'amount' as 'percentage' | 'amount'
                        };
                        setSelectedRecord(updatedRecord);
                        try {
                          await updateConstructionPaymentInAPI(selectedRecord.id, updatedRecord);
                          const updatedRecords = records.map(r =>
                            r.id === selectedRecord.id ? updatedRecord : r
                          );
                          setRecords(updatedRecords);
                        } catch (error) {
                          console.error('Failed to update VAT type:', error);
                          toast.error('부가세 방식 변경에 실패했습니다');
                        }
                      }}
                      className={`flex-1 px-3 py-2 text-sm border rounded-lg font-medium transition-colors ${
                        selectedRecord.vatType === 'amount'
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      금액 (₩)
                    </button>
                  </div>

                  {/* 비율 입력 */}
                  {selectedRecord.vatType === 'percentage' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        부가세 발행 비율 (%)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={selectedRecord.vatPercentage}
                          onChange={async (e) => {
                            const newVatPercentage = Number(e.target.value);
                            const updatedRecord = {
                              ...selectedRecord,
                              vatPercentage: newVatPercentage
                            };
                            setSelectedRecord(updatedRecord);
                            try {
                              await updateConstructionPaymentInAPI(selectedRecord.id, updatedRecord);
                              const updatedRecords = records.map(r =>
                                r.id === selectedRecord.id ? updatedRecord : r
                              );
                              setRecords(updatedRecords);
                            } catch (error) {
                              console.error('Failed to update VAT percentage:', error);
                              toast.error('부가세 비율 수정에 실패했습니다');
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                          placeholder="100"
                          min="0"
                          max="100"
                        />
                        <div className="text-xs text-gray-600">
                          <p>부가세: ₩{getVatAmount(selectedRecord).toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        0%: 부가세 없음 | 100%: 전체 금액에 부가세 발행 | 50%: 절반만 부가세 발행
                      </p>
                    </div>
                  )}

                  {/* 금액 입력 */}
                  {selectedRecord.vatType === 'amount' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">
                        부가세 발행 금액 (₩)
                      </label>
                      <input
                        type="number"
                        value={selectedRecord.vatAmount}
                        onChange={async (e) => {
                          const newVatAmount = Number(e.target.value);
                          const updatedRecord = {
                            ...selectedRecord,
                            vatAmount: newVatAmount
                          };
                          setSelectedRecord(updatedRecord);
                          try {
                            await updateConstructionPaymentInAPI(selectedRecord.id, updatedRecord);
                            const updatedRecords = records.map(r =>
                              r.id === selectedRecord.id ? updatedRecord : r
                            );
                            setRecords(updatedRecords);
                          } catch (error) {
                            console.error('Failed to update VAT amount:', error);
                            toast.error('부가세 금액 수정에 실패했습니다');
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                        placeholder="5000000"
                        min="0"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        부가세로 발행할 금액을 직접 입력하세요
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-700 mb-1">수령금액</p>
                    <p className="text-lg font-bold text-gray-800">
                      ₩{calculateReceived(selectedRecord).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-700 mb-1">실행내역 합계</p>
                    <p className="text-lg font-bold text-gray-800">
                      ₩{calculateExecutionTotal(selectedRecord.project).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-700 mb-1">미수금</p>
                    <p className="text-lg font-bold text-gray-800">
                      ₩{calculateRemaining(selectedRecord).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">입금 내역</h3>
                  <button onClick={handleAddPayment} className="btn btn-primary btn-sm">
                    + 입금 추가
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">구분</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">금액</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">입금일</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">방법</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">비고</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">수정</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedRecord.payments.map((payment, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                              {payment.type || '미분류'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            ₩{payment.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {format(payment.date, 'yyyy년 MM월 dd일')}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {payment.method}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {payment.notes || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleEditPayment(idx)}
                              className="text-gray-600 hover:text-gray-700 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="btn btn-outline"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Add Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">새 프로젝트 추가</h2>
                <button
                  onClick={() => setShowProjectModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  프로젝트 선택 *
                </label>
                <select
                  value={newProject.projectId}
                  onChange={(e) => setNewProject({ ...newProject, projectId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                >
                  <option value="">선택하세요</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} - {project.client}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  총 공사금액 *
                </label>
                <input
                  type="number"
                  value={newProject.totalAmount || ''}
                  onChange={(e) => setNewProject({ ...newProject, totalAmount: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                  placeholder="50000000"
                />
                <p className="mt-1 text-xs text-gray-500">순수 공사금액 (부가세 제외)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  부가세 입력 방식 *
                </label>

                {/* 입력 방식 선택 */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setNewProject({ ...newProject, vatType: 'percentage' })}
                    className={`flex-1 px-3 py-2 text-sm border rounded-lg font-medium transition-colors ${
                      newProject.vatType === 'percentage'
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    비율 (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProject({ ...newProject, vatType: 'amount' })}
                    className={`flex-1 px-3 py-2 text-sm border rounded-lg font-medium transition-colors ${
                      newProject.vatType === 'amount'
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    금액 (₩)
                  </button>
                </div>

                {/* 비율 입력 */}
                {newProject.vatType === 'percentage' && (
                  <div>
                    <input
                      type="number"
                      value={newProject.vatPercentage}
                      onChange={(e) => setNewProject({ ...newProject, vatPercentage: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                      placeholder="100"
                      min="0"
                      max="100"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      0%: 부가세 없음 | 100%: 전체 금액에 부가세 발행 | 50%: 절반만 부가세 발행
                    </p>
                  </div>
                )}

                {/* 금액 입력 */}
                {newProject.vatType === 'amount' && (
                  <div>
                    <input
                      type="number"
                      value={newProject.vatAmount || ''}
                      onChange={(e) => setNewProject({ ...newProject, vatAmount: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                      placeholder="5000000"
                      min="0"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      부가세로 발행할 금액을 직접 입력하세요
                    </p>
                  </div>
                )}

                {/* 계산 미리보기 */}
                {newProject.totalAmount > 0 && (
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-700 mb-1">총 계약금액 (부가세 포함)</p>
                    <p className="text-xl font-bold text-gray-900">
                      ₩{(newProject.totalAmount + (newProject.vatType === 'percentage'
                        ? (newProject.totalAmount * (newProject.vatPercentage / 100) * 0.1)
                        : newProject.vatAmount)).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      = 공사금액 ₩{newProject.totalAmount.toLocaleString()} + 부가세 ₩{(newProject.vatType === 'percentage'
                        ? (newProject.totalAmount * (newProject.vatPercentage / 100) * 0.1)
                        : newProject.vatAmount).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => setShowProjectModal(false)}
                className="btn btn-outline"
              >
                취소
              </button>
              <button
                onClick={handleSaveProject}
                className="btn btn-primary"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Add/Edit Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {editingPaymentIndex !== null ? '입금 수정' : '입금 추가'}
                </h2>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setEditingPaymentIndex(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* 구분 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  구분 * (중복 선택 가능)
                </label>
                <div className="space-y-2">
                  {['계약금', '착수금', '중도금', '잔금', '추가금'].map((type) => {
                    const percentage = DEFAULT_PERCENTAGES[type as keyof typeof DEFAULT_PERCENTAGES];
                    return (
                      <label key={type} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPayment.types.includes(type as any)}
                          onChange={(e) => {
                            let updatedTypes: typeof newPayment.types;
                            if (e.target.checked) {
                              updatedTypes = [...newPayment.types, type as any];
                            } else {
                              updatedTypes = newPayment.types.filter(t => t !== type);
                            }

                            // 비율 자동 계산
                            const totalPercentage = calculateTotalPercentage(updatedTypes);
                            const calculatedAmount = calculateAmountFromPercentage(totalPercentage);

                            // 날짜 자동 계산
                            const autoDate = calculatePaymentDate(updatedTypes);

                            setNewPayment({
                              ...newPayment,
                              types: updatedTypes,
                              percentage: totalPercentage,
                              amount: calculatedAmount,
                              date: autoDate || newPayment.date  // 날짜가 없으면 기존 날짜 유지
                            });
                          }}
                          className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-600"
                        />
                        <span className="text-sm text-gray-900">
                          {type}
                          <span className="text-xs text-gray-500 ml-2">({percentage}%)</span>
                          {type === '계약금' && <span className="text-xs text-gray-400 ml-1">(날짜 직접 입력)</span>}
                          {type === '착수금' && <span className="text-xs text-gray-400 ml-1">(공사 시작 1주일 전)</span>}
                          {type === '중도금' && <span className="text-xs text-gray-400 ml-1">(공사 중간)</span>}
                          {type === '잔금' && <span className="text-xs text-gray-400 ml-1">(공사 종료일)</span>}
                          {type === '추가금' && <span className="text-xs text-gray-400 ml-1">(공사 종료일)</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {newPayment.types.length > 0 && (
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
                    <p className="text-xs text-gray-700">
                      선택된 구분: {newPayment.types.join(' + ')} = 총 {newPayment.percentage}%
                    </p>
                  </div>
                )}
              </div>

              {/* 결제 방법 (버튼) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  결제 방법 *
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNewPayment({ ...newPayment, method: '계좌이체' })}
                    className={`flex-1 px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
                      newPayment.method === '계좌이체'
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    계좌이체
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPayment({ ...newPayment, method: '현금' })}
                    className={`flex-1 px-4 py-3 border-2 rounded-lg font-medium transition-colors ${
                      newPayment.method === '현금'
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    현금
                  </button>
                </div>
              </div>

              {/* 퍼센트 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  계약금액 대비 비율 (%)
                </label>
                <input
                  type="number"
                  value={newPayment.percentage || ''}
                  onChange={(e) => {
                    const percentage = Number(e.target.value);
                    const calculatedAmount = calculateAmountFromPercentage(percentage);
                    setNewPayment({
                      ...newPayment,
                      percentage,
                      amount: calculatedAmount
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                  placeholder="10"
                  min="0"
                  max="100"
                />
                {selectedRecord && newPayment.percentage > 0 && (
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-700 mb-1">계산 방식</p>
                    <p className="text-xs text-gray-900">
                      총 계약금액(부가세 {selectedRecord.vatPercentage}% 포함) ₩{calculateTotalContractAmount(selectedRecord).toLocaleString()} × {newPayment.percentage}%
                    </p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      = ₩{calculateAmountFromPercentage(newPayment.percentage).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* 금액 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  입금 금액 *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={newPayment.amount || ''}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                    placeholder="5000000"
                    min="0"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {newPayment.percentage > 0
                      ? '위의 비율에 따라 자동 계산되었지만 직접 수정 가능합니다'
                      : '입금 금액을 직접 입력하세요'}
                  </p>
                </div>
              </div>

              {/* 입금일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  입금일 *
                </label>
                <input
                  type="date"
                  value={newPayment.date}
                  onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                  구분 선택 시 자동으로 날짜가 입력되며, 직접 수정 가능합니다
                </p>
              </div>

              {/* 비고 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  비고
                </label>
                <textarea
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                  placeholder="추가 메모를 입력하세요"
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setEditingPaymentIndex(null);
                }}
                className="btn btn-outline"
              >
                취소
              </button>
              <button
                onClick={handleSavePayment}
                className="btn btn-primary"
              >
                {editingPaymentIndex !== null ? '수정' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConstructionPayment;
