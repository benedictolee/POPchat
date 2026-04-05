import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 마스터 키를 가진 백엔드 전용 DB 관리자
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const paymentKey = searchParams.get('paymentKey');
  const orderId = searchParams.get('orderId');
  const amount = searchParams.get('amount');

  // 토스에서 보낸 정보가 하나라도 없으면 에러로 돌려보냄
  if (!paymentKey || !orderId || !amount) {
    return NextResponse.redirect(new URL('/?error=missing_params', req.url));
  }

  try {
    // 1. 토스 서버에 "이 결제 진짜 맞지?" 하고 최종 확인(승인) 요청
    const secretKey = "test_sk_zXLkKEypNArWmo5npnl3lmeaxYG5"; 
    const encryptedSecretKey = Buffer.from(secretKey + ':').toString('base64');

    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encryptedSecretKey}`,
        'Content-Type': 'application/json',
      },
            body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("결제 승인 실패:", data);
      return NextResponse.redirect(new URL('/?error=payment_failed', req.url));
    }

    // 2. 결제 최종 성공! DB 업데이트 진행
    // 아까 orderId에 숨겨뒀던 '전체 유저 ID'를 쏙 뽑아옵니다.
    const fullUserId = orderId.split('_')[2];

    if (fullUserId) {
      // 복잡한 검색 과정 없이, 아이디가 일치하는 사람의 데이터를 바로 업데이트합니다.
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          is_premium: true,           // 유료 유저로 전환!
          premium_max_tokens: 100000  // 토큰 한도 10만 개로 빵빵하게 충전!
        }) 
        .eq('id', fullUserId);

      if (updateError) console.error("DB 업데이트 에러:", updateError);
    }

    // 3. 모든 작업이 끝나면 유저를 다시 앱 메인 화면으로 돌려보냅니다.
    return NextResponse.redirect(new URL('/?payment=success', req.url));

  } catch (error) {
    console.error('결제 처리 에러:', error);
    return NextResponse.redirect(new URL('/?error=server_error', req.url));
  }
}
 
