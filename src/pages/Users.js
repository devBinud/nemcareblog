import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/Firebase';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, 'blogs')); // Fetching blogs as the source for users
    const userList = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        authorImage: data.authorImage,
        author: data.author,
        designation: data.designation,
      };
    });
    setUsers(userList);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return <div className="text-center p-10 text-gray-600">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-5">
      <h2 className="text-lg pl-1 font-semibold mb-4 text-gray-800">User List</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {users.map(user => (
          <div key={user.id} className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
            <div className="flex items-center mb-4">
              {/* Author Image */}
              <img
                src={user.authorImage} // Displaying the author image
                alt="Author"
                className="w-16 h-16 object-cover rounded-full border-2 border-gray-300"
              />
              <div className="ml-4">
                {/* Author Name */}
                <h3 className="text-md font-semibold text-gray-800">{user.author}</h3>
                {/* Author Designation */}
                <p className="text-gray-600 text-sm">{user.designation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Users;
