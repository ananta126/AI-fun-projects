import type { Metadata } from "next";
import { TicTacToeGame } from "@/components/tic-tac-toe/TicTacToeGame";

export const metadata: Metadata = {
  title: "Tic-Tac-Toe",
  description: "A flashy neon tic-tac-toe game for two players.",
};

export default function TicTacToePage() {
  return (
    <main className="tic-page min-h-screen">
      <TicTacToeGame />
    </main>
  );
}