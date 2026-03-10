import axios from 'axios';
import { config } from '../../config.js';

/**
 * Axios instance pre-configured for Pipedrive API v1.
 * Authenticates via api_token query parameter on every request.
 */
export const pipedriveApi = axios.create({
  baseURL: 'https://api.pipedrive.com/v1',
  params: { api_token: config.PIPEDRIVE_API_TOKEN },
  timeout: 10000,
});
