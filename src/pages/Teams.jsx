import { useState, useEffect } from 'react';
import axios from 'axios';
import TeamList from '../components/TeamList';

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

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
    }
  };

  const handleTeamClick = (team) => {
    setSelectedTeam(team);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Teams</h1>
        <p className="text-gray-600">Browse all teams participating in the tournament</p>
      </div>

      {!selectedTeam ? (
        <TeamList onTeamClick={handleTeamClick} />
      ) : (
        <div className="space-y-6">
          <button
            onClick={() => {
              setSelectedTeam(null);
            }}
            className="btn-secondary"
          >
            ← Back to Teams
          </button>

          {/* Team Details */}
          <div className="card bg-gradient-to-r from-blue-500 to-blue-700 text-white">
            <div className="flex items-center space-x-4">
              {selectedTeam.logo ? (
                <img
                  src={selectedTeam.logo}
                  alt={selectedTeam.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center border-4 border-white">
                  <span className="text-3xl font-bold text-blue-600">{selectedTeam.shortName}</span>
                </div>
              )}
              <div>
                <h2 className="text-3xl font-bold">{selectedTeam.name}</h2>
                <p className="text-blue-100">{selectedTeam.shortName}</p>
              </div>
            </div>
          </div>

          {/* Team Info */}
          <div className="card">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Team Information</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-gray-600 font-medium">Team Name:</span>
                <span className="text-gray-800 font-bold">{selectedTeam.name}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <span className="text-gray-600 font-medium">Short Name:</span>
                <span className="text-gray-800 font-bold">{selectedTeam.shortName}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-gray-600 font-medium">Status:</span>
                <span className="text-green-600 font-bold">Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click instruction */}
      {!selectedTeam && teams.length > 0 && (
        <div className="text-center text-gray-500">
          <p>Click on any team to view details</p>
        </div>
      )}
    </div>
  );
};

export default Teams;

