"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_BOARDS } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";
import { userService } from "@/services/user-service";
import type { Board, User } from "@/types";

interface AppState {
  user: User | null;
  savedOutfitIds: Set<string>;
  boards: Board[];
  isHydrated: boolean;
}

interface AppContextValue extends AppState {
  updateUser: (updates: Partial<User>) => void;
  toggleSaveOutfit: (outfitId: string) => void;
  isOutfitSaved: (outfitId: string) => boolean;
  createBoard: (name: string, description?: string) => Board;
  addOutfitToBoard: (boardId: string, outfitId: string) => void;
  removeOutfitFromBoard: (boardId: string, outfitId: string) => void;
  deleteBoard: (boardId: string) => void;
  getBoard: (boardId: string) => Board | undefined;
}

const STORAGE_KEY = "lookbook_state";

const AppContext = createContext<AppContextValue | null>(null);

function createDefaultBoards(): Board[] {
  const now = new Date().toISOString();
  return DEFAULT_BOARDS.map((name, i) => ({
    id: `board-default-${i}`,
    userId: "user-1",
    name,
    outfitIds: [],
    createdAt: now,
  }));
}

function loadState(): Partial<AppState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      user: parsed.user ?? null,
      savedOutfitIds: new Set(parsed.savedOutfitIds ?? []),
      boards: parsed.boards ?? createDefaultBoards(),
    };
  } catch {
    return {};
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [savedOutfitIds, setSavedOutfitIds] = useState<Set<string>>(new Set());
  const [boards, setBoards] = useState<Board[]>(createDefaultBoards());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = loadState();
    // Hydrate client state from localStorage after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional SSR hydration
    setUser(stored.user ?? userService.getDefaultUser());
    setSavedOutfitIds(stored.savedOutfitIds ?? new Set());
    setBoards(stored.boards ?? createDefaultBoards());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user,
        savedOutfitIds: [...savedOutfitIds],
        boards,
      })
    );
  }, [user, savedOutfitIds, boards, isHydrated]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => ({
      ...(prev ?? userService.getDefaultUser()),
      ...updates,
    }));
  }, []);

  const toggleSaveOutfit = useCallback((outfitId: string) => {
    setSavedOutfitIds((prev) => {
      const next = new Set(prev);
      if (next.has(outfitId)) {
        next.delete(outfitId);
        trackEvent("outfit_unsaved", { outfitId });
      } else {
        next.add(outfitId);
        trackEvent("outfit_saved", { outfitId });
      }
      return next;
    });
  }, []);

  const isOutfitSaved = useCallback(
    (outfitId: string) => savedOutfitIds.has(outfitId),
    [savedOutfitIds]
  );

  const createBoard = useCallback((name: string, description?: string) => {
    const board: Board = {
      id: `board-${Date.now()}`,
      userId: "user-1",
      name,
      description,
      outfitIds: [],
      createdAt: new Date().toISOString(),
    };
    setBoards((prev) => [board, ...prev]);
    trackEvent("board_created", { boardId: board.id, name });
    return board;
  }, []);

  const addOutfitToBoard = useCallback((boardId: string, outfitId: string) => {
    setBoards((prev) =>
      prev.map((b) =>
        b.id === boardId && !b.outfitIds.includes(outfitId)
          ? { ...b, outfitIds: [...b.outfitIds, outfitId] }
          : b
      )
    );
    trackEvent("outfit_added_to_board", { boardId, outfitId });
  }, []);

  const removeOutfitFromBoard = useCallback(
    (boardId: string, outfitId: string) => {
      setBoards((prev) =>
        prev.map((b) =>
          b.id === boardId
            ? { ...b, outfitIds: b.outfitIds.filter((id) => id !== outfitId) }
            : b
        )
      );
    },
    []
  );

  const deleteBoard = useCallback((boardId: string) => {
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
  }, []);

  const getBoard = useCallback(
    (boardId: string) => boards.find((b) => b.id === boardId),
    [boards]
  );

  const value = useMemo(
    () => ({
      user,
      savedOutfitIds,
      boards,
      isHydrated,
      updateUser,
      toggleSaveOutfit,
      isOutfitSaved,
      createBoard,
      addOutfitToBoard,
      removeOutfitFromBoard,
      deleteBoard,
      getBoard,
    }),
    [
      user,
      savedOutfitIds,
      boards,
      isHydrated,
      updateUser,
      toggleSaveOutfit,
      isOutfitSaved,
      createBoard,
      addOutfitToBoard,
      removeOutfitFromBoard,
      deleteBoard,
      getBoard,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
