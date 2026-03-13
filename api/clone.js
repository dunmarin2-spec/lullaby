import { Buffer } from 'buffer';

export const config = {
  api: { bodyParser: false }, // 녹음 파일(이진 데이터)을 직접 받기 위해 설정
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  try {
    // 1. 프론트엔드에서 보낸 녹음 파일(Blob)을 데이터로 변환
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);

    // 2. 일레븐랩스에 "이 목소리 복제해줘!" 요청 (Add Voice)
    const formData = new FormData();
    formData.append('name', `Mom_${Date.now()}`); // 겹치지 않게 이름 생성
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    formData.append('files', blob, 'recording.mp3');

    const addVoiceRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData
    });

    const { voice_id } = await addVoiceRes.json();
    if (!voice_id) throw new Error('목소리 복제 실패');

    // 3. 방금 만든 따끈따끈한 voice_id로 자장가 생성 (TTS)
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text: "우리 아기 예쁜 아기, 엄마가 항상 지켜줄게. 코장코장 잘 자렴.",
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });

    const resultAudio = await ttsRes.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(resultAudio));

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '자동화 처리 실패' });
  }
}
