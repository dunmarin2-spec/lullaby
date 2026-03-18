export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: "Method Not Allowed" });

  const supabaseUrl = "https://wzrvdikpzwiiuesemttw.supabase.co"; 
  const supabaseKey = "sb_publishable_bfdsYRNPwAF9MfcyZF3pSg_b2tWS8YK";

  const { code } = req.body;

  try {
    // 1. 쿠폰 확인 (GET) - 여기 백틱(`) 적용 완료!
    const getUrl = `${supabaseUrl}/rest/v1/coupons?code=eq.${code}&is_used=eq.false&select=*`;
    const getRes = await fetch(getUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}` // 여기도 백틱(`) 적용 완료!
      }
    });
    const data = await getRes.json();

    if (!data || data.length === 0) {
      return res.status(400).json({ success: false, message: "이미 사용된 코드거나 번호가 틀렸습니다." });
    }

    // 2. 쿠폰 사용 처리 (PATCH) - 여기 백틱(`) 적용 완료!
    const patchUrl = `${supabaseUrl}/rest/v1/coupons?code=eq.${code}`;
    const patchRes = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`, // 여기도 백틱(`) 적용 완료!
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ is_used: true })
    });

    if (!patchRes.ok) throw new Error("쿠폰 업데이트 실패");

    return res.status(200).json({ success: true });
    
  } catch (err) {
    return res.status(500).json({ success: false, message: "서버 통신 에러: " + err.message });
  }
}
