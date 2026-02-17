import { LocationData } from '../types';

export const getCurrentLocation = (): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

        try {
          // Attempt reverse geocoding using OpenStreetMap Nominatim (Free, no key required)
          // Note: In a high-traffic production app, use a paid service or Google Maps API.
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'GeoAttendAI/1.0'
                }
            }
          );
          if (response.ok) {
            const data = await response.json();
            // Construct a simpler address
            const parts = [
                data.address?.building,
                data.address?.road,
                data.address?.suburb,
                data.address?.city || data.address?.town,
            ].filter(Boolean);
            
            if (parts.length > 0) {
                address = parts.join(', ');
            } else if (data.display_name) {
                address = data.display_name.split(',').slice(0, 3).join(',');
            }
          }
        } catch (e) {
          console.warn('Reverse geocoding failed, falling back to coords', e);
        }

        resolve({
          latitude,
          longitude,
          accuracy,
          timestamp: position.timestamp,
          address,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};
