import React from 'react';
import CountryList from '../utilities/countryList';
import ImageWithLoader from '../misc/imageWithLoader';
import useContact from './contact/useContact';

const Contact = ({ sell, japanExports }) => {
  const {
    formData,
    isSubmitting,
    phoneCode,
    userData,
    lang,
    messageInfo,
    messageRef,
    handleChange,
    handleSubmit,
  } = useContact({ sell, japanExports });

  return (
    <div className='form-wrapper contact-wrapper'>
      <div className="signup-container contact-container">
        <form className="signup-form contact-form" onSubmit={handleSubmit}>
          {!sell &&
            <ImageWithLoader src={`/images/logo-eljawad-dark.svg`} alt="Logo" className="logo-form logo-img" />
          }

          {!sell && !japanExports && lang === 'en' && lang === 'jp' && <h2>We like to hear from you!</h2>}
          <h3>{japanExports || lang === 'jp' ? " お問い合わせ" : 'Contact Us'}</h3>
          {!japanExports || lang === 'jp' || lang === 'en' &&
            <p className='contact-prompt'>
              If you have any questions or would like to learn more about our offerings, please don&rsquo;t hesitate to reach out using the form below. We&rsquo;re always eager to connect with our customers and will respond as promptly as possible.
            </p>
          }

          <div className="input-group">
            <input
              type="text"
              value={formData.name}
              onChange={handleChange}
              name="name"
              placeholder={japanExports || lang === 'jp' ? '名前' : 'your name'}
              required
            />
            <label> {japanExports || lang === 'jp' ? '名前' : `Your Name` } <span className="required">*</span></label>
          </div>

          <div className="input-group">
            <input
              type="email"
              value={formData.email}
              onChange={handleChange}
              name="email"
              placeholder={japanExports || lang === 'jp' ? 'メールアドレス' : 'your email'}
              required
            />
            <label>{japanExports || lang === 'jp' ? 'メールアドレス' : 'Email' } <span className="required">*</span></label>
          </div>

          <div className="input-group">
            <select
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className={formData.country ? "not-empty" : ""}
              required
            >
              <option value="">
                {japanExports || lang === 'jp' ? "国" : "Select Country"}
              </option>
              {sell || japanExports ? (
                <option value="Japan">Japan</option>
              ) : (
                CountryList()
                  .sort((a, b) => a.label.localeCompare(b.label))
                  .map((country, idx) => (
                    <option key={`${idx}-${country.label}`} value={country.label}>
                      {country.label}
                    </option>
                  ))
              )}
            </select>
            <label>{japanExports || lang === 'jp' ? '国' : 'Country'}<span className="required">*</span></label>
          </div>

          {japanExports &&
            <div className="input-group">
              <input
                type="text"
                name="city"
                value={formData.city}
                placeholder={'市区町村'}
                onChange={handleChange}
              />
              <label>市区町村<span className="required">*</span></label>
            </div>
          }

          {japanExports &&
            <div className="input-group">
              <input
                type="text"
                name="address"
                value={formData.address}
                placeholder={'住所'}
                onChange={handleChange}
              />
              <label>住所（初回のお問い合わせでは不要)</label>
            </div>
          }

          <div className="input-group phone-number-group">
            {phoneCode && <span className="phone-code">{phoneCode}</span>}
          <input
            type="tel"
            name="phone"
            className={phoneCode ? "shrink" : ''}
            value={formData.phone}
            onChange={handleChange}
            placeholder={japanExports || lang === 'jp' ? "電話番号" : "phone number"}
            readOnly={!!userData.phone}
            required
          />
            <label>{japanExports || lang === 'jp' ? '電話番号' : `Phone`}<span className="required">*</span></label>
          </div>

          {japanExports &&
            <div className="input-group">
              <input
                type="text"
                name="prefecture"
                value={formData.prefecture}
                placeholder={'都道府県'}
                onChange={handleChange}
              />
              <label>都道府県<span className="required">*</span></label>
            </div>
          }

          {!sell && (
            <div className="input-group">
              <select
                name="enquiry"
                value={formData.enquiry}
                onChange={handleChange}
                className={formData.enquiry ? "not-empty" : ""}
                required
              >
                {!japanExports ? (
                  <>
                    <option value="">Select Enquiry Type</option>
                    <option value="General">General Inquiry</option>
                    <option value="Support">Support</option>
                    <option value="Sales">Sales</option>
                  </>
                ) : (
                  <>
                    <option value="">件名</option>
                    <option value="Looking for overseas customers">海外の顧客を探しています</option>
                    <option value="I want to Invest">投資したい</option>
                    <option value="others">その他</option>
                  </>
                )}
              </select>
              <label>
                {japanExports || lang === 'jp' ? '件名' : 'Enquiry type'}
                <span className="required">*</span>
              </label>
            </div>
          )}

          {sell || japanExports || lang === 'jp' && (
            <div className="input-group">
              <input
                type="text"
                name="company"
                value={formData.company}
                placeholder={japanExports || lang === 'jp' ? '会社名（任意)' : 'company'}
                onChange={handleChange}
              />
              <label>{japanExports || lang === 'jp' ? "会社名（任意)" : "Company"}</label>
            </div>
          )}

          <div className="input-group">
            <label>{japanExports || lang === 'jp' ? 'メッセージ' : 'Message'}<span className="required">*</span></label>
            <textarea
              name="message"
              placeholder={japanExports || lang === 'jp' ? "メッセージ" : 'your message'}
              value={formData.message}
              onChange={handleChange}
              required
              rows="5"
            ></textarea>
          </div>

          {messageInfo && (
            <div ref={messageRef} className={`message ${messageInfo.type === 'success' ? 'success' : 'error'}`}>
              {messageInfo.text}
            </div>
          )}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : japanExports || lang === 'jp' ? "送信" : 'SUBMIT'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Contact;
