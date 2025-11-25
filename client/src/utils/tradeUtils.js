/**
 * Trade utility functions and constants
 */

export const TRADE_TYPE_LABELS = {
  server: '서버 직거래',
  eternalland: '이터널랜드'
};

export const STATUS_LABELS = {
  active: '거래중',
  completed: '거래완료',
  cancelled: '취소됨'
};

export const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700 border border-green-300',
  completed: 'bg-gray-100 text-gray-700 border border-gray-300',
  cancelled: 'bg-red-100 text-red-700 border border-red-300'
};

export const getTradeTypeLabel = (type) => TRADE_TYPE_LABELS[type] || type;
export const getStatusLabel = (status) => STATUS_LABELS[status] || status;
export const getStatusColor = (status) => STATUS_COLORS[status] || 'bg-gray-100 text-gray-700 border border-gray-300';
