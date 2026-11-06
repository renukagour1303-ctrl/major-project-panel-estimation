import bcrypt from 'bcryptjs';
import db from '../database/db.js';

/**
 * Protected endpoint (ADMIN ONLY): Get all staff members
 */
export function getStaffList(req, res) {
  try {
    const staff = db.prepare(`
      SELECT 
        id, 
        username, 
        email, 
        full_name as fullName, 
        role, 
        is_active as isActive, 
        created_at as createdAt, 
        updated_at as updatedAt
      FROM users
      ORDER BY id ASC
    `).all();

    return res.status(200).json({
      success: true,
      data: staff,
      users: staff
    });
  } catch (err) {
    console.error('Error fetching staff list:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve staff users.'
    });
  }
}

/**
 * Protected endpoint (ADMIN ONLY): Create a new staff account
 */
export function createStaff(req, res) {
  try {
    const { username, email, fullName, password, role = 'STAFF' } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username is required.'
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email is required.'
      });
    }

    const nameToUse = (fullName && fullName.trim()) ? fullName.trim() : username.trim();

    if (!password || password.length < 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 6 characters.'
      });
    }

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();

    // Check duplicate username or email
    const existing = db.prepare(`
      SELECT id, username, email FROM users 
      WHERE LOWER(username) = ? OR LOWER(email) = ?
    `).get(trimmedUsername, trimmedEmail);

    if (existing) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A user with this username or email already exists.'
      });
    }

    const lowerRole = (role || 'staff').toLowerCase();
    const assignedRole = lowerRole === 'admin' ? (role === 'ADMIN' ? 'ADMIN' : 'admin') : (role === 'STAFF' ? 'STAFF' : 'staff');
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      trimmedUsername,
      trimmedEmail,
      passwordHash,
      nameToUse,
      assignedRole,
      1,
      now,
      now
    );

    return res.status(201).json({
      success: true,
      message: `User '${trimmedUsername}' successfully created with role ${assignedRole}.`,
      user: {
        id: result.lastInsertRowid,
        username: trimmedUsername,
        email: trimmedEmail,
        fullName: nameToUse,
        role: assignedRole,
        isActive: 1,
        createdAt: now
      }
    });
  } catch (err) {
    console.error('Error creating staff account:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create staff account.'
    });
  }
}

/**
 * Protected endpoint (ADMIN ONLY): Update staff account active status (activate / deactivate)
 */
export function updateStaffStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined || (isActive !== 0 && isActive !== 1 && isActive !== true && isActive !== false)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'isActive (boolean 0/1 or true/false) is required.'
      });
    }

    const targetUser = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(id);
    if (!targetUser) {
      return res.status(404).json({
        error: 'Not Found',
        message: `User with ID ${id} not found.`
      });
    }

    // Prevent deactivating own account
    if (req.user && req.user.id === Number(id) && (isActive === 0 || isActive === false)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'You cannot deactivate your own administrative account.'
      });
    }

    const activeVal = (isActive === 1 || isActive === true) ? 1 : 0;
    const now = new Date().toISOString();

    db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').run(activeVal, now, id);

    return res.status(200).json({
      success: true,
      message: `User ${targetUser.username} status updated to ${activeVal === 1 ? 'Active' : 'Deactivated'}.`,
      userId: Number(id),
      isActive: activeVal
    });
  } catch (err) {
    console.error('Error updating staff status:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user status.'
    });
  }
}

/**
 * Protected endpoint (ADMIN ONLY): Permanently delete a team member/staff user
 */
export function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const targetUser = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(id);
    if (!targetUser) {
      return res.status(404).json({
        error: 'Not Found',
        message: `User with ID ${id} not found.`
      });
    }

    // Prevent deleting own account
    if (req.user && req.user.id === Number(id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'You cannot delete your own administrative account.'
      });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    return res.status(200).json({
      success: true,
      message: `User '${targetUser.username}' deleted successfully.`,
      deletedUserId: Number(id)
    });
  } catch (err) {
    console.error('Error deleting user:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete user.'
    });
  }
}
