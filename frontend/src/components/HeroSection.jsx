import React from 'react'
import { CalculatorIcon, ClockIcon } from 'lucide-react'
import avengersPoster from '../assets/av3.jpg'

const HeroSection = () => {
    return (
        <div
            style={{ backgroundImage: `url(${avengersPoster})` }}
            className="relative w-full aspect-video bg-[length:100%_100%] bg-center bg-no-repeat flex flex-col items-start justify-center px-6 md:px-16 lg:px-36"
        >
            <h1 className='text-5xl md:text-[70px] md:leading-18 font-semibold max-w-xl'>
                Avengers <br /> Doomsday
            </h1>

            <div className='flex items-center gap-4 text-gray-300'>
                <span>Action | Adventure | Sci-Fi</span>

                <div className='flex items-center gap-1'>
                    <CalculatorIcon className='w-4.5 h-4.5' />
                    2026
                </div>

                <div className='flex items-center gap-1'>
                    <ClockIcon className='w-4.5 h-4.5' />
                    2h 8m
                </div>
            </div>
        </div>
    )
}

export default HeroSection