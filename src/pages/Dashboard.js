import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/Firebase';
import {
  GiNewspaper,
} from 'react-icons/gi';
import {
  FiPlusCircle,
  FiUserCheck,
} from 'react-icons/fi';
import { MdCategory } from 'react-icons/md';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

// Register necessary Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [monthlyBlogs, setMonthlyBlogs] = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);
  const [topAuthor, setTopAuthor] = useState('N/A');
  const [monthlyData, setMonthlyData] = useState({
    labels: [],
    datasets: [],
  });

  const fetchBlogStats = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'blogs'));
      const blogs = snapshot.docs.map(doc => doc.data());

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const thisMonthCount = blogs.filter(blog => {
        const createdAt = new Date(blog.createdAt);
        return (
          createdAt.getMonth() === currentMonth &&
          createdAt.getFullYear() === currentYear
        );
      }).length;

      const categorySet = new Set();
      const categoryCountMap = {};
      const authorCountMap = {};

      blogs.forEach(blog => {
        if (blog.category) {
          categorySet.add(blog.category);
          categoryCountMap[blog.category] = (categoryCountMap[blog.category] || 0) + 1;
        }
        if (blog.author) {
          authorCountMap[blog.author] = (authorCountMap[blog.author] || 0) + 1;
        }
      });

      const topAuthor = Object.entries(authorCountMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      setTotalBlogs(blogs.length);
      setMonthlyBlogs(thisMonthCount);
      setTotalCategories(categorySet.size);
      setTopAuthor(topAuthor);

      // Set monthly blog data for the bar chart
      const months = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('default', { month: 'short' }));
      const monthlyCount = Array(12).fill(0);

      blogs.forEach(blog => {
        const createdAt = new Date(blog.createdAt);
        if (createdAt.getFullYear() === currentYear) {
          monthlyCount[createdAt.getMonth()] += 1;
        }
      });

      setMonthlyData({
        labels: months,
        datasets: [
          {
            label: 'Blogs Published',
            data: monthlyCount,
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  useEffect(() => {
    fetchBlogStats();
  }, []);

  const cardData = [
    {
      title: 'Total Blogs',
      value: totalBlogs,
      icon: <GiNewspaper className="text-4xl text-indigo-500" />,
    },
    {
      title: 'New This Month',
      value: monthlyBlogs,
      icon: <FiPlusCircle className="text-4xl text-green-500" />,
    },
    {
      title: 'Total Categories',
      value: totalCategories,
      icon: <MdCategory className="text-4xl text-pink-500" />,
    },
    {
      title: 'Top Author',
      value: topAuthor,
      icon: <FiUserCheck className="text-4xl text-blue-500" />,
    },
  ];

  return (
    <div className="p-4 space-y-6 min-h-screen bg-gray-50">
      <h2 className="text-lg pl-1 font-semibold mb-6 text-gray-800">Dashboard Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardData.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-md p-5 flex items-center gap-4"
          >
            {card.icon}
            <div>
              <p className="text-sm text-gray-500">{card.title}</p>
              <h3 className="text-md font-bold text-gray-800">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart for Monthly Blog Statistics */}
      <div className="bg-white rounded-xl shadow-md p-6 mt-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Monthly Blog Statistics</h3>
        {monthlyData.datasets.length > 0 ? (
          <Bar
            data={monthlyData}
            options={{
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: 'Blogs Published per Month',
                },
              },
              scales: {
                x: {
                  beginAtZero: true,
                },
                y: {
                  beginAtZero: true,
                },
              },
            }}
          />
        ) : (
          <p>Loading chart...</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
