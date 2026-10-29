import React from 'react'

import MovieCard from '../components/MovieCard'
import BlurCircle from '../components/BlurCircle'
import { useAppContext } from '../context/AppContex'
import SEO from '../components/SEO'
const Favorite = () =>{

    const {favoriteMovies} = useAppContext()
    return favoriteMovies.length > 0 ? (
        <main className='relative my-28 mb-40 min-h-[80vh] overflow-hidden px-4 sm:my-32 sm:px-6 md:px-16 lg:px-40 xl:px-44'>
            <SEO title="Your favorites | QuickShow" description="Your saved favorite movies." noIndex />
            <h1 className='my-4 text-2xl font-semibold sm:text-3xl'>Your favorite movies</h1>
            <BlurCircle top='150px' left='0px'/>
            <BlurCircle bottom='50px' right='50px'/>
            <div className='grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:gap-8'>
                {favoriteMovies.map((movie)=>(
                    <MovieCard movie={movie} key={movie._id}/>
                ))}
            </div>



        </main>
    ):(
        <main className='flex min-h-[70vh] flex-col items-center justify-center px-5 pt-24 text-center'>
            <SEO title="Your favorites | QuickShow" description="Your saved favorite movies." noIndex />
            <h1 className='text-3xl font-bold text-center'>No favorite movies yet</h1>
            <p className="mt-3 text-gray-300">Save movies you like to find them here.</p>
        </main>
    )
}

export default Favorite