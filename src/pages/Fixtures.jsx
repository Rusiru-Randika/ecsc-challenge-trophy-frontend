import { useState, useEffect } from "react";
import axios from "axios";

const Fixtures = () => {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bracketConfig, setBracketConfig] = useState({
    groupA: ["", "", "", ""], // Team IDs for A1, A2, A3, A4
    groupB: ["", "", "", ""], // Team IDs for B1, B2, B3, B4
  });

  useEffect(() => {
    fetchData();
    loadBracketConfig();
  }, []);

  // Auto-assign teams on first load if no config exists and we have 8+ teams
  useEffect(() => {
    if (teams.length >= 8) {
      const saved = localStorage.getItem("tournamentBracket");
      if (!saved) {
        // No saved config, auto-assign teams
        const firstEightTeams = teams.slice(0, 8);
        const newConfig = {
          groupA: [
            firstEightTeams[0]?.id || "",
            firstEightTeams[1]?.id || "",
            firstEightTeams[2]?.id || "",
            firstEightTeams[3]?.id || "",
          ],
          groupB: [
            firstEightTeams[4]?.id || "",
            firstEightTeams[5]?.id || "",
            firstEightTeams[6]?.id || "",
            firstEightTeams[7]?.id || "",
          ],
        };
        setBracketConfig(newConfig);
      }
    }
  }, [teams]);

  const fetchData = async () => {
    try {
      const [teamsRes, matchesRes] = await Promise.all([
        axios.get("/api/teams"),
        axios.get("/api/matches"),
      ]);
      setTeams(teamsRes.data.teams || []);
      setMatches(matchesRes.data.matches || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  const loadBracketConfig = () => {
    const saved = localStorage.getItem("tournamentBracket");
    if (saved) {
      setBracketConfig(JSON.parse(saved));
    }
  };

  // Calculate standings to get qualified teams
  const calculateStandings = (groupTeamIds) => {
    const groupMatches = matches.filter(
      (m) =>
        m.matchType === "Tournament" &&
        groupTeamIds.includes(m.team1Id) &&
        groupTeamIds.includes(m.team2Id) &&
        m.status === "completed"
    );

    const standings = groupTeamIds
      .map((teamId) => {
        const team = teams.find((t) => t.id === teamId);
        if (!team) return null;

        let wins = 0;
        let draws = 0;
        let totalRunsScored = 0;
        let totalRunsConceded = 0;
        let totalBallsFaced = 0;

        groupMatches.forEach((match) => {
          const isTeam1 = match.team1Id === teamId;
          const teamScore = isTeam1 ? match.team1Score : match.team2Score;
          const oppScore = isTeam1 ? match.team2Score : match.team1Score;

          const teamRuns = teamScore?.runs || 0;
          const oppRuns = oppScore?.runs || 0;
          const teamBalls = teamScore?.balls || 0;

          totalRunsScored += teamRuns;
          totalRunsConceded += oppRuns;
          totalBallsFaced += teamBalls;

          if (teamRuns > oppRuns) {
            wins++;
          } else if (teamRuns === oppRuns) {
            draws++;
          }
        });

        const played = groupMatches.filter(
          (m) => m.team1Id === teamId || m.team2Id === teamId
        ).length;
        const points = wins * 2 + draws * 1;
        const nrr =
          totalBallsFaced > 0
            ? (totalRunsScored - totalRunsConceded) / totalBallsFaced
            : 0;

        return {
          team,
          points,
          nrr,
        };
      })
      .filter(Boolean);

    return standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.nrr - a.nrr;
    });
  };

  // Get qualified teams
  const groupATeams = bracketConfig.groupA.filter((id) => id);
  const groupBTeams = bracketConfig.groupB.filter((id) => id);
  const groupAStandings = calculateStandings(groupATeams);
  const groupBStandings = calculateStandings(groupBTeams);

  const groupATop1 = groupAStandings[0]?.team;
  const groupATop2 = groupAStandings[1]?.team;
  const groupBTop1 = groupBStandings[0]?.team;
  const groupBTop2 = groupBStandings[1]?.team;

  // Check if all group stage matches are completed
  const allGroupMatches = matches.filter(
    (m) =>
      m.matchType === "Tournament" &&
      [...groupATeams, ...groupBTeams].includes(m.team1Id) &&
      [...groupATeams, ...groupBTeams].includes(m.team2Id)
  );
  const completedGroupMatches = allGroupMatches.filter(
    (m) => m.status === "completed"
  );
  const allGroupMatchesCompleted =
    allGroupMatches.length > 0 &&
    allGroupMatches.length === completedGroupMatches.length;

  // Get semi-final matches
  const semiFinal1 = matches.find((m) => m.matchType?.includes("Semi-Final 1"));
  const semiFinal2 = matches.find((m) => m.matchType?.includes("Semi-Final 2"));
  const final = matches.find(
    (m) => m.matchType?.includes("Final") && !m.matchType?.includes("Semi")
  );

  // Determine semi-final winners
  const sf1Winner =
    semiFinal1?.status === "completed"
      ? semiFinal1.team1Score?.runs > semiFinal1.team2Score?.runs
        ? teams.find((t) => t.id === semiFinal1.team1Id)
        : teams.find((t) => t.id === semiFinal1.team2Id)
      : null;

  const sf2Winner =
    semiFinal2?.status === "completed"
      ? semiFinal2.team1Score?.runs > semiFinal2.team2Score?.runs
        ? teams.find((t) => t.id === semiFinal2.team1Id)
        : teams.find((t) => t.id === semiFinal2.team2Id)
      : null;

  // Removed admin edit functions - now view-only page
  // All tournament management moved to Admin Panel

  const autoAssignTeams_REMOVED = async () => {
    console.log("🏆 Start Tournament button clicked!");
    console.log("Teams available:", teams.length);
    console.log("Existing matches:", matches.length);

    if (teams.length < 8) {
      alert(
        `⚠️ Need at least 8 teams for tournament. Currently have ${teams.length} teams.`
      );
      return;
    }

    // Confirm before auto-assigning
    const confirmMessage =
      matches.length > 0
        ? `⚠️ WARNING: This will DELETE ALL ${matches.length} existing matches and start fresh!\n\n🏆 Start New Tournament?\n\n✅ Delete all existing matches\n✅ Assign first 8 teams to Groups A & B\n✅ Create 12 new group stage matches\n\nContinue?`
        : '🏆 Start Tournament?\n\nThis will:\n✅ Assign first 8 teams to Groups A & B\n✅ Create 12 group stage matches as "Upcoming"\n\nContinue?';

    console.log("Showing confirmation dialog...");
    if (!confirm(confirmMessage)) {
      console.log("User cancelled tournament start");
      return;
    }

    console.log("User confirmed - starting tournament...");

    // Take first 8 teams and assign them in order
    const firstEightTeams = teams.slice(0, 8);

    const newConfig = {
      groupA: [
        firstEightTeams[0]?.id || "",
        firstEightTeams[1]?.id || "",
        firstEightTeams[2]?.id || "",
        firstEightTeams[3]?.id || "",
      ],
      groupB: [
        firstEightTeams[4]?.id || "",
        firstEightTeams[5]?.id || "",
        firstEightTeams[6]?.id || "",
        firstEightTeams[7]?.id || "",
      ],
    };

    setBracketConfig(newConfig);
    // Auto-save the configuration
    localStorage.setItem("tournamentBracket", JSON.stringify(newConfig));

    // Create all group stage matches
    const token = localStorage.getItem("token");
    if (!token) {
      alert("⚠️ Please login as admin to create matches");
      return;
    }

    try {
      // Step 1: Delete all existing matches
      let deletedCount = 0;
      if (matches.length > 0) {
        console.log(`Deleting ${matches.length} existing matches...`);
        for (const match of matches) {
          try {
            await axios.delete(`/api/matches/${match.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            deletedCount++;
            console.log(`✓ Deleted match ${deletedCount}/${matches.length}`);
          } catch (error) {
            console.error(`❌ Error deleting match ${match.id}:`, error);
          }
        }
        console.log(`✅ Deleted ${deletedCount} matches`);
      }

      // Step 2: Define all 12 group stage matches (round-robin)
      const groupAMatches = [
        { team1: firstEightTeams[0], team2: firstEightTeams[1], matchNum: 1 }, // A1 vs A2
        { team1: firstEightTeams[2], team2: firstEightTeams[3], matchNum: 2 }, // A3 vs A4
        { team1: firstEightTeams[0], team2: firstEightTeams[2], matchNum: 3 }, // A1 vs A3
        { team1: firstEightTeams[1], team2: firstEightTeams[3], matchNum: 4 }, // A2 vs A4
        { team1: firstEightTeams[0], team2: firstEightTeams[3], matchNum: 5 }, // A1 vs A4
        { team1: firstEightTeams[1], team2: firstEightTeams[2], matchNum: 6 }, // A2 vs A3
      ];

      const groupBMatches = [
        { team1: firstEightTeams[4], team2: firstEightTeams[5], matchNum: 7 }, // B1 vs B2
        { team1: firstEightTeams[6], team2: firstEightTeams[7], matchNum: 8 }, // B3 vs B4
        { team1: firstEightTeams[4], team2: firstEightTeams[6], matchNum: 9 }, // B1 vs B3
        { team1: firstEightTeams[5], team2: firstEightTeams[7], matchNum: 10 }, // B2 vs B4
        { team1: firstEightTeams[4], team2: firstEightTeams[7], matchNum: 11 }, // B1 vs B4
        { team1: firstEightTeams[5], team2: firstEightTeams[6], matchNum: 12 }, // B2 vs B3
      ];

      const allMatches = [...groupAMatches, ...groupBMatches];

      // Create matches one by one
      console.log(`Creating ${allMatches.length} new tournament matches...`);
      let createdCount = 0;
      for (const match of allMatches) {
        try {
          await axios.post(
            "/api/matches",
            {
              team1Id: match.team1.id,
              team2Id: match.team2.id,
              team1Name: match.team1.name,
              team2Name: match.team2.name,
              matchType: "Tournament",
              totalBallsPerTeam: 30,
              date: Date.now(),
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          createdCount++;
          console.log(
            `✓ Created match ${createdCount}/${allMatches.length}: ${match.team1.name} vs ${match.team2.name}`
          );
        } catch (error) {
          console.error(`❌ Error creating match ${match.matchNum}:`, error);
        }
      }

      console.log(`✅ Created ${createdCount} matches`);
      console.log("Refreshing data...");

      // Refresh matches list
      await fetchData();

      const successMessage =
        deletedCount > 0
          ? `🏆 Tournament Started Successfully!\n\n` +
            `🗑️ ${deletedCount} old matches deleted\n\n` +
            `✅ Teams Assigned:\n` +
            `Group A: ${firstEightTeams
              .slice(0, 4)
              .map((t) => t.name)
              .join(", ")}\n\n` +
            `Group B: ${firstEightTeams
              .slice(4, 8)
              .map((t) => t.name)
              .join(", ")}\n\n` +
            `📅 ${createdCount} NEW Matches Created\n\n` +
            `⚡ To start scoring:\n` +
            `1. Go to Admin Panel → Live Scores tab\n` +
            `2. Select a match from the dropdown\n` +
            `3. Start scoring! 🏏`
          : `🏆 Tournament Started Successfully!\n\n` +
            `✅ Teams Assigned:\n` +
            `Group A: ${firstEightTeams
              .slice(0, 4)
              .map((t) => t.name)
              .join(", ")}\n\n` +
            `Group B: ${firstEightTeams
              .slice(4, 8)
              .map((t) => t.name)
              .join(", ")}\n\n` +
            `📅 ${createdCount} Matches Created\n\n` +
            `⚡ To start scoring:\n` +
            `1. Go to Admin Panel → Live Scores tab\n` +
            `2. Select a match from the dropdown\n` +
            `3. Start scoring! 🏏`;

      console.log("🎉 Tournament started successfully!");
      alert(successMessage);
    } catch (error) {
      console.error("❌ FATAL ERROR in autoAssignTeams:", error);
      console.error("Error details:", error.response?.data || error.message);
      alert(
        `⚠️ Error starting tournament: ${
          error.response?.data?.error || error.message
        }\n\nCheck console for details.`
      );
    }
  };

  // Get teams assigned to groups
  const groupA = bracketConfig.groupA
    .map((id) => teams.find((t) => t.id === id))
    .filter(Boolean);
  const groupB = bracketConfig.groupB
    .map((id) => teams.find((t) => t.id === id))
    .filter(Boolean);

  // Get available teams (not assigned to any position)
  const assignedTeamIds = [
    ...bracketConfig.groupA,
    ...bracketConfig.groupB,
  ].filter((id) => id);
  const availableTeams = teams.filter((t) => !assignedTeamIds.includes(t.id));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getTeamLogo = (teamId) => {
    const team = teams.find((t) => t.id === teamId);
    return team?.logo;
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

  // Group matches by status
  const upcomingMatches = matches.filter((m) => m.status === "upcoming");
  const liveMatches = matches.filter((m) => m.status === "live");
  const completedMatches = matches.filter((m) => m.status === "completed");
  const allMatches = [...upcomingMatches, ...liveMatches, ...completedMatches];

  const MatchFixture = ({ match }) => (
    <div className="bg-white border-2 border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-3">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            match.status === "live"
              ? "bg-red-500 text-white"
              : match.status === "upcoming"
              ? "bg-blue-500 text-white"
              : "bg-gray-500 text-white"
          }`}
        >
          {match.status}
        </span>
        <span className="text-xs text-gray-500">
          {new Date(match.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      <div className="space-y-2">
        {/* Team 1 */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <div className="flex items-center gap-2">
            {match.team1Logo ? (
              <img
                src={match.team1Logo}
                alt={match.team1Name}
                className="w-8 h-8 rounded-full object-cover border border-gray-300"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                {getTeamShortName(match.team1Name)}
              </div>
            )}
            <span className="font-semibold text-sm">{match.team1Name}</span>
          </div>
          {match.status !== "upcoming" && (
            <div className="text-right">
              <div className="font-bold text-lg">
                {match.team1Score?.runs || 0}/{match.team1Score?.wickets || 0}
              </div>
              <div className="text-xs text-gray-500">
                ({match.team1Score?.balls || 0}/{match.totalBallsPerTeam || 30})
              </div>
            </div>
          )}
        </div>

        <div className="text-center text-xs text-gray-400 font-bold">VS</div>

        {/* Team 2 */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
          <div className="flex items-center gap-2">
            {match.team2Logo ? (
              <img
                src={match.team2Logo}
                alt={match.team2Name}
                className="w-8 h-8 rounded-full object-cover border border-gray-300"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-xs">
                {getTeamShortName(match.team2Name)}
              </div>
            )}
            <span className="font-semibold text-sm">{match.team2Name}</span>
          </div>
          {match.status !== "upcoming" && (
            <div className="text-right">
              <div className="font-bold text-lg">
                {match.team2Score?.runs || 0}/{match.team2Score?.wickets || 0}
              </div>
              <div className="text-xs text-gray-500">
                ({match.team2Score?.balls || 0}/{match.totalBallsPerTeam || 30})
              </div>
            </div>
          )}
        </div>
      </div>

      {match.result && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-center">
          <p className="text-xs font-semibold text-green-700">
            🏆 {match.result}
          </p>
        </div>
      )}
    </div>
  );

  // Helper function to render match card with result
  const MatchScheduleCard = ({
    matchNumber,
    groupLabel,
    team1,
    team2,
    isGroupA,
  }) => {
    const match = matches.find(
      (m) =>
        m.team1Id === team1?.id &&
        m.team2Id === team2?.id &&
        m.matchType === "Tournament"
    );

    const textClass = isGroupA ? "text-green-700" : "text-blue-700";

    return (
      <div
        className={`p-3 rounded-lg border-2 ${
          match?.status === "completed"
            ? isGroupA
              ? "bg-green-50 border-green-400"
              : "bg-blue-50 border-blue-400"
            : isGroupA
            ? "bg-white border-green-300"
            : "bg-white border-blue-300"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className={`font-bold ${textClass} text-sm`}>{groupLabel}</span>
          <div className="text-right flex-1">
            <span className="font-semibold text-sm block">
              {team1?.name} vs {team2?.name}
            </span>
            {match?.status === "completed" && match.result && (
              <p className={`text-xs ${textClass} font-semibold mt-1`}>
                ✅ {match.result}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Team card component for bracket
  const TeamCard = ({
    team,
    label,
    subLabel,
    isEditing,
    onTeamChange,
    currentTeamId,
  }) => {
    if (isEditing) {
      return (
        <div className="p-2 bg-blue-50 border-2 border-blue-400 rounded">
          <select
            value={currentTeamId || ""}
            onChange={(e) => onTeamChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{label} - Select Team</option>
            {currentTeamId && team && (
              <option value={currentTeamId}>{team.name} (Current)</option>
            )}
            {availableTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className="p-3 bg-white border-2 border-gray-300 rounded hover:border-blue-400 transition-colors">
        {team || subLabel ? (
          <div className="flex items-center gap-2">
            {team && (
              <>
                {team.logo ? (
                  <img
                    src={team.logo}
                    alt={team.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {team.shortName || team.name.charAt(0)}
                  </div>
                )}
              </>
            )}
            <div className="flex-1">
              <div className="font-semibold">{label}</div>
              {subLabel && (
                <div className="text-xs text-gray-500 mt-0.5">{subLabel}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-gray-400 text-center py-1">{label}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">📅 Tournament Draw</h1>
        <p className="text-lg opacity-90">
          8 Teams • 2 Groups • Knockout Stage
        </p>
      </div>

      {/* View Toggle and Admin Controls */}
      {/* Tournament Bracket - View Only */}
      <div className="space-y-8">
        {/* Tournament Info - View Only */}
        {groupA.length === 0 && groupB.length === 0 && (
          <div className="card bg-gradient-to-br from-purple-50 to-blue-50 border-purple-300">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🏆</span>
              <div>
                <h3 className="font-bold text-purple-800 mb-2 text-lg">
                  Tournament Not Started
                </h3>
                <p className="text-purple-700 text-sm mb-3">
                  No tournament has been created yet. Go to{" "}
                  <strong>Admin Panel → Matches</strong> tab to start a
                  tournament.
                </p>
                <p className="text-purple-600 text-xs">
                  💡 The tournament will automatically create 12 group stage
                  matches with 8 teams.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Groups Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Group A */}
          <div className="card bg-green-50 border-green-300">
            <div className="bg-green-600 text-white px-4 py-3 -mx-6 -mt-6 mb-4 rounded-t-lg">
              <h2 className="text-2xl font-bold text-center">Group A</h2>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-green-800">Teams:</h3>
              {[0, 1, 2, 3].map((index) => {
                const teamId = bracketConfig.groupA[index];
                const team = teams.find((t) => t.id === teamId);
                return (
                  <TeamCard
                    key={`a${index}`}
                    team={team}
                    label={`Team A${index + 1}`}
                    isEditing={false}
                    currentTeamId={teamId}
                    onTeamChange={(newTeamId) => {
                      const newGroupA = [...bracketConfig.groupA];
                      newGroupA[index] = newTeamId;
                      setBracketConfig({ ...bracketConfig, groupA: newGroupA });
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Group B */}
          <div className="card bg-blue-50 border-blue-300">
            <div className="bg-blue-600 text-white px-4 py-3 -mx-6 -mt-6 mb-4 rounded-t-lg">
              <h2 className="text-2xl font-bold text-center">Group B</h2>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-blue-800">Teams:</h3>
              {[0, 1, 2, 3].map((index) => {
                const teamId = bracketConfig.groupB[index];
                const team = teams.find((t) => t.id === teamId);
                return (
                  <TeamCard
                    key={`b${index}`}
                    team={team}
                    label={`Team B${index + 1}`}
                    isEditing={false}
                    currentTeamId={teamId}
                    onTeamChange={(newTeamId) => {
                      const newGroupB = [...bracketConfig.groupB];
                      newGroupB[index] = newTeamId;
                      setBracketConfig({ ...bracketConfig, groupB: newGroupB });
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Complete Match Schedule */}
        {groupA.length >= 4 && groupB.length >= 4 && (
          <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 -mx-6 -mt-6 mb-4 rounded-t-lg">
              <h2 className="text-2xl font-bold text-center">
                📅 Complete Tournament Schedule
              </h2>
            </div>

            <div className="space-y-3">
              {/* Group Stage Matches - Alternating Pattern */}
              <div className="mb-4">
                <h3 className="font-bold text-purple-800 mb-3 text-lg">
                  Group Stage (12 Matches)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <MatchScheduleCard
                    matchNumber={1}
                    groupLabel="Group A - Match 1"
                    team1={groupA[0]}
                    team2={groupA[1]}
                    isGroupA={true}
                  />
                  <MatchScheduleCard
                    matchNumber={1}
                    groupLabel="Group B - Match 1"
                    team1={groupB[0]}
                    team2={groupB[1]}
                    isGroupA={false}
                  />

                  <MatchScheduleCard
                    matchNumber={2}
                    groupLabel="Group A - Match 2"
                    team1={groupA[2]}
                    team2={groupA[3]}
                    isGroupA={true}
                  />
                  <MatchScheduleCard
                    matchNumber={2}
                    groupLabel="Group B - Match 2"
                    team1={groupB[2]}
                    team2={groupB[3]}
                    isGroupA={false}
                  />

                  <MatchScheduleCard
                    matchNumber={3}
                    groupLabel="Group A - Match 3"
                    team1={groupA[0]}
                    team2={groupA[2]}
                    isGroupA={true}
                  />
                  <MatchScheduleCard
                    matchNumber={3}
                    groupLabel="Group B - Match 3"
                    team1={groupB[0]}
                    team2={groupB[2]}
                    isGroupA={false}
                  />

                  <MatchScheduleCard
                    matchNumber={4}
                    groupLabel="Group A - Match 4"
                    team1={groupA[1]}
                    team2={groupA[3]}
                    isGroupA={true}
                  />
                  <MatchScheduleCard
                    matchNumber={4}
                    groupLabel="Group B - Match 4"
                    team1={groupB[1]}
                    team2={groupB[3]}
                    isGroupA={false}
                  />

                  <MatchScheduleCard
                    matchNumber={5}
                    groupLabel="Group A - Match 5"
                    team1={groupA[0]}
                    team2={groupA[3]}
                    isGroupA={true}
                  />
                  <MatchScheduleCard
                    matchNumber={5}
                    groupLabel="Group B - Match 5"
                    team1={groupB[0]}
                    team2={groupB[3]}
                    isGroupA={false}
                  />

                  <MatchScheduleCard
                    matchNumber={6}
                    groupLabel="Group A - Match 6"
                    team1={groupA[1]}
                    team2={groupA[2]}
                    isGroupA={true}
                  />
                  <MatchScheduleCard
                    matchNumber={6}
                    groupLabel="Group B - Match 6"
                    team1={groupB[1]}
                    team2={groupB[2]}
                    isGroupA={false}
                  />
                </div>
              </div>

              {/* Knockout Matches */}
              <div>
                <h3 className="font-bold text-purple-800 mb-3 text-lg">
                  Knockout Stage (3 Matches)
                </h3>
                <div className="space-y-3">
                  {/* Semi-Final 1 */}
                  {(() => {
                    const match = semiFinal1;
                    const teams = "1st Group A vs 2nd Group B";
                    return (
                      <div
                        className={`p-4 rounded-lg border-2 ${
                          match?.status === "completed"
                            ? "bg-orange-50 border-orange-400"
                            : "bg-gradient-to-r from-orange-100 to-yellow-100 border-orange-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-bold text-orange-700">
                            Semi-Final 1
                          </span>
                          <div className="text-right flex-1">
                            <span className="font-semibold text-sm block">
                              {teams}
                            </span>
                            {match?.status === "completed" && match.result && (
                              <p className="text-xs text-orange-700 font-semibold mt-1">
                                ✅ {match.result}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Semi-Final 2 */}
                  {(() => {
                    const match = semiFinal2;
                    const teams = "1st Group B vs 2nd Group A";
                    return (
                      <div
                        className={`p-4 rounded-lg border-2 ${
                          match?.status === "completed"
                            ? "bg-orange-50 border-orange-400"
                            : "bg-gradient-to-r from-orange-100 to-yellow-100 border-orange-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-bold text-orange-700">
                            Semi-Final 2
                          </span>
                          <div className="text-right flex-1">
                            <span className="font-semibold text-sm block">
                              {teams}
                            </span>
                            {match?.status === "completed" && match.result && (
                              <p className="text-xs text-orange-700 font-semibold mt-1">
                                ✅ {match.result}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Final */}
                  {(() => {
                    const match = final;
                    const teams = "Winner SF1 vs Winner SF2";
                    return (
                      <div
                        className={`p-4 rounded-lg ${
                          match?.status === "completed"
                            ? "border-4 border-yellow-500 bg-yellow-50"
                            : "bg-gradient-to-r from-yellow-100 to-yellow-200 border-4 border-yellow-400"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-bold text-yellow-700 text-lg">
                            🏆 FINAL
                          </span>
                          <div className="text-right flex-1">
                            <span className="font-semibold block">{teams}</span>
                            {match?.status === "completed" && match.result && (
                              <p className="text-sm text-yellow-800 font-bold mt-1">
                                🏆 {match.result}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Tournament Summary */}
              <div className="mt-4 p-4 bg-purple-100 rounded-lg border border-purple-300">
                <h4 className="font-bold text-purple-800 mb-2">
                  📊 Tournament Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-700">8</div>
                    <div className="text-purple-600">Teams</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-700">12</div>
                    <div className="text-green-600">Group Matches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-700">3</div>
                    <div className="text-orange-600">Knockout Matches</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-700">15</div>
                    <div className="text-yellow-600">Total Matches</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Knockout Stage - Only show when all group matches are completed */}
        {allGroupMatchesCompleted && (
          <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300">
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-4 py-3 -mx-6 -mt-6 mb-6 rounded-t-lg">
              <h2 className="text-2xl font-bold text-center">
                🏆 Knockout Stage
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Semifinals */}
              <div>
                <h3 className="text-xl font-bold text-orange-800 mb-4 text-center">
                  Semifinals
                </h3>

                <div className="space-y-4">
                  <div className="bg-white border-2 border-orange-300 rounded-lg p-4">
                    <div className="text-center font-bold text-orange-600 mb-3">
                      Semi-Final 1
                    </div>
                    <div className="space-y-2">
                      <TeamCard
                        team={null}
                        label="1st Group A"
                        subLabel={null}
                      />
                      <div className="text-center text-sm font-bold text-gray-400">
                        VS
                      </div>
                      <TeamCard
                        team={null}
                        label="2nd Group B"
                        subLabel={null}
                      />
                    </div>
                  </div>

                  <div className="bg-white border-2 border-orange-300 rounded-lg p-4">
                    <div className="text-center font-bold text-orange-600 mb-3">
                      Semi-Final 2
                    </div>
                    <div className="space-y-2">
                      <TeamCard
                        team={null}
                        label="1st Group B"
                        subLabel={null}
                      />
                      <div className="text-center text-sm font-bold text-gray-400">
                        VS
                      </div>
                      <TeamCard
                        team={null}
                        label="2nd Group A"
                        subLabel={null}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Final */}
              <div>
                <h3 className="text-xl font-bold text-orange-800 mb-4 text-center">
                  Final
                </h3>

                <div className="bg-white border-4 border-yellow-400 rounded-lg p-6 shadow-lg">
                  <div className="text-center font-bold text-yellow-600 text-lg mb-4">
                    🏆 Championship Final
                  </div>
                  <div className="space-y-3">
                    <TeamCard team={null} label="Winner SF1" subLabel={null} />
                    <div className="text-center text-lg font-bold text-gray-400">
                      VS
                    </div>
                    <TeamCard team={null} label="Winner SF2" subLabel={null} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message when group stage is not complete */}
        {!allGroupMatchesCompleted && allGroupMatches.length > 0 && (
          <div className="card bg-blue-50 border-blue-300">
            <div className="text-center py-8">
              <div className="text-4xl mb-4">⏳</div>
              <h3 className="text-xl font-bold text-blue-800 mb-2">
                Group Stage In Progress
              </h3>
              <p className="text-blue-600">
                Complete all group stage matches ({completedGroupMatches.length}
                /{allGroupMatches.length}) to unlock the Knockout Stage
              </p>
              <div className="mt-4">
                <div className="bg-blue-200 h-4 rounded-full overflow-hidden max-w-md mx-auto">
                  <div
                    className="bg-blue-600 h-full transition-all duration-500"
                    style={{
                      width: `${
                        (completedGroupMatches.length /
                          allGroupMatches.length) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
                <p className="text-sm text-blue-500 mt-2">
                  {Math.round(
                    (completedGroupMatches.length / allGroupMatches.length) *
                      100
                  )}
                  % Complete
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Fixtures;
