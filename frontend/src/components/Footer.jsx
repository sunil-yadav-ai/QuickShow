import React from 'react'
import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'

const Footer = () => {
    return (
        <footer className="mt-24 w-full px-4 text-gray-300 sm:px-6 md:mt-32 md:px-16 lg:px-36">

            <div className="flex flex-col md:flex-row justify-between w-full gap-10 border-b border-gray-500 pb-14">

                {/* Logo & App */}
                <div className="md:max-w-96">

                    <img
                        alt="Logo"
                        width="144"
                        height="44"
                        className="h-11"
                        src={assets.logo}
                    />

                    <p className="mt-6 max-w-sm text-sm leading-relaxed">
                        Discover what is showing and plan your next movie night with QuickShow.
                    </p>

                    <div className="flex items-center gap-2 mt-4">

                        <img
                            src={assets.googlePlay}
                            alt="Google Play"
                            className="h-9 w-auto "
                        />

                        <img
                            src={assets.appStore}
                            alt="App Store"
                            className="h-9 w-auto "
                        />

                    </div>
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-10 sm:gap-16 md:flex-1 md:justify-end md:gap-32">

                    <div>
                        <h2 className="font-semibold mb-5">
                            Company
                        </h2>

                        <ul className="text-sm space-y-2">
                            <li><Link className="hover:text-white" to="/">Home</Link></li>
                            <li><Link className="hover:text-white" to="/movies">Movies</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="font-semibold mb-5">
                            Get in touch
                        </h2>

                        <div className="space-y-2 text-sm">
                            <p>Explore current shows and choose a movie for your next visit.</p>
                            <Link className="inline-block text-white underline underline-offset-4 hover:text-primary" to="/movies">Browse movies</Link>
                        </div>
                    </div>

                </div>
            </div>

            {/* Copyright */}
            <p className="pt-4 text-center text-sm pb-5">
                Copyright {new Date().getFullYear()} ©{' '}
                QuickShow. All rights reserved.
            </p>

        </footer>
    )
}

export default Footer