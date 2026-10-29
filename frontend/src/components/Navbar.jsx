import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../assets/assets'
import { MenuIcon, SearchIcon, TicketPlus, XIcon } from 'lucide-react'
import { useClerk, UserButton, useUser } from '@clerk/react'
import { useAppContext } from '../context/AppContex'

const Navbar = () => {
    const [isOpen, setOpen] = useState(false)
    const navigate = useNavigate()
    const {favoriteMovies} = useAppContext()

    const {user} = useUser()
    const {openSignIn} = useClerk()

    const closeMenu = () => {
        window.scrollTo(0, 0)
        setOpen(false)
    }

    useEffect(() => {
        if (!isOpen) return undefined

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') setOpen(false)
        }

        window.addEventListener('keydown', closeOnEscape)
        return () => window.removeEventListener('keydown', closeOnEscape)
    }, [isOpen])

    return (
        <header className="fixed top-0 left-0 z-50 w-full border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur-md sm:px-6 md:px-10 lg:px-16">
          <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3">

            {/* Logo */}
            <Link to="/" onClick={closeMenu} aria-label="QuickShow home" className="shrink-0">
                <img
                    src={assets.logo}
                    alt="QuickShow"
                    width="144"
                    height="40"
                    className="h-auto w-28 sm:w-36"
                />
            </Link>

            {/* Navigation */}
            <nav
                id="primary-navigation"
                aria-label="Main navigation"
                className={`absolute left-0 top-full z-50 w-full flex-col items-center gap-6 border-b border-white/10 bg-black/95 px-6 py-6 text-base font-medium backdrop-blur-md transition-[opacity,transform] duration-200 md:static md:flex md:w-auto md:flex-row md:gap-7 md:border-0 md:bg-white/10 md:px-7 md:py-3 md:text-sm md:rounded-full ${
                    isOpen ? 'flex opacity-100' : 'hidden opacity-0 md:flex md:opacity-100'
                }`}
            >
                <Link onClick={closeMenu} to="/" className="rounded-sm hover:text-primary">
                    Home
                </Link>

                <Link onClick={closeMenu} to="/movies" className="rounded-sm hover:text-primary">
                    Movies
                </Link>

                <Link onClick={closeMenu} to="/movies">
                    Theaters
                </Link>

                <Link onClick={closeMenu} to="/movies">
                    Releases
                </Link>

                { favoriteMovies.length > 0 && <Link onClick={closeMenu} to="/favorite" className="rounded-sm hover:text-primary">
                    Favorites
                </Link>}
            </nav>

            {/* Right side */}
            <div className="flex shrink-0 items-center gap-3 sm:gap-5">
                <button
                    type="button"
                    aria-label="Browse and search movies"
                    onClick={() => navigate('/movies')}
                    className="hidden rounded-full p-2 text-gray-200 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:inline-flex"
                >
                    <SearchIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                {!user ? (<button onClick={openSignIn} className="min-h-11 rounded-full bg-primary px-4 py-2 text-sm font-medium transition hover:bg-primary-dull sm:px-6">
                    Login
                </button>):(
                    <UserButton>
                        <UserButton.MenuItems>
                            <UserButton.Action label='My Bookings' labelIcon={<TicketPlus width={15}/>} onClick={()=> navigate('/my-bookings')}/>
                        </UserButton.MenuItems>
                    </UserButton>
                )}
            </div>

            {/* Mobile menu button */}
            <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white md:hidden"
                aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-controls="primary-navigation"
                aria-expanded={isOpen}
                onClick={() => setOpen((open) => !open)}
            >
                {isOpen ? <XIcon aria-hidden="true" /> : <MenuIcon aria-hidden="true" />}
            </button>
          </div>
        </header>
    )
}

export default Navbar