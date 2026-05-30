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
};

export type OrderStatus = 'received' | 'preparing' | 'ready' | 'served';

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
  createdAt?: string;
  updatedAt?: string;
};
