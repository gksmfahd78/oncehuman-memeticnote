/**
 * Message Content Filter
 * Detects and filters contact information, account numbers, RMT keywords, etc.
 */

// 연락처 관련 패턴
const CONTACT_PATTERNS = [
  // 전화번호
  /01[0-9]-?\d{3,4}-?\d{4}/g,
  /\+82-?10-?\d{3,4}-?\d{4}/g,
  /010\s*\d{4}\s*\d{4}/g,
  /\d{3}-\d{3,4}-\d{4}/g,

  // 이메일
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // 카카오톡 ID
  /카톡\s*(?:아이디|ID|id)?\s*[:：]?\s*[a-zA-Z0-9_-]+/gi,
  /카카오톡?\s*[:：]?\s*[a-zA-Z0-9_-]+/gi,
  /kakao\s*(?:talk)?\s*(?:id)?\s*[:：]?\s*[a-zA-Z0-9_-]+/gi,

  // 디스코드 (허용된 디스코드 닉네임 제외하고 ID 공유만 차단)
  /discord\s*(?:id)?\s*[:：]?\s*[a-zA-Z0-9_]+#\d{4}/gi,
  /디코\s*(?:아이디|ID|id)?\s*[:：]?\s*[a-zA-Z0-9_]+#\d{4}/gi,

  // 텔레그램
  /(?:텔레|텔그|telegram|tg)\s*(?:아이디|ID|id)?\s*[:：]?\s*@?[a-zA-Z0-9_]+/gi,

  // SNS 계정
  /인스타\s*(?:그램)?\s*[:：]?\s*@?[a-zA-Z0-9_.]+/gi,
  /twitter\s*[:：]?\s*@?[a-zA-Z0-9_]+/gi,
];

// 계좌번호 패턴
const ACCOUNT_PATTERNS = [
  /계좌\s*(?:번호)?\s*[:：]?\s*\d{2,}-?\d{2,}-?\d{2,}/gi,
  /\d{3,4}-?\d{2,}-?\d{4,}/g, // 일반적인 계좌번호 형식
  /입금\s*(?:계좌)?\s*[:：]?\s*\d+/gi,
  /송금\s*[:：]?\s*\d+/gi,
];

// 현금거래(RMT) 관련 키워드
const RMT_KEYWORDS = [
  // 직접적인 현금거래
  /현금\s*(?:거래|판매|구매|삽니다|팝니다)/gi,
  /현\s*거래/gi, // 현거래
  /실거래/gi,
  /실물\s*(?:거래|판매)/gi,
  /현물\s*(?:거래|판매)/gi,
  /(?:돈|머니)\s*(?:거래|받고)/gi,
  /유료\s*(?:거래|양도)/gi,
  /실제\s*(?:돈|현금)/gi,

  // 화폐 표시 (더 정교하게)
  /\d+\s*원(?:\s*에)?/g,
  /\d{1,3}(?:,\d{3})+\s*원/g, // 1,000원 형식
  /₩\s*\d+/g,
  /\$\s*\d+/g,
  /\d+\s*달러/g,
  /\d+\s*won/gi,
  /\d+\s*usd/gi,
  /\d+\s*k원/gi, // 1k원, 10k원
  /\d+만\s*원/g,
  /만원/g,

  // 결제 관련
  /페이팔/gi,
  /paypal/gi,
  /토스\s*(?:송금|이체|페이)/gi,
  /계좌\s*이체/gi,
  /(?:현금|돈)\s*(?:받|주|보내)/gi,
  /입금\s*(?:해|하|부탁)/gi,
  /송금\s*(?:해|하|부탁)/gi,
  /무통장\s*입금/gi,

  // 가격 협상
  /얼마\s*(?:에|면|정도)/gi,
  /가격\s*(?:협의|조정|네고)/gi,
  /네고\s*(?:가능|됨|해)/gi,
  /(?:쿨|빠)\s*거래/gi,
  /급\s*(?:처|매)/gi,

  // 우회 표현 (초성, 띄어쓰기, 특수문자)
  /ㅎㄱㄹ/g, // 현거래
  /ㅎㅈ/g,   // 현질
  /ㄱㄹ/g,   // 거래
  /ㅎ금/g,   // 현금
  /현\s*금/g, // 현 금
  /돈\s*거\s*래/g,
  /캐\s*시/gi,
  /cash/gi,
  /rmt/gi,

  // 가격 표시 변형
  /\d+\s*\./g, // 숫자. 형식 (10. = 10만원)
  /\d+\s*k/gi, // 10k 형식
  /\d+\s*만/g, // 10만 형식

  // 거래 사이트/중개
  /(?:중고|거래)\s*(?:나라|장터)/gi,
  /번개\s*장터/gi,
  /당근\s*마켓/gi,
];

// 외부 링크 패턴
const EXTERNAL_LINK_PATTERNS = [
  /https?:\/\/[^\s]+/gi,
  /www\.[^\s]+/gi,
  /(?:\.com|\.net|\.org|\.io|\.kr|\.co\.kr)[^\s]*/gi,
];

/**
 * 메시지를 분석하여 필터링 필요 여부를 판단
 * @param {string} message - 검사할 메시지
 * @returns {Object} - { isFiltered, reasons, filteredMessage }
 */
function filterMessage(message) {
  const reasons = [];
  let filteredMessage = message;
  let isFiltered = false;

  // 1. 연락처 정보 감지
  CONTACT_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(message)) {
      isFiltered = true;
      reasons.push('contact_info');
      filteredMessage = filteredMessage.replace(pattern, '[연락처 정보 차단됨]');
    }
  });

  // 2. 계좌번호 감지
  ACCOUNT_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(message)) {
      isFiltered = true;
      reasons.push('account_number');
      filteredMessage = filteredMessage.replace(pattern, '[계좌번호 차단됨]');
    }
  });

  // 3. RMT 키워드 감지
  RMT_KEYWORDS.forEach((pattern, index) => {
    if (pattern.test(message)) {
      isFiltered = true;
      reasons.push('rmt_keyword');
      filteredMessage = filteredMessage.replace(pattern, '[부적절한 내용]');
    }
  });

  // 4. 외부 링크 감지 (선택적으로 사용)
  EXTERNAL_LINK_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(message)) {
      isFiltered = true;
      reasons.push('external_link');
      filteredMessage = filteredMessage.replace(pattern, '[링크 차단됨]');
    }
  });

  return {
    isFiltered,
    reasons: [...new Set(reasons)], // 중복 제거
    filteredMessage: isFiltered ? filteredMessage : message,
    originalMessage: message
  };
}

/**
 * 메시지가 스팸인지 감지 (연속된 같은 메시지 등)
 * @param {Array} recentMessages - 최근 메시지 배열
 * @param {string} newMessage - 새로운 메시지
 * @returns {boolean}
 */
function isSpam(recentMessages, newMessage) {
  // 최근 5개 메시지 중 3개 이상이 동일한 경우
  const sameMessageCount = recentMessages
    .slice(-5)
    .filter(msg => msg.message === newMessage)
    .length;

  if (sameMessageCount >= 3) {
    return true;
  }

  // 메시지가 너무 짧고 반복적인 경우 (예: "ㅋㅋㅋㅋㅋㅋ")
  const repeatingPattern = /(.)\1{5,}/;
  if (repeatingPattern.test(newMessage)) {
    return true;
  }

  return false;
}

/**
 * 메시지 위험도 점수 계산
 * @param {string} message - 메시지 내용
 * @returns {number} - 0-100 사이의 위험도 점수
 */
function calculateRiskScore(message) {
  let score = 0;
  let rmtCount = 0;

  // 연락처 정보: +30
  if (CONTACT_PATTERNS.some(pattern => pattern.test(message))) {
    score += 30;
  }

  // 계좌번호: +50 (위험도 증가)
  if (ACCOUNT_PATTERNS.some(pattern => pattern.test(message))) {
    score += 50;
  }

  // RMT 키워드: 매칭 개수에 따라 점수 증가
  RMT_KEYWORDS.forEach(pattern => {
    if (pattern.test(message)) {
      rmtCount++;
    }
  });

  if (rmtCount > 0) {
    // 1개: +25, 2개: +40, 3개 이상: +60
    if (rmtCount === 1) {
      score += 25;
    } else if (rmtCount === 2) {
      score += 40;
    } else {
      score += 60;
    }
  }

  // 외부 링크: +10
  if (EXTERNAL_LINK_PATTERNS.some(pattern => pattern.test(message))) {
    score += 10;
  }

  // 계좌번호 + RMT 키워드 조합: 추가 +20 (매우 위험)
  if (ACCOUNT_PATTERNS.some(p => p.test(message)) && rmtCount > 0) {
    score += 20;
  }

  // 연락처 + RMT 키워드 조합: 추가 +15
  if (CONTACT_PATTERNS.some(p => p.test(message)) && rmtCount > 0) {
    score += 15;
  }

  return Math.min(score, 100);
}

module.exports = {
  filterMessage,
  isSpam,
  calculateRiskScore
};
