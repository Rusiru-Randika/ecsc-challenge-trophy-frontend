import { useState, useEffect } from 'react';
import axios from 'axios';

const Standings = () => {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bracketConfig, setBracketConfig] = useState({
    groupA: ['', '', '', ''],
    groupB: ['', '', '', '']
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teamsRes, matchesRes] = await Promise.all([
        axios.get('/api/teams'),
        axios.get('/api/matches')
      ]);
      setTeams(teamsRes.data.teams || []);
      setMatches(matchesRes.data.matches || []);
      
      // Load bracket configuration
      const saved = localStorage.getItem('tournamentBracket');
      console.log('Tournament Bracket Config:', saved);
      if (saved) {
        const config = JSON.parse(saved);
        console.log('Parsed Config:', config);
        setBracketConfig(config);
      } else {
        console.log('No tournament bracket found in localStorage');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  // Calculate team statistics
  const calculateStandings = (groupTeamIds) => {
    const standings = groupTeamIds.map(teamId => {
      const team = teams.find(t => t.id === teamId);
      if (!team) return null;

      // Get all matches for this team
      const teamMatches = matches.filter(m => 
        (m.team1Id === teamId || m.team2Id === teamId) && 
        m.status === 'completed'
      );

      let wins = 0;
      let draws = 0;
      let losses = 0;
      let totalRuns = 0;
      let totalRunsConceded = 0;
      let totalBalls = 0;

      teamMatches.forEach(match => {
        const isTeam1 = match.team1Id === teamId;
        const teamScore = isTeam1 ? match.team1Score : match.team2Score;
        const oppScore = isTeam1 ? match.team2Score : match.team1Score;

        totalRuns += teamScore?.runs || 0;
        totalRunsConceded += oppScore?.runs || 0;
        totalBalls += teamScore?.balls || 0;

        // Determine win/draw/loss
        const teamRuns = teamScore?.runs || 0;
        const oppRuns = oppScore?.runs || 0;
        
        if (teamRuns > oppRuns) {
          wins++;
        } else if (teamRuns === oppRuns) {
          draws++;
        } else {
          losses++;
        }
      });

      const played = teamMatches.length;
      const points = wins * 2 + draws * 1; // 2 points per win, 1 point per draw
      const netRunRate = played > 0 ? ((totalRuns - totalRunsConceded) / (totalBalls || 1)).toFixed(2) : '0.00';

      return {
        team,
        played,
        wins,
        draws,
        losses,
        points,
        netRunRate: parseFloat(netRunRate),
        totalRuns,
        totalRunsConceded
      };
    }).filter(Boolean);

    // Sort by points (descending), then by net run rate (descending)
    return standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.netRunRate - a.netRunRate;
    });
  };

  const groupATeams = bracketConfig.groupA.filter(id => id);
  const groupBTeams = bracketConfig.groupB.filter(id => id);

  console.log('Group A Team IDs:', groupATeams);
  console.log('Group B Team IDs:', groupBTeams);
  console.log('All Teams:', teams.map(t => ({ id: t.id, name: t.name })));

  const groupAStandings = calculateStandings(groupATeams);
  const groupBStandings = calculateStandings(groupBTeams);
  
  console.log('Group A Standings:', groupAStandings);
  console.log('Group B Standings:', groupBStandings);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const StandingsTable = ({ standings, groupName, bgColor, borderColor }) => (
    <div className="card" style={{ backgroundColor: bgColor, borderColor: borderColor, borderWidth: '2px' }}>
      <div className={`px-4 py-3 -mx-6 -mt-6 mb-4 rounded-t-lg text-white font-bold text-center text-xl`}
           style={{ background: `linear-gradient(to right, ${borderColor}, ${borderColor}dd)` }}>
        {groupName}
      </div>

      {standings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <p>No teams assigned to this group yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2" style={{ borderColor: borderColor }}>
                <th className="text-left py-3 px-2 font-bold text-gray-700">#</th>
                <th className="text-left py-3 px-2 font-bold text-gray-700">Team</th>
                <th className="text-center py-3 px-2 font-bold text-gray-700">P</th>
                <th className="text-center py-3 px-2 font-bold text-gray-700">W</th>
                <th className="text-center py-3 px-2 font-bold text-gray-700">D</th>
                <th className="text-center py-3 px-2 font-bold text-gray-700">L</th>
                <th className="text-center py-3 px-2 font-bold text-gray-700">Pts</th>
                <th className="text-center py-3 px-2 font-bold text-gray-700">NRR</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, index) => (
                <tr 
                  key={standing.team.id} 
                  className={`border-b ${index < 2 ? 'bg-yellow-50' : ''}`}
                  style={index < 2 ? { borderLeftWidth: '4px', borderLeftColor: '#fbbf24' } : {}}
                >
                  <td className="py-3 px-2 font-semibold text-gray-600">{index + 1}</td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {standing.team.logo ? (
                        <img 
                          src={standing.team.logo} 
                          alt={standing.team.name}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                          {standing.team.shortName || standing.team.name.substring(0, 3).toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold">{standing.team.name}</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-2 font-medium">{standing.played}</td>
                  <td className="text-center py-3 px-2 font-medium text-green-600">{standing.wins}</td>
                  <td className="text-center py-3 px-2 font-medium text-gray-600">{standing.draws}</td>
                  <td className="text-center py-3 px-2 font-medium text-red-600">{standing.losses}</td>
                  <td className="text-center py-3 px-2 font-bold text-blue-600">{standing.points}</td>
                  <td className="text-center py-3 px-2 font-medium">
                    <span className={standing.netRunRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {standing.netRunRate >= 0 ? '+' : ''}{standing.netRunRate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {standings.length > 0 && (
            <div className="mt-3 text-xs text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-200">
              <strong>🏆 Top 2 teams</strong> qualify for the knockout stage
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">📊 Standings</h1>
        <p className="text-lg opacity-90">
          Group Stage Points Table
        </p>
      </div>

      {/* Legend */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="font-bold text-blue-800 mb-3">📖 Key</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><strong>P:</strong> Played</div>
          <div><strong>W:</strong> Won</div>
          <div><strong>D:</strong> Draw</div>
          <div><strong>L:</strong> Lost</div>
        </div>
        <div className="mt-3 text-sm">
          <div><strong>Pts:</strong> Points (Win = 2, Draw = 1, Loss = 0)</div>
          <div className="mt-2"><strong>NRR:</strong> Net Run Rate = (Runs Scored - Runs Conceded) / Balls Faced</div>
        </div>
      </div>

      {/* Standings Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <StandingsTable 
          standings={groupAStandings} 
          groupName="🟢 Group A Standings" 
          bgColor="#f0fdf4"
          borderColor="#16a34a"
        />
        <StandingsTable 
          standings={groupBStandings} 
          groupName="🔵 Group B Standings" 
          bgColor="#eff6ff"
          borderColor="#2563eb"
        />
      </div>

      {/* Stats Summary */}
      {(groupAStandings.length > 0 || groupBStandings.length > 0) && (
        <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-purple-300">
          <h3 className="font-bold text-purple-800 mb-4 text-xl">🎯 Qualification Scenarios</h3>
          <div className="space-y-3 text-sm">
            {groupAStandings.length >= 2 && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <strong className="text-green-800">Group A Qualifiers:</strong>
                <div className="mt-1">
                  <span className="font-semibold">1st: </span>{groupAStandings[0]?.team.name} ({groupAStandings[0]?.points} pts)
                  {groupAStandings[1] && (
                    <span className="ml-4"><span className="font-semibold">2nd: </span>{groupAStandings[1]?.team.name} ({groupAStandings[1]?.points} pts)</span>
                  )}
                </div>
              </div>
            )}
            {groupBStandings.length >= 2 && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <strong className="text-blue-800">Group B Qualifiers:</strong>
                <div className="mt-1">
                  <span className="font-semibold">1st: </span>{groupBStandings[0]?.team.name} ({groupBStandings[0]?.points} pts)
                  {groupBStandings[1] && (
                    <span className="ml-4"><span className="font-semibold">2nd: </span>{groupBStandings[1]?.team.name} ({groupBStandings[1]?.points} pts)</span>
                  )}
                </div>
              </div>
            )}
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <strong className="text-yellow-800">Semi-Final Matchups:</strong>
              <div className="mt-1 space-y-1">
                <div>• SF1: 1st Group A vs 2nd Group B</div>
                <div>• SF2: 1st Group B vs 2nd Group A</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {groupAStandings.length === 0 && groupBStandings.length === 0 && (
        <div className="card text-center py-12 bg-gradient-to-br from-orange-50 to-red-50 border-orange-300">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-2xl font-bold text-gray-700 mb-3">No Standings Available</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            The tournament hasn't been set up yet. Teams need to be assigned to groups and matches need to be created.
          </p>
          
          <div className="bg-white p-6 rounded-lg border-2 border-orange-300 max-w-2xl mx-auto text-left">
            <h4 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              How to Start the Tournament:
            </h4>
            <ol className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-3">
                <span className="font-bold text-orange-600 flex-shrink-0">1.</span>
                <span>Go to <strong>Admin Panel</strong> (login if needed with admin/admin123)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-orange-600 flex-shrink-0">2.</span>
                <span>Click the <strong>"Matches"</strong> tab</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-orange-600 flex-shrink-0">3.</span>
                <span>Click the <strong>"🏆 Start Tournament"</strong> button at the top</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-orange-600 flex-shrink-0">4.</span>
                <span>The system will automatically assign teams to Group A & B and create all 12 group matches</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-orange-600 flex-shrink-0">5.</span>
                <span>Return to this page to see the standings (they'll update as matches are completed)</span>
              </li>
            </ol>
          </div>
          
          {localStorage.getItem('token') && (
            <a 
              href="/admin"
              className="inline-block mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-lg transition-colors"
            >
              Go to Admin Panel →
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default Standings;

