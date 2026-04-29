import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'https://e4-tab-server.abhinavgoldandsilver.com';

const safeStorage = AsyncStorage || {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
  multiRemove: () => Promise.resolve(),
};

export const storage = {
  setToken: (token) => safeStorage.setItem('token', token),
  getToken: () => safeStorage.getToken ? safeStorage.getToken() : safeStorage.getItem('token'),
  setUser: (user) => safeStorage.setItem('user', JSON.stringify(user)),
  getUser: async () => {
    try {
      const user = await safeStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch(e) { return null; }
  },
  clear: () => safeStorage.multiRemove(['token', 'user']),
};
