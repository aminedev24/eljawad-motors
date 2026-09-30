import React, { useState, useEffect } from 'react';
import { useUser } from "../user/userContext";
import useExchangeRate from '../dataFetch/useExchangeRate';
import { apiFinance } from '../utilities/apiBase';

const TopBar = () => {
  const [japanTime, setJapanTime] = useState('');
  const { usdToYenRate, setUsdToYenRate } = useExchangeRate();
  const [editingRate, setEditingRate] = useState(false);
  const [rateEditValue, setRateEditValue] = useState('');
  const { user } = useUser(); // Access current user from context

  const apiUrl = apiFinance;

  // Update Japan Standard Time every second
  useEffect(() => {
    const updateJapanTime = () => {
      const now = new Date();
      const options = {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      };
      setJapanTime(now.toLocaleTimeString('en-US', options));
    };

    const interval = setInterval(updateJapanTime, 1000);
    return () => clearInterval(interval);
  }, []);



  // Handler to start editing the rate (only for admin users)
  const handleEditClick = () => {
    setEditingRate(true);
    setRateEditValue(usdToYenRate.toString());
  };

  // Handler to save a new rate (sends a POST request to the backend)
  const handleSaveRate = async () => {
    const newRate = parseFloat(rateEditValue);
    if (!isNaN(newRate)) {
      try {
        const response = await fetch(`${apiUrl}/rates.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ usdToYen: newRate }),
        });
        const data = await response.json();
        if (data.usdToYen) {
          setUsdToYenRate(parseFloat(data.usdToYen));
        } else {
          console.error("Error updating rate:", data.error);
        }
      } catch (error) {
        console.error("Error updating rate:", error);
      }
    }
    setEditingRate(false);
  };

  // Handler to cancel editing the rate
  const handleCancelRate = () => {
    setEditingRate(false);
  };

  return (
    <div className="top-bar-wrapper">
      <div className="top-bar">
        <div className="app-info">
          <span className="app-name">Eljawad Motors Inc.</span>
          <span className="total-cars stock font-mono tabular-nums">Total Cars in Stock: 120</span>
          <span aria-hidden="true" className="opacity-40">|</span>
          <span className="cars-added-today stock font-mono tabular-nums">Cars Added Today: 5</span>
        </div>
        <div className="extra-info">
          <span className="time font-mono tabular-nums">Japan: <span className='hidden md:inline-block'>Standard Time</span> {japanTime}</span>
          <span aria-hidden="true" className="opacity-40">|</span>
          <span className="exchange-rate font-mono tabular-nums">
            <span className=' hidden md:inline-block' >USD/JPY:</span> $1 = ¥{" "}
            {editingRate ? (
              <>
                <input
                  type="text"
                  value={rateEditValue}
                  onChange={(e) => setRateEditValue(e.target.value)}
                  className="rate-edit-input"
                />
                <button
                  type="button"
                  onClick={handleSaveRate}
                  className="conversion-edit-btn"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCancelRate}
                  className="conversion-edit-btn cancel"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {usdToYenRate.toFixed(2)}{" "}
                {/* Only show the edit button if user exists and is admin */}
                {user && user.role === 'admin' && (
                  <button
                    type="button"
                    onClick={handleEditClick}
                    className="conversion-edit-btn"
                  >
                    Edit
                  </button>
                )}
              </>
            )}
          </span>
          {/*
          Additional selectors for country, currency, language can be added here.
          */}
        </div>
      </div>
    </div>
  );
};

export default TopBar;