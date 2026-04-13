import axios from 'axios';

/**
 * Mengambil data rute lengkap dari Google Maps
 * Returns: { points, distance, duration }
 */
export const getPolylineData = async (origin, destination) => {
    try {
        const googleUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        
        const { data } = await axios.get(googleUrl);
        
        // Google Maps API tetap kirim status 200 meskipun error (misal: Zero Results)
        if (data.status !== 'OK') {
            const errorMessage = data.error_message || `Google Maps Error: ${data.status}`;
            throw new Error(errorMessage);
        }

        const route = data.routes[0].legs[0]; 
        
        return {
            points: data.routes[0].overview_polyline.points, 
            distance: route.distance.text,                  
            duration: route.duration.text                  
        };

    } catch (error) {
        // Lemparkan error ke atas supaya Controller tahu ada masalah
        throw new Error(error.message || "Failed to fetch directions");
    }
};