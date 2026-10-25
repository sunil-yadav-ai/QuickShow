import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heart, PlayCircleIcon, StarIcon } from 'lucide-react';
import BlurCircle from '../components/BlurCircle';
import timeFormat from '../lib/timeFormat';
import DateSelect from '../components/DateSelect';
import MovieCard from '../components/MovieCard';
import Loading from '../components/Loading';
import { useAppContext } from '../context/AppContex';
import toast from 'react-hot-toast';

const MovieDetails = () => {
const navigate = useNavigate();
const { id } = useParams();


const [show, setShow] = useState(null);
const [favoriteLoading, setFavoriteLoading] = useState(false);

const {
    shows,
    axios,
    getToken,
    user,
    fetchFavoriteMovie,
    favoriteMovies,
    image_base_url
} = useAppContext();

// Fetch movie details
const getShow = async () => {
    try {
        const { data } = await axios.get(`/api/show/${id}`);

        if (data.success) {
            setShow(data);
        } else {
            setShow(null);
        }
    } catch (error) {
        console.error(
            'Error fetching movie details:',
            error.response?.data || error.message
        );
        setShow(null);
    }
};

// Check whether the current movie is a favorite
const isFavorite = (favoriteMovies || []).some(
    (movie) =>
        String(movie._id) === String(show?.movie?._id) ||
        String(movie._id) === String(id)
);

// Toggle favorite movie
const handleFavorite = async () => {
    if (!user) {
        toast.error('Please login to proceed');
        return;
    }

    if (favoriteLoading) return;

    setFavoriteLoading(true);

    try {
        const token = await getToken();

        const { data } = await axios.post(
            '/api/user/update-favorite',
            {
                movieId: id
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (data.success) {
            await fetchFavoriteMovie();
            toast.success(data.message);
        } else {
            toast.error(data.message || 'Unable to update favorite');
        }
    } catch (error) {
        console.error(
            'Favorite error:',
            error.response?.data || error.message
        );

        toast.error('Unable to update favorite');
    } finally {
        setFavoriteLoading(false);
    }
};

// Fetch details when movie ID changes
useEffect(() => {
    setShow(null);
    getShow();
}, [id]);

if (!show) {
    return <Loading />;
}

const movie = show.movie;

return (
    <div className="px-6 md:px-16 lg:px-40 pt-30 md:pt-50">
        <div className="max-w-6xl mx-auto">

            {/* Movie Details */}
            <div className="flex flex-col md:flex-row gap-8">

                {/* Movie Poster */}
                <img
                    src={`${image_base_url}${movie.poster_path}`}
                    alt={movie.title}
                    className="max-md:mx-auto rounded-xl h-104 w-70 object-cover"
                />

                {/* Movie Information */}
                <div className="relative flex flex-col gap-3 flex-1">

                    <BlurCircle
                        top="-100px"
                        left="-100px"
                    />

                    <p className="text-primary">
                        ENGLISH
                    </p>

                    <h1 className="text-4xl font-semibold max-w-96 text-balance">
                        {movie.title}
                    </h1>

                    {/* Rating */}
                    <div className="flex items-center gap-2 text-gray-300">
                        <StarIcon className="w-5 h-5 text-primary fill-primary" />

                        {Number(movie.vote_average || 0).toFixed(1)} User Rating
                    </div>

                    {/* Overview */}
                    <p className="text-gray-400 mt-2 text-sm leading-tight max-w-xl">
                        {movie.overview}
                    </p>

                    {/* Movie Information */}
                    <p>
                        {timeFormat(movie.runtime)} .{' '}
                        {(movie.genres || [])
                            .map((genre) => genre.name)
                            .join(', ')}{' '}
                        . {movie.release_date?.split('-')[0]}
                    </p>

                    {/* Buttons */}
                    <div className="flex items-center flex-wrap gap-4 mt-4">

                        {/* Watch Trailer */}
                        <button
                            type="button"
                            className="flex items-center gap-2 px-7 py-3 text-sm bg-gray-800 hover:bg-gray-900 transition rounded-md font-medium cursor-pointer active:scale-95"
                        >
                            <PlayCircleIcon className="w-5 h-5" />
                            Watch Trailer
                        </button>

                        {/* Buy Tickets */}
                        <a
                            href="#dateSelect"
                            className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer active:scale-95"
                        >
                            Buy Tickets
                        </a>

                        {/* Favourite Button */}
                        <button
                            type="button"
                            onClick={handleFavorite}
                            disabled={favoriteLoading}
                            aria-label={
                                isFavorite
                                    ? 'Remove from favorites'
                                    : 'Add to favorites'
                            }
                            aria-pressed={isFavorite}
                            className="bg-gray-700 p-2.5 rounded-full transition cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                            <Heart
                                className={`w-5 h-5 transition-colors ${
                                    isFavorite
                                        ? 'fill-primary text-primary'
                                        : 'text-white'
                                }`}
                            />
                        </button>

                    </div>
                </div>
            </div>

            {/* Cast */}
            <div className="mt-16">
                <p className="text-lg font-medium">
                    Your Favorite Cast
                </p>

                <div className="overflow-x-auto no-scrollbar mt-8 pb-4">
                    <div className="flex items-center gap-6 w-max px-2">

                        {(movie.casts || []).slice(0, 12).map((cast, index) => (
                            <div
                                key={cast.id || index}
                                className="flex flex-col items-center text-center w-20"
                            >
                                <img
                                    src={
                                        image_base_url + cast.profile_path
                                    }
                                    alt={cast.name}
                                    className="rounded-full h-20 w-20 object-cover"
                                />

                                <p className="font-medium text-xs mt-3 whitespace-nowrap">
                                    {cast.name}
                                </p>
                            </div>
                        ))}

                    </div>
                </div>
            </div>

            {/* Date Selection */}
            <DateSelect
                dateTime={show.dateTime}
                id={id}
            />

            {/* Recommended Movies */}
            <p className="text-lg font-medium mt-20 mb-8">
                You May Also Like
            </p>

            <div className="flex flex-wrap max-sm:justify-center gap-8">
                {(shows || []).slice(0, 4).map((movieItem) => (
                    <MovieCard
                        key={movieItem._id}
                        movie={movieItem}
                    />
                ))}
            </div>

            {/* Show More */}
            <div className="flex justify-center mt-20">
                <button
                    type="button"
                    onClick={() => {
                        navigate('/movies');
                        window.scrollTo(0, 0);
                    }}
                    className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer"
                >
                    Show more
                </button>
            </div>

        </div>
    </div>
);


};

export default MovieDetails;
