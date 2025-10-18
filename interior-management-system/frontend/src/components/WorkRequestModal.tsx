import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useDataStore } from '../store/dataStore';
import { useAuth } from '../contexts/AuthContext';

interface WorkRequestModalProps {
  request: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

const TEAM_MEMBERS = ['상준', '신애', '재천', '민기', '재성', '재현', '디자인팀', '현장팀'];

const WorkRequestModal = ({ request, onClose, onSave }: WorkRequestModalProps) => {
  const { projects } = useDataStore();
  const { user } = useAuth();
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm();
  const [isUrgent, setIsUrgent] = useState(request?.priority === 'high');
  const [customRequestType, setCustomRequestType] = useState('');
  const selectedRequestType = watch('requestType');

  useEffect(() => {
    setIsUrgent(request?.priority === 'high');
    // 새 요청일 경우 로그인한 사용자를 요청자로 설정
    if (!request && user?.name) {
      setValue('requestedBy', user.name);
    }
  }, [request, user, setValue]);

  const onSubmit = (data: any) => {
    const formData = {
      ...data,
      requestType: data.requestType === '직접입력' ? customRequestType : data.requestType,
      requestDate: new Date(data.requestDate),
      dueDate: new Date(data.dueDate),
      status: request?.status || 'pending',
      priority: isUrgent ? 'high' : 'medium',
      completedDate: data.completedDate ? new Date(data.completedDate) : undefined,
    };
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
          <h2 className="text-xl font-semibold">
            {request ? '업무요청 수정' : '새 업무요청'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              프로젝트 *
            </label>
            <select
              {...register('project', { required: '프로젝트를 선택하세요' })}
              defaultValue={request?.project || ''}
              className="input w-full"
            >
              <option value="">프로젝트를 선택하세요</option>
              {projects
                .filter(project => project.status !== 'completed')
                .map((project) => (
                  <option key={project.id} value={project.name}>
                    {project.name}
                  </option>
                ))}
            </select>
            {errors.project && (
              <p className="mt-1 text-sm text-red-600">{String(errors.project.message)}</p>
            )}
          </div>

          {/* Request Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              요청유형 *
            </label>
            <select
              {...register('requestType', { required: '요청유형을 선택하세요' })}
              defaultValue={request?.requestType}
              className="input w-full"
            >
              <option value="">선택하세요</option>
              <option value="3D모델링">3D모델링</option>
              <option value="철거도면">철거도면</option>
              <option value="설비도면">설비도면</option>
              <option value="에어컨 배치도">에어컨 배치도</option>
              <option value="디퓨저 배치도">디퓨저 배치도</option>
              <option value="스프링클러 배치도">스프링클러 배치도</option>
              <option value="전기도면">전기도면</option>
              <option value="목공도면">목공도면</option>
              <option value="디테일도면">디테일도면</option>
              <option value="금속도면">금속도면</option>
              <option value="가구도면">가구도면</option>
              <option value="세라믹도면">세라믹도면</option>
              <option value="트렌치유가">트렌치유가</option>
              <option value="욕실장">욕실장</option>
              <option value="발주">발주</option>
              <option value="마감">마감</option>
              <option value="직접입력">직접입력</option>
            </select>
            {errors.requestType && (
              <p className="mt-1 text-sm text-red-600">{String(errors.requestType.message)}</p>
            )}

            {/* Custom Request Type Input */}
            {selectedRequestType === '직접입력' && (
              <input
                type="text"
                value={customRequestType}
                onChange={(e) => setCustomRequestType(e.target.value)}
                placeholder="요청유형을 직접 입력하세요"
                className="input w-full mt-2"
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              요청내용
            </label>
            <textarea
              {...register('description')}
              defaultValue={request?.description}
              rows={4}
              className="input w-full"
              placeholder="상세한 요청 내용을 입력하세요"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                요청일 *
              </label>
              <input
                {...register('requestDate', { required: '요청일을 선택하세요' })}
                type="date"
                defaultValue={request?.requestDate ? format(request.requestDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
                className="input w-full"
                style={{ position: 'relative' }}
              />
              {errors.requestDate && (
                <p className="mt-1 text-sm text-red-600">{String(errors.requestDate.message)}</p>
              )}
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                마감일 *
              </label>
              <input
                {...register('dueDate', { required: '마감일을 선택하세요' })}
                type="date"
                defaultValue={request?.dueDate ? format(request.dueDate, 'yyyy-MM-dd') : format(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')}
                className="input w-full"
                style={{ position: 'relative' }}
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-600">{String(errors.dueDate.message)}</p>
              )}
            </div>
          </div>

          {/* People */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                요청자 *
              </label>
              <select
                {...register('requestedBy', { required: '요청자를 선택하세요' })}
                defaultValue={request?.requestedBy || ''}
                className="input w-full"
              >
                <option value="">선택하세요</option>
                {TEAM_MEMBERS.map((member) => (
                  <option key={member} value={member}>
                    {member}
                  </option>
                ))}
              </select>
              {errors.requestedBy && (
                <p className="mt-1 text-sm text-red-600">{String(errors.requestedBy.message)}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                담당자 *
              </label>
              <select
                {...register('assignedTo', { required: '담당자를 선택하세요' })}
                defaultValue={request?.assignedTo || ''}
                className="input w-full"
              >
                <option value="">선택하세요</option>
                {TEAM_MEMBERS.map((member) => (
                  <option key={member} value={member}>
                    {member}
                  </option>
                ))}
              </select>
              {errors.assignedTo && (
                <p className="mt-1 text-sm text-red-600">{String(errors.assignedTo.message)}</p>
              )}
            </div>
          </div>

          {/* Urgent Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setIsUrgent(!isUrgent)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all w-full ${
                isUrgent
                  ? 'bg-rose-50 border-rose-500 text-rose-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <AlertCircle className={`h-5 w-5 ${isUrgent ? 'text-rose-600' : 'text-gray-400'}`} />
              <span className="font-medium">
                {isUrgent ? '긴급 업무입니다' : '긴급 업무로 표시'}
              </span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
            >
              취소
            </button>
            <button type="submit" className="btn btn-primary">
              {request ? '수정' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkRequestModal;
