import { Buffer } from 'buffer';

export const config = {
  api: { bodyParser: false },
};

// 🔥 [추가] 무작위 지연 함수: 요청이 한꺼번에 몰리는 것을 방지합니다.
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const lang = req.headers['x-lang'] || 'ko';

  const lullabyTexts = {
    ko: "우리 아기. <break time=\"1.5s\" /> 예쁜 아기. <break time=\"1.5s\" /> 엄마가 항상 지켜줄게. <break time=\"1.5s\" /> 자장, 자장. <break time=\"1.5s\" /> 우리 아기, <break time=\"1.5s\" /> 코오, 자자.",
    en: "My sweet baby. <break time=\"1.5s\" /> My lovely child. <break time=\"1.5s\" /> Mommy will always protect you. <break time=\"1.5s\" /> Sleep tight, my dear. <break time=\"1.5s\" /> Close your eyes, <break time=\"1.5s\" /> and go to sleep.",
    tr: "Canım bebeğim. <break time=\"1.5s\" /> Tatlı yavrum. <break time=\"1.5s\" /> Annen seni her zaman koruyacak. <break time=\"1.5s\" /> Ninni, ninni. <break time=\"1.5s\" /> Hadi uyu bebeğim, <break time=\"1.5s\" /> tatlı rüyalar gör."
  };

  try {
    // 1️⃣ [추가] 0~2초 사이의 무작위 지연을 주어 동시 접속 요청을 분산시킵니다.
    await sleep(Math.random() * 2000);

    const voicesRes = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": apiKey },
    });
    const voicesData = await voicesRes.json();
    const customVoices = voicesData.voices.filter(v => v.category === 'cloned');

    if (customVoices.length >= 9) {
      const oldestVoiceId = customVoices[0].voice_id;
      // 2️⃣ [수정] 삭제 요청 시 .catch()를 붙여 이미 삭제된 경우에도 다음 단계로 넘어가게 합니다.
      await fetch(`https://api.elevenlabs.io/v1/voices/${oldestVoiceId}`, {
        method: "DELETE",
        headers: { "xi-api-key": apiKey },
      }).catch(err => console.log("이미 삭제된 목소리이거나 에러 발생, 무시하고 진행합니다."));
    }

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
    
    // 3️⃣ [추가] 슬롯이 꽉 차서 생성이 안 될 경우 클라이언트에 429(재시도 요청)를 보냅니다.
    if (!addVoiceRes.ok) {
      return res.status(429).json({ error: "Server Busy", detail: addData });
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
        text: lullabyTexts[lang],
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.8, similarity_boost: 0.5, style: 0.0, use_speaker_boost: true }
      })
    });

    if (!ttsRes.ok) return res.status(ttsRes.status).json(await ttsRes.json());

    const resultAudio = await ttsRes.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(resultAudio));

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
