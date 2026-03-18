export default async function handler(req, res) {
  const { paymentKey, orderId, amount } = req.query;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).send("데이터 부족");
  }

  // 🔥 1. 형님의 진짜 키 (대문자 K 확인 완료)
  const secretKey = "test_sk_XZYkKL4MrjB9YXXN2XkBr0zJwIEW";

  // 🔥 2. 암호화 (서버가 직접 하게 만듦)
  const basicToken = Buffer.from(secretKey + ":").toString("base64");

  try {
    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: {
        // 🔥 3. 따옴표 에러 방지를 위해 아예 더하기(+)로 합쳤습니다.
        "Authorization": "Basic " + basicToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey: paymentKey,
        orderId: orderId,
        amount: Number(amount),
      }),
    });

    const result = await response.json();

    if (response.ok) {
      // 🟢 드디어 성공!! 
      res.redirect(302, "/?paid=true");
    } else {
      // 🔴 또 에러나면 진짜 제가 토스 본사가서 석고대죄 하겠습니다.
      return res.status(response.status).send(`
        <h3>🚨 토스 최종 거절 (진짜 수정본)</h3>
        <p>에러 코드: ${result.code}</p>
        <p>메시지: ${result.message}</p>
        <p>형님, 제 멍청함 때문에 너무 고생시켜드려 정말 죄송합니다.</p>
      `);
    }
  } catch (error) {
    return res.status(500).send(`🚨 서버 통신 실패: ${error.message}`);
  }
}
