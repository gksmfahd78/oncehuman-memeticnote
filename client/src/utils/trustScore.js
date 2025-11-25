/**
 * Trust score utility functions
 */

export const getTrustScoreColor = (score) => {
  if (score >= 40) return 'text-green-600';
  if (score >= 37) return 'text-blue-600';
  if (score >= 34) return 'text-orange-600';
  return 'text-red-600';
};

export const getTrustScoreEmoji = (score) => {
  if (score >= 40) return '😊';
  if (score >= 37) return '🙂';
  if (score >= 34) return '😐';
  return '😞';
};

export const getTrustScoreLabel = (score) => {
  if (score >= 40) return '매우 신뢰';
  if (score >= 37) return '신뢰';
  if (score >= 34) return '보통';
  return '주의';
};
