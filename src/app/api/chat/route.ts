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
    const { message, context, language, customPrompt } = await req.json();
    if (!message) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    let systemParts = '';
    if (customPrompt) systemParts += customPrompt + '\n';
    if (language && langMap[language]) systemParts += langMap[language] + '\n';

    let prompt = '';
    if (systemParts) prompt += systemParts + '\n';
    if (context) prompt += `이전 대화 맥락:\n${context}\n\n`;
    prompt += message;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 4096 },
    });

    return NextResponse.json({ answer: result.response.text() });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'AI 응답 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
