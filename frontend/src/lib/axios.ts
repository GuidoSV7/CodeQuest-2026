import axios from "axios";
import {
  applyRequestAuthPolicy,
  mapApiResponseError,
} from "@/lib/api-auth-policy";
import { getPublicApiUrl } from "@/lib/api-url";

const api = axios.create({
  baseURL: getPublicApiUrl(),
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  applyRequestAuthPolicy(config);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(mapApiResponseError(error)),
);

export default api;

export function getApiBaseUrl() {
  return api.defaults.baseURL ?? getPublicApiUrl();
}
