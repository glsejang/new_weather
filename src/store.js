import { configureStore } from '@reduxjs/toolkit'
import counterReducer from './features/counterSlice'
import { createSlice } from '@reduxjs/toolkit';
import cityReducer from './features/citySlice';
import forecastReducer from './features/forecastSlice';





const store = configureStore({
  reducer: {
    counter: counterReducer,
    city : cityReducer,
    forecast: forecastReducer,
  },
})

export default store