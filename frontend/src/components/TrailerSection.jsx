import React, { useState } from 'react'
import { dummyTrailers } from '../assets/assets'
import BlurCircle from './BlurCircle'
import { PlayCircleIcon } from 'lucide-react'

const TrailersSection = () => {
    const [currentTrailer,setCurrentTrailer] = useState(dummyTrailers[0])
    const [isPlayerRequested, setIsPlayerRequested] = useState(false)
    const trailerId = new URL(currentTrailer.videoUrl).searchParams.get('v')

    return (
        <section className="overflow-hidden px-4 py-16 sm:px-6 sm:py-20 md:px-16 lg:px-24 xl:px-44">

            <h2 className="mx-auto max-w-[960px] text-lg font-medium text-gray-200">
                Trailers
            </h2>

            <div className="relative mt-6">
                <BlurCircle top="-100px" right="-100px" />

                <div className="aspect-video w-full overflow-hidden rounded-xl bg-gray-900">
                    {isPlayerRequested && trailerId ? (
                        <iframe
                            key={trailerId}
                            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailerId)}?rel=0`}
                            title="QuickShow movie trailer"
                            loading="lazy"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="h-full w-full border-0"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsPlayerRequested(true)}
                            aria-label="Load and play movie trailer"
                            className="group/player relative h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                        >
                            <img
                                src={currentTrailer.image}
                                alt=""
                                aria-hidden="true"
                                width="1280"
                                height="720"
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover brightness-75 transition group-hover/player:brightness-90"
                            />
                            <PlayCircleIcon
                                aria-hidden="true"
                                className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-lg"
                                strokeWidth={1.5}
                            />
                            <span className="sr-only">Load and play trailer</span>
                        </button>
                    )}
                </div>
            </div>

            <div className='group mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-3 sm:mt-8 sm:gap-4 md:grid-cols-4 md:gap-8'>
                {dummyTrailers.map((Trailer)=>(
                   <button
                        key={Trailer.image}
                        type="button"
                        aria-label={`Play movie trailer ${dummyTrailers.indexOf(Trailer) + 1}`}
                        aria-pressed={currentTrailer.videoUrl === Trailer.videoUrl}
                        className='group/trailer relative aspect-video overflow-hidden rounded-lg transition hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white'
                        onClick={() => {
                            setCurrentTrailer(Trailer)
                            setIsPlayerRequested(true)
                        }}
                    >
                        <img
                            src={Trailer.image}
                            alt=""
                            aria-hidden="true"
                            width="480"
                            height="270"
                            loading="lazy"
                            decoding="async"
                            className='h-full w-full object-cover brightness-75 transition group-hover/trailer:brightness-100'
                        />
                        <PlayCircleIcon aria-hidden="true" strokeWidth={1.6} className='absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 md:h-10 md:w-10'/>
                   </button>
                ))}
            </div>

        </section>
    )
}

export default TrailersSection