import { Router } from 'express';
import { createReview, getReviews, deleteReview, approveReview } from '../controllers/reviewController.js';
import { authenticateCustomerToken, authenticateToken, requireAdmin } from '../middleware/authMiddleware.js';
import { uploadReviewImage } from '../middleware/uploadMiddleware.js';

const router = Router();

// Middleware to gracefully handle multer errors (e.g. file too large or invalid type)
function handleUpload(req, res, next) {
  uploadReviewImage.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        error: 'Bad Request',
        message: err.message || 'File upload error.'
      });
    }
    next();
  });
}

// Public: Get all reviews (paginated, newest first)
router.get('/', getReviews);

// Protected: Submit a review (Authenticated customers only)
router.post('/', authenticateCustomerToken, handleUpload, createReview);

// Protected: Approve a review (Admin only)
router.put('/:id/approve', authenticateToken, requireAdmin, approveReview);

// Protected: Delete a review (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, deleteReview);

export default router;
