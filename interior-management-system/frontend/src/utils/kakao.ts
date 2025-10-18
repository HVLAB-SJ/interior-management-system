// Kakao SDK 타입 정의
declare global {
  interface Window {
    Kakao: any;
  }
}

const KAKAO_JS_KEY = '7fd4a25ef373dbe1ca62ba332973053d';

// Kakao SDK 초기화
export const initKakao = () => {
  if (window.Kakao && !window.Kakao.isInitialized()) {
    window.Kakao.init(KAKAO_JS_KEY);
    console.log('Kakao SDK initialized:', window.Kakao.isInitialized());
  }
};

// 결제 요청 알림 전송
export const sendPaymentNotification = async (params: {
  purpose: string;
  amount: number;
  project: string;
  requestedBy: string;
  urgency: string;
  process?: string;
  itemName?: string;
}) => {
  try {
    // Kakao SDK 초기화 확인
    if (!window.Kakao || !window.Kakao.isInitialized()) {
      initKakao();
    }

    // Kakao SDK가 제대로 로드되었는지 확인
    if (!window.Kakao || !window.Kakao.Share) {
      throw new Error('Kakao SDK가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
    }

    const urgencyLabel = params.urgency === 'urgent' ? '🚨 긴급' : '보통';
    const urgencyPrefix = params.urgency === 'urgent' ? '🚨🚨 긴급 결제 요청 🚨🚨\n' : '';

    const message = `
${urgencyPrefix}${urgencyLabel} 결제 요청

요청자: ${params.requestedBy}
프로젝트: ${params.project}
${params.process ? `공정: ${params.process}` : ''}
${params.itemName ? `항목명: ${params.itemName}` : ''}
금액: ${params.amount.toLocaleString()}원

${params.urgency === 'urgent' ? '☎️ 전화 알림이 발송됩니다!' : ''}
    `.trim();

    // 나에게 보내기 API 호출
    return new Promise((resolve, reject) => {
      try {
        // 긴급도에 따른 버튼 텍스트
        const buttonTitle = params.urgency === 'urgent' ? '🚨 긴급 확인하기' : '결제 확인하기';

        window.Kakao.Share.sendDefault({
          objectType: 'text',
          text: message,
          link: {
            mobileWebUrl: window.location.origin,
            webUrl: window.location.origin,
          },
          buttons: [
            {
              title: buttonTitle,
              link: {
                mobileWebUrl: `${window.location.origin}/payments`,
                webUrl: `${window.location.origin}/payments`,
              },
            },
          ],
        });

        // 카카오 공유 팝업이 열리면 성공으로 간주
        console.log('Kakao share popup opened successfully');
        resolve(true);
      } catch (shareError) {
        console.error('Kakao Share API error:', shareError);
        reject(new Error('카카오 공유하기 팝업을 여는 중 오류가 발생했습니다.'));
      }
    });
  } catch (error) {
    console.error('Failed to send Kakao notification:', error);
    throw error;
  }
};

// 카카오 로그인 상태 확인
export const checkKakaoLogin = () => {
  if (!window.Kakao || !window.Kakao.isInitialized()) {
    initKakao();
  }

  return window.Kakao.Auth && window.Kakao.Auth.getAccessToken();
};

// 카카오 로그인
export const loginKakao = () => {
  return new Promise((resolve, reject) => {
    if (!window.Kakao || !window.Kakao.isInitialized()) {
      initKakao();
    }

    window.Kakao.Auth.login({
      success: (authObj: any) => {
        console.log('Kakao login success:', authObj);
        resolve(authObj);
      },
      fail: (err: any) => {
        console.error('Kakao login failed:', err);
        reject(err);
      },
    });
  });
};
