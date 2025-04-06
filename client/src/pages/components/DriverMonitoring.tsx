import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  MapPin, 
  AlertTriangle, 
  Gauge, 
  Clock,
  Zap
} from "lucide-react";
import { updateDrivingData } from "../../redux/slices/drivingSlice";
import { RootState, AppDispatch } from "../../store/store";
import { toast } from "sonner";
import DrowsinessMonitor from "./DrowsinessMonitor";
import LiveMap from "./LiveMap";

const SPEED_LIMIT = 80; // km/h, can be dynamic based on location

const DrivingMonitor = ({ 
  lastValidLocation, 
  setLastValidLocation 
}: { 
  lastValidLocation: [number, number];
  setLastValidLocation: React.Dispatch<React.SetStateAction<[number, number]>>;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isDriving, location, coordinates, speed, isOverspeeding } = 
    useSelector((state: RootState) => state.driving);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("stats");

  // Set up geolocation tracking when driving state changes
  useEffect(() => {
    if (isDriving) {
      // Start tracking location and speed
      if ("geolocation" in navigator) {
        const id = navigator.geolocation.watchPosition(
          (position) => {
            // Get location name using reverse geocoding
            fetchLocationName(position.coords.latitude, position.coords.longitude)
              .then(locationName => {
                // Calculate speed (geolocation API gives m/s, convert to km/h)
                const currentSpeed = position.coords.speed ? position.coords.speed * 3.6 : 0;
                const isOverSpeedLimit = currentSpeed > SPEED_LIMIT;
                
                const newLocation: [number, number] = [coordinates.lat, coordinates.lng];
                const isValidLocation = Math.abs(coordinates.lat) > 0.001 && Math.abs(coordinates.lng) > 0.001;
                
                if(isValidLocation) {
                  setLastValidLocation(newLocation);
                  console.log(lastValidLocation)
                }

                // Dispatch to redux
                dispatch(updateDrivingData({
                  coordinates: {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                  },
                  location: locationName,
                  speed: Math.round(currentSpeed),
                  isOverspeeding: isOverSpeedLimit
                }));
                
                // Alert if overspeeding
                if (isOverSpeedLimit) {
                  toast.warning("Slow down! You're exceeding the speed limit!");
                }
              });
          },
          (error) => {
            console.error("Error getting location:", error);
            toast.error("Unable to track location. Please check your permissions.");
          },
          { 
            enableHighAccuracy: true, 
            maximumAge: 0,
            timeout: 5000 
          }
        );
        
        setWatchId(id);
      } else {
        toast.error("Geolocation is not supported by your browser");
      }
    } else if (watchId !== null) {
      // Stop tracking when not driving
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      
      // Reset driving data
      dispatch(updateDrivingData({
        coordinates: { lat: 0, lng: 0 },
        location: "",
        speed: 0,
        isOverspeeding: false
      }));
    }
    
    // Cleanup function
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isDriving, dispatch]);

  // Fetch location name from coordinates
  const fetchLocationName = async (lat: number, lng: number): Promise<string> => {
    try {
      return "Current Location: "+lat+" N, "+lng+" E"; // Placeholder for actual geocoding
    } catch (error) {
      console.error("Error fetching location name:", error);
      return "Unknown Location";
    }
  };

  // If not driving, show the get started message
  if (!isDriving) {
    return (
      <Card className="mt-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Zap className="h-16 w-16 mb-4" />
          <h3 className="text-2xl font-bold mb-2">Ready to hit the road?</h3>
          <p className="text-center mb-6">
            Toggle the driving mode above to start tracking your journey stats and get real-time navigation.
          </p>
          <div className="animate-bounce mt-4">
            <AlertTriangle className="h-8 w-8" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // If driving, show the tabs with stats and navigation
  return (
    <Card className={`mt-6 transition-all duration-300 ${isOverspeeding ? 'border-red-500 border-2' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Driving Monitor</CardTitle>
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2 text-gray-500" />
            <DrivingTimer />
            
            {isOverspeeding && (
              <Badge variant="destructive" className="animate-pulse ml-4">
                <AlertTriangle className="h-4 w-4 mr-1" /> OVERSPEEDING
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="stats">Real-time Stats</TabsTrigger>
            <TabsTrigger value="navigation">Live Navigation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats" className="space-y-4">
            {/* Location Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <MapPin className="h-5 w-5 text-gray-500 mr-2" />
                <h3 className="font-medium">Current Location</h3>
              </div>
              <p className="text-lg">{location || "Acquiring location..."}</p>
              {coordinates.lat !== 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                </p>
              )}
            </div>
            
            {/* Speed Information */}
            <div className={`p-4 rounded-lg ${isOverspeeding ? 'bg-red-50' : 'bg-gray-50'}`}>
              <div className="flex items-center mb-2">
                <Gauge className={`h-5 w-5 mr-2 ${isOverspeeding ? 'text-red-500' : 'text-gray-500'}`} />
                <h3 className="font-medium">Current Speed</h3>
              </div>
              
              <div className="flex items-end mb-2">
                <span className={`text-3xl font-bold ${isOverspeeding ? 'text-red-500' : ''}`}>
                  {speed}
                </span>
                <span className="text-gray-500 ml-1">km/h</span>
              </div>
              
              <div className="mt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>0 km/h</span>
                  <span>Speed Limit: {SPEED_LIMIT} km/h</span>
                </div>
                <Progress 
                  value={(speed / SPEED_LIMIT) * 100} 
                  max={100}
                  className={isOverspeeding ? "bg-red-200" : "bg-gray-200"}
                />
              </div>
              
              {isOverspeeding && (
                <div className="mt-3 p-2 bg-red-100 text-red-700 rounded flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">
                    Please slow down! You're exceeding the speed limit.
                  </span>
                </div>
              )}
            </div>
            
          </TabsContent>
          
          <TabsContent value="navigation">
            <LiveMap/>
            <DrowsinessMonitor/>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Helper component for driving timer
const DrivingTimer = () => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const isDriving = useSelector((state: RootState) => state.driving.isDriving);
  
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isDriving) {
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isDriving]);
  
  // Format time as HH:MM:SS
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };
  
  return (
    <div className="text-2xl font-mono font-bold text-center py-2">
      {formatTime(elapsedTime)}
    </div>
  );
};

export default DrivingMonitor;