// api/coupon/use.js
// 🚨 복잡한 부품 설치 없이 기본 fetch만 사용하는 무적 버전

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: "Method Not Allowed" });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ success: false, message: "환경 변수 설정이 누락되었습니다." });
  }

  const { code } = req.body;

  try {
    // 1. 수파베이스에 직접 "쿠폰 있냐?" 물어보기 (GET 요청)
    const getUrl = `${supabaseUrl}/rest/v1/coupons?code=eq.${code}&is_used=eq.false&select=*`;
    const getRes = await fetch(getUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    const data = await getRes.json();

    // 쿠폰이 없거나 빈 배열이면?
    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, message: "이미 사용된 코드거나 번호가 틀렸습니다." });
    }

    // 2. 쿠폰 썼다고 체크하기 (PATCH 요청)
    const patchUrl = `${supabaseUrl}/rest/v1/coupons?code=eq.${code}`;
    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_used: true })
    });

    if (!patchRes.ok) {
       throw new Error("쿠폰 업데이트 실패");
    }

    // 3. 완벽하게 성공!
    return res.status(200).json({ success: true });
    
  } catch (err) {
    return res.status(500).json({ success: false, message: "서버 통신 에러: " + err.message });
  }
}
