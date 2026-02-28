import { User } from '../types';
import { sql, isTrulyOnline } from './db';
import { safeJSONParse } from '../src/utils/json';

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
  emergencyPhone: row.emergency_phone,
  typhoidCertificateUrl: row.typhoid_certificate_url,
  typhoidExpiryDate: row.typhoid_expiry_date,
  typhoidVerificationStatus: row.typhoid_verification_status,
  typhoidVerificationDetails: row.typhoid_verification_details,
  shiftStart: row.shift_start,
  shiftEnd: row.shift_end,
  baseSalary: row.base_salary ? Number(row.base_salary) : undefined,
  salaryType: row.salary_type
});

export const getUsers = async (): Promise<User[]> => {
  try {
    if (!isTrulyOnline()) {
      const users = safeJSONParse(localStorage.getItem('users'), []);
      return users.map(mapUser);
    }

    const rows = await sql`SELECT * FROM users`;
    return rows.map(mapUser);
  } catch (error) {
    console.error("Error fetching users from SQL, falling back to local:", error);
    const users = safeJSONParse(localStorage.getItem('users'), []);
    return users.map(mapUser);
  }
};

export const updateUser = async (updatedUser: Partial<User> & { id: string }): Promise<User> => {
  const updateLocal = () => {
    const users = safeJSONParse<any[]>(localStorage.getItem('users'), []);
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
      typhoid_certificate_url: updatedUser.typhoidCertificateUrl ?? existing.typhoid_certificate_url,
      typhoid_expiry_date: updatedUser.typhoidExpiryDate ?? existing.typhoid_expiry_date,
      typhoid_verification_status: updatedUser.typhoidVerificationStatus ?? existing.typhoid_verification_status,
      typhoid_verification_details: updatedUser.typhoidVerificationDetails ?? existing.typhoid_verification_details,
      department: updatedUser.department ?? existing.department,
      employee_id: updatedUser.employeeId ?? existing.employee_id,
      shift_start: updatedUser.shiftStart ?? existing.shift_start,
      shift_end: updatedUser.shiftEnd ?? existing.shift_end,
      base_salary: updatedUser.baseSalary ?? existing.base_salary,
      salary_type: updatedUser.salaryType ?? existing.salary_type
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
  };

  if (!isTrulyOnline()) {
    return updateLocal();
  }

  try {
    // SQL Implementation
    const [existing] = await sql`SELECT * FROM users WHERE id = ${updatedUser.id}`;
    if (!existing) throw new Error("User not found");

    const name = updatedUser.name ?? existing.name;
    const phone = updatedUser.phone ?? existing.phone;
    const icNumber = updatedUser.icNumber ?? existing.ic_number;
    const homeAddress = updatedUser.homeAddress ?? existing.home_address;
    const emergencyPhone = updatedUser.emergencyPhone ?? existing.emergency_phone;
    const typhoidCertificateUrl = updatedUser.typhoidCertificateUrl ?? existing.typhoid_certificate_url;
    const typhoidExpiryDate = updatedUser.typhoidExpiryDate ?? existing.typhoid_expiry_date;
    const typhoidVerificationStatus = updatedUser.typhoidVerificationStatus ?? existing.typhoid_verification_status;
    const typhoidVerificationDetails = updatedUser.typhoidVerificationDetails ?? existing.typhoid_verification_details;
    const department = updatedUser.department ?? existing.department;
    const employeeId = updatedUser.employeeId ?? existing.employee_id;
    const shiftStart = updatedUser.shiftStart ?? existing.shift_start;
    const shiftEnd = updatedUser.shiftEnd ?? existing.shift_end;
    const baseSalary = updatedUser.baseSalary ?? existing.base_salary;
    const salaryType = updatedUser.salaryType ?? existing.salary_type;

    const [updatedRow] = await sql`
      UPDATE users 
      SET 
        name = ${name ?? null},
        phone = ${phone ?? null},
        ic_number = ${icNumber ?? null},
        home_address = ${homeAddress ?? null},
        emergency_phone = ${emergencyPhone ?? null},
        typhoid_certificate_url = ${typhoidCertificateUrl ?? null},
        typhoid_expiry_date = ${typhoidExpiryDate ?? null},
        typhoid_verification_status = ${typhoidVerificationStatus ?? null},
        typhoid_verification_details = ${typhoidVerificationDetails ?? null},
        department = ${department ?? null},
        employee_id = ${employeeId ?? null},
        shift_start = ${shiftStart ?? null},
        shift_end = ${shiftEnd ?? null},
        base_salary = ${baseSalary ?? null},
        salary_type = ${salaryType ?? null}
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
    console.error("Error updating user in SQL, updating local:", error);
    return updateLocal();
  }
};

export const deleteUser = async (id: string): Promise<void> => {
  const deleteLocal = () => {
    const users = safeJSONParse<any[]>(localStorage.getItem('users'), []);
    const filtered = users.filter((u: any) => u.id !== id);
    localStorage.setItem('users', JSON.stringify(filtered));
  };

  if (!isTrulyOnline()) {
    deleteLocal();
    return;
  }
  try {
    await sql`DELETE FROM users WHERE id = ${id}`;
  } catch (e) {
    console.error("Error deleting user from SQL, deleting local:", e);
    deleteLocal();
  }
};

export const login = async (username: string, password: string): Promise<User> => {
  const loginLocal = () => {
    const users = safeJSONParse<any[]>(localStorage.getItem('users'), []);
    const user = users.find((u: any) => u.username === username && u.password === password);
    if (user) return mapUser(user);
    
    // Fallback for demo: if no users exist at all, allow a default admin login
    if (users.length === 0 && username === 'admin' && password === 'admin') {
       // This is a bit complex as register is async, but for local it's fine
       return null; 
    }
    
    return null;
  };

  try {
    if (!isTrulyOnline()) {
      const u = loginLocal();
      if (u) return u;
      
      // Special case for default admin
      if (username === 'admin' && password === 'admin') {
          const admin = await register('admin', 'admin', 'System Admin', 'Management');
          const allUsers = safeJSONParse<any[]>(localStorage.getItem('users'), []);
          allUsers[allUsers.length-1].role = 'ADMIN';
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
    // If SQL fails, try local as fallback
    const u = loginLocal();
    if (u) return u;
    throw new Error(error.message || 'Authentication failed');
  }
};

export const register = async (username: string, password: string, name: string, department: string): Promise<User> => {
  const registerLocal = () => {
    const newUser = {
      id: generateId(),
      username,
      password,
      name,
      role: 'STAFF',
      department: department || 'General',
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`,
      phone: null,
      employee_id: null,
      ic_number: null,
      home_address: null,
      emergency_phone: null
    };

    const users = safeJSONParse<any[]>(localStorage.getItem('users'), []);
    if (users.find((u: any) => u.username === username)) {
      throw new Error('Username already taken');
    }
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    return mapUser(newUser);
  };

  try {
    if (!isTrulyOnline()) {
      return registerLocal();
    }

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
    console.error("Register error in SQL, registering local:", error);
    try {
        return registerLocal();
    } catch (e) {
        throw error; // Throw original SQL error if local also fails (e.g. username taken)
    }
  }
};

export const getSession = (): User | null => {
  const saved = localStorage.getItem(SESSION_KEY);
  return safeJSONParse<User | null>(saved, null);
};

export const setSession = (user: User) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};