import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
// 👇 1. 기존 프론트엔드용 supabase 대신, 직접 만들 수 있게 툴을 가져옵니다.
import { createClient } from '@supabase/supabase-js'; 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 🚨 2. 백엔드 전용 '마스터 키'를 장착한 어드민 클라이언트를 생성합니다.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

// ... (중간 코드 동일) ...


const langMap: Record<string, string> = {
  ko: '한국어로 답변해주세요.',
  en: 'Please answer in English.',
  zh: '请用中文回答。',
  ja: '日本語で答えてください。',
};

export async function POST(req: NextRequest) {
  try {
    const { message, context, language, customPrompt, image, aiMode, userId, isPremium } = await req.json();
        
    
    if (userId) {
      const today = new Date().toLocaleDateString('en-CA');
      
      // 1. 유저의 진짜 요금제와 오늘 사용량을 마스터 키로 몰래 조회합니다.
      const { data: profile } = await supabaseAdmin.from('profiles').select('is_premium, premium_max_tokens').eq('id', userId).single();
      const { data: usage } = await supabaseAdmin.from('daily_usage').select('*').eq('user_id', userId).eq('date', today).single();

      if (profile && usage) {
        // 2. 무료 유저 컷!
        if (!profile.is_premium) {
          if (aiMode === 'flash' && usage.flash_count >= 30) return NextResponse.json({ error: "오늘 무료 횟수를 모두 소진했습니다." }, { status: 403 });
          if (aiMode === 'thinking' && usage.thinking_count >= 1) return NextResponse.json({ error: "오늘 무료 횟수를 모두 소진했습니다. 업그레이드 해주세요!" }, { status: 403 });
          if (aiMode === 'pro' && usage.pro_count >= 1) return NextResponse.json({ error: "오늘 무료 횟수를 모두 소진했습니다. 업그레이드 해주세요!" }, { status: 403 });
        } 
        // 3. 유료 유저 컷! (토큰 잔액 검사)
        else {
          if (usage.used_tokens >= profile.premium_max_tokens) {
            return NextResponse.json({ error: "토큰 한도를 초과했습니다. 충전이 필요합니다." }, { status: 403 });
          }
        }
      }
    }


    
    if (!message && !image) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 });
    }

    let modelName = 'gemini-2.5-flash' ; 
    
    if (aiMode === 'thinking') {
      modelName = 'gemini-3-flash-preview'; 
    } else if (aiMode === 'pro') {
      modelName = 'gemini-3.1-pro-preview' ; 
    }

    const model = genAI.getGenerativeModel({ model: modelName });
 
    let systemParts = '';
    if (customPrompt) systemParts += customPrompt + '\n';
    if (language && langMap[language]) systemParts += langMap[language] + '\n';

    let prompt = '';
    if (systemParts) prompt += systemParts + '\n';
    if (context) prompt += `이전 대화 맥락:\n${context}\n\n`;
    if (message) prompt += message;

    const parts: any[] = [{ text: prompt || '이 손글씨/수식을 읽고 답변해주세요.' }];

    if (image) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: base64Data,
        },
      });
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 4096 },
    });

    const text = result.response.text();
    
    // 🚨 [핵심 수정 부분 1] 구글 API가 알려주는 '진짜 토큰 사용량'을 뽑아옵니다.
    const actualTokens = result.response.usageMetadata?.totalTokenCount || 0;

    if (userId) {
      const today = new Date().toLocaleDateString('en-CA');
      const { data: usageData } = await supabaseAdmin.from('daily_usage').select('*').eq('user_id', userId).eq('date', today).single();

      if (usageData) {
        let updateData: any = {};
        
        if (!isPremium) {
          // 무료 유저: 사용 횟수 1씩 증가
          if (aiMode === 'flash') updateData.flash_count = usageData.flash_count + 1;
          if (aiMode === 'thinking') updateData.thinking_count = usageData.thinking_count + 1;
          if (aiMode === 'pro') updateData.pro_count = usageData.pro_count + 1;
        } else {
          // 🚨 [핵심 수정 부분 2] 유료 유저는 이제 25, 50이 아니라 '실제로 쓴 토큰량'을 더해줍니다!
          if (aiMode === 'thinking' || aiMode === 'pro') {
            updateData.used_tokens = usageData.used_tokens + actualTokens;
          }
        }

        if (Object.keys(updateData).length > 0) {
          await supabaseAdmin.from('daily_usage').update(updateData).eq('id', usageData.id);
        }
      }
    }

    // 프론트엔드로 최종 답변 보내기
    return NextResponse.json({ answer: text });
    
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'AI 응답 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
