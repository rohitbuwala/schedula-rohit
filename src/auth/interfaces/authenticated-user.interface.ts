import { UserRole } from '../../users/user-role.enum';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
