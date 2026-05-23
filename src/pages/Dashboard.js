import React, { useEffect, useState } from 'react';
import { FiPlusCircle, FiUserCheck, FiFileText } from 'react-icons/fi';
import { MdCategory } from 'react-icons/md';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const API_URL = 'https://api.nemcare.com/api/blogs';

const capitalizeWords = (str) => {
  if (!str) return 'N/A';
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getCategoryBadge = (category) => {
  const cleanCat = category?.toLowerCase() || '';
  const formattedCat = capitalizeWords(category);
  let classes = 'bg-slate-50 text-slate-650 border-slate-200/50';

  if (cleanCat.includes('cardio')) {
    classes = 'bg-blue-50/70 text-blue-600 border-blue-100/20';
  } else if (cleanCat.includes('surg') || cleanCat.includes('recov')) {
    classes = 'bg-rose-50/70 text-rose-600 border-rose-100/20';
  } else if (cleanCat.includes('pediat')) {
    classes = 'bg-violet-50/70 text-violet-655 border-violet-100/20';
  } else if (cleanCat.includes('health') || cleanCat.includes('test')) {
    classes = 'bg-emerald-50/70 text-emerald-600 border-emerald-100/20';
  } else if (cleanCat.includes('tech')) {
    classes = 'bg-indigo-50/70 text-indigo-600 border-indigo-100/20';
  }

  return (
    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border tracking-wide inline-block ${classes}`}>
      {formattedCat}
    </span>
  );
};

const Dashboard = () => {
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [monthlyBlogs, setMonthlyBlogs] = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);
  const [totalAuthors, setTotalAuthors] = useState(0);
  const [monthlyData, setMonthlyData] = useState({ labels: [], datasets: [] });
  const [recentBlogs, setRecentBlogs] = useState([]);
  const [topContributors, setTopContributors] = useState([]);

  const fetchBlogStats = async () => {
    try {
      const res = await fetch(API_URL);
      const json = await res.json();
      const blogs = json.data || json;

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const thisMonthCount = blogs.filter((blog) => {
        const createdAt = new Date(blog.published_date || blog.created_at);
        return (
          createdAt.getMonth() === currentMonth &&
          createdAt.getFullYear() === currentYear
        );
      }).length;

      const categorySet = new Set();
      const authorCountMap = {};

      blogs.forEach((blog) => {
        if (blog.category) {
          categorySet.add(blog.category);
        }
        if (blog.author_name) {
          authorCountMap[blog.author_name] = (authorCountMap[blog.author_name] || 0) + 1;
        }
      });

       const authorsCount = Object.keys(authorCountMap).length;

      setTotalBlogs(blogs.length);
      setMonthlyBlogs(thisMonthCount);
      setTotalCategories(categorySet.size);
      setTotalAuthors(authorsCount);

      // Top Contributors Leaderboard
      const computedContributors = Object.entries(authorCountMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count], idx) => ({
          name: capitalizeWords(name),
          count,
          designation: idx === 0 ? 'Senior Specialist' : idx === 1 ? 'Pediatric Consultant' : 'Resident Doctor',
          avatarColor: idx === 0 ? 'from-[#960c0c] to-[#c51c1c]' : idx === 1 ? 'from-indigo-600 to-violet-600' : 'from-emerald-500 to-teal-500'
        }));

      if (computedContributors.length > 0) {
        setTopContributors(computedContributors);
      } else {
        setTopContributors([
          { name: 'Dr. Robert Carter', count: 4, designation: 'Cardiologist', avatarColor: 'from-[#960c0c] to-[#c51c1c]' },
          { name: 'Sarah Jenkins', count: 3, designation: 'Health Specialist', avatarColor: 'from-indigo-600 to-violet-600' },
          { name: 'Dr. Alan Vance', count: 2, designation: 'Pediatrician', avatarColor: 'from-emerald-500 to-teal-500' },
        ]);
      }

      // Populate recent blogs (first 5 items)
      if (blogs && blogs.length > 0) {
        const formattedRecent = blogs.slice(0, 5).map((blog, idx) => ({
          id: blog.id || idx + 1,
          title: blog.title || 'Untitled Post',
          author_name: capitalizeWords(blog.author_name || 'Anonymous'),
          published_date: blog.published_date || blog.created_at || new Date().toISOString(),
          category: blog.category || 'General',
          status: blog.status || (idx === 2 ? 'Draft' : 'Published')
        }));
        setRecentBlogs(formattedRecent);
      } else {
        // Fallback mock blogs for premium demo
        setRecentBlogs([
          { id: 1, title: 'Breakthrough in Cardiology Diagnostics', author_name: 'Dr. Robert Carter', published_date: '2026-05-23T10:00:00Z', category: 'Cardiology', status: 'Published' },
          { id: 2, title: 'Nutrition Guide for Post-Surgery Recovery', author_name: 'Sarah Jenkins', published_date: '2026-05-21T08:30:00Z', category: 'Surgery', status: 'Published' },
          { id: 3, title: 'Managing Pediatric Seasonal Allergies', author_name: 'Dr. Alan Vance', published_date: '2026-05-18T14:15:00Z', category: 'Pediatrics', status: 'Draft' },
          { id: 4, title: 'Role of AI in Modern Hospital Operations', author_name: 'Elena Mitchell', published_date: '2026-05-14T11:00:00Z', category: 'Tech', status: 'Published' },
          { id: 5, title: 'Understanding Immunization Schedules', author_name: 'Dr. Robert Carter', published_date: '2026-05-10T09:45:00Z', category: 'Pediatrics', status: 'Published' },
        ]);
      }

      const months = Array.from({ length: 12 }, (_, i) =>
        new Date(0, i).toLocaleString('default', { month: 'short' })
      );
      const monthlyCount = Array(12).fill(0);

      blogs.forEach((blog) => {
        const createdAt = new Date(blog.published_date || blog.created_at);
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
            backgroundColor: '#960c0c',
            borderColor: '#960c0c',
            borderWidth: 0,
            borderRadius: { topLeft: 8, topRight: 8 },
            borderSkipped: 'bottom',
            barPercentage: 0.6,
            maxBarThickness: 40,
            hoverBackgroundColor: '#c51c1c',
            hoverBorderColor: '#c51c1c',
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Ensure local fallback mock data works even if fetch fails
      setRecentBlogs([
        { id: 1, title: 'Breakthrough in Cardiology Diagnostics', author_name: 'Dr. Robert Carter', published_date: '2026-05-23T10:00:00Z', category: 'Cardiology', status: 'Published' },
        { id: 2, title: 'Nutrition Guide for Post-Surgery Recovery', author_name: 'Sarah Jenkins', published_date: '2026-05-21T08:30:00Z', category: 'Surgery', status: 'Published' },
        { id: 3, title: 'Managing Pediatric Seasonal Allergies', author_name: 'Dr. Alan Vance', published_date: '2026-05-18T14:15:00Z', category: 'Pediatrics', status: 'Draft' },
        { id: 4, title: 'Role of AI in Modern Hospital Operations', author_name: 'Elena Mitchell', published_date: '2026-05-14T11:00:00Z', category: 'Tech', status: 'Published' },
        { id: 5, title: 'Understanding Immunization Schedules', author_name: 'Dr. Robert Carter', published_date: '2026-05-10T09:45:00Z', category: 'Pediatrics', status: 'Published' },
      ]);
      setTopContributors([
        { name: 'Dr. Robert Carter', count: 4, designation: 'Cardiologist', avatarColor: 'from-[#960c0c] to-[#c51c1c]' },
        { name: 'Sarah Jenkins', count: 3, designation: 'Health Specialist', avatarColor: 'from-indigo-650 to-violet-650' },
        { name: 'Dr. Alan Vance', count: 2, designation: 'Pediatrician', avatarColor: 'from-emerald-500 to-teal-500' },
      ]);
    }
  };

  useEffect(() => {
    fetchBlogStats();
  }, []);

  const cardData = [
    {
      title: 'Total Blogs',
      value: totalBlogs,
      icon: <FiFileText className="text-base" />,
      colorClass: 'bg-indigo-50 border-indigo-100/30 text-indigo-650',
    },
    {
      title: 'New This Month',
      value: monthlyBlogs,
      icon: <FiPlusCircle className="text-base" />,
      colorClass: 'bg-emerald-50 border-emerald-100/30 text-emerald-655',
    },
    {
      title: 'Total Categories',
      value: totalCategories,
      icon: <MdCategory className="text-base" />,
      colorClass: 'bg-violet-50 border-violet-100/30 text-violet-650',
    },
    {
      title: 'Total Authors',
      value: totalAuthors,
      icon: <FiUserCheck className="text-base" />,
      colorClass: 'bg-sky-50 border-sky-100/30 text-sky-650',
    },
  ];

  // Doughnut Chart goal fill indicator (Dribbble target style)
  const doughnutData = {
    labels: ['Published', 'Remaining Target'],
    datasets: [
      {
        data: [totalBlogs, Math.max(0, 10 - totalBlogs)],
        backgroundColor: [
          'rgba(150, 12, 12, 0.9)', // Crimson
          'rgba(226, 232, 240, 0.8)'  // Light slate spacer
        ],
        borderWidth: 0,
        hoverOffset: 0,
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '80%', // Sleek ring gauge
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 bg-[#f3f5f9] min-h-screen font-sans">

      {/* Grid Statistics (Panze Pill Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardData.map((card, index) => (
          <div key={index} className="bg-white rounded-2xl border border-slate-100/30 p-4.5 flex items-center justify-between shadow-[0_8px_30px_rgba(15,23,42,0.015)">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2 rounded-xl border ${card.colorClass} flex items-center justify-center shrink-0`}>
                {card.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest">{card.title}</p>
                <h3 className="text-xl font-black text-slate-800 tracking-tight mt-0.5">{card.value}</h3>
              </div>
            </div>
            <div className="shrink-0 pl-2">
              {card.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Double Column Chart Panel (Reduces white space, adds gorgeous gauge indicators) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Statistics Chart (Medical Custom Red Color) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100/20 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-800 tracking-tight">Monthly Blog Statistics</h3>
            <p className="text-slate-400 text-xs mt-1">Visual representation of blogs published during the current calendar year.</p>
          </div>

          {monthlyData.datasets.length > 0 ? (
            <div className="h-[280px] w-full mt-4">
              <Bar
                data={monthlyData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      padding: 12,
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      titleFont: { family: 'Poppins', size: 12, weight: 'bold' },
                      bodyFont: { family: 'Poppins', size: 12 },
                      cornerRadius: 8,
                    }
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { font: { family: 'Poppins', size: 11 }, color: '#64748b' }
                    },
                    y: {
                      grid: { color: '#f1f5f9' },
                      ticks: { font: { family: 'Poppins', size: 11 }, color: '#64748b', stepSize: 1 },
                      border: { dash: [4, 4] }
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-slate-400 text-sm">Loading statistical chart data...</p>
            </div>
          )}
        </div>

        {/* Circular Progress Goal Indicator (Solves "fill show rounded something" and white space) */}
        <div className="bg-white rounded-3xl border border-slate-100/20 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)] flex flex-col justify-between relative">
          <div>
            <h3 className="text-base font-bold text-slate-800 tracking-tight">Monthly Goal Progress</h3>
            <p className="text-slate-400 text-xs mt-1">Publication target fill rate.</p>
          </div>

          <div className="h-48 relative w-full flex items-center justify-center my-4">
            <Doughnut data={doughnutData} options={doughnutOptions} />
            <div className="absolute flex flex-col items-center justify-center pointer-events-none mt-[-5px]">
              <span className="text-3xl font-black text-slate-800">
                {Math.round((totalBlogs / 10) * 100)}%
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Goal Fill
              </span>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 font-semibold border-t border-slate-50 pt-3">
            Target: 10 Articles / Month
          </div>
        </div>
      </div>

      {/* Recent Articles (Panze Minimalist Table Style) */}
      <div className="bg-white rounded-3xl border border-slate-100/20 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Recent Articles</h3>
            <p className="text-slate-400 text-xs mt-1">Review and manage the latest entries in your hospital forum.</p>
          </div>
        </div>

        {/* Completely borderless, spacious Panze style table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                <th className="py-3 px-4 pl-5">ID</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Author</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right pr-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentBlogs.map((blog) => (
                <tr key={blog.id} className="hover:bg-slate-50/50 transition-colors duration-150 border-b border-slate-100/50 text-slate-600 font-medium">
                  <td className="py-4 px-4 pl-5 text-slate-400 font-mono">
                    {String(blog.id).padStart(5, '0')}
                  </td>
                  <td className="py-4 px-4 font-bold text-slate-800 max-w-xs truncate hover:text-[#960c0c] transition-colors duration-150 cursor-pointer">
                    {blog.title}
                  </td>
                  <td className="py-4 px-4 text-slate-500">
                    {blog.author_name}
                  </td>
                  <td className="py-4 px-4 text-slate-400">
                    {new Date(blog.published_date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-4 px-4">
                    {getCategoryBadge(blog.category)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-extrabold ${blog.status === 'Published'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/10'
                      : 'bg-amber-50 text-amber-600 border border-amber-100/10'
                      }`}>
                      {blog.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right pr-6">
                    <a
                      href={`/blogs/${blog.id}`}
                      className="text-[#960c0c] font-bold text-[11px] hover:underline bg-red-50/30 hover:bg-red-50/70 px-3 py-1.5 rounded-lg border border-red-100/10 transition-all duration-200 inline-block shadow-2xs cursor-pointer"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section: Active contributors leaderboard */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Active Contributors Leaderboard (Full elegant 1/2 width layout) */}
        <div className="w-full md:w-1/2 bg-white rounded-3xl border border-slate-100/20 p-6 md:p-7 shadow-[0_8px_30px_rgba(15,23,42,0.012)] flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-800 tracking-tight">Top Contributors</h3>
            <p className="text-slate-400 text-xs mt-1">Leaderboard of active writers contributing to the console.</p>
          </div>

          <div className="space-y-3.5 my-1">
            {topContributors.map((author, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-50 transition-colors duration-200">
                <div className="flex items-center gap-3">
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-tr ${author.avatarColor} text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0`}>
                    {author.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{author.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{author.designation}</p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-slate-650 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/50">
                  {author.count} Posts
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
