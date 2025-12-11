export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  stock: number;
  platform?: string;
  genre?: string;
  sellerId?: string;
  sellerName?: string;
}

export interface CartItem extends Product {
  quantity: number;
}
