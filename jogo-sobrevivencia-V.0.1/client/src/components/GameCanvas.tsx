import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { SurvivalScene } from "@/game/scene";

export default function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || gameRef.current) return;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: "#0a4a52",
      render: { antialias: true, roundPixels: false, pixelArt: false },
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [SurvivalScene],
      input: { keyboard: true },
      banner: false,
    });

    gameRef.current = game;
    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={hostRef} className="fixed inset-0 h-full w-full outline-none" style={{ touchAction: "none" }} />;
}
