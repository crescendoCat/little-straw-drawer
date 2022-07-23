import { configureStore } from '@reduxjs/toolkit';
import strawReducer from '../features/straw/strawSlice';

export default configureStore({
  reducer: {
    straw: strawReducer
  }
})