export type UserRole = 'admin' | 'kitchen' | 'cashier';

export type AuthUser = {
  id: number;
  username: string;
  role: UserRole;
};

export type MenuItem = {
  id: number;
  name: string;
  price: number;
  description?: string;
  isAvailable?: boolean;
};

export type OrderStatus = 'pending_payment' | 'received' | 'preparing' | 'ready' | 'served' | 'canceled';

export type OrderItem = {
  menuId: number;
  name?: string;
  quantity: number;
  note?: string;
};

export type Order = {
  id: number;
  table?: string;
  items: OrderItem[];
  status: OrderStatus;
  total: number;
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  paymentMethod?: string;
  paymentReference?: string;
  midtransOrderId?: string;
  midtransTransactionStatus?: string;
  paidAmount?: number;
  paidAt?: string;
  canceledAt?: string;
  refundedAt?: string;
  correctionReason?: string;
  createdAt?: string;
  updatedAt?: string;
};
