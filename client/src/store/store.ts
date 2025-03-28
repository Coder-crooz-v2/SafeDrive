import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../redux/slices/authSlice'
import drivingReducer from '../redux/slices/drivingSlice'
import accidentsReducer from '../redux/slices/accidentSlice'
import adminReducer from '../redux/slices/adminSlice'
// ...

export const store = configureStore({
  reducer: {
    auth: authReducer,
    driving: drivingReducer,
    accidents: accidentsReducer,
    admin: adminReducer,
  }
})

// Infer the `RootState`,  `AppDispatch`, and `AppStore` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
export type AppStore = typeof store