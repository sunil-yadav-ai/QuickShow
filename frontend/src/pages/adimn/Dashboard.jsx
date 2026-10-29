import {
    ChartLineIcon,
    CircleDollarSignIcon,
    PlayCircleIcon,
    StarIcon,
    Users2Icon
} from 'lucide-react';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import Loading from '../../components/Loading';
import Title from '../../components/admin/Title';
import BlurCircle from '../../components/BlurCircle';
import { dateFormat } from '../../lib/dateFormat';
import { useAppContext } from '../../context/AppContex';

const Dashboard = () => {
    const { axios, getToken, user, image_base_url } = useAppContext();

    const currency = import.meta.env.VITE_CURRENCY;

    const [dashboardData, setDashboardData] = useState({
        totalBookings: 0,
        totalRevenue: 0,
        activeShows: [],
        totalUser: 0
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Dashboard cards
    const dashboardCards = [
        {
            title: 'Total Bookings',
            value: dashboardData.totalBookings ?? 0,
            icon: ChartLineIcon
        },
        {
            title: 'Total Revenue',
            value: `${currency}${dashboardData.totalRevenue ?? 0}`,
            icon: CircleDollarSignIcon
        },
        {
            title: 'Active Shows',
            value: dashboardData.activeShows.length,
            icon: PlayCircleIcon
        },
        {
            title: 'Total Users',
            value: dashboardData.totalUser ?? 0,
            icon: Users2Icon
        }
    ];

    // Fetch dashboard data
    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(false);

            const token = await getToken();

            if (!token) {
                throw new Error('Authentication token not found');
            }

            const { data } = await axios.get('/api/admin/dashboard', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (data.success) {
                setDashboardData({
                    totalBookings: data.dashboardData?.totalBookings ?? 0,
                    totalRevenue: data.dashboardData?.totalRevenue ?? 0,
                    activeShows: data.dashboardData?.activeShows ?? [],
                    totalUser: data.dashboardData?.totalUser ?? 0
                });
            } else {
                throw new Error(
                    data.message || 'Failed to fetch dashboard data'
                );
            }
        } catch (e) {
            console.error(
                'Error fetching dashboard data:',
                e.response?.data || e.message
            );

            setError(true);

            toast.error(
                e.response?.data?.message ||
                e.message ||
                'Error fetching dashboard data'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    // Loading state
    if (loading) {
        return <Loading />;
    }

    // Error state
    if (error) {
        return (
            <div className="p-6">
                <Title text1="Admin" text2="Dashboard" />

                <p className="mt-8 text-red-400">
                    Unable to load dashboard data.
                </p>

                <button
                    type="button"
                    onClick={fetchDashboardData}
                    className="mt-4 bg-primary text-white px-5 py-2 rounded hover:bg-primary/90"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Dashboard Title */}
            <Title text1="Admin" text2="Dashboard" />

            {/* Dashboard Cards */}
            <div className="relative flex flex-wrap gap-4 mt-6">
                <BlurCircle top="-100px" left="0" />

                <div className="flex flex-wrap gap-4 w-full">
                    {dashboardCards.map((card) => {
                        const Icon = card.icon;

                        return (
                            <div
                                key={card.title}
                                className="flex items-center justify-between px-4 py-3 bg-primary/10 border border-primary/20 rounded-md w-full sm:w-[calc(50%-8px)] xl:w-[calc(25%-12px)]"
                            >
                                <div>
                                    <h1 className="text-sm text-gray-400">
                                        {card.title}
                                    </h1>

                                    <p className="text-xl font-medium mt-1">
                                        {card.value}
                                    </p>
                                </div>

                                <Icon className="w-6 h-6" />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Active Shows */}
            <p className="mt-10 text-lg font-medium">
                Active Shows
            </p>

            <div className="relative flex flex-wrap gap-6 mt-4 max-w-5xl">
                <BlurCircle top="100px" left="-10%" />

                {dashboardData.activeShows.length > 0 ? (
                    dashboardData.activeShows.map((show) => (
                        <div
                            key={show._id}
                            className="w-55 rounded-lg overflow-hidden h-full pb-3 bg-primary/10 border border-primary/20 hover:-translate-y-1 transition duration-300"
                        >
                            {/* Movie Poster */}
                            {/* Movie Poster */}
{/* Movie Poster */}
<img
    src={
        show.movie?.poster_path
            ? show.movie.poster_path.startsWith('http')
                ? show.movie.poster_path
                : `${image_base_url}${show.movie.poster_path}`
            : ''
    }
    alt={show.movie?.title || 'Movie poster'}
    width="500"
    height="750"
    loading="lazy"
    decoding="async"
    onError={(e) => {
        console.log('Image failed to load:', e.currentTarget.src);
    }}
    className="h-60 w-full object-cover"
/>

                            {/* Movie Title */}
                            <p className="font-medium p-2 truncate">
                                {show.movie?.title || 'Unknown Movie'}
                            </p>

                            {/* Price and Rating */}
                            <div className="flex items-center justify-between px-2">
                                <p className="text-lg font-medium">
                                    {currency}{show.showPrice ?? 0}
                                </p>

                                <p className="flex items-center gap-1 text-sm text-gray-400 mt-1 pr-1">
                                    <StarIcon className="w-4 h-4 text-primary fill-primary" />

                                    {Number(
                                        show.movie?.vote_average ?? 0
                                    ).toFixed(1)}
                                </p>
                            </div>

                            {/* Show Date */}
                            <p className="px-2 pt-2 text-sm text-gray-500">
                                {show.showDateTime
                                    ? dateFormat(show.showDateTime)
                                    : 'Date not available'}
                            </p>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-400 mt-2">
                        No active shows available.
                    </p>
                )}
            </div>
        </>
    );
};

export default Dashboard;