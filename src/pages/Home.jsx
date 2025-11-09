import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const Home = () => {
  const [nextUpcomingMatch, setNextUpcomingMatch] = useState(null);
  const [liveMatch, setLiveMatch] = useState(null);
  const [lastCompletedMatch, setLastCompletedMatch] = useState(null);
  const [allMatches, setAllMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchMatches, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await axios.get("/api/matches");
      if (response.data.success) {
        const matches = response.data.matches;

        // Store all matches for match number calculation (only if changed)
        setAllMatches((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(matches)) {
            return matches;
          }
          return prev;
        });

        // Get live match (first one if multiple)
        const liveMatches = matches.filter((m) => m.status === "live");
        const newLiveMatch = liveMatches[0] || null;
        setLiveMatch((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(newLiveMatch)) {
            return newLiveMatch;
          }
          return prev;
        });

        // Get next upcoming match (earliest by date)
        const upcomingMatches = matches
          .filter((m) => m.status === "upcoming")
          .sort((a, b) => a.date - b.date);
        const newUpcomingMatch = upcomingMatches[0] || null;
        setNextUpcomingMatch((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(newUpcomingMatch)) {
            return newUpcomingMatch;
          }
          return prev;
        });

        // Get last completed match (most recent by date)
        const completedMatches = matches
          .filter((m) => m.status === "completed")
          .sort((a, b) => b.date - a.date);
        const newLastCompletedMatch = completedMatches[0] || null;
        setLastCompletedMatch((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(newLastCompletedMatch)) {
            return newLastCompletedMatch;
          }
          return prev;
        });
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching matches:", error);
      setLoading(false);
    }
  };

  const getTeamShortName = (teamName) => {
    if (!teamName) return "?";
    const words = teamName.split(" ");
    if (words.length === 1) return teamName.substring(0, 3).toUpperCase();
    return words
      .map((w) => w[0])
      .join("")
      .substring(0, 3)
      .toUpperCase();
  };

  const CompactMatchCard = ({
    match,
    status,
    statusColor,
    statusBg,
    allMatches,
  }) => {
    // Calculate match name
    const getMatchName = () => {
      if (
        match.matchType?.toLowerCase().includes("final") &&
        !match.matchType?.toLowerCase().includes("semi")
      ) {
        return "🏆 Final";
      }
      if (match.matchType?.toLowerCase().includes("semi")) {
        return "🔥 " + match.matchType;
      }

      // For group stage matches
      const bracketConfig = JSON.parse(
        localStorage.getItem("tournamentBracket") || '{"groupA":[],"groupB":[]}'
      );
      const groupATeams = bracketConfig.groupA.filter((id) => id);
      const groupBTeams = bracketConfig.groupB.filter((id) => id);

      const isGroupA =
        groupATeams.includes(match.team1Id) &&
        groupATeams.includes(match.team2Id);
      const isGroupB =
        groupBTeams.includes(match.team1Id) &&
        groupBTeams.includes(match.team2Id);

      if (isGroupA || isGroupB) {
        // Calculate match number based on ALL tournament matches
        const allTournamentMatches = (allMatches || []).filter(
          (m) => m.matchType === "Tournament"
        );
        const groupMatches = allTournamentMatches.filter((m) =>
          isGroupA
            ? groupATeams.includes(m.team1Id) && groupATeams.includes(m.team2Id)
            : groupBTeams.includes(m.team1Id) && groupBTeams.includes(m.team2Id)
        );

        // Sort by date to maintain consistent order
        groupMatches.sort((a, b) => a.date - b.date);

        const matchIndex = groupMatches.findIndex((m) => m.id === match.id);
        const matchNumber = matchIndex >= 0 ? matchIndex + 1 : 1;

        return isGroupA
          ? `🟢 Group A - Match ${matchNumber}`
          : `🔵 Group B - Match ${matchNumber}`;
      }

      return match.matchType || "Tournament";
    };

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden h-full flex flex-col">
        <div
          className={`${statusBg} px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between`}
        >
          <span
            className={`inline-flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold uppercase ${statusColor}`}
          >
            {status === "live" && (
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
            {status}
          </span>
          <span className="text-xs text-gray-600">
            {new Date(match.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Match Name */}
        <div className="px-4 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3 bg-gray-50 border-b border-gray-100">
          <p className="text-xs sm:text-sm font-bold text-gray-700 text-center leading-tight">
            {getMatchName()}
          </p>
        </div>

        <div className="p-4 sm:p-5 md:p-6 flex-1 flex flex-col justify-between">
          <div className="space-y-3 sm:space-y-4">
            {/* Team 1 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {match.team1Logo ? (
                  <img
                    src={match.team1Logo}
                    alt={match.team1Name}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {getTeamShortName(match.team1Name)}
                  </div>
                )}
                <span className="font-semibold text-xs sm:text-sm truncate">
                  {match.team1Name}
                </span>
              </div>
              {status !== "upcoming" && (
                <div className="text-right flex-shrink-0">
                  <span className="font-bold text-lg sm:text-xl">
                    {match.team1Score?.runs || 0}/
                    {match.team1Score?.wickets || 0}
                  </span>
                  <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
                    ({match.team1Score?.balls || 0}/
                    {match.totalBallsPerTeam || 30} balls)
                  </div>
                </div>
              )}
            </div>

            <div className="text-center text-xs text-gray-400 font-bold">
              VS
            </div>

            {/* Team 2 */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {match.team2Logo ? (
                  <img
                    src={match.team2Logo}
                    alt={match.team2Name}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200 flex-shrink-0"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {getTeamShortName(match.team2Name)}
                  </div>
                )}
                <span className="font-semibold text-xs sm:text-sm truncate">
                  {match.team2Name}
                </span>
              </div>
              {status !== "upcoming" && (
                <div className="text-right flex-shrink-0">
                  <span className="font-bold text-lg sm:text-xl">
                    {match.team2Score?.runs || 0}/
                    {match.team2Score?.wickets || 0}
                  </span>
                  <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
                    ({match.team2Score?.balls || 0}/
                    {match.totalBallsPerTeam || 30} balls)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Match Info */}
          {status === "live" && (
            <div className="mt-4 sm:mt-5 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-xs sm:text-sm font-semibold text-red-700">
                🔴 LIVE NOW
              </p>
            </div>
          )}

          {match.result && (
            <div className="mt-4 sm:mt-5 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-xs sm:text-sm font-semibold text-green-700 leading-tight">
                🏆 {match.result}
              </p>
            </div>
          )}

          {status === "upcoming" && (
            <div className="mt-4 sm:mt-5 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
              <p className="text-xs sm:text-sm font-semibold text-blue-700">
                {match.totalBallsPerTeam
                  ? `${match.totalBallsPerTeam} balls per team`
                  : "T20"}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 sm:space-y-6 md:space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 lg:p-10 text-white">
        <div className="max-w-3xl">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 md:mb-5">
            Welcome to ECSC Challenge Trophy
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl opacity-90">
            Stay updated with live match scores, results, and tournament
            standings in real-time
          </p>
        </div>
      </div>

      {/* 3 Column Grid: Previous - Live - Next */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-7">
          {/* Previous Match Column */}
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between px-1 sm:px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">
                  Previous Match
                </h2>
              </div>
              {lastCompletedMatch && (
                <Link
                  to="/matches"
                  className="text-green-600 hover:text-green-700 text-xs sm:text-sm font-semibold"
                >
                  View All →
                </Link>
              )}
            </div>
            {lastCompletedMatch ? (
              <CompactMatchCard
                match={lastCompletedMatch}
                status="completed"
                statusColor="bg-gray-500 text-white"
                statusBg="bg-gray-50"
                allMatches={allMatches}
              />
            ) : (
              <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 sm:p-10 text-center">
                <div className="text-3xl sm:text-4xl mb-2">✅</div>
                <p className="text-xs sm:text-sm text-gray-500">
                  No completed matches yet
                </p>
              </div>
            )}
          </div>

          {/* Live Match Column */}

          <div className="space-y-4 sm:space-y-5 gap-5S">
            <div className="flex items-center justify-between px-1 sm:px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse"></div>
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">
                  Live Match
                </h2>
              </div>
            </div>
            {liveMatch ? (
              <CompactMatchCard
                match={liveMatch}
                status="live"
                statusColor="bg-red-500 text-white"
                statusBg="bg-red-50"
                allMatches={allMatches}
              />
            ) : (
              <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 sm:p-10 text-center">
                <div className="text-3xl sm:text-4xl mb-2">🏏</div>
                <p className="text-xs sm:text-sm text-gray-500">
                  No live match
                </p>
                <p className="text-xs text-gray-400 mt-1">Check back soon!</p>
              </div>
            )}
          </div>

          {/* Next Upcoming Match Column */}
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between px-1 sm:px-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full"></div>
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">
                  Next Match
                </h2>
              </div>
              {nextUpcomingMatch && (
                <Link
                  to="/matches"
                  className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-semibold"
                >
                  View All →
                </Link>
              )}
            </div>
            {nextUpcomingMatch ? (
              <CompactMatchCard
                match={nextUpcomingMatch}
                status="upcoming"
                statusColor="bg-blue-500 text-white"
                statusBg="bg-blue-50"
                allMatches={allMatches}
              />
            ) : (
              <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 sm:p-10 text-center">
                <div className="text-3xl sm:text-4xl mb-2">📅</div>
                <p className="text-xs sm:text-sm text-gray-500">
                  No upcoming matches
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Matches at All Message */}
      {!loading && !liveMatch && !nextUpcomingMatch && !lastCompletedMatch && (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-gray-200">
          <div className="text-6xl mb-4">🏏</div>
          <p className="text-xl text-gray-600 font-semibold">
            No matches scheduled yet
          </p>
          <p className="text-gray-500 mt-2">
            Check back later for tournament updates!
          </p>
        </div>
      )}
    </div>
  );
};

export default Home;
