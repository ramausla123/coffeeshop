export const ORDER_STATUSES = ['received', 'preparing', 'ready', 'served', 'canceled'] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.includes(value as OrderStatus);
}
