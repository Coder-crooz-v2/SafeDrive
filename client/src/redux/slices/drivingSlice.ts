import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Coordinates {
  lat: number;
  lng: number;
}

interface DrivingState {
  isDriving: boolean;
  location: string;
  coordinates: Coordinates;
  speed: number;
  isOverspeeding: boolean;
  drivingStartTime: number | null;
  elapsedTime: number;
}

const initialState: DrivingState = {
  isDriving: false,
  location: '',
  coordinates: {
    lat: 0,
    lng: 0
  },
  speed: 0,
  isOverspeeding: false,
  drivingStartTime: null,
  elapsedTime: 0
};

interface DrivingDataUpdate {
  location?: string;
  coordinates?: Coordinates;
  speed?: number;
  isOverspeeding?: boolean;
}

const drivingSlice = createSlice({
  name: 'driving',
  initialState,
  reducers: {
    setDrivingMode: (state, action: PayloadAction<boolean>) => {
      state.isDriving = action.payload;
      if (action.payload) {
        state.drivingStartTime = Date.now();
        state.elapsedTime = 0;
      } else {
        state.drivingStartTime = null;
        state.speed = 0;
        state.isOverspeeding = false;
      }
    },
    updateDrivingData: (state, action: PayloadAction<DrivingDataUpdate>) => {
      if (action.payload.location !== undefined) {
        state.location = action.payload.location;
      }
      if (action.payload.coordinates !== undefined) {
        state.coordinates = action.payload.coordinates;
      }
      if (action.payload.speed !== undefined) {
        state.speed = action.payload.speed;
      }
      if (action.payload.isOverspeeding !== undefined) {
        state.isOverspeeding = action.payload.isOverspeeding;
      }
    },
    updateElapsedTime: (state, action: PayloadAction<number>) => {
      state.elapsedTime = action.payload;
    }
  }
});

export const { setDrivingMode, updateDrivingData, updateElapsedTime } = drivingSlice.actions;
export default drivingSlice.reducer;