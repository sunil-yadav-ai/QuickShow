import React from 'react'
import HeroSection from '../components/HeroSection'
import FeaturedSection from '../components/FeaturedSection'
import TrailersSection from '../components/TrailerSection'
import SEO from '../components/SEO'
const Home = () =>{
    return (
        <main>
        <SEO
            title="QuickShow - Book Movie Tickets Online"
            description="Discover movies, explore trailers and showtimes, and book cinema tickets online with QuickShow."
        />
        <HeroSection/>
        <FeaturedSection/>
        <TrailersSection/>
        
            

        </main>
    )
}

export default Home