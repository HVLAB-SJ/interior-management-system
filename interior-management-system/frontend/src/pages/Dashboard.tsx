import { format, isToday, isFuture } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useDataStore } from '../store/dataStore';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock } from 'lucide-react';

const ALL_TEAM_MEMBERS = ['상준', '신애', '재천', '민기', '재성', '재현'];

const Dashboard = () => {
  const { schedules } = useDataStore();
  const { user } = useAuth();

  // 사용자 이름에서 성 제거 (마지막 2글자만 사용)
  // 예: "김상준" → "상준", "상준" → "상준"
  const userNameWithoutSurname = user?.name ? user.name.slice(-2) : null;

  // 로그인한 사용자를 맨 앞으로 정렬
  const TEAM_MEMBERS = userNameWithoutSurname
    ? [userNameWithoutSurname, ...ALL_TEAM_MEMBERS.filter(member => member !== userNameWithoutSurname)]
    : ALL_TEAM_MEMBERS;

  // 각 사람별 일정 계산
  const getMemberSchedules = (member: string) => {
    const memberSchedules = schedules.filter(schedule =>
      schedule.attendees && schedule.attendees.includes(member)
    );

    const todaySchedules = memberSchedules.filter(s => isToday(new Date(s.start)));
    const upcomingSchedules = memberSchedules
      .filter(s => isFuture(new Date(s.start)) && !isToday(new Date(s.start)))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 3);

    return { todaySchedules, upcomingSchedules, member };
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">담당업무</h1>
      </div>

      {/* 사람별 할일 섹션 */}
      <div>
        <h2 className="hidden md:block text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">담당자별 할일</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {TEAM_MEMBERS.map((member) => {
            const { todaySchedules, upcomingSchedules } = getMemberSchedules(member);
            const totalTasks = todaySchedules.length + upcomingSchedules.length;

            return (
              <div key={member} className="card p-4 md:p-5">
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                  <h3 className="font-bold text-lg md:text-xl text-gray-900">{member}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs md:text-sm px-2.5 md:px-3 py-1 md:py-1.5 bg-gray-100 text-gray-900 rounded-full font-semibold whitespace-nowrap">
                      {todaySchedules.length} 오늘
                    </span>
                    <span className="text-xs md:text-sm px-2.5 md:px-3 py-1 md:py-1.5 bg-gray-100 text-gray-700 rounded-full font-semibold whitespace-nowrap">
                      {upcomingSchedules.length} 예정
                    </span>
                  </div>
                </div>

                {/* 오늘의 일정 */}
                {todaySchedules.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                      <Calendar className="h-4 w-4 md:h-5 md:w-5 text-gray-900" />
                      <p className="text-xs md:text-sm font-semibold text-gray-900 uppercase">오늘</p>
                    </div>
                    <div className="space-y-2 md:space-y-3">
                      {todaySchedules.map((schedule) => (
                        <div key={schedule.id} className="border-l-3 border-gray-900 pl-3 md:pl-4 py-2 md:py-3 bg-gray-50 rounded-r">
                          <p className="font-medium text-gray-900 text-sm md:text-base leading-relaxed">
                            <span className="text-gray-600">[{schedule.project || '-'}]</span> {schedule.title}
                            {schedule.attendees && schedule.attendees.length > 1 && (
                              <span className="text-gray-500 ml-2">
                                ({schedule.attendees.filter(a => a !== member).join(', ')})
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 다가오는 일정 */}
                {upcomingSchedules.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                      <Clock className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
                      <p className="text-xs md:text-sm font-semibold text-gray-600 uppercase">예정</p>
                    </div>
                    <div className="space-y-2 md:space-y-3">
                      {upcomingSchedules.map((schedule) => (
                        <div key={schedule.id} className="border-l-3 border-gray-400 pl-3 md:pl-4 py-2 md:py-3 bg-gray-50 rounded-r">
                          <div className="flex items-start justify-between gap-2 md:gap-3">
                            <p className="font-medium text-gray-900 text-sm md:text-base leading-relaxed flex-1">
                              <span className="text-gray-600">[{schedule.project || '-'}]</span> {schedule.title}
                              {schedule.attendees && schedule.attendees.length > 1 && (
                                <span className="text-gray-500 ml-2">
                                  ({schedule.attendees.filter(a => a !== member).join(', ')})
                                </span>
                              )}
                            </p>
                            <p className="text-xs md:text-sm text-gray-500 whitespace-nowrap flex-shrink-0">
                              {format(new Date(schedule.start), 'MM.dd', { locale: ko })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 일정이 없을 때 */}
                {totalTasks === 0 && (
                  <div className="text-center py-8 md:py-10 text-gray-400 text-sm md:text-base">
                    예정된 일정이 없습니다
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
