export default async function handler(req, res) {
  // 1. 손님이 들고 온 영수증 데이터 꺼내기
  const { paymentKey, orderId, amount } = req.query;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).send("잘못된 결제 요청입니다.");
  }

  // 2. Vercel 금고에 숨겨둔 형님의 시크릿 키 꺼내기
  const secretKey = process.env.TOSS_SECRET_KEY;
  
  // (토스 규칙) 시크릿 키 뒤에 콜론(:)을 붙이고 Base64라는 암호로 변환해야 함
  const encryptedSecretKey = Buffer.from(secretKey + ':').toString('base64');

  try {
    // 3. 토스 서버에 "진짜 돈 들어왔냐?" 최종 승인 요청 (API 통신)
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encryptedSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    if (response.ok) {
      // 🟢 결제 최종 승인 완료! (돈 꽂힘)
      // 형님의 메인 웹앱(index.html)으로 돌려보내면서 뒤에 '?paid=true'라는 꼬리표를 달아줍니다.
      res.redirect(302, '/?paid=true');
    } else {
      // 🔴 결제 실패 또는 위조된 영수증
      const errorData = await response.json();
      console.error("결제 승인 실패:", errorData);
      res.redirect(302, '/?paid=false');
    }
  } catch (error) {
    console.error("서버 에러:", error);
    res.status(500).send("서버 통신 중 에러가 발생했습니다.");
  }
}
