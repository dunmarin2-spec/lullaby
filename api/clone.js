import { Buffer } from 'buffer';

export const config = {
  api: {
    bodyParser: false,
  },
};

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-lang');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const lang = req.headers['x-lang'] || 'ko';

  // 1. 텍스트 수정: 쉼표(,,)를 추가해 문장 사이 호흡을 길게 가져갑니다.
  const lullabyTexts = {
    ko: "우리,, 아기,,,, 예쁜,, 아기,,,, 엄마가,, 항상,, 지켜줄게,,,, 자장,, 자장,,,, 우리,, 아기,,,, 코오,, 자자....",
    en: "My sweet baby,, My lovely child,, Mommy will always protect you,, Sleep tight,, my dear,, Close your eyes,, and go to sleep.",
    tr: "Canım bebeğim,, Tatlı yavrum,, Annen seni her zaman koruyacak,, Ninni,, ninni,, Hadi uyu bebeğim,, tatlı rüyalar gör."
  };

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
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
          // 2. 속도 조절: 0.7이 "무리하지 않는 선"에서 가장 느린 최적값입니다.
          speed: 0.7, 
          cleanup_voice: false // 목소리 결을 살리기 위해 껐습니다.
        }
      })
    });

    const prediction = await startResponse.json();

    if (!prediction.id) {
      console.error("Replicate Error:", JSON.stringify(prediction));
      throw new Error(`AI 호출 실패: ${prediction.detail || "설정 문제"}`);
    }

    const predictionId = prediction.id;
    let currentPrediction = prediction;

    // 3. 결과 대기 (Vercel 무료플랜 10초 제한 주의)
    let retryCount = 0;
    while (currentPrediction.status !== "succeeded" && currentPrediction.status !== "failed" && retryCount < 30) {
      await sleep(1500);
      const checkRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { "Authorization": `Token ${replicateToken}` }
      });
      currentPrediction = await checkRes.json();
      retryCount++;
    }

    if (currentPrediction.status !== "succeeded") {
      throw new Error(`AI 생성 미완료 (상태: ${currentPrediction.status})`);
    }

    const audioRes = await fetch(currentPrediction.output);
    const resultBuffer = await audioRes.arrayBuffer();

    res.setHeader('Content-Type', 'audio/wav');
    res.send(Buffer.from(resultBuffer));

  } catch (error) {
    console.error("Fatal Error Log:", error.message);
    res.status(500).json({ error: error.message });
  }
}
