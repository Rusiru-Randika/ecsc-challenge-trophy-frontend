import { Link } from 'react-router-dom';
import axios from 'axios';
import { useState, useEffect } from 'react';

const MatchCard = ({ match, onMatchUpdate, allMatches = [] }) => {
  const [isStarting, setIsStarting] = useState(false);

  const getStatusBadge = (status) => {
    const badges = {
      live: 'bg-red-500 text-white live-indicator',
      completed: 'bg-gray-500 text-white',
      upcoming: 'bg-blue-500 text-white'
    };
    
    return badges[status] || 'bg-gray-300 text-gray-800';
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleStartMatch = async () => {
    if (match.status !== 'upcoming') return;
    
    const confirmStart = window.confirm(
      `🏏 Start this match?\n\n${match.team1Name} vs ${match.team2Name}\n\nThis will make it the live match and you can start scoring.`
    );
    
    if (!confirmStart) return;
    
    setIsStarting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `/api/matches/${match.id}/score`,
        { status: 'live' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('✅ Match is now LIVE! Refresh to see updates or go to Admin Panel to update scores.');
      
      // Callback to refresh matches list
      if (onMatchUpdate) {
        onMatchUpdate();
      }
    } catch (error) {
      alert('⚠️ Error starting match. Please try again or use Admin Panel.');
      console.error('Error starting match:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const isUpcoming = match.status === 'upcoming';
  const isAdmin = !!localStorage.getItem('token');

  return (
    <div 
      className={`card transition-all duration-200 ${
        isUpcoming && isAdmin 
          ? 'hover:scale-[1.02] hover:shadow-xl cursor-pointer border-2 hover:border-blue-500' 
          : 'hover:scale-[1.02]'
      }`}
      onClick={isUpcoming && isAdmin ? handleStartMatch : undefined}
      style={isUpcoming && isAdmin ? { position: 'relative' } : {}}
    >
      {/* Click to Start Banner for Upcoming Matches */}
      {isUpcoming && isAdmin && (
        <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-center py-2 rounded-t-lg text-sm font-semibold">
          {isStarting ? '⏳ Starting Match...' : '👆 Click to Start Match'}
        </div>
      )}

      <div className={`flex justify-between items-start mb-4 ${isUpcoming && isAdmin ? 'mt-10' : ''}`}>
        <div>
          <div className="flex items-center gap-2">
            <h3 className={`text-lg font-bold ${
              match.matchType?.toLowerCase().includes('final') && !match.matchType?.toLowerCase().includes('semi')
                ? 'text-yellow-600'
                : match.matchType?.toLowerCase().includes('semi')
                ? 'text-orange-600'
                : 'text-gray-800'
            }`}>
              {(() => {
                // Determine match display name
                if (match.matchType?.toLowerCase().includes('semi') || 
                    (match.matchType?.toLowerCase().includes('final') && !match.matchType?.toLowerCase().includes('semi'))) {
                  return match.matchType;
                }
                
                // For group stage matches, show match number and group
                try {
                  const bracketConfig = JSON.parse(localStorage.getItem('tournamentBracket') || '{"groupA":[],"groupB":[]}');
                  const groupATeams = bracketConfig.groupA.filter(id => id);
                  const groupBTeams = bracketConfig.groupB.filter(id => id);
                  
                  const isGroupA = groupATeams.includes(match.team1Id) && groupATeams.includes(match.team2Id);
                  const isGroupB = groupBTeams.includes(match.team1Id) && groupBTeams.includes(match.team2Id);
                  
                  if (isGroupA || isGroupB) {
                    // Calculate match number within the group
                    const groupMatches = allMatches.filter(m => 
                      m.matchType === 'Tournament' && 
                      (isGroupA 
                        ? (groupATeams.includes(m.team1Id) && groupATeams.includes(m.team2Id))
                        : (groupBTeams.includes(m.team1Id) && groupBTeams.includes(m.team2Id)))
                    );
                    
                    const matchIndex = groupMatches.findIndex(m => m.id === match.id);
                    const matchNumber = matchIndex >= 0 ? matchIndex + 1 : '';
                    
                    if (isGroupA) {
                      return matchNumber ? `🟢 Group A - Match ${matchNumber}` : `🟢 Group A`;
                    } else {
                      return matchNumber ? `🔵 Group B - Match ${matchNumber}` : `🔵 Group B`;
                    }
                  }
                } catch (e) {
                  console.error('Error parsing bracket config:', e);
                }
                
                return match.matchType || 'Match';
              })()}
            </h3>
            {(match.matchType?.toLowerCase().includes('final') && !match.matchType?.toLowerCase().includes('semi')) && (
              <span className="text-2xl">🏆</span>
            )}
            {match.matchType?.toLowerCase().includes('semi') && (
              <span className="text-xl">🔥</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">{formatDate(match.date)}</p>
          {match.totalBallsPerTeam && (
            <p className="text-xs text-blue-600 font-medium mt-1">
              {match.totalBallsPerTeam} balls per team
            </p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusBadge(match.status)}`}>
          {match.status}
        </span>
      </div>

      <div className="space-y-3">
        {/* Team 1 */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3 flex-1">
            {match.team1Logo ? (
              <img 
                src={match.team1Logo} 
                alt={match.team1Name}
                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="40" fill="%234B5563"/%3E%3Ctext x="50" y="60" font-size="40" text-anchor="middle" fill="white"%3E' + match.team1Name.charAt(0) + '%3C/text%3E%3C/svg%3E';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-lg border-2 border-gray-200">
                {match.team1Name.charAt(0)}
              </div>
            )}
            <p className="font-semibold text-gray-800">{match.team1Name}</p>
          </div>
          {match.status !== 'upcoming' && (
            <div className="text-right">
              <p className="score-display text-xl font-bold">
                {match.team1Score?.runs || 0}/{match.team1Score?.wickets || 0}
              </p>
              <p className="text-sm text-gray-600">
                {match.team1Score?.balls || 0}/{match.totalBallsPerTeam || 30} balls
              </p>
            </div>
          )}
        </div>

        {/* VS */}
        <div className="text-center text-gray-400 font-semibold">VS</div>

        {/* Team 2 */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3 flex-1">
            {match.team2Logo ? (
              <img 
                src={match.team2Logo} 
                alt={match.team2Name}
                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="40" fill="%234B5563"/%3E%3Ctext x="50" y="60" font-size="40" text-anchor="middle" fill="white"%3E' + match.team2Name.charAt(0) + '%3C/text%3E%3C/svg%3E';
                }}
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-lg border-2 border-gray-200">
                {match.team2Name.charAt(0)}
              </div>
            )}
            <p className="font-semibold text-gray-800">{match.team2Name}</p>
          </div>
          {match.status !== 'upcoming' && (
            <div className="text-right">
              <p className="score-display text-xl font-bold">
                {match.team2Score?.runs || 0}/{match.team2Score?.wickets || 0}
              </p>
              <p className="text-sm text-gray-600">
                {match.team2Score?.balls || 0}/{match.totalBallsPerTeam || 30} balls
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Result or Status */}
      {match.status === 'completed' && match.result ? (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-semibold text-green-800 text-center">
            🏆 {match.result}
          </p>
        </div>
      ) : match.status === 'live' ? (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-semibold text-blue-800 text-center">
            🏏 {(() => {
              const team1Balls = match.team1Score?.balls || 0;
              const team1Wickets = match.team1Score?.wickets || 0;
              const maxBalls = match.totalBallsPerTeam || 30;
              
              // Check if Team 1 has finished batting
              if (team1Balls >= maxBalls || team1Wickets >= 5) {
                return `${match.team2Name} is batting`;
              } else {
                return `${match.team1Name} is batting`;
              }
            })()}
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default MatchCard;

