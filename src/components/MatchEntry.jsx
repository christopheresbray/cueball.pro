import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

const MatchEntry = () => {
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  const submitMatch = async () => {
    if (!homeTeam || !awayTeam || homeScore === "" || awayScore === "") {
      alert("Please enter all match details.");
      return;
    }

    try {
      await addDoc(collection(db, "matches"), {
        homeTeam,
        awayTeam,
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        date: new Date().toISOString(),
      });
      alert("Match result submitted!");
      setHomeTeam("");
      setAwayTeam("");
      setHomeScore("");
      setAwayScore("");
    } catch (error) {
      console.error("Error submitting match:", error);
      alert("Error submitting match.");
    }
  };

  return (
    <div>
      <h2>Enter Match Results</h2>
      <input
        type="text"
        placeholder="Home Team"
        value={homeTeam}
        onChange={(e) => setHomeTeam(e.target.value)}
      />
      <input
        type="text"
        placeholder="Away Team"
        value={awayTeam}
        onChange={(e) => setAwayTeam(e.target.value)}
      />
      <input
        type="number"
        placeholder="Home Score"
        value={homeScore}
        onChange={(e) => setHomeScore(e.target.value)}
      />
      <input
        type="number"
        placeholder="Away Score"
        value={awayScore}
        onChange={(e) => setAwayScore(e.target.value)}
      />
      <button onClick={submitMatch}>Submit Match</button>
    </div>
  );
};

export default MatchEntry;
