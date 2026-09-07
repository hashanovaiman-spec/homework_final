export interface IProductEditData {
  title: string;
  description: string;
  price: string;
  mainImage?: string;
  newImages?: string;
  commentsToRemove?: string | string[];
  imagesToRemove?: string | string[];
  similarToRemove?: string | string[];
  similarToAdd?: string | string[];
}

export interface INewProductData {
  title: string;
  description: string;
  price: string;
}
