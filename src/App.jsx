import { useEffect, useState } from 'react';
import './App.scss';
import { getUserData } from './db';

import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Setting from './pages/Setting';
import Week from './pages/Week';
import Todos from './pages/Todos';

function App() {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await getUserData();
        setUserData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  if (isLoading) return <div>로딩 중...</div>;

  const isUserSetup =
    userData && userData.city && userData.plants && userData.plants.length > 0;

  return (
    <Routes>
      {/* 조건부 렌더링된 진입점 */}
      <Route
        path="/"
        element={isUserSetup ? <Home /> : <Navigate to="/setting" />}
      />
      <Route path="/setting" element={<Setting />} />
      <Route path="/week" element={<Week />} />
      <Route path="/todos" element={<Todos />} />

    </Routes>
  );
}

export default App;