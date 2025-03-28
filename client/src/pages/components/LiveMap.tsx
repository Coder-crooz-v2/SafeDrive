import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Icon, LatLngBounds, Map } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { Loader2, MapPin, AlertTriangle, Navigation } from 'lucide-react';
import { RootState, AppDispatch } from '../../store/store';
import { fetchAccidentsNearby } from '../../redux/slices/accidentSlice';
import { updateDrivingData } from '../../redux/slices/drivingSlice';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface Accident {
  latitude: string;
  longitude: string;
  Number_of_Vehicles: string;
  Time: string;
  Date: string;
}

// Custom component to recenter the map when user location changes
const MapRecenter = ({ position }: { position: [number, number] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (position[0] !== 0 && position[1] !== 0) {
      map.setView(position, 14);
    }
  }, [position, map]);
  
  return null;
};

// Marker color based on accident time (red for recent, yellow for older)
const getMarkerColor = (dateStr: string) => {
  const accidentDate = new Date(dateStr.split('-').reverse().join('-'));
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  return accidentDate > sixMonthsAgo ? '#ef4444' : '#f59e0b';
};

const LiveMap = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isDriving } = useSelector((state: RootState) => state.driving);
  const { coordinates, speed } = useSelector((state: RootState) => state.driving);
  const { accidents, loading } = useSelector((state: RootState) => state.accidents);
  
  const [currentPosition, setCurrentPosition] = useState<[number, number]>([14, 56]);
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
  const mapRef = useRef<Map | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Set up and clean up geolocation watcher when driving mode changes
  useEffect(() => {
    // Start watching position when driving mode is turned on
    if (isDriving) {
      setIsLocating(true);
      
      // Check if geolocation is available
      if ("geolocation" in navigator) {
        // Get initial position
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newPosition: [number, number] = [
              position.coords.latitude,
              position.coords.longitude
            ];
            setCurrentPosition(newPosition);
            
            // Update Redux store with location data
            dispatch(updateDrivingData({
              coordinates: {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              },
              location: "Current Location", // You could use reverse geocoding here
              speed: position.coords.speed ? Math.round(position.coords.speed * 3.6) : 0 // m/s to km/h
            }));
            
            // Fetch accidents near the current location
            dispatch(fetchAccidentsNearby({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              radius: 10 // 10km radius
            }));
            
            setIsLocating(false);
          },
          (error) => {
            console.error("Error getting initial location:", error);
            toast.error("Unable to get your location. Please check your location permissions.");
            setIsLocating(false);
          }
        );
        
        // Start watching position for real-time updates
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const newPosition: [number, number] = [
              position.coords.latitude,
              position.coords.longitude
            ];
            setCurrentPosition(newPosition);
            
            // Update Redux store with new location data
            dispatch(updateDrivingData({
              coordinates: {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              },
              location: "Current Location", // You could use reverse geocoding here
              speed: position.coords.speed ? Math.round(position.coords.speed * 3.6) : 0 // m/s to km/h
            }));
            
            // Fetch accidents when position changes significantly (e.g., 1km)
            // This prevents too many API calls as the user moves
            const prevLat = coordinates.lat;
            const prevLng = coordinates.lng;
            const newLat = position.coords.latitude;
            const newLng = position.coords.longitude;
            
            // Calculate rough distance (in km) using Haversine formula approximation
            const distance = Math.sqrt(
              Math.pow((newLat - prevLat) * 111, 2) + 
              Math.pow((newLng - prevLng) * 111 * Math.cos(newLat * Math.PI / 180), 2)
            );
            
            if (distance > 1) { // If moved more than 1km
              dispatch(fetchAccidentsNearby({
                latitude: newLat,
                longitude: newLng,
                radius: 10
              }));
            }
          },
          (error) => {
            console.error("Error watching position:", error);
            toast.error("Location tracking error. Please check your location permissions.");
          },
          { 
            enableHighAccuracy: true, 
            maximumAge: 0,
            timeout: 5000 
          }
        );
        
        watchIdRef.current = watchId;
      } else {
        toast.error("Geolocation is not supported by your browser");
        setIsLocating(false);
      }
    } else {
      // Clean up the watcher when driving mode is turned off
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
    
    // Clean up on unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isDriving, dispatch]);

  if (!isDriving) {
    return null;
  }

  // Custom accident icon
  const accidentIcon = (color: string) => new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });

  // Custom driver position icon
  const driverIcon = new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#2563eb" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });

  return (
    <Card className="mt-4 overflow-hidden">
      <CardContent className="p-0">
        <div style={{ height: '500px', width: '100%', position: 'relative' }}>
          {(loading || isLocating) && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
              <div className="flex flex-col items-center">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <span className="mt-2 text-sm font-medium">
                  {isLocating ? "Getting your location..." : "Loading accident data..."}
                </span>
              </div>
            </div>
          )}
          
          {currentPosition[0] !== 0 ? (
            <MapContainer
              center={currentPosition}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
              whenReady={() => {
                if(mapRef.current) 
                    setMapBounds(mapRef.current.getBounds());
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Current position marker with custom icon */}
              <Marker position={currentPosition} icon={driverIcon}>
                <Popup>
                  <div className="text-center">
                    <div className="font-bold mb-1">Your Location</div>
                    <div className="text-xs text-gray-500">
                      {currentPosition[0].toFixed(6)}, {currentPosition[1].toFixed(6)}
                    </div>
                    <div className="mt-1 text-sm">
                      <span className="font-medium">Speed:</span> {speed || 0} km/h
                    </div>
                  </div>
                </Popup>
              </Marker>
              
              {/* Safety radius (5km) */}
              <Circle
                center={currentPosition}
                radius={5000}
                pathOptions={{ fillColor: '#3b82f680', fillOpacity: 0.1, weight: 1, color: '#3b82f6' }}
              />
              
              {/* Accident markers */}
              {accidents.map((accident: Accident, index: number) => {
                const lat = parseFloat(accident.latitude);
                const lng = parseFloat(accident.longitude);
                
                if (isNaN(lat) || isNaN(lng)) return null;
                
                return (
                  <Marker 
                    key={`accident-${index}`}
                    position={[lat, lng]}
                    icon={accidentIcon(getMarkerColor(accident.Date))}
                  >
                    <Popup>
                      <div className="accident-popup">
                        <div className="flex items-center mb-2">
                          <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
                          <h3 className="font-bold text-red-500">Accident Report</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1 text-sm">
                          <span className="text-gray-500">Date:</span>
                          <span>{accident.Date}</span>
                          
                          <span className="text-gray-500">Time:</span>
                          <span>{accident.Time}</span>
                          
                          <span className="text-gray-500">Vehicles Involved:</span>
                          <span>{accident.Number_of_Vehicles}</span>
                          
                          <span className="text-gray-500">Coordinates:</span>
                          <span className="text-xs">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              
              {/* Update map center when user location changes */}
              <MapRecenter position={currentPosition} />
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <Navigation className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Waiting for location data...</p>
                <p className="text-xs text-gray-400 mt-2">
                  Please make sure location services are enabled on your device
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveMap;