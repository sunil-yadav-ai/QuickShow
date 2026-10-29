import { StarIcon } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import timeFormat from '../lib/timeFormat'
import { useAppContext } from '../context/AppContex'

const MovieCard = ({ movie }) => {
    const navigate = useNavigate()
    const { image_base_url} = useAppContext()

    const handleMovieClick = () => {
        navigate(`/movies/${movie._id}`)
        window.scrollTo(0, 0)
    }

    return (
        <article className="flex min-w-0 flex-col justify-between rounded-2xl bg-gray-800 p-2.5 transition duration-300 hover:-translate-y-1 sm:p-3">

            <Link
                to={`/movies/${movie._id}`}
                onClick={() => window.scrollTo(0, 0)}
                aria-label={`View ${movie.title} details`}
                className="block overflow-hidden rounded-lg"
            >
                {movie.backdrop_path ? (
                    <img
                        src={image_base_url + movie.backdrop_path}
                        alt={`${movie.title} movie backdrop`}
                        width="500"
                        height="281"
                        loading="lazy"
                        decoding="async"
                        className="aspect-video w-full object-cover object-center"
                    />
                ) : (
                    <span
                        role="img"
                        aria-label={`${movie.title} backdrop unavailable`}
                        className="flex aspect-video w-full items-center justify-center bg-gray-700 text-sm text-gray-300"
                    >
                        Image unavailable
                    </span>
                )}
            </Link>

            <h2 className="mt-2 truncate font-semibold">
                {movie.title}
            </h2>

            <p className="text-sm text-gray-400 mt-2">
                {new Date(movie.release_date).getFullYear()}
                {' . '}
                {(movie.genres || [])
                    .slice(0, 2)
                    .map(genre => genre.name)
                    .join(' | ')}
                {' . '}
                {timeFormat(movie.runtime)}
            </p>

            <div className="flex items-center justify-between mt-4 pb-3">

                <button
                    onClick={handleMovieClick}
                    className="px-4 py-2 text-xs bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
                >
                    Buy Tickets
                </button>

                <p className="flex items-center gap-1 text-sm text-gray-400 mt-1 pr-1">
                    <StarIcon className="w-4 h-4 text-primary fill-primary" />
                    {Number(movie.vote_average || 0).toFixed(1)}
                </p>

            </div>
        </article>
    )
}

export default MovieCard