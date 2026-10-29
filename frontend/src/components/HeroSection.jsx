import React, { useEffect, useState } from 'react'
import {
    ArrowRight,
    CalendarIcon,
    ClockIcon
} from 'lucide-react'
import avengersPoster from '../assets/av5-optimized.jpg'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContex'
import timeFormat from '../lib/timeFormat'

const LAST_FEATURED_MOVIE_KEY = 'quickshow:lastFeaturedMovie'

const getMovieBackdrop = (movie, imageBaseUrl) => {
    const imagePath = movie.backdrop_path || movie.poster_path

    if (!imagePath) return null
    if (imagePath.startsWith('http')) return imagePath

    return imageBaseUrl ? `${imageBaseUrl}${imagePath}` : null
}

const HeroSection = () => {
    const navigate = useNavigate()
    const { shows, image_base_url } = useAppContext()
    const [featuredMovie, setFeaturedMovie] = useState(null)

    useEffect(() => {
        if (featuredMovie) return

        const eligibleMovies = shows.filter(
            (movie) => movie.title && getMovieBackdrop(movie, image_base_url)
        )

        if (eligibleMovies.length === 0) return

        let lastFeaturedMovieId = null
        try {
            lastFeaturedMovieId = window.localStorage.getItem(LAST_FEATURED_MOVIE_KEY)
        } catch {
            lastFeaturedMovieId = null
        }

        const moviesToChooseFrom = eligibleMovies.filter(
            (movie) => String(movie._id) !== lastFeaturedMovieId
        )
        const candidates = moviesToChooseFrom.length > 0
            ? moviesToChooseFrom
            : eligibleMovies
        const selection = candidates[Math.floor(Math.random() * candidates.length)]

        setFeaturedMovie(selection)

        try {
            window.localStorage.setItem(
                LAST_FEATURED_MOVIE_KEY,
                String(selection._id)
            )
        } catch {
            // Random selection still works when browser storage is unavailable.
        }
    }, [featuredMovie, image_base_url, shows])

    const backdrop = featuredMovie
        ? getMovieBackdrop(featuredMovie, image_base_url)
        : avengersPoster
    const genres = (featuredMovie?.genres || [])
        .map((genre) => genre.name)
        .filter(Boolean)
        .slice(0, 3)

    return (
        <section className="relative isolate flex min-h-[620px] w-full items-center overflow-hidden px-5 pb-10 pt-28 sm:min-h-0 sm:aspect-video sm:px-10 md:px-16 lg:px-36">
            <img
                src={backdrop}
                alt=""
                aria-hidden="true"
                fetchPriority="high"
                width="1920"
                height="1080"
                className="absolute inset-0 -z-20 h-full w-full object-cover object-[62%_center] transition-opacity duration-500"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/75 to-black/20" aria-hidden="true" />
            <div className="max-w-2xl">
            <h1 className="max-w-xl text-4xl font-semibold leading-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl">
                QuickShow
            </h1>
            <p className="mt-2 text-lg font-medium text-white sm:text-xl">
                Book movie tickets online
            </p>

            <h2 className="mt-5 max-w-xl text-2xl font-semibold leading-tight text-balance sm:text-3xl md:text-4xl">
                {featuredMovie?.title || 'Avengers Doomsday'}
            </h2>

            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-gray-300">
                {genres.length > 0 && (
                    <span>{genres.join(' | ')}</span>
                )}

                {featuredMovie?.release_date && (
                    <span className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" aria-hidden="true" />
                        {featuredMovie.release_date.split('-')[0]}
                    </span>
                )}

                {featuredMovie?.runtime > 0 && (
                    <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" aria-hidden="true" />
                        {timeFormat(featuredMovie.runtime)}
                    </span>
                )}
            </div>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-200 sm:text-base">
                {featuredMovie?.overview ||
                    'Discover movies currently showing and book your next cinema tickets with QuickShow.'}
            </p>

            <button
                onClick={() => navigate('/movies')}
                className="mt-6 flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium transition hover:bg-primary-dull"
            >
                Explore Movies
                <ArrowRight className="w-5 h-5" />
            </button>
            </div>
        </section>
    )
}

export default HeroSection