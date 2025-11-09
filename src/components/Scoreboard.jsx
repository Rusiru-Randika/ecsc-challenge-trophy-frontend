import { useState, useEffect } from "react";
import axios from "axios";
import MatchCard from "./MatchCard";

const Scoreboard = () => {
  const [liveMatches, setLiveMatches] = useState([]);
  const [lastCompletedMatch, setLastCompletedMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch live matches and last completed match
    const fetchMatches = async () => {
      try {
        // Fetch live matches
        const liveResponse = await axios.get("/api/matches?status=live");
        if (liveResponse.data.success) {
          const newMatches = liveResponse.data.matches;
          // Only update if data has actually changed (deep comparison of scores)
          setLiveMatches((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(newMatches)) {
              return newMatches;
            }
            return prev;
          });
        }

        // If no live matches, fetch last completed match
        if (
          !liveResponse.data.matches ||
          liveResponse.data.matches.length === 0
        ) {
          const completedResponse = await axios.get(
            "/api/matches?status=completed"
          );
          if (
            completedResponse.data.success &&
            completedResponse.data.matches.length > 0
          ) {
            // Get the most recent completed match (sorted by date, most recent first)
            const sortedMatches = completedResponse.data.matches.sort(
              (a, b) => b.date - a.date
            );
            const newLastMatch = sortedMatches[0];
            // Only update if data has actually changed
            setLastCompletedMatch((prev) => {
              if (JSON.stringify(prev) !== JSON.stringify(newLastMatch)) {
                return newLastMatch;
              }
              return prev;
            });
          }
        } else {
          setLastCompletedMatch(null);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching matches:", error);
        setLoading(false);
      }
    };

    fetchMatches();

    // Poll for updates every 3 seconds (simulates real-time)
    const interval = setInterval(fetchMatches, 3000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show last completed match if no live matches
  if (liveMatches.length === 0 && lastCompletedMatch) {
    return (
      <div>
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <h2 className="text-2xl font-bold text-gray-800">
            Last Match Result
          </h2>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border-2 border-green-200">
          <div className="text-center mb-4">
            <span className="inline-block px-4 py-1 bg-green-600 text-white text-sm font-semibold rounded-full">
              COMPLETED
            </span>
          </div>

          <MatchCard match={lastCompletedMatch} />

          {lastCompletedMatch.result && (
            <div className="mt-6 bg-white rounded-lg p-4 border-2 border-green-300">
              <p className="text-center text-lg font-bold text-green-700">
                🏆 {lastCompletedMatch.result}
              </p>
            </div>
          )}

          <p className="text-center text-gray-600 mt-4 text-sm">
            Waiting for the next match to start...
          </p>
        </div>
      </div>
    );
  }

  // No matches at all
  if (liveMatches.length === 0 && !lastCompletedMatch) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🏏</div>
        <p className="text-xl text-gray-600">No matches yet</p>
        <p className="text-gray-500 mt-2">Check back later for live updates!</p>
      </div>
    );
  }

  // Show live matches
  return (
    <div>
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        <h2 className="text-2xl font-bold text-gray-800">Live Matches</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {liveMatches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
};

export default Scoreboard;
