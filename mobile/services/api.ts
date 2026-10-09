/**
 * Backward compatibility layer.
 * Re-exports modular feature services from services/[feature]
 */
import { apiClient } from './client';

export * from './client';
export * from './auth';
export * from './requests';
export * from './resources';
export * from './chat';

export default apiClient;
