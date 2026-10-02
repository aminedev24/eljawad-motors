import { apiBaseUrl, apiInventory, apiFinance } from '../utilities/apiBase';
import { getCsrfToken } from '../utilities/csrfToken';

const ENDPOINT_MAP = {
  'users/getUsers.php': () => `${apiBaseUrl}/users/getUsers.php`,
  'users/updateUser.php': () => `${apiBaseUrl}/users/updateUser.php`,
  'users/updateOwnAccount.php': () => `${apiBaseUrl}/users/updateOwnAccount.php`,
  'users/deleteUser.php': () => `${apiBaseUrl}/users/deleteUser.php`,
  'users/impersonate.php': () => `${apiBaseUrl}/users/impersonate.php`,
  'users/stop_impersonation.php': () => `${apiBaseUrl}/users/stop_impersonation.php`,
  'users/addUser.php': () => `${apiBaseUrl}/users/addUser.php`,
  'users/setStockAccess.php': () => `${apiBaseUrl}/users/setStockAccess.php`,

  'inventory/cars/fetchStock.php': () => `${apiInventory}/cars/fetchStock.php`,
  'inventory/cars/fetchAdminStock.php': () => `${apiInventory}/cars/fetchAdminStock.php`,
  'inventory/cars/fetchReservations.php': () => `${apiInventory}/cars/fetchReservations.php`,
  'inventory/cars/fetchAllSoldCars.php': () => `${apiInventory}/cars/fetchAllSoldCars.php`,
  'inventory/cars/updateSoldCar.php': () => `${apiInventory}/cars/updateSoldCar.php`,
  'inventory/cars/saveCars.php': () => `${apiInventory}/cars/saveCars.php`,
  'inventory/cars/submit_car.php': () => `${apiInventory}/cars/submit_car.php`,
  'inventory/cars/vehicle-action.php': () => `${apiInventory}/cars/vehicle-action.php`,
  'inventory/cars/upload_car_images.php': () => `${apiInventory}/cars/upload_car_images.php`,
  'inventory/cars/fetchVehicle.php': () => `${apiInventory}/cars/fetchVehicle.php`,

  'finance/deposits/adminFetchDeposits.php': () => `${apiBaseUrl}/finance/deposits/adminFetchDeposits.php`,
  'finance/deposits/insertDeposit.php': () => `${apiBaseUrl}/finance/deposits/insertDeposit.php`,
  'finance/deposits/editDeposit.php': () => `${apiBaseUrl}/finance/deposits/editDeposit.php`,
  'finance/deposits/fetchDeposits.php': () => `${apiBaseUrl}/finance/deposits/fetchDeposits.php`,

  'finance/invoices/adminFetchInvoices.php': () => `${apiBaseUrl}/finance/invoices/adminFetchInvoices.php`,
  'finance/invoices/manageInvoices.php': () => `${apiBaseUrl}/finance/invoices/manageInvoices.php`,
  'finance/invoices/fetchInvoices.php': () => `${apiBaseUrl}/finance/invoices/fetchInvoices.php`,
  'finance/invoices/getInvoiceNumber.php': () => `${apiBaseUrl}/finance/invoices/getInvoiceNumber.php`,
  'finance/invoices/sendInvoice.php': () => `${apiBaseUrl}/finance/invoices/sendInvoice.php`,

  'finance/rates.php': () => `${apiBaseUrl}/finance/rates.php`,

  'auth/check_session.php': () => `${apiBaseUrl}/check_session.php`,
  'auth/logout.php': () => `${apiBaseUrl}/logout.php`,
};

function resolveUrl(endpoint, query = '') {
  const builder = ENDPOINT_MAP[endpoint];
  if (builder) return builder() + (query ? `?${query}` : '');
  return `${apiBaseUrl}/${endpoint}${query ? `?${query}` : ''}`;
}

export async function adminApiFetch(endpoint, options = {}) {
  const url = resolveUrl(endpoint, options.query);
  const method = options.method || 'GET';

  const fetchOptions = {
    method,
    credentials: 'include',
    headers: { ...options.headers },
  };

  if (options.body) {
    if (typeof options.body === 'object') {
      fetchOptions.body = JSON.stringify(options.body);
      fetchOptions.headers['Content-Type'] = 'application/json';
    } else {
      fetchOptions.body = options.body;
    }
  }

  if (method !== 'GET') {
    const token = getCsrfToken();
    if (token) fetchOptions.headers['X-CSRF-Token'] = token;
  }

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error [${method} ${endpoint}]:`, error);
    return { error: 'Connection failed. Please try again later.' };
  }
}
