import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import type { Project } from '../store/dataStore';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

const TEAM_MEMBERS = ['상준', '신애', '재천', '민기', '재성', '재현'];

const ProjectModal = ({ project, onClose, onSave }: ProjectModalProps) => {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
  const [customManager, setCustomManager] = useState('');

  useEffect(() => {
    if (project) {
      setValue('name', project.name);
      setValue('client', project.client);
      setValue('location', project.location);
      if (project.startDate) {
        setValue('startDate', project.startDate.toISOString().split('T')[0]);
      }
      if (project.endDate) {
        setValue('endDate', project.endDate.toISOString().split('T')[0]);
      }
      // Parse manager field if it contains multiple managers
      // Filter out "미지정" (unassigned) entries
      const managers = project.manager
        ? project.manager.split(',').map(m => m.trim()).filter(m => m && m !== '미지정')
        : [];
      setSelectedManagers(managers);
    } else {
      // Reset when creating new project
      setSelectedManagers([]);
    }
  }, [project, setValue]);

  const toggleManager = (name: string) => {
    setSelectedManagers(prev =>
      prev.includes(name)
        ? prev.filter(m => m !== name)
        : [...prev, name]
    );
  };

  const addCustomManager = () => {
    if (customManager.trim() && !selectedManagers.includes(customManager.trim())) {
      setSelectedManagers(prev => [...prev, customManager.trim()]);
      setCustomManager('');
    }
  };

  const removeManager = (name: string) => {
    setSelectedManagers(prev => prev.filter(m => m !== name));
  };

  const onSubmit = (data: any) => {
    const formData: any = {
      name: data.name,
      client: data.client,
      location: data.location,
      manager: selectedManagers.join(', '),
      // Keep existing values when editing, use defaults when creating new
      contractAmount: project?.contractAmount ?? 0,
      spent: project?.spent ?? 0,
      status: project?.status ?? 'planning',
      progress: project?.progress ?? 0,
      description: project?.description ?? '',
      // Don't send team field - it will be derived from manager and fieldManagers on backend
      meetingNotes: (project as any)?.meetingNotes ?? [],
      customerRequests: (project as any)?.customerRequests ?? [],
      entrancePassword: (project as any)?.entrancePassword ?? '',
      sitePassword: (project as any)?.sitePassword ?? ''
    };

    // Only add dates if they exist
    if (data.startDate) {
      formData.startDate = new Date(data.startDate);
    }
    if (data.endDate) {
      formData.endDate = new Date(data.endDate);
    }

    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 md:p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg md:text-xl font-semibold">
            {project ? '프로젝트 수정' : '새 프로젝트'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              프로젝트명 *
            </label>
            <input
              {...register('name', { required: '프로젝트명을 입력하세요' })}
              type="text"
              className="input"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{String(errors.name.message)}</p>
            )}
          </div>

          {/* Client & Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                고객명
              </label>
              <input
                {...register('client')}
                type="text"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                위치 *
              </label>
              <input
                {...register('location', { required: '위치를 입력하세요' })}
                type="text"
                className="input"
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{String(errors.location.message)}</p>
              )}
            </div>
          </div>


          {/* Start & End Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작일
              </label>
              <input
                {...register('startDate')}
                type="date"
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료일
              </label>
              <input
                {...register('endDate')}
                type="date"
                className="input"
              />
            </div>
          </div>

          {/* Manager - Multiple Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              담당자 (중복 선택 가능)
            </label>

            {/* 기본 팀원 버튼 및 선택된 커스텀 멤버 */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {/* 기본 팀원 버튼 */}
              {TEAM_MEMBERS.map((member) => (
                <button
                  key={member}
                  type="button"
                  onClick={() => toggleManager(member)}
                  className={`px-2.5 py-1.5 rounded border transition-colors text-sm ${
                    selectedManagers.includes(member)
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {member}
                </button>
              ))}

              {/* 커스텀 멤버 버튼 (기본 팀원이 아닌 선택된 멤버들) */}
              {selectedManagers
                .filter(member => !TEAM_MEMBERS.includes(member))
                .map((member) => (
                  <button
                    key={member}
                    type="button"
                    onClick={() => removeManager(member)}
                    className="px-2.5 py-1.5 rounded border transition-colors text-sm bg-gray-900 text-white border-gray-900 hover:bg-gray-800"
                  >
                    {member} ×
                  </button>
                ))
              }
            </div>

            {/* 직접 입력 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customManager}
                onChange={(e) => setCustomManager(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomManager();
                  }
                }}
                placeholder="담당자 이름 직접 입력"
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
              <button
                type="button"
                onClick={addCustomManager}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
              >
                추가
              </button>
            </div>
          </div>


          {/* Actions */}
          <div className="flex justify-end space-x-2 md:space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline text-sm md:text-base"
            >
              취소
            </button>
            <button
              type="submit"
              className="btn btn-primary text-sm md:text-base"
            >
              {project ? '수정' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;
