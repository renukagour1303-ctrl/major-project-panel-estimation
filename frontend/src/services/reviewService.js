import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Resolves review image URL dynamically using the configured API base or environment fallback.
 * Handles relative paths (/uploads/..., uploads/...), Windows backslashes (uploads\...),
 * and absolute URLs (https://...).
 *
 * @param {string|null} imagePath
 * @returns {string|null}
 */
export function getReviewImageUrl(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') return null;

  // If already an absolute URL (e.g. http:// or https://), return it directly
  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  // Normalize Windows backslashes to forward slashes
  let cleanPath = imagePath.replace(/\\/g, '/');

  // Strip leading segment variations like "uploads/" or "/uploads/" to prevent duplicate segments
  cleanPath = cleanPath.replace(/^\/?uploads\//i, '');

  // Re-attach single leading /uploads/ segment
  cleanPath = `/uploads/${cleanPath}`.replace(/\/+/g, '/');

  // If VITE_API_BASE_URL is an absolute URL (e.g. http://localhost:5000/api),
  // extract its origin (e.g. http://localhost:5000) and prepend it.
  const configuredApiBase = import.meta.env.VITE_API_BASE_URL || '';
  if (/^https?:\/\//i.test(configuredApiBase)) {
    try {
      const url = new URL(configuredApiBase);
      return `${url.origin}${cleanPath}`;
    } catch {
      // Fallback if URL parsing fails
    }
  }

  // Otherwise return the clean relative path, which is proxied by Vite dev server
  // and served by Express/reverse proxies.
  return cleanPath;
}

/**
 * Fetch paginated reviews (public or admin with status filter)
 */
export async function fetchReviews(page = 1, status = 'all') {
  const url = status && status !== 'all' 
    ? `${API_BASE}/reviews?page=${page}&status=${status}` 
    : `${API_BASE}/reviews?page=${page}`;
  const response = await axios.get(url);
  const data = response.data;
  if (data && Array.isArray(data.reviews)) {
    data.reviews = data.reviews.map(r => ({
      ...r,
      image_url: getReviewImageUrl(r.image_url || r.image_path)
    }));
  }
  return data;
}

/**
 * Submit a customer review with optional image
 */
export async function submitReview({ rating, comment, imageFile }, customerToken) {
  const formData = new FormData();
  formData.append('rating', rating);
  formData.append('comment', comment);
  if (imageFile) {
    formData.append('image', imageFile);
  }

  const response = await axios.post(`${API_BASE}/reviews`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${customerToken}`
    }
  });

  const created = response.data;
  if (created && (created.image_url || created.image_path)) {
    created.image_url = getReviewImageUrl(created.image_url || created.image_path);
  }
  return created;
}

/**
 * Approve a pending review (Admin only)
 */
export async function approveReview(reviewId, adminToken) {
  const response = await axios.put(`${API_BASE}/reviews/${reviewId}/approve`, {}, {
    headers: {
      Authorization: `Bearer ${adminToken}`
    }
  });
  return response.data;
}

/**
 * Delete a review by ID (Admin only)
 */
export async function deleteReview(reviewId, adminToken) {
  const response = await axios.delete(`${API_BASE}/reviews/${reviewId}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`
    }
  });
  return response.data;
}
