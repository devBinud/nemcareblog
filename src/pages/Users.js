import React, { useEffect, useState } from 'react';

const API_URL = 'https://api.nemcare.com/api/blogs';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await fetch(API_URL);
      const json = await res.json();
      const blogs = json.data || json;
      const userList = blogs.map((blog) => ({
        id: blog.id,
        authorImage: blog.featured_image ? `https://api.nemcare.com${blog.featured_image}` : null,
        author: blog.author_name,
        designation: blog.author_designation,
        department: blog.department,
      }));
      setUsers(userList);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return <div className="text-center p-10 text-gray-600">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-5">
      <h2 className="text-lg pl-1 font-semibold mb-4 text-gray-800">Author List</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {users.map((user) => (
          <div key={user.id} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <div className="flex items-center mb-4">
              {/* <img
                src={user.authorImage || 'https://via.placeholder.com/64'}
                alt="Author"
                className="w-16 h-16 object-cover rounded-full border-2 border-gray-300"
              /> */}
              <div className="ml-4">
                <h3 className="text-md font-semibold text-gray-800">{user.author}</h3>
                <p className="text-gray-600 text-sm">{user.designation}</p>
                {user.department && <p className="text-gray-400 text-xs">{user.department}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Users;
