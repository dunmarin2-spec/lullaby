import { Buffer } from 'buffer';

export const config = { api: { bodyParser: false } };
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-lang');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const lang = req.headers['x-lang'] || 'ko';

  const lullabyTexts = {
    ko: "우리 아기... 예쁜 아기... 엄마가 항상 지켜줄게... 자장, 자장... 우리 아기... 코오, 자자.",
    en: "My sweet baby... My lovely child... Mommy will always protect you... Sleep tight, my dear... Close your eyes... and go to sleep.",
    tr: "Canım bebeğim... Tatlı yavrum... Annen seni her zaman koruyacak... Ninni, ninni... Hadi uyu bebeğim... tatlı rüyalar gör."
  };

  try {
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);
    const base64Audio = `data:application/octet-stream;base64,${audioBuffer.toString('base64')}`;

    // 3. Replicate API 호출 (최신 버전 해시로 교체)
    const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // 👈 안정적인 XTTS-v2 최신 버전으로 교체했습니다.
        version: "6b16e4549f64923e38712a6f20b3272d1748f21908dfdf649e4d580f4f727690",
        input: {
          text: lullabyTexts[lang],
          language: lang,
          speaker: base64Audio,
          cleanup_voice: true
        }
      })
    });

    const prediction = await startResponse.json();
    
    // 만약 여기서 "not permitted" 에러가 나면 무조건 카드 등록 문제입니다.
    if (!prediction.id) {
      console.error("Replicate Error Detail:", prediction);
      throw new Error(`Replicate 요청 실패: ${prediction.detail || "카드 등록 확인 필요"}`);
    }

    const predictionId = prediction.id;
    let currentPrediction = prediction;

    // 4. 결과 대기 (최대 45초까지 대기)
    let retryCount = 0;
    while (currentPrediction.status !== "succeeded" && currentPrediction.status !== "failed" && retryCount < 30) {
      await sleep(1500); 
      const checkRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { "Authorization": `Token ${replicateToken}` }
      });
      currentPrediction = await checkRes.json();
      retryCount++;
    }

    if (currentPrediction.status === "failed") throw new Error("AI 생성 실패");

    // 5. 결과 오디오 전송
    const audioRes = await fetch(currentPrediction.output);
    const resultBuffer = await audioRes.arrayBuffer();

    res.setHeader('Content-Type', 'audio/wav');
    res.send(Buffer.from(resultBuffer));

  } catch (error) {
    console.error("Fatal Error:", error);
    res.status(500).json({ error: error.message });
  }
}
