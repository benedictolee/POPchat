// src/app/pricing/page.tsx
'use client';

import { useRouter } from 'next/navigation';
// 👇 1. 토스 결제창을 띄우기 위한 패키지를 불러옵니다.
import { loadTossPayments } from '@tosspayments/payment-sdk';

export default function PricingPage() {
  const router = useRouter();

  // 👇 2. 진짜 결제를 실행하는 핵심 함수! (베이직/프로에 따라 amount와 planName이 다르게 들어옵니다)
  const handlePayment = async (plan: 'basic' | 'pro', price: number) => {
    try {
      // 본인의 토스 '클라이언트 키(Client Key)'를 넣으세요. (기존에 쓰시던 test_ck_... 키)
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_ck_본인키를여기에넣으세요'; 
      const tossPayments = await loadTossPayments(clientKey);

      // 상품 이름 정하기
      const orderName = plan === 'pro' ? 'POPchat 프로 요금제 (50,000토큰)' : 'POPchat 베이직 요금제 (25,000토큰)';
      
      // 결제창 띄우기!
      await tossPayments.requestPayment('카드', {
        amount: price, // 버튼에 따라 9900 또는 14900이 들어갑니다.
        orderId: `order_${Math.random().toString(36).substring(2, 10)}`, // 주문 고유 번호 (랜덤 생성)
        orderName: orderName,
        customerName: 'POPchat 유저', // (선택) 유저 이름
        
        // 🚨 중요: 결제 성공/실패 후 돌아갈 주소! 
        // 기존에 결제 처리하시던 success 주소로 맞춰주세요. (보통 도메인 + /api/payment/success 형태입니다)
        successUrl: `${window.location.origin}/payment/success?plan=${plan}`, 
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (error) {
      console.error('결제창 호출 중 오류 발생:', error);
      alert('결제창을 띄우는 데 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      
      {/* ... (이하 헤더 및 UI 코드는 이전과 100% 동일하게 유지합니다) ... */}
      
      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
          과제 몰아치는 날, 흐름 끊기지 마세요.
        </h2>
        {/* ... 생략 ... */}
      </div>

      <div className="mt-8 max-w-4xl w-full mx-auto grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8">
        
        {/* 베이직 요금제 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col justify-between">
          {/* ... UI 생략 ... */}
          <button
            onClick={() => handlePayment('basic', 9900)} // 👈 베이직 버튼 누르면 9900원 결제!
            className="mt-8 block w-full bg-blue-50 text-blue-700 border border-transparent rounded-lg py-3 px-4 text-center font-semibold hover:bg-blue-100 transition-colors"
          >
            베이직 시작하기
          </button>
        </div>

        {/* 프로 요금제 카드 */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-500 p-8 flex flex-col justify-between relative transform scale-105">
          {/* ... UI 생략 ... */}
          <button
            onClick={() => handlePayment('pro', 14900)} // 👈 프로 버튼 누르면 14900원 결제!
            className="mt-8 block w-full bg-blue-600 text-white border border-transparent rounded-lg py-3 px-4 text-center font-semibold hover:bg-blue-700 transition-colors shadow-md"
          >
            프로 시작하기
          </button>
        </div>

      </div>

      <button onClick={() => router.back()} className="mt-12 text-gray-500 hover:text-gray-800 underline">
        채팅창으로 돌아가기
      </button>

    </div>
  );
}
