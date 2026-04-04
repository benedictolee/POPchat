import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from "@/utils/supabase"; // 🚨 1. Supabase 불러오기 추가!

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const langMap: Record<string, string> = {
  ko: '한국어로 답변해주세요.',
  en: 'Please answer in English.',
  zh: '请用中文回答。',
  ja: '日本語で答えてください。',
};

export async function POST(req: NextRequest) {
  try {
    // 🚨 2. 프론트에서 보낸 userId와 isPremium도 같이 받아오기!
    const { message, context, language, customPrompt, image, aiMode, userId, isPremium } = await req.json();
    
    if (!message && !image) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 });
    }

    // aiMode 값에 따라 진짜 모델 이름 매핑하기
    // (참고: 만약 구글 API에서 3.0 버전을 찾을 수 없다는 에러가 나면 2.5로 숫자를 낮춰주세요!)
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

    // 🚨 3. AI 답변이 무사히 생성되었으므로, DB 사용량 숫자를 올립니다! 🚨
    if (userId) {
      const today = new Date().toLocaleDateString('en-CA');
      const { data: usageData } = await supabase.from('daily_usage').select('*').eq('user_id', userId).eq('date', today).single();

      if (usageData) {
        let updateData: any = {};
        
        if (!isPremium) {
          // 무료 유저: 사용 횟수 1씩 증가
          if (aiMode === 'flash') updateData.flash_count = usageData.flash_count + 1;
          if (aiMode === 'thinking') updateData.thinking_count = usageData.thinking_count + 1;
          if (aiMode === 'pro') updateData.pro_count = usageData.pro_count + 1;
        } else {
          // 유료 유저: 모델에 따라 토큰 차감
          if (aiMode === 'thinking') updateData.used_tokens = usageData.used_tokens + 50;
          if (aiMode === 'pro') updateData.used_tokens = usageData.used_tokens + 25;
        }

        if (Object.keys(updateData).length > 0) {
          await supabase.from('daily_usage').update(updateData).eq('id', usageData.id);
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
