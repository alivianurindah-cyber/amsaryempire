import { User } from '../types';

const USERS_DB_KEY = 'geo_users_db';
const SESSION_KEY = 'geo_user_session';

interface StoredUser extends User {
  password: string;
}

// Utility to generate IDs safely
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Default seed data with passwords
const DEFAULT_USERS: StoredUser[] = [
  {
    id: 'u1',
    username: 'admin',
    password: 'password', 
    name: 'Chef Ammar',
    role: 'ADMIN',
    avatar: 'https://ui-avatars.com/api/?name=Chef+Ammar&background=4f46e5&color=fff',
    department: 'Executive',
    phone: '555-0100',
    employeeId: 'ADM-001'
  },
  {
    id: 'u2',
    username: 'staff',
    password: 'password', 
    name: 'Alex Johnson',
    role: 'STAFF',
    avatar: 'https://ui-avatars.com/api/?name=Alex+Johnson&background=0ea5e9&color=fff',
    department: 'Kitchen',
    // Missing phone/employeeId to trigger onboarding flow for demo
  }
];

// Initialize DB from LocalStorage or Seed
const getDB = (): StoredUser[] => {
  const stored = localStorage.getItem(USERS_DB_KEY);
  if (!stored) {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  return JSON.parse(stored);
};

const saveDB = (users: StoredUser[]) => {
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
};

export const getUsers = async (): Promise<User[]> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return getDB().map(({ password, ...user }) => user);
};

export const updateUser = async (updatedUser: Partial<User> & { id: string }): Promise<User> => {
  const users = getDB();
  const index = users.findIndex(u => u.id === updatedUser.id);
  
  if (index === -1) throw new Error('User not found');
  
  // Merge updates - filter out undefined to ensure we don't corrupt data
  const cleanUpdates = Object.fromEntries(
    Object.entries(updatedUser).filter(([_, v]) => v !== undefined)
  );

  users[index] = { ...users[index], ...cleanUpdates };
  saveDB(users);
  
  // Update session if it's the current user
  const currentSession = getSession();
  if (currentSession && currentSession.id === updatedUser.id) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...safeUser } = users[index];
    setSession(safeUser);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...safeUser } = users[index];
  return safeUser;
};

export const deleteUser = async (id: string): Promise<void> => {
  const users = getDB();
  const newUsers = users.filter(u => u.id !== id);
  saveDB(newUsers);
};

export const login = async (username: string, password: string): Promise<User> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const users = getDB();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  
  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...safeUser } = user;
    return safeUser;
  }
  throw new Error('Invalid credentials');
};

export const register = async (username: string, password: string, name: string, department: string): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  const users = getDB();
  
  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Username already taken');
  }

  const newUser: StoredUser = {
    id: generateId(),
    username,
    password,
    name,
    role: 'STAFF', 
    department: department || 'General',
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`
  };

  users.push(newUser);
  saveDB(users);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...safeUser } = newUser;
  return safeUser;
};

export const getSession = (): User | null => {
  const saved = localStorage.getItem(SESSION_KEY);
  return saved ? JSON.parse(saved) : null;
};

export const setSession = (user: User) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};