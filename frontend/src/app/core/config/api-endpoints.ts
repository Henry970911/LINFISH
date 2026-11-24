import { environment } from '../../../environments/environment';

export const API_ENDPOINTS = {
  products: `${environment.apiBaseUrl}/products`,
  categories: `${environment.apiBaseUrl}/categories`,
  orders: `${environment.apiBaseUrl}/orders`,
  profile: `${environment.apiBaseUrl}/profile`,
} as const;
