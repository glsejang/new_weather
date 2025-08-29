import { createSlice } from '@reduxjs/toolkit';

const forecastSlice = createSlice({
  name: 'forecast',
  initialState: {
    data: [],
    lastUpdated: null, // 마지막 업데이트 시간

  },
  reducers: {
    setForecast(state, action) {
      state.data = action.payload;
      state.lastUpdated = new Date().getTime();
    },
  },
});

export const { setForecast } = forecastSlice.actions;
export default forecastSlice.reducer;