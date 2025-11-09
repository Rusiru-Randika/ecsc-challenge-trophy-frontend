import AdminDashboard from '../components/AdminDashboard';

const AdminPanel = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="opacity-90">Manage teams, matches, and live scores</p>
      </div>

      <AdminDashboard />
    </div>
  );
};

export default AdminPanel;

