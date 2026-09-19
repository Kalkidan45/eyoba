import { AuthUser } from '../types';

export interface StaticAccount {
  username: string;
  passwordHash: string; // Plain/static match for quick, reliable terminal access
  displayName: string;
  role: 'admin' | 'manager' | 'cashier';
  storeName: string;
}

// Built-in static credentials - Admin Account Only
export const DEFAULT_STATIC_ACCOUNTS: StaticAccount[] = [
  {
    username: 'admin',
    passwordHash: 'admin123',
    displayName: 'Store Administrator',
    role: 'admin',
    storeName: 'Apparel Boutique & Wholesale',
  },
];

const AUTH_STORAGE_KEY = 'apparel_pos_authenticated_user';

export const getStoredAuthUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch (e) {
    console.error('Failed to parse auth user from storage', e);
    return null;
  }
};

export const saveAuthUser = (user: AuthUser | null) => {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to save auth user to storage', e);
  }
};

export const authenticateWithUsernamePassword = (
  usernameInput: string,
  passwordInput: string
): { success: boolean; user?: AuthUser; error?: string } => {
  const cleanUsername = usernameInput.trim().toLowerCase();
  const cleanPassword = passwordInput.trim();

  if (!cleanUsername || !cleanPassword) {
    return { success: false, error: 'Please enter both username and password.' };
  }

  const account = DEFAULT_STATIC_ACCOUNTS.find(
    (acc) => acc.username.toLowerCase() === cleanUsername
  );

  if (!account) {
    return { 
      success: false, 
      error: 'Invalid username. Please use the "admin" account.' 
    };
  }

  if (account.passwordHash !== cleanPassword) {
    return { 
      success: false, 
      error: 'Incorrect password for this user.' 
    };
  }

  const authenticatedUser: AuthUser = {
    id: `user-${account.username}`,
    username: account.username,
    displayName: account.displayName,
    role: account.role,
    storeName: account.storeName,
    loginTime: new Date().toISOString(),
  };

  saveAuthUser(authenticatedUser);

  return {
    success: true,
    user: authenticatedUser,
  };
};

export const logoutStaticUser = () => {
  saveAuthUser(null);
};
