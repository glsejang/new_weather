import { cityNameMap } from '../data/cityNameMap';
import Form from 'react-bootstrap/Form';
import { setUserData } from '../db';
import InputGroup from 'react-bootstrap/InputGroup';
import { useState } from 'react';
import { setCity } from '../features/citySlice';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

export function CitySelect({ value, onChange }) {
  const cities = Object.keys(cityNameMap);

  return (
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">선택</option>
      {cities.map(city => (
        <option key={city} value={city}>{city}</option>
      ))}
    </select>
  );
}