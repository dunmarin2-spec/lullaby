// api/coupon/use.js
import { createClient } from '@supabase/supabase-client'

export default async function handler(req, res) {
  // POST 방식이 아니면 쳐내기
  if (req.method !== 'POST') return res.status(405).json({ message: "Method Not Allowed" });

  // 🛡️ 1. 방탄조끼: 환경 변수가 제대로 들어왔는지 먼저 검사!
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return res.status(500).json({ 
      success: false, 
      message: "서버 세팅 에러: Vercel에 SUPABASE 키가 없습니다." 
    });
  }

  // 안전하게 확인된 키로 수파베이스 연결
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  const { code } = req.body

  try {
    // 2. 수파베이스에서 쿠폰이 있는지, 아직 사용 전(is_used: false)인지 확인
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('is_used', false)
      .single()

    if (error || !data) {
      return res.status(400).json({ success: false, message: "이미 사용된 코드거나 번호가 틀렸습니다." })
    }

    // 3. 사용 완료 처리 (is_used를 true로 업데이트!)
    const { updateError } = await supabase
      .from('coupons')
      .update({ is_used: true })
      .eq('code', code)

    if (updateError) throw updateError;

    // 4. 완벽하게 성공!
    return res.status(200).json({ success: true })
    
  } catch (err) {
    return res.status(500).json({ success: false, message: "서버 내부 에러: " + err.message })
  }
}
