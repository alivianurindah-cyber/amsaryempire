import { User } from '../types';
import { sql, isOffline } from './db';

const SESSION_KEY = 'geo_user_session';

// Helper to generate ID
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Map DB row (snake_case) to User object (camelCase)
const mapUser = (row: any): User => ({
  id: row.id,
  username: row.username,
  name: row.name,
  role: row.role as 'ADMIN' | 'STAFF',
  avatar: row.avatar,
  department: row.department,
  phone: row.phone,
  employeeId: row.employee_id,
  icNumber: row.ic_number,
  homeAddress: row.home_address,
  emergencyPhone: row.emergency_phone
});

export const getUsers = async (): Promise<User[]> => {
  try {
    if (isOffline) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      return users.map(mapUser);
    }

    const rows = await sql`SELECT * FROM users`;
    return rows.map(mapUser);
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

export const updateUser = async (updatedUser: Partial<User> & { id: string }): Promise<User> => {
  try {
    if (isOffline) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const index = users.findIndex((u: any) => u.id === updatedUser.id);
      
      if (index === -1) throw new Error("User not found");
      
      const existing = users[index];
      
      // Update fields (keeping snake_case storage format)
      const updatedRow = {
        ...existing,
        name: updatedUser.name ?? existing.name,
        phone: updatedUser.phone ?? existing.phone,
        ic_number: updatedUser.icNumber ?? existing.ic_number,
        home_address: updatedUser.homeAddress ?? existing.home_address,
        emergency_phone: updatedUser.emergencyPhone ?? existing.emergency_phone,
        department: updatedUser.department ?? existing.department,
        employee_id: updatedUser.employeeId ?? existing.employee_id
      };

      users[index] = updatedRow;
      localStorage.setItem('users', JSON.stringify(users));

      const mappedUser = mapUser(updatedRow);
      
      // Update local session if it matches
      const currentSession = getSession();
      if (currentSession && currentSession.id === mappedUser.id) {
          setSession(mappedUser);
      }
      return mappedUser;
    }

    // SQL Implementation
    const [existing] = await sql`SELECT * FROM users WHERE id = ${updatedUser.id}`;
    if (!existing) throw new Error("User not found");

    const name = updatedUser.name ?? existing.name;
    const phone = updatedUser.phone ?? existing.phone;
    const icNumber = updatedUser.icNumber ?? existing.ic_number;
    const homeAddress = updatedUser.homeAddress ?? existing.home_address;
    const emergencyPhone = updatedUser.emergencyPhone ?? existing.emergency_phone;
    const department = updatedUser.department ?? existing.department;
    const employeeId = updatedUser.employeeId ?? existing.employee_id;

    const [updatedRow] = await sql`
      UPDATE users 
      SET 
        name = ${name},
        phone = ${phone},
        ic_number = ${icNumber},
        home_address = ${homeAddress},
        emergency_phone = ${emergencyPhone},
        department = ${department},
        employee_id = ${employeeId}
      WHERE id = ${updatedUser.id}
      RETURNING *
    `;

    const mappedUser = mapUser(updatedRow);

    const currentSession = getSession();
    if (currentSession && currentSession.id === mappedUser.id) {
        setSession(mappedUser);
    }

    return mappedUser;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  if (isOffline) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const filtered = users.filter((u: any) => u.id !== id);
    localStorage.setItem('users', JSON.stringify(filtered));
    return;
  }
  await sql`DELETE FROM users WHERE id = ${id}`;
};

export const login = async (username: string, password: string): Promise<User> => {
  try {
    if (isOffline) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find((u: any) => u.username === username && u.password === password);
      if (user) return mapUser(user);
      
      // Fallback for demo: if no users exist at all, allow a default admin login
      if (users.length === 0 && username === 'admin' && password === 'admin') {
         const admin = await register('admin', 'admin', 'System Admin', 'Management');
         // Hack: Force role to admin for the first user
         const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
         allUsers[0].role = 'ADMIN';
         localStorage.setItem('users', JSON.stringify(allUsers));
         return { ...admin, role: 'ADMIN' };
      }
      
      throw new Error('Invalid credentials');
    }

    const [user] = await sql`SELECT * FROM users WHERE username = ${username} AND password = ${password}`;
    
    if (user) {
      return mapUser(user);
    }
    throw new Error('Invalid credentials');
  } catch (error: any) {
    console.error("Login error:", error);
    throw new Error(error.message || 'Authentication failed');
  }
};

export const register = async (username: string, password: string, name: string, department: string): Promise<User> => {
  try {
    const newUser = {
      id: generateId(),
      username,
      password,
      name,
      role: 'STAFF',
      department: department || 'General',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`,
      // Empty fields for profile
      phone: null,
      employee_id: null,
      ic_number: null,
      home_address: null,
      emergency_phone: null
    };

    if (isOffline) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      if (users.find((u: any) => u.username === username)) {
        throw new Error('Username already taken');
      }
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      return mapUser(newUser);
    }

    const [existing] = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existing) {
      throw new Error('Username already taken');
    }

    const [row] = await sql`
      INSERT INTO users (id, username, password, name, role, department, avatar)
      VALUES (${newUser.id}, ${newUser.username}, ${newUser.password}, ${newUser.name}, ${newUser.role}, ${newUser.department}, ${newUser.avatar})
      RETURNING *
    `;

    return mapUser(row);
  } catch (error) {
    console.error("Register error:", error);
    throw error;
  }
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