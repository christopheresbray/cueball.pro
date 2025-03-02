import React from "react";
import Scoreboard from "./components/Scoreboard";
import MatchEntry from "./components/MatchEntry";
import PlayerStats from "./components/PlayerStats";

function App() {
  return (
    <div>
      <h1>Pool League Scoreboard</h1>
      <Scoreboard />
      <MatchEntry />
      <PlayerStats />
    </div>
  );
}

export default App;
