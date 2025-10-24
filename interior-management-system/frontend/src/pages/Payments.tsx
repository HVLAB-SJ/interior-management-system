import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import clsx from 'clsx';
import { Trash2, Smartphone, Zap } from 'lucide-react';
import PaymentRequestModal from '../components/PaymentRequestModal';
import toast from 'react-hot-toast';
import { useDataStore, type Payment } from '../store/dataStore';
import { initKakao, sendPaymentNotification } from '../utils/kakao';
import paymentService from '../services/paymentService';
import { getBankCode } from '../utils/bankCodes';

type TabStatus = 'pending' | 'completed' | 'all';

const Payments = () => {
  const { payments, loadPaymentsFromAPI, updatePaymentInAPI, addPaymentToAPI } = useDataStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabStatus>('pending');
  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Kakao SDK 초기화 및 결제 데이터 로드
  useEffect(() => {
    initKakao();
    loadPaymentsFromAPI().catch(error => {
      console.error('Failed to load payments:', error);
      toast.error('결제 요청 데이터를 불러오는데 실패했습니다');
    });
  }, [loadPaymentsFromAPI]);

  // 헤더의 + 버튼 클릭 이벤트 수신
  useEffect(() => {
    const handleHeaderAddButton = () => {
      setSelectedPayment(null);
      setShowModal(true);
    };

    window.addEventListener('headerAddButtonClick', handleHeaderAddButton);
    return () => window.removeEventListener('headerAddButtonClick', handleHeaderAddButton);
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: '대기중', color: 'bg-gray-100 text-gray-800 border-gray-300' },
      reviewing: { label: '검토중', color: 'bg-gray-100 text-gray-700 border-gray-300' },
      approved: { label: '승인됨', color: 'bg-gray-100 text-gray-800 border-gray-300' },
      rejected: { label: '거절됨', color: 'bg-gray-100 text-gray-700 border-gray-300' },
      completed: { label: '완료', color: 'bg-gray-700 text-gray-50 border-gray-700' }
    };
    const config = statusConfig[status as keyof typeof statusConfig];

    return (
      <span className={clsx('px-3 py-1 text-xs font-semibold border rounded-full', config.color)}>
        {config.label}
      </span>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig = {
      normal: { label: '보통', color: 'bg-gray-50 text-gray-600 border-gray-200' },
      urgent: { label: '긴급', color: 'bg-rose-100/60 text-rose-800 border-rose-200' },
      emergency: { label: '매우긴급', color: 'bg-rose-100/60 text-rose-800 border-rose-200' }
    };
    const config = urgencyConfig[urgency as keyof typeof urgencyConfig];

    return (
      <span className={clsx('px-2 py-1 text-xs font-semibold border rounded', config.color)}>
        {config.label}
      </span>
    );
  };

  const getCategoryLabel = (category: string) => {
    const categories = {
      material: '자재',
      labor: '인건비',
      equipment: '장비',
      transport: '운송',
      other: '기타'
    };
    return categories[category as keyof typeof categories];
  };

  const handleStatusChange = async (paymentId: string, newStatus: string) => {
    try {
      await paymentService.updatePaymentStatus(paymentId, newStatus);
      await loadPaymentsFromAPI();
      toast.success(`결제 요청 상태가 변경되었습니다`);
    } catch (error) {
      console.error('Failed to update payment status:', error);
      toast.error('상태 변경에 실패했습니다');
    }
  };

  const handleDelete = async (paymentId: string, paymentPurpose: string) => {
    if (!window.confirm(`"${paymentPurpose}" 결제 요청을 삭제하시겠습니까?\n\n삭제된 내역은 복구할 수 없습니다.`)) {
      return;
    }

    try {
      await paymentService.deletePayment(paymentId);
      await loadPaymentsFromAPI();
      toast.success('결제 요청이 삭제되었습니다');
    } catch (error) {
      console.error('Failed to delete payment:', error);
      toast.error('삭제에 실패했습니다');
    }
  };

  // 탭별 필터링
  const getFilteredPayments = () => {
    let filtered = payments;

    // 탭 필터
    if (activeTab !== 'all') {
      filtered = filtered.filter(p => p.status === activeTab);
    }

    // 검색 필터
    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.requestedBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredPayments = getFilteredPayments();

  // 통계 계산
  const stats = {
    pending: payments.filter(p => p.status === 'pending').length,
    completed: payments.filter(p => p.status === 'completed').length,
    pendingAmount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    completedAmount: payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0)
  };

  // 행 배경색
  const getRowBg = (payment: Payment) => {
    if (payment.status === 'pending' && payment.urgency === 'emergency') {
      return 'bg-gray-50 hover:bg-gray-100/70 border-gray-900';
    }
    if (payment.status === 'pending' && payment.urgency === 'urgent') {
      return 'bg-gray-50 hover:bg-gray-100/70 border-gray-200';
    }
    if (payment.status === 'completed') {
      return 'bg-gray-50 hover:bg-gray-100/70 border-gray-200';
    }
    return 'bg-white hover:bg-gray-50 border-gray-200';
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between lg:justify-start">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">결제 요청 관리</h1>
        <button
          onClick={() => {
            setSelectedPayment(null);
            setShowModal(true);
          }}
          className="hidden lg:inline-flex btn btn-primary px-4 py-2 ml-auto"
        >
          + 새 결제요청
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 md:space-x-8 overflow-x-auto">
          {[
            { id: 'pending' as TabStatus, label: '대기중', count: stats.pending, color: 'text-gray-700' },
            { id: 'completed' as TabStatus, label: '송금완료', count: stats.completed, color: 'text-gray-700' },
            { id: 'all' as TabStatus, label: '전체', count: payments.length, color: 'text-gray-600' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? `border-gray-700 ${tab.color}`
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label}
              <span className={clsx(
                'ml-1 md:ml-2 py-0.5 px-1.5 md:px-2 rounded-full text-[10px] md:text-xs font-semibold',
                activeTab === tab.id ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-600'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <input
          type="text"
          placeholder="검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
        />
      </div>

      {/* Payments Grid */}
      <div className="space-y-3 md:space-y-4">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-8 md:py-12 bg-white border border-gray-200 rounded-lg">
            <p className="text-gray-500 text-sm md:text-base">결제 요청이 없습니다</p>
          </div>
        ) : (
          filteredPayments.map((payment) => (
            <div
              key={payment.id}
              className={clsx(
                'border rounded-lg p-4 md:p-6 transition-all',
                getRowBg(payment)
              )}
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {getStatusBadge(payment.status)}
                    {getUrgencyBadge(payment.urgency)}
                  </div>

                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2 md:mb-3 break-words">
                    {payment.purpose || `${getCategoryLabel(payment.category)} 결제`}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 text-xs md:text-sm mb-3 md:mb-4">
                    <div>
                      <p className="text-gray-500">프로젝트</p>
                      <p className="font-medium text-gray-900 truncate">{payment.project}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">금액</p>
                      <p className="font-bold text-base md:text-lg text-gray-900">
                        ₩{payment.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">요청자</p>
                      <p className="font-medium text-gray-900">{payment.requestedBy}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">요청일시</p>
                      <p className="font-medium text-gray-900">
                        {format(payment.requestDate, 'yyyy.MM.dd (eee) HH:mm', { locale: ko })}
                      </p>
                    </div>
                  </div>

                  {payment.bankInfo && (
                    <div className="bg-white bg-opacity-70 border border-gray-200 rounded p-2 md:p-3 text-xs md:text-sm">
                      <p className="text-gray-500 text-[10px] md:text-xs mb-1">계좌 정보</p>
                      <p className="font-medium break-words">{payment.bankInfo.accountHolder} | {payment.bankInfo.bankName}</p>
                      <p className="text-gray-700 break-all">{payment.bankInfo.accountNumber}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-row lg:flex-col gap-2 lg:ml-6 flex-wrap lg:flex-nowrap">
                  <button
                    onClick={() => {
                      setSelectedPayment(payment);
                      setShowModal(true);
                    }}
                    className="flex-1 lg:flex-none text-xs md:text-sm px-3 md:px-4 py-2 border border-gray-300 rounded hover:bg-white whitespace-nowrap"
                  >
                    상세보기
                  </button>

                  {payment.status === 'pending' && (
                    <>
                      {/* KB 자동 송금 버튼 (무료!) */}
                      <button
                        onClick={async () => {
                          const { accountHolder, bankName, accountNumber } = payment.bankInfo || {};

                          if (!accountHolder || !accountNumber || !bankName) {
                            toast.error('계좌 정보가 없습니다');
                            return;
                          }

                          const bankCode = getBankCode(bankName);
                          if (!bankCode) {
                            toast.error('지원하지 않는 은행입니다');
                            return;
                          }

                          // 수수료 계산
                          const fee = bankCode === '004' ? 0 : 500;
                          const feeText = fee === 0 ? '(수수료 무료!)' : `(수수료 ${fee}원)`;

                          if (!window.confirm(
                            `KB은행 API로 즉시 송금하시겠습니까?\n\n` +
                            `받는분: ${accountHolder}\n` +
                            `은행: ${bankName}\n` +
                            `계좌: ${accountNumber}\n` +
                            `금액: ${payment.amount.toLocaleString()}원\n` +
                            `${feeText}`
                          )) {
                            return;
                          }

                          try {
                            const token = localStorage.getItem('token');
                            const loadingToast = toast.loading('송금 처리 중...');

                            const response = await fetch('/api/banking/kb-transfer', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({
                                paymentId: payment.id,
                                bankCode: bankCode,
                                accountNumber: accountNumber,
                                accountHolder: accountHolder,
                                amount: payment.amount,
                                purpose: payment.purpose || `${payment.project} 결제`
                              })
                            });

                            toast.dismiss(loadingToast);

                            const result = await response.json();

                            if (result.success) {
                              // 수수료 정보 포함하여 성공 메시지
                              const successMsg = result.data.fee === 0
                                ? '송금이 완료되었습니다! (수수료 무료)'
                                : `송금이 완료되었습니다 (수수료 ${result.data.fee}원)`;

                              toast.success(successMsg);
                              await loadPaymentsFromAPI();
                            } else {
                              toast.error(result.message || '송금에 실패했습니다');
                            }
                          } catch (error) {
                            console.error('KB Transfer error:', error);
                            toast.error('송금 처리 중 오류가 발생했습니다');
                          }
                        }}
                        className="flex-1 lg:flex-none text-xs md:text-sm px-3 md:px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium whitespace-nowrap flex items-center justify-center gap-1"
                        title="KB은행 자동 송금 (무료)"
                      >
                        <Zap className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        즉시송금
                      </button>

                      {/* 계좌정보 복사 버튼 (백업) */}
                      <button
                        onClick={() => {
                          const { accountHolder, bankName, accountNumber } = payment.bankInfo || {};

                          if (!accountHolder || !accountNumber) {
                            toast.error('계좌 정보가 없습니다');
                            return;
                          }

                          const copyText = `${bankName}\n${accountNumber}\n${accountHolder}\n송금액: ${payment.amount.toLocaleString()}원`;

                          if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(copyText).then(() => {
                              toast.success('계좌정보가 복사되었습니다');
                            }).catch(() => {
                              fallbackCopyTextToClipboard(copyText);
                            });
                          } else {
                            fallbackCopyTextToClipboard(copyText);
                          }

                          function fallbackCopyTextToClipboard(text: string) {
                            const textArea = document.createElement('textarea');
                            textArea.value = text;
                            textArea.style.position = 'fixed';
                            textArea.style.top = '0';
                            textArea.style.left = '0';
                            textArea.style.opacity = '0';
                            document.body.appendChild(textArea);
                            textArea.focus();
                            textArea.select();

                            try {
                              document.execCommand('copy');
                              toast.success('계좌정보가 복사되었습니다');
                            } catch (err) {
                              toast.error('계좌정보 복사 실패');
                            }

                            document.body.removeChild(textArea);
                          }
                        }}
                        className="flex-1 lg:flex-none text-xs md:text-sm px-3 md:px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 font-medium whitespace-nowrap flex items-center justify-center gap-1"
                        title="계좌정보 복사"
                      >
                        <Smartphone className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        복사
                      </button>

                      <button
                        onClick={() => handleStatusChange(payment.id, 'completed')}
                        className="flex-1 lg:flex-none text-xs md:text-sm px-3 md:px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800 font-medium whitespace-nowrap"
                      >
                        송금완료
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => handleDelete(payment.id, payment.purpose || getCategoryLabel(payment.category))}
                    className="text-xs md:text-sm px-3 md:px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 font-medium flex items-center justify-center whitespace-nowrap"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Payment Modal */}
      {showModal && (
        <PaymentRequestModal
          payment={selectedPayment}
          onClose={() => {
            setShowModal(false);
            setSelectedPayment(null);
          }}
          onSave={async (data) => {
            try {
              if (selectedPayment) {
                await updatePaymentInAPI(selectedPayment.id, {
                  project: data.projectId,
                  purpose: data.purpose,
                  process: data.process,
                  itemName: data.itemName,
                  amount: Number(data.amount),
                  category: data.category,
                  urgency: data.urgency || 'normal',
                  bankInfo: {
                    accountHolder: data.accountHolder,
                    bankName: data.bankName,
                    accountNumber: data.accountNumber
                  },
                  notes: data.notes
                });
                toast.success('결제 요청이 수정되었습니다');
              } else {
                const newPayment: Payment = {
                  id: '',
                  project: data.projectId,
                  purpose: data.purpose,
                  process: data.process,
                  itemName: data.itemName,
                  amount: Number(data.amount),
                  category: data.category,
                  status: 'pending',
                  urgency: data.urgency || 'normal',
                  requestedBy: data.requestedBy,
                  requestDate: new Date(),
                  bankInfo: {
                    accountHolder: data.accountHolder,
                    bankName: data.bankName,
                    accountNumber: data.accountNumber
                  },
                  attachments: data.attachments?.map((f: File) => f.name) || [],
                  notes: data.notes
                };

                await addPaymentToAPI(newPayment);

                // 모든 긴급도에 대해 카카오톡 알림 전송
                try {
                  await sendPaymentNotification({
                    purpose: data.purpose || `${data.category === 'material' ? '자재' : '인건비'} 결제`,
                    amount: Number(data.amount),
                    project: data.projectId,
                    requestedBy: data.requestedBy,
                    urgency: data.urgency,
                    process: data.process,
                    itemName: data.itemName
                  });
                  toast.success('결제 요청이 등록되고 카카오톡 공유 팝업이 열렸습니다.');
                } catch (kakaoError: any) {
                  console.error('Kakao notification error:', kakaoError);
                  toast.success('결제 요청이 등록되었습니다.');
                }
              }
              setShowModal(false);
              setSelectedPayment(null);
            } catch (error) {
              console.error('Payment request error:', error);
              toast.error('결제 요청 중 오류가 발생했습니다');
            }
          }}
        />
      )}
    </div>
  );
};

export default Payments;
