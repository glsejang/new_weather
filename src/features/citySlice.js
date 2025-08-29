import { createSlice } from '@reduxjs/toolkit';
import { act } from 'react';


const citySlice = createSlice({
    name: 'city',
    initialState : {
        selectedCity: ''
    },
    reducers: {
        setCity(state, action){
            state.selectedCity = action.payload
        }
    }
})

export const { setCity } = citySlice.actions
export default citySlice.reducer