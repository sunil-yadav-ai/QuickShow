import React, { useMemo, useState } from 'react'

import MovieCard from '../components/MovieCard'
import BlurCircle from '../components/BlurCircle'
import { useAppContext } from '../context/AppContex'
import SEO from '../components/SEO'
import { Search } from 'lucide-react'
const Movies = () =>{

    const {shows} = useAppContext()
    const [searchQuery, setSearchQuery] = useState('')
    const filteredShows = useMemo(() => {
        const query = searchQuery.trim().toLocaleLowerCase()

        if (!query) return shows

        return shows.filter((movie) =>
            [movie.title, ...(movie.genres || []).map((genre) => genre.name)]
                .filter(Boolean)
                .some((value) => value.toLocaleLowerCase().includes(query))
        )
    }, [searchQuery, shows])

    return shows.length > 0 ? (
        <main className='relative my-28 mb-40 min-h-[80vh] overflow-hidden px-4 sm:my-32 sm:px-6 md:px-16 lg:px-40 xl:px-44'>
            <SEO
                title="Now Showing | Movies | QuickShow"
                description="Browse movies currently showing at QuickShow and choose a movie to view showtimes and ticket options."
            />
            <h1 className='my-4 text-2xl font-semibold sm:text-3xl'>Movies now showing</h1>
            <label htmlFor="movie-search" className="sr-only">Search movies by title or genre</label>
            <div className="relative my-5 max-w-lg">
                <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                    id="movie-search"
                    type="search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search movies or genres"
                    className="min-h-12 w-full rounded-full border border-white/15 bg-white/5 py-3 pl-12 pr-4 text-base text-white placeholder:text-gray-400 focus-visible:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                />
            </div>
            <BlurCircle top='150px' left='0px'/>
            <BlurCircle bottom='50px' right='50px'/>
            <div className='grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:gap-8'>
                {filteredShows.map((movie)=>(
                    <MovieCard movie={movie} key={movie._id}/>
                ))}
            </div>
            {filteredShows.length === 0 && (
                <p className="mt-8 text-center text-gray-300" role="status">
                    No movies match “{searchQuery}”.
                </p>
            )}



        </main>
    ):(
        <main className='flex min-h-[70vh] flex-col items-center justify-center px-5 pt-24 text-center'>
            <SEO
                title="Movies | QuickShow"
                description="Browse the latest movies and showtimes available on QuickShow."
            />
            <h1 className='text-3xl font-bold text-center'>No movies available</h1>
            <p className="mt-3 text-gray-300">Please check back soon for upcoming shows.</p>
        </main>
    )
}

export default Movies