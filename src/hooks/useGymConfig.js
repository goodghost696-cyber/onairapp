export function useGymConfig() {
  return {
    name: import.meta.env.VITE_GYM_NAME || 'VOLTA FITNESS',
    city: import.meta.env.VITE_GYM_CITY || '',
    address: import.meta.env.VITE_GYM_ADDRESS || '',
  }
}
