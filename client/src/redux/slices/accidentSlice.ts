import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
interface Accident {
  latitude: string;
  longitude: string;
  Number_of_Vehicles: string;
  Time: string;
  Date: string;
}

interface AccidentsState {
  accidents: Accident[];
  loading: boolean;
  error: string | null;
}

// Sample accident data (you would typically fetch this from an API)
const sampleAccidentData = [
  {
    "latitude": "14.72402585",
    "longitude": "78.61039332",
    "Number_of_Vehicles": "1",
    "Time": "17:42",
    "Date": "04-01-2023"
  },
  {
    "latitude": "14.71502585",
    "longitude": "78.60539332",
    "Number_of_Vehicles": "2",
    "Time": "08:15",
    "Date": "12-03-2022"
  },
  {
    "latitude": "14.73302585",
    "longitude": "78.61739332",
    "Number_of_Vehicles": "3",
    "Time": "13:20",
    "Date": "27-06-2022"
  },
  {
    "latitude": "14.72102585",
    "longitude": "78.60839332",
    "Number_of_Vehicles": "1",
    "Time": "23:55",
    "Date": "01-11-2021"
  }
];

// In a real app, this would make an API call to your backend
export const fetchAccidentsNearby = createAsyncThunk(
  'accidents/fetchAccidentsNearby',
  async ({ latitude, longitude }: { latitude: number, longitude: number, radius: number }) => {
    try {
      // In a real application, you'd make an API call here
      // const response = await axios.get(`/api/accidents?lat=${latitude}&lng=${longitude}&radius=${radius}`);
      // return response.data;
      
      // For now, we'll use the sample data and filter based on proximity
      // This simulates getting only nearby accidents
      
      // Wait a bit to simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate some random accident locations near the current position
      const nearbyAccidents = [];
      
      // Add the sample data
      for (const accident of sampleAccidentData) {
        nearbyAccidents.push(accident);
      }
      
      // Generate some additional random accidents around the current location
      for (let i = 0; i < 10; i++) {
        // Random offset in lat/lng (-0.05 to 0.05 degrees, roughly 5km)
        const latOffset = (Math.random() - 0.5) * 0.1;
        const lngOffset = (Math.random() - 0.5) * 0.1;
        
        const randomDate = new Date();
        randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 700)); // Random date within last 2 years
        const day = String(randomDate.getDate()).padStart(2, '0');
        const month = String(randomDate.getMonth() + 1).padStart(2, '0');
        const year = randomDate.getFullYear();
        
        const randomHour = Math.floor(Math.random() * 24);
        const randomMinute = Math.floor(Math.random() * 60);
        
        nearbyAccidents.push({
          latitude: (latitude + latOffset).toString(),
          longitude: (longitude + lngOffset).toString(),
          Number_of_Vehicles: (Math.floor(Math.random() * 3) + 1).toString(),
          Date: `${day}-${month}-${year}`,
          Time: `${String(randomHour).padStart(2, '0')}:${String(randomMinute).padStart(2, '0')}`
        });
      }
      
      return nearbyAccidents;
    } catch (error) {
      throw new Error('Failed to fetch accident data');
    }
  }
);

const initialState: AccidentsState = {
  accidents: [],
  loading: false,
  error: null
};

const accidentsSlice = createSlice({
  name: 'accidents',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccidentsNearby.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccidentsNearby.fulfilled, (state, action: PayloadAction<Accident[]>) => {
        state.loading = false;
        state.accidents = action.payload;
      })
      .addCase(fetchAccidentsNearby.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch accident data';
      });
  }
});

export default accidentsSlice.reducer;