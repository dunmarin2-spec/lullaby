import { Buffer } from 'buffer';

export const config = {
  api: { bodyParser: false },
};

// 🔥 무작위 지연 함수: 요청이 한꺼번에 몰리는 것을 방지합니다.
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export default async function handler(req, res) {
  // 🚨 안드로이드 앱의 접근을 허용하는 문지기(CORS) 설정 🚨
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-lang');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const lang = req.headers['x-lang'] || 'ko';

  const lullabyTexts = {
    ko: "우리 아기. <break time=\"1.5s\" /> 예쁜 아기. <break time=\"1.5s\" /> 엄마가 항상 지켜줄게. <break time=\"1.5s\" /> 자장, 자장. <break time=\"1.5s\" /> 우리 아기, <break time=\"1.5s\" /> 코오, 자자.",
    en: "My sweet baby. <break time=\"1.5s\" /> My lovely child. <break time=\"1.5s\" /> Mommy will always protect you. <break time=\"1.5s\" /> Sleep tight, my dear. <break time=\"1.5s\" /> Close your eyes, <break time=\"1.5s\" /> and go to sleep.",
    tr: "Canım bebeğim. <break time=\"1.5s\" /> Tatlı yavrum. <break time=\"1.5s\" /> Annen seni her zaman koruyacak. <break time=\"1.5s\" /> Ninni, ninni. <break time=\"1.5s\" /> Hadi uyu bebeğim, <break time=\"1.5s\" /> tatlı rüyalar gör."
  };

  try {
    await sleep(Math.random() * 2000);

    // ❌ [삭제됨] 예전에 있던 "목소리 9개 넘는지 검사하고 지우는 로직"은 통째로 날렸습니다! (속도 대폭 향상)

    // 스마트폰에서 온 녹음 파일 받기
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);

    const formData = new FormData();
    formData.append('name', `Voice_${lang}_${Date.now()}`); 
    formData.append('files', new Blob([audioBuffer], { type: 'audio/webm' }), 'rec.webm');

    // 1️⃣ 일레븐랩스에 목소리 추가 (작업대 하나 빌리기)
    const addVoiceRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData
    });

    const addData = await addVoiceRes.json();
    
    if (!addVoiceRes.ok) {
      return res.status(429).json({ error: "Server Busy", detail: addData });
    }

    const newVoiceId = addData.voice_id; // 빌린 작업대 번호
    let resultAudioBuffer;

    // 🚨 [핵심! 치고 빠지기 로직]
    try {
      // 2️⃣ 자장가(TTS) 오디오 생성
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
      
      resultAudioBuffer = await ttsRes.arrayBuffer(); // 만들어진 자장가 파일 챙기기

    } finally {
      // 3️⃣ 자장가를 무사히 만들었든 에러가 났든, 빌렸던 작업대(목소리)는 즉시 삭제 후 반납!
      await fetch(`https://api.elevenlabs.io/v1/voices/${newVoiceId}`, {
        method: "DELETE",
        headers: { "xi-api-key": apiKey }
      }).catch(err => console.log("목소리 삭제 실패(무시)"));
    }

    // 4️⃣ 유저 스마트폰으로 완성된 자장가 쏴주기
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(resultAudioBuffer));

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
