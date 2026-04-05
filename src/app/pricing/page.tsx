// src/app/pricing/page.tsx
'use client';

import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();

  // 임시 결제 버튼 함수 (다음 단계에서 토스 로직이 들어갈 자리입니다)
  const handlePayment = (plan: 'basic' | 'pro', price: number) => {
    alert(`${plan} 요금제(${price}원) 결제 준비 중! (토스 연동 예정)`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      
      {/* 헤더 섹션 */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          과제 몰아치는 날, 흐름 끊기지 마세요.
        </h2>
        <p className="mt-4 text-xl text-gray-600">
          오늘 한도를 다 썼다면? <span className="font-bold text-blue-600">최대 7일 치 한도를 미리 당겨 쓰는 '유연 사용'</span> 기능이 제공됩니다.
        </p>
      </div>

      {/* 요금제 카드 컨테이너 */}
      <div className="mt-8 max-w-4xl w-full mx-auto grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
        
        {/* 1. 베이직 요금제 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">베이직 (Basic)</h3>
            <p className="mt-4 flex items-baseline text-gray-900">
              <span className="text-4xl font-extrabold tracking-tight">₩9,900</span>
              <span className="ml-1 text-xl font-semibold">/월</span>
            </p>
            <p className="mt-6 text-gray-500">가벼운 개념 질문과 일상적인 코드 리뷰에 적합합니다.</p>
            <ul className="mt-6 space-y-4">
              <li className="flex">
                <span className="text-green-500 mr-3">✔️</span>
                <span className="text-gray-700">일일 기본 제공: <b>25,000 토큰</b></span>
              </li>
              <li className="flex">
                <span className="text-green-500 mr-3">✔️</span>
                <span className="text-gray-700">주간 당겨쓰기: <b>최대 175,000 토큰</b></span>
              </li>
              <li className="flex">
                <span className="text-green-500 mr-3">✔️</span>
                <span className="text-gray-700">모든 고급 AI 모드 지원</span>
              </li>
            </ul>
          </div>
          <button
            onClick={() => handlePayment('basic', 9900)}
            className="mt-8 block w-full bg-blue-50 text-blue-700 border border-transparent rounded-lg py-3 px-4 text-center font-semibold hover:bg-blue-100 transition-colors"
          >
            베이직 시작하기
          </button>
        </div>

        {/* 2. 프로 요금제 카드 (하이라이트) */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-500 p-8 flex flex-col justify-between relative transform scale-105">
          {/* 뱃지 */}
          <div className="absolute top-0 right-6 transform -translate-y-1/2">
            <span className="bg-blue-500 text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
              BEST 선택
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">프로 (Pro)</h3>
            <p className="mt-4 flex items-baseline text-gray-900">
              <span className="text-4xl font-extrabold tracking-tight">₩14,900</span>
              <span className="ml-1 text-xl font-semibold">/월</span>
            </p>
            <p className="mt-6 text-gray-500">방대한 전공 서적 분석과 하드코어 코딩 과제에 필수적입니다.</p>
            <ul className="mt-6 space-y-4">
              <li className="flex">
                <span className="text-green-500 mr-3">✔️</span>
                <span className="text-gray-700">일일 기본 제공: <b>50,000 토큰</b> (베이직의 2배)</span>
              </li>
              <li className="flex">
                <span className="text-green-500 mr-3">✔️</span>
                <span className="text-gray-700">주간 당겨쓰기: <b>최대 350,000 토큰</b></span>
              </li>
              <li className="flex">
                <span className="text-green-500 mr-3">✔️</span>
                <span className="text-gray-700">복잡한 수식 및 논문 해석 특화</span>
              </li>
            </ul>
          </div>
          <button
            onClick={() => handlePayment('pro', 14900)}
            className="mt-8 block w-full bg-blue-600 text-white border border-transparent rounded-lg py-3 px-4 text-center font-semibold hover:bg-blue-700 transition-colors shadow-md"
          >
            프로 시작하기
          </button>
        </div>

      </div>

      {/* 돌아가기 버튼 */}
      <button 
        onClick={() => router.back()} 
        className="mt-12 text-gray-500 hover:text-gray-800 underline"
      >
        채팅창으로 돌아가기
      </button>

    </div>
  );
}
