import { useState, useEffect } from 'react';
import axios from 'axios';
import MatchCard from '../components/MatchCard';

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [filter, setFilter] = useState('upcoming'); // Show upcoming by default
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    try {
      const response = await axios.get('/api/matches');
      if (response.data.success) {
        // Show all matches including upcoming
        setMatches(response.data.matches || []);
        console.log('Fetched matches:', response.data.matches?.length || 0, response.data.matches);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching matches:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchMatches, 5000);

    return () => clearInterval(interval);
  }, []);

  // Sort matches to alternate between Group A and Group B
  const sortMatchesAlternating = (matchesToSort) => {
    const bracketConfig = JSON.parse(localStorage.getItem('tournamentBracket') || '{"groupA":[],"groupB":[]}');
    const groupATeams = bracketConfig.groupA.filter(id => id);
    const groupBTeams = bracketConfig.groupB.filter(id => id);
    
    // Separate matches by type
    const groupAMatches = [];
    const groupBMatches = [];
    const knockoutMatches = [];
    
    matchesToSort.forEach(match => {
      // Check if it's a knockout match
      if (match.matchType?.toLowerCase().includes('semi') || 
          (match.matchType?.toLowerCase().includes('final') && !match.matchType?.toLowerCase().includes('semi'))) {
        knockoutMatches.push(match);
      } else {
        // Check which group it belongs to
        const isGroupA = groupATeams.includes(match.team1Id) && groupATeams.includes(match.team2Id);
        const isGroupB = groupBTeams.includes(match.team1Id) && groupBTeams.includes(match.team2Id);
        
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
    const maxLength = Math.max(groupAMatches.length, groupBMatches.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (i < groupAMatches.length) {
        interleavedMatches.push(groupAMatches[i]);
      }
      if (i < groupBMatches.length) {
        interleavedMatches.push(groupBMatches[i]);
      }
    }
    
    // Add knockout matches at the end
    return [...interleavedMatches, ...knockoutMatches];
  };

  const filteredMatches = filter === 'all' 
    ? sortMatchesAlternating(matches)
    : sortMatchesAlternating(matches.filter(match => match.status === filter));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Matches</h1>
          <p className="text-gray-600">View all matches with live score updates</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchMatches();
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          <span>🔄</span> Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'All Matches', icon: '🏏' },
          { value: 'live', label: 'Live', icon: '🔴' },
          { value: 'upcoming', label: 'Upcoming', icon: '📅' },
          { value: 'completed', label: 'Completed', icon: '✅' }
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
              filter === tab.value
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Info Banner */}
      {matches.length === 0 && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            <strong>No matches in database.</strong> Go to Fixtures page and click "Start Tournament" to create tournament matches.
          </p>
        </div>
      )}
      
      {matches.length > 0 && filteredMatches.length === 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            <strong>{matches.length} matches found</strong> but none match the "{filter}" filter. 
            Try clicking "All Matches" to see all matches.
          </p>
        </div>
      )}

      {/* Matches Grid */}
      {filteredMatches.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🏏</div>
          <p className="text-xl text-gray-600">No {filter !== 'all' ? filter : ''} matches found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} onMatchUpdate={fetchMatches} allMatches={matches} />
          ))}
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mt-8">
        <div className="card text-center">
          <p className="text-3xl font-bold text-red-600">
            {matches.filter(m => m.status === 'live').length}
          </p>
          <p className="text-gray-600 font-medium">Live Now</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-600">
            {matches.filter(m => m.status === 'upcoming').length}
          </p>
          <p className="text-gray-600 font-medium">Upcoming</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">
            {matches.filter(m => m.status === 'completed').length}
          </p>
          <p className="text-gray-600 font-medium">Completed</p>
        </div>
      </div>
    </div>
  );
};

export default Matches;

