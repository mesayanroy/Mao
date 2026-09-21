// Build-time config, injected by Vite from VITE_-prefixed env vars. See
// .env.example and docs/DEPLOYMENT.md.
export const clientConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  networkId: (import.meta.env.VITE_NETWORK_ID ?? 'undeployed') as 'undeployed' | 'preview' | 'preprod' | 'mainnet',
  zkConfigUrl: import.meta.env.VITE_ZK_CONFIG_URL ?? '/zk'
};
