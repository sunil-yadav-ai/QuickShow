import React, { useEffect, useState } from 'react';
import { CheckIcon, DeleteIcon, StarIcon } from 'lucide-react';
import toast from 'react-hot-toast';

import Loading from '../../components/Loading';
import Title from '../../components/admin/Title';
import { kConverter } from '../../lib/kConverter';
import { useAppContext } from '../../context/AppContex';

const Addshow = () => {
    const { axios, getToken, user, image_base_url } = useAppContext();

    const currency = import.meta.env.VITE_CURRENCY;

    const [nowPlayingMovies, setNowPlayingMovies] = useState([]);
    const [selectedMovie, setSelectedMovie] = useState(null);
    const [dateTimeSelection, setDateTimeSelection] = useState({});
    const [dateTimeInput, setDateTimeInput] = useState('');
    const [showPrice, setShowPrice] = useState('');
    const [addingShow, setAddingShow] = useState(false);

    const [isMoviesLoading, setIsMoviesLoading] = useState(true);
    const [movieFetchError, setMovieFetchError] = useState(false);

    // Fetch now-playing movies
    const fetchNowPlayingMovies = async () => {
        try {
            setIsMoviesLoading(true);
            setMovieFetchError(false);

            const token = await getToken();

            const { data } = await axios.get('/api/show/now-playing', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (data.success) {
                setNowPlayingMovies(data.movies || []);
            } else {
                setMovieFetchError(true);
                toast.error(data.message || 'Failed to fetch movies');
            }
        } catch (error) {
            console.error(
                'Error fetching movies:',
                error.response?.data || error.message
            );

            setMovieFetchError(true);

            toast.error(
                error.response?.data?.message || 'Failed to fetch movies'
            );
        } finally {
            setIsMoviesLoading(false);
        }
    };

    // Add selected date and time
    const handleDateTimeAdd = () => {
        if (!dateTimeInput) {
            toast.error('Please select a date and time');
            return;
        }

        const [date, time] = dateTimeInput.split('T');

        if (!date || !time) {
            toast.error('Invalid date or time');
            return;
        }

        setDateTimeSelection((prev) => {
            const times = prev[date] || [];

            if (times.includes(time)) {
                toast.error('This time is already selected');
                return prev;
            }

            return {
                ...prev,
                [date]: [...times, time].sort()
            };
        });
    };

    // Remove selected time
    const handleRemoveTime = (date, time) => {
        setDateTimeSelection((prev) => {
            const filteredTimes = (prev[date] || []).filter(
                (selectedTime) => selectedTime !== time
            );

            if (filteredTimes.length === 0) {
                const { [date]: removedDate, ...rest } = prev;
                return rest;
            }

            return {
                ...prev,
                [date]: filteredTimes
            };
        });
    };

    // Submit show details
    const handleSubmit = async () => {
        if (!selectedMovie) {
            toast.error('Please select a movie');
            return;
        }

        if (Object.keys(dateTimeSelection).length === 0) {
            toast.error('Please select at least one date and time');
            return;
        }

        if (
            !showPrice ||
            !Number.isFinite(Number(showPrice)) ||
            Number(showPrice) <= 0
        ) {
            toast.error('Please enter a valid show price');
            return;
        }

        try {
            setAddingShow(true);

            const showInput = Object.entries(dateTimeSelection).map(
                ([date, times]) => ({
                    date,
                    time: times
                })
            );

            const payload = {
                // Backend controller previously shared by you expects movie_id.
                movie_id: selectedMovie,
                showInput,
                showPrice: Number(showPrice)
            };

            const token = await getToken();

            if (!token) {
                toast.error('Please sign in again');
                return;
            }

            const { data } = await axios.post(
                '/api/show/add',
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            if (data.success) {
                toast.success(data.message || 'Show added successfully');

                setSelectedMovie(null);
                setDateTimeSelection({});
                setDateTimeInput('');
                setShowPrice('');
            } else {
                toast.error(data.message || 'Failed to add show');
            }
        } catch (error) {
            console.error(
                'Error adding show:',
                error.response?.data || error.message
            );

            toast.error(
                error.response?.data?.message ||
                'Something went wrong while adding the show'
            );
        } finally {
            setAddingShow(false);
        }
    };

    // Fetch movies when user is available
    useEffect(() => {
        if (user) {
            fetchNowPlayingMovies();
        }
    }, [user]);

    // Loading state
    if (isMoviesLoading) {
        return <Loading />;
    }

    // Error state
    if (movieFetchError) {
        return (
            <div className="p-6">
                <Title text1="Add" text2="Shows" />

                <div className="mt-8">
                    <p className="text-red-400 mb-4">
                        Unable to load movies. Please try again.
                    </p>

                    <button
                        type="button"
                        onClick={fetchNowPlayingMovies}
                        className="bg-primary text-white px-5 py-2 rounded hover:bg-primary/90"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Empty state
    if (nowPlayingMovies.length === 0) {
        return (
            <div className="p-6">
                <Title text1="Add" text2="Shows" />

                <p className="mt-8 text-gray-400">
                    No movies are currently available.
                </p>

                <button
                    type="button"
                    onClick={fetchNowPlayingMovies}
                    className="mt-4 bg-primary text-white px-5 py-2 rounded hover:bg-primary/90"
                >
                    Refresh Movies
                </button>
            </div>
        );
    }

    return (
        <>
            <Title text1="Add" text2="Shows" />

            {/* Now Playing Movies */}
            <p className="mt-10 text-lg font-medium">
                Now Playing Movies
            </p>

            <div className="pb-4">
                <div className="group flex flex-wrap gap-4 mt-4">

                    {nowPlayingMovies.map((movie) => (
                        <div
                            key={movie.id}
                            onClick={() => setSelectedMovie(movie.id)}
                            className={`relative max-w-40 cursor-pointer hover:-translate-y-1 transition duration-300 ${
                                selectedMovie === movie.id
                                    ? 'ring-2 ring-primary rounded-lg'
                                    : ''
                            }`}
                        >
                            <div className="relative rounded-lg overflow-hidden">

                                <img
                                    src={
                                        image_base_url + movie.poster_path
                                    }
                                    alt={movie.title}
                                    width="500"
                                    height="750"
                                    loading="lazy"
                                    decoding="async"
                                    className="aspect-[2/3] w-full object-cover brightness-90"
                                />

                                {/* Movie Rating and Votes */}
                                <div className="text-sm flex items-center justify-between p-2 bg-black/70 w-full absolute bottom-0 left-0">

                                    <p className="flex items-center gap-1 text-gray-400">
                                        <StarIcon className="w-4 h-4 text-primary fill-primary" />

                                        {Number(movie.vote_average || 0).toFixed(1)}
                                    </p>

                                    <p className="text-gray-300">
                                        {kConverter(movie.vote_count || 0)} Votes
                                    </p>
                                </div>

                                {/* Selected Movie Icon */}
                                {selectedMovie === movie.id && (
                                    <div className="absolute top-2 right-2 flex items-center justify-center bg-primary h-6 w-6 rounded">
                                        <CheckIcon
                                            className="w-4 h-4 text-white"
                                            strokeWidth={2.5}
                                        />
                                    </div>
                                )}
                            </div>

                            <p className="font-medium truncate mt-1">
                                {movie.title}
                            </p>

                            <p className="text-gray-400 text-sm">
                                {movie.release_date}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Show Price */}
            <div className="mt-8">
                <label className="block text-sm font-medium mb-2">
                    Show Price
                </label>

                <div className="inline-flex items-center gap-2 border border-gray-600 px-3 py-2 rounded-md">
                    <p className="text-gray-400 text-sm">
                        {currency}
                    </p>

                    <input
                        min="1"
                        step="any"
                        type="number"
                        value={showPrice}
                        onChange={(e) => setShowPrice(e.target.value)}
                        placeholder="Enter show price"
                        className="outline-none bg-transparent"
                    />
                </div>
            </div>

            {/* Select Date and Time */}
            <div className="mt-6">
                <label className="block text-sm font-medium mb-2">
                    Select Date and Time
                </label>

                <div className="inline-flex flex-wrap items-center gap-3 border border-gray-600 p-2 rounded-lg">

                    <input
                        type="datetime-local"
                        value={dateTimeInput}
                        onChange={(e) => setDateTimeInput(e.target.value)}
                        className="outline-none rounded-md px-2 py-2 bg-transparent"
                    />

                    <button
                        type="button"
                        onClick={handleDateTimeAdd}
                        className="bg-primary/80 text-white px-3 py-2 text-sm rounded-lg hover:bg-primary cursor-pointer"
                    >
                        Add Time
                    </button>
                </div>
            </div>

            {/* Selected Date and Times */}
            {Object.keys(dateTimeSelection).length > 0 && (
                <div className="mt-6">
                    <h2 className="mb-2 font-medium">
                        Selected Date-Time
                    </h2>

                    <ul className="space-y-4">
                        {Object.entries(dateTimeSelection)
                            .sort(([dateA], [dateB]) =>
                                dateA.localeCompare(dateB)
                            )
                            .map(([date, times]) => (
                                <li key={date}>
                                    <div className="font-medium">
                                        {date}
                                    </div>

                                    <div className="flex flex-wrap gap-2 mt-2 text-sm">
                                        {times.map((time) => (
                                            <div
                                                key={time}
                                                className="border border-primary px-2 py-1 flex items-center rounded"
                                            >
                                                <span>{time}</span>

                                                <DeleteIcon
                                                    onClick={() =>
                                                        handleRemoveTime(date, time)
                                                    }
                                                    width={15}
                                                    className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </li>
                            ))}
                    </ul>

                    {/* Submit Button */}
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={addingShow}
                        className="bg-primary text-white px-8 py-2 mt-6 rounded hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {addingShow ? 'Adding Show...' : 'Add Show'}
                    </button>
                </div>
            )}
        </>
    );
};

export default Addshow;