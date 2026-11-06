import React, { useState, useEffect, useRef } from 'react';
import { Star, MessageSquare, Image as ImageIcon, Send, X, LogIn, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext.jsx';
import { fetchReviews, submitReview, getReviewImageUrl } from '../services/reviewService.js';

export default function ReviewsSection() {
  const { customer, customerToken, isCustomerLoggedIn } = useCustomerAuth();

  const [reviews, setReviews] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Form State
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Image Modal Preview State
  const [modalImage, setModalImage] = useState(null);

  const fileInputRef = useRef(null);

  const loadReviews = async (page = 1) => {
    setIsLoading(true);
    setLoadError('');
    try {
      const data = await fetchReviews(page);
      if (data && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
        setCurrentPage(data.page || 1);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
      }
    } catch (err) {
      console.warn('Failed to load reviews:', err);
      setLoadError(err.response?.data?.message || err.message || 'Unable to load customer reviews at this time.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews(currentPage);
  }, [currentPage]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
      setFormError('Please select a JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image size must be less than 5MB.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFormError('');
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!comment.trim()) {
      setFormError('Please write a comment for your review.');
      return;
    }

    if (rating < 1 || rating > 5) {
      setFormError('Please select a star rating between 1 and 5.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      await submitReview({ rating, comment: comment.trim(), imageFile }, customerToken);
      setFormSuccess('Thank you! Your review has been submitted.');
      setComment('');
      setRating(5);
      handleRemoveImage();
      // Reload reviews list
      loadReviews(1);
      setTimeout(() => setFormSuccess(''), 4000);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to submit review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (starCount) => {
    return (
      <div className="review-stars-display" style={{ display: 'inline-flex', gap: '3px' }}>
        {[1, 2, 3, 4, 5].map((starIndex) => (
          <Star
            key={starIndex}
            size={16}
            fill={starIndex <= starCount ? '#f59e0b' : 'transparent'}
            color={starIndex <= starCount ? '#f59e0b' : '#64748b'}
          />
        ))}
      </div>
    );
  };

  return (
    <section id="customer-reviews-section" className="customer-reviews-section">
      <div className="section-header-centered">
        <span className="badge-pill">Customer Stories</span>
        <h2>What Our Solar Clients Say</h2>
        <p>Verified reviews and rooftop installations from residential and commercial clients across Maharashtra</p>
      </div>

      {/* Review Submission Area */}
      <div className="review-submission-container">
        {isCustomerLoggedIn ? (
          <div className="review-form-card">
            <div className="review-form-header">
              <MessageSquare size={20} className="text-emerald" />
              <div>
                <h3>Share Your Solar Experience</h3>
                <p>Posting as <strong>{customer?.name}</strong> ({customer?.email})</p>
              </div>
            </div>

            {formSuccess && (
              <div className="alert-success-banner" style={{ margin: '14px 0' }}>
                <CheckCircle2 size={18} />
                <span>{formSuccess}</span>
              </div>
            )}

            {formError && (
              <div className="auth-error-alert" style={{ margin: '14px 0' }}>
                <AlertCircle size={18} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="review-form">
              {/* Clickable Star Rating */}
              <div className="form-group">
                <label>Your Rating *</label>
                <div className="star-rating-selector" style={{ display: 'flex', gap: '8px', cursor: 'pointer', marginTop: '6px' }}>
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isFilled = starValue <= (hoverRating || rating);
                    return (
                      <button
                        type="button"
                        key={starValue}
                        onClick={() => setRating(starValue)}
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'inline-flex'
                        }}
                        title={`${starValue} out of 5 stars`}
                      >
                        <Star
                          size={28}
                          fill={isFilled ? '#f59e0b' : 'transparent'}
                          color={isFilled ? '#f59e0b' : '#64748b'}
                          style={{ transition: 'transform 0.15s ease' }}
                        />
                      </button>
                    );
                  })}
                  <span style={{ marginLeft: '10px', color: '#f59e0b', fontWeight: '600', alignSelf: 'center', fontSize: '15px' }}>
                    {rating} / 5 Stars
                  </span>
                </div>
              </div>

              {/* Comment Textarea */}
              <div className="form-group">
                <label htmlFor="reviewComment">Your Feedback & Experience *</label>
                <textarea
                  id="reviewComment"
                  rows="3"
                  placeholder="Share details about your solar estimation, power savings, or installation experience..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                ></textarea>
              </div>

              {/* Optional Image Upload */}
              <div className="form-group">
                <label>Add a Photo of Your Roof or Solar Setup (Optional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                    id="reviewImageInput"
                  />
                  <label htmlFor="reviewImageInput" className="btn-secondary" style={{ cursor: 'pointer', margin: 0, padding: '8px 16px' }}>
                    <ImageIcon size={16} />
                    <span>{imageFile ? 'Change Photo' : 'Upload Photo (Max 5MB)'}</span>
                  </label>

                  {imagePreview && (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{
                          width: '64px',
                          height: '64px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '2px solid #059669'
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        title="Remove photo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="spinner-sm"></span>
                      <span>Submitting Review...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Post Review</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="review-login-prompt-card">
            <div className="rlp-content">
              <MessageSquare size={26} className="text-emerald" />
              <div>
                <h4>Have you installed solar with Sungroves?</h4>
                <p>Sign in to your customer account to share your rooftop feedback, photos, and ratings.</p>
              </div>
            </div>
            <Link to="/login" className="btn-primary" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
              <LogIn size={16} />
              <span>Login to leave a review</span>
            </Link>
          </div>
        )}
      </div>

      {/* Reviews Display Grid */}
      <div className="reviews-list-container">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <span className="spinner-sm" style={{ width: '28px', height: '28px', borderWidth: '3px' }}></span>
            <p style={{ marginTop: '12px' }}>Loading customer reviews...</p>
          </div>
        ) : loadError ? (
          <div className="no-reviews-state" style={{ textAlign: 'center', padding: '36px 20px', background: 'rgba(239, 68, 68, 0.08)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertCircle size={32} color="#f87171" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ color: '#f8fafc', fontSize: '16px', marginBottom: '6px' }}>Unable to Load Reviews</h4>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>{loadError}</p>
            <button type="button" className="btn-secondary" onClick={() => loadReviews(currentPage)}>
              Try Again
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="no-reviews-state" style={{ textAlign: 'center', padding: '48px 24px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Star size={36} color="#64748b" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ color: '#f8fafc', fontSize: '18px', marginBottom: '6px' }}>No Reviews Yet</h4>
            <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '440px', margin: '0 auto' }}>
              Be the first customer to share your solar rooftop experience with the Sungroves community!
            </p>
          </div>
        ) : (
          <>
            <div className="reviews-cards-grid">
              {reviews.map((rev) => (
                <div key={rev.id} className="review-card-item">
                  <div className="review-card-top">
                    <div>
                      <h4 className="reviewer-name">{rev.customer_name}</h4>
                      <span className="review-date">
                        {new Date(rev.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    {renderStars(rev.rating)}
                  </div>

                  <p className="review-comment-text">{rev.comment}</p>

                  {rev.image_url && (
                    <div className="review-image-thumbnail-wrap">
                      <img
                        src={getReviewImageUrl(rev.image_url)}
                        alt={`Photo shared by ${rev.customer_name}`}
                        className="review-thumb-img"
                        onClick={() => setModalImage(getReviewImageUrl(rev.image_url))}
                        onError={(e) => {
                          if (e.currentTarget?.parentElement) {
                            e.currentTarget.parentElement.style.display = 'none';
                          }
                        }}
                        title="Click to zoom in"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="reviews-pagination">
                <button
                  type="button"
                  className="btn-secondary pagination-btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>

                <span className="pagination-info">
                  Page {currentPage} of {totalPages} ({totalCount} total)
                </span>

                <button
                  type="button"
                  className="btn-secondary pagination-btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fullscreen Image Preview Modal */}
      {modalImage && (
        <div className="review-modal-overlay" onClick={() => setModalImage(null)}>
          <div className="review-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-icon"
              onClick={() => setModalImage(null)}
            >
              <X size={20} />
            </button>
            <img src={getReviewImageUrl(modalImage)} alt="Full Review Image" className="modal-full-img" />
          </div>
        </div>
      )}
    </section>
  );
}
