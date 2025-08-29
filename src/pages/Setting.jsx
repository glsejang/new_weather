import { useEffect, useState } from 'react';
import { getUserData, setUserData } from '../db';
import { CitySelect } from '../components/CitySelect.jsx';
import { PlantsSelect } from '../components/PlantSelect.jsx';
import { useNavigate } from 'react-router-dom';

function Setting() {
  const [savedData, setSavedData] = useState({ city: '', plants: [] });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const data = await getUserData();
      if (data) {
        setSavedData({
          city: data.city || '',
          plants: data.plants || [],
        });
      }
    };
    fetchData();
  }, []);

  const handleComplete = async () => {
    console.log('완료 버튼 클릭됨', savedData);
    await setUserData(savedData);
    console.log('저장 완료, 홈으로 이동 시도');
    navigate('/');
  };


  
  return (
    <div className="settingPage">
      <div className="locationBox">
        <h2>🌆 도시 설정</h2>
        <CitySelect
          value={savedData.city}
          onChange={(newCity) => setSavedData(prev => ({ ...prev, city: newCity }))}
        />

      </div>

      <div className="plantsBox">
        <h2>🌱 식물 설정</h2>
        <PlantsSelect
          value={savedData.plants}
          onChange={(newPlants) => setSavedData(prev => ({ ...prev, plants: newPlants }))}
        />
      </div>

      <div className="savedBox">
        <h3>저장된 정보</h3>
        <p>도시: {savedData.city || '없음'}</p>
        <p>식물: {savedData.plants.length > 0 ? savedData.plants.join(', ') : '없음'}</p>
      </div>

      <button onClick={handleComplete}>완료</button>
    </div>
  );
}

export default Setting;