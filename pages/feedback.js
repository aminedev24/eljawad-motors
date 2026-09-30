import { useState, useRef } from 'react';
import Head from 'next/head';
import { apiBaseUrl } from '../components/utilities/apiBase';
import CountryList from '../components/utilities/countryList';

const REVIEWS = [
  {
    initials: 'KM', flag: '🇹🇿', name: 'Kibonge M.', country: 'Tanzania', stars: 5,
    text: 'Excellent service from start to finish. Our order arrived in perfect condition and every step of the process was handled professionally.'
  },
  {
    initials: 'AO', flag: '🇳🇬', name: 'Adebayo O.', country: 'Nigeria', stars: 5,
    text: 'Very transparent process. I always knew exactly where things stood. Highly recommend Eljawad Motors to anyone sourcing from Japan.'
  },
  {
    initials: 'MN', flag: '🇿🇦', name: 'Mpho N.', country: 'South Africa', stars: 5,
    text: 'The team sourced exactly what we needed at a great price. Documentation was spot on and customs clearance went smoothly. Will use Eljawad Motors again.'
  },
  {
    initials: 'RS', flag: '🇮🇳', name: 'Rajan S.', country: 'India', stars: 4,
    text: 'Good communication throughout. The goods matched exactly what was described. Solid and trustworthy platform.'
  },
];

const BARS = [
  { star: 5, pct: 84 },
  { star: 4, pct: 12 },
  { star: 3, pct: 4 },
  { star: 2, pct: 0 },
  { star: 1, pct: 0 },
];

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
const EMPTY  = { name: '', email: '', phone: '', country: '', message: '' };

export default function FeedbackPage() {
  const [form, setForm]       = useState(EMPTY);
  const [rating, setRating]   = useState(0);
  const [hovered, setHovered] = useState(0);
  const [preview, setPreview] = useState(null);
  const [status, setStatus]   = useState({ type: '', message: '' });
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) setPreview(URL.createObjectURL(file));
  };

  const removeFile = () => {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      setStatus({ type: 'error', message: 'Please select a star rating before submitting.' });
      return;
    }
    setSending(true);
    setStatus({ type: '', message: '' });

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('rating', rating);
      const file = fileRef.current?.files[0];
      if (file) fd.append('photo', file);

      const res  = await fetch(`${apiBaseUrl}/customers/feedback.php`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (data.status === 'success') {
        setStatus({ type: 'success', message: data.message });
        setForm(EMPTY);
        setRating(0);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = '';
      } else {
        setStatus({ type: 'error', message: data.message || 'Something went wrong.' });
      }
    } catch {
      setStatus({ type: 'error', message: 'Connection failed. Please try again.' });
    } finally {
      setSending(false);
    }
  };

  const active = hovered || rating;

  return (
    <>
      <Head>
        <title>Customer Feedback | Eljawad Motors Inc.</title>
        <meta name="description" content="Share your experience with Eljawad Motors Inc. — Japan's trusted sourcing and export platform." />
      </Head>

      <div className="feedback-page">

        <h1 className="feedback-page__title">Customer Feedback</h1>
        <div className="feedback-page__title-bar" />

        {/* Rating summary */}
        <div className="fb-summary">
          <div className="fb-summary__score">
            <div className="fb-summary__number">4.9</div>
            <div className="fb-summary__stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <i key={i} className="fas fa-star" />
              ))}
            </div>
            <div className="fb-summary__label">Based on {REVIEWS.length} reviews</div>
          </div>
          <div className="fb-summary__bars">
            {BARS.map(({ star, pct }) => (
              <div key={star} className="fb-bar-row">
                <span className="fb-bar-row__num">{star}</span>
                <i className="fas fa-star fb-bar-row__star" />
                <div className="fb-bar-track">
                  <div className="fb-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="fb-bar-row__pct">{pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Review cards */}
        <div className="fb-reviews">
          {REVIEWS.map((r) => (
            <div key={r.name} className="fb-review-card">
              <div className="fb-review-card__header">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="fb-review-card__avatar">{r.flag}</div>
                  <div className="fb-review-card__info">
                    <div className="fb-review-card__name">{r.name}</div>
                    <div className="fb-review-card__country">{r.country}</div>
                  </div>
                </div>
                <div className="fb-review-card__stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <i key={i} className={i < r.stars ? 'fas fa-star' : 'far fa-star'} />
                  ))}
                </div>
              </div>
              <p className="fb-review-card__text">&ldquo;{r.text}&rdquo;</p>
            </div>
          ))}
        </div>

        {/* Feedback form */}
        <div className="fb-form-panel">
          <div className="fb-form-panel__header">
            <h3>Share Your Experience</h3>
            <p>Tell us about your experience with Eljawad Motors Inc.</p>
          </div>

          <form className="fb-form" onSubmit={handleSubmit}>
            {status.message && (
              <div className={`fb-status fb-status--${status.type}`}>{status.message}</div>
            )}

            {/* Name + Email */}
            <div className="fb-form__row">
              <div className="input-group">
                <input type="text" name="name" required value={form.name} onChange={handleChange} placeholder="Your full name" />
                <label>Full Name <span className="required">*</span></label>
              </div>
              <div className="input-group">
                <input type="email" name="email" required value={form.email} onChange={handleChange} placeholder="your@email.com" />
                <label>Email <span className="required">*</span></label>
              </div>
            </div>

            {/* Phone + Country */}
            <div className="fb-form__row">
              <div className="input-group">
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
                <label>Phone</label>
              </div>
              <div className="input-group">
                <select
                  name="country"
                  required
                  value={form.country}
                  onChange={handleChange}
                  className={form.country ? 'not-empty' : ''}
                >
                  <option value="">Select Country</option>
                  {CountryList()
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map((c, i) => (
                      <option key={i} value={c.label}>{c.label}</option>
                    ))}
                </select>
                <label>Country <span className="required">*</span></label>
              </div>
            </div>

            {/* Message */}
            <div className="input-group">
              <textarea
                name="message"
                required
                rows="5"
                value={form.message}
                onChange={handleChange}
                placeholder="Tell us about your experience — the product, the process, the service…"
              />
              <label>Your Experience <span className="required">*</span></label>
            </div>

            {/* Star rating */}
            <div>
              <label className="fb-field-label">
                Your Rating <span className="required">*</span>
              </label>
              <div className="fb-stars-picker">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="fb-star-btn"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                  >
                    <i className={active >= star ? 'fas fa-star' : 'far fa-star'} />
                  </button>
                ))}
                {rating > 0 && <span className="fb-stars-label">{LABELS[rating]}</span>}
              </div>
            </div>

            {/* Photo upload */}
            <div>
              <label className="fb-field-label">
                Photo <span className="fb-optional">(optional)</span>
              </label>
              <div
                className={`fb-upload-zone ${preview ? 'fb-upload-zone--filled' : ''}`}
                onClick={() => !preview && fileRef.current?.click()}
              >
                {preview ? (
                  <div className="fb-upload-preview">
                    <img src={preview} alt="preview" className="fb-upload-img" />
                    <div className="fb-upload-info">
                      <p className="fb-upload-filename">{fileRef.current?.files[0]?.name}</p>
                      <button type="button" onClick={removeFile} className="fb-upload-remove">
                        <i className="fas fa-times" /> Remove
                      </button>
                    </div>
                    <button type="button" onClick={() => fileRef.current?.click()} className="fb-upload-change">
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="fb-upload-placeholder">
                    <i className="fas fa-camera" />
                    <p>Click to attach a photo</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFile}
                className="fb-upload-input"
              />
            </div>

            <button type="submit" className="fb-submit" disabled={sending}>
              {sending
                ? <><i className="fas fa-spinner fa-spin" /> Sending…</>
                : <><i className="fas fa-paper-plane" /> Submit Feedback</>}
            </button>
          </form>
        </div>

      </div>
    </>
  );
}
