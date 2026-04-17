export type UserRole = 'CREATE' | 'EDIT' | 'DELETE' | 'READ';

export interface User {
  id: string;
  name: string;
  lastName: string;
  email: string;
  address: string | null;
  roles: UserRole[];
  active: boolean;
}

export interface UserRequest {
  name: string;
  lastName: string;
  email: string;
  password: string;
  address: string | null;
  roles: UserRole[];
  active?: boolean;
}
