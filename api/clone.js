import { Buffer } from 'buffer';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  // 1. API 키가 금고에 아예 없는 경우 체크
  if (!apiKey) {
    return res.status(500).json({ error: "Vercel 설정에 API 키가 없습니다!" });
  }

  try {
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);

    // 2. 일레븐랩스에 '진짜 목소리 복제' 요청
    const formData = new FormData();
    formData.append('name', `Mom_Voice_${Date.now()}`);
    // 파일 데이터를 블롭(Blob)으로 변환해서 담기
    const fileBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    formData.append('files', fileBlob, 'recording.mp3');

    const addVoiceRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData
    });

    const addData = await addVoiceRes.json();

    // ❌ 만약 복제에 실패하면, 일레븐랩스가 보낸 진짜 에러 메시지를 로그에 찍음
    if (!addVoiceRes.ok) {
      console.error('🔥 일레븐랩스 답변:', JSON.stringify(addData));
      return res.status(addVoiceRes.status).json(addData);
    }

    const voice_id = addData.voice_id;

    // 3. 자장가 생성
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
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

    const resultAudio = await ttsRes.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(resultAudio));

  } catch (error) {
    console.error('💻 서버 코드 에러:', error);
    res.status(500).json({ error: '서버 내부 에러 발생' });
  }
}
