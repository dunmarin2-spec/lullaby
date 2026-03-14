import { Buffer } from 'buffer';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  // 형님이 주신 '무조건 성공하는' 목소리 ID
  const FIXED_VOICE_ID = "0oqpliV6dVSr9XomngOW"; 

  try {
    // 1. 녹음 데이터는 일단 받지만, 복제(Cloning)는 건너뜁니다! (에러 원천 차단)
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }

    console.log("🚀 복제 공정 건너뜀! 고정 ID로 자장가 생성 시작...");

    // 2. 바로 자장가 생성 (TTS) 공정으로 직행
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${FIXED_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: "우리 아기 예쁜 아기, 엄마가 항상 지켜줄게. 코장코장 잘 자렴.",
        model_id: "eleven_multilingual_v2"
      })
    });

    if (!ttsRes.ok) {
      const errorData = await ttsRes.json();
      console.error('🔥 TTS 에러:', JSON.stringify(errorData));
      return res.status(ttsRes.status).json(errorData);
    }

    const resultAudio = await ttsRes.arrayBuffer();
    
    // 3. 완성된 자장가 파일을 앱으로 전송
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(resultAudio));

  } catch (error) {
    console.error('💻 서버 에러:', error.message);
    res.status(500).json({ error: error.message });
  }
}
