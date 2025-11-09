import { useState, useEffect } from 'react';
import axios from 'axios';

const TeamList = ({ onTeamClick }) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await axios.get('/api/teams');
      if (response.data.success) {
        setTeams(response.data.teams);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-xl text-gray-600">No teams available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {teams.map((team) => (
        <div
          key={team.id}
          className="card cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => onTeamClick && onTeamClick(team)}
        >
          <div className="flex items-center space-x-4">
            {team.logo ? (
              <img src={team.logo} alt={team.name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{team.shortName}</span>
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-gray-800">{team.name}</h3>
              <p className="text-sm text-gray-600">{team.shortName}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TeamList;

