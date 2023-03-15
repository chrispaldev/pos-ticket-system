export interface ICategory {
  _id?: string;
  name: string;
  description?: string;
  parent?: null | string | ICategory;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum CategoryType {
  Category = 'category',
  SubCategory = 'subcategory',
}
