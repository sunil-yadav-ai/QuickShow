import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Loading from "../components/Loading";
import BlurCircle from "../components/BlurCircle";
import timeFormat from "../lib/timeFormat";
import { dateFormat } from "../lib/dateFormat";
import { useAppContext } from "../context/AppContex";

const MyBookings = () => {
    const currency = import.meta.env.VITE_CURRENCY;
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const checkoutSessionId = searchParams.get("session_id");
    const {
        axios,
        getToken,
        user,
        isLoaded,
        image_base_url,
    } = useAppContext();
    const isPageLoading = !isLoaded || (Boolean(user) && isLoading);

    const getMyBookings = useCallback(async () => {
        try {
            const token = await getToken();
            const headers = { Authorization: `Bearer ${token}` };

            if (checkoutSessionId) {
                try {
                    await axios.post(
                        "/api/booking/verify-payment",
                        { sessionId: checkoutSessionId },
                        { headers },
                    );
                } catch (verificationError) {
                    console.error(
                        "Checkout payment verification failed:",
                        verificationError.response?.data?.message ||
                            verificationError.message,
                    );
                }
            }

            const { data } = await axios.get("/api/user/bookings", { headers });

            if (data.success) {
                setBookings(data.bookings);
            }
        } catch (error) {
            console.error("Fetch bookings failed:", error);
        } finally {
            setIsLoading(false);
        }
    }, [axios, checkoutSessionId, getToken]);

    useEffect(() => {
        if (user) {
            getMyBookings();
        }
    }, [user, getMyBookings]);

    return !isPageLoading ? (
        <div className="relative px-6 md:px-16 lg:px-40 pt-30 md:pt-40 min-h-[80vh]">
            <BlurCircle top="100px" left="100px" />

            <div>
                <BlurCircle bottom="0px" left="600px" />
            </div>

            <h1 className="text-lg font-semibold mb-4">
                My Booking
            </h1>

            {bookings.map((item) => (
                <div
                    key={item._id}
                    className="flex flex-col md:flex-row justify-between bg-primary/8 border border-primary/20 rounded-lg mt-4 p-2 max-w-3xl"
                >
                    <div className="flex flex-col md:flex-row">
                        <img
                            src={image_base_url + item.show.movie.poster_path}
                            className="md:max-w-45 aspect-video h-auto object-cover object-bottom rounded"
                            alt={item.show.movie.title || "Movie poster"}
                        />

                        <div className="flex flex-col p-4">
                            <p className="text-lg font-semibold">
                                {item.show.movie.title}
                            </p>

                            <p className="text-gray-400 text-sm">
                                {timeFormat(item.show.movie.runtime)}
                            </p>

                            <p className="text-gray-400 text-sm mt-auto">
                                {dateFormat(item.show.showDateTime)}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col md:items-end md:text-right justify-between p-4">
                        <div>
                            <p className="text-2xl font-semibold mb-3">
                                {currency}{item.amount}
                            </p>

                            {item.isPaid ? (
                                <span className="inline-block text-green-400 text-sm mb-3">
                                    Paid / Confirmed
                                </span>
                            ) : item.paymentLink ? (
                                <span className="inline-block text-yellow-300 text-sm mb-3">
                                    Payment pending
                                </span>
                            ) : (
                                <span className="inline-block text-gray-400 text-sm mb-3">
                                    Payment unavailable
                                </span>
                            )}

                            {!item.isPaid && item.paymentLink && (
                                <a
                                    href={item.paymentLink}
                                    className="inline-block bg-primary px-4 py-1.5 mb-3 text-sm rounded-full font-medium cursor-pointer"
                                >
                                    Pay Now
                                </a>
                            )}
                        </div>

                        <div className="text-sm">
                            <p>
                                <span className="text-gray-400">
                                    Total Tickets:
                                </span>{" "}
                                {item.bookedSeats.length}
                            </p>

                            <p>
                                <span className="text-gray-400">
                                    Seat Number:
                                </span>{" "}
                                {item.bookedSeats.join(", ")}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    ) : (
        <Loading />
    );
};

export default MyBookings;
