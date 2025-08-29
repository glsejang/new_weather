export function groupingDate(todoCard) {
  const dateMap = {};

  todoCard.forEach(plant => {
    plant.tasks.forEach(task => {
      if (!dateMap[task.date]) {
        dateMap[task.date] = [];
      }
      dateMap[task.date].push({
        plantName: plant.name,
        todos: task.todos
      });
    });
  });

  return Object.entries(dateMap)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([date, tasks]) => ({ date, tasks }));
}