import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { UserResult } from '@core/domain/User/user.interface';

type UserState = UserResult.getDetailUser | undefined;

type UserContextValue = {
  state: UserState;
  setState: Dispatch<SetStateAction<UserState>>;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<UserState>(undefined);
  return <UserContext.Provider value={{ state, setState }}>{children}</UserContext.Provider>;
};

export const useUserContext = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('UserContext must be used inside UserProvider');
  return ctx;
};
