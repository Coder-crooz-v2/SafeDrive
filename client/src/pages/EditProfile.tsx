import { useState, useEffect, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store/store";
import { setUser } from "../redux/slices/authSlice";
import { axiosInstance } from "../lib/axios";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, Upload, ArrowLeft, X, Plus } from "lucide-react";

interface ProfileForm {
  fullName: string;
  vehicleType: string;
  vehicleModel: string;
  vehicleNumber: string;
  email: string;
  phoneNumber: string;
  age: number;
  gender: string;
  companyName: string;
  emergencyContacts: string[];
}

const EditProfile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [companyNames, setCompanyNames] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [countryCode, setCountryCode] = useState("+91");
  const [newContact, setNewContact] = useState("");
  
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    fullName: user?.fullName || "",
    vehicleType: user?.vehicleType || "",
    vehicleModel: user?.vehicleModel || "",
    vehicleNumber: user?.vehicleNumber || "",
    email: user?.email || "",
    phoneNumber: user?.phoneNumber || "",
    age: user?.age || 0,
    gender: user?.gender || "",
    companyName: user?.companyName || "",
    emergencyContacts: user?.emergencyContacts || ["", "", ""]
  });

  useEffect(() => {
    // Fetch company names for service provider dropdown
    const fetchCompanyNames = async () => {
      try {
        const response = await axiosInstance.get("/admin/companies");
        const data = response.data.data;
        console.log("Fetched company data:", data);
        
        // Store company names correctly
        if (Array.isArray(data)) {
          setCompanyNames(data.map((company: {companyName: string}) => company.companyName));
        } else {
          console.error("Expected array of companies but got:", data);
          setCompanyNames([]);
        }
      } catch (error) {
        console.error("Error fetching company names:", error);
        toast.error("Failed to load service providers");
        setCompanyNames([]);
      }
    }
    
    fetchCompanyNames();
    
    // Set photo preview if user has a photo
    if (user?.photo) {
      setPhotoPreview(user.photo);
    }
  }, [user]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Handle age as a number
    if (name === 'age') {
      const ageValue = parseInt(value);
      setProfileForm(prev => ({
        ...prev,
        [name]: isNaN(ageValue) ? 0 : ageValue
      }));
    } else {
      setProfileForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSelectChange = (value: string, field: string) => {
    setProfileForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNewContactChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewContact(e.target.value);
  };

  const handleAddEmergencyContact = () => {
    if (!newContact.trim()) {
      toast.error("Please enter a contact number");
      return;
    }
    
    // Check if we already have 3 contacts
    if (profileForm.emergencyContacts.filter(c => c.trim() !== "").length >= 3) {
      toast.error("You can add a maximum of 3 emergency contacts");
      return;
    }
    
    // Format with country code
    const formattedContact = `${countryCode}${newContact.startsWith(countryCode) ? newContact.substring(countryCode.length) : newContact}`;
    
    // Add to emergency contacts
    const newContacts = [...profileForm.emergencyContacts];
    
    // Find the first empty slot or add to the end
    const emptyIndex = newContacts.findIndex(c => !c.trim());
    if (emptyIndex !== -1) {
      newContacts[emptyIndex] = formattedContact;
    } else {
      newContacts.push(formattedContact);
    }
    
    setProfileForm(prev => ({
      ...prev,
      emergencyContacts: newContacts
    }));
    
    // Clear input
    setNewContact("");
  };

  const handleRemoveContact = (index: number) => {
    const newContacts = [...profileForm.emergencyContacts];
    newContacts[index] = ""; // Clear the contact at this index
    
    // Remove any empty strings at the end of the array
    while (newContacts.length > 0 && !newContacts[newContacts.length - 1].trim()) {
      newContacts.pop();
    }
    
    setProfileForm(prev => ({
      ...prev,
      emergencyContacts: newContacts
    }));
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
        toast.error("File must be an image (JPEG, PNG, or GIF)");
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      
      setPhotoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async () => {
    if (!photoFile) return;
    
    setIsPhotoUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("photo", photoFile);
      const token = localStorage.getItem("accessToken");
      const response = await axiosInstance.patch("/users/photo", formData, {
        headers: {
            "Authorization": `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      
      if (response.data.success) {
        toast.success("Profile photo updated successfully");
        
        // Update user in redux with new photo URL
        if (user) {
          dispatch(setUser({
            ...user,
            photo: response.data.data.photo
          }));
        }
      }
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error(error.response?.data?.message || "Failed to update profile photo");
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate required fields
      if (!profileForm.fullName.trim()) {
        toast.error("Full name is required");
        setIsLoading(false);
        return;
      }
      
      if (!profileForm.email.trim()) {
        toast.error("Email is required");
        setIsLoading(false);
        return;
      }
      
      if (!profileForm.phoneNumber.trim()) {
        toast.error("Phone number is required");
        setIsLoading(false);
        return;
      }
      
      // Filter out empty emergency contacts
      const filteredContacts = profileForm.emergencyContacts.filter(contact => contact.trim() !== "");
      const token = localStorage.getItem("accessToken");
      // Send update request
      const response = await axiosInstance.patch("/users/update-account", {
        fullName: profileForm.fullName,
        vehicleType: profileForm.vehicleType,
        vehicleModel: profileForm.vehicleModel,
        vehicleNumber: profileForm.vehicleNumber,
        email: profileForm.email,
        phoneNumber: profileForm.phoneNumber,
        age: profileForm.age,
        gender: profileForm.gender,
        serviceProvider: profileForm.companyName,
        emergencyContacts: filteredContacts
      }, {
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        }
      });
      
      if (response.data.success) {
        // If we also have a photo to upload, do it now
        if (photoFile) {
          await uploadPhoto();
        }
        
        toast.success("Profile updated successfully");
        
        // Update user in redux
        if (user) {
          dispatch(setUser({
            ...user,
            fullName: profileForm.fullName,
            vehicleType: profileForm.vehicleType,
            vehicleModel: profileForm.vehicleModel,
            vehicleNumber: profileForm.vehicleNumber,
            email: profileForm.email,
            phoneNumber: profileForm.phoneNumber,
            age: profileForm.age,
            gender: profileForm.gender,
            companyName: profileForm.companyName,
            emergencyContacts: filteredContacts
          }));
        }
        
        // Navigate back to profile page or dashboard
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button 
        variant="ghost" 
        className="mb-4"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>
            Update your personal information and preferences
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Profile Photo Section */}
            <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-6">
              <div className="flex flex-col items-center gap-2">
                <Avatar className="w-28 h-28">
                  <AvatarImage src={photoPreview || ""} alt={profileForm.fullName} />
                  <AvatarFallback>{profileForm.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-center">
                  <Label 
                    htmlFor="photo-upload" 
                    className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Change Photo
                  </Label>
                  <Input 
                    id="photo-upload" 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoChange} 
                    className="hidden"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max size: 5MB</p>
                </div>
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input 
                    id="fullName"
                    name="fullName"
                    value={profileForm.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email"
                      name="email"
                      type="email"
                      value={profileForm.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <div className="flex gap-2 mt-1">
                      <Select 
                        defaultValue="+91"
                        onValueChange={(value) => {
                          // Extract the current number without country code
                          const currentNumber = profileForm.phoneNumber;
                          const numberWithoutCode = currentNumber.startsWith("+") 
                            ? currentNumber.substring(currentNumber.indexOf(" ") + 1) 
                            : currentNumber;
                          
                          // Update phone number with new country code
                          setProfileForm(prev => ({
                            ...prev,
                            phoneNumber: `${value} ${numberWithoutCode}`
                          }));
                        }}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="+91" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+91">+91</SelectItem>
                          <SelectItem value="+1">+1</SelectItem>
                          <SelectItem value="+44">+44</SelectItem>
                          <SelectItem value="+61">+61</SelectItem>
                          <SelectItem value="+86">+86</SelectItem>
                          <SelectItem value="+33">+33</SelectItem>
                          <SelectItem value="+49">+49</SelectItem>
                          <SelectItem value="+81">+81</SelectItem>
                          <SelectItem value="+7">+7</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        id="phoneNumber"
                        name="phoneNumber"
                        value={profileForm.phoneNumber.startsWith("+") 
                          ? profileForm.phoneNumber.substring(profileForm.phoneNumber.indexOf("1") + 1) 
                          : profileForm.phoneNumber}
                        onChange={(e) => {
                          // Get the current country code
                          const currentCountryCode = profileForm.phoneNumber.startsWith("+")
                            ? profileForm.phoneNumber.substring(0, profileForm.phoneNumber.indexOf(" "))
                            : "+91";
                          
                          // Update with country code
                          setProfileForm(prev => ({
                            ...prev,
                            phoneNumber: `${currentCountryCode} ${e.target.value}`
                          }));
                        }}
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Personal Information</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input 
                    id="age"
                    name="age"
                    type="number"
                    value={profileForm.age || ""}
                    onChange={handleInputChange}
                    placeholder="Enter your age"
                    min={0}
                    max={120}
                  />
                </div>
                
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <RadioGroup
                    value={profileForm.gender}
                    onValueChange={(value) => handleSelectChange(value, "gender")}
                    className="flex space-x-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="M" id="male" />
                      <Label htmlFor="male" className="cursor-pointer">Male</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="F" id="female" />
                      <Label htmlFor="female" className="cursor-pointer">Female</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Vehicle Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Vehicle Information</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="vehicleType">Vehicle Type</Label>
                  <Select
                    value={profileForm.vehicleType}
                    onValueChange={(value) => handleSelectChange(value, "vehicleType")}
                  >
                    <SelectTrigger id="vehicleType">
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="bike">Bike</SelectItem>
                      <SelectItem value="truck">Truck</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="vehicleModel">Vehicle Model</Label>
                  <Input 
                    id="vehicleModel"
                    name="vehicleModel"
                    value={profileForm.vehicleModel}
                    onChange={handleInputChange}
                    placeholder="Enter vehicle model"
                  />
                </div>
                
                <div>
                  <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                  <Input 
                    id="vehicleNumber"
                    name="vehicleNumber"
                    value={profileForm.vehicleNumber}
                    onChange={handleInputChange}
                    placeholder="Enter vehicle number"
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Service Provider */}
            <div>
              <h3 className="text-lg font-medium mb-4">Service Provider</h3>
              
              <div>
                <Label htmlFor="companyName">Select Service Provider</Label>
                <Select
                  value={profileForm.companyName}
                  onValueChange={(value) => handleSelectChange(value, "companyName")}
                >
                  <SelectTrigger id="companyName">
                    <SelectValue placeholder="Select service provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyNames.length > 0 ? (
                      companyNames.map((company, index) => (
                        <SelectItem key={index} value={company}>
                          {company}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-providers" disabled>
                        No service providers available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Separator />
            
            {/* Emergency Contacts */}
            <div>
              <h3 className="text-lg font-medium mb-4">Emergency Contacts</h3>
              <p className="text-sm text-gray-500 mb-4">
                These contacts will be notified in case of an emergency.
              </p>
              
              <div className="space-y-3">
                {profileForm.emergencyContacts
                  .filter(contact => contact.trim() !== "")
                  .map((contact, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded flex-grow">
                        {contact}
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveContact(index)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ))}

                {profileForm.emergencyContacts.filter(c => c.trim() !== "").length < 3 && (
                  <div className="flex gap-2 mt-3">
                    <div className="flex gap-2 flex-grow">
                      <Select 
                        defaultValue="+91"
                        value={countryCode}
                        onValueChange={setCountryCode}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="+91" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+91">+91</SelectItem>
                          <SelectItem value="+1">+1</SelectItem>
                          <SelectItem value="+44">+44</SelectItem>
                          <SelectItem value="+61">+61</SelectItem>
                          <SelectItem value="+86">+86</SelectItem>
                          <SelectItem value="+33">+33</SelectItem>
                          <SelectItem value="+49">+49</SelectItem>
                          <SelectItem value="+81">+81</SelectItem>
                          <SelectItem value="+7">+7</SelectItem>
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
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-2">
                  {3 - profileForm.emergencyContacts.filter(c => c.trim() !== "").length} more contact(s) can be added
                </p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              type="button"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            
            <Button 
              type="submit" 
              disabled={isLoading || isPhotoUploading}
            >
              {(isLoading || isPhotoUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default EditProfile;