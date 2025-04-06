import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { RootState, AppDispatch } from '../store/store';
import { fetchAdminProfile, fetchClients } from '../redux/slices/adminSlice';
import { logoutAdmin, setAuth } from '../redux/slices/authSlice';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Briefcase, Phone, Users, Search, UserCheck, LogOut, AlertTriangle, BarChart2, ChevronUp, ChevronDown, Loader2, Stars } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart as RechartsPieChart,
    Pie,
    Cell
} from 'recharts';
import { axiosInstance } from '@/lib/axios';
import AdminChatBot from './components/AdminChatBot';

interface SortConfig {
    key: string;
    direction: 'asc' | 'desc';
}

interface Accident {
    _id: string;
    location: number[];
    speed: number;
    isDrowsy: boolean;
    isOversped: boolean;
    createdAt: Date;
    victimDetails: {
        fullName: string;
        vehicleModel: string;
        vehicleNumber: string;
        age: number;
        gender: string;
        email: string;
        phoneNumber: string;
        photo: string;
    };
}

// Helper to group accidents by day
const groupAccidentsByDay = (accidents: Accident[]) => {
    const grouped = accidents.reduce((acc: Record<string, number>, accident) => {
        const day = format(new Date(accident.createdAt), 'MMM dd');
        acc[day] = (acc[day] || 0) + 1;
        return acc;
    }, {});

    // Convert to array for chart
    return Object.entries(grouped).map(([date, count]) => ({
        date,
        accidents: count
    }));
};

// Helper for accident type counts
const getAccidentTypeCounts = (accidents: Accident[]) => {
    let drowsyCount = 0;
    let overspeedCount = 0;
    let bothCount = 0;

    accidents.forEach(accident => {
        if (accident.isDrowsy && accident.isOversped) {
            bothCount++;
        } else if (accident.isDrowsy) {
            drowsyCount++;
        } else if (accident.isOversped) {
            overspeedCount++;
        }
    });

    return [
        { name: 'Drowsy', value: drowsyCount },
        { name: 'Oversped', value: overspeedCount },
        { name: 'Both', value: bothCount }
    ];
};

const COLORS = ['#0088FE', '#FF8042', '#FF0000'];

const AdminDashboard = () => {
    const { companySlug } = useParams<{ companySlug: string }>();
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();

    // Auth state
    const { isLoggedIn, isAdmin, isLoading: authLoading } = useSelector((state: RootState) => state.auth);

    // Admin state
    const { profile, clients, clientCount, loading, error } = useSelector((state: RootState) => state.admin);

    // Local state
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBy, setFilterBy] = useState('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'fullName', direction: 'asc' });
    const [activeTab, setActiveTab] = useState('dashboard');
    const [accidents, setAccidents] = useState<Accident[]>([]);
    const [accidentsLoading, setAccidentsLoading] = useState(false);
    const [accidentsError, setAccidentsError] = useState<string | null>(null);
    const [accidentSortConfig, setAccidentSortConfig] = useState<SortConfig>({
        key: 'createdAt',
        direction: 'desc'
    });
    const [accidentFilterBy, setAccidentFilterBy] = useState('all');
    const [accidentSearchTerm, setAccidentSearchTerm] = useState('');
    const [expandedAccidentId, setExpandedAccidentId] = useState<string | null>(null);
    const [analysisData, setAnalysisData] = useState<Record<string, any>>({});
    const [analysingId, setAnalysingId] = useState<string | null>(null);
    const [analysisError, setAnalysisError] = useState<Record<string, string>>({});

    // Fetch data on component mount
    useEffect(() => {
        // Check if we have a token but no authenticated user
        const checkAuth = async () => {
            const accessToken = localStorage.getItem('accessToken');
            console.log("Access Token:", accessToken);
            console.log("Is Logged In:", isLoggedIn);
            if (accessToken && !isLoggedIn) {
                try {
                    // Set a loading state first to prevent redirect
                    dispatch({ type: 'auth/setLoading', payload: true });
                    console.log("authLoading: ", authLoading);
                    const response = await axiosInstance.get('/admin/current-admin', {
                        headers: {
                            Authorization: `Bearer ${accessToken}`
                        },
                        withCredentials: true
                    });
                    console.log("Response: ", response.data);
                    // Set auth state if successful
                    dispatch(setAuth({
                        isLoggedIn: true,
                        isAdmin: true,
                        user: {
                            ...response.data.data,
                            role: 'Admin'
                        }
                    }));
                    console.log("User: ", response.data.data);
                    // After auth is established, fetch profile data
                    await dispatch(fetchAdminProfile()).unwrap()
                        .then(adminData => {
                            const expectedSlug = `${adminData.companyName.replace(/\s+/g, '-')}-${adminData.phoneNumber}`;
                            console.log("Company slug:", companySlug);
                            if (companySlug !== expectedSlug) {
                                navigate(`/admin/${expectedSlug}/dashboard`, { replace: true });
                            }
                        });

                    await dispatch(fetchClients()).unwrap();
                } catch (error) {
                    console.error("Token validation error:", error);
                    localStorage.removeItem('accessToken');
                    navigate('/login', { replace: true });
                } finally {
                    // Set loading to false when complete
                    dispatch({ type: 'auth/setLoading', payload: false });
                }
            } else if (isLoggedIn && isAdmin) {
                // If already logged in according to Redux, just fetch the data
                dispatch(fetchAdminProfile())
                    .unwrap()
                    .then(adminData => {
                        const expectedSlug = `${adminData.companyName.replace(/\s+/g, '-')}-${adminData.phoneNumber}`;
                        if (companySlug !== expectedSlug) {
                            navigate(`/admin/${expectedSlug}/dashboard`, { replace: true });
                        }
                    })
                    .catch(error => {
                        toast(error || 'Failed to load admin profile', {
                            icon: <AlertTriangle className="h-4 w-4" />,
                            cancel: true,
                        });
                    });

                dispatch(fetchClients())
                    .unwrap()
                    .catch(error => {
                        toast.error(error || 'Failed to load clients data');
                    });
            } else {
                // Ensure loading is false when no auth is needed
                dispatch({ type: 'auth/setLoading', payload: false });
                navigate('/login', { replace: true });
                toast('Session expired. Please log in again.', {
                    cancel: true,
                    richColors: true
                })
            }
        }
        checkAuth();
    }, [dispatch, isLoggedIn, isAdmin, companySlug, navigate]);

    // Fetch accident data when mounting or switching to analytics tab
    useEffect(() => {
        if ((isLoggedIn && isAdmin) && (activeTab === 'analytics' || accidents.length === 0)) {
            fetchAccidents();
        }
    }, [activeTab, isLoggedIn, isAdmin]);

    // Function to fetch accidents data
    const fetchAccidents = async () => {
        setAccidentsLoading(true);
        setAccidentsError(null);

        try {
            const accessToken = localStorage.getItem('accessToken');
            const response = await axiosInstance.get('/admin/accidents', {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                withCredentials: true
            });

            setAccidents(response.data.data || []);
        } catch (error: any) {
            console.error('Error fetching accidents:', error);
            setAccidentsError(error.response?.data?.message || 'Failed to load accident data');
            toast.error('Failed to load accident data');
        } finally {
            setAccidentsLoading(false);
        }
    };

    const handleAnalyzeAccident = async (accident: Accident) => {
        // Set loading state
        setAnalysingId(accident._id);
        setAnalysisError({ ...analysisError, [accident._id]: '' });

        try {
            // Prepare the request data
            const requestData = {
                driver_data: {
                    driver_name: accident.victimDetails.fullName,
                    birth_date: new Date(new Date().getFullYear() - accident.victimDetails.age, 0, 1).toISOString().split('T')[0], // Approximate using age
                    gender: accident.victimDetails.gender,
                    vehicle_number: accident.victimDetails.vehicleNumber,
                    vehicle_model: accident.victimDetails.vehicleModel,
                    model_name: accident.victimDetails.vehicleModel, // Using model as model_name if specific name not available
                    drowsiness_state: accident.isDrowsy ? 1 : 0,
                    accident_prone_area: 0, // Not available in accident data, defaulting to 0
                    overspeeding: accident.isOversped ? 1 : 0,
                    jerk: 1 // Not available in accident data, defaulting to 0
                }
            };

            // Send the request to analyze-risk endpoint
            const response = await axiosInstance.post(
                'https://safedrive-chatbot.onrender.com/analyze-risk',
                requestData,
                {
                    headers: { 'Content-Type': 'application/json' }
                }
            );
            console.log('Analysis response:', response.data);
            // Store the analysis result
            setAnalysisData({
                ...analysisData,
                [accident._id]: response.data.data
            });

            // Expand the accident row to show analysis
            setExpandedAccidentId(accident._id);

        } catch (error: any) {
            console.error('Analysis failed:', error);
            setAnalysisError({
                ...analysisError,
                [accident._id]: error.response?.data?.message || 'Failed to analyze accident data'
            });
            toast.error('Failed to analyze accident data');
        } finally {
            setAnalysingId(null);
        }
    };

    // Handle logout
    const handleLogout = () => {
        dispatch(logoutAdmin())
            .unwrap()
            .then(() => {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                toast.success('Logged out successfully');
                navigate('/login');
            })
            .catch((error: any) => {
                toast.error('Logout failed: ' + error);
            });
    };

    // Get initials for avatar fallback
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase();
    };

    // Handle sorting for clients
    const handleSort = (key: string) => {
        setSortConfig(prevConfig => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Handle sorting for accidents
    const handleAccidentSort = (key: string) => {
        setAccidentSortConfig(prevConfig => ({
            key,
            direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Filter and sort clients
    const filteredClients = clients
        .filter(client => {
            // Search filter
            const matchesSearch = searchTerm.trim() === '' ||
                client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.phoneNumber.includes(searchTerm);

            // Category filter
            if (filterBy === 'all') return matchesSearch;
            return matchesSearch && client.vehicleType.toLowerCase() === filterBy.toLowerCase();
        })
        .sort((a, b) => {
            // Sorting
            const key = sortConfig.key as keyof typeof a;

            if (a[key] < b[key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    // Filter and sort accidents based on actual structure
    const filteredAccidents = accidents
        .filter(accident => {
            // Search filter for victim's name or vehicle details
            const matchesSearch = accidentSearchTerm.trim() === '' ||
                accident.victimDetails.fullName.toLowerCase().includes(accidentSearchTerm.toLowerCase()) ||
                accident.victimDetails.vehicleModel.toLowerCase().includes(accidentSearchTerm.toLowerCase()) ||
                accident.victimDetails.vehicleNumber.toLowerCase().includes(accidentSearchTerm.toLowerCase());

            // Type filter
            if (accidentFilterBy === 'all') return matchesSearch;
            if (accidentFilterBy === 'drowsy') return matchesSearch && accident.isDrowsy && !accident.isOversped;
            if (accidentFilterBy === 'oversped') return matchesSearch && accident.isOversped && !accident.isDrowsy;
            if (accidentFilterBy === 'both') return matchesSearch && accident.isDrowsy && accident.isOversped;

            return matchesSearch;
        })
        .sort((a, b) => {
            // Handle nested properties
            const key = accidentSortConfig.key as string;

            if (key.includes('.')) {
                const [parentKey, childKey] = key.split('.');
                // Handle specifically the victimDetails object which is a known nested property
                if (parentKey === 'victimDetails' &&
                    'victimDetails' in a &&
                    'victimDetails' in b) {
                    const aValue = a.victimDetails[childKey as keyof typeof a.victimDetails];
                    const bValue = b.victimDetails[childKey as keyof typeof b.victimDetails];

                    if (aValue < bValue) return accidentSortConfig.direction === 'asc' ? -1 : 1;
                    if (aValue > bValue) return accidentSortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }
                return 0; // Default if not handling this specific nested path
            }

            // Normal properties
            const aValue = a[key as keyof typeof a];
            const bValue = b[key as keyof typeof b];

            if (aValue < bValue) return accidentSortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return accidentSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    // Generate vehicle types for filter
    const vehicleTypes = [...new Set(clients.map(client => client.vehicleType))];

    // Prepare data for accident chart
    const accidentChartData = groupAccidentsByDay(accidents);
    const accidentTypeData = getAccidentTypeCounts(accidents);

    // Check auth status for protected route behavior
    if (authLoading) {
        // Show loading indicator while checking authentication
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                </Button>
            </div>

            {/* Company Info Card */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                    <CardDescription>Overview of your company details and statistics</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-1/3" />
                            <Skeleton className="h-6 w-1/4" />
                            <Skeleton className="h-6 w-1/5" />
                        </div>
                    ) : profile ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex flex-col">
                                <div className="flex items-center mb-2">
                                    <Briefcase className="h-5 w-5 mr-2 text-blue-500" />
                                    <span className="text-gray-500 font-medium">Company Name</span>
                                </div>
                                <span className="text-xl font-semibold">{profile.companyName}</span>
                            </div>

                            <div className="flex flex-col">
                                <div className="flex items-center mb-2">
                                    <Phone className="h-5 w-5 mr-2 text-blue-500" />
                                    <span className="text-gray-500 font-medium">Phone Number</span>
                                </div>
                                <span className="text-xl font-semibold">{profile.phoneNumber}</span>
                            </div>

                            <div className="flex flex-col">
                                <div className="flex items-center mb-2">
                                    <Users className="h-5 w-5 mr-2 text-blue-500" />
                                    <span className="text-gray-500 font-medium">Active Clients</span>
                                </div>
                                <span className="text-xl font-semibold">{clientCount}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-500">
                            No company information available
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                    <TabsTrigger value="dashboard">
                        <div className="flex items-center">
                            <Users className="h-4 w-4 mr-2" />
                            Dashboard
                        </div>
                    </TabsTrigger>
                    <TabsTrigger value="analytics">
                        <div className="flex items-center">
                            <BarChart2 className="h-4 w-4 mr-2" />
                            Analytics
                        </div>
                    </TabsTrigger>
                </TabsList>

                {/* Dashboard Tab */}
                <TabsContent value="dashboard">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <CardTitle>Client Management</CardTitle>
                                    <CardDescription>View and manage all registered clients</CardDescription>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                        <Input
                                            placeholder="Search clients..."
                                            className="pl-8 w-full sm:w-[250px]"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    <Select value={filterBy} onValueChange={setFilterBy}>
                                        <SelectTrigger className="w-full sm:w-[180px]">
                                            <SelectValue placeholder="Filter by vehicle" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Vehicles</SelectItem>
                                            {vehicleTypes.map(type => (
                                                <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-12 w-full" />
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[80px]">Photo</TableHead>
                                                    <TableHead
                                                        className="cursor-pointer hover:bg-gray-50"
                                                        onClick={() => handleSort('fullName')}
                                                    >
                                                        Name
                                                        {sortConfig.key === 'fullName' && (
                                                            <span className="ml-1">
                                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                            </span>
                                                        )}
                                                    </TableHead>
                                                    <TableHead
                                                        className="cursor-pointer hover:bg-gray-50"
                                                        onClick={() => handleSort('age')}
                                                    >
                                                        Age
                                                        {sortConfig.key === 'age' && (
                                                            <span className="ml-1">
                                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                            </span>
                                                        )}
                                                    </TableHead>
                                                    <TableHead>Gender</TableHead>
                                                    <TableHead>Phone Number</TableHead>
                                                    <TableHead
                                                        className="cursor-pointer hover:bg-gray-50"
                                                        onClick={() => handleSort('vehicleType')}
                                                    >
                                                        Vehicle Type
                                                        {sortConfig.key === 'vehicleType' && (
                                                            <span className="ml-1">
                                                                {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                                            </span>
                                                        )}
                                                    </TableHead>
                                                    <TableHead>Vehicle Model</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredClients.length > 0 ? (
                                                    filteredClients.map((client) => (
                                                        <TableRow key={client._id}>
                                                            <TableCell>
                                                                <Avatar>
                                                                    <AvatarImage src={client.avatar} alt={client.fullName} />
                                                                    <AvatarFallback>{getInitials(client.fullName)}</AvatarFallback>
                                                                </Avatar>
                                                            </TableCell>
                                                            <TableCell className="font-medium">{client.fullName}</TableCell>
                                                            <TableCell>{client.age}</TableCell>
                                                            <TableCell>{client.gender}</TableCell>
                                                            <TableCell>{client.phoneNumber}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className="capitalize">
                                                                    {client.vehicleType}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>{client.vehicleModel}</TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                                                            {searchTerm || filterBy !== 'all' ? (
                                                                <div className="flex flex-col items-center justify-center">
                                                                    <Search className="h-6 w-6 mb-2 text-gray-400" />
                                                                    No clients match your search criteria
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center">
                                                                    <UserCheck className="h-6 w-6 mb-2 text-gray-400" />
                                                                    No clients registered yet
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="mt-4 text-sm text-gray-500">
                                        Showing {filteredClients.length} of {clientCount} clients
                                    </div>
                                </>
                            )}

                            {error && (
                                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
                                    Error: {error}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Analytics Tab */}
                <TabsContent value="analytics">
                    <div className="space-y-6">
                        {/* Charts Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Trend Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Accident Trends</CardTitle>
                                    <CardDescription>Daily accident reports over time</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {accidentsLoading ? (
                                        <div className="h-80 w-full flex items-center justify-center">
                                            <Skeleton className="h-full w-full" />
                                        </div>
                                    ) : accidents.length > 0 ? (
                                        <div className="h-80 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={accidentChartData}
                                                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="date" />
                                                    <YAxis allowDecimals={false} />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="accidents" name="Accidents" fill="#3b82f6" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    ) : (
                                        <div className="h-80 w-full flex items-center justify-center text-gray-500">
                                            No accident data available
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Type Distribution Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Accident Type Distribution</CardTitle>
                                    <CardDescription>Breakdown by cause of accident</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {accidentsLoading ? (
                                        <div className="h-80 w-full flex items-center justify-center">
                                            <Skeleton className="h-full w-full" />
                                        </div>
                                    ) : accidents.length > 0 ? (
                                        <div className="h-80 w-full">
                                            {accidentTypeData.every(item => item.value === 0) ? (
                                                <div className="h-full w-full flex items-center justify-center text-gray-500">
                                                    No categorizable accident data available
                                                </div>
                                            ) : (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RechartsPieChart>
                                                        <Pie
                                                            data={accidentTypeData}
                                                            cx="50%"
                                                            cy="50%"
                                                            outerRadius={100}
                                                            fill="#8884d8"
                                                            dataKey="value"
                                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                        >
                                                            {accidentTypeData.map((_, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip formatter={(value) => [`${value} accidents`, 'Count']} />
                                                        <Legend />
                                                    </RechartsPieChart>
                                                </ResponsiveContainer>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="h-80 w-full flex items-center justify-center text-gray-500">
                                            No accident data available
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Accidents Table Card */}
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div>
                                        <CardTitle>Accident Reports</CardTitle>
                                        <CardDescription>Detailed list of all reported accidents</CardDescription>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                            <Input
                                                placeholder="Search victims..."
                                                className="pl-8 w-full sm:w-[250px]"
                                                value={accidentSearchTerm}
                                                onChange={(e) => setAccidentSearchTerm(e.target.value)}
                                            />
                                        </div>

                                        <Select value={accidentFilterBy} onValueChange={setAccidentFilterBy}>
                                            <SelectTrigger className="w-full sm:w-[180px]">
                                                <SelectValue placeholder="Filter by type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Types</SelectItem>
                                                <SelectItem value="drowsy">Drowsy Only</SelectItem>
                                                <SelectItem value="oversped">Oversped Only</SelectItem>
                                                <SelectItem value="both">Both Drowsy & Oversped</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {accidentsLoading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-12 w-full" />
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <Skeleton key={i} className="h-16 w-full" />
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[80px]">Victim</TableHead>
                                                        <TableHead
                                                            className="cursor-pointer hover:bg-gray-50"
                                                            onClick={() => handleAccidentSort('victimDetails.fullName')}
                                                        >
                                                            Name
                                                            {accidentSortConfig.key === 'victimDetails.fullName' && (
                                                                <span className="ml-1">
                                                                    {accidentSortConfig.direction === 'asc' ? '↑' : '↓'}
                                                                </span>
                                                            )}
                                                        </TableHead>
                                                        <TableHead>Vehicle</TableHead>
                                                        <TableHead
                                                            className="cursor-pointer hover:bg-gray-50"
                                                            onClick={() => handleAccidentSort('speed')}
                                                        >
                                                            Speed
                                                            {accidentSortConfig.key === 'speed' && (
                                                                <span className="ml-1">
                                                                    {accidentSortConfig.direction === 'asc' ? '↑' : '↓'}
                                                                </span>
                                                            )}
                                                        </TableHead>
                                                        <TableHead
                                                            className="cursor-pointer hover:bg-gray-50"
                                                            onClick={() => handleAccidentSort('createdAt')}
                                                        >
                                                            Date & Time
                                                            {accidentSortConfig.key === 'createdAt' && (
                                                                <span className="ml-1">
                                                                    {accidentSortConfig.direction === 'asc' ? '↑' : '↓'}
                                                                </span>
                                                            )}
                                                        </TableHead>
                                                        <TableHead>Location</TableHead>
                                                        <TableHead>Incident Type</TableHead>
                                                        <TableHead>Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredAccidents.length > 0 ? (
                                                        <>
                                                            {filteredAccidents.map((accident) => (
                                                                <React.Fragment key={accident._id}>
                                                                    <TableRow>
                                                                        <TableCell>
                                                                            <Avatar>
                                                                                <AvatarImage
                                                                                    src={accident.victimDetails.photo}
                                                                                    alt={accident.victimDetails.fullName}
                                                                                />
                                                                                <AvatarFallback>
                                                                                    {getInitials(accident.victimDetails.fullName)}
                                                                                </AvatarFallback>
                                                                            </Avatar>
                                                                        </TableCell>
                                                                        <TableCell className="font-medium">
                                                                            {accident.victimDetails.fullName}
                                                                            <div className="text-xs text-gray-500">
                                                                                {accident.victimDetails.phoneNumber}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <div>{accident.victimDetails.vehicleModel}</div>
                                                                            <div className="text-xs text-gray-500">
                                                                                {accident.victimDetails.vehicleNumber}
                                                                            </div>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <Badge
                                                                                variant={accident.isOversped ? "destructive" : "outline"}
                                                                            >
                                                                                {accident.speed} km/h
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {format(new Date(accident.createdAt), 'MMM dd, yyyy HH:mm')}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {accident.location[0].toFixed(6)}, {accident.location[1].toFixed(6)}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {accident.isDrowsy && accident.isOversped ? (
                                                                                <Badge className="bg-red-100 text-red-800 border-red-200">
                                                                                    Drowsy & Overspeeding
                                                                                </Badge>
                                                                            ) : accident.isDrowsy ? (
                                                                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                                                                    Drowsy
                                                                                </Badge>
                                                                            ) : accident.isOversped ? (
                                                                                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                                                                    Overspeeding
                                                                                </Badge>
                                                                            ) : (
                                                                                <Badge variant="outline">
                                                                                    Other
                                                                                </Badge>
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <div className="flex items-center space-x-2">
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    className="flex items-center"
                                                                                    onClick={() => handleAnalyzeAccident(accident)}
                                                                                    disabled={analysingId === accident._id}
                                                                                >
                                                                                    {analysingId === accident._id ? (
                                                                                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                                                    ) : (
                                                                                        <Stars className="h-4 w-4 mr-1" />
                                                                                    )}
                                                                                    AI Analysis
                                                                                </Button>

                                                                                {analysisData[accident._id] && (
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="ghost"
                                                                                        onClick={() => setExpandedAccidentId(
                                                                                            expandedAccidentId === accident._id ? null : accident._id
                                                                                        )}
                                                                                    >
                                                                                        {expandedAccidentId === accident._id ? (
                                                                                            <ChevronUp className="h-4 w-4" />
                                                                                        ) : (
                                                                                            <ChevronDown className="h-4 w-4" />
                                                                                        )}
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>

                                                                    {/* Expanded Analysis Row */}
                                                                    {expandedAccidentId === accident._id && analysisData[accident._id] && (
                                                                        <TableRow className="bg-slate-50">
                                                                            <TableCell colSpan={8} className="p-4">
                                                                                <div className="bg-white rounded-md border p-4 space-y-4">
                                                                                    <div className="flex justify-between items-start">
                                                                                        <div>
                                                                                            <h3 className="text-lg font-semibold">AI Risk Analysis</h3>
                                                                                            <p className="text-sm text-gray-500">
                                                                                                Generated analysis for {accident.victimDetails.fullName}
                                                                                            </p>
                                                                                        </div>
                                                                                        <Badge
                                                                                            className={
                                                                                                analysisData[accident._id].risk_level === 'LOW RISK' ? 'bg-green-100 text-green-800 border-green-200' :
                                                                                                    analysisData[accident._id].risk_level === 'MODERATE RISK' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                                                                                        analysisData[accident._id].risk_level === 'HIGH RISK' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                                                                                                            'bg-red-100 text-red-800 border-red-200'
                                                                                            }
                                                                                        >
                                                                                            {analysisData[accident._id].risk_level} - Score: {(analysisData[accident._id].risk_score * 100).toFixed(0)}%
                                                                                        </Badge>
                                                                                    </div>

                                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                                        {/* Driver Details */}
                                                                                        <Card className="border-0 shadow-sm">
                                                                                            <CardHeader className="pb-2">
                                                                                                <CardTitle className="text-sm font-medium">Driver Details</CardTitle>
                                                                                            </CardHeader>
                                                                                            <CardContent className="pt-0">
                                                                                                <dl className="space-y-1 text-sm">
                                                                                                    <div className="flex justify-between">
                                                                                                        <dt className="text-gray-500">Name:</dt>
                                                                                                        <dd>{analysisData[accident._id].personal_details.name}</dd>
                                                                                                    </div>
                                                                                                    <div className="flex justify-between">
                                                                                                        <dt className="text-gray-500">Age:</dt>
                                                                                                        <dd>{analysisData[accident._id].personal_details.age}</dd>
                                                                                                    </div>
                                                                                                    <div className="flex justify-between">
                                                                                                        <dt className="text-gray-500">Gender:</dt>
                                                                                                        <dd>{analysisData[accident._id].personal_details.gender}</dd>
                                                                                                    </div>
                                                                                                </dl>
                                                                                            </CardContent>
                                                                                        </Card>

                                                                                        {/* Vehicle Details */}
                                                                                        <Card className="border-0 shadow-sm">
                                                                                            <CardHeader className="pb-2">
                                                                                                <CardTitle className="text-sm font-medium">Vehicle Details</CardTitle>
                                                                                            </CardHeader>
                                                                                            <CardContent className="pt-0">
                                                                                                <dl className="space-y-1 text-sm">
                                                                                                    <div className="flex justify-between">
                                                                                                        <dt className="text-gray-500">Number:</dt>
                                                                                                        <dd>{analysisData[accident._id].vehicle_details.vehicle_number}</dd>
                                                                                                    </div>
                                                                                                    <div className="flex justify-between">
                                                                                                        <dt className="text-gray-500">Model:</dt>
                                                                                                        <dd>{analysisData[accident._id].vehicle_details.vehicle_model}</dd>
                                                                                                    </div>
                                                                                                    <div className="flex justify-between">
                                                                                                        <dt className="text-gray-500">Name:</dt>
                                                                                                        <dd>{analysisData[accident._id].vehicle_details.model_name}</dd>
                                                                                                    </div>
                                                                                                </dl>
                                                                                            </CardContent>
                                                                                        </Card>

                                                                                        {/* Insurance Recommendation */}
                                                                                        <Card className="border-0 shadow-sm">
                                                                                            <CardHeader className="pb-2">
                                                                                                <CardTitle className="text-sm font-medium">Insurance Recommendation</CardTitle>
                                                                                            </CardHeader>
                                                                                            <CardContent className="pt-0">
                                                                                                <dl className="space-y-1 text-sm">
                                                                                                    <div className="flex justify-between">
                                                                                                        <dt className="text-gray-500">Status:</dt>
                                                                                                        <dd>
                                                                                                            <Badge
                                                                                                                variant={
                                                                                                                    analysisData[accident._id].insurance_recommendation.status === 'STANDARD' ? 'outline' :
                                                                                                                        analysisData[accident._id].insurance_recommendation.status === 'APPROVED' ? 'secondary' :
                                                                                                                            analysisData[accident._id].insurance_recommendation.status === 'CONDITIONAL' ? 'default' :
                                                                                                                                'destructive'
                                                                                                                }
                                                                                                            >
                                                                                                                {analysisData[accident._id].insurance_recommendation.status}
                                                                                                            </Badge>
                                                                                                        </dd>
                                                                                                    </div>
                                                                                                    <div className="flex justify-between">
                                                                                                        <dt className="text-gray-500">Premium Loading:</dt>
                                                                                                        <dd>{analysisData[accident._id].insurance_recommendation.premium_loading}</dd>
                                                                                                    </div>
                                                                                                </dl>
                                                                                            </CardContent>
                                                                                        </Card>
                                                                                    </div>

                                                                                    {/* Gemini Insights */}
                                                                                    <div>
                                                                                        <h4 className="mb-2">Gemini Analysis</h4>
                                                                                        <div className="text-sm prose prose-sm max-w-none bg-gray-50 p-4 rounded-md overflow-auto max-h-96 max-w-screen">
                                                                                            <div className='text-wrap' dangerouslySetInnerHTML={{
                                                                                                __html: analysisData[accident._id].gemini_insights
                                                                                                    .replace(/\n/g, '<br>')
                                                                                                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                                                                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                                                                                    .replace(/^## (.*?)$/gm, '<h2 class="text-lg font-bold mt-2 mb-1">$1</h2>')
                                                                                                    .replace(/^\* (.*?)$/gm, '<li>$1</li>')
                                                                                                    .replace(/(.*?)<\/li>/g, (match: string) => {
                                                                                                        if (!match.startsWith('<ul>')) {
                                                                                                            return `<ul class="list-disc pl-5 my-2">${match}</ul>`;
                                                                                                        }
                                                                                                        return match;
                                                                                                    })
                                                                                                    .replace(/<\/ul><ul class="list-disc pl-5 my-2">/g, '')
                                                                                            }} />
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Required Actions */}
                                                                                    {analysisData[accident._id].insurance_recommendation.required_actions && (
                                                                                        <div>
                                                                                            <h4 className="mb-2">Required Actions</h4>
                                                                                            <ul className="list-disc list-inside space-y-1 text-sm">
                                                                                                {analysisData[accident._id].insurance_recommendation.required_actions.map((action: string, index: number) => (
                                                                                                    <li key={index} className="text-gray-700">{action}</li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Recommended Actions */}
                                                                                    {analysisData[accident._id].insurance_recommendation.recommended_actions && (
                                                                                        <div>
                                                                                            <h4 className="font-medium mb-2">Recommended Actions</h4>
                                                                                            <ul className="list-disc list-inside space-y-1 text-sm">
                                                                                                {analysisData[accident._id].insurance_recommendation.recommended_actions.map((action: string, index: number) => (
                                                                                                    <li key={index} className="text-gray-700">{action}</li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Benefits */}
                                                                                    {analysisData[accident._id].insurance_recommendation.benefits && (
                                                                                        <div>
                                                                                            <h4 className="font-medium mb-2">Benefits</h4>
                                                                                            <ul className="list-disc list-inside space-y-1 text-sm">
                                                                                                {analysisData[accident._id].insurance_recommendation.benefits.map((benefit: string, index: number) => (
                                                                                                    <li key={index} className="text-gray-700">{benefit}</li>
                                                                                                ))}
                                                                                            </ul>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    )}

                                                                    {/* Analysis Error Row */}
                                                                    {analysisError[accident._id] && (
                                                                        <TableRow>
                                                                            <TableCell colSpan={8} className="p-0">
                                                                                <div className="bg-red-50 text-red-700 px-4 py-2 text-sm">
                                                                                    Error: {analysisError[accident._id]}
                                                                                </div>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    )}
                                                                </React.Fragment>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={8} className="text-center h-24 text-gray-500">
                                                                {accidentSearchTerm || accidentFilterBy !== 'all' ? (
                                                                    <div className="flex flex-col items-center justify-center">
                                                                        <Search className="h-6 w-6 mb-2 text-gray-400" />
                                                                        No accidents match your search criteria
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-center justify-center">
                                                                        <AlertTriangle className="h-6 w-6 mb-2 text-gray-400" />
                                                                        No accident reports available
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        <div className="mt-4 text-sm text-gray-500">
                                            Showing {filteredAccidents.length} of {accidents.length} accident reports
                                        </div>
                                    </>
                                )}

                                {accidentsError && (
                                    <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
                                        Error: {accidentsError}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
            <AdminChatBot />
        </div>
    );
};

export default AdminDashboard;