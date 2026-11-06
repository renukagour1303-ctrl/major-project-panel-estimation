import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create a new customer review
 * POST /api/reviews (Authenticated customer)
 */
export function createReview(req, res) {
  try {
    const { rating, comment } = req.body || {};
    const customer = req.customer;

    if (!customer) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required to post a review.'
      });
    }

    // Validate rating
    const parsedRating = parseInt(rating, 10);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Rating must be an integer between 1 and 5.'
      });
    }

    // Validate comment
    if (!comment || !comment.trim()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Review comment cannot be empty.'
      });
    }

    // Process image if uploaded
    let imagePath = null;
    if (req.file) {
      const filename = path.basename(req.file.filename.replace(/\\/g, '/'));
      imagePath = `/uploads/${filename}`;
    }

    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO reviews (customer_id, customer_name, rating, comment, image_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      customer.id,
      customer.name,
      parsedRating,
      comment.trim(),
      imagePath,
      now
    );

    const createdReview = {
      id: result.lastInsertRowid,
      customer_id: customer.id,
      customer_name: customer.name,
      rating: parsedRating,
      comment: comment.trim(),
      image_path: imagePath,
      image_url: imagePath,
      created_at: now
    };

    return res.status(201).json(createdReview);
  } catch (err) {
    console.error('Create review error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to submit review.'
    });
  }
}

/**
 * Get all reviews with pagination and optional status filter
 * GET /api/reviews (Public / Admin)
 */
export function getReviews(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status;

    let totalCount = 0;
    let rows = [];

    if (statusFilter && statusFilter !== 'all') {
      const totalRow = db.prepare('SELECT COUNT(*) as count FROM reviews WHERE status = ?').get(statusFilter);
      totalCount = totalRow ? totalRow.count : 0;
      rows = db.prepare(`
        SELECT id, customer_name, rating, comment, image_path, created_at, COALESCE(status, 'approved') as status
        FROM reviews
        WHERE status = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?
      `).all(statusFilter, limit, offset);
    } else {
      const totalRow = db.prepare('SELECT COUNT(*) as count FROM reviews').get();
      totalCount = totalRow ? totalRow.count : 0;
      rows = db.prepare(`
        SELECT id, customer_name, rating, comment, image_path, created_at, COALESCE(status, 'approved') as status
        FROM reviews
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?
      `).all(limit, offset);
    }

    const totalPages = Math.ceil(totalCount / limit) || 1;

    const formattedReviews = rows.map(r => {
      let imageUrl = null;
      if (r.image_path) {
        const clean = r.image_path.replace(/\\/g, '/');
        const filename = path.basename(clean);
        imageUrl = `/uploads/${filename}`;
      }
      return {
        id: r.id,
        customer_name: r.customer_name,
        rating: r.rating,
        comment: r.comment,
        image_url: imageUrl,
        status: r.status || 'approved',
        created_at: r.created_at
      };
    });

    return res.status(200).json({
      reviews: formattedReviews,
      page,
      totalPages,
      totalCount
    });
  } catch (err) {
    console.error('Get reviews error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve reviews.'
    });
  }
}

/**
 * Approve a pending review
 * PUT /api/reviews/:id/approve (Admin only)
 */
export function approveReview(req, res) {
  try {
    const reviewId = parseInt(req.params.id, 10);
    if (isNaN(reviewId)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid review ID.' });
    }

    const review = db.prepare('SELECT id FROM reviews WHERE id = ?').get(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Not Found', message: 'Review not found.' });
    }

    db.prepare("UPDATE reviews SET status = 'approved' WHERE id = ?").run(reviewId);

    return res.status(200).json({
      success: true,
      message: 'Review approved successfully.',
      reviewId,
      status: 'approved'
    });
  } catch (err) {
    console.error('Approve review error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to approve review.' });
  }
}

/**
 * Delete a review by ID
 * DELETE /api/reviews/:id (Admin only)
 */
export function deleteReview(req, res) {
  try {
    const reviewId = parseInt(req.params.id, 10);
    if (isNaN(reviewId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid review ID.'
      });
    }

    // Find review
    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId);
    if (!review) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Review not found.'
      });
    }

    // Delete image file from uploads directory if exists
    if (review.image_path) {
      try {
        const clean = review.image_path.replace(/\\/g, '/');
        const filename = path.basename(clean);
        const filePath = path.resolve(__dirname, '../../uploads', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileErr) {
        console.warn('Error deleting review image file:', fileErr.message);
      }
    }

    // Delete review record from database
    db.prepare('DELETE FROM reviews WHERE id = ?').run(reviewId);

    return res.status(200).json({
      message: 'Review deleted'
    });
  } catch (err) {
    console.error('Delete review error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete review.'
    });
  }
}
