import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const { paymentKey, orderId, amount } = req.query;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).send("데이터 부족");
  }

  // 🔥 형님의 진짜 토스 시크릿 키
  const secretKey = "test_sk_XZYkKL4MrjB9YXXN2XkBr0zJwlEW";
  const basicToken = Buffer.from(secretKey + ":").toString("base64");

  try {
    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + basicToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    });

    if (response.ok) {
      // 🟢 Supabase 장부에 기록 시도
      const { error } = await supabase
        .from('payments')
        .insert([{ 
          order_id: orderId, 
          amount: Number(amount), 
          payment_key: paymentKey, 
          status: 'DONE' 
        }]);

      // 🚨 [에러 탐지기] 만약 수파베이스에서 막히면 화면에 이유를 띄웁니다!
      if (error) {
        return res.status(500).send(`
          <h2>🚨 장부 기록 실패! (결제는 됨)</h2>
          <p><b>에러 원인:</b> ${error.message}</p>
          <p>이 화면을 스샷 찍어서 보여주십쇼!</p>
        `);
      }

      // 에러가 없으면 정상적으로 앱으로 복귀
      res.redirect(302, "/?paid=true");
    } else {
      const result = await response.json();
      return res.status(response.status).send(`승인 실패: ${result.message}`);
    }
  } catch (err) {
    return res.status(500).send("서버 통신 에러: " + err.message);
  }
}
