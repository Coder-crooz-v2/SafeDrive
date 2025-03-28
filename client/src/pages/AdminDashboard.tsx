import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
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
import { Briefcase, Phone, Users, Search, UserCheck, LogOut, AlertTriangle, PieChart, BarChart2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from 'axios';
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
    const { user, admin, isLoggedIn, isAdmin, isLoading: authLoading } = useSelector((state: RootState) => state.auth);

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

    // Fetch data on component mount
    useEffect(() => {
        // Check if we have a token but no authenticated user
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken && !isLoggedIn) {
            // Get data from token (you could use a JWT decoder library)
            try {
                // Basic attempt to validate the token by making a request
                axios.get('http://localhost:8000/api/v1/admin/current-admin', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    },
                    withCredentials: true
                })
                    .then(response => {
                        // Set auth state if successful
                        dispatch(setAuth({
                            isLoggedIn: true,
                            user: {
                                ...response.data.data,
                                role: 'Admin'
                            }
                        }));
                    })
                    .catch(err => {
                        console.error("Token validation error:", err);
                        localStorage.removeItem('accessToken');
                    });
            } catch (error) {
                console.error("Error processing token:", error);
                localStorage.removeItem('accessToken');
            }
        }

        if (isLoggedIn && isAdmin) {
            dispatch(fetchAdminProfile())
                .unwrap()
                .then(adminData => {
                    // Verify URL matches admin data
                    const expectedSlug = `${adminData.companyName.replace(/\s+/g, '-')}-${adminData.phoneNumber}`;
                    if (companySlug !== expectedSlug) {
                        navigate(`/admin/${expectedSlug}/dashboard`, { replace: true });
                    }
                })
                .catch(error => {
                    toast.error(error || 'Failed to load admin profile');
                });

            dispatch(fetchClients())
                .unwrap()
                .catch(error => {
                    toast.error(error || 'Failed to load clients data');
                });
        }
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
            const response = await axios.get('http://localhost:8000/api/v1/admin/accidents', {
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
    
    if (!isLoggedIn || !isAdmin) {
        // Redirect to login if not authenticated or not an admin
        return <Navigate to="/login" replace />;
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
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RechartsPieChart>
                                                    <Pie
                                                        data={accidentTypeData}
                                                        cx="50%"
                                                        cy="50%"
                                                        outerRadius={100}
                                                        fill="#8884d8"
                                                        dataKey="value"
                                                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    >
                                                        {accidentTypeData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value) => [`${value} accidents`, 'Count']} />
                                                    <Legend />
                                                </RechartsPieChart>
                                            </ResponsiveContainer>
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
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredAccidents.length > 0 ? (
                                                        filteredAccidents.map((accident) => (
                                                            <TableRow key={accident._id}>
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
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow>
                                                            <TableCell colSpan={7} className="text-center h-24 text-gray-500">
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
        </div>
    );
};

export default AdminDashboard;