import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';

export function PlantsSelect({ value, onChange }) {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleAddClick = () => {
    // 입력값 쉼표로 나누기 + 공백 제거 + 빈값 제거
    const newPlants = inputValue
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    // 기존 값과 합치고 중복 제거
    const combined = Array.from(new Set([...value, ...newPlants]));

    onChange(combined);
    setInputValue('');
  };

  return (
    <div>
      <InputGroup className="mb-3">
        <Form.Control
          placeholder="식물을 쉼표로 구분해 입력하세요"
          value={inputValue}
          onChange={handleInputChange}
        />
        <Button variant="outline-secondary" onClick={handleAddClick}>
          추가
        </Button>
      </InputGroup>

      {/* 현재 선택된 식물 목록 보여주기 */}
      <div>
        <strong>선택된 식물:</strong> {value.length > 0 ? value.join(', ') : '없음'}
      </div>
    </div>
  );
}