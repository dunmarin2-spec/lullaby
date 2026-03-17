import { Buffer } from 'buffer';

export const config = {
  api: {
    bodyParser: false, // 오디오 데이터를 원본 그대로 받기 위해 설정
  },
};

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export default async function handler(req, res) {
  // 1. CORS 및 응답 헤더 설정 (앱에서 접근 가능하도록)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-lang');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const replicateToken = process.env.REPLICATE_API_TOKEN;
  const lang = req.headers['x-lang'] || 'ko';

  // 퐁비님이 정하신 나긋나긋한 자장가 텍스트
  const lullabyTexts = {
    ko: "우리.. 아기.... 예쁜.. 아기.... 엄마가.. 항상.. 지켜줄게.... 자장.. 자장.... 우리.. 아기.... 코오.. 자자....",
    en: "My sweet baby... My lovely child... Mommy will always protect you... Sleep tight, my dear... Close your eyes... and go to sleep.",
    tr: "Canım bebeğim... Tatlı yavrum... Annen seni her zaman koruyacak... Ninni, ninni... Hadi uyu bebeğim... tatlı rüyalar gör."
  };

  try {
    // 2. 클라이언트로부터 전송된 오디오 청크 수집
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    const base64Audio = `data:application/octet-stream;base64,${audioBuffer.toString('base64')}`;

    // 3. Replicate API 호출 (캡처 화면에서 확인한 최신 버전 사용)
    const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // ✅ 퐁비님이 캡처하신 최신 버전 번호입니다.
        version: "684bc3855b37866c0c65add2ff39c78f3dea3f4ff103a436465326e0f438d55e",
        input: {
          text: lullabyTexts[lang],
          language: lang,
          speaker: base64Audio,
          cleanup_voice: true
        }
      })
    });

    const prediction = await startResponse.json();

    if (!prediction.id) {
      console.error("Replicate Error:", JSON.stringify(prediction));
      throw new Error(`AI 호출 실패: ${prediction.detail || "권한 또는 설정 문제"}`);
    }

    const predictionId = prediction.id;
    let currentPrediction = prediction;

    // 4. 결과 대기 (Vercel 무료 플랜의 10초 제한을 최대한 활용)
    let retryCount = 0;
    while (currentPrediction.status !== "succeeded" && currentPrediction.status !== "failed" && retryCount < 30) {
      await sleep(1500); // 1.5초마다 상태 확인
      const checkRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { "Authorization": `Token ${replicateToken}` }
      });
      currentPrediction = await checkRes.json();
      retryCount++;
    }

    if (currentPrediction.status !== "succeeded") {
      throw new Error(`AI 생성 미완료 (상태: ${currentPrediction.status})`);
    }

    // 5. 생성된 오디오 파일 다운로드 및 클라이언트로 전송
    const audioRes = await fetch(currentPrediction.output);
    const resultBuffer = await audioRes.arrayBuffer();

    res.setHeader('Content-Type', 'audio/wav');
    res.send(Buffer.from(resultBuffer));

  } catch (error) {
    console.error("Fatal Error Log:", error.message);
    res.status(500).json({ error: error.message });
  }
}
