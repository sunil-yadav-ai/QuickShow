
import React,{useState} from 'react'
import BlurCircle from './BlurCircle'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
const DateSelect = ({ dateTime, id }) => {

    const [selected ,setSelected] = useState(null)
    const navigate = useNavigate()
    const onBookHandler = ()=>{
        if(!selected){
            return toast('Please select a date')
        }
        navigate(`/movies/${id}/${selected}`)
        window.scrollTo(0,0)

    }

    return (
        <section id='dateSelect' aria-labelledby="date-select-heading" className='scroll-mt-24 pt-20 sm:pt-28'>
            <div className='relative flex flex-col items-start justify-between gap-6 rounded-lg border border-primary/20 bg-primary/10 p-4 sm:p-6 md:flex-row md:items-center md:gap-10 md:p-8'>

                <BlurCircle top='-100px' left='-100px' />
                <BlurCircle top='100px' right='0px' />

                <div>
                    <h2 id="date-select-heading" className="font-medium">Choose a show date</h2>

                    <div className='mt-4 flex max-w-full items-center gap-2 text-sm sm:gap-4'>
                        <div className='flex max-w-full flex-wrap gap-2 sm:gap-3'>
                            {Object.keys(dateTime).map((date) => (
                                <button 
                                    type="button"
                                    onClick={()=> setSelected(date)}
                                    key={date}
                                    aria-pressed={selected === date}
                                    className={`flex min-h-14 min-w-14 flex-col items-center justify-center rounded transition hover:bg-primary hover:text-white ${selected === date ? "bg-primary text-white" : "border border-primary/70"}`}
                                >
                                    <span>
                                        {new Date(date).getDate()}
                                    </span>

                                    <span>
                                        {new Date(date).toLocaleDateString('en-US', {
                                            month: 'short'
                                        })}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button type="button" onClick={onBookHandler} className='min-h-11 w-full rounded bg-primary px-8 py-2 text-white transition-all hover:bg-primary/90 md:mt-6 md:w-auto'>
                    Book Now
                </button>
                </div>
            </section>
    )
}

export default DateSelect
