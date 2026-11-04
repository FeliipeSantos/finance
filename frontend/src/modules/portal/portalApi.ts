import axios from 'axios';

// Independent of the regular user's API interceptors and login session.
export const portalApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'}/portal`,
});
