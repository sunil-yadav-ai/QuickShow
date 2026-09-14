import React from 'react'
import {
    ArrowRight,
    CalendarIcon,
    ClockIcon
} from 'lucide-react'
import avengersPoster from '../assets/av5.jpg'
import marvelLogo from '../assets/marvelLogo.svg'
import { useNavigate } from 'react-router-dom'

const HeroSection = () => {
    const navigate = useNavigate()

    return (
        <div
            style={{ backgroundImage: `url(${avengersPoster})` }}
            className="relative w-full aspect-video bg-[length:100%_100%] bg-center bg-no-repeat flex flex-col items-start justify-center px-6 md:px-16 lg:px-36"
        >
            <img
                src={marvelLogo}
                alt="Marvel"
                className="w-32 md:w-40 mb-4"
            />

            <h1 className="text-5xl md:text-[70px] md:leading-18 font-semibold max-w-xl">
                Avengers <br /> Doomsday
            </h1>

            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-gray-300">
                <span>Action | Adventure | Sci-Fi</span>

                <div className="flex items-center gap-1">
                    <CalendarIcon className="w-4.5 h-4.5" />
                    2026
                </div>

                <div className="flex items-center gap-1">
                    <ClockIcon className="w-4.5 h-4.5" />
                    2h 8m
                </div>
            </div>

            <p className="max-w-md text-gray-300 mt-4">
                The Avengers face a powerful new threat as the fate of the
                world hangs in the balance.
            </p>

            <button
                onClick={() => navigate('/movies')}
                className="mt-5 flex items-center gap-1 px-6 py-3 text-sm bg-primary hover:bg-primary-dull transition rounded-full font-medium cursor-pointer"
            >
                Explore Movies
                <ArrowRight className="w-5 h-5" />
            </button>
        </div>
    )
}

export default HeroSection