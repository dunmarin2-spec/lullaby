import { Buffer } from 'buffer';
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  // 🔥 이 로그가 Vercel 로그에 무조건 찍혀야 합니다!
  console.log("-----------------------------------------");
  console.log("🚀 [진단] 현재 사용 중인 API 키 뒷자리:", apiKey ? apiKey.slice(-4) : "없음");
  console.log("-----------------------------------------");

  try {
    const chunks = [];
    for await (const chunk of req) { chunks.push(chunk); }
    const audioBuffer = Buffer.concat(chunks);

    const formData = new FormData();
    formData.append('name', `Mom_Voice_${Date.now()}`);
    formData.append('files', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'rec.mp3');

    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('🔥 [진단] 일레븐랩스 답변:', JSON.stringify(data));
      return res.status(response.status).json(data);
    }

    res.status(200).json({ success: true, voice_id: data.voice_id });
  } catch (e) {
    console.error('🔥 [진단] 서버 에러:', e.message);
    res.status(500).json({ error: e.message });
  }
}
