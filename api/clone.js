import { Buffer } from 'buffer';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  // 🔥 [업데이트] 앱(index.html)에서 보낸 언어 정보를 헤더에서 읽어옵니다.
  const lang = req.headers['x-lang'] || 'ko';

  // 📝 언어별 맞춤 자장가 대사 (형님의 1.5초 숨 고르기 로직 포함)
  const lullabyTexts = {
    ko: "우리 아기. <break time=\"1.5s\" /> 예쁜 아기. <break time=\"1.5s\" /> 엄마가 항상 지켜줄게. <break time=\"1.5s\" /> 자장, 자장. <break time=\"1.5s\" /> 우리 아기, <break time=\"1.5s\" /> 코오, 자자.",
    en: "My sweet baby. <break time=\"1.5s\" /> My lovely child. <break time=\"1.5s\" /> Mommy will always protect you. <break time=\"1.5s\" /> Sleep tight, my dear. <break time=\"1.5s\" /> Close your eyes, <break time=\"1.5s\" /> and go to sleep.",
    tr: "Canım bebeğim. <break time=\"1.5s\" /> Tatlı yavrum. <break time=\"1.5s\" /> Annen seni her zaman koruyacak. <break time=\"1.5s\" /> Ninni, ninni. <break time=\"1.5s\" /> Hadi uyu bebeğim, <break time=\"1.5s\" /> tatlı rüyalar gör."
  };

  try {
    // 1. [자동 청소기] 현재 생성된 목소리 목록 확인 및 슬롯 비우기
    const voicesRes = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    const voicesData = await voicesRes.json();
    const customVoices = voicesData.voices.filter(v => v.category === 'cloned');

    if (customVoices.length >= 9) {
      const oldestVoiceId = customVoices[0].voice_id;
      await fetch(`https://api.elevenlabs.io/v1/voices/${oldestVoiceId}`, {
        method: "DELETE",
        headers: { "xi-api-key": apiKey },
      });
    }

    // 2. [복제 시작] 스트림 데이터 받기
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);

    const formData = new FormData();
    formData.append('name', `Voice_${lang}_${Date.now()}`); 
    formData.append('files', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'rec.mp3');

    const addVoiceRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData
    });

    const addData = await addVoiceRes.json();
    if (!addVoiceRes.ok) return res.status(addVoiceRes.status).json(addData);

    const newVoiceId = addData.voice_id;

    // 3. [자장가 생성] 선택된 언어에 맞는 텍스트로 TTS 생성
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${newVoiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        // 🔥 선택된 언어(ko, en, tr)에 맞는 자장가 문구가 자동으로 선택됩니다.
        text: lullabyTexts[lang],
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
    res.status(500).json({ error: error.message });
  }
}
