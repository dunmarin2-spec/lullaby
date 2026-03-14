import { Buffer } from 'buffer';
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const FIXED_VOICE_ID = "0oqpliV6dVSr9XomngOW"; 

  try {
    // 1. 일레븐랩스야, 내 열쇠 권한 진짜 뭐야? (로그 확인용)
    const userRes = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': apiKey }
    });
    const userData = await userRes.json();
    console.log("👤 내 계정 등급:", userData.subscription?.tier || "모름");

    // 2. 가장 기본 모델(v1)로 시도해서 권한 뚫어보기
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${FIXED_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: "우리 아기 예쁜 아기, 엄마가 항상 지켜줄게.",
        model_id: "eleven_monolingual_v1" // 더 가벼운 모델로 변경
      })
    });

    const data = await ttsRes.json();

    if (!ttsRes.ok) {
      // ❌ 여기서 에러나면 일레븐랩스 사이트에서 'Permissions' 확인이 필수입니다!
      console.error('🔥 진짜 에러 이유:', JSON.stringify(data));
      return res.status(ttsRes.status).json(data);
    }

    const resultAudio = await ttsRes.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(resultAudio));

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
