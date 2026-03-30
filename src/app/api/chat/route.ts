import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const { message, context } = await req.json();
    if (!message) {
      return NextResponse.json({ error: '메시지를 입력해주세요.' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    let prompt = message;
    if (context) {
      prompt = `이전 대화 맥락:\n${context}\n\n현재 질문: ${message}`;
    }

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
