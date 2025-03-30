import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store/store";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setAuth } from "../redux/slices/authSlice"
import { setDrivingMode } from "../redux/slices/drivingSlice"
import DrivingMonitor from "./components/DriverMonitoring";
import { Loader2, User, Car, Phone, Calendar, Edit, LogOut } from "lucide-react";
import { toast } from "sonner";
import JerkDetection, { simulateAccident } from "./components/JerkDetection"
import { axiosInstance } from "@/lib/axios";

const DriverDashboard = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isLoggedIn } = useSelector((state: RootState) => state.auth);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { isDriving } = useSelector((state: RootState) => state.driving);

    useEffect(() => {
        const checkAuthStatus = async () => {
            const token = localStorage.getItem("accessToken");

            if (!token && !isLoggedIn) {
                navigate("/login");
                return;
            }

            // If token exists but isLoggedIn is false, validate token with backend
            if (token && !isLoggedIn) {
                try {
                    // Make a request to validate the token
                    const response = await axiosInstance.get("/users/current-user", {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });

                    // If successful, update Redux state to reflect user is logged in
                    if (response.data?.data) {
                        dispatch(setAuth({
                            isLoggedIn: true,
                            user: response.data.data
                        }));
                    } else {
                        // Token is invalid, redirect to login
                        localStorage.removeItem("accessToken");
                        navigate("/login");
                    }
                } catch (error) {
                    // Token validation failed, redirect to login
                    console.error("Token validation failed:", error);
                    localStorage.removeItem("accessToken");
                    navigate("/login");
                }
            }
        };

        checkAuthStatus();
    }, [dispatch, isLoggedIn, navigate]);

    useEffect(() => {
        // Redirect if not logged in
        if (!isLoggedIn) {
            return;
        }

        // Fetch current user data
        const fetchUserData = async () => {
            try {
                setLoading(true);
                const response = await axiosInstance.get("/users/current-user", {
                    withCredentials: true, // Important for sending cookies
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                    }
                });
                setUser(response.data.data);
                setLoading(false);
            } catch (error: any) {
                console.error("Failed to fetch user data:", error);
                if (error.response?.status === 401) {
                    localStorage.removeItem("accessToken");
                    dispatch(setAuth({ isLoggedIn: false, user: null }));
                    navigate("/login");
                    toast("Session expired. Please login again.");
                } else {
                    toast("Failed to load user data: " + (error.response?.data?.message || "Unknown error"));
                }
            }
            finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [isLoggedIn, navigate]);

    const handleDrivingToggle = (checked: boolean) => {
        dispatch(setDrivingMode(checked));
        // Here you would normally update the driving status in the backend
        toast(`Driving mode ${checked ? "activated" : "deactivated"}`);

        // In a real app, you might want to make an API call like this:
        /*
        axiosInstance.post("/users/update-driving-status", 
          { isDriving: checked },
          { withCredentials: true }
        ).then(() => {
          toast(`Driving mode ${checked ? "activated" : "deactivated"}`);
        }).catch(error => {
          toast("Failed to update driving status");
          setIsDriving(!checked); // Revert the UI state on failure
        });
        */
    };

    const handleUpdateProfile = () => {
        navigate("/profile/edit");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span>Loading dashboard...</span>
            </div>
        );
    }

    const handleLogout = async () => {
        try {
            await axiosInstance.post("/users/logout", {}, {
                withCredentials: true
            });
            // Clear local storage
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            // Clear Redux state
            dispatch(setAuth({ isLoggedIn: false, user: null }));
            // Redirect to login
            navigate("/login");
        } catch (error) {
            console.error("Failed to logout:", error);
        }
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <Card className="w-full max-w-4xl mx-auto">
                <CardHeader className="relative">
                    <CardTitle className="text-2xl">Driver Dashboard</CardTitle>
                    <CardDescription>Welcome back! Manage your driving sessions and profile.</CardDescription>

                    <div className="absolute right-6 top-6 flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="driving-mode"
                                checked={isDriving}
                                onCheckedChange={handleDrivingToggle}
                            />
                            <Label htmlFor="driving-mode" className={isDriving ? "text-green-600 font-semibold" : ""}>
                                {isDriving ? "Driving Mode Active" : "Start Driving"}
                            </Label>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Profile Photo and Update Button */}
                        <div className="flex flex-col items-center space-y-4">
                            <Avatar className="h-32 w-32 border-2 border-gray-200">
                                <AvatarImage src={user?.photo || ""} alt={user?.fullName} />
                                <AvatarFallback>{user?.fullName?.substring(0, 2).toUpperCase() || "DR"}</AvatarFallback>
                            </Avatar>

                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center"
                                onClick={handleUpdateProfile}
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Update Profile
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center"
                                onClick={handleLogout}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </Button>
                        </div>

                        {/* Driver Details */}
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Name */}
                                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                                    <User className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <p className="text-sm text-gray-500">Full Name</p>
                                        <p className="font-medium">{user?.fullName}</p>
                                    </div>
                                </div>

                                {/* Age */}
                                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                                    <Calendar className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <p className="text-sm text-gray-500">Age</p>
                                        <p className="font-medium">{user?.age || "Not specified"}</p>
                                    </div>
                                </div>

                                {/* Gender */}
                                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                                    <User className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <p className="text-sm text-gray-500">Gender</p>
                                        <p className="font-medium capitalize">{user?.gender || "Not specified"}</p>
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                                    <Phone className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <p className="text-sm text-gray-500">Mobile Number</p>
                                        <p className="font-medium">{user?.phoneNumber || "Not specified"}</p>
                                    </div>
                                </div>

                                {/* Vehicle Model */}
                                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                                    <Car className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <p className="text-sm text-gray-500">Vehicle Model</p>
                                        <p className="font-medium">{user?.vehicleModel || "Not specified"}</p>
                                    </div>
                                </div>

                                {/* Vehicle Number */}
                                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                                    <Car className="h-5 w-5 text-gray-500" />
                                    <div>
                                        <p className="text-sm text-gray-500">Vehicle Number</p>
                                        <p className="font-medium">{user?.vehicleNumber || "Not specified"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Additional dashboard content can go here */}
                    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
                        <p className="text-gray-500 italic">No recent driving activity to show.</p>
                    </div>
                </CardContent>
            </Card>
            <div className="w-full max-w-4xl mx-auto">
                <DrivingMonitor />
            </div>
            {isDriving && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium">Safety Systems</h3>
                            <p className="text-sm text-gray-500">Collision detection is active while driving</p>
                        </div>

                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                                // Call the simulate function
                                simulateAccident();
                                // Or trigger a custom event
                                window.dispatchEvent(new CustomEvent('simulate-accident'));
                            }}
                        >
                            Test Accident Detection
                        </Button>
                    </div>
                </div>
            )}

            {/* Add the JerkDetection component at the bottom of your component, before the final closing div */}
            <JerkDetection />
        </div>
    );
};

export default DriverDashboard;