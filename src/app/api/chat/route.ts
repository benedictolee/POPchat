import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const langMap: Record<string, string> = {
  ko: '한국어로 답변해주세요.',
  en: 'Please answer in English.',
  zh: '请用中文回答。',
  ja: '日本語で答えてください。',
};

export async function POST(req: NextRequest) {
  try {
    const { message, context, language, customPrompt, image } = await req.json();
    if (!message && !image) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

    return NextResponse.json({ answer: result.response.text() });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'AI 응답 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 
