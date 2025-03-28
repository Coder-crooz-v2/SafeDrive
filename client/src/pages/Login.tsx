import { useState, ChangeEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { loginUser, loginAdmin } from "../redux/slices/authSlice";
import { AppDispatch, RootState } from "../store/store";

const Login = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isLoading } = useSelector((state: RootState) => state.auth);
  
  // Tab state
  const [activeTab, setActiveTab] = useState("user");
  
  // Form states
  const [userForm, setUserForm] = useState({
    identifier: "", // Email or phone number
    password: "",
    isEmail: true, // Toggle for identifier type
  });
  
  const [adminForm, setAdminForm] = useState({
    identifier: "", // Email or phone number
    password: "",
    isEmail: true, // Toggle for identifier type
  });

  // Handle user form input changes
  const handleUserChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserForm({ ...userForm, [name]: value });
  };

  // Handle admin form input changes
  const handleAdminChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdminForm({ ...adminForm, [name]: value });
  };

  // Toggle identifier type (email/phone)
  const toggleUserIdentifierType = () => {
    setUserForm({ ...userForm, isEmail: !userForm.isEmail, identifier: "" });
  };

  const toggleAdminIdentifierType = () => {
    setAdminForm({ ...adminForm, isEmail: !adminForm.isEmail, identifier: "" });
  };

  // Handle user login
  const handleUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userForm.identifier || !userForm.password) {
      toast("Please fill in all fields");
      return;
    }
    
    try {
      const payload = userForm.isEmail 
        ? { email: userForm.identifier, password: userForm.password }
        : { phoneNumber: userForm.identifier, password: userForm.password };
      
      const response = await dispatch(loginUser(payload));
      const userData = response.payload as any;
      const dashboardUrl = `/user/${userData.data.user.fullName.replace(/\s+/g, '-')}-${userData.phoneNumber}/dashboard`;
      toast("Login successful");
      navigate(dashboardUrl);
    } catch (error: any) {
      toast("Login failed: " + (error.response?.data?.message || "Invalid credentials"));
    }
  };

  // Handle admin login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminForm.identifier || !adminForm.password) {
      toast("Please fill in all fields");
      return;
    }
    
    try {
      const payload = adminForm.isEmail 
        ? { email: adminForm.identifier, password: adminForm.password }
        : { phoneNumber: adminForm.identifier, password: adminForm.password };
      
      const result = await dispatch(loginAdmin(payload));
      const adminData = result.payload as any;
      const adminDashboardUrl = `/admin/${adminData.data.admin.companyName.replace(/\s+/g, '-')}-${adminData.phoneNumber}/dashboard`;
      toast("Login successful");
      navigate(adminDashboardUrl);
    } catch (error: any) {
      toast("Login failed: " + (error.response?.data?.message || "Invalid credentials"));
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white rounded-lg p-4">
        <Tabs defaultValue="user" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="user">User Login</TabsTrigger>
            <TabsTrigger value="admin">Admin Login</TabsTrigger>
          </TabsList>
          
          <TabsContent value="user">
            <Card>
              <CardHeader>
                <CardTitle>User Login</CardTitle>
                <CardDescription>Login to access your account</CardDescription>
              </CardHeader>
              
              <form onSubmit={handleUserLogin}>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="userIdentifier">
                      {userForm.isEmail ? "Email" : "Phone Number"}
                    </Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={toggleUserIdentifierType}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      Use {userForm.isEmail ? "phone number" : "email"} instead
                    </Button>
                  </div>
                  
                  <Input 
                    id="userIdentifier" 
                    name="identifier" 
                    type={userForm.isEmail ? "email" : "tel"} 
                    placeholder={userForm.isEmail ? "john@example.com" : "9876543210"}
                    value={userForm.identifier} 
                    onChange={handleUserChange} 
                    required 
                  />
                  
                  <div className="grid gap-2">
                    <Label htmlFor="userPassword">Password</Label>
                    <Input 
                      id="userPassword" 
                      name="password" 
                      type="password" 
                      value={userForm.password} 
                      onChange={handleUserChange} 
                      required 
                    />
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button type="submit" className="w-full mt-4" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle>Admin Login</CardTitle>
                <CardDescription>Login as a service provider</CardDescription>
              </CardHeader>
              
              <form onSubmit={handleAdminLogin}>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="adminIdentifier">
                      {adminForm.isEmail ? "Email" : "Phone Number"}
                    </Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={toggleAdminIdentifierType}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      Use {adminForm.isEmail ? "phone number" : "email"} instead
                    </Button>
                  </div>
                  
                  <Input 
                    id="adminIdentifier" 
                    name="identifier" 
                    type={adminForm.isEmail ? "email" : "tel"} 
                    placeholder={adminForm.isEmail ? "admin@example.com" : "9876543210"}
                    value={adminForm.identifier} 
                    onChange={handleAdminChange} 
                    required 
                  />
                  
                  <div className="grid gap-2">
                    <Label htmlFor="adminPassword">Password</Label>
                    <Input 
                      id="adminPassword" 
                      name="password" 
                      type="password" 
                      value={adminForm.password} 
                      onChange={handleAdminChange} 
                      required 
                    />
                  </div>
                </CardContent>
                
                <CardFooter>
                  <Button type="submit" className="w-full mt-4" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="text-center mt-4">
          <p>
            Don't have an account?{" "}
            <Link to="/sign-up" className="text-blue-600 hover:underline">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;