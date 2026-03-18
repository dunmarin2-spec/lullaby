import { createClient } from '@supabase/supabase-js';

// 🔥 1. Vercel 환경변수 띄어쓰기 에러 방지: 아예 형님의 금고 주소를 박아버렸습니다.
const supabaseUrl = "https://wzrvdikpzwiiuesemttw.supabase.co";

// 🔥 2. 혹시 열쇠에 복사하다 묻은 공백이 있다면 싹 지워줍니다 (.trim)
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  const { paymentKey, orderId, amount } = req.query;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).send("데이터 부족");
  }

  // 형님이 뚫어낸 전설의 토스 시크릿 키
  const secretKey = "test_sk_XZYkKL4MrjB9YXXN2XkBr0zJwlEW".trim();
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
      // 🟢 Supabase 장부에 기록 시도!
      const { error } = await supabase
        .from('payments')
        .insert([{ 
          order_id: orderId, 
          amount: Number(amount), 
          payment_key: paymentKey, 
          status: 'DONE' 
        }]);

      if (error) {
        // 🚨 만약 여기서 또 막히면 진짜 열쇠(Key) 자체가 틀린 겁니다.
        return res.status(500).send(`
          <h2>🚨 장부 기록 실패! (결제는 됨)</h2>
          <p><b>에러 원인:</b> ${error.message}</p>
          <p>형님, Vercel에 넣은 SUPABASE_SERVICE_ROLE_KEY를 다시 한번 확인해 주십쇼!</p>
        `);
      }

      // 🟢 장부 기록까지 완벽하게 끝나면 앱으로 화려하게 복귀!
      res.redirect(302, "/?paid=true");
    } else {
      const result = await response.json();
      return res.status(response.status).send(`결제 승인 거절: ${result.message}`);
    }
  } catch (err) {
    return res.status(500).send("서버 통신 에러: " + err.message);
  }
}
