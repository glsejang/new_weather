import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { makeWeatherPrompt } from '../apis/makePrompt'; 
import { askGemini } from '../apis/ask';
import { groupingDate } from '../apis/groupingDate';

export default function Todo(){
    const location = useLocation();
    const { city, plants, forecast } = location.state || {};
    const [todos, setTodos] = useState([]);
    const [dateGroupedTodos, setDateGroupedTodos] = useState([]); // 날짜별로 그룹화된 데이터 상태
    const [isLoading, setIsLoading] = useState(false);
    console.log('투두스:',todos)

    useEffect(() => {
        const getTodosFromGemini = async () => {
        if (!city || !plants || plants.length === 0 || !forecast) {
            return; // 필수 데이터가 없으면 실행하지 않음
        }

        setIsLoading(true);
            const prompt = makeWeatherPrompt(city, forecast, plants);
            const todoList = await askGemini(prompt);
            setTodos(todoList);

            const groupedList = groupingDate(todoList);
            setDateGroupedTodos(groupedList); // 새로운 상태에 저장합니다.

            setIsLoading(false);

            console.log('생성된 투두리스트:', todoList);
            console.log('날짜별로 그룹화된 투두리스트:', groupedList);
            console.log('생성된 프롬프트:', prompt);
        };
        getTodosFromGemini();



    }, [city, plants, forecast]);

    if (isLoading) {
        return <div>투두리스트를 생성하는 중...</div>;
    }

    return(
        <>
         <h1>todo리스트입니다</h1>
         <div className='todobox'>
            {dateGroupedTodos.map((day, i) => (
                <div key={i} className='todoCard'>
                    <h3>{day.date}</h3>
                    {day.tasks.map((task, tIdx) => (
                    <div key={tIdx}>
                        <strong>{task.plantName}</strong>
                        <ul>
                        {task.todos?.map((todo, idx) => (
                            <li key={idx}>{todo}</li>
                        ))}
                        {task.cautions?.map((caution, idx) => (
                            <li key={idx}>{caution}</li>
                        ))}
                        </ul>
                    </div>
                    ))}
                </div>
            ))}



         </div>
         

        </>
    )
}