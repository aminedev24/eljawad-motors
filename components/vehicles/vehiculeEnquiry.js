import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  bodyTypeOptions,
  transmissionOptions,
  fetchMakes,
  fetchModelsForMake,
} from "./vehicleData";
import CountryList from "../utilities/countryList";
import useCheckScreenSize from "../utilities/screenSize";
import { useUser } from "../user/userContext";
import Image from "next/image";
import { apiBaseUrl } from '../utilities/apiBase';
import { formatNumberWithUnit } from '../utilities/numberFormat';

const InquiryForm = () => {
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedPort, setSelectedPort] = useState([]);
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [selectedBodyType, setSelectedBodyType] = useState("");
  const [mileageFrom, setMileageFrom] = useState("");
  const [mileageTo, setMileageTo] = useState("");
  const [selectedTransmission, setSelectedTransmission] = useState("");
  const [selectedSteering, setSelectedSteering] = useState("");
  const [message, setMessage] = useState("");
  const [notification, setNotification] = useState({ type: "", message: "" });
  const { isPortrait, isSmallScreen } = useCheckScreenSize();
  const { user } = useUser();
  const [vehicleRef, setVehicleRef] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Adjust your API URL according to environment
  const apiUrl = apiBaseUrl;

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setVehicleRef(ref);
      fetch(`${apiUrl}/inventory/cars/fetchVehicle.php?id=${encodeURIComponent(ref)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setVehicleInfo(data);
            const make = (data.make || "").toUpperCase();
            const model = (data.model || "").toUpperCase();
            setSelectedMake(make);
            setSelectedModel(model);
            if (make) {
              fetchModelsForMake(make).then(setModels).catch(() => {});
            }
            setYearFrom(data.year || "");
            setYearTo(data.year || "");
            setPriceFrom(data.fob ? String(Math.round(Number(data.fob) * 0.9)) : "");
            setPriceTo(data.fob ? String(Math.round(Number(data.fob) * 1.1)) : "");
            setSelectedBodyType(data.category || "");
            setMileageFrom(data.mileage ? String(Math.max(0, Number(data.mileage) - 10000)) : "");
            setMileageTo(data.mileage ? String(Number(data.mileage) + 10000) : "");
            setSelectedTransmission(data.transmission || "");
            setSelectedSteering(data.steering || "");
            setMessage(`I am interested in ${data.make} ${data.model} (Ref: ${data.ref_no || ref}). Please send me more details including shipping cost to my destination port.`);
          }
        })
        .catch(() => {});
    }
  }, [searchParams, apiUrl]);

  const [userData, setUserData] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    address: "",
  });

  // Load makes on mount
  useEffect(() => {
    const loadMakes = async () => {
      const fetchedMakes = await fetchMakes();
      setMakes(fetchedMakes);
    };
    loadMakes();
  }, []);

  // Fetch logged-in user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${apiUrl}/users/getUserInfo.php`, {
          method: "GET",
          credentials: "include",
        });

        const data = await response.json();
        if (!data.error) {
          setUserData({
            fullName: data.data.full_name,
            email: data.data.email,
            phone: data.data.phone,
            country: data.data.country,
            address: data.data.address || "",
          });
          setSelectedCountry(data.data.country);
        }
      } catch (error) {
        console.error(error);
      }
    };

    if (user) {
      fetchUserData();
    }
  }, [apiUrl, user]);

  // When country changes, update ports
  const handleCountryChange = (event) => {
    const country = CountryList().find((c) => c.label === event.target.value);
    setSelectedCountry(event.target.value);
    setSelectedPort(country ? country.ports : []);
  };

  // When make changes, fetch models for that make
  const handleMakeChange = async (event) => {
    const make = event.target.value;
    setSelectedMake(make);
    if (make) {
      const fetchedModels = await fetchModelsForMake(make);
      setModels(fetchedModels);
    } else {
      setModels([]);
    }
  };

  // Handle user input changes in text inputs
  // The form fields keep the "name"/"tel" attribute names the backend expects,
  // but userData stores them under "fullName"/"phone" - map between the two so
  // the controlled inputs' value prop actually reflects what was typed.
  const USER_DATA_FIELD_MAP = { name: "fullName", tel: "phone" };
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    const stateKey = USER_DATA_FIELD_MAP[name] || name;
    setUserData((prevData) => ({
      ...prevData,
      [stateKey]: value,
    }));
  };

  // Submit form handler
  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    // Validate year range
    const yearFrom = parseInt(formData.get("year-from"), 10);
    const yearTo = parseInt(formData.get("year-to"), 10);
    if (yearFrom > yearTo) {
      setNotification({
        type: "error",
        message: "Year 'from' cannot be greater than 'to'.",
      });
      return;
    }

    // Validate price range
    const priceFrom = parseFloat(formData.get("price-from"));
    const priceTo = parseFloat(formData.get("price-to"));
    if (priceFrom > priceTo) {
      setNotification({
        type: "error",
        message: "Price 'from' cannot be greater than 'to'.",
      });
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/customers/sendInquiry.php`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.status === 200 && result.status === "success") {
        setNotification({ type: "success", message: "Inquiry sent successfully!" });

        // Reset form states
        setSelectedMake("");
        setModels([]);
        setSelectedCountry("");
        setSelectedPort([]);
        setUserData({
          fullName: "",
          email: "",
          phone: "",
          country: "",
          address: "",
        });
      } else {
        setNotification({
          type: "error",
          message: "Failed to send inquiry. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setNotification({
        type: "error",
        message: "An error occurred while sending the inquiry.",
      });
    }
  };

  // Clear notification after 5 seconds and optionally reload
  useEffect(() => {
    if (notification.message) {
      const timer = setTimeout(() => {
        setNotification({ type: "", message: "" });
        router.refresh();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, router]);

  return (
    <div className='enquiry-wrapper'>

      <form onSubmit={handleSubmit}>

        <div className="enquiryContainer">
        <img src={`/images/logo-eljawad-dark.svg`} alt="Logo" className="logo-form" />

          {notification.message && (
            <div className={`message-status ${notification.type}`}>
              {notification.message}
            </div>
          )}

          {vehicleInfo && (
            <div className="bg-[#1e3a8a] text-white rounded-lg p-4 mb-4">
              <p className="text-[10px] uppercase tracking-wider opacity-80 mb-1">Inquiring about</p>
              <p className="font-bold text-lg">{vehicleInfo.make} {vehicleInfo.model}</p>
              <p className="text-sm opacity-90">Ref: {vehicleInfo.ref_no || vehicleRef} | {vehicleInfo.year} | {formatNumberWithUnit(vehicleInfo.engine_capacity)} | {formatNumberWithUnit(vehicleInfo.mileage)} km</p>
              <input type="hidden" name="vehicle_ref" value={vehicleRef} />
            </div>
          )}

          <div className="form-section">
            <h3>Your Information</h3>
             {!user && (
            <div className="login-note flex [@media(max-width:413px)]:flex-col ">
              Log in for a quick auto-fill.
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="login-btn"
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => router.push("/register")}
                className="register-btn"
              >
                Register
              </button>
            </div>
          )}
            <div className="form-group">
              <div className="half-width">
                <label htmlFor="name">
                  Your Name<span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={userData.fullName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="half-width">
                <label htmlFor="address">
                  Your Address<span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={userData.address}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <div className="half-width">
                <label htmlFor="email">
                  Email<span className="required-star">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={userData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="half-width">
                <label htmlFor="country">
                  Destination Country<span className="required-star">*</span>
                </label>
                <select
                  id="country"
                  value={selectedCountry || userData.country}
                  onChange={handleCountryChange}
                  name="country"
                  required
                >
                  <option value="">Select Country</option>
                  {CountryList().sort((a, b) => a.label.localeCompare(b.label)).map((country) => (
                    <option key={country.code} value={country.label}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <div className="half-width">
                <label htmlFor="tel">
                  Tel<span className="required-star">*</span>
                </label>
                <input
                  type="tel"
                  id="tel"
                  name="tel"
                  value={userData.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="half-width">
                <label htmlFor="port">Destination Port</label>
                <select id="port" name="port">
                  <option value="">Select</option>
                  {selectedPort && selectedPort.map((port, index) => (
                    <option key={index} value={port}>
                      {port}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ flexDirection: "column" }}>
              <label htmlFor="message">
                Message<span className="required-star">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Vehicle Information</h3>
            <div className="form-group">
              <div className="quarter-width">
                <label htmlFor="make">Make</label>
                <select id="make" name="make" value={selectedMake || "any"} onChange={handleMakeChange}>
                  <option value='any'>Make (any)</option>
                  {makes.map((make, index) => (
                    <option key={index} value={make}>
                      {make.charAt(0).toUpperCase() + make.slice(1)}
                    </option>
                  ))}
                </select>
                <i className="fas fa-info-circle info-icon"></i>
              </div>
              <div className="quarter-width">
                <label htmlFor="year-from">Registration Year</label>
                <div className="form-group" style={{ flexDirection: "row" }}>
                  <input
                    type="text"
                    id="year-from"
                    name="year-from"
                    placeholder="From"
                    className="small-width"
                    value={yearFrom}
                    onChange={(e) => setYearFrom(e.target.value)}
                  />
                  <input
                    type="text"
                    id='year-to'
                    name="year-to"
                    placeholder="To"
                    className="small-width"
                    value={yearTo}
                    onChange={(e) => setYearTo(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="form-group">
              <div className="quarter-width">
                <label htmlFor="model">Model</label>
                <select id="model" name="model" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}>
                  <option value='any'>Model (any)</option>
                  {models.map((model, index) => (
                    <option key={index} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <i className="fas fa-info-circle info-icon"></i>
              </div>
              <div className="quarter-width">
                <label htmlFor="price-from">Price (FOB)</label>
                <div className="form-group" style={{ flexDirection: "row" }}>
                  <input
                    type="text"
                    id="price-from"
                    name="price-from"
                    placeholder="From"
                    className="small-width"
                    value={priceFrom}
                    onChange={(e) => setPriceFrom(e.target.value)}
                  />
                  <input
                    type="text"
                    id="price-to"
                    name="price-to"
                    placeholder="To"
                    className="small-width"
                    value={priceTo}
                    onChange={(e) => setPriceTo(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="form-group">
              <div className="quarter-width">
                <label htmlFor="body-type">Body type</label>
                <select id="body-type" name="body-type" value={selectedBodyType} onChange={(e) => setSelectedBodyType(e.target.value)}>
                  <option value='any'>Body type (any)</option>
                  {bodyTypeOptions.map((bodyType, index) => (
                    <option key={index} value={bodyType}>
                      {bodyType}
                    </option>
                  ))}
                </select>
                <i className="fas fa-info-circle info-icon"></i>
              </div>
              <div className="quarter-width">
                <label htmlFor="mileage-from">Mileage</label>
                <div className="form-group" style={{ flexDirection: "row" }}>
                  <input
                    type="text"
                    id="mileage-from"
                    name="mileage-from"
                    placeholder="From"
                    className="small-width"
                    value={mileageFrom}
                    onChange={(e) => setMileageFrom(e.target.value)}
                  />
                  <input
                    type="text"
                    id="mileage-to"
                    name="mileage-to"
                    placeholder="To"
                    className="small-width"
                    value={mileageTo}
                    onChange={(e) => setMileageTo(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="form-group">
              <div className="quarter-width">
                <label htmlFor="transmission">Transmission</label>
                <select id="transmission" name="transmission" value={selectedTransmission} onChange={(e) => setSelectedTransmission(e.target.value)}>
                  <option value='any'>Transmission (all)</option>
                  {transmissionOptions.map((transmission, index) => (
                    <option key={index} value={transmission}>
                      {transmission}
                    </option>
                  ))}
                </select>
              </div>
              <div className="quarter-width">
                <label htmlFor="steering">Steering</label>
                <select id="steering" name="steering" value={selectedSteering} onChange={(e) => setSelectedSteering(e.target.value)}>
                  <option value='any'>Any</option>
                  <option value="RHD">RHD</option>
                  <option value="LHD">LHD</option>
                </select>
              </div>
            </div>
          </div>
          <div className="submit-section">
            <button type="submit">
              <i className="fas fa-envelope"></i> INQUIRY
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default InquiryForm;