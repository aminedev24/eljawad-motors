import { useState, useEffect } from 'react';
import useModal from '../../utilities/useModal';
import { apiBaseUrl } from '../../utilities/apiBase';

const useStoreStockForm = () => {
  const apiUrl = apiBaseUrl;
  const modal = useModal();

  const [images, setImages] = useState([]);

  const handleImageChange = (e) => {
    setImages([...e.target.files]);
  };

  const [formData, setFormData] = useState({
    refNo: '',
    make: '',
    model: '',
    price: '',
    category: '',
    color: '',
    year: '',
    dimension: '',
    m3: '',
    engineCapacity: '',
    mileage: '',
    chassisNo: '',
    fuel: '',
    door: '',
    seat: '',
    transmission: '',
    drive: '',
    stereo: '',
    port_of_discharge: '',
    port_of_loading: '',
    engine_type: '',
    destination: '',
    departure_port: '',
    address: '',
    phone: '',
    company: '',
    size: '',
    ship_name: '',
    ship_date: '',
    arrival_port: '',
  });

  const [freight, setFreight] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountTitle, setDiscountTitle] = useState('');
  const [mainCurrency, setMainCurrency] = useState('USD');
  const currencies = ['JPY', 'USD', 'EUR'];

  const [userOptions, setUserOptions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetch(`${apiUrl}/users/getUsers.php`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setUserOptions(
            data.data.map(u => ({
              value: u.id,
              label: u.label || u.full_name || u.customer_name,
              type: u.type,
              ...u
            }))
          );
        }
      });
  }, [apiUrl]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getNumericPrice = (priceStr) => {
    if (!priceStr) return 0;
    const match = priceStr.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const carPrice = getNumericPrice(formData.price);
  const freightValue = parseFloat(freight) || 0;
  const discountValue = parseFloat(discount) || 0;
  const finalValue = carPrice + freightValue - discountValue;

  const handleSubmit = async (e) => {
    e.preventDefault();

    let imageUrlsArray = [];

    if (images.length > 0) {
      const formDataUpload = new FormData();
      images.forEach((image) => formDataUpload.append('images[]', image));
      formDataUpload.append('refNo', formData.refNo);
      formDataUpload.append('make', formData.make);
      formDataUpload.append('model', formData.model);

      const imageResponse = await fetch(`${apiUrl}/inventory/cars/upload_car_images.php`, {
        method: 'POST',
        body: formDataUpload,
      });
      const imageResult = await imageResponse.json();
      if (imageResponse.ok && imageResult.image_urls) {
        imageUrlsArray = imageResult.image_urls;
      } else {
        modal.showAlert("Failed to upload images: " + (imageResult.messages || ''), "error");
        return;
      }
    }

    const dataToSend = {
      ...formData,
      image_urls: JSON.stringify(imageUrlsArray),
      freight,
      final_value: finalValue,
      mainCurrency,
      discount,
      discountTitle,
      user_name: selectedUser
        ? (selectedUser.label || selectedUser.full_name || selectedUser.customer_name)
        : null,
      user_id: selectedUser ? selectedUser.id || selectedUser.value : null,
    };

    try {
      const carResponse = await fetch(`${apiUrl}/inventory/cars/submit_car.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
        credentials: 'include',
      });
      const carResultText = await carResponse.text();

      if (!carResponse.ok) {
        modal.showAlert("Failed to save car data: " + carResultText, "error");
        return;
      }

      modal.showAlert("Car data and images submitted successfully!", "success");
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error("Network or unexpected error:", error);
      modal.showAlert("Something went wrong. Please try again later.", "error");
    }
  };

  const populateForm = () => {
    setFormData({
      refNo: 'ELJ-1003',
      make: 'Volkswagen',
      model: 'Golf',
      price: 'FOB 1,656,600',
      category: 'Hatchback',
      color: 'Black',
      year: '2023',
      dimension: '429 x 179 x 147 (cm)',
      m3: '11,288 m3',
      engineCapacity: '2,000cc',
      mileage: 'odo 7,236km',
      chassisNo: 'WVWZZZCD4RW011433',
      fuel: 'Diesel',
      door: '5',
      seat: '5',
      transmission: 'Automatic',
      drive: '2WD',
      stereo: 'Standard',
      ship_date: '2024-06-01',
      ship_name: 'MV Ocianic',
      arrival_port: 'Los Angeles',
      size: 'test sie',
      port_of_discharge: 'Los Angeles',
      port_of_loading: 'Tokyo',
      engine_type: 'Petrol',
      destination: '123 Elm St, Springfield',
      departure_port: 'Tokyo Port',
      address: '123 Elm St, Springfield',
      phone: '123-456-7890',
      company: 'Doe Enterprises'
    });
  };

  return {
    images,
    handleImageChange,
    formData,
    setFormData,
    handleChange,
    freight, setFreight,
    discount, setDiscount,
    discountTitle, setDiscountTitle,
    mainCurrency, setMainCurrency,
    currencies,
    userOptions, selectedUser, setSelectedUser,
    getNumericPrice,
    carPrice, freightValue, discountValue, finalValue,
    handleSubmit,
    populateForm,
    apiUrl,
    ...modal,
  };
};

export default useStoreStockForm;
