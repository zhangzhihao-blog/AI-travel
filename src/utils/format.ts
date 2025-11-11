/**
 * 格式化货币显示
 * @param amount 金额
 * @param currency 货币符号，默认为¥
 * @returns 格式化后的货币字符串
 */
export const formatCurrency = (amount: number, currency: string = '¥'): string => {
  return `${currency}${amount.toFixed(2)}`;
};

/**
 * 格式化日期显示
 * @param date 日期
 * @returns 格式化后的日期字符串
 */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};