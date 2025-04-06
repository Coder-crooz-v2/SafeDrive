import { useState, ChangeEvent, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { registerUser, registerAdmin, setLoading } from "../redux/slices/authSlice";
import { AppDispatch, RootState } from "../store/store";
import { AlertTriangle, Check } from "lucide-react";
import { axiosInstance } from '@/lib/axios';

const Signup = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isLoading } = useSelector((state: RootState) => state.auth);

  // Tab state
  const [activeTab, setActiveTab] = useState<"User" | "Admin" | string>("User");
  const [newContact, setNewContact] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>("+91");
  const [personalContactCountryCode, setPersonalContactCountryCode] = useState<string>("+91");
  const [companyNames, setCompanyNames] = useState<string[]>([]);

  // User form state
  const [userStep, setUserStep] = useState(1);
  const [userForm, setUserForm] = useState({
    role: "User",
    fullName: "",
    vehicleType: "",
    vehicleModel: "",
    vehicleNumber: "",
    licenseNumber: "",
    age: "",
    gender: "",
    serviceProvider: "",
    email: "",
    phoneNumber: "",
    emergencyContacts: [] as string[],
    password: "",
    confirmPassword: "",
    photo: null as File | null
  });

  // Admin form state
  const [adminForm, setAdminForm] = useState({
    role: "Admin",
    companyName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    const fetchCompanyNames = async () => {
      try {
        const response = await axiosInstance.get("/admin/companies"); // Replace with your API endpoint
        const data = response.data.data;
        setCompanyNames(data.map((company: { companyName: string }) => company.companyName)); // Assuming the API returns an object with a companyNames array
      } catch (error) {
        console.error("Error fetching company names:", error);
      }
    }
    fetchCompanyNames();
  }, [])

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

  // Handle select changes
  const handleSelectChange = (value: string, field: string) => {
    console.log(value, field);
    console.log(typeof value)
    setUserForm({ ...userForm, [field]: value });
  };

  // Handle file upload
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUserForm({ ...userForm, photo: e.target.files[0] });
    }
  };

  const handleNewContactChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewContact(e.target.value);
  };

  const handleAddEmergencyContact = () => {
    // Validate the contact (basic check for non-empty)
    if (!newContact.trim()) {
      toast.error("Please enter a valid phone number");
      return;
    }

    const formattedContact = `${countryCode}${newContact}`;

    // Add to the array by creating a new array (never mutate state directly)
    setUserForm({
      ...userForm,
      emergencyContacts: [...userForm.emergencyContacts, formattedContact]
    });

    // Clear the input for next contact
    setNewContact('');
  };

  const handleRemoveContact = (index: number) => {
    // Remove a contact by filtering out the one at the specified index
    setUserForm({
      ...userForm,
      emergencyContacts: userForm.emergencyContacts.filter((_, i) => i !== index)
    });
  };

  // Handle user form submission
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (userForm.password !== userForm.confirmPassword) {
      toast("Passwords don't match");
      return;
    }

    try {
      // Create FormData
      const formData = new FormData();
      Object.entries(userForm).forEach(([key, value]) => {
        if (key !== 'confirmPassword' && value !== null) {
          if (key === 'emergencyContacts' && Array.isArray(value)) {
            // Handle array of emergency contacts
            value.forEach((contact, index) => {
              formData.append(`emergencyContacts[${index}]`, contact);
            });
          } else if (key === 'photo' && value instanceof File) {
            // Handle file upload
            formData.append(key, value);
          } else if (key !== 'phoneNumber' && typeof value === 'string') {
            // Handle string values
            formData.append(key, value);
          } else if (key === 'phoneNumber') {
            // Handle phone number with country code
            formData.append(key, `${personalContactCountryCode}${value}`);
          }
        }
      });
      dispatch(setLoading(true));
      const result = await dispatch(registerUser(formData)).unwrap();
      if (result && result.success) {
        toast("Registration successful", {
          icon: <Check />,
          richColors: true,
          closeButton: true
        });
        navigate("/login");
      }
      else {
        const errorMessage = result?.message || "Registration failed";
        toast(errorMessage, {
          icon: <AlertTriangle />,
          richColors: true,
          closeButton: true
        })
      }
    } catch (error: any) {
      toast("Registration failed");
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Handle admin form submission
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (adminForm.password !== adminForm.confirmPassword) {
      toast("Passwords don't match");
      return;
    }

    try {
      dispatch(setLoading(true));
      console.log(adminForm)
      const result = await dispatch(registerAdmin(adminForm)).unwrap();
      if (result && result.success) {
        toast("Registration successful", {
          icon: <Check />,
          richColors: true,
          closeButton: true
        });
        navigate("/login");
      } else {
        const errorMessage = result?.message || "Registration failed";
        toast(errorMessage, {
          icon: <AlertTriangle />,
          richColors: true,
          closeButton: true
        })
      }
    } catch (error: any) {
      toast("Registration failed");
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Handle next step in user form
  const handleNextStep = () => {
    // Basic validation for first step
    if (
      !userForm.fullName ||
      !userForm.vehicleType ||
      !userForm.vehicleModel ||
      !userForm.vehicleNumber ||
      !userForm.licenseNumber
    ) {
      toast("Missing fields");
      return;
    }

    setUserStep(2);
  };

  // Handle previous step in user form
  const handlePrevStep = () => {
    setUserStep(1);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="p-4 rounded-lg w-full max-w-3xl bg-white">
        <Tabs defaultValue="User" value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="User">User Signup</TabsTrigger>
            <TabsTrigger value="Admin">Admin Signup</TabsTrigger>
          </TabsList>

          <TabsContent value="User">
            <Card>
              <CardHeader>
                <CardTitle>User Registration</CardTitle>
                <CardDescription>
                  {userStep === 1
                    ? "Enter your vehicle details"
                    : "Enter your personal details"}
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleUserSubmit}>
                <CardContent>
                  {userStep === 1 ? (
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          name="fullName"
                          value={userForm.fullName}
                          onChange={handleUserChange}
                          placeholder="John Doe"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="vehicleType">Vehicle Type</Label>
                        <Select
                          onValueChange={(value) => handleSelectChange(value, "vehicleType")}
                          value={userForm.vehicleType}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select vehicle type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="two-wheeler">Two Wheeler</SelectItem>
                            <SelectItem value="car">Car</SelectItem>
                            <SelectItem value="truck">Truck</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="vehicleModel">Vehicle Model</Label>
                        <Input
                          id="vehicleModel"
                          name="vehicleModel"
                          value={userForm.vehicleModel}
                          onChange={handleUserChange}
                          placeholder="Honda City"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                        <Input
                          id="vehicleNumber"
                          name="vehicleNumber"
                          value={userForm.vehicleNumber}
                          onChange={handleUserChange}
                          placeholder="KA01AB1234"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="licenseNumber">License Number</Label>
                        <Input
                          id="licenseNumber"
                          name="licenseNumber"
                          value={userForm.licenseNumber}
                          onChange={handleUserChange}
                          placeholder="DL-1234567890123"
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="age">Age</Label>
                        <Input
                          id="age"
                          name="age"
                          type="number"
                          value={userForm.age}
                          onChange={handleUserChange}
                          placeholder="30"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Gender</Label>
                        <RadioGroup
                          onValueChange={(value) => handleSelectChange(value, "gender")}
                          value={userForm.gender}
                          className="flex space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="male" id="male" />
                            <Label htmlFor="male">Male</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="female" id="female" />
                            <Label htmlFor="female">Female</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="serviceProvider">Service Provider</Label>
                        <Select
                          onValueChange={(value) => handleSelectChange(value, "serviceProvider")}
                          value={userForm.serviceProvider}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select service provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {
                              companyNames.length > 0 ?
                                (companyNames.map((company, index) => (
                                  <SelectItem key={index} value={company}>
                                    {company}
                                  </SelectItem>
                                ))) : (
                                  <SelectItem value="no-providers" disabled>
                                    No service providers available
                                  </SelectItem>
                                )
                            }
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={userForm.email}
                          onChange={handleUserChange}
                          placeholder="john@example.com"
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="phoneNumber">Phone Number</Label>
                        <div className="flex gap-2">
                          <Select defaultValue="+91"
                            onValueChange={(value) => {
                              setPersonalContactCountryCode(value);
                            }}>
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="+91" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="+91">+91</SelectItem>
                              <SelectItem value="+1">+1</SelectItem>
                              <SelectItem value="+44">+44</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            id="phoneNumber"
                            name="phoneNumber"
                            value={userForm.phoneNumber}
                            onChange={handleUserChange}
                            placeholder="9876543210"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid gap-2 mt-4">
                        <Label>Emergency Contacts</Label>
                        <div className="space-y-2">
                          {userForm.emergencyContacts.map((contact, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="bg-gray-100 px-3 py-2 rounded flex-grow">
                                {contact}
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveContact(index)}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}

                          <div className="flex gap-2 mt-2">
                            <div className="flex gap-2 flex-grow">
                              <Select defaultValue="+91"
                                onValueChange={(value) => {
                                  setCountryCode(value);
                                }}>
                                <SelectTrigger className="w-24">
                                  <SelectValue placeholder="+91" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="+91" >+91</SelectItem>
                                  <SelectItem value="+1" >+1</SelectItem>
                                  <SelectItem value="+44" >+44</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                value={newContact}
                                onChange={handleNewContactChange}
                                placeholder="Emergency contact number"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleAddEmergencyContact}
                            >
                              Add
                            </Button>
                          </div>

                          <p className="text-sm text-gray-500 mt-1">
                            Add up to 5 emergency contacts who will be notified in case of an accident.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="photo">Profile Photo</Label>
                        <Input
                          id="photo"
                          name="photo"
                          type="file"
                          onChange={handleFileChange}
                          accept="image/*"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          value={userForm.password}
                          onChange={handleUserChange}
                          required
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          value={userForm.confirmPassword}
                          onChange={handleUserChange}
                          required
                        />
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex justify-between mt-4">
                  {userStep === 2 && (
                    <Button type="button" variant="outline" onClick={handlePrevStep}>
                      Previous
                    </Button>
                  )}

                  {userStep === 1 ? (
                    <Button type="button" onClick={handleNextStep}>
                      Next
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Registering..." : "Register"}
                    </Button>
                  )}
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="Admin">
            <Card>
              <CardHeader>
                <CardTitle>Admin Registration</CardTitle>
                <CardDescription>Register as a service provider</CardDescription>
              </CardHeader>

              <form onSubmit={handleAdminSubmit}>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={adminForm.companyName}
                      onChange={handleAdminChange}
                      placeholder="Acko Insurance"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="adminEmail">Email</Label>
                    <Input
                      id="adminEmail"
                      name="email"
                      type="email"
                      value={adminForm.email}
                      onChange={handleAdminChange}
                      placeholder="admin@acko.com"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="adminPhoneNumber">Phone Number</Label>
                    <div className="flex gap-2">
                      <Select defaultValue="+91">
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="+91" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+91">+91</SelectItem>
                          <SelectItem value="+1">+1</SelectItem>
                          <SelectItem value="+44">+44</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        id="adminPhoneNumber"
                        name="phoneNumber"
                        value={adminForm.phoneNumber}
                        onChange={handleAdminChange}
                        placeholder="9876543210"
                        required
                      />
                    </div>
                  </div>

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

                  <div className="grid gap-2">
                    <Label htmlFor="adminConfirmPassword">Confirm Password</Label>
                    <Input
                      id="adminConfirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={adminForm.confirmPassword}
                      onChange={handleAdminChange}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="mt-4">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Registering..." : "Register"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
        <div className="text-center mt-4">
          <p>
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;