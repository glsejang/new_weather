import { useEffect, useState } from 'react';
import { getUserData, setUserData } from '../db';
import { CitySelect } from '../components/CitySelect.jsx';
import { PlantsSelect } from '../components/PlantSelect.jsx';
import { useNavigate } from 'react-router-dom';

function Setting() {
  const [savedData, setSavedData] = useState({ city: '', plants: [] });
  const [isSaving, setIsSaving] = useState(false);
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

  const hardGoHome = () => {
    // prod(HashRouter) 기준 강제 홈
    if (location.hash !== '#/' && location.hash !== '#') {
      location.hash = '#/';
      return;
    }
    // dev(BrowserRouter) 대비
    const base = import.meta.env.BASE_URL || '/';
    if (location.pathname !== base) location.pathname = base;
  };

  const handleComplete = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      console.log('완료 버튼 클릭됨', savedData);
      await setUserData(savedData);
      console.log('저장 완료, 홈으로 이동 시도');

      // 1차: 정상 라우팅
      navigate('/', { replace: true });

      // 2차: 설치형/모바일에서 간헐적 네비 실패 대비
      setTimeout(() => {
        const atHome =
          (location.hash === '#/' || location.hash === '#') ||
          (location.pathname === (import.meta.env.BASE_URL || '/'));
        if (!atHome) {
          console.warn('[Setting] navigate 실패 감지 → hard fallback');
          hardGoHome();
        }
      }, 60);
    } catch (e) {
      console.error('저장 실패 ❌', e);
      alert('저장 중 오류가 발생했습니다. 콘솔을 확인해주세요.');
    } finally {
      setIsSaving(false);
    }
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

      <button
        type="button"
        onClick={handleComplete}
        onTouchEnd={(e) => { e.preventDefault(); handleComplete(); }} // iOS/설치형 보강
        disabled={isSaving}
        style={{ position: 'relative', zIndex: 10000 }}
      >
        {isSaving ? '저장 중…' : '완료'}
      </button>
    </div>
  );
}

export default Setting;
