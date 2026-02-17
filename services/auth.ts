import { User } from '../types';
import { sql } from './db';

const SESSION_KEY = 'geo_user_session';

// Helper to generate ID
const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Map DB row to User object (converting snake_case to camelCase)
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
    const rows = await sql`SELECT * FROM users`;
    return rows.map(mapUser);
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

export const updateUser = async (updatedUser: Partial<User> & { id: string }): Promise<User> => {
  // We construct the update query dynamically or field by field
  // For simplicity with sql template literals, we'll update specific profile fields
  // Note: In a real app, ensure you handle partial updates more robustly.
  
  try {
    // Check if user exists
    const [existing] = await sql`SELECT * FROM users WHERE id = ${updatedUser.id}`;
    if (!existing) throw new Error("User not found");

    // We will update the fields that are common in the profile form
    // If a field is undefined in updatedUser, we default to the existing value to avoid overwriting with null
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

    // Update local session if it matches
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
  await sql`DELETE FROM users WHERE id = ${id}`;
};

export const login = async (username: string, password: string): Promise<User> => {
  try {
    const [user] = await sql`SELECT * FROM users WHERE username = ${username} AND password = ${password}`;
    
    if (user) {
      return mapUser(user);
    }
    throw new Error('Invalid credentials');
  } catch (error: any) {
    console.error("Login error:", error);
    throw new Error(error.message || 'Database connection failed');
  }
};

export const register = async (username: string, password: string, name: string, department: string): Promise<User> => {
  try {
    // Check existing
    const [existing] = await sql`SELECT id FROM users WHERE username = ${username}`;
    if (existing) {
      throw new Error('Username already taken');
    }

    const newUser = {
      id: generateId(),
      username,
      password,
      name,
      role: 'STAFF',
      department: department || 'General',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`
    };

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

// Session management remains client-side (localStorage) for persistence
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