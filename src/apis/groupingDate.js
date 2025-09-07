export function groupingDate(todoCard) {
  const dateMap = {};

  todoCard.forEach(plant => {
    plant.tasks.forEach(task => {
      if (!dateMap[task.date]) {
        dateMap[task.date] = [];
      }
      dateMap[task.date].push({
        plantName: plant.name,
        todos: task.todos || [],
        cautions: task.cautions || []
      });
    });
  });

  return Object.entries(dateMap)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([date, tasks]) => {
      // 날짜별 전체 주의사항 모으기 (중복 제거)
      const overallCautions = Array.from(
        new Set(tasks.flatMap(t => t.cautions || []))
      );
      const overallCautionsText = overallCautions.join(' / ');

      return { date, tasks, overallCautions, overallCautionsText };
    });
}