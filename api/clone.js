import { Buffer } from 'buffer';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  try {
    console.log("🚀 [1단계] 앱에서 녹음 파일 수신, 일레븐랩스로 복제 요청 보냅니다!");

    // 1. 앱에서 사용자가 녹음한 파일 받기
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);

    // 2. 일레븐랩스에 '이 녹음본으로 새 목소리 만들어줘' (Voice Add) 요청
    const formData = new FormData();
    formData.append('name', `Mom_Voice_${Date.now()}`); 
    formData.append('files', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'rec.mp3');

    const addVoiceRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData
    });

    const addData = await addVoiceRes.json();
    if (!addVoiceRes.ok) {
      console.error('🔥 [복제 실패]:', JSON.stringify(addData));
      return res.status(addVoiceRes.status).json(addData);
    }

    const newVoiceId = addData.voice_id;
    console.log(`✅ [1단계 성공] 목소리 복제 완료! 새 ID: ${newVoiceId}`);
    console.log("🚀 [2단계] 방금 만든 내 목소리로 자장가 생성 시작...");

    // 3. 방금 막 생성된 따끈따끈한 내 목소리 ID로 자장가 대사 읽기
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${newVoiceId}`, {
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
      const ttsError = await ttsRes.json();
      console.error('🔥 [TTS 실패]:', JSON.stringify(ttsError));
      return res.status(ttsRes.status).json(ttsError);
    }

    const resultAudio = await ttsRes.arrayBuffer();
    
    console.log("✅ [2단계 성공] 내 목소리 자장가 완성! 앱으로 전송합니다.");
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(resultAudio));

  } catch (error) {
    console.error('💻 서버 에러:', error.message);
    res.status(500).json({ error: error.message });
  }
}
