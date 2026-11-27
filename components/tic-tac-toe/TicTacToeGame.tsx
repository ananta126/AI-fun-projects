"use client";

import { useCallback, useMemo, useState } from "react";
import { clsx } from "clsx";

type Player = "X" | "O";
type Cell = Player | null;

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

function computeWinner(board: Cell[]): Player | "draw" | null {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every((cell) => cell !== null)) return "draw";
  return null;
}

function winningLine(board: Cell[]): number[] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return [...line];
    }
  }
  return null;
}

function Mark({ player }: { player: Player }) {
  if (player === "X") {
    return (
      <span
        className="tic-mark tic-mark-x animate-pop select-none"
        aria-hidden
      >
        ✕
      </span>
    );
  }
  return (
    <span
      className="tic-mark tic-mark-o animate-pop select-none"
      aria-hidden
    >
      ◯
    </span>
  );
}

export function TicTacToeGame() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [current, setCurrent] = useState<Player>("X");
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });

  const outcome = useMemo(() => computeWinner(board), [board]);
  const winCells = useMemo(
    () => (outcome === "X" || outcome === "O" ? winningLine(board) : null),
    [board, outcome],
  );

  const gameOver = outcome !== null;

  const handleCellClick = useCallback(
    (index: number) => {
      if (board[index] !== null || gameOver) return;
      const next = [...board] as Cell[];
      next[index] = current;
      const result = computeWinner(next);
      setBoard(next);
      if (result === "X" || result === "O") {
        setScores((s) => ({ ...s, [result]: s[result] + 1 }));
        return;
      }
      if (result === "draw") {
        setScores((s) => ({ ...s, draws: s.draws + 1 }));
        return;
      }
      setCurrent((p) => (p === "X" ? "O" : "X"));
    },
    [board, current, gameOver],
  );

  const resetRound = () => {
    setBoard(Array(9).fill(null));
    setCurrent("X");
  };

  const resetAll = () => {
    resetRound();
    setScores({ X: 0, O: 0, draws: 0 });
  };

  const statusText = useMemo(() => {
    if (outcome === "X") return "Neon X takes the win!";
    if (outcome === "O") return "Electric O dominates!";
    if (outcome === "draw") return "It's a draw — rematch?";
    return `${current === "X" ? "X" : "O"}'s turn`;
  }, [outcome, current]);

  return (
    <div className="tic-root relative mx-auto flex max-w-lg flex-col items-center gap-8 px-4 py-12">
      <div className="tic-aurora pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl" aria-hidden />

      <header className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.35em] text-fuchsia-300/80">
          Arcade
        </p>
        <h1 className="mt-2 bg-gradient-to-r from-fuchsia-400 via-cyan-300 to-lime-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
          Tic-Tac-Toe
        </h1>
        <p className="mt-3 text-sm text-white/60">
          Two players · Tap a cell to play
        </p>
      </header>

      <div
        className={clsx(
          "rounded-2xl border border-white/10 bg-black/40 px-6 py-3 text-center text-lg font-semibold backdrop-blur-md transition-shadow",
          outcome === "X" && "shadow-[0_0_40px_rgba(255,0,128,0.45)]",
          outcome === "O" && "shadow-[0_0_40px_rgba(0,255,255,0.45)]",
          outcome === "draw" && "shadow-[0_0_30px_rgba(255,255,255,0.15)]",
        )}
        role="status"
        aria-live="polite"
      >
        <span
          className={clsx(
            outcome === null && current === "X" && "text-fuchsia-300",
            outcome === null && current === "O" && "text-cyan-300",
            outcome === "X" && "text-fuchsia-300",
            outcome === "O" && "text-cyan-300",
          )}
        >
          {statusText}
        </span>
      </div>

      <div
        className="tic-grid grid grid-cols-3 gap-3 p-4"
        role="grid"
        aria-label="Tic-tac-toe board"
      >
        {board.map((cell, i) => {
          const isWin = winCells?.includes(i);
          return (
            <button
              key={i}
              type="button"
              disabled={cell !== null || gameOver}
              onClick={() => handleCellClick(i)}
              className={clsx(
                "tic-cell relative flex h-24 w-24 items-center justify-center rounded-2xl border-2 text-5xl transition-all sm:h-28 sm:w-28",
                "border-white/15 bg-gradient-to-br from-slate-900/90 to-slate-950/90",
                "hover:border-white/30 hover:shadow-[0_0_25px_rgba(255,255,255,0.12)]",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
                "disabled:cursor-default disabled:hover:border-white/15 disabled:hover:shadow-none",
                isWin && cell === "X" && "tic-cell-win-x animate-win-pulse",
                isWin && cell === "O" && "tic-cell-win-o animate-win-pulse",
              )}
              aria-label={
                cell
                  ? `Cell ${i + 1}, ${cell}`
                  : gameOver
                    ? `Cell ${i + 1}, empty`
                    : `Cell ${i + 1}, empty, play ${current}`
              }
            >
              {cell ? <Mark player={cell} /> : null}
            </button>
          );
        })}
      </div>

      <div className="flex w-full max-w-sm flex-wrap items-center justify-center gap-4 text-sm">
        <ScorePill label="X" value={scores.X} variant="x" />
        <ScorePill label="Draws" value={scores.draws} variant="neutral" />
        <ScorePill label="O" value={scores.O} variant="o" />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={resetRound}
          className="rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] transition hover:brightness-110"
        >
          {gameOver ? "Play again" : "Reset board"}
        </button>
        <button
          type="button"
          onClick={resetAll}
          className="rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          Reset scores
        </button>
      </div>
    </div>
  );
}

function ScorePill({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "x" | "o" | "neutral";
}) {
  return (
    <div
      className={clsx(
        "flex min-w-[5.5rem] flex-col items-center rounded-xl border px-4 py-2",
        variant === "x" && "border-fuchsia-500/40 bg-fuchsia-500/10",
        variant === "o" && "border-cyan-400/40 bg-cyan-400/10",
        variant === "neutral" && "border-white/15 bg-white/5",
      )}
    >
      <span
        className={clsx(
          "text-xs uppercase tracking-wider",
          variant === "x" && "text-fuchsia-300",
          variant === "o" && "text-cyan-300",
          variant === "neutral" && "text-white/50",
        )}
      >
        {label}
      </span>
      <span className="font-mono text-2xl font-bold text-white">{value}</span>
    </div>
  );
}