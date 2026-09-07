export interface Comment {
  id: string;
  name: string;
  email: string;
  body: string;
  productId: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  main: boolean;
  url: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail?: ProductImage;
  comments?: Comment[];
  images?: ProductImage[];
}

export interface SimilarProduct {
  id: string;
  title: string;
  description: string;
  price: number;
}
