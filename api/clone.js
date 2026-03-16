import { Buffer } from 'buffer';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  // CORS 설정
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
    // 🚨 1. 타임아웃의 주범이었던 sleep 함수 삭제 완료

    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);

    console.log(`[서버] 수신된 오디오 버퍼 크기: ${audioBuffer.length} bytes`); // 로그 확인용

    const formData = new FormData();
    formData.append('name', `Voice_${lang}_${Date.now()}`); 
    // 안드로이드/플러터 환경에 맞춰 확장자를 m4a 또는 mp4로 변경하는 것도 고려해보세요.
    formData.append('files', new Blob([audioBuffer], { type: 'audio/webm' }), 'rec.webm');

    console.log("[서버] 일레븐랩스에 목소리 추가 요청 중...");
    
    // 1️⃣ 일레븐랩스에 목소리 추가
    const addVoiceRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData
    });

    const addData = await addVoiceRes.json();
    
    if (!addVoiceRes.ok) {
      console.error("[에러] 일레븐랩스 목소리 추가 실패:", addData);
      return res.status(addVoiceRes.status).json({ error: "Voice Add Failed", detail: addData });
    }

    const newVoiceId = addData.voice_id; 
    console.log(`[서버] 목소리 추가 성공! Voice ID: ${newVoiceId}`);
    
    let resultAudioBuffer;

    try {
      console.log("[서버] 자장가 TTS 생성 중...");
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

      if (!ttsRes.ok) {
        const ttsError = await ttsRes.json();
        console.error("[에러] TTS 생성 실패:", ttsError);
        return res.status(ttsRes.status).json(ttsError);
      }
      
      resultAudioBuffer = await ttsRes.arrayBuffer(); 
      console.log("[서버] 자장가 생성 완료!");

    } finally {
      // 3️⃣ 목소리 삭제
      await fetch(`https://api.elevenlabs.io/v1/voices/${newVoiceId}`, {
        method: "DELETE",
        headers: { "xi-api-key": apiKey }
      }).catch(err => console.error("[경고] 목소리 삭제 실패:", err));
    }

    // 4️⃣ 유저에게 전송
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(resultAudioBuffer));

  } catch (error) {
    console.error("[치명적 에러] 서버 내부 오류:", error);
    res.status(500).json({ error: error.message });
  }
}
