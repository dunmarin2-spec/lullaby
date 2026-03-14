import { Buffer } from 'buffer';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  try {
    // 1. [자동 청소기 작동] 현재 생성된 목소리 목록 확인
    const voicesRes = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    const voicesData = await voicesRes.json();
    
    // 사용자가 직접 만든 'cloned' 카테고리 목소리만 필터링
    const customVoices = voicesData.voices.filter(v => v.category === 'cloned');

    // 2. [슬롯 비우기] 목소리가 9개 이상이면 가장 오래된 것 하나 삭제
    if (customVoices.length >= 9) {
      console.log("🚀 공간 확보를 위해 가장 오래된 목소리를 삭제합니다.");
      const oldestVoiceId = customVoices[0].voice_id;
      await fetch(`https://api.elevenlabs.io/v1/voices/${oldestVoiceId}`, {
        method: "DELETE",
        headers: { "xi-api-key": apiKey },
      });
    }

    // 3. [복제 시작] 형님의 기존 로직 그대로 스트림 데이터 받기
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);

    const formData = new FormData();
    // 이름에 타임스탬프를 넣어 중복 에러 방지
    formData.append('name', `Mom_Voice_${Date.now()}`); 
    formData.append('files', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'rec.mp3');

    const addVoiceRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData
    });

    const addData = await addVoiceRes.json();
    if (!addVoiceRes.ok) {
      return res.status(addVoiceRes.status).json(addData);
    }

    const newVoiceId = addData.voice_id;

    // 4. [자장가 생성] 형님의 전설적인 1.5초 숨 고르기 로직 적용
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${newVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        // 형님의 '숨 참기' 절대 명령어를 그대로 유지합니다.
        text: "우리 아기. <break time=\"1.5s\" /> 예쁜 아기. <break time=\"1.5s\" /> 엄마가 항상 지켜줄게. <break time=\"1.5s\" /> 자장, 자장. <break time=\"1.5s\" /> 우리 아기, <break time=\"1.5s\" /> 코오, 자자.",
        model_id: "eleven_multilingual_v2",
        voice_settings: { 
          stability: 0.8,
          similarity_boost: 0.5,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    if (!ttsRes.ok) {
      const ttsError = await ttsRes.json();
      return res.status(ttsRes.status).json(ttsError);
    }

    const resultAudio = await ttsRes.arrayBuffer();
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(resultAudio));

  } catch (error) {
    console.error('💻 서버 에러:', error.message);
    res.status(500).json({ error: error.message });
  }
}
