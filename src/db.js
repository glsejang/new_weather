import Dexie from 'dexie';

const db = new Dexie('userDB');

db.version(1).stores({
  settings: 'id', // keyPath
});

export const getUserData = async () => {
  return await db.settings.get('user');
};

export const setUserData = async (data) => {
  await db.settings.put({ id: 'user', ...data });
};

export const addPlant = async (plantName) => {
  const userData = await db.settings.get('user');

  const existingPlants = userData?.plants || [];

  if (existingPlants.includes(plantName)) return;

  const updatedPlants = [...existingPlants, plantName];

  await db.settings.put({
    ...userData,
    id: 'user',
    plants: updatedPlants,
  });
};

export default db;