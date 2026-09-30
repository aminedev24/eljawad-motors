import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {useUser,loading} from '../user/userContext';
import Image from 'next/image';
import ImageWithLoader from '../misc/imageWithLoader';
import { apiBaseUrl } from '../utilities/apiBase';
import { formatNumberWithUnit } from '../utilities/numberFormat';
const VehicleInfo = ({onClose, selectedCar}) => {
  const [mainImage, setMainImage] = useState(null);
  const router = useRouter();
  const {user} = useUser();

  const handleGenerateInvoice = () => {
   router.push({
    pathname: '/profile/commercial-invoice',
    query: { regenerate: true } // You can only pass query params, not state
  });
  // For passing data, consider using a global state, context, or localStorage.
  };

  const apiUrl = apiBaseUrl;
  const [imageSrc] = useState(apiUrl);

  useEffect(() => {
    if (selectedCar && selectedCar.image_urls && selectedCar.image_urls.length > 0) {
      setMainImage(`${imageSrc}/${selectedCar.image_urls[0]}`);
    }
    window.scrollTo(1,0);
  }, [selectedCar, imageSrc]);

  if (!selectedCar) return <p>No car data available.</p>;

  const { chassis_no, make, model, engine_capacity, mileage, price, currency, image_urls , stock_id,
    color, year, size, dimension, consignee, address, phone, company, engine_type, fuel,door,destination,seat,port,
    departure_port, amount,category, port_of_loading,port_of_discharge,user_name, ref_no,transmission,drive,ship_name,
    ship_date,arrival_port,stereo, discount} = selectedCar;

  console.log(selectedCar)

  //console.log(selectedCar)
  const vehicleInfo = [
    { title: "Ref No.", value: ref_no },
    { title: "Make", value: make },
    { title: "Model", value: model },
    { title: "Price", value: addUnitIfMissing(price.toLocaleString(), "FOB") + " " + currency },
    { title: "Category", value: category },
    { title: "Color", value: color },
    { title: "Year", value: year },
    { title: "Dimension (L*W*H)", value: addUnitIfMissing(dimension, "cm") },
    { title: "M3", value: (size.toLocaleString()) },
  
  ];

  const engineInfo = [
   // { title: "Engine Capacity", value: `${engine_capacity.toLocaleString()}` },
    { title: "Engine Capacity", value: addUnitIfMissing(formatNumberWithUnit(engine_capacity), "cc") },
    { title: "Mileage", value: formatNumberWithUnit(mileage) },
    { title: "Chassis No.", value: chassis_no },
    { title: "Fuel", value: fuel },
    { title: "Door", value: door },
    { title: "Seat", value: seat },
    { title: "Transmission", value: transmission },
    { title: "Drive", value: drive },
    { title: "Stereo", value: stereo }
  ];


  const shipInfoLeft = [
    { title: "Ship Name", value: ship_name },
    { title: "Ship Date", value: ship_date },
    { title: "Departure Port", value: departure_port },
    { title: "Tracking URL", value:'' }
  ];
  
  const shipInfoRight = [
    { title: "Voyage", value: "" },
    { title: "Port Of discharge", value: port_of_discharge},
    { title: "Port Of Loading", value: port_of_loading },
    { title: "Arrival Port", value: arrival_port }
    
  ];

  const consigneeInfoLeft = [
    { title: "Consignee", value: user_name },
    { title: "Adress", value: address }, // Hidden title
    { title: "Telephone", value: phone },
  ];


  const InfoColumn = ({ data }) => (
    <div className="info-column">
      {data.map((item, index) => (
        <div className="info-item" key={index}>
          <div  style={item.hidden ? { visibility: "hidden" } : {}} className="info-title">{item.title}</div>
          <div className="info-value">{item.value}</div>
        </div>
      ))}
    </div>
  );

  function addUnitIfMissing(value, unit) {
    if (!value) return "";
    // Remove commas for numeric checks
    const valStr = String(value).replace(/,/g, '').trim();
    // Regex: contains the unit as a whole word, case-insensitive
    const regex = new RegExp(`\\b${unit}\\b`, "i");
    return regex.test(valStr) ? value : `${unit} ${value}`;
  }
  
  // For dimension (should end with 'cm')
  const dimensionValue = addUnitIfMissing(dimension, "cm");

  // For size (should end with 'm3')
  const sizeValue = addUnitIfMissing(size, "m3");

  // For price (should contain 'FOB')
  const priceValue = addUnitIfMissing(price.toLocaleString(), "FOB") + " " + currency;

  const engine_capacityValue = addUnitIfMissing(engine_capacity, "cc");

  // For mileage (should contain 'km' or 'ODO')
  const mileageValue = addUnitIfMissing(mileage, "km");
  
  function removeLeadingUnit(value, unit) {
    if (!value) return "";
    // Remove leading unit (case-insensitive, with or without space)
    return value.replace(new RegExp(`^${unit}\\s*`, "i"), "");
  }

  return (
    <div style={{marginTop: '30px'}} className='vehicle-info-wrapper'>
    <div className="action-buttons" style={{justifyContent:'flex-start'}}>
        <button className="btn btn-secondary" onClick={onClose}>Go Back</button>
        {user?.isImpersonating && 
         <button className="btn btn-primary" onClick={handleGenerateInvoice}>
          Generate Commercial Invoice
        </button>
        }
       
      </div>
    <div className="vehicle-info-container">
      <div className="card">
        

        <div className="left-panel">
          {/* Main Image */}
          <div className='img-container'>
            {mainImage ? (
              <ImageWithLoader src={mainImage}
                alt="Front view of the car"
                className="main-image"
                 />
            ) : (
              <p>No main image available.</p>
            )}
            <p className="text-center">Eljawad Motors Inc. - Ref No {ref_no}</p>
          </div>
        
          <div className="thumbnail-grid">
            {image_urls.map((imgUrl, index) => (
              <img key={index}
                src={`${imageSrc}/${imgUrl}`}
                alt={`Thumbnail ${index + 1}`}
                className="thumbnail"
                onClick={() => setMainImage(`${imageSrc}/${imgUrl}`)}
               
              />
            ))}
          </div>
        </div>
        <div className="right-panel">
          <h2>Ref Number #{ref_no}</h2>
          <p style={{fontWeight: 'bold'}}>Price</p>
          <p className="price">
            <span style={{ minWidth: '120px', display: 'inline-block' }}>FOB</span>
            {removeLeadingUnit(priceValue, "FOB")}
          </p>
          {discount && 
            <p className='price'>
              <span style={{minWidth: '120px' , display: 'inline-block'}}>Discount</span>  <span>{discount ? '-'+discount : ''}</span> {currency} 
            </p>
          }
         
          <p className="price"><span style={{minWidth: '120px',  display: 'inline-block'} }>Payment</span>{amount?.toLocaleString()} {amount ? currency : ''}</p>
          <h3>Vehicle Information</h3>

      
          <div className="vehicle-information-container">
            <div className="info-container">
              <InfoColumn data={vehicleInfo} />
              <InfoColumn data={engineInfo} />
            </div>
          </div>
          {/*
             <h3>Options / Equipment</h3>
             <table className="options-table">
               <tbody>
                 <tr><td>Air Bag</td><td>ABS</td><td>Air Conditioner</td><td>Alloy Wheels</td></tr>
                 <tr><td>Power Steering</td><td>Power Windows</td><td>Push Start</td><td>Sun Roof</td></tr>
               </tbody>
             </table>
          */}
         
         <div className='vehicle-information-container'>
          <h3>Ship Information</h3>
          <div className='info-container'>
            <InfoColumn data={shipInfoLeft} />
            <InfoColumn data={shipInfoRight} />
          </div>
         </div>

         <div className='vehicle-information-container'>
          <h3>consignee Information</h3>
          <div className='info-container'>
            <InfoColumn data={consigneeInfoLeft} />
          </div>
         </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default VehicleInfo;