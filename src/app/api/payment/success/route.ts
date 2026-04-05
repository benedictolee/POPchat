// src/app/api/payment/success/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 마스터 키 장착! (DB 업데이트용)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function GET(request: Request) {
  // 1. 토스가 URL에 달아서 보내준 데이터들(영수증)을 꺼냅니다.
  const { searchParams } = new URL(request.url);
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');
  const plan = searchParams.get('plan');     // basic 또는 pro
  const userId = searchParams.get('userId'); // 프론트에서 보낸 유저 ID

  // 토스에서 보낸 정보가 하나라도 없으면 에러로 돌려보냄
  if (!paymentKey || !orderId || !amount) {
    return NextResponse.redirect(new URL('/?error=missing_params', request.url));
  }

  // 🚨 재권님의 실제 토스 시크릿 키 장착 완료!
  const SECRET_KEY = "test_sk_nRQoOaPz8LLw5MexQka98y47BMw6";
  
  // 토스 서버 통신을 위한 암호화 세팅 (Basic Auth)
  const basicToken = Buffer.from(`${SECRET_KEY}:`, 'utf-8').toString('base64');

  try {
    // 2. 토스 본섭에 "이 영수증 진짜 맞아? 승인해줘!" 하고 찌릅니다.
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        paymentKey, 
        orderId, 
        amount: Number(amount) 
      }),
    });

    if (!response.ok) {
      console.error('토스 결제 승인 실패');
      // 승인 실패 시 메인 화면으로 튕겨냅니다.
      return NextResponse.redirect(new URL('/?error=payment_failed', request.url));
    }

    // 3. 승인이 떨어졌다면? 유저 DB에 빵빵하게 토큰 충전!
    if (userId) {
      // 💡 [핵심] plan이 'pro'면 35만, 아니면 17.5만 토큰 셋팅!
      const maxTokens = plan === 'pro' ? 350000 : 175000;
      
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          is_premium: true,
          premium_max_tokens: maxTokens
        })
        .eq('id', userId);
        
      if (updateError) console.error("DB 업데이트 에러:", updateError);
    }

    // 4. 모든 게 완벽하게 끝났으니, 다시 앱 메인(채팅창)으로 리다이렉트!
    return NextResponse.redirect(new URL('/?payment=success', request.url));

  } catch (error) {
    console.error('Payment Error:', error);
    return NextResponse.redirect(new URL('/?error=server_error', request.url));
  }
}
