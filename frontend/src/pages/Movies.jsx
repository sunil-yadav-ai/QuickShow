import React from 'react'

import MovieCard from '../components/MovieCard'
import BlurCircle from '../components/BlurCircle'
import { useAppContext } from '../context/AppContex'
const Movies = () =>{

    const {shows} = useAppContext()
    return shows.length > 0 ? (
        <div className='relative my-40 mb-60 px-6 md:px-16 lg:px-40 xl:px-44 overflow-hidden min-h-[80vh]'>
            <h1 className='text-lg font-medium my-4'>Now Showing</h1>
            <BlurCircle top='150px' left='0px'/>
            <BlurCircle bottom='50px' right='50px'/>
            <div className='flex flex-wrap max-sm:justify-center gap-8'>
                {shows.map((movie)=>(
                    <MovieCard movie={movie} key={movie._id}/>
                ))}
            </div>



        </div>
    ):(
        <div className='flex flex-col items-center justify-center h-screen'>
            <h1 className='text-3xl font-bold text-center'>No movies available</h1>
        </div>
    )
}

export default Movies