import { Buffer } from 'buffer';

export const config = { api: { bodyParser: false } };
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-lang');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const lang = req.headers['x-lang'] || 'ko';

  const lullabyTexts = {
    ko: "우리 아기 예쁜 아기. 엄마가 항상 지켜줄게. 자장 자장 우리 아기, 이제 코오 자자.",
    en: "My sweet baby, my lovely child. Mommy will always protect you. Sleep tight, my dear, now go to sleep.",
    tr: "Canım bebeğim, tatlı yavrum. Annen seni her zaman koruyacak. Ninni ninni bebeğim, hadi uyu artık."
  };

  try {
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);
    const base64Audio = `data:application/octet-stream;base64,${audioBuffer.toString('base64')}`;

    const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e",
        input: {
          text: lullabyTexts[lang],
          language: lang,
          speaker: base64Audio,
          speed: 0.88,
          cleanup_voice: false 
        }
      })
    });

    const prediction = await startResponse.json();
    if (!prediction.id) throw new Error("AI 호출 실패");

    const predictionId = prediction.id;
    let currentPrediction = prediction;

    let retryCount = 0;
    while (currentPrediction.status !== "succeeded" && currentPrediction.status !== "failed" && retryCount < 40) {
      await sleep(1500);
      const checkRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { "Authorization": `Token ${replicateToken}` }
      });
      currentPrediction = await checkRes.json();
      retryCount++;
    }

    const audioRes = await fetch(currentPrediction.output);
    let resultBuffer = Buffer.from(await audioRes.arrayBuffer());

    // 🚀 [여기가 핵심: 5초 정적 강제 추가]
    // XTTS 모델의 일반적인 샘플 레이트(24kHz)를 기준으로 5초 분량의 '0' 데이터를 생성합니다.
    const sampleRate = 24000; 
    const silenceSeconds = 5;
    const silenceBuffer = Buffer.alloc(sampleRate * 2 * silenceSeconds, 0); // 16-bit mono 기준
    
    // 원래 목소리 뒤에 무음 데이터를 붙입니다.
    let combinedBuffer = Buffer.concat([resultBuffer, silenceBuffer]);

    // WAV 파일 헤더의 크기 정보를 새 길이에 맞춰 수정합니다 (파일이 깨지지 않게 보호)
    if (combinedBuffer.length > 44 && combinedBuffer.slice(0, 4).toString() === 'RIFF') {
      combinedBuffer.writeUInt32LE(combinedBuffer.length - 8, 4);   // 전체 파일 크기 필드 수정
      combinedBuffer.writeUInt32LE(combinedBuffer.length - 44, 40); // 데이터 섹션 크기 필드 수정
    }

    res.setHeader('Content-Type', 'audio/wav');
    res.send(combinedBuffer);

  } catch (error) {
    console.error("🔥 에러:", error.message);
    res.status(500).json({ error: error.message });
  }
}
