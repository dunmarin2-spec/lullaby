import { Buffer } from 'buffer';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  try {
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);

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

    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${newVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        // 🔥 AI가 무조건 1.5초씩 강제로 숨을 참게 만드는 절대 명령어를 박았습니다.
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
      console.error('🔥 [TTS 실패]:', JSON.stringify(ttsError));
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
