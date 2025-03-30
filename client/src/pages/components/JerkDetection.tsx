import { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { toast } from 'sonner';
import { RootState } from '../../store/store';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangleIcon } from 'lucide-react';
import { axiosInstance } from '@/lib/axios';

// Constants
const JERK_THRESHOLD = 15; // Threshold for acceleration change to detect a jerk
const ACCIDENT_THRESHOLD = 20; // Higher threshold considered as accident
const GPS_OPTIONS = {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0
};

interface User {
    _id: string;
    role: 'User' | 'Admin' | string;
    fullName: string;
    vehicleType: string;
    vehicleModel: string;
    vehicleNumber: string;
    licenseNumber: string;
    age: number;
    gender: 'M' | 'F' | 'Other' | string;
    serviceProvider: string;
    email: string;
    phoneNumber: string;
    photo: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
}

type AccelerometerData = {
    x: number;
    y: number;
    z: number;
};

type Location = {
    latitude: number;
    longitude: number;
};

interface AccidentData {
    _id?: string;
    location: number[];
    speed: number;
    isDrowsy: boolean;
    isOversped: boolean;
    victimDetails: string;
}

const JerkDetection = () => {
    const { isDriving } = useSelector((state: RootState) => state.driving);

    // States
    const [accelerometer, setAccelerometer] = useState<AccelerometerData | null>(null);
    const [previousAccelerometer, setPreviousAccelerometer] = useState<AccelerometerData | null>(null);
    const [location, setLocation] = useState<Location | null>(null);
    const [speed, setSpeed] = useState<number>(0);
    const [alertOpen, setAlertOpen] = useState<boolean>(false);
    const [isDrowsy, setIsDrowsy] = useState<boolean>(false);
    const [isOversped, setIsOversped] = useState<boolean>(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [accidentId, setAccidentId] = useState<string>("");

    // Refs
    const watchId = useRef<number | null>(null);
    const accelerometerInterval = useRef<NodeJS.Timeout | null>(null);
    const jerkTimerId = useRef<NodeJS.Timeout | null>(null);
    const isProcessingJerk = useRef<boolean>(false);

    // Sensitivity adjustments for testing in different environments
    const sensitivity = useRef<number>(1.0);

    // Set up sensor monitoring when driving mode is enabled
    useEffect(() => {
        if (isDriving) {
            startMonitoring();
        } else {
            stopMonitoring();
        }

        return () => {
            stopMonitoring();
        };
    }, [isDriving]);

    // Fetch drowsiness and overspeeding status from other components/state
    useEffect(() => {
        // For this example, we'll simulate by randomly setting these values when in driving mode
        // In a real application, these would come from your drowsiness detection and speed monitoring
        if (isDriving) {
            // This is just for simulation - in real app these would be derived from 
            // actual drowsiness detection and speed limit data
            const drowsinessCheckInterval = setInterval(() => {
                // Get state from your existing drowsiness detection system
                // This is a placeholder for how you would integrate with it
                const drowsyStateFromDetection = document.querySelector('.drowsy-indicator')?.getAttribute('data-drowsy') === 'true';
                setIsDrowsy(drowsyStateFromDetection || false);
            }, 5000);

            return () => {
                clearInterval(drowsinessCheckInterval);
            };
        }
    }, [isDriving]);

    // Start accelerometer and GPS monitoring
    const startMonitoring = () => {
        // Start GPS monitoring
        if ('geolocation' in navigator) {
            watchId.current = navigator.geolocation.watchPosition(
                handlePositionSuccess,
                handlePositionError,
                GPS_OPTIONS
            );
        } else {
            toast('Geolocation is not supported by this device');
        }

        // Start accelerometer monitoring if available
        if ('DeviceMotionEvent' in window) {
            window.addEventListener('devicemotion', handleDeviceMotion);

            // Fallback polling approach in case event-based approach isn't reliable
            accelerometerInterval.current = setInterval(() => {
                if (accelerometer && previousAccelerometer) {
                    checkForJerk(accelerometer, previousAccelerometer);
                }
            }, 200); // Check for jerks 5 times per second
        } else {
            toast('Motion sensors are not available on this device');
        }
    };

    // Stop all monitoring
    const stopMonitoring = () => {
        if (watchId.current !== null) {
            navigator.geolocation.clearWatch(watchId.current);
            watchId.current = null;
        }

        window.removeEventListener('devicemotion', handleDeviceMotion);

        if (accelerometerInterval.current) {
            clearInterval(accelerometerInterval.current);
            accelerometerInterval.current = null;
        }

        if (jerkTimerId.current) {
            clearTimeout(jerkTimerId.current);
            jerkTimerId.current = null;
        }
    };

    // Handle GPS position updates
    const handlePositionSuccess = (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });

        // Speed is provided by the GPS in meters/second, convert to km/h
        if (position.coords.speed !== null) {
            const speedInKmh = position.coords.speed * 3.6;
            setSpeed(speedInKmh);

            // Check if overspeeding (assuming speed limit is 80 km/h)
            setIsOversped(speedInKmh > 80);
        }
    };

    // Handle GPS errors
    const handlePositionError = (error: GeolocationPositionError) => {
        console.error("GPS error:", error.message);
        // Fallback to approximate location or last known location
    };

    // Process device motion data
    const handleDeviceMotion = (event: DeviceMotionEvent) => {
        const { acceleration } = event;

        if (acceleration && acceleration.x !== null && acceleration.y !== null && acceleration.z !== null) {
            const currentAcceleration = {
                x: acceleration.x,
                y: acceleration.y,
                z: acceleration.z
            };

            // Store previous accelerometer reading before updating
            if (accelerometer) {
                setPreviousAccelerometer(accelerometer);
            }

            setAccelerometer(currentAcceleration);

            // Check for jerk if we have a previous reading to compare with
            if (previousAccelerometer) {
                checkForJerk(currentAcceleration, previousAccelerometer);
            }
        }
    };

    // Calculate magnitude of accelerometer change to detect jerks
    const checkForJerk = (current: AccelerometerData, previous: AccelerometerData) => {
        // Don't process multiple jerks in quick succession
        if (isProcessingJerk.current) return;

        // Calculate the magnitude of change in acceleration
        const deltaX = Math.abs(current.x - previous.x);
        const deltaY = Math.abs(current.y - previous.y);
        const deltaZ = Math.abs(current.z - previous.z);

        // Calculate the total magnitude of the jerk
        const jerkMagnitude = (deltaX + deltaY + deltaZ) * sensitivity.current;

        // If jerk magnitude exceeds threshold, consider it a potential accident
        if (jerkMagnitude > JERK_THRESHOLD) {
            isProcessingJerk.current = true;

            // For major jerks, immediately trigger accident flow
            if (jerkMagnitude > ACCIDENT_THRESHOLD) {
                handlePossibleAccident();
            } else {
                // For minor jerks, wait a moment to see if a bigger jerk follows
                // (sometimes there's a series of accelerations in an accident)
                jerkTimerId.current = setTimeout(() => {
                    isProcessingJerk.current = false;
                }, 2000);
            }
        }
    };

    // Handle the accident case
    const handlePossibleAccident = async () => {
        console.log("Potential accident detected!");

        // Display alert dialog
        setAlertOpen(true);

        // Play an alarm sound
        const audio = new Audio('/alarm.mp3');
        audio.play().catch(e => console.error("Couldn't play alarm sound:", e));

        // Prepare accident data
        const accidentData: AccidentData = {
            location: location ? [location.latitude, location.longitude] : [0, 0],
            speed: speed,
            isDrowsy: isDrowsy,
            isOversped: isOversped,
            victimDetails: currentUser?._id || ''
        };

        // Send accident data to the server
        try {
            const response = await axiosInstance.post(
                '/users/upload-accident',
                accidentData,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                    }
                }
            );

            if (response.data.success) {
                // Successfully reported accident
                toast("Accident report sent to emergency services");
                console.log("Accident data:", response.data);
                setAccidentId(response.data.data._id); // Store accident data for SMS
                // Send SMS to emergency contacts
                await sendEmergencySMS(accidentData);
            }
        } catch (error) {
            console.error("Failed to report accident:", error);
            toast("Failed to report accident to emergency services");
        }

        // Reset jerk processing flag after a delay
        setTimeout(() => {
            isProcessingJerk.current = false;
        }, 5000);
    };
    const deleteAccidentData = async () => {
        try {
            if (accidentId) {
                const id = accidentId;
                const response = await axiosInstance.delete(
                    `/users/delete-accident/${id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                        }
                    }
                );

                if (response.data.success) {
                    toast("Removed most recent record");
                }
            } else {
                toast("No accident record to delete");
            }
        } catch (error) {
            console.error("Failed to delete accident data:", error);
            toast("Failed to remove most recent record");
        }
    }
    // Send SMS to emergency contacts
    const sendEmergencySMS = async (accidentData: AccidentData) => {
        try {
            const response = await axiosInstance.get('/users/current-user', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken')}`
                }
            });
            const user = response.data.data;
            // const locationLink = accidentData.location[0] !== 0
            //     ? `https://maps.google.com/?q=${accidentData.location[0]},${accidentData.location[1]}`
            //     : "Location unavailable";
            if (user)
                setCurrentUser(user);
            // const message = `EMERGENCY: Possible vehicle accident detected for ${user?.fullName}. Location: ${locationLink}. Speed: ${accidentData.speed.toFixed(1)} km/h. Please respond immediately!`;

            // In a real application, you would use an SMS API service
            // Here we're just simulating the process

            const smsResponse = await axios.post('http://localhost:8001/api/accident-alert', {
                location: accidentData.location,
                speed: accidentData.speed,
                isDrowsy: accidentData.isDrowsy,
                isOversped: accidentData.isOversped,
                victimDetails: accidentData.victimDetails,
                // Optionally include specific emergency contacts
                emergencyContacts: user?.emergencyContacts,
            });

            toast(`Alert messages sent to ${smsResponse.data.sent_count} emergency contacts`);
        } catch (error) {
            console.error("Failed to send emergency SMS:", error);
            toast("Failed to send emergency notifications", {
                icon: <AlertTriangleIcon />
            });
        }
    };

    const handleOkayButton = () => {
        setAlertOpen(false);
        // Stop the alarm sound if it's playing
        const audio = new Audio('/alarm.mp3');
        audio.pause();
        audio.currentTime = 0; // Reset to start
        deleteAccidentData();
        // Reset drowsiness and overspeeding states
        setIsDrowsy(false);
        setIsOversped(false);
        // Reset accelerometer and location states
        setAccelerometer(null);
        setPreviousAccelerometer(null);
    }

    // Simulate a jerk for testing purposes
    const simulateJerk = () => {
        const simulatedCurrent = { x: 25, y: 15, z: 20 };
        const simulatedPrevious = { x: 5, y: 3, z: 2 };

        checkForJerk(simulatedCurrent, simulatedPrevious);
    };

    useEffect(() => {
        // Listen for the simulation event
        const handleSimulation = () => {
            if (isDriving) {
                console.log("Simulation triggered - initiating jerk detection test");
                simulateJerk();
            } else {
                toast.error("Please activate driving mode to test accident detection");
            }
        };

        // Add event listener for simulation
        window.addEventListener('simulate-accident', handleSimulation);

        if (isDriving) {
            startMonitoring();
        } else {
            stopMonitoring();
        }

        // Clean up function
        return () => {
            window.removeEventListener('simulate-accident', handleSimulation);
            stopMonitoring();
        };
    }, [isDriving]);

    // This component doesn't render anything visible directly
    // It just attaches the necessary event listeners and provides the simulation function
    return (
        <>
            {/* Alert Dialog for accident detection */}
            <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-red-600 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Accident Detected!
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            <p className="text-base font-medium mb-2">Our system has detected a potential accident.</p>
                            <div className="bg-red-50 p-3 rounded-md text-sm space-y-1 mb-3">
                                <p>• Emergency contacts are being notified</p>
                                <p>• Current speed: {speed.toFixed(1)} km/h</p>
                                <p>• Location: {location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Unavailable'}</p>
                                {isDrowsy && <p>• Drowsiness was detected before the incident</p>}
                                {isOversped && <p>• Vehicle was exceeding speed limit</p>}
                            </div>
                            <p>Are you okay? If this is a false alarm, please tap "I'm Okay" below.</p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleOkayButton}>I'm Okay</AlertDialogCancel>
                        <AlertDialogCancel className="bg-red-600 hover:bg-red-700">
                            Close
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

// Export the simulation function for testing
export const simulateAccident = () => {
    // This will be called from the dashboard
    const evt = new CustomEvent('simulate-accident');
    window.dispatchEvent(evt);
};

export default JerkDetection;