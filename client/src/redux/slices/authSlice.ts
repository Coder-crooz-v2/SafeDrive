import { axiosInstance } from '@/lib/axios';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Types
interface User {
  _id: string;
  fullName?: string;
  vehicleType?: string;
  vehicleModel?: string;
  vehicleNumber?: string;
  email: string;
  gender?: string;
  age?: number;
  phoneNumber?: string;
  emergencyContacts?: string[];
  companyName?: string;
  role: 'Admin' | 'User';
  photo?: string;
  accessToken?: string;
  refreshToken?: string;
}

interface AdminData {
  data: User;
}

interface UserData {
  data: User;
}
export interface AuthState {
  user: User | null;
  admin: User | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  admin: null,
  isLoggedIn: false,
  isAdmin: false,
  isLoading: false,
  error: null,
};

// Register user
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData: any, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/users/register', userData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      return response.data;
    }
    catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Registration failed');
    }
  }
);

// Register admin
export const registerAdmin = createAsyncThunk(
  'auth/registerAdmin',
  async (adminData: any, { rejectWithValue }) => {
    try {
      console.log(adminData);
      const response = await axiosInstance.post('/admin/register', adminData,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Registration failed');
    }
  }
);

// Login user
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: { email?: string; phoneNumber?: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/users/login', credentials, {
        withCredentials: true
      });
      console.log(response.data);
      return response.data as UserData;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

// Login admin
export const loginAdmin = createAsyncThunk(
  'auth/loginAdmin',
  async (credentials: { email?: string; phoneNumber?: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/admin/login', credentials, {
        withCredentials: true
      });
      return response.data as AdminData;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

// Logout user
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await axiosInstance.post('/users/logout', {}, {
        withCredentials: true
      });
      // Clear any stored tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return null;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Logout failed');
    }
  }
);

// Logout admin
export const logoutAdmin = createAsyncThunk(
  'auth/logoutAdmin',
  async (_, { rejectWithValue }) => {
    try {
      await axiosInstance.post('/admin/logout', {}, {
        withCredentials: true
      });
      // Clear any stored tokens
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return null;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Logout failed');
    }
  }
);

// Check authentication status
export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      // Try admin first
      try {
        const adminResponse = await axiosInstance.get('/admin/current-admin', {
          withCredentials: true
        });
        return { ...adminResponse.data.data, role: 'Admin' };
      } catch (adminError) {
        // If admin check fails, try user endpoint
        const userResponse = await axiosInstance.get('/users/current-user', {
          withCredentials: true
        });
        return { ...userResponse.data.data, role: 'User' };
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Authentication check failed');
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.admin = null;
      state.isLoggedIn = false;
      state.isAdmin = false;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    setAuth: (state, action: PayloadAction<{ isLoggedIn: boolean, isAdmin?: Boolean, user: User | null }>) => {
      state.isLoggedIn = action.payload.isLoggedIn;
      state.user = action.payload.user;
      state.isAdmin = action.payload.user?.role === 'Admin';
      state.isLoading = false;
    },
    setUser: (state, action: PayloadAction<{
      fullName?: string;
      vehicleType?: string;
      vehicleModel?: string;
      vehicleNumber?: string;
      email: string;
      gender?: string;
      age?: number;
      phoneNumber?: string;
      emergencyContacts?: string[];
      companyName?: string;
      photo?: string;
    }>) => {
      if (state.user) {
        state.user.fullName = action.payload.fullName;
        state.user.vehicleType = action.payload.vehicleType;
        state.user.vehicleModel = action.payload.vehicleModel;
        state.user.vehicleNumber = action.payload.vehicleNumber;
        state.user.email = action.payload.email;
        state.user.gender = action.payload.gender;
        state.user.age = action.payload.age;
        state.user.phoneNumber = action.payload.phoneNumber;
        state.user.emergencyContacts = action.payload.emergencyContacts;
        state.user.companyName = action.payload.companyName;
        state.user.photo = action.payload.photo;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.admin = null;
      state.isLoggedIn = false;
      state.isAdmin = false;
      state.isLoading = false;
    },
    clearAuthError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Register user
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.user = action.payload.data;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Register admin
      .addCase(registerAdmin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerAdmin.fulfilled, (state, action: PayloadAction<any>) => {
        state.isLoading = false;
        state.admin = action.payload.data;
      })
      .addCase(registerAdmin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Login user
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<UserData>) => {
        state.isLoading = false;
        state.user = action.payload.data;
        state.isLoggedIn = true;
        state.isAdmin = false;

        // Store tokens if provided
        if (action.payload.data.accessToken) {
          localStorage.setItem('accessToken', action.payload.data.accessToken);
        }
        if (action.payload.data.refreshToken) {
          localStorage.setItem('refreshToken', action.payload.data.refreshToken);
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Login admin
      .addCase(loginAdmin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action: PayloadAction<AdminData>) => {
        state.isLoading = false;
        state.admin = action.payload.data;
        state.user = action.payload.data; // Set both admin and user for consistency
        state.isLoggedIn = true;
        state.isAdmin = true;

        // Store tokens if provided
        if (action.payload.data.accessToken) {
          localStorage.setItem('accessToken', action.payload.data.accessToken);
        }
        if (action.payload.data.refreshToken) {
          localStorage.setItem('refreshToken', action.payload.data.refreshToken);
        }
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Logout user
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isLoggedIn = false;
        state.isAdmin = false;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Logout admin
      .addCase(logoutAdmin.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutAdmin.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.admin = null;
        state.isLoggedIn = false;
        state.isAdmin = false;
      })
      .addCase(logoutAdmin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Check auth status
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;

        if (action.payload.role === 'Admin') {
          state.admin = action.payload;
          state.isAdmin = true;
        } else {
          state.isAdmin = false;
        }

        state.user = action.payload;
        state.isLoggedIn = true;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isLoading = false;
        state.isLoggedIn = false;
        state.isAdmin = false;
        state.user = null;
        state.admin = null;
      });
  },
});

export const { logout, setAuth, setUser, setLoading, clearAuth, clearAuthError } = authSlice.actions;
export default authSlice.reducer;