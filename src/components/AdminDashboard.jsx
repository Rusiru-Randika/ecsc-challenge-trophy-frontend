import { useState, useEffect } from "react";
import axios from "axios";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("matches");
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoSemiFinalsChecked, setAutoSemiFinalsChecked] = useState(false);
  const [autoFinalChecked, setAutoFinalChecked] = useState(false);

  // Form states
  const [teamForm, setTeamForm] = useState({
    name: "",
    shortName: "",
    logo: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [matchForm, setMatchForm] = useState({
    team1Id: "",
    team2Id: "",
    team1Name: "",
    team2Name: "",
    matchType: "T20",
    totalBallsPerTeam: 30,
    date: Date.now(),
  });
  const [scoreUpdateForm, setScoreUpdateForm] = useState({
    matchId: "",
    team1Score: { runs: 0, wickets: 0, balls: 0 },
    team2Score: { runs: 0, wickets: 0, balls: 0 },
    status: "live",
    result: "",
    totalBallsPerTeam: 30,
  });

  // Undo functionality - track previous state
  const [undoStack, setUndoStack] = useState({
    team1: [],
    team2: [],
  });

  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Check if group stage is complete and create semi-finals automatically
  useEffect(() => {
    if (matches.length > 0 && teams.length > 0) {
      if (!autoSemiFinalsChecked) {
        checkAndCreateSemiFinals();
      }
      if (!autoFinalChecked) {
        checkAndCreateFinal();
      }
    }
  }, [matches, teams]);

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "teams") {
        const response = await axios.get("/api/teams");
        setTeams(response.data.teams || []);
      } else if (activeTab === "matches") {
        const [teamsRes, matchesRes] = await Promise.all([
          axios.get("/api/teams"),
          axios.get("/api/matches"),
        ]);
        setTeams(teamsRes.data.teams || []);
        setMatches(matchesRes.data.matches || []);
      } else if (activeTab === "scores") {
        // Fetch both matches and teams for scores tab
        const [matchesRes, teamsRes] = await Promise.all([
          axios.get("/api/matches"),
          axios.get("/api/teams"),
        ]);
        const fetchedMatches = matchesRes.data.matches || [];
        setMatches(fetchedMatches);
        setTeams(teamsRes.data.teams || []);

        // Auto-select live match if exists and no match is currently selected
        const liveMatch = fetchedMatches.find((m) => m.status === "live");
        if (liveMatch && !scoreUpdateForm.matchId) {
          // Clear undo stack when auto-selecting
          setUndoStack({ team1: [], team2: [] });

          setScoreUpdateForm({
            matchId: liveMatch.id,
            team1Score: liveMatch.team1Score || {
              runs: 0,
              wickets: 0,
              balls: 0,
            },
            team2Score: liveMatch.team2Score || {
              runs: 0,
              wickets: 0,
              balls: 0,
            },
            status: liveMatch.status || "live",
            result: liveMatch.result || "",
            totalBallsPerTeam: liveMatch.totalBallsPerTeam || 30,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Error fetching data");
    } finally {
      setLoading(false);
    }
  };

  // Image upload handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }

      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImageToFreeImage = async () => {
    if (!imageFile) {
      alert("Please select an image first");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("name", `team-logo-${Date.now()}`);

      const response = await axios.post("/api/teams/upload-image", formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        // Set the logo URL in the form
        setTeamForm({ ...teamForm, logo: response.data.url });
        alert("Image uploaded successfully!");

        // Clear file input
        setImageFile(null);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(
        "Error uploading image: " +
          (error.response?.data?.error || error.message)
      );
    } finally {
      setUploadingImage(false);
    }
  };

  // Team CRUD
  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`/api/teams/${editingId}`, teamForm, getAuthHeader());
        alert("Team updated successfully");
      } else {
        await axios.post("/api/teams", teamForm, getAuthHeader());
        alert("Team created successfully");
      }
      setTeamForm({ name: "", shortName: "", logo: "" });
      setImageFile(null);
      setImagePreview("");
      setEditingId(null);
      fetchData();
    } catch (error) {
      alert("Error: " + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!confirm("Are you sure you want to delete this team?")) return;
    try {
      await axios.delete(`/api/teams/${id}`, getAuthHeader());
      alert("Team deleted successfully");
      fetchData();
    } catch (error) {
      alert("Error: " + (error.response?.data?.error || error.message));
    }
  };

  // Match CRUD
  const handleMatchSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(
          `/api/matches/${editingId}`,
          matchForm,
          getAuthHeader()
        );
        alert("Match updated successfully");
      } else {
        const response = await axios.post(
          "/api/matches",
          matchForm,
          getAuthHeader()
        );
        alert("Match created successfully");

        // Switch to scores tab and pre-select the new match
        setActiveTab("scores");

        // Wait a moment for the match to be added to the list
        setTimeout(async () => {
          await fetchData();
          if (response.data.matchId) {
            // Pre-select the newly created match in score update form
            const newMatchId = response.data.matchId;
            const matchesResponse = await axios.get("/api/matches");
            const newMatch = matchesResponse.data.matches.find(
              (m) => m.id === newMatchId
            );

            if (newMatch) {
              setScoreUpdateForm({
                matchId: newMatchId,
                team1Score: newMatch.team1Score || {
                  runs: 0,
                  wickets: 0,
                  balls: 0,
                },
                team2Score: newMatch.team2Score || {
                  runs: 0,
                  wickets: 0,
                  balls: 0,
                },
                status: newMatch.status || "live",
                result: newMatch.result || "",
                totalBallsPerTeam: newMatch.totalBallsPerTeam || 30,
              });
            }
          }
        }, 500);
      }
      setMatchForm({
        team1Id: "",
        team2Id: "",
        team1Name: "",
        team2Name: "",
        matchType: "T20",
        totalBallsPerTeam: 30,
        date: Date.now(),
      });
      setEditingId(null);
      fetchData();
    } catch (error) {
      alert("Error: " + (error.response?.data?.error || error.message));
    }
  };

  // Auto-generate match result based on scores
  const generateMatchResult = (
    team1Score,
    team2Score,
    team1Name,
    team2Name
  ) => {
    const team1Runs = team1Score.runs;
    const team2Runs = team2Score.runs;
    const team1Wickets = team1Score.wickets;
    const team2Wickets = team2Score.wickets;

    // If both teams haven't batted yet
    if (team1Runs === 0 && team2Runs === 0) {
      return "";
    }

    // If team2 hasn't batted yet
    if (team2Runs === 0 && team1Runs > 0) {
      return `${team1Name} batting...`;
    }

    // Compare scores
    if (team1Runs > team2Runs) {
      const runDifference = team1Runs - team2Runs;
      return `${team1Name} won by ${runDifference} run${
        runDifference !== 1 ? "s" : ""
      }`;
    } else if (team2Runs > team1Runs) {
      const wicketsRemaining = 10 - team2Wickets;
      return `${team2Name} won by ${wicketsRemaining} wicket${
        wicketsRemaining !== 1 ? "s" : ""
      }`;
    } else if (team1Runs === team2Runs && team1Runs > 0) {
      return "Match tied";
    }

    return "";
  };

  const handleScoreUpdate = async (e) => {
    e.preventDefault();

    // Check if selected match is live
    const selectedMatch = matches.find((m) => m.id === scoreUpdateForm.matchId);
    if (
      selectedMatch &&
      selectedMatch.status !== "live" &&
      scoreUpdateForm.status !== "live"
    ) {
      alert(
        "⚠️ Cannot update scores for completed matches! Only the live match can be updated."
      );
      return;
    }

    try {
      await axios.patch(
        `/api/matches/${scoreUpdateForm.matchId}/score`,
        {
          team1Score: scoreUpdateForm.team1Score,
          team2Score: scoreUpdateForm.team2Score,
          status: scoreUpdateForm.status,
          result: scoreUpdateForm.result,
        },
        getAuthHeader()
      );
      alert("Score updated successfully");
      fetchData();

      // If match was marked as completed, clear the form
      if (scoreUpdateForm.status === "completed") {
        setScoreUpdateForm({
          matchId: "",
          team1Score: { runs: 0, wickets: 0, balls: 0 },
          team2Score: { runs: 0, wickets: 0, balls: 0 },
          status: "live",
          result: "",
        });
      }
    } catch (error) {
      alert("Error: " + (error.response?.data?.error || error.message));
    }
  };

  // Auto-save score when quick buttons are clicked
  const autoSaveScore = async (updatedScoreForm) => {
    if (!updatedScoreForm.matchId) return;

    // Auto-generate result based on current scores
    const selectedMatch = matches.find(
      (m) => m.id === updatedScoreForm.matchId
    );
    if (selectedMatch) {
      const autoResult = generateMatchResult(
        updatedScoreForm.team1Score,
        updatedScoreForm.team2Score,
        selectedMatch.team1Name,
        selectedMatch.team2Name
      );
      updatedScoreForm.result = autoResult;

      // Update the form state with auto-generated result
      setScoreUpdateForm((prev) => ({
        ...prev,
        result: autoResult,
      }));
    }

    try {
      await axios.patch(
        `/api/matches/${updatedScoreForm.matchId}/score`,
        {
          team1Score: updatedScoreForm.team1Score,
          team2Score: updatedScoreForm.team2Score,
          status: updatedScoreForm.status,
          result: updatedScoreForm.result,
        },
        getAuthHeader()
      );
      // Silent update - no fetchData() to prevent re-render
      // The local state is already updated via setScoreUpdateForm
      console.log("Score auto-saved successfully");
    } catch (error) {
      console.error("Auto-save error:", error);
    }
  };

  // Function to check if group stage is complete and create semi-finals
  const checkAndCreateSemiFinals = async () => {
    try {
      // Get bracket configuration
      const saved = localStorage.getItem("tournamentBracket");
      if (!saved) return;

      const bracketConfig = JSON.parse(saved);
      const groupATeamIds = bracketConfig.groupA.filter((id) => id);
      const groupBTeamIds = bracketConfig.groupB.filter((id) => id);

      if (groupATeamIds.length !== 4 || groupBTeamIds.length !== 4) return;

      // Check if there are already semi-final or final matches
      const knockoutMatches = matches.filter(
        (m) =>
          m.matchType &&
          (m.matchType.toLowerCase().includes("semi") ||
            m.matchType.toLowerCase().includes("final"))
      );

      if (knockoutMatches.length > 0) {
        setAutoSemiFinalsChecked(true);
        return; // Semi-finals already created
      }

      // Check if all group stage matches are completed
      const groupMatches = matches.filter(
        (m) =>
          m.matchType === "Tournament" &&
          (groupATeamIds.includes(m.team1Id) ||
            groupATeamIds.includes(m.team2Id) ||
            groupBTeamIds.includes(m.team1Id) ||
            groupBTeamIds.includes(m.team2Id))
      );

      const completedGroupMatches = groupMatches.filter(
        (m) => m.status === "completed"
      );

      // Need at least 12 group matches completed (6 per group)
      if (completedGroupMatches.length < 12) {
        return;
      }

      console.log(
        "🏆 All group stage matches completed! Creating semi-finals..."
      );

      // Calculate standings for both groups
      const calculateStandings = (teamIds) => {
        const standings = teamIds
          .map((teamId) => {
            const team = teams.find((t) => t.id === teamId);
            if (!team) return null;

            const teamMatches = completedGroupMatches.filter(
              (m) => m.team1Id === teamId || m.team2Id === teamId
            );

            let wins = 0;
            let totalRuns = 0;
            let totalRunsConceded = 0;
            let totalBalls = 0;

            teamMatches.forEach((match) => {
              const isTeam1 = match.team1Id === teamId;
              const teamScore = isTeam1 ? match.team1Score : match.team2Score;
              const oppScore = isTeam1 ? match.team2Score : match.team1Score;

              totalRuns += teamScore?.runs || 0;
              totalRunsConceded += oppScore?.runs || 0;
              totalBalls += teamScore?.balls || 0;

              if ((teamScore?.runs || 0) > (oppScore?.runs || 0)) {
                wins++;
              }
            });

            const points = wins * 2;
            const netRunRate =
              totalBalls > 0 ? (totalRuns - totalRunsConceded) / totalBalls : 0;

            return { team, points, netRunRate };
          })
          .filter(Boolean);

        // Sort by points, then by NRR
        return standings.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return b.netRunRate - a.netRunRate;
        });
      };

      const groupAStandings = calculateStandings(groupATeamIds);
      const groupBStandings = calculateStandings(groupBTeamIds);

      if (groupAStandings.length < 2 || groupBStandings.length < 2) return;

      const groupA1st = groupAStandings[0].team;
      const groupA2nd = groupAStandings[1].team;
      const groupB1st = groupBStandings[0].team;
      const groupB2nd = groupBStandings[1].team;

      console.log("Group A Top 2:", groupA1st.name, groupA2nd.name);
      console.log("Group B Top 2:", groupB1st.name, groupB2nd.name);

      // Create Semi-Final 1: 1st Group A vs 2nd Group B
      await axios.post(
        "/api/matches",
        {
          team1Id: groupA1st.id,
          team2Id: groupB2nd.id,
          team1Name: groupA1st.name,
          team2Name: groupB2nd.name,
          matchType: "Semi-Final 1",
          totalBallsPerTeam: 30,
          date: Date.now(),
        },
        getAuthHeader()
      );

      // Create Semi-Final 2: 1st Group B vs 2nd Group A
      await axios.post(
        "/api/matches",
        {
          team1Id: groupB1st.id,
          team2Id: groupA2nd.id,
          team1Name: groupB1st.name,
          team2Name: groupA2nd.name,
          matchType: "Semi-Final 2",
          totalBallsPerTeam: 30,
          date: Date.now(),
        },
        getAuthHeader()
      );

      console.log("✅ Semi-finals created successfully!");

      setAutoSemiFinalsChecked(true);
      await fetchData();

      alert(
        `🏆 Group Stage Complete!\n\n📊 Semi-Finals Created:\n\nSF1: ${groupA1st.name} vs ${groupB2nd.name}\nSF2: ${groupB1st.name} vs ${groupA2nd.name}\n\n✅ Go to Matches tab to start scoring!`
      );
    } catch (error) {
      console.error("Error creating semi-finals:", error);
    }
  };

  // Function to check if semi-finals are complete and create final
  const checkAndCreateFinal = async () => {
    try {
      // Check if final already exists
      const finalMatch = matches.find(
        (m) =>
          m.matchType &&
          m.matchType.toLowerCase().includes("final") &&
          !m.matchType.toLowerCase().includes("semi")
      );

      if (finalMatch) {
        setAutoFinalChecked(true);
        return;
      }

      // Get both semi-finals
      const semiFinal1 = matches.find((m) => m.matchType === "Semi-Final 1");
      const semiFinal2 = matches.find((m) => m.matchType === "Semi-Final 2");

      if (!semiFinal1 || !semiFinal2) return;

      // Check if both semi-finals are completed
      if (
        semiFinal1.status !== "completed" ||
        semiFinal2.status !== "completed"
      ) {
        return;
      }

      console.log("🏆 Semi-finals completed! Creating final...");

      // Determine winners
      const sf1Winner =
        (semiFinal1.team1Score?.runs || 0) > (semiFinal1.team2Score?.runs || 0)
          ? { id: semiFinal1.team1Id, name: semiFinal1.team1Name }
          : { id: semiFinal1.team2Id, name: semiFinal1.team2Name };

      const sf2Winner =
        (semiFinal2.team1Score?.runs || 0) > (semiFinal2.team2Score?.runs || 0)
          ? { id: semiFinal2.team1Id, name: semiFinal2.team1Name }
          : { id: semiFinal2.team2Id, name: semiFinal2.team2Name };

      console.log("SF1 Winner:", sf1Winner.name);
      console.log("SF2 Winner:", sf2Winner.name);

      // Create Final
      await axios.post(
        "/api/matches",
        {
          team1Id: sf1Winner.id,
          team2Id: sf2Winner.id,
          team1Name: sf1Winner.name,
          team2Name: sf2Winner.name,
          matchType: "Final",
          totalBallsPerTeam: 30,
          date: Date.now(),
        },
        getAuthHeader()
      );

      console.log("✅ Final created successfully!");

      setAutoFinalChecked(true);
      await fetchData();

      alert(
        `🏆 Semi-Finals Complete!\n\n🎯 Final Match Created:\n\n${sf1Winner.name} vs ${sf2Winner.name}\n\n✅ Go to Matches tab to start the championship final!`
      );
    } catch (error) {
      console.error("Error creating final:", error);
    }
  };

  const handleDeleteMatch = async (id) => {
    if (!confirm("Are you sure you want to delete this match?")) return;
    try {
      await axios.delete(`/api/matches/${id}`, getAuthHeader());
      alert("Match deleted successfully");
      fetchData();
    } catch (error) {
      alert("Error: " + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-4 border-b">
        {["matches", "teams", "scores"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-4 font-semibold capitalize transition-colors ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Removed Tournament Tab - functionality moved to Matches tab */}
      {false && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Tournament Status Card */}
          <div className="card bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300">
            <div className="flex items-start gap-4">
              <span className="text-5xl">🏆</span>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-purple-800 mb-2">
                  Create Tournament
                </h2>
                <p className="text-purple-700 mb-4">
                  Set up your cricket tournament with 8 teams and automatically
                  generate 12 group stage matches.
                </p>

                {/* Status Info */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                    <div className="text-3xl font-bold text-purple-600">
                      {teams.length}
                    </div>
                    <div className="text-sm text-gray-600">Teams Available</div>
                    {teams.length < 8 && (
                      <div className="text-xs text-red-600 mt-1">
                        Need {8 - teams.length} more teams
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                    <div className="text-3xl font-bold text-purple-600">
                      {matches.length}
                    </div>
                    <div className="text-sm text-gray-600">
                      Matches in Database
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                {teams.length < 8 ? (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                    <h3 className="font-bold text-yellow-800 mb-2">
                      ⚠️ Not Enough Teams
                    </h3>
                    <p className="text-yellow-700 text-sm mb-3">
                      You need at least 8 teams to start a tournament. Currently
                      have {teams.length} teams.
                    </p>
                    <p className="text-yellow-700 text-sm font-semibold">
                      👉 Go to the "Teams" tab above to add more teams.
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-4">
                    <h3 className="font-bold text-green-800 mb-2">
                      ✅ Ready to Start!
                    </h3>
                    <p className="text-green-700 text-sm">
                      You have {teams.length} teams. Click the button below to
                      start your tournament.
                    </p>
                  </div>
                )}

                {/* Start Tournament Button */}
                <button
                  onClick={async () => {
                    if (teams.length < 8) {
                      alert(
                        `⚠️ Need at least 8 teams for tournament. Currently have ${teams.length} teams.\n\nGo to Teams tab to add more teams.`
                      );
                      return;
                    }

                    const confirmMessage =
                      matches.length > 0
                        ? `⚠️ WARNING: This will DELETE ALL ${matches.length} existing matches and start fresh!\n\n🏆 Start New Tournament?\n\n✅ Delete all existing matches\n✅ Use first 8 teams\n✅ Create 12 group stage matches\n\nContinue?`
                        : `🏆 Start Tournament?\n\nThis will:\n✅ Use first 8 teams\n✅ Create 12 group stage matches\n✅ All matches will be "Upcoming"\n\nContinue?`;

                    if (!confirm(confirmMessage)) {
                      return;
                    }

                    const token = localStorage.getItem("token");
                    try {
                      // Delete existing matches (including semi-finals and finals)
                      let deletedCount = 0;
                      if (matches.length > 0) {
                        console.log(
                          `🗑️ Deleting ${matches.length} existing matches (including semi-finals/finals)...`
                        );
                        for (const match of matches) {
                          try {
                            await axios.delete(`/api/matches/${match.id}`, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            deletedCount++;
                            console.log(
                              `✅ Deleted match: ${
                                match.matchType || "Tournament"
                              }`
                            );
                          } catch (error) {
                            console.error(`❌ Error deleting match:`, error);
                          }
                        }
                      }

                      // Clear tournament bracket configuration from localStorage
                      localStorage.removeItem("tournamentBracket");
                      console.log(
                        "🧹 Cleared tournament bracket from localStorage"
                      );

                      // Get first 8 teams
                      const tournamentTeams = teams.slice(0, 8);

                      // Define 12 group stage matches
                      const groupAMatches = [
                        {
                          team1: tournamentTeams[0],
                          team2: tournamentTeams[1],
                        },
                        {
                          team1: tournamentTeams[2],
                          team2: tournamentTeams[3],
                        },
                        {
                          team1: tournamentTeams[0],
                          team2: tournamentTeams[2],
                        },
                        {
                          team1: tournamentTeams[1],
                          team2: tournamentTeams[3],
                        },
                        {
                          team1: tournamentTeams[0],
                          team2: tournamentTeams[3],
                        },
                        {
                          team1: tournamentTeams[1],
                          team2: tournamentTeams[2],
                        },
                      ];

                      const groupBMatches = [
                        {
                          team1: tournamentTeams[4],
                          team2: tournamentTeams[5],
                        },
                        {
                          team1: tournamentTeams[6],
                          team2: tournamentTeams[7],
                        },
                        {
                          team1: tournamentTeams[4],
                          team2: tournamentTeams[6],
                        },
                        {
                          team1: tournamentTeams[5],
                          team2: tournamentTeams[7],
                        },
                        {
                          team1: tournamentTeams[4],
                          team2: tournamentTeams[7],
                        },
                        {
                          team1: tournamentTeams[5],
                          team2: tournamentTeams[6],
                        },
                      ];

                      const allMatches = [...groupAMatches, ...groupBMatches];

                      // Create matches
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
                        } catch (error) {
                          console.error("Error creating match:", error);
                        }
                      }

                      // Refresh data
                      await fetchData();

                      const successMsg =
                        deletedCount > 0
                          ? `🏆 Tournament Started!\n\n🗑️ Deleted ${deletedCount} old matches\n📅 Created ${createdCount} new matches\n\n✅ Go to "Fixtures" page to view bracket\n✅ Go to "Live Scores" tab to start scoring!`
                          : `🏆 Tournament Started!\n\n📅 Created ${createdCount} matches\n\n✅ Go to "Fixtures" page to view bracket\n✅ Go to "Live Scores" tab to start scoring!`;

                      alert(successMsg);
                    } catch (error) {
                      console.error("Error starting tournament:", error);
                      alert(`❌ Error: ${error.message}`);
                    }
                  }}
                  disabled={teams.length < 8}
                  className={`w-full py-4 rounded-lg font-bold text-lg transition-all ${
                    teams.length < 8
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl"
                  }`}
                >
                  {teams.length < 8
                    ? "🔒 Need 8 Teams to Start"
                    : "🏆 Start Tournament Now"}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card bg-blue-50 border-blue-200">
              <h3 className="font-bold text-blue-800 mb-2">
                📋 What Gets Created
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>✓ 2 Groups (A & B) with 4 teams each</li>
                <li>✓ 6 matches per group (round-robin)</li>
                <li>✓ Total 12 matches to play</li>
                <li>✓ All matches start as "Upcoming"</li>
              </ul>
            </div>

            <div className="card bg-green-50 border-green-200">
              <h3 className="font-bold text-green-800 mb-2">🎯 Next Steps</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>1. Create tournament here</li>
                <li>2. View bracket in "Fixtures" page</li>
                <li>3. Go to "Live Scores" tab</li>
                <li>4. Select match & start scoring!</li>
              </ul>
            </div>
          </div>

          {/* Current Teams Preview */}
          {teams.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-3">
                First 8 Teams (Will be used for tournament)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {teams.slice(0, 8).map((team, index) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded border"
                  >
                    {team.logo ? (
                      <img
                        src={team.logo}
                        alt={team.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                        {team.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500">
                        Team {index + 1}
                      </div>
                      <div className="text-sm font-semibold truncate">
                        {team.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {teams.length < 8 && (
                <p className="text-sm text-gray-500 mt-3">
                  Add {8 - teams.length} more team
                  {8 - teams.length !== 1 ? "s" : ""} to complete the tournament
                  roster.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Teams Tab */}
      {activeTab === "teams" && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-xl font-bold mb-4">
              {editingId ? "Edit Team" : "Add New Team"}
            </h3>
            <form onSubmit={handleTeamSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Team Name"
                className="input-field"
                value={teamForm.name}
                onChange={(e) =>
                  setTeamForm({ ...teamForm, name: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Short Name (e.g., MI, CSK)"
                className="input-field"
                value={teamForm.shortName}
                onChange={(e) =>
                  setTeamForm({ ...teamForm, shortName: e.target.value })
                }
              />

              {/* Image Upload Section */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Team Logo
                </label>

                {/* Image Preview */}
                {(imagePreview || teamForm.logo) && (
                  <div className="flex items-center space-x-4 mb-2">
                    <img
                      src={imagePreview || teamForm.logo}
                      alt="Logo preview"
                      className="w-20 h-20 object-cover rounded border"
                    />
                    {imagePreview && !teamForm.logo && (
                      <span className="text-sm text-gray-500">
                        Preview (not uploaded yet)
                      </span>
                    )}
                    {teamForm.logo && (
                      <span className="text-sm text-green-600">✓ Uploaded</span>
                    )}
                  </div>
                )}

                {/* File Input */}
                <div className="flex space-x-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {imageFile && !teamForm.logo && (
                    <button
                      type="button"
                      onClick={uploadImageToFreeImage}
                      disabled={uploadingImage}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 whitespace-nowrap text-sm"
                    >
                      {uploadingImage ? "Uploading..." : "Upload"}
                    </button>
                  )}
                </div>

                {/* Manual URL Input (Optional) */}
                <div className="text-xs text-gray-500 mt-1">
                  Or enter URL manually:
                </div>
                <input
                  type="text"
                  placeholder="Logo URL (optional)"
                  className="input-field text-sm"
                  value={teamForm.logo}
                  onChange={(e) => {
                    setTeamForm({ ...teamForm, logo: e.target.value });
                    if (e.target.value) {
                      setImagePreview("");
                      setImageFile(null);
                    }
                  }}
                />
              </div>

              <div className="flex space-x-2">
                <button type="submit" className="btn-primary flex-1">
                  {editingId ? "Update" : "Create"} Team
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setTeamForm({ name: "", shortName: "", logo: "" });
                      setImageFile(null);
                      setImagePreview("");
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold">Teams List</h3>
            {teams.map((team) => (
              <div
                key={team.id}
                className="card flex justify-between items-center"
              >
                <div className="flex items-center space-x-3">
                  {team.logo && (
                    <img
                      src={team.logo}
                      alt={team.name}
                      className="w-12 h-12 object-cover rounded"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  )}
                  <div>
                    <p className="font-semibold">{team.name}</p>
                    <p className="text-sm text-gray-600">{team.shortName}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingId(team.id);
                      setTeamForm({
                        name: team.name,
                        shortName: team.shortName,
                        logo: team.logo || "",
                      });
                      setImageFile(null);
                      setImagePreview(team.logo || "");
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(team.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matches Tab */}
      {activeTab === "matches" && !loading && (
        <div className="space-y-6">
          {/* Tournament Button */}
          <div className="card bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <h3 className="font-bold text-purple-800">
                    Start Tournament
                  </h3>
                  <p className="text-sm text-purple-600">
                    Use first 8 teams to create 12 group matches
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (teams.length < 8) {
                    alert(
                      `⚠️ Need at least 8 teams for tournament. Currently have ${teams.length} teams.\n\nGo to Teams tab to add more teams.`
                    );
                    return;
                  }

                  const confirmMessage =
                    matches.length > 0
                      ? `⚠️ WARNING: This will DELETE ALL ${matches.length} existing matches and start fresh!\n\n🏆 Start New Tournament?\n\n✅ Delete all existing matches\n✅ Use first 8 teams\n✅ Create 12 group stage matches\n\nContinue?`
                      : `🏆 Start Tournament?\n\nThis will:\n✅ Use first 8 teams\n✅ Create 12 group stage matches\n✅ All matches will be "Upcoming"\n\nContinue?`;

                  if (!confirm(confirmMessage)) {
                    console.log("Tournament start cancelled by user");
                    return;
                  }

                  console.log(
                    "Starting tournament with",
                    teams.length,
                    "teams..."
                  );
                  const token = localStorage.getItem("token");

                  if (!token) {
                    alert("❌ Authentication error. Please login again.");
                    return;
                  }

                  try {
                    // Delete existing matches
                    if (matches.length > 0) {
                      console.log(
                        `Deleting ${matches.length} existing matches...`
                      );
                      for (const match of matches) {
                        await axios.delete(
                          `/api/matches/${match.id}`,
                          getAuthHeader()
                        );
                      }
                      console.log("All matches deleted");
                    }

                    // Get bracket configuration or use first 8 teams
                    const saved = localStorage.getItem("tournamentBracket");
                    let tournamentTeams;

                    if (saved) {
                      const config = JSON.parse(saved);
                      const groupATeamIds = config.groupA.filter((id) => id);
                      const groupBTeamIds = config.groupB.filter((id) => id);

                      if (
                        groupATeamIds.length === 4 &&
                        groupBTeamIds.length === 4
                      ) {
                        // Use custom bracket
                        tournamentTeams = [
                          ...groupATeamIds.map((id) =>
                            teams.find((t) => t.id === id)
                          ),
                          ...groupBTeamIds.map((id) =>
                            teams.find((t) => t.id === id)
                          ),
                        ].filter(Boolean);
                        console.log("Using custom bracket configuration");
                      } else {
                        // Auto-assign first 8
                        tournamentTeams = teams.slice(0, 8);
                        console.log("Using first 8 teams (auto-assigned)");
                      }
                    } else {
                      // Auto-assign first 8
                      tournamentTeams = teams.slice(0, 8);
                      console.log("Using first 8 teams (no bracket saved)");
                    }

                    if (tournamentTeams.length < 8) {
                      alert("❌ Error: Not enough teams found. Need 8 teams.");
                      return;
                    }

                    console.log(
                      "Tournament teams:",
                      tournamentTeams.map((t) => t.name)
                    );

                    // Create 12 group matches
                    const groupAMatches = [
                      { team1: tournamentTeams[0], team2: tournamentTeams[1] },
                      { team1: tournamentTeams[2], team2: tournamentTeams[3] },
                      { team1: tournamentTeams[0], team2: tournamentTeams[2] },
                      { team1: tournamentTeams[1], team2: tournamentTeams[3] },
                      { team1: tournamentTeams[0], team2: tournamentTeams[3] },
                      { team1: tournamentTeams[1], team2: tournamentTeams[2] },
                    ];

                    const groupBMatches = [
                      { team1: tournamentTeams[4], team2: tournamentTeams[5] },
                      { team1: tournamentTeams[6], team2: tournamentTeams[7] },
                      { team1: tournamentTeams[4], team2: tournamentTeams[6] },
                      { team1: tournamentTeams[5], team2: tournamentTeams[7] },
                      { team1: tournamentTeams[4], team2: tournamentTeams[7] },
                      { team1: tournamentTeams[5], team2: tournamentTeams[6] },
                    ];

                    const allMatches = [...groupAMatches, ...groupBMatches];
                    console.log("Creating", allMatches.length, "matches...");

                    // Create matches
                    let createdCount = 0;
                    for (let i = 0; i < allMatches.length; i++) {
                      const match = allMatches[i];
                      console.log(
                        `Creating match ${i + 1}/${allMatches.length}: ${
                          match.team1.name
                        } vs ${match.team2.name}`
                      );

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
                        getAuthHeader()
                      );
                      createdCount++;
                    }

                    console.log(`Successfully created ${createdCount} matches`);
                    await fetchData();
                    alert(
                      `🏆 Tournament Started!\n\n📅 Created ${createdCount} matches\n\n✅ Go to "Fixtures" page to view bracket\n✅ Go to "Scores" tab to start scoring!`
                    );
                  } catch (error) {
                    console.error("Error starting tournament:", error);
                    alert(
                      `❌ Error: ${
                        error.response?.data?.error || error.message
                      }\n\nCheck console for details.`
                    );
                  }
                }}
                disabled={teams.length < 8}
                className={`px-6 py-3 rounded-lg font-bold transition-all ${
                  teams.length < 8
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl"
                }`}
              >
                {teams.length < 8
                  ? `Need ${8 - teams.length} More Teams`
                  : "🏆 Start Tournament"}
              </button>
            </div>
          </div>

          {/* Edit Tournament Fixture/Bracket */}
          <div className="card bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚙️</span>
                <div>
                  <h3 className="font-bold text-green-800">
                    Edit Tournament Fixture
                  </h3>
                  <p className="text-sm text-green-600">
                    Customize which teams are in Group A and Group B
                  </p>
                </div>
              </div>
              <a
                href="/fixtures"
                target="_blank"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                👁️ View Bracket
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Group A */}
              <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                <h4 className="font-bold text-green-800 mb-3">🟢 Group A</h4>
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={`groupA-${index}`}>
                      <label className="text-xs text-gray-600 font-semibold">
                        Team A{index + 1}
                      </label>
                      <select
                        className="input-field text-sm"
                        value={(() => {
                          const saved =
                            localStorage.getItem("tournamentBracket");
                          if (saved) {
                            const config = JSON.parse(saved);
                            return config.groupA[index] || "";
                          }
                          return "";
                        })()}
                        onChange={(e) => {
                          const saved =
                            localStorage.getItem("tournamentBracket");
                          const config = saved
                            ? JSON.parse(saved)
                            : {
                                groupA: ["", "", "", ""],
                                groupB: ["", "", "", ""],
                              };
                          config.groupA[index] = e.target.value;
                          localStorage.setItem(
                            "tournamentBracket",
                            JSON.stringify(config)
                          );
                          // Force re-render
                          setTeams([...teams]);
                        }}
                      >
                        <option value="">Select Team</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group B */}
              <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
                <h4 className="font-bold text-blue-800 mb-3">🔵 Group B</h4>
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={`groupB-${index}`}>
                      <label className="text-xs text-gray-600 font-semibold">
                        Team B{index + 1}
                      </label>
                      <select
                        className="input-field text-sm"
                        value={(() => {
                          const saved =
                            localStorage.getItem("tournamentBracket");
                          if (saved) {
                            const config = JSON.parse(saved);
                            return config.groupB[index] || "";
                          }
                          return "";
                        })()}
                        onChange={(e) => {
                          const saved =
                            localStorage.getItem("tournamentBracket");
                          const config = saved
                            ? JSON.parse(saved)
                            : {
                                groupA: ["", "", "", ""],
                                groupB: ["", "", "", ""],
                              };
                          config.groupB[index] = e.target.value;
                          localStorage.setItem(
                            "tournamentBracket",
                            JSON.stringify(config)
                          );
                          // Force re-render
                          setTeams([...teams]);
                        }}
                      >
                        <option value="">Select Team</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  const saved = localStorage.getItem("tournamentBracket");
                  if (
                    !saved ||
                    confirm(
                      "This will assign the first 8 teams to groups. Continue?"
                    )
                  ) {
                    const firstEightTeams = teams.slice(0, 8);
                    const config = {
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
                    localStorage.setItem(
                      "tournamentBracket",
                      JSON.stringify(config)
                    );
                    setTeams([...teams]); // Force re-render
                    alert("✅ Teams auto-assigned to groups!");
                  }
                }}
                disabled={teams.length < 8}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                  teams.length < 8
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                🎲 Auto-Assign Teams
              </button>
              <button
                onClick={() => {
                  if (confirm("Clear all group assignments?")) {
                    localStorage.setItem(
                      "tournamentBracket",
                      JSON.stringify({
                        groupA: ["", "", "", ""],
                        groupB: ["", "", "", ""],
                      })
                    );
                    setTeams([...teams]); // Force re-render
                    alert("✅ Groups cleared!");
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors"
              >
                🗑️ Clear Groups
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
              💡 <strong>Tip:</strong> After editing groups, click "Start
              Tournament" above to create matches based on these groups.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-xl font-bold mb-4">
                {editingId ? "Edit Match" : "Manually Create a Match"}
              </h3>
              <form onSubmit={handleMatchSubmit} className="space-y-4">
                <select
                  className="input-field"
                  value={matchForm.team1Id}
                  onChange={(e) => {
                    const team = teams.find((t) => t.id === e.target.value);
                    setMatchForm({
                      ...matchForm,
                      team1Id: e.target.value,
                      team1Name: team?.name || "",
                    });
                  }}
                  required
                >
                  <option value="">Select Team 1</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <select
                  className="input-field"
                  value={matchForm.team2Id}
                  onChange={(e) => {
                    const team = teams.find((t) => t.id === e.target.value);
                    setMatchForm({
                      ...matchForm,
                      team2Id: e.target.value,
                      team2Name: team?.name || "",
                    });
                  }}
                  required
                >
                  <option value="">Select Team 2</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Total Balls Per Team
                  </label>
                  <input
                    type="number"
                    placeholder="Enter total balls (e.g., 30 for 5 overs)"
                    className="input-field"
                    value={matchForm.totalBallsPerTeam}
                    onChange={(e) =>
                      setMatchForm({
                        ...matchForm,
                        totalBallsPerTeam: parseInt(e.target.value) || 0,
                      })
                    }
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1"></p>
                </div>
                <div className="flex space-x-2">
                  <button type="submit" className="btn-primary flex-1">
                    {editingId ? "Update" : "Create"} Match
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setMatchForm({
                          team1Id: "",
                          team2Id: "",
                          team1Name: "",
                          team2Name: "",
                          venue: "",
                          matchType: "T20",
                          totalBallsPerTeam: 30,
                          date: Date.now(),
                        });
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold mb-4">Matches List</h3>

              {/* Info Banner */}
              {matches.filter((m) => m.status === "upcoming").length > 0 && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-blue-800 text-sm font-semibold">
                    💡 Tip: Click on an upcoming match card to quickly start it
                    as LIVE
                  </p>
                </div>
              )}

              {(() => {
                // Sort matches to alternate between Group A and Group B
                const bracketConfig = JSON.parse(
                  localStorage.getItem("tournamentBracket") ||
                    '{"groupA":[],"groupB":[]}'
                );
                const groupATeams = bracketConfig.groupA.filter((id) => id);
                const groupBTeams = bracketConfig.groupB.filter((id) => id);

                // Separate matches by type
                const groupAMatches = [];
                const groupBMatches = [];
                const knockoutMatches = [];

                matches.forEach((match) => {
                  // Check if it's a knockout match
                  if (
                    match.matchType?.toLowerCase().includes("semi") ||
                    (match.matchType?.toLowerCase().includes("final") &&
                      !match.matchType?.toLowerCase().includes("semi"))
                  ) {
                    knockoutMatches.push(match);
                  } else {
                    // Check which group it belongs to
                    const isGroupA =
                      groupATeams.includes(match.team1Id) &&
                      groupATeams.includes(match.team2Id);
                    const isGroupB =
                      groupBTeams.includes(match.team1Id) &&
                      groupBTeams.includes(match.team2Id);

                    if (isGroupA) {
                      groupAMatches.push(match);
                    } else if (isGroupB) {
                      groupBMatches.push(match);
                    } else {
                      knockoutMatches.push(match); // Other matches
                    }
                  }
                });

                // Interleave Group A and Group B matches
                const interleavedMatches = [];
                const maxLength = Math.max(
                  groupAMatches.length,
                  groupBMatches.length
                );

                for (let i = 0; i < maxLength; i++) {
                  if (i < groupAMatches.length) {
                    interleavedMatches.push(groupAMatches[i]);
                  }
                  if (i < groupBMatches.length) {
                    interleavedMatches.push(groupBMatches[i]);
                  }
                }

                // Add knockout matches at the end
                const sortedMatches = [
                  ...interleavedMatches,
                  ...knockoutMatches,
                ];

                return sortedMatches.map((match) => (
                  <div
                    key={match.id}
                    className={`card transition-all ${
                      match.status === "upcoming"
                        ? "hover:border-blue-400 hover:shadow-lg cursor-pointer"
                        : ""
                    } ${
                      match.status === "live" ? "border-red-400 border-2" : ""
                    }`}
                    onClick={async () => {
                      // Click to start upcoming matches
                      if (match.status === "upcoming") {
                        // Check if another match is live
                        const liveMatch = matches.find(
                          (m) => m.status === "live" && m.id !== match.id
                        );

                        let confirmMsg = `🏏 Start "${match.team1Name} vs ${match.team2Name}" as LIVE?`;
                        if (liveMatch) {
                          confirmMsg = `⚠️ "${liveMatch.team1Name} vs ${liveMatch.team2Name}" is currently LIVE.\n\nStarting this match will automatically complete the live match.\n\nContinue?`;
                        }

                        if (confirm(confirmMsg)) {
                          try {
                            await axios.patch(
                              `/api/matches/${match.id}/score`,
                              { status: "live" },
                              getAuthHeader()
                            );
                            fetchData();
                            alert(
                              '✅ Match is now LIVE! Go to "Scores" tab to update scores.'
                            );
                          } catch (error) {
                            alert("Error starting match: " + error.message);
                          }
                        }
                      }
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-lg">
                            {match.team1Name} vs {match.team2Name}
                          </p>
                          {match.status === "live" && (
                            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                              🔴 LIVE
                            </span>
                          )}
                          {match.status === "upcoming" && (
                            <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">
                              📅 UPCOMING
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${
                              match.matchType
                                ?.toLowerCase()
                                .includes("final") &&
                              !match.matchType?.toLowerCase().includes("semi")
                                ? "text-yellow-600"
                                : match.matchType
                                    ?.toLowerCase()
                                    .includes("semi")
                                ? "text-orange-600"
                                : "text-gray-600"
                            }`}
                          >
                            {(() => {
                              // Determine match display name
                              if (
                                match.matchType
                                  ?.toLowerCase()
                                  .includes("semi") ||
                                match.matchType?.toLowerCase().includes("final")
                              ) {
                                return match.matchType;
                              }

                              // For group stage matches, show match number and group
                              const bracketConfig = JSON.parse(
                                localStorage.getItem("tournamentBracket") ||
                                  '{"groupA":[],"groupB":[]}'
                              );
                              const groupATeams = bracketConfig.groupA.filter(
                                (id) => id
                              );
                              const groupBTeams = bracketConfig.groupB.filter(
                                (id) => id
                              );

                              const isGroupA =
                                groupATeams.includes(match.team1Id) &&
                                groupATeams.includes(match.team2Id);
                              const isGroupB =
                                groupBTeams.includes(match.team1Id) &&
                                groupBTeams.includes(match.team2Id);

                              // Calculate match number based on position in matches list
                              const groupMatches = matches.filter(
                                (m) =>
                                  m.matchType === "Tournament" &&
                                  (groupATeams.includes(m.team1Id) ||
                                    groupBTeams.includes(m.team1Id))
                              );
                              const matchIndex = groupMatches.findIndex(
                                (m) => m.id === match.id
                              );

                              if (isGroupA) {
                                const groupAMatches = groupMatches.filter(
                                  (m) =>
                                    groupATeams.includes(m.team1Id) &&
                                    groupATeams.includes(m.team2Id)
                                );
                                const groupMatchNum =
                                  groupAMatches.findIndex(
                                    (m) => m.id === match.id
                                  ) + 1;
                                return `Group A - Match ${groupMatchNum}`;
                              } else if (isGroupB) {
                                const groupBMatches = groupMatches.filter(
                                  (m) =>
                                    groupBTeams.includes(m.team1Id) &&
                                    groupBTeams.includes(m.team2Id)
                                );
                                const groupMatchNum =
                                  groupBMatches.findIndex(
                                    (m) => m.id === match.id
                                  ) + 1;
                                return `Group B - Match ${groupMatchNum}`;
                              }

                              return match.matchType || "Group Stage";
                            })()}
                          </span>
                          {match.matchType?.toLowerCase().includes("final") &&
                            !match.matchType
                              ?.toLowerCase()
                              .includes("semi") && (
                              <span className="text-lg">🏆</span>
                            )}
                          {match.matchType?.toLowerCase().includes("semi") && (
                            <span className="text-lg">🔥</span>
                          )}
                        </div>

                        {/* Editable Balls Per Team */}
                        <div
                          className="mt-2 flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-xs text-gray-600 font-medium">
                            Balls per team:
                          </span>
                          <input
                            type="number"
                            className="w-20 text-xs border border-gray-300 rounded px-2 py-1"
                            defaultValue={match.totalBallsPerTeam || 30}
                            id={`balls-${match.id}`}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const inputElement = document.getElementById(
                                `balls-${match.id}`
                              );
                              const newBalls =
                                parseInt(inputElement.value) || 30;
                              try {
                                await axios.put(
                                  `/api/matches/${match.id}`,
                                  { totalBallsPerTeam: newBalls },
                                  getAuthHeader()
                                );
                                fetchData();
                              } catch (error) {
                                alert("Error updating balls count");
                              }
                            }}
                          >
                            Set
                          </button>
                        </div>

                        {/* Status Dropdown */}
                        <div
                          className="mt-2 flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-xs font-medium">Status:</span>
                          <select
                            className="text-xs border border-gray-300 rounded px-2 py-1"
                            value={match.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value;

                              // Warn if setting to live when another match is already live
                              if (
                                newStatus === "live" &&
                                matches.some(
                                  (m) =>
                                    m.status === "live" && m.id !== match.id
                                )
                              ) {
                                if (
                                  !confirm(
                                    "⚠️ Another match is currently LIVE. Setting this match to live will automatically complete the other match. Continue?"
                                  )
                                ) {
                                  return;
                                }
                              }

                              try {
                                await axios.patch(
                                  `/api/matches/${match.id}/score`,
                                  { status: newStatus },
                                  getAuthHeader()
                                );
                                fetchData();
                              } catch (error) {
                                alert("Error updating status");
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="upcoming">Upcoming</option>
                            <option value="live">🔴 Live</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                      <div
                        className="flex space-x-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleDeleteMatch(match.id)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {match.status === "upcoming" && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-blue-600 font-medium">
                          👆 Click this card to start match as LIVE
                        </p>
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Live Score Updates Tab */}
      {activeTab === "scores" && !loading && (
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Helper Info Box */}
          {matches.filter((m) => m.status === "upcoming").length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏏</span>
                <div>
                  <h4 className="font-bold text-blue-800 mb-1">
                    Ready to Score!
                  </h4>
                  <p className="text-blue-700 text-sm">
                    {
                      matches.filter(
                        (m) => m.status === "live" || m.status === "upcoming"
                      ).length
                    }{" "}
                    match(es) available for scoring. Select a match from the
                    dropdown below to start or continue live scoring.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Live Match Warning */}
          {matches.filter((m) => m.status === "live").length > 0 && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🔴</span>
                <div>
                  <h4 className="font-bold text-red-800 mb-1">
                    Match Currently LIVE
                  </h4>
                  <p className="text-red-700 text-sm">
                    {(() => {
                      const liveMatch = matches.filter(
                        (m) => m.status === "live"
                      )[0];
                      if (!liveMatch) return "";

                      const bracketConfig = JSON.parse(
                        localStorage.getItem("tournamentBracket") ||
                          '{"groupA":[],"groupB":[]}'
                      );
                      const groupATeams = bracketConfig.groupA.filter(
                        (id) => id
                      );
                      const groupBTeams = bracketConfig.groupB.filter(
                        (id) => id
                      );

                      let matchInfo = "";
                      if (
                        liveMatch.matchType?.toLowerCase().includes("semi") ||
                        (liveMatch.matchType?.toLowerCase().includes("final") &&
                          !liveMatch.matchType?.toLowerCase().includes("semi"))
                      ) {
                        matchInfo = `${liveMatch.matchType}`;
                      } else {
                        const isGroupA =
                          groupATeams.includes(liveMatch.team1Id) &&
                          groupATeams.includes(liveMatch.team2Id);
                        const isGroupB =
                          groupBTeams.includes(liveMatch.team1Id) &&
                          groupBTeams.includes(liveMatch.team2Id);

                        if (isGroupA || isGroupB) {
                          // Use ALL matches (including completed) to get consistent numbering
                          const allTournamentMatches = matches.filter(
                            (m) => m.matchType === "Tournament"
                          );
                          const groupMatches = allTournamentMatches.filter(
                            (m) =>
                              isGroupA
                                ? groupATeams.includes(m.team1Id) &&
                                  groupATeams.includes(m.team2Id)
                                : groupBTeams.includes(m.team1Id) &&
                                  groupBTeams.includes(m.team2Id)
                          );

                          // Sort by date to maintain consistent order
                          groupMatches.sort((a, b) => a.date - b.date);

                          const matchIndex = groupMatches.findIndex(
                            (m) => m.id === liveMatch.id
                          );
                          const matchNumber =
                            matchIndex >= 0 ? matchIndex + 1 : 1;

                          matchInfo = isGroupA
                            ? `Group A - Match ${matchNumber}`
                            : `Group B - Match ${matchNumber}`;
                        } else {
                          matchInfo = liveMatch.matchType || "Tournament";
                        }
                      }

                      return `${matchInfo}: ${liveMatch.team1Name} vs ${liveMatch.team2Name}`;
                    })()}
                  </p>
                  <p className="text-red-600 text-xs mt-1">
                    ⚠️ Only one match can be live at a time. Starting a new
                    match will automatically complete this one.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="text-xl font-bold mb-4">Update Live Match Score</h3>
            <div className="space-y-4">
              <select
                className="input-field"
                value={scoreUpdateForm.matchId}
                onChange={(e) => {
                  // Clear undo stack when switching matches
                  setUndoStack({ team1: [], team2: [] });

                  const match = matches.find((m) => m.id === e.target.value);

                  setScoreUpdateForm({
                    ...scoreUpdateForm,
                    matchId: e.target.value,
                    team1Score: match?.team1Score || {
                      runs: 0,
                      wickets: 0,
                      balls: 0,
                    },
                    team2Score: match?.team2Score || {
                      runs: 0,
                      wickets: 0,
                      balls: 0,
                    },
                    status:
                      match?.status === "upcoming"
                        ? "live"
                        : match?.status || "live",
                    result: match?.result || "",
                    totalBallsPerTeam: match?.totalBallsPerTeam || 30,
                  });
                }}
                required
              >
                <option value="">Select Match to Start / Update</option>

                {/* Only show Live and Upcoming matches (exclude completed) */}
                {/* Live Matches */}
                {matches.filter((m) => m.status === "live").length > 0 && (
                  <optgroup label="🔴 LIVE MATCHES">
                    {(() => {
                      const liveMatches = matches.filter(
                        (m) => m.status === "live"
                      );

                      // Sort live matches by date to maintain order
                      liveMatches.sort((a, b) => a.date - b.date);

                      // Load bracket config
                      const bracketConfig = JSON.parse(
                        localStorage.getItem("tournamentBracket") ||
                          '{"groupA":[],"groupB":[]}'
                      );
                      const groupATeams = bracketConfig.groupA.filter(
                        (id) => id
                      );
                      const groupBTeams = bracketConfig.groupB.filter(
                        (id) => id
                      );

                      return liveMatches.map((match) => {
                        let matchInfo = "";

                        if (
                          match.matchType?.toLowerCase().includes("semi") ||
                          (match.matchType?.toLowerCase().includes("final") &&
                            !match.matchType?.toLowerCase().includes("semi"))
                        ) {
                          matchInfo = `${match.matchType}`;
                        } else {
                          // For group stage matches, calculate group and match number
                          const isGroupA =
                            groupATeams.includes(match.team1Id) &&
                            groupATeams.includes(match.team2Id);
                          const isGroupB =
                            groupBTeams.includes(match.team1Id) &&
                            groupBTeams.includes(match.team2Id);

                          if (isGroupA || isGroupB) {
                            // Use ALL matches (including completed) to get consistent numbering
                            const allTournamentMatches = matches.filter(
                              (m) => m.matchType === "Tournament"
                            );
                            const groupMatches = allTournamentMatches.filter(
                              (m) =>
                                isGroupA
                                  ? groupATeams.includes(m.team1Id) &&
                                    groupATeams.includes(m.team2Id)
                                  : groupBTeams.includes(m.team1Id) &&
                                    groupBTeams.includes(m.team2Id)
                            );

                            // Sort by date to maintain consistent order
                            groupMatches.sort((a, b) => a.date - b.date);

                            const matchIndex = groupMatches.findIndex(
                              (m) => m.id === match.id
                            );
                            const matchNumber =
                              matchIndex >= 0 ? matchIndex + 1 : 1;

                            matchInfo = isGroupA
                              ? `Group A - Match ${matchNumber}`
                              : `Group B - Match ${matchNumber}`;
                          } else {
                            matchInfo = match.matchType || "Tournament";
                          }
                        }

                        return (
                          <option key={match.id} value={match.id}>
                            {matchInfo}: {match.team1Name} vs {match.team2Name}{" "}
                            - {match.team1Score?.runs || 0}/
                            {match.team1Score?.wickets || 0} vs{" "}
                            {match.team2Score?.runs || 0}/
                            {match.team2Score?.wickets || 0}
                          </option>
                        );
                      });
                    })()}
                  </optgroup>
                )}

                {/* Upcoming Matches */}
                {matches.filter((m) => m.status === "upcoming").length > 0 && (
                  <optgroup label="📅 UPCOMING MATCHES (Click to Start Scoring)">
                    {(() => {
                      const upcomingMatches = matches.filter(
                        (m) => m.status === "upcoming"
                      );

                      // Load bracket config
                      const bracketConfig = JSON.parse(
                        localStorage.getItem("tournamentBracket") ||
                          '{"groupA":[],"groupB":[]}'
                      );
                      const groupATeams = bracketConfig.groupA.filter(
                        (id) => id
                      );
                      const groupBTeams = bracketConfig.groupB.filter(
                        (id) => id
                      );

                      // Separate and categorize matches
                      const groupAMatches = [];
                      const groupBMatches = [];
                      const knockoutMatches = [];

                      upcomingMatches.forEach((match) => {
                        if (
                          match.matchType?.toLowerCase().includes("semi") ||
                          (match.matchType?.toLowerCase().includes("final") &&
                            !match.matchType?.toLowerCase().includes("semi"))
                        ) {
                          knockoutMatches.push(match);
                        } else {
                          const isGroupA =
                            groupATeams.includes(match.team1Id) &&
                            groupATeams.includes(match.team2Id);
                          const isGroupB =
                            groupBTeams.includes(match.team1Id) &&
                            groupBTeams.includes(match.team2Id);

                          if (isGroupA) {
                            groupAMatches.push(match);
                          } else if (isGroupB) {
                            groupBMatches.push(match);
                          } else {
                            knockoutMatches.push(match);
                          }
                        }
                      });

                      // Calculate match numbers based on ALL matches (including completed)
                      const allTournamentMatches = matches.filter(
                        (m) => m.matchType === "Tournament"
                      );
                      const allGroupAMatches = allTournamentMatches
                        .filter(
                          (m) =>
                            groupATeams.includes(m.team1Id) &&
                            groupATeams.includes(m.team2Id)
                        )
                        .sort((a, b) => a.date - b.date);
                      const allGroupBMatches = allTournamentMatches
                        .filter(
                          (m) =>
                            groupBTeams.includes(m.team1Id) &&
                            groupBTeams.includes(m.team2Id)
                        )
                        .sort((a, b) => a.date - b.date);

                      // Assign match numbers to filtered matches
                      const groupAWithNumbers = groupAMatches
                        .map((match) => ({
                          match,
                          number:
                            allGroupAMatches.findIndex(
                              (m) => m.id === match.id
                            ) + 1,
                        }))
                        .sort((a, b) => a.number - b.number); // Sort by match number

                      const groupBWithNumbers = groupBMatches
                        .map((match) => ({
                          match,
                          number:
                            allGroupBMatches.findIndex(
                              (m) => m.id === match.id
                            ) + 1,
                        }))
                        .sort((a, b) => a.number - b.number); // Sort by match number

                      // Sort knockout matches
                      knockoutMatches.sort((a, b) => {
                        const aType = a.matchType?.toLowerCase() || "";
                        const bType = b.matchType?.toLowerCase() || "";

                        if (aType.includes("semi") && !bType.includes("semi"))
                          return -1;
                        if (!aType.includes("semi") && bType.includes("semi"))
                          return 1;
                        if (aType.includes("semi") && bType.includes("semi")) {
                          return (a.matchType || "").localeCompare(
                            b.matchType || ""
                          );
                        }
                        return 0;
                      });

                      // Show all Group A matches first, then all Group B matches (ascending order)
                      const orderedMatches = [];

                      // Add all Group A matches
                      groupAWithNumbers.forEach((item) => {
                        orderedMatches.push({
                          match: item.match,
                          group: "A",
                          number: item.number,
                        });
                      });

                      // Add all Group B matches
                      groupBWithNumbers.forEach((item) => {
                        orderedMatches.push({
                          match: item.match,
                          group: "B",
                          number: item.number,
                        });
                      });

                      // Add knockout matches at the end
                      knockoutMatches.forEach((match) => {
                        orderedMatches.push({
                          match,
                          group: "knockout",
                          number: 0,
                        });
                      });

                      return orderedMatches.map(({ match, group, number }) => {
                        let matchInfo = "";

                        if (group === "knockout") {
                          matchInfo = `${match.matchType}`;
                        } else {
                          matchInfo = `Group ${group} - Match ${number}`;
                        }

                        return (
                          <option key={match.id} value={match.id}>
                            {matchInfo}: {match.team1Name} vs {match.team2Name}
                          </option>
                        );
                      });
                    })()}
                  </optgroup>
                )}

                {/* Completed Matches */}
                {matches.filter((m) => m.status === "completed").length > 0 && (
                  <optgroup label="✅ COMPLETED MATCHES">
                    {(() => {
                      const completedMatches = matches.filter(
                        (m) => m.status === "completed"
                      );

                      // Load bracket config
                      const bracketConfig = JSON.parse(
                        localStorage.getItem("tournamentBracket") ||
                          '{"groupA":[],"groupB":[]}'
                      );
                      const groupATeams = bracketConfig.groupA.filter(
                        (id) => id
                      );
                      const groupBTeams = bracketConfig.groupB.filter(
                        (id) => id
                      );

                      // Separate and categorize matches
                      const groupAMatches = [];
                      const groupBMatches = [];
                      const knockoutMatches = [];

                      completedMatches.forEach((match) => {
                        if (
                          match.matchType?.toLowerCase().includes("semi") ||
                          (match.matchType?.toLowerCase().includes("final") &&
                            !match.matchType?.toLowerCase().includes("semi"))
                        ) {
                          knockoutMatches.push(match);
                        } else {
                          const isGroupA =
                            groupATeams.includes(match.team1Id) &&
                            groupATeams.includes(match.team2Id);
                          const isGroupB =
                            groupBTeams.includes(match.team1Id) &&
                            groupBTeams.includes(match.team2Id);

                          if (isGroupA) {
                            groupAMatches.push(match);
                          } else if (isGroupB) {
                            groupBMatches.push(match);
                          } else {
                            knockoutMatches.push(match);
                          }
                        }
                      });

                      // Calculate match numbers based on ALL matches
                      const allTournamentMatches = matches.filter(
                        (m) => m.matchType === "Tournament"
                      );
                      const allGroupAMatches = allTournamentMatches
                        .filter(
                          (m) =>
                            groupATeams.includes(m.team1Id) &&
                            groupATeams.includes(m.team2Id)
                        )
                        .sort((a, b) => a.date - b.date);
                      const allGroupBMatches = allTournamentMatches
                        .filter(
                          (m) =>
                            groupBTeams.includes(m.team1Id) &&
                            groupBTeams.includes(m.team2Id)
                        )
                        .sort((a, b) => a.date - b.date);

                      // Assign match numbers to filtered matches
                      const groupAWithNumbers = groupAMatches
                        .map((match) => ({
                          match,
                          number:
                            allGroupAMatches.findIndex(
                              (m) => m.id === match.id
                            ) + 1,
                        }))
                        .sort((a, b) => a.number - b.number); // Sort by match number

                      const groupBWithNumbers = groupBMatches
                        .map((match) => ({
                          match,
                          number:
                            allGroupBMatches.findIndex(
                              (m) => m.id === match.id
                            ) + 1,
                        }))
                        .sort((a, b) => a.number - b.number); // Sort by match number

                      // Sort knockout matches
                      knockoutMatches.sort((a, b) => {
                        const aType = a.matchType?.toLowerCase() || "";
                        const bType = b.matchType?.toLowerCase() || "";

                        if (aType.includes("semi") && !bType.includes("semi"))
                          return -1;
                        if (!aType.includes("semi") && bType.includes("semi"))
                          return 1;
                        if (aType.includes("semi") && bType.includes("semi")) {
                          return (a.matchType || "").localeCompare(
                            b.matchType || ""
                          );
                        }
                        return 0;
                      });

                      // Show all Group A matches first, then all Group B matches (ascending order)
                      const orderedMatches = [];

                      // Add all Group A matches
                      groupAWithNumbers.forEach((item) => {
                        orderedMatches.push({
                          match: item.match,
                          group: "A",
                          number: item.number,
                        });
                      });

                      // Add all Group B matches
                      groupBWithNumbers.forEach((item) => {
                        orderedMatches.push({
                          match: item.match,
                          group: "B",
                          number: item.number,
                        });
                      });

                      // Add knockout matches at the end
                      knockoutMatches.forEach((match) => {
                        orderedMatches.push({
                          match,
                          group: "knockout",
                          number: 0,
                        });
                      });

                      return orderedMatches.map(({ match, group, number }) => {
                        let matchInfo = "";

                        if (group === "knockout") {
                          matchInfo = `${match.matchType}`;
                        } else {
                          matchInfo = `Group ${group} - Match ${number}`;
                        }

                        return (
                          <option key={match.id} value={match.id}>
                            {matchInfo}: {match.team1Name} vs {match.team2Name}{" "}
                            - {match.team1Score?.runs || 0}/
                            {match.team1Score?.wickets || 0} vs{" "}
                            {match.team2Score?.runs || 0}/
                            {match.team2Score?.wickets || 0}
                          </option>
                        );
                      });
                    })()}
                  </optgroup>
                )}
              </select>

              {matches.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ No matches available. Create a new match or go to
                    Fixtures to start a tournament.
                  </p>
                </div>
              )}

              {scoreUpdateForm.matchId &&
                matches.find((m) => m.id === scoreUpdateForm.matchId)
                  ?.status === "upcoming" && (
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                    <p className="text-blue-800 text-sm font-semibold">
                      📢 This is an upcoming match. When you update the score,
                      it will automatically start as LIVE.
                    </p>
                  </div>
                )}

              {scoreUpdateForm.matchId && (
                <>
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Team 1 Score</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-gray-600">Runs</label>
                        <input
                          type="number"
                          placeholder="Runs"
                          className="input-field"
                          value={scoreUpdateForm.team1Score.runs}
                          onChange={(e) =>
                            setScoreUpdateForm({
                              ...scoreUpdateForm,
                              team1Score: {
                                ...scoreUpdateForm.team1Score,
                                runs: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">
                          Wickets (max: 5)
                        </label>
                        <input
                          type="number"
                          placeholder="Wickets"
                          className="input-field"
                          max={5}
                          value={scoreUpdateForm.team1Score.wickets}
                          onChange={(e) => {
                            const newWickets = parseInt(e.target.value) || 0;
                            setScoreUpdateForm({
                              ...scoreUpdateForm,
                              team1Score: {
                                ...scoreUpdateForm.team1Score,
                                wickets: Math.min(newWickets, 5),
                              },
                            });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">
                          Balls (max: {scoreUpdateForm.totalBallsPerTeam})
                        </label>
                        <input
                          type="number"
                          placeholder="Balls"
                          className="input-field"
                          max={scoreUpdateForm.totalBallsPerTeam}
                          value={scoreUpdateForm.team1Score.balls}
                          onChange={(e) => {
                            const newBalls = parseInt(e.target.value) || 0;
                            const maxBalls =
                              scoreUpdateForm.totalBallsPerTeam || 30;
                            setScoreUpdateForm({
                              ...scoreUpdateForm,
                              team1Score: {
                                ...scoreUpdateForm.team1Score,
                                balls: Math.min(newBalls, maxBalls),
                              },
                            });
                          }}
                        />
                      </div>
                    </div>

                    {/* Quick Action Buttons for Team 1 */}
                    <div className="mt-4 space-y-2">
                      <div>
                        <p className="text-xs text-gray-600 mb-2 font-medium">
                          Quick Add Runs:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 6].map((runs) => (
                            <button
                              key={runs}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();

                                const currentWickets =
                                  scoreUpdateForm.team1Score.wickets;

                                // Don't allow if already at 5 wickets
                                if (currentWickets >= 5) {
                                  alert(
                                    `Team's innings is complete (5 wickets)!`
                                  );
                                  return;
                                }

                                // Save current state to undo stack
                                setUndoStack({
                                  ...undoStack,
                                  team1: [
                                    ...undoStack.team1,
                                    { ...scoreUpdateForm.team1Score },
                                  ],
                                });

                                const updatedForm = {
                                  ...scoreUpdateForm,
                                  team1Score: {
                                    ...scoreUpdateForm.team1Score,
                                    runs:
                                      scoreUpdateForm.team1Score.runs + runs,
                                  },
                                };

                                setScoreUpdateForm(updatedForm);
                                autoSaveScore(updatedForm);
                              }}
                              className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg transition-colors"
                            >
                              {runs}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const currentRuns =
                                scoreUpdateForm.team1Score.runs;
                              if (currentRuns <= 0) {
                                alert("Runs cannot be negative!");
                                return;
                              }

                              setUndoStack({
                                ...undoStack,
                                team1: [
                                  ...undoStack.team1,
                                  { ...scoreUpdateForm.team1Score },
                                ],
                              });

                              const updatedForm = {
                                ...scoreUpdateForm,
                                team1Score: {
                                  ...scoreUpdateForm.team1Score,
                                  runs: Math.max(0, currentRuns - 1),
                                },
                              };

                              setScoreUpdateForm(updatedForm);
                              autoSaveScore(updatedForm);
                            }}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-colors"
                          >
                            -1
                          </button>
                        </div>
                      </div>

                      {/* Ball Count Control */}
                      <div>
                        <p className="text-xs text-gray-600 mb-2 font-medium">
                          Ball Count:
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const maxBalls =
                                scoreUpdateForm.totalBallsPerTeam || 30;
                              const currentBalls =
                                scoreUpdateForm.team1Score.balls;

                              if (currentBalls >= maxBalls) {
                                alert(`Cannot exceed ${maxBalls} balls!`);
                                return;
                              }

                              setUndoStack({
                                ...undoStack,
                                team1: [
                                  ...undoStack.team1,
                                  { ...scoreUpdateForm.team1Score },
                                ],
                              });

                              const newBalls = Math.min(
                                currentBalls + 1,
                                maxBalls
                              );

                              const updatedForm = {
                                ...scoreUpdateForm,
                                team1Score: {
                                  ...scoreUpdateForm.team1Score,
                                  balls: newBalls,
                                },
                              };

                              setScoreUpdateForm(updatedForm);
                              autoSaveScore(updatedForm);
                            }}
                            className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded-lg transition-colors text-lg"
                          >
                            ⚫ +1 Ball
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const currentBalls =
                                scoreUpdateForm.team1Score.balls;

                              if (currentBalls <= 0) {
                                alert("Balls cannot be negative!");
                                return;
                              }

                              setUndoStack({
                                ...undoStack,
                                team1: [
                                  ...undoStack.team1,
                                  { ...scoreUpdateForm.team1Score },
                                ],
                              });

                              const updatedForm = {
                                ...scoreUpdateForm,
                                team1Score: {
                                  ...scoreUpdateForm.team1Score,
                                  balls: Math.max(0, currentBalls - 1),
                                },
                              };

                              setScoreUpdateForm(updatedForm);
                              autoSaveScore(updatedForm);
                            }}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-colors text-lg"
                          >
                            ⚫ -1 Ball
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600 mb-2 font-medium">
                          Wicket:
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const currentWickets =
                                scoreUpdateForm.team1Score.wickets;

                              // Don't allow if already at 5 wickets
                              if (currentWickets >= 5) {
                                alert(
                                  `Cannot exceed 5 wickets! Team's innings is complete.`
                                );
                                return;
                              }

                              // Save current state to undo stack
                              setUndoStack({
                                ...undoStack,
                                team1: [
                                  ...undoStack.team1,
                                  { ...scoreUpdateForm.team1Score },
                                ],
                              });

                              const newWickets = Math.min(
                                currentWickets + 1,
                                5
                              );

                              const updatedForm = {
                                ...scoreUpdateForm,
                                team1Score: {
                                  ...scoreUpdateForm.team1Score,
                                  wickets: newWickets,
                                },
                              };

                              setScoreUpdateForm(updatedForm);
                              autoSaveScore(updatedForm);
                            }}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-colors"
                          >
                            Out
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const updatedForm = {
                                ...scoreUpdateForm,
                                team1Score: {
                                  ...scoreUpdateForm.team1Score,
                                  wickets: Math.max(
                                    0,
                                    scoreUpdateForm.team1Score.wickets - 1
                                  ),
                                },
                              };
                              setScoreUpdateForm(updatedForm);
                              autoSaveScore(updatedForm);
                            }}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
                          >
                            Undo Wicket
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Team 2 Score</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-gray-600">Runs</label>
                        <input
                          type="number"
                          placeholder="Runs"
                          className="input-field"
                          value={scoreUpdateForm.team2Score.runs}
                          onChange={(e) =>
                            setScoreUpdateForm({
                              ...scoreUpdateForm,
                              team2Score: {
                                ...scoreUpdateForm.team2Score,
                                runs: parseInt(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">
                          Wickets (max: 5)
                        </label>
                        <input
                          type="number"
                          placeholder="Wickets"
                          className="input-field"
                          max={5}
                          value={scoreUpdateForm.team2Score.wickets}
                          onChange={(e) => {
                            const newWickets = parseInt(e.target.value) || 0;
                            setScoreUpdateForm({
                              ...scoreUpdateForm,
                              team2Score: {
                                ...scoreUpdateForm.team2Score,
                                wickets: Math.min(newWickets, 5),
                              },
                            });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">
                          Balls (max: {scoreUpdateForm.totalBallsPerTeam})
                        </label>
                        <input
                          type="number"
                          placeholder="Balls"
                          className="input-field"
                          max={scoreUpdateForm.totalBallsPerTeam}
                          value={scoreUpdateForm.team2Score.balls}
                          onChange={(e) => {
                            const newBalls = parseInt(e.target.value) || 0;
                            const maxBalls =
                              scoreUpdateForm.totalBallsPerTeam || 30;
                            setScoreUpdateForm({
                              ...scoreUpdateForm,
                              team2Score: {
                                ...scoreUpdateForm.team2Score,
                                balls: Math.min(newBalls, maxBalls),
                              },
                            });
                          }}
                        />
                      </div>
                    </div>

                    {/* Quick Action Buttons for Team 2 */}
                    <div className="mt-4 space-y-2">
                      <div>
                        <p className="text-xs text-gray-600 mb-2 font-medium">
                          Quick Add Runs:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 6].map((runs) => (
                            <button
                              key={runs}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const currentWickets =
                                  scoreUpdateForm.team2Score.wickets;

                                // Don't allow if already at 5 wickets
                                if (currentWickets >= 5) {
                                  alert(
                                    `Team's innings is complete (5 wickets)!`
                                  );
                                  return;
                                }

                                // Save current state to undo stack
                                setUndoStack({
                                  ...undoStack,
                                  team2: [
                                    ...undoStack.team2,
                                    { ...scoreUpdateForm.team2Score },
                                  ],
                                });

                                const newRuns =
                                  scoreUpdateForm.team2Score.runs + runs;
                                const updatedForm = {
                                  ...scoreUpdateForm,
                                  team2Score: {
                                    ...scoreUpdateForm.team2Score,
                                    runs: newRuns,
                                  },
                                };

                                // Check if Team 2 has won by passing the target
                                const team1Runs =
                                  scoreUpdateForm.team1Score.runs;
                                if (newRuns > team1Runs) {
                                  updatedForm.result = `${
                                    scoreUpdateForm.team2Name
                                  } won by ${5 - currentWickets} wickets`;
                                  updatedForm.status = "completed";
                                }

                                setScoreUpdateForm(updatedForm);
                                autoSaveScore(updatedForm);
                              }}
                              className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg transition-colors"
                            >
                              {runs}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const currentRuns =
                                scoreUpdateForm.team2Score.runs;
                              if (currentRuns <= 0) {
                                alert("Runs cannot be negative!");
                                return;
                              }

                              setUndoStack({
                                ...undoStack,
                                team2: [
                                  ...undoStack.team2,
                                  { ...scoreUpdateForm.team2Score },
                                ],
                              });

                              const updatedForm = {
                                ...scoreUpdateForm,
                                team2Score: {
                                  ...scoreUpdateForm.team2Score,
                                  runs: Math.max(0, currentRuns - 1),
                                },
                              };

                              setScoreUpdateForm(updatedForm);
                              autoSaveScore(updatedForm);
                            }}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-colors"
                          >
                            -1
                          </button>
                        </div>
                      </div>

                      {/* Ball Count Control */}
                      <div>
                        <p className="text-xs text-gray-600 mb-2 font-medium">
                          Ball Count:
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const maxBalls =
                                scoreUpdateForm.totalBallsPerTeam || 30;
                              const currentBalls =
                                scoreUpdateForm.team2Score.balls;

                              if (currentBalls >= maxBalls) {
                                alert(`Cannot exceed ${maxBalls} balls!`);
                                return;
                              }

                              setUndoStack({
                                ...undoStack,
                                team2: [
                                  ...undoStack.team2,
                                  { ...scoreUpdateForm.team2Score },
                                ],
                              });

                              const newBalls = Math.min(
                                currentBalls + 1,
                                maxBalls
                              );

                              const updatedForm = {
                                ...scoreUpdateForm,
                                team2Score: {
                                  ...scoreUpdateForm.team2Score,
                                  balls: newBalls,
                                },
                              };

                              // Check if innings is complete and determine match result
                              const team1Runs = scoreUpdateForm.team1Score.runs;
                              const team2Runs = updatedForm.team2Score.runs;
                              const currentWickets =
                                scoreUpdateForm.team2Score.wickets;

                              // Check if Team 2 has won (passed target)
                              if (team2Runs > team1Runs) {
                                updatedForm.result = `${
                                  scoreUpdateForm.team2Name
                                } won by ${5 - currentWickets} wickets`;
                                updatedForm.status = "completed";
                              }
                              // Check if Team 2 innings is complete (reached max balls)
                              else if (newBalls >= maxBalls) {
                                // Team 2's innings is complete, determine winner
                                if (team1Runs > team2Runs) {
                                  updatedForm.result = `${
                                    scoreUpdateForm.team1Name
                                  } won by ${team1Runs - team2Runs} runs`;
                                } else {
                                  updatedForm.result = "Match Tied";
                                }
                                updatedForm.status = "completed";
                              }

                              setScoreUpdateForm(updatedForm);
                              autoSaveScore(updatedForm);
                            }}
                            className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded-lg transition-colors text-lg"
                          >
                            ⚫ +1 Ball
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const currentBalls =
                                scoreUpdateForm.team2Score.balls;

                              if (currentBalls <= 0) {
                                alert("Balls cannot be negative!");
                                return;
                              }

                              setUndoStack({
                                ...undoStack,
                                team2: [
                                  ...undoStack.team2,
                                  { ...scoreUpdateForm.team2Score },
                                ],
                              });

                              const updatedForm = {
                                ...scoreUpdateForm,
                                team2Score: {
                                  ...scoreUpdateForm.team2Score,
                                  balls: Math.max(0, currentBalls - 1),
                                },
                              };

                              setScoreUpdateForm(updatedForm);
                              autoSaveScore(updatedForm);
                            }}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-colors text-lg"
                          >
                            ⚫ -1 Ball
                          </button>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600 mb-2 font-medium">
                          Wicket:
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const currentWickets =
                                scoreUpdateForm.team2Score.wickets;

                              // Don't allow if already at 5 wickets
                              if (currentWickets >= 5) {
                                alert(
                                  `Cannot exceed 5 wickets! Team's innings is complete.`
                                );
                                return;
                              }

                              // Save current state to undo stack
                              setUndoStack({
                                ...undoStack,
                                team2: [
                                  ...undoStack.team2,
                                  { ...scoreUpdateForm.team2Score },
                                ],
                              });

                              const newWickets = Math.min(
                                currentWickets + 1,
                                5
                              );

                              const updatedForm = {
                                ...scoreUpdateForm,
                                team2Score: {
                                  ...scoreUpdateForm.team2Score,
                                  wickets: newWickets,
                                },
                              };

                              // Check if innings is complete (5 wickets) and determine match result
                              const team1Runs = scoreUpdateForm.team1Score.runs;
                              const team2Runs = updatedForm.team2Score.runs;

                              // Check if Team 2 has won (passed target)
                              if (team2Runs > team1Runs) {
                                updatedForm.result = `${
                                  scoreUpdateForm.team2Name
                                } won by ${5 - newWickets} wickets`;
                                updatedForm.status = "completed";
                              }
                              // Check if Team 2 innings is complete (5 wickets)
                              else if (newWickets >= 5) {
                                // Team 2's innings is complete, determine winner
                                if (team1Runs > team2Runs) {
                                  updatedForm.result = `${
                                    scoreUpdateForm.team1Name
                                  } won by ${team1Runs - team2Runs} runs`;
                                } else {
                                  updatedForm.result = "Match Tied";
                                }
                                updatedForm.status = "completed";
                              }

                              setScoreUpdateForm(updatedForm);
                              autoSaveScore(updatedForm);
                            }}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-colors"
                          >
                            Out
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const updatedForm = {
                                ...scoreUpdateForm,
                                team2Score: {
                                  ...scoreUpdateForm.team2Score,
                                  wickets: Math.max(
                                    0,
                                    scoreUpdateForm.team2Score.wickets - 1
                                  ),
                                },
                              };
                              setScoreUpdateForm(updatedForm);
                              autoSaveScore(updatedForm);
                            }}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
                          >
                            Undo Wicket
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <label className="text-xs text-gray-600 mb-2 block font-medium">
                      Match Status
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const updatedForm = {
                            ...scoreUpdateForm,
                            status: "upcoming",
                            result: "", // Clear result when setting to upcoming
                          };
                          setScoreUpdateForm(updatedForm);
                          autoSaveScore(updatedForm);
                        }}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                          scoreUpdateForm.status === "upcoming"
                            ? "bg-blue-500 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        📅 Upcoming
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const updatedForm = {
                            ...scoreUpdateForm,
                            status: "live",
                            result: "", // Clear result when setting to live
                          };
                          setScoreUpdateForm(updatedForm);
                          autoSaveScore(updatedForm);
                        }}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                          scoreUpdateForm.status === "live"
                            ? "bg-red-500 text-white shadow-md animate-pulse"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        🔴 Live
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const team1Runs =
                            scoreUpdateForm.team1Score?.runs || 0;
                          const team2Runs =
                            scoreUpdateForm.team2Score?.runs || 0;
                          const team1Wickets =
                            scoreUpdateForm.team1Score?.wickets || 0;
                          const team2Wickets =
                            scoreUpdateForm.team2Score?.wickets || 0;
                          const team1Name =
                            matches.find(
                              (m) => m.id === scoreUpdateForm.matchId
                            )?.team1Name || "Team 1";
                          const team2Name =
                            matches.find(
                              (m) => m.id === scoreUpdateForm.matchId
                            )?.team2Name || "Team 2";

                          let finalResult = "";

                          // Calculate result based on scores
                          if (team2Runs > team1Runs) {
                            finalResult = `${team2Name} won by ${
                              5 - team2Wickets
                            } wickets`;
                          } else if (team1Runs > team2Runs) {
                            finalResult = `${team1Name} won by ${
                              team1Runs - team2Runs
                            } runs`;
                          } else {
                            finalResult = "Match Tied";
                          }

                          const updatedForm = {
                            ...scoreUpdateForm,
                            status: "completed",
                            result: finalResult,
                          };
                          setScoreUpdateForm(updatedForm);
                          autoSaveScore(updatedForm);
                        }}
                        className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                          scoreUpdateForm.status === "completed"
                            ? "bg-green-500 text-white shadow-md"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        ✅ Completed
                      </button>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <label className="text-xs text-gray-600 mb-2 block">
                      {scoreUpdateForm.status === "completed"
                        ? "Match Result ✨"
                        : "Match Status 🏏"}
                    </label>
                    <div
                      className={`input-field font-semibold flex items-center min-h-[42px] ${
                        scoreUpdateForm.status === "completed"
                          ? "bg-green-50 text-green-800"
                          : "bg-blue-50 text-blue-800"
                      }`}
                    >
                      {(() => {
                        // Show final result if match is completed
                        if (scoreUpdateForm.status === "completed") {
                          return scoreUpdateForm.result || "Match completed";
                        }

                        // Show batting status for live matches
                        const team1Balls =
                          scoreUpdateForm.team1Score?.balls || 0;
                        const team1Wickets =
                          scoreUpdateForm.team1Score?.wickets || 0;
                        const maxBalls =
                          scoreUpdateForm.totalBallsPerTeam || 30;
                        const team1Name =
                          matches.find((m) => m.id === scoreUpdateForm.matchId)
                            ?.team1Name || "Team 1";
                        const team2Name =
                          matches.find((m) => m.id === scoreUpdateForm.matchId)
                            ?.team2Name || "Team 2";

                        // Check if Team 1 has finished batting
                        if (team1Balls >= maxBalls || team1Wickets >= 5) {
                          return `${team2Name} is batting`;
                        } else {
                          return `${team1Name} is batting`;
                        }
                      })()}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {scoreUpdateForm.status === "completed"
                        ? "Final result of the match"
                        : "Current batting team status"}
                    </p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                    <p className="text-green-800 text-sm font-medium">
                      ✅ Auto-save enabled! Scores save instantly when you click
                      any button above.
                    </p>
                  </div>

                  {/* Complete Match Button */}
                  {scoreUpdateForm.status === "completed" && (
                    <div className="border-t pt-4 mt-4">
                      <button
                        onClick={() => {
                          if (
                            confirm("Complete this match and create a new one?")
                          ) {
                            // Clear the form
                            setScoreUpdateForm({
                              matchId: "",
                              team1Score: { runs: 0, wickets: 0, balls: 0 },
                              team2Score: { runs: 0, wickets: 0, balls: 0 },
                              status: "live",
                              result: "",
                            });
                            // Redirect to matches tab to create new match
                            setActiveTab("matches");
                            alert(
                              "Match completed! Create a new match in the Matches tab."
                            );
                          }
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                      >
                        ✅ Complete Match & Create New Match
                      </button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        This will complete the current match and take you to
                        create a new one
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
