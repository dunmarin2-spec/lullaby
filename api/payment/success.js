export default async function handler(req, res) {
  // 1. 손님이 들고 온 영수증 데이터 꺼내기
  const { paymentKey, orderId, amount } = req.query;

  if (!paymentKey || !orderId || !amount) {
    return res.status(400).send("잘못된 결제 요청입니다.");
  }

  // 2. Vercel 금고에 숨겨둔 형님의 시크릿 키 꺼내기
  const secretKey = process.env.TOSS_SECRET_KEY;
  const encryptedSecretKey = Buffer.from(secretKey + ':').toString('base64');

  try {
    // 3. 토스 서버에 승인 요청 (API 통신)
    const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encryptedSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey: paymentKey,
        orderId: orderId,
        // 🔥 여기가 문제였습니다! 글자를 숫자로 확실하게 변환! 🔥
        amount: Number(amount), 
      }),
    });

    if (response.ok) {
      // 🟢 결제 최종 승인 완료! (성공 꼬리표 달고 메인으로)
      res.redirect(302, '/?paid=true');
    } else {
      // 🔴 결제 실패 (에러 이유 로그로 남기고 실패 꼬리표 달기)
      const errorData = await response.json();
      console.error("결제 승인 실패 이유:", errorData);
      res.redirect(302, '/?paid=false');
    }
  } catch (error) {
    console.error("서버 통신 에러:", error);
    res.redirect(302, '/?paid=false');
  }
}
