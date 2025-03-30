import { axiosInstance } from '@/lib/axios';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// Types
interface AdminProfile {
  _id: string;
  username: string;
  companyName: string;
  email: string;
  phoneNumber: string;
  createdAt: string;
}

interface Client {
  _id: string;
  fullName: string;
  email: string;
  age: number;
  gender: string;
  phoneNumber: string;
  avatar: string;
  vehicleType: string;
  vehicleModel: string;
  createdAt: string;
}

interface AdminState {
  profile: AdminProfile | null;
  clients: Client[];
  clientCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  profile: null,
  clients: [],
  clientCount: 0,
  loading: false,
  error: null
};

// Async thunks
export const fetchAdminProfile = createAsyncThunk(
  'admin/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/admin/current-admin', {
        withCredentials: true
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch admin profile');
    }
  }
);

export const fetchClients = createAsyncThunk(
  'admin/fetchClients',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/admin/clients', {
        withCredentials: true
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch clients');
    }
  }
);

// Slice
const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearAdminData: (state) => {
      state.profile = null;
      state.clients = [];
      state.clientCount = 0;
    }
  },
  extraReducers: (builder) => {
    // Admin profile reducers
    builder
      .addCase(fetchAdminProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAdminProfile.fulfilled, (state, action: PayloadAction<AdminProfile>) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchAdminProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
    
    // Clients reducers
    builder
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action: PayloadAction<Client[]>) => {
        state.loading = false;
        state.clients = action.payload;
        state.clientCount = action.payload.length;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearAdminData } = adminSlice.actions;
export default adminSlice.reducer;