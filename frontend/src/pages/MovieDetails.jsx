import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heart, PlayCircleIcon, StarIcon } from 'lucide-react';
import BlurCircle from '../components/BlurCircle';
import timeFormat from '../lib/timeFormat';
import DateSelect from '../components/DateSelect';
import MovieCard from '../components/MovieCard';
import Loading from '../components/Loading';
import { useAppContext } from '../context/AppContex';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';
import { SITE_URL } from '../config/site';
import MovieTrailerModal from '../components/MovieTrailerModal';

const movieVideoRequests = new Map();

const getMovieVideos = (axios, movieId) => {
    if (!movieVideoRequests.has(movieId)) {
        const request = axios
            .get(`/api/show/${encodeURIComponent(movieId)}/videos`)
            .then(({ data }) => {
                if (!data.success || !Array.isArray(data.videos)) {
                    throw new Error(data.message || 'Invalid movie video response');
                }

                return data.videos;
            })
            .catch((error) => {
                movieVideoRequests.delete(movieId);
                throw error;
            });

        movieVideoRequests.set(movieId, request);
    }

    return movieVideoRequests.get(movieId);
};

const selectMovieTrailer = (videos) => {
    const youtubeVideos = videos.filter(
        (video) =>
            video.site === 'YouTube' &&
            typeof video.key === 'string' &&
            video.key.trim()
    );
    const trailer = youtubeVideos.find(
        (video) => video.type === 'Trailer' && video.official
    ) || youtubeVideos.find((video) => video.type === 'Trailer');

    if (trailer) return trailer;

    return youtubeVideos.find(
        (video) => video.type === 'Teaser' && video.official
    ) || youtubeVideos.find((video) => video.type === 'Teaser') || null;
};

const MovieDetails = () => {
const navigate = useNavigate();
const { id } = useParams();


const [show, setShow] = useState(null);
const [loadedShowId, setLoadedShowId] = useState(null);
const [favoriteLoading, setFavoriteLoading] = useState(false);
const [trailerStatus, setTrailerStatus] = useState({ movieId: null, status: 'idle', video: null });
const [isTrailerOpen, setIsTrailerOpen] = useState(false);

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
const getShow = useCallback(async () => {
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
    } finally {
        setLoadedShowId(id);
    }
}, [axios, id]);

// Check whether the current movie is a favorite
const isFavorite = (favoriteMovies || []).some(
    (movie) =>
        String(movie._id) === String(show?.movie?._id) ||
        String(movie._id) === String(id)
);

const movie = loadedShowId === id ? show?.movie : null;

useEffect(() => {
    if (loadedShowId !== id || !movie?._id) return undefined;

    let isCurrent = true;
    setTrailerStatus({ movieId: id, status: 'loading', video: null });

    getMovieVideos(axios, movie._id)
        .then((videos) => {
            if (!isCurrent) return;

            const video = selectMovieTrailer(videos);
            setTrailerStatus({
                movieId: id,
                status: video ? 'available' : 'unavailable',
                video,
            });
        })
        .catch((error) => {
            if (!isCurrent) return;

            console.error(
                'Error fetching movie trailers:',
                error.response?.data || error.message
            );
            setTrailerStatus({ movieId: id, status: 'error', video: null });
        });

    return () => {
        isCurrent = false;
        setIsTrailerOpen(false);
    };
}, [axios, id, loadedShowId, movie]);

useEffect(() => {
    if (loadedShowId !== id || !movie?.title) return undefined;

    const posterUrl = movie.poster_path
        ? movie.poster_path.startsWith('http')
            ? movie.poster_path
            : `${image_base_url}${movie.poster_path}`
        : undefined;
    const movieData = {
        '@context': 'https://schema.org',
        '@type': 'Movie',
        name: movie.title,
        url: `${SITE_URL}${window.location.pathname}`,
    };

    if (movie.overview) movieData.description = movie.overview;
    if (posterUrl) movieData.image = posterUrl;
    if (Array.isArray(movie.genres) && movie.genres.length > 0) {
        movieData.genre = movie.genres.map((genre) => genre.name).filter(Boolean);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(movie.release_date || '')) {
        movieData.datePublished = movie.release_date;
    }
    if (Number.isFinite(Number(movie.runtime)) && Number(movie.runtime) > 0) {
        const runtime = Math.floor(Number(movie.runtime));
        movieData.duration = `PT${Math.floor(runtime / 60)}H${runtime % 60}M`;
    }

    const script = document.createElement('script');
    script.id = 'quickshow-movie-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(movieData);
    document.head.appendChild(script);

    return () => script.remove();
}, [id, image_base_url, loadedShowId, movie]);

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
    getShow();
}, [getShow]);

if (!show || loadedShowId !== id) {
    return (
        <>
            <SEO
                title="Movie details | QuickShow"
                description="Explore movie details and showtimes on QuickShow."
                noIndex
            />
            <Loading />
        </>
    );
}

return (
    <main className="px-4 pt-28 sm:px-6 sm:pt-32 md:px-16 md:pt-40 lg:px-40">
        <SEO
            title={`${movie.title} showtimes and tickets | QuickShow`}
            description={(movie.overview || `Explore ${movie.title} showtimes and book cinema tickets with QuickShow.`).slice(0, 155)}
            image={
                movie.poster_path
                    ? movie.poster_path.startsWith("http")
                        ? movie.poster_path
                        : `${image_base_url}${movie.poster_path}`
                    : undefined
            }
        />
        <div className="max-w-6xl mx-auto">

            {/* Movie Details */}
            <section className="flex min-w-0 flex-col gap-6 sm:gap-8 md:flex-row">

                {/* Movie Poster */}
                {movie.poster_path ? (
                    <img
                        src={
                            movie.poster_path.startsWith("http")
                                ? movie.poster_path
                                : `${image_base_url}${movie.poster_path}`
                        }
                        alt={`${movie.title} poster`}
                        width="500"
                        height="750"
                        fetchPriority="high"
                        className="mx-auto aspect-[2/3] w-full max-w-64 rounded-xl object-cover sm:max-w-72 md:mx-0 md:max-w-[18rem]"
                    />
                ) : (
                    <div
                        role="img"
                        aria-label={`${movie.title} poster unavailable`}
                        className="flex aspect-[2/3] w-full max-w-64 items-center justify-center rounded-xl bg-gray-800 text-sm text-gray-300 sm:max-w-72 md:mx-0 md:max-w-[18rem]"
                    >
                        Poster unavailable
                    </div>
                )}

                {/* Movie Information */}
                <div className="relative flex flex-col gap-3 flex-1">

                    <BlurCircle
                        top="-100px"
                        left="-100px"
                    />

                    <p className="text-primary">
                        ENGLISH
                    </p>

                    <h1 className="max-w-2xl text-3xl font-semibold text-balance sm:text-4xl lg:text-5xl">
                        {movie.title}
                    </h1>

                    {/* Rating */}
                    <div className="flex items-center gap-2 text-gray-300">
                        <StarIcon className="w-5 h-5 text-primary fill-primary" />

                        {Number(movie.vote_average || 0).toFixed(1)} User Rating
                    </div>

                    {/* Overview */}
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-300 sm:text-base">
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

                        {trailerStatus.movieId === id && trailerStatus.status === 'available' && (
                            <button
                                type="button"
                                onClick={() => setIsTrailerOpen(true)}
                                className="flex min-h-11 items-center gap-2 rounded-md bg-gray-800 px-7 py-3 text-sm font-medium transition hover:bg-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary active:scale-95"
                            >
                                <PlayCircleIcon aria-hidden="true" className="h-5 w-5" />
                                Watch Trailer
                            </button>
                        )}
                        {trailerStatus.movieId === id && trailerStatus.status === 'loading' && (
                            <p role="status" className="self-center text-sm text-gray-300">
                                Checking for a trailer…
                            </p>
                        )}
                        {trailerStatus.movieId === id && trailerStatus.status === 'error' && (
                            <p role="status" className="self-center text-sm text-gray-300">
                                Trailer currently unavailable.
                            </p>
                        )}

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
                    </section>

            {/* Cast */}
            <div className="mt-16">
                <h2 className="text-lg font-medium">
                    Your Favorite Cast
                </h2>

                <div className="overflow-x-auto no-scrollbar mt-8 pb-4">
                    <div className="flex items-center gap-6 w-max px-2">

                        {(movie.casts || []).slice(0, 12).map((cast, index) => (
                            <div
                                key={cast.id || index}
                                className="flex flex-col items-center text-center w-20"
                            >
                                {cast.profile_path ? (
                                    <img
                                        src={
                                            image_base_url + cast.profile_path
                                        }
                                        alt={cast.name}
                                        className="rounded-full h-20 w-20 object-cover"
                                        width="80"
                                        height="80"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                ) : (
                                    <div
                                        role="img"
                                        aria-label={`${cast.name} portrait unavailable`}
                                        className="grid h-20 w-20 place-items-center rounded-full bg-gray-700 text-xl font-semibold text-gray-300"
                                    >
                                        {cast.name?.charAt(0) || '?'}
                                    </div>
                                )}

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
            <h2 className="text-lg font-medium mt-16 mb-6 sm:mt-20 sm:mb-8">
                You May Also Like
            </h2>

            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:gap-8">
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
        {isTrailerOpen && trailerStatus.video && (
            <MovieTrailerModal
                movieTitle={movie.title}
                videoKey={trailerStatus.video.key}
                onClose={() => setIsTrailerOpen(false)}
            />
        )}
    </main>
);


};

export default MovieDetails;
