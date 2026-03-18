import { createClient } from '@supabase/supabase-js';

// Vercel 환경변수에 등록한 열쇠들을 자동으로 가져옵니다.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { paymentKey, orderId, amount } = req.query;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).send("데이터 부족");
  }

  // 🔥 형님이 직접 입력해서 뚫으셨던 그 정답 키입니다!
  const secretKey = "test_sk_XZYkKL4MrjB9YXXN2XkBr0zJwlEW";
  const basicToken = Buffer.from(secretKey + ":").toString("base64");

  try {
    // 1. 토스 서버에 승인 요청
    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + basicToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    });

    if (response.ok) {
      // 🟢 2. [핵심] 결제 성공 시 Supabase 장부에 한 줄 기록!
      const { error } = await supabase
        .from('payments')
        .insert([{ 
          order_id: orderId, 
          amount: Number(amount), 
          payment_key: paymentKey, 
          status: 'DONE' 
        }]);

      if (error) console.error("장부 기록 에러:", error.message);

      // 3. 결제 완료 꼬리표 달고 홈으로 복귀!
      res.redirect(302, "/?paid=true");
    } else {
      const result = await response.json();
      return res.status(response.status).send(`승인 실패: ${result.message}`);
    }
  } catch (err) {
    return res.status(500).send("서버 통신 에러: " + err.message);
  }
}
