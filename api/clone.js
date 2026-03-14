import { Buffer } from 'buffer';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  // 형님이 고르신 '무조건 성공하는' 목소리 ID
  const FIXED_VOICE_ID = "0oqpliV6dVSr9XomngOW"; 

  try {
    console.log("🚀 자장가 생성 시작...");

    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }

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

    // ❌ 에러가 났을 때만 이유를 확인
    if (!ttsRes.ok) {
      const errorData = await ttsRes.json();
      console.error('🔥 일레븐랩스 에러:', JSON.stringify(errorData));
      return res.status(ttsRes.status).json(errorData);
    }

    // ✅ 성공했을 때는 오디오 파일로 변환해서 즉시 전송
    const resultAudio = await ttsRes.arrayBuffer();
    
    console.log("✅ 자장가 생성 성공! 폰으로 전송합니다.");
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(resultAudio));

  } catch (error) {
    console.error('💻 서버 코드 에러:', error.message);
    res.status(500).json({ error: error.message });
  }
}
