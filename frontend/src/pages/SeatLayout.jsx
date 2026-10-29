import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { assets } from '../assets/assets';
import Loading from '../components/Loading';
import { ArrowRightIcon, ClockIcon } from 'lucide-react';
import isoTimeFormat from '../lib/isoTimeFormat';
import BlurCircle from '../components/BlurCircle'
import { toast } from 'react-hot-toast';
import { useAppContext } from '../context/AppContex';
import SEO from '../components/SEO';

const SeatLayout = () => {
    const groupRows = [["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"], ["I", "J"]]

    const { id, date } = useParams();

    const [selectedSeats, setSelectedSeats] = useState([])
    const [selectedTime, setSelectedTime] = useState(null)
    const [show, setShow] = useState(null)
    const [occupiedSeats, setoccupiedSeats] = useState([])

    const {axios,getToken,user} = useAppContext()

    const selectedShowId = selectedTime?.showId

    const getShow = useCallback(async () => {
       try{
        const {data} = await axios.get(`/api/show/${id}`)
        if(data.success){
            setShow(data)
        }

       }catch(e){
        console.log(e)
       }
    }, [axios, id])

    const getoccupiedSeats = useCallback(async ()=>{
        if (!selectedShowId) return

        try{
            const {data} = await axios.get(`/api/booking/seats/${selectedShowId}`)
            if(data.success){
                setoccupiedSeats(data.occupiedSeats)
            }else{
                toast.error(data.message)
            }

        }catch(e){
            console.log(e)

        }
    }, [axios, selectedShowId])


    useEffect(()=>{
        if(selectedTime){
            getoccupiedSeats()
        }

    },[getoccupiedSeats, selectedTime])

    const handleSeatClick = (seatId) => {

        if (!selectedTime) {
            return toast.error("Please select time first")
        }


        if(occupiedSeats.includes(seatId)){
            return toast('This seat is already booked')
        }

        // Already selected seat ko remove karne do


        if (selectedSeats.includes(seatId)) {
            setSelectedSeats(prev =>
                prev.filter(seat => seat !== seatId)
            )
            return
        }

        // Maximum 5 seats
        if (selectedSeats.length >= 5) {
            return toast.error("You can only select 5 seats")
        }

        setSelectedSeats(prev => [...prev, seatId])
    }

    const bookTickets = async ()=>{
        try{
            if(!user) return toast.error('Please login to proceed')
                if(!selectedTime || !selectedSeats.length) return toast.error('Please select a time and seats');
            const {data} = await axios.post('/api/booking/create',{showId: selectedTime.showId, selectedSeats},{headers:{Authorization:`Bearer ${await getToken()}`}});
            if(data.success){
                window.location.href = data.url;
            }else{
                toast.error(data.message)
            }

        }catch(e){
            toast.error(e.message)

        }
    }





    const renderSeats = (row, count = 9) => (
        <div key={row} className='mt-2 flex justify-center'>
            <div className='flex items-center justify-center gap-1 sm:gap-2'>

                {Array.from({ length: count }, (_, i) => {

                    const seatId = `${row}${i + 1}`;

                    return (
                        <button
                            key={seatId}
                            type="button"
                            onClick={() => handleSeatClick(seatId)}
                            disabled={occupiedSeats.includes(seatId)}
                            aria-label={`Seat ${seatId}${occupiedSeats.includes(seatId) ? ', unavailable' : ''}`}
                            aria-pressed={selectedSeats.includes(seatId)}
                            className={`h-6 w-6 rounded border border-primary/60 text-[10px] sm:h-8 sm:w-8 sm:text-xs ${
                                selectedSeats.includes(seatId)
                                    ? "bg-primary text-white"
                                    : ""
                            } ${occupiedSeats.includes(seatId) ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-primary/30"}`}
                        >
                            {seatId}
                        </button>
                    )
                })}

            </div>
        </div>
    )

    useEffect(() => {
        getShow()
    }, [getShow])

    return show ? (
        <main className='flex min-h-[80vh] flex-col px-4 pb-16 pt-28 sm:px-6 sm:pt-32 md:flex-row md:px-10 lg:px-20 xl:px-40'>
            <SEO
                title="Choose seats and showtime | QuickShow"
                description="Choose a showtime and available seats for your QuickShow movie booking."
                noIndex
            />

            <section aria-label="Available showtimes" className='w-full rounded-lg border border-primary/20 bg-primary/10 py-6 md:sticky md:top-24 md:h-max md:w-60 md:shrink-0 md:py-10'>

                <p className='text-lg font-semibold px-6'>
                    Available Timings
                </p>

                <div className='mt-5 space-y-1'>

                    {show.dateTime[date]?.map((item) => (

                        <button
                            type="button"
                            key={item.time}
                            onClick={() => setSelectedTime(item)}
                            aria-pressed={selectedTime?.time === item.time}
                            className={`flex min-h-11 w-full items-center gap-2 px-6 py-2 text-left transition ${
                                selectedTime?.time === item.time
                                    ? "bg-primary text-white"
                                    : "hover:bg-primary/20"
                            }`}
                        >

                            <ClockIcon className='h-4 w-4' aria-hidden="true" />

                            <p className='text-sm'>
                                {isoTimeFormat(item.time)}
                            </p>

                        </button>

                    ))}

                </div>

            </section>

            <section aria-label="Select your seats" className='relative flex min-w-0 flex-1 flex-col items-center pt-10 md:pt-0'>

                <BlurCircle top="-100px" left="-100px" />
                <BlurCircle top="0" right="0" />

                <h1 className='text-2xl font-semibold mb-4'>
                    Select your seat
                </h1>

                <img
                    src={assets.screenImage}
                    alt="screen"
                    width="600"
                    height="80"
                    className="h-auto w-full max-w-md"
                />

                <p className='text-gray-400 text-sm mb-6'>
                    SCREEN SIDE
                </p>

                <div className='flex flex-col items-center mt-10 text-xs text-gray-300'>

                    {/* A & B */}
                    <div className='mb-6 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-8 md:grid-cols-1'>
                        {groupRows[0].map(row =>
                            renderSeats(row)
                        )}
                    </div>

                    {/* C - J */}
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4'>

                        {groupRows.slice(1).map((group, idx) => (

                            <div key={idx}>
                                {group.map(row =>
                                    renderSeats(row)
                                )}
                            </div>

                        ))}

                    </div>

                </div>
                <button onClick={bookTickets} className='mt-10 flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium transition hover:bg-primary-dull active:scale-95 sm:mt-14'>
                    Proceed to Checkout
                    <ArrowRightIcon strokeWidth={3} className='w-4 h-4'/>
                </button>

            </section>

        </main>
    ) : <Loading />
}

export default SeatLayout