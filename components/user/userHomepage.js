import React, { useState, useEffect, useMemo } from 'react';
import { ProfilePager } from './profileUi';

const PER_PAGE = 10;
import { useRouter, useSearchParams } from 'next/navigation';
import CreatableSelect from 'react-select/creatable';
import VehicleInfo from '../vehicles/vehicleInformation';
import Link from 'next/link';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faCalendarCheck, faTruck, faCheck } from "@fortawesome/free-solid-svg-icons";
import { apiBaseUrl, apiInventory } from '../utilities/apiBase';
import { getCarPriceUsd, normalizeCurrency } from '../utilities/ichinomiyaCardAdapter';
import { formatNumberWithUnit } from '../utilities/numberFormat';

const UserHomepage = ({ user = {} }) => {
  // Filters state includes text-based filters and numeric range filters.
  const [filters, setFilters] = useState({ 
    make: "", 
    chassis: "", 
    model: "", 
    ref: "",
    priceFrom: "",
    priceTo: "",
    yearFrom: "",
    yearTo: ""
  });

  const [cars, setCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [filteredCars, setFilteredCars] = useState([]);
  const [page, setPage] = useState(1);
  const [imageSrc, setImageSrc] = useState(apiBaseUrl);
  const searchParams = useSearchParams();
  const router = useRouter();
  const apiUrl = apiInventory;

  useEffect(() => {
    fetch(`${apiUrl}/cars/fetchSoldCars.php`, {
      credentials: "include",
    })
      .then(response => response.json())
      .then(data => setCars(data))
      .catch(error => console.error("Error fetching data:", error));
  }, [apiUrl]);

  // Compute distinct values for text-based filters.
  const distinctMakes = useMemo(() => [...new Set(cars.map(car => car.make))], [cars]);
  const distinctChassis = useMemo(() => [...new Set(cars.map(car => car.chassis_no))], [cars]);
  const distinctModels = useMemo(() => [...new Set(cars.map(car => car.model))], [cars]);
  const distinctRefs = useMemo(() => [...new Set(cars.map(car => car.ref_no))], [cars]);

  // Compute distinct price values and years (numeric arrays).
  const distinctPrices = useMemo(() => {
    const prices = cars.map(car => Number(car.price));
    return [...new Set(prices)].sort((a, b) => a - b);
  }, [cars]);

  const distinctYears = useMemo(() => {
    const years = cars.map(car => Number(car.year));
    return [...new Set(years)].sort((a, b) => a - b);
  }, [cars]);

  // Prepare options for react-select (Creatable) components.
  const makeOptions = useMemo(() => distinctMakes.map(make => ({ value: make, label: make })), [distinctMakes]);
  const chassisOptions = useMemo(() => distinctChassis.map(chassis => ({ value: chassis, label: chassis })), [distinctChassis]);
  const modelOptions = useMemo(() => distinctModels.map(model => ({ value: model, label: model })), [distinctModels]);
  const refOptions = useMemo(() => distinctRefs.map(ref => ({ value: ref, label: ref })), [distinctRefs]);

  // Update filters state when a select value changes.
  const handleSelectChange = (name, selectedOption) => {
    const newValue = selectedOption ? selectedOption.value : "";
    setFilters(prev => ({
      ...prev,
      [name]: newValue,
    }));
  };

  // Update filters for numeric inputs.
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Apply filters to the car list.
  useEffect(() => {
    const filtered = cars.filter(car =>
      (filters.make === "" || car.make.toLowerCase().includes(filters.make.toLowerCase())) &&
      (filters.chassis === "" || car.chassis_no.toLowerCase().includes(filters.chassis.toLowerCase())) &&
      (filters.model === "" || car.model.toLowerCase().includes(filters.model.toLowerCase())) &&
      (filters.ref === "" || car.ref_no.toLowerCase().includes(filters.ref.toLowerCase())) &&
      (filters.priceFrom === "" || Number(car.price) >= Number(filters.priceFrom)) &&
      (filters.priceTo === "" || Number(car.price) <= Number(filters.priceTo)) &&
      (filters.yearFrom === "" || Number(car.year) >= Number(filters.yearFrom)) &&
      (filters.yearTo === "" || Number(car.year) <= Number(filters.yearTo))
    );
    setFilteredCars(filtered);
    setPage(1);
  }, [filters, cars]);

  // Handle selecting a car.
  const handleSelectCar = (car) => {
    setSelectedCar(car);
    router.push(`?id=${car.chassis_no}`);
  };

  const handleCloseCarDetail = () => {
    setSelectedCar(null);
    router.push(`/profile/my-account`);
  };

  if (selectedCar) {
    return <VehicleInfo selectedCar={selectedCar} onClose={handleCloseCarDetail} />;
  }

  const displayName = user.full_name || user.name || '';
  const firstName = displayName.split(/\s+/)[0] || 'there';
  const initials = (displayName.trim().split(/\s+/).map(w => w[0]).join('') || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="user-homepage-container">
      <div className="profile-welcome-card">
        <div className="pwc-avatar">{initials}</div>
        <div className="pwc-info">
          <h2 className="pwc-greeting">Welcome back, {firstName}</h2>
          <p className="pwc-sub">
            {user.email}
            {String(user.is_verified) === '1' && (
              <span className="pwc-verified">
                <FontAwesomeIcon icon={faCheck} /> Verified
              </span>
            )}
          </p>
          <div className="pwc-meta">
            <span>Company: {user.company || '—'}</span>
            <span>Country: {user.country || '—'}</span>
            <span>Member since: {user.joined_date ? new Date(user.joined_date).toLocaleDateString() : '—'}</span>
          </div>
        </div>
        <div className="pwc-actions">
          <Link href="/profile/saved-vehicles">
            <FontAwesomeIcon icon={faHeart} /> Saved Vehicles
          </Link>
          <Link href="/profile/my-reservations">
            <FontAwesomeIcon icon={faCalendarCheck} /> My Reservations
          </Link>
          <Link href="/profile/my-orders">
            <FontAwesomeIcon icon={faTruck} /> My Orders
          </Link>
        </div>
      </div>

        {/* Purchased Car Search */}
        <div className="purchased-car-search mb-4">
          <h2>Purchased Car Search</h2>
          {/* Text-based filters using CreatableSelect for combobox behavior */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label>Make</label>
              <CreatableSelect
                options={makeOptions}
                value={filters.make ? { value: filters.make, label: filters.make } : null}
                onChange={(option) => handleSelectChange('make', option)}
                placeholder="Select or type Make"
                isClearable
              />
            </div>
            <div>
              <label>Chassis No</label>
              <CreatableSelect
                options={chassisOptions}
                value={filters.chassis ? { value: filters.chassis, label: filters.chassis } : null}
                onChange={(option) => handleSelectChange('chassis', option)}
                placeholder="Select or type Chassis No"
                isClearable
              />
            </div>
            <div>
              <label>Model</label>
              <CreatableSelect
                options={modelOptions}
                value={filters.model ? { value: filters.model, label: filters.model } : null}
                onChange={(option) => handleSelectChange('model', option)}
                placeholder="Select or type Model"
                isClearable
              />
            </div>
            <div>
              <label>Ref No</label>
              <CreatableSelect
                options={refOptions}
                value={filters.ref ? { value: filters.ref, label: filters.ref } : null}
                onChange={(option) => handleSelectChange('ref', option)}
                placeholder="Select or type Ref No"
                isClearable
              />
            </div>
          </div>

          {/* Numeric filters for Price and Year with your desired structure */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className='year-group'>
              <div className='form-group'>
                <label>Price From</label>
                <input
                  type="number"
                  name="priceFrom"
                  value={filters.priceFrom}
                  onChange={handleFilterChange}
                  placeholder="Min Price"
                  list="priceFromList"
                />
                <datalist id="priceFromList">
                  {distinctPrices.map(price => (
                    <option key={price} value={price} />
                  ))}
                </datalist>
              </div>
              <div className='form-group'>
                <label>Price To</label>
                <input
                  type="number"
                  name="priceTo"
                  value={filters.priceTo}
                  onChange={handleFilterChange}
                  placeholder="Max Price"
                  list="priceToList"
                />
                <datalist id="priceToList">
                  {distinctPrices.map(price => (
                    <option key={price} value={price} />
                  ))}
                </datalist>
              </div>
            </div>
          
            <div className='year-group'>
              <div className='form-group'>
                <label>Year From</label>
                <input
                  type="number"
                  name="yearFrom"
                  value={filters.yearFrom}
                  onChange={handleFilterChange}
                  placeholder="Min Year"
                  list="yearFromList"
                />
                <datalist id="yearFromList">
                  {distinctYears.map(year => (
                    <option key={year} value={year} />
                  ))}
                </datalist>
              </div>
              <div className='form-group'>
                <label>Year To</label>
                <input
                  type="number"
                  name="yearTo"
                  value={filters.yearTo}
                  onChange={handleFilterChange}
                  placeholder="Max Year"
                  list="yearToList"
                />
                <datalist id="yearToList">
                  {distinctYears.map(year => (
                    <option key={year} value={year} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          <div className="search-buttons">
            <button className="search-btn">SEARCH</button>
            <button
              onClick={() =>
                setFilters({ make: "", chassis: "", model: "", ref: "", priceFrom: "", priceTo: "", yearFrom: "", yearTo: "" })
              }
              className="clear-btn"
            >
              CLEAR
            </button>
          </div>
        </div>

        {/* Car Listings */}
        <div>
          {filteredCars.length > 0 ? (
            filteredCars.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((car, index) => (
              <div className="car-listings mb-4" key={car.car_id}>
                
                <img
                  alt={car.alt}
                  className="image cursor-pointer"
                  height="100"
                  src={`${apiBaseUrl}/${car.image_urls[0]}`}
                  
                  width="100"
                  onClick={() => handleSelectCar(car)}
                />
                <div className="details">
                  <div className="info">
                    <p className="title">{index + 1}.{car.ref_no}</p>
                    <p className="title">{car.make}</p>
                    <p className="subtitle">{car.model}</p>
                    <p className="subtitle">
                      {getCarPriceUsd(car).toLocaleString()} {normalizeCurrency(car)}
                    </p>
                     <p className="subtitle">
                     Discount -{car?.discount.toLocaleString()} {car.discount ? normalizeCurrency(car) : ''}
                    </p>
                  </div>
                </div>
                <div className="price-info">
                  <p className="price">
                    Engine Capacity: <span> {formatNumberWithUnit(car.engine_capacity)}</span>
                  </p>
                  <p className="price">
                    Mileage: <span>{formatNumberWithUnit(car.mileage)}</span>
                  </p>
                  <p className="price">
                    Year: <span>{car.year}</span>
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p>No cars found.</p>
          )}
          <ProfilePager
            page={Math.min(page, Math.max(1, Math.ceil(filteredCars.length / PER_PAGE)))}
            totalPages={Math.ceil(filteredCars.length / PER_PAGE)}
            onPage={setPage}
          />
        </div>
    </div>
  );
};

export default UserHomepage;
