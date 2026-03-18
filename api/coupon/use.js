// api/coupon/use.js
import { createClient } from '@supabase/supabase-client'

// Vercel 환경 변수에서 수파베이스 접속 정보를 가져옵니다.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

export default async function handler(req, res) {
  // POST 방식의 요청만 허용합니다.
  if (req.method !== 'POST') return res.status(405).json({ message: "Method Not Allowed" });

  const { code } = req.body

  try {
    // 1. 수파베이스에서 쿠폰이 있는지, 아직 사용 전(is_used: false)인지 확인
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('is_used', false)
      .single()

    if (error || !data) {
      return res.status(400).json({ success: false, message: "이미 사용된 코드거나 번호가 틀렸습니다." })
    }

    // 2. 사용 완료 처리 (is_used를 true로 업데이트!)
    const { updateError } = await supabase
      .from('coupons')
      .update({ is_used: true })
      .eq('code', code)

    if (updateError) throw updateError;

    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, message: "서버 내부 에러가 발생했습니다." })
  }
}
