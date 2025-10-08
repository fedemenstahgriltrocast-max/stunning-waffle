import axios from 'axios';

// Import GUI config file
const CONFIG = import.meta.glob('./config.json');

/**
 * Get token from the cookie
 * @function
 * @param {string} cname - name of cookie to get.
 * @returns {string} - token or empty if blank.
 */
const getCookie = (cname) => {
  const name = cname + '=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return '';
};

// API should either be set with REACT_APP_API_URL or defined by the URL that
// was used to navigate to the frontend
let apiURL = '';
if (window.location.hostname == 'localhost' || window.location.hostname == '127.0.0.1') {
  apiURL = `${process.env.REACT_APP_API_URL}`;
} else {
  apiURL = `${window.location.protocol}//${window.location.hostname}/api`;
}
// Create axios instance using config file opts
const client = axios.create({
  baseURL: apiURL,
});

// Inject token as a parameter to support legacy silo routes
client.interceptors.request.use((config) => {
  for (const header in CONFIG.headers) {
    if (CONFIG.headers.hasOwnProperty(header)) {
      config.headers[header] = CONFIG.headers[header];
    }
  }
  // Make sure header is set if not passed into client request
  if (typeof config.headers.Authorization === 'undefined') {
    config.headers.Authorization = 'token ' + btoa(getCookie('THORIUM_TOKEN'));
  }
  return config;
});

const errorHandler = client.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    if (error.response) {
      return error.response;
    } else {
      return error;
    }
  },
);

export { client as default, errorHandler };
