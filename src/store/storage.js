const STORAGE_KEY = 'AA5_trips';
const normalizeMember = (m) => ({
  ...m,
  member_count: typeof m.member_count === 'number' && m.member_count >= 1 ? m.member_count : (m.isGroup ? 2 : 1)
});
const loadTrips = (fallback) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return fallback;
    return data.map(trip => ({
      ...trip,
      members: (trip.members || []).map(normalizeMember)
    }));
  } catch (e) { return fallback; }
};
const saveTrips = (trips) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(trips)); } catch (e) {}
};
window.STORAGE_KEY = STORAGE_KEY; window.loadTrips = loadTrips; window.saveTrips = saveTrips;
