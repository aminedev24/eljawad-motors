import { useState, useEffect, useRef, useCallback } from 'react';
import CountryList from '../../utilities/countryList';
import { useSearchParams } from 'next/navigation';
import { apiBaseUrl } from '../../utilities/apiBase';

const useContact = ({ sell, japanExports }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    country: sell ? 'Japan' : '',
    phone: '',
    enquiry: sell ? 'sell on Eljawad Motors' : '',
    message: '',
    prefecture: '',
    city: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const searchParams = useSearchParams();
  const lang = searchParams.get('lang');

  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    phone: '',
    country: sell ? 'Japan' : '',
    city: '',
    address: ''
  });

  const [messageInfo, setMessageInfo] = useState(null);
  const messageRef = useRef();

  const apiUrl = apiBaseUrl;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${apiUrl}/users/getUserInfo.php`, {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) {
          console.error('Failed to fetch user data:', response.statusText);
          return;
        }
        const data = await response.json();
        if (!data || data.error || !data.data) {
          console.error('Invalid or missing data returned from API:', data);
          return;
        }
        const { full_name = '', email = '', phone = '', country = '' } = data.data;
        setUserData({
          fullName: full_name,
          email: email,
          phone: phone,
          country: country,
        });
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    fetchUserData();
  }, [apiUrl]);

  useEffect(() => {
    if (userData.fullName) {
      setFormData((prevData) => ({
        ...prevData,
        name: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        country: userData.country,
      }));
    }
  }, [userData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));

    if (name === 'country') {
      try {
        const selectedCountry = CountryList().find(
          (country) => country.label === value
        );
        if (selectedCountry?.countryCode) {
          setPhoneCode(selectedCountry.countryCode);
        } else {
          setPhoneCode('');
        }
      } catch (error) {
        console.error('Error setting phone code:', error);
        setPhoneCode('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/emails/send_email.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(formData),
      });

      const result = await response.json();

      if (result.status === 'success') {
        setMessageInfo({
          type: 'success',
          text: sell
            ? "Thank you for your interest in joining Eljawad Motors! We will review your application and get back to you within a few days."
            : 'Thank you for your message! We will get back to you shortly.'
        });
      } else {
        setMessageInfo({
          type: 'error',
          text: result.message || 'Something went wrong. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessageInfo({
        type: 'error',
        text: 'There was an error submitting the form. Please try again later.'
      });
    } finally {
      setIsSubmitting(false);
      if (messageRef.current) {
        messageRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      setTimeout(() => {
        setMessageInfo(null);
      }, 10000);
    }
  };

  return {
    formData, setFormData,
    isSubmitting,
    phoneCode,
    userData,
    lang,
    messageInfo,
    messageRef,
    handleChange,
    handleSubmit,
    searchParams,
  };
};

export default useContact;
