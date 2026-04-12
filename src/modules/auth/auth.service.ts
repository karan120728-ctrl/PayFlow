import bcrypt from 'bcrypt';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../../config/db';
import { RegisterInput, LoginInput } from './auth.schema';
import { AppError } from '../../core/errors';

export class AuthService {
  static async register(data: RegisterInput) {
    // Check if user exists
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT id FROM users WHERE email = ?', [data.email]);
    if (rows.length > 0) {
      throw new AppError('Email already in use', 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Insert user
    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [data.name, data.email, hashedPassword]
    );

    return {
      id: result.insertId,
      name: data.name,
      email: data.email
    };
  }

  static async login(data: LoginInput) {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM users WHERE email = ?', [data.email]);
    
    if (rows.length === 0) {
      throw new AppError('Invalid credentials', 401);
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(data.password, user.password);

    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email
    };
  }
}
