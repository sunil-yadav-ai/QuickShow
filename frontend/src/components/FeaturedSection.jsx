import { ArrowRight } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import BlurCircle from './BlurCircle'

import MovieCard from './MovieCard'
import { useAppContext } from '../context/AppContex'

const FeaturedSection = () => {
    const navigate = useNavigate()
    const {shows} = useAppContext()

    return (
        <section className="overflow-hidden px-4 sm:px-6 md:px-16 lg:px-24 xl:px-44">

            <div className="relative flex items-center justify-between pt-20 pb-10">

                <BlurCircle top="0" right="-80px" />

                <h2 className="text-lg font-medium text-gray-200">
                    Now Showing
                </h2>

                <button
                    onClick={() => navigate('/movies')}
                    className="group flex items-center gap-2 text-sm text-gray-300 cursor-pointer"
                >
                    View All

                    <ArrowRight className="group-hover:translate-x-0.5 transition w-4.5 h-4.5" />
                </button>

            </div>

            {/* Movie Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
                {shows.slice(0, 4).map((show) => (
                    <MovieCard
                        key={show._id}
                        movie={show}
                    />

                    
                    
                ))}
                
            </div>

            {/* Show More */}
            <div className="mt-12 flex justify-center sm:mt-16">
                <button
                    onClick={() => {
                        navigate('/movies')
                        scrollTo(0, 0)
                    }}
                    className="px-10 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-md font-medium cursor-pointer"
                >
                    Show more
                </button>
            </div>

        </section>
    )
}

export default FeaturedSection