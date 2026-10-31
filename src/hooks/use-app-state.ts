import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/** Current app lifecycle state: 'active', 'inactive' (e.g. app switcher, system sheets), or 'background'. */
export function useAppState(): AppStateStatus {
  const [state, setState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setState);
    return () => subscription.remove();
  }, []);

  return state;
}
